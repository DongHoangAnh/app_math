import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Modal,
} from 'react-native';
import { C, R, F, hardShadow } from '../theme';
import { Tactile, TactileButton } from '../components/ui';
import { useAuth, SessionLockedError } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { ASSETS } from '../assets';

export default function LoginScreen() {
  const { signInWithEmail, signInWithGoogle, loading, evictedElsewhere, clearEviction } = useAuth();
  const navigation = useNavigation<any>();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [lockMsg, setLockMsg]       = useState<string | null>(null);

  const busy = submitting || googleLoading || loading;

  // Heartbeat evicted this device because the account was opened elsewhere.
  useEffect(() => {
    if (evictedElsewhere) setLockMsg('Tài khoản đã đăng nhập ở nơi khác!');
  }, [evictedElsewhere]);

  const dismissLock = () => {
    setLockMsg(null);
    clearEviction();
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
      if (e instanceof SessionLockedError) setLockMsg(e.message);
      else setError(translateAuthError(e?.message));
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
      if (e instanceof SessionLockedError) setLockMsg(e.message);
      else if (!e?.message?.toLowerCase().includes('cancel')) {
        setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* faint mascot glyph */}
      <Text style={styles.mascotGlyph}>÷</Text>

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
            <View style={[styles.mascot, hardShadow(C.orangeDark, 8, 0.25)]}>
              <Text style={styles.mascotEmoji}>{ASSETS.login.mascot}</Text>
            </View>
            <Text style={styles.appName}>MATHUP</Text>
            <Text style={styles.tagline}>Thách đấu toán học 1v1 🔥</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  placeholder="example@email.com"
                  placeholderTextColor="#C9B8AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, { paddingRight: 48 }]}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(null); }}
                  placeholder="••••••••"
                  placeholderTextColor="#C9B8AF"
                  secureTextEntry={!showPwd}
                  editable={!busy}
                  returnKeyType="done"
                  onSubmitEditing={handleEmailLogin}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(!showPwd)}>
                  <Text style={styles.eyeIcon}>{showPwd ? ASSETS.login.eyeHide : ASSETS.login.eyeShow}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              activeOpacity={0.7}
              style={{ alignSelf: 'flex-end' }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.forgotLink}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{ASSETS.login.warn}  {error}</Text>
              </View>
            )}

            <TactileButton
              title="Đăng nhập"
              iconRight="→"
              onPress={handleEmailLogin}
              loading={submitting}
              disabled={busy}
              style={{ marginTop: 4 }}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>HOẶC</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <Tactile
            slabColor="#D4D7DA"
            depth={4}
            radius={R.pill}
            onPress={handleGoogleLogin}
            disabled={busy}
            style={styles.googleFace}
            accessibilityLabel="Tiếp tục với Google"
          >
            <View style={styles.googleIconWrap}>
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={styles.googleText}>Tiếp tục với Google</Text>
          </Tactile>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Đăng ký ngay 🎉</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Single-device block — confirm to dismiss */}
      <Modal
        visible={!!lockMsg}
        transparent
        animationType="fade"
        onRequestClose={dismissLock}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, hardShadow(C.orangeDark, 10, 0.25)]}>
            <Text style={styles.modalEmoji}>🔒</Text>
            <Text style={styles.modalTitle}>Tài khoản đang được dùng nơi khác</Text>
            <Text style={styles.modalBody}>{lockMsg}</Text>
            <TactileButton
              title="Đã hiểu"
              onPress={dismissLock}
              style={{ marginTop: 8, alignSelf: 'stretch' }}
            />
          </View>
        </View>
      </Modal>
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
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 32 },

  mascotGlyph: {
    position: 'absolute', right: -34, bottom: 30, fontSize: 210,
    fontFamily: F.displayBold, color: C.orangeDark, opacity: 0.07,
  },

  // Hero
  hero: { alignItems: 'center', marginTop: 12, marginBottom: 28, gap: 8 },
  mascot: {
    width: 96, height: 96, borderRadius: R.pill,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  mascotEmoji: { fontSize: 44 },
  appName: { fontFamily: F.display, fontSize: 40, letterSpacing: -0.8, color: C.orangeDark, marginTop: 8 },
  tagline: { fontFamily: F.display, fontSize: 20, color: C.inkBrown },

  // Form
  form: { gap: 16 },
  inputGroup: { gap: 8 },
  inputLabel: { fontFamily: F.display, fontSize: 14, color: C.inkBrown, marginLeft: 4 },
  inputWrap:  { position: 'relative', justifyContent: 'center' },
  input: {
    height: 56, backgroundColor: C.surfaceSunken, borderRadius: R.pill,
    paddingHorizontal: 20, fontFamily: F.body, fontSize: 16, color: C.ink,
    borderWidth: 2, borderColor: C.peachBorder,
  },
  eyeBtn:  { position: 'absolute', right: 16, padding: 4 },
  eyeIcon: { fontSize: 18 },
  forgotLink: { fontFamily: F.display, fontSize: 14, color: C.orangeDark, marginRight: 4 },

  errorBox:  { backgroundColor: C.errorSoft, borderRadius: R.md, padding: 12 },
  errorText: { fontFamily: F.bodyMedium, fontSize: 13, color: C.error, textAlign: 'center' },

  // Divider
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.peachBorder },
  dividerText: { fontFamily: F.display, fontSize: 14, color: C.inkBrown },

  // Google
  googleFace: {
    height: 56, backgroundColor: C.bg, borderWidth: 2, borderColor: C.inkSlateDeep,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  googleIconWrap: {
    width: 26, height: 26, borderRadius: R.pill, backgroundColor: '#4285F4',
    justifyContent: 'center', alignItems: 'center',
  },
  googleG:    { fontFamily: F.displayBold, fontSize: 14, color: '#fff' },
  googleText: { fontFamily: F.display, fontSize: 14, color: C.ink },

  // Footer
  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 'auto', paddingTop: 28,
  },
  footerText: { fontFamily: F.body, fontSize: 14, color: C.inkBrown },
  footerLink: { fontFamily: F.display, fontSize: 14, color: C.orangeDark },

  // Single-device block modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 28,
  },
  modalCard: {
    width: '100%', maxWidth: 360, backgroundColor: C.bg,
    borderRadius: R.lg, borderWidth: 2, borderColor: C.peachBorder,
    padding: 24, alignItems: 'center', gap: 10,
  },
  modalEmoji: { fontSize: 44 },
  modalTitle: {
    fontFamily: F.display, fontSize: 19, color: C.orangeDark, textAlign: 'center',
  },
  modalBody: {
    fontFamily: F.body, fontSize: 14, color: C.inkBrown,
    textAlign: 'center', lineHeight: 20, marginBottom: 6,
  },
});
