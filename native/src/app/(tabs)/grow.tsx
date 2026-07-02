import { router } from 'expo-router';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Flourish } from '@/design/Flourish';
import { HubItem } from '@/components/HubItem';
import { space } from '@/design/tokens';

export default function Grow() {
  return (
    <Screen>
      <Text variant="title">Grow</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        Your body, honestly. Train, then fuel what you earned, then watch the result — one loop, not three trackers.
        Discipline of the body is discipline of the man.
      </Text>

      <HubItem icon="flame" title="Fight" sub="Beat the vices holding you back. Clean streaks, urge support the moment you need it." />
      <HubItem icon="dumbbell" title="Train" sub="Workouts, routines, strength over time. Synced with Hevy." />
      <HubItem icon="leaf" title="Nourish" sub="Food, macros, water. Barcode + web lookup, your custom foods." />
      <HubItem icon="pulse" title="Recovery" sub="Readiness from your HRV, resting HR and sleep — the insight Whoop and Bevel charge for, free." onPress={() => router.push('/recovery' as never)} />
    </Screen>
  );
}
