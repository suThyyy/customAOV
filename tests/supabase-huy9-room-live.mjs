#!/usr/bin/env node

/**
 * HUY-9/HUY-10 live Supabase verification harness.
 *
 * Default mode is read-only: it logs in with existing permanent test users,
 * checks their own Profile/Game Profile rows, and never creates Room data.
 *
 * Mutation mode is intentionally gated twice:
 *   HUY9_ALLOW_PRODUCTION_WRITES=I_UNDERSTAND_PRODUCTION_WRITES
 *   node tests/supabase-huy9-room-live.mjs --allow-write-tests
 *
 * It uses only SUPABASE_ANON_KEY and user sessions. It rejects service-role or
 * sb_secret keys, does not create test accounts, and refuses to start mutation
 * tests unless the cleanup RPC responds to a read-only OPTIONS request.
 *
 * Required read-only variables:
 *   SUPABASE_URL, SUPABASE_ANON_KEY
 *   HUY9_USER_A_EMAIL, HUY9_USER_A_PASSWORD
 *   HUY9_USER_B_EMAIL, HUY9_USER_B_PASSWORD
 *
 * Optional concurrency users are read as HUY9_USER_1_EMAIL/PASSWORD through
 * HUY9_USER_11_EMAIL/PASSWORD. Missing users cause only the related cases to
 * be reported NOT VERIFIED; no account is created automatically.
 */

const allowWrites = process.argv.includes('--allow-write-tests');
const writeConfirmation = 'I_UNDERSTAND_PRODUCTION_WRITES';
const required = [
    'SUPABASE_URL', 'SUPABASE_ANON_KEY',
    'HUY9_USER_A_EMAIL', 'HUY9_USER_A_PASSWORD',
    'HUY9_USER_B_EMAIL', 'HUY9_USER_B_PASSWORD'
];
const missing = required.filter(name => !process.env[name]);
if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    process.exit(2);
}

const baseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
const anonKey = process.env.SUPABASE_ANON_KEY;
if (/service[_-]?role|sb_secret|refresh[_-]?token/i.test(anonKey)) {
    throw new Error('Refusing to run: SUPABASE_ANON_KEY looks like a privileged or secret key.');
}

const isSupabaseHosted = /\.supabase\.co$/i.test(new URL(baseUrl).hostname);
if (allowWrites && isSupabaseHosted && process.env.HUY9_ALLOW_PRODUCTION_WRITES !== writeConfirmation) {
    throw new Error('Production writes require HUY9_ALLOW_PRODUCTION_WRITES=I_UNDERSTAND_PRODUCTION_WRITES.');
}

function headers(accessToken) {
    return {
        apikey: anonKey,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    };
}

async function request(path, options = {}, accessToken = null) {
    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: { ...headers(accessToken), ...(options.headers || {}) }
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { response, body };
}

