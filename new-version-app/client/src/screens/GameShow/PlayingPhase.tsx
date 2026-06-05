import React from 'react';
import {
  View, Text, SafeAreaView, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { C } from '../../theme';
import { QUESTION_SECONDS } from '../../../../shared/constants';
import { s } from './styles';
import { adaptQuestion, type FloatingEmoji } from './utils';
import type { GameShowState } from '../../hooks/useGameShowWS';
import QuestionDisplay from './QuestionDisplay';
import FloatingEmojiLayer from './FloatingEmojiLayer';
import ChatBar from './ChatBar';
import GameKeypad from './GameKeypad';
import ComparisonButtons from './ComparisonButtons';

interface Props {
  state: GameShowState;
  userId: string | null;
  questionTimer: number;
  myScore: number;
  total: number;
  scoreScale: Animated.Value;
  shakeX: Animated.Value;
  floatingEmojis: FloatingEmoji[];
  selectedAnswer: string | null;
  revealState: 'hidden' | 'revealed';
  numericInput: string;
  showChatInput: boolean;
  chatInput: string;
  onChangeChat: (text: string) => void;
  onToggleChat: () => void;
  onSendChat: () => void;
  onEmoji: (emoji: string) => void;
  onAnswer: (answer: string) => void;
  onNumericKey: (key: string) => void;
  onNumericSubmit: () => void;
}

// Live 1v1 round: battle header + timer, navy question card, progress dots,
// chat bar, and the answer input (numeric keypad or comparison buttons).
export default function PlayingPhase({
  state, userId, questionTimer, myScore, total, scoreScale, shakeX, floatingEmojis,
  selectedAnswer, revealState, numericInput,
  showChatInput, chatInput, onChangeChat, onToggleChat, onSendChat, onEmoji,
  onAnswer, onNumericKey, onNumericSubmit,
}: Props) {
  const current    = state.currentQuestionIndex;
  const rawQ       = state.questions[current];
  const timerPct   = (questionTimer / QUESTION_SECONDS) * 100;
  const timerColor = questionTimer > 5 ? C.success : questionTimer >= 3 ? C.primaryLight : C.error;

  if (!rawQ) {
    return (
      <SafeAreaView style={s.bg}>
        <View style={s.centerFlex}>
          <Text style={{ color: C.primary }}>Đang tải câu hỏi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const adaptedQ     = adaptQuestion(rawQ);
  const isComparison = adaptedQ.type === 'comparison';

  return (
    <KeyboardAvoidingView
      style={s.bg}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <SafeAreaView style={{ flex: 1 }}>
      <FloatingEmojiLayer emojis={floatingEmojis} />

      {/* ── Battle Header ── */}
      <View style={s.battleBar}>
        {/* My side */}
        <View style={s.battleSide}>
          <View style={[s.battleRing, { borderColor: C.primary }]}>
            <Text style={s.battleEmoji}>🐱</Text>
          </View>
          <View>
            <Text style={s.battleWho}>Tôi</Text>
            <Animated.View style={{ transform: [{ scale: scoreScale }] }}>
              <Text style={s.battleScoreRow}>
                <Text style={s.battleScoreNum}>{myScore}</Text>
                <Text style={s.battleScoreOf}>/{total}</Text>
              </Text>
            </Animated.View>
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

        {/* Question Card — the navy "game" surface */}
        <Animated.View style={[s.qCard, { transform: [{ translateX: shakeX }] }]}>
          <View style={s.qCounterPill}>
            <Text style={s.qCounterTxt}>Câu {current + 1}/{total}</Text>
          </View>
          <QuestionDisplay text={adaptedQ.text} type={adaptedQ.type} />
        </Animated.View>

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

      {/* ── Interaction / Chat bar (above the keyboard) ── */}
      <ChatBar
        chatMessages={state.chatMessages}
        userId={userId}
        showChatInput={showChatInput}
        onToggleChat={onToggleChat}
        chatInput={chatInput}
        onChangeChat={onChangeChat}
        onSendChat={onSendChat}
        onEmoji={onEmoji}
      />

      {/* ── Answer Input ──
          Fixed-height area (anchored to the bottom) so the interaction bar
          above keeps its position when the keypad switches to comparison mode. */}
      <View style={s.answerArea}>
        {isComparison ? (
          <ComparisonButtons
            correctAnswer={adaptedQ.correctAnswer}
            selectedAnswer={selectedAnswer}
            revealed={revealState === 'revealed'}
            onPick={onAnswer}
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
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
