import { Animated } from 'react-native';
import type { AnswerRecord } from '../../../../shared/types';

// Pure scoring helpers — count correct answers / total time across a match.
export function countCorrect(answers: Record<number, { isCorrect: boolean }>) {
  return Object.values(answers).filter(a => a.isCorrect).length;
}
export function sumTime(answers: Record<number, { timeMs: number }>) {
  return Object.values(answers).reduce((sum, a) => sum + a.timeMs, 0);
}

export const COMPARISON_OPS = ['<', '=', '>'];

// Server question shape varies (legacy servers omit `type`); normalize it here.
export interface AdaptedQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  type: 'arithmetic' | 'comparison';
}
export function adaptQuestion(q: any): AdaptedQuestion {
  const correctAnswer = String(q.correctAnswer ?? '');
  // Nhận diện câu so sánh: ưu tiên trường type, nhưng vẫn nhận ra kể cả khi
  // server cũ chưa gửi type — bằng cách kiểm tra đáp án đúng là <, > hoặc =.
  const isComparison =
    q.type === 'comparison' || COMPARISON_OPS.includes(correctAnswer);
  return {
    id: q.id ?? String(Math.random()),
    text: q.question ?? q.text ?? '',
    options: q.options ?? [],
    correctAnswer,
    type: (isComparison ? 'comparison' : 'arithmetic') as 'arithmetic' | 'comparison',
  };
}

// One in-flight floating-emoji animation (Google Meet style).
export interface FloatingEmoji {
  id: string;
  emoji: string;
  isMe: boolean;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  xShift: number;
}

// AnswerRecord is re-exported so phase components can type myAnswers without
// reaching across the tree.
export type { AnswerRecord };
