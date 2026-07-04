// Nourish — a clean, honest food log with macro targets and water. The everyday domain. Lean by
// design (the PWA holds the full adaptive-TDEE + fuel-plan engine); this is the fast daily logger,
// food-first and never shaming. Sex-aware targets come once the About-you setting lands natively.
import { get, set } from '@/data/store';

export const todayKey = () => new Date().toISOString().slice(0, 10);

export type Food = { id: string; date: string; name: string; cal: number; protein: number };
export type Targets = { cal: number; protein: number };
export type Water = { date: string; ml: number };

const DEFAULT_TARGETS: Targets = { cal: 2200, protein: 150 };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function getLog(): Food[] {
  return get<Food[]>('nourish.log', []);
}
export function todaysFood(): Food[] {
  const t = todayKey();
  return getLog().filter((f) => f.date === t);
}
export function addFood(input: { name: string; cal: number; protein: number }): void {
  const f: Food = { id: uid(), date: todayKey(), name: input.name.trim(), cal: Math.max(0, Math.round(input.cal)), protein: Math.max(0, Math.round(input.protein)) };
  set('nourish.log', [f, ...getLog()].slice(0, 1000));
}
export function removeFood(id: string): void {
  set('nourish.log', getLog().filter((f) => f.id !== id));
}

export function getTargets(): Targets {
  const stored = get<Targets | null>('nourish.targets', null);
  if (stored) return stored;
  // No explicit target yet → a sex-aware default (About you). Read the raw key to avoid a cycle.
  const sex = get<'male' | 'female' | null>('user.sex', null);
  if (sex === 'male') return { cal: 2500, protein: 160 };
  if (sex === 'female') return { cal: 2000, protein: 120 };
  return DEFAULT_TARGETS;
}
export function saveTargets(t: Targets): void {
  set('nourish.targets', { cal: Math.max(0, Math.round(t.cal)), protein: Math.max(0, Math.round(t.protein)) });
}

export function todaysWater(): number {
  const w = get<Water | null>('nourish.water', null);
  return w && w.date === todayKey() ? w.ml : 0;
}
export function addWater(ml: number): void {
  set('nourish.water', { date: todayKey(), ml: Math.max(0, todaysWater() + ml) });
}

export const sum = (foods: Food[]) => foods.reduce((a, f) => ({ cal: a.cal + f.cal, protein: a.protein + f.protein }), { cal: 0, protein: 0 });
export const pct = (part: number, whole: number) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);
