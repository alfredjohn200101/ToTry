const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = '/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/entrypoint_snap_www';
const PORT = 8879;
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
const vis = () => {
  const orb = document.getElementById('need-talk-btn');
  const r = orb.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  return { hitIsOrb: !!(top && (top === orb || orb.contains(top))), hitTag: top ? (top.id || top.className || top.tagName) : null, bottom: Math.round(r.bottom), vh: innerHeight };
};
(async () => {
  const server = await serve();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  PAGEERROR', e.message));
  await page.route('**/functions/v1/**', r => r.abort());
  await page.addInitScript(s => { for (const k in s) localStorage.setItem(k, JSON.stringify(s[k])); },
    { totry_guest: true, totry_onboarded: true, totry_name: 'Sam', totry_sex: 'male', totry_faith_tradition: 'secular' });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); document.querySelector('#companion-overlay')?.classList.remove('open'); document.querySelector('#companion-backdrop')?.classList.remove('open'); });
  await page.waitForTimeout(300);
  console.log('ORB on clean home', JSON.stringify(await page.evaluate(vis)));
  for (const t of ['fight', 'grow', 'money', 'soul', 'train', 'nourish', 'settings', 'coach', 'journal']) {
    await page.evaluate(x => { try { go(x); } catch (e) {} }, t);
    await page.waitForTimeout(400);
    console.log('ORB on', t, JSON.stringify(await page.evaluate(vis)));
  }
  // auth wall: is guest entry offered?
  const ctx2 = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const p2 = await ctx2.newPage();
  await p2.route('**/functions/v1/**', r => r.abort());
  await p2.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(3500);
  console.log('AUTH screen buttons', JSON.stringify(await p2.evaluate(() => [...document.querySelectorAll('#auth-container button,#auth-container a')].filter(b => b.offsetParent !== null || getComputedStyle(b).display !== 'none').map(b => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean))));
  // openQuickJournal ending
  await page.evaluate(() => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); go('home'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => openQuickJournal());
  await page.waitForTimeout(400);
  console.log('QJ buttons', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.modal-bg.open button')].map(b => (b.innerText || '').trim()).filter(Boolean))));
  await browser.close(); server.close();
})();
