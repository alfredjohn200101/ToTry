# Who pays for the AI, and what "connect your own account" actually means

> *"maybe that's for a paid version of this app so that payment can go to ai credits or if maybe
> someone can connect their own chatgpt or claude accounts to the app to use their own credit instead
> of ours if our free limits per user get used up? ... I'd rather build something capable than one
> thing that cannot."*

Three answers, and the middle one is not what it looks like.

1. **The app's automatic AI demand is small and already mostly guarded** — measured, below.
2. **"Our free limits per user" do not exist.** Every free tier in the chain is metered **per
   project**, so there is one allowance shared by everyone. The ceiling does not grow with users; it
   gets divided by them.
3. **"Connect their own Claude account" is not permissible**, and "connect their own ChatGPT account"
   does not mean their subscription. The workable version is an **API key**, which is a different
   product from the $20/month plan — and most people do not know that.

---

## 1. What the app actually asks for — censused, not guessed

51 `api()` call sites across `src/app/`. They split into two very different populations.

**Automatic (fires with no tap), and what guards it:**

| Surface | Fires | Guard |
|---|---|---|
| `showAIMorningSentence` | morning ritual | cached per day (`totry_ai_morning_<dayKey>`) |
| `refreshAIPushMessages` | scheduled | throttled on `totry_ai_push_at` |
| `maybeUpdateCoachMemory` | after coach exchanges | once/day **and** only every 4 exchanges |
| `getProgressiveSuggestion` | every Train open | cached on day + workout count |
| `generateWeeklySynthesis` | Sundays | once per week key |

That is roughly **2–4 automatic calls per person per day**, and every one of them is day-keyed or
throttled. `getProgressiveSuggestion` was the outlier — it went to the model on *every* Train open,
roughly a quarter of a median person's whole AI volume, for a line nobody asked for. It is cached now.

**On-tap (a person asked for it):** the companion, the coach, the food camera and its vision path,
food/exercise/scripture search, recipe and calendar parsing, the fuel plan, the "explain this"
surfaces. This is the variable, it is unbounded, and **it is the part that makes the app good.** Do
not optimise it away.

**The one rule worth keeping forever:** an automatic call is everyone's ceiling. On-tap spends one
person's share; automatic spends it for all of them. Every new automatic surface needs a day-cache
before it ships, and the gate should be asked to prove it.

---

## 2. The structural problem: the free tier is per project

The chain is five free providers then one paid last resort — gemini → groq → openrouter → mistral →
cloudflare → anthropic. Five of six are verified live (2 Sep 2026, `AI-PROXY-DEPLOY.md`), and
`body.prefer` makes each link probeable. That is genuinely good engineering and it removed the
single-provider outage risk.

**It does not solve the scaling problem, because none of those tiers is per user.** One API key per
provider, one allowance, shared by the whole install base. At ten users it is invisible. At a
thousand, each person's share is a rounding error, and the first thing they meet is the fallback
copy.

And the ceiling moves. Published free-tier limits for `gemini-2.5-flash` during 2026 are reported
across sources as **20**, **250** and **1,500** requests per day, with a sharp tightening around
December 2025. They cannot all be right, and that is the point: **do not design around a number that
a vendor can change without telling you.** Design around the shape — shared, finite, volatile.

The honest read: the free chain is the right thing for the beta and it is not a business model.

---

## 3. "Connect their own account" — the part that needs correcting

This is the answer that matters most, because the feature as pictured cannot be built for one vendor
and means something different from what people expect for the other.

**Anthropic — no.** Anthropic's consumer terms restrict Pro/Max subscription OAuth tokens to
first-party surfaces (claude.ai and Claude Code). Third-party services are not permitted to route
requests through Pro or Max credentials. There is a standing feature request for exactly this and it
is not granted. So "connect your Claude account" is not something ToTry may offer.

**OpenAI — greyer, and not a documented permission.** OpenAI publishes no equivalent restriction, and
some third-party apps do ship a bring-your-own-subscription mode against a personal ChatGPT/Codex
quota. That is a thing that exists; it is not a thing a vendor has promised to keep working.

