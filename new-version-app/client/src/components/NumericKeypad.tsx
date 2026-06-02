import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { C, R, ANIM, shadow } from '../theme';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (val: string) => void;
  disabled?: boolean;
}

interface KeyButtonProps {
  label: string;
  onPress: () => void;
  style?: any;
  textStyle?: any;
}

function KeyButton({ label, onPress, style, textStyle }: KeyButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, { toValue: 0.92, duration: ANIM.buttonPress, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, { toValue: 1, duration: ANIM.buttonPress, useNativeDriver: true }).start();
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={1}
      style={{ flex: 1 }}
    >
      <Animated.View style={[styles.key, style, { transform: [{ scale }] }]}>
        <Text style={[styles.keyText, textStyle]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function NumericKeypad({ value, onChange, onSubmit, disabled = false }: Props) {
  const handleKeyPress = (key: string) => {
    if (disabled) return;
    if (key === '⌫') {
      onChange(value.slice(0, -1));
    } else if (key === '.') {
      if (!value.includes('.') && value.length > 0) {
        onChange(value + key);
      }
    } else if (value.length < 6) {
      onChange(value + key);
    }
  };

  const handleSubmit = () => {
    if (value && !disabled) {
      onSubmit(value);
    }
  };

  return (
    <View style={styles.container}>
      {/* Input display */}
      <View style={styles.inputDisplay}>
        <Text style={styles.inputText}>{value || '0'}</Text>
      </View>

      {/* Key grid */}
      <View style={styles.grid}>
        {/* Row 1: 1, 2, 3 */}
        <View style={styles.row}>
          <KeyButton label="1" onPress={() => handleKeyPress('1')} />
          <KeyButton label="2" onPress={() => handleKeyPress('2')} />
          <KeyButton label="3" onPress={() => handleKeyPress('3')} />
        </View>

        {/* Row 2: 4, 5, 6 */}
        <View style={styles.row}>
          <KeyButton label="4" onPress={() => handleKeyPress('4')} />
          <KeyButton label="5" onPress={() => handleKeyPress('5')} />
          <KeyButton label="6" onPress={() => handleKeyPress('6')} />
        </View>

        {/* Row 3: 7, 8, 9 */}
        <View style={styles.row}>
          <KeyButton label="7" onPress={() => handleKeyPress('7')} />
          <KeyButton label="8" onPress={() => handleKeyPress('8')} />
          <KeyButton label="9" onPress={() => handleKeyPress('9')} />
        </View>

        {/* Row 4: . , 0, ⌫ */}
        <View style={styles.row}>
          <KeyButton label="." onPress={() => handleKeyPress('.')} />
          <KeyButton label="0" onPress={() => handleKeyPress('0')} />
          <KeyButton
            label="⌫"
            onPress={() => handleKeyPress('⌫')}
            style={{ backgroundColor: '#FEF2F2' }}
            textStyle={{ color: C.error }}
          />
        </View>

        {/* Row 5: Submit button */}
        <TouchableOpacity
          style={[styles.submitBtn, disabled && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={disabled || !value}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>NHẬP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingHorizontal: 16,
  },

  inputDisplay: {
    backgroundColor: C.primaryBg,
    borderRadius: R.md,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow(C.primary, 1),
  },
  inputText: {
    fontSize: 28,
    fontWeight: '800',
    color: C.textPrimary,
  },

  grid: {
    gap: 12,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  key: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow('#000', 1),
  },
  keyText: {
    fontSize: 24,
    fontWeight: '700',
    color: C.textPrimary,
  },

  submitBtn: {
    height: 56,
    backgroundColor: C.primary,
    borderRadius: R.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...shadow(C.primary, 2),
  },
  submitText: {
    fontSize: 17,
    fontWeight: '900',
    color: C.surface,
  },
});
