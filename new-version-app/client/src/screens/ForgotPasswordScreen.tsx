import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { C, R, F, hardShadow } from '../theme';
import { TactileButton } from '../components/ui';
import { ASSETS } from '../assets';

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
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={[styles.iconWrap, hardShadow(C.orangeDark, 6, 0.25)]}>
              <Text style={styles.iconEmoji}>{ASSETS.forgotPassword.lock}</Text>
            </View>
            <Text style={styles.title}>Quên mật khẩu?</Text>
            <Text style={styles.subtitle}>
              Nhập email của bạn — chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.
            </Text>
          </View>

          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successEmoji}>{ASSETS.forgotPassword.sent}</Text>
              <Text style={styles.successTitle}>Kiểm tra hộp thư!</Text>
              <Text style={styles.successText}>
                Nếu địa chỉ <Text style={{ fontFamily: F.display, color: C.orangeDark }}>{email}</Text>
                {' '}tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu trong vài phút.
              </Text>
              <Text style={styles.spamHint}>Không thấy email? Hãy kiểm tra thư mục Spam/Junk.</Text>
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={() => { setSent(false); setEmail(''); }}
                activeOpacity={0.7}
              >
                <Text style={styles.resendText}>Gửi lại với email khác</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Địa chỉ email</Text>
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
                  <Text style={styles.errorText}>{ASSETS.forgotPassword.warn}  {error}</Text>
                </View>
              )}

              <TactileButton
                title="Gửi liên kết đặt lại"
                iconRight="→"
                onPress={handleSend}
                loading={submitting}
                disabled={submitting || !email.trim()}
              />
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Nhớ ra mật khẩu rồi? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Đăng nhập ngay →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32 },

  backBtn:  { marginTop: 16, alignSelf: 'flex-start' },
  backText: { fontFamily: F.display, fontSize: 14, color: C.orangeDark },

  hero: { alignItems: 'center', paddingTop: 20, paddingBottom: 28, gap: 10 },
  iconWrap: {
    width: 88, height: 88, borderRadius: R.pill, backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  iconEmoji: { fontSize: 42 },
  title:    { fontFamily: F.display, fontSize: 28, color: C.ink },
  subtitle: { fontFamily: F.body, fontSize: 14, color: C.inkBrown, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },

  form: { gap: 16 },
  inputGroup: { gap: 8 },
  inputLabel: { fontFamily: F.display, fontSize: 14, color: C.inkBrown, marginLeft: 4 },
  input: {
    height: 56, backgroundColor: C.surfaceSunken, borderRadius: R.pill,
    paddingHorizontal: 20, fontFamily: F.body, fontSize: 16, color: C.ink,
    borderWidth: 2, borderColor: C.peachBorder,
  },
  inputError: { borderColor: C.error },

  errorBox:  { backgroundColor: C.errorSoft, borderRadius: R.md, padding: 12 },
  errorText: { fontFamily: F.bodyMedium, fontSize: 13, color: C.error, textAlign: 'center' },

  successBox: { alignItems: 'center', gap: 14, paddingVertical: 8 },
  successEmoji: { fontSize: 64 },
  successTitle: { fontFamily: F.display, fontSize: 24, color: C.successDeep },
  successText: { fontFamily: F.body, fontSize: 14, color: C.inkBrown, textAlign: 'center', lineHeight: 22 },
  spamHint:   { fontFamily: F.body, fontSize: 12, color: C.inkSlate, textAlign: 'center', fontStyle: 'italic' },
  resendBtn: {
    marginTop: 4, paddingVertical: 11, paddingHorizontal: 24,
    borderRadius: R.pill, borderWidth: 1.5, borderColor: C.orange,
  },
  resendText: { fontFamily: F.display, fontSize: 13, color: C.orangeDark },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  footerText: { fontFamily: F.body, fontSize: 14, color: C.inkBrown },
  footerLink: { fontFamily: F.display, fontSize: 14, color: C.orangeDark },
});
