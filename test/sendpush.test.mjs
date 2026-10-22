// Run the send-push edge function locally, with Deno, web-push and Supabase stubbed.
//
//   node --experimental-strip-types test/sendpush.test.mjs
//
// This function has sent every reminder to every live subscriber since it was written and had NO
// test of any kind — which is how the two defects fixed on 22 Oct 2026 survived: an offset captured
// once at enable time was used as if it were a timezone RULE (so every PWA reminder fired an hour
// late for 18 days after Melbourne's DST change), and the send window was compared as STRINGS, which
// made any reminder time from 23:45 to 23:59 unsatisfiable and therefore silent forever.
//
// It is now tested by DRIVING it: a fake clock, fake subscriber rows, and an assertion on what came
// out of webpush.sendNotification. Both defects are fault-injected at the bottom, so the panel has
// been seen to fail rather than assumed to work.
let handler = null;
const ENV = { CRON_SECRET: 'sh', VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' };
globalThis.Deno = { serve: (h) => { handler = h; }, env: { get: (k) => ENV[k] } };

// ── the stubs. One module registry, so the function's own imports resolve to these. ──────────────
let ROWS = [], SENT = [], PATCHED = [], DELETED = [];
const sb = {
  from: () => ({
    select: async () => ({ data: ROWS, error: null }),
    update: (patch) => ({ eq: async (_c, id) => { PATCHED.push({ id, patch }); return { error: null }; } }),
    delete: () => ({ eq: async (_c, id) => { DELETED.push(id); return { error: null }; } }),
  }),
};
let sendBehaviour = null;
const webpush = {
  setVapidDetails: () => {},
  sendNotification: async (sub, body) => {
    if (sendBehaviour) { const e = new Error('gone'); e.statusCode = sendBehaviour; throw e; }
    SENT.push({ sub, payload: JSON.parse(body) });
  },
};
// Node resolves `npm:` specifiers through a loader hook; intercepting the import is simpler and the
// function body is what is under test, not the registry.
const { register } = await import('node:module');
const { pathToFileURL } = await import('node:url');
register(pathToFileURL('./test/_sendpush-loader.mjs'), import.meta.url);
globalThis.__SENDPUSH_STUBS__ = { sb, webpush };

await import('../supabase/functions/send-push/index.ts');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

// A fixed clock. Date.now() is NOT stubbed globally — the function builds `new Date()` itself, so the
// only honest way to control it is to drive the handler at a chosen instant.
let NOW = null;
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...a) { if (a.length === 0 && NOW) return new RealDate(NOW); return new RealDate(...a); }
  static now() { return NOW ? new RealDate(NOW).getTime() : RealDate.now(); }
};
Object.setPrototypeOf(globalThis.Date, RealDate);

const run = async (at, rows) => {
  NOW = at; ROWS = rows; SENT = []; PATCHED = []; DELETED = [];
  const res = await handler(new Request('http://x', { headers: { 'x-cron-secret': 'sh' } }));
  return { body: await res.json(), sent: SENT, patched: PATCHED, deleted: DELETED };
};
const row = (o) => ({ id: 'r1', subscription: { endpoint: 'e' }, tz: null, tz_offset_minutes: 0,
  remind_morning: null, remind_evening: null, last_morning_sent: null, last_evening_sent: null,
  last_seen: null, last_away_sent: null, ...o });
const daysAgo = (atIso, n) => new RealDate(RealDate.parse(atIso) - n * 86400000).toISOString();

console.log('\n── a zone is a rule, not a snapshot ──');
{
  // 2026-10-22T19:30Z is 06:30 on the 23rd in Melbourne under AEDT (+11). A row whose stored offset
  // was captured in AEST (-600 minutes, i.e. +10) would compute 05:30 and send nothing.
  const at = '2026-10-22T19:30:00Z';
  const stale = row({ tz: 'Australia/Melbourne', tz_offset_minutes: -600, remind_morning: '06:30' });
  const r = await run(at, [stale]);
  ok(r.sent.length === 1, 'the morning reminder fires at 06:30 of the SUBSCRIBER’s wall clock');
  ok(r.body.byZone === 1 && r.body.byOffset === 0, 'and it was decided by the IANA zone, not the stored offset');
  ok(r.patched[0]?.patch?.last_morning_sent === '2026-10-23', 'the once-per-day receipt is their LOCAL date, not UTC’s');

  const offsetOnly = row({ tz: null, tz_offset_minutes: -600, remind_morning: '06:30' });
  const r2 = await run(at, [offsetOnly]);
  ok(r2.sent.length === 0 && r2.body.byOffset === 1,
    'a row with no zone still falls back to the offset — and that is exactly the hour-late bug, preserved for old clients');
}

