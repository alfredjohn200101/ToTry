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
let fetchCalls = [];
globalThis.fetch = async (url, opts) => {
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
const setEnv = (o) => { for (const k of Object.keys(ENV)) delete ENV[k]; Object.assign(ENV, o); fetchCalls = []; };

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

// ── 5. the other providers were not disturbed ───────────────────────────────────────────────────
setEnv({ ESV_API_KEY: 'e', USDA_API_KEY: 'u' });
r = await call({ provider: 'status' });
ok(r.body.esv === true && r.body.usda === true, 'esv and usda still resolve');
setEnv({});
r = await call({ provider: 'esv', q: 'John 1:1' });
ok(r.status === 501, 'esv with no key is "not configured"');

console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
