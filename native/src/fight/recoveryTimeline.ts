// "What your streak is earning you" — the recovery timeline, as a curated code knowledge base (no
// AI). Per vice type, evidence-aware milestones: what the body/mind recovers at each mark, plus a
// grace-first reflection. The PWA generated these with an AI each time; here they're deterministic,
// offline, and consistent — a person sees the same honest map every time.
import type { ViceType } from './model';

export type Milestone = { day: number; body: string; soul: string };

const RECOVERY: Partial<Record<ViceType, Milestone[]>> = {
  porn: [
    { day: 1, body: 'The dopamine reset begins — the first day is often the loudest, and you met it.', soul: 'One honest day is a real altar. Grace meets the person who simply starts.' },
    { day: 7, body: 'Mental fog starts lifting; energy and focus begin to return.', soul: 'A week of small no’s becomes a quiet strength you can feel.' },
    { day: 14, body: 'Motivation and drive come back as the reward system rebalances.', soul: 'You’re proving to yourself that the urge is not the boss you thought it was.' },
    { day: 30, body: 'Real attraction and intimacy rewire — you notice people, not pixels.', soul: 'A month clean is a new groove worn into you. Keep walking it.' },
    { day: 90, body: 'A genuinely rewired reward system — this is where many say they feel free.', soul: 'What felt impossible on day one is now just your life. That’s the fruit of trying.' },
  ],
  nicotine: [
    { day: 1, body: 'Carbon monoxide clears; oxygen in your blood climbs back to normal.', soul: 'The first day is the steepest. You’re already on the other side of it.' },
    { day: 3, body: 'Nicotine is out of your system — cravings peak now, then start to fall.', soul: 'The worst wave is the one you’re riding. It breaks. Hold on.' },
    { day: 14, body: 'Circulation improves; taste and smell come back to life.', soul: 'Your body is thanking you in ways you can literally taste.' },
    { day: 30, body: 'Lung function measurably improves; coughing eases.', soul: 'A month of breath reclaimed. That’s no small thing.' },
    { day: 90, body: 'Cravings become rare and easy to pass; the habit loop is broken.', soul: 'You don’t fight it constantly anymore — you just live. That’s freedom.' },
  ],
  alcohol: [
    { day: 1, body: 'Your body starts to rehydrate and sleep begins to normalise.', soul: 'One clear morning is worth more than it looks. Start there.' },
    { day: 3, body: 'The hardest of the withdrawal passes; appetite and mood steady.', soul: 'You’re through the narrowest part of the tunnel.' },
    { day: 7, body: 'Deeper sleep, clearer mornings, steadier energy.', soul: 'A week of showing up clear-headed — feel the difference in yourself.' },
    { day: 14, body: 'Your liver is recovering; mood and anxiety settle.', soul: 'The fog you thought was just you was partly the drink. See yourself clearly.' },
    { day: 30, body: 'Better skin, sleep, weight and focus — a visibly different baseline.', soul: 'A month is a new normal, not a white-knuckle exception.' },
    { day: 90, body: 'A genuinely different baseline — many say they barely recognise the old rhythm.', soul: 'You built this a day at a time. That’s the only way it’s ever built.' },
  ],
  scrolling: [
    { day: 1, body: 'The reflex to reach for the phone starts to weaken.', soul: 'You noticed the pull and didn’t obey it. That’s the whole skill.' },
    { day: 3, body: 'Less restlessness; you can sit with a quiet moment again.', soul: 'Boredom is not an emergency. You’re relearning that.' },
    { day: 7, body: 'Attention span recovers; time quietly reappears in your day.', soul: 'The hours the scroll ate are coming back to you. Spend them well.' },
    { day: 30, body: 'Deep focus returns — reading, work, and real conversation feel easier.', soul: 'Your attention is yours again. Guard it like the treasure it is.' },
  ],
  gambling: [
    { day: 1, body: 'The urge runs in waves; the first is the tallest, and it passed.', soul: 'Every wave you ride teaches your brain the storm always breaks.' },
    { day: 7, body: 'Finances stabilise; a clearer head returns without the chase.', soul: 'The money staying in your pocket is freedom you can count.' },
    { day: 30, body: 'The reclaimed money is real, and the compulsion loosens its grip.', soul: 'A month is proof the chase isn’t your master anymore.' },
    { day: 90, body: 'Freedom from the chase — the pull is rare and easy to name.', soul: 'You traded a losing bet for your actual life. That always wins.' },
  ],
  food: [
    { day: 3, body: 'Steadier energy as the binge-restrict swing settles.', soul: 'This isn’t about shrinking — it’s about peace with the table.' },
    { day: 7, body: 'Fewer cravings and a calmer relationship with eating.', soul: 'Gentleness is beating you here more than willpower ever could.' },
    { day: 30, body: 'A settled, sustainable rhythm — food as fuel and joy, not a fight.', soul: 'You’re learning to be fed, not just full. That’s a good place.' },
  ],
};

const DEFAULT: Milestone[] = [
  { day: 1, body: 'The first day is the steepest — and you’re standing on the other side of it.', soul: 'One honest day is a real beginning. Grace meets the person who starts.' },
  { day: 7, body: 'A week in, the pattern’s grip measurably loosens.', soul: 'Small, repeated no’s become a strength you can feel.' },
  { day: 30, body: 'A month rewires the habit loop — it takes less and less to hold the line.', soul: 'What was a fight is becoming just how you live.' },
  { day: 90, body: 'Three months is a new baseline — the old pull is rare and quiet.', soul: 'You built this one day at a time. That’s the only way it’s ever built.' },
];

export function milestonesFor(type: ViceType): Milestone[] {
  return RECOVERY[type] ?? DEFAULT;
}

// Given clean days, split into what's been earned, the latest reached, and what's next.
export function timelineState(type: ViceType, cleanDays: number): { milestones: Milestone[]; latest: Milestone | null; next: Milestone | null } {
  const milestones = milestonesFor(type);
  const reached = milestones.filter((m) => cleanDays >= m.day);
  const next = milestones.find((m) => cleanDays < m.day) ?? null;
  return { milestones, latest: reached.length ? reached[reached.length - 1] : null, next };
}
