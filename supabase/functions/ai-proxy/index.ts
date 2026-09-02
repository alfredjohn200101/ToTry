// ToTry — AI Proxy with multi-provider fallback chain + web search
// Text: Gemini (free) → Groq (free) → OpenRouter (free) → Anthropic (paid, last resort)
// Vision: Gemini Vision → OpenRouter Vision
// web_search:true → routes to a search-capable path (Gemini grounding / OpenRouter :online)
// Hevy proxy: action:'hevy'
//
// Secrets: GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY (any missing = skipped)
// Optional: AI_PROVIDER_ORDER, GEMINI_MODEL, GROQ_MODEL, OPENROUTER_MODEL, ANTHROPIC_MODEL,
//           OPENROUTER_SEARCH_MODEL, OPENROUTER_VISION_MODEL, GEMINI_VISION_MODEL,
//           DAILY_LIMIT_PER_USER, RATE_LIMIT_DISABLED
//
// ── WHY THIS FILE IS NOW IN THE REPO (17 Aug 2026) ──────────────────────────────────────────────
// It wasn't. The function powering the app's entire AI layer existed only as a deployed artefact, so
// it could not be reviewed, diffed or fixed. It was copied in here verbatim and then patched below.
//
// WHAT WAS BROKEN, found by probing the live endpoint:
//   groq        404  "The model `llama-3.3-70b-versatile` does not exist or you do not have access"
//   openrouter  404  "This model is unavailable for free"
// Both hardcoded model IDs had been retired by their vendors. Checked OpenRouter's public model list
// (no auth needed): meta-llama/llama-3.3-70b-instruct:free, openai/gpt-4o-mini:online AND
// google/gemini-2.0-flash-exp:free are ALL gone — so OpenRouter was dead for text, for web search and
// for vision. Gemini still worked, so nobody noticed: the app was one provider deep with a paid
// Anthropic backstop, and the meal-photo and search paths had no fallback at all.
//
// THE ROOT CAUSE is not the specific IDs — it is that one hardcoded model ID per provider makes every
// vendor retirement a permanent, silent outage of that whole provider. So each provider now takes a
// LIST of candidate models and tries them in order: a retirement costs one entry, not the provider.
// Env overrides still win, and are still a single value, so nothing about configuration changes.
// ────────────────────────────────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, accept-language, content-language, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};

// Free first, paid last — anthropic is the only one that costs money and it stays at the back.
// Verified live on 1 Sep 2026: gemini, groq and openrouter all answer; mistral and cloudflare are
// standing free tiers awaiting a key and SKIP silently until one is set, so adding them costs an
// unconfigured deploy nothing at all.
const DEFAULT_ORDER = ["gemini", "groq", "openrouter", "mistral", "cloudflare", "anthropic"];
// ONLY THESE TWO CAN ACTUALLY SEARCH — Gemini through google_search grounding, OpenRouter through its
// ":online" model suffix. The others answer from training data, which for "what is in this dish" is
// still a useful answer and is why they belong at the BACK of a web-search request rather than nowhere:
// the old list was ["gemini","openrouter","anthropic"], so a bad afternoon at the two searchers fell
// straight to the one provider that costs money and currently has no credit, while four working free
// providers sat unused. The caller is told which it got — see `grounded` below — because an answer
// composed from memory must not be presented as one looked up.
const SEARCH_CAPABLE = ["gemini", "openrouter"];

