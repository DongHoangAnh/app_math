import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  Image, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { C, R, F, shadow } from '../theme';
import { LevelBadge } from './LevelBadge';
import { gameApi, type PublicProfile } from '../services/api';
import { ASSETS } from '../assets';

interface Props {
  visible: boolean;
  opponentId: string | null;
  fallbackName?: string;
  onClose: () => void;
}

export default function OpponentInfoModal({ visible, opponentId, fallbackName, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  useEffect(() => {
    if (!visible || !opponentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProfile(null);
    gameApi.getOpponentProfile(opponentId)
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setError('Không tải được thông tin người chơi.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, opponentId]);

  const name = profile?.displayName ?? fallbackName ?? 'Đối thủ';
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  const stats = profile?.stats ?? null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        {/* Chặn sự kiện chạm lan xuống backdrop khi bấm vào nội dung */}
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />

          {loading ? (
            <ActivityIndicator color={C.primary} size="large" style={{ marginVertical: 48 }} />
          ) : error ? (
            <View style={s.centerBox}>
              <Text style={s.errTxt}>{error}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={s.closeTxt}>Đóng</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* ── Header: ảnh, tên, level ── */}
              <View style={s.header}>
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={s.avatarImg} />
                ) : (
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initial}</Text>
                  </View>
                )}
                <Text style={s.name} numberOfLines={1}>{name}</Text>
                <View style={{ marginTop: 4 }}>
                  <LevelBadge level={profile?.level ?? 1} size="md" />
                </View>
              </View>

              {stats ? (
                <>
                  {/* ── Thống kê chi tiết ── */}
                  <View style={s.grid}>
                    <BigStat emoji={ASSETS.opponentInfo.matches} value={`${stats.totalMatches}`}        label="Trận chơi" />
                    <BigStat emoji={ASSETS.opponentInfo.wins} value={`${stats.totalWins}`}           label="Chiến thắng" valueColor={C.successDeep} />
                    <BigStat emoji={ASSETS.opponentInfo.winRate} value={`${stats.winRate.toFixed(1)}%`} label="Tỷ lệ thắng" valueColor={C.orange} />
                    <BigStat emoji={ASSETS.opponentInfo.score} value={`${stats.totalScore}`}          label="Tổng điểm" valueColor={C.orangeDark} />
                  </View>

                  <View style={s.perfCard}>
                    <PerfRow icon={ASSETS.opponentInfo.streakNow} label="Chuỗi thắng hiện tại" value={`${stats.currentStreak}`} />
                    <PerfRow icon={ASSETS.opponentInfo.streakBest} label="Chuỗi thắng tốt nhất" value={`${stats.bestStreak}`} />
                    <PerfRow icon={ASSETS.opponentInfo.accuracy} label="Tỷ lệ trả lời đúng" value={stats.totalMatches > 0 ? `${stats.accuracyRate.toFixed(1)}%` : '—'} />
                    <PerfRow icon={ASSETS.opponentInfo.ranking} label="Điểm xếp hạng" value={`${profile?.rankingPoints ?? 0}`} isLast />
                  </View>
                </>
              ) : (
                <View style={s.hiddenBox}>
                  <Text style={s.hiddenEmoji}>{ASSETS.opponentInfo.locked}</Text>
                  <Text style={s.hiddenText}>Người chơi này đã ẩn thông tin chi tiết.</Text>
                </View>
              )}

              <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={s.closeTxt}>Đóng</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
    backgroundColor: C.line, marginBottom: 12,
  },

  header: { alignItems: 'center', marginBottom: 16 },
  avatarImg: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.peachBg },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 34, fontFamily: F.displayBold, color: '#fff' },
  name: { fontSize: 20, fontFamily: F.display, color: C.ink, marginTop: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bigStat: {
    width: '47%', flexGrow: 1, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.line, borderRadius: R.md,
    paddingVertical: 14, alignItems: 'center', gap: 2, ...shadow('#000', 1),
  },
  bigStatValue: { fontFamily: F.displayBold, fontSize: 22, color: C.ink },
  bigStatLabel: { fontFamily: F.bodyMedium, fontSize: 12, color: C.inkSlate },

  perfCard: {
    marginTop: 14, backgroundColor: C.surface, borderRadius: R.md, overflow: 'hidden',
    borderWidth: 1, borderColor: C.line, ...shadow('#000', 1),
  },
  perfRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  perfLabel: { flex: 1, fontFamily: F.body, fontSize: 14, color: C.inkBrown },
  perfValue: { fontFamily: F.display, fontSize: 15, color: C.ink },

  hiddenBox: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  hiddenEmoji: { fontSize: 44, marginBottom: 10 },
  hiddenText: { fontSize: 14, color: C.inkBrown, textAlign: 'center', fontFamily: F.body },

  centerBox: { alignItems: 'center', paddingVertical: 40 },
  errTxt: { fontSize: 14, color: C.error, textAlign: 'center', marginBottom: 16, fontFamily: F.body },

  closeBtn: {
    marginTop: 18, backgroundColor: C.orange, borderRadius: R.pill,
    paddingVertical: 14, alignItems: 'center',
  },
  closeTxt: { color: '#fff', fontSize: 15, fontFamily: F.display },
});
