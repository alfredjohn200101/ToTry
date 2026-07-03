import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Button } from '@/design/Button';
import { Flourish } from '@/design/Flourish';
import { colors, space, fonts } from '@/design/tokens';
import { useStored } from '@/data/useStore';
import { type Morning, todayKey, saveMorning } from '@/soul/rituals';
import { verseFor } from '@/soul/verses';

const EMPTY: Morning[] = [];
const haptic = () => { if (process.env.EXPO_OS !== 'web') Haptics.selectionAsync().catch(() => {}); };
const MORNING_VERSE = verseFor('courage'); // a word of armour for the day, chosen once per mount

export default function MorningRitual() {
  const [mornings, setMornings] = useStored<Morning[]>('soul.morning', EMPTY);
  const today = mornings.find((m) => m.date === todayKey()) ?? null;
  const [gratitude, setGratitude] = useState(today?.gratitude ?? '');
  const [intention, setIntention] = useState(today?.intention ?? '');
  const [done, setDone] = useState(false);

  const save = () => {
    if (!intention.trim() && !gratitude.trim()) return;
    haptic();
    const m: Morning = { date: todayKey(), gratitude: gratitude.trim(), intention: intention.trim() };
    saveMorning(m);
    setMornings((cur) => [m, ...cur.filter((x) => x.date !== m.date)]);
    setDone(true);
  };

  return (
    <Screen showWordmark={false} showOrb>
      <Pressable onPress={() => router.back()} style={{ marginBottom: space.s3 }}>
        <Text variant="callout" color={colors.tx3}>‹ Soul</Text>
      </Pressable>
      <Text variant="title">Morning</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        Before the day gets loud — one breath, one word, one intention. Armour on before you step out.
      </Text>

      {/* A word for the day */}
      <Card style={{ marginTop: space.s5 }}>
        <View style={styles.goldRule} />
        <Text variant="eyebrow" color={colors.go} style={{ marginTop: space.s4 }}>{MORNING_VERSE.reference}</Text>
        <Text style={styles.scripture}>{MORNING_VERSE.verse}</Text>
      </Card>

      <Text variant="eyebrow" style={{ marginTop: space.s6 }}>One thing you're grateful for</Text>
      <TextInput value={gratitude} onChangeText={setGratitude} placeholder="even something small…" placeholderTextColor={colors.tx3} style={styles.input} />

      <Text variant="eyebrow" style={{ marginTop: space.s5 }}>Who do you want to be today?</Text>
      <TextInput value={intention} onChangeText={setIntention} placeholder="the man you want to be by tonight…" placeholderTextColor={colors.tx3} style={styles.input} multiline />

      {done ? (
        <Card tone="gold" style={{ marginTop: space.s5 }}>
          <Text variant="body" style={{ lineHeight: 24 }}>
            Set. I'll hand this back to you when the day gets hard — {intention ? `"${intention}"` : 'who you said you wanted to be'}.
          </Text>
        </Card>
      ) : (
        <Button label="Set my intention" onPress={save} style={{ marginTop: space.s6 }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  goldRule: { width: 28, height: 2, borderRadius: 2, backgroundColor: colors.go, opacity: 0.8 },
  scripture: { fontFamily: fonts.serifMed, fontSize: 21, color: colors.tx, lineHeight: 31, marginTop: space.s3 },
  input: { marginTop: space.s3, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16, minHeight: 48 },
});
