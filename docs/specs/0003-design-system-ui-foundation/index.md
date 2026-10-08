# 0003. Luna design system and UI foundation: warm paper tokens, one sans, a quiet shell

**Date**: 2026-10-08
**Status**: Accepted

## Summary

This spec sets Luna's look and the frame every screen sits in. Surfaces are warm off white (or warm charcoal in dark mode), text is near black ink, and color appears only as one muted blue for links and the keyboard focus ring. Inter is the single font, and page text sits in a calm column about 720px wide. A collapsible sidebar plus a thin top bar form the shell, and it becomes a drawer on phones. Tokens (named design values such as `--background`) live in `globals.css` and are written up for people in `docs/design.md`. A lint rule stops raw colors from creeping into feature code, and automated accessibility scans prove contrast and keyboard access in both themes.

## Requirements

**User stories**:
- As the owner, I want Luna to feel calm and uncluttered, like a quiet notebook, so writing is the only thing that asks for my attention.
- As the owner, I want light and dark themes that follow my system, with a manual switch, so Luna fits the time of day.
- As the owner, I want to hide the sidebar and still find my way back with the keyboard, so I can focus on one page.
- As a keyboard user, I want to reach and use everything with Tab, Enter, arrows, and Escape, and always see where focus is.
- As the future builder of slices 1 to 8, I want one written source for tokens, layout, components, and state patterns, so no feature invents its own look.

