// Screenshot a real screen of the app, in light and/or dark, at iPhone size, with a realistic person.
//   node scripts/ios-shot.mjs <tab> [light|dark|both] [outDir] [--open "jsExpression()"] [--scroll N]
// The seed below is written in the shapes the app's OWN ls('key', …) write sites use. An invented key
// renders an empty screen and silently turns a visual review into a review of empty states.
import pw from '../node_modules/playwright/index.js'; const { chromium } = pw;
import { seedSource } from './seed-person.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path'; import url from 'url';
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const tab = args[0] || 'home';
const mode = args[1] || 'both';
const out = args[2] && !args[2].startsWith('--') ? args[2] : path.join(ROOT, '.ios-shots');
const openIdx = args.indexOf('--open'); const OPEN = openIdx > -1 ? args[openIdx + 1] : null;
const scrIdx = args.indexOf('--scroll'); const SCROLL = scrIdx > -1 ? +args[scrIdx + 1] : 0;
fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => { let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
  try { const b = fs.readFileSync(p); r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(b); }
  catch (e) { r.writeHead(404); r.end('x'); } });
await new Promise(z => srv.listen(0, z)); const PORT = srv.address().port;
const b = await chromium.launch();
for (const scheme of (mode === 'both' ? ['light', 'dark'] : [mode])) {
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, serviceWorkers: 'block', colorScheme: scheme });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.route('**/*', r => r.request().url().startsWith('http://localhost:' + PORT) ? r.continue() : r.abort());
  await pg.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
  await pg.evaluate(seedSource());
  await pg.reload({ waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(2400);
  await pg.addStyleTag({ content: ':root{--st:59px;--sb:34px}' });
  await pg.evaluate(t => { try { go(t); } catch (e) {} }, tab); await pg.waitForTimeout(700);
  await pg.evaluate(() => { ['companion-overlay', 'companion-backdrop'].forEach(id => { const e = document.getElementById(id); if (e) { e.classList.remove('open'); e.style.display = 'none'; } });
    document.body.classList.remove('sheet-open'); document.querySelectorAll('.milestone-toast').forEach(e => e.remove()); });
  // Banners can arrive after load (the welcome-back greeting does); keep them off the capture entirely.
  await pg.addStyleTag({ content: '.milestone-toast{display:none !important}' });
  if (SCROLL) { await pg.evaluate(([t, y]) => { const el = document.getElementById('tab-' + t); if (el) el.scrollTop = y; }, [tab, SCROLL]); await pg.waitForTimeout(300); }
  if (OPEN) { await pg.evaluate(expr => { try { (0, eval)(expr); } catch (e) { console.error(e); } }, OPEN); await pg.waitForTimeout(900); }
  const name = tab + (OPEN ? '-sheet' : '') + (SCROLL ? '-s' + SCROLL : '') + '-' + scheme + '.png';
  await pg.screenshot({ path: path.join(out, name) });
  console.log(path.join(out, name) + (errs.length ? '   PAGE ERRORS: ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); srv.close();
