// ── ASSEMBLE index.html FROM src/ ────────────────────────────────────────────────────────────────
// Run with `npm run build:index`. Concatenates the shell and the app modules into index.html, which
// stays the artifact GitHub Pages serves and the one build:www copies into www/.
//
// WHY. index.html is 42,800 lines and 2.89MB in one file, and that is now measurably the thing that
// generates defects here: two adversarial passes in one day produced 57 confirmed findings, and the
// expensive ones were all the same shape — a class fixed in one place and missed in three others. The
// durable answer was a single shared accessor SIX times in that day (safeJournal, syncIdOf,
// safeMornings, isFaithHabitName, nutPromptBlock, journalCrisisOf). That is a structural answer being
// applied by hand, repeatedly, because no boundary exists to apply it for you.
//
// THE RULE THIS SCRIPT ENFORCES: the assembled output must be BYTE-IDENTICAL to what shipped before the
// module was extracted. Every extraction is verified that way (`npm run build:index -- --verify`), so a
// split can never quietly change behaviour. Concatenation only: no minifying, no reordering, no
// transformation of any kind. The single file works; this must not break it to make it pretty.
//
// MODULES are listed in ORDER below and concatenated in that order. The app is one script with shared
// top-level scope and no module system, so order is semantics — a function hoists, a `const` does not.
// Anything moved must keep its position relative to the code that reads it at load time.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const R = (...p) => path.join(ROOT, ...p);

// The order here IS the order in the file. Do not sort.
const MODULES = [
  'src/app/00-boot.js',   // storage helpers, ls(), boot, auth, guest entry
  'src/app/01-sync.js',   // the durable outbox, pullFromCloud, the union, tombstones
  'src/app/02-native.js', // Notify, haptics, HealthKit, the app lock — the Capacitor-only paths
  'src/app/03-person.js', // the whole-person state: sex, cycle, getLifeState, lifeStateBrief, the voice
  'src/app/04-fight.js',
  'src/app/05-moment.js',
  'src/app/06-train.js',
  'src/app/07-platform.js',
  'src/app/08-voice.js',
  'src/app/09-fight-deep.js',
  'src/app/10-habits.js',
  'src/app/11-scripture.js',
  'src/app/12-journal.js',
  'src/app/13-body.js',
  'src/app/14-nourish.js',
  'src/app/15-giving.js',
  'src/app/16-money.js',
  'src/app/17-fuelplan.js',
  'src/app/18-money-deep.js',
  'src/app/19-workout.js',
  'src/app/20-morning.js',
  'src/app/21-content-engine.js',
  'src/app/22-train-deep.js',
  'src/app/23-evening.js',
  'src/app/24-review.js',
  'src/app/25-soul.js',
  'src/app/26-share.js',
  'src/app/27-settings.js',
  'src/app/28-init.js',
  'src/app/29-goals-prayer.js',
  'src/app/app.js',       // everything not yet extracted
];

function assemble() {
  const head = fs.readFileSync(R('src/shell-head.html'), 'utf8');
  const tail = fs.readFileSync(R('src/shell-tail.html'), 'utf8');
  const body = MODULES.map(m => fs.readFileSync(R(m), 'utf8')).join('');
  return head + body + tail;
}

const crypto = require('crypto');
const sha = (v) => crypto.createHash('sha256').update(v, 'utf8').digest('hex').slice(0, 12);
const bytes = (v) => Buffer.byteLength(v, 'utf8');

const out = assemble();
const target = R('index.html');
const verify = process.argv.includes('--verify');

if (verify) {
  const current = fs.readFileSync(target, 'utf8');
  // Compared as a string AND as a hash of the bytes. String .length counts UTF-16 code units, not
  // bytes, and this file is full of multi-byte characters — reporting one as the other in the very
  // script whose job is exactness would be the kind of imprecision that hides a real difference.
  if (current === out && sha(current) === sha(out)) {
    console.log(`✓ identical — sha256:${sha(out)}, ${bytes(out).toLocaleString()} bytes, ${MODULES.length} module(s)`);
    process.exit(0);
  }
  // Say WHERE, not just that it differs — a 2.9MB diff is unreadable otherwise.
  let i = 0;
  while (i < Math.min(current.length, out.length) && current[i] === out[i]) i++;
  const line = current.slice(0, i).split('\n').length;
  console.error(`✗ DIFFERS at byte ${i.toLocaleString()} (line ${line})`);
  console.error(`  index.html: ${JSON.stringify(current.slice(i, i + 90))}`);
  console.error(`  assembled : ${JSON.stringify(out.slice(i, i + 90))}`);
  console.error(`  bytes: ${bytes(current).toLocaleString()} vs ${bytes(out).toLocaleString()}  |  sha: ${sha(current)} vs ${sha(out)}`);
  process.exit(1);
}

fs.writeFileSync(target, out);
console.log(`index.html assembled: ${bytes(out).toLocaleString()} bytes, sha256:${sha(out)}, from ${MODULES.length} module(s)`);
