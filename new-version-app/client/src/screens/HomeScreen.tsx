import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

const C = {
  primary:    '#3B82F6',
  deep:       '#1E40AF',
  yellow:     '#FACC15',
  softYellow: '#FDE68A',
  bg:         '#F8FBFF',
  white:      '#FFFFFF',
  text:       '#1E293B',
  textLight:  '#64748B',
  success:    '#22C55E',
  shadow:     'rgba(59,130,246,0.12)',
};

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [rankingPoints, setRankingPoints] = useState<number>(0);

  const displayName = user?.user_metadata?.full_name ?? 'Người chơi';
  const initial = displayName[0]?.toUpperCase() ?? 'M';

  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.greeting}>{greeting} 👋</Text>
              <Text style={styles.username} numberOfLines={1}>{displayName}</Text>
            </View>
            <View style={styles.rankPill}>
              <Text style={styles.rankPillLabel}>🏆</Text>
              <Text style={styles.rankPillValue}>{rankingPoints}</Text>
            </View>
          </View>
        </View>

        {/* ── Main CTA Card ── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.battleCard}
            onPress={() => navigation.navigate('GameShowTab')}
            activeOpacity={0.9}
          >
            <View style={styles.battleCardInner}>
              <Text style={styles.battleIcon}>⚔️</Text>
              <View style={styles.battleText}>
                <Text style={styles.battleTitle}>Đấu 1v1</Text>
                <Text style={styles.battleSub}>Thách đấu với người chơi khác</Text>
              </View>
              <View style={styles.battleBtn}>
                <Text style={styles.battleBtnText}>Chơi ngay</Text>
              </View>
            </View>
            <View style={styles.battleDeco1} />
            <View style={styles.battleDeco2} />
          </TouchableOpacity>
        </View>

        {/* ── Rule Banner ── */}
        <View style={styles.ruleBanner}>
          <Text style={styles.ruleTitle}>🎯 Luật xếp hạng</Text>
          <View style={styles.ruleRow}>
            <View style={[styles.rulePill, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.rulePillText, { color: '#16A34A' }]}>Thắng  +5</Text>
            </View>
            <View style={[styles.rulePill, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.rulePillText, { color: '#DC2626' }]}>Thua  −3</Text>
            </View>
            <View style={[styles.rulePill, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[styles.rulePillText, { color: '#64748B' }]}>Hoà  ±0</Text>
            </View>
          </View>
        </View>

        {/* ── Quick Nav Grid ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Khám phá</Text>
          <View style={styles.navGrid}>
            <NavCard
              icon="🏆" label="Xếp Hạng" color="#FEF9C3" iconBg="#FACC15"
              onPress={() => navigation.navigate('LeaderboardTab')}
            />
            <NavCard
              icon="📊" label="Thống Kê" color="#DBEAFE" iconBg="#3B82F6"
              onPress={() => navigation.navigate('StatsTab')}
            />
            <NavCard
              icon="👤" label="Hồ Sơ" color="#EDE9FE" iconBg="#8B5CF6"
              onPress={() => navigation.navigate('ProfileTab')}
            />
          </View>
        </View>

        {/* ── Tip Banner ── */}
        <View style={styles.tipBanner}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            Chơi mỗi ngày để tăng thứ hạng. Điểm không bao giờ xuống dưới 0!
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function NavCard({
  icon, label, color, iconBg, onPress,
}: { icon: string; label: string; color: string; iconBg: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.navCard, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.navCardIcon, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text style={styles.navCardLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  // Header
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.yellow, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: C.deep },
  headerInfo: { flex: 1 },
  greeting: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  username: { fontSize: 18, fontWeight: '800', color: '#fff' },
  rankPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, alignItems: 'center',
  },
  rankPillLabel: { fontSize: 14 },
  rankPillValue: { fontSize: 18, fontWeight: '800', color: C.yellow },

  // Section
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: C.textLight, marginBottom: 12 },

  // Battle card
  battleCard: {
    backgroundColor: C.deep,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    shadowColor: C.deep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  battleCardInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  battleIcon: { fontSize: 40 },
  battleText: { flex: 1 },
  battleTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  battleSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  battleBtn: {
    backgroundColor: C.yellow, paddingVertical: 10,
    paddingHorizontal: 16, borderRadius: 14,
  },
  battleBtnText: { fontSize: 13, fontWeight: '800', color: C.deep },
  battleDeco1: {
    position: 'absolute', right: -30, top: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  battleDeco2: {
    position: 'absolute', right: 40, bottom: -40,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  // Rule banner
  ruleBanner: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: C.white, borderRadius: 20, padding: 16,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  ruleTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 },
  ruleRow: { flexDirection: 'row', gap: 8 },
  rulePill: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  rulePillText: { fontSize: 13, fontWeight: '700' },

  // Nav grid
  navGrid: { flexDirection: 'row', gap: 12 },
  navCard: {
    flex: 1, borderRadius: 20, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  navCardIcon: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  navCardLabel: { fontSize: 12, fontWeight: '700', color: C.text },

  // Tip banner
  tipBanner: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: '#FEF9C3', borderRadius: 20,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  tipIcon: { fontSize: 24 },
  tipText: { flex: 1, fontSize: 13, color: '#78350F', lineHeight: 20 },
});
