import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Flourish } from '@/design/Flourish';
import { colors, space, fonts } from '@/design/tokens';
import { getHealthSnapshot } from '@/health/provider';
import { computeReadiness, HealthSnapshot, Readiness } from '@/health/readiness';

const LEVEL_COLOR = { go: colors.gr, moderate: colors.go, rest: colors.re } as const;
const LEVEL_LABEL = { go: 'Ready', moderate: 'Moderate', rest: 'Recover' } as const;

function Ring({ score, color }: { score: number; color: string }) {
  const r = 52, c = 2 * Math.PI * r, dash = (score / 100) * c;
  return (
    <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={132} height={132} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={66} cy={66} r={r} stroke={colors.bg3} strokeWidth={10} fill="none" />
        <Circle cx={66} cy={66} r={r} stroke={color} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
      </Svg>
      <Text style={{ fontFamily: fonts.serif, fontSize: 40, color: colors.tx }}>{score}</Text>
      <Text variant="micro">READINESS</Text>
    </View>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.metric}>
      <Text variant="eyebrow" style={{ marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontFamily: fonts.monoMed, fontSize: 19, color: colors.tx }}>
        {value}
        {unit ? <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.tx3 }}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export default function Recovery() {
  const [snap, setSnap] = useState<HealthSnapshot | null>(null);
  const [ready, setReady] = useState<Readiness | null>(null);

  useEffect(() => {
    let alive = true;
    getHealthSnapshot().then((s) => {
      if (!alive) return;
      setSnap(s);
      setReady(computeReadiness(s));
    });
    return () => { alive = false; };
  }, []);

  const color = ready ? LEVEL_COLOR[ready.level] : colors.go;
  const num = (v: number | null | undefined, d = 0) => (v == null ? '—' : v.toFixed(d));

  return (
    <Screen showWordmark={false} showOrb>
      <Pressable onPress={() => router.back()} style={{ marginBottom: space.s3 }}>
        <Text variant="callout" color={colors.tx3}>‹ Grow</Text>
      </Pressable>
      <Text variant="title">Recovery</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        How recovered you are today — read from your sleep, heart-rate variability and resting heart
        rate, then woven into the rest of your life so it guides the day rather than just measuring it.
      </Text>

      {!ready ? (
        <Card style={{ marginTop: space.s5, alignItems: 'center' }}>
          <ActivityIndicator color={colors.go} />
          <Text variant="subhead" style={{ marginTop: space.s3 }}>Reading your recovery…</Text>
        </Card>
      ) : (
        <>
          <Card style={{ marginTop: space.s5, alignItems: 'center' }}>
            <Ring score={ready.score} color={color} />
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, color, marginTop: space.s3, letterSpacing: 0.3 }}>
              {LEVEL_LABEL[ready.level]}
            </Text>
            <Text variant="body" style={{ textAlign: 'center', marginTop: space.s3 }}>{ready.advice}</Text>
          </Card>

          {ready.drivers.length > 0 && (
            <Card tone="flat" style={{ marginTop: space.s4 }}>
              <Text variant="eyebrow" color={colors.go}>What's shaping it</Text>
              {ready.drivers.map((d, i) => (
                <View key={i} style={styles.driverRow}>
                  <Text style={{ color: d.dir === 'up' ? colors.gr : colors.re, fontSize: 15, width: 16 }}>{d.dir === 'up' ? '↑' : '↓'}</Text>
                  <Text variant="subhead" style={{ flex: 1 }}>{d.label}</Text>
                </View>
              ))}
            </Card>
          )}

          <Card style={{ marginTop: space.s4 }}>
            <Text variant="eyebrow" style={{ marginBottom: space.s3 }}>Today's signals</Text>
            <View style={styles.grid}>
              <Metric label="HRV" value={num(snap?.hrv)} unit="ms" />
              <Metric label="Resting HR" value={num(snap?.rhr)} unit="bpm" />
              <Metric label="Sleep" value={num(snap?.sleepHours, 1)} unit="h" />
              <Metric label="Resp rate" value={num(snap?.respRate, 1)} unit="br/min" />
              <Metric label="Steps" value={snap?.steps != null ? snap.steps.toLocaleString() : '—'} />
              <Metric label="Active energy" value={num(snap?.activeEnergy)} unit="kcal" />
            </View>
          </Card>

          <Text variant="footnote" style={{ marginTop: space.s4, lineHeight: 19 }}>
            {snap?.source === 'mock'
              ? 'Sample data in this preview. On your phone it reads live from your health data — Apple Health on iPhone, Health Connect on Android — including whatever your watch syncs there, be it an Apple Watch, a Garmin or another.'
              : 'Live from your health data. Readiness sharpens over ~2 weeks as it learns your personal baseline.'}
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2, marginTop: space.s3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  metric: { width: '50%', paddingVertical: space.s3 },
});
