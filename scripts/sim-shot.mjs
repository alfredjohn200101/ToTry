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
// AN EPHEMERAL PORT, NOT A FIXED ONE. This used to bind 8788, and on 24 Sep 2026 a different
// process was already on it: three of ten captures came back as another page entirely — one showed
// the auth wall, one was blank, and one rendered the literal text "guest=null goErr=null", a string
// that appears nowhere in this app. A screenshot harness that can silently photograph somebody
// else's server is worse than one that fails. Port 0 lets the OS pick a free one every run.
let PORT = 0;
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

// The chrome under test is positioned off the safe-area insets, so they go in BEFORE the first paint.
// Moving it afterwards is what broke the Chromium captures; here it would also make the bar jump.
const HEAD = () => '<style id="__shot">.milestone-toast,#update-ready-bar,#ios-install-banner{display:none !important}' + EXTRA + '</style>';
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
      // INJECT AT AN ANCHOR THAT OCCURS EXACTLY ONCE, AND FAIL LOUDLY IF IT DOES NOT. This used
      // `.replace('<body>', …)`, which takes the FIRST match — and this document carries the literal
      // "<body>" inside a CSS comment 147,000 characters before the real tag. So the seed was
      // written into a comment and every capture booted an UNSEEDED device. It looked like it worked
      // only because the harness used a fixed port, so the origin already held state from an earlier
      // run; the moment the port became ephemeral, three of ten screens came back as the sign-in
      // wall. Wipe first (Safari keeps localStorage per ORIGIN), and set totry_guest — the flag the
      // app's own guest door writes (src/app/02-native.js:1053) — whose branch hides the wall and
      // runs initApp outright rather than racing checkAuth's async Supabase check on a live network.
      const injectOnce = (html, anchor, addition) => {
        const n = html.split(anchor).length - 1;
        if (n !== 1) throw new Error('sim-shot: anchor ' + JSON.stringify(anchor) + ' occurs ' + n + ' times, expected exactly 1');
        return html.replace(anchor, () => addition);
      };
      let h = String(b);
      h = injectOnce(h, '</head>\n<body>', HEAD() + '</head>\n<body>\n<script>'
        + 'try{localStorage.clear()}catch(e){}' + seedSource()
        + ';try{localStorage.setItem("totry_guest","true")}catch(e){}</script>');
      h = injectOnce(h, '</body>', TAIL(tab, scroll) + '</body>');
      b = Buffer.from(h);
    }
    r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    r.end(b);
  } catch (e) { r.writeHead(404); r.end('not found'); }
});
await new Promise(z => srv.listen(0, z));
PORT = srv.address().port;

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
    await sleep(15000);   // a fresh origin has no service-worker cache and must fetch a 4MB document
    sh('simctl', 'io', 'booted', 'screenshot', dest);
    console.log(dest);
  }
}
srv.close();
console.log('\nNOTE: Safari draws its own toolbar over the bottom of the page. These captures are for the\nMATERIAL — glass, blur, the web font. For layout above the fold, ios-shot is still the faster read.');
