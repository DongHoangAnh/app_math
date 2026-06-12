import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { C, R, F, hardShadow } from '../theme';
import { Tactile, TactileButton } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { validateDisplayName } from '../utils/validation';
import { ASSETS } from '../assets';
import AssetIcon from '../components/AssetIcon';

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
            <View style={[styles.mascot, hardShadow(C.orangeDark, 6, 0.25)]}>
              <AssetIcon source={ASSETS.register.mascot} size={38} style={styles.mascotEmoji} />
            </View>
            <Text style={styles.appName}>Tạo Tài Khoản</Text>
            <Text style={styles.tagline}>Tham gia cộng đồng MathUp 🚀</Text>
          </View>

          {success ? (
            <View style={styles.successBox}>
              <AssetIcon source={ASSETS.register.success} size={64} style={styles.successEmoji} />
              <Text style={styles.successTitle}>Đăng ký thành công!</Text>
              <Text style={styles.successText}>
                Kiểm tra email để xác nhận tài khoản (nếu có).
              </Text>
              <View style={{ width: '100%', marginTop: 8 }}>
                <TactileButton title="Đăng nhập ngay" iconRight="→" onPress={() => navigation.navigate('Login')} />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.form}>
                {/* Full name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Họ và tên</Text>
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
                  {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
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
                  <Text style={styles.inputLabel}>Mật khẩu</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={[styles.input, { paddingRight: 48 }]}
                      value={password}
                      onChangeText={(t) => { setPassword(t); setError(null); }}
                      placeholder="Tối thiểu 8 ký tự"
                      placeholderTextColor="#C9B8AF"
                      secureTextEntry={!showPwd}
                      editable={!busy}
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(!showPwd)}>
                      <AssetIcon source={showPwd ? ASSETS.register.eyeHide : ASSETS.register.eyeShow} size={18} style={styles.eyeIcon} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <AssetIcon source={ASSETS.register.warn} size={16} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  </View>
                )}

                <TactileButton
                  title="Đăng ký"
                  iconRight={ASSETS.register.success}
                  onPress={handleRegister}
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
                onPress={handleGoogleRegister}
                disabled={busy}
                style={styles.googleFace}
                accessibilityLabel="Đăng ký với Google"
              >
                <View style={styles.googleIconWrap}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.googleText}>Đăng ký với Google</Text>
              </Tactile>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Đã có tài khoản? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.footerLink}>Đăng nhập →</Text>
                </TouchableOpacity>
              </View>
            </>
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
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 36, paddingBottom: 32 },

  hero: { alignItems: 'center', paddingBottom: 24, gap: 8 },
  mascot: {
    width: 80, height: 80, borderRadius: R.pill, backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  mascotEmoji: { fontSize: 38 },
  appName: { fontFamily: F.display, fontSize: 28, color: C.orangeDark },
  tagline: { fontFamily: F.body, fontSize: 14, color: C.inkBrown },

  form: { gap: 14 },
  inputGroup: { gap: 8 },
  inputLabel: { fontFamily: F.display, fontSize: 14, color: C.inkBrown, marginLeft: 4 },
  inputWrap:  { position: 'relative', justifyContent: 'center' },
  input: {
    height: 54, backgroundColor: C.surfaceSunken, borderRadius: R.pill,
    paddingHorizontal: 20, fontFamily: F.body, fontSize: 16, color: C.ink,
    borderWidth: 2, borderColor: C.peachBorder,
  },
  inputError: { borderColor: C.error },
  inputOk:    { borderColor: C.success },
  eyeBtn:  { position: 'absolute', right: 16, padding: 4 },
  eyeIcon: { fontSize: 18 },
  fieldError: { fontFamily: F.bodyMedium, fontSize: 12, color: C.error, marginLeft: 4 },

  errorBox:  { backgroundColor: C.errorSoft, borderRadius: R.md, padding: 12 },
  errorText: { fontFamily: F.bodyMedium, fontSize: 13, color: C.error, textAlign: 'center' },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.peachBorder },
  dividerText: { fontFamily: F.display, fontSize: 14, color: C.inkBrown },

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

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontFamily: F.body, fontSize: 14, color: C.inkBrown },
  footerLink: { fontFamily: F.display, fontSize: 14, color: C.orangeDark },

  successBox:   { alignItems: 'center', gap: 14, paddingVertical: 20 },
  successEmoji: { fontSize: 64 },
  successTitle: { fontFamily: F.display, fontSize: 24, color: C.successDeep },
  successText:  { fontFamily: F.body, fontSize: 14, color: C.inkBrown, textAlign: 'center', lineHeight: 20 },
});
