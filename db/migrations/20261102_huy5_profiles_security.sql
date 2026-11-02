-- HUY-5: Authentication & Profile database hardening
-- Scope: Supabase Auth, profiles, game_profiles, trigger and RLS only.
-- This migration is prepared for Supabase Development review.
-- It is NOT executed by this repository and intentionally does not touch
-- Firebase, matches, communities or statistics.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'player'
    check (role in ('player', 'organizer', 'admin')),
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists public.game_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  ingame_name text not null,
  game_uid text,
  current_tier text,
  current_rank text,
  main_roles text[] not null default '{}',
  system_mmr int not null default 1000,
  created_at timestamptz not null default now()
);

-- Preserve existing data while making the intended default explicit.
alter table public.profiles
  alter column role set default 'player';

-- Legacy role mapping is intentionally not rewritten here:
-- player    = User
-- organizer = Community Admin (pending BA/BE confirmation)
-- admin     = Super Admin (pending BA/BE confirmation)
-- The mapping must be approved before introducing a renamed role constraint.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.game_profiles (user_id, ingame_name, current_rank)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'ingame_name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'current_rank', 'Unranked')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- A normal user may never change the authorization role of an existing profile.
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'profile role can only be changed by a privileged service';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute function public.prevent_profile_role_escalation();

-- The client must never receive permission to change roles directly.
-- CustomAOV's trusted backend may call this function with a service_role JWT.
-- This is intentionally not exposed to anon/authenticated clients.
create or replace function public.set_profile_role(
  target_user_id uuid,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'profile roles can only be changed by the trusted service';
  end if;

  if target_role not in ('player', 'organizer', 'admin') then
    raise exception 'unsupported profile role: %', target_role;
  end if;

  update public.profiles
  set role = target_role
  where id = target_user_id;

  if not found then
    raise exception 'profile not found for user: %', target_user_id;
  end if;
end;
$$;

revoke all on function public.set_profile_role(uuid, text)
from public, anon, authenticated;
grant execute on function public.set_profile_role(uuid, text)
to service_role;

alter table public.profiles enable row level security;
alter table public.game_profiles enable row level security;

-- Phase 2.1 has no approved public-profile field set yet, so both tables are
-- private by default. Public presentation can be added later with an explicit
-- public projection/field decision.
-- Abort instead of silently deleting an unexpected policy that could be
-- protecting existing data or granting access. The preflight currently
-- reports exactly the four legacy policies listed below.
do $$
declare
  unexpected_policies text;
begin
  select string_agg(policyname, ', ' order by tablename, policyname)
  into unexpected_policies
  from pg_policies
  where schemaname = 'public'
    and tablename in ('profiles', 'game_profiles')
    and policyname not in (
      'Public Read Profiles',
      'Public Read Game Profiles',
      'Users Update Own Profile',
      'Users Update Own Game Profile',
      'Users Read Own Profile',
      'Users Read Own Game Profile'
    );

  if unexpected_policies is not null then
    raise exception
      'Unexpected policies found on profiles/game_profiles: %. Review before applying HUY-5 migration.',
      unexpected_policies;
  end if;
end;
$$;

drop policy if exists "Public Read Profiles" on public.profiles;
drop policy if exists "Public Read Game Profiles" on public.game_profiles;
drop policy if exists "Users Read Own Profile" on public.profiles;
drop policy if exists "Users Read Own Game Profile" on public.game_profiles;
drop policy if exists "Users Update Own Profile" on public.profiles;
drop policy if exists "Users Update Own Game Profile" on public.game_profiles;

create policy "Users Read Own Profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users Read Own Game Profile"
on public.game_profiles for select
using (auth.uid() = user_id);

create policy "Users Update Own Profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users Update Own Game Profile"
on public.game_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

commit;
