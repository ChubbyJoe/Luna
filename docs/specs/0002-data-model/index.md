# 0002. Luna data model: pages tree with side tables, shipped additively

**Date**: 2026-10-07
**Status**: In Progress

## Summary

This spec fixes the whole target database shape for Luna now, so no later feature needs a breaking change. Every page is one row in `pages` (its title, its place in the tree, and its BlockNote document), and favorites, share links, and uploaded files each get a small table of their own. Nothing is built by this spec directly: each table or column ships with the feature that first uses it, and every migration only adds things. Row level security (Postgres rules that filter rows per user) guards every table, and anonymous visitors can only read a published page through one narrow database function.

## Requirements

**User stories**:
- As the owner, I want pages nested to any depth and kept in the order I set, so the sidebar reflects how I think.
- As the owner, I want a deleted page and its sub pages to sit in a trash I can restore from, and to clean itself after 30 days, so mistakes are cheap and old junk goes away.
- As the owner, I want favorites, icons, covers, files, and share links to attach to pages without later migrations breaking my notes.
- As a visitor with a share link, I want to read that one page, and nothing else.

**Acceptance criteria** (verified in the slice that ships each part; a criterion is checked when its last slice ships):
- **AC-1**: For every table (`pages`, `favorites`, `share_links`, `files`), account B cannot select, insert, update, or delete account A's rows, and `anon` gets permission denied (`42501`) on every table.
- **AC-2**: A page can be created under another page of the same owner, up to 64 levels deep (a deeper placement fails with `LN003`). A `parent_id` pointing at another owner's page is rejected by the database.
- **AC-3**: Moving a page under itself or under one of its descendants fails with `LN001`, and no row changes, even when two tabs make crossing moves at the same time.
- **AC-4**: Siblings read back in `position` order (ties broken by `id`). Inserting or moving a page between two siblings updates exactly one row.
- **AC-5**: `trash_page` stamps the page and all its live descendants in one atomic statement. Trashed pages disappear from the sidebar, search, favorites, and share reads.
- **AC-6**: `restore_page` brings back exactly the group trashed with that page, to its old parent and position, with its favorites and share link working again. If the old parent is still in the trash, the restored page moves to the top level at the position the client passes.
- **AC-7**: A live page cannot be created under, or moved under, a trashed parent (`LN002`), including when the parent is trashed concurrently.
- **AC-8**: Emptying the trash, and the lazy purge of trash older than 30 days (run when the app opens), delete the Storage objects first, then the rows. Favorites, share links, and file rows go with their page. If Storage deletion fails, the rows stay and the purge retries next time. A page restored between those two steps is never deleted.
- **AC-9**: The database rejects a title over 500 characters, content that is not a JSON array or is over 2 MB, plain text over 512 KB, a `position` that is not 1 to 128 base62 characters, an icon outside 1 to 32 characters, and a page with both a cover file and a cover preset set.
- **AC-10**: A page's `search` column matches words from its title and its `content_text` using the `simple` config, with title matches ranked higher.
- **AC-11**: `get_shared_page(slug)` returns the one published, non trashed page for that slug to anyone, including `anon`. An unknown slug, an unpublished page, or a trashed page returns no row. `anon` cannot list share links or pages.
- **AC-12**: A page's cover file must belong to that same page. Deleting the file clears the cover.
- **AC-13**: Every migration in this plan is additive (no drop, rename, or type change of a shipped column; indexes and functions may be replaced), and `src/types/database.ts` is regenerated and committed with it.
- **AC-14**: A client cannot set `owner_id`, `deleted_at`, `trashed_root_id`, `created_at`, or `updated_at`, nor change an existing `id` (`42501`); trash state changes only through `trash_page`, `restore_page`, and `purge_trash_roots`.
- **AC-15**: A trashed page opens read only: updating its `title`, `content`, `content_text`, `parent_id`, `position`, `icon`, or cover fails with `LN004`.

## Decision

**Chosen option**: Option 1: a relational `pages` tree holding one BlockNote document per row, with favorites, share links, and files as side tables, shipped additively per feature.

