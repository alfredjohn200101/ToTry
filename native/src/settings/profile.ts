// About you — the few facts that let the app tailor itself: your name (so the companion and coach
// speak to a person, not a stranger), biological sex (calorie/protein math is honestly different),
// and the faith dial (how much scripture surfaces — full, some, or none; a person of any belief is
// fully served). The founder's story stays "big brother"; the app's voice is universal.
import { get, set } from '@/data/store';

export type Sex = 'male' | 'female' | null;
export type Faith = 'full' | 'some' | 'off';

export const getName = () => get<string>('user.name', '');
export const saveName = (n: string) => set('user.name', n.trim());
export const getSex = () => get<Sex>('user.sex', null);
export const saveSex = (s: Sex) => set('user.sex', s);
export const getFaith = () => get<Faith>('user.faith', 'some');
export const saveFaith = (f: Faith) => set('user.faith', f);

// Sensible sex-aware defaults for daily fuel (a starting point; the person can always adjust).
export function defaultTargets(sex: Sex): { cal: number; protein: number } {
  if (sex === 'male') return { cal: 2500, protein: 160 };
  if (sex === 'female') return { cal: 2000, protein: 120 };
  return { cal: 2200, protein: 150 };
}
