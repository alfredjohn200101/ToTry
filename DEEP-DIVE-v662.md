# DEEP DIVE — v662, days before submission

> The question asked: *"ensure everything we have planned for this app is actually present before we
> send it off for review."*
>
> Method: six lenses driven in **WebKit** (the engine WKWebView and every Apple PWA user runs) against
> the shipped bundle, every finding sent to two refuters told to default to refuted, then the ones that
> survived re-measured by hand. Every item below has a reproduction. Where a measurement is inferred
> rather than executed, it says so.

---

## 1. THE ANSWER IN THREE LINES

**No — do not upload the staged archive.** The breathing bug you reported is genuinely fixed in v662,
and the overwhelming majority of what is planned is present and works (section 5 is long, and that is
the real answer to your question).

**But the app does not back up anything on an iPhone, and never has.** `enableSyncMonitoring()` overrides
`localStorage.setItem` on the *instance*, which silently does nothing in WebKit — so ~168 of 178 synced
keys never reach the cloud, and worse, a stale cloud copy **overwrites fresh local data** on every open.
It is live in production right now and it is inside the IPA staged for upload. One line fixes it.

**The archive is also v661** — it predates the breathing fix — so the correct order is: fix the sync
monitor, bump, build, sync, re-cut, then upload. Re-cutting at v662 first would ship a build that fixes
the breathing and still backs up nothing.

---

## 2. SHIP-BLOCKERS

### 2.1 — The cloud sync monitor is a silent no-op on WebKit: nothing uploads, and stale cloud data overwrites fresh local data

**Who hits it:** every iOS app user and every Safari/iOS PWA user, on 100% of launches. No setting, no
path, no particular action. Live in production and inside the staged IPA.

**What a person experiences, in increasing order of harm:**

1. **Nothing they do is backed up.** They use ToTry for months — journal, weigh-ins, food, vices,
   prayers, their "why", their identity — change phone or reinstall, and it is gone. Only 10 keys have an
   explicit keyed `syncToCloud(key, value)` call and survive (`totry_h`, `totry_workouts`,
   `totry_trackers`, `totry_routines`, `totry_restarts`, `totry_strava_token`, `totry_hevy_api_key`,
   `totry_hevy_synced_once`, `totry_journey_start`, `totry_first_start`). The other ~168 reach the cloud
   only through the dead monitor.
2. **Fresh local data is replaced by old cloud data.** The monitor is the only writer of
   `totry_key_ts`, so every key's local timestamp reads 0, `const lts = tsMap[k] || 0` makes
   `cts >= lts` true for every cloud row, and the cloud wins every merge.
3. **The app tells them it is safe.** The outbox is always empty, so `__syncState.pending` is always 0
   and the "Not fully synced" warning can never appear on an iPhone.

**Reproduction — root cause**, three variants on a blank page (`verify/rootcause.mjs`, `verify/proto.mjs`):

| form | WebKit | Chromium |
|---|---|---|
| `localStorage.setItem = fn` *(what the code does)* | **override never runs**; `setItem` stays `[native code]`; writes a junk storage entry named `setItem` | works |
| `Object.defineProperty(localStorage,'setItem',…)` | also never runs | works |
| `Storage.prototype.setItem = fn` *(the fix)* | **works** | **works** |

`Storage` is a legacy platform object with a named-property setter, so in WebKit assigning a
non-own property name is treated as `localStorage.setItem('setItem', String(fn))` — it writes a storage
*entry* and leaves the prototype method in place. Nothing throws in either engine.

**Reproduction — end to end on the real bundle** (`verify/outbox.mjs`, WebKit + Chromium, seeded):

```
                                   WEBKIT          CHROMIUM
setItem is [native code]           true            false
CALIB explicit keyed syncToCloud   ['totry_workouts']  ['totry_workouts']   <- control, queues in BOTH
setWaterCount/ls(journal)/ls(why)  outbox []       outbox [water, journal, why]
                                   key_ts []       key_ts [water, journal, why]
local value survived               yes             yes      <- why nothing looks wrong
junk 'setItem' storage entry       686 bytes       null
argument-less syncToCloud()        queues nothing  queues nothing
SYNC_KEYS length                   178             178
```

The calibration is what makes this a finding rather than a blind probe: an explicit keyed
`syncToCloud` **does** queue in WebKit, so the probe can see the outbox. Three real write sites queue nothing.

**Reproduction — the clobber** (`verify/clobber3.mjs`, driving the real `pullFromCloud()`):

```
person writes their why NOW through ls(); cloud row is 3 days old
                            WEBKIT                               CHROMIUM
CALIB merge reached         true                                 true
keyTsRecorded               0                                    1793106498168
outbox has the key          false                                true
after pull                  "(an old answer from another device)"  "I want to be there for my daughter"
CLOBBERED                   TRUE                                 false
```

**Honest note on this one: three of my own probes lied first, all understating it.** The first used
`key`/`value` where rows are `data_key`/`data_value`, so every row was skipped by the
`SYNC_KEYS.indexOf(k) === -1` guard. The second had the same flaw. The third set `window.sb`, but `sb` is
`let sb = null` at `00-boot.js:912` — a top-level `let` lives in the global lexical environment and is
absent from `window`, so `pullFromCloud` read a still-null `sb` and returned at its first line. All three
reported "no clobber". The run above asserts `CALIB_mergeReached` (local empty ⇒ cloud value adopted)
before believing anything.

**Cause:** `src/app/01-sync.js:249`. The guard makes it worse rather than better:
`_originalSetItem = localStorage.setItem.bind(localStorage)` on line 248 *succeeds* (it binds the native),
so `if(_originalSetItem) return` is satisfied and the function reports itself enabled. Every later
consumer that asks `if(_originalSetItem)` — `pullFromCloud:753`, `00-boot.js:656` — gets a working native
function and behaves correctly, giving no hint the queueing half is dead.

