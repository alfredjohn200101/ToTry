# The day key is a locale formatter, and that is a data bug

> Status, 24 Sep 2026: **SHIPPED as v607**, on `ios-native`, with all three refutations applied.
> This document is kept as the record of how it was found and what the refuters caught — the three
> numbered items under "What the refuters caught" are now executing assertions in `test/core.test.js`
> and each was fault-injected by corrupting an argument. What it still does NOT cover is unchanged:
> see "Scope this fix does NOT cover" below, and the two additions at the end.

## The bug

`new Date().toLocaleDateString('en-AU')` is this app's **persisted object key**, and it is not a
stable string:

| | Chromium / the PWA | WebKit / iOS — the App Store build |
|---|---|---|
| 22 Sep 2026 | `22/09/2026` | `22/9/2026` |
| 2 Sep 2026 | `02/09/2026` | `2/9/2026` |

**300 of the 365 days of 2026 diverge (82%).** The only agreeing days are the 10th–31st of October,
November and December — which is why it reads as "not reproducible". Confirmed on the real booted
simulator, not only in Playwright. Note the two spellings differ in *two* places for single-digit
days, so padding "the month" is wrong for half the year: a fix must PARSE.

**A second, separate divergence rides with it.** `{month:'short'}` in en-AU is **`Sept`** in Chromium
and **`Sep`** in WebKit — a CLDR data difference, so only June, July and September differ. It is
persisted into `.date` fields on `totry_body`, `totry_sv`, `totry_journal`, `totry_mornings`,
`totry_evenings`, `totry_workouts`, `totry_prs` and `totry_wins`, and compared by string equality at
38 sites. A three-letter month prefix collapses both spellings with no special case, and absorbs
`September` too. Related: `new Date("5 Sept")` is **year 2001** in Chromium and `Invalid Date` in
WebKit — `totry_sv` rows carry no id and no ts, so `syncIdOf` falls back to `JSON.stringify(row)` and
the date is part of the record's identity; the duplicates cannot even be deleted, because the
tombstone is recorded under one engine's JSON.

## What it does to a person's data

- **`totry_nutlog` doubles the day, forever.** The per-date union (`src/app/01-sync.js:585`) unions
  key STRINGS, so each device reads only its own half. A person sees "Nothing logged then" over food
  they logged, re-logs it, and every aggregate — weekly average, adaptive TDEE, the brief handed to
  the AI — counts it twice. `_pruneNutLog` caps at 120 KEYS, so eviction starts at ~60 real days.
- **`totry_trackers`, `totry_water` and the burn ledgers are destroyed outright.** None is in `ARR`
  and none has a named branch, so they fall to scalar last-write-wins (`01-sync.js:659-666`): one
  device's whole map replaces the other's.
- **It begins on the FIRST sync of a new device.** `lv` is null on a fresh install, so the nutlog
  guard (which needs both sides to be objects) fails and `nv = cv` adopts the other engine's keys
  wholesale. Installing the iOS app after using the PWA is the ordinary path, not an edge case.

## The census (433 sites, bucketed — a global find-and-replace would vandalise the app)

| bucket | n | what |
|---|---|---|
| A — persisted key | 65 | indexes a property name in a persisted object. 41 are `totry_nutlog`; choke points are `nutDayKey` / `nutRelKey` |
| B — persisted value | 63 writes + 38 reads | a record `.date` field and the equality tests against it. 22 writes carry the Sept/Sep bug |
| C — in-memory | 78 | both sides computed in one run. Safe today; safe after a fix **only if both halves move together**, or the screen silently goes blank |
| D — display only | 176 | **must not be touched.** 8 use the BARE form and are the trap a grep walks into |
| comments | 5 | matches inside comments, incl. one in an HTML comment in `src/shell-head.html` |
| dead | 8 | below `src/app/10-habits.js:425`'s bare `return;` |

## The design that survived review

Four (really five) hoisted `function` declarations in `src/app/00-boot.js` at top level — no
module-scope `const`/`let`, so they hoist across all 42 concatenated modules:

