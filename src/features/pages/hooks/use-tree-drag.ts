"use client";

import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import {
  attachInstruction,
  extractInstruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  invalidTargetIds,
  placementFor,
  zoneFromInstruction,
  type DropZone,
  type MoveTarget,
  type Placement,
} from "../placement";
import type { PageListItem } from "../schemas";

const ROW = "luna-page-tree-row";
const END_ZONE = "luna-page-tree-end";
const INDENT_PER_LEVEL_PX = 12;
// Holding a drag over a collapsed row with sub pages opens it (AC-6).
export const HOVER_EXPAND_MS = 600;

type RowDragData = { type: typeof ROW; id: string };

function isRowDrag(
  data: Record<string | symbol, unknown>,
): data is RowDragData {
  return data.type === ROW && typeof data.id === "string";
}

export type TreeDrag = {
  enabled: boolean;
  draggingId: string | null;
  // The dragged page and every page below it accept no drop (AC-7).
  isInvalidTarget: (sourceId: string, targetId: string) => boolean;
  expand: (id: string) => void;
};

// Watches every tree drag: tracks the dragged row, scrolls the sidebar near
// its edges, and on drop turns the target into a placement and moves.
export function useTreeDragMonitor({
  enabled,
  list,
  expanded,
  container,
  expand,
  onMove,
}: {
  enabled: boolean;
  list: readonly PageListItem[];
  expanded: ReadonlySet<string>;
  // An element inside the sidebar; its scrolling content auto scrolls.
  container: RefObject<HTMLElement | null>;
  expand: (id: string) => void;
  onMove: (id: string, placement: Placement) => void;
}): TreeDrag {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Read at drop time, so the monitor never re-registers in the middle of a drag.
  const latest = useRef({ list, expanded, onMove });
  useEffect(() => {
    latest.current = { list, expanded, onMove };
  });
  const invalid = useRef<{ sourceId: string; ids: Set<string> } | null>(null);

  const isInvalidTarget = useCallback((sourceId: string, targetId: string) => {
    if (invalid.current?.sourceId !== sourceId) {
      invalid.current = {
        sourceId,
        ids: invalidTargetIds(latest.current.list, sourceId),
      };
    }
    return invalid.current.ids.has(targetId);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const cleanups = [
      monitorForElements({
        canMonitor: ({ source }) => isRowDrag(source.data),
        onDragStart: ({ source }) => {
          if (isRowDrag(source.data)) setDraggingId(source.data.id);
        },
        onDrop: ({ source, location }) => {
          setDraggingId(null);
          invalid.current = null;
          if (!isRowDrag(source.data)) return;
          const target = location.current.dropTargets[0];
          if (!target) return;
          const moveTarget = moveTargetFrom(
            target.data,
            latest.current.expanded,
          );
          if (!moveTarget) return;
          const placement = placementFor(
            latest.current.list,
            source.data.id,
            moveTarget,
          );
          // Null: an invalid target, or a drop right where the page already is.
          if (placement) latest.current.onMove(source.data.id, placement);
        },
      }),
    ];
    const scrollRoot =
      container.current?.closest<HTMLElement>('[data-sidebar="content"]') ??
      container.current;
    if (scrollRoot) {
      cleanups.push(
        autoScrollForElements({
          element: scrollRoot,
          canScroll: ({ source }) => isRowDrag(source.data),
          getAllowedAxis: () => "vertical",
        }),
      );
    }
    return combine(...cleanups);
  }, [enabled, container]);

  return { enabled, draggingId, isInvalidTarget, expand };
}

function moveTargetFrom(
  data: Record<string | symbol, unknown>,
  expanded: ReadonlySet<string>,
): MoveTarget | null {
  if (data.type === END_ZONE) return { kind: "end" };
  if (data.type !== ROW || typeof data.id !== "string") return null;
  const zone = zoneFromInstruction(extractInstruction(data)?.type);
  if (!zone) return null;
  return {
    kind: "row",
    zone,
    targetId: data.id,
    targetExpanded: expanded.has(data.id),
  };
}

// One row: its link drags the row, and the row is a drop target with before,
// inside, and after zones. Returns the zone the pointer is over, for the indicator.
export function useRowDrag({
  drag,
  rowRef,
  handleRef,
  id,
  depth,
  canExpandOnHover,
}: {
  drag: TreeDrag;
  rowRef: RefObject<HTMLElement | null>;
  handleRef: RefObject<HTMLElement | null>;
  id: string;
  depth: number;
  // A collapsed row with sub pages opens after HOVER_EXPAND_MS.
  canExpandOnHover: boolean;
}): DropZone | null {
  const [zone, setZone] = useState<DropZone | null>(null);
  const { enabled, isInvalidTarget, expand } = drag;

  useEffect(() => {
    const row = rowRef.current;
    const handle = handleRef.current;
    if (!enabled || !row || !handle) return;
    let hoverTimer: ReturnType<typeof setTimeout> | undefined;
    const stopHover = () => clearTimeout(hoverTimer);
    const showZone = (data: Record<string | symbol, unknown>) =>
      setZone(zoneFromInstruction(extractInstruction(data)?.type));

    return combine(
      draggable({
        element: row,
        dragHandle: handle,
        getInitialData: () => ({ type: ROW, id }),
      }),
      dropTargetForElements({
        element: row,
        canDrop: ({ source }) =>
          isRowDrag(source.data) && !isInvalidTarget(source.data.id, id),
        getData: ({ input, element }) =>
          attachInstruction(
            { type: ROW, id },
            {
              input,
              element,
              currentLevel: depth,
              indentPerLevel: INDENT_PER_LEVEL_PX,
              mode: "standard",
              block: ["reparent"],
            },
          ),
        onDragEnter: ({ self }) => {
          showZone(self.data);
          if (canExpandOnHover) {
            hoverTimer = setTimeout(() => expand(id), HOVER_EXPAND_MS);
          }
        },
        onDrag: ({ self }) => showZone(self.data),
        onDragLeave: () => {
          stopHover();
          setZone(null);
        },
        onDrop: () => {
          stopHover();
          setZone(null);
        },
      }),
      stopHover,
    );
  }, [
    enabled,
    rowRef,
    handleRef,
    id,
    depth,
    canExpandOnHover,
    isInvalidTarget,
    expand,
  ]);

  return enabled ? zone : null;
}

// The empty space under the last row: drop there for "end of the top level".
export function useEndZoneDrop(
  drag: TreeDrag,
  ref: RefObject<HTMLElement | null>,
): boolean {
  const [isOver, setIsOver] = useState(false);
  const { enabled } = drag;
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    return dropTargetForElements({
      element,
      canDrop: ({ source }) => isRowDrag(source.data),
      getData: () => ({ type: END_ZONE }),
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    });
  }, [enabled, ref]);
  return enabled && isOver;
}
