// Strava OAuth Edge Function
// Handles two actions securely (client secret never touches the browser):
//   action: "exchange" — swap an OAuth code for access + refresh tokens
//   action: "refresh"  — use a refresh token to get a fresh access token
//   action: "activities" — fetch recent activities using a valid access token
//
// Required Supabase secret: STRAVA_CLIENT_SECRET
// Strava Client ID is public and passed from the app.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, accept-language, content-language, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};

const STRAVA_CLIENT_ID = "252158";

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

  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
  if (!clientSecret) {
    return new Response(
      JSON.stringify({ error: "Strava secret not configured on server" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const action = body.action;

    // ── EXCHANGE: code → tokens ──────────────────────────────
    if (action === "exchange") {
      if (!body.code) {
        return new Response(JSON.stringify({ error: "Missing code" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: clientSecret,
          code: body.code,
          grant_type: "authorization_code",
        }),
      });

      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── REFRESH: refresh_token → new access_token ────────────
    if (action === "refresh") {
      if (!body.refresh_token) {
        return new Response(
          JSON.stringify({ error: "Missing refresh_token" }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }

      const resp = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: clientSecret,
          refresh_token: body.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── ACTIVITIES: fetch recent activities ──────────────────
    if (action === "activities") {
      if (!body.access_token) {
        return new Response(
          JSON.stringify({ error: "Missing access_token" }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }

      const perPage = Math.min(body.per_page || 30, 100);
      const resp = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`,
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
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
