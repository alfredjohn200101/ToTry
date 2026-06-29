// A raised card — the second elevation layer. Quiet depth, never loud.
import { View, ViewProps, StyleSheet } from 'react-native';
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

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    padding: space.s5,
    borderWidth: StyleSheet.hairlineWidth,
  },
  raised: { backgroundColor: colors.bg2, borderColor: colors.bd },
  flat: { backgroundColor: colors.bg3, borderColor: colors.bd },
  gold: { backgroundColor: colors.goBg, borderColor: colors.goBd },
});