There is no backstop: no iteration of `SYNC_KEYS` and no bulk-push path exists anywhere, so sign-in does
not upload history either — a guest who uses the app for weeks and then creates an account uploads nothing.

**Why the gate is green over it:** `npm test` asserts source patterns; panels, personas and crisis all
launch Chromium, where this code is correct. `npm run engines` is the only WebKit suite and it only
compares day keys. Nothing anywhere asserts that a write reaches the outbox on the engine that ships.

**Fix** — override on the prototype, the only form that works in both engines (measured):

```js
if(_originalSetItem) return;
const _nativeSet = Storage.prototype.setItem;      // capture BEFORE overriding
_originalSetItem = function(k, v){ _nativeSet.call(localStorage, k, v); };
Storage.prototype.setItem = function(key, value){
  _nativeSet.call(this, key, value);
  if(this !== localStorage) return;                // the prototype is shared with sessionStorage
  if(SYNC_KEYS.includes(key)){ /* existing body */ }
};
```

Three things to get right: capture the native from the prototype before assigning or you bind the
override to itself; keep the `this !== localStorage` guard (my probe measured `ran:2` without it —
`sessionStorage` writes would queue too); and `_originalSetItem` must stay a function that writes past
the monitor, because `pullFromCloud:753` and `00-boot.js:656` rely on exactly that. Also
`localStorage.removeItem('setItem')` once at boot, to clear the 686-byte junk entry already sitting in
every existing Apple user's storage.

**Test it in WebKit** — a Chromium assertion cannot fail on this. The assertion that can fail is
behavioural: boot, `ls('totry_journal', …)`, require `totry_sync_outbox` to contain that key.
Fault-inject by restoring the instance assignment and requiring WebKit to go red while Chromium stays
green; that divergence is the whole defect.

**Related, same class, currently inert:** `src/app/00-boot.js:27` does the same instance assignment
behind `TEST_MODE`. If anyone ever flips that flag, the test build's isolation silently fails on iOS and
the test app writes to the real keys. A sweep for assignments to methods of `localStorage`/
`sessionStorage`/`navigator`/`history`/`location` across all of `src/` returns exactly these two hits, so
the failure class is bounded.

**Separate latent defect found alongside it:** 78 `syncToCloud()` calls pass **no arguments at all**, so
they return at `if(!SYNC_KEYS.includes(key)) return` and queue nothing **in either engine** (measured).
They were clearly written as "push this now". Harmless once the monitor works, but they are 78 sites
where the stated intent is not delivered, and they are the reason nothing backstopped this.

---

### 2.2 — The archive staged for upload is v661, and the live PWA is v661 too

**What a person experiences:** a reviewer or early user with Reduce Motion on opens guided breathing —
Soul tab, Feeling Door, morning ritual, SOS path — and the orb does not breathe. It snaps between two
sizes. This is exactly what you reported. It is fixed at v662 and **absent from the build staged for upload.**

**Reproduction — measured against the bytes of the IPA, not inferred:**

```
unzip ~/Library/Developer/Xcode/ToTry-current-build/ToTry-v661-build10.ipa
grep -o "const APP_VERSION = '[^']*'" Payload/ToTry.app/public/index.html   -> v661
grep -c 'not(.b-orb)' Payload/ToTry.app/public/index.html                   -> 0
grep -c 'Storage.prototype.setItem' …                                      -> 0
```

And the live PWA:
```
curl -s https://alfredjohn200101.github.io/ToTry/index.html | grep APP_VERSION  -> v661
```
So this is **not only a staging problem** — every Safari/iOS PWA user with Reduce Motion on has the
snapping orb today. A `build:www` + deploy is a separate and already-overdue action.

**Cause:** v662 (`24cee8a`) landed after the archive was cut (`467fee9`) and nobody re-cut.
`npm run preflight` *does* notice — it prints `! 1 archive(s) stamped build 10 do NOT carry the current
bundle` — but as a **warning** under a verdict line that still reads "ready to archive", while
`SUBMIT-CHECKLIST.md:6` says `ARCHIVE CUT AND VERIFIED. ONLY THE UPLOAD IS LEFT.` The check that works is
the one most likely to be scrolled past, and the document a human reads says the opposite.

**Fix, in this order** (the sequencing is the point — nobody stated it before):
1. Fix 2.1 (the sync monitor).
2. `npm run build:index && npm run build:www && npm run sync`.
3. Confirm preflight no longer warns about a stale archive.
4. Archive, export, and verify `APP_VERSION` **inside the IPA** reads v662 and
   `grep -c 'not(.b-orb)'` returns 1.
5. Move `ToTry-v661.xcarchive` out of `~/Library/Developer/Xcode/Archives/` first — Organizer shows the
   name and date and never which bundle is inside, which is how a stale archive becomes a hazard.
6. Deploy the PWA.
7. Correct `SUBMIT-CHECKLIST.md:6`.

Build 10 is still free — v661 was never uploaded — so no build-number bump is needed.

---

### 2.3 — Settings → "Help & FAQ" does nothing in the native app, with an unreachable fallback

**What a person experiences:** they tap the row labelled *"Help & FAQ — Export or delete your data,
reminders, and how to reach a human"* and **nothing happens at all.** No page, no sheet, no toast, no
error. On the web PWA the same row works — so the defect exists only in the build going to review, and
it is the row the app designates as the route to reaching a person. An App Review tester plausibly taps it.

**Reproduction** — four links, three measured:
1. `src/app/26-share.js:616-619` is the whole function:
   `try{ window.open('support.html','_blank','noopener'); } catch(_){ try{ location.href='support.html'; }catch(__){} }`