- `dayKeyOf(v)` — canonical zero-padded `DD/MM/YYYY` built from date PARTS, never a formatter.
  Uses `arguments.length === 0` for "today", **not** `v === undefined`, so `dayKeyOf(w.ts)` on a row
  with a missing ts does not silently file a year-old workout under this morning.
- `dayKeyNorm(s)` — either engine's spelling → the canonical one; `''` when unreadable.
  `dayKeyNorm(canonical) === canonical` is what makes the migration idempotent.
- `_mergeDayMaps(keep, add, storeKey, opts)` — **one** merge rule, called by both the migration and
  the sync branch. Two implementations drift; `01-sync.js:22-24` already says so about `syncIdOf`.
- `migrateDayKeys(opts)` — idempotent, on boot, normalises AND MERGES. `opts.raw` lets `restoreKeys`
  call it so a restored backup's merged map is what reaches the cloud.
- `dayKeyedStores()` — the store list, read by both, so a new store cannot be added to one and not
  the other.

**One commit, not three.** `_auKeyMs` is never used as a lookup; every real read is raw property
indexing with the engine-native string. Shipping the migration apart from the key PRODUCERS makes the
diary, the water ring and the trackers read empty on iOS — the person re-logs, the re-logged rows get
new ids, and the day's calories double permanently on every device.

Nine day-keyed stores, not eight: `totry_nutlog`, `totry_trackers`, `totry_water`,
`totry_calorie_burns`, `totry_strava_burns_byday`, `totry_watch_burns_byday`,
`totry_workout_burns_byday`, `totry_tgt`, `totry_usage_log`.

Two separate live bugs found alongside, to fix with it: `restoreKeys` (`00-boot.js:149-166`) revokes
tombstones for arrays, `totry_v` and `totry_f`, but `totry_nutlog` is an object of arrays and falls
through all three — restoring a backup leaves deleted meals deleted. And `saveTGT`'s eviction sorts
day keys as raw strings, which orders by day-of-month.

## What the refuters caught — fix these BEFORE the next implementation is reviewed

**1. Three half-applied renames, each a REGRESSION the fix introduces.** Reader moved to
`dayKeyOf()`, writer left on the raw formatter. They hid because the writer lives inside an inline
`on*` attribute string where the call is spelled with escaped quotes (`&apos;en-AU&apos;` or
`\'en-AU\'`), so neither a `toLocaleDateString('en-AU')` grep nor a balanced-paren scanner enters
them. On Chromium both halves still agree, so every gate stays green; on iOS they disagree 300 days
a year.
- `src/app/14-nourish.js` — `totry_glance_dismissed`: the protein macro-glance card's × never sticks.
- `src/app/14-nourish.js` — `totry_fast_rhythm_dismissed`: the Lenten-Friday strip's × never sticks.
  A faith surface on a penitential day — "quiet by default, never overbearing".
- `src/app/32-presence.js` — `totry_low_day`: "Take a rest day" on the overtrained nudge.
**Guard it as a class, not three instances**: the existing sweep reads call sites as code and never
enters attribute strings.

**2. The migration prefers a stale copy over the figures on the person's own screen.** It picks the
already-canonical spelling as the winner. On a padding engine canonical IS the device's own spelling,
so that is right; on iOS canonical is the spelling that device has **never written** — it can only
have arrived by a pre-fix cloud pull, i.e. the other phone's stale value. Executed against the real
functions:

```
totry_water      {"22/9/2026":2000,"22/09/2026":750}  →  {"22/09/2026":750}
                 the 2000ml the person logged today, gone
totry_trackers   {"22/9/2026":{water:0,sleep:7.5,steps:14000},"22/09/2026":{water:0,sleep:0,steps:0}}
                 →  {"22/09/2026":{water:0,sleep:0,steps:0}}   the whole day erased
```

That second one is the guaranteed case, not a corner: `adjustTracker` and the Health sync both create
a day as `{water:0,sleep:0,steps:0}`, and an `undefined || null || ''` guard lets a `0` through.
The migration has no recency stamp, so it needs `opts.zeroIsAbsent`; the pull has `cts`/`lts` and does
not.

