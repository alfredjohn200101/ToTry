import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Flourish } from '@/design/Flourish';
import { colors, space, fonts, radius } from '@/design/tokens';
import { useStored } from '@/data/useStore';
import { type WeightEntry, logWeight, removeWeight, saveGoal, latest, changeOver } from '@/body/model';

const EMPTY: WeightEntry[] = [];
const haptic = () => { if (process.env.EXPO_OS !== 'web') Haptics.selectionAsync().catch(() => {}); };
const byDate = (a: WeightEntry, b: WeightEntry) => (a.date < b.date ? -1 : 1);

function Spark({ ws, goal }: { ws: WeightEntry[]; goal: number | null }) {
  // react-native-web ignores width="100%" on <Svg>, so measure the container and draw at pixels.
  const [w, setW] = useState(0);
  const pts = ws.slice(-14);
  const H = 72, pad = 8;
  const kgs = pts.map((p) => p.kg).concat(goal != null ? [goal] : []);
  const min = Math.min(...kgs), max = Math.max(...kgs), range = max - min || 1;
  const step = w > 0 && pts.length > 1 ? (w - pad * 2) / (pts.length - 1) : 0;
  const y = (kg: number) => pad + (1 - (kg - min) / range) * (H - pad * 2);
  const coords = pts.map((p, i) => `${pad + i * step},${y(p.kg)}`);
  const last = pts[pts.length - 1];
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H, marginTop: space.s4 }}>
      {w > 0 && pts.length >= 2 && (
        <Svg width={w} height={H}>
          {goal != null && <Line x1={pad} y1={y(goal)} x2={w - pad} y2={y(goal)} stroke={colors.gr} strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />}
          <Polyline points={coords.join(' ')} fill="none" stroke={colors.go} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={pad + (pts.length - 1) * step} cy={y(last.kg)} r={4} fill={colors.go} />
        </Svg>
      )}
    </View>
  );
}

export default function Body() {
  const [raw] = useStored<WeightEntry[]>('body.weights', EMPTY);
  const [goal] = useStored<number | null>('body.weightGoal', null);
  const ws = raw.slice().sort(byDate);
  const cur = latest(ws);
  const week = changeOver(ws, 7);
  const [input, setInput] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [editGoal, setEditGoal] = useState(false);

  const log = () => { const n = parseFloat(input); if (n > 0) { haptic(); logWeight(n); setInput(''); } };

  return (
    <Screen showWordmark={false} showOrb>
      <Pressable onPress={() => router.back()} style={{ marginBottom: space.s3 }}>
        <Text variant="callout" color={colors.tx3}>‹ Grow</Text>
      </Pressable>
      <Text variant="title">Body</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        Weight bounces day to day — the line is what matters, not the number this morning. Log it,
        watch the trend, and let it be information, never a verdict.
      </Text>

      <Card style={{ marginTop: space.s5 }}>
        {cur ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: fonts.serif, fontSize: 46, color: colors.tx, lineHeight: 48 }}>{cur.kg}</Text>
              <Text variant="subhead" style={{ marginLeft: space.s2, marginBottom: 9 }}>kg</Text>
              {week != null && (
                <Text style={{ marginLeft: 'auto', marginBottom: 10, fontFamily: fonts.monoMed, fontSize: 14, color: week < 0 ? colors.gr : week > 0 ? colors.go : colors.tx3 }}>
                  {week > 0 ? '↑' : week < 0 ? '↓' : '·'} {Math.abs(week)} kg / wk
                </Text>
              )}
            </View>
            <Spark ws={ws} goal={goal} />
          </>
        ) : (
          <Text variant="body" color={colors.tx2}>No weigh-ins yet. Log your first below — same time of day, most mornings, gives the truest line.</Text>
        )}
      </Card>

      <View style={styles.logRow}>
        <TextInput value={input} onChangeText={setInput} keyboardType="numeric" placeholder="today's weight (kg)" placeholderTextColor={colors.tx3} style={styles.input} onSubmitEditing={log} returnKeyType="done" />
        <Pressable onPress={log} style={styles.logBtn}><Text variant="subhead" color={colors.go}>Log</Text></Pressable>
      </View>

      {/* Goal — optional, direction not shame */}
      {editGoal ? (
        <View style={styles.logRow}>
          <TextInput value={goalInput} onChangeText={setGoalInput} keyboardType="numeric" placeholder="goal weight (kg)" placeholderTextColor={colors.tx3} style={styles.input} />
          <Pressable onPress={() => { const n = parseFloat(goalInput); haptic(); saveGoal(n > 0 ? n : null); setEditGoal(false); }} style={styles.logBtn}><Text variant="subhead" color={colors.go}>Set</Text></Pressable>
        </View>
      ) : (
        <Pressable onPress={() => { haptic(); setGoalInput(goal != null ? String(goal) : ''); setEditGoal(true); }} style={{ marginTop: space.s4, alignSelf: 'center' }}>
          <Text variant="footnote" color={colors.go}>
            {goal != null && cur ? `Goal ${goal} kg · ${Math.abs(Math.round((cur.kg - goal) * 10) / 10)} kg to go` : goal != null ? `Goal ${goal} kg` : '＋ set a goal weight (optional)'}
          </Text>
        </Pressable>
      )}

      {ws.length > 0 && (
        <>
          <Text variant="eyebrow" style={{ marginTop: space.s7 }}>Log</Text>
          {ws.slice().reverse().slice(0, 10).map((w) => (
            <Card key={w.id} tone="flat" style={{ marginTop: space.s3, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.monoMed, fontSize: 16, color: colors.tx, flex: 1 }}>{w.kg} kg</Text>
              <Text variant="footnote" style={{ marginRight: space.s3 }}>{new Date(w.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
              <Pressable onPress={() => { haptic(); removeWeight(w.id); }} style={styles.remove}><Text variant="subhead" color={colors.tx3}>×</Text></Pressable>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  logRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2, marginTop: space.s4 },
  input: { flex: 1, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16 },
  logBtn: { paddingHorizontal: space.s5, paddingVertical: space.s3, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.goBd, backgroundColor: colors.goBg, alignItems: 'center', justifyContent: 'center' },
  remove: { paddingHorizontal: space.s3, paddingVertical: space.s1 },
});
