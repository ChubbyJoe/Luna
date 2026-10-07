# Verify: Stack & architecture · spec 0001 · updated 2026-10-07
_Steps derived from spec 0001's scaffold and auth wiring (a decision spec, so no numbered acceptance criteria; each step names the rule it checks). `/check verify` runs these; `/test` locks the durable ones._

## Before you start
- [ ] `npx supabase link --project-ref <luna-dev ref>` then `npx supabase db push` → migration `20261007163711_init_allowlist_and_ping` applied
- [ ] `npm run db:types` → `src/types/database.ts` replaced with generated output, `npm run typecheck` still passes
- [ ] In luna-dev: Auth, Hooks → enable "Before user created" with `private.hook_before_user_created`; insert your email into `private.allowed_emails`; Magic Link template includes `{{ .ConfirmationURL }}` and `{{ .Token }}`; OTP length 6; redirect `http://localhost:3000/**` allowed
- [ ] `.env.local` filled from `.env.example` with luna-dev values

## UI / manual
- [ ] Signed out, open `/` → lands on `/sign-in`                                 → session gate
- [ ] Enter your allowlisted email, open the link from the email → lands on `/` signed in → sign in by link (PKCE)
- [ ] Sign out, request again, type the 6 digit code instead → lands on `/` signed in   → sign in by code
- [ ] Request a sign in for an email NOT in `private.allowed_emails` → an error shows, no user row is created in `auth.users` → allowlist hook
- [ ] Open the same magic link a second time → `/sign-in?error=link` with email and code fields → failed link fallback
- [ ] Reload `/` after an hour (or after the access token expires) → still signed in        → proxy refreshes the session cookie

## Commands
- [ ] `npm run build` with no env vars set → passes                                → env validated at request time
- [ ] `npm run lint && npm run typecheck && npm test` → all pass                     → tooling
- [ ] `npm run test:e2e` → 2 passed                                                → gate and failed link UI
- [ ] `curl -i localhost:3000/auth/callback?code=bogus` → 307 to `/sign-in?error=link` → callback error path
- [ ] `curl -i localhost:3000/api/cron/keepalive` (with the keep alive vars set, no bearer) → 401 → cron auth
- [ ] Same with `Authorization: Bearer $CRON_SECRET` → `{"ok":true}`                 → `public.ping()` reachable as anon
- [ ] In the SQL editor as `authenticated`: `select * from private.allowed_emails` → permission denied → allowlist not exposed

## Coverage
- Session gate, link and code sign in, failed link fallback, allowlist hook, keep alive, env at request time, private schema grants: each covered by a step above.
