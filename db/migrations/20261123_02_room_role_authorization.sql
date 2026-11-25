-- One-time, transactional migration AFTER 20261123_01 and all Phase 3 migrations.
-- Apply only after the PO has approved every active Host's role. Never promote here.
begin;
do $$ begin
 if exists(select from public.rooms r left join public.profiles p on p.id=r.host_user_id
   where r.status='open' and (p.role_approved_at is null or p.role not in ('organizer','admin')))
 then raise exception 'Activation blocked: active Rooms have unapproved Hosts. Review inventory; do not auto-promote.'; end if;
end $$;

-- Direct table writes would bypass RPC guards. Stop on unexpected historical
-- grants instead of weakening policies or silently rewriting deployed ACLs.
do $$ declare rel text; client name; begin
 foreach rel in array array['rooms','room_members','room_queue_entries','room_current_players',
   'room_series','series_players','series_games','game_result_revisions'] loop
  foreach client in array array['anon','authenticated']::name[] loop
   if has_table_privilege(client,'public.'||rel,'INSERT,UPDATE,DELETE,TRUNCATE')
      or has_any_column_privilege(client,'public.'||rel,'INSERT,UPDATE')
   then raise exception 'Unexpected direct write grant on % to %; review preflight',rel,client; end if;
  end loop;
 end loop;
end $$;

