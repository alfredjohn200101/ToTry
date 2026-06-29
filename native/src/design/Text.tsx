// Typed text primitives. The serif is the soul-voice; mono is the quiet data-voice.
import { Text as RNText, TextProps, StyleSheet, TextStyle } from 'react-native';
import { colors, fonts, fontSize } from './tokens';

type Variant =
  | 'hero' // big serif — the front-door voice
  | 'title' // serif section heading
  | 'serif' // serif body (verses, soul copy)
  | 'body' // sans body
  | 'sub' // secondary sans
  | 'label' // mono uppercase eyebrow
  | 'data' // mono numbers/quiet data
  | 'micro'; // tiny mono caption

const variants: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.serifSemi, fontSize: fontSize.hero, color: colors.tx, lineHeight: fontSize.hero * 1.05 },
  title: { fontFamily: fonts.serifSemi, fontSize: fontSize.xxl, color: colors.tx, lineHeight: fontSize.xxl * 1.1 },
  serif: { fontFamily: fonts.serifItalic, fontSize: fontSize.lg, color: colors.tx2, lineHeight: fontSize.lg * 1.5 },
  body: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.tx, lineHeight: fontSize.md * 1.55 },
  sub: { fontFamily: fonts.body, fontSize: fontSize.base, color: colors.tx2, lineHeight: fontSize.base * 1.6 },
  label: {
    fontFamily: fonts.mono,
    fontSize: fontSize.cap,
    color: colors.tx3,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  data: { fontFamily: fonts.monoMed, fontSize: fontSize.lg, color: colors.tx },
  micro: { fontFamily: fonts.mono, fontSize: fontSize.micro, color: colors.tx3, letterSpacing: 0.8 },
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
