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
  fs.copyFileSync(src, path.join(WWW, f));
  ok++;
}
console.log(`www/ assembled: ${ok}/${ASSETS.length} assets`);
