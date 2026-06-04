import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C } from '../../theme';
import { s } from './styles';
import { COMPARISON_OPS } from './utils';

interface Props {
  correctAnswer: string;
  selectedAnswer: string | null;
  revealed: boolean;             // revealState === 'revealed'
  onPick: (op: string) => void;
}

// Three wide amber buttons for comparison (<, =, >) questions. Once an answer
// is picked, the chosen button turns green (correct) or red (wrong).
export default function ComparisonButtons({ correctAnswer, selectedAnswer, revealed, onPick }: Props) {
  return (
    <View style={s.compRow}>
      {COMPARISON_OPS.map(op => {
        const isSel = selectedAnswer === op;
        const isOk  = isSel && revealed && op === correctAnswer;
        const isBad = isSel && revealed && op !== correctAnswer;
        return (
          <TouchableOpacity
            key={op}
            style={[
              s.compBtn,
              isOk  && { backgroundColor: C.success, borderColor: C.success },
              isBad && { backgroundColor: C.error,   borderColor: C.error   },
            ]}
            onPress={() => onPick(op)}
            disabled={!!selectedAnswer}
            activeOpacity={0.75}
          >
            <Text style={[s.compBtnTxt, (isOk || isBad) && { color: '#fff' }]}>{op}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
