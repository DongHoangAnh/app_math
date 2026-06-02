import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

const C = {
  primary:     '#FF6B35',
  primaryDark: '#E85D28',
  secondary:   '#FFD23F',
  bg:          '#FFF8F2',
  card:        '#FFFFFF',
  text:        '#2C1810',
  textLight:   '#8B7B74',
  success:     '#4CAF50',
  error:       '#FF4444',
  teal:        '#00BCD4',
};

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [rankingPoints, setRankingPoints] = useState<number>(0);

  const displayName = user?.user_metadata?.full_name ?? 'Bạn';
  const initial = displayName[0]?.toUpperCase() ?? 'B';

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_profiles')
      .select('ranking_points')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setRankingPoints(data.ranking_points); })
      .catch(() => {});
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng ☀️' : hour < 18 ? 'Chào buổi chiều 🌤️' : 'Chào buổi tối 🌙';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerDeco1} />
          <View style={styles.headerDeco2} />

          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.username} numberOfLines={1}>{displayName}</Text>
            </View>
            <View style={styles.rankPill}>
              <Text style={styles.rankPillIcon}>🏆</Text>
              <Text style={styles.rankPillValue}>{rankingPoints}</Text>
            </View>
          </View>

          {/* Points display */}
          <View style={styles.pointsRow}>
            <View style={styles.pointCard}>
              <Text style={styles.pointIcon}>⭐</Text>
              <Text style={styles.pointValue}>{rankingPoints}</Text>
              <Text style={styles.pointLabel}>Điểm</Text>
            </View>
            <View style={styles.pointDivider} />
            <View style={styles.pointCard}>
              <Text style={styles.pointIcon}>🔥</Text>
              <Text style={styles.pointValue}>0</Text>
              <Text style={styles.pointLabel}>Streak</Text>
            </View>
            <View style={styles.pointDivider} />
            <View style={styles.pointCard}>
              <Text style={styles.pointIcon}>🎯</Text>
              <Text style={styles.pointValue}>—</Text>
              <Text style={styles.pointLabel}>Thắng</Text>
            </View>
          </View>
        </View>

        {/* ── Main Battle Button ── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.battleCard}
            onPress={() => navigation.navigate('GameShowTab')}
            activeOpacity={0.92}
          >
            <View style={styles.battleDeco1} />
            <View style={styles.battleDeco2} />
            <View style={styles.battleInner}>
              <View style={styles.battleIconWrap}>
                <Text style={styles.battleIcon}>🎮</Text>
              </View>
              <View style={styles.battleText}>
                <Text style={styles.battleTitle}>Đấu 1v1</Text>
                <Text style={styles.battleSub}>Thách đấu trực tiếp · 10 câu hỏi</Text>
              </View>
              <View style={styles.playBtn}>
                <Text style={styles.playBtnText}>Chơi</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Rule Chips ── */}
        <View style={styles.ruleRow}>
          <View style={[styles.ruleChip, { backgroundColor: '#E8F5E9' }]}>
            <Text style={[styles.ruleChipText, { color: '#2E7D32' }]}>🏅 Thắng +5</Text>
          </View>
          <View style={[styles.ruleChip, { backgroundColor: '#FFEBEE' }]}>
            <Text style={[styles.ruleChipText, { color: '#C62828' }]}>💔 Thua −3</Text>
          </View>
          <View style={[styles.ruleChip, { backgroundColor: '#F5F5F5' }]}>
            <Text style={[styles.ruleChipText, { color: '#616161' }]}>🤝 Hoà ±0</Text>
          </View>
        </View>

        {/* ── Explore Grid ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Khám phá</Text>
          <View style={styles.navGrid}>
            <NavCard
              icon="🏆" label="Xếp Hạng" bg="#FFF3E0" iconBg={C.primary}
              onPress={() => navigation.navigate('LeaderboardTab')}
            />
            <NavCard
              icon="📈" label="Thống Kê" bg="#E3F2FD" iconBg="#2196F3"
              onPress={() => navigation.navigate('StatsTab')}
            />
            <NavCard
              icon="😊" label="Hồ Sơ" bg="#F3E5F5" iconBg="#9C27B0"
              onPress={() => navigation.navigate('ProfileTab')}
            />
          </View>
        </View>

        {/* ── Tip Banner ── */}
        <View style={styles.tipBanner}>
          <Text style={styles.tipEmoji}>💡</Text>
          <Text style={styles.tipText}>Chơi mỗi ngày để leo hạng. Điểm luôn ≥ 0!</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function NavCard({
  icon, label, bg, iconBg, onPress,
}: { icon: string; label: string; bg: string; iconBg: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.navCard, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.navCardIcon, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text style={styles.navCardLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  // Header
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerDeco1: {
    position: 'absolute', top: -40, right: -40,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerDeco2: {
    position: 'absolute', bottom: -20, left: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.secondary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText:  { fontSize: 22, fontWeight: '900', color: '#7B5800' },
  headerInfo:  { flex: 1 },
  greeting:    { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  username:    { fontSize: 19, fontWeight: '900', color: '#fff' },
  rankPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 18, alignItems: 'center',
  },
  rankPillIcon:  { fontSize: 14 },
  rankPillValue: { fontSize: 16, fontWeight: '900', color: C.secondary },

  // Points row
  pointsRow: {
    flexDirection: 'row', marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingVertical: 14,
  },
  pointCard:   { flex: 1, alignItems: 'center' },
  pointIcon:   { fontSize: 20, marginBottom: 2 },
  pointValue:  { fontSize: 20, fontWeight: '900', color: '#fff' },
  pointLabel:  { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 1 },
  pointDivider:{ width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },

  // Section
  section:      { paddingHorizontal: 20, marginTop: 24 },
  sectionLabel: { fontSize: 15, fontWeight: '800', color: C.textLight, marginBottom: 12 },

  // Battle card
  battleCard: {
    backgroundColor: '#2C1810',
    borderRadius: 28, padding: 22, overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  battleDeco1: {
    position: 'absolute', right: -30, top: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,107,53,0.15)',
  },
  battleDeco2: {
    position: 'absolute', right: 50, bottom: -40,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,210,63,0.1)',
  },
  battleInner:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  battleIconWrap: {
    width: 58, height: 58, borderRadius: 18,
    backgroundColor: 'rgba(255,107,53,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  battleIcon:   { fontSize: 30 },
  battleText:   { flex: 1 },
  battleTitle:  { fontSize: 24, fontWeight: '900', color: '#fff' },
  battleSub:    { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  playBtn: {
    backgroundColor: C.primary, paddingVertical: 12,
    paddingHorizontal: 20, borderRadius: 16,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  playBtnText: { fontSize: 14, fontWeight: '900', color: '#fff' },

  // Rule chips
  ruleRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, marginTop: 16,
  },
  ruleChip: {
    flex: 1, paddingVertical: 8, borderRadius: 14, alignItems: 'center',
  },
  ruleChipText: { fontSize: 12, fontWeight: '800' },

  // Nav grid
  navGrid:     { flexDirection: 'row', gap: 12 },
  navCard: {
    flex: 1, borderRadius: 22, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  navCardIcon: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  navCardLabel: { fontSize: 12, fontWeight: '800', color: C.text },

  // Tip banner
  tipBanner: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: '#FFF9C4',
    borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#FFE082',
  },
  tipEmoji: { fontSize: 22 },
  tipText:  { flex: 1, fontSize: 13, color: '#6D4C00', lineHeight: 20, fontWeight: '600' },
});
