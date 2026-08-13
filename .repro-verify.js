const { chromium } = require('playwright');

const EXPIRES_OFFSET = parseInt(process.argv[2] || '-7200', 10);
const MAXT = parseInt(process.argv[3] || '70', 10);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  // Block ALL network to supabase (simulates offline for the cloud)
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.route('**://cdn.jsdelivr.net/**', r => r.abort());
  await ctx.route('**://fonts.googleapis.com/**', r => r.abort());
  await ctx.route('**://fonts.gstatic.com/**', r => r.abort());

  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text().slice(0, 200)));

  // Seed BEFORE the app script runs
  await page.addInitScript((off) => {
    const ls = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    ls('totry_onboarded', true);
    ls('totry_name', 'Alfy');
    ls('totry_identity', 'faith');
    ls('totry_start', Date.now() - 91 * 86400000);
    const exp = Math.floor(Date.now() / 1000) + off;
    // supabase-js persists the raw session object JSON under storageKey
    localStorage.setItem('totry_auth_session', JSON.stringify({
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.fake',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: exp,
      refresh_token: 'fake-refresh-token',
      user: { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'alfredjohn200101@gmail.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
    }));
  }, EXPIRES_OFFSET);

  await page.goto('http://localhost:8917/index.html', { waitUntil: 'domcontentloaded' });

  const t0 = Date.now();
  const snap = async () => page.evaluate(() => {
    const g = id => document.getElementById(id);
    const st = el => el ? (el.style.display || '(empty)') : 'MISSING';
    return {
      auth: st(g('auth-container')),
      onboardDisp: st(g('onboard')),
      onboardActive: g('onboard') ? g('onboard').classList.contains('active') : null,
      splash: !!g('boot-splash'),
      appReady: !!document.querySelector('.app.app-ready'),
      bootedLocal: (typeof _bootedLocal !== 'undefined') ? _bootedLocal : 'undef',
      sbNull: (typeof sb !== 'undefined') ? (sb === null) : 'undef',
      user: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.email : null,
      head: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 130)
    };
  });

  const marks = [3, 8, 15, 25, 35, 45, 60, 70].filter(s => s <= MAXT);
  for (const s of marks) {
    while ((Date.now() - t0) / 1000 < s) await page.waitForTimeout(300);
    const r = await snap();
    console.log('t=' + ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(r));
  }
  console.log('--- console ---');
  console.log(logs.filter(l => /boot|Auth|error|supabase/i.test(l)).slice(0, 25).join('\n'));
  await browser.close();
})();
