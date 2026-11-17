import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../db/migrations/20261103_huy10_room_api_support.sql', import.meta.url), 'utf8');

test('HUY-10 support migration adds lifecycle RPCs without client-side authorization', () => {
    assert.match(migration, /create or replace function public\.close_open_room/);
    assert.match(migration, /create or replace function public\.host_add_player_to_room/);
    assert.match(migration, /create or replace function public\.host_kick_room_member/);
    assert.match(migration, /create or replace function public\.host_requeue_room_member/);
    assert.match(migration, /security definer/i);
    assert.match(migration, /set search_path = pg_catalog, public/i);
    assert.equal((migration.match(/huy9_is_anonymous_session\(\)/g) || []).length, 4);
    assert.match(migration, /for update/);
    assert.match(migration, /revoke all on function public\.close_open_room\(uuid\) from public, anon, authenticated/);
    assert.match(migration, /grant execute on function public\.host_add_player_to_room\(uuid, text\) to authenticated/);
    assert.match(migration, /grant execute on function public\.host_requeue_room_member\(uuid, uuid\) to authenticated/);
});

test('HUY-10 support migration keeps host-created guests distinct from account identities', () => {
    assert.match(migration, /alter column user_id drop not null/);
    assert.match(migration, /member_kind = 'guest' and user_id is null/);
    assert.match(migration, /user_id, member_kind, display_name/);
    assert.match(migration, /values\s*\(\s*p_room_id, null, 'guest'/s);
});

test('HUY-10 incremental join migration rejects Anonymous Auth and keeps account joins unique', () => {
    const joinMigration = fs.readFileSync(new URL('../db/migrations/20261103_huy10_account_only_join.sql', import.meta.url), 'utf8');
    assert.match(joinMigration, /huy9_is_anonymous_session\(\)/);
    assert.match(joinMigration, /Permanent authenticated account required/);
    assert.match(joinMigration, /member_kind = 'account'/);
    assert.match(joinMigration, /for update/);
    assert.match(joinMigration, /grant execute on function public\.join_open_room\(text, text\) to authenticated/);
});

test('HUY-10 verification scripts are safe before and after migration', () => {
    const preflight = fs.readFileSync(new URL('../db/verification/huy10_room_api_preflight.sql', import.meta.url), 'utf8');
    const postflight = fs.readFileSync(new URL('../db/verification/huy10_room_api_postflight.sql', import.meta.url), 'utf8');
    assert.doesNotMatch(preflight, /'public\.[a-z_]+:'::regclass/);
    assert.match(preflight, /information_schema\.tables/);
    assert.match(postflight, /invalid_member_rows/);
    assert.match(postflight, /duplicate_active_queue_members/);
});

test('live Room harness reports safe Supabase RPC diagnostics', () => {
    const harness = fs.readFileSync(new URL('./supabase-huy9-room-live.mjs', import.meta.url), 'utf8');
    assert.match(harness, /function safeError\(result\)/);
    assert.match(harness, /body\[field\]/);
    assert.match(harness, /create_open_room failed/);
    assert.doesNotMatch(harness, /access_token.*console\.log|password.*console\.log/i);
});

test('HUY-9 create Room hotfix qualifies pgcrypto and preserves the RPC contract', () => {
    const hotfix = fs.readFileSync(new URL('../db/migrations/20261103_huy9_create_room_pgcrypto_hotfix.sql', import.meta.url), 'utf8');
    assert.match(hotfix, /create or replace function public\.create_open_room\(\)/);
    assert.match(hotfix, /extensions\.gen_random_bytes\(18\)/);
    assert.match(hotfix, /returns public\.rooms/);
    assert.match(hotfix, /security definer/i);
    assert.match(hotfix, /set search_path = pg_catalog, public/);
    assert.match(hotfix, /grant execute on function public\.create_open_room\(\) to authenticated/);
});

test('live harness enforces Prepare -> Start -> End -> Host Requeue sequencing', () => {
    const harness = fs.readFileSync(new URL('./supabase-huy9-room-live.mjs', import.meta.url), 'utf8');
    const prepare = harness.indexOf("const prepared = await rpc('prepare_next_open_room_round'");
    const start = harness.indexOf("const started = await rpc('start_open_room_round'");
    const end = harness.indexOf("const ended = await rpc('end_open_room_round'");
    const requeue = harness.indexOf("const requeued = await rpc('host_requeue_room_member'");
    assert.ok(prepare >= 0 && start > prepare && end > start && requeue > end);
    assert.match(harness, /current_round_state === 'preparing'/);
    assert.match(harness, /current_round_state === 'active'/);
    assert.match(harness, /current_round_state === 'ended'/);
    assert.match(harness, /requeued\.body\?\.status === 'waiting'/);
});

test('live harness has an isolated QUEUE-3 mode without direct cleanup DELETE', () => {
    const harness = fs.readFileSync(new URL('./supabase-huy9-room-live.mjs', import.meta.url), 'utf8');
    assert.match(harness, /--queue3-only/);
    assert.match(harness, /async function isolatedQueue3Check\(users\)/);
    assert.match(harness, /QUEUE3-3/);
    assert.match(harness, /QUEUE3-4/);
    assert.match(harness, /QUEUE3-5/);
    assert.match(harness, /QUEUE3-6/);
    assert.match(harness, /Never DELETE Room or related rows here/);
});
