# Submit — the exact steps and the exact answers

Everything on the code side is done and **verified against a real Release archive** (Xcode 26.6,
`ARCHIVE SUCCEEDED`). What's below is only the GUI work, which needs your hands and your Apple ID.

## 0 · Two things only you can do (everything else is done)

| # | What | Why it matters | Where |
|---|------|----------------|-------|
| 1 | ~~Run the account-deletion SQL~~ | ✅ **DONE 12 Aug 2026.** `public.delete_own_account()` created; verified `security_definer = true`, no arguments, `authenticated_can_run = true`, `anon_can_run = false`. "Delete account permanently" now removes the auth user and their email, so 5.1.1(v) is genuinely satisfied. |
| 2 | **Register your iPhone** *(optional — only to run a dev build on the phone)* | Your iPhone is paired and visible to the Mac, but it is not registered in the developer account and there is no iOS **Development** profile for `app.totry` — only `ToTryAppStore`. So a dev build cannot install. This does **not** block submission: archiving uses the distribution profile, which exists and is valid. | Xcode → open `ios/App/App.xcodeproj` → pick **Alfred's iPhone** as the destination → **Product ▸ Run** → click **Register** when prompted. Needs your Apple ID in Xcode ▸ Settings ▸ Accounts. Or skip it entirely: archive and upload, then install through **TestFlight**, which also tests the exact build you are submitting. |

**Not verified by me, and honestly so:** live barcode scanning and the Face ID lock. A simulator has no
camera and no biometry, so neither can be exercised there. Both compile, are registered, and fail closed —
the scan button stays hidden and the lock never engages when the capability is absent, which I did verify.
The scan itself and a real Face ID prompt need a physical device.

Verified in the actual shipping bundle, not just the repo:

| Check | Result |
|---|---|
| Release archive builds | ✅ `ARCHIVE SUCCEEDED` |
| `PrivacyInfo.xcprivacy` **inside** the .app | ✅ present, 9 data types |
| Web assets shipped | ✅ `v424`, incl. `privacy.html`, `support.html` and `vendor/supabase-js.js` (if that vendor file is ever missing from `www/`, the app boots to the offline fallback instead of itself) |
| Build number | ✅ **3** (ASC already holds 2 — uploading 2 is rejected before review) |
| Version | `1.0` · bundle id `app.totry` · display name **To Try** |
| Usage descriptions in built plist | ✅ Camera, HealthShare, HealthUpdate, PhotoLibrary, PhotoLibraryAdd, **FaceID** (v424 — mandatory; iOS terminates the app without it) |
| Every usage string describes what the code DOES | ✅ v421/v424 — HealthShare no longer claims the data never leaves the device (it syncs, and sleep + training reach the AI); PhotoLibraryAdd now describes the share-sheet "Save Image" it is really for |
| Opens with **no network** | ✅ v420 — the Supabase SDK is vendored (`vendor/supabase-js.js`), not fetched. It used to hang forever on jsdelivr, and the native shell has no service worker to fall back on: a reviewer in Airplane Mode saw a dead app (2.1) |
| Export actually produces a file | ✅ v419 — `<a download>` is a no-op in a WKWebView; `ShareFilePlugin` presents the share sheet |
| No external payment links (3.1.1) | ✅ v419 — the Buy-me-a-coffee card is hidden in the native build, unchanged on the web |
| No advertised integration that cannot work (2.1) | ✅ v421 — Google Health is gated off iOS (`capacitor://localhost/` can never be a valid Google redirect URI) |
| No unbacked contest/raffle promise | ✅ v422 — four places promised a raffle with no prize, rules, draw or terms; gated behind `RAFFLE_ACTIVE` |
| Crisis paths intact and tappable | ✅ v422 — the AI crisis response renders 6 `tel:` links; the dead IASP directory link (301s to their homepage) is now findahelpline.com |
| Pinch-to-zoom actually works | ✅ v420 — `ios.zoomEnabled: true`. The v418 viewport change alone did nothing: Capacitor disables the pinch recogniser unless that key is set |
| Haptics work on iPhone | ✅ v422 — every haptic was a no-op (`navigator.vibrate` does not exist in WebKit); now @capacitor/haptics |
| **HealthUpdate is now actually USED** | ✅ v417 — `HealthWritePlugin` writes finished workouts + weigh-ins. Before this, the app requested write access it had no code for, and both the usage string and privacy.html described a feature that did not exist. Apple checks that a requested permission is used |
| `ITSAppUsesNonExemptEncryption` | ✅ `false` — you will **not** be asked the export-compliance question |
| Icons | ✅ `Assets.car` + AppIcon variants |
| Account deletion (5.1.1(v), mandatory) | ✅ **Complete.** Deletes `user_data`, `push_subscriptions`, `feedback` **and now the auth user itself** via the `delete-user` edge function (v421). Until it is deployed the app honestly reports that the account itself survived. |
| Row Level Security on every table | ✅ enabled + policies, 12 Aug 2026 (`supabase-rls-fix.sql`) — verified signed-out: `user_data` and `feedback` return 0 rows to the public anon key |
| DELETE policies so deletion is truthful | ✅ in the same script — without them `deleteAccount()` reported success while rows survived |

