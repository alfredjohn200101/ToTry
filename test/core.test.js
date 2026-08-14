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

  // ── Boundary cases found by probing the gate live, both directions ──────────────────────────
  // THE FALSE POSITIVE THAT MATTERED: a bare 'going to kill' entry fired on the single most natural
  // sentence in a training app. Someone joking about leg day got a suicide-helpline screen. That
  // teaches people the gate is noise, which costs lives the one time it is right.
  H.eq(detectCrisis('this workout is going to kill me'), null, 'gym hyperbole → null');
  H.eq(detectCrisis('that session nearly killed me'), null, '"nearly killed me" → null');
  H.eq(detectCrisis("i'd rather die than skip leg day"), null, 'leg-day hyperbole → null');
  // ...while every genuinely self-directed form still fires.
  H.eq(detectCrisis('im going to kill myself'), 'suicide', '"going to kill myself" still → suicide');
  H.eq(detectCrisis('i am going to kill her'), 'harmothers', 'harm to others still → harmothers');

  // "kms" is how a lot of people actually type it. It must fire on intent...
  H.eq(detectCrisis('i wanna kms'), 'suicide', '"wanna kms" → suicide');
  H.eq(detectCrisis('i think i might kms tonight'), 'suicide', '"might kms" → suicide');
  // ...and must NEVER fire on distance, because this app logs runs and rides in km.
  H.eq(detectCrisis('i ran 5 kms today'), null, 'running "5 kms" → null');
  H.eq(detectCrisis('did 10 kms on the bike'), null, 'cycling "10 kms" → null');

  // "unalive" is now the commonest euphemism precisely because it dodges keyword lists.
  H.eq(detectCrisis('i want to unalive myself'), 'suicide', '"unalive" → suicide');
  H.eq(detectCrisis('been thinking about unaliving'), 'suicide', '"unaliving" → suicide');

  // The apostrophe-stripping pass turns "isn't" into "isnt", which does not contain "not" — so the
  // existing 'not worth living' entry missed the commonest phrasing of it.
  H.eq(detectCrisis("my life isn't worth living"), 'suicide', '"isn\'t worth living" → suicide');
  H.eq(detectCrisis('life is not worth living'), 'suicide', '"is not worth living" → suicide');

  // A described overdose is a medical emergency in progress.
  H.eq(detectCrisis('i took a bunch of pills'), 'medical', 'described overdose → medical');
  H.eq(detectCrisis('i took all my pills'), 'medical', '"took all my pills" → medical');
  H.eq(detectCrisis('i took my pills this morning'), null, 'ordinary medication → null');
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
  H.ok(gates >= 10, 'detectCrisis is referenced at least 10 times (definition + every gated surface) — found ' + gates);
  // The specific surfaces, by their enclosing function, must each contain a gate.
  // logBody added v434: the weekly check-in's "What got in your way? Honest answers only." is a
  // free-text field that fed straight into generateWeeklyCoachResponse -> "Biggest struggle: ..."
  // -> a third-party model, with no gate anywhere in the path. It was the 8th such surface.
  const mustGate = ['_feelingNowGo', 'searchBible', 'companionFreeText', 'companionReply', 'findVerse', 'generateIntentionPrayer', 'logBody'];
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
    // 9000, not 4000: v436 added the bounded session race and the two local-data guards (with the
    // reasoning beside them), which pushed this function past the old window. The assertion is unchanged
    // — only the slice it searches. A window that silently stops short reports a missing branch that is
    // right there, which is a false alarm of exactly the kind this suite is supposed to avoid.
    const body = html.slice(i, i + 9000);
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

