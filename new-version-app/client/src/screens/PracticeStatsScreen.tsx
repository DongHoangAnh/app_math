import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { gameApi, type PracticeSessionDTO, type PracticeSummaryDTO } from '../services/api';
import { s } from './Practice/styles';
import { ASSETS } from '../assets';
import AssetIcon from '../components/AssetIcon';
import { PRACTICE_OP_LABELS, PRACTICE_OPS } from '../../../shared/constants';

const KIND_LABEL: Record<string, string> = { fixed: 'Số câu', endless: 'Vô tận', timed: 'Theo giờ' };

export default function PracticeStatsScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [summary, setSummary] = useState<PracticeSummaryDTO | null>(null);
  const [sessions, setSessions] = useState<PracticeSessionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([gameApi.getPracticeSummary(userId), gameApi.getPracticeSessions(userId, 10, 0)])
      .then(([sum, sess]) => { setSummary(sum); setSessions(sess); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AssetIcon source={ASSETS.practice.history} size={26} />
          <Text style={s.h1}>Tiến bộ luyện tập</Text>
        </View>

        {summary && (
          <View style={s.statGrid}>
            <View style={s.statBox}>
              <Text style={s.statBoxLabel}>KỶ LỤC VÔ TẬN</Text>
              <Text style={s.statBoxValue}>{summary.bestEndlessStreak}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statBoxLabel}>KỶ LỤC TỐC ĐỘ</Text>
              <Text style={s.statBoxValue}>{summary.bestTimedScore}</Text>
            </View>
          </View>
        )}

        {summary && (
          <View style={s.knobCard}>
            <Text style={s.knobLabel}>Độ chính xác theo phép toán</Text>
            {PRACTICE_OPS.map((op) => {
              const t = summary.perOp[op];
              const acc = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : null;
              return (
                <View key={op} style={s.opRow}>
                  <Text style={s.opName}>{PRACTICE_OP_LABELS[op]}</Text>
                  <Text style={s.opAcc}>{acc === null ? '—' : `${acc}% (${t.attempted})`}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={s.h3}>Lịch sử gần đây</Text>
        {!loading && sessions.length === 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <AssetIcon source={ASSETS.practice.empty} size={16} />
            <Text style={s.emptyTxt}>Chưa có phiên luyện tập nào.</Text>
          </View>
        )}
        {sessions.map((ss) => {
          const acc = ss.total > 0 ? Math.round((ss.correct / ss.total) * 100) : 0;
          return (
            <View key={ss.id} style={s.opRow}>
              <Text style={s.opName}>{KIND_LABEL[ss.kind] ?? ss.kind} · {new Date(ss.createdAt).toLocaleDateString('vi-VN')}</Text>
              <Text style={s.opAcc}>{ss.correct}/{ss.total} · {acc}%</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
