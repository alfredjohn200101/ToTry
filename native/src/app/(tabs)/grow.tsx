import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { HubItem } from '@/components/HubItem';
import { space } from '@/design/tokens';

export default function Grow() {
  return (
    <Screen>
      <Text variant="title">Grow</Text>
      <Text variant="callout" style={{ marginTop: space.s2 }}>
        Your body, honestly. Train, then fuel what you earned, then watch the result — one loop, not three trackers.
        Discipline of the body is discipline of the man.
      </Text>

      <HubItem title="Fight" sub="Beat the vices holding you back. Clean streaks, urge support the moment you need it." />
      <HubItem title="Train" sub="Workouts, routines, strength over time. Synced with Hevy." />
      <HubItem title="Nourish" sub="Food, macros, water. Barcode + web lookup, your custom foods." />
      <HubItem title="Track" sub="Body, weight, photos, measurements, sleep — the result of training and fuelling." />
    </Screen>
  );
}
