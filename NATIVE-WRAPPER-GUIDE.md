# To Try — Native Wrapper Guide (Capacitor)

> **STATUS (12 Jul 2026): the wrap is BUILT — one Xcode step from running on your phone.**
> Capacitor 8 is installed; deps are in `node_modules`; the **iOS project is scaffolded at `ios/App`**
> and **synced with the latest PWA (v210)** — `ios/App/App/public/index.html` is v210, matching the
> live GitHub Pages build. Bundle id `app.totry`. Both notification plugins (LocalNotifications +
> PushNotifications 8.x) are wired via **Swift Package Manager (no CocoaPods)** and resolve cleanly.
> **Xcode 26.6 is installed**, first-launch components are done, and the **iOS platform is downloading**
> (`xcodebuild -downloadPlatform iOS`) to enable device builds.
>
> To re-sync after any PWA change: `npm run sync` (assembles `www/` from the root PWA → `npx cap sync`).
> `ios/`, `android/`, `www/`, `node_modules/` are gitignored (regenerable); the config is committed.
>
> **THE FINAL STEP (needs your Apple ID in the Xcode GUI — cannot be automated):**
> 1. `npm run ios` (or `npx cap open ios`) → opens `ios/App/App.xcodeproj` in Xcode.
> 2. Select the **App** target → **Signing & Capabilities** → set **Team** to your Apple ID
>    (a **free** personal team installs to your own phone; 7-day re-sign. The $99 account is only for
>    TestFlight/App Store — don't pay it until the app has earned it).
> 3. Plug in your iPhone, pick it as the run destination, press **▶ Run** (⌘R).
> 4. First run only: on the phone, **Settings → General → VPN & Device Management → trust** the cert.
> 5. Then background push works — the `Notify` layer auto-detects the wrapper and the reach-out-first
>    sibling + morning/evening reminders fire even when the app is closed.
> 6. Android later: install Android Studio → `npm run android`.

The app ships now as a PWA. This guide wraps it into a real iOS/Android app so you get **native push
notifications** (the sibling reaching out first, even when the app is closed), home-screen presence,
and App Store / Play Store distribution — with **no rewrite**. The code is already prepared: the
`Notify` layer in index.html auto-detects the wrapper and routes through native push when present.

## Why wrap it
- **iOS PWAs can't do reliable background push.** That's the one thing blocking "reach out first."
- Capacitor keeps your single `index.html` as-is and adds a native shell around it.
- The `Notify` abstraction already prefers native (`window.Capacitor`) and falls back to web — so the
  moment you wrap, scheduled nudges fire even when the app is closed. Nothing to refactor.

## Prerequisites (this part needs a real terminal — Claude Code or your Mac)
- Node.js + npm
- For iOS: a Mac with Xcode + an Apple Developer account ($99/yr)
- For Android: Android Studio

## Steps
```bash
# 1. In a folder containing your index.html, sw.js, icons:
npm init -y
npm install @capacitor/core @capacitor/cli
npx cap init "To Try" "app.totry" --web-dir=.

# 2. Add the platforms
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android

# 3. Add the notification plugins (the Notify layer already calls these)
npm install @capacitor/local-notifications @capacitor/push-notifications
npx cap sync

# 4. Open in the native IDE
npx cap open ios      # Xcode
npx cap open android  # Android Studio
```

## What the app already does for you
- `Notify.requestPermission()` → calls the native LocalNotifications/PushNotifications permission
  prompt when wrapped; web Notification prompt otherwise.
- `Notify.schedule(id, title, body, when)` → schedules a notification that fires **even when the app
  is closed** on native; records intent for app-open delivery on web.
- `Notify.now(title, body)` → immediate notification, native or web.
- `Notify.isNative()` → true inside the wrapper, so any feature can light up native-only paths.

## After wrapping — what to build next (in Claude Code, ideally)
1. **Move the morning nudge + gone-quiet welcome onto `Notify.schedule`** so they fire in the
   background (right now they're app-open best-effort on web).
2. **The "reach out first" sibling moments** — schedule a gentle, throttled nudge at the user's
   known risk window (the craving-pattern data already identifies it). This is the single biggest
   new capability the wrapper unlocks: the brother who notices and reaches out *before* the moment.
3. **Push server (optional, later)** — for messages you send (not just locally scheduled), stand up
   a small push server + register device tokens via `PushNotifications`. Only needed if you want to
   send things remotely; local scheduling covers most of the sibling's "reaching out."

## Honest note
Steps 1–4 happen in a terminal/IDE, not in a normal chat. This is the natural point to move the
build-and-ship phase into an agentic coding environment (Claude Code), which can run these commands,
test the live app, and split the 28k-line index.html into maintainable modules. The product is
defined; this is execution.
