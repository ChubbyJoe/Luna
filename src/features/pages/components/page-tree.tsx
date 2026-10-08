"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronRightIcon,
  FolderInputIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/features/shell/components/empty-state";
import { cn } from "@/lib/utils";

import { useCanDrag } from "../hooks/use-can-drag";
import { useCreatePage } from "../hooks/use-create-page";
import {
  useExpandedPages,
  useExpandedStore,
} from "../hooks/use-expanded-pages";
import { useMovePage } from "../hooks/use-move-page";
import {
  useEndZoneDrop,
  useRowDrag,
  useTreeDragMonitor,
  type TreeDrag,
} from "../hooks/use-tree-drag";
import { useTreeUi } from "../hooks/use-tree-ui";
import { useSessions } from "../pending-saves";
import { moveTargets, placementFor, type Placement } from "../placement";
import { pageListQueryOptions } from "../queries";
import type { PageListItem } from "../schemas";
import { ancestorsOf, buildTree, liveTitle, type TreeNode } from "../tree";
import { MoveToDialog } from "./move-to-dialog";

type Sessions = Parameters<typeof liveTitle>[1];

export type MoveHandler = (
  pageId: string,
  placement: Placement,
  callbacks: { onError: () => void },
) => void;

// 4px inset plus 12px per level, capped at 10 steps so deep rows keep room
// for their title. Whole class names, so Tailwind finds them.
const INDENT_CLASSES = [
  "pl-1",
  "pl-4",
  "pl-7",
  "pl-10",
  "pl-13",
  "pl-16",
  "pl-19",
  "pl-22",
  "pl-25",
  "pl-28",
  "pl-31",
];

// The drop line starts where the row's content does.
const LINE_INSET_CLASSES = [
  "left-1",
  "left-4",
  "left-7",
  "left-10",
  "left-13",
  "left-16",
  "left-19",
  "left-22",
  "left-25",
  "left-28",
  "left-31",
];

function byDepth(classes: string[], depth: number): string {
  return classes[Math.min(depth - 1, classes.length - 1)];
}

