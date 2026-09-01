# To Try — ai-proxy deploy guide

This is everything to get the backend matching the app (cache v128).

## ✅ DEPLOYED AND VERIFIED LIVE — 31 Aug 2026

Both functions were redeployed on 31 Aug 2026 and probed against the live project. Everything the
section below describes as broken is now fixed IN PRODUCTION:

| probe | result |
|---|---|
| `ai-proxy` text — meal estimate at `max_tokens: 700` | complete JSON, 2.75s, gemini-2.5-flash, no fallbacks |
| `ai-proxy` vision — the food camera path | complete JSON at `max_tokens: 500`, 2.26s |
| `key-proxy` FatSecret token | HTTP 200, access token issued |
| `key-proxy` ESV / USDA | both true |
| `push_subscriptions` column types | already `text`/`text`/`jsonb`/`jsonb` — the boolean migration was NEVER needed |

700 tokens is the exact budget that used to return 74 characters ending mid-number. The food camera
works.

**THE FATSECRET `invalid_client` WAS NOT (ONLY) OUR SUBSTRING BUG.** After the substring fix shipped it
still failed, and the cause was FatSecret's own console: the credentials it shows you most readily are
the **OAuth 1.0 Consumer Key/Secret**, and this proxy speaks **OAuth 2.0**
(`oauth.fatsecret.com/connect/token`, `grant_type=client_credentials`, Basic `id:secret`). The OAuth 2.0
pair is a **Client ID + Client Secret**, and the secret is shown ONCE at creation — a dashboard showing
a Client ID with no secret beside it means you must regenerate it. Feeding the 1.0 Consumer pair into
the 2.0 endpoint returns `invalid_client` forever, however carefully it is copied.

Known cosmetic wart: `{"provider":"status"}` reports `working_pair: null` even when the credentials
work, because `fsWorkingPair` is cached per warm instance and the status path never performs an
exchange. Trust `{"provider":"fatsecret"}` (a 200 with an access_token), not the status field.

**What is still true:** Gemini is the only verified link in the AI chain. Groq and OpenRouter cannot be
tested from the client — the order comes from `AI_PROVIDER_ORDER` with no per-request override — so set
that env var to `groq`, probe, then `openrouter`, then set it back. Until one of them is confirmed, a
single Gemini outage takes the food camera, the companion and the coach together.

## FREE PROVIDERS — what is wired, what was rejected, and why

Verified live on 1 Sep 2026, each against the vendor's own API or machine-readable model list. Nothing
here is from memory or a blog post: this repo has been burned four times by dead endpoints hiding
behind a fallback chain, so an unverified model id is treated as no model id.

### The text chain — free first, paid last
`gemini → groq → openrouter → mistral → cloudflare → anthropic`

### The vision chain — the food camera, now five deep instead of two
`gemini → openrouter → mistral → cloudflare → nvidia → 503 (naming every attempt)`

| Provider | Free? | Secrets | Where to get it |
|---|---|---|---|
| Gemini | standing free tier | `GEMINI_API_KEY` | aistudio.google.com/apikey — **live, answering** |
| Groq | standing free tier | `GROQ_API_KEY` | console.groq.com/keys — **live, answering** |
| OpenRouter | standing free tier (`:free` models) | `OPENROUTER_API_KEY` | openrouter.ai/keys — **live, answering** |
| **Mistral** | **standing free tier, no card** | `MISTRAL_API_KEY` | console.mistral.ai → API Keys (shown once) |
| **Cloudflare** | **10,000 Neurons/day, resets 00:00 UTC, hard-stops rather than billing** | `CLOUDFLARE_API_TOKEN` **and** `CLOUDFLARE_ACCOUNT_ID` | dash.cloudflare.com → Workers AI → Use REST API |
| **NVIDIA** *(vision only)* | 1,000–5,000 **lifetime** credits, no card | `NVIDIA_API_KEY` | build.nvidia.com/settings/api-keys |
| Anthropic | PAID, last resort | `ANTHROPIC_API_KEY` | set, but **credit balance is zero** — errors cleanly and falls through |

Every provider SKIPS silently when its key is absent, so keys can be added one at a time and an
unconfigured one costs nothing. Optional per-provider model pins: `MISTRAL_MODEL`,
`MISTRAL_VISION_MODEL`, `CLOUDFLARE_MODEL`, `CLOUDFLARE_VISION_MODEL`, `NVIDIA_VISION_MODEL` — a pin is
tried FIRST and the built-in list still follows it, so a stale pin costs a request, never the provider.

### Three dialects that would fail silently, and are covered by tests
- **Mistral's `image_url` is a plain STRING**, not OpenAI's `{url:...}` object. The object form returns
  a 422 that reads exactly like a dead model.
