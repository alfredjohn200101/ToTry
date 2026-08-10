// ── To Try · core-math tests ───────────────────────────────────────────────────────────────────
// Guards the exact classes of bug that have actually shipped and burned trust:
//   • food serving scaling  (the 404→1290 double-scale)
//   • streak / clean-days    (the counter the whole Fight leans on)
//   • per-item photo totals  (the Cal-AI-beating logger's math)
// Tests the REAL functions extracted from index.html. Run with `npm test`.

const H = require('./harness');

// ── STREAK / CLEAN-DAYS (viceCleanDays) ──────────────────────────────────────────────────────────
H.section('viceCleanDays — the streak counter');
{
  const { viceCleanDays } = H.load(['viceCleanDays']);
  const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
  H.eq(viceCleanDays({ startDate: daysAgo(5) }), 5, '5 days since startDate → 5');
  H.eq(viceCleanDays({ startDate: daysAgo(0) }), 0, 'started today → 0');
  H.eq(viceCleanDays({ startDate: null }), 0, 'no startDate → 0 (not NaN)');
  H.eq(viceCleanDays({}), 0, 'empty vice → 0');
  H.eq(viceCleanDays({ startDate: new Date(Date.now() + 86400000).toISOString() }), 0, 'future startDate clamps to 0, never negative');
  H.eq(viceCleanDays({ lastLoss: daysAgo(3) }), 3, 'falls back to lastLoss when no startDate');
}

// ── FOOD SCALING (applyFoodOverride) — guards the double-scale trust bug ──────────────────────────
H.section('food serving scaling — the 404→1290 double-scale guard');
{
  const _FIX_KEYS = ['cal','pro','carb','fat','fiber','sugar','sodium','potassium'];
  const { applyFoodOverride } = H.load(['applyFoodOverride'], {
    getFoodOverride: f => (f && f.__ov) ? f.__ov : null,
    _FIX_KEYS
  });
  // A real case: 126 kcal / 100g, logged as a 320g serving. Correct = 403 kcal, NOT 126×3.2×... = 1290.
  const food = applyFoodOverride({
    cal: 0, pro: 0, carb: 0, fat: 0,
    servings: [{ name: '1 serving', gramsEquiv: 320 }, { name: '100g', gramsEquiv: 100 }],
    __ov: { cal: 126, pro: 8, carb: 4, fat: 9 }
  });
  H.eq(food.cal, 126, 'override sets the per-100g base');
  H.approx(food.servings[0].cal, 403.2, 0.1, '320g serving = 126 × 3.2 = 403 (the bug produced ~1290)');
  H.approx(food.servings[1].cal, 126, 0.1, '100g serving = 126');
  H.approx(food.servings[0].pro, 25.6, 0.1, 'protein scales with grams too (8 × 3.2)');
  H.ok(food.servings[0].cal < 500, 'serving calories are single-scaled, never double');
  // A serving with no gramsEquiv must pass through untouched (can't scale what we can't size).
  const food2 = applyFoodOverride({ cal:0, servings:[{ name:'1 scoop' }], __ov:{ cal: 400 } });
  H.eq(food2.servings[0].cal, undefined, 'serving without gramsEquiv is left as-is (no fabricated scaling)');
}

// ── PER-ITEM PHOTO TOTALS (_pmTotals) — the Cal-AI-beating logger ─────────────────────────────────
H.section('_pmTotals — per-item photo meal totals with per-item multipliers');
{
  const _photoMeal = { items: [
    { food: 'Chicken', cal: 300, pro: 56, carb: 0,  fat: 6, mult: 1 },
    { food: 'Rice',    cal: 200, pro: 4,  carb: 45, fat: 0, mult: 1.5 }, // bumped ×1.5
  ]};
  const { _pmTotals } = H.load(['_pmTotals'], { _photoMeal });
  const t = _pmTotals();
  H.approx(t.cal, 600, 0.01, '300 + 200×1.5 = 600');
  H.approx(t.pro, 62, 0.01, '56 + 4×1.5 = 62');
  H.approx(t.carb, 67.5, 0.01, '0 + 45×1.5 = 67.5');
  H.approx(t.fat, 6, 0.01, '6 + 0 = 6');
}
{
  // Empty / missing photo meal must total zero, not throw.
  const { _pmTotals } = H.load(['_pmTotals'], { _photoMeal: null });
  const t = _pmTotals();
  H.eq(t, { cal: 0, pro: 0, carb: 0, fat: 0 }, 'no photo meal → all-zero totals, no crash');
}

