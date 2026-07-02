// Health data provider. On an iOS device this reads Apple HealthKit (HRV, RHR, sleep, steps,
// active energy) — the same layer Bevel/Oura/Whoop use. On web/Expo Go (no HealthKit), it returns
// a realistic mock so the Recovery UI + readiness math are fully testable. The HealthKit
// implementation is added at device-build time (needs a native module + a dev build, not Expo Go).
import { Platform } from 'react-native';
import type { HealthSnapshot } from './readiness';

// A believable snapshot for web/dev so the screen renders real-looking values.
function mockSnapshot(): HealthSnapshot {
  // Slightly randomised around plausible values so it doesn't look hard-coded.
  const j = (base: number, spread: number) => Math.round((base + (Math.random() - 0.5) * spread) * 10) / 10;
  return {
    hrv: j(52, 18),
    rhr: j(58, 8),
    respRate: j(14.5, 2),
    sleepHours: j(6.8, 2.2),
    sleepQuality: Math.round(j(72, 20)),
    steps: Math.round(j(7200, 4000)),
    activeEnergy: Math.round(j(480, 260)),
    strain: Math.round(j(45, 40)),
    baseline: { hrv: 55, rhr: 56 },
    source: 'mock',
  };
}

export async function getHealthSnapshot(): Promise<HealthSnapshot> {
  if (Platform.OS === 'ios') {
    try {
      // Device-only path. Lazy-require so the web/Go bundle never pulls the native module.
      // Wired at device-build time — see NATIVE-WRAPPER-GUIDE / EAS build steps.
      // const HK = require('@kingstinct/react-native-healthkit');
      // ...request permissions, read most-recent HRV/RHR/sleep/steps/energy, map to HealthSnapshot...
      return mockSnapshot();
    } catch {
      return mockSnapshot();
    }
  }
  // Android → Health Connect (also device-only); web/dev → mock.
  return mockSnapshot();
}

export const healthIsLive = false; // flips true once the HealthKit native module is wired in a dev build.
