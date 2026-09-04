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

// ── 0. index.html must still be exactly what src/ assembles to ───────────────────────────────────
// index.html is generated from src/ (see scripts/build-index.js). Editing it directly is not an error
// anyone would notice until the next build silently discarded the change — so this checks first, and
// says which file to edit instead.
try {
  const { execFileSync } = require('child_process');
  execFileSync(process.execPath, [R('scripts/build-index.js'), '--verify'], { stdio: 'pipe' });
  good('index.html matches what src/ assembles to');
} catch (e) {
  const out = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '');
  bad('index.html does NOT match src/ — edit the module under src/app/ and run `npm run build:index`, do not edit index.html directly');
  const where = (out.match(/DIFFERS at [^\n]*/) || [''])[0];
  if (where) console.log('     ' + where);
}

// ── 1. the copies of the app must be the same BYTES, not merely the same version ─────────────────
// This compared APP_VERSION strings and reported the result as "the iOS bundle matches the source".
// Those are different claims. Every edit made without bumping the version — which is most edits, for
// most of a release's life — left the platform bundles arbitrarily stale while this printed a tick.
// Caught 5 Sep 2026 with ios/ and android/ 3 commits behind a v576 source, both reading v576, both
// green here. The version is a label a human types; the hash is the file. Compare the file.
const crypto = require('crypto');
const SRC = 'index.html', WWW = 'www/index.html',
      IOS = 'ios/App/App/public/index.html',
      AND = 'android/app/src/main/assets/public/index.html';
const sha = f => { const t = read(f); return t == null ? null : crypto.createHash('sha256').update(t).digest('hex'); };
const short = h => h ? h.slice(0,12) : '(none)';
const vSrc = appVersion(read(SRC)), vWww = appVersion(read(WWW)), vIos = appVersion(read(IOS));
const hSrc = sha(SRC), hWww = sha(WWW), hIos = sha(IOS), hAnd = sha(AND);

if (!vSrc) bad(`could not read APP_VERSION from ${SRC}`);
else if (!hWww) bad('www/ is not built — run `npm run build:www`');
else if (hWww !== hSrc) bad(`www/ is NOT the source — ${short(hWww)} vs ${short(hSrc)}${vWww !== vSrc ? ` (and ${vWww} vs ${vSrc})` : ' (same version, different bytes — an edit after the last build)'} — run \`npm run build:www\``);
else good(`www/ is byte-identical to the source (${vSrc}, ${short(hSrc)})`);

if (hSrc && !hIos) soft('no iOS bundle yet — run `npm run sync` before archiving');
else if (hSrc && hIos !== hSrc) {
  bad(`the iOS bundle is NOT the source — ${short(hIos)} vs ${short(hSrc)}. AN ARCHIVE RIGHT NOW WOULD SHIP ${vIos || 'that bundle'}. Run \`npm run sync\``);
} else if (hIos) good(`the iOS bundle is byte-identical to the source (${vIos}, ${short(hSrc)})`);

// Android was never checked here at all — the gap that let its bundle sit seven versions behind.
if (hSrc && !hAnd) soft('no Android bundle yet — run `npm run sync` (cap sync with no platform, or android rots)');
else if (hSrc && hAnd !== hSrc) {
  bad(`the Android bundle is NOT the source — ${short(hAnd)} vs ${short(hSrc)}. Run \`npm run sync\` — \`cap sync ios\` does not touch it`);
} else if (hAnd) good(`the Android bundle is byte-identical to the source (${short(hSrc)})`);

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
