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
  calls.push({ who, model, body: sentBody, url: u });
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

// ── a web-search request must not fall off a cliff into the paid provider ──────────────────────
// The order was ["gemini","openrouter","anthropic"]: only the first two can actually search, and when
// both were down it went straight to the one provider that costs money — which currently has no credit
// — while four working FREE providers sat unused. Searchers first, then the rest of the free chain
// answering from training data, which for "what is in this dish" still beats no answer.
reset({ MISTRAL_API_KEY: 'm' });
behaviour.gemini = 'fail'; behaviour.openrouter = 'fail';
r = await call({ messages: [{ role: 'user', content: 'what is in a gyros' }], web_search: true });
ok(r.body.provider === 'groq' || r.body.provider === 'mistral',
   'with both searchers down a web-search request reaches the free chain, not the paid provider (' + r.body.provider + ')');
ok(r.body.grounded === false,
   'and it says so: an answer composed from training data is NOT reported as looked up');

reset();
r = await call({ messages: [{ role: 'user', content: 'what is in a gyros' }], web_search: true });
ok(r.body.provider === 'gemini' && r.body.grounded === true,
   'while a searcher answering IS reported as grounded, so "from the web" on a screen is a true claim');

r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(!r.body.grounded, 'and an ordinary request is never labelled grounded at all');

// ── a provider that answers on its THIRD id is also telling you two ids are dead ────────────────
// The winner was reported and the candidates burned getting to it were not, so a list could rot down
// to its last entry with nothing ever saying so — which is how every previous endpoint rot survived.
// This ran on GROQ until 19 Nov 2026, when groq's list was cut to its two LIVE ids and a provider with
// two candidates can no longer lose two and still answer. It moved to gemini, the one list with three,
// rather than being deleted: a list edit that drops below three must move this check, not lose it.
reset();
const _seen = [];
behaviour.gemini = (model) => { _seen.push(model);
  if (_seen.length < 3) return { ok: false, status: 404, json: async () => ({ error: { message: 'model_not_found' } }), text: async () => '' };
  return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'from gemini' }] }, finishReason: 'STOP' }] }) }; };
r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(_seen.length === 3 && r.body.provider === 'gemini', 'a provider still answers after losing two candidates (tried ' + _seen.length + ')');
ok(JSON.stringify(r.body.burned) === JSON.stringify(_seen.slice(0, 2)),
   'and the two dead ids are NAMED in the response, in the order tried (' + JSON.stringify(r.body.burned) + ')');

// ── vision can be addressed provider by provider, or it can never be checked ────────────────────
reset({ MISTRAL_API_KEY: 'm' });
r = await call({ action: 'vision', prompt: 'x', image_base64: 'AAAA', prefer: 'mistral' });
ok(r.body.provider === 'mistral-vision',
   'prefer reaches a vision provider that gemini would otherwise always answer in front of');
ok(!calls.some(c => c.who === 'gemini'), 'and it goes FIRST, not merely eventually');

// ── the food camera has four providers, and each speaks its own dialect ─────────────────────────
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

