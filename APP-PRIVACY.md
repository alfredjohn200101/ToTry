# App Privacy — the answers, derived from the code

Written 17 Aug 2026 at v462. **Re-audited 19 Aug 2026 at v512 — two rows were wrong and are corrected
below.** This is the App Store Connect "App Privacy" questionnaire, answered from what the code
**actually does**, with the evidence for each answer. Fill the form from this rather than from memory —
a wrong declaration is a compliance problem, not a paperwork one, and the honest answers here are all
defensible.

**Corrected 19 Aug 2026 — this table disagreed with the shipped `PrivacyInfo.xcprivacy`, which is the
manifest Apple cross-checks your form answers against:**
- **Contact Info → Name** was missing. `totry_name` is in `SYNC_KEYS` (`src/app/00-boot.js:790`), so
  the person's first name goes to Supabase with everything else. It is **Yes**.
- **Diagnostics → Crash Data** was listed as No. A global `window.addEventListener('error', …)` at
  `src/app/28-init.js:359` sends the message, filename and line number through `logEvent()` into the
  `app_events` table (capped at five per session, no personal data). That is **Yes**, unlinked.

Ten rows now, matching `ios/App/App/PrivacyInfo.xcprivacy` exactly. If the two ever disagree again,
the manifest is the one to trust — it ships inside the binary.

Every claim below was checked against `index.html`, re-verified at v512.

---

## The short version

| Apple category | Collected? | Linked to the user? | Used for tracking? |
|---|---|---|---|
| Contact Info → Email Address | **Yes** | Yes | No |
| Contact Info → Name | **Yes** | Yes | No |
| Health & Fitness → Health | **Yes** | Yes | No |
| Health & Fitness → Fitness | **Yes** | Yes | No |
| Financial Info → Other Financial Info | **Yes** | Yes | No |
| Sensitive Info | **Yes** | Yes | No |
| User Content → Other User Content | **Yes** | Yes | No |
| Identifiers → User ID | **Yes** | Yes | No |
| Usage Data → Product Interaction | **Yes** | **No** | No |
| Location | **Yes** (coarse) | No | No |
| Diagnostics → Crash Data | **Yes** | **No** | No |
| Contacts, Browsing History, Search History, Purchases, Financial→Payment Info | No | — | — |

**"Used for Tracking" is No across the board.** Nothing is shared with a data broker or joined with
third-party data for advertising. That means **no ATT prompt is required**.

---

## Why each answer, with evidence

### Contact Info → Email Address — collected, linked
Account sign-in is email-based and `totry_user_email` is one of the **178 keys in `SYNC_KEYS`**, so it
is stored in the Supabase project alongside everything else. Purpose: **App Functionality**.

### Health & Fitness — collected, linked
Synced keys include workouts, body measurements, weight history, steps, sleep, nutrition and menstrual
cycle data. The app also reads and writes **Apple Health** (`NSHealthShareUsageDescription` /
`NSHealthUpdateUsageDescription`, plus the HealthKit entitlement including background delivery).
Purpose: **App Functionality**.

> Note for the HealthKit review question: HealthKit data is used only to show the person their own
> figures and to inform in-app coaching. It is not used for advertising, and it is not sold or shared
> with third parties. Be ready to say that in the review notes.

### Financial Info → Other Financial Info — collected, linked
Debts, logged payments, spending, budgets, subscriptions, assets and giving all sync. **Payment Info is
NOT collected** — there is no card handling anywhere in the app. Purpose: **App Functionality**.

### Sensitive Info — collected, linked
This one is easy to under-declare and must not be. Apple's "Sensitive Info" explicitly includes
**religious belief**, and `totry_faith_tradition` syncs. So do `totry_confessions`, `totry_journal` and
`totry_sex`. Purpose: **App Functionality**.

### User Content → Other User Content — collected, linked
Journal entries, prayers, letters to a future self, and `totry_coach_history` (conversations with the
in-app coach) all sync.

**Progress photos do NOT leave the device** — `totry_progress_photos` is deliberately *not* in
`SYNC_KEYS`. Do not tick Photos. This is worth saying plainly in the privacy policy too, because it is
better than what most apps in this category do.

### Identifiers → User ID — collected, linked
The Supabase auth user id. There is no advertising identifier anywhere in the app.

### Usage Data → Product Interaction — collected, **not** linked
Two destinations:
- an `app_events` table in the app's own Supabase project, keyed by `_anonId()` — a random UUID
  generated on device (`crypto.randomUUID()`), deliberately **not** the account id;
- **GoatCounter** (`totry.goatcounter.com`), a third-party analytics service — a third party receiving
  data, which the privacy policy must name.

Both are gated by `metricsOff()`. **Analytics is ON by default**; the opt-out is a reachable button in
Settings (`#metrics-toggle-btn` → `toggleMetrics()`), and its label is refreshed on Settings render so
it tells the truth about the current state.

> **Worth a decision before launch:** on-by-default analytics with a named third party is fine for the
> App Store, but for a GDPR-region user the safer posture is opt-in, or at minimum a first-run mention.
> The mechanism to flip it is one line — `metricsOff()` reads `totry_no_metrics==='1'`; inverting the
> default means treating absent-or-'0' as off until they choose. Your call, but make it deliberately.

### Location — collected coarse, not linked
Used **only** for prayer times. `NSLocationWhenInUseUsageDescription` says exactly that, the coordinate
is rounded to ~1km by `geoCoarse()` **before** it leaves the device, and it goes to `api.aladhan.com`.
Declare as **Coarse Location**, purpose App Functionality, not linked.

---

## Third parties that receive data (name these in the privacy policy)

| Service | What reaches it |
|---|---|
| **Supabase** (own project) | everything in `SYNC_KEYS` — the account's whole record |
| **AI providers** via the `ai-proxy` edge function (Gemini → Groq → OpenRouter → Anthropic) | the person's messages plus `lifeStateBrief()`, which summarises health, fitness, money and faith context |
| **GoatCounter** | page/event pings, pseudonymous |
| **api.aladhan.com** | coarse (~1km) location, for prayer times |
| **api.esv.org**, api.alquran.cloud, bible-api.com, vedicscriptures.github.io | scripture requests |
| **Strava**, **Hevy** | account-linked fitness sync (user-initiated) |
| OpenFoodFacts, FatSecret, wger, ExerciseDB | food/exercise lookups |

The full outbound host list is maintained in `sw.js` (`apiHosts`) — that array is the most reliable
inventory of where the app talks to, and is a good thing to re-read before each submission.

---

## Still yours to do in App Store Connect

1. **Age rating.** Consider it carefully: the app addresses addiction, self-harm/crisis, and sexual
   content as a vice category. It is not 4+.
2. **Review notes.** Say what HealthKit is used for (above), and that the crisis features hand off to
   real helplines rather than attempting treatment.
3. **Account deletion** — required for any app with accounts. `public.delete_own_account()` exists
   (security definer, authenticated only) and the app calls it; confirm the path end to end on device.
4. **Privacy policy URL** must name GoatCounter, the AI providers, and Supabase.
