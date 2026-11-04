-- HUY-11 incremental fix: allow Random team mode in Open Room.
-- Apply only after 20261103_huy11_room_lineup.sql. Do not edit applied history.

begin;

alter table public.room_current_players
  drop constraint if exists room_current_players_skill_mode_check;
alter table public.room_current_players
  add constraint room_current_players_skill_mode_check
  check (skill_mode is null or skill_mode in ('random', 'tier', 'rank'));

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
   or coalesce(x->>'skill_mode','') not in ('random','tier','rank')
   or (x->>'skill_mode' in ('tier','rank') and (
     coalesce(length(x->>'skill_value'),0) not between 1 and 50
     or (x->>'skill_score') is null
     or not ((x->>'skill_score')::numeric > 0 and (x->>'skill_score')::numeric < 100000)
   ))) then raise exception 'Invalid lineup values'; end if;
 if (select count(*) from jsonb_array_elements(p_players) x where x->>'team'='a') <> 5
 then raise exception 'Teams must be 5v5'; end if;
 update public.room_current_players p set team=x.team, skill_mode=x.skill_mode,
 skill_value=x.skill_value, skill_score=x.skill_score
 from jsonb_to_recordset(p_players) as x(member_id uuid, team text, skill_mode text, skill_value text, skill_score numeric)
 where p.room_id=p_room_id and p.member_id=x.member_id;
 update public.rooms set version=version+1 where id=p_room_id returning * into r;
 return r;
end; $$;

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
   and ((p.skill_mode in ('tier','rank') and p.skill_score is null)
     or m.status <> 'active' or q.status <> 'selected'))
 then raise exception 'Save a complete active 5v5 lineup before Start'; end if;
 update public.rooms set current_round_state='active',version=version+1 where id=p_room_id returning * into r;
 return r;
end; $$;

revoke all on function public.save_open_room_lineup(uuid,bigint,jsonb) from public,anon,authenticated;
revoke all on function public.start_open_room_round(uuid) from public,anon,authenticated;
grant execute on function public.save_open_room_lineup(uuid,bigint,jsonb) to authenticated;
grant execute on function public.start_open_room_round(uuid) to authenticated;

commit;