`pages` is an adjacency list (`parent_id`) ordered by fractional index keys, trash stamps whole subtrees, clients write only through column level grants, trash state changes only through owner scoped `security definer` functions, and public reads go through one `security definer` function.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.claude/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`) · `tanstack-query-best-practices` (`deckardger/tanstack-agent-skills`, `.claude/skills/tanstack-query-best-practices/`) · `vitest` (`antfu/skills`, `.claude/skills/vitest/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.claude/skills/playwright-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Data model sketch

All tables live in `public`, all ids are `uuid default gen_random_uuid()` that the client may supply (`crypto.randomUUID()`) for optimistic creates. Every `owner_id` is `uuid not null default auth.uid() references auth.users(id) on delete cascade`. Users stay in `auth.users`; there is no `profiles` table (add one later, additively, when a feature needs per user settings).

**`pages`** (one row per page)

| Column | Type | Null | Notes | Ships in |
|---|---|---|---|---|
| `id` | uuid | no | PK | M1 |
| `owner_id` | uuid | no | FK `auth.users`, cascade | M1 |
| `parent_id` | uuid | yes | null means top level. Composite FK `(parent_id, owner_id)` → `pages(id, owner_id)` on delete cascade, so a parent always has the same owner | M1 |
| `position` | text `collate "C"` | no | fractional index key from `fractional-indexing`; byte order collation so Postgres sorts exactly like JS string compare; check `position ~ '^[0-9A-Za-z]{1,128}$'` | M1 |
| `title` | text | no | default `''`, check `char_length(title) <= 500`. The UI shows "Untitled" for `''` | M1 |
| `content` | jsonb | no | BlockNote block array, default `'[]'`, check `jsonb_typeof(content) = 'array'` and `octet_length(content::text) <= 2097152` | M1 |
| `content_text` | text | no | plain text derived by the client on each save, default `''`, check `octet_length(content_text) <= 524288` | M1 |
| `created_at` | timestamptz | no | default `now()` | M1 |
| `updated_at` | timestamptz | no | default `now()`, set by trigger `private.set_updated_at()` only when `title`, `content`, or `content_text` actually change (reorder, trash, icon, and cover changes leave it alone, so it means "last edited" for the save guard and share pages) | M1 |
| `deleted_at` | timestamptz | yes | set by `trash_page`, null when live | M3 |
| `trashed_root_id` | uuid | yes | the page the user trashed; check `(deleted_at is null) = (trashed_root_id is null)`. No FK (the root always goes in the same purge) | M3 |
| `search` | tsvector | no | `generated always as (setweight(to_tsvector('simple'::regconfig, title), 'A') \|\| setweight(to_tsvector('simple'::regconfig, left(content_text, 200000)), 'B')) stored`; the `left` keeps it under Postgres's 1 MB tsvector limit. Never selected by app reads (always list columns, no `select *`) | M5 |
| `icon` | text | yes | null when unset (never `''`); check `char_length(icon) between 1 and 32` (multi code point emoji included). "Exactly one emoji" is a Zod rule, not a DB rule | M7 |
| `cover_preset` | text | yes | a preset key, check `cover_preset ~ '^[a-z0-9-]{1,32}$'`; the allowed keys are an app constant validated by Zod (feature 12 picks them) | M7 |
| `cover_file_id` | uuid | yes | composite FK `(cover_file_id, id)` → `files(id, page_id)` `on delete set null (cover_file_id)`; check `cover_file_id is null or cover_preset is null` | M7 |

Constraints and indexes: unique `(id, owner_id)` (target of the composite FKs, M1) · index `(owner_id, parent_id, position)` (M1; made partial `where deleted_at is null` in M3 by creating the partial index and dropping the full one) · index `(parent_id)` for cascades and recursive walks (M1) · partial index `(owner_id, deleted_at) where deleted_at is not null` for the trash list (M3) · GIN index on `search` (M5).

**`favorites`** (M4)

| Column | Type | Null | Notes |
|---|---|---|---|
| `owner_id` | uuid | no | the user who favorited |
| `page_id` | uuid | no | FK `pages(id)` on delete cascade (a plain FK, not composite, so favoriting a page shared with you later needs no schema change) |
| `position` | text `collate "C"` | no | fractional key for the Favorites section order |
| `created_at` | timestamptz | no | default `now()` |

