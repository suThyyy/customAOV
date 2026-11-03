const ROLE_LABELS = {
    player: 'User',
    organizer: 'Community Admin',
    admin: 'Super Admin'
};

const displayValue = value => value === null || value === undefined || value === ''
    ? 'Chưa có dữ liệu'
    : String(value);

export function validateAvatarUrl(value) {
    const normalized = value.trim();
    if (!normalized) return { value: '', error: null };
    try {
        const url = new URL(normalized);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
        return { value: url.toString(), error: null };
    } catch {
        return { value: normalized, error: 'Avatar URL phải là địa chỉ http hoặc https hợp lệ.' };
    }
}

export function createProfileUI({ profileApi, documentRef = document, onProfileUpdated = () => {} }) {
    const $ = id => documentRef.getElementById(id);
    const modal = $('profileModal');
    const form = $('profileForm');
    const closeButton = $('profileModalClose');
    const profileButton = $('profileBtn');
    let state = { status: 'signed_out', user: null, profiles: null, error: null };
    let previousFocus = null;
    let saving = false;

    const setStatus = (message, tone = '') => {
        const status = $('profileMessage');
        status.textContent = message;
        status.dataset.tone = tone;
        status.hidden = !message;
    };

    const setFormDisabled = disabled => {
        form.querySelectorAll('input, textarea, button').forEach(element => {
            element.disabled = disabled;
        });
        closeButton.disabled = disabled;
    };

    const render = () => {
        const loggedIn = Boolean(state.user);
        profileButton.hidden = !loggedIn;
        if (!loggedIn) {
            modal.hidden = true;
            return;
        }

        const account = state.profiles?.account || {};
        const game = state.profiles?.game || {};
        $('profileDisplayName').value = account.display_name || '';
        $('profileAvatarUrl').value = account.avatar_url || '';
        $('profileBio').value = account.bio || '';
        $('profileRole').textContent = ROLE_LABELS[account.role] || account.role || 'User';
        $('gameIngameName').textContent = displayValue(game.ingame_name);
        $('gameUid').value = game.game_uid || '';
        $('gameTier').textContent = displayValue(game.current_tier);
        $('gameRank').textContent = displayValue(game.current_rank);
        $('gameRoles').textContent = Array.isArray(game.main_roles) && game.main_roles.length
            ? game.main_roles.join(', ')
            : 'Chưa cập nhật';
        $('gameMmr').textContent = displayValue(game.system_mmr);
        const hasUid = Boolean(game.game_uid);
        $('gameUidState').textContent = hasUid ? 'Đã liên kết UID' : 'Chưa liên kết UID';
        const availableAt = game.uid_change_available_at ? new Date(game.uid_change_available_at) : null;
        if (availableAt && !Number.isNaN(availableAt.valueOf()) && availableAt > new Date()) {
            $('gameUidCooldown').textContent = 'Có thể đổi UID sau: ' + availableAt.toLocaleString('vi-VN');
            $('gameUidCooldown').hidden = false;
        } else {
            $('gameUidCooldown').textContent = '';
            $('gameUidCooldown').hidden = true;
        }
        setFormDisabled(saving || state.status === 'loading');

        if (state.status === 'loading') setStatus('Đang tải hồ sơ...');
        else if (state.error) setStatus(state.error.message || 'Không tải được hồ sơ.', 'error');
    };

    const setAuthState = nextState => {
        state = nextState;
        if (!state.user) {
            saving = false;
            setStatus('');
        }
        render();
    };

    const close = () => {
        if (saving) return;
        modal.hidden = true;
        setStatus('');
        if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
        previousFocus = null;
    };

    const open = () => {
        if (!state.user) return;
        previousFocus = documentRef.activeElement;
        modal.hidden = false;
        render();
        closeButton.focus();
    };

    const save = async event => {
        event.preventDefault();
        if (saving || !state.user) return;

        const avatar = validateAvatarUrl($('profileAvatarUrl').value);
        if (avatar.error) {
            setStatus(avatar.error, 'error');
            $('profileAvatarUrl').focus();
            return;
        }

        const currentUid = state.profiles?.game?.game_uid || '';
        const requestedUid = $('gameUid').value.trim();
        if (currentUid && !requestedUid) {
            setStatus('Không thể xóa UID đã liên kết.', 'error');
            $('gameUid').focus();
            return;
        }

        saving = true;
        setStatus('Đang lưu hồ sơ...');
        setFormDisabled(true);
        try {
            const [accountResult, uidResult] = await Promise.all([
                profileApi.updateAccountProfile({
                    display_name: $('profileDisplayName').value.trim(),
                    avatar_url: avatar.value,
                    bio: $('profileBio').value.trim()
                }),
                requestedUid !== currentUid
                    ? profileApi.requestGameUidChange(requestedUid)
                    : Promise.resolve({ data: state.profiles?.game || null, error: null })
            ]);
            const error = accountResult.error || uidResult.error;
            if (error) throw error;
            state = {
                ...state,
                status: 'ready',
                profiles: { account: accountResult.data, game: uidResult.data },
                error: null
            };
            onProfileUpdated(state.profiles);
            setStatus('Đã lưu hồ sơ.', 'success');
        } catch (error) {
            state = { ...state, status: 'error', error };
            setStatus(error.message || 'Không thể lưu hồ sơ.', 'error');
        } finally {
            saving = false;
            render();
            if (state.status === 'ready') setStatus('Đã lưu hồ sơ.', 'success');
            else if (state.error) setStatus(state.error.message || 'Không thể lưu hồ sơ.', 'error');
        }
    };

    profileButton.addEventListener('click', open);
    closeButton.addEventListener('click', close);
    $('profileCancelBtn').addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    documentRef.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.hidden) close();
    });
    form.addEventListener('submit', save);
    render();

    return { setAuthState, open, close, getState: () => state };
}
