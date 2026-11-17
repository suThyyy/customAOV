-- HUY-9: Open Match Room database and security foundation.
-- This migration is prepared for Supabase Development review only.
-- It does not touch Quick Randomizer/localStorage, Firebase, profiles,
-- game_profiles, Match Results, Match History or Statistics.
--
-- Guest identity assumption:
-- Guest clients use Supabase Anonymous Auth. The anonymous auth user UUID is
-- the participant identity; nickname is display data only. Verify Anonymous
-- Auth is enabled before applying this migration. An unauthenticated anon
-- request cannot join a room.

begin;

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete restrict,
  invite_code text not null unique
    check (length(invite_code) between 12 and 128),
  status text not null default 'open'
    check (status in ('open', 'closed')),
  current_round_no integer not null default 0
    check (current_round_no >= 0),
  current_round_state text not null default 'idle'
    check (current_round_state in ('idle', 'preparing', 'active', 'ended')),
  version bigint not null default 0
    check (version >= 0),
  created_at timestamptz not null default statement_timestamp(),
  closed_at timestamptz
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_kind text not null check (member_kind in ('account', 'guest')),
  display_name text not null
    check (length(btrim(display_name)) between 1 and 40),
  status text not null default 'active'
    check (status in ('active', 'left', 'kicked')),
  joined_at timestamptz not null default statement_timestamp(),
  left_at timestamptz,
  unique (room_id, id),
  unique (room_id, user_id)
);

create table if not exists public.room_queue_entries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  member_id uuid not null,
  queue_seq bigint generated always as identity,
  status text not null default 'waiting'
    check (status in ('waiting', 'selected', 'played', 'removed')),
  joined_at timestamptz not null default statement_timestamp(),
  selected_round_no integer,
  unique (room_id, id),
  foreign key (room_id, member_id)
    references public.room_members(room_id, id) on delete cascade
);

-- A member may have historical queue rows, but only one active registration.
create unique index if not exists room_queue_one_active_entry
  on public.room_queue_entries(room_id, member_id)
  where status in ('waiting', 'selected');

create index if not exists room_queue_fifo_index
  on public.room_queue_entries(room_id, status, queue_seq);

-- Only the current Round snapshot is retained. Round number/state live on the
-- Room; replacing this snapshot does not create Match History.
create table if not exists public.room_current_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_no integer not null check (round_no > 0),
  member_id uuid not null,
  queue_entry_id uuid not null,
  slot smallint not null check (slot between 1 and 10),
  ready_state text not null default 'pending'
    check (ready_state in ('pending', 'ready', 'not_ready')),
  team text check (team is null or team in ('a', 'b')),
  primary key (room_id, member_id),
  unique (room_id, slot),
  unique (room_id, queue_entry_id),
  foreign key (room_id, member_id)
    references public.room_members(room_id, id) on delete cascade,
  foreign key (room_id, queue_entry_id)
    references public.room_queue_entries(room_id, id) on delete cascade
);

-- Keep this additive for a development database where the table was created
-- from an earlier HUY-9 draft.
alter table public.room_current_players
  add column if not exists ready_state text not null default 'pending'
    check (ready_state in ('pending', 'ready', 'not_ready'));

create index if not exists room_members_room_status_index
  on public.room_members(room_id, status, joined_at);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_queue_entries enable row level security;
alter table public.room_current_players enable row level security;

-- RLS policies must not query room_members directly from another
-- room_members policy (that would recurse). This owner-controlled helper
-- evaluates membership with table-owner privileges and only returns a
-- boolean for the current JWT subject.
create or replace function public.huy9_can_access_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select exists (
    select 1
    from public.rooms r
    where r.id = p_room_id
      and (
        r.host_user_id = (select auth.uid())
        or exists (
          select 1
          from public.room_members rm
          where rm.room_id = r.id
            and rm.user_id = (select auth.uid())
            and rm.status = 'active'
        )
      )
  )
$$;

-- Direct client writes are deliberately disabled. All mutations go through
-- SECURITY DEFINER functions below, which validate auth.uid() and ownership.
revoke all on public.rooms from public, anon, authenticated;
revoke all on public.room_members from public, anon, authenticated;
revoke all on public.room_queue_entries from public, anon, authenticated;
revoke all on public.room_current_players from public, anon, authenticated;
grant select on public.rooms, public.room_members,
  public.room_queue_entries, public.room_current_players to authenticated;

