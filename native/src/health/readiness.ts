// Readiness — computed from real health signals (HRV, resting HR, sleep, strain).
// Pure + testable. On device these come from the phone's health store (Apple Health on iOS,
// Health Connect on Android — which in turn gathers whatever watch syncs in: Apple Watch, Garmin,
// and others). On web from a mock provider.

// Where a snapshot came from. Devices (Apple Watch, Garmin, and others) feed the platform stores,
// so most people are covered by apple_health / health_connect without a per-brand integration.
export type HealthSource = 'apple_health' | 'health_connect' | 'garmin' | 'mock';

export type HealthSnapshot = {
  hrv?: number | null; // ms (SDNN/RMSSD)
  rhr?: number | null; // resting heart rate, bpm
  respRate?: number | null; // breaths/min
  sleepHours?: number | null;
  sleepQuality?: number | null; // 0-100 (optional)
  steps?: number | null;
  activeEnergy?: number | null; // kcal
  strain?: number | null; // recent training load 0-100 (optional)
  baseline?: { hrv?: number | null; rhr?: number | null } | null; // personal 14-day baselines
  source?: HealthSource; // where the numbers came from
};

export type Driver = { label: string; dir: 'up' | 'down' };
export type Readiness = {
  score: number; // 5-100
  level: 'go' | 'moderate' | 'rest';
  drivers: Driver[];
  advice: string;
  hasData: boolean;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function computeReadiness(s: HealthSnapshot | null | undefined): Readiness {
  if (!s) return { score: 0, level: 'moderate', drivers: [], advice: '', hasData: false };
  let score = 50;
  const drivers: Driver[] = [];
  let signals = 0;

  // HRV — the single best recovery signal. Prefer a personal baseline; fall back to absolute ranges.
  if (s.hrv != null) {
    signals++;
    const base = s.baseline?.hrv;
    if (base && base > 0) {
      const pct = (s.hrv - base) / base;
      score += clamp(pct * 60, -22, 22);
      if (pct <= -0.12) drivers.push({ label: `HRV below your baseline (${Math.round(s.hrv)}ms)`, dir: 'down' });
      else if (pct >= 0.12) drivers.push({ label: `HRV above your baseline (${Math.round(s.hrv)}ms)`, dir: 'up' });
    } else {
      const h = s.hrv;
      score += h < 30 ? -15 : h < 45 ? -5 : h < 65 ? 6 : 15;
      if (h < 30) drivers.push({ label: `Low HRV (${Math.round(h)}ms)`, dir: 'down' });
      else if (h >= 65) drivers.push({ label: `Strong HRV (${Math.round(h)}ms)`, dir: 'up' });
    }
  }

  // Resting HR — lower is better; elevated RHR flags incomplete recovery / illness.
  if (s.rhr != null) {
    signals++;
    const base = s.baseline?.rhr;
    if (base && base > 0) {
      const diff = s.rhr - base;
      score += clamp(-diff * 1.6, -12, 8);
      if (diff >= 5) drivers.push({ label: `Resting HR up ${Math.round(diff)}bpm on baseline`, dir: 'down' });
    } else {
      const r = s.rhr;
      score += r > 70 ? -12 : r > 60 ? -4 : r > 50 ? 4 : 9;
      if (r > 70) drivers.push({ label: `Elevated resting HR (${Math.round(r)}bpm)`, dir: 'down' });
      else if (r <= 50) drivers.push({ label: `Low resting HR (${Math.round(r)}bpm)`, dir: 'up' });
    }
  }

  // Sleep — the foundation. Duration + optional quality.
  if (s.sleepHours != null) {
    signals++;
    const h = s.sleepHours;
    score += h < 5 ? -18 : h < 6 ? -8 : h < 7 ? 0 : h < 8 ? 8 : 10;
    if (h < 6) drivers.push({ label: `Only ${h.toFixed(1)}h sleep`, dir: 'down' });
    else if (h >= 7.5) drivers.push({ label: `${h.toFixed(1)}h sleep`, dir: 'up' });
    if (s.sleepQuality != null) score += clamp((s.sleepQuality - 65) * 0.15, -6, 6);
  }

  // Recent training strain — accumulated load lowers readiness.
  if (s.strain != null) {
    if (s.strain >= 75) { score -= 10; drivers.push({ label: 'High training strain lately', dir: 'down' }); }
    else if (s.strain <= 25) { score += 4; }
  }

  score = clamp(Math.round(score), 5, 100);
  const level: Readiness['level'] = score >= 70 ? 'go' : score >= 45 ? 'moderate' : 'rest';
  const advice =
    level === 'go'
      ? 'You’re well recovered. A good day to push — chase a PR or add load.'
      : level === 'moderate'
        ? 'Moderately recovered. Train, but keep it controlled — quality over maxing out.'
        : 'Your body’s asking for recovery. Mobility, an easy walk, or rest today — it’s part of the work.';

  // Keep the two strongest drivers, prioritising the down-side (what to be aware of).
  drivers.sort((a, b) => (a.dir === b.dir ? 0 : a.dir === 'down' ? -1 : 1));
  return { score, level, drivers: drivers.slice(0, 3), advice, hasData: signals > 0 };
}
