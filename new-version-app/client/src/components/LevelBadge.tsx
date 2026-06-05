import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  getLevelIcons, getTier, TIER_LABEL, TIER_COLOR,
  getLevelProgress, getExpForNextLevel, getCumulativeExpForLevel,
  type TierName,
} from '../utils/levelUtils';
import { ASSETS } from '../assets';

// ── Icon definitions ─────────────────────────────────────────
const ICONS = {
  crown: { emoji: ASSETS.levelBadge.crown, bg: '#EDE7F6', fg: '#6A1B9A' },
  sun:   { emoji: ASSETS.levelBadge.sun,   bg: '#FFF3E0', fg: '#E65100' },
  moon:  { emoji: ASSETS.levelBadge.moon,  bg: '#E3F2FD', fg: '#1565C0' },
  star:  { emoji: ASSETS.levelBadge.star,  bg: '#FFFDE7', fg: '#F57F17' },
};

// ── Sizes ────────────────────────────────────────────────────
const SIZE_MAP = {
  xs:  { box: 16, font: 10, gap: 2 },
  sm:  { box: 20, font: 13, gap: 3 },
  md:  { box: 26, font: 16, gap: 4 },
  lg:  { box: 34, font: 22, gap: 5 },
};

type Size = keyof typeof SIZE_MAP;

// ── Single icon box ───────────────────────────────────────────
function IconBox({ type, size }: { type: keyof typeof ICONS; size: Size }) {
  const { box, font, gap } = SIZE_MAP[size];
  const { emoji, bg } = ICONS[type];
  return (
    <View style={[styles.iconBox, { width: box, height: box, borderRadius: box / 4, backgroundColor: bg, marginRight: gap }]}>
      <Text style={{ fontSize: font, lineHeight: box }}>{emoji}</Text>
    </View>
  );
}

// ── Tier group (icons of the same type) ──────────────────────
function TierGroup({ type, count, size }: { type: keyof typeof ICONS; count: number; size: Size }) {
  if (count <= 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <IconBox key={i} type={type} size={size} />
      ))}
    </>
  );
}

// ── Tier label chip ───────────────────────────────────────────
function TierChip({ tier }: { tier: TierName }) {
  return (
    <View style={[styles.tierChip, { backgroundColor: TIER_COLOR[tier] + '22', borderColor: TIER_COLOR[tier] + '55' }]}>
      <Text style={[styles.tierLabel, { color: TIER_COLOR[tier] }]}>{TIER_LABEL[tier]}</Text>
    </View>
  );
}

// ================================================================
// LevelBadge — compact inline display (xs/sm/md)
// ================================================================
export function LevelBadge({ level, size = 'md' }: { level: number; size?: Size }) {
  const { crowns, suns, moons, stars } = getLevelIcons(level);
  const tier = getTier(level);
  const hasIcons = crowns + suns + moons + stars > 0;
  const { font } = SIZE_MAP[size];

  return (
    <View style={styles.row}>
      {hasIcons ? (
        <>
          <TierGroup type="crown" count={crowns} size={size} />
          <TierGroup type="sun"   count={suns}   size={size} />
          <TierGroup type="moon"  count={moons}  size={size} />
          <TierGroup type="star"  count={stars}  size={size} />
        </>
      ) : (
        // Level 1: no icons yet
        <View style={[styles.iconBox, { width: SIZE_MAP[size].box, height: SIZE_MAP[size].box, borderRadius: SIZE_MAP[size].box / 4, backgroundColor: '#F5F5F5', marginRight: SIZE_MAP[size].gap }]}>
          <Text style={{ fontSize: font * 0.8, lineHeight: SIZE_MAP[size].box }}>{ASSETS.levelBadge.egg}</Text>
        </View>
      )}
      <Text style={[styles.levelNum, { fontSize: font * 0.75, color: TIER_COLOR[tier] }]}>
        Lv.{level}
      </Text>
    </View>
  );
}