drop policy if exists "Room members read rooms" on public.rooms;
create policy "Room members read rooms"
  on public.rooms for select to authenticated
  using (public.huy9_can_access_room(id));

drop policy if exists "Room members read memberships" on public.room_members;
create policy "Room members read memberships"
  on public.room_members for select to authenticated
  using (public.huy9_can_access_room(room_id));

drop policy if exists "Room members read queue" on public.room_queue_entries;
create policy "Room members read queue"
  on public.room_queue_entries for select to authenticated
  using (public.huy9_can_access_room(room_id));

drop policy if exists "Room members read current players" on public.room_current_players;
create policy "Room members read current players"
  on public.room_current_players for select to authenticated
  using (public.huy9_can_access_room(room_id));

create or replace function public.huy9_is_anonymous_session()
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select auth.role() = 'authenticated'
    and coalesce((auth.jwt() ->> 'is_anonymous') = 'true', false)
$$;

revoke all on function public.huy9_can_access_room(uuid) from public, anon, authenticated;
grant execute on function public.huy9_can_access_room(uuid) to authenticated;

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
  values (auth.uid(), encode(gen_random_bytes(18), 'hex'))
  returning * into created_room;

  return created_room;
end;
$$;

create or replace function public.join_open_room(
  p_invite_code text,
  p_display_name text
)
returns public.room_members
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.rooms;
  existing_member public.room_members;
  joined_member public.room_members;
  guest_session boolean;
begin
  -- A Host may call this function like any other participant. Host ownership
  -- is not converted into an automatic queue entry or automatic selection.
  if coalesce(auth.role(), '') <> 'authenticated' or current_user_id is null then
    raise exception 'Authentication is required; use Supabase Anonymous Auth for Guest access';
  end if;
  if p_invite_code is null or length(btrim(p_invite_code)) < 12
     or p_display_name is null or length(btrim(p_display_name)) not between 1 and 40 then
    raise exception 'Invalid invite code or display name';
  end if;

  select * into target_room
  from public.rooms
  where invite_code = btrim(p_invite_code)
  for update;
  if not found or target_room.status <> 'open' then
    raise exception 'Room not found or already closed';
  end if;

  guest_session := public.huy9_is_anonymous_session();
  select * into existing_member
  from public.room_members
  where room_id = target_room.id and user_id = current_user_id
  for update;

  if found and existing_member.status = 'kicked' then
    raise exception 'This participant was kicked from the room';
  end if;
  if found and existing_member.status = 'active' then
    return existing_member;
  end if;

  if found then
    update public.room_members
    set status = 'active', display_name = btrim(p_display_name),
        joined_at = statement_timestamp(), left_at = null,
        member_kind = case when guest_session then 'guest' else 'account' end
    where id = existing_member.id
    returning * into joined_member;
  else
    insert into public.room_members (room_id, user_id, member_kind, display_name)
    values (target_room.id, current_user_id,
      case when guest_session then 'guest' else 'account' end,
      btrim(p_display_name))
    returning * into joined_member;
  end if;

  insert into public.room_queue_entries (room_id, member_id)
  values (target_room.id, joined_member.id);

  return joined_member;
end;
$$;

create or replace function public.leave_open_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  member_row public.room_members;
begin
  select * into member_row
  from public.room_members
  where room_id = p_room_id and user_id = auth.uid()
  for update;
  if not found then raise exception 'Room membership not found'; end if;

  update public.room_members
  set status = 'left', left_at = statement_timestamp()
  where id = member_row.id;

  update public.room_queue_entries
  set status = 'removed'
  where room_id = p_room_id and member_id = member_row.id
    and status in ('waiting', 'selected');
end;
$$;

create or replace function public.prepare_next_open_room_round(p_room_id uuid)
returns public.rooms
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  locked_room public.rooms;
  next_round integer;
