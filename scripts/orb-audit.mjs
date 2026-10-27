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
//
// TWO STRUCTURAL BLIND SPOTS, closed 27 Oct 2026 — both found by reading this file, not by a finding.
//
// (a) IT ASKED ONLY ABOUT CONTROLS. The selector was `button,a,input,...`, so the orb sitting on top
//     of BODY TEXT was invisible to it by construction. Measured the day it was added: the orb clips
//     the RIGHT edge of 8 text runs at rest, and the worst are NUMBERS — "86.6kg" loses 22% of its
//     width, so a body weight renders as `86.6` with a gold circle where its unit was, in an app whose
//     own record says a hardcoded kg is how a lb user reads someone else's body. An orb over a button
//     is a tap problem and this suite already measured it; an orb over a number is a READING problem
//     and nothing in the gate could see it.
//
// (b) IT RAN AT EXACTLY ONE VIEWPORT (393x852). The App Store screenshot device is 440x956, and a
//     position:fixed orb's relation to content is decided by content height and viewport height —
//     which is this file's own argument against trusting one screenshot. The two sizes do not agree:
//     at 393 the orb clips Grow's weight stats and Money's payoff sentence; at 440 it clips neither
//     and clips Home's clean-day value instead. One viewport could never have found the other's.
//
// AND IT ASSERTS THE FLOOR. `.tab` carries `padding-bottom: calc(var(--sb) + 156px)` = 190px against
// an orb whose top edge is 182px up, so content can always be scrolled fully clear of it. That was
// the app's mitigation for a floating button and it was ASSUMED; it is measured now, both viewports,
// every screen. A regression there would make an overlap permanent instead of a scroll away, which is
// the difference between a nuisance and unreadable text.
//
// THE FIRST VERSION OF THE TEXT PROBE LIED, in this repo's usual direction. It scrolled
// `document.querySelector('.scroller')`, which does not exist — the scroller is `.tab` — so the floor
// was never measured and came back byte-identical to rest on every screen, which reads as "the text is
// permanently covered" when nothing had been scrolled at all. The identical numbers were the tell, and
// the floor check below refuses to report unless scrollTop actually moved over a non-zero range.
import pw from '../node_modules/playwright/index.js'; const { chromium } = pw;
import http from 'http'; import fs from 'fs'; import path from 'path'; import url from 'url';
import { seedSource } from './seed-person.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const TABS = process.argv.slice(2).length ? process.argv.slice(2)
  : ['home', 'fight', 'grow', 'track', 'nourish', 'train', 'money', 'soul', 'settings', 'coach'];

// Both sizes, because they disagree. 393x852 is iPhone 16/17 Pro; 440x956 is the 6.9in device whose
// 1320x2868 captures are the App Store listing.
const VIEWPORTS = [{ w: 393, h: 852, label: '393x852 (iPhone Pro)' }, { w: 440, h: 956, label: '440x956 (6.9in store)' }];

// FAULT INJECTION, re-runnable rather than claimed: `ORB_FAULT=floor node scripts/orb-audit.mjs`
// removes the `.tab` bottom padding that is the app's whole mitigation for a floating button, so
// content can no longer be scrolled clear of the orb and the floor check must report it. An assertion
// nobody has seen fail is not yet a test, and the floor limit reads 0 on the real app.
const FAULTS = {
  floor: '.tab{padding-bottom:8px !important}',
  // The orb painted BEHIND content instead of over it. Measured, this makes the CALIBRATION refuse —
  // with the orb under the content the planted text genuinely is not covered, so the instrument says
  // "THE MEASUREMENT IS WRONG" instead of printing a clean 0 clipped. That is the right failure: it
  // proves the probe reads what the browser PAINTS rather than a rectangle intersection, and it proves
  // a probe that can no longer separate refuses to report a number about the app.
  behind: '#need-talk-btn{z-index:0 !important}',
};
const FAULT = process.env.ORB_FAULT ? (FAULTS[process.env.ORB_FAULT] || (() => { throw new Error('ORB_FAULT must be one of: ' + Object.keys(FAULTS).join(', ')); })()) : '';
if (FAULT) console.log('!! ORB_FAULT=' + process.env.ORB_FAULT + ' — measuring a DELIBERATELY BROKEN app: ' + FAULT + '\n');

