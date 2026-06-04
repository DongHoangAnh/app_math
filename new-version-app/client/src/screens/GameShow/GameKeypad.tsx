import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { s } from './styles';

interface Props {
  value: string;
  onKey: (key: string) => void;   // digit "0".."9" or "⌫"
  onSubmit: () => void;
  disabled?: boolean;             // locked after an answer is picked
}

// Navy/peach numeric keypad — 1–9 grid plus ⌫ · 0 · ✓. Visuals match the
// original inline keypad exactly (fixed-height keys, "—" placeholder).
export default function GameKeypad({ value, onKey, onSubmit, disabled = false }: Props) {
  return (
    <View style={s.keypadWrap}>
      {/* Input display */}
      <View style={s.inputDisplay}>
        <Text style={s.inputDisplayTxt}>{value || '—'}</Text>
      </View>

      {/* Rows 1–9 */}
      {([[1, 2, 3], [4, 5, 6], [7, 8, 9]] as number[][]).map((row, ri) => (
        <View key={ri} style={s.keyRow}>
          {row.map(n => (
            <TouchableOpacity
              key={n}
              style={s.key}
              onPress={() => onKey(String(n))}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={s.keyTxt}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Bottom row: XOÁ · 0 · NHẬP ✓ */}
      <View style={s.keyRow}>
        <TouchableOpacity
          style={[s.keyXoa, !value && { opacity: 0.4 }]}
          onPress={() => onKey('⌫')}
          disabled={!value}
          activeOpacity={0.7}
        >
          <Text style={s.keyXoaTxt}>⌫</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.key}
          onPress={() => onKey('0')}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={s.keyTxt}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.keySubmit, !value && { opacity: 0.4 }]}
          onPress={onSubmit}
          disabled={!value || disabled}
          activeOpacity={0.85}
        >
          <Text style={s.keySubmitTxt}>✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
