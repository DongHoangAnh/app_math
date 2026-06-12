import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, FlatList, StyleSheet, ActivityIndicator,
  SafeAreaView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { C, R, F, shadow, hardShadow } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { ASSETS } from '../assets';
import AssetIcon from '../components/AssetIcon';
import OpponentInfoModal from '../components/OpponentInfoModal';
import {
  getTopRanks, fetchMyRank, formatRank, TOP_LIMIT,
  type LeaderboardEntry, type MyRankInfo,
} from '../services/leaderboard';

type Entry = LeaderboardEntry;

const MEDAL = [C.gold, C.silver, C.bronze];

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [entries, setEntries]     = useState<Entry[]>([]);
  const [me, setMe]               = useState<MyRankInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  // Whose profile the info modal is showing (null = closed).
  const [selected, setSelected]   = useState<{ id: string; name: string | null } | null>(null);

  const load = useCallback(async (force: boolean) => {
    setError(null);
    try {
      const [list, mine] = await Promise.all([
        getTopRanks(force),
        user ? fetchMyRank(user.id) : Promise.resolve(null),
      ]);
      setEntries(list);
      setMe(mine);
    } catch {
      setError('Không thể tải bảng xếp hạng');
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    load(false).finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const openProfile = useCallback((entry: { id: string; display_name: string | null }) => {
    setSelected({ id: entry.id, name: entry.display_name });
  }, []);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const Header = (
    <View style={{ gap: 24, marginBottom: 10 }}>
      {/* My rank highlighted — rank from the snapshot, points always live */}
      {user && me && (
        <View style={styles.myCard}>
          <View style={styles.myCardLeft}>
            <View style={styles.myRankBadge}>
              <Text style={styles.myRankText}>{formatRank(me.rank)}</Text>
            </View>
            <View>
              <Text style={styles.eyebrow}>HẠNG CỦA BẠN</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <Text style={styles.myName} numberOfLines={1}>{me.displayName || 'Bạn'}</Text>
                <View style={styles.youChip}><Text style={styles.youChipTxt}>BẠN</Text></View>
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.myPoints}>{me.points.toLocaleString()}</Text>
            <Text style={styles.caption}>điểm</Text>
          </View>
        </View>
      )}

      {/* Podium top 3 */}
      {top3.length > 0 && (
        <View style={styles.podium}>
          {top3[1] && <PodiumCard rank={2} entry={top3[1]} onPress={openProfile} />}
          {top3[0] && <PodiumCard rank={1} entry={top3[0]} onPress={openProfile} />}
          {top3[2] && <PodiumCard rank={3} entry={top3[2]} onPress={openProfile} />}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header banner: title + sub + cadence + find-match button ── */}
      <View style={styles.bar}>
        <View style={styles.barTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <AssetIcon source={ASSETS.leaderboard.trophy} size={24} style={styles.barTitle} />
            <Text style={styles.barTitle} numberOfLines={1}>Bảng Xếp Hạng</Text>
          </View>
          <TouchableOpacity
            style={styles.battlePill}
            onPress={() => navigation.navigate('GameShowTab')}
            activeOpacity={0.8}
            accessibilityLabel="Tìm trận"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AssetIcon source={ASSETS.leaderboard.battle} size={13} style={styles.battlePillTxt} />
              <Text style={styles.battlePillTxt}>Tìm trận</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.barSub}>Top {TOP_LIMIT} người chơi</Text>
        <View style={styles.barChip}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AssetIcon source={ASSETS.leaderboard.clock} size={12} style={styles.barChipTxt} />
            <Text style={styles.barChipTxt}>Xếp hạng cập nhật mỗi 15 phút</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={C.orange} size="large" style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTxt}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryTxt}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(e) => e.id}
          ListHeaderComponent={Header}
          renderItem={({ item, index }) => (
            <RankRow rank={index + 4} entry={item} isMe={item.id === user?.id} onPress={openProfile} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.orange} />
          }
          ListEmptyComponent={<Text style={styles.emptyTxt}>Chưa có dữ liệu</Text>}
        />
      )}

      <OpponentInfoModal
        visible={selected !== null}
        opponentId={selected?.id ?? null}
        fallbackName={selected?.name ?? undefined}
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}

function MiniAvatar({
  name, avatarUrl, size, ring,
}: { name: string | null; avatarUrl: string | null; size: number; ring: string }) {
  const base = {
    width: size, height: size, borderRadius: R.pill,
    borderWidth: 2, borderColor: ring,
  } as const;
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={[base, { backgroundColor: C.peachBg }]} />;
  }
  return (
    <View style={[base, {
      backgroundColor: C.peachBg, justifyContent: 'center', alignItems: 'center',
    }]}>
      <Text style={{ fontFamily: F.displayBold, fontSize: size * 0.4, color: C.orangeDark }}>
        {(name ?? 'N')[0].toUpperCase()}
      </Text>
    </View>
  );
}

