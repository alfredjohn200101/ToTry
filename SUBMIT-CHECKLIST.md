# Submit — the exact steps and the exact answers


---

## ▶▶ CURRENT STATE — 22 Oct 2026 — v650. **THERE IS NO CURRENT ARCHIVE.** READ THIS FIRST.

**Everything below this block is HISTORY.** It still opens with "BUILD 9 — v600 — READY TO
ARCHIVE", true once and false for 44 versions. That is why this block exists at all.

**⛔ ORGANIZER IS EMPTY ON PURPOSE, AND THAT IS THE MOST IMPORTANT LINE HERE.** The v643/build 10
pair was moved to `~/Library/Developer/Xcode/ToTry-superseded-archives/` — kept, never deleted —
because v644 fixed a **correctness** path: **every share card in the app drew nothing on a fresh
install**, and the progress collage exported a black-on-black title with invisible dates. Organizer
shows a name and a date and never which web bundle is inside, so uploading "ToTry-v643-build10"
tomorrow would ship that. **Re-archive before you upload.** The superseded folder now holds four
pairs: v625/build9, v635/build10, v638/build10, v643/build10.

**The live PWA is deployed and serving v649**; v650 is committed on `main` and **not yet pushed**.
`ios-native` is merged, so `main` is the one line of development again.

**⚠ THE SERVER IS AHEAD OF THE CLIENT, DELIBERATELY, AND ONE THING IS WAITING ON A PUSH.**
`send-push` **v23** is live and the `last_seen` / `last_away_sent` columns are applied — both had to
go first, because the away nudge exists for people who are not opening the app and there is nowhere
else for it to run. But `last_seen` is written by the CLIENT, so until v650 is pushed no PWA row
advances it and no away nudge can fire. Nothing is broken by the gap; it is just inert.
And measured against the live table, **both subscribers still hold `tz_offset_minutes: -600` with
`tz` NULL, so their reminders are still an hour late** — v649's DST fix is correct and cannot reach
them until the app is opened once on each device with a client that writes `tz`. An offset cannot be
repaired by guessing: −600 is Melbourne-in-winter and also Brisbane-all-year.

**What v650 is, in one line each** — driven in a browser, not reasoned:
- The companion opened on EVERY launch behind a 90-minute throttle. A throttle is a timer with a
  floor, not a threshold, and *"How are you, really?"* arriving because time passed is the pattern
  this product refuses. `companionThreshold()` decides now — an unresolved urge, a slip nobody sat
  with — and silence otherwise. Readiness and sleep are REFUSED as thresholds and a test holds it.
- Two unbidden sheets were armed on two timers (1200ms and 2600ms) and each decided for itself, so
  the companion's `.modal-bg.open` guard ran before the other sheet existed and in the hard hour a
  person got BOTH. `riskWindowHit()` is a predicate now; the once-per-window stamp stays in the
  renderer, because asking a question cannot be the same act as answering it.
- `_urgeTs()` — the normaliser whose own comment promised three consumers — missed a bare
  `Date.now()`, the shape `05-moment.js` writes. The journal dropped letting-go urges while a count
  four lines away counted them, and the hard-hour histogram bucketed them at 1970.
- The away nudge, both halves: `send-push` at 17:00 local off `last_seen` for the PWA, and three
  local notifications at +4/+11/+18 days re-armed on every open for native. One per 7 days, none
  past 21 days quiet — at most three, then silence.
- `send-push` had **no test at all** after months of sending every reminder. 22 now, six fault
  injections. `supabase/migrations/` exists for the first time.

**Gate at v650, every suite re-run after the last edit:** `npm test` **4443/0** · `npm run crisis`
**57 doors dialable and 53 of 53 ordinary sentences left alone** · `npm run personas` **566/0** ·
`npm run test:edge` **34 + 22 + 22 passed** · `npm run engines` **0 of 365 days forked** ·
`node scripts/craft-audit.mjs` **0 under 13px, 0 wrapping caps, 0 neighbours, 3 greys over ten
screens** · `npm run preflight` **ready to archive**.

<details><summary>The v644 block, kept because its measurements explain what the share cards were</summary>

**What v644 is, in one line each** — all measured in a browser, not reasoned:
- A canvas cannot resolve a CSS custom property. `ctx.fillStyle` silently IGNORES one and keeps the
  previous value (initially **opaque black**); `CanvasGradient.addColorStop` **THROWS**. The share
  theme defaults to dark, and `_renderShareCanvas` threw for all three styles in dark while
  completing for all three in light. `renderCustomShareCard` threw unconditionally. Silent, because
  its caller runs the draw as `.then(draw).catch(draw)`.
- The same surface drew its small type in **DM Mono**, a face the app stopped shipping, at 14
  `ctx.font` sites. `document.fonts.load()` RESOLVES for an unknown family rather than rejecting, so
  the await succeeded and the draw proceeded.
- `sw.js` precached three DM Mono files nothing references and **omitted `outfit-ext.woff2`**, which
  the bundle does load — so a cold offline start fell back for exactly the people whose own name
  needs those glyphs.
- The nutrition trend chart's labels sat at 8px in that dropped face and **had never been measured**:
  the card is `display:none` unless food is logged on 2+ of the last 14 days and the seed logged ONE.
  Seeding three days then surfaced 13 more under-floor runs on code nobody had touched.

