import { supabase, getUser } from './supabaseAuth.js';
import { createRoomApi } from './room-api-core.js';

export { createRoomApi };

export const roomApi = createRoomApi({
    client: supabase,
    getCurrentUser: getUser
});