2. The URL is **relative**. Capacitor serves from `capacitor://localhost`, so it resolves to
   `capacitor://localhost/support.html` (measured in WebKit:
   `new URL('support.html','capacitor://localhost/index.html').href`).
3. `@capacitor/ios/.../WebViewDelegationHandler.swift:328-333` is the only `_blank` handler (the app
   declares no `WKUIDelegate` override): it calls `UIApplication.shared.open(url, …)` with a **nil**
   completion handler. No bundle declares the scheme — PlistBuddy over all 17 `Info.plist` files under
   `ios/` reports no `CFBundleURLTypes` anywhere — so iOS has nothing to hand `capacitor://` to, and the
   nil handler makes the failure silent.
4. **The fallback cannot save it:** `window.open` signals failure by returning **null**, not by throwing,
   so the `catch` block and its `location.href` fallback are unreachable (measured with a stub that
   returns null — not caught; a stub that throws — caught).

**Scope — this is a single site, not a class.** I censused every `window.open` target in `src/`:
`'support.html'` is the **only relative one**. Every other is an absolute http(s) URL or a variable
holding one (`app.web`, `app.store`, `ca.store`, `url`, `u`, `st`, the YouTube search, strava.com), all of
which `UIApplication.shared.open` handles correctly. Fix it in place; there is nothing to sweep.

**Limit stated honestly:** the final hop is **inferred, not executed**. There is no booted simulator on
this machine, so I could not run `UIApplication.shared.open` on an unregistered scheme and watch it do
nothing. Everything up to that call is measured. **One tap on the row in a simulator build settles it in
seconds** — worth doing before upload.

**Not a 5.1.1(v) problem:** `exportBackup` and `deleteAccount` both exist and are reachable in Settings
independently of this row, so account deletion and data export are not gated behind it. The row's
subtitle promising those things is bad copy on a dead row, but the App Review requirement is met elsewhere.

**Fix** — both halves, copying the correct form the repo already has at `35-strava.js:135-136`:
use an absolute `https://alfredjohn200101.github.io/ToTry/support.html` when `isNativeApp()`
(`27-settings.js:1353`) and keep the relative path for the PWA; and change the guard from catch-only to
`if(!w){ location.href = u; }`.

---

### 2.4 — The SOS breathing circle is motionless through the whole first "Breathe in…"

**Promoted above the Reduce Motion items by both refuters, and I agree.** It needs **no setting**, it is
on the **SOS crisis path**, and it hits the **first eight seconds of every entry** — not just the first of
a session, because `_sosBreathStop()` clears the transform so every re-entry replays it. The person most
exposed is the one opening that screen for the first time mid-urge. It is the closest thing in this whole
set to your literal report.

**What a person experiences:** the screen says "Breathe in…" and the circle is **already at its largest
and completely still.** It stays still for the 4-second inhale and the 4-second hold. The first movement
they ever see is it **shrinking**, at "Breathe out slowly…". From cycle two it is perfect.

The module's own comment four lines above sets the standard it fails:
> *"Being told to exhale while the visual says inhale does not just fail to help — it breaks the one
> thing they came here able to follow."*

**Reproduction** (`verify/sos.mjs`, WebKit 393×852, seeded, driven with real taps — `startLiveIntervention(0)`
→ `setLocation` → `goSosP2`, asserting `#sos-overlay` computes `display:block`):

```
reducedMotion=off    label "Breathe in…"  computedTransition 4s,4s  distinctWidths 1
                     samples [[9,96],[141,96],[272,96],[404,96],[537,96],[668,96]]
reducedMotion=reduce label "Breathe in…"  computedTransition 4s,4s  distinctWidths 1
```

96px is the `scale(1.5)` **end** state, present at t=9ms. **Identical under both motion settings — this is
not a Reduce Motion bug.** Note the computed duration reads a correct `4s` while the circle sits still,
so a style-reading check passes on the broken code.

**Isolation proving the cause:** calling `goSosP2()` a second time, when `#sos-p2` is already displayed
and after one `requestAnimationFrame`, gives a smooth 64→78px inhale (24+ distinct widths). Same
function, same setting; the only difference is whether the element was `display:none` when the first
transform landed. **It reproduces in Chromium too** (1 distinct width first entry, 227 on re-entry), so
the Chromium-only gate could have caught this.

**Cause:** `src/app/04-fight.js:2275` — `goSosP2()` calls `showSosPhase(2)`, which takes `#sos-p2` from
`display:none` to displayed, then calls `step()` **in the same JS tick**. `step()` (2328-2331) sets
`circle.style.transition` and `transform='scale(1.5)'` together. A CSS transition cannot start on an
element that had no rendered state at the previous style resolution, so WebKit takes `scale(1.5)` as the
*starting* value and there is nothing to interpolate. `.b-orb` escapes this because its overlay is shown
before `startBreathing()` runs. Adding a stylesheet `transform:scale(1)` alone does **not** fix it
(tested) — the problem is the display change, not a missing start value.

**Fix** — one style flush between the unhide and the first transform:
```js
circle.style.transform='scale(1)'; void circle.offsetWidth; requestAnimationFrame(step);
```
Measured to produce a correct 64→78px inhale. Keep `_sosBreathStop()`'s reset as it is.

**Test it on distinct rendered widths** (≥10 over the 4s inhale), **not** on `transitionDuration` — the
computed duration was already 4s while the circle sat still.

---

### 2.5 — Reduce Motion empties the SOS 30-second "sit with this" bar

The **same rule and same crisis path** as the v662 breathing bug, one surface short of the fix.

