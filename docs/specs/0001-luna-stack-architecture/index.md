# 0001. Luna stack and architecture: Next.js on Supabase

**Date**: 2026-10-07
**Status**: Accepted

## Summary

Luna is one Next.js web app (TypeScript everywhere) that runs on Supabase, a hosted service that gives us a Postgres database, sign in, file storage, and per row access rules in one place. The browser talks to Supabase directly, and database rules (row level security) make sure each person only ever sees their own pages. Each page's content is saved as one JSON document, the format the BlockNote editor already uses. It is hosted free on Vercel, sized for you and a few friends, with a clear path to paid tiers if Luna ever grows.

## Decision

**Chosen option**: Option 1: Next.js 16 + Supabase BaaS, browser writes under RLS, hosted on Vercel.

One Next.js App Router monolith (a single deployable app) on a Supabase Postgres project per environment. Supabase Auth handles sign in by magic link with an email allowlist. All user data access goes through `supabase-js` as the signed in user, so row level security (RLS, Postgres rules that filter rows per user) is the one authorization layer.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.claude/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.claude/skills/supabase-postgres-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`) · `shadcn` (`shadcn-ui/ui`, `.claude/skills/shadcn/`) · `tanstack-query-best-practices` (`deckardger/tanstack-agent-skills`, `.claude/skills/tanstack-query-best-practices/`) · `vitest` (`antfu/skills`, `.claude/skills/vitest/`) · `playwright-best-practices` (`currents-dev/playwright-best-practices-skill`, `.claude/skills/playwright-best-practices/`) · `resend` (`resend/resend-skills`, `.claude/skills/resend/`). No skill exists for BlockNote; follow its official docs.

## Rationale

Reasoning, options, and sources: see [rationale.md](rationale.md).

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Architecture pattern | Single Next.js app (monolith), no separate API service | One person, a few users: one deployable is simplest to build, debug, and host. |
| Language | TypeScript (strict), Node 24 LTS | One language for UI, server code, and generated DB types; the block editor ecosystem is TypeScript first. |
| Framework | Next.js 16, App Router, React Server Components | Server rendering for public share pages and the landing page (SEO), plus first class Supabase SSR support. |
| Package manager | npm | Your pick; ships with Node, nothing extra to install on Vercel or locally. |
| Primary DB | Supabase Postgres | Relational data (nested pages, favorites, share links) fits Postgres; JSON columns hold editor content. |
| Data access | `supabase-js` + `@supabase/ssr`, types from `supabase gen types typescript` | Every query runs as the user, so RLS enforces ownership everywhere; generated types keep queries type safe without an ORM. |
| Write path | Browser calls Supabase directly under RLS | Autosave goes straight to the database with no extra server hop. Signed in pages read through TanStack Query on the client (no server prefetch plus hydration). Server Components render only the auth gate, public share pages, and the landing page. |
| Content storage shape | One `jsonb` BlockNote document per page, plus a derived plain text column for search | Matches the editor's native format, so autosave is one row write. Exact columns are owned by the data model spec (feature 3). |
| Client data and cache | TanStack Query (v5) wrapping `supabase-js` | Caching, optimistic updates for rename, move, and favorite, and background refetch for the sidebar tree. |
| Validation | Zod v4 | Validates env vars at boot, forms, and any JSON crossing a boundary (editor documents loaded for share pages). |
| Block editor | BlockNote (MPL 2.0 core) with the `@blocknote/shadcn` UI | Notion style slash menu, drag handles, and block JSON out of the box. Never add the paid or GPL "XL" packages without a new decision. |
| Styling and components | Tailwind CSS v4 + shadcn/ui (Radix based) | You own the component code, it is accessible by keyboard, and it is easy to tune toward Luna's calm look. Tokens come from the design system spec (feature 4). |
| Auth | Supabase Auth, email only: one email carrying both a magic link (PKCE flow) and a 6 digit code | No passwords to store or reset. The code covers a link opened on another device or already used up by an email scanner. Session cookies are handled by `@supabase/ssr`. |
| Sign up control | Email allowlist: `private.allowed_emails` checked by a Supabase "before user created" auth hook, shipped with the scaffold | Only addresses you approve can create an account, enforced on the server before the user row exists. Fallback if the hook is unavailable on the free plan: a `before insert` trigger on `auth.users` that rejects unknown emails. |
| Auth email | Resend, configured as Supabase Auth custom SMTP | Supabase's built in sender is rate limited to a few emails per hour. Resend is free at this volume and needs no app code. |
| File storage | Supabase Storage, private buckets | Object storage, not the database, with access under the same RLS model. Details are owned by feature 11. |
| Search | Postgres full text search: a generated `tsvector` over title and plain text, a GIN index, `websearch_to_tsquery` | Built in and free, plenty for one person's pages. Revisit only if search quality falls short (feature 10). |
| Background jobs | None. A single daily Vercel Cron job (keep alive), production only | Nothing needs a queue yet. Hobby cron runs once a day at an approximate time within the hour. |
| Hosting | Vercel Hobby, git deploys | Zero config for Next.js, preview deploys per push, free while Luna stays non commercial. |
| Environments | Two Supabase cloud projects: `luna-dev` and `luna-prod`. No local Docker stack | Your pick. This uses both free project slots. |
| Migrations | SQL files in `supabase/migrations/` (source of truth in git), applied by hand with the Supabase CLI: `supabase db push` to dev first, then prod | Your pick (no CI). Types are regenerated after each migration. |
| Testing | Vitest + Testing Library (units, components), Playwright (real browser flows and RLS isolation checks against `luna-dev`) | Editor and autosave behaviour need a real browser. RLS needs a test proving account B cannot read account A's pages. |
| Observability | Vercel and Supabase built in logs for now | Error monitoring is its own decision (feature 15). |
| Project structure | Feature folders (see below) | A feature's UI, hooks, and queries live together. |

### Project layout

```
src/
  app/                    # routes only (App Router); thin pages that compose features
    (auth)/sign-in/       # email entry, then code entry
    (auth)/auth/callback/route.ts  # PKCE code exchange
    (app)/                # signed in shell: sidebar + page view
    api/cron/keepalive/   # daily keep alive route
  features/<name>/        # one folder per scope feature: components, hooks, queries, schemas
  components/ui/          # shadcn/ui generated components
  lib/
    supabase/client.ts    # browser client (createBrowserClient)
    supabase/server.ts    # server client (createServerClient, cookies)
    env.ts                # Zod validated env vars
  types/database.ts       # generated by `supabase gen types typescript`