// Candidate models per provider, tried in order. First entry is the preferred one.
// An env override (GROQ_MODEL etc.) replaces the whole list with that single value.
const MODELS = {
  gemini:      ["gemini-2.5-flash", "gemini-2.0-flash"],
  // Groq retires model IDs regularly and its model list needs an API key, so this cannot be verified
  // from outside. Several current candidates are listed; whichever answers first wins, and the
  // `attempts` array in the response names it, so the winner is observable without guessing.
  // qwen/qwen3-32b was dropped on 28 Aug 2026 — the LIVE proxy returned
  //   404 "The model `qwen/qwen3-32b` does not exist or you do not have access to it"
  // so it is a wasted attempt on the way to the next provider. The four below are untried against a
  // key from here; whichever answers first wins and `attempts` in the response names it.
  groq:        ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "openai/gpt-oss-120b",
                "meta-llama/llama-4-scout-17b-16e-instruct"],
  // Verified present in OpenRouter's public /api/v1/models on 17 Aug and re-verified 28 Aug 2026
  // (all three still listed; the free tier was returning 429 that day, which is quota, not rot).
  openrouter:  ["google/gemma-4-31b-it:free", "nvidia/nemotron-3-super-120b-a12b:free",
                "google/gemma-4-26b-a4b-it:free"],
  anthropic:   ["claude-haiku-4-5-20251001"],
  // Mistral La Plateforme — a STANDING free tier, no card, verified 1 Sep 2026 against the vendor's
  // own console docs. Pixtral is NOT here on purpose: both pixtral ids were retired (12b on 31 Dec
  // 2025, large on 31 May 2026) and shipping one would be a wasted candidate on the way past.
  // mistral-small-2603 first because it is the one that actually answered when probed live on
  // 1 Sep 2026 — ministral-8b-2512 failed and the list fell through to it, which is the list working
  // as designed but costs a round trip on every call until the order is corrected.
  mistral:     ["mistral-small-2603", "ministral-14b-2512", "ministral-8b-2512"],
  // PROBED LIVE 1 Sep 2026 with a real key: every one of ministral-14b / ministral-8b / mistral-large
  // returned 403 "This model is not available in your subscription tier". Mistral's vision models are
  // NOT on the free tier, whatever their capability pages say — capability and entitlement are
  // different questions and only a real key answers the second. One candidate remains, because
  // mistral-small-2603 is the id proven available on this key for text and Mistral Small is multimodal:
  // if it answers, vision stays free here; if not it costs ONE round trip instead of three before the
  // chain moves on.
  mistralVision: ["mistral-small-2603"],
  // Cloudflare Workers AI — 10,000 Neurons/day, standing, resets 00:00 UTC, and on the Free plan it
  // HARD STOPS rather than billing. Two secrets, because the account id lives in the URL.
  cloudflare:  ["@cf/google/gemma-4-26b-a4b-it", "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
                "@cf/openai/gpt-oss-120b", "@cf/meta/llama-3.1-8b-instruct"],
  // llama-3.2-11b-vision is deliberately absent: it needs a one-time {"prompt":"agree"} licence
  // handshake before it will answer, which would fail closed on a fresh key with no way to tell why.
  // qwen FIRST: probed live with a real 192x192 png, gemma-4-26b-a4b-it failed and qwen3.8-27b
  // answered ("Black app icon with gold ToTry text"). The `burned` field is what surfaced that — the
  // provider was working and quietly losing a candidate on every single call.
  cloudflareVision: ["@cf/qwen/qwen3.8-27b", "@cf/google/gemma-4-26b-a4b-it"],
  // NVIDIA NIM — VISION ONLY, and the reason is the finite pool: 1,000-5,000 lifetime credits, not a
  // recurring allowance. That is a real third leg for the food camera, which had two, and it is not a
  // text backstop — the text chain has five without it, and chat would drain the pool in days.
  nvidiaVision: ["google/gemma-4-31b-it", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
                 "meta/llama-3.2-11b-vision-instruct", "meta/llama-3.2-90b-vision-instruct"],
  // Vision needs image input support — all three verified as accepting images.
  geminiVision:     ["gemini-2.5-flash", "gemini-2.0-flash"],
  openrouterVision: ["google/gemma-4-31b-it:free", "nvidia/nemotron-nano-12b-v2-vl:free",
                     "google/gemma-4-26b-a4b-it:free"],
  // The :online suffix is applied to a model id rather than being a listed model of its own.
  openrouterSearch: ["google/gemma-4-31b-it:free:online", "google/gemma-4-31b-it:free"],
};

