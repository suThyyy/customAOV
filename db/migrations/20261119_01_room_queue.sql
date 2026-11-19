begin;
lock table public.room_queue_entries in share row exclusive mode;
do $$ begin
 if exists(select room_id from public.room_queue_entries where status in ('waiting','selected') group by room_id having count(*)>50)
 then raise exception 'Resolve over-capacity queues before migration'; end if;
end $$;
create function public.guard_queue_capacity() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 perform 1 from public.rooms where id=new.room_id and status='open' for update;
 if not found then raise exception 'Room closed'; end if;
 if (select count(*) from public.room_queue_entries where room_id=new.room_id and status in ('waiting','selected'))>=50
 then raise exception 'QUEUE_FULL'; end if;
 return new;
end $$;
create trigger queue_capacity before insert on public.room_queue_entries for each row execute function public.guard_queue_capacity();
revoke all on function public.guard_queue_capacity() from public,anon,authenticated;

create or replace function public.replace_open_room_player(p_room_id uuid,p_version bigint,p_member_id uuid)
returns public.rooms language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.rooms; old_player public.room_current_players; candidate public.room_queue_entries;
begin
 r:=public.huy11_lock_preparing(p_room_id,p_version);
 select * into strict old_player from public.room_current_players where room_id=r.id and member_id=p_member_id;
 select q.* into candidate from public.room_queue_entries q join public.room_members m on m.id=q.member_id
 where q.room_id=r.id and q.status='waiting' and m.status='active'
 and not exists(select from public.room_current_players p where p.room_id=r.id and p.member_id=q.member_id)
 order by q.queue_seq limit 1 for update of q;
 if not found then raise exception 'No waiting player available'; end if;
 update public.room_queue_entries set status='removed' where id=old_player.queue_entry_id;
 update public.room_current_players set member_id=candidate.member_id,queue_entry_id=candidate.id,
 ready_state='pending',skill_mode=case when skill_mode='random' then 'random' end,
 skill_value=null,skill_score=null where room_id=r.id and member_id=p_member_id;
 update public.room_queue_entries set status='selected',selected_round_no=r.current_round_no where id=candidate.id;
 update public.rooms set version=version+1 where id=r.id returning * into r;
 return r;
end $$;

create function public.swap_open_room_players(p_room_id uuid,p_version bigint,p_first uuid,p_second uuid)
returns public.rooms language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.rooms; x public.room_current_players; y public.room_current_players;
begin
 r:=public.huy11_lock_preparing(p_room_id,p_version);
 select * into strict x from public.room_current_players where room_id=r.id and member_id=p_first;
 select * into strict y from public.room_current_players where room_id=r.id and member_id=p_second;
 if x.member_id=y.member_id or (select count(*) from public.room_current_players where room_id=r.id and team='a')<>5
 or (select count(*) from public.room_current_players where room_id=r.id and team='b')<>5 then raise exception 'Allocated 5v5 required'; end if;
 delete from public.room_current_players where room_id=r.id and member_id in (p_first,p_second);
 select y.slot,x.slot,y.team,x.team into x.slot,y.slot,x.team,y.team;
 insert into public.room_current_players select x.*;
 insert into public.room_current_players select y.*;
 update public.rooms set version=version+1 where id=r.id returning * into r;
 return r;
end $$;
revoke all on function public.swap_open_room_players(uuid,bigint,uuid,uuid) from public,anon,authenticated;
grant execute on function public.swap_open_room_players(uuid,bigint,uuid,uuid) to authenticated;
commit;
