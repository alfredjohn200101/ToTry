-- ============================================================================
-- To Try — Row Level Security, in one go
-- Project: oklvalcgxeoudgpldzkk
--
-- WHY: Supabase flagged `rls_disabled_in_public`. With RLS off, the anon key —
-- which ships inside index.html and is therefore public — can read, edit and
-- DELETE every row in that table. For `user_data` that is every user's journal,
-- vices, money and prayers. This closes it.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste all of this →
-- Run. It is idempotent: safe to run again, and re-running is the way to repair
-- drift later.
--
-- SAFE BY CONSTRUCTION:
--   · Wrapped in a transaction. If any statement fails, NOTHING is applied, so
--     you can never end up with RLS on and no policy (which locks the app out
--     of its own data).
--   · Every block checks the table exists first, so a table you have not created
--     is skipped instead of aborting the run.
--   · Policies are dropped and recreated by name, so this converges on the same
--     end state no matter what is there now.
--   · Uses ENABLE, not FORCE. FORCE would also subject the table OWNER to RLS.
--     Almost certainly harmless — your edge function talks to the DB with the
--     service role, which bypasses RLS either way — but it is extra risk on a
--     live database for no benefit against this alert, so it is left off.
--
-- WHAT IT ASSUMES (from the app's actual queries, not the old docs — the docs in
-- AI-PROXY-DEPLOY.md say user_data(key, value) but the app really uses
-- data_key/data_value):
--   user_data(user_id, data_key, data_value, updated_at)
--   push_subscriptions(user_id, ...)
--   feedback(type, message, email, app_info, created_at)
--   shared_library(id, kind, name, norm, data, verified, approved, flagged, votes, created_at)
--   app_events(anon_id, event, detail, standalone)
-- If a column name differs, the statement naming it will fail, the transaction
-- rolls back, and nothing breaks — send me the error and I will adjust.
-- ============================================================================

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_data — the whole app's private data. One row per key per user.
--    Nobody may ever see anyone else's row.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='user_data') then

    alter table public.user_data enable row level security;

    drop policy if exists "user_data own select" on public.user_data;
    drop policy if exists "user_data own insert" on public.user_data;
    drop policy if exists "user_data own update" on public.user_data;
    drop policy if exists "user_data own delete" on public.user_data;
    -- Older names, in case a previous attempt used them:
    drop policy if exists "own rows - select" on public.user_data;
    drop policy if exists "own rows - insert" on public.user_data;
    drop policy if exists "own rows - update" on public.user_data;
    drop policy if exists "own rows - delete" on public.user_data;

    create policy "user_data own select" on public.user_data
      for select to authenticated using (auth.uid() = user_id);
    create policy "user_data own insert" on public.user_data
      for insert to authenticated with check (auth.uid() = user_id);
    -- UPDATE needs both: USING says which rows you may touch, WITH CHECK stops
    -- you rewriting user_id to someone else's on the way out.
    create policy "user_data own update" on public.user_data
      for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
    -- DELETE matters for "Delete account permanently" (App Store 5.1.1(v)).
    create policy "user_data own delete" on public.user_data
      for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. push_subscriptions — one row per user. Same rule.
