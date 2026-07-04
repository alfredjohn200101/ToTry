// Fuel Plan — the differentiator no single-feature app has: meals planned around the WHOLE person.
// Sex-aware targets (About you), budget, real diet restrictions, AND the actual training times from
// the Calendar — so pre-workout carbs land before a real session, not a generic clock. Food-first,
// no supplement pushing, and ED-safe (a sensible calorie floor, kindly framed — fuelling, not shrinking).
import { api } from '@/ai/api';
import { getLifeState } from '@/state/lifeState';
import { getTargets } from '@/nourish/model';
import { eventsForToday } from '@/calendar/model';

export type FuelMeal = { name: string; when: string; kcal: number; protein: number; carbs?: number | null; note?: string };
export type ShopItem = { item: string; approxCost?: string };
export type FuelPlan = { meals: FuelMeal[]; shopping: ShopItem[]; why: string; preWorkout?: string };
export type FuelPrefs = { budget: string; diet: string[]; mealsPerDay: number };

export const DIET_OPTIONS = ['Vegan', 'Vegetarian', 'Halal', 'No beef', 'No pork', 'Dairy-free', 'Gluten-free'];

const to12 = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
};

// Parse a meal's "when" (e.g. "4:00pm", "16:00", "7am") to minutes-since-midnight, or null.
function parseWhen(w: string): number | null {
  if (!w) return null;
  const m = w.trim().toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3];
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export async function generateFuelPlan(prefs: FuelPrefs): Promise<FuelPlan | null> {
  const targets = getTargets();
  const brief = getLifeState().brief;
  // Today's training session (any time today) — a day's plan times carbs around it whether or not
  // the hour has already passed.
  const gym = eventsForToday().find((e) => e.type === 'gym' && e.time) ?? null;
  const trainingLine = gym && gym.time
    ? `They train today at ${to12(gym.time)} (${gym.title}). Time a carb-forward pre-workout meal ~60-90 min before it, and note which meal that is.`
    : 'No training logged for today — keep carbs even across the day.';
  const dietLine = prefs.diet.length ? `Dietary restrictions (respect strictly): ${prefs.diet.join(', ')}.` : 'No dietary restrictions.';

  const sys =
    'You are a registered-dietitian-grade meal planner inside a free, faith-rooted whole-life app. ' +
    'Return ONLY JSON, no markdown: {"meals":[{"name":string,"when":string,"kcal":number,"protein":number,"carbs":number,"note":string}],"shopping":[{"item":string,"approxCost":string}],"why":string,"preWorkout":string}. ' +
    'Plan ONE realistic day of meals. HARD REQUIREMENT: the meals must SUM to within ~10% of BOTH the calorie AND the protein target — protein is the priority and is the most common miss, so build meals around protein first, then fill calories with carbs and fats. ' +
    'If the diet is vegetarian or vegan, you MUST deliberately reach the protein target with plant sources (tofu, tempeh, seitan, edamame, lentils, beans, soy milk, and protein powder if not excluded) — a plate of vegetables will NOT hit it, so be intentional. ' +
    'Set "when" as a CLOCK TIME (e.g. "7:00am", "12:30pm"), not just "Breakfast". ' +
    'If they train today, exactly one meal MUST be scheduled ~60-90 minutes before their session with higher carbs, and "preWorkout" MUST name that meal and why it is timed there. Only use "" for preWorkout if there is genuinely no training today. ' +
    'Respect the budget and diet strictly. Food-first — never push supplements or brands beyond basic protein powder if relevant. Keep it affordable and normal, not fancy. ' +
    'ED-SAFE: never plan below ~1500 kcal for an adult; if the target is lower, plan at a healthy minimum and say so kindly in "why". The goal is fuelling, never shrinking. ' +
    '"why" = one warm coaching sentence.';

  const prompt =
    `Targets: ${targets.cal} kcal, ${targets.protein}g protein. Budget: ${prefs.budget || 'flexible'}. ` +
    `${dietLine} Meals per day: ${prefs.mealsPerDay}. ${trainingLine} ` +
    `Whole-person context: ${brief}`;

  let reply = '';
  try {
    reply = await api(sys, [], prompt, 1400, { timeout: 40000 });
  } catch {
    return null;
  }
  if (!reply) return null;
  try {
    const s = reply.indexOf('{'), e = reply.lastIndexOf('}');
    if (s < 0 || e < 0) return null;
    const json = reply.slice(s, e + 1).replace(/}\s*=\s*{/g, '},{').replace(/,\s*([}\]])/g, '$1');
    const p = JSON.parse(json) as FuelPlan;
    if (!Array.isArray(p.meals)) return null;
    p.meals = p.meals.filter((m) => m && m.name).map((m) => ({ ...m, kcal: Math.round(m.kcal) || 0, protein: Math.round(m.protein) || 0 }));
    p.shopping = Array.isArray(p.shopping) ? p.shopping.filter((x) => x && x.item) : [];

    // Carb-timing, made reliable: rather than trust the model to flag it, pick the pre-workout meal
    // ourselves — the latest meal that lands 20 min–3 h BEFORE today's session. This is the moat, and
    // it must not depend on the model remembering to fill a field.
    if (gym?.time) {
      const gymMin = parseWhen(gym.time);
      if (gymMin != null) {
        const before = p.meals
          .map((m) => ({ m, min: parseWhen(m.when) }))
          .filter((x) => x.min != null && x.min <= gymMin - 20 && x.min >= gymMin - 180)
          .sort((a, b) => (a.min as number) - (b.min as number));
        const pre = before[before.length - 1]; // closest before the session
        if (pre) {
          const mins = gymMin - (pre.min as number);
          p.preWorkout = `${pre.m.name} — about ${mins} min before your ${to12(gym.time)} ${gym.title.toLowerCase()}, so its carbs are fuel to train on.`;
        }
      }
    }
    return p;
  } catch {
    return null;
  }
}
