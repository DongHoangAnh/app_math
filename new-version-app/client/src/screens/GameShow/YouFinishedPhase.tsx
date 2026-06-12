import React from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { C } from '../../theme';
import { s } from './styles';
import { type FloatingEmoji } from './utils';
import { ASSETS } from '../../assets';
import AssetIcon from '../../components/AssetIcon';
import FloatingEmojiLayer from './FloatingEmojiLayer';
import WaitChatPanel from './WaitChatPanel';
import type { ChatMessage } from '../../../../shared/types';

interface Props {
  myScore: number;
  total: number;
  opponentAnsweredCount: number;
  floatingEmojis: FloatingEmoji[];
  chatMessages: ChatMessage[];
  userId: string | null;
  chatScrollRef: React.RefObject<ScrollView | null>;
  chatInput: string;
  onChangeChat: (text: string) => void;
  onSendChat: () => void;
  onEmoji: (emoji: string) => void;
}

// Player done, opponent still answering — show my score and a full chat panel.
export default function YouFinishedPhase({
  myScore, total, opponentAnsweredCount, floatingEmojis,
  chatMessages, userId, chatScrollRef, chatInput, onChangeChat, onSendChat, onEmoji,
}: Props) {
  return (
    <KeyboardAvoidingView
      style={s.bg}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FloatingEmojiLayer emojis={floatingEmojis} />

      <View style={s.centerFlex}>
        <View style={{ marginBottom: 16 }}>
          <AssetIcon source={ASSETS.gameshow.youFinished} size={52} style={{ fontSize: 52 }} />
        </View>
        <Text style={s.waitTitle}>Bạn đã hoàn thành!</Text>
        <Text style={s.waitSub}>
          Đang chờ đối thủ · {opponentAnsweredCount}/{total} câu
        </Text>
        <Text style={[s.waitSub, { color: C.primary, marginTop: 16 }]}>
          Điểm của bạn: {myScore}/{total}
        </Text>
      </View>

      <WaitChatPanel
        chatMessages={chatMessages}
        userId={userId}
        scrollRef={chatScrollRef}
        chatInput={chatInput}
        onChangeChat={onChangeChat}
        onSendChat={onSendChat}
        onEmoji={onEmoji}
      />
    </KeyboardAvoidingView>
  );
}
