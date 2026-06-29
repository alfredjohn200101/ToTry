import { Pressable } from 'react-native';
import { Card } from '@/design/Card';
import { Text } from '@/design/Text';
import { space } from '@/design/tokens';

export function HubItem({ title, sub, onPress }: { title: string; sub: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ marginTop: space.s3 }, pressed && { opacity: 0.7 }]}>
      <Card>
        <Text variant="title" style={{ fontSize: 20 }}>
          {title}
        </Text>
        <Text variant="sub" style={{ marginTop: space.s2 }}>
          {sub}
        </Text>
      </Card>
    </Pressable>
  );
}
