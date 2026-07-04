import { router } from 'expo-router';
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

      <HubItem icon="sunrise" title="Morning" sub="Start the day: gratitude, a word, and the intention I'll hand back when it's hard." onPress={() => router.push('/morning' as never)} />
      <HubItem icon="moon" title="Reflect" sub="Close the day gently: how it went, the good, one honest thing. Grace, not a scoreboard." onPress={() => router.push('/reflect' as never)} />
      <HubItem icon="clock" title="Your week" sub="Describe your week and I'll lay it out — training times, and the fuel and rituals around them." onPress={() => router.push('/calendar' as never)} />
      <HubItem icon="book" title="Bible" sub="A verse for whatever you're facing, and verses saved for the road." onPress={() => router.push('/bible' as never)} />
      <HubItem icon="cross" title="Today in the Church" sub="The Mass readings and the saint the Church remembers. The living calendar of the faith." />
    </Screen>
  );
}
