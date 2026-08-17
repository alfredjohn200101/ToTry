// key-proxy — keeps third-party credentials off the client.
//
// WHY THIS EXISTS. index.html is a single public file served from GitHub Pages, so anything in it is
// readable by anyone who views source. Three third-party credentials were sitting in it:
//
//   · FS_SECRET — a FatSecret OAuth **client secret**, used as btoa(FS_ID+':'+FS_SECRET) in a
//     client-credentials exchange performed IN THE BROWSER. This is the serious one: a client secret is
//     the app's own identity, not a read-only key, and publishing it lets anyone act as this app.
//   · ESV_API_KEY — api.esv.org issues keys per person and does not expect them to be published.
//     Someone else's use can rate-limit or revoke it and take the ESV reader down for everyone.
//   · USDA_DEFAULT_KEY — FoodData Central, rate-limited per key, so exposure is quota theft.
//
// All three are now requested through here, and none of them remains in the bundle. The client degrades
// gracefully if this function is not deployed (see the notes on each provider below), so nothing breaks
// while it is being set up — food search simply runs on three sources instead of four, and scripture
// falls back to a translation that needs no key at all.
//
// DEPLOY: Supabase dashboard → Edge Functions → Deploy a new function → name it exactly `key-proxy` →
// paste this file → Deploy. Leave "Verify JWT" ON so only signed-in users can spend the quota.
//
// THEN SET THE SECRETS (dashboard → Edge Functions → key-proxy → Secrets). Rotate every one of these
// first: the values that were in the bundle are burned, and must be treated as public forever.
//   FatSecret consumer key    — FATSECRET_ID | FATSECRET_CONSUMER_KEY | FATSECRET_KEY | FATSECRET_CLIENT_ID
//   FatSecret consumer secret — FATSECRET_SECRET | FATSECRET_CONSUMER_SECRET | FATSECRET_CLIENT_SECRET
//   ESV key                   — ESV_API_KEY | ESV_KEY            (rotate in the ESV API console)
//   FoodData Central key      — USDA_API_KEY | USDA_KEY | USDA_FDC_API_KEY  (free, instant at api.data.gov)
// Any of the listed spellings works — FatSecret's own console says "Consumer Key/Secret", so that is what
// gets typed, and an earlier version of this function only looked for FATSECRET_ID/FATSECRET_SECRET and
// reported "not configured" with both values sitting right there in Supabase.
// Any secret left unset simply disables that provider; the others keep working.
//
// Supabase secrets are PROJECT-scoped ("Edge Function Secrets"), not per-function — there is no
// per-function secret store to find, and setting them at the project level is correct.
//
// To see what this function can actually read, POST {"provider":"status"} — booleans only, never values.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Read the first env var that is actually set. FatSecret's own console calls these the "Consumer Key"
// and "Consumer Secret", so that is what someone naturally types into Supabase — while this function
// originally looked only for FATSECRET_ID / FATSECRET_SECRET and reported "not configured" with both
// values sitting right there. Accept every reasonable spelling instead of making the human match mine.
const env = (...names: string[]) => {
  for (const n of names) { const v = Deno.env.get(n); if (v) return v }
  return undefined
}
const FS_ID_NAMES     = ['FATSECRET_ID', 'FATSECRET_CONSUMER_KEY', 'FATSECRET_KEY', 'FATSECRET_CLIENT_ID']
const FS_SECRET_NAMES = ['FATSECRET_SECRET', 'FATSECRET_CONSUMER_SECRET', 'FATSECRET_CLIENT_SECRET']

// Last resort: find the secret whatever it was named. Three rounds went by with the consumer key
// matching one spelling and the secret matching none, which is a silly way to spend someone's evening —
// the env var NAME is not sensitive, so it can be discovered and reported. Any variable whose name looks
// like a FatSecret secret and is not one of the id names qualifies. Values are never returned or logged.
const findFsSecret = (): { name?: string; value?: string } => {
  for (const n of FS_SECRET_NAMES) { const v = Deno.env.get(n); if (v) return { name: n, value: v } }
  try {
    for (const [k, v] of Object.entries(Deno.env.toObject())) {
      if (!v) continue
      if (FS_ID_NAMES.includes(k)) continue
      const u = k.toUpperCase().replace(/[^A-Z]/g, '')
      if (u.includes('FATSECRET') && u.includes('SECRET')) return { name: k, value: v }
    }
  } catch (_) { /* env enumeration not permitted — the explicit names above still work */ }
  return {}
}
const ESV_NAMES       = ['ESV_API_KEY', 'ESV_KEY']
const USDA_NAMES      = ['USDA_API_KEY', 'USDA_KEY', 'USDA_FDC_API_KEY']

