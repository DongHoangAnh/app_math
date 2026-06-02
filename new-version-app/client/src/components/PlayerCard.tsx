/**
 * PlayerCard Component - React Native
 * Displays player information and stats
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, R } from '../theme';

interface PlayerCardProps {
  name: string;
  score: number;
  isWinner?: boolean;
  grade?: string;
  avatar?: string;
}

export default function PlayerCard({
  name,
  score,
  isWinner,
  grade,
}: PlayerCardProps) {
  return (
    <View style={[styles.card, isWinner && styles.cardWinner]}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name[0]}</Text>
        </View>
      </View>

      <Text style={styles.name}>{name}</Text>
      {grade && <Text style={styles.grade}>Lớp {grade}</Text>}

      <Text style={styles.scoreLabel}>Điểm</Text>
      <Text style={styles.score}>{score}</Text>

      {isWinner && (
        <View style={styles.winnerBadge}>
          <Text style={styles.winnerText}>👑 Winner</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
  },
  cardWinner: {
    borderColor: '#FFD700',
    backgroundColor: '#FFFBF0',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  grade: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
  },
  score: {
    fontSize: 32,
    fontWeight: '700',
    color: C.primary,
    marginTop: 4,
  },
  winnerBadge: {
    backgroundColor: '#FFD700',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  winnerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
});
