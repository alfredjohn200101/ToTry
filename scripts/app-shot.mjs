// Screenshot THE APP — the Capacitor build, installed and running, not a page in a browser.
//
//   node scripts/app-shot.mjs install                 build for the simulator and install it
//   node scripts/app-shot.mjs launch [light|dark]     set the appearance, relaunch, wait out the cover
//   node scripts/app-shot.mjs capture <name> [outDir] screenshot, and say whether the screen changed
//
// WHY THIS EXISTS. `sim-shot` serves the bundle to the simulator's Safari, which was a real step up
// from Chromium — it is what caught the tab bar's missing glass. But it is still a web page in a
// browser: Safari's toolbar along the bottom, its URL bar, "◀ Safari" in the status bar, and a page
// inset below a status bar it does not own. Every screenshot this project produced looked like a PWA
// because it WAS one, and the owner said so — "still looking like pwa where dynamic island isn't
// accounted for". The renderer had been fixed one step short of the thing that ships.
//
// Measured on the real wrapper afterwards, and none of it is visible in a Safari capture: the safe
// area IS honoured (the wordmark sits 13pt below the 59pt inset), the glass bar DOES materialise on
// scroll and extend behind the status bar and the Dynamic Island, and the large title DOES collapse
// into the bar on a sub-screen with a back button.
//
// WHAT THIS DELIBERATELY DOES NOT DO: navigate. The app registers no URL scheme (Info.plist declares
// no CFBundleURLTypes), so there is no `totry://` to open a screen with, `simctl` cannot synthesise
// touches, and `idb` is not installable on this machine (no Homebrew, MacPorts broken). Taps come
// from the simulator control tool, driven by whoever is running this. A script that guessed at
// coordinates and saved whatever came back would produce confident pictures of the wrong screen —
// which is the entire failure this file exists to end. `capture` reports whether the screen actually
// changed since the last one, so a missed tap is visible instead of silent.
import { execFileSync } from 'child_process';
import crypto from 'crypto'; import fs from 'fs'; import path from 'path'; import url from 'url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const [cmd, a1, a2] = process.argv.slice(2);
// DEVICE is the BUILD destination only — install/launch/capture all target `booted`, so the
// screenshots can be taken on any booted simulator. Overridable because App Store Connect
// wants 6.9" (iPhone 17/16 Pro Max) and 6.5" (iPhone 11 Pro Max / Xs Max), and neither is
// the 6.3" iPhone 17 Pro this was pinned to.
const DEVICE = process.env.SIM_DEVICE || 'iPhone 17 Pro', BUNDLE = 'app.totry';
const STATE = '/tmp/.totry-app-shot-last';
const sh = (...a) => execFileSync('xcrun', a, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const sleep = ms => new Promise(z => setTimeout(z, ms));

if (cmd === 'install') {
  const proj = path.join(ROOT, 'ios/App/App.xcodeproj');
  console.log('building ' + proj + ' …');
  execFileSync('xcodebuild', ['-project', proj, '-scheme', 'App', '-configuration', 'Debug',
    '-sdk', 'iphonesimulator', '-destination', 'platform=iOS Simulator,name=' + DEVICE,
    '-derivedDataPath', '/tmp/totry-dd', 'build'], { stdio: ['ignore', 'ignore', 'inherit'] });
  const app = '/tmp/totry-dd/Build/Products/Debug-iphonesimulator/ToTry.app';
  if (!fs.existsSync(app)) { console.error('built, but no ToTry.app at ' + app); process.exit(1); }
  sh('simctl', 'install', 'booted', app);
  console.log('installed ' + app);
}
else if (cmd === 'launch') {
  const scheme = a1 === 'light' ? 'light' : 'dark';
  sh('simctl', 'ui', 'booted', 'appearance', scheme);
  await sleep(700);
  try { sh('simctl', 'terminate', 'booted', BUNDLE); } catch (_) { }
  await sleep(400);
  sh('simctl', 'launch', 'booted', BUNDLE);
  // capacitor.config.json holds the launch cover for 3s and the web bundle is ~4MB inline.
  await sleep(9000);
  try { fs.unlinkSync(STATE); } catch (_) { }
  console.log('launched in ' + scheme + ' — the app is on its opening screen');
}
else if (cmd === 'capture') {
  if (!a1) { console.error('capture needs a name'); process.exit(1); }
  const out = a2 || path.join(ROOT, '.app-shots');
  fs.mkdirSync(out, { recursive: true });
  const dest = path.join(out, a1 + '.png');
  sh('simctl', 'io', 'booted', 'screenshot', dest);
  // HASH BELOW THE CLOCK. The first version hashed the whole file and the guard was useless: the
  // status bar's minute changes between any two captures, so every screen looked "different" and a
  // missed tap would have gone straight through. Crop the top 180 device px — the status bar and the
  // Dynamic Island — and hash what is left, which is the app.
  let h;
  try {
    const tmp = '/tmp/.totry-app-shot-crop.png';
    execFileSync('sips', ['-c', '2376', '1179', '--cropOffset', '180', '0', dest, '--out', tmp],
      { stdio: ['ignore', 'ignore', 'ignore'] });
    h = crypto.createHash('sha256').update(fs.readFileSync(tmp)).digest('hex').slice(0, 12);
    fs.unlinkSync(tmp);
  } catch (_) {
    h = 'nocrop-' + crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex').slice(0, 5);
  }
  let prev = ''; try { prev = fs.readFileSync(STATE, 'utf8').trim(); } catch (_) { }
  fs.writeFileSync(STATE, h);
  console.log(dest + '  ' + h + (prev && prev === h
    ? '  ** IDENTICAL TO THE LAST CAPTURE — the tap did not land, or the screen did not change **'
    : ''));
}
else {
  console.log(fs.readFileSync(url.fileURLToPath(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).slice(0, 8).join('\n'));
  process.exit(1);
}