// ── MONEY: reclaimed / spend picture (viceSpendPicture) — the honest money math ──────────────────
H.section('viceSpendPicture — reclaimed money (debt cancels savings first)');
{
  const { viceSpendPicture, viceMoneySaved } = H.load(['viceSpendPicture', 'viceMoneySaved', 'viceCleanDays']);
  const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
  let p = viceSpendPicture({ costAmount: 20, costPer: 'week', startDate: daysAgo(14) });
  H.eq(p.avoided, 40, '$20/week × 2 weeks = $40 avoided');
  H.eq(p.net, 40, 'no debt → net = avoided');
  H.ok(p.ahead === true, 'ahead when net > 0');
  p = viceSpendPicture({ costAmount: 20, costPer: 'week', owed: 50, startDate: daysAgo(14) });
  H.eq(p.net, -10, '$40 avoided − $50 owed = −$10 (honest negative position)');
  H.ok(p.ahead === false, 'not "ahead" while still in the hole');
  H.eq(p.toGo, 10, '$10 to go before actually ahead');
  H.eq(viceMoneySaved({ costAmount: 20, costPer: 'week', owed: 50, startDate: daysAgo(14) }), 0, 'reclaimed clamps at 0 while owed > avoided (never claim money not yet netted)');
  H.eq(viceMoneySaved({ costAmount: 20, costPer: 'week', startDate: daysAgo(14) }), 40, 'reclaimed = $40 when debt-free');
  H.eq(viceSpendPicture({ costAmount: 5, costPer: 'day', startDate: daysAgo(10) }).avoided, 50, '$5/day × 10 days = $50');
  H.eq(viceSpendPicture({ costAmount: 0, owed: 0 }), null, 'no cost + no debt → null (feature is opt-in)');
}

// ── CRISIS DETECTION — the highest-stakes function in the app ────────────────────────────────────
// Guards a bug that shipped and was INVISIBLE to desktop testing: iOS Smart Punctuation (on by
// default) rewrites ' to U+2019 as the person types, so an ASCII-only phrase list silently failed
// OPEN on the platform most people use — "i don't want to live" never matched, the gate never fired,
// and the message went straight to the LLM. These cases MUST keep passing on every keyboard.
H.section('detectCrisis — the gate must fire on any apostrophe (iOS Smart Punctuation)');
{
  const { detectCrisis } = H.load(['detectCrisis']);
  // curly / typographic apostrophe (what an iPhone actually sends)
  H.eq(detectCrisis('i don’t want to live anymore'), 'suicide', 'curly: "don’t want to live" → suicide');
  H.eq(detectCrisis('I don’t want to be here anymore'), 'suicide', 'curly: "don’t want to be here anymore" → suicide');
  H.eq(detectCrisis('I don’t want to wake up tomorrow'), 'suicide', 'curly: "don’t want to wake up" → suicide');
  H.eq(detectCrisis('I’m going to end it'), 'suicide', 'curly: "I’m going to end it" → suicide');
  H.eq(detectCrisis('I can’t breathe'), 'medical', 'curly: "can’t breathe" → medical');
  // straight apostrophe + no apostrophe at all
  H.eq(detectCrisis("i don't want to live anymore"), 'suicide', 'ascii apostrophe still works');
  H.eq(detectCrisis('i dont want to live anymore'), 'suicide', 'no apostrophe still works');
  // apostrophe-free phrases must be unaffected
  H.eq(detectCrisis('i want to kill myself'), 'suicide', '"kill myself" → suicide');
  H.eq(detectCrisis('everyone would be better off without me'), 'suicide', 'passive ideation → suicide');
  H.eq(detectCrisis('i want to hurt myself'), 'selfharm', 'self-harm → selfharm');
  // real intent around "jump off" / "stroke" must still fire...
  H.eq(detectCrisis('i want to jump off a bridge'), 'suicide', '"jump off a bridge" → suicide');
  H.eq(detectCrisis('im going to jump off'), 'suicide', '"going to jump off" → suicide');
  H.eq(detectCrisis('i think im having a stroke'), 'medical', '"having a stroke" → medical');
  // ...but must NOT fire on ordinary training language (a gate that cries wolf gets ignored)
  H.eq(detectCrisis('jump off the box for plyos'), null, 'plyometric "jump off the box" → null');
  H.eq(detectCrisis('my stroke felt off in the pool today'), null, 'swimming "stroke" → null');
  // and it must NOT fire on ordinary text (over-detection erodes trust)
  H.eq(detectCrisis('I had a great day and ate pizza'), null, 'ordinary text → null');
  H.eq(detectCrisis(''), null, 'empty → null');
  H.eq(detectCrisis(null), null, 'null input → null (no throw)');
}