begin
  select * into locked_room from public.rooms
  where id = p_room_id and host_user_id = auth.uid()
  for update;
  if not found then raise exception 'Only the Room Host can prepare a Round'; end if;
  if locked_room.status <> 'open' then raise exception 'Room is closed'; end if;
  if locked_room.current_round_state in ('preparing', 'active') then
    raise exception 'The current Round is still in progress';
  end if;

  update public.room_queue_entries
  set status = 'played'
  where room_id = p_room_id and status = 'selected';

  delete from public.room_current_players where room_id = p_room_id;
  next_round := locked_room.current_round_no + 1;

  with chosen as (
    select q.id, q.member_id,
           row_number() over (order by q.queue_seq)::smallint as slot
    from public.room_queue_entries q
    join public.room_members m on m.room_id = q.room_id and m.id = q.member_id
    where q.room_id = p_room_id and q.status = 'waiting' and m.status = 'active'
    order by q.queue_seq
    limit 10
  )
  insert into public.room_current_players (room_id, round_no, member_id, queue_entry_id, slot)
  select p_room_id, next_round, member_id, id, slot from chosen;

  update public.room_queue_entries q
  set status = 'selected', selected_round_no = next_round
  where q.room_id = p_room_id
    and q.id in (select queue_entry_id from public.room_current_players where room_id = p_room_id);

  update public.rooms
  set current_round_no = next_round, current_round_state = 'preparing',
      version = version + 1
  where id = p_room_id
  returning * into locked_room;
  return locked_room;
end;
$$;

create or replace function public.start_open_room_round(p_room_id uuid)
returns public.rooms
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare updated_room public.rooms;
begin
  update public.rooms
  set current_round_state = 'active', version = version + 1
  where id = p_room_id and host_user_id = auth.uid()
    and status = 'open' and current_round_state = 'preparing'
  returning * into updated_room;
  if not found then raise exception 'Only the Host can start a prepared Round'; end if;
  return updated_room;
end;
$$;

create or replace function public.end_open_room_round(p_room_id uuid)
returns public.rooms
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare updated_room public.rooms;
begin
  update public.rooms
  set current_round_state = 'ended', version = version + 1
  where id = p_room_id and host_user_id = auth.uid()
    and status = 'open' and current_round_state = 'active'
  returning * into updated_room;
  if not found then raise exception 'Only the Host can end an active Round'; end if;

  update public.room_queue_entries q
  set status = 'played'
  where q.room_id = p_room_id and q.status = 'selected';
  return updated_room;
end;
$$;

create or replace function public.continue_open_room_queue(p_room_id uuid)
returns public.room_queue_entries
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  member_row public.room_members;
  entry_row public.room_queue_entries;
begin
  select * into member_row from public.room_members
  where room_id = p_room_id and user_id = auth.uid() and status = 'active'
  for update;
  if not found then raise exception 'Active Room membership not found'; end if;

  if exists (select 1 from public.room_queue_entries
             where room_id = p_room_id and member_id = member_row.id
               and status in ('waiting', 'selected')) then
    raise exception 'Participant is already registered in the Queue';
  end if;

  insert into public.room_queue_entries (room_id, member_id)
  values (p_room_id, member_row.id)
  returning * into entry_row;
  return entry_row;
end;
$$;

revoke all on function public.huy9_is_anonymous_session() from public, anon, authenticated;
revoke all on function public.create_open_room() from public, anon, authenticated;
revoke all on function public.join_open_room(text, text) from public, anon, authenticated;
revoke all on function public.leave_open_room(uuid) from public, anon, authenticated;
revoke all on function public.prepare_next_open_room_round(uuid) from public, anon, authenticated;
revoke all on function public.start_open_room_round(uuid) from public, anon, authenticated;
revoke all on function public.end_open_room_round(uuid) from public, anon, authenticated;
revoke all on function public.continue_open_room_queue(uuid) from public, anon, authenticated;

grant execute on function public.create_open_room() to authenticated;
grant execute on function public.join_open_room(text, text) to authenticated;
grant execute on function public.leave_open_room(uuid) to authenticated;
grant execute on function public.prepare_next_open_room_round(uuid) to authenticated;
grant execute on function public.start_open_room_round(uuid) to authenticated;
grant execute on function public.end_open_room_round(uuid) to authenticated;
grant execute on function public.continue_open_room_queue(uuid) to authenticated;

commit;
