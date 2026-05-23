import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';

const C = {
  primary: '#3B82F6', deep: '#1E40AF', yellow: '#FACC15',
  bg: '#F8FBFF', white: '#FFFFFF', text: '#1E293B', textLight: '#64748B',
  error: '#EF4444',
  success: '#10B981',
};

export default function RegisterScreen() {
  const { signUp, loading } = useAuth();
  const navigation = useNavigation<any>();

  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

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
      // Supabase typically sends a confirmation email if configured,
      // or logs the user in if auto-confirm is enabled.
      // If auto-confirm is on, the useAuth listener will trigger and App.tsx will navigate to MainApp.
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🛡️</Text>
            <Text style={styles.appName}>Tạo Tài Khoản</Text>
            <Text style={styles.tagline}>Tham gia cộng đồng MathUp</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {success ? (
              <View style={styles.successContent}>
                <Text style={styles.successIcon}>🎉</Text>
                <Text style={styles.successTitle}>Đăng ký thành công!</Text>
                <Text style={styles.successText}>
                  Vui lòng kiểm tra email để xác nhận tài khoản (nếu có yêu cầu).
                </Text>
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.loginBtnText}>Quay lại Đăng nhập</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Họ và tên</Text>
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Nguyễn Văn A"
                    placeholderTextColor="#CBD5E1"
                    autoCapitalize="words"
                    editable={!busy}
                  />
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@example.com"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!busy}
                  />
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mật khẩu</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••"
                    placeholderTextColor="#CBD5E1"
                    secureTextEntry
                    editable={!busy}
                  />
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••"
                    placeholderTextColor="#CBD5E1"
                    secureTextEntry
                    editable={!busy}
                  />
                </View>

                {/* Error */}
                {error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.loginBtn, busy && { opacity: 0.6 }]}
                  onPress={handleRegister}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  {busy
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.loginBtnText}>Đăng Ký</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer */}
          {!success && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Đã có tài khoản?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}> Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 24, flexGrow: 1 },

  header: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
  logo: { fontSize: 64 },
  appName: { fontSize: 32, fontWeight: '900', color: C.deep, marginTop: 8 },
  tagline: { fontSize: 14, color: C.textLight, marginTop: 6 },

  card: {
    backgroundColor: C.white, borderRadius: 24, padding: 24,
    shadowColor: 'rgba(59,130,246,0.12)',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1,
    shadowRadius: 24, elevation: 8, gap: 16,
  },

  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: C.textLight },
  input: {
    backgroundColor: '#F8FBFF', borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, color: C.text,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },

  errorBox: {
    backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12,
  },
  errorText: { fontSize: 13, color: C.error, textAlign: 'center' },

  loginBtn: {
    backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  loginBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },

  footer: {
    flexDirection: 'row', justifyContent: 'center', marginTop: 32, marginBottom: 24,
  },
  footerText: { fontSize: 14, color: C.textLight },
  footerLink: { fontSize: 14, fontWeight: '700', color: C.primary },

  successContent: { alignItems: 'center', gap: 16, paddingVertical: 10 },
  successIcon: { fontSize: 64 },
  successTitle: { fontSize: 22, fontWeight: '900', color: C.success },
  successText: { fontSize: 14, color: C.textLight, textAlign: 'center', lineHeight: 20 },
});