**And the thing most people get wrong:** a ChatGPT Plus or Claude Pro subscription **does not include
API access.** They are separate products with separate billing. Someone who pays $20 a month and is
told "connect your account to use your own credit" will try, and discover they have to sign up for
something else and put a card on it.

So the feature is real but its name is wrong. It is **"use your own API key"**, not "connect your
account", and the copy has to say so plainly or it generates support load and disappointment.

---

## 4. What I would build, in order

**Phase 1 — keep the automatic surface honest.** Mostly done. Every automatic call is day-cached;
keep it that way and make the gate say so when a new one appears. This is free and it is the highest
return per unit of effort here.

**Phase 2 — bring your own API key, named honestly.** Settings → *Use your own AI key*, a field per
provider, stored **device-local and never synced** (same rule as the shield in `EARNED-ACCESS.md` and
the four precedents it names — a key restored onto a second phone is a credential nobody put there).
The copy leads with the correction: *"This is an API key from the provider's developer console — not
your ChatGPT or Claude subscription. They are billed separately."*

This costs nothing to run, it removes the ceiling for exactly the people who hit it, and it is the
honest version of what was asked for. It does move one thing: the proxy currently takes identity from
the request, and a per-user key changes who is being metered — that needs settling before it ships.

**Phase 3 — a paid tier, only once the free chain demonstrably runs out.** Not before. And when it
comes, **flat, not metered.** The soul document says the app must never farm engagement; a tier that
charges by usage is an engagement incentive pointed the wrong way, and the person most likely to hit
it is someone talking to the companion at 2am — precisely the person you least want to meter.

**Phase 4 — the AI life coach.** *"what's next in life"* is the feature that would actually move the
bill: long context, multi-turn, and worth real tokens. It belongs after the funding question is
answered, not before it.

---

## 5. What the economics says about the product

> *"I want it to be something that helps me the more i'm on it rather than not."*

Held against the soul document — *"it must never foster dependence or farm engagement
(anti-engagement is a feature, not a bug)"* — these look like they collide. They do not, but the
distinction has to be said out loud:

> **More use is fine. More time is not.** The app should be worth opening often and worth closing
> fast.

AI cost turns out to be a decent proxy for that. The surfaces that cost the most — the companion at
2am, the coach — are exactly the ones whose success condition is the person putting the phone down.
A session that ends with The Release is a cheap session *and* a good one. If the bill ever starts
climbing because people are staying longer, that is the product telling you something before the
invoice does.

---

## 6. What is not known

- **Real per-user volume.** Nobody has used this at scale. The measured automatic floor is 2–4
  calls/person/day; the on-tap ceiling is unbounded and unobserved. Every cost projection before
  TestFlight is arithmetic on an invented number.
- **Where the free tiers land.** They moved sharply in the last year and the published figures
  disagree. Re-measure against the live proxy rather than trusting a table — `body.prefer` exists for
  exactly this.
- **Whether OpenAI's subscription route stays open.** It is undocumented, not promised.

---

**Sources**

- [Allow Claude Pro/Max subscription auth to be used from third-party apps — anthropics/claude-code#82266](https://github.com/anthropics/claude-code/issues/82266)
- [Does ChatGPT Plus Include API Access? No, It's Separate](https://folding-sky.com/blog/why-use-api-keys-not-chatgpt)
- [API Key vs Subscription: What Your $20 Actually Buys](https://felloai.com/ai-api-key/)
- [Claude Pro/Max Subscription with OpenClaw — Why We Don't Offer It](https://openclawlaunch.com/guides/openclaw-claude-subscription)
- [Rate limits — Gemini API, Google AI for Developers](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini API Free Tier Rate Limits 2026](https://aipromptshub.co/blog/gemini-api-free-tier-rate-limits)
- In-repo: `AI-PROXY-DEPLOY.md` (the measured live chain), `supabase/functions/ai-proxy/index.ts`
