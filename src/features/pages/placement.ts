import { positionAfter } from "./position";
import type { PageListItem } from "./schemas";
import {
  buildTree,
  childrenOf,
  descendantIdsOf,
  liveTitle,
  type TreeNode,
} from "./tree";

// Where a move lands (spec 0005 Value sourcing). Drag and Move to share it.
export type DropZone = "before" | "after" | "inside";

export type MoveTarget =
  // Over a row. `targetExpanded`: the row shows its sub pages, so "after"
  // means "first sub page" when it still has one besides the dragged page.
  | { kind: "row"; zone: DropZone; targetId: string; targetExpanded: boolean }
  // The empty space under the last row: the end of the top level.
  | { kind: "end" }
  // A Move to item: the end of that parent's sub pages (null: the top level).
  | { kind: "into"; parentId: string | null };

export type Placement = {
  parentId: string | null;
  position: string;
  // Only then does the update name parent_id (AC-8).
  parentChanged: boolean;
};

// The page itself and every page below it: never a valid target (AC-7).
export function invalidTargetIds(
  list: readonly PageListItem[],
  pageId: string,
): Set<string> {
  return new Set([pageId, ...descendantIdsOf(list, pageId)]);
}

function siblingsWithout(
  list: readonly PageListItem[],
  parentId: string | null,
  pageId: string,
): PageListItem[] {
  return childrenOf(list, parentId).filter((row) => row.id !== pageId);
}

// The new parent and the index among its sub pages (the moved page removed).
function slotFor(
  list: readonly PageListItem[],
  pageId: string,
  target: MoveTarget,
): { parentId: string | null; index: number } | null {
  if (target.kind === "end") {
    return {
      parentId: null,
      index: siblingsWithout(list, null, pageId).length,
    };
  }
  if (target.kind === "into") {
    const { parentId } = target;
    return {
      parentId,
      index: siblingsWithout(list, parentId, pageId).length,
    };
  }

  const row = list.find((item) => item.id === target.targetId);
  if (!row) return null;
  if (target.zone === "inside") {
    return {
      parentId: row.id,
      index: siblingsWithout(list, row.id, pageId).length,
    };
  }
  if (
    target.zone === "after" &&
    target.targetExpanded &&
    siblingsWithout(list, row.id, pageId).length > 0
  ) {
    return { parentId: row.id, index: 0 };
  }
  const siblings = siblingsWithout(list, row.parent_id, pageId);
  const at = siblings.findIndex((item) => item.id === row.id);
  return {
    parentId: row.parent_id,
    index: target.zone === "before" ? at : at + 1,
  };
}

// The parent and position a move writes, or null when the target is the page
// itself or below it, or when the page would land exactly where it is.
export function placementFor(
  list: readonly PageListItem[],
  pageId: string,
  target: MoveTarget,
): Placement | null {
  const page = list.find((row) => row.id === pageId);
  if (!page) return null;
  const invalid = invalidTargetIds(list, pageId);
  if (target.kind === "row" && invalid.has(target.targetId)) return null;
  if (
    target.kind === "into" &&
    target.parentId !== null &&
    invalid.has(target.parentId)
  ) {
    return null;
  }

  const slot = slotFor(list, pageId, target);
  if (!slot) return null;
  const siblings = siblingsWithout(list, slot.parentId, pageId);
  const parentChanged = slot.parentId !== page.parent_id;
  if (!parentChanged) {
    const current = childrenOf(list, page.parent_id).findIndex(
      (row) => row.id === pageId,
    );
    if (current === slot.index) return null;
  }
  return {
    parentId: slot.parentId,
    position: positionAfter(siblings, slot.index - 1),
    parentChanged,
  };
}

export type MoveTargetItem = {
  // null is "Top level".
  id: string | null;
  title: string;
  // The parent path, muted under the title; empty for a top level page.
  path: string;
};

type Sessions = Parameters<typeof liveTitle>[1];

// "A / B", or "… / B / C" past two ancestors.
function parentPath(titles: string[]): string {
  return titles.length > 2
    ? ["…", ...titles.slice(-2)].join(" / ")
    : titles.join(" / ");
}

// Move to items: "Top level", then every page except the moved one and the
// pages below it, depth first in sidebar order.
export function moveTargets(
  list: readonly PageListItem[],
  pageId: string,
  sessions: Sessions,
): MoveTargetItem[] {
  const invalid = invalidTargetIds(list, pageId);
  const items: MoveTargetItem[] = [{ id: null, title: "Top level", path: "" }];
  const walk = (nodes: readonly TreeNode[], ancestors: string[]) => {
    for (const node of nodes) {
      // Skipping the moved page skips everything below it too.
      if (invalid.has(node.page.id)) continue;
      const title = liveTitle(node.page, sessions);
      items.push({ id: node.page.id, title, path: parentPath(ancestors) });
      walk(node.children, [...ancestors, title]);
    }
  };
  walk(buildTree(list), []);
  return items;
}

// What the live region reads after a move (AC-13).
export function moveAnnouncement(title: string, parentTitle: string | null) {
  return parentTitle === null
    ? `Moved ${title} to the top level`
    : `Moved ${title} into ${parentTitle}`;
}

// Pragmatic's tree item hitbox, top 25% / middle 50% / bottom 25%, as a zone.
// "reparent" is blocked in this tree, so it (and a blocked one) is no zone.
export function zoneFromInstruction(type: string | undefined): DropZone | null {
  if (type === "reorder-above") return "before";
  if (type === "reorder-below") return "after";
  if (type === "make-child") return "inside";
  return null;
}
