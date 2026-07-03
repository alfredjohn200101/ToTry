import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Flourish } from '@/design/Flourish';
import { HubItem } from '@/components/HubItem';
import { space } from '@/design/tokens';

export default function Soul() {
  return (
    <Screen>
      <Text variant="title">Soul</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        The root beneath everything else. The body, the money, the fight — they all grow from here, or they don't last.
        This is where the app points past itself: to Christ, to the sacraments, to the people who love you.
      </Text>

      <HubItem icon="sunrise" title="Morning" sub="Start the day: gratitude, intention, a word, and prayer." />
      <HubItem icon="moon" title="Reflect" sub="Close the day: how it went, journal, examen, wins." />
      <HubItem icon="clock" title="Today" sub="How your day is going — schedule, streaks, and where your soul is at." />
      <HubItem icon="book" title="Bible" sub="A verse for whatever you're facing, a full reader, and verses saved for the road." />
      <HubItem icon="cross" title="Today in the Church" sub="The Mass readings and the saint the Church remembers. The living calendar of the faith." />
    </Screen>
  );
}