proxy.ts                  # Next.js 16 request proxy: refreshes the Supabase session cookie
supabase/
  config.toml             # committed, from `supabase init`
  migrations/             # SQL migrations, the schema source of truth
.env.example              # every env var, no values
tests/e2e/                # Playwright specs
```

### Rules the build must follow

- **RLS on every table in `public`, from the first migration.** Every user owned table has `owner_id uuid references auth.users` (or derives ownership through its parent page) and RLS enabled. A table without RLS policies never ships. Follow the `supabase` skill's security checklist, in particular:
  - Policies use `to authenticated` plus an ownership check (`(select auth.uid()) = owner_id`). The role check alone is not authorization.
  - UPDATE policies have both `using` and `with check`, and every updatable table has a SELECT policy (without one, updates silently change 0 rows).
  - Grant table access to `authenticated` explicitly in the migration if the project's Data API settings do not expose new tables automatically.
  - Never authorize from `user_metadata`. Views use `security_invoker = true`.
  - The allowlist auth hook function lives in a non exposed schema, not `public`.
- **No secret keys in the browser.** The browser and server clients use only the publishable key. Any secret (service role) key use needs a spec, stays server only, and never reaches user data paths.
- **Pin Supabase package versions and commit `package-lock.json`.**
- **Supabase clients come only from `src/lib/supabase/`.** Never construct a client elsewhere.
- **BlockNote renders only on the client** (load it with `next/dynamic` and `ssr: false`). Server rendering of shared pages is decided in feature 13's spec.
- **Generated types are committed** and regenerated from `luna-dev` after every migration (`supabase gen types typescript --linked > src/types/database.ts`). Prod must match after its `db push`.
- **The browser client is a singleton** (one `createBrowserClient` instance per tab).

### Scaffold and auth wiring

- **Sign in flow**: the sign in page calls `signInWithOtp` with the email and `emailRedirectTo` set to the current origin plus `/auth/callback`, then shows a 6 digit code field. The link path: `/auth/callback` runs `exchangeCodeForSession(code)` and redirects to `/`. The code path: `verifyOtp({ email, token, type: 'email' })` on the client. A failed or expired link redirects to `/sign-in?error=link` with the code field offered.
- **Email template**: edit the Magic Link template in each Supabase project to include both `{{ .ConfirmationURL }}` and `{{ .Token }}`. Set the OTP length to 6.
- **Session gate**: `proxy.ts` (Next.js 16's renamed middleware, Node runtime) only refreshes the session cookie. Its matcher excludes `_next/static`, `_next/image`, images and favicon, `/api/cron`, and `/auth/callback`. The `(app)` layout verifies the user on the server with `supabase.auth.getClaims()` (never `getSession()`) and redirects to `/sign-in` when there is none.
- **Allowlist**: the first migration creates schema `private`, table `private.allowed_emails (email citext primary key)`, and `private.hook_before_user_created(event jsonb)`, which rejects any email not in the table. Grant `usage` on `private` and `execute` on the function to `supabase_auth_admin`, and revoke it from `anon`, `authenticated`, and `public`. Enable the hook in each project's dashboard (Auth, Hooks), because migrations do not enable it on cloud. Seed your own email in each project by hand.
- **Keep alive**: the first migration also creates `public.ping()` returning `true` (`security invoker`, `execute` granted to `anon`). `/api/cron/keepalive` checks `Authorization: Bearer ${CRON_SECRET}`, then calls `rpc('ping')` against `luna-prod` and against `luna-dev` (via the `KEEPALIVE_DEV_*` vars). It is scheduled daily in `vercel.json`.
- **Redirects**: the `luna-dev` project allows `http://localhost:3000/**` and a Vercel preview wildcard (`https://*-<your-vercel-scope>.vercel.app/**`). `luna-prod` allows only the production URL. Site URL is set per project.
- **Tooling**: Supabase CLI as a pinned devDependency (`npx supabase`), `supabase link --project-ref <ref>` to switch target before each `db push`. Path alias `@/*` maps to `src/*`. ESLint runs through its own CLI (Next.js 16 removed `next lint`). `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test` (Vitest), `test:e2e` (Playwright with a `webServer` that runs `npm run dev`). `.gitignore` covers `.env*.local`. `shadcn init` with Tailwind v4, the neutral base color, and CSS variables (feature 4 replaces the tokens). `@blocknote/shadcn` gets its stylesheet import and receives Luna's shadcn components through its components prop.
- **Providers**: one client `Providers` component in the root layout holds the `QueryClientProvider`.

