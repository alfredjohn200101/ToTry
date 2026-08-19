const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = '/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/entrypoint_snap_www';
const PORT = 8841;
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
const SEED = { totry_guest: true, totry_onboarded: true, totry_name: 'Sam', totry_sex: 'male', totry_faith_tradition: 'secular' };

const snap = () => {
  const modal = [...document.querySelectorAll('.modal-bg.open')].pop();
  const comp = document.querySelector('#companion-overlay.open');
  const tm = document.querySelector('.tm-overlay');
  const rel = document.querySelector('.totry-release-ov');
  const br = document.querySelector('.breath-overlay');
  const host = modal || tm || rel || br || comp;
  const kind = modal ? 'modal' : tm ? 'twomin' : rel ? 'RELEASE' : br ? 'breath' : comp ? 'companion' : 'NOTHING';
  const btns = host ? [...host.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean) : [];
  return { kind, text: host ? (host.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400) : '', btns };
};

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.route('**/functions/v1/**', r => r.abort());
  await page.addInitScript(s => { for (const k in s) localStorage.setItem(k, JSON.stringify(s[k])); }, SEED);
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { document.querySelectorAll('.modal-bg.open').forEach(m => m.remove()); document.querySelector('#companion-overlay')?.classList.remove('open'); });
  await page.addScriptTag({ content: 'window.__snap = ' + snap.toString() + ';' });

  const reset = () => page.evaluate(() => {
    document.querySelectorAll('.modal-bg,.tm-overlay,.totry-release-ov,.breath-overlay').forEach(m => m.remove());
    document.querySelector('#companion-overlay')?.classList.remove('open');
    document.getElementById('feel-door')?.classList.remove('open');
  });

  // ── AVOIDING path, all the way ──
  await reset();
  await page.evaluate(() => _feelMove('procrast'));
  await page.waitForTimeout(300);
  await page.evaluate(() => { [...document.querySelectorAll('.modal-bg.open button')].find(b => /Name it & start/.test(b.innerText)).click(); });
  await page.waitForTimeout(500);
  console.log('AVOIDING step2', JSON.stringify(await page.evaluate(() => __snap())));
  await page.evaluate(() => { const i = document.querySelector('.modal-bg.open input[type=text],.modal-bg.open input'); if (i) { i.value = 'the assignment'; i.dispatchEvent(new Event('input', { bubbles: true })); } });
  await page.evaluate(() => { const b = [...document.querySelectorAll('.modal-bg.open button')].find(x => /Start it small/i.test(x.innerText)); if (b) b.click(); });
  await page.waitForTimeout(700);
  console.log('AVOIDING step3', JSON.stringify(await page.evaluate(() => __snap())));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.modal-bg.open button')].find(x => /starting now/i.test(x.innerText)); if (b) b.click(); });
  await page.waitForTimeout(700);
  console.log('AVOIDING step4 (after I am starting now)', JSON.stringify(await page.evaluate(() => __snap())));

  // ── CAN'T START path, all the way ──
  await reset();
  await page.evaluate(() => openCantStart());
  await page.waitForTimeout(400);
  await page.evaluate(() => { const i = document.querySelector('.modal-bg.open input'); if (i) { i.value = 'the washing'; i.dispatchEvent(new Event('input', { bubbles: true })); } });
  await page.evaluate(() => { const b = [...document.querySelectorAll('.modal-bg.open button')].find(x => /Make it smaller/i.test(x.innerText)); if (b) b.click(); });
  await page.waitForTimeout(700);
  console.log('FROZEN step2', JSON.stringify(await page.evaluate(() => __snap())));

  // ── GOOD path → brotherGuidance ──
  await reset();
  await page.evaluate(() => brotherGuidance());
  await page.waitForTimeout(400);
  console.log('GOOD guidance', JSON.stringify(await page.evaluate(() => __snap())));

  // ── FLAT → natural highs ──
  await reset();
  await page.evaluate(() => openNaturalHighs());
  await page.waitForTimeout(400);
  console.log('NATURALHIGHS', JSON.stringify(await page.evaluate(() => __snap())));

  // ── DOWN → bridgeToRealHelp ──
  await reset();
  await page.evaluate(() => bridgeToRealHelp('heavy'));
  await page.waitForTimeout(400);
  console.log('BRIDGE', JSON.stringify(await page.evaluate(() => __snap())));

  // ── ANXIOUS → breath settle ──
  await reset();
  await page.evaluate(() => openBreath('settle', { reason: 'anxious' }));
  await page.waitForTimeout(500);
  console.log('BREATH', JSON.stringify(await page.evaluate(() => __snap())));

  // ── heartache sub-paths ──
  for (const fn of ['_letGoJournal', '_letGoAct', '_letGoName']) {
    await reset();
    await page.evaluate(f => window[f] ? window[f]() : eval(f + '()'), fn);
    await page.waitForTimeout(500);
    console.log('LETGO ' + fn, JSON.stringify(await page.evaluate(() => __snap())));
  }

  // ── first-run card layout (duplicate style attr?) ──
  await reset();
  const fr = await page.evaluate(() => {
    localStorage.removeItem('totry_firstrun_dismissed');
    localStorage.setItem('totry_start', JSON.stringify(new Date().toISOString()));
    renderFirstRun();
    const card = document.getElementById('firstrun-card');
    const rows = [...document.querySelectorAll('#firstrun-steps > div')];
    return { display: card && card.style.display, rows: rows.map(r => ({ html: r.outerHTML.slice(0, 120), disp: getComputedStyle(r).display, pad: getComputedStyle(r).paddingTop, border: getComputedStyle(r).borderBottomWidth })) };
  });
  console.log('FIRSTRUN', JSON.stringify(fr, null, 1));

  await browser.close(); server.close();
})();