**What a person experiences:** on SOS step 3 of 3 ("Face the truth"), mid-urge, they are shown a hard
question, their own "why", a progress bar and the words *"Sit with this for 30 seconds…"*. With Reduce
Motion on the bar is **a flat empty grey track from the first frame.** Five seconds in it measures **0 of
353px** while the label directly beneath it reads **"Sit with this... 25s"** — a bar that says finished
sitting next to text saying 25 seconds remain. Directly below are the three outcome buttons: *"I beat it
— log the win"*, *"I need to talk to my coach"*, *"I gave in — log it honestly"*. The one visual telling
them the wave is passing is gone at the exact moment they decide whether they held.

**Reproduction** (`verify/sos.mjs`, same run, `#sos-p3` asserted `.active`, wrap asserted 353px):

```
reducedMotion=off     computedTransition 30s        distinctWidths 32  width@5s 289.5px  label "25s"
reducedMotion=reduce  computedTransition 0.00005s   distinctWidths 1   width@5s 0px      label "25s"
```

**Cause:** `src/shell-head.html:868` —
`.sos-q-bar{…width:100%;transition:width 30s linear}` — and `src/app/04-fight.js:2375` sets
`bar.style.width='0%'` **exactly once**, so the 30-second CSS transition **is** the entire countdown.
The v662 rule at `src/shell-head.html:1756` reads
`*:not(.b-orb):not(#sos-breathe-circle):not(#feelingnow-breath), …{ transition-duration:.05ms!important }`.
`.sos-q-bar` is not exempt, and an author `!important` beats an inline style. Both the 30s transition and
the reduced-motion rule have been in the bundle since v479; v662 fixed three siblings and this is the
fourth. The per-second `setInterval` at 2376 keeps updating the **label**, which is why the two now
contradict each other on screen.

**This is the only one left.** A generic detector asking the browser for every element whose normal
computed transition/animation duration is ≥1.5s, walked over 10 tabs and 6 overlays, lists: `.b-orb`
KEPT, `#sos-breathe-circle` KEPT, `#sos-q-bar` **KILLED**, and three invisible sign-in `.pulsing`
elements. Independently, of 244 rules carrying `!important`, 37 touch a property JS sets inline for
function; all 37 were bucketed, and the only globally-scoped one that can reach a functional inline style
is this reduced-motion rule.

**Fix — two options, both one line.** Minimal and consistent with v662: add `:not(#sos-q-bar)` to the
selector at `shell-head.html:1756` (a linear progress indicator is not vestibular motion — the argument
the v662 comment already makes). **Better:** delete `transition:width 30s linear` and drive the bar from
the `setInterval` that already ticks the label
(`if(bar) bar.style.width=(secs/30*100)+'%'`). That is correct under both settings, keeps bar and label
on one clock by construction, and stays correct if the screen is backgrounded mid-urge.

Then add a test asserting the bar's width at t=5s under `reducedMotion` — this is the **second** time this
rule has silently deleted a crisis-path visual.

---

## 3. WORTH FIXING BEFORE REVIEW

### 3.1 — "Numbers off" still shows a calorie deficit and a protein figure on Grow

Someone who turned numbers off in Nourish — the app's own code calls this *"the person who turned counting
off because counting is the thing that hurt them"* — opens **Grow, one of the five primary nav tabs**, and
the "Your body · last 7 days" card states the exact figures the setting exists to hide.

**Reproduction** (`verify/gentle2.mjs`, WebKit, seeded + 21 days of food and 25 weigh-ins in the app's own
readable shapes, `totry_nut_gentle` true). Verbatim rendered card text:

> YOUR BODY · LAST 7 DAYS … 3 WORKOUTS 7/7 FUELLED 85.4kg −0.2KG · 3,493kg lifted · 7/7 days logged
> **Eating ~-231 cal/day vs your real burn → expect -0.2kg/wk; the scale says -0.2kg — your data agrees ✓.**
> THIS WEEK'S ONE ADJUSTMENT Hold the line — keep doing exactly this for another week.

The numbers-**on** arm renders `1,044 cal earned` on the Train tile; gentle mode **correctly suppresses
that one**, and the adjustment box correctly uses the gentle wording — while the line between them states
the deficit. The app's own brief to the model names this class verbatim: *"never state a calorie count,
macro gram figure, deficit, surplus or target number."*

**Calibration:** `window.__weekReadCtx` is set at the *end* of `renderBodySystemReport()`; my probe asserts
it is defined before believing any result, because the documented failure here is the function taking its
`domains<2` early return and rendering an empty-state preview — which reads as "no leak". It returned
`true`.

**Cause:** `src/app/14-nourish.js`. `const _gentleCard = nutGentle()` is declared at **6217** and consulted
at 6365, 6366 and 6384 — but **not at 6332** (the energy-balance verdict) nor at **6401**
(`' · protein '+gkg+'g/kg'`). Half-applied **inside one function**, whose own comment above the tile reads
*"GENTLE MODE REACHES THIS CARD TOO"*.

**One honest correction to the earlier reports:** the protein `g/kg` clause did **not** render in my run
(`gkg` was null for my seeded intake), so I measured the `cal/day` leak directly and the protein line is
ungated **in source** plus measured by two other lenses. The exact figures are data-dependent; the leaked
token *classes* are what matter. The `cal/day` gate is `lowConf === false`, i.e. `daysLogged >= 4` plus a
computable adaptive TDEE and a week-over-week change — **reachable inside a week of honest use**, not the
"~3 weeks" first claimed. The protein clause needs only food plus a weight, so it reaches essentially any
gentle-mode user.

