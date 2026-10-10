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
  const NEEDED = ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription', 'NSPhotoLibraryAddUsageDescription',
                  'NSHealthShareUsageDescription', 'NSHealthUpdateUsageDescription',
                  'NSLocationWhenInUseUsageDescription', 'NSFaceIDUsageDescription'];
  const absent = NEEDED.filter(k => !plist.includes(k));
  // A missing usage string does not warn — iOS TERMINATES the app the moment the API is touched.
  if (absent.length) bad(`Info.plist is missing ${absent.join(', ')} — iOS terminates the app when that API is touched`);
  else good(`all ${NEEDED.length} usage descriptions present`);
  // AND THE LIST ITSELF HAS TO BE COMPLETE. This guarded SIX of the seven strings that actually
  // ship, and the one it missed was NSPhotoLibraryAddUsageDescription — the string iOS demands
  // before an app may SAVE to the photo library, which is exactly the capability the App Privacy
  // answer sheet had just been corrected to declare. A hardcoded list cannot notice a key that is
  // added later, so the plist is asked what it carries and the list is required to cover all of
  // it. Found 10 Oct 2026 while reviewing the commit that added the manifest cross-check above.
  {
    const shipped = Array.from(new Set((plist.match(/NS[A-Za-z]*UsageDescription/g) || [])));
    const unguarded = shipped.filter(k => NEEDED.indexOf(k) === -1);
    if (unguarded.length) bad(`Info.plist ships ${unguarded.join(', ')} but preflight does not guard it — add it to NEEDED`);
    else good(`and the guard list covers every usage description the plist ships (${shipped.length})`);
  }
  // ── THE PRIVACY MANIFEST AND THE ANSWER SHEET MUST AGREE ──────────────────────────────────
  // PrivacyInfo.xcprivacy ships inside the binary and Apple cross-checks the App Privacy form
  // against it. APP-PRIVACY.md is what a human fills the form FROM. On 10 Oct 2026 they diverged
  // in the direction that matters: the manifest declared eleven collected types and the answer
  // sheet listed ten. The missing one was Photos or Videos, which the food camera really does
  // transmit — so anyone filling the form from the doc would have UNDER-declared. The doc even
  // claimed the two matched exactly, which is how it went unnoticed for ~100 versions.
  // Checked here because this is the script that runs immediately before an archive.
  {
    const man = read('ios/App/App/PrivacyInfo.xcprivacy');
    const doc = read('APP-PRIVACY.md');
    if (!man) bad('ios/App/App/PrivacyInfo.xcprivacy is missing — Apple requires a privacy manifest');
    else if (!doc) soft('APP-PRIVACY.md is missing, so the manifest cannot be cross-checked');
    else {
      const types = [...man.matchAll(/NSPrivacyCollectedDataType<\/key>\s*<string>NSPrivacyCollectedDataType(\w+)<\/string>/g)]
        .map(m => m[1]);
      if (!types.length) bad('no collected data types parsed out of PrivacyInfo.xcprivacy — the check cannot run, so treat it as failing');
      else {
        // the doc writes Apple's human labels; map each manifest type to the words that must appear
        const LABEL = {
          EmailAddress: 'Email Address', Name: 'Name', UserID: 'User ID',
          CoarseLocation: 'Location', HealthAndFitness: 'Health', SensitiveInfo: 'Sensitive Info',
          PhotosorVideos: 'Photos or Videos', OtherUserContent: 'Other User Content',
          OtherFinancialInfo: 'Other Financial Info', ProductInteraction: 'Product Interaction',
          CrashData: 'Crash Data',
        };
        const unlabelled = types.filter(t => !LABEL[t]);
        const undeclared = types.filter(t => LABEL[t] && !doc.includes(LABEL[t]));
        if (unlabelled.length) soft(`PrivacyInfo.xcprivacy declares ${unlabelled.join(', ')}, which this check has no label for — add it to LABEL in preflight.js and to APP-PRIVACY.md`);
        if (undeclared.length) bad(`APP-PRIVACY.md does not mention ${undeclared.map(t => LABEL[t]).join(', ')}, which the shipped privacy manifest DOES declare — the form would be filled from the doc and under-declare`);
        else good(`the privacy manifest's ${types.length} collected types all appear in APP-PRIVACY.md`);
      }
    }
  }

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
