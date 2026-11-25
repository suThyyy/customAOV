-- READ ONLY. Trusted SQL Editor; capture results securely, not browser logs.
begin transaction read only;
select u.id as auth_uuid,p.id as profile_uuid,p.role as stored_role,
 to_jsonb(p)->>'role_approved_at' as approval_timestamp,
 case when to_jsonb(p)->>'role_approved_at' is not null then
   case p.role when 'organizer' then 'admin' when 'admin' then 'super_admin' else 'user' end
 else 'user' end as effective_role_under_new_policy,
 case p.role when 'player' then 'user' when 'organizer' then 'admin' when 'admin' then 'super_admin' else 'UNKNOWN' end as proposed_role_not_approved,
 (select count(*) from public.rooms r where r.host_user_id=u.id and r.status='open') as active_rooms
from auth.users u left join public.profiles p on p.id=u.id
where u.email='REPLACE_WITH_VERIFIED_EMAIL';
select id,role from public.profiles where role in ('admin','organizer');
select role,count(*) from public.profiles group by role;
select r.id,r.host_user_id,p.role from public.rooms r left join public.profiles p on p.id=r.host_user_id where r.status='open';
-- Must be empty before applying migration 02. No grandfathering exemption.
select r.id as blocked_room,r.host_user_id,p.role,to_jsonb(p)->>'role_approved_at' as approved_at
from public.rooms r left join public.profiles p on p.id=r.host_user_id
where r.status='open' and (to_jsonb(p)->>'role_approved_at' is null or p.role not in ('organizer','admin'));
select * from pg_policies where schemaname='public' and tablename in ('profiles','game_profiles','rooms','room_members','room_queue_entries','room_current_players');
select grantee,table_name,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name in ('profiles','rooms');
select grantee,column_name,privilege_type from information_schema.column_privileges where table_schema='public' and table_name='profiles';
select p.oid::regprocedure,p.proowner::regrole,p.prosecdef,p.proconfig,p.proacl,pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (p.proname like '%room%' or p.proname like '%series%' or p.proname in ('handle_new_user','prevent_profile_role_escalation','set_profile_role','assign_series_game','assign_platform_role','read_my_platform_role'));
select column_name,column_default,is_nullable from information_schema.columns where table_schema='public' and table_name='profiles';
select conname,pg_get_constraintdef(oid) from pg_constraint where conrelid='public.profiles'::regclass;
select tgname,pg_get_triggerdef(oid) from pg_trigger where tgrelid in ('public.profiles'::regclass,'auth.users'::regclass) and not tgisinternal;
rollback;
