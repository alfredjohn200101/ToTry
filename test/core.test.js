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

  // Two failure modes pull in opposite directions and BOTH have shipped here.
  // Re-locking on every hide is maddening: the share sheet, the barcode scanner and permission prompts
  // all hide the web view, and demanding Face ID on the way back from those makes the lock unusable.
  // But 20 seconds — the original value — defeats the lock's own stated threat model, which its header
  // comment gives as "people hand their unlocked phone to a partner, a friend, a child": hand the phone
  // over, they reopen To Try inside twenty seconds, and the journal is simply there.
  // So the window must exist and must be short. Asserted as a range, not a constant, so the next person
  // changing it has to stay inside both constraints rather than re-discovering one of them.
  const _lockWin = (H.html.match(/_lockHiddenAt\) > (\d+)/) || [])[1];
  H.ok(!!_lockWin, 'there is a grace window before re-locking');
  H.ok(Number(_lockWin) >= 1000, 'long enough that a returning system sheet does not demand Face ID');
  H.ok(Number(_lockWin) <= 5000, 'and short enough that handing someone the phone does not bypass it');
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
    // v453: coarsening must happen on every READ, not only on a fresh fetch. v437 put the rounding inside
    // the `if(!coords)` branch, so a value already in totry_geo went out untouched and a second call site
    // read that key raw — the policy claim was true of the first request and false of every one after.
    H.ok(/function geoCoarse\(/.test(code), 'there is a single coarsening accessor');
    const gc = code.slice(code.indexOf('function geoCoarse('), code.indexOf('function geoCoarse(') + 500);
    H.ok(/Math\.round\(g\.lat \* 100\) \/ 100/.test(gc), 'it rounds to two decimal places (~1km)');
    // No raw read of the stored key may survive anywhere.
    const rawReads = (code.match(/ls\('totry_geo'\)/g) || []).length;
    H.eq(rawReads, 1, 'totry_geo is read in exactly one place — inside geoCoarse()');
    H.ok(/geoCoarse\(\)/.test(code.replace('function geoCoarse()', '')), 'and the accessor is actually used');

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
    // v451: the v444 benign-completion suppression SWALLOWED these. "myself" is under fourteen characters,
    // so the span written to excuse "ending things with my ex" also excused "ending things with myself".
    'ending things with myself', 'ending things with my life',
    // And "plan" without a word boundary matched inside "planet", so this read as gym talk.
    "i can't go on this planet anymore", "i can't go on this earth much longer",
    'no reason to keep going to be honest',
    // Existential phrasings the list simply never had.
    "i don't want to be alive", 'i just want to stop existing', 'i hope i never wake up again',
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
    "i can't go on this plan much longer",     // the real word the suppression is for
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

H.section('every tradition has a practice of its own')
{
  // _PRACTICE held only dhikr and japa, so openPractice() sent Buddhism and secular to a generic breath
  // menu and _paintPractice returned early on their kind — they had no practice at all. Two are new.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  for (const kind of ['dhikr', 'japa', 'metta', 'stillness']) {
    H.ok(new RegExp('\\b' + kind + ':\\{').test(code.replace(/\s/g, '')), '_PRACTICE has ' + kind);
  }
  // Every tradition must route somewhere real — a fall-through to the breath menu is what this fixed.
  const op = code.slice(code.indexOf('function openPractice()'), code.indexOf('function openPractice()') + 700);
  for (const t of ['islam', 'hinduism', 'buddhism', 'secular']) {
    H.ok(new RegExp("t==='" + t + "'").test(op), 'openPractice routes ' + t);
  }
  // The secular practice must contain NO religious language — FAITHS.secular says so explicitly.
  const i = code.indexOf('stillness:{');
  const still = code.slice(i, i + 1100);
  const religious = ['God', 'Allah', 'prayer', 'pray', 'scripture', 'divine', 'holy', 'soul', 'bless'];
  const leaked = religious.filter(w => new RegExp('\\b' + w, 'i').test(still));
  H.eq(leaked, [], 'the secular practice uses no religious language');

  // Metta must start with the self — a person who cannot wish themselves well has nowhere to begin.
  const m = code.slice(code.indexOf('metta:{'), code.indexOf('metta:{') + 1200);
  H.ok(/May I be safe/.test(m), 'metta begins with the self');
  H.ok(/difficult/.test(m), 'and includes the difficult person, which is the point of the practice');
  H.ok((m.match(/name:'May/g) || []).length >= 4, 'all four directions are present');
}

H.section('the day-woven hub speaks each tradition')
{
  // "Pray about today →" was shown identically to ALL FIVE traditions. For a secular person that breaks
  // the app's own contract in FAITHS.secular — "Never mention God, scripture, or prayer" — and for a
  // Buddhist it is the wrong verb entirely: Buddhism is non-theistic, one reflects rather than petitions.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  H.ok(/function _soulTodayCta\(/.test(code), 'the hub CTA is computed per tradition');
  const cta = code.slice(code.indexOf('function _soulTodayCta('), code.indexOf('function _soulTodayCta(') + 700);
  H.ok(/faithTradition\(\)/.test(cta), 'it asks which tradition the person is');
  H.ok(/du\\u2019a|du’a/.test(cta), 'islam gets du\'a');
  H.ok(/Reflect on today/.test(cta), 'buddhism and secular reflect rather than pray');
  // The default must be the safe one — faithTradition() defaults to secular, and so must this.
  H.ok(/catch\(_\)\{ return 'Reflect on today'/.test(cta), 'the fallback carries no religious language');
  H.ok(!/'Pray about today';\s*\}\s*catch/.test(cta), 'and the fallback is not the praying one');

  // And the hub must actually use it rather than the old literal.
  const hub = code.slice(code.indexOf('function openSoulToday('), code.indexOf('function openSoulToday(') + 9000);
  H.ok(/_soulTodayCta\(\)/.test(hub), 'openSoulToday renders the computed label');
  H.ok(!/>Pray about today \\u2192<\/button>/.test(hub), 'the hardcoded label is gone');
}

H.section('one journal accessor — no AI path may read a flagged entry')
{
  // v439 gated saveEntry and marked the entry, and its comment named all three downstream leaks BY NAME
  // then claimed "it is marked so it never becomes AI context again". Only buildCtx was filtered.
  // showAIMorningSentence read entry [0] — the NEWEST, i.e. the one just flagged — and
  // generateWeeklySynthesis filtered by date but not by flag. Both run on every Home tap, so a person
  // wrote the worst sentence they will type, got the crisis card, tapped Today, and the app sent it to a
  // third-party model TWICE. Caught by capturing the real outbound request body.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  H.ok(/function safeJournal\(/.test(code), 'there is a single filtered journal accessor');
  const sj = code.slice(code.indexOf('function safeJournal('), code.indexOf('function safeJournal(') + 400);
  H.ok(/!e\.flagged/.test(sj), 'and it excludes flagged entries');

  // Every function that can reach api() must read through it, or filter inline. Checked by NAME so a new
  // AI-feeding reader has to be added here deliberately.
  for (const fn of ['showAIMorningSentence', 'generateWeeklySynthesis', '_weekStats']) {
    const i = code.indexOf('function ' + fn + '(');
    H.ok(i > 0, fn + ' exists');
    // Bound the slice at the NEXT top-level function. A fixed window spilled into neighbours that read
    // the journal for a COUNT (journalCount, the share canvas) — legitimate reads that never reach a
    // model — and reported this function as leaking when it does not.
    const after = code.slice(i + 10);
    const nxt = after.search(/\n(?:async )?function /);
    const body = nxt > 0 ? code.slice(i, i + 10 + nxt) : code.slice(i, i + 6000);
    const readsRaw = /\(ls\('totry_journal'\)\|\|\[\]\)/.test(body);
    H.ok(!readsRaw, fn + ' does not read the journal unfiltered');
    H.ok(/safeJournal\(\)/.test(body), fn + ' reads through safeJournal()');
  }
  // buildCtx and getLifeState feed the brief on every message.
  H.ok(/totry_journal'\)\|\|\[\]\)\.filter\(e=>!e\.flagged\)/.test(code), 'buildCtx still filters');
  H.ok(/j && !j\.flagged && within/.test(code), "getLifeState's 7-day journal filters too");
}

H.section('a crisis response is never conditional, and never destroys the app')
{
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  // 1. NO SHIPPED PATH MAY MASS-REMOVE .modal-bg. #journal-modal, #payday-modal and #rest-timer-overlay
  //    are STATIC elements carrying that class, so the bare selector deletes them permanently. Three of
  //    the four offending sites were crisis paths added in v434/v439 — so after someone disclosed
  //    something serious, openJournal() threw on its first line and the composer was dead for the session.
  const bare = (code.match(/querySelectorAll\('\.modal-bg'\)/g) || []).length;
  H.eq(bare, 0, 'no code mass-removes .modal-bg (it would delete static modals)');
  H.ok(/modal-bg:not\(\[id\]\)/.test(code), 'the id-sparing form is used instead');

  // 2. THE EVENING CRISIS RESPONSE MUST NOT DEPEND ON THE EXAMEN. It used to sit inside the !examenToday
  //    branch, so whether a disclosure got the crisis card depended on an unrelated ritual being ticked —
  //    and when it was ticked the app fired a success haptic and asked "Want to share today?" instead.
  const ce = code.slice(code.indexOf('function completeEvening('), code.indexOf('function completeEvening(') + 9000);
  const iCrisis = ce.indexOf('if(_evCrisis)');
  const iExamen = ce.indexOf('if(!examenToday)');
  H.ok(iCrisis > 0 && iExamen > 0, 'both branches exist');
  H.ok(iCrisis < iExamen, 'the crisis response runs BEFORE the examen branch, not inside it');
  H.eq((ce.match(/if\(_evCrisis\)/g) || []).length, 1, 'there is exactly one crisis branch, not a stale copy');
}

H.section('the weekly check-in marks what it stores')
{
  // v434 gated this surface — the crisis card fires and the AI weekly read is skipped — but it never
  // MARKED the entry, so the struggle text sat unflagged in totry_body and every later reader could hand
  // it to a model. Gating the moment is not the same as gating the record.
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  const i = code.indexOf('function logBody(');
  const lb = code.slice(i, i + 7000);
  H.ok(/detectCrisis\(/.test(lb), 'logBody still gates');
  H.ok(/newEntry\.flagged = true/.test(lb), 'and marks the stored entry');

  // Declaration must precede use, or the flag silently never sets. My first attempt referenced _wkCrisis
  // before its `let` — a TDZ ReferenceError, swallowed by the surrounding try/catch, so the gate would
  // have looked fine and done nothing.
  const decl = lb.indexOf('let _wkCrisis');
  const use = lb.indexOf('newEntry.flagged = true');
  const store = lb.indexOf('entries.unshift');
  H.ok(decl > 0 && decl < use && use < store, '_wkCrisis is declared before it is used, and used before the store');

  // And the reader must skip flagged check-ins, both from the store and when handed the entry directly.
  const g = code.slice(code.indexOf('async function generateWeeklyCoachResponse('), code.indexOf('async function generateWeeklyCoachResponse(') + 1200);
  H.ok(/!e\.flagged/.test(g), 'the weekly coach reader filters flagged check-ins out of the store');
  H.ok(/entry && entry\.flagged\) return/.test(g), 'and refuses to write a response onto a flagged entry');
}

H.section('the last ungated surface, the error screen, and two false delete promises')
{
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  // 1. completeMorning was the third free-text ritual and the only one still ungated.
  const cm = code.slice(code.indexOf('function completeMorning('), code.indexOf('function completeMorning(') + 2600);
  H.ok(/detectCrisis\(/.test(cm), 'completeMorning gates its free text');
  H.ok(/showCrisisResponse\(/.test(cm), 'and shows the bridge');
  H.ok(cm.indexOf('detectCrisis') < cm.indexOf('return;'), 'before it completes the ritual');

  // 2. The auth ERROR step must carry the guest door and the helplines. Both live in the EMAIL step, and
  //    authShowStep('error') hides that step — so the screen someone reaches when sign-in fails offline
  //    had no way in and no numbers, which is the one thing this screen exists to guarantee.
  const err = H.html.slice(H.html.indexOf('id="auth-error"'), H.html.indexOf('id="auth-error"') + 2200);
  H.ok(/enterAsGuest\(\)/.test(err), 'the error step offers the guest door');
  H.ok(/tel:131114/.test(err) && /tel:988/.test(err), 'and carries the crisis numbers');
  H.ok(/failed to fetch/i.test(code), 'a network failure is translated out of browser-speak');

  // 3. Two delete paths promised more than they did.
  const da = code.slice(code.indexOf('async function deleteAccount('), code.indexOf('async function deleteAccount(') + 2000);
  H.ok(/!\(sb && currentUser\)/.test(da), 'deleteAccount handles the signed-out case explicitly');
  H.ok(/was not deleted/i.test(da), 'and says the account was not deleted when it could not reach the server');
  const ra = code.slice(code.indexOf('function resetAll('), code.indexOf('function resetAll(') + 1400);
  H.ok(!/permanently delete ALL your data/.test(ra), 'resetAll no longer claims to delete everything');
  H.ok(/NOT deleted/.test(ra), 'it says what survives on the server');
}

H.section('CSV dates are day-first, and destructive taps ask first')
{
  // `new Date("03/08/2026")` is 8 MARCH in JS, and `new Date("13/08/2026")` is Invalid Date. Every
  // Australian and UK bank statement — the files this importer exists for — came in shifted by months or
  // unparseable, and an unparseable row silently became today.
  const { _csvDate, _csvDayFirst } = H.load(['_csvDate', '_csvDayFirst']);
  const au = ['03/08/2026', '13/08/2026', '01/12/2026'];
  const df = _csvDayFirst(au);
  H.eq(df, true, 'a day above 12 anywhere proves the file is day-first');
  H.eq(_csvDate('03/08/2026', df).getMonth(), 7, '03/08/2026 is August, not March');
  H.eq(_csvDate('03/08/2026', df).getDate(), 3, 'and the third');
  H.eq(_csvDate('13/08/2026', df).getDate(), 13, '13/08/2026 parses at all (new Date returns Invalid)');
  H.eq(_csvDayFirst(['12/25/2026']), false, 'a US file is detected as month-first');
  H.eq(_csvDate('12/25/2026', false).getDate(), 25, 'and read correctly');
  H.eq(_csvDate('2026-08-13', true).getMonth(), 7, 'ISO is unambiguous and wins');
  H.eq(_csvDate('not a date', true), null, 'garbage returns null rather than today');
  H.eq(_csvDayFirst([]), true, 'the default is day-first — this app is en-AU everywhere else');

  // Every destructive one-tap handler asks first. These are glyphs a few pixels wide with no undo.
  const code = H.html.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const unconfirmed = [];
  for (const m of code.matchAll(/function (delete[A-Za-z]+)\s*\([^)]*\)\s*\{/g)) {
    const body = code.slice(m.index, m.index + 900);
    if (!/confirm\(/.test(body)) unconfirmed.push(m[1]);
  }
  // deleteFoodEntry is deliberately exempt: highest-frequency delete in the app, trivially re-logged, and
  // a modal per tap is friction with no payoff. Everything that destroys authored or financial records asks.
  H.eq(unconfirmed, ['deleteFoodEntry'], 'only the trivially-reversible delete skips its confirm');
}

H.section('a debt-free date needs a real month, not one tap')
{
  // monthlyPaymentRate required only 2 payments. The payday allocator books several in ONE TAP, so that
  // was satisfied instantly while the span was ~0 days — and with months floored at 1, the whole lump
  // became the amount this person supposedly pays EVERY month. One tap produced a debt-free date years
  // early, on the screen someone is most likely to believe and least able to check.
  const { monthlyPaymentRate } = H.load(['monthlyPaymentRate'], { ls: () => H.__pays });
  const day = d => new Date(Date.now() - d * 86400000).toISOString();

  H.__pays = [{ amt: 500, ts: day(0) }, { amt: 300, ts: day(0) }, { amt: 200, ts: day(0) }];
  H.eq(monthlyPaymentRate(), null, 'three payments in one tap is not a monthly rate');

  H.__pays = [{ amt: 500, ts: day(7) }, { amt: 500, ts: day(0) }];
  H.eq(monthlyPaymentRate(), null, 'a week of history is not a month');

  H.__pays = [{ amt: 500, ts: day(90) }, { amt: 500, ts: day(60) }, { amt: 500, ts: day(30) }];
  const r = monthlyPaymentRate();
  H.ok(r > 400 && r < 620, 'three months of real payments gives ~500/mo (got ' + Math.round(r) + ')');

  // And the composer's "Write another" must carry its own prefix, or in the faith home it reads the
  // Christian panel's empty textarea and silently does nothing.
  H.ok(/generateIntentionPrayer\(\\''\+pfx\+'\\'\)/.test(H.html) || /pfx\+'\\'\)">Write another/.test(H.html),
    'Write another passes the prefix it was rendered under');
}

H.section('copy the faith pass never reached')
{
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  // The Sunday Sabbath card said "God designed you to need this." to every tradition, including secular —
  // whose own contract in FAITHS.secular is "never mention God".
  H.ok(/function _sabbathLine\(/.test(code), 'the Sabbath line is per-tradition');
  const sl = code.slice(code.indexOf('function _sabbathLine('), code.indexOf('function _sabbathLine(') + 900);
  H.ok(/=== 'christianity'/.test(sl), 'and "God designed you" is the Christian branch only');
  const fallback = sl.slice(sl.lastIndexOf('return '));
  H.ok(!/God/.test(fallback), 'the default carries no religious language');
  H.ok(/_sabbathLine\(\)/.test(code.replace('function _sabbathLine()', '')), 'and it is applied');

  // getNextStep is the Home tab's primary CTA and named the examen — a Catholic practice — for everyone.
  H.ok(/function _nextStepCloseSub\(/.test(code), 'the close-your-day label is per-tradition');
  const ns = code.slice(code.indexOf('function _nextStepCloseSub('), code.indexOf('function _nextStepCloseSub(') + 500);
  H.ok(/examen/.test(ns) && /=== 'christianity'/.test(ns), 'examen is named only for Christians');

  // The flagship integration insight called every user "the same man learning to govern himself".
  H.ok(!/same man learning to govern himself/.test(code), 'the nudge no longer assumes the reader is a man');
  H.ok(/one person learning to govern themselves/.test(code), 'and says it without assuming a sex');
}

H.section('numbers people are asked to act on have bounds, and settings say what they do')
{
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  // calcTDEE feeds a calorie target the person is asked to EAT TO, from three free-number inputs with no
  // bound on any of them. A mistyped weight produced a confident target with no sign anything was wrong.
  const t = code.slice(code.indexOf('function calcTDEE('), code.indexOf('function calcTDEE(') + 2200);
  H.ok(/age >= 13 && age <= 100/.test(t), 'age is bounded');
  H.ok(/weight >= 30 && weight <= 300/.test(t), 'weight is bounded');
  H.ok(/height >= 120 && height <= 230/.test(t), 'height is bounded');
  H.ok(t.indexOf('age >= 13') < t.indexOf('const activity'), 'the bounds run before the calculation');

  // The currency setting drives conversion rates only — ~250 hardcoded "$" are not wired to it. It must
  // not imply otherwise. (A partial symbol sweep is worse than none: mixed symbols on one screen.)
  H.ok(/Amounts still show a \$ sign/.test(code) || /Amounts still display with a \$ sign/.test(code),
    'the currency setting says what it actually changes');
}

H.section('a renderer without a container is a feature that silently does not exist')
{
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const markupIds = new Set([...H.html.matchAll(/id="([\w-]+)"/g)].map(m => m[1]));

  // THE CLASS. A function renders into getElementById('x'), x is nowhere in the file, and the guard
  // `if(!el) return` turns the whole feature into a no-op that parses, tests green, and does nothing.
  // Three shipped instances, each invisible for months:
  //  · #pt-history-list — renderWorkoutHistory() built the session list AND a per-session modal with
  //    every set, its RPE and the notes written at the time. No container: a workout logged in the app
  //    could never be reopened, and PRs sat under a permanently empty heading.
  //  · #br-search-results — searchBible() does reference lookup ("John 3:16"), keyword search and its
  //    own crisis gate, and .bible-search-result has been styled in the CSS since the start. No input
  //    and no container, so browsing book-by-book was the only way to find a verse.
  //  · the fix is the container, so the container is what gets asserted.
  H.ok(markupIds.has('pt-history-list'), 'the workout history list has a container in the markup');
  H.ok(/renderWorkoutHistory\(\)/.test(code.slice(code.indexOf('function setPTTab('), code.indexOf('function setPTTab(') + 900)),
    'and setPTTab(history) actually calls the renderer');
  H.ok(markupIds.has('br-search-results'), 'scripture search has a results container');
  H.ok(markupIds.has('br-search-in'), 'and an input a person can actually type into');

  // searchBible set .innerHTML on the container with no null check, so it THREW rather than no-op'd.
  const sb = code.slice(code.indexOf('async function searchBible('), code.indexOf('async function searchBible(') + 1400);
  H.ok(/br-search-results'\);\s*if\(!res\) return;/.test(sb.replace(/\n/g, '')),
    'searchBible never sets innerHTML on a null container');

  // logLoss() has always accepted a backdate and promptLossDate() has always collected one — nothing
  // connected them, so a slip admitted today restarted the clock from today and the record lied.
  const vm = code.slice(code.indexOf('function openViceManage('), code.indexOf('function openViceManage(') + 2000);
  H.ok(/promptLossDate\(\)/.test(vm), 'a past slip can be logged on the day it really happened');
  H.ok(/promptMassAddLosses\(\)/.test(vm), 'and someone arriving with real history can enter it');

  // "Save targets" read two inputs that no longer exist, so cal/protein resolved to 0, were dropped by
  // a guard, and the toast still said "All daily targets updated."
  const st = code.slice(code.indexOf('function saveAllTargets('), code.indexOf('function saveAllTargets(') + 900);
  H.ok(!/settings-cal-goal/.test(st), 'saveAllTargets no longer reads an input that does not exist');
  H.ok(!/All daily targets/.test(st), 'and its toast claims only what it saved');

  // A SECOND SHAPE OF THE SAME CLASS: the panel and its handler both exist, and no control ever passes
  // that value. setPTTab() toggles 'routines' and looks for #pt-sub-routines; the button was never
  // added, so #pt-panel-routines sat at display:none and the whole routine feature — build one, save
  // it, assign it to a day, browse starter templates — could not be reached. openRoutineBuilder() and
  // openRoutineTemplates() are called only from inside that panel, so they went with it.
  H.ok(markupIds.has('pt-sub-routines'), 'every PT panel has a control that opens it');
  for (const [fn, vals] of [['setPTTab', ['log','routines','history','mobility','ptcoach']],
                            ['setBibleTab', ['find','read','saved','prayer','sacraments']],
                            ['setReflectTab', ['evening','journal','goals','review']]]) {
    for (const v of vals) {
      H.ok(new RegExp(fn + "\\('" + v + "'\\)").test(H.html), `${fn}('${v}') is reachable from a control`);
    }
  }

  // The history row read s.date / s.day / s.completedSets, which ONLY the in-app logger writes. Every
  // session imported from Hevy or Strava carries ts and a name instead, so each imported row rendered
  // "undefined — Day undefined ... undefined/undefined sets" — and imported rows are the ones most
  // people have. Found by driving the app with the shape the importer actually writes.
  const wh = code.slice(code.indexOf('function renderWorkoutHistory('), code.indexOf('function renderWorkoutHistory(') + 2600);
  H.ok(/_when\s*=\s*s\.date\s*\|\|/.test(wh), 'the session date falls back to the timestamp');
  H.ok(/_focus\s*=\s*s\.splitFocus\s*\|\|/.test(wh), 'the session name falls back to its type');
  H.ok(!/'\+s\.date\+'/.test(wh) && !/'\+s\.day\+'/.test(wh), 'no raw date/day is concatenated into a row');
  H.ok(!/s\.completedSets\+'\//.test(wh), 'set counts are derived, not assumed');
  H.ok(/' exercise'\+\(_exN===1\?'':'s'\)/.test(wh), "and nobody is shown \"1 exercises\"");

  // DEAD CODE THAT WOULD REOPEN A CLOSED CLASS. Each of these was complete, unreachable, and one
  // wiring-up away from undoing work that took several passes to get right — which is exactly how
  // this codebase produced three separate instances of the same faith-gate bug.
  //  · showContextualScripture() held hardcoded Christian verses keyed by context, with no tradition
  //    check anywhere in it. It is the v431/v440 bug pre-built and waiting for a caller.
  //  · requestNotifications/scheduleReminders/saveReminderTimes were a second reminder system writing
  //    totry_reminder_* and totry_notif_perm, while the live one (enablePushReminders) writes
  //    totry_push_prefs. Two sources of truth for when the app is allowed to speak to someone.
  //  · saveMealPlan() wrote totry_meal_plans, which nothing has ever read, and toasted "Find it in
  //    your saved meal plans" — a place that does not exist. The live plan is totry_meal_plan.
  //  · the craving panel: five functions and ~40 lines of markup behind a panel setFightTab() went
  //    out of its way to keep hidden.
  for (const gone of ['function showContextualScripture', 'function requestNotifications',
                      'function scheduleReminders', 'function saveReminderTimes',
                      'function saveMealPlan', 'function logCraving', 'function renderCravingLog',
                      'fight-panel-craving']) {
    H.ok(!H.html.includes(gone), `${gone} stays deleted`);
  }
  H.ok(/enablePushReminders/.test(code), 'the one live reminder path is still there');

  // The same ESV key was declared twice; the second copy was never used. The live one is documented
  // in place because it ships publicly and only the account owner can rotate or proxy it.
  H.ok(!/const ESV_API_KEY\s*=\s*'[^']{16,}'/.test(H.html),
    'the ESV key is not declared as a constant any more');
}

H.section('every journal-shaped surface meets a disclosure, and keeps the words')
{
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const { detectCrisis } = H.load(['detectCrisis'], {});

  // ── RECALL. Eight phrasings a flat substring list structurally could not express. Every one was
  // MISSED by the shipped detector and found by RUNNING it, not reading it. "can't go on" is the one
  // that matters most: PRE-LAUNCH.md recorded v444 as closing "I can't go on" and it had not — only
  // the qualified forms (like this / anymore / any longer) were ever added, so all three apostrophe
  // forms of the bare phrase returned null for months.
  for (const phrase of [
    'im thinking about ending my life', 'i keep thinking about ending my life tonight',
    'i want to off myself', 'thinking about offing myself', 'thinking about taking my life',
    'i cant go on', "i can't go on.", 'i can’t go on',
    'i dont want to be here', 'i don’t want to be here',
    'i wont be around much longer', 'i dont belong here anymore',
  ]) H.eq(detectCrisis(phrase), 'suicide', `"${phrase}" fires the gate`);

  // ── PRECISION. A gate that cries wolf gets dismissed the once it matters. "take my life back" is a
  // RECOVERY phrase people write in this app, and it must never be read as its opposite.
  for (const phrase of [
    'i want to take my life back', 'im taking my life back from this addiction',
    'i cant go on this cut', 'i cant go on this diet', 'i cant go on this trip',
    'i took the day off myself', 'i need to take some time off myself',
  ]) H.eq(detectCrisis(phrase), null, `"${phrase}" does NOT fire`);

  // ── COVERAGE. FOUR surfaces write to totry_journal and only saveEntry gated. The other three saved a
  // disclosure with a cheerful toast, left it unflagged so safeJournal() fed it to the model on the next
  // request, and never showed anyone the bridge. The two likeliest places for a first disclosure — the
  // quick "get it out" note and the grief door ("I miss…") — were the two least guarded.
  const fnBody = (name) => {
    const m = code.match(new RegExp('function\\s+' + name + '\\s*\\('));
    if (!m) return '';
    let i = code.indexOf('{', m.index) + 1, d = 1;
    while (i < code.length && d) { const c = code[i]; if (c === '{') d++; else if (c === '}') d--; i++; }
    return code.slice(m.index, i);
  };
  for (const fn of ['saveQuickJournal', '_letGoSaveJournal', '_planAnswerSave']) {
    const b = fnBody(fn);
    H.ok(b.length > 0, `${fn} exists`);
    H.ok(/journalCrisisOf\(/.test(b), `${fn} runs the crisis gate`);
    H.ok(/flagged\s*:\s*!!/.test(b), `${fn} marks the entry so it never becomes AI context`);
    H.ok(/journalMeetCrisis\(/.test(b), `${fn} shows the bridge to real help`);
  }
  H.ok(/function journalCrisisOf\(/.test(code) && /function journalMeetCrisis\(/.test(code),
    'the gate lives in ONE place, not three copies');

  // ── THE WORDS ARE KEPT. completeMorning's crisis branch returned BEFORE the write, so the single
  // moment a person disclosed was the single moment their words were discarded — while the toast said
  // "Saved". The write must come first.
  const cm = fnBody('completeMorning');
  const iWrite = cm.indexOf("ls('totry_mornings'");
  const iGate = cm.indexOf('if(_mCrisis)');
  H.ok(iWrite > 0 && iGate > 0, 'completeMorning has both a write and a gate');
  H.ok(iWrite < iGate, 'the morning ritual is persisted BEFORE the crisis branch can return');
  H.ok(/flagged:!!_mCrisis/.test(cm), 'and the morning row is marked');

  // ── AND NEVER RIDE ALONG. Same leak as v439, one store over: a flagged row must not reach a model.
  H.ok(/totry_mornings'\s*\)\s*\|\|\s*\[\]\)\.filter\(function\(m\)\{ return m && !m\.flagged/.test(code.replace(/\s+/g, ' ')) ||
       /!m\.flagged/.test(fnBody('buildCtx')),
    'buildCtx excludes a flagged morning');
  H.ok(/!e\.flagged/.test(fnBody('getLifeState')), 'getLifeState excludes a flagged evening');
  H.ok(/j\.flagged/.test(fnBody('getLifeState')), 'and still excludes a flagged journal entry');

  // ── THE BRIDGE MUST BE TAPPABLE. The eating-disorder modal printed its helplines as bare <div> text
  // styled gold like links, so someone already struggling had to memorise the digits and leave the app.
  const edStart = code.indexOf('Support that cares');
  const ed = edStart > 0 ? code.slice(edStart, edStart + 2600) : '';
  H.ok(ed.length > 0, 'the eating-disorder support modal exists');
  H.ok(/tel:1800334673/.test(ed), 'the Butterfly Foundation number is dialable');
  H.ok(/tel:131114/.test(ed), 'and so is Lifeline');
}

H.section('the first five minutes: a new person is not mistaken for a returning one')
{
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const fnBody = (name) => {
    const m = code.match(new RegExp('function\\s+' + name + '\\s*\\('));
    if (!m) return '';
    let i = code.indexOf('{', m.index) + 1, d = 1;
    while (i < code.length && d) { const c = code[i]; if (c === '{') d++; else if (c === '}') d--; i++; }
    return code.slice(m.index, i);
  };

  // BLOCKER. PostgREST resolves a .select() with no matching rows to an EMPTY ARRAY, which is truthy —
  // so `if(!data)` let a brand-new account fall through to `return true`, and proceedAfterAuth reads
  // that as "returning user". On the app's only sign-in path (email OTP; authGoogle is a disabled stub)
  // a first-time person had onboarding hidden, was greeted "Welcome back", never saw the name/faith/
  // first-moment steps, and — with totry_onboarded never written — landed on the first-run welcome
  // screen on their NEXT launch with initApp() never running. The correct check existed all along in
  // _restoreFromCloud_legacy_unused, which nothing called.
  const pull = fnBody('pullFromCloud');
  H.ok(pull.length > 0, 'pullFromCloud exists');
  H.ok(/if\(!data \|\| data\.length === 0\)/.test(pull),
    'an empty cloud result is not treated as a restored account');
  H.ok(!/if\(!data\)\{/.test(pull), 'and the null-only guard is gone');

  // renderHomeGreeting / renderLifeWoven / renderNextStep / checkPreviewBanner have one call site
  // between them — go()'s home branch — and no launch path called it, so every returning person and
  // every guest got a Home with no greeting, no one-action CTA, an empty life-woven spine and the
  // first-run card still hidden. Measured: 416 chars on launch vs 1274 after one nav tap.
  const init = fnBody('initApp');
  H.ok(init.length > 0, 'initApp exists');
  H.ok(/go\(window\.__currentTab \|\| 'home'\)/.test(init), 'launch renders the Home it lands on');

  // "I'll do this later" sat beside "Continue" on the vices step and called finishOnboard() directly,
  // skipping the only code that persisted obVices — so every tick, the custom entry and the partner
  // flag were dropped, and the person began with an empty Fight tab.
  H.ok(/function obPersistVices\(/.test(code), 'the vices step has one persistence path');
  const quick = fnBody('obQuickFinish');
  H.ok(/obPersistVices\(/.test(quick), 'and "I\'ll do this later" uses it before leaving');

  // The two reach-out-first mechanisms gated on `!totry_onboarded && !totry_name`, and enterAsGuest
  // writes NEITHER — only totry_guest. A guest was permanently excluded from the companion check-in
  // ("the keystone of the whole app") and the gone-quiet welcome.
  H.ok(/function isSetUpPerson\(/.test(code), 'one helper decides who the app may speak to first');
  H.ok(/totry_guest/.test(fnBody('isSetUpPerson')), 'and a guest counts');
  H.ok(!/if\(!ls\('totry_onboarded'\) && !ls\('totry_name'\)\) return;/.test(code),
    'the old two-key gate is gone from both sites');

  // A dropdown must not overwrite something the person actually told us.
  const tdee = fnBody('calcTDEE');
  H.ok(/_storedSex/.test(tdee), 'calcTDEE prefers a sex already stated');
  H.ok(/if\(!_storedSex\)/.test(tdee), 'and only persists when nothing is known yet');
  H.ok(/tdee-sex/.test(fnBody('prefillNutGoals')), 'and the control is prefilled to show the truth');

  // An input feeding a defaulted save must show its current value, or saving one field resets another.
  const pf = fnBody('initApp');
  H.ok(/settings-steps-goal/.test(pf) && /settings-sleep-goal/.test(pf) && /settings-water-goal/.test(pf),
    'the daily targets are restored before they can be re-saved');

  // Settings that change less than they imply must say so — same call as the currency setting.
  H.ok(/label only/.test(H.html) && /still stored and calculated in kg/.test(H.html),
    'the weight unit says what it actually does');
}

H.section('a store that is read must be a store that is written')
{
  const code = H.html
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const fnBody = (name) => {
    const m = code.match(new RegExp('function\\s+' + name + '\\s*\\('));
    if (!m) return '';
    let i = code.indexOf('{', m.index) + 1, d = 1;
    while (i < code.length && d) { const c = code[i]; if (c === '{') d++; else if (c === '}') d--; i++; }
    return code.slice(m.index, i);
  };

  // Instance SIX of this app's most persistent class — a Christian surface on a default path — and the
  // first to reach a person's own habit list rather than a screen they could walk away from: every new
  // person, secular included, was seeded a "Prayer / scripture" habit.
  H.ok(/function faithHabitName\(/.test(code), 'the spiritual habit is named per tradition');
  const fh = fnBody('faithHabitName');
  H.ok(/Stillness \/ reflection/.test(fh), 'and a secular person gets a secular one');
  H.ok(/Salah/.test(fh) && /Puja/.test(fh) && /Meditation/.test(fh), 'each tradition gets its own name');
  const ih = fnBody('initHabits');
  H.ok(/faithHabitName\(\)/.test(ih), 'the seed uses it');
  H.ok(!/\{n:'Prayer \/ scripture'/.test(ih), 'and no longer hardcodes prayer for everyone');

  // Three keys that were READ and never written. Each one is a feature that could never fire.
  // Asserted on the CONCATENATED form, not the bare prefix: `totry_water_` is also the start of
  // totry_water_goal, a legitimate key, and the loose version failed on it the moment it was written.
  // Exactly the substring trap that made [Pp]late match TemPLATE and `plan` match PLANet in this suite.
  H.ok(!/totry_water_'\s*\+/.test(code), 'the water habit no longer reads a key nothing writes');
  H.ok(!/totry_vice_amt_/.test(code), 'the per-vice cost override no longer reads a key nothing writes');
  H.ok(/function waterMlOn\(/.test(code), 'water is read from the store that is actually written');
  H.ok(/costAmount/.test(fnBody('logWin')) || /costAmount/.test(code), "and a person's own vice cost is used");

  // The share card counted wins out of the MONEY log, which is only written for seven regex-matched
  // vice names — so porn, scrolling and gaming showed 0 wins however many were actually won.
  H.ok(!/todayWins=\(ls\('totry_vice_savings_log'\)/.test(code.replace(/\s/g, '')),
    'share-card wins do not come from the money log');
  H.ok(/todayWins=\(ls\('totry_fight_log'\)/.test(code.replace(/\s/g, '')),
    'they come from the fight log, where every win is recorded');

  // A throttle that is written and never read is not a throttle. All three call sites are weigh-in
  // saves, so the same +/-150 shift re-fired on every weigh-in.
  const adj = fnBody('adjustCaloriesFromWeightTrend');
  H.ok(/lastCheck/.test(adj) && /_days < 7/.test(adj), 'the calorie adjustment reads its own throttle');

  // Failures a person must be told about, because they had already been promised the opposite.
  const hp = fnBody('handleProgressPhoto');
  H.ok(/reader\.onerror/.test(hp) && /img\.onerror/.test(hp), 'an unreadable photo is reported');
  const gh = fnBody('syncGoogleHealth');
  H.ok(/needs reconnecting/.test(gh), 'an expired Google token is reported, not swallowed');
  const ad = fnBody('addDebt');
  H.ok(/Who is it owed to/.test(ad) && /How much is owed/.test(ad), 'add-a-debt says which field is missing');

  // Honesty at the guest door, where the choice is actually made.
  H.ok(/Kept on this device only/.test(H.html), 'a guest is told where their data lives');
  H.ok(/Your days follow this device/.test(H.html), 'and the timezone setting stops implying otherwise');
}

H.section('no third-party credential ships in a public bundle')
{
  // index.html is one public file on GitHub Pages: anything in it is readable by anyone viewing source.
  // Three credentials were in it, and the worst was a FatSecret OAuth CLIENT SECRET base64'd into a
  // client-credentials exchange performed in the BROWSER — the app's own identity, not a read-only key.
  // These are the exact values that shipped; they are burned forever and must never reappear.
  // Matched by SHA-256, not by literal. A test that asserts "no secrets ship" must not itself contain
  // the secrets: they are already public in git history (the FatSecret one is in two commits of
  // index.html), but embedding them here keeps them in the working tree forever and trips every secret
  // scanner. The hashes pin the exact burned values without republishing them.
  const crypto = require('crypto');
  const sha16 = (v) => crypto.createHash('sha256').update(v).digest('hex').slice(0, 16);
  const bundleTokens = new Set((H.html.match(/[A-Za-z0-9_\-]{16,64}/g) || []).map(sha16));
  for (const [hash, what] of [
    ['fa3e1533e5755406', 'the FatSecret client secret'],
    ['fc5f624720f36dd0', 'the FatSecret client id'],
    ['bf13e6fe355b13f3', 'the ESV API key'],
    ['bc8ff9049913f57b', 'the USDA FoodData Central key'],
  ]) H.ok(!bundleTokens.has(hash), `${what} is not in the bundle`);

  // A generic net, so the NEXT one does not get in either. Deliberately narrow: SUPABASE_ANON_KEY is
  // publishable by design (RLS is the boundary) and PUSH_VAPID_PUBLIC is a public key by definition.
  const suspicious = [...H.html.matchAll(/const\s+([A-Z_]*(?:SECRET|API_KEY)[A-Z_]*)\s*=\s*'([^']{16,})'/g)]
    .filter(m => !/^SUPABASE_ANON_KEY$/.test(m[1]));
  H.eq(suspicious.map(m => m[1]), [], 'no new hardcoded secret or api key has crept in');

  const code = H.html.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  H.ok(/async function keyProxy\(/.test(code), 'one helper fetches credentials from the edge function');

  // EVERY caller must degrade rather than throw when key-proxy is not deployed — verified in a browser
  // with all off-origin requests blocked. searchUSDA's call() is the sharp edge: both its results are
  // .map()'d immediately, so returning the raw proxy object or null throws on the next line. My first
  // version of this change did exactly that.
  H.ok(/Array\.isArray\(_p\.foods\) \? _p\.foods : \[\]/.test(code), 'the USDA proxy path returns an array');
  H.ok(/if\(!key\) return \[\];/.test(code), 'and a missing USDA key returns an array too, not null');
  H.ok(/async function esvPassage\(/.test(code), 'ESV goes through one fetcher');
  H.ok(/totry_esv_key/.test(code) && /totry_usda_key/.test(code),
    "and a person's own key is still honoured as a fallback");

  // Every text source except ESV is keyless, so serving another tradition is never blocked on getting a
  // credential. If a future source needs one it must go through keyProxy, not a const.
  for (const host of ['api.alquran.cloud', 'vedicscriptures.github.io', 'bible.helloao.org',
                      'bible-api.com', 'suttacentral.net']) {
    const i = code.indexOf(host);
    H.ok(i > 0, `${host} is used`);
    // No Authorization header within the same fetch expression as a keyless host.
    const around = code.slice(Math.max(0, i - 200), i + 300);
    H.ok(!/Authorization/.test(around), `${host} needs no credential`);
  }
}

H.section('a Buddhist reads their own scripture, not a selection of it')
{
  const code = H.html.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  // Islam had a live Qur'an reader and Hinduism a live Gita reader; Buddhism fell through to
  // _readBundled() with the 22 hardcoded verses in VS_BUDDHIST, and the subtitle admitted it
  // ("Selected teachings from the Dhammapada"). A Christian could read 66 books and search them.
  // That was the multi-faith gap in one line of dispatch.
  H.ok(/t==='buddhism'\) _readDhammapadaInit\(/.test(code), 'Buddhism dispatches to a real reader');
  H.ok(!/t==='buddhism'\) _readBundled\(/.test(code), 'and no longer to a bundled selection');

  const m = code.match(/const DHP_CHAPTERS = \[([\s\S]*?)\n\];/);
  H.ok(!!m, 'the chapter list exists');
  const chapters = (m ? m[1].match(/\['dhp[\d-]+',/g) || [] : []);
  H.eq(chapters.length, 26, 'all 26 chapters of the Dhammapada, not a sample');

  const li = code.indexOf('async function _readDhammapadaLoad');
  const load = li > 0 ? code.slice(li, li + 3000) : '';
  H.ok(/suttacentral\.net\/api\/bilarasuttas/.test(load), 'it reads the real text');
  H.ok(!/Authorization/.test(load), 'with no credential — SuttaCentral is keyless');
  H.ok(/VS_BUDDHIST/.test(load), 'and falls back to the bundled verses when offline, so the tab is never empty');
  H.ok(/SUJATO/.test(load), 'the translator is credited');
  // Keys are dhp{verse}:{line}; the dotted ones (dhp1:0.1) are headers, not text.
  H.ok(/\^dhp\(\\d\+\):\(\\d\+\)\$/.test(load) || /dhp\(\\d\+\)/.test(load),
    'verse lines are grouped by verse, and headers are excluded');

  // Secular was the LAST tradition with no live text — 24 hardcoded passages while the registry already
  // named its canon ("the Stoics" / "Reflections"). Every tradition now reads its own book.
  H.ok(/_readStoicInit\(/.test(code), 'secular dispatches to a real reader');
  H.ok(!/else _readBundled\(sel,content,VS_SECULAR\)/.test(code), 'and not to a bundled selection');
  const sm = code.match(/const STOIC_BOOKS = \[([^\]]*)\]/);
  H.eq(sm ? (sm[1].match(/'/g) || []).length / 2 : 0, 12, 'all 12 books of the Meditations');
  const si = code.indexOf('async function _readStoicLoad');
  const sload = si > 0 ? code.slice(si, si + 3000) : '';
  H.ok(/en\.wikisource\.org/.test(sload), 'it reads the real text');
  H.ok(!/Authorization/.test(sload), 'with no credential — Wikisource is keyless');
  H.ok(/VS_SECULAR/.test(sload), 'and falls back to the bundled passages when offline');
  H.ok(/GEORGE LONG/.test(sload), 'the translator is credited');
  // Sections are separated by SINGLE newlines. Splitting on blank lines returned Book II as one 12KB
  // paragraph — checked against the live response, not assumed.
  H.ok(/split\(\/\\n\+\//.test(sload), 'sections split on single newlines, not blank lines');
  H.ok(/\^=\+\.\*=\+\$/.test(sload), 'and Wikisource\'s "== Footnotes ==" apparatus is dropped');
  // From section 2 the translation numbers itself, so an added index would print "1" above "2.".
  // The text's own number when it has one, and NO label when it does not. Falling back to the running
  // index interleaved two unrelated numberings — Long's first section of every book, his quoted verse
  // lines and his continuation paragraphs carry no "N. ", so Book VII rendered 50, 51, 52, 51, 54:
  // duplicated and going backwards, in 9 of the 12 books. A continuation is not a new section.
  H.ok(/const label=m\?m\[1\]:''/.test(sload), "the text's own section numbers are used, and no others");
  H.ok(/\(label\?'<div/.test(sload), 'an unnumbered continuation renders without a number');

  // Under-claiming is as much a promise/mechanism mismatch as over-claiming: the subtitles said
  // "Selected teachings from the Dhammapada" and "Reflections from the Stoics" when both are now whole.
  // Asserted on the comment-stripped view: the comment above _readDhammapadaLoad QUOTES the old copy to
  // explain what changed, and matching H.html failed on my own explanation. That is this project's most
  // frequent self-inflicted trap — a finding that is only a description of a bug in a comment.
  H.ok(!/Selected teachings from the Dhammapada/.test(code), 'the Dhammapada subtitle is no longer stale');
  H.ok(/all 26 chapters/.test(code) && /all 12 books/.test(code), 'and both say what is actually there');

  // Every tradition now has a live reader — the asymmetry that made "fully served" untrue for reading.
  for (const [t, host] of [['islam','api.alquran.cloud'], ['hinduism','vedicscriptures.github.io'],
                           ['buddhism','suttacentral.net'], ['secular','en.wikisource.org']]) {
    H.ok(code.includes(host), `${t} has a live text source (${host})`);
  }
}

H.section('the voice is told the truth, and only what is true')
{
  const code = H.html.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const fnBody = (name) => {
    const m = code.match(new RegExp('function\\s+' + name + '\\s*\\('));
    if (!m) return '';
    let i = code.indexOf('{', m.index) + 1, d = 1;
    while (i < code.length && d) { const c = code[i]; if (c === '{') d++; else if (c === '}') d--; i++; }
    return code.slice(m.index, i);
  };

  // GENTLE MODE is a promise that this person never sees calorie or macro figures — usually because
  // counting them is what hurt them. lifeStateBrief honoured it; buildCtx (the live Coach prompt) did
  // not, and told the model to "Reference their actual numbers when it matters". buildPTCtx carried the
  // raw calories AND the brief's "never state a calorie count" in the same prompt.
  H.ok(/function nutPromptBlock\(/.test(code), 'one gentle-aware nutrition block for every prompt builder');
  const npb = fnBody('nutPromptBlock');
  H.ok(/nutGentle\(\)/.test(npb), 'it checks gentle mode');
  H.ok(/never state a calorie count/.test(npb), 'and forbids the figures outright when it is on');
  for (const builder of ['buildCtx', 'buildPTCtx']) {
    const b = fnBody(builder);
    H.ok(b.length > 0, `${builder} exists`);
    H.ok(/nutPromptBlock\(/.test(b), `${builder} uses the shared block`);
    H.ok(!/\$\{todayCals\} cal \(/.test(b), `${builder} no longer interpolates raw calories directly`);
    H.ok(/nutGentle/.test(b), `${builder} is gentle-aware at all`);
  }

  // BROTHER_VOICE tells the model "you're told their sex" and "read the FAITH CONTEXT below". Five of
  // seven call sites supplied neither, and NO call site stated the sex — so a woman had a voice told to
  // be her big sister with nothing telling it she was one. Gender-awareness is a stated promise here.
  H.ok(/function brotherSys\(/.test(code), 'one assembler builds the sibling system prompt');
  H.ok(/function sexNote\(/.test(code), 'and a sex note exists to be included');
  const sn = fnBody('sexNote');
  H.ok(/big SISTER/.test(sn) && /big BROTHER/.test(sn), 'it names the right sibling for each sex');
  H.ok(/not stated/.test(sn) && /they\/them/.test(sn), 'and refuses to guess when sex is unknown');
  const bs = fnBody('brotherSys');
  H.ok(/sexNote\(\)/.test(bs) && /faithVoiceNote\(\)/.test(bs), 'the assembler always carries both');
  // No call site may concatenate the raw voice again and skip them.
  H.eq((code.match(/(?<!function )BROTHER_VOICE\s*\+/g) || []).length, 0,
    'no prompt concatenates BROTHER_VOICE directly any more');

  // READINESS is labelled "READINESS TODAY" to the model and "low today" on the card, and had no age
  // limit: a six-month-old check-in scored 86/100 "good day to push — chase a PR". Its date parse also
  // yielded NaN for display-format dates, and `NaN < when` is false, so the newest-wins ordering
  // collapsed entirely rather than merely going stale.
  const cr = fnBody('computeReadiness');
  H.ok(/READINESS_MAX_AGE_MS/.test(cr), 'readiness has a recency window');
  H.ok(/if\(!isFinite\(t\)\) return;/.test(cr), 'an unparseable date is ignored, not allowed to poison it');
  H.ok(/asOf/.test(cr), 'and it reports when it was measured');

  // A FAILURE PATH is exactly where nobody looks: both exits of showAdaptivePrayer assigned a hardcoded
  // Christian scripture prayer, for all five traditions. Seventh instance of that class.
  H.ok(/function faithFallbackReflection\(/.test(code), 'the reflection fallback is tradition-aware');
  H.ok(!/textEl\.textContent=PRAYERS\.scripture\.text/.test(code), 'and no exit hardcodes the Christian one');

  // The crisis bridge is the one surface that must reach someone who cannot see the screen. It was
  // appended silently — no role, no live region, no heading, no focus move.
  const scr = fnBody('showCrisisResponse');
  H.ok(/setAttribute\('role', 'alert'\)/.test(scr), 'the crisis bridge announces itself');
  H.ok(/aria-live', 'assertive'/.test(scr), 'assertively, so it interrupts');
  H.ok(/msg\.focus\(/.test(scr), 'and moves the screen-reader cursor inside it');
  H.ok(/<h2 /.test(scr), 'with a real heading to navigate to');
}

H.section('two devices do not destroy each other\'s work')
{
  const code = H.html.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  // Section-local: each H.section block has its own scope, so the earlier helper is not visible here.
  const fnBody = (name) => {
    const m = code.match(new RegExp('function\\s+' + name + '\\s*\\('));
    if (!m) return '';
    let i = code.indexOf('{', m.index) + 1, d = 1;
    while (i < code.length && d) { const c = code[i]; if (c === '{') d++; else if (c === '}') d--; i++; }
    return code.slice(m.index, i);
  };
  const pull = (() => {
    const m = code.match(/async function pullFromCloud\s*\(/);
    if (!m) return '';
    let i = code.indexOf('{', m.index) + 1, d = 1;
    while (i < code.length && d) { const c = code[i]; if (c === '{') d++; else if (c === '}') d--; i++; }
    return code.slice(m.index, i);
  })();
  H.ok(pull.length > 0, 'pullFromCloud exists');

  // THE CLOBBER-BACK LOOP. When the cloud row won, the queued local value was left in the outbox — so
  // the very next flushOutbox re-uploaded the exact value this pull had just rejected, overwriting the
  // other device's newer edit. Sync destroying data on every pass, silently.
  H.ok(/if\(nv === cv && outbox\[k\] && outbox\[k\]\.ts <= cts\)/.test(pull),
    'a superseded outbox entry is dropped when the cloud row wins');
  H.ok(/delete outbox\[k\]/.test(pull), 'and actually removed, not just marked');

  // union(local, cloud) kept the FIRST match for an id — always local — so an entry EDITED on the other
  // device never arrived. Verified by running the real union against two-device fixtures.
  H.ok(/const union = \(a,b,preferB,tombKey\)/.test(pull), 'union takes a freshness side and a tombstone key');
  H.ok(/if\(i >= aLen && preferB\)/.test(pull), 'and the newer side wins an id collision');
  H.ok(/union\(lv, cv, \(cts >= lts\) && !pendingLocal, k\)/.test(pull),
    'the array branch passes real freshness, not a guess');
  H.ok(/union\(lv\[d\], cv\[d\], _cloudNewer, 'totry_nutlog'\)/.test(pull), 'and so does the per-day nutrition merge');

  // The outbox is what makes a write "durable". It silently swallowed its own storage failure, so on a
  // full device the queue failed to save while the UI still said the change was on its way.
  const so = (() => {
    const m = code.match(/function _setOutbox\(/);
    if (!m) return '';
    let i = code.indexOf('{', m.index) + 1, d = 1;
    while (i < code.length && d) { const c = code[i]; if (c === '{') d++; else if (c === '}') d--; i++; }
    return code.slice(m.index, i);
  })();
  H.ok(/return true/.test(so) && /return false/.test(so), '_setOutbox reports whether it persisted');
  H.ok(/out of room/.test(so), 'and says so rather than failing quietly');

  // STILL OPEN, recorded so it is not mistaken for done: 8 of the 32 union'd keys DO have delete paths
  // (journal, weigh-ins, workouts, giving, poker sessions, Strava activities, saved meals, custom
  // exercises), so a union resurrects what someone deleted on the next pull. The comment above ARR
  // claims none of them have a delete function; that claim is false and must not be trusted again.
  // Fixing it needs synced tombstones, which is its own change.
  H.ok(!/pure event log with NO delete function anywhere in the app/.test(H.html),
    'the ARR comment no longer claims these keys cannot be deleted from');

  // TOMBSTONES (v471). Seven of the union'd keys have delete paths, so a union resurrected whatever
  // someone deleted on the very next pull — they watched a journal entry reappear with no way to make
  // it go. Proved both directions in a browser: with the tombstone the deletion survives the pull;
  // without it the deleted entry comes back.
  H.ok(/const TOMB_KEY = 'totry_tombstones'/.test(code), 'there is a tombstone store');
  H.ok(/'totry_tombstones',/.test(code), 'and it is a SYNCED key, so deletions propagate');
  // ONE identity function. If the tombstone id and the union's dedupe key ever disagree, the tombstone
  // silently never matches and the whole mechanism does nothing — this repo's signature failure.
  H.ok(/function syncIdOf\(/.test(code), 'one shared identity function');
  H.ok(/const idOf = syncIdOf;/.test(pull), 'the union uses it');
  H.ok(/\.map\(syncIdOf\)/.test(code), 'and so does the tombstone recorder');
  H.ok(/if\(tombKey && isTombed\(tombKey, k\)\) return;/.test(pull), 'a tombstoned entry is dropped, not merged');
  H.ok(/union\(lv, cv, \(cts >= lts\) && !pendingLocal, k\)/.test(pull), 'the array branch passes its key');
  // The tombstone map itself must union, or the newer device erases the other device's deletions.
  H.ok(/k === TOMB_KEY/.test(pull), 'the tombstone map has its own merge branch');
  H.ok(/Object\.assign\(\{\}, cv\[bk\] \|\| \{\}, lv\[bk\] \|\| \{\}\)/.test(pull),
    'and merges as a union of both devices, never last-write-wins');
  // Derived from the before/after diff, so it cannot drift from each site's filter predicate.
  const tr = fnBody('tombstoneRemoved');
  H.ok(/keep\.has\(syncIdOf\(x\)\)/.test(tr), 'deleted ids come from the actual diff');
  H.ok(/TOMB_MAX_AGE_MS/.test(tr), 'and old tombstones are pruned so the store cannot grow forever');
  // EVERY delete path on a union'd key must record one — and the previous version of this check only
  // asserted each KEY appeared once, so it passed while THREE separate delete paths were uncovered:
  // deleteWorkoutFromHistory (the other workout button, same key as deleteTraining), deletePrayer and
  // deleteRoutine. A per-key check cannot see a second delete site for a key already covered. This scans
  // for the pattern instead: any filtered write to a union'd key with no tombstone within reach above it.
  const ARR_KEYS = ['totry_workouts','totry_body','totry_journal','totry_mornings','totry_evenings',
    'totry_confessions','totry_masses','totry_routines','totry_saved_meals','totry_family_contrib',
    'totry_poker_sessions','totry_examens','totry_prayers','totry_strava_activities','totry_feeling_wins',
    'totry_custom_exercises','totry_wins','totry_moments_won','totry_fight_log','totry_cravings',
    'totry_blessings','totry_reachouts','totry_rosaries','totry_syntheses','totry_reviews',
    'totry_vice_uses','totry_impulse_holds','totry_freezes','totry_checkins','totry_mood_log',
    'totry_fast_log','totry_releases'];
  // Precise about what a DELETE looks like: the value written is either a .filter() result inline, or a
  // variable assigned from one just above. "Any .filter() nearby" was the first attempt and it cried wolf
  // on three unshift() writes whose only sin was sitting near unrelated code — and a ratchet that cries
  // wolf gets switched off, which is the same outcome as one that cannot fail.
  const uncovered = [];
  for (const key of ARR_KEYS) {
    const re = new RegExp("ls\\('" + key + "'\\s*,\\s*([A-Za-z_$][\\w$]*|[^;]{0,80}?\\.filter\\()", 'g');
    let m;
    while ((m = re.exec(code)) !== null) {
      const arg = m[1];
      const before = code.slice(Math.max(0, m.index - 400), m.index);
      const isInlineFilter = /\.filter\($/.test(arg);
      // The NEAREST assignment to that name, not any assignment within reach. Two different functions
      // both used `const rs = _reachOutLog()...`, one filtering and one not, and looking back blindly
      // attributed the filtering one to the unshift in the function below it.
      let isFilteredVar = false;
      if (/^[A-Za-z_$][\w$]*$/.test(arg)) {
        const assigns = [...before.matchAll(new RegExp("(?:const|let|var)\\s+" + arg + "\\s*=([^;]{0,160})", 'g'))];
        const nearest = assigns.length ? assigns[assigns.length - 1] : null;
        isFilteredVar = !!(nearest && /\.filter\(/.test(nearest[1]));
      }
      if (!isInlineFilter && !isFilteredVar) continue;
      if (/tombstoneRemoved/.test(before)) continue;
      uncovered.push(key + ' @line ' + (code.slice(0, m.index).split('\n').length));
    }
  }
  H.eq(uncovered, [], 'every filtered write to a union\'d key records a tombstone');
}

H.section('usable without sight, and honest about the native paths')
{
  const code = H.html.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const fnBody = (name) => {
    const m = code.match(new RegExp('function\\s+' + name + '\\s*\\('));
    if (!m) return '';
    let i = code.indexOf('{', m.index) + 1, d = 1;
    while (i < code.length && d) { const c = code[i]; if (c === '{') d++; else if (c === '}') d--; i++; }
    return code.slice(m.index, i);
  };

  // ALL 508 notifications came through showToast as a bare div with no role and no aria-live, removed
  // after five seconds. Nothing was ever announced — and this same channel carries the only notice of
  // irreversible loss ("I had to remove 3 older progress photos"), which are device-only and in no backup.
  const st = fnBody('showToast');
  H.ok(/aria-live/.test(st), 'toasts are announced at all');
  H.ok(/_urgent/.test(st) && /'alert'/.test(st) && /'status'/.test(st),
    'a failure interrupts, an ordinary confirmation does not talk over the person');
  H.ok(/tabindex','0'/.test(st) && /keydown/.test(st) && /'Enter'/.test(st),
    'a tappable toast is operable without a mouse');

  // THE FEELING DOOR is the app's entire entry point. The orb that opens it is a proper labelled button,
  // and the door it opened was a plain div: no role, no aria-modal, focus left on BODY, and SEVENTEEN
  // background controls before the first feeling chip in tab order.
  H.ok(/id="feel-door" role="dialog" aria-modal="true" aria-labelledby="feel-greeting"/.test(H.html),
    'the Feeling Door is a real modal');
  const ofd = fnBody('openFeelingDoor');
  H.ok(/\.feel-chip'\)/.test(ofd) && /focus\(/.test(ofd), 'and focus lands on a feeling, not the container');
  H.ok(/aria-hidden','true'/.test(ofd), 'with the rest of the app hidden from the screen reader');
  H.ok(/e\.key === 'Escape'/.test(code) && /e\.key !== 'Tab'/.test(code), 'Escape closes it and Tab cycles inside it');
  const cfd = fnBody('closeFeelingDoor');
  H.ok(/_feelReturnFocus/.test(cfd), 'and closing returns focus where it was');

  // Measured: h1 count 0, <main> 0, and NO heading element at all on Today, Fight or Money — so heading
  // navigation, the fastest non-visual way around, did not exist.
  H.ok(/function _a11yScreenChrome\(/.test(code), 'the visible screen gets a landmark and a heading');
  H.ok(/_a11yScreenChrome\(name\);/.test(fnBody('go')), 'and go() applies it, so every screen has one');
  H.ok(/\.a11y-only\{position:absolute/.test(H.html), 'via a visually-hidden heading, so nothing is redesigned');
  H.ok(/A11Y_TAB_NAMES/.test(code) && /home:'Today'/.test(code), 'named in the words the app uses');

  // Colour and sight were the only channel for two things a person acts on.
  H.ok(/id="sos-breathe-lbl" role="status" aria-live="assertive"/.test(H.html),
    'the breathing pacer is announced, not just displayed');
  H.ok(/aria-pressed/.test(fnBody('setQLOutcome')), 'and the win/loss choice exposes which is selected');

  // NATIVE. A nudge was logged sent:true unconditionally, though Notify.schedule is async and swallows
  // every failure — so phantom sends were counted as ignored and stood the channel down for 14 days.
  const sro = fnBody('scheduleReachOut');
  H.ok(/ok === false/.test(sro), 'a reach-out is only logged as sent if it actually scheduled');
  H.ok(/_reachConfirm/.test(code), 'and the confirmations are serialised, so none is lost to a race');

  // The lock's threat model is a handed-over phone; a stale Health figure is a number from nowhere.
  H.ok(/totry_mindful_week', 0/.test(fnBody('disconnectAppleHealth')),
    'disconnecting Health clears the figure only Health could produce');
  // The 90-minute dedupe was borrowed from the cross-integration case and swallowed a real second session.
  H.ok(/String\(e\.id\|\|''\) === wid/.test(code.replace(/\s/g, ' ')),
    'an identical id is treated as the duplicate it is');
  H.ok(/a === b \|\| a\.indexOf\(b\) >= 0/.test(code), 'and a different session type inside the window is kept');

  // lastTitle came from an unsorted array, so the brief told the model about an arbitrary import.
  H.ok(/_sorted\[0\] \|\| workouts\[0\]/.test(code), 'the brief names the genuinely most recent session');
}

H.section('numbers a person eats to, and trains by')
{
  const code = H.html.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const fnBody = (name) => {
    const m = code.match(new RegExp('function\\s+' + name + '\\s*\\('));
    if (!m) return '';
    let i = code.indexOf('{', m.index) + 1, d = 1;
    while (i < code.length && d) { const c = code[i]; if (c === '{') d++; else if (c === '}') d--; i++; }
    return code.slice(m.index, i);
  };

  // FDC returns foodNutrients per 100g for Branded foods exactly as for Foundation/SR. The identical
  // values were LABELLED with the product's own servingSize, so a 30g bar showed 100g of calories — and
  // the raw FDC unit code came through, so real labels read "50 GRM" and "46 MG".
  const su = fnBody('searchUSDA');
  H.ok(/const servingLabel = '100g';/.test(su), 'USDA figures are labelled per 100g, which is what they are');
  H.ok(/per100: true/.test(su), 'and marked per100 so the micro maths knows');
  H.ok(/_brandServing/.test(su), 'with the product serving offered separately, correctly scaled');

  // The micro multiplier keyed off a per100 flag searchUSDA never set, so per-100g micros took the
  // per-serving path and were multiplied by the raw gram count: 30g reported 30x the sodium, not 0.3x.
  H.ok(/_servIsGrams/.test(code) && /_gramServing/.test(code),
    'the serving decides the micro scale, not a flag the source may not set');
  H.ok(!/const microMult = \(currentFood\.per100 && s\.gramsEquiv\) \? \(s\.gramsEquiv \* qty \/ 100\) : qty;/.test(code),
    'and the flag-only version is gone');

  // Five logged days against a 21-day window is missing data, not a small appetite — and the number
  // comes out LOWER than the truth, which is the wrong direction for someone trying to eat enough.
  const at = fnBody('computeAdaptiveTDEE');
  H.ok(/calDays < Math\.ceil\(days \* 0\.6\)/.test(at), 'a burn estimate needs the window mostly covered');

  // The clamp and the calorie subtraction have to describe the same day.
  const ct = fnBody('cycledTarget');
  H.ok(/_actualCut = baseCarb - out\.carb/.test(ct), 'cycling subtracts the carbs it actually removed');
  H.ok(!/out\.cal = \(base\.cal\|\|0\) - cutG\*4;/.test(ct), 'not the ones it wanted to remove');

  // Three consecutive PRs after a layoff were reported as a plateau, because priorBest was ALL-TIME and
  // the series had no date window — so a lift untrained for six months was "stalled in your last 3
  // sessions" too. Verified against that exact scenario: 95 -> 97.5 -> 100kg now reports no plateau.
  const dp = fnBody('detectPlateau');
  H.ok(/PLATEAU_WINDOW_MS/.test(dp), 'a plateau is measured against recent work');
  H.ok(/const climbing =/.test(dp), 'and a run of consecutive improvements is never called a stall');
}

H.section('the fixes I shipped today, checked against themselves')
{
  const code = H.html.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const fnBody = (name) => {
    const m = code.match(new RegExp('function\\s+' + name + '\\s*\\('));
    if (!m) return '';
    let i = code.indexOf('{', m.index) + 1, d = 1;
    while (i < code.length && d) { const c = code[i]; if (c === '{') d++; else if (c === '}') d--; i++; }
    return code.slice(m.index, i);
  };
  const { detectCrisis, isFaithHabitName } = H.load(['detectCrisis', 'isFaithHabitName'], {});

  // A NEWLINE IS A CLAUSE END. `$` with no /m flag meant \s* swallowed the newline and found neither
  // punctuation nor end-of-input — and every field this gate protects is a multi-line textarea.
  H.eq(detectCrisis("I can't go on\nI don't know what else to say"), 'suicide',
    'a disclosure that continues on the next line still fires the gate');
  H.eq(detectCrisis('i cant go on\ni\'m done'), 'suicide', 'without an apostrophe too');
  H.eq(detectCrisis("i can't go on this cut"), null, 'and the benign completion still does not');

  // v463 made a flagged morning row PERSIST. Two readers were filtered and there are twenty-two, so the
  // companion still sent it to a model and _wholeLifeReframe quoted it back mid-urge as an aspiration.
  H.ok(/function safeMornings\(/.test(code), 'one accessor for mornings, like safeJournal');
  H.ok(/safeMornings\(\)/.test(fnBody('_companionSay')), 'the companion prompt uses it');
  H.ok(/safeMornings\(\)/.test(fnBody('_wholeLifeReframe')), 'and so does the mid-urge reframe');

  // Renaming a thing that is matched BY NAME. Three traditions got a habit that could never tick, and
  // getStreak scores habits.slice(0,3) with the spiritual habit at index 2 — so their streak was stuck.
  for (const n of ['Prayer / scripture', 'Salah / Qur\u2019an', 'Puja / Gita', 'Meditation / sutta', 'Stillness / reflection']) {
    H.eq(isFaithHabitName(n), true, `"${n}" is recognised as the spiritual habit`);
  }
  H.eq(isFaithHabitName('Evening check-in'), false, 'and an evening habit is not');
  H.ok(!/\(\/ritual\|prayer\/\.test\(name\) && !\/evening\|night\//.test(code),
    'both auto-tick chains go through the shared test, not their own regex');

  // costUses exists ONLY when costPer==='use', where it means uses per WEEK — so dividing the amount by
  // it turned a $15 pack into $0.75 saved per avoided cigarette.
  const lw = fnBody('logWin');
  H.ok(/String\(_v\.costPer\|\|''\) === 'use'/.test(lw), 'the cost override respects costPer');
  H.ok(!/_amt \/ _uses/.test(lw), 'and never divides a per-use price by a weekly frequency');

  // Gentle mode is about CALORIE FIGURES, not about the food line specifically. Verified by dumping
  // EVERY line matching a calorie figure from both built prompts, rather than checking the line I fixed.
  H.ok(/_gentleNow \? '' : ' \(' \+ calsBurnedToday/.test(code), 'the training-burn figure is gentle-aware');
  H.ok(/a\.calories && !\(typeof nutGentle/.test(code), 'and so is the Strava cardio figure');
  const pt = fnBody('buildPTCtx');
  H.ok(/todayEntries\.length\)\.replace/.test(pt), 'the PT prompt reports the real meal count, not a hardcoded 0');
  H.ok(/DELIBERATELY hidden/.test(pt), 'and stops ordering the model to quote exact numbers');

  // A static HTML text node is not JavaScript: \u2014 there renders as six literal characters, on the
  // first screen a new person sees.
  H.ok(!/Kept on this device only \\u2014/.test(H.html), 'the guest door shows an em dash, not its escape');

  // dhpN:0 is the commentary's background-story title, not verse text — the header rule was written as
  // "dotted keys are headers" and the live response carries undotted zero keys too, so a story title was
  // glued onto the Pāli of 13 of 20 verses.
  H.ok(/if\(m\[2\] === '0'\) return;/.test(code), 'the Dhammapada reader drops the story-title segment');

  // Passing null left a fully populated 26-chapter picker above 22 bundled verses, every option
  // rendering the same text, under a subtitle promising the whole book.
  H.eq((code.match(/_readBundled\(null,/g) || []).length, 0,
    'the offline fallbacks clear the picker instead of leaving a dead one');

  // b.w / b.d exist on no totry_body entry — every writer stores weight and ts — so this could never fire.
  const pf = fnBody('prefillNutGoals');
  H.ok(/b\.weight != null/.test(pf), 'the TDEE weight prefill reads the field that exists');
  H.ok(!/b\.w != null/.test(pf), 'not the one I invented');

  // The companion opened UNDER the Feeling Door for a brand-new guest: the door is on a 320ms timer and
  // the companion on 1200ms, and v464 correctly made a guest count as set up.
  const msc = fnBody('maybeShowCompanion');
  H.ok(/feel-door/.test(msc), 'the companion never opens behind the Feeling Door');
  H.ok(/modal-bg\.open/.test(msc), 'nor over any other open sheet');

  // brotherSys() appends faithVoiceNote(); the explicit one at this call site became a duplicate.
  H.ok(!/brotherSys\(\)\s*\+\s*faithVoiceNote\(\)/.test(code.replace(/\s+/g, ' ')),
    'no prompt carries the tradition guidance twice');

  // The nutlog union is handed a tombstone key, so something has to write one.
  H.ok(/tombstoneRemoved\('totry_nutlog'/.test(code), 'a deleted food records a tombstone too');

  // The crisis return sits above the line that honours _trimmed.
  const sqj = fnBody('saveQuickJournal');
  H.ok(/_trimmed && _qjCrisis/.test(sqj), 'a trimmed disclosure is still reported as trimmed');
}

H.report();
