-- HUY-8 UID cooldown preflight. READ-ONLY: run in Supabase SQL Editor before
-- and after applying 20261103_huy8_game_uid_cooldown.sql.
-- This script contains SELECT statements only. It does not create, update or
-- delete schema/data and does not simulate RLS as a user.

-- 1. Confirm target environment and operator context.
select current_database() as database_name,
       current_user as executing_role,
       now() as database_now;

-- 2. Confirm required tables and cooldown columns.
select table_schema, table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'game_profiles')
order by table_name, ordinal_position;

-- 3. Confirm existing profile relationships and constraints.
select conrelid::regclass as table_name,
       conname,
       contype,
       pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conrelid in ('public.profiles'::regclass, 'public.game_profiles'::regclass)
order by conrelid::regclass::text, conname;

-- 4. Data integrity before/after migration.
select count(*) as game_profile_rows,
       count(*) filter (where gp.game_uid is not null) as linked_uid_rows,
       count(*) filter (
         where gp.game_uid is not null
           and (to_jsonb(gp)->>'uid_changed_at') is null
       ) as linked_without_change_timestamp,
       count(*) filter (
         where gp.game_uid is not null
           and (to_jsonb(gp)->>'uid_change_available_at') is null
       ) as linked_without_available_timestamp
from public.game_profiles gp;

-- 5. Detect duplicate and whitespace-normalized UID values. This is evidence
-- only; do not add a UNIQUE constraint until UID canonicalization is approved.
select btrim(game_uid) as normalized_game_uid, count(*) as account_count
from public.game_profiles
where game_uid is not null and btrim(game_uid) <> ''
group by btrim(game_uid)
having count(*) > 1
order by account_count desc, normalized_game_uid;

-- 6. Confirm RLS and policies, especially no policy unexpectedly granting
-- authenticated UPDATE on game_profiles.
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'game_profiles');

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'game_profiles')
order by tablename, policyname;

-- 7. Confirm table/column privileges. The post-migration result should show
-- no UPDATE privilege for PUBLIC/anon/authenticated on game_profiles.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'game_profiles'
  and privilege_type = 'UPDATE'
order by grantee;

select grantee, column_name, privilege_type
from information_schema.role_column_grants
where table_schema = 'public'
  and table_name = 'game_profiles'
  and privilege_type = 'UPDATE'
order by grantee, column_name;

-- 8. Confirm RPC security, search_path and EXECUTE grants.
select p.oid::regprocedure as function_signature,
       p.prosecdef as security_definer,
       p.proconfig as function_configuration,
       pg_get_userbyid(p.proowner) as function_owner
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'request_game_uid_change';

select grantee, privilege_type, specific_name
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'request_game_uid_change'
order by grantee, privilege_type;

-- 9. Confirm the existing Auth trigger remains present.
select trigger_schema, event_object_schema, event_object_table,
       trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
  and trigger_name = 'on_auth_user_created';
