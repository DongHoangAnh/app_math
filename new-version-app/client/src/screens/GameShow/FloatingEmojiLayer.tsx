import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { s } from './styles';
import type { FloatingEmoji } from './utils';

// Absolute, non-interactive overlay that renders the in-flight floating emojis.
// Sender's emojis drift up the left edge, opponent's up the right.
export default function FloatingEmojiLayer({ emojis }: { emojis: FloatingEmoji[] }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {emojis.map(fe => (
        <Animated.Text
          key={fe.id}
          style={[
            s.floatingEmoji,
            fe.isMe ? { left: 4 + fe.xShift } : { right: 4 + fe.xShift },
            {
              transform: [{ translateY: fe.y }, { scale: fe.scale }],
              opacity: fe.opacity,
            },
          ]}
        >
          {fe.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}
