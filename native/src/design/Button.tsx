// Actions. Primary = gilded gold: a subtle metal gradient + a lit top sheen + SF semibold.
// Clean and Apple-prominent, not a flat slab and not a heavy webby gradient.
import { Pressable, StyleSheet, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { colors, radius, space, fontSize, elevation, fonts } from './tokens';

export function Button({
  label,
  onPress,
  tone = 'primary',
  style,
}: {
  label: string;
  onPress?: () => void;
  tone?: 'primary' | 'ghost';
  style?: ViewStyle;
}) {
  const press = () => {
    if (process.env.EXPO_OS !== 'web') Haptics.selectionAsync().catch(() => {});
    onPress?.();
  };

  return (
    <Pressable onPress={press} style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] }, style]}>
      {tone === 'primary' ? (
        <View style={[styles.base, elevation.gold, { overflow: 'hidden' }]}>
          <LinearGradient colors={[colors.go, colors.goDeep]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={[colors.highlightStrong, 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.sheen} pointerEvents="none" />
          <Text style={[styles.label, { color: '#231803' }]}>{label}</Text>
        </View>
      ) : (
        <View style={[styles.base, styles.ghost]}>
          <Text style={[styles.label, { color: colors.tx2 }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.sm + 2, borderCurve: 'continuous' },
  base: {
    borderRadius: radius.sm + 2,
    borderCurve: 'continuous',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.s5,
  },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 22 },
  ghost: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2 },
  label: { fontFamily: fonts.sansSemi, fontSize: fontSize.callout, letterSpacing: 0.2 },
});
