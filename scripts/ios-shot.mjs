// Screenshot a real screen of the app, in light and/or dark, at iPhone size, with a realistic person.
//   node scripts/ios-shot.mjs <tab> [light|dark|both] [outDir] [--open "jsExpression()"] [--scroll N]
// The seed below is written in the shapes the app's OWN ls('key', …) write sites use. An invented key
// renders an empty screen and silently turns a visual review into a review of empty states.
import pw from '../node_modules/playwright/index.js'; const { chromium } = pw;
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
  const ago = d => new Date(Date.now() - d * 864e5).toISOString(); const today = new Date().toISOString().slice(0, 10);
  await pg.evaluate(([a, today]) => { const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    S('totry_onboarded', true); S('totry_name', 'Alfred'); S('totry_sex', 'male'); S('totry_faith_tradition', 'christianity');
    S('totry_identity', 'A man who is present, steady, and keeps his word.'); S('totry_why', 'So my kids get the version of me that shows up.');
    S('totry_journey_start', a[1]);
    S('totry_v', [{ n: 'Porn', type: 'general', mode: 'quit', startDate: a[0], fightingSince: a[1], cleanDaysTotal: 47, relapseCount: 6, w: 9, total: 12, urgelog: [{ t: a[2], won: true }], t: 'late nights alone', lastConfirm: new Date().toISOString() },
                  { n: 'Doomscroll', type: 'general', mode: 'quit', startDate: a[2], fightingSince: a[1], cleanDaysTotal: 22, relapseCount: 3, w: 5, total: 7, urgelog: [], lastConfirm: new Date().toISOString() }]);
    S('totry_body', [{ date: '14 Sep', ts: new Date().toISOString(), weight: 84.2 }, { date: '31 Aug', ts: a[3], weight: 86.1 }, { date: '17 Aug', ts: a[2], weight: 87.9 }]);
    S('totry_h', [{ n: 'Morning ritual done', d: [1, 1, 0, 1, 1, 1, 0] }, { n: 'No vice today', d: [1, 0, 1, 1, 0, 1, 1] }, { n: 'Daily prayer', d: [1, 1, 1, 1, 1, 1, 1] }, { n: 'Gym session', d: [0, 1, 0, 1, 0, 1, 0] }]);
    S('totry_f', { d: [{ n: 'Car loan', t: 8200, p: 2400, due: 15, interest: 9.5 }, { n: 'Visa', t: 1450, p: 900, due: 2, interest: 19.9 }], u: 0, i: 0 });
    S('totry_bills', [{ n: 'Rent', amt: 520, day: 1 }, { n: 'Power', amt: 96, day: 12 }]);
    S('totry_subscriptions', [{ n: 'Spotify', amt: 13.99, day: 8 }, { n: 'Gym', amt: 72, day: 1 }]);
    S('totry_transactions', [{ d: today, n: 'Groceries', amt: -88.4 }, { d: today, n: 'Pay', amt: 1900 }]);
    S('totry_prayers', [{ t: 'For Dad’s health', at: a[2], answered: false }, { t: 'Patience with the kids', at: a[2], answered: true }]);
    S('totry_journal', [{ ts: a[2], text: 'Held the line tonight. It wanted me tired.' }]);
    S('totry_workouts', [{ ts: a[2], kind: 'strength', name: 'Push', sets: [{ ex: 'Bench Press', w: 80, r: 6 }] }]);
    S('totry_nutlog', { [today]: [{ n: 'Oats & whey', cal: 520, p: 38, c: 62, f: 11 }, { n: 'Chicken rice', cal: 730, p: 52, c: 81, f: 14 }] });
    S('totry_trackers', { [today]: { sleep: 7.5, water: 6 } });
  }, [[ago(9), ago(160), ago(30), ago(14)], today]);
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
