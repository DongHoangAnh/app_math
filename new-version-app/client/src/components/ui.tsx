import React from 'react';
import {
  View, Text, Pressable, ActivityIndicator,
  StyleProp, ViewStyle, TextStyle,
} from 'react-native';
import { C, R, F } from '../theme';

// ==========================================================================
// MathUp signature: the "tactile" hard-slab element.
// An element sits on a SOLID colored slab offset downward; pressing it
// translates the face down so the slab collapses — a physical "click".
//
// We render the slab as a real View (instead of a platform shadow) so the
// blur-less, COLORED look is identical on iOS and Android.
// ==========================================================================

type TactileProps = {
  children: React.ReactNode;
  slabColor: string;
  depth?: number;
  radius?: number;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;       // applied to the face
  accessibilityLabel?: string;
};

export function Tactile({
  children, slabColor, depth = 6, radius = R.pill,
  onPress, disabled, style, accessibilityLabel,
}: TactileProps) {
  const renderInner = (pressed: boolean) => (
    <View>
      {/* solid colored slab */}
      <View
        style={{
          position: 'absolute',
          left: 0, right: 0, top: depth, bottom: -depth,
          backgroundColor: slabColor,
          borderRadius: radius,
          opacity: pressed ? 0 : 1,
        }}
      />
      {/* face */}
      <View
        style={[
          { borderRadius: radius, overflow: 'hidden' },
          style,
          pressed ? { transform: [{ translateY: depth }] } : null,
          disabled ? { opacity: 0.55 } : null,
        ]}
      >
        {children}
      </View>
    </View>
  );

  // Static slab (hero cards): plain View, no press handling.
  if (!onPress) {
    return <View style={{ paddingBottom: depth }}>{renderInner(false)}</View>;
  }

  // Interactive: Pressable collapses the slab on press.
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{ paddingBottom: depth }}
    >
      {({ pressed }) => renderInner(pressed)}
    </Pressable>
  );
}

// ---- Pill button with the signature hard offset shadow --------------------
type Variant = 'primary' | 'dark' | 'outline' | 'soft';

const VARIANTS: Record<Variant, {
  face: ViewStyle; slab: string; text: TextStyle; depth: number;
}> = {
  primary: {
    face: { backgroundColor: C.orange, paddingVertical: 16, paddingHorizontal: 24 },
    slab: '#C9431A',
    text: { color: '#fff', fontFamily: F.display, fontSize: 18 },
    depth: 6,
  },
  dark: {
    face: { backgroundColor: C.navy, paddingVertical: 16, paddingHorizontal: 24 },
    slab: '#0A0F1C',
    text: { color: '#fff', fontFamily: F.display, fontSize: 18 },
    depth: 6,
  },
  outline: {
    face: {
      backgroundColor: C.bg, paddingVertical: 14, paddingHorizontal: 24,
      borderWidth: 2, borderColor: C.inkSlateDeep,
    },
    slab: '#D4D7DA',
    text: { color: C.ink, fontFamily: F.display, fontSize: 14 },
    depth: 4,
  },
  soft: {
    face: { backgroundColor: C.peachBg, paddingVertical: 12, paddingHorizontal: 20 },
    slab: '#E9B9AC',
    text: { color: C.orangeDark, fontFamily: F.display, fontSize: 14 },
    depth: 4,
  },
};

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: string;       // leading emoji / glyph
  iconRight?: string;  // trailing emoji / glyph
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function TactileButton({
  title, onPress, variant = 'primary', icon, iconRight,
  disabled, loading, style, textStyle,
}: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Tactile
      slabColor={v.slab}
      depth={v.depth}
      radius={R.pill}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={title}
      style={[
        v.face,
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'dark' ? '#fff' : C.orange} />
      ) : (
        <>
          {icon ? <Text style={[v.text, textStyle]}>{icon}</Text> : null}
          <Text style={[v.text, textStyle]}>{title}</Text>
          {iconRight ? <Text style={[v.text, textStyle]}>{iconRight}</Text> : null}
        </>
      )}
    </Tactile>
  );
}

// ---- Striped progress bar (recessed track + orange fill) ------------------
export function ProgressBar({
  pct, height = 16, track = C.peachBg, fill = C.orange, radius = R.pill,
}: { pct: number; height?: number; track?: string; fill?: string; radius?: number }) {
  return (
    <View style={{
      width: '100%', height, borderRadius: radius, backgroundColor: track,
      overflow: 'hidden', borderWidth: 1, borderColor: C.lineSoft,
    }}>
      <View style={{
        height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`,
        borderRadius: radius, backgroundColor: fill,
      }} />
    </View>
  );
}
