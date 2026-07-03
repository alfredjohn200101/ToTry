// getLifeState — the brain everything reads. A synchronous snapshot of the whole person assembled
// from the local-first store, plus `brief`: a compact text of that person fed to the AI so its
// counsel sees the whole, not one feature. Lean today (Fight + Recovery are the built domains);
// each new domain adds its slice here without changing the surface. This is the moat in code.
import { get } from '@/data/store';
import { getVices, cleanDays, totalReclaimed, type Vice } from '@/fight/model';
import { computeReadiness, type HealthSnapshot, type Readiness } from '@/health/readiness';

export type LifeState = {
  fight: {
    vices: Vice[];
    activeCount: number;
    longestCleanDays: number;
    reclaimed: number;
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
  if (readiness?.hasData) {
    parts.push(`Recovery today: ${readiness.level} (${readiness.score}/100).`);
  }
  const brief = parts.join(' ') || 'Just getting started — little history yet.';

  return {
    fight: { vices, activeCount: vices.length, longestCleanDays, reclaimed },
    readiness,
    brief,
    generatedAt: Date.now(),
  };
}
