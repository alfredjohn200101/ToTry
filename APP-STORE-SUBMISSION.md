# To Try — App Store Submission (iOS)

> State as of v312. The native project is **verified App-Store-ready** — everything below marked ✅
> was checked in code/config. The remaining steps need your Mac, Xcode, and Apple Developer account
> (they can't be done from here). Android/Play is a separate pass (the `android/` project is tracked).

## ✅ Verified ready (already done — no action needed)
- **Bundle id** `app.totry`, **display name** "To Try", **version 1.0 (build 1)**.
- **Privacy usage strings** — Camera, Health (share + update), Photo Library (use + add). All present, specific, honest.
- **1024 App Store icon** present; **launch screen** present; **`ITSAppUsesNonExemptEncryption = false`** (skips the export-compliance prompt on every upload).
- **In-app account deletion** (`deleteAccount()` → deletes server-side `user_data`) — an Apple hard requirement, met.
- **Login is email-OTP only** (no Google/Facebook) → **Sign in with Apple is NOT required** (that rule is only for third-party/social logins).
- **No placeholder/"coming soon" features** — the Strava invite-only state is an honest explanation of Strava's athlete cap + a working manual alternative, not an unfinished feature.
- Web build synced into `ios/App/App/public` at **v312**; app verified clean (all tabs render, no display leaks, no console errors, `npm test` 27/27).

## The steps you do (Xcode → App Store Connect)
1. **Xcode** — open `ios/App/App.xcodeproj` (or the workspace). Select the **App** target → **Signing & Capabilities** → set your **Team** (your Apple Developer account); let it manage signing automatically.
2. If this is a **re-submission**, bump **Build** (CURRENT_PROJECT_VERSION) — each upload needs a unique build number. First submit: 1.0 (1) is fine.
3. Set the destination to **Any iOS Device (arm64)** → **Product → Archive**.
4. In the Organizer: **Distribute App → App Store Connect → Upload**. Let it upload; wait for the "processing complete" email.
5. **App Store Connect** ([appstoreconnect.apple.com](https://appstoreconnect.apple.com)) → create the app record if it doesn't exist (name "To Try", primary language, bundle id `app.totry`, SKU).
6. Fill the listing: **subtitle**, **description**, **keywords**, **support URL**, **marketing URL** (optional), and **Privacy Policy URL** → point it at your hosted `privacy.html` (`https://alfredjohn200101.github.io/ToTry/privacy.html`).
7. **Screenshots** (required): 6.7" iPhone (1290×2796) and 6.5" iPhone (1242×2688) — a few of Home, Fight, Nourish, Soul. (You'll generate these from the simulator or a device.)
8. **App Privacy** (the "nutrition label" questionnaire): declare what's collected — **email** (account), and that **Health data is used but not collected/leaves the device** (per the usage strings). Be accurate.
9. **Age rating** questionnaire — **see the judgment call below.**
10. Attach the uploaded **build**, then **Submit for Review**.

## The one real judgment call: age rating
The app addresses **addiction recovery** — quitting weed, alcohol, gambling, porn/lust, etc. — so the
questionnaire will ask about **drug/alcohol references** (yes — but *recovery-oriented*, about quitting,
not promoting), **sexual content** (references to quitting porn; **no explicit content is shown**),
**gambling references** (yes — as a vice to quit, not simulated gambling), and **medical/treatment info**
(the recovery timelines — framed as encouragement, with a clear "not a replacement for real help" +
crisis resources). Answer **honestly**; this will most likely land at **12+**, possibly **17+** if Apple
weights the mature-recovery themes heavily. Either is fine — just don't under-declare, which risks removal.

## Review-risk notes (all currently handled — keep them that way)
- **Crisis / human-bridge paths** must stay prominent (child-safety + 1.4.1). They're intact — don't weaken.
- **"Not medical advice"** disclaimers on the recovery/readiness content are present — keep them.
- If a reviewer signs in with their own Apple test account, they **won't** be on the Strava allowlist and
  will see the honest "invite-only" Strava screen + the manual-log alternative — that's fine and functional.
- Make sure a reviewer can actually get in: the **email OTP** must deliver during review. Consider giving
  App Review a note explaining the OTP login (and that Strava is invite-only by design due to the API cap).

## After it's live
- Android/Play Store is the next target (the `android/` project is set up; Health Connect wired).
- The **reach-out-first native push** (the biggest post-wrapper unlock) can ship once wrapped — the
  `Notify` layer is already wrapper-aware.
