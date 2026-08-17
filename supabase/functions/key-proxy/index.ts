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
//   FATSECRET_ID       — FatSecret client id
//   FATSECRET_SECRET   — FatSecret client secret (rotate at platform.fatsecret.com)
//   ESV_API_KEY        — api.esv.org key (rotate in the ESV API console)
//   USDA_API_KEY       — FoodData Central key (free, instant reissue at api.data.gov)
// Any secret you leave unset simply disables that provider; the others keep working.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

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
      const id = Deno.env.get('FATSECRET_ID')
      const secret = Deno.env.get('FATSECRET_SECRET')
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
      const d = await r.json()
      if (!d.access_token) return json({ error: 'fatsecret token failed' }, 502)
      fsToken = d.access_token
      // Expire a minute early so a token is never handed out on its last breath.
      fsExpiry = Date.now() + (Math.max(60, Number(d.expires_in) || 3600) - 60) * 1000
      return json({ access_token: fsToken })
    }

    // ── ESV ──────────────────────────────────────────────────────────────────────────────────────
    // Proxies the passage itself, so the key never leaves this function. `q` is passed straight to the
    // ESV API, which is a read-only text endpoint.
    if (provider === 'esv') {
      const key = Deno.env.get('ESV_API_KEY')
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
      const key = Deno.env.get('USDA_API_KEY')
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

    return json({ error: 'unknown provider' }, 400)
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
