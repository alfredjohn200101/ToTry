-- To Try · push_subscriptions.last_seen / last_away_sent          applied 22 Oct 2026
--
-- THIS DIRECTORY EXISTS BECAUSE NOTHING WAS TRACKING SCHEMA. v649 recorded that four production
-- edge functions had no version control; the schema had the same gap, and the only record of this
-- change would otherwise have been a tool call in a chat transcript. Applied via apply_migration,
-- so it is also in supabase_migrations.schema_migrations — this file is the readable copy.
--
-- WHY THE COLUMN: the away nudge needs to know when the person last OPENED the app, and nothing
-- recorded that. last_morning_sent / last_evening_sent advance whether or not anybody read the
-- push, so they measure the cron job's own activity rather than a person's.
alter table public.push_subscriptions
  add column if not exists last_seen      timestamptz default now(),
  add column if not exists last_away_sent timestamptz;

-- CORRECTION, MEASURED AFTER THE FACT: this UPDATE was a NO-OP and the intent behind it was wrong.
-- Postgres backfills existing rows when a column is added WITH a default, so last_seen was already
-- now() on both live rows and the coalesce never saw a null. The accident is in the safe direction
-- — every existing row reads as "just seen" rather than six weeks quiet, so nobody was nudged on
-- the first run — but the comment it carried claimed an anchor that was never applied. Kept, struck
-- through in words rather than deleted, because a migration file is a record of what happened.
update public.push_subscriptions set last_seen = coalesce(last_seen, created_at, now()) where last_seen is null;

comment on column public.push_subscriptions.last_seen is
  'Last time the app was opened on this device. Written by syncPushSubscription() on every launch. Drives the afternoon away-nudge in send-push.';
comment on column public.push_subscriptions.last_away_sent is
  'Last away-nudge delivery. One per 7 days, and none at all past 21 days quiet — somebody who has not opened the app in three weeks has decided.';

-- send-push treats a NULL last_seen as "no data, do not nudge" regardless, so a row written by a
-- client older than this migration cannot read as infinitely quiet. That guard is fault-injected in
-- test/sendpush.test.mjs rather than relied upon here.
