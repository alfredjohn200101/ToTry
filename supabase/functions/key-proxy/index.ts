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

// Find the credentials whatever they were named, and pair them correctly.
//
// THE BUG THIS REPLACES, because it is worth remembering: the previous version classified a secret with
//     u.includes('FATSECRET') && u.includes('SECRET')
// and the brand name FATSECRET *ends in* SECRET. So FATSECRET_CONSUMER_KEY — the id — matched the test
// for the secret. The status endpoint duly reported secret_found_as "fatsecret_consumer_key", the token
// exchange sent that same key as both halves of the Basic pair, and FatSecret answered invalid_client
// forever. A second bug hid it: the `FS_ID_NAMES.includes(k)` guard meant to skip the id names is
// case-sensitive, and Supabase had preserved the name in lowercase, so it skipped nothing.
// Strip the brand out of the name BEFORE asking whether what remains says "secret".
const fsEnvVars = (): [string, string][] => {
  const out: [string, string][] = []
  const seen = new Set<string>()
  try {
    for (const [k, v] of Object.entries(Deno.env.toObject())) {
      if (v) { out.push([k, v as string]); seen.add(k) }
    }
  } catch (_) { /* enumeration not permitted on this runtime — the explicit names below still work */ }
  for (const n of [...FS_ID_NAMES, ...FS_SECRET_NAMES]) {
    if (seen.has(n)) continue
    const v = Deno.env.get(n); if (v) out.push([n, v])
  }
  return out
}

type FsCred = { name: string; value: string }
const fsCandidates = (): { ids: FsCred[]; secrets: FsCred[] } => {
  const ids: FsCred[] = [], secrets: FsCred[] = []
  for (const [k, v] of fsEnvVars()) {
    const u = k.toUpperCase().replace(/[^A-Z]/g, '')
    if (!u.includes('FATSECRET')) continue
    const rest = u.split('FATSECRET').join('')          // <- the whole fix is this line
    if (rest.includes('SECRET')) secrets.push({ name: k, value: v })
    else ids.push({ name: k, value: v })                // ID, KEY, CONSUMERKEY, or a bare FATSECRET
  }
  return { ids, secrets }
}

// FatSecret rotates in pairs, and this project has an old consumer key still sitting in FATSECRET_ID
// alongside a newer fatsecret_consumer_key. Guessing which one goes with the secret is a coin flip that
// has already cost days, so don't guess: try every id against every secret, most-likely first, and let
// FatSecret itself say which pair is real. A wrong pair costs one HTTP round trip, once per cold start.
const fsFamily = (n: string) =>
  n.toUpperCase().replace(/[^A-Z]/g, '').split('FATSECRET').join('').replace(/SECRET|KEY|ID|CLIENT/g, '')
const fsPairs = (): { id: FsCred; secret: FsCred; family: boolean }[] => {
  const { ids, secrets } = fsCandidates()
  const pairs = []
  for (const secret of secrets) for (const id of ids) {
    pairs.push({ id, secret, family: fsFamily(id.name) === fsFamily(secret.name) })
  }
  // A matching family first: fatsecret_consumer_key belongs with fatsecret_consumer_secret, not with
  // whatever else happens to be lying around.
  pairs.sort((a, b) => Number(b.family) - Number(a.family))
  return pairs
}
const ESV_NAMES       = ['ESV_API_KEY', 'ESV_KEY']
const USDA_NAMES      = ['USDA_API_KEY', 'USDA_KEY', 'USDA_FDC_API_KEY']

// FatSecret tokens last an hour. Cached per warm instance so a busy minute is one exchange, not many.
let fsToken: string | null = null
let fsExpiry = 0
let fsWorkingPair: string | null = null   // names only — which id+secret FatSecret actually accepted

// Acquiring a FatSecret token is shared now: the client can still ask for one (provider 'fatsecret'),
// and this function also uses it itself to run searches (provider 'fatsecret_search'). Returns either
// the token or the exact body+status the caller should pass back, so both paths report failures the
// same way.
type FsTokenResult =
  | { ok: true; token: string }
  | { ok: false; status: number; body: Record<string, unknown> }

