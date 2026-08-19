const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = '/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/entrypoint_snap_www';
const PORT = 8917;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const serve = () => new Promise(res => {
  const server = http.createServer((req, rq) => {
    const clean = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, clean === '/' ? 'index.html' : clean);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
    rq.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(rq);
  });
  server.listen(PORT, '127.0.0.1', () => res(server));
});
(async () => {
  const server = await serve();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  PAGEERROR', e.message));
  await page.route('**/functions/v1/**', r => r.abort());
  // A brand-new person: identity set (row 1 done), the rest not — so the mixed layout shows.
  await page.addInitScript(s => { for (const k in s) localStorage.setItem(k, JSON.stringify(s[k])); },
    { totry_guest: true, totry_onboarded: true, totry_name: 'Sam', totry_faith_tradition: 'secular', totry_identity: 'a man of discipline' });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); document.querySelector('#companion-overlay')?.classList.remove('open'); document.querySelector('#companion-backdrop')?.classList.remove('open'); go('home'); });
  await page.waitForTimeout(700);
  const info = await page.evaluate(() => {
    const card = document.getElementById('firstrun-card');
    return { display: card && getComputedStyle(card).display,
      rows: [...document.querySelectorAll('#firstrun-steps > div')].map(r => {
        const cs = getComputedStyle(r);
        const kids = [...r.children].map(k => { const b = k.getBoundingClientRect(); return Math.round(b.top) + ',' + Math.round(b.height); });
        return { done: /line-through/.test(r.innerHTML), disp: cs.display, pad: cs.paddingTop, border: cs.borderBottomWidth, h: Math.round(r.getBoundingClientRect().height), kidTops: kids };
      }) };
  });
  console.log(JSON.stringify(info, null, 1));
  const el = await page.$('#firstrun-card');
  if (el) await el.screenshot({ path: '/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/firstrun_card.png' });
  await browser.close(); server.close();
})();
