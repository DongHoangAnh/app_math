import React from 'react';
import VersusSplash from './VersusSplash';

interface Props {
  displayName: string;
  myAvatarUrl: string | null;
  myWins: number | null;
  opponentName: string;
  oppAvatarUrl: string | null;
  oppWins: number | null;
  countdown: number;
}

// "Đã tìm thấy đối thủ" — same VS splash, opponent revealed + 3·2·1·🚀 countdown.
export default function MatchFoundPhase({
  displayName, myAvatarUrl, myWins, opponentName, oppAvatarUrl, oppWins, countdown,
}: Props) {
  return (
    <VersusSplash
      me={{ name: displayName, avatarUrl: myAvatarUrl, wins: myWins }}
      opponent={{ name: opponentName, avatarUrl: oppAvatarUrl, wins: oppWins }}
      countdown={countdown}
    />
  );
}