PK `(owner_id, page_id)` · index `(page_id)`.

**`share_links`** (M8)

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | uuid | no | PK |
| `owner_id` | uuid | no | |
| `page_id` | uuid | no | unique; composite FK `(page_id, owner_id)` → `pages(id, owner_id)` on delete cascade |
| `slug` | text | no | unique; check `slug ~ '^([a-z0-9]+(-[a-z0-9]+)*-)?[A-Za-z0-9]{12}$'` and `char_length(slug) <= 80` |
| `description` | text | yes | social card and meta description, check `char_length(description) <= 300` |
| `published_at` | timestamptz | no | default `now()` |

Unpublish deletes the row. Index `(owner_id)`.

**`files`** (M6)

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | uuid | no | PK, client supplied (it is part of the Storage path) |
| `owner_id` | uuid | no | |
| `page_id` | uuid | no | composite FK `(page_id, owner_id)` → `pages(id, owner_id)` on delete cascade |
| `storage_path` | text | no | unique; check `storage_path ~ ('^' \|\| owner_id::text \|\| '/' \|\| page_id::text \|\| '/' \|\| id::text \|\| '(\.[a-z0-9]{1,10})?$')`; the object lives at that path in one private bucket (feature 11 names it) |
| `name` | text | no | original file name, check `char_length(name) between 1 and 255` |
| `mime_type` | text | no | |
| `size_bytes` | bigint | no | check `size_bytes > 0` |
| `created_at` | timestamptz | no | default `now()` |

Unique `(id, page_id)` (target of the cover FK) · index `(owner_id, page_id)`.

**Relationships**: user 1:N pages · page 1:N child pages (self) · page 1:0..1 share link · page 1:N files · page 1:0..1 cover file (one of its own files) · user N:M pages through favorites (0..1 favorite per user per page).

### State transitions

A page is **live** (`deleted_at is null`) or **trashed** (`deleted_at` and `trashed_root_id` set). Purged rows no longer exist.

- live → trashed: `trash_page(id)` on that page, or on any live ancestor. Every live descendant gets the same `trashed_root_id`. Descendants already trashed earlier keep their own root.
- trashed → live: `restore_page(root_id, top_position)` restores every row whose `trashed_root_id = root_id`. Only the root's `parent_id` may change (to null, when its parent is still trashed).
- trashed → purged: `purge_trash_roots(roots, expired_only)`, from empty trash (all roots) or the lazy purge (roots with `deleted_at < now() - interval '30 days'`). Deleting a root row cascades to its whole subtree through `parent_id`, plus its favorites, share link, and file rows.

### API surface

All calls go through `supabase-js` from the browser as the signed in user (spec 0001). Functions use `set search_path = ''`, are created with `create or replace` (same signature, so grants survive), have `execute` revoked from `public` and `anon` (Supabase grants `execute` on new `public` functions by default), and are granted to `authenticated` unless noted. Errors are Postgres `sqlstate` values the calling hook maps to friendly messages:

| Code | Meaning | Raised by |
|---|---|---|
| `LN001` | move would create a cycle | `private.check_page_parent()` |
| `LN002` | parent is trashed | `private.check_page_parent()` |
| `LN003` | deeper than 64 levels | `private.check_page_parent()` |
| `LN004` | page is in the trash (read only) | `private.check_page_trashed()` |
| `P0002` | page not found, not yours, or not in the expected state | the trash functions |
| `23514` / `23503` / `23505` | check, foreign key, or unique violation | constraints |
| `42501` | permission denied | grants and RLS |

