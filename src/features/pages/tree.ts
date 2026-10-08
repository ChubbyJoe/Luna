import { comparePositioned } from "./position";
import type { PageListItem } from "./schemas";
import { displayTitle } from "./title";

// The database caps a tree at 64 levels (private.check_page_parent()).
export const MAX_TREE_DEPTH = 64;

export type TreeNode = {
  page: PageListItem;
  // Top level is 1.
  depth: number;
  children: TreeNode[];
};

// A parent's sub pages in sidebar order (null for the top level).
export function childrenOf(
  list: readonly PageListItem[],
  parentId: string | null,
): PageListItem[] {
  return list
    .filter((row) => row.parent_id === parentId)
    .sort(comparePositioned);
}

// The sidebar tree. A row whose parent is not in the list (for a moment,
// between paged reads and a move) shows at the end of the top level, so no
// page ever disappears.
export function buildTree(list: readonly PageListItem[]): TreeNode[] {
  const ids = new Set(list.map((row) => row.id));
  const byParent = new Map<string | null, PageListItem[]>();
  for (const row of list) {
    const parent =
      row.parent_id !== null && ids.has(row.parent_id) ? row.parent_id : null;
    const isOrphan = row.parent_id !== null && parent === null;
    // Orphans sort after every real top level page.
    const key = isOrphan ? "orphan" : parent;
    byParent.set(key, [...(byParent.get(key) ?? []), row]);
  }

  const toNodes = (parentId: string | null, depth: number): TreeNode[] =>
    [...(byParent.get(parentId) ?? [])].sort(comparePositioned).map((page) => ({
      page,
      depth,
      children: depth < MAX_TREE_DEPTH ? toNodes(page.id, depth + 1) : [],
    }));

  const orphans = [...(byParent.get("orphan") ?? [])]
    .sort(comparePositioned)
    .map((page) => ({ page, depth: 1, children: toNodes(page.id, 2) }));
  return [...toNodes(null, 1), ...orphans];
}

// The page's ancestors, top level first, without the page itself. Empty when
// the page is top level or not in the list.
export function ancestorsOf(
  list: readonly PageListItem[],
  id: string,
): PageListItem[] {
  const byId = new Map(list.map((row) => [row.id, row]));
  const path: PageListItem[] = [];
  let parentId = byId.get(id)?.parent_id ?? null;
  while (parentId !== null && path.length < MAX_TREE_DEPTH) {
    const parent = byId.get(parentId);
    if (!parent || parent.id === id) break;
    path.unshift(parent);
    parentId = parent.parent_id;
  }
  return path;
}

// Every page below `id`, at any depth, without `id` itself.
export function descendantIdsOf(
  list: readonly PageListItem[],
  id: string,
): Set<string> {
  const found = new Set<string>();
  let frontier = [id];
  while (frontier.length > 0) {
    const parents = new Set(frontier);
    frontier = list
      .filter(
        (row) =>
          row.parent_id !== null &&
          parents.has(row.parent_id) &&
          row.id !== id &&
          !found.has(row.id),
      )
      .map((row) => row.id);
    for (const childId of frontier) found.add(childId);
  }
  return found;
}

type TitledSessions = ReadonlyMap<string, { snapshot: { title: string } }>;

// What the sidebar, breadcrumb, and Move to show: the title being typed when
// a save session exists, else the cached one.
export function liveTitle(row: PageListItem, sessions: TitledSessions): string {
  return displayTitle(sessions.get(row.id)?.snapshot.title ?? row.title);
}
