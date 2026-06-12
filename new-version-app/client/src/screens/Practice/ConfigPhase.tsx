import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { s } from './styles';
import { ASSETS } from '../../assets';
import {
  PRACTICE_OPS, PRACTICE_OP_LABELS, TIMER_SPEEDS, FIXED_COUNTS, TIMED_SECONDS,
  RAMP_LIMITS, presetConfig, type PracticePresetId,
} from '../../../../shared/constants';
import { DIFFICULTIES } from '../../../../shared/constants';
import type { PracticeConfig, PracticeOp, SessionKind } from '../../../../shared/types';

const PRESETS: { id: PracticePresetId; name: string; desc: string; icon: string }[] = [
  { id: 'classic',  name: 'Cổ điển',     desc: 'Tự chọn số câu · đủ phép tính', icon: ASSETS.practice.classic },
  { id: 'endless',  name: 'Vô tận',      desc: 'Chơi đến khi dừng · độ khó tăng dần', icon: ASSETS.practice.endless },
  { id: 'speed',    name: 'Tốc độ',      desc: '60 giây · trả lời nhanh', icon: ASSETS.practice.speed },
  { id: 'weakspot', name: 'Ôn điểm yếu', desc: 'Luyện phép bạn hay sai', icon: ASSETS.practice.weakspot },
  { id: 'custom',   name: 'Tùy chỉnh',   desc: 'Chỉnh mọi thiết lập', icon: ASSETS.practice.custom },
];

interface Props {
  onStart: (config: PracticeConfig, preset: PracticePresetId) => void;
  weakOpsHint?: PracticeOp[] | null; // resolved weak ops, or null if not enough data
}

