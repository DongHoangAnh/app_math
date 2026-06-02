import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { validateDisplayName } from '../utils/validation';

const C = {
  primary:   '#FF6B35',
  secondary: '#FFD23F',
  bg:        '#FFF8F2',
  card:      '#FFFFFF',
  text:      '#2C1810',
  textLight: '#8B7B74',
  error:     '#FF4444',
  success:   '#4CAF50',
};

export default function RegisterScreen() {
  const { signUp, signInWithGoogle, loading } = useAuth();
  const navigation = useNavigation<any>();

  const [fullName, setFullName]               = useState('');
  const [nameError, setNameError]             = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [showPwd, setShowPwd]                 = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [googleLoading, setGoogleLoading]     = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [success, setSuccess]                 = useState(false);

  const handleNameChange = (text: string) => {
    setFullName(text);
    if (text.trim().length === 0) { setNameError(''); return; }
    const r = validateDisplayName(text.trim());
    setNameError(r.error ?? '');
  };

  const handleRegister = async () => {
    const trimName = fullName.trim();
    if (!trimName || !email.trim() || !password.trim()) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    const nameValidation = validateDisplayName(trimName);
    if (!nameValidation.valid) {
      setError(nameValidation.error ?? 'Tên không hợp lệ');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signUp(email.trim(), password, trimName);
      setSuccess(true);
    } catch (e: any) {
      setError(translateRegisterError(e?.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
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

  const busy = submitting || googleLoading || loading;

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
            <View style={styles.mascotWrap}>
              <Text style={styles.mascotEmoji}>🌟</Text>
            </View>
            <Text style={styles.appName}>Tạo Tài Khoản</Text>
            <Text style={styles.tagline}>Tham gia cộng đồng MathUp 🚀</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {success ? (
              <View style={styles.successBox}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={styles.successTitle}>Đăng ký thành công!</Text>
                <Text style={styles.successText}>
                  Kiểm tra email để xác nhận tài khoản (nếu có).
                </Text>
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.loginBtnText}>Đăng Nhập Ngay →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.cardTitle}>Tạo tài khoản</Text>

                {/* Google button */}
                <TouchableOpacity
                  style={[styles.googleBtn, busy && { opacity: 0.6 }]}
                  onPress={handleGoogleRegister}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#3C4043" size="small" />
                  ) : (
                    <>
                      <View style={styles.googleIconWrap}>
                        <Text style={styles.googleG}>G</Text>
                      </View>
                      <Text style={styles.googleText}>Đăng ký với Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>hoặc điền form</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Full name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>😊  Họ và tên</Text>
                  <TextInput
                    style={[styles.input, nameError ? styles.inputError : null]}
                    value={fullName}
                    onChangeText={handleNameChange}
                    placeholder="Nguyễn Văn A"
                    placeholderTextColor="#C9B8AF"
                    autoCapitalize="words"
                    editable={!busy}
                    maxLength={30}
                  />
                  {nameError ? (
                    <Text style={styles.fieldError}>{nameError}</Text>
                  ) : null}
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
                  <Text style={styles.inputLabel}>🔑  Mật khẩu</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={(t) => { setPassword(t); setError(null); }}
                      placeholder="Tối thiểu 8 ký tự"
                      placeholderTextColor="#C9B8AF"
                      secureTextEntry={!showPwd}
                      editable={!busy}
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(!showPwd)}>
                      <Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>🗝️  Xác nhận mật khẩu</Text>
                  <TextInput
                    style={[
                      styles.input,
                      confirmPassword.length > 0 && (password !== confirmPassword ? styles.inputError : styles.inputOk),
                    ]}
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                    placeholder="Nhập lại mật khẩu"
                    placeholderTextColor="#C9B8AF"
                    secureTextEntry={!showPwd}
                    editable={!busy}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                </View>

                {error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠️  {error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.loginBtn, busy && { opacity: 0.6 }]}
                  onPress={handleRegister}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.loginBtnText}>Đăng Ký 🎉</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>

          {!success && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Đã có tài khoản?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}> Đăng nhập →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function translateRegisterError(msg?: string): string {
  if (!msg) return 'Đăng ký thất bại';
  const m = msg.toLowerCase();
  if (m.includes('already registered') || m.includes('user already'))
    return 'Email này đã được đăng ký. Hãy thử đăng nhập.';
  if (m.includes('invalid email'))
    return 'Địa chỉ email không hợp lệ';
  if (m.includes('weak password') || m.includes('password should'))
    return 'Mật khẩu quá yếu. Hãy dùng ít nhất 8 ký tự.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Quá nhiều lần thử. Vui lòng chờ vài phút.';
  return msg;
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

  hero: { alignItems: 'center', paddingTop: 36, paddingBottom: 28 },
  mascotWrap: {
    width: 80, height: 80, borderRadius: 26,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  mascotEmoji: { fontSize: 40 },
  appName:     { fontSize: 28, fontWeight: '900', color: C.text },
  tagline:     { fontSize: 13, color: C.textLight, marginTop: 6, fontWeight: '600' },

  card: {
    backgroundColor: C.card, borderRadius: 28, padding: 24,
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
    gap: 14,
  },
  cardTitle: { fontSize: 20, fontWeight: '900', color: C.text },

  // Google button
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 18,
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
  dividerLine: { flex: 1, height: 1, backgroundColor: '#FFE5D9' },
  dividerText: { fontSize: 12, color: C.textLight, fontWeight: '600' },

  inputGroup:  { gap: 7 },
  inputLabel:  { fontSize: 13, fontWeight: '800', color: C.textLight },
  inputWrap:   { position: 'relative', justifyContent: 'center' },
  input: {
    backgroundColor: C.bg, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: C.text,
    borderWidth: 2, borderColor: '#FFD8C5',
  },
  inputError: { borderColor: C.error },
  inputOk:    { borderColor: C.success },
  eyeBtn:  { position: 'absolute', right: 14, padding: 4 },
  eyeIcon: { fontSize: 18 },
  fieldError: { fontSize: 12, color: C.error, fontWeight: '600', marginTop: 2 },

  errorBox:  { backgroundColor: '#FFEBEE', borderRadius: 14, padding: 12 },
  errorText: { fontSize: 13, color: C.error, textAlign: 'center', fontWeight: '600' },

  loginBtn: {
    backgroundColor: C.primary, borderRadius: 18, paddingVertical: 17,
    alignItems: 'center', marginTop: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  loginBtnText: { fontSize: 17, fontWeight: '900', color: '#fff' },

  footer: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 28, marginBottom: 8,
  },
  footerText: { fontSize: 14, color: C.textLight },
  footerLink: { fontSize: 14, fontWeight: '800', color: C.primary },

  successBox:   { alignItems: 'center', gap: 16, paddingVertical: 10 },
  successEmoji: { fontSize: 64 },
  successTitle: { fontSize: 22, fontWeight: '900', color: C.success },
  successText:  { fontSize: 14, color: C.textLight, textAlign: 'center', lineHeight: 20 },
});
