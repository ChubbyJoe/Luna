# Luna

A simpler Notion for one person: nested pages, a calm block editor, and quick search.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Stack

- **Language / Runtime**: TypeScript (strict), Node 24 LTS
- **Framework**: Next.js 16 App Router (React 19, Server Components), one monolith on Vercel Hobby
- **Data / auth**: Supabase (Postgres, Auth by magic link plus 6 digit code, Storage), `supabase-js` + `@supabase/ssr`, RLS as the only authorization layer; two cloud projects, `luna-dev` and `luna-prod`, no local Docker
- **Key dependencies**: TanStack Query v5, Zod v4, shadcn/ui on Tailwind v4, BlockNote (MPL core + `@blocknote/shadcn` only), Resend via Supabase SMTP
- **Tests**: Vitest + Testing Library, Playwright against `luna-dev`
- **Package manager**: npm (commit `package-lock.json`)

Full decision: [docs/specs/0001-luna-stack-architecture](docs/specs/0001-luna-stack-architecture/index.md).

## Build approach

Tracer Bullet: prove one real path through every layer first, then thicken it one strand at a time.

## Commands

```bash
npm install
npm run dev            # dev server on :3000
npm run build
npm run lint && npm run typecheck
npm run format         # Prettier write (format:check to only check)
npm test               # Vitest
npm run test:e2e       # Playwright
# Migrations: link luna-dev, push, regen types; then luna-prod, push, then merge
npx supabase link --project-ref <ref> && npx supabase db push && npm run db:types
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title/index.md` (plus `rationale.md`, `verify.md`). Scope lives in `docs/scope/scope.md`.

## Rules

- **Functional style**: pure functions by default; side effects (Supabase calls, storage, navigation) live at the edges, in hooks, route handlers, and server components. No classes where a function works, no shared mutable module state, never mutate data in place.
- **Folder by feature**: `src/features/<name>/` holds its components, hooks, queries, and schemas; `src/app/` holds thin routes only; `src/components/ui/` is shadcn output.
- **Named exports only**, except where Next.js requires a default export (`page`, `layout`, route config files).
- **Kebab case file names** (`sign-in-form.tsx`); PascalCase components, camelCase functions, `useX` hooks.
- **Errors**: always check the `error` from every Supabase call; expected failures return or surface a friendly message, never get swallowed; throw only for the truly unexpected. Validate every boundary with Zod (env, forms, JSON loaded from the database).
- **RLS on every `public` table from its first migration**: `to authenticated` plus `(select auth.uid()) = owner_id`, UPDATE with both `using` and `with check`, a SELECT policy on every updatable table. Never authorize from `user_metadata`; views use `security_invoker = true`.
- **Supabase clients come only from `src/lib/supabase/`**; publishable key only, no secret key in the browser. Auth checks on the server use `getClaims()`, never `getSession()`.
- **BlockNote renders client only** (`next/dynamic` with `ssr: false`). Signed in data reads go through TanStack Query.
- **Every migration** regenerates and commits `src/types/database.ts`; apply to dev, then prod, then merge.
- **Tests with each feature**: Vitest for logic and schemas, Playwright for real flows, and an RLS isolation test (account B cannot read account A) for every new table.
- **Design system**: build all UI to [docs/design.md](docs/design.md); token values live in `src/app/globals.css`. Lint rejects raw palette or arbitrary color classes (`text-gray-500`, `bg-[#fff]`) everywhere in `src/` except `src/components/ui/`.
- **Toasts** only through the `notify` helpers in `src/lib/notify.ts`, for background errors and undoable actions, never for visible success.
- **E2E specs** import `test` and `expect` from `tests/e2e/fixtures.ts`, which fails any test whose page logs a console error.
- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.

## Tooling

- ESLint (`eslint-config-next`, with `eslint-config-prettier` last) + Prettier with `prettier-plugin-tailwindcss` (sorts classes in `cn()` and `cva()` too).
- Prettier skips Markdown, SQL, generated types, and `.claude/skills/` (see `.prettierignore`); docs are edited line by line by the workflow skills.
- Pre commit: Husky + lint-staged runs `eslint --fix` and Prettier on staged files, then `npm run typecheck` (`.husky/pre-commit`).
- No CI for now (spec decision); run lint, typecheck, and tests yourself before merging.

## Git

- integration: on
- branch prefix: feat/
- commit: per-milestone

## Agent skills

- [supabase](.claude/skills/supabase/): `supabase/agent-skills`, Auth, RLS, SSR clients, CLI, security checklist
- [supabase-postgres-best-practices](.claude/skills/supabase-postgres-best-practices/): `supabase/agent-skills`, schema, migrations, policies, indexes
- [vercel-react-best-practices](.claude/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, React and Next.js performance
- [shadcn](.claude/skills/shadcn/): `shadcn-ui/ui`, adding and composing shadcn/ui components
- [tanstack-query-best-practices](.claude/skills/tanstack-query-best-practices/): `deckardger/tanstack-agent-skills`, queries, mutations, cache
- [vitest](.claude/skills/vitest/): `antfu/skills`, unit and component tests
- [playwright-best-practices](.claude/skills/playwright-best-practices/): `currents-dev/playwright-best-practices-skill`, e2e and RLS isolation flows
- [resend](.claude/skills/resend/): `resend/resend-skills`, auth email only (configured in Supabase SMTP)

No skill exists for BlockNote; follow its official docs.
MCP servers: supabase (connected, `luna-dev` only, never `luna-prod`), Next.js DevTools (recommended), Playwright (recommended), Vercel (recommended), Resend (recommended)

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->
- [src/features/shell/AGENTS.md](src/features/shell/AGENTS.md): the signed in shell (sidebar, top bar, account menu, mobile drawer, error states)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
