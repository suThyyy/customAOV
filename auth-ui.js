import { signInWithEmail, signUpWithEmail, verifyEmailOtp, resendSignupOtp } from './supabaseAuth.js';

export function setupOtpAuth(updateAuthUI) {
    const $ = id => document.getElementById(id);
    let mode = 'signin', pendingEmail = '', busy = false, resendAt = 0;
    const hidePasswords = () => {
        ['authPassword', 'authPasswordConfirm'].forEach(id => $(id).type = 'password');
    };
    const message = (text, error = false) => {
        $('authMessage').textContent = text;
        $('authMessage').style.color = error ? '#f87171' : '#4ade80';
        $('authMessage').hidden = false;
    };
    const render = () => {
        const otp = mode === 'otp';
        $('authPasswordField').hidden = otp;
        $('authPasswordConfirmField').hidden = mode !== 'signup';
        $('authOtpFields').hidden = !otp;
        $('authOtp').disabled = !otp || busy;
        $('authOtp').required = otp;
        ['authEmail', 'authPassword'].forEach(id => {
            $(id).hidden = otp;
            $(id).disabled = otp || busy;
            document.querySelector('label[for="' + id + '"]').hidden = otp;
        });
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.hidden = otp;
            tab.disabled = busy;
            tab.classList.toggle('active', tab.dataset.tab === mode);
        });
        $('authPassword').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
        $('authPasswordConfirm').hidden = mode !== 'signup';
        $('authPasswordConfirm').disabled = mode !== 'signup' || busy;
        $('authPasswordConfirm').required = mode === 'signup';
        document.querySelector('label[for="authPasswordConfirm"]').hidden = mode !== 'signup';
        [
            ['authPasswordToggle', 'authPassword', otp, 'mật khẩu'],
            ['authConfirmToggle', 'authPasswordConfirm', mode !== 'signup', 'mật khẩu nhập lại']
        ].forEach(([buttonId, inputId, hidden, label]) => {
            $(buttonId).hidden = hidden;
            $(buttonId).disabled = busy;
            const visible = $(inputId).type === 'text';
            const action = (visible ? 'Ẩn ' : 'Hiện ') + label;
            $(buttonId).setAttribute('aria-label', action);
            $(buttonId).setAttribute('title', action);
            $(buttonId).innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>' + (visible ? '<path d="m3 3 18 18"/>' : '') + '</svg>';
            $(buttonId).setAttribute('aria-pressed', String(visible));
        });
        const title = otp ? 'Xác thực email' : mode === 'signup' ? 'Đăng ký' : 'Đăng nhập';
        $('authModalTitle').textContent = title;
        $('authSubmitBtn').textContent = busy ? 'Đang xử lý...' : otp ? 'Xác thực mã' : title;
        ['authSubmitBtn', 'authResendBtn', 'authBackBtn', 'authModalClose'].forEach(id => $(id).disabled = busy);
    };
    const setMode = value => {
        hidePasswords();
        $('authPasswordConfirm').value = '';
        mode = value;
        $('authMessage').hidden = true;
        render();
    };
    const enterOtp = email => {
        pendingEmail = email;
        $('authPassword').value = '';
        $('authOtp').value = '';
        $('authOtpHint').textContent = 'Nhập mã gửi tới ' + email + '. Kiểm tra cả thư mục spam.';
        setMode('otp');
    };
    const close = () => {
        if (busy) return;
        $('authModal').hidden = true;
        $('authPassword').value = '';
        $('authPasswordConfirm').value = '';
        hidePasswords();
        render();
        $('authOtp').value = '';
    };
    [['authPasswordToggle', 'authPassword'], ['authConfirmToggle', 'authPasswordConfirm']].forEach(([buttonId, inputId]) => {
        $(buttonId).addEventListener('click', () => {
            if (busy) return;
            $(inputId).type = $(inputId).type === 'password' ? 'text' : 'password';
            render();
        });
    });
    $('openAuthBtn').addEventListener('click', () => {
        $('authModal').hidden = false;
        render();
    });
    $('authModalClose').addEventListener('click', close);
    $('authModal').addEventListener('click', e => { if (e.target === e.currentTarget) close(); });
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => { if (!busy) setMode(tab.dataset.tab); });
    });
    $('authBackBtn').addEventListener('click', () => {
        if (busy) return;
        pendingEmail = '';
        $('authForm').reset();
        setMode('signin');
    });
    const finish = async () => {
        pendingEmail = '';
        $('authForm').reset();
        setMode('signin');
        $('authModal').hidden = true;
        await updateAuthUI();
    };
    $('authResendBtn').addEventListener('click', async () => {
        if (busy || !pendingEmail) return;
        const remaining = Math.ceil((resendAt - Date.now()) / 1000);
        if (remaining > 0) return message('Vui lòng đợi ' + remaining + ' giây trước khi gửi lại.', true);
        busy = true;
        render();
        try {
            const { error } = await resendSignupOtp(pendingEmail);
            if (error) throw error;
            resendAt = Date.now() + 60000;
            message('Đã yêu cầu gửi lại mã. Vui lòng kiểm tra email.');
        } catch (error) {
            message(error.message || 'Không gửi được mã. Vui lòng thử lại.', true);
        } finally { busy = false; render(); }
    });
    $('authForm').addEventListener('submit', async e => {
        e.preventDefault();
        if (busy) return;
        if (mode === 'signup' && $('authPassword').value !== $('authPasswordConfirm').value) {
            message('Mật khẩu nhập lại không khớp. Vui lòng kiểm tra lại.', true);
            $('authPasswordConfirm').focus();
            return;
        }
        const email = $('authEmail').value.trim();
        busy = true;
        render();
        $('authMessage').hidden = true;
        try {
            if (mode === 'otp') {
                const { data, error } = await verifyEmailOtp(pendingEmail, $('authOtp').value);
                if (error) throw error;
                if (!data?.session) throw new Error('Chưa tạo được phiên đăng nhập. Vui lòng thử lại.');
                await finish();
            } else if (mode === 'signup') {
                const { data, error } = await signUpWithEmail(email, $('authPassword').value);
                if (error) throw error;
                if (data?.session) await finish();
                else {
                    enterOtp(email);
                    resendAt = Date.now() + 60000;
                    message('Kiểm tra email để lấy mã xác thực tài khoản.');
                }
            } else {
                const { error } = await signInWithEmail(email, $('authPassword').value);
                if (error?.code === 'email_not_confirmed') {
                    enterOtp(email);
                    message('Email chưa xác thực. Nhập mã đã nhận hoặc bấm Gửi lại mã.', true);
                } else if (error) throw error;
                else await finish();
            }
        } catch (error) {
            message(error.code === 'otp_expired'
                ? 'Mã không hợp lệ hoặc hết hạn. Kiểm tra lại hoặc gửi mã mới.'
                : error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.', true);
        } finally { busy = false; render(); }
    });
    hidePasswords();
    render();
}
