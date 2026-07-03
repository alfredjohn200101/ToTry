// Per-vice-type care. Different vices grip differently, recover differently, and some are better
// kept in check than quit outright — so the Fight domain must not give one generic treatment.
// Each type carries: an accent + glyph (its own visual identity), an evidence-aware recovery line
// (what staying clean is actually doing — grace-first, never fear-based), a note for when it's
// being moderated rather than quit, and a lean (does this vice usually suit quitting or moderating).
import { colors } from '@/design/tokens';
import type { IconName } from '@/design/Icon';
import type { ViceType, ViceMode } from './model';

export type ViceLean = 'quit' | 'moderate' | 'either';

export type ViceInfo = {
  label: string;
  accent: string;
  icon: IconName;
  recovery: string; // what abstaining is doing for them — type-specific, evidence-aware
  moderateNote: string; // framing when kept in check rather than quit
  lean: ViceLean;
};

export const VICE_KNOWLEDGE: Record<ViceType, ViceInfo> = {
  porn: {
    label: 'Purity',
    accent: colors.pu,
    icon: 'flame',
    recovery: "Off it, your reward system rebalances — motivation, focus and real intimacy return over weeks, not days. The early urges are the loudest; they shrink.",
    moderateNote: 'This is one most find no peace in half-measures — zero is usually kinder than a limit.',
    lean: 'quit',
  },
  scrolling: {
    label: 'Attention',
    accent: colors.bl,
    icon: 'clock',
    recovery: 'Less scrolling hands your attention back — the restless, can’t-settle feeling fades and time quietly reappears in your day.',
    moderateNote: 'A daily window often works better here than all-or-nothing. Keep it deliberate, not endless.',
    lean: 'moderate',
  },
  nicotine: {
    label: 'Breath',
    accent: colors.gr,
    icon: 'leaf',
    recovery: 'Within days circulation and taste come back; cravings spike hard in the first week, then genuinely ease. Each one you ride is the withdrawal passing.',
    moderateNote: 'Cutting down is a real step — but nicotine pulls back toward more. A firm limit matters.',
    lean: 'quit',
  },
  alcohol: {
    label: 'Clarity',
    accent: colors.go,
    icon: 'moon',
    recovery: 'Sleep, mood and your liver recover; the first few nights are the hardest, then it lifts. Steadier mornings are the reward.',
    moderateNote: 'Many do well keeping this within a weekly limit. If it keeps slipping past, quitting may be the freer road.',
    lean: 'either',
  },
  gambling: {
    label: 'Freedom',
    accent: colors.re,
    icon: 'pulse',
    recovery: 'The urge runs in waves; each one you outlast teaches your brain the storm always passes. The reclaimed money is real ground regained.',
    moderateNote: 'Gambling rarely stays inside a limit once it starts. Zero is usually the safer aim.',
    lean: 'quit',
  },
  food: {
    label: 'Nourish',
    accent: colors.gr,
    icon: 'leaf',
    recovery: 'This isn’t about restriction — it’s steadier energy and a calmer relationship with food. Gentleness beats willpower here.',
    moderateNote: 'Food is meant to be enjoyed, not quit. Keeping it in check — not zero — is the healthy aim.',
    lean: 'moderate',
  },
  overthinking: {
    label: 'Stillness',
    accent: colors.bl,
    icon: 'pulse',
    recovery: 'You’re learning a thought isn’t a command. Space grows between you and the spiral each time you don’t chase it.',
    moderateNote: 'This isn’t a habit to quit so much as a pattern to soften. Notice it, don’t fight it.',
    lean: 'either',
  },
  anxiety: {
    label: 'Peace',
    accent: colors.pu,
    icon: 'pulse',
    recovery: 'Each time you stay with it instead of escaping, your body learns the fear passes on its own. That’s the whole cure, repeated.',
    moderateNote: 'Not something to quit — something to meet. Small, steady exposure is how it loosens.',
    lean: 'either',
  },
  anger: {
    label: 'Patience',
    accent: colors.re,
    icon: 'flame',
    recovery: 'The pause between trigger and reaction is a muscle. Every time you use it, it gets stronger and the fuse gets longer.',
    moderateNote: 'Anger isn’t quit, it’s governed. The win is the pause, not never feeling it.',
    lean: 'either',
  },
  other: {
    label: 'The fight',
    accent: colors.go,
    icon: 'flame',
    recovery: 'Every urge you outlast rewires the pattern a little more. Consistency, not perfection, is what changes it.',
    moderateNote: 'Whether you’re quitting or keeping it in check, the reps are what count.',
    lean: 'either',
  },
};

export function viceInfo(type: ViceType): ViceInfo {
  return VICE_KNOWLEDGE[type] ?? VICE_KNOWLEDGE.other;
}

// Language that respects the goal: "clean" for quitting, "on track" for moderating.
export function streakWord(mode: ViceMode): { clean: string; slip: string } {
  return mode === 'moderate'
    ? { clean: 'on track', slip: 'over the line' }
    : { clean: 'clean', slip: 'a fresh start' };
}