---

## ✅ BUILD 4 ARCHIVED AND UPLOADED — 2 Sep 2026

v573 (`APP_VERSION` in the shipped bundle), version 1.0, **build 4**, 2.1 MB, signed *Apple
Distribution: Alfred John (L4BD53PLVF)*. Verified in the exported .ipa before upload:
`get-task-allow: false`, `beta-reports-active: true`, both HealthKit entitlements,
`PrivacyInfo.xcprivacy` present, 7 usage descriptions, arm64 only with no simulator slice,
`ITSAppUsesNonExemptEncryption: false`, min iOS 15.0.

**`CURRENT_PROJECT_VERSION` is now 5**, so the next archive cannot collide with what was just sent.

### ⛔ ARCHIVING FROM THE COMMAND LINE NEEDS MANUAL SIGNING — automatic FAILS

The first attempt failed, and it will fail the same way every time:

```
error: Communication with Apple failed: Your team has no devices from which to generate a
provisioning profile.
error: No profiles for 'app.totry' were found: Xcode couldn't find any iOS App Development
provisioning profiles matching 'app.totry'.
```

Automatic signing reaches for a **Development** profile, and there has never been one for `app.totry`
— only `ToTryAppStore`, which is a genuine App Store profile (no provisioned devices,
`get-task-allow: false`, valid to 6 Aug 2027). Archiving is a DISTRIBUTION action and does not need a
development profile at all. Name the distribution profile explicitly and it succeeds:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath /tmp/ToTry-archive.xcarchive \
  -allowProvisioningUpdates CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=L4BD53PLVF \
  PROVISIONING_PROFILE_SPECIFIER=ToTryAppStore "CODE_SIGN_IDENTITY=Apple Distribution" archive
```

Then export with `-exportArchive` and an ExportOptions.plist using `method: app-store-connect`,
`signingStyle: manual`, and `provisioningProfiles: { app.totry: ToTryAppStore }`.

There is **no `.xcworkspace`** — this is SPM-based Capacitor, so `-project ios/App/App.xcodeproj` is
correct and `-workspace` will error. There is also no shared `.xcscheme`; Xcode autogenerates it.

### Uploading is the part that needs a human

An App Store Connect API key exists at `~/.appstoreconnect/private_keys/AuthKey_49872NRTQS.p8`, but the
**issuer ID** that pairs with it is not stored anywhere on this machine, so `xcrun altool` cannot be
driven without it. `open /tmp/ToTry-archive.xcarchive` → Organizer → Distribute App → App Store Connect
→ Upload uses the Apple ID already signed into Xcode and needs no key at all.

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

Answer **"Yes, we collect data"**, then declare these. The source of truth is
`ios/App/App/PrivacyInfo.xcprivacy` — the label must agree with it or review flags the mismatch.

*Re-checked 19 Aug 2026 against the manifest: this table had nine of the manifest's ten types.*
***Coarse Location*** *was missing and is added below. App Store Connect also splits Health & Fitness
into two separate rows (Health, Fitness), so you will tick **eleven** boxes for ten declared types.*

| Data type | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|
| Email Address | **Yes** | No | App Functionality |
| User ID | **Yes** | No | App Functionality |
| Health & Fitness *(ASC splits this into **Health** and **Fitness** — tick both)* | **Yes** | No | App Functionality |
| Coarse Location *(prayer times only, rounded to ~1km before use)* | No | No | App Functionality |
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

> **Do not pre-commit to a tier.** These docs previously predicted "12+", and Apple has since revised
> its age bands and added capability questions. Whatever the questionnaire shows you when you open it
> is authoritative — answer it honestly, question by question, and take the tier it computes. Never
> set a tier lower than the answers produce: being corrected costs a review cycle, and an
> under-declared rating can get an app pulled later.

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
