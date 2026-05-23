import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';

const C = {
  primary: '#3B82F6', deep: '#1E40AF', yellow: '#FACC15',
  bg: '#F8FBFF', white: '#FFFFFF', text: '#1E293B', textLight: '#64748B',
  success: '#22C55E',
};

interface Stats {
  totalMatches: number; totalWins: number; winRate: number;
  totalScore: number; averageScore: number; bestStreak: number;
  currentStreak: number; level: number; nextLevelProgress: number;
}

const FALLBACK: Stats = {
  totalMatches: 0, totalWins: 0, winRate: 0,
  totalScore: 0, averageScore: 0, bestStreak: 0,
  currentStreak: 0, level: 1, nextLevelProgress: 0,
};

export default function StatisticsScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>(FALLBACK);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/gameshow/stats/${user.id}`)
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
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
          <Text style={styles.headerTitle}>Thống Kê</Text>
          <Text style={styles.headerSub}>Tổng quan hiệu suất của bạn</Text>
        </View>

        {/* Main 4 stats */}
        <View style={styles.bigGrid}>
          <BigStat icon="🎮" value={stats.totalMatches} label="Trận chơi" color="#DBEAFE" />
          <BigStat icon="🥇" value={stats.totalWins}    label="Chiến thắng" color="#DCFCE7" />
          <BigStat icon="📈" value={`${stats.winRate.toFixed(1)}%`} label="Tỷ lệ thắng" color="#FEF9C3" />
          <BigStat icon="⭐" value={stats.totalScore}   label="Tổng điểm" color="#EDE9FE" />
        </View>

        {/* Streak cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streak</Text>
          <View style={styles.streakRow}>
            <View style={[styles.streakCard, { backgroundColor: '#FFF7ED' }]}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakValue}>{stats.currentStreak}</Text>
              <Text style={styles.streakLabel}>Hiện tại</Text>
            </View>
            <View style={[styles.streakCard, { backgroundColor: '#FEF9C3' }]}>
              <Text style={styles.streakIcon}>⚡</Text>
              <Text style={styles.streakValue}>{stats.bestStreak}</Text>
              <Text style={styles.streakLabel}>Tốt nhất</Text>
            </View>
          </View>
        </View>

        {/* Level & XP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cấp độ</Text>
          <View style={styles.levelCard}>
            <View style={styles.levelTop}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelNum}>{stats.level}</Text>
              </View>
              <View>
                <Text style={styles.levelTitle}>Level {stats.level}</Text>
                <Text style={styles.levelSub}>Tiến tới Level {stats.level + 1}</Text>
              </View>
              <Text style={styles.levelPct}>{stats.nextLevelProgress}%</Text>
            </View>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${Math.min(stats.nextLevelProgress, 100)}%` as any }]} />
            </View>
          </View>
        </View>

        {/* Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hiệu suất</Text>
          <View style={styles.perfCard}>
            <PerfRow icon="📊" label="Điểm trung bình / trận" value={`${stats.averageScore}`} />
            <PerfRow icon="🎯" label="Tỷ lệ trả lời đúng" value="—" />
            <PerfRow icon="⏱️" label="Trung bình mỗi trận" value="—" isLast />
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thành tựu</Text>
          <View style={styles.badgeGrid}>
            {BADGES.map((b) => (
              <View key={b.title} style={styles.badge}>
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

const BADGES = [
  { emoji: '🌟', title: 'Bắt Đầu',  desc: 'Trận đầu tiên' },
  { emoji: '🔥', title: 'Nóng Lên', desc: '5 trận thắng liên tiếp' },
  { emoji: '🏅', title: 'Nhân Phẩm', desc: 'Đạt 50 điểm xếp hạng' },
  { emoji: '💎', title: 'Kim Cương', desc: 'Level 10' },
];

function BigStat({ icon, value, label, color }: { icon: string; value: any; label: string; color: string }) {
  return (
    <View style={[styles.bigStat, { backgroundColor: color }]}>
      <Text style={styles.bigStatIcon}>{icon}</Text>
      <Text style={styles.bigStatValue}>{value}</Text>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

function PerfRow({ icon, label, value, isLast }: { icon: string; label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.perfRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.perfIcon}>{icon}</Text>
      <Text style={styles.perfLabel}>{label}</Text>
      <Text style={styles.perfValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.primary, paddingVertical: 20, paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  bigGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingTop: 20, gap: 10,
  },
  bigStat: {
    width: '47%', borderRadius: 20, padding: 18, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  bigStatIcon: { fontSize: 28, marginBottom: 6 },
  bigStatValue: { fontSize: 28, fontWeight: '900', color: C.text },
  bigStatLabel: { fontSize: 12, color: C.textLight, marginTop: 2, fontWeight: '600' },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 12 },

  streakRow: { flexDirection: 'row', gap: 12 },
  streakCard: {
    flex: 1, borderRadius: 20, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  streakIcon: { fontSize: 32, marginBottom: 6 },
  streakValue: { fontSize: 36, fontWeight: '900', color: C.text },
  streakLabel: { fontSize: 12, color: C.textLight, fontWeight: '600', marginTop: 4 },

  levelCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 20,
    shadowColor: 'rgba(59,130,246,0.1)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  levelTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  levelBadge: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
  },
  levelNum: { fontSize: 22, fontWeight: '900', color: '#fff' },
  levelTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  levelSub: { fontSize: 12, color: C.textLight },
  levelPct: { marginLeft: 'auto' as any, fontSize: 20, fontWeight: '800', color: C.primary },
  xpBar: {
    height: 10, backgroundColor: '#EFF6FF', borderRadius: 5, overflow: 'hidden',
  },
  xpFill: { height: '100%', backgroundColor: C.primary, borderRadius: 5 },

  perfCard: {
    backgroundColor: C.white, borderRadius: 20, overflow: 'hidden',
    shadowColor: 'rgba(59,130,246,0.08)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  perfRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12,
  },
  perfIcon: { fontSize: 18 },
  perfLabel: { flex: 1, fontSize: 14, color: C.textLight },
  perfValue: { fontSize: 15, fontWeight: '700', color: C.text },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: {
    width: '47%', backgroundColor: C.white, borderRadius: 16,
    padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  badgeEmoji: { fontSize: 32, marginBottom: 6 },
  badgeTitle: { fontSize: 13, fontWeight: '800', color: C.text },
  badgeDesc: { fontSize: 11, color: C.textLight, marginTop: 2, textAlign: 'center' },
});
