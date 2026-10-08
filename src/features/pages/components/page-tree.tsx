"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/features/shell/components/empty-state";
import { cn } from "@/lib/utils";

import { useCreatePage } from "../hooks/use-create-page";
import {
  useExpandedPages,
  useExpandedStore,
} from "../hooks/use-expanded-pages";
import { useSessions } from "../pending-saves";
import { pageListQueryOptions } from "../queries";
import type { PageListItem } from "../schemas";
import { ancestorsOf, buildTree, liveTitle, type TreeNode } from "../tree";

type Sessions = Parameters<typeof liveTitle>[1];

// 12px per level, capped at 10 steps so deep rows keep room for their title.
const INDENT_STEP_PX = 12;
const MAX_INDENT_STEPS = 10;
const ROW_INSET_PX = 4;

// The sidebar's Pages section, wired to the page list, save sessions, and create.
export function PageTree() {
  const { data, status, refetch } = useQuery(pageListQueryOptions());
  const sessions = useSessions();
  const pathname = usePathname();
  const createPage = useCreatePage();

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
    />
  );
}

function activePageId(pathname: string): string | null {
  const match = /^\/p\/([^/]+)$/.exec(pathname);
  return match ? match[1] : null;
}

type RowProps = {
  expanded: ReadonlySet<string>;
  activeId: string | null;
  sessions: Sessions;
  addDisabled: boolean;
  linkRefs: RefObject<Map<string, HTMLAnchorElement>>;
  hrefFor: (id: string) => string;
  onToggle: (id: string, open: boolean) => void;
  onAddChild: (parentId: string) => void;
};

// The tree itself, from a loaded list. The shell preview renders it with samples.
export function PageTreeView({
  list,
  activeId,
  sessions,
  addDisabled = false,
  hrefFor = (id) => `/p/${id}`,
  onAddChild,
}: {
  list: readonly PageListItem[];
  activeId: string | null;
  sessions: Sessions;
  addDisabled?: boolean;
  hrefFor?: (id: string) => string;
  onAddChild: (parentId: string) => void;
}) {
  const store = useExpandedStore();
  const expanded = useExpandedPages();
  const tree = useMemo(() => buildTree(list), [list]);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  // A row to scroll into view once it has rendered.
  const pendingReveal = useRef<string | null>(null);
  // Reveal reads the list at the moment you navigate, not on every change, so
  // an ancestor you collapse by hand stays collapsed until the next navigation.
  const listRef = useRef(list);
  useEffect(() => {
    listRef.current = list;
  });

  // Ids of deleted pages leave the stored set once a full list has loaded.
  useEffect(() => {
    store.prune(new Set(list.map((row) => row.id)));
  }, [list, store]);

  // Opening a page expands its ancestors and scrolls its row into view.
  useEffect(() => {
    if (activeId === null) return;
    const current = listRef.current;
    if (!current.some((row) => row.id === activeId)) return;
    store.expand(ancestorsOf(current, activeId).map((row) => row.id));
    pendingReveal.current = activeId;
  }, [activeId, store]);

  // Runs after every render, so it sees rows the expand above just added.
  useEffect(() => {
    const id = pendingReveal.current;
    const link = id === null ? undefined : linkRefs.current.get(id);
    if (!link) return;
    pendingReveal.current = null;
    link.scrollIntoView({ block: "nearest" });
  });

  if (tree.length === 0) return <EmptyState>No pages yet</EmptyState>;

  const rowProps: RowProps = {
    expanded,
    activeId,
    sessions,
    addDisabled,
    linkRefs,
    hrefFor,
    onToggle: (id, open) => (open ? store.expand([id]) : store.collapse(id)),
    onAddChild,
  };
  return <TreeList nodes={tree} rowProps={rowProps} />;
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

function TreeRow({ node, rowProps }: { node: TreeNode; rowProps: RowProps }) {
  const { page, depth, children } = node;
  const { expanded, activeId, sessions, linkRefs, hrefFor } = rowProps;
  const title = liveTitle(page, sessions);
  const hasChildren = children.length > 0;
  const isExpanded = hasChildren && expanded.has(page.id);
  const isActive = activeId === page.id;
  const childListId = `sub-pages-${page.id}`;
  const indent =
    Math.min(depth - 1, MAX_INDENT_STEPS) * INDENT_STEP_PX + ROW_INSET_PX;

  return (
    <li className="min-w-0">
      <div
        data-active={isActive || undefined}
        style={{ paddingLeft: indent }}
        className="group/row flex h-7 min-w-0 items-center gap-0.5 rounded-md pr-1 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground"
      >
        {hasChildren ? (
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
        ) : (
          <span aria-hidden="true" className="size-6 shrink-0" />
        )}
        <Link
          ref={(element) => {
            if (!element) return;
            linkRefs.current.set(page.id, element);
            return () => {
              linkRefs.current.delete(page.id);
            };
          }}
          href={hrefFor(page.id)}
          aria-current={isActive ? "page" : undefined}
          className="min-w-0 flex-1 truncate rounded-sm px-1 leading-6 outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          {title}
        </Link>
        <div className="flex shrink-0 items-center opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 group-data-active/row:opacity-100 has-data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Add page inside ${title}`}
            disabled={rowProps.addDisabled}
            onClick={() => rowProps.onAddChild(page.id)}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
      {isExpanded && (
        <TreeList nodes={children} rowProps={rowProps} id={childListId} />
      )}
    </li>
  );
}
