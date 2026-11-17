-- Apply AFTER all HUY-9/HUY-10 migrations and pgcrypto hotfix. Review first.
begin;
-- Do not strand a legacy, partially prepared live room behind the new 5v5 gate.
-- Owner must review/close such a room before deploying; never change it silently.
do $$ begin
 if exists(select 1 from public.rooms r where r.status='open' and r.current_round_state='preparing'
   and (select count(*) from public.room_current_players p where p.room_id=r.id) <> 10) then
  raise exception 'Open partial preparing Round exists; resolve it before applying HUY-11';
 end if;
end $$;
alter table public.room_current_players
  add column if not exists skill_mode text check (skill_mode in ('tier','rank')),
  add column if not exists skill_value text,
  add column if not exists skill_score numeric check (skill_score > 0 and skill_score < 100000);

-- One statement/snapshot, with RLS enforced as the caller. No account profile data.
create or replace function public.read_open_room_state(p_room_id uuid)
returns jsonb language sql stable security invoker set search_path = pg_catalog, public
as $$
select jsonb_build_object('room', to_jsonb(r),
 'members', coalesce((select jsonb_agg(to_jsonb(m) order by joined_at, id) from public.room_members m where m.room_id=r.id),'[]'::jsonb),
 'queue', coalesce((select jsonb_agg(to_jsonb(q) order by queue_seq) from public.room_queue_entries q where q.room_id=r.id),'[]'::jsonb),
 'currentPlayers', coalesce((select jsonb_agg(to_jsonb(p) order by slot) from public.room_current_players p where p.room_id=r.id),'[]'::jsonb))
from public.rooms r where r.id=p_room_id;
$$;

-- Internal guard: room lock serializes lineup/replace/start and version detects stale tabs.
create or replace function public.huy11_lock_preparing(p_room_id uuid, p_version bigint)
returns public.rooms language plpgsql security definer set search_path = pg_catalog, public
as $$
declare r public.rooms;
begin
 if coalesce(auth.role(),'') <> 'authenticated' or auth.uid() is null
 or public.huy9_is_anonymous_session() then raise exception 'Permanent account required'; end if;
 select * into r from public.rooms where id=p_room_id and host_user_id=auth.uid() for update;
 if not found then raise exception 'Host only'; end if;
 if r.status <> 'open' or r.current_round_state <> 'preparing' then raise exception 'Round is not preparing'; end if;
 if p_version is null or r.version <> p_version then raise exception 'Room changed; refresh and retry'; end if;
 return r;
end; $$;

create or replace function public.save_open_room_lineup(p_room_id uuid, p_version bigint, p_players jsonb)
returns public.rooms language plpgsql security definer set search_path = pg_catalog, public
as $$
declare r public.rooms; n integer;
begin
 r := public.huy11_lock_preparing(p_room_id,p_version);
 if jsonb_typeof(p_players) is distinct from 'array' then raise exception 'Invalid lineup'; end if;
 select count(*) into n from public.room_current_players where room_id=p_room_id;
 if n <> 10 or jsonb_array_length(p_players) <> n then raise exception 'Exactly ten selected players required'; end if;
 if (select count(distinct x->>'member_id') from jsonb_array_elements(p_players) x) <> n
 or exists (select 1 from jsonb_array_elements(p_players) x
   where not exists(select 1 from public.room_current_players p where p.room_id=p_room_id and p.member_id=(x->>'member_id')::uuid)
   or coalesce(x->>'team','') not in ('a','b')
   or coalesce(x->>'skill_mode','') not in ('tier','rank')
   or coalesce(length(x->>'skill_value'),0) not between 1 and 50
   or (x->>'skill_score') is null
   or not ((x->>'skill_score')::numeric > 0 and (x->>'skill_score')::numeric < 100000))
 then raise exception 'Invalid lineup values'; end if;
 if (select count(*) from jsonb_array_elements(p_players) x where x->>'team'='a') <> 5
 then raise exception 'Teams must be 5v5'; end if;
 update public.room_current_players p set team=x.team, skill_mode=x.skill_mode,
 skill_value=x.skill_value, skill_score=x.skill_score
 from jsonb_to_recordset(p_players) as x(member_id uuid, team text, skill_mode text, skill_value text, skill_score numeric)
 where p.room_id=p_room_id and p.member_id=x.member_id;
 update public.rooms set version=version+1 where id=p_room_id returning * into r;
 return r;
end; $$;

-- Replace removes the unavailable player's registration; they must Continue to return.
-- Replacement is always the first active waiting entry, never a client-chosen jump.
create or replace function public.replace_open_room_player(p_room_id uuid,p_version bigint,p_member_id uuid)
returns public.rooms language plpgsql security definer set search_path = pg_catalog, public
as $$
declare r public.rooms; old public.room_current_players; nextq public.room_queue_entries;
begin
 r := public.huy11_lock_preparing(p_room_id,p_version);
 select * into old from public.room_current_players where room_id=p_room_id and member_id=p_member_id for update;
 if not found then raise exception 'Selected player not found'; end if;
 select q.* into nextq from public.room_queue_entries q join public.room_members m on m.id=q.member_id
 where q.room_id=p_room_id and q.status='waiting' and m.status='active'
 and not exists(select 1 from public.room_current_players p where p.room_id=p_room_id and p.member_id=q.member_id)
 order by q.queue_seq limit 1 for update of q;
 if not found then raise exception 'No waiting player available'; end if;
 update public.room_queue_entries set status='removed' where id=old.queue_entry_id;
 delete from public.room_current_players where room_id=p_room_id and member_id=p_member_id;
 insert into public.room_current_players(room_id,round_no,member_id,queue_entry_id,slot)
 values(p_room_id,r.current_round_no,nextq.member_id,nextq.id,old.slot);
 update public.room_queue_entries set status='selected',selected_round_no=r.current_round_no where id=nextq.id;
 update public.room_current_players set team=null where room_id=p_room_id;
 update public.rooms set version=version+1 where id=p_room_id returning * into r;
 return r;
