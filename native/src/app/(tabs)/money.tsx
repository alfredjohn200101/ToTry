import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Button } from '@/design/Button';
import { Flourish } from '@/design/Flourish';
import { colors, space, fonts, radius } from '@/design/tokens';
import { useStored } from '@/data/useStore';
import { useLifeState } from '@/state/lifeState';
import {
  type SavingsGoal,
  type Debt,
  makeGoal,
  addToGoal,
  removeGoal,
  makeDebt,
  payDebt,
  removeDebt,
  totalSaved,
  totalDebt,
  totalPaidOff,
  pct,
} from '@/money/model';

const EMPTY_G: SavingsGoal[] = [];
const EMPTY_D: Debt[] = [];
const haptic = () => { if (process.env.EXPO_OS !== 'web') Haptics.selectionAsync().catch(() => {}); };
const money = (n: number) => '$' + Math.round(n).toLocaleString();

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

function InlineAmount({ label, accent, onSubmit, onCancel }: { label: string; accent: string; onSubmit: (n: number) => void; onCancel: () => void }) {
  const [v, setV] = useState('');
  return (
    <View style={styles.amountRow}>
      <TextInput value={v} onChangeText={setV} keyboardType="numeric" placeholder="$ amount" placeholderTextColor={colors.tx3} style={styles.amountInput} autoFocus />
      <Pressable onPress={() => { const n = parseFloat(v); if (n > 0) { haptic(); onSubmit(n); } }} style={[styles.smallBtn, { borderColor: accent + '66' }]}>
        <Text variant="subhead" color={accent}>{label}</Text>
      </Pressable>
      <Pressable onPress={onCancel} style={styles.smallBtn}><Text variant="subhead" color={colors.tx3}>×</Text></Pressable>
    </View>
  );
}