--    The DELETE policy is also what makes account deletion truthful: without it
--    the app's delete silently no-ops and the row outlives the account.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='push_subscriptions') then

    alter table public.push_subscriptions enable row level security;

    drop policy if exists "push own row" on public.push_subscriptions;
    drop policy if exists "own push row" on public.push_subscriptions;

    create policy "push own row" on public.push_subscriptions
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. feedback — messages people send you, with their email.
--    Write-only from the app: anyone may send, NOBODY may read it back (you read
--    it in the dashboard, which uses the service role and bypasses RLS).
--    Delete is restricted to your own email so account deletion can remove it.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='feedback') then

    alter table public.feedback enable row level security;

    drop policy if exists "feedback insert any" on public.feedback;
    drop policy if exists "feedback delete own" on public.feedback;
    drop policy if exists "anyone can insert feedback" on public.feedback;

    -- Guests can send feedback too, so anon is included deliberately.
    create policy "feedback insert any" on public.feedback
      for insert to anon, authenticated with check (true);

    -- Own email only, taken from the verified JWT — not from anything the client
    -- can claim. A signed-out user cannot delete anything.
    create policy "feedback delete own" on public.feedback
      for delete to authenticated
      using (email is not null and email = (auth.jwt() ->> 'email'));

    -- NOTE: no SELECT policy on purpose. With RLS on and no select policy, the
    -- anon key cannot read a single row of anyone's messages.
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. shared_library — the community food/exercise library.
--    Read: only rows you have approved and not flagged. Write: signed-in users
--    may SUBMIT (insert) but may NOT update, or they could flip approved=true on
--    their own submission and publish straight past you. Approving and deleting
--    are yours alone, enforced here rather than only in the client.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='shared_library') then

    -- Defensive, and free if they already exist: the app FILTERS on `flagged` but never writes it, and
    -- the contribute path upserts with onConflict 'kind,norm'. If the live table predates the documented
    -- schema, a missing column or unique index makes both queries error — which the app swallows, so the
    -- shared library would silently never load. These are no-ops when already present.
    alter table public.shared_library add column if not exists flagged boolean not null default false;
    create unique index if not exists shared_library_kind_norm_key on public.shared_library (kind, norm);

    alter table public.shared_library enable row level security;

    drop policy if exists "shared read approved" on public.shared_library;
    drop policy if exists "shared insert signed in" on public.shared_library;
    drop policy if exists "shared admin all" on public.shared_library;
    drop policy if exists "shared admin update" on public.shared_library;
    drop policy if exists "shared admin delete" on public.shared_library;

    -- Guests use the app, so anon reads the approved library too.
    create policy "shared read approved" on public.shared_library
      for select to anon, authenticated
      using (approved = true and coalesce(flagged, false) = false);

    -- Submissions land unapproved. WITH CHECK enforces that — a client cannot
    -- insert a pre-approved row.
    create policy "shared insert signed in" on public.shared_library
      for insert to authenticated
      with check (coalesce(approved, false) = false);

    -- You: read the moderation queue, approve, and delete.
    create policy "shared admin update" on public.shared_library
      for update to authenticated
      using ((auth.jwt() ->> 'email') in (
        'alfredjohn200101@gmail.com',
        'alfredjohn200101@yahoo.com',
        'alfredjohn200101+studio@gmail.com'))
      with check (true);

    create policy "shared admin delete" on public.shared_library
      for delete to authenticated
      using ((auth.jwt() ->> 'email') in (
        'alfredjohn200101@gmail.com',
        'alfredjohn200101@yahoo.com',
        'alfredjohn200101+studio@gmail.com'));

    -- The moderation queue reads approved=false, which the public read policy
    -- excludes — so it needs its own admin select.
    create policy "shared admin read queue" on public.shared_library
      for select to authenticated
      using ((auth.jwt() ->> 'email') in (
        'alfredjohn200101@gmail.com',
        'alfredjohn200101@yahoo.com',
        'alfredjohn200101+studio@gmail.com'));
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. app_events — the anonymous feature counter. Keyed by a random anon_id, no
--    email, no content. Write-only, and it must work for signed-OUT users.
--    No SELECT policy: nobody can enumerate it with the public key.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='app_events') then

    alter table public.app_events enable row level security;

    drop policy if exists "events insert any" on public.app_events;
    create policy "events insert any" on public.app_events
      for insert to anon, authenticated with check (true);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ai_usage and user_credits — written only by the edge function, which uses
--    the service role and bypasses RLS entirely. Users may read their own credit
--    balance so the app can show "credits left"; nothing else is reachable.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='ai_usage') then
    alter table public.ai_usage enable row level security;
    -- No policies at all: the service role is the only writer or reader.
  end if;

  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='user_credits') then
    alter table public.user_credits enable row level security;
    drop policy if exists "read own credits" on public.user_credits;
    create policy "read own credits" on public.user_credits
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Catch-all: anything else in `public` that still has RLS off.
--    This is what actually answers the alert — if the flagged table is one I do
--    not know about, this turns RLS on for it. It adds NO policies, so such a
--    table becomes service-role-only. If that turns out to be a table the app
--    needs, the app will start failing on it visibly rather than leaking, and
--    you send me the name.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'          -- ordinary tables only
      and c.relrowsecurity = false -- RLS still off
  loop
    raise notice 'Enabling RLS on unlisted table: public.%', t.relname;
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end $$;

commit;

-- ============================================================================
-- VERIFY — run this after, and read the output.
-- Every row should say rls_enabled = true. `policies` = 0 is correct and
-- deliberate for ai_usage and app_events; it is a PROBLEM for user_data.
-- ============================================================================
select
  c.relname                                as table_name,
  c.relrowsecurity                         as rls_enabled,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relrowsecurity, c.relname;
