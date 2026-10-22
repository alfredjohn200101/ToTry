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

const MORNING = [
  "Begin the day before the day begins you. A word, your gratitude, your intention, a prayer.",
  "A few quiet minutes set the whole day. Your morning is ready.",
  "Who are you becoming today? Start with the morning ritual.",
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
  let sent = 0, pruned = 0, byZone = 0, byOffset = 0;

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
      }

      if (!payload) continue;

      await webpush.sendNotification(s.subscription, JSON.stringify(payload));
      await sb.from("push_subscriptions").update(patch!).eq("id", s.id);
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
  return new Response(JSON.stringify({ sent, pruned, checked: subs?.length ?? 0, byZone, byOffset }), {
    headers: { "Content-Type": "application/json" },
  });
});