// FatSecret tokens last an hour. Cached per warm instance so a busy minute is one exchange, not many.
let fsToken: string | null = null
let fsExpiry = 0

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'bad json' }, 400) }
  const provider = String(body.provider || '')

  try {
    // ── FATSECRET ────────────────────────────────────────────────────────────────────────────────
    // Returns a short-lived access token rather than the secret. A leaked hour-long token is a very
    // different thing from a leaked permanent client secret.
    if (provider === 'fatsecret') {
      const id = env(...FS_ID_NAMES)
      const secret = findFsSecret().value
      if (!id || !secret) return json({ error: 'fatsecret not configured' }, 501)
      if (fsToken && Date.now() < fsExpiry) return json({ access_token: fsToken })
      const r = await fetch('https://oauth.fatsecret.com/connect/token', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(id + ':' + secret),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&scope=basic',
      })
      const d = await r.json().catch(() => ({}))
      if (!d.access_token) {
        // Pass FatSecret's OWN reason through. Swallowing it meant "fatsecret token failed" with no way
        // to tell apart the three real causes, and the credentials are found — so the fault is at their
        // end, not in the wiring:
        //   invalid_client        → the id and secret are not a matching pair (e.g. one rotated, one not)
        //   invalid_scope         → 'basic' is not granted on this plan
        //   403 / IP not allowed  → FatSecret allowlists server IPs per app, and Supabase edge functions
        //                           have no fixed IP. This is the one that cannot be fixed from here; it
        //                           needs the app's IP restriction turned OFF in the FatSecret console.
        // An OAuth error body carries no credential, so this is safe to surface.
        return json({
          error: 'fatsecret token failed',
          status: r.status,
          fatsecret_error: d.error || null,
          fatsecret_description: d.error_description || null,
          detail: typeof d === 'object' ? JSON.stringify(d).slice(0, 300) : String(d).slice(0, 300),
        }, 502)
      }
      fsToken = d.access_token
      // Expire a minute early so a token is never handed out on its last breath.
      fsExpiry = Date.now() + (Math.max(60, Number(d.expires_in) || 3600) - 60) * 1000
      return json({ access_token: fsToken })
    }

    // ── ESV ──────────────────────────────────────────────────────────────────────────────────────
    // Proxies the passage itself, so the key never leaves this function. `q` is passed straight to the
    // ESV API, which is a read-only text endpoint.
    if (provider === 'esv') {
      const key = env(...ESV_NAMES)
      if (!key) return json({ error: 'esv not configured' }, 501)
      const q = String(body.q || '').slice(0, 200)
      if (!q) return json({ error: 'q required' }, 400)
      const url = 'https://api.esv.org/v3/passage/text/?q=' + encodeURIComponent(q) +
        '&include-verse-numbers=true&include-headings=false&include-footnotes=false' +
        '&include-short-copyright=false&include-passage-references=false'
      const r = await fetch(url, { headers: { 'Authorization': 'Token ' + key } })
      if (!r.ok) return json({ error: 'esv ' + r.status }, 502)
      return json(await r.json())
    }

    // ── USDA FOODDATA CENTRAL ────────────────────────────────────────────────────────────────────
    // dataType and pageSize are passed through because the client deliberately makes TWO separate
    // calls — Foundation/SR-Legacy whole foods, and Branded — since FoodData Central holds ~1.9 million
    // branded products against ~8k generic ones, and asking for both together let supermarket packets
    // drown the actual food. Collapsing that into one proxy call would quietly undo it.
    if (provider === 'usda') {
      const key = env(...USDA_NAMES)
      if (!key) return json({ error: 'usda not configured' }, 501)
      const q = String(body.query || '').slice(0, 120)
      if (!q) return json({ error: 'query required' }, 400)
      const dataType = String(body.dataType || 'Foundation,SR Legacy').slice(0, 60)
      const pageSize = Math.min(50, Math.max(1, Number(body.pageSize) || 10))
      const r = await fetch('https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + key +
        '&query=' + encodeURIComponent(q) +
        '&dataType=' + encodeURIComponent(dataType) +
        '&pageSize=' + pageSize)
      if (!r.ok) return json({ error: 'usda ' + r.status, status: r.status }, 502)
      return json(await r.json())
    }

    // Which credentials can this function actually see? Booleans only — never a value, not even a
    // prefix. Added because diagnosing "not configured" meant guessing at env var names from outside.
    if (provider === 'status') {
      return json({
        // The NAME each credential was found under, so a mismatch is visible. Names are not secrets;
        // values are never included.
        fatsecret: {
          id: !!env(...FS_ID_NAMES),
          id_found_as: FS_ID_NAMES.find((n) => !!Deno.env.get(n)) || null,
          secret: !!findFsSecret().value,
          secret_found_as: findFsSecret().name || null,
        },
        esv: !!env(...ESV_NAMES),
        usda: !!env(...USDA_NAMES),
        // Names it looked for, so a mismatch is obvious at a glance.
        looked_for: { id: FS_ID_NAMES, secret: FS_SECRET_NAMES, esv: ESV_NAMES, usda: USDA_NAMES },
      })
    }

    return json({ error: 'unknown provider' }, 400)
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
