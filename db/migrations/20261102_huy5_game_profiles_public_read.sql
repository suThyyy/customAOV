-- HUY-5 follow-up: align repository with the applied Production policy.
-- Scope: game_profiles SELECT policy only.
-- Apply after 20261102_huy5_profiles_security.sql.
-- This migration does not alter data, schema, trigger, UPDATE policy or roles.

begin;

drop policy if exists "Users Read Own Game Profile" on public.game_profiles;
drop policy if exists "Public Read Game Profiles" on public.game_profiles;

create policy "Public Read Game Profiles"
on public.game_profiles
for select
to anon, authenticated
using (true);

commit;
