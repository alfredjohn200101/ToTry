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

// 8791 is what scripts/serve-www.py binds, and what .claude/launch.json declares. This default
// said 8137 for long enough that a whole run failed six-for-six on ERR_CONNECTION_REFUSED.
const URL = process.env.TOTRY_URL || 'http://127.0.0.1:8791';
const OUT = path.join(__dirname, '..', 'recordings');
const RAW = path.join(OUT, '_raw');
// Phone-shaped, then 2x device scale → a true 1080x2340 export.
const VW = 540, VH = 1170, SCALE = 2;

// Playwright bundles an ffmpeg built --disable-everything: libvpx_vp8 and png, muxers webm and
// image2. It cannot encode H.264 and has no mp4 muxer, so the encode below throws on it every time.
// Look for a real ffmpeg first and fall back to reporting the truth, not to a silent webm.
const FFMPEG = (() => {
  for (const p of ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/local/bin/ffmpeg']) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const which = execFileSync('/usr/bin/which', ['ffmpeg'], { encoding: 'utf8' }).trim();
    if (which && fs.existsSync(which)) return which;
  } catch (_) {}
  return null;
})();

// ── mp4 without ffmpeg ────────────────────────────────────────────────────────────────────────
// Playwright's bundled ffmpeg CAN decode VP8 and write PNGs; it just cannot encode H.264 or mux mp4.
// So when no real ffmpeg exists, go webm → PNG frames → AVFoundation (scripts/png2mp4.swift). One
// 30s clip is ~750 frames and ~283MB of PNGs, deleted as soon as it is encoded, so the peak cost is
// one clip's worth. Measured on this machine: 16s to extract, 18s to encode.
const PW_FFMPEG = (() => {
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
const FPS = 25;                                   // what Playwright records at; forced on extraction
const ENCODER = path.join(__dirname, '..', 'build', 'png2mp4');
const ENCODER_SRC = path.join(__dirname, 'png2mp4.swift');

function ensureEncoder() {
  try {
    if (fs.existsSync(ENCODER) && fs.statSync(ENCODER).mtimeMs > fs.statSync(ENCODER_SRC).mtimeMs) return ENCODER;
    fs.mkdirSync(path.dirname(ENCODER), { recursive: true });
    execFileSync('xcrun', ['swiftc', '-O', ENCODER_SRC, '-o', ENCODER], { stdio: ['ignore', 'ignore', 'pipe'] });
    return ENCODER;
  } catch (e) {
    throw new Error('could not build png2mp4: ' + String(e && e.stderr ? e.stderr : e.message).slice(0, 160));
  }
}

// Returns the mp4 path, or throws with a real reason rather than quietly handing back a webm.
//
// ENCODE TO A PARTIAL AND RENAME. png2mp4.swift removes its destination before AVAssetWriter starts,
// so encoding straight to recordings/<clip>.mp4 destroys the previous good clip the moment it begins —
// and any mid-encode failure (a bad frame, or the disk filling under 283MB of PNGs) then leaves a
// ZERO-BYTE file carrying exactly the name the edit globs for. Reproduced: a corrupt frame 350 left
// 0 bytes where a 9.1MB clip had been. A rename is atomic, so the old clip is only ever replaced by a
// finished one, and a failed run leaves last week's good clip exactly where it was.
function webmToMp4ViaFrames(webm, mp4) {
  if (!PW_FFMPEG) throw new Error("no ffmpeg at all, not even Playwright's");
  const enc = ensureEncoder();
  const frames = webm + '.frames';
  const partial = mp4 + '.partial.mp4';
  // AVAssetWriter streams into a sandbox sibling '<dest>.sb-XXXX' and only materialises the
  // destination at finishWriting, so a failure orphans a multi-MB intermediate too — in the very
  // directory whose filling started all of this. Sweep them on BOTH paths, not just success.
  const sweepSb = (p) => {
    try {
      const b = path.basename(p);
      for (const f of fs.readdirSync(OUT)) if (f.startsWith(b + '.sb-')) fs.rmSync(path.join(OUT, f), { force: true });
    } catch (_) {}
  };
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  try {
    // No -vf here. That build has exactly three filters compiled in — crop, pad, scale — so a
    // '-vf fps=25' fails outright with "No such filter". Extract every frame instead and encode at
    // the rate Playwright records: 751 frames over 30.04s measured, i.e. exactly FPS.
    execFileSync(PW_FFMPEG, ['-y', '-i', webm, '-f', 'image2',
      path.join(frames, 'f%05d.png')], { stdio: ['ignore', 'ignore', 'pipe'] });
    execFileSync(enc, [frames, String(FPS), partial], { stdio: ['ignore', 'ignore', 'pipe'] });
    sweepSb(partial);
    fs.renameSync(partial, mp4);
    return mp4;
  } catch (e) {
    fs.rmSync(partial, { force: true });   // never leave a half-file where the edit will look
    sweepSb(partial);
    throw e;
  } finally {
    fs.rmSync(frames, { recursive: true, force: true });   // 283MB a clip: never leave these behind
  }
}

// ── the demo persona, seeded in-page (same path the Settings button uses) ──────────────────────
async function seed(page) {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('totry_guest', 'true');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const ok = await page.evaluate(async () => {
    // loadDemoData() gates on the app's OWN modal — `await askConfirm(...)` — not window.confirm.
    // Stubbing only the native one parked the loader on a dialog nobody would ever click: it returned
    // before writing a single key, and all six clips died at "demo seed failed:" with a blank reason.
    const yes = async () => true;
    window.confirm = () => true;
    window.askConfirm = yes;
    window.exportFullBackup = function () {};   // don't spray downloads while recording
    if (typeof loadDemoData !== 'function') return 'loadDemoData missing';
    if (askConfirm !== yes) return 'askConfirm stub did not take — is it a const now, not a function?';
    await loadDemoData();                       // it is async: await it instead of racing a fixed timer
    await new Promise(r => setTimeout(r, 700));
    try { closeCompanion(); } catch (_) {}
    try { closeFeelingDoor(); } catch (_) {}
    document.querySelectorAll('.modal-bg.open').forEach(x => x.remove());
    // Loading the demo ends by painting a red "demo data · sync off" bar across the top and a toast
    // over the screen. Both are in frame on every shot. Clear them, and put the header padding back
    // exactly as _demoBanner() found it rather than guessing at a value.
    try {
      const b = document.getElementById('demo-mode-banner');
      if (b) b.remove();
      const h = document.querySelector('.hdr');
      if (h && h.dataset._padWas !== undefined) { h.style.paddingTop = h.dataset._padWas; delete h.dataset._padWas; }
    } catch (_) {}
    document.querySelectorAll('.milestone-toast').forEach(x => x.remove());
    if (typeof go === 'function') go('home');
    const name = (localStorage.getItem('totry_name') || '').replace(/"/g, '');
    // Report what was actually seen. The old version returned '' and told nobody anything.
    return name || ('no totry_name · keys=' + localStorage.length +
                    ' · demoFlag=' + localStorage.getItem('totry_demo_mode'));
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

    // The if-then plan. The demo persona already has one, so the button reads "Update my plan for
    // next time" — clear the field before typing or the new words land glued onto the old ones, which
    // is both a mess on camera and the reason this clip once looked like the plan had not changed.
    const MINE = 'burn it off — 20 push-ups by the back door, not the scroll';
    const plan = page.locator('.modal-bg.open >> text=my plan for next time').first();
    if (await plan.count()) {
      await tap(page, plan, { post: 1200 });
      const ta = page.locator('.modal-bg.open textarea, .modal-bg.open input[type=text]').first();
      if (await ta.count()) {
        await ta.click();
        await ta.fill('');
        await ta.type(MINE, { delay: 42 });
        await beat(page, 900);
      }
      const lock = page.locator('.modal-bg.open >> text=Lock in my plan').first();
      if (await lock.count()) { await tap(page, lock, { post: 1600 }); log('plan locked in', true); }
    }

    // The point of the clip: the card behind refreshes in place and reads their OWN words back.
    // Asserting on "plan you set" alone was worthless — that heading is on the card either way, so
    // the check passed even when nothing had been written. Assert the words that were just typed.
    const card = await page.locator('.modal-bg.open').first().innerText();
    log('their own words mirrored back', /20 push-ups by the back door/i.test(card));
    log('mirrored under the plan heading', /THE PLAN YOU SET/i.test(card));
    await beat(page, 2400);

    // Land the clip by leaving the way a person leaves. "Not now" is not unique in the document —
    // an unrelated reach-out nudge owns one too — so scope it to the open card.
    const notNow = page.locator('.modal-bg.open >> text=Not now').first();
    if (await notNow.count()) { await tap(page, notNow, { post: 1500 }); }
    log('landed back on home', await page.locator('#need-talk-btn').isVisible());
    await beat(page, 1400);
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
    // Chrome refuses navigator.vibrate until the frame has seen a real user gesture, so every
    // haptic() fired from a seeding script logs one. That is an artifact of driving the app,
    // not a defect in it — a person's actual tap grants the activation.
    const BENIGN = /Blocked call to navigator\.vibrate/;
    page.on('console', m => { if (m.type() === 'error' && !BENIGN.test(m.text())) errors.push(m.text().slice(0, 200)); });
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

    let out = null, encodeNote = null;
    if (video) {
      const webm = await video.path();
      if (FFMPEG && fs.existsSync(webm)) {
        out = path.join(OUT, name + '.mp4');
        try {
          execFileSync(FFMPEG, ['-y', '-i', webm, '-c:v', 'libx264', '-preset', 'medium',
            '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
            { stdio: ['ignore', 'ignore', 'pipe'] });
        } catch (e) {
          // Say WHY. Swallowing this with stdio:'ignore' is how the mp4 step stayed broken while
          // the run still printed a video path and reported ok.
          const why = (e && e.stderr ? String(e.stderr) : String(e && e.message || e)).trim().split('\n').slice(-2).join(' ');
          try { fs.unlinkSync(out); } catch (_) {}
          out = webm;
          encodeNote = 'mp4 encode FAILED, kept webm — ' + why.slice(0, 220);
        }
      } else {
        try {
          out = webmToMp4ViaFrames(webm, path.join(OUT, name + '.mp4'));
          encodeNote = 'no ffmpeg — encoded via PNG frames + AVFoundation (scripts/png2mp4.swift)';
        } catch (e) {
          out = webm;
          encodeNote = 'mp4 FAILED, kept webm — ' + String(e && e.message || e).slice(0, 220);
        }
      }
    }
    results.push({ name, out, checks, errors, fatal, encodeNote });
    console.log(`\n── ${name} ──`);
    if (fatal) console.log('  FATAL: ' + fatal);
    checks.forEach(c => console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.what}`));
    if (errors.length) console.log('  console errors: ' + errors.length + ' → ' + errors[0]);
    if (out) console.log('  video: ' + out);
    if (encodeNote) console.log('  NOTE:  ' + encodeNote);
  }

  await browser.close();

  // encodeNote was ignored here, so a clip whose mp4 encode failed still printed `  ok  ` and the
  // run exited 0 — the same shape of silent pass this script was just fixed for twice.
  const _encodeFailed = r => !!(r.encodeNote && /FAILED/.test(r.encodeNote));
  const failed = results.filter(r => r.fatal || r.checks.some(c => !c.pass) || r.errors.length || _encodeFailed(r));
  console.log('\n════ SUMMARY ════');
  results.forEach(r => {
    const bad = (r.fatal ? 1 : 0) + r.checks.filter(c => !c.pass).length + r.errors.length + (_encodeFailed(r) ? 1 : 0);
    console.log(`${bad ? 'ISSUES' : '  ok  '}  ${r.name}  (${r.checks.filter(c=>c.pass).length}/${r.checks.length} checks)`);
  });
  fs.writeFileSync(path.join(OUT, 'run-report.json'), JSON.stringify(results, null, 2));
  process.exitCode = failed.length ? 1 : 0;
})();
