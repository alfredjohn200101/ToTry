// ToTry — Google Health/Fitness OAuth Edge Function
// Handles secure token exchange + data fetch (client secret stays server-side).
//   action: "exchange" — swap an OAuth code for access + refresh tokens
//   action: "refresh"  — refresh an expired access token
//   action: "steps"    — fetch daily step counts for the last N days
//   action: "activity" — fetch activity/workout sessions
//
// Required Supabase secret: GOOGLE_HEALTH_SECRET
// Google Client ID is public and passed from the app.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, accept-language, content-language, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};

const GOOGLE_CLIENT_ID =
  "785983553382-97flumrmh3i1mk6cd4avb0n214jt7npu.apps.googleusercontent.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const clientSecret = Deno.env.get("GOOGLE_HEALTH_SECRET");
  if (!clientSecret) {
    return new Response(
      JSON.stringify({ error: "Google secret not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const action = body.action;
    const redirectUri = body.redirect_uri;

    // ── EXCHANGE: code → tokens ──────────────────────────────
    if (action === "exchange") {
      if (!body.code || !redirectUri) {
        return new Response(
          JSON.stringify({ error: "Missing code or redirect_uri" }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      const params = new URLSearchParams({
        code: body.code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      });
      const resp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── REFRESH ──────────────────────────────────────────────
    if (action === "refresh") {
      if (!body.refresh_token) {
        return new Response(JSON.stringify({ error: "Missing refresh_token" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: clientSecret,
        refresh_token: body.refresh_token,
        grant_type: "refresh_token",
      });
      const resp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── STEPS: aggregate daily step counts ───────────────────
    if (action === "steps") {
      if (!body.access_token) {
        return new Response(JSON.stringify({ error: "Missing access_token" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const days = body.days || 7;
      const now = Date.now();
      const start = now - days * 24 * 60 * 60 * 1000;
      const resp = await fetch(
        "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${body.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            aggregateBy: [
              {
                dataTypeName: "com.google.step_count.delta",
                dataSourceId:
                  "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
              },
            ],
            bucketByTime: { durationMillis: 86400000 },
            startTimeMillis: start,
            endTimeMillis: now,
          }),
        }
      );
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── ACTIVITY: workout sessions ───────────────────────────
    if (action === "activity") {
      if (!body.access_token) {
        return new Response(JSON.stringify({ error: "Missing access_token" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const days = body.days || 7;
      const end = new Date().toISOString();
      const startDate = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000
      ).toISOString();
      const resp = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${startDate}&endTime=${end}`,
        { headers: { Authorization: `Bearer ${body.access_token}` } }
      );
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
