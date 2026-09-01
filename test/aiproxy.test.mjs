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
            : u.includes('api.mistral.ai') ? 'mistral'
            : u.includes('api.cloudflare.com') ? 'cloudflare'
            : u.includes('integrate.api.nvidia.com') ? 'nvidia'
            : u.includes('/rpc/') ? 'quota' : 'other';
  const model = (() => {
    try { const b = JSON.parse(opts.body); return b.model || (u.match(/models\/([^:]+):/) || [])[1] || null; }
    catch (_) { return (u.match(/models\/([^:]+):/) || [])[1] || null; }
  })();
  // The BODY is recorded too: three of the new providers differ in the shape they need, and a wrong
  // shape returns a 4xx that reads exactly like a dead model. Asserting the shape is the only way to
  // tell those apart before a person meets it.
  let sentBody = null; try { sentBody = JSON.parse(opts.body); } catch (_) {}
  calls.push({ who, model, body: sentBody });
  const b = behaviour[who];
  if (typeof b === 'function') return b(model);
  if (b === 'fail') return { ok: false, status: 500, json: async () => ({ error: { message: who + ' down' } }), text: async () => 'down' };
  if (who === 'quota') return { ok: true, json: async () => ({ allowed: true, used: 1, bonus_remaining: 0 }) };
  const shapes = {
    gemini:    { candidates: [{ content: { parts: [{ text: 'from ' + who }] }, finishReason: 'STOP' }] },
    groq:      { choices: [{ message: { content: 'from ' + who } }] },
    openrouter:{ choices: [{ message: { content: 'from ' + who } }] },
    anthropic: { content: [{ text: 'from ' + who }] },
    mistral:   { choices: [{ message: { content: 'from ' + who } }] },
    cloudflare:{ choices: [{ message: { content: 'from ' + who } }] },
    nvidia:    { choices: [{ message: { content: 'from ' + who } }] },
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
// Precise rather than merely counted: the three that FAILED are named, and the two free providers with
// no key are reported as SKIPPED rather than silently absent. A count alone passed happily when two new
// providers were inserted into the chain, which is the assertion equivalent of not looking.
const _failed = (r.body.attempts || []).filter(a => !a.skipped).map(a => a.provider);
const _skipped = (r.body.attempts || []).filter(a => a.skipped).map(a => a.provider);
ok(['gemini','groq','openrouter'].every(p => _failed.includes(p)),
   'and every failed attempt is reported, not swallowed (' + _failed.join(',') + ')');
ok(_skipped.includes('mistral') && _skipped.includes('cloudflare'),
   'and a free provider with no key is reported as skipped, not silently missing');

// ── the new free providers come BEFORE the paid one ─────────────────────────────────────────────
// The whole point of adding them: anthropic is the only provider that costs money, and it must stay
// last however many free ones are added in front of it.
reset({ MISTRAL_API_KEY: 'm' });
behaviour.gemini = 'fail'; behaviour.groq = 'fail'; behaviour.openrouter = 'fail';
r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(r.body.provider === 'mistral', 'a configured free provider answers before the paid one');

// HALF-CONFIGURED CLOUDFLARE MUST SKIP. Its account id lives in the URL and its token in the header,
// so one without the other would walk four candidates collecting 401s at 20s each — 80 seconds of
// nothing on the way to an answer a person is waiting for.
reset({ CLOUDFLARE_API_TOKEN: 'cf' });          // no CLOUDFLARE_ACCOUNT_ID
behaviour.gemini = 'fail'; behaviour.groq = 'fail'; behaviour.openrouter = 'fail';
r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(!calls.some(c => c.who === 'cloudflare'), 'half-configured cloudflare is never called at all');
ok(r.body.provider === 'anthropic', 'and the chain still reaches an answer');

// ── a provider that answers on its THIRD id is also telling you two ids are dead ────────────────
// The winner was reported and the candidates burned getting to it were not, so a list could rot down
// to its last entry with nothing ever saying so — which is how every previous endpoint rot survived.
reset();
const _seen = [];
behaviour.groq = (model) => { _seen.push(model);
  if (_seen.length < 3) return { ok: false, status: 404, json: async () => ({ error: { message: 'model_not_found' } }), text: async () => '' };
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'from groq' } }] }) }; };
behaviour.gemini = 'fail';
r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(r.body.provider === 'groq', 'a provider still answers after losing two candidates');
ok(Array.isArray(r.body.burned) && r.body.burned.length === 2,
   'and the two dead ids are NAMED in the response (' + JSON.stringify(r.body.burned) + ')');

// ── vision can be addressed provider by provider, or it can never be checked ────────────────────
reset({ MISTRAL_API_KEY: 'm' });
r = await call({ action: 'vision', prompt: 'x', image_base64: 'AAAA', prefer: 'mistral' });
ok(r.body.provider === 'mistral-vision',
   'prefer reaches a vision provider that gemini would otherwise always answer in front of');