**Gate at v644, every suite re-run after the last edit:** `npm test` **4362/0** · `npm run crisis`
**57 doors dialable and 53 of 53 ordinary sentences left alone** (both directions) ·
`npm run personas` **566/0** · `npm run engines` **0 of 365 days forked** · `npm run panels`
**RC=0, no failures** · `node scripts/craft-audit.mjs` **0 under 13px, 0 wrapping caps, 0 neighbours,
3 greys over ten screens** — and that zero now means something, because the seed reaches the cards
it was previously measured without · `npm run preflight` **ready to archive**.
</details>

**To cut the next archive:** `npm run build:index && npm run build:www && npm run sync`, confirm
`npm run preflight` says *ready to archive*, then archive and export. **Verify the IPA, never the
archive** — the archive is Development-signed with `get-task-allow=true` by design because the
export re-signs. The IPA must read `Apple Distribution: Alfred John (L4BD53PLVF)`,
`get-task-allow=false`, `beta-reports-active=true`, arm64 only, PrivacyInfo present, and a web
bundle sha byte-identical to the repo. Keep build **10**: it has never been uploaded.

**The store screenshots are reproducible** — `node scripts/app-shot.mjs seed` plants the demo person
into WebKit's own `localstorage.sqlite3`. The four in `~/Desktop/ToTry-screenshots/6.9-v643/` predate
v644; re-cut them from the new build before submitting.

**Still hardware-only: barcode scanning (no camera) and haptics (no Taptic engine).**

**The upload click is the owner's.** Nothing here uploads anything, and nothing needs an issuer ID.

---
Everything on the code side is done and **verified against a real Release archive** (Xcode 26.6,
`ARCHIVE SUCCEEDED`). What's below is only the GUI work, which needs your hands and your Apple ID.

## 0 · Two things only you can do (everything else is done)

| # | What | Why it matters | Where |
|---|------|----------------|-------|
| 0 | **Everything below was written around v424 — read it with that in mind** | The build table, the "build number 3" line and the version references in the older sections are stale by ~170 versions. The BUILD 6 section at the top is current and verified; the App Privacy, age-rating and review-notes sections further down are still accurate because they describe the app's behaviour, which has not changed in those respects. | — |
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

## ▶ BUILD 9 — v600 — READY TO ARCHIVE, NOT YET UPLOADED

`npm run preflight` is green: source, `www/`, the iOS bundle **and** the Android bundle are all
byte-identical at v600 (sha `7330a6c8b2d7`), and `CURRENT_PROJECT_VERSION` is **9** — App Store
Connect already holds 8, and it rejects a build number it has seen.

**What build 9 carries that build 8 does not — all three came off a real phone:**

| Reported | What was actually wrong | Fixed |
|---|---|---|
| "the logo on the face id screen" | The lock overlay, the boot splash and the sign-in screen all render `To<em>Try</em>`, and Cormorant's italic T has a left side bearing the roman o does not — so the mark PAINTED as two words. Measured on the pixels at 52px against two known answers in the same font: all-roman "ToTry" leaves a 0px ink gap, a literal space leaves 15px, this join left 5px. | `margin-left:-0.095em` on `.ob-logo em` and `.logo-main em` — closes it to 0 at every size the mark is used, and −0.115em is where the glyphs collide, so it is not near the edge. |
| "nothing has changed" (after the launch screen was fixed once) | It had not. `launchAutoHide:false` means the SplashScreen plugin paints `Splash.imageset` over the storyboard within a frame — and that asset was a flat #0a0a0f fill. The launch screen a person saw was BLACK, whatever the storyboard drew. | Storyboard and plugin now draw the SAME artwork, full-bleed. `scripts/make-splash.js` generates it from the running app, so it inherits the real webfont and the kerning above and cannot drift from the web layer again. |
| "haptics can be better for breathwork" | Every phase fired the same `haptic('light')` at its boundary and nothing in between — inhale, hold and exhale felt identical, and a 7-count hold was left entirely to the head, in the one posture the screen exists to ask for. | The kind is derived from the orb scale the protocols already declare (all nine read correctly), so in/hold/out feel different; and one soft `selectionChanged` tick a second paces the middle. Driven and measured on 4-7-8: **4 cues in, 7 in the hold, 8 out** — the count you feel is the count you hold. Nothing leaks after close. New Settings → Preferences → **Feel** switch, because a repeating cue must be refusable; absent means ON. |

**The camera, both halves (v600.1).** Asked which camera he meant, he said both.
*Snapping a meal* opened the iOS chooser and never a viewfinder — the input deliberately has no
`capture=` so an existing photo can be logged, which is a good reason and the wrong outcome. Two
inputs now: `snapMeal()` → camera, `chooseMealPhoto()` → library, both into the same handler, with
"Photo from your library" as its own entry in More ways to log.
*One "Don't Allow" killed every camera surface, silently* — iOS asks once, and after a refusal the
live-scan button was simply absent, while a `capture=` input fires and does nothing. The cause was
flattening two different answers into one boolean: "no camera on this device" and "you refused
months ago" both read as false, and only the first deserves silence. `CameraAccess.state()` returns
`ok | denied | none | web`, and `BarcodeScannerPlugin` gained `openSettings()` — the only route back.
Denied now shows the button, says *"Camera is off — turn it on"*, opens Settings, and still offers
the photo and the typed number.

