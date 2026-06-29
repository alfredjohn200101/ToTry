import { Pressable, View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Card } from '@/design/Card';
import { Text } from '@/design/Text';
import { colors, space } from '@/design/tokens';

export function HubItem({ title, sub, onPress }: { title: string; sub: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ marginTop: space.s3 }, pressed && { opacity: 0.6 }]}>
      <Card style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Cormorant_600SemiBold', fontSize: 22, color: colors.tx }}>{title}</Text>
          <Text variant="subhead" style={{ marginTop: 3 }}>
            {sub}
          </Text>
        </View>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.tx3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 6l6 6-6 6" />
        </Svg>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
});
