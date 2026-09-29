// Does dayKeyOf() spell the same day the same way in BOTH engines? That is the entire claim of v607,
// and the gate runs in Chromium only — so it cannot answer it. This evals the shipped source of
// dayKeyOf/dayKeyNorm in Chromium AND WebKit over every day of 2026 and compares, with a calibration
// that runs the OLD formatter through the same pipe first: if the old way does not disagree, the
// measurement is broken, not the app.
import pw from '../node_modules/playwright/index.js'; const { chromium, webkit } = pw;
import fs from 'fs'; import path from 'path'; import url from 'url';
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function extract(name){
  const re = new RegExp('function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(html); if(!m) throw new Error('not found: ' + name);
  const open = html.indexOf('{', m.index); let depth = 0, end = open;
  for(; end < html.length; end++){ const c = html[end];
    if(c === '{') depth++; else if(c === '}'){ depth--; if(!depth){ end++; break; } } }
  return html.slice(m.index, end);
}
const SRC = extract('dayKeyOf') + '\n' + extract('dayKeyNorm');

// THE SECOND DIVERGENCE, measured rather than assumed. {month:'short'} is the other locale call this
// app persists, and CLAUDE.md recorded it as "Sept" vs "Sep" — one month. It is THREE: Chromium
// spells June, July and Sept where WebKit spells Jun, Jul and Sep. And 36-google-health.js compares
// d.date to a fresh toDateString(), which is a DIFFERENT promise — so that one is checked too, and
// it holds (0 of 12). Neither is asserted to be zero: the first is a real divergence the app lives
// with on DISPLAY only (every live comparison prefers ts + dayKeyOf now), and the second is a
// dependency that would be a silent defect if it ever stopped being true.
const MONTHS = () => {
  const short = [], tds = [];
  for(let m = 0; m < 12; m++){
    const d = new Date(2026, m, 5);
    short.push(d.toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short', year:'numeric' }));
    tds.push(d.toDateString());
  }
  return { short, tds };
};

const PROBE = (src) => {
  // eslint-disable-next-line no-eval
  eval(src);
  const nu = [], old = [];
  for(let i = 0; i < 365; i++){
    const d = new Date(2026, 0, 1 + i);
    // eslint-disable-next-line no-undef
    nu.push(dayKeyOf(d));
    old.push(d.toLocaleDateString('en-AU'));
  }
  return { nu, old, engine: navigator.userAgent.indexOf('WebKit') > -1 && navigator.userAgent.indexOf('Chrome') === -1 ? 'webkit' : 'chromium' };
};

const out = {}, mon = {};
for(const [name, launcher] of [['chromium', chromium], ['webkit', webkit]]){
  const b = await launcher.launch();
  const pg = await (await b.newContext()).newPage();
  await pg.goto('about:blank');
  out[name] = await pg.evaluate(PROBE, SRC);
  mon[name] = await pg.evaluate(MONTHS);
  await b.close();
}
const oldDiff = out.chromium.old.filter((v, i) => v !== out.webkit.old[i]).length;
const newDiff = out.chromium.nu.filter((v, i) => v !== out.webkit.nu[i]).length;
console.log('sample day 22 Sep 2026 — OLD  chromium=' + out.chromium.old[264] + '  webkit=' + out.webkit.old[264]);
console.log('sample day 22 Sep 2026 — NEW  chromium=' + out.chromium.nu[264]  + '  webkit=' + out.webkit.nu[264]);
console.log('\nCALIBRATION — the OLD formatter disagrees on ' + oldDiff + ' of 365 days');
if(oldDiff < 200){ console.log('*** THE MEASUREMENT IS WRONG, NOT THE APP — the two engines are not behaving differently here'); process.exit(1); }
console.log('dayKeyOf() disagrees on ' + newDiff + ' of 365 days');
console.log(newDiff === 0 ? '\nVERDICT: one day is one key on both engines.' : '\nVERDICT: STILL FORKED on ' + newDiff + ' days.');

const monDiff = mon.chromium.short.filter((v, i) => v !== mon.webkit.short[i]).length;
const tdsDiff = mon.chromium.tds.filter((v, i) => v !== mon.webkit.tds[i]).length;
console.log("\n{month:'short'} differs on " + monDiff + " of 12 months — " +
  mon.chromium.short.filter((v, i) => v !== mon.webkit.short[i]).map(v => v.split(' ')[2]).join(', ') +
  " (DISPLAY only: every live comparison prefers ts + dayKeyOf)");
console.log('toDateString() differs on ' + tdsDiff + ' of 12 months' +
  (tdsDiff === 0 ? ' — stable, which 36-google-health.js depends on' : ' *** 36-google-health.js compares against this'));

// A check that prints a failure and exits 0 is a check nobody's build ever notices.
process.exit((newDiff === 0 && tdsDiff === 0) ? 0 : 1);
