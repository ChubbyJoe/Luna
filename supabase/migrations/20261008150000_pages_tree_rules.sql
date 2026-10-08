-- Spec 0002 M2: the tree rules on `pages`, shipped with feature 6 (page tree and sidebar, spec 0005).
-- Additive only: one trigger function and its trigger.

-- Rejects a parent that would make a cycle (LN001) or a tree deeper than 64 levels (LN003).
-- Runs as the caller, so RLS limits both walks to the caller's own rows.
create or replace function private.check_page_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_depth int := 0;
  subtree_height int := 0;
  meets_self boolean := false;
begin
  -- A reorder that names parent_id without changing it costs nothing.
  if tg_op = 'UPDATE' and new.parent_id is not distinct from old.parent_id then
    return new;
  end if;

  -- One tree write per owner at a time, taken before any read, so the walks
  -- below see a crossing move that committed while this one waited.
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));

  -- Spec 0002 M3 (feature 8) adds its LN002 check here.

  -- Walk up from the new parent. The level guard ends the walk even on corrupt data.
  if new.parent_id is not null then
    with recursive ancestors (id, parent_id, level) as (
      select p.id, p.parent_id, 1
      from public.pages p
      where p.id = new.parent_id
      union all
      select p.id, p.parent_id, a.level + 1
      from public.pages p
      join ancestors a on p.id = a.parent_id
      where a.level < 65
    )
    select count(*), coalesce(bool_or(ancestors.id = new.id), false)
    into parent_depth, meets_self
    from ancestors;
  end if;

  if tg_op = 'UPDATE' then
    -- A new row has no descendants, so only a move can close a loop.
    if meets_self then
      raise exception 'move would create a cycle' using errcode = 'LN001';
    end if;

    with recursive descendants (id, level) as (
      select p.id, 1
      from public.pages p
      where p.parent_id = new.id
      union all
      select p.id, d.level + 1
      from public.pages p
      join descendants d on p.parent_id = d.id
      where d.level < 65
    )
    select coalesce(max(level), 0) into subtree_height from descendants;
  end if;

  if parent_depth + 1 + subtree_height > 64 then
    raise exception 'deeper than 64 levels' using errcode = 'LN003';
  end if;

  return new;
end;
$$;

revoke execute on function private.check_page_parent() from public, anon, authenticated;

create trigger pages_check_parent
  before insert or update of parent_id on public.pages
  for each row
  execute function private.check_page_parent();
