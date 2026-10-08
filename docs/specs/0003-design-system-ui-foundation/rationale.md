# 0003. Rationale: Luna design system and UI foundation

Decision record for [index.md](index.md). `/develop` builds from `index.md`; this file explains why.

## Context

Luna's whole promise is "Notion, but easier": calmer, less cluttered. That promise lives almost entirely in the interface, yet today the app has no look of its own. `src/app/globals.css` still holds the untouched shadcn neutral defaults (pure grays, a blue sidebar accent in dark mode, a 10px radius), the font is Geist from the scaffold, and each route lays itself out ad hoc (the home page and sign in page each center their own `main`). There is no dark mode switch, no shell, and no written reference.

Every later slice builds UI: the writing loop, the page tree in the sidebar, the block editor, trash, favorites, search, media, and share pages. Without a shared foundation, each would invent its own spacing, colors, and states, and the calm look would drift one feature at a time. The editor matters most. BlockNote's shadcn flavor renders with the app's shadcn components and CSS variables, so whatever tokens exist when feature 5 lands become the editor's look too.

The forces are: one person building with AI help (so the system must be written down where agents read it, and enforced by tools rather than memory); Vercel Hobby and a small stack (so no new services, and few dependencies); real accessibility (WCAG 2.2 AA contrast and full keyboard use, both in light and dark); and a phone that should be usable, not perfect. The shell also has to hold a block editor where Cmd+B already means bold.

Not deciding now pushes these choices into feature 5, the walking skeleton, which already carries sign in, autosave, and RLS. It would either stall on design questions or ship a placeholder look that every later slice copies.

## Options considered

### Option 1: Token first system on the existing shadcn setup (chosen)

Keep shadcn `radix-nova` and Tailwind v4 from spec 0001. Replace the token values with a warm paper palette, switch to Inter, add next-themes and sonner, build the shell from the shadcn Sidebar, and enforce tokens with an ESLint rule plus axe scans in Playwright. Write `docs/design.md` as the human reference.

**Pros**:
- No new styling technology. It reuses the shadcn and Tailwind setup that spec 0001 already chose and that BlockNote's shadcn UI consumes.
- The shadcn Sidebar already handles collapse, the cookie, the mobile sheet, and keyboard focus, so the shell is mostly configuration.
- The rules are enforced by lint and tests, which suits an AI assisted build where conventions otherwise drift.

**Cons**:
- Generated shadcn files are edited (focus ring opacity, sidebar constants), so each new component needs a small manual touch.
- OKLCH token values need tuning against the axe scan, so contrast cannot be fully trusted from the table alone.

### Option 2: Keep shadcn defaults, tune later

Ship the shell and dark mode on the current neutral tokens and Geist, and postpone a visual identity until the product works.

**Pros**:
- Fastest path to feature 5; almost nothing to decide.
- Defaults are already reasonably accessible in light mode.

**Cons**:
- Pure neutral grays read as a generic dashboard, which is the opposite of the calm, paper feel that sets Luna apart.
- The default 50% focus rings likely fail the 3:1 contrast need for focus indicators.
- Every slice built in the meantime bakes in the defaults, so the later retune touches more code and more screenshots.

### Option 3: A themed component library (for example Mantine or Chakra) instead of shadcn

Adopt a library with a full built in theme system and ready made app shell.

**Pros**:
- A complete theming API and an app shell out of the box.
- Less owned component code to maintain.

**Cons**:
- It contradicts spec 0001 (shadcn on Tailwind) and BlockNote's chosen `@blocknote/shadcn` integration, so the editor would need a second UI flavor or a re theme.
- It adds a large runtime dependency and a second styling approach next to Tailwind.
- Less control over the exact calm look, since you style through the library's theme API rather than owning the markup.

### Option 4: A fully custom shell and primitives on Radix, no shadcn Sidebar

Build the sidebar, drawer, and resize logic by hand on Radix primitives for complete control (including a resizable sidebar).

