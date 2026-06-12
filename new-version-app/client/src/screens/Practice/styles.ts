import { StyleSheet } from 'react-native';
import { C, R, F, shadow } from '../../theme';

export const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  body:   { padding: 20, paddingBottom: 40, gap: 20 },

  // Headings
  h1: { fontFamily: F.displayBold, fontSize: 26, color: C.ink },
  h3: { fontFamily: F.display, fontSize: 18, color: C.ink, marginLeft: 2 },
  sub: { fontFamily: F.body, fontSize: 13, color: C.inkSlate },

  // Preset cards
  presetGrid: { gap: 12 },
  presetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.peachBorder,
    borderRadius: R.lg, padding: 16, ...shadow('#000', 1),
  },
  presetIconWrap: {
    width: 52, height: 52, borderRadius: R.md, backgroundColor: C.peachBg,
    justifyContent: 'center', alignItems: 'center',
  },
  presetName: { fontFamily: F.display, fontSize: 15, color: C.ink },
  presetDesc: { fontFamily: F.body, fontSize: 12, color: C.inkSlate, marginTop: 2 },

  // Knob sections (Tùy chỉnh)
  knobCard: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: R.md, padding: 16, gap: 12, ...shadow('#000', 1),
  },
  knobLabel: { fontFamily: F.bodyBold, fontSize: 14, color: C.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.peachBorder, backgroundColor: C.surface,
  },
  chipOn: { backgroundColor: C.orange, borderColor: C.orange },
  chipTxt: { fontFamily: F.bodyMedium, fontSize: 13, color: C.inkBrown },
  chipTxtOn: { color: '#fff' },

  // Primary CTA
  cta: {
    backgroundColor: C.orange, borderRadius: R.pill, paddingVertical: 15,
    alignItems: 'center', ...shadow(C.orangeDark, 3),
  },
  ctaTxt: { fontFamily: F.display, fontSize: 16, color: '#fff' },

  // Play header
  playHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  diffPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.peachBg, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  diffPillTxt: { fontFamily: F.bodyBold, fontSize: 13, color: C.orangeDark },
  progressTxt: { fontFamily: F.bodyBold, fontSize: 14, color: C.inkSlate },
  timerTxt: { fontFamily: F.displayBold, fontSize: 18, color: C.orange },

  // Question card
  qCard: {
    backgroundColor: C.surface, borderRadius: R.lg, marginHorizontal: 20,
    paddingVertical: 36, alignItems: 'center', borderWidth: 1, borderColor: C.line,
    ...shadow('#000', 1),
  },
  questionText: { fontFamily: F.displayBold, fontSize: 40, color: C.ink },

  rampHint: { fontFamily: F.body, fontSize: 12, color: C.inkSlate, textAlign: 'center', marginTop: 10 },

  // Ramp overlay toast
  rampToast: {
    position: 'absolute', alignSelf: 'center', top: '38%',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: R.pill, ...shadow('#000', 3),
  },
  rampToastTxt: { fontFamily: F.displayBold, fontSize: 16, color: '#fff' },

  // Summary
  summaryWrap: { padding: 20, gap: 16 },
  bigStat: { fontFamily: F.displayBold, fontSize: 44, color: C.orange, textAlign: 'center' },
  statGrid: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: R.md, padding: 14, alignItems: 'center', gap: 2, ...shadow('#000', 1),
  },
  statBoxLabel: { fontFamily: F.bodyMedium, fontSize: 11, color: C.inkSlate },
  statBoxValue: { fontFamily: F.displayBold, fontSize: 18, color: C.ink },

  // Per-op accuracy rows
  opRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineSoft,
  },
  opName: { fontFamily: F.bodyMedium, fontSize: 14, color: C.inkBrown },
  opAcc:  { fontFamily: F.displayBold, fontSize: 14, color: C.ink },

  secondaryBtn: {
    borderWidth: 1, borderColor: C.peachBorder, borderRadius: R.pill,
    paddingVertical: 13, alignItems: 'center', backgroundColor: C.surface,
  },
  secondaryTxt: { fontFamily: F.display, fontSize: 15, color: C.orangeDark },

  emptyTxt: { fontFamily: F.body, fontSize: 14, color: C.inkSlate, textAlign: 'center', marginTop: 24 },
});
