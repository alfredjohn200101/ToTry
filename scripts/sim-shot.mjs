// Screenshot the app the way it will actually exist: WebKit, on the phone, from the booted simulator.
//
//   node scripts/sim-shot.mjs <tab[,tab...]> [light|dark|both] [outDir] [--scroll N]
//
// WHY THIS EXISTS, AND WHY ios-shot IS NO LONGER ENOUGH. `ios-shot` renders in Chromium, and on
// 22 Sep 2026 every screenshot it had ever produced of the new chrome was found to be a picture of an
// app nobody will see: the floating tab bar's `backdrop-filter` did not survive the capture, so the
// glass came out as a flat tint with the content behind it razor sharp. Six independent reviewers and
// the owner read those images and all reported the same true thing about a false render — "that clear
// glass at the bottom don't look clear glassy to me". On the phone the same build blurs correctly.
// A material is exactly the kind of property a headless engine can decline to draw while reporting
// nothing, so the only honest answer for chrome is to ask the engine that ships.
//
// It drives the real simulator: `simctl ui` for the appearance, Safari for the page, `simctl io` for
// the pixels. Slower than Chromium and worth it for anything involving glass, blur or a web font.
import http from 'http'; import fs from 'fs'; import path from 'path'; import url from 'url';
import { execFileSync } from 'child_process';
import { seedSource } from './seed-person.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const TABS = (args[0] || 'home').split(',');
const MODE = args[1] && !args[1].startsWith('--') ? args[1] : 'both';
const OUT = args[2] && !args[2].startsWith('--') ? args[2] : path.join(ROOT, '.sim-shots');
const scrIdx = args.indexOf('--scroll'); const SCROLL = scrIdx > -1 ? +args[scrIdx + 1] : 0;
// Extra CSS injected into the served document, before first paint — for putting a deliberate
// worst case behind the chrome (a saturated block under the tab bar, say) and measuring it.
const cssIdx = args.indexOf('--css'); const EXTRA = cssIdx > -1 ? args[cssIdx + 1] : '';
const PORT = 8788;
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

// The chrome under test is positioned off the safe-area insets, so they go in BEFORE the first paint.
// Moving it afterwards is what broke the Chromium captures; here it would also make the bar jump.
const HEAD = () => '<style id="__shot">.milestone-toast,#update-ready-bar{display:none !important}' + EXTRA + '</style>';
// After boot: take the guest door if the wall is up (Safari has a live network, so a seeded device
// with no Supabase session can still land on it), clear banners, then go where we were asked.
const TAIL = (tab, scroll) => `<script>
(function(){ var n=0; var t=setInterval(function(){ n++;
  var w=document.getElementById('auth-container');
  if(w && w.offsetParent!==null){ try{ enterAsGuest(); }catch(e){} }
  var ready=document.querySelector('.app.app-ready');
  if(ready || n>40){ clearInterval(t); setTimeout(function(){
    try{ go(${JSON.stringify(tab)}); }catch(e){}
    document.querySelectorAll('.milestone-toast,#install-card,.ios-install-card').forEach(function(e){e.remove()});
    ['companion-overlay','companion-backdrop'].forEach(function(id){var e=document.getElementById(id); if(e){e.classList.remove('open'); e.style.display='none';}});
    document.body.classList.remove('sheet-open');
    ${scroll ? `setTimeout(function(){var p=document.getElementById('tab-'+${JSON.stringify(tab)}); if(p)p.scrollTop=${scroll};},400);` : ''}
  }, 600); }
}, 250); })();
</script>`;

let TAB = TABS[0], SCR = SCROLL;
const srv = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x');
  let p = path.join(ROOT, decodeURIComponent(u.pathname));
  if (p.endsWith('/')) p += 'index.html';
  try {
    let b = fs.readFileSync(p);
    if (p.endsWith('index.html')) {
      const tab = (u.searchParams.get('tab') || TAB).replace(/[^a-z]/g, '') || 'home';
      const scroll = +(u.searchParams.get('scroll') || SCR) || 0;
      b = Buffer.from(String(b)
        // Wipe first. Safari keeps localStorage per ORIGIN across runs, so without this the capture
        // is the seed merged with whatever the last run left behind — which is how Nourish rendered
        // an empty food log on the phone and a full one in Chromium off the same seed.
        .replace('<body>', () => '<body>\n<script>try{localStorage.clear()}catch(e){}' + seedSource() + ';</script>')
        .replace('</head>', () => HEAD() + '</head>')
        .replace('</body>', () => TAIL(tab, scroll) + '</body>'));
    }
    r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    r.end(b);
  } catch (e) { r.writeHead(404); r.end('not found'); }
});
await new Promise(z => srv.listen(PORT, z));

const sh = (...a) => execFileSync('xcrun', a, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
try { sh('simctl', 'list', 'devices', 'booted'); } catch (e) { console.error('no booted simulator'); process.exit(1); }

const sleep = ms => new Promise(z => setTimeout(z, ms));
for (const scheme of (MODE === 'both' ? ['light', 'dark'] : [MODE])) {
  sh('simctl', 'ui', 'booted', 'appearance', scheme);
  await sleep(600);
  for (const tab of TABS) {
    const name = tab + (SCROLL ? '-s' + SCROLL : '') + (EXTRA ? '-x' : '') + '-' + scheme + '.png';
    const dest = path.join(OUT, name);
    // A fresh query string each time, so Safari reloads rather than restoring the page it had.
    sh('simctl', 'openurl', 'booted', 'http://localhost:' + PORT + '/index.html?tab=' + tab + (SCROLL ? '&scroll=' + SCROLL : '') + '&n=' + (Date.now() % 100000));
    await sleep(8000);
    sh('simctl', 'io', 'booted', 'screenshot', dest);
    console.log(dest);
  }
}
srv.close();
console.log('\nNOTE: Safari draws its own toolbar over the bottom of the page. These captures are for the\nMATERIAL — glass, blur, the web font. For layout above the fold, ios-shot is still the faster read.');
