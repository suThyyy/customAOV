-- HUY-9 follow-up: keep Anonymous Auth Guests out of Phase 2.1 profiles.
-- Do not edit the already-applied HUY-5 migration history.
-- This migration does not create Room data and does not touch Firebase.
--
-- Architecture decision:
-- A Guest needs an auth identity UUID and room_members.nickname only. A Guest
-- does not need profiles/game_profiles. Anonymous Auth creation therefore
-- skips the HUY-5 profile inserts. When an anonymous identity is upgraded to
-- a permanent account, the UPDATE trigger creates the missing profiles.

begin;

create or replace function public.huy9_ensure_user_profiles(
  p_user_id uuid,
  p_metadata jsonb,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  fallback_name text;
begin
  fallback_name := coalesce(
    nullif(btrim(p_metadata->>'display_name'), ''),
    nullif(split_part(coalesce(p_email, ''), '@', 1), ''),
    'User ' || left(p_user_id::text, 8)
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (p_user_id, fallback_name, p_metadata->>'avatar_url')
  on conflict (id) do nothing;

  insert into public.game_profiles (user_id, ingame_name, current_rank)
  values (
    p_user_id,
    coalesce(nullif(btrim(p_metadata->>'ingame_name'), ''), fallback_name),
    coalesce(nullif(btrim(p_metadata->>'current_rank'), ''), 'Unranked')
  )
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  is_anonymous_user boolean := coalesce((to_jsonb(new)->>'is_anonymous')::boolean, false);
begin
  -- Anonymous Auth users only need auth.uid() for Room membership. Their
  -- nickname is collected by join_open_room(), not stored as a profile.
  if is_anonymous_user then
    return new;
  end if;

  perform public.huy9_ensure_user_profiles(
    new.id, new.raw_user_meta_data, new.email
  );
  return new;
end;
$$;

create or replace function public.handle_anonymous_user_upgrade()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  was_anonymous boolean := coalesce((to_jsonb(old)->>'is_anonymous')::boolean, false);
  is_anonymous_user boolean := coalesce((to_jsonb(new)->>'is_anonymous')::boolean, false);
begin
  if was_anonymous and not is_anonymous_user then
    perform public.huy9_ensure_user_profiles(
      new.id, new.raw_user_meta_data, new.email
    );
  end if;
  return new;
end;
$$;

-- Keep the existing HUY-5 INSERT trigger and add a narrowly scoped UPDATE
-- trigger. The function checks the transition using JSON so this migration
-- remains compatible with Auth schemas where the column is exposed differently.
drop trigger if exists on_auth_user_anonymous_upgrade on auth.users;
create trigger on_auth_user_anonymous_upgrade
after update on auth.users
for each row execute function public.handle_anonymous_user_upgrade();

-- HUY-8 grants this RPC to the authenticated role, which also includes
-- Anonymous Auth sessions. Keep the existing permanent-user operation closed
-- to Guests without changing the already-applied HUY-8 migration file.
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
  if coalesce(auth.role(), '') <> 'authenticated'
     or auth.uid() is null
     or public.huy9_is_anonymous_session() then
    raise exception 'permanent authenticated user required';
  end if;
  if normalized_uid is null then
    raise exception 'game UID is required';
  end if;

  select * into target
  from public.game_profiles
  where user_id = auth.uid()
  for update;
  if not found then raise exception 'game profile not found'; end if;
  if target.game_uid is not distinct from normalized_uid then return target; end if;
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
grant execute on function public.request_game_uid_change(text) to authenticated;

revoke all on function public.huy9_ensure_user_profiles(uuid, jsonb, text)
from public, anon, authenticated;
revoke all on function public.handle_anonymous_user_upgrade()
from public, anon, authenticated;

commit;
