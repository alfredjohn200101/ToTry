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

**Re-audited 10 Oct 2026 at v610, and they DID disagree again — in the direction that matters.**
The manifest declares **eleven** collected types and this table listed ten of them. The missing one is
**Photos or Videos**, and it is genuinely collected: the food camera base64s a downscaled JPEG and
sends it to the `ai-proxy` edge function, which forwards it to a third-party vision model
(`src/app/14-nourish.js:1158` builds the base64, `:1168` invokes
`sb.functions.invoke('ai-proxy', { body:{ action:'vision', image_base64:base64, … } })`). Both
`NSPhotoLibraryUsageDescription` and `NSPhotoLibraryAddUsageDescription` ship in `Info.plist`.
**Anyone filling the form from the old table would have under-declared.** The row is added below.

Two smaller corrections from the same audit:
- **`SYNC_KEYS` is 184 keys, not 178.** Six were added between v512 and v610. None of them opens a new
  Apple category — the new keys are more of what is already declared.
- **"Contacts → No" is correct, and the reason was never written down, which made it look like an
  assumption.** It is defensible on evidence: there is **no `NSContactsUsageDescription`** in
  `Info.plist` and **no address-book API anywhere** in the bundle or the Swift. The app does hold a
  short list of other people — `totry_your_few`, which syncs — but every entry is
  `{name, note}` with the name **typed by the person** and capped at 40 characters
  (`src/app/23-evening.js:1345`), never read from the device. Say that if review asks.

Every claim below was checked against `index.html`, re-verified at v610.

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
| User Content → Photos or Videos | **Yes** | **No** | No |
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
`NSHealthUpdateUsageDescription`, plus the `com.apple.developer.healthkit` entitlement).
It does NOT carry background delivery — this line used to claim it did, and the shipping IPA's
entitlements carry `com.apple.developer.healthkit` alone. A doc that restates a mutable fact
about the binary is wrong the moment the binary changes, which is why this one now names the
exact key: verify with `codesign -d --entitlements - --xml <app>` against the IPA, never the
archive.
Purpose: **App Functionality**.

> Note for the HealthKit review question: HealthKit data is used only to show the person their own
> figures and to inform in-app coaching. It is not used for advertising, and it is not sold or shared
> with third parties. Be ready to say that in the review notes.

### User Content → Photos or Videos — collected, linked
**Added 10 Oct 2026. Corrected 15 Oct 2026 — "the only photo path" was never true, and this is the
THIRD time a doc that merely DESCRIBES behaviour has gone stale underneath it.** There are **six**
user-facing image paths, not one, and every one of them transmits: a form check, a meal photo, a
barcode/package photo when the scanner cannot read the code, a workout screenshot, a smart-scale
screenshot, and a recipe screenshot (the last added in this release). Counted, not recalled — the
shipped bundle carries 8 `image_base64` call sites, of which 6 are reachable by a person choosing an
action. The ANSWER is unchanged (Yes / collected / linked, because the question asks whether photos
leave the device, not how many doors do it), but the reasoning under it was wrong, and
`privacy.html` + `showPrivacyPolicy()` both enumerate the set EXHAUSTIVELY — so a new path is a
copy change in three files or the promise becomes false. `downscaleImage`
re-encodes the picture at 1280px / quality 0.8 (`src/app/14-nourish.js:1125`), the data URL is split to
base64 (`:1158`), and that base64 goes to the `ai-proxy` edge function with `action:'vision'`, which
forwards it to a third-party vision model for a meal estimate. The photo is not stored in Supabase —
only the resulting food entry is — but it **leaves the device**, which is what the question asks.
`NSPhotoLibraryUsageDescription` and `NSPhotoLibraryAddUsageDescription` are both in `Info.plist`, and
`NSCameraUsageDescription` covers the live capture and the barcode scanner.
Purpose: **App Functionality**.

### Financial Info → Payment Info — NOT collected, and the one thing that looks like it isn't
Worth recording because a text search suggests otherwise: grepping for `stripe` matches
`src/app/14-nourish.js:2211`, which is **UI copy about a barcode's stripes**. There is no card field,
no payment SDK and no checkout anywhere in the app. The claim below is correct.

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
`SYNC_KEYS`. This is worth saying plainly in the privacy policy too, because it is better than what
most apps in this category do.

⛔ **"Do not tick Photos" used to be the next sentence, and it contradicted this file's own table 71
lines above it** (`User Content → Photos or Videos | **Yes**`). Both halves were written honestly and
about different things: progress photos stay on the device, and the FOOD CAMERA transmits. **Photos
or Videos IS declared** in `PrivacyInfo.xcprivacy` and must be ticked — as NOT linked, because the
image is neither stored nor tied to the account. A sheet that argues with itself gets answered from
whichever half you read last.

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
| **AI providers** via the `ai-proxy` edge function. Read from `supabase/functions/ai-proxy/index.ts`, not from memory — this list said "Gemini → Groq → OpenRouter → Anthropic" and was short three. TEXT (`DEFAULT_ORDER`, :43): Gemini → Groq → OpenRouter → Mistral → Cloudflare → Anthropic. VISION (:572): Gemini → OpenRouter → Mistral → Cloudflare → NVIDIA. `privacy.html` already states both correctly; this file did not, and it is the file that says to fill the policy from it | the person's messages plus `lifeStateBrief()`, which summarises health, fitness, money and faith context |
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