// ================================================================
// LevelCard — full card with EXP progress bar (used on Stats/Profile)
// ================================================================
export function LevelCard({ level, totalExp }: { level: number; totalExp: number }) {
  const { crowns, suns, moons, stars } = getLevelIcons(level);
  const tier = getTier(level);
  const { expInLevel, expForNext, percent } = getLevelProgress(totalExp);
  const nextLevel = level + 1;
  const hasIcons = crowns + suns + moons + stars > 0;

  // What milestone comes next?
  const nextMilestone = getNextMilestone(level);

  return (
    <View style={[styles.card, { borderLeftColor: TIER_COLOR[tier], borderLeftWidth: 4 }]}>
      {/* Top row: icons + tier chip + level number */}
      <View style={styles.cardTopRow}>
        <View style={styles.row}>
          {hasIcons ? (
            <>
              <TierGroup type="crown" count={crowns} size="lg" />
              <TierGroup type="sun"   count={suns}   size="lg" />
              <TierGroup type="moon"  count={moons}  size="lg" />
              <TierGroup type="star"  count={stars}  size="lg" />
            </>
          ) : (
            <View style={[styles.iconBox, { width: 34, height: 34, borderRadius: 8, backgroundColor: '#F5F5F5', marginRight: 5 }]}>
              <Text style={{ fontSize: 20, lineHeight: 34 }}>{ASSETS.levelBadge.egg}</Text>
            </View>
          )}
        </View>
        <TierChip tier={tier} />
        <View style={styles.levelNumBig}>
          <Text style={[styles.levelNumBigText, { color: TIER_COLOR[tier] }]}>{level}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.barRow}>
        <Text style={styles.barLabel}>Level {level}</Text>
        <Text style={styles.barLabel}>Level {nextLevel}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${percent}%` as any, backgroundColor: TIER_COLOR[tier] }]} />
      </View>
      <Text style={styles.barExp}>{expInLevel} / {expForNext} EXP  ({percent}%)</Text>

      {/* Next milestone hint */}
      {nextMilestone && (
        <View style={styles.milestoneRow}>
          <Text style={styles.milestoneText}>
            {ASSETS.levelBadge.target} {nextMilestone.expLeft - (totalExp - getCumulativeExpForLevel(level))} EXP nữa để đạt {nextMilestone.label}
          </Text>
        </View>
      )}
    </View>
  );
}

/** Returns the next visual milestone (first moon / sun / crown) or null. */
function getNextMilestone(level: number): { label: string; expLeft: number } | null {
  if (level < 5)  return { label: `${ASSETS.levelBadge.moon} Chiến Sĩ (Lv.5)`,      expLeft: 800 };
  if (level < 17) return { label: `${ASSETS.levelBadge.sun} Anh Hùng (Lv.17)`,     expLeft: 5600 };
  if (level < 65) return { label: `${ASSETS.levelBadge.crown} Huyền Thoại (Lv.65)`, expLeft: 53600 };
  return null;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { justifyContent: 'center', alignItems: 'center' },
  levelNum: { fontWeight: '800', marginLeft: 2 },

  tierChip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    borderWidth: 1, marginHorizontal: 8,
  },
  tierLabel: { fontSize: 11, fontWeight: '800' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  levelNumBig: {
    marginLeft: 'auto',
    backgroundColor: '#F5F5F5', width: 44, height: 44,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  levelNumBigText: { fontSize: 20, fontWeight: '900' },

  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 11, color: '#8B7B74', fontWeight: '600' },
  barBg: { height: 10, backgroundColor: '#EEE', borderRadius: 5, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', borderRadius: 5 },
  barExp: { fontSize: 11, color: '#8B7B74', textAlign: 'right', fontWeight: '600' },

  milestoneRow: {
    marginTop: 10, backgroundColor: '#FFF9C4', borderRadius: 10,
    padding: 8,
  },
  milestoneText: { fontSize: 12, color: '#6D4C00', fontWeight: '600' },
});
