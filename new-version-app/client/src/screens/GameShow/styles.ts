import { StyleSheet } from 'react-native';
import { C, R, F, shadow, hardShadow } from '../../theme';

// Shared stylesheet for the GameShow screen + its phase/sub-components.
// Moved verbatim from the old single-file GameShowScreen so visuals are unchanged.
export const s = StyleSheet.create({
  bg:         { flex: 1, backgroundColor: C.background },
  centerFlex: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },

  // ── IDLE ──
  idleWrap:      { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  idleTitle:     { fontSize: 24, fontFamily: F.display, color: C.textPrimary, textAlign: 'center', marginBottom: 4 },
  idleSub:       { fontSize: 13, fontFamily: F.body, color: C.textSecond, textAlign: 'center', marginBottom: 24 },
  idleVsRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 10 },
  idleAvatar: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2.5,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  idleAvatarEmoji: { fontSize: 30 },
  idleVsLabel:     { fontSize: 19, fontWeight: '900', color: C.textPrimary },
  idlePts:         { fontSize: 12, color: C.textSecond, textAlign: 'center', marginBottom: 20 },
  sectionLabel:    { fontSize: 12, fontWeight: '700', color: C.textSecond, marginBottom: 8 },
  modeRow:  { flexDirection: 'row', gap: 10, marginBottom: 24 },
  modeCard: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: C.surface, borderRadius: R.lg,
    paddingVertical: 14, borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  modeCardOn: { borderColor: C.primary, backgroundColor: C.primaryBg },
  modeIcon:   { fontSize: 22 },
  modeName:   { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  modeDiff:   { fontSize: 10, color: C.textSecond },
  errBox:     { backgroundColor: '#FFEBEE', borderRadius: R.sm, padding: 12, marginBottom: 14 },
  errTxt:     { color: C.error, fontSize: 13, textAlign: 'center' },
  historyBtn: {
    marginTop: 12, paddingVertical: 13, alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.pill,
    borderWidth: 1.5, borderColor: C.border,
  },
  historyBtnTxt: { fontSize: 14, fontFamily: F.display, color: C.textPrimary },
  loginHint: { fontSize: 12, color: C.textSecond, textAlign: 'center', marginTop: 12 },

  // ── QUEUED / MATCH FOUND ──
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  queueAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 28, marginBottom: 24 },
  bigRing: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 2.5,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  bigEmoji:    { fontSize: 34 },
  vsHuge:      { fontSize: 20, fontFamily: F.displayBold, color: C.primaryDark },
  matchPlayer: { alignItems: 'center', gap: 10 },
  matchName:   { fontSize: 12, fontFamily: F.bodyMedium, color: C.textSecond, maxWidth: 90, textAlign: 'center' },
  readyTitle:  { fontSize: 28, fontFamily: F.display, color: C.primaryDark, marginBottom: 8 },
  searchSub:   { fontSize: 14, fontFamily: F.body, color: C.textSecond, marginBottom: 32 },
  cancelBtn:   { paddingVertical: 10, paddingHorizontal: 20 },
  cancelTxt:   { fontSize: 14, color: C.primary, fontFamily: F.bodyMedium, textDecorationLine: 'underline' },
  countdownBig:{ fontSize: 64, fontFamily: F.displayBold, color: C.primary },

  // ── PLAYING: Battle Header ──
  battleBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  battleSide: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  battleRing: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 2.5,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF',
  },
  battleEmoji:    { fontSize: 22 },
  battleWho:      { fontSize: 11, color: C.textSecond, fontWeight: '600' },
  battleScoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  battleScoreNum: { fontSize: 22, fontFamily: F.displayBold, color: C.textPrimary },
  battleScoreOf:  { fontSize: 12, color: C.textSecond, fontFamily: F.bodyMedium },
  battleVs:       { fontSize: 14, fontFamily: F.displayBold, color: C.inkSlate },

  // Timer bar (thin line below header)
  timerTrack: { height: 3, backgroundColor: C.border },
  timerFill:  { height: 3 },

  // Body
  playBody: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, gap: 10 },
  opDoneBanner: {
    backgroundColor: '#FFFBEB', borderRadius: R.xs,
    paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#FFE082', alignItems: 'center',
  },
  opDoneTxt: { fontSize: 12, fontWeight: '600', color: '#856404' },

  // Question card — the navy "game" surface
  qCard: {
    backgroundColor: C.navy, borderRadius: R.xl,
    paddingTop: 28, paddingBottom: 36, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center', gap: 28, minHeight: 230,
    ...hardShadow(C.navy, 8, 0.2),
  },
  qCounterPill: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)', borderRadius: R.pill,
    paddingHorizontal: 18, paddingVertical: 6,
  },
  qCounterTxt:  { fontFamily: F.display, fontSize: 14, color: C.successBright },
  questionText: { fontFamily: F.display, fontSize: 52, color: '#fff', textAlign: 'center', lineHeight: 62 },

  // Progress dots
  dots:      { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 4 },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: C.border },
  dotActive: { width: 14, height: 7, borderRadius: 4, backgroundColor: C.primary },

  // Answer area — reserves the keypad's height and anchors content to the
  // bottom, so the interaction bar above never shifts down when the input
  // switches between the numeric keypad and the comparison (<,=,>) buttons.
  answerArea: { minHeight: 360, justifyContent: 'flex-end' },

  // Comparison buttons — fill the reserved area and center vertically
  compRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16,
  },
  compBtn: {
    flex: 1, height: 96, borderRadius: R.xl,
    backgroundColor: C.peachBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.orange, ...shadow('#000', 1),
  },
  compBtnTxt: { fontSize: 40, fontFamily: F.displayBold, color: C.orangeDark },

  // Numeric keypad — recessed sheet, large rounded keys
  keypadWrap: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 10,
    backgroundColor: C.bgKeypad, borderTopLeftRadius: R.sheet, borderTopRightRadius: R.sheet,
    borderWidth: 1, borderColor: C.lineSoft,
  },
  inputDisplay: {
    backgroundColor: C.peachBg, borderRadius: R.pill,
    height: 52, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: C.orange,
  },
  inputDisplayTxt: { fontSize: 26, fontFamily: F.displayBold, color: C.ink, letterSpacing: 2 },
  keyRow: { flexDirection: 'row', gap: 12 },
  key: {
    flex: 1, height: 62,
    backgroundColor: C.surface, borderRadius: R.lg,
    justifyContent: 'center', alignItems: 'center', ...shadow('#000', 1),
  },
  keyTxt: { fontSize: 26, fontFamily: F.display, color: C.ink },
  keyXoa: {
    flex: 1, height: 62,
    backgroundColor: C.line, borderRadius: R.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  keyXoaTxt: { fontSize: 22, color: C.inkBrown },
  keySubmit: {
    flex: 1, height: 62,
    backgroundColor: C.orange, borderRadius: R.lg,
    alignItems: 'center', justifyContent: 'center', ...shadow(C.orangeDark, 2),
  },
  keySubmitTxt: { fontSize: 24, fontFamily: F.displayBold, color: '#fff' },

  // ── Floating emoji ──
  floatingEmoji: {
    position: 'absolute',
    bottom: 54,
    fontSize: 36,
    zIndex: 200,
    lineHeight: 44,
  },

  // ── Chat bar (playing phase) ──
  chatBar: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 6,
  },

  // Chat bubbles
  chatBubble: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginHorizontal: 4,
    marginVertical: 2,
    maxWidth: '75%',
  },
  chatBubbleMe:   { alignSelf: 'flex-end', backgroundColor: C.primary },
  chatBubbleThem: { alignSelf: 'flex-start', backgroundColor: C.primaryBg },
  chatNameMe:   { fontSize: 8, color: 'rgba(255,255,255,0.65)', marginBottom: 1 },
  chatNameThem: { fontSize: 8, color: C.textSecond, marginBottom: 1 },
  chatTextMe:   { fontSize: 12, color: '#fff' },
  chatTextThem: { fontSize: 12, color: C.textPrimary },

  // Emoji row
  emojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 2,
  },
  emojiBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  emojiBtnActive: { backgroundColor: C.primaryBg },
  emojiBtnText:   { fontSize: 22 },

  // Chat input row
  chatInputRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingHorizontal: 4, paddingVertical: 3,
  },
  chatInputField: {
    flex: 1, height: 36, backgroundColor: '#F4F5F9',
    borderRadius: 18, paddingHorizontal: 14,
    fontSize: 13, color: C.textPrimary,
  },
  chatSendBtn: {
    backgroundColor: C.primary, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  chatSendBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },

  // ── Wait chat panel (you_finished phase) ──
  waitChatPanel: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: 6,
  },
  waitChatScroll: {
    maxHeight: 130,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  chatEmptyHint: {
    fontSize: 11, color: '#AAA',
    textAlign: 'center', paddingVertical: 12,
  },

  // Waiting / disconnected
  waitTitle: { fontSize: 24, fontFamily: F.display, color: C.textPrimary, textAlign: 'center', marginBottom: 8 },
  waitSub:   { fontSize: 14, fontFamily: F.body, color: C.textSecond, textAlign: 'center' },
});
