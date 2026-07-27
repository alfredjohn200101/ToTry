# Retention & Engagement Queries — To Try

The app already logs every event to a Supabase table **`app_events`** via `logEvent()`:
`{ anon_id, event, detail, standalone }` + Supabase's auto `id` + `created_at`. So the *data*
for retention already exists — these queries turn it into answers. Run them in the Supabase SQL editor.
(Adjust the table/column names if the schema differs. `anon_id` = one device/user; `created_at` = UTC.)

> Note: `anon_id` is device-scoped (pre-login). To tie usage to real accounts, add a `user_id` column
> to `app_events` and set it in `logEvent` once signed in — then swap `anon_id` for `user_id` below.

## 1. Daily / Weekly active users (last 30 days)
```sql
select date_trunc('day', created_at)::date as day,
       count(distinct anon_id) as dau
from app_events
where created_at > now() - interval '30 days'
group by 1 order by 1;
```

## 2. New vs. returning, per day
```sql
with firsts as (
  select anon_id, min(created_at)::date as first_day from app_events group by 1
)
select e.created_at::date as day,
       count(distinct case when f.first_day = e.created_at::date then e.anon_id end) as new_users,
       count(distinct case when f.first_day < e.created_at::date then e.anon_id end) as returning_users
from app_events e join firsts f using (anon_id)
where e.created_at > now() - interval '30 days'
group by 1 order by 1;
```

## 3. Weekly retention cohorts (the real "do they come back?" number)
```sql
with firsts as (
  select anon_id, date_trunc('week', min(created_at)) as cohort from app_events group by 1
),
activity as (
  select distinct anon_id, date_trunc('week', created_at) as active_week from app_events
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
       count(distinct created_at::date) as days_active,
       min(created_at)::date as first_seen,
       max(created_at)::date as last_seen,
       count(*) filter (where event = 'breath') as breaths,
       count(*) filter (where event = 'workout_logged') as workouts
from app_events
group by 1
having count(distinct created_at::date) >= 2
order by days_active desc;
```

## 5. Feature usage — what people actually do
```sql
select event, count(*) as fires, count(distinct anon_id) as users
from app_events
where created_at > now() - interval '30 days'
group by 1 order by fires desc;
```

## 6. Installed-PWA vs. browser (does install drive retention?)
```sql
select standalone, count(distinct anon_id) as users,
       round(avg(d.days_active),1) as avg_days_active
from app_events e
join (select anon_id, count(distinct created_at::date) days_active from app_events group by 1) d using (anon_id)
where created_at > now() - interval '30 days'
group by 1;
```

## 7. Challenge leaderboard proxy (most engaged, last 12 weeks)
```sql
select anon_id,
       count(distinct created_at::date) as active_days,
       count(*) filter (where event in ('breath','workout_logged','morning_done','fight_won')) as meaningful_actions,
       max(created_at)::date as last_seen
from app_events
where created_at > now() - interval '12 weeks'
group by 1
order by active_days desc, meaningful_actions desc
limit 50;
```

## 8. Feedback & the raffle (from the in-app "How far have you come?" check-in)
The check-in logs `event='feedback'` with `detail` = `{improvements:[…], note, raffle, email, day}`.

Read everyone's feedback (newest first):
```sql
select created_at::date as day, detail->>'note' as note,
       detail->'improvements' as improvements, (detail->>'raffle')::bool as in_raffle
from app_events where event = 'feedback'
order by created_at desc;
```
What's improving most across users (turns free feedback into a signal):
```sql
select imp as improvement, count(*) as mentions
from app_events, jsonb_array_elements_text(detail->'improvements') as imp
where event = 'feedback'
group by 1 order by 2 desc;
```
Raffle entrants (unique emails who opted in):
```sql
select distinct detail->>'email' as email
from app_events
where event = 'feedback' and (detail->>'raffle')::bool = true and detail->>'email' is not null;
```
Draw N random winners:
```sql
select detail->>'email' as winner
from (select distinct detail->>'email' as e2, detail from app_events
      where event='feedback' and (detail->>'raffle')::bool = true and detail->>'email' is not null) t
order by random() limit 3;
```

## For the 12-week challenge specifically
- **Add a `user_id` to `app_events`** (and a challenge opt-in flag) so the leaderboard is per real person,
  not per device — otherwise a phone + laptop counts as two people, and cleared storage resets an id.
- **Track a weekly check-in event** (e.g. `logEvent('challenge_checkin', {week, weight, note})`) so
  progress + feedback are queryable, and the "provided feedback on their journey" prize criterion is
  measurable straight from the data.
