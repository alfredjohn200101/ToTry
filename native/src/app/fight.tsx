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
import { openCompanion } from '@/components/companionController';
import { COMPANION_MECHANISMS, mechanismForType } from '@/soul/clinicalSpines';
import {
  type Vice,
  type ViceMode,
  makeVice,
  cleanDays,
  cleanHours,
  moneySaved,
  totalReclaimed,
  withUrgeResisted,
  withSlip,
} from '@/fight/model';

const EMPTY: Vice[] = [];

const haptic = (kind: 'light' | 'success' | 'warn' = 'light') => {
  if (process.env.EXPO_OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (kind === 'warn') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  else Haptics.selectionAsync().catch(() => {});
};

// Meet this specific vice with the companion — using the mechanism that fits its type.
function standWith(v: Vice) {
  const spine = COMPANION_MECHANISMS[mechanismForType(v.type)].spine;
  openCompanion({
    id: 'urge-' + v.id,
    emoji: '🌊',
    label: v.name,
    sub: 'stand with me',
    struggle: { name: `the urge to ${v.name.toLowerCase()}`, spine },
  });
}

function cleanReading(v: Vice): { big: string; unit: string } {
  const d = cleanDays(v);
  if (d >= 1) return { big: String(d), unit: d === 1 ? 'day clean' : 'days clean' };
  const h = cleanHours(v);
  return { big: String(h), unit: h === 1 ? 'hour clean' : 'hours clean' };
}

export default function Fight() {
  const [vices, setVices] = useStored<Vice[]>('fight.vices', EMPTY);
  const { readiness } = useReadiness();
  const [flash, setFlash] = useState<{ id: string; text: string } | null>(null);
  const [confirmSlip, setConfirmSlip] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const reclaimed = totalReclaimed(vices);
  const lowRecovery = !!readiness?.hasData && readiness.level === 'rest';

  const say = (id: string, text: string) => {
    setFlash({ id, text });
    setTimeout(() => setFlash((f) => (f?.id === id ? null : f)), 2600);
  };

  const resist = (v: Vice) => {
    haptic('success');
    setVices((cur) => withUrgeResisted(cur, v.id));
    say(v.id, "That's the rep that builds the man. 🌿");
  };

  const slip = (v: Vice) => {
    haptic('warn');
    setVices((cur) => withSlip(cur, v.id));
    setConfirmSlip(null);
    say(v.id, "A fresh start from now — your wins stay. Grace, every time.");
  };

  return (
    <Screen showWordmark={false} showOrb>
      <Pressable onPress={() => router.back()} style={{ marginBottom: space.s3 }}>
        <Text variant="callout" color={colors.tx3}>‹ Grow</Text>
      </Pressable>
      <Text variant="title">The Fight</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        What has a grip on you? Name it, and I'll stand in the gap with you. Every urge you outlast is
        a rep. A slip is feedback, never failure — we just start fresh.
      </Text>

      {/* The reclaimed-money thread — freedom, not just abstinence. */}
      {reclaimed > 0 && (
        <Card tone="flat" style={{ marginTop: space.s4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="subhead">Reclaimed by staying clean</Text>
          <Text style={{ fontFamily: fonts.monoMed, fontSize: 20, color: colors.go }}>${reclaimed}</Text>
        </Card>
      )}

      {/* THE MOAT — recovery informs the fight. */}
      {lowRecovery && (
        <Card style={{ marginTop: space.s4, borderColor: colors.puBd, borderWidth: StyleSheet.hairlineWidth }}>
          <Text variant="eyebrow" color={colors.pu}>From your recovery</Text>
          <Text variant="body" style={{ marginTop: space.s2 }}>
            You're low on recovery today. If the pull feels stronger, that's your body running on
            empty — not weakness. Go gentle, and lean on me.
          </Text>
        </Card>
      )}

      {vices.map((v) => {
        const r = cleanReading(v);
        const saved = moneySaved(v);
        return (
          <Card key={v.id} style={{ marginTop: space.s4 }}>
            <View style={styles.headRow}>
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 18, color: colors.tx, flex: 1 }}>{v.name}</Text>
              <View style={styles.chip}>
                <Text variant="micro" color={colors.tx2}>{v.mode === 'moderate' ? 'Moderating' : 'Quitting'}</Text>
              </View>
            </View>

            <View style={styles.streakRow}>
              <Text style={{ fontFamily: fonts.serif, fontSize: 44, color: colors.tx, lineHeight: 46 }}>{r.big}</Text>
              <Text variant="subhead" style={{ marginLeft: space.s2, marginBottom: 8 }}>{r.unit}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text variant="footnote">{v.wins} urge{v.wins === 1 ? '' : 's'} outlasted</Text>
              {saved > 0 && <Text variant="footnote" color={colors.go}>  ·  ${saved} reclaimed</Text>}
              {v.relapses > 0 && <Text variant="footnote">  ·  {v.relapses} fresh start{v.relapses === 1 ? '' : 's'}</Text>}
            </View>

            {flash?.id === v.id && (
              <Text variant="subhead" color={colors.gr} style={{ marginTop: space.s3 }}>{flash.text}</Text>
            )}

            <Button label="Stand with me now" onPress={() => standWith(v)} style={{ marginTop: space.s4 }} />

            {confirmSlip === v.id ? (
              <View style={styles.confirmRow}>
                <Text variant="footnote" style={{ flex: 1 }}>It's okay. Mark a fresh start from now?</Text>
                <Pressable onPress={() => slip(v)} style={[styles.softBtn, { borderColor: colors.reBd }]}>
                  <Text variant="subhead" color={colors.re}>Yes, fresh start</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmSlip(null)} style={styles.softBtn}>
                  <Text variant="subhead" color={colors.tx3}>Not now</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.actionRow}>
                <Pressable onPress={() => resist(v)} style={[styles.softBtn, styles.grow, { borderColor: colors.grBd }]}>
                  <Text variant="subhead" color={colors.gr}>I outlasted it</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmSlip(v.id)} style={[styles.softBtn, styles.grow]}>
                  <Text variant="subhead" color={colors.tx3}>I slipped</Text>
                </Pressable>
              </View>
            )}
          </Card>
        );
      })}

      {adding ? (
        <AddVice
          onSave={(v) => {
            haptic('success');
            setVices((cur) => [...cur, v]);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Pressable onPress={() => { haptic(); setAdding(true); }} style={styles.addRow}>
          <Text variant="callout" color={colors.go}>＋ Name something you're fighting</Text>
        </Pressable>
      )}

      {vices.length === 0 && !adding && (
        <Text variant="footnote" style={{ marginTop: space.s5, lineHeight: 20 }}>
          Nothing named yet. When you're ready, name one thing — not to shame it, but to stop facing
          it alone.
        </Text>
      )}
    </Screen>
  );
}

