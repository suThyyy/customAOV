-- REVIEW ONLY. No automatic privilege activation; all legacy approvals start NULL.
begin;
do $$ begin
 if current_user <> 'postgres' then raise exception 'Apply as the reviewed postgres database operator'; end if;
 if not exists(select from pg_trigger where tgrelid='public.profiles'::regclass
   and tgname='protect_profile_role' and tgenabled='O')
 then raise exception 'Expected enabled Profile protection trigger missing; stop and review drift'; end if;
end $$;
alter table public.profiles add column role_approved_at timestamptz;
alter table public.profiles alter column role set default 'player';
create table public.platform_role_audit (
 id bigint generated always as identity primary key,
 target_user_id uuid not null references auth.users(id),
 old_role text, new_role text not null,
 operator_reference text not null check(length(btrim(operator_reference)) > 0),
 execution_session name not null,
 execution_role name not null,
 jwt_role text,
 reason text not null check(length(btrim(reason)) > 0),
 changed_at timestamptz not null default statement_timestamp()
);
alter table public.platform_role_audit enable row level security;
revoke all on public.platform_role_audit from public,anon,authenticated,service_role;
revoke all on sequence public.platform_role_audit_id_seq from public,anon,authenticated,service_role;

create or replace function public.prevent_profile_role_escalation() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if (new.role is distinct from old.role or new.role_approved_at is distinct from old.role_approved_at)
 and current_user <> 'postgres' then
  raise exception 'Role changes require trusted assignment' using errcode='42501';
 end if;
 return new;
end $$;
revoke insert,delete,update on public.profiles from public,anon,authenticated;
-- Table REVOKE does not remove historical column grants. Normalize those too.
do $$ declare col name; begin
 for col in select attname from pg_attribute where attrelid='public.profiles'::regclass and attnum>0 and not attisdropped loop
  execute format('revoke insert(%I),update(%I) on public.profiles from public,anon,authenticated',col,col);
 end loop;
end $$;
-- Replace table-wide UPDATE with explicit safe profile columns.
grant update(display_name,avatar_url,bio) on public.profiles to authenticated;
revoke update(role,role_approved_at) on public.profiles from public,anon,authenticated;

create function public.read_my_platform_role() returns text
language sql stable security definer set search_path=pg_catalog,public as $$
 select case when auth.uid() is null or public.huy9_is_anonymous_session() then 'guest'
 else coalesce((select case
  when role='organizer' and role_approved_at is not null then 'admin'
  when role='admin' and role_approved_at is not null then 'super_admin'
  else 'user' end from public.profiles where id=auth.uid()),'user') end
$$;
revoke all on function public.read_my_platform_role() from public,anon,authenticated;
grant execute on function public.read_my_platform_role() to authenticated;

-- Retire the unaudited old setter. Its signature remains for compatibility,
-- but every caller must explicitly adopt the audited assignment procedure.
create or replace function public.set_profile_role(target_user_id uuid,target_role text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin raise exception 'Use assign_platform_role with verified operator and reason'; end $$;
revoke all on function public.set_profile_role(uuid,text) from public,anon,authenticated,service_role;

create function public.assign_platform_role(p_target uuid,p_role text,p_operator text,p_reason text)
returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare previous text; stored text;
begin
 -- SQL Editor uses the explicitly selected database operator. This is an
 -- INVOKER check: authenticated callers cannot inherit a function owner's role.
 if current_user <> 'postgres' then raise exception 'Database operator required' using errcode='42501'; end if;
 if p_operator is null or length(btrim(p_operator))=0 or p_reason is null or length(btrim(p_reason))=0 then raise exception 'Operator and approval reason required'; end if;
 stored := case p_role when 'user' then 'player' when 'admin' then 'organizer' when 'super_admin' then 'admin' end;
 if stored is null then raise exception 'Invalid platform role'; end if;
 select role into previous from public.profiles where id=p_target for update;
 if not found then raise exception 'Verified Auth/Profile UUID required'; end if;
 update public.profiles set role=stored,role_approved_at=case when stored='player' then null else statement_timestamp() end where id=p_target;
 insert into public.platform_role_audit(target_user_id,old_role,new_role,operator_reference,reason,execution_session,execution_role,jwt_role)
 values(p_target,previous,stored,p_operator,p_reason,session_user,current_user,auth.role());
end $$;
revoke all on function public.assign_platform_role(uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.assign_platform_role(uuid,text,text,text) to postgres;
commit;
