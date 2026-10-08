# 0005. Page tree and sidebar: a nested page tree with drag, Move to, and per account expand state

**Date**: 2026-10-08
**Status**: Accepted

## Summary

This feature turns the sidebar's flat page list into a tree: pages live inside pages, each parent can open or close, and you add a sub page with a + on its row. You move pages by dragging them in the sidebar (before, after, or inside another page) or with a "Move to…" dialog that works by keyboard and on phones. The tree is built in the browser from the page list Luna already loads, which open branches you have is remembered per account in this browser, and the database (through the trigger spec 0002 planned) refuses loops and trees deeper than 64 levels. The breadcrumb at the top now shows the full path to the open page.

## Requirements

**User stories**:
- As the owner, I want pages inside pages, shown as a tree I can open and close, so the sidebar mirrors how I organize my notes.
- As the owner, I want to add a page inside another in one click, so nesting is as quick as making a new page.
- As the owner, I want to drag pages to reorder or nest them, and to move them from a dialog when dragging is awkward (keyboard, phone), so reorganizing is never blocked.
- As the owner, I want to see where the open page sits (its path), and have the tree reveal it, so I never lose my place.

**Acceptance criteria**:
- **AC-1**: The sidebar Pages section shows a tree: top level pages in `position` order (ties by `id`), and under each expanded page its sub pages, indented one step per level, in the same order, to any depth the database allows. A page with sub pages shows a chevron button; a page without sub pages shows none. The New page button in the section header still adds a top level page at the end (spec 0004 AC-2).
- **AC-2**: The chevron button expands and collapses its page (click, Enter, or Space), with `aria-expanded` matching. Which pages are expanded survives a reload, stored in this browser per account; a second account signed in on the same browser starts with nothing expanded. Ids of pages that no longer exist are dropped from the stored list.
- **AC-3**: Hovering or focusing a row, or being on the active row, shows a + button ("Add page inside <title>") and a … button ("More actions for <title>"). Clicking + creates an "Untitled" page at the end of that page's sub pages, expands the parent, and opens `/p/<new id>` with the title focused. If the create fails you stay where you are and see the error toast from AC-10.
- **AC-4**: Opening a page whose parents are collapsed (from a link, a breadcrumb, a typed URL, or a reload) expands all of its ancestors and scrolls its row into view. The active row is marked `aria-current="page"` and styled active.
- **AC-5**: The top bar breadcrumb shows the path from the top level page down to the open page: ancestors as links, the open page as plain text, folded by the existing `collapseBreadcrumbs` rule when there are more than three. Every title in it updates live as you type a title, and the path updates at once after a move. If the tree has not loaded yet, the breadcrumb shows the open page alone until it does.
- **AC-6**: On a device with a fine pointer and hover (a desktop mouse or trackpad), you can drag any row. Over another row, the top quarter shows a line before it, the bottom quarter a line after it, and the middle half highlights the row (drop inside). Dropping before or after makes the page a sibling at that spot; dropping inside makes it the last sub page of that row and expands it. On an expanded row that has visible sub pages, the bottom zone places the page as its first sub page (where the line is drawn). The empty space under the last row is a drop zone for "end of the top level". Holding a drag over a collapsed row with sub pages for 600ms expands it. Dragging near the top or bottom edge of the sidebar scrolls it.
- **AC-7**: While dragging a page, the page itself and all its sub pages show no drop indicator and accept no drop. A drop that would leave the page exactly where it was sends no request.
- **AC-8**: A move updates the sidebar at once and sends one update for that one row: `position` only when the parent is unchanged, `parent_id` and `position` together when it changes. After a reload the tree is the same. The moved row's new parent is expanded, the row is scrolled into view and shows the active row fill for 1.5 seconds (no animation). A successful move shows no toast.
- **AC-9**: The … menu has "Move to…". It opens a dialog with a search field, a "Top level" item first, then every page except the page being moved and its sub pages, each showing its title and, muted, its parent path. Typing filters by title; "No pages found" shows when nothing matches. Choosing an item (click or Enter) moves the page to the end of that parent's sub pages (or the end of the top level), closes the dialog, reveals the row as in AC-8, and puts focus on the moved row's link. Escape closes it with no change and returns focus to the … button. It works with the keyboard alone and inside the mobile drawer.
- **AC-10**: When the server rejects a move or a sub page create, the tree returns to the server's state (the row goes back, or the new row never appears) and one error toast explains it: `LN001` "A page can't be moved inside itself.", `LN003` "Pages can only be nested 64 levels deep.", anything else "Could not move the page. Try again." for a move and "Could not create a page. Try again." for a create.
- **AC-11**: The database enforces the tree: spec 0002 **AC-2** (64 levels deep at most, `LN003`, a parent from another account rejected) and **AC-3** (no cycles, `LN001`, no row changed, even with two crossing moves at the same time) hold through the `private.check_page_parent()` trigger. The migration is additive and `src/types/database.ts` is regenerated with it (spec 0002 **AC-13**).
- **AC-12**: On a device without a fine pointer and hover (a phone or tablet), rows are not draggable, and the + and … buttons are always visible on every row. Move to is the way to move pages there.
- **AC-13**: Every row's link, chevron, +, and … are reachable with Tab and work with Enter or Space; each button's accessible name includes the page title. The tree is nested `ul` and `li` lists. After every successful move, a polite live region announces "Moved <title> into <parent title>" (or "Moved <title> to the top level"). An axe scan of the sidebar with a nested, expanded tree finds no violations in light or dark theme. Drag is never the only way to do something.
- **AC-14**: A move made in another tab shows up here when this tab regains focus. Moving a page, including the open page with unsaved edits, never interrupts its saving and never raises the "changed in another tab" notice.