// ── CALL-SITE COVERAGE — the test that would have caught the v357 blocker ────────────────────────
// The pre-release audit found a SEVENTH free-text→LLM path with no crisis gate ("I'm feeling it right
// now" on Home), after two earlier rounds of gating. The reason it survived: these tests asserted
// detectCrisis() in ISOLATION and nothing asserted that every call site actually invokes it. Green
// tests, dead coverage. This test reads index.html and asserts the gate count does not fall.
H.section('crisis gate — call-site coverage must never regress');
{
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const gates = (html.match(/detectCrisis\s*\(/g) || []).length;
  // 1 definition + N call sites. At v358 there are 7 gated surfaces: sendCoach, sendPT,
  // companionFreeText, companionReply, findVerse, generateIntentionPrayer, _feelingNowGo, searchBible.
  H.ok(gates >= 9, 'detectCrisis is referenced at least 9 times (definition + every gated surface) — found ' + gates);
  // The specific surfaces, by their enclosing function, must each contain a gate.
  const mustGate = ['_feelingNowGo', 'searchBible', 'companionFreeText', 'companionReply', 'findVerse', 'generateIntentionPrayer'];
  mustGate.forEach(fn => {
    const i = html.indexOf('function ' + fn + '(');
    H.ok(i > 0, fn + ' exists');
    // look only inside the first 3000 chars of the function body — the gate belongs at the top
    const body = html.slice(i, i + 3000);
    H.ok(body.indexOf('detectCrisis') > 0, fn + ' calls detectCrisis before doing its work');
  });
}

// ── REACHABILITY: a feature nobody can start is not built ────────────────────────────────────────
// Habits shipped uncreatable. addHabit() was never called from anywhere AND read #new-habit, an id that
// has never existed, so it threw on its first line. No rename, no delete, no other creation path — and
// the empty state told people to "add them in Settings", where no habit UI exists. The daily action the
// entire home page is built around could not be started by any user. Nothing here caught it, because
// these tests only ever asserted functions in isolation. These assert the WIRING.
H.section('reachability — core actions must have a live entry point');
{
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // Every id an onclick/oninput handler pokes must actually exist in the markup.
  const mustExist = ['home-habit-list', 'journal-text', 'nut-search-in', 'pt-pr-list', 'feel-door'];
  mustExist.forEach(id => {
    H.ok(html.indexOf('id="' + id + '"') > 0, '#' + id + ' exists in the markup');
  });

  // Habits: creation, listing and removal must each be reachable from a real handler.
  ['openAddHabit', 'openManageHabits', 'deleteHabit'].forEach(fn => {
    H.ok(html.indexOf('function ' + fn + '(') > 0, fn + ' is defined');
    const refs = (html.match(new RegExp(fn + '\\s*\\(', 'g')) || []).length;
    H.ok(refs >= 2, fn + ' is called from somewhere, not just defined (refs=' + refs + ')');
  });
  H.ok(/onclick="openManageHabits\(\)"/.test(html), 'the habit card header has a live add/edit control');
  H.ok(/onclick="openAddHabit\(\)"/.test(html), 'the empty state offers a live "add your first habit" control');
  H.ok(html.indexOf("getElementById('new-habit')") < 0, 'addHabit no longer reads the non-existent #new-habit');

  // A GUEST WHO RELOADS must land in the app, not on the sign-up wall. checkAuthAndStart had no guest
  // branch at all: no Supabase session meant "show auth", so anyone who came in through the no-account
  // crisis door ("just help, right now") was met next time with "Enter your email to begin" while all
  // their data sat in local storage behind it — and initApp() never ran for them, so migrations, faith
  // labels and the receptivity bookkeeping were skipped too.
  H.ok(/else if\(ls\('totry_guest'\)\)/.test(html), 'checkAuthAndStart has a returning-guest branch');
  {
    const i = html.indexOf("async function checkAuthAndStart");
    const body = html.slice(i, i + 4000);
    const g = body.indexOf("else if(ls('totry_guest'))");
    H.ok(g > 0, 'the guest branch lives inside checkAuthAndStart');
    H.ok(body.slice(g, g + 900).indexOf('initApp') > 0, 'the guest branch runs initApp');
  }
  // The initApp wrapper must await the original, or its follow-up renderers read half-built state.
  H.ok(/await _origInitApp\(\)/.test(html), 'the initApp wrapper awaits the original');

  // The onboarding boot gate must key on the flag finishOnboard actually writes, or fast-path users
  // are thrown back into onboarding forever and their day count resets to 1 on every pass.
  H.ok(/isOnboarded\s*\|\|/.test(html), 'boot gate consults totry_onboarded, not just identity+name');
  H.ok(/if\(!ls\('totry_start'\)\) ls\('totry_start'/.test(html), 'totry_start is written once and never re-stamped');
}

// ── en-AU DATE KEYS — the silent data-corruption class ───────────────────────────────────────────
// The food diary is keyed by toLocaleDateString('en-AU'), i.e. d/m/yyyy. new Date() CANNOT parse that:
// V8 reads it as US m/d/yyyy, so '10/08/2026' (10 August) becomes 8 October, and anything past the 12th
// ('25/08/2026') is an Invalid Date whose NaN makes a sort comparator return NaN — an arbitrary order,
// not a stable one. The prune used that comparator to decide which 120 days to KEEP, so it could evict
// recent days and hold old ones, and on two of three write paths it had no guard on the day being
// written. These assertions pin the parser and the prune's two guarantees.
H.section('_auKeyMs + _pruneNutLog — d/m/yyyy keys must not corrupt the diary');
{
  const { _auKeyMs, _pruneNutLog } = H.load(['_auKeyMs', '_pruneNutLog'], {
    nutDayKey: () => '10/08/2026'
  });

  // the exact case new Date() gets wrong
  H.eq(_auKeyMs('10/08/2026'), new Date(2026, 7, 10).getTime(), "'10/08/2026' is 10 AUGUST, not 8 October");
  H.eq(_auKeyMs('25/08/2026'), new Date(2026, 7, 25).getTime(), "'25/08/2026' parses (new Date() gives Invalid)");
  H.eq(_auKeyMs('1/1/2026'), new Date(2026, 0, 1).getTime(), 'single-digit day and month parse');
  H.eq(_auKeyMs('rubbish'), 0, 'unparseable key returns 0, never NaN (NaN poisons a sort)');
  H.eq(_auKeyMs(''), 0, 'empty key returns 0');
  H.ok(!isNaN(_auKeyMs('99/99/9999')), 'nonsense key still returns a number, not NaN');

  // ordering must be by real date, which lexicographic sorting gets wrong
  const keys = ['9/12/2026', '10/08/2026', '25/08/2026'];
  const byReal = keys.slice().sort((a, b) => _auKeyMs(a) - _auKeyMs(b));
  H.eq(byReal, ['10/08/2026', '25/08/2026', '9/12/2026'], 'sorts Aug 10 < Aug 25 < Dec 9');
  H.ok(keys.slice().sort()[0] === '10/08/2026' && byReal[2] === '9/12/2026',
    'plain .sort() disagrees with real order — which is why the naive version was wrong');

  // the prune keeps 120, drops the oldest, and never deletes the day being written
  const log = {};
  for (let i = 0; i < 130; i++) {
    const d = new Date(2026, 7, 10); d.setDate(d.getDate() - i);
    log[d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear()] = [{ cal: 1 }];
  }
  const before = Object.keys(log).length;
  _pruneNutLog(log);
  H.eq(before, 130, 'seeded 130 days');
  H.ok(Object.keys(log).length <= 121, 'pruned to ~120 days (got ' + Object.keys(log).length + ')');
  H.ok(!!log['10/8/2026'],
    'TODAY survives the prune even though it was written UNPADDED (10/8) while nutDayKey returns 10/08 — ' +
    'the guard compares parsed dates, so it cannot be defeated by formatting');
  // the newest days must be the ones kept
  H.ok(!!log['9/8/2026'] && !!log['1/8/2026'], 'recent days are kept');
  H.ok(!log['3/4/2026'], 'the oldest days are the ones dropped');
}

// ── DEAD ELEMENT REFERENCES — a ratchet on the signature bug class ───────────────────────────────
// This codebase's dominant failure is code that parses, passes tests and does nothing, and the most
// common mechanism is a handler poking an id that does not exist. A guarded one (if(el)) is a silent
// no-op; an UNGUARDED one throws and can take down a whole render (v366's v.limit.replace took out the
// entire Fight tab). At the time of writing there are 42 dead ids, all legacy, and the 7 unguarded ones
// all sit inside functions that are themselves never called. These two assertions stop that getting
// worse: a new dead reference, or a dead reference that becomes reachable, fails the suite.
H.section('dead element references — must not grow');
{
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  const have = new Set();
  for (const m of html.matchAll(/\bid=\\?["']([A-Za-z0-9_-]+)\\?["']/g)) have.add(m[1]);
  for (const m of html.matchAll(/\.id\s*=\s*['"]([A-Za-z0-9_-]+)['"]/g)) have.add(m[1]);

  const dead = new Set();
  for (const m of html.matchAll(/getElementById\(\s*'([A-Za-z0-9_-]+)'\s*\)/g)) {
    if (!have.has(m[1])) dead.add(m[1]);
  }
  const BASELINE = 42;
  H.ok(dead.size <= BASELINE,
    'no NEW dead getElementById targets (baseline ' + BASELINE + ', found ' + dead.size + ')' +
    (dead.size > BASELINE ? ' → ' + [...dead].join(', ') : ''));

  // An unguarded dead reference inside a function anyone can actually call is a live crash.
  const reachableCrashes = [];
  for (const m of html.matchAll(/getElementById\(\s*'([A-Za-z0-9_-]+)'\s*\)\s*[.[]/g)) {
    const id = m[1];
    if (have.has(id)) continue;
    // find the enclosing top-level function and check whether anything calls it
    const before = html.slice(0, m.index);
    const fnMatch = [...before.matchAll(/\n(?:async )?function ([A-Za-z0-9_$]+)\s*\(/g)].pop();
    if (!fnMatch) { reachableCrashes.push(id + ' (top-level)'); continue; }
    const fn = fnMatch[1];
    const refs = (html.match(new RegExp('\\b' + fn + '\\s*\\(', 'g')) || []).length;
    if (refs > 1) reachableCrashes.push(id + ' in ' + fn + '() which has ' + refs + ' refs');
  }
  H.eq(reachableCrashes, [],
    'no unguarded dead element reference sits inside a function that is actually called');
}

H.report();
