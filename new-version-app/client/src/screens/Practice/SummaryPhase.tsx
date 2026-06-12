import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { s } from './styles';
import { PRACTICE_OP_LABELS, PRACTICE_OPS } from '../../../../shared/constants';
import type { PracticeResult } from '../../../../shared/types';

interface Props {
  result: PracticeResult;
  onPlayAgain: () => void;
  onViewStats: () => void;
  onHome: () => void;
}

export default function SummaryPhase({ result, onPlayAgain, onViewStats, onHome }: Props) {
  const accuracy = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
  const avgSec = result.total > 0 ? (result.totalTimeMs / result.total / 1000).toFixed(1) : '0.0';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.summaryWrap}>
        <Text style={s.h1}>Kết quả</Text>
        <Text style={s.bigStat}>{result.correct}/{result.total}</Text>

        <View style={s.statGrid}>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>ĐỘ CHÍNH XÁC</Text>
            <Text style={s.statBoxValue}>{accuracy}%</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>TG/CÂU</Text>
            <Text style={s.statBoxValue}>{avgSec}s</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>CHUỖI ĐÚNG</Text>
            <Text style={s.statBoxValue}>{result.bestStreak}</Text>
          </View>
        </View>

        <View style={s.knobCard}>
          <Text style={s.knobLabel}>Độ chính xác theo phép toán</Text>
          {PRACTICE_OPS.filter((op) => result.perOp[op].attempted > 0).map((op) => {
            const t = result.perOp[op];
            const acc = Math.round((t.correct / t.attempted) * 100);
            return (
              <View key={op} style={s.opRow}>
                <Text style={s.opName}>{PRACTICE_OP_LABELS[op]}</Text>
                <Text style={s.opAcc}>{t.correct}/{t.attempted} · {acc}%</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={s.cta} onPress={onPlayAgain} activeOpacity={0.9}>
          <Text style={s.ctaTxt}>Luyện tiếp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={onViewStats} activeOpacity={0.85}>
          <Text style={s.secondaryTxt}>Xem tiến bộ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={onHome} activeOpacity={0.85}>
          <Text style={s.secondaryTxt}>Về trang chủ</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
