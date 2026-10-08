---
name: luna-warm-paper
source: spec 0003 (docs/specs/0003-design-system-ui-foundation)
character: "A quiet notebook. Warm off white paper (warm charcoal at night), near black ink, one sans, and color used only for links and the keyboard focus ring. Nothing moves unless you asked it to, and nothing asks for attention except your writing."
tokens: "src/app/globals.css is the source of truth. Every value below is copied from it and checked by src/app/design-doc.test.ts."
contrast: "Every pair in Contrast pairs passes in both themes (src/app/contrast.test.ts); axe finds zero violations on /dev/ui, /dev/ui/shell, and /sign-in in light and dark (tests/e2e/a11y.spec.ts)."
---

# Luna design system

Read this before you build any UI in Luna. It tells you which tokens to use, how a page is laid out, which components exist, and how loading, empty, error, and feedback states look. To see everything live, run `npm run dev` and open `/dev/ui` (tokens and components) and `/dev/ui/shell` (the shell). Both routes return 404 in production.

## Build mandate

You are building a calm writing tool, not a dashboard. Every screen sits inside the shell, keeps its content in the page column, and uses tokens only. Ship every state a screen can be in (loading, empty, error), keep chrome small and quiet, and let the page content be the loudest thing on screen. A screen is not done until it works by keyboard alone and passes axe in both themes.

## Character and direction

- **Paper and ink.** Surfaces are warm off white in light mode and warm charcoal (never pure black) in dark mode. Text is warm near black ink. Everything sits on one warm hue (OKLCH hue 70 to 85, very low chroma).
- **Color is rare.** One muted blue is used only for links and the focus ring. Red is used only for destructive actions and errors. Nothing else carries color.
- **One font.** Inter for everything, Geist Mono only for code.
- **Borders separate, shadows float.** Fixed surfaces never get a shadow.
- **Quiet motion.** 150ms or less, opacity and transform only, and none at all under reduced motion.

## Tokens

All tokens live in `src/app/globals.css`: raw values on `:root` (light) and `.dark`, exposed to Tailwind through `@theme inline`. Use them through Tailwind classes, for example `bg-background`, `text-muted-foreground`, `border-input`, `ring-ring`, `text-link`. Add a new token to `globals.css` and to this file together, in both themes. You may change a token's **lightness only** when a contrast check demands it, never its hue or chroma.

### Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `oklch(0.99 0.004 85)` | `oklch(0.2 0.004 70)` | page surface |
| `--foreground` | `oklch(0.22 0.008 70)` | `oklch(0.93 0.006 80)` | body text |
| `--card` | `oklch(0.99 0.004 85)` | `oklch(0.2 0.004 70)` | cards (rare; prefer plain surfaces) |
| `--card-foreground` | `oklch(0.22 0.008 70)` | `oklch(0.93 0.006 80)` | text on cards |
| `--popover` | `oklch(1 0.002 85)` | `oklch(0.24 0.005 70)` | menus, popovers, dialogs, toasts |
| `--popover-foreground` | `oklch(0.22 0.008 70)` | `oklch(0.93 0.006 80)` | text on popovers |
| `--primary` | `oklch(0.24 0.008 70)` | `oklch(0.93 0.006 80)` | primary button fill (ink) |
| `--primary-foreground` | `oklch(0.985 0.003 85)` | `oklch(0.22 0.005 70)` | text on primary |
| `--secondary` | `oklch(0.955 0.006 80)` | `oklch(0.27 0.005 70)` | secondary button fill |
| `--secondary-foreground` | `oklch(0.22 0.008 70)` | `oklch(0.93 0.006 80)` | text on secondary |
| `--muted` | `oklch(0.955 0.006 80)` | `oklch(0.27 0.005 70)` | hover and selected fills, subtle fills |
| `--muted-foreground` | `oklch(0.5 0.012 70)` | `oklch(0.72 0.01 75)` | secondary text, placeholders, empty states |
| `--accent` | `oklch(0.955 0.006 80)` | `oklch(0.27 0.005 70)` | menu item highlight |
| `--accent-foreground` | `oklch(0.22 0.008 70)` | `oklch(0.93 0.006 80)` | text on accent |
| `--destructive` | `oklch(0.52 0.19 27)` | `oklch(0.7 0.17 25)` | destructive text and tinted fills, error text |
| `--border` | `oklch(0.91 0.006 80)` | `oklch(1 0 0 / 9%)` | decorative dividers only |
| `--input` | `oklch(0.64 0.01 75)` | `oklch(0.55 0.01 75)` | form field borders (3:1, so fields are findable) |
| `--ring` | `oklch(0.55 0.12 250)` | `oklch(0.7 0.11 250)` | keyboard focus ring |
| `--link` | `oklch(0.5 0.13 252)` | `oklch(0.75 0.1 250)` | link text |
| `--selection` | `oklch(0.88 0.05 250)` | `oklch(0.38 0.07 250)` | text selection background |
| `--sidebar` | `oklch(0.975 0.005 80)` | `oklch(0.225 0.004 70)` | sidebar surface |
| `--sidebar-foreground` | `oklch(0.36 0.01 70)` | `oklch(0.8 0.008 75)` | sidebar text (softer than body ink) |
| `--sidebar-primary` | `oklch(0.24 0.008 70)` | `oklch(0.93 0.006 80)` | same as primary |
| `--sidebar-primary-foreground` | `oklch(0.985 0.003 85)` | `oklch(0.22 0.005 70)` | same as primary foreground |
| `--sidebar-accent` | `oklch(0.94 0.006 80)` | `oklch(0.28 0.005 70)` | sidebar row hover and active |
| `--sidebar-accent-foreground` | `oklch(0.22 0.008 70)` | `oklch(0.93 0.006 80)` | text on sidebar accent |
| `--sidebar-border` | `oklch(0.92 0.006 80)` | `oklch(1 0 0 / 9%)` | sidebar edge |
| `--sidebar-ring` | `oklch(0.55 0.12 250)` | `oklch(0.7 0.11 250)` | same as ring |
| `--chart-1` | `oklch(0.87 0 0)` | `oklch(0.87 0 0)` | unused until a chart exists |
| `--chart-2` | `oklch(0.556 0 0)` | `oklch(0.556 0 0)` | unused until a chart exists |
| `--chart-3` | `oklch(0.439 0 0)` | `oklch(0.439 0 0)` | unused until a chart exists |
| `--chart-4` | `oklch(0.371 0 0)` | `oklch(0.371 0 0)` | unused until a chart exists |
| `--chart-5` | `oklch(0.269 0 0)` | `oklch(0.269 0 0)` | unused until a chart exists |

`:root` sets `color-scheme: light` and `.dark` sets `color-scheme: dark`, so native scrollbars and form controls follow the theme. `::selection` uses `--selection`. There is no `viewport.themeColor`, because a static one follows the OS, not your theme choice.

Light `--destructive` started at lightness 0.55 and was lowered to 0.52 so destructive text stays at 4.5:1 or better on its own 10% and 15% tinted fills (the destructive button).

### Contrast pairs

Checked in both themes by `src/app/contrast.test.ts`. Text needs 4.5:1, non text needs 3:1. Disabled controls are exempt.

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

Never put text at partial opacity (for example `text-sidebar-foreground/70`); use `text-muted-foreground`, which is checked.

### Typography

Inter through `next/font/google` (`--font-inter`), mapped to `--font-sans`. Geist Mono (`--font-geist-mono`) for code only. Weights: 400 body, 500 UI labels and buttons, 600 headings and the wordmark, 700 the page title only.

