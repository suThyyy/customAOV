-- HUY-8: controlled Game UID linking/change with server-side cooldown.
-- Review/apply on Supabase Development first. This migration is not executed
-- by the repository and does not touch Firebase, Randomizer or Phase 1 data.

begin;

alter table public.game_profiles
  add column if not exists uid_changed_at timestamptz,
  add column if not exists uid_change_available_at timestamptz;

-- Authenticated clients must not update game_profiles rows directly. The RPC
-- below is the only client path for game_uid linking/change.
revoke update on public.game_profiles from public, anon, authenticated;

create or replace function public.request_game_uid_change(new_game_uid text)
returns public.game_profiles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target public.game_profiles;
  normalized_uid text := nullif(btrim(new_game_uid), '');
begin
  if coalesce(auth.role(), '') <> 'authenticated' or auth.uid() is null then
    raise exception 'authenticated user required';
  end if;

  if normalized_uid is null then
    raise exception 'game UID is required';
  end if;

  select *
  into target
  from public.game_profiles
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'game profile not found';
  end if;

  if target.game_uid is not distinct from normalized_uid then
    return target;
  end if;

  if target.uid_change_available_at is not null
     and statement_timestamp() < target.uid_change_available_at then
    raise exception 'game UID can be changed again after %', target.uid_change_available_at;
  end if;

  update public.game_profiles
  set game_uid = normalized_uid,
      uid_changed_at = statement_timestamp(),
      uid_change_available_at = statement_timestamp() + interval '30 days'
  where user_id = auth.uid()
  returning * into target;

  return target;
end;
$$;

revoke all on function public.request_game_uid_change(text)
from public, anon, authenticated;
grant execute on function public.request_game_uid_change(text)
to authenticated;

commit;