**Fix:** gate both on the `_gentleCard` already in scope, the way the `adjust` cascade beside them does —
say the shape, not the figure. Drop the `· protein Ng/kg` clause entirely under gentle (the adjustment box
already carries the instruction). For 6332, something like *"You are eating a little under what this goal
needs — your own data and the scale agree"* keeps the whole point of the verdict without stating the
balance. Test at **both** data levels (thin: `gkg` only; three-week: verdict too) — the thin seed alone
cannot reach 6332, which is why this survived.

### 3.2 — The "Cal AI" row opens a dead App Store page and persists the dead URL

On Train → "Choose your calorie app" → Cal AI. If they do not already have it installed, the app waits
1.2s and opens an Apple page saying the app is unavailable. The dead address is **saved as their chosen
calorie app**, so the calorie row does the same thing every time afterwards, with no way to correct it
short of picking a different app.

**Reproduction:** Apple's lookup API is the reliable evidence (**not** curl status codes — both live and
dead `apps.apple.com` URLs stop at a 301 to `itms-apps://`, so the status cannot distinguish them):
```
itunes.apple.com/lookup?id=6447167650&country=au  -> resultCount 0     (the id in the app)
itunes.apple.com/lookup?id=6480417616&country=au  -> 1, "Cal AI - Calorie Tracker"
itunes.apple.com/lookup?id=341232718&country=au   -> 1, "MyFitnessPal" (control, proves the method)
```
Driven on the real DOM button `[onclick*="setCalApp"]`: `window.open` called with the dead URL, and
`totry_ca` written with it; `openLinkedCalApp()` afterwards opens the same URL again.

**Cause — a half-applied removal.** `APP_REGISTRY`'s own comment at `34-settings-apps.js:20-21` says
*"Removed: JEFIT, Cal AI, Yazio, Lose It, MacroFactor, Cronometer, Samsung Health … all just opened the App
Store with no real integration"* — but the removal reached the registry only. The static picker row at
`src/shell-head.html:5968` still hardcodes its own copy of the id. **Cronometer is on the same "Removed"
list and also still hardcoded** (`shell-head.html:5969`), but its id resolves, so only CalAI's link is dead.

**Fix:** cheapest correct option is to delete the CalAI row from the static picker, which is what the
registry already decided; the picker still offers MyFitnessPal, Cronometer and ToTry's own tracker. If it
stays, correct the id to 6480417616 and verify with the lookup API. A guard in `setCalApp` that refuses to
persist an unverified store URL would stop one wrong link becoming a permanent one.

**Free while you are in there (not user-facing today):** Hevy's registry id `1388737828` is also dead
(real id 1458862350). No UI path reaches it — `34-settings-apps.js:111-118` always returns early for
`hevy` — but it becomes live the moment that early return is removed, and because `store` is truthy it
would displace the working `web:'https://hevy.com'` fallback sitting beside it.

### 3.3 — Landscape clips the guided-breathing screen, with nothing to scroll

`Info.plist` declares `LandscapeLeft`/`LandscapeRight` for iPhone and there is **no orientation lock in the
native shell** — I verified the only `supportedInterfaceOrientations` override is inside
`BarcodeScannerPlugin.swift:742`, which locks the scanner's own view controller, not the app. So a person
lying down, or a reviewer rotating the device, gets landscape.

