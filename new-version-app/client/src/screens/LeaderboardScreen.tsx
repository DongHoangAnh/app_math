import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  SafeAreaView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { C, R, F, shadow, hardShadow } from '../theme';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

interface Entry { id: string; display_name: string | null; ranking_points: number }

const MEDAL = [C.gold, C.silver, C.bronze];

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [entries, setEntries]     = useState<Entry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('user_profiles')
        .select('id, display_name, ranking_points')
        .order('ranking_points', { ascending: false })
        .limit(50);
      if (e) { setError('Không thể tải bảng xếp hạng'); }
      else { setEntries(data ?? []); }
    } catch {
      setError('Không thể tải bảng xếp hạng');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const myRank   = user ? entries.findIndex((e) => e.id === user.id) + 1 : 0;
  const myPoints = user ? entries.find((e) => e.id === user.id)?.ranking_points ?? 0 : 0;
  const myName   = user ? entries[myRank - 1]?.display_name ?? 'Bạn' : 'Bạn';

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const Header = (
    <View style={{ gap: 24, marginBottom: 10 }}>
      {/* Title */}
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.title}>🏆 Bảng Xếp Hạng</Text>
        <Text style={styles.subtitle}>Top 50 người chơi</Text>
      </View>

      {/* My rank highlighted */}
      {user && myRank > 0 && (
        <View style={styles.myCard}>
          <View style={styles.myCardLeft}>
            <View style={styles.myRankBadge}>
              <Text style={styles.myRankText}>#{myRank}</Text>
            </View>
            <View>
              <Text style={styles.eyebrow}>HẠNG CỦA BẠN</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <Text style={styles.myName} numberOfLines={1}>{myName}</Text>
                <View style={styles.youChip}><Text style={styles.youChipTxt}>BẠN</Text></View>
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.myPoints}>{myPoints.toLocaleString()}</Text>
            <Text style={styles.caption}>điểm</Text>
          </View>
        </View>
      )}

      {/* Podium top 3 */}
      {top3.length > 0 && (
        <View style={styles.podium}>
          {top3[1] && <PodiumCard rank={2} entry={top3[1]} />}
          {top3[0] && <PodiumCard rank={1} entry={top3[0]} />}
          {top3[2] && <PodiumCard rank={3} entry={top3[2]} />}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
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
            <RankRow rank={index + 4} entry={item} isMe={item.id === user?.id} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.orange} />
          }
          ListEmptyComponent={<Text style={styles.emptyTxt}>Chưa có dữ liệu</Text>}
        />
      )}
    </SafeAreaView>
  );
}

function MiniAvatar({ name, size, ring }: { name: string | null; size: number; ring: string }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: R.pill,
      backgroundColor: C.peachBg, borderWidth: 2, borderColor: ring,
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ fontFamily: F.displayBold, fontSize: size * 0.4, color: C.orangeDark }}>
        {(name ?? 'N')[0].toUpperCase()}
      </Text>
    </View>
  );
}

function PodiumCard({ rank, entry }: { rank: number; entry: Entry }) {
  const heights = { 1: 120, 2: 100, 3: 88 } as Record<number, number>;
  const isFirst = rank === 1;
  return (
    <View style={[styles.podiumCol, isFirst && { transform: [{ translateY: -12 }] }]}>
      <View>
        <MiniAvatar name={entry.display_name} size={isFirst ? 68 : 56} ring={MEDAL[rank - 1]} />
        <View style={[styles.medalDot, { backgroundColor: MEDAL[rank - 1] }]}>
          <Text style={[styles.medalDotTxt, { color: rank === 2 ? '#fff' : C.orangeDeepest }]}>{rank}</Text>
        </View>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{entry.display_name || 'Người chơi'}</Text>
      <View style={[
        styles.podiumBar,
        { height: heights[rank] },
        isFirst
          ? { backgroundColor: C.orange, ...hardShadow(C.orange, 6, 0.3) }
          : { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, ...shadow('#000', 1) },
      ]}>
        {isFirst && <Text style={{ fontSize: 20 }}>👑</Text>}
        <Text style={[styles.podiumPts, { color: isFirst ? '#fff' : C.ink }]}>
          {entry.ranking_points.toLocaleString()}
        </Text>
        <Text style={[styles.podiumUnit, { color: isFirst ? C.orangeDeepest : C.inkSlate }]}>pts</Text>
      </View>
    </View>
  );
}

function RankRow({ rank, entry, isMe }: { rank: number; entry: Entry; isMe?: boolean }) {
  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <Text style={styles.rowRank}>{rank}</Text>
      <MiniAvatar name={entry.display_name} size={40} ring={isMe ? C.orange : C.line} />
      <Text style={[styles.rowName, isMe && { color: C.orangeDark }]} numberOfLines={1}>
        {entry.display_name || 'Người chơi'}
      </Text>
      {isMe && <View style={styles.youChip}><Text style={styles.youChipTxt}>BẠN</Text></View>}
      <Text style={styles.rowPts}>{entry.ranking_points.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { paddingHorizontal: 20, paddingTop: 68, paddingBottom: 28, gap: 10 },

  title:    { fontFamily: F.display, fontSize: 24, color: C.ink },
  subtitle: { fontFamily: F.body, fontSize: 16, color: C.inkSlate, marginTop: 4 },
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
