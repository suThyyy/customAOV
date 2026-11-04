-- HUY-10 postflight (READ-ONLY). Run after both HUY-10 migrations.

select current_database(), current_user, session_user;

select c.table_name, c.column_name, c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'room_members'
  and c.column_name in ('user_id', 'member_kind');

select con.conname, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace ns on ns.oid = rel.relnamespace
where ns.nspname = 'public'
  and rel.relname = 'room_members'
  and con.conname = 'room_members_identity_check';

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer, r.rolname as owner,
       p.proconfig as settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where n.nspname = 'public'
  and p.proname in (
    'join_open_room', 'close_open_room', 'host_add_player_to_room',
    'host_kick_room_member', 'host_requeue_room_member'
  )
order by p.proname;

select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name in (
    'join_open_room', 'close_open_room', 'host_add_player_to_room',
    'host_kick_room_member', 'host_requeue_room_member'
  )
order by routine_name, grantee, privilege_type;

select has_table_privilege('anon', 'public.room_members', 'INSERT') as anon_can_insert_members,
       has_table_privilege('authenticated', 'public.room_members', 'INSERT') as authenticated_can_insert_members,
       has_table_privilege('authenticated', 'public.room_queue_entries', 'INSERT') as authenticated_can_insert_queue;

select count(*) as invalid_member_rows
from public.room_members
where (member_kind = 'account' and user_id is null)
   or (member_kind = 'guest' and user_id is not null)
   or member_kind not in ('account', 'guest');

select count(*) as duplicate_active_queue_members
from (
  select room_id, member_id
  from public.room_queue_entries
  where status in ('waiting', 'selected')
  group by room_id, member_id
  having count(*) > 1
) duplicates;

select count(*) as host_added_players_with_auth_identity
from public.room_members
where member_kind = 'guest' and user_id is not null;