- **NVIDIA's vision models REJECT `role:"system"`** — three of the four candidates enumerate only
  user/assistant. The system text is folded into the user's text part instead.
- **Cloudflare needs BOTH secrets** (the account id is in the URL) and returns a bespoke
  `{errors:[{message}]}` body that `extractErrorMsg` could not read, so its failures used to land in
  `attempts` as an unreadable blob. Both fixed; `npm run test:edge` fault-injects all three.

### Rejected, with the reason — do not re-add these
- **GitHub Models — RETIRED.** Fully shut down 30 Jul 2026. `models.github.ai` returns **410** on every
  path and `models.inference.ai.azure.com` is **NXDOMAIN**. There is no successor and no key can be
  obtained. It was a genuinely good free tier, which is exactly why it is worth writing down as dead.
- **Cerebras — not free.** $5 of credits that expire 30 days after they are granted, and only after a
  verified payment method is added. Its public model list prices every model non-zero. A free TRIAL
  behind a card is not a backstop.
- **Hugging Face — too small, and fails as 402.** $0.10/month of Inference Providers credit on a free
  account. On exhaustion the router returns **402 Payment Required**, which is the precise shape that
  has hidden behind this chain before. Not worth a key.

---

## ⚠ WHY THE REDEPLOY MATTERED — measured against the LIVE proxy, 28 Aug 2026 (HISTORICAL)

The deployed `ai-proxy` is behind `supabase/functions/ai-proxy/index.ts` in this repo, and the gap is
what broke the AI food estimate for every real meal:

- **The deployed version does not cap Gemini's thinking budget.** Gemini 2.5 Flash spends the token
  budget reasoning before it writes a character, so at `max_tokens: 700` a meal estimate came back as
  74 characters ending mid-number (`"carb":123`), flagged `note: "best available (truncated)"`, and
  the app's `JSON.parse` threw. On a perfect connection. Every time.

  Measured, deployed version: simple `{name,cal,pro,…}` needs **1800** tokens to parse; the full
  `{name, items:[…], total:{…}}` shape needs **4000**.

  The local source sets `thinkingConfig: { thinkingBudget: 0 }` on the text path (and now the VISION
  path too — that one was missed). Redeploying gives the whole budget to the answer, which makes food
  logging both work at a much smaller budget and finish noticeably faster.

- **Groq is dead in the deployed version**: it returned
  `404 The model 'qwen/qwen3-32b' does not exist or you do not have access to it`.
  That id is removed from the local source; four current candidates remain.

- **OpenRouter returned 429** (free-tier quota). Its three model ids are still live — re-verified in
  the public `/api/v1/models` on 28 Aug 2026 — so that is quota, not rot. **Topping up any second
  provider removes the single point of failure**: right now Gemini is the only working link, so one
  Gemini outage takes the food camera, the companion and the coach with it.

The app compensates client-side in the meantime (`api()` floors `max_tokens` at 2000, the meal
estimate sends 4000, the truncation retry caps at 6000). Those are ceilings, so they stay harmless
after the redeploy.


## 1. Deploy the function

Put `ai-proxy.ts` at `supabase/functions/ai-proxy/index.ts` in your project, then:

```bash
supabase functions deploy ai-proxy --no-verify-jwt
```

**Important — turn OFF JWT verification for this function.** The proxy does its own user-ID
extraction (from the request body or by decoding the token) and is built to degrade gracefully for
anonymous calls. If Supabase's gateway enforces `verify_jwt` (the default), it returns 401 BEFORE
your code runs — breaking the coach, food search, and vision whenever a token is missing, expired,
or still refreshing.

- **CLI:** the `--no-verify-jwt` flag above.
- **Dashboard:** Edge Functions → `ai-proxy` → Settings → set **Verify JWT = off**.
- **config.toml:** under `[functions.ai-proxy]` add `verify_jwt = false`.

This is safe: the function still rate-limits per user and never exposes secrets to the client.

