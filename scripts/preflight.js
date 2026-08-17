// ── PREFLIGHT ────────────────────────────────────────────────────────────────────────────────────
// Run before you archive for the App Store: `npm run preflight`
//
// WHY THIS EXISTS. On 17 Aug 2026 the repo was at v462 and ios/App/App/public/ was still at v458 —
// four versions of fixes, including a crisis-adjacent dead-code removal, that an Xcode archive would
// have silently left out. ios/App/App/public/ and www/ are BOTH gitignored build artefacts, so git
// status shows nothing and there is no way to notice by looking. The only fix is a check that fails.
//
// It also refuses to let a stale .ipa sit around unmentioned: build/export/ToTry.ipa held v462's
// great-grandparent (v312, CFBundleVersion 2) and would upload perfectly happily.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const R = p => path.join(ROOT, p);

let fail = 0, warn = 0;
const bad = m => { console.log('  ✗ ' + m); fail++; };
const soft = m => { console.log('  ! ' + m); warn++; };
const good = m => console.log('  ✓ ' + m);

const read = p => { try { return fs.readFileSync(R(p), 'utf8'); } catch (_) { return null; } };
const appVersion = s => (s && (s.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1]) || null;
const cacheName = s => (s && (s.match(/const CACHE\s*=\s*'([^']+)'/) || [])[1]) || null;

console.log('\nPREFLIGHT — before archiving\n');

// ── 1. the three copies of the app must be the same version ──────────────────────────────────────
const SRC = 'index.html', WWW = 'www/index.html', IOS = 'ios/App/App/public/index.html';
const vSrc = appVersion(read(SRC)), vWww = appVersion(read(WWW)), vIos = appVersion(read(IOS));
if (!vSrc) bad(`could not read APP_VERSION from ${SRC}`);
else if (!vWww) bad('www/ is not built — run `npm run build:www`');
else if (vWww !== vSrc) bad(`www/ is ${vWww} but the source is ${vSrc} — run \`npm run build:www\``);
else good(`www/ matches the source (${vSrc})`);

if (vSrc && !vIos) soft('no iOS bundle yet — run `npx cap sync ios` before archiving');
else if (vSrc && vIos !== vSrc) {
  bad(`the iOS bundle is ${vIos} but the source is ${vSrc} — AN ARCHIVE RIGHT NOW WOULD SHIP ${vIos}. Run \`npm run sync\``);
} else if (vIos) good(`the iOS bundle matches the source (${vIos})`);

// ── 2. the service-worker cache name must be bumped with the version ─────────────────────────────
// A stale CACHE means returning users keep the old shell — every fix in the release reaches nobody.
const cSrc = cacheName(read('sw.js'));
if (!cSrc) bad('could not read CACHE from sw.js');
else if (vSrc && !cSrc.includes(vSrc)) bad(`sw.js CACHE is '${cSrc}' but APP_VERSION is ${vSrc} — bump CACHE or returning users keep the old shell`);
else good(`sw.js CACHE carries the version ('${cSrc}')`);

for (const [label, p] of [['www', 'www/sw.js'], ['iOS bundle', 'ios/App/App/public/sw.js']]) {
  const c = cacheName(read(p));
  if (c === null) { if (label === 'www') bad(`${p} is missing`); continue; }
  if (c !== cSrc) bad(`${label} sw.js CACHE is '${c}', source is '${cSrc}' — re-run the build/sync`);
}

// ── 3. every precached file must exist, or install() rejects and offline dies silently ───────────
// caches.addAll() is all-or-nothing: one 404 and the service worker never activates.
const sw = read('sw.js') || '';
const coreBlock = (sw.match(/const CORE\s*=\s*\[([\s\S]*?)\]/) || [])[1] || '';
const core = [...coreBlock.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
for (const base of ['www', 'ios/App/App/public']) {
  if (!fs.existsSync(R(base))) continue;
  const missing = core.filter(f => !fs.existsSync(path.join(R(base), f)));
  if (missing.length) bad(`${base}/ is missing precached ${missing.join(', ')} — caches.addAll() will reject and offline support dies with no error`);
  else good(`${base}/ has all ${core.length} precached files`);
}

// ── 4. iOS submission metadata ───────────────────────────────────────────────────────────────────
const plist = read('ios/App/App/Info.plist');
if (plist) {
  const NEEDED = ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription', 'NSHealthShareUsageDescription',
                  'NSHealthUpdateUsageDescription', 'NSLocationWhenInUseUsageDescription', 'NSFaceIDUsageDescription'];
  const absent = NEEDED.filter(k => !plist.includes(k));
  // A missing usage string does not warn — iOS TERMINATES the app the moment the API is touched.
  if (absent.length) bad(`Info.plist is missing ${absent.join(', ')} — iOS terminates the app when that API is touched`);
  else good(`all ${NEEDED.length} usage descriptions present`);
  if (!plist.includes('ITSAppUsesNonExemptEncryption')) soft('ITSAppUsesNonExemptEncryption not set — Apple will ask about export compliance on every upload');
  if (!plist.includes('UILaunchStoryboardName')) bad('no launch storyboard — the app will letterbox instead of filling the screen');
}

const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
if (pbx) {
  const mv = (pbx.match(/MARKETING_VERSION = ([^;]+);/) || [])[1];
  const cv = (pbx.match(/CURRENT_PROJECT_VERSION = ([^;]+);/) || [])[1];
  good(`iOS version ${mv} (build ${cv}) — App Store Connect rejects a build number it has already seen`);
}

// ── 5. stale artefacts that can be uploaded by accident ─────────────────────────────────────────
const ipa = 'build/export/ToTry.ipa';
if (fs.existsSync(R(ipa))) {
  const age = Math.round((Date.now() - fs.statSync(R(ipa)).mtimeMs) / 86400000);
  soft(`${ipa} exists and is ${age} day(s) old — it does NOT contain the current build. Delete it or archive fresh; Transporter will upload it without complaint`);
}

console.log('');
if (fail) console.log(`✗ ${fail} problem(s)${warn ? `, ${warn} warning(s)` : ''} — do not archive yet\n`);
else console.log(`✓ ready to archive${warn ? ` (${warn} warning(s) above)` : ''}\n`);
process.exit(fail ? 1 : 0);
