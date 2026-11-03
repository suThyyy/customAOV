import { supabase, getUser } from './supabaseAuth.js';

const ACCOUNT_PROFILE_FIELDS = ['id', 'display_name', 'avatar_url', 'bio', 'role', 'created_at'];
const ACCOUNT_PROFILE_WRITABLE_FIELDS = ['display_name', 'avatar_url', 'bio'];
const GAME_PROFILE_FIELDS = [
    'id', 'user_id', 'ingame_name', 'game_uid', 'current_tier', 'current_rank',
    'main_roles', 'system_mmr', 'uid_changed_at', 'uid_change_available_at', 'created_at'
];
const LEGACY_GAME_PROFILE_FIELDS = [
    'id', 'user_id', 'ingame_name', 'game_uid', 'current_tier', 'current_rank',
    'main_roles', 'system_mmr', 'created_at'
];

function errorResponse(message) {
    return { data: null, error: new Error(message) };
}

function pickWritableFields(input, allowedFields, resourceName) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new TypeError(`${resourceName} update must be an object`);
    }

    if (Object.prototype.hasOwnProperty.call(input, 'role')) {
        throw new Error('Profile role can only be changed by the trusted service');
    }

    const unknownFields = Object.keys(input).filter(field => !allowedFields.includes(field));
    if (unknownFields.length > 0) {
        throw new Error(`Unsupported ${resourceName} field: ${unknownFields[0]}`);
    }

    return Object.fromEntries(allowedFields
        .filter(field => Object.prototype.hasOwnProperty.call(input, field))
        .map(field => [field, input[field]]));
}

async function requireCurrentUser(getCurrentUser) {
    try {
        const user = await getCurrentUser();
        return user?.id ? user : null;
    } catch {
        return null;
    }
}

/**
 * Profile service for Phase 2.1.
 *
 * Account/Game Profile creation is owned by the on_auth_user_created trigger.
 * This client layer intentionally exposes read/update operations only; role
 * administration is never sent through the browser client.
 */
export function createProfileApi({ client = supabase, getCurrentUser = getUser } = {}) {
    const readAccountProfileForUser = user => client
        .from('profiles')
        .select(ACCOUNT_PROFILE_FIELDS.join(', '))
        .eq('id', user.id)
        .single();

    const readGameProfileForUser = async user => {
        const result = await client
            .from('game_profiles')
            .select(GAME_PROFILE_FIELDS.join(', '))
            .eq('user_id', user.id)
            .single();
        if (result.error?.code !== '42703') return result;

        // Keep existing environments readable until the HUY-8 migration is
        // reviewed and applied. UID changes never use this fallback.
        return client
            .from('game_profiles')
            .select(LEGACY_GAME_PROFILE_FIELDS.join(', '))
            .eq('user_id', user.id)
            .single();
    };

    const readAccountProfile = async () => {
        const user = await requireCurrentUser(getCurrentUser);
        if (!user) return errorResponse('Authentication required');
        return readAccountProfileForUser(user);
    };

    const readMyGameProfile = async () => {
        const user = await requireCurrentUser(getCurrentUser);
        if (!user) return errorResponse('Authentication required');
        return readGameProfileForUser(user);
    };

    const readPublicGameProfile = async userId => {
        if (typeof userId !== 'string' || userId.trim() === '') {
            return errorResponse('A user id is required to read a public game profile');
        }

        return client
            .from('game_profiles')
            .select(GAME_PROFILE_FIELDS.join(', '))
            .eq('user_id', userId)
            .single();
    };

    const readMyProfiles = async () => {
        const user = await requireCurrentUser(getCurrentUser);
        if (!user) return errorResponse('Authentication required');

        const [account, game] = await Promise.all([
            readAccountProfileForUser(user),
            readGameProfileForUser(user)
        ]);
        return {
            data: account.error || game.error ? null : { account: account.data, game: game.data },
            error: account.error || game.error || null
        };
    };

    const updateAccountProfile = async changes => {
        const user = await requireCurrentUser(getCurrentUser);
        if (!user) return errorResponse('Authentication required');

        let patch;
        try {
            patch = pickWritableFields(changes, ACCOUNT_PROFILE_WRITABLE_FIELDS, 'account profile');
        } catch (error) {
            return errorResponse(error.message);
        }

        return client
            .from('profiles')
            .update(patch)
            .eq('id', user.id)
            .select(ACCOUNT_PROFILE_FIELDS.join(', '))
            .single();
    };

    const requestGameUidChange = async gameUid => {
        const user = await requireCurrentUser(getCurrentUser);
        if (!user) return errorResponse('Authentication required');
        if (typeof gameUid !== 'string' || gameUid.trim() === '') {
            return errorResponse('Game UID is required');
        }

        return client.rpc('request_game_uid_change', { new_game_uid: gameUid.trim() });
    };

    return {
        readAccountProfile,
        readMyGameProfile,
        readPublicGameProfile,
        readMyProfiles,
        updateAccountProfile,
        requestGameUidChange
    };
}

export const profileApi = createProfileApi();
