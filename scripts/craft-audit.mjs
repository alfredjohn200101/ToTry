// THE SMALL TEXT, MEASURED — the thing the owner keeps pointing at and no source read can see.
//
//   node scripts/craft-audit.mjs [tab ...]        (default: the tabs a person actually walks)
//
// "where there are little text and things it looks vibe coded instead of apple like". That is a
// statement about RENDERED text: sizes nobody chose, a fourth grey, caps set with no tracking and
// wrapping onto a second line, a row title breaking under its own value. Every one of those passes a
// grep, a type check and the whole test suite. So this asks the browser what it actually drew.
//
// It reports, per screen: every visible text run below the footnote size, the census of text colours,
// the census of families, uppercase labels that WRAP, and any pair of same-styled neighbours whose
// sizes differ by less than 2px. It prints a count at the end so two runs can be compared honestly.
//
// It CALIBRATES first, on the page itself: three elements are planted — an 11px label, a wrapping
// caps header and a fourth grey — and if the detectors do not find all three, the run reports that
// the MEASUREMENT is broken and exits non-zero rather than printing a clean-looking report.
import pw from '../node_modules/playwright/index.js'; const { chromium } = pw;
import http from 'http'; import fs from 'fs'; import path from 'path'; import url from 'url';
import { seedSource } from './seed-person.mjs';
import { installNoProductionWrites } from '../test/no-production-writes.js';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const TABS = process.argv.slice(2).length ? process.argv.slice(2)
  : ['home', 'fight', 'grow', 'track', 'nourish', 'train', 'money', 'soul', 'settings', 'coach'];

// The floor is the iOS footnote. 10px is allowed for ONE thing, the tab bar label, because that is
// what iOS itself uses; it is named here so the exception is a decision rather than a blind spot.
const FLOOR = 13;
// Two exceptions, each a decision rather than a blind spot: the tab bar label (iOS draws it at 10) and
// a chart's point annotations (caption size, 12 — what Health draws on its own charts; a 13pt number
// sitting on every data point crowds the line it is labelling).
// '#nut-trend-chart text' joins them for the same reason as the weight chart, and it is worth
// saying why it was absent: that card is display:none unless food is logged on 2+ of the last 14
// days, and the seed logged ONE, so this audit's "0 runs under the floor" was measured over a
// card it could not see while four of its labels sat at 8px in DM Mono. The seed logs two days
// now, which is what puts the chart inside the measurement — the exemption only keeps its
// decided 12px from reading as a defect.
const SIZE_EXEMPT = ['.nb span', '#weight-chart text', '#nut-trend-chart text'];

const srv = http.createServer((q, r) => {
  let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  try { const b = fs.readFileSync(p); r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(b); }
  catch (e) { r.writeHead(404); r.end('x'); }
});
await new Promise(z => srv.listen(0, z)); const PORT = srv.address().port;

