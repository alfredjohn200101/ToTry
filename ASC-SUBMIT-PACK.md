# App Store Connect — submission pack

**Derived from the code and the shipped binary on 27 Oct 2026, not from the other submission docs.**
Where this file disagrees with `APP-STORE-LISTING.md`, `APP-REVIEW-NOTES.md`, `APP-STORE-SUBMISSION.md`
or `SUBMIT-CHECKLIST.md`, this file is the one that was re-measured — but every mutable fact below
names its source of truth so you can re-check it rather than trust it.

**Do not open `APP-STORE-SUBMISSION.md` or `NEXT.md` while filling the form.** Both are stale
(`NEXT.md` §0 still says build 4 / v512; `APP-STORE-SUBMISSION.md` predicts age tiers that Apple
deleted). The App Review note exists in three disagreeing copies and the build number in three — one
source per field is the whole point of this pack.

---

## 0 · BLOCKERS — ALL THREE CLEARED, 27 Oct 2026

They were real. All three are fixed and verified; nothing here is left for you.

### B1 · `03-fight.png` showed the word PORN — **FIXED, re-captured**

**Corrected from the original finding, which overstated it.** I viewed the file: `PORN` was the lead
vice card's *small uppercase eyebrow label*, about a quarter down the screen — not "at large size in
the upper third", and not the most legible word (that is `161`). The risk is still real: guideline
2.3.8 requires screenshots to meet a 4+ rating regardless of the app's own rating, and a plain
English word for pornography in a browsable Store image is a known metadata-rejection trigger.

Fixed at the source: the demo seed's lead vice is now `The old habit`
(`scripts/seed-person.mjs`). It is DEMO DATA, not product copy — the app still ships the porn vice
type, the description still speaks honestly, and nothing about what the app is for changed.
Re-captured from the real Capacitor build on a booted iPhone 17 Pro Max and viewed: the card now
reads `THE OLD HABIT`, with Day 161, "9 days clean · came back 6 times" and the red urge button
unchanged.

**The original fix advice was checked before it was followed, and that mattered twice.** First I
counted 24 `'Porn'` occurrences across `panels.js`, `personas.js` and `core.test.js` and concluded
the rename would break the gate — wrong: those are each file's OWN inline fixtures, and a count of a
string is not a dependency. `core.test.js` is the only test that reads this file, and only for its
`totry_trackers` day-key assertion. Verified by running the gate, not by reading it: `npm test`
4660/0, `npm run craft` 0/0/0, `npm run orb` within ratchet.

**And a trap worth keeping: `scripts/seed-person.mjs` is one big TEMPLATE LITERAL** returned by
`seedSource()`. A backtick inside a comment there terminates it and the rest of the file parses as
code. My first comment quoted a filename in backticks and broke the seed with "Unexpected number" —
then the warning I wrote about it contained backticks too and broke it a second time. **`npm test`
cannot catch this**: `core.test.js` reads the file as TEXT for regex assertions and never imports
it, so a syntax error there passes the gate. Parse-check by importing it and by `new Function()`-ing
what it returns.

### B2 · Six archives in Organizer, one of which would have uploaded — **FIXED, moved**

Confirmed by reading each archive's own `Info.plist`. Six carried bundle id `app.totry`, and **build
1 (v312, 6 August, Apple-Distribution-signed) had never been uploaded, so Organizer would have let it
through** — a bundle predating every crisis register, the day-key fix and the current chrome.
Builds 4/5/6/8 would have been refused as duplicates, which is noisy but harmless; build 1 was the
live hazard.

All five older archives moved to `~/Library/Developer/Xcode/ToTry-superseded/` (moved, never
deleted). Organizer now shows **exactly one** `app.totry` archive: `ToTry-v661.xcarchive`, build 10.

`preflight` could not have caught this and is not at fault: it only compares archives stamped at the
*current* build number, so builds 1/4/5/6/8 are invisible to it by construction. I had previously
told the owner "only one archive is in Organizer" — that was true of today's dated folder and false
of Organizer, which lists every date. The finding was right and I was wrong.

### B3 · All five screenshots carried an alpha channel — **FIXED, flattened losslessly**

