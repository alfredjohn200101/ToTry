const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = '/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/entrypoint_snap_www';
const PORT = 8867;
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
  return page;
}
const vis = () => {
  const orb = document.getElementById('need-talk-btn');
  if (!orb) return { present: false };
  const r = orb.getBoundingClientRect();
  const cs = getComputedStyle(orb);
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  return { present: true, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom),
    vh: innerHeight, display: cs.display, vis: cs.visibility, opacity: cs.opacity, z: cs.zIndex,
    hitIsOrb: !!(top && (top === orb || orb.contains(top))), hitTag: top ? (top.id || top.className || top.tagName) : null };
};

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ headless: true });

  // 1. Orb reachability across states
  for (const [label, seed] of [
    ['brand new guest', { totry_guest: true, totry_onboarded: true, totry_faith_tradition: 'secular' }],
    ['NOT onboarded (auth wall)', { totry_faith_tradition: 'secular' }],
  ]) {
    const page = await boot(browser, seed);
    console.log('ORB', label, JSON.stringify(await page.evaluate(vis)));
    console.log('   screen', JSON.stringify(await page.evaluate(() => ({
      auth: !!document.querySelector('#auth-container') && getComputedStyle(document.getElementById('auth-container')).display,
      onboard: !!document.getElementById('onboard') && getComputedStyle(document.getElementById('onboard')).display,
      firstText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 120) }))));
    await page.context().close();
  }

  // 2. restless → go('train'): what is on screen
  const page = await boot(browser, { totry_guest: true, totry_onboarded: true, totry_name: 'Sam', totry_sex: 'male', totry_faith_tradition: 'secular' });
  await page.evaluate(() => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); document.querySelector('#companion-overlay')?.classList.remove('open'); });
  await page.evaluate(() => _feelMove('restless'));
  await page.waitForTimeout(300);
  await page.evaluate(() => { [...document.querySelectorAll('.modal-bg.open button')].find(b => /Log a quick workout/.test(b.innerText)).click(); });
  await page.waitForTimeout(1200);
  console.log('RESTLESS lands on:', JSON.stringify(await page.evaluate(() => ({
    hash: location.hash, tab: [...document.querySelectorAll('.tab')].filter(t => getComputedStyle(t).display !== 'none').map(t => t.id),
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300), modals: document.querySelectorAll('.modal-bg.open').length }))));

  // 3. progressive disclosure: daysInstalled
  console.log('daysInstalled', await page.evaluate(() => typeof daysInstalled === 'function' ? daysInstalled() : 'MISSING'));
  console.log('gated hidden on day1', JSON.stringify(await page.evaluate(() => {
    go('home'); if (typeof applyHomeProgressiveDisclosure === 'function') applyHomeProgressiveDisclosure();
    return ['home-insight', 'home-readiness-card', 'home-weekly-reflection-card', 'home-quickwin-wrap', 'home-calendar-card', 'today-for-you', 'weekly-checkin', 'home-today-mission-wrap']
      .map(id => { const e = document.getElementById(id); return id + '=' + (e ? (e.style.display || 'default') : 'NOELEM'); });
  })));

  // 4. brotherSpeaks kinds
  console.log('brotherSpeaks spendHeavy', JSON.stringify(await page.evaluate(() => {
    document.querySelectorAll('.modal-bg').forEach(m => m.remove());
    localStorage.removeItem('totry_brother_last_spendHeavy');
    brotherSpeaks({ kind: 'spendHeavy' });
    const m = document.querySelector('.modal-bg.open');
    return { shown: !!m, text: m ? m.innerText.replace(/\s+/g, ' ').slice(0, 120) : '' };
  })));

  // 5. quick journal save from the door — does it end anywhere?
  await page.evaluate(() => { document.querySelectorAll('.modal-bg').forEach(m => m.remove()); openQuickJournal(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const t = document.querySelector('.modal-bg.open textarea'); if (t) { t.value = 'restless tonight'; t.dispatchEvent(new Event('input', { bubbles: true })); } });
  await page.evaluate(() => { const b = [...document.querySelectorAll('.modal-bg.open button')].find(x => /Save entry/i.test(x.innerText)); if (b) b.click(); });
  await page.waitForTimeout(900);
  console.log('journal after save', JSON.stringify(await page.evaluate(() => ({
    modals: document.querySelectorAll('.modal-bg.open').length, rel: !!document.querySelector('.totry-release-ov'),
    toast: (document.querySelector('.toast,#toast') || {}).innerText || '' }))));

  await browser.close(); server.close();
})();
