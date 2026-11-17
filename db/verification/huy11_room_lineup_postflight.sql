-- HUY-11 POST-MIGRATION VERIFICATION (READ ONLY)
-- Run only after 20261103_huy11_room_lineup.sql commits.

select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name='room_current_players'
  and column_name in ('skill_mode','skill_value','skill_score')
order by column_name;

select conname,contype,pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid='public.room_current_players'::regclass
  and conname in ('room_current_players_skill_mode_check',
                  'room_current_players_skill_score_check');

select r.id,r.status,r.current_round_state,count(p.member_id) as selected_count,
       count(p.member_id) filter (where p.skill_mode is not null
                                  and p.skill_value is not null
                                  and p.skill_score is not null) as complete_skill_count,
       count(p.member_id) filter (where p.team='a') as team_a_count,
       count(p.member_id) filter (where p.team='b') as team_b_count
from public.rooms r left join public.room_current_players p on p.room_id=r.id
where r.status='open' and r.current_round_state in ('preparing','active')
group by r.id,r.status,r.current_round_state;

select p.oid::regprocedure, pg_get_userbyid(p.proowner) as owner,
       p.prosecdef, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('read_open_room_state','huy11_lock_preparing',
                    'save_open_room_lineup','replace_open_room_player',
                    'prepare_next_open_room_round','start_open_room_round')
order by p.oid::regprocedure::text;

select p.oid::regprocedure,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_exec,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as user_exec
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('read_open_room_state','huy11_lock_preparing',
                    'save_open_room_lineup','replace_open_room_player',
                    'prepare_next_open_room_round','start_open_room_round')
order by p.oid::regprocedure::text;

select grantee,table_name,privilege_type
from information_schema.table_privileges
where table_schema='public'
  and table_name in ('rooms','room_members','room_queue_entries','room_current_players')
  and grantee in ('anon','authenticated')
order by table_name,grantee,privilege_type;

select schemaname,tablename
from pg_publication_tables
where pubname='supabase_realtime' and schemaname='public'
  and tablename in ('rooms','room_members','room_queue_entries','room_current_players')
order by tablename;

select tablename,rowsecurity
from pg_tables
where schemaname='public'
  and tablename in ('rooms','room_members','room_queue_entries','room_current_players')
order by tablename;
