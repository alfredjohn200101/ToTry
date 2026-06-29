// Actions. Primary = gilded gold with a soft top-sheen (precious, not a flat slab).
// Ghost = a quiet glass-edged option. Crisp system label, continuous corners.
import { Pressable, StyleSheet, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { colors, radius, space, fontSize, elevation } from './tokens';

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
    <Pressable
      onPress={press}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }, style]}
    >
      {tone === 'primary' ? (
        <LinearGradient colors={[colors.goSoft, colors.go, colors.goDeep]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[styles.base, elevation.gold]}>
          <Text style={[styles.label, { color: '#231803' }]}>{label}</Text>
        </LinearGradient>
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
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.s5,
  },
  ghost: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2 },
  label: { fontFamily: undefined, fontSize: fontSize.callout, fontWeight: '600', letterSpacing: 0.2 },
});