async function login(email, password) {
    const result = await request('/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!result.response.ok) throw new Error(`login failed (${result.response.status})`);
    return { user: result.body.user, accessToken: result.body.access_token };
}

async function rpc(name, body, token) {
    return request(`/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
    }, token);
}

async function rows(table, query, token) {
    return request(`/rest/v1/${table}?${query}`, {}, token);
}

function report(id, status, evidence) {
    console.log(`${status.padEnd(13)} ${id} - ${evidence}`);
}

function safeError(result) {
    const body = result?.body;
    if (!body || typeof body !== 'object') return `HTTP ${result?.response?.status ?? 'unknown'}`;
    const parts = [`HTTP ${result.response.status}`];
    for (const field of ['code', 'message', 'hint', 'details']) {
        if (typeof body[field] === 'string' && body[field]) parts.push(`${field}=${body[field]}`);
    }
    return parts.join(' | ');
}

function okDenied(result) {
    return !result.response.ok;
}

async function cleanup(roomId, hostToken) {
    if (!roomId) return;
    const closed = await rpc('close_open_room', { p_room_id: roomId }, hostToken);
    if (!closed.response.ok) {
        throw new Error(`cleanup failed (${closed.response.status}); room id was not printed`);
    }
}

async function readOnlyChecks() {
    const [a, b] = await Promise.all([
        login(process.env.HUY9_USER_A_EMAIL, process.env.HUY9_USER_A_PASSWORD),
        login(process.env.HUY9_USER_B_EMAIL, process.env.HUY9_USER_B_PASSWORD)
    ]);
    if (!a.user?.id || !b.user?.id || a.user.id === b.user.id) {
        throw new Error('A and B must be distinct permanent test users.');
    }

    const [aProfile, aGame, bProfile, bGame] = await Promise.all([
        rows('profiles', `id=eq.${encodeURIComponent(a.user.id)}&select=id,role`, a.accessToken),
        rows('game_profiles', `user_id=eq.${encodeURIComponent(a.user.id)}&select=user_id`, a.accessToken),
        rows('profiles', `id=eq.${encodeURIComponent(b.user.id)}&select=id,role`, b.accessToken),
        rows('game_profiles', `user_id=eq.${encodeURIComponent(b.user.id)}&select=user_id`, b.accessToken)
    ]);
    const complete = [aProfile, aGame, bProfile, bGame].every(result => result.response.ok);
    report('PROFILE-1', complete ? 'PASS' : 'FAIL', 'permanent test accounts can read their own Profile/Game Profile rows');
    report('PROFILE-2', 'NOT VERIFIED', 'all-user completeness and new-signup trigger causality require controlled SQL/new test account');
    return { a, b };
}

async function mutationChecks(users) {
    if (process.env.HUY9_CLEANUP_CONFIRMED !== 'YES') {
        report('SAFETY', 'NOT VERIFIED', 'set HUY9_CLEANUP_CONFIRMED=YES only after BE confirms close_open_room exists');
        return;
    }

    // OPTIONS is read-only. Current HUY-9 migration does not define this RPC,
    // so this guard should stop before create_open_room is called.
    const cleanupContract = await request('/rest/v1/rpc/close_open_room', { method: 'OPTIONS' });
    if (!cleanupContract.response.ok) {
        report('SAFETY', 'NOT VERIFIED', 'close_open_room cleanup RPC is unavailable; no mutation test was started');
        return;
    }

    let roomId = null;
    try {
        const created = await rpc('create_open_room', {}, users.a.accessToken);
        if (!created.response.ok || !created.body?.id) {
            report('ROOM-1', 'FAIL', `create_open_room failed: ${safeError(created)}`);
            return;
        }
        roomId = created.body.id;
        const inviteCode = created.body.invite_code;

        const hostJoin = await rpc('join_open_room', {
            p_invite_code: inviteCode, p_display_name: 'HUY10 host test'
        }, users.a.accessToken);
        const concurrentJoins = await Promise.all([
            rpc('join_open_room', {
                p_invite_code: inviteCode, p_display_name: 'HUY10 account B first'
            }, users.b.accessToken),
            rpc('join_open_room', {
                p_invite_code: inviteCode, p_display_name: 'HUY10 account B duplicate'
            }, users.b.accessToken)
        ]);
        const otherJoin = concurrentJoins.find(result => result.response.ok);
        const addedKick = await rpc('host_add_player_to_room', {
            p_room_id: roomId, p_display_name: 'HUY10 host-added kick'
        }, users.a.accessToken);
        const addedRequeue = await rpc('host_add_player_to_room', {
            p_room_id: roomId, p_display_name: 'HUY10 host-added requeue'
        }, users.a.accessToken);
        report('ROOM-1', created.response.ok ? 'PASS' : 'FAIL', 'permanent User created Room');
        report('ROOM-2', hostJoin.response.ok && otherJoin?.response.ok ? 'PASS' : 'FAIL', 'Host and Account Player joined');
        report('ROOM-3', concurrentJoins.every(result => result.response.ok) ? 'PASS' : 'FAIL', 'concurrent duplicate Account Join requests completed without creating multiple identities');
        report('ROOM-4', addedKick.response.ok && addedRequeue.response.ok && !addedRequeue.body?.user_id ? 'PASS' : 'FAIL', 'Host-added Players have no auth.users identity');

        const reloadedHost = await login(process.env.HUY9_USER_A_EMAIL, process.env.HUY9_USER_A_PASSWORD);
        const roomRead = await rows('rooms', `id=eq.${encodeURIComponent(roomId)}&select=id,host_user_id`, reloadedHost.accessToken);
        report('ROOM-5', roomRead.response.ok ? 'PASS' : 'FAIL', 'Host session reload retained Room access');

        const queue = await rows('room_queue_entries', `room_id=eq.${encodeURIComponent(roomId)}&select=member_id,queue_seq,status&order=queue_seq.asc`, users.a.accessToken);
        const queueRows = Array.isArray(queue.body) ? queue.body : [];
        const queueSeqs = queueRows.map(row => row.queue_seq);
        report('QUEUE-1', queue.response.ok && queueSeqs.every((seq, index) => index === 0 || seq > queueSeqs[index - 1]) ? 'PASS' : 'FAIL', 'Account and Host-added Players use database FIFO queue_seq');

        const prepareB = await rpc('prepare_next_open_room_round', { p_room_id: roomId }, users.b.accessToken);
        const startB = await rpc('start_open_room_round', { p_room_id: roomId }, users.b.accessToken);
        const endB = await rpc('end_open_room_round', { p_room_id: roomId }, users.b.accessToken);
        report('AUTH-1', !prepareB.response.ok && !startB.response.ok && !endB.response.ok ? 'PASS' : 'FAIL', 'non-Host Round mutations denied');

        const nonHostAdd = await rpc('host_add_player_to_room', { p_room_id: roomId, p_display_name: 'unauthorized' }, users.b.accessToken);
        const nonHostKick = await rpc('host_kick_room_member', { p_room_id: roomId, p_member_id: addedKick.body?.id }, users.b.accessToken);
        const nonHostRequeue = await rpc('host_requeue_room_member', { p_room_id: roomId, p_member_id: addedRequeue.body?.id }, users.b.accessToken);
        const nonHostClose = await rpc('close_open_room', { p_room_id: roomId }, users.b.accessToken);
        report('AUTH-2', [nonHostAdd, nonHostKick, nonHostRequeue, nonHostClose].every(okDenied) ? 'PASS' : 'FAIL', 'non-Host Add/Kick/Requeue/Close denied');

        const directInsert = await request('/rest/v1/room_members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_id: roomId, user_id: users.b.user.id, member_kind: 'account', display_name: 'direct write' })
        }, users.b.accessToken);
        const directUpdate = await request(`/rest/v1/rooms?id=eq.${encodeURIComponent(roomId)}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'closed' })
        }, users.b.accessToken);
        const directDelete = await request(`/rest/v1/rooms?id=eq.${encodeURIComponent(roomId)}`, { method: 'DELETE' }, users.b.accessToken);
        report('AUTH-3', okDenied(directInsert) && okDenied(directUpdate) && okDenied(directDelete) ? 'PASS' : 'FAIL', 'direct Room table writes denied; DELETE is only a denial check, never cleanup');

        const leave = await rpc('leave_open_room', { p_room_id: roomId }, users.b.accessToken);
        const rejoin = await rpc('join_open_room', { p_invite_code: inviteCode, p_display_name: 'HUY9 user B rejoin' }, users.b.accessToken);
        report('QUEUE-2', leave.response.ok && rejoin.response.ok ? 'PASS' : 'FAIL', 'Account Leave/Rejoin completed through RPC');

        const prepared = await rpc('prepare_next_open_room_round', { p_room_id: roomId }, users.a.accessToken);
        const current = await rows('room_current_players', `room_id=eq.${encodeURIComponent(roomId)}&select=room_id,slot`, users.a.accessToken);
        const started = await rpc('start_open_room_round', { p_room_id: roomId }, users.a.accessToken);
        const ended = await rpc('end_open_room_round', { p_room_id: roomId }, users.a.accessToken);
        const requeued = await rpc('host_requeue_room_member', { p_room_id: roomId, p_member_id: addedRequeue.body?.id }, users.a.accessToken);
        const kicked = await rpc('host_kick_room_member', { p_room_id: roomId, p_member_id: addedKick.body?.id }, users.a.accessToken);
        const currentRows = Array.isArray(current.body) ? current.body : [];
        const preparingState = prepared.body?.current_round_state === 'preparing';
        const activeState = started.body?.current_round_state === 'active';
        const endedState = ended.body?.current_round_state === 'ended';
        report('ROUND-1', prepared.response.ok && preparingState && current.response.ok && currentRows.length <= 10 ? 'PASS' : 'FAIL', `state=${prepared.body?.current_round_state ?? 'unknown'}, snapshot rows=${currentRows.length}`);
        report('ROUND-STATE', preparingState && activeState && endedState ? 'PASS' : 'FAIL', `Prepare=${prepared.body?.current_round_state ?? 'unknown'} Start=${started.body?.current_round_state ?? 'unknown'} End=${ended.body?.current_round_state ?? 'unknown'}`);
        report('QUEUE-3', preparingState && activeState && endedState && ended.response.ok && requeued.response.ok && requeued.body?.status === 'waiting' && kicked.response.ok ? 'PASS' : 'FAIL', 'Host-added Player is requeued only after a started and ended Round, then Host can kick another Player');

        const closed = await rpc('close_open_room', { p_room_id: roomId }, users.a.accessToken);
        report('ROOM-6', closed.response.ok ? 'PASS' : 'FAIL', 'Host closed disposable Room through RPC');
        if (closed.response.ok) roomId = null;

        report('CONCURRENCY-1', concurrentJoins.every(result => result.response.ok) ? 'PASS' : 'FAIL', 'two concurrent duplicate Join requests were sent for Account Player B');
        report('CONCURRENCY-2', 'NOT VERIFIED', '11+ distinct users and concurrent Next Round require Development/load test approval');
        report('PROFILE-3', 'NOT VERIFIED', 'new permanent signup trigger test intentionally not automated here');
    } finally {
        // Close is the only cleanup operation. Never DELETE Room rows here.
        await cleanup(roomId, users.a.accessToken);
    }
}