**Out of scope**: renaming from the sidebar (the page title field stays the only place), deleting (feature 8), favorites (feature 9), page icons in rows (feature 12), keyboard shortcuts to reorder, touch drag, an Undo toast for moves, and syncing expand state across devices.

## Decision

**Chosen option**: Option 1: a tree built in the browser from the cached page list, moved by drag (Pragmatic drag and drop) plus a Move to command dialog, with expand state in `localStorage`, guarded by the spec 0002 M2 trigger.

No new columns; one additive migration (the M2 trigger); two new client dependencies (Pragmatic drag and drop and shadcn `command`).

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.claude/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`) · `tanstack-query-best-practices` (`deckardger/tanstack-agent-skills`, `.claude/skills/tanstack-query-best-practices/`) · `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`) · `vitest` (`antfu/skills`, `.claude/skills/vitest/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.claude/skills/playwright-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Data model sketch

No table or column changes. This feature uses the `pages` columns spec 0002 M1 shipped and adds its M2 trigger.

| Thing | Where | Shape | Change here |
|---|---|---|---|
| `pages.parent_id` | Postgres | uuid, nullable (null = top level); composite FK `(parent_id, owner_id)` to `pages(id, owner_id)`, so a parent always has the same owner | none |
| `pages.position` | Postgres | text `collate "C"`, fractional index key, order among siblings (ties by `id`) | none |
| `private.check_page_parent()` | Postgres trigger function | `before insert or update of parent_id on public.pages for each row` (exact behaviour below) | **new** (spec 0002 M2) |
| Tree | Browser, derived | built by a pure function from the cached list `['pages','list']` | new pure helper |
| Expanded ids | Browser `localStorage`, key `luna:sidebar-expanded:<userId>` | JSON array of page id strings, parsed with Zod (`z.array(z.uuid())`); anything unparseable reads as `[]` | new |

Relationships: user 1:N pages; page 1:N sub pages (self reference, same owner). Depth: top level is 1, maximum 64.

**`private.check_page_parent()` (M2 migration), exact behaviour**: `language plpgsql`, `set search_path = ''`, volatile, security invoker (RLS already limits the walk to your rows), `execute` revoked from `public, anon, authenticated` like `private.set_updated_at()`.
1. On `UPDATE` when `new.parent_id is not distinct from old.parent_id`, return `new` at once (a reorder that names `parent_id` costs nothing).
2. Take `pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0))` (the per owner lock spec 0002 defines), before any read, so the walk below sees any crossing move that committed while this one waited (each statement in a volatile function reads a fresh snapshot under read committed).
3. If `new.parent_id` is null, the parent depth is 0. Otherwise walk up from `new.parent_id` with `with recursive` over `public.pages`, carrying a level column and stopping at level 65 (`where level < 65`), so the walk ends even on corrupt data. On `UPDATE` only, if the walk meets `new.id`, raise `LN001` ("move would create a cycle"); on `INSERT` skip that check (a new row has no descendants). The parent depth is the number of rows walked. Existing data never exceeds 64 levels, so the cap never hides a real cycle.
4. Subtree height: 0 on `INSERT`; on `UPDATE`, walk down from `new.id` with `with recursive`, with the same level guard, and take the deepest level below it (0 for a leaf).
5. If `parent depth + 1 + subtree height > 64`, raise `LN003` ("deeper than 64 levels").
6. Raise with `raise exception using errcode = 'LN001'` (or `'LN003'`) and a short message; PostgREST returns it as `error.code`.

