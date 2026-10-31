-- ── THE GATE'S OWN ROWS, IN THE LIVE DATABASE ──────────────────────────────────────────────────
-- Measured against the production project on 30 Oct 2026. Not a migration: a one-off cleanup, kept
-- here as the record of what was run and why. Run it in the Supabase SQL editor.
--
-- WHY THIS EXISTS. v657 found the gate writing to production and blocked Supabase at the browser.
-- It did not clean up what was already there, and it was wired into three suites out of eleven, so
-- 666 more analytics rows arrived in the three days after it landed. v670 moves the decision into
-- the app (`_isLocalProbe()` in src/app/28-init.js), where no harness can forget it, and wires the
-- browser block into all eight remaining scripts. This file removes the backlog.
--
-- ══ 1 · feedback — RECOMMENDED, and provably safe ══════════════════════════════════════════════
-- 169 rows. Every one is `npm run crisis`'s own corpus, verbatim; `user_id` is NULL on all 169;
-- the ids run 1-169, so THIS TABLE HAS NEVER HELD A MESSAGE FROM A PERSON. The field's own copy is
-- "Tell me what's improving and what's missing — I read every note", and what it contained was
-- suicide-disclosure test strings.
-- Backed up in full before deletion (169/169 captured, 0 with a user_id, 0 outside the corpus).
--
-- SCOPED BY THE PROOF rather than by a date or a bare id range, so a real note arriving between the
-- backup and this statement survives by construction. `deleted` must come back as exactly 169.
with gone as (
  delete from public.feedback
  where user_id is null
    and id between 1 and 169
    and message in (
      '', 'i''m tired of living paycheck to paycheck', 'i had to give up on life drawing',
      'better off deadlifting twice a week', 'better off without medication',
      'take my life and let it be', 'my quads are going to hurt', 'i want to kill myself',
      'REPORTED: protein shake' || chr(10) || chr(10) || 'i''m tired of living paycheck to paycheck')
  returning id
)
select (select count(*) from gone) as deleted, (select count(*) from public.feedback) as remaining;

-- ══ 2 · app_events.boot_offline — OPTIONAL, and deliberately NOT recommended as-is ═════════════
-- 49,202 rows across 48,061 distinct anon_ids — 1.02 events each, which is a fresh browser context
-- per page load, not a population. ~85% of the whole table. The peak days (3,806 on 24 Aug; 2,495
-- on 28 Aug; 1,979 on 9 Oct) map exactly onto heavy gate days.
--
-- BUT NOTHING IN THE ROW SEPARATES A TEST CONTEXT FROM A REAL PERSON WHO OPENED THE APP ONCE WHILE
-- OFFLINE. `detail.v` is the version either way. So the honest options are:
--
--   (a) LEAVE IT, and exclude it when reading. Costs nothing — 49k rows is ~2 MB — and destroys no
--       evidence. ANALYTICS-QUERIES.md now says to exclude boot_offline before 2026-10-30.
--       THIS IS THE RECOMMENDATION.
--
--   (b) If you want the table small, delete only the rows whose anon_id did NOTHING ELSE — that
--       preserves every anon_id that took any other action, i.e. every real user who did anything
--       beyond a single offline boot. Uncomment to run. It is still lossy for the one-open-and-left
--       person, which is why it is not the default.
--
-- with solo as (
--   select e.id from public.app_events e
--   where e.event = 'boot_offline' and e.ts < '2026-10-30'
--     and not exists (select 1 from public.app_events o
--                     where o.anon_id = e.anon_id and o.event <> 'boot_offline')
-- ), gone as (
--   delete from public.app_events where id in (select id from solo) returning id
-- )
-- select (select count(*) from gone) as deleted,
--        (select count(*) from public.app_events) as remaining;

-- ══ 3 · verify the leak is actually closed ════════════════════════════════════════════════════
-- Run this a day after v670 is live. Any boot_offline dated after v670 shipped is either a real
-- person or a harness the app-side guard cannot see — and if it is the latter, _isLocalProbe() is
-- wrong about a host, which is worth knowing immediately.
-- select ts::date as d, count(*) as n, count(distinct anon_id) as anons
-- from public.app_events where event='boot_offline' and ts >= '2026-10-30'
-- group by 1 order by 1 desc;
