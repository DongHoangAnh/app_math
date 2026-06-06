import { useState, useEffect, useContext, createContext } from 'react';
import { Platform, AppState } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase, createSessionFromUrl } from '../services/supabase';
import { TERMS_VERSION } from '../config';
import { getDeviceId } from '../utils/deviceId';
import { gameApi } from '../services/api';
import { HEARTBEAT_INTERVAL_MS } from '../../../shared/constants';
import type { User, Session } from '@supabase/supabase-js';

// Đóng WebBrowser session còn sót khi quay lại app (chỉ có tác dụng trên native iOS)
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

/** Thrown when the single-device lock is held by another device. Lets the UI
 *  tell a "logged in elsewhere" block apart from a wrong-password error. */
export class SessionLockedError extends Error {
  constructor(message = 'Tài khoản đang đăng nhập ở thiết bị khác. Hãy đăng xuất ở thiết bị kia rồi thử lại.') {
    super(message);
    this.name = 'SessionLockedError';
  }
}

/**
 * Claims the single-device lock for the current session. Resolves silently
 * when granted. When the lock is held by another device, signs out and throws
 * `SessionLockedError`. Network/unknown errors are swallowed (fail-open) so a
 * flaky connection never locks a legitimate user out.
 */
export async function enforceSingleDevice(): Promise<void> {
  let granted: boolean;
  try {
    const deviceId = await getDeviceId();
    const res = await gameApi.acquireLock(deviceId);
    granted = res.granted;
  } catch {
    return; // fail-open
  }
  if (!granted) {
    await supabase.auth.signOut();
    throw new SessionLockedError();
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  passwordRecovery: boolean;
  termsAccepted: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  confirmPasswordReset: (newPassword: string) => Promise<void>;
  acceptTerms: () => Promise<void>;
  updateProfile: (displayName: string, avatarUrl?: string | null) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                   = useState<User | null>(null);
  const [session, setSession]             = useState<Session | null>(null);
  const [loading, setLoading]             = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session) { enforceSingleDevice().catch(() => {}); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event !== 'TOKEN_REFRESHED') setPasswordRecovery(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // ─── Google OAuth ───────────────────────────────────────────────────────────

  const signInWithGoogle = async () => {
    if (Platform.OS === 'web') {
      // Web: dùng full-page redirect, Supabase tự xử lý callback qua detectSessionInUrl
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) throw error;
      return; // Supabase redirect sẽ reload trang và tự login
    }

    // Native (iOS / Android): dùng in-app WebBrowser + PKCE
    const redirectUri = makeRedirectUri({ scheme: 'mathup', path: 'auth/callback' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUri, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error('Không thể lấy URL xác thực Google');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type === 'success') {
      // Parse ?code= từ callback URL rồi đổi lấy session (PKCE)
      await createSessionFromUrl(result.url);
      await enforceSingleDevice();
    }
    // type === 'cancel' → user đóng popup, bỏ qua
  };

  // ─── Email / Password ───────────────────────────────────────────────────────

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await enforceSingleDevice();
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'student' },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      const deviceId = await getDeviceId();
      await gameApi.releaseLock(deviceId);
    } catch {
      /* best-effort; TTL will reclaim */
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
    setPasswordRecovery(false);
  };

  // ─── Password Reset ─────────────────────────────────────────────────────────

  const sendPasswordResetEmail = async (email: string) => {
    const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/auth/reset-password`
      : makeRedirectUri({ scheme: 'mathup', path: 'auth/reset-password' });
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw error;
  };

  const confirmPasswordReset = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setPasswordRecovery(false);
  };

  // ─── Terms & Privacy consent ──────────────────────────────────────────────
  // Acceptance is stored on the account (user_metadata) so it survives reinstall
  // and works for every sign-in method (email + Google OAuth). Bumping
  // TERMS_VERSION re-prompts everyone who accepted an older version.

  const acceptTerms = async () => {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
      },
    });
    if (error) throw error;
    if (data.user) setUser(data.user);
  };

  // ─── Profile ────────────────────────────────────────────────────────────────

  const refreshUser = async () => {
    const { data: { user: refreshed } } = await supabase.auth.getUser();
    if (refreshed) setUser(refreshed);
  };

  const updateProfile = async (displayName: string, avatarUrl?: string | null) => {
    if (!user) throw new Error('Chưa đăng nhập');

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: displayName },
    });
    if (authError) throw authError;

    const profileUpdate: Record<string, string> = {
      display_name: displayName,
      updated_at: new Date().toISOString(),
    };
    if (avatarUrl !== undefined) {
      profileUpdate.avatar_url = avatarUrl ?? '';
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(profileUpdate)
      .eq('id', user.id);
    if (profileError) throw profileError;

    await refreshUser();
  };

  // Has this user accepted the *current* version of the legal docs?
  const termsAccepted =
    user?.user_metadata?.terms_version === TERMS_VERSION &&
    !!user?.user_metadata?.terms_accepted_at;

  // ─── Single-device heartbeat ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const beat = async () => {
      try {
        const deviceId = await getDeviceId();
        const { owner } = await gameApi.heartbeat(deviceId);
        if (!owner) {
          // owner:false can mean eviction by another device OR simply no lock
          // row yet (fresh launch / post-TTL). Try to (re)claim; only sign out
          // if another device genuinely holds a fresh lock.
          const { granted } = await gameApi.acquireLock(deviceId);
          if (!granted && !cancelled) {
            await supabase.auth.signOut();
          }
        }
      } catch {
        return; // fail-open: never sign out on a network/unknown error
      }
    };

    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') beat();
    });
    beat(); // immediate first beat

    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{
      user, session, loading, passwordRecovery, termsAccepted,
      signInWithGoogle, signInWithEmail, signUp, signOut,
      sendPasswordResetEmail, confirmPasswordReset, acceptTerms,
      updateProfile, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