**Also in build 9:** `@capacitor/barcode-scanner` was installed during the previous session on a
false premise and has been removed. `BarcodeScannerPlugin.swift` is an app-target plugin — compiled
in and registered by instance, so it never appears in `package.json`, which is what I mistook for
"not installed". Confirmed in the built dylib: 111 symbols, `jsName = "BarcodeScanner"` present. The
third-party SPM dependency is gone from the binary.

Gate: `npm test` 1924 ✓ · `test:edge` 34 ✓ · `verify:index` identical ✓ · `preflight` ready ✓
(crisis / personas / panels below).

**To upload:** Xcode → Product ▸ Archive → Window ▸ Organizer → Distribute App → App Store Connect.
Still yours to do, and deliberately so — it publishes under your developer account.

---

## ✅ BUILD 8 UPLOADED — 9 Sep 2026 — **v597, in App Store Connect**

Uploaded via Xcode Organizer → Distribute App → App Store Connect. App Store Connect now holds
builds 4, 5, 6 and **8** (7 was archived at v596 and never uploaded).

**⚠️ Of those, only build 8 is safe to promote.** 4, 5 and 6 predate the whole v594-v597 run:
they carry a dead Settings Height field, 103 controls in Arial, near-black progress bars in the
light theme, a coach colour under AA in both themes, Supabase env-var names shown to users, an
80px "0" on the day somebody decides, a fold hiding twelve controls with no affordance, and a
Feeling Door with no heading in the light theme.

**Next, in order:**
1. Wait for processing (usually a few minutes; ASC emails you if it fails export compliance or
   finds a missing icon).
2. TestFlight → Internal Testing → add yourself → accept the invite on the phone.
3. **TWO things only real hardware can answer — not four.** This said four for months.
   **Face ID matching and notification delivery were both verified on the SIMULATOR on 10 Oct 2026**
   (v610, the real Capacitor build, driven end to end — see § "What the simulator settled" below).
   What genuinely still needs a phone: **barcode scanning** (no camera) and **haptics** (no Taptic
   engine). "Everything else is verified" is too broad and used to be written here — the reach-out
   nudge in particular is NOT covered: `app-shot.mjs` seeds no data (unlike `ios-shot`/`sim-shot`,
   which both use `seed-person.mjs`), so on that install `scheduleReachOut()` correctly has nothing
   to arm and the simulator run says nothing about it. Nor are quiet hours or the "at most 3 a week"
   throttle.
4. Before SUBMITTING for review (not needed for TestFlight): the age rating and the App Privacy
   form, both described further down this file. **This line used to say those sections were "still
   accurate because they describe behaviour, which has not changed." That was wrong, twice.** The
   App Privacy section under-declared Photos/Videos against the shipping manifest, and § 3's
   User-Generated Content answer had stopped being true when `shared_library` gained its two
   contributors. Behaviour DOES change underneath a doc that only describes it — both were found by
   re-deriving every answer from the v610 code, and both are now gated (`npm run preflight`
   cross-checks the manifest against `APP-PRIVACY.md`; `npm test` pins what reaches the shared
   library). Re-derive, do not re-read.

### The artifacts, verified from their binaries

Archive: `~/Library/Developer/Xcode/Archives/2026-09-09/ToTry-v597.xcarchive`
IPA:     `~/Library/Developer/Xcode/Archives/2026-09-09/ToTry-v597-build8.ipa` (2.2 MB)

**Build 9 (v610) was archived AND exported locally on 10 Oct 2026, and the whole chain is green**
— so the archive step is no longer an unknown, and only the upload itself is left. There is no workspace to OPEN in this project (Capacitor SPM, not CocoaPods — `find` does return
`ios/App/App.xcodeproj/project.xcworkspace`, which is Xcode's own internal one inside the project
bundle and is not what `-workspace` wants), so it is `-project`:

```
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath <path>/ToTry.xcarchive archive
xcodebuild -exportArchive -archivePath <path>/ToTry.xcarchive \
  -exportPath <path>/export -exportOptionsPlist <path>/ExportOptions.plist
```

`ExportOptions.plist` needs `method = app-store-connect`, `teamID = L4BD53PLVF`,
`signingStyle = manual`, `signingCertificate = Apple Distribution`, and
`provisioningProfiles = { app.totry: ToTryAppStore }`. Manual signing is what makes it work with no
Apple credentials at all: both App Store profiles are already installed locally.

**The archive and IPA live where Xcode Organizer actually looks**, which is the difference between
"only the upload click is left" and "only the upload click is left, once you find it":
`~/Library/Developer/Xcode/Archives/2026-10-11/ToTry-v611-build9.{xcarchive,ipa}`. An earlier draft
of this section asserted the artefacts existed while they sat in a per-session scratch directory
that no tool and no future reader could reach.

**It is cut at v611**, after the seven devotional false positives were closed in `detectCrisis`
AND after the fuel plan's dead crisis gate was fixed. TWO earlier archives have been moved out of
Organizer for the same reason — a v610 one, and a v611 one that predated the fuel gate. **An
archive that is merely stale is a hazard when the staleness is a crisis path**, because nothing in
Organizer tells you which of two builds you are about to upload. Moved, never deleted.

