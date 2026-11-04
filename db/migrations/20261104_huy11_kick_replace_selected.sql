-- HUY-11 incremental fix: Host Kick updates the preparing snapshot.
-- Apply after the HUY-9/HUY-10 room migrations. Do not edit applied history.

begin;

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
  target_member public.room_members;
  old_player public.room_current_players;
  next_queue public.room_queue_entries;
begin
  if coalesce(auth.role(), '') <> 'authenticated'
     or auth.uid() is null
     or public.huy9_is_anonymous_session() then
    raise exception 'Permanent authenticated Host required';
  end if;

  select * into target_room
  from public.rooms
  where id = p_room_id
    and host_user_id = auth.uid()
  for update;
  if not found or target_room.status <> 'open' then
    raise exception 'Only the active Room Host can kick members';
  end if;

  select * into target_member
  from public.room_members
  where room_id = p_room_id
    and id = p_member_id
  for update;
  if not found then raise exception 'Room member not found'; end if;
  if target_member.user_id = target_room.host_user_id then
    raise exception 'The Room Host cannot kick themselves';
  end if;

  if target_room.current_round_state = 'preparing' then
    select * into old_player
    from public.room_current_players
    where room_id = p_room_id
      and member_id = p_member_id
    for update;

    if found then
      select q.* into next_queue
      from public.room_queue_entries q
      join public.room_members m on m.id = q.member_id
      where q.room_id = p_room_id
        and q.status = 'waiting'
        and m.status = 'active'
        and q.member_id <> p_member_id
      order by q.queue_seq
      limit 1
      for update of q;

      update public.room_queue_entries
      set status = 'removed'
      where id = old_player.queue_entry_id;

      if next_queue.id is not null then
        update public.room_current_players
        set member_id = next_queue.member_id,
            queue_entry_id = next_queue.id,
            ready_state = 'pending',
            team = null,
            skill_mode = null,
            skill_value = null,
            skill_score = null
        where room_id = p_room_id
          and slot = old_player.slot;

        update public.room_queue_entries
        set status = 'selected', selected_round_no = target_room.current_round_no
        where id = next_queue.id;
      else
        delete from public.room_current_players
        where room_id = p_room_id
          and member_id = p_member_id;
      end if;
    end if;
  end if;

  update public.room_members
  set status = 'kicked', left_at = statement_timestamp()
  where room_id = p_room_id
    and id = p_member_id
    and status <> 'kicked';
  if not found then raise exception 'Room member is already kicked'; end if;

  update public.room_queue_entries
  set status = 'removed'
  where room_id = p_room_id
    and member_id = p_member_id
    and status in ('waiting', 'selected');
end;
$$;

revoke all on function public.host_kick_room_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.host_kick_room_member(uuid, uuid) to authenticated;

commit;
