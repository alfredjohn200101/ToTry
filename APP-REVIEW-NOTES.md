# App Store Connect — the fields you fill in, and why

Re-derived from the code on **29 Oct 2026, v669 / build 12**. Where a claim is checkable, the check
that holds it is named. Re-derive rather than trust this file if it is old — a doc that only
*describes* behaviour goes stale underneath you, and that failure mode is recorded in CLAUDE.md three
times now.

---

## 1. App Review Information → Notes  ← **PASTE THIS. It is the one that prevents a rejection.**

> **You do not need an account to review this app.**
>
> On the sign-in screen, tap the button reading **"Something's pulling at me right now →"**.
> That is the no-account path: it opens the full app immediately with everything saved on the
> device. Sign-in exists only to sync between devices, and it is a code emailed to the address
> you enter — so an account would not help you here.
>
> The button is worded that way on purpose: the app is for people in a bad moment, and
> "continue as guest" is not the sentence they need to read first.
>
> If you would rather sign in, email **totrybyaj@gmail.com** and I will create an account and
> send you the code within the hour.
>
> **Health data:** To Try READS steps, active energy, workouts, heart rate, mindful minutes and
> sleep from Apple Health so they count toward the day without manual logging. It can also WRITE
> back — workouts, active energy, body mass and mindful minutes — but only when the person turns
> that on themselves in Settings; it is off by default. Health data is never used for advertising,
> never sold and never shared. The app works fully without granting either permission.
>
> **Shared content:** community food and exercise *names* are pre-moderated — nothing is shown
> to anyone until approved, and anything flagged is withheld. Settings → **Report shared
> content** lets any person report an item, which reaches me directly.
>
> **Crisis handling:** the app detects disclosures of self-harm across 57 text entry points and
> shows verified local helplines rather than attempting to counsel. It states in several places
> that it is not medical advice and is not a substitute for a real person.

**Sign-In Required toggle: NO.** Guest mode is a real, complete path.

---

## 2. The answers, with the evidence

Every row below was re-checked against the source on 29 Oct 2026, not recalled.

| Field | Answer | Why / where it is enforced |
|---|---|---|
| Account deletion in-app | **Yes** | `deleteAccount()` in `src/app/27-settings.js`; it refuses to claim a server delete it could not reach |
| Sign in with Apple required? | **No** | Email OTP only. There is no `signInWithApple` and no OAuth provider anywhere in `src/app/` — so 5.1.1(iv) is not triggered |
| Export compliance | **No non-exempt encryption** | `ITSAppUsesNonExemptEncryption = false`, read back **out of the signed IPA** — upload will not re-ask |
| Third-party content | **Yes, pre-moderated** | `pullSharedLibrary` filters `.eq('approved', true)` **and** `.eq('flagged', false)` — `src/app/01-sync.js:346-347` |
| Report mechanism | **Yes** | Settings → Report shared content → the `feedback` queue, `type: 'content_report'` (`src/app/26-share.js:704`). It is also crisis door 57 |
| Contact | totrybyaj@gmail.com | Published in-app, in Settings |
| Privacy policy | https://alfredjohn200101.github.io/ToTry/privacy.html | Verified **HTTP 200** on 29 Oct |
| HealthKit read | **Yes** | `NSHealthShareUsageDescription` present; steps, energy, workouts, HR, mindful, sleep |
| HealthKit write | **Yes, opt-in, off by default** | `NSHealthUpdateUsageDescription` present; `HealthWritePlugin.swift` writeTypes: workout, activeEnergyBurned, bodyMass, mindfulSession — Settings toggle (`toggleHealthWrite`) |

**57 crisis doors** is `npm run crisis`'s own number: 53 entries in its `DOORS` table plus four
surfaces it drives separately (the safety net with its container deleted, the guest door, the breath
ending, and the net's own path). Counted in `test/crisis.js`, not remembered.

---

## 3. Before you click Upload

- [ ] **Build number: 1.0 (12).** App Store Connect refuses a build number it has already seen.
      If build 12 was ever uploaded, bump `CURRENT_PROJECT_VERSION` to 13, re-archive and re-verify.
      Nothing local can tell you this — only Connect can.
- [ ] **What to upload.** Either is fine:
      - Xcode → Window → Organizer → **ToTry-v669** (29 Oct) → Distribute App → App Store Connect; or
      - the already-exported, already-verified
        **`~/Library/Developer/Xcode/ToTry-current-build/ToTry-v669-build12.ipa`** (2.97 MB).
      There is only ONE archive on this machine, so Organizer cannot offer you a stale one.
- [ ] **Screenshots: `build/appstore-screenshots/iphone-6.9in-v669/`.** Lead with
      `02-feeling-door.png`. Read that folder's ORDER.md — it carries the upload order and why.
      The v660 folder beside it is the previous set and is kept for the record; do not upload from it
      (its `01-home.png` shows the orb clipping `$6,350 deb`).
- [ ] **Age rating.** The app covers alcohol, gambling and pornography as things a person is
      fighting, and handles suicide disclosure. Answer the questionnaire honestly on
      "Frequent/Intense" vs "Infrequent/Mild" rather than guessing low — a wrong rating is a
      removal after approval, which is worse than a higher rating now.
- [ ] `npm run preflight` — must end "ready to archive" with no warnings.
- [ ] Verify the **IPA**, never the archive: the archive is Development-signed because the export
      re-signs it. Done for build 12 on 29 Oct, nine checks (below).

### What was verified in `ToTry-v669-build12.ipa`, re-checked 29 Oct

| Check | Result |
|---|---|
| `CFBundleVersion` / `CFBundleShortVersionString` | **12** / **1.0** |
| `CFBundleIdentifier` | `app.totry` |
| Signing authority | **Apple Distribution: Alfred John (L4BD53PLVF)** |
| `get-task-allow` | **false** |
| Architectures | **arm64** only |
| `ITSAppUsesNonExemptEncryption` | **false** |
| `PrivacyInfo.xcprivacy` | present |
| HealthKit entitlement | `com.apple.developer.healthkit` = true |
| Web bundle sha256 (first 12) | **6ad14c2d3161** — identical to the repo's `index.html` |

That last row is the one that matters: it is the only thing that proves the binary carries the code
this repo was gated on, rather than whatever was in `www/` the last time somebody synced.

---

## 4. Screenshots

**Order matters — the first image is most of the decision.** The set and the reasoning live in
`build/appstore-screenshots/iphone-6.9in-v669/ORDER.md`. In short:

1. `02-feeling-door.png` — the product's actual claim, over Home.
2. `01-home.png` — "Your life, woven".
3. `03-fight.png` — Day 161, came back 6 times.
4. `05-soul.png` — a word for today.
5. `04-money.png` — what staying clean bought.

All five are 1320x2868, flattened RGB, cut from the real Capacitor build at v669.

Avoid: any frame where a row is bisected by the floating tab bar, any Settings screen, and any frame
where the floating orb sits on a right-aligned row value (that is what sent the v660 Home shot back).

Sizes accepted: **6.9" 1320×2868** and **6.5" 1242×2688**; at least one per size, up to 10. We have a
6.9" set. Whether 6.5" is also demanded is a question only the upload form can answer — look at it
rather than spending an hour on a blog's say-so.
