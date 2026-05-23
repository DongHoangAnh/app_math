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
};

export default function LoginScreen() {
  const { signInWithEmail, signInWithGoogle, loading } = useAuth();
  const navigation = useNavigation<any>();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

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
      setError(e?.message ?? 'Đăng nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const fillAccount = (acc: 'admin' | 'admin1') => {
    setEmail(acc === 'admin' ? 'admin@mathup.dev' : 'admin1@mathup.dev');
    setPassword('admin123');
    setError(null);
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
            <Text style={styles.logo}>⚔️</Text>
            <Text style={styles.appName}>MathUp</Text>
            <Text style={styles.tagline}>Thách đấu toán học 1v1</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đăng nhập</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@mathup.dev"
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

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.loginBtn, busy && { opacity: 0.6 }]}
              onPress={handleEmailLogin}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Đăng Nhập</Text>}
            </TouchableOpacity>
          </View>

          {/* Test accounts hint */}
          <View style={styles.testBox}>
            <Text style={styles.testTitle}>Tài khoản thử nghiệm</Text>
            <View style={styles.testRow}>
              <TouchableOpacity style={styles.testBtn} onPress={() => fillAccount('admin')} activeOpacity={0.7}>
                <Text style={styles.testBtnEmail}>admin@mathup.dev</Text>
                <Text style={styles.testBtnPwd}>admin123</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.testBtn} onPress={() => fillAccount('admin1')} activeOpacity={0.7}>
                <Text style={styles.testBtnEmail}>admin1@mathup.dev</Text>
                <Text style={styles.testBtnPwd}>admin123</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.testHint}>Nhấn để điền tự động</Text>
          </View>

          {/* Registration link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}> Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>


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
  appName: { fontSize: 36, fontWeight: '900', color: C.deep, marginTop: 8 },
  tagline: { fontSize: 14, color: C.textLight, marginTop: 6 },

  card: {
    backgroundColor: C.white, borderRadius: 24, padding: 24,
    shadowColor: 'rgba(59,130,246,0.12)',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1,
    shadowRadius: 24, elevation: 8, gap: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: '900', color: C.text },

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

  testBox: {
    marginTop: 24, backgroundColor: '#FEF9C3', borderRadius: 20, padding: 16, gap: 10,
  },
  testTitle: { fontSize: 12, fontWeight: '800', color: '#78350F', textAlign: 'center' },
  testRow: { flexDirection: 'row', gap: 10 },
  testBtn: {
    flex: 1, backgroundColor: C.white, borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 2,
    borderWidth: 1.5, borderColor: '#FDE68A',
  },
  testBtnEmail: { fontSize: 11, fontWeight: '700', color: C.deep },
  testBtnPwd: { fontSize: 13, fontWeight: '900', color: C.primary },
  testHint: { fontSize: 11, color: '#92400E', textAlign: 'center' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { fontSize: 12, color: C.textLight, fontWeight: '600' },

  googleBtn: {
    backgroundColor: C.white, borderRadius: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  googleIcon: { fontSize: 20 },
  googleText: { fontSize: 15, fontWeight: '700', color: C.text },

  footer: {
    flexDirection: 'row', justifyContent: 'center', marginTop: 32, marginBottom: 24,
  },
  footerText: { fontSize: 14, color: C.textLight },
  footerLink: { fontSize: 14, fontWeight: '700', color: C.primary },
});
