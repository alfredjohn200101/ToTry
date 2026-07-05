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
import { timelineState } from '@/fight/recoveryTimeline';
import {
  type Urge,
  type UrgePattern,
  URGE_FEELINGS,
  logUrge,
  recordOutcome,
  analyzeUrges,
  overridePlan,
} from '@/fight/urges';

const EMPTY: Vice[] = [];
const EMPTY_URGES: Urge[] = [];

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

// In-the-moment capture — how strong, what you're feeling, what set it off. Low-friction + skippable.
function UrgeCapture({ accent, onSave, onCancel }: { accent: string; onSave: (d: { intensity: number | null; feeling: string | null; trigger: string }) => void; onCancel: () => void }) {
  const [intensity, setIntensity] = useState<number | null>(null);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [trigger, setTrigger] = useState('');

  return (
    <View style={styles.capture}>
      <Text variant="micro" color={accent} style={{ marginBottom: space.s3 }}>LOG THIS MOMENT</Text>

      <Text variant="footnote" style={{ marginBottom: 6 }}>How strong is it?</Text>
      <View style={styles.dots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => { haptic(); setIntensity(n); }} style={[styles.dot, intensity != null && n <= intensity && { backgroundColor: accent + '33', borderColor: accent }]}>
            <Text variant="subhead" color={intensity != null && n <= intensity ? accent : colors.tx3}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <Text variant="footnote" style={{ marginTop: space.s4, marginBottom: 6 }}>What are you feeling?</Text>
      <View style={styles.chips}>
        {URGE_FEELINGS.map((f) => (
          <Pressable key={f} onPress={() => { haptic(); setFeeling(feeling === f ? null : f); }} style={[styles.chipBtn, feeling === f && { backgroundColor: colors.bl + '1E', borderColor: colors.bl }]}>
            <Text variant="subhead" color={feeling === f ? colors.bl : colors.tx3}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={trigger}
        onChangeText={setTrigger}
        placeholder="What set it off? (optional)"
        placeholderTextColor={colors.tx3}
        style={styles.input}
      />

      <View style={styles.actionRow}>
        <Pressable onPress={() => onSave({ intensity, feeling, trigger })} style={[styles.softBtn, styles.grow, { borderColor: accent + '66' }]}>
          <Text variant="subhead" color={accent}>Save the moment</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.softBtn}>
          <Text variant="subhead" color={colors.tx3}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ViceCard({
  v,
  flash,
  confirmSlip,
  onResist,
  onAskSlip,
  onConfirmSlip,
  onCancelSlip,
  onLogUrge,
}: {
  v: Vice;
  flash?: string;
  confirmSlip: boolean;
  onResist: () => void;
  onAskSlip: () => void;
  onConfirmSlip: () => void;
  onCancelSlip: () => void;
  onLogUrge: (d: { intensity: number | null; feeling: string | null; trigger: string }) => void;
}) {
  const info = viceInfo(v.type);
  const words = streakWord(v.mode);
  const [logging, setLogging] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const d = cleanDays(v);
  const ts = timelineState(v.type, d);
  const big = d >= 1 ? String(d) : String(cleanHours(v));
  const unit = d >= 1 ? (d === 1 ? `day ${words.clean}` : `days ${words.clean}`) : `${cleanHours(v) === 1 ? 'hour' : 'hours'} ${words.clean}`;
  const saved = moneySaved(v);
  const insight = v.mode === 'moderate' ? info.moderateNote : info.recovery;

  return (
    <Card style={{ marginTop: space.s4 }}>
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

      <View style={styles.streakRow}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 46, color: info.accent, lineHeight: 48 }}>{big}</Text>
        <Text variant="subhead" style={{ marginLeft: space.s3, marginBottom: 9 }}>{unit}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text variant="footnote">{v.wins} urge{v.wins === 1 ? '' : 's'} outlasted</Text>
        {saved > 0 && <Text variant="footnote" color={colors.go}>{'  ·  '}${saved} reclaimed</Text>}
        {v.relapses > 0 && <Text variant="footnote">{'  ·  '}{v.relapses} restart{v.relapses === 1 ? '' : 's'}</Text>}
      </View>

      <View style={[styles.insight, { borderLeftColor: info.accent }]}>
        <Text variant="micro" color={info.accent} style={{ marginBottom: 4 }}>
          {v.mode === 'moderate' ? 'KEEPING IT IN CHECK' : `WHAT STAYING ${words.clean.toUpperCase()} IS DOING`}
        </Text>
        <Text variant="subhead" style={{ color: colors.tx2, lineHeight: 21 }}>{insight}</Text>
      </View>

      {/* What your streak is earning — the recovery timeline (code, not AI) */}
      <Pressable onPress={() => setShowTimeline((s) => !s)} style={{ marginTop: space.s4 }}>
        <Text variant="micro" color={info.accent}>{showTimeline ? '▾' : '▸'} WHAT {d >= 1 ? `${d} DAY${d === 1 ? '' : 'S'}` : 'THIS'} IS EARNING YOU</Text>
        {!showTimeline && ts.latest ? <Text variant="subhead" style={{ marginTop: space.s2, color: colors.tx2, lineHeight: 21 }}>{ts.latest.body}</Text> : null}
        {!showTimeline && !ts.latest && ts.next ? <Text variant="subhead" style={{ marginTop: space.s2, color: colors.tx2, lineHeight: 21 }}>Day {ts.next.day}: {ts.next.body}</Text> : null}
      </Pressable>
      {showTimeline && (
        <View style={{ marginTop: space.s3 }}>
          {ts.milestones.map((m) => {
            const reached = d >= m.day;
            return (
              <View key={m.day} style={styles.mileRow}>
                <View style={[styles.mileDot, { borderColor: info.accent, backgroundColor: reached ? info.accent : 'transparent' }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="micro" color={reached ? info.accent : colors.tx3}>DAY {m.day}{reached ? ' · reached' : ''}</Text>
                  <Text variant="subhead" style={{ color: reached ? colors.tx2 : colors.tx3, lineHeight: 20, marginTop: 1 }}>{m.body}</Text>
                  <Text variant="footnote" style={{ marginTop: 2, fontStyle: 'italic' }}>{m.soul}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

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

      {logging ? (
        <UrgeCapture
          accent={info.accent}
          onSave={(dta) => { onLogUrge(dta); setLogging(false); }}
          onCancel={() => setLogging(false)}
        />
      ) : (
        <Pressable onPress={() => { haptic(); setLogging(true); }} style={{ alignSelf: 'center', paddingVertical: space.s3, marginTop: space.s2 }}>
          <Text variant="footnote" color={colors.tx3}>＋ log an urge as it happens</Text>
        </Pressable>
      )}
    </Card>
  );
}

// The mirror — the scattered urges turned into self-knowledge + a way out. Grace-first: a map, not a verdict.
function MirrorCard({ p, accent }: { p: UrgePattern; accent: string }) {
  const lead: string[] = [];
  if (p.riskWindow) lead.push(`Your hardest window is ${p.riskWindow}`);
  if (p.topFeeling) lead.push(`usually when you're feeling ${p.topFeeling.toLowerCase()}`);
  let leadLine = lead.join(', ');
  if (p.riskDay) leadLine += leadLine ? `, and ${p.riskDay}s hit hardest` : `${p.riskDay}s hit hardest`;
  leadLine = leadLine ? leadLine + '.' : 'A picture is starting to form from what you log.';

  const trendLine =
    p.trend === 'improving'
      ? "And you're outlasting more than you used to — that's real ground gained."
      : p.trend === 'slipping'
        ? "You've been slipping a little more lately — no shame in it, let's just get ahead of it."
        : null;

  const plan = overridePlan(p);

  return (
    <Card style={{ marginTop: space.s3, borderColor: accent + '40', borderWidth: StyleSheet.hairlineWidth }}>
      <Text variant="eyebrow" color={accent}>What I'm seeing</Text>
      <Text variant="body" style={{ marginTop: space.s2 }}>{leadLine}</Text>
      {trendLine && <Text variant="subhead" style={{ marginTop: space.s2, color: colors.tx2 }}>{trendLine}</Text>}

      <View style={styles.statRow}>
        {p.winRate != null && <Stat label="outlasted" value={`${p.winRate}%`} accent={accent} />}
        {p.topTrigger && <Stat label="top cue" value={p.topTrigger} accent={accent} />}
        {p.avgIntensity != null && <Stat label="avg pull" value={`${p.avgIntensity}/5`} accent={accent} />}
      </View>

      <View style={[styles.insight, { borderLeftColor: accent, marginTop: space.s4 }]}>
        <Text variant="micro" color={accent} style={{ marginBottom: 6 }}>YOUR WAY THROUGH IT</Text>
        {plan.map((para, i) => (
          <Text key={i} variant="subhead" style={{ color: colors.tx2, lineHeight: 21, marginTop: i ? space.s3 : 0 }}>{para}</Text>
        ))}
      </View>
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ fontFamily: fonts.monoMed, fontSize: 15, color: accent }}>{value}</Text>
      <Text variant="micro" color={colors.tx3} style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function Fight() {
  const [vices, setVices] = useStored<Vice[]>('fight.vices', EMPTY);
  const [urges] = useStored<Urge[]>('fight.urges', EMPTY_URGES);
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
    recordOutcome(v.id, 'outlasted'); // feeds the mirror from ordinary use
    say(v.id, "That's the rep that builds the man. 🌿");
  };

  const slip = (v: Vice) => {
    haptic('warn');
    setVices((cur) => withSlip(cur, v.id));
    recordOutcome(v.id, 'slipped');
    setConfirmSlip(null);
    say(v.id, 'A fresh start from now — your wins stay. Grace, every time.');
  };

  const doLogUrge = (v: Vice, dta: { intensity: number | null; feeling: string | null; trigger: string }) => {
    haptic('success');
    logUrge({ viceId: v.id, intensity: dta.intensity, feeling: dta.feeling, trigger: dta.trigger, outcome: 'open' });
    say(v.id, "Logged. The more you notice, the more clearly I can help you get ahead of it.");
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

      {vices.map((v) => {
        const pattern = analyzeUrges(urges.filter((u) => u.viceId === v.id));
        return (
          <View key={v.id}>
            <ViceCard
              v={v}
              flash={flash?.id === v.id ? flash.text : undefined}
              confirmSlip={confirmSlip === v.id}
              onResist={() => resist(v)}
              onAskSlip={() => setConfirmSlip(v.id)}
              onConfirmSlip={() => slip(v)}
              onCancelSlip={() => setConfirmSlip(null)}
              onLogUrge={(dta) => doLogUrge(v, dta)}
            />
            {pattern && <MirrorCard p={pattern} accent={viceInfo(v.type).accent} />}
          </View>
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
  const [modeTouched, setModeTouched] = useState(false);
  const [limit, setLimit] = useState('');
  const [cost, setCost] = useState('');

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
  // craving capture
  capture: { marginTop: space.s4, paddingTop: space.s4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.bd },
  dots: { flexDirection: 'row', gap: space.s2 },
  dot: { flex: 1, height: 40, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s2 },
  chipBtn: { paddingHorizontal: space.s3, paddingVertical: space.s2, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2 },
  // mirror
  statRow: { flexDirection: 'row', gap: space.s5, marginTop: space.s4 },
  stat: { alignItems: 'flex-start' },
  // recovery timeline
  mileRow: { flexDirection: 'row', gap: space.s3, marginTop: space.s3 },
  mileDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, marginTop: 3 },
});
