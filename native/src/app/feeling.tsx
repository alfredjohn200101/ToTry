// THE FEELING DOOR — meet the person IN the feeling, then move them through it.
// Phase 0: the entry grid (faithful to the PWA's FEELINGS). Phase 1 wires each path to the companion.
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/design/Text';
import { colors, space, radius } from '@/design/tokens';

const FEELINGS = [
  { id: 'pull', emoji: '🌊', label: 'The pull', sub: 'tempted, craving' },
  { id: 'restless', emoji: '⚡', label: 'Restless', sub: "can't settle, antsy" },
  { id: 'flat', emoji: '🌫️', label: 'Flat', sub: "numb, can't be bothered" },
  { id: 'anxious', emoji: '🌀', label: 'Anxious', sub: 'tense, spinning' },
  { id: 'down', emoji: '🌧️', label: 'Heavy', sub: 'low, sad, defeated' },
  { id: 'procrast', emoji: '🍯', label: 'Avoiding', sub: 'putting something off' },
  { id: 'angry', emoji: '🔥', label: 'Fired up', sub: 'angry, frustrated' },
  { id: 'good', emoji: '✨', label: 'Actually good', sub: 'steady, grateful' },
] as const;

export default function FeelingDoor() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ padding: space.s5, paddingTop: insets.top + space.s5, paddingBottom: space.s10 }}>
        <View style={styles.handle} />
        <Text variant="hero" style={{ textAlign: 'center', marginTop: space.s5 }}>
          What are you feeling?
        </Text>
        <Text variant="sub" style={{ textAlign: 'center', marginTop: space.s3, marginBottom: space.s6 }}>
          No wrong answer. Just name it — I'll take it from there.
        </Text>

        <View style={styles.grid}>
          {FEELINGS.map((f) => (
            <Pressable
              key={f.id}
              style={({ pressed }) => [styles.cell, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
              onPress={() => router.back()}
            >
              <Text style={{ fontSize: 30 }}>{f.emoji}</Text>
              <Text variant="body" style={{ marginTop: space.s3, fontWeight: '600' }}>
                {f.label}
              </Text>
              <Text variant="sub" style={{ marginTop: 2 }}>
                {f.sub}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.back()} style={{ marginTop: space.s6, alignSelf: 'center' }}>
          <Text variant="sub">Not now</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg2 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.tx3, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s3 },
  cell: {
    width: '47.8%',
    backgroundColor: colors.bg3,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bd,
    padding: space.s5,
    minHeight: 120,
  },
});
