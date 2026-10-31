#!/usr/bin/env node
// Regenerate ios/App/App/Assets.xcassets/Splash.imageset from the RUNNING APP.
//
// The launch screen, the Capacitor splash and the web #boot-splash all show the same mark. The only
// way to keep three layers identical is to stop drawing the mark three times: this renders the app's
// own .logo-main markup, inside the real index.html, so it inherits the real @font-face rules and the
// real kerning. A hand-drawn replacement is how the native layer drifted to "To Try" in Georgia while
// the web layer said "ToTry" in Cormorant — the bug this script exists to make unrepeatable.
//
// Run after any change to the wordmark: npm run build:www && node scripts/make-splash.js
//
// The square is 2732x2732 because that is what the imageset wants. AspectFill of a square into a tall
// phone shows only ~46% of its WIDTH (scale = max(w,h)/2732, then crop), so the mark is held to ~27%
// of the canvas — it survives the crop on every device, which is also what lets the storyboard use
// this same file full-screen instead of a separate, drift-prone logo asset.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const REPO = path.resolve(__dirname, '..');
const ROOT = path.join(REPO, 'www');
const OUT  = path.join(REPO, 'ios/App/App/Assets.xcassets/Splash.imageset');
const FILES = ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'];
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml'};

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('www/index.html is missing — run `npm run build:www` first.');
  process.exit(1);
}

const srv = http.createServer((q, r) => {
  let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  fs.readFile(p, (e, d) => {
    if (e) { r.writeHead(404); r.end(''); return; }
    r.writeHead(200, {'Content-Type': MIME[path.extname(p)] || 'application/octet-stream'});
    r.end(d);
  });
});

(async () => {
  await new Promise(res => srv.listen(4610, res));
  const b = await chromium.launch();
  // EVERY BROWSER THIS REPO OPENS GETS THE PRODUCTION-WRITE BLOCK. v657 wired it into panels,
  // personas and crisis and stopped there; 666 more analytics rows reached the live table in the
  // three days afterwards, from the eight OTHER files here that launch a browser. See
  // test/no-production-writes.js, and _isLocalProbe() in src/app/28-init.js for the half a harness
  // cannot be trusted to remember.
  require('../test/no-production-writes.js').installNoProductionWrites(b);
  // 1366 x 1366 at deviceScaleFactor 2 == a 2732 x 2732 PNG.
  const ctx = await b.newContext({ viewport:{width:1366,height:1366}, deviceScaleFactor:2, serviceWorkers:'block' });
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:4610/index.html', { waitUntil:'domcontentloaded' });
  await pg.waitForTimeout(1000);

  // The launch mark is the ToTry wordmark in its own face on the system grouped background, rendered
  // TWICE — light and dark — from the app's own .logo-main and its own tokens, and written into the
  // imageset with luminosity appearances so iOS picks the one matching the phone. A dark-only splash
  // flashed black at every light-mode launch once the app itself started following the phone.
  const render = async (appearance) => pg.evaluate((appearance) => {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:fixed;visibility:hidden;font-size:100px;font-weight:700';
    probe.textContent = 'ToTry';
    // The app's real stack. -apple-system alone is a WebKit keyword Chromium ignores, so a probe naming
    // only it measures the fallback and reports a face missing that is actually rendering.
    probe.style.fontFamily = "'Cormorant Garamond', serif"; probe.style.fontWeight = '300'; document.body.appendChild(probe); const w1 = probe.getBoundingClientRect().width;
    probe.style.fontFamily = 'serif'; const w2 = probe.getBoundingClientRect().width; probe.remove();
    if (Math.abs(w1 - w2) < 0.5) return { err: 'Cormorant Garamond did not render — refusing to render a fallback splash' };
    document.documentElement.setAttribute('data-theme', appearance);
    document.body.innerHTML = '';
    document.documentElement.style.background = 'var(--bg)';
    const s = document.createElement('div');
    s.style.cssText = 'position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center';
    s.style.flexDirection = 'column';
    s.innerHTML = '<div class="logo-main" style="font-size:170px">To<em>Try</em></div>' +
                  '<div style="font-family:var(--font-brand);font-style:italic;font-size:44px;color:var(--tx2);margin-top:18px">by Alfred John</div>';
    document.body.appendChild(s);
    const r = s.querySelector('.logo-main').getBoundingClientRect();
    return { pct: +(r.width / 1366 * 100).toFixed(1), bg: getComputedStyle(s).backgroundColor };
  }, appearance);

  const written = [];
  for (const appearance of ['light', 'dark']) {
    const m = await render(appearance);
    if (m.err) { console.error('✗ ' + m.err); await b.close(); srv.close(); process.exit(1); }
    if (m.pct > 40) { console.error('✗ mark is ' + m.pct + '% of the square — aspectFill would crop it'); await b.close(); srv.close(); process.exit(1); }
    await pg.waitForTimeout(150);
    const names = FILES.map(f => appearance === 'light' ? f : f.replace('splash-', 'splash-dark-'));
    const tmp = path.join(OUT, names[0]);
    await pg.screenshot({ path: tmp, clip:{x:0,y:0,width:1366,height:1366} });
    const buf = fs.readFileSync(tmp);
    for (const f of names.slice(1)) fs.writeFileSync(path.join(OUT, f), buf);
    written.push({ appearance, names, pct: m.pct, bg: m.bg, bytes: buf.length });
  }
  const scales = ['3x', '2x', '1x'];
  const images = [];
  for (const w of written) w.names.forEach((f, i) => images.push(Object.assign(
    { idiom: 'universal', filename: f, scale: scales[i] },
    w.appearance === 'dark' ? { appearances: [{ appearance: 'luminosity', value: 'dark' }] } : {})));
  fs.writeFileSync(path.join(OUT, 'Contents.json'), JSON.stringify({ images, info: { version: 1, author: 'xcode' } }, null, 2) + '\n');
  for (const w of written) console.log('✓ ' + w.appearance + ' splash — mark ' + w.pct + '% of the square on ' + w.bg + ', ' + w.bytes.toLocaleString() + ' bytes x' + w.names.length);
  console.log('  now run: npx cap sync');
  await b.close(); srv.close(); process.exit(0);
})();
