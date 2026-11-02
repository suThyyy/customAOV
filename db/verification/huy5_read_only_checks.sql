-- HUY-5 verification queries. READ-ONLY: run in Supabase SQL Editor only.

-- 1. Confirm the two application tables and columns.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'game_profiles')
order by table_name, ordinal_position;

-- 2. Confirm PK/FK/UNIQUE constraints.
select
  conrelid::regclass as table_name,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in (
  'public.profiles'::regclass,
  'public.game_profiles'::regclass
)
order by table_name, constraint_name;

-- 3. Confirm profile trigger and function.
select event_object_schema, event_object_table, trigger_name,
       action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users';

-- 4. Confirm effective policies.
-- Expected final state after the follow-up migration:
--   profiles: owner-only SELECT and UPDATE
--   game_profiles: public SELECT, owner-only UPDATE
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'game_profiles')
order by tablename, policyname;

-- 5. Confirm every auth user has at most one related profile of each type.
select u.id, u.email, p.id as profile_id, gp.id as game_profile_id
from auth.users u
left join public.profiles p on p.id = u.id
left join public.game_profiles gp on gp.user_id = u.id
order by u.created_at desc;

-- 6. Must return zero rows.
select user_id, count(*) as game_profile_count
from public.game_profiles
group by user_id
having count(*) > 1;

-- 7. Must return zero rows.
select gp.*
from public.game_profiles gp
left join public.profiles p on p.id = gp.user_id
where p.id is null;

-- 8. Environment evidence only; this does not label dev/prod by itself.
select current_database(), current_schema(), version();

-- Manual two-account RLS test (run as two separate authenticated sessions,
-- never with a service-role key):
-- A. User A selects only their own profiles row.
-- B. User A attempts to select User B's profiles row: expect 0 rows.
--    User A may select User B's game_profiles row because it is public by design.
-- C. User A attempts to update User B's row: expect 0 affected rows.
-- D. User A attempts to update their own role: expect the trigger exception.
-- E. User A attempts to insert a second game_profiles row with the same user_id:
--    expect the UNIQUE constraint violation.