export default function ConfigPhase({ onStart, weakOpsHint }: Props) {
  const [editing, setEditing] = useState<PracticeConfig | null>(null);

  // Preset cards view
  if (!editing) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.body}>
          <Text style={s.h1}>{ASSETS.practice.title} Luyện tập</Text>
          <Text style={s.sub}>Chọn kiểu luyện tập để bắt đầu</Text>
          <View style={s.presetGrid}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={s.presetCard}
                activeOpacity={0.85}
                onPress={() => {
                  if (p.id === 'custom') { setEditing(presetConfig('custom')); return; }
                  onStart(presetConfig(p.id), p.id);
                }}
              >
                <View style={s.presetIconWrap}><Text style={{ fontSize: 26 }}>{p.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.presetName}>{p.name}</Text>
                  <Text style={s.presetDesc}>{p.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {weakOpsHint === null && (
            <Text style={s.sub}>Mẹo: chơi thêm vài phiên để mở khóa "Ôn điểm yếu" theo dữ liệu của bạn.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Custom knobs view
  const cfg = editing;
  const set = (patch: Partial<PracticeConfig>) => setEditing({ ...cfg, ...patch });
  const toggleOp = (op: PracticeOp) => {
    const has = cfg.ops.includes(op);
    const next = has ? cfg.ops.filter((o) => o !== op) : [...cfg.ops, op];
    if (next.length === 0) return; // keep at least one op
    set({ ops: next });
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.h1}>{ASSETS.practice.custom} Tùy chỉnh</Text>

        {/* Ops filter */}
        <View style={s.knobCard}>
          <Text style={s.knobLabel}>Phép toán</Text>
          <View style={s.chipRow}>
            {PRACTICE_OPS.map((op) => {
              const on = cfg.ops.includes(op);
              return (
                <TouchableOpacity key={op} style={[s.chip, on && s.chipOn]} onPress={() => toggleOp(op)}>
                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{PRACTICE_OP_LABELS[op]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Difficulty */}
        <View style={s.knobCard}>
          <Text style={s.knobLabel}>Độ khó bắt đầu</Text>
          <View style={s.chipRow}>
            {DIFFICULTIES.map((d) => {
              const on = cfg.difficulty === d.id && !cfg.ramp.enabled;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[s.chip, on && s.chipOn]}
                  onPress={() => set({ difficulty: d.id, ramp: { ...cfg.ramp, enabled: false } })}
                >
                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{d.icon} {d.desc}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[s.chip, cfg.ramp.enabled && s.chipOn]}
              onPress={() => set({ ramp: { ...cfg.ramp, enabled: !cfg.ramp.enabled } })}
            >
              <Text style={[s.chipTxt, cfg.ramp.enabled && s.chipTxtOn]}>Tăng dần</Text>
            </TouchableOpacity>
          </View>
          {cfg.ramp.enabled && (
            <Text style={s.sub}>
              Đúng {cfg.ramp.upStreak} câu liên tiếp → lên cấp · Sai {cfg.ramp.downStreak} câu liên tiếp → xuống cấp
            </Text>
          )}
          {cfg.ramp.enabled && (
            <View style={s.chipRow}>
              <TouchableOpacity style={s.chip} onPress={() => set({ ramp: { ...cfg.ramp, upStreak: clampUp(cfg.ramp.upStreak - 1) } })}><Text style={s.chipTxt}>Lên −</Text></TouchableOpacity>
              <TouchableOpacity style={s.chip} onPress={() => set({ ramp: { ...cfg.ramp, upStreak: clampUp(cfg.ramp.upStreak + 1) } })}><Text style={s.chipTxt}>Lên +</Text></TouchableOpacity>
              <TouchableOpacity style={s.chip} onPress={() => set({ ramp: { ...cfg.ramp, downStreak: clampDown(cfg.ramp.downStreak - 1) } })}><Text style={s.chipTxt}>Xuống −</Text></TouchableOpacity>
              <TouchableOpacity style={s.chip} onPress={() => set({ ramp: { ...cfg.ramp, downStreak: clampDown(cfg.ramp.downStreak + 1) } })}><Text style={s.chipTxt}>Xuống +</Text></TouchableOpacity>
            </View>
          )}
        </View>

        {/* Session kind */}
        <View style={s.knobCard}>
          <Text style={s.knobLabel}>Kiểu phiên</Text>
          <View style={s.chipRow}>
            {(['fixed', 'endless', 'timed'] as SessionKind[]).map((k) => {
              const on = cfg.session.kind === k;
              const label = k === 'fixed' ? 'Số câu' : k === 'endless' ? 'Vô tận' : 'Theo giờ';
              return (
                <TouchableOpacity key={k} style={[s.chip, on && s.chipOn]} onPress={() => set({ session: defaultSession(k) })}>
                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {cfg.session.kind === 'fixed' && (
            <View style={s.chipRow}>
              {FIXED_COUNTS.map((n) => {
                const on = cfg.session.count === n;
                return (
                  <TouchableOpacity key={n} style={[s.chip, on && s.chipOn]} onPress={() => set({ session: { kind: 'fixed', count: n } })}>
                    <Text style={[s.chipTxt, on && s.chipTxtOn]}>{n} câu</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {cfg.session.kind === 'timed' && (
            <View style={s.chipRow}>
              {TIMED_SECONDS.map((sec) => {
                const on = cfg.session.seconds === sec;
                return (
                  <TouchableOpacity key={sec} style={[s.chip, on && s.chipOn]} onPress={() => set({ session: { kind: 'timed', seconds: sec } })}>
                    <Text style={[s.chipTxt, on && s.chipTxtOn]}>{sec}s</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Timer */}
        <View style={s.knobCard}>
          <Text style={s.knobLabel}>Giới hạn thời gian mỗi câu</Text>
          <View style={s.chipRow}>
            <TouchableOpacity
              style={[s.chip, !cfg.timer.enabled && s.chipOn]}
              onPress={() => set({ timer: { enabled: false } })}
            >
              <Text style={[s.chipTxt, !cfg.timer.enabled && s.chipTxtOn]}>Tắt</Text>
            </TouchableOpacity>
            {TIMER_SPEEDS.map((t) => {
              const on = cfg.timer.enabled && cfg.timer.perQuestionSeconds === t.seconds;
              return (
                <TouchableOpacity key={t.id} style={[s.chip, on && s.chipOn]} onPress={() => set({ timer: { enabled: true, perQuestionSeconds: t.seconds } })}>
                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{t.label} {t.seconds}s</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={s.cta} onPress={() => onStart(cfg, 'custom')} activeOpacity={0.9}>
          <Text style={s.ctaTxt}>Bắt đầu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => setEditing(null)} activeOpacity={0.85}>
          <Text style={s.secondaryTxt}>← Quay lại</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function clampUp(v: number) { return Math.min(Math.max(v, RAMP_LIMITS.up.min), RAMP_LIMITS.up.max); }
function clampDown(v: number) { return Math.min(Math.max(v, RAMP_LIMITS.down.min), RAMP_LIMITS.down.max); }
function defaultSession(kind: SessionKind) {
  return kind === 'fixed' ? { kind, count: 10 } : kind === 'timed' ? { kind, seconds: 60 } : { kind };
}