console.log('\n── a window that crosses midnight ──');
{
  // 23:50 local. The old lexical compare asked for a string both >= "23:50" and < "00:05".
  const r = await run('2026-10-22T12:50:00Z', [row({ tz: 'UTC', remind_evening: '12:50' })]);
  ok(r.sent.length === 1, 'an ordinary evening time fires');
  const r2 = await run('2026-10-22T23:50:00Z', [row({ tz: 'UTC', remind_evening: '23:50' })]);
  ok(r2.sent.length === 1, 'and so does 23:50 — the window that was unsatisfiable as strings');
  const r3 = await run('2026-10-23T00:02:00Z', [row({ tz: 'UTC', remind_evening: '23:55' })]);
  ok(r3.sent.length === 1, 'a window that STARTS before midnight still fires after it');
  const r4 = await run('2026-10-22T23:20:00Z', [row({ tz: 'UTC', remind_evening: '23:50' })]);
  ok(r4.sent.length === 0, 'and half an hour early sends nothing');
}

console.log('\n── the away nudge ──');
{
  const at = '2026-10-22T06:00:00Z';   // 17:00 in Australia/Melbourne (AEDT, +11)
  const Z = 'Australia/Melbourne';
  const away = (seen, lastAway) => row({ tz: Z, last_seen: seen, last_away_sent: lastAway });

  const r = await run(at, [away(daysAgo(at, 6), null)]);
  ok(r.sent.length === 1 && r.sent[0].payload.tag === 'totry-away', '6 days quiet at 17:00 local gets ONE away nudge');
  ok(!/\b6\b|\bdays?\b/.test(r.sent[0].payload.body), 'and its copy carries no day count — a number is a scoreboard');
  ok(r.body.away === 1, 'reported separately from the reminders so the rollout is observable');
  ok(typeof r.patched[0]?.patch?.last_away_sent === 'string', 'and the delivery is stamped');

  ok((await run('2026-10-22T02:00:00Z', [away(daysAgo(at, 6), null)])).sent.length === 0,
    'nothing at 13:00 local — the request was after work, not during it');
  ok((await run(at, [away(daysAgo(at, 2), null)])).sent.length === 0, 'two days is a weekend off, not a drift');
  ok((await run(at, [away(daysAgo(at, 25), null)])).sent.length === 0,
    'and past 21 days it STOPS — somebody who has not opened it in three weeks has decided');
  ok((await run(at, [away(daysAgo(at, 6), daysAgo(at, 2))])).sent.length === 0, 'at most one per 7 days');
  ok((await run(at, [away(daysAgo(at, 14), daysAgo(at, 8))])).sent.length === 1, 'the second one lands a week later');
  ok((await run(at, [away(null, null)])).sent.length === 0,
    'a NULL last_seen is no data, never infinite quiet — a row written before the column existed must not be nudged');

  // Precedence: a reminder the person asked for always beats the nudge the app thought of.
  const clash = row({ tz: Z, remind_evening: '17:00', last_seen: daysAgo(at, 6) });
  const rc = await run(at, [clash]);
  ok(rc.sent.length === 1 && rc.sent[0].payload.tag === 'totry-evening',
    'a reminder set FOR 17:00 wins over the away nudge — one push, and it is the one they asked for');
}

console.log('\n── the rest of the contract ──');
{
  const at = '2026-10-22T19:30:00Z';
  const already = row({ tz: 'Australia/Melbourne', remind_morning: '06:30', last_morning_sent: '2026-10-23' });
  ok((await run(at, [already])).sent.length === 0, 'the day’s receipt stops a second morning push');
  sendBehaviour = 410;
  const r = await run(at, [row({ tz: 'Australia/Melbourne', remind_morning: '06:30' })]);
  sendBehaviour = null;
  ok(r.deleted.length === 1 && r.body.pruned === 1, 'a 410 prunes the dead subscription');
  const forbidden = await handler(new Request('http://x', { headers: { 'x-cron-secret': 'wrong' } }));
  ok(forbidden.status === 403, 'and the wrong cron secret is refused');
}

console.log('\n' + (fail ? '✗ ' + fail + ' failed, ' : '✓ ') + pass + ' passed');
process.exit(fail ? 1 : 0);
