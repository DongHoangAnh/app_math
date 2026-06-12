import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { s } from './styles';
import { C } from '../../theme';
import { ASSETS } from '../../assets';
import { difficultyById } from '../../../../shared/constants';
import GameKeypad from '../GameShow/GameKeypad';
import ComparisonButtons from '../GameShow/ComparisonButtons';
import type { GameQuestion } from '../../../../shared/types';
import type { RampChange } from './utils';

interface Props {
  question: GameQuestion;
  difficulty: number;
  progressLabel: string;        // e.g. "3/10" or "Câu 7"
  timerEnabled: boolean;
  timer: number;
  numericInput: string;
  selectedAnswer: string | null;
  revealed: boolean;
  rampEnabled: boolean;
  rampHint?: string;            // e.g. "Đúng 7/10 để lên cấp"
  rampToast: RampChange;        // 'up' | 'down' | null — shows overlay
  toastOpacity: Animated.Value;
  onNumericKey: (k: string) => void;
  onNumericSubmit: () => void;
  onPickComparison: (op: string) => void;
  onQuit: () => void;
}

export default function PlayPhase({
  question, difficulty, progressLabel, timerEnabled, timer,
  numericInput, selectedAnswer, revealed, rampEnabled, rampHint,
  rampToast, toastOpacity, onNumericKey, onNumericSubmit, onPickComparison, onQuit,
}: Props) {
  const diff = difficultyById(difficulty);
  const isCompare = question.type === 'comparison';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.playHeader}>
        <TouchableOpacity onPress={onQuit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.secondaryTxt}>✕</Text>
        </TouchableOpacity>
        <View style={s.diffPill}>
          <Text style={{ fontSize: 14 }}>{diff.icon}</Text>
          <Text style={s.diffPillTxt}>{diff.label}</Text>
        </View>
        {timerEnabled
          ? <Text style={s.timerTxt}>{ASSETS.practice.timer} {timer}</Text>
          : <Text style={s.progressTxt}>{progressLabel}</Text>}
      </View>

      {timerEnabled && <Text style={[s.progressTxt, { textAlign: 'center' }]}>{progressLabel}</Text>}

      <View style={s.qCard}>
        <Text style={s.questionText}>{question.question}</Text>
      </View>

      {rampEnabled && !!rampHint && <Text style={s.rampHint}>{rampHint}</Text>}

      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {isCompare ? (
          <ComparisonButtons
            correctAnswer={question.correctAnswer}
            selectedAnswer={selectedAnswer}
            revealed={revealed}
            onPick={onPickComparison}
          />
        ) : (
          <GameKeypad
            value={numericInput}
            onKey={onNumericKey}
            onSubmit={onNumericSubmit}
            disabled={!!selectedAnswer}
          />
        )}
      </View>

      {/* Ramp level-change toast */}
      {rampToast && (
        <Animated.View
          style={[
            s.rampToast,
            { opacity: toastOpacity, backgroundColor: rampToast === 'up' ? C.success : C.inkSlate },
          ]}
        >
          <Text style={{ fontSize: 18 }}>
            {rampToast === 'up' ? ASSETS.practice.levelUp : ASSETS.practice.levelDown}
          </Text>
          <Text style={s.rampToastTxt}>
            {rampToast === 'up' ? `Lên ${difficultyById(difficulty).label}` : `Về ${difficultyById(difficulty).label}`}
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
