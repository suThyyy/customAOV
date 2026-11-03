const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadProfileApi({ user = { id: 'user-a' }, client, getCurrentUser } = {}) {
    const source = fs.readFileSync('supabaseProfile.js', 'utf8')
        .replace(/^import .*\r?\n/, '')
        .replace(/export function/g, 'function')
        .replace(/export const profileApi/g, 'const profileApi');
    const resolveUser = getCurrentUser || (async () => user);
    const context = { supabase: client, getUser: resolveUser, console };
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.createProfileApi = createProfileApi;`, context);
    return context.createProfileApi({ client, getCurrentUser: resolveUser });
}

function fakeClient() {
    const calls = [];
    const builder = table => ({
        select(fields) { calls.push({ operation: 'select', table, fields }); return this; },
        update(values) { calls.push({ operation: 'update', table, values }); return this; },
        eq(field, value) { calls.push({ operation: 'eq', table, field, value }); return this; },
        single: async () => ({ data: { ok: true }, error: null })
    });
    return { calls, from: table => builder(table) };
}

test('profile API reads only the authenticated user profile and returns game profile data', async () => {
    const client = fakeClient();
    let userLookups = 0;
    const api = loadProfileApi({
        client,
        getCurrentUser: async () => { userLookups++; return { id: 'user-a' }; }
    });
    await api.readMyProfiles();
    assert.deepEqual(client.calls.filter(call => call.operation === 'eq'), [
        { operation: 'eq', table: 'profiles', field: 'id', value: 'user-a' },
        { operation: 'eq', table: 'game_profiles', field: 'user_id', value: 'user-a' }
    ]);
    assert.equal(userLookups, 1);
});

test('profile API rejects role changes before sending an update', async () => {
    const client = fakeClient();
    const api = loadProfileApi({ client });
    const result = await api.updateAccountProfile({ display_name: 'A', role: 'admin' });
    assert.match(result.error.message, /trusted service/i);
    assert.equal(client.calls.some(call => call.operation === 'update'), false);
});

test('profile API limits account updates to approved writable fields', async () => {
    const client = fakeClient();
    const api = loadProfileApi({ client });
    await api.updateAccountProfile({ display_name: 'A', bio: 'Bio', role: undefined });
    assert.equal(client.calls.some(call => call.operation === 'update'), false);
});

test('profile API rejects client-controlled row identifiers on updates', async () => {
    const client = fakeClient();
    const api = loadProfileApi({ client });
    const account = await api.updateAccountProfile({ id: 'user-b', display_name: 'A' });
    const game = await api.updateGameProfile({ user_id: 'user-b', ingame_name: 'B' });
    assert.match(account.error.message, /unsupported account profile field/i);
    assert.match(game.error.message, /unsupported game profile field/i);
    assert.equal(client.calls.some(call => call.operation === 'update'), false);
});

test('public game profile read validates its target id', async () => {
    const client = fakeClient();
    const api = loadProfileApi({ client });
    const result = await api.readPublicGameProfile('');
    assert.match(result.error.message, /user id is required/i);
    assert.equal(client.calls.length, 0);
});

test('unauthenticated profile updates do not call the database client', async () => {
    const client = fakeClient();
    const api = loadProfileApi({ client, user: null });
    const result = await api.updateGameProfile({ ingame_name: 'A' });
    assert.match(result.error.message, /authentication required/i);
    assert.equal(client.calls.length, 0);
});
