import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';

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
  const { signUp, loading } = useAuth();
  const navigation = useNavigation<any>();

  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [success, setSuccess]                 = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signUp(email.trim(), password, fullName.trim());
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? 'Đăng ký thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || loading;

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
                <Text style={styles.cardTitle}>Thông tin đăng ký</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>😊  Họ và tên</Text>
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Nguyễn Văn A"
                    placeholderTextColor="#C9B8AF"
                    autoCapitalize="words"
                    editable={!busy}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>✉️  Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@example.com"
                    placeholderTextColor="#C9B8AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!busy}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>🔑  Mật khẩu</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Tối thiểu 6 ký tự"
                    placeholderTextColor="#C9B8AF"
                    secureTextEntry
                    editable={!busy}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>🗝️  Xác nhận mật khẩu</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Nhập lại mật khẩu"
                    placeholderTextColor="#C9B8AF"
                    secureTextEntry
                    editable={!busy}
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
                  {busy
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

  inputGroup: { gap: 7 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: C.textLight },
  input: {
    backgroundColor: C.bg, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: C.text,
    borderWidth: 2, borderColor: '#FFD8C5',
  },

  errorBox: { backgroundColor: '#FFEBEE', borderRadius: 14, padding: 12 },
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
