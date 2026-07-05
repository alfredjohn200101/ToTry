// Reach-out-first — the decision brain (pure code). Given the time + the whole-life state, it works
// out whether THIS is a moment to reach for the person, and with what. Grace-first, choice-first,
// never guilt. The delivery is native push (device phase); this is the logic that decides what to
// send, and it also drives the Home's live "one thing now". Deterministic and web-testable.
import { getLifeState } from './lifeState';
import { todaysMorning, todaysReflection } from '@/soul/rituals';

export type ReachKind = 'risk' | 'lateNight' | 'lowRecovery' | 'morning' | 'evening';
export type ReachAction = 'companion' | 'morning' | 'reflect';
export type ReachOut = { kind: ReachKind; title: string; body: string; action?: ReachAction };

// Is `hour` inside the labelled urge window (labels come from analyzeUrges)?
export function inWindow(label: string | null, hour: number): boolean {
  if (!label) return false;
  if (label.includes('late night')) return hour < 6;
  if (label.includes('morning')) return hour >= 6 && hour < 12;
  if (label.includes('afternoon')) return hour >= 12 && hour < 17;
  if (label.includes('evening')) return hour >= 17 && hour < 21;
  if (label.includes('night')) return hour >= 21;
  return false;
}

// The single most relevant reach-out for right now, or null if the best move is to stay quiet.
// Priority runs from most urgent (a known-hard moment) down to gentle rhythm nudges.
export function computeReachOut(now: Date = new Date()): ReachOut | null {
  const h = now.getHours();
  const life = getLifeState();
  const fightActive = life.fight.activeCount > 0;
  const morningDone = !!todaysMorning();
  const reflectionDone = !!todaysReflection();

  // 1. Inside the person's own hardest urge window — the highest-value moment to be present.
  if (fightActive && inWindow(life.fight.riskWindow, h)) {
    return {
      kind: 'risk',
      title: "I'm here",
      body: "This is usually when it's hardest for you. Nothing has to happen — I'm just here. Tap if anything's rising.",
      action: 'companion',
    };
  }
  // 2. Late night while fighting something — the classic danger hours.
  if (fightActive && (h >= 22 || h < 5)) {
    return {
      kind: 'lateNight',
      title: 'Still up?',
      body: "Late hours are hard. I'm right here if anything's pulling at you tonight.",
      action: 'companion',
    };
  }
  // 3. Low recovery — steer toward gentleness, not pushing.
  if (life.readiness?.hasData && life.readiness.level === 'rest') {
    return {
      kind: 'lowRecovery',
      title: 'Go gentle today',
      body: "Your recovery's low — if the day feels heavy or the pull feels strong, that's your body, not a failing. Ease into it.",
    };
  }
  // 4. Morning, intention not yet set — armour before the day gets loud.
  if (!morningDone && h >= 5 && h < 11) {
    return {
      kind: 'morning',
      title: 'Set the day',
      body: "Before it gets loud — one breath and one intention. I'll hand it back to you when it's hard.",
      action: 'morning',
    };
  }
  // 5. Evening, day not yet closed — grace-first examen.
  if (!reflectionDone && h >= 20 && h < 24) {
    return {
      kind: 'evening',
      title: 'Close the day',
      body: "However today went, it isn't the final word. Look back on it with me for a moment.",
      action: 'reflect',
    };
  }
  return null;
}