**3. No store takes `Math.max`.** The exemption drafted for the two burn sub-ledgers rests on a false
premise. `totry_watch_burns_byday` is HAND-TYPED — `saveEvening()` writes it from an input its own
comment calls "editable until midnight", so a typo'd 8000 corrected to 800 is ordinary, and `Math.max`
undoes the correction and pushes the undo to every device. `totry_strava_burns_byday` is a full
replace: a day legitimately goes DOWN when an activity is deleted, when calories are corrected, or
when a session is newly recognised as a Hevy duplicate — and that last one is the double-count the
block exists to remove, so `Math.max` would restore it.

## Scope this fix does NOT cover, and says so

The key is still decided by the **device's own timezone**. `totry_timezone` is in `SYNC_KEYS` and is a
deliberate no-op that says so in its own copy, so two devices in different zones produce different
keys for the same moment with no engine difference at all. That is a separate, still-open bug. Fixing
both at once would make neither provable.

## How each refutation was answered (v607)

1. **The three half-applied renames** are fixed, and guarded as a CLASS rather than as three sites.
   `test/core.test.js` now scans HANDLER STRINGS — both `on*="…"` attributes and the `{label, onclick:'…'}`
   nudge-action shape, stepping over `&apos;` and `\'` — and fails if any of them formats a date. The
   scanner calibrates on two planted defects (one per escape spelling) plus one clean handler, and
   reports "the MEASUREMENT is wrong, not the app" rather than a number when its own calibration fails.
   All three writers now spell it `dayKeyOf()`, which takes no argument, so there is no quoted locale
   left for an escaping to swallow. **A FOURTH site of the same shape was found by asking the question
   of the whole tree**: `syncWeightTodayRow()` — the row that answers "did I weigh in today" — was
   still on the raw formatter while both writers of `totry_body` had moved to `dayKeyOf()`.
2. **The migration prefers the device's own spelling**, decided by asking the engine
   (`_dayKeyEnginePads()`, probed on 2 Sep 2026 because both fields are single-digit), not by assuming
   canonical is newest. Both directions are asserted, so it is a rule about whose data it is rather
   than a flipped constant. `opts.zeroIsAbsent` (migration only — the pull has cts/lts and does not
   take it) stops a freshly-initialised `{water:0,sleep:0,steps:0}` flattening a filled day. Both
   losses named above are executing tests that were seen to FAIL on the pre-correction functions.
3. **No store takes `Math.max`.** Both claims were verified in this tree first: `saveEvening()` reads
   `#evening-move` and assigns it onto `totry_watch_burns_byday` (hand-typed, "editable until
   midnight"), and `syncStrava()` rebuilds `totry_strava_burns_byday` whole ("re-syncs replace rather
   than double-count"), skipping Hevy-sourced activities — which is the double-count removal `Math.max`
   would have reinstated. The rule is asserted for every store name, so a new store cannot be added to
   an exemption list that no longer exists.

## Two more things this does NOT cover, found while fixing it

- **The `.date` field on array rows still carries the engine's `{month:'short'}` spelling.** Those rows
  union by id so nothing is lost, and the comparisons around them go through `dayKeyNorm()` — but
  `dayKeyNorm` requires a four-digit year and `.date` is written as `"22 Sept"`, with none. So on a row
  that has no `ts`, the `dayKeyNorm(e.date)` half of those comparisons can never match and the
  engine-native `e.date === todayShort` half is what actually decides. Every current writer also writes
  a `ts`, so the path is reachable only for legacy rows. Fixing it properly needs a short-date
  comparison primitive of its own, which is a separate change.
- **The timezone**, unchanged and still open — see the section above.

## Where the refuted implementation lives

Worktree `.claude/worktrees/wf_12957e88-cde-1`, commit `8bb5da3`, based on `c1ddd82` (v601.7). Kept as
the reference implementation of the DESIGN; its line numbers are stale and its merge rule is the
refuted one. v607 was built by replaying it onto current HEAD and then applying the three corrections.
