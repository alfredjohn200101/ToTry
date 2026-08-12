// delete-user — actually deletes the account, not just its rows.
//
// WHY THIS EXISTS: deleteAccount() in index.html deleted the person's rows and then signed them out,
// and the app said "Account deleted". The auth.users row — which IS the account, and which holds their
// email address — was never touched, so signing in with the same email returned the same user id. That
// is a false statement at the most sensitive moment the app has, it contradicts privacy.html ("Delete
// your account and all server-side data"), and App Store Guideline 5.1.1(v) requires account deletion,
// not merely data deletion. Reviewers do test this flow.
//
// Deleting an auth user requires the service-role key. A browser must never hold that key, so it lives
// here: Supabase injects SUPABASE_SERVICE_ROLE_KEY into the function's environment, and it never leaves
// the server.
//
// DEPLOY: Supabase dashboard → Edge Functions → Deploy a new function → name it exactly `delete-user`
// → paste this file → Deploy. Leave "Verify JWT" ON (the default). No secrets to set: all three env
// vars below are provided automatically.
//
// The client treats a failure here as a failure it must confess (see the _failed array in
// deleteAccount), so until this is deployed the app tells the person their account itself is still
// there — which is the truth — instead of claiming it is gone.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ ok: false, error: 'not-signed-in' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // WHO IS ASKING is decided by the token and nothing else. If this trusted a user id from the
    // request body, any signed-in person could delete anyone else's account.
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    })
    const { data: { user }, error: whoErr } = await caller.auth.getUser()
    if (whoErr || !user) return json({ ok: false, error: 'invalid-session' }, 401)

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

    // Rows first, server-side, even though the client already tried. If the client's deletes were
    // refused or it died halfway, this stops orphaned rows outliving the account that owned them.
    // app_events is deliberately left alone: it is keyed by a random anon_id, not the email, and holds
    // no content that identifies anyone.
    const rowErrors: string[] = []
    const wipe = async (table: string, col: string, val: string) => {
      const { error } = await admin.from(table).delete().eq(col, val)
      if (error) rowErrors.push(`${table}: ${error.message}`)
    }
    await wipe('user_data', 'user_id', user.id)
    await wipe('push_subscriptions', 'user_id', user.id)
    if (user.email) await wipe('feedback', 'email', user.email)

    // The account itself. This is the part the client cannot do.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
    if (delErr) return json({ ok: false, error: delErr.message, rowErrors }, 500)

    // rowErrors is reported but does not fail the call: the account is gone, which is what was promised.
    return json({ ok: true, rowErrors })
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) }, 500)
  }
})
