import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CompanionSheet } from '@/components/CompanionSheet';
import { useFonts } from 'expo-font';
import {
  Cormorant_500Medium,
  Cormorant_500Medium_Italic,
  Cormorant_600SemiBold,
} from '@expo-google-fonts/cormorant';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { colors } from '@/design/tokens';
import { hydrateStore } from '@/data/store';
import { getHealthSnapshot } from '@/health/provider';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    Cormorant_500Medium,
    Cormorant_500Medium_Italic,
    Cormorant_600SemiBold,
    DMMono_400Regular,
    DMMono_500Medium,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  // Hydrate the local-first store before first render so every screen reads real data synchronously.
  const [storeReady, setStoreReady] = useState(false);
  useEffect(() => {
    hydrateStore()
      .then(() => {
        setStoreReady(true);
        // Warm the recovery cache app-wide so getLifeState() has it (moat threads, no spinner).
        getHealthSnapshot().catch(() => {});
      })
      .catch(() => setStoreReady(true));
  }, []);

  const ready = loaded && storeReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        {/* The companion lives here, once, reachable from the orb on every tab. */}
        <CompanionSheet />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
