# Scope: Luna

Luna is a simpler Notion for one person: nested pages, a calm block editor, and quick search, in a web app with a cleaner, less cluttered interface. It keeps Notion's core ideas (pages inside pages, blocks, a slash menu) and drops the clutter.

**Build approach:** Tracer Bullet (prove one real path through every layer first, then thicken it one strand at a time).
**Workflow:** Alpha (after `/develop`, run `/check verify` on the real app). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· Beta`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | done |
| 2 | Coding standards & tooling | Foundation | done |
| 3 | Data model | Foundation | in-progress |
| 4 | Design system & UI foundation | Foundation | done |
| 5 | Core writing loop | Slice 1 | done |
| 6 | Page tree & sidebar | Slice 2 | in-progress |
| 7 | Block editor | Slice 3 | planned |
| 8 | Trash & restore | Slice 4 | planned |
| 9 | Favorites | Slice 4 | planned |
| 10 | Search | Slice 5 | planned |
| 11 | Images & file uploads | Slice 6 | planned |
| 12 | Page icons & covers | Slice 6 | planned |
| 13 | Public share links | Slice 7 | planned |
| 14 | Landing page | Slice 7 | planned |
| 15 | Error monitoring | Slice 8 | planned |

## Foundations

### 1. Stack & architecture · Beta · done
Decide the web stack (front end, back end, database, auth, hosting) and scaffold a runnable project so every later slice builds on real structure.
**Done when:** the stack is recorded in a spec, and the empty scaffold boots locally and passes its build.
spec [0001](../specs/0001-luna-stack-architecture/index.md) · code in `src/`, `supabase/`
- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop stack & architecture`

### 2. Coding standards & tooling · done
Capture conventions from the real scaffolded project, then install lint, format, type checks, and pre commit hooks.
**Done when:** root `AGENTS.md` reflects the real stack, and lint, format, and pre commit run clean.
code in `package.json`, `eslint.config.mjs`, `.prettierrc.json`, `.husky/`
- [x] Capture conventions + tooling choices: `/audit`
- [x] Install the chosen tooling: `/develop tooling`

### 3. Data model · in-progress
The shapes everything rests on: users, pages (with parent and order for nesting), blocks and their content, soft delete, favorites, icons and covers, uploaded files, share links.
**Done when:** the model supports nesting, block ordering, trash, favorites, uploads, and share links without a breaking migration later.
spec [0002](../specs/0002-data-model/index.md)
- [x] Design it (spec): `/architect data model`
- [ ] Build it in slices: each feature's `/develop` ships its migration from spec 0002's `## Build plan` (no standalone build)
  - [ ] M1 pages core + M2 tree rules, with features 5 and 6 (AC-1 to AC-4, AC-9, AC-13, AC-14)
  - [ ] M3 trash + M4 favorites, with features 8 and 9 (AC-5 to AC-8, AC-15)
  - [ ] M5 search + M6 files + M7 icons and covers, with features 10 to 12 (AC-10, AC-12)
  - [ ] M8 share links, with feature 13 (AC-11)
- [ ] Verify it: `/check verify data model`

### 4. Design system & UI foundation · done
The calm, uncluttered look that makes Luna "Notion, but easier": type, color, spacing, layout shell (sidebar plus page), base components, keyboard focus.
**Done when:** `design.md` covers type, color, spacing, and components, and base components work fully by keyboard with good contrast.
spec [0003](../specs/0003-design-system-ui-foundation/index.md) · code in `src/app/globals.css`, `src/features/shell/`, `src/features/design-system/`, `docs/design.md`
- [x] Design it (spec): `/architect design system & UI foundation`
- [x] Build it: `/develop design system & UI foundation`
  - [x] M1 token thread: warm paper tokens, Inter, next-themes, `/dev/ui`, axe and contrast tests in both themes (AC-2, AC-3, AC-8, AC-14, AC-15)
  - [x] M2 shell: sidebar, top bar, account menu, mobile drawer, `(app)` layout, `/dev/ui/shell` (AC-3 to AC-6)
  - [x] M3 components and states: overlays, toasts, error and not found pages, sign in restyle (AC-7, AC-9, AC-10, AC-12, AC-13)
  - [x] M4 guardrails and docs: color lint rule, keyboard and motion e2e, `docs/design.md` (AC-1, AC-7, AC-9, AC-11)
- [x] Verify it: `/check verify design system & UI foundation`

## Slice 1: Core writing loop

### 5. Core writing loop · Beta · done
The thinnest real thread: sign in, create a page, give it a title, type plain text paragraphs, and it saves to the server as you type. Reload and it is still there. This slice is the walking skeleton.
**Done when:** you can sign in, create a page, type into it, reload, and see your text; another account cannot see your pages.
spec [0004](../specs/0004-core-writing-loop/index.md) · code in `src/features/pages/`, `src/app/(app)/`, `supabase/migrations/`, `tests/`
- [x] Design it (spec): `/architect core writing loop`
- [x] Build it: `/develop core writing loop`
  - [x] M1 thin thread: spec 0002 M1 migration and types, test sign in setup and RLS db suite, sidebar list and New page, home redirect, `/p/<id>` with title and paragraph only BlockNote, first debounced save (AC-1 to AC-5, AC-10, AC-11, AC-13)
  - [x] M2 save robustness: full save sessions in the registry, max wait and flushes, retries and toasts, leave warning, sign out flush (AC-3, AC-8, AC-9, AC-12, AC-14)
  - [x] M3 conflict guard: `updated_at` conflict check, Load newer and Keep mine notice, gone state (AC-7, AC-14)
  - [x] M4 writing feel: title keyboard moves, live title everywhere, autofocus, placeholder, unknown block guard (AC-5, AC-6)
