import { Tabs } from 'expo-router';
import { Platform, ColorValue } from 'react-native';
import { Icon, IconName } from '@/design/Icon';
import { colors, fonts, fontSize } from '@/design/tokens';

function tab(name: IconName) {
  return ({ color }: { color: ColorValue }) => <Icon name={name} color={color as string} size={22} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.go,
        tabBarInactiveTintColor: colors.tx3,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.bd,
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.mono,
          fontSize: fontSize.micro,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tab('today') }} />
      <Tabs.Screen name="soul" options={{ title: 'Soul', tabBarIcon: tab('soul') }} />
      <Tabs.Screen name="grow" options={{ title: 'Grow', tabBarIcon: tab('grow') }} />
      <Tabs.Screen name="money" options={{ title: 'Money', tabBarIcon: tab('money') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tab('settings') }} />
    </Tabs>
  );
}
