# Verify: Core writing loop · spec 0004 · updated 2026-10-08
_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Run against `npm run dev` (luna-dev). Account A and account B are the two test accounts in `.env.test.local`; any two allowlisted accounts work for the manual steps.

## UI / manual
- [x] Signed in with pages, open `/` → you land on `/p/<id>` of the page you edited last → AC-1
- [x] Edit an older page, open `/` again → you now land on that older page (the redirect follows `updated_at`, ties by `id`) → AC-1
- [x] Signed in with no pages, open `/` → "No pages yet" with a New page button → AC-1
- [x] Click the "+" (New page) in the sidebar → `/p/<new id>` opens, the title field has the caret, the sidebar shows "Untitled" at the end of the list → AC-2
- [x] With the network blocked for `rest/v1/pages`, click New page → you stay where you are and see "Could not create a page. Try again." → AC-2
- [x] Open a page: the top bar status is blank. Type a title → "Saving…" then "Saved" about 1 second after you stop → AC-3
- [x] Type without pausing for more than 5 seconds → a save still goes out at least every 5 seconds (watch the network panel) → AC-3
- [x] Type, then at once click outside the title or body, switch to another tab, or open another page → the save goes out right away → AC-3
- [x] Write a title and two paragraphs, wait for "Saved", reload → the same title and both paragraphs → AC-4
- [x] In the database, that row's `content` holds paragraph blocks and `content_text` is the two paragraphs joined by a line break, with no trailing blank line → AC-4
- [x] In the body: Enter makes a new paragraph; typing `/` opens no menu; there is no side menu or toolbar on hover or selection; Cmd+B (Ctrl+B) adds no bold → AC-5
- [x] Paste rich text (a heading and bold words copied from a web page) → it arrives as plain paragraphs, one per line → AC-5
- [x] Type a URL in the body → it stays plain text, never a link → AC-5
- [x] An empty body shows "Start writing" → AC-5
- [x] Title: placeholder "Untitled"; it stops at 500 characters; a pasted line break becomes a space → AC-6
- [x] Enter, or Down at the end of the title, puts the caret at the start of the body; Up or Backspace at the very start of the body puts it at the end of the title → AC-6
- [x] As you type a title, the sidebar row, the breadcrumb, and the tab title (`"<title> · Luna"`) change on every keystroke, even with saves failing; clearing the title shows "Untitled" in all three → AC-6
- [x] Open the same page in two tabs. Save a title change in tab 1, then type in tab 2 → tab 2 shows "This page changed in another tab." with Load newer and Keep mine, status "Not saved", and you can keep typing → AC-7
- [x] Load newer → tab 2 shows tab 1's version and "Saved" → AC-7
- [x] Repeat, then Keep mine → after "Saved", a reload shows tab 2's whole version (title and body) → AC-7
- [x] Go offline, type → status "Not saved"; after the third failed try one toast: "Can't save right now. Your text is kept and Luna keeps trying." Go back online → "Saved", and a reload shows the text → AC-8
- [x] With an unsaved edit (offline), reload or close the tab → the browser's leave warning appears; with everything saved it does not → AC-9
- [x] Offline with an unsaved edit, Sign out → "You have unsaved changes. Sign out anyway?"; Keep writing keeps you signed in; Sign out signs you out → AC-9
- [x] As account B, open account A's `/p/<id>` → "This page does not exist"; B's sidebar lists none of A's pages → AC-10
- [x] Open `/p/not-a-uuid` and `/p/<random uuid>` → "This page does not exist", a "Go to your pages" link, tab title "Not found · Luna" → AC-11
- [x] Paste over 2 MB of text into the body → no retries, status "Not saved", one toast "This page is too large to save. Remove some text to keep saving."; delete text and keep typing → it saves again → AC-12
- [x] Block saves, edit page X, open page Y from the sidebar, unblock, reopen X → your edit is there and ends "Saved"; a reload shows it → AC-14
- [x] Leave a page in conflict, open another page, come back → the conflict notice shows again with your unsaved version → AC-14

