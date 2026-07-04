import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '@/design/Icon';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Flourish } from '@/design/Flourish';
import { colors, space, fonts, radius } from '@/design/tokens';
import { useStored } from '@/data/useStore';
import {
  type Food,
  type Targets,
  type Water,
  todayKey,
  addFood,
  removeFood,
  saveTargets,
  addWater,
  sum,
  pct,
} from '@/nourish/model';
import { computeAdaptiveTDEE } from '@/nourish/adaptive';

const EMPTY: Food[] = [];
const EMPTY_W: unknown[] = [];
const DEFAULT: Targets = { cal: 2200, protein: 150 };
const haptic = () => { if (process.env.EXPO_OS !== 'web') Haptics.selectionAsync().catch(() => {}); };

function Ring({ value, target }: { value: number; target: number }) {
  const r = 58, c = 2 * Math.PI * r, p = target > 0 ? Math.min(1, value / target) : 0;
  const over = value > target;
  const color = over ? colors.re : colors.gr;
  return (
    <View style={{ width: 148, height: 148, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={148} height={148} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={74} cy={74} r={r} stroke={colors.bg4} strokeWidth={11} fill="none" />
        <Circle cx={74} cy={74} r={r} stroke={color} strokeWidth={11} fill="none" strokeLinecap="round" strokeDasharray={`${p * c} ${c}`} />
      </Svg>
      <Text style={{ fontFamily: fonts.serif, fontSize: 34, color: colors.tx }}>{Math.max(0, target - value)}</Text>
      <Text variant="micro">{over ? 'OVER' : 'LEFT'}</Text>
    </View>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.track}><View style={[styles.fill, { width: `${value}%`, backgroundColor: color }]} /></View>
  );
}

export default function Nourish() {
  const [log] = useStored<Food[]>('nourish.log', EMPTY);
  const [targets] = useStored<Targets>('nourish.targets', DEFAULT);
  const [water] = useStored<Water | null>('nourish.water', null);
  useStored<unknown[]>('body.weights', EMPTY_W); // subscribe so adaptive TDEE recomputes on weigh-ins
  const [adding, setAdding] = useState(false);
  const [editTargets, setEditTargets] = useState(false);
  const adaptive = computeAdaptiveTDEE();

  const today = log.filter((f) => f.date === todayKey());
  const totals = sum(today);
  const waterMl = water && water.date === todayKey() ? water.ml : 0;

  return (
    <Screen showWordmark={false} showOrb>
      <Pressable onPress={() => router.back()} style={{ marginBottom: space.s3 }}>
        <Text variant="callout" color={colors.tx3}>‹ Grow</Text>
      </Pressable>
      <Text variant="title">Nourish</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        Food is fuel, not a scoreboard. Log honestly, hit your protein, and let the numbers serve you —
        never the other way round.
      </Text>

      {/* Today's fuel */}
      <Card style={{ marginTop: space.s5, alignItems: 'center' }}>
        <Ring value={totals.cal} target={targets.cal} />
        <Text variant="subhead" style={{ marginTop: space.s3 }}>
          {totals.cal} / {targets.cal} kcal
        </Text>
        <View style={{ alignSelf: 'stretch', marginTop: space.s5 }}>
          <View style={styles.rowTop}>
            <Text variant="footnote">Protein</Text>
            <Text style={{ fontFamily: fonts.monoMed, fontSize: 14, color: colors.tx }}>{totals.protein}<Text style={{ color: colors.tx3 }}> / {targets.protein}g</Text></Text>
          </View>
          <Bar value={pct(totals.protein, targets.protein)} color={colors.go} />
        </View>
        <Pressable onPress={() => { haptic(); setEditTargets((v) => !v); }} style={{ marginTop: space.s4 }}>
          <Text variant="footnote" color={colors.go}>{editTargets ? 'done' : 'adjust targets'}</Text>
        </Pressable>
        {editTargets && <TargetEditor t={targets} onSave={(t) => { saveTargets(t); setEditTargets(false); }} />}
      </Card>

      {/* Adaptive TDEE — learned from real data, pure code, no AI */}
      {adaptive && (
        <Card style={{ marginTop: space.s4, borderColor: colors.goBd, borderWidth: StyleSheet.hairlineWidth }}>
          <Text variant="eyebrow" color={colors.go}>Learned from your data</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: space.s2 }}>
            <Text style={{ fontFamily: fonts.serif, fontSize: 32, color: colors.tx, lineHeight: 34 }}>{adaptive.tdee}</Text>
            <Text variant="subhead" style={{ marginLeft: space.s2, marginBottom: 6 }}>kcal · your real maintenance</Text>
          </View>
          <Text variant="footnote" style={{ marginTop: space.s2, lineHeight: 19 }}>
            From {adaptive.loggedDays} logged days over {adaptive.days}: you averaged {adaptive.avgIntake} kcal and{' '}
            {adaptive.weightChangeKg >= 0 ? 'gained' : 'lost'} {Math.abs(adaptive.weightChangeKg)} kg. No formula — this is your actual body.
          </Text>
          {adaptive.suggested !== targets.cal && (
            <Pressable onPress={() => { haptic(); saveTargets({ cal: adaptive.suggested, protein: targets.protein }); }} style={[styles.saveBtn, { marginTop: space.s4 }]}>
              <Text variant="subhead" color={colors.go}>
                Use {adaptive.suggested} kcal as my target{adaptive.direction !== 'maintain' ? ` (to ${adaptive.direction})` : ''}
              </Text>
            </Pressable>
          )}
        </Card>
      )}

      {/* Water */}
      <Card tone="flat" style={{ marginTop: space.s4, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow">Water</Text>
          <Text style={{ fontFamily: fonts.monoMed, fontSize: 18, color: colors.bl, marginTop: 2 }}>{(waterMl / 1000).toFixed(2)} L</Text>
        </View>
        <Pressable onPress={() => { haptic(); addWater(250); }} style={styles.waterBtn}><Text variant="subhead" color={colors.bl}>+250ml</Text></Pressable>
        <Pressable onPress={() => { haptic(); addWater(500); }} style={styles.waterBtn}><Text variant="subhead" color={colors.bl}>+500ml</Text></Pressable>
      </Card>

      {/* Fuel plan — the whole-life meal planner */}
      <Pressable onPress={() => { haptic(); router.push('/fuel' as never); }}>
        {({ pressed }) => (
          <Card style={[{ marginTop: space.s4, flexDirection: 'row', alignItems: 'center', gap: space.s3, borderColor: colors.goBd, borderWidth: StyleSheet.hairlineWidth }, pressed && { opacity: 0.9 }]}>
            <View style={styles.fuelMedallion}><Icon name="leaf" size={20} color={colors.go} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: colors.tx }}>Build a fuel plan</Text>
              <Text variant="footnote" style={{ marginTop: 2 }}>A day of real food around your targets, budget & training</Text>
            </View>
            <Icon name="chevron" size={18} color={colors.tx3} />
          </Card>
        )}
      </Pressable>

      {/* Today's food */}
      <View style={styles.sectionHead}>
        <Text variant="eyebrow">Today</Text>
        <Text variant="footnote">{today.length} logged</Text>
      </View>
      {today.map((f) => (
        <Card key={f.id} tone="flat" style={{ marginTop: space.s3, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sansMed, fontSize: 15, color: colors.tx }}>{f.name}</Text>
            <Text variant="footnote">{f.cal} kcal · {f.protein}g protein</Text>
          </View>
          <Pressable onPress={() => { haptic(); removeFood(f.id); }} style={styles.remove}><Text variant="subhead" color={colors.tx3}>×</Text></Pressable>
        </Card>
      ))}

      {adding ? (
        <AddFood onSave={(d) => { addFood(d); setAdding(false); }} onCancel={() => setAdding(false)} />
      ) : (
        <Pressable onPress={() => { haptic(); setAdding(true); }} style={styles.addRow}><Text variant="callout" color={colors.go}>＋ Log food</Text></Pressable>
      )}
    </Screen>
  );
}

