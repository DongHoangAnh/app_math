import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { useDailyTasks, type DailyTask } from '../hooks/useDailyTasks';
import { LevelBadge } from '../components/LevelBadge';
import { getLevelProgress } from '../utils/levelUtils';

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
  const [userExp, setUserExp] = useState<number>(0);
  const [userLevel, setUserLevel] = useState<number>(1);

  const displayName = user?.user_metadata?.full_name ?? 'Bạn';
  const initial = displayName[0]?.toUpperCase() ?? 'B';

  const { tasks, loading: tasksLoading, claiming, claimExp, refetch: refetchTasks } =
    useDailyTasks(user?.id ?? null, displayName);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_profiles')
      .select('ranking_points,exp,level')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setRankingPoints(data.ranking_points ?? 0);
          setUserExp(data.exp ?? 0);
          setUserLevel(data.level ?? 1);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleClaim = async (task: DailyTask) => {
    if (!task.completed || task.exp_claimed || claiming) return;
    const result = await claimExp(task.task_key);
    if (result) {
      setUserExp(result.exp);
      setUserLevel(result.level);
      Alert.alert('🎉 Nhận thưởng!', `+${task.exp_reward} EXP\nLevel ${result.level} · ${result.exp} EXP tổng`);
    }
  };

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

        {/* ── Daily Tasks ── */}
        <View style={styles.section}>
          <View style={styles.dailyHeader}>
            <Text style={styles.sectionLabel}>Nhiệm vụ hôm nay</Text>
            <LevelBadge level={userLevel} size="sm" />
          </View>

          {/* EXP progress bar */}
          {(() => {
            const lp = getLevelProgress(userExp);
            return (
              <View style={styles.expBarWrap}>
                <View style={styles.expBarBg}>
                  <View style={[styles.expBarFill, { width: `${lp.percent}%` as any }]} />
                </View>
                <Text style={styles.expBarLabel}>{lp.expInLevel} / {lp.expForNext} EXP</Text>
              </View>
            );
          })()}

          {tasksLoading && tasks.length === 0 ? (
            <View style={styles.tasksPlaceholder}>
              <Text style={styles.tasksPlaceholderText}>Đang tải nhiệm vụ...</Text>
            </View>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.task_key}
                task={task}
                claiming={claiming === task.task_key}
                onClaim={() => handleClaim(task)}
              />
            ))
          )}
        </View>

        {/* ── Tip Banner ── */}
        <View style={styles.tipBanner}>
          <Text style={styles.tipEmoji}>💡</Text>
          <Text style={styles.tipText}>Hoàn thành nhiệm vụ mỗi ngày để tích EXP và lên cấp!</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskRow({
  task, claiming, onClaim,
}: { task: DailyTask; claiming: boolean; onClaim: () => void }) {
  const pct = task.target > 0 ? Math.min(task.progress / task.target, 1) : 0;
  const canClaim = task.completed && !task.exp_claimed;

  return (
    <View style={styles.taskRow}>
      <View style={styles.taskInfo}>
        <View style={styles.taskTitleRow}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskExp}>+{task.exp_reward} EXP</Text>
        </View>
        <Text style={styles.taskDesc}>{task.description}</Text>
        <View style={styles.taskProgBarBg}>
          <View style={[styles.taskProgBarFill, { width: `${pct * 100}%` as any, backgroundColor: task.completed ? C.success : C.primary }]} />
        </View>
        <Text style={styles.taskProgText}>{task.progress}/{task.target}</Text>
      </View>
      {canClaim ? (
        <TouchableOpacity
          style={[styles.claimBtn, claiming && styles.claimBtnDisabled]}
          onPress={onClaim}
          disabled={claiming}
          activeOpacity={0.8}
        >
          <Text style={styles.claimBtnText}>{claiming ? '...' : 'Nhận'}</Text>
        </TouchableOpacity>
      ) : task.exp_claimed ? (
        <View style={styles.claimedBadge}>
          <Text style={styles.claimedText}>✓</Text>
        </View>
      ) : null}
    </View>
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

  // Daily tasks
  dailyHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  expPill: {
    backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  expPillText:    { fontSize: 12, fontWeight: '800', color: '#2E7D32' },
  expBarWrap:     { marginBottom: 12 },
  expBarBg: {
    height: 8, backgroundColor: '#EEE', borderRadius: 4, overflow: 'hidden', marginBottom: 3,
  },
  expBarFill:     { height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 },
  expBarLabel:    { fontSize: 11, color: C.textLight, fontWeight: '600', textAlign: 'right' },
  tasksPlaceholder: { paddingVertical: 20, alignItems: 'center' },
  tasksPlaceholderText: { color: C.textLight, fontSize: 13 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 18, padding: 14,
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  taskInfo:       { flex: 1 },
  taskTitleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  taskTitle:      { fontSize: 14, fontWeight: '800', color: C.text },
  taskExp:        { fontSize: 12, fontWeight: '700', color: C.primary },
  taskDesc:       { fontSize: 12, color: C.textLight, marginBottom: 6 },
  taskProgBarBg: {
    height: 5, backgroundColor: '#EEE', borderRadius: 3, overflow: 'hidden', marginBottom: 3,
  },
  taskProgBarFill:{ height: '100%', borderRadius: 3 },
  taskProgText:   { fontSize: 11, color: C.textLight, fontWeight: '600' },
  claimBtn: {
    marginLeft: 12, backgroundColor: C.primary,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  claimBtnDisabled: { opacity: 0.5 },
  claimBtnText:   { fontSize: 13, fontWeight: '900', color: '#fff' },
  claimedBadge: {
    marginLeft: 12, width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center',
  },
  claimedText:    { fontSize: 14, color: C.success, fontWeight: '900' },

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
