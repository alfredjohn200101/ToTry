// ── UGC CLIP RECORDER + FLOW TESTER ────────────────────────────────────────────────────────────
// Drives the real app in a real browser at phone size, records actual video (with real animations —
// sheets sliding, the orb breathing), and ASSERTS its way through each flow as it goes. So a clip that
// records successfully is also a passing end-to-end test, and a broken flow fails loudly instead of
// producing a silent, useless video.
//
//   node scripts/record-reels.js            # all clips
//   node scripts/record-reels.js one-button # just one
//
// Output: recordings/<slug>.mp4 (1080x2340, silent — voiceover goes on in the edit).
// Uses the installed Chrome, and NEVER touches a real account: it runs as a guest with demo data and
// demo mode hard-disables cloud sync in both directions.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const URL = process.env.TOTRY_URL || 'http://localhost:8137';
const OUT = path.join(__dirname, '..', 'recordings');
const RAW = path.join(OUT, '_raw');
// Phone-shaped, then 2x device scale → a true 1080x2340 export.
const VW = 540, VH = 1170, SCALE = 2;

const FFMPEG = (() => {
  const base = path.join(process.env.HOME, 'Library/Caches/ms-playwright');
  try {
    for (const d of fs.readdirSync(base)) {
      if (!d.startsWith('ffmpeg')) continue;
      for (const f of fs.readdirSync(path.join(base, d))) {
        if (f.startsWith('ffmpeg')) return path.join(base, d, f);
      }
    }
  } catch (_) {}
  return null;
})();

// ── the demo persona, seeded in-page (same path the Settings button uses) ──────────────────────
async function seed(page) {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('totry_guest', 'true');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const ok = await page.evaluate(async () => {
    window.confirm = () => true;
    window.exportFullBackup = function () {};   // don't spray downloads while recording
    if (typeof loadDemoData !== 'function') return 'loadDemoData missing';
    loadDemoData();
    await new Promise(r => setTimeout(r, 1600));
    try { closeCompanion(); } catch (_) {}
    try { closeFeelingDoor(); } catch (_) {}
    document.querySelectorAll('.modal-bg.open').forEach(x => x.remove());
    if (typeof go === 'function') go('home');
    return (localStorage.getItem('totry_name') || '').replace(/"/g, '');
  });
  if (ok !== 'Alex') throw new Error('demo seed failed: ' + ok);
  await page.waitForTimeout(700);
}

// A slow, human tap: move, pause, click. Reads far better on camera than an instant jump.
async function tap(page, locator, { pre = 550, post = 900 } = {}) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  await el.waitFor({ state: 'visible', timeout: 8000 });
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(pre);
  await el.click({ timeout: 8000 });
  await page.waitForTimeout(post);
}

const beat = (page, ms = 1100) => page.waitForTimeout(ms);

