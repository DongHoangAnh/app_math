import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import { useGameShowWS } from '../hooks/useGameShowWS';
import { useAuth } from '../hooks/useAuth';
import GameQuestion from '../components/GameQuestion';
import GameResults from '../components/GameResults';

const C = {
  primary: '#3B82F6', deep: '#1E40AF', yellow: '#FACC15',
  bg: '#F8FBFF', white: '#FFFFFF', text: '#1E293B', textLight: '#64748B',
  success: '#22C55E', error: '#EF4444',
};

function adaptQuestion(q: any) {
  return {
    id: q.id,
    text: q.question ?? q.text ?? '',
    options: q.options,
    correctAnswer: q.correctAnswer,
    type: (q.type ?? 'arithmetic') as 'arithmetic' | 'comparison',
  };
}

function countCorrect(answers: Record<number, { isCorrect: boolean }>) {
  return Object.values(answers).filter((a) => a.isCorrect).length;
}
function sumTime(answers: Record<number, { timeMs: number }>) {
  return Object.values(answers).reduce((s, a) => s + a.timeMs, 0);
}

export default function GameShowScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const displayName = user?.user_metadata?.full_name ?? 'Bạn';
  const grade = user?.user_metadata?.grade;

  const { state, joinQueue, leaveQueue, submitAnswer } = useGameShowWS(userId, displayName, grade);

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const handleAnswer = (answer: string) => {
    if (!state.roomId || selectedAnswer) return;
    setSelectedAnswer(answer);
    submitAnswer(state.currentQuestionIndex, answer);
    setTimeout(() => setSelectedAnswer(null), 900);
  };

  const handlePlayAgain = () => {
    setSelectedAnswer(null);
    joinQueue();
  };

  const myScore = countCorrect(state.myAnswers);
  const myTime  = sumTime(state.myAnswers);

  // ── IDLE ──────────────────────────────────────────────────────
  if (state.phase === 'idle') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.idleContainer}>
          <View style={styles.idleDeco} />
          <View style={styles.idleDeco2} />

          <Text style={styles.idleTitle}>Đấu 1v1</Text>
          <Text style={styles.idleSub}>Thách đấu toán học trực tiếp</Text>

          <View style={styles.idleCard}>
            <Text style={styles.idleCardIcon}>⚔️</Text>
            <Text style={styles.idleCardText}>10 câu hỏi · Ai nhanh & đúng hơn thắng</Text>
          </View>

          {state.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, !userId && styles.primaryBtnDisabled]}
            onPress={joinQueue}
            disabled={!userId}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>🔍  Tìm Đối Thủ</Text>
          </TouchableOpacity>

          {!userId && (
            <Text style={styles.hintText}>Vui lòng đăng nhập để chơi</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── QUEUED ────────────────────────────────────────────────────
  if (state.phase === 'queued') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <View style={styles.searchingAnim}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
          <Text style={styles.searchingTitle}>Đang tìm đối thủ...</Text>
          <Text style={styles.searchingSub}>Ghép trận có thể mất vài giây</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={leaveQueue}>
            <Text style={styles.cancelBtnText}>Huỷ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── MATCH FOUND ───────────────────────────────────────────────
  if (state.phase === 'match_found') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.deep }]}>
        <View style={styles.centerBox}>
          <Text style={styles.vsFound}>Tìm thấy đối thủ!</Text>

          <View style={styles.vsRow}>
            <View style={styles.vsPlayer}>
              <View style={[styles.vsAvatar, { backgroundColor: C.yellow }]}>
                <Text style={styles.vsAvatarText}>{displayName[0]?.toUpperCase()}</Text>
              </View>
              <Text style={styles.vsName} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.vsYou}>(Bạn)</Text>
            </View>

            <View style={styles.vsBadge}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.vsPlayer}>
              <View style={[styles.vsAvatar, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.vsAvatarText}>
                  {state.opponent?.displayName[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <Text style={styles.vsName} numberOfLines={1}>
                {state.opponent?.displayName ?? '...'}
              </Text>
              <Text style={styles.vsGrade}>{state.opponent?.grade ?? ''}</Text>
            </View>
          </View>

          <View style={styles.vsCountdown}>
            <ActivityIndicator color={C.yellow} />
            <Text style={styles.vsCountdownText}>Chuẩn bị...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────
  if (state.phase === 'playing') {
    const total = state.questions.length || 10;
    const current = state.currentQuestionIndex;
    const rawQ = state.questions[current];
    if (!rawQ) return <SafeAreaView style={styles.safe}><ActivityIndicator color={C.primary} style={{ marginTop: 60 }} /></SafeAreaView>;

    const opponentName = state.opponent?.displayName ?? 'Đối thủ';

    return (
      <SafeAreaView style={styles.safe}>
        {/* Score header */}
        <View style={styles.gameHeader}>
          <View style={styles.playerScore}>
            <Text style={styles.playerScoreLabel}>{displayName.split(' ').pop()}</Text>
            <Text style={styles.playerScoreValue}>{myScore}</Text>
          </View>

          <View style={styles.progressCenter}>
            <Text style={styles.questionNum}>{current + 1} / {total}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((current + 1) / total) * 100}%` as any }]} />
            </View>
          </View>

          <View style={[styles.playerScore, { alignItems: 'flex-end' }]}>
            <Text style={styles.playerScoreLabel}>{opponentName.split(' ').pop()}</Text>
            <Text style={[styles.playerScoreValue, { color: '#EF4444' }]}>
              {state.opponentAnsweredCount}
            </Text>
          </View>
        </View>

        {/* Question + Options */}
        <View style={styles.gameBody}>
          {state.opponentFinished && (
            <View style={styles.opponentDoneBanner}>
              <Text style={styles.opponentDoneText}>⚡ Đối thủ đã hoàn thành!</Text>
            </View>
          )}
          <GameQuestion
            question={adaptQuestion(rawQ)}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={handleAnswer}
            isDisabled={false}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── YOU FINISHED ──────────────────────────────────────────────
  if (state.phase === 'you_finished') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <Text style={styles.waitIcon}>✅</Text>
          <Text style={styles.waitTitle}>Bạn đã hoàn thành!</Text>
          <Text style={styles.waitSub}>
            Đang chờ đối thủ... ({state.opponentAnsweredCount}/{state.questions.length} câu)
          </Text>
          <ActivityIndicator color={C.primary} style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── GAME OVER ─────────────────────────────────────────────────
  if (state.phase === 'game_over') {
    const oppEntry = state.finalResults
      ? Object.entries(state.finalResults).find(([k]) => k !== userId)
      : null;

    return (
      <GameResults
        playerScore={myScore}
        opponentScore={oppEntry ? oppEntry[1].correct : 0}
        playerTime={myTime}
        opponentTime={oppEntry ? oppEntry[1].totalTimeMs : 0}
        rankingDelta={state.myRankingDelta}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  // ── OPPONENT DISCONNECTED ─────────────────────────────────────
  if (state.phase === 'opponent_disconnected') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.deep }]}>
        <View style={styles.centerBox}>
          <Text style={styles.discIcon}>🏃</Text>
          <Text style={styles.discTitle}>Đối thủ bỏ cuộc!</Text>
          <Text style={styles.discSub}>Bạn thắng mặc định</Text>
          {state.myRankingDelta != null && (
            <View style={styles.rankDeltaBadge}>
              <Text style={styles.rankDeltaText}>+{state.myRankingDelta} điểm xếp hạng</Text>
            </View>
          )}
          <TouchableOpacity style={styles.primaryBtn} onPress={handlePlayAgain}>
            <Text style={styles.primaryBtnText}>Chơi Trận Mới</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // ── Idle ──
  idleContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 28, backgroundColor: C.deep, overflow: 'hidden',
  },
  idleDeco: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  idleDeco2: {
    position: 'absolute', bottom: -80, left: -40,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  idleTitle: { fontSize: 40, fontWeight: '900', color: '#fff', marginBottom: 8 },
  idleSub: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 32 },
  idleCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, padding: 20, alignItems: 'center',
    marginBottom: 32, width: '100%',
  },
  idleCardIcon: { fontSize: 40, marginBottom: 8 },
  idleCardText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },

  // ── Buttons ──
  primaryBtn: {
    backgroundColor: C.yellow, paddingVertical: 18,
    paddingHorizontal: 48, borderRadius: 20,
    shadowColor: C.yellow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8, marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontWeight: '900', color: C.deep },
  cancelBtn: {
    marginTop: 20, paddingVertical: 12, paddingHorizontal: 32,
    borderRadius: 16, borderWidth: 2, borderColor: '#E2E8F0',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: C.textLight },

  errorBox: {
    backgroundColor: '#FEE2E2', borderRadius: 14, padding: 12,
    marginBottom: 16, width: '100%',
  },
  errorText: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  hintText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 12 },

  // ── Centered layout ──
  centerBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28,
  },

  // ── Searching ──
  searchingAnim: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  searchingTitle: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 8 },
  searchingSub: { fontSize: 14, color: C.textLight },

  // ── VS screen ──
  vsFound: { fontSize: 28, fontWeight: '900', color: C.yellow, marginBottom: 40 },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'center' },
  vsPlayer: { flex: 1, alignItems: 'center', gap: 8 },
  vsAvatar: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
  },
  vsAvatarText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  vsName: { fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'center' },
  vsYou: { fontSize: 11, color: C.yellow },
  vsGrade: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  vsBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.yellow, justifyContent: 'center', alignItems: 'center',
  },
  vsText: { fontSize: 14, fontWeight: '900', color: C.deep },
  vsCountdown: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 40 },
  vsCountdownText: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },

  // ── Playing ──
  gameHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: C.white,
    shadowColor: 'rgba(59,130,246,0.1)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1,
    shadowRadius: 12, elevation: 4,
  },
  playerScore: { flex: 1, alignItems: 'flex-start' },
  playerScoreLabel: { fontSize: 11, color: C.textLight, fontWeight: '600' },
  playerScoreValue: { fontSize: 28, fontWeight: '900', color: C.primary },
  progressCenter: { flex: 1.5, alignItems: 'center', gap: 6 },
  questionNum: { fontSize: 13, fontWeight: '700', color: C.textLight },
  progressBar: {
    width: '100%', height: 6, backgroundColor: '#E2E8F0',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  gameBody: { flex: 1, padding: 20, justifyContent: 'center' },
  opponentDoneBanner: {
    backgroundColor: '#FEF9C3', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 16,
    alignItems: 'center', marginBottom: 16,
  },
  opponentDoneText: { fontSize: 13, fontWeight: '700', color: '#92400E' },

  // ── You finished ──
  waitIcon: { fontSize: 64, marginBottom: 16 },
  waitTitle: { fontSize: 26, fontWeight: '900', color: C.text, marginBottom: 8 },
  waitSub: { fontSize: 14, color: C.textLight, textAlign: 'center' },

  // ── Disconnect ──
  discIcon: { fontSize: 72, marginBottom: 16 },
  discTitle: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 8 },
  discSub: { fontSize: 16, color: 'rgba(255,255,255,0.75)', marginBottom: 24 },
  rankDeltaBadge: {
    backgroundColor: C.yellow, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 16, marginBottom: 28,
  },
  rankDeltaText: { fontSize: 20, fontWeight: '900', color: C.deep },
});
