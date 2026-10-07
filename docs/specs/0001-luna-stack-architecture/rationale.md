# 0001. Luna stack and architecture: rationale

Decision record for [index.md](index.md). `/develop` does not need this file.

## Context

> ⚠️ Premise note: the chosen write path (browser straight to Supabase) and storage shape (one JSON document per page) make row level security the only authorization layer, and make concurrent edits last write wins. Both are fine for one person and a few friends, but they fail silently: a missing policy leaks pages, and a second tab silently overwrites text. The right framing is to accept them as deliberate and guard each with a test or a later spec (RLS isolation tests from the first migration; a save conflict guard in feature 5), not to treat them as free.

Luna is a simpler Notion for one person: nested pages, a block editor with a slash menu and drag to reorder, autosave as you type, quick full text search, private uploads, and public read only share links with SEO metadata. The first users are the owner and a few friends. It is a web app only; offline editing, native apps, and real time collaboration are deferred.

The forces: a team of one, so operational load must be near zero; hosting should cost nothing at this scale; the block editor is the hardest and most visible part, so the stack must have a strong editor ecosystem; public share pages need server rendering for SEO; and data isolation between accounts is non negotiable even with only a few users. The owner prefers TypeScript end to end and a managed backend over running their own.

Without a decision, every later slice (data model, design system, the core writing loop walking skeleton) has nothing to build on. The scope's build approach is Tracer Bullet, so the stack must make a thin end to end thread (sign in, create a page, type, reload) cheap to stand up.

## Options considered

### Option 1: Next.js 16 + Supabase BaaS, browser writes under RLS, Vercel (chosen)

One Next.js app; Supabase provides Postgres, Auth, Storage, and RLS; the browser writes directly as the signed in user.

**Pros**: one vendor covers database, auth, and storage; Postgres full text search and JSON built in; least code (no API layer); free tier fits; strong Next.js integration (basis: Supabase SSR guides, managed application platform over self hosting).

**Cons**: RLS is the single wall; coupling to Supabase Auth and Storage; free projects pause after 7 idle days and have no automatic backups.

### Option 2: Next.js + managed Postgres (Neon) + Drizzle + a self hosted auth library + object storage (R2 or S3)

You own the backend code: Server Actions or route handlers over Drizzle, auth through a library you host yourself, files in an S3 compatible bucket.

**Pros**: full control and portability; Drizzle gives TypeScript schema and migrations; no BaaS lock in.

**Cons**: three or four services to wire and operate; you write and secure every API path and session yourself; more code before the first tracer bullet runs.

### Option 3: Next.js + Convex

Convex's reactive TypeScript database and functions, with its auth integration.

**Pros**: live updating queries for free; backend logic in TypeScript; excellent developer experience for sync heavy apps.

**Cons**: not Postgres, so no SQL full text search or joins as you know them; less portable data; separate file storage and auth story; a smaller ecosystem for editor persistence patterns.

### Option 4: React Router v7 (framework mode) + Supabase

Same backend as Option 1, with React Router's loader and action model instead of Next.js.

**Pros**: simpler mental model than Server Components; stable SSR; fewer framework surprises.

**Cons**: fewer Supabase and shadcn examples; Vercel is less tuned for it than for Next.js; no advantage for a client heavy editor app.

## Rationale

The deciding forces are a team of one and zero hosting cost. Option 1 is the only stack where a single managed service covers the database, sign in, files, and access control, so the tracer bullet (sign in, type, reload) needs almost no backend code (basis: monolith first, managed application platform for small teams). Option 2 is the strongest long term alternative, but it front loads auth, API, and storage work that Luna does not need yet, and building that security yourself is where small apps get breached (basis: reinventing auth is a known failure pattern). Option 3 trades away Postgres, which Luna's relational shape (nested pages, favorites, share links) and full text search both want (basis: relational database as the default). Option 4 changes only the framework and loses Next.js's tighter Vercel and Supabase fit.

Within Option 1, writing from the browser under RLS and storing one BlockNote JSON document per page keep autosave to one row write with no server hop, which matters most for an editor that saves as you type. The price, RLS as the only wall and last write wins, is accepted deliberately and pinned down in the Consequences and Follow-up (basis: defense through tested policies, not code paths).

The owner picked npm over pnpm, a cloud dev project over the local Docker stack, and manual migrations over CI. Each is workable at this size. The manual deploy flow is the one to watch: with the Beta tier on several features, a skipped test run or a migration not yet pushed to prod is the most likely way to break production, so the order (dev push, test, prod push, merge) is written into the Consequences.

A cross check on another model (2026-10-07) found gaps the scaffold would otherwise invent: the auth callback and server session check, a keep alive that RLS would have made a no op and that missed the dev project, env scope mapping, preview redirect URLs, and the allowlist wiring. These are settled in `index.md` under *Scaffold and auth wiring*. It also surfaced that one time links break when opened on another device or prefetched by email scanners, so the email now carries a 6 digit code as well.

### Landscape check (2026-10-07)

- Supabase free tier: 500 MB DB, 1 GB storage, 50K monthly active users, 2 active projects, pauses after 1 week inactive.
- Next.js 16.4 current, App Router stable. React Router v7 stable. TanStack Start still a release candidate. SvelteKit stable.
- BlockNote: MPL 2.0 core free for commercial use; XL packages GPL 3.0 or paid; slash menu and drag handles built in. Tiptap: MIT core plus Pro extensions.
- Drizzle has official Supabase support including RLS helpers; supabase-js with generated types remains the standard path.
- Vercel Hobby: free, non commercial only. Netlify free allows commercial use (pricing changed April 2026).
- Supabase full text search: `to_tsvector`, `websearch_to_tsquery`, GIN indexes.

## References

**Project sources**:
- `docs/scope/scope.md`: feature 1 (Stack & architecture), the Tracer Bullet approach, and the deferred list (offline, native apps, collaboration, billing).

**Practices & standards**:
- Monolith first for small teams
- Relational database as the default primary store
- Never build auth from scratch; use a proven service
- Database built in full text search before a dedicated engine
- Managed application platform over self operated infrastructure
- Row level security as defense in depth, verified by isolation tests

**Links** (web verified 2026-10-07):
- Supabase pricing: https://supabase.com/pricing
- Supabase full text search: https://supabase.com/docs/guides/database/full-text-search
- Next.js docs: https://nextjs.org/docs
- BlockNote: https://www.blocknotejs.org
- Drizzle ORM: https://orm.drizzle.team
- Vercel pricing: https://vercel.com/pricing
