import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Button } from '@/design/Button';
import { Flourish } from '@/design/Flourish';
import { colors, space, fonts, radius } from '@/design/tokens';
import { useStored } from '@/data/useStore';
import { useReadiness } from '@/health/useReadiness';
import {
  type Workout,
  type Exercise,
  type SetEntry,
  addWorkout,
  removeWorkout,
  e1rm,
  workoutVolume,
  bestE1rm,
  totalSets,
} from '@/train/model';

const EMPTY: Workout[] = [];
const LEVEL = {
  go: { color: colors.gr, line: "You're primed — a good day to chase a PR or add load." },
  moderate: { color: colors.go, line: 'Moderately recovered — train, but keep it controlled. Quality over maxing.' },
  rest: { color: colors.re, line: "Readiness is low — make it a walk, not a PR. Backing off today IS the work." },
} as const;
const haptic = (k: 'light' | 'success' = 'light') => {
  if (process.env.EXPO_OS === 'web') return;
  if (k === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.selectionAsync().catch(() => {});
};

function ExerciseBlock({ ex, onAddSet }: { ex: Exercise; onAddSet: (s: SetEntry) => void }) {
  const [w, setW] = useState('');
  const [r, setR] = useState('');
  const add = () => {
    const ww = parseFloat(w), rr = parseInt(r, 10);
    if (ww >= 0 && rr > 0) { haptic(); onAddSet({ weight: ww, reps: rr }); setW(''); setR(''); }
  };
  return (
    <View style={{ marginTop: space.s4 }}>
      <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, color: colors.tx }}>{ex.name}</Text>
      {ex.sets.map((s, i) => (
        <View key={i} style={styles.setRow}>
          <Text variant="footnote" color={colors.tx3} style={{ width: 22 }}>{i + 1}</Text>
          <Text style={{ fontFamily: fonts.monoMed, fontSize: 14, color: colors.tx, flex: 1 }}>{s.weight} kg × {s.reps}</Text>
          <Text variant="footnote" color={colors.tx3}>{e1rm(s.weight, s.reps)} 1RM</Text>
        </View>
      ))}
      <View style={styles.addSetRow}>
        <TextInput value={w} onChangeText={setW} keyboardType="numeric" placeholder="kg" placeholderTextColor={colors.tx3} style={styles.setInput} />
        <TextInput value={r} onChangeText={setR} keyboardType="numeric" placeholder="reps" placeholderTextColor={colors.tx3} style={styles.setInput} />
        <Pressable onPress={add} style={styles.smallBtn}><Text variant="subhead" color={colors.go}>＋ set</Text></Pressable>
      </View>
    </View>
  );
}

export default function Train() {
  const [workouts] = useStored<Workout[]>('train.workouts', EMPTY);
  const { readiness } = useReadiness();
  const rInfo = readiness?.hasData ? LEVEL[readiness.level] : null;

  const [active, setActive] = useState(false);
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exName, setExName] = useState('');

  const addExercise = () => { if (exName.trim()) { haptic(); setExercises((c) => [...c, { name: exName.trim(), sets: [] }]); setExName(''); } };
  const addSet = (idx: number, s: SetEntry) => setExercises((c) => c.map((e, i) => (i === idx ? { ...e, sets: [...e.sets, s] } : e)));
  const finish = () => {
    const withSets = exercises.filter((e) => e.sets.length);
    if (!withSets.length) { setActive(false); setExercises([]); setName(''); return; }
    haptic('success');
    addWorkout(name, withSets);
    setActive(false); setExercises([]); setName('');
  };

  return (
    <Screen showWordmark={false} showOrb>
      <Pressable onPress={() => router.back()} style={{ marginBottom: space.s3 }}>
        <Text variant="callout" color={colors.tx3}>‹ Grow</Text>
      </Pressable>
      <Text variant="title">Train</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        Discipline of the body is discipline of the man. Log it honestly, push when you're ready,
        back off when you're not — the strength shows up over time, not in one session.
      </Text>

      {/* THE MOAT — recovery decides the day. */}
      {rInfo && (
        <Card style={{ marginTop: space.s4, borderColor: rInfo.color + '55', borderWidth: StyleSheet.hairlineWidth }}>
          <Text variant="eyebrow" color={rInfo.color}>Today's readiness · {readiness!.score}</Text>
          <Text variant="body" style={{ marginTop: space.s2 }}>{rInfo.line}</Text>
        </Card>
      )}

      {active ? (
        <Card style={{ marginTop: space.s5 }}>
          <TextInput value={name} onChangeText={setName} placeholder="Session name (e.g. Push day)" placeholderTextColor={colors.tx3} style={styles.input} autoFocus />
          {exercises.map((ex, idx) => <ExerciseBlock key={idx} ex={ex} onAddSet={(s) => addSet(idx, s)} />)}
          <View style={styles.addExRow}>
            <TextInput value={exName} onChangeText={setExName} placeholder="Add an exercise…" placeholderTextColor={colors.tx3} style={[styles.input, { flex: 1, marginTop: 0 }]} />
            <Pressable onPress={addExercise} style={styles.smallBtn}><Text variant="subhead" color={colors.go}>Add</Text></Pressable>
          </View>
          <Button label="Finish session" onPress={finish} style={{ marginTop: space.s5 }} />
          <Pressable onPress={() => { setActive(false); setExercises([]); setName(''); }} style={{ alignItems: 'center', paddingVertical: space.s3 }}><Text variant="subhead" color={colors.tx3}>Discard</Text></Pressable>
        </Card>
      ) : (
        <Pressable onPress={() => { haptic(); setActive(true); }} style={styles.addRow}><Text variant="callout" color={colors.go}>＋ Start a session</Text></Pressable>
      )}

      {workouts.length > 0 && (
        <>
          <Text variant="eyebrow" style={{ marginTop: space.s7 }}>Recent</Text>
          {workouts.slice(0, 12).map((w) => (
            <Card key={w.id} tone="flat" style={{ marginTop: space.s3 }}>
              <View style={styles.rowTop}>
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, color: colors.tx, flex: 1 }}>{w.name}</Text>
                <Pressable onPress={() => { haptic(); removeWorkout(w.id); }} style={styles.remove}><Text variant="subhead" color={colors.tx3}>×</Text></Pressable>
              </View>
              <Text variant="footnote" style={{ marginTop: 2 }}>
                {new Date(w.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · {totalSets(w)} sets · {Math.round(workoutVolume(w)).toLocaleString()} kg volume{bestE1rm(w) > 0 ? ` · best ${bestE1rm(w)} 1RM` : ''}
              </Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { marginTop: space.s3, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2, marginTop: space.s2 },
  addSetRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2, marginTop: space.s3 },
  setInput: { flex: 1, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: radius.sm, paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.mono, fontSize: 15 },
  addExRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2, marginTop: space.s4 },
  smallBtn: { paddingHorizontal: space.s4, paddingVertical: space.s3, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.goBd, backgroundColor: colors.goBg, alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  remove: { paddingHorizontal: space.s3, paddingVertical: space.s1 },
  addRow: { marginTop: space.s5, paddingVertical: space.s4, alignItems: 'center', borderRadius: radius.card, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.goBd, backgroundColor: colors.goBg },
});
