import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { C } from '../../theme';
import { TactileButton } from '../../components/ui';
import { MODES } from '../../../../shared/constants';
import { s } from './styles';

interface Props {
  selectedMode: string;
  onSelectMode: (mode: string) => void;
  myRankingPoints: number | null;
  error: string | null;
  userId: string | null;
  onJoin: () => void;
  onHistory: () => void;
}

// PK landing screen — VS banner, mode picker, "vào trận" + match-history links.
export default function IdlePhase({
  selectedMode, onSelectMode, myRankingPoints, error, userId, onJoin, onHistory,
}: Props) {
  return (
    <SafeAreaView style={s.bg}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.idleWrap} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.idleTitle}>⚔️ Chế Độ PK</Text>
        <Text style={s.idleSub}>Thách đấu toàn server · Real-time 1v1</Text>

        <View style={s.idleVsRow}>
          <View style={[s.idleAvatar, { borderColor: C.primary }]}>
            <Text style={s.idleAvatarEmoji}>🐱</Text>
          </View>
          <Text style={s.idleVsLabel}>VS</Text>
          <View style={[s.idleAvatar, { borderColor: '#DDD' }]}>
            <Text style={[s.idleAvatarEmoji, { opacity: 0.35 }]}>?</Text>
          </View>
        </View>

        {myRankingPoints != null && (
          <Text style={s.idlePts}>Điểm xếp hạng: {myRankingPoints}</Text>
        )}

        <Text style={s.sectionLabel}>Chọn chế độ</Text>
        <View style={s.modeRow}>
          {MODES.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[s.modeCard, selectedMode === m.id && s.modeCardOn]}
              onPress={() => onSelectMode(m.id)}
              activeOpacity={0.8}
            >
              <Text style={s.modeIcon}>{m.icon}</Text>
              <Text style={[s.modeName, selectedMode === m.id && { color: C.primary }]}>
                {m.label}
              </Text>
              <Text style={s.modeDiff}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <View style={s.errBox}>
            <Text style={s.errTxt}>{error}</Text>
          </View>
        ) : null}

        <TactileButton
          title="Vào trận ngay"
          icon="⚔️"
          onPress={onJoin}
          disabled={!userId}
        />

        <TouchableOpacity style={s.historyBtn} onPress={onHistory} activeOpacity={0.8}>
          <Text style={s.historyBtnTxt}>📜 Lịch sử đấu</Text>
        </TouchableOpacity>

        {!userId && (
          <Text style={s.loginHint}>Vui lòng đăng nhập để chơi</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
