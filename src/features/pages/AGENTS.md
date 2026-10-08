# Pages

## Overview

Everything about a page: opening and writing one (title plus a plain text BlockNote body that saves as you type), and the page tree in the sidebar (nest, expand, create sub pages, move by drag or Move to). Governed by [spec 0004](../../../docs/specs/0004-core-writing-loop/index.md) for writing and saving and [spec 0005](../../../docs/specs/0005-page-tree-sidebar/index.md) for the tree; the table and its rules are [spec 0002](../../../docs/specs/0002-data-model/index.md).

## Key files

| File | Owns |
|---|---|
| `queries.ts` | Query keys, list and detail query options, pure cache updaters, `PAGE_TREE_MUTATION_KEY` |
| `schemas.ts` | Zod schemas for list and detail rows and stored blocks; `isEditorContent` |
| `save-machine.ts` | The pure save session reducer (idle, saving, retrying, conflict, gone) and timings |
| `pending-saves.tsx` | `PendingSavesProvider`: one save session per page, timers, the guarded update, toasts, leave warning |
| `position.ts` | Sort order and fractional `position` keys (`positionAfter`, `positionBetween`) |
| `tree.ts` | Pure tree building from the flat list (children, ancestors, orphans) |
| `placement.ts` | Where a drop or Move to lands, invalid targets, Move to items, the live region text |
| `expanded-pages.ts` | Pure helpers for the per account expand state in `localStorage` |
| `tree-errors.ts` | Maps `LN001` / `LN003` and others to the one toast text |
| `hooks/use-move-page.ts`, `hooks/use-create-page.ts` | The two tree writes (TanStack mutations) |
| `hooks/use-tree-drag.ts` | Pragmatic drag and drop wiring: row zones, end zone, hover expand, auto scroll |
| `components/page-view.tsx` | Opens a page (from its save session, else the server); loads the editor client only |
| `components/page-tree.tsx`, `page-tree-provider.tsx`, `move-to-dialog.tsx` | The sidebar tree, its shared state, and the `cmdk` Move to dialog |

Routes using it: `src/app/(app)/page.tsx` (home) and `src/app/(app)/p/[pageId]/`; the layout mounts `PendingSavesProvider` and `PageTreeProvider`.

## Conventions

- Pure logic lives in the top level `.ts` files with a `.test.ts` beside each; hooks and components only wire it to React, Supabase, and the router.
- The save session owns a page's title and body while it exists: the detail query never refetches on its own, and the sidebar and breadcrumb read live titles from `useSessions()`.
- Saves send only dirty fields and are guarded by `.eq("updated_at", base)`. Zero rows back means conflict or gone; keep `updated_at` as the exact server string, never parse it.
- Creates and moves both use `PAGE_TREE_MUTATION_KEY` and scope `page-tree`, so one tab's tree writes run in order. Creates are not optimistic; moves are, with a per move context object so a late response never overrides a newer move.
- A move sends one PATCH for one row: `position` alone when the parent is unchanged, `parent_id` plus `position` when it changes. Positions always come from `positionAfter` / `placementFor`, never hand built.
- Expand state is stored under `luna:sidebar-expanded:<claims.sub>`, ids only. Prune it only after a successful list load.
- Drag is on only when `(hover: hover) and (pointer: fine)` matches (`useCanDrag`); every drag action also exists through Move to, which works by keyboard and in the mobile drawer.
- Breadcrumb paths come from the list cache (`usePageBreadcrumbs`), never the detail row, which goes stale after a move.
- Toasts go through `notify` for failed saves, creates, and moves only; a successful move gets the row highlight and the live region, no toast.

## Gotchas

- The editor accepts plain paragraphs only (`editorSchema` in `page-editor.tsx`). Content with any other block or style opens read only (`isEditorContent`), so this editor never drops what a wider one wrote. Feature 7 widens the schema.
- The list query uses `refetchOnWindowFocus: "always"` so a move from another tab shows up; `useMovePage` skips its own refetch while moves are still queued, or they would be wiped.
- Equal `position` keys can exist (restores, two tabs): sort with `comparePositioned` (C collation, then `id`) and use `positionAfter`, which tolerates duplicates.
- The database enforces the tree in `private.check_page_parent()` (cycles `LN001`, depth over 64 `LN003`); the client mirrors it in `invalidTargetIds` but the trigger is the real guard.

## Related specs

- [0002 data model](../../../docs/specs/0002-data-model/index.md), [0004 core writing loop](../../../docs/specs/0004-core-writing-loop/index.md), [0005 page tree and sidebar](../../../docs/specs/0005-page-tree-sidebar/index.md)
- Tests: the `*.test.ts` files here, `tests/db/pages.test.ts`, and `tests/e2e/` (`writing`, `saving`, `conflict`, `editor`, `tree`, `tree-move`, `tree-drag`).

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
