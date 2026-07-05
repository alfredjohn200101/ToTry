// Progressive overload, from a person's own history — pure code, no AI. A real coach's move: look at
// what you last did on a lift and tell you the next honest target. Double progression — beat the rep
// ceiling, then add load and drop back to the floor.
import { getWorkouts, e1rm } from '@/train/model';

export type Progression = {
  lastWeight: number;
  lastReps: number;
  lastDate: string;
  e1rm: number;
  suggestion: string;
};

const REP_FLOOR = 5;
const REP_CEILING = 8;
const INC = 2.5; // kg — the smallest honest jump

const norm = (s: string) => s.toLowerCase().trim();

// Most recent performance of a lift + the next target. Null if it's never been logged.
export function progressionFor(exName: string): Progression | null {
  const name = norm(exName);
  for (const w of getWorkouts()) {
    // newest first
    const ex = w.exercises.find((e) => norm(e.name) === name);
    if (ex && ex.sets.length) {
      const best = ex.sets.reduce((b, s) => (e1rm(s.weight, s.reps) > e1rm(b.weight, b.reps) ? s : b));
      const bw = best.weight;
      const br = best.reps;
      const suggestion =
        br >= REP_CEILING
          ? `You hit ${br} reps at ${bw}kg — add load: try ${bw + INC}kg for ${REP_FLOOR}–${REP_CEILING}.`
          : `Last: ${bw}kg × ${br}. Beat it — aim for ${br + 1} reps at ${bw}kg.`;
      return { lastWeight: bw, lastReps: br, lastDate: w.date, e1rm: e1rm(bw, br), suggestion };
    }
  }
  return null;
}
