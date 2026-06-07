import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
import { C } from '../../theme';
import { MODES } from '../../../../shared/constants';
import { s } from './styles';
import { ASSETS } from '../../assets';

interface Props {
  myRankingPoints: number | null;
  myAvatarUrl: string | null;
  error: string | null;
  userId: string | null;
  /** Tapping a mode card joins the queue with that mode right away. */
  onJoin: (mode: string) => void;
  onHistory: () => void;
}

// Per-mode card colors (UI-only concern, so kept here not in shared/).
const MODE_COLORS: Record<string, { accent: string; tint: string; border: string }> = {
  add_sub: { accent: '#2E9E45', tint: '#E9F7EA', border: '#BFE5C4' },
  mul_div: { accent: '#4D7CFE', tint: '#ECF1FF', border: '#C8D6FF' },
  mixed:   { accent: C.orange,  tint: '#FFF0E9', border: C.peachBorder },
};

// Battle Math lobby (Xiaoyuan-style): history button on top, then one colored
// card per mode — title + short description + me-vs-? row. Tapping the card
// itself queues for a match immediately (no separate start button).
export default function IdlePhase({
  myRankingPoints, myAvatarUrl, error, userId, onJoin, onHistory,
}: Props) {
  return (
    <SafeAreaView style={s.bg}>
      {/* ── Header bar: title + sub + ranking + history, one solid banner ── */}
      <View style={s.lobbyBar}>
        <View style={s.lobbyBarTop}>
          <Text style={s.lobbyTitle} numberOfLines={1}>{`${ASSETS.gameshow.pkTitle} Battle Math`}</Text>
          <TouchableOpacity style={s.historyPill} onPress={onHistory} activeOpacity={0.8}>
            <Text style={s.historyPillTxt}>{`${ASSETS.gameshow.history} Lịch sử`}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.lobbySub}>Thách đấu toàn server · Real-time 1v1</Text>
        {myRankingPoints != null && (
          <View style={s.lobbyPtsChip}>
            <Text style={s.lobbyPtsTxt}>
              {ASSETS.home.points} Điểm xếp hạng: {myRankingPoints.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.idleWrap} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={s.errBox}>
            <Text style={s.errTxt}>{error}</Text>
          </View>
        ) : null}

        {/* ── One tappable card per mode — tap = queue right away ── */}
        {MODES.map(m => {
          const mc = MODE_COLORS[m.id] ?? MODE_COLORS.mixed;
          return (
            <TouchableOpacity
              key={m.id}
              style={[s.lobbyCard, { backgroundColor: mc.tint, borderColor: mc.border }, !userId && { opacity: 0.55 }]}
              onPress={() => onJoin(m.id)}
              disabled={!userId}
              activeOpacity={0.8}
              accessibilityLabel={`Vào trận ${m.label}`}
            >
              <View style={s.lobbyCardHead}>
                <View style={s.lobbyCardIcon}>
                  <Text style={{ fontSize: 20 }}>{m.icon}</Text>
                </View>
                <Text style={s.lobbyCardTitle}>{m.label}</Text>
                <View style={[s.lobbyChip, { backgroundColor: mc.accent }]}>
                  <Text style={s.lobbyChipTxt}>{m.desc}</Text>
                </View>
              </View>

              <Text style={s.lobbyCardDetail}>{m.detail}</Text>

              <View style={s.lobbyPkRow}>
                <View style={s.lobbyPlayer}>
                  <View style={[s.lobbyAva, { borderColor: mc.accent }]}>
                    {myAvatarUrl ? (
                      <Image source={{ uri: myAvatarUrl }} style={s.lobbyAvaImg} />
                    ) : (
                      <Text style={{ fontSize: 24 }}>{ASSETS.gameshow.youAvatar}</Text>
                    )}
                  </View>
                  <Text style={s.lobbyAvaLabel}>Tôi</Text>
                </View>
                <Text style={[s.lobbyPkTxt, { color: mc.accent }]}>VS</Text>
                <View style={s.lobbyPlayer}>
                  <View style={[s.lobbyAva, { borderColor: C.line }]}>
                    <Text style={{ fontSize: 22, color: C.inkSlate }}>?</Text>
                  </View>
                  <Text style={s.lobbyAvaLabel}>Đối thủ</Text>
                </View>
              </View>

              <Text style={[s.lobbyTapHint, { color: mc.accent }]}>
                Chạm để vào trận ngay {ASSETS.home.bolt}
              </Text>
            </TouchableOpacity>
          );
        })}

        {!userId && (
          <Text style={s.loginHint}>Vui lòng đăng nhập để chơi</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
