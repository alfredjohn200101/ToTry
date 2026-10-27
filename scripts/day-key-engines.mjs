// Does dayKeyOf() spell the same day the same way in BOTH engines? That is the entire claim of v607,
// and the gate runs in Chromium only — so it cannot answer it. This evals the shipped source of
// dayKeyOf/dayKeyNorm in Chromium AND WebKit over every day of 2026 and compares, with a calibration
// that runs the OLD formatter through the same pipe first: if the old way does not disagree, the
// measurement is broken, not the app.
import http from 'http';
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

// CAN YOU OVERRIDE localStorage.setItem ON THE INSTANCE? This is the second engine fact the rest of
// the gate structurally cannot establish: every other browser suite here runs Chromium only.
//
// `enableSyncMonitoring()` is the trigger for the ENTIRE cloud backup, and it was written as
// `localStorage.setItem = function(...)`. Measured: Chromium installs it (hasOwnProperty true, the
// override runs); **WebKit silently does not** (hasOwnProperty FALSE, runs zero times) — and the
// value still stores, so nothing looks wrong. On the engine the shipped iOS app and the Safari PWA
// both use, that meant no local write was ever queued for upload, AND `_recordKeyTs` never ran, so
// every local key reported timestamp 0 and any cloud row beat it on the next pull. A fresh entry
// replaced by a stale cloud copy. Fixed v663 by moving the override to Storage.prototype, which is
// writable in both.
const STORAGE = () => {
  const o = {};
  let inst = 0;
  const orig = localStorage.setItem.bind(localStorage);
  try { localStorage.setItem = function(k, v){ inst++; orig(k, v); }; } catch (e) { o.threw = e.message; }
  localStorage.setItem('__eng_a', '1');
  o.instanceOverrideRuns = inst;
  o.instanceBecomesOwnProp = Object.prototype.hasOwnProperty.call(localStorage, 'setItem');
  try { delete localStorage.setItem; } catch (_) { }
  // CALIBRATION: the prototype form must run in BOTH, or this probe cannot tell "no-op" from blind.
  let proto = 0;
  const p = Storage.prototype.setItem;
  Storage.prototype.setItem = function(k, v){ proto++; return p.apply(this, arguments); };
  localStorage.setItem('__eng_b', '2');
  o.prototypeOverrideRuns = proto;
  Storage.prototype.setItem = p;
  o.valuesStillStored = localStorage.getItem('__eng_a') === '1' && localStorage.getItem('__eng_b') === '2';
  return o;
};

// localStorage needs a real ORIGIN — about:blank is opaque and throws SecurityError on access, which
// is what the first version of this check did.
const _srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end('<!doctype html><title>e</title>'); });
await new Promise(z => _srv.listen(0, z));
const _PORT = _srv.address().port;

const out = {}, mon = {}, sto = {};
for(const [name, launcher] of [['chromium', chromium], ['webkit', webkit]]){
  const b = await launcher.launch();
  const pg = await (await b.newContext()).newPage();
  await pg.goto('http://localhost:' + _PORT + '/');
  out[name] = await pg.evaluate(PROBE, SRC);
  mon[name] = await pg.evaluate(MONTHS);
  sto[name] = await pg.evaluate(STORAGE);
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

// ── THE SYNC MONITOR MUST NOT RELY ON AN INSTANCE ASSIGNMENT ────────────────────────────────────
console.log('\nlocalStorage.setItem override — instance assignment:');
console.log('  chromium runs it ' + sto.chromium.instanceOverrideRuns + 'x (own prop ' + sto.chromium.instanceBecomesOwnProp + ')' +
            '   webkit runs it ' + sto.webkit.instanceOverrideRuns + 'x (own prop ' + sto.webkit.instanceBecomesOwnProp + ')');
console.log('  prototype assignment (the fix) — chromium ' + sto.chromium.prototypeOverrideRuns + 'x, webkit ' +
            sto.webkit.prototypeOverrideRuns + 'x   [calibration: both must be 1]');
const calOk = sto.chromium.prototypeOverrideRuns === 1 && sto.webkit.prototypeOverrideRuns === 1 &&
              sto.chromium.valuesStillStored && sto.webkit.valuesStillStored;
if (!calOk) console.log('*** THE MEASUREMENT IS WRONG, NOT THE APP — the prototype form did not run in both engines');
const instanceIsNoop = sto.webkit.instanceOverrideRuns === 0;
// The shipped bundle must use the prototype form. Asserted here rather than in core.test.js because
// the REASON lives in an engine difference only this suite can see.
const usesPrototype = /Storage\.prototype\.setItem\s*=\s*function/.test(html);
const usesInstance  = /\blocalStorage\.setItem\s*=\s*function/.test(html);
console.log('  shipped bundle: Storage.prototype form ' + (usesPrototype ? 'PRESENT' : '*** MISSING') +
            ', bare instance form ' + (usesInstance ? '*** STILL PRESENT' : 'absent'));
if (instanceIsNoop && !usesPrototype) console.log('  -> an iPhone would never queue a cloud write, and a stale cloud row would beat every local edit');

_srv.close();
// A check that prints a failure and exits 0 is a check nobody's build ever notices.
process.exit((newDiff === 0 && tdsDiff === 0 && calOk && usesPrototype && !usesInstance) ? 0 : 1);
