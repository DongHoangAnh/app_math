import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';

const C = {
  primary:     '#FF6B35',
  primaryDark: '#E85D28',
  secondary:   '#FFD23F',
  bg:          '#FFF8F2',
  card:        '#FFFFFF',
  text:        '#2C1810',
  textLight:   '#8B7B74',
  error:       '#FF4444',
};

export default function LoginScreen() {
  const { signInWithEmail, loading } = useAuth();
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
          {/* Hero area */}
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
                placeholder="••••••"
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
              onPress={handleEmailLogin}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Đăng Nhập →</Text>}
            </TouchableOpacity>
          </View>

          {/* Test accounts */}
          <View style={styles.testBox}>
            <Text style={styles.testTitle}>🧪  Tài khoản thử nghiệm</Text>
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

          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}> Đăng ký ngay 🎉</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

  // Hero
  hero: {
    alignItems: 'center', paddingTop: 40, paddingBottom: 36, overflow: 'hidden',
  },
  heroBg: {
    position: 'absolute', top: -40, width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,107,53,0.08)',
  },
  heroCircle: {
    position: 'absolute', top: 20, right: -30, width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,210,63,0.12)',
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
  appName:     { fontSize: 36, fontWeight: '900', color: C.text },
  tagline:     { fontSize: 14, color: C.textLight, marginTop: 6, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: C.card, borderRadius: 28, padding: 24,
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
    gap: 16,
  },
  cardTitle: { fontSize: 22, fontWeight: '900', color: C.text },

  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: C.textLight },
  input: {
    backgroundColor: C.bg, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: C.text,
    borderWidth: 2, borderColor: '#FFD8C5',
  },

  errorBox: {
    backgroundColor: '#FFEBEE', borderRadius: 14, padding: 12,
  },
  errorText: { fontSize: 13, color: C.error, textAlign: 'center', fontWeight: '600' },

  loginBtn: {
    backgroundColor: C.primary, borderRadius: 18, paddingVertical: 17,
    alignItems: 'center', marginTop: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  loginBtnText: { fontSize: 17, fontWeight: '900', color: '#fff' },

  // Test box
  testBox: {
    marginTop: 20, backgroundColor: '#FFF9C4',
    borderRadius: 22, padding: 16, gap: 10,
    borderWidth: 1.5, borderColor: '#FFE082',
  },
  testTitle: { fontSize: 12, fontWeight: '800', color: '#6D4C00', textAlign: 'center' },
  testRow:   { flexDirection: 'row', gap: 10 },
  testBtn: {
    flex: 1, backgroundColor: C.card, borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 2,
    borderWidth: 1.5, borderColor: '#FFD54F',
  },
  testBtnEmail: { fontSize: 11, fontWeight: '700', color: C.text },
  testBtnPwd:   { fontSize: 13, fontWeight: '900', color: C.primary },
  testHint:     { fontSize: 11, color: '#8D6E00', textAlign: 'center' },

  footer: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 28, marginBottom: 8,
  },
  footerText: { fontSize: 14, color: C.textLight },
  footerLink: { fontSize: 14, fontWeight: '800', color: C.primary },
});
