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
  const re = new RegExp('function\\s+' + name.replace(/[$]/g, '\\$&') + '\\s*\\(', 'g');
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

// Define the named functions (+ any provided globals/stubs) in one scope and return them.
function load(names, globals){
  const src = names.map(extractFn).join('\n\n');
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
function report(){
  if(failures.length){ console.log('\nFAILURES:'); failures.forEach(f => console.log(f)); }
  console.log(`\n${failed ? '✗' : '✓'} ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

module.exports = { extractFn, load, eq, approx, ok, section, report, html };
