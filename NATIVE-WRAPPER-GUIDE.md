# To Try — Native Wrapper Guide (Capacitor)

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