**Pros**:
- Exactly the behavior wanted, with no generated code to patch.
- Room for Notion style drag to resize from day one.

**Cons**:
- Re implements collapse state, cookie persistence, the mobile sheet, focus handling, and keyboard shortcuts that the shadcn Sidebar already gets right.
- More code to test for accessibility, for a solo builder.

## Rationale

Option 1 is the only one that serves the calm promise without adding technology. Spec 0001 already committed to shadcn on Tailwind v4, and BlockNote's shadcn UI reads the same CSS variables, so the most leveraged move is to make those variables right once. The warm paper palette with ink actions and a single muted blue (for links and focus only) gives Luna a recognizable notebook feel while keeping color out of the way of writing. Inter for everything keeps one family to load and tune and stays legible at the 14px chrome size. The 720px column is the familiar, comfortable reading measure.

Option 2 looks cheaper but moves the cost to later, when more screens depend on the defaults; it also leaves the focus ring contrast problem in place. Option 3 fights the stack decision and the editor integration. Option 4 spends the build budget on solved problems; the fixed width, collapsible shadcn Sidebar covers what you asked for, and a resizable sidebar can come later as a small extension.

Several smaller calls follow from the forces. The sidebar shortcut moves from Cmd+B to Cmd+\ because the editor needs Cmd+B for bold (Notion uses the same key). Input borders get their own darker `--input` token so form fields meet the 3:1 rule for identifying components, while decorative dividers stay light. Focus rings become solid because 50% opacity rings on warm off white are unlikely to reach 3:1. The top bar is rendered by each route rather than the layout because Next.js layouts do not receive page data, and breadcrumbs depend on the page. The axe and keyboard tests reach the shell through a dev only preview route, because no signed in Playwright setup exists yet, and building one (with a secret key) belongs to feature 5, which needs two accounts for its RLS tests anyway. Enforcement uses ESLint `no-restricted-syntax` because it already runs in the pre commit hook and needs no new plugin; the Tailwind ESLint plugin's Tailwind v4 support was judged less proven. Theme choice stays in localStorage because a profile table, its RLS policy, and its isolation test cost more than a per device preference is worth for one person.

### Calls made during writing (pick, why, runner up)

- **Mono font**: keep Geist Mono (already wired, pairs fine with Inter). Runner up: JetBrains Mono.
- **Wordmark**: lucide `Moon` plus the word "Luna", no image asset. Runner up: a custom SVG mark, deferred to the landing page (feature 14).
- **Error and not found pages**: included here, since they are part of the shell's state patterns. Runner up: leave them to feature 15 (error monitoring), which would leave raw Next.js defaults until then.
- **Toast placement and timing**: bottom right on desktop, sonner's own full width bottom layout on phones (sonner has no per breakpoint position, and switching it in JS would mismatch on hydration). 5s default, 8s for errors, persistent with an action, all through a small `notify` helper because sonner has no per type default durations. Runner up: top center, which competes with the top bar.
- **Sidebar toggle**: a collapse button in the sidebar header plus a top bar trigger shown only while collapsed, the way Notion does it, with visibility in CSS so nothing flashes. Runner up: an always visible top bar trigger, which adds a permanent icon to every page.
- **Collapsed sidebar is `inert`**: offcanvas only slides the panel off screen, so without `inert` its links stay in the Tab order. Runner up: `visibility: hidden` after the transition, which needs timing code.
- **No `themeColor`**: a static per OS theme color is wrong whenever the manual choice differs from the OS. Runner up: updating the meta tag from the client on theme change, not worth it now.
- **Contrast unit test**: axe checks text contrast only, so borders, rings, and fills get a pure Vitest check over named token pairs. Runner up: manual checks, which drift.
- **Collapse style**: `offcanvas` (fully hidden). Runner up: `icon` rail, which adds clutter and has little use without page icons.
- **Lint scope**: everything in `src/` except `src/components/ui/`. Runner up: include `ui/` and allow overlay colors one by one, which is noisy for generated code.
