import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roomMigration = fs.readFileSync(
  'db/migrations/20261103_huy9_open_room_security.sql',
  'utf8'
);
const authCompatibilityMigration = fs.readFileSync(
  'db/migrations/20261103_huy9_anonymous_auth_compatibility.sql',
  'utf8'
);
const huy5Migration = fs.readFileSync(
  'db/migrations/20261102_huy5_profiles_security.sql',
  'utf8'
);

test('HUY-9 distinguishes Anonymous Auth from registered authenticated users', () => {
  assert.match(roomMigration, /auth\.role\(\) = 'authenticated'/i);
  assert.match(roomMigration, /auth\.jwt\(\) ->> 'is_anonymous'/i);
  assert.match(roomMigration, /auth\.uid\(\) is null/i);
  assert.match(roomMigration, /Only a registered authenticated user can create a room/i);
  assert.match(roomMigration, /Guest clients use Supabase Anonymous Auth\. The anonymous auth user UUID/i);
});

test('HUY-5 trigger is identified as unsafe for NULL email before compatibility migration', () => {
  assert.match(huy5Migration, /split_part\(new\.email, '@', 1\)/i);
  assert.match(huy5Migration, /insert into public\.game_profiles/i);
  assert.match(huy5Migration, /ingame_name text not null/i);
  assert.match(authCompatibilityMigration, /if is_anonymous_user then\s*return new/i);
  assert.doesNotMatch(authCompatibilityMigration, /alter column ingame_name drop not null/i);
});

test('Anonymous Auth compatibility keeps Guests out of profiles and upgrades permanent accounts', () => {
  assert.match(authCompatibilityMigration, /does not need profiles\/game_profiles/i);
  assert.match(authCompatibilityMigration, /on_auth_user_anonymous_upgrade/i);
  assert.match(authCompatibilityMigration, /was_anonymous and not is_anonymous_user/i);
  assert.match(authCompatibilityMigration, /huy9_ensure_user_profiles/i);
  assert.match(authCompatibilityMigration, /request_game_uid_change/i);
  assert.match(authCompatibilityMigration, /permanent authenticated user required/i);
  assert.match(authCompatibilityMigration, /public\.huy9_is_anonymous_session\(\)/i);
  assert.match(authCompatibilityMigration, /set search_path = pg_catalog, public/i);
  assert.match(authCompatibilityMigration, /on conflict \(id\) do nothing/i);
  assert.match(authCompatibilityMigration, /on conflict \(user_id\) do nothing/i);
});

test('Anonymous compatibility migration does not rewrite HUY-5 migration history', () => {
  assert.doesNotMatch(authCompatibilityMigration, /drop trigger if exists on_auth_user_created/i);
  assert.match(authCompatibilityMigration, /Keep the existing HUY-5 INSERT trigger/i);
});
