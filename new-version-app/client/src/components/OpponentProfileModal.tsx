import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { C, R, F, shadow } from '../theme';
import { LevelBadge } from './LevelBadge';

interface PlayerStats {
  totalMatches: number; totalWins: number; winRate: number;
  totalScore: number; averageScore: number; bestStreak: number;
  currentStreak: number; level: number; nextLevelProgress: number;
  accuracyRate: number; avgTimePerMatch: number;
}

interface PublicProfile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  statsPublic: boolean;
  stats: PlayerStats | null;
}

interface Props {
  visible: boolean;
  opponentId: string | null;
  opponentName: string;
  onClose: () => void;
}

export default function OpponentProfileModal({
  visible, opponentId, opponentName, onClose,
}: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !opponentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProfile(null);
    fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/gameshow/profile/${opponentId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`http ${r.status}`);
        return r.json();
      })
      .then((data: PublicProfile) => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setError('Không tải được thông tin. Vui lòng thử lại.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, opponentId]);

  const name    = profile?.displayName ?? opponentName;
  const initial = (name.trim()[0] ?? 'M').toUpperCase();
  const stats   = profile?.stats;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        {/* Bấm nền để đóng */}
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={s.sheet}>
          <View style={s.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header: avatar + tên + level */}
            <View style={s.head}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitial}>{initial}</Text>
                </View>
              )}
              <Text style={s.name} numberOfLines={1}>{name}</Text>
              {profile && (
                <View style={s.levelWrap}>
                  <LevelBadge level={profile.level} size="md" />
                </View>
              )}
            </View>

            {loading ? (
              <ActivityIndicator color={C.orange} size="large" style={{ marginVertical: 40 }} />
            ) : error ? (
              <Text style={s.msg}>{error}</Text>
            ) : !profile ? null : !profile.statsPublic || !stats ? (
              <View style={s.lockBox}>
                <Text style={s.lockEmoji}>🔒</Text>
                <Text style={s.lockTitle}>Người chơi này đã ẩn thống kê</Text>
                <Text style={s.lockSub}>Chỉ có thể xem ảnh đại diện, tên và cấp độ.</Text>
              </View>
            ) : (
              <>
                {/* Lưới thống kê chính */}
                <View style={s.grid}>
                  <BigStat emoji="🎮" value={`${stats.totalMatches}`}        label="Trận chơi" />
                  <BigStat emoji="🥇" value={`${stats.totalWins}`}           label="Chiến thắng" valueColor={C.successDeep} />
                  <BigStat emoji="📈" value={`${stats.winRate.toFixed(1)}%`} label="Tỷ lệ thắng" valueColor={C.orange} />
                  <BigStat emoji="⭐" value={`${stats.totalScore}`}          label="Tổng điểm" valueColor={C.orangeDark} />
                </View>

                {/* Chuỗi thắng */}
                <View style={s.streakRow}>
                  <View style={[s.streakCard, { backgroundColor: C.peachBg, borderColor: C.peachBorder }]}>
                    <Text style={{ fontSize: 22 }}>🔥</Text>
                    <Text style={s.streakValue}>{stats.currentStreak}</Text>
                    <Text style={s.streakLabel}>Chuỗi hiện tại</Text>
                  </View>
                  <View style={[s.streakCard, { backgroundColor: '#FFF6D9', borderColor: '#FCE08A' }]}>
                    <Text style={{ fontSize: 22 }}>⚡</Text>
                    <Text style={s.streakValue}>{stats.bestStreak}</Text>
                    <Text style={s.streakLabel}>Chuỗi tốt nhất</Text>
                  </View>
                </View>

                {/* Hiệu suất */}
                <View style={s.perfCard}>
                  <PerfRow icon="🔢" label="Điểm TB / trận" value={`${stats.averageScore}`} />
                  <PerfRow icon="🎯" label="Tỷ lệ trả lời đúng" value={stats.totalMatches > 0 ? `${stats.accuracyRate.toFixed(1)}%` : '—'} />
                  <PerfRow icon="⏱️" label="Trung bình / trận" value={stats.totalMatches > 0 ? `${stats.avgTimePerMatch.toFixed(1)}s` : '—'} isLast />
                </View>
              </>
            )}

            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={s.closeTxt}>Đóng</Text>
            </TouchableOpacity>

            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function BigStat({
  emoji, value, label, valueColor,
}: { emoji: string; value: string; label: string; valueColor?: string }) {
  return (
    <View style={s.bigStat}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <Text style={[s.bigStatValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={s.bigStatLabel}>{label}</Text>
    </View>
  );
}

function PerfRow({
  icon, label, value, isLast,
}: { icon: string; label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[s.perfRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={s.perfLabel}>{label}</Text>
      <Text style={s.perfValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.sheet, borderTopRightRadius: R.sheet,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '88%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.line, alignSelf: 'center', marginBottom: 12,
  },

  head: { alignItems: 'center', marginBottom: 20 },
  avatarImg: {
    width: 88, height: 88, borderRadius: R.pill,
    borderWidth: 3, borderColor: C.orange,
  },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: R.pill,
    backgroundColor: C.peachGlow,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: C.orange,
  },
  avatarInitial: { fontSize: 36, fontFamily: F.displayBold, color: C.orangeDeepest },
  name: { fontSize: 20, fontFamily: F.display, color: C.ink, marginTop: 12, maxWidth: '90%' },
  levelWrap: { marginTop: 8 },

  msg: { textAlign: 'center', color: C.error, fontFamily: F.body, fontSize: 14, marginVertical: 32 },

  lockBox: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12 },
  lockEmoji: { fontSize: 44, marginBottom: 10 },
  lockTitle: { fontSize: 16, fontFamily: F.display, color: C.ink, textAlign: 'center' },
  lockSub:   { fontSize: 13, fontFamily: F.body, color: C.inkSlate, textAlign: 'center', marginTop: 6 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bigStat: {
    width: '47%', flexGrow: 1, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.line, borderRadius: R.md,
    paddingVertical: 14, alignItems: 'center', gap: 2, ...shadow('#000', 1),
  },
  bigStatValue: { fontFamily: F.displayBold, fontSize: 22, color: C.ink },
  bigStatLabel: { fontFamily: F.bodyMedium, fontSize: 12, color: C.inkSlate },

  streakRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  streakCard: { flex: 1, borderRadius: R.md, borderWidth: 1, padding: 14, alignItems: 'center', gap: 2 },
  streakValue: { fontFamily: F.displayBold, fontSize: 26, color: C.ink },
  streakLabel: { fontFamily: F.bodyMedium, fontSize: 12, color: C.inkBrown, marginTop: 2 },

  perfCard: {
    backgroundColor: C.surface, borderRadius: R.md, overflow: 'hidden',
    borderWidth: 1, borderColor: C.line, marginTop: 12, ...shadow('#000', 1),
  },
  perfRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  perfLabel: { flex: 1, fontFamily: F.body, fontSize: 14, color: C.inkBrown },
  perfValue: { fontFamily: F.display, fontSize: 15, color: C.ink },

  closeBtn: {
    marginTop: 20, paddingVertical: 14, borderRadius: R.pill,
    borderWidth: 2, borderColor: C.inkSlateDeep, alignItems: 'center',
  },
  closeTxt: { fontSize: 15, fontFamily: F.display, color: C.ink },
});
