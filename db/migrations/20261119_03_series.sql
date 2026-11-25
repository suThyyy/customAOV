begin;
create table public.room_series(
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms,
 round_no integer not null,best_of integer not null check(best_of in (3,5,7)),
 blue_wins integer not null default 0,red_wins integer not null default 0,complete boolean not null default false,
 unique(room_id,round_no));
create unique index room_one_active_series on public.room_series(room_id) where not complete;
create table public.series_players(
 series_id uuid not null references public.room_series, member_id uuid not null,display_name text not null,
 slot smallint not null check(slot between 1 and 10),team text not null check(team in ('a','b')),
 primary key(series_id,member_id),unique(series_id,slot));
create table public.series_games(
 id uuid primary key default gen_random_uuid(),series_id uuid not null references public.room_series,
 game_no integer not null check(game_no between 1 and 7), started_at timestamptz not null default statement_timestamp(),
 ended_at timestamptz,source text not null default 'aov',match_id text check(length(match_id) between 1 and 128),
 winner text check(winner in ('a','b')),loser text generated always as (case winner when 'a' then 'b' when 'b' then 'a' end) stored,
 assignments jsonb not null default '[]', assignment_mode text check(assignment_mode in ('automatic','manual')),
 auto_generated boolean not null default false, unique(series_id,game_no),unique(source,match_id));
create table public.game_result_revisions(
 id bigint generated always as identity primary key,game_id uuid not null references public.series_games,
 match_id text not null,winner text not null check(winner in ('a','b')), reporter uuid not null,
 reported_at timestamptz not null default statement_timestamp(), provenance text not null default 'HOST_REPORTED',
 verification text not null default 'UNVERIFIED');
create index game_revisions_history on public.game_result_revisions(game_id,id);
alter table public.room_series enable row level security;
revoke all on public.room_series from public,anon,authenticated;
grant select on public.room_series to authenticated;
create policy member_read on public.room_series for select to authenticated using (
 (select auth.jwt()->>'is_anonymous') is distinct from 'true' and public.huy9_can_access_room(room_id));
alter table public.series_players enable row level security;
revoke all on public.series_players from public,anon,authenticated;
grant select on public.series_players to authenticated;
create policy member_read on public.series_players for select to authenticated using (exists(select from public.room_series s where s.id=series_id));
alter table public.series_games enable row level security;
revoke all on public.series_games from public,anon,authenticated;
grant select on public.series_games to authenticated;
create policy member_read on public.series_games for select to authenticated using (exists(select from public.room_series s where s.id=series_id));
alter table public.game_result_revisions enable row level security;
revoke all on public.game_result_revisions from public,anon,authenticated;
grant select on public.game_result_revisions to authenticated;
create policy member_read on public.game_result_revisions for select to authenticated using (exists(select from public.series_games g where g.id=game_id));
alter function public.start_open_room_round(uuid) rename to phase3_internal_start_open_room_round;
revoke all on function public.phase3_internal_start_open_room_round(uuid) from public,anon,authenticated;
create function public.start_open_room_round(p_room_id uuid) returns public.rooms language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if exists(select from public.rooms where id=p_room_id and host_user_id=auth.uid() and best_of is not null for update)
 then raise exception 'Use Series lifecycle'; end if;
 return public.phase3_internal_start_open_room_round(p_room_id);
end $$;
revoke all on function public.start_open_room_round(uuid) from public,anon,authenticated;
grant execute on function public.start_open_room_round(uuid) to authenticated;
alter function public.end_open_room_round(uuid) rename to phase3_internal_end_open_room_round;
revoke all on function public.phase3_internal_end_open_room_round(uuid) from public,anon,authenticated;
create function public.end_open_room_round(p_room_id uuid) returns public.rooms language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if exists(select from public.rooms where id=p_room_id and host_user_id=auth.uid() and best_of is not null for update)
 then raise exception 'Use Series lifecycle'; end if;
 return public.phase3_internal_end_open_room_round(p_room_id);
end $$;
revoke all on function public.end_open_room_round(uuid) from public,anon,authenticated;
grant execute on function public.end_open_room_round(uuid) to authenticated;
create function public.series_host(p_room_id uuid,p_version bigint) returns public.rooms language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.rooms;
begin
 select * into r from public.rooms where id=p_room_id and host_user_id=auth.uid() and best_of is not null and status='open' for update;
 if not found or public.huy9_is_anonymous_session() then raise exception 'Open configured room host required'; end if;
 if r.version is distinct from p_version then raise exception 'Room changed; refresh and retry' using errcode='40001'; end if;
 return r;
