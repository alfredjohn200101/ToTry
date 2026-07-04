// Calendar — the spine that orients the day. A person describes their week in plain words; the AI
// parses it into typed, recurring events. Training times (type 'gym') are what the moat hangs on:
// pre-workout fuel and rituals place around the real session, not a generic clock.
import { get, set } from '@/data/store';
import { api } from '@/ai/api';

export type EventType = 'gym' | 'work' | 'meal' | 'prayer' | 'study' | 'other';
export type CalEvent = {
  id: string;
  title: string;
  type: EventType;
  time: string | null; // "HH:MM" 24h, or null
  days: string[]; // ["Mon","Wed"] for recurring; [] for a one-off
  date: string | null; // "YYYY-MM-DD" for a one-off, else null
};

const KEY = 'calendar.events';
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function getEvents(): CalEvent[] {
  return get<CalEvent[]>(KEY, []);
}
export function saveEvents(e: CalEvent[]): void {
  set(KEY, e);
}
export function addEvent(e: Omit<CalEvent, 'id'>): void {
  set(KEY, [...getEvents(), { ...e, id: uid() }]);
}
export function removeEvent(id: string): void {
  set(KEY, getEvents().filter((e) => e.id !== id));
}

const todayDow = () => DOW[new Date().getDay()];
const todayISO = () => new Date().toISOString().slice(0, 10);

// Sort by time (nulls last).
const byTime = (a: CalEvent, b: CalEvent) => (a.time || '99').localeCompare(b.time || '99');

export function eventsForToday(events = getEvents()): CalEvent[] {
  const d = todayDow(), iso = todayISO();
  return events.filter((e) => e.days.includes(d) || e.date === iso).sort(byTime);
}

// The next training session today (for the pre-workout fuel thread) — first gym event still ahead.
export function nextGymToday(events = getEvents()): CalEvent | null {
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  return eventsForToday(events).find((e) => e.type === 'gym' && e.time && e.time >= hhmm) ?? null;
}

// Parse a described week into events via the AI. Returns [] on any failure (caller shows a message).
export async function parseSchedule(text: string): Promise<Omit<CalEvent, 'id'>[]> {
  const sys =
    "You parse a person's described weekly schedule into structured events. Return ONLY a JSON array, no markdown. " +
    'Each item: {"title": string, "type": "gym"|"work"|"meal"|"prayer"|"study"|"other", "time": "HH:MM" in 24h or null, ' +
    '"days": array of weekday abbreviations from [Mon,Tue,Wed,Thu,Fri,Sat,Sun] for a recurring event, or [] for a one-off, ' +
    '"date": "YYYY-MM-DD" only if a specific one-off date is clearly given, else null}. ' +
    'Infer type: workout/gym/training/lift/run → gym; work/shift/job → work; mass/church/prayer/adoration → prayer; class/lecture/study → study; meal/dinner/lunch → meal; else other. ' +
    'Convert times like "6pm" to "18:00". If nothing is parseable, return [].';
  let reply = '';
  try {
    reply = await api(sys, [], text, 1000, { timeout: 30000 });
  } catch {
    return [];
  }
  if (!reply) return [];
  try {
    const start = reply.indexOf('[');
    const end = reply.lastIndexOf(']');
    if (start < 0 || end < 0) return [];
    let json = reply.slice(start, end + 1).replace(/}\s*=\s*{/g, '},{').replace(/}\s*{/g, '},{').replace(/,\s*([}\]])/g, '$1');
    const arr = JSON.parse(json) as Partial<CalEvent>[];
    return arr
      .filter((e) => e && e.title)
      .map((e) => ({
        title: String(e.title).slice(0, 80),
        type: (['gym', 'work', 'meal', 'prayer', 'study', 'other'].includes(e.type as string) ? e.type : 'other') as EventType,
        time: typeof e.time === 'string' && /^\d{1,2}:\d{2}$/.test(e.time) ? e.time.padStart(5, '0') : null,
        days: Array.isArray(e.days) ? e.days.filter((d) => DOW.includes(d as string)) : [],
        date: typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : null,
      }));
  } catch {
    return [];
  }
}
