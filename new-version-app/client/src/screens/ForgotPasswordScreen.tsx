import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { C, R } from '../theme';

export default function ForgotPasswordScreen() {
  const { sendPasswordResetEmail } = useAuth();
  const navigation = useNavigation<any>();

  const [email, setEmail]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [sent, setSent]         = useState(false);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handleSend = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Địa chỉ email không hợp lệ');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(email.trim());
      setSent(true);
    } catch (e: any) {
      // Không tiết lộ email có tồn tại hay không để tránh user enumeration
      setSent(true);
    } finally {
      setSubmitting(false);
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
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>🔐</Text>
            </View>
            <Text style={styles.title}>Quên mật khẩu?</Text>
            <Text style={styles.subtitle}>
              Nhập email của bạn — chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {sent ? (
              // Success state
              <View style={styles.successBox}>
                <Text style={styles.successEmoji}>📬</Text>
                <Text style={styles.successTitle}>Kiểm tra hộp thư!</Text>
                <Text style={styles.successText}>
                  Nếu địa chỉ{' '}
                  <Text style={{ fontWeight: '800', color: C.primary }}>{email}</Text>
                  {' '}tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu trong vài phút.
                </Text>
                <Text style={styles.spamHint}>
                  Không thấy email? Hãy kiểm tra thư mục Spam/Junk.
                </Text>
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={() => { setSent(false); setEmail(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendText}>Gửi lại với email khác</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.cardTitle}>Đặt lại mật khẩu</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>✉️  Địa chỉ email</Text>
                  <TextInput
                    style={[styles.input, error ? styles.inputError : null]}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(null); }}
                    placeholder="email@example.com"
                    placeholderTextColor="#C9B8AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!submitting}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                  />
                </View>

                {error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠️  {error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.sendBtn, (submitting || !email.trim()) && { opacity: 0.55 }]}
                  onPress={handleSend}
                  disabled={submitting || !email.trim()}
                  activeOpacity={0.85}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.sendBtnText}>Gửi liên kết đặt lại →</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Nhớ ra mật khẩu rồi?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={styles.footerLink}> Đăng nhập ngay →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.background },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

  backBtn:  { marginTop: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontWeight: '700', color: C.primary },

  // Hero
  hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 32 },
  iconWrap: {
    width: 88, height: 88, borderRadius: R.xxl,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 18,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 12,
  },
  iconEmoji: { fontSize: 44 },
  title:    { fontSize: 28, fontWeight: '900', color: C.textPrimary, marginBottom: 10 },
  subtitle: {
    fontSize: 14, color: C.textSecond, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 8,
  },

  // Card
  card: {
    backgroundColor: C.surface, borderRadius: R.xxl, padding: 24,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
    gap: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: '900', color: C.textPrimary },

  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: C.textSecond },
  input: {
    backgroundColor: C.background, borderRadius: R.md,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: C.textPrimary,
    borderWidth: 2, borderColor: C.border,
  },
  inputError: { borderColor: C.error },

  errorBox:  { backgroundColor: '#FFEBEE', borderRadius: R.sm, padding: 12 },
  errorText: { fontSize: 13, color: C.error, textAlign: 'center', fontWeight: '600' },

  sendBtn: {
    backgroundColor: C.primary, borderRadius: R.lg, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  sendBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },

  // Success
  successBox: { alignItems: 'center', gap: 14, paddingVertical: 8 },
  successEmoji: { fontSize: 64 },
  successTitle: { fontSize: 22, fontWeight: '900', color: C.success },
  successText: { fontSize: 14, color: C.textSecond, textAlign: 'center', lineHeight: 22 },
  spamHint:   { fontSize: 12, color: C.textSecond, textAlign: 'center', fontStyle: 'italic' },
  resendBtn: {
    marginTop: 4, paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: R.sm, borderWidth: 1.5, borderColor: C.primary,
  },
  resendText: { fontSize: 13, fontWeight: '700', color: C.primary },

  footer: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 28, marginBottom: 8,
  },
  footerText: { fontSize: 14, color: C.textSecond },
  footerLink: { fontSize: 14, fontWeight: '800', color: C.primary },
});