end $$;
revoke all on function public.series_host(uuid,bigint) from public,anon,authenticated;
create function public.start_series_game(p_room_id uuid,p_version bigint) returns public.series_games language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.rooms; s public.room_series; g public.series_games; n integer;
begin
 r:=public.series_host(p_room_id,p_version);
 select * into s from public.room_series where room_id=r.id and not complete;
 if found then
  select * into strict g from public.series_games where series_id=s.id order by game_no desc limit 1;
  if g.ended_at is null then raise exception 'Game in progress'; end if;
  n:=g.game_no+1;
  update public.rooms set version=version+1 where id=r.id;
 else
  if r.current_round_state<>'preparing' then raise exception 'Round is not preparing'; end if;
  if r.allocation_mode is null or exists(select from public.room_current_players
    where room_id=r.id and skill_mode is distinct from r.allocation_mode)
  then raise exception 'Save selected allocation mode'; end if;
  if (select count(*) from public.room_queue_entries where room_id=r.id and status='selected') <> 10
  then raise exception 'Ten selected entries required'; end if;
  if exists(select from public.room_current_players p join public.room_queue_entries q on q.id=p.queue_entry_id
    where p.room_id=r.id and (p.member_id<>q.member_id or p.round_no<>r.current_round_no
      or q.selected_round_no is distinct from r.current_round_no))
  then raise exception 'Invalid selected round'; end if;
  perform public.phase3_internal_start_open_room_round(r.id);
  insert into public.room_series(room_id,round_no,best_of) values(r.id,r.current_round_no,r.best_of) returning * into s;
  insert into public.series_players select s.id,p.member_id,m.display_name,p.slot,p.team from public.room_current_players p join public.room_members m on m.id=p.member_id where p.room_id=r.id;
  n:=1;
 end if;
 insert into public.series_games(series_id,game_no) values(s.id,n) returning * into g;
 return g;
end $$;
revoke all on function public.start_series_game(uuid,bigint) from public,anon,authenticated;
grant execute on function public.start_series_game(uuid,bigint) to authenticated;
create function public.report_series_result(p_room_id uuid,p_version bigint,p_game_id uuid,p_match_id text,p_winner text,p_confirm boolean,p_correct boolean default false)
returns public.room_series language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.rooms; s public.room_series; g public.series_games; blue integer; red integer; target integer; finished boolean;
begin
 r:=public.series_host(p_room_id,p_version);
 select * into strict g from public.series_games where id=p_game_id;
 select * into strict s from public.room_series where id=g.series_id and room_id=r.id;
 if p_confirm is not true or coalesce(length(btrim(p_match_id)),0) not between 1 and 128 or coalesce(p_winner,'') not in ('a','b')
 then raise exception 'Confirmed match ID and winner required'; end if;
 if p_correct is distinct from (g.ended_at is not null) then raise exception 'Unexpected game state'; end if;
 if jsonb_array_length(g.assignments) not in (0,10) or exists(select from jsonb_array_elements(g.assignments) a where a->>'hero' is null or a->>'lane' is null)
 then raise exception 'Complete assignments first'; end if;
 update public.series_games set winner=p_winner, match_id=btrim(p_match_id),ended_at=coalesce(ended_at,statement_timestamp()) where id=g.id;
 target:=s.best_of/2+1;
 if exists(select from (select game_no,count(*) filter(where winner='a') over(order by game_no) a,
 count(*) filter(where winner='b') over(order by game_no) b,max(game_no) over() last_no from public.series_games where series_id=s.id) scores
 where greatest(a,b)>=target and game_no<last_no) then raise exception 'Correction would invalidate later games'; end if;
 select count(*) filter(where winner='a'),count(*) filter(where winner='b') into blue,red from public.series_games where series_id=s.id;
 finished:=greatest(blue,red)>=target;
 if s.complete and not finished then
  if r.current_round_no<>s.round_no or r.current_round_state<>'ended' then raise exception 'Subsequent series already prepared'; end if;
  update public.rooms set current_round_state='active' where id=r.id;
 elsif not s.complete and finished then
  perform public.phase3_internal_end_open_room_round(r.id);
 end if;
 insert into public.game_result_revisions(game_id,match_id,winner,reporter) values(g.id,btrim(p_match_id),p_winner,auth.uid());
 update public.room_series set blue_wins=blue,red_wins=red,complete=finished where id=s.id returning * into s;
 update public.rooms set version=version+1 where id=r.id;
 return s;
end $$;
revoke all on function public.report_series_result(uuid,bigint,uuid,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.report_series_result(uuid,bigint,uuid,text,text,boolean,boolean) to authenticated;
create function public.prevent_active_series_close() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if new.status='closed' and exists(select from public.room_series where room_id=new.id and not complete) then raise exception 'Finish active series before closing'; end if;
 return new;
end $$;
create trigger series_close before update of status on public.rooms for each row execute function public.prevent_active_series_close();
revoke all on function public.prevent_active_series_close() from public,anon,authenticated;
-- Discovery viewers can read finished public results without receiving private
-- membership, assignment, reporter or invitation data from the underlying tables.
create function public.read_public_game_results(p_room_id uuid)
returns table(series_id uuid, game_no integer, match_id text, winner text, ended_at timestamptz,
 provenance text, verification text)
language sql stable security definer set search_path=pg_catalog,public as $$
 select s.id,g.game_no,g.match_id,g.winner,g.ended_at,last_report.provenance,last_report.verification
 from public.rooms r join public.room_series s on s.room_id=r.id
 join public.series_games g on g.series_id=s.id
 cross join lateral (select rev.provenance,rev.verification from public.game_result_revisions rev
   where rev.game_id=g.id order by rev.id desc limit 1) last_report
 where r.id=p_room_id and r.visibility='public' and r.status='open' and g.ended_at is not null
 and auth.uid() is not null and not public.huy9_is_anonymous_session()
 and not exists(select from public.room_members m where m.room_id=r.id and m.user_id=auth.uid() and m.status='kicked')
 order by s.round_no,g.game_no
$$;
revoke all on function public.read_public_game_results(uuid) from public,anon,authenticated;
grant execute on function public.read_public_game_results(uuid) to authenticated;
commit;