const HEAD = '<style id="__orb">:root{--st:59px;--sb:34px}.milestone-toast,#update-ready-bar,#ios-install-banner{display:none !important}' + FAULT + '</style>';
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
    // THE TWO QUESTIONS ARE NOT THE SAME, AND THE HEADLINE HAS TO BE THE ONE THAT MATTERS.
    // `covered` probes the ORB's centre column, so it is true by construction for anything that
    // overlaps the orb at all — a 54px-wide pill sharing 2% of its area with the orb reported
    // "STEALS THE TAP" and read as a control nobody can press, while 98% of it was free. Six of the
    // seven it named were like that. What actually breaks a control is losing ITS OWN centre, where
    // a thumb aims, which is the criterion npm run panels fails the build on. Both are reported now,
    // the honest one first.
    const c2 = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const losesItsCentre = !!c2 && (c2 === orb || orb.contains(c2));
    hits.push({
      what: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 44),
      cls: String(el.className || '').split(' ').filter(Boolean).slice(0, 2).join('.').slice(0, 30),
      overlapPx: Math.round(ox) + 'x' + Math.round(oy),
      sharePct: Math.round(ox * oy / (r.width * r.height) * 100),
      stealsTheTap: covered,
      losesItsCentre,
    });
  });
  return { orb: { x: Math.round(o.left), y: Math.round(o.top), w: Math.round(o.width), h: Math.round(o.height) }, hits };
};

// Every VISIBLE TEXT RUN the orb paints over. Range rects, never element rects: an element's box can
// be wide and empty exactly where the orb sits while its glyphs are somewhere else entirely, so an
// element-rect intersection over-reports and a person reads a number that is fully legible.
const PROBE_TEXT = () => {
  const orb = document.getElementById('need-talk-btn');
  if (!orb || getComputedStyle(orb).display === 'none') return { skipped: 'no orb on this screen' };
  const o = orb.getBoundingClientRect();
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement; if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest('script,style,noscript,template,#need-talk-btn')) return NodeFilter.FILTER_REJECT;
      const s = getComputedStyle(p);
      if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity < 0.05) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let n;
  while ((n = w.nextNode())) {
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const r of rg.getClientRects()) {
      if (r.width < 2 || r.height < 2) continue;
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const ox = Math.min(o.right, r.right) - Math.max(o.left, r.left);
      const oy = Math.min(o.bottom, r.bottom) - Math.max(o.top, r.top);
      if (ox <= 0 || oy <= 0) continue;
      // Ask the browser what it PAINTS where the glyphs are. An intersection is not a cover: the orb
      // could be behind the text, and a z-index change should show up as a fix rather than be assumed.
      const px = Math.max(r.left + 1, Math.min(r.right - 1, o.left + o.width / 2));
      const py = Math.max(r.top + 1, Math.min(r.bottom - 1, o.top + o.height / 2));
      const top = document.elementFromPoint(px, py);
      if (!(top && (top === orb || orb.contains(top)))) continue;
      out.push({
        text: n.nodeValue.trim().replace(/\s+/g, ' ').slice(0, 46),
        coveredPx: Math.round(ox), runW: Math.round(r.width), pct: Math.round(ox / r.width * 100),
        // A number losing its tail changes its MEANING; a wrapped sentence losing its tail does not.
        isNumeric: /[0-9]/.test(n.nodeValue) && n.nodeValue.trim().length <= 24,
        cls: String(n.parentElement.className || '').split(' ').filter(Boolean).slice(0, 2).join('.').slice(0, 26)
      });
      break;
    }
  }
  return { hits: out };
};

