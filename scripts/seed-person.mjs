// ONE realistic person, written in the shapes the app's OWN ls('key', …) write sites use.
//
// This lived inside scripts/ios-shot.mjs until 16 Sep 2026, when a second consumer appeared: the
// simulator harness, which needs the same person inside WebKit rather than Chromium. Copying the
// literal into it would have re-run this repo's most expensive mistake — a seed that matches the
// reader instead of the writer renders empty states, and a REVIEW of empty states reads exactly like
// a review of the app. One source, two consumers, no drift.
//
// It is returned as SOURCE TEXT because the two consumers need it in different forms: Playwright
// evaluates it in the page, and the harness inlines it in a <script> before the app boots.
export function seedSource() {
  return `(() => {
    const ago = d => new Date(Date.now() - d * 864e5).toISOString();
    const today = new Date().toISOString().slice(0, 10);
    const a = [ago(9), ago(160), ago(30), ago(14)];
    const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    S('totry_onboarded', true); S('totry_name', 'Alfred'); S('totry_sex', 'male'); S('totry_faith_tradition', 'christianity');
    S('totry_identity', 'A man who is present, steady, and keeps his word.'); S('totry_why', 'So my kids get the version of me that shows up.');
    S('totry_journey_start', a[1]);
    S('totry_v', [{ n: 'Porn', type: 'general', mode: 'quit', startDate: a[0], fightingSince: a[1], cleanDaysTotal: 47, relapseCount: 6, w: 9, total: 12, urgelog: [{ t: a[2], won: true }], t: 'late nights alone', lastConfirm: new Date().toISOString() },
                  { n: 'Doomscroll', type: 'general', mode: 'quit', startDate: a[2], fightingSince: a[1], cleanDaysTotal: 22, relapseCount: 3, w: 5, total: 7, urgelog: [], lastConfirm: new Date().toISOString() }]);
    S('totry_body', [{ date: '14 Sep', ts: new Date().toISOString(), weight: 84.2 }, { date: '31 Aug', ts: a[3], weight: 86.1 }, { date: '17 Aug', ts: a[2], weight: 87.9 }]);
    S('totry_h', [{ n: 'Morning ritual done', d: [1, 1, 0, 1, 1, 1, 0] }, { n: 'No vice today', d: [1, 0, 1, 1, 0, 1, 1] }, { n: 'Daily prayer', d: [1, 1, 1, 1, 1, 1, 1] }, { n: 'Gym session', d: [0, 1, 0, 1, 0, 1, 0] }]);
    S('totry_f', { d: [{ n: 'Car loan', t: 8200, p: 2400, due: 15, interest: 9.5 }, { n: 'Visa', t: 1450, p: 900, due: 2, interest: 19.9 }], u: 0, i: 0 });
    S('totry_bills', [{ n: 'Rent', amt: 520, day: 1 }, { n: 'Power', amt: 96, day: 12 }]);
    S('totry_subscriptions', [{ n: 'Spotify', amt: 13.99, day: 8 }, { n: 'Gym', amt: 72, day: 1 }]);
    S('totry_transactions', [{ d: today, n: 'Groceries', amt: -88.4 }, { d: today, n: 'Pay', amt: 1900 }]);
    S('totry_prayers', [{ t: 'For Dad’s health', at: a[2], answered: false }, { t: 'Patience with the kids', at: a[2], answered: true }]);
    S('totry_journal', [{ ts: a[2], text: 'Held the line tonight. It wanted me tired.' }]);
    S('totry_workouts', [{ ts: a[2], kind: 'strength', name: 'Push', sets: [{ ex: 'Bench Press', w: 80, r: 6 }] }]);
    S('totry_nutlog', { [today]: [{ n: 'Oats & whey', cal: 520, p: 38, c: 62, f: 11 }, { n: 'Chicken rice', cal: 730, p: 52, c: 81, f: 14 }] });
    S('totry_trackers', { [today]: { sleep: 7.5, water: 6 } });
    // A week, in the shape _saveEventFromModal() writes one. Without it every review of the Calendar
    // was a review of its empty state — which is how a whole screen goes unlooked-at for a year.
    S('totry_cal_events', [
      { id: 7001, title: 'Work', type: 'work', day: 0, start: '09:00', end: '17:00', recurring: true, weekStamp: null },
      { id: 7002, title: 'Gym — push', type: 'gym', day: 0, start: '18:00', end: '19:15', recurring: true, weekStamp: null },
      { id: 7003, title: 'Work', type: 'work', day: 1, start: '09:00', end: '17:00', recurring: true, weekStamp: null },
      { id: 7004, title: 'Work', type: 'work', day: 2, start: '09:00', end: '17:00', recurring: true, weekStamp: null },
      { id: 7005, title: 'Gym — pull', type: 'gym', day: 2, start: '18:00', end: '19:15', recurring: true, weekStamp: null },
      { id: 7006, title: 'Night class', type: 'class', day: 3, start: '18:30', end: '21:00', recurring: true, weekStamp: null },
      { id: 7007, title: 'Work', type: 'work', day: 4, start: '09:00', end: '17:00', recurring: true, weekStamp: null },
      { id: 7008, title: 'Mass', type: 'personal', day: 6, start: '09:30', end: '10:30', recurring: true, weekStamp: null }
    ]);
  })()`;
}
