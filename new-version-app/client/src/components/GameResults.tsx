import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';

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

const C = {
  blue:   '#4A7FF5',
  navy:   '#1A1F4E',
  yellow: '#FFD600',
  green:  '#1D9E75',
  red:    '#E24B4A',
  border: '#D0DCFF',
};

function fmtAvgTime(totalMs: number, answered: number): string {
  if (!answered) return '0.0s';
  const avg = totalMs / answered / 1000;
  return `${avg.toFixed(1)}s`;
}

export default function GameResults({
  playerScore, opponentScore, playerTime, opponentTime,
  totalQuestions = 10, rankingDelta, currentRankingPoints, userId, winnerId, onPlayAgain, onReview,
}: Props) {
  const won  = winnerId != null ? winnerId === userId : playerScore > opponentScore;
  const draw = winnerId === null || (winnerId === undefined && playerScore === opponentScore);

  const outcome = draw ? 'draw' : won ? 'win' : 'lose';

  const resultConfig = {
    win:  { icon: '🏆', title: 'Chiến thắng!', bg: '#F0F4FF' },
    lose: { icon: '😤', title: 'Chưa thắng lần này', bg: '#FFF5F5' },
    draw: { icon: '🤝', title: 'Trận hòa!', bg: '#FFFBF0' },
  }[outcome];

  const deltaColor = !rankingDelta ? '#999' : rankingDelta > 0 ? C.green : C.red;
  const deltaLabel = draw
    ? 'Không thay đổi điểm'
    : rankingDelta != null
      ? `${rankingDelta > 0 ? '+' : ''}${rankingDelta} điểm xếp hạng`
      : '';

  const accuracy = totalQuestions > 0
    ? Math.round((playerScore / totalQuestions) * 100)
    : 0;

  const answeredCount = playerScore; // correct answers used as proxy

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: resultConfig.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Result icon + title */}
        <View style={styles.resultHeader}>
          <Text style={styles.resultIcon}>{resultConfig.icon}</Text>
          <Text style={styles.resultTitle}>{resultConfig.title}</Text>
          {deltaLabel ? (
            <Text style={[styles.resultDelta, { color: deltaColor }]}>{deltaLabel}</Text>
          ) : null}
        </View>

        {/* Stat row — 3 metrics */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{playerScore}/{totalQuestions}</Text>
            <Text style={styles.statLabel}>Đúng</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{fmtAvgTime(playerTime, playerScore)}</Text>
            <Text style={styles.statLabel}>TB/câu</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Chính xác</Text>
          </View>
        </View>

        {/* Elo breakdown */}
        <View style={styles.eloCard}>
          <EloRow label="Điểm đối thủ" value={`${opponentScore}/${totalQuestions} câu đúng`} />
          <EloRow
            label={won ? 'Thắng' : draw ? 'Hòa' : 'Thua'}
            value={
              rankingDelta != null
                ? `${rankingDelta > 0 ? '+' : ''}${rankingDelta}`
                : '±0'
            }
            valueColor={deltaColor}
          />
          {rankingDelta != null && (
            <EloRow
              label="Điểm mới"
              value={currentRankingPoints != null ? `${currentRankingPoints}` : '--'}
              isLast
            />
          )}
        </View>

        {/* CTA buttons */}
        <View style={styles.ctaRow}>
          {onReview && (
            <TouchableOpacity style={styles.reviewBtn} onPress={onReview} activeOpacity={0.85}>
              <Text style={styles.reviewBtnText}>Phân tích</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.playAgainBtn, !onReview && { flex: 1 }]} onPress={onPlayAgain} activeOpacity={0.85}>
            <Text style={styles.playAgainText}>Trận mới</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function EloRow({ label, value, valueColor, isLast }: {
  label: string; value: string; valueColor?: string; isLast?: boolean;
}) {
  return (
    <View style={[styles.eloRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.eloLabel}>{label}</Text>
      <Text style={[styles.eloValue, valueColor ? { color: valueColor, fontWeight: '500' } : {}]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  resultHeader: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 24,
    gap: 8,
  },
  resultIcon:  { fontSize: 52 },
  resultTitle: { fontSize: 22, fontWeight: '500', color: '#1A1F4E' },
  resultDelta: { fontSize: 14, fontWeight: '400' },

  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#D0DCFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statValue: { fontSize: 16, fontWeight: '500', color: '#4A7FF5' },
  statLabel: { fontSize: 8, color: '#999', marginTop: 2 },

  eloCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#D0DCFF',
    marginBottom: 24,
    overflow: 'hidden',
  },
  eloRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D0DCFF',
  },
  eloLabel: { fontSize: 11, color: '#666' },
  eloValue: { fontSize: 11, color: '#1A1F4E' },

  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reviewBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#4A7FF5',
    borderRadius: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reviewBtnText: { fontSize: 13, fontWeight: '500', color: '#4A7FF5' },
  playAgainBtn: {
    flex: 1,
    backgroundColor: '#4A7FF5',
    borderRadius: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  playAgainText: { fontSize: 13, fontWeight: '500', color: '#fff' },
});