// Resolve to a list: an explicit env override collapses it to one, otherwise the candidates.
function modelList(envName, key) {
  const list = MODELS[key] || [];
  const override = Deno.env.get(envName);
  if (!override) return list;
  // First, not only — see the note above. A stale pin must not delete the provider.
  return [override, ...list.filter((m) => m !== override)];
}

async function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms || 20000);
  try { return await fetch(url, { ...options, signal: ctrl.signal }); }
  finally { clearTimeout(tid); }
}

// Try each candidate model in turn. A 404/400 "no such model" costs one entry instead of the provider.
// Returns the first success, or the LAST error so the caller still reports something meaningful.
async function tryModels(models, attempt) {
  let last = { error: true, status: 500, body: { message: "no models configured" } };
  // Which candidates were burned on the way to the winner. A provider that answers on its THIRD id is
  // working AND telling you two of its ids are dead — that second half was invisible, so a list could
  // rot down to its last entry without anything ever saying so.
  const burned = [];
  for (const model of models) {
    try {
      const res = await attempt(model);
      if (res && res.text) return burned.length ? { ...res, burned } : res;
      if (res && res.skip) return res;
      last = res || last;
      burned.push(model);
    } catch (e) {
      last = { error: true, status: 500, body: { message: String(e?.message || e) } };
      burned.push(model);
    }
  }
  return last;
}

async function callGemini({ system, messages, max_tokens, web_search }) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return { skip: true };
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  return await tryModels(modelList("GEMINI_MODEL", "gemini"), async (model) => {
    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: max_tokens || 1024,
        temperature: 0.7,
        // gemini-2.5-flash spends the output budget on THOUGHTS before writing a word. Measured
        // 19 Aug 2026 against the live function: 3 of 6 identical Companion calls at max_tokens 500
        // came back as 59-68 character fragments cut mid-word, finishReason MAX_TOKENS, handed to
        // the app with HTTP 200 as "best available (truncated)" because every other provider in the
        // chain was down. That is the Brother's voice stopping mid-sentence on the surface a person
        // reaches at their worst. The note above diagnosed the EMPTY-text version of this; the
        // truncated version was never handled. thinkingBudget 0 gives the whole budget to the
        // answer, and models that do not support the field ignore it.
        thinkingConfig: { thinkingBudget: 0 },
      },
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    // Web search: enable Gemini's google search grounding tool.
    if (web_search) body.tools = [{ google_search: {} }];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const resp = await fetchWithTimeout(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }, web_search ? 35000 : 20000);
    const data = await resp.json();
    if (!resp.ok) return { error: true, status: resp.status, body: data };
    const cand = data?.candidates?.[0];
    const text = cand?.content?.parts?.map((p) => p.text).join("") || "";
    // NOTE for anyone debugging an empty reply: gemini-2.5-flash is a THINKING model and spends
    // output budget on thoughts before any text. With a very small max_tokens (under ~100) the whole
    // budget goes to thoughtsTokenCount, finishReason comes back MAX_TOKENS, content has a role and no
    // parts, and this looks exactly like a provider outage. The app's smallest real budget is 300.
    if (!text) return { error: true, status: 500, body: data };
    const truncated = cand?.finishReason === "MAX_TOKENS" || cand?.finishReason === "SAFETY";
    return { text, provider: "gemini", model, truncated };
  });
}

async function callGroq({ system, messages, max_tokens }) {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) return { skip: true };
  const msgs = []; if (system) msgs.push({ role: "system", content: system }); msgs.push(...messages);
  return await tryModels(modelList("GROQ_MODEL", "groq"), async (model) => {
    const resp = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: msgs, max_tokens: max_tokens || 1024, temperature: 0.7 }),
    }, 20000);
    const data = await resp.json();
    if (!resp.ok) return { error: true, status: resp.status, body: data };
    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) return { error: true, status: 500, body: data };
    return { text, provider: "groq", model };
  });
}

