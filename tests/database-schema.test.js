const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync(
    'db/migrations/20261102_huy5_profiles_security.sql',
    'utf8'
);
const publicGameProfilesMigration = fs.readFileSync(
    'db/migrations/20261102_huy5_game_profiles_public_read.sql',
    'utf8'
);

test('HUY-5 migration defines one-to-one profile relationships', () => {
    assert.match(migration, /id uuid primary key references auth\.users\(id\)/i);
    assert.match(migration, /user_id uuid not null unique references public\.profiles\(id\)/i);
    assert.match(migration, /on delete cascade/i);
});

test('HUY-5 migration creates idempotent profile trigger behavior', () => {
    assert.match(migration, /create or replace function public\.handle_new_user/i);
    assert.match(migration, /on conflict \(id\) do nothing/i);
    assert.match(migration, /on conflict \(user_id\) do nothing/i);
    assert.match(migration, /drop trigger if exists on_auth_user_created/i);
});

test('HUY-5 base migration makes profiles private and limits profile updates to the owner', () => {
    assert.match(migration, /drop policy if exists "Public Read Profiles"/i);
    assert.match(migration, /create policy "Users Read Own Profile"/i);
    assert.match(migration, /using \(auth\.uid\(\) = id\)/i);
    assert.match(migration, /with check \(auth\.uid\(\) = id\)/i);
});

test('HUY-5 follow-up migration makes game profiles publicly readable', () => {
    assert.match(publicGameProfilesMigration, /drop policy if exists "Users Read Own Game Profile"/i);
    assert.match(publicGameProfilesMigration, /create policy "Public Read Game Profiles"/i);
    assert.match(publicGameProfilesMigration, /for select/i);
    assert.match(publicGameProfilesMigration, /to anon, authenticated/i);
    assert.match(publicGameProfilesMigration, /using \(true\)/i);
});

test('HUY-5 migration prevents normal users from changing profile roles', () => {
    assert.match(migration, /prevent_profile_role_escalation/i);
    assert.match(migration, /auth\.role\(\).*service_role/i);
    assert.match(migration, /profile role can only be changed by a privileged service/i);
});

test('HUY-5 migration exposes role administration only to service_role', () => {
    assert.match(migration, /create or replace function public\.set_profile_role/i);
    assert.match(migration, /revoke all on function public\.set_profile_role\(uuid, text\)/i);
    assert.match(migration, /grant execute on function public\.set_profile_role\(uuid, text\)[\s\S]*?to service_role/i);
    assert.match(migration, /unsupported profile role/i);
});

test('HUY-5 migration aborts on unexpected existing policies', () => {
    assert.match(migration, /Unexpected policies found on profiles\/game_profiles/i);
    assert.match(migration, /Review before applying HUY-5 migration/i);
});
