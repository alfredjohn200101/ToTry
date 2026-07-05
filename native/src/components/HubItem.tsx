import { Pressable, View, StyleSheet } from 'react-native';
import { Card } from '@/design/Card';
import { Text } from '@/design/Text';
import { Icon, IconName } from '@/design/Icon';
import { colors, space, radius } from '@/design/tokens';

// An ornate iOS row: a gilded medallion (gold-framed icon) + serif title + subtitle + chevron.
export function HubItem({
  title,
  sub,
  icon,
  onPress,
}: {
  title: string;
  sub: string;
  icon: IconName;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ marginTop: space.s3 }, pressed && { opacity: 0.6 }]}>
      <Card style={styles.row}>
        <View style={styles.medallion}>
          <Icon name={icon} size={22} color={colors.go} strokeWidth={1.6} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'CormorantGaramond_500Medium', fontSize: 24, color: colors.tx, letterSpacing: -0.2 }}>{title}</Text>
          <Text variant="subhead" style={{ marginTop: 2 }}>
            {sub}
          </Text>
        </View>
        <Icon name="chevron" size={17} color={colors.tx3} strokeWidth={2} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s4, paddingVertical: space.s4 },
  medallion: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.goBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.goBd,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
