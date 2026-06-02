import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, Image,
} from 'react-native';
import { C, R } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { authFetch } from '../utils/authFetch';
import EditProfileModal from '../components/EditProfileModal';

interface UserStats {
  totalScore: number; totalMatches: number;
  wins: number; winRate: number; streak: number; level: number;
}

const FALLBACK: UserStats = {
  totalScore: 0, totalMatches: 0, wins: 0, winRate: 0, streak: 0, level: 1,
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [stats, setStats]               = useState<UserStats>(FALLBACK);
  const [rankingPoints, setRankingPoints] = useState(0);
  const [avatarUrl, setAvatarUrl]       = useState<string | null>(null);
  const [editVisible, setEditVisible]   = useState(false);

  const displayName = user?.user_metadata?.full_name ?? 'Người chơi';
  const initial     = displayName[0]?.toUpperCase() ?? 'M';
  const grade       = user?.user_metadata?.grade;

  useEffect(() => {
    if (!user) return;

    supabase
      .from('user_profiles')
      .select('ranking_points, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setRankingPoints(data.ranking_points);
          setAvatarUrl(data.avatar_url ?? null);
        }
      })
      .catch(() => {});

    authFetch(`${process.env.EXPO_PUBLIC_API_URL}/api/gameshow/stats/${user.id}`)
      .then((r) => r.json())
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

  const handleProfileSaved = (newName: string, newAvatarUrl: string | null) => {
    setAvatarUrl(newAvatarUrl);
    setEditVisible(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerDeco1} />
          <View style={styles.headerDeco2} />

          {/* Avatar với nút edit */}
          <TouchableOpacity
            style={styles.avatarRing}
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
          {grade && <Text style={styles.grade}>Lớp {grade}</Text>}

          <View style={styles.headerStats}>
            <HeaderStat label="Xếp Hạng" value={rankingPoints} icon="🏆" />
            <View style={styles.divider} />
            <HeaderStat label="Level" value={stats.level} icon="⭐" />
            <View style={styles.divider} />
            <HeaderStat label="Streak" value={stats.streak} icon="🔥" />
          </View>
        </View>

        {/* ── Stats grid ── */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionText}>Thống kê</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatCard icon="🎮" label="Trận chơi"   value={stats.totalMatches}            bg="#FFF3E0" iconColor={C.primary} />
          <StatCard icon="🥇" label="Thắng"       value={stats.wins}                    bg="#E8F5E9" iconColor="#4CAF50" />
          <StatCard icon="📈" label="Tỷ lệ thắng" value={`${stats.winRate?.toFixed(0) ?? 0}%`} bg="#E3F2FD" iconColor="#2196F3" />
          <StatCard icon="⭐" label="Tổng điểm"   value={stats.totalScore}              bg="#F3E5F5" iconColor="#9C27B0" />
        </View>

        {/* ── Menu ── */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionText}>Cài đặt</Text>
        </View>
        <View style={styles.menu}>
          <MenuItem icon="👤" label="Chỉnh sửa hồ sơ" onPress={() => setEditVisible(true)} />
          <MenuItem icon="💬" label="Trợ Giúp"         onPress={() => {}} />
          <MenuItem icon="📋" label="Điều Khoản"       onPress={() => {}} isLast />
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.85}>
          <Text style={styles.signOutText}>🚪  Đăng Xuất</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Edit Profile Modal ── */}
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

function HeaderStat({ label, value, icon }: { label: string; value: any; icon: string }) {
  return (
    <View style={styles.headerStatItem}>
      <Text style={styles.headerStatIcon}>{icon}</Text>
      <Text style={styles.headerStatValue}>{value}</Text>
      <Text style={styles.headerStatLabel}>{label}</Text>
    </View>
  );
}

function StatCard({
  icon, label, value, bg, iconColor,
}: { icon: string; label: string; value: any; bg: string; iconColor: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIconWrap, { backgroundColor: iconColor }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon, label, onPress, isLast,
}: { icon: string; label: string; onPress: () => void; isLast?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress} activeOpacity={0.7}
    >
      <View style={styles.menuIconWrap}><Text style={{ fontSize: 18 }}>{icon}</Text></View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  // Header
  header: {
    backgroundColor: C.primary, alignItems: 'center',
    paddingBottom: 28, paddingTop: 24,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  headerDeco1: {
    position: 'absolute', top: -50, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerDeco2: {
    position: 'absolute', bottom: -30, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 4, borderColor: C.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, position: 'relative',
  },
  avatarImg: {
    width: 84, height: 84, borderRadius: 42,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: C.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '900', color: '#7B5800' },
  editBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 28, height: 28, borderRadius: R.sm,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: C.primaryLight,
  },
  editBadgeIcon: { fontSize: 12 },
  name:  { fontSize: 22, fontWeight: '900', color: '#fff' },
  grade: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  headerStats: {
    flexDirection: 'row', marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: R.xl, paddingVertical: 14, paddingHorizontal: 8,
    width: '88%',
  },
  headerStatItem: { flex: 1, alignItems: 'center' },
  headerStatIcon:  { fontSize: 18, marginBottom: 2 },
  headerStatValue: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '700' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },

  // Stats
  sectionTitle: { paddingHorizontal: 20, marginTop: 22, marginBottom: 12 },
  sectionText:  { fontSize: 15, fontWeight: '900', color: C.textSecond },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 12,
  },
  statCard: {
    width: '47%', borderRadius: R.xl, padding: 18, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  statIconWrap: {
    width: 48, height: 48, borderRadius: R.md,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  statIcon:  { fontSize: 24 },
  statValue: { fontSize: 26, fontWeight: '900', color: C.textPrimary },
  statLabel: { fontSize: 11, color: C.textSecond, marginTop: 2, fontWeight: '700' },

  // Menu
  menu: {
    marginHorizontal: 16,
    backgroundColor: C.surface, borderRadius: R.xl, overflow: 'hidden',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    borderWidth: 1.5, borderColor: C.border,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 17, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 14,
  },
  menuIconWrap: {
    width: 38, height: 38, borderRadius: R.sm,
    backgroundColor: C.border, justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: C.textPrimary },
  menuArrow: { fontSize: 22, color: '#FFB89A' },

  // Sign out
  signOutBtn: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FFEBEE', borderRadius: R.xl,
    paddingVertical: 17, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFCDD2',
  },
  signOutText: { fontSize: 16, fontWeight: '900', color: C.error },
});