| Operation | Kind | Key inputs | Key outputs | Auth | Key errors | Slice |
|---|---|---|---|---|---|---|
| Create page | `insert` into `pages` | `id`: uuid (opt), `parent_id`: uuid (opt), `position`: text (req), `title`: text (opt) | the row | authenticated, own rows | `23503` parent not yours or missing; `LN002` (M3); `LN003` (M2); `23514` limits | M1 |
| Read one page | `select` from `pages` by `id` | `id` | metadata, `content`, `deleted_at` (not filtered, so a trashed page opens in a read only "in trash" view) | authenticated | 0 rows: not found | M1 |
| Save page | `update pages` | `title`, `content`, `content_text` | `updated_at` | authenticated, own rows | `23514` over limits; `LN004` trashed (M3); 0 rows when the page is gone | M1 |
| Move / reorder page | `update pages` | `parent_id`, `position` | the row | authenticated, own rows | `LN001`, `LN003` (M2); `LN002`, `LN004` (M3); `23503` other owner's parent | M1 (rules M2, M3) |
| List tree | `select` from `pages` | none (RLS scopes to owner) | `id, parent_id, position, title, icon` where `deleted_at is null`, ordered by `position, id`, read in pages of 1000 with `.range()` until a short page | authenticated | none | M1 |
| Trash page | `rpc('trash_page')` | `p_page_id`: uuid (req) | count of rows stamped | authenticated | `P0002` not found or already trashed | M3 |
| Restore page | `rpc('restore_page')` | `p_page_id`: uuid (req), `p_top_position`: text (req, always sent) | `parent_id` after restore (null when moved to top level) | authenticated | `P0002` not a trash root | M3 |
| List trash | `select` from `pages` | none | roots only: `id = trashed_root_id`, ordered by `deleted_at desc` | authenticated | none | M3 |
| List purge roots | `rpc('expired_trash_roots')` | none | `setof uuid`: your roots trashed more than 30 days ago (server `now()`) | authenticated | none | M3 |
| Purge roots | `rpc('purge_trash_roots')` | `p_root_ids`: uuid[] (req), `p_expired_only`: boolean (req) | count of roots deleted | authenticated | none (roots no longer in the trash, or not expired when `p_expired_only`, are skipped) | M3 |
| List purge files | `rpc('subtree_storage_paths')` | `p_root_ids`: uuid[] (req) | `setof text`: Storage paths of every file in those subtrees | authenticated | none | M6 |
| Favorite / unfavorite / reorder | `insert` / `delete` / `update favorites` | `page_id`, `position` | the row | authenticated, own rows | `23505` already a favorite; `42501` page not readable | M4 |
| List favorites | `select` from `favorites` joined `pages!inner` | none | page id, title, icon, ordered by `favorites.position` where the page is live | authenticated | none | M4 |
| Register file | `insert` into `files` (after the Storage upload succeeds; on insert error the client removes the uploaded object) | `id`, `page_id`, `storage_path`, `name`, `mime_type`, `size_bytes` | the row | authenticated, own rows | `23514` path not matching owner, page, and id | M6 |
| Set icon / cover | `update pages` | `icon`, `cover_preset`, `cover_file_id` | the row | authenticated, own rows | `23514` both cover fields set; `23503` file from another page; `LN004` trashed | M7 |
| Publish / unpublish | `insert` / `delete share_links` | `page_id`, `slug`, `description` | the row | authenticated, own rows | `23505` slug taken (client regenerates the suffix and retries once) | M8 |
| Read shared page | `rpc('get_shared_page')` | `p_slug`: text (req) | `title, icon, cover_preset, cover_storage_path, content, description, published_at, updated_at` | **public** (`anon` and `authenticated`), `security definer` | no row (render not found) | M8 |

