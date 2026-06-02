import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView,
} from 'react-native';

interface GameResultsProps {
  playerScore: number;
  opponentScore: number;
  playerTime: number;
  opponentTime: number;
  rankingDelta?: number | null;
  userId?: string | null;
  winnerId?: string | null;
  onPlayAgain: () => void;
}

const C = {
  primary:   '#FF6B35',
  secondary: '#FFD23F',
  bg:        '#FFF8F2',
  card:      '#FFFFFF',
  text:      '#2C1810',
  textLight: '#8B7B74',
  success:   '#4CAF50',
  error:     '#FF4444',
};

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function GameResults({
  playerScore, opponentScore, playerTime, opponentTime,
  rankingDelta, userId, winnerId, onPlayAgain,
}: GameResultsProps) {
  const won  = winnerId != null ? winnerId === userId : playerScore > opponentScore;
  const draw = winnerId === null || (winnerId === undefined && playerScore === opponentScore);

  const headline    = draw ? '🤝 Hoà!' : won ? '🎉 Bạn Thắng!' : '😢 Bạn Thua';
  const headerBg    = draw ? '#FFF9C4' : won ? '#E8F5E9' : '#FFEBEE';
  const headerColor = draw ? '#F57F17' : won ? '#2E7D32' : '#C62828';

  const starCount = won ? 3 : draw ? 2 : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Result header ── */}
        <View style={[styles.resultHeader, { backgroundColor: headerBg }]}>
          <View style={styles.starsRow}>
            {[1, 2, 3].map((s) => (
              <Text key={s} style={[styles.star, { opacity: s <= starCount ? 1 : 0.25 }]}>⭐</Text>
            ))}
          </View>
          <Text style={[styles.headline, { color: headerColor }]}>{headline}</Text>

          {rankingDelta != null && (
            <View style={[
              styles.rankBadge,
              { backgroundColor: draw ? '#9E9E9E' : rankingDelta >= 0 ? C.success : C.error },
            ]}>
              <Text style={styles.rankBadgeText}>
                {draw ? '±0' : rankingDelta >= 0 ? `+${rankingDelta}` : `${rankingDelta}`} điểm
              </Text>
            </View>
          )}
        </View>

        {/* ── Score cards ── */}
        <View style={styles.scoreRow}>
          {/* Me */}
          <View style={[styles.scoreCard, won && styles.scoreCardWinner]}>
            {won && (
              <View style={styles.crownWrap}>
                <Text style={styles.crownEmoji}>👑</Text>
              </View>
            )}
            <Text style={styles.scoreLabel}>Bạn</Text>
            <Text style={[styles.scoreValue, { color: C.primary }]}>{playerScore}</Text>
            <Text style={styles.scoreSub}>câu đúng</Text>
            <View style={styles.timeChip}>
              <Text style={styles.timeText}>⏱ {fmt(playerTime)}</Text>
            </View>
          </View>

          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Opponent */}
          <View style={[styles.scoreCard, !won && !draw && styles.scoreCardWinner]}>
            {!won && !draw && (
              <View style={styles.crownWrap}>
                <Text style={styles.crownEmoji}>👑</Text>
              </View>
            )}
            <Text style={styles.scoreLabel}>Đối Thủ</Text>
            <Text style={[styles.scoreValue, { color: '#FF4444' }]}>{opponentScore}</Text>
            <Text style={styles.scoreSub}>câu đúng</Text>
            <View style={styles.timeChip}>
              <Text style={styles.timeText}>⏱ {fmt(opponentTime)}</Text>
            </View>
          </View>
        </View>

        {/* ── Summary ── */}
        <View style={styles.summaryCard}>
          <SummaryRow
            label="Câu đúng"
            value={`${playerScore}/10  vs  ${opponentScore}/10`}
          />
          <SummaryRow
            label="Thời gian"
            value={`${fmt(playerTime)}  vs  ${fmt(opponentTime)}`}
          />
          <SummaryRow
            label="Điểm xếp hạng"
            value={
              draw ? 'Hoà (±0)' :
              rankingDelta == null ? '--' :
              rankingDelta >= 0 ? `+${rankingDelta}` : `${rankingDelta}`
            }
            valueColor={
              draw ? C.textLight :
              rankingDelta == null ? C.textLight :
              rankingDelta >= 0 ? C.success : C.error
            }
            isLast
          />
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.playAgainBtn} onPress={onPlayAgain} activeOpacity={0.88}>
            <Text style={styles.playAgainText}>🔄  Chơi Trận Mới</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({
  label, value, valueColor, isLast,
}: { label: string; value: string; valueColor?: string; isLast?: boolean }) {
  return (
    <View style={[styles.summaryRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, valueColor ? { color: valueColor, fontWeight: '900' } : {}]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },

  resultHeader: {
    paddingTop: 44, paddingBottom: 36, paddingHorizontal: 24,
    alignItems: 'center', gap: 14,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  starsRow: { flexDirection: 'row', gap: 4 },
  star:     { fontSize: 32 },
  headline: { fontSize: 36, fontWeight: '900' },
  rankBadge: {
    paddingVertical: 10, paddingHorizontal: 28, borderRadius: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  rankBadgeText: { fontSize: 18, fontWeight: '900', color: '#fff' },

  scoreRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 24, gap: 12,
  },
  scoreCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 24, padding: 20,
    alignItems: 'center', gap: 6,
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
    borderWidth: 2, borderColor: '#FFE5D9',
  },
  scoreCardWinner: {
    borderColor: C.secondary, borderWidth: 3,
    shadowColor: C.secondary, shadowOpacity: 0.3,
  },
  crownWrap: { position: 'absolute', top: -16, alignSelf: 'center' },
  crownEmoji:   { fontSize: 32 },
  scoreLabel:   { fontSize: 12, color: C.textLight, fontWeight: '700' },
  scoreValue:   { fontSize: 48, fontWeight: '900' },
  scoreSub:     { fontSize: 11, color: C.textLight },
  timeChip: {
    backgroundColor: '#FFF0E8', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 4,
  },
  timeText: { fontSize: 12, fontWeight: '700', color: C.primary },

  vsCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.bg,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFD8C5',
  },
  vsText: { fontSize: 11, fontWeight: '900', color: C.textLight },

  summaryCard: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: C.card, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    borderWidth: 1.5, borderColor: '#FFE5D9',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#FFF0E8',
  },
  summaryLabel: { fontSize: 14, color: C.textLight, fontWeight: '600' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: C.text },

  actions: { marginHorizontal: 20, marginTop: 24 },
  playAgainBtn: {
    backgroundColor: C.primary, borderRadius: 22, paddingVertical: 19,
    alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  playAgainText: { fontSize: 18, fontWeight: '900', color: '#fff' },
});
