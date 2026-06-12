import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, Animated, Easing,
  StatusBar, useWindowDimensions,
} from 'react-native';
import { s } from './styles';
import { ASSETS } from '../../assets';
import AssetIcon from '../../components/AssetIcon';

interface SideInfo {
  name: string;
  avatarUrl?: string | null;
  wins?: number | null;
}

interface Props {
  me: SideInfo;
  /** null while still searching — shows the pulsing "?" placeholder. */
  opponent: SideInfo | null;
  /** Shown inside the VS badge during match_found (0 → rocket). */
  countdown?: number;
  onCancel?: () => void;
}

// Full-bleed "VS" matchmaking splash (Xiaoyuan Kousuan style):
// a diagonal navy/orange split — opponent on the top-left half, me on the
// bottom-right half — separated by a white slanted stripe with a VS badge.
export default function VersusSplash({ me, opponent, countdown, onCancel }: Props) {
  const { width: W, height: H } = useWindowDimensions();

  // Oversized rotated sheets create the diagonal split. The white sheet is a
  // bit taller than the navy one, so it peeks out as the divider stripe.
  const sheetW    = W * 1.6;
  const sheetH    = H * 0.58;
  const sheetTop  = -H * 0.1;
  const sheetLeft = -(sheetW - W) / 2;
  const dividerY  = sheetTop + sheetH; // where the slanted edge crosses mid-screen

  // Searching: animated "…" dots + sonar ripples around the placeholder ring.
  const [dots, setDots] = useState(0);
  useEffect(() => {
    if (opponent) return;
    const id = setInterval(() => setDots(d => (d + 1) % 4), 450);
    return () => clearInterval(id);
  }, [opponent]);

  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (opponent) return;
    const mkLoop = (v: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]));
    const l1 = mkLoop(ripple1, 0);
    const l2 = mkLoop(ripple2, 800);
    l1.start(); l2.start();
    return () => { l1.stop(); l2.stop(); ripple1.setValue(0); ripple2.setValue(0); };
  }, [opponent, ripple1, ripple2]);

  const rippleStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 0.7, 0.25, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
  });

  // Pop-in spring when the opponent is revealed.
  const oppPop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!opponent) { oppPop.setValue(1); return; }
    oppPop.setValue(0.2);
    Animated.spring(oppPop, { toValue: 1, useNativeDriver: true, tension: 160, friction: 7 }).start();
  }, [!!opponent]); // eslint-disable-line react-hooks/exhaustive-deps

  const matchFound = opponent != null;

  return (
    <View style={s.vsWrap}>
      <StatusBar barStyle="light-content" />

      {/* Diagonal sheets: white stripe first, navy on top of it */}
      <View style={[s.vsSheetWhite, {
        width: sheetW, height: sheetH + 14, top: sheetTop, left: sheetLeft,
        transform: [{ rotate: '-8deg' }],
      }]} />
      <View style={[s.vsSheetNavy, {
        width: sheetW, height: sheetH, top: sheetTop, left: sheetLeft,
        transform: [{ rotate: '-8deg' }],
      }]} />

      {/* ── Opponent (top-left) ── */}
      <View style={[s.vsSide, { top: H * 0.15, transform: [{ translateX: -W * 0.16 }] }]}>
        <View style={s.vsRingWrap}>
          {!matchFound && (
            <>
              <Animated.View style={[s.vsRipple, rippleStyle(ripple1)]} />
              <Animated.View style={[s.vsRipple, rippleStyle(ripple2)]} />
            </>
          )}
          <Animated.View style={[s.vsAvatarRing, { transform: [{ scale: oppPop }] }]}>
            {matchFound ? (
              opponent.avatarUrl ? (
                <Image source={{ uri: opponent.avatarUrl }} style={s.vsAvatarImg} />
              ) : (
                <AssetIcon source={ASSETS.gameshow.oppAvatar} size={46} style={s.vsAvatarEmoji} />
              )
            ) : (
              <Text style={s.vsSearchMark}>?</Text>
            )}
          </Animated.View>
        </View>

        {matchFound ? (
          <>
            <Text style={s.vsName} numberOfLines={1}>{opponent.name}</Text>
            {opponent.wins != null && (
              <Text style={s.vsMeta}>Thắng {opponent.wins} trận</Text>
            )}
          </>
        ) : (
          <Text style={s.vsName}>
            Đang ghép trận
            {[0, 1, 2].map(i => (
              <Text key={i} style={{ opacity: dots > i ? 1 : 0.15 }}>.</Text>
            ))}
          </Text>
        )}
      </View>

      {/* ── VS badge on the divider ── */}
      <View style={[s.vsBadge, { top: dividerY - 42 }]}>
        {matchFound && countdown !== undefined ? (
          countdown > 0 ? (
            <Text style={s.vsCountTxt}>{countdown}</Text>
          ) : (
            <AssetIcon source={ASSETS.gameshow.rocket} size={40} style={s.vsCountTxt} />
          )
        ) : (
          <Text style={s.vsBadgeTxt}>VS</Text>
        )}
      </View>
      {matchFound && (
        <Text style={[s.vsStatusTxt, { top: dividerY + 52 }]}>Chuẩn bị bắt đầu!</Text>
      )}

      {/* ── Me (bottom-right) ── */}
      <View style={[s.vsSide, { top: H * 0.62, transform: [{ translateX: W * 0.16 }] }]}>
        <View style={s.vsAvatarRing}>
          {me.avatarUrl ? (
            <Image source={{ uri: me.avatarUrl }} style={s.vsAvatarImg} />
          ) : (
            <AssetIcon source={ASSETS.gameshow.youAvatar} size={46} style={s.vsAvatarEmoji} />
          )}
        </View>
        <Text style={s.vsName} numberOfLines={1}>{me.name} (Tôi)</Text>
        {me.wins != null && (
          <Text style={s.vsMeta}>Thắng {me.wins} trận</Text>
        )}
      </View>

      {/* ── Cancel (searching only) ── */}
      {!matchFound && onCancel && (
        <TouchableOpacity style={s.vsCancel} onPress={onCancel} activeOpacity={0.7}>
          <Text style={s.vsCancelTxt}>Huỷ tìm</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