// ── NO PHOTO EVER REACHES NVIDIA (19 Nov 2026) ──────────────────────────────────────────────────
// NVIDIA's API Trial terms forbid production use and personal or health data, and until today this
// chain sent it photos as its LAST link — reached whenever the four in front of it failed, and a form
// check is a picture of the person's body. DRIVEN, not grepped: the key is SET, a model is PINNED,
// NVIDIA is asked for BY NAME and every link in front of it is down, which is every way a request
// used to get there. A request "reaches NVIDIA" if it goes to an NVIDIA host, or names an NVIDIA
// model through anybody else.
{
  const NV_ENV = { NVIDIA_API_KEY: 'nv', NVIDIA_VISION_MODEL: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
                   MISTRAL_API_KEY: 'm', CLOUDFLARE_API_TOKEN: 'cf', CLOUDFLARE_ACCOUNT_ID: 'acct' };
  const toNvidia = (c) => /nvidia\.com/i.test(c.url || '') || /^nvidia\//i.test(String(c.model || ''));
  const allDown = () => { for (const p of ['gemini', 'openrouter', 'mistral', 'cloudflare']) behaviour[p] = 'fail'; };

  // CALIBRATION: the detector must SEE an NVIDIA request, or every "none" below is blindness. Sent
  // through the same stub the handler's fetch goes through, to the host the removed caller used.
  calls = [];
  await globalThis.fetch('https://integrate.api.nvidia.com/v1/chat/completions',
    { method: 'POST', body: JSON.stringify({ model: 'google/gemma-4-31b-it', messages: [] }) });
  ok(calls.length === 1 && calls.filter(toNvidia).length === 1,
     'calibration — the stub records a request to NVIDIA and the detector recognises it');

  // (a) every link in front down, NVIDIA keyed, pinned and preferred, with the system text a form
  //     check sends. This is exactly the state in which the old chain handed the photo to NVIDIA.
  reset(NV_ENV); allDown();
  r = await call({ action: 'vision', system: 'you are a coach', prompt: 'check my squat form',
                   image_base64: 'AAAA', image_mime: 'image/jpeg', prefer: 'nvidia' });
  const _vTried = (r.body.attempts || []).filter(a => !a.skipped).map(a => a.provider);
  ok(['gemini', 'openrouter', 'mistral', 'cloudflare'].every(p => _vTried.includes(p)),
     'calibration — with every link down the vision walk really ran to its end (' + _vTried.join(',') + ')');
  ok(calls.filter(toNvidia).length === 0 && !(r.body.attempts || []).some(a => /nvidia/i.test(a.provider || '')),
     'no photo reaches NVIDIA, even keyed, pinned, asked for by name and with every other link down (' +
     calls.filter(toNvidia).length + ' of ' + calls.length + ' requests went there)');
  ok(r.status === 503 && !/nvidia/i.test(String(r.body.provider || '')),
     'and the camera says it could not read the photo rather than finding NVIDIA as a way out (' + r.status + ')');

  // (b) asking for NVIDIA by name on a healthy chain is ignored, not honoured.
  reset(NV_ENV);
  r = await call({ action: 'vision', prompt: 'x', image_base64: 'AAAA', prefer: 'nvidia' });
  ok(r.body.provider === 'gemini-vision' && calls.filter(toNvidia).length === 0,
     'prefer:"nvidia" is not a door: the usual first link answers and NVIDIA is never called (' + r.body.provider + ')');

  // (c) the text path never had NVIDIA; naming it in AI_PROVIDER_ORDER must not invent a route.
  reset({ ...NV_ENV, AI_PROVIDER_ORDER: 'nvidia,gemini,groq' }); behaviour.gemini = 'fail';
  r = await call({ messages: [{ role: 'user', content: 'hi' }], prefer: 'nvidia' });
  ok(r.body.provider === 'groq' && calls.filter(toNvidia).length === 0,
     'and the text path has no way to NVIDIA either, even named in AI_PROVIDER_ORDER (' + r.body.provider + ')');
}

// And when nothing is configured the camera says so, naming what it tried, rather than hanging.
reset();
behaviour.gemini = 'fail'; behaviour.openrouter = 'fail';
r = await call({ action: 'vision', prompt: 'x', image_base64: 'AAAA' });
ok(r.status === 503 && (r.body.attempts || []).map(a => a.provider).join(',') === 'gemini,openrouter,mistral,cloudflare',
   'with every provider down or unset the camera reports all four attempts, in order, not silence (' +
   (r.body.attempts || []).map(a => a.provider).join(',') + ')');

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