async function callOpenRouter({ system, messages, max_tokens, web_search }) {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return { skip: true };
  const msgs = []; if (system) msgs.push({ role: "system", content: system }); msgs.push(...messages);
  // For web search, use an :online model (OpenRouter appends live web results).
  const models = web_search
    ? modelList("OPENROUTER_SEARCH_MODEL", "openrouterSearch")
    : modelList("OPENROUTER_MODEL", "openrouter");
  return await tryModels(models, async (model) => {
    const resp = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://alfredjohn200101.github.io/ToTry/", "X-Title": "To Try",
      },
      body: JSON.stringify({ model, messages: msgs, max_tokens: max_tokens || 1024, temperature: 0.7 }),
    }, web_search ? 35000 : 20000);
    const data = await resp.json();
    if (!resp.ok) return { error: true, status: resp.status, body: data };
    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) return { error: true, status: 500, body: data };
    return { text, provider: "openrouter", model };
  });
}

async function callAnthropic({ system, messages, max_tokens }) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return { skip: true };
  return await tryModels(modelList("ANTHROPIC_MODEL", "anthropic"), async (model) => {
    const body = { model, max_tokens: max_tokens || 1024, messages };
    if (system) body.system = system;
    const resp = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
    }, 25000);
    const data = await resp.json();
    if (!resp.ok) return { error: true, status: resp.status, body: data };
    const text = data?.content?.[0]?.text || "";
    if (!text) return { error: true, status: 500, body: data };
    return { text, provider: "anthropic", model };
  });
}

async function callMistral({ system, messages, max_tokens }) {
  const key = Deno.env.get("MISTRAL_API_KEY");
  if (!key) return { skip: true };
  const msgs = []; if (system) msgs.push({ role: "system", content: system }); msgs.push(...messages);
  return await tryModels(modelList("MISTRAL_MODEL", "mistral"), async (model) => {
    const resp = await fetchWithTimeout("https://api.mistral.ai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      // reasoning_effort "none" for the same reason callGemini pins thinkingBudget 0: a reasoning
      // model spends the output budget thinking before it writes, and the meal estimate is the caller
      // with the tightest budget in the app.
      body: JSON.stringify({ model, messages: msgs, max_tokens: max_tokens || 1024, temperature: 0.7,
                             reasoning_effort: "none" }),
    }, 20000);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { error: true, status: resp.status, body: data };
    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) return { error: true, status: 500, body: data };
    return { text, provider: "mistral", model, truncated: data?.choices?.[0]?.finish_reason === "length" };
  });
}

async function callCloudflare({ system, messages, max_tokens }) {
  const key = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const acct = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  // BOTH, or skip. A half-configured deploy would otherwise walk all four candidates collecting 401s
  // at 20s apiece before falling through — 80 seconds of nothing, on the way to an answer.
  if (!key || !acct) return { skip: true };
  const msgs = []; if (system) msgs.push({ role: "system", content: system }); msgs.push(...messages);
  const url = `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/v1/chat/completions`;
  return await tryModels(modelList("CLOUDFLARE_MODEL", "cloudflare"), async (model) => {
    const resp = await fetchWithTimeout(url, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: msgs, max_tokens: max_tokens || 1024, temperature: 0.7 }),
    }, 20000);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { error: true, status: resp.status, body: data };
    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) return { error: true, status: 500, body: data };
    return { text, provider: "cloudflare", model, truncated: data?.choices?.[0]?.finish_reason === "length" };
  });
}

const PROVIDERS = { gemini: callGemini, groq: callGroq, openrouter: callOpenRouter,
                    mistral: callMistral, cloudflare: callCloudflare, anthropic: callAnthropic };

