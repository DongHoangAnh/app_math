import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { C } from '../../theme';
import { s } from './styles';
import { ASSETS } from '../../assets';

// Matchmaking spinner — "đang tìm đối thủ" with a cancel link.
export default function QueuedPhase({ onCancel }: { onCancel: () => void }) {
  return (
    <SafeAreaView style={s.bg}>
      <View style={s.centered}>
        <View style={s.queueAvatarRow}>
          <View style={[s.bigRing, { borderColor: C.primary }]}>
            <Text style={s.bigEmoji}>{ASSETS.gameshow.youAvatar}</Text>
          </View>
          <Text style={s.vsHuge}>VS</Text>
          <View style={[s.bigRing, { borderColor: '#DDD' }]}>
            <Text style={[s.bigEmoji, { color: '#CCC' }]}>?</Text>
          </View>
        </View>

        <Text style={s.readyTitle}>Sẵn sàng...</Text>
        <Text style={s.searchSub}>Đang tìm đối thủ...</Text>

        <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={s.cancelTxt}>Huỷ tìm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