function AddThing({ nameHint, numHint, cta, onSave, onCancel }: { nameHint: string; numHint: string; cta: string; onSave: (name: string, num: number) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [num, setNum] = useState('');
  return (
    <Card style={{ marginTop: space.s3 }}>
      <TextInput value={name} onChangeText={setName} placeholder={nameHint} placeholderTextColor={colors.tx3} style={styles.input} autoFocus />
      <TextInput value={num} onChangeText={setNum} keyboardType="numeric" placeholder={numHint} placeholderTextColor={colors.tx3} style={styles.input} />
      <Button label={cta} onPress={() => { const n = parseFloat(num); if (name.trim() && n > 0) { haptic(); onSave(name, n); } }} style={{ marginTop: space.s4 }} />
      <Pressable onPress={onCancel} style={{ alignItems: 'center', paddingVertical: space.s3 }}><Text variant="subhead" color={colors.tx3}>Cancel</Text></Pressable>
    </Card>
  );
}

export default function Money() {
  const [goals, setGoals] = useStored<SavingsGoal[]>('money.goals', EMPTY_G);
  const [debts, setDebts] = useStored<Debt[]>('money.debts', EMPTY_D);
  const life = useLifeState();
  const reclaimed = life.fight.reclaimed;

  const [addGoal, setAddGoal] = useState(false);
  const [addDebt, setAddDebt] = useState(false);
  const [active, setActive] = useState<string | null>(null); // id of the row with an open amount input

  const paidOff = totalPaidOff(debts);
  const owed = totalDebt(debts);

  return (
    <Screen>
      <Text variant="title">Stewardship</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        Money is freedom, not just numbers. Every dollar reclaimed from a vice and every debt paid
        down is a chain off your shoulders. This leads with what you're winning back.
      </Text>

      {/* The moat — reclaimed from the Fight becomes a reason the streak matters. */}
      <Card tone="gold" style={{ marginTop: space.s4, alignItems: 'center', paddingVertical: space.s6 }}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 40, color: colors.go }}>{money(reclaimed)}</Text>
        <Text variant="eyebrow" style={{ marginTop: space.s2 }}>Reclaimed from your fights</Text>
        <Text variant="footnote" style={{ textAlign: 'center', marginTop: space.s2, lineHeight: 19 }}>
          {reclaimed > 0
            ? 'Freedom you’re buying back — the real reason the streak matters at 11pm.'
            : 'As you stay clean from a vice that costs money, what it used to take comes back here.'}
        </Text>
      </Card>

      {/* Savings goals */}
      <View style={styles.sectionHead}>
        <Text variant="eyebrow">Saving toward</Text>
        {totalSaved(goals) > 0 && <Text variant="footnote" color={colors.gr}>{money(totalSaved(goals))} saved</Text>}
      </View>
      {goals.map((g) => (
        <Card key={g.id} tone="flat" style={{ marginTop: space.s3 }}>
          <View style={styles.rowTop}>
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: colors.tx, flex: 1 }}>{g.name}</Text>
            <Text style={{ fontFamily: fonts.monoMed, fontSize: 14, color: colors.gr }}>{money(g.saved)}<Text style={{ color: colors.tx3 }}> / {money(g.target)}</Text></Text>
          </View>
          <Bar value={pct(g.saved, g.target)} color={colors.gr} />
          {active === g.id ? (
            <InlineAmount label="Add" accent={colors.gr} onSubmit={(n) => { setGoals((c) => addToGoal(c, g.id, n)); setActive(null); }} onCancel={() => setActive(null)} />
          ) : (
            <View style={styles.rowActions}>
              <Pressable onPress={() => { haptic(); setActive(g.id); }} style={styles.smallBtn}><Text variant="subhead" color={colors.gr}>＋ Add</Text></Pressable>
              <Pressable onPress={() => { haptic(); setGoals((c) => removeGoal(c, g.id)); }} style={styles.smallBtn}><Text variant="subhead" color={colors.tx3}>Remove</Text></Pressable>
            </View>
          )}
        </Card>
      ))}
      {addGoal ? (
        <AddThing nameHint="What are you saving for?" numHint="Target amount" cta="Set the goal" onSave={(n, t) => { setGoals((c) => [...c, makeGoal(n, t)]); setAddGoal(false); }} onCancel={() => setAddGoal(false)} />
      ) : (
        <Pressable onPress={() => { haptic(); setAddGoal(true); }} style={styles.addRow}><Text variant="callout" color={colors.go}>＋ A goal to save toward</Text></Pressable>
      )}

      {/* Debt payoff */}
      <View style={[styles.sectionHead, { marginTop: space.s7 }]}>
        <Text variant="eyebrow">Getting free of</Text>
        {paidOff > 0 && <Text variant="footnote" color={colors.gr}>{money(paidOff)} paid off</Text>}
      </View>
      {debts.map((d) => (
        <Card key={d.id} tone="flat" style={{ marginTop: space.s3 }}>
          <View style={styles.rowTop}>
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: colors.tx, flex: 1 }}>{d.name}</Text>
            <Text style={{ fontFamily: fonts.monoMed, fontSize: 14, color: d.balance > 0 ? colors.re : colors.gr }}>{d.balance > 0 ? money(d.balance) + ' left' : 'Paid off 🎉'}</Text>
          </View>
          <Bar value={pct(d.start - d.balance, d.start)} color={colors.gr} />
          {active === d.id ? (
            <InlineAmount label="Pay" accent={colors.gr} onSubmit={(n) => { setDebts((c) => payDebt(c, d.id, n)); setActive(null); }} onCancel={() => setActive(null)} />
          ) : (
            <View style={styles.rowActions}>
              {d.balance > 0 && <Pressable onPress={() => { haptic(); setActive(d.id); }} style={styles.smallBtn}><Text variant="subhead" color={colors.gr}>Log a payment</Text></Pressable>}
              <Pressable onPress={() => { haptic(); setDebts((c) => removeDebt(c, d.id)); }} style={styles.smallBtn}><Text variant="subhead" color={colors.tx3}>Remove</Text></Pressable>
            </View>
          )}
        </Card>
      ))}
      {addDebt ? (
        <AddThing nameHint="What do you owe on?" numHint="Amount owed" cta="Track it" onSave={(n, b) => { setDebts((c) => [...c, makeDebt(n, b)]); setAddDebt(false); }} onCancel={() => setAddDebt(false)} />
      ) : (
        <Pressable onPress={() => { haptic(); setAddDebt(true); }} style={styles.addRow}><Text variant="callout" color={colors.go}>＋ A debt to get free of</Text></Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: colors.bg4, marginTop: space.s3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  rowActions: { flexDirection: 'row', gap: space.s3, marginTop: space.s3 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2, marginTop: space.s3 },
  amountInput: { flex: 1, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: radius.sm, paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16 },
  smallBtn: { paddingHorizontal: space.s4, paddingVertical: space.s3, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, alignItems: 'center', justifyContent: 'center' },
  input: { marginTop: space.s3, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16 },
  addRow: { marginTop: space.s3, paddingVertical: space.s4, alignItems: 'center', borderRadius: radius.card, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.goBd, backgroundColor: colors.goBg },
});