async function callOpenRouterVision({ system, prompt, image_base64, image_mime, max_tokens }) {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return { skip: true };
  const dataUrl = `data:${image_mime || "image/png"};base64,${image_base64}`;
  const msgs = []; if (system) msgs.push({ role: "system", content: system });
  msgs.push({ role: "user", content: [
    { type: "text", text: prompt }, { type: "image_url", image_url: { url: dataUrl } },
  ]});
  return await tryModels(modelList("OPENROUTER_VISION_MODEL", "openrouterVision"), async (model) => {
    const resp = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ model, messages: msgs, max_tokens: max_tokens || 1024, temperature: 0.3 }),
    }, 30000);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { error: true, status: resp.status, body: data };
    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) return { error: true, status: 500, body: data };
    return { text, provider: "openrouter-vision", model };
  });
}

// ── THREE MORE EYES FOR THE FOOD CAMERA ────────────────────────────────────────────────────────
// Vision had exactly two providers and then a 503, while the text chain had four. The camera is the
// feature people open in a supermarket aisle on one bar of signal, so it is the LAST place that should
// be the shallowest. All three below are free and SKIP silently until their key is set.

// Mistral's image part is a plain STRING, not OpenAI's {url:...} object. Copying callOpenRouterVision
// verbatim here returns 422 with a message about the content parts, which reads like a model problem
// and is not one. Verified against the vendor's own API reference and every code sample on it.
async function callMistralVision({ system, prompt, image_base64, image_mime, max_tokens }) {
  const key = Deno.env.get("MISTRAL_API_KEY");
  if (!key) return { skip: true };
  const dataUrl = `data:${image_mime || "image/png"};base64,${image_base64}`;
  const msgs = []; if (system) msgs.push({ role: "system", content: system });
  msgs.push({ role: "user", content: [
    { type: "text", text: prompt }, { type: "image_url", image_url: dataUrl },
  ]});
  return await tryModels(modelList("MISTRAL_VISION_MODEL", "mistralVision"), async (model) => {
    const resp = await fetchWithTimeout("https://api.mistral.ai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: msgs, max_tokens: max_tokens || 1024, temperature: 0.3,
                             reasoning_effort: "none" }),
    }, 30000);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { error: true, status: resp.status, body: data };
    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) return { error: true, status: 500, body: data };
    return { text, provider: "mistral-vision", model };
  });
}

// Cloudflare takes the standard OpenAI image part, and insists on a data: URI — an https:// image URL
// is refused outright. This app only ever sends base64, so that costs nothing.
async function callCloudflareVision({ system, prompt, image_base64, image_mime, max_tokens }) {
  const key = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const acct = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  if (!key || !acct) return { skip: true };
  const dataUrl = `data:${image_mime || "image/png"};base64,${image_base64}`;
  const msgs = []; if (system) msgs.push({ role: "system", content: system });
  msgs.push({ role: "user", content: [
    { type: "text", text: prompt }, { type: "image_url", image_url: { url: dataUrl } },
  ]});
  const url = `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/v1/chat/completions`;
  return await tryModels(modelList("CLOUDFLARE_VISION_MODEL", "cloudflareVision"), async (model) => {
    const resp = await fetchWithTimeout(url, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: msgs, max_tokens: max_tokens || 1024, temperature: 0.3 }),
    }, 30000);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { error: true, status: resp.status, body: data };
    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) return { error: true, status: 500, body: data };
    return { text, provider: "cloudflare-vision", model };
  });
}

