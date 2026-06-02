import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  SafeAreaView,
} from 'react-native';
import { C, R, ANIM } from '../theme';
import { useGameShowWS } from '../hooks/useGameShowWS';
import { useAuth } from '../hooks/useAuth';
import GameResults from '../components/GameResults';
import { supabase } from '../services/supabase';

const MODES = [
  { id: 'add_sub', label: 'Cộng/Trừ', desc: 'Dễ',  icon: '➕' },
  { id: 'mul_div', label: 'Nhân/Chia', desc: 'Khó', icon: '✖️' },
  { id: 'mixed',   label: 'Hỗn hợp',  desc: 'Thử', icon: '🔀' },
];

const QUESTION_SECONDS = 10;

// ── Helpers ──────────────────────────────────────────────────────
function countCorrect(answers: Record<number, { isCorrect: boolean }>) {
  return Object.values(answers).filter(a => a.isCorrect).length;
}
function sumTime(answers: Record<number, { timeMs: number }>) {
  return Object.values(answers).reduce((s, a) => s + a.timeMs, 0);
}
function adaptQuestion(q: any) {
  return {
    id: q.id ?? String(Math.random()),
    text: q.question ?? q.text ?? '',
    options: q.options ?? [],
    correctAnswer: q.correctAnswer ?? '',
    type: (q.type ?? 'arithmetic') as 'arithmetic' | 'comparison',
  };
}
function initials(name: string) {
  return (name[0] ?? '?').toUpperCase();
}

// Highlight the "?" in comparison questions with amber color
function QuestionDisplay({ text, type }: { text: string; type: string }) {
  if (type === 'comparison') {
    const parts = text.split('?');
    return (
      <Text style={s.questionText}>
        {parts[0]}
        <Text style={{ color: C.primary }}>?</Text>
        {parts[1] ?? ''}
      </Text>
    );
  }
  return <Text style={s.questionText}>{text}</Text>;
}

