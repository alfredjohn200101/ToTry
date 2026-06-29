import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { openCompanion } from '@/components/companionController';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Button } from '@/design/Button';
import { colors, space, radius, aurora, getDaypart } from '@/design/tokens';

export default function Today() {
  const a = aurora[getDaypart()];

  return (
    <Screen>
      {/* Hero — breathes with the time of day */}
      <View style={styles.hero}>
        <LinearGradient colors={a.base} style={StyleSheet.absoluteFill} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} />
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id="heroGlow" cx="80%" cy="0%" rx="90%" ry="80%" gradientUnits="objectBoundingBox">
              <Stop offset="0" stopColor={a.glow} stopOpacity={1} />
              <Stop offset="1" stopColor={a.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroGlow)" />
        </Svg>

        <View style={styles.heroBody}>
          <Text variant="eyebrow" color={colors.go}>
            Day 1 · The beginning
          </Text>
          <Text variant="display" style={{ marginTop: space.s3 }}>
            {a.greeting}
          </Text>
          <Text variant="callout" style={{ marginTop: space.s3 }}>
            The day's underway — it's never too late to choose how you meet it.
          </Text>
          <Button label="Check in with me" onPress={() => openCompanion()} style={{ marginTop: space.s6 }} />
        </View>
      </View>

      {/* Scripture — the soul on the front door */}
      <Card style={{ marginTop: space.s4 }}>
        <View style={styles.goldRule} />
        <Text variant="verse" style={{ marginTop: space.s4 }}>
          Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you
          wherever you go.
        </Text>
        <Text variant="eyebrow" style={{ marginTop: space.s4 }}>
          Joshua 1:9
        </Text>
      </Card>

      {/* One thing — progressive disclosure, not a wall */}
      <Card tone="flat" style={{ marginTop: space.s4 }}>
        <Text variant="eyebrow">The one thing now</Text>
        <Text variant="body" style={{ marginTop: space.s3 }}>
          Tap the orb whenever you feel something — a pull, a heaviness, or even something good. I'll meet you in it.
        </Text>
      </Card>

      <Text variant="footnote" style={{ textAlign: 'center', marginTop: space.s8, fontStyle: 'italic' }}>
        the least one can do is try
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.hero, borderCurve: 'continuous', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd },
  heroBody: { padding: space.s6, paddingVertical: space.s7 },
  goldRule: { width: 28, height: 2, borderRadius: 2, backgroundColor: colors.go, opacity: 0.8 },
});
