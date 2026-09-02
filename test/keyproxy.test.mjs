// Run the key-proxy edge function locally, with Deno stubbed, and check it resolves credentials the
// way the real project's environment actually does.
//
// WHY THIS EXISTS. FatSecret has been returning invalid_client for days. The cause was in this
// function, not in the credentials: it classified a secret with
//     name.includes('FATSECRET') && name.includes('SECRET')
// and the brand name FATSECRET *ends in* SECRET — so FATSECRET_CONSUMER_KEY, the id, matched the test
// for the secret. The status endpoint then reported that guess as a fact, which is why it went unseen.
// Deploying to find out is a slow way to learn a name-matching rule is wrong. Node strips the types.
//
//   node --experimental-strip-types test/keyproxy.test.mjs
//
// NOTE ON ORDER: the function caches a FatSecret token per warm instance, which is correct in
// production (env vars do not change under a running instance) and means a test cannot un-succeed.
// Re-importing does not give a fresh instance — Node dedupes it even with a cache-busting query. So
// the scenarios are ordered such that only the LAST one obtains a token.
let handler = null;
const ENV = {};
globalThis.Deno = {
  serve: (h) => { handler = h; },
  env: { get: (k) => ENV[k], toObject: () => ({ ...ENV }) },
};
let fetchCalls = [];      // OAuth token exchanges, as 'id:secret'
let searchCalls = [];     // foods.search requests, as the full URL
// Fault injection, in the shape the REAL API uses. Measured against platform.fatsecret.com on
// 2 Sep 2026: it answers HTTP 200 for every error including auth — a garbage bearer returns
// 200 {"error":{"code":13,"message":"Invalid token: Unable to decode token"}}, and it never returns
// 401 on this endpoint. The first version of this stub returned a 401, which is a shape FatSecret does
// not produce, so it was testing a branch that could never fire in production.
// A COUNT, not a boolean: a one-shot flag clears itself on the first rejection, so the retry's second
// attempt always succeeded whatever the handler did. Set it to 1 for "stale token, refresh works",
// Infinity for a token the API never accepts.
let searchBadToken = 0;
let searchApiError = null;   // a NON-auth error (e.g. code 21, the IP allowlist) — must not be retried
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  // The search endpoint is a different call in every respect — GET, Bearer, and a URL that carries the
  // query — so the stub has to tell them apart or a Bearer header gets base64-decoded as a Basic one.
  if (u.includes('platform.fatsecret.com')) {
    searchCalls.push(u);
    const bearer = ((opts && opts.headers && opts.headers.Authorization) || '').replace('Bearer ', '');
    // A runaway retry must be observable as a FAILURE, not as a hung test.
    if (searchCalls.length > 12) throw new Error('runaway retry: more than 12 search calls');
    const fsError = (code, message) => ({ ok: true, status: 200, json: async () => ({ error: { code, message } }) });
    if (searchApiError) return fsError(searchApiError.code, searchApiError.message);
    if (searchBadToken > 0) { searchBadToken--; return fsError(13, 'Invalid token: Unable to decode token'); }
    if (bearer !== 'tok-123') return fsError(13, 'Invalid token: Unable to decode token');
    return { ok: true, status: 200, json: async () => ({ foods: { food: [
      { food_id: '1', food_name: 'Chicken breast', brand_name: '',
        food_description: 'Per 100g - Calories: 165kcal | Fat: 3.60g | Carbs: 0.00g | Protein: 31.00g' },
    ] } }) };
  }
  const auth = (opts && opts.headers && opts.headers.Authorization) || '';
  const [id, secret] = Buffer.from(auth.replace('Basic ', ''), 'base64').toString().split(':');
  fetchCalls.push(id + ':' + secret);
  const good = id === 'live-key' && secret === 'live-secret';   // exactly one real pair, as FatSecret behaves
  return { status: good ? 200 : 400, json: async () => good
    ? { access_token: 'tok-123', expires_in: 3600 } : { error: 'invalid_client' } };
};

