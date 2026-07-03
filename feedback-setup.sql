-- To Try — feedback capture setup
-- Run ONCE in the Supabase SQL editor (project oklvalcgxeoudgpldzkk → SQL Editor → New query → paste → Run).
-- Makes the in-app feedback box actually deliver. The app code (submitFeedback / flushFeedbackOutbox
-- in index.html) is already correct — it inserts into public.feedback. The reason nothing arrived is
-- that the table's Row Level Security had no policy allowing the insert, so every submission was
-- silently rejected and only kept on each user's own device. This script fixes that.
-- Idempotent: safe to run more than once.

-- 1) Ensure the table + the exact columns the app writes.
create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  type        text,
  message     text,
  email       text,
  app_info    jsonb,
  created_at  timestamptz not null default now()
);

-- In case the table already existed but was missing a column:
alter table public.feedback add column if not exists type       text;
alter table public.feedback add column if not exists message    text;
alter table public.feedback add column if not exists email      text;
alter table public.feedback add column if not exists app_info   jsonb;
alter table public.feedback add column if not exists created_at timestamptz not null default now();

-- 2) Row Level Security ON, with ONE narrow policy: anyone may INSERT (submit feedback),
--    but NOBODY can read/update/delete through the public app key. You read submissions in the
--    dashboard (the service role bypasses RLS). This keeps it privacy-respecting — no user can see
--    anyone else's feedback.
alter table public.feedback enable row level security;

drop policy if exists "anyone can submit feedback" on public.feedback;
create policy "anyone can submit feedback"
  on public.feedback
  for insert
  to anon, authenticated
  with check (true);

-- (Deliberately NO select/update/delete policies — the public key cannot read or change rows.)

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) READ YOUR SUBMISSIONS anytime — run this in the SQL editor (or use Table Editor → feedback):
--
--    select created_at, type, email, message, app_info
--    from public.feedback
--    order by created_at desc;
--
-- After running this script: open the live app and submit a test feedback to confirm it lands.
-- Your sister's stuck submission will auto-flush into this table the next time she opens the live
-- app online (flushFeedbackOutbox retries on every app open) — as long as she's on the same
-- device/browser and hasn't cleared site data.
