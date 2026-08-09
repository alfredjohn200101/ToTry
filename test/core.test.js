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

H.report();
