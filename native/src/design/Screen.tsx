// Base screen scaffold: daypart aurora, a quiet wordmark, scrolling body, the orb
// (lifted clear above the glass tab bar).
import { ReactNode } from 'react';
import { ScrollView, View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from './Aurora';
import { Text } from './Text';
import { colors, space, getDaypart } from './tokens';
import { Orb } from '@/components/Orb';

export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 68;

export function Screen({
  children,
  showOrb = true,
  showWordmark = true,
}: {
  children: ReactNode;
  showOrb?: boolean;
  showWordmark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Aurora daypart={getDaypart()} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space.s4,
          paddingBottom: TAB_BAR_HEIGHT + space.s10,
          paddingHorizontal: space.s5,
        }}
        showsVerticalScrollIndicator={false}
      >
        {showWordmark && (
          <View style={styles.wordmark}>
            <Text style={{ fontFamily: 'CormorantGaramond_500Medium', fontSize: 20, color: colors.tx }}>
              To <Text style={{ fontFamily: 'CormorantGaramond_500Medium_Italic', fontSize: 20, color: colors.go }}>Try</Text>
            </Text>
          </View>
        )}
        {children}
      </ScrollView>
      {showOrb && <Orb bottom={insets.bottom + TAB_BAR_HEIGHT + space.s3} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  wordmark: { marginBottom: space.s5, alignItems: 'flex-start' },
});
