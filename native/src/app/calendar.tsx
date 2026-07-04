import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/design/Screen';
import { Text } from '@/design/Text';
import { Card } from '@/design/Card';
import { Button } from '@/design/Button';
import { Flourish } from '@/design/Flourish';
import { colors, space, fonts, radius } from '@/design/tokens';
import { useStored } from '@/data/useStore';
import { type CalEvent, type EventType, addEvent, removeEvent, eventsForToday, parseSchedule } from '@/calendar/model';

const EMPTY: CalEvent[] = [];
const haptic = (k: 'light' | 'success' = 'light') => {
  if (process.env.EXPO_OS === 'web') return;
  if (k === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.selectionAsync().catch(() => {});
};

const TYPE: Record<EventType, { label: string; color: string }> = {
  gym: { label: 'Train', color: colors.go },
  work: { label: 'Work', color: colors.bl },
  prayer: { label: 'Prayer', color: colors.pu },
  study: { label: 'Study', color: colors.bl },
  meal: { label: 'Meal', color: colors.gr },
  other: { label: 'Other', color: colors.tx3 },
};
const to12 = (t: string | null) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')}${ap}`;
};

function EventRow({ e, onRemove }: { e: CalEvent; onRemove: () => void }) {
  const t = TYPE[e.type];
  return (
    <Card tone="flat" style={{ marginTop: space.s3, flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.monoMed, fontSize: 14, color: t.color, width: 62 }}>{to12(e.time)}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.sansMed, fontSize: 15, color: colors.tx }}>{e.title}</Text>
        <Text variant="footnote" style={{ marginTop: 1 }}>
          <Text variant="footnote" color={t.color}>{t.label}</Text>
          {e.days.length ? ` · ${e.days.join(' ')}` : e.date ? ` · ${e.date}` : ' · one-off'}
        </Text>
      </View>
      <Pressable onPress={onRemove} style={styles.remove}><Text variant="subhead" color={colors.tx3}>×</Text></Pressable>
    </Card>
  );
}

export default function Calendar() {
  const [events] = useStored<CalEvent[]>('calendar.events', EMPTY);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const read = async () => {
    if (!text.trim() || busy) return;
    haptic();
    setBusy(true);
    setMsg('');
    const parsed = await parseSchedule(text);
    if (parsed.length) {
      parsed.forEach(addEvent);
      setText('');
      setMsg(`Added ${parsed.length} event${parsed.length === 1 ? '' : 's'} to your week.`);
      haptic('success');
    } else {
      setMsg("I couldn't read a schedule from that — try naming the days and times, e.g. 'Gym Mon Wed Fri 6pm, work Tue-Thu 9-5'.");
    }
    setBusy(false);
  };

  const today = eventsForToday(events);

  return (
    <Screen showWordmark={false} showOrb>
      <Pressable onPress={() => router.back()} style={{ marginBottom: space.s3 }}>
        <Text variant="callout" color={colors.tx3}>‹ Soul</Text>
      </Pressable>
      <Text variant="title">Your week</Text>
      <Flourish />
      <Text variant="callout" style={{ marginTop: space.s4 }}>
        Tell me your week in plain words and I'll lay it out — so your training times, and the fuel and
        rituals that hang off them, land where they actually belong.
      </Text>

      <Card style={{ marginTop: space.s5 }}>
        <Text variant="eyebrow">Describe your week</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="e.g. Gym Mon Wed Fri 6pm, work Tue–Thu 9–5, Mass Sunday 10am, mum's birthday 12 Jul"
          placeholderTextColor={colors.tx3}
          style={styles.input}
          multiline
        />
        {busy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s3, marginTop: space.s4 }}>
            <ActivityIndicator color={colors.go} />
            <Text variant="subhead">Reading your week…</Text>
          </View>
        ) : (
          <Button label="Read my schedule" onPress={read} style={{ marginTop: space.s4 }} />
        )}
        {msg ? <Text variant="footnote" style={{ marginTop: space.s3, color: colors.tx2, lineHeight: 19 }}>{msg}</Text> : null}
      </Card>

      {today.length > 0 && (
        <>
          <Text variant="eyebrow" style={{ marginTop: space.s7 }}>Today</Text>
          {today.map((e) => <EventRow key={e.id} e={e} onRemove={() => { haptic(); removeEvent(e.id); }} />)}
        </>
      )}

      {events.length > 0 && (
        <>
          <Text variant="eyebrow" style={{ marginTop: space.s7 }}>Everything · {events.length}</Text>
          {events.slice().sort((a, b) => (a.time || '99').localeCompare(b.time || '99')).map((e) => (
            <EventRow key={e.id} e={e} onRemove={() => { haptic(); removeEvent(e.id); }} />
          ))}
        </>
      )}

      {events.length === 0 && !busy && (
        <Text variant="footnote" style={{ marginTop: space.s5, lineHeight: 20 }}>
          Nothing scheduled yet. Paste your week above, or just describe a typical one — I'll sort it into days and times.
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { marginTop: space.s3, minHeight: 92, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16, lineHeight: 22 },
  remove: { paddingHorizontal: space.s3, paddingVertical: space.s1 },
});