### Value sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| Create page | `id` | client `crypto.randomUUID()`, else column default |
| Create / move page | `position` | client, `generateKeyBetween(prev, next)` from `fractional-indexing`, with neighbours read from the cached tree sorted by `position, id`: `prev` is the sibling the page lands after (null at the start), `next` is the first later sibling whose key is strictly greater than `prev` (null at the end), so duplicate keys left by a restore or two tabs never make it throw. No siblings: `generateKeyBetween(null, null)` |
| Create page | `owner_id` | column default `auth.uid()` (not in the insert grant); RLS `with check` confirms it |
| Save page | `content_text` | client, a pure function `blocksToPlainText(blocks)` in `src/features/pages/` run on the same blocks being saved: walks every block and its `children` depth first, takes inline text content only (link text, not URLs or props), includes table cell text, joins blocks with `\n`, strips `\u0000`, and truncates to 500,000 characters |
| Save page | `updated_at` | trigger `private.set_updated_at()`, only when `title`, `content`, or `content_text` change |
| Image in content | the reference an image or file block stores | the `files.id` and `storage_path` in the block's props, never a signed URL; the URL is resolved at render time (feature 11 defines the block props) |
| Trash page | `deleted_at`, `trashed_root_id` | `now()` and `p_page_id` inside `trash_page` |
| Restore page | top level `position` when the parent is still trashed | input `p_top_position`, always sent, computed by the client as `generateKeyBetween(lastTopLevel.position, null)` (or `(null, null)` with no top level pages); ignored when the parent is live |
| Restore page | whether the parent is trashed | `restore_page` reads the parent row's `deleted_at` |
| Lazy purge | which roots are expired | `expired_trash_roots()`, using server `now()` and the 30 day constant in SQL |
| Purge | Storage object paths | `subtree_storage_paths(root_ids)` from `files.storage_path` (from M6; before that there are no files) |
| Empty trash | result shown to the user | count returned by `purge_trash_roots` |
| Favorites list | favorite order | `favorites.position` |
| Publish | `slug` | client: `slugify(title)` (lowercase ASCII, words joined by `-`, cut to 60 chars, then leading and trailing `-` trimmed; omitted when empty) plus `-`, plus 12 base62 chars from `crypto.getRandomValues`. Republishing after an unpublish makes a new slug, so the old URL stays dead |
| Publish | `description` | input from the publish dialog (feature 13), optional |
| Share read | page fields | `get_shared_page(slug)` joining `share_links` and `pages` (and `files` for the cover path) |
| Search | match and rank | `pages.search` (generated); the query function is owned by feature 10 |
| File register | `storage_path` | client builds `<owner_id>/<page_id>/<file_id>.<ext>` before upload; the check constraint enforces it |
| Sidebar "Untitled" | display title | derived: `title === '' ? 'Untitled' : title` in the UI |

### Key invariants

- A page's parent has the same owner (composite FK). A favorite, share link, or file belongs to its page's owner (composite FK, or the RLS `with check` for favorites).
- Tree writes are serialized per owner: `private.check_page_parent()` and `trash_page` first take `pg_advisory_xact_lock(hashtextextended(owner_id::text, 0))`, so two tabs cannot pass the checks below on stale data.
- No cycles: a `before insert or update of parent_id` trigger (`private.check_page_parent()`, M2) walks up from the new parent with a recursive query and raises `LN001` if it reaches the page itself.
- Depth: the same walk counts ancestors; a page whose depth would exceed 64 levels (top level is 1), or whose subtree would end up deeper than 64, raises `LN003`. This keeps cascades and recursive queries far from Postgres stack limits.
- A live page never has a trashed parent: the same trigger (extended in M3) raises `LN002` when `new.deleted_at is null` and the parent's `deleted_at is not null`. It fires only on insert or when `parent_id` changes, so a restore (which keeps descendants' `parent_id`) passes.
- Trashed pages are read only: a `before update` trigger `private.check_page_trashed()` (M3) raises `LN004` when `old.deleted_at is not null` and any of `title`, `content`, `content_text`, `parent_id`, `position`, `icon`, `cover_preset`, `cover_file_id` changes, unless the trash functions set the transaction local flag `luna.trash_op = 'on'` (`set_config('luna.trash_op', 'on', true)`) for restore.
- Trash state and identity columns are never client writable: column level grants (Security model) leave out `id` (on update), `owner_id`, `deleted_at`, `trashed_root_id`, `created_at`, `updated_at`.
- `deleted_at` and `trashed_root_id` are both set or both null.
- At most one of `cover_file_id` and `cover_preset`. The cover file's `page_id` equals the page's `id`.
- `files.storage_path` starts with `<owner_id>/<page_id>/<id>`.
- A page has at most one share link. Slugs are globally unique and end with 12 random base62 characters.
- Migrations after M1 are additive only. Changing or dropping a shipped column needs a new spec.

### Functions (exact behaviour)

