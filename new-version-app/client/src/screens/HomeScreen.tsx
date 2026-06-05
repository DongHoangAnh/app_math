import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Alert,
} from 'react-native';
import { C, R, F, shadow, hardShadow } from '../theme';
import { Tactile, ProgressBar } from '../components/ui';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { useDailyTasks, type DailyTask } from '../hooks/useDailyTasks';
import { gameApi } from '../services/api';
import { getLevelProgress } from '../utils/levelUtils';
import { ASSETS } from '../assets';

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [rankingPoints, setRankingPoints] = useState<number>(0);
  const [userExp, setUserExp] = useState<number>(0);
  const [userLevel, setUserLevel] = useState<number>(1);
  const [streak, setStreak] = useState<number>(0);
  const [wins, setWins] = useState<number | null>(null);

  const displayName = user?.user_metadata?.full_name ?? 'Bạn';
  const initial = displayName[0]?.toUpperCase() ?? 'B';

  const { tasks, loading: tasksLoading, claiming, claimExp } =
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
      }, () => {});

    gameApi.getStats(user.id)
      .then((data) => {
        setStreak(data.currentStreak ?? 0);
        setWins(data.totalWins ?? 0);
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
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const greetingEmoji = hour < 12 ? ASSETS.home.greetMorning : hour < 18 ? ASSETS.home.greetNoon : ASSETS.home.greetNight;

  const lp = getLevelProgress(userExp);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top app bar ── */}
      <View style={styles.topbar}>
        <View style={styles.brandRow}>
          <View style={styles.brandAvatar}>
            <Text style={styles.brandAvatarText}>{initial}</Text>
          </View>
          <Text style={styles.wordmark}>MathUp</Text>
        </View>
        <View style={styles.pointsPill}>
          <Text style={styles.pointsPillIcon}>{ASSETS.home.points}</Text>
          <Text style={styles.pointsPillValue}>{rankingPoints.toLocaleString()} pts</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 24 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero greeting card ── */}
        <View style={[styles.hero, hardShadow(C.orange, 8, 0.3)]}>
          <View style={styles.heroDots} />
          <Text style={[styles.heroGlyph, { right: '6%', top: '8%', fontSize: 64 }]}>÷</Text>
          <Text style={[styles.heroGlyph, { right: '32%', top: '46%', fontSize: 40 }]}>×</Text>
          <View style={styles.heroGreetRow}>
            <Text style={styles.heroGreet}>{greeting}</Text>
            <Text style={{ fontSize: 18 }}>{greetingEmoji}</Text>
          </View>
          <Text style={styles.heroName} numberOfLines={1}>{displayName}</Text>
        </View>

        {/* ── 3 metrics ── */}
        <View style={styles.statRow}>
          <StatBadge emoji={ASSETS.home.score} label="ĐIỂM" value={rankingPoints.toLocaleString()} />
          <StatBadge emoji={ASSETS.home.streak} label="STREAK" value={`${streak}`} />
          <StatBadge emoji={ASSETS.home.target} label="THẮNG" value={wins != null ? `${wins}` : '—'} />
        </View>

        {/* ── Battle CTA (navy "game" surface) ── */}
        <Tactile
          slabColor="#0A0F1C"
          depth={8}
          radius={R.xl}
          onPress={() => navigation.navigate('GameShowTab')}
          style={styles.battleFace}
          accessibilityLabel="Đấu 1v1"
        >
          <Text style={[styles.heroGlyph, { color: '#fff', opacity: 0.05, left: '4%', top: '6%', fontSize: 70 }]}>∑</Text>
          <Text style={[styles.heroGlyph, { color: '#fff', opacity: 0.05, left: '40%', bottom: '8%', fontSize: 48 }]}>√</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.battleTitle}>Đấu 1v1</Text>
            <Text style={styles.battleSub}>Tìm đối thủ ngang sức ngay!</Text>
          </View>
          <View style={styles.battleBolt}>
            <Text style={{ fontSize: 30 }}>{ASSETS.home.bolt}</Text>
          </View>
        </Tactile>

        {/* ── Rule chips ── */}
        <View style={styles.ruleRow}>
          <View style={[styles.ruleChip, { backgroundColor: '#E7F6E8' }]}>
            <Text style={[styles.ruleChipText, { color: C.successDeep }]}>{`${ASSETS.home.win} Thắng +5`}</Text>
          </View>
          <View style={[styles.ruleChip, { backgroundColor: C.errorSoft }]}>
            <Text style={[styles.ruleChipText, { color: C.error }]}>{`${ASSETS.home.lose} Thua −3`}</Text>
          </View>
          <View style={[styles.ruleChip, { backgroundColor: C.surfaceSunken }]}>
            <Text style={[styles.ruleChipText, { color: C.inkSlate }]}>{`${ASSETS.home.draw} Hoà ±0`}</Text>
          </View>
        </View>

        {/* ── Explore ── */}
        <View style={{ gap: 12 }}>
          <Text style={styles.h3}>Khám phá</Text>
          <View style={styles.navGrid}>
            <NavCard emoji={ASSETS.home.navRank} label="Xếp Hạng" onPress={() => navigation.navigate('LeaderboardTab')} />
            <NavCard emoji={ASSETS.home.navStats} label="Thống Kê" onPress={() => navigation.navigate('StatsTab')} />
            <NavCard emoji={ASSETS.home.navProfile} label="Hồ Sơ" onPress={() => navigation.navigate('ProfileTab')} />
          </View>
        </View>

        {/* ── Daily tasks ── */}
        <View style={{ gap: 14 }}>
          <Text style={styles.h3}>Nhiệm vụ hàng ngày</Text>

          {/* level progress card */}
          <View style={styles.levelCard}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{userLevel}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.levelTopRow}>
                <Text style={styles.levelLabel}>Cấp {userLevel}</Text>
                <Text style={styles.levelXp}>{lp.expInLevel} / {lp.expForNext} XP</Text>
              </View>
              <ProgressBar pct={lp.percent} />
            </View>
          </View>

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
          <Text style={styles.tipEmoji}>{ASSETS.home.tip}</Text>
          <Text style={styles.tipText}>Hoàn thành nhiệm vụ mỗi ngày để tích EXP và lên cấp!</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBadge({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={styles.statBadge}>
      <Text style={{ fontSize: 22, lineHeight: 26 }}>{emoji}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function NavCard({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.navCard} onPress={onPress} activeOpacity={0.85}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <Text style={styles.navCardLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TaskRow({
  task, claiming, onClaim,
}: { task: DailyTask; claiming: boolean; onClaim: () => void }) {
  const canClaim = task.completed && !task.exp_claimed;
  const done = task.exp_claimed;

  return (
    <View style={[styles.taskRow, done && styles.taskRowDone]}>
      <View style={[styles.taskIcon, { backgroundColor: done ? C.line : C.successBright }]}>
        <Text style={{ fontSize: 18, color: done ? C.inkSlate : C.successDeep }}>
          {done ? '✓' : task.completed ? ASSETS.home.target : ASSETS.home.bolt}
        </Text>
      </View>
      <View style={styles.taskInfo}>
        <View style={styles.taskTitleRow}>
          <Text style={[styles.taskTitle, done && { textDecorationLine: 'line-through', color: C.inkSlate }]}>
            {task.title}
          </Text>
          <Text style={styles.taskExp}>+{task.exp_reward} EXP</Text>
        </View>
        <Text style={styles.taskSub}>{task.progress}/{task.target} hoàn thành</Text>
      </View>
      {canClaim ? (
        <TouchableOpacity
          style={[styles.claimBtn, claiming && { opacity: 0.5 }]}
          onPress={onClaim}
          disabled={claiming}
          activeOpacity={0.85}
        >
          <Text style={styles.claimBtnText}>{claiming ? '...' : 'Nhận'}</Text>
        </TouchableOpacity>
      ) : done ? (
        <View style={styles.taskCheck}>
          <Text style={{ fontSize: 16, color: '#fff' }}>✓</Text>
        </View>
      ) : (
        <View style={styles.taskCheckEmpty} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  // Top app bar
  topbar: {
    height: 64, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bg, ...shadow('#000', 1),
  },
  brandRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandAvatar: {
    width: 40, height: 40, borderRadius: R.pill,
    backgroundColor: C.peachBg, borderWidth: 2, borderColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
  },
  brandAvatarText: { fontFamily: F.displayBold, fontSize: 18, color: C.orangeDark },
  wordmark:    { fontFamily: F.display, fontSize: 20, color: C.orangeDark },
  pointsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.peachBg, borderRadius: R.pill,
    paddingHorizontal: 14, paddingVertical: 7, ...shadow('#000', 1),
  },
  pointsPillIcon:  { fontSize: 14 },
  pointsPillValue: { fontFamily: F.display, fontSize: 14, color: C.orange },

  // Hero greeting card
  hero: {
    position: 'relative', overflow: 'hidden', borderRadius: R.xl,
    backgroundColor: C.orange, padding: 18, minHeight: 132,
    justifyContent: 'flex-end',
  },
  heroDots: { ...StyleSheet.absoluteFillObject, opacity: 0.12 },
  heroGlyph: {
    position: 'absolute', fontFamily: F.displayBold,
    color: '#fff', opacity: 0.2,
  },
  heroGreetRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroGreet: { fontFamily: F.body, fontSize: 16, color: C.orangeDeepest },
  heroName:  { fontFamily: F.display, fontSize: 24, color: '#fff', marginTop: 4 },

  // Stat badges
  statRow: { flexDirection: 'row', gap: 12 },
  statBadge: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: R.md, paddingVertical: 14, paddingHorizontal: 8,
    alignItems: 'center', gap: 2, ...shadow('#000', 1),
  },
  statLabel: { fontFamily: F.bodyMedium, fontSize: 11, letterSpacing: 0.8, color: C.inkSlate, marginTop: 2 },
  statValue: { fontFamily: F.displayBold, fontSize: 18, color: C.ink },

  // Battle CTA
  battleFace: {
    backgroundColor: C.navy, padding: 24,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  battleTitle: { fontFamily: F.display, fontSize: 28, color: '#fff' },
  battleSub:   { fontFamily: F.body, fontSize: 15, color: C.navyMuted, marginTop: 6 },
  battleBolt: {
    width: 64, height: 64, borderRadius: R.md, backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
  },

  // Rule chips
  ruleRow:  { flexDirection: 'row', gap: 8 },
  ruleChip: { flex: 1, paddingVertical: 9, borderRadius: R.pill, alignItems: 'center' },
  ruleChipText: { fontFamily: F.bodyBold, fontSize: 12 },

  // Headings
  h3: { fontFamily: F.display, fontSize: 20, color: C.ink, marginLeft: 4 },

  // Nav grid
  navGrid: { flexDirection: 'row', gap: 12 },
  navCard: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: R.md, paddingVertical: 18, alignItems: 'center', gap: 8,
    ...shadow('#000', 1),
  },
  navCardLabel: { fontFamily: F.bodyBold, fontSize: 12, color: C.ink },

  // Level card
  levelCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: R.md, padding: 16, ...shadow('#000', 1),
  },
  levelBadge: {
    width: 64, height: 64, borderRadius: R.pill, backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center', ...shadow(C.orangeDark, 3),
  },
  levelBadgeText: { fontFamily: F.displayBold, fontSize: 24, color: '#fff' },
  levelTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  levelLabel:  { fontFamily: F.display, fontSize: 14, color: C.ink },
  levelXp:     { fontFamily: F.bodyBold, fontSize: 12, color: C.inkBrown },

  tasksPlaceholder: { paddingVertical: 20, alignItems: 'center' },
  tasksPlaceholderText: { fontFamily: F.body, color: C.inkSlate, fontSize: 13 },

  // Task rows (squircle)
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.peachBorder,
    borderRadius: R.squircle, padding: 12, ...shadow('#000', 1),
  },
  taskRowDone: { backgroundColor: C.surfaceSunken, borderColor: C.line, opacity: 0.8 },
  taskIcon: {
    width: 48, height: 48, borderRadius: R.pill,
    justifyContent: 'center', alignItems: 'center',
  },
  taskInfo:     { flex: 1 },
  taskTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle:    { fontFamily: F.display, fontSize: 14, color: C.ink, flexShrink: 1 },
  taskExp:      { fontFamily: F.bodyBold, fontSize: 12, color: C.orange, marginLeft: 8 },
  taskSub:      { fontFamily: F.body, fontSize: 12, color: C.inkBrown, marginTop: 2 },
  claimBtn: {
    backgroundColor: C.orange, borderRadius: R.pill,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  claimBtnText: { fontFamily: F.display, fontSize: 13, color: '#fff' },
  taskCheck: {
    width: 32, height: 32, borderRadius: R.pill, backgroundColor: C.successDeep,
    justifyContent: 'center', alignItems: 'center', ...shadow('#000', 2),
  },
  taskCheckEmpty: {
    width: 32, height: 32, borderRadius: R.pill,
    borderWidth: 2, borderColor: C.peachBorder,
  },

  // Tip banner
  tipBanner: {
    backgroundColor: '#FFF6D9', borderRadius: R.md, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#FCE08A',
  },
  tipEmoji: { fontSize: 22 },
  tipText:  { flex: 1, fontFamily: F.body, fontSize: 13, color: '#6D4C00', lineHeight: 20 },
});