| Class | Size / line height | Weight, tracking | Use |
|---|---|---|---|
| `text-xs` | 12px / 16px | 400 or 500 | tooltips, keyboard hints, meta |
| `text-sm` | 14px / 20px | 400 or 500 | all chrome: sidebar rows, menus, buttons, inputs, top bar, toasts |
| `text-body` | 16px / 1.625 | 400 | page content and long text |
| `text-h3` | 20px / 1.4 | 600 | content heading 3 |
| `text-h2` | 24px / 1.3 | 600, `-0.01em` | content heading 2, section headings, error and not found titles |
| `text-h1` | 30px / 1.25 | 600, `-0.015em` | content heading 1, the sign in heading |
| `text-title-sm` | 32px / 1.2 | 700, `-0.02em` | the page title below 768px |
| `text-title` | 40px / 1.2 | 700, `-0.02em` | the page title from 768px (`text-title-sm md:text-title`) |

Inputs keep `text-base md:text-sm`: 16px text on phones stops iOS from zooming into a focused field. That is the one exception to "chrome uses `text-sm`".

### Spacing

Tailwind's 4px scale, unchanged. Chrome uses `1`, `1.5`, `2`, `3` (4 to 12px). Page layout uses `4`, `6`, `8`, `12`, `16` (16 to 64px). Use `gap` on flex and grid, not `space-x` or `space-y`. No arbitrary spacing values in feature code.

### Layout sizes

| What | Value |
|---|---|
| Page column | `--container-page: 45rem` (720px), used as `max-w-page` |
| Page column side padding | `px-6` (24px) on phones, `md:px-12` (48px) from 768px |
| Page column top padding | `pt-8` (32px) on phones, `md:pt-16` (64px) from 768px; `pb-16` below |
| Top bar | `h-11` (44px) |
| Sidebar | `16.25rem` (260px) on desktop, `18rem` in the mobile drawer |
| Sidebar rows | `h-7` (28px) to `h-8`, `text-sm` |
| Mobile breakpoint | 768px (`md`) |

### Radius

`--radius: 0.375rem` (6px). The derived steps in `@theme inline` are `--radius-sm` (60%), `--radius-md` (80%), `--radius-lg` (100%), `--radius-xl` (140%), up to `--radius-4xl` (260%). Buttons, inputs, and menu items land on about 5 to 6px; dialogs on about 8 to 11px.

### Elevation

Borders separate, shadows float. The sidebar, top bar, and page never get a shadow. Only floating layers (menus, popovers, dialogs, sheets, toasts) use `shadow-md` plus a `border` in `--border`.

### Motion

150ms or less, `ease-out`, opacity and transform only: menus, popovers, and dialogs use the `tw-animate-css` enter and exit at 100ms; tooltips use its 150ms default; the sidebar collapse and the drawer slide run at 150ms. No hover lifts, no springs, no press motion, nothing animates on page content. Under `prefers-reduced-motion: reduce`, a base rule in `globals.css` sets every `animation-duration` and `transition-duration` to `0.01ms !important`. Theme changes never animate (`disableTransitionOnChange`).

### Focus

Keyboard focus only (`:focus-visible`), a solid `--ring` color, never at partial opacity. The base layer sets `outline-ring` on everything; components use `focus-visible:ring-3 focus-visible:ring-ring`. A mouse click on a button shows no ring. Invalid fields use a solid `ring-destructive`.

## The ui edit pass

`src/components/ui/` holds shadcn output. Apply these edits to every file there right after each `npx shadcn@latest add`. When the CLI asks to overwrite an existing file, answer no (`yes n | npx shadcn@latest add <name>`), or apply the pass again.