**Reproduction** (`devlens/r7.mjs` per-viewport, `r2.mjs` reachability via `elementFromPoint` at each
control's own centre):

| viewport | overflow top/bottom | "Change breath" |
|---|---|---|
| 393×852 portrait | 0 / 0 | fine |
| 852×393 | 11 / 11 | clipped, **still owns its centre** |
| 844×390 | 12 / 12 | clipped, still tappable |
| 667×375 (SE) | 20 / 20 | **centre at y=376 in a 375px viewport — genuinely untappable** |
| 932×430 | clean | fine |

`.b-run` is 414px in a 393px viewport and `.breath-overlay` computes `overflow-y:visible` with
scrollHeight 404 / clientHeight 393 — **not scrollable**.

**Corrections to the earlier report:** the protocol name is cut *entirely* only on SE (at 852×393 about
5px of a 15px line remains — unreadable, not absent), and "Change breath" is untappable only at 667×375.
The orb, phase words, count and close button stay usable throughout, so this costs the heading and one
control, never the exercise. The claim that iOS additionally takes ~21px for the landscape home indicator
is a reasonable inference I **could not measure** (Playwright reports `env(safe-area-inset-*)` as 0) —
treat the real-device cut as *at least* these numbers.

**Cause:** `src/app/05-moment.js:1599` sets the overlay's cssText with `justify-content:center` and **no
overflow rule**, so overflow is split evenly between top and bottom and neither half can be reached. The
landscape block at `shell-head.html:1587` only adjusts `.hdr` and `.tab`.

**Fix — the cheapest option is probably the right one:** if the app is portrait-first (which the whole
layout implies — one centred column, a floating tab capsule, an overlay that cannot scroll), **drop
`LandscapeLeft`/`LandscapeRight` from `UISupportedInterfaceOrientations`**. That is one line and it closes
this and the side-safe-area question together. Otherwise: add `overflow-y:auto` to the overlay's cssText
and `justify-content:flex-start` under the existing landscape media query.

---

## 4. AFTER REVIEW

### 4.1 — The companion's CBT cognitive-restructuring mechanism can never be selected
Someone names the thought making it feel okay — *"Just once won't matter"* — and gets 5-4-3-2-1 grounding.
The mechanism written for exactly that sentence (*"is it actually TRUE? Has 'just once' ever stayed just
once?"*) is unreachable. The AI is also briefed on the wrong technique for the rest of the conversation.
CLAUDE.md lists it as one of the companion's four clinical mechanisms and the spine calls it *"the most
evidence-backed technique"*.

**Reproduction:** `_mechanismForType()` over every string `classifyVice` can return plus
general/overthinking/anxiety/''/null/undefined yields exactly `["interrupt","wave","ground","defuse"]` —
`reframe` is not in the image. Driving the real `_beginCompanion()`: Porn→"Breaking the loop",
Beer→"Riding the wave", Overthinking→"Stepping back from the thought", *"Just once won't matter"*→"Coming
back to now". **Calibration:** setting `_compStruggle.mechanism='reframe'` by hand returns the correct
spine, so the content is wired and renders — only the selector cannot reach it. `_compManualMechanism`
(04-fight.js:2553) is only ever *reset* to null and never set, so there is no second route either.

**Cause:** `04-fight.js:2540` is a hardcoded if-chain that duplicates the mapping
`COMPANION_MECHANISMS[*].forTypes` already declares — and the two have diverged. `forTypes` has **zero
readers** in the bundle. A key-level grep clears this falsely, because `'reframe'` appears as an unrelated
id in the toolkit at `05-moment.js:672`.

**Fix:** read the `forTypes` the registry already declares (or delete it), and assert that every key in
`COMPANION_MECHANISMS` is in the image of the selector. Nobody currently gets *nothing* — they get a
different real clinical mechanism — which is why this is post-review.

### 4.2 — `brotherSpeaks` has a fourth threshold for money that nothing calls
Money is one of the four pillars and the only one with no threshold voice. A person with debt on screen
logs an $1,800 expense and gets a grey "Logged" toast. The line exists and is complete.
**Reproduction:** `brotherSpeaks({kind:'spendHeavy'})` by hand renders the full card, so the branch works;
`grep -rno "brotherSpeaks({[^}]*kind:'[a-zA-Z]*'" src/` returns exactly three call sites (viceOver,
trainTired, calorieOver) and no dynamic `kind`. `03-person.js:10` declares the contract including
`'spendHeavy'`; `03-person.js:435` holds the branch. **This is an unbuilt feature, not a defect** —
nothing a person sees is wrong — so it is a roadmap item, and it is the honest answer to "is everything we
planned present": this one is not.
**Fix:** wire it from `saveTransaction` **after** the row is persisted (so a threshold can never cost
someone their entry), triggered on an expense large relative to their own `monthlyPaymentRate()` rather
than a hardcoded figure, with silence for a brand-new person. Or delete the branch and the fourth kind
from the line-10 contract together. Either way, say which in the comment.

### 4.3 — Faith level "light" is ignored by the urge SOS, which leads with scripture
**This is a product decision, not a bug — your call, not a fix to apply.** Step 2 of 3 *is* the "Receive
the word" step, so honouring the dial means deciding what replaces a whole step of a crisis flow, and
getting it wrong leaves a mid-urge person on an empty screen.
**Reproduction:** across all four traditions × both levels, 8 of 8 rows return a byte-identical verse.
**Calibration:** in the same run `_breathFaithOn()` correctly returns false at light and the breath menu
drops the Jesus Prayer protocol — so the level *is* honoured elsewhere on that page.
Tradition routing there is correct and good (Qur'an 26:80, Dhammapada 100, Marcus Aurelius, and the step
label varies too), so a **secular** person at light already gets Meditations — the gap bites only a person
*of* a tradition who turned their own dial down. `_sosAnchor(pb)` (04-fight.js:2256) branches on
`faithTradition()` and never reads `faithLevel()`. The precedent to follow when you do it is
`11-scripture.js:431`, which gates the unprompted scripture moment on exactly this, and whose comment
describes this same shape.

### 4.4 — Universal search drops a non-Christian onto the Christian scripture screen
A Muslim/Buddhist/Hindu/secular person saves a passage from their own reader (`totry_sv` is shared, and
`_planCarry` writes it for every tradition), searches for it, taps the result, and lands on `tab-bible` —
"Scripture / The Word" with "Find a Verse · Read · Saved · Prayer". Their passage displays correctly, so
it is somebody else's screen rather than an empty one. If they then tap "Find a Verse", `findVerse()` is
tradition-blind: driven **offline** so no model was involved, all four traditions returned the identical
8 ESV verses. The topic chips are shared too, so a Buddhist is offered "Fear of judgement".
**Reachability is the discount** (a saved passage + a search + two taps), and the two halves compound —
`findVerse` is only reachable for a non-Christian *because* the search routes them there.
**Cause:** `27-settings.js:1121` and `:1151` build the result onclicks as `go('bible');setBibleTab(…)`
with no tradition branch, while `openScripture()`, `openPrayerSection()`, `openMyBook()` and
`_planOpenFull()` all branch on `faithTradition()`. And `11-scripture.js:3` calls `api(BIBLE_SYS, …)`
with no tradition check, where `fetchSosVerse()` (04-fight.js:1969) does the opposite 60 lines away:
`if(faithTradition() !== 'christianity') return;`
**Fix:** route the two search onclicks through `openMyBook()`/`openPrayerSection()`, which already branch
— that closes the only reachable route with no new gating logic. Separately give `findVerse()` the same
early return `fetchSosVerse()` has. Worth asserting as a rule: every `go('bible')` outside a
`faithTradition()==='christianity'` branch is a defect, which is a grep a test can hold.
**Note for whoever verifies:** scope the probe read to `#search-results` — reading
`document.querySelector('.modal-bg.open')` returns a different open sheet and reports "does not route" for
all four traditions including the Christian control.

### 4.5 — The app ignores every text-size preference (whole type scale is in px)
`shell-head.html:149` declares the scale in absolute px (`--t-micro:11px … --t-2xl:34px`), so no root
font-size, browser minimum-font-size or OS text-size setting can move it. **Reproduction:** setting
`documentElement.style.fontSize` 16px→24px leaves a `.ios-row` at 17px and the document height unchanged,
while an appended `font-size:1rem` element in the same page measures 24px (calibration).
**Correctly not a submission blocker,** and **two mitigations** matter: the viewport meta sets no
`user-scalable=no` and no `maximum-scale`, and `capacitor.config.json` sets `ios.zoomEnabled: true` —
`CAPBridgeViewController.swift:322` installs Capacitor's pinch-*disabling* delegate only when that is
false, so pinch-zoom works in both the PWA and the native shell. That looks like a deliberate
accessibility choice already made. So a person who cannot read 13px has to pinch rather than being stuck.
iOS Dynamic Type does not reach px CSS in a WKWebView at all; the real fix is `font: -apple-system-body`
plus relative units throughout — **a redesign, not a patch. Do not attempt it before submission**; this
repo's own record on blanket sweeps is the reason.

### 4.6 — Two smaller items worth a decision, not a fix
- **The Cloud sync row is over-reassuring even on Chromium** (engine-independent, separate from 2.1):
  `renderSyncStatus` (01-sync.js:96) shows "Not fully synced · N changes waiting" **only** when
  `__syncState.status === 'error'`, and queueing a write does not set that status. Measured at 41 queued
  changes in Chromium with the row still reading "Saved to cloud · just now". On Chromium it is a window
  of up to the 20s retry interval; on WebKit it never resolves because the outbox is always empty.
- **`CONTEXTUAL_VERSES` targeting is unused:** `showVerseToast` is only ever called with `'pr'`, `'win'`,
  `'prayer_answered'` and `'fasting_milestone'`, so 9 of 13 context pools (loneliness, anger, fear, loss,
  overspend…) are never requested by name. The verses are not lost — `11-scripture.js:1129` flattens every
  pool into the fallback set — only the context-specific targeting is unused.

---

## 5. WHAT IS GENUINELY FINE

This is the other half of the answer, and it is the larger half. All of it was **driven**, not read, with
a calibration before each result was believed.

**Your reported bug is genuinely fixed.** All **nine** breath protocols animate under Reduce Motion in
WebKit (29–78 distinct rendered widths each, correct durations: settle 6s, sigh 6.5s, box 4s, cool 6s,
sleep 7s, prayer 5s, presence 6s, energize 0.5s, surf 6s). `#feelingnow-breath` runs `fnBreathe 8s` with
184 distinct widths under reduce. `#sos-breathe-circle` computes 4s under reduce. The control proves the
clamp still works: an ordinary planted div computes 0.00005s. Re-injecting the pre-v662 rule collapses the
orb to 2 widths, so the probe reproduces the original defect on demand. **The breathing census is complete,
not sampled** — only two elements in the bundle are scale-driven breathing visuals plus one CSS-animated
one; all three are exempt and all three were measured. There is no fourth breathing surface.

**Worth recording so nobody re-reports it as your bug:** `openBreath('energize')` and `openBreath('surf')`
return no overlay on the first tap — which looks exactly like "no orb came up". Driven end to end, that is
the intense-protocol safety gate working correctly: `_breathSafetyGate` renders a "One quick check" sheet
whose continue button owns its own centre, and after consent the orb appears and animates (76 and 178
distinct widths) even under Reduce Motion. **Not a defect.**

**Dead controls — none.** All **1316** inline handlers name a function that exists at runtime (675
distinct names asked of the booted app; the only 3 "missing" were the keywords `if`, `catch`, `function`).
**Zero** handlers fail to compile across 21 tabs — the check that would catch the spliced-tag class that
once killed the Height field. **Zero** element-id reads with no creator — the crisis-gate class, calibrated
by planting a read of an id nothing creates. **332 controls clicked** across 12 tabs: 200 mutated the DOM,
29 wrote storage, 83 navigated, **0 threw**; the 11 with no observable effect are all explained (hidden
file inputs, fields needing text first, and `openSupportPage`, which is finding 2.3). Zero duplicate
static ids (808 parsed), zero dead `go()` targets, zero dead `typeof X === 'function'` guards, no handler
called with a missing required argument, no settings switch writing a key nothing uses, and no static
section hidden at boot with no way to reveal it. The `URL` scope-chain shadow is fixed and nothing else of
its kind remains.

**The brand-new person with a completely empty store — could not be broken.** 20 tabs walked: 0 throws, 0
page errors, **0 occurrences of NaN/undefined/null/Infinity** in rendered text, no tab under 60 chars. The
guest button works and lands on the Feeling Door with no onboarding. The day-one-is-not-a-zero defect does
not reproduce: `getLifeState().brief` is 33 chars for a guest (*"Not much logged yet — early days."*), 194
onboarded-with-no-logs, 698 seeded — it scales rather than collapsing. Onboarding runs end to end, all 11
steps with real content, and `obBack()` lands on the correct previous step 10 of 10.

**Crisis paths.** `detectCrisis` is **engine-identical**: 3873 sentences from the gate's own corpora give
404 non-null in WebKit and 404 in Chromium, **zero divergences** — and the bundle contains no lookbehind at
all. The crisis card is **fully reachable in WebKit**, which no suite had ever checked (`npm run crisis` is
Chromium): plain `suicide` renders 7 links, 7 of 7 owning their own centre; the `medical+suicide` union
card renders 12, 12 of 12 owning their centre, in a scroller that scrolls. All 11 helplines own their
centre in portrait, **landscape and iPhone SE** too. Plain suicide still carries no emergency number; the
union card carries 000/911/999/111 plus the helplines. All 10 Feeling Door chips are hit-testable at their
own centre and land on real surfaces with real actions.

**Settings genuinely change behaviour.** Driven in both states: weight/distance units honoured on all 21
tabs **and converted at the source for the AI** (`Weight: 185.6lb`); gentle mode carries zero calorie or
macro figures through *every* AI prompt builder (brief, buildCtx, brotherSys, `_ptIntel`, nutPromptBlock) —
the leak is confined to the one rendered card in 3.1; all four theme combinations correct including
`--bg4`; "Count my usage" off emits **zero telemetry on the wire** (measured by intercepting requests, not
by reading the gate); cycle privacy strips the phase from both prompts; sex, currency, haptics all honoured;
all twelve non-default Settings values reflect correctly on return. Faith level light works on every
surface **except** the SOS (4.3), and faith tradition is correct across the ordinary surfaces. Share cards
carry no calorie, macro or body-weight figures, so neither gentle mode nor units can leak through canvas.

**Native specifics.** Every Capacitor plugin method the JS calls exists in the Swift (0 missing across 14
tabs + 26 feature drivers). HealthKit write types are complete and include `mindfulSession`, with
per-type `status()` so the single boolean cannot claim "On" over a type iOS was never asked about. Local
notifications arm **and cancel** in both directions — all twelve, including the bills and away nudges v650
could not take down — with tap routing registered once and `retainUntilConsumed:true` so a cold-launch tap
is not lost. Breath haptics are primed in the correct order (the v600 silent no-op is gone). The app lock
and privacy cover cannot drift. Nothing depends on the service worker natively. Export really writes a
file and treats a dismissal as a dismissal. All 7 usage descriptions present, HealthKit entitlement
present, iPhone-only. Web-vs-native rendering diverges only in Settings, where it should.

**Promised features present and working:** the woven week and its count (no streak); morning (5 steps) and
evening (8) rituals stepped, completed and re-entered; the scheduled reach-out nudges; the fast-season card
and mercy row across **all six** seasons with each tradition's own hand-off; giving/zakat per tradition;
reading plans for **all five** traditions with real passage text; the secular Soul tab with zero
chapter:verse anywhere; the Home depth fold correctly gated for a day-2 person; the orb reachable on 20 of
21 screens (hidden only on Coach, by the documented rule) and **not covered** — the repo's own calibrated
`orb-audit` reports 0, and my sweep's contrary result was my own contamination from leaving sheets open.
Of 1566 top-level functions, exactly **one** has no call site (`getUserCurrency`, an unused helper).

**Robustness and hygiene.** 870KB of localStorage (500 journal entries, 300 workouts, 400 days of food,
300 weigh-ins, 400 transactions): boot 1.76s, no throws, every tab renders — though Nourish takes 936ms to
render at that size on desktop-class WebKit, so expect noticeably longer on an older iPhone. Zero
low-contrast text runs across 15–20 screens in both appearances, calibrated with a planted
grey-on-grey element. `forced-colors` and `prefers-contrast` leave everything identical (neither exists on
iOS). Mid-session rotation is safe. `index.html`, `www/`, `ios/` and `android/` are **byte-identical** at
sha `ff71a31f70c7`, all v662, with `sw.js` CACHE bumped. `npm test` at HEAD: **4671 passed, 0 failed.**
All scripture and content APIs are live with the right shape at the real paths the code builds. Every
`tel:` number maps to a real service.

---

## 6. UNVERIFIED — named plainly

1. **The final hop of the Help & FAQ failure (2.3).** `UIApplication.shared.open` refusing an
   unregistered `capacitor://` scheme is **documented iOS behaviour plus a nil completion handler, not an
   executed measurement** — there is no booted simulator or installed build on this machine. Everything up
   to that call is measured. **One tap on the row in a simulator build settles it in seconds.**
2. **The side-by-side sync status-line quote.** The original finding quoted WebKit saying "Saved to cloud ·
   just now" against Chromium saying "Not fully synced · 5 changes waiting". I could not reproduce the
   Chromium half: `renderSyncStatus` only prints the warning when `status === 'error'`, and my attempts
   never reached an upsert because `flushOutbox` returns early on `!syncEnabled`. **The engine-specific
   half stands on its own** — `pending` is structurally 0 on WebKit, so that count can never be non-zero
   there — but do not rely on the quoted comparison as written. Needs a probe with a real signed-in session.
3. **The ~21px landscape home-indicator inset (3.3).** A reasonable inference; Playwright reports
   `env(safe-area-inset-*)` as 0, so treat the measured landscape cut as *at least* those numbers.
4. **The protein `g/kg` half of 3.1.** Ungated in source at `14-nourish.js:6401` and measured by two other
   lenses, but it did **not** render in my own run (`gkg` was null for my seeded intake). The `cal/day`
   leak beside it I measured directly and quote verbatim.
5. **Firefox is untested** (no binary on this machine). The 2.1 claim is scoped to **WebKit**, which is
   what WKWebView and every Apple PWA user runs. The failure may or may not extend to Gecko.
6. **One review lens errored out** (a content filter, generating crisis sentences at volume), so its
   false-positive sweep was done by hand instead: 77 sentences written fresh from the app's named fronts,
   none drawn from the corpus the fixes were tuned against. No new crisis false positives.

**Also worth recording — the refutation pass held this time.** 23 findings went to two refuters each: 23
survived with 2 live verdicts, 2 were refuted, **0 unrefuted**. So nothing here is certified by an agent
that never ran, which is a failure mode this repo has recorded before. Two sub-claims were **refuted and
dropped**: the 686-byte junk `setItem` entry does **not** reach the exported backup file
(`backupSafeKey` at `00-boot.js:105` requires a `totry_` prefix), and the 5.1.1(v) framing of 2.3 was
overstated.

*No repository file was modified except this one. `git status --porcelain` is otherwise empty; all probes
live under `/private/tmp/claude-501/deepdive/`.*
