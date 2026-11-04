-- HUY-9 read-only preflight for Supabase Development.
-- This script only reads catalog/data metadata. It does not create, update,
-- delete, lock or mutate Room/Profile/Firebase data.

-- 1. Current database and role context.
select current_database(), current_user, session_user, now();

-- 2. PRE-MIGRATION CHECK: required HUY-9 tables and columns.
-- Empty results are expected before the migration.
select table_schema, table_name, table_type
from information_schema.tables
where table_schema = 'public'
  and table_name in ('rooms', 'room_members', 'room_queue_entries', 'room_current_players')
order by table_name;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('rooms', 'room_members', 'room_queue_entries', 'room_current_players')
order by table_name, ordinal_position;

-- 3. POST-MIGRATION CHECK: constraints and indexes for ownership,
-- duplicate prevention and FIFO. The catalog join is safe before tables exist.
select c.oid::regclass as table_name, con.conname, con.contype,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('rooms', 'room_members', 'room_queue_entries', 'room_current_players')
order by table_name, conname;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('rooms', 'room_members', 'room_queue_entries', 'room_current_players')
order by tablename, indexname;

-- 4. POST-MIGRATION CHECK: RLS state and policies.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('rooms', 'room_members', 'room_queue_entries', 'room_current_players')
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('rooms', 'room_members', 'room_queue_entries', 'room_current_players')
order by tablename, policyname;

-- 5. POST-MIGRATION CHECK: RPC security/search_path and EXECUTE privileges.
select n.nspname as routine_schema, p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as settings,
       pg_get_userbyid(p.proowner) as owner
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'huy9_can_access_room', 'huy9_is_anonymous_session',
    'create_open_room', 'join_open_room', 'leave_open_room',
    'prepare_next_open_room_round', 'start_open_room_round',
    'end_open_room_round', 'continue_open_room_queue'
  )
order by p.proname, arguments;

select routine_schema, routine_name, specific_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'create_open_room', 'join_open_room', 'leave_open_room',
    'prepare_next_open_room_round', 'start_open_room_round',
    'end_open_room_round', 'continue_open_room_queue'
  )
order by routine_name, grantee, privilege_type;

-- 6. POST-MIGRATION CHECK: helper owner/configuration and direct table grants.
select n.nspname as routine_schema, p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer,
       p.proconfig as settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'huy9_can_access_room';

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('rooms', 'room_members', 'room_queue_entries', 'room_current_players')
  and grantee in ('anon', 'authenticated', 'public')
order by grantee, table_name, privilege_type;

-- 7. PRE/POST CHECK: confirm the existing Phase 2.1 profile trigger remains discoverable.
select trigger_schema, event_object_schema, event_object_table,
       trigger_name, action_timing, event_manipulation
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
  and trigger_name = 'on_auth_user_created';

-- Anonymous Auth schema check. Empty result means the Supabase Auth schema
-- does not expose this column and requires explicit compatibility review.
select table_schema, table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'auth'
  and table_name = 'users'
  and column_name = 'is_anonymous';

-- 8. Anonymous Auth enablement is a Supabase Auth configuration setting and
-- cannot be proven by this public-schema catalog query. Verify it in the
-- Supabase Dashboard before allowing Guest Join.

-- 9. POST-MIGRATION CHECK: verify the HUY-5 trigger function is compatible
-- with Anonymous Auth after applying the separate HUY-9 compatibility migration.
select n.nspname as routine_schema, p.proname,
       pg_get_functiondef(p.oid) as definition,
       p.prosecdef as security_definer,
       p.proconfig as settings,
       pg_get_userbyid(p.proowner) as owner
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'handle_new_user';

select table_name, column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'game_profiles'
  and column_name = 'ingame_name';
