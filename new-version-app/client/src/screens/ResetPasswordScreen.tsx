import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { C, R, F, hardShadow } from '../theme';
import { TactileButton } from '../components/ui';

const PASSWORD_MIN = 8;

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (pwd.length === 0) return { score: 0, label: '', color: '#ddd' };
  let score = 0;
  if (pwd.length >= PASSWORD_MIN) score++;
  if (pwd.length >= 12)           score++;
  if (/[A-Z]/.test(pwd))          score++;
  if (/[0-9]/.test(pwd))          score++;
  if (/[^A-Za-z0-9]/.test(pwd))  score++;

  if (score <= 1) return { score, label: 'Rất yếu',  color: C.error };
  if (score === 2) return { score, label: 'Yếu',      color: '#FF8C00' };
  if (score === 3) return { score, label: 'Trung bình', color: C.orangeLight };
  if (score === 4) return { score, label: 'Mạnh',     color: C.success };
  return { score, label: 'Rất mạnh', color: C.successDeep };
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
            <View style={[styles.iconWrap, hardShadow(C.orangeDark, 6, 0.25)]}>
              <Text style={styles.iconEmoji}>🔑</Text>
            </View>
            <Text style={styles.title}>Đặt mật khẩu mới</Text>
            <Text style={styles.subtitle}>Chọn một mật khẩu mạnh mà bạn chưa dùng ở nơi khác.</Text>
          </View>

          <View style={styles.form}>
            {/* New password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu mới</Text>
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
              <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
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

            <TactileButton
              title="Lưu mật khẩu mới"
              iconRight="✓"
              onPress={handleReset}
              loading={submitting}
              disabled={!canSubmit}
            />
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
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 36, paddingBottom: 40 },

  hero: { alignItems: 'center', paddingBottom: 28, gap: 10 },
  iconWrap: {
    width: 88, height: 88, borderRadius: R.pill, backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  iconEmoji: { fontSize: 42 },
  title:    { fontFamily: F.display, fontSize: 26, color: C.ink },
  subtitle: { fontFamily: F.body, fontSize: 13, color: C.inkBrown, textAlign: 'center', lineHeight: 20 },

  form: { gap: 18 },
  inputGroup: { gap: 8 },
  inputLabel: { fontFamily: F.display, fontSize: 14, color: C.inkBrown, marginLeft: 4 },
  inputWrap:  { position: 'relative', justifyContent: 'center' },
  input: {
    height: 56, backgroundColor: C.surfaceSunken, borderRadius: R.pill,
    paddingHorizontal: 20, paddingRight: 50,
    fontFamily: F.body, fontSize: 16, color: C.ink,
    borderWidth: 2, borderColor: C.peachBorder,
  },
  inputError: { borderColor: C.error },
  inputOk:    { borderColor: C.success },
  eyeBtn: { position: 'absolute', right: 16, padding: 4 },
  eyeIcon: { fontSize: 18 },
  matchError: { fontFamily: F.bodyMedium, fontSize: 12, color: C.error, marginLeft: 4 },

  // Strength
  strengthRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  strengthBarBg:  { flex: 1, height: 6, backgroundColor: C.surfaceSunken, borderRadius: R.pill, overflow: 'hidden' },
  strengthBarFill: { height: 6, borderRadius: R.pill },
  strengthLabel:  { fontFamily: F.display, fontSize: 11, width: 64, textAlign: 'right' },

  // Password hints
  pwdHints: { gap: 4, marginTop: 4 },
  hintRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintDot:  { fontSize: 13, color: C.inkSlate, width: 16, textAlign: 'center' },
  hintDotOk: { color: C.success },
  hintText:  { fontFamily: F.body, fontSize: 12, color: C.inkSlate },
  hintTextOk: { color: C.ink },

  errorBox:  { backgroundColor: C.errorSoft, borderRadius: R.md, padding: 12 },
  errorText: { fontFamily: F.bodyMedium, fontSize: 13, color: C.error, textAlign: 'center' },

  cancelWrap: { alignItems: 'center', marginTop: 24 },
  cancelText: { fontFamily: F.bodyMedium, fontSize: 13, color: C.inkSlate },

  // Done state
  doneWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  doneEmoji: { fontSize: 72 },
  doneTitle: { fontFamily: F.display, fontSize: 24, color: C.successDeep, textAlign: 'center' },
  doneText:  { fontFamily: F.body, fontSize: 14, color: C.inkBrown, textAlign: 'center', lineHeight: 22 },
});
