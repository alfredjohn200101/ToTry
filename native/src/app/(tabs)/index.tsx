import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Button } from '@/design/Button';
import { colors, space, radius, aurora, getDaypart, fonts } from '@/design/tokens';

export default function Today() {
  const dp = getDaypart();
  const a = aurora[dp];

  return (
    <Screen>
      {/* Hero — breathes with the time of day */}
      <View style={[styles.hero, { borderColor: colors.bd }]}>
        <LinearGradient colors={a.base} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} />
        <LinearGradient
          colors={[a.glowTop, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.9, y: 0 }}
          end={{ x: 0.3, y: 0.7 }}
        />
        <View style={styles.heroBody}>
          <Text variant="hero">{a.greeting}</Text>
          <Text variant="sub" style={{ marginTop: space.s3 }}>
            The day's underway — it's never too late to choose how you meet it.
          </Text>
          <Text variant="label" style={{ marginTop: space.s5 }}>
            DAY 1 · BEGINNING
          </Text>
          <Button label="Check in with me" onPress={() => router.push('/feeling')} style={{ marginTop: space.s5 }} />
        </View>
      </View>

      {/* The verse — the soul on the front door */}
      <Card style={{ marginTop: space.s4 }}>
        <Text variant="serif">
          Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you
          wherever you go.
        </Text>
        <Text variant="label" style={{ marginTop: space.s3 }}>
          JOSHUA 1:9 · ESV
        </Text>
      </Card>

      {/* One next thing — progressive disclosure, not a wall */}
      <Card style={{ marginTop: space.s4 }} tone="flat">
        <Text variant="label">THE ONE THING NOW</Text>
        <Text variant="body" style={{ marginTop: space.s2 }}>
          Tap the orb whenever you feel something — a pull, a heaviness, or even something good. I'll meet you in it.
        </Text>
      </Card>

      <Text
        style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.tx3, textAlign: 'center', marginTop: space.s8 }}
      >
        the least one can do is try
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.card, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  heroBody: { padding: space.s6 },
});
