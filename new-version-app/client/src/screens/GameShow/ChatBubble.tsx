import React from 'react';
import { View, Text } from 'react-native';
import { s } from './styles';
import type { ChatMessage } from '../../../../shared/types';

// Single chat bubble — aligned right + amber when it's mine, left + light otherwise.
export default function ChatBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  return (
    <View style={[s.chatBubble, isMe ? s.chatBubbleMe : s.chatBubbleThem]}>
      <Text style={isMe ? s.chatNameMe : s.chatNameThem}>
        {isMe ? 'Bạn' : msg.fromName.split(' ').pop()}
      </Text>
      <Text style={isMe ? s.chatTextMe : s.chatTextThem}>{msg.text}</Text>
    </View>
  );
}
