import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator, Switch, Alert,
} from 'react-native';
import { C, R, F, shadow } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { LevelCard } from '../components/LevelBadge';
import { gameApi } from '../services/api';
import { ASSETS } from '../assets';
import AssetIcon from '../components/AssetIcon';
import { AchievementId, AchievementStats, isUnlocked } from '../utils/achievements';

interface Stats {
  totalMatches: number; totalWins: number; winRate: number;
  totalScore: number; averageScore: number; bestStreak: number;
  currentStreak: number; level: number; nextLevelProgress: number;
  accuracyRate: number; avgTimePerMatch: number;
}

const FALLBACK: Stats = {
  totalMatches: 0, totalWins: 0, winRate: 0,
  totalScore: 0, averageScore: 0, bestStreak: 0,
  currentStreak: 0, level: 1, nextLevelProgress: 0,
  accuracyRate: 0, avgTimePerMatch: 0,
};

const BADGES: { id: AchievementId; emoji: any; title: string; desc: string }[] = [
  { id: 'firstMatch', emoji: ASSETS.statistics.achStart,   title: 'Bắt Đầu',   desc: 'Trận đầu tiên' },
  { id: 'hotStreak',  emoji: ASSETS.statistics.achHot,     title: 'Nóng Lên',  desc: '5 trận thắng liên tiếp' },
  { id: 'lucky',      emoji: ASSETS.statistics.achLucky,   title: 'Nhân Phẩm', desc: 'Đạt 50 điểm xếp hạng' },
  { id: 'diamond',    emoji: ASSETS.statistics.achDiamond, title: 'Kim Cương', desc: 'Level 10' },
];

