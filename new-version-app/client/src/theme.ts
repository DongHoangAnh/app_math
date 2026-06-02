import { StyleProp, ViewStyle, PlatformOSType } from 'react-native';

// Unified color palette — warm amber design system
export const C = {
  // Brand colors
  primary:      '#f59e0b',  // amber-500 — main action color
  primaryLight: '#fbbf24',  // amber-400 — hover/accent
  primaryBg:    '#fef3c7',  // amber-100 — light backgrounds
  primaryDark:  '#78350f',  // amber-900 — dark text on light backgrounds

  // Surface & background
  surface:      '#ffffff',  // cards, modals
  background:   '#faf8f5',  // page background (warm off-white)

  // Text
  textPrimary:  '#1f2937',  // gray-800 — headings, main text
  textSecond:   '#6b7280',  // gray-500 — secondary/muted text

  // Semantic
  success:      '#22c55e',  // green-500 — correct answers, positive feedback
  error:        '#ef4444',  // red-500 — wrong answers, negative feedback
  border:       '#e5e7eb',  // gray-200 — borders, dividers
};

// Standardized border radius scale
export const R = {
  xs:  8,   // small badges, small pills
  sm:  12,  // form inputs, small buttons
  md:  16,  // standard button, card content
  lg:  20,  // large button, question box
  xl:  24,  // large card, CTA button
  xxl: 32,  // header, hero element
};

// Animation duration constants (milliseconds)
export const ANIM = {
  screenTransition: 250,  // screen slide in/out
  cardSlide:        200,  // card between questions
  buttonPress:      80,   // button scale on press
  shake:            300,  // total duration of shake animation
};

// Cross-platform shadow helper
// Returns the correct shadow props for iOS (shadowColor/Offset/Opacity/Radius)
// and Android (elevation). Call in a StyleSheet.create() or inline style.
interface ShadowProps {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export function shadow(color: string = '#000000', level: 1 | 2 | 3 | 4 = 2): ShadowProps {
  // level: 1 = subtle, 2 = normal, 3 = strong, 4 = very strong
  const config = {
    1: { offset: 2, opacity: 0.08, radius: 4,  elevation: 2 },
    2: { offset: 4, opacity: 0.12, radius: 8,  elevation: 4 },
    3: { offset: 6, opacity: 0.15, radius: 12, elevation: 6 },
    4: { offset: 8, opacity: 0.20, radius: 16, elevation: 8 },
  };

  const cfg = config[level];
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: cfg.offset },
    shadowOpacity: cfg.opacity,
    shadowRadius: cfg.radius,
    elevation: cfg.elevation,
  };
}
