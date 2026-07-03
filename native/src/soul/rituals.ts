// Morning & evening rituals — behavioural design meets pastoral care. The morning intention becomes
// armour the companion can hand back to a person mid-temptation (that's the moat). The evening
// examen is grace-first: however the day went, it isn't the final word.
import { get, set } from '@/data/store';

export const todayKey = () => new Date().toISOString().slice(0, 10);

export type Morning = { date: string; gratitude: string; intention: string };
export type Reflection = { date: string; mood: string; win: string; honest: string };

export function getMornings(): Morning[] {
  return get<Morning[]>('soul.morning', []);
}
export function saveMorning(m: Morning): void {
  const rest = getMornings().filter((x) => x.date !== m.date);
  set('soul.morning', [m, ...rest].slice(0, 120));
  // The companion reads this in the moment (see companionContext). Store with the date so a stale
  // intention from a previous day is never handed back.
  set('soul.morningIntention', { text: m.intention, date: m.date });
}
export function todaysMorning(): Morning | null {
  return getMornings().find((m) => m.date === todayKey()) ?? null;
}

export function getReflections(): Reflection[] {
  return get<Reflection[]>('soul.reflections', []);
}
export function saveReflection(r: Reflection): void {
  const rest = getReflections().filter((x) => x.date !== r.date);
  set('soul.reflections', [r, ...rest].slice(0, 120));
}
export function todaysReflection(): Reflection | null {
  return getReflections().find((r) => r.date === todayKey()) ?? null;
}
