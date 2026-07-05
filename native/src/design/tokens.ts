// To Try — design tokens. True-iOS materials with a regal, liturgical weight.
// Deep warm darkness · gold as gilding (precious, sparing) · serif for the sacred,
// system sans for everything functional · real glass depth · continuous corners.

export const colors = {
  // Surfaces — warm near-black, layered (base / raised / overlay)
  bg: '#0B0A09', // warm ink, not flat black
  bg2: '#151310', // raised
  bg3: '#1E1B17', // higher
  bg4: '#28241F',
  glass: 'rgba(28,25,21,0.72)', // frosted material tint (over blur)
  glassHi: 'rgba(40,36,30,0.55)',
  // Borders / gilding hairlines
  bd: 'rgba(255,250,240,0.06)',
  bd2: 'rgba(255,250,240,0.12)',
  hairline: 'rgba(255,250,240,0.08)',
  // Lit-from-above inner highlight (the premium "crafted" sheen on every surface)
  highlight: 'rgba(255,250,240,0.055)',
  highlightStrong: 'rgba(255,250,240,0.10)',
  // Subtle card fill gradient (warm, lit at the top)
  cardTop: '#1A1713',
  cardBottom: '#121009',
  // Text — warm ivory ramp
  tx: '#F4F0E8',
  tx2: '#A7A097', // secondary
  tx3: '#6E665C', // tertiary / quiet
  // Gold — the gilding. Used sparingly, like precious metal.
  go: '#C9A75E', // primary gold
  goSoft: '#E6CE92', // sheen highlight (gradient top)
  goDeep: '#A8863F', // engraved / gradient bottom
  goBg: 'rgba(201,167,94,0.07)',
  goBd: 'rgba(201,167,94,0.30)',
  // Semantic
  re: '#CC6A5A',
  reBg: 'rgba(204,106,90,0.10)',
  reBd: 'rgba(204,106,90,0.30)',
  gr: '#6FBF8C',
  grBg: 'rgba(111,191,140,0.10)',
  grBd: 'rgba(111,191,140,0.28)',
  bl: '#7FA6DE',
  pu: '#A98FCB', // the soul / companion voice
  puBd: 'rgba(169,143,203,0.30)',
} as const;

// Continuous-corner radii (squircle on iOS via borderCurve).
export const radius = { sm: 12, card: 20, lg: 26, hero: 28, pill: 999 } as const;

// Spacing scale — 4pt base. Use ONLY these.
export const space = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s7: 28, s8: 32, s10: 40, s12: 48 } as const;

// Type scale — the iOS ramp (points). Legible, generous.
export const fontSize = {
  caption2: 11,
  caption: 12,
  footnote: 13,
  subhead: 15,
  callout: 16,
  body: 17,
  title3: 20,
  title2: 24,
  title1: 30,
  largeTitle: 36,
  display: 44, // serif hero
} as const;

// Fonts — the PWA's purposeful system, matched exactly. Outfit = functional UI (geometric, clean,
// intentional); Cormorant Garamond = the sacred/soul-voice, kept LIGHT (500/400, never heavy);
// DM Mono = labels, eyebrows and true numbers (a signature — used generously). Nothing generic.
export const fonts = {
  serif: 'CormorantGaramond_500Medium',
  serifMed: 'CormorantGaramond_400Regular',
  serifItalic: 'CormorantGaramond_500Medium_Italic',
  sans: 'Outfit_400Regular',
  sansMed: 'Outfit_500Medium',
  sansSemi: 'Outfit_600SemiBold',
  mono: 'DMMono_400Regular',
  monoMed: 'DMMono_500Medium',
  system: 'Outfit_400Regular' as string | undefined, // back-compat alias -> Outfit
} as const;

// Motion — gentle iOS spring.
export const motion = {
  spring: { damping: 20, stiffness: 200, mass: 0.9 },
  snappy: { damping: 16, stiffness: 280, mass: 0.8 },
  timing: 240,
} as const;

// Premium depth — soft, large, diffuse. Quiet float, never harsh.
export const elevation = {
  e1: { shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  e2: { shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  e3: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 56, shadowOffset: { width: 0, height: 22 }, elevation: 20 },
  gold: { shadowColor: colors.go, shadowOpacity: 0.32, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
} as const;

// ── DAYPART ── the whole app breathes with the time of day. Subtle ambient glow.
export type Daypart = 'dawn' | 'day' | 'dusk' | 'night';

export function getDaypart(d: Date = new Date()): Daypart {
  const h = d.getHours();
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'dusk';
  return 'night';
}

// Aurora skins — a soft radial glow (top) over a warm vertical base. Restrained, candlelit.
export const aurora: Record<
  Daypart,
  { base: [string, string]; glow: string; glow2: string; greeting: string }
> = {
  dawn: { base: ['#191512', '#0B0A09'], glow: 'rgba(230,170,110,0.18)', glow2: 'rgba(180,130,140,0.10)', greeting: 'Good morning' },
  day: { base: ['#16140F', '#0B0A09'], glow: 'rgba(201,167,94,0.16)', glow2: 'rgba(120,140,170,0.08)', greeting: "How's the day going?" },
  dusk: { base: ['#181210', '#0B0A09'], glow: 'rgba(210,120,80,0.17)', glow2: 'rgba(140,107,182,0.13)', greeting: 'Good evening' },
  night: { base: ['#0F0E15', '#070709'], glow: 'rgba(120,130,200,0.13)', glow2: 'rgba(90,80,150,0.12)', greeting: 'Still up?' },
};