// ── the thinking budget must be off for Gemini, in the field EACH model accepts ──────────────
// gemini-2.5-flash spends maxOutputTokens on THOUGHTS before writing a word. Measured against the
// LIVE function: 3 of 6 identical calls at max_tokens 500 came back as 59-68 character fragments,
// cut mid-word, HTTP 200. That is the app's voice stopping mid-sentence.
// This was a regex over the source for one literal. It is DRIVEN now, because the list spans two
// families since 19 Nov 2026 and the two take different fields: Google's API reference says a
// thinkingLevel sent to a 2.x model "results in an error", and the 3.x notes say to replace the
// budget with a level. A literal that is right for one family is wrong for the other, and a regex
// cannot say which model received which field.
{
  const tc = (c) => c?.body?.generationConfig?.thinkingConfig;
  const geminiCalls = () => calls.filter(c => c.who === 'gemini');
  const both = (c) => { const t = tc(c) || {}; return 'thinkingBudget' in t && 'thinkingLevel' in t; };

  // (a) the text path leads with 3.5-flash-lite and sends it MINIMAL, inside generationConfig.
  reset();
  r = await call({ messages: [{ role: 'user', content: 'hi' }] });
  const _g0 = geminiCalls()[0];
  ok(_g0?.model === 'gemini-3.5-flash-lite',
     'Gemini text leads with gemini-3.5-flash-lite, Google’s named replacement for 2.5-flash (' + _g0?.model + ')');
  ok(JSON.stringify(tc(_g0)) === '{"thinkingLevel":"MINIMAL"}',
     'and sends it thinkingLevel MINIMAL — a level, not a budget (' + JSON.stringify(tc(_g0)) + ')');
  ok(_g0?.body && !('thinkingConfig' in _g0.body),
     'inside generationConfig, where the API reads it — not at the top of the body');

  // (b) both 3.x ids refuse the request, so the 2.5 safety net answers — and it must get a BUDGET.
  reset();
  behaviour.gemini = (model) => String(model).startsWith('gemini-3')
    ? { ok: false, status: 400, json: async () => ({ error: { message: 'invalid argument' } }), text: async () => '' }
    : { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'from gemini' }] }, finishReason: 'STOP' }] }) };
  r = await call({ messages: [{ role: 'user', content: 'hi' }] });
  const _g25 = geminiCalls().find(c => c.model === 'gemini-2.5-flash');
  ok(r.body.provider === 'gemini' && r.body.model === 'gemini-2.5-flash',
     'with both 3.x ids refusing, gemini-2.5-flash still answers until its 1 Dec 2026 shutdown (' + r.body.model + ')');
  ok(JSON.stringify(tc(_g25)) === '{"thinkingBudget":0}',
     'and 2.5 gets thinkingBudget 0, because a level sent to a 2.x model is an error (' + JSON.stringify(tc(_g25)) + ')');
  ok(JSON.stringify(r.body.burned) === JSON.stringify(['gemini-3.5-flash-lite', 'gemini-3.6-flash']),
     'and the two refused 3.x ids are NAMED in burned, so a wrong request shape is visible (' + JSON.stringify(r.body.burned) + ')');
  ok(JSON.stringify(tc(geminiCalls().find(c => c.model === 'gemini-3.6-flash'))) === '{"thinkingLevel":"MINIMAL"}',
     '3.6-flash also accepts MINIMAL and is sent it');
  ok(geminiCalls().length === 3 && !geminiCalls().some(both),
     'no Gemini request ever carries a budget AND a level at once (' + geminiCalls().length + ' requests)');

  // (c) a pin to a model that REJECTS minimal gets LOW, so an env var cannot break the request shape.
  reset({ GEMINI_MODEL: 'gemini-3.8-flash' });
  r = await call({ messages: [{ role: 'user', content: 'hi' }] });
  const _g38 = geminiCalls()[0];
  ok(_g38?.model === 'gemini-3.8-flash' && JSON.stringify(tc(_g38)) === '{"thinkingLevel":"LOW"}',
     'a GEMINI_MODEL pin to 3.8-flash, which rejects minimal, is sent LOW (' + _g38?.model + ' ' + JSON.stringify(tc(_g38)) + ')');

  // (d) the food camera takes the same list and the same per-model field.
  reset();
  r = await call({ action: 'vision', prompt: 'x', image_base64: 'aGk=' });
  const _gv = geminiCalls()[0];
  ok(_gv?.model === 'gemini-3.5-flash-lite' && JSON.stringify(tc(_gv)) === '{"thinkingLevel":"MINIMAL"}',
     'the food camera leads with 3.5-flash-lite and sends it MINIMAL (' + _gv?.model + ' ' + JSON.stringify(tc(_gv)) + ')');
  reset();
  behaviour.gemini = (model) => String(model).startsWith('gemini-3')
    ? { ok: false, status: 400, json: async () => ({ error: { message: 'invalid argument' } }), text: async () => '' }
    : { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'from gemini' }] }, finishReason: 'STOP' }] }) };
  r = await call({ action: 'vision', prompt: 'x', image_base64: 'aGk=' });
  const _gv25 = geminiCalls().find(c => c.model === 'gemini-2.5-flash');
  ok(r.body.provider === 'gemini-vision' && JSON.stringify(tc(_gv25)) === '{"thinkingBudget":0}',
     'and its 2.5 safety net gets a budget, not a level (' + JSON.stringify(tc(_gv25)) + ')');
}

