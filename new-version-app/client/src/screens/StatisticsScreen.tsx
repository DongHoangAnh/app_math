import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { C, R } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { LevelCard } from '../components/LevelBadge';

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

const BADGES = [
  { emoji: '🌟', title: 'Bắt Đầu',  desc: 'Trận đầu tiên',           color: '#FFF9C4' },
  { emoji: '🔥', title: 'Nóng Lên', desc: '5 trận thắng liên tiếp',   color: C.primaryBg },
  { emoji: '🏅', title: 'Nhân Phẩm', desc: 'Đạt 50 điểm xếp hạng',   color: '#E8F5E9' },
  { emoji: '💎', title: 'Kim Cương', desc: 'Level 10',                 color: '#E3F2FD' },
];

export default function StatisticsScreen() {
  const { user } = useAuth();
  const [stats, setStats]   = useState<Stats>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [userExp, setUserExp] = useState(0);
  const [userLevel, setUserLevel] = useState(1);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/gameshow/stats/${user.id}`)
      .then((r) => r.json())
      .then((data) => setStats({ ...FALLBACK, ...data }))
      .catch(() => {})
      .finally(() => setLoading(false));

    supabase
      .from('user_profiles')
      .select('exp,level')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUserExp(data.exp ?? 0);
          setUserLevel(data.level ?? 1);
        }
      })
      .catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerDeco} />
          <Text style={styles.headerTitle}>📈 Thống Kê</Text>
          <Text style={styles.headerSub}>Tổng quan hiệu suất của bạn</Text>
        </View>

        {/* Main stats 2x2 */}
        <View style={styles.bigGrid}>
          <BigStat icon="🎮" value={stats.totalMatches}              label="Trận chơi"    bg="#FFF3E0" iconBg={C.primary} />
          <BigStat icon="🥇" value={stats.totalWins}                 label="Chiến thắng"  bg="#E8F5E9" iconBg="#4CAF50" />
          <BigStat icon="📈" value={`${stats.winRate.toFixed(1)}%`}  label="Tỷ lệ thắng"  bg="#E3F2FD" iconBg="#2196F3" />
          <BigStat icon="⭐" value={stats.totalScore}                label="Tổng điểm"    bg="#F3E5F5" iconBg="#9C27B0" />
        </View>

        {/* Streak section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chuỗi thắng</Text>
          <View style={styles.streakRow}>
            <View style={[styles.streakCard, { backgroundColor: C.primaryBg }]}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakValue}>{stats.currentStreak}</Text>
              <Text style={styles.streakLabel}>Hiện tại</Text>
            </View>
            <View style={[styles.streakCard, { backgroundColor: '#FFF9C4' }]}>
              <Text style={styles.streakIcon}>⚡</Text>
              <Text style={styles.streakValue}>{stats.bestStreak}</Text>
              <Text style={styles.streakLabel}>Tốt nhất</Text>
            </View>
          </View>
        </View>

        {/* Level section — QQ-style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cấp độ</Text>
          <LevelCard level={userLevel} totalExp={userExp} />
        </View>

        {/* Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hiệu suất</Text>
          <View style={styles.perfCard}>
            <PerfRow icon="🔢" label="Điểm TB / trận" value={`${stats.averageScore}`} />
            <PerfRow icon="🎯" label="Tỷ lệ trả lời đúng" value={stats.totalMatches > 0 ? `${stats.accuracyRate.toFixed(1)}%` : '—'} />
            <PerfRow icon="⏱️" label="Trung bình / trận" value={stats.totalMatches > 0 ? `${stats.avgTimePerMatch.toFixed(1)}s` : '—'} isLast />
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thành tựu</Text>
          <View style={styles.badgeGrid}>
            {BADGES.map((b) => (
              <View key={b.title} style={[styles.badge, { backgroundColor: b.color }]}>
                <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                <Text style={styles.badgeTitle}>{b.title}</Text>
                <Text style={styles.badgeDesc}>{b.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function BigStat({
  icon, value, label, bg, iconBg,
}: { icon: string; value: any; label: string; bg: string; iconBg: string }) {
  return (
    <View style={[styles.bigStat, { backgroundColor: bg }]}>
      <View style={[styles.bigStatIconWrap, { backgroundColor: iconBg }]}>
        <Text style={styles.bigStatIcon}>{icon}</Text>
      </View>
      <Text style={styles.bigStatValue}>{value}</Text>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

function PerfRow({
  icon, label, value, isLast,
}: { icon: string; label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.perfRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.perfIcon}>{icon}</Text>
      <Text style={styles.perfLabel}>{label}</Text>
      <Text style={styles.perfValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  header: {
    backgroundColor: C.primary,
    paddingVertical: 22, paddingHorizontal: 20,
    alignItems: 'center', overflow: 'hidden',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerDeco: {
    position: 'absolute', top: -50, right: -50,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '600' },

  bigGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingTop: 20, gap: 12,
  },
  bigStat: {
    width: '47%', borderRadius: R.xl, padding: 18, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  bigStatIconWrap: {
    width: 52, height: 52, borderRadius: R.md,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  bigStatIcon:  { fontSize: 26 },
  bigStatValue: { fontSize: 28, fontWeight: '900', color: C.textPrimary },
  bigStatLabel: { fontSize: 12, color: C.textSecond, marginTop: 2, fontWeight: '700' },

  section:      { paddingHorizontal: 16, marginTop: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: C.textPrimary, marginBottom: 14 },

  streakRow: { flexDirection: 'row', gap: 12 },
  streakCard: {
    flex: 1, borderRadius: R.xl, padding: 22, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  streakIcon:  { fontSize: 36, marginBottom: 6 },
  streakValue: { fontSize: 40, fontWeight: '900', color: C.textPrimary },
  streakLabel: { fontSize: 12, color: C.textSecond, fontWeight: '700', marginTop: 4 },


  perfCard: {
    backgroundColor: C.surface, borderRadius: R.xl, overflow: 'hidden',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    borderWidth: 1.5, borderColor: C.border,
  },
  perfRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
  },
  perfIcon:  { fontSize: 18 },
  perfLabel: { flex: 1, fontSize: 14, color: C.textSecond, fontWeight: '600' },
  perfValue: { fontSize: 15, fontWeight: '800', color: C.textPrimary },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badge: {
    width: '47%', borderRadius: R.lg, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  badgeEmoji: { fontSize: 36, marginBottom: 8 },
  badgeTitle: { fontSize: 13, fontWeight: '900', color: C.textPrimary },
  badgeDesc:  { fontSize: 11, color: C.textSecond, marginTop: 3, textAlign: 'center' },
});
