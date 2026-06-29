// The clinical spines — the companion's KNOWLEDGE (real protocols: urge surfing/MBRP,
// ACT defusion, behavioral interruption/ERP, grounding, CBT cognitive restructuring).
// PORTED VERBATIM from the PWA. These are not rigid scripts — the AI recognizes the shape
// of what the person describes and applies the fitting mechanism in its own warm words.
// DO NOT paraphrase: this wording is tuned.

export type MechanismKey = 'wave' | 'defuse' | 'interrupt' | 'ground' | 'reframe';

export const COMPANION_MECHANISMS: Record<MechanismKey, { label: string; spine: string }> = {
  wave: {
    label: 'Riding the wave',
    spine:
      "This is a CRAVING that peaks and passes (urge surfing / MBRP, Marlatt). Most urges crest and fade within 15-30 minutes if not acted on, and weaken each time they're ridden out. Help them NAME it ('I'm noticing an urge'), locate the physical sensation in the body, breathe slowly (4-7-8), and understand they don't have to act - they just have to outlast the wave. Ground with cold water, movement, a change of room. Never shame. The urge is not them.",
  },
  defuse: {
    label: 'Stepping back from the thought',
    spine:
      "This is RUMINATION / tangled thought (ACT cognitive defusion). The goal is NOT to argue with the thought or distract from it, but to un-fuse from it - create distance. Help them say 'I'm having the thought that...', picture the thought as a leaf on a stream that floats past, zoom out, thank the mind for the thought. Thoughts are mental events, not commands or facts. Help them step back and watch it rather than be inside it.",
  },
  interrupt: {
    label: 'Breaking the loop',
    spine:
      "This is a COMPULSIVE BEHAVIORAL loop (CBT/ERP, OCD-framing). It's a compulsion, not a moral failure - removing shame is central. Help them physically INTERRUPT and redirect: change environment immediately, engage the senses (cold water, 5-4-3-2-1 grounding), do a values-based alternative action right now (move, step outside, call someone). The urge is intrusive, not chosen. They resist by not acting and letting it pass, gently.",
  },
  ground: {
    label: 'Coming back to now',
    spine:
      'This is DISTRESS / panic / overwhelm (grounding). Bring them into the present body: 5-4-3-2-1 (5 things you see, 4 touch, 3 hear, 2 smell, 1 taste), box breathing (in 4, hold 4, out 4, hold 4), feet on the floor, cold water. Slow everything down. They are safe in this moment.',
  },
  reframe: {
    label: 'Catching the thought',
    spine:
      "This is the JUSTIFYING THOUGHT that comes right before a slip (CBT cognitive restructuring — the most evidence-backed technique). The mind offers a permission-giving distortion: 'just once won't matter', 'I deserve this', 'I've already ruined today so why not', 'I'll start fresh tomorrow', 'I can't cope without it'. Gently help them CATCH the specific thought and say it out loud, then CHALLENGE it like an older sibling who loves them would — is that actually true? Has 'just once' been true before? Do they really need it, or is the discomfort just unfamiliar? — then REPLACE it with what's truer: 'this feeling will pass whether or not I act', 'one choice doesn't erase the day', 'I can sit with this'. Never lecture; ask the question that lets THEM see the distortion. The thought is not a command and not a fact.",
  },
};

// Map a vice/struggle type to the best mechanism — ported from _mechanismForType.
export function mechanismForType(type: string): MechanismKey {
  if (type === 'overthinking' || type === 'anxiety') return 'defuse';
  if (type === 'porn') return 'interrupt';
  if (type === 'scrolling') return 'interrupt';
  if (type === 'nicotine' || type === 'alcohol' || type === 'gambling' || type === 'food') return 'wave';
  return 'ground';
}