`sips` will not drop alpha here, and PIL and ffmpeg are both absent, so this was done with a small
zlib PNG re-encoder that **verifies its own output**: it re-decodes the file it just wrote and
compares every RGB byte. Result for all five: `colourType=2`, dimensions unchanged at 1320x2868,
`minAlpha=255` (so the flatten was lossless by construction) and **`rgbDiff=0`**. Confirmed
independently by `sips`: `hasAlpha: no`, `space: RGB`.

Severity note, honestly: this one was a *maybe*. Apple's hard alpha rejection is on the **1024
marketing icon**, and that was measured clean (`AppIcon-512@2x.png`, 1024x1024, `hasAlpha: no`).
ASC often accepts RGBA screenshots. It was fixed because `03-fight.png` was being re-captured
anyway, so all five were flattened in the same pass.

---

## 1 · Upload the build — your click

```
Xcode → Window → Organizer → Archives → select  ToTry  2026-10-27  →  Distribute App
   → App Store Connect → Upload → Automatically manage signing → Upload
```

**After B2, the 2026-10-27 row is the only one there.** Source of truth for the build number is
`npm run preflight` ("iOS version 1.0 (build 10)"), not this file.

- You will **not** be asked about export compliance — `ITSAppUsesNonExemptEncryption = false` is in
  the shipped `Info.plist` (read from `ToTry-v661.xcarchive/Products/Applications/ToTry.app/Info.plist`).
- You will **not** be asked for an ATT declaration — no `NSUserTrackingUsageDescription`.
- Upload-validation risks checked and clear: app icon is 1024×1024 RGB with **no alpha**
  (`colourType=2`); the built plist carries `arm64` (not the Capacitor-default `armv7`);
  `NSPrivacyAccessedAPITypes` declares UserDefaults/DiskSpace/FileTimestamp with valid reason codes;
  both bundled frameworks carry their own privacy manifests.

Processing takes 10–60 min before the build appears under Version Information.

---

## 2 · App Information

### App Name — 25/30

```
To Try: Whole-Life Growth
```

> Overrides `APP-STORE-SUBMISSION.md:27`, which tells you to create the record as "To Try" (6).
> Pick now — the App Name is the hardest field to change later.
> *Note: the home-screen name is `ToTry`, no space — read from the shipped binary
> (`CFBundleDisplayName = ToTry`). Three docs say "To Try"; they are wrong. It does not affect this field.*

### Subtitle — 24/30

```
Body, mind, money & soul
```

### Bundle ID

```
app.totry
```

### SKU — required, never shown publicly, free-form

```
TOTRY-IOS-001
```

### Primary Language

```
English (Australia)
```

> Not in any doc — derived. The copy says "counsellor"; `CRISIS_LINES` carries Lifeline 13 11 14,
> Beyond Blue, 13YARN and healthdirect.

### Primary Category / Secondary Category

```
Primary:    Health & Fitness
Secondary:  Lifestyle
```

> Not in any doc — recommended. Basis: `com.apple.developer.healthkit = true` in the shipping
> entitlements with both Health usage strings present; and by code mass, nutrition + recovery +
> training ≈ 25,800 lines against ≈ 6,100 faith and ≈ 2,100 money.

### Content Rights — answer **Yes**

