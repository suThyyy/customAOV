-- HUY-10 scope correction for the already-applied HUY-9 foundation.
-- Account Players may self-join; Host-added Players are created only by the
-- host_add_player_to_room RPC. Anonymous Auth is intentionally rejected.
-- Apply after 20261103_huy9_open_room_security.sql and before Room clients.

begin;

create or replace function public.join_open_room(
  p_invite_code text,
  p_display_name text
)
returns public.room_members
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.rooms;
  existing_member public.room_members;
  joined_member public.room_members;
begin
  if coalesce(auth.role(), '') <> 'authenticated'
     or current_user_id is null
     or public.huy9_is_anonymous_session() then
    raise exception 'Permanent authenticated account required';
  end if;
  if p_invite_code is null or length(btrim(p_invite_code)) < 12
     or p_display_name is null or length(btrim(p_display_name)) not between 1 and 40 then
    raise exception 'Invalid invite code or display name';
  end if;

  select * into target_room
  from public.rooms
  where invite_code = btrim(p_invite_code)
  for update;
  if not found or target_room.status <> 'open' then
    raise exception 'Room not found or already closed';
  end if;

  select * into existing_member
  from public.room_members
  where room_id = target_room.id and user_id = current_user_id
  for update;

  if found and existing_member.status = 'kicked' then
    raise exception 'This participant was kicked from the room';
  end if;
  if found and existing_member.status = 'active' then
    return existing_member;
  end if;

  if found then
    update public.room_members
    set status = 'active', display_name = btrim(p_display_name),
        joined_at = statement_timestamp(), left_at = null,
        member_kind = 'account'
    where id = existing_member.id
    returning * into joined_member;
  else
    insert into public.room_members (room_id, user_id, member_kind, display_name)
    values (target_room.id, current_user_id, 'account', btrim(p_display_name))
    returning * into joined_member;
  end if;

  insert into public.room_queue_entries (room_id, member_id)
  values (target_room.id, joined_member.id);
  return joined_member;
end;
$$;

revoke all on function public.join_open_room(text, text) from public, anon, authenticated;
grant execute on function public.join_open_room(text, text) to authenticated;

commit;
