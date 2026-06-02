import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';

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

const PASSWORD_MIN = 8;

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (pwd.length === 0) return { score: 0, label: '', color: '#ddd' };
  let score = 0;
  if (pwd.length >= PASSWORD_MIN) score++;
  if (pwd.length >= 12)           score++;
  if (/[A-Z]/.test(pwd))          score++;
  if (/[0-9]/.test(pwd))          score++;
  if (/[^A-Za-z0-9]/.test(pwd))  score++;

  if (score <= 1) return { score, label: 'Rất yếu',  color: '#FF4444' };
  if (score === 2) return { score, label: 'Yếu',      color: '#FF8C00' };
  if (score === 3) return { score, label: 'Trung bình', color: '#FFD23F' };
  if (score === 4) return { score, label: 'Mạnh',     color: '#4CAF50' };
  return { score, label: 'Rất mạnh', color: '#1B8A3E' };
}

export default function ResetPasswordScreen() {
  const { confirmPasswordReset, signOut } = useAuth();

  const [password, setPassword]           = useState('');
  const [confirm, setConfirm]             = useState('');
  const [showPwd, setShowPwd]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [done, setDone]                   = useState(false);

  const strength = getPasswordStrength(password);

  const validate = (): string | null => {
    if (password.length < PASSWORD_MIN) return `Mật khẩu phải có ít nhất ${PASSWORD_MIN} ký tự`;
    if (password !== confirm)           return 'Mật khẩu xác nhận không khớp';
    return null;
  };

  const handleReset = async () => {
    setError(null);
    const msg = validate();
    if (msg) { setError(msg); return; }

    setSubmitting(true);
    try {
      await confirmPasswordReset(password);
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.doneWrap}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Đặt lại thành công!</Text>
          <Text style={styles.doneText}>Mật khẩu mới của bạn đã được lưu. Bạn đã đăng nhập.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = password.length >= PASSWORD_MIN && confirm.length > 0 && !submitting;

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
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>🔑</Text>
            </View>
            <Text style={styles.title}>Đặt mật khẩu mới</Text>
            <Text style={styles.subtitle}>Chọn một mật khẩu mạnh mà bạn chưa dùng ở nơi khác.</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {/* New password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>🔒  Mật khẩu mới</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(null); }}
                  placeholder={`Tối thiểu ${PASSWORD_MIN} ký tự`}
                  placeholderTextColor="#C9B8AF"
                  secureTextEntry={!showPwd}
                  editable={!submitting}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(!showPwd)}>
                  <Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              {/* Strength bar */}
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBarBg}>
                    <View style={[
                      styles.strengthBarFill,
                      { width: `${(strength.score / 5) * 100}%` as any, backgroundColor: strength.color },
                    ]} />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                </View>
              )}

              <View style={styles.pwdHints}>
                <PwdHint ok={password.length >= PASSWORD_MIN} text={`Ít nhất ${PASSWORD_MIN} ký tự`} />
                <PwdHint ok={/[A-Z]/.test(password)} text="Chữ hoa (A-Z)" />
                <PwdHint ok={/[0-9]/.test(password)} text="Chữ số (0-9)" />
                <PwdHint ok={/[^A-Za-z0-9]/.test(password)} text="Ký tự đặc biệt (!@#...)" />
              </View>
            </View>

            {/* Confirm password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>🔐  Xác nhận mật khẩu</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[
                    styles.input,
                    confirm.length > 0 && (password === confirm ? styles.inputOk : styles.inputError),
                  ]}
                  value={confirm}
                  onChangeText={(t) => { setConfirm(t); setError(null); }}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor="#C9B8AF"
                  secureTextEntry={!showConfirm}
                  editable={!submitting}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                  <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {confirm.length > 0 && password !== confirm && (
                <Text style={styles.matchError}>Mật khẩu không khớp</Text>
              )}
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️  {error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.resetBtn, !canSubmit && { opacity: 0.5 }]}
              onPress={handleReset}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.resetBtnText}>Lưu mật khẩu mới ✓</Text>}
            </TouchableOpacity>
          </View>

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelWrap} onPress={signOut} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Huỷ — đăng xuất</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PwdHint({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.hintRow}>
      <Text style={[styles.hintDot, ok && styles.hintDotOk]}>{ok ? '✓' : '·'}</Text>
      <Text style={[styles.hintText, ok && styles.hintTextOk]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  hero: { alignItems: 'center', paddingTop: 36, paddingBottom: 28 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 18,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 12,
  },
  iconEmoji: { fontSize: 44 },
  title:    { fontSize: 26, fontWeight: '900', color: C.text, marginBottom: 8 },
  subtitle: { fontSize: 13, color: C.textLight, textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: C.card, borderRadius: 28, padding: 24,
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
    gap: 18,
  },

  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: C.textLight },
  inputWrap:  { position: 'relative', justifyContent: 'center' },
  input: {
    backgroundColor: C.bg, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    paddingRight: 50,
    fontSize: 15, color: C.text,
    borderWidth: 2, borderColor: '#FFD8C5',
  },
  inputError: { borderColor: C.error },
  inputOk:    { borderColor: C.success },
  eyeBtn: {
    position: 'absolute', right: 14,
    padding: 4,
  },
  eyeIcon: { fontSize: 18 },
  matchError: { fontSize: 12, color: C.error, fontWeight: '600', marginTop: 2 },

  // Strength
  strengthRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  strengthBarBg:  { flex: 1, height: 5, backgroundColor: '#F0E8E0', borderRadius: 3 },
  strengthBarFill: { height: 5, borderRadius: 3 },
  strengthLabel:  { fontSize: 11, fontWeight: '800', width: 64, textAlign: 'right' },

  // Password hints
  pwdHints: { gap: 4, marginTop: 4 },
  hintRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintDot:  { fontSize: 13, color: '#CCC', width: 16, textAlign: 'center' },
  hintDotOk: { color: C.success },
  hintText:  { fontSize: 12, color: C.textLight },
  hintTextOk: { color: C.text },

  errorBox:  { backgroundColor: '#FFEBEE', borderRadius: 14, padding: 12 },
  errorText: { fontSize: 13, color: C.error, textAlign: 'center', fontWeight: '600' },

  resetBtn: {
    backgroundColor: C.primary, borderRadius: 18, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  resetBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },

  cancelWrap: { alignItems: 'center', marginTop: 24 },
  cancelText: { fontSize: 13, color: C.textLight, fontWeight: '600' },

  // Done state
  doneWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  doneEmoji: { fontSize: 72 },
  doneTitle: { fontSize: 24, fontWeight: '900', color: C.success, textAlign: 'center' },
  doneText:  { fontSize: 14, color: C.textLight, textAlign: 'center', lineHeight: 22 },
});
