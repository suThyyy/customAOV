begin;
-- Take the Room lock before membership/queue locks on every client entry path.
alter function public.continue_open_room_queue(uuid) rename to phase3_internal_continue;
revoke all on function public.phase3_internal_continue(uuid) from public,anon,authenticated;
create function public.continue_open_room_queue(p_room_id uuid) returns public.room_queue_entries
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if public.huy9_is_anonymous_session() then raise exception 'Permanent account required'; end if;
 perform 1 from public.rooms where id=p_room_id and status='open' for update;
 if not found then raise exception 'Open room required'; end if;
 return public.phase3_internal_continue(p_room_id);
end $$;
revoke all on function public.continue_open_room_queue(uuid) from public,anon,authenticated;
grant execute on function public.continue_open_room_queue(uuid) to authenticated;
create or replace function public.leave_open_room(p_room_id uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare m uuid;
begin
 perform 1 from public.rooms where id=p_room_id for update;
 update public.room_members set status='left',left_at=statement_timestamp()
 where room_id=p_room_id and user_id=auth.uid() and status='active' returning id into m;
 if not found then raise exception 'Active membership required'; end if;
 update public.room_queue_entries set status='removed' where room_id=p_room_id and member_id=m and status in ('waiting','selected');
end $$;
alter function public.host_kick_room_member(uuid,uuid) rename to phase3_internal_kick;
revoke all on function public.phase3_internal_kick(uuid,uuid) from public,anon,authenticated;
create function public.host_kick_room_member(p_room_id uuid,p_member_id uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.rooms;
begin
 select * into strict r from public.rooms where id=p_room_id and host_user_id=auth.uid() for update;
 if r.best_of is not null and r.current_round_state='preparing' and exists(select from public.room_current_players where room_id=r.id and member_id=p_member_id)
 then perform public.replace_open_room_player(r.id,r.version,p_member_id); end if;
 perform public.phase3_internal_kick(r.id,p_member_id);
end $$;
revoke all on function public.host_kick_room_member(uuid,uuid) from public,anon,authenticated;
grant execute on function public.host_kick_room_member(uuid,uuid) to authenticated;
create function public.queue_changed() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 -- The legacy END already advanced the version it returns to its caller.
 if new.status='played' then return null; end if;
 update public.rooms set version=version+1 where id=new.room_id;
 return null;
end $$;
create trigger queue_changed after insert or update of status on public.room_queue_entries for each row execute function public.queue_changed();
revoke all on function public.queue_changed() from public,anon,authenticated;
create function public.set_room_allocation_mode(p_room_id uuid,p_version bigint,p_mode text) returns public.rooms
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.rooms;
begin
 r:=public.series_host(p_room_id,p_version);
 if p_mode is null or r.current_round_state='active' or
 (r.current_round_state='preparing' and exists(select from public.room_current_players where room_id=r.id and team is not null))
 then raise exception 'Allocation already started or invalid mode'; end if;
 update public.rooms set allocation_mode=p_mode,version=version+1 where id=r.id returning * into r;
 return r;
end $$;
revoke all on function public.set_room_allocation_mode(uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.set_room_allocation_mode(uuid,bigint,text) to authenticated;
create function public.set_room_play_style(p_room_id uuid,p_version bigint,p_style text)
returns public.rooms language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.rooms;
begin
 r:=public.series_host(p_room_id,p_version);
 if p_style is null or p_style not in ('fun','tryhard') then raise exception 'Invalid play style'; end if;
 if r.current_round_state not in ('idle','preparing','ended') then raise exception 'Finish active series before editing play style'; end if;
 update public.rooms set play_style=p_style,version=version+1 where id=r.id returning * into r;
 return r;
end $$;
revoke all on function public.set_room_play_style(uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.set_room_play_style(uuid,bigint,text) to authenticated;
notify pgrst, 'reload schema';
commit;
