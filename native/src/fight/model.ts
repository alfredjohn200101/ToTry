// The Fight — vices, clean streaks, and the reclaimed-money pipe. Ported from the PWA's soul:
// a vice carries a `startDate` (the clean-since anchor a slip resets), `wins` (urges outlasted —
// reps, not a scoreboard), a relapse count, and an optional cost that becomes money reclaimed by
// staying clean. Grace over shame: a slip is recorded as feedback and a fresh start, never a zeroing.
import { get, set } from '@/data/store';

// The type drives the right in-the-moment mechanism (see clinicalSpines.mechanismForType).
export type ViceType =
  | 'porn'
  | 'scrolling'
  | 'nicotine'
  | 'alcohol'
  | 'gambling'
  | 'food'
  | 'overthinking'
  | 'anxiety'
  | 'anger'
  | 'other';

export type ViceMode = 'quit' | 'moderate';
export type ViceCost = { amount: number; per: 'day' | 'week' | 'use'; usesPerWeek?: number };
export type FightEvent = { ts: string; kind: 'start' | 'win' | 'slip' };

export type Vice = {
  id: string;
  name: string;
  type: ViceType;
  mode: ViceMode;
  limit?: number | null; // moderation only — times/week that's within the line
  trigger?: string;
  startDate: string; // ISO — clean-since anchor; a slip resets it to now
  wins: number; // urges outlasted
  relapses: number;
  lastWin?: string | null;
  lastSlip?: string | null;
  cost?: ViceCost | null;
  history: FightEvent[];
};

const KEY = 'fight.vices';

export function getVices(): Vice[] {
  return get<Vice[]>(KEY, []);
}
export function saveVices(v: Vice[]): void {
  set(KEY, v);
}

// Keyword classifier → the clinical-spine type, so the companion meets each vice with its own move.
export function classifyVice(nameRaw: string): ViceType {
  const n = nameRaw.toLowerCase();
  if (/porn|lust|masturbat|nsfw|explicit/.test(n)) return 'porn';
  if (/scroll|phone|instagram|tiktok|reddit|youtube|social|doomscroll/.test(n)) return 'scrolling';
  if (/smok|vap|nicotine|cigarette|\bnic\b/.test(n)) return 'nicotine';
  if (/alcohol|drink|beer|wine|booze|liquor/.test(n)) return 'alcohol';
  if (/gambl|bet|poker|casino|wager/.test(n)) return 'gambling';
  if (/food|sugar|binge|overeat|snack|junk|sweets/.test(n)) return 'food';
  if (/overthink|rumin|spiral/.test(n)) return 'overthinking';
  if (/anx|worry|panic/.test(n)) return 'anxiety';
  if (/anger|rage|temper|lash/.test(n)) return 'anger';
  return 'other';
}

const since = (iso?: string) => (iso ? new Date(iso).getTime() : Date.now());

export function cleanDays(v: Vice): number {
  return Math.max(0, Math.floor((Date.now() - since(v.startDate)) / 86400000));
}

// Hours clean — used on day one, where "0 days" would feel discouraging.
export function cleanHours(v: Vice): number {
  return Math.max(0, Math.floor((Date.now() - since(v.startDate)) / 3600000));
}

export function moneySaved(v: Vice): number {
  if (!v.cost || !(v.cost.amount > 0)) return 0;
  const days = cleanDays(v);
  const { amount, per, usesPerWeek } = v.cost;
  if (per === 'day') return Math.round(amount * days);
  if (per === 'use') return Math.round(amount * (usesPerWeek || 7) * (days / 7));
  return Math.round(amount * (days / 7)); // per week (default)
}

export function totalReclaimed(vices: Vice[]): number {
  return vices.reduce((s, v) => s + moneySaved(v), 0);
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function makeVice(input: {
  name: string;
  mode: ViceMode;
  limit?: number | null;
  trigger?: string;
  cost?: ViceCost | null;
  startDate?: string;
}): Vice {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: input.name.trim(),
    type: classifyVice(input.name),
    mode: input.mode,
    limit: input.mode === 'moderate' ? input.limit ?? null : null,
    trigger: input.trigger?.trim() || undefined,
    startDate: input.startDate || now,
    wins: 0,
    relapses: 0,
    lastWin: null,
    lastSlip: null,
    cost: input.cost ?? null,
    history: [{ ts: now, kind: 'start' }],
  };
}

// Pure reducers over the vices array — the screen persists the result via the store.
export function withUrgeResisted(vices: Vice[], id: string): Vice[] {
  const now = new Date().toISOString();
  return vices.map((v) =>
    v.id === id
      ? { ...v, wins: v.wins + 1, lastWin: now, history: [...v.history, { ts: now, kind: 'win' as const }] }
      : v,
  );
}

export function withSlip(vices: Vice[], id: string): Vice[] {
  const now = new Date().toISOString();
  // Feedback, not failure: record it, start fresh from now. Wins are never wiped.
  return vices.map((v) =>
    v.id === id
      ? {
          ...v,
          relapses: v.relapses + 1,
          lastSlip: now,
          startDate: now,
          history: [...v.history, { ts: now, kind: 'slip' as const }],
        }
      : v,
  );
}

export function removeVice(vices: Vice[], id: string): Vice[] {
  return vices.filter((v) => v.id !== id);
}