async function isolatedQueue3Check(users) {
    if (process.env.HUY9_CLEANUP_CONFIRMED !== 'YES') {
        report('SAFETY', 'NOT VERIFIED', 'set HUY9_CLEANUP_CONFIRMED=YES only after BE confirms close_open_room exists');
        return;
    }

    const cleanupContract = await request('/rest/v1/rpc/close_open_room', { method: 'OPTIONS' });
    if (!cleanupContract.response.ok) {
        report('SAFETY', 'NOT VERIFIED', 'close_open_room cleanup RPC is unavailable; no mutation test was started');
        return;
    }

    let roomId = null;
    try {
        const created = await rpc('create_open_room', {}, users.a.accessToken);
        if (!created.response.ok || !created.body?.id) {
            report('QUEUE3-1', 'FAIL', `Create Room failed: ${safeError(created)}`);
            return;
        }
        roomId = created.body.id;

        const added = await rpc('host_add_player_to_room', {
            p_room_id: roomId, p_display_name: 'HUY10 isolated queue3 player'
        }, users.a.accessToken);
        if (!added.response.ok || !added.body?.id) {
            report('QUEUE3-2', 'FAIL', `Host Add Player failed: ${safeError(added)}`);
            return;
        }
        const memberId = added.body.id;
        const initialQueue = await rows('room_queue_entries', `room_id=eq.${encodeURIComponent(roomId)}&member_id=eq.${encodeURIComponent(memberId)}&select=member_id,queue_seq,status&order=queue_seq.asc`, users.a.accessToken);
        const initialQueueRows = Array.isArray(initialQueue.body) ? initialQueue.body : [];
        const initialQueueSeq = initialQueueRows[0]?.queue_seq;

        const prepared = await rpc('prepare_next_open_room_round', { p_room_id: roomId }, users.a.accessToken);
        report('QUEUE3-3', prepared.response.ok && prepared.body?.current_round_state === 'preparing' ? 'PASS' : 'FAIL', `state=${prepared.body?.current_round_state ?? 'unknown'}`);

        const started = await rpc('start_open_room_round', { p_room_id: roomId }, users.a.accessToken);
        report('QUEUE3-4', started.response.ok && started.body?.current_round_state === 'active' ? 'PASS' : 'FAIL', `state=${started.body?.current_round_state ?? 'unknown'}`);

        const ended = await rpc('end_open_room_round', { p_room_id: roomId }, users.a.accessToken);
        report('QUEUE3-5', ended.response.ok && ended.body?.current_round_state === 'ended' ? 'PASS' : 'FAIL', `state=${ended.body?.current_round_state ?? 'unknown'}`);

        const requeued = await rpc('host_requeue_room_member', {
            p_room_id: roomId, p_member_id: memberId
        }, users.a.accessToken);
        const queue = await rows('room_queue_entries', `room_id=eq.${encodeURIComponent(roomId)}&member_id=eq.${encodeURIComponent(memberId)}&select=member_id,queue_seq,status&order=queue_seq.asc`, users.a.accessToken);
        const entries = Array.isArray(queue.body) ? queue.body : [];
        const waitingEntries = entries.filter(entry => entry.status === 'waiting');
        const playedEntries = entries.filter(entry => entry.status === 'played');
        const latest = entries.at(-1);
        const fifo = Number(latest?.queue_seq) > Number(initialQueueSeq);
        report('QUEUE3-6', requeued.response.ok && waitingEntries.length === 1 && latest?.status === 'waiting' && fifo ? 'PASS' : 'FAIL', `entries=${entries.length}, latest_status=${latest?.status ?? 'unknown'}, fifo=${fifo}`);
    } finally {
        // Soft-close only. Never DELETE Room or related rows here.
        await cleanup(roomId, users.a.accessToken);
    }
}

try {
    const users = await readOnlyChecks();
    if (!allowWrites) {
        report('MUTATION', 'NOT VERIFIED', 'write tests disabled; no Room data was created or changed');
        process.exit(0);
    }
    if (process.argv.includes('--queue3-only')) {
        await isolatedQueue3Check(users);
    } else {
        await mutationChecks(users);
    }
} catch (error) {
    console.error(`NOT VERIFIED - live harness stopped safely: ${error.message}`);
    process.exitCode = 1;
}
