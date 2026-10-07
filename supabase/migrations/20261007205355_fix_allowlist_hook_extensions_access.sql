-- The hook runs as supabase_auth_admin, which has no usage on the `extensions` schema,
-- so the citext type and operator lookups failed ("Error running hook URI").
-- Compare as lowercase text instead: no extensions schema access needed.

create or replace function private.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  user_email text := lower(event -> 'user' ->> 'email');
begin
  if user_email is not null and exists (
    select 1
    from private.allowed_emails
    where lower(email::text) = user_email
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

-- create or replace keeps existing grants; restated so this file stands on its own.
grant execute on function private.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function private.hook_before_user_created(jsonb) from public, anon, authenticated;
