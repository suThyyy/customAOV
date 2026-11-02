const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(api = {}) {
    const elements = new Map();
    const get = id => {
        if (!elements.has(id)) elements.set(id, {
            value: '', style: {}, dataset: {}, hidden: false,
            classList: { toggle() {} }, handlers: {},
            setAttribute(name, value) { this[name] = value; },
            focus() {},
            addEventListener(event, fn) { this.handlers[event] = fn; },
            reset() { get('authPassword').value = ''; get('authOtp').value = ''; }
        });
        return elements.get(id);
    };
    const tabs = ['signin', 'signup'].map(mode => {
        const el = get(mode); el.dataset.tab = mode; return el;
    });
    let updates = 0, resends = 0;
    const context = {
        document: { getElementById: get, querySelector: get, querySelectorAll: () => tabs },
        Date, Math,
        signUpWithEmail: async () => ({ data: { session: null } }),
        signInWithEmail: async () => ({ error: { code: 'email_not_confirmed' } }),
        verifyEmailOtp: async () => ({ data: { session: { user: {} } } }),
        resendSignupOtp: async () => { resends++; return {}; },
        ...api
    };
    vm.createContext(context);
    const source = fs.readFileSync('auth-ui.js', 'utf8').replace(/^import .*\r?\n/, '').replace('export function', 'function');
    vm.runInContext(source, context);
    context.setupOtpAuth(async () => updates++);
    return { get, updates: () => updates, resends: () => resends,
        click: id => get(id).handlers.click(),
        submit: () => get('authForm').handlers.submit({ preventDefault() {} }) };
}

test('signup waits for OTP, blocks immediate resend, then establishes session', async () => {
    const ui = setup();
    ui.click('signup');
    ui.get('authEmail').value = 'player@example.com';
    ui.get('authPassword').value = 'secret';
    ui.get('authPasswordConfirm').value = 'secret';
    await ui.submit();
    assert.equal(ui.get('authOtpFields').hidden, false);
    assert.equal(ui.get('authPassword').value, '');
    assert.equal(ui.updates(), 0);
    await ui.click('authResendBtn');
    assert.equal(ui.resends(), 0);
    ui.get('authOtp').value = '123456';
    await ui.submit();
    assert.equal(ui.updates(), 1);
    assert.equal(ui.get('authModal').hidden, true);
    assert.equal(ui.get('authSubmitBtn').disabled, false);
});

test('unconfirmed login allows resend; expired code keeps verification available', async () => {
    const ui = setup({ verifyEmailOtp: async () => ({ error: { code: 'otp_expired' } }) });
    ui.get('authEmail').value = 'player@example.com';
    await ui.submit();
    await ui.click('authResendBtn');
    assert.equal(ui.resends(), 1);
    ui.get('authOtp').value = '000000';
    await ui.submit();
    assert.equal(ui.get('authOtpFields').hidden, false);
    assert.equal(ui.get('authMessage').hidden, false);
    assert.equal(ui.get('authSubmitBtn').disabled, false);
    assert.equal(ui.updates(), 0);
    ui.click('authBackBtn');
    assert.equal(ui.get('authOtpFields').hidden, true);
    assert.equal(ui.get('authPassword').disabled, false);
});

test('signup rejects mismatched passwords before calling Supabase', async () => {
    let calls = 0;
    const ui = setup({ signUpWithEmail: async () => { calls++; return {}; } });
    ui.click('signup');
    assert.equal(ui.get('authPasswordConfirm').required, true);
    ui.get('authPassword').value = 'secret1';
    ui.get('authPasswordConfirm').value = 'secret2';
    await ui.submit();
    assert.equal(calls, 0);
    assert.equal(ui.get('authMessage').hidden, false);
    assert.equal(ui.get('authSubmitBtn').disabled, false);
});

test('password visibility toggles independently and resets on close and tab change', () => {
    const ui = setup();
    ui.click('signup');
    ui.click('authPasswordToggle');
    assert.equal(ui.get('authPassword').type, 'text');
    assert.equal(ui.get('authPasswordConfirm').type, 'password');
    ui.click('authConfirmToggle');
    assert.equal(ui.get('authConfirmToggle')['aria-pressed'], 'true');
    ui.click('authModalClose');
    assert.equal(ui.get('authPassword').type, 'password');
    assert.equal(ui.get('authPasswordConfirm').type, 'password');
    ui.click('signin');
    assert.equal(ui.get('authPasswordConfirm').disabled, true);
    assert.equal(ui.get('authPasswordConfirm').required, false);
    assert.equal(ui.get('authConfirmToggle').hidden, true);
});
