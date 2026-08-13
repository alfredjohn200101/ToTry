// ── PERSONA SMOKE TEST ───────────────────────────────────────────────────────────────────────────
// Boots the REAL built bundle in a real browser as several different people, and asserts what is
// actually on their screen. Run with `npm run personas`.
//
// WHY THIS EXISTS. core.test.js asserts functions and source patterns, and it is good at that — but it
// cannot see a screen. Every expensive class of bug found in this project needed someone to LOOK:
//   · the Sacraments tab offered to a Muslim (v427)
//   · a Bible verse handed to a secular user mid-urge, on the default path (v431)
//   · the Catholic prayer hub two taps from everyone (v435)
// Three instances of ONE class, found on three separate passes, each by a person driving the app. That
// is what this file automates. It is deliberately about WHAT IS ON SCREEN, not about internals.
//
// It serves www/ itself rather than relying on an external dev server, so it works under a sandbox that
// blocks the usual launcher.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', 'www');
const PORT = 8799;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
               '.png': 'image/png', '.svg': 'image/svg+xml' };

let pass = 0, fail = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; failures.push(msg); } };

// Words that must never appear on a non-Christian person's screen. This list is the accumulated
// evidence of the three bugs above — every one of them surfaced as one of these strings.
const CHRISTIAN_ONLY = ['Rosary', 'Eucharist', 'Confession', 'Hail Mary', 'Our Father', 'Sacrament',
                        'Jesus', 'Christ', 'Bible', 'Psalm', 'ESV', 'Amen', 'Padre Pio', 'saints'];

const PERSONAS = [
  {
    name: 'secular · brand new · nothing logged',
    seed: { totry_guest: true, totry_onboarded: true, totry_faith_tradition: 'secular' },
    forbid: CHRISTIAN_ONLY,
  },
  {
    name: 'muslim · established',
    seed: { totry_guest: true, totry_onboarded: true, totry_name: 'Amir',
            totry_faith_tradition: 'islam', totry_sex: 'male' },
    forbid: CHRISTIAN_ONLY,
  },
  {
    name: 'buddhist · established',
    seed: { totry_guest: true, totry_onboarded: true, totry_faith_tradition: 'buddhism' },
    forbid: CHRISTIAN_ONLY,
  },
  {
    name: 'christian · control (gates must not over-fire)',
    seed: { totry_guest: true, totry_onboarded: true, totry_faith_tradition: 'christianity' },
    forbid: [],
    expectSome: ['Bible', 'Scripture', 'Word', 'prayer', 'Prayer'],   // at least one must be reachable
  },
  {
    name: 'female · no numbers entered',
    seed: { totry_guest: true, totry_onboarded: true, totry_sex: 'female', totry_faith_tradition: 'secular' },
    forbid: CHRISTIAN_ONLY,
  },
];

const serve = () => new Promise(res => {
  const server = http.createServer((req, rq) => {
    const clean = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, clean === '/' ? 'index.html' : clean);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(ROOT, 'index.html');
    }
    rq.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
                        'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(rq);
  });
  server.listen(PORT, '127.0.0.1', () => res(server));
});

(async () => {
  if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
    console.error('www/ is not built. Run `npm run build:www` first.');
    process.exit(1);
  }
  const server = await serve();
  const browser = await chromium.launch({ headless: true });

  for (const p of PERSONAS) {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message).slice(0, 140)));

    // Seed through the app's own storage shape (ls() JSON-encodes; a raw string makes the app look broken).
    await page.addInitScript(seed => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
    }, p.seed);

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2600);           // past the boot splash and initApp

    // Walk every tab, collecting what is actually VISIBLE. Hidden panes are skipped deliberately:
    // measuring a display:none tab is how this project has produced false findings before.
    const seen = await page.evaluate(async () => {
      const out = { text: '', tabs: [], nan: [], crisisReachable: false };
      const tabs = ['home', 'fight', 'grow', 'money', 'soul'];
      // go(), NOT showTab() — showTab does not exist. The first version of this file called it inside a
      // try/catch, which swallowed the ReferenceError and quietly measured the home tab five times. That
      // is the exact silent-no-op class this file was written to catch, so the navigator is now resolved
      // ONCE and its absence is a hard failure rather than an empty result.
      if (typeof go !== 'function') { out.navMissing = true; return out; }
      for (const t of tabs) {
        go(t);
        await new Promise(r => setTimeout(r, 260));
        const pane = document.getElementById('tab-' + t);
        if (!pane || getComputedStyle(pane).display === 'none') continue;
        out.tabs.push(t);
        out.text += '\n' + (pane.innerText || '');
      }
      // Numbers that leaked through as literals — every one of these has shipped in some app.
      for (const bad of ['NaN', 'undefined', 'Infinity', '[object Object]']) {
        if (out.text.includes(bad)) out.nan.push(bad);
      }
      // The crisis bridge must be reachable without an account, from a cold start.
      try {
        const d = document.createElement('div'); d.id = '__probe'; document.body.appendChild(d);
        if (typeof showCrisisResponse === 'function') showCrisisResponse('__probe', 'suicide');
        const t = d.innerText || '';
        out.crisisReachable = /13\s?11\s?14/.test(t) && /988/.test(t);
        d.remove();
      } catch (_) {}
      return out;
    });

    const label = p.name;
    ok(!seen.navMissing, `${label} — the tab navigator exists`);
    ok(seen.tabs.length >= 4, `${label} — reaches its tabs (got ${seen.tabs.length})`);
    ok(errors.length === 0, `${label} — no page errors (${errors[0] || ''})`);
    ok(seen.nan.length === 0, `${label} — no NaN/undefined on screen (${seen.nan.join(', ')})`);
    ok(seen.crisisReachable, `${label} — crisis numbers reachable`);

    for (const word of p.forbid) {
      const hit = new RegExp('\\b' + word, 'i').test(seen.text);
      ok(!hit, `${label} — must not show "${word}"`);
    }
    if (p.expectSome) {
      ok(p.expectSome.some(w => seen.text.includes(w)),
         `${label} — its own faith content is still present`);
    }
    await ctx.close();
  }

  await browser.close();
  server.close();

  console.log('');
  if (failures.length) {
    console.log('FAILURES:');
    failures.forEach(f => console.log('  ✗ ' + f));
  }
  console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
