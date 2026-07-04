// Adaptive TDEE — MacroFactor's paid core, done in pure code (no AI). It learns a person's REAL
// maintenance calories from the only honest source: their weight trend versus what they actually
// ate. maintenance = average intake − the daily energy balance implied by the weight change.
// Deterministic, offline, free. This is a Body↔Nourish thread: neither screen alone can see it.
import { get } from '@/data/store';
import { getWeights } from '@/body/model';
import { getLog } from '@/nourish/model';

const KCAL_PER_KG = 7700; // ~energy in a kg of body mass

export type Adaptive = {
  tdee: number; // learned maintenance kcal/day
  days: number; // span analysed
  loggedDays: number; // days with food logged in that span
  avgIntake: number; // average logged kcal/day
  weightChangeKg: number; // over the span
  suggested: number; // suggested daily target given the goal
  direction: 'lose' | 'maintain' | 'gain';
};

export function computeAdaptiveTDEE(): Adaptive | null {
  const weights = getWeights(); // ascending by date
  if (weights.length < 2) return null;

  const last = weights[weights.length - 1];
  const windowStart = Date.parse(last.date) - 28 * 86400000;
  const ws = weights.filter((w) => Date.parse(w.date) >= windowStart);
  if (ws.length < 2) return null;

  const first = ws[0];
  const days = Math.round((Date.parse(last.date) - Date.parse(first.date)) / 86400000);
  if (days < 7) return null; // need at least a week to say anything honest

  // Average daily intake across the days that were actually logged in the window.
  const startMs = Date.parse(first.date);
  const byDay: Record<string, number> = {};
  getLog().forEach((f) => {
    if (Date.parse(f.date) >= startMs) byDay[f.date] = (byDay[f.date] || 0) + f.cal;
  });
  const loggedDays = Object.keys(byDay).length;
  if (loggedDays < 5) return null; // not enough intake data to be honest yet

  const avgIntake = Math.round(Object.values(byDay).reduce((a, b) => a + b, 0) / loggedDays);
  const weightChangeKg = Math.round((last.kg - first.kg) * 100) / 100;
  const dailyBalance = (weightChangeKg * KCAL_PER_KG) / days; // + if gaining, − if losing
  const tdee = Math.round(avgIntake - dailyBalance);

  // Suggested target from the goal direction (Body). ED-safe floor, rounded to a tidy number.
  const goal = get<number | null>('body.weightGoal', null);
  let direction: Adaptive['direction'] = 'maintain';
  let suggested = tdee;
  if (goal != null) {
    if (goal < last.kg - 0.3) {
      direction = 'lose';
      suggested = tdee - 400; // ~0.35 kg/wk, gentle
    } else if (goal > last.kg + 0.3) {
      direction = 'gain';
      suggested = tdee + 300;
    }
  }
  suggested = Math.max(1500, Math.round(suggested / 10) * 10);

  return { tdee, days, loggedDays, avgIntake, weightChangeKg, suggested, direction };
}