end; $$;

-- Require enough waiting players before moving into preparing; otherwise a Round
-- could become stuck with <10 players, unable to Start or Prepare again.
create or replace function public.prepare_next_open_room_round(p_room_id uuid)
returns public.rooms language plpgsql security definer set search_path = pg_catalog, public
as $$
declare r public.rooms; n integer;
begin
 if coalesce(auth.role(),'') <> 'authenticated' or auth.uid() is null or public.huy9_is_anonymous_session()
 then raise exception 'Permanent account required'; end if;
 select * into r from public.rooms where id=p_room_id and host_user_id=auth.uid() for update;
 if not found then raise exception 'Host only'; end if;
 if r.status <> 'open' or r.current_round_state not in ('idle','ended')
 then raise exception 'Current Round must be ended before preparing'; end if;
 -- Lock eligible queue rows before counting/selecting. All additions serialize on
 -- the Room lock; legacy Leave may remove rows, so recheck the inserted count too.
 perform q.id from public.room_queue_entries q join public.room_members m on m.id=q.member_id
 where q.room_id=p_room_id and q.status='waiting' and m.status='active'
 order by q.queue_seq for update of q;
 select count(*) into n from public.room_queue_entries q join public.room_members m on m.id=q.member_id
 where q.room_id=p_room_id and q.status='waiting' and m.status='active';
 if n < 10 then raise exception 'Ten waiting players required to prepare a 5v5 Round'; end if;
 delete from public.room_current_players where room_id=p_room_id;
 insert into public.room_current_players(room_id,round_no,member_id,queue_entry_id,slot)
 select p_room_id,r.current_round_no+1,q.member_id,q.id,row_number() over(order by q.queue_seq)::smallint
 from public.room_queue_entries q join public.room_members m on m.id=q.member_id
 where q.room_id=p_room_id and q.status='waiting' and m.status='active'
 order by q.queue_seq limit 10;
 get diagnostics n = row_count;
 if n <> 10 then raise exception 'Queue changed; refresh and retry'; end if;
 update public.room_queue_entries q set status='selected',selected_round_no=r.current_round_no+1
 where q.room_id=p_room_id and q.id in(select queue_entry_id from public.room_current_players where room_id=p_room_id);
 update public.rooms set current_round_no=current_round_no+1,current_round_state='preparing',version=version+1
 where id=p_room_id returning * into r;
 return r;
end; $$;

-- Dedicated Start validates persisted lineup. Existing HUY-10 Start is hardened too,
-- so callers cannot bypass the ten-player/team validation using the old RPC.
create or replace function public.start_open_room_round(p_room_id uuid)
returns public.rooms language plpgsql security definer set search_path = pg_catalog, public
as $$
declare r public.rooms;
begin
 if coalesce(auth.role(),'') <> 'authenticated' or auth.uid() is null or public.huy9_is_anonymous_session()
 then raise exception 'Permanent account required'; end if;
 select * into r from public.rooms where id=p_room_id and host_user_id=auth.uid() for update;
 if not found then raise exception 'Host only'; end if;
 if r.status <> 'open' or r.current_round_state <> 'preparing' then raise exception 'Round is not preparing'; end if;
 if (select count(*) from public.room_current_players where room_id=p_room_id) <> 10
 or (select count(*) from public.room_current_players where room_id=p_room_id and team='a') <> 5
 or (select count(*) from public.room_current_players where room_id=p_room_id and team='b') <> 5
 or exists(select 1 from public.room_current_players p join public.room_members m on m.id=p.member_id
 join public.room_queue_entries q on q.id=p.queue_entry_id where p.room_id=p_room_id
 and (p.skill_score is null or m.status <> 'active' or q.status <> 'selected'))
 then raise exception 'Save a complete active 5v5 lineup before Start'; end if;
 update public.rooms set current_round_state='active',version=version+1 where id=p_room_id returning * into r;
 return r;
end; $$;

revoke all on function public.huy11_lock_preparing(uuid,bigint) from public,anon,authenticated;
revoke all on function public.read_open_room_state(uuid) from public,anon,authenticated;
revoke all on function public.save_open_room_lineup(uuid,bigint,jsonb) from public,anon,authenticated;
revoke all on function public.replace_open_room_player(uuid,bigint,uuid) from public,anon,authenticated;
revoke all on function public.prepare_next_open_room_round(uuid) from public,anon,authenticated;
revoke all on function public.start_open_room_round(uuid) from public,anon,authenticated;
grant execute on function public.read_open_room_state(uuid) to authenticated;
grant execute on function public.save_open_room_lineup(uuid,bigint,jsonb) to authenticated;
grant execute on function public.replace_open_room_player(uuid,bigint,uuid) to authenticated;
grant execute on function public.prepare_next_open_room_round(uuid) to authenticated;
grant execute on function public.start_open_room_round(uuid) to authenticated;

-- Supabase publication: additive, does not change Firebase or existing publications.
do $$ declare t text; begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
  raise exception 'supabase_realtime publication missing; review environment';
 end if;
 foreach t in array array['rooms','room_members','room_queue_entries','room_current_players'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime add table public.%I',t);
  end if;
 end loop;
end $$;
commit;
