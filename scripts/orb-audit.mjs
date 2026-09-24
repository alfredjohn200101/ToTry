// WHAT DOES THE FLOATING ORB COVER? — measured, per screen, at rest.
//
//   node scripts/orb-audit.mjs [tab ...]
//
// The orb is position:fixed and sits over the scroller, so whether it lands on a control is decided
// by content height, not by CSS — which is why looking at one screenshot proves nothing either way.
// This asks the browser: for every visible interactive element on the screen, does its rect intersect
// the orb's, and by how much. An overlap on an ordinary row is a nuisance; an overlap on the red urge
// button is a person mid-urge hitting the wrong control.
//
// It calibrates first: a planted 1px element placed deliberately under the orb must be reported, and
// an element placed deliberately clear of it must not be. If the calibration fails it says the
// MEASUREMENT is wrong rather than printing a number about the app.
import pw from '../node_modules/playwright/index.js'; const { chromium } = pw;
import http from 'http'; import fs from 'fs'; import path from 'path'; import url from 'url';
import { seedSource } from './seed-person.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const TABS = process.argv.slice(2).length ? process.argv.slice(2)
  : ['home', 'fight', 'grow', 'track', 'nourish', 'train', 'money', 'soul', 'settings', 'coach'];

const HEAD = '<style id="__orb">:root{--st:59px;--sb:34px}.milestone-toast,#update-ready-bar,#ios-install-banner{display:none !important}</style>';
const srv = http.createServer((q, r) => {
  let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  try {
    let b = fs.readFileSync(p);
    if (p.endsWith('index.html')) {
      // Anchor on a string that occurs exactly once — '<body>' does not; the literal sits inside a
      // CSS comment 147k characters earlier, and .replace takes the first match.
      const anchor = '</head>\n<body>';
      const n = String(b).split(anchor).length - 1;
      if (n !== 1) throw new Error('orb-audit: anchor occurs ' + n + ' times, expected 1');
      b = Buffer.from(String(b).replace(anchor, () => HEAD + anchor));
    }
    r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
    r.end(b);
  } catch (e) { r.writeHead(404); r.end('x'); }
});
await new Promise(z => srv.listen(0, z)); const PORT = srv.address().port;

const PROBE = (tab) => {
  const orb = document.getElementById('need-talk-btn');
  if (!orb || getComputedStyle(orb).display === 'none') return { skipped: 'no orb on this screen' };
  const o = orb.getBoundingClientRect();
  const pane = document.getElementById('tab-' + tab);
  if (!pane) return { skipped: 'no pane' };

  const hits = [];
  const SEL = 'button,a,input,select,textarea,summary,[onclick],[role="button"]';
  pane.querySelectorAll(SEL).forEach(el => {
    if (el === orb || orb.contains(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    if (r.bottom < 0 || r.top > innerHeight) return;              // off the first screenful
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity < 0.05) return;
    const ox = Math.min(o.right, r.right) - Math.max(o.left, r.left);
    const oy = Math.min(o.bottom, r.bottom) - Math.max(o.top, r.top);
    if (ox <= 0 || oy <= 0) return;
    // What does the browser say is actually on top at the orb's centre, inside this element's band?
    const probeX = Math.max(r.left + 4, o.left + o.width / 2);
    const probeY = Math.min(Math.max(r.top + r.height / 2, o.top + 2), o.bottom - 2);
    const top = document.elementFromPoint(probeX, probeY);
    const covered = !!top && (top === orb || orb.contains(top));
    hits.push({
      what: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 44),
      cls: String(el.className || '').split(' ').filter(Boolean).slice(0, 2).join('.').slice(0, 30),
      overlapPx: Math.round(ox) + 'x' + Math.round(oy),
      sharePct: Math.round(ox * oy / (r.width * r.height) * 100),
      stealsTheTap: covered,
    });
  });
  return { orb: { x: Math.round(o.left), y: Math.round(o.top), w: Math.round(o.width), h: Math.round(o.height) }, hits };
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', colorScheme: 'dark' });
const pg = await ctx.newPage();
await pg.route('**/*', r => r.request().url().startsWith('http://localhost:' + PORT) ? r.continue() : r.abort());
await pg.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
await pg.evaluate(seedSource());
await pg.reload({ waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(2600);

// CALIBRATION — one element planted under the orb, one deliberately clear of it.
const cal = await pg.evaluate(() => {
  const orb = document.getElementById('need-talk-btn'); if (!orb) return 'no orb';
  const o = orb.getBoundingClientRect();
  const pane = document.querySelector('.tab.active') || document.body;
  const mk = (id, left, top) => { const el = document.createElement('button'); el.id = id; el.textContent = id;
    el.style.cssText = 'position:fixed;left:' + left + 'px;top:' + top + 'px;width:30px;height:30px;z-index:1'; pane.appendChild(el); };
  mk('__under', o.left + 10, o.top + 10);
  mk('__clear', 8, o.top + 10);
  return 'planted';
});
const calHits = await pg.evaluate(PROBE, 'home');
await pg.evaluate(() => { ['__under', '__clear'].forEach(i => document.getElementById(i)?.remove()); });
const sawUnder = (calHits.hits || []).some(h => h.what === '__under');
const sawClear = (calHits.hits || []).some(h => h.what === '__clear');
if (!sawUnder || sawClear) {
  console.log('*** THE MEASUREMENT IS WRONG, NOT THE APP — planted-under seen: ' + sawUnder + ', planted-clear wrongly seen: ' + sawClear);
  await b.close(); srv.close(); process.exit(1);
}
console.log('calibration ok — a control planted under the orb is reported, one clear of it is not\n');

let total = 0, stolen = 0;
for (const tab of TABS) {
  await pg.evaluate(t => { try { go(t); } catch (e) {} }, tab);
  await pg.waitForTimeout(700);
  const r = await pg.evaluate(PROBE, tab);
  if (r.skipped) { console.log(tab.padEnd(9) + ' ' + r.skipped); continue; }
  if (!r.hits.length) { console.log(tab.padEnd(9) + ' clear'); continue; }
  console.log(tab.padEnd(9) + ' ' + r.hits.length + ' overlapped:');
  r.hits.forEach(h => { total++; if (h.stealsTheTap) stolen++;
    console.log('          ' + (h.stealsTheTap ? 'STEALS THE TAP ' : 'overlaps       ') + h.overlapPx.padEnd(8) + h.sharePct + '%  ' + (h.cls ? '.' + h.cls + '  ' : '') + '"' + h.what + '"'); });
}
console.log('\n' + total + ' controls overlapped by the orb across ' + TABS.length + ' screens; ' + stolen + ' of them lose the tap to it.');
await b.close(); srv.close();
