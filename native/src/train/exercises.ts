// A code-based exercise library with form cues — no AI, no network. Lets Train offer a real picker
// with a one-line coaching cue per lift, the way Hevy does, entirely offline. Covers the main
// barbell/dumbbell/bodyweight movements across muscle groups; a person can still add a custom name.
export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core' | 'Full body';

export type LibExercise = { name: string; muscle: MuscleGroup; cue: string };

export const EXERCISES: LibExercise[] = [
  // Chest
  { name: 'Barbell Bench Press', muscle: 'Chest', cue: 'Shoulder blades pinned, bar to mid-chest, drive through the floor.' },
  { name: 'Incline Bench Press', muscle: 'Chest', cue: '30–45° bench, bar to upper chest — hits the clavicular pecs.' },
  { name: 'Dumbbell Bench Press', muscle: 'Chest', cue: 'Wrists stacked over elbows, control the stretch at the bottom.' },
  { name: 'Push-up', muscle: 'Chest', cue: 'Body in one line, elbows ~45°, full range every rep.' },
  { name: 'Cable Chest Fly', muscle: 'Chest', cue: 'Soft elbows, squeeze at the midline, slow on the way back.' },
  { name: 'Dips', muscle: 'Chest', cue: 'Lean forward for chest; keep shoulders down and back.' },
  // Back
  { name: 'Deadlift', muscle: 'Back', cue: 'Neutral spine, bar over midfoot, push the floor away — hinge, don’t squat.' },
  { name: 'Pull-up', muscle: 'Back', cue: 'Start from a dead hang, lead with the chest, drive elbows down.' },
  { name: 'Barbell Row', muscle: 'Back', cue: 'Hinge ~45°, pull to the lower ribs, no jerking with the low back.' },
  { name: 'Lat Pulldown', muscle: 'Back', cue: 'Chest up, pull the bar to the collarbone, don’t lean way back.' },
  { name: 'Seated Cable Row', muscle: 'Back', cue: 'Tall torso, squeeze the shoulder blades, control the return.' },
  { name: 'Face Pull', muscle: 'Back', cue: 'Pull to the eyes, elbows high — great for shoulder health.' },
  // Legs
  { name: 'Back Squat', muscle: 'Legs', cue: 'Brace hard, knees track over toes, hips and chest rise together.' },
  { name: 'Front Squat', muscle: 'Legs', cue: 'Elbows high, stay upright, sit between the hips.' },
  { name: 'Leg Press', muscle: 'Legs', cue: 'Feet mid-platform, don’t let the low back round at the bottom.' },
  { name: 'Romanian Deadlift', muscle: 'Legs', cue: 'Soft knees, push hips back, feel the hamstrings — bar close.' },
  { name: 'Walking Lunge', muscle: 'Legs', cue: 'Long step, back knee toward the floor, torso tall.' },
  { name: 'Bulgarian Split Squat', muscle: 'Legs', cue: 'Rear foot elevated, drop straight down, drive through the front heel.' },
  { name: 'Leg Curl', muscle: 'Legs', cue: 'No hip movement — just the knee bending, controlled.' },
  { name: 'Leg Extension', muscle: 'Legs', cue: 'Squeeze at the top for a second, lower slowly.' },
  { name: 'Calf Raise', muscle: 'Legs', cue: 'Full stretch at the bottom, pause at the top.' },
  // Shoulders
  { name: 'Overhead Press', muscle: 'Shoulders', cue: 'Squeeze glutes, bar over the crown, don’t lean back — press up and slightly back.' },
  { name: 'Dumbbell Shoulder Press', muscle: 'Shoulders', cue: 'Neutral or slight arc, don’t clang the bells at the top.' },
  { name: 'Lateral Raise', muscle: 'Shoulders', cue: 'Lead with the elbows, pour-the-jug, light and strict.' },
  { name: 'Rear Delt Fly', muscle: 'Shoulders', cue: 'Hinge over, pull wide, squeeze the rear delts.' },
  { name: 'Arnold Press', muscle: 'Shoulders', cue: 'Rotate from palms-in to palms-out as you press.' },
  // Arms
  { name: 'Barbell Curl', muscle: 'Arms', cue: 'Elbows pinned to the sides, no swinging, full squeeze.' },
  { name: 'Dumbbell Curl', muscle: 'Arms', cue: 'Supinate as you lift, control the lowering.' },
  { name: 'Hammer Curl', muscle: 'Arms', cue: 'Neutral grip — hits the brachialis and forearms.' },
  { name: 'Tricep Pushdown', muscle: 'Arms', cue: 'Elbows locked at the sides, full lockout, slow return.' },
  { name: 'Skull Crusher', muscle: 'Arms', cue: 'Elbows still, lower to the forehead/behind, don’t flare.' },
  { name: 'Close-grip Bench Press', muscle: 'Arms', cue: 'Shoulder-width grip, elbows tucked, drive with the triceps.' },
  // Core
  { name: 'Plank', muscle: 'Core', cue: 'Ribs down, glutes tight, don’t let the hips sag or pike.' },
  { name: 'Hanging Leg Raise', muscle: 'Core', cue: 'No swing — curl the pelvis up, lower with control.' },
  { name: 'Cable Crunch', muscle: 'Core', cue: 'Crunch the ribs to the pelvis, hips stay put.' },
  { name: 'Ab Wheel Rollout', muscle: 'Core', cue: 'Brace hard, roll only as far as you can hold a flat back.' },
  // Full body
  { name: 'Kettlebell Swing', muscle: 'Full body', cue: 'Hip snap drives it, arms are ropes, glutes finish the rep.' },
  { name: 'Power Clean', muscle: 'Full body', cue: 'Explode from the floor, catch in a quarter squat, elbows fast.' },
];

const norm = (s: string) => s.toLowerCase().trim();

export function searchExercises(q: string, limit = 6): LibExercise[] {
  const n = norm(q);
  if (!n) return [];
  const starts = EXERCISES.filter((e) => norm(e.name).startsWith(n));
  const contains = EXERCISES.filter((e) => !norm(e.name).startsWith(n) && (norm(e.name).includes(n) || norm(e.muscle).includes(n)));
  return [...starts, ...contains].slice(0, limit);
}

export function findExercise(name: string): LibExercise | undefined {
  return EXERCISES.find((e) => norm(e.name) === norm(name));
}
