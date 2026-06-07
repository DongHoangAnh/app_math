import React from 'react';
import VersusSplash from './VersusSplash';

interface Props {
  displayName: string;
  avatarUrl: string | null;
  wins: number | null;
  onCancel: () => void;
}

// Matchmaking — diagonal VS splash with a pulsing "?" opponent placeholder.
export default function QueuedPhase({ displayName, avatarUrl, wins, onCancel }: Props) {
  return (
    <VersusSplash
      me={{ name: displayName, avatarUrl, wins }}
      opponent={null}
      onCancel={onCancel}
    />
  );
}
