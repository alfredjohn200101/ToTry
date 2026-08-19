const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = '/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/entrypoint_snap_www';
const PORT = 8853;
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
const snap = () => {
  const modal = [...document.querySelectorAll('.modal-bg.open')].pop();
  const comp = document.querySelector('#companion-overlay.open');
  const tm = document.querySelector('.tm-overlay');
  const rel = document.querySelector('.totry-release-ov');
  const br = document.querySelector('.breath-overlay');
  const host = modal || tm || rel || br || comp;
  const kind = modal ? 'modal' : tm ? 'twomin' : rel ? 'RELEASE' : br ? 'breath' : comp ? 'companion' : 'NOTHING';
  const btns = host ? [...host.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean) : [];
  return { kind, text: host ? (host.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 260) : '', btns };
};

async function boot(browser, seed, opts) {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  PAGEERROR', e.message));
  await page.route('**/functions/v1/**', r => r.abort());
  await page.addInitScript(s => { for (const k in s) localStorage.setItem(k, JSON.stringify(s[k])); }, seed);
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.addScriptTag({ content: 'window.__snap = ' + snap.toString() + ';' });
  return page;
}
const reset = page => page.evaluate(() => {
  document.querySelectorAll('.modal-bg,.tm-overlay,.totry-release-ov,.breath-overlay').forEach(m => m.remove());
  document.querySelector('#companion-overlay')?.classList.remove('open');
  document.getElementById('feel-door')?.classList.remove('open');
});
const clickTxt = (page, rx) => page.evaluate(r => {
  const b = [...document.querySelectorAll('.modal-bg.open button,.tm-overlay button,.totry-release-ov button,.breath-overlay button')].find(x => new RegExp(r).test(x.innerText));
  if (!b) return 'NOBUTTON:' + r; b.click(); return 'ok';
}, rx.source || rx);

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ headless: true });

  // ══ A. brand new, nothing set up: cold open, orb, door ══
  let page = await boot(browser, { totry_guest: true, totry_onboarded: true, totry_faith_tradition: 'secular' });
  console.log('A cold open — visible surfaces:', JSON.stringify(await page.evaluate(() => {
    const orb = document.getElementById('need-talk-btn');
    const r = orb ? orb.getBoundingClientRect() : null;
    return { orbVisible: !!(orb && orb.offsetParent), orbRect: r && { w: Math.round(r.width), h: Math.round(r.height), inView: r.top >= 0 && r.bottom <= innerHeight },
      openModals: document.querySelectorAll('.modal-bg.open').length,
      compOpen: !!document.querySelector('#companion-overlay.open'),
      splash: !!document.querySelector('#boot-splash'),
      heroText: (document.getElementById('home-hero')?.innerText || '').replace(/\s+/g, ' ').slice(0, 160) };
  })));
  // secondary chips on a feeling door
  await reset(page);
  await page.evaluate(() => _feelMove('restless'));
  await page.waitForTimeout(300);
  for (const [label, rx] of [['Write it down', 'Write it down'], ['Just talk', 'Just talk'], ['look up', 'look up'], ['plan for next time', 'plan for next time'], ['breath first', 'breath first']]) {
    await reset(page); await page.evaluate(() => _feelMove('restless')); await page.waitForTimeout(250);
    const r = await clickTxt(page, rx); await page.waitForTimeout(700);
    console.log('A restless →', label, r, JSON.stringify(await page.evaluate(() => __snap())).slice(0, 300));
  }
  // Release
  await reset(page);
  await page.evaluate(() => theRelease({ did: 'test' }));
  await page.waitForTimeout(500);
  console.log('A RELEASE', JSON.stringify(await page.evaluate(() => __snap())));
  await page.evaluate(() => { document.querySelector('.totry-release-ov .rel-go').click(); });
  await page.waitForTimeout(2600);
  console.log('A after put-it-down', JSON.stringify(await page.evaluate(() => ({ rel: !!document.querySelector('.totry-release-ov'), body: document.body.innerText.slice(0, 60) }))));
  await page.context().close();

  // ══ B. one vice named: the pull ══
  page = await boot(browser, { totry_guest: true, totry_onboarded: true, totry_name: 'Sam', totry_sex: 'male', totry_faith_tradition: 'secular',
    totry_v: [{ n: 'Scrolling', mode: 'quit', startDate: new Date(Date.now() - 6 * 864e5).toISOString() }] });
  await reset(page);
  await page.evaluate(() => _feelThePull());
  await page.waitForTimeout(900);
  console.log('B pull (1 vice)', JSON.stringify(await page.evaluate(() => __snap())));
  await page.context().close();

  // ══ C. letgo vice only ══
  page = await boot(browser, { totry_guest: true, totry_onboarded: true, totry_faith_tradition: 'secular',
    totry_v: [{ n: 'Her', kind: 'letgo', startDate: new Date(Date.now() - 3 * 864e5).toISOString() }] });
  await reset(page);
  await page.evaluate(() => _feelThePull());
  await page.waitForTimeout(900);
  console.log('C pull (letgo vice)', JSON.stringify(await page.evaluate(() => __snap())));
  await page.context().close();

  // ══ D. two vices ══
  page = await boot(browser, { totry_guest: true, totry_onboarded: true, totry_faith_tradition: 'secular',
    totry_v: [{ n: 'Scrolling', mode: 'quit', startDate: new Date().toISOString() }, { n: 'Vaping', mode: 'quit', startDate: new Date().toISOString() }] });
  await reset(page);
  await page.evaluate(() => _feelThePull());
  await page.waitForTimeout(700);
  console.log('D pull (2 vices)', JSON.stringify(await page.evaluate(() => __snap())));
  await page.context().close();

  // ══ E. recurrence banner: 4 restless taps in a week ══
  const feels = []; for (let i = 0; i < 4; i++) feels.push({ id: 'restless', ts: Date.now() - i * 3600000 });
  page = await boot(browser, { totry_guest: true, totry_onboarded: true, totry_faith_tradition: 'secular', totry_feelings: feels });
  await reset(page);
  await page.evaluate(() => _feelMove('restless'));
  await page.waitForTimeout(400);
  console.log('E recurrence', JSON.stringify(await page.evaluate(() => __snap())).slice(0, 500));
  await page.context().close();

  await browser.close(); server.close();
})();
