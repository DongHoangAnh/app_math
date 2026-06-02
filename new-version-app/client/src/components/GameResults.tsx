import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C, R } from '../theme';

interface Props {
  playerScore: number;
  opponentScore: number;
  playerTime: number;
  opponentTime: number;
  totalQuestions?: number;
  rankingDelta?: number | null;
  currentRankingPoints?: number | null;
  userId?: string | null;
  winnerId?: string | null;
  onPlayAgain: () => void;
  onReview?: () => void;
}

function fmtTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mins  = Math.floor(total / 60);
  const secs  = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function GameResults({
  playerScore, opponentScore, playerTime,
  totalQuestions, rankingDelta, userId, winnerId, onPlayAgain,
}: Props) {
  const navigation = useNavigation<any>();

  const totalQ    = totalQuestions || 10;
  const won       = winnerId != null ? winnerId === userId : playerScore > opponentScore;
  const draw      = winnerId === null || (winnerId === undefined && playerScore === opponentScore);
  const outcome   = draw ? 'draw' : won ? 'win' : 'lose';
  const accuracy  = totalQ > 0 ? Math.round((playerScore / totalQ) * 100) : 0;

  const cfg = {
    win:  { emoji: '🏆', label: 'CHIẾN THẮNG', color: C.success },
    lose: { emoji: '💪', label: 'THUA CUỘC',   color: C.error   },
    draw: { emoji: '🤝', label: 'HÒA',          color: C.primary },
  }[outcome];

  const xpLabel  = rankingDelta != null
    ? `${rankingDelta >= 0 ? '+' : ''}${rankingDelta}`
    : '+0';
  const xpColor  = !rankingDelta ? C.textSecond
    : rankingDelta > 0 ? C.success : C.error;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>

        {/* ── Outcome ── */}
        <Text style={s.emoji}>{cfg.emoji}</Text>
        <Text style={[s.title, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={s.score}>{playerScore} - {opponentScore}</Text>

        {/* ── 3 stat cards ── */}
        <View style={s.statRow}>
          <StatCard icon="🎯" value={`${accuracy}%`}     label="Đúng"      />
          <StatCard icon="⏱️" value={fmtTime(playerTime)} label="Thời gian" />
          <StatCard icon="⚡" value={xpLabel}             label="XP"        valueColor={xpColor} />
        </View>

        {/* ── CTA buttons ── */}
        <TouchableOpacity style={s.playBtn} onPress={onPlayAgain} activeOpacity={0.85}>
          <Text style={s.playBtnTxt}>Đấu tiếp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.homeBtn}
          onPress={() => navigation.navigate('HomeTab')}
          activeOpacity={0.8}
        >
          <Text style={s.homeBtnTxt}>Về trang chủ</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

function StatCard({
  icon, value, label, valueColor,
}: {
  icon: string; value: string; label: string; valueColor?: string;
}) {
  return (
    <View style={s.statCard}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={[s.statValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 8,
  },

  // Outcome
  emoji: { fontSize: 72, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  score: { fontSize: 20, fontWeight: '700', color: C.textSecond, marginBottom: 24 },

  // Stat cards row
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon:  { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: '900', color: C.textPrimary },
  statLabel: { fontSize: 11, fontWeight: '600', color: C.textSecond },

  // Buttons
  playBtn: {
    width: '100%',
    backgroundColor: C.primary,
    borderRadius: R.xl,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  playBtnTxt: { fontSize: 16, fontWeight: '900', color: '#fff' },

  homeBtn: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: R.xl,
    paddingVertical: 17,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  homeBtnTxt: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
});
