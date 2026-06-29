import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { HubItem } from '@/components/HubItem';
import { space } from '@/design/tokens';

export default function Soul() {
  return (
    <Screen>
      <Text variant="title">Soul</Text>
      <Text variant="sub" style={{ marginTop: space.s2 }}>
        The root beneath everything else. The body, the money, the fight — they all grow from here, or they don't last.
        This is where the app points past itself: to Christ, to the sacraments, to the people who love you.
      </Text>

      <HubItem title="Morning" sub="Start the day: gratitude, intention, a word, and prayer." />
      <HubItem title="Reflect" sub="Close the day: how it went, journal, examen, wins." />
      <HubItem title="Today" sub="How your day is going — schedule, streaks, and where your soul is at." />
      <HubItem title="Bible" sub="120 verses for whatever you're facing, a full reader, verses saved for the road." />
      <HubItem title="Today in the Church" sub="The Mass readings and the saint the Church remembers. The living calendar of the faith." />
    </Screen>
  );
}
