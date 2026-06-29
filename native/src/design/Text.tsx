// Typed text. The serif (Cormorant) is reserved for the sacred — the hero greeting,
// screen titles, scripture. Everything functional uses the crisp system font (SF Pro),
// the way premium iOS apps do. DM Mono appears only for true data (numbers).
import { Text as RNText, TextProps, StyleSheet, TextStyle } from 'react-native';
import { colors, fonts, fontSize } from './tokens';

type Variant =
  | 'display' // serif hero — the front-door voice
  | 'title' // serif screen title (regal)
  | 'verse' // serif italic — scripture / soul copy
  | 'body' // system body (17)
  | 'callout' // system 16 secondary
  | 'subhead' // system 15 secondary
  | 'footnote' // system 13 quiet
  | 'eyebrow' // system uppercase label (replaces the mono eyebrows)
  | 'data' // mono — numbers/stats only
  | 'micro';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.serif, fontSize: fontSize.display, color: colors.tx, lineHeight: fontSize.display * 1.02, letterSpacing: 0.2 },
  title: { fontFamily: fonts.serif, fontSize: fontSize.title1, color: colors.tx, lineHeight: fontSize.title1 * 1.08 },
  verse: { fontFamily: fonts.serifItalic, fontSize: fontSize.title3, color: colors.tx2, lineHeight: fontSize.title3 * 1.5 },
  body: { fontFamily: fonts.system, fontSize: fontSize.body, color: colors.tx, lineHeight: fontSize.body * 1.45 },
  callout: { fontFamily: fonts.system, fontSize: fontSize.callout, color: colors.tx2, lineHeight: fontSize.callout * 1.5 },
  subhead: { fontFamily: fonts.system, fontSize: fontSize.subhead, color: colors.tx2, lineHeight: fontSize.subhead * 1.5 },
  footnote: { fontFamily: fonts.system, fontSize: fontSize.footnote, color: colors.tx3, lineHeight: fontSize.footnote * 1.5 },
  eyebrow: {
    fontFamily: fonts.system,
    fontSize: fontSize.caption,
    color: colors.tx3,
    fontWeight: '600',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  data: { fontFamily: fonts.monoMed, fontSize: fontSize.title3, color: colors.tx, letterSpacing: 0.5 },
  micro: { fontFamily: fonts.system, fontSize: fontSize.caption2, color: colors.tx3, letterSpacing: 0.4 },
};

export function Text({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  return <RNText style={[styles.base, variants[variant], color ? { color } : null, style]} {...rest} />;
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false } as TextStyle,
});
