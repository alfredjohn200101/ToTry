import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Button } from '@/design/Button';
import { Flourish } from '@/design/Flourish';
import { colors, space, radius, fonts } from '@/design/tokens';
import { useStored } from '@/data/useStore';
import { type Reflection, todayKey, saveReflection } from '@/soul/rituals';
import { todaysMorning } from '@/soul/rituals';

const EMPTY: Reflection[] = [];
const MOODS = ['Hard', 'Mixed', 'Good', 'Grateful'] as const;
const haptic = () => { if (process.env.EXPO_OS !== 'web') Haptics.selectionAsync().catch(() => {}); };

export default function Reflect() {
  const [reflections, setReflections] = useStored<Reflection[]>('soul.reflections', EMPTY);
  const today = reflections.find((r) => r.date === todayKey()) ?? null;
  const morning = todaysMorning();
  const [mood, setMood] = useState<string>(today?.mood ?? '');
  const [win, setWin] = useState(today?.win ?? '');
  const [honest, setHonest] = useState(today?.honest ?? '');
  const [done, setDone] = useState(false);

  const save = () => {
    if (!mood && !win.trim() && !honest.trim()) return;
    haptic();
    const r: Reflection = { date: todayKey(), mood, win: win.trim(), honest: honest.trim() };
    saveReflection(r);
    setReflections((cur) => [r, ...cur.filter((x) => x.date !== r.date)]);
    setDone(true);
  };

  return (
    <Screen showWordmark={false} showOrb>
      <Pressable onPress={() => router.back()} style={{ marginBottom: space.s3 }}>
        <Text variant="callout" color={colors.tx3}>‹ Soul</Text>
      </Pressable>
      <Text variant="title">Examen</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        Look back on the day with God, gently. Not to keep score — to notice where grace was, and
        where you want to grow. However today went, it isn't the final word.
      </Text>

      {morning?.intention ? (
        <Card tone="flat" style={{ marginTop: space.s5 }}>
          <Text variant="micro" color={colors.go}>THIS MORNING YOU SAID</Text>
          <Text variant="body" style={{ marginTop: space.s2, fontStyle: 'italic' }}>"{morning.intention}"</Text>
        </Card>
      ) : null}

      <Text variant="eyebrow" style={{ marginTop: space.s6 }}>How did today feel?</Text>
      <View style={styles.chips}>
        {MOODS.map((m) => (
          <Pressable key={m} onPress={() => { haptic(); setMood(m); }} style={[styles.chip, mood === m && styles.chipOn]}>
            <Text variant="subhead" color={mood === m ? colors.tx : colors.tx3}>{m}</Text>
          </Pressable>
        ))}
      </View>

      <Text variant="eyebrow" style={{ marginTop: space.s5 }}>One thing that went well</Text>
      <TextInput value={win} onChangeText={setWin} placeholder="name the good, however small…" placeholderTextColor={colors.tx3} style={styles.input} />

      <Text variant="eyebrow" style={{ marginTop: space.s5 }}>One honest thing</Text>
      <TextInput value={honest} onChangeText={setHonest} placeholder="where you fell short, or what's on your heart…" placeholderTextColor={colors.tx3} style={styles.input} multiline />

      {done ? (
        <Card tone="gold" style={{ marginTop: space.s5 }}>
          <Text variant="body" style={{ lineHeight: 24 }}>
            Rest now. Tomorrow's mercies are already made — new every morning. You showed up honestly, and that counts.
          </Text>
        </Card>
      ) : (
        <Button label="Close the day" onPress={save} style={{ marginTop: space.s6 }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s2, marginTop: space.s3 },
  chip: { paddingHorizontal: space.s4, paddingVertical: space.s3, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2 },
  chipOn: { backgroundColor: colors.bg3, borderColor: colors.goBd },
  input: { marginTop: space.s3, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16, minHeight: 48 },
});
