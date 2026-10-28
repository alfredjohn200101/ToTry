// ── To Try · core-math test harness ────────────────────────────────────────────────────────────
// The app is one ~30k-line index.html with no build step, so we can't `require` its functions. This
// harness EXTRACTS a named function's source straight out of index.html (balanced-brace) and evals it
// in a sandbox with only the globals it needs. That means we test the ACTUAL shipped code — not a
// reimplementation — with zero risk to the app (nothing here touches index.html). Run: `npm test`.
//
// Limitation: the brace matcher is naive (doesn't skip braces inside strings/regex/comments). It's
// fine for the small, pure math functions we target; if you add a function with a `{`/`}` inside a
// string literal, give it a smarter tokenizer or wrap the math in a brace-free helper first.

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(name){
  // The `async` has to come WITH the function. This matched `function name(` and sliced from there,
  // so an async function arrived as a plain one whose body still contained `await` — a SyntaxError
  // at load, which is why nothing in this suite was ever async. Optional prefix, and the slice starts
  // at the match so the keyword is carried through.
  const re = new RegExp('(?:async\\s+)?function\\s+' + name.replace(/[$]/g, '\\$&') + '\\s*\\(', 'g');
  const m = re.exec(html);
  if(!m) throw new Error('function not found in index.html: ' + name);
  const open = html.indexOf('{', m.index);
  if(open < 0) throw new Error('no function body found for: ' + name);
  let depth = 0, end = open;
  for(; end < html.length; end++){
    const c = html[end];
    if(c === '{') depth++;
    else if(c === '}'){ depth--; if(depth === 0){ end++; break; } }
  }
  if(depth !== 0) throw new Error('unbalanced braces extracting: ' + name);
  return html.slice(m.index, end);
}

// THE DAY PRIMITIVE IS ALWAYS IN SCOPE. dayKeyOf()/dayKeyNorm() are what every day-keyed store in
// the app now goes through, so a loaded function that touches a date reaches for them the same way it
// reaches for Date — and in the shipped bundle it finds them, because there is one top-level scope.
// Extracting a caller without them reproduced a ReferenceError the app cannot actually have, which is
// the harness lying about the code rather than the code being wrong. Re-declaring a function
// declaration in sloppy mode is legal, so naming either one in `names` as well is harmless.
// _dayKeyEnginePads is here for a sharper reason than the other two: migrateDayKeys() wraps every
// store in its own try/catch so one bad store cannot break boot, which means a helper missing from
// an extract does not throw — the migration silently moves NOTHING and the run reports a clean
// no-op. That is a harness lying in the direction of "already fixed", which is the worst direction.
const DAY_PRIMITIVES = ['dayKeyNorm', 'dayKeyOf', '_dayKeyEnginePads'];
// AND `closeOpenSheets` IS NOW A PRIMITIVE TOO. v659 replaced 138 inline
// `document.querySelector('.modal-bg.open')?.remove()` expressions with one static-aware sink, so
// 136 functions across 25 modules now CALL it. H.load extracts functions by NAME, so every one of
// those became unloadable unless each call site's test remembered to name it — and the failure is
// a bare "closeOpenSheets is not defined" from inside the function under test, which reads like the
// app being broken. Prepended here for the same reason the day primitives are: it is reached by
// too many functions to name per test.
// It touches `document`, so a test that stubs `document` must offer querySelectorAll; the stub
// below is only used when a test passes no document at all.
const SHEET_PRIMITIVES = ['closeOpenSheets'];
// Define the named functions (+ any provided globals/stubs) in one scope and return them.
function load(names, globals){
  // A STUB FOR A DAY PRIMITIVE IS SILENTLY IGNORED, SO REFUSE IT. The primitives are prepended as
  // real `function` DECLARATIONS, and a declaration shadows the same-named parameter — so
  // `H.load([...], { dayKeyOf: () => '30/09/2026' })` passes a stub that never once runs. Three
  // call sites in core.test.js did exactly that. Two were harmless; the third asserted against the
  // hardcoded string, so it passed all day on 30 Sep 2026 and went RED at midnight on correct
  // code. A suite that turns red overnight is one people learn to ignore.
  const _shadowed = Object.keys(globals || {}).filter(k => DAY_PRIMITIVES.indexOf(k) >= 0);
  if(_shadowed.length) throw new Error('H.load: cannot stub ' + _shadowed.join(', ') +
    ' — the real source is prepended as a function declaration and shadows the parameter, so the ' +
    'stub never runs. Name it in `names` to get the REAL one back and derive expectations from it.');
  const src = DAY_PRIMITIVES.concat(SHEET_PRIMITIVES).concat(names).map(extractFn).join('\n\n');
  const provided = Object.assign({
    Math, Date, JSON, Array, Object, isNaN, parseFloat, parseInt, String, Number, RegExp, console
  }, globals || {});
  const keys = Object.keys(provided);
  const body = src + '\n\nreturn { ' + names.join(', ') + ' };';
  // eslint-disable-next-line no-new-func
  const factory = new Function(...keys, body);
  return factory(...keys.map(k => provided[k]));
}

