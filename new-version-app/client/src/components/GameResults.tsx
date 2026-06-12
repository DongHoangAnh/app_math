import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Animated, Image,
  TouchableOpacity, StatusBar,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useNavigation } from '@react-navigation/native';
import { C, R, F, APP_W, shadow } from '../theme';
import { TactileButton } from './ui';
import { useFeedback } from '../hooks/useFeedback';
import { ASSETS } from '../assets';
import AssetIcon from './AssetIcon';

// Animate a number from 0 → target. useNativeDriver:false because we read the value.
function useCountUp(target: number, duration = 800): number {
  const [val, setVal] = useState(0);
  const av = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const id = av.addListener(({ value }) => setVal(Math.round(value)));
    Animated.timing(av, { toValue: target, duration, useNativeDriver: false }).start();
    return () => av.removeListener(id);
  }, [target, duration, av]);
  return val;
}

interface Props {
  playerScore: number;
  opponentScore: number;
  playerTime: number;
  opponentTime: number;
  totalQuestions?: number;
  rankingDelta?: number | null;
  currentRankingPoints?: number | null;
  userId?: string | null;
  winnerId?: string | null;
  myName?: string;
  oppName?: string;
  myAvatarUrl?: string | null;
  oppAvatarUrl?: string | null;
  myWins?: number | null;
  oppWins?: number | null;
  onPlayAgain: () => void;
  /** "Về trang chủ" — returns to the difficulty picker (idle) screen. */
  onHome?: () => void;
  onReview?: () => void;
}

// Compact Vietnamese time: "5,4s" under a minute, "1p 02s" above.
function fmtTime(ms: number): string {
  const total = ms / 1000;
  if (total < 60) return `${total.toFixed(1).replace('.', ',')}s`;
  const mins = Math.floor(total / 60);
  const secs = Math.round(total % 60);
  return `${mins}p ${secs.toString().padStart(2, '0')}s`;
}

// Opponent's half of the tug-of-war bar (theme has no blue token).
const OPP_BLUE = '#4D7CFE';

// Starry-night decor positions (static so they don't jump between renders).
const SPARKLES: { top: string; left: string; size: number; alt?: boolean }[] = [
  { top: '6%',  left: '12%', size: 18 },
  { top: '10%', left: '78%', size: 12, alt: true },
  { top: '20%', left: '90%', size: 16 },
  { top: '26%', left: '6%',  size: 11, alt: true },
  { top: '58%', left: '88%', size: 14 },
  { top: '66%', left: '8%',  size: 17, alt: true },
  { top: '84%', left: '16%', size: 12 },
  { top: '90%', left: '82%', size: 16, alt: true },
];

