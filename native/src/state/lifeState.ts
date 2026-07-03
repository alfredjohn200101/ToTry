// getLifeState — the brain everything reads. A synchronous snapshot of the whole person assembled
// from the local-first store, plus `brief`: a compact text of that person fed to the AI so its
// counsel sees the whole, not one feature. Lean today (Fight + Recovery are the built domains);
// each new domain adds its slice here without changing the surface. This is the moat in code.
import { useCallback, useSyncExternalStore } from 'react';
import { get, subscribe } from '@/data/store';
import { getVices, cleanDays, totalReclaimed, type Vice } from '@/fight/model';
import { getUrges, analyzeUrges } from '@/fight/urges';
import { computeReadiness, type HealthSnapshot, type Readiness } from '@/health/readiness';
import type { CompanionContext } from '@/soul/companionPrompt';

export type LifeState = {
  fight: {
    vices: Vice[];
    activeCount: number;
    longestCleanDays: number;
    reclaimed: number;
    riskWindow: string | null; // the hardest time of day, once the pattern is clear
  };
  readiness: Readiness | null;
  brief: string;
  generatedAt: number;
};

export function getLifeState(): LifeState {
  const vices = getVices();
  const snap = get<HealthSnapshot | null>('health.snapshot', null);
  const readiness = snap ? computeReadiness(snap) : null;

  const longestCleanDays = vices.reduce((m, v) => Math.max(m, cleanDays(v)), 0);
  const reclaimed = totalReclaimed(vices);
  const pattern = analyzeUrges(getUrges()); // overall craving pattern, null until there's enough

  const parts: string[] = [];
  if (vices.length) {
    parts.push(
      'Fighting: ' +
        vices
          .map((v) => `${v.name} (${cleanDays(v)}d clean${v.wins ? `, ${v.wins} urges outlasted` : ''})`)
          .join('; ') +
        '.',
    );
    if (reclaimed > 0) parts.push(`Reclaimed ~$${reclaimed} by staying clean.`);
  }
  if (pattern?.riskWindow) {
    parts.push(
      `Hardest urge window: ${pattern.riskWindow}${pattern.topFeeling ? ` (often feeling ${pattern.topFeeling.toLowerCase()})` : ''}.`,
    );
  }
  if (readiness?.hasData) {
    parts.push(`Recovery today: ${readiness.level} (${readiness.score}/100).`);
  }
  const brief = parts.join(' ') || 'Just getting started — little history yet.';

  return {
    fight: { vices, activeCount: vices.length, longestCleanDays, reclaimed, riskWindow: pattern?.riskWindow ?? null },
    readiness,
    brief,
    generatedAt: Date.now(),
  };
}

// Reactive brain for screens — re-renders whenever anything in the store changes. Use on the home
// so the whole-life threads (recovery, the fight, the risk window) stay live.
export function useLifeState(): LifeState {
  const snap = useCallback(() => {
    // getLifeState() builds a fresh object each call; cache by a cheap signature so useSyncExternalStore
    // doesn't loop. We recompute only when the store notifies.
    return getLifeState();
  }, []);
  return useSyncExternalStore(
    (cb) => subscribe('*', cb),
    () => cachedLifeState(snap),
    () => cachedLifeState(snap),
  );
}

// Memoise the last LifeState so getSnapshot returns a stable reference between store notifications.
let _cache: LifeState | null = null;
let _dirty = true;
function cachedLifeState(build: () => LifeState): LifeState {
  if (_dirty || !_cache) {
    _cache = build();
    _dirty = false;
  }
  return _cache;
}
// Any store change marks the brain dirty so the next read recomputes.
subscribe('*', () => {
  _dirty = true;
});

// The in-the-moment context the companion needs — so the voice knows the person, not a stranger.
// Fills the tuned prompt's existing hooks from real data (poor sleep → "the pull is strong because
// you're exhausted, not weak"; this morning's intention; their name). Empty for a new person.
export function companionContext(): CompanionContext {
  const snap = get<HealthSnapshot | null>('health.snapshot', null);
  const poorSleep = snap?.sleepHours != null && snap.sleepHours <= 4.5;
  const morningIntention = get<string>('soul.morningIntention', '') || undefined;
  const name = get<string>('user.name', '') || undefined;
  return { name, poorSleep, morningIntention };
}
