# Shell

The frame around every signed in page: sidebar, top bar, page column, account menu, mobile drawer, and the route error state. Governed by [spec 0003](../../../docs/specs/0003-design-system-ui-foundation/index.md); the look is in [docs/design.md](../../../docs/design.md).

## Where things are

- `src/app/(app)/layout.tsx` mounts the shell: `SkipLink`, `SidebarProvider`, `AppSidebar`, and `SidebarInset` as `<main id="main">`.
- `components/app-sidebar.tsx`: wordmark, the "Pages" section (an `EmptyState` until pages exist), and `AccountMenu` (email from `getClaims()`, Theme submenu, Sign out through `useSignOut` in `src/features/auth/hooks/`).
- `components/top-bar.tsx`: each route renders its own `TopBar` with `breadcrumbs` and an optional `status`, since both come from the route's data.
- `components/page-column.tsx`: the 720px column every signed in route puts its content in.
- `breadcrumbs.ts`: pure helpers; more than three items fold to the first plus the last two, the rest go in the `…` menu.
- `sidebar-state.ts`: reads the `sidebar_state` cookie on the server so the first render matches the saved open or closed state.
- `components/route-error.tsx`: used by `src/app/(app)/error.tsx`; fixed copy only, never the error's message.
- The dev preview at `/dev/ui/shell` (`src/features/design-system/components/shell-preview.tsx`) renders the same components with sample data and 404s in production.

## Conventions

- The cookie name `sidebar_state` must match `SIDEBAR_COOKIE_NAME` in the generated `src/components/ui/sidebar.tsx`.
- The sidebar toggles with Cmd+\ or Ctrl+\ (`SIDEBAR_KEYBOARD_SHORTCUT`). Cmd+B and Ctrl+B stay free for bold in the editor.
- Links inside the mobile drawer close it and then move focus to `#main` (`close-drawer-on-navigate.tsx`); move focus only after the drawer has closed, or its focus trap undoes it.
- Server code that calls `getClaims()` must `await connection()` first: it compares the token expiry to `Date.now()`, which Cache Components rejects during prerendering.
- `useIsMobile` (`src/hooks/use-mobile.ts`) is false on the server; the client corrects it on hydration.
- Tests: `breadcrumbs.test.ts`, `sidebar-state.test.ts`, and `tests/e2e/shell.spec.ts`.

_Drafted by /sync from the introducing change, worth a quick human pass._
