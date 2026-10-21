---
name: totry-gate
description: How to run ToTry's test suites (npm test, crisis, panels, personas, craft-audit, engines, preflight) without losing hours to false hangs. Use this skill BEFORE running any of them, and whenever a suite seems stuck, crashes on launch, reports a syntax error from a file that just parsed, or produces a finding that will not reproduce. Also use it when deciding what order to run things in, or when a browser suite needs to run while you are editing code.
---

# Running the gate without losing an afternoon

The browser suites here are slow (`panels` is 10–20 min, `crisis` 5–15) and they fail in ways
that look like app defects but are not. Almost every hour lost to this repo's gate has gone to
four causes, all avoidable. Read this before you start one, not after it goes wrong.

## 1. Clear orphaned browsers FIRST — this is the big one

Killing a browser suite mid-run is often correct. It orphans the **browsers** as well as the
server and the port, and those orphans starve the next run. Measured 21 Oct 2026: `crisis`
died with `browserType.launch: Timeout 180000ms exceeded`, and an earlier run sat at
**2h59m elapsed on 3.9 seconds of CPU**. Both read as "this machine can no longer run browser
suites". Both were orphans. After clearing them a browser launched in **2.7s** and crisis went
from roughly ten doors per ten minutes to **21 in two**.

```bash
pkill -f 'node test/crisis.js'; pkill -f 'node test/panels.js'
pkill -f 'ms-playwright'; pkill -f 'chrome-headless-shell'
```

Then prove the machine is ready rather than assuming — a ten-second check beats a twenty-minute
false negative:

```bash
node -e "const{chromium}=require('./node_modules/playwright');(async()=>{const t=Date.now();
const b=await chromium.launch();const p=await b.newPage();await p.setContent('<h1>ok</h1>');
await p.textContent('h1');await b.close();
console.log('launched+rendered in '+((Date.now()-t)/1000).toFixed(1)+'s');process.exit(0)})()"
```

Seconds means go. Tens of seconds means something is still holding memory — look at
`sysctl vm.swapusage` and `ps aux | grep -c '[m]s-playwright'`.

Never count browsers with `grep -i chrom`: that matches the owner's own Google Chrome, and this
repo has a recorded near-miss where a `pkill` was about to take it out. Print what a pattern
matches **before** you kill it.

## 2. Judge progress by the output advancing, not by the clock

The obvious proxies both lie here. `ps` etime reported `03:09:06` for a run started minutes
earlier. CPU time is better but a browser suite does its work in another process, so a healthy
run shows seconds of CPU over many minutes.

What cannot lie is the output. These suites write a line per door or per panel:

```bash
L1=$(wc -l < /tmp/run.out); sleep 60; L2=$(wc -l < /tmp/run.out); echo "$L1 -> $L2"
```

Moving means working. Not moving for a minute means stuck. That is the whole test.

## 3. One browser suite at a time, and do not rebuild underneath it

`crisis` and `panels` together will starve each other and this repo has killed both mid-run that
way. Run them in sequence.

`panels` serves `www/` per request, so `npm run build:www` (or `build:index`) during a run hands
one page a half-written bundle. That produced a lone finding — "the clean streak survived a slip"
— which never reproduced in isolation. **A finding that will not reproduce is a finding about the
harness until proven otherwise.** If you rebuilt while a suite was running, that run is void:
kill it, rebuild, start again on a fresh port.

## 4. Always pass a PORT, and read the HEAD when a run dies early

A killed run leaves its server holding the port, so the clean re-run started straight afterwards
dies on `EADDRINUSE` — which prints `}` then `Node.js v24.18.0` and reads exactly like a syntax
error in a file that just passed `node --check`.

Both browser suites read it: `test/crisis.js` and `test/panels.js` each take
`process.env.PORT`, defaulting to 8859 and **8802**. Pass one every time — the 8802 default is
exactly where an orphaned panels server bites the next run.

```bash
PORT=8891 npm run crisis
PORT=8803 npm run panels
lsof -nP -iTCP:8891 -sTCP:LISTEN     # who holds it
```

When a run dies early, `head` the output, never `tail`. The real error is at the top; the tail is
just node's exit banner.

## Running one properly

```bash
rm -f /tmp/run.out
(PORT=8891 npm run crisis > /tmp/run.out 2>&1; echo "RC=$?" >> /tmp/run.out; echo DONE >> /tmp/run.out) &
# then poll for DONE; never run these in a blocking foreground call or they get killed mid-run
# and you read a truncated pass
```

## What each suite can and cannot see

Knowing this stops you trusting a green that means nothing.

- **`npm test`** (~90s, no browser) — the real bundle: core math, the parse check, the privacy and
  voice gates, dead code. It reads SOURCE, so it cannot see anything the browser supplies
  (a UA default font, a covered control, a thrown render).
- **`npm run crisis`** — types a disclosure into every free-text door and asserts a helpline is
  visible and **tappable by geometry**, plus a negative pass that ordinary sentences are left
  alone. Both directions matter; a door nobody drives is a door that may not run.
- **`npm run panels`** — the widest net, and the one that finds what code-reading cannot.
- **`npm run personas`** — ten people against the real bundle in a real browser.
- **`node scripts/craft-audit.mjs`** — asks the BROWSER for every visible text run, grey, family,
  wrapping caps label and near-identical neighbour.
- **`npm run engines`** — the only check that runs in WebKit as well as Chromium.
- **`npm run preflight`** — bundle parity across source, www, iOS and Android by sha256.

**Coverage is bounded by the seed, not by the assertion count.** A card that renders only with
certain data is invisible to every one of these. craft-audit truthfully reported "0 text runs
under 13px" for weeks over a chart that was `display:none` because the seed logged one day of
food. If you add a surface that needs data, add that data to `scripts/seed-person.mjs` or no
check will ever look at it. See `totry-probe` for how to seed it correctly.

## Order

`npm test` first (fast, catches most things). Then personas, craft-audit, engines, preflight —
all cheap. Then crisis, then panels, one at a time, clearing browsers between them. Read the
whole thing **before** you push, never after; this repo shipped a release with `panels` red
because the output was read afterwards.