- `ring-ring/50` and `outline-ring/50` become `ring-ring` and `outline-ring`.
- `aria-invalid:ring-destructive/20` becomes `aria-invalid:ring-destructive`; drop `dark:aria-invalid:ring-destructive/40`.
- Drop focus overrides at partial opacity such as `focus-visible:ring-destructive/20`, so every control uses the solid `--ring`.
- Remove `active:not-aria-[haspopup]:translate-y-px` (no press motion).
- Field fills: `disabled:bg-input/50` becomes `disabled:bg-muted`, `dark:bg-input/30` becomes `dark:bg-transparent`, `dark:disabled:bg-input/80` becomes `dark:disabled:bg-muted`, and `dark:hover:bg-input/50` becomes `dark:hover:bg-muted` (because `--input` is a mid gray border color now).
- Destructive button fill: `bg-destructive/10` resting and `hover:bg-destructive/15`, in both themes.
- Any duration above 150ms becomes `duration-150`, and `ease-linear` becomes `ease-out`.
- Text at partial opacity becomes a checked token (the sidebar group label uses `text-muted-foreground`).

Edits specific to `sidebar.tsx`: shortcut `"\\"` (Cmd+\ or Ctrl+\; Cmd+B is bold in the editor), cookie max age one year, width `16.25rem`, `data-state` on the wrapper, `inert` on the desktop container while collapsed, `onMobileCloseAutoFocus` on the drawer (Radix has no trigger to return focus to, because the drawer opens from state), and `onMobileOpenAutoFocus` (opening lands on the open page's row, or the drawer itself, never on a row button whose tooltip would swallow the first Escape). `src/hooks/use-mobile.ts` uses `useSyncExternalStore` over `matchMedia`.

## Shell anatomy

```
┌──────────────┬───────────────────────────────────────────┐
│ ☾ Luna    [«]│ Work / … / Design / Notes          Saved   │  top bar, h-11
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

Everything lives in `src/features/shell/`.

- **`(app)` layout** (`src/app/(app)/layout.tsx`): checks `getClaims()`, reads the sidebar cookie through `readSidebarDefaultOpen()`, then renders `SkipLink`, `SidebarProvider` (`defaultOpen`, `className="flex-1"`), `AppSidebar` with the email, and `SidebarInset` as `<main id="main" tabIndex={-1}>`. Exactly one `#main` per page.
- **Sidebar** (`AppSidebar`): shadcn `Sidebar`, `collapsible="offcanvas"`. Header: the wordmark as a home link, plus "Hide sidebar" (desktop only, tooltip "Hide sidebar ⌘\"). Content: the "Pages" group (empty state until feature 5). Footer: `AccountMenu`. Collapsed on desktop, the container is `inert`.
- **Top bar** (`TopBar`): rendered by each route, since its contents come from the route's data. Props: `breadcrumbs: { id, title, href }[]`, `status?: ReactNode` ("Saved", feature 5), `actions?: ReactNode` (the page menu, features 8, 9, 13). The "Show sidebar" trigger is visible by CSS only: always on phones, on desktop only while the wrapper's `data-state` is `collapsed`.
- **Breadcrumbs**: no Home item (the sidebar is the way home). The last item is the current page (`BreadcrumbPage`, not a link). An empty title shows "Untitled". Items truncate at `max-w-40`; a link that is cut off shows its full title in a tooltip. More than three items keep the first and last two and fold the rest into a "Show hidden pages" menu (`collapseBreadcrumbs` in `breadcrumbs.ts`).
- **Page column** (`PageColumn`): `mx-auto w-full max-w-page` with the padding above. Every signed in route renders its content inside it.
- **Account menu** (`AccountMenu`): the email (or "Account") opens a menu with a Theme submenu (Light, Dark, System) and Sign out (`useSignOut` in `src/features/auth/hooks/`). It is the only sign out.
- **Mobile** (below 768px): the sidebar is a drawer from the left. Escape or a tap on the overlay closes it and focus returns to the trigger. Following a link inside it closes it and moves focus to `#main` (`CloseDrawerOnNavigate`).
- **Keyboard**: the first Tab stop is "Skip to content" (to `#main`). Cmd+\ or Ctrl+\ toggles the sidebar anywhere, even while typing.
- **State**: the theme lives in localStorage (`theme`, next-themes, per browser); the sidebar state lives in the `sidebar_state` cookie (one year), and the server renders it so nothing jumps.

## Component inventory

In `src/components/ui/` (shadcn `radix-nova`, after the ui edit pass): `alert-dialog`, `breadcrumb`, `button`, `command` (with its `input-group` and `textarea`, added with the page tree's Move to dialog; search reuses it), `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `scroll-area`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `tooltip`. Later features add their own, each followed by the ui edit pass.

Luna's own pieces: `PageColumn`, `TopBar`, `AppSidebar`, `AccountMenu`, `SkipLink`, `Wordmark`, `EmptyState`, `RouteError` (all in `src/features/shell/components/`), and `notify` (`src/lib/notify.ts`).

Rules that apply to all of them:

- **Buttons**: `default` (ink) for the one primary action on a surface, `outline` for secondary actions, `ghost` for icon buttons and quiet chrome, `destructive` only for actions that destroy, `link` for inline text actions.
- **Menus**: `DropdownMenu modal={false}`, so the rest of the page is not hidden from screen readers while a menu is open. Items always sit inside a `DropdownMenuGroup`.
- **Dialogs**: always a `DialogTitle` (visually hidden with `sr-only` if needed).
- **Icons**: lucide only; `size-4` in chrome and `size-3.5` in small buttons. An icon only button always has an `aria-label` and a tooltip. Decorative icons get `aria-hidden="true"`.
- **Wordmark**: lucide `Moon` (`size-4`) plus "Luna" in `text-sm font-semibold`. No image asset.

## State and feedback patterns

- **Loading**: a `Skeleton` shaped like the content it replaces. No full page spinners. Buttons show progress by changing their label ("Sending…").
- **Empty**: `EmptyState`, one line of `text-sm text-muted-foreground`, plus at most one action. No illustrations.
- **Form errors**: inline under the field, `text-sm text-destructive`, `role="alert"`, linked to the field with `aria-describedby`, and `aria-invalid` on the field.
- **Toasts**: only for errors from background work (a failed save, a failed move) and for undoable actions ("Moved to trash" with Undo). Never for success that is already visible; a successful save is silent, apart from the top bar `status`. One `<Toaster position="bottom-right" duration={5000} />` lives in the root layout. Feature code never calls `toast()`; it uses `notify`:
  - `notify.error(message)`: stays 8s.
  - `notify.info(message)`: stays 5s.
  - `notify.undoable(message, onUndo)`: stays until used or dismissed, with an Undo action.
  Toasts are announced through sonner's polite live region, and Alt+T moves focus to them.
- **Route errors**: `RouteError` shows the fixed copy "Something went wrong" and a "Try again" button, inside `PageColumn`. It never shows `error.message`. `src/app/(app)/error.tsx` passes Next's `retry()` (refetch and rerender). `src/app/global-error.tsx` covers errors in the root or `(app)` layouts with its own document, the same fixed copy, a Reload button, and the saved theme applied by hand. `src/app/not-found.tsx` shows "This page does not exist" and a link home, with status 404.
- **Confirmations**: `AlertDialog` only for actions that cannot be undone (emptying the trash). Anything undoable uses an Undo toast instead.

## Usage rules

- Use token classes only. `npm run lint` fails on raw palette classes (`text-gray-500`, `bg-white`) and arbitrary colors (`bg-[#fff]`) anywhere in `src/` outside `src/components/ui/`.
- Never override a component's colors or type from `className`; use `className` for layout.
- No `dark:` color overrides in feature code; the tokens already switch.
- No inline styles, no manual `z-index` on overlays.
- Every new screen: inside the shell, inside `PageColumn`, with its loading, empty, and error states, reachable and usable by keyboard, and passing axe in both themes.
- The editor (features 5 and 7) uses `@blocknote/shadcn` with these components, so it inherits the tokens. Editor text uses `text-body`, its headings `text-h1` to `text-h3`, the page title `text-title-sm md:text-title`, all inside `PageColumn`.