// NVIDIA's VISION models REJECT role:"system" — the schemas enumerate only user/assistant on three of
// the four candidates, and the docs add "for system and assistant roles, the object list format is not
// supported". So the system text is folded into the user's text part, which every candidate accepts.
// Vision only, deliberately: the free pool is 1,000-5,000 LIFETIME credits, so it is a real backstop
// for a photo and would be drained in days by chat.
async function callNvidiaVision({ system, prompt, image_base64, image_mime, max_tokens }) {
  const key = Deno.env.get("NVIDIA_API_KEY");
  if (!key) return { skip: true };
  const dataUrl = `data:${image_mime || "image/png"};base64,${image_base64}`;
  const text0 = system ? (system + "\n\n" + prompt) : prompt;
  const msgs = [{ role: "user", content: [
    { type: "text", text: text0 }, { type: "image_url", image_url: { url: dataUrl } },
  ]}];
  return await tryModels(modelList("NVIDIA_VISION_MODEL", "nvidiaVision"), async (model) => {
    const resp = await fetchWithTimeout("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: msgs, max_tokens: max_tokens || 1024, temperature: 0.3 }),
      // 45s, not 30. Warm it answers in 4.9s; the first call of the day aborted at 30s and reported
      // "The signal has been aborted", which reads exactly like a broken provider and is a cold start.
      // It is the LAST link in the vision chain, so a slow answer here still beats no answer.
    }, 45000);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { error: true, status: resp.status, body: data };
    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) return { error: true, status: 500, body: data };
    return { text, provider: "nvidia-vision", model };
  });
}

async function callGeminiVision({ system, prompt, image_base64, image_mime, max_tokens }) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return { skip: true };
  const parts = [{ text: prompt }, { inlineData: { mimeType: image_mime || "image/png", data: image_base64 } }];
  return await tryModels(modelList("GEMINI_VISION_MODEL", "geminiVision"), async (model) => {
    // The TEXT path sets thinkingBudget 0 (line ~116) and this one never did. 2.5 Flash is a thinking
    // model: without the cap it spends the output budget reasoning before it writes a character, so a
    // photo of a plate came back truncated mid-JSON and the client's JSON.parse threw. Measured on the
    // live proxy 28 Aug 2026: the text shape needed 4000 tokens to finish WITHOUT the cap. With it,
    // the whole budget goes to the answer.
    const body = { contents: [{ role: "user", parts }], generationConfig: {
      maxOutputTokens: max_tokens || 1024, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } } };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const resp = await fetchWithTimeout(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }, 25000);
    const data = await resp.json();
    if (!resp.ok) return { error: true, status: resp.status, body: data };
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    if (!text) return { error: true, status: 500, body: data };
    return { text, provider: "gemini-vision", model };
  });
}

