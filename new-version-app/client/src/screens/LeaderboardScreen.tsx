import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  SafeAreaView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

interface Entry { id: string; display_name: string | null; ranking_points: number }

const C = {
  primary: '#3B82F6', deep: '#1E40AF', yellow: '#FACC15',
  bg: '#F8FBFF', white: '#FFFFFF', text: '#1E293B', textLight: '#64748B',
};

const MEDALS = ['🥇', '🥈', '🥉'];
const TOP_COLORS = ['#FEF9C3', '#F3F4F6', '#FFF7ED'];
const TOP_BORDERS = ['#FACC15', '#D1D5DB', '#FED7AA'];

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('user_profiles')
        .select('id, display_name, ranking_points')
        .order('ranking_points', { ascending: false })
        .limit(50);
      if (e) {
        console.warn('Leaderboard error:', e.message);
        setError('Không thể tải bảng xếp hạng');
      } else {
        setEntries(data ?? []);
      }
    } catch (err: any) {
      console.warn('Leaderboard error:', err.message);
      setError('Không thể tải bảng xếp hạng');
    }
  }, []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const myRank = user ? entries.findIndex((e) => e.id === user.id) + 1 : 0;
  const myPoints = user ? entries.find((e) => e.id === user.id)?.ranking_points ?? 0 : 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bảng Xếp Hạng</Text>
        <Text style={styles.headerSub}>Tích điểm bằng cách thắng trận đấu 1v1</Text>
      </View>

      {/* My rank card */}
      {user && myRank > 0 && (
        <View style={styles.myCard}>
          <View style={styles.myCardLeft}>
            <Text style={styles.myCardRank}>#{myRank}</Text>
            <View>
              <Text style={styles.myCardName}>Bạn</Text>
              <Text style={styles.myCardSub}>Hạng của bạn</Text>
            </View>
          </View>
          <View style={styles.myCardRight}>
            <Text style={styles.myCardPoints}>{myPoints}</Text>
            <Text style={styles.myCardUnit}>điểm</Text>
          </View>
        </View>
      )}

      {/* Rules */}
      <View style={styles.rules}>
        <View style={[styles.rulePill, { backgroundColor: '#DCFCE7' }]}>
          <Text style={[styles.ruleTxt, { color: '#16A34A' }]}>Thắng +5</Text>
        </View>
        <View style={[styles.rulePill, { backgroundColor: '#FEE2E2' }]}>
          <Text style={[styles.ruleTxt, { color: '#DC2626' }]}>Thua −3</Text>
        </View>
        <View style={[styles.rulePill, { backgroundColor: '#F1F5F9' }]}>
          <Text style={[styles.ruleTxt, { color: C.textLight }]}>Tối thiểu 0</Text>
        </View>
      </View>

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
          renderItem={({ item, index }) => <EntryRow item={item} index={index} myId={user?.id} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListEmptyComponent={<Text style={styles.emptyTxt}>Chưa có dữ liệu</Text>}
        />
      )}
    </SafeAreaView>
  );
}

function EntryRow({ item, index, myId }: { item: Entry; index: number; myId?: string }) {
  const isMe = item.id === myId;
  const isTop = index < 3;

  return (
    <View style={[
      styles.row,
      isTop && { backgroundColor: TOP_COLORS[index], borderWidth: 1.5, borderColor: TOP_BORDERS[index] },
      isMe && !isTop && styles.myRow,
    ]}>
      <View style={[styles.rankBox, isTop && styles.rankBoxTop]}>
        {isTop
          ? <Text style={{ fontSize: 22 }}>{MEDALS[index]}</Text>
          : <Text style={styles.rankNum}>{index + 1}</Text>}
      </View>

      <View style={styles.nameBox}>
        <Text style={[styles.nameText, isMe && styles.myName]} numberOfLines={1}>
          {item.display_name || 'Người chơi'}
        </Text>
        {isMe && <Text style={styles.meBadge}>Bạn</Text>}
      </View>

      <View style={styles.ptsBox}>
        <Text style={[styles.pts, isTop && { color: C.deep, fontSize: 22 }]}>{item.ranking_points}</Text>
        <Text style={styles.ptsUnit}>điểm</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.primary, paddingVertical: 20, paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  myCard: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: C.deep, borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: C.deep, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 8,
  },
  myCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  myCardRank: { fontSize: 28, fontWeight: '900', color: C.yellow },
  myCardName: { fontSize: 16, fontWeight: '800', color: '#fff' },
  myCardSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  myCardRight: { alignItems: 'flex-end' },
  myCardPoints: { fontSize: 28, fontWeight: '900', color: C.yellow },
  myCardUnit: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  rules: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 12, marginBottom: 4 },
  rulePill: { flex: 1, paddingVertical: 6, borderRadius: 10, alignItems: 'center' },
  ruleTxt: { fontSize: 12, fontWeight: '700' },

  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  myRow: { borderWidth: 2, borderColor: C.primary, backgroundColor: '#EFF6FF' },

  rankBox: { width: 36, alignItems: 'center' },
  rankBoxTop: {},
  rankNum: { fontSize: 15, fontWeight: '800', color: C.textLight },

  nameBox: { flex: 1, marginLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { fontSize: 15, fontWeight: '600', color: C.text, flexShrink: 1 },
  myName: { color: C.primary, fontWeight: '800' },
  meBadge: {
    fontSize: 10, fontWeight: '700', color: C.primary,
    backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },

  ptsBox: { alignItems: 'flex-end' },
  pts: { fontSize: 18, fontWeight: '900', color: C.text },
  ptsUnit: { fontSize: 10, color: C.textLight },

  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTxt: { fontSize: 15, color: C.textLight, marginBottom: 16 },
  retryBtn: { backgroundColor: C.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14 },
  retryTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyTxt: { textAlign: 'center', color: C.textLight, fontSize: 15, marginTop: 48 },
});
