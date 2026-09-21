// IS THE SCREEN USING ITS SPACE? — the owner's third note, measured.
//
//   node scripts/density-audit.mjs [tab ...]
//
// "areas where it feels like the space is underutilised and gone too small is very evident on a lot of
// pages". That is a claim about PROPORTION, and proportion is measurable: how much of the first
// screenful actually carries content, how wide the content runs inside its own container, how big the
// screen's biggest thing is, and where the largest empty bands are.
//
// It reports per screen:
//   fill%        — of the first viewport-height of the scroller, the share of rows that contain any ink
//                  (sampled from element boxes, not pixels, so a dark theme does not read as empty)
//   widest gap   — the tallest run of empty rows in that screenful, in CSS px, and where it starts
//   hero         — the largest font-size rendered, and what it says
//   body share   — how many visible text runs sit at 15px or below vs 17px and above
//   side margin  — the horizontal inset of the widest content block (how much of the width is unused)
//
// A screen can be "clean" and still be too quiet: lots of fill with nothing bigger than 17px reads as a
// settings page, not a home screen. The numbers are here to argue with, not to pass or fail.
//
// READ A LOW FILL BEFORE BELIEVING IT. Four kinds of screen measure thin and are RIGHT to:
//   • network-fed ones (Today in the Church, the readers, plans) — this harness blocks the network, so
//     they render their offline state. Liturgy reads 23% here and is full of readings on a real phone.
//   • stepped flows (the morning and evening rituals) — one question at a time is the design.
//   • a new conversation (Coach) — messages fill from the top, as Messages does.
//   • a practice (Stillness) — a breathing exercise earns its quiet.
// Look at the screenshot before acting on a number from this file.
import pw from '../node_modules/playwright/index.js'; const { chromium } = pw;
import http from 'http'; import fs from 'fs'; import path from 'path'; import url from 'url';
import { seedSource } from './seed-person.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const TABS = process.argv.slice(2).length ? process.argv.slice(2)
  : ['home', 'fight', 'grow', 'track', 'nourish', 'train', 'money', 'soul', 'settings', 'coach'];

const srv = http.createServer((q, r) => {
  let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  try { const b = fs.readFileSync(p); r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(b); }
  catch (e) { r.writeHead(404); r.end('x'); }
});
await new Promise(z => srv.listen(0, z)); const PORT = srv.address().port;

const PROBE = (tab) => {
  const pane = document.getElementById('tab-' + tab);
  if (!pane) return null;
  const VW = 393, VH = 852;
  const top = pane.getBoundingClientRect().top;
  const ink = [];                      // [y0,y1] of every element that draws something a person sees
  const texts = [];
  pane.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity < 0.05) return;
    const ownText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const paints = ownText || s.backgroundColor !== 'rgba(0, 0, 0, 0)' || el.tagName === 'IMG' || el.tagName === 'SVG' || el.tagName === 'svg';
    if (!paints) return;
    const y0 = Math.max(0, Math.round(r.top - top)), y1 = Math.min(VH, Math.round(r.bottom - top));
    if (y1 > 0 && y0 < VH) ink.push([y0, y1, Math.round(r.left), Math.round(r.right)]);
    if (ownText) texts.push({ size: parseFloat(s.fontSize), text: [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').slice(0, 30) });
  });
  // rows of the first screenful that carry ink
  const rows = new Uint8Array(VH);
  ink.forEach(([a, b]) => { for (let y = a; y < b; y++) rows[y] = 1; });
  let filled = 0, gap = 0, best = 0, bestAt = 0, run = 0;
  for (let y = 0; y < VH; y++) {
    if (rows[y]) { filled++; if (run > best) { best = run; bestAt = y - run; } run = 0; }
    else run++;
  }
  if (run > best) { best = run; bestAt = VH - run; }
  // the widest thing on screen, and its side margins
  let widest = 0, leftOf = VW, rightOf = 0;
  ink.forEach(([, , l, r2]) => { const w = r2 - l; if (w > widest && w <= VW) { widest = w; leftOf = l; rightOf = r2; } });
  const sizes = texts.map(t => t.size);
  const hero = texts.slice().sort((a, b) => b.size - a.size)[0] || { size: 0, text: '' };
  return {
    fill: Math.round(filled / VH * 100),
    gap: best, gapAt: bestAt,
    hero: Math.round(hero.size), heroText: hero.text,
    small: sizes.filter(s => s <= 15).length,
    big: sizes.filter(s => s >= 17).length,
    sideMargin: Math.round(leftOf) + '/' + Math.round(VW - rightOf),
    runs: texts.length,
  };
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', colorScheme: 'dark' });
const pg = await ctx.newPage();
await pg.route('**/*', r => r.request().url().startsWith('http://localhost:' + PORT) ? r.continue() : r.abort());
await pg.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
await pg.evaluate(seedSource());
await pg.reload({ waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(2200);
await pg.addStyleTag({ content: ':root{--st:59px;--sb:34px}' });

console.log('screen      fill%  widest gap   hero               <=15px  >=17px  side margins');
const rows = [];
for (const tab of TABS) {
  await pg.evaluate(t => { try { go(t); } catch (e) {} }, tab);
  await pg.waitForTimeout(700);
  await pg.evaluate(() => document.querySelectorAll('.milestone-toast').forEach(e => e.remove()));
  const r = await pg.evaluate(PROBE, tab);
  if (!r) { console.log(tab.padEnd(11) + ' (no pane)'); continue; }
  rows.push([tab, r]);
  console.log(tab.padEnd(11) +
    String(r.fill).padStart(4) + '%' +
    String(r.gap + 'px @' + r.gapAt).padStart(13) + '   ' +
    (r.hero + 'px "' + r.heroText + '"').padEnd(20).slice(0, 20) +
    String(r.small).padStart(6) + String(r.big).padStart(8) + '   ' + r.sideMargin);
}
const avg = k => Math.round(rows.reduce((a, [, r]) => a + r[k], 0) / rows.length);
console.log('\naverage fill ' + avg('fill') + '%, average widest empty band ' + avg('gap') + 'px, average hero ' + avg('hero') + 'px');
console.log('screens whose biggest text is under 30px: ' + rows.filter(([, r]) => r.hero < 30).map(([t]) => t).join(', '));
console.log('screens with an empty band over 120px in the first screenful: ' + rows.filter(([, r]) => r.gap > 120).map(([t, r]) => t + '(' + r.gap + ')').join(', '));
await b.close(); srv.close();
