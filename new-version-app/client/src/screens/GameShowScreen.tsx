import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useGameShowWS } from '../hooks/useGameShowWS';
import { useAuth } from '../hooks/useAuth';
import GameQuestion from '../components/GameQuestion';
import GameResults from '../components/GameResults';
import { supabase } from '../services/supabase';

// ── Design tokens ────────────────────────────────────────────
const C = {
  blue:        '#4A7FF5',
  blueDark:    '#3B5FCC',
  bgLight:     '#F0F4FF',
  navy:        '#1A1F4E',
  yellow:      '#FFD600',
  green:       '#1D9E75',
  red:         '#E24B4A',
  border:      '#D0DCFF',
  white:       '#FFFFFF',
};

const MODES = [
  { id: 'add_sub', label: 'Cộng/Trừ', desc: 'Dễ',  icon: '➕' },
  { id: 'mul_div', label: 'Nhân/Chia', desc: 'Khó', icon: '✖️' },
  { id: 'mixed',   label: 'Hỗn hợp',  desc: 'Thử', icon: '🔀' },
];

const QUESTION_SECONDS = 10;

// ── Helpers ───────────────────────────────────────────────────
function countCorrect(answers: Record<number, { isCorrect: boolean }>) {
  return Object.values(answers).filter((a) => a.isCorrect).length;
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

// ── Component ─────────────────────────────────────────────────
export default function GameShowScreen() {
  const { user } = useAuth();
  const userId      = user?.id ?? null;
  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'Bạn';
  const grade = user?.user_metadata?.grade;

  const { state, joinQueue, leaveQueue, submitAnswer } = useGameShowWS(userId, displayName, grade);

  const [selectedAnswer, setSelectedAnswer]     = useState<string | null>(null);
  const [revealState, setRevealState]           = useState<'hidden' | 'revealed'>('hidden');
  const [selectedMode, setSelectedMode]         = useState('add_sub');
  const [countdown, setCountdown]               = useState(3);
  const [questionTimer, setQuestionTimer]       = useState(QUESTION_SECONDS);
  const [myRankingPoints, setMyRankingPoints]   = useState<number | null>(null);

  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhase      = useRef(state.phase);
  const prevQIdx       = useRef(state.currentQuestionIndex);
  const submitAnswerRef = useRef(submitAnswer);
  const selectedAnswerRef = useRef<string | null>(null);
  const currentIdxRef  = useRef(state.currentQuestionIndex);
  const roomIdRef      = useRef(state.roomId);
  useEffect(() => { submitAnswerRef.current = submitAnswer; }, [submitAnswer]);
  useEffect(() => { selectedAnswerRef.current = selectedAnswer; }, [selectedAnswer]);
  useEffect(() => { currentIdxRef.current = state.currentQuestionIndex; }, [state.currentQuestionIndex]);
  useEffect(() => { roomIdRef.current = state.roomId; }, [state.roomId]);

  // ── Fetch ranking points (lobby + after game) ─────────────
  useEffect(() => {
    if (!userId) return;
    if (state.phase !== 'idle' && state.phase !== 'game_over') return;
    supabase
      .from('user_profiles')
      .select('ranking_points')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) setMyRankingPoints(data.ranking_points);
      });
  }, [userId, state.phase]);

  // ── Question countdown timer ──────────────────────────────
  useEffect(() => {
    if (state.phase !== 'playing') {
      timerRef.current && clearInterval(timerRef.current);
      setQuestionTimer(QUESTION_SECONDS);
      return;
    }

    // Reset when question advances
    if (state.currentQuestionIndex !== prevQIdx.current || prevPhase.current !== 'playing') {
      prevQIdx.current = state.currentQuestionIndex;
      setQuestionTimer(QUESTION_SECONDS);
      setRevealState('hidden');
      setSelectedAnswer(null);

      timerRef.current && clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setQuestionTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            // Auto-submit if player hasn't answered yet
            if (!selectedAnswerRef.current && roomIdRef.current) {
              setSelectedAnswer('__timeout__');
              setRevealState('revealed');
              submitAnswerRef.current(currentIdxRef.current, '__timeout__');
              setTimeout(() => {
                setRevealState('hidden');
                setSelectedAnswer(null);
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

  // ── Countdown for match_found ─────────────────────────────
  useEffect(() => {
    if (state.phase !== 'match_found') return;
    setCountdown(3);
    const id = setInterval(() => {
      setCountdown((c) => (c <= 1 ? (clearInterval(id), 0) : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  // ── Handlers ──────────────────────────────────────────────
  const handleAnswer = (answer: string) => {
    if (!state.roomId || selectedAnswer || revealState === 'revealed') return;
    timerRef.current && clearInterval(timerRef.current);
    setSelectedAnswer(answer);
    setRevealState('revealed');
    submitAnswer(state.currentQuestionIndex, answer);
    setTimeout(() => {
      setRevealState('hidden');
      setSelectedAnswer(null);
    }, 600);
  };

  const handlePlayAgain = () => {
    setSelectedAnswer(null);
    setRevealState('hidden');
    joinQueue();
  };

  const myScore = countCorrect(state.myAnswers);
  const myTime  = sumTime(state.myAnswers);
  const total   = state.questions.length || 10;

  // ═══════════════════════════════════════════════════════════
  // IDLE — Lobby
  // ═══════════════════════════════════════════════════════════
  if (state.phase === 'idle') {
    return (
      <View style={styles.lobbyBg}>
        <SafeAreaView style={styles.lobbySafe}>
          <TopBar title="1v1 Battle" />

          <VersusRow
            myInitial={initials(displayName)}
            myName={displayName}
            opponentInitial="?"
            opponentName="---"
            myRankingPoints={myRankingPoints}
          />

          <ModeSelector
            modes={MODES}
            selected={selectedMode}
            onSelect={setSelectedMode}
          />

          {state.error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.ctaYellow, !userId && { opacity: 0.5 }]}
            onPress={joinQueue}
            disabled={!userId}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaYellowText}>Vào trận ngay</Text>
          </TouchableOpacity>

          {!userId && (
            <Text style={styles.hintText}>Vui lòng đăng nhập để chơi</Text>
          )}
        </SafeAreaView>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // QUEUED — Searching
  // ═══════════════════════════════════════════════════════════
  if (state.phase === 'queued') {
    return (
      <View style={styles.lobbyBg}>
        <SafeAreaView style={styles.lobbySafe}>
          <TopBar title="1v1 Battle" />

          <VersusRow
            myInitial={initials(displayName)}
            myName={displayName}
            opponentInitial="?"
            opponentName="---"
            searching
            myRankingPoints={myRankingPoints}
          />

          <Text style={styles.searchingLabel}>● Đang tìm đối thủ...</Text>

          <View style={[styles.modeRow, { opacity: 0.5 }]}>
            {MODES.map((m) => (
              <View key={m.id} style={[styles.modeCard, selectedMode === m.id && styles.modeCardSelected]}>
                <Text style={styles.modeIcon}>{m.icon}</Text>
                <Text style={styles.modeLabel}>{m.label}</Text>
                <Text style={styles.modeDesc}>{m.desc}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.ctaOutline} onPress={leaveQueue} activeOpacity={0.8}>
            <Text style={styles.ctaOutlineText}>Hủy tìm trận</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // MATCH FOUND — Countdown
  // ═══════════════════════════════════════════════════════════
  if (state.phase === 'match_found') {
    const firstQ = state.questions[0] ? adaptQuestion(state.questions[0]) : null;

    return (
      <SafeAreaView style={styles.countdownSafe}>
        {/* Players */}
        <View style={styles.countdownPlayers}>
          <CountdownPlayer
            initial={initials(displayName)}
            name={displayName}
            color={C.blue}
            score={0}
          />
          <CountdownPlayer
            initial={initials(state.opponent?.displayName ?? '?')}
            name={state.opponent?.displayName ?? 'Đối thủ'}
            color={C.red}
            score={0}
          />
        </View>

        {/* Info bar */}
        <View style={styles.matchInfoBar}>
          <Text style={styles.matchInfoText}>
            10 câu · {MODES.find((m) => m.id === selectedMode)?.label ?? 'Hỗn hợp'}
          </Text>
        </View>

        {/* Countdown number */}
        <View style={styles.countdownCenter}>
          <Text style={styles.countdownNum}>{countdown > 0 ? countdown : '🚀'}</Text>
          <Text style={styles.countdownSub}>Sẵn sàng!</Text>
        </View>

        {/* Preview */}
        {firstQ && (
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>Câu hỏi sẽ là...</Text>
            <Text style={styles.previewQuestion}>{firstQ.text}</Text>
            <View style={styles.previewOptions}>
              {firstQ.options.map((opt: string, i: number) => (
                <View key={i} style={styles.previewOption}>
                  <Text style={styles.previewOptionText}>{opt}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // PLAYING
  // ═══════════════════════════════════════════════════════════
  if (state.phase === 'playing') {
    const current = state.currentQuestionIndex;
    const rawQ    = state.questions[current];
    const opponentName = state.opponent?.displayName ?? 'Đối thủ';
    const timerPct = (questionTimer / QUESTION_SECONDS) * 100;
    const timerColor = questionTimer > 5 ? C.blue : questionTimer >= 3 ? C.yellow : C.red;

    const dotResults: Array<'correct' | 'wrong' | 'pending'> = Array.from(
      { length: total },
      (_, i) =>
        state.myAnswers[i] !== undefined
          ? state.myAnswers[i].isCorrect ? 'correct' : 'wrong'
          : 'pending',
    );

    if (!rawQ) {
      return (
        <SafeAreaView style={styles.gameplaySafe}>
          <View style={styles.centerFlex}>
            <Text style={{ color: C.blue, fontSize: 14 }}>Đang tải câu hỏi...</Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.gameplaySafe}>
        {/* Battle Header */}
        <View style={styles.battleHeader}>
          <View style={styles.battleHeaderRow}>
            <View style={styles.battlePlayerLeft}>
              <View style={[styles.battleAvatar, { backgroundColor: C.blue }]}>
                <Text style={styles.battleAvatarText}>{initials(displayName)}</Text>
              </View>
              <View>
                <Text style={styles.battleName} numberOfLines={1}>{displayName.split(' ').pop()}</Text>
                <Text style={styles.battleScore}>{myScore}</Text>
              </View>
            </View>

            <Text style={styles.questionCounter}>Câu {current + 1}/{total}</Text>

            <View style={styles.battlePlayerRight}>
              <View>
                <Text style={[styles.battleName, { textAlign: 'right' }]} numberOfLines={1}>
                  {opponentName.split(' ').pop()}
                </Text>
                <Text style={[styles.battleScore, { textAlign: 'right' }]}>
                  {state.opponentAnsweredCount}
                </Text>
              </View>
              <View style={[styles.battleAvatar, { backgroundColor: C.red }]}>
                <Text style={styles.battleAvatarText}>{initials(opponentName)}</Text>
              </View>
            </View>
          </View>

          {/* Timer bar */}
          <View style={styles.timerRow}>
            <Text style={styles.timerIcon}>⏱</Text>
            <View style={styles.timerTrack}>
              <View
                style={[styles.timerFill, {
                  width: `${timerPct}%` as any,
                  backgroundColor: timerColor,
                }]}
              />
            </View>
            <Text style={styles.timerSeconds}>{Math.ceil(questionTimer)}s</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.gameplayBody}>
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
            revealState={revealState}
          />

          {/* Progress dots */}
          <View style={styles.progressDots}>
            {dotResults.map((r, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  r === 'correct' && { backgroundColor: C.green },
                  r === 'wrong'   && { backgroundColor: C.red },
                  i === current && r === 'pending' && styles.dotCurrent,
                ]}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // YOU FINISHED
  // ═══════════════════════════════════════════════════════════
  if (state.phase === 'you_finished') {
    return (
      <SafeAreaView style={styles.gameplaySafe}>
        <View style={styles.centerFlex}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>✅</Text>
          <Text style={styles.waitTitle}>Bạn đã hoàn thành!</Text>
          <Text style={styles.waitSub}>
            Đang chờ đối thủ · {state.opponentAnsweredCount}/{total} câu
          </Text>
          <Text style={[styles.waitSub, { marginTop: 20, color: C.blue }]}>
            Điểm của bạn: {myScore}/{total}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // GAME OVER
  // ═══════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════
  // OPPONENT DISCONNECTED
  // ═══════════════════════════════════════════════════════════
  if (state.phase === 'opponent_disconnected') {
    return (
      <SafeAreaView style={styles.gameplaySafe}>
        <View style={styles.centerFlex}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🏃</Text>
          <Text style={styles.waitTitle}>Đối thủ bỏ cuộc!</Text>
          <Text style={[styles.waitSub, { marginBottom: 28 }]}>Bạn thắng mặc định</Text>
          {state.myRankingDelta != null && (
            <View style={[styles.ctaYellow, { width: '80%', marginBottom: 16 }]}>
              <Text style={[styles.ctaYellowText]}>+{state.myRankingDelta} điểm 🏆</Text>
            </View>
          )}
          <TouchableOpacity style={[styles.ctaBlue, { width: '80%' }]} onPress={handlePlayAgain} activeOpacity={0.85}>
            <Text style={styles.ctaBlueText}>Chơi Trận Mới</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Sub-components ────────────────────────────────────────────

function TopBar({ title }: { title: string }) {
  return (
    <View style={styles.topBar}>
      <Text style={styles.topBarTitle}>{title}</Text>
    </View>
  );
}

function VersusRow({
  myInitial, myName, opponentInitial, opponentName, searching, myRankingPoints,
}: {
  myInitial: string; myName: string;
  opponentInitial: string; opponentName: string;
  searching?: boolean;
  myRankingPoints?: number | null;
}) {
  return (
    <View style={styles.versusRow}>
      <View style={styles.playerSlot}>
        <View style={[styles.avatarLarge, { backgroundColor: C.blue }]}>
          <Text style={styles.avatarLargeText}>{myInitial}</Text>
        </View>
        <Text style={styles.playerSlotName} numberOfLines={1}>{myName}</Text>
        <Text style={styles.playerSlotElo}>{myRankingPoints != null ? `${myRankingPoints} pts` : '--- pts'}</Text>
      </View>

      <View style={styles.vsBadge}>
        <Text style={styles.vsText}>VS</Text>
      </View>

      <View style={styles.playerSlot}>
        <View style={[styles.avatarLarge, styles.avatarPlaceholder, searching && styles.avatarPulse]}>
          <Text style={styles.avatarPlaceholderText}>{opponentInitial}</Text>
        </View>
        <Text style={styles.playerSlotName}>{opponentName}</Text>
        <Text style={styles.playerSlotElo}>--- pts</Text>
      </View>
    </View>
  );
}

function ModeSelector({ modes, selected, onSelect }: {
  modes: typeof MODES; selected: string; onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.modeRow}>
      {modes.map((m) => (
        <TouchableOpacity
          key={m.id}
          style={[styles.modeCard, selected === m.id && styles.modeCardSelected]}
          onPress={() => onSelect(m.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.modeIcon}>{m.icon}</Text>
          <Text style={styles.modeLabel}>{m.label}</Text>
          <Text style={styles.modeDesc}>{m.desc}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function CountdownPlayer({ initial, name, color, score }: {
  initial: string; name: string; color: string; score: number;
}) {
  return (
    <View style={styles.countdownPlayer}>
      <View style={[styles.countdownAvatar, { backgroundColor: color }]}>
        <Text style={styles.countdownAvatarText}>{initial}</Text>
      </View>
      <Text style={styles.countdownPlayerName} numberOfLines={1}>{name}</Text>
      <Text style={styles.countdownPlayerScore}>{score}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Lobby
  lobbyBg:      { flex: 1, backgroundColor: C.blue },
  lobbySafe:    { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  topBarTitle:  { fontSize: 15, fontWeight: '500', color: C.white },

  versusRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 28,
  },
  playerSlot:          { flex: 1, alignItems: 'center', gap: 6 },
  avatarLarge: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarLargeText:     { fontSize: 22, fontWeight: '500', color: C.white },
  avatarPlaceholder:   { borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.1)' },
  avatarPulse:         { opacity: 0.7 },
  avatarPlaceholderText: { fontSize: 20, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  playerSlotName:      { fontSize: 11, color: C.white, fontWeight: '400', textAlign: 'center' },
  playerSlotElo:       { fontSize: 9, color: 'rgba(255,255,255,0.6)' },

  vsBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.yellow, justifyContent: 'center', alignItems: 'center',
  },
  vsText: { fontSize: 11, fontWeight: '500', color: '#333' },

  searchingLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 16 },

  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  modeCard: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 6,
  },
  modeCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  modeIcon:  { fontSize: 18 },
  modeLabel: { fontSize: 9, fontWeight: '500', color: C.white },
  modeDesc:  { fontSize: 8, color: 'rgba(255,255,255,0.6)' },

  ctaYellow: {
    backgroundColor: C.yellow, paddingVertical: 10,
    borderRadius: 24, alignItems: 'center', alignSelf: 'center',
    width: '80%',
  },
  ctaYellowText: { fontSize: 12, fontWeight: '500', color: '#333' },
  ctaBlue: {
    backgroundColor: C.blue, paddingVertical: 10,
    borderRadius: 24, alignItems: 'center', alignSelf: 'center',
  },
  ctaBlueText:   { fontSize: 12, fontWeight: '500', color: C.white },
  ctaOutline: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 10, borderRadius: 24, alignItems: 'center', alignSelf: 'center',
    width: '80%',
  },
  ctaOutlineText: { fontSize: 12, fontWeight: '500', color: C.white },

  errorBox: {
    backgroundColor: 'rgba(226,75,74,0.15)', borderRadius: 8,
    padding: 10, marginBottom: 12,
  },
  errorText: { color: '#FFB3B3', fontSize: 12, textAlign: 'center' },
  hintText:  { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 10 },

  // Countdown
  countdownSafe:    { flex: 1, backgroundColor: C.navy, paddingHorizontal: 20 },
  countdownPlayers: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 20, paddingBottom: 12,
  },
  countdownPlayer: { flex: 1, alignItems: 'center', gap: 4 },
  countdownAvatar: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  countdownAvatarText:  { fontSize: 16, fontWeight: '500', color: C.white },
  countdownPlayerName:  { fontSize: 9, color: 'rgba(255,255,255,0.7)' },
  countdownPlayerScore: { fontSize: 14, fontWeight: '500', color: C.yellow },

  matchInfoBar: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'center', marginBottom: 8,
  },
  matchInfoText: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },

  countdownCenter: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  countdownNum:    { fontSize: 64, fontWeight: '500', color: C.yellow },
  countdownSub:    { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  previewBox: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10,
    padding: 12, marginBottom: 20,
  },
  previewLabel:      { fontSize: 8, color: 'rgba(255,255,255,0.5)', marginBottom: 6 },
  previewQuestion:   { fontSize: 16, fontWeight: '500', color: C.white, textAlign: 'center', marginBottom: 8 },
  previewOptions:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  previewOption: {
    flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6, paddingVertical: 6, alignItems: 'center', opacity: 0.5,
  },
  previewOptionText: { fontSize: 12, color: C.white },

  // Gameplay
  gameplaySafe: { flex: 1, backgroundColor: C.bgLight },
  centerFlex:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },

  battleHeader: {
    backgroundColor: C.blue,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8,
  },
  battleHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  battlePlayerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  battlePlayerRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' },
  battleAvatar: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  battleAvatarText: { fontSize: 12, fontWeight: '500', color: C.white },
  battleName:       { fontSize: 8, color: 'rgba(255,255,255,0.8)' },
  battleScore:      { fontSize: 16, fontWeight: '500', color: C.white },
  questionCounter:  { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '400' },

  timerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  timerIcon:    { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  timerTrack: {
    flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2, overflow: 'hidden',
  },
  timerFill: { height: '100%', borderRadius: 2 },
  timerSeconds: { fontSize: 10, color: C.yellow, minWidth: 22, textAlign: 'right' },

  gameplayBody: {
    flex: 1, padding: 16, justifyContent: 'center', gap: 16,
  },
  opponentDoneBanner: {
    backgroundColor: '#FFFBEB', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#FFE082',
  },
  opponentDoneText: { fontSize: 12, fontWeight: '500', color: '#856404' },

  progressDots: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 4, paddingVertical: 4,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#E0E8FF',
  },
  dotCurrent: {
    borderWidth: 2, borderColor: C.blue, backgroundColor: 'transparent',
  },

  // Waiting
  waitTitle: { fontSize: 20, fontWeight: '500', color: C.navy, marginBottom: 8, textAlign: 'center' },
  waitSub:   { fontSize: 13, color: '#666', textAlign: 'center' },
});