Read out of the resulting binaries, never from the log:
- `ToTry.ipa`, 2.7 MB — **Authority = Apple Distribution: Alfred John (L4BD53PLVF)**,
  **`get-task-allow = false`**, and **arm64 only** (no simulator slice left in the binary). Those two are what decide whether an upload is accepted; the
  ARCHIVE is signed *Apple Development* with `get-task-allow = true`, which is normal and not a
  defect — the export step re-signs. Check the IPA, not the archive.
- `1.0` build `9`, `app.totry`, min iOS 15.0, `PrivacyInfo.xcprivacy` present at the app root.
- The embedded web bundle is `APP_VERSION = 'v610'` and byte-identical to the repo's `index.html`
  (sha256 `b14d3aca6b643f26…` on both sides) — preflight's parity claim, confirmed from inside the
  artifact that would actually ship.

**ONE REAL DIFFERENCE BETWEEN BUILD 8 AND BUILD 9, FOUND BY COMPARING THE TWO IPAs.** Build 8's
uploaded IPA carries `com.apple.developer.healthkit.background-delivery`; build 9's does not,
because the manual-signing export takes entitlements from `ios/App/App/App.entitlements`, which
declares only `com.apple.developer.healthkit`, whereas build 8 was signed with Xcode's automatic
style against the managed team profile. **Measured: nothing breaks** — the Swift makes zero
`enableBackgroundDelivery` / `HKObserverQuery` calls, so the entitlement was present and unused.
But if background delivery is ever actually implemented, this export recipe will silently ship an
app that cannot use it. Add the key to `App.entitlements` on that day, not after.

One false alarm worth not repeating: `plutil -extract CFBundleIconName` reports ABSENT, which looks
like `ERROR ITMS-90713`. It is nested at `CFBundleIcons.CFBundlePrimaryIcon.CFBundleIconName`, which
is where actool writes it, and build 8 already uploaded with that exact layout. The flat extract was
the thing that was wrong.

Both verified by reading the files OUT OF the bundle, never from the build log — that is the
check that caught build 6 shipping v593 while its log said success. Repeat it on every archive.

| check | archive | ipa |
|---|---|---|
| web bundle inside `ToTry.app` | **v597** sha `03024dcae96e` | **v597** sha `03024dcae96e` |
| identical to `www/index.html` | yes | yes |
| version / build | 1.0 / **8** | 1.0 / **8** |
| architecture | arm64, no simulator slice | — |
| `PrivacyInfo.xcprivacy` | present | — |
| usage descriptions | 7 | — |
| `ITSAppUsesNonExemptEncryption` | `false` | — |
| signature | Apple Development (archive) | **Apple Distribution: Alfred John (L4BD53PLVF)** |

The export re-signs Development → Distribution, which is expected and means nothing about
signing is outstanding. Spot-checked that v597's two light-theme fixes are actually INSIDE the
IPA (`hero-verse p{color`, and `.feel-greeting` using `var(--tx)`), not merely in the source.

**Build numbers so far:** App Store Connect holds 4, 5, 6. Build 7 was archived at v596 and
never uploaded — v597 took 8 so that one build number means exactly one bundle. Superseded
artifacts (`ToTry-v596.xcarchive`, `ToTry-v596-build7.ipa`) are still on disk; do not upload them.

**To upload:** Xcode → Window → Organizer → `ToTry-v597` → Distribute App → App Store Connect →
Upload. Signs in with your Apple ID, so no issuer ID needed. The CLI route needs the App Store
Connect issuer UUID, which is not on this machine — see below.

### ✅ v596 DRIVEN ON THE NATIVE WRAPPER — 9 Sep 2026, iPhone 17 Pro Max simulator

Built from the same source as the archive (`Release`, bundle inside `ToTry.app` reads v596,
sha `99a4de4e84a5`, identical to `www/index.html`) and driven by tapping, not by asserting.
This is the wrapper, not the browser — so it covers the Capacitor layer the gate cannot.

| checked on the device | result |
|---|---|
| **the crisis gate, offline, with iOS's OWN smart apostrophe** | **fires.** Typed `don't` into the Feeling Door's free-text; iOS Smart Punctuation converted it to `don’t` as it does for a real person; submitting returned "I hear you — and this is more than I should hold alone" with Lifeline 13 11 14, Beyond Blue 1300 22 4636 and Suicide Call Back Service 1300 659 467. This is the exact glyph that made the gate fail OPEN once before, and the network was down, so nothing about it depended on the AI. |
| Settings → Height (the v594 fix) | reads `Height (for BMI) [180] cm`. No source on screen, the `cm` label sits after the input where the spliced span belonged, and it holds a value — so the handler compiles and saves. |
| Fight → Score (the v595 fix) | hero **58** under "DAYS IN THE FIGHT", vice row "Day 58 of the fight" — one label, one number. Before v595 the hero said 57 under that same label. |
| every `<details>` fold (v595) | all six settings groups show the app's own ▾ |
| helpline colour (v594) | gold on the Settings crisis card, matching every other tel: link |
| buttons (v594) | "Check in with me", "Still clean" and the rest render in Outfit, not Arial |
| the two vice-card links (v594) | "What this is earning you" and "Manage · …" now the same size |
| boot | launches, Home renders, offline banner behaves, navigation works |

NOT covered by the simulator, and still the reason to get it onto real hardware: **barcode
scanning, Face ID, haptics, notification delivery.** Nothing else is outstanding.

### The v596 IPA (superseded — kept only for the upload instructions below)

`~/Library/Developer/Xcode/Archives/2026-09-09/ToTry-v596-build7.ipa` (2.2 MB). Exported from the
archive with `-exportArchive`, method `app-store-connect`. Verified by unzipping it and reading
the files, not by trusting the export log:

| check | result |
|---|---|
| web bundle inside `Payload/ToTry.app` | **v596**, sha256 `99a4de4e84a5` — identical to source |
| version / build | 1.0 / 7 |
| signature | **`Apple Distribution: Alfred John (L4BD53PLVF)`** |

Note the signature: the ARCHIVE was Apple Development, and the export re-signed it to Apple
Distribution, which is exactly what was expected. Nothing about signing is outstanding.

**One value is missing and it is the only thing standing between this file and TestFlight.**
`~/.appstoreconnect/private_keys/AuthKey_49872NRTQS.p8` is on this machine; the **issuer ID** that
pairs with it is not, and it cannot be derived from the key. Get it from App Store Connect →
Users and Access → Integrations → App Store Connect API (it is a UUID at the top of the page),
then either upload from the terminal:

```
xcrun altool --upload-app \
  -f ~/Library/Developer/Xcode/Archives/2026-09-09/ToTry-v596-build7.ipa \
  -t ios --apiKey 49872NRTQS --apiIssuer <YOUR-ISSUER-UUID>