// The sidebar's Pages section, wired to the page list, save sessions, create,
// and move.
export function PageTree() {
  const { data, status, refetch } = useQuery(pageListQueryOptions());
  const sessions = useSessions();
  const pathname = usePathname();
  const createPage = useCreatePage();
  const movePage = useMovePage();

  if (status === "pending") {
    return (
      // Fixed widths: shadcn's menu skeleton picks random ones, which breaks hydration.
      <div aria-label="Loading pages" className="flex flex-col gap-1 px-2">
        {["w-3/5", "w-4/5", "w-2/3"].map((width) => (
          <div key={width} className="flex h-7 items-center">
            <Skeleton className={`h-4 ${width}`} />
          </div>
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        action={
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        }
      >
        Could not load pages
      </EmptyState>
    );
  }

  return (
    <PageTreeView
      list={data}
      activeId={activePageId(pathname)}
      sessions={sessions}
      addDisabled={createPage.isPending}
      onAddChild={(parentId) => createPage.mutate({ parentId })}
      onMove={(id, placement, callbacks) =>
        movePage.mutate({ id, placement }, callbacks)
      }
    />
  );
}

function activePageId(pathname: string): string | null {
  const match = /^\/p\/([^/]+)$/.exec(pathname);
  return match ? match[1] : null;
}

type ElementRefs<T> = RefObject<Map<string, T>>;

// Keeps a page id to element map current as rows mount and unmount, and
// optionally a ref of the row's own.
function refInto<T>(
  refs: ElementRefs<T>,
  id: string,
  own?: RefObject<T | null>,
) {
  return (element: T | null) => {
    if (!element) return;
    refs.current.set(id, element);
    if (own) own.current = element;
    return () => {
      refs.current.delete(id);
      if (own) own.current = null;
    };
  };
}

type RowProps = {
  expanded: ReadonlySet<string>;
  activeId: string | null;
  movedId: string | null;
  sessions: Sessions;
  addDisabled: boolean;
  linkRefs: ElementRefs<HTMLAnchorElement>;
  menuRefs: ElementRefs<HTMLButtonElement>;
  // True once right after "Move to…" opened the dialog, so the closing menu
  // does not take focus back from it.
  takeDialogOpening: () => boolean;
  hrefFor: (id: string) => string;
  drag: TreeDrag;
  onToggle: (id: string, open: boolean) => void;
  onAddChild: (parentId: string) => void;
  onMoveTo: (id: string) => void;
};

type FocusRequest = { id: string; target: "link" | "menu" };

// The tree itself, from a loaded list. The shell preview renders it with samples.
export function PageTreeView({
  list,
  activeId,
  sessions,
  addDisabled = false,
  hrefFor = (id) => `/p/${id}`,
  onAddChild,
  onMove,
}: {
  list: readonly PageListItem[];
  activeId: string | null;
  sessions: Sessions;
  addDisabled?: boolean;
  hrefFor?: (id: string) => string;
  onAddChild: (parentId: string) => void;
  onMove: MoveHandler;
}) {
  const store = useExpandedStore();
  const expanded = useExpandedPages();
  const { movedId, announcement } = useTreeUi();
  const tree = useMemo(() => buildTree(list), [list]);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const menuRefs = useRef(new Map<string, HTMLButtonElement>());
  const openingDialog = useRef(false);
  // A row to scroll into view, and an element to focus, once they render.
  const pendingReveal = useRef<string | null>(null);
  const pendingFocus = useRef<FocusRequest | null>(null);
  const [, setFocusTick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const endZoneRef = useRef<HTMLDivElement>(null);
  const expandOne = useCallback((id: string) => store.expand([id]), [store]);
  const drag = useTreeDragMonitor({
    enabled: useCanDrag(),
    list,
    expanded,
    container: containerRef,
    expand: expandOne,
    // A failed drop needs no focus change; the toast and rollback say it.
    onMove: (id, placement) => onMove(id, placement, { onError: () => {} }),
  });
  const overEndZone = useEndZoneDrop(drag, endZoneRef);
  // Reveal reads the list at the moment you navigate or move, not on every
  // change, so an ancestor you collapse by hand stays collapsed until then.
  const listRef = useRef(list);
  useEffect(() => {
    listRef.current = list;
  });

  // The page whose Move to dialog is open (or closing, so it keeps its items).
  const [dialog, setDialog] = useState<{ id: string; open: boolean } | null>(
    null,
  );
  // How the dialog ended, for where focus goes once it has closed.
  const dialogChose = useRef(false);
  const dialogMoveFailed = useRef(false);

  function requestFocus(request: FocusRequest) {
    pendingFocus.current = request;
    setFocusTick((tick) => tick + 1);
  }

  // Ids of deleted pages leave the stored set once a full list has loaded.
  useEffect(() => {
    store.prune(new Set(list.map((row) => row.id)));
  }, [list, store]);

  // Opening a page, or moving one, expands its ancestors and reveals its row.
  useEffect(() => {
    for (const id of [activeId, movedId]) {
      if (id === null) continue;
      const current = listRef.current;
      if (!current.some((row) => row.id === id)) continue;
      store.expand(ancestorsOf(current, id).map((row) => row.id));
      pendingReveal.current = id;
    }
  }, [activeId, movedId, store]);

  // Runs after every render, so it sees rows the expand above just added.
  useEffect(() => {
    const revealId = pendingReveal.current;
    const row = revealId === null ? undefined : linkRefs.current.get(revealId);
    if (row) {
      pendingReveal.current = null;
      row.scrollIntoView({ block: "nearest" });
    }
    const focus = pendingFocus.current;
    const refs = focus?.target === "menu" ? menuRefs : linkRefs;
    const element = focus ? refs.current.get(focus.id) : undefined;
    if (element) {
      element.focus();
      // A dialog still closing keeps focus; try again on the next render.
      if (document.activeElement === element) pendingFocus.current = null;
    }
  });

  const dialogItems = useMemo(
    () => (dialog ? moveTargets(list, dialog.id, sessions) : []),
    [list, dialog, sessions],
  );
  const dialogRow = dialog && list.find((row) => row.id === dialog.id);

  function openMoveTo(id: string) {
    openingDialog.current = true;
    dialogChose.current = false;
    dialogMoveFailed.current = false;
    setDialog({ id, open: true });
  }

  function chooseTarget(parentId: string | null) {
    if (!dialog) return;
    const { id } = dialog;
    dialogChose.current = true;
    setDialog({ id, open: false });
    // Already last in that parent: close and send nothing.
    const placement = placementFor(list, id, { kind: "into", parentId });
    if (!placement) return;
    onMove(id, placement, {
      onError: () => {
        dialogMoveFailed.current = true;
        requestFocus({ id, target: "menu" });
      },
    });
  }

  function onDialogCloseAutoFocus(event: Event) {
    event.preventDefault();
    if (!dialog) return;
    // A move that already failed (a fast rejection) goes back to the … button.
    const chose = dialogChose.current && !dialogMoveFailed.current;
    requestFocus({ id: dialog.id, target: chose ? "link" : "menu" });
  }

  const rowProps: RowProps = {
    expanded,
    activeId,
    movedId,
    sessions,
    addDisabled,
    linkRefs,
    menuRefs,
    takeDialogOpening: () => {
      const opening = openingDialog.current;
      openingDialog.current = false;
      return opening;
    },
    hrefFor,
    drag,
    onToggle: (id, open) => (open ? store.expand([id]) : store.collapse(id)),
    onAddChild,
    onMoveTo: openMoveTo,
  };

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      {tree.length === 0 ? (
        <EmptyState>No pages yet</EmptyState>
      ) : (
        <TreeList nodes={tree} rowProps={rowProps} />
      )}
      {/* Drop here for the end of the top level (AC-6). */}
      <div
        ref={endZoneRef}
        aria-hidden="true"
        data-testid="page-tree-end"
        className="relative min-h-10 flex-1"
      >
        {overEndZone && <DropLine edge="top" depth={1} />}
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {dialog && dialogRow && (
        <MoveToDialog
          open={dialog.open}
          title={liveTitle(dialogRow, sessions)}
          items={dialogItems}
          onOpenChange={(open) => {
            if (!open) setDialog({ id: dialog.id, open: false });
          }}
          onChoose={chooseTarget}
          onCloseAutoFocus={onDialogCloseAutoFocus}
        />
      )}
    </div>
  );
}

// A 2px line before or after a row, inset to where its content starts.
function DropLine({ edge, depth }: { edge: "top" | "bottom"; depth: number }) {
  return (
    <span
      aria-hidden="true"
      data-drop-line={edge}
      className={cn(
        "pointer-events-none absolute right-1 h-0.5 rounded-full bg-sidebar-primary",
        edge === "top" ? "-top-px" : "-bottom-px",
        byDepth(LINE_INSET_CLASSES, depth),
      )}
    />
  );
}

function TreeList({
  nodes,
  rowProps,
  id,
}: {
  nodes: TreeNode[];
  rowProps: RowProps;
  id?: string;
}) {
  return (
    <ul role="list" id={id} className="flex min-w-0 flex-col gap-px">
      {nodes.map((node) => (
        <TreeRow key={node.page.id} node={node} rowProps={rowProps} />
      ))}
    </ul>
  );
}

function IconTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function TreeRow({ node, rowProps }: { node: TreeNode; rowProps: RowProps }) {
  const { page, depth, children } = node;
  const { expanded, activeId, movedId, sessions, hrefFor } = rowProps;
  const title = liveTitle(page, sessions);
  const hasChildren = children.length > 0;
  const isExpanded = hasChildren && expanded.has(page.id);
  const isActive = activeId === page.id;
  const childListId = `sub-pages-${page.id}`;
  const rowRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLAnchorElement>(null);
  const { drag } = rowProps;
  const zone = useRowDrag({
    drag,
    rowRef,
    handleRef,
    id: page.id,
    depth,
    canExpandOnHover: hasChildren && !isExpanded,
  });

  return (
    <li className="min-w-0">
      <div
        ref={rowRef}
        data-active={isActive || undefined}
        data-moved={movedId === page.id || undefined}
        data-drop-inside={zone === "inside" || undefined}
        data-dragging={drag.draggingId === page.id || undefined}
        className={cn(
          "group/row relative flex h-7 min-w-0 items-center gap-0.5 rounded-md pr-1 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-dragging:opacity-50 data-drop-inside:bg-sidebar-accent data-moved:bg-sidebar-accent data-moved:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground",
          byDepth(INDENT_CLASSES, depth),
        )}
      >
        {zone === "before" && <DropLine edge="top" depth={depth} />}
        {zone === "after" && (
          // Below an open row, the page lands as its first sub page.
          <DropLine edge="bottom" depth={isExpanded ? depth + 1 : depth} />
        )}
        {hasChildren ? (
          <IconTip label={isExpanded ? "Hide sub pages" : "Show sub pages"}>
            <Button
              variant="ghost"
              size="icon-xs"
              // Expanded is shown by the chevron's turn, not a filled button.
              className="aria-expanded:bg-transparent hover:aria-expanded:bg-muted"
              aria-label={`Sub pages of ${title}`}
              aria-expanded={isExpanded}
              aria-controls={isExpanded ? childListId : undefined}
              onClick={() => rowProps.onToggle(page.id, !isExpanded)}
            >
              <ChevronRightIcon
                aria-hidden="true"
                className={cn(isExpanded && "rotate-90")}
              />
            </Button>
          </IconTip>
        ) : (
          <span aria-hidden="true" className="size-6 shrink-0" />
        )}
        <Link
          ref={refInto(rowProps.linkRefs, page.id, handleRef)}
          href={hrefFor(page.id)}
          // The row is the drag source (its link is the handle), so the drag
          // shows the row, not the browser's link preview.
          draggable={drag.enabled ? false : undefined}
          aria-current={isActive ? "page" : undefined}
          className="min-w-0 flex-1 truncate rounded-sm px-1 leading-6 outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          {title}
        </Link>
        {/* Hidden by opacity only, so the buttons stay in the Tab order. */}
        <div className="flex shrink-0 items-center opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 group-data-active/row:opacity-100 has-[[aria-haspopup=menu][aria-expanded=true]]:opacity-100 [@media(hover:none)]:opacity-100">
          <IconTip label="Add a page inside">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Add page inside ${title}`}
              disabled={rowProps.addDisabled}
              onClick={() => rowProps.onAddChild(page.id)}
            >
              <PlusIcon aria-hidden="true" />
            </Button>
          </IconTip>
          <DropdownMenu modal={false}>
            <IconTip label="More actions">
              <DropdownMenuTrigger asChild>
                <Button
                  ref={refInto(rowProps.menuRefs, page.id)}
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`More actions for ${title}`}
                >
                  <MoreHorizontalIcon aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
            </IconTip>
            <DropdownMenuContent
              align="start"
              onCloseAutoFocus={(event) => {
                if (rowProps.takeDialogOpening()) event.preventDefault();
              }}
            >
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => rowProps.onMoveTo(page.id)}>
                  <FolderInputIcon aria-hidden="true" />
                  Move to…
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isExpanded && (
        <TreeList nodes={children} rowProps={rowProps} id={childListId} />
      )}
    </li>
  );
}
