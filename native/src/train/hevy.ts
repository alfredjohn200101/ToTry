// Hevy import — bring an existing lifter's history in so they don't lose it. Pure REST with their
// own API key (Hevy → Settings → API), no AI. One-way: Hevy → To Try. The map from Hevy's shape to
// ours is defensive (missing fields never throw); dedupe is by Hevy's own workout id.
import { get, set } from '@/data/store';
import { getWorkouts, type Workout, type Exercise } from '@/train/model';

const HEVY_API = 'https://api.hevyapp.com/v1/workouts';

type HevySet = { weight_kg?: number | null; reps?: number | null };
type HevyExercise = { title?: string; sets?: HevySet[] };
type HevyWorkout = { id?: string; title?: string; start_time?: string; exercises?: HevyExercise[] };

export function mapHevyWorkouts(raw: HevyWorkout[]): Workout[] {
  return (raw || [])
    .filter((w) => w && Array.isArray(w.exercises))
    .map((w) => ({
      id: 'hevy_' + (w.id || Math.random().toString(36).slice(2)),
      date: w.start_time || new Date().toISOString(),
      name: w.title || 'Workout',
      exercises: (w.exercises || [])
        .map((e): Exercise => ({
          name: e.title || 'Exercise',
          sets: (e.sets || [])
            .filter((s) => (s.reps || 0) > 0)
            .map((s) => ({ weight: Math.max(0, s.weight_kg || 0), reps: Math.max(0, s.reps || 0) })),
        }))
        .filter((e) => e.sets.length),
    }))
    .filter((w) => w.exercises.length);
}

export const getHevyKey = () => get<string>('train.hevyKey', '');

export async function importHevy(apiKey: string, pages = 3): Promise<{ added: number; error?: string }> {
  const key = apiKey.trim();
  if (!key) return { added: 0, error: 'Enter your Hevy API key first.' };

  const collected: HevyWorkout[] = [];
  try {
    for (let page = 1; page <= pages; page++) {
      const r = await fetch(`${HEVY_API}?page=${page}&pageSize=10`, { headers: { 'api-key': key, accept: 'application/json' } });
      if (r.status === 401 || r.status === 403) return { added: 0, error: 'Hevy rejected that API key — double-check it.' };
      if (!r.ok) break;
      const d = await r.json().catch(() => ({}));
      const ws = (d.workouts as HevyWorkout[]) || [];
      if (!ws.length) break;
      collected.push(...ws);
      if (ws.length < 10) break; // last page
    }
  } catch {
    return { added: 0, error: 'Could not reach Hevy — check your connection.' };
  }

  const mapped = mapHevyWorkouts(collected);
  if (!mapped.length) return { added: 0, error: 'No workouts found to import.' };

  const existing = getWorkouts();
  const have = new Set(existing.map((w) => w.id));
  const fresh = mapped.filter((w) => !have.has(w.id));
  set('train.workouts', [...fresh, ...existing].slice(0, 500));
  set('train.hevyKey', key); // remember so they don't re-enter it
  return { added: fresh.length };
}
