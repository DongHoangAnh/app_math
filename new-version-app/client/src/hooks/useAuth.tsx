import { useState, useEffect, useContext, createContext } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../services/supabase';
import type { User, Session } from '@supabase/supabase-js';

// Đóng WebBrowser session còn sót khi quay lại app (chỉ có tác dụng trên native iOS)
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  passwordRecovery: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  confirmPasswordReset: (newPassword: string) => Promise<void>;
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
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (sessionError) throw sessionError;
    }
    // type === 'cancel' → user đóng popup, bỏ qua
  };

  // ─── Email / Password ───────────────────────────────────────────────────────

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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

  return (
    <AuthContext.Provider value={{
      user, session, loading, passwordRecovery,
      signInWithGoogle, signInWithEmail, signUp, signOut,
      sendPasswordResetEmail, confirmPasswordReset,
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
