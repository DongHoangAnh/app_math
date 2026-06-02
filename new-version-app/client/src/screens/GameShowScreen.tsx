import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useGameShowWS } from '../hooks/useGameShowWS';
import { useAuth } from '../hooks/useAuth';
import GameQuestion from '../components/GameQuestion';
import GameResults from '../components/GameResults';

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
  const userId      = user?.id ?? null;
  const displayName = user?.user_metadata?.full_name ?? 'Bạn';
  const grade       = user?.user_metadata?.grade;

  const { state, joinQueue, leaveQueue, submitAnswer } = useGameShowWS(userId, displayName, grade);

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

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

  useEffect(() => {
    if (state.phase !== 'match_found') return;
    setCountdown(3);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  const myScore = countCorrect(state.myAnswers);
  const myTime  = sumTime(state.myAnswers);

  // ── IDLE ──────────────────────────────────────────────────────
  if (state.phase === 'idle') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.idleContainer}>
          <View style={styles.idleDeco1} />
          <View style={styles.idleDeco2} />
          <View style={styles.idleDeco3} />

          <View style={styles.idleIconWrap}>
            <Text style={styles.idleIcon}>🎮</Text>
          </View>

          <Text style={styles.idleTitle}>Đấu 1v1</Text>
          <Text style={styles.idleSub}>Thách đấu toán học trực tiếp</Text>

          <View style={styles.idleInfoRow}>
            <View style={styles.idleInfoChip}>
              <Text style={styles.idleInfoEmoji}>🔢</Text>
              <Text style={styles.idleInfoText}>10 câu</Text>
            </View>
            <View style={styles.idleInfoChip}>
              <Text style={styles.idleInfoEmoji}>⚡</Text>
              <Text style={styles.idleInfoText}>Ai nhanh hơn</Text>
            </View>
            <View style={styles.idleInfoChip}>
              <Text style={styles.idleInfoEmoji}>🏆</Text>
              <Text style={styles.idleInfoText}>+5 điểm</Text>
            </View>
          </View>

          {state.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.findBtn, !userId && { opacity: 0.5 }]}
            onPress={joinQueue}
            disabled={!userId}
            activeOpacity={0.88}
          >
            <Text style={styles.findBtnText}>🚀  Tìm Đối Thủ</Text>
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
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <View style={styles.centerBox}>
          <View style={styles.searchingRing}>
            <View style={styles.searchingInner}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          </View>
          <Text style={styles.searchingTitle}>Đang tìm đối thủ...</Text>
          <Text style={styles.searchingSub}>Đang ghép trận · vui lòng chờ</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={leaveQueue} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>Huỷ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── MATCH FOUND ───────────────────────────────────────────────
  if (state.phase === 'match_found') {
    return (
      <SafeAreaView style={styles.vsSafe}>
        <View style={styles.vsContainer}>
          <View style={styles.vsDeco1} />
          <View style={styles.vsDeco2} />

          <Text style={styles.vsFoundText}>Tìm thấy đối thủ!</Text>

          <View style={styles.vsRow}>
            {/* Me */}
            <View style={styles.vsPlayer}>
              <View style={[styles.vsAvatar, { backgroundColor: C.secondary }]}>
                <Text style={styles.vsAvatarText}>{displayName[0]?.toUpperCase()}</Text>
              </View>
              <Text style={styles.vsName} numberOfLines={1}>{displayName}</Text>
              <View style={styles.youBadge}><Text style={styles.youBadgeText}>BẠN</Text></View>
            </View>

            {/* VS badge */}
            <View style={styles.vsBadge}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            {/* Opponent */}
            <View style={styles.vsPlayer}>
              <View style={[styles.vsAvatar, { backgroundColor: '#FF4444' }]}>
                <Text style={styles.vsAvatarText}>
                  {state.opponent?.displayName[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <Text style={styles.vsName} numberOfLines={1}>
                {state.opponent?.displayName ?? '...'}
              </Text>
              <View style={[styles.youBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={styles.youBadgeText}>{state.opponent?.grade ?? 'Đối thủ'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.countdownWrap}>
            <Text style={styles.countdownNum}>{countdown || '🚀'}</Text>
            <Text style={styles.countdownLabel}>Trận bắt đầu sau</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────
  if (state.phase === 'playing') {
    const total   = state.questions.length || 10;
    const current = state.currentQuestionIndex;
    const rawQ    = state.questions[current];

    if (!rawQ) {
      return (
        <SafeAreaView style={styles.safe}>
          <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 60 }} />
        </SafeAreaView>
      );
    }

    const opponentName = state.opponent?.displayName ?? 'Đối thủ';
    const progress = ((current + 1) / total) * 100;

    return (
      <SafeAreaView style={styles.safe}>
        {/* Score header */}
        <View style={styles.gameHeader}>
          {/* Player score */}
          <View style={styles.scoreBlock}>
            <Text style={styles.scorePlayerName} numberOfLines={1}>
              {displayName.split(' ').pop()}
            </Text>
            <Text style={[styles.scoreValue, { color: C.primary }]}>{myScore}</Text>
          </View>

          {/* Progress center */}
          <View style={styles.progressCenter}>
            <Text style={styles.questionCounter}>{current + 1}/{total}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
            </View>
          </View>

          {/* Opponent score */}
          <View style={[styles.scoreBlock, { alignItems: 'flex-end' }]}>
            <Text style={styles.scorePlayerName} numberOfLines={1}>
              {opponentName.split(' ').pop()}
            </Text>
            <Text style={[styles.scoreValue, { color: '#FF4444' }]}>
              {state.opponentAnsweredCount}
            </Text>
          </View>
        </View>

        {/* Game body */}
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
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <View style={styles.centerBox}>
          <View style={styles.waitIconWrap}>
            <Text style={styles.waitIcon}>✅</Text>
          </View>
          <Text style={styles.waitTitle}>Bạn đã hoàn thành!</Text>
          <Text style={styles.waitSub}>
            Đang chờ đối thủ · {state.opponentAnsweredCount}/{state.questions.length} câu
          </Text>
          <ActivityIndicator color={C.primary} style={{ marginTop: 24 }} size="large" />
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
        userId={userId}
        winnerId={state.winnerId}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  // ── OPPONENT DISCONNECTED ─────────────────────────────────────
  if (state.phase === 'opponent_disconnected') {
    return (
      <SafeAreaView style={styles.vsSafe}>
        <View style={styles.centerBox}>
          <Text style={styles.discIcon}>🏃</Text>
          <Text style={styles.discTitle}>Đối thủ bỏ cuộc!</Text>
          <Text style={styles.discSub}>Bạn thắng mặc định</Text>
          {state.myRankingDelta != null && (
            <View style={styles.rankDeltaBadge}>
              <Text style={styles.rankDeltaText}>+{state.myRankingDelta} điểm 🏆</Text>
            </View>
          )}
          <TouchableOpacity style={styles.findBtn} onPress={handlePlayAgain}>
            <Text style={styles.findBtnText}>Chơi Trận Mới</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  vsSafe:    { flex: 1, backgroundColor: '#1A0A00' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },

  // ── Idle ──
  idleContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 28, backgroundColor: '#1A0A00', overflow: 'hidden',
  },
  idleDeco1: {
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,107,53,0.12)',
  },
  idleDeco2: {
    position: 'absolute', bottom: -80, left: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,210,63,0.08)',
  },
  idleDeco3: {
    position: 'absolute', top: '40%', left: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,107,53,0.06)',
  },
  idleIconWrap: {
    width: 100, height: 100, borderRadius: 32,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 15,
  },
  idleIcon:  { fontSize: 50 },
  idleTitle: { fontSize: 42, fontWeight: '900', color: '#fff', marginBottom: 8 },
  idleSub:   { fontSize: 15, color: 'rgba(255,255,255,0.65)', marginBottom: 32 },

  idleInfoRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  idleInfoChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14,
    alignItems: 'center', gap: 4,
  },
  idleInfoEmoji: { fontSize: 18 },
  idleInfoText:  { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },

  findBtn: {
    backgroundColor: C.primary, paddingVertical: 18,
    paddingHorizontal: 52, borderRadius: 22,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 12, marginTop: 8,
  },
  findBtnText: { fontSize: 19, fontWeight: '900', color: '#fff' },

  errorBox: {
    backgroundColor: 'rgba(255,68,68,0.15)', borderRadius: 14,
    padding: 12, marginBottom: 16, width: '100%',
  },
  errorText: { color: '#FF8888', fontSize: 13, textAlign: 'center' },
  hintText:  { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 12 },

  // ── Searching ──
  searchingRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 4, borderColor: '#FFD8C5',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  searchingInner: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF0E8',
    justifyContent: 'center', alignItems: 'center',
  },
  searchingTitle: { fontSize: 24, fontWeight: '900', color: C.text, marginBottom: 8 },
  searchingSub:   { fontSize: 14, color: C.textLight },
  cancelBtn: {
    marginTop: 28, paddingVertical: 12, paddingHorizontal: 36,
    borderRadius: 18, borderWidth: 2, borderColor: '#FFD8C5',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: C.textLight },

  // ── VS screen ──
  vsContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 28, overflow: 'hidden',
  },
  vsDeco1: {
    position: 'absolute', top: -80, right: -80,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(255,107,53,0.12)',
  },
  vsDeco2: {
    position: 'absolute', bottom: -60, left: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,210,63,0.08)',
  },
  vsFoundText: { fontSize: 28, fontWeight: '900', color: C.secondary, marginBottom: 40 },
  vsRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, width: '100%', justifyContent: 'center',
  },
  vsPlayer:   { flex: 1, alignItems: 'center', gap: 10 },
  vsAvatar: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
  },
  vsAvatarText: { fontSize: 30, fontWeight: '900', color: '#fff' },
  vsName:    { fontSize: 14, fontWeight: '800', color: '#fff', textAlign: 'center' },
  youBadge: {
    backgroundColor: C.primary,
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 8,
  },
  youBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  vsBadge: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.secondary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.secondary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  vsText: { fontSize: 13, fontWeight: '900', color: '#7B5800' },

  countdownWrap: { alignItems: 'center', marginTop: 40 },
  countdownNum:  { fontSize: 64, fontWeight: '900', color: C.secondary },
  countdownLabel:{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  // ── Playing ──
  gameHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.card,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1,
    shadowRadius: 12, elevation: 6,
  },
  scoreBlock:     { flex: 1 },
  scorePlayerName:{ fontSize: 11, color: C.textLight, fontWeight: '700' },
  scoreValue:     { fontSize: 32, fontWeight: '900' },
  progressCenter: { flex: 1.5, alignItems: 'center', gap: 6 },
  questionCounter:{ fontSize: 13, fontWeight: '800', color: C.textLight },
  progressTrack: {
    width: '100%', height: 8, backgroundColor: '#FFE5D9',
    borderRadius: 4, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: C.primary, borderRadius: 4,
  },
  gameBody: { flex: 1, padding: 18, justifyContent: 'center' },
  opponentDoneBanner: {
    backgroundColor: '#FFF9C4', borderRadius: 14,
    paddingVertical: 9, paddingHorizontal: 16,
    alignItems: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: '#FFE082',
  },
  opponentDoneText: { fontSize: 13, fontWeight: '800', color: '#6D4C00' },

  // ── You finished ──
  waitIconWrap: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  waitIcon:  { fontSize: 48 },
  waitTitle: { fontSize: 26, fontWeight: '900', color: C.text, marginBottom: 8 },
  waitSub:   { fontSize: 14, color: C.textLight, textAlign: 'center' },

  // ── Disconnect ──
  discIcon:  { fontSize: 80, marginBottom: 16 },
  discTitle: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 8 },
  discSub:   { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 28 },
  rankDeltaBadge: {
    backgroundColor: C.secondary, paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 18, marginBottom: 32,
  },
  rankDeltaText: { fontSize: 22, fontWeight: '900', color: '#7B5800' },
});
