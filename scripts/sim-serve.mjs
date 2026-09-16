// Serve the real bundle to the iOS SIMULATOR's Safari, with the same person the screenshots use.
//   node scripts/sim-serve.mjs [port]           → serves, prints the URL, opens it on the booted sim
//
// Why this exists: Chromium is what `ios-shot` renders in, and Chromium is not what ships. The two
// things this design leans on hardest — backdrop-filter glass and a webfont display face — are
// exactly the kind that a headless engine can quietly decline to draw, which would make every
// screenshot a picture of an app nobody will see. This puts the same bundle in WebKit on the phone.
import http from 'http'; import fs from 'fs'; import path from 'path'; import url from 'url';
import { execFileSync } from 'child_process';
import { seedSource } from './seed-person.mjs';
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const PORT = +(process.argv[2] || 8788);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  try {
    let b = fs.readFileSync(p);
    if (p.endsWith('index.html')) {
      // Seed BEFORE the app's own script runs, so boot reads a real person rather than an empty device.
      b = Buffer.from(String(b).replace('<body>', '<body>\n<script>' + seedSource() + ';</script>'));
    }
    r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    r.end(b);
  } catch (e) { r.writeHead(404); r.end('not found'); }
});
srv.listen(PORT, () => {
  const u = 'http://localhost:' + PORT + '/index.html';
  console.log('serving ' + u);
  try { execFileSync('xcrun', ['simctl', 'openurl', 'booted', u]); console.log('opened on the booted simulator'); }
  catch (e) { console.log('open it yourself: ' + u); }
});
