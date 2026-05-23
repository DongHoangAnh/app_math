import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

const C = {
  primary: '#3B82F6', deep: '#1E40AF', yellow: '#FACC15',
  bg: '#F8FBFF', white: '#FFFFFF', text: '#1E293B', textLight: '#64748B',
  error: '#EF4444',
};

interface UserStats {
  totalScore: number; totalMatches: number;
  wins: number; winRate: number; streak: number; level: number;
}

const FALLBACK: UserStats = {
  totalScore: 0, totalMatches: 0, wins: 0, winRate: 0, streak: 0, level: 1,
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<UserStats>(FALLBACK);
  const [rankingPoints, setRankingPoints] = useState(0);

  const displayName = user?.user_metadata?.full_name ?? 'Người chơi';
  const initial = displayName[0]?.toUpperCase() ?? 'M';
  const grade = user?.user_metadata?.grade;

  useEffect(() => {
    if (!user) return;
    // Load ranking points from Supabase
    supabase
      .from('user_profiles')
      .select('ranking_points')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.warn('Failed to load ranking points:', error.message);
          return;
        }
        if (data) setRankingPoints(data.ranking_points);
      })
      .catch((err) => {
        console.warn('Ranking points error:', err.message);
      });

    // Load game stats from API
    fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/gameshow/stats/${user.id}`)
      .then((r) => r.json())
      .then(setStats)
      .catch((err) => {
        console.warn('Game stats error:', err.message);
      });
  }, [user]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          {grade && <Text style={styles.grade}>Lớp {grade}</Text>}

          <View style={styles.headerStats}>
            <HeaderStat label="Xếp Hạng" value={rankingPoints} icon="🏆" />
            <View style={styles.headerStatDivider} />
            <HeaderStat label="Level" value={stats.level} icon="⭐" />
            <View style={styles.headerStatDivider} />
            <HeaderStat label="Streak" value={stats.streak} icon="🔥" />
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="🎮" label="Trận chơi"    value={stats.totalMatches} color="#DBEAFE" />
          <StatCard icon="🥇" label="Chiến thắng"  value={stats.wins}         color="#DCFCE7" />
          <StatCard icon="📈" label="Tỷ lệ thắng"  value={`${stats.winRate?.toFixed(0) ?? 0}%`} color="#FEF9C3" />
          <StatCard icon="⭐" label="Tổng điểm"    value={stats.totalScore}   color="#EDE9FE" />
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          <MenuItem icon="⚙️"  label="Cài Đặt"           onPress={() => {}} />
          <MenuItem icon="❓"  label="Trợ Giúp"           onPress={() => {}} />
          <MenuItem icon="📜"  label="Điều Khoản"         onPress={() => {}} isLast />
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.85}>
          <Text style={styles.signOutText}>Đăng Xuất</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function HeaderStat({ label, value, icon }: { label: string; value: any; icon: string }) {
  return (
    <View style={styles.headerStatItem}>
      <Text style={styles.headerStatIcon}>{icon}</Text>
      <Text style={styles.headerStatValue}>{value}</Text>
      <Text style={styles.headerStatLabel}>{label}</Text>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: any; color: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress, isLast }: {
  icon: string; label: string; onPress: () => void; isLast?: boolean
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress} activeOpacity={0.7}
    >
      <View style={styles.menuIcon}><Text style={{ fontSize: 18 }}>{icon}</Text></View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.primary, alignItems: 'center',
    paddingBottom: 28, paddingTop: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: C.yellow,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.yellow, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 34, fontWeight: '900', color: C.deep },
  name: { fontSize: 22, fontWeight: '900', color: '#fff' },
  grade: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  headerStats: {
    flexDirection: 'row', marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingVertical: 12, paddingHorizontal: 8,
    width: '88%',
  },
  headerStatItem: { flex: 1, alignItems: 'center' },
  headerStatIcon: { fontSize: 18, marginBottom: 2 },
  headerStatValue: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingTop: 20, gap: 10,
  },
  statCard: {
    width: '47%', borderRadius: 20, padding: 18, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statIcon: { fontSize: 26, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: '900', color: C.text },
  statLabel: { fontSize: 11, color: C.textLight, marginTop: 2, fontWeight: '600' },

  menu: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: C.white, borderRadius: 20, overflow: 'hidden',
    shadowColor: 'rgba(59,130,246,0.08)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 14,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F8FBFF', justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  menuArrow: { fontSize: 22, color: '#CBD5E1' },

  signOutBtn: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FEE2E2', borderRadius: 20,
    paddingVertical: 16, alignItems: 'center',
  },
  signOutText: { fontSize: 16, fontWeight: '800', color: C.error },
});
