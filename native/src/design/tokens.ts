// To Try — design tokens, ported faithfully from the PWA's :root CSS variables.
// One soul, applied everywhere. Every gap/size/colour should come from here, never an
// arbitrary value — that consistency is what makes the app read as "crafted".

export const colors = {
  // Surfaces (three-layer elevation: base / raised / overlay)
  bg: '#0C0C0E',
  bg2: '#131316',
  bg3: '#1A1A1F',
  bg4: '#222228',
  // Borders (hairlines over dark)
  bd: 'rgba(255,255,255,0.07)',
  bd2: 'rgba(255,255,255,0.13)',
  // Text
  tx: '#F2EFE8', // primary
  tx2: '#9A9490', // secondary
  tx3: '#5C5A55', // tertiary / quiet data-voice
  // Gold — the app's voice
  go: '#C8A96E',
  goBg: 'rgba(200,169,110,0.08)',
  goBd: 'rgba(200,169,110,0.28)',
  // Semantic accents
  re: '#C85A4E',
  reBg: 'rgba(200,90,78,0.10)',
  reBd: 'rgba(200,90,78,0.30)',
  gr: '#5BB97D',
  grBg: 'rgba(91,185,125,0.10)',
  grBd: 'rgba(91,185,125,0.28)',
  bl: '#6B97D6',
  blBg: 'rgba(107,151,214,0.10)',
  blBd: 'rgba(107,151,214,0.28)',
  pu: '#9B7EC0', // the soul / companion voice
  puBg: 'rgba(155,126,192,0.10)',
  puBd: 'rgba(155,126,192,0.28)',
} as const;

// Radius
export const radius = { card: 14, small: 8, pill: 100 } as const;

// Spacing scale — s1..s10. Use ONLY these.
export const space = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
} as const;

// Type scale — a deliberate ramp.
export const fontSize = {
  micro: 9,
  cap: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 26,
  hero: 38,
} as const;

// Font families (loaded in the root layout via @expo-google-fonts).
// Cormorant = the soul-voice (serif). DM Mono = the quiet data-voice.
export const fonts = {
  serif: 'Cormorant_500Medium',
  serifSemi: 'Cormorant_600SemiBold',
  serifItalic: 'Cormorant_500Medium_Italic',
  mono: 'DMMono_400Regular',
  monoMed: 'DMMono_500Medium',
  // Body sans falls back to the platform system font (San Francisco / Roboto) for legibility.
  body: undefined as undefined | string,
} as const;

// Motion — gentle iOS-style easing. Used with Reanimated withTiming/withSpring.
export const motion = {
  spring: { damping: 18, stiffness: 180, mass: 0.9 }, // confirms, never performs
  snappy: { damping: 14, stiffness: 260, mass: 0.8 }, // a little pop for small controls
  timing: 220,
} as const;

// Three-layer elevation as RN shadow objects (Apple HIG: base / raised / overlay).
export const elevation = {
  e1: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  e2: {
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  e3: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 48,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  gold: {
    shadowColor: colors.go,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
} as const;

// ── DAYPART ── the whole app breathes with the time of day.
export type Daypart = 'dawn' | 'day' | 'dusk' | 'night';

export function getDaypart(d: Date = new Date()): Daypart {
  const h = d.getHours();
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'dusk';
  return 'night';
}

// Aurora skins per daypart. RN has no radial gradient in expo-linear-gradient, so we
// approximate the PWA's radial auroras with layered linear gradients (a glow colour
// fading from the top, a second from the bottom, over a base). Refined later with SVG.
export const aurora: Record<
  Daypart,
  { base: [string, string]; glowTop: string; glowBottom: string; greeting: string }
> = {
  dawn: {
    base: ['#1b1518', '#100c10'],
    glowTop: 'rgba(255,183,107,0.26)',
    glowBottom: 'rgba(200,140,150,0.18)',
    greeting: 'Good morning',
  },
  day: {
    base: ['#16161c', '#0e0e13'],
    glowTop: 'rgba(200,169,110,0.22)',
    glowBottom: 'rgba(120,150,180,0.16)',
    greeting: "How's the day going?",
  },
  dusk: {
    base: ['#191319', '#0f0c12'],
    glowTop: 'rgba(220,130,90,0.24)',
    glowBottom: 'rgba(140,107,182,0.22)',
    greeting: 'Good evening',
  },
  night: {
    base: ['#101018', '#08080d'],
    glowTop: 'rgba(120,130,200,0.20)',
    glowBottom: 'rgba(90,80,150,0.20)',
    greeting: 'Still up?',
  },
};
