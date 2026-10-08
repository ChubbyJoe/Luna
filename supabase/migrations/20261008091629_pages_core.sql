-- Spec 0002 M1: the pages table, shipped with feature 5 (core writing loop).
-- Later slices only add to it (spec 0002 AC-13).

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id uuid,
  position text collate "C" not null,
  title text not null default '',
  content jsonb not null default '[]'::jsonb,
  content_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Target of the composite FKs, so a parent (and later a file or share link) has the same owner.
  constraint pages_id_owner_key unique (id, owner_id),
  constraint pages_parent_fkey foreign key (parent_id, owner_id)
    references public.pages (id, owner_id) on delete cascade,

  constraint pages_position_check check (position ~ '^[0-9A-Za-z]{1,128}$'),
  constraint pages_title_length check (char_length(title) <= 500),
  constraint pages_content_is_array check (jsonb_typeof(content) = 'array'),
  constraint pages_content_size check (octet_length(content::text) <= 2097152),
  constraint pages_content_text_size check (octet_length(content_text) <= 524288)
);

comment on column public.pages.updated_at is
  'Last edited: moved only when title, content, or content_text change (private.set_updated_at).';

-- Sidebar order per parent; made partial on deleted_at in M3.
create index pages_owner_parent_position_idx on public.pages (owner_id, parent_id, position);
-- Cascades and recursive walks down the tree.
create index pages_parent_id_idx on public.pages (parent_id);

-- "Last edited" means a text change: reorders, and later trash, icon, and cover changes leave it alone.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.title is distinct from old.title
    or new.content is distinct from old.content
    or new.content_text is distinct from old.content_text then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated;

create trigger pages_set_updated_at
  before update on public.pages
  for each row
  execute function private.set_updated_at();

-- One owner per row. No anon policy, so anon gets 42501 from the grants below.
alter table public.pages enable row level security;

create policy "owners select their pages"
  on public.pages for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "owners insert their pages"
  on public.pages for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "owners update their pages"
  on public.pages for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owners delete their pages"
  on public.pages for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- Column level grants: clients never write owner_id, created_at, updated_at, or an existing id.
revoke all on table public.pages from anon, authenticated;
grant select, delete on table public.pages to authenticated;
grant insert (id, parent_id, position, title, content, content_text) on table public.pages to authenticated;
grant update (parent_id, position, title, content, content_text) on table public.pages to authenticated;
