import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet, ColorValue } from 'react-native';
import { BlurView } from 'expo-blur';
import { Icon, IconName } from '@/design/Icon';
import { colors } from '@/design/tokens';

function tab(name: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Icon name={name} color={color as string} size={25} strokeWidth={focused ? 1.9 : 1.5} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.go,
        tabBarInactiveTintColor: colors.tx3,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: colors.hairline,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 90 : 68,
          paddingTop: 10,
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(11,10,9,0.55)' }]} />
          </BlurView>
        ),
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '500', letterSpacing: 0.2, marginTop: 2 },
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
