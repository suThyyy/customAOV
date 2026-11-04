-- HUY-10 follow-up: API operations missing from the applied HUY-9 foundation.
-- Review/apply after HUY-9 migrations. Do not edit applied migration history.
-- This migration does not change Quick Randomizer, Firebase or localStorage.

begin;

-- A Host may add a nickname-only player without creating an auth.users row.
-- The room_members primary key is the internal identity for this player.
alter table public.room_members
  alter column user_id drop not null;

alter table public.room_members
  drop constraint if exists room_members_identity_check;

alter table public.room_members
  add constraint room_members_identity_check
  check (
    (member_kind = 'account' and user_id is not null)
    or (member_kind = 'guest' and user_id is null)
  );

create or replace function public.close_open_room(p_room_id uuid)
returns public.rooms
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  closed_room public.rooms;
begin
  if coalesce(auth.role(), '') <> 'authenticated'
     or auth.uid() is null
     or public.huy9_is_anonymous_session() then
    raise exception 'Permanent authenticated Host required';
  end if;
  update public.rooms
  set status = 'closed', closed_at = statement_timestamp(), version = version + 1
  where id = p_room_id
    and host_user_id = auth.uid()
    and status = 'open'
  returning * into closed_room;
  if not found then raise exception 'Only the active Room Host can close this Room'; end if;
  return closed_room;
end;
$$;

create or replace function public.host_add_player_to_room(
  p_room_id uuid,
  p_display_name text
)
returns public.room_members
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_room public.rooms;
  added_member public.room_members;
begin
  if auth.role() <> 'authenticated' or auth.uid() is null
     or public.huy9_is_anonymous_session() then
    raise exception 'Permanent authenticated Host required';
  end if;
  if p_display_name is null or length(btrim(p_display_name)) not between 1 and 40 then
    raise exception 'Invalid display name';
  end if;

  select * into target_room from public.rooms
  where id = p_room_id and host_user_id = auth.uid()
  for update;
  if not found or target_room.status <> 'open' then
    raise exception 'Only the active Room Host can add a Player';
  end if;

  insert into public.room_members
    (room_id, user_id, member_kind, display_name)
  values
    (p_room_id, null, 'guest', btrim(p_display_name))
  returning * into added_member;

  insert into public.room_queue_entries (room_id, member_id)
  values (p_room_id, added_member.id);
  return added_member;
end;
$$;

create or replace function public.host_kick_room_member(
  p_room_id uuid,
  p_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_room public.rooms;
begin
  if coalesce(auth.role(), '') <> 'authenticated'
     or auth.uid() is null
     or public.huy9_is_anonymous_session() then
    raise exception 'Permanent authenticated Host required';
  end if;
  select * into target_room from public.rooms
  where id = p_room_id and host_user_id = auth.uid()
  for update;
  if not found then raise exception 'Only the Room Host can kick members'; end if;
  if exists (select 1 from public.room_members where id = p_member_id and user_id = target_room.host_user_id) then
    raise exception 'The Room Host cannot kick themselves';
  end if;

  update public.room_members
  set status = 'kicked', left_at = statement_timestamp()
  where room_id = p_room_id and id = p_member_id and status <> 'kicked';
  if not found then raise exception 'Room member not found'; end if;

  update public.room_queue_entries
  set status = 'removed'
  where room_id = p_room_id and member_id = p_member_id
    and status in ('waiting', 'selected');
  -- Current-round snapshot rows are intentionally retained until Host ends
  -- the Round; kicking does not mutate an already locked Round snapshot.
end;
$$;

create or replace function public.host_requeue_room_member(
  p_room_id uuid,
  p_member_id uuid
)
returns public.room_queue_entries
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_room public.rooms;
  target_member public.room_members;
  requeued_entry public.room_queue_entries;
begin
  if coalesce(auth.role(), '') <> 'authenticated'
     or auth.uid() is null
     or public.huy9_is_anonymous_session() then
    raise exception 'Permanent authenticated Host required';
  end if;
  select * into target_room from public.rooms
  where id = p_room_id and host_user_id = auth.uid()
  for update;
  if not found or target_room.status <> 'open' then
    raise exception 'Only the active Room Host can requeue a Player';
  end if;

  select * into target_member from public.room_members
  where room_id = p_room_id and id = p_member_id
  for update;
  if not found or target_member.status <> 'active' or target_member.user_id is not null then
    raise exception 'Only an active Host-added Player can be requeued by the Host';
  end if;

  if exists (
    select 1 from public.room_queue_entries
    where room_id = p_room_id and member_id = p_member_id
      and status in ('waiting', 'selected')
  ) then
    raise exception 'Player is already in the active Queue';
  end if;

  insert into public.room_queue_entries (room_id, member_id)
  values (p_room_id, p_member_id)
  returning * into requeued_entry;
  return requeued_entry;
end;
$$;

revoke all on function public.close_open_room(uuid) from public, anon, authenticated;
revoke all on function public.host_add_player_to_room(uuid, text) from public, anon, authenticated;
revoke all on function public.host_kick_room_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.host_requeue_room_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.close_open_room(uuid) to authenticated;
grant execute on function public.host_add_player_to_room(uuid, text) to authenticated;
grant execute on function public.host_kick_room_member(uuid, uuid) to authenticated;
grant execute on function public.host_requeue_room_member(uuid, uuid) to authenticated;

commit;
