/**
 * Supabase Client Configuration - React Native
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { SUPABASE_URL, SUPABASE_KEY } from '../config';

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY'
  );
}

const isWeb = Platform.OS === 'web';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Web: dùng localStorage (mặc định), Native: dùng AsyncStorage
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web: bật để Supabase tự xử lý token từ URL sau OAuth redirect
    // Native: tắt vì dùng deep link + exchangeCodeForSession thủ công
    detectSessionInUrl: isWeb,
    // PKCE bắt buộc cho OAuth trên native: signInWithOAuth sinh code_challenge
    // + lưu code verifier vào storage để exchangeCodeForSession dùng.
    // (Mặc định là 'implicit' — callback chỉ trả token trong #fragment,
    // exchangeCodeForSession sẽ luôn fail vì không có code/verifier.)
    flowType: 'pkce',
  },
});

/**
 * Parse callback URL (deep link `mathup://auth/...`) sau OAuth / email link,
 * lấy `?code=` và đổi thành session. Chỉ cần trên native — web đã có
 * detectSessionInUrl. Trả về session, hoặc null nếu URL không chứa code.
 */
export async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  if (params.error) {
    throw new Error(params.error_description ?? params.error);
  }

  const { code } = params;
  if (!code) return null;

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Code chỉ dùng được 1 lần — nếu handler khác (deep link listener) đã
    // exchange xong và session tồn tại thì không coi là lỗi.
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;
    throw error;
  }
  return data.session;
}

// Helper to check auth status
export async function isAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Helper to get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