M3 (feature 8) later extends the same function with `LN002`; leave room for that check after step 2.

### State transitions

None. A page has no tree state of its own; its place is its `(parent_id, position)` pair. In the browser, a row is expanded or collapsed (only meaningful when it has sub pages).

### API surface

All calls go through the browser Supabase client and TanStack Query, as in spec 0004.

| Action | Call | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| List tree | existing `pageListQueryOptions()` (`select id, parent_id, position, title`, ranges of 1000, `order by position, id`), now with `refetchOnWindowFocus: 'always'` because the global `staleTime` of 60s would otherwise skip the focus refetch AC-14 needs | none | rows | authenticated, own rows | inline "Could not load pages" with Retry (spec 0004) |
| Create sub page | `useCreatePage({ parentId })` (extends the existing hook): `insert` into `pages` | `id`: uuid (client), `parent_id`: uuid, `position`: text | the row (`id, parent_id, position, title, content, updated_at`) | authenticated, own rows | `LN003`; `23503` parent missing or not yours; other |
| Move or reorder | new `useMovePage()`: `update pages set ... where id = $id`, `.select(PAGE_LIST_COLUMNS).single()` | `id`; `position` always; `parent_id` only when it changes | the updated list row | authenticated, own rows | `LN001`, `LN003`, `23503`, `PGRST116` (0 rows: the page is gone), other |
| Read or write expand state | `useExpandedPages(userId)` over `localStorage` | ids to add or remove | the expanded set | browser only | storage unavailable or throws: behave as an in memory set |

**Mutation rules (RECOMMEND, decided here)**:
- Create and move mutations share `scope: { id: 'page-tree' }` and `mutationKey: ['pages', 'tree']`, so tree writes run one at a time in the order you made them (runner up: no scope, which lets two quick drags race and land out of order).
- Timing (checked against the installed `@tanstack/query-core`): `onMutate` runs as soon as `mutate` is called; only `mutationFn` waits for the scope queue. So each placement is computed from the cache at call time, including earlier optimistic moves still queued. If an earlier move then fails, a queued move still goes out with its key; that is safe because keys only order siblings. A failure does not cancel the queue.
- Optimistic move: `onMutate` cancels in flight `['pages','list']` fetches, then writes the row's new `parent_id` and `position` into the list cache with `withListItem`, and returns the row's previous `parent_id` and `position`. `onSuccess` writes the returned row only when no later tree mutation for the same page id is still pending (otherwise it would overwrite that newer optimistic move). `onError` puts back only that row's previous values (never a whole list snapshot), shows the AC-10 toast, and invalidates `['pages','list']` only when `queryClient.isMutating({ mutationKey: ['pages', 'tree'] }) <= 1` (this is the last pending tree write), so a refetch never wipes moves still queued.
- Create sub page stays as spec 0004 built it (not optimistic): on success it adds the row, adds the parent to the expanded set, closes the mobile drawer, and opens the page.

### Value sourcing

