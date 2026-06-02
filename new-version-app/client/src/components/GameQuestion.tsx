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

// Xiaoyuan-style: bold solid colors per option
const OPTION_COLORS = [
  { idle: '#4A90D9', active: '#2171B5', label: 'A' },  // Blue
  { idle: '#52C41A', active: '#389E0D', label: 'B' },  // Green
  { idle: '#FF6B35', active: '#E85D28', label: 'C' },  // Orange
  { idle: '#9C27B0', active: '#6A1B9A', label: 'D' },  // Purple
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
      {/* Question card */}
      <View style={styles.questionCard}>
        <View style={styles.questionInner}>
          <Text style={styles.questionText}>{question.text}</Text>
        </View>
      </View>

      {/* Options 2×2 */}
      <View style={styles.grid}>
        {question.options.map((option, i) => {
          const theme = OPTION_COLORS[i % 4];
          const state = getState(option);

          let bgColor: string;
          let borderColor: string;
          let textColor = '#fff';
          let labelContent = theme.label;

          if (state === 'correct') {
            bgColor = '#4CAF50';
            borderColor = '#388E3C';
            labelContent = '✓';
          } else if (state === 'wrong') {
            bgColor = '#FF4444';
            borderColor = '#CC0000';
            labelContent = '✗';
          } else if (state === 'dimmed') {
            bgColor = '#E0E0E0';
            borderColor = '#BDBDBD';
            textColor = '#9E9E9E';
          } else {
            bgColor = theme.idle;
            borderColor = theme.active;
          }

          return (
            <TouchableOpacity
              key={i}
              style={[styles.option, { backgroundColor: bgColor, borderColor }]}
              onPress={() => !isDisabled && !selectedAnswer && onSelectAnswer(option)}
              disabled={isDisabled || !!selectedAnswer}
              activeOpacity={0.8}
            >
              <View style={[styles.labelBadge, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                <Text style={styles.labelText}>{labelContent}</Text>
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
  container: { gap: 20 },

  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 6,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#FFD8C5',
  },
  questionInner: {
    backgroundColor: '#FFF8F2',
    borderRadius: 22,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 56,
    fontWeight: '900',
    color: '#2C1810',
    textAlign: 'center',
    letterSpacing: -1,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },

  option: {
    width: '47.2%',
    borderRadius: 22,
    borderWidth: 3,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 76,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  labelBadge: {
    width: 34, height: 34, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  labelText: {
    fontSize: 14, fontWeight: '900', color: '#fff',
  },
  optionText: {
    flex: 1, fontSize: 22, fontWeight: '900',
  },
});
