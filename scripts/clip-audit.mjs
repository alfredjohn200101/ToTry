// DOES A ROW CLIP THE APP'S OWN CONTENT? — measured across every starter template and three phones.
//   node scripts/clip-audit.mjs
// Written after the orb fix moved the split's focus text into iosRow's `value` slot, which is
// max-width:45%;white-space:nowrap;text-overflow:ellipsis — about 19 characters — while the app's own
// templates write 'Legs (quads, hamstrings, glutes, calves)'. The orb fix was right; the slot it
// chose for the displaced text was not.
//
// TWO WAYS THIS PROBE LIED BEFORE IT WORKED, both caught by running it against the BROKEN code first:
//   1. it approximated applyTemplate's rest-day spacing and ended up measuring seven "Rest day" rows;
//   2. the list lives inside a closed <details> on a hidden tab, so every element measured 0x0 and it
//      reported "nothing is clipped" whatever the code did.
// Calibrated: with the `value` slot restored it reports 7/7 for Push/Pull/Legs (client=148,
// scroll=291); with `sub` it reports 0/7 (client=307, no max-width, wrapping allowed).
// Does the split list clip the app's OWN starter templates? Measured, not eyeballed.
import pw from '../node_modules/playwright/index.js'; const { chromium } = pw;
import http from 'http'; import fs from 'fs'; import path from 'path'; import url from 'url';
import { seedSource } from './seed-person.mjs';
import { installNoProductionWrites } from '../test/no-production-writes.js';
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const srv = http.createServer((q,r)=>{ try{ const p=path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  r.writeHead(200,{'content-type':p.endsWith('.js')?'text/javascript':'text/html'}); r.end(fs.readFileSync(p)); }catch(e){ r.writeHead(404); r.end('x'); } });
await new Promise(z=>srv.listen(0,z)); const PORT=srv.address().port;
const b = await chromium.launch();
// EVERY BROWSER THIS REPO OPENS GETS THE PRODUCTION-WRITE BLOCK. v657 wired it into panels,
// personas and crisis and stopped there; 666 more analytics rows reached the live table in the
// three days afterwards, from the eight OTHER files here that launch a browser. See
// test/no-production-writes.js, and _isLocalProbe() in src/app/28-init.js for the half a harness
// cannot be trusted to remember.
installNoProductionWrites(b);
for (const W of [320, 393, 430]) {
  const ctx = await b.newContext({ viewport:{width:W,height:852}, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const pg = await ctx.newPage();
  await pg.route('**/*', r => r.request().url().startsWith('http://localhost:'+PORT) ? r.continue() : r.abort());
  await pg.goto('http://localhost:'+PORT+'/index.html', {waitUntil:'domcontentloaded'});
  await pg.evaluate(seedSource()); await pg.reload({waitUntil:'domcontentloaded'}); await pg.waitForTimeout(2400);
  // THE LIST LIVES INSIDE A CLOSED <details> ON A HIDDEN TAB. Without this every element measured
  // 0x0, so the probe reported "nothing is clipped" whatever the code did — the first version of this
  // passed its own calibration run with the broken slot restored, which is the tell.
  await pg.evaluate(() => {
    try { go('train'); } catch(e) {}
    try { setPTTab('log'); } catch(e) {}
    document.querySelectorAll('details').forEach(d => { if (d.querySelector('#pt-split-overview')) d.open = true; });
  });
  await pg.waitForTimeout(500);
  const out = await pg.evaluate(() => {
    const res = [];
    for (const t of (typeof STARTER_TEMPLATES !== 'undefined' ? STARTER_TEMPLATES : [])) {
      // Every day carries a REAL focus from the template, cycling its days. This is the worst case
      // and it is the one that matters; reproducing applyTemplate's rest-day spacing is not the test.
      const split = [];
      for (let i = 0; i < 7; i++) split.push({ focus: t.days[i % t.days.length].focus, detail: 'Template: ' + t.name, rest: false });
      ls('totry_split', split);
      renderSplitOverview();
      const rows = [...document.querySelectorAll('#pt-split-overview .ios-row')];
      let clipped = 0, longest = '';
      rows.forEach(r => {
        const el = r.querySelector('.ios-row-sub') || r.querySelector('.ios-row-value');
        if (!el) return;
        if (el.textContent.length > longest.length) {
          longest = el.textContent;
          const cs = getComputedStyle(el);
          res.__dbg = 'cls=' + el.className + ' client=' + el.clientWidth + ' scroll=' + el.scrollWidth +
                      ' ws=' + cs.whiteSpace + ' ov=' + cs.overflow + ' maxw=' + cs.maxWidth +
                      ' rowW=' + r.clientWidth;
        }
        if (el.scrollWidth > el.clientWidth + 1) clipped++;
      });
      res.push({ name: t.name, rows: rows.length, clipped, longest, dbg: res.__dbg });
    }
    return res;
  });
  console.log('\n— viewport ' + W + 'px');
  out.forEach(r => console.log('   ' + String(r.clipped) + '/' + r.rows + ' clipped   ' + r.name + (r.longest ? '   e.g. "' + r.longest + '"' : '') + (r.dbg ? '\n        ' + r.dbg : '')));
  await ctx.close();
}
await b.close(); srv.close();
