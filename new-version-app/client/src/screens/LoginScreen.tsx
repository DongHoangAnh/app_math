import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  ActivityIndicator, SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { C, R, ANIM } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const { signInWithEmail, signInWithGoogle, loading } = useAuth();
  const navigation = useNavigation<any>();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const loginBtnScale = useRef(new Animated.Value(1)).current;
  const googleBtnScale = useRef(new Animated.Value(1)).current;

  const busy = submitting || googleLoading || loading;

  const handleButtonPressIn = (scaleAnim: Animated.Value) => {
    Animated.timing(scaleAnim, { toValue: 0.92, duration: ANIM.buttonPress, useNativeDriver: true }).start();
  };

  const handleButtonPressOut = (scaleAnim: Animated.Value) => {
    Animated.timing(scaleAnim, { toValue: 1, duration: ANIM.buttonPress, useNativeDriver: true }).start();
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (e: any) {
      setError(translateAuthError(e?.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (!e?.message?.toLowerCase().includes('cancel')) {
        setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroBg} />
            <View style={styles.heroCircle} />
            <View style={styles.mascotWrap}>
              <Text style={styles.mascotEmoji}>✏️</Text>
            </View>
            <Text style={styles.appName}>MathUp</Text>
            <Text style={styles.tagline}>Thách đấu toán học 1v1 🔥</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đăng nhập</Text>

            {/* Google button */}
            <TouchableOpacity
              style={[styles.googleBtn, busy && { opacity: 0.6 }]}
              onPress={handleGoogleLogin}
              onPressIn={() => handleButtonPressIn(googleBtnScale)}
              onPressOut={() => handleButtonPressOut(googleBtnScale)}
              disabled={busy}
              activeOpacity={1}
            >
              <Animated.View style={{ transform: [{ scale: googleBtnScale }] }}>
                {googleLoading ? (
                  <ActivityIndicator color="#3C4043" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.googleIconWrap}>
                      <Text style={styles.googleG}>G</Text>
                    </View>
                    <Text style={styles.googleText}>Tiếp tục với Google</Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc dùng email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>✉️  Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                placeholder="email@example.com"
                placeholderTextColor="#C9B8AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>🔑  Mật khẩu</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotLink}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(null); }}
                  placeholder="••••••"
                  placeholderTextColor="#C9B8AF"
                  secureTextEntry={!showPwd}
                  editable={!busy}
                  returnKeyType="done"
                  onSubmitEditing={handleEmailLogin}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(!showPwd)}>
                  <Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️  {error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.loginBtn, busy && { opacity: 0.6 }]}
              onPress={handleEmailLogin}
              onPressIn={() => handleButtonPressIn(loginBtnScale)}
              onPressOut={() => handleButtonPressOut(loginBtnScale)}
              disabled={busy}
              activeOpacity={1}
            >
              <Animated.View style={{ transform: [{ scale: loginBtnScale }] }}>
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.loginBtnText}>Đăng Nhập →</Text>}
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
              <Text style={styles.footerLink}> Đăng ký ngay 🎉</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function translateAuthError(msg?: string): string {
  if (!msg) return 'Đăng nhập thất bại';
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials'))
    return 'Email hoặc mật khẩu không đúng';
  if (m.includes('email not confirmed'))
    return 'Email chưa được xác nhận. Kiểm tra hộp thư của bạn.';
  if (m.includes('too many requests') || m.includes('rate limit'))
    return 'Quá nhiều lần thử. Vui lòng chờ vài phút.';
  if (m.includes('user not found'))
    return 'Không tìm thấy tài khoản với email này';
  return msg;
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.background },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

  // Hero
  hero: { alignItems: 'center', paddingTop: 40, paddingBottom: 36, overflow: 'hidden' },
  heroBg: {
    position: 'absolute', top: -40, width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  heroCircle: {
    position: 'absolute', top: 20, right: -30, width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  mascotWrap: {
    width: 90, height: 90, borderRadius: 30,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 12,
  },
  mascotEmoji: { fontSize: 48 },
  appName:     { fontSize: 36, fontWeight: '900', color: C.textPrimary },
  tagline:     { fontSize: 14, color: C.textSecond, marginTop: 6, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: C.surface, borderRadius: 28, padding: 24,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
    gap: 16,
  },
  cardTitle: { fontSize: 22, fontWeight: '900', color: C.textPrimary },

  // Google button
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: R.sm,
    paddingVertical: 14, paddingHorizontal: 20, gap: 10,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  googleIconWrap: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#4285F4',
    justifyContent: 'center', alignItems: 'center',
  },
  googleG:    { fontSize: 14, fontWeight: '900', color: '#fff' },
  googleText: { fontSize: 15, fontWeight: '700', color: '#3C4043' },

  // Divider
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.textSecond, fontWeight: '600' },

  // Inputs
  inputGroup: { gap: 8 },
  labelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputLabel: { fontSize: 13, fontWeight: '800', color: C.textSecond },
  forgotLink: { fontSize: 13, fontWeight: '700', color: C.primary },
  inputWrap:  { position: 'relative', justifyContent: 'center' },
  input: {
    backgroundColor: C.background, borderRadius: R.md,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: C.textPrimary,
    borderWidth: 2, borderColor: C.border,
  },
  eyeBtn:  { position: 'absolute', right: 14, padding: 4 },
  eyeIcon: { fontSize: 18 },

  errorBox:  { backgroundColor: '#FFEBEE', borderRadius: R.sm, padding: 12 },
  errorText: { fontSize: 13, color: C.error, textAlign: 'center', fontWeight: '600' },

  loginBtn: {
    backgroundColor: C.primary, borderRadius: R.lg, paddingVertical: 14, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  loginBtnText: { fontSize: 17, fontWeight: '900', color: '#fff' },

  footer: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 28, marginBottom: 8,
  },
  footerText: { fontSize: 14, color: C.textSecond },
  footerLink: { fontSize: 14, fontWeight: '800', color: C.primary },
});