export default function GameResults({
  playerScore, opponentScore, playerTime, opponentTime,
  totalQuestions, rankingDelta, currentRankingPoints, userId, winnerId,
  myName, oppName, myAvatarUrl, oppAvatarUrl, myWins, oppWins,
  onPlayAgain, onHome,
}: Props) {
  const navigation = useNavigation<any>();

  const totalQ    = totalQuestions || 10;
  const won       = winnerId != null ? winnerId === userId : playerScore > opponentScore;
  const draw      = winnerId === null || (winnerId === undefined && playerScore === opponentScore);
  const outcome   = draw ? 'draw' : won ? 'win' : 'lose';

  const fb = useFeedback();
  useEffect(() => {
    if (outcome === 'win') fb.win();
    else fb.lose();
    // play exactly once when the results mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Banner pops in with a spring.
  const bannerScale = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.spring(bannerScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 7 }).start();
  }, [bannerScale]);

  // Auto-return to the matchmaking (difficulty picker) screen after 10 s, with a
  // visible countdown. Any button press unmounts this screen → timer cleans up.
  const [autoCountdown, setAutoCountdown] = useState(10);
  const onHomeRef = useRef(onHome);
  useEffect(() => { onHomeRef.current = onHome; });
  useEffect(() => {
    if (!onHomeRef.current) return;
    if (autoCountdown <= 0) { onHomeRef.current(); return; }
    const t = setTimeout(() => setAutoCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [autoCountdown]);

  const animatedPlayerScore   = useCountUp(playerScore);
  const animatedOpponentScore = useCountUp(opponentScore);

  const cfg = {
    win:  { label: 'CHIẾN THẮNG!', sub: 'Bạn đã hoàn thành xuất sắc thử thách', banner: '#FFC53D', bannerShadow: '#C9740A' },
    lose: { label: 'THUA CUỘC',    sub: 'Cố gắng hơn ở trận sau nhé!',          banner: '#8FA3C8', bannerShadow: '#46536E' },
    draw: { label: 'HOÀ',          sub: 'Một trận đấu cân tài cân sức!',         banner: '#FFC53D', bannerShadow: '#C9740A' },
  }[outcome];

  const xpLabel = rankingDelta != null
    ? `${rankingDelta >= 0 ? '+' : ''}${rankingDelta}`
    : '+0';
  const xpColor = !rankingDelta ? C.inkSlate
    : rankingDelta > 0 ? C.successDeep : C.error;

  // Tug-of-war split — +0.5 each side so 0-0 still renders a 50/50 bar.
  const myFlex  = playerScore + 0.5;
  const opFlex  = opponentScore + 0.5;
  const clashPct = (myFlex / (myFlex + opFlex)) * 100;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      {/* starry background decor */}
      {SPARKLES.map((sp, i) => (
        <View
          key={i}
          style={[s.sparkle, { top: sp.top as any, left: sp.left as any }]}
          pointerEvents="none"
        >
          <AssetIcon
            source={sp.alt ? ASSETS.gameResults.sparkleAlt : ASSETS.gameResults.sparkle}
            size={sp.size}
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: sp.size }}
          />
        </View>
      ))}

      {won && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ConfettiCannon
            count={120}
            origin={{ x: APP_W / 2, y: -20 }}
            autoStart
            fadeOut
            explosionSpeed={350}
            fallSpeed={2800}
          />
        </View>
      )}

      <View style={s.content}>
        {/* ── Result card ── */}
        <View style={s.card}>
          {/* opponent pill overlapping the card's top edge */}
          <View style={[s.oppPill, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <AssetIcon source={ASSETS.gameResults.playAgain} size={13} style={s.oppPillTxt} />
            <Text style={s.oppPillTxt} numberOfLines={1}>
              Đấu với {oppName ?? 'Đối thủ'}
            </Text>
          </View>

          {/* banner */}
          <Animated.Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              s.banner,
              { color: cfg.banner, textShadowColor: cfg.bannerShadow, transform: [{ scale: bannerScale }] },
            ]}
          >
            {cfg.label}
          </Animated.Text>
          <Text style={s.bannerSub}>{cfg.sub}</Text>

          {/* time line */}
          <Text style={s.timeLine}>
            Tôi: <Text style={s.timeStrong}>{fmtTime(playerTime)}/{totalQ} câu</Text>
            {'   '}Đối thủ: <Text style={s.timeStrong}>{fmtTime(opponentTime)}/{totalQ} câu</Text>
          </Text>

          {/* tug-of-war bar */}
          <View style={s.tugWrap}>
            <View style={s.tugBar}>
              <View style={[s.tugMe, { flex: myFlex }]} />
              <View style={[s.tugOpp, { flex: opFlex }]} />
            </View>
            <View style={[s.clashWrap, { left: `${clashPct}%` as any }]} pointerEvents="none">
              <AssetIcon source={ASSETS.gameResults.clash} size={26} style={s.clashTxt} />
            </View>
          </View>

          {/* players */}
          <View style={s.playersRow}>
            <PlayerCol
              name={myName ?? 'Bạn'}
              avatarUrl={myAvatarUrl}
              fallbackEmoji={ASSETS.gameResults.youAvatar}
              score={animatedPlayerScore}
              wins={myWins}
              accent={C.orange}
              isWinner={!draw && won}
            />
            <PlayerCol
              name={oppName ?? 'Đối thủ'}
              avatarUrl={oppAvatarUrl}
              fallbackEmoji={ASSETS.gameResults.oppAvatar}
              score={animatedOpponentScore}
              wins={oppWins}
              accent={OPP_BLUE}
              isWinner={!draw && !won}
            />
          </View>

          {/* ranking */}
          <Text style={s.rankLine}>
            Điểm hạng: <Text style={[s.rankDelta, { color: xpColor }]}>{xpLabel}</Text>
            {currentRankingPoints != null && (
              <Text> · Tổng: {currentRankingPoints.toLocaleString()}</Text>
            )}
          </Text>
        </View>

        {/* ── CTA buttons (kept: same actions, Vietnamese labels) ── */}
        <View style={s.ctaRow}>
          <View style={s.ctaFlex}>
            <TactileButton
              title="Về trang chủ"
              variant="soft"
              style={{ paddingVertical: 16 }}  // match primary's height in the row
              textStyle={{ fontSize: 16 }}
              onPress={onHome ?? (() => navigation.navigate('HomeTab'))}
            />
          </View>
          <View style={s.ctaFlex}>
            <TactileButton
              title="Đấu tiếp"
              icon={ASSETS.gameResults.playAgain}
              onPress={onPlayAgain}
            />
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('MatchHistoryTab')}
          activeOpacity={0.7}
          style={[s.historyLink, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
        >
          <AssetIcon source={ASSETS.gameResults.history} size={14} style={s.historyLinkTxt} />
          <Text style={s.historyLinkTxt}>Xem lịch sử đấu</Text>
        </TouchableOpacity>

        {onHome != null && autoCountdown > 0 && (
          <Text style={s.autoLeave}>Tự về màn ghép trận sau {autoCountdown} giây</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function PlayerCol({
  name, avatarUrl, fallbackEmoji, score, wins, accent, isWinner,
}: {
  name: string; avatarUrl?: string | null; fallbackEmoji: any;
  score: number; wins?: number | null; accent: string; isWinner: boolean;
}) {
  return (
    <View style={s.playerCol}>
      <View style={[s.playerRing, { borderColor: accent }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={s.playerImg} />
        ) : (
          <AssetIcon source={fallbackEmoji} size={30} style={{ fontSize: 30 }} />
        )}
        {isWinner && (
          <View style={s.playerCrown}>
            <AssetIcon source={ASSETS.gameResults.crown} size={20} style={{ fontSize: 20 }} />
          </View>
        )}
      </View>
      <Text style={s.playerName} numberOfLines={1}>{name}</Text>
      <Text style={[s.playerScore, { color: accent }]}>{score} câu đúng</Text>
      {wins != null && <Text style={s.playerWins}>Thắng {wins} trận</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  // Starry-night stage
  safe:    { flex: 1, backgroundColor: C.navy },
  sparkle: { position: 'absolute', color: 'rgba(255,255,255,0.5)' },

  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, width: '100%', maxWidth: 430, alignSelf: 'center',
  },

  // The big light result card
  card: {
    width: '100%', backgroundColor: '#F4F9FF',
    borderRadius: 28, borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)',
    paddingTop: 34, paddingBottom: 20, paddingHorizontal: 18,
    alignItems: 'center', ...shadow('#000', 4),
  },
  oppPill: {
    position: 'absolute', top: -16, alignSelf: 'center',
    backgroundColor: C.navy, borderRadius: R.pill,
    paddingHorizontal: 16, paddingVertical: 7,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)',
  },
  oppPillTxt: { fontFamily: F.bodyBold, fontSize: 13, color: '#fff', maxWidth: 220 },

  banner: {
    fontFamily: F.displayBold, fontSize: 40, letterSpacing: 1,
    textAlign: 'center', maxWidth: '100%',
    textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0,
  },
  bannerSub: { fontFamily: F.body, fontSize: 13, color: C.inkBrown, marginTop: 4, textAlign: 'center' },

  timeLine:   { fontFamily: F.bodyMedium, fontSize: 12, color: C.inkSlate, marginTop: 14, textAlign: 'center' },
  timeStrong: { fontFamily: F.bodyBold, color: C.ink },

  // Tug-of-war
  tugWrap: { width: '100%', marginTop: 14, justifyContent: 'center' },
  tugBar: {
    flexDirection: 'row', height: 16, borderRadius: R.pill,
    overflow: 'hidden', borderWidth: 1.5, borderColor: '#fff',
    ...shadow('#000', 1),
  },
  tugMe:  { backgroundColor: C.orange },
  tugOpp: { backgroundColor: OPP_BLUE },
  clashWrap: { position: 'absolute', marginLeft: -13 },
  clashTxt:  { fontSize: 26, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  // Players
  playersRow: { flexDirection: 'row', width: '100%', marginTop: 18 },
  playerCol:  { flex: 1, alignItems: 'center', gap: 3 },
  playerRing: {
    width: 62, height: 62, borderRadius: 31, borderWidth: 2.5,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  playerImg:   { width: 54, height: 54, borderRadius: 27 },
  playerCrown: { position: 'absolute', top: -16, right: -8, fontSize: 20, transform: [{ rotate: '24deg' }] },
  playerName:  { fontFamily: F.bodyBold, fontSize: 13, color: C.ink, maxWidth: 130, marginTop: 4 },
  playerScore: { fontFamily: F.displayBold, fontSize: 15 },
  playerWins:  { fontFamily: F.bodyMedium, fontSize: 11, color: C.inkSlate },

  rankLine:  { fontFamily: F.bodyMedium, fontSize: 12, color: C.inkSlate, marginTop: 16 },
  rankDelta: { fontFamily: F.displayBold, fontSize: 13 },

  // CTAs on the navy stage
  ctaRow:  { flexDirection: 'row', gap: 12, width: '100%', marginTop: 26 },
  ctaFlex: { flex: 1 },
  historyLink:    { marginTop: 16, paddingVertical: 6, paddingHorizontal: 12 },
  historyLinkTxt: { fontFamily: F.bodyMedium, fontSize: 14, color: 'rgba(255,255,255,0.85)', textDecorationLine: 'underline' },
  autoLeave:      { marginTop: 10, fontFamily: F.bodyMedium, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
});
