/**
 * Coordinates Supabase auth state with the current user's profiles.
 * This module has no DOM dependency so session/profile race cases can be
 * tested without changing the Phase 1 UI or Firebase integration.
 */
export function createAuthIntegration({
    getUser,
    onAuthStateChange,
    profileApi,
    onStateChange = () => {},
    onError = () => {}
}) {
    let requestId = 0;
    let unsubscribe = null;
    let initialized = false;
    let hasPendingAuthEvent = false;
    let pendingAuthUser = null;
    let activeProfileLoad = null;
    let state = { status: 'idle', user: null, profiles: null, error: null };

    const publish = nextState => {
        state = nextState;
        onStateChange(state);
        return state;
    };

    const loadProfiles = async user => {
        const currentRequest = ++requestId;
        const nextUser = user?.id ? user : null;

        publish({
            status: nextUser ? 'loading' : 'signed_out',
            user: nextUser,
            profiles: null,
            error: null
        });

        if (!nextUser) return state;

        let result;
        try {
            result = await profileApi.readMyProfiles();
        } catch (error) {
            result = { data: null, error };
        }

        // Ignore responses belonging to a previous user or a signed-out session.
        if (currentRequest !== requestId) return state;

        if (result?.error) {
            onError(result.error);
            return publish({ status: 'error', user: nextUser, profiles: null, error: result.error });
        }

        return publish({ status: 'ready', user: nextUser, profiles: result?.data || null, error: null });
    };

    const sync = (user, { force = false } = {}) => {
        const nextUser = user?.id ? user : null;
        if (!nextUser) {
            activeProfileLoad = null;
            return loadProfiles(null);
        }

        const sameUser = state.user?.id === nextUser.id;
        if (!force && sameUser && (state.status === 'loading' || state.status === 'ready')) {
            return activeProfileLoad || Promise.resolve(state);
        }

        const load = loadProfiles(nextUser);
        activeProfileLoad = load;
        return load.finally(() => {
            if (activeProfileLoad === load) activeProfileLoad = null;
        });
    };

    const refresh = user => sync(user, { force: true });

    const initialize = async () => {
        unsubscribe = onAuthStateChange((_event, session) => {
            const user = session?.user || null;
            if (!initialized) {
                hasPendingAuthEvent = true;
                pendingAuthUser = user;
                return;
            }
            void sync(user);
        });

        let user = null;
        try {
            user = await getUser();
        } catch (error) {
            onError(error);
        }
        if (hasPendingAuthEvent) user = pendingAuthUser;
        initialized = true;
        return sync(user);
    };

    const destroy = () => {
        requestId += 1;
        activeProfileLoad = null;
        if (typeof unsubscribe === 'function') unsubscribe();
        else if (unsubscribe?.unsubscribe) unsubscribe.unsubscribe();
        else if (unsubscribe?.data?.subscription?.unsubscribe) unsubscribe.data.subscription.unsubscribe();
        unsubscribe = null;
        return publish({ status: 'signed_out', user: null, profiles: null, error: null });
    };

    return { initialize, sync, refresh, destroy, getState: () => state };
}
