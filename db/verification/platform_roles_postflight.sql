-- READ ONLY metadata checks. Does not prove behavioral denial tests passed.
begin transaction read only;
select id,role,role_approved_at from public.profiles where role in ('organizer','admin');
select has_function_privilege('authenticated','public.assign_platform_role(uuid,text,text,text)','EXECUTE') as must_be_false,
 has_function_privilege('service_role','public.assign_platform_role(uuid,text,text,text)','EXECUTE') as service_must_be_false,
 has_function_privilege('postgres','public.assign_platform_role(uuid,text,text,text)','EXECUTE') as operator_must_be_true,
 has_function_privilege('anon','public.read_my_platform_role()','EXECUTE') as anon_must_be_false,
 has_function_privilege('authenticated','public.read_my_platform_role()','EXECUTE') as must_be_true;
select has_column_privilege('authenticated','public.profiles','role','UPDATE') as must_be_false,
 has_column_privilege('authenticated','public.profiles','role_approved_at','UPDATE') as approval_must_be_false,
 has_column_privilege('authenticated','public.profiles','display_name','UPDATE') as must_be_true;
select column_default from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role';
select p.oid::regprocedure,p.proowner::regrole,p.proconfig,p.proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('read_my_platform_role','assign_platform_role','set_profile_role','prevent_profile_role_escalation');
-- Expect 17 guarded RPCs, authenticated=true, anon=false.
-- Existing service_role EXECUTE on these GUARDED entry points is preserved.
-- It does not bypass require_room_organizer's authenticated JWT/role/owner checks.
select p.oid::regprocedure,p.proowner::regrole,p.proconfig,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon,
 has_function_privilege('service_role',p.oid,'EXECUTE') as service_role
from pg_proc p where p.pronamespace='public'::regnamespace and p.prosrc like '%perform public.require_room_organizer(%';
select p.oid::regprocedure,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_must_be_false,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_must_be_false,
 has_function_privilege('service_role',p.oid,'EXECUTE') as service_must_be_false,
 exists(select from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
   where a.grantee=0 and a.privilege_type='EXECUTE') as public_must_be_false
from pg_proc p where p.pronamespace='public'::regnamespace and
 (p.proname like 'phase3_internal_%' or p.proname in ('require_room_organizer','series_host','huy11_lock_preparing'));
select r.id,r.host_user_id from public.rooms r left join public.profiles p on p.id=r.host_user_id
where r.status='open' and (p.role_approved_at is null or p.role not in ('organizer','admin'));
rollback;
