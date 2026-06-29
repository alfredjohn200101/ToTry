// The AI entry point — ported from the PWA's api(). Calls the live ai-proxy edge function
// (free-first chain: Gemini -> Groq -> OpenRouter -> Anthropic Haiku). Backend reused as-is.
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/data/supabase';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export type ApiOpts = {
  timeout?: number;
  prefer?: string; // e.g. 'anthropic' for crisis SOS
  web_search?: boolean;
  userId?: string;
};

const API = SUPABASE_URL + '/functions/v1/ai-proxy';

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms / 1000}s (${label})`)), ms)),
  ]);
}

/** sys = system prompt, hist = prior turns, msg = new user message. Returns reply text ('' on failure). */
export async function api(sys: string, hist: ChatMsg[], msg: string, tok = 1200, opts: ApiOpts = {}): Promise<string> {
  const TIMEOUT_MS = opts.timeout ?? 30000;
  const body: Record<string, unknown> = {
    max_tokens: tok,
    system: sys,
    messages: [...(hist || []), { role: 'user', content: msg }],
  };
  if (opts.prefer) body.prefer = opts.prefer;
  if (opts.web_search) body.web_search = true;
  if (opts.userId) body.user_id = opts.userId;

  // Method 1: Supabase client (handles auth headers correctly).
  try {
    const { data, error } = await withTimeout(supabase.functions.invoke('ai-proxy', { body }), TIMEOUT_MS, 'supabase-invoke');
    if (!error && data) {
      if (data.text) return data.text as string;
      if (data.error === 'rate_limited') return (data.message as string) || "You've reached today's AI limit. It resets at midnight.";
    }
  } catch {
    // fall through to direct fetch
  }

  // Method 2: direct fetch fallback (ai-proxy runs with verify_jwt off, so the anon key is enough).
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY };
    try {
      const {
        data: { session },
      } = await withTimeout(supabase.auth.getSession(), 5000, 'get-session');
      if (session?.access_token) headers['Authorization'] = 'Bearer ' + session.access_token;
    } catch {
      /* no session — fine for ai-proxy */
    }
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(API, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.text) return d.text as string;
    } finally {
      clearTimeout(tid);
    }
  } catch {
    /* swallow — caller handles empty reply with a grounded fallback */
  }

  return '';
}
