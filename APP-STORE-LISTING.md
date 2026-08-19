# To Try — App Store Listing Copy (ready to paste)

> Fill these into App Store Connect. Character limits are Apple's; every field below is within limit.
> Where I give options, the first is my recommendation. Nothing here overclaims (no medical claims) —
> keep it that way so review goes smoothly.

---

## App Name  (limit 30)
**To Try: Whole-Life Growth**  ← recommended (25 chars — brand + top search term)

Alternatives:
- `To Try — Faith & Discipline` (27)
- `To Try` (6 — cleanest, weakest for search)

*(Home-screen display name stays "To Try" regardless — that's set in the build.)*

## Subtitle  (limit 30)
**Body, mind, money & soul**  ← recommended (24)

Alternatives:
- `Presence, not another tracker` (29)
- `Grace over shame. Show up.` (26)

## Promotional Text  (limit 170 — editable anytime without a new build)
Meet yourself the moment you feel something — and be moved through it. One home for your whole life: the fight, your body, your money, your faith. Free, no ads.

## Keywords  (limit 100 — comma-separated, NO spaces, don't repeat words already in name/subtitle)
```
habit,recovery,sobriety,discipline,prayer,meditation,bible,quran,gita,stoic,mindfulness,budget
```
*(94 chars — spans every path: bible/prayer, quran, gita, meditation/mindfulness/stoic, plus recovery. Tune freely — e.g. swap in "macros", "streak", "fasting", "stewardship".)*

## Description  (limit 4000)
```
To Try is the one home for your whole life.

Most apps track a single slice of you — your steps, your calories, your spending. To Try sees the whole person, because the parts don't live in separate boxes. A hard night, a skipped workout, an impulse buy, a prayer you keep meaning to say — they're all connected. When one app can see all of it, its counsel is true in a way no single-feature app can be.

It's a presence, not another tracker. Quiet by default and there when you need it — meeting you at the moment you actually feel something, instead of waiting for you to open a spreadsheet.

ONE LIFE, WOVEN TOGETHER
• The Fight — face the habits you're done with. When an urge hits, one tap opens a calm, proven in-the-moment guide: urge-surfing, grounding, honest logging. Grace over shame — a slip is feedback, not failure.
• Nourish — food logging that finally coaches. Search, snap a photo, or scan a barcode; correct anything; and get a real nudge ("48g short on protein — a shake gets you there"), not just a number.
• Money — stewardship, not spreadsheets. A debt-payoff strategy, "I just got paid — allocate it," and every dollar reclaimed from a habit you dropped.
• Soul — the root beneath it all. Choose your path — Christianity, Islam, Hinduism, Buddhism, or none — and it meets you there: your own sacred text, a daily verse, a prayer or meditation, and a morning-and-evening rhythm to begin and close each day.

GRACE OVER SHAME
To Try never farms your attention or feeds dependence. When you've done the day's work, it tells you to rest and put the phone down. Being easy to close is the point.

IT POINTS BEYOND ITSELF
To Try is not a replacement for real help. When something is serious, it hands you toward a human — a friend, a counsellor, a guide you trust — and keeps crisis resources one tap away.

MEETS YOU IN YOUR OWN FAITH — OR NONE
Choose your path — Christianity (the Bible), Islam (the Qur'an, prayer times), Hinduism (the Bhagavad Gita), Buddhism (the Dhammapada), or grounded secular wisdom (the Stoics) — and the reading, the daily verse, and the app's voice all follow it. Built honestly from a Christian heart, and made to serve you in yours. A dial sets how much surfaces, from full to none. And Shared Threads shows how every path meets the same human struggle — building understanding without flattening the difference between them.

Free. No ads. We don't sell your data.

To Try is for anyone quietly trying to become who they're meant to be — one honest day at a time.
```

## What's New (version 1.0)
```
The first release of To Try. Your whole life in one home — the fight, your body, your money, your faith — meeting you the moment you feel something. Thank you for being here early.
```

---

## URLs
- **Privacy Policy URL** (required): `https://alfredjohn200101.github.io/ToTry/privacy.html`  ✅ verified live
- **Support URL** (required): `https://alfredjohn200101.github.io/ToTry/`  *(or a page with a contact email — Apple just needs somewhere users can get help)*
- **Marketing URL** (optional): `https://alfredjohn200101.github.io/ToTry/`

## App Privacy ("nutrition label")

> ⚠️ **This section was WRONG until 19 Aug 2026 and would have caused an under-declaration.**
> It listed two data types and said Health & Fitness "does not leave your device". It does. 179 keys
> sync to Supabase (`SYNC_KEYS`, `src/app/00-boot.js:790`) including `totry_workouts`, `totry_body`,
> `totry_nutlog`, `totry_strava_activities`, `totry_transactions`, `totry_bills`, `totry_journal`,
> `totry_prayers` and `totry_confessions`. Under-declaring is what gets an app pulled *after* it
> ships, and Apple cross-checks these answers against the bundled `PrivacyInfo.xcprivacy`.

**The ground truth is `ios/App/App/PrivacyInfo.xcprivacy`, which is correct. Mirror it exactly.**
Ten types, all **linked to the user**, all **App Functionality**, **none used for tracking**:

| App Store Connect category | Type | Why (what in the code) |
|---|---|---|
| Contact Info | **Email Address** | passwordless sign-in |
| Contact Info | **Name** | `totry_name`, used in the app's own voice |
| Identifiers | **User ID** | Supabase user id + the anonymous `totry_anon` used for feature counts |
| Health & Fitness | **Health**, **Fitness** | `totry_workouts`, `totry_body`, `totry_nutlog`, `totry_strava_activities`, Hevy data — all synced |
| Financial Info | **Other Financial Info** | `totry_transactions`, `totry_bills`, `totry_budgets`, `totry_subscriptions`, debts |
| Sensitive Info | **Sensitive Info** | what a person is fighting, confessions, faith tradition |
| User Content | **Other User Content** | `totry_journal`, `totry_prayers`, `totry_examens`, evening reflections |
| Location | **Coarse Location** | prayer times only, rounded to ~1km before use |
| Usage Data | **Product Interaction** | GoatCounter page counts + the `app_events` feature counts |
| Diagnostics | **Crash Data** | |

**Tracking: No.** `NSPrivacyTracking = false`, `NSPrivacyTrackingDomains` empty. No ad SDK, no data
broker, no cross-app or cross-site profiling. That answer is true — but "no tracking" is NOT the same
as "no data collected", and the form asks both.

**Not collected, and you can say so honestly:**
- **Cycle data** (`totry_cycle`) — device-only unless she separately switches backup on; it is
  deliberately kept out of `SYNC_KEYS` at parse time (`src/app/00-boot.js:888`).
- **Progress photos** — device-only, and `_purgeSyncedPhotos()` deletes any a previous build uploaded.
- **Crisis-flagged journal entries** — never sent as AI context (filtered on `!e.flagged` at every
  call site that builds a prompt).

**One thing worth knowing, not a submission blocker:** `totry_hevy_api_key` is in `SYNC_KEYS`, so a
user's Hevy API key is stored in your Supabase. RLS protects it, but you are holding a third-party
credential. Consider dropping it from the sync list.

## Age Rating
Answer the questionnaire **honestly**. The app addresses recovery from habits (alcohol, gambling, pornography/lust, etc.) in a *quitting/recovery* framing with **no explicit content shown**. Expect the questions on:
- Medical/Treatment info → the recovery timelines are encouragement, with a clear "not a replacement for real help" — answer per Apple's wording.
- Alcohol, tobacco, or drug use/references → **Infrequent/Mild** (recovery-oriented).
- Sexual content/nudity → references to quitting porn; **none shown** → answer accordingly.
- Simulated gambling → **No** (it's a vice to quit, not a gambling game).

> **Do not pre-commit to a tier.** These docs previously predicted "12+", and Apple has since revised
> its age bands and added capability questions. Whatever the questionnaire shows you when you open it
> is authoritative — answer it honestly, question by question, and take the tier it computes. Never
> set a tier lower than the answers produce: being corrected costs a review cycle, and an
> under-declared rating can get an app pulled later.

## Notes for the App Review team (paste in "App Review Information → Notes")
```
Sign-in is passwordless: enter an email, receive a one-time code, enter it. Please use a real inbox that can receive the code. A new account starts in onboarding and reaches the full app in under a minute.

"Strava" appears as invite-only by design — Strava's API caps our connected-athletes count, so most users see an honest explanation plus a manual-log alternative. This is intended, not an unfinished feature.

Crisis and "get real help" resources are in Settings and throughout; the app explicitly states it is not a substitute for professional care.

NO ACCOUNT IS NEEDED TO REVIEW THE APP. The first screen offers "Something's pulling at me right now" beneath the sign-in — that is a real guest door, not a teaser. It opens the Feeling Door and every in-the-moment tool with nothing stored on our servers. Please try that path; it is the app's primary entry point and the fastest way to see what it does.

ABOUT THE AI. Replies come from a server-side proxy (a Supabase edge function), never from a model called directly by the client, and no API key ships in the app. Before any message reaches a model, the text is checked for crisis language on-device; if it matches, the model is BYPASSED entirely and a fixed card of real helplines is shown instead, with tappable tel: links. That gate runs on all chat surfaces. Typing something like "I want to end it" anywhere in the app will demonstrate it. Journal entries flagged that way are never sent as AI context afterwards.

MEDICAL AND SAFETY LIMITS. Calorie targets are floored at a clinically safe minimum and a low target opens a support door rather than being silently accepted. Anyone under 18 is refused a weight-loss target and pointed to a GP or dietitian. Nothing in the app diagnoses or treats.

To Try is multi-faith: at onboarding the user picks a path (Christianity, Islam, Hinduism, Buddhism, or Secular/None) and the app shows that tradition's own text and daily reading — so scripture from the Bible, the Qur'an, the Bhagavad Gita, or the Dhammapada is presented respectfully by the user's own choice. All of it is changeable in Settings > Faith & meaning.
```

## Build to attach
**1.0 (4)** — current as of 19 Aug 2026, web assets **v513**. `CURRENT_PROJECT_VERSION = 4` is already
set in `project.pbxproj`. App Store Connect holds build 2; build 3 was never uploaded; 4 is safe either
way (a higher number is always accepted, a repeated one is rejected before review). Re-archive from the
current tree — do not reuse anything in `build/`; the stale build-2 `.ipa` there has been deleted, and
any `.xcarchive` still on disk is build 2 as well. Verified: `xcodebuild -configuration Release` →
**BUILD SUCCEEDED**, with `-validate-for-store` passing.
