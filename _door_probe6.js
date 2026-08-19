const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = '/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/entrypoint_snap_www';
const PORT = 8891;
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
  await page.addInitScript(s => { for (const k in s) localStorage.setItem(k, JSON.stringify(s[k])); },
    { totry_guest: true, totry_onboarded: true, totry_name: 'Sam', totry_sex: 'male', totry_faith_tradition: 'secular' });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); document.querySelector('#companion-overlay')?.classList.remove('open'); document.querySelector('#companion-backdrop')?.classList.remove('open'); });

  // speed the protocol up
  await page.evaluate(() => { BREATH_PROTOCOLS.settle.cycles = 1; BREATH_PROTOCOLS.settle.phases.forEach(p => p.s = 0.15); });

  // ANXIOUS: the door's primary move
  await page.evaluate(() => _feelMove('anxious'));
  await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('.modal-bg.open button')].find(b => /Breathe with me/.test(b.innerText)).click());
  await page.waitForTimeout(400);
  console.log('breath pre', await page.evaluate(() => document.querySelector('.breath-overlay .b-pre').style.display));
  await page.evaluate(() => [...document.querySelectorAll('.breath-overlay .b-scale button')].find(b => b.textContent === '8').click());
  await page.waitForTimeout(2500);
  console.log('after run', JSON.stringify(await page.evaluate(() => ({
    post: document.querySelector('.breath-overlay .b-post')?.style.display,
    done: document.querySelector('.breath-overlay .b-done')?.style.display }))));
  // rate SAME (8) — the "still heavy" branch
  await page.evaluate(() => [...document.querySelectorAll('.breath-overlay .b-scale2 button')].find(b => b.textContent === '8').click());
  await page.waitForTimeout(400);
  console.log('STILL-HEAVY ending', JSON.stringify(await page.evaluate(() => {
    const ov = document.querySelector('.breath-overlay');
    return { msg: ov.querySelector('.b-done-msg').textContent,
      btns: [...ov.querySelectorAll('button')].filter(b => b.offsetParent !== null || getComputedStyle(b).position === 'absolute').map(b => b.innerText.trim()) };
  })));
  await page.evaluate(() => document.querySelector('.breath-overlay .b-done-btn').click());
  await page.waitForTimeout(500);
  console.log('after I am ready', JSON.stringify(await page.evaluate(() => ({
    breath: !!document.querySelector('.breath-overlay'), rel: !!document.querySelector('.totry-release-ov'),
    modals: document.querySelectorAll('.modal-bg.open').length,
    releaseCount: (JSON.parse(localStorage.getItem('totry_releases') || '[]')).length,
    breathLog: (JSON.parse(localStorage.getItem('totry_breath_log') || '[]')).length,
    hash: location.hash }))));

  // FLAT primary → natural highs → 'A charged breath' → energize is intense: safety gate?
  await page.evaluate(() => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); document.querySelectorAll('.breath-overlay').forEach(m => m.remove()); localStorage.removeItem('totry_breath_intense_ok'); });
  await page.evaluate(() => openNaturalHighs());
  await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('.modal-bg.open button')].find(b => /charged breath/i.test(b.innerText)).click());
  await page.waitForTimeout(600);
  console.log('energize gate', JSON.stringify(await page.evaluate(() => {
    const m = document.querySelector('.modal-bg.open');
    return { text: m ? m.innerText.replace(/\s+/g, ' ').slice(0, 140) : '', breath: !!document.querySelector('.breath-overlay') };
  })));

  await browser.close(); server.close();
})();
