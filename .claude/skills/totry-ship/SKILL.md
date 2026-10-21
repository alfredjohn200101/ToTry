---
name: totry-ship
description: The exact ToTry release chain — index.html is GENERATED from src/, bump APP_VERSION and the service-worker CACHE together, build, sync both platforms, run the whole gate, then verify the live site by driving it rather than by reading its version string. Use this skill before editing anything under src/, before any build or deploy, before pushing, and whenever asked to ship, release, deploy, push, cut a version or re-cut an App Store archive.
---

# Shipping ToTry

## index.html is GENERATED. Never edit it.

The app ships as one file, but the source is `src/shell-head.html` + 42 ordered modules in
`src/app/` + `src/shell-tail.html`. A hand edit to `index.html` passes every test and then
vanishes on the next build. Edit the module and rebuild.

Module **order is semantics**: one script, one shared top-level scope, no module system. A
`function` declaration hoists across the whole bundle; a `const` does not. Never reorder modules.
A two-letter global is a loaded gun — a local `const ic` once put the global `ic()` into its
temporal dead zone and killed the calendar while `npm test` stayed green.

A `src/app/*.js` file may legally begin mid-function, so `node --check` on one in isolation is
meaningless. The parse check in `npm test` is what catches a broken bundle.

## The chain

```bash
# 1. bump BOTH, always together — one without the other ships a stale cache
#    src/app/00-boot.js : const APP_VERSION = 'vNNN'
#    sw.js              : const CACHE = 'totry-vNNN-some-words'

npm run build:index     # assembles index.html from src/
npm run verify:index    # MUST print "identical" — byte-for-byte by sha256
npm run build:www
npm run sync            # BOTH platforms. `cap sync ios` alone lets android rot silently
npm run preflight       # bundle parity across source, www, iOS and Android by sha256
```

`preflight` hashes the FILE. It used to compare version *labels* and reported "the iOS bundle
matches the source" while ios/ and android/ sat three commits stale. A version is a label a human
types; the bundle is a file.

## Then the whole gate, read BEFORE you push

See `totry-gate` for how to run the suites without losing an afternoon — especially clearing
orphaned browsers first, and never rebuilding while a browser suite is running.

A release once went out with `panels` red because the output was read after the push. If a suite
could not complete, say so plainly rather than rounding it up; "53 of 57 doors and then the
machine gave out" is a useful sentence and "the gate is green" would not have been true.

## Verify the deploy by DRIVING it

GitHub Pages serves from `origin/main`. After pushing, do not trust the version string — a peer
session once explained five live bugs as "your build is stale" and was wrong on all five, which
sent the next person to check the one thing that was never broken.

```bash
curl -s "https://alfredjohn200101.github.io/ToTry/index.html?cb=$(date +%s)" -o /tmp/live.html
shasum -a 256 /tmp/live.html index.html | cut -c1-12      # must match
```

Then open the deployed origin in a browser and **run the fix you just shipped**, with a seeded
person and a brand-new one as each other's calibration. Paths are served from `/ToTry/`, so a
root-absolute path 404s live while working in every local test.

Keep `ios-native` fast-forwarded to `main` so the two cannot drift.

## The App Store archive

- Archive and export locally with no Apple credentials; both distribution profiles are installed.
- There is no `.xcworkspace` to open — it is `xcodebuild -project ios/App/App.xcodeproj`.
- **Verify the IPA, never the archive.** The archive is Development-signed with
  `get-task-allow = true` by design, because the export re-signs. The IPA must read
  `Apple Distribution: Alfred John (L4BD53PLVF)`, `get-task-allow = false`, arm64 only,
  `PrivacyInfo.xcprivacy` present, and a web bundle sha identical to the repo.
- **Move a superseded archive out of Organizer, never delete it.** Organizer shows a name and a
  date and never which bundle is inside, so a stale archive becomes a hazard the moment the
  staleness is a correctness path. They live in
  `~/Library/Developer/Xcode/ToTry-superseded-archives/`.
- **The upload click is the owner's.** Nothing in this repo uploads anything, and it does not need
  an issuer ID. Do not offer to.
- Re-cut the store screenshots from the new build: `node scripts/app-shot.mjs seed` makes them
  reproducible, which is what closed "a screenshot is the one artefact nobody gates".

## Deploying is the owner's call

Do not push to the live site unless asked. Committing locally is fine; publishing is not.