await import('../supabase/functions/key-proxy/index.ts');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const call = async (body) => {
  const res = await handler(new Request('http://x/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
};
const setEnv = (o) => { for (const k of Object.keys(ENV)) delete ENV[k]; Object.assign(ENV, o); fetchCalls = []; searchCalls = []; };

console.log('\nkey-proxy, run locally\n');

// ── 1. the real project's shape: a stale id, plus a newer lowercase pair ────────────────────────
setEnv({ FATSECRET_ID: 'stale-key', fatsecret_consumer_key: 'live-key', fatsecret_consumer_secret: 'live-secret' });
let r = await call({ provider: 'status' });
ok(!r.body.fatsecret.secrets_found.includes('fatsecret_consumer_key'),
   'the consumer KEY is no longer reported as the secret — this was the whole bug');
ok(r.body.fatsecret.secrets_found.join() === 'fatsecret_consumer_secret', 'the secret is the secret');
ok(r.body.fatsecret.ids_found.length === 2, 'BOTH ids are reported, not just the first guess');
ok(r.body.fatsecret.pair_order[0] === 'fatsecret_consumer_key + fatsecret_consumer_secret  (same family)',
   'and the same-family pair is ordered first');
ok(r.body.fatsecret.working_pair === null, 'working_pair is null until a call has actually succeeded');

// ── 2. nothing configured at all ────────────────────────────────────────────────────────────────
setEnv({});
r = await call({ provider: 'fatsecret' });
ok(r.status === 501, 'no credentials is "not configured", not a crash');
ok(fetchCalls.length === 0, 'and it does not call FatSecret with nothing');

// ── 3. a genuine failure must still surface FatSecret's own reason ──────────────────────────────
setEnv({ FATSECRET_ID: 'wrong', FATSECRET_SECRET: 'also-wrong' });
r = await call({ provider: 'fatsecret' });
ok(r.status === 502 && r.body.fatsecret_error === 'invalid_client', 'a real failure still reports invalid_client');
ok(r.body.pairs_tried.join() === 'FATSECRET_ID + FATSECRET_SECRET', 'and names exactly which pairs it tried');

// ── 4. the pair that works is second in order — it must fall through, not give up ───────────────
// This is the case the old code could not survive: it resolved ONE id and ONE secret and stopped.
setEnv({ fatsecret_consumer_key: 'stale-key', FATSECRET_ID: 'live-key', fatsecret_consumer_secret: 'live-secret' });
r = await call({ provider: 'fatsecret' });
ok(r.body.access_token === 'tok-123', 'a wrong first pair does not dead-end — it tries the next');
ok(fetchCalls.length === 2, 'it took two attempts, in the documented order');
ok(fetchCalls[0] === 'stale-key:live-secret' && fetchCalls[1] === 'live-key:live-secret',
   'same-family first, then the fallback');
r = await call({ provider: 'status' });
ok(r.body.fatsecret.working_pair === 'FATSECRET_ID + fatsecret_consumer_secret',
   'status then names the pair that actually worked, so nobody has to guess again');

// ── 4b. THE SEARCH RUNS HERE, NOT IN THE BROWSER ────────────────────────────────────────────────
// FatSecret sends no Access-Control-Allow-Origin, and the Authorization header this needs forces a
// preflight, so the browser could never make this call — it fetched a token and then failed, every
// time, on every keystroke-debounced search. These run after scenario 4 deliberately: a token is
// cached by then, which is the state a real warm instance is in.
searchCalls = [];
r = await call({ provider: 'fatsecret_search' });
ok(r.status === 400 && r.body.error === 'q required', 'a search with no query is refused, not sent');
ok(searchCalls.length === 0, 'and nothing is sent to FatSecret for it');

r = await call({ provider: 'fatsecret_search', q: 'chicken breast' });
ok(r.status === 200 && r.body.foods.food[0].food_name === 'Chicken breast', 'a real search returns foods');
ok(searchCalls.length === 1, 'exactly one request, using the token already cached');
ok(searchCalls[0].includes('search_expression=chicken%20breast'), 'the query is URL-encoded into the request');
ok(searchCalls[0].includes('max_results=8'), 'and defaults to 8 results');
ok(r.body.access_token === undefined, 'the token itself never reaches the caller — that is the point');

r = await call({ provider: 'fatsecret_search', q: 'x', max_results: 999 });
ok(searchCalls[1].includes('max_results=50'), 'an absurd max_results is clamped, not passed through');

// Fault injection: a cached token that FatSecret has stopped accepting. Without the retry this is a
// 502 on the first search of every cold hour, which would look exactly like the bug just removed.
searchBadToken = 1;
const oauthBefore = fetchCalls.length;
r = await call({ provider: 'fatsecret_search', q: 'oats' });
ok(r.status === 200, 'a stale cached token is refreshed and the search still succeeds');
// Two exchanges, not one: refreshing re-runs pair resolution, and this scenario's env deliberately
// puts a decoy pair first (stale-key + live-secret) before the live one. What matters is that it
// resolves ONCE and stops — a loop here would hammer FatSecret's OAuth endpoint on every stale token.
ok(fetchCalls.length === oauthBefore + 2, 'it re-resolved the pairs exactly once — decoy, then the live pair');
ok(searchCalls.length === 4, 'and re-sent the search exactly once after the refresh');

// ...and a token it NEVER accepts must give up rather than spin. This is the assertion the block
// above only appeared to make: with a one-shot fault the second attempt always succeeded, so `while`
// in place of `if` was indistinguishable from correct. With a persistent 401 the mutant hits the
// stub's runaway guard and this fails, which is the whole point of the retry being bounded.
searchCalls = [];
searchBadToken = Infinity;
const oauthBefore2 = fetchCalls.length;
r = await call({ provider: 'fatsecret_search', q: 'rice' });
ok(r.status === 502 && r.body.fatsecret_code === 13,
   'a token the API keeps rejecting ends in a 502 carrying FatSecret\'s own code, not a spin');
ok(searchCalls.length === 2, 'exactly two search attempts: the original and ONE retry');
ok(fetchCalls.length === oauthBefore2 + 2, 'and exactly one re-resolution behind it');
searchBadToken = 0;

// ── 4d. AN ERROR INSIDE A 200 IS STILL AN ERROR ────────────────────────────────────────────────
// This is the live failure on 2 Sep 2026: FatSecret allowlists IPs per app, Supabase edge functions
// have no stable egress IP (three consecutive calls came from 52.64.65.67, 16.176.20.17, 3.107.185.74),
// so every search returns 200 {"error":{"code":21,"message":"Invalid IP address detected"}}. Under
// `if (!r.ok)` that was a 200 SUCCESS and the error object was handed to the app as if it were food.
searchCalls = [];
const oauthBefore3 = fetchCalls.length;
searchApiError = { code: 21, message: "Invalid IP address detected:  '3.26.14.148'" };
r = await call({ provider: 'fatsecret_search', q: 'oats' });
ok(r.status === 502, 'an error delivered inside a 200 is reported as a failure, not passed through');
ok(r.body.fatsecret_code === 21 && /Invalid IP/.test(String(r.body.fatsecret_message)),
   "and carries FatSecret's own code and message, so the cause is not guesswork");
ok(r.body.foods === undefined, 'the error body is never handed back as though it were foods');
ok(searchCalls.length === 1, 'a non-auth error is terminal — it is NOT retried');
ok(fetchCalls.length === oauthBefore3, 'and costs no extra token exchange');
searchApiError = null;

// ── 5. the other providers were not disturbed ───────────────────────────────────────────────────
setEnv({ ESV_API_KEY: 'e', USDA_API_KEY: 'u' });
r = await call({ provider: 'status' });
ok(r.body.esv === true && r.body.usda === true, 'esv and usda still resolve');
setEnv({});
r = await call({ provider: 'esv', q: 'John 1:1' });
ok(r.status === 501, 'esv with no key is "not configured"');

console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
