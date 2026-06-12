import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useFeedback } from '../hooks/useFeedback';
import { gameApi } from '../services/api';
import { generateQuestion } from '../../../shared/questions';
import { presetConfig, type PracticePresetId } from '../../../shared/constants';
import type {
  PracticeConfig, PracticeResult, GameQuestion, GameDifficulty, PracticeEndReason, PracticeOp,
} from '../../../shared/types';
import ConfigPhase from './Practice/ConfigPhase';
import PlayPhase from './Practice/PlayPhase';
import SummaryPhase from './Practice/SummaryPhase';
import {
  applyRampStep, opOfQuestion, emptyPerOp, pickWeakOps, type RampState, type RampChange,
} from './Practice/utils';

type Phase = 'config' | 'playing' | 'summary';

export default function PracticeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const fb = useFeedback();

  const [phase, setPhase] = useState<Phase>('config');
  const [config, setConfig] = useState<PracticeConfig | null>(null);
  const [question, setQuestion] = useState<GameQuestion | null>(null);
  const [numericInput, setNumericInput] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timer, setTimer] = useState(0);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [weakOpsHint, setWeakOpsHint] = useState<PracticeOp[] | null | undefined>(undefined);

  // Mutable session accumulators (refs so timers read fresh values).
  const ramp = useRef<RampState>({ difficulty: 1, correctStreak: 0, wrongStreak: 0 });
  const perOp = useRef(emptyPerOp());
  const answered = useRef(0);
  const correctCount = useRef(0);
  const totalTimeMs = useRef(0);
  const bestStreak = useRef(0);
  const curStreak = useRef(0);
  const questionStart = useRef(0);
  const perQTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [difficulty, setDifficulty] = useState<GameDifficulty>(1);
  const [rampToast, setRampToast] = useState<RampChange>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const clearTimers = useCallback(() => {
    perQTimer.current && clearInterval(perQTimer.current);
    sessionTimer.current && clearInterval(sessionTimer.current);
    perQTimer.current = null;
    sessionTimer.current = null;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Resolve weak ops once for the config screen hint / weak-spot preset.
  useEffect(() => {
    if (!userId) return;
    gameApi.getPracticeSummary(userId)
      .then((sum) => setWeakOpsHint(pickWeakOps(sum.perOp)))
      .catch(() => setWeakOpsHint(null));
  }, [userId]);

  const buildResult = useCallback((reason: PracticeEndReason, cfg: PracticeConfig): PracticeResult => ({
    config: cfg,
    total: answered.current,
    correct: correctCount.current,
    totalTimeMs: totalTimeMs.current,
    perOp: perOp.current,
    bestStreak: bestStreak.current,
    finalDifficulty: ramp.current.difficulty,
    endedReason: reason,
  }), []);

  const endSession = useCallback((reason: PracticeEndReason, cfg: PracticeConfig) => {
    clearTimers();
    const res = buildResult(reason, cfg);
    if (res.total > 0) {
      setResult(res);
      setPhase('summary');
      if (userId) gameApi.savePracticeSession(res).catch(() => {});
    } else {
      setPhase('config'); // empty session discarded
    }
  }, [clearTimers, buildResult, userId]);

  // Refs let nextQuestion's timer callback reach handleAnswer without a
  // declaration cycle (handleAnswer also depends on nextQuestion).
  const handleAnswerRef = useRef<(answer: string, cfg: PracticeConfig) => void>(() => {});

  const shouldEnd = (cfg: PracticeConfig): boolean => {
    if (cfg.session.kind === 'fixed') return answered.current >= (cfg.session.count ?? 10);
    return false; // endless ends on quit; timed ends on the session timer
  };

  const showRampToast = (change: RampChange) => {
    setRampToast(change);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setRampToast(null));
  };

  const nextQuestion = useCallback((cfg: PracticeConfig) => {
    const q = generateQuestion(ramp.current.difficulty, { ops: cfg.ops });
    setQuestion(q);
    setNumericInput('');
    setSelectedAnswer(null);
    setRevealed(false);
    questionStart.current = Date.now();
    if (cfg.timer.enabled) {
      setTimer(cfg.timer.perQuestionSeconds ?? 10);
      perQTimer.current && clearInterval(perQTimer.current);
      perQTimer.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(perQTimer.current!);
            handleAnswerRef.current('__timeout__', cfg);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
  }, []);

  const handleAnswer = useCallback((answer: string, cfg: PracticeConfig) => {
    if (selectedAnswer || revealed || !question) return;
    perQTimer.current && clearInterval(perQTimer.current);
    const wasCorrect = answer === question.correctAnswer;
    const op = opOfQuestion(question);

    perOp.current[op] = {
      attempted: perOp.current[op].attempted + 1,
      correct: perOp.current[op].correct + (wasCorrect ? 1 : 0),
    };
    answered.current += 1;
    totalTimeMs.current += Math.max(0, Date.now() - questionStart.current);
    if (wasCorrect) {
      correctCount.current += 1;
      curStreak.current += 1;
      bestStreak.current = Math.max(bestStreak.current, curStreak.current);
      fb.correct();
    } else {
      curStreak.current = 0;
      fb.wrong();
    }

    // Ramp
    let change: RampChange = null;
    if (cfg.ramp.enabled) {
      const r = applyRampStep(ramp.current, wasCorrect, cfg.ramp);
      ramp.current = r.next;
      change = r.change;
      setDifficulty(r.next.difficulty);
      if (change) showRampToast(change);
    }

    setSelectedAnswer(answer);
    setRevealed(true);

    // Advance after a short reveal, then check end conditions.
    setTimeout(() => {
      if (shouldEnd(cfg)) { endSession('completed', cfg); return; }
      nextQuestion(cfg);
    }, 600);
  }, [selectedAnswer, revealed, question, fb, nextQuestion, endSession]);

  // Keep the ref pointing at the latest handleAnswer for timer callbacks.
  handleAnswerRef.current = handleAnswer;

  const startSession = useCallback((cfg: PracticeConfig, preset: PracticePresetId) => {
    // Resolve weak-spot ops if requested and we have data.
    let resolved = cfg;
    if (cfg.weakSpot && weakOpsHint) resolved = { ...cfg, ops: weakOpsHint };

    // Reset accumulators.
    ramp.current = { difficulty: resolved.difficulty, correctStreak: 0, wrongStreak: 0 };
    perOp.current = emptyPerOp();
    answered.current = 0; correctCount.current = 0; totalTimeMs.current = 0;
    bestStreak.current = 0; curStreak.current = 0;
    setDifficulty(resolved.difficulty);
    setConfig(resolved);
    setPhase('playing');
    nextQuestion(resolved);

    if (resolved.session.kind === 'timed') {
      setTimer(resolved.session.seconds ?? 60);
      sessionTimer.current && clearInterval(sessionTimer.current);
      sessionTimer.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) { clearInterval(sessionTimer.current!); endSession('timeup', resolved); return 0; }
          return t - 1;
        });
      }, 1000);
    }
  }, [weakOpsHint, nextQuestion, endSession]);

  const onQuit = useCallback(() => {
    if (!config) return;
    Alert.alert('Dừng luyện tập?', 'Kết quả phần đã làm vẫn được lưu.', [
      { text: 'Tiếp tục', style: 'cancel' },
      { text: 'Dừng', style: 'destructive', onPress: () => endSession('quit', config) },
    ]);
  }, [config, endSession]);

  // ── Routing ──
  if (phase === 'config') {
    return <ConfigPhase onStart={startSession} weakOpsHint={weakOpsHint} />;
  }

  if (phase === 'playing' && question && config) {
    const rampHint = config.ramp.enabled
      ? `Đúng ${ramp.current.correctStreak}/${config.ramp.upStreak} để lên cấp`
      : undefined;
    const total = config.session.kind === 'fixed' ? (config.session.count ?? 10) : null;
    const progressLabel = config.session.kind === 'timed'
      ? `Đã làm ${answered.current}`
      : total ? `${answered.current + 1}/${total}` : `Câu ${answered.current + 1}`;
    return (
      <PlayPhase
        question={question}
        difficulty={difficulty}
        progressLabel={progressLabel}
        timerEnabled={config.timer.enabled || config.session.kind === 'timed'}
        timer={timer}
        numericInput={numericInput}
        selectedAnswer={selectedAnswer}
        revealed={revealed}
        rampEnabled={config.ramp.enabled}
        rampHint={rampHint}
        rampToast={rampToast}
        toastOpacity={toastOpacity}
        onNumericKey={(k) => {
          if (selectedAnswer) return;
          if (k === '⌫') setNumericInput((v) => v.slice(0, -1));
          else if (numericInput.length < 6) setNumericInput((v) => v + k);
        }}
        onNumericSubmit={() => { if (numericInput) handleAnswer(numericInput, config); }}
        onPickComparison={(op) => handleAnswer(op, config)}
        onQuit={onQuit}
      />
    );
  }

  if (phase === 'summary' && result) {
    return (
      <SummaryPhase
        result={result}
        onPlayAgain={() => setPhase('config')}
        onViewStats={() => navigation.navigate('PracticeStatsTab')}
        onHome={() => navigation.navigate('HomeTab')}
      />
    );
  }

  return null;
}
