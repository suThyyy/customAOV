function errorResponse(message) {
    return { data: null, error: new Error(message) };
}

function requireText(value, label, maxLength = 128) {
    if (typeof value !== 'string' || value.trim() === '' || value.trim().length > maxLength) {
        throw new Error(`${label} is required`);
    }
    return value.trim();
}

function isAnonymousUser(user) {
    return Boolean(user?.is_anonymous || user?.app_metadata?.is_anonymous === true);
}

export function createRoomApi({ client, getCurrentUser } = {}) {
    const currentUser = async () => {
        try {
            const user = await getCurrentUser();
            return user?.id ? user : null;
        } catch {
            return null;
        }
    };
    const call = async (name, args = {}) => {
        const user = await currentUser();
        if (!user) return errorResponse('Authentication required');
        if (isAnonymousUser(user)) return errorResponse('Permanent account required');
        return client.rpc(name, args);
    };
    const invoke = (name, buildArgs = () => ({})) => {
        try { return call(name, buildArgs()); }
        catch (error) { return Promise.resolve(errorResponse(error.message)); }
    };
    const readRoom = async roomId => {
        try { requireText(roomId, 'Room id'); } catch (error) { return errorResponse(error.message); }
        if (!await currentUser()) return errorResponse('Authentication required');
        const [room, members, queue, currentPlayers] = await Promise.all([
            client.from('rooms').select('*').eq('id', roomId).maybeSingle(),
            client.from('room_members').select('*').eq('room_id', roomId).order('joined_at', { ascending: true }),
            client.from('room_queue_entries').select('*').eq('room_id', roomId).order('queue_seq', { ascending: true }),
            client.from('room_current_players').select('*').eq('room_id', roomId).order('slot', { ascending: true })
        ]);
        const error = room.error || members.error || queue.error || currentPlayers.error;
        return error ? { data: null, error } : {
            data: { room: room.data, members: members.data, queue: queue.data, currentPlayers: currentPlayers.data },
            error: null
        };
    };
    const readQueue = async roomId => {
        try { requireText(roomId, 'Room id'); } catch (error) { return errorResponse(error.message); }
        if (!await currentUser()) return errorResponse('Authentication required');
        return client.from('room_queue_entries').select('*').eq('room_id', roomId).order('queue_seq', { ascending: true });
    };
    const createRoom = () => invoke('create_open_room');
    const closeRoom = roomId => invoke('close_open_room', () => ({ p_room_id: requireText(roomId, 'Room id') }));
    const joinRoom = (inviteCode, displayName) => invoke('join_open_room', () => ({
        p_invite_code: requireText(inviteCode, 'Invite code'), p_display_name: requireText(displayName, 'Display name', 40)
    }));
    const leaveRoom = roomId => invoke('leave_open_room', () => ({ p_room_id: requireText(roomId, 'Room id') }));
    const hostAddPlayer = (roomId, displayName) => invoke('host_add_player_to_room', () => ({
        p_room_id: requireText(roomId, 'Room id'), p_display_name: requireText(displayName, 'Display name', 40)
    }));
    const hostKickMember = (roomId, memberId) => invoke('host_kick_room_member', () => ({
        p_room_id: requireText(roomId, 'Room id'), p_member_id: requireText(memberId, 'Member id')
    }));
    const hostRequeuePlayer = (roomId, memberId) => invoke('host_requeue_room_member', () => ({
        p_room_id: requireText(roomId, 'Room id'), p_member_id: requireText(memberId, 'Member id')
    }));
    const continueQueue = roomId => invoke('continue_open_room_queue', () => ({ p_room_id: requireText(roomId, 'Room id') }));
    const prepareNextRound = roomId => invoke('prepare_next_open_room_round', () => ({ p_room_id: requireText(roomId, 'Room id') }));
    const startRound = roomId => invoke('start_open_room_round', () => ({ p_room_id: requireText(roomId, 'Room id') }));
    const endRound = roomId => invoke('end_open_room_round', () => ({ p_room_id: requireText(roomId, 'Room id') }));
    const readSnapshot = roomId => invoke('read_open_room_state', () => ({ p_room_id: requireText(roomId, 'Room id') }));
    const saveLineup = (roomId, version, players) => invoke('save_open_room_lineup', () => ({
        p_room_id: requireText(roomId, 'Room id'), p_version: version,
        p_players: players.map(({member_id, team, skill_mode, skill_value, skill_score}) =>
            ({member_id, team, skill_mode, skill_value, skill_score}))
    }));
    const replacePlayer = (roomId, version, memberId) => invoke('replace_open_room_player', () => ({
        p_room_id: requireText(roomId, 'Room id'), p_version: version, p_member_id: requireText(memberId, 'Member id')
    }));
    return { readSnapshot, saveLineup, replacePlayer, createRoom, readRoom, closeRoom, joinRoom, leaveRoom, hostAddPlayer, hostKickMember, hostRequeuePlayer,
        continueQueue, prepareNextRound, startRound, endRound, readQueue };
}
