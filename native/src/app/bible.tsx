import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Flourish } from '@/design/Flourish';
import { colors, space, fonts, radius } from '@/design/tokens';
import { useStored } from '@/data/useStore';
import {
  type Verse,
  type VerseTheme,
  THEME_ORDER,
  THEME_LABEL,
  detectTheme,
  verseFor,
} from '@/soul/verses';

const EMPTY_SAVED: Verse[] = [];
const key = (v: Verse) => v.reference + '|' + v.verse.slice(0, 24);

const haptic = () => {
  if (process.env.EXPO_OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
};

function VerseCard({ v, saved, onAnother, onToggleSave }: { v: Verse; saved: boolean; onAnother: () => void; onToggleSave: () => void }) {
  return (
    <Card style={{ marginTop: space.s5 }}>
      <View style={styles.goldRule} />
      <Text variant="eyebrow" color={colors.go} style={{ marginTop: space.s4 }}>{v.reference}</Text>
      <Text style={styles.scripture}>{v.verse}</Text>
      <View style={styles.reflect}>
        <Text variant="subhead" style={{ color: colors.tx2, lineHeight: 22 }}>{v.reflection}</Text>
      </View>
      <View style={styles.cardActions}>
        <Pressable onPress={onAnother} style={[styles.softBtn, styles.grow]}>
          <Text variant="subhead" color={colors.tx2}>Another</Text>
        </Pressable>
        <Pressable onPress={onToggleSave} style={[styles.softBtn, styles.grow, saved && { borderColor: colors.goBd, backgroundColor: colors.goBg }]}>
          <Text variant="subhead" color={saved ? colors.go : colors.tx2}>{saved ? '✓ Saved' : 'Save'}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function Bible() {
  const [saved, setSaved] = useStored<Verse[]>('soul.savedVerses', EMPTY_SAVED);
  const [theme, setTheme] = useState<VerseTheme | null>(null);
  const [current, setCurrent] = useState<Verse | null>(null);
  const [freeText, setFreeText] = useState('');

  const pick = (t: VerseTheme) => {
    haptic();
    setTheme(t);
    setCurrent(verseFor(t));
  };

  const fromText = () => {
    if (!freeText.trim()) return;
    const t = detectTheme(freeText);
    setTheme(t);
    setCurrent(verseFor(t));
    setFreeText('');
  };

  const isSaved = current ? saved.some((s) => key(s) === key(current)) : false;
  const toggleSave = () => {
    if (!current) return;
    haptic();
    setSaved((cur) => (cur.some((s) => key(s) === key(current)) ? cur.filter((s) => key(s) !== key(current)) : [current, ...cur]));
  };

  return (
    <Screen showWordmark={false} showOrb>
      <Pressable onPress={() => router.back()} style={{ marginBottom: space.s3 }}>
        <Text variant="callout" color={colors.tx3}>‹ Soul</Text>
      </Pressable>
      <Text variant="title">A word for you</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        What are you carrying right now? Pick what's closest, and I'll bring you a word for it — not
        to fix it, just to sit with you in it.
      </Text>

      <View style={styles.chips}>
        {THEME_ORDER.map((t) => (
          <Pressable key={t} onPress={() => pick(t)} style={[styles.chip, theme === t && styles.chipOn]}>
            <Text variant="subhead" color={theme === t ? colors.tx : colors.tx3}>{THEME_LABEL[t]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.freeRow}>
        <TextInput
          value={freeText}
          onChangeText={setFreeText}
          placeholder="…or tell me in your own words"
          placeholderTextColor={colors.tx3}
          style={styles.input}
          onSubmitEditing={fromText}
          returnKeyType="search"
        />
      </View>

      {current && <VerseCard v={current} saved={isSaved} onAnother={() => setCurrent(verseFor(theme!, current))} onToggleSave={toggleSave} />}

      {saved.length > 0 && (
        <View style={{ marginTop: space.s8 }}>
          <Text variant="eyebrow">Kept for the road · {saved.length}</Text>
          {saved.map((v) => (
            <Card key={key(v)} tone="flat" style={{ marginTop: space.s3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="eyebrow" color={colors.go}>{v.reference}</Text>
                  <Text style={[styles.scripture, { fontSize: 17, marginTop: space.s2 }]}>{v.verse}</Text>
                </View>
                <Pressable onPress={() => { haptic(); setSaved((cur) => cur.filter((s) => key(s) !== key(v))); }} style={styles.remove}>
                  <Text variant="subhead" color={colors.tx3}>×</Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  goldRule: { width: 28, height: 2, borderRadius: 2, backgroundColor: colors.go, opacity: 0.8 },
  scripture: { fontFamily: fonts.serifMed, fontSize: 23, color: colors.tx, lineHeight: 34, marginTop: space.s3 },
  reflect: { marginTop: space.s4, paddingLeft: space.s4, borderLeftWidth: 2, borderLeftColor: colors.goBd },
  cardActions: { flexDirection: 'row', gap: space.s3, marginTop: space.s5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s2, marginTop: space.s5 },
  chip: { paddingHorizontal: space.s4, paddingVertical: space.s3, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2 },
  chipOn: { backgroundColor: colors.bg3, borderColor: colors.goBd },
  freeRow: { marginTop: space.s3 },
  input: { backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16 },
  softBtn: { paddingHorizontal: space.s4, paddingVertical: space.s3, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  remove: { paddingHorizontal: space.s3, paddingVertical: space.s1 },
});
