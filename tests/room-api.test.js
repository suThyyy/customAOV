import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomApi } from '../room-api-core.js';

function apiFixture() {
    const calls = [];
    const rows = {
        rooms: { data: { id: 'room-1' }, error: null },
        room_members: { data: [{ id: 'member-1' }], error: null },
        room_queue_entries: { data: [{ queue_seq: 1 }], error: null },
        room_current_players: { data: [], error: null }
    };
    const client = {
        calls,
        rpc(name, args) { calls.push({ type: 'rpc', name, args }); return Promise.resolve({ data: { ok: true }, error: null }); },
        from(table) {
            const query = {
                select() { return query; },
                eq() { return query; },
                order() { return query; },
                maybeSingle() { return Promise.resolve(rows[table]); },
                then(resolve, reject) { return Promise.resolve(rows[table]).then(resolve, reject); }
            };
            return query;
        },
    };
    return { client, calls, api: createRoomApi({ client, getCurrentUser: async () => ({ id: 'user-a' }) }) };
}

test('Room API exposes RPC-backed operations without trusting client authorization', async () => {
    const { api, calls } = apiFixture();
    await api.createRoom();
    await api.joinRoom('invite-code-123', 'Player A');
    await api.hostAddPlayer('room-1', 'Player A');
    await api.hostKickMember('room-1', 'member-1');
    await api.hostRequeuePlayer('room-1', 'member-1');
    await api.prepareNextRound('room-1');
    await api.startRound('room-1');
    await api.endRound('room-1');
    await api.continueQueue('room-1');
    await api.closeRoom('room-1');
    assert.deepEqual(calls.map(call => call.name), [
        'create_open_room', 'join_open_room', 'host_add_player_to_room',
        'host_kick_room_member', 'host_requeue_room_member', 'prepare_next_open_room_round',
        'start_open_room_round', 'end_open_room_round',
        'continue_open_room_queue', 'close_open_room'
    ]);
    assert.equal(calls[1].args.p_invite_code, 'invite-code-123');
    assert.equal(calls[1].args.p_display_name, 'Player A');
    assert.equal('user_id' in calls[1].args, false);
});

test('Room API reads Queue in database order and aggregates Room state', async () => {
    const { api } = apiFixture();
    const room = await api.readRoom('room-1');
    const queue = await api.readQueue('room-1');
    assert.equal(room.error, null);
    assert.deepEqual(Object.keys(room.data), ['room', 'members', 'queue', 'currentPlayers']);
    assert.equal(queue.data[0].queue_seq, 1);
});

test('Room API validates inputs and requires a current session', async () => {
    const fixture = apiFixture();
    assert.match((await fixture.api.joinRoom('', 'Player')).error.message, /Invite code/);
    assert.match((await fixture.api.hostAddPlayer('room-1', '')).error.message, /Display name/);
    const unauthenticated = createRoomApi({ client: fixture.client, getCurrentUser: async () => null });
    assert.match((await unauthenticated.createRoom()).error.message, /Authentication required/);
});

test('Anonymous sessions cannot use Account Player Room operations', async () => {
    const fixture = apiFixture();
    const anonymous = createRoomApi({
        client: fixture.client,
        getCurrentUser: async () => ({ id: 'anon-1', is_anonymous: true })
    });
    assert.match((await anonymous.createRoom()).error.message, /Permanent account required/);
    assert.match((await anonymous.joinRoom('invite-code-123', 'Player')).error.message, /Permanent account required/);
    assert.equal(fixture.calls.some(call => call.type === 'rpc'), false);
});
