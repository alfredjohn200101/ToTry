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

const DEFAULT_ORDER = ["gemini", "groq", "openrouter", "anthropic"];

// Candidate models per provider, tried in order. First entry is the preferred one.
// An env override (GROQ_MODEL etc.) replaces the whole list with that single value.
const MODELS = {
  gemini:      ["gemini-2.5-flash", "gemini-2.0-flash"],
  // Groq retires model IDs regularly and its model list needs an API key, so this cannot be verified
  // from outside. Several current candidates are listed; whichever answers first wins, and the
  // `attempts` array in the response names it, so the winner is observable without guessing.
  groq:        ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "openai/gpt-oss-120b",
                "meta-llama/llama-4-scout-17b-16e-instruct", "qwen/qwen3-32b"],
  // Verified present in OpenRouter's public /api/v1/models on 17 Aug 2026.
  openrouter:  ["google/gemma-4-31b-it:free", "nvidia/nemotron-3-super-120b-a12b:free",
                "google/gemma-4-26b-a4b-it:free"],
  anthropic:   ["claude-haiku-4-5-20251001"],
  // Vision needs image input support — all three verified as accepting images.
  geminiVision:     ["gemini-2.5-flash", "gemini-2.0-flash"],
  openrouterVision: ["google/gemma-4-31b-it:free", "nvidia/nemotron-nano-12b-v2-vl:free",
                     "google/gemma-4-26b-a4b-it:free"],
  // The :online suffix is applied to a model id rather than being a listed model of its own.
  openrouterSearch: ["google/gemma-4-31b-it:free:online", "google/gemma-4-31b-it:free"],
};

// Resolve to a list: an explicit env override collapses it to one, otherwise the candidates.
function modelList(envName, key) {
  const override = Deno.env.get(envName);
  if (override) return [override];
  return MODELS[key] || [];
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
  for (const model of models) {
    try {
      const res = await attempt(model);
      if (res && res.text) return res;
      if (res && res.skip) return res;
      last = res || last;
    } catch (e) {
      last = { error: true, status: 500, body: { message: String(e?.message || e) } };
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
    const body = { contents, generationConfig: { maxOutputTokens: max_tokens || 1024, temperature: 0.7 } };
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

const PROVIDERS = { gemini: callGemini, groq: callGroq, openrouter: callOpenRouter, anthropic: callAnthropic };

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

async function callGeminiVision({ system, prompt, image_base64, image_mime, max_tokens }) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return { skip: true };
  const parts = [{ text: prompt }, { inlineData: { mimeType: image_mime || "image/png", data: image_base64 } }];
  return await tryModels(modelList("GEMINI_VISION_MODEL", "geminiVision"), async (model) => {
    const body = { contents: [{ role: "user", parts }], generationConfig: { maxOutputTokens: max_tokens || 1024, temperature: 0.3 } };
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

function getUserId(req, body) {
  if (body && body.user_id) return String(body.user_id);
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token && token.split(".").length === 3) {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.sub) return String(payload.sub);
    }
  } catch (_) {}
  return null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

function extractErrorMsg(body) {
  if (!body) return null;
  if (typeof body === "string") return body.slice(0, 300);
  return body?.error?.message || body?.error?.error?.message || body?.message || JSON.stringify(body).slice(0, 300);
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
      let result = await callGeminiVision(visionArgs);
      if (!result.text) {
        const fb = await callOpenRouterVision(visionArgs);
        if (fb.text) result = fb;
        else return json({ error: "Vision unavailable", details: result.body || fb.body }, 503);
      }
      return json({ text: result.text, provider: result.provider, model: result.model });
    }

    const system = body.system || "";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const max_tokens = body.max_tokens || 1024;
    const web_search = body.web_search === true;

    // ── WEB SEARCH: prefer search-capable providers (Gemini grounding, OpenRouter :online) ──
    let order = web_search ? ["gemini", "openrouter", "anthropic"] : DEFAULT_ORDER.slice();
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
          return json({ text: res.text, provider: res.provider, model: res.model, attempts });
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
