import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Button } from '@/design/Button';
import { HubItem } from '@/components/HubItem';
import { colors, space } from '@/design/tokens';

export default function Settings() {
  return (
    <Screen>
      <Text variant="title">Settings</Text>
      <Text variant="callout" style={{ marginTop: space.s2 }}>
        The quiet controls. And the most important one of all is here too: the person you're becoming.
      </Text>

      <Card style={{ marginTop: space.s4 }}>
        <Text variant="eyebrow">DAILY REMINDERS</Text>
        <Text variant="body" style={{ marginTop: space.s2 }}>
          Two gentle nudges a day — one to begin your morning, one to close the day. Nothing else, ever. You choose the
          times.
        </Text>
        <Button label="Enable reminders" style={{ marginTop: space.s4 }} />
      </Card>

      {/* Bridge to real help — designed in, never broken. (The PWA's raw-escape bug fixed by construction.) */}
      <Card style={{ marginTop: space.s4, borderColor: colors.reBd, backgroundColor: colors.reBg }}>
        <Text variant="body" color={colors.re} style={{ fontWeight: '700' }}>
          If you need real help right now
        </Text>
        <Text variant="body" style={{ marginTop: space.s3 }}>
          Lifeline: 13 11 14
        </Text>
        <Text variant="body">Beyond Blue: 1300 22 4636</Text>
        <Text variant="body">Crisis Text: text HOME to 0477 01 3755</Text>
        <Text variant="callout" style={{ marginTop: space.s3 }}>
          To Try is a self-improvement tool, not a substitute for professional support.
        </Text>
      </Card>

      <HubItem icon="person" title="About you" sub="Helps tailor your nutrition and training." />
      <HubItem icon="cross" title="Faith" sub="How much scripture surfaces for you." />
      <HubItem icon="settings" title="Preferences" sub="Currency, units, theme, timezone, reminders." />
    </Screen>
  );
}
