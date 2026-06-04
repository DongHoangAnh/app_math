import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { s } from './styles';
import { EMOJIS } from '../../../../shared/constants';
import ChatBubble from './ChatBubble';
import type { ChatMessage } from '../../../../shared/types';

interface Props {
  chatMessages: ChatMessage[];
  userId: string | null;
  scrollRef: React.RefObject<ScrollView | null>;
  chatInput: string;
  onChangeChat: (text: string) => void;
  onSendChat: () => void;
  onEmoji: (emoji: string) => void;
}

// Full chat panel shown while waiting for the opponent to finish (you_finished
// phase): scrollable history, emoji row, and a persistent text input.
export default function WaitChatPanel({
  chatMessages, userId, scrollRef,
  chatInput, onChangeChat, onSendChat, onEmoji,
}: Props) {
  const textMsgs = chatMessages.filter(m => m.type === 'chat');
  return (
    <View style={s.waitChatPanel}>
      <ScrollView
        ref={scrollRef}
        style={s.waitChatScroll}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {textMsgs.length === 0 && (
          <Text style={s.chatEmptyHint}>Nhắn gì đó với đối thủ nhé 👋</Text>
        )}
        {textMsgs.map(msg => (
          <ChatBubble key={msg.id} msg={msg} isMe={msg.fromUserId === userId} />
        ))}
      </ScrollView>

      <View style={s.emojiRow}>
        {EMOJIS.map(emoji => (
          <TouchableOpacity key={emoji} onPress={() => onEmoji(emoji)} style={s.emojiBtn} activeOpacity={0.7}>
            <Text style={s.emojiBtnText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.chatInputRow}>
        <TextInput
          style={s.chatInputField}
          value={chatInput}
          onChangeText={onChangeChat}
          placeholder="Nhắn gì với đối thủ..."
          placeholderTextColor="#AAA"
          maxLength={120}
          returnKeyType="send"
          onSubmitEditing={onSendChat}
        />
        <TouchableOpacity onPress={onSendChat} style={s.chatSendBtn}>
          <Text style={s.chatSendBtnText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
