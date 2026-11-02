#!/usr/bin/env node

/**
 * HUY-5 live Supabase checks.
 *
 * Default mode is read-only. It requires two existing test accounts and never
 * creates, updates or deletes Supabase data.
 *
 * Required environment variables:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   HUY5_USER_A_EMAIL
 *   HUY5_USER_A_PASSWORD
 *   HUY5_USER_B_EMAIL
 *   HUY5_USER_B_PASSWORD
 *
 * Optional write-denial checks are intentionally disabled. After explicit
 * approval, run with:
 *   node tests/supabase-huy5-live.mjs --allow-write-tests
 *
 * The write checks are designed to be denied by RLS/trigger/constraints. They
 * do not create or delete records, but they still send mutation requests and
 * therefore require explicit approval.
 */

const allowWriteTests = process.argv.includes('--allow-write-tests');

const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'HUY5_USER_A_EMAIL',
    'HUY5_USER_A_PASSWORD',
    'HUY5_USER_B_EMAIL',
    'HUY5_USER_B_PASSWORD'
];

const missing = required.filter(name => !process.env[name]);
if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    process.exit(2);
}

const baseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
const anonKey = process.env.SUPABASE_ANON_KEY;

function headers(accessToken) {
    return {
        apikey: anonKey,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    };
}

async function request(path, options = {}, accessToken = null) {
    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            ...headers(accessToken),
            ...(options.headers || {})
        }
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
    if (!result.response.ok) {
        throw new Error(`Login failed for ${email}: ${JSON.stringify(result.body)}`);
    }
    return {
        email,
        user: result.body.user,
        accessToken: result.body.access_token
    };
}

function report(id, status, evidence) {
    console.log(`${status.padEnd(13)} ${id} — ${evidence}`);
}

async function readRows(table, filter, accessToken = null) {
    const path = `/rest/v1/${table}?${filter}&select=*`;
    const result = await request(path, {}, accessToken);
    if (!result.response.ok) {
        throw new Error(`${table} read failed (${result.response.status}): ${JSON.stringify(result.body)}`);
    }
    return result.body;
}

async function mutation(path, method, body, accessToken) {
    return request(path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
        },
        body: JSON.stringify(body)
    }, accessToken);
}

try {
    const [userA, userB] = await Promise.all([
        login(process.env.HUY5_USER_A_EMAIL, process.env.HUY5_USER_A_PASSWORD),
        login(process.env.HUY5_USER_B_EMAIL, process.env.HUY5_USER_B_PASSWORD)
    ]);

    if (!userA.user?.id || !userB.user?.id || userA.user.id === userB.user.id) {
        throw new Error('User A and User B must be two distinct authenticated accounts.');
    }

    const profileA = await readRows('profiles', `id=eq.${encodeURIComponent(userA.user.id)}`, userA.accessToken);
    const gameProfileA = await readRows('game_profiles', `user_id=eq.${encodeURIComponent(userA.user.id)}`, userA.accessToken);
    report('1', profileA.length === 1 && gameProfileA.length === 1 ? 'PASS' : 'FAIL',
        `User A own profile rows=${profileA.length}, game_profile rows=${gameProfileA.length}`);

    const profileBFromA = await readRows('profiles', `id=eq.${encodeURIComponent(userB.user.id)}`, userA.accessToken);
    const gameProfileBFromA = await readRows('game_profiles', `user_id=eq.${encodeURIComponent(userB.user.id)}`, userA.accessToken);
    report('2', profileBFromA.length === 0 && gameProfileBFromA.length === 1 ? 'PASS' : 'FAIL',
        `User A reading User B returned private profiles=${profileBFromA.length}, public game_profiles=${gameProfileBFromA.length}`);

    const anonymousProfile = await readRows('profiles', `id=eq.${encodeURIComponent(userA.user.id)}`);
    const anonymousGameProfile = await readRows('game_profiles', `user_id=eq.${encodeURIComponent(userA.user.id)}`);
    report('6', anonymousProfile.length === 0 && anonymousGameProfile.length === 1 ? 'PASS' : 'FAIL',
        `anonymous reads returned private profiles=${anonymousProfile.length}, public game_profiles=${anonymousGameProfile.length}`);

    report('7', profileA.length === 1 && gameProfileA.length === 1 ? 'NOT VERIFIED' : 'FAIL',
        'Existing rows confirm profile completeness, but trigger causality requires a newly registered test account.');

    if (!allowWriteTests) {
        report('3', 'NOT VERIFIED', 'Mutation test disabled; rerun with --allow-write-tests after approval.');
        report('4', 'NOT VERIFIED', 'Role mutation test disabled; rerun with --allow-write-tests after approval.');
        report('5', 'NOT VERIFIED', 'Duplicate insert test disabled; rerun with --allow-write-tests after approval.');
        report('8', 'NOT VERIFIED', 'RPC denial test disabled; rerun with --allow-write-tests after approval.');
        process.exit(0);
    }

    const updateOther = await mutation(
        `/rest/v1/profiles?id=eq.${encodeURIComponent(userB.user.id)}`,
        'PATCH',
        { bio: 'HUY-5 forbidden cross-account update test' },
        userA.accessToken
    );
    report('3', !updateOther.response.ok || !Array.isArray(updateOther.body) || updateOther.body.length === 0 ? 'PASS' : 'FAIL',
        `cross-account update HTTP ${updateOther.response.status}`);

    const changeOwnRole = await mutation(
        `/rest/v1/profiles?id=eq.${encodeURIComponent(userA.user.id)}`,
        'PATCH',
        { role: 'admin' },
        userA.accessToken
    );
    report('4', !changeOwnRole.response.ok ? 'PASS' : 'FAIL',
        `self role escalation HTTP ${changeOwnRole.response.status}`);

    const duplicateGameProfile = await mutation(
        '/rest/v1/game_profiles',
        'POST',
        { user_id: userA.user.id, ingame_name: 'HUY-5 duplicate test only' },
        userA.accessToken
    );
    report('5', !duplicateGameProfile.response.ok ? 'PASS' : 'FAIL',
        `duplicate game profile HTTP ${duplicateGameProfile.response.status}`);

    const rpcAsUser = await request('/rest/v1/rpc/set_profile_role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: userA.user.id, target_role: 'admin' })
    }, userA.accessToken);
    const rpcAsAnon = await request('/rest/v1/rpc/set_profile_role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: userA.user.id, target_role: 'admin' })
    });
    report('8', !rpcAsUser.response.ok && !rpcAsAnon.response.ok ? 'PASS' : 'FAIL',
        `authenticated RPC HTTP ${rpcAsUser.response.status}, anon RPC HTTP ${rpcAsAnon.response.status}`);
} catch (error) {
    console.error(`NOT VERIFIED  live test could not complete: ${error.message}`);
    process.exitCode = 1;
}
