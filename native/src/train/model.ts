// Train — a clean strength logger (routines/sets/reps, volume, estimated 1RM). Lean first pass of
// the Hevy-grade domain; Hevy/Strava import and the full library port land later. The moat lives on
// the screen: readiness (from Recovery) tells the person whether today is a PR or a walk.
import { get, set } from '@/data/store';

export type SetEntry = { weight: number; reps: number };
export type Exercise = { name: string; sets: SetEntry[]; cue?: string };
export type Workout = { id: string; date: string; name: string; exercises: Exercise[] };

const KEY = 'train.workouts';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function getWorkouts(): Workout[] {
  return get<Workout[]>(KEY, []);
}
export function addWorkout(name: string, exercises: Exercise[]): Workout {
  const w: Workout = { id: uid(), date: new Date().toISOString(), name: name.trim() || 'Session', exercises };
  set(KEY, [w, ...getWorkouts()].slice(0, 500));
  return w;
}
export function removeWorkout(id: string): void {
  set(KEY, getWorkouts().filter((w) => w.id !== id));
}

// Epley estimated 1RM — the standard, honest single-set estimate.
export const e1rm = (weight: number, reps: number) => (reps > 0 ? Math.round(weight * (1 + reps / 30)) : 0);
export const setVolume = (s: SetEntry) => s.weight * s.reps;
export const exerciseVolume = (e: Exercise) => e.sets.reduce((a, s) => a + setVolume(s), 0);
export const workoutVolume = (w: Workout) => w.exercises.reduce((a, e) => a + exerciseVolume(e), 0);
export const bestE1rm = (w: Workout) => Math.max(0, ...w.exercises.flatMap((e) => e.sets.map((s) => e1rm(s.weight, s.reps))));
export const totalSets = (w: Workout) => w.exercises.reduce((a, e) => a + e.sets.length, 0);