// ── no candidate a vendor has SHUT DOWN is ever tried ───────────────────────────────────────────
// Each of these was confirmed dead on 19 Nov 2026 against the vendor's own page: gemini-2.0-flash shut
// down 1 Jun 2026; Groq shut llama-4-scout down 17 Jul and the two llama-3.x ids 16 Aug; both nemotron
// ids have ZERO endpoints on OpenRouter. A dead id is a full round trip (up to 20s) on the way past,
// on every single call that reaches it.
{
  const DEAD = ['gemini-2.0-flash', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant',
                'meta-llama/llama-4-scout-17b-16e-instruct', 'nvidia/nemotron-3-super-120b-a12b:free',
                'nvidia/nemotron-nano-12b-v2-vl:free'];
  reset();
  behaviour.gemini = 'fail'; behaviour.groq = 'fail'; behaviour.openrouter = 'fail'; behaviour.anthropic = 'fail';
  await call({ messages: [{ role: 'user', content: 'hi' }] });
  const textTried = calls.map(c => c.model).filter(Boolean);
  await call({ action: 'vision', prompt: 'x', image_base64: 'aGk=' });
  const visionTried = calls.map(c => c.model).filter(Boolean);
  // CALIBRATION: an empty list trivially contains no dead id, so prove the stub really recorded the
  // whole walk — the last live candidate of each changed list must be in it.
  ok(['gemini-2.5-flash', 'openai/gpt-oss-20b', 'google/gemma-4-26b-a4b-it:free'].every(m => textTried.includes(m))
     && ['gemini-2.5-flash', 'google/gemma-4-26b-a4b-it:free'].every(m => visionTried.includes(m)),
     'calibration — the text and vision walks were recorded to their last candidate (' + textTried.length + ' + ' + visionTried.length + ' requests)');
  const _deadHit = DEAD.filter(m => textTried.includes(m) || visionTried.includes(m));
  ok(_deadHit.length === 0,
     'no shut-down model id is tried on the text or vision path (' + (_deadHit.join(', ') || 'none') + ')');
}


// ── nothing configured ──────────────────────────────────────────────────────────────────────────
reset({ GEMINI_API_KEY: undefined, GROQ_API_KEY: undefined, OPENROUTER_API_KEY: undefined, ANTHROPIC_API_KEY: undefined });
for (const k of ['GEMINI_API_KEY','GROQ_API_KEY','OPENROUTER_API_KEY','ANTHROPIC_API_KEY']) delete ENV[k];
r = await call({ messages: [{ role: 'user', content: 'hi' }] });
ok(r.status >= 400, 'no providers configured is an error, not a silent empty answer');

console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
