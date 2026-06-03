import { Platform } from 'react-native';

// ==========================================================================
// MathUp — Design Tokens
// Source of truth: Figma "Untitled.fig" + mathup-design-system/colors_and_type.css
// A warm, playful, tactile 1v1 math-battle game. Vietnamese-first.
//
// The brand soul: sunset orange #FF6B35, warm-brown inks, a deep-navy "game"
// surface, pill + 48px squircle shapes, and THE signature — a hard, blurless,
// colored offset shadow that makes primary actions feel physically pressable.
// ==========================================================================

export const C = {
  // ── Brand / Primary (warm sunset orange) ──
  // NOTE: the keys below (primary, primaryLight, …) are kept for backward
  // compatibility so existing screens adopt the new palette automatically.
  primary:      '#FF6B35',  // primary action, progress, score, accents
  primaryLight: '#FF8A5E',  // hover / lighter accent
  primaryBg:    '#FFDBD0',  // light badge / pill backgrounds (peach)
  primaryDark:  '#AB3500',  // brand wordmark, "on-light" headings & links

  // Surface & background
  surface:      '#FFFFFF',  // cards, modals, inputs
  background:   '#F7F9FB',  // page background (cool off-white)

  // Text
  textPrimary:  '#191C1E',  // near-black — headings & numbers
  textSecond:   '#594139',  // warm brown — body, labels, captions

  // Semantic
  success:      '#4AAD4E',  // correct, online dot, positive
  error:        '#BA1A1A',  // wrong answer, destructive
  border:       '#E1BFB5',  // warm peach hairline borders

  // ── Full token set (use these for new/restyled work) ──
  orange:        '#FF6B35',
  orangeLight:   '#FF8A5E',
  orangeDark:    '#AB3500',  // wordmark / on-light headings & links
  orangeDeepest: '#5F1900',  // text ON orange surfaces (highest contrast)

  // Peach family — soft warm surfaces & borders
  peachBg:       '#FFDBD0',
  peachBorder:   '#E1BFB5',
  peachGlow:     '#FFB59D',  // level-badge gradient top, success glow

  // Neutrals
  bg:            '#F7F9FB',
  bgKeypad:      '#F2F4F6',  // recessed keypad / sheet background
  surfaceSunken: '#ECEEF0',  // input fill, disabled, sunken chips
  line:          '#E0E3E5',  // default 1px borders / dividers
  lineSoft:      '#E6E8EA',  // lightest divider / track

  // Text inks
  ink:           '#191C1E',  // near-black — primary headings & numbers
  inkBrown:      '#594139',  // warm brown — body, labels, captions
  inkSlate:      '#565E74',  // cool slate — secondary / muted UI text
  inkSlate2:     '#5C647A',  // inactive nav text
  inkSlateDeep:  '#3F465C',  // outline-button border, strong slate

  // Dark "game" surface (battle card / "Đấu 1v1")
  navy:          '#131B2E',
  navyMuted:     '#BEC6E0',  // muted text on navy

  // Semantic (extended)
  successBright: '#94F990',  // "correct" chips, question-pill text on navy
  successDeep:   '#006E1C',  // success icon / filled check
  errorSoft:     '#FEE4E2',  // error field fill

  // Medals (leaderboard top 3)
  gold:          '#FFD700',
  silver:        '#C0C0C0',
  bronze:        '#CD7F32',
};

// ==========================================================================
// RADII — generous, squishy. Pills & the 48px "squircle" are the signature.
// ==========================================================================
export const R = {
  xs:       8,    // small chips
  sm:       12,   // small pills / inner elements
  md:       16,   // standard cards, icon tiles
  lg:       20,   // keypad keys, large buttons
  xl:       24,   // hero cards, battle card
  xxl:      32,   // header / sheet top corners (alias of sheet)
  sheet:    32,   // bottom-nav / sheet top corners
  squircle: 48,   // task rows, rank rows, list cards
  pill:     9999, // buttons, inputs, badges, avatars
};

// ==========================================================================
// SPACING — 4px base grid
// ==========================================================================
export const SP = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48,
};

// App canvas width (mobile-first design width)
export const APP_W = 390;

// ==========================================================================
// TYPE — Plus Jakarta Sans (display/headings/numbers) + Be Vietnam Pro (body)
// Family names match the @expo-google-fonts package exports loaded in App.tsx.
// In React Native each weight is its own family, so pick the variant directly
// (fontWeight alone won't select a bold custom font).
// ==========================================================================
export const F = {
  // Display — Plus Jakarta Sans
  display:        'PlusJakartaSans_700Bold',     // hero numbers, headings, wordmark
  displayBold:    'PlusJakartaSans_800ExtraBold', // big emotional moments
  displaySemi:    'PlusJakartaSans_600SemiBold',
  // Body / UI — Be Vietnam Pro (purpose-built for Vietnamese diacritics)
  body:           'BeVietnamPro_400Regular',
  bodyMedium:     'BeVietnamPro_500Medium',
  bodyBold:       'BeVietnamPro_700Bold',
};

// ==========================================================================
// ANIMATION durations (ms)
// ==========================================================================
export const ANIM = {
  screenTransition: 250,  // screen slide in/out
  cardSlide:        200,  // card between questions
  buttonPress:      80,   // button scale on press
  shake:            300,  // total duration of shake animation
};

// ==========================================================================
// SHADOWS
// ==========================================================================
interface ShadowProps {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

// Soft ambient elevation (resting cards, headers).
// level: 1 = subtle, 2 = normal, 3 = strong, 4 = very strong
export function shadow(color: string = '#000000', level: 1 | 2 | 3 | 4 = 2): ShadowProps {
  const config = {
    1: { offset: 1, opacity: 0.05, radius: 2,  elevation: 1 },
    2: { offset: 4, opacity: 0.08, radius: 12, elevation: 4 },
    3: { offset: 6, opacity: 0.12, radius: 14, elevation: 6 },
    4: { offset: 8, opacity: 0.16, radius: 16, elevation: 8 },
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

// THE signature: a hard, colored, BLUR-LESS offset shadow ("0 8px 0").
// Elements sit on a solid slab of their own color so they read as physical,
// pressable tokens.
//
// On iOS we render it as a zero-radius colored shadow. Android can't draw a
// colored blur-less shadow, so for a true cross-platform slab use the
// <Tactile> / <TactileButton> components in components/ui.tsx (they stack a
// real colored View). This helper is the lightweight option for hero cards.
export function hardShadow(
  color: string = C.orange,
  height: number = 8,
  opacity: number = 0.3,
): ShadowProps {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height },
    shadowOpacity: Platform.OS === 'ios' ? opacity : opacity * 1.0,
    shadowRadius: 0,            // blur-less — the signature
    // Android elevation can't be colored/blurless; keep it subtle so it
    // doesn't fight the slab rendered by <Tactile>.
    elevation: Platform.OS === 'android' ? Math.round(height / 2) : 0,
  };
}

// Inset look (recessed tracks, icon wells, pills). RN has no inset shadow,
// so this returns a sunken background + hairline you can spread onto a View.
export const insetTrack = {
  backgroundColor: C.surfaceSunken,
  borderWidth: 1,
  borderColor: C.lineSoft,
};