## Value sourcing
- [x] Home redirect target: edit two pages in turn and check `/` follows the latest `updated_at`; reorder (change `position` only) and check it does not move the redirect → Value sourcing: home redirect
- [x] Create page `id` and `position`: create three pages in a row and check each new `position` sorts after the previous one (`order by position, id` in the database) → Value sourcing: create page
- [x] `owner_id`, `created_at`, `updated_at` on create come from column defaults, not the request body (check the POST payload holds only `id` and `position`) → Value sourcing: create page
- [x] Title autofocus: a page with an empty title opens with the caret in the title; a titled page opens with no autofocus → Value sourcing: open page
- [x] Initial body: a page saved with `content = []` opens with one empty paragraph and the placeholder → Value sourcing: open page
- [x] Saved `title`: pasted line breaks are spaces, at most 500 characters → Value sourcing: save title
- [x] Saved `content_text`: matches `blocksToPlainText(content)`; with 200,000 CJK characters it stays under 500,000 bytes → Value sourcing: save content_text
- [x] `base`: every save request carries `updated_at=eq.<the exact string from the last read or save>` (network panel) → Value sourcing: save base
- [x] Fields sent: a title only edit sends only `title`; a body edit sends `content` and `content_text` together; Keep mine sends all three → Value sourcing: fields sent
- [x] Status text: blank on open, "Saving…" in flight, "Saved" after, stays put while typing between saves, "Not saved" when retrying, failed, in conflict, or gone → Value sourcing: status text
- [x] Retry delays: offline, the save requests go out about 2, 4, 8, 16, then every 30 seconds → Value sourcing: retry delay
- [x] Failure kind: offline is retried; a forced `23514` is not retried and shows the too large toast; any other error shows "Could not save this page." once → Value sourcing: failure kind
- [x] Signed out failure: sign out in another tab, then edit here → one toast "You were signed out. Sign in again in another tab, then keep writing here." → Value sourcing: failure kind
- [x] Gone notice: delete the row in the database, then edit → "This page no longer exists…" with Copy text, which copies the title then the body → Value sourcing: gone notice

## Commands
- [x] `npm run lint && npm run typecheck` → no errors → all
- [x] `npm test` → unit suite passes (`save-machine`, `blocks-to-plain-text`, `position`, `schemas`, `title`) → AC-3, AC-4, AC-5, AC-7, AC-8, AC-12
- [x] `npm run test:db` → db suite passes against luna-dev (isolation, `anon` denied, protected columns, limits, `updated_at` guard and trigger) → AC-7, AC-10, AC-12, AC-13
- [x] `npm run test:e2e` → all specs pass, including `writing`, `saving`, `conflict`, `editor` → AC-1 to AC-11, AC-14
- [x] `npx supabase migration list --linked` → `20261008091629_pages_core` applied on luna-dev; on luna-prod too before merge → AC-13
- [x] `src/types/database.ts` contains `pages` and is committed → AC-13

## Acceptance-criteria coverage
- AC-1 … manual 1 to 3, `writing.spec` home · AC-2 … manual 4 and 5, `writing.spec` · AC-3 … manual 6 to 8, `save-machine.test`, `writing.spec` · AC-4 … manual 9 and 10, `writing.spec`, `blocks-to-plain-text.test` · AC-5 … manual 11 to 14, `editor.spec` · AC-6 … manual 15 to 17, `editor.spec` · AC-7 … manual 18 to 20, `conflict.spec`, `save-machine.test`, db suite · AC-8 … manual 21, `saving.spec`, `save-machine.test` · AC-9 … manual 22 and 23, `saving.spec` · AC-10 … manual 24, `writing.spec`, db suite · AC-11 … manual 25, `writing.spec` · AC-12 … manual 26, `save-machine.test`, db suite · AC-13 … commands, db suite · AC-14 … manual 27 and 28, `saving.spec`, `conflict.spec`
