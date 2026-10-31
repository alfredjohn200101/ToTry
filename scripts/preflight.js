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

const os = require('os');
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
  // ASK THE PARSED PLIST, NOT THE RAW TEXT. `!plist.includes(k)` is a substring test: it never asks
  // for the key's VALUE, so an empty `<string></string>` satisfied it — and Apple REJECTS a blank
  // purpose string, which means this guard could pass a build that review then bounces. A key
  // sitting inside an XML comment satisfied it too. `plutil -convert json` gives real values.
  let parsed = null;
  try {
    parsed = JSON.parse(require('child_process')
      .execFileSync('plutil', ['-convert', 'json', '-o', '-', 'ios/App/App/Info.plist'], { encoding: 'utf8' }));
  } catch (e) { parsed = null; }
  if (!parsed) {
    bad('Info.plist could not be parsed by plutil — the usage-description checks below cannot run, ' +
        'so this is a refusal to report rather than a pass');
  } else {
    const absent = NEEDED.filter(k => !(k in parsed));
    // A missing usage string does not warn — iOS TERMINATES the app the moment the API is touched.
    if (absent.length) bad(`Info.plist is missing ${absent.join(', ')} — iOS terminates the app when that API is touched`);
    else {
      // AND THE VALUE HAS TO BE A REAL SENTENCE. A present-but-empty string is the shape the
      // substring test could not see, and it is a review rejection rather than a crash.
      const blank = NEEDED.filter(k => !String(parsed[k] || '').trim());
      const terse = NEEDED.filter(k => String(parsed[k] || '').trim().length > 0 &&
                                       String(parsed[k] || '').trim().length < 20);
      if (blank.length) bad(`Info.plist has ${blank.join(', ')} present but EMPTY — App Review rejects a blank purpose string`);
      else if (terse.length) bad(`Info.plist has ${terse.join(', ')} under 20 characters — a purpose string has to say what the app does with it`);
      else good(`all ${NEEDED.length} usage descriptions present, non-empty and explanatory`);
    }
  }
  // AND THE LIST ITSELF HAS TO BE COMPLETE. This guarded SIX of the seven strings that actually
  // ship, and the one it missed was NSPhotoLibraryAddUsageDescription — the string iOS demands
  // before an app may SAVE to the photo library, which is exactly the capability the App Privacy
  // answer sheet had just been corrected to declare. A hardcoded list cannot notice a key that is
  // added later, so the plist is asked what it carries and the list is required to cover all of
  // it. Found 10 Oct 2026 while reviewing the commit that added the manifest cross-check above.
  {
    // AND THE CENSUS MUST SEE A NON-`NS` PURPOSE STRING. `/NS[A-Za-z]*UsageDescription/` cannot see
    // Apple's `NFCReaderUsageDescription`, which carries no NS prefix — so it was invisible to the
    // census AND, being absent from NEEDED, invisible to the presence check: a purpose string the
    // app could add later and nothing here would guard. Asked of the PARSED keys now, which also
    // means a key inside an XML comment is no longer counted as shipped.
    const shipped = parsed
      ? Object.keys(parsed).filter(k => /UsageDescription$/.test(k))
      : Array.from(new Set((plist.match(/[A-Za-z]*UsageDescription/g) || [])));
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
          CoarseLocation: 'Location', SensitiveInfo: 'Sensitive Info',
          // Apple documents these SEPARATELY and documents no combined key (35 values, read from
          // its own docs JSON on 31 Oct 2026 and pinned in test/apple-privacy-types.json). The
          // manifest declared `HealthAndFitness` for 300+ versions, which maps to no category at
          // all — so it declared NO health data while the binary links HealthKit. `HealthAndFitness`
          // is deliberately NOT kept here as an alias: `unlabelled` below fails on an unknown type,
          // so dropping it is what makes a regression visible instead of silently relabelled.
          Health: 'Health', Fitness: 'Fitness',
          PhotosorVideos: 'Photos or Videos', OtherUserContent: 'Other User Content',
          OtherFinancialInfo: 'Other Financial Info', ProductInteraction: 'Product Interaction',
          CrashData: 'Crash Data',
        };
        const unlabelled = types.filter(t => !LABEL[t]);
        const undeclared = types.filter(t => LABEL[t] && !doc.includes(LABEL[t]));
        if (unlabelled.length) soft(`PrivacyInfo.xcprivacy declares ${unlabelled.join(', ')}, which this check has no label for — add it to LABEL in preflight.js and to APP-PRIVACY.md`);
        if (undeclared.length) bad(`APP-PRIVACY.md does not mention ${undeclared.map(t => LABEL[t]).join(', ')}, which the shipped privacy manifest DOES declare — the form would be filled from the doc and under-declare`);
        else good(`the privacy manifest's ${types.length} collected types all appear in APP-PRIVACY.md`);

        // AND THE SHEET THE FORM IS ACTUALLY FILLED FROM. APP-PRIVACY.md is the reasoning;
        // APP-STORE-LISTING.md is the thing somebody reads while ticking boxes in App Store
        // Connect — and it said "Ten types, all linked to the user", omitted Photos entirely, and
        // had done since the food camera started transmitting. Checking only the first file is how
        // that survived: it mentioned Photos, the listing did not, and nothing compared them.
        const listPath = path.join(ROOT, 'APP-STORE-LISTING.md');
        if (!fs.existsSync(listPath)) soft('APP-STORE-LISTING.md is missing — the App Privacy answers are filled from it');
        else {
          const list = fs.readFileSync(listPath, 'utf8');
          const missingFromList = types.filter(t => LABEL[t] && !list.includes(LABEL[t]));
          if (missingFromList.length) bad(`APP-STORE-LISTING.md — the sheet the App Privacy form is filled from — does not mention ${missingFromList.map(t => LABEL[t]).join(', ')}, which the shipped manifest declares. Ticking the boxes from it would UNDER-DECLARE.`);
          else good(`and all ${types.length} appear in APP-STORE-LISTING.md, the sheet the form is filled from`);

          // THE LINK FLAG IS A SEPARATE ANSWER AND IT IS NOT THE SAME FOR EVERY TYPE. Four of the
          // eleven are NOT linked to the user; the sheet said all of them were, which over-declares
          // three and is simply wrong about the fourth.
          const blocks = man.split('<dict>');
          const notLinked = [];
          for (const b of blocks) {
            const m = /NSPrivacyCollectedDataType<\/key>\s*<string>NSPrivacyCollectedDataType(\w+)<\/string>/.exec(b);
            if (!m) continue;
            if (/NSPrivacyCollectedDataTypeLinked<\/key>\s*<false\/>/.test(b)) notLinked.push(m[1]);
          }
          if (!notLinked.length) soft('no NOT-linked data types parsed — if the manifest really has none, delete this check rather than leaving one that cannot fire');
          else {
            const unflagged = notLinked.filter(t => {
              const lab = LABEL[t]; if (!lab) return false;
              const i = list.indexOf(lab); if (i < 0) return true;
              return !/NOT linked/i.test(list.slice(i, i + 160));
            });
            if (unflagged.length) bad(`APP-STORE-LISTING.md does not mark ${unflagged.map(t => LABEL[t]).join(', ')} as NOT linked to the user, which is what the shipped manifest says — the form would over-declare`);
            else good(`and the ${notLinked.length} NOT-linked types are marked as such (over-declaring is still a wrong answer)`);
          }
        }
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