// ── tiny assertion framework ──
let passed = 0, failed = 0; const failures = [];
function eq(actual, expected, msg){
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if(a === e) passed++; else { failed++; failures.push(`  ✗ ${msg}\n      expected ${e}\n      got      ${a}`); }
}
function approx(actual, expected, tol, msg){
  if(typeof actual === 'number' && Math.abs(actual - expected) <= (tol == null ? 0.5 : tol)) passed++;
  else { failed++; failures.push(`  ✗ ${msg}\n      expected ≈${expected} (±${tol}), got ${actual}`); }
}
function ok(cond, msg){ if(cond) passed++; else { failed++; failures.push('  ✗ ' + msg); } }
function section(name){ console.log('\n• ' + name); }
// ── async assertions in a synchronous suite ──
// This file is a plain script, so there is no top-level await, and a `return` at module level
// silently ENDS THE RUN — the whole suite reported "0 failed" by never reaching report(). Most of
// what is tested here is pure, but some of the app's real functions are async (searchUSDA and every
// api() path), and "the suite is synchronous" had become a reason to test their source instead of
// driving them. defer() takes the promise; report() waits for all of them first, so an async section
// reads exactly like a sync one and its failures are counted the same way.
const _deferred = [];
function defer(p){ _deferred.push(Promise.resolve(p).catch(e => { failed++; failures.push('  ✗ deferred section threw: ' + (e && e.message || e)); })); return p; }