create function public.require_room_organizer(p_room_id uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if auth.uid() is null or coalesce(auth.role(),'') <> 'authenticated' or public.huy9_is_anonymous_session()
 then raise exception 'Permanent organizer account required' using errcode='42501'; end if;
 -- SHARE conflicts with role assignment UPDATE, so revocation and a mutation
 -- serialize. Acquire role before Room locks on all organizer entry points.
 perform 1 from public.profiles where id=auth.uid()
   and role in ('organizer','admin') and role_approved_at is not null for share;
 if not found then raise exception 'Approved organizer role required' using errcode='42501'; end if;
 if p_room_id is not null and not exists(select from public.rooms where id=p_room_id and host_user_id=auth.uid())
 then raise exception 'Room owner required' using errcode='42501'; end if;
end $$;
revoke all on function public.require_room_organizer(uuid) from public,anon,authenticated,service_role;

-- Insert into the reviewed outer execution block IN PLACE: same OID, parameters, defaults,
-- result, ACL, configuration and untouched business body. No callable legacy
-- alias is created. Missing signatures/language/ownership abort the transaction.
do $migration$
declare signature text; target oid; definition text; body text; guarded text; room_arg text;
 expected_hash text; begin_end integer; body_position integer; before_metadata jsonb;
begin
 foreach signature in array array[
  'create_open_room()',
  'create_series_room(text,integer,text,text,text)',
  'close_open_room(uuid)',
  'host_add_player_to_room(uuid,text)',
  'host_kick_room_member(uuid,uuid)',
  'host_requeue_room_member(uuid,uuid)',
  'prepare_next_open_room_round(uuid)',
  'save_open_room_lineup(uuid,bigint,jsonb)',
  'replace_open_room_player(uuid,bigint,uuid)',
  'swap_open_room_players(uuid,bigint,uuid,uuid)',
  'start_open_room_round(uuid)',
  'end_open_room_round(uuid)',
  'start_series_game(uuid,bigint)',
  'report_series_result(uuid,bigint,uuid,text,text,boolean,boolean)',
  'assign_series_game(uuid,bigint,uuid,text,jsonb)',
  'set_room_allocation_mode(uuid,bigint,text)',
  'set_room_play_style(uuid,bigint,text)'
 ] loop
  target := to_regprocedure('public.'||signature);
  if target is null then raise exception 'Missing required RPC: %',signature; end if;
  if exists(select from pg_proc p where p.pronamespace='public'::regnamespace
    and p.proname=split_part(signature,'(',1) and p.oid<>target)
  then raise exception 'Unexpected overload for %; audit before activation',signature; end if;
  select p.prosrc into body from pg_proc p join pg_language l on l.oid=p.prolang
    where p.oid=target and l.lanname='plpgsql' and p.prosecdef and p.proowner='postgres'::regrole;
  if body is null or position('require_room_organizer' in body)>0
  then raise exception 'Unexpected RPC definition/owner or migration already applied: %',signature; end if;
  room_arg := case when signature like 'create_%' then 'null::uuid' else 'p_room_id' end;
  -- Exact reviewed Production source; reject drift rather than parse arbitrary SQL.
  select h.digest,h.offset_end into expected_hash,begin_end from (values
   ('assign_series_game(uuid,bigint,uuid,text,jsonb)','f57a055d817584fd5840480ccdd7bae4',113),
   ('close_open_room(uuid)','74de1153dedbe9cb4e38cb8faffe4d0c',45),
   ('create_open_room()','a1e11f90802baf1bddc130e88a46e9df',46),
   ('create_series_room(text,integer,text,text,text)','bb79fb0a3d84bb3a8236bdf945cab3c2',32),
   ('end_open_room_round(uuid)','fe11fb1cf9b4f70ed575dd51172b2b0f',7),
   ('host_add_player_to_room(uuid,text)','307e970a6cce88005ead3905faf0641d',82),
   ('host_kick_room_member(uuid,uuid)','8a5ee786287385fb36fec939eee34c03',32),
   ('host_requeue_room_member(uuid,uuid)','103d156f586b4d372b393ec2f183eed5',128),
   ('prepare_next_open_room_round(uuid)','a46bf9364517b09435a88e2de9870cb7',43),
   ('replace_open_room_player(uuid,bigint,uuid)','5d9872c860597bb819654d72d844e242',109),
   ('report_series_result(uuid,bigint,uuid,text,text,boolean,boolean)','2f504384e3c5e2a13d0245ad9aa198f8',138),
   ('save_open_room_lineup(uuid,bigint,jsonb)','15e6a84b9cc0583e63c8f78d922880bd',43),
   ('set_room_allocation_mode(uuid,bigint,text)','8ec21894890af068188fcbff26b90930',32),
   ('set_room_play_style(uuid,bigint,text)','eb385864f8f76f79e2654eafbbfbd1f2',32),
   ('start_open_room_round(uuid)','78917f959fe386ffbf5e4574454a3f1d',7),
   ('start_series_game(uuid,bigint)','1d91e243f62ee8def81666c368be05f1',88),
   ('swap_open_room_players(uuid,bigint,uuid,uuid)','3ce0747272fc4014ce9b3e6f8741f933',94)
  ) h(sig,digest,offset_end) where h.sig=signature;
  if md5(body) is distinct from expected_hash then
   raise exception 'Production source drift for %; review before activation',signature;
  end if;
  if room_arg='p_room_id' and not exists(select from pg_proc where oid=target
     and proargnames[1]='p_room_id' and proargtypes[0]='uuid'::regtype) then
   raise exception 'Unexpected Room argument for %',signature;
  end if;
  select to_jsonb(p)-'prosrc' into before_metadata from pg_proc p where oid=target;
  guarded := left(body,begin_end)||E'\n perform public.require_room_organizer('||room_arg||E');'
    ||substring(body from begin_end+1);
  definition := pg_get_functiondef(target);
  -- PostgreSQL emits the exact prosrc between its dollar delimiters.
  body_position := position(body in definition);
  if body_position=0 then raise exception 'Cannot locate source for %',signature; end if;
  execute overlay(definition placing guarded from body_position for length(body));
  if (select to_jsonb(p)-'prosrc' from pg_proc p where oid=target) is distinct from before_metadata then
   raise exception 'Function metadata changed for %',signature;
  end if;
 end loop;
end $migration$;

-- Existing function ACLs are preserved. Any helper ACL remediation needs separate approval.
-- Participation: join/leave/continue remain governed by the existing membership,
-- invitation, capacity, kicked-member and permanent-session rules; no ADMIN gate.
notify pgrst, 'reload schema';
commit;
