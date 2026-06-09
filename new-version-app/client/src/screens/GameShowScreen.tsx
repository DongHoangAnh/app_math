import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGameShowWS } from '../hooks/useGameShowWS';
import { useAuth } from '../hooks/useAuth';
import { useFeedback } from '../hooks/useFeedback';
import GameResults from '../components/GameResults';
import { supabase } from '../services/supabase';
import { gameApi } from '../services/api';
import { QUESTION_SECONDS, VI_BANNED } from '../../../shared/constants';
import { countCorrect, sumTime, type FloatingEmoji } from './GameShow/utils';
import IdlePhase from './GameShow/IdlePhase';
import QueuedPhase from './GameShow/QueuedPhase';
import MatchFoundPhase from './GameShow/MatchFoundPhase';
import PlayingPhase from './GameShow/PlayingPhase';
import YouFinishedPhase from './GameShow/YouFinishedPhase';
import OpponentDisconnectedPhase from './GameShow/OpponentDisconnectedPhase';

// ── Component ────────────────────────────────────────────────────
// Glue only: owns game/WS state + timers, then hands each match phase to its
// dedicated view component under ./GameShow.
export default function GameShowScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const userId      = user?.id ?? null;
  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'Bạn';
  const grade = user?.user_metadata?.grade;

  const { state, joinQueue, leaveQueue, submitAnswer, resetGame, sendEmoji, sendChat } = useGameShowWS(userId, displayName, grade);

  const [selectedAnswer, setSelectedAnswer]   = useState<string | null>(null);
  const [revealState, setRevealState]         = useState<'hidden' | 'revealed'>('hidden');
  const [selectedDifficulty, setSelectedDifficulty] = useState(1);

  // Difficulty pre-selected from HomeScreen's quick-cards (tab nav param).
  useEffect(() => {
    const d = route.params?.difficulty;
    if (d) setSelectedDifficulty(d);
  }, [route.params?.difficulty]);
  const [countdown, setCountdown]             = useState(3);
  const [questionTimer, setQuestionTimer]     = useState(QUESTION_SECONDS);
  const [myRankingPoints, setMyRankingPoints] = useState<number | null>(null);
  const [myAvatarUrl, setMyAvatarUrl]         = useState<string | null>(null);
  const [myWins, setMyWins]                   = useState<number | null>(null);
  const [oppAvatarUrl, setOppAvatarUrl]       = useState<string | null>(null);
  const [oppWins, setOppWins]                 = useState<number | null>(null);
  const [numericInput, setNumericInput]       = useState('');
  const [chatInput, setChatInput]             = useState('');
  const [showChatInput, setShowChatInput]     = useState(false);
  const [floatingEmojis, setFloatingEmojis]   = useState<FloatingEmoji[]>([]);

  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhase         = useRef(state.phase);
  const prevQIdx          = useRef(state.currentQuestionIndex);
  const submitAnswerRef   = useRef(submitAnswer);
  const selectedAnswerRef = useRef<string | null>(null);
  const currentIdxRef     = useRef(state.currentQuestionIndex);
  const roomIdRef         = useRef(state.roomId);
  const chatScrollRef     = useRef<ScrollView | null>(null);
  const prevChatLenRef    = useRef(0);

  useEffect(() => { submitAnswerRef.current = submitAnswer; }, [submitAnswer]);
  useEffect(() => { selectedAnswerRef.current = selectedAnswer; }, [selectedAnswer]);
  useEffect(() => { currentIdxRef.current = state.currentQuestionIndex; }, [state.currentQuestionIndex]);
  useEffect(() => { roomIdRef.current = state.roomId; }, [state.roomId]);

  // ── Juicy feedback (sound + haptics + pulse/shake) ─────────────
  const fb = useFeedback();
  const scoreScale = useRef(new Animated.Value(1)).current;   // my-score pulse on correct
  const shakeX     = useRef(new Animated.Value(0)).current;   // question-card shake on wrong
  const prevAnswersLen = useRef(0);

  const pulseScore = useCallback(() => {
    Animated.sequence([
      Animated.spring(scoreScale, { toValue: 1.18, useNativeDriver: true, tension: 280, friction: 6 }),
      Animated.spring(scoreScale, { toValue: 1,    useNativeDriver: true, tension: 280, friction: 6 }),
    ]).start();
  }, [scoreScale]);

  const shakeCard = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeX]);

  // Fire feedback when a new answer lands in myAnswers (server is source of truth;
  // a timeout is recorded as isCorrect:false → plays the "wrong" feedback).
  useEffect(() => {
    const len = Object.keys(state.myAnswers).length;
    if (len > prevAnswersLen.current) {
      const newIdx = prevAnswersLen.current;          // answers fill sequentially
      const rec = state.myAnswers[newIdx];
      if (rec) {
        if (rec.isCorrect) { fb.correct(); pulseScore(); }
        else               { fb.wrong();   shakeCard(); }
      }
    }
    prevAnswersLen.current = len;
  }, [state.myAnswers, fb, pulseScore, shakeCard]);

  // Fetch ranking points + avatar (Supabase) and win count (stats API) —
  // avatar/wins feed the VS matchmaking splash.
  useEffect(() => {
    if (!userId) return;
    if (state.phase !== 'idle' && state.phase !== 'game_over') return;
    supabase
      .from('user_profiles')
      .select('ranking_points,avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setMyRankingPoints(data.ranking_points);
          setMyAvatarUrl(data.avatar_url ?? null);
        }
      });
    gameApi.getStats(userId)
      .then(stats => setMyWins(stats.totalWins))
      .catch(() => {});
  }, [userId, state.phase]);

  // Fetch opponent's public profile (avatar + wins) once matched.
  useEffect(() => {
    const oppId = state.opponent?.userId;
    if (!oppId) { setOppAvatarUrl(null); setOppWins(null); return; }
    let alive = true;
    gameApi.getOpponentProfile(oppId)
      .then(p => {
        if (!alive) return;
        setOppAvatarUrl(p.avatarUrl);
        setOppWins(p.stats?.totalWins ?? null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [state.opponent?.userId]);

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

  // ── Floating emoji (Google Meet style) ────────────────────────
  const spawnFloatingEmoji = useCallback((emoji: string, isMe: boolean) => {
    const id = `fe_${Date.now()}_${Math.floor(Math.random() * 999)}`;
    const y       = new Animated.Value(0);
    const opacity = new Animated.Value(0);
    const scale   = new Animated.Value(0.1);
    const xShift  = Math.floor(Math.random() * 28);

    // Keep at most 8 simultaneous emojis
    setFloatingEmojis(prev => [...prev.slice(-7), { id, emoji, isMe, y, opacity, scale, xShift }]);

    Animated.sequence([
      // Phase 1 — pop in
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.2, useNativeDriver: true, tension: 280, friction: 6 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      // Phase 2 — float up; fade starts at 700 ms, gone by 1900 ms
      Animated.parallel([
        Animated.timing(y, { toValue: -250, duration: 2000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.9, duration: 2000, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(700),
          Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
      ]),
    ]).start(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)));
  }, []);

  // Spawn animation when a new emoji message arrives
  useEffect(() => {
    const msgs = state.chatMessages;
    if (msgs.length > prevChatLenRef.current) {
      msgs.slice(prevChatLenRef.current).forEach(msg => {
        if (msg.type === 'emoji' && msg.emoji) {
          spawnFloatingEmoji(msg.emoji, msg.fromUserId === userId);
        }
      });
    }
    prevChatLenRef.current = msgs.length;
  }, [state.chatMessages, userId, spawnFloatingEmoji]);

  // Auto-dismiss text input when question advances
  useEffect(() => {
    if (state.phase === 'playing') setShowChatInput(false);
  }, [state.currentQuestionIndex, state.phase]);

  // ── Chat send ──────────────────────────────────────────────────
  const handleSendChat = useCallback((keepOpen = false) => {
    const text = chatInput.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    if (VI_BANNED.some(w => lower.includes(w))) {
      setChatInput('');
      return;
    }
    sendChat(text);
    setChatInput('');
    if (!keepOpen) setShowChatInput(false);
  }, [chatInput, sendChat]);

  // ── Handlers ──────────────────────────────────────────────────
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
    joinQueue(selectedDifficulty);
  };

  // "Về trang chủ" on the results screen → back to the PK mode-select (idle).
  const handleBackToIdle = () => {
    setSelectedAnswer(null);
    setRevealState('hidden');
    setNumericInput('');
    resetGame();
  };

  const myScore = countCorrect(state.myAnswers);
  const myTime  = sumTime(state.myAnswers);
  const total   = state.questions.length || 10;

  // ── Phase routing ──────────────────────────────────────────────
  if (state.phase === 'idle') {
    return (
      <IdlePhase
        myRankingPoints={myRankingPoints}
        myAvatarUrl={myAvatarUrl}
        error={state.error}
        userId={userId}
        onJoin={(difficulty) => { setSelectedDifficulty(difficulty); joinQueue(difficulty); }}
        onHistory={() => navigation.navigate('MatchHistoryTab')}
      />
    );
  }

  if (state.phase === 'queued') {
    return (
      <QueuedPhase
        displayName={displayName}
        avatarUrl={myAvatarUrl}
        wins={myWins}
        onCancel={leaveQueue}
      />
    );
  }

  if (state.phase === 'match_found') {
    return (
      <MatchFoundPhase
        displayName={displayName}
        myAvatarUrl={myAvatarUrl}
        myWins={myWins}
        opponentName={state.opponent?.displayName ?? 'Đối thủ'}
        oppAvatarUrl={oppAvatarUrl}
        oppWins={oppWins}
        countdown={countdown}
      />
    );
  }

  if (state.phase === 'playing') {
    return (
      <PlayingPhase
        state={state}
        userId={userId}
        questionTimer={questionTimer}
        myScore={myScore}
        total={total}
        scoreScale={scoreScale}
        shakeX={shakeX}
        floatingEmojis={floatingEmojis}
        selectedAnswer={selectedAnswer}
        revealState={revealState}
        numericInput={numericInput}
        showChatInput={showChatInput}
        chatInput={chatInput}
        onChangeChat={setChatInput}
        onToggleChat={() => setShowChatInput(v => !v)}
        onSendChat={() => handleSendChat(false)}
        onEmoji={sendEmoji}
        onAnswer={handleAnswer}
        onNumericKey={handleNumericKey}
        onNumericSubmit={handleNumericSubmit}
      />
    );
  }

  if (state.phase === 'you_finished') {
    return (
      <YouFinishedPhase
        myScore={myScore}
        total={total}
        opponentAnsweredCount={state.opponentAnsweredCount}
        floatingEmojis={floatingEmojis}
        chatMessages={state.chatMessages}
        userId={userId}
        chatScrollRef={chatScrollRef}
        chatInput={chatInput}
        onChangeChat={setChatInput}
        onSendChat={() => handleSendChat(true)}
        onEmoji={sendEmoji}
      />
    );
  }

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
        myName={displayName}
        oppName={state.opponent?.displayName}
        myAvatarUrl={myAvatarUrl}
        oppAvatarUrl={oppAvatarUrl}
        myWins={myWins}
        oppWins={oppWins}
        onPlayAgain={handlePlayAgain}
        onHome={handleBackToIdle}
      />
    );
  }

  if (state.phase === 'opponent_disconnected') {
    return (
      <OpponentDisconnectedPhase
        rankingDelta={state.myRankingDelta}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return null;
}