// AND THE ARCHIVES ORGANIZER ACTUALLY OFFERS YOU. Twice in two days an archive sat in
// ~/Library/Developer/Xcode/Archives that built cleanly, would have uploaded cleanly, and carried a
// CRISIS-PATH REGRESSION the repo had already fixed — once seven devotional false positives, once a
// fuel-plan gate that let a disclosure through to the model. Organizer lists them by name and date
// and tells you nothing about which bundle is inside, so the only thing standing between a correct
// upload and a regression was a human remembering. This reads the web bundle out of each archive and
// compares it to the repo, which is the same "hash the file, not the label" rule the iOS/Android
// parity checks above are built on.
try {
  // ABSOLUTE paths, so preflight's own `read()` cannot be used — it resolves repo-relative and
  // returned null for every one of these, which made `build` null for every archive, left
  // `sameBuild` empty, and printed NOTHING. The fourth silent no-op of the day, in the check added
  // because of silent no-ops.
  const rdAbs = f => { try { return fs.readFileSync(f, 'utf8'); } catch (_) { return null; } };
  const shaAbs = f => { const t = rdAbs(f); return t == null ? null : crypto.createHash('sha256').update(t).digest('hex'); };
  const AR = path.join(os.homedir(), 'Library', 'Developer', 'Xcode', 'Archives');
  if (fs.existsSync(AR) && hSrc) {
    // ONLY the archives that could plausibly be uploaded AS THIS BUILD. Warning about every
    // historical archive is cry-wolf — an August build SHOULD differ — and a check people learn to
    // ignore is worse than no check. The hazard is two archives both stamped the current
    // CFBundleVersion where only one carries the current bundle, which is exactly what sat in
    // Organizer twice in two days.
    // A NAMED COST, NOT AN OVERSIGHT: the moment CURRENT_PROJECT_VERSION is bumped, a superseded
    // archive stamped the OLD build stops being compared and this prints a green line. If that old
    // build was never uploaded, App Store Connect would still accept it, so it remains uploadable
    // and is no longer flagged. Keeping it flagged means warning about every historical archive,
    // which is the cry-wolf shape above — and after a bump Organizer at least shows a DIFFERENT
    // build number beside it, so the two are no longer confusable at a glance, which is the
    // specific confusion this check exists for. A known cost on the record beats a clean-looking
    // check nobody reads.
    // EVERY CURRENT_PROJECT_VERSION, NOT THE FIRST. `.match(/…/)` takes the first hit, and in this
    // pbxproj that line belongs to the DEBUG configuration (line ~344) while the archive is cut
    // -configuration Release (~368). They agree today; a bump applied to one and not the other is
    // exactly the drift worth catching, so a disagreement is reported rather than silently
    // resolved to whichever came first. `([^;]+)` not `(\d+)`, because CFBundleVersion is legally
    // dotted (9.1) and the digit form truncates it to "9" and then matches no archive at all.
    const allV = [...String(pbx || '').matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map(m => m[1].trim());
    const uniqV = [...new Set(allV)];
    if (uniqV.length > 1)
      soft(`project.pbxproj carries more than one CURRENT_PROJECT_VERSION (${uniqV.join(', ')}) — ` +
           'Debug and Release disagree, and the archive is cut from Release');
    const curBuild = uniqV.length ? uniqV[uniqV.length - 1] : null;
    // The bundle id this project ships, so another app's archive at the same small integer build
    // number is not reported as yours. ~/Library/Developer/Xcode/Archives is shared by every Xcode
    // project on the machine.
    const idm = String(pbx || '').match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/);
    const ourId = idm ? idm[1].trim().replace(/^["']|["']$/g, '') : null;
    const found = [];
    const ipas = [];
    let unreadable = 0;
    for (const day of fs.readdirSync(AR)) {
      // PER-ENTRY, so one bad entry cannot kill the whole check. A dangling symlink or a day folder
      // without read permission made statSync/readdirSync throw, the outer catch swallowed it, and
      // the check printed nothing — silently guarding nothing, which is the failure it exists for.
      // Symlinking archives to an external drive is an ordinary thing to do.
      let dd, entries;
      try {
        dd = path.join(AR, day);
        if (!fs.statSync(dd).isDirectory()) continue;
        entries = fs.readdirSync(dd);
      } catch (_) { unreadable++; continue; }
      for (const a of entries) {
       try {
        // THE .ipa IN THE SAME FOLDER. The documented export writes ToTry-<v>-build<n>.ipa straight
        // into this directory, and it is the artefact Transporter uploads — but the walk filtered
        // on `.xcarchive` and never looked at it. An .ipa is a zip, so its bundle cannot be hashed
        // here without unzipping; what IS knowable is whether its sibling archive was judged stale,
        // which is the case that matters because they are exported together.
        if (a.endsWith('.ipa')) { ipas.push({ label: day + '/' + a, stem: a.replace(/\.ipa$/, '') }); continue; }
        if (!a.endsWith('.xcarchive')) continue;
        const inner = path.join(dd, a, 'Products', 'Applications');
        if (!fs.existsSync(inner)) continue;
        // THE ARCHIVE'S OWN Info.plist, which is XML. The .app's is an Apple BINARY property list,
        // so the first version of this regexed it for <key>CFBundleVersion</key>, matched nothing,
        // and the whole check silently found zero archives and printed nothing at all — a no-op
        // under a comment claiming it guards an upload, which is the defect class this very commit
        // is about. The zero-found branch below exists so it can never fail that way quietly again.
        const b = (rdAbs(path.join(dd, a, 'Info.plist')) || '')
          .match(/<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/);
        const aid = (rdAbs(path.join(dd, a, 'Info.plist')) || '')
          .match(/<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/);
        if (ourId && aid && aid[1] !== ourId) continue;   // another project's archive
        for (const app of fs.readdirSync(inner)) {
          const f = path.join(inner, app, 'public', 'index.html');
          if (!fs.existsSync(f)) continue;
          found.push({ label: day + '/' + a, h: shaAbs(f), build: b ? b[1] : null });
        }
       } catch (_) { unreadable++; }
      }
    }
    if (unreadable) soft(`${unreadable} entr(y/ies) under Xcode Archives could not be read (dangling ` +
                         'symlink or permissions) — they were skipped, not compared');
    const sameBuild = curBuild ? found.filter(x => x.build === curBuild) : [];
    const stale = sameBuild.filter(x => x.h !== hSrc);
    if (stale.length)
      soft(`${stale.length} archive(s) stamped build ${curBuild} do NOT carry the current bundle — ` +
           stale.map(x => x.label).join(', ') + '. Organizer shows the name and the date, never which ' +
           'bundle is inside; move it out before you open it.');
    else if (sameBuild.length)
      good(`the ${sameBuild.length} archive(s) stamped build ${curBuild} carry the current bundle`);
    else if (!found.length && !unreadable)
      good('no archive of this app in Xcode Archives yet — nothing to compare');
    else if (!found.length)
      soft('could not read any archive in Xcode Archives — THE CHECK IS WRONG, NOT THE ARCHIVES. ' +
           'It found none to compare, so it is guarding nothing.');
    else if (found.some(x => !x.build))
      // THE ZERO-FOUND GUARD WATCHED THE BUNDLE READ, NOT THE BUILD READ. `found` is populated from
      // the bundle; `sameBuild` from the build. If every archive's own Info.plist fails to parse,
      // `found` is full, `sameBuild` is empty, and the branch below printed a GREEN TICK over a
      // stale archive — the same silence the whole check exists to prevent, one field along.
      soft(`${found.filter(x => !x.build).length} archive(s) have an unreadable CFBundleVersion — ` +
           'THE CHECK IS WRONG, NOT THE ARCHIVES. They were not compared, so a stale one would not ' +
           'have been named.');
    else
      good(`no archive in Xcode Archives is stamped build ${curBuild} yet (${found.length} older one(s) ignored)`);

    // And the .ipa beside a stale archive is stale with it — they are exported together.
    const staleStems = new Set(stale.map(x => x.label.replace(/\.xcarchive$/, '')));
    const staleIpas = ipas.filter(i => staleStems.has(i.label.replace(/\.ipa$/, '')));
    if (staleIpas.length)
      soft(`and the .ipa exported beside ${staleIpas.length === 1 ? 'it' : 'them'} is stale too — ` +
           staleIpas.map(i => i.label).join(', ') + '. That is the file Transporter uploads.');
  }
} catch (_) { /* the archives dir is the user's, never a build failure */ }

console.log('');
if (fail) console.log(`✗ ${fail} problem(s)${warn ? `, ${warn} warning(s)` : ''} — do not archive yet\n`);
else console.log(`✓ ready to archive${warn ? ` (${warn} warning(s) above)` : ''}\n`);
process.exit(fail ? 1 : 0);