### Configuration required

- `NEXT_PUBLIC_SUPABASE_URL`: the Supabase project URL (different per environment).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the publishable key (it replaces the legacy anon key; `supabase-js` accepts it), safe for the browser under RLS.
- `CRON_SECRET`: shared secret Vercel Cron sends to the keep alive route. Production scope only.
- `KEEPALIVE_DEV_SUPABASE_URL`, `KEEPALIVE_DEV_SUPABASE_PUBLISHABLE_KEY`: server only, Production scope only, so the prod cron also pings `luna-dev`.
- **Scope mapping**: Vercel Production points at `luna-prod`. Vercel Preview, Vercel Development, and local `.env.local` point at `luna-dev`. `src/lib/env.ts` validates at request time, so `next build` does not need real values.
- Not in app env: the Resend API key and sender (a verified domain is required to email anyone but the Resend account owner) live in each Supabase project's Auth SMTP settings.

## Consequences

**Positive**:
- One language, one deployable, one authorization layer (RLS). There is very little to operate.
- Free at your scale: Supabase free tier (500 MB DB, 1 GB storage, 50K monthly users), Vercel Hobby, Resend free.
- Postgres keeps the door open for search, share links, and later features without a data store change.

**Negative / tradeoffs**:
- **RLS is the only wall.** With browser writes, a missing or wrong policy is a data leak. Policy tests are mandatory, not optional.
- **One JSON document per page means last write wins.** Two tabs editing the same page can overwrite each other. The core writing loop spec (feature 5) must pick a guard, for example an `updated_at` check on save.
- **Vendor coupling to Supabase** (Auth, Storage, hooks). The data is plain Postgres and portable; auth users and storage objects take more work to move.
- **Vercel Hobby is non commercial only.** If Luna ever charges (deferred Billing), move to Vercel Pro (about $20 a month) or another host.
- **Supabase free tier has no automatic backups.** Losing the prod project loses your notes. Backups are a blocker before real notes go into prod (see Follow-up).
- **Migrations by hand, no CI.** Nothing stops a push to main with failing tests or a migration not yet applied to prod. You run typecheck, tests, and `supabase db push` yourself, in order: dev, then prod, then merge.
- **Free projects pause after 7 idle days**, which the daily keep alive works around. If the cron job fails silently, the project still pauses.

