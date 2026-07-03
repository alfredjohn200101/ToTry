import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Button } from '@/design/Button';
import { Flourish } from '@/design/Flourish';
import { Icon } from '@/design/Icon';
import { colors, space, fonts, radius } from '@/design/tokens';
import { useStored } from '@/data/useStore';
import { useReadiness } from '@/health/useReadiness';
import { openCompanion } from '@/components/companionController';
import { COMPANION_MECHANISMS, mechanismForType } from '@/soul/clinicalSpines';
import {
  type Vice,
  type ViceMode,
  classifyVice,
  makeVice,
  cleanDays,
  cleanHours,
  moneySaved,
  totalReclaimed,
  withUrgeResisted,
  withSlip,
} from '@/fight/model';
import { viceInfo, streakWord } from '@/fight/viceKnowledge';

const EMPTY: Vice[] = [];

const haptic = (kind: 'light' | 'success' | 'warn' = 'light') => {
  if (process.env.EXPO_OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (kind === 'warn') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  else Haptics.selectionAsync().catch(() => {});
};

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

function ViceCard({
  v,
  flash,
  confirmSlip,
  onResist,
  onAskSlip,
  onConfirmSlip,
  onCancelSlip,
}: {
  v: Vice;
  flash?: string;
  confirmSlip: boolean;
  onResist: () => void;
  onAskSlip: () => void;
  onConfirmSlip: () => void;
  onCancelSlip: () => void;
}) {
  const info = viceInfo(v.type);
  const words = streakWord(v.mode);
  const d = cleanDays(v);
  const big = d >= 1 ? String(d) : String(cleanHours(v));
  const unit = d >= 1 ? (d === 1 ? `day ${words.clean}` : `days ${words.clean}`) : `${cleanHours(v) === 1 ? 'hour' : 'hours'} ${words.clean}`;
  const saved = moneySaved(v);
  const insight = v.mode === 'moderate' ? info.moderateNote : info.recovery;

  return (
    <Card style={{ marginTop: space.s4 }}>
      {/* header — accent medallion gives each vice its own identity */}
      <View style={styles.headRow}>
        <View style={[styles.medallion, { borderColor: info.accent + '55', backgroundColor: info.accent + '14' }]}>
          <Icon name={info.icon} size={20} color={info.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 18, color: colors.tx }}>{v.name}</Text>
          <View style={styles.subHead}>
            <Text variant="micro" color={info.accent}>{info.label.toUpperCase()}</Text>
            <Text variant="micro" color={colors.tx3}>
              {'  ·  '}
              {v.mode === 'moderate' ? (v.limit ? `keeping to ${v.limit}/wk` : 'keeping in check') : 'quitting'}
            </Text>
          </View>
        </View>
      </View>

      {/* streak — accent-colored serif number for per-type presence */}
      <View style={styles.streakRow}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 46, color: info.accent, lineHeight: 48 }}>{big}</Text>
        <Text variant="subhead" style={{ marginLeft: space.s3, marginBottom: 9 }}>{unit}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text variant="footnote">{v.wins} urge{v.wins === 1 ? '' : 's'} outlasted</Text>
        {saved > 0 && <Text variant="footnote" color={colors.go}>{'  ·  '}${saved} reclaimed</Text>}
        {v.relapses > 0 && <Text variant="footnote">{'  ·  '}{v.relapses} restart{v.relapses === 1 ? '' : 's'}</Text>}
      </View>

      {/* per-type recovery insight — never generic */}
      <View style={[styles.insight, { borderLeftColor: info.accent }]}>
        <Text variant="micro" color={info.accent} style={{ marginBottom: 4 }}>
          {v.mode === 'moderate' ? 'KEEPING IT IN CHECK' : `WHAT STAYING ${words.clean.toUpperCase()} IS DOING`}
        </Text>
        <Text variant="subhead" style={{ color: colors.tx2, lineHeight: 21 }}>{insight}</Text>
      </View>

      {flash && <Text variant="subhead" color={colors.gr} style={{ marginTop: space.s3 }}>{flash}</Text>}

      <Button label="Stand with me now" onPress={() => standWith(v)} style={{ marginTop: space.s4 }} />

      {confirmSlip ? (
        <View style={styles.confirmRow}>
          <Text variant="footnote" style={{ flex: 1 }}>
            {v.mode === 'moderate' ? 'It happens. Reset from now?' : "It's okay. Mark a fresh start from now?"}
          </Text>
          <Pressable onPress={onConfirmSlip} style={[styles.softBtn, { borderColor: colors.reBd }]}>
            <Text variant="subhead" color={colors.re}>Reset</Text>
          </Pressable>
          <Pressable onPress={onCancelSlip} style={styles.softBtn}>
            <Text variant="subhead" color={colors.tx3}>Not now</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <Pressable onPress={onResist} style={[styles.softBtn, styles.grow, { borderColor: colors.grBd }]}>
            <Text variant="subhead" color={colors.gr}>I outlasted it</Text>
          </Pressable>
          <Pressable onPress={onAskSlip} style={[styles.softBtn, styles.grow]}>
            <Text variant="subhead" color={colors.tx3}>{words.slip === 'over the line' ? 'Went over' : 'I slipped'}</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
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
    say(v.id, 'A fresh start from now — your wins stay. Grace, every time.');
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
        a rep. Some things are for quitting, some for keeping in check — and each one heals its own way.
      </Text>

      {reclaimed > 0 && (
        <Card tone="flat" style={{ marginTop: space.s4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="subhead">Reclaimed by staying clean</Text>
          <Text style={{ fontFamily: fonts.monoMed, fontSize: 20, color: colors.go }}>${reclaimed}</Text>
        </Card>
      )}

      {lowRecovery && (
        <Card style={{ marginTop: space.s4, borderColor: colors.puBd, borderWidth: StyleSheet.hairlineWidth }}>
          <Text variant="eyebrow" color={colors.pu}>From your recovery</Text>
          <Text variant="body" style={{ marginTop: space.s2 }}>
            You're low on recovery today. If the pull feels stronger, that's your body running on
            empty — not weakness. Go gentle, and lean on me.
          </Text>
        </Card>
      )}

      {vices.map((v) => (
        <ViceCard
          key={v.id}
          v={v}
          flash={flash?.id === v.id ? flash.text : undefined}
          confirmSlip={confirmSlip === v.id}
          onResist={() => resist(v)}
          onAskSlip={() => setConfirmSlip(v.id)}
          onConfirmSlip={() => slip(v)}
          onCancelSlip={() => setConfirmSlip(null)}
        />
      ))}

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
  const [modeTouched, setModeTouched] = useState(false);
  const [limit, setLimit] = useState('');
  const [cost, setCost] = useState('');

  // Classify as they type so the form speaks to THIS vice, and lean the goal sensibly (not always
  // "quit") until they choose for themselves.
  const info = name.trim() ? viceInfo(classifyVice(name)) : null;
  const onName = (t: string) => {
    setName(t);
    if (!modeTouched && t.trim()) {
      const lean = viceInfo(classifyVice(t)).lean;
      setMode(lean === 'moderate' ? 'moderate' : 'quit');
    }
  };

  const save = () => {
    if (!name.trim()) return;
    const amt = parseFloat(cost);
    const lim = parseInt(limit, 10);
    onSave(
      makeVice({
        name,
        mode,
        limit: mode === 'moderate' && lim > 0 ? lim : null,
        cost: amt > 0 ? { amount: amt, per: 'week' } : null,
      }),
    );
  };

  return (
    <Card style={{ marginTop: space.s4 }}>
      <Text variant="eyebrow">Name the fight</Text>
      <TextInput
        value={name}
        onChangeText={onName}
        placeholder="e.g. late-night scrolling, drinking…"
        placeholderTextColor={colors.tx3}
        style={styles.input}
        autoFocus
      />

      {info && (
        <View style={[styles.leanHint, { borderLeftColor: info.accent }]}>
          <Text variant="footnote" style={{ color: colors.tx2 }}>
            {info.lean === 'moderate'
              ? `Many keep ${info.label.toLowerCase()} in check rather than quit outright — your call.`
              : info.lean === 'quit'
                ? `Most find zero kinder than a limit here — but it's your call.`
                : `Either quitting or keeping it in check can work — choose what fits you.`}
          </Text>
        </View>
      )}

      <View style={styles.segment}>
        {(['quit', 'moderate'] as ViceMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => { setMode(m); setModeTouched(true); }}
            style={[styles.segItem, mode === m && styles.segOn]}
          >
            <Text variant="subhead" color={mode === m ? colors.tx : colors.tx3}>
              {m === 'quit' ? 'Quit it' : 'Keep in check'}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'moderate' && (
        <>
          <Text variant="footnote" style={{ marginTop: space.s4 }}>Times a week that's within your line (optional)</Text>
          <TextInput
            value={limit}
            onChangeText={setLimit}
            placeholder="e.g. 3"
            placeholderTextColor={colors.tx3}
            keyboardType="numeric"
            style={styles.input}
          />
        </>
      )}

      <Text variant="footnote" style={{ marginTop: space.s4 }}>What it costs you a week — only if it costs money (optional)</Text>
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
  medallion: { width: 44, height: 44, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  subHead: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  streakRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: space.s4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: space.s2 },
  insight: { marginTop: space.s4, paddingLeft: space.s4, borderLeftWidth: 2 },
  actionRow: { flexDirection: 'row', gap: space.s3, marginTop: space.s3 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2, marginTop: space.s3, flexWrap: 'wrap' },
  grow: { flex: 1 },
  softBtn: { paddingHorizontal: space.s4, paddingVertical: space.s3, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, alignItems: 'center', justifyContent: 'center' },
  addRow: { marginTop: space.s5, paddingVertical: space.s4, alignItems: 'center', borderRadius: radius.card, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.goBd, backgroundColor: colors.goBg },
  input: { marginTop: space.s3, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16 },
  leanHint: { marginTop: space.s3, paddingLeft: space.s3, borderLeftWidth: 2 },
  segment: { flexDirection: 'row', gap: space.s2, marginTop: space.s4 },
  segItem: { flex: 1, paddingVertical: space.s3, alignItems: 'center', borderRadius: radius.sm, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2 },
  segOn: { backgroundColor: colors.bg3, borderColor: colors.goBd },
});
