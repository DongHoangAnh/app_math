import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface GameQuestionProps {
  question: {
    id: string;
    text: string;
    options: string[];
    correctAnswer: string;
    type: 'arithmetic' | 'comparison';
  };
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
  isDisabled: boolean;
}

const OPTION_THEMES = [
  { bg: '#EFF6FF', border: '#93C5FD', activeBg: '#3B82F6', label: 'A' },
  { bg: '#F0FDF4', border: '#86EFAC', activeBg: '#22C55E', label: 'B' },
  { bg: '#FFF7ED', border: '#FED7AA', activeBg: '#F59E0B', label: 'C' },
  { bg: '#FDF4FF', border: '#E9D5FF', activeBg: '#A855F7', label: 'D' },
];

export default function GameQuestion({
  question, selectedAnswer, onSelectAnswer, isDisabled,
}: GameQuestionProps) {

  const getState = (option: string): 'correct' | 'wrong' | 'dimmed' | 'idle' => {
    if (!selectedAnswer) return 'idle';
    if (option === question.correctAnswer) return 'correct';
    if (option === selectedAnswer) return 'wrong';
    return 'dimmed';
  };

  return (
    <View style={styles.container}>
      {/* Question */}
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{question.text}</Text>
      </View>

      {/* Options 2×2 */}
      <View style={styles.grid}>
        {question.options.map((option, i) => {
          const theme = OPTION_THEMES[i % 4];
          const state = getState(option);

          const cardBg =
            state === 'correct' ? '#22C55E' :
            state === 'wrong'   ? '#EF4444' :
            state === 'dimmed'  ? '#F8FBFF' :
            theme.bg;

          const borderColor =
            state === 'correct' ? '#16A34A' :
            state === 'wrong'   ? '#DC2626' :
            state === 'dimmed'  ? '#E2E8F0' :
            theme.border;

          const labelBg =
            state === 'correct' ? 'rgba(255,255,255,0.3)' :
            state === 'wrong'   ? 'rgba(255,255,255,0.3)' :
            state === 'dimmed'  ? '#E2E8F0' :
            theme.activeBg;

          const textColor =
            state === 'correct' || state === 'wrong' ? '#fff' :
            state === 'dimmed' ? '#CBD5E1' : '#1E293B';

          const labelTextColor =
            state === 'correct' || state === 'wrong' ? '#fff' :
            state === 'dimmed' ? '#94A3B8' : '#fff';

          return (
            <TouchableOpacity
              key={i}
              style={[styles.option, { backgroundColor: cardBg, borderColor }]}
              onPress={() => !isDisabled && !selectedAnswer && onSelectAnswer(option)}
              disabled={isDisabled || !!selectedAnswer}
              activeOpacity={0.75}
            >
              <View style={[styles.optionLabel, { backgroundColor: labelBg }]}>
                <Text style={[styles.optionLabelText, { color: labelTextColor }]}>
                  {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : theme.label}
                </Text>
              </View>
              <Text style={[styles.optionText, { color: textColor }]} numberOfLines={2}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },

  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: 'rgba(59,130,246,0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  questionText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
    letterSpacing: -1,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  option: {
    width: '47.5%',
    borderRadius: 20,
    borderWidth: 2,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 72,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  optionLabel: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  optionLabelText: {
    fontSize: 13, fontWeight: '800',
  },
  optionText: {
    flex: 1, fontSize: 20, fontWeight: '700',
  },
});
