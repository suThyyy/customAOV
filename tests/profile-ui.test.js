const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadProfileUi() {
    const elements = new Map();
    const ids = [
        'profileModal', 'profileForm', 'profileModalClose', 'profileBtn', 'profileMessage',
        'profileDisplayName', 'profileAvatarUrl', 'profileBio', 'profileRole',
        'gameIngameName', 'gameUid', 'gameTier', 'gameRank', 'gameRoles', 'gameMmr',
        'profileCancelBtn'
    ];
    const get = id => {
        if (!elements.has(id)) {
            elements.set(id, {
                id, value: '', textContent: '', hidden: false, disabled: false,
                dataset: {}, handlers: {}, focus() { this.focused = true; },
                addEventListener(event, handler) { this.handlers[event] = handler; },
                querySelectorAll() { return []; }
            });
        }
        return elements.get(id);
    };
    ids.forEach(get);
    const form = get('profileForm');
    form.querySelectorAll = () => ids.map(get).filter(element => element !== form);
    const documentRef = {
        activeElement: { focus() {} },
        getElementById: get,
        addEventListener(event, handler) { this.handlers ||= {}; this.handlers[event] = handler; }
    };
    const source = fs.readFileSync('profile-ui.js', 'utf8')
        .replace(/export function/g, 'function');
    const context = { document: documentRef, URL, console };
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.createProfileUI = createProfileUI; this.validateAvatarUrl = validateAvatarUrl;`, context);
    return { createProfileUI: context.createProfileUI, validateAvatarUrl: context.validateAvatarUrl, get, documentRef };
}

test('avatar validation accepts http/https and rejects unsafe protocols', () => {
    const { validateAvatarUrl } = loadProfileUi();
    assert.equal(validateAvatarUrl('https://example.com/avatar.png').error, null);
    assert.match(validateAvatarUrl('javascript:alert(1)').error, /http hoặc https/i);
});

test('profile UI renders business role/MMR read-only and saves only editable fields', async () => {
    const ui = loadProfileUi();
    let accountPayload;
    let uidPayload;
    const profileUi = ui.createProfileUI({
        documentRef: ui.documentRef,
        profileApi: {
            updateAccountProfile: async payload => { accountPayload = payload; return { data: { ...payload, role: 'player' }, error: null }; },
            requestGameUidChange: async payload => { uidPayload = payload; return { data: { game_uid: payload, system_mmr: 1000 }, error: null }; }
        }
    });
    profileUi.setAuthState({
        status: 'ready',
        user: { id: 'user-a' },
        profiles: {
            account: { display_name: 'A', avatar_url: '', bio: 'Bio', role: 'admin' },
            game: { ingame_name: 'AOV A', game_uid: '1', current_tier: 'Master', current_rank: '10', main_roles: ['mid'], system_mmr: 1234 }
        },
        error: null
    });
    ui.get('profileBtn').handlers.click();
    assert.equal(ui.get('profileRole').textContent, 'Super Admin');
    assert.equal(ui.get('gameMmr').textContent, '1234');
    ui.get('profileDisplayName').value = 'Updated';
    ui.get('gameUid').value = '2';
    await ui.get('profileForm').handlers.submit({ preventDefault() {} });
    assert.equal(accountPayload.display_name, 'Updated');
    assert.equal(uidPayload, '2');
    assert.equal('role' in accountPayload, false);
    assert.match(ui.get('profileMessage').textContent, /Đã lưu/i);
});

test('logout clears profile UI and Escape restores focus', () => {
    const ui = loadProfileUi();
    const profileUi = ui.createProfileUI({
        documentRef: ui.documentRef,
        profileApi: { updateAccountProfile: async () => ({}), requestGameUidChange: async () => ({}) }
    });
    profileUi.setAuthState({ status: 'ready', user: { id: 'user-a' }, profiles: { account: {}, game: {} }, error: null });
    ui.get('profileBtn').handlers.click();
    assert.equal(ui.get('profileModal').hidden, false);
    ui.documentRef.handlers.keydown({ key: 'Escape' });
    assert.equal(ui.get('profileModal').hidden, true);
    profileUi.setAuthState({ status: 'signed_out', user: null, profiles: null, error: null });
    assert.equal(ui.get('profileBtn').hidden, true);
    assert.equal(profileUi.getState().profiles, null);
});

test('profile UI exposes loading and save error states', async () => {
    const ui = loadProfileUi();
    const profileUi = ui.createProfileUI({
        documentRef: ui.documentRef,
        profileApi: {
            updateAccountProfile: async () => ({ data: null, error: new Error('Save failed') }),
            requestGameUidChange: async () => ({ data: null, error: null })
        }
    });
    profileUi.setAuthState({ status: 'loading', user: { id: 'user-a' }, profiles: null, error: null });
    ui.get('profileBtn').handlers.click();
    assert.match(ui.get('profileMessage').textContent, /Đang tải/i);
    assert.equal(ui.get('profileDisplayName').disabled, true);
    profileUi.setAuthState({ status: 'ready', user: { id: 'user-a' }, profiles: { account: {}, game: { ingame_name: 'A' } }, error: null });
    ui.get('profileBtn').handlers.click();
    await ui.get('profileForm').handlers.submit({ preventDefault() {} });
    assert.match(ui.get('profileMessage').textContent, /Save failed/i);
});

test('profile modal has a mobile responsive rule', () => {
    const css = fs.readFileSync('css/style.css', 'utf8');
    assert.match(css, /\.profile-modal/);
    assert.match(css, /@media\(max-width:460px\).*\.profile-modal/);
});
