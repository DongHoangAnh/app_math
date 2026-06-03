import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  FlatList, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { C, R, F, shadow } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { authFetch } from '../utils/authFetch';
import OpponentProfileModal from '../components/OpponentProfileModal';

const PAGE = 5; // tải 5 trận mỗi lần

interface MatchItem {
  id: string;
  roomId: string;
  playedAt: string;
  opponentId: string | null;
  opponentName: string;
  opponentAvatarUrl: string | null;
  myScore: number;
  opponentScore: number;
  myCorrect: number;
  opponentCorrect: number;
  outcome: 'win' | 'lose' | 'draw';
  rankingDelta: number;
  questionsCount: number;
}

const OUTCOME = {
  win:  { emoji: '🏆', label: 'Thắng', color: C.success },
  lose: { emoji: '💪', label: 'Thua',  color: C.error   },
  draw: { emoji: '🤝', label: 'Hòa',   color: C.primary },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const mi = d.getMinutes().toString().padStart(2, '0');
  return `${dd}/${mm} · ${hh}:${mi}`;
}

export default function MatchHistoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [items, setItems]       = useState<MatchItem[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async (offset: number, replace: boolean) => {
    if (!user) return;
    if (replace) setInitialLoad(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const res = await authFetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/gameshow/matches/${user.id}?limit=${PAGE}&offset=${offset}`
      );
      if (!res.ok) {
        // 401 = phiên đăng nhập hết hạn, 5xx = lỗi máy chủ — báo rõ thay vì hiện trống
        throw new Error(res.status === 401 ? 'unauthorized' : `http ${res.status}`);
      }
      const data = await res.json();
      const list: MatchItem[] = Array.isArray(data) ? data : [];
      setHasMore(list.length === PAGE);
      setItems((prev) => (replace ? list : [...prev, ...list]));
    } catch (e: any) {
      // Chỉ chặn toàn màn hình khi tải lần đầu; lỗi khi tải thêm thì giữ danh sách đã có
      if (replace) {
        setError(
          e?.message === 'unauthorized'
            ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            : 'Không tải được lịch sử. Vui lòng thử lại.'
        );
      } else {
        setHasMore(false);
      }
    } finally {
      setInitialLoad(false);
      setLoadingMore(false);
    }
  }, [user]);

  // Tải lại từ đầu mỗi khi màn hình được focus (cập nhật trận mới nhất)
  useFocusEffect(
    useCallback(() => { load(0, true); }, [load])
  );

  const onEndReached = useCallback(() => {
    if (loadingMore || initialLoad || !hasMore) return;
    load(items.length, false);
  }, [loadingMore, initialLoad, hasMore, items.length, load]);

  const renderItem = useCallback(({ item }: { item: MatchItem }) => {
    const o = OUTCOME[item.outcome];
    const deltaColor = item.rankingDelta > 0 ? C.success : item.rankingDelta < 0 ? C.error : C.textSecond;
    const deltaTxt = `${item.rankingDelta >= 0 ? '+' : ''}${item.rankingDelta}`;
    const initial = (item.opponentName.trim()[0] ?? 'M').toUpperCase();
    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.8}
        onPress={() => setSelected({ id: item.opponentId ?? '', name: item.opponentName })}
      >
        <View style={[s.outcomeBadge, { backgroundColor: o.color }]}>
          <Text style={s.outcomeEmoji}>{o.emoji}</Text>
        </View>

        <View style={s.cardMid}>
          <View style={s.oppRow}>
            {item.opponentAvatarUrl ? (
              <Image source={{ uri: item.opponentAvatarUrl }} style={s.oppAvatar} />
            ) : (
              <View style={s.oppAvatarPlaceholder}>
                <Text style={s.oppAvatarInitial}>{initial}</Text>
              </View>
            )}
            <Text style={s.opponent} numberOfLines={1}>{item.opponentName}</Text>
          </View>
          <Text style={s.meta}>
            Đúng {item.myCorrect}/{item.questionsCount} · {fmtDate(item.playedAt)}
          </Text>
        </View>

        <View style={s.cardRight}>
          <Text style={[s.scoreLine, { color: o.color }]}>
            {item.myScore} - {item.opponentScore}
          </Text>
          <Text style={[s.delta, { color: deltaColor }]}>{deltaTxt} điểm</Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.navigate('GameShowTab')}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>📜 Lịch sử đấu</Text>
        <View style={s.backBtn} />
      </View>

      {initialLoad ? (
        <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={s.centerBox}>
          <Text style={s.errTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load(0, true)} activeOpacity={0.85}>
            <Text style={s.retryTxt}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={s.centerBox}>
          <Text style={s.emptyEmoji}>🗒️</Text>
          <Text style={s.emptyTitle}>Chưa có trận nào</Text>
          <Text style={s.emptySub}>Hãy vào trận PK đầu tiên của bạn!</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={C.primary} style={{ marginVertical: 18 }} />
            ) : !hasMore ? (
              <Text style={s.endTxt}>— Hết —</Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.orange,
    paddingVertical: 16, paddingHorizontal: 16,
    borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backTxt: { fontSize: 34, lineHeight: 36, color: '#fff', fontFamily: F.display },
  headerTitle: { fontSize: 20, fontFamily: F.display, color: '#fff' },

  listContent: { padding: 16, gap: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.squircle,
    borderWidth: 1, borderColor: C.line,
    padding: 12, gap: 12, ...shadow('#000', 1),
  },
  outcomeBadge: {
    width: 48, height: 48, borderRadius: R.pill,
    justifyContent: 'center', alignItems: 'center',
  },
  outcomeEmoji: { fontSize: 22 },

  cardMid:  { flex: 1, gap: 3 },
  opponent: { fontSize: 15, fontFamily: F.display, color: C.ink },
  meta:     { fontSize: 12, color: C.inkBrown, fontFamily: F.body },

  cardRight: { alignItems: 'flex-end', gap: 3 },
  scoreLine: { fontSize: 18, fontFamily: F.displayBold },
  delta:     { fontSize: 13, fontFamily: F.display },

  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errTxt:    { fontSize: 14, color: C.error, textAlign: 'center', marginBottom: 16, fontFamily: F.body },
  retryBtn:  {
    backgroundColor: C.orange, borderRadius: R.pill,
    paddingVertical: 12, paddingHorizontal: 28,
  },
  retryTxt:   { color: '#fff', fontSize: 14, fontFamily: F.display },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontFamily: F.display, color: C.ink, marginBottom: 6 },
  emptySub:   { fontSize: 13, color: C.inkBrown, textAlign: 'center', fontFamily: F.body },

  endTxt: { textAlign: 'center', color: C.inkSlate, fontSize: 12, fontFamily: F.bodyMedium, marginVertical: 18 },
});
