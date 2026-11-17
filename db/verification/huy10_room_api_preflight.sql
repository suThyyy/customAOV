-- HUY-10 preflight (READ-ONLY). Run after HUY-9 and before HUY-10.
-- Safe when HUY-10 objects do not exist.

select current_database(), current_user, session_user;

select table_name, table_type
from information_schema.tables
where table_schema = 'public'
  and table_name in ('rooms', 'room_members', 'room_queue_entries', 'room_current_players')
order by table_name;

select c.table_name, c.column_name, c.is_nullable, c.data_type
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in ('rooms', 'room_members', 'room_queue_entries', 'room_current_players')
  and c.column_name in ('host_user_id', 'user_id', 'member_kind', 'member_id', 'queue_seq')
order by c.table_name, c.ordinal_position;

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer, r.rolname as owner
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where n.nspname = 'public'
  and p.proname in (
    'huy9_is_anonymous_session', 'create_open_room', 'join_open_room',
    'leave_open_room', 'continue_open_room_queue',
    'close_open_room', 'host_add_player_to_room',
    'host_kick_room_member', 'host_requeue_room_member'
  )
order by p.proname, arguments;

select has_table_privilege('anon', 'public.room_members', 'INSERT') as anon_can_insert_members,
       has_table_privilege('authenticated', 'public.room_members', 'INSERT') as authenticated_can_insert_members,
       has_table_privilege('authenticated', 'public.room_queue_entries', 'INSERT') as authenticated_can_insert_queue;

select count(*) as rows_that_would_violate_huy10_identity_constraint
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

select 'Expected before HUY-10: room_members.user_id is NOT NULL; HUY-10 will make it nullable.' as note;
