// Drive the Feeling Door end to end in a real browser.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = '/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/snap/www';
const PORT = 8837;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
               '.png': 'image/png', '.svg': 'image/svg+xml' };

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

const SEED = { totry_guest: true, totry_onboarded: true, totry_name: 'Sam', totry_sex: 'male',
               totry_faith_tradition: 'secular' };

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 200)); });
  await page.route('**/functions/v1/**', r => r.abort());
  await page.addInitScript(s => { for (const k in s) localStorage.setItem(k, JSON.stringify(s[k])); }, SEED);
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // dismiss anything blocking
  await page.evaluate(() => { document.querySelectorAll('.modal-bg.open').forEach(m => m.remove());
    document.querySelector('#companion-overlay')?.classList.remove('open'); });

  console.log('URL', page.url(), 'title', await page.title());
  console.log('has fn', await page.evaluate(() => typeof openFeelingDoor));
  console.log('scripts', await page.evaluate(() => document.querySelectorAll('script').length));
  console.log('errs', JSON.stringify(errs.slice(0,10)));
  const FEELS = ['pull','restless','flat','anxious','down','heartache','procrast','frozen','angry','good'];
  for (const id of FEELS) {
    // reset
    await page.evaluate(() => {
      document.querySelectorAll('.modal-bg.open,.tm-overlay,.totry-release-ov,.breath-overlay').forEach(m => m.remove());
      document.querySelector('#companion-overlay')?.classList.remove('open');
      document.getElementById('feel-door')?.classList.remove('open');
    });
    await page.evaluate(() => openFeelingDoor());
    await page.waitForTimeout(300);
    const chips = await page.$$('#feel-grid .feel-chip');
    const idx = FEELS.indexOf(id);
    await chips[idx].click();
    await page.waitForTimeout(900);
    const out = await page.evaluate(() => {
      const modal = document.querySelector('.modal-bg.open .modal');
      const comp = document.querySelector('#companion-overlay.open');
      const tm = document.querySelector('.tm-overlay');
      const rel = document.querySelector('.totry-release-ov');
      const br = document.querySelector('.breath-overlay');
      const surface = modal ? 'modal' : comp ? 'companion' : tm ? 'twomin' : rel ? 'release' : br ? 'breath' : 'NOTHING';
      let btns = [];
      const host = modal || comp || tm || rel || br;
      if (host) btns = [...host.querySelectorAll('button')].map(b => (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
      return { surface, title: host ? (host.innerText || '').split('\n')[0] : '', btns };
    });
    console.log(JSON.stringify({ id, ...out }));
  }
  console.log('--- ERRORS ---');
  errs.slice(0, 30).forEach(e => console.log(e));
  await browser.close(); server.close();
})();
