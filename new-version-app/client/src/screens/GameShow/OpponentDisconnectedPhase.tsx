import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { C } from '../../theme';
import { TactileButton } from '../../components/ui';
import { s } from './styles';

interface Props {
  rankingDelta: number | null;
  onPlayAgain: () => void;
}

// Opponent rage-quit → default win for the player.
export default function OpponentDisconnectedPhase({ rankingDelta, onPlayAgain }: Props) {
  return (
    <SafeAreaView style={s.bg}>
      <View style={s.centerFlex}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>🏃</Text>
        <Text style={s.waitTitle}>Đối thủ bỏ cuộc!</Text>
        <Text style={[s.waitSub, { marginBottom: 28 }]}>Bạn thắng mặc định 🎉</Text>
        {rankingDelta != null && (
          <Text style={{ fontSize: 18, color: C.success, fontWeight: '700', marginBottom: 24 }}>
            +{rankingDelta} điểm xếp hạng
          </Text>
        )}
        <View style={{ width: '80%' }}>
          <TactileButton title="Chơi Trận Mới" icon="⚔️" onPress={onPlayAgain} />
        </View>
      </View>
    </SafeAreaView>
  );
}