- `private.set_updated_at()`: `before update` trigger function on `pages` (M1): sets `new.updated_at := now()` only when `new.title`, `new.content`, or `new.content_text` is distinct from the old value.
- The three trash writers below are `security definer` (owned by `postgres`, `search_path = ''`), because clients have no grant on the trash columns. Each filters every statement by `owner_id = (select auth.uid())`, raises `P0002` when `auth.uid()` is null, and touches no other owner's rows.
- `public.trash_page(p_page_id uuid) returns integer`, `volatile`: takes the owner lock, then one `with recursive` statement collects the page (must be live and yours) and its live descendants, and updates them with `deleted_at = now()`, `trashed_root_id = p_page_id`. Raises `P0002` when the page is missing, not yours, or already trashed. Returns the count.
- `public.restore_page(p_page_id uuid, p_top_position text) returns uuid`: sets `luna.trash_op`, requires `id = trashed_root_id = p_page_id` for your row (else `P0002`). If the root's parent is trashed, sets the root's `parent_id = null`, `position = p_top_position` (the parent trigger then runs its checks against a null parent). Then clears `deleted_at` and `trashed_root_id` on every row with `trashed_root_id = p_page_id`, in the same transaction. Returns the root's final `parent_id`. A purged parent cannot happen: purging a parent cascades to its children.
- `public.purge_trash_roots(p_root_ids uuid[], p_expired_only boolean) returns integer`: `delete from public.pages where id = any(p_root_ids) and id = trashed_root_id and owner_id = (select auth.uid())`, plus `and deleted_at < now() - interval '30 days'` when `p_expired_only`. A root restored since it was listed no longer matches, so it survives. Returns the count deleted.
- `public.expired_trash_roots() returns setof uuid`, `security invoker`, `stable`: `id` of your pages where `id = trashed_root_id and deleted_at < now() - interval '30 days'`.
- `public.subtree_storage_paths(p_root_ids uuid[]) returns setof text`, `security invoker`, `stable` (M6): recursive subtree of the roots (live or trashed descendants alike), joined to `files`.
- `public.get_shared_page(p_slug text) returns table (...)`, `security definer`, `stable`, owned by `postgres`: one row for `share_links.slug = p_slug` joined to its page where `deleted_at is null`, left joined to the cover file for `cover_storage_path`. Returns only the listed columns, never `owner_id` or ids. `execute` granted to `anon` and `authenticated`.

### Lazy purge (client, feature 8)

Once per app load, after the `(app)` layout confirms a user, a hook runs in the background: `expired_trash_roots()` → if any, `subtree_storage_paths(roots)` (from M6) → `storage.from(bucket).remove(paths)` in batches of up to 1000 → only if every batch succeeded, `purge_trash_roots(roots, true)`. Errors are logged to the console and never block or alert the user; the next load retries. Two tabs running it at once is safe: Storage removal of a missing object is a no op and the purge function only deletes rows still in the trash. Empty trash runs the same sequence with all trash roots and `p_expired_only = false`, and shows the returned count. A page restored after its files were removed but before the purge keeps its row but loses those files; this window is milliseconds and accepted.

### Security model

- **One owner per row.** Every table has RLS enabled in its first migration with four policies `to authenticated`: select and delete `using ((select auth.uid()) = owner_id)`; insert `with check ((select auth.uid()) = owner_id)`; update with both `using` and `with check` on the same expression. `favorites` insert and update also check `exists (select 1 from public.pages p where p.id = page_id)`, which runs under the pages RLS so only readable pages can be favorited.
- **Explicit, column level grants.** Each migration runs `revoke all on <table> from anon, authenticated`, then grants `select` and `delete` on the table to `authenticated`, and `insert (...)` and `update (...)` on named columns only. `pages`: insert `(id, parent_id, position, title, content, content_text)`, update `(parent_id, position, title, content, content_text)`, each later slice extending the list with its client writable columns (M7 adds `icon, cover_preset, cover_file_id` to both). `favorites`: insert `(page_id, position)`, update `(position)`. `share_links`: insert `(id, page_id, slug, description)`, update `(description)`. `files`: insert `(id, page_id, storage_path, name, mime_type, size_bytes)`, no update. No table has an `anon` policy, so `anon` gets `42501`.
- **Privileged functions.** `trash_page`, `restore_page`, and `purge_trash_roots` are `security definer` with an explicit owner filter (see Functions). `get_shared_page` is the only function callable by `anon`: fixed `search_path = ''`, schema qualified names, filters by exact slug and live page, returns no ids. This prevents listing published pages through the Data API. Slugs carry about 71 random bits, so guessing is infeasible; request rate limiting for the share route is owned by feature 13.
- **Storage.** One private bucket. Its object policies (feature 11) require the first path segment to equal `auth.uid()::text` for authenticated access. Anonymous access to a shared page's images (feature 13) must check publication through a `private` `security definer` helper keyed by the second path segment (`page_id`), never through a table policy for `anon`.
- **No secret key** anywhere in this model; the purge runs as the signed in user.
- **Data sensitivity.** Personal notes, no regulated data scope. Deleting an auth user cascades through every table (Storage objects must be removed separately; owned by the deferred account deletion feature).

