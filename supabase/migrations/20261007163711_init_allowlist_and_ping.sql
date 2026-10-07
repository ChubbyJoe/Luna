-- Sign up allowlist: only approved emails can create an account.
-- The hook is enabled per project in the dashboard (Auth, Hooks); migrations do not enable it on cloud.

create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.allowed_emails (
  email extensions.citext primary key
);

alter table private.allowed_emails enable row level security;

-- Only the auth hook reads this table. Rows are added by hand per project.
create policy "auth admin reads allowed emails"
  on private.allowed_emails
  for select
  to supabase_auth_admin
  using (true);

create or replace function private.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  user_email extensions.citext := (event -> 'user' ->> 'email');
begin
  if user_email is not null and exists (
    select 1
    from private.allowed_emails
    where email operator(extensions.=) user_email
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'message', 'This email is not allowed to sign up.',
      'http_code', 403
    )
  );
end;
$$;

grant usage on schema private to supabase_auth_admin;
grant select on table private.allowed_emails to supabase_auth_admin;
grant execute on function private.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function private.hook_before_user_created(jsonb) from public, anon, authenticated;

-- Keep alive: a cheap call the daily cron makes so free projects do not pause.

create or replace function public.ping()
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select true;
$$;

revoke execute on function public.ping() from public;
grant execute on function public.ping() to anon;