function AddVice({ onSave, onCancel }: { onSave: (v: Vice) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<ViceMode>('quit');
  const [cost, setCost] = useState('');

  const save = () => {
    if (!name.trim()) return;
    const amt = parseFloat(cost);
    onSave(
      makeVice({
        name,
        mode,
        cost: amt > 0 ? { amount: amt, per: 'week' } : null,
      }),
    );
  };

  return (
    <Card style={{ marginTop: space.s4 }}>
      <Text variant="eyebrow">Name the fight</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. late-night scrolling, drinking…"
        placeholderTextColor={colors.tx3}
        style={styles.input}
        autoFocus
      />

      <View style={styles.segment}>
        {(['quit', 'moderate'] as ViceMode[]).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.segItem, mode === m && styles.segOn]}>
            <Text variant="subhead" color={mode === m ? colors.tx : colors.tx3}>
              {m === 'quit' ? 'Quit it' : 'Moderate it'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text variant="footnote" style={{ marginTop: space.s4 }}>What it costs you a week (optional — turns into money reclaimed)</Text>
      <TextInput
        value={cost}
        onChangeText={setCost}
        placeholder="$ per week"
        placeholderTextColor={colors.tx3}
        keyboardType="numeric"
        style={styles.input}
      />

      <Button label="Start the fight" onPress={save} style={{ marginTop: space.s5 }} />
      <Pressable onPress={onCancel} style={{ alignItems: 'center', paddingVertical: space.s3, marginTop: space.s1 }}>
        <Text variant="subhead" color={colors.tx3}>Cancel</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  chip: { paddingHorizontal: space.s3, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.bg3, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd },
  streakRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: space.s3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: space.s2 },
  actionRow: { flexDirection: 'row', gap: space.s3, marginTop: space.s3 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2, marginTop: space.s3, flexWrap: 'wrap' },
  grow: { flex: 1 },
  softBtn: { paddingHorizontal: space.s4, paddingVertical: space.s3, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, alignItems: 'center', justifyContent: 'center' },
  addRow: { marginTop: space.s5, paddingVertical: space.s4, alignItems: 'center', borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.goBd, backgroundColor: colors.goBg },
  input: { marginTop: space.s3, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16 },
  segment: { flexDirection: 'row', gap: space.s2, marginTop: space.s4 },
  segItem: { flex: 1, paddingVertical: space.s3, alignItems: 'center', borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2 },
  segOn: { backgroundColor: colors.bg3, borderColor: colors.goBd },
});