### Configuration required

No new environment variables or credentials. New npm dependency: `fractional-indexing` (pinned, added in M1).

### Critical test scenarios

- Happy path: create A, create B under A, create C between two siblings, reload, tree order and nesting match, verifies **AC-2**, **AC-4**
- Isolation (one test per table, in the slice that adds it): account B selects, updates, deletes A's rows and gets 0 rows or an RLS error; `anon` select on each table gets `42501`, verifies **AC-1**
- Cycle: move A under its grandchild, expect `LN001` and an unchanged tree; two concurrent crossing moves (A under B, B under A) leave no cycle, verifies **AC-3**
- Depth: a chain of 64 levels works; a 65th level, or moving a subtree so it ends up deeper than 64, gets `LN003`, verifies **AC-2**
- Trash and restore: trash A (with B, C below, and C already trashed on its own), B and A vanish from tree, favorites, search, and share read; restore A brings back A and B only; restore C while A is trashed lands C at top level, verifies **AC-5**, **AC-6**
- Trashed parent: create or move a page under a trashed page, expect `LN002`, also when the trash runs concurrently with the insert, verifies **AC-7**
- Read only trash: saving the title or content of a trashed page gets `LN004`, verifies **AC-15**
- Protected columns: a direct `update pages set deleted_at = now()`, or an insert with `owner_id` set, gets `42501`, verifies **AC-14**
- Purge failure and race: Storage removal fails, rows remain, the next run purges them; a root restored between listing and `purge_trash_roots` survives; on success favorites, share links, files rows, and a cover file are gone without errors, verifies **AC-8**
- Limits: 501 char title, 2 MB plus one byte content, object content, plain text over 512 KB, a `position` with a space, both cover fields, each rejected with `23514`, verifies **AC-9**, **AC-12**
- Search (M5 tests the column directly: `search @@ to_tsquery('simple', ...)` and `ts_rank`): a word only in `content_text` matches; a title match ranks above a body match, verifies **AC-10**
- Public read: `anon` gets the page by slug; gets nothing after unpublish or trash; `anon` select on `share_links` and `pages` gets `42501`, verifies **AC-11**
- Migration hygiene: each slice's migration contains no `drop column`, `rename`, or `alter column ... type` on a shipped column, and the regenerated types are committed, verifies **AC-13**

## Build plan

Tracer Bullet: this spec builds nothing on its own. Each slice below ships inside the feature named, as that feature's migration, together with its regenerated types, Zod schemas, and an RLS isolation test. Each slice is applied to `luna-dev`, then `luna-prod`, then merged.