// ── Component ────────────────────────────────────────────────────
export default function GameShowScreen() {
  const { user } = useAuth();
  const userId      = user?.id ?? null;
  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'Bạn';
  const grade = user?.user_metadata?.grade;

  const { state, joinQueue, leaveQueue, submitAnswer } = useGameShowWS(userId, displayName, grade);

  const [selectedAnswer, setSelectedAnswer]   = useState<string | null>(null);
  const [revealState, setRevealState]         = useState<'hidden' | 'revealed'>('hidden');
  const [selectedMode, setSelectedMode]       = useState('add_sub');
  const [countdown, setCountdown]             = useState(3);
  const [questionTimer, setQuestionTimer]     = useState(QUESTION_SECONDS);
  const [myRankingPoints, setMyRankingPoints] = useState<number | null>(null);
  const [numericInput, setNumericInput]       = useState('');

  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhase         = useRef(state.phase);
  const prevQIdx          = useRef(state.currentQuestionIndex);
  const submitAnswerRef   = useRef(submitAnswer);
  const selectedAnswerRef = useRef<string | null>(null);
  const currentIdxRef     = useRef(state.currentQuestionIndex);
  const roomIdRef         = useRef(state.roomId);

  useEffect(() => { submitAnswerRef.current = submitAnswer; }, [submitAnswer]);
  useEffect(() => { selectedAnswerRef.current = selectedAnswer; }, [selectedAnswer]);
  useEffect(() => { currentIdxRef.current = state.currentQuestionIndex; }, [state.currentQuestionIndex]);
  useEffect(() => { roomIdRef.current = state.roomId; }, [state.roomId]);

  // Fetch ranking points
  useEffect(() => {
    if (!userId) return;
    if (state.phase !== 'idle' && state.phase !== 'game_over') return;
    supabase
      .from('user_profiles')
      .select('ranking_points')
      .eq('id', userId)
      .single()
      .then(({ data }) => { if (data) setMyRankingPoints(data.ranking_points); });
  }, [userId, state.phase]);

  // Question countdown timer
  useEffect(() => {
    if (state.phase !== 'playing') {
      timerRef.current && clearInterval(timerRef.current);
      setQuestionTimer(QUESTION_SECONDS);
      return;
    }
    if (state.currentQuestionIndex !== prevQIdx.current || prevPhase.current !== 'playing') {
      prevQIdx.current = state.currentQuestionIndex;
      setQuestionTimer(QUESTION_SECONDS);
      setRevealState('hidden');
      setSelectedAnswer(null);
      setNumericInput('');

      timerRef.current && clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setQuestionTimer(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            if (!selectedAnswerRef.current && roomIdRef.current) {
              setSelectedAnswer('__timeout__');
              setRevealState('revealed');
              submitAnswerRef.current(currentIdxRef.current, '__timeout__');
              setTimeout(() => {
                setRevealState('hidden');
                setSelectedAnswer(null);
                setNumericInput('');
              }, 600);
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    prevPhase.current = state.phase;
    return () => { timerRef.current && clearInterval(timerRef.current); };
  }, [state.phase, state.currentQuestionIndex]);

  // Match-found countdown
  useEffect(() => {
    if (state.phase !== 'match_found') return;
    setCountdown(3);
    const id = setInterval(() => {
      setCountdown(c => c <= 1 ? (clearInterval(id), 0) : c - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  const handleAnswer = (answer: string) => {
    if (!state.roomId || selectedAnswer || revealState === 'revealed') return;
    timerRef.current && clearInterval(timerRef.current);
    setSelectedAnswer(answer);
    setRevealState('revealed');
    submitAnswer(state.currentQuestionIndex, answer);
    setTimeout(() => {
      setRevealState('hidden');
      setSelectedAnswer(null);
      setNumericInput('');
    }, 600);
  };

  const handleNumericKey = (key: string) => {
    if (selectedAnswer) return;
    if (key === '⌫') {
      setNumericInput(v => v.slice(0, -1));
    } else if (numericInput.length < 6) {
      setNumericInput(v => v + key);
    }
  };

  const handleNumericSubmit = () => {
    if (numericInput) handleAnswer(numericInput);
  };

  const handlePlayAgain = () => {
    setSelectedAnswer(null);
    setRevealState('hidden');
    setNumericInput('');
    joinQueue();
  };

  const myScore = countCorrect(state.myAnswers);
  const myTime  = sumTime(state.myAnswers);
  const total   = state.questions.length || 10;

  // ═══════════════════════════════════════════════════════
  // IDLE
  // ═══════════════════════════════════════════════════════
  if (state.phase === 'idle') {
    return (
      <SafeAreaView style={s.bg}>
        <View style={s.idleWrap}>
          <Text style={s.idleTitle}>⚔️ Chế Độ PK</Text>
          <Text style={s.idleSub}>Thách đấu toàn server · Real-time 1v1</Text>

          <View style={s.idleVsRow}>
            <View style={[s.idleAvatar, { borderColor: C.primary }]}>
              <Text style={s.idleAvatarEmoji}>🐱</Text>
            </View>
            <Text style={s.idleVsLabel}>VS</Text>
            <View style={[s.idleAvatar, { borderColor: '#DDD' }]}>
              <Text style={[s.idleAvatarEmoji, { opacity: 0.35 }]}>?</Text>
            </View>
          </View>

          {myRankingPoints != null && (
            <Text style={s.idlePts}>Điểm xếp hạng: {myRankingPoints}</Text>
          )}

          <Text style={s.sectionLabel}>Chọn chế độ</Text>
          <View style={s.modeRow}>
            {MODES.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[s.modeCard, selectedMode === m.id && s.modeCardOn]}
                onPress={() => setSelectedMode(m.id)}
                activeOpacity={0.8}
              >
                <Text style={s.modeIcon}>{m.icon}</Text>
                <Text style={[s.modeName, selectedMode === m.id && { color: C.primary }]}>
                  {m.label}
                </Text>
                <Text style={s.modeDiff}>{m.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {state.error ? (
            <View style={s.errBox}>
              <Text style={s.errTxt}>{state.error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.bigBtn, !userId && { opacity: 0.5 }]}
            onPress={joinQueue}
            disabled={!userId}
            activeOpacity={0.85}
          >
            <Text style={s.bigBtnTxt}>Vào trận ngay ⚔️</Text>
          </TouchableOpacity>

          {!userId && (
            <Text style={s.loginHint}>Vui lòng đăng nhập để chơi</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════
  // QUEUED — searching (Image 2 style)
  // ═══════════════════════════════════════════════════════
  if (state.phase === 'queued') {
    return (
      <SafeAreaView style={s.bg}>
        <View style={s.centered}>
          <View style={s.queueAvatarRow}>
            <View style={[s.bigRing, { borderColor: C.primary }]}>
              <Text style={s.bigEmoji}>🐱</Text>
            </View>
            <Text style={s.vsHuge}>VS</Text>
            <View style={[s.bigRing, { borderColor: '#DDD' }]}>
              <Text style={[s.bigEmoji, { color: '#CCC' }]}>?</Text>
            </View>
          </View>

          <Text style={s.readyTitle}>Sẵn sàng...</Text>
          <Text style={s.searchSub}>Đang tìm đối thủ...</Text>

          <TouchableOpacity style={s.cancelBtn} onPress={leaveQueue} activeOpacity={0.7}>
            <Text style={s.cancelTxt}>Huỷ tìm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════
  // MATCH FOUND — countdown
  // ═══════════════════════════════════════════════════════
  if (state.phase === 'match_found') {
    const opName = state.opponent?.displayName ?? 'Đối thủ';
    return (
      <SafeAreaView style={s.bg}>
        <View style={s.centered}>
          <View style={s.queueAvatarRow}>
            <View style={s.matchPlayer}>
              <View style={[s.bigRing, { borderColor: C.primary }]}>
                <Text style={s.bigEmoji}>🐱</Text>
              </View>
              <Text style={s.matchName} numberOfLines={1}>{displayName}</Text>
            </View>
            <Text style={s.vsHuge}>VS</Text>
            <View style={s.matchPlayer}>
              <View style={[s.bigRing, { borderColor: C.error }]}>
                <Text style={s.bigEmoji}>🐻</Text>
              </View>
              <Text style={s.matchName} numberOfLines={1}>{opName}</Text>
            </View>
          </View>

          <Text style={s.countdownBig}>{countdown > 0 ? countdown : '🚀'}</Text>
          <Text style={s.searchSub}>Chuẩn bị bắt đầu!</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════
  // PLAYING (Images 1 & 4 style)
  // ═══════════════════════════════════════════════════════
  if (state.phase === 'playing') {
    const current     = state.currentQuestionIndex;
    const rawQ        = state.questions[current];
    const opName      = state.opponent?.displayName ?? 'Đối thủ';
    const timerPct    = (questionTimer / QUESTION_SECONDS) * 100;
    const timerColor  = questionTimer > 5 ? C.success : questionTimer >= 3 ? C.primaryLight : C.error;

    if (!rawQ) {
      return (
        <SafeAreaView style={s.bg}>
          <View style={s.centerFlex}>
            <Text style={{ color: C.primary }}>Đang tải câu hỏi...</Text>
          </View>
        </SafeAreaView>
      );
    }

    const adaptedQ    = adaptQuestion(rawQ);
    const isComparison = adaptedQ.type === 'comparison';

    return (
      <SafeAreaView style={s.bg}>
        {/* ── Battle Header ── */}
        <View style={s.battleBar}>
          {/* My side */}
          <View style={s.battleSide}>
            <View style={[s.battleRing, { borderColor: C.primary }]}>
              <Text style={s.battleEmoji}>🐱</Text>
            </View>
            <View>
              <Text style={s.battleWho}>Tôi</Text>
              <Text style={s.battleScoreRow}>
                <Text style={s.battleScoreNum}>{myScore}</Text>
                <Text style={s.battleScoreOf}>/{total}</Text>
              </Text>
            </View>
          </View>

          <Text style={s.battleVs}>VS</Text>

          {/* Opponent side */}
          <View style={[s.battleSide, { justifyContent: 'flex-end' }]}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.battleWho}>Đối thủ</Text>
              <Text style={s.battleScoreRow}>
                <Text style={s.battleScoreNum}>{state.opponentAnsweredCount}</Text>
                <Text style={s.battleScoreOf}>/{total}</Text>
              </Text>
            </View>
            <View style={[s.battleRing, { borderColor: C.error }]}>
              <Text style={s.battleEmoji}>🐻</Text>
            </View>
          </View>
        </View>

        {/* ── Timer bar ── */}
        <View style={s.timerTrack}>
          <View style={[s.timerFill, { width: `${timerPct}%` as any, backgroundColor: timerColor }]} />
        </View>

        {/* ── Body ── */}
        <View style={s.playBody}>
          {state.opponentFinished && (
            <View style={s.opDoneBanner}>
              <Text style={s.opDoneTxt}>⚡ Đối thủ đã hoàn thành!</Text>
            </View>
          )}

          {/* Question Card */}
          <View style={s.qCard}>
            <Text style={s.qCounter}>Câu {current + 1} / {total}</Text>
            <QuestionDisplay text={adaptedQ.text} type={adaptedQ.type} />
          </View>

          {/* Progress dots */}
          <View style={s.dots}>
            {Array.from({ length: total }, (_, i) => {
              const ans = state.myAnswers[i];
              const isCur = i === current;
              return (
                <View
                  key={i}
                  style={[
                    s.dot,
                    ans?.isCorrect === true  && { backgroundColor: C.success },
                    ans?.isCorrect === false && { backgroundColor: C.error },
                    isCur && !ans && s.dotActive,
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* ── Answer Input ── */}
        {isComparison ? (
          // Image 4 style: three wide amber buttons
          <View style={s.compRow}>
            {['<', '=', '>'].map(op => {
              const isSel = selectedAnswer === op;
              const isOk  = isSel && revealState === 'revealed' && op === adaptedQ.correctAnswer;
              const isBad = isSel && revealState === 'revealed' && op !== adaptedQ.correctAnswer;
              return (
                <TouchableOpacity
                  key={op}
                  style={[
                    s.compBtn,
                    isOk  && { backgroundColor: C.success, borderColor: C.success },
                    isBad && { backgroundColor: C.error,   borderColor: C.error   },
                  ]}
                  onPress={() => handleAnswer(op)}
                  disabled={!!selectedAnswer}
                  activeOpacity={0.75}
                >
                  <Text style={[s.compBtnTxt, (isOk || isBad) && { color: '#fff' }]}>{op}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          // Image 1 style: numeric keypad
          <View style={s.keypadWrap}>
            {/* Input display */}
            <View style={s.inputDisplay}>
              <Text style={s.inputDisplayTxt}>{numericInput || '—'}</Text>
            </View>

            {/* Keys 1–9 */}
            <View style={s.keyGrid}>
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <TouchableOpacity
                  key={n}
                  style={s.key}
                  onPress={() => handleNumericKey(String(n))}
                  disabled={!!selectedAnswer}
                  activeOpacity={0.7}
                >
                  <Text style={s.keyTxt}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row: 0 */}
            <View style={s.keyRow0}>
              <TouchableOpacity
                style={[s.key, { flex: 1 }]}
                onPress={() => handleNumericKey('0')}
                disabled={!!selectedAnswer}
                activeOpacity={0.7}
              >
                <Text style={s.keyTxt}>0</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom: XOÁ + NHẬP */}
            <View style={s.keyRowBottom}>
              <TouchableOpacity
                style={[s.keyXoa, !numericInput && { opacity: 0.4 }]}
                onPress={() => handleNumericKey('⌫')}
                disabled={!numericInput}
                activeOpacity={0.7}
              >
                <Text style={s.keyXoaTxt}>XOÁ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.keySubmit, !numericInput && { opacity: 0.4 }]}
                onPress={handleNumericSubmit}
                disabled={!numericInput || !!selectedAnswer}
                activeOpacity={0.85}
              >
                <Text style={s.keySubmitTxt}>NHẬP ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════
  // YOU FINISHED
  // ═══════════════════════════════════════════════════════
  if (state.phase === 'you_finished') {
    return (
      <SafeAreaView style={s.bg}>
        <View style={s.centerFlex}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>✅</Text>
          <Text style={s.waitTitle}>Bạn đã hoàn thành!</Text>
          <Text style={s.waitSub}>
            Đang chờ đối thủ · {state.opponentAnsweredCount}/{total} câu
          </Text>
          <Text style={[s.waitSub, { color: C.primary, marginTop: 16 }]}>
            Điểm của bạn: {myScore}/{total}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════
  // GAME OVER
  // ═══════════════════════════════════════════════════════
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
        totalQuestions={total}
        rankingDelta={state.myRankingDelta}
        currentRankingPoints={myRankingPoints}
        userId={userId}
        winnerId={state.winnerId}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  // ═══════════════════════════════════════════════════════
  // OPPONENT DISCONNECTED
  // ═══════════════════════════════════════════════════════
  if (state.phase === 'opponent_disconnected') {
    return (
      <SafeAreaView style={s.bg}>
        <View style={s.centerFlex}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🏃</Text>
          <Text style={s.waitTitle}>Đối thủ bỏ cuộc!</Text>
          <Text style={[s.waitSub, { marginBottom: 28 }]}>Bạn thắng mặc định 🎉</Text>
          {state.myRankingDelta != null && (
            <Text style={{ fontSize: 18, color: C.success, fontWeight: '700', marginBottom: 24 }}>
              +{state.myRankingDelta} điểm xếp hạng
            </Text>
          )}
          <TouchableOpacity style={[s.bigBtn, { width: '80%' }]} onPress={handlePlayAgain} activeOpacity={0.85}>
            <Text style={s.bigBtnTxt}>Chơi Trận Mới ⚔️</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Styles ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  bg:         { flex: 1, backgroundColor: C.background },
  centerFlex: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },

  // ── IDLE ──
  idleWrap:      { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  idleTitle:     { fontSize: 24, fontWeight: '900', color: C.textPrimary, textAlign: 'center', marginBottom: 6 },
  idleSub:       { fontSize: 13, color: C.textSecond, textAlign: 'center', marginBottom: 36 },
  idleVsRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginBottom: 10 },
  idleAvatar: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
  },
  idleAvatarEmoji: { fontSize: 38 },
  idleVsLabel:     { fontSize: 22, fontWeight: '900', color: C.textPrimary },
  idlePts:         { fontSize: 12, color: C.textSecond, textAlign: 'center', marginBottom: 32 },
  sectionLabel:    { fontSize: 12, fontWeight: '700', color: C.textSecond, marginBottom: 10 },
  modeRow:  { flexDirection: 'row', gap: 10, marginBottom: 32 },
  modeCard: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: C.surface, borderRadius: R.lg,
    paddingVertical: 14, borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  modeCardOn: { borderColor: C.primary, backgroundColor: C.primaryBg },
  modeIcon:   { fontSize: 22 },
  modeName:   { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  modeDiff:   { fontSize: 10, color: C.textSecond },
  errBox:     { backgroundColor: '#FFEBEE', borderRadius: R.sm, padding: 12, marginBottom: 14 },
  errTxt:     { color: C.error, fontSize: 13, textAlign: 'center' },
  bigBtn: {
    backgroundColor: C.primary, borderRadius: R.xl, paddingVertical: 18, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  bigBtnTxt: { fontSize: 16, fontWeight: '900', color: '#fff' },
  loginHint: { fontSize: 12, color: C.textSecond, textAlign: 'center', marginTop: 12 },

  // ── QUEUED / MATCH FOUND ──
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  queueAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 28, marginBottom: 24 },
  bigRing: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 14, elevation: 5,
  },
  bigEmoji:    { fontSize: 42 },
  vsHuge:      { fontSize: 24, fontWeight: '900', color: C.primaryDark },
  matchPlayer: { alignItems: 'center', gap: 10 },
  matchName:   { fontSize: 12, fontWeight: '600', color: C.textSecond, maxWidth: 90, textAlign: 'center' },
  readyTitle:  { fontSize: 26, fontWeight: '900', color: C.primaryDark, marginBottom: 8 },
  searchSub:   { fontSize: 14, color: C.textSecond, marginBottom: 32 },
  cancelBtn:   { paddingVertical: 10, paddingHorizontal: 20 },
  cancelTxt:   { fontSize: 14, color: C.primary, fontWeight: '600', textDecorationLine: 'underline' },
  countdownBig:{ fontSize: 72, fontWeight: '900', color: C.primary },

  // ── PLAYING: Battle Header ──
  battleBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  battleSide: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  battleRing: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 2.5,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF',
  },
  battleEmoji:    { fontSize: 22 },
  battleWho:      { fontSize: 11, color: C.textSecond, fontWeight: '600' },
  battleScoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  battleScoreNum: { fontSize: 20, fontWeight: '900', color: C.textPrimary },
  battleScoreOf:  { fontSize: 12, color: C.textSecond, fontWeight: '600' },
  battleVs:       { fontSize: 14, fontWeight: '900', color: C.textSecond },

  // Timer bar (thin line below header)
  timerTrack: { height: 3, backgroundColor: C.border },
  timerFill:  { height: 3 },

  // Body
  playBody: { flex: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, gap: 14 },
  opDoneBanner: {
    backgroundColor: '#FFFBEB', borderRadius: R.xs,
    paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#FFE082', alignItems: 'center',
  },
  opDoneTxt: { fontSize: 12, fontWeight: '600', color: '#856404' },

  // Question card
  qCard: {
    backgroundColor: C.surface, borderRadius: R.xl,
    paddingTop: 10, paddingBottom: 28, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
    minHeight: 110,
  },
  qCounter:     { fontSize: 11, color: C.textSecond, textAlign: 'right', marginBottom: 10 },
  questionText: { fontSize: 26, fontWeight: '700', color: C.textPrimary, textAlign: 'center', lineHeight: 38 },

  // Progress dots
  dots:      { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 4 },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: C.border },
  dotActive: { width: 14, height: 7, borderRadius: 4, backgroundColor: C.primary },

  // Comparison buttons (Image 4 style)
  compRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8,
  },
  compBtn: {
    flex: 1, paddingVertical: 24, borderRadius: R.xl,
    backgroundColor: C.primaryBg, alignItems: 'center',
    borderWidth: 2, borderColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  compBtnTxt: { fontSize: 30, fontWeight: '900', color: C.primaryDark },

  // Numeric keypad (Image 1 style)
  keypadWrap: { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  inputDisplay: {
    backgroundColor: C.primaryBg, borderRadius: R.md,
    height: 52, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.primary,
  },
  inputDisplayTxt: { fontSize: 26, fontWeight: '800', color: C.textPrimary },

  keyGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  key: {
    width: '30%', aspectRatio: 1.3,
    backgroundColor: C.surface, borderRadius: R.md,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 5, elevation: 2,
  },
  keyTxt:  { fontSize: 24, fontWeight: '700', color: C.textPrimary },
  keyRow0: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  keyRowBottom: { flexDirection: 'row', gap: 10 },
  keyXoa: {
    flex: 1, paddingVertical: 14,
    backgroundColor: '#FFEBEB', borderRadius: R.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFCDD2',
  },
  keyXoaTxt: { fontSize: 15, fontWeight: '700', color: C.error },
  keySubmit: {
    flex: 2, paddingVertical: 14,
    backgroundColor: C.primary, borderRadius: R.md,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  keySubmitTxt: { fontSize: 15, fontWeight: '900', color: '#fff' },

  // Waiting / disconnected
  waitTitle: { fontSize: 22, fontWeight: '700', color: C.textPrimary, textAlign: 'center', marginBottom: 8 },
  waitSub:   { fontSize: 14, color: C.textSecond, textAlign: 'center' },
});
