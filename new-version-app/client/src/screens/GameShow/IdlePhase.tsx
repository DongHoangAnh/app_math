import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
import { C } from '../../theme';
import { DIFFICULTIES } from '../../../../shared/constants';
import { s } from './styles';
import { ASSETS } from '../../assets';

interface Props {
  myRankingPoints: number | null;
  myAvatarUrl: string | null;
  error: string | null;
  userId: string | null;
  /** Tapping a difficulty card joins the queue at that difficulty right away. */
  onJoin: (difficulty: number) => void;
  onHistory: () => void;
}

// Per-difficulty card colors (UI-only concern, so kept here not in shared/).
const DIFF_COLORS: Record<number, { accent: string; tint: string; border: string }> = {
  1: { accent: '#2E9E45', tint: '#E9F7EA', border: '#BFE5C4' },
  2: { accent: '#E0A100', tint: '#FFF7E0', border: '#F1DC9A' },
  3: { accent: C.orange,  tint: '#FFF0E9', border: C.peachBorder },
};

// Battle Math lobby: history button on top, then one colored card per difficulty —
// title + range/multiplier description + me-vs-? row. Tapping queues immediately.
export default function IdlePhase({
  myRankingPoints, myAvatarUrl, error, userId, onJoin, onHistory,
}: Props) {
  return (
    <SafeAreaView style={s.bg}>
      {/* ── Header bar ── */}
      <View style={s.lobbyBar}>
        <View style={s.lobbyBarTop}>
          <Text style={s.lobbyTitle} numberOfLines={1}>{`${ASSETS.gameshow.pkTitle} Battle Math`}</Text>
          <TouchableOpacity style={s.historyPill} onPress={onHistory} activeOpacity={0.8}>
            <Text style={s.historyPillTxt}>{`${ASSETS.gameshow.history} Lịch sử`}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.lobbySub}>Chọn độ khó · Real-time 1v1</Text>
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

        {/* ── One tappable card per difficulty — tap = queue right away ── */}
        {DIFFICULTIES.map(d => {
          const dc = DIFF_COLORS[d.id] ?? DIFF_COLORS[1];
          return (
            <TouchableOpacity
              key={d.id}
              style={[s.lobbyCard, { backgroundColor: dc.tint, borderColor: dc.border }, !userId && { opacity: 0.55 }]}
              onPress={() => onJoin(d.id)}
              disabled={!userId}
              activeOpacity={0.8}
              accessibilityLabel={`Vào trận ${d.label}`}
            >
              <View style={s.lobbyCardHead}>
                <View style={s.lobbyCardIcon}>
                  <Text style={{ fontSize: 20 }}>{d.icon}</Text>
                </View>
                <Text style={s.lobbyCardTitle}>{d.label}</Text>
                <View style={[s.lobbyChip, { backgroundColor: dc.accent }]}>
                  <Text style={s.lobbyChipTxt}>{d.desc}</Text>
                </View>
              </View>

              <Text style={s.lobbyCardDetail}>{d.detail}</Text>

              <View style={s.lobbyPkRow}>
                <View style={s.lobbyPlayer}>
                  <View style={[s.lobbyAva, { borderColor: dc.accent }]}>
                    {myAvatarUrl ? (
                      <Image source={{ uri: myAvatarUrl }} style={s.lobbyAvaImg} />
                    ) : (
                      <Text style={{ fontSize: 24 }}>{ASSETS.gameshow.youAvatar}</Text>
                    )}
                  </View>
                  <Text style={s.lobbyAvaLabel}>Tôi</Text>
                </View>
                <Text style={[s.lobbyPkTxt, { color: dc.accent }]}>VS</Text>
                <View style={s.lobbyPlayer}>
                  <View style={[s.lobbyAva, { borderColor: C.line }]}>
                    <Text style={{ fontSize: 22, color: C.inkSlate }}>?</Text>
                  </View>
                  <Text style={s.lobbyAvaLabel}>Đối thủ</Text>
                </View>
              </View>

              <Text style={[s.lobbyTapHint, { color: dc.accent }]}>
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