1. **M1, with feature 5 (Core writing loop)**: migration `pages` with `id, owner_id, parent_id, position, title, content, content_text, created_at, updated_at`, all checks, the unique `(id, owner_id)`, the composite parent FK, indexes, `private.set_updated_at()` and its trigger, RLS policies and column level grants; add `fractional-indexing` and a pure `positionBetween` helper (neighbour rule from Value sourcing) with Vitest tests; write `blocksToPlainText` with Vitest tests; Zod schema for a page row with `content` as a block array; the single page read and the paged tree read, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-9**, **AC-13**, **AC-14**
2. **M2, with feature 6 (Page tree & sidebar)**: migration adding `private.check_page_parent()` (owner lock, cycle check, depth cap) as a `before insert or update of parent_id` trigger; the hook maps `LN001` and `LN003` to messages, satisfies **AC-2**, **AC-3**, **AC-13**
3. **M3, with feature 8 (Trash & restore)**: migration adding `deleted_at`, `trashed_root_id`, their pairing check, the trash indexes (swap the tree index to partial), the trashed parent rule in `private.check_page_parent()`, `private.check_page_trashed()`, `trash_page`, `restore_page`, `purge_trash_roots`, `expired_trash_roots`; client lazy purge hook, empty trash, and the read only "in trash" page view, satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-13**, **AC-14**, **AC-15**
4. **M4, with feature 9 (Favorites)**: migration `favorites` with PK, index, RLS (including the readable page check), grants; the list query filters live pages, satisfies **AC-1**, **AC-5**, **AC-6**, **AC-13**
5. **M5, with feature 10 (Search)**: migration adding the generated `search` column and its GIN index (adding a stored generated column rewrites the table under a lock; deliberate and instant at this size), satisfies **AC-10**, **AC-13**
6. **M6, with feature 11 (Images & file uploads)**: migration `files` with constraints, indexes, RLS, grants, and `subtree_storage_paths`; wire it into the lazy purge and empty trash; bucket and Storage policies per feature 11's spec, satisfies **AC-1**, **AC-8**, **AC-13**
7. **M7, with feature 12 (Page icons & covers)**: migration adding `icon`, `cover_preset`, `cover_file_id`, the composite cover FK with `on delete set null (cover_file_id)`, and the cover check, satisfies **AC-9**, **AC-12**, **AC-13**
8. **M8, with feature 13 (Public share links)**: migration `share_links` with constraints, RLS, grants, and `get_shared_page`; client slug builder with Vitest tests, satisfies **AC-1**, **AC-11**, **AC-13**

## Consequences

**Positive**:
- No later feature reshapes a shipped table; every slice knows its exact columns, checks, and policies.
- The tree, trash, and limits rules live in the database, so a client bug cannot create a cycle, an orphan under a trashed parent, or an oversized row.
- Autosave stays a single row update, and the sidebar query never loads documents.
- Public sharing exposes one function, not a table policy, so published pages cannot be listed.

**Negative / tradeoffs**:
- Trash is a soft delete: every live query must filter `deleted_at is null` (the partial indexes and the share function do; new queries must remember it).
- `content_text` is trusted from the client. A client bug can make search drift from the document until the next save.
- Files are kept until their page is purged, so removed images still use storage.
- The lazy purge only runs when you open the app; trash older than 30 days lingers if you don't.
- Recursive queries (trash, cycle check, purge paths) cost more than a path column at very large trees; fine at thousands of pages, revisit beyond that.
- Fractional keys grow longer after many inserts in the same gap; harmless at this scale, but there is no rebalancing job.
- Four `security definer` functions are privileged paths; any change to them needs review against AC-11 and AC-14.
- Column level grants must be extended by every slice that adds a client writable column; forgetting it shows up as `42501` in that slice's tests.
- The 64 level depth cap and the 512 KB plain text cap (only the first 200,000 characters are searchable) are hard limits.
- Tree writes take a per owner lock, so two tabs moving pages at the same instant wait on each other briefly.

**Neutral**:
- BlockNote major upgrades may need a content migration (as spec 0001 notes); `content` is validated by Zod when loaded.
- The save conflict guard (last write wins vs an `updated_at` check) stays with feature 5; `updated_at` is ready for it.
- Each feature's spec may refine its slice (for example the bucket name, the preset list), but not the columns fixed here.

## Follow-up

- [ ] Features 5, 6, 8, 9, 10, 11, 12, 13 build their slice (M1 to M8) from this spec; each feature's own spec should reference 0002 instead of redefining tables.
- [ ] Feature 13 owns rate limiting for the share route and how anonymous image access is authorized in Storage.
- [ ] Before M7, confirm both Supabase projects run Postgres 15 or later (`on delete set null (column)` on a composite FK needs it).
- [ ] Feature 11 defines the image and file block props (`fileId`, `storagePath`) and render time URL resolution.
- [ ] Deferred account deletion must remove Storage objects before deleting the auth user (the row cascade does not reach Storage).
- [ ] Deferred page history and sharing with others: add tables additively (a `page_versions` table; a membership table plus widened RLS). The plain `favorites.page_id` FK already allows favoriting pages you don't own.
