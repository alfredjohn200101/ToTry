// Surfaces. Warm gradient fill + a lit-from-above inner sheen + continuous corners +
// soft diffuse depth — the layered richness of the original, with Apple-grade craft.
// GlassCard is a true frosted material (blur) for floating/overlay surfaces.
import { ReactNode } from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, radius, space, elevation } from './tokens';

export function Card({
  children,
  style,
  tone = 'raised',
  ...rest
}: ViewProps & { tone?: 'raised' | 'flat' | 'gold'; children?: ReactNode }) {
  const fill =
    tone === 'gold'
      ? ([colors.cardTop, colors.cardBottom] as const)
      : tone === 'flat'
        ? (['#1C1915', '#16130E'] as const)
        : ([colors.cardTop, colors.cardBottom] as const);
  const sheen = tone === 'gold' ? 'rgba(201,167,94,0.12)' : colors.highlight;

  return (
    <View
      style={[styles.base, tone === 'gold' ? styles.goldBorder : styles.border, elevation.e1, style]}
      {...rest}
    >
      <LinearGradient colors={fill} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      {/* lit-from-above sheen — soft highlight fading from the top edge */}
      <LinearGradient
        colors={[sheen, 'transparent']}
        style={[styles.sheen, { pointerEvents: 'none' }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {children}
    </View>
  );
}

export function GlassCard({ children, style, intensity = 30, ...rest }: ViewProps & { intensity?: number; children?: ReactNode }) {
  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.base, styles.border, elevation.e1, style]} {...rest}>
      <LinearGradient colors={[colors.highlight, 'transparent']} style={[styles.sheen, { pointerEvents: 'none' }]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      {children}
    </BlurView>
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
  border: { borderColor: colors.hairline, backgroundColor: colors.bg2 },
  goldBorder: { borderColor: colors.goBd, backgroundColor: colors.bg2 },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 64 },
});
