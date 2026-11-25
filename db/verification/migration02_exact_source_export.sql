-- READ ONLY. Export the single JSON cell as plain JSON (not a Markdown table).
-- Base64 retains exact UTF-8 source bytes, including CR/LF and trailing whitespace.
begin transaction read only;
select jsonb_agg(jsonb_build_object(
 'signature',p.oid::regprocedure::text,
 'source_utf8_base64',replace(encode(convert_to(p.prosrc,'UTF8'),'base64'),E'\n',''),
 'source_md5',md5(p.prosrc),'source_bytes',octet_length(p.prosrc),
 'definition_utf8_base64',replace(encode(convert_to(pg_get_functiondef(p.oid),'UTF8'),'base64'),E'\n',''),
 'arguments',pg_get_function_arguments(p.oid),'return_type',pg_get_function_result(p.oid),
 'owner',p.proowner::regrole::text,'security_definer',p.prosecdef,
 'config',p.proconfig,'acl',p.proacl::text
) order by p.proname) as exact_source_export
from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in (
 'create_open_room','create_series_room','close_open_room','host_add_player_to_room',
 'host_kick_room_member','host_requeue_room_member','prepare_next_open_room_round',
 'save_open_room_lineup','replace_open_room_player','swap_open_room_players',
 'start_open_room_round','end_open_room_round','start_series_game','report_series_result',
 'assign_series_game','set_room_allocation_mode','set_room_play_style');
rollback;
