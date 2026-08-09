# Implementation specs — the remaining build-out

Seven feature specs, each written against the real `index.html` with **verbatim anchors**, house-style
code, storage keys, and a named discovery point (the founder is filming a tutorial per feature, so
"where do I tap" is part of the spec).

Apply them **one at a time**. `index.html` is a single ~35,600-line file — parallel edits corrupt it.
After each: extract the inline `<script>` and `node --check` it, count `<div` vs `</div>` outside
scripts (must be 0), run `npm test`, bump `APP_VERSION` + `CACHE` in `sw.js` together.

**VERIFY EVERY ANCHOR BEFORE APPLYING.** Line numbers drift the moment you insert anything, so match
on the verbatim anchor text, not the number. Anchors were captured at v343 / 35,634 lines.

| Spec | Feature | Notes |
|---|---|---|
| `cycle.md` | Women's cycle + phase-aware coaching | Biggest gap. `totry_cycle` deliberately NOT in SYNC_KEYS (local-first, post-Dobbs); opt-in backup splices it in at runtime. NB: "cycle" is already used in this codebase for **calorie/carb cycling** (`cycledTarget`, `totry_cal_cycling`, `nut-cycle-badge`) — do not collide. |
| `daynav.md` | Nourish day-navigation | ~30 surgical replacements: every place the "today" key is derived, plus every write path so a backfilled food lands on the right day. |
| `fight.md` | Daily pledge · habit anchoring · stage-of-change | Three additive fields on existing data; no migration. |
| `soulshare.md` | Shareable verse cards · read-aloud (TTS) | Canvas + `navigator.share()`; Web Speech API, no external service. Serves the founder's videos directly. |
| `giving.md` | Faith-aware giving (zakat/tithe/dāna) · seasonal fasting companion | Money × Soul. Never gamify giving; never turn a sacred fast into a weight-loss streak. |
| `activation.md` | The aha for signed-up users · receptivity-gated push | The push gate matters most — it goes live the moment the app is wrapped natively. |
| `practice.md` | Loving-kindness from "your few" · values card sort | Metta seeded from real names; values must reach `lifeStateBrief`. |
