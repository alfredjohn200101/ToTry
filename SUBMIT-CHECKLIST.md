# Submit — the exact steps and the exact answers

Everything on the code side is done and **verified against a real Release archive** (Xcode 26.6,
`ARCHIVE SUCCEEDED`). What's below is only the GUI work, which needs your hands and your Apple ID.

Verified in the actual shipping bundle, not just the repo:

| Check | Result |
|---|---|
| Release archive builds | ✅ `ARCHIVE SUCCEEDED` |
| `PrivacyInfo.xcprivacy` **inside** the .app | ✅ present, 9 data types |
| Web assets shipped | ✅ `v396`, all 11 files incl. `privacy.html`, `support.html` |
| Build number | ✅ **3** (ASC already holds 2 — uploading 2 is rejected before review) |
| Version | `1.0` · bundle id `app.totry` · display name **To Try** |
| Usage descriptions in built plist | ✅ Camera, HealthShare, HealthUpdate, PhotoLibrary, PhotoLibraryAdd |
| `ITSAppUsesNonExemptEncryption` | ✅ `false` — you will **not** be asked the export-compliance question |
| Icons | ✅ `Assets.car` + AppIcon variants |
| Account deletion (5.1.1(v), mandatory) | ✅ deletes `user_data`, `push_subscriptions`, `feedback` |

---

## 1 · Archive and upload

```bash
npm run build:www && npx cap sync ios && npx cap open ios
```

Then in Xcode: select **Any iOS Device (arm64)** → **Product → Archive** → **Distribute App** →
**App Store Connect** → **Upload**. Signing is automatic if your team is set on the App target.

If signing complains, it's the App target → Signing & Capabilities → your team, "Automatically manage
signing" on. Nothing else in the project needs touching.

---

## 2 · App Privacy — the nutrition label

Answer **"Yes, we collect data"**, then declare exactly these nine. The source of truth is
`ios/App/App/PrivacyInfo.xcprivacy` — the label must agree with it or review flags the mismatch.

| Data type | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|
| Email Address | **Yes** | No | App Functionality |
| User ID | **Yes** | No | App Functionality |
| Health & Fitness | **Yes** | No | App Functionality |
| Sensitive Info *(religious belief)* | **Yes** | No | App Functionality |
| Other User Content *(journal, prayers, letters, coach messages)* | **Yes** | No | App Functionality |
| Other Financial Info *(debts, savings, transactions)* | **Yes** | No | App Functionality |
| Name *(the people they choose to carry)* | **Yes** | No | App Functionality |
| Product Interaction | **No** | No | Analytics |
| Crash Data | **No** | No | App Functionality |

**Tracking question: No.** No ads, no data brokers, no cross-app tracking, `NSPrivacyTracking` is false
and `NSPrivacyTrackingDomains` is empty. So no ATT prompt and no tracking disclosure.

Privacy Policy URL: `https://alfredjohn200101.github.io/ToTry/privacy.html`

---

## 3 · Age rating

Answer the questionnaire honestly. The ones that actually apply:

- **Medical/Treatment Information → Infrequent/Mild.** It discusses habits, mental health and recovery,
  and hands off to real help. It does not diagnose or prescribe.
- **Alcohol, Tobacco, or Drug Use or References → Infrequent/Mild.** Vices can be named and tracked;
  nothing is depicted or encouraged.
- **Sexual Content or Nudity → None.** Lust can be *named* as a struggle; nothing is shown or described.
- **Profanity, violence, gambling, horror, contests → None.** (Poker sessions are logged as *money*, not
  played — no simulated gambling.)
- **Unrestricted Web Access → No.** No general-purpose browser.
- **User-Generated Content → No.** Nothing a user writes is visible to any other user.

Expected outcome: **12+**. Setting it lower and being corrected costs you a review cycle.

---

## 4 · Review notes — paste this in

> To Try is free with no accounts required to try it: tap **"Something's pulling at me right now"** on the
> first screen to enter as a guest with no sign-up. To see it with data, sign in with any email (a 6-digit
> code arrives by email) — or use the guest door, which needs nothing.
>
> There is no paid content, no subscription and no advertising.
>
> Faith features are opt-in and default to **secular** — the app works fully with no religious content
> unless the user chooses a tradition in Settings.
>
> Crisis handling: any message matching self-harm or medical-emergency language is intercepted **before**
> it reaches any AI service and replaced with region-appropriate helpline numbers (Lifeline, 988,
> Samaritans, findahelpline.com). These are also on the sign-in screen, reachable without an account.
>
> Health data (steps, active energy, workouts, heart rate) is read only with permission, computed on
> device, and never uploaded or sent to any third party.

**Demo account:** if you'd rather not hand over your own, sign up `alfredjohn200101+studio@gmail.com`
(already in `DEV_EMAILS`) and load Settings → Demo data before you record or submit screenshots.

---

## 5 · What still needs screenshots

6.5" and 6.9" required. The strongest four, with demo data loaded (Settings → 🎬 Demo data):

1. **Home** — "Your life, woven": the fight, body, spirit and money in one glance. This is the whole thesis.
2. **The Feeling Door** — tap the orb: ten feelings, no typing.
3. **Nourish** — the diary populated, ideally mid-way through "numbers off".
4. **Money** — subscription detection showing real recurring charges.

Restore your own data afterwards with the red bar at the top of the screen.

---

## 6 · After upload

Review takes a few days. Use the app yourself for that week — from a **wiped install**, taking the fast
route (guest door, "Take me in") every time. Three of the last five real bugs lived on exactly those
paths, because they are the least exercised. Anything you find goes into build 4 before it reaches anyone.
