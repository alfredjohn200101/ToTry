// THE FEELING DOOR — the entry through emotion. Each feeling carries the struggle name +
// the evidence-based spine that best fits it, so the companion meets the person rightly.
import { COMPANION_MECHANISMS } from './clinicalSpines';
import type { Struggle } from './companionPrompt';

export type Feeling = {
  id: string;
  emoji: string;
  label: string;
  sub: string;
  struggle: Struggle;
  affirm?: boolean; // 'good' — celebrate, don't treat as a problem
};

export const FEELINGS: Feeling[] = [
  { id: 'pull', emoji: '🌊', label: 'The pull', sub: 'tempted, craving', struggle: { name: 'a craving pulling at you', spine: COMPANION_MECHANISMS.wave.spine } },
  { id: 'restless', emoji: '⚡', label: 'Restless', sub: "can't settle, antsy", struggle: { name: 'restlessness', spine: COMPANION_MECHANISMS.ground.spine } },
  { id: 'flat', emoji: '🌫️', label: 'Flat', sub: "numb, can't be bothered", struggle: { name: 'feeling flat and numb', spine: COMPANION_MECHANISMS.defuse.spine } },
  { id: 'anxious', emoji: '🌀', label: 'Anxious', sub: 'tense, spinning', struggle: { name: 'anxiety', spine: COMPANION_MECHANISMS.ground.spine } },
  { id: 'down', emoji: '🌧️', label: 'Heavy', sub: 'low, sad, defeated', struggle: { name: 'a heaviness, feeling low', spine: COMPANION_MECHANISMS.ground.spine } },
  { id: 'procrast', emoji: '🍯', label: 'Avoiding', sub: 'putting something off', struggle: { name: 'avoiding something', spine: COMPANION_MECHANISMS.reframe.spine } },
  { id: 'angry', emoji: '🔥', label: 'Fired up', sub: 'angry, frustrated', struggle: { name: 'anger, frustration', spine: COMPANION_MECHANISMS.ground.spine } },
  {
    id: 'good',
    emoji: '✨',
    label: 'Actually good',
    sub: 'steady, grateful',
    affirm: true,
    struggle: {
      name: 'a good, steady moment',
      spine:
        'They are doing WELL right now — steady, grateful. This is NOT a struggle and there is no problem to solve. Celebrate it briefly and sincerely, reflect their good state back to them, and if it fits, invite one small way to carry it forward or give thanks. Keep it warm and short; never invent a problem.',
    },
  },
];
