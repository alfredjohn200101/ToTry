// Surfaces. Raised cards with continuous (squircle) corners and soft, diffuse depth.
// GlassCard is a true iOS frosted material (blur) for floating/overlay surfaces.
import { View, ViewProps, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius, space, elevation } from './tokens';

export function Card({
  style,
  tone = 'raised',
  ...rest
}: ViewProps & { tone?: 'raised' | 'flat' | 'gold' }) {
  return (
    <View
      style={[
        styles.base,
        tone === 'raised' && [styles.raised, elevation.e1],
        tone === 'flat' && styles.flat,
        tone === 'gold' && styles.gold,
        style,
      ]}
      {...rest}
    />
  );
}

export function GlassCard({ style, intensity = 28, ...rest }: ViewProps & { intensity?: number }) {
  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.base, styles.glass, elevation.e1, style]} {...rest} />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: space.s5,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  raised: { backgroundColor: colors.bg2, borderColor: colors.hairline },
  flat: { backgroundColor: colors.bg3, borderColor: colors.hairline },
  gold: { backgroundColor: colors.goBg, borderColor: colors.goBd },
  glass: { backgroundColor: colors.glass, borderColor: colors.bd2 },
});
