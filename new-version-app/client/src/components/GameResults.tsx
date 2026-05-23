import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';

interface GameResultsProps {
  playerScore: number;
  opponentScore: number;
  playerTime: number;
  opponentTime: number;
  rankingDelta?: number | null;
  onPlayAgain: () => void;
}

const C = {
  primary: '#3B82F6', deep: '#1E40AF', yellow: '#FACC15',
  bg: '#F8FBFF', white: '#FFFFFF', text: '#1E293B', textLight: '#64748B',
  success: '#22C55E', error: '#EF4444',
};

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function GameResults({
  playerScore, opponentScore, playerTime, opponentTime,
  rankingDelta, onPlayAgain,
}: GameResultsProps) {
  const won  = playerScore > opponentScore;
  const draw = playerScore === opponentScore;

  const headline = draw ? 'Hoà!' : won ? 'Bạn Thắng! 🎉' : 'Bạn Thua 😢';
  const headlineColor = draw ? '#F59E0B' : won ? C.success : C.error;
  const headerBg = draw ? '#FEF9C3' : won ? '#DCFCE7' : '#FEE2E2';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Result header ── */}
        <View style={[styles.resultHeader, { backgroundColor: headerBg }]}>
          <Text style={[styles.headline, { color: headlineColor }]}>{headline}</Text>

          {rankingDelta != null && (
            <View style={[
              styles.rankBadge,
              { backgroundColor: rankingDelta >= 0 ? C.success : C.error },
            ]}>
              <Text style={styles.rankBadgeText}>
                {rankingDelta >= 0 ? `+${rankingDelta}` : `${rankingDelta}`}  điểm xếp hạng
              </Text>
            </View>
          )}
        </View>

        {/* ── Score comparison ── */}
        <View style={styles.scoreRow}>
          {/* Me */}
          <View style={[styles.scoreCard, won && styles.scoreCardWinner]}>
            {won && <View style={styles.crownBadge}><Text style={styles.crownText}>👑</Text></View>}
            <Text style={styles.scoreCardLabel}>Bạn</Text>
            <Text style={[styles.scoreCardValue, { color: C.primary }]}>{playerScore}</Text>
            <Text style={styles.scoreCardSub}>câu đúng</Text>
            <Text style={styles.scoreCardTime}>{fmt(playerTime)}</Text>
          </View>

          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Opponent */}
          <View style={[styles.scoreCard, !won && !draw && styles.scoreCardWinner]}>
            {!won && !draw && <View style={styles.crownBadge}><Text style={styles.crownText}>👑</Text></View>}
            <Text style={styles.scoreCardLabel}>Đối Thủ</Text>
            <Text style={[styles.scoreCardValue, { color: '#EF4444' }]}>{opponentScore}</Text>
            <Text style={styles.scoreCardSub}>câu đúng</Text>
            <Text style={styles.scoreCardTime}>{fmt(opponentTime)}</Text>
          </View>
        </View>

        {/* ── Stats summary ── */}
        <View style={styles.summaryCard}>
          <SummaryRow label="Câu trả lời đúng" value={`${playerScore}/10 vs ${opponentScore}/10`} />
          <SummaryRow label="Thời gian" value={`${fmt(playerTime)} vs ${fmt(opponentTime)}`} />
          <SummaryRow
            label="Điểm xếp hạng"
            value={
              rankingDelta == null ? 'Hoà (±0)' :
              rankingDelta >= 0 ? `+${rankingDelta}` : `${rankingDelta}`
            }
            valueColor={
              rankingDelta == null ? C.textLight :
              rankingDelta >= 0 ? C.success : C.error
            }
            isLast
          />
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.playAgainBtn} onPress={onPlayAgain} activeOpacity={0.85}>
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
      <Text style={[styles.summaryValue, valueColor ? { color: valueColor, fontWeight: '800' } : {}]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },

  resultHeader: {
    paddingTop: 40, paddingBottom: 32, paddingHorizontal: 24,
    alignItems: 'center', gap: 16,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headline: { fontSize: 38, fontWeight: '900' },
  rankBadge: {
    paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  rankBadgeText: { fontSize: 18, fontWeight: '900', color: '#fff' },

  scoreRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 24, gap: 12,
  },
  scoreCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 24, padding: 20,
    alignItems: 'center', gap: 4,
    shadowColor: 'rgba(59,130,246,0.1)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1,
    shadowRadius: 12, elevation: 4,
  },
  scoreCardWinner: {
    borderWidth: 2.5, borderColor: C.yellow,
    shadowColor: C.yellow, shadowOpacity: 0.25,
  },
  crownBadge: {
    position: 'absolute', top: -14, alignSelf: 'center',
  },
  crownText: { fontSize: 28 },
  scoreCardLabel: { fontSize: 12, color: C.textLight, fontWeight: '600' },
  scoreCardValue: { fontSize: 44, fontWeight: '900' },
  scoreCardSub: { fontSize: 11, color: C.textLight },
  scoreCardTime: { fontSize: 13, color: C.textLight, fontWeight: '600', marginTop: 4 },

  vsCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#E2E8F0',
  },
  vsText: { fontSize: 11, fontWeight: '800', color: C.textLight },

  summaryCard: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: C.white, borderRadius: 24, overflow: 'hidden',
    shadowColor: 'rgba(59,130,246,0.08)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1,
    shadowRadius: 12, elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  summaryLabel: { fontSize: 14, color: C.textLight, fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: C.text },

  actions: { marginHorizontal: 20, marginTop: 20, gap: 12 },
  playAgainBtn: {
    backgroundColor: C.primary, borderRadius: 20, paddingVertical: 18,
    alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  playAgainText: { fontSize: 17, fontWeight: '900', color: '#fff' },
});