- [x] Verify it: `/check verify core writing loop`
- [x] Test it: `/test core writing loop`

## Slice 2: Page tree

### 6. Page tree & sidebar · in-progress
Pages inside pages, shown as a collapsible tree in the sidebar. Create a sub page, rename, move a page under another, reorder.
**Done when:** you can nest pages to any depth, move and reorder them in the sidebar, and the tree survives a reload.
spec [0005](../specs/0005-page-tree-sidebar/index.md)
- [x] Design it (spec): `/architect page tree & sidebar`
- [ ] Build it: `/develop page tree & sidebar`
  - [ ] M1 nest and see the tree: spec 0002 M2 trigger and db tests, tree helpers, expand state per account, recursive sidebar rows with + to add a sub page, reveal, breadcrumb path (AC-1 to AC-5, AC-11)
  - [ ] M2 move with the dialog: placement helpers, optimistic move mutation with rollback, … menu and Move to command dialog, live region, focus refetch, mobile and two tab e2e (AC-8 to AC-10, AC-12 to AC-14)
  - [ ] M3 drag and drop: Pragmatic drag and drop with before, inside, after zones, end zone, hover expand, auto scroll, invalid targets, drag e2e (AC-6 to AC-8, AC-12)
- [ ] Verify it: `/check verify page tree & sidebar`

## Slice 3: Block editor

### 7. Block editor · needs a decision
Turn the plain text page into a real block editor: text, headings, bulleted and numbered lists, todos, quotes, code, dividers, with a `/` slash menu and drag to reorder blocks.
**Done when:** every core block type can be inserted from the slash menu, edited, reordered by drag or keyboard, and saved; markdown shortcuts work for headings and lists.
- [ ] Design it (spec): `/architect block editor`

## Slice 4: Organizing

### 8. Trash & restore
Deleting a page (and its sub pages) moves it to a trash you can restore from or empty.
**Done when:** a deleted page leaves the tree, shows in trash, and restores to its old place with its children; emptying trash removes it for good.
- [ ] Build it: `/develop trash & restore`

### 9. Favorites
Pin pages to a Favorites section at the top of the sidebar.
**Done when:** you can favorite and unfavorite any page, and favorites stay pinned in order across reloads.
- [ ] Build it: `/develop favorites`

## Slice 5: Search

### 10. Search · needs a decision
Find any page by title or content from a quick search box (keyboard shortcut to open).
**Done when:** typing a word finds matching pages by title and body within a moment, results open the page, and trashed pages are left out.
- [ ] Design it (spec): `/architect search`

## Slice 6: Media

### 11. Images & file uploads · needs a decision
Drop or paste images and files into a page as blocks; they are stored and served privately.
**Done when:** you can add an image or file block by drop, paste, or slash menu, it shows after reload, and nobody else can open its link unless the page is shared.
- [ ] Design it (spec): `/architect images & file uploads`

### 12. Page icons & covers
An emoji icon and a cover image per page, shown on the page and in the sidebar.
**Done when:** you can set, change, and remove a page's icon and cover, and the icon shows in the sidebar tree.
- [ ] Build it: `/develop page icons & covers`

## Slice 7: Sharing

### 13. Public share links · needs a decision · Beta
Publish a page as a read only link anyone can open, with a title, description, and social card. Unpublish anytime.
**Done when:** a published page opens read only for anyone with the link (with its images), an unpublished page or any private page returns not found, and shared pages carry basic SEO metadata.
- [ ] Design it (spec): `/architect public share links`

### 14. Landing page
A simple public page explaining Luna with a sign in button, with basic SEO metadata.
**Done when:** the landing page loads fast, has a title, description, and social card, and links to sign in.
- [ ] Build it: `/develop landing page`

## Slice 8: Reliability

### 15. Error monitoring · needs a decision
Know when something breaks, in the browser or on the server.
**Done when:** an uncaught error on either side shows up in a monitoring dashboard with enough context to debug it, and no page content is sent along.
- [ ] Design it (spec): `/architect error monitoring`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Page history**: see and restore earlier versions of a page · needs a decision
- **Rich blocks**: toggles, callouts, tables, embeds, links to other pages · needs a decision
- **Legal & account**: privacy policy, terms, account deletion, data export (when others sign up)
- **Product analytics**: signups and usage events · needs a decision
- **Offline editing**: keep writing without a connection · needs a decision
- **Mobile and desktop apps**: native apps beyond the web · needs a decision
- **Sharing with others**: invite people to view or edit, teams · needs a decision
- **Billing**: a paid plan, if Luna ever charges · needs a decision · GA

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow-up enrolled |
| `in-progress` (building) | `/develop` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier's last stage (`Prototype` → after `/develop`; `Alpha` → after `/check verify`; `Beta`/`GA` → after `/test`) is the suggested point to call it done; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag = inherits it.
- **Workflow tier tag** beside a heading (e.g. `· Beta`, `· Prototype`) sets that one feature's rigor above or below the project default; no tag inherits the default. It decides the feature's check boxes and each skill's next suggestion.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Prototype** = nothing (trust develop's own build time self check); **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`. A feature built on an unratified decision (an `Assumed` spec) stays flagged, but that never blocks `done`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
