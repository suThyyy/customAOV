-- HUY-9 hotfix: qualify pgcrypto under SECURITY DEFINER search_path.
-- The applied HUY-9 migration must not be edited. Apply this migration after
-- HUY-9/HUY-10 migrations, once the extension schema is confirmed as `extensions`.
-- No Room data is created or modified by this migration.

begin;

create or replace function public.create_open_room()
returns public.rooms
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  created_room public.rooms;
begin
  if coalesce(auth.role(), '') <> 'authenticated'
     or auth.uid() is null
     or public.huy9_is_anonymous_session() then
    raise exception 'Only a registered authenticated user can create a room';
  end if;

  insert into public.rooms (host_user_id, invite_code)
  values (auth.uid(), encode(extensions.gen_random_bytes(18), 'hex'))
  returning * into created_room;

  return created_room;
end;
$$;

-- CREATE OR REPLACE preserves the existing owner and ACL. These statements
-- make the intended API grant explicit without exposing table privileges.
revoke all on function public.create_open_room() from public, anon, authenticated;
grant execute on function public.create_open_room() to authenticated;

commit;