| Action | Value produced or displayed | Source |
|---|---|---|
| Tree | rows and their order | the list cache `['pages','list']`, grouped by `parent_id`, siblings sorted with `comparePositioned` |
| Tree | row title | the save session snapshot title when one exists, else the cached `title`; shown through `displayTitle` (as spec 0004) |
| Tree | chevron shown | derived: the row has at least one child in the built tree |
| Tree | indent | derived: depth in the built tree; `padding-left` = 12px × (depth − 1), capped at 10 steps (120px) so deep rows keep room for their title |
| Tree | orphan rows (a `parent_id` not in the list, possible for a moment between paged reads and a concurrent move) | shown at the end of the top level, so no page ever disappears (runner up: hide them until the next refetch) |
| Tree | active row | `usePathname()` equals `/p/<id>` (as spec 0004) |
| Expand state | storage key | `luna:sidebar-expanded:<userId>`; `userId` is `claims.sub` from `getClaims()` in `src/app/(app)/layout.tsx`, passed down as a prop next to `email` |
| Expand state | stored ids | the user's chevron clicks, plus: the parent on + create; ancestors on reveal (AC-4); the drop target on drop inside; the hover expand during a drag; the new parent after a move. Pruned to ids present in the list only after a fully successful list load (`status === 'success'` with every range read), never while loading or after an error, so a failed load cannot wipe the stored list. Other tabs are not synced live (no `storage` event listener); each tab writes its own set |
| Reveal | ancestors to expand | derived: walk `parent_id` up from the active id through the list (at most 64 steps); runs when the pathname changes and when the list first loads, not on every list change. If the active id is not in the list (not found, another account), it does nothing. An ancestor you collapse by hand stays collapsed until the next navigation |
| Reveal | scroll | `element.scrollIntoView({ block: 'nearest' })` on the active row, in an effect after the expanded rows have rendered |
| Create sub page | `id` | client `crypto.randomUUID()` |
| Create sub page | `parent_id` | the row whose + was clicked |
| Create sub page | `position` | `positionAfter(children, children.length - 1)` on that parent's sorted children (`generateKeyBetween(null, null)` when it has none) |
| Drop before row X | `parent_id` | X's `parent_id` |
| Drop before row X | `position` | over X's siblings sorted, with the dragged page removed: `positionAfter(siblings, indexOf(X) - 1)` |
| Drop after row X (X collapsed or without sub pages) | `parent_id`, `position` | X's `parent_id`; `positionAfter(siblings, indexOf(X))`, dragged page removed |
| Drop after row X (X expanded with visible sub pages) | `parent_id`, `position` | X's `id`; `positionAfter(X's children, -1)` (first sub page), dragged page removed. "Has visible sub pages" is judged on X's children with the dragged page removed; if none are left, X is treated as a row without sub pages (previous row) |
| Drop inside row X | `parent_id`, `position` | X's `id`; `positionAfter(X's children, children.length - 1)` (last sub page), dragged page removed |
| Drop in the end zone | `parent_id`, `position` | null; after the last top level page, dragged page removed |
| Move to item P | `parent_id`, `position` | P's `id` (null for "Top level"); after P's last child, the moved page removed |
| Any move | positions | `positionAfter` already takes `prev` and the first later sibling with a strictly greater key as `next`, so it is `generateKeyBetween(prev, next)` for every gap and never throws on duplicate keys; no other key function is used |
| Any move | no op check | derived: the target `parent_id` equals the current one AND the target index in the sibling list with the dragged page removed equals the page's current index in that same list; keys are never compared. Then nothing is sent (AC-7). Move to the current parent is a real move to the end, unless the page is already last, in which case the dialog closes and nothing is sent |
| Any move | `parent_id` in the request | included only when it differs from the current one (AC-8) |
| Drag | drop zone | the pointer's place over the row: top 25% before, bottom 25% after, middle 50% inside (Pragmatic's tree item hitbox, `reparent` blocked) |
| Drag | invalid targets | derived: the dragged id and its descendants from the built tree (AC-7) |
| Drag | hover expand delay | constant 600ms |
| Drag | enabled | `matchMedia('(hover: hover) and (pointer: fine)')`, read through `useSyncExternalStore` like `use-mobile.ts`, so it toggles live (a mouse plugged into a tablet) without a reload; false on the server |
| Move to dialog | items | every list row except the moved page and its descendants, in tree order (depth first) |
| Move to dialog | parent path | derived ancestors' live titles (save session title, else cached title, through `displayTitle`) joined with " / "; more than two ancestors shows "… / " plus the last two. All items render (no cap); hundreds of rows is within what cmdk handles |
| Move to dialog | focus after choosing | the dialog's `onCloseAutoFocus` calls `preventDefault`; an effect after the tree re-renders focuses the moved row's link through a ref map keyed by page id. On failure, focus goes to that row's … button after the rollback renders |
| Move to dialog | filter | cmdk filtering on the display title (`keywords`), item `value` is the page id so equal titles stay distinct |
| Moved row highlight | which row and how long | tree state: the moved id, set in `onMutate`, cleared after 1500ms; a second move within that time replaces the id and restarts the timer. Expanding the new parent and scrolling the row into view run in an effect keyed on the moved id, after render |
| Move announcement | live region text | "Moved <title> into <parent title>" or "Moved <title> to the top level", from the live titles, set after `onSuccess` in one `aria-live="polite"` region in the Pages section |
| Breadcrumb | items | derived ancestors of the open page (top first) plus the page, from the list cache (never the page's own detail row, which goes stale after a move), each `{ id, title: displayTitle(live title), href: '/p/<id>' }`; the live title of every item, ancestors included, is the save session title when one exists, else the cached title |
| Error toast | message | `moveErrorMessage(code, kind)`: `LN001`, `LN003` as AC-10, any other code the generic text for that kind |

### Key invariants

- The database is the judge of tree shape: the browser blocks only obviously invalid drops (self and descendants) for comfort; `private.check_page_parent()` blocks every cycle and over deep tree, including races between tabs.
- A move writes exactly one row. Sub pages move with their parent because they point at it; nothing else is rewritten.
- A move never changes `updated_at` (`private.set_updated_at()` only reacts to `title`, `content`, `content_text`), so it never trips the spec 0004 save guard (AC-14).
- Tree writes from one tab run in order (`scope: 'page-tree'`); rollback restores only the failed row.
- Expand state is per browser and per account, and is never read on the server; the first render shows the tree collapsed until the client reads it (the Pages section already renders its skeleton until the list loads, so nothing jumps after load).
- All tree logic (build, ancestors, descendants, drop placement, move targets, error mapping, expand state parsing) lives in pure functions in `src/features/pages/` with Vitest tests; components only call them.

### Security model

No new access rules. RLS on `pages` (spec 0002) already limits every read and write to your own rows, the column grants already allow clients to write `parent_id` and `position`, and the composite foreign key rejects a parent that belongs to another account. The trigger runs as the caller, so its walks see only your rows. `localStorage` holds page ids only (no titles or content), under a key that includes your user id. Personal notes, no regulated data.

### Configuration required

No new environment variables or credentials. New dependencies, pinned to exact versions at install time (as BlockNote is): `@atlaskit/pragmatic-drag-and-drop`, `@atlaskit/pragmatic-drag-and-drop-hitbox`, `@atlaskit/pragmatic-drag-and-drop-auto-scroll`. Do not add Atlassian's React drop indicator package (it brings Atlassian design tokens); draw the indicator with Luna tokens. New shadcn component: `command` (with its `cmdk` dependency), followed by the ui edit pass in `docs/design.md`.

### UI details (RECOMMEND, decided here)

- **Row**: a full width row (so drop zones span the sidebar): `[chevron or 16px spacer][title link][+][…]`, `h-7`, `text-sm`, indent by `padding-left` as above. Nested levels are plain nested `ul role="list"` inside the `li`, not shadcn `SidebarMenuSub` (its left border and margins eat width at every level). The title link stays the drag source and still navigates on click.
- **Buttons**: chevron `ChevronRightIcon`, rotated 90° when expanded with no transition, named "Sub pages of <title>" in both states (`aria-expanded` carries the state, `aria-controls` points at the child list); + `PlusIcon`; … `MoreHorizontalIcon`; `variant="ghost"` at `size="icon-xs"` so they fit `h-7`. + and … are hidden with `opacity-0` (never `display: none` or `visibility: hidden`, so they stay in the Tab order) and shown with `group-hover`, `focus-within`, the `aria-current` row, an open menu, and always under `@media (hover: none)`.
- **Drop indicators**: a 2px line in `bg-sidebar-primary`, inset to the target's indent, for before and after; the row fill `bg-sidebar-accent` for inside. The dragged row shows at reduced opacity on its source (the browser draws the drag preview). No other motion.
- **… menu**: shadcn `DropdownMenu` with one item for now, "Move to…"; features 8 and 9 add Delete and Favorite here.
- **Move to dialog**: shadcn `CommandDialog`, title "Move <title> to", input placeholder "Search pages", "Top level" item with a muted "Top level" label, one `CommandItem` per page.
- **Dev preview**: `/dev/ui/shell` keeps its sample `pages` prop; give it a small nested sample so the tree is visible there.

### Critical test scenarios

- Tree build (Vitest): rows in mixed order build the right nesting and sibling order; ties by `id`; orphans land at the end of the top level; ancestors and descendants are correct; a 64 level chain works, verifies **AC-1**, **AC-4**, **AC-5**
- Drop placement (Vitest): each zone (before, after, after on an expanded parent, inside, end zone, Move to) gives the right `parent_id` and `position`, the dragged page is removed from its own sibling list, duplicate keys never throw, a no op returns null, self and descendants are invalid, verifies **AC-6**, **AC-7**, **AC-8**, **AC-9**
- Expand state (Vitest): bad JSON, non arrays, and non uuid entries read as empty or are dropped; pruning removes unknown ids; storage that throws falls back to memory, verifies **AC-2**
- Error mapping (Vitest): `LN001`, `LN003`, and other codes map to the AC-10 texts for move and create, verifies **AC-10**
- Database (`tests/db/pages.test.ts`): move A under its grandchild gets `LN001` and no change; two concurrent crossing moves (A under B, B under A, started together on two separate signed in clients so they really overlap in Postgres) leave exactly one applied and the other `LN001`; a 64 level chain works and the 65th level, or moving a two level subtree under level 63, gets `LN003`; a parent from account B gets `23503`; a reorder (position only) still works; account B still cannot update A's `parent_id`, verifies **AC-11**
- Happy path (e2e): create A, + on A creates B (opens with title focused, A expanded), name it, reload: A expanded with B under it, breadcrumb "A / B", verifies **AC-1**, **AC-2**, **AC-3**, **AC-5**
- Expand state (e2e): collapse A, reload, still collapsed; sign in as account B in the same browser, nothing expanded, verifies **AC-2**
- Reveal (e2e): collapse everything, open a level 3 page by URL, its ancestors expand and its row is visible and `aria-current`, verifies **AC-4**
- Drag (e2e, Chromium): drag C before A, after A, inside A, into the end zone; each shows in the tree at once and survives reload; hover over collapsed A for 600ms expands it; dragging A over its own child shows no indicator and the drop changes nothing, verifies **AC-6**, **AC-7**, **AC-8**
- Move to (e2e, keyboard only): Tab to a row's …, Enter, "Move to…", type part of a title, Enter; the page moves, focus is on its link, the live region reads "Moved <title> into <parent title>"; Escape closes with no change and focus is back on the … button; choosing the current parent when the page is already last sends no request, verifies **AC-9**, **AC-13**
- Failure (e2e): route the move `PATCH` to return `LN003` (and once a 500): the row goes back and the toast shows the right text, verifies **AC-10**
- Mobile (e2e, phone viewport): + and … visible without hover, rows not draggable, Move to works in the drawer, verifies **AC-12**
- Accessibility (e2e): axe scan of the sidebar with a three level expanded tree, light and dark, no violations, verifies **AC-13**
- Two tabs (e2e): move a page in tab 2, focus tab 1, the tree updates; type in a page, move it while the save is pending, it reaches "Saved" with no conflict notice, verifies **AC-14**

## Build plan

Tracer Bullet: M1 proves nesting through every layer (trigger, insert, tree, expand state, breadcrumb) with the smallest UI; M2 adds moving through the accessible path first, so the move mutation and its failure handling exist before drag; M3 layers drag on that same mutation. Apply the migration to luna-dev, then luna-prod, then merge.

1. **M1, nest and see the tree**:
   1. Migration `private.check_page_parent()` and its trigger (exact behaviour above), applied to luna-dev, `npm run db:types`; extend `tests/db/pages.test.ts` with the cycle, crossing move, depth, and other owner cases, satisfies **AC-11**
   2. Pure helpers in `src/features/pages/tree.ts` (`buildTree`, `ancestorsOf`, `descendantIdsOf`) with Vitest tests, satisfies **AC-1**, **AC-4**, **AC-5**
   3. `src/features/pages/expanded-pages.ts` (parse, prune, add, remove, pure) and `hooks/use-expanded-pages.ts` (`localStorage` edge, per account key); pass `userId` from the `(app)` layout, satisfies **AC-2**
   4. `components/page-tree.tsx` replacing the top level only `PageList` body: recursive rows with chevron, indent, active state, + button, reveal on navigation; keep the loading, error, and empty states, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-13**
   5. `useCreatePage({ parentId })` with the parent's position and expand on success; error toast mapping in `src/features/pages/tree-errors.ts`, satisfies **AC-3**, **AC-10**
   6. Breadcrumb ancestors in `PageView` from the list cache with live titles; nested sample in `/dev/ui/shell`; e2e for the happy path, expand state, and reveal, satisfies **AC-5**, **AC-1** to **AC-4**
2. **M2, move with the dialog**:
   1. Pure `placement.ts` (`placementFor` for every zone and Move to target, no op check, invalid targets) and `moveTargets` (dialog items with parent paths), with Vitest tests, satisfies **AC-7**, **AC-8**, **AC-9**
   2. `hooks/use-move-page.ts`: optimistic update, `scope: 'page-tree'`, per row rollback, guarded success write and invalidate, toast mapping, expand the new parent, moved row highlight, the live region announcement; `refetchOnWindowFocus: 'always'` on the list query, satisfies **AC-8**, **AC-10**, **AC-13**, **AC-14**
   3. Add shadcn `command` plus the ui edit pass; the row … `DropdownMenu` with "Move to…"; `components/move-to-dialog.tsx`, focus handling on choose and Escape; always visible buttons under `hover: none`, satisfies **AC-9**, **AC-12**, **AC-13**
   4. e2e: Move to by keyboard, failure rollback, mobile viewport, two tabs, axe on a nested tree, satisfies **AC-9**, **AC-10**, **AC-12** to **AC-14**
3. **M3, drag and drop**:
   1. Install the three Pragmatic packages (exact versions); `hooks/use-can-drag.ts` (`hover: hover` and `pointer: fine`), satisfies **AC-6**, **AC-12**
   2. Row `draggable` and `dropTargetForElements` with the tree item hitbox (`reparent` blocked, self and descendants blocked), the end zone target, auto scroll on the sidebar content, hover expand after 600ms, drop indicators in Luna tokens; on drop call `placementFor` then the M2 move mutation, satisfies **AC-6**, **AC-7**, **AC-8**
   3. e2e drag scenarios (before, after, inside, end zone, hover expand, invalid target, reload), satisfies **AC-6** to **AC-8**

## Consequences

**Positive**:
- Nesting needs no schema change: M1's columns were designed for it, and one trigger closes the cycle and depth gaps.
- Moving has one code path (`placementFor` plus `useMovePage`) shared by drag and the dialog, so the dialog's tests cover most of drag's logic.
- Every move action works by keyboard and on phones, so the sidebar stays within the design system's accessibility promise.
- The command component arrives now and feature 10 (Search) reuses it.

**Negative / tradeoffs**:
- Two more client dependencies (Pragmatic drag and drop, cmdk) to keep up to date.
- Expand state does not follow you to another device or browser, and clearing site data resets it.
- No Undo for moves: a wrong drop is fixed by moving the page back (the highlight shows where it went).
- Drag is mouse and trackpad only; touch users always use the dialog.
- The whole tree renders from the full list; past a few thousand visible rows the sidebar would need virtualization, which this design does not include.
- Fractional keys grow a little with every insert in the same gap (spec 0002 notes there is no rebalancing).

**Neutral**:
- `PageList` becomes `PageTree`; the sidebar's loading, error, and empty states carry over unchanged.
- The `(app)` layout now passes the user id to the client as well as the email.
- Feature 8 extends `private.check_page_parent()` with `LN002` and adds Delete to the … menu; feature 9 adds Favorite there; feature 12 puts the icon in the chevron spacer.

## Follow-up

- [ ] After M3, `/sync` records the tree conventions (`placementFor`, `scope: 'page-tree'`, expand state key) in `src/features/shell/AGENTS.md` or a new `src/features/pages/AGENTS.md`.
- [ ] Spec 0002 M2 is delivered by this feature; tick it in the scope's data model milestones when M1 here ships.
