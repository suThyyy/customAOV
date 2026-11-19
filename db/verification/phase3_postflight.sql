-- Run as the reviewed migration owner. Every passes value must be true.
with expected(migration,signature,baseline) as (values
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
select migration,signature,pg_get_userbyid(p.proowner) as owner,p.proconfig as function_settings,
 coalesce(p.proowner=current_user::regrole and p.prosecdef
 and 'search_path=pg_catalog, public'=any(p.proconfig)
 and has_function_privilege('authenticated',p.oid,'execute')
 and not has_function_privilege('anon',p.oid,'execute'),false) as passes
from expected left join pg_proc p on p.oid=to_regprocedure(signature) order by migration,signature;
select c.relname,c.relrowsecurity,has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE') as client_write
from pg_class c where c.relnamespace='public'::regnamespace and c.relname in
 ('room_series','series_players','series_games','game_result_revisions','series_hero_catalog');
select signature,pg_get_userbyid(p.proowner) as owner,p.proconfig,
 coalesce(p.proowner=current_user::regrole and 'search_path=pg_catalog, public'=any(p.proconfig)
 and not has_function_privilege('anon',p.oid,'execute')
 and not has_function_privilege('authenticated',p.oid,'execute'),false) as private_contract_ok
from unnest(array['public.phase3_internal_start_open_room_round(uuid)','public.phase3_internal_end_open_room_round(uuid)',
 'public.phase3_internal_continue(uuid)','public.phase3_internal_kick(uuid,uuid)','public.series_host(uuid,bigint)',
 'public.guard_queue_capacity()','public.queue_changed()','public.prevent_active_series_close()']) signature
left join pg_proc p on p.oid=to_regprocedure(signature);
select count(*) as catalog_size from public.series_hero_catalog;
select id from public.room_series s where (select count(*) from public.series_players p where p.series_id=s.id)<>10;
