const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadFactory() {
    const source = fs.readFileSync('auth-integration.js', 'utf8')
        .replace('export function', 'function');
    const context = {};
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.createAuthIntegration = createAuthIntegration;`, context);
    return context.createAuthIntegration;
}

function deferred() {
    let resolve;
    const promise = new Promise(value => { resolve = value; });
    return { promise, resolve };
}

test('initialization loads the current user profile and reacts to sign out', async () => {
    const createAuthIntegration = loadFactory();
    let listener;
    const states = [];
    const integration = createAuthIntegration({
        getUser: async () => ({ id: 'user-a', email: 'a@example.test' }),
        onAuthStateChange: callback => { listener = callback; return () => {}; },
        profileApi: { readMyProfiles: async () => ({ data: { account: { id: 'user-a' }, game: {} }, error: null }) },
        onStateChange: state => states.push(state)
    });

    await integration.initialize();
    assert.equal(integration.getState().status, 'ready');
    assert.equal(integration.getState().user.id, 'user-a');
    listener('SIGNED_OUT', null);
    assert.equal(integration.getState().status, 'signed_out');
    assert.equal(integration.getState().profiles, null);
    assert.ok(states.some(state => state.status === 'loading'));
});

test('a late response from User A cannot repopulate User B state', async () => {
    const createAuthIntegration = loadFactory();
    const reads = new Map();
    const integration = createAuthIntegration({
        getUser: async () => null,
        onAuthStateChange: () => () => {},
        profileApi: { readMyProfiles: () => {
            const pending = deferred();
            reads.set(reads.size, pending);
            return pending.promise;
        } }
    });

    const userA = integration.sync({ id: 'user-a' });
    const userB = integration.sync({ id: 'user-b' });
    reads.get(0).resolve({ data: { account: { id: 'user-a' } }, error: null });
    reads.get(1).resolve({ data: { account: { id: 'user-b' } }, error: null });
    await Promise.all([userA, userB]);
    assert.equal(integration.getState().user.id, 'user-b');
    assert.equal(integration.getState().profiles.account.id, 'user-b');
});

test('profile failure is represented as an error state without retaining stale profiles', async () => {
    const createAuthIntegration = loadFactory();
    const integration = createAuthIntegration({
        getUser: async () => null,
        onAuthStateChange: () => () => {},
        profileApi: { readMyProfiles: async () => ({ data: null, error: new Error('profile unavailable') }) }
    });
    await integration.sync({ id: 'user-a' });
    assert.equal(integration.getState().status, 'error');
    assert.equal(integration.getState().profiles, null);
});

test('guest sync clears profile state and does not call the profile API', async () => {
    const createAuthIntegration = loadFactory();
    let reads = 0;
    const integration = createAuthIntegration({
        getUser: async () => null,
        onAuthStateChange: () => () => {},
        profileApi: { readMyProfiles: async () => { reads++; return { data: {}, error: null }; } }
    });
    await integration.sync(null);
    assert.equal(reads, 0);
    assert.equal(integration.getState().status, 'signed_out');
    assert.equal(integration.getState().profiles, null);
});

test('duplicate auth events for the same user reuse the active profile request', async () => {
    const createAuthIntegration = loadFactory();
    let reads = 0;
    let listener;
    const integration = createAuthIntegration({
        getUser: async () => null,
        onAuthStateChange: callback => { listener = callback; return () => {}; },
        profileApi: { readMyProfiles: async () => {
            reads++;
            return { data: { account: { id: 'user-a' }, game: {} }, error: null };
        } }
    });

    await integration.initialize();
    const session = { user: { id: 'user-a' } };
    listener('SIGNED_IN', session);
    listener('SIGNED_IN', session);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(reads, 1);
    await integration.refresh({ id: 'user-a' });
    assert.equal(reads, 2);
});