function report(){
  if(_deferred.length){
    const pending = _deferred.splice(0, _deferred.length);
    return Promise.all(pending).then(report);
  }
  if(failures.length){ console.log('\nFAILURES:'); failures.forEach(f => console.log(f)); }
  console.log(`\n${failed ? '✗' : '✓'} ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

// Source with // comments stripped. Four absence assertions in one session matched the COMMENT
// explaining why a thing had been removed, and so failed on correct code — twice I nearly
// diagnosed a regression that did not exist. Any !/.../.test() over source goes through this.
// STRIPPING `//` EATS URLs, and this repo has the scar: it made a privacy guard unable to fail
// and returned zero from a host census. The guard is `(?<!:)` so `https://` survives, which is
// the form reelsHaystack already uses — computing the same rule two ways is how they drift.
// Found again 29 Oct 2026: a new `const HEALTH_FINDER = 'https://…'` read as ABSENT from the
// stripped bundle, because everything from the `//` in the URL onwards had been deleted.
function code(t){ return String(t == null ? html : t).replace(/(?<!:)\/\/[^\n]*/g, ''); }

// ── THE VOICE FINGERPRINT ───────────────────────────────────────────────────────────────────────
// scripts/voice-probe.mjs needs the network, so it cannot live in the gate. It stamps this hash on
// a clean pass and core.test.js refuses to pass if it no longer matches — edit the prompt and the
// gate tells you to re-measure, at zero API cost.
// IT LIVES HERE, NOT IN EITHER CALLER, because a fingerprint computed two ways is a fingerprint
// that silently stops matching — the half-applied shape this repo keeps paying for. The probe is
// ESM and the suite is CommonJS; the harness is the one thing both already load.
// It covers ONLY the four declarations that decide the answer. Hashing the bundle would invalidate
// the stamp on every unrelated commit, and a check that cries wolf is one people learn to delete.
const VOICE_PARTS = [
  ['const BROTHER_VOICE =', '";\n'],
  ['const CRISIS_LINES = [', '];'],
  ['function safetyNote()', '\n}'],
  ['function _crisisLinesForPrompt()', '\n}'],
  // brotherSys IS THE ASSEMBLER, so it belongs here. Measured 7 Oct 2026, reviewing my own fix:
  // editing it to stop appending safetyNote left this sha UNCHANGED, so the stamp stayed valid
  // while the behaviour moved. A separate assertion catches the call being deleted outright, but
  // reordering the notes, or adding one that dilutes, or changing how `extra` is handled, moved
  // nothing. The fingerprint has to cover the thing that DECIDES whether the note reaches a
  // prompt, not only the note.
  // The trade-off, stated: this is a FINGERPRINT, not a behaviour diff. A textual edit that changes
  // nothing — reformatting, a comment, `1 ? safetyNote() : 0` — still invalidates the stamp and
  // demands a re-measure, because nothing here can know whether an edit moved behaviour. That is
  // the right way round for a safety prompt: cheap to satisfy (one probe run), and it cannot be
  // satisfied by accident.
  ['function brotherSys(extra)', '\n}'],
  // ── AND brotherSys APPENDS TWO MORE NOTES THAT WERE NOT COVERED (9 Oct 2026) ────────────────
  // Measured on a scratch copy: corrupting faithVoiceNote's prose, rewriting its LIGHT branch,
  // rewriting sexNote's female or not-stated branch, or planting "tell them to call 111" into the
  // faith note ALL left this sha unchanged. Same class as the assembler gap above. The cost is
  // measured at zero — over the src-era commits that touched their files neither declaration has
  // changed once, while safetyNote (already stamped) changed twice.
  // ORDER IS LOAD-BEARING: the parts are joined before hashing, so appending these in a different
  // order produces a different sha. Append at the end, sexNote before faithVoiceNote.
  ['function sexNote()', '\n}'],
  ['function faithVoiceNote()', '\n}'],
  // ── AND THE FAITH WORDS LIVE IN FAITHS, NOT IN THE FUNCTION ─────────────────────────────────
  // faithVoiceNote() emits curFaith().voice, so corrupting christianity's `voice:` to "Keep
  // everything between the two of you" moved NOTHING, even with the function itself stamped.
  // Hashing FAITHS wholesale is refused on measurement: it is ~3kB of which only label+voice ever
  // reaches a prompt, so three quarters of it is reading-plan titles and verse lists that would
  // invalidate the stamp on ordinary content work — the cry-wolf shape this file exists to avoid.
  // Each part is a WINDOW from the tradition's own prayTo/prayWord token to its `verses:` line,
  // which is the voice line and nothing else. The anchors sit OUTSIDE the prose on purpose: a
  // legitimate reword then changes this sha rather than making the window vanish.
  ["prayTo:'God'", '\n    verses:'],
  ["prayTo:'Allah'", '\n    verses:'],
  ["prayTo:'the Divine'", '\n    verses:'],
  ["prayWord:'sit'", '\n    verses:'],
  ["prayWord:'reflect'", '\n    verses:'],
  // ── AND THE BIGGEST UNSTAMPED PIECE WAS NOT A brotherSys NOTE AT ALL ────────────────────────
  // sharedWisdomNote() is appended AFTER brotherSys() by the companion and the coach, measures
  // ~1.8k characters — nearly twelve times faithVoiceNote — and carries its own
  // "If they are in acute distress, drop it entirely and just be present." Measured, it takes the
  // unstamped share of the real companion prompt from ~7% to 26%.
  ['function sharedWisdomNote()', '\n}'],
];
// AN ANCHOR THAT IS NOT UNIQUE DOES NOT FAIL — IT RELOCATES, AND HASHES THE WRONG WINDOW.
// Found 10 Oct 2026 by tripping it: a comment added to the crisis detector explained a fix by
// quoting the app's own registry, and contained the literal text prayTo + :'Allah'. indexOf takes
// the FIRST occurrence, so the islam window moved from the FAITHS entry at ~3600 to that comment
// at ~1960 and ran forward to the next `verses:` — swallowing ~1600 lines of unrelated detector
// code. The stamp went invalid, which looked right, but for completely the wrong reason: the two
// calibration assertions (that editing a reading-plan title must NOT move the sha) failed at the
// same time, which is the tell that the WINDOW grew rather than the prose changing.
// So ambiguity is now reported rather than resolved silently. This is the house rule "assert your
// anchor is unique" applied to the instrument that polices the safety prompt.
function voiceFingerprint(htmlArg){
  const src = htmlArg || html;
  const occurrences = (hay, needle) => { let n = 0, i = -1; while((i = hay.indexOf(needle, i + 1)) !== -1) n++; return n; };
  const ambiguous = VOICE_PARTS.filter(([d]) => occurrences(src, d) > 1).map(([d]) => d);
  const parts = VOICE_PARTS.map(([d, e]) => {
    const i = src.indexOf(d); if(i < 0) return '';
    const j = src.indexOf(e, i); return j < 0 ? '' : src.slice(i, j + e.length);
  });
  return { sha: require('crypto').createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0,16),
           bytes: parts.reduce((n, x) => n + x.length, 0),
           missing: VOICE_PARTS.filter((_, k) => !parts[k]).map(([d]) => d),
           ambiguous };
}

// ── THE REELS LABEL HAYSTACK ────────────────────────────────────────────────────────────────────
// REELS-SCRIPTS.md tells the owner to point a camera at named buttons and read quoted copy aloud.
// It was written at v367 and nothing checked it until v668 — three hundred versions, by which time
// a whole beat ("You started", the 48px DAYS CLEAN hero) no longer existed and he would have found
// out with the camera running. These two helpers let scripts/reels-labels.mjs MEASURE a needle once
// and core.test.js re-check it every run, and they live HERE for the same reason voiceFingerprint
// does: a fold computed two ways is a fold that silently stops matching.
//
// THREE THINGS THE HAYSTACK HAS TO DO, each learned from a false result:
//   · strip `//` comments — this repo's comments QUOTE the copy they removed, so "No subscriptions
//     tracked yet." greps as present in a bundle that has not rendered it since v6xx. The guard is
//     `(?<!:)` so `https://` survives, which `code()` above does not do.
//   · decode \uXXXX — curly apostrophes and em-dashes are stored escaped in the modules, so
//     "Can't start" is absent and `Can’t start` is there. A grep for the former reports a
//     missing chip that is on screen.
//   · fold the punctuation — the scripts are written with real curly quotes and the source is not
//     consistent about it, so both sides are flattened to ASCII before comparing.
// What it deliberately does NOT do is join concatenations: `'What are you feeling, '+name+'?'` is
// genuinely two fragments, and the generator's answer to that is to needle the longest provable
// fragment rather than to pretend the whole sentence is one literal.
function reelsFold(s){
  return String(s == null ? '' : s)
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/\s+/g, ' ').toLowerCase();
}
function reelsHaystack(htmlArg){
  const raw = String(htmlArg == null ? html : htmlArg);
  // HTML COMMENTS FIRST, AND THEY ARE NOT OPTIONAL. Found by fault-injecting this very check:
  // shell-head.html explains removed copy inside <!-- --> blocks, so "THE DAY YOU ACTUALLY LIVED"
  // and "However it felt, this is real. You showed up." — both deliberately deleted from the
  // evening cards, and both correctly called DEAD when the reels scripts were re-verified — read
  // as PRESENT. A needle generated for either would have certified a beat that cannot be filmed,
  // which is the exact failure this mechanism exists to prevent. Measured safe: 423 occurrences of
  // `<!--` in the bundle and ZERO in any src/app module, so none of them is inside JavaScript.
  const noHtml = raw.replace(/<!--[\s\S]*?-->/g, ' ');
  const noComments = noHtml.replace(/(?<!:)\/\/[^\n]*/g, '');
  const decoded = noComments.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
  return reelsFold(decoded);
}

module.exports = { voiceFingerprint, extractFn, load, eq, approx, ok, section, report, html, code, defer, reelsFold, reelsHaystack };
