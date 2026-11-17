-- HUY-11 PRE-MIGRATION PREFLIGHT (READ ONLY)
-- Run after HUY-9/HUY-10 and before 20261103_huy11_room_lineup.sql.
-- This file must work before the HUY-11 skill_* columns and RPCs exist.

select table_name, table_type
from information_schema.tables
where table_schema='public'
  and table_name in ('rooms','room_members','room_queue_entries','room_current_players')
order by table_name;

select tablename, rowsecurity
from pg_tables
where schemaname='public'
  and tablename in ('rooms','room_members','room_queue_entries','room_current_players')
order by tablename;

-- HUY-11 must not already be partially installed.
select p.oid::regprocedure, pg_get_userbyid(p.proowner) as owner,
       p.prosecdef, p.proconfig, p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('read_open_room_state','huy11_lock_preparing',
                    'save_open_room_lineup','replace_open_room_player')
order by p.oid::regprocedure::text;

-- No rows are required here before applying the migration.
select r.id, r.current_round_state, count(p.member_id) as selected_count
from public.rooms r left join public.room_current_players p on p.room_id=r.id
where r.status='open' and r.current_round_state='preparing'
group by r.id,r.current_round_state
having count(p.member_id) <> 10;

-- Inventory for explicit review. Closed Rooms are retained; active/preparing
-- Rooms need follow-up because HUY-11 changes the Start prerequisite.
select status,current_round_state,count(*) as room_count
from public.rooms
group by status,current_round_state
order by status,current_round_state;

select r.id,r.status,r.current_round_state,r.current_round_no,r.version,
       count(p.member_id) as selected_count
from public.rooms r left join public.room_current_players p on p.room_id=r.id
where r.status='open' and r.current_round_state in ('preparing','active')
group by r.id,r.status,r.current_round_state,r.current_round_no,r.version
order by r.created_at;

-- Required dependency for the publication block in HUY-11.
select pubname from pg_publication where pubname='supabase_realtime';

-- Save current lifecycle definitions and ACLs before applying the forward migration.
select p.oid::regprocedure, pg_get_userbyid(p.proowner) as owner,
       p.prosecdef, p.proconfig, p.proacl, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('prepare_next_open_room_round','start_open_room_round',
                    'end_open_room_round','continue_open_room_queue');