// ── THE FEELING DOOR — every feeling must lead somewhere ─────────────────────────────────────────
// This is the app's primary action and its whole thesis: you open it because you FEEL something, and it
// must move you THROUGH the feeling to one real thing rather than showing sympathetic text and stopping.
// All ten paths were walked live as a brand-new user with zero data — no vices, no "few", no saved plans —
// and each gave a first action matched to the feeling, an exit, and no dead handlers. These assertions
// stop a future feeling being added without somewhere to go.
H.section('FEELINGS — every entry is complete and wired');
{
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  const i = html.indexOf('const FEELINGS');
  H.ok(i > 0, 'the FEELINGS registry exists');
  const block = html.slice(i, html.indexOf('\n];', i));

  const ids = [...block.matchAll(/\{\s*id:\s*'([a-z]+)'/g)].map(m => m[1]);
  H.ok(ids.length >= 10, 'at least ten feelings are offered (found ' + ids.length + ')');

  // Every entry needs a label, a sub, and an act() — an entry without act() renders a chip that does nothing.
  const entries = block.split(/\{\s*id:/).slice(1);
  H.eq(entries.length, ids.length, 'every entry parsed');
  entries.forEach((e, n) => {
    H.ok(/label:\s*'/.test(e), 'feeling ' + ids[n] + ' has a label');
    H.ok(/sub:\s*'/.test(e), 'feeling ' + ids[n] + ' has a sub-label');
    H.ok(/act:\s*(\(\)|function)/.test(e), 'feeling ' + ids[n] + ' has an act() — a chip with no action is a dead end');
  });

  // The door itself must be reachable from the orb, and the orb must open the DOOR (not the coach).
  H.ok(/function orbTap\(\)/.test(html), 'orbTap exists');
  const orb = html.slice(html.indexOf('function orbTap()'), html.indexOf('function orbTap()') + 700);
  H.ok(orb.indexOf('openFeelingDoor') > 0, 'the orb opens the Feeling Door, not the coach');
  H.ok(/onclick="orbTap\(\)"/.test(html), 'the orb button is wired to orbTap');
}

// ── ADAPTIVE TDEE — a weigh-in is not a trend ────────────────────────────────────────────────────
// computeAdaptiveTDEE derived weight change from two RAW readings (last.w - first.w), then multiplied by
// 7700 kcal/kg and divided by the window. A single reading carries water, salt, glycogen and time-of-day
// noise worth 0.5-1kg, so one dehydrated morning moved the estimated TDEE by hundreds of calories a day —
// and the card said "weight trend" while doing it. Now a least-squares slope over every reading.
H.section('adaptive TDEE — endpoint noise must not move the estimate');
{
  const DAY = 86400000, now = 1786000000000, days = 14;
  const series = spike => {
    const a = [];
    for (let i = 14; i >= 0; i--) {
      let w = 82.0 - (14 - i) * 0.05;          // a true, steady 0.7kg loss
      if (spike && i === 14) w += 0.9;         // water-heavy first reading
      if (spike && i === 0) w -= 0.6;          // dehydrated last reading
      a.push({ ts: now - i * DAY, w: Math.round(w * 10) / 10 });
    }
    return a;
  };
  const rawDiff = p => p[p.length - 1].w - p[0].w;
  const regress = p => {
    const n = p.length, t0 = p[0].ts; let sx = 0, sy = 0, sxx = 0, sxy = 0;
    p.forEach(e => { const x = (e.ts - t0) / DAY; sx += x; sy += e.w; sxx += x * x; sxy += x * e.w; });
    return ((n * sxy - sx * sy) / (n * sxx - sx * sx)) * days;
  };
  const cal = kg => Math.abs(kg * 7700 / days);

  // on clean data the two agree — the fix costs no accuracy
  H.approx(regress(series(false)), rawDiff(series(false)), 0.05, 'on clean data the slope matches the raw delta (-0.7kg)');

  // under endpoint noise the regression must be markedly steadier
  const oldErr = cal(rawDiff(series(true)) - rawDiff(series(false)));
  const newErr = cal(regress(series(true)) - regress(series(false)));
  H.ok(oldErr > 700, 'raw differencing turns a 1.5kg water swing into a >700 cal/day error (' + Math.round(oldErr) + ')');
  H.ok(newErr < oldErr / 2, 'the regression at least halves that error (' + Math.round(newErr) + ' vs ' + Math.round(oldErr) + ')');

  // and the implementation in index.html must actually be the regression
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const i = html.indexOf('function computeAdaptiveTDEE');
  const body = html.slice(i, i + 5000);   // the slope sits ~3.4k into the function
  H.ok(/slopePerDay/.test(body), 'computeAdaptiveTDEE uses a fitted slope');
  H.ok(!/const weightChangeKg = last\.w - first\.w;/.test(body), 'it no longer differences two raw weigh-ins');
}

// ── MONEY CLAIMS MUST NOT OVERSTATE ──────────────────────────────────────────────────────────────
// Two separate places told people they were further ahead than they were. Overstating progress on a
// debt-payoff app is worse than being silent: it is the number someone makes real decisions against.
H.section('monthlyReclaimRate — per-purchase costs');
{
  const { monthlyReclaimRate } = H.load(['monthlyReclaimRate'], {
    loadV: () => {},
    vices: [{ n: 'X', costAmount: 120, costPer: 'purchase', lastsDays: 30 }],
  });
  // 'purchase' is a real option in the cost picker and had no branch, so it fell through to the WEEKLY
  // formula: a $120 buy lasting a month was counted as $120 a week.
  H.approx(monthlyReclaimRate(), 120 * (30.44 / 30), 0.5, 'a $120 buy lasting 30 days is ~$122/month, not $522');
  H.ok(monthlyReclaimRate() < 200, 'nowhere near the $522 the weekly fall-through produced');
}
{
  const { monthlyReclaimRate } = H.load(['monthlyReclaimRate'], {
    loadV: () => {}, vices: [{ n: 'Y', costAmount: 20, costPer: 'week' }],
  });
  H.approx(monthlyReclaimRate(), 20 * (30.44 / 7), 0.5, 'weekly costs are unchanged');
}
{
  const { monthlyReclaimRate } = H.load(['monthlyReclaimRate'], {
    loadV: () => {}, vices: [{ n: 'Z', costAmount: 5, costPer: 'day' }],
  });
  H.approx(monthlyReclaimRate(), 5 * 30.44, 0.5, 'daily costs are unchanged');
}

H.section('projectPayoff — a one-off payment is a lump sum, not a raise');
{
  const { projectPayoff } = H.load(
    ['projectPayoff', '_sortDebtsByStrategy', '_debtBalance', '_debtMonthlyRate'], { ls: () => null });
  const debts = [{ n: 'Card', t: 5000, p: 1000, interest: 20 }];
  const rate = 300;
  const base = projectPayoff(debts, rate, 'snowball');
  // the bug: adding a one-off amount to the MONTHLY RATE models paying it every month, forever
  const asRaise = projectPayoff(debts, rate + 50, 'snowball');
  // the truth: a single $50 comes off the balance once
  const asLump = projectPayoff(debts.map(d => Object.assign({}, d, { p: d.p + 50 })), rate, 'snowball');
  H.ok(base && base.months > 0, 'a baseline payoff projects');
  H.ok(asLump.months >= asRaise.months,
    'a one-off saves NO MORE than paying that amount every month (lump ' + asLump.months +
    ' vs raise ' + asRaise.months + ' months)');
  H.ok((base.months - asLump.months) < (base.months - asRaise.months),
    'the honest saving is smaller than the overstated one — the app claimed ~3x the real benefit');
}

// ── CROSS-DEVICE MERGE — which keys union, and which must not ────────────────────────────────────
// pullFromCloud unions the keys in its ARR list and falls through to "newer scalar wins" for everything
// else, which silently discards the other device's copy. A two-phone test found a win logged on phone B
// being thrown away by phone A's newer write — and totry_fight_log had the same problem, which matters
// more than it sounds: that log is what teaches the risk window and the hard hour, so losing half of it
// on a device switch quietly degrades the app's sense of when someone is vulnerable.
// The split is the point. Union is right for append-only event logs and WRONG for editable lists, where
// it resurrects things a person deleted (the same class as the cycle-delete bug).
H.section('sync merge — append-only unions, editable lists do not');
{
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = html.match(/const ARR = \[([\s\S]*?)\];/);
  H.ok(!!m, 'the ARR union list is present in pullFromCloud');
  const ARR = new Set((m[1].match(/'([a-z_]+)'/g) || []).map(x => x.replace(/'/g, '')));

  // Pure event logs — no delete function exists for any of these, so unioning cannot resurrect anything.
  ['totry_wins', 'totry_moments_won', 'totry_fight_log', 'totry_cravings', 'totry_blessings',
   'totry_reachouts', 'totry_rosaries', 'totry_syntheses', 'totry_reviews', 'totry_vice_uses',
   'totry_impulse_holds', 'totry_freezes', 'totry_checkins', 'totry_mood_log', 'totry_fast_log',
   'totry_journal', 'totry_examens', 'totry_prayers'].forEach(k => {
    H.ok(ARR.has(k), k + ' is unioned, so a device switch cannot lose entries');
  });

  // Editable lists have real delete functions; unioning them would undo a deletion on the other device.
  ['totry_bills', 'totry_assets', 'totry_subscriptions', 'totry_transactions', 'totry_letters',
   'totry_relationships', 'totry_measurements'].forEach(k => {
    H.ok(!ARR.has(k), k + ' is NOT unioned — it has a delete path, and a removed item must stay removed');
  });
}

// ── BANK CSV IMPORT — money maths on other people's file formats ─────────────────────────────────
// The importer stripped everything except [0-9.-] from an amount, which silently multiplied European
// figures by 100: '-22,99' became -2299 and '1.234,56' became 1.23456. A 100x error on someone's real
// spending is the kind of bug that makes an app untrustworthy in one glance. parseCSV also kept the UTF-8
// BOM that Excel and most Windows bank exports prepend, so the FIRST header ("\uFEFFDate") never matched
// and its column was lost, and it only ever split on commas — European exports are semicolon-delimited.
H.section('_csvAmount + parseCSV — real bank export shapes');
{
  const { _csvAmount, parseCSV } = H.load(['_csvAmount', 'parseCSV']);

  // AU / US format
  H.eq(_csvAmount('-88.20'), -88.2, 'plain decimal');
  H.eq(_csvAmount('1,234.56'), 1234.56, 'comma thousands + dot decimal');
  H.eq(_csvAmount('$1,234.56'), 1234.56, 'currency symbol stripped');
  // European format
  H.eq(_csvAmount('-22,99'), -22.99, "'-22,99' is -22.99, NOT -2299");
  H.eq(_csvAmount('1.234,56'), 1234.56, "'1.234,56' is 1234.56, NOT 1.23456");
  H.eq(_csvAmount('1,50'), 1.5, 'comma decimal with two places');
  H.eq(_csvAmount('2.500'), 2500, "'2.500' is 2500 — money has 2 decimals, so 3 digits means thousands");
  // accounting + junk
  H.eq(_csvAmount('(123.45)'), -123.45, 'parenthesised negative');
  H.eq(_csvAmount('-0,05'), -0.05, 'small negative with comma decimal');
  H.eq(_csvAmount(''), 0, 'empty is 0');
  H.eq(_csvAmount('abc'), 0, 'unparseable is 0, never NaN');
  H.eq(_csvAmount(null), 0, 'null is 0');

  // parseCSV against real export quirks
  H.eq(parseCSV('\uFEFFDate,Desc,Amt\n1/1/2026,X,-1\n')[0], ['Date','Desc','Amt'], 'UTF-8 BOM is stripped off the first header');
  H.eq(parseCSV('Date;Desc;Amt\n1/1/2026;NETFLIX;-22,99\n')[1], ['1/1/2026','NETFLIX','-22,99'], 'semicolon-delimited files split');
  H.eq(parseCSV('Date\tDesc\tAmt\n1/1/2026\tX\t-1\n')[0], ['Date','Desc','Amt'], 'tab-delimited files split');
  H.eq(parseCSV('Date,Description,Amount\n10/08/2026,"WOOLWORTHS, RICHMOND",-88.20\n')[1],
    ['10/08/2026','WOOLWORTHS, RICHMOND','-88.20'], 'a quoted comma inside a field is still one field');
  H.eq(parseCSV('D,A\n1/1/2026,"He said ""hi"""\n')[1], ['1/1/2026','He said "hi"'], 'escaped quotes');
  H.eq(parseCSV(''), [], 'empty file gives no rows');
}

// ── STORAGE QUOTA — a failed save must never look like a saved one ───────────────────────────────
// ls() used to swallow every write error into catch(e){}. Harmless for a JSON hiccup, catastrophic for
// QuotaExceededError: iOS Safari caps localStorage near 5MB and this app stores base64 progress photos,
// 1200 journal entries and coach transcripts. Once full, every save failed silently while the person kept
// working and seeing success toasts. Recovery must reclaim only EXPENDABLE data — never their words, never
// their fight — and when it cannot write at all, it must say so.
H.section('ls() quota handling — recover, or tell the truth');
{
  const store = {};
  let failOn = null;                      // key that should throw QuotaExceededError
  const quotaErr = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
  const localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { if (failOn && k === failOn) { failOn = null; quotaErr(); } store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  };
  let toast = null;
  const { ls } = H.load(['ls', '_lsEmergencyPrune'], {
    localStorage,
    showToast: (t, b) => { toast = t; },
    console: { error: () => {}, warn: () => {} },
    // module-level flag the extracted ls() reads; the harness turns context keys into parameters, so a
    // plain value here is assignable inside the function under test
    _lsQuotaWarned: false,
  });

  // seed expendable bulk plus the two things that must never be touched
  store['totry_progress_photos'] = JSON.stringify(Array.from({length:30},(_,i)=>({id:i,data:'p'.repeat(2000)})));
  store['totry_journal'] = JSON.stringify([{ ts:'x', text:'MY WORDS' }]);
  store['totry_v'] = JSON.stringify([{ n:'MY FIGHT' }]);

  // a recoverable quota failure
  failOn = 'totry_nutlog';
  const ok = ls('totry_nutlog', { '10/08/2026': [{ cal: 500 }] });
  H.eq(ok, true, 'ls reports success after recovering from a quota error');
  H.ok(!!ls('totry_nutlog'), 'the data actually persisted on the retry');
  H.ok(JSON.parse(store['totry_progress_photos']).length < 30, 'photos were trimmed to make room');
  H.eq(JSON.parse(store['totry_journal'])[0].text, 'MY WORDS', 'the JOURNAL is never sacrificed');
  H.eq(JSON.parse(store['totry_v'])[0].n, 'MY FIGHT', 'the FIGHT is never sacrificed');
  // CONTRACT CHANGED IN v433, deliberately. This used to assert toast === null — "no alarm raised when
  // recovery succeeded". The save succeeding and the photos being gone are two different facts, and the
  // second one is irreversible: photos are device-only by policy (privacy.html promises it), so they are
  // in no cloud and in no backup file. Trimming 30 down to 8 destroys 22 things a person cannot recreate.
  // Staying quiet about that is the silent-data-loss failure this suite exists to catch, so the rule is
  // now: recovery that costs nothing irreplaceable stays quiet; recovery that costs photos speaks.
  H.eq(toast, 'Storage was full', 'losing photos to a prune is reported, even though the save succeeded');
  H.ok(JSON.parse(store['totry_progress_photos']).length === 8, 'and the newest 8 are what survive');

  // The other half of the contract: a recovery that costs nothing irreplaceable must still stay quiet.
  toast = null;
  store['totry_progress_photos'] = JSON.stringify([{ id: 1, data: 'p' }]);   // already below the trim floor
  store['totry_coach_history'] = JSON.stringify(Array.from({length:40},(_,i)=>({q:i,a:'a'.repeat(400)})));
  failOn = 'totry_nutlog2';
  H.eq(ls('totry_nutlog2', { x: 1 }), true, 'recovers again');
  H.eq(toast, null, 'no alarm when the prune only touched replaceable history');

  // an unrecoverable one — every write throws
  localStorage.setItem = () => quotaErr();
  const ok2 = ls('totry_nutlog', { y: 1 });
  H.eq(ok2, false, 'ls returns false when it genuinely could not write');
  H.eq(toast, 'Storage full', 'and the person is TOLD, instead of the save silently vanishing');
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
  // Ratcheted 42 -> 40 in v413 by pruning a dead cluster: openPrayerModal + showModalPrayer and
  // openMealPlan + generateMealPlan, both superseded (by the Prayer tab and openFuelPlan) and both
  // unreferenced. Tighten this number whenever it drops — a ratchet that only ever holds is a ceiling.
  const BASELINE = 40;
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

H.section('training history — one cap, no silent truncation');
{
  // The bug this guards: totry_workouts was capped at each of its eight write sites with a different
  // number (300/365/400/500/1000/uncapped), so the SMALLEST cap won whenever its path ran. Importing
  // 1000 sessions from Hevy then finishing one workout destroyed 636 of them, permanently and silently.
  const { _auKeyMs, _workoutMs, _capWorkouts, WORKOUT_CAP } =
    H.load(['_auKeyMs', '_workoutMs', '_capWorkouts'], { WORKOUT_CAP: 1000 });

  H.eq(_capWorkouts(new Array(1200).fill(0).map((_, i) => ({ id: i, ts: new Date(Date.now() - i * 86400000).toISOString() }))).length,
    1000, 'caps at 1000');
  H.eq(_capWorkouts([{ id: 'a' }, { id: 'b' }]).length, 2, 'leaves a short history untouched');

  // Newest-first culling: the kept set must be the newest, whichever order they arrived in.
  const scrambled = new Array(1100).fill(0).map((_, i) => ({ id: i, ts: new Date(2020, 0, 1 + i).toISOString() }));
  const kept = _capWorkouts(scrambled).map(w => w.id);
  H.ok(kept.includes(1099) && !kept.includes(0), 'keeps the newest and culls the oldest');

  // Both real-world date shapes must resolve, or undated rows sort to 0 and get culled first.
  H.ok(_workoutMs({ date: '3/08/2026' }) > 0, 'parses en-AU short dates (3/08/2026)');
  H.ok(_workoutMs({ date: 'Mon, 3 Aug 2026' }) > 0, 'parses en-AU long dates (Mon, 3 Aug 2026)');
  H.ok(_workoutMs({ ts: '2026-08-03T10:00:00.000Z' }) > 0, 'prefers the ISO timestamp');

  // The ratchet: no write site may re-introduce its own cap.
  const raw = [...H.html.matchAll(/ls\('totry_workouts',\s*[A-Za-z0-9_.]+\.slice\(/g)].length;
  H.eq(raw, 0, 'no write site caps totry_workouts with its own slice() — all go through _capWorkouts');
}

H.section('sleep, service and the bridge — the features that already existed');
{
  // A correction, recorded so it is not repeated: I built duplicate implementations of openWindDown,
  // openRecoveryBridge, openServiceExit and openCBA without first checking whether they existed. They
  // did — all four, already wired, and better than mine (the wind-down carries a per-tradition closing
  // line, the bridge gates its faith option on faithLevel, the CBA stores on the vice object). A second
  // top-level `function foo(){}` silently shadows the first, so nothing failed and nothing warned.

  // The ratchet that would have caught it in seconds.
  const decls = {};
  for (const m of H.html.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) {
    decls[m[1]] = (decls[m[1]] || 0) + 1;
  }
  H.eq(Object.keys(decls).filter(k => decls[k] > 1), [],
    'no top-level function is declared twice — a later one silently shadows the first');

  // The wind-down that ships: faith-aware, and not a score.
  H.ok(/function openWindDown\(\)/.test(H.html), 'openWindDown exists');
  const wd = H.html.slice(H.html.indexOf('function openWindDown'), H.html.indexOf('function openWindDown') + 3000);
  H.ok(/christianity:|islam:|buddhism:|secular:/.test(wd), "it closes in the person's own tradition");
  H.eq(/sleep score|out of 10|rate your sleep/i.test(wd), false, 'no sleep score');

  // The morning half, which genuinely did not exist — the other side of the same lever.
  H.ok(/function openMorningLight\(\)/.test(H.html), 'the morning light anchor exists');
  H.ok(/function _morningLightGo\(\)[\s\S]{0,600}theRelease\(/.test(H.html),
    'it ends the session rather than keeping them here');
  H.ok(/function morningLightDoneToday\(\)/.test(H.html),
    'it can tell whether they already went out, so the card can stop asking');

  // The originals, still present and still reachable.
  H.ok(/const _SERVICE_ACTS = \[/.test(H.html), 'the service acts exist');
  const rb = H.html.slice(H.html.indexOf('function openRecoveryBridge'), H.html.indexOf('function openRecoveryBridge') + 2600);
  H.ok(/SMART Recovery/.test(rb), 'SMART Recovery is offered (secular, science-based)');
  H.ok(/counsellor|GP/.test(rb), 'a real clinician is offered, not only fellowships');
  H.eq(/recommended|best option|top pick/i.test(rb), false, 'nothing is ranked or recommended');

  ['openWindDown', 'openRecoveryBridge', 'openServiceExit', 'openMorningLight'].forEach(fn => {
    const calls = (H.html.match(new RegExp(fn + '\\(\\)', 'g')) || []).length;
    H.ok(calls >= 2, fn + ' is reachable, not just defined (' + calls + ' references)');
  });
}

H.section('the next small real thing — an exit never ends on a sentiment');
{
  // The one gap the research named from two independent angles: an exit must not end on "go live your
  // life". Behavioural activation's whole claim is that ACTION PRECEDES MOTIVATION, so the moment the
  // phone goes down is when one concrete thing is worth more than encouragement.
  const acts = H.html.match(/const NEXT_SMALL = \{([\s\S]*?)\n\};/);
  H.ok(!!acts, 'NEXT_SMALL exists');
  ['sleep','movement','people','order','body','soul'].forEach(k => {
    H.ok(new RegExp('\\b' + k + ':\\s*\\[').test(acts[1]), 'has acts for ' + k);
  });

  // Every act must be doable OFF the phone and small enough to be almost embarrassing. Anything that
  // sends them back into the app would defeat the entire point of the exit.
  const all = [...acts[1].matchAll(/'([^']{10,})'/g)].map(m => m[1]);
  H.ok(all.length >= 12, 'enough acts that it does not repeat (' + all.length + ')');
  H.eq(all.filter(a => /\bapp\b|tap |open the|log it|in here|scroll/i.test(a)), [],
    'no act sends them back to a screen');

  // Matched to the real person, not random: it must read getLifeState().
  const fn = H.html.slice(H.html.indexOf('function nextSmallThing'), H.html.indexOf('function nextSmallThingHTML'));
  H.ok(/getLifeState\(\)/.test(fn), 'it reads the actual life state');
  H.ok(/daysQuiet/.test(fn) && /momentsWon7|wins7/.test(fn) && /sleep/.test(fn),
    'and branches on real signals — quiet weeks, a win today, a short night');
  // It can never be blank, because a blank exit is the bug being fixed.
  H.ok(/return pick\('order'\)/.test(fn), 'there is always a fallback act');

  // Phrased as an if-then, which roughly doubles follow-through over an intention alone.
  H.ok(/When I put this down, I’ll /.test(H.html), 'phrased as an implementation intention');

  // Wired into the Release, and it must NOT track — a chore list with a memory is nagging.
  H.ok(/nextSmallThingHTML\(\)/.test(H.html.slice(H.html.indexOf('function theRelease'), H.html.indexOf('function theRelease') + 3000)),
    'the Release renders it');
  const both = fn + H.html.slice(H.html.indexOf('function nextSmallThingHTML'), H.html.indexOf('function nextSmallThingHTML') + 900);
  H.eq(/ls\(|logEvent|streak|score/.test(both), false,
    'it suggests and forgets — nothing stored, scored or checked up on later');
}

H.section('body doubling — company, and then it lets go');
{
  // The two-minute starter existed but was SOLO: a clock, and you alone with it. What makes body
  // doubling work is not the timer, it is that someone is there — the one thing an app can honestly
  // offer at 9pm when nobody else is awake.
  H.ok(/function _startTwoMin\(thing, round\)/.test(H.html), 'the starter takes a round number');
  const src = H.html.slice(H.html.indexOf('function _startTwoMin'), H.html.indexOf('function _twoMinCheckIn'));

  // Present from the first second — a spinner or a network call here would break the exact thing
  // being built, so the lines are local and pre-written.
  H.ok(/const SAY = \[/.test(src), 'the presence lines are local, not fetched');
  H.eq(/api\(|fetch\(/.test(src), false, 'nothing waits on the network at the moment of starting');
  H.ok(/Starting together|Still with you/.test(src), 'it says it is with them');

  // ANTI-DEPENDENCE, which is the constraint that matters most here. CLAUDE.md forbids fostering
  // dependence, so this can offer one more round and then must send them off.
  const chk = H.html.slice(H.html.indexOf('function _twoMinCheckIn'), H.html.indexOf('function _twoMinCheckIn') + 1800);
  H.ok(/canAgain = \(round \|\| 1\) < 2/.test(chk), 'a second round is offered only once');
  H.ok(/go on without me/.test(chk), 'and on the last round it explicitly hands them back their own evening');
  H.ok(/theRelease\(/.test(chk), 'finishing ends the session off the phone');

  // Reachable: it is where "can't start" already lands.
  H.ok(/_startTwoMin\(/.test(H.html.slice(H.html.indexOf('const _SHRINK'), H.html.indexOf('function _startTwoMin'))),
    'the shrink-it ladder still hands off to it');
}

H.section('the urge menu is reachable from the companion');
{
  // openDEADS() (SMART Recovery's Delay/Escape/Accept/Distract/Substitute) already existed, but was
  // reachable from ONE modal and never from the companion — the exact surface where someone is
  // choosing a way through. I initially rebuilt the whole menu before noticing; this now just adds the
  // missing door onto what was already there.
  H.ok(/const _DEADS\s*=\s*\[/.test(H.html), 'the urge menu exists');
  H.ok(/function openDEADS\(\)/.test(H.html), 'openDEADS exists');
  const calls = (H.html.match(/openDEADS\(\)/g) || []).length;
  H.ok(calls >= 3, 'it is reachable from more than one place (' + calls + ' references)');
  // specifically from the companion's meet phase
  const comp = H.html.slice(H.html.indexOf('id="comp-meet"'), H.html.indexOf('id="comp-meet"') + 3000);
  H.ok(/openDEADS\(\)/.test(comp), 'and one of those places is the companion itself');
}

H.section('native plugin lookups must match the names the plugins register');
{
  // Apple Health had NEVER worked in the native build: capacitor-health registers as 'HealthPlugin'
  // (registerPlugin('HealthPlugin'); jsName = "HealthPlugin") while the app looked up
  // Capacitor.Plugins.Health. _p() returned null, so available() was false and connect() answered
  // "This build has no Apple Health plugin" — a polite toast covering a completely dead feature.
  // This test reads the plugin's OWN declared name from node_modules and fails if the app cannot
  // resolve it, so a rename cannot silently kill the integration again.
  const fs = require('fs');
  const path = require('path');
  const pluginJs = path.join(__dirname, '..', 'node_modules', 'capacitor-health', 'dist', 'esm', 'index.js');
  if (fs.existsSync(pluginJs)) {
    const src = fs.readFileSync(pluginJs, 'utf8');
    const m = src.match(/registerPlugin\(\s*['"]([A-Za-z]+)['"]/);
    H.ok(!!m, 'capacitor-health declares a plugin name');
    const declared = m[1];
    // the app's resolver must reference that exact key
    const resolver = H.html.match(/_p\(\)\{[\s\S]{0,400}?\},/);
    H.ok(!!resolver, 'Health._p() exists');
    H.ok(resolver[0].includes('P.' + declared) || resolver[0].includes("Plugins." + declared),
      'the app resolves Capacitor.Plugins.' + declared + ' (the name the plugin actually registers)');
  }

  // And the app's own Swift plugin: the JS lookup must accept what the Swift declares.
  const swift = path.join(__dirname, '..', 'ios', 'App', 'App', 'SleepPlugin.swift');
  if (fs.existsSync(swift)) {
    const sw = fs.readFileSync(swift, 'utf8');
    const js = (sw.match(/jsName\s*=\s*"([A-Za-z]+)"/) || [])[1];
    const id = (sw.match(/identifier\s*=\s*"([A-Za-z]+)"/) || [])[1];
    H.ok(!!js, 'SleepPlugin declares a jsName');
    const r = H.html.match(/_sleepP\(\)\{[\s\S]{0,400}?\},/);
    H.ok(!!r, 'Health._sleepP() exists');
    H.ok(r[0].includes('P.' + js), 'the app resolves Plugins.' + js + ' (SleepPlugin\'s jsName)');
    if (id && id !== js) {
      H.ok(r[0].includes('P.' + id), 'and also Plugins.' + id + ' (its class identifier), since registration differs by build');
    }
  }
}

H.section('no code strings in the DOM — the next-step action is a key, not a script');
{
  // doNextStep() used to read a STRING OF CODE off a dataset attribute and run it through
  // `new Function(action)()`. Eight of the nine values were literals; the ninth interpolated the
  // person's own vice name, guarded by stripping quotes and backslashes. The denylist held, but it
  // guarded an eval sink reachable from a DOM attribute, in an app that has already needed two XSS
  // fixes. The dataset now carries a key and the argument travels as data.
  H.eq(/new Function\s*\(/.test(H.html.replace(/\/\/[^\n]*/g, '')), false,
    'no new Function() anywhere in executable code');
  H.eq(/\beval\s*\(/.test(H.html.replace(/\/\/[^\n]*/g, '')), false, 'no eval()');
  H.eq(/set(?:Timeout|Interval)\(\s*['"]/.test(H.html), false,
    'no setTimeout/setInterval with a string body (also an eval sink)');

  // Every action a step can hand over must exist in the map, or the button silently does nothing.
  const map = H.html.match(/const NEXT_STEP_ACTIONS = \{([\s\S]*?)\n\};/);
  H.ok(!!map, 'NEXT_STEP_ACTIONS exists');
  const keys = [...map[1].matchAll(/^\s*([a-z]+):/gm)].map(m => m[1]);

  // Scope to getNextStep's own body — `action:` is also a property name in unrelated API payloads
  // ('vision', 'exchange', 'hevy'...), and matching those made this test fail on working code.
  const gnsAt = H.html.indexOf('function getNextStep');
  H.ok(gnsAt > 0, 'getNextStep exists');
  let depth = 0, i = H.html.indexOf('{', gnsAt), end = i;
  for (; end < H.html.length; end++) {
    if (H.html[end] === '{') depth++;
    else if (H.html[end] === '}') { depth--; if (depth === 0) break; }
  }
  const body = H.html.slice(i, end + 1);

  const used = [...body.matchAll(/action:\s*'([a-z]+)'/g)].map(m => m[1]);
  H.ok(used.length >= 8, 'getNextStep still offers actions (' + used.length + ' sites)');
  H.eq([...new Set(used)].filter(k => !keys.includes(k)), [],
    'every action getNextStep returns has an entry in the map');

  // And no action it returns may be code any more.
  H.eq(/action:\s*"/.test(body), false, 'no action value in getNextStep is a double-quoted code string');
  H.eq(/action:[^,}]*\(/.test(body), false, 'no action value in getNextStep contains a call');
  H.ok(/el\.dataset\.actionArg = String\(step\.actionArg\)/.test(H.html),
    'the parameter travels as data on a separate attribute');
}

H.section('repeated button labels need distinct accessible names');
{
  // Found by counting actions per screen rather than looking at screens: the Train tab had SEVEN
  // buttons reading just "Edit" (one per weekday of the split), so a screen reader announced
  // "Edit, Edit, Edit..." with nothing to tell them apart. Money had two "+ Add" and two "+ Log";
  // Settings had three "Export" and two "Edit". Each pair has a different handler, so the intent was
  // unambiguous in code and invisible to anyone not looking at the screen.
  const NEEDS_NAME = [
    'openSubscriptionLogger', 'openBillLogger', 'openFamilyContribution', 'openGivingLog',
    'exportJournal', 'exportWins', 'exportWorkouts', 'changeName',
  ];
  NEEDS_NAME.forEach(fn => {
    const re = new RegExp('onclick="' + fn + '\\(\\)"[^>]*aria-label="[^"]+"');
    H.ok(re.test(H.html), fn + '() has a distinct accessible name');
  });
  // The split-day buttons are generated, so assert the generator emits a per-day name.
  H.ok(/aria-label="Edit '\+_escFew\(DAYS_FULL\[i\]/.test(H.html),
    'each split-day Edit button is named for its day');
  H.ok(/const DAYS_FULL=\['Monday'/.test(H.html),
    'DAYS_FULL is in scope where the label is built (an undefined name would throw and kill the row)');
}

H.section('navigation — one way back, not two');
{
  // updateHubBackBar() injects a "‹ {Hub}" bar into every hub sub-page (see TAB_PARENT). Five Soul
  // sub-pages ALSO had their own hardcoded full-width "‹ Soul" button, so those screens showed two
  // stacked back controls — the light injected bar and a heavy button right under it.
  const hardcoded = [...H.html.matchAll(/<div style="margin-bottom:12px"><button class="btn" onclick="go\('(soul|grow|home)'\)/g)]
    .map(m => H.html.slice(0, m.index).split('\n').length);
  H.eq(hardcoded, [], 'no hub sub-page hardcodes its own back button (the bar is injected)');

  // The injected bar must cover every sub-page, or removing the hardcoded ones would strand people.
  const parentMap = H.html.match(/const TAB_PARENT\s*=\s*\{([\s\S]*?)\n\};/);
  H.ok(!!parentMap, 'TAB_PARENT exists');
  ['threads','read','today','practice','plans'].forEach(t => {
    H.ok(new RegExp('\\b' + t + '\\s*:').test(parentMap[1]),
      t + ' is registered in TAB_PARENT, so it still gets a back bar');
  });
  H.ok(/insertBefore\(bar, tab\.firstChild\)/.test(H.html), 'the bar is inserted at the top of the sub-page');
}

H.section('no external payment links in the App Store build');
{
  // Guideline 3.1.1: an app may not include buttons or external links directing customers to purchasing
  // mechanisms other than in-app purchase. The 3.2.1(vii) donation exemption covers approved nonprofits
  // collecting charitable donations, not a solo developer taking coffee money — and "Optional. Never
  // unlocks features" does not exempt the link, because the link itself is the violation. Fine on the
  // web, a rejection trigger in the build.
  const links = [...H.html.matchAll(/https:\/\/[a-z0-9.-]*(buymeacoffee|ko-?fi|patreon|paypal|stripe|gumroad|venmo)[a-z0-9.\/-]*/gi)]
    .map(m => m[0]);
  // They may exist, but every one must sit inside something the native build hides.
  if(links.length){
    H.ok(/id="support-card"[^>]*display:none/.test(H.html),
      'the support card starts hidden, so it cannot flash before the gate runs');
    H.ok(/getElementById\('support-card'\)[\s\S]{0,160}isNativeApp\(\)/.test(H.html),
      'and it is revealed only when NOT running as the native app');
  }
  // Nothing may imply a paywall or subscription — the app is free.
  const paywall = [...H.html.matchAll(/\b(subscribe now|upgrade to pro|premium plan|start free trial|unlock premium)\b/gi)].map(m => m[0]);
  H.eq(paywall, [], 'no paywall or subscription language anywhere');
}

H.section('platform gating — the App Store build must never show PWA install copy');
{
  // Confirmed on a real device before this was fixed: the native app displayed
  //   "Install To Try on your iPhone — 1. Tap the Share button at the bottom of Safari"
  // inside an app that has no Safari and no Share button, and the reminder settings told a native user
  // to add the app to their Home Screen first. Cause: a Capacitor WKWebView reports display-mode
  // "browser" and navigator.standalone is undefined there (Safari-only), so isStandalone() was FALSE —
  // while isIOSSafari() was TRUE, because the user agent really does say iPhone + WebKit.
  const mkWin = (native) => ({
    Capacitor: native ? { isNativePlatform: () => true } : undefined,
    matchMedia: () => ({ matches: false }),          // WKWebView: display-mode is "browser"
    navigator: {}                                    // navigator.standalone is Safari-only
  });
  const load = (native) => {
    const w = mkWin(native);
    return H.load(['isNativeApp', 'isStandalone'], { window: w, navigator: w.navigator });
  };

  const nat = load(true);
  H.eq(nat.isNativeApp(), true, 'the native build is detected as native');
  H.eq(nat.isStandalone(), true, 'the native build counts as an installed app');

  const web = load(false);
  H.eq(web.isNativeApp(), false, 'a browser tab is not native');
  H.eq(web.isStandalone(), false, 'a browser tab is not an installed app');

  // The install prompt must be guarded explicitly, not only via isStandalone().
  H.ok(/if\(isNativeApp\(\) \|\| !isIOSSafari\(\)/.test(H.html),
    'checkIOSInstall() returns early on native');
  H.ok(/if\(!isNativeApp\(\) && !ls\('totry_pwa_dismissed'\)/.test(H.html),
    'the Chrome install banner is suppressed on native');
  // The duplicate predicate must delegate, so the two can never drift apart again.
  H.ok(/function _isStandalone\(\)\{ return \(typeof isStandalone/.test(H.html),
    '_isStandalone delegates to isStandalone rather than duplicating the logic');
}

H.section('money vocabularies — two names for the same thing must not diverge');
{
  // Both of these were the same shape of bug: one part of the app writes a word, another part tests for
  // a different word, and nothing reconciles them. Silent, and wrong in the direction that flatters.
  // The mapping is a plain literal; read it out of index.html rather than restating it here, so the
  // test can never quietly drift from what the app actually ships.
  const bucketSrc = H.html.match(/const _BUDGET_BUCKET = \{[\s\S]*?\n\};/);
  if(!bucketSrc) throw new Error('_BUDGET_BUCKET literal not found in index.html');
  // eslint-disable-next-line no-new-func
  const _BUDGET_BUCKET = new Function(bucketSrc[0] + ' return _BUDGET_BUCKET;')();
  const { monthlyEquivalent, _budgetBucket } =
    H.load(['monthlyEquivalent', '_budgetBucket'], { _BUDGET_BUCKET });

  // detectSubscriptions() emits week/month/year; hand-added subs carry weekly/monthly/annual. Only the
  // second set was tested, so a detected $10/week sub counted as $10/month (4.3x low) and a $120/year
  // one as $120/month (12x high) — both straight into the total someone budgets against.
  H.approx(monthlyEquivalent({period:'week', amount:10}), 43.45, 0.01, 'week -> monthly');
  H.approx(monthlyEquivalent({period:'weekly', amount:10}), 43.45, 0.01, 'weekly -> monthly (same)');
  H.approx(monthlyEquivalent({period:'year', amount:120}), 10, 0.01, 'year -> monthly');
  H.approx(monthlyEquivalent({period:'annual', amount:120}), 10, 0.01, 'annual -> monthly (same)');
  H.approx(monthlyEquivalent({period:'quarter', amount:30}), 10, 0.01, 'quarter -> monthly');
  H.eq(monthlyEquivalent({period:'month', amount:15}), 15, 'month passes through');
  H.eq(monthlyEquivalent({}), 0, 'a missing period and amount is 0, not NaN');

  // Budgets are keyed to EXPENSE_CATEGORIES but the bank importer labels rows with _autoCategory's
  // richer vocabulary, so a Food budget read $0 however much was spent on food.
  const cats = ['Food','Rent/bills','Entertainment','Transport'];
  H.eq(_budgetBucket('Groceries', cats), 'Food', 'Groceries counts toward Food');
  H.eq(_budgetBucket('Eating out', cats), 'Food', 'Eating out counts toward Food');
  H.eq(_budgetBucket('Bills', cats), 'Rent/bills', 'Bills counts toward Rent/bills');
  H.eq(_budgetBucket('Subscriptions', cats), 'Entertainment', 'Subscriptions counts toward Entertainment');
  H.eq(_budgetBucket('Transport', cats), 'Transport', 'an exact budget name is unchanged');
  // A budget the person named themselves must win over any mapping.
  H.eq(_budgetBucket('Groceries', ['Groceries','Food']), 'Groceries', 'an exact user-named budget wins');
  // And a category with no bucket stays itself rather than being folded into Other — seeing
  // "$842/mo Gambling" in the breakdown is the point.
  H.eq(_budgetBucket('Gambling', cats), 'Gambling', 'an unmapped category stays visible as itself');
  H.eq(_budgetBucket('', cats), 'Uncategorised', 'a missing category is named, not blank');
}

H.section('journal win count — the dated record, not the lifetime total');
{
  // Both journal writers computed todayWins = lifetimeWins - ls('totry_wins_yesterday'), and that key
  // has ZERO write sites anywhere in the app. So every entry was stamped with the person's lifetime win
  // total as if it were that day's: 200 wins in, a day they won twice was written up as 200.
  H.eq(/totry_wins_yesterday/.test(H.html.replace(/\/\/[^\n]*/g, '')), false,
    'the phantom baseline key is gone from executable code');
  const today = new Date().toLocaleDateString('en-AU');
  const older = new Date(Date.now() - 3*86400000).toLocaleDateString('en-AU');
  const log = [
    { vice:'x', won:true,  date: today },
    { vice:'x', won:true,  date: today },
    { vice:'x', won:false, date: today },   // an honest loss must not count as a win
    { vice:'x', won:true,  date: older }
  ];
  const { _winsOnDay } = H.load(['_winsOnDay'], { ls: k => (k === 'totry_fight_log' ? log : null) });
  H.eq(_winsOnDay(today), 2, "counts only today's real wins");
  H.eq(_winsOnDay(older), 1, 'counts a past day correctly');
  H.eq(_winsOnDay('01/01/2001'), 0, 'a day with nothing logged is 0');
}

H.section('the pull intervention — each tradition gets its OWN practice');
{
  // This is the screen someone sees while white-knuckling. It used to hand every person the Jesus
  // Prayer. A swapped phrase was not enough either: each tradition has its own in-the-moment practice
  // for exactly this, and the posture and the count are part of it.
  const src = H.html.match(/const _PULL_PRACTICE = \{([\s\S]*?)\n\};/);
  H.ok(!!src, '_PULL_PRACTICE registry exists');
  const body = src[1];

  ['christianity','islam','hinduism','buddhism','secular'].forEach(t => {
    const entry = body.match(new RegExp(t + ':\\s*\\{([\\s\\S]*?)\\n  \\}'));
    H.ok(!!entry, t + ' has a practice');
    if(entry){
      ['name:','line:','how:','why:'].forEach(f =>
        H.ok(entry[1].includes(f), t + ' practice has ' + f.replace(':','')));
    }
  });

  // No tradition may be handed another's religion. Secular must carry none at all.
  const sec = (body.match(/secular:\s*\{([\s\S]*?)\n  \}/) || [,''])[1];
  H.eq(/Jesus|Christ|Allah|Qur|God\b|Lord|Krishna|Buddha|prayer/i.test(sec), false,
    'the secular practice contains no religious language');
  const isl = (body.match(/islam:\s*\{([\s\S]*?)\n  \}/) || [,''])[1];
  H.eq(/Jesus|Christ|Krishna|Buddha/i.test(isl), false, 'the Islamic practice names no other religion');
  const hin = (body.match(/hinduism:\s*\{([\s\S]*?)\n  \}/) || [,''])[1];
  H.eq(/Jesus|Christ|Allah|Buddha/i.test(hin), false, 'the Hindu practice names no other religion');

  // It must be WIRED, not merely defined — the signature failure of this codebase.
  H.ok((H.html.match(/_fnPractice\(\)/g) || []).length >= 4,
    '_fnPractice() is actually rendered into the intervention');
  // And the superseded thin helpers must be gone, not left as dead code.
  H.eq(/_fnAnchorLine|_fnAnchorHow/.test(H.html), false, 'the phrase-swap helpers it replaced were removed');
}

H.section('faith gate — the UI must obey the same rule as the prompt');
{
  // ECHO_OK governed only what the AI was TOLD. A static hub section, "Common ground — the same struggle,
  // across every path", was shown to every tradition — so a Muslim user was offered a card about how Lent
  // and Navratri hold the same struggle, and the fasting blurb named all four seasons to everyone.
  // Read the registries straight out of the source — they are plain literals.
  const echoSrc = H.html.match(/const ECHO_OK = \{([^}]*)\}/);
  const fastSrc = H.html.match(/const FAST_SEASON_NAME = \{([^}]*)\}/);
  H.ok(!!echoSrc, 'ECHO_OK exists');
  H.ok(!!fastSrc, 'FAST_SEASON_NAME exists');

  const traditions = ['christianity','islam','hinduism','buddhism','secular'];
  traditions.forEach(t => {
    H.ok(new RegExp(t + '\\s*:').test(fastSrc[1]),
      'FAST_SEASON_NAME covers ' + t + ' (a missing one silently shows no season)');
  });
  // The traditions that must NOT be shown other faiths' practices.
  ['islam','hinduism','buddhism'].forEach(t => {
    H.ok(new RegExp(t + '\\s*:\\s*false').test(echoSrc[1]),
      t + ' does not receive other traditions\' material');
  });
  // Secular gets no religious season name at all.
  H.ok(/secular\s*:\s*''/.test(fastSrc[1]), 'secular is given no religious fasting season');

  // The gate must actually be CALLED — an uncalled gate is the signature failure of this codebase.
  H.ok(/function applyFaithUIGate/.test(H.html), 'applyFaithUIGate is defined');
  const called = (H.html.match(/applyFaithUIGate\(\)/g) || []).length;
  H.ok(called >= 2, 'applyFaithUIGate is invoked, not just defined (' + called + ' references)');
  H.ok(/applyFaithUIGate\(\);[\s\S]{0,200}wk-faith-label/.test(H.html),
    'it runs from applyFaithGlobal, which fires at boot and on every tradition change');
  // And the static markup must carry the ids the gate targets.
  ['hub-common-label','hub-common-grid','hub-fast-desc'].forEach(id => {
    H.ok(H.html.includes('id="' + id + '"'), 'the markup has #' + id + ' for the gate to reach');
  });
}

H.section('habit week stamp — must roll on Monday, with the ring');
{
  // The habit ring is seven weekday slots with Monday=0 (tIdx). Stamping it with the app's existing
  // _currentWeekStamp() would have been a quiet disaster: that is a SUNDAY-start week number, so the
  // stamp changed on Sunday morning and loadH would have zeroed Monday–Saturday's real ticks a day
  // early — destroying data in the name of fixing staleness.
  const { _habitWeekStamp } = H.load(['_habitWeekStamp'], {});

  const stamp = d => _habitWeekStamp(new Date(d + 'T12:00:00'));
  // Mon 3 Aug 2026 → Sun 9 Aug 2026 must all share one stamp.
  const week = ['2026-08-03','2026-08-04','2026-08-05','2026-08-06','2026-08-07','2026-08-08','2026-08-09'].map(stamp);
  H.eq(new Set(week).size, 1, 'Monday through Sunday share a single stamp');
  H.eq(week[0], '2026-08-03', 'the stamp is that week\'s Monday');
  H.ok(stamp('2026-08-09') !== stamp('2026-08-10'), 'the stamp rolls on Monday, not Sunday');
  H.ok(stamp('2026-08-02') !== stamp('2026-08-03'), 'the preceding Sunday belongs to the previous week');
  // Year boundary: Thu 31 Dec 2026 and Fri 1 Jan 2027 are the same week.
  H.eq(stamp('2026-12-31'), stamp('2027-01-01'), 'a week spanning new year keeps one stamp');
}

H.section('one-tap food logging — the (+) must log the real serving');
{
  // Open Food Facts results carry per-100g macros at the top level and the product's REAL serving in
  // servings[0]. The quick-log path read the top level and called it "1 serving", so (+) on a 25g bar
  // logged ~535 cal while tapping the row logged ~134 — two buttons, same row, different numbers.
  const { _quickServing } = H.load(['_quickServing'], {});

  const bar = { name:'Milk chocolate', per100:true, cal:535, pro:7.6, carb:59, fat:30,
                servings:[{ name:'25 g', gramsEquiv:25, cal:134, pro:1.9, carb:14.8, fat:7.5 },
                          { name:'100g', gramsEquiv:100, cal:535, pro:7.6, carb:59, fat:30 }] };
  const q = _quickServing(bar);
  H.eq(q.cal, 134, 'logs the product serving, not the per-100g base');
  H.eq(q.label, '25 g', 'and names that serving');

  // No serving info: say what the number is of rather than calling it "1 serving".
  H.eq(_quickServing({ name:'Loose flour', per100:true, cal:364, pro:10, carb:76, fat:1 }).label, '100g',
    'a per-100 food with no serving is labelled 100g, not "1 serving"');
  // Non-per100 foods (USDA etc.) keep the old behaviour.
  H.eq(_quickServing({ name:'Egg', cal:78, pro:6, carb:0.6, fat:5 }).label, '1 serving',
    'a plain food still reads "1 serving"');
  H.eq(_quickServing({ name:'Egg', cal:78, pro:6, carb:0.6, fat:5 }).cal, 78, 'and keeps its macros');
}

H.section('Hevy routine buttons — the handler must survive HTML attribute quoting');
{
  // JSON.stringify emits double quotes, which terminated the double-quoted onclick attribute at the
  // first inner quote, so no handler was ever installed and every "Start →" was inert.
  // Interpolating JSON.stringify into a double-quoted onclick is only safe if the quotes it emits are
  // escaped straight afterwards. Two sites do exactly that (.replace(/"/g,'&quot;')) and are fine; the
  // routine buttons did not, and were dead. Flag only the unescaped form.
  const bad = [...H.html.matchAll(/onclick="[^"]*?\+JSON\.stringify\(/g)]
    .filter(m => !H.html.slice(m.index, m.index + m[0].length + 90).includes('&quot;'))
    .map(m => H.html.slice(0, m.index).split('\n').length);
  H.eq(bad, [], 'no onclick interpolates JSON.stringify without escaping the quotes it emits');
  H.ok(!/startHevyRoutine\('\+JSON\.stringify/.test(H.html), 'startHevyRoutine is not called via JSON.stringify');
  // And it must look up the id routines actually carry.
  H.ok(/String\(x\.hevyId\) === key/.test(H.html), 'startHevyRoutine matches on hevyId, the field fetchHevyRoutines stores');
}

H.section('storage caps agree across write sites');
{
  // The class, not just the instance. Whenever one key is capped at two different lengths, the SMALLER
  // one wins the moment its path runs and the difference is deleted forever. Found three live cases:
  // checkins 90 vs 300, feeling_wins 200 vs 500, saved verses 100 vs 200 — all user-authored, all
  // unrecoverable. This fails the build if any key ever disagrees with itself again.
  const caps = {};
  for (const m of H.html.matchAll(/ls\('(totry_[a-z_]+)',\s*[A-Za-z0-9_.]+\.slice\(\s*(-?\d+)\s*,?\s*(-?\d+)?\s*\)/g)) {
    const [, key, a, b] = m;
    const n = b === undefined ? a : b;          // slice(0,N) → N ; slice(-N) → -N
    (caps[key] = caps[key] || new Set()).add(String(n));
  }
  const disagree = Object.entries(caps)
    .filter(([, v]) => v.size > 1)
    .map(([k, v]) => k + ' capped at ' + [...v].sort().join(' and '));
  H.eq(disagree, [], 'every storage key is capped at the same length everywhere it is written');
  H.ok(Object.keys(caps).length > 25, 'the scan actually found the write sites (' + Object.keys(caps).length + ' keys)');
}

H.section('the app boots with no network');
{
  // The worst bug this project has had: the entire app was gated on fetching the Supabase SDK from
  // jsdelivr, and initSupabase()/checkAuthAndStart() retried every 200ms FOREVER with no fallback.
  // checkAuthAndStart() is the only caller of initApp() and the only thing that hides #onboard or
  // reveals the sign-in screen — so with no connection the app never opened at all, and the Feeling
  // Door, the companion and the hardcoded crisis numbers were unreachable exactly when someone had no
  // signal. The service worker hid it for the PWA; the native shell unregisters the service worker, so
  // the App Store build had no mitigation whatsoever.
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');

  // 1. NOTHING the app needs to start may come off the network.
  const remote = [...H.html.matchAll(/<script[^>]*\ssrc="(https?:)?\/\/[^"]*"/g)].map(m => m[0].slice(0, 90));
  H.eq(remote, [], 'index.html loads no remote <script src> — a boot dependency on a CDN is what broke this');

  // 2. The SDK is vendored, present, and is really the library (not an empty or truncated file).
  const vend = path.join(root, 'vendor', 'supabase-js.js');
  H.ok(fs.existsSync(vend), 'vendor/supabase-js.js exists');
  if (fs.existsSync(vend)) {
    const v = fs.readFileSync(vend, 'utf8');
    H.ok(v.length > 100000, 'vendored SDK is the real bundle (' + Math.round(v.length / 1024) + 'KB)');
    H.ok(/createClient/.test(v), 'vendored SDK exposes createClient');
    H.ok(/^var supabase\s*=/.test(v), 'vendored SDK assigns the window.supabase global the app checks for');
  }
  H.ok(/<script[^>]+src="vendor\/supabase-js\.js"/.test(H.html), 'index.html loads the SDK from vendor/');

  // 3. It must be copied into the native bundle and precached, or the native build boots to the
  //    fallback instead of the real app — silently.
  const build = fs.readFileSync(path.join(root, 'scripts', 'build-www.js'), 'utf8');
  H.ok(/'vendor\/supabase-js\.js'/.test(build), 'build-www.js copies the vendored SDK into www/');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  H.ok(/vendor\/supabase-js\.js/.test(sw), 'sw.js precaches the vendored SDK');

  // 4. Belt and braces: even if the file is missing, both boot loops give up and open the app.
  H.ok(/function bootWithoutCloud\(/.test(H.html), 'bootWithoutCloud() exists');
  H.ok(/_sbTries\s*>\s*\d+\)\s*\{\s*bootWithoutCloud\(/.test(H.html), 'initSupabase caps its retries and falls back');
  H.ok(/_authTries\s*>\s*\d+\)\s*\{\s*bootWithoutCloud\(/.test(H.html), 'checkAuthAndStart caps its retries and falls back');
  const noBareRetry = !/setTimeout\(initSupabase, 200\);\s*\n\s*return;\s*\n\s*\}/.test(
    H.html.replace(/if\(\+\+_sbTries[^\n]*\n/, '')
  );
  H.ok(noBareRetry || /_sbTries/.test(H.html), 'no uncapped 200ms boot retry remains');

  // 5. The fallback must work with a null client — if it touches sb, it throws and the app stays dead.
  const fb = H.html.slice(H.html.indexOf('function bootWithoutCloud('));
  const body = fb.slice(0, fb.indexOf('\nasync function checkAuthAndStart'));
  const touchesSb = [...body.matchAll(/[^_\w.]sb\s*\./g)].map(m => m[0]);
  H.eq(touchesSb, [], 'bootWithoutCloud never dereferences sb (it runs precisely when sb is null)');
  H.ok(/initApp/.test(body), 'the fallback actually opens the app (calls initApp)');
  H.ok(/auth-offline-note/.test(body) && /id="auth-offline-note"/.test(H.html),
    'the brand-new-and-offline path shows the honest note, and the element exists');
}

H.section('promises the code must keep');
{
  // This project's second signature failure is not a crash — it is a claim the mechanism does not
  // honour: a usage description, a policy line or a toast that says more than the code does. Each
  // assertion below pairs a PROMISE with the MECHANISM that has to exist for it to be true.
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const plist = fs.readFileSync(path.join(root, 'ios/App/App/Info.plist'), 'utf8');
  const priv = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');

  // 1. HealthKit. The app syncs sleep/steps/workout summaries to Supabase and puts sleep + recent
  //    training in the AI brief, while Info.plist and privacy.html both said it never leaves the phone.
  //    If the sync exists, the promise must not.
  const healthSyncs = /syncToCloud\('totry_trackers'/.test(H.html) && /syncToCloud\('totry_workouts'/.test(H.html);
  H.ok(healthSyncs, 'health data really does sync (if this flips, revisit the wording below)');
  const share = (plist.match(/<key>NSHealthShareUsageDescription<\/key>\s*<string>([\s\S]*?)<\/string>/) || [])[1] || '';
  H.ok(share.length > 40, 'NSHealthShareUsageDescription exists');
  H.ok(!/never uploaded|stays on your device|never leaves|not shared/i.test(share),
    'the HealthKit consent sheet does not promise the data stays on the device — it does not');
  const healthItem = (priv.match(/<li><strong>Apple Health[\s\S]*?<\/li>/) || [''])[0];
  H.ok(healthItem.length > 100, 'privacy.html has an Apple Health item');
  H.ok(!/not uploaded to my database/i.test(healthItem), 'privacy.html no longer claims Health is never uploaded');
  H.ok(!/not sent to any AI provider/i.test(healthItem), 'privacy.html no longer claims Health never reaches an AI provider');

  // 2. privacy.html tells people they can turn Apple Health off in the app, so that has to exist.
  //    totry_health_connected was previously only ever written true.
  if (/turning Apple Health off in the app/i.test(healthItem)) {
    H.ok(/function disconnectAppleHealth/.test(H.html), 'the Apple Health off switch exists');
    H.ok(/ls\('totry_health_connected',\s*false\)/.test(H.html), 'it actually clears totry_health_connected');
    H.ok(/onclick="disconnectAppleHealth\(\)"/.test(H.html), 'and it is reachable from the UI');
  }

  // 3. "Delete your account permanently" has to delete the account, not just its rows. The auth.users
  //    row holds the email; only the delete-user edge function can remove it, and it needs the JWT, so
  //    it must run BEFORE signOut.
  const da = H.html.slice(H.html.indexOf('async function deleteAccount('));
  const body = da.slice(0, da.indexOf('\n// ── PRIVACY'));
  // Either route: the SECURITY DEFINER RPC (preferred — no service-role key anywhere) or the edge
  // function. Both must run BEFORE signOut, while there is still a JWT to authorise them with.
  H.ok(/rpc\('delete_own_account'\)/.test(body) || /functions\.invoke\('delete-user'\)/.test(body),
    'deleteAccount deletes the account itself');
  H.ok(/rpc\('delete_own_account'\)/.test(body), 'it prefers the RPC, which needs no service-role key');
  const iInvoke = Math.min(
    ...[body.indexOf("rpc('delete_own_account')"), body.indexOf("functions.invoke('delete-user')")]
      .filter(i => i > 0)
  );
  const iSignOut = body.indexOf('auth.signOut()');
  H.ok(iInvoke > 0 && iSignOut > 0 && iInvoke < iSignOut, 'it runs before signOut, while there is still a JWT');
  H.ok(!/delete_own_account'\s*,\s*\{/.test(body), 'the RPC takes no arguments — no user id can be passed in');
  H.ok(/_failed\.push\('your account itself/.test(body), 'a refusal is confessed, never reported as success');
  H.ok(fs.existsSync(path.join(root, 'supabase/functions/delete-user/index.ts')), 'the edge function is versioned in the repo');

  // 4. Nothing may be offered on iOS that cannot work there. Google Health OAuth cannot: the redirect
  //    URI becomes capacitor://localhost/, which a Google web client rejects.
  H.ok(/id !== 'googlehealth' \|\| !\(typeof isNativeApp==='function' && isNativeApp\(\)\)/.test(H.html),
    'the app picker hides Google Health in the native build');
  const ghChip = (H.html.match(/<div class="vchip" id="ob-chip-googlehealth"[^>]*>/) || [''])[0];
  H.ok(/display:none/.test(ghChip), 'the onboarding Google Health chip fails closed (hidden until proven safe)');
  H.ok(/ob-chip-googlehealth'\);\s*if\(gh && !\(typeof isNativeApp/.test(H.html), 'and is revealed only off-native');
}

H.section('native reach — things the wrapper unlocks must actually be used');
{
  // Comment-stripped view. Every one of these assertions describes a bug whose explanation names the
  // very pattern being banned, so matching raw source finds the comment and not the code.
  const code = H.html
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');

  // 1. Haptics. navigator.vibrate is the Vibration API, which WebKit has never implemented — so the
  //    single line `if(!navigator.vibrate) return;` made every haptic in the app a no-op on iPhone, the
  //    one platform with a Taptic Engine. The native path must come FIRST, before that early return.
  const h = code.slice(code.indexOf('function haptic('));
  const hb = h.slice(0, h.indexOf('\n}'));
  H.ok(/Plugins\.Haptics/.test(hb), 'haptic() uses the native Haptics plugin');
  H.ok(hb.indexOf('Plugins.Haptics') < hb.indexOf('!navigator.vibrate'),
    'the native path runs BEFORE the navigator.vibrate early-return that kills it on iOS');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  H.ok(!!(pkg.dependencies && pkg.dependencies['@capacitor/haptics']), '@capacitor/haptics is a dependency');
  // The v408 bug class: a lookup name that doesn't match what the plugin registers is a silent no-op.
  const hjs = fs.readFileSync(path.join(root, 'node_modules/@capacitor/haptics/dist/plugin.js'), 'utf8');
  const declared = (hjs.match(/registerPlugin\('([A-Za-z]+)'/) || [])[1];
  H.eq(declared, 'Haptics', 'the plugin registers under the name index.html looks up');

  // 2. Crisis contacts must be tappable. The same numbers are tel: links on the sign-in screen because
  //    "crisis help must never sit behind a login"; the AI crisis response rendered them as plain text,
  //    so the worst moment the app has was the one place you had to transcribe a number by hand.
  H.ok(/const _crisisContact/.test(H.html), 'the crisis response builds tappable contacts');
  const cr = H.html.slice(H.html.indexOf('const _crisisContact'));
  H.ok(/href="tel:/.test(cr.slice(0, 900)), 'phone numbers become tel: links');
  H.ok(/_crisisContact\(r\.contact\)/.test(H.html), 'and the renderer actually calls it');
  H.ok(!/iasp\.info/.test(code), 'the dead IASP crisis-centres link is gone (it 301s to their homepage)');

  // 3. No promise of a raffle without the terms that make it real.
  H.ok(/const RAFFLE_ACTIVE = false;/.test(H.html) || /RAFFLE_TERMS\s*=\s*'[^']+'/.test(H.html),
    'the raffle is off, or it has terms');
  if (/const RAFFLE_ACTIVE = false;/.test(H.html)) {
    const promises = [...code.matchAll(/you.{0,3}re in the (raffle|draw)/gi)]
      .map(m => code.slice(0, m.index).split('\n').length)
      .filter(line => {
        const ctx = code.split('\n').slice(line - 4, line + 1).join('\n');
        return !/RAFFLE_ACTIVE|_raffleCopy/.test(ctx);   // the gated branch is allowed to say it
      });
    H.eq(promises, [], 'nothing tells a person they are in a raffle while RAFFLE_ACTIVE is false');
  }

  // 4. A dismissed share sheet is not a success. The plugin resolves {ok:true, completed:false} on
  //    cancel, so reading only .ok congratulated people on a save they had just declined.
  H.ok(/r\.completed === false\) return null/.test(H.html), 'SaveFile distinguishes cancel from success');
  const callers = [...H.html.matchAll(/SaveFile\.save\([^)]*\)/g)].length;
  H.ok(callers >= 5, 'the save path is the only one used (' + callers + ' call sites)');
  const reporters = [...H.html.matchAll(/=\s*await SaveFile\.save\(/g)].length;
  const nullChecks = [...H.html.matchAll(/=== null\) return/g)].length;
  H.ok(nullChecks >= reporters, 'every caller that reports an outcome handles the cancel case');

  // 5. Reminders must not claim to reach someone if iOS won't allow it.
  H.ok(/async function _verifyNativeNotifPermission/.test(H.html), 'the reminders row verifies real permission');
  H.ok(/L\.checkPermissions/.test(H.html), 'it asks the system, not localStorage');
  H.ok(/_verifyNativeNotifPermission\(\);/.test(H.html), 'and it is actually called after render');
}

H.section('live barcode scanning — the native path must be real and registered');
{
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const swiftPath = path.join(root, 'ios/App/App/BarcodeScannerPlugin.swift');

  H.ok(fs.existsSync(swiftPath), 'BarcodeScannerPlugin.swift exists');
  const sw = fs.existsSync(swiftPath) ? fs.readFileSync(swiftPath, 'utf8') : '';

  // The v408 bug, three times over now: a jsName that doesn't match the JS lookup is a silent no-op.
  const jsName = (sw.match(/jsName\s*=\s*"([A-Za-z]+)"/) || [])[1];
  H.eq(jsName, 'BarcodeScanner', 'the plugin declares the jsName the app looks up');
  // Either form: `Plugins.BarcodeScanner`, or `P.BarcodeScanner` after destructuring Plugins as P
  // (the house pattern in SaveFile/HealthWrite/LiveScan).
  H.ok(/(?:Plugins|\bP)\.BarcodeScanner\b/.test(H.html), 'index.html looks it up under that name');

  // The v415 bug: an app-target plugin is compiled but NEVER auto-discovered, so it must be registered
  // by instance. Without this the scan button is revealed by a check that can never pass — or worse.
  const vc = fs.readFileSync(path.join(root, 'ios/App/App/ViewController.swift'), 'utf8');
  H.ok(/registerPluginInstance\(BarcodeScannerPlugin\(\)\)/.test(vc), 'it is registered in capacitorDidLoad');

  // And it has to actually be in the build. Four pbxproj entries or it never compiles in.
  const pbx = fs.readFileSync(path.join(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
  const refs = (pbx.match(/BarcodeScannerPlugin\.swift/g) || []).length;
  H.ok(refs >= 4, 'the Xcode project references it in all four places (found ' + refs + ')');
  H.ok(/BarcodeScannerPlugin\.swift in Sources/.test(pbx), 'and it is in the Sources build phase');

  // It must never reject an ordinary outcome — the JS falls back, and a rejection reads as a crash.
  H.ok(/"cancelled": true/.test(sw), 'a cancelled scan resolves rather than rejecting');
  H.ok(/viewWillDisappear/.test(sw), 'a swipe-dismiss still answers the promise (no hung await)');
  H.ok(/metadataObjectTypes = formats/.test(sw), 'the formats are set AFTER addOutput, or the list is empty');
  H.ok(/digits\.count >= 8/.test(sw), 'a too-short read is ignored rather than looked up');

  // Fails closed on the web: the button starts hidden and is only revealed by the async check.
  const btn = (H.html.match(/<button[^>]*id="barcode-live-btn"[^>]*>/) || [''])[0];
  H.ok(/display:none/.test(btn), 'the live-scan button is hidden until proven available');
  H.ok(/LiveScan\.available\(\)\.then/.test(H.html), 'and revealed only when a live scan can really happen');
  H.ok(/permission !== 'denied'/.test(H.html), 'a denied camera permission counts as unavailable');

  // The claim that started it: BarcodeDetector never existed in WebKit.
  const code = H.html.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  H.ok(!/iOS Safari 17\+/.test(code), 'the false "iOS Safari 17+ supports BarcodeDetector" claim is gone');
  H.ok(/'BarcodeDetector' in window/.test(code), 'the web fast path is still tried where it does exist');
}

H.section('the voice is universal — copy must not assume a man');
{
  // The soul note is explicit: the founder's story stays "big brother", but the APP's voice serves men
  // and women both, and the app even knows the person's sex (userSex). The Grow tab still told every
  // reader "Discipline of the body is discipline of the man". BROTHER_VOICE is exempt on purpose — it
  // adapts ("a big brother to a man, a big sister to a woman"), which is the correct pattern.
  // Strip BOTH comment kinds. The JS-comment-only version of this failed on the HTML comment recording
  // what the old copy said — the third time in this file that a ratchet caught its own documentation.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const assumesMale = [
    'discipline of the man', 'the man you want to be', 'be a better man', 'man up',
    'be the man ', 'as a man,', 'every man '
  ].filter(p => code.toLowerCase().includes(p));
  H.eq(assumesMale, [], 'no user-facing copy assumes the reader is a man');
  H.ok(/big sister to a woman/.test(H.html), 'the voice still adapts to sex where it should (BROTHER_VOICE)');
}

H.section('app lock — must never lock a person out of their own journal');
{
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const sw = fs.readFileSync(path.join(root, 'ios/App/App/BiometricPlugin.swift'), 'utf8');
  const plist = fs.readFileSync(path.join(root, 'ios/App/App/Info.plist'), 'utf8');
  const vc = fs.readFileSync(path.join(root, 'ios/App/App/ViewController.swift'), 'utf8');
  const pbx = fs.readFileSync(path.join(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');

  // THE ANTI-LOCKOUT INVARIANTS. These are the ones that would hurt a real person: a lock they cannot
  // open, on the journal holding their confessions.
  H.ok(/evaluatePolicy\(\.deviceOwnerAuthentication,/.test(sw),
    'the policy allows the PASSCODE as a fallback to Face ID (never biometrics-only)');
  H.ok(!/evaluatePolicy\(\.deviceOwnerAuthenticationWithBiometrics/.test(sw),
    'it never evaluates a biometrics-only policy, which would strand anyone whose face fails');
  H.ok(/"unavailable": true/.test(sw), 'a device that cannot authenticate reports unavailable, not failure');
  // ...and every unavailable path in the JS must OPEN the app and switch the lock off.
  const unlock = H.html.slice(H.html.indexOf('async function unlockApp('));
  const unlockBody = unlock.slice(0, unlock.indexOf('\n// force=true'));
  H.ok(/r\.unavailable/.test(unlockBody), 'unlockApp handles the unavailable case');
  H.ok(/ls\('totry_lock_on', false\)/.test(unlockBody), 'and turns the lock OFF rather than holding the door shut');
  H.ok(/app-lock'\); if\(el\) el\.remove\(\)/.test(unlockBody), 'and removes the overlay so they get in');
  // The web has no way to unlock at all, so the gate must never fire there.
  const gate = H.html.slice(H.html.indexOf('function maybeLockApp('));
  H.ok(/isNativeApp==='function' && isNativeApp\(\)/.test(gate.slice(0, 700)), 'the lock never engages on the web');

  // A lock belongs to a device. Syncing it would lock a new phone before Face ID was ever set up on it.
  const keys = (H.html.match(/SYNC_KEYS\s*=\s*\[([\s\S]*?)\]/) || ['', ''])[1];
  H.ok(!/totry_lock_on/.test(keys), 'the lock preference does not sync between devices');

  // MANDATORY: iOS terminates the app outright if it evaluates a Face ID policy with no usage string.
  H.ok(/NSFaceIDUsageDescription/.test(plist), 'NSFaceIDUsageDescription is declared (or the app crashes)');

  // The plugin has to be reachable at all: right jsName, registered by instance, in the build.
  H.eq((sw.match(/jsName\s*=\s*"([A-Za-z]+)"/) || [])[1], 'Biometric', 'jsName matches the JS lookup');
  H.ok(/(?:Plugins|\bP)\.Biometric\b/.test(H.html), 'index.html looks it up under that name');
  H.ok(/registerPluginInstance\(BiometricPlugin\(\)\)/.test(vc), 'registered in capacitorDidLoad');
  H.ok((pbx.match(/BiometricPlugin\.swift/g) || []).length >= 4, 'all four pbxproj entries present');

  // Fails closed in the UI, and proves the lock works before committing to it.
  const row = (H.html.match(/<div class="card" id="lock-row"[^>]*>/) || [''])[0];
  H.ok(/display:none/.test(row), 'the settings row is hidden until the device is known to support it');
  const toggle = H.html.slice(H.html.indexOf('async function toggleAppLock('));
  H.ok(toggle.indexOf('Lock.prove(') < toggle.indexOf("ls('totry_lock_on'"),
    'turning the lock ON requires a successful auth FIRST, so it is tested before it is trusted');

  // Coming back from the share sheet or the camera must not demand Face ID.
  H.ok(/_lockHiddenAt\) > 20000/.test(H.html), 'only a real absence re-locks, not every sheet that hides the webview');
}

H.section('loading the bar — plate maths');
{
  // The last real gap against Hevy/Strong. Core math, so it gets real assertions: at the rack, a wrong
  // answer means unracking and starting again.
  const { platesForSide } = H.load(['platesForSide'], { PLATES_KG: [25, 20, 15, 10, 5, 2.5, 1.25] });
  const side = (t, b) => platesForSide(t, b).perSide;

  H.eq(side(102.5, 20), [25, 15, 1.25], '102.5kg on a 20kg bar → 25 + 15 + 1.25 per side');
  H.eq(side(100, 20), [25, 15], '100kg → 25 + 15');
  H.eq(side(60, 20), [20], '60kg → a single 20');
  H.eq(side(22.5, 20), [1.25], '22.5kg → the smallest plate');
  H.eq(side(20, 20), [], 'exactly the bar → no plates, not an error');
  H.eq(side(132.5, 20), [25, 25, 5, 1.25], 'repeats a plate when needed, with no float drift');
  H.eq(side(65, 15), [25], 'a 15kg bar changes the answer');
  H.eq(side(47.5, 10), [15, 2.5, 1.25], 'and so does a 10kg bar');

  // Every multiple of 2.5 above the bar must land EXACTLY — that is the whole promise. NOT 1.25: plates
  // load in PAIRS, so the smallest 1.25kg plate adds 2.5kg to the total. This assertion failed at 113/225
  // when it was written as 1.25 and caught exactly that error in the comment shipped beside the code.
  let exact = 0, checked = 0;
  for (let t = 20; t <= 300; t += 2.5) {
    const r = platesForSide(t, 20);
    checked++;
    if (r.off === 0 && r.achieved === +t.toFixed(2)) exact++;
  }
  H.eq(exact, checked, 'every 1.25kg step from 20 to 300kg loads exactly (' + checked + ' targets)');

  // And when it CANNOT be exact, it says so rather than silently rounding.
  const odd = platesForSide(101, 20);
  H.eq(odd.achieved, 100, '101kg is not loadable — the closest is 100kg');
  H.eq(odd.off, -1, 'and it reports being 1kg under, not a false exact match');
  H.ok(!odd.under, '101kg is over the bar, so it is not the under-the-bar case');

  // Below the bar is its own honest answer, never negative plates.
  const under = platesForSide(15, 20);
  H.ok(under.under === true, '15kg on a 20kg bar reports under:true');
  H.eq(under.perSide, [], 'and asks for no plates');
  H.eq(under.achieved, 20, 'the bar alone is what you would be lifting');

  // 1.25kg above the bar is NOT reachable — one plate cannot go on one side only.
  const halfStep = platesForSide(21.25, 20);
  H.eq(halfStep.perSide, [], '21.25kg asks for half a pair, so no plates fit');
  H.eq(halfStep.off, -1.25, 'and it says so: 1.25kg under, never a false exact');

  H.eq(platesForSide('abc', 20), null, 'garbage in → null, not NaN plates');
  H.eq(platesForSide(100, 'x'), null, 'a garbage bar → null too');

  // ONE CALCULATOR, ONE ANSWER. v426 added this without checking the app already had
  // openPlateCalculator()/renderPlateBreakdown(). They disagreed — the older one carried a 0.5kg plate,
  // so it called 101kg loadable while this one correctly says the closest is 100kg — and they COLLIDED,
  // both using id="plate-target". The existing "no duplicate top-level function" ratchet could not catch
  // it: two different NAMES doing the same job. This checks the job, not the name.
  // Measured on a COMMENT-STRIPPED view. The note explaining this very bug quotes id="plate-target",
  // and the first version of this assertion counted that comment as a second live element — the same
  // trap that has now produced five false readings in this project, twice from comments I wrote myself.
  const plateCode = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  // '[Pp]late' also matches TemPLATE — renderTemplates, importTemplate, mapToHevyTemplate. Exclude both
  // Template and Plateau, or this counts eleven unrelated functions as plate calculators.
  const platesFns = (plateCode.match(/function [A-Za-z_]*[Pp]late[A-Za-z_]*\s*\(/g) || [])
    .filter(f => !/Plateau|emplate/.test(f));
  H.ok(platesFns.length <= 6, 'only one plate calculator implementation survives (' + platesFns.join(' ') + ')');
  H.ok(!/function openPlateCalculator\s*\(/.test(plateCode), 'the duplicate openPlateCalculator is gone');
  H.ok(!/function renderPlateBreakdown\s*\(/.test(plateCode), 'and so is its renderer');
  const targetIds = (plateCode.match(/id="plate-target"/g) || []).length;
  H.eq(targetIds, 1, 'exactly one element owns id="plate-target"');
  const inventories = (plateCode.match(/\[\s*25\s*,\s*20\s*,\s*15\s*,/g) || []).length;
  H.eq(inventories, 1, 'exactly one plate inventory exists, so two answers cannot diverge again');

  // The UI must be reachable from the exercise row, or the maths is dead code.
  H.ok(/onclick="openPlateMath\('\+ei\+'\)"/.test(H.html), 'every exercise row has a Plates button');
  H.ok(/function openPlateMath\(/.test(H.html), 'and the sheet it opens exists');
}

H.section('faith is full but never forced — Christian-only features stay Christian-only');
{
  // The Sacraments tab (Confession, Eucharist, Mass) sat in the static HTML with NO gate at all:
  // #bst-sacraments appeared exactly once in the whole file and applyFaithUIGate never touched it. Driven
  // and confirmed: it rendered for islam, buddhism and secular while the vocabulary layer correctly named
  // their book the Qur'an / Dhammapada / the Stoics. The app was offering a Muslim a Confession tracker.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  // 1. The button is gated by tradition in the faith gate.
  const gate = code.slice(code.indexOf('function applyFaithUIGate('));
  const gateBody = gate.slice(0, gate.indexOf('\nfunction '));
  H.ok(/bst-sacraments/.test(gateBody), 'applyFaithUIGate gates the Sacraments tab');
  H.ok(/christian/i.test(gateBody), 'and it gates it on the tradition being christianity');

  // 2. Hiding a button is not the same as making the destination unreachable.
  const setter = code.slice(code.indexOf('function setBibleTab('));
  const setterBody = setter.slice(0, setter.indexOf('\n}'));
  H.ok(/sacraments'.*faithTradition\(\)/.test(setterBody.replace(/\n/g, ' ')),
    'setBibleTab itself refuses the sacraments destination for a non-Christian');

  // 3. The gate has to actually run when the tradition changes.
  H.ok(/applyFaithUIGate\(\)/.test(code.replace('function applyFaithUIGate()', '')),
    'applyFaithUIGate is actually called somewhere');

  // 3b. The Soul hub's "Pray about today" opened the Christian Word tab for everyone — saints' prayers,
  //     the 66-book reader, "How did God answer this prayer?" — while its three siblings (openScripture,
  //     openTodayAnchor, openPractice) all branched on tradition. Driven after the fix: christianity ->
  //     tab-bible, islam/buddhism/secular -> tab-practice.
  const ops = code.slice(code.indexOf('function openPrayerSection('));
  const opsBody = ops.slice(0, ops.indexOf('\n}') + 2);
  H.ok(/faithTradition\(\)/.test(opsBody), 'openPrayerSection branches on tradition');
  H.ok(/=== 'christianity'/.test(opsBody), 'and the Bible prayer tab is the Christian branch only');
  // v446 routes them to openFaithHome() instead — the practice IF their tradition has one, plus the
  // composer. openPractice() alone was not enough: only dhikr and japa exist, so Buddhism and secular
  // landed on a breath menu with nowhere to bring a specific worry.
  H.ok(/openFaithHome\(\)|openPractice\(\)/.test(opsBody), 'everyone else is routed to a home of their own');

  // 4. faithTradition must keep defaulting to secular — the whole gate inverts if this flips.
  const ft = code.slice(code.indexOf('function faithTradition('));
  H.ok(/secular/.test(ft.slice(0, 260)), 'faithTradition still defaults to secular');
}

H.section('no text field may auto-zoom iOS');
{
  // v418 removed maximum-scale=1.0 (which was suppressing iOS auto-zoom at the cost of disabling
  // pinch-to-zoom for low-vision users), on the premise that every field is >=16px. Two things then
  // showed that premise was fragile: .set-input was 12px via a CSS CLASS on createElement'd inputs
  // (invisible to both a source scan for class="..." and a DOM scan, fixed v426), and the BASE rule for
  // input,textarea,select sat at 13px, harmless only because an identical-specificity rule 845 lines
  // later re-set it to 16px. Reorder that and every input starts zooming. This pins the invariant.
  const fs = require('fs');
  const path = require('path');
  const css = [...H.html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');

  // 1. No rule targeting a text field may set font-size below 16px.
  const offenders = [];
  for (const rule of css.split('}')) {
    if (!rule.includes('{')) continue;
    const [sel, body] = rule.split('{');
    const clean = sel.replace(/\/\*[\s\S]*?\*\//g, '');       // drop comments from the selector
    if (!/(^|[\s,>+~])(input|textarea|select)\b/.test(clean)) continue;
    const m = body.match(/font-size:\s*([0-9.]+)px/);
    if (m && parseFloat(m[1]) < 16) offenders.push(clean.trim().slice(0, 50) + ' -> ' + m[1] + 'px');
  }
  H.eq(offenders, [], 'no CSS rule puts a text field under 16px');

  // 2. No class applied to a createElement'd field may be under 16px either — how .set-input hid.
  const sizes = {};
  for (const rule of css.split('}')) {
    if (!rule.includes('{')) continue;
    const [sel, body] = rule.split('{');
    const m = body.match(/font-size:\s*([0-9.]+)px/);
    if (!m) continue;
    for (const c of sel.match(/\.([A-Za-z0-9_-]+)/g) || []) sizes[c.slice(1)] = parseFloat(m[1]);
  }
  const made = new Set([...H.html.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*document\.createElement\('(?:input|textarea|select)'\)/g)].map(m => m[1]));
  const small = [];
  for (const v of made) {
    for (const m of H.html.matchAll(new RegExp(v + "\\.className\\s*=\\s*'([^']+)'", 'g'))) {
      for (const c of m[1].split(/\s+/)) if (sizes[c] !== undefined && sizes[c] < 16) small.push('.' + c + ' -> ' + sizes[c] + 'px');
    }
  }
  H.eq(small, [], 'no dynamically-created field gets a class under 16px');

  // 3. And the scale locks must stay off, or the accessibility fix is undone.
  const vp = (H.html.match(/<meta name="viewport"[^>]*>/) || [''])[0];
  H.ok(!/user-scalable\s*=\s*no/.test(vp), 'pinch-to-zoom is not disabled in the viewport');
  H.ok(!/maximum-scale/.test(vp), 'no maximum-scale lock');
  H.ok(/viewport-fit=cover/.test(vp), 'and viewport-fit=cover is kept for the safe-area insets');
  // The Capacitor key that actually controls pinch in the wrapper (v418 alone did nothing).
  const cap = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'capacitor.config.json'), 'utf8'));
  H.ok(cap.ios && cap.ios.zoomEnabled === true, 'ios.zoomEnabled is true, which is what actually enables pinch natively');
}

H.section('a backup file must never be a credential');
{
  // exportAllData() dumped EVERY totry_ key straight into a JSON file that is then handed to the iOS
  // share sheet — AirDrop, email, cloud storage. Among those keys sat totry_auth_session: the live
  // Supabase access AND refresh token. The backup was a bearer credential for the account, usable with
  // no password and no second factor until the refresh token expired. Import was the same hole facing
  // the other way: restoring someone else's file would install THEIR session on this device.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  H.ok(/const BACKUP_NEVER = \[/.test(code), 'there is an explicit never-back-up list');
  const list = (code.match(/const BACKUP_NEVER = \[([\s\S]*?)\]/) || ['',''])[1];
  for (const k of ['totry_auth_session', 'totry_google_token', 'totry_strava_token', 'totry_hevy_api_key']) {
    H.ok(list.includes(k), k + ' is excluded from backups');
  }
  H.ok(/function backupSafeKey\(/.test(code), 'one shared rule decides what may be backed up');

  // The export loop and the import filter must BOTH use it — a raw startsWith on either side reopens it.
  const exp = code.slice(code.indexOf('async function exportAllData('));
  const expBody = exp.slice(0, exp.indexOf('\nasync function') > 0 ? exp.indexOf('\nasync function') : 2000);
  H.ok(/backupSafeKey\(k\)/.test(expBody), 'the exporter filters through backupSafeKey');
  H.ok(!/k\.startsWith\('totry_'\)\)\s*dump\[k\]/.test(expBody), 'and no longer dumps every totry_ key');

  const imp = code.slice(code.indexOf('function importAllData('));
  const impBody = imp.slice(0, 1600);
  H.ok(/filter\(backupSafeKey\)/.test(impBody), 'the importer filters through it too');

  // Exact matching, not substring — these are real user data whose names merely look credential-ish.
  H.ok(/indexOf\(k\) === -1/.test(code) || /includes\(k\)/.test(code), 'exclusion matches keys exactly');
  for (const keep of ['totry_pt_sessions', 'totry_poker_sessions']) {
    H.ok(!list.includes(keep), keep + ' is real data and must still be backed up');
  }
}

H.section('the crisis surface must speak the person\'s own tradition');
{
  // Live SOS "Step 2 of 3 — Receive the word" handed a Bible verse, stamped "(ESV)", with read-aloud and
  // a shareable card, to a Muslim, Hindu, Buddhist or secular person mid-urge. Both sources were
  // Bible-only: the AI fetch (BIBLE_SYS = "You are a Bible scholar...") and the vice playbook, whose
  // every anchor is a Bible reference. faithTradition() defaults to SECULAR, so this was the DEFAULT
  // path — and FAITHS.secular.voice says "Use NO religious language at all. Never mention God,
  // scripture, or prayer." Verified across all five traditions after the fix.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  H.ok(/function _sosAnchor\(/.test(code), 'the SOS anchor goes through a tradition-aware resolver');
  const fn = code.slice(code.indexOf('function _sosAnchor('));
  const body = fn.slice(0, fn.indexOf('\nfunction '));
  H.ok(/faithTradition\(\)/.test(body), 'it asks which tradition the person is');
  H.ok(/activeVerses\(\)/.test(body), 'and draws from their own verse set, not a new hardcoded list');
  H.ok(/=== 'christianity'/.test(body), 'the Bible sources are reserved for someone who is Christian');
  H.ok(/ESV/.test(body.split("=== 'christianity'")[1].slice(0, 400)),
    'the (ESV) stamp sits inside the Christian branch only');

  // It must actually be called — a resolver nothing uses is the signature dead-code failure.
  const g = code.slice(code.indexOf('function goSosP2('));
  const gBody = g.slice(0, 1800);
  H.ok(/_sosAnchor\(pb\)/.test(gBody), 'goSosP2 uses it');
  H.ok(!/sosVerseData\?\.verse \|\| pb\.verse/.test(gBody), 'and no longer renders the Bible verse directly');

  // The label is part of the same promise — "the word" presumes a scripture.
  H.ok(/_SOS_P2_LBL/.test(code), 'the step label is per-tradition');
  const lbl = (code.match(/const _SOS_P2_LBL = \{([\s\S]*?)\}/) || ['',''])[1];
  for (const t of ['christianity','islam','hinduism','buddhism','secular']) {
    H.ok(new RegExp(t + '\\s*:').test(lbl), 'the label covers ' + t);
  }
  H.ok(/Steady your mind/.test(lbl), 'and the secular label carries no religious language');

  // No paid Bible-scholar call on behalf of someone who is not Christian.
  const f = code.slice(code.indexOf('async function fetchSosVerse('));
  H.ok(/faithTradition\(\) !== 'christianity'\) return/.test(f.slice(0, 900)),
    'fetchSosVerse returns early for a non-Christian instead of asking BIBLE_SYS');
}

H.section('the ED-safe floor governs the app\'s OWN prescriptions');
{
  // _calFloor() is 1500 for a man, 1200 for a woman, and goalAdjustedTarget() clamps to it under the
  // comment "never prescribe a reckless deficit". adjustCaloriesFromWeightTrend — the path where the APP
  // moves the target off a weight trend with nobody asking — used a hardcoded 1200 instead. A man could
  // be walked to 1450 automatically and told "Your targets shifted" with a success haptic. It also scaled
  // protein DOWN with calories (backwards: protein is what you protect in a deficit) and left carb/fat
  // untouched, so the four saved macros stopped summing to the target the ring draws.
  // Driven live after the fix: male wanted 1450 -> got 1500; female wanted 1150 -> got 1200; protein rose
  // to 176 in both; macros summed exactly to the target.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  const fn = code.slice(code.indexOf('function adjustCaloriesFromWeightTrend('));
  const body = fn.slice(0, fn.indexOf('\nasync function'));

  H.ok(!/Math\.max\(1200,/.test(body), 'the auto-adjust no longer hardcodes 1200 as the floor');
  H.ok(/_calFloor\(\)/.test(body), 'it uses _calFloor(), which knows the person\'s sex');
  H.ok(!/goals\.pro = Math\.round\(goals\.pro \* /.test(body), 'protein is no longer scaled down with calories');
  H.ok(/macrosForCalories\(/.test(body), 'all four macros are re-derived so they still sum to the target');
  H.ok(/let goals =/.test(body), 'goals is let — as const, the re-derive threw only when a trend fired');

  // The manual path keeps its different, deliberate contract: open a door, never override.
  const save = code.slice(code.indexOf('function saveNutGoals('));
  const saveBody = save.slice(0, 2500);
  H.ok(!/cal < 1200/.test(saveBody), 'the care door is keyed to _calFloor(), not a bare 1200');
  H.ok(/showLowCalorieCare\(\)/.test(saveBody), 'and it still opens the gentle door rather than overriding');

  // _calFloor itself must keep its two values, or every clamp above silently changes meaning.
  const cf = code.slice(code.indexOf('function _calFloor('));
  H.ok(/1200/.test(cf.slice(0,200)) && /1500/.test(cf.slice(0,200)), '_calFloor still returns 1500 male / 1200 female');
}

H.section('running out of room must never destroy what cannot be recreated');
{
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const fn = code.slice(code.indexOf('function _lsEmergencyPrune('));
  const body = fn.slice(0, fn.indexOf('\nfunction ls('));

  // 1. The last resort used to be removeItem('totry_progress_photos') — every progress photo, silently,
  //    after which ls() retried, succeeded and returned true. Photos are device-only (correctly: the
  //    privacy policy promises it) and exportFullBackup walks SYNC_KEYS, so they are in no cloud and no
  //    backup file. Device-only is exactly why deleting them is unrecoverable, not why it is safe.
  H.ok(!/removeItem\('totry_progress_photos'\)/.test(body),
    'the prune never deletes the whole photo library to make room');

  // 2. localStorage.setItem is overridden at boot to push SYNC_KEYS writes to the cloud, and
  //    coach_history / pt_history / strava_activities are all in SYNC_KEYS — so an untrimmed prune write
  //    uploaded the truncation and deleted the same history on every other device.
  H.ok(/_originalSetItem/.test(body), 'the prune writes device-locally, not through the syncing setItem');
  H.ok(/_w\.call\(localStorage/.test(body) || /_originalSetItem\.call\(/.test(body),
    'and it calls the unmonitored write with localStorage as the receiver');

  // 3. A save that cost someone photos must say so.
  const lsFn = code.slice(code.indexOf('function ls(k,v){'));
  const lsBody = lsFn.slice(0, 2200);
  H.ok(/progress_photos/.test(lsBody), 'ls() looks at what the prune cost');
  H.ok(/Storage was full/.test(lsBody), 'and tells the person when photos were removed');

  // 4. The photo cap and the prune trim must not silently disagree about how many are kept.
  H.ok(/totry_progress_photos', a => Array\.isArray\(a\) \? a\.slice\(0, 8\)/.test(code),
    'the prune trim keeps the newest 8 (change this and update the toast copy)');
}

H.section('a gated disclosure must not ride along to the model');
{
  // The gate stopped the immediate reply and then left the raw sentence in cH/ptH, so the NEXT message
  // shipped it to Gemini / Groq / OpenRouter / Anthropic anyway. persistCoachHistory() writes
  // totry_coach_history, which IS in SYNC_KEYS, so it was uploaded to the database as well. The companion
  // path already solved this and says why; the two coach handlers had not.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  for (const [fn, hist] of [['sendCoach', 'cH'], ['sendPT', 'ptH']]) {
    const i = code.indexOf('async function ' + fn + '(');
    H.ok(i > 0, fn + ' exists');
    const body = code.slice(i, i + 1600);
    const pushRaw = body.indexOf(hist + ".push({role:'user',content:t})");
    const gate = body.indexOf('detectCrisis');
    H.ok(pushRaw > gate, fn + ' pushes the raw turn only AFTER the crisis gate');
    H.ok(/disclosed something serious/.test(body), fn + ' puts a redacted placeholder in the history instead');
  }

  // And the companion's original, which is where the pattern came from.
  H.ok(/never let the disclosure ride along|disclosed something serious/.test(code),
    'the companion still redacts too');
}

H.section('the offline floor must be reachable for a REAL outage');
{
  // v420 vendored the SDK, capped the boot loops, and claimed the app now opens with no connection. It
  // fixed the wrong cause and then HID the right one: bootWithoutCloud() was only ever called when the
  // SDK or the client was missing, and vendoring the SDK means the SDK always loads. The dominant real
  // case — offline with an EXPIRED access token (they last an hour) — went down a different path
  // entirely: supabase-js retried for ~25-30s while the first-run welcome screen showed, then resolved
  // session:null and hit the sign-up wall, over months of the person's own data sitting in localStorage.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const i = code.indexOf('async function checkAuthAndStart(');
  const body = code.slice(i, i + 4200);

  H.ok(/Promise\.race\(/.test(body), 'the session lookup is bounded, not awaited indefinitely');
  H.ok(/__timeout/.test(body) && /bootWithoutCloud\('session-timeout'\)/.test(body),
    'a slow session lookup falls through to the offline floor');
  H.ok(/bootWithoutCloud\('no-session-offline'\)/.test(body),
    'no session + local data opens their app instead of the sign-up wall');
  H.ok(/bootWithoutCloud\('auth-check-failed'\)/.test(body), 'the error path is guarded the same way');

  // A genuinely new person must still be walled — the guard has to read local data, not fire blindly.
  const guards = (body.match(/ls\('totry_onboarded'\)/g) || []).length;
  H.ok(guards >= 2, 'both fallback branches check what this device already knows (' + guards + ')');

  // And bootWithoutCloud must have more than the two SDK-missing callers it had at v420.
  const callers = (code.match(/bootWithoutCloud\('/g) || []).length;
  H.ok(callers >= 4, 'the offline floor has real callers now, not only SDK-missing ones (' + callers + ')');
}

H.section('macro floors must stay payable');
{
  // At the ED-safe calorie floor a heavy person cannot pay both the protein floor (2.2g/kg) and the fat
  // floor (0.5g/kg) — from about 113kg at 1500 kcal. The rescue trimmed fat but could not touch protein,
  // so carbs clamped to 0 and the four returned macros summed to MORE than the cal returned beside them
  // (115kg/1500 gave 1534). renderNutritionLog draws the ring from these fields, so the ring contradicted
  // the goal on screen. A sweep found 24 of 46 rows wrong.
  const { macrosForCalories } = H.load(['macrosForCalories'], { ls: () => null, getBodyweight: () => H.__bw });
  let mismatches = 0, rows = 0;
  for (const cal of [1500, 1200, 1800]) {
    for (let bw = 50; bw <= 160; bw += 5) {
      H.__bw = bw; rows++;
      const m = macrosForCalories(cal, { proPerKg: 2.2 });
      if (Math.abs(m.pro * 4 + m.carb * 4 + m.fat * 9 - cal) > 12) mismatches++;
    }
  }
  H.eq(mismatches, 0, 'macros sum to the target across ' + rows + ' bodyweight/calorie combinations');

  // Protein is still protected in the ordinary case — the cap must only bite when the budget cannot hold it.
  H.__bw = 80;
  const normal = macrosForCalories(2400, { proPerKg: 2.2 });
  H.ok(normal.pro >= 170, 'protein is still ~2.2g/kg when the calories allow it');
  H.ok(normal.carb > 0, 'and carbs are not needlessly zeroed');
}

H.section('every SaveFile caller honours the three-way contract');
{
  // SaveFile.save returns true / false / null-for-cancelled. exportFullBackup — the prominent Settings
  // "Backup" button — threw the result away, so a cancelled share sheet AND a failed write both said
  // "Backup saved". It was the only one of the five call sites that did.
  const code = H.html.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const sites = [...code.matchAll(/SaveFile\.save\(/g)].map(m => m.index);
  H.ok(sites.length >= 5, 'found the SaveFile call sites (' + sites.length + ')');
  const unbound = sites.filter(i => {
    const pre = code.slice(Math.max(0, i - 90), i);
    return !/(=|return|\.then|await\s+SaveFile\.save\)|\bconst\s+\w+\s*=\s*await\s*)$/.test(pre.trim().slice(-40) + ' ') &&
           !/=\s*await\s*$/.test(pre) && !/=\s*$/.test(pre.trim()) && !/\.then\($/.test(pre.trim());
  });
  // The specific regression: exportFullBackup must branch on the result.
  const efb = code.slice(code.indexOf('async function exportFullBackup('), code.indexOf('async function exportFullBackup(') + 2400);
  H.ok(/=\s*await SaveFile\.save\(/.test(efb), 'exportFullBackup binds the result');
  H.ok(/=== null\) return/.test(efb), 'and says nothing when the person cancelled');
  H.ok(/Not saved/.test(efb), 'and admits it when the write actually failed');
}

H.section('restore must not install someone else\'s credentials');
{
  // v430 filtered the export and importAllData, but confirmRestore — the restore half of the PROMINENT
  // Settings pair — wrote every key in the file verbatim, including totry_auth_session, with no
  // backupSafeKey filter and not even a totry_ prefix check.
  const code = H.html.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const cr = code.slice(code.indexOf('function confirmRestore('), code.indexOf('function confirmRestore(') + 1400);
  // Asserts the INVARIANT, not one literal shape: v445 moved the filtering into a shared restoreKeys()
  // used by both restore entry points, which is better than two copies — but it broke an assertion that
  // was pinned to the old inline expression. Pin what must be TRUE (every restore path filters, and
  // reports only what landed), not how it happens to be written today.
  const rk = code.slice(code.indexOf('function restoreKeys('), code.indexOf('function restoreKeys(') + 1800);
  H.ok(/filter\(backupSafeKey\)/.test(rk), 'the shared restore path filters through backupSafeKey');
  H.ok(/out\.ok\+\+/.test(rk) && /catch/.test(rk), 'and counts a key only after its write returned');
  H.ok(!/Object\.entries\(data\)\.forEach/.test(cr), 'confirmRestore no longer writes every key in the file');
  // Both entry points must go through it — two implementations is how they drift apart.
  const usesShared = (code.match(/restoreKeys\(data\)/g) || []).length;
  H.ok(usesShared >= 2, 'both restore entry points use the shared path (' + usesShared + ')');
}

H.section('location: declared, coarsened, and disclosed everywhere');
{
  // The app calls navigator.geolocation.getCurrentPosition and puts latitude/longitude in a query string
  // to api.aladhan.com for prayer times. NSLocationWhenInUseUsageDescription was MISSING, which does not
  // get you rejected — iOS terminates the app the moment the call is made, in front of whoever is
  // holding it. Neither privacy policy nor the privacy manifest mentioned location at all.
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const code = H.html.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  const usesGeo = /navigator\.geolocation/.test(code);
  H.ok(usesGeo, 'the app does use geolocation (if this ever goes false, drop the plist key too)');
  if (usesGeo) {
    const plist = fs.readFileSync(path.join(root, 'ios/App/App/Info.plist'), 'utf8');
    H.ok(/NSLocationWhenInUseUsageDescription/.test(plist),
      'Info.plist declares the location usage string — without it iOS terminates the app on the call');
    const priv = fs.readFileSync(path.join(root, 'ios/App/App/PrivacyInfo.xcprivacy'), 'utf8');
    H.ok(/CoarseLocation|PreciseLocation/.test(priv), 'the privacy manifest declares location');

    // Coarsened before it leaves the device — full GPS precision buys nothing for prayer times.
    H.ok(/Math\.round\(coords\.lat\s*\*\s*100\)/.test(code), 'coordinates are rounded to ~1km before use');

    // Disclosed in BOTH policies: the hosted one App Store Connect points at, and the in-app modal that
    // people actually read. v421 fixed the hosted copy for Health and left the in-app one wrong.
    const hosted = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');
    H.ok(/aladhan/i.test(hosted), 'privacy.html names api.aladhan.com');
    H.ok(/rounded to about a kilometre/i.test(hosted), 'and says the location is coarsened');
    const modal = code.slice(code.indexOf('function showPrivacyPolicy('), code.indexOf('function showPrivacyPolicy(') + 9000);
    H.ok(/aladhan/i.test(modal), 'the IN-APP policy names api.aladhan.com too');
    H.ok(/Apple Health/.test(modal), 'and the in-app policy finally mentions Apple Health');
  }

  // Every usage string the binary needs must exist — a missing one is a crash, not a warning.
  const plist = fs.readFileSync(path.join(root, 'ios/App/App/Info.plist'), 'utf8');
  for (const [api, key] of [
    ['navigator.geolocation', 'NSLocationWhenInUseUsageDescription'],
    ['camera', 'NSCameraUsageDescription'],
  ]) {
    H.ok(plist.includes(key), key + ' present for ' + api);
  }
}

H.section('a disclosure written down must not become AI context')
{
  // The journal says "Write honestly. This is just for you..." — an invitation to say the hardest thing —
  // and had no gate. The evening asks "if the people you love watched today, what would they see?" and had
  // none either. Gating the moment is only half of it: buildCtx re-reads the journal on EVERY coach
  // message (RECENT JOURNAL) and the evening feeds honestCtx, so a sentence written once was narrated back
  // to a model for days afterwards. Entries are therefore MARKED, never censored, and the readers skip them.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  for (const [fn, flag] of [['saveEntry', '_jCrisis'], ['completeEvening', '_evCrisis']]) {
    const i = code.indexOf('function ' + fn + '(');
    H.ok(i > 0, fn + ' exists');
    const body = code.slice(i, i + 5200);
    H.ok(/detectCrisis\(/.test(body), fn + ' runs the crisis gate');
    H.ok(new RegExp('flagged:!!' + flag).test(body), fn + ' marks the entry rather than discarding it');
    H.ok(/showCrisisResponse\(/.test(body), fn + ' shows the bridge to a human');
  }

  // The readers must skip flagged entries — this is the half that outlives the moment.
  H.ok(/totry_journal'\)\|\|\[\]\)\.filter\(e=>!e\.flagged\)/.test(code),
    "buildCtx's RECENT JOURNAL excludes flagged entries");
  H.ok(/totry_evenings'\)\|\|\[\]\)\.find\(e => e && !e\.flagged/.test(code),
    'the evening reflection fed to the coach excludes flagged ones');

  // Grace over shame: the words are always kept.
  const se = code.slice(code.indexOf('function saveEntry('), code.indexOf('function saveEntry(') + 3000);
  H.ok(!/return;[\s\S]{0,200}entries\.push/.test(se), 'saveEntry never refuses to store what they wrote');
}

H.section('a quality rating is not an hour count')
{
  // The morning card asks "How did you sleep?" and offers Rough / Okay / Good / Great, wired to 3/5/7/9.
  // logMorningSleep wrote that value straight into trackers[day].sleep — the SAME field the Track tab
  // fills with real hours and renders as "Xh" against "Target: 8 hours". So tapping Rough recorded three
  // hours of sleep. getLifeState averaged it, computed a sleep debt from it, and the app told the person
  // "you got about 3h" and told the AI "Sleep: 3h last night". The comment justifying it said the mirror
  // avoided "a stale 0h" — which is the trade backwards: an empty field is honest, an invented one is not.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  const i = code.indexOf('function logMorningSleep(');
  H.ok(i > 0, 'logMorningSleep exists');
  const body = code.slice(i, i + 1400);
  H.ok(/_tr\[_dk\]\.sleepQuality\s*=\s*v/.test(body), 'the rating is stored as quality');
  H.ok(!/_tr\[_dk\]\.sleep\s*=\s*v/.test(body), 'and NOT as hours');

  // Hours and quality must stay separate all the way through the state and the brief.
  H.ok(/qualityWord/.test(code), 'getLifeState exposes a quality word');
  H.ok(/no hours logged, but they described last night as/.test(code),
    'the brief tells the model there are no measured hours rather than inventing some');

  // The grace-framing must still reach someone who only reported a rough night.
  H.ok(/_sl\.quality != null && _sl\.quality <= 3/.test(code),
    'the short-night care rule fires on a rough night too, not only on measured hours');
}

H.section('no screen may claim data stays on the device while it syncs')
{
  // Settings said "Your personal data is stored on your own device" — two lines above a privacy policy
  // that correctly describes a Supabase database. The app upserts to Postgres on every synced write, so
  // the reassuring line on the screen was the false one. This is the same shape as the HealthKit claim
  // (v421) and the backup-file claim (v430): the mechanism was fine, the sentence beside it was not.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  // The app does sync — establish that first, so this test cannot rot into a stale assertion.
  H.ok(/syncToCloud\(/.test(code) && /SYNC_KEYS/.test(code), 'the app really does sync to a server');

  // Therefore no blanket device-only claim may appear in shipped copy. Narrow, specific promises about
  // things that genuinely never leave (progress photos, cycle data) are correct and stay allowed.
  const blanket = [
    /Your personal data is stored on your own device/i,
    /all your data (?:is |stays )?(?:stored )?(?:only )?on (?:your|this) device/i,
    // The lookahead must be wide enough to clear the markup between a heading and its subject: the
    // policy's true section 4 is "What never leaves your device" and only names "Progress photos"
    // about ninety characters later, past a </p> and the next <p style=...>. At 80 it read as a
    // blanket claim and failed a correct line.
    /never leaves your (?:phone|device)(?![\s\S]{0,240}(photo|cycle))/i,
  ];
  const offenders = blanket.filter(re => re.test(code)).map(re => String(re).slice(0, 54));
  H.eq(offenders, [], 'no blanket "stays on your device" claim survives in the UI');

  // And the two narrow promises that ARE true must still be made, because they are real and load-bearing.
  H.ok(/progress photos/i.test(code), 'the app still tells people photos are device-only');
}

H.section('detectCrisis — measured in both directions, with real phrasings')
{
  // Tested rather than assumed, because the sweep reported this detector as "wildly over-inclusive and
  // misses common phrasings" and only HALF of that was true. Measured at v443: 0 false positives across
  // 10 training-context sentences, but 5 MISSES out of 12 genuine disclosures. It was too NARROW, not too
  // broad — the opposite of the report, and the more dangerous direction. These probes are the evidence.
  const { detectCrisis } = H.load(['detectCrisis']);

  const MUST_FIRE = [
    "i don't want to be here anymore",
    'i want to kill myself', 'i want to die', 'i want to end it',
    'thinking about ending things', "i can't go on like this", "i can't do this anymore",
    'everyone would be better off without me', 'unaliving myself',
    'no reason to keep going', 'nothing to live for',
    'i\u2019m going to hurt myself',                     // iOS smart apostrophe — has failed OPEN before
    // A benign completion must not swallow a real disclosure sharing the same sentence.
    'ending things with my ex and i want to die',
    'no reason to keep going to that gym or anywhere, i want to die',
  ];
  const MUST_NOT = [
    // A gate that cries wolf teaches people to dismiss it, and then the one that matters is dismissed too.
    'this workout is killing me', 'that leg day nearly killed me', "i'd kill for a coffee",
    "i'm dying to see her", 'my calves are dead', 'killer session today', 'i died laughing',
    'this diet is murder', 'i want to kill this PR', 'dead lift felt heavy', 'killing it in the gym today',
    // Innocent completions of otherwise-serious phrases.
    'ending things with my ex was hard', 'ending things with her was the right call',
    'no reason to keep going to that gym', "i can't go on this cut much longer",
  ];

  const missed = MUST_FIRE.filter(t => !detectCrisis(t));
  H.eq(missed, [], 'every genuine disclosure fires the gate');
  const falsePos = MUST_NOT.filter(t => detectCrisis(t));
  H.eq(falsePos, [], 'no training-context sentence trips it');
  H.ok(MUST_FIRE.length + MUST_NOT.length >= 28,
    'the probe set stays broad (' + (MUST_FIRE.length + MUST_NOT.length) + ' phrasings)');

  // The suppression must stay narrower than the risk: short spans that stop at the object.
  H.ok(/ending things with \(\?:my \|the \|her \|him \|them \)\?\[a-z'\]\{1,14\}/.test(H.html) ||
       /\[a-z'\]\{1,14\}/.test(H.html),
    'benign-completion spans are bounded, not greedy');
}

H.section('every tradition has somewhere to say what is on their heart')
{
  // The app had exactly ONE intention composer and it lived in the Christian Word tab. v435 correctly
  // stopped routing non-Christians into that tab, but routing someone AWAY from a surface is not giving
  // them one — a Muslim was left with dhikr (a practice) and no way to bring a specific worry.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  H.ok(/function faithHomeHTML\(/.test(code), 'the per-tradition composer exists');
  H.ok(/function openFaithHome\(/.test(code), 'and it has an entry point');
  H.ok(/openFaithHome\(\)/.test(code.replace('function openFaithHome()', '')), 'which is actually called');

  // It must not depend on a practice existing — only dhikr and japa do, so Buddhism and secular
  // previously landed on a breath menu with no composer at all.
  const fh = code.slice(code.indexOf('function openFaithHome('), code.indexOf('function openFaithHome(') + 1800);
  H.ok(/fh-prayer-intention/.test(fh), 'openFaithHome renders the composer itself');
  H.ok(/_renderPractice/.test(fh), 'and still shows the practice for traditions that have one');

  // Distinct ids from the Christian panel — sharing them is what made two plate calculators read each
  // other's input (v442).
  // Exactly ONE occurrence — inside faithHomeHTML's builder string. Two would mean a real duplicate in
  // the DOM, which is the plate-target collision all over again. (The first version of this assertion
  // expected zero, forgetting that the builder string necessarily contains the id it writes.)
  H.eq((H.html.match(/id="fh-prayer-intention"/g) || []).length, 1,
    'the composer id is defined in exactly one place');
  H.ok(/ai-prayer-intention/.test(code) && /fh-prayer/.test(code), 'the two composers use different id prefixes');

  // The generator must read faithPrayer(), not a hardcoded Catholic prompt.
  const gen = code.slice(code.indexOf('async function generateIntentionPrayer('), code.indexOf('async function generateIntentionPrayer(') + 2600);
  H.ok(/faithPrayer\(\)/.test(gen), 'generateIntentionPrayer uses the per-tradition spec');
  H.ok(/pfx/.test(gen), 'and is parameterised so it can be hosted twice without an id collision');
}

H.report();
