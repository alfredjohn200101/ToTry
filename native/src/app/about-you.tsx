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
import { type Sex, type Faith, defaultTargets } from '@/settings/profile';

const haptic = () => { if (process.env.EXPO_OS !== 'web') Haptics.selectionAsync().catch(() => {}); };

const SEXES: { key: Sex; label: string }[] = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: null, label: 'Prefer not' },
];
const FAITHS: { key: Faith; label: string; sub: string }[] = [
  { key: 'full', label: 'Full', sub: 'Scripture woven throughout' },
  { key: 'some', label: 'Some', sub: 'A gentle amount' },
  { key: 'off', label: 'Off', sub: 'Kept to the Soul tab' },
];

function Seg<T extends string | null>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { key: T; label: string }[] }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable key={String(o.key)} onPress={() => { haptic(); onChange(o.key); }} style={[styles.segItem, value === o.key && styles.segOn]}>
          <Text variant="subhead" color={value === o.key ? colors.tx : colors.tx3}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function AboutYou() {
  const [name, setName] = useStored<string>('user.name', '');
  const [sex, setSex] = useStored<Sex>('user.sex', null);
  const [faith, setFaith] = useStored<Faith>('user.faith', 'some');
  const [saved, setSaved] = useState(false);
  const t = defaultTargets(sex);

  return (
    <Screen showWordmark={false} showOrb>
      <Pressable onPress={() => router.back()} style={{ marginBottom: space.s3 }}>
        <Text variant="callout" color={colors.tx3}>‹ Settings</Text>
      </Pressable>
      <Text variant="title">About you</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        Just enough for the app to speak to you like it knows you, and to get the numbers honest.
        Nothing here leaves your phone unless you're signed in to sync.
      </Text>

      <Text variant="eyebrow" style={{ marginTop: space.s6 }}>What should I call you?</Text>
      <TextInput
        value={name}
        onChangeText={(v) => { setName(v); setSaved(false); }}
        placeholder="your name"
        placeholderTextColor={colors.tx3}
        style={styles.input}
      />

      <Text variant="eyebrow" style={{ marginTop: space.s6 }}>Biological sex</Text>
      <Text variant="footnote" style={{ marginTop: space.s1 }}>Calorie and protein maths are honestly different — this keeps your targets real.</Text>
      <Seg value={sex} onChange={(v) => { setSex(v); setSaved(false); }} options={SEXES} />
      <Text variant="footnote" style={{ marginTop: space.s3, color: colors.tx2 }}>
        Default daily fuel: {t.cal} kcal · {t.protein}g protein <Text variant="footnote">(you can always adjust in Nourish)</Text>
      </Text>

      <Text variant="eyebrow" style={{ marginTop: space.s6 }}>Faith</Text>
      <Text variant="footnote" style={{ marginTop: space.s1 }}>Built from a Christian heart, but yours to dial. Any belief or none is fully served.</Text>
      <View style={{ marginTop: space.s3, gap: space.s2 }}>
        {FAITHS.map((f) => (
          <Pressable key={f.key} onPress={() => { haptic(); setFaith(f.key); setSaved(false); }} style={[styles.faithRow, faith === f.key && styles.faithOn]}>
            <View style={{ flex: 1 }}>
              <Text variant="subhead" color={faith === f.key ? colors.tx : colors.tx2}>{f.label}</Text>
              <Text variant="footnote">{f.sub}</Text>
            </View>
            {faith === f.key && <Text variant="subhead" color={colors.go}>✓</Text>}
          </Pressable>
        ))}
      </View>

      <Button label={saved ? '✓ Saved' : 'Save'} onPress={() => { haptic(); setSaved(true); }} style={{ marginTop: space.s7 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { marginTop: space.s3, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16 },
  seg: { flexDirection: 'row', gap: space.s2, marginTop: space.s3 },
  segItem: { flex: 1, paddingVertical: space.s3, alignItems: 'center', borderRadius: radius.sm, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2 },
  segOn: { backgroundColor: colors.bg3, borderColor: colors.goBd },
  faithRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.s4, paddingVertical: space.s4, borderRadius: radius.sm, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2 },
  faithOn: { backgroundColor: colors.bg3, borderColor: colors.goBd },
});
