# Retention & Engagement Queries — To Try

The app logs every event to a Supabase table **`app_events`** via `logEvent()`. Read from the live
schema, 30 Oct 2026, rather than from memory:

```
app_events ( id bigint, anon_id uuid, event text, detail jsonb, standalone boolean, ts timestamptz )
```

**The timestamp column is `ts`, not `created_at`.** Every query below said `created_at` and
**nine of the eleven therefore errored out** — `ERROR: 42703: column "created_at" does not exist` —
so the one window this project has onto whether real people use the app had never run. `feedback`
*does* have `created_at`; `app_events` never did. All eleven are corrected and were then **planned against
the live project** — `EXPLAIN` resolves every table and column and returns no rows, so it catches
exactly this error class without reading anybody's data. 11 of 11 plan. And the validator was
calibrated first, because "11 of 11" from an instrument that cannot fail is worthless: fed block 1
as it stood before the fix it returns `FAILS 42703 column "created_at" does not exist`, and fed a
nonexistent table `FAILS 42P01`. `anon_id` = one device,
pre-login. `ts` is UTC.

> ⚠ **EXCLUDE `boot_offline` BEFORE 2026-10-30.** Measured on 30 Oct: 49,202 of the table's 57,560
> rows are `boot_offline`, across 48,061 distinct `anon_id`s — 1.02 events each, which is a fresh
> browser context per page load, not a population. That is ~85% of the table and it is this repo's
> own test gate: the peak days (3,806 on 24 Aug, 2,495 on 28 Aug, 1,979 on 9 Oct) are heavy gate
> days. v657 blocked it at the browser for three suites; v670 moved the decision into the app
> (`_isLocalProbe()`), so nothing after 30 Oct should be affected. Nothing in a row separates a test
> context from a real person who opened the app once while offline, so the rows are KEPT and
> excluded rather than deleted — see `supabase/cleanup/2026-10-30-purge-gate-rows.sql`.
> Any DAU/retention number computed over `boot_offline` before that date is ~99% harness.

> Note: `anon_id` is device-scoped (pre-login). To tie usage to real accounts, add a `user_id` column
> to `app_events` and set it in `logEvent` once signed in — then swap `anon_id` for `user_id` below.

## 1. Daily / Weekly active users (last 30 days)
```sql
select date_trunc('day', ts)::date as day,
       count(distinct anon_id) as dau
from app_events
where ts > now() - interval '30 days'
group by 1 order by 1;
```

## 2. New vs. returning, per day
```sql
with firsts as (
  select anon_id, min(ts)::date as first_day from app_events group by 1
)
select e.ts::date as day,
       count(distinct case when f.first_day = e.ts::date then e.anon_id end) as new_users,
       count(distinct case when f.first_day < e.ts::date then e.anon_id end) as returning_users
from app_events e join firsts f using (anon_id)
where e.ts > now() - interval '30 days'
group by 1 order by 1;
```

## 3. Weekly retention cohorts (the real "do they come back?" number)
```sql
with firsts as (
  select anon_id, date_trunc('week', min(ts)) as cohort from app_events group by 1
),
activity as (
  select distinct anon_id, date_trunc('week', ts) as active_week from app_events
)
select f.cohort::date as cohort_week,
       count(distinct f.anon_id) as size,
       round(100.0*count(distinct case when a.active_week = f.cohort + interval '1 week' then a.anon_id end)/nullif(count(distinct f.anon_id),0),0) as w1_pct,
       round(100.0*count(distinct case when a.active_week = f.cohort + interval '4 week' then a.anon_id end)/nullif(count(distinct f.anon_id),0),0) as w4_pct
from firsts f left join activity a using (anon_id)
group by 1 order by 1;
```

## 4. How often does each returning user open it? (stickiness)
```sql
select anon_id,
       count(distinct ts::date) as days_active,
       min(ts)::date as first_seen,
       max(ts)::date as last_seen,
       count(*) filter (where event = 'breath') as breaths,
       count(*) filter (where event = 'workout_logged') as workouts
from app_events
group by 1
having count(distinct ts::date) >= 2
order by days_active desc;
```

## 5. Feature usage — what people actually do
```sql
select event, count(*) as fires, count(distinct anon_id) as users
from app_events
where ts > now() - interval '30 days'
group by 1 order by fires desc;
```

## 6. Installed-PWA vs. browser (does install drive retention?)
```sql
select standalone, count(distinct anon_id) as users,
       round(avg(d.days_active),1) as avg_days_active
from app_events e
join (select anon_id, count(distinct ts::date) days_active from app_events group by 1) d using (anon_id)
where ts > now() - interval '30 days'
group by 1;
```

## 7. Challenge leaderboard proxy (most engaged, last 12 weeks)
```sql
select anon_id,
       count(distinct ts::date) as active_days,
       count(*) filter (where event in ('breath','workout_logged','morning_done','fight_won')) as meaningful_actions,
       max(ts)::date as last_seen
from app_events
where ts > now() - interval '12 weeks'
group by 1
order by active_days desc, meaningful_actions desc
limit 50;
```

## 8. Feedback & the raffle (from the in-app "How far have you come?" check-in)
The check-in logs `event='feedback'` with `detail` = `{improvements:[…], note, raffle, email, day}`.

Read everyone's feedback (newest first):
```sql
select ts::date as day, detail->>'note' as note,
       detail->'improvements' as improvements, (detail->>'raffle')::bool as in_raffle
from app_events where event = 'feedback'
order by ts desc;
```
What's improving most across users (turns free feedback into a signal):
```sql
select imp as improvement, count(*) as mentions
from app_events, jsonb_array_elements_text(detail->'improvements') as imp
where event = 'feedback'
group by 1 order by 2 desc;
```
Your raffle pool — everyone who gave feedback (you run the draw outside the app):
```sql
select detail->>'email' as email, count(*) as submissions, max(ts)::date as last_feedback
from app_events
where event = 'feedback' and detail->>'email' is not null
group by 1 order by submissions desc;
```
Draw N random names, if you'd rather pull them here:
```sql
select email from (
  select distinct detail->>'email' as email from app_events
  where event='feedback' and detail->>'email' is not null
) t order by random() limit 3;
```

## For the 12-week challenge specifically
- **Add a `user_id` to `app_events`** (and a challenge opt-in flag) so the leaderboard is per real person,
  not per device — otherwise a phone + laptop counts as two people, and cleared storage resets an id.
- **Track a weekly check-in event** (e.g. `logEvent('challenge_checkin', {week, weight, note})`) so
  progress + feedback are queryable, and the "provided feedback on their journey" prize criterion is
  measurable straight from the data.
