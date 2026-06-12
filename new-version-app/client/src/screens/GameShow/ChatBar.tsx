import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { s } from './styles';
import { EMOJIS } from '../../../../shared/constants';
import { ASSETS } from '../../assets';
import ChatBubble from './ChatBubble';
import AssetIcon from '../../components/AssetIcon';
import type { ChatMessage } from '../../../../shared/types';

interface Props {
  chatMessages: ChatMessage[];
  userId: string | null;
  showChatInput: boolean;
  onToggleChat: () => void;
  chatInput: string;
  onChangeChat: (text: string) => void;
  onSendChat: () => void;
  onEmoji: (emoji: string) => void;
}

// Interaction bar shown during play: last two chat bubbles, an optional text
// input, and the emoji quick-react row with a 💬 toggle.
export default function ChatBar({
  chatMessages, userId, showChatInput, onToggleChat,
  chatInput, onChangeChat, onSendChat, onEmoji,
}: Props) {
  return (
    <View style={s.chatBar}>
      {chatMessages.filter(m => m.type === 'chat').slice(-2).map(msg => (
        <ChatBubble key={msg.id} msg={msg} isMe={msg.fromUserId === userId} />
      ))}

      {showChatInput && (
        <View style={s.chatInputRow}>
          <TextInput
            style={s.chatInputField}
            value={chatInput}
            onChangeText={onChangeChat}
            placeholder="Nhắn tin..."
            placeholderTextColor="#AAA"
            maxLength={120}
            autoFocus
            returnKeyType="send"
            onSubmitEditing={onSendChat}
          />
          <TouchableOpacity onPress={onSendChat} style={s.chatSendBtn}>
            <Text style={s.chatSendBtnText}>Gửi</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.emojiRow}>
        {EMOJIS.map(emoji => (
          <TouchableOpacity
            key={emoji}
            onPress={() => onEmoji(emoji)}
            style={s.emojiBtn}
            activeOpacity={0.7}
          >
            <Text style={s.emojiBtnText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={onToggleChat}
          style={[s.emojiBtn, showChatInput && s.emojiBtnActive]}
          activeOpacity={0.7}
        >
          <AssetIcon source={ASSETS.gameshow.chat} size={22} style={s.emojiBtnText} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
