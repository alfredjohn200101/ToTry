import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Button } from '@/design/Button';
import { Flourish } from '@/design/Flourish';
import { colors, space, fonts, radius } from '@/design/tokens';
import { useStored } from '@/data/useStore';
import { type FuelPlan, type FuelMeal, DIET_OPTIONS, DISLIKE_OPTIONS, generateFuelPlan } from '@/nourish/fuelPlan';

const EMPTY_DIET: string[] = [];
const haptic = (k: 'light' | 'success' = 'light') => {
  if (process.env.EXPO_OS === 'web') return;
  if (k === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.selectionAsync().catch(() => {});
};

function MealCard({ m, isPre }: { m: FuelMeal; isPre: boolean }) {
  return (
    <Card tone="flat" style={{ marginTop: space.s3, borderColor: isPre ? colors.goBd : colors.hairline, borderWidth: StyleSheet.hairlineWidth }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, color: colors.tx, flex: 1 }}>{m.name}</Text>
        <Text variant="micro" color={isPre ? colors.go : colors.tx3}>{isPre ? '⚡ ' : ''}{m.when}</Text>
      </View>
      <Text variant="footnote" style={{ marginTop: 3 }}>
        {m.kcal} kcal · {m.protein}g protein{m.carbs != null ? ` · ${m.carbs}g carbs` : ''}
      </Text>
      {m.note ? <Text variant="footnote" style={{ marginTop: space.s2, color: colors.tx2, lineHeight: 19 }}>{m.note}</Text> : null}
    </Card>
  );
}

export default function Fuel() {
  const [plan, setPlan] = useStored<FuelPlan | null>('nourish.fuelPlan', null);
  const [budget, setBudget] = useStored<string>('nourish.fuelBudget', '');
  const [diet, setDiet] = useStored<string[]>('nourish.fuelDiet', EMPTY_DIET);
  const [dislikes, setDislikes] = useStored<string[]>('nourish.fuelDislikes', EMPTY_DIET);
  const [avoid, setAvoid] = useStored<string>('nourish.fuelAvoid', '');
  const [meals, setMeals] = useStored<number>('nourish.fuelMeals', 3);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const toggleDiet = (d: string) => { haptic(); setDiet((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d])); };
  const toggleDislike = (d: string) => { haptic(); setDislikes((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d])); };

  const generate = async () => {
    if (busy) return;
    haptic();
    setBusy(true);
    setErr('');
    const p = await generateFuelPlan({ budget, diet, dislikes, avoid, mealsPerDay: meals });
    if (p) { setPlan(p); haptic('success'); } else setErr("Couldn't build a plan right now — check your connection and try again.");
    setBusy(false);
  };

  const isPre = (m: FuelMeal) => !!plan?.preWorkout && plan.preWorkout.toLowerCase().includes(m.name.toLowerCase().slice(0, 12));

  return (
    <Screen showWordmark={false} showOrb>
      <Pressable onPress={() => router.back()} style={{ marginBottom: space.s3 }}>
        <Text variant="callout" color={colors.tx3}>‹ Nourish</Text>
      </Pressable>
      <Text variant="title">Fuel plan</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        A day of real food planned around you — your targets, your budget, what you will and won't eat,
        and your actual training time, so the carbs land when your body can use them.
      </Text>

      <Card style={{ marginTop: space.s5 }}>
        <Text variant="eyebrow">Weekly food budget (optional)</Text>
        <TextInput value={budget} onChangeText={setBudget} placeholder="e.g. $120" placeholderTextColor={colors.tx3} style={styles.input} />

        <Text variant="eyebrow" style={{ marginTop: space.s5 }}>Anything you don't eat?</Text>
        <View style={styles.chips}>
          {DIET_OPTIONS.map((d) => (
            <Pressable key={d} onPress={() => toggleDiet(d)} style={[styles.chip, diet.includes(d) && styles.chipOn]}>
              <Text variant="subhead" color={diet.includes(d) ? colors.tx : colors.tx3}>{d}</Text>
            </Pressable>
          ))}
        </View>

        <Text variant="eyebrow" style={{ marginTop: space.s5 }}>Foods you'd rather avoid</Text>
        <Text variant="footnote" style={{ marginTop: space.s1 }}>Not a diet — just things you don't like. I'll leave them out.</Text>
        <View style={styles.chips}>
          {DISLIKE_OPTIONS.map((d) => (
            <Pressable key={d} onPress={() => toggleDislike(d)} style={[styles.chip, dislikes.includes(d) && styles.chipOn]}>
              <Text variant="subhead" color={dislikes.includes(d) ? colors.tx : colors.tx3}>{d}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={avoid}
          onChangeText={setAvoid}
          placeholder="anything else? e.g. cottage cheese, very sweet things, cheap tuna"
          placeholderTextColor={colors.tx3}
          style={styles.input}
        />

        <Text variant="eyebrow" style={{ marginTop: space.s5 }}>Meals a day</Text>
        <View style={styles.seg}>
          {[3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => { haptic(); setMeals(n); }} style={[styles.segItem, meals === n && styles.segOn]}>
              <Text variant="subhead" color={meals === n ? colors.tx : colors.tx3}>{n}</Text>
            </Pressable>
          ))}
        </View>

        {busy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s3, marginTop: space.s5 }}>
            <ActivityIndicator color={colors.go} />
            <Text variant="subhead">Building your plan…</Text>
          </View>
        ) : (
          <Button label={plan ? 'Rebuild the plan' : 'Build my fuel plan'} onPress={generate} style={{ marginTop: space.s5 }} />
        )}
        {err ? <Text variant="footnote" color={colors.re} style={{ marginTop: space.s3 }}>{err}</Text> : null}
      </Card>

      {plan && (
        <>
          {plan.why ? (
            <View style={[styles.why, { borderLeftColor: colors.go }]}>
              <Text variant="micro" color={colors.go} style={{ marginBottom: 4 }}>WHY THIS PLAN</Text>
              <Text variant="subhead" style={{ color: colors.tx2, lineHeight: 21 }}>{plan.why}</Text>
            </View>
          ) : null}

          <Text variant="eyebrow" style={{ marginTop: space.s6 }}>The day</Text>
          {plan.meals.map((m, i) => <MealCard key={i} m={m} isPre={isPre(m)} />)}

          {plan.shopping.length > 0 && (
            <>
              <Text variant="eyebrow" style={{ marginTop: space.s6 }}>Shopping list · {plan.shopping.length}</Text>
              <Card tone="flat" style={{ marginTop: space.s3 }}>
                {plan.shopping.map((s, i) => (
                  <View key={i} style={[styles.shopRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.bd }]}>
                    <Text variant="body" style={{ flex: 1 }}>{s.item}</Text>
                    {s.approxCost ? <Text style={{ fontFamily: fonts.monoMed, fontSize: 13, color: colors.tx3 }}>{s.approxCost}</Text> : null}
                  </View>
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { marginTop: space.s3, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s2, marginTop: space.s3 },
  chip: { paddingHorizontal: space.s3, paddingVertical: space.s2, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2 },
  chipOn: { backgroundColor: colors.bg3, borderColor: colors.goBd },
  seg: { flexDirection: 'row', gap: space.s2, marginTop: space.s3 },
  segItem: { flex: 1, paddingVertical: space.s3, alignItems: 'center', borderRadius: radius.sm, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2 },
  segOn: { backgroundColor: colors.bg3, borderColor: colors.goBd },
  why: { marginTop: space.s5, paddingLeft: space.s4, borderLeftWidth: 2 },
  shopRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.s3 },
});
