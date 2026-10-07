# Luna

A simpler Notion for one person: nested pages, a calm block editor, and quick search.
Stack and reasoning: [docs/specs/0001-luna-stack-architecture](docs/specs/0001-luna-stack-architecture/index.md).

## Run it locally

1. Use Node 24 and install: `npm install`
2. Copy `.env.example` to `.env.local` and fill in the `luna-dev` URL and publishable key.
3. Start: `npm run dev`, then open http://localhost:3000

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (needs no env values) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route types plus `tsc` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright flows against the dev server |
| `npm run db:types` | Regenerate `src/types/database.ts` from the linked project |

## Database changes

Migrations live in `supabase/migrations/`. Apply them by hand, dev first:

```
npx supabase link --project-ref <luna-dev ref>
npx supabase db push
npm run db:types
```

Then link to `luna-prod`, push again, and merge.