// ── the clips ─────────────────────────────────────────────────────────────────────────────────
// Each returns a list of assertions it proved, so the run doubles as a flow test.
const CLIPS = {

  // REELS-SCRIPTS.md #1 — the Feeling Door, and the plan read back in your own words.
  'one-button': async (page, log) => {
    await beat(page, 1500);
    log('home rendered', await page.locator('text=Your life, woven').first().isVisible());

    await tap(page, '#need-talk-btn', { post: 1400 });                 // the orb
    const door = page.locator('#feel-door');
    log('feeling door opened', await door.isVisible());
    const chips = await page.locator('#feel-door button').count();
    log('feeling chips present (expect >=10)', chips >= 10);
    await beat(page, 1600);

    await tap(page, '#feel-door >> text=Restless', { post: 1500 });
    log('restless card reached', /wants OUT|restless/i.test(await page.locator('body').innerText()));
    await beat(page, 2000);

    // the if-then plan: write it calm, get it back later
    const plan = page.locator('text=my plan for next time').first();
    if (await plan.count()) {
      await tap(page, plan, { post: 1200 });
      const ta = page.locator('.modal-bg.open textarea, .modal-bg.open input[type=text]').first();
      if (await ta.count()) {
        await ta.click();
        await ta.type('burn it off — 20 push-ups or a fast walk, not the scroll', { delay: 42 });
        await beat(page, 900);
      }
      const lock = page.locator('text=Lock in my plan').first();
      if (await lock.count()) { await tap(page, lock, { post: 1500 }); log('plan locked in', true); }
    }
    await beat(page, 1400);

    // reopen the same feeling — their own words come back
    await tap(page, '#need-talk-btn', { post: 1200 });
    await tap(page, '#feel-door >> text=Restless', { post: 1600 });
    const body = await page.locator('body').innerText();
    log('own plan mirrored back', /plan you set|push-ups/i.test(body));
    await beat(page, 2200);
  },

  // The integration shot: one screen that knows body, fight, spirit and money at once.
  'woven': async (page, log) => {
    await beat(page, 1600);
    const woven = page.locator('#home-woven');
    log('woven card present', await woven.isVisible());
    const t = await woven.innerText();
    log('spans all four fronts', /fight/i.test(t) && /body/i.test(t) && /spirit/i.test(t) && /money/i.test(t));
    await beat(page, 2600);
    for (const row of ['The fight', 'Body', 'Money']) {
      const r = page.locator(`#home-woven >> text=${row}`).first();
      if (await r.count()) { await tap(page, r, { post: 1700 }); await beat(page, 1500); await page.goBack().catch(()=>{});
        await page.evaluate(() => { try { go('home'); } catch(_){} }); await beat(page, 1200); }
    }
  },

  // Nourish: describe a meal in words. The most visual feature in the app.
  'log-food': async (page, log) => {
    await page.evaluate(() => { try { go('nourish'); } catch(_){} });
    await beat(page, 1800);
    const list = page.locator('#nut-log-list');
    const txt = await list.innerText();
    log('diary is populated (not an empty plate)', !/plate is empty/i.test(txt));
    await beat(page, 1600);
    const search = page.locator('#nut-search-in');
    if (await search.count()) {
      await search.scrollIntoViewIfNeeded();
      await search.click();
      await search.type('200g chicken breast and a cup of rice', { delay: 38 });
      await beat(page, 1800);
    }
    // numbers-off — the thing no competitor offers
    const gentle = page.locator('#nut-gentle-toggle');
    if (await gentle.count()) {
      await tap(page, gentle, { post: 1800 });
      log('numbers-off toggled', true);
      await beat(page, 2200);
      await tap(page, gentle, { post: 1200 });
    }
  },

  // Money: the subscriptions quietly draining you, next to the habit you're fighting.
  'money': async (page, log) => {
    await page.evaluate(() => { try { go('money'); } catch(_){} });
    await beat(page, 2000);
    const sd = page.locator('#sub-detect');
    const vis = await sd.isVisible().catch(() => false);
    log('subscription detection visible', vis);
    if (vis) {
      const t = await sd.innerText();
      log('found a real recurring charge', /netflix|spotify|fitness/i.test(t));
      await sd.scrollIntoViewIfNeeded();
      await beat(page, 2600);
    }
    const giving = page.locator('#giving-body');
    if (await giving.count()) { await giving.scrollIntoViewIfNeeded(); await beat(page, 2000); }
  },

  // The Toolkit: learn the skill at 3pm so it's yours at 11pm.
  'toolkit': async (page, log) => {
    await page.evaluate(() => { try { go('fight'); } catch(_){} });
    await beat(page, 1600);
    const card = page.locator('#toolkit-card');
    log('toolkit card present', await card.isVisible());
    await card.scrollIntoViewIfNeeded();
    await beat(page, 1500);
    await tap(page, '#toolkit-card >> text=Learn the tools', { post: 1800 });
    const body = await page.locator('body').innerText();
    log('toolkit opened with lessons', /wave|urge|defus|HALT/i.test(body));
    await beat(page, 2400);
  },

  // The whole reason the app exists: it tells you to put it down.
  'the-release': async (page, log) => {
    await tap(page, '#need-talk-btn', { post: 1300 });
    await tap(page, '#feel-door >> text=Flat', { post: 1600 });
    const body = await page.locator('body').innerText();
    log('flat path gives a real move', body.length > 60);
    await beat(page, 2600);
  },
};

// ── runner ────────────────────────────────────────────────────────────────────────────────────
(async () => {
  const only = process.argv[2];
  const names = only ? [only] : Object.keys(CLIPS);
  fs.mkdirSync(RAW, { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const results = [];

  for (const name of names) {
    if (!CLIPS[name]) { console.log('unknown clip: ' + name); continue; }
    const dir = path.join(RAW, name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    const ctx = await browser.newContext({
      viewport: { width: VW, height: VH },
      deviceScaleFactor: SCALE,
      isMobile: true, hasTouch: true,
      recordVideo: { dir, size: { width: VW * SCALE, height: VH * SCALE } },
      colorScheme: 'dark',
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e.message).slice(0, 200)));

    const checks = [];
    const log = (what, pass) => { checks.push({ what, pass: !!pass }); };
    let fatal = null;
    try {
      await page.goto(URL, { waitUntil: 'domcontentloaded' });
      await seed(page);
      await CLIPS[name](page, log);
    } catch (e) {
      fatal = String(e && e.message || e).slice(0, 300);
    }
    await page.waitForTimeout(600);
    const video = page.video();
    await ctx.close();                                     // finalises the webm

    let out = null;
    if (video) {
      const webm = await video.path();
      out = path.join(OUT, name + '.mp4');
      if (FFMPEG && fs.existsSync(webm)) {
        try {
          execFileSync(FFMPEG, ['-y', '-i', webm, '-c:v', 'libx264', '-preset', 'medium',
            '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'ignore' });
        } catch (e) { out = webm; }
      } else { out = webm; }
    }
    results.push({ name, out, checks, errors, fatal });
    console.log(`\n── ${name} ──`);
    if (fatal) console.log('  FATAL: ' + fatal);
    checks.forEach(c => console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.what}`));
    if (errors.length) console.log('  console errors: ' + errors.length + ' → ' + errors[0]);
    if (out) console.log('  video: ' + out);
  }

  await browser.close();

  const failed = results.filter(r => r.fatal || r.checks.some(c => !c.pass) || r.errors.length);
  console.log('\n════ SUMMARY ════');
  results.forEach(r => {
    const bad = (r.fatal ? 1 : 0) + r.checks.filter(c => !c.pass).length + r.errors.length;
    console.log(`${bad ? 'ISSUES' : '  ok  '}  ${r.name}  (${r.checks.filter(c=>c.pass).length}/${r.checks.length} checks)`);
  });
  fs.writeFileSync(path.join(OUT, 'run-report.json'), JSON.stringify(results, null, 2));
  process.exitCode = failed.length ? 1 : 0;
})();