**Acceptance criteria** (the contract):
- **AC-1**: `docs/design.md` exists and documents every token in this spec (colors in both themes, type scale, spacing, radius, elevation, motion, focus), the shell anatomy, the component inventory, the state patterns (loading, empty, error, feedback), and the usage rules. Every color and size value in it matches `src/app/globals.css`.
- **AC-2**: An axe scan (`@axe-core/playwright`, tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`) reports zero violations on `/dev/ui`, `/dev/ui/shell` (with the account menu open, then closed), and `/sign-in`, each in both `light` and `dark` color schemes.
- **AC-3**: With no saved choice, the theme follows the OS setting. Picking Light, Dark, or System in the account menu applies at once without a reload, survives a reload on the same browser, and the first paint after a reload already shows the saved theme (no flash of the other theme).
- **AC-4**: The signed in `(app)` layout renders the shell: a sidebar with the Luna wordmark, a "Pages" section showing a calm empty state, and an account menu at the bottom showing the signed in email with a Theme submenu and Sign out. The main area has a top bar and a page column no wider than 720px. The first Tab stop on the page is a "Skip to content" link that moves focus to `<main id="main">`.
- **AC-5**: On a viewport 768px or wider, a collapse button in the sidebar header hides the sidebar, the top bar trigger (shown only while collapsed) shows it again, and Cmd+\ (Ctrl+\ on Windows and Linux) toggles it. Cmd+B and Ctrl+B do not toggle it. While collapsed, nothing inside the sidebar can take focus. The open or closed state survives a reload, and the server renders the saved state so the layout does not jump on load.
- **AC-6**: Below 768px, the sidebar is hidden by default and the top bar trigger opens it as a drawer from the left. Escape or a tap on the overlay closes it and returns focus to the trigger. Following a link closes it and moves focus to `#main`.
- **AC-7**: Every interactive element on `/dev/ui`, `/dev/ui/shell`, and `/sign-in` is reachable by Tab in visual order and works with Enter or Space. Menus open with Enter, move with the arrow keys, and close with Escape, returning focus to their trigger. Dialogs trap focus. A focused element shows a solid `--ring` colored ring when focused by keyboard, and no ring appears after a mouse click on a button.
- **AC-8**: `/dev/ui` shows every color token as a labeled swatch, the type scale, the spacing and radius scales, and every base component in its main variants and states (default, focus, disabled, invalid). `/dev/ui/shell` shows the full shell with sample data and a breadcrumb trail of five items. Both routes return 404 from `next start` after `next build`.
- **AC-9**: Menus, popovers, tooltips, the sidebar, and the drawer animate for 150ms or less. With `prefers-reduced-motion: reduce`, every animation and transition duration computes to 0.01ms or less.
- **AC-15**: Every token pair listed under *Contrast pairs* meets its ratio in both themes, computed from the values in `globals.css` (this covers borders, rings, and fills that axe does not check). Disabled controls are exempt, as WCAG allows.
- **AC-10**: `/sign-in` uses the new tokens and Inter, shows the Luna wordmark, and its form behavior is unchanged (the existing `tests/e2e/sign-in.spec.ts` still passes).
- **AC-11**: `npm run lint` fails on a raw palette color class (for example `text-gray-500`, `bg-white`) or an arbitrary color value (for example `bg-[#fff]`) in any file under `src/` except `src/components/ui/`.
- **AC-12**: An uncaught error inside the `(app)` routes shows a calm, fixed error message in the page column with a "Try again" button that retries the segment. An error in a layout above that falls back to a minimal `global-error.tsx`. An unknown URL shows a calm not found page (status 404) with a link home. None of them shows the error message or a stack trace.
- **AC-13**: One `Toaster` is mounted for the whole app. A toast from the `notify` helpers shows in the current theme, at the bottom right on desktop (sonner's full width bottom layout on phones), and is announced to screen readers. Errors stay 8s, other toasts 5s, and a toast with an action (such as Undo) stays until used or dismissed and is reachable by keyboard (Alt+T, then Tab).
- **AC-14**: Loading `/dev/ui`, `/dev/ui/shell`, and `/sign-in` logs zero console errors, in both themes.

## Decision

**Chosen option**: Option 1: a token first system on the existing shadcn `radix-nova` setup, with warm paper tokens, Inter, the shadcn Sidebar shell, next-themes, and sonner, enforced by an ESLint rule and Playwright axe scans.

Every visual value is a CSS variable in `globals.css`, exposed to Tailwind through `@theme inline`. Feature code uses only token classes, and `docs/design.md` is the human reference that `/develop` reads for any UI work.

**Implementation skills**: `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.claude/skills/playwright-best-practices/`) · `vitest` (`antfu/skills`, `.claude/skills/vitest/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Standard definition

### Tokens

All tokens live in `src/app/globals.css`: raw values on `:root` and `.dark`, mapped to Tailwind in `@theme inline` (as the file already does). The hue is warm (OKLCH hue 70 to 85, very low chroma). The values below are the starting point. `/develop` may change **lightness only** where the axe scan (AC-2) demands it, never hue or chroma, and records the final values in `docs/design.md`.

**Color, light** (`:root`, also set `color-scheme: light`)

| Token | Value | Use |
|---|---|---|
| `--background` | `oklch(0.99 0.004 85)` | page surface (warm off white) |
| `--foreground` | `oklch(0.22 0.008 70)` | body text (warm ink) |
| `--card`, `--card-foreground` | same as background, foreground | cards (rare; prefer plain surfaces) |
| `--popover` | `oklch(1 0.002 85)` | menus, popovers, dialogs, toasts |
| `--popover-foreground` | same as foreground | |
| `--primary` | `oklch(0.24 0.008 70)` | primary button fill (ink) |
| `--primary-foreground` | `oklch(0.985 0.003 85)` | text on primary |
| `--secondary`, `--muted`, `--accent` | `oklch(0.955 0.006 80)` | hover and selected row fill, subtle fills |
| `--secondary-foreground`, `--accent-foreground` | same as foreground | |
| `--muted-foreground` | `oklch(0.50 0.012 70)` | secondary text, placeholders, empty states (at least 4.5:1 on background, sidebar, and muted) |
| `--border` | `oklch(0.91 0.006 80)` | decorative dividers only |
| `--input` | `oklch(0.64 0.01 75)` | form field borders (at least 3:1 against background, so fields are identifiable) |
| `--ring` | `oklch(0.55 0.12 250)` | focus ring (muted blue, at least 3:1) |
| `--link` | `oklch(0.50 0.13 252)` | link text (at least 4.5:1) |
| `--selection` | `oklch(0.88 0.05 250)` | text selection background |
| `--destructive` | `oklch(0.55 0.19 27)` | destructive text and fills |
| `--sidebar` | `oklch(0.975 0.005 80)` | sidebar surface (a shade warmer and darker than the page) |
| `--sidebar-foreground` | `oklch(0.36 0.01 70)` | sidebar text (softer than body ink) |
| `--sidebar-accent` | `oklch(0.94 0.006 80)` | sidebar row hover and active |
| `--sidebar-accent-foreground` | same as foreground | |
| `--sidebar-primary`, `--sidebar-primary-foreground` | same as primary pair | |
| `--sidebar-border` | `oklch(0.92 0.006 80)` | |
| `--sidebar-ring` | same as ring | |

**Color, dark** (`.dark`, also set `color-scheme: dark`)

| Token | Value |
|---|---|
| `--background` | `oklch(0.20 0.004 70)` (warm charcoal, not black) |
| `--foreground` | `oklch(0.93 0.006 80)` |
| `--card`, `--card-foreground` | same as background, foreground |
| `--popover` | `oklch(0.24 0.005 70)` |
| `--popover-foreground` | same as foreground |
| `--primary` | `oklch(0.93 0.006 80)` |
| `--primary-foreground` | `oklch(0.22 0.005 70)` |
| `--secondary`, `--muted`, `--accent` | `oklch(0.27 0.005 70)` |
| `--secondary-foreground`, `--accent-foreground` | same as foreground |
| `--muted-foreground` | `oklch(0.72 0.01 75)` |
| `--border` | `oklch(1 0 0 / 9%)` |
| `--input` | `oklch(0.55 0.01 75)` |
| `--ring` | `oklch(0.70 0.11 250)` |
| `--link` | `oklch(0.75 0.10 250)` |
| `--selection` | `oklch(0.38 0.07 250)` |
| `--destructive` | `oklch(0.70 0.17 25)` |
| `--sidebar` | `oklch(0.225 0.004 70)` |
| `--sidebar-foreground` | `oklch(0.80 0.008 75)` |
| `--sidebar-accent` | `oklch(0.28 0.005 70)` |
| `--sidebar-accent-foreground` | same as foreground |
| `--sidebar-primary`, `--sidebar-primary-foreground` | same as primary pair (replaces the default blue) |
| `--sidebar-border` | `oklch(1 0 0 / 9%)` |
| `--sidebar-ring` | same as ring |

Add `--color-link: var(--link)` and `--color-selection: var(--selection)` to `@theme inline`, and a base rule `::selection { background: var(--selection); }`. Leave the `--chart-*` tokens as they are (unused until a chart exists).

No `viewport.themeColor`: a static one follows the OS, not your manual theme choice, so it would be wrong half the time.

**Contrast pairs** (checked by `src/app/contrast.test.ts`, AC-15, in both themes; text pairs need 4.5:1, non text pairs 3:1):

| Foreground | Background(s) | Ratio |
|---|---|---|
| `--foreground` | `--background`, `--popover`, `--muted` | 4.5 |
| `--muted-foreground` | `--background`, `--muted`, `--sidebar`, `--sidebar-accent`, `--popover` | 4.5 |
| `--sidebar-foreground` | `--sidebar`, `--sidebar-accent` | 4.5 |
| `--primary-foreground` | `--primary` | 4.5 |
| `--link` | `--background`, `--muted` | 4.5 |
| `--destructive` | `--background`, `--popover` | 4.5 |
| `--input` | `--background`, `--popover` | 3 |
| `--ring` | `--background`, `--sidebar`, `--popover`, `--muted` | 3 |

**Typography**

- **Font**: Inter through `next/font/google` (`variable: "--font-inter"`, `subsets: ["latin"]`, `display: "swap"`), replacing Geist. In `@theme inline`, set `--font-sans: var(--font-inter)` (this also removes today's self reference). Geist Mono stays for code (`--font-mono`). `--font-heading` stays mapped to the sans.
- **Weights**: 400 (body), 500 (UI labels, buttons), 600 (headings, wordmark), 700 (page title only).
- **Scale** (add the custom steps to `@theme`, keep Tailwind's built in ones):

| Step | Size / line height | Weight, tracking | Use |
|---|---|---|---|
| `text-xs` | 12px / 16px | 400 or 500 | tooltips, keyboard hints, meta |
| `text-sm` | 14px / 20px | 400 or 500 | all chrome: sidebar rows, menus, buttons, inputs, top bar, toasts |
| `text-body` (new) | 16px / 1.625 | 400 | page content and long text |
| `text-h3` (new) | 20px / 1.4 | 600 | content heading 3 |
| `text-h2` (new) | 24px / 1.3 | 600, `-0.01em` | content heading 2 |
| `text-h1` (new) | 30px / 1.25 | 600, `-0.015em` | content heading 1 |
| `text-title-sm` (new) | 32px / 1.2 | 700, `-0.02em` | the page title below 768px |
| `text-title` (new) | 40px / 1.2 | 700, `-0.02em` | the page title from 768px (`text-title-sm md:text-title`) |

Define each new step in `@theme` with Tailwind v4's `--text-<name>`, `--text-<name>--line-height`, `--text-<name>--letter-spacing`, and `--text-<name>--font-weight` variables.

**Spacing**: Tailwind's 4px base scale, unchanged. Chrome uses the steps `1`, `1.5`, `2`, `3` (4 to 12px). Page layout uses `4`, `6`, `8`, `12`, `16` (16 to 64px). No arbitrary spacing values in feature code.

**Layout sizes** (in `@theme`): `--container-page: 45rem` (720px, used as `max-w-page`), page column side padding `px-6` (24px) on phones and `px-12` (48px) from 768px up, page top padding `pt-8` (32px) on phones and `pt-16` (64px) from 768px up. Top bar height `h-11` (44px). Sidebar width `16.25rem` (260px) on desktop and `18rem` in the mobile drawer. Sidebar rows are 28px tall (`h-7`), `text-sm`.

**Radius**: `--radius: 0.375rem` (6px). The derived `--radius-*` steps in `@theme inline` stay as they are, so buttons, inputs, and menu items land on 5 to 6px and dialogs on about 8 to 11px.

**Elevation**: borders separate, shadows float. Fixed surfaces (sidebar, top bar, page) never get a shadow. Only floating layers (menus, popovers, dialogs, sheets, toasts) use `shadow-md` plus a `border` in `--border`.

**Motion**: 150ms `ease-out` for opacity and transform on menus, popovers, tooltips, the sidebar collapse, and the drawer (the `tw-animate-css` defaults that `radix-nova` components ship are fine when they stay at or under 150ms; shorten any that are longer). No hover lifts, no spring, no animation on page content. A base rule under `@media (prefers-reduced-motion: reduce)` sets `animation-duration` and `transition-duration` to `0.01ms !important` on `*, ::before, ::after`.

**Focus**: keyboard focus only (`:focus-visible`), solid color, at least 2px. In the `@layer base` rule change `outline-ring/50` to `outline-ring`. In every file under `src/components/ui/`, change `ring-ring/50` to `ring-ring` (nova's 3px ring width stays). This applies to files already there (`button.tsx`, `input.tsx`) and to every component added later, right after `shadcn add`.

**Generated component edits** (the "ui edit pass", applied to every file in `src/components/ui/` now and after each `shadcn add`; when `shadcn add` offers to overwrite an existing file such as `input.tsx`, decline, or apply the pass again):
- `ring-ring/50` → `ring-ring`.
- `aria-invalid:ring-destructive/20` and `dark:aria-invalid:ring-destructive/40` → `aria-invalid:ring-destructive`.
- Remove `active:not-aria-[haspopup]:translate-y-px` (no press motion).
- Disabled field fills (`disabled:bg-input/50`, `dark:bg-input/30` on inputs) → `disabled:bg-muted` and `dark:bg-transparent`, because `--input` is now a mid gray border color.
- Keep `text-base md:text-sm` on `input.tsx`: 16px text on phones stops iOS from zooming into a focused field. This is the one exception to "chrome uses `text-sm`".

**Icons**: lucide only, `size-4` in chrome, `size-3.5` in small buttons, stroke width default. An icon only button always has an `aria-label` and a tooltip.

**Wordmark**: lucide `Moon` icon (`size-4`) plus the word "Luna" in `text-sm font-semibold`. No image asset.

### Shell anatomy

```
┌──────────────┬───────────────────────────────────────────┐
│ ☾ Luna    [«]│ Projects / Luna / Notes         Saved  ··· │  top bar, h-11
│              ├───────────────────────────────────────────┤
│ Pages        │                                           │
│  No pages    │        ┌───────── max-w-page ─────────┐   │
│  yet         │        │ Page title                   │   │
│              │        │ Body text…                   │   │
│              │        └──────────────────────────────┘   │
│ ──────────── │                                           │
│ you@mail ▾   │                                           │
└──────────────┴───────────────────────────────────────────┘
```

- **Feature folder**: `src/features/shell/` holds `components/` (`app-sidebar.tsx`, `top-bar.tsx`, `account-menu.tsx`, `page-column.tsx`, `skip-link.tsx`, `empty-state.tsx`, `route-error.tsx`, `close-drawer-on-navigate.tsx`) and `sidebar-state.ts` with `getSidebarDefaultOpen(cookieValue: string | undefined): boolean` (pure: `false` only for `"false"`) plus a server helper that reads the `sidebar_state` cookie with `cookies()` and passes it in. The theme provider joins the existing `src/components/providers.tsx`.
- **`(app)` layout**: after the existing `getClaims()` check, read the sidebar state through the helper (calling `cookies()` here is fine; the layout already has `instant = false` and stays dynamic), then render `SkipLink`, `SidebarProvider` (with `defaultOpen` from the helper and `className="flex-1"` so it fills the root `flex min-h-full flex-col` body), `AppSidebar` (passed the email), and `SidebarInset` with `id="main"` and `tabIndex={-1}` wrapping `children`. `SidebarInset` renders the `<main>` element. Exactly one `id="main"` exists per page.
- **Sidebar**: shadcn `Sidebar` with `collapsible="offcanvas"` (fully hidden when collapsed). Header: the wordmark, plus a collapse button on the right (icon `ChevronsLeft`, `aria-label="Hide sidebar"`, tooltip "Hide sidebar ⌘\", calls `toggleSidebar()`; desktop only). Content: a `SidebarGroup` labeled "Pages" that shows `EmptyState` ("No pages yet") until feature 5 fills it. Footer: `AccountMenu`. While collapsed on desktop, the sidebar container gets the `inert` attribute so nothing inside can take focus or be read.
- **Sidebar edits to the generated `src/components/ui/sidebar.tsx`**: `SIDEBAR_KEYBOARD_SHORTCUT = "\\"` (Cmd+B is bold in the editor), `SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365`, `SIDEBAR_WIDTH = "16.25rem"`, `SIDEBAR_WIDTH_MOBILE` stays `"18rem"`, and `inert={state === "collapsed" && !isMobile}` on the desktop sidebar container. The cookie keeps its generated name, `sidebar_state`. The shortcut also fires while typing in a field or the editor, on purpose (it is a modifier combination, so it never conflicts with text input, and Notion behaves the same way).
- **Top bar** is rendered by each route, not the layout, because its contents depend on the route's data (layouts do not receive page data). Props: `breadcrumbs: { id: string; title: string; href: string }[]` (`id` is the React key), `status?: ReactNode` (feature 5 puts "Saved" here), `actions?: ReactNode` (the ··· page menu, filled by features 8, 9, 13). On the left: `SidebarTrigger` (`aria-label="Show sidebar"`, tooltip "Show sidebar ⌘\"), then the breadcrumb. Trigger visibility is pure CSS, so it never flashes on hydration: hidden by default, `max-md:inline-flex` on phones, and on desktop shown with `group-data-[state=collapsed]/sidebar-wrapper:md:inline-flex` (the `SidebarProvider` wrapper carries `data-state`; if the generated wrapper lacks it, add `data-state={state}` there).
- **Breadcrumbs**: there is no Home item (the sidebar is the way home). The last item is the current page, rendered as `BreadcrumbPage` (`aria-current="page"`, not a link). The others are `BreadcrumbLink`s. An empty title shows "Untitled". Each item truncates at `max-w-40`, and a truncated link shows its full title in a tooltip (the current page item is not focusable and uses the native `title` attribute instead). With more than three items, keep the first item and the last two, and put the rest in a `BreadcrumbEllipsis` dropdown (labeled "Show hidden pages") listing them in order as links. The home route renders `TopBar` with `breadcrumbs={[]}` and no actions.
- **Page column**: `PageColumn` is `mx-auto w-full max-w-page` with the padding above. Every signed in route renders its content inside it.
- **Account menu**: a `SidebarMenuButton` showing the email (truncated) and a chevron. It opens a `DropdownMenu` with a "Theme" submenu (`DropdownMenuRadioGroup` with Light, Dark, System bound to `useTheme()`), a separator, and "Sign out" (`DropdownMenuItem onSelect` calling `useSignOut()`).
- **Sign out**: move the logic out of `SignOutButton` into `src/features/auth/hooks/use-sign-out.ts` (`useSignOut(): { signOut: () => void; pending: boolean }`, same behavior: `auth.signOut()`, then `router.replace("/sign-in")` and `router.refresh()`; check the returned `error` and show it with `notify.error`). Delete `sign-out-button.tsx` and remove it from the home page; the account menu is the only sign out.
- **Mobile** (below 768px): handled by the shadcn Sidebar's `useIsMobile` and `Sheet`. `CloseDrawerOnNavigate` (a client component inside the sidebar) watches `usePathname()`, and on change calls `setOpenMobile(false)` and focuses `#main`. Escape and overlay close keep Radix's default focus return to the trigger.
- **Skip link**: visually hidden until focused (`sr-only focus:not-sr-only`, then positioned at the top left on `bg-popover` with the ring), href `#main`.

### Component inventory

Added now with `npx shadcn@latest add`: `sidebar` (brings `sheet`, `tooltip`, `separator`, `skeleton`, `input`, and the `use-mobile` hook), `breadcrumb`, `scroll-area`, `dropdown-menu`, `dialog`, `alert-dialog`, `popover`, `sonner`. Already present: `button`, `input`, `label`. Later features add their own (`command` with feature 10, `context-menu` with feature 6), and each addition gets the focus edit above.

### State and feedback patterns

- **Loading**: a `Skeleton` shaped like the content it replaces. No full page spinners. Buttons show progress by changing their label ("Sending…"), as the sign in form already does.
- **Empty**: `EmptyState`, one line of `text-sm text-muted-foreground`, plus at most one action. No illustrations.
- **Form errors**: inline under the field, `text-sm text-destructive`, `role="alert"`, linked with `aria-describedby` (the existing `FormError` pattern).
- **Toasts** (sonner): only for errors from background work (a failed save, a failed move) and for undoable actions ("Moved to trash" with Undo). Never for success that is already visible. Successful saves are silent, apart from the top bar `status` slot. `<Toaster position="bottom-right" duration={5000} />` is mounted once in the root layout, inside `Providers` (the shadcn `sonner.tsx` reads `useTheme()`). On phones sonner's own full width bottom layout applies. Feature code never calls `toast()` directly; it uses `src/lib/notify.ts`:
  - `notify.error(message)`: `toast.error(message, { duration: 8000 })`
  - `notify.info(message)`: `toast(message)` (5s default)
  - `notify.undoable(message, onUndo)`: `toast(message, { duration: Infinity, action: { label: "Undo", onClick: onUndo } })`
- **Route errors**: `RouteError` (`{ reset: () => void }`) shows the fixed copy "Something went wrong" plus a "Try again" button calling `reset()`, inside `PageColumn`. It never renders `error.message`; it logs the error with `console.error` in a `useEffect`. `src/app/(app)/error.tsx` (client) renders it. `src/app/global-error.tsx` (client, with its own `<html>` and `<body>`) renders the same fixed copy and a reload button, styled with token classes, for errors in the root or `(app)` layouts. `src/app/not-found.tsx` renders `<main id="main">` with `PageColumn`, the heading "This page does not exist", and a link home. All use tokens only.
- **Confirmations**: `AlertDialog` only for actions that cannot be undone (emptying the trash). Anything undoable uses an Undo toast instead.

### Theme

`next-themes@^0.4.6` (the line that avoids React 19's script tag warning; AC-14 checks it) `ThemeProvider` in `src/components/providers.tsx` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`, and the default `storageKey` (`theme`, in localStorage). Add `suppressHydrationWarning` to `<html>` in `src/app/layout.tsx`. The choice is per browser. There is no database column.

### Style guide routes

`src/app/dev/ui/page.tsx` and `src/app/dev/ui/shell/page.tsx` are thin routes outside the `(app)` group (no sign in needed, no data read). Each calls `notFound()` when `process.env.NODE_ENV === "production"`. Their content lives in `src/features/design-system/components/` (`style-guide.tsx`, `shell-preview.tsx`, `demo-error-boundary.tsx`). `/dev/ui` wraps the style guide in `<main id="main">` with `PageColumn` and one `<h1>`. `/dev/ui/shell/page.tsx` reads the sidebar state through the same server helper as the `(app)` layout, so the persistence test exercises the real path, and renders `shell-preview.tsx`: the real `SkipLink`, `SidebarProvider`, `AppSidebar`, `TopBar`, `PageColumn`, and `AccountMenu` with the sample email `you@example.com`, five sample breadcrumbs (`Work`, `Projects`, `Luna`, `Design`, `Notes`), and a paragraph of sample body text. `AccountMenu` takes an optional `onSignOut` prop; the preview passes a no op. The "Throw" demo in the style guide sets state that makes a child throw during render (a click handler error is not caught by error boundaries), inside `DemoErrorBoundary`, a small hand written class component that renders `RouteError` with `reset` clearing that state. This is the one class in the codebase; React has no function API for error boundaries.

### Contract for later features

- The editor (features 5 and 7) uses `@blocknote/shadcn` with Luna's shadcn components passed in, so it inherits these tokens. Editor text uses `text-body`, editor headings use `text-h1` to `text-h3`, the page title uses `text-title`, and the editor sits inside `PageColumn`.
- New UI reads `docs/design.md` first. A new token is added to `globals.css` and `docs/design.md` together, in both themes.

### Value sourcing

| Action | Value produced or displayed | Source |
|---|---|---|
| Account menu | signed in email | `claims.email` from `getClaims()` in `src/app/(app)/layout.tsx`, passed as a prop; shows "Account" if absent |
| Sidebar first render | open or closed | cookie `sidebar_state`, read by the server helper in `src/features/shell/sidebar-state.ts` (used by the `(app)` layout and `/dev/ui/shell`); `getSidebarDefaultOpen` returns `false` only for `"false"` |
| Sidebar toggle | new open state | `SidebarProvider` writes `sidebar_state` (1 year max age) |
| Theme on load | light, dark, or system | localStorage `theme` via next-themes; absent means `system`, which resolves from `prefers-color-scheme` |
| Mobile or desktop shell | layout mode | shadcn `useIsMobile` (`matchMedia` at 768px) |
| Breadcrumb trail | ancestor titles and links | the route's `breadcrumbs` prop; empty on home now, built from page ancestors by features 5 and 6 |
| Top bar status | "Saved" text | `status` prop, owned by feature 5 |
| Style guide availability | page or 404 | `process.env.NODE_ENV` |
| Shell preview data | email, breadcrumbs, body | constants in `shell-preview.tsx` |
| Top bar trigger visibility | shown or hidden | CSS only: phones always, desktop when the wrapper's `data-state` is `collapsed` |
| Desktop sidebar focusability | inert or not | `state === "collapsed" && !isMobile` from `useSidebar()` |
| Toast duration and action | 5s, 8s, or until used | the `notify` helper used (`src/lib/notify.ts`) |
| Error screens | copy | fixed strings in `RouteError`, `global-error.tsx`, `not-found.tsx`; never `error.message` |
| Every color, size, radius, and duration | the value | the token tables in this spec, recorded in `docs/design.md` |

### Key invariants

- Feature code (`src/` outside `src/components/ui/`) never contains a raw palette color class or an arbitrary color value.
- Every token exists in both `:root` and `.dark`.
- Every focusable element shows a solid `--ring` focus indicator on keyboard focus.
- Nothing animates for longer than 150ms, and nothing animates under reduced motion.
- `docs/design.md` and `globals.css` agree.

### Security model

No new data, tables, or secrets. The theme and sidebar state are UI preferences stored in the browser (localStorage and a non sensitive cookie). The style guide routes read no data and 404 in production. The email shown comes from the verified JWT claims (`getClaims()`), never from `getSession()`.

### Canonical pattern

```tsx
// src/features/shell/components/empty-state.tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 px-2 py-1.5", className)}>
      <p className="text-sm text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}
```

Tokens through Tailwind classes (`text-muted-foreground`, `bg-sidebar-accent`), spacing from the scale, `cn()` to merge, named export, no inline styles, no raw colors.

**Replaces**:
- The untouched shadcn neutral defaults in `globals.css` and the Geist sans font.
- Half opacity focus rings (`ring-ring/50`, `outline-ring/50`).
- One off layouts per route (the current centered `main` on the home page).
- Raw palette classes (`text-gray-500`, `bg-white`) and arbitrary colors (`bg-[#fafafa]`).

**Enforcement**:
- **ESLint** (in `eslint.config.mjs`, a config object `{ files: ["src/**/*.{ts,tsx}"], ignores: ["src/components/ui/**"], rules: { "no-restricted-syntax": [...] } }`, placed before `eslint-config-prettier`; `eslint-config-next` does not set this rule, so nothing is overridden). Four selector entries, each with a message pointing to `docs/design.md`: `Literal[value=/<P>/]` and `TemplateElement[value.raw=/<P>/]` for the palette pattern, and the same two for the arbitrary color pattern. Build each selector string from a JS `RegExp`'s `.source` so the escaping is done once, and keep the patterns free of `/` characters:
  - Palette `<P>`: `(?:^|[\s:])(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|divide|shadow|decoration|placeholder|caret|accent)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})`
  - Arbitrary color `<P>`: `-\[(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch|oklab)\()`
  - It runs in `npm run lint` and in the pre commit hook (lint-staged already runs `eslint --fix` on every staged `.ts` and `.tsx` file).
- **Vitest contrast test** (`src/app/contrast.test.ts`, AC-15): parses the `:root` and `.dark` blocks of `globals.css`, converts OKLCH to sRGB (a small pure function in the test, or the `culori` dev dependency), and checks every row of *Contrast pairs*. Alpha tokens (`--border` in dark) are not in the list.
- **Playwright** axe and keyboard specs (AC-2, AC-7) guard contrast and focus in both themes.
- **Review**: `docs/design.md` is the reference for anything the lint rule cannot see (spacing choices, toast usage).

**Rollout**: in a single change. The codebase is tiny (three UI components, three routes), so every existing file is brought to the standard in this feature's build.

**Exceptions**: `src/components/ui/` (shadcn output may use `bg-black/50` style overlays) is excluded from the lint rule, but still gets the ui edit pass. `input.tsx` keeps `text-base` on phones. `DemoErrorBoundary` is the one class component. No other exceptions.

### Critical test scenarios

All Playwright specs run against `npm run dev` (as configured). Each page test also collects `console` messages of type `error` and expects none (AC-14).

- Axe (`new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])`, no rules disabled), with `page.emulateMedia({ colorScheme })` for `light` and `dark`, on `/dev/ui`, `/sign-in`, and `/dev/ui/shell`. For the shell it scans once closed, then clicks the email button, waits for `getByRole("menu")`, and scans again. Zero violations, verifies **AC-2**, **AC-10**, **AC-14**.
- Contrast pairs: the Vitest contrast test passes in both themes, verifies **AC-15**.
- Theme follows the OS: with no saved theme and `colorScheme: "dark"`, `html` has class `dark`; picking Light in the account menu removes it without a reload, verifies **AC-3**.
- No flash: `page.addInitScript` sets `localStorage.theme = "light"`, `emulateMedia({ colorScheme: "dark" })`, and `page.route("**/_next/static/chunks/**", r => r.abort())` blocks the app's JS so React never hydrates. After `goto`, `html` lacks `dark` and `getComputedStyle(document.body).backgroundColor` equals the light `--background` (read from a probe element styled `bg-background` on a light reference load). Only the next-themes inline script can produce this, verifies **AC-3**.
- Shell preview: wordmark, "Pages" with "No pages yet", the email in the account menu, the top bar, and a column at most 720px wide. The first Tab focuses "Skip to content", and Enter moves focus to `#main`, verifies **AC-4**.
- Sidebar (1280 by 800): the "Hide sidebar" button collapses it (`[data-slot=sidebar]` gets `data-state="collapsed"` and the container is `inert`; assert attributes, not visibility, since offcanvas only moves it off screen). "Show sidebar" in the top bar opens it. `Control+Backslash` toggles it, `Control+b` does nothing. After collapsing and reloading, `data-state` is `collapsed` in the server HTML (check the response body of the reload), and Tab from the skip link never lands inside the sidebar. A Vitest test covers `getSidebarDefaultOpen` (`undefined`, `"true"`, `"false"`, garbage), verifies **AC-5**.
- Mobile (390 by 844): the sidebar is not visible, the trigger opens the drawer, Escape closes it and focus is back on the trigger. Opening it again and clicking a breadcrumb link closes it and focuses `#main`, verifies **AC-6**.
- Keyboard: Tab through `/dev/ui` and check the focus order matches the visual order of a listed set of controls. Open a dropdown with Enter, move with ArrowDown, close with Escape, and check focus returns to the trigger. Open the dialog and check ten Tabs stay inside. Focus ring: a probe `div` with class `bg-ring` gives the resolved ring color; a keyboard focused button's computed `box-shadow` contains that color string, and after `mouse.click` on another button its `box-shadow` does not, verifies **AC-7**.
- Production 404: a Vitest test with `vi.stubEnv("NODE_ENV", "production")` and `next/navigation` mocked (`notFound` throws a marker error) and the style guide component mocked expects the page to throw the marker. The final build task also runs `next build && next start` and checks `/dev/ui` and `/dev/ui/shell` return 404, verifies **AC-8**.
- Reduced motion: with `page.emulateMedia({ reducedMotion: "reduce" })`, open a menu and parse the computed `transition-duration` and `animation-duration` of its content (reported in seconds, for example `1e-05s`); each is at most 0.00001s, verifies **AC-9**.
- Lint (`src/app/lint-colors.test.ts`, `// @vitest-environment node`, 30s timeout): `new ESLint({ cwd: process.cwd() })` then `lintText(code, { filePath })`. `const a = "text-gray-500";` and ``const b = `p-2 bg-[#fff]`;`` and `const c = "border-t-red-500";` in `src/features/x.tsx` each give a `no-restricted-syntax` error. `const d = "text-muted-foreground";` gives none, and `const e = "bg-black/50";` in `src/components/ui/x.tsx` gives none, verifies **AC-11**.
- Errors: the style guide's "Throw" control makes `DemoErrorBoundary` show "Something went wrong" and "Try again", and "Try again" restores the content. `/no-such-route` returns status 404 and shows "This page does not exist" with a link home, verifies **AC-12**.
- Toast: the style guide's "Show error toast" and "Show undo toast" buttons render toasts inside the sonner region whose items have `role="status"`. With the undo toast open, `Alt+T` then Tab focuses "Undo", and Enter runs it. The error toast is gone after 8s (use `page.clock`), verifies **AC-13**.

## Build plan

Tracer Bullet: first a thin thread through every layer (tokens → font → theme → one component → style guide → axe in both themes), then the shell, then the remaining components, then the guardrails and docs.

**M1. Token thread**
1. Replace the `:root` and `.dark` values in `globals.css` with the token tables, add `--link`, `--selection`, `color-scheme`, `::selection`, `--container-page`, the new type steps, `--radius: 0.375rem`, `--font-sans: var(--font-inter)`, the reduced motion rule, and `outline-ring` in the base layer, satisfies **AC-2**, **AC-9**
2. Swap Geist sans for Inter (`--font-inter`) in `src/app/layout.tsx` and add `suppressHydrationWarning` to `<html>`, satisfies **AC-2**, **AC-3**
3. `npm install next-themes@^0.4.6`, add `ThemeProvider` to `src/components/providers.tsx`, satisfies **AC-3**, **AC-14**
4. Apply the ui edit pass to `button.tsx` and `input.tsx`, satisfies **AC-7**
5. Create `src/app/dev/ui/page.tsx` (production 404, `<main id="main">`) and a first `style-guide.tsx` with color swatches, the type scale, and the button variants, plus the Vitest production guard test, satisfies **AC-8**
6. Write `src/app/contrast.test.ts`; `npm install -D @axe-core/playwright` and write `tests/e2e/a11y.spec.ts` (axe plus console errors) for `/dev/ui` and `/sign-in` in both color schemes. Get them green, adjusting token lightness only, satisfies **AC-2**, **AC-14**, **AC-15**

**M2. Shell**
7. `npx shadcn@latest add sidebar breadcrumb scroll-area dropdown-menu` (decline overwriting `input.tsx`, or apply the pass again), apply the ui edit pass to each new file, and apply the sidebar edits (shortcut, cookie age, width, `inert`, wrapper `data-state`), satisfies **AC-5**, **AC-7**
8. Add `src/lib/notify.ts`, move sign out into `src/features/auth/hooks/use-sign-out.ts`, and delete `sign-out-button.tsx`, satisfies **AC-4**, **AC-13**
9. Build `src/features/shell/` (`sidebar-state.ts` with its Vitest test, `app-sidebar` with the collapse button, `top-bar` with CSS trigger visibility and the breadcrumb rules, `account-menu` with the Theme submenu and Sign out, `page-column`, `skip-link`, `empty-state`, `close-drawer-on-navigate`), satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**
10. Wire the `(app)` layout (sidebar state helper, email from claims, skip link, `SidebarProvider className="flex-1"`, `SidebarInset id="main" tabIndex={-1}`), and rewrite the home page to render `TopBar` with no breadcrumbs plus `PageColumn` with the existing welcome text and no sign out button, satisfies **AC-4**, **AC-5**
11. Add `/dev/ui/shell` with `shell-preview.tsx` (reads the same sidebar helper), extend the axe spec to it (menu closed and open), and write `tests/e2e/shell.spec.ts` for the skip link, the sidebar button, shortcut, `inert`, and persistence, the theme switch, the no flash check, and the mobile drawer, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**

**M3. Components, states, and sign in**
12. `npx shadcn@latest add dialog alert-dialog popover sonner`, apply the ui edit pass, mount `<Toaster position="bottom-right" duration={5000} />` once in the root layout inside `Providers`, satisfies **AC-13**, **AC-7**
13. Check every component's enter and exit animation is at most 150ms and shorten any that are longer, satisfies **AC-9**
14. Add `RouteError`, `src/app/(app)/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, and `DemoErrorBoundary`, satisfies **AC-12**
15. Finish the style guide: spacing and radius scales, every component with its states, the Throw demo, error and undo toast buttons, skeleton and empty state samples, satisfies **AC-8**, **AC-12**, **AC-13**
16. Restyle `/sign-in` (wordmark, tokens, page column spacing), keeping the form logic and existing tests as is, satisfies **AC-10**

**M4. Guardrails and docs**
17. Add the `no-restricted-syntax` color rule to `eslint.config.mjs` and `src/app/lint-colors.test.ts`; fix any violations, satisfies **AC-11**
18. Write `tests/e2e/keyboard.spec.ts` (Tab order, menus, dialog trap, focus ring on keyboard but not on mouse), the reduced motion check, and the toast and error checks, satisfies **AC-7**, **AC-9**, **AC-12**, **AC-13**
19. Write `docs/design.md` from the final `globals.css` values: tokens, contrast pairs, type, spacing, radius, elevation, motion, focus, the ui edit pass, shell anatomy, component inventory, state patterns, `notify`, usage rules, satisfies **AC-1**
20. Run `npm run lint && npm run typecheck && npm test && npm run test:e2e`, then `npm run build && npm start` and check `/dev/ui` and `/dev/ui/shell` return 404, satisfies all ACs

## Consequences

**Positive**:
- Every later slice builds on one look and one shell, and the editor inherits the tokens through `@blocknote/shadcn`.
- Contrast and keyboard access are proven automatically in both themes, so regressions fail a test instead of reaching you.
- Raw colors cannot creep in, so a later palette change is a token edit, not a hunt through feature code.

**Negative / tradeoffs**:
- Editing generated shadcn files (the ui edit pass, sidebar constants and `inert`) means each `shadcn add` needs a small follow up edit, and a future `shadcn` update could overwrite them.
- The lint rule is a regex over string literals: it catches the common cases, not every way to build a class name dynamically.
- The signed in `(app)` layout itself is not covered by e2e until feature 5 adds signed in test auth. Only its components are covered, through the preview route.
- Mid gray input borders (needed for 3:1) are a little heavier than a purely decorative border would be.
- The theme is per browser, so a second device starts on System. The browser's own toolbar color is not themed.
- `Cmd+\` needs AltGr on some non US keyboards, which can make it awkward there; the sidebar buttons always work.

**Neutral**:
- Two new runtime dependencies (`next-themes`, `sonner`) and one dev dependency (`@axe-core/playwright`). Inter replaces Geist sans.
- `docs/design.md` becomes a document to keep in step with `globals.css` whenever a token changes.

## Follow-up

- [ ] Root `AGENTS.md` should point UI work at `docs/design.md` and record the token only color rule (for `/sync` after the build).
- [ ] Feature 5 adds Playwright signed in auth (needed for its RLS isolation test anyway) and extends the axe and keyboard specs to the real `(app)` routes.
- [ ] Record in root `AGENTS.md` that Agent Skills and MCP servers for `next-themes`, `sonner`, and `@axe-core/playwright` were declined (covered by the `shadcn` and `playwright-best-practices` skills), so later runs do not offer them again.
