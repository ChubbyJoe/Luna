# 0004. Core writing loop: a paragraph only BlockNote page that autosaves with an updated_at guard

**Date**: 2026-10-08
**Status**: In Progress

## Summary

This is Luna's first real thread through every layer: you sign in, create a page from the sidebar, give it a title, type plain paragraphs, and it saves to the database as you type, so a reload shows the same text. The editor is BlockNote limited to paragraphs, so the stored format is already the one the full block editor (feature 7) will use. Each save only applies if nobody else saved the page since this tab last did (an `updated_at` check), so two tabs never silently overwrite each other. Failed saves keep your text in the tab and retry until they succeed, and the browser warns you before closing a tab with unsaved text.

## Requirements

**User stories**:
- As the owner, I want to create a page, title it, and write, without ever pressing save, so writing feels calm.
- As the owner, I want to reload, close, or come back later and find exactly what I wrote, so I trust Luna with my notes.
- As the owner with two tabs open, I want to be asked before one tab overwrites the other, so I never lose text silently.
- As the owner, I want my pages invisible to every other account.

**Acceptance criteria**:
- **AC-1**: Signed in, `/` redirects to `/p/<id>` of your most recently edited page (highest `updated_at`, ties by `id` ascending). With no pages, `/` shows an empty state with a New page button.
- **AC-2**: New page (in the sidebar Pages section, or the home empty state) inserts a page at the end of your top level list and then opens `/p/<id>` with the title field focused. The page appears in the sidebar list as "Untitled". If the insert fails, you stay where you are and see an error toast.
- **AC-3**: Edits to the title or body save automatically: 1 second after you stop typing, at least every 5 seconds while you keep typing (counted from the first unsaved edit since the last settled save), and right away when focus leaves the title or body, when you navigate to another route, when the tab becomes hidden, and when you sign out. The top bar status is blank when a page opens, reads "Saving…" while a save is in flight, and "Saved" once everything is saved.
- **AC-4**: After a save, a reload shows the exact title and paragraphs. `content` holds BlockNote paragraph blocks and `content_text` equals `blocksToPlainText(content)`.
- **AC-5**: The body is paragraphs only: Enter makes a new paragraph, there is no slash menu, block side menu, formatting toolbar, or inline styles, and pasted rich text arrives as plain paragraphs. An empty body shows the placeholder "Start writing".
- **AC-6**: The title is a separate field above the body, placeholder "Untitled", 500 characters at most, single line (pasted line breaks become spaces). Enter, or Down at its end, moves the caret to the start of the body; Up or Backspace at the very start of the body moves it to the end of the title. The top bar breadcrumb is the page title alone. As you type a title, the sidebar list, the breadcrumb, and the browser tab title (`"<title> · Luna"`) update at once, and a refetch never reverts them; an empty title shows "Untitled".
- **AC-7**: A save applies only if the page's `updated_at` still equals the value this tab last saw. When another tab saved first, the save changes nothing, saving pauses, the status reads "Not saved", and an inline notice above the title says "This page changed in another tab." with **Load newer** (replaces this tab's title and body with the saved version) and **Keep mine** (saves this tab's whole version, title and body, over it). You can keep typing while the notice shows. No edit is ever overwritten without one of those two clicks. A save whose response was lost but which did land never shows this notice: if the server already holds exactly what this tab sent, it counts as saved.
- **AC-8**: When a save fails for a passing reason (network error, HTTP 5xx, 408, 429, or an expired session), your edits stay in the tab, the status reads "Not saved", and the save retries after 2, 4, 8, 16, then every 30 seconds, and at once when the browser comes back online. After the third failure in a row, one toast says "Can't save right now. Your text is kept and Luna keeps trying." The next success returns the status to "Saved". Any other error is permanent: no retry, status "Not saved", one toast "Could not save this page.", and the next edit tries again.
- **AC-9**: While any edit is unsaved (pending, saving, failed, or in conflict), closing or reloading the tab triggers the browser's leave warning where the browser supports it (desktop browsers; iOS Safari does not); with everything saved, it does not. Hiding the tab starts a save at once (best effort: the browser may cancel it). Sign out first saves pending edits; if that save does not end saved, a dialog asks "You have unsaved changes. Sign out anyway?" before signing out.
- **AC-10**: Another account cannot see your pages: account B opening account A's `/p/<id>` sees "This page does not exist", and B's sidebar lists none of A's pages. At the database level, spec 0002 **AC-1** and **AC-14** hold for `pages`.
- **AC-11**: A malformed page id, or an id with no readable page, shows "This page does not exist" with a link home, and the tab title "Not found · Luna".
- **AC-12**: A save rejected for size (`23514`, over the limits in spec 0002 **AC-9**) is not retried: the status reads "Not saved", one toast says "This page is too large to save. Remove some text to keep saving.", and the next edit tries again.
- **AC-13**: Spec 0002's M1 ships with this feature: the `pages` migration, regenerated `src/types/database.ts`, and the database rules of spec 0002 **AC-2** (same owner parent), **AC-4**, **AC-9**, **AC-13**, and **AC-14**.
- **AC-14**: Navigating to another page inside Luna while edits are unsaved (pending, retrying, or too large) does not lose them: their save keeps running in the background until it lands, and reopening that page shows your latest text, not an older server copy. A page left in conflict keeps its unsaved version and shows the notice again when reopened.

## Decision

**Chosen option**: Option 1: debounced direct autosave from the browser, guarded by a conditional `updated_at` update, into a paragraph only BlockNote editor.

Each page with unsaved edits has a save session (a pure reducer plus its timers and an unsaved snapshot) held by the pending saves registry in the `(app)` layout, so it outlives the page view. The session sends dirty fields to `pages` through `supabase-js` with `.eq('updated_at', base)` and drives status, retries, and the conflict notice.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.claude/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`) · `tanstack-query-best-practices` (`deckardger/tanstack-agent-skills`, `.claude/skills/tanstack-query-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`) · `vitest` (`antfu/skills`, `.claude/skills/vitest/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.claude/skills/playwright-best-practices/`). No skill exists for BlockNote; follow its official docs for the pinned version.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Data model sketch

Spec 0002's M1, unchanged; that spec is the source of truth for every column, check, index, trigger, grant, and policy. This feature adds no columns.

| Column | Type | Null | Role in this feature |
|---|---|---|---|
| `id` | uuid PK | no | client supplied on create, the `/p/<id>` route param |
| `owner_id` | uuid FK `auth.users` | no | default `auth.uid()`, scopes everything through RLS |
| `parent_id` | uuid | yes | always null in this slice (feature 6 adds nesting) |
| `position` | text `collate "C"` | no | order of the sidebar list |
| `title` | text | no | the title field; `''` displays as "Untitled" |
| `content` | jsonb array | no | BlockNote paragraph blocks |
| `content_text` | text | no | `blocksToPlainText(content)` |
| `created_at` | timestamptz | no | default `now()` |
| `updated_at` | timestamptz | no | bumped by trigger only when `title`, `content`, or `content_text` change; the conflict guard's version and the home redirect's "last edited" |

Relationships: user 1:N pages; page 1:N child pages (unused until feature 6).

### State transitions

Each page's save session state (a pure reducer, `saveReducer`, in `src/features/pages/`). The session also holds `titleDirty`, `contentDirty`, the unsaved snapshot (`title`, `content`), the last saved snapshot, `base`, the in flight payload, and the consecutive failure count.

- `saved` → `dirty`: an edit whose value differs from the last saved snapshot (programmatic changes, such as editor mount and Load newer, run under a suppress flag and never mark dirty).
- `dirty` → `saving`: the 1 second idle timer, the 5 second max wait (started by the first edit after the last settled save), or a flush (blur, route change, tab hidden, sign out, online event).
- `saving` → `saved`: success and no edit arrived meanwhile; `saving` → `dirty`: success but edits arrived meanwhile (both timers restart from that moment).
- `saving` → `retrying`: a passing failure (status "Not saved", backoff timer set).
- `saving` → `failed`: a permanent failure, or `23514` (`too_large`, a `failed` variant with its own toast). No retry.
- `retrying` → `saving`: the backoff timer fires, or the `online` event.
- `saving` → `conflict`: 0 rows updated and the page reads back with title or content different from the in flight payload.
- `saving` → `saved`: 0 rows updated but the read back equals the in flight payload (the earlier save landed); `base` becomes the server's `updated_at`.
- `conflict` → `saved`: Load newer. `conflict` → `saving`: Keep mine (sends title, content, and content_text; base becomes the server's `updated_at`).
- `saving` → `gone`: 0 rows updated and the page no longer reads back.
- Edits in other states: in `retrying`, `conflict`, and `gone` an edit only updates the snapshot and dirty flags (the backoff timer keeps its schedule; nothing is sent in `conflict` or `gone`). In `failed`, an edit moves to `dirty` and resets the failure count.

Only one save is in flight per page at a time. Edits during a save update the snapshot and are sent after it settles. A session is dropped from the registry when it reaches `saved` and its page view is unmounted.

### API surface

All calls go through `supabase-js` from the browser as the signed in user, except the home redirect (server client). Thin routes in `src/app/(app)/`, everything else in `src/features/pages/`.

| Operation | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| Home redirect | server component `src/app/(app)/page.tsx`: `select id from pages order by updated_at desc, id asc limit 1` | session cookie | `redirect('/p/<id>')`, or the empty state | authenticated (proxy gate) | error: throw, caught by `(app)/error.tsx` |
| Page route | `src/app/(app)/p/[pageId]/page.tsx` | `pageId` param | renders `PageView` | authenticated | not a uuid: `notFound()` |
| List pages | `select id, parent_id, position, title from pages order by position, id`, ranges of 1000 until a short page; query key `['pages', 'list']` | none | rows; the sidebar shows those with `parent_id` null, each title replaced by its save session's unsaved title when one exists (so a refetch never reverts a live title) | authenticated, own rows | error: inline "Could not load pages" with a Retry button calling `refetch()` |
| Read page | `select id, title, content, updated_at from pages where id = ?` `.maybeSingle()`; key `['pages', 'detail', id]`; `staleTime: Infinity`, no refetch on focus or reconnect | `id` | the row, `content` parsed by `pageContentSchema`, `updated_at` kept as an opaque string (`z.string()`, never parsed to a date) | authenticated | null: not found; content fails Zod or holds a block type outside the editor schema: `RouteError` (its fixed copy), editing disabled |
| Open page | the page view first looks for a save session for `id` in the registry; if one exists, the editor starts from its unsaved snapshot and attaches to it, skipping the read | `id` | editor content, title, state | authenticated | none |
| Create page | `insert({ id, position }).select('id, parent_id, position, title, content, updated_at').single()`; the button is disabled while pending | `id`: uuid (req), `position`: text (req) | the row, written into both caches, then `router.push('/p/<id>')`; on mobile the drawer closes (`setOpenMobile(false)`) before navigating | authenticated | any error: `notify.error("Could not create a page. Try again.")` |
| Save page | `update(fields).eq('id', id).eq('updated_at', base).select('updated_at')`; on success, `title`, `content`, and the new `updated_at` are written into `['pages', 'detail', id]` and the title into `['pages', 'list']` | `title` (opt), `content` + `content_text` (opt, always together), `base`: the last seen `updated_at` | new `updated_at` | authenticated, own rows | 0 rows: run the conflict check; `23514`: `too_large`; passing (network error, 5xx, 408, 429, `PGRST301`, `42501`): retry; anything else: permanent |
| Conflict check | `select id, title, content, updated_at from pages where id = ?` `.maybeSingle()` | `id` | null: `gone`; a row equal (deep equal on `title` and `content`) to the in flight payload's values: `saved`; any other row: `conflict`, kept for Load newer and as Keep mine's base | authenticated | error: treated as a passing save failure |
| Sign out | existing `useSignOut`, now awaiting `flushAll()` from the pending saves registry first; it returns `{ signOut, pending, confirmOpen, confirm, cancel }` and `AccountMenu` renders the `AlertDialog` | none | navigates to `/sign-in` | authenticated | `flushAll()` false: confirm dialog |

### Value sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| Home redirect | which page opens | `pages.updated_at` desc, then `id`, read by the server client |
| Create page | `id` | `crypto.randomUUID()` in the browser |
| Create page | `position` | `positionBetween(lastTopLevel?.position ?? null, null)` (spec 0002's helper and neighbour rule), `lastTopLevel` = last `parent_id` null row of the cached list sorted by `position, id`. New page is disabled until the list has loaded |
| Create page | `owner_id`, `created_at`, `updated_at` | column defaults (spec 0002) |
| Open page | whether the title is focused | derived: focus the title when `title === ''`, else no autofocus |
| Open page | editor initial content | `content` from the read; `[]` passes no initial content (BlockNote makes one empty paragraph) |
| Save | `title` | the title field value, line breaks replaced by spaces, `maxLength` 500 |
| Save | `content` | `editor.document` at send time |
| Save | `content_text` | `blocksToPlainText(editor.document)` (spec 0002, as amended: UTF-8 byte truncation, trailing blank lines dropped) |
| Save | `base` | `updated_at` from the read, then from each successful save, then from the conflict check (Keep mine, Load newer, or a save that had landed), always the exact string the server returned |
| Save | fields sent | the session's `titleDirty` and `contentDirty`; only those fields are sent, except Keep mine, which sends all three |
| Save | in flight payload | the session records the `title` and `content` it sent, for the conflict check's "did my save land" comparison |
| Save | idle delay, max wait | constants `SAVE_IDLE_MS = 1000`, `SAVE_MAX_WAIT_MS = 5000` |
| Retry | delay | pure `retryDelayMs(attempt)`: 2000, 4000, 8000, 16000, then 30000 |
| Retry | when to toast | the reducer's consecutive failure count reaching 3, once per streak |
| Error handling | failure kind | pure `classifySaveError(error)`: `23514` → `too_large`; a fetch failure (no `code`), HTTP 5xx, 408, 429, `PGRST301`, `42501` → `passing`; anything else → `permanent`. For `PGRST301` or `42501`, also check `auth.getSession()` and, when there is no session, toast "You were signed out. Sign in again in another tab, then keep writing here." once per streak |
| Status text | blank, "Saving…", "Saved", "Not saved" | derived from the session: no session yet (page just opened) → blank; `saving` → "Saving…"; `saved` → "Saved"; `dirty` → the previous status (no flicker per keystroke); `retrying`, `failed`, `conflict`, `gone` → "Not saved" |
| Leave warning | whether to warn | derived: state is not `saved` |
| Sidebar, breadcrumb, tab title | live title | the save session's snapshot `title` (the registry), falling back to the cached row; display `title === '' ? 'Untitled' : title`; breadcrumb `[{ id, title: display, href: '/p/<id>' }]`; tab title `"<display> · Luna"` set with `document.title`, `"Not found · Luna"` on the not found view, and back to `"Luna"` when the page view unmounts |
| Gone notice | text to copy | `blocksToPlainText(editor.document)` with the title as the first line, copied by a Copy text button |
| Sign out | whether anything is unsaved | `flushAll()` on the registry: for every session not `saved`, force one save attempt now (cancelling its backoff timer); resolves true only if every session ends `saved` (a session in `conflict` or `gone` counts as false without sending) |
| Third failure toast | text | constant: "Can't save right now. Your text is kept and Luna keeps trying." |

### Key invariants

- While a save session exists for a page, its snapshot is the source of truth for that page's title and content; refetches never overwrite it. Only Load newer replaces it.
- A page view never initializes its editor from the server while a session for that page exists, so unsaved edits survive navigation and its own last save never looks like a conflict. Sessions live in React state inside the registry provider, not module state.
- One save in flight per page; every save carries the last seen `updated_at`, so no save can overwrite a version this tab has not seen.
- `updated_at` is an opaque string end to end: compared only by sending it back, never parsed or reformatted.
- `content` and `content_text` are always written together.
- The editor schema holds only `paragraph` blocks, `text` inline content, and no styles. Loaded content containing any other block type or inline content opens with editing disabled, so the narrower schema never silently drops blocks.
- Content loaded from the database is parsed by Zod before it reaches the editor.
- Nothing autosaves while the state is `conflict` or `gone`.
- The secret key is used only in `tests/`, never in `src/`.

### Components and files

- `src/features/pages/`: `schemas.ts` (page row, `pageContentSchema`), `blocks-to-plain-text.ts`, `position.ts` (`positionBetween`), `save-machine.ts` (`saveReducer`, `retryDelayMs`, `classifySaveError`, status text), `queries.ts` (keys and query options), `hooks/use-create-page.ts`, `pending-saves.tsx` (the registry provider in the `(app)` layout: one save session per page with its reducer state, snapshots, timers, and the save and conflict check calls; window listeners for `beforeunload`, `visibilitychange`, and `online`; `flushAll()`), `hooks/use-save-session.ts` (a page view attaches to or creates its session, reports edits, flushes on blur and unmount), `components/page-list.tsx` and `components/new-page-button.tsx` (sidebar Pages section), `components/page-view.tsx` (title, notice, editor, `TopBar` with breadcrumb and status), `components/title-field.tsx`, `components/page-editor.tsx` (BlockNote, loaded with `next/dynamic` and `ssr: false`), `components/conflict-notice.tsx`, `components/home-empty-state.tsx`.
- BlockNote: `@blocknote/core`, `@blocknote/react`, `@blocknote/shadcn`, pinned exact. Schema built with `BlockNoteSchema.create` from the default `paragraph` block spec and `text` inline content only, empty `styleSpecs`. `BlockNoteView` from `@blocknote/shadcn` with the slash menu, side menu, formatting toolbar, and link toolbar turned off, Luna's shadcn components passed in, and the placeholder dictionary entry set to "Start writing". Body text `text-body`, inside `PageColumn` (docs/design.md).
- Title field: a `textarea` with `field-sizing: content`, `rows={1}`, `aria-label="Page title"`, classes `text-title-sm md:text-title`.
- Shell: `AppSidebar`'s Pages section renders `PageList` (its `EmptyState` when the list is empty) and a `NewPageButton` in the section header. `useSignOut` awaits `flushAll()` and exposes the confirm state; `AccountMenu` renders the `AlertDialog` ("You have unsaved changes. Sign out anyway?").

### Security model

- Single owner data, enforced only by spec 0002's RLS and column grants on `pages`; no new policy. Personal notes, no regulated data scope.
- The browser uses the publishable key; the home redirect uses `createSupabaseServerClient` after `await connection()` (shell convention).
- Not found and not yours look identical (RLS returns 0 rows), so page ids leak nothing.
- Tests mint sessions with the luna-dev secret key, held in `.env.test.local` (already gitignored by `.env*`), loaded only by Playwright and the db Vitest suite. Never the prod key.
- Test accounts exist only in luna-dev: their emails are added to `private.allowed_emails` there by a one time SQL insert (Supabase SQL editor, or the MCP on luna-dev), never by a migration, so prod never accepts them.

### Configuration required

- `SUPABASE_SECRET_KEY`: luna-dev secret key, in `.env.test.local` only, for the e2e setup and db suite (admin user creation, code generation, cleanup).
- `E2E_EMAIL_A`, `E2E_EMAIL_B`: the two test account emails (for example `luna-e2e-a@example.com`; `generateLink` sends no email), allowlisted on luna-dev.
- Add all three, without values, to `.env.example` under a test only heading.
- New npm dependencies, pinned exact: `@blocknote/core`, `@blocknote/react`, `@blocknote/shadcn`, `fractional-indexing`.
- New script: `"test:db": "vitest run --project db"`; `npm test` excludes the db project.

### Test setup

- `tests/support/supabase-admin.ts`: `ensureTestUser(email)` (find, else `auth.admin.createUser` with `email_confirm: true`; a hook rejection throws a message naming the allowlist SQL), `deleteTestPages(userIds)`, and `mintSession(email)`: `auth.admin.generateLink({ type: 'magiclink', email })` → `properties.email_otp` → a `createServerClient` from `@supabase/ssr` with an in memory cookie jar → `auth.verifyOtp({ email, token, type: 'email' })` → the cookies it set. Env is loaded with `process.loadEnvFile`.
- Playwright: a `setup` project (`tests/e2e/auth.setup.ts`) ensures both users, deletes their pages, and writes `tests/e2e/.auth/a.json` and `b.json` (gitignored) as `storageState` with the minted cookies for `localhost`. The main project depends on `setup`; signed out specs keep no state, signed in specs use `test.use({ storageState })`. Every e2e spec imports from `tests/e2e/fixtures.ts`; the offline spec sets `expectedConsoleError` to match `Failed to load resource` and `Failed to fetch` only. Sessions are minted fresh on every run, so a run (well under the 1 hour access token life) never refreshes a token, and parallel workers never trip refresh token reuse detection.
- One time check on luna-dev before writing the setup: confirm the `before-user-created` hook rejects a non allowlisted email through `auth.admin.createUser`; if it does not fire for the admin API, note it in `src/features/pages/AGENTS.md` and keep the allowlist rows anyway.
- Writers: account A is used by all page writing e2e tests, each on its own uniquely titled page, asserting by id rather than by counts. Account B writes only in the home redirect spec, which runs serially; elsewhere B only reads.
- db suite (`tests/db/`, Vitest project `db`, environment `node`): clients for A and B via `verifyOtp` with the publishable key, plus an `anon` client; each test creates and deletes its own rows.

### Critical test scenarios

- Happy path (e2e, A): New page, title focused, type a title and two paragraphs, status goes "Saving…" then "Saved", reload, same title and paragraphs, sidebar shows the title, verifies **AC-2**, **AC-3**, **AC-4**
- Home (e2e, B, serial): edit a page, open `/`, land on `/p/<that id>`; empty state covered by a component test, verifies **AC-1**
- Paragraphs only (e2e): typing `/` opens no menu, Cmd+B adds no bold, pasting HTML with a heading and bold text gives plain paragraphs, verifies **AC-5**
- Title (e2e): Enter moves to the body, Backspace at body start returns, pasted newline becomes a space, sidebar and breadcrumb and `document.title` follow each keystroke, verifies **AC-6**
- Conflict (e2e, two pages in one context): both open the page, tab 1 saves, tab 2 edits, notice appears and nothing is overwritten; Load newer shows tab 1's text; repeat with Keep mine and reload shows tab 2's text, verifies **AC-7**
- Offline (e2e): `context.setOffline(true)`, type, status "Not saved", toast after the third failure, go online, status "Saved", reload shows the text, verifies **AC-8**
- Navigate away unsaved (e2e): go offline, edit page X, open page Y from the sidebar, go online, reopen X: it shows the edit, and a reload shows it too, verifies **AC-14**
- Lost response (Vitest on the reducer, plus db suite): a save that landed but is retried with the old `base` reads back equal to its payload and ends `saved`, no notice, verifies **AC-7**
- Permanent error (Vitest): an unknown SQLSTATE goes to `failed` with no retry timer; the next edit sends again, verifies **AC-8**
- Leave warning and sign out (e2e): with an unsaved edit a `beforeunload` dialog fires; offline sign out shows the confirm dialog, verifies **AC-9**
- Isolation (e2e and db): B opens A's page URL and sees not found, B's sidebar lacks A's titles; db suite: B gets 0 rows on select, update, delete of A's page, `anon` gets `42501`, an insert setting `owner_id` or an update of `updated_at` gets `42501`, verifies **AC-10**, **AC-13**
- Not found (e2e): `/p/not-a-uuid` and a random uuid both show "This page does not exist", verifies **AC-11**
- Too large (Vitest on the reducer and classifier, plus db suite for `23514` on a 2 MB plus one byte content), verifies **AC-12**, **AC-13**
- Database rules (db suite): parent of another owner gets `23503`; 501 character title, non array content, bad `position` get `23514`; a save with a stale `updated_at` updates 0 rows; a save, a read back, then a save using the read's `updated_at` string updates 1 row (precision round trip); `updated_at` moves on a title change and not on a `position` change, verifies **AC-7**, **AC-13**
- Units (Vitest): `blocksToPlainText`, `positionBetween`, `saveReducer` transitions, `retryDelayMs`, `classifySaveError`, title sanitizing, `pageContentSchema` and the unknown block type guard, verifies **AC-3**, **AC-4**, **AC-5**, **AC-8**, **AC-12**

## Build plan

Tracer Bullet: M1 stands up the whole thread (database, auth in tests, sidebar, page route, editor, save, reload) as thinly as possible; M2 to M4 thicken one strand each. Apply the migration to luna-dev, then luna-prod, then merge.

1. **M1, the thin thread**
   1. One time on luna-dev: add `E2E_EMAIL_A` and `E2E_EMAIL_B` to `private.allowed_emails`; fill `.env.test.local`; update `.env.example`, satisfies **AC-10**
   2. Migration for spec 0002 M1 (table, checks, unique `(id, owner_id)`, composite parent FK, indexes, `private.set_updated_at()` and trigger, RLS, column grants); `npm run db:types`, satisfies **AC-13**
   3. Add `fractional-indexing`; `positionBetween`, `blocksToPlainText`, `pageContentSchema` and the page row schema, with Vitest tests, satisfies **AC-4**, **AC-13**
   4. `tests/support/supabase-admin.ts`, the Playwright `setup` project and storage states, the Vitest `db` project and `test:db` script; db suite for isolation, protected columns, limits, and the `updated_at` trigger, satisfies **AC-10**, **AC-13**
   5. Query keys and options; sidebar `PageList` and `NewPageButton` with `useCreatePage`; home redirect and `HomeEmptyState`, satisfies **AC-1**, **AC-2**
   6. `/p/[pageId]` route, `PageView` with `TopBar` breadcrumb, plain title field, paragraph only `PageEditor` (BlockNote installed, `ssr: false`), not found handling, satisfies **AC-5**, **AC-11**
   7. A first save session in the registry: 1 second debounce, conditional update with `base`, full cache write on success, status blank, "Saving…", and "Saved"; e2e happy path, home, isolation, not found, satisfies **AC-3**, **AC-4**, **AC-10**, **AC-11**
2. **M2, save robustness**: `saveReducer` in full with Vitest tests (every transition above, including edits in each state); 5 second max wait; flushes on blur, unmount, `visibilitychange`, and `online`; one save in flight; sessions that outlive the page view and the editor starting from a session's snapshot; `retryDelayMs`, `classifySaveError` (passing, permanent, too large), the third failure, session, permanent, and too large toasts; `beforeunload`; `flushAll()` in `useSignOut` and the confirm dialog in `AccountMenu`; e2e offline, navigate away unsaved, and leave warning, satisfies **AC-3**, **AC-8**, **AC-9**, **AC-12**, **AC-14**
3. **M3, conflict guard**: the 0 rows path, conflict check with the "did my save land" comparison, `conflict` and `gone` states, `ConflictNotice` with Load newer (under the suppress flag) and Keep mine (all fields), the gone notice with Copy text, the conflict notice reshown when a page reopens in conflict; e2e two tab conflict, satisfies **AC-7**, **AC-14**
4. **M4, writing feel**: title keyboard moves between title and body, newline sanitizing on paste, live title in the list and detail caches, breadcrumb, and `document.title`; title autofocus on empty titles; "Start writing" placeholder; the unknown block type guard; e2e paragraphs only and title, satisfies **AC-5**, **AC-6**

## Consequences

**Positive**:
- Every layer is now proven once: migration, RLS, test sign in, TanStack Query, BlockNote, autosave. Later features thicken this path instead of inventing one.
- Stored content is BlockNote JSON from the first save, so feature 7 widens the schema without migrating data.
- No silent overwrite between tabs, and no lost text on a flaky connection while the tab stays open.
- The save logic is a pure reducer plus pure helpers, so most of it is covered by fast unit tests.

**Negative / tradeoffs**:
- Text typed and never saved is lost if the tab or browser crashes (no local backup); the loss window is at most about 5 seconds, longer only while offline.
- Load newer drops this tab's unsaved edits by design; the notice is the only guard.
- Every save of the body sends the whole document (up to 2 MB) and its plain text; fine at this scale, wasteful for very long pages.
- `content_text` is computed in the browser and trusted (spec 0002 accepts this).
- The home redirect is a small server read, an exception to "signed in reads go through TanStack Query".
- Once feature 8 ships, the home redirect and the list must filter `deleted_at is null`, and saving a trashed page returns `LN004`; feature 8 must extend `classifySaveError` and both queries.
- Tests depend on luna-dev being reachable and on one time allowlist rows there.
- The registry holds save sessions above the page view, which is more machinery than a per view hook, and it makes the shell's sign out depend on a pages context; keep its interface small and typed.
- Flushing on tab hide is best effort and iOS Safari has no leave warning, so the crash window above also applies there.

**Neutral**:
- BlockNote's API changes between versions; the exact calls here (schema creation, view props, dictionary) are checked against the docs for the pinned version at build time.
- An empty page you abandon stays as "Untitled" until trash exists (feature 8).
- `parent_id` is always null for now; the list query already reads it for feature 6.

## Follow-up

- [ ] Feature 6 (page tree) reuses `['pages', 'list']`, `positionBetween`, and `NewPageButton`, and turns `PageList` into the tree.
- [ ] Feature 7 (block editor) widens the editor schema and turns the slash menu, side menu, and toolbar back on; the unknown block type guard then covers the wider schema.
- [ ] Feature 8 (trash) adds `deleted_at is null` to the home redirect and list, and maps `LN004` in `classifySaveError`.
- [ ] Deferred offline editing would replace in memory retry with a local store.
- [ ] Record the test sign in setup and the `test:db` suite in root `AGENTS.md` `## Commands` and a nested `src/features/pages/AGENTS.md` once built (left to `/sync`).
- [x] Spec 0002's `blocksToPlainText` rule amended alongside this spec: truncate by UTF-8 bytes (500,000) instead of characters, and drop trailing blank lines, so non Latin text never trips the 512 KB `content_text` check and BlockNote's trailing empty paragraph adds no stray newline.
- [ ] Spec 0001 follow-ups owned here (debounce, conflict guard, Playwright sign in, first `pages` migration) are decided by this spec.
