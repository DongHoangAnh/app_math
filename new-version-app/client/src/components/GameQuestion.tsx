import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C, R } from '../theme';

interface Props {
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
  revealState?: 'hidden' | 'revealed';
}

function getQuestionFontSize(text: string): number {
  if (text.length <= 8) return 24;
  if (text.length <= 14) return 20;
  return 16;
}

export default function GameQuestion({
  question, selectedAnswer, onSelectAnswer, isDisabled, revealState = 'hidden',
}: Props) {

  const getOptionStyle = (option: string) => {
    if (revealState === 'revealed') {
      if (option === question.correctAnswer) return 'correct';
      if (option === selectedAnswer) return 'wrong';
      return 'dimmed';
    }
    if (option === selectedAnswer) return 'selected';
    return 'idle';
  };

  const fontSize = getQuestionFontSize(question.text);

  return (
    <View style={styles.container}>
      <View style={styles.questionBox}>
        <Text style={[styles.questionText, { fontSize }]}>{question.text}</Text>
      </View>

      <View style={styles.grid}>
        {question.options.map((option, i) => {
          const s = getOptionStyle(option);
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.option,
                s === 'selected' && styles.optionSelected,
                s === 'correct'  && styles.optionCorrect,
                s === 'wrong'    && styles.optionWrong,
                s === 'dimmed'   && styles.optionDimmed,
              ]}
              onPress={() => {
                if (!isDisabled && !selectedAnswer && revealState === 'hidden') {
                  onSelectAnswer(option);
                }
              }}
              disabled={isDisabled || !!selectedAnswer}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.optionText,
                  (s === 'correct' || s === 'wrong') && { color: '#fff' },
                  s === 'selected' && { color: C.primary },
                  s === 'dimmed'   && { color: '#999' },
                ]}
                numberOfLines={2}
              >
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

  questionBox: {
    backgroundColor: C.primaryBg,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: {
    fontWeight: '500',
    color: C.textPrimary,
    textAlign: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  option: {
    width: '48%',
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E8FF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  optionSelected: {
    borderColor: C.primary,
    backgroundColor: '#EEF3FF',
  },
  optionCorrect: {
    borderColor: C.success,
    backgroundColor: C.success,
  },
  optionWrong: {
    borderColor: C.error,
    backgroundColor: C.error,
  },
  optionDimmed: {
    borderColor: '#E0E8FF',
    backgroundColor: '#FAFAFA',
    opacity: 0.6,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: C.textPrimary,
    textAlign: 'center',
  },
});
