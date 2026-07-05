# To Try (native) — device build

The web preview has verified everything it can. The remaining features are **device-only** and need a
real build on your phone: live Apple Health / Health Connect data, native push (the reach-out-first
brain is already written and waiting), auth/OTP sync, Strava OAuth, and barcode scan.

This is the one part I can't do for you — it needs **your** Expo + Apple/Google accounts. Everything
below is set up and ready.

## What's ready
- `eas.json` — `development` (dev client), `preview`, `production` profiles.
- `app.json` — bundle id **`com.alfredjohn.totry`** (iOS + Android). Change it here if you want a
  different reverse-domain (it ties to your Apple app record).
- The whole JS app builds and runs; `npx expo config` resolves clean.

## Prerequisites (one-time)
1. A free **Expo account** — https://expo.dev
2. For iOS: an **Apple Developer account** ($99/yr) — EAS handles the certs/profiles for you.
   For Android: nothing paid; EAS makes a keystore.
3. Install the CLI: `npm i -g eas-cli`

## Build the dev client
```bash
cd native
eas login
eas init            # links this project to your Expo account, writes the projectId
eas build --profile development --platform ios      # or: --platform android
```
When it finishes, EAS gives you a QR/link. Install it on your phone (iOS: it walks you through a
device UDID / TestFlight-style install; Android: just install the APK).

Then run the JS against that dev client:
```bash
npx expo start --dev-client
```
Open the app on your phone, scan the QR — you're now running the real native app, not the browser.

## Once the dev client is on your phone — what I wire next (and verify WITH you)
Each needs a native module + a rebuild; we do them one at a time and test on the device:
1. **Apple Health / Health Connect** → real readiness (the provider is already structured; flip
   `healthIsLive` and drop in the reads). *The biggest data unlock.*
2. **Push notifications** → `expo-notifications`, wired to `computeReachOut()` so the sibling reaches
   out first at your known risk window. *The biggest single unlock.*
3. **Auth / OTP** → Supabase email OTP + the durable outbox so data syncs across devices.
4. **Strava OAuth** and **barcode scan** (camera).

## Notes
- Keep `web.output: "single"` in app.json — the browser preview (my verification loop) depends on it.
- The bundle id and `com.alfredjohn.totry` scheme are placeholders you own — change before store submit.
