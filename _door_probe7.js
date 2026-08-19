const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = '/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/entrypoint_snap_www';
const PORT = 8903;
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
async function boot(browser, seed) {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  PAGEERROR', e.message));
  await page.route('**/functions/v1/**', r => r.abort());
  await page.addInitScript(s => { for (const k in s) localStorage.setItem(k, JSON.stringify(s[k])); }, seed);
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); document.querySelector('#companion-overlay')?.classList.remove('open'); document.querySelector('#companion-backdrop')?.classList.remove('open'); });
  return page;
}
(async () => {
  const server = await serve();
  const browser = await chromium.launch({ headless: true });

  for (const [label, seed] of [
    ['no partner, no few', { totry_guest: true, totry_onboarded: true, totry_name: 'Sam', totry_faith_tradition: 'secular' }],
    ['has a few', { totry_guest: true, totry_onboarded: true, totry_name: 'Sam', totry_faith_tradition: 'secular', totry_your_few: [{ name: 'Dan' }] }],
  ]) {
    const page = await boot(browser, seed);
    console.log('--- HALT lonely, ' + label);
    console.log('  getYourFew len', await page.evaluate(() => { try { return getYourFew().length; } catch (e) { return 'ERR ' + e.message; } }));
    await page.evaluate(() => openHALT());
    await page.waitForTimeout(300);
    await page.evaluate(() => [...document.querySelectorAll('.modal-bg.open button')].find(b => /Lonely/.test(b.innerText)).click());
    await page.waitForTimeout(400);
    await page.evaluate(() => [...document.querySelectorAll('.modal-bg.open button')].find(b => /Reach someone/.test(b.innerText)).click());
    await page.waitForTimeout(1200);
    console.log('  landed', JSON.stringify(await page.evaluate(() => {
      const ps = document.getElementById('partner-section');
      const r = ps ? ps.getBoundingClientRect() : null;
      return { hash: location.hash, psDisplay: ps ? getComputedStyle(ps).display : 'NOELEM',
        psInView: r ? (r.height > 0 && r.top < innerHeight && r.bottom > 0) : false,
        psText: ps ? ps.innerText.replace(/\s+/g, ' ').slice(0, 90) : '',
        scrollY: Math.round(window.scrollY),
        visibleTop: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160) };
    })));
    await page.context().close();
  }
  await browser.close(); server.close();
})();
