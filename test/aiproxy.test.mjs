// Run the ai-proxy edge function locally, with Deno and fetch stubbed.
//
// This function is the AI layer for the whole app and had no test of any kind. Two of its defects had
// already shipped and gone unnoticed for an unknown length of time: every OpenRouter model id had been
// retired by the vendor (so vision and web search had NO fallback), and identity was taken from a
// client-supplied field, so the public anon key was enough to spend another person's daily quota.
//
//   node --experimental-strip-types test/aiproxy.test.mjs
let handler = null;
const ENV = {};
globalThis.Deno = { serve: (h) => { handler = h; }, env: { get: (k) => ENV[k], toObject: () => ({ ...ENV }) } };

// Each stubbed provider records its calls and can be told to fail, so the fallback chain is observable.
let calls = [], behaviour = {};
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  const who = u.includes('generativelanguage') ? 'gemini'
            : u.includes('groq') ? 'groq'
            : u.includes('openrouter') ? 'openrouter'
            : u.includes('anthropic') ? 'anthropic'
            : u.includes('/rpc/') ? 'quota' : 'other';
  const model = (() => {
    try { const b = JSON.parse(opts.body); return b.model || (u.match(/models\/([^:]+):/) || [])[1] || null; }
    catch (_) { return (u.match(/models\/([^:]+):/) || [])[1] || null; }
  })();
  calls.push({ who, model });
  const b = behaviour[who];
  if (typeof b === 'function') return b(model);
  if (b === 'fail') return { ok: false, status: 500, json: async () => ({ error: { message: who + ' down' } }), text: async () => 'down' };
  if (who === 'quota') return { ok: true, json: async () => ({ allowed: true, used: 1, bonus_remaining: 0 }) };
  const shapes = {
    gemini:    { candidates: [{ content: { parts: [{ text: 'from ' + who }] }, finishReason: 'STOP' }] },
    groq:      { choices: [{ message: { content: 'from ' + who } }] },
    openrouter:{ choices: [{ message: { content: 'from ' + who } }] },
    anthropic: { content: [{ text: 'from ' + who }] },
  };
  return { ok: true, status: 200, json: async () => shapes[who] || {}, text: async () => '' };
};

await import('../supabase/functions/ai-proxy/index.ts');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const jwt = (payload) => 'x.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.y';
const call = async (body, headers = {}) => {
  calls = [];
  const res = await handler(new Request('http://x/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
};
const reset = (o = {}) => { for (const k of Object.keys(ENV)) delete ENV[k];
  Object.assign(ENV, { GEMINI_API_KEY: 'g', GROQ_API_KEY: 'gr', OPENROUTER_API_KEY: 'or', ANTHROPIC_API_KEY: 'an', ...o });
  behaviour = {}; };

console.log('\nai-proxy, run locally\n');

// ── identity: a signed token must beat anything the caller says about itself ────────────────────
reset({ SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: 'svc', DAILY_LIMIT_PER_USER: '200' });
let seen = null;
behaviour.quota = () => { seen = 'called'; return { ok: true, json: async () => ({ allowed: true, used: 1 }) }; };
let quotaBody = null;
const origFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (String(url).includes('/rpc/')) { quotaBody = JSON.parse(opts.body); return { ok: true, json: async () => ({ allowed: true, used: 1 }) }; }
  return origFetch(url, opts);
};
await call({ messages: [{ role: 'user', content: 'hi' }], user_id: 'VICTIM-uuid' },
           { authorization: 'Bearer ' + jwt({ sub: 'REAL-uuid', exp: Math.floor(Date.now() / 1000) + 3600 }) });
ok(quotaBody && quotaBody.p_user_id === 'REAL-uuid',
   'the JWT subject is billed, NOT the user_id in the body (was: the body won)');

quotaBody = null;
await call({ messages: [{ role: 'user', content: 'hi' }], user_id: 'FORGED-uuid' });
ok(quotaBody === null, 'with no token, a body-supplied user_id buys nothing — it is not an identity');

quotaBody = null;
await call({ messages: [{ role: 'user', content: 'hi' }] },
           { authorization: 'Bearer ' + jwt({ sub: 'STALE-uuid', exp: Math.floor(Date.now() / 1000) - 60 }) });
ok(quotaBody === null, 'an EXPIRED token is not a free pass to the unmetered bucket');
globalThis.fetch = origFetch;

// ── the fallback chain ──────────────────────────────────────────────────────────────────────────
reset();
let r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(r.body.provider === 'gemini' && r.body.text === 'from gemini', 'the free provider answers first');

reset(); behaviour.gemini = 'fail';
r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(r.body.provider === 'groq', 'gemini down falls through to groq, still free');

reset(); behaviour.gemini = 'fail'; behaviour.groq = 'fail'; behaviour.openrouter = 'fail';
r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(r.body.provider === 'anthropic', 'the paid provider is the LAST resort, not the first');
ok(r.body.attempts && r.body.attempts.length === 3, 'and every failed attempt is reported, not swallowed');

// ── a retired model must cost one entry, not the provider ───────────────────────────────────────
// This is the defect that made vision and web search fall over silently: one hardcoded id per provider.
reset();
const dead = new Set();
behaviour.groq = (model) => {
  dead.add(model);
  if (dead.size === 1) return { ok: false, status: 404, json: async () => ({ error: { message: 'model_not_found' } }), text: async () => '' };
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'from groq' } }] }) };
};
behaviour.gemini = 'fail';
r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(r.body.provider === 'groq', 'a retired model id costs ONE candidate, not the whole provider');
ok(dead.size >= 2, `and it actually tried a second model (tried ${dead.size})`);

// ── nothing configured ──────────────────────────────────────────────────────────────────────────
reset({ GEMINI_API_KEY: undefined, GROQ_API_KEY: undefined, OPENROUTER_API_KEY: undefined, ANTHROPIC_API_KEY: undefined });
for (const k of ['GEMINI_API_KEY','GROQ_API_KEY','OPENROUTER_API_KEY','ANTHROPIC_API_KEY']) delete ENV[k];
r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(r.status >= 400, 'no providers configured is an error, not a silent empty answer');

console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
