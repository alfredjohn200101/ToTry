// Assemble the Capacitor web dir (www/) from the PWA source at the repo root.
// The PWA stays a plain single-file app at root (GitHub Pages serves it as-is);
// this just copies the exact shipped assets into www/ for the native shell.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'www');

const ASSETS = [
  'index.html',
  'sw.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'icon.svg',
  // The policy and support pages. Nothing in index.html links to them today (the app carries its own
  // in-app policy), but shipping them keeps the native bundle self-contained — otherwise the first
  // link anyone adds 404s inside the wrapper, silently, which is exactly how this project loses things.
  'privacy.html',
  'support.html',
  // The Supabase SDK, vendored. It used to come from jsdelivr at boot, which made the whole app
  // unopenable with no connection — and the native shell has no service worker to fall back on.
  // If this ever stops being copied, the native build boots to bootWithoutCloud() instead of the
  // real app, so the MISSING-asset failure below is the alarm that matters most.
  'vendor/supabase-js.js',
  // The brand fonts, bundled 12 Sep 2026. They came from fonts.googleapis.com and nothing was
  // cached, so with no network the whole app rendered in the system serif and sans — measured, and
  // reported from a real phone as the lock screen not looking like the app's own logo. Same class
  // of dependency as the Supabase SDK above, and missed for the same reason. If these stop being
  // copied the app still WORKS, which is precisely why it would go unnoticed: it just stops
  // looking like itself.
  'fonts/cormorant-garamond-italic.woff2',
  'fonts/cormorant-garamond.woff2',
  'fonts/dm-mono-300.woff2',
  'fonts/dm-mono-400.woff2',
  'fonts/dm-mono-500.woff2',
  'fonts/outfit.woff2',
];

fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });

let ok = 0;
for (const f of ASSETS) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) {
    console.error('MISSING asset: ' + f);
    process.exitCode = 1;
    continue;
  }
  const dest = path.join(WWW, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true }); // assets may live in a subdir (vendor/)
  fs.copyFileSync(src, dest);
  ok++;
}
console.log(`www/ assembled: ${ok}/${ASSETS.length} assets`);
