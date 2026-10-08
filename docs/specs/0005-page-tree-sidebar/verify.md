# Verify: Page tree & sidebar · spec 0005 · updated 2026-10-08
_Steps derived from spec 0005 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Signed in, create page A, hover its row, click + → a new "Untitled" page opens with the title focused, A shows a chevron and is expanded with the new page under it → AC-1, AC-3
- [ ] Name the sub page B, reload → A is still expanded with B under it, indented one step; the breadcrumb reads "A / B", A is a link, B is plain text → AC-1, AC-2, AC-5
- [ ] With B open, type in A's title (open A) → the sidebar row and every breadcrumb show the new title as you type → AC-5
- [ ] Collapse A with the chevron (click, then Enter, then Space) → `aria-expanded` flips each time; reload → still collapsed → AC-2
- [ ] Build a 4 level chain, collapse everything, open the deepest page by URL → every ancestor expands, its row scrolls into view with `aria-current="page"`; the breadcrumb folds to first plus last two with a "Show hidden pages" menu → AC-4, AC-5
- [ ] Sign in as a second account in the same browser → nothing is expanded; `localStorage` holds a separate `luna:sidebar-expanded:<user id>` key per account → AC-2
- [ ] Desktop mouse: drag a row over another row's top quarter (line above), bottom quarter (line below), middle (row fills) and drop each → the page lands before, after, or as the last sub page (parent expands); reload → same tree → AC-6, AC-8
- [ ] Drag below an expanded row that has sub pages → the line is indented one level deeper and the page lands as its first sub page → AC-6
- [ ] Drag into the empty space under the last row → the page becomes the last top level page → AC-6
- [ ] Hold a drag over a collapsed row with sub pages for about a second → it expands → AC-6
- [ ] Drag a page over itself or any of its sub pages → no line, no fill, dropping changes nothing and sends no request (Network tab) → AC-7
- [ ] Drop a page back exactly where it was → no request → AC-7
- [ ] After any successful move: one PATCH for that one row, with `position` only when the parent is unchanged and `parent_id` plus `position` when it changes; the moved row shows the active fill for about 1.5s; no toast → AC-8
- [ ] Keyboard only: Tab to a row's …, Enter, "Move to…", type part of a title, Enter → the page moves to the end of that parent, focus is on its link, a screen reader hears "Moved <title> into <parent>" → AC-9, AC-13
- [ ] In Move to, the first item is "Top level"; the page itself and its sub pages are not listed; each item shows its parent path muted; a search with no match shows "No pages found"; Escape closes with no change and focus back on … → AC-9
- [ ] Block the move request in DevTools (or make it fail) → the row jumps back and one toast says "Could not move the page. Try again." → AC-10
- [ ] Move a page so the tree would be 65 levels deep → the row goes back with "Pages can only be nested 64 levels deep." → AC-10, AC-11
- [ ] Phone (or a touch emulated device): + and … are visible on every row without hover, rows do not drag, Move to works inside the drawer → AC-12
- [ ] axe (or the browser accessibility tree) on a three level expanded tree, light and dark → no violations; rows are nested `ul`/`li` lists → AC-13
- [ ] Two tabs: move a page in tab 2, switch back to tab 1 → tab 1's tree updates → AC-14
- [ ] Type in a page and move it while "Saving…" shows → it reaches "Saved" and the "changed in another tab" notice never appears → AC-14
- [ ] Open the drawer on a phone → focus lands on the open page's row (or the drawer); one Escape closes it → spec 0003 drawer behavior kept

## Value sourcing checks
- [ ] Row order: pages with equal `position` keys sort by `id` (set two equal keys in luna-dev, reload) → Tree rows and their order
- [ ] Row title: while a title has unsaved edits, the sidebar shows the typed title, not the cached one → Tree row title
- [ ] Chevron only on rows with at least one sub page; indent grows 12px per level and stops growing after 10 levels → Tree chevron, indent
- [ ] A row whose parent is not in the list shows at the end of the top level (simulate with a list refetch mid move) → Tree orphan rows
- [ ] Expand state key is `luna:sidebar-expanded:<claims.sub>`; a failed list load never empties it; deleted page ids drop out after a successful load → Expand state key, stored ids
- [ ] + create: `parent_id` is the clicked row, `position` sorts after its last sub page → Create sub page
- [ ] Each drop zone and Move to target writes the parent and position in the spec's table (before, after, after on an open row, inside, end zone, Move to) → Drop and Move to rows
- [ ] Drag is enabled only under `(hover: hover) and (pointer: fine)` and flips live when that changes (DevTools device toolbar) → Drag enabled
- [ ] Breadcrumb ancestors come from the list cache: after a move, the path changes at once without reloading the page → Breadcrumb items

## Commands
- [ ] `npm run test:db` → the tree rules suite passes: LN001 on a cycle and on two crossing moves at once (exactly one applied), 64 levels allowed, LN003 on the 65th and on a two level subtree under level 63, 23503 for another account's parent, reorders still work, account B cannot move A's page → AC-11
- [ ] `npm test` → tree, placement, expand state, and error mapping suites pass → AC-1, AC-2, AC-4 to AC-10
- [ ] `npm run test:e2e` → `tree.spec.ts`, `tree-move.spec.ts`, `tree-drag.spec.ts` pass → AC-1 to AC-10, AC-12 to AC-14
- [ ] `supabase/migrations/20261008150000_pages_tree_rules.sql` is applied to luna-dev, then luna-prod, before merge → AC-11

## Acceptance-criteria coverage
- AC-1 tree and order · AC-2 expand state per account · AC-3 + sub page · AC-4 reveal · AC-5 breadcrumb path · AC-6 drag zones, end zone, hover expand · AC-7 invalid targets and no op · AC-8 one row update, highlight · AC-9 Move to dialog · AC-10 rollback and toasts · AC-11 database trigger · AC-12 phone · AC-13 keyboard, live region, axe · AC-14 other tab, saving while moving
