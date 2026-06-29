// Primary gold action, and a quiet ghost variant.
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { colors, radius, space, fonts, fontSize, elevation } from './tokens';

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
      style={({ pressed }) => [
        styles.base,
        tone === 'primary' && [styles.primary, elevation.gold],
        tone === 'ghost' && styles.ghost,
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.monoMed,
          fontSize: fontSize.md,
          letterSpacing: 0.3,
          color: tone === 'primary' ? '#1A1205' : colors.tx2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.card, paddingVertical: space.s4, paddingHorizontal: space.s5, alignItems: 'center' },
  primary: { backgroundColor: colors.go },
  ghost: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2 },
});
