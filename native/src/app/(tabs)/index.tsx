import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { openCompanion } from '@/components/companionController';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Button } from '@/design/Button';
import { Icon, type IconName } from '@/design/Icon';
import { colors, space, radius, aurora, fonts, getDaypart } from '@/design/tokens';
import { useLifeState } from '@/state/lifeState';

const READINESS = {
  go: { color: colors.gr, label: 'Well recovered', call: 'A good day to push.' },
  moderate: { color: colors.go, label: 'Moderately recovered', call: 'Train, but keep it controlled.' },
  rest: { color: colors.re, label: 'Recover today', call: "Your body's asking for rest." },
} as const;

// Is it currently the person's hardest urge window? (labels come from analyzeUrges)
function inWindow(label: string | null): boolean {
  if (!label) return false;
  const h = new Date().getHours();
  if (label.includes('late night')) return h < 6;
  if (label.includes('morning')) return h >= 6 && h < 12;
  if (label.includes('afternoon')) return h >= 12 && h < 17;
  if (label.includes('evening')) return h >= 17 && h < 21;
  if (label.includes('night')) return h >= 21;
  return false;
}

function Thread({
  icon,
  accent,
  title,
  value,
  sub,
  onPress,
}: {
  icon: IconName;
  accent: string;
  title: string;
  value: string;
  sub?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <Card tone="flat" style={[styles.thread, pressed && { opacity: 0.9 }]}>
          <View style={[styles.medallion, { borderColor: accent + '55', backgroundColor: accent + '14' }]}>
            <Icon name={icon} size={19} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="micro" color={colors.tx3}>{title.toUpperCase()}</Text>
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: colors.tx, marginTop: 2 }}>{value}</Text>
            {sub ? <Text variant="footnote" style={{ marginTop: 2 }}>{sub}</Text> : null}
          </View>
          <Icon name="chevron" size={18} color={colors.tx3} />
        </Card>
      )}
    </Pressable>
  );
}

export default function Today() {
  const a = aurora[getDaypart()];
  const life = useLifeState();
  const r = life.readiness;
  const rInfo = r?.hasData ? READINESS[r.level] : null;
  const fightActive = life.fight.activeCount > 0;
  const nowRisk = fightActive && inWindow(life.fight.riskWindow);

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
          <Text variant="eyebrow" color={colors.go}>Today</Text>
          <Text variant="display" style={{ marginTop: space.s3 }}>{a.greeting}</Text>
          <Text variant="callout" style={{ marginTop: space.s3 }}>
            The day's underway — it's never too late to choose how you meet it.
          </Text>
          <Button label="Check in with me" onPress={() => openCompanion()} style={{ marginTop: space.s6 }} />
        </View>
      </View>

      {/* Risk-window awareness — the reach-out-first, surfaced in-app until push lands. */}
      {nowRisk && (
        <Pressable onPress={() => openCompanion()}>
          <Card style={{ marginTop: space.s4, borderColor: colors.puBd, borderWidth: StyleSheet.hairlineWidth }}>
            <Text variant="eyebrow" color={colors.pu}>Your hard window</Text>
            <Text variant="body" style={{ marginTop: space.s2 }}>
              This is usually when it's hardest for you. Nothing has to happen — I'm just here. Tap if
              anything's rising.
            </Text>
          </Card>
        </Pressable>
      )}

      {/* The whole-life threads — only what there's real data for (progressive disclosure). */}
      {rInfo && (
        <Thread
          icon="pulse"
          accent={rInfo.color}
          title="Recovery"
          value={`${r!.score} · ${rInfo.label}`}
          sub={rInfo.call}
          onPress={() => router.push('/recovery' as never)}
        />
      )}

      {fightActive && (
        <Thread
          icon="flame"
          accent={colors.go}
          title="The fight"
          value={
            life.fight.longestCleanDays >= 1
              ? `${life.fight.longestCleanDays} ${life.fight.longestCleanDays === 1 ? 'day' : 'days'} clean`
              : 'In the fight'
          }
          sub={life.fight.reclaimed > 0 ? `$${life.fight.reclaimed} reclaimed so far` : `${life.fight.activeCount} being fought`}
          onPress={() => router.push('/fight' as never)}
        />
      )}

      {/* The coach — the whole-life guide, always a tap away. */}
      <Thread
        icon="soul"
        accent={colors.pu}
        title="Your coach"
        value="Ask the one who sees all of it"
        sub="what should I do right now?"
        onPress={() => router.push('/coach' as never)}
      />

      {/* Scripture — the soul on the front door */}
      <Card style={{ marginTop: space.s4 }}>
        <View style={styles.goldRule} />
        <Text variant="verse" style={{ marginTop: space.s4 }}>
          Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you
          wherever you go.
        </Text>
        <Text variant="eyebrow" style={{ marginTop: space.s4 }}>Joshua 1:9</Text>
      </Card>

      {/* One thing — the entry through emotion, always */}
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
  thread: { marginTop: space.s3, flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingVertical: space.s4 },
  medallion: { width: 42, height: 42, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
});
