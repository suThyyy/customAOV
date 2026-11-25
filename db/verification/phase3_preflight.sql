-- Existing replacements must belong to the reviewed owner; new signatures must be vacant.
with expected(migration,signature,existing) as (values
 ('01','public.replace_open_room_player(uuid,bigint,uuid)',true),
 ('01','public.swap_open_room_players(uuid,bigint,uuid,uuid)',false),
 ('02','public.create_series_room(text,integer,text,text,text)',false),
 ('02','public.discover_series_rooms()',false),
 ('03','public.start_open_room_round(uuid)',true),
 ('03','public.end_open_room_round(uuid)',true),
 ('03','public.start_series_game(uuid,bigint)',false),
 ('03','public.report_series_result(uuid,bigint,uuid,text,text,boolean,boolean)',false),
 ('03','public.read_public_game_results(uuid)',false),
 ('04','public.assign_series_game(uuid,bigint,uuid,text,jsonb)',false),
 ('05','public.continue_open_room_queue(uuid)',true),
 ('05','public.leave_open_room(uuid)',true),
 ('05','public.host_kick_room_member(uuid,uuid)',true),
 ('05','public.set_room_allocation_mode(uuid,bigint,text)',false),
 ('05','public.set_room_play_style(uuid,bigint,text)',false))
select migration,signature,existing=(p.oid is not null) as expected_presence,
 case when existing then coalesce(p.proowner=current_user::regrole and p.prosecdef
 and 'search_path=pg_catalog, public'=any(p.proconfig)
 and not has_function_privilege('anon',p.oid,'execute')
 and has_function_privilege('authenticated',p.oid,'execute'),false) end as baseline_contract_ok,
 pg_get_userbyid(p.proowner) as owner,p.proconfig as function_settings,
 has_function_privilege('anon',p.oid,'execute') as anon_execute,
 has_function_privilege('authenticated',p.oid,'execute') as account_execute
from expected left join pg_proc p on p.oid=to_regprocedure(signature) order by migration,signature;
-- Read only. Each signature must resolve; the four published tables must be present.
select signature,to_regprocedure(signature) as installed from unnest(array[
 'public.huy11_lock_preparing(uuid,bigint)','public.read_open_room_state(uuid)',
 'public.join_open_room(text,text)','public.host_add_player_to_room(uuid,text)',
 'public.save_open_room_lineup(uuid,bigint,jsonb)','public.host_kick_room_member(uuid,uuid)',
 'public.replace_open_room_player(uuid,bigint,uuid)','public.continue_open_room_queue(uuid)',
 'public.start_open_room_round(uuid)','public.end_open_room_round(uuid)','extensions.gen_random_bytes(integer)']) signature;
select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public'
 and tablename in ('rooms','room_members','room_queue_entries','room_current_players');
select room_id,count(*) from public.room_queue_entries where status in ('waiting','selected') group by room_id having count(*)>50;
select pg_get_functiondef('public.save_open_room_lineup(uuid,bigint,jsonb)'::regprocedure) like '%''random''%' as random_increment_present,
 pg_get_functiondef('public.host_kick_room_member(uuid,uuid)'::regprocedure) like '%old_player%' as selected_kick_increment_present;