async function fsAcquireToken(): Promise<FsTokenResult> {
  const pairs = fsPairs()
  if (!pairs.length) return { ok: false, status: 501, body: { error: 'fatsecret not configured' } }
  if (fsToken && Date.now() < fsExpiry) return { ok: true, token: fsToken }

  // Try each pair until one is accepted. Only the LAST failure is reported, because a failure from
  // a pair we were merely guessing at is noise — but every attempt is named (names only, never
  // values) so the answer to "which of my four secrets are actually a pair" is in the response.
  let r: Response | null = null, d: Record<string, unknown> = {}, tried: string[] = []
  for (const p of pairs) {
    tried.push(p.id.name + ' + ' + p.secret.name)
    r = await fetch('https://oauth.fatsecret.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(p.id.value + ':' + p.secret.value),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=basic',
    })
    d = await r.json().catch(() => ({}))
    if (d.access_token) { fsWorkingPair = p.id.name + ' + ' + p.secret.name; break }
    // invalid_client means THIS pair is not a pair — the next one might be. Anything else (scope,
    // IP allowlist, 5xx) is not about pairing, so stop rather than hammer their OAuth endpoint.
    if (d.error && d.error !== 'invalid_client') break
  }
  if (!d.access_token) {
    fsWorkingPair = null
    // Pass FatSecret's OWN reason through. Swallowing it meant "fatsecret token failed" with no way
    // to tell apart the three real causes, and the credentials are found — so the fault is at their
    // end, not in the wiring:
    //   invalid_client        → the id and secret are not a matching pair (e.g. one rotated, one not)
    //   invalid_scope         → 'basic' is not granted on this plan
    //   403 / IP not allowed  → FatSecret allowlists server IPs per app, and Supabase edge functions
    //                           have no fixed IP. This is the one that cannot be fixed from here; it
    //                           needs the app's IP restriction turned OFF in the FatSecret console.
    // An OAuth error body carries no credential, so this is safe to surface.
    return {
      ok: false,
      status: 502,
      body: {
        error: 'fatsecret token failed',
        status: r ? r.status : 0,
        fatsecret_error: d.error || null,
        fatsecret_description: d.error_description || null,
        detail: typeof d === 'object' ? JSON.stringify(d).slice(0, 300) : String(d).slice(0, 300),
        pairs_tried: tried,
      },
    }
  }
  fsToken = String(d.access_token)
  // Expire a minute early so a token is never handed out on its last breath.
  fsExpiry = Date.now() + (Math.max(60, Number(d.expires_in) || 3600) - 60) * 1000
  return { ok: true, token: fsToken }
}

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
      const t = await fsAcquireToken()
      return t.ok ? json({ access_token: t.token }) : json(t.body, t.status)
    }

    // ── FATSECRET SEARCH ─────────────────────────────────────────────────────────────────────────
    // The search runs HERE, not in the browser. FatSecret's REST API sends no Access-Control-Allow-
    // Origin header, and the Authorization header forces a preflight, so a browser fetch to it is
    // blocked 100% of the time — measured against the live API on 2 Sep 2026. The app used to call it
    // directly: every food search paid for a token exchange and a request that could never succeed,
    // and the service worker turned the failure into a 503 in the console. CORS does not apply to a
    // server, so the same call works fine from in here.
    if (provider === 'fatsecret_search') {
      const q = String(body.q || '').slice(0, 200)
      if (!q) return json({ error: 'q required' }, 400)
      const max = Math.min(50, Math.max(1, Number(body.max_results) || 8))

      const run = async (token: string) => fetch(
        'https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=' +
        encodeURIComponent(q) + '&format=json&max_results=' + max,
        { headers: { 'Authorization': 'Bearer ' + token } },
      )

      let t = await fsAcquireToken()
      if (!t.ok) return json(t.body, t.status)
      let r = await run(t.token)
      // A cached token can go stale between warm invocations. One retry on 401 with a fresh token,
      // never a loop: if the second one is also rejected the fault is the credential, not the cache.
      if (r.status === 401) {
        fsToken = null
        fsExpiry = 0
        t = await fsAcquireToken()
        if (!t.ok) return json(t.body, t.status)
        r = await run(t.token)
      }
      if (!r.ok) return json({ error: 'fatsecret search ' + r.status }, 502)
      return json(await r.json())
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
      // Report ALL the names found, not the first match. The old version reported one guess as if it
      // were a fact — "secret_found_as: fatsecret_consumer_key" — and that confident wrong answer is
      // why the real problem went unseen. A diagnostic that can only say one thing will eventually say
      // the wrong thing. Names are not secrets; values are never included, here or anywhere.
      const { ids, secrets } = fsCandidates()
      return json({
        fatsecret: {
          id: ids.length > 0,
          secret: secrets.length > 0,
          ids_found: ids.map((c) => c.name),
          secrets_found: secrets.map((c) => c.name),
          pair_order: fsPairs().map((p) => p.id.name + ' + ' + p.secret.name + (p.family ? '  (same family)' : '')),
          working_pair: fsWorkingPair,   // null until a fatsecret call has actually succeeded
        },
        esv: !!env(...ESV_NAMES),
        usda: !!env(...USDA_NAMES),
        looked_for: { id: FS_ID_NAMES, secret: FS_SECRET_NAMES, esv: ESV_NAMES, usda: USDA_NAMES },
      })
    }

    return json({ error: 'unknown provider' }, 400)
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