**Neutral**:
- BlockNote's document format becomes the storage format. Upgrading BlockNote major versions may need a content migration.
- The Supabase CLI is needed locally (link, push, gen types) even without the local Docker stack.
- `AGENTS.md` does not exist yet; `/audit` (feature 2) should capture this stack once the scaffold exists.

## Follow-up

- [ ] Scaffold the project from this stack and confirm it boots and builds (this feature's next step: `/develop stack & architecture`). Run `git init` first; the folder is not a git repo yet.
- [ ] Create the `luna-dev` and `luna-prod` Supabase projects and apply the Supabase Auth settings above on each (SMTP, template, redirects, OTP length, hook).
- [ ] Create the Vercel project: connect the repo, Node 24, production branch `main`, env vars per scope as above.
- [ ] **Blocker before real notes go into prod**: backups for `luna-prod` (a scheduled `pg_dump`, for example a weekly local script, or Supabase Pro).
- [ ] Data model (feature 3) owns the exact page content columns and the plain text extraction, and may extend `private.allowed_emails`.
- [ ] Core writing loop (feature 5) owns: the first `pages` migration for the tracer bullet, the autosave debounce policy, the save conflict guard (last write wins vs an `updated_at` check), and how Playwright signs in without a real email (a test only admin helper using the secret key that mints sessions for seeded users, never shipped in app code).
- [ ] Public share links (feature 13) own how shared pages render on the server (BlockNote server side HTML vs a custom renderer).
- [ ] Error monitoring (feature 15) owns error tracking.
- [ ] Capture this stack's conventions in root `AGENTS.md` via `/audit` (feature 2), including the RLS and Supabase client rules above, and list the 8 installed Agent Skills in its `## Agent skills` section (all project wide except `resend`, which belongs with auth email config).
- [x] Supabase MCP connected (2026-10-07). Keep it pointed at `luna-dev` only, with a scoped access token, never `luna-prod`.
- [ ] Other MCP servers offered but not yet connected (optional): Next.js DevTools MCP, Playwright MCP, Vercel MCP, Resend MCP. Each gives the agent live access to that system instead of guesses.
