// Craving intelligence — the scattered urge data turned into self-knowledge. Ported from the PWA's
// logCraving + analyzeUrgePatterns + _overridePlan. A person logs the moment an urge hits (how
// strong, what they were feeling, what set it off, did they outlast it); once there's enough, we
// mirror the pattern back — the hardest time of day, the recurring feeling/trigger, whether they're
// winning more lately — and turn it into a concrete if-then plan. Grace-first: the pattern isn't a
// verdict, it's a map. Always points beyond itself to real help.
import { get, set } from '@/data/store';

export type UrgeOutcome = 'outlasted' | 'slipped' | 'open'; // 'open' = logged mid-urge, unresolved

export type Urge = {
  id: string;
  ts: string; // ISO
  viceId: string;
  intensity?: number | null; // 1–5
  feeling?: string | null;
  trigger?: string | null;
  outcome: UrgeOutcome;
};

// The emotional vocabulary a craving usually rides in on.
export const URGE_FEELINGS = ['Stressed', 'Bored', 'Lonely', 'Tired', 'Anxious', 'Restless', 'Angry', 'Numb'] as const;

const KEY = 'fight.urges';

export function getUrges(): Urge[] {
  return get<Urge[]>(KEY, []);
}
export function getUrgesForVice(viceId: string): Urge[] {
  return getUrges().filter((u) => u.viceId === viceId);
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Rich log — a moment captured with feeling/trigger/intensity.
export function logUrge(input: {
  viceId: string;
  intensity?: number | null;
  feeling?: string | null;
  trigger?: string | null;
  outcome?: UrgeOutcome;
}): Urge {
  const entry: Urge = {
    id: uid(),
    ts: new Date().toISOString(),
    viceId: input.viceId,
    intensity: input.intensity ?? null,
    feeling: input.feeling ?? null,
    trigger: input.trigger?.trim() || null,
    outcome: input.outcome ?? 'open',
  };
  set(KEY, [entry, ...getUrges()].slice(0, 300));
  return entry;
}

// Frictionless outcome record — called by the quick "outlasted / went over" taps so the mirror
// populates from ordinary use, no form required.
export function recordOutcome(viceId: string, outcome: 'outlasted' | 'slipped'): void {
  set(KEY, [{ id: uid(), ts: new Date().toISOString(), viceId, outcome, intensity: null, feeling: null, trigger: null }, ...getUrges()].slice(0, 300));
}

// 5 blocks across the day; the heaviest is the risk window.
function blockLabel(h: number): string {
  if (h < 6) return 'late night (12–6am)';
  if (h < 12) return 'morning (6am–12pm)';
  if (h < 17) return 'afternoon (12–5pm)';
  if (h < 21) return 'evening (5–9pm)';
  return 'night (9pm–12am)';
}

export type UrgePattern = {
  total: number;
  winRate: number | null; // % outlasted among resolved
  trend: 'improving' | 'slipping' | 'steady' | null;
  riskWindow: string | null;
  riskDay: string | null;
  topFeeling: string | null;
  topTrigger: string | null;
  avgIntensity: number | null;
};

const topOf = (m: Record<string, number>, min = 1): string | null => {
  const e = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
  return e && e[1] >= min ? e[0] : null;
};

// The mirror. Null until there's enough to be honest about (matches the PWA's ≥4 bar).
export function analyzeUrges(urges: Urge[]): UrgePattern | null {
  const log = urges.filter((u) => u.ts);
  if (log.length < 4) return null;

  const blocks: Record<string, number> = {};
  const days: Record<string, number> = {};
  const feelings: Record<string, number> = {};
  const triggers: Record<string, number> = {};
  let intensitySum = 0;
  let intensityN = 0;

  log.forEach((u) => {
    const d = new Date(u.ts);
    const bl = blockLabel(d.getHours());
    blocks[bl] = (blocks[bl] || 0) + 1;
    const dn = d.toLocaleDateString(undefined, { weekday: 'long' });
    days[dn] = (days[dn] || 0) + 1;
    if (u.feeling) feelings[u.feeling] = (feelings[u.feeling] || 0) + 1;
    if (u.trigger) {
      const t = u.trigger.toLowerCase().trim();
      if (t) triggers[t] = (triggers[t] || 0) + 1;
    }
    if (u.intensity != null) {
      intensitySum += u.intensity;
      intensityN++;
    }
  });

  // Win-rate over resolved urges + trend (recent half vs older half). log is newest-first.
  const resolved = log.filter((u) => u.outcome === 'outlasted' || u.outcome === 'slipped');
  const wr = (arr: Urge[]) => (arr.length ? Math.round((arr.filter((u) => u.outcome === 'outlasted').length / arr.length) * 100) : null);
  const winRate = wr(resolved);
  const half = Math.floor(resolved.length / 2);
  const rwr = wr(resolved.slice(0, half));
  const owr = wr(resolved.slice(half));
  const trend = rwr != null && owr != null ? (rwr > owr + 5 ? 'improving' : rwr < owr - 5 ? 'slipping' : 'steady') : null;

  return {
    total: log.length,
    winRate,
    trend,
    riskWindow: topOf(blocks),
    riskDay: topOf(days, 2),
    topFeeling: topOf(feelings, 2),
    topTrigger: topOf(triggers, 2),
    avgIntensity: intensityN ? Math.round((intensitySum / intensityN) * 10) / 10 : null,
  };
}

// Turn the pattern into a way OUT — stimulus control + if-then implementation intentions (pre-decide
// the response so willpower isn't needed in the moment). Returns paragraphs. Always closes pointing
// beyond the tactics to real help. Ported from _overridePlan.
export function overridePlan(p: UrgePattern): string[] {
  const bits: string[] = [];
  if (p.riskWindow) {
    const w = p.riskWindow.toLowerCase();
    if (/late night|night|9pm|12–6/.test(w))
      bits.push("Your hardest hours are late. Decide NOW what those hours look like — phone charging in another room before then, a set wind-down, somewhere to be that isn't alone with a screen. Don't leave the decision for the moment the pull is strongest; make it now, while you're clear.");
    else if (/morning/.test(w))
      bits.push('Mornings are your edge. Set the first 20 minutes before you even open your eyes — up, light, water, move, a verse — so the day starts with momentum, not a vacuum the urge can fill.');
    else if (/afternoon/.test(w))
      bits.push("The afternoon dip is your window. Pre-plan a reset for that time — a walk, a real break, food and water — so the slump doesn't become the opening.");
    else if (/evening/.test(w))
      bits.push("Evenings are when it comes. Build that time on purpose — plan what you're doing and who you're near, so the hours aren't empty for it to creep into.");
  }
  if (p.topFeeling) {
    bits.push(`It tends to ride in on feeling ${p.topFeeling.toLowerCase()}. That feeling is the real thing to meet — the urge is just how it's asking to be managed. When it rises, name it, and reach for what actually helps it, not what numbs it.`);
  }
  if (p.topTrigger) {
    bits.push(`When "${p.topTrigger}" shows up, that's the cue. Decide your one move ahead of time — the instant it hits, you DO that (step outside, cold water, text someone, open this) before the thinking starts. Pre-deciding is how you win when willpower's thin.`);
  }
  if (!bits.length) {
    bits.push("Keep logging the moments — the more I see, the more exactly I can help you get ahead of it. The pattern isn't a verdict, it's a map.");
  }
  bits.push("And if this keeps winning no matter what you try, that's not failure — it's a sign to bring a real person in. You don't have to carry it alone.");
  return bits;
}
