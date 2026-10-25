// To Try — send-push
// Runs every 15 minutes via the pg_cron job `totry-push-reminders`. For each subscriber, checks
// whether their chosen morning/evening reminder time falls in the current 15-minute window IN THEIR
// OWN LOCAL TIME, sends at most one of each per day, and prunes dead subscriptions.
//
// Required secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
//
// ── TWO FIXES, 22 Oct 2026, both found from one user's report ────────────────────────────────────
//
// 1. AN OFFSET IS A SNAPSHOT; A ZONE IS A RULE.
//    This used to reconstruct local time arithmetically from `tz_offset_minutes`, a single integer
//    captured by the browser at the moment the person enabled reminders:
//        const local = new Date(nowUtc.getTime() - (s.tz_offset_minutes ?? 0) * 60000);
//    Melbourne moved from AEST (-600) to AEDT (-660) on 4 Oct 2026, and the stored integer did not.
//    Measured against the live table 18 days later: a 06:30 wake-up was arriving at 07:30, and a
//    23:00 wind-down at 00:00 — a "close the day" message delivered after the day had closed. The
//    person who reported it said the times "have to be changed manually", which is exactly right:
//    re-saving the time is what rewrites the offset, so the only repair was to do it by hand, twice
//    a year, in both directions.
//    The subscriber's IANA zone (`tz`, e.g. "Australia/Melbourne") is authoritative now and Intl
//    applies that zone's DST rules itself. `tz_offset_minutes` remains the fallback so rows written
//    by an older client keep working unchanged until they next open the app.
//
// 2. A LEXICAL WINDOW CANNOT CROSS MIDNIGHT.
//    `hhmm >= t && hhmm < addMinutes(t, 15)` with addMinutes wrapping `% 1440` is unsatisfiable
//    whenever the window spans midnight: for t = "23:50" it asks for a string that is both >= "23:50"
//    and < "00:05". Any reminder time from 23:45 to 23:59 could therefore never fire — silently,
//    with Settings showing reminders ON. That is a shift worker or a night owl, and it is the
//    "parses fine, tests green, does nothing" shape. The comparison is arithmetic on minutes now,
//    with an explicit wrap.
//
// ── THE THIRD KIND, 22 Oct 2026: THE AWAY NUDGE ────────────────────────────────────────────────────────────────────────────────────
//
// Asked for by the same person who reported the DST bug: "a reminder notification if you haven't
// checked in for a while might be useful as well! If it gets sent during the day or sometime in the
// arvo after work, it might be a time when people are more free to remember to use it."
//
// IT HAS TO LIVE HERE, and that is the whole argument. The app already notices a quiet spell in
// checkGoneQuietWelcome — but that runs ON LAUNCH, so it can only greet somebody who came back by
// themselves. The population it would help is by definition the population not opening the app, and
// a PWA cannot schedule anything that survives being closed. So the only thing that can reach a
// dormant person is the server, which means it needs to know when they were last HERE: last_seen,
// written by syncPushSubscription() on every launch. last_morning_sent and last_evening_sent could
// not be used for this — they advance whether or not anybody read the push, so they measure this
// cron job's activity rather than a person's.
//
// AND IT STOPS. One nudge per 7 days, and none at all past 21 days quiet. Somebody who has not
// opened the app in three weeks has decided, and tapping them on the shoulder every afternoon until
// they uninstall is the engagement farming this product exists to refuse — CLAUDE.md puts it as
// "anti-engagement is a feature, not a bug". So the honest shape is at most three nudges, and then
// silence. A NULL last_seen is treated as no data and never nudged: a row written before this
// column existed must not read as infinitely quiet.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const WINDOW_MIN = 15;

const toMinutes = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
};

// The subscriber's own wall clock. Returns minutes-since-midnight and their local calendar date,
// which is what the once-per-day guard must be keyed on — a UTC date would roll over mid-afternoon
// for anyone far enough east, and this project has already been bitten by a day that is not a day.
function localClock(nowUtc: Date, tz: string | null, offsetMinutes: number | null) {
  if (tz) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).formatToParts(nowUtc).reduce((acc: Record<string, string>, p) => {
        if (p.type !== "literal") acc[p.type] = p.value;
        return acc;
      }, {});
      if (parts.year && parts.hour) {
        return {
          minutes: Number(parts.hour) * 60 + Number(parts.minute),
          date: `${parts.year}-${parts.month}-${parts.day}`,
          source: "zone",
        };
      }
    } catch {
      // an unknown or misspelled zone falls through to the offset rather than throwing
    }
  }
  const local = new Date(nowUtc.getTime() - (offsetMinutes ?? 0) * 60000);
  return {
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
    date: local.toISOString().slice(0, 10),
    source: "offset",
  };
}

