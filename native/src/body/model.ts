// Body — weight over time, honestly. A trend line, not a daily verdict (weight bounces; the line is
// what matters). Pairs with Recovery and feeds Nourish's picture of the person. Grace-first: no goal
// is required, and the framing is direction, never shame.
import { get, set } from '@/data/store';

const todayKey = () => new Date().toISOString().slice(0, 10);
export type WeightEntry = { id: string; date: string; kg: number };

const KEY = 'body.weights';
const GKEY = 'body.weightGoal';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Ascending by date (oldest first) for charting.
export function getWeights(): WeightEntry[] {
  return get<WeightEntry[]>(KEY, []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
}
export function logWeight(kg: number, date = todayKey()): void {
  const rest = get<WeightEntry[]>(KEY, []).filter((w) => w.date !== date); // one per day
  set(KEY, [...rest, { id: uid(), date, kg: Math.round(kg * 10) / 10 }]);
}
export function removeWeight(id: string): void {
  set(KEY, get<WeightEntry[]>(KEY, []).filter((w) => w.id !== id));
}

export function getGoal(): number | null {
  return get<number | null>(GKEY, null);
}
export function saveGoal(kg: number | null): void {
  set(GKEY, kg);
}

export const latest = (ws: WeightEntry[]): WeightEntry | null => (ws.length ? ws[ws.length - 1] : null);

// Change from the entry nearest `days` ago to the latest — the trend, not the daily wobble.
export function changeOver(ws: WeightEntry[], days: number): number | null {
  if (ws.length < 2) return null;
  const last = ws[ws.length - 1];
  const cutoff = Date.parse(last.date) - days * 86400000;
  // nearest entry at or before the cutoff, else the oldest we have
  let ref = ws[0];
  for (const w of ws) {
    if (Date.parse(w.date) <= cutoff) ref = w;
  }
  return Math.round((last.kg - ref.kg) * 10) / 10;
}
