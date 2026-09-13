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
  // 1366 x 1366 at deviceScaleFactor 2 == a 2732 x 2732 PNG.
  const ctx = await b.newContext({ viewport:{width:1366,height:1366}, deviceScaleFactor:2, serviceWorkers:'block' });
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:4610/index.html', { waitUntil:'domcontentloaded' });
  await pg.waitForFunction(() => document.fonts && document.fonts.status === 'loaded', null, {timeout:20000})
          .catch(() => console.warn('! fonts never reported loaded — check fonts/ in www'));
  await pg.waitForTimeout(1000);

  const m = await pg.evaluate(() => {
    // Fail loudly rather than render a fallback face: a splash in Times is worse than no splash,
    // because it looks deliberate.
    const probe = document.createElement('span');
    probe.style.cssText = 'position:fixed;visibility:hidden;font-size:100px';
    probe.style.fontFamily = "'Cormorant Garamond', serif"; probe.textContent = 'ToTry';
    document.body.appendChild(probe); const w1 = probe.getBoundingClientRect().width;
    probe.style.fontFamily = 'serif'; const w2 = probe.getBoundingClientRect().width;
    probe.remove();
    if (Math.abs(w1 - w2) < 0.5) return { err: 'Cormorant Garamond did not load — refusing to render the fallback face' };

    document.body.innerHTML = '';
    document.documentElement.style.background = '#0a0a0f';
    const s = document.createElement('div');
    s.style.cssText = 'position:fixed;inset:0;background:#0a0a0f;display:flex;flex-direction:column;align-items:center;justify-content:center';
    s.innerHTML = '<div class="logo-main" style="font-size:160px;letter-spacing:0.02em">To<em>Try</em></div>' +
                  '<div style="font-family:\'DM Mono\',monospace;font-size:22px;color:#6a6a72;text-transform:uppercase;letter-spacing:0.2em;margin-top:26px">by Alfred John</div>';
    document.body.appendChild(s);
    const r = s.querySelector('.logo-main').getBoundingClientRect();
    return { pct: +(r.width / 1366 * 100).toFixed(1) };
  });
  if (m.err) { console.error('✗ ' + m.err); await b.close(); srv.close(); process.exit(1); }
  if (m.pct > 40) { console.error('✗ mark is ' + m.pct + '% of the square — aspectFill would crop it'); await b.close(); srv.close(); process.exit(1); }

  const tmp = path.join(OUT, FILES[0]);
  await pg.screenshot({ path: tmp, clip:{x:0,y:0,width:1366,height:1366} });
  const buf = fs.readFileSync(tmp);
  for (const f of FILES.slice(1)) fs.writeFileSync(path.join(OUT, f), buf);
  console.log('✓ Splash.imageset regenerated — mark is ' + m.pct + '% of the square, ' + buf.length.toLocaleString() + ' bytes x' + FILES.length);
  console.log('  now run: npx cap sync');
  await b.close(); srv.close(); process.exit(0);
})();