function TargetEditor({ t, onSave }: { t: Targets; onSave: (t: Targets) => void }) {
  const [cal, setCal] = useState(String(t.cal));
  const [pro, setPro] = useState(String(t.protein));
  return (
    <View style={{ alignSelf: 'stretch', marginTop: space.s4 }}>
      <View style={{ flexDirection: 'row', gap: space.s3 }}>
        <View style={{ flex: 1 }}>
          <Text variant="micro">CALORIES</Text>
          <TextInput value={cal} onChangeText={setCal} keyboardType="numeric" style={styles.input} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="micro">PROTEIN (g)</Text>
          <TextInput value={pro} onChangeText={setPro} keyboardType="numeric" style={styles.input} />
        </View>
      </View>
      <Pressable onPress={() => onSave({ cal: parseFloat(cal) || t.cal, protein: parseFloat(pro) || t.protein })} style={[styles.saveBtn, { marginTop: space.s3 }]}><Text variant="subhead" color={colors.go}>Save targets</Text></Pressable>
    </View>
  );
}

function AddFood({ onSave, onCancel }: { onSave: (d: { name: string; cal: number; protein: number }) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [cal, setCal] = useState('');
  const [pro, setPro] = useState('');
  return (
    <Card style={{ marginTop: space.s3 }}>
      <TextInput value={name} onChangeText={setName} placeholder="What did you eat?" placeholderTextColor={colors.tx3} style={styles.input} autoFocus />
      <View style={{ flexDirection: 'row', gap: space.s3, marginTop: space.s3 }}>
        <TextInput value={cal} onChangeText={setCal} keyboardType="numeric" placeholder="kcal" placeholderTextColor={colors.tx3} style={[styles.input, { flex: 1, marginTop: 0 }]} />
        <TextInput value={pro} onChangeText={setPro} keyboardType="numeric" placeholder="protein g" placeholderTextColor={colors.tx3} style={[styles.input, { flex: 1, marginTop: 0 }]} />
      </View>
      <Pressable onPress={() => { if (name.trim()) { haptic(); onSave({ name, cal: parseFloat(cal) || 0, protein: parseFloat(pro) || 0 }); } }} style={[styles.saveBtn, { marginTop: space.s4 }]}><Text variant="subhead" color={colors.go}>Add</Text></Pressable>
      <Pressable onPress={onCancel} style={{ alignItems: 'center', paddingVertical: space.s3 }}><Text variant="subhead" color={colors.tx3}>Cancel</Text></Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: colors.bg4, marginTop: space.s2, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s6 },
  waterBtn: { paddingHorizontal: space.s4, paddingVertical: space.s3, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, marginLeft: space.s2 },
  remove: { paddingHorizontal: space.s3, paddingVertical: space.s1 },
  addRow: { marginTop: space.s3, paddingVertical: space.s4, alignItems: 'center', borderRadius: radius.card, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.goBd, backgroundColor: colors.goBg },
  fuelMedallion: { width: 42, height: 42, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.goBd, backgroundColor: colors.goBg, alignItems: 'center', justifyContent: 'center' },
  input: { marginTop: space.s2, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16 },
  saveBtn: { paddingVertical: space.s3, alignItems: 'center', borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.goBd, backgroundColor: colors.goBg },
});
