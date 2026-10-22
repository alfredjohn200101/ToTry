import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FEEDBACK_TO = 'totrybyaj@gmail.com';
const FROM_EMAIL = 'totrybyaj@gmail.com';

if (!RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is required');
}

type FeedbackInsertPayload = {
  record?: {
    type?: string | null;
    message?: string | null;
    email?: string | null;
    app_info?: any;
    created_at?: string;
    id?: number;
  };
  // pg_net payloads may also just post the record directly
  type?: string | null;
  message?: string | null;
  email?: string | null;
  app_info?: any;
  created_at?: string;
  id?: number;
};

function safeString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let payloadText = '';
  try {
    payloadText = await req.text();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  let payload: FeedbackInsertPayload;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const record = payload.record ?? payload;

  const type = safeString(record.type).trim();
  const message = safeString(record.message).trim();
  const fromUserEmail = safeString(record.email).trim();
  const createdAt = safeString(record.created_at).trim();
  const id = record.id ?? undefined;
  const appInfo = record.app_info;

  const subject = type ? `New feedback: ${type}` : 'New feedback submission';

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
      <h2 style="margin-bottom: 0;">${subject.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</h2>
      <p style="color:#444;">ID: ${id ?? ''}</p>
      <p style="color:#444;">Created: ${createdAt}</p>
      <hr/>
      <p><b>From user email:</b> ${fromUserEmail || '(not provided)'}</p>
      <p><b>Message:</b></p>
      <pre style="white-space: pre-wrap; font-family: inherit; background:#f5f5f5; padding:12px; border-radius:8px;">${message || '(empty)'}</pre>
      <p><b>App info (JSON):</b></p>
      <pre style="white-space: pre-wrap; font-family: inherit; background:#f5f5f5; padding:12px; border-radius:8px;">${safeString(appInfo) || '(none)'}</pre>
    </div>
  `;

  const body = {
    from: FROM_EMAIL,
    to: FEEDBACK_TO,
    subject,
    html,
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.text();
  if (!res.ok) {
    return new Response(`Resend error: ${data}`, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
