// An ornamental gold divider — a hairline with a center diamond, like a missal flourish.
// Quiet liturgical regality. Use under a title or between movements.
import { View, StyleSheet } from 'react-native';
import { colors, space } from './tokens';

export function Flourish({ align = 'left', width = 64 }: { align?: 'left' | 'center'; width?: number }) {
  return (
    <View style={[styles.wrap, { alignSelf: align === 'center' ? 'center' : 'flex-start', width }]}>
      <View style={styles.line} />
      <View style={styles.diamond} />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: space.s2, marginTop: space.s3 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.goBd },
  diamond: { width: 5, height: 5, backgroundColor: colors.go, transform: [{ rotate: '45deg' }] },
});