## 2. Set the secret (required)

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-real-key
```

That's the only thing the function *needs*. Your Anthropic key lives here on the
server — never in the index.html.

## 3. (Optional) per-user daily AI limit

Protects your API spend from a single user hammering it. Skip this entirely if you
don't want it — the function works fine without it.

```bash
supabase secrets set DAILY_AI_LIMIT=150
```

If you set a limit, create this tiny table once (SQL editor):

```sql
create table if not exists public.ai_usage (
  user_id uuid not null,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
-- The function uses the service role, so no RLS policy is needed for it to write.
-- But enable RLS so nothing else can read it:
alter table public.ai_usage enable row level security;
```

### Daily limit + purchasable credits (copy-paste whole block)

This gives every user a **free daily AI limit** and lets you grant **bonus credits** (e.g. after a
purchase) that are spent only once the free limit is used up. Paste the entire block into the
Supabase SQL editor. The proxy calls `check_ai_quota`; if you don't deploy this, it falls back to
the simpler `increment_ai_usage` (free limit only, no credits).

```sql
-- Per-user purchasable credit balance. bonus_credits = extra AI calls beyond the free daily limit.
create table if not exists public.user_credits (
  user_id       uuid primary key,
  bonus_credits int not null default 0,        -- remaining purchased credits
  total_purchased int not null default 0,      -- lifetime, for your records
  tier          text not null default 'free',  -- 'free' | 'supporter' | etc (future use)
  updated_at    timestamptz not null default now()
);
alter table public.user_credits enable row level security;

-- A user may READ their own balance (so the app can show "credits left"); only the service role writes.
create policy "read own credits" on public.user_credits
  for select using (auth.uid() = user_id);

-- Atomic quota check. Increments today's usage; if within the free limit -> allowed.
-- If over the free limit but the user has bonus credits -> spend one credit, allowed.
-- Otherwise -> not allowed. Runs as the function owner (service role) so it bypasses RLS safely.
create or replace function public.check_ai_quota(p_user_id uuid, p_free_limit int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count   int;
  v_bonus   int;
begin
  -- bump today's usage
  insert into public.ai_usage (user_id, day, count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into v_count;

  -- within the free daily allowance?
  if v_count <= p_free_limit then
    select coalesce(bonus_credits,0) into v_bonus from public.user_credits where user_id = p_user_id;
    return json_build_object('allowed', true, 'used', v_count, 'free_limit', p_free_limit,
                             'bonus_remaining', coalesce(v_bonus,0));
  end if;

  -- over the free limit: try to spend a bonus credit
  update public.user_credits
     set bonus_credits = bonus_credits - 1, updated_at = now()
   where user_id = p_user_id and bonus_credits > 0
  returning bonus_credits into v_bonus;

  if found then
    return json_build_object('allowed', true, 'used', v_count, 'free_limit', p_free_limit,
                             'bonus_remaining', v_bonus, 'spent_credit', true);
  end if;

  -- no free allowance left and no credits
  return json_build_object('allowed', false, 'used', v_count, 'free_limit', p_free_limit,
                           'bonus_remaining', 0);
end;
$$;

revoke all on function public.check_ai_quota(uuid, int) from public, anon, authenticated;
-- (only the service role, used by the edge function, calls this)
```

**Granting credits.** Until you wire up a payment provider, you can grant credits manually after a
purchase (or as a gift) from the SQL editor:

```sql
insert into public.user_credits (user_id, bonus_credits, total_purchased, tier)
values ('THE-USER-UUID', 500, 500, 'supporter')
on conflict (user_id) do update
  set bonus_credits   = public.user_credits.bonus_credits + excluded.bonus_credits,
      total_purchased = public.user_credits.total_purchased + excluded.bonus_credits,
      tier            = excluded.tier,
      updated_at      = now();
```

When you later add a real checkout (e.g. Stripe), its **webhook** runs exactly this insert/upsert
server-side after a successful payment — no app or proxy change needed. The free daily limit is set
by the `DAILY_LIMIT_PER_USER` env var on the edge function (default 200).

## 4. Verify the three core tables exist with correct RLS

The app talks to these directly. The most important is `user_data` — if its RLS is
wrong, cloud sync silently fails and the coach/nervous-system reads empty.

```sql
-- CORE SYNC TABLE
create table if not exists public.user_data (
  user_id uuid not null,
  key text not null,
  value jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);
alter table public.user_data enable row level security;

create policy "own rows - select" on public.user_data
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on public.user_data
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on public.user_data
  for update using (auth.uid() = user_id);
create policy "own rows - delete" on public.user_data
  for delete using (auth.uid() = user_id);
```

> NOTE: confirm the column shape of `user_data` matches what your app already
> writes. The app does `.upsert({ user_id, ... })`. If your existing table uses a
> single jsonb blob instead of key/value rows, KEEP your existing shape — don't
> recreate it. Only add the table if it doesn't exist yet.

```sql
-- PUSH SUBSCRIPTIONS
create table if not exists public.push_subscriptions (
  user_id uuid primary key,
  subscription jsonb,
  tz_offset_minutes int,
  remind_morning text default '07:30',        -- a TIME, not a flag: the app writes '07:30'
  remind_evening text default '21:00',        -- likewise
  ai_morning_messages text[],                 -- the generated message set, an array of strings
  ai_evening_messages text[]
);
-- IF YOU CREATED THIS TABLE BEFORE 18 Aug 2026, these four columns were typed `boolean` and the app
-- writes a time string and an array into them — so every attempt to enable reminders failed on the
-- insert, was swallowed by the catch, and told the person "Make sure the app is installed to your
-- Home Screen, then try again", which they had already done. Run this once to correct it:
--
--   alter table public.push_subscriptions
--     alter column remind_morning type text using (case when remind_morning then '07:30' else null end),
--     alter column remind_evening type text using (case when remind_evening then '21:00' else null end),
--     alter column ai_morning_messages type text[] using null,
--     alter column ai_evening_messages type text[] using null;

alter table public.push_subscriptions enable row level security;
create policy "own push row" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- FEEDBACK (insert-only from the app)
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  type text,
  message text,
  email text,
  app_info text,
  created_at timestamptz default now()
);
alter table public.feedback enable row level security;
create policy "anyone can submit feedback" on public.feedback
  for insert with check (true);
```

## 5. Quick smoke test

After deploying, test the text path from your terminal (replace the URL/key):

```bash
curl -i -X POST \
  'https://oklvalcgxeoudgpldzkk.supabase.co/functions/v1/ai-proxy' \
  -H 'Content-Type: application/json' \
  -H 'apikey: sb_publishable_YdBhqYPvyxeUH0E2z--84w_RXxrIuE3' \
  -d '{"system":"You are a test.","messages":[{"role":"user","content":"Say hello in 3 words."}],"max_tokens":50}'
```

You want a `200` with `{"text":"...","provider":"anthropic","model":"..."}`.
If you get that, the coach, synthesis, CSV AI-fallback, and meal estimation all work.

## What this function does NOT cover

`strava-oauth` and `google-health-auth` are *separate* edge functions the app
calls for those integrations. They fail gracefully if absent, so only build them
when you want Strava / Google Health live. Everything else in the app runs on
`ai-proxy` alone.

---

## Shared Community Library (v143+)

To let To Try's exercise and food databases grow from real user contributions, add this table.
Without it, the app still works fully on its hardcoded library + per-user custom items — the shared
growth simply stays dormant (all calls fail silently and safely).

```sql
-- Shared, crowd-sourced library of exercises and foods.
create table if not exists shared_library (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('exercise','food')),
  name        text not null,
  norm        text not null default '',          -- normalized name for hard dedup
  data        jsonb not null default '{}'::jsonb,
  verified    boolean not null default false,    -- true = sourced from real online data, not an AI guess
  approved    boolean not null default false,    -- false = pending your review; only approved rows go public
  votes       int  not null default 1,
  flagged     boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (kind, norm)
);

alter table shared_library enable row level security;

-- Everyone signed in can READ only approved, unflagged items.
create policy "read approved library" on shared_library
  for select using (approved = true and flagged = false);

-- Admins (you) can read EVERYTHING, including pending submissions, to review them.
-- Replace the emails with yours. (auth.jwt() ->> 'email' is the signed-in user's email.)
create policy "admin read all" on shared_library
  for select using (
    (auth.jwt() ->> 'email') in ('alfredjohn200101@gmail.com','alfredjohn200101@yahoo.com')
  );

-- Anyone signed in can CONTRIBUTE (lands as approved=false, pending review).
create policy "contribute to library" on shared_library
  for insert with check (
    auth.role() = 'authenticated' and approved = false
  );

-- Only admins can APPROVE (update) or REJECT (delete) submissions.
create policy "admin update library" on shared_library
  for update using (
    (auth.jwt() ->> 'email') in ('alfredjohn200101@gmail.com','alfredjohn200101@yahoo.com')
  ) with check (true);

create policy "admin delete library" on shared_library
  for delete using (
    (auth.jwt() ->> 'email') in ('alfredjohn200101@gmail.com','alfredjohn200101@yahoo.com')
  );

create index if not exists shared_library_kind_votes on shared_library (kind, votes desc);
create index if not exists shared_library_pending on shared_library (approved, flagged, created_at desc);
```

**Review flow:** user ticks "share" → row inserts with `approved=false` → you see it under
Settings → Community submissions (visible only to your dev accounts) → Approve flips `approved=true`
(it then appears for everyone on their next pull) or Reject deletes it. The RLS enforces this
server-side too: contributors can only insert pending rows, and only your accounts can approve or
delete — so even a crafted client request can't push something live without you.

**Moderation:** to hide a bad entry, set `flagged = true` — it disappears from everyone's reads on
their next pull (cached up to 12h). A future admin pass can review low-vote or reported rows.

**Privacy:** the client never sends who contributed an item — only the item itself. It's shared
knowledge (an exercise name + body part, a food + macros), not a social feed.