// 17:00 local, because the request named the moment: after work, when the phone comes out and the
// day is not yet spent. 15:00 is still at a desk and 19:00 is dinner.
const AWAY_AT = 17 * 60;
const AWAY_QUIET_DAYS = 4;    // genuinely drifted, not a weekend off
const AWAY_GIVE_UP_DAYS = 21; // past this, silence — they have decided
const AWAY_EVERY_DAYS = 7;

// Is this minute inside the subscriber's own quiet hours? The native half shifts an away nudge out
// of them through _receptiveTime(); the server has no shifting to do because 17:00 is fixed, so the
// honest server behaviour is to stand down rather than wake somebody it was told is asleep.
function inQuietHours(clock: { minutes: number }, start: string | null, end: string | null): boolean {
  const s0 = start ? toMinutes(start) : null;
  const e0 = end ? toMinutes(end) : null;
  if (s0 === null || e0 === null) return false;      // not set is not "all day"
  return s0 < e0 ? (clock.minutes >= s0 && clock.minutes < e0)
                 : (clock.minutes >= s0 || clock.minutes < e0);   // a window that crosses midnight
}

function awayDue(s: Record<string, unknown>, nowUtc: Date, clock: { minutes: number }): boolean {
  // CONSENT FIRST, before any arithmetic. v650 gated the native away nudge on `totry_reachout_off`
  // and that flag is localStorage, so this function could not see it: the switch stopped the nudge
  // on native and was inert on web, which is the only away channel web has. Measured against the
  // live table, 0 of 9 candidate "off" states stopped it. `away_optout` is mirrored into the row by
  // syncPushSubscription() on every launch AND written through by the toggle itself, so a person
  // who says stop is obeyed without having to open the app again.
  if (s.away_optout === true) return false;
  // The 15-minute window, same arithmetic as a reminder time so it cannot drift from them.
  if (((clock.minutes - AWAY_AT + 1440) % 1440) >= WINDOW_MIN) return false;
  if (inQuietHours(clock, (s.quiet_start as string) ?? null, (s.quiet_end as string) ?? null)) return false;
  const seen = s.last_seen ? Date.parse(String(s.last_seen)) : NaN;
  if (!isFinite(seen)) return false;                 // no data is not the same as "gone quiet"
  const daysQuiet = (nowUtc.getTime() - seen) / 86400000;
  if (daysQuiet < AWAY_QUIET_DAYS || daysQuiet > AWAY_GIVE_UP_DAYS) return false;
  const lastAway = s.last_away_sent ? Date.parse(String(s.last_away_sent)) : NaN;
  if (isFinite(lastAway) && (nowUtc.getTime() - lastAway) / 86400000 < AWAY_EVERY_DAYS) return false;
  return true;
}