```

...or skip the credential entirely and use the GUI, which signs you in with your Apple ID:

**The path to a phone, in order:**
1. Xcode → Window → Organizer → select `ToTry-v596` → **Distribute App** → App Store Connect →
   Upload. (`altool` cannot do this from the CLI here — the issuer ID is not on this machine.)
2. App Store Connect → TestFlight → wait for processing → add yourself as an internal tester.
3. Install TestFlight on the iPhone and accept the invite.
4. **Two things only real hardware can answer** (Face ID and notifications were settled on the
   simulator — see § "What the simulator settled"): barcode scanning, haptics,
   notifications. Everything else has been verified in the browser gate.

Faster alternative if you only want it on your own phone TODAY, skipping App Store Connect:
plug the iPhone in, open `ios/App/App.xcodeproj`, pick the device in the toolbar, Product ▸ Run,
and click **Register** when Xcode offers to add the device. That installs the same v596 build
directly. It needs your hands — device registration cannot be scripted from here.

<details><summary>Build 6 (v593) — superseded, DO NOT UPLOAD</summary>

### ⛔ BUILD 6 IS STALE — v593, three releases behind

Build 6 archived cleanly and everything in the table below is still true OF THAT ARCHIVE — it is
simply three releases behind now. It holds **v593**, and v594/v595/v596 each fixed something a
person meets:

- **v594** — Settings → Height was DEAD (no handler compiled; 180cm saved nothing, and BMI reads
  that value) and printed its own JavaScript on screen; 103 of 402 controls rendered in Arial;
  the light theme painted every progress track near-black; the coach's purple failed AA in BOTH
  themes; a person mid-urge could be told to "Check Supabase secrets (GEMINI_API_KEY…)".
- **v595** — Fight → Score showed an 80px green "0" on the day somebody decides, above "Every
  number here is a moment you chose who you're becoming"; a fold hiding twelve controls had no
  affordance at all; Nourish denied its own on-screen targets; two cards shared one name.
- **v596** — SOS phase 4 told a person mid-urge "Your coach is here" twice, the second time as a
  loading state inside an empty box.

Shipping build 6 ships all of those. To re-archive: set `CURRENT_PROJECT_VERSION = 7` in
`ios/App/App.xcodeproj/project.pbxproj` (App Store Connect rejects a build number it has seen —
it already holds 4, 5 and now 6), run `npm run preflight` until it says *ready to archive*, then
archive. Verify the new archive the same way the table below was verified: read the web bundle
out of the .app and check it says v596, rather than trusting the project settings.


`~/Library/Developer/Xcode/Archives/2026-09-08/ToTry-v593.xcarchive`, version 1.0, **build 6**,
signed *Apple Distribution: Alfred John (L4BD53PLVF)*. Archived with `xcodebuild archive
-allowProvisioningUpdates`, which fetched the distribution profile itself. Verified from the built
binary rather than the project settings:

| check | result |
|---|---|
| web bundle inside the .app | **v593**, sha256 `645beea4e01a` — byte-identical to `index.html` |
| version / build | 1.0 / **6** (App Store Connect already holds 4 and 5; 6 is unused) |
| `PrivacyInfo.xcprivacy` | present inside the .app |
| usage descriptions | 7 |
| architecture | `arm64` only, no simulator slice |
| `ITSAppUsesNonExemptEncryption` | `false` — the export-compliance question is not asked |
| launches | verified: built for the simulator from the same source, boots in ~2.8s, Home renders, navigation works |

</details>

### ⚠️ DO NOT SUBMIT OR PROMOTE BUILD 5

Build 5 carries **v574**. Between v574 and v593 the app gained, among much else: crisis gates on the
first three things anybody types (onboarding's identity, why and vices) and on the calendar's AI box —
in v574 a suicide disclosure typed there is stored verbatim and printed back as a vice card with a
clean-day counter, with no helpline; six HTML-injection doors including the shared toast sink and
model output rendered as markup; a suicide disclosure pasted into the coach's system prompt on every
later message; the calendar opening the wrong day at every positive UTC offset; and a cross-device
merge that destroyed a measurement, a saved passage or a rostered shift. If build 5 is visible to any
tester, they are running that.

### Uploading still needs Organizer, not the command line

`~/.appstoreconnect/private_keys/AuthKey_49872NRTQS.p8` exists but the **issuer ID** that pairs with
it is still not on this machine, so `xcrun altool` cannot be driven. Organizer uses the Apple ID
already signed into Xcode and needs no key: **Window ▸ Organizer ▸ ToTry-v593 ▸ Distribute App**.

### Installing straight to the phone (optional, and not needed to submit)

Your iPhone 16 Pro Max is paired and visible to the Mac, but there are **zero provisioning profiles
on this machine** and no iOS *Development* profile for `app.totry` — only the distribution one, which
cannot install to a device. Open `ios/App/App.xcodeproj`, choose **Alfred's iPhone**, **Product ▸
Run**, and click **Register** when prompted (needs your Apple ID in Xcode ▸ Settings ▸ Accounts).
TestFlight is the better path anyway: it tests the exact binary you are submitting.

---

## ⛔ BUILD 7 (v596) — SUPERSEDED BY BUILD 8, DO NOT UPLOAD

`~/Library/Developer/Xcode/Archives/2026-09-09/ToTry-v596.xcarchive`, version 1.0, **build 7**.
Verified from the BINARY, not the project settings — that is the check that caught build 6 being
three releases stale, so repeat it on every archive:

| check | result |
|---|---|
| web bundle inside `ToTry.app` | **v596**, sha256 `99a4de4e84a5` — byte-identical to `www/index.html` |
| version / build | 1.0 / **7** (App Store Connect holds 4, 5, 6) |
| `PrivacyInfo.xcprivacy` | present inside the .app |
| usage descriptions | 7 |
| architecture | `arm64` only, no simulator slice |
| `ITSAppUsesNonExemptEncryption` | `false` — the export-compliance question is not asked |
| signing | **`Apple Development: Alfred John (UU43JTL72J)`, team L4BD53PLVF** |

⚠️ **The signing differs from build 6**, which was `Apple Distribution`. `-allowProvisioningUpdates`
fetched a development profile this time. This does NOT block TestFlight — Organizer's
*Distribute App → App Store Connect* re-signs with the distribution certificate — but if that step
complains about signing, that is why, and the fix is to pick the distribution profile in the
Organizer sheet rather than to re-archive.

## ✅ BUILD 5 ARCHIVED AND UPLOADED — 4 Sep 2026

v574, version 1.0, **build 5**, 2.1 MB, signed *Apple Distribution: Alfred John (L4BD53PLVF)*.
Uploaded through Xcode Organizer → Distribute App → App Store Connect. Verified in the exported .ipa
BEFORE upload, from the built binary rather than the project settings:

| check | result |
|---|---|
| `get-task-allow` | `false` |
| `beta-reports-active` | `true` |
| HealthKit entitlements | both present (incl. background-delivery) |
| architecture | `arm64` only — no simulator slice |
| `PrivacyInfo.xcprivacy` | present |
| usage descriptions | 7 |
| `ITSAppUsesNonExemptEncryption` | `false` — the export-compliance question is not asked |
| min iOS | 15.0 |
| web bundle inside the .app | **v574** |

**`CURRENT_PROJECT_VERSION` is now 6**, so the next archive cannot collide with what was just sent.

### Uploading still needs Organizer, not the command line

`~/.appstoreconnect/private_keys/AuthKey_49872NRTQS.p8` exists but the **issuer ID** that pairs with it
is still not on this machine, so `xcrun altool` cannot be driven. Organizer uses the Apple ID already
signed into Xcode and needs no key. Note Organizer reads archives from
`~/Library/Developer/Xcode/Archives/<date>/` — an archive written anywhere else (e.g. by the xcodebuild
command below with a custom `-archivePath`) must be copied there before it appears in the list.

### What is in build 5 that was not in build 4

v574: the FatSecret food search moved server-side into `key-proxy` (the browser call was CORS-blocked
100% of the time, on iOS too); the starter-target strip now names the person's own calorie number
rather than the generic default; the demo persona no longer reports its own target as generic; and the
Bhagavad Gita reader carries chapter context (421 → 1,223 characters).

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

Answer the questionnaire honestly. Every line below was **re-verified against the v610 bundle on
10 Oct 2026**; the previous version of this list was written around v424, and one answer had gone
stale in a way that matters (see User-Generated Content). Where a number appears, it is measured.

- **Medical/Treatment Information → declare it, and consider the HIGHER band.** Measured on the
  shipped bundle with comments stripped (`H.code()`), each count naming the exact tokens so you can
  reproduce it rather than trust it — an earlier draft of this bullet gave four numbers whose labels
  did not match what had been counted, which is the failure this whole section exists to avoid:
  `calorieTarget|proteinTarget|tdee|bmr` **162**; `bmi` **23**; `menstrual|luteal|follicular|ovulat`
  **34**; `HealthWrite|HKQuantity|healthkit` **21** (these are HealthKit *touch points*, not reads —
  `HealthWrite` is a write, and the bare word "HealthKit" occurs once);
  `CBT|ACT|urge-surf|cognitive restructur|defusion` **23** (the first four alone give 18 — the fifth
  term is doing real work); `helpline|Lifeline|Samaritans|988` **54**; and
  `emergency services|get to a hospital|Ambulance` **7**, of which at least one is `_HUMAN_KIND`,
  the net's own detector regex rather than a place the app says it. It does not diagnose or prescribe and it carries 4 explicit "not medical
  advice" disclaimers — but health and mental-health guidance is on essentially every screen, so the
  "Infrequent/Mild" this doc claimed from v424 is hard to defend. Answer what the app does and take
  the band that follows.
- **Alcohol, Tobacco, or Drug Use or References → Infrequent/Mild.** Confirmed. Vices can be named
  and tracked (alcohol, nicotine/vaping, weed); nothing is depicted or encouraged.
- **Sexual Content or Nudity → nothing is depicted or described, but the references are more
  prominent than an earlier draft of this bullet said.** It named only the vice field's placeholder
  (*"Name it (e.g. weed, drinking, porn)…"*). The stronger rendered strings it missed:
  **`Lust / PMO` is a tappable chip in ONBOARDING step 5** ("What are you fighting?",
  `shell-head.html:4237`) — one of the first screens anybody sees, not a setting buried in a tab —
  and a Feeling Door option reads **"lust / feeling unbearably horny"**. `VICE_PLAYBOOK` has a
  `porn` entry with user-facing labels.
  The only explicit anatomical/act word in the whole bundle is still the matcher stem `'masturbat'`
  — 2 occurrences with comments stripped, both inside keyword arrays tested *against* what a person
  types and never rendered. So "None" remains defensible for **depiction**; for sexual references or
  themes the honest answer is Infrequent/Mild. Your call — but make it knowing what is on screen in
  the first two minutes, which is the part this bullet previously got wrong.
- **Profanity → None.** Verified: 1 match raw, **0** with comments stripped — the single hit is the
  owner's own words quoted inside a bug comment. Nothing profane renders.
- **Gambling → None, and no simulated gambling.** Gambling is a trackable vice and poker sessions
  are logged as *money*, never played: there is no dice, wheel, slot, card-deal or jackpot mechanic
  anywhere in the bundle (measured: 0). No contests.
- **Violence, horror → None.**
- **Unrestricted Web Access → No.** Verified at the **native** layer, not just the web layer: no
  embedded browser (`Browser.open` / `InAppBrowser`: **0**), `capacitor.config.json` declares **no
  `allowNavigation`**, and no Swift file overrides `WKUIDelegate` or `decidePolicyFor`. So only the
  app's own origin loads in the webview and external links hand off to Safari.
  The whole navigation surface, not just one third of it: **9** `window.open` (all `_blank`), **9**
  `<a target="_blank">`, and **6** `location.href =` — the last going to `app.scheme` / `ca.scheme`,
  i.e. deep links OUT to other apps, which is not in-app browsing. An earlier draft cited only the
  nine `window.open` calls and concluded from them; the conclusion survives the other fifteen, but
  the evidence had to.
  **And it said "none of the 9 targets is built from a typed value", which is false.**
  `showExerciseForm()` builds a YouTube search URL from the exercise name, and the app's own comment
  two lines above says that name "comes from wger, from a Hevy import, or from a custom exercise
  somebody typed". It is `encodeURIComponent`-escaped, so it is not an injection — but a typed
  string does reach an external search engine in the system browser, and the honest answer to the
  questionnaire should be given knowing that.
- **User-Generated Content → ⚠️ NOT a flat "No" any more. Read this before you answer it.**
  This doc used to say *"Nothing a user writes is visible to any other user."* As written, that is no
  longer true. `shared_library` is a crowd-sourced exercise/food table: `contributeToSharedLibrary()`
  is called from `22-train-deep.js:58` with a **user-typed exercise name** and from
  `14-nourish.js:3524` with a food name, and `pullSharedLibrary()` reads other people's rows into
  every user's app.
  **Both of them can be the person's own typing, not one.** The food name is `wf.name`, which is
  built as `p.name || query` (`14-nourish.js:1976`) — so when the web lookup returns no name, what
  gets published is **the search text the person typed**. An earlier draft of this section called it
  "a web-looked-up food name", which is true only when the lookup succeeds. The food one does at
  least require an explicit tap on a "Share" button; the exercise one does not.

  What makes it answerable without alarm is that it is **pre-moderated, and the moderation is
  enforced by the database, not by the UI** — verified live against this project's RLS on 10 Oct 2026:
  - **INSERT** (`authenticated`) carries `WITH CHECK (coalesce(approved,false) = false)` — Postgres
    itself *refuses* a contribution that arrives pre-approved.
  - **SELECT** (`anon,authenticated`) is `approved = true AND coalesce(flagged,false) = false`.
  - **UPDATE** and **DELETE** are restricted to the three owner emails. Approving is not something a
    user can do, even with a request aimed straight at the API past the `DEV_EMAILS` UI gate.

  So a person can submit an exercise name and it reaches nobody until you approve it. There are no
  profiles, no author attribution, no messages, no comments, no user-cast votes, and nothing else a
  person writes — journals, letters, why, identity, vice names, prayers, check-ins — ever leaves
  their own row. Answer the question with that shape in front of you rather than a bare yes or no,
  and note there is **no user-facing "report content" control** (the `flagged` column is admin-only),
  which is defensible precisely because nothing is visible until a human has already reviewed it.

  One leak of exactly this kind has already happened and been fixed: `_companionSay()` used to
  publish the person's own words for what they were fighting into `shared_library`, filed as an
  exercise. The comment at `06-train.js:257` records it. **If you ever add a third contributor to
  that table, re-read this section before you ship it.**

> **Do not pre-commit to a tier.** These docs previously predicted "12+", and Apple has since revised
> its age bands and added capability questions. Whatever the questionnaire shows you when you open it
> is authoritative — answer it honestly, question by question, and take the tier it computes. Never
> set a tier lower than the answers produce: being corrected costs a review cycle, and an
> under-declared rating can get an app pulled later.
---

## What the simulator settled (10 Oct 2026, v610, build 9)

Driven on the REAL Capacitor build on a booted iPhone 17 Pro — `node scripts/app-shot.mjs install`
then `launch`, taps through the iOS Simulator control tool. Not Safari, not Chromium.
**One honest caveat: `app-shot.mjs` builds `-configuration Debug`** (`scripts/app-shot.mjs:39`),
while the artefact verified further up this file is Release. Same web bundle, same plugins, same
Swift; different optimisation and entitlements. It is the shipping *app*, not the shipping *build*.

**FACE ID — the whole cycle, verified.** Capability detection resolved to "Face ID" with a live
toggle; tapping it raised the system Face ID sheet carrying the app's OWN reason string ("Turn on the
lock for ToTry"); a match committed the setting and toasted "Lock on"; backgrounding and returning
after a real absence **covered the content and demanded Face ID**, with nothing of the journal
visible behind it; a match unlocked it to exactly where it had been; and turning the lock back OFF
demanded the same proof again, which is deliberate — so grabbing an open phone cannot quietly remove
the protection.

**NOTIFICATIONS — permission, scheduling and delivery, verified ON THE PATH THAT SHIPS.**
An earlier draft of this section claimed two things that were false, and both were caught by
review rather than by any check:
- It said the "even when the app is closed" toast "only prints for a schedule the plugin actually
  CONFIRMED". It does not. `28-init.js:88` calls `_scheduleNativeReminders(prefs)` with **no
  `await`**, and the toast fires unconditionally two lines later. That sentence was the entire
  load-bearing evidence for "scheduling verified", and it was wrong.
- The delivery it showed came from `xcrun simctl push`, which injects an **APNs-shaped REMOTE**
  payload. This app has no remote path at all — `@capacitor/local-notifications` only, and
  `02-native.js` says so in its own words: *"remote push is not something this app does — every
  nudge it sends is scheduled on-device."* So the test exercised a path the app does not use.

Re-done properly on 10 Oct 2026, against the local scheduler: the morning reminder was set to a
time **six minutes out**, saved, and the app backgrounded. What is now actually established is
permission (the real iOS alert), scheduling (`PendingNotifications.plist` and `Schedule.plist`
written in iOS's own store the moment Save was tapped), and **delivery of the app's own scheduled
LOCAL notification at its trigger time** — `"A quiet minute to set your intention for today."`, the
literal body from `_scheduleNativeReminders`, found in iOS's `DeliveredNotifications.plist`.

**A screenshot could not have shown this and nearly said the opposite.** A banner auto-dismisses in
a few seconds, so the capture one minute after the trigger was an empty home screen — which reads
exactly like a notification that never fired. The store is the evidence; the banner is not:
`~/Library/Developer/CoreSimulator/Devices/<udid>/data/Library/UserNotifications/*/DeliveredNotifications.plist`,
read with `plutil -p`. It holds both this run's local notification AND the earlier remote push, and
they are distinguishable by body — which is what makes the distinction above checkable rather than
asserted.

**Still NOT verified** and deliberately not claimed: the quiet-hours suppression, the reach-out
nudge's "at most 3 a week" throttle, and anything that depends on the device being asleep.

**Three ways this test lies, each met while running it** — every one of them looks like an app defect:
- **Face ID enrollment does not survive a simulator reboot.** It was enrolled, the simulator was
  shut down to free memory for the archive, and on reboot `notifyutil -g
  com.apple.BiometricKit.enrollmentChanged` read **0** again. Re-enrolling while the app was already
  running was not enough either — the toggle still fell through to the passcode screen, and only a
  relaunch produced the Face ID sheet. **The mechanism is NOT "the app reads capability at launch":**
  `renderLockRow()` awaits `Lock.capability()` on every render (`07-platform.js:202`), so that
  explanation — which an earlier draft of this file asserted — is contradicted by the code. The
  caching is somewhere below the web layer (an `LAContext` is documented to cache its evaluation
  state) and was not pinned down. The INSTRUCTION is what was measured, so take it and not the
  reason: enroll, THEN launch, and read the value back rather than assuming the set worked.
- **A fast HOME-and-back does NOT lock, and that is correct.** There is a documented 2500 ms grace
  window, because the share sheet, the barcode scanner and permission prompts all hide the web view
  too. The first return was inside it and the app opened straight up — which reads exactly like "the
  lock does not work". Wait longer than 2.5 s or you will report a bug that is a feature.
- **`simctl push` to a FOREGROUND app shows nothing.** iOS suppresses banners for the active app.
  The first push looked like a dead notification path; backgrounding the app first produced the
  banner immediately.

`xcrun simctl spawn <udid> notifyutil -p com.apple.BiometricKit_Sim.pearl.match` is the match;
`…enrollmentChanged` with `-s 1` then `-p` is the enrollment.

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