> "Contains, shows, or accesses third-party content" — and you have the rights.
> Licensed/public-domain scripture via API (ESV, Qur'an, Bhagavad Gita, Dhammapada) plus Open Food
> Facts and USDA nutrition data. Crossway's prescribed ESV notice is rendered in Settings → About
> (`src/shell-head.html:7541`, held by an assertion at `test/core.test.js:4655`).

### Age Rating — the four answers that decide your band

Everything else is **None / No**. These four are judgement calls and **they are yours, not mine**:

| Question | Recommended | Why, and what it costs |
|---|---|---|
| **Alcohol, Tobacco, or Drug Use or References** | **Infrequent/Mild** | References are frequent but entirely anti-use — 3 of 12 onboarding vice chips are substances, with quit playbooks. Nothing is depicted or glamorised. **Frequent on this one alone = 18+.** Infrequent is the standard answer for sobriety and quit-smoking apps. |
| **Sexual Content or Nudity** | **Infrequent/Mild** | References only. "Lust / PMO" as a vice chip, a scripture chip, one textarea placeholder. The only anatomical stem in the bundle (`masturbat`, 2 occurrences) sits inside keyword arrays tested against what a person types and **never renders**. Frequent = 18+. |
| **Mature or Suggestive Themes** | **Infrequent/Mild** | Addiction recovery and suicide *disclosure* handled supportively, no method ever named. Frequent = 16+. |
| **Medical or Treatment Information** | **your call — see below** | Infrequent → 13+. Frequent/Intense → 16+. |
| **Health or Wellness Topics** (calorie tracking, dieting, exercise recommendations) | **Yes** | This is Apple's *milder, separate* question and it only reaches 9+. BMI labels, Mifflin-St Jeor targets and cycle tracking belong **here**, not under Medical. |
| **Gambling** / **Simulated Gambling** / **Contests** | **No, No, No** | Gambling is the only descriptor Apple maps to 18+ at *any* frequency, and the app has a gambling *vice type* — answer it deliberately. Checked: no wagering mechanic, no dice/wheel/slot/card-deal code. "Poker sessions" is a money ledger (buy-in, cash-out, lifetime net). The raffle is disabled (`RAFFLE_ACTIVE = false`). |
| **User-Generated Content** | **Yes** | Costs you nothing — UGC as a capability is listed at 4+. Pre-moderated, opt-in, no profiles. |
| **Messaging or chat between users** / **Social media feed** | **No** | No author column is even selected (`src/app/01-sync.js:290`); no profiles, likes, comments, shares or votes. Worth answering carefully: social media is 13+ generally and **16+ in Australia specifically**. |
| **Unrestricted Web Access** | **No** | No in-app browser, no iframes, no `allowNavigation`, no WKUIDelegate override. All ten `window.open` calls are `_blank` to fixed hosts, which hands off to the system browser where the user's own Screen Time applies. |
| **Advertising** | **No** | Zero ad SDKs; `NSPrivacyTracking false`, empty `NSPrivacyTrackingDomains`. |

**The Medical question — the one real decision.** The honest measured answer is
**Frequent/Intense**, which gives **16+**:

- `openRecoveryTimeline` (`src/app/09-fight-deep.js:1472`) renders **31 clinical milestones across
  6 vice types**, including outcome claims — "Your risk of heart disease has dropped to roughly half
  that of a smoker", "Liver fat can drop significantly".
- A rendered **alcohol-withdrawal warning** naming seizures and telling the person to see a GP
  (`09-fight-deep.js:1433-1434`).
- `_researchRecoveryTimeline` (`:1551`) asks a model, **with web search**, under the prompt
  "You are a recovery scientist… as evidence-based as possible", and renders AI-generated
  day-by-day bodily recovery claims for *any* struggle a person names.
- An eating-disorder screen routing to the Butterfly Foundation; clinical mechanism copy delivered
  as intervention (CBT restructuring, ACT defusion, urge surfing, 5-4-3-2-1 grounding).

This sits on Nourish, Body, Fight, the moment door and the cycle surface, so it is *frequent*, and
the scale reads "Frequent **or** Intense".

> **Do not pre-commit a tier.** Answer each question and take what ASC computes. 16+ is the honest
> result on this evidence; if it computes 13+ that is Apple weighting the medical question
> differently and 13+ is defensible. Apple now lets you manually **raise** a computed rating — cheap
> insurance if you would rather not argue frequency. Never set it lower than the answers produce.
> Four "not medical advice" disclaimers are in the app and should stay, but a disclaimer does not
> lower the frequency.

---

## 3 · Pricing and Availability

```
Price:        Free (Tier 0)
Availability: All territories (or at minimum Australia)
```

**Submit for Review stays disabled until this section is set** — it is easy to miss.
You do **not** need the Paid Apps agreement or banking/tax forms: confirmed from the code, there is
no StoreKit, no `SKProduct`, no IAP anywhere in `ios/App/App/*.swift` or `src/app/*.js`, and
`package.json` carries only `@capacitor/*`, `@supabase/supabase-js` and `capacitor-health`.

The "Buy me a coffee" donation card is correctly hidden in the App Store build — it defaults to
`display:none` and is only revealed on web (`src/app/27-settings.js:60`), so it fails closed and
3.1.1 cannot be triggered.

---

## 4 · App Privacy

**Used for Tracking (overall): NO.** No ad network, no data broker, no cross-app joining. The only
third-party analytics script is excluded from the native build.

Mirror the shipping manifest (`ios/App/App/PrivacyInfo.xcprivacy`, confirmed present in the IPA).
Read from it directly:

| Data type | Collected | Linked | Tracking | Purpose |
|---|---|---|---|---|
| Contact Info → **Email Address** | Yes | **Yes** | No | App Functionality |
| Identifiers → **User ID** | Yes | **Yes** | No | App Functionality |
| Health & Fitness → **Health** | Yes | **Yes** | No | App Functionality |
| Health & Fitness → **Fitness** | Yes | **Yes** | No | App Functionality |
| Sensitive Info | Yes | **Yes** | No | App Functionality |
| User Content → **Other User Content** | Yes | **Yes** | No | App Functionality |
| Financial Info → **Other Financial Info** | Yes | **Yes** | No | App Functionality |
| Contact Info → **Name** | Yes | **Yes** | No | App Functionality |
| Location → **Coarse Location** | Yes | **see decision C1** | No | App Functionality |
| User Content → **Photos or Videos** | Yes | **No** | No | App Functionality |
| Usage Data → **Product Interaction** | Yes | **see decision C2** | No | Analytics (+ App Functionality if linked) |
| Diagnostics → **Crash Data** | Yes | **No** | No | App Functionality |

**Health & Fitness is TWO boxes in ASC — tick Health *and* Fitness.** The manifest collapses them
into one key (`NSPrivacyCollectedDataTypeHealthAndFitness`), which is not one of Apple's documented
values — see U1 under §9.

Answer **No** to everything not listed: Phone Number, Physical Address, Other Contact Info, Payment
Info, Credit Info, Precise Location, Contacts, Audio Data, Emails or Texts, Gameplay Content,
Browsing History, Advertising Data, Performance Data, Other Diagnostic Data, Other Data Types.

Evidence for the ones a reviewer might push on (membership bracket-matched out of the single
`const SYNC_KEYS = [` declaration at `src/app/00-boot.js:1227` — anchor asserted unique, 184 keys,
184 unique, comments stripped):

- `totry_progress_photos` is **OUT** of SYNC_KEYS → the published promise "progress photos are not
  uploaded or synced" is **true**, which is why Photos is *not linked*.
- `totry_geo` is **OUT**, and `geoCoarse()` rounds to 2dp on read → **Precise Location: No** is sound.
- `totry_anon` is **OUT** and live `app_events` has no `user_id` column → Crash Data genuinely unlinked.
- `totry_cycle` is **OUT** (synced only if the person opts into backup) → cycle data stays local.

### Three answers no document decides. They are yours.

**C1 — Coarse Location: linked or not?** The manifest says **not linked** and that is true of the
coordinate path. It is **false of the city path**: `totry_city` **IS** in SYNC_KEYS
(`00-boot.js:1296`), is typed by the person (`15-giving.js:126`, placeholder "e.g. Melbourne"), and
is the sole input to the prayer/fasting-times URL. SYNC_KEYS membership means it is upserted into
`public.user_data` against `user_id`. **Recommendation: answer Linked = Yes.** Over-declaring is
free and reversible; under-declaring is the mismatch a reviewer flags.

**C2 — Product Interaction: linked?** The manifest says not linked, Analytics only. The
`app_events` half really is unlinked. But `totry_usage_log` (per-day AI call and token counts,
`03-person.js:2906`) **is** in SYNC_KEYS and live `user_data` holds it for **13 distinct users**,
and server-side `ai_usage` / `ai_rate_limit` are keyed by auth user id. **Recommendation: Linked =
Yes, purposes App Functionality + Analytics.** (`03-person.js:2904` still comments "local-only… no
server-side logging", which is how this was missed.)

**C3 — Purchases → Purchase History.** Currently answered No. The CSV bank-statement importer writes
statement **merchant text** into `totry_transactions.note` (`17-fuelplan.js:1874`), `detectSubscriptions()`
groups by merchant to infer recurring spend (`18-money-deep.js:863`, UI copy "FOUND IN YOUR
STATEMENTS"), and `totry_transactions` / `totry_subscriptions` are in SYNC_KEYS. Apple: *"Purchase
History — an account's or individual's purchases or purchase tendencies."* **Recommendation: Yes,
Linked, App Functionality.** The alternative — filing it all under Other Financial Info, as
`APP-PRIVACY.md` does — is arguable but is the thinner reading.

**C4 — Search History.** Currently No. The scripture search sends the typed query verbatim to the AI
chain (`11-scripture.js:1271`), and your own published policy says those providers retain prompts
~30 days — outside Apple's real-time-request carve-out. Food queries go to USDA and Nutritionix.
Against: `runUniversalSearch` is entirely local and the on-device Bible history key cannot sync.
**Recommendation: Yes / not linked / App Functionality**, as the conservative answer.

> **Do not edit `PrivacyInfo.xcprivacy` and re-cut the archive for any of C1–C4.** Tick the
> conservative answers in Connect — free and reversible — and fold the manifest corrections into
> your next build. I could find no Apple documentation for an automatic label↔manifest cross-check
> (`SUBMIT-CHECKLIST.md:609` and `NEXT.md:285` both assert one); the validation that exists is
> ITMS-91056 on manifest *validity*. **The one exception is U1** below.

---

## 5 · Version Information

### Version

```
1.0
```

> Source of truth: `npm run preflight` / `project.pbxproj` `MARKETING_VERSION`. The attached build
> will read **1.0 (10)** — `APP-REVIEW-NOTES.md:60` says build 9 and is one build stale.

### Screenshots — iPhone 6.9" Display

Upload the five PNGs from `build/appstore-screenshots/iphone-6.9in-v660/` **in this order** (do not
let the filename sort put `01-home` first):

```
1.  02-feeling-door.png
2.  01-home.png
3.  03-fight.png          ← re-captured 27 Oct, now reads THE OLD HABIT
4.  05-soul.png
5.  04-money.png
```

All five measured at **1320 × 2868** by reading the PNG IHDR — a valid 6.9" size. ASC requires
minimum 1, maximum 10. I viewed all five: each is the screen its filename claims, so the defect
recorded for the `6.9-v643` set (01-home was actually Settings mid-scroll) does **not** recur here.

- **iPad: not required.** `UIDeviceFamily = [1]` in the shipped binary.
- **6.5": only if the upload form actually shows that slot as required.** `APP-REVIEW-NOTES.md:86`
  and `SUBMIT-CHECKLIST.md:824` assert it is required; the folder's own `ORDER.md` refutes that and
  is right — the authority is the form in front of you. If it asks:
  `SIM_DEVICE='iPhone 11 Pro Max' node scripts/app-shot.mjs install`.
- **Ignore `APP-STORE-SUBMISSION.md:29`**, which names 1290×2796 and 1242×2688 — you have no asset
  at either size, so following it reads as "you have no usable screenshots".
- **Do not use `build/appstore-screenshots/iphone-6.9in/`** (no `-v660`). It sorts first, has six
  images and is alpha-clean, so every surface signal points at it — and it is 19 August: gold
  accent, emoji row icons, no Liquid Glass capsule, a different demo person. It is a different app.
- Known and deliberate: the orb clips the Money value in `01-home` and the tab capsule overlaps
  "Doomscroll" in `03-fight`. Measured and accepted inside the app — `npm run orb` reports **0
  controls losing their own centre** at both 393x852 and 440x956, which is the tappability criterion,
  and 0 still under the orb when fully scrolled. The at-rest text clips are a floating button's
  inherent cost and are ratcheted at the measured number.
- All five are **flattened RGB** (`hasAlpha: no`), verified two ways: a zlib re-encoder that compares
  every RGB byte of its own output (`rgbDiff=0`) and `sips` independently.

### Promotional Text — 160/170 (editable later without a new build)

```
Meet yourself the moment you feel something — and be moved through it. One home for your whole life: the fight, your body, your money, your faith. Free, no ads.
```

### Description — 2503/4000

One word changed from the repo's copy: **"proven" removed** from the Fight bullet. It was the only
efficacy claim in 2511 characters, under a header that says "Nothing here overclaims — keep it that
way". A re-scan of the edited text for `proven|clinical|cure|diagnos|guaranteed` returns **0 hits**.

```
To Try is the one home for your whole life.

Most apps track a single slice of you — your steps, your calories, your spending. To Try sees the whole person, because the parts don't live in separate boxes. A hard night, a skipped workout, an impulse buy, a prayer you keep meaning to say — they're all connected. When one app can see all of it, its counsel is true in a way no single-feature app can be.

It's a presence, not another tracker. Quiet by default and there when you need it — meeting you at the moment you actually feel something, instead of waiting for you to open a spreadsheet.

ONE LIFE, WOVEN TOGETHER
• The Fight — face the habits you're done with. When an urge hits, one tap opens a calm in-the-moment guide: urge-surfing, grounding, honest logging. Grace over shame — a slip is feedback, not failure.
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

### Keywords — 94/100

```
habit,recovery,sobriety,discipline,prayer,meditation,bible,quran,gita,stoic,mindfulness,budget
```

Measured: 12 keys, no spaces, no duplicates, and **0 words shared with the App Name or Subtitle**, so
nothing is wasted. 6 characters of headroom. If you want them used — exactly 100/100:

```
habit,recovery,sobriety,discipline,prayer,meditation,bible,quran,gita,stoic,mindfulness,budget,faith
```

`faith` is the app's central term and appears in neither the name nor the subtitle, so it is not
already indexed.

### Support URL

```
https://alfredjohn200101.github.io/ToTry/support.html
```

Checked live today: **HTTP 200, 3,675 bytes**. Carries totrybyaj@gmail.com, an Instagram handle,
answers for sign-in / reminders / pricing / export / delete, and Lifeline 13 11 14.
**Do not use the root URL** — it boots to the sign-in screen.

### Marketing URL (optional)

```
https://alfredjohn200101.github.io/ToTry/
```

HTTP 200, 4,459,663 bytes — this is the PWA itself, not a marketing page, and it opens on the
sign-in wall. Acceptable (the field is optional and Apple's bar is low) but it is the weakest of the
three. **Leaving it blank is also fine.**

### Privacy Policy URL

```
https://alfredjohn200101.github.io/ToTry/privacy.html
```

HTTP 200, 12,633 bytes. **See U2 under §9 before you submit** — one sentence in it is measurably
false, and it is the artifact Apple reads.

### Copyright — 16 chars

```
2026 Alfred John
```

Not present in any document — derived. Legal name from the shipping IPA's signing identity
(`Apple Distribution: Alfred John (L4BD53PLVF)`) and `privacy.html:34` ("By Alfred John"). No ©
symbol — ASC adds it.

### What's New in This Version

**Not required for 1.0** — ASC does not present this field for a first version. Prepared copy if it
does appear (180/4000), and note it says "the first release", so do not reuse it on 1.0.1:

```
The first release of To Try. Your whole life in one home — the fight, your body, your money, your faith — meeting you the moment you feel something. Thank you for being here early.
```

---

## 6 · App Review Information

### Sign-In Required: **NO**

Driven on the shipping bundle with empty storage, online and with every external request blocked:
`#auth-guest-btn` is visible, owns its own centre, and one click opens the full app with 0 page
errors. Answering Yes would make ASC demand demo credentials that cannot work — sign-in is email OTP
to a real inbox.

### Demo account: **leave blank**

Guest mode is the full app, not a restricted preview — only 3 `isGuest()` call sites exist in `src/`
and none gates a feature.

### Contact email

```
totrybyaj@gmail.com
```

### Notes — 2822/4000, paste exactly this

This is `APP-REVIEW-NOTES.md` §1 — **the only one of three copies that leads with the guest door** —
with three corrections: the health paragraph was false (see U2), the crisis count was wrong, and the
1.2 "block users" limb was unanswered. Markdown emphasis is stripped because ASC is a plain-text
field. **Do not paste the copy in `APP-STORE-LISTING.md`** — it opens with "Please use a real inbox
that can receive the code" and buries the no-account path in paragraph four, which is a 2.1
round-trip waiting to happen on an app that has a working guest path.

```
You do not need an account to review this app.

On the sign-in screen, tap the button reading "Something's pulling at me right now →". That is the no-account path: it opens the full app immediately, with everything saved on the device. Sign-in exists only to sync between devices, and it is a one-time code emailed to the address you enter — so an account would not help you here.

The button is worded that way on purpose: the app is for people in a bad moment, and "continue as guest" is not the sentence they need to read first.

If you would rather sign in, email totrybyaj@gmail.com and I will create an account and send you the code within the hour.

HEALTH DATA. To Try reads steps, active energy, workouts, heart rate, mindful minutes and sleep from Apple Health so they count toward the day without manual logging. It can also write back — workouts, active energy, body mass and mindful sessions — but only when the person turns that on themselves in Settings; it is off by default. Health data is backed up to our own server so a person's own devices stay in step, which is why Health and Fitness are declared as COLLECTED and LINKED on the App Privacy label. A person's sleep and recent training also form part of the context sent to our AI coaching provider when the app generates coaching. It is never used for advertising, never sold, and never shared for any other purpose. The app works fully without granting either permission.

SHARED CONTENT. Community food and exercise names are pre-moderated — nothing is shown to anyone until it is approved, and anything flagged is withheld. Settings → Report shared content lets any person report an item, which reaches me directly. There are no profiles, no author names, no comments, no messaging and no feed: the only thing one person ever sees of another is a plain food or exercise name in a search list. There is therefore no user to block, which is why no block control exists.

CRISIS HANDLING. The app detects disclosures of self-harm at every free-text entry point (53 of them, driven by an automated test on every build) and shows verified local helplines rather than attempting to counsel. It states in several places that it is not medical advice and is not a substitute for a real person.

STRAVA appears as invite-only by design — Strava's API caps our connected-athlete count, so most users see an honest explanation plus a manual-log alternative. This is intended, not an unfinished feature.

MULTI-FAITH. At onboarding the user picks a path (Christianity, Islam, Hinduism, Buddhism, or Secular/None) and the app shows that tradition's own text and daily reading, so scripture from the Bible, the Qur'an, the Bhagavad Gita or the Dhammapada is presented respectfully by the user's own choice. All of it is changeable in Settings → Faith & meaning.
```

Two details that matter in that text:

- **The button's rendered text uses a curly apostrophe (U+2019) and a real arrow (U+2192)** —
  `src/shell-head.html:4060` renders `&rsquo;` and `&#8594;`. The block above has them. The markdown
  in `APP-REVIEW-NOTES.md` uses a straight apostrophe; a reviewer searching for the literal string
  would not find it.
- **53, not 57.** I bracket-matched the `const DOORS = [` array in `test/crisis.js` with a
  string-aware walker (anchor asserted unique; it refuses an unbalanced array): **53 top-level
  doors**. The 57 in the docs is the suite's own headline, `checks - DOORS.length`, which includes
  four crisis surfaces that are not text entry points.

---

## 7 · Submit for Review

Order matters — Connect greys out Submit until all of these are green:

1. Build attached and finished processing (1.0 (10))
2. All five screenshots uploaded to the 6.9" slot
3. App Privacy complete and **published** (it has its own Publish button)
4. Age Rating questionnaire saved
5. **Pricing and Availability set** — the one people forget
6. Content Rights = Yes, Copyright filled
7. App Review Information: Sign-In Required = No, contact email, notes pasted

---

## 8 · Known and deliberate — what a reviewer may ask, and the honest answer

| They ask | Answer |
|---|---|
| "Strava is invite-only — is this finished?" | Yes, deliberate. Strava's API caps connected athletes; most users see an honest explanation plus a manual-log alternative. Already in the notes. |
| "Where is the block-user control?" (1.2) | There is none, because there is no user to block: no author column is selected, no profiles, no messaging. Already in the notes. |
| "Sign in with Apple?" (5.1.1(iv)) | Not triggered. Exactly one auth call exists — `sb.auth.signInWithOtp` (`00-boot.js:1050`). Email one-time-code is first-party; no social or third-party login. |
| "Account deletion?" (5.1.1(v)) | In-app: Settings → Delete account permanently (`27-settings.js:735`). Both server routes probed live and both are deployed. |
| "Medical claims?" | Four "not medical advice" disclaimers ship. The recovery timelines are informational and the alcohol one tells the person to see a GP. |
| "Does the AI chat have a content filter on model output?" | **No.** There is prompt-level safety (`safetyNote()`) and a deterministic crisis detector that bypasses the model, but nothing filters what the model says back. If ASC asks a generative-AI capability question, answer it honestly — the chat is reachable two taps from the first screen without an account. |
| "Donations / IAP?" | None in the iOS build. The Buy-me-a-coffee card is gated off for native and fails closed. |
| "Why does Settings → Help & FAQ do nothing?" | See U3 — it is genuinely dead in the native build. Low exposure (a reviewer is unlikely to tap it) but do not claim it works. |

---

## 9 · UNVERIFIED and UNRESOLVED — named plainly

These were surfaced by this audit's lenses but **no independent refuter reached a verdict on them**.
I re-measured the ones marked ✅ myself; the rest are flagged as unverified.

**U1 — the privacy manifest declares an invalid key.** ✅ *Re-measured by me:* the shipping
`PrivacyInfo.xcprivacy` carries `NSPrivacyCollectedDataTypeHealthAndFitness`. Apple documents two
keys for that category — `…TypeHealth` and `…TypeFitness` — and no combined one. The other ten keys
are spelled exactly right, Apple's own irregular `PhotosorVideos` included. Two checks launder it:
`scripts/preflight.js:174` hardcodes a label map, and `test/core.test.js:8890` *pins* the bad key as
its calibration, so correcting it will turn that assertion red. **Do not re-cut the archive for
this.** `plutil -lint` passes (it validates syntax, not the enum). **If the upload returns an
ITMS-91056 email naming the privacy manifest, that is your signal to fix it and re-archive** — and
that pass should fix C1–C3 at the same time.

**U2 — one sentence in the published privacy policy is false, and it is the file Apple reads.** ✅
*Partly re-measured by me:* `privacy.html:48` says sleep and training reach the AI "**when you ask
for coaching**", and `privacy.html:56` sets the house standard "sent when you choose that action,
**never in the background**". A lens drove the app and measured **2 unprompted `ai-proxy` calls on
launch**, one carrying `Sleep: 3.3h last night…` and three journal entries verbatim, fired from
`03-person.js:6019` (`go('home')`). I verified the call sites and that HealthKit sleep lands in the
field the prompt prints; **I did not independently re-run the launch probe**. If it holds, this is a
false statement in the artifact Apple reads under 5.1.2. **Fixing it is a one-line copy change to
`privacy.html` and `showPrivacyPolicy()` — no new build needed for the hosted page**, and the notes
in §6 already describe the behaviour correctly. Two smaller errors in the same file, unverified: the
AI-provider list is short two providers and omits NVIDIA from the vision chain, and Resend (which
receives feedback text **and** the sender's email) is not named in the third-party list.

**U3 — Settings → Help & FAQ is a silent no-op in the App Store build.** Unverified by me.
`26-share.js:617` is `window.open('support.html', '_blank', 'noopener')`; Capacitor 8 hands every
`_blank` to the system, the app declares no `CFBundleURLTypes` (✅ I confirmed
`Print: Entry, ":CFBundleURLTypes", Does Not Exist`), so the open fails — and the `catch` fallback is
structurally unreachable because `window.open` with `noopener` returns null rather than throwing.
**Not a submission blocker** (the Support *URL* is fine and works in a browser), but do not tell a
reviewer that row works.

**U4 — cloud sync may upload almost nothing on WebKit.** Unverified, and the most serious item here
if true. A lens drove both engines and reported that assigning to `localStorage.setItem` does not
install a hook in WebKit (the named-property setter captures the assignment and stores it as an
item), so `enableSyncMonitoring()` at `01-sync.js:249` never fires — leaving **174 of 184 SYNC_KEYS**
with no push path, and a pull that can then overwrite the device. **I did not re-run this.** It does
**not** block submission and does not change any answer above: the App Privacy label would then be
*over*-declaring, which is the safe direction, and the review note's health-sync sentence describes
the design. But if it is real it is a data-loss defect on the engine the shipped app uses, and it
deserves its own session before or immediately after launch.

**U5 — documentation drift, for after you submit.** Unverified in detail, but the pattern is
consistent and `APP-STORE-LISTING.md`'s own Age Rating section states the rule being broken: *"two
copies of one answer set is how they drift apart, so there is now one."* There are still three
copies of the App Review note, two of the age-rating answers, three different SYNC_KEYS counts and
three different build numbers across the docs. ✅ I measured SYNC_KEYS myself: **184**, bracket-matched
and comment-stripped from a verified-unique anchor — so `APP-PRIVACY.md:69` (178) and
`APP-STORE-LISTING.md:81` (179) are both stale. `SUBMIT-CHECKLIST.md` §2's privacy table has no
"Photos or Videos" row while the shipping manifest declares it, and §5 ("What still needs
screenshots") is stale three ways while §3 of the same file is current. Pick one source per field
before the next submission.