ok(!calls.some(c => c.who === 'gemini'), 'and it goes FIRST, not merely eventually');

// ── the food camera has five providers, and each speaks its own dialect ─────────────────────────
// Vision was gemini -> openrouter -> 503. One bad afternoon at either took the camera out.
reset({ MISTRAL_API_KEY: 'm', NVIDIA_API_KEY: 'nv' });
behaviour.gemini = 'fail'; behaviour.openrouter = 'fail';
r = await call({ action: 'vision', prompt: 'what is this', image_base64: 'AAAA', image_mime: 'image/jpeg' });
ok(r.body.provider === 'mistral-vision', 'the camera walks past two dead providers to a third');
const _mv = calls.find(c => c.who === 'mistral');
// Found by role, not by index — this call sends no system message, so the user part is messages[0]
// and an index assertion passed for the wrong reason on a shape it never actually read.
const _mvUser = (_mv?.body?.messages || []).find(m => m.role === 'user');
const _mvImg = (_mvUser?.content || []).find(p => p.type === 'image_url');
ok(typeof _mvImg?.image_url === 'string',
   "mistral's image_url is a plain STRING — the OpenAI {url:...} object is a 422 there");
ok(String(_mvImg?.image_url || '').startsWith('data:image/jpeg;base64,'),
   'and it carries the real data: URI, mime and all');

reset({ NVIDIA_API_KEY: 'nv' });
behaviour.gemini = 'fail'; behaviour.openrouter = 'fail';
r = await call({ action: 'vision', system: 'you are a coach', prompt: 'what is this',
                 image_base64: 'AAAA', image_mime: 'image/jpeg' });
ok(r.body.provider === 'nvidia-vision', 'and past three to a fourth');
const _nv = calls.find(c => c.who === 'nvidia');
ok(!(_nv?.body?.messages || []).some(m => m.role === 'system'),
   "nvidia's vision models reject role:system, so the system text is folded into the user part");
ok(String(_nv?.body?.messages?.[0]?.content?.[0]?.text || '').includes('you are a coach'),
   'and folding it does not throw the system text away');

// And when nothing is configured the camera says so, naming what it tried, rather than hanging.
reset();
behaviour.gemini = 'fail'; behaviour.openrouter = 'fail';
r = await call({ action: 'vision', prompt: 'x', image_base64: 'AAAA' });
ok(r.status === 503 && (r.body.attempts || []).length === 5,
   'with every provider down or unset the camera reports all five attempts, not silence');

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

// ── a PINNED model id must not delete the provider ───────────────────────────────────────────
// modelList() was `if (override) return [override]`, so one stale GROQ_MODEL made that env var the
// ONLY candidate. Observed live 19 Aug 2026: the deployed function tried only "qwen/qwen3-32b" — the
// LAST entry in the built-in groq list — 404'd, and left Gemini as the single working provider.
// The override must LEAD the list, not replace it.
reset();
ENV.GROQ_MODEL = 'a-model-that-no-longer-exists';
const tried = [];
behaviour.groq = (model) => {
  tried.push(model);
  if (model === 'a-model-that-no-longer-exists') {
    return { ok: false, status: 404, json: async () => ({ error: { message: 'model_not_found' } }), text: async () => '' };
  }
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'from groq' } }] }) };
};
behaviour.gemini = 'fail';
r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(tried[0] === 'a-model-that-no-longer-exists', 'the pinned model is still tried FIRST');
ok(tried.length >= 2, `and a dead pin falls through to the built-in list (tried ${tried.length})`);
ok(r.body.provider === 'groq', 'so one stale env var costs a request, not an entire provider');
delete ENV.GROQ_MODEL;

// ── the thinking budget must be off for Gemini ───────────────────────────────────────────────
// gemini-2.5-flash spends maxOutputTokens on THOUGHTS before writing a word. Measured against the
// LIVE function: 3 of 6 identical calls at max_tokens 500 came back as 59-68 character fragments,
// cut mid-word, HTTP 200. That is the app's voice stopping mid-sentence.
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../supabase/functions/ai-proxy/index.ts', import.meta.url), 'utf8');
  ok(/thinkingConfig: \{ thinkingBudget: 0 \}/.test(src), 'Gemini thinking is disabled');
  ok(src.indexOf('thinkingConfig') > src.indexOf('maxOutputTokens'),
     'inside generationConfig, where the API reads it');
}


// ── nothing configured ──────────────────────────────────────────────────────────────────────────
reset({ GEMINI_API_KEY: undefined, GROQ_API_KEY: undefined, OPENROUTER_API_KEY: undefined, ANTHROPIC_API_KEY: undefined });
for (const k of ['GEMINI_API_KEY','GROQ_API_KEY','OPENROUTER_API_KEY','ANTHROPIC_API_KEY']) delete ENV[k];
r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(r.status >= 400, 'no providers configured is an error, not a silent empty answer');

console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
