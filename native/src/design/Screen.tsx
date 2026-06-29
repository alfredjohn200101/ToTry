// Base screen scaffold: daypart aurora background, brand header, scrolling body, the orb.
import { ReactNode } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from './Aurora';
import { Text } from './Text';
import { colors, space, getDaypart } from './tokens';
import { Orb } from '@/components/Orb';

export function Screen({
  children,
  showOrb = true,
  showHeader = true,
  auroraIntensity = 1,
}: {
  children: ReactNode;
  showOrb?: boolean;
  showHeader?: boolean;
  auroraIntensity?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Aurora daypart={getDaypart()} intensity={auroraIntensity} />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space.s4, paddingBottom: space.s10 * 2, paddingHorizontal: space.s5 }}
        showsVerticalScrollIndicator={false}
      >
        {showHeader && (
          <View style={styles.header}>
            <Text variant="title" style={{ fontSize: 22 }}>
              To <Text variant="title" color={colors.go} style={{ fontSize: 22, fontStyle: 'italic' }}>Try</Text>
            </Text>
            <Text variant="micro" style={{ marginTop: 2 }}>
              BY ALFRED JOHN
            </Text>
          </View>
        )}
        {children}
      </ScrollView>
      {showOrb && <Orb bottom={insets.bottom + space.s5} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { marginBottom: space.s6 },
});
