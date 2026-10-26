import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://mbgiwrocfacxianindfp.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_by1AFTB0JOce8OqBlVEOEw__9fYSa7z'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * Đăng ký tài khoản mới với email và mật khẩu
 */
export async function signUpWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password
        })
        return { data, error }
    } catch (err) {
        return { data: null, error: err }
    }
}

/**
 * Đăng nhập với email và mật khẩu
 */
export async function signInWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        })
        return { data, error }
    } catch (err) {
        return { data: null, error: err }
    }
}

/**
 * Đăng xuất
 */
export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut()
        return { error }
    } catch (err) {
        return { error: err }
    }
}

/**
 * Lấy session hiện tại
 */
export async function getSession() {
    try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        return data.session
    } catch (err) {
        console.error('Lỗi lấy session:', err)
        return null
    }
}

/**
 * Lấy thông tin user hiện tại
 */
export async function getUser() {
    try {
        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        return data.user
    } catch (err) {
        console.error('Lỗi lấy user:', err)
        return null
    }
}

/**
 * Lắng nghe thay đổi trạng thái auth
 */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session)
    })
}