const MORNING = [
  "Begin the day before the day begins you. A word, your gratitude, your intention, a prayer.",
  "A few quiet minutes set the whole day. Your morning is ready.",
  "Who are you becoming today? Start with the morning ritual.",
];
// Zero guilt, and deliberately no number in it. "It's been 6 days" is a scoreboard, and a
// scoreboard is the thing that makes somebody who drifted not come back at all. Same register as
// the in-app gone-quiet welcome: glad you're here, nothing owed.
const AWAY = [
  "No guilt, no catch-up to do — just a door that’s still open whenever you want it.",
  "Whatever this week has been, you can pick it up from wherever you are. One small thing counts.",
  "Still here. Nothing to make up for — come back in wherever you like.",
];
const EVENING = [
  "Close the day honestly — how it went, one win, one thing to release.",
  "Before you rest: reflect on today. A few minutes is enough.",
  "End the day the way you want to live it — with honesty and gratitude.",
];

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  webpush.setVapidDetails(
    "mailto:alfredjohn200101@gmail.com",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subs, error } = await sb.from("push_subscriptions").select("*");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const nowUtc = new Date();
  let sent = 0, pruned = 0, byZone = 0, byOffset = 0, away = 0, failedReceipts = 0;

  for (const s of subs ?? []) {
    try {
      const clock = localClock(nowUtc, (s as Record<string, string | null>).tz ?? null, s.tz_offset_minutes ?? null);
      if (clock.source === "zone") byZone++; else byOffset++;
      const today = clock.date;

      // Minutes, not strings, so a window that spans midnight is expressible at all.
      const inWindow = (t: string | null) => {
        if (!t) return false;
        const start = toMinutes(t);
        if (start === null) return false;
        return ((clock.minutes - start + 1440) % 1440) < WINDOW_MIN;
      };

      let payload: { title: string; body: string; url: string; tag: string } | null = null;
      let patch: Record<string, string> | null = null;

      // Prefer the user's own AI-generated message sets (stored by the app), falling back to the
      // fixed supportive lines.
      const pick = (arr: unknown, fallback: string[]): string => {
        const list = Array.isArray(arr) ? (arr as string[]).filter((x) => typeof x === "string" && x.trim()) : [];
        const pool = list.length ? list : fallback;
        return pool[Math.floor(Math.random() * pool.length)];
      };

      if (inWindow(s.remind_morning) && s.last_morning_sent !== today) {
        payload = {
          title: "Your morning is waiting",
          body: pick((s as Record<string, unknown>).ai_morning_messages, MORNING),
          url: "./?go=morning",
          tag: "totry-morning",
        };
        patch = { last_morning_sent: today };
      } else if (inWindow(s.remind_evening) && s.last_evening_sent !== today) {
        payload = {
          title: "Close the day well",
          body: pick((s as Record<string, unknown>).ai_evening_messages, EVENING),
          url: "./?go=reflect",
          tag: "totry-evening",
        };
        patch = { last_evening_sent: today };
      } else if (awayDue(s as Record<string, unknown>, nowUtc, clock)) {
        // CYCLE, DO NOT DRAW AT RANDOM. The native half arms its three with
        // `AWAY_BODIES[i % AWAY_BODIES.length]`, so those three sends are guaranteed to be three
        // different sentences. Math.random here gave a web subscriber a 7-in-9 chance of reading
        // the same line twice across the only three nudges they will ever get — and it also made
        // the test's no-day-count assertion inspect ONE body of three per run, so a scoreboard
        // could ship green two runs in three. Which nudge this is follows from last_away_sent.
        const lastAwayTs = s.last_away_sent ? Date.parse(String(s.last_away_sent)) : NaN;
        const nth = isFinite(lastAwayTs)
          ? Math.min(AWAY.length - 1, Math.max(0, Math.round((nowUtc.getTime() - lastAwayTs) / (AWAY_EVERY_DAYS * 86400000))))
          : 0;
        payload = {
          title: "Good to see you whenever",
          body: AWAY[nth % AWAY.length],
          url: "./?go=home",
          tag: "totry-away",
        };
        patch = { last_away_sent: nowUtc.toISOString() };
        away++;
      }

      if (!payload) continue;

      await webpush.sendNotification(s.subscription, JSON.stringify(payload));
      // supabase-js RESOLVES with {error} rather than throwing, and this discarded it — the same
      // swallow v649 fixed in syncPushSubscription one file away. It matters most on the away
      // branch, where this receipt is the ONLY throttle: a silent failure turns "one per 7 days"
      // into one every afternoon for as long as the write keeps failing.
      const { error: upErr } = await sb.from("push_subscriptions").update(patch!).eq("id", s.id);
      if (upErr) { console.error("receipt write failed for", s.id, upErr.message || upErr); failedReceipts++; }
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await sb.from("push_subscriptions").delete().eq("id", s.id);
        pruned++;
      } else {
        console.error("push failed for", s.id, err);
      }
    }
  }

  // byZone / byOffset make the rollout observable: while anyone is still on the offset path their
  // reminders are only as correct as the last time they opened the app.
  return new Response(JSON.stringify({ sent, pruned, away, failedReceipts, checked: subs?.length ?? 0, byZone, byOffset }), {
    headers: { "Content-Type": "application/json" },
  });
});
