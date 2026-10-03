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
  const src = DAY_PRIMITIVES.concat(names).map(extractFn).join('\n\n');
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
function code(t){ return String(t == null ? html : t).replace(/\/\/[^\n]*/g, ''); }

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
];
function voiceFingerprint(htmlArg){
  const src = htmlArg || html;
  const parts = VOICE_PARTS.map(([d, e]) => {
    const i = src.indexOf(d); if(i < 0) return '';
    const j = src.indexOf(e, i); return j < 0 ? '' : src.slice(i, j + e.length);
  });
  return { sha: require('crypto').createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0,16),
           bytes: parts.reduce((n, x) => n + x.length, 0),
           missing: VOICE_PARTS.filter((_, k) => !parts[k]).map(([d]) => d) };
}

module.exports = { voiceFingerprint, extractFn, load, eq, approx, ok, section, report, html, code, defer };
