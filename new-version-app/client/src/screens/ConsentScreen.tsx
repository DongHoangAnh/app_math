import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Pressable, TouchableOpacity, Platform, Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { C, R, F, hardShadow } from '../theme';
import { TactileButton } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../config';

// Consent gate — shown right after the first sign-in / registration (any
// method) until the user accepts the current legal version. See useAuth
// `termsAccepted` / `acceptTerms` and the routing in App.tsx.
export default function ConsentScreen() {
  const { acceptTerms, signOut } = useAuth();
  const [checked, setChecked]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const openLink = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        await Linking.openURL(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch {
      /* ignore — nothing we can do if the browser refuses to open */
    }
  };

  const handleAccept = async () => {
    if (!checked) {
      setError('Vui lòng tích vào ô đồng ý để tiếp tục');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await acceptTerms();
    } catch {
      setError('Không thể lưu lựa chọn của bạn. Vui lòng thử lại.');
      setSubmitting(false);
    }
    // On success the auth state flips and the navigator swaps this screen out,
    // so there's no need to reset `submitting`.
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.mascot, hardShadow(C.orangeDark, 6, 0.25)]}>
            <Text style={styles.mascotEmoji}>📜</Text>
          </View>
          <Text style={styles.title}>Điều khoản & Chính sách</Text>
          <Text style={styles.subtitle}>
            Trước khi bắt đầu, vui lòng đọc và đồng ý với các điều khoản dưới đây 💛
          </Text>
        </View>

        {/* Summary card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tóm tắt</Text>
          <Text style={styles.cardText}>
            MathUp thu thập email, tên hiển thị và dữ liệu trò chơi để vận hành
            ứng dụng. Chúng tôi <Text style={styles.bold}>không bán</Text> dữ liệu
            cho bên thứ ba, và bạn có thể yêu cầu xóa tài khoản bất cứ lúc nào.
          </Text>

          <View style={styles.bullets}>
            <Bullet icon="🛡️" text="Dữ liệu được mã hóa & bảo vệ theo Nghị định 13/2023/NĐ-CP" />
            <Bullet icon="🚫" text="Không quảng cáo theo dõi, không bán dữ liệu" />
            <Bullet icon="🗑️" text="Toàn quyền xem, sửa và xóa dữ liệu cá nhân" />
            <Bullet icon="🤝" text="Chơi công bằng, văn minh — không gian lận, không quấy rối" />
          </View>
        </View>

        {/* Document links */}
        <View style={styles.linkList}>
          <DocLink
            icon="📄"
            label="Điều khoản dịch vụ"
            onPress={() => openLink(TERMS_OF_SERVICE_URL)}
          />
          <DocLink
            icon="🔒"
            label="Chính sách bảo mật"
            onPress={() => openLink(PRIVACY_POLICY_URL)}
          />
        </View>

        {/* Consent checkbox */}
        <Pressable
          style={styles.checkRow}
          onPress={() => { setChecked(!checked); setError(null); }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
        >
          <View style={[styles.checkbox, checked && styles.checkboxOn]}>
            {checked ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>
            Tôi đã đọc và đồng ý với{' '}
            <Text style={styles.checkLink} onPress={() => openLink(TERMS_OF_SERVICE_URL)}>
              Điều khoản dịch vụ
            </Text>{' '}
            và{' '}
            <Text style={styles.checkLink} onPress={() => openLink(PRIVACY_POLICY_URL)}>
              Chính sách bảo mật
            </Text>{' '}
            của MathUp.
          </Text>
        </Pressable>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️  {error}</Text>
          </View>
        )}

        <TactileButton
          title="Đồng ý & Tiếp tục"
          iconRight="→"
          onPress={handleAccept}
          loading={submitting}
          disabled={!checked || submitting}
          style={{ marginTop: 8 }}
        />

        <TouchableOpacity
          onPress={() => signOut()}
          disabled={submitting}
          style={styles.declineBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.declineText}>Không đồng ý — Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Bullet({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletIcon}>{icon}</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function DocLink({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.docLink} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.docIcon}>{icon}</Text>
      <Text style={styles.docLabel}>{label}</Text>
      <Text style={styles.docChevron}>↗</Text>
    </TouchableOpacity>
  );
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
  title:    { fontFamily: F.display, fontSize: 26, color: C.orangeDark, textAlign: 'center' },
  subtitle: { fontFamily: F.body, fontSize: 14, color: C.inkBrown, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },

  card: {
    backgroundColor: C.surface, borderRadius: R.xl, padding: 20,
    borderWidth: 2, borderColor: C.peachBorder, gap: 12,
  },
  cardTitle: { fontFamily: F.display, fontSize: 16, color: C.ink },
  cardText:  { fontFamily: F.body, fontSize: 14, color: C.inkBrown, lineHeight: 21 },
  bold:      { fontFamily: F.bodyBold, color: C.ink },

  bullets:    { gap: 10, marginTop: 2 },
  bulletRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  bulletText: { flex: 1, fontFamily: F.body, fontSize: 13.5, color: C.inkBrown, lineHeight: 19 },

  linkList: { gap: 10, marginTop: 16 },
  docLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.peachBg, borderRadius: R.md, paddingVertical: 14, paddingHorizontal: 16,
  },
  docIcon:    { fontSize: 18 },
  docLabel:   { flex: 1, fontFamily: F.display, fontSize: 15, color: C.orangeDark },
  docChevron: { fontFamily: F.display, fontSize: 16, color: C.orangeDark },

  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginTop: 24, paddingHorizontal: 2,
  },
  checkbox: {
    width: 26, height: 26, borderRadius: R.xs, borderWidth: 2,
    borderColor: C.peachBorder, backgroundColor: C.surface,
    justifyContent: 'center', alignItems: 'center', marginTop: 1,
  },
  checkboxOn: { backgroundColor: C.orange, borderColor: C.orange },
  checkMark:  { color: '#fff', fontFamily: F.displayBold, fontSize: 15, lineHeight: 18 },
  checkLabel: { flex: 1, fontFamily: F.body, fontSize: 14, color: C.inkBrown, lineHeight: 21 },
  checkLink:  { fontFamily: F.bodyBold, color: C.orangeDark, textDecorationLine: 'underline' },

  errorBox:  { backgroundColor: C.errorSoft, borderRadius: R.md, padding: 12, marginTop: 14 },
  errorText: { fontFamily: F.bodyMedium, fontSize: 13, color: C.error, textAlign: 'center' },

  declineBtn:  { alignItems: 'center', marginTop: 20 },
  declineText: { fontFamily: F.display, fontSize: 14, color: C.inkSlate },
});
