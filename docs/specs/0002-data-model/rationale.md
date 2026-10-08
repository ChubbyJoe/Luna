# 0002. Data model: rationale

Decision record for [index.md](index.md). `/develop` does not need this file.

## Context

Luna is a single person's notes app on Supabase Postgres, where the browser writes directly to the database and row level security is the only authorization layer (spec 0001). Every rule the data must obey (who owns a row, what tree shapes are legal, what a visitor may read) therefore has to live in the database, not in app code.

Spec 0001 already settled that a page's content is one BlockNote JSON document plus a derived plain text column. What remained open was everything around it: how pages nest and keep their order, how a deleted subtree goes to a trash and comes back, where favorites, icons, covers, files, and share links attach, and how an anonymous visitor reads one published page. Eight later features (writing loop, tree, trash, favorites, search, uploads, icons and covers, sharing) each touch this shape.

The scope asks that the model support all of them "without a breaking migration later". Migrations are applied by hand to two cloud projects with no CI, so a breaking change (renaming or retyping a column that holds real notes) is costly and risky. At the same time the build approach is Tracer Bullet: thin slices that each ship end to end, which argues against landing tables nobody uses yet.

Scale is small: one owner (plus a few allowlisted friends), thousands of pages at most, the Supabase free tier (500 MB database, 1 GB storage), and no backups yet on prod.

## Options considered

### Option 1: Relational page tree plus side tables, shipped additively (chosen)

`pages` holds tree position and the document; favorites, share links, and files are separate tables. The target is fixed now; each feature ships its own slice.

**Pros**:
- Each concern has its own table and its own RLS policy, so a public facing table (share links) never widens access to private ones.
- Additive slices fit Tracer Bullet and still guarantee no breaking change.

**Cons**:
- More tables and joins than strictly needed for one user.
- The spec must be followed slice by slice; a feature that ignores it can drift.

### Option 2: Everything on the pages row

Favorites, share slug, description, and publish time as nullable columns on `pages`; files tracked only by Storage path.

**Pros**:
- Fewest tables; every page read has everything.

**Cons**:
- Favorites become tied to the page owner forever, which breaks if sharing with others ever arrives.
- An anonymous read path sits on the same table as private notes, and cleanup of files depends on listing Storage prefixes.

### Option 3: Blocks as rows

Each block is a row (`blocks(page_id, parent_block_id, position, type, props)`), the way Notion stores data.

**Pros**:
- Block level queries, links between blocks, and finer grained sync become possible.

**Cons**:
- Contradicts spec 0001: BlockNote saves a whole document, so every autosave would turn into a diff and many row writes.
- Far more moving parts for one person's notes.

### Option 4: One full migration now

Same target as Option 1, all tables in a single migration before any feature uses them.

**Pros**:
- Later features write only app code.

**Cons**:
- Schema lands in prod untested by real use, and any mistake found later is already a breaking change against live data.

## Rationale

Option 1 is the only one that keeps both promises the scope makes: no breaking migration later (the whole target is fixed now, and slices only add) and Tracer Bullet delivery (each table arrives with the feature that exercises it). Because RLS is the only wall, splitting public facing data (share links) and per user data (favorites) into their own tables keeps each policy small and easy to test, which matters more here than saving a join. Option 3 fights the editor's native format, and Option 4 trades a little later work for untested schema in prod.

The smaller calls, with the runner up for each:

| Choice | Picked | Why | Runner up |
|---|---|---|---|
| Nesting | `parent_id` adjacency list | Moves are one update; recursive queries are fast at thousands of pages | `ltree` path (cheap subtree reads, but a move rewrites every descendant) |
| Sibling order | Fractional index text key, `collate "C"` | A reorder writes one row; byte collation matches JS compare | Integer positions (renumbering, collisions) |
| Favorites | Separate table | Stays per user if sharing ever arrives | Column on pages |
| Share links | Separate table, one per page | Public data kept apart from private rows | Columns on pages |
| Share scope | That one page only | Hard to leak a sub page by accident | Page plus descendants |
| Public read | One `security definer` function | No anon table policy, so no listing | Anon RLS policy (allows enumerating every published page) |
| Trash marking | Stamp the whole subtree with `trashed_root_id` | Live queries just filter `deleted_at is null`; restore is one predicate | Mark root only (every live query walks ancestors) |
| Restore with trashed parent | To top level at a client given position | Never resurrects pages you trashed on purpose | Restore ancestors too |
| Trash retention | Auto purge after 30 days | Your pick | Keep until emptied |
| Purge runner | Lazy, from the client on app open | No secret key, no new job; Supabase blocks deleting Storage objects with SQL, so a client or server API call is needed anyway | Daily Vercel cron with the service role key |
| Content location | Columns on `pages` | Autosave is one row update; large jsonb is stored out of line, so tree reads stay light | Separate `page_contents` table |
| Plain text | Client computes on save | The editor already holds the blocks; no BlockNote format knowledge in SQL | PL/pgSQL trigger |
| Search config | `simple` | Works for any language; prefix matching covers most stemming needs | `english` |
| Files | `files` table plus Storage | Purge knows exactly what to delete; covers get a real FK | Storage path convention only |
| Orphan files | Kept until the page is purged | Undo and paste back keep working | Sweep unreferenced files on save |
| Icon | Emoji only | Matches scope; no file loads in the sidebar | Emoji or uploaded image |
| Cover | `cover_file_id` or `cover_preset`, never both | FK keeps the file link honest; DB enforces the rule | One jsonb column |
| Share slug | Title slug plus 12 base62 chars | Readable and about 71 bits unguessable | Random only |
| IDs | uuid, client may supply | Optimistic creates keep their real id | Server only uuid |
| Profiles | None yet | Nothing in scope needs per user settings | A profiles table now |
| Limits | Title 500 chars, content 2 MB, plain text 512 KB (first 200,000 chars indexed), icon 32 chars, depth 64 levels | Guards the free tier database against bugs, stays under Postgres's 1 MB tsvector limit and stack depth, without touching real writing | 512 KB content |
| Client write surface | Column level grants; trash columns written only by owner scoped `security definer` functions | RLS alone allows any column change on your own row, so a client bug could leave live children under a trashed parent | Invoker functions plus a trigger that rejects trash column changes without a session flag |
| Purge safety | `purge_trash_roots` deletes only rows still in the trash (and still expired) | A restore in another tab between listing and deleting must win | Client `delete ... where id = any(...)` |
| Concurrency | Per owner advisory lock in the tree trigger and `trash_page` | Two tabs could otherwise both pass the cycle or trashed parent check on stale reads | `select ... for share` on the parent row (does not cover crossing moves) |
| Same owner rule | Composite FKs on `(id, owner_id)` | The database, not RLS alone, guarantees a child, file, or share link matches its page's owner | RLS `with check` subqueries only |
| Cover file belongs to page | Composite FK `(cover_file_id, id)` → `files(id, page_id)` with `on delete set null (cover_file_id)` | Enforced by the database; deleting the file clears only the cover column | Trigger check |

The scope listed "users" as an entity; Supabase `auth.users` already plays that role, and a `profiles` table can be added later without changing anything here. The usual advice against soft deletes does not apply cleanly here, because the trash is a user facing feature with restore; its query cost is contained by partial indexes and by stamping whole subtrees so no query has to walk ancestors.
