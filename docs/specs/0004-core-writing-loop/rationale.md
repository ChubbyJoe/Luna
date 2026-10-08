# 0004. Core writing loop: rationale

Decision record for [index.md](index.md). `/develop` does not read this file.

## Context

Luna has a stack (spec 0001), a target data model (spec 0002), a design system and shell (spec 0003), and working sign in, but no page has ever been written to the database. Under Tracer Bullet, this feature is the walking skeleton: one real path through migration, RLS, client cache, editor, and save, which every later slice thickens.

Spec 0001 deliberately left four choices to this feature: the autosave timing, the guard against two tabs overwriting each other (one JSON document per page means last write wins by default), how Playwright signs in without real email, and shipping spec 0002's first `pages` migration.

Forces:
- One person, a few devices and tabs. Losing written text is the worst failure; a short wait for "Saved" is acceptable.
- Writes go straight from the browser to Postgres under RLS (spec 0001); there is no server layer to arbitrate saves.
- The stored format must survive feature 7 (the full block editor) without a data migration.
- Free tier Supabase: writes per keystroke would be wasteful but are not a cost cliff at this scale.
- No CI: the e2e and RLS tests are only as good as how easily they run locally against luna-dev.

## Options considered

### Option 1: Debounced direct autosave with an `updated_at` guard, paragraph only BlockNote

The browser saves dirty fields after 1 second idle (5 second max) with `.eq('updated_at', base)`; a conflict pauses saving and asks. BlockNote is installed now, limited to paragraphs.

**Pros**: no silent overwrite; storage format final from day one; reuses the existing `updated_at` trigger, no new column; one round trip per save.
**Cons**: a conflict notice to design and test; whole document sent on every body save; BlockNote lands in the first slice, which grows it.

### Option 2: Debounced direct autosave, last write wins

Same timing and editor, no guard.

**Pros**: the simplest save path; nothing to test for conflicts.
**Cons**: an old tab left open silently replaces newer text on its next keystroke, the exact data loss spec 0001 flagged.

### Option 3: Save through a server action or route handler

The browser posts to Next.js, which writes to Supabase and could merge or lock.

**Pros**: one place for validation and future merge logic.
**Cons**: an extra hop and a second authorization surface beside RLS, against spec 0001's write path decision; Vercel function time per keystroke batch.

### Option 4: Local first with background sync

Edits land in IndexedDB first, a sync loop pushes them.

**Pros**: survives crashes and offline; instant saves.
**Cons**: a sync engine and conflict model to own; offline editing is explicitly deferred in the scope; far beyond a walking skeleton.

## Rationale

Option 1 is the only one that meets the worst failure (losing text) without adding infrastructure. The `updated_at` column and its "only when content changes" trigger already exist in spec 0002, so optimistic concurrency (a save that only applies to the version it was based on) costs one filter and a 0 rows branch. Option 2 is cheaper only until the first time an old tab wins. Option 3 contradicts the direct write path and RLS as the single wall, and Option 4 is the deferred offline feature in disguise.

Installing BlockNote now, rather than a textarea, puts the riskiest layer (a client only editor, its JSON, its plain text derivation) on the tracer bullet where it belongs, and means feature 7 widens a schema instead of replacing the input and save path.

The smaller calls, each with its runner up:
- **Retry in memory, no local backup** (runner up: localStorage backup): the loss window is seconds while online, and a backup brings restore prompts and stale copy edge cases better owned by the deferred offline feature.
- **Inline conflict notice** (runner up: modal): the writer keeps their flow; saving pauses, typing does not.
- **Home redirect on the server** (runner up: client query then replace): no loading flash; it routes rather than displays data, so the TanStack Query rule's intent holds.
- **Sessions minted with `generateLink` codes and `verifyOtp` through `@supabase/ssr`** (runner up: driving the real form): uses the library's own cookie format, sends no email, hits no email rate limit, ships nothing in `src/`.
- **Two fixed allowlisted test accounts** (runner up: fresh users per run): stable and fast; per test page ids keep tests independent.
- **RLS tests as a Vitest `db` project** (runner up: Playwright request tests): direct `supabase-js` clients read naturally, and the suite is reused by every later table.
- **Expired session handling**: keep retrying and ask the user to sign in in another tab, because the browser client reads the session from cookies, so a fresh sign in elsewhere lets this tab's retries succeed without losing text (runner up: redirect to sign in, which would drop the unsaved text).
- **Save sessions live in a layout level registry** (runner up: a per view hook that flushes on unmount): a fire and forget flush on route change loses text whenever that save fails, and in app navigation has no leave warning; holding the session above the view keeps retrying and lets a reopened page start from unsaved text. Added after the cross check.
- **Retry only passing failures** (runner up: retry everything but `23514`): an error that will fail identically, such as invalid characters in JSON, would otherwise retry forever.
- **Too large is not retried** (runner up: retry like any failure): `23514` will fail identically until the content shrinks, so retrying only spams the database.
- **Unknown block types disable editing** (runner up: let BlockNote drop them): a paragraph only schema would otherwise erase richer content on the next save after a rollback.
- **Dirty fields only, with `content` and `content_text` always together** (runner up: send all three every time): renaming does not resend a 2 MB document, and search text can never drift from its content within a save.
