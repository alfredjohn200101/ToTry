---
name: totry-probe
description: How to write a measurement in the ToTry repo that does not lie — calibration, the known instrument failure signatures, driving the real code path, seeding from the app's own write sites, and the test/harness.js contract. Use this skill BEFORE writing any probe, screenshot, audit script or one-off measurement, and ALWAYS when a measurement says the app is broken, a card renders empty, a value looks wrong, a suite reports something surprising, or a finding will not reproduce. Also use it when deciding whether to believe a result that CLEARS a concern.
---

# Before you believe a measurement

In this repo the instrument is wrong more often than the code, and it nearly always fails in the
same direction: **it says the app is broken.** Ten separate measurements lied in one session;
nine of them pointed at a defect that was not there, and the tenth cleared one that was.

So the governing habit is not "measure carefully". It is: **make the probe fail on purpose
first.** A probe that returns zero against broken code is blind, not clean.

## Calibrate, every time

Build the known-bad case into the probe and have it refuse to report when it cannot separate:

- Comparing two bundles? Run the OLD one first and require it to FAIL.
- Checking a guard? Plant the real defect and require it to be CAUGHT.
- Reading pixels? Measure a swatch whose value you know before looking at the app.
- Measuring an empty state? Prove the populated one differs.

When calibration fails, say so in those words — **"THE MEASUREMENT IS WRONG, NOT THE APP"** — and
stop. Reporting a plausible number from a broken instrument is how a real defect gets buried in
noise. A measurement tool's failure mode is a plausible number, not an error.

Be equally suspicious of a result that **clears** a finding. One tool in this repo nearly buried a
real cross-device data-loss bug by confidently clearing it.

## The failure signatures, and how each announces itself

These are all real, all from this repo. When your result matches one of these shapes, suspect the
probe before the app.

**The probe cannot reach the code path.** This produces exactly the same output as a missing fix —
an empty card, a blank reader, nothing on screen. Causes seen here: an element id that does not
exist until a sheet is built; a function that returns early on a missing container; passing a
prefix where a value was wanted; **invented keys**. `renderCustomShareCard` reads
`prefs.showIdentity`/`showDay`/`showStreak`; a probe passing `identity`/`days`/`streak` rendered a
perfectly empty card that looked exactly like a dead renderer. Confirm in the source that your
arguments are the ones the function reads.

**You instrumented the thing you are measuring with.** Patching
`CanvasRenderingContext2D.prototype` and then calling a helper that assigns `fillStyle` recurses
forever and reports `RangeError` for working code. This happened **three times**. Any
instrumentation of an accessor must read and write through the **saved descriptor**.

**You measured a call, not a draw.** A synchronous `try/catch` around `createShareCard` reported
"completed" for a draw that threw — the painting happens inside a `document.fonts.load().then()`.
Find the function that actually does the work and call that.

**The capture is not the app.** A clipped screenshot plus a `position:fixed` element made the orb
appear to cover a value it never touches. Three others: shot through `#companion-backdrop`; shot
mid-animation (a bottom sheet animates in — settle it AND require the rect to stop moving between
two reads); shot while another sheet was open on top. Before believing a screenshot, ask
`document.elementFromPoint` what is actually on top. Three failed selector guesses means stop
guessing and look.

**The seed is yours, not the app's.** A seed keyed the way your reader wants instead of the way the
app writes goes **green** while measuring nothing. `totry_vices` vs the real `totry_v`; a date
written as an ISO slice where every reader uses `dayKeyOf()`; a shape (`{t, won}`) no live writer
produces. Grep the `ls('key', …)` **write** site and copy it. And a stamp must agree with the key
it is filed under — `H()` in the seed always builds *today*, so seeding an earlier day with it
files food under one date carrying a timestamp that says another.

**The needle does not match the source.** A check for `go('grow')` never fires against source that
spells it `go(\'grow\')` inside a JS string. A grep for a function name matches the **comment**
explaining it — strip comments with `(?<!:)//` so `https://` survives. An anchor that appears in
two places silently compares an array with itself.

**The clock lied.** `ps` etime reported three hours for a run minutes old. See `totry-gate`.

## Drive the real path, never a reconstruction

A rebuilt approximation of what the app does will be wrong in a way you cannot see. A probe that
invented `food.serving_g` and passed a number where the real code builds an array threw, and read
exactly like a broken app. Call the app's own functions in the app's own order.

For anything about rendering, glass, blur or a web face, Chromium in `ios-shot` is not enough —
use `scripts/sim-shot.mjs` (WebKit on the simulator) or `scripts/app-shot.mjs` (the real Capacitor
build). Every screenshot this project took of the new chrome for weeks was missing the glass
entirely, and six reviewers plus the owner read the same true thing about a false render.

## One sample is not a measurement

Anything behind a network or a model varies. The Qur'an reader's first paint ranges **3s to over
15s** on the same bundle; one sample said HEAD worked and the working tree did not, and five
samples said 5 of 5 on both. A single LLM reply once produced a confident "2 of 3" that was
really 1 of 9. Sample, and report the denominator.

## test/harness.js — the contract

`H.load(names, globals)` compiles the named functions out of the real `index.html`.

- **It extracts only the functions you NAME.** A tested function calling an unnamed helper throws
  `ReferenceError` straight into its own `try/catch`, so the assertion measures zero on correct
  code. If the function under test calls `_urgeTs`, name `_urgeTs` too.
- **Globals arrive as wrapper PARAMETERS.** Setting `L.someGlobal = x` afterwards is a different
  binding, and a `loadV()` that rebinds from outside cannot work. Pass the value the app would
  have *after* that call.
- **It refuses a stub for a day primitive** (`dayKeyOf`, `dayKeyNorm`, `_dayKeyEnginePads`) because
  those are prepended as real declarations that shadow the parameter — a stub would silently never
  run. Name it to get the real one and derive expectations from it.
- `H.code(src)` strips `//` comments only. `@font-face` and anything else in CSS needs block
  comments stripped too, bounded to the `<style>` blocks.
- `H.defer(promise)` makes an async section's failures count instead of being skipped.

## Scratch files

Write probes to `/tmp` or the session scratchpad, never into the repo. Agents working here have had
scratch files swept into commits twice. Before any `git add -A`, run `git status` and ask what is
new to **origin/main**, not just new to this commit.