const b = await chromium.launch();
let grandControls = 0, grandBlocked = 0, grandText = 0, grandNumeric = 0, grandFloor = 0;
for (const VP of VIEWPORTS) {
const ctx = await b.newContext({ viewport: { width: VP.w, height: VP.h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', colorScheme: 'dark' });
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
// The text probe gets its own calibration. A probe that returns zero against text it cannot see is
// indistinguishable from an app with no clipped text, and this file's whole subject is that
// distinction.
await pg.evaluate(() => {
  const o = document.getElementById('need-talk-btn').getBoundingClientRect();
  const mk = (id, left) => { const d = document.createElement('div'); d.id = id; d.textContent = id;
    d.style.cssText = 'position:fixed;left:' + left + 'px;top:' + (o.top + 18) + 'px;font-size:14px;z-index:1;color:#fff'; document.body.appendChild(d); };
  mk('__undertext', o.left + 6); mk('__cleartext', 8);
});
const calT = await pg.evaluate(PROBE_TEXT);
await pg.evaluate(() => { ['__undertext', '__cleartext'].forEach(i => document.getElementById(i)?.remove()); });
const sawUT = (calT.hits || []).some(h => h.text === '__undertext');
const sawCT = (calT.hits || []).some(h => h.text === '__cleartext');
if (!sawUT || sawCT) {
  console.log('*** THE MEASUREMENT IS WRONG, NOT THE APP — planted text under the orb seen: ' + sawUT + ', planted text clear of it wrongly seen: ' + sawCT);
  await b.close(); srv.close(); process.exit(1);
}
console.log('\n##### ' + VP.label);
console.log('calibration ok — a control AND a text run planted under the orb are reported, ones clear of it are not\n');

let total = 0, stolen = 0, blocked = 0, textAtRest = 0, numericAtRest = 0, floorNotClear = 0;
for (const tab of TABS) {
  await pg.evaluate(t => { try { go(t); } catch (e) {} }, tab);
  await pg.waitForTimeout(700);
  await pg.evaluate(() => { const s = document.querySelector('.tab.active'); if (s) s.scrollTop = 0; });
  await pg.waitForTimeout(250);

  const r = await pg.evaluate(PROBE, tab);
  const t = await pg.evaluate(PROBE_TEXT);
  if (r.skipped) { console.log(tab.padEnd(9) + ' ' + r.skipped); continue; }

  if (!r.hits.length) console.log(tab.padEnd(9) + ' controls clear');
  else {
    console.log(tab.padEnd(9) + ' ' + r.hits.length + ' control(s) overlapped:');
    r.hits.forEach(h => { total++; if (h.stealsTheTap) stolen++; if (h.losesItsCentre) blocked++;
      console.log('          ' + (h.losesItsCentre ? 'CANNOT BE TAPPED ' : h.stealsTheTap ? 'orb wins its column ' : 'overlaps             ') + h.overlapPx.padEnd(8) + h.sharePct + '%  ' + (h.cls ? '.' + h.cls + '  ' : '') + '"' + h.what + '"'); });
  }
  if ((t.hits || []).length) {
    console.log('          ' + t.hits.length + ' text run(s) clipped at rest:');
    t.hits.forEach(h => { textAtRest++; if (h.isNumeric) numericAtRest++;
      console.log('            ' + (h.isNumeric ? 'NUMBER CLIPPED ' : 'text clipped   ') + String(h.coveredPx + 'px of ' + h.runW + 'px').padEnd(16) + String(h.pct + '%').padEnd(5) + (h.cls ? '.' + h.cls + '  ' : '') + '"' + h.text + '"'); });
  }

  // THE FLOOR. `.tab`'s bottom padding exists so a person can always scroll content clear of the orb.
  // Refuse to report it unless scrollTop actually moved over a non-zero range — a probe that scrolls
  // nothing reports the floor identical to rest, which reads as permanently covered.
  const moved = await pg.evaluate(() => {
    const s = document.querySelector('.tab.active'); if (!s) return null;
    const before = s.scrollTop; s.scrollTop = s.scrollHeight;
    return { before, after: s.scrollTop, range: s.scrollHeight - s.clientHeight };
  });
  await pg.waitForTimeout(400);
  if (moved && moved.range > 4) {
    if (moved.after <= moved.before) { console.log('*** THE MEASUREMENT IS WRONG — scrollTop did not move over a range of ' + moved.range); await b.close(); srv.close(); process.exit(1); }
    const fr = await pg.evaluate(PROBE, tab); const ft = await pg.evaluate(PROBE_TEXT);
    // THE SAME CRITERION THE REST OF THIS FILE USES. Counting any overlap here over-reports exactly
    // the way the header says it does: measured, the only floor hit in the app is a 4px graze on
    // `.ios-switch "Someone you love"` that keeps its own centre and is tappable where a thumb aims.
    // A floor failure means content a person CANNOT get out from under the orb — a control that has
    // lost its centre, or text the orb is painting over — not a pixel of a rounded corner touching.
    const frHits = (fr.hits || []).filter(h => h.losesItsCentre);
    const ft2 = (ft.hits || []);
    const n = frHits.length + ft2.length;
    // NAME IT. A floor failure printed as a bare count is a number somebody acts on without knowing
    // what moved — this file already records a sub-measurement given a headline's name costing a day.
    if (n) {
      floorNotClear += n;
      console.log('            FLOOR NOT CLEAR — ' + n + ' still under the orb fully scrolled; the bottom padding no longer clears it');
      frHits.forEach(h => console.log('              control CANNOT BE TAPPED ' + h.overlapPx + '  ' + (h.cls ? '.' + h.cls + '  ' : '') + '"' + h.what + '"'));
      ft2.forEach(h => console.log('              text covered ' + h.coveredPx + 'px of ' + h.runW + 'px  ' + (h.cls ? '.' + h.cls + '  ' : '') + '"' + h.text + '"'));
    }
  }
}
console.log('\n' + total + ' control(s) overlapped by the orb across ' + TABS.length + ' screens at ' + VP.label + '.');
console.log(blocked + ' lose their OWN centre and cannot be tapped where a thumb aims — this is the number that matters.');
console.log(stolen + ' are merely behind the orb in its own centre column; most of those are wide enough to tap elsewhere.');
console.log(textAtRest + ' text run(s) clipped at rest, ' + numericAtRest + ' of them a NUMBER losing its tail — a clipped sentence is cosmetic, a clipped number changes what it says.');
console.log(floorNotClear + ' still under the orb when fully scrolled (must be 0 — that is the app\'s own mitigation for a floating button).');
grandControls += total; grandBlocked += blocked; grandText += textAtRest; grandNumeric += numericAtRest; grandFloor += floorNotClear;
await ctx.close();
}
await b.close(); srv.close();

// RATCHET, set to the MEASURED truth on 27 Oct 2026, not to a round number with slack in it — this
// repo's own record is a dead-id ratchet left at 40 against an actual 12, which is 28 free slots.
// Tighten each number whenever it drops.
//
// `blocked` and `floor` are 0 and must stay 0: those are harm. The at-rest clips are the inherent
// cost of a floating action button and are a NAMED COST rather than an oversight — diagnosed, the two
// Grow numbers are `text-align:center` cells in the third column of a 3-across stat grid whose glyphs
// end at x=334 while the orb starts at x=323, and `.ios-row-value` is right-aligned by the component,
// so every fix is either scroll-position-dependent or a decision about whether the orb may occupy the
// content's right gutter at all. The floor is the app's real mitigation (`.tab` pads 190px against an
// orb 182px up) and it is asserted above, both viewports, every screen.
const LIMITS = { blocked: 0, floor: 0, numeric: 3, text: 10 };
const over = [];
if (grandBlocked > LIMITS.blocked) over.push(grandBlocked + ' control(s) cannot be tapped (limit ' + LIMITS.blocked + ')');
if (grandFloor > LIMITS.floor) over.push(grandFloor + ' element(s) stay under the orb fully scrolled (limit ' + LIMITS.floor + ')');
if (grandNumeric > LIMITS.numeric) over.push(grandNumeric + ' number(s) clipped at rest (limit ' + LIMITS.numeric + ')');
if (grandText > LIMITS.text) over.push(grandText + ' text run(s) clipped at rest (limit ' + LIMITS.text + ')');
console.log('\n== both viewports: ' + grandControls + ' controls overlapped, ' + grandBlocked + ' untappable, ' + grandText + ' text runs clipped at rest (' + grandNumeric + ' numeric), ' + grandFloor + ' not clear at the floor');
if (over.length) { console.log('\u2717 ' + over.join('; ')); process.exit(1); }
console.log('\u2713 within the ratchet');
