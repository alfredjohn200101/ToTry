// ── THE GATE WAS WRITING TO PRODUCTION ─────────────────────────────────────────────────────────
// Measured 26 Oct 2026 against the live project: `feedback` held 169 rows and EVERY ONE was this
// gate's own strings — 44 empty plus 125 matching `npm run crisis`'s cried-wolf panel verbatim
// ("better off deadlifting twice a week" x30, "i'm tired of living paycheck to paycheck" x49,
// "better off without medication" x28, "i want to kill myself" x1). `user_id` NULL on all 169.
// So the one field whose own copy promises "I read every note" contained no note from any person,
// and suicide-disclosure test strings were sitting in a production table.
//
// `app_events` was worse: `boot_offline` held 48,527 rows across 47,409 DISTINCT anon_ids — 1.02
// events each, which is panels' network-cut check opening a fresh browser context per run, not a
// population. That is 48,527 of 56,750 total events, so ~86% of the analytics was this gate, and
// the retention question ("does anybody reach day 2?") was unanswerable.
//
// THE FIX IS AT THE BROWSER, NOT THE CALL SITE. There are 20+ `newContext` calls across the three
// browser suites; patching each is the half-applied sweep this repo keeps paying for, and the next
// context somebody adds would write to production again. This wraps `newContext` ONCE per suite, so
// every context — including ones added later — inherits the block for free.
//
// It FULFILLS rather than aborts. An abort surfaces as a network error, and this app has real
// offline-fallback paths that would then be exercised instead of the online ones, which would
// silently change what several checks measure. A 200 with an empty body is what "the write
// succeeded and returned nothing" looks like to the client.

const SUPABASE_GLOB = '**://*.supabase.co/**';

// Counts what it stopped, so a suite can assert the guard actually ran. A guard that intercepts
// nothing looks identical to a guard that is not installed — this repo's own "an assertion you have
// never seen fail is not yet a test".
const stats = { intercepted: 0, byPath: new Map() };

function installNoProductionWrites(browser) {
  if (!browser || typeof browser.newContext !== 'function') {
    throw new Error('installNoProductionWrites: expected a Playwright Browser');
  }
  if (browser.__noProdWrites) return stats;       // idempotent
  const orig = browser.newContext.bind(browser);
  browser.newContext = async function (opts) {
    const ctx = await orig(opts);
    await ctx.route(SUPABASE_GLOB, (route) => {
      const u = route.request().url();
      let path = u;
      try { path = new URL(u).pathname; } catch (_) { }
      stats.intercepted++;
      stats.byPath.set(path, (stats.byPath.get(path) || 0) + 1);
      // Shape matters: the app's Supabase calls expect JSON. An array satisfies a select and a
      // PostgREST insert with no `returning`; an object body would break a `.length` read.
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    return ctx;
  };
  browser.__noProdWrites = true;
  return stats;
}

// Printed at the end of a run so the number is visible rather than assumed. If a suite that types
// into the feedback door reports 0 intercepted, the guard is not installed on the path that matters.
function reportNoProductionWrites(label) {
  const top = [...stats.byPath.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([p, n]) => p.replace(/^\/rest\/v1\//, '') + ' x' + n).join(' · ');
  console.log('\n' + (label || 'gate') + ': ' + stats.intercepted +
    ' production write(s)/read(s) intercepted and NOT sent' + (top ? ' — ' + top : ''));
  return stats.intercepted;
}

module.exports = { installNoProductionWrites, reportNoProductionWrites, stats, SUPABASE_GLOB };
