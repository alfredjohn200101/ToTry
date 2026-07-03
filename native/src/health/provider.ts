// The health layer. A person's recovery numbers (HRV, resting HR, sleep, respiratory rate, steps,
// active energy) come from whatever they already wear — an Apple Watch, a Garmin, a Wear OS watch,
// a ring — and land in the phone's health store: Apple Health on iOS, Health Connect on Android.
// We read that store, so almost everyone is covered without a per-brand integration. For people who
// want it, a direct Garmin connection can add richer data. On web/Expo Go (no native store) we
// return a realistic mock so the Recovery UI and the readiness math are fully testable.
//
// Shape: a prioritised registry of providers, each { isAvailable, read }. We take the first that has
// data and, where useful, fill gaps from the next. Adding a source (Garmin direct, Fitbit) is one
// entry — nothing else changes. Native reads are wired at device-build time (need a dev build, not
// Expo Go); the lazy-requires below keep the web/Go bundle free of native modules.
import { Platform } from 'react-native';
import type { HealthSnapshot, HealthSource } from './readiness';

type Provider = {
  id: HealthSource;
  label: string; // human name for UI ("Apple Health", "Health Connect", "Garmin")
  isAvailable: () => boolean | Promise<boolean>;
  read: () => Promise<HealthSnapshot | null>;
};

// A believable snapshot for web/dev so the screen renders real-looking values.
function mockSnapshot(): HealthSnapshot {
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

// iOS → Apple Health. Captures the Apple Watch and anything synced in (a Garmin routed through
// Garmin Connect → Apple Health lands here too).
const appleHealth: Provider = {
  id: 'apple_health',
  label: 'Apple Health',
  isAvailable: () => Platform.OS === 'ios',
  read: async () => {
    try {
      // Device-only. Wired in a dev build — see NATIVE-WRAPPER-GUIDE / EAS steps.
      // const HK = require('@kingstinct/react-native-healthkit');
      // ...request read auth, pull most-recent HRV/RHR/respRate/sleep/steps/energy + 14-day baselines,
      //    map to HealthSnapshot with source: 'apple_health'...
      return null; // no native module in this build yet → fall through to mock
    } catch {
      return null;
    }
  },
};

// Android → Health Connect. The shared store for Wear OS, Samsung, Garmin, Fitbit and more, so an
// Android person with any of those watches is covered the same way.
const healthConnect: Provider = {
  id: 'health_connect',
  label: 'Health Connect',
  isAvailable: () => Platform.OS === 'android',
  read: async () => {
    try {
      // Device-only. Wired in a dev build.
      // const HC = require('react-native-health-connect');
      // ...check availability, request permissions, read the same records, map to HealthSnapshot
      //    with source: 'health_connect'...
      return null;
    } catch {
      return null;
    }
  },
};

// Optional direct Garmin link (Garmin Connect OAuth) — for people who want Garmin's own richer
// signals or who don't route Garmin into the platform store. Opt-in via a future connect flow;
// until connected it reports unavailable, so it never blocks the platform store above.
const garminDirect: Provider = {
  id: 'garmin',
  label: 'Garmin',
  isAvailable: () => false, // flips true once the user connects Garmin in Settings
  read: async () => null,
};

// Priority: the platform store first (covers the most people), then a direct brand link.
const PROVIDERS: Provider[] = [appleHealth, healthConnect, garminDirect];

// Merge b's values into a only where a is missing them — lets a secondary source fill gaps.
function fillGaps(a: HealthSnapshot, b: HealthSnapshot): HealthSnapshot {
  const out: HealthSnapshot = { ...a };
  (Object.keys(b) as (keyof HealthSnapshot)[]).forEach((k) => {
    if (out[k] == null && b[k] != null) (out as Record<string, unknown>)[k] = b[k];
  });
  return out;
}

export async function getHealthSnapshot(): Promise<HealthSnapshot> {
  let merged: HealthSnapshot | null = null;
  for (const p of PROVIDERS) {
    try {
      if (!(await p.isAvailable())) continue;
      const snap = await p.read();
      if (!snap) continue;
      merged = merged ? fillGaps(merged, snap) : snap;
    } catch {
      // a source failing must never break recovery — just move on
    }
  }
  // No live source produced data (web/dev, or native modules not wired yet) → realistic mock.
  return merged ?? mockSnapshot();
}

// The human-readable sources available on this platform, for UI copy ("reads from Apple Health").
export function availableHealthSources(): string[] {
  if (Platform.OS === 'ios') return ['Apple Health'];
  if (Platform.OS === 'android') return ['Health Connect'];
  return [];
}

// Flips true once any native health module is wired in a dev build.
export const healthIsLive = false;