const PROBE = ([exempt, floor]) => {
  const out = { small: [], colors: {}, families: {}, wrapCaps: [], nearPairs: [] };
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const own = el => [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
  const exemptEls = new Set();
  exempt.forEach(sel => document.querySelectorAll(sel).forEach(e => exemptEls.add(e)));
  // TWO populations, deliberately. `text` is elements that draw their own words — sizes, colours and
  // caps are properties of those. `boxes` is every visible element, because the pair check looks at a
  // container's CHILDREN and a container usually has no words of its own: scanning only text-bearing
  // elements made the planted 15px/14px pair invisible, and the calibration is what said so.
  const boxes = [...document.querySelectorAll('body *')].filter(vis);
  const all = boxes.filter(own);
  for (const el of all) {
    const s = getComputedStyle(el), text = own(el).slice(0, 48);
    const size = parseFloat(s.fontSize);
    if (size < floor && !exemptEls.has(el)) out.small.push({ size: +size.toFixed(1), text, cls: el.className.toString().slice(0, 40) || el.tagName });
    out.colors[s.color] = (out.colors[s.color] || 0) + 1;
    out.families[s.fontFamily.split(',')[0].replace(/["']/g, '')] = (out.families[s.fontFamily.split(',')[0].replace(/["']/g, '')] || 0) + 1;
    // A caps label that wraps: more than one line box for an uppercased run.
    // Count LINE BOXES of the words themselves, not the element's height: the first version measured
    // the box, and Settings' crisis rows — a phone number in a 56pt tappable row — read as "caps that
    // wrap" because of their padding. A Range over the text nodes reports one rect per line.
    if (s.textTransform === 'uppercase' || /^[^a-z]{6,}$/.test(own(el))) {
      const tops = new Set();
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const rc of rg.getClientRects()) if (rc.width > 0) tops.add(Math.round(rc.top));
      }
      if (tops.size > 1) out.wrapCaps.push({ text, cls: el.className.toString().slice(0, 40) });
    }
  }
  // Two siblings, same tag and weight, sizes a hair apart — a difference nobody can name and everybody feels.
  for (const el of boxes) {
    const kids = [...el.children].filter(k => vis(k) && own(k));
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = getComputedStyle(kids[i]), b = getComputedStyle(kids[j]);
      const sa = parseFloat(a.fontSize), sb = parseFloat(b.fontSize);
      if (kids[i].tagName === kids[j].tagName && a.fontWeight === b.fontWeight && a.color === b.color
        && sa !== sb && Math.abs(sa - sb) < 2) out.nearPairs.push({ a: sa, b: sb, text: own(kids[i]).slice(0, 30) + ' / ' + own(kids[j]).slice(0, 30) });
    }
  }
  return out;
};

const b = await chromium.launch();
// EVERY BROWSER THIS REPO OPENS GETS THE PRODUCTION-WRITE BLOCK. v657 wired it into panels,
// personas and crisis and stopped there; 666 more analytics rows reached the live table in the
// three days afterwards, from the eight OTHER files here that launch a browser. See
// test/no-production-writes.js, and _isLocalProbe() in src/app/28-init.js for the half a harness
// cannot be trusted to remember.
installNoProductionWrites(b);
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', colorScheme: 'dark' });
const pg = await ctx.newPage();
await pg.route('**/*', r => r.request().url().startsWith('http://localhost:' + PORT) ? r.continue() : r.abort());
await pg.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
await pg.evaluate(seedSource());
await pg.reload({ waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(2200);
await pg.addStyleTag({ content: ':root{--st:59px;--sb:34px}' });

// ── CALIBRATION ───────────────────────────────────────────────────────────────────────────────────
await pg.evaluate(() => {
  const d = document.createElement('div');
  d.id = 'craft-calibration';
  d.innerHTML = '<div style="font-size:11px;color:#8a8a8f">a label nobody sized</div>' +
    '<div style="text-transform:uppercase;font-size:13px;width:80px;line-height:1.2">A CAPS HEADER THAT IS REALLY A WHOLE SENTENCE AND WRAPS</div>' +
    '<div><span style="font-size:15px;color:#777">fourth grey a</span><span style="font-size:14px;color:#777">fourth grey b</span></div>' +
    // The false positive the first version raised, planted so it can never come back: one line of
    // digits in a tall padded row is NOT a wrapping caps label.
    '<a id="cal-tall-row" style="display:block;padding:18px 16px;font-size:17px">13 11 14</a>';
  document.body.appendChild(d);
});
const cal = await pg.evaluate(PROBE, [SIZE_EXEMPT, FLOOR]);
const calOk = cal.small.some(s => s.size === 11) && cal.wrapCaps.some(w => /WHOLE SENTENCE/.test(w.text))
  && !cal.wrapCaps.some(w => w.text === '13 11 14') && cal.nearPairs.some(p => Math.abs(p.a - p.b) === 1);
if (!calOk) {
  console.log('THE MEASUREMENT IS WRONG, NOT THE APP — the planted 11px label, wrapping caps header and 1px pair were not all found:');
  console.log('  small:', cal.small.filter(s => s.size === 11).length, ' wrapCaps:', cal.wrapCaps.length, ' nearPairs:', cal.nearPairs.length);
  await b.close(); srv.close(); process.exit(2);
}
await pg.evaluate(() => document.getElementById('craft-calibration').remove());
console.log('calibrated — the detectors find a planted 11px label, a wrapping caps header and a 1px pair\n');

let totals = { small: 0, wrapCaps: 0, nearPairs: 0 };
const colorsAll = {}, famAll = {};
for (const tab of TABS) {
  await pg.evaluate(t => { try { go(t); } catch (e) {} }, tab);
  await pg.waitForTimeout(600);
  await pg.evaluate(() => document.querySelectorAll('.milestone-toast').forEach(e => e.remove()));
  const r = await pg.evaluate(PROBE, [SIZE_EXEMPT, FLOOR]);
  totals.small += r.small.length; totals.wrapCaps += r.wrapCaps.length; totals.nearPairs += r.nearPairs.length;
  Object.entries(r.colors).forEach(([k, v]) => colorsAll[k] = (colorsAll[k] || 0) + v);
  Object.entries(r.families).forEach(([k, v]) => famAll[k] = (famAll[k] || 0) + v);
  console.log('── ' + tab + ' ' + '─'.repeat(Math.max(0, 40 - tab.length)));
  if (r.small.length) {
    console.log('  under ' + FLOOR + 'px (' + r.small.length + '):');
    [...new Map(r.small.map(s => [s.size + s.text, s])).values()].slice(0, 8)
      .forEach(s => console.log('    ' + s.size + 'px  "' + s.text + '"  [' + s.cls + ']'));
  }
  if (r.wrapCaps.length) { console.log('  caps that wrap (' + r.wrapCaps.length + '):'); r.wrapCaps.slice(0, 4).forEach(w => console.log('    "' + w.text + '"')); }
  if (r.nearPairs.length) { console.log('  neighbours a hair apart (' + r.nearPairs.length + '):'); r.nearPairs.slice(0, 4).forEach(p => console.log('    ' + p.a + ' vs ' + p.b + '  ' + p.text)); }
  if (!r.small.length && !r.wrapCaps.length && !r.nearPairs.length) console.log('  clean');
}

const greys = Object.entries(colorsAll).filter(([c]) => { const m = c.match(/\d+/g); return m && Math.abs(m[0] - m[1]) < 12 && Math.abs(m[1] - m[2]) < 12; });
console.log('\n═══ totals over ' + TABS.length + ' screens ═══');
console.log('  text runs under ' + FLOOR + 'px: ' + totals.small);
console.log('  caps labels that wrap:     ' + totals.wrapCaps);
console.log('  neighbours <2px apart:     ' + totals.nearPairs);
console.log('  distinct greys in use:     ' + greys.length + '  ' + greys.sort((a, b) => b[1] - a[1]).slice(0, 6).map(g => g[0] + '×' + g[1]).join('  '));
console.log('  families:                  ' + Object.entries(famAll).sort((a, b) => b[1] - a[1]).map(f => f[0] + '×' + f[1]).join('  '));
await b.close(); srv.close();
