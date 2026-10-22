// send-push imports `npm:@supabase/supabase-js@2` and `npm:web-push@3.6.7`, which Node cannot
// resolve. This hook answers both with the stubs the test installed on globalThis, so the function
// body under test is the real one and only its two dependencies are faked.
export function resolve(spec, ctx, next) {
  if (spec.startsWith('npm:@supabase/supabase-js')) return { url: 'totry-stub:supabase', shortCircuit: true };
  if (spec.startsWith('npm:web-push')) return { url: 'totry-stub:webpush', shortCircuit: true };
  return next(spec, ctx);
}
export function load(url, ctx, next) {
  if (url === 'totry-stub:supabase') return { format: 'module', shortCircuit: true,
    source: 'export const createClient = () => globalThis.__SENDPUSH_STUBS__.sb;' };
  if (url === 'totry-stub:webpush') return { format: 'module', shortCircuit: true,
    source: 'export default globalThis.__SENDPUSH_STUBS__.webpush;' };
  return next(url, ctx);
}