async function checkRateLimit(userId) {
  if (Deno.env.get("RATE_LIMIT_DISABLED") === "true") return { allowed: true };
  const limit = parseInt(Deno.env.get("DAILY_LIMIT_PER_USER") || "200", 10);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey || !userId) return { allowed: true };
  try {
    // check_ai_quota atomically: increments today's count, reads the user's purchased bonus credits,
    // and (if over the free daily limit) draws down one bonus credit. Returns the decision so the
    // proxy never has to trust the client. Falls back to the simpler increment_ai_usage if the
    // newer function isn't deployed yet.
    let resp = await fetchWithTimeout(`${url}/rest/v1/rpc/check_ai_quota`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ p_user_id: userId, p_free_limit: limit }),
    }, 5000);

    if (resp.ok) {
      const r = await resp.json();
      // r: { allowed, used, free_limit, bonus_remaining }
      if (r && typeof r === "object") {
        if (r.allowed === false) {
          return { allowed: false, used: r.used, limit, bonus: r.bonus_remaining ?? 0, needsCredits: true };
        }
        return { allowed: true, used: r.used, limit, bonus: r.bonus_remaining ?? 0 };
      }
    }

    // Fallback: legacy increment_ai_usage (no credits support).
    resp = await fetchWithTimeout(`${url}/rest/v1/rpc/increment_ai_usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ p_user_id: userId }),
    }, 5000);
    if (!resp.ok) return { allowed: true };
    const count = await resp.json();
    const used = typeof count === "number" ? count : 0;
    if (used > limit) return { allowed: false, used, limit, needsCredits: true };
    return { allowed: true, used, limit };
  } catch (_e) { return { allowed: true }; }
}

// Who this call is billed to. THE JWT WINS, ALWAYS.
//
// This used to read `body.user_id` first and only fall back to the token. The anon key is public (it
// is in the shipped bundle, as it must be), so anyone could POST here with someone else's user id and
// spend THEIR daily quota — or send a fresh random uuid on every request, get a fresh 200-call
// allowance each time, and walk straight down the free chain into the paid Anthropic fallback. A
// client-supplied identity is a claim, not a fact; the signed token is the fact.
//
// The body value is still accepted, but only when there is no signed token at all — a guest has no
// account to identify them, and a weak key is better than lumping every guest into one bucket. It can
// be forged, which is the honest limit of rate-limiting someone who has not signed in.
function getUserId(req, body) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token && token.split(".").length === 3) {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      // Reject an expired token rather than treat it as anonymous — otherwise letting a token lapse is
      // an upgrade to an unmetered guest bucket.
      const notExpired = !payload.exp || Number(payload.exp) * 1000 > Date.now();
      if (payload.sub && notExpired) return String(payload.sub);
    }
  } catch (_) {}
  // The body value is not used at all. It has no legitimate case: the client sets `user_id` only when
  // `currentUser?.id` exists, and that same branch sends the session token — so every caller that has
  // an id also has a JWT. Keeping it as a fallback would preserve the exact hole above while adding a
  // new one, since `check_ai_quota` takes a uuid and a forged non-uuid would error into the catch and
  // return allowed:true. Fail-open on a spoofable key is worse than not metering at all.
  return null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

function extractErrorMsg(body) {
  if (!body) return null;
  if (typeof body === "string") return body.slice(0, 300);
  // Cloudflare answers {"result":null,"success":false,"errors":[{"code":10000,"message":"..."}]} —
  // none of the shapes above match it, so every Cloudflare failure used to land in `attempts` as an
  // unreadable JSON blob, which is how a dead provider hides.
  return body?.error?.message || body?.error?.error?.message || body?.message ||
         body?.errors?.[0]?.message || JSON.stringify(body).slice(0, 300);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));

    // ── HEVY PROXY ──
    if (body.action === "hevy") {
      const hevyKey = body.hevy_key;
      const path = body.hevy_path || "/v1/workouts?page=1&pageSize=10";
      const method = body.hevy_method || "GET";
      if (!hevyKey) return json({ error: "missing_hevy_key" }, 400);
      try {
        const hevyResp = await fetch("https://api.hevyapp.com" + path, {
          method,
          headers: { "api-key": hevyKey, "Accept": "application/json", ...(method !== "GET" ? { "Content-Type": "application/json" } : {}) },
          ...(body.hevy_body ? { body: JSON.stringify(body.hevy_body) } : {}),
        });
        const text = await hevyResp.text();
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch (_) { parsed = null; }
        return json({ status: hevyResp.status, ok: hevyResp.ok, data: parsed, raw: parsed ? undefined : text }, 200);
      } catch (e) {
        return json({ error: "hevy_unreachable", message: String(e?.message || e) }, 200);
      }
    }

    const userId = getUserId(req, body);
    const rl = await checkRateLimit(userId);
    if (!rl.allowed) {
      return json({
        error: "rate_limited",
        message: "You've reached today's free AI limit. It resets at midnight — your data and the whole app keep working. You can add credits anytime for more AI today.",
        used: rl.used, limit: rl.limit, bonus_remaining: rl.bonus ?? 0, needs_credits: true
      }, 429);
    }

    // ── VISION ──
    if (body.action === "vision" || body.image_base64) {
      const visionArgs = { system: body.system, prompt: body.prompt || "Describe this image.", image_base64: body.image_base64, image_mime: body.image_mime, max_tokens: body.max_tokens || 1024 };
      // A CHAIN, NOT A PAIR. This was gemini-then-openrouter-then-503, so one bad afternoon at either
      // took the food camera out entirely. It now walks every configured provider and REPORTS what it
      // tried — an unconfigured one skips silently, a broken one is named in `attempts`, which is the
      // only way a dead link ever surfaces instead of hiding behind the next.
      let visionChain = [
        ["gemini", callGeminiVision], ["openrouter", callOpenRouterVision],
        ["mistral", callMistralVision], ["cloudflare", callCloudflareVision],
        ["nvidia", callNvidiaVision],
      ];
      // THE SAME `prefer` THE TEXT PATH HAS. Without it gemini always answers first, so the four links
      // behind it can never be exercised from outside — and an unexercisable fallback is indistinguishable
      // from a dead one until the day it is needed. That is how all four previous endpoint rots survived.
      if (body.prefer && visionChain.some(([n]) => n === body.prefer)) {
        visionChain = [...visionChain.filter(([n]) => n === body.prefer),
                       ...visionChain.filter(([n]) => n !== body.prefer)];
      }
      const vAttempts = []; let lastBody = null;
      for (const [vName, vFn] of visionChain) {
        const r = await vFn(visionArgs);
        if (r && r.skip) { vAttempts.push({ provider: vName, skipped: true }); continue; }
        if (r && r.text) return json({ text: r.text, provider: r.provider, model: r.model, attempts: vAttempts, burned: r.burned });
        vAttempts.push({ provider: vName, status: r?.status, error: extractErrorMsg(r?.body) });
        lastBody = r?.body || lastBody;
      }
      return json({ error: "Vision unavailable", attempts: vAttempts, details: lastBody }, 503);
    }

    const system = body.system || "";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const max_tokens = body.max_tokens || 1024;
    const web_search = body.web_search === true;

    // ── WEB SEARCH: prefer search-capable providers (Gemini grounding, OpenRouter :online) ──
    let order = web_search
      ? SEARCH_CAPABLE.concat(DEFAULT_ORDER.filter((p) => SEARCH_CAPABLE.indexOf(p) < 0))
      : DEFAULT_ORDER.slice();
    const envOrder = Deno.env.get("AI_PROVIDER_ORDER");
    if (!web_search && envOrder) order = envOrder.split(",").map((s) => s.trim()).filter(Boolean);
    if (body.prefer && order.includes(body.prefer)) order = [body.prefer, ...order.filter((p) => p !== body.prefer)];

    let bestTruncated = null;
    const attempts = [];
    for (const name of order) {
      const fn = PROVIDERS[name];
      if (!fn) continue;
      try {
        const res = await fn({ system, messages, max_tokens, web_search });
        if (res.skip) { attempts.push({ provider: name, skipped: true }); continue; }
        if (res.text) {
          if (res.truncated && name !== order[order.length - 1]) {
            attempts.push({ provider: name, truncated: true });
            if (!bestTruncated || res.text.length > bestTruncated.text.length) bestTruncated = { text: res.text, provider: res.provider, model: res.model };
            continue;
          }
          // grounded says whether the answer was actually LOOKED UP or composed from training data.
          // Without it the caller cannot tell the difference, and "from the web" on a screen is a claim
          // about where a number came from.
          return json({ text: res.text, provider: res.provider, model: res.model, attempts,
                        burned: res.burned,
                        grounded: !!web_search && SEARCH_CAPABLE.indexOf(name) > -1 });
        }
        attempts.push({ provider: name, status: res.status, error: extractErrorMsg(res.body) });
      } catch (e) {
        attempts.push({ provider: name, exception: String(e?.message || e) });
      }
    }
    if (bestTruncated?.text) return json({ text: bestTruncated.text, provider: bestTruncated.provider, model: bestTruncated.model, attempts, note: "best available (truncated)" });
    return json({ error: "All AI providers unavailable", attempts }, 503);
  } catch (error) {
    return json({ error: error.message || "Internal error" }, 500);
  }
});
