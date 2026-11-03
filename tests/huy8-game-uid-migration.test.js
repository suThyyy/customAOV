const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync(
    'db/migrations/20261103_huy8_game_uid_cooldown.sql',
    'utf8'
);

test('HUY-8 migration stores server-side UID cooldown timestamps', () => {
    assert.match(migration, /add column if not exists uid_changed_at timestamptz/i);
    assert.match(migration, /add column if not exists uid_change_available_at timestamptz/i);
    assert.match(migration, /statement_timestamp\(\)/i);
    assert.match(migration, /interval '30 days'/i);
});

test('HUY-8 migration removes direct authenticated game profile updates', () => {
    assert.match(migration, /revoke update on public\.game_profiles from public, anon, authenticated/i);
    assert.match(migration, /request_game_uid_change\(new_game_uid text\)/i);
    assert.match(migration, /grant execute on function public\.request_game_uid_change\(text\)[\s\S]*to authenticated/i);
    assert.match(migration, /security definer/i);
    assert.match(migration, /set search_path = pg_catalog, public/i);
});

test('HUY-8 migration handles unchanged UID and locks the row for cooldown decisions', () => {
    assert.match(migration, /is not distinct from normalized_uid/i);
    assert.match(migration, /for update/i);
    assert.match(migration, /uid_change_available_at/i);
});