export default function StatisticsScreen() {
  const { user } = useAuth();
  const [stats, setStats]   = useState<Stats>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [userExp, setUserExp] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [rankingPoints, setRankingPoints] = useState(0);
  const [allowViewing, setAllowViewing] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    gameApi.getStats(user.id)
      .then((data) => setStats({ ...FALLBACK, ...data }))
      .catch(() => {})
      .finally(() => setLoading(false));

    supabase
      .from('user_profiles')
      .select('exp,level,ranking_points,allow_viewing_info')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUserExp(data.exp ?? 0);
          setUserLevel(data.level ?? 1);
          setRankingPoints(data.ranking_points ?? 0);
          setAllowViewing(data.allow_viewing_info !== false);
        }
      }, () => {});
  }, [user]);

  const achievementStats: AchievementStats = {
    totalMatches: stats.totalMatches,
    totalWins: stats.totalWins,
    bestStreak: stats.bestStreak,
    currentStreak: stats.currentStreak,
    accuracyRate: stats.accuracyRate,
    avgTimePerMatch: stats.avgTimePerMatch,
    level: userLevel,
    rankingPoints,
  };

  const togglePrivacy = async (value: boolean) => {
    if (!user || savingPrivacy) return;
    setAllowViewing(value); // cập nhật lạc quan
    setSavingPrivacy(true);
    const { error } = await supabase
      .from('user_profiles')
      .update({ allow_viewing_info: value })
      .eq('id', user.id);
    if (error) {
      console.warn('[privacy] update failed:', error.message, error);
      setAllowViewing(!value); // hoàn lại nếu lưu thất bại
      Alert.alert('Không lưu được', error.message);
    }
    setSavingPrivacy(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={C.orange} size="large" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 64, paddingBottom: 32 }}>

        {/* Title */}
        <View style={styles.titleWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AssetIcon source={ASSETS.statistics.title} size={24} style={styles.title} />
            <Text style={styles.title}>Thống Kê</Text>
          </View>
          <Text style={styles.subtitle}>Tổng quan hiệu suất của bạn</Text>
        </View>

        {/* Main stats 2x2 */}
        <View style={styles.grid}>
          <BigStat emoji={ASSETS.statistics.matches} value={`${stats.totalMatches}`}        label="Trận chơi" />
          <BigStat emoji={ASSETS.statistics.wins}    value={`${stats.totalWins}`}           label="Chiến thắng" valueColor={C.successDeep} />
          <BigStat emoji={ASSETS.statistics.winRate} value={`${stats.winRate.toFixed(0)}%`} label="Tỷ lệ thắng" valueColor={C.orange} />
          <BigStat emoji={ASSETS.statistics.score}   value={`${stats.totalScore}`}          label="Tổng điểm" valueColor={C.orangeDark} />
        </View>

        {/* Streak */}
        <View style={styles.section}>
          <Text style={styles.h3}>Chuỗi thắng</Text>
          <View style={styles.streakRow}>
            <View style={[styles.streakCard, { backgroundColor: C.peachBg, borderColor: C.peachBorder }]}>
              <AssetIcon source={ASSETS.statistics.streakNow} size={26} style={{ fontSize: 26 }} />
              <Text style={styles.streakValue}>{stats.currentStreak}</Text>
              <Text style={styles.streakLabel}>Hiện tại</Text>
            </View>
            <View style={[styles.streakCard, { backgroundColor: '#FFF6D9', borderColor: '#FCE08A' }]}>
              <AssetIcon source={ASSETS.statistics.streakBest} size={26} style={{ fontSize: 26 }} />
              <Text style={styles.streakValue}>{stats.bestStreak}</Text>
              <Text style={styles.streakLabel}>Tốt nhất</Text>
            </View>
          </View>
        </View>

        {/* Level */}
        <View style={styles.section}>
          <Text style={styles.h3}>Cấp độ</Text>
          <LevelCard level={userLevel} totalExp={userExp} />
        </View>

        {/* Performance */}
        <View style={styles.section}>
          <Text style={styles.h3}>Hiệu suất</Text>
          <View style={styles.perfCard}>
            <PerfRow icon={ASSETS.statistics.avgScore}  label="Điểm TB / trận" value={`${stats.averageScore}`} />
            <PerfRow icon={ASSETS.statistics.accuracy}  label="Tỷ lệ trả lời đúng" value={stats.totalMatches > 0 ? `${stats.accuracyRate.toFixed(1)}%` : '—'} />
            <PerfRow icon={ASSETS.statistics.avgTime}   label="Trung bình / trận" value={stats.totalMatches > 0 ? `${stats.avgTimePerMatch.toFixed(1)}s` : '—'} isLast />
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.h3}>Quyền riêng tư</Text>
          <View style={styles.privacyCard}>
            <View style={styles.privacyTextWrap}>
              <Text style={styles.privacyLabel}>Cho phép người khác xem thông tin của tôi</Text>
              <Text style={styles.privacySub}>
                Khi tắt, người khác chỉ thấy ảnh đại diện, tên và cấp độ của bạn.
              </Text>
            </View>
            <Switch
              value={allowViewing}
              onValueChange={togglePrivacy}
              disabled={savingPrivacy}
              trackColor={{ false: C.line, true: C.orange }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.h3}>Thành tựu</Text>
          <View style={styles.badgeGrid}>
            {BADGES.map((b) => {
              const unlocked = isUnlocked(b.id, achievementStats);
              return (
                <View key={b.title} style={[styles.badge, !unlocked && styles.badgeLocked]}>
                  {!unlocked && <Text style={styles.badgeLock}>🔒</Text>}
                  <AssetIcon source={b.emoji} size={34} style={[{ fontSize: 34, marginBottom: 6 }, !unlocked && styles.badgeDim]} />
                  <Text style={styles.badgeTitle}>{b.title}</Text>
                  <Text style={styles.badgeDesc}>{b.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BigStat({
  emoji, value, label, valueColor,
}: { emoji: any; value: string; label: string; valueColor?: string }) {
  return (
    <View style={styles.bigStat}>
      <AssetIcon source={emoji} size={26} style={{ fontSize: 26 }} />
      <Text style={[styles.bigStatValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

function PerfRow({
  icon, label, value, isLast,
}: { icon: any; label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.perfRow, isLast && { borderBottomWidth: 0 }]}>
      <AssetIcon source={icon} size={18} style={{ fontSize: 18 }} />
      <Text style={styles.perfLabel}>{label}</Text>
      <Text style={styles.perfValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  titleWrap: { alignItems: 'center', marginBottom: 8 },
  title:     { fontFamily: F.display, fontSize: 24, color: C.ink },
  subtitle:  { fontFamily: F.body, fontSize: 14, color: C.inkSlate, marginTop: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  bigStat: {
    width: '47%', flexGrow: 1, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.line, borderRadius: R.md,
    paddingVertical: 16, alignItems: 'center', gap: 2, ...shadow('#000', 1),
  },
  bigStatValue: { fontFamily: F.displayBold, fontSize: 24, color: C.ink },
  bigStatLabel: { fontFamily: F.bodyMedium, fontSize: 12, color: C.inkSlate },

  section: { paddingHorizontal: 20, marginTop: 24, gap: 12 },
  h3:      { fontFamily: F.display, fontSize: 20, color: C.ink, marginLeft: 4 },

  streakRow: { flexDirection: 'row', gap: 12 },
  streakCard: {
    flex: 1, borderRadius: R.md, borderWidth: 1, padding: 16, alignItems: 'center', gap: 2,
  },
  streakValue: { fontFamily: F.displayBold, fontSize: 30, color: C.ink },
  streakLabel: { fontFamily: F.bodyMedium, fontSize: 12, color: C.inkBrown, marginTop: 2 },

  perfCard: {
    backgroundColor: C.surface, borderRadius: R.md, overflow: 'hidden',
    borderWidth: 1, borderColor: C.line, ...shadow('#000', 1),
  },
  perfRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 15, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  perfLabel: { flex: 1, fontFamily: F.body, fontSize: 14, color: C.inkBrown },
  perfValue: { fontFamily: F.display, fontSize: 15, color: C.ink },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badge: {
    width: '47%', flexGrow: 1, backgroundColor: C.peachBg,
    borderWidth: 1, borderColor: C.peachBorder, borderRadius: R.md,
    padding: 16, alignItems: 'center',
  },
  badgeLocked: { backgroundColor: C.surfaceSunken, borderColor: C.line },
  badgeDim:    { opacity: 0.3 },
  badgeLock:   { position: 'absolute', top: 10, right: 10, fontSize: 13, opacity: 0.6 },
  badgeTitle: { fontFamily: F.display, fontSize: 13, color: C.ink },
  badgeDesc:  { fontFamily: F.body, fontSize: 11, color: C.inkBrown, marginTop: 3, textAlign: 'center' },

  privacyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.line,
    paddingVertical: 14, paddingHorizontal: 18, ...shadow('#000', 1),
  },
  privacyTextWrap: { flex: 1, gap: 3 },
  privacyLabel: { fontFamily: F.display, fontSize: 14, color: C.ink },
  privacySub:   { fontFamily: F.body, fontSize: 12, color: C.inkSlate },
});
