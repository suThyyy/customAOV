import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  'db/migrations/20261103_huy9_open_room_security.sql',
  'utf8'
);

test('HUY-9 migration defines the minimal Open Room data model', () => {
  assert.match(migration, /create table if not exists public\.rooms/i);
  assert.match(migration, /host_user_id uuid not null references auth\.users\(id\)/i);
  assert.match(migration, /create table if not exists public\.room_members/i);
  assert.match(migration, /unique \(room_id, user_id\)/i);
  assert.match(migration, /member_kind text not null check \(member_kind in \('account', 'guest'\)\)/i);
  assert.match(migration, /create table if not exists public\.room_queue_entries/i);
  assert.match(migration, /generated always as identity/i);
  assert.match(migration, /room_queue_one_active_entry/i);
  assert.match(migration, /create table if not exists public\.room_current_players/i);
  assert.match(migration, /slot smallint not null check \(slot between 1 and 10\)/i);
  assert.match(migration, /ready_state text not null default 'pending'/i);
  assert.match(migration, /ready_state in \('pending', 'ready', 'not_ready'\)/i);
});

test('HUY-9 migration makes Guest identity independent from nickname', () => {
  assert.match(migration, /Supabase Anonymous Auth/i);
  assert.match(migration, /auth\.jwt\(\) ->> 'is_anonymous'/i);
  assert.match(migration, /auth\.role\(\) = 'authenticated'/i);
  assert.match(migration, /user_id uuid not null references auth\.users\(id\)/i);
  assert.match(migration, /member_kind.*'guest'/i);
  assert.doesNotMatch(migration, /unique \([^\n]*display_name/i);
});

test('HUY-9 migration protects direct writes and exposes RPCs only to authenticated sessions', () => {
  assert.match(migration, /revoke all on public\.rooms from public, anon, authenticated/i);
  assert.match(migration, /revoke all on public\.room_members from public, anon, authenticated/i);
  assert.match(migration, /revoke all on public\.room_queue_entries from public, anon, authenticated/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = pg_catalog, public/i);
  assert.match(migration, /Only a registered authenticated user can create a room/i);
  assert.match(migration, /Only the Room Host can prepare a Round/i);
  assert.match(migration, /Only the Host can start a prepared Round/i);
  assert.match(migration, /Only the Host can end an active Round/i);
});

test('HUY-9 migration uses server ordering and atomic locking for Join/Next Round', () => {
  assert.match(migration, /queue_seq bigint generated always as identity/i);
  assert.match(migration, /where invite_code = btrim\(p_invite_code\)\s*\n\s*for update/i);
  assert.match(migration, /where id = p_room_id and host_user_id = auth\.uid\(\)\s*\n\s*for update/i);
  assert.match(migration, /order by q\.queue_seq/i);
  assert.match(migration, /limit 10/i);
  assert.match(migration, /current_round_state in \('preparing', 'active'\)/i);
  assert.match(migration, /unique index if not exists room_queue_one_active_entry/i);
});

test('HUY-9 migration keeps Host membership separate from automatic selection', () => {
  assert.match(migration, /A Host may call this function like any other participant/i);
  assert.match(migration, /member_kind.*case when guest_session then 'guest' else 'account' end/i);
  assert.match(migration, /where q\.room_id = p_room_id and q\.status = 'waiting'/i);
  assert.match(migration, /ready_state text not null default 'pending'/i);
  assert.match(migration, /current_round_state in \('preparing', 'active'\)/i);
});

test('HUY-9 Room creation explicitly rejects anonymous-auth sessions', () => {
  assert.match(migration, /coalesce\(auth\.role\(\), ''\) <> 'authenticated'/i);
  assert.match(migration, /or public\.huy9_is_anonymous_session\(\)/i);
  assert.match(migration, /Only a registered authenticated user can create a room/i);
  assert.match(migration, /grant execute on function public\.create_open_room\(\) to authenticated/i);
});

test('HUY-9 migration keeps Quick Randomizer and Phase 1 outside its scope', () => {
  assert.match(migration, /does not touch Quick Randomizer\/localStorage, Firebase/i);
  assert.match(migration, /does not create Match History/i);
  assert.doesNotMatch(migration, /localStorage\.lq_state.*insert|update.*localStorage\.lq_state/i);
});
