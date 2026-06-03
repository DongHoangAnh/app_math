import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C, R, F, shadow, hardShadow } from '../theme';
import { TactileButton } from './ui';

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
  totalQuestions, rankingDelta, currentRankingPoints, userId, winnerId, onPlayAgain,
}: Props) {
  const navigation = useNavigation<any>();

  const totalQ    = totalQuestions || 10;
  const won       = winnerId != null ? winnerId === userId : playerScore > opponentScore;
  const draw      = winnerId === null || (winnerId === undefined && playerScore === opponentScore);
  const outcome   = draw ? 'draw' : won ? 'win' : 'lose';
  const accuracy  = totalQ > 0 ? Math.round((playerScore / totalQ) * 100) : 0;

  const cfg = {
    win:  { emoji: '🏆', label: 'CHIẾN THẮNG!', sub: 'Bạn đã hoàn thành xuất sắc thử thách', accent: C.orange,   slab: '#C9431A' },
    lose: { emoji: '🚩', label: 'THUA CUỘC',    sub: 'Cố gắng hơn ở trận sau nhé!',          accent: C.inkSlate, slab: '#3D4456' },
    draw: { emoji: '🤝', label: 'HOÀ',          sub: 'Một trận đấu cân tài cân sức!',         accent: C.orange,   slab: '#C9431A' },
  }[outcome];

  const xpLabel  = rankingDelta != null
    ? `${rankingDelta >= 0 ? '+' : ''}${rankingDelta}`
    : '+0';
  const xpColor  = !rankingDelta ? C.inkSlate
    : rankingDelta > 0 ? C.successDeep : C.error;

  return (
    <SafeAreaView style={s.safe}>
      {/* peach glow behind the celebration */}
      <View style={s.glow} pointerEvents="none" />

      <View style={s.content}>
        {/* ── Outcome ── */}
        <View style={[s.trophy, { backgroundColor: cfg.accent }, hardShadow(cfg.slab, 8, 0.25)]}>
          <Text style={{ fontSize: 40 }}>{cfg.emoji}</Text>
        </View>
        <Text style={[s.title, { color: cfg.accent }]}>{cfg.label}</Text>
        <Text style={s.sub}>{cfg.sub}</Text>

        {/* ── VS board ── */}
        <View style={s.vsRow}>
          <ResultCard name="Bạn" score={playerScore} winner={won} accent={C.orange} />
          <ResultCard name="Đối thủ" score={opponentScore} winner={!won && !draw} accent={C.inkSlate} dim />
        </View>

        {/* ── 3 stat cards ── */}
        <View style={s.statRow}>
          <StatCard icon="🎯" value={`${accuracy}%`}      label="Chính xác" />
          <StatCard icon="⏱️" value={fmtTime(playerTime)} label="Thời gian" />
          <StatCard icon="🔥" value={xpLabel}             label="Điểm hạng" valueColor={xpColor} />
        </View>

        {currentRankingPoints != null && (
          <Text style={s.rankTotal}>Điểm xếp hạng: {currentRankingPoints.toLocaleString()}</Text>
        )}

        {/* ── CTA buttons ── */}
        <View style={s.ctaCol}>
          <TactileButton title="Đấu tiếp" icon="⚔️" onPress={onPlayAgain} />
          <TactileButton
            title="Xem lịch sử đấu"
            icon="📜"
            variant="soft"
            onPress={() => navigation.navigate('MatchHistoryTab')}
          />
          <TactileButton title="Về trang chủ" variant="outline" onPress={() => navigation.navigate('HomeTab')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function ResultCard({
  name, score, winner, accent, dim,
}: { name: string; score: number; winner: boolean; accent: string; dim?: boolean }) {
  return (
    <View style={[
      s.resultCard,
      { borderColor: winner ? accent : C.line },
      winner ? shadow('#000', 2) : shadow('#000', 1),
      dim ? { opacity: 0.92, transform: [{ scale: 0.97 }] } : null,
    ]}>
      <View style={[s.resultAvatar, { borderColor: winner ? accent : C.line }]}>
        <Text style={{ fontSize: 28 }}>{name === 'Bạn' ? '🐱' : '🐻'}</Text>
      </View>
      <Text style={s.resultName}>{name}</Text>
      <Text style={[s.resultScore, { color: accent }]}>{score}</Text>
      <Text style={s.resultCaption}>câu đúng</Text>
      {winner && (
        <View style={[s.winnerChip, { backgroundColor: accent }]}>
          <Text style={s.winnerChipText}>THẮNG</Text>
        </View>
      )}
    </View>
  );
}

function StatCard({
  icon, value, label, valueColor,
}: { icon: string; value: string; label: string; valueColor?: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={[s.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  glow: {
    position: 'absolute', top: -120, alignSelf: 'center',
    width: 420, height: 420, borderRadius: 210,
    backgroundColor: C.peachGlow, opacity: 0.35,
  },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8 },

  // Outcome
  trophy: {
    width: 80, height: 80, borderRadius: R.pill,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  title: { fontFamily: F.display, fontSize: 40, letterSpacing: -0.8, marginTop: 8 },
  sub:   { fontFamily: F.body, fontSize: 16, color: C.inkBrown, textAlign: 'center', marginBottom: 12 },

  // VS board
  vsRow: { flexDirection: 'row', gap: 14, width: '100%', marginTop: 4 },
  resultCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: R.xl, borderWidth: 2,
    paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', gap: 6,
  },
  resultAvatar: {
    width: 64, height: 64, borderRadius: R.pill, borderWidth: 2,
    backgroundColor: C.surfaceSunken, justifyContent: 'center', alignItems: 'center',
  },
  resultName:    { fontFamily: F.display, fontSize: 14, color: C.ink },
  resultScore:   { fontFamily: F.displayBold, fontSize: 40, lineHeight: 44 },
  resultCaption: { fontFamily: F.bodyMedium, fontSize: 12, color: C.inkSlate },
  winnerChip:    { borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 3, marginTop: 2 },
  winnerChipText:{ fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, color: '#fff' },

  // Stat cards
  statRow:  { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: R.md, paddingVertical: 12, paddingHorizontal: 6,
    alignItems: 'center', gap: 3, ...shadow('#000', 1),
  },
  statIcon:  { fontSize: 20 },
  statValue: { fontFamily: F.displayBold, fontSize: 16, color: C.ink },
  statLabel: { fontFamily: F.bodyMedium, fontSize: 11, color: C.inkSlate },

  rankTotal: { fontFamily: F.bodyMedium, fontSize: 13, color: C.inkBrown, marginTop: 16 },

  // CTA
  ctaCol: { width: '100%', gap: 12, marginTop: 24 },
});