function PodiumCard({
  rank, entry, onPress,
}: { rank: number; entry: Entry; onPress: (e: Entry) => void }) {
  const heights = { 1: 120, 2: 100, 3: 88 } as Record<number, number>;
  const isFirst = rank === 1;
  return (
    <View style={[styles.podiumCol, isFirst && { transform: [{ translateY: -12 }] }]}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => onPress(entry)}>
        <MiniAvatar
          name={entry.display_name} avatarUrl={entry.avatar_url}
          size={isFirst ? 68 : 56} ring={MEDAL[rank - 1]}
        />
        <View style={[styles.medalDot, { backgroundColor: MEDAL[rank - 1] }]}>
          <Text style={[styles.medalDotTxt, { color: rank === 2 ? '#fff' : C.orangeDeepest }]}>{rank}</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.podiumName} numberOfLines={1}>{entry.display_name || 'Người chơi'}</Text>
      <View style={[
        styles.podiumBar,
        { height: heights[rank] },
        isFirst
          ? { backgroundColor: C.orange, ...hardShadow(C.orange, 6, 0.3) }
          : { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, ...shadow('#000', 1) },
      ]}>
        {isFirst && <AssetIcon source={ASSETS.leaderboard.crown} size={20} style={{ fontSize: 20 }} />}
        <Text style={[styles.podiumPts, { color: isFirst ? '#fff' : C.ink }]}>
          {entry.ranking_points.toLocaleString()}
        </Text>
        <Text style={[styles.podiumUnit, { color: isFirst ? C.orangeDeepest : C.inkSlate }]}>pts</Text>
      </View>
    </View>
  );
}

function RankRow({
  rank, entry, isMe, onPress,
}: { rank: number; entry: Entry; isMe?: boolean; onPress: (e: Entry) => void }) {
  return (
    <TouchableOpacity
      style={[styles.row, isMe && styles.rowMe]}
      activeOpacity={0.85}
      onPress={() => onPress(entry)}
    >
      <Text style={styles.rowRank}>{rank}</Text>
      <MiniAvatar
        name={entry.display_name} avatarUrl={entry.avatar_url}
        size={40} ring={isMe ? C.orange : C.line}
      />
      <Text style={[styles.rowName, isMe && { color: C.orangeDark }]} numberOfLines={1}>
        {entry.display_name || 'Người chơi'}
      </Text>
      {isMe && <View style={styles.youChip}><Text style={styles.youChipTxt}>BẠN</Text></View>}
      <Text style={styles.rowPts}>{entry.ranking_points.toLocaleString()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28, gap: 10 },

  // Header banner (matches the Battle Math lobby bar)
  bar: {
    backgroundColor: C.orange,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, gap: 4,
    borderBottomLeftRadius: R.xxl, borderBottomRightRadius: R.xxl,
    ...hardShadow('#C9431A', 6, 0.3),
  },
  barTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  barTitle: { flexShrink: 1, fontFamily: F.display, fontSize: 24, color: '#FFFFFF' },
  barSub:   { fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.92)' },
  battlePill: {
    backgroundColor: '#FFFFFF', borderRadius: R.pill,
    paddingHorizontal: 14, paddingVertical: 8, ...shadow('#000', 2),
  },
  battlePillTxt: { fontFamily: F.display, fontSize: 13, color: C.orangeDark },
  barChip: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 5, marginTop: 6,
  },
  barChipTxt: { fontFamily: F.bodyBold, fontSize: 12, color: '#FFFFFF' },
  eyebrow:  { fontFamily: F.bodyMedium, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: C.inkSlate },
  caption:  { fontFamily: F.bodyMedium, fontSize: 12, color: C.inkSlate },

  // My rank card
  myCard: {
    borderRadius: R.squircle, backgroundColor: C.lineSoft,
    borderWidth: 1, borderColor: C.peachBorder, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...shadow('#000', 2),
  },
  myCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  myRankBadge: {
    width: 48, height: 48, borderRadius: R.pill, backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center', ...hardShadow(C.orangeDark, 4, 0.3),
  },
  myRankText: { fontFamily: F.display, fontSize: 18, color: '#fff' },
  myName:     { fontFamily: F.display, fontSize: 18, color: C.ink, flexShrink: 1 },
  myPoints:   { fontFamily: F.display, fontSize: 20, color: C.orangeDark },

  youChip:    { backgroundColor: C.orangeDark, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2 },
  youChipTxt: { fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: '#fff' },

  // Podium
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  podiumCol: { flex: 1, alignItems: 'center', gap: 8 },
  medalDot: {
    position: 'absolute', bottom: -6, alignSelf: 'center',
    width: 24, height: 24, borderRadius: R.pill,
    borderWidth: 2, borderColor: C.bg, justifyContent: 'center', alignItems: 'center',
  },
  medalDotTxt: { fontFamily: F.displayBold, fontSize: 12 },
  podiumName:  { fontFamily: F.bodyBold, fontSize: 12, color: C.ink, textAlign: 'center', maxWidth: 96 },
  podiumBar: {
    width: '100%', borderTopLeftRadius: R.md, borderTopRightRadius: R.md,
    alignItems: 'center', justifyContent: 'flex-start', paddingTop: 12, gap: 2,
  },
  podiumPts:  { fontFamily: F.displayBold, fontSize: 18 },
  podiumUnit: { fontFamily: F.bodyMedium, fontSize: 11 },

  // Rank rows
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: R.squircle, padding: 12,
  },
  rowMe:   { borderColor: C.orange, borderWidth: 2, backgroundColor: '#FFF3EE' },
  rowRank: { width: 32, textAlign: 'center', fontFamily: F.display, fontSize: 20, color: C.inkSlate },
  rowName: { flex: 1, fontFamily: F.display, fontSize: 14, color: C.ink },
  rowPts:  { fontFamily: F.display, fontSize: 16, color: C.orangeDark },

  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTxt: { fontFamily: F.body, fontSize: 15, color: C.inkSlate, marginBottom: 16 },
  retryBtn: { backgroundColor: C.orange, paddingVertical: 12, paddingHorizontal: 28, borderRadius: R.pill },
  retryTxt: { fontFamily: F.display, color: '#fff', fontSize: 14 },
  emptyTxt: { textAlign: 'center', fontFamily: F.body, color: C.inkSlate, fontSize: 15, marginTop: 48 },
});
