# Verify: Design system & UI foundation · spec 0003 · updated 2026-10-08
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open `/dev/ui` in light, then dark (Theme button, top right) → every color token shows as a labeled swatch, plus the type scale, spacing, radius, and every component with default, focus, disabled, and invalid states → AC-8
- [ ] Open `/dev/ui/shell` → sidebar with the Luna wordmark, "Pages" with "No pages yet", `you@example.com` at the bottom, a top bar with `Work / … / Design / Notes` and "Saved", and a text column no wider than 720px → AC-4, AC-8
- [ ] On `/dev/ui/shell`, press Tab once → "Skip to content" appears top left; press Enter → focus lands on the page (`#main`) → AC-4
- [ ] Click the `…` breadcrumb → a "Show hidden pages" menu lists Projects, then Luna, as links → AC-8
- [ ] With your OS in dark mode and no saved choice, open `/dev/ui/shell` → dark theme. Account menu, Theme, Light → light at once; reload → still light with no dark flash → AC-3
- [ ] At 1280px wide, click "Hide sidebar" → sidebar slides away and "Show sidebar" appears in the top bar; Tab never lands inside the hidden sidebar; reload → it stays hidden with no jump → AC-5
- [ ] Press Ctrl+\ (Cmd+\ on a Mac) → sidebar toggles; press Ctrl+B or Cmd+B → nothing happens → AC-5
- [ ] At 390px wide on `/dev/ui/shell/notes`, tap the sidebar trigger → drawer opens from the left; Escape → it closes and focus is back on the trigger; open it again and tap "Luna" → it closes, the URL becomes `/dev/ui/shell`, focus is on the page → AC-6
- [ ] On `/dev/ui`, Tab through the page → focus moves in visual order with a solid blue ring; click a button with the mouse → no ring → AC-7
- [ ] Open "Page menu" with Enter → arrows move, Escape closes and focus returns to the button. Open "Dialog" → Tab stays inside it → AC-7
- [ ] With "Reduce motion" turned on in your OS, open a menu, a dialog, and the drawer → they appear with no animation → AC-9
- [ ] Click "Show error toast" → toast bottom right in the current theme, gone after about 8s. Click "Show undo toast" → it stays; press Alt+T, Tab to "Undo", Enter → "Restored" toast → AC-13
- [ ] Click "Throw" under States → "Something went wrong" with "Try again" and no error message; "Try again" brings the content back → AC-12
- [ ] Visit `/no-such-route` → "This page does not exist" with a link home → AC-12
- [ ] Open `/sign-in` in both themes → Luna wordmark top left, Inter, warm tokens; sending a link and entering a code work as before → AC-10
- [ ] Sign in for real → the home page shows inside the shell with your email in the account menu, and "Sign out" in that menu returns you to `/sign-in` → AC-4
- [ ] Open the browser console on `/dev/ui`, `/dev/ui/shell`, and `/sign-in` in both themes → no errors → AC-14

## Value sourcing
- [ ] Account menu email: sign in as two different accounts → each sees its own email (from `getClaims()`), never the other's → AC-4
- [ ] Sidebar first render: set cookie `sidebar_state` to `false`, `true`, deleted, and `garbage`, then reload `/dev/ui/shell` → closed only for `false` → AC-5
- [ ] Sidebar toggle: toggle once and inspect cookies → `sidebar_state` updated with a one year max age → AC-5
- [ ] Theme on load: clear localStorage `theme` and switch the OS theme → Luna follows it; set it to `dark` with the OS light → Luna stays dark → AC-3
- [ ] Mobile or desktop: resize across 768px → the sidebar switches between drawer and fixed panel → AC-6
- [ ] Breadcrumb trail: home route shows no breadcrumbs; the preview shows five folded to three → AC-4
- [ ] Top bar status: the preview shows "Saved" from its `status` prop; home shows nothing → AC-4
- [ ] Style guide availability: `npm run build && npx next start -p 3001` → `/dev/ui` and `/dev/ui/shell` return 404 → AC-8
- [ ] Shell preview data: `you@example.com` and Work, Projects, Luna, Design, Notes come from `shell-preview.tsx` constants → AC-8
- [ ] Trigger visibility: with JS blocked, the desktop "Show sidebar" button is hidden when expanded and shown when the cookie says collapsed → AC-5
- [ ] Desktop focusability: collapsed on desktop → the sidebar container has `inert`; on a phone the drawer is never `inert` → AC-5
- [ ] Toast duration and action: error 8s, info 5s, undo until used → AC-13
- [ ] Error screens: throw an error whose message contains a secret → the screen shows only the fixed copy → AC-12
- [ ] Every color and size: `npm test` → `design-doc.test.ts` confirms `docs/design.md` matches `globals.css` → AC-1

## Commands
- [ ] `npm test` → all pass, including `contrast.test.ts` (every pair, both themes), `design-doc.test.ts`, `lint-colors.test.ts`, and the production 404 guards → AC-1, AC-8, AC-11, AC-15
- [ ] `npm run test:e2e` → all pass: `a11y.spec.ts` (zero axe violations in both themes on `/dev/ui`, `/dev/ui/shell` with the menu closed and open, `/sign-in`), `shell.spec.ts`, `keyboard.spec.ts`, `feedback.spec.ts`, `sign-in.spec.ts` → AC-2 to AC-10, AC-12 to AC-14
- [ ] Add `const a = "text-gray-500";` to any file in `src/features/` and run `npm run lint` → it fails with the design token message; remove it → passes → AC-11
- [ ] `npm run lint && npm run typecheck` → clean

## Acceptance-criteria coverage
- AC-1 `docs/design.md`, checked by `design-doc.test.ts` · AC-2 `a11y.spec.ts` · AC-3 `shell.spec.ts` theme tests · AC-4 `shell.spec.ts` anatomy and skip link, plus a real sign in (manual) · AC-5 `shell.spec.ts` sidebar tests, `sidebar-state.test.ts` · AC-6 `shell.spec.ts` mobile drawer · AC-7 `keyboard.spec.ts` · AC-8 style guide, `page.test.tsx`, `layout.test.tsx`, production build check · AC-9 `feedback.spec.ts` reduced motion · AC-10 `a11y.spec.ts` on `/sign-in`, `sign-in.spec.ts` · AC-11 `lint-colors.test.ts` · AC-12 `feedback.spec.ts` errors and not found · AC-13 `feedback.spec.ts` toasts · AC-14 the console fixture in every e2e spec · AC-15 `contrast.test.ts`
