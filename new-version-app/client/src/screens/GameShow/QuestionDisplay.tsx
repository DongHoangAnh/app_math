import React from 'react';
import { Text } from 'react-native';
import { C } from '../../theme';
import { s } from './styles';

// Highlight the "?" in comparison questions with the primary (amber) color.
export default function QuestionDisplay({ text, type }: { text: string; type: string }) {
  if (type === 'comparison' && text.includes('?')) {
    const parts = text.split('?');
    return (
      <Text style={s.questionText}>
        {parts[0]}
        <Text style={{ color: C.primary }}>?</Text>
        {parts[1] ?? ''}
      </Text>
    );
  }
  return <Text style={s.questionText}>{text}</Text>;
}
