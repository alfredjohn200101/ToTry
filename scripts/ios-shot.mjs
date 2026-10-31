// Screenshot a real screen of the app, in light and/or dark, at iPhone size, with a realistic person.
//   node scripts/ios-shot.mjs <tab> [light|dark|both] [outDir] [--open "jsExpression()"] [--scroll N]
// The seed below is written in the shapes the app's OWN ls('key', …) write sites use. An invented key
// renders an empty screen and silently turns a visual review into a review of empty states.
import pw from '../node_modules/playwright/index.js'; const { chromium } = pw;
import { seedSource } from './seed-person.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path'; import url from 'url';
import { installNoProductionWrites } from '../test/no-production-writes.js';
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const tab = args[0] || 'home';
const mode = args[1] || 'both';
const out = args[2] && !args[2].startsWith('--') ? args[2] : path.join(ROOT, '.ios-shots');
const openIdx = args.indexOf('--open'); const OPEN = openIdx > -1 ? args[openIdx + 1] : null;
const scrIdx = args.indexOf('--scroll'); const SCROLL = scrIdx > -1 ? +args[scrIdx + 1] : 0;
fs.mkdirSync(out, { recursive: true });
// The phone's safe-area insets go in BEFORE the first paint, not after it. They used to be an
// addStyleTag() once the app had booted, and that one line quietly deleted the glass from every
// screenshot this project has ever taken: the rule moves the tab bar up by 34px, and Chromium
// composites the moved element over a backdrop snapshot it never re-samples — so the bar painted its
// tint over RAW content and the chips behind it came out razor sharp. Six reviewers and the owner
// read those pictures and all said the same true thing about a false render. Injected into the
// served document, after the app's own CSS so it wins the cascade, nothing moves after paint.
const HEAD_CSS = '<style id="__shot">:root{--st:59px;--sb:34px}.milestone-toast{display:none !important}</style>';
const srv = http.createServer((q, r) => { let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
  try { let b = fs.readFileSync(p);
    if (p.endsWith('index.html')) b = Buffer.from(String(b).replace('</head>', () => HEAD_CSS + '</head>'));
    r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(b); }
  catch (e) { r.writeHead(404); r.end('x'); } });
await new Promise(z => srv.listen(0, z)); const PORT = srv.address().port;
const b = await chromium.launch();
// EVERY BROWSER THIS REPO OPENS GETS THE PRODUCTION-WRITE BLOCK. v657 wired it into panels,
// personas and crisis and stopped there; 666 more analytics rows reached the live table in the
// three days afterwards, from the eight OTHER files here that launch a browser. See
// test/no-production-writes.js, and _isLocalProbe() in src/app/28-init.js for the half a harness
// cannot be trusted to remember.
installNoProductionWrites(b);
for (const scheme of (mode === 'both' ? ['light', 'dark'] : [mode])) {
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, serviceWorkers: 'block', colorScheme: scheme });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.route('**/*', r => r.request().url().startsWith('http://localhost:' + PORT) ? r.continue() : r.abort());
  await pg.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
  await pg.evaluate(seedSource());
  await pg.reload({ waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(2400);
  await pg.evaluate(t => { try { go(t); } catch (e) {} }, tab); await pg.waitForTimeout(700);
  await pg.evaluate(() => { ['companion-overlay', 'companion-backdrop'].forEach(id => { const e = document.getElementById(id); if (e) { e.classList.remove('open'); e.style.display = 'none'; } });
    document.body.classList.remove('sheet-open'); document.querySelectorAll('.milestone-toast').forEach(e => e.remove()); });
  if (SCROLL) { await pg.evaluate(([t, y]) => { const el = document.getElementById('tab-' + t); if (el) el.scrollTop = y; }, [tab, SCROLL]); await pg.waitForTimeout(300); }
  if (OPEN) { await pg.evaluate(expr => { try { (0, eval)(expr); } catch (e) { console.error(e); } }, OPEN); await pg.waitForTimeout(900); }
  const name = tab + (OPEN ? '-sheet' : '') + (SCROLL ? '-s' + SCROLL : '') + '-' + scheme + '.png';
  await pg.screenshot({ path: path.join(out, name) });
  // AND PROVE THE GLASS IS IN THE PICTURE. A headless engine can decline to draw the one material
  // this design leans hardest on and report nothing; the capture just looks flat, which reads as a
  // design problem rather than a harness problem. So: stripes behind the bar, and the high-frequency
  // energy inside it measured twice — once as it ships, once with the filter forced off. Blur
  // destroys high frequencies, so the two must separate. If they do not, the sentence printed is
  // that the MEASUREMENT failed, never a number about the app.
  const glass = await (async () => {
    const hf = async () => {
      const box = await pg.evaluate(() => { const r = document.querySelector('.nav')?.getBoundingClientRect(); return r && r.width ? { x: Math.round(r.x + 10), y: Math.round(r.y + 8), width: Math.round(r.width - 20), height: Math.round(r.height - 16) } : null; });
      if (!box) return null;
      const buf = await pg.screenshot({ clip: box });
      return pg.evaluate(async a => { const bm = await createImageBitmap(new Blob([new Uint8Array(a)], { type: 'image/png' }));
        const cv = new OffscreenCanvas(bm.width, bm.height), cx = cv.getContext('2d'); cx.drawImage(bm, 0, 0);
        const d = cx.getImageData(0, 0, bm.width, bm.height).data; let s = 0, n = 0;
        for (let y = 0; y < bm.height; y++) for (let x = 1; x < bm.width; x++) { const i = (y * bm.width + x) * 4; s += Math.abs(d[i] - d[i - 4]); n++; }
        return Math.round(s / n * 100) / 100; }, [...buf]);
    };
    await pg.evaluate(() => { const s = document.createElement('div'); s.id = '__stripes';
      s.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:200px;z-index:1;background:repeating-linear-gradient(90deg,#fff 0 2px,#000 2px 4px)';
      document.querySelector('.app')?.appendChild(s);
      document.querySelectorAll('.nav .nb').forEach(e => e.style.visibility = 'hidden'); });
    await pg.waitForTimeout(350);
    const on = await hf();
    await pg.addStyleTag({ content: '.nav{-webkit-backdrop-filter:none !important;backdrop-filter:none !important}' });
    await pg.waitForTimeout(350);
    const off = await hf();
    if (on == null || off == null) return '   (no tab bar on this screen)';
    if (!(off > 12 && off > on * 2)) return '   *** THE MEASUREMENT IS WRONG, NOT THE APP — sharp ' + off + ' and blurred ' + on + ' did not separate';
    return on < off / 3 ? '' : '   *** THE GLASS IS NOT IN THIS PICTURE — the bar measured ' + on + ' against a sharp ' + off + '; the capture is a tint, not a material';
  })();
  console.log(path.join(out, name) + glass + (errs.length ? '   PAGE ERRORS: ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); srv.close();
