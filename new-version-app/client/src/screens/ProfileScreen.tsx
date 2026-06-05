import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, Image, Switch,
} from 'react-native';
import { C, R, F, shadow, hardShadow } from '../theme';
import { ProgressBar } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { supabase } from '../services/supabase';
import { getLevelProgress, getTier, TIER_LABEL } from '../utils/levelUtils';
import EditProfileModal from '../components/EditProfileModal';
import { gameApi } from '../services/api';

interface UserStats {
  totalScore: number; totalMatches: number;
  wins: number; winRate: number; streak: number; level: number;
}

const FALLBACK: UserStats = {
  totalScore: 0, totalMatches: 0, wins: 0, winRate: 0, streak: 0, level: 1,
};

const ACHIEVEMENTS = [
  { emoji: '🏆', label: 'Vô địch' },
  { emoji: '🔥', label: 'Streak 5' },
  { emoji: '⚡', label: 'Tốc độ' },
  { emoji: '🎯', label: 'Bách phát' },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { soundEnabled, hapticsEnabled, setSoundEnabled, setHapticsEnabled } = useSettings();
  const [stats, setStats]                 = useState<UserStats>(FALLBACK);
  const [rankingPoints, setRankingPoints] = useState(0);
  const [userExp, setUserExp]             = useState(0);
  const [userLevel, setUserLevel]         = useState(1);
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null);
  const [editVisible, setEditVisible]     = useState(false);

  const displayName = user?.user_metadata?.full_name ?? 'Người chơi';
  const initial     = displayName[0]?.toUpperCase() ?? 'M';
  const grade       = user?.user_metadata?.grade;
  const tierLabel   = TIER_LABEL[getTier(userLevel)];

  useEffect(() => {
    if (!user) return;

    supabase
      .from('user_profiles')
      .select('ranking_points, avatar_url, exp, level')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setRankingPoints(data.ranking_points ?? 0);
          setAvatarUrl(data.avatar_url ?? null);
          setUserExp(data.exp ?? 0);
          setUserLevel(data.level ?? 1);
        }
      }, () => {});

    gameApi.getStats(user.id)
      .then((data) => setStats({
        totalScore:   data.totalScore   ?? 0,
        totalMatches: data.totalMatches ?? 0,
        wins:         data.totalWins    ?? 0,
        winRate:      data.winRate      ?? 0,
        streak:       data.currentStreak ?? 0,
        level:        data.level        ?? 1,
      }))
      .catch(() => {});
  }, [user]);

  const handleProfileSaved = (_newName: string, newAvatarUrl: string | null) => {
    setAvatarUrl(newAvatarUrl);
    setEditVisible(false);
  };

  const lp = getLevelProgress(userExp);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Header band ── */}
        <View style={styles.header}>
          <Text style={[styles.glyph, { left: '8%', top: '20%', fontSize: 70 }]}>π</Text>
          <Text style={[styles.glyph, { right: '10%', top: '50%', fontSize: 54 }]}>∑</Text>

          <TouchableOpacity
            style={[styles.avatarRing, hardShadow('#5F1900', 6, 0.25)]}
            onPress={() => setEditVisible(true)}
            activeOpacity={0.85}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeIcon}>✏️</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{displayName}</Text>
          <View style={styles.chipRow}>
            <View style={styles.chipLight}><Text style={styles.chipLightTxt}>Cấp {userLevel}</Text></View>
            <View style={styles.chipDeep}><Text style={styles.chipDeepTxt}>{tierLabel}</Text></View>
            {grade ? <View style={styles.chipLight}><Text style={styles.chipLightTxt}>Lớp {grade}</Text></View> : null}
          </View>
        </View>

        <View style={styles.body}>
          {/* XP card */}
          <View style={styles.card}>
            <View style={styles.xpTopRow}>
              <Text style={styles.label}>Tiến độ lên cấp {userLevel + 1}</Text>
              <Text style={styles.xpText}>{lp.expInLevel} / {lp.expForNext} XP</Text>
            </View>
            <ProgressBar pct={lp.percent} />
          </View>

          {/* Stats grid */}
          <View style={styles.statRow}>
            <ProfileStat value={`${stats.wins}`} label="Trận thắng" color={C.successDeep} />
            <ProfileStat value={`${stats.streak}`} label="Chuỗi thắng" color={C.orange} />
            <ProfileStat value={`${stats.winRate?.toFixed(0) ?? 0}%`} label="Tỷ lệ thắng" color={C.orangeDark} />
          </View>

          {/* Achievements */}
          <View style={{ gap: 12 }}>
            <Text style={styles.h3}>Thành tích</Text>
            <View style={styles.achRow}>
              {ACHIEVEMENTS.map((a) => (
                <View key={a.label} style={styles.achCard}>
                  <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
                  <Text style={styles.achLabel}>{a.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Sound & haptics toggles */}
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Âm thanh & Rung</Text>

            <View style={styles.settingToggleRow}>
              <Text style={styles.settingToggleLabel}>Âm thanh</Text>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ true: C.orange, false: C.line }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingToggleRow}>
              <Text style={styles.settingToggleLabel}>Rung</Text>
              <Switch
                value={hapticsEnabled}
                onValueChange={setHapticsEnabled}
                trackColor={{ true: C.orange, false: C.line }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Settings */}
          <View style={styles.settings}>
            <SettingRow icon="✏️" label="Chỉnh sửa hồ sơ" onPress={() => setEditVisible(true)} />
            <SettingRow icon="💬" label="Trợ giúp" onPress={() => {}} />
            <SettingRow icon="📋" label="Điều khoản" onPress={() => {}} />
            <SettingRow icon="🚪" label="Đăng xuất" onPress={signOut} danger isLast />
          </View>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={editVisible}
        currentName={displayName}
        currentAvatarUrl={avatarUrl}
        onClose={() => setEditVisible(false)}
        onSaved={handleProfileSaved}
      />
    </SafeAreaView>
  );
}

function ProfileStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingRow({
  icon, label, onPress, danger, isLast,
}: { icon: string; label: string; onPress: () => void; danger?: boolean; isLast?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress} activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? C.errorSoft : C.peachBg }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <Text style={[styles.settingLabel, danger && { color: C.error }]}>{label}</Text>
      {!danger && <Text style={styles.settingArrow}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header band
  header: {
    backgroundColor: C.orange, alignItems: 'center',
    paddingTop: 64, paddingBottom: 28, overflow: 'hidden',
  },
  glyph: { position: 'absolute', fontFamily: F.displayBold, color: '#fff', opacity: 0.1 },
  avatarRing: {
    width: 88, height: 88, borderRadius: R.pill,
    borderWidth: 3, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10, position: 'relative',
  },
  avatarImg: { width: 78, height: 78, borderRadius: R.pill },
  avatar: {
    width: 78, height: 78, borderRadius: R.pill, backgroundColor: C.peachGlow,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontFamily: F.displayBold, fontSize: 30, color: C.orangeDeepest },
  editBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 30, height: 30, borderRadius: R.pill, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.orange,
  },
  editBadgeIcon: { fontSize: 13 },
  name: { fontFamily: F.displayBold, fontSize: 24, color: '#fff' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  chipLight: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 4 },
  chipLightTxt: { fontFamily: F.display, fontSize: 13, color: C.orangeDeepest },
  chipDeep: { backgroundColor: C.orangeDeepest, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 4 },
  chipDeepTxt: { fontFamily: F.display, fontSize: 13, color: '#fff' },

  body: { padding: 20, marginTop: -16, gap: 20 },

  card: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: R.md, padding: 16, ...shadow('#000', 2),
  },
  xpTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  label:  { fontFamily: F.display, fontSize: 14, color: C.ink },
  xpText: { fontFamily: F.bodyBold, fontSize: 12, color: C.inkBrown },

  // Stat grid
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: R.md, paddingVertical: 16, paddingHorizontal: 8,
    alignItems: 'center', gap: 2, ...shadow('#000', 1),
  },
  statValue: { fontFamily: F.displayBold, fontSize: 24 },
  statLabel: { fontFamily: F.bodyMedium, fontSize: 12, color: C.inkSlate, textAlign: 'center' },

  h3: { fontFamily: F.display, fontSize: 20, color: C.ink, marginLeft: 4 },

  // Achievements
  achRow: { flexDirection: 'row', gap: 12 },
  achCard: {
    flex: 1, aspectRatio: 1, borderRadius: R.md, backgroundColor: C.peachBg,
    borderWidth: 1, borderColor: C.peachBorder,
    justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  achLabel: { fontFamily: F.bodyMedium, fontSize: 10, color: C.orangeDark },

  // Settings
  settings: {
    borderRadius: R.md, overflow: 'hidden',
    borderWidth: 1, borderColor: C.line, ...shadow('#000', 1),
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16, paddingHorizontal: 16,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  settingIcon: {
    width: 36, height: 36, borderRadius: R.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  settingLabel: { flex: 1, fontFamily: F.display, fontSize: 14, color: C.ink },
  settingArrow: { fontFamily: F.display, fontSize: 22, color: C.inkSlate },

  // Sound & haptics card
  settingsCard: {
    padding: 16,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.line, ...shadow('#000', 1),
  },
  settingsTitle: { fontFamily: F.display, fontSize: 16, color: C.ink, marginBottom: 8 },
  settingToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingToggleLabel: { fontFamily: F.bodyMedium, fontSize: 14, color: C.inkBrown },
});
