import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { C } from '../../theme';
import { s } from './styles';

interface Props {
  displayName: string;
  opponentName: string;
  countdown: number;
}

// "Đã tìm thấy đối thủ" — both avatars + a 3·2·1·🚀 countdown before play.
export default function MatchFoundPhase({ displayName, opponentName, countdown }: Props) {
  return (
    <SafeAreaView style={s.bg}>
      <View style={s.centered}>
        <View style={s.queueAvatarRow}>
          <View style={s.matchPlayer}>
            <View style={[s.bigRing, { borderColor: C.primary }]}>
              <Text style={s.bigEmoji}>🐱</Text>
            </View>
            <Text style={s.matchName} numberOfLines={1}>{displayName}</Text>
          </View>
          <Text style={s.vsHuge}>VS</Text>
          <View style={s.matchPlayer}>
            <View style={[s.bigRing, { borderColor: C.error }]}>
              <Text style={s.bigEmoji}>🐻</Text>
            </View>
            <Text style={s.matchName} numberOfLines={1}>{opponentName}</Text>
          </View>
        </View>

        <Text style={s.countdownBig}>{countdown > 0 ? countdown : '🚀'}</Text>
        <Text style={s.searchSub}>Chuẩn bị bắt đầu!</Text>
      </View>
    </SafeAreaView>
  );
}
