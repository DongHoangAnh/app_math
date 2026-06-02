import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  SafeAreaView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { C, R } from '../theme';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

interface Entry { id: string; display_name: string | null; ranking_points: number }

const MEDALS     = ['🥇', '🥈', '🥉'];
const MEDAL_BG   = ['#FFF9C4', '#F5F5F5', C.primaryBg];
const MEDAL_BD   = ['#FFD54F', '#BDBDBD', '#FFB74D'];

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

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerDeco} />
        <Text style={styles.headerTitle}>🏆 Bảng Xếp Hạng</Text>
        <Text style={styles.headerSub}>Top 50 người chơi xuất sắc nhất</Text>

        {/* Rule pills */}
        <View style={styles.ruleRow}>
          <View style={[styles.rulePill, { backgroundColor: 'rgba(76,175,80,0.25)' }]}>
            <Text style={[styles.ruleTxt, { color: '#C8E6C9' }]}>Thắng +5</Text>
          </View>
          <View style={[styles.rulePill, { backgroundColor: 'rgba(255,68,68,0.25)' }]}>
            <Text style={[styles.ruleTxt, { color: '#FFCDD2' }]}>Thua −3</Text>
          </View>
          <View style={[styles.rulePill, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={[styles.ruleTxt, { color: 'rgba(255,255,255,0.7)' }]}>Min 0</Text>
          </View>
        </View>
      </View>

      {/* My rank card */}
      {user && myRank > 0 && (
        <View style={styles.myCard}>
          <View style={styles.myCardLeft}>
            <View style={styles.myRankBadge}>
              <Text style={styles.myRankText}>#{myRank}</Text>
            </View>
            <View>
              <Text style={styles.myCardName}>Xếp hạng của bạn</Text>
              <Text style={styles.myCardSub}>{entries[myRank - 1]?.display_name ?? 'Bạn'}</Text>
            </View>
          </View>
          <View style={styles.myCardRight}>
            <Text style={styles.myCardPoints}>{myPoints}</Text>
            <Text style={styles.myCardUnit}>điểm</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 48 }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTxt}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryTxt}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          renderItem={({ item, index }) => (
            <EntryRow item={item} index={index} myId={user?.id} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyTxt}>Chưa có dữ liệu</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

function EntryRow({ item, index, myId }: { item: Entry; index: number; myId?: string }) {
  const isMe  = item.id === myId;
  const isTop = index < 3;

  return (
    <View style={[
      styles.row,
      isTop && { backgroundColor: MEDAL_BG[index], borderColor: MEDAL_BD[index], borderWidth: 2 },
      isMe && !isTop && styles.myRow,
    ]}>
      <View style={styles.rankCol}>
        {isTop
          ? <Text style={styles.medal}>{MEDALS[index]}</Text>
          : <Text style={styles.rankNum}>{index + 1}</Text>}
      </View>

      <View style={[styles.rowAvatar, { backgroundColor: isTop ? MEDAL_BD[index] : C.border }]}>
        <Text style={styles.rowAvatarText}>
          {(item.display_name ?? 'N')[0].toUpperCase()}
        </Text>
      </View>

      <View style={styles.nameCol}>
        <Text style={[styles.nameText, isMe && { color: C.primary, fontWeight: '900' }]} numberOfLines={1}>
          {item.display_name || 'Người chơi'}
        </Text>
        {isMe && (
          <View style={styles.meBadge}>
            <Text style={styles.meBadgeTxt}>BẠN</Text>
          </View>
        )}
      </View>

      <View style={styles.ptsCol}>
        <Text style={[styles.pts, isTop && { color: C.textPrimary, fontSize: 20 }]}>
          {item.ranking_points}
        </Text>
        <Text style={styles.ptsUnit}>điểm</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  header: {
    backgroundColor: C.primary,
    paddingVertical: 22, paddingHorizontal: 20,
    alignItems: 'center', overflow: 'hidden',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerDeco: {
    position: 'absolute', top: -50, right: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '600' },
  ruleRow:     { flexDirection: 'row', gap: 8, marginTop: 14 },
  rulePill: {
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: R.sm, alignItems: 'center',
  },
  ruleTxt: { fontSize: 12, fontWeight: '800' },

  myCard: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: C.textPrimary, borderRadius: R.xl, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
    borderWidth: 2, borderColor: C.primary,
  },
  myCardLeft:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  myRankBadge: {
    backgroundColor: C.primaryLight, width: 52, height: 52,
    borderRadius: R.md, justifyContent: 'center', alignItems: 'center',
  },
  myRankText:   { fontSize: 18, fontWeight: '900', color: '#7B5800' },
  myCardName:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  myCardSub:    { fontSize: 16, fontWeight: '900', color: '#fff', marginTop: 2 },
  myCardRight:  { alignItems: 'flex-end' },
  myCardPoints: { fontSize: 30, fontWeight: '900', color: C.primaryLight },
  myCardUnit:   { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.lg,
    paddingVertical: 13, paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    gap: 10,
  },
  myRow: { borderWidth: 2, borderColor: C.primary, backgroundColor: '#FFF3EE' },

  rankCol:   { width: 32, alignItems: 'center' },
  medal:     { fontSize: 24 },
  rankNum:   { fontSize: 15, fontWeight: '900', color: C.textSecond },

  rowAvatar: {
    width: 38, height: 38, borderRadius: R.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  rowAvatarText: { fontSize: 16, fontWeight: '900', color: '#7B5800' },

  nameCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { fontSize: 15, fontWeight: '700', color: C.textPrimary, flexShrink: 1 },
  meBadge: {
    backgroundColor: C.primary, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  meBadgeTxt: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  ptsCol:  { alignItems: 'flex-end' },
  pts:     { fontSize: 17, fontWeight: '900', color: C.textPrimary },
  ptsUnit: { fontSize: 10, color: C.textSecond },

  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTxt: { fontSize: 15, color: C.textSecond, marginBottom: 16 },
  retryBtn: {
    backgroundColor: C.primary, paddingVertical: 12,
    paddingHorizontal: 28, borderRadius: R.md,
  },
  retryTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyTxt: { textAlign: 'center', color: C.textSecond, fontSize: 15, marginTop: 48 },
});
