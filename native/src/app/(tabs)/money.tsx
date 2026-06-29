import { View } from 'react-native';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { colors, space } from '@/design/tokens';

export default function Money() {
  return (
    <Screen>
      <Text variant="title">Stewardship</Text>
      <Text variant="callout" style={{ marginTop: space.s2 }}>
        Money is freedom, not just numbers. Every dollar reclaimed from a vice, every debt paid down, is a chain off
        your shoulders. Steward it well.
      </Text>

      <View style={{ flexDirection: 'row', gap: space.s3, marginTop: space.s4 }}>
        <Card tone="flat" style={{ flex: 1 }}>
          <Text variant="eyebrow">DEBT LEFT</Text>
          <Text variant="data" style={{ marginTop: space.s2, fontSize: 22 }} color={colors.re}>
            $0
          </Text>
        </Card>
        <Card tone="flat" style={{ flex: 1 }}>
          <Text variant="eyebrow">PAID OFF</Text>
          <Text variant="data" style={{ marginTop: space.s2, fontSize: 22 }} color={colors.gr}>
            $0
          </Text>
        </Card>
      </View>

      <Card tone="gold" style={{ marginTop: space.s4, alignItems: 'center' }}>
        <Text variant="data" style={{ fontSize: 30 }} color={colors.gr}>
          $0
        </Text>
        <Text variant="eyebrow" style={{ marginTop: space.s2 }}>
          SAVED BY QUITTING VICES
        </Text>
      </Card>
    </Screen>
  );
}
