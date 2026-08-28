// ── SUB-PANEL WALK ───────────────────────────────────────────────────────────────────────────────
// Walks EVERY sub-panel in the app as a new user and an established one, and asserts what a person
// actually sees: no page errors, no literal NaN/undefined, and no panel that renders nothing.
//
// WHY THIS EXISTS, specifically. core.test.js asserts source patterns and personas.js walks the five
// TOP-LEVEL tabs. Neither opens a sub-panel. In v461 a dead-code removal left a `const` deleted and
// the line that used it behind: core.test.js stayed green at 732 while every tap on the Fight tab
// threw ReferenceError. This walk caught it on the first run. It also caught a defect in v459's own
// new feature — imported Hevy/Strava sessions rendering "undefined — Day undefined", because only the
// in-app logger writes date/day/completedSets and imported rows are the ones most people have.
//
// Run with `npm run panels`. Exits non-zero on any finding, so it can gate a commit.
const http=require('http'), fs=require('fs'), path=require('path');
const { chromium } = require('playwright');
const ROOT=path.join(__dirname,'..','www'); const PORT=8802;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{
  const s=http.createServer((rq,rs)=>{
    const clean=decodeURIComponent(rq.url.split('?')[0]);
    let f=path.join(ROOT, clean==='/'?'index.html':clean);
    if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()) f=path.join(ROOT,'index.html');
    rs.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(f).pipe(rs);
  }); s.listen(PORT,'127.0.0.1',()=>res(s));
});

const NEW  = { totry_guest:true, totry_onboarded:true, totry_faith_tradition:'secular' };
const ESTAB= { totry_guest:true, totry_onboarded:true, totry_name:'Alfy', totry_faith_tradition:'christianity',
  totry_sex:'male',
  totry_v:[{n:'Scrolling',startDate:new Date(Date.now()-9*864e5).toISOString(),mode:'quit',total:3}],
  totry_workouts:[{id:1,date:'14 Aug 2026',day:2,splitFocus:'Push',durationMin:52,
    exercises:[{name:'Bench Press',sets:[{weight:80,reps:8,done:true,rpe:8}]}]}],
  totry_h:[{n:'Read',d:new Array(30).fill(0).map((_,i)=>i%2)}],
  totry_body:[{w:82,d:new Date().toISOString()}],
};

const AWKWARD = { totry_guest:true, totry_onboarded:true, totry_name:"Aisha O'Brien",
  totry_sex:'female', totry_faith_tradition:'islam', totry_currency:'GBP', totry_nut_gentle:true,
  totry_v:[{n:"Mum's wine o'clock", mode:'moderate', modLimit:4, modThreshold:2,
    startDate:new Date(Date.now()-9*864e5).toISOString(), lastLoss:new Date(Date.now()-30*864e5).toISOString(), total:3}],
  totry_f:{d:[{n:"Dad's loan",t:4000,p:1200,r:0},{n:'Card',t:3000,p:900,r:19.9}],u:0,i:0},
  // Written the way the demo seeder writes them — no `date`, no `category` — which is how the
  // "undefined · undefined" in the Money tab reached the screenshots.
  totry_transactions:[{id:1,type:'expense',amount:42.5,note:"Domino's",ts:new Date().toISOString()}],
  totry_finance_goals:[{id:1,name:'Old goal',target:500,current:500},{id:2,name:"Aisha's fund",target:2000,current:100}],
  totry_body:[{w:64,ts:new Date().toISOString(),date:'18 Aug'}],
  totry_workouts:[{id:1,date:'14 Aug 2026',day:2,splitFocus:'Push',durationMin:52,
    exercises:[{name:'5" deficit deadlift',sets:[{weight:80,reps:8,done:true,rpe:8}]}]}],
};

(async()=>{
  const server=await serve();
  const browser=await chromium.launch({headless:true});
  const findings=[];
  // A THIRD PERSON, WHOSE DATA IS THE KIND THAT ACTUALLY BREAKS THINGS. The two above hold plausible
  // data and have missed every input-shaped defect of the last three sweeps: apostrophes killing
  // onclick handlers, a non-dollar currency, a completed goal ahead of the live one, two debts paid
  // on the same day, rows written by a different writer with a different shape. Walking every
  // sub-panel with that data is cheap and it is where those bugs live.
  for(const [label,seed] of [['new user',NEW],['established',ESTAB],['awkward data',AWKWARD]]){
    const ctx=await browser.newContext({viewport:{width:414,height:896}});
    const page=await ctx.newPage();
    const errors=[]; page.on('pageerror',e=>errors.push(String(e.message).slice(0,150)));
    await page.addInitScript(s=>{ for(const [k,v] of Object.entries(s)) localStorage.setItem(k,JSON.stringify(v)); }, seed);
    await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(2800);

    const res=await page.evaluate(async()=>{
      const out=[];
      const wait=ms=>new Promise(r=>setTimeout(r,ms));
      const panels=[
        ['home',null,null,'tab-home'],
        ['fight','setFightTab','vices','fight-panel-vices'],
        ['fight','setFightTab','score','fight-panel-score'],
        ['grow','setPTTab','log','pt-panel-log'],
        ['grow','setPTTab','routines','pt-panel-routines'],
        ['grow','setPTTab','history','pt-panel-history'],
        ['grow','setPTTab','mobility','pt-panel-mobility'],
        ['grow','setPTTab','ptcoach','pt-panel-ptcoach'],
        ['soul','setBibleTab','find','bible-find-panel'],
        ['soul','setBibleTab','read','bible-read-panel'],
        ['soul','setBibleTab','saved','bible-saved-panel'],
        ['soul','setBibleTab','prayer','bible-prayer-panel'],
        ['soul','setBibleTab','sacraments','bible-sacraments-panel'],
        ['money',null,null,'tab-money'],
        ['nourish',null,null,'tab-nourish'],
        ['reflect','setReflectTab','evening','reflect-panel-evening'],
        ['reflect','setReflectTab','journal','reflect-panel-journal'],
        ['reflect','setReflectTab','goals','reflect-panel-goals'],
        ['reflect','setReflectTab','review','reflect-panel-review'],
      ];
      for(const [tab,fn,arg,pid] of panels){
        try{ if(typeof go==='function') go(tab); }catch(e){}
        await wait(240);
        if(fn && typeof window[fn]==='function'){ try{ window[fn](arg); }catch(e){ out.push({pid,err:'switcher threw: '+e.message}); } }
        await wait(340);
        const el=document.getElementById(pid);
        if(!el){ out.push({pid,missing:true}); continue; }
        const vis=getComputedStyle(el).display!=='none';
        const txt=(el.innerText||'').trim();
        out.push({ pid, visible:vis, chars:txt.length,
          bad:['NaN','undefined','[object Object]','Infinity'].filter(b=>txt.includes(b)),
          head:txt.slice(0,60).replace(/\n/g,' ') });
      }
      return out;
    });
    for(const r of res){
      if(r.missing) findings.push(`${label}: #${r.pid} does not exist`);
      else if(r.err) findings.push(`${label}: #${r.pid} ${r.err}`);
      else if(!r.visible) findings.push(`${label}: #${r.pid} did not become visible`);
      else if(r.chars<25) findings.push(`${label}: #${r.pid} renders almost nothing (${r.chars} chars) "${r.head}"`);
      else if(r.bad.length) findings.push(`${label}: #${r.pid} shows ${r.bad.join(',')} — "${r.head}"`);
    }
    if(errors.length) findings.push(`${label}: PAGE ERRORS → ${[...new Set(errors)].slice(0,4).join(' | ')}`);
    console.log(`${label}: walked ${res.length} panels`);
    await ctx.close();
  }
  // ── EVERY TRADITION'S READER ────────────────────────────────────────────────────────────────────
  // Four live text sources were added in v467/v468 (Dhammapada via SuttaCentral, Meditations via
  // Wikisource, joining the Qur'an and the Gita) and had no automated coverage at all. Each must render
  // something substantial for its own tradition, and — critically — must never render another
  // tradition's scripture, which is this app's most repeated bug class.
  // Asserts SUBSTANCE, not live text: if the network is unavailable each reader falls back to its
  // bundled VS_* pool, and that is a pass. An empty reader is not.
  // Christianity is deliberately NOT in this loop: it has its own reader (#br-* in bible-read-panel,
  // walked above), and both real callers of openReader() route it there first — openScripture() and
  // _planOpenFull() each do `if(t==='christianity'){ go('bible'); return; }`. Calling openReader
  // ('christianity') directly falls to the else branch and serves Marcus Aurelius, which no user path
  // reaches but is a latent trap worth hardening at the function rather than in its callers.
  for (const trad of ['islam', 'hinduism', 'buddhism', 'secular']) {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message).slice(0, 140)));
    await page.addInitScript(t => {
      const seed = { totry_guest: true, totry_onboarded: true, totry_name: 'Sam', totry_faith_tradition: t };
      for (const k in seed) localStorage.setItem(k, JSON.stringify(seed[k]));
    }, trad);
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2800);
    const r = await page.evaluate(async (t) => {
      if (typeof openReader !== 'function') return { missing: true };
      openReader(t);
      await new Promise(res => setTimeout(res, 7000));   // live fetch, then fallback
      const el = document.getElementById('read-content');
      const txt = el ? (el.innerText || '').trim() : '';
      return { chars: txt.length, text: txt.slice(0, 4000) };
    }, trad);
    if (r.missing) { findings.push(`${trad} reader: openReader() does not exist`); }
    else {
      if (r.chars < 400) findings.push(`${trad} reader renders almost nothing (${r.chars} chars)`);
      {
        for (const word of ['Jesus', 'Christ', 'Bible', 'Psalm', 'Amen', 'Rosary', 'Eucharist']) {
          if (new RegExp('\\b' + word, 'i').test(r.text || '')) {
            findings.push(`${trad} reader shows Christian vocabulary: "${word}"`);
          }
        }
      }
    }
    if (errors.length) findings.push(`${trad} reader: PAGE ERROR ${[...new Set(errors)][0]}`);
    console.log(`${trad} reader: ${r.missing ? 'MISSING' : r.chars + ' chars'}`);
    await ctx.close();
  }

  // ── TAP TARGET FLOOR ────────────────────────────────────────────────────────────────────────────
  // Not "everything is 44pt" — that is a design decision the app has deliberately not taken for its
  // bordered pills, and ten .ci-dot buttons cannot each be 44 WIDE inside a 414px screen, which is
  // geometry rather than a bug. What IS enforced: nothing a person must hit is under 24pt in its
  // smallest dimension. Six controls were, including a 9x16 dismiss and a 30x12 "View" link.
  {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      // This person owned one bill and one vice, so almost every LIST in the app was empty — and the
      // controls that live on list rows are exactly the ones that were too small. The gate walked nine
      // tabs and reported zero, while the edit and delete on every logged food measured 19x17 and
      // 17x18, and the Edit on a debt row 31x16. A tap-target gate driven by someone with nothing
      // logged is measuring the empty states. Give it rows.
      const N = Date.now(), AU = d => new Date(d).toLocaleDateString('en-AU');
      const meal = (n, c, pr, t, ml) => ({ id: Math.floor(Math.random()*1e9), name: n, brand: '',
        serving: '1 serving', qty: 1, cal: c, pro: pr, carb: 40, fat: 12, ts: new Date(t).toISOString(), meal: ml });
      const nutlog = {};
      for (let i = 0; i < 6; i++) { const d = N - i * 864e5;
        nutlog[AU(d)] = [meal('Oats, banana, whey', 520, 38, d, 'breakfast'),
                         meal('Chicken and rice', 690, 55, d, 'lunch'),
                         meal('Greek yoghurt', 210, 20, d, 'dinner')]; }
      const seed = { totry_guest: true, totry_onboarded: true, totry_name: 'Alfy',
                     totry_faith_tradition: 'christianity', totry_sex: 'male',
                     totry_bills: [{ id: 2, name: 'Rent', amount: 420, due: '2026-09-01' }],
                     totry_v: [{ n: 'Scrolling', startDate: new Date(Date.now() - 9 * 864e5).toISOString(), mode: 'quit' }],
                     totry_nutlog: nutlog,
                     totry_body: Array.from({ length: 6 }, (_, i) => ({ w: 78.4 + i * 0.2, ts: new Date(N - i * 864e5).toISOString() })),
                     totry_workouts: Array.from({ length: 4 }, (_, i) => ({ title: 'Push day', vol: 4200, ts: new Date(N - i * 864e5).toISOString() })),
                     totry_journal: Array.from({ length: 3 }, (_, i) => ({ text: 'A thought', ts: new Date(N - i * 864e5).toISOString() })),
                     totry_f: { d: [{ n: 'Car loan', t: 12000, p: 3600, r: 7.2 }], u: 5000, i: 0 },
                     totry_transactions: Array.from({ length: 8 }, (_, i) => ({ id: i, amount: -42.5, desc: 'Coles', cat: 'food', ts: new Date(N - i * 864e5).toISOString() })),
                     totry_subscriptions: [{ n: 'Netflix', amt: 18, cycle: 'monthly' }],
                     totry_mornings: Array.from({ length: 5 }, (_, i) => ({ ts: new Date(N - i * 864e5).toISOString() })),
                     totry_evenings: Array.from({ length: 5 }, (_, i) => ({ ts: new Date(N - i * 864e5).toISOString() })) };
      for (const k in seed) localStorage.setItem(k, JSON.stringify(seed[k]));
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const tiny = await page.evaluate(async () => {
      const out = [];
      for (const t of ['home', 'fight', 'grow', 'money', 'soul', 'nourish', 'reflect', 'track', 'morning']) {
        try { go(t); } catch (e) { continue; }
        await new Promise(r => setTimeout(r, 320));
        const pane = document.getElementById('tab-' + t);
        if (!pane || getComputedStyle(pane).display === 'none') continue;
        pane.querySelectorAll('button,a[href],[onclick]').forEach(el => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          const r = el.getBoundingClientRect();
          if (!r.width && !r.height) return;
          const m = Math.min(r.width, r.height);
          if (m < 24) out.push(`${t} ${r.width.toFixed(0)}x${r.height.toFixed(0)} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 24)}"`);
        });
      }
      return out;
    });
    tiny.forEach(x => findings.push(`tap target under 24pt: ${x}`));
    console.log(`tap targets under 24pt: ${tiny.length}`);

    // ── a sheet must announce itself and hold the keyboard ────────────────────────────────────
    // 171 of this app's 174 bottom-sheets had no dialog role, no name and no focus trap: to a screen
    // reader they appeared as an unnamed pile of divs, and Tab walked straight out of the sheet into
    // the page behind it — which is still there and still clickable underneath. One observer now
    // dresses every sheet on insertion. This drives it rather than grepping for it, because an
    // observer that is never wired up greps exactly the same as one that is.
    const a11y = await page.evaluate(async () => {
      const out = [];
      const before = document.createElement('button');
      before.id = '__a11y_prev'; before.textContent = 'before';
      document.body.appendChild(before); before.focus();

      const m = document.createElement('div');
      m.className = 'modal-bg open';
      m.innerHTML = '<div class="modal"><h3>Which one is pulling?</h3>' +
                    '<button id="__a1">A</button><button id="__a2">B</button></div>';
      document.body.appendChild(m);
      await new Promise(r => setTimeout(r, 80));

      if (m.getAttribute('role') !== 'dialog') out.push('a new sheet got no dialog role');
      if (m.getAttribute('aria-modal') !== 'true') out.push('a new sheet got no aria-modal');
      if (!/pulling/.test(m.getAttribute('aria-label') || '')) out.push('a new sheet was not named from its own heading');
      if (!m.contains(document.activeElement)) out.push('focus never entered the sheet');
      if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) out.push('focus landed in a field — that pops the iOS keyboard');

      m.remove();
      await new Promise(r => setTimeout(r, 80));
      if (document.activeElement.id !== '__a11y_prev') out.push('focus was not returned to where the person was');
      before.remove();

      for (const id of ['payday-modal', 'journal-modal', 'serving-modal']) {
        const el = document.getElementById(id);
        if (el && el.getAttribute('role') !== 'dialog') out.push(`static sheet #${id} got no dialog role`);
      }
      return out;
    });
    // Tab is a real key press, so it has to happen outside the page context.
    await page.evaluate(() => {
      const m = document.createElement('div');
      m.className = 'modal-bg open';
      m.innerHTML = '<div class="modal"><h3>Trap</h3><button id="__t1">A</button><button id="__t2">B</button></div>';
      document.body.appendChild(m);
      return new Promise(r => setTimeout(r, 80));
    });
    await page.evaluate(() => document.getElementById('__t2').focus());
    await page.keyboard.press('Tab');
    const landed = await page.evaluate(() => document.activeElement.id);
    if (landed !== '__t1') a11y.push(`Tab escaped the sheet onto "${landed}" — the page behind is reachable`);
    await page.evaluate(() => document.querySelector('.modal-bg.open:not([id])')?.remove());

    a11y.forEach(x => findings.push(`sheet a11y: ${x}`));
    console.log(`sheet a11y: ${a11y.length ? a11y.length + ' problems' : 'dialog role, name, focus in/out, Tab trapped'}`);
    await ctx.close();
  }

  // ── the live SOS: the setting shapes the move, and their own words actually appear ──────────
  // Two bugs of the same family. The app asked where the person was and then discarded the answer, so
  // someone in bed at 2am was told to drop and do pushups and 'If safe, pull over' was unreachable for
  // anyone with a plan for their vice. And step 3 wrote 'why you started this' into an element that
  // lives in step 0's container, which is display:none while step 3 is showing — so the most personal
  // line in the SOS was in the document and never once on the screen. Geometry, not presence.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam');
      s('totry_why','I want to be the man my daughter thinks I am.');
      s('totry_v',[{ n:'Porn', kind:'porn', mode:'quit', startDate:'2026-06-01T00:00:00.000Z',
                     plan:{ why:'my marriage', firstMove:'Put the phone in another room.',
                            actions:['Cold water on your face and wrists.'] } }]);
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2600);
    const sos = await page.evaluate(async () => {
      // the guest flow auto-opens the companion over everything; the crisis suite strips it for the
      // same reason — otherwise this measures the overlay, not the SOS.
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      const out = { moves:{}, why:null };
      for (const loc of ['bed','car']) {
        startLiveIntervention(0);
        await new Promise(x=>setTimeout(x,180));
        setLocation(loc);
        await new Promise(x=>setTimeout(x,180));
        out.moves[loc] = (document.getElementById('sos-action-text')||{}).textContent || '';
      }
      goSosP3();
      await new Promise(x=>setTimeout(x,300));
      const el = document.getElementById('sos-p3-why');
      if (el) {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
        out.why = { onScreen: r.width>0 && r.height>0 && r.top>=0 && r.top<innerHeight,
                    hit: !!(top && el.contains(top)),
                    mine: /daughter/.test(el.innerText||'') };
      }
      return out;
    });
    // the two settings whose own first move is the only one that can physically be done
    if (!/lights ON/i.test(sos.moves.bed || ''))
      findings.push(`SOS in bed leads with "${(sos.moves.bed||'(nothing)').slice(0,60)}" instead of the setting's own move`);
    if (!/pull over/i.test(sos.moves.car || ''))
      findings.push(`SOS in the car never says "pull over" — it says "${(sos.moves.car||'(nothing)').slice(0,60)}"`);
    if (!sos.why) findings.push('SOS step 3 has no container for the person\'s own why');
    else if (!sos.why.onScreen || !sos.why.hit)
      findings.push(`SOS step 3: their own why is in the document but not on the screen — ${JSON.stringify(sos.why)}`);
    else if (!sos.why.mine) findings.push('SOS step 3 shows a why, but not the one they wrote');
    else console.log('SOS: setting shapes the move, and their own why is on screen at step 3');
    await ctx.close();
  }

  // ── what the FIXES broke, and the halves they missed ───────────────────────────────────────
  // A second adversarial review, this time of v542/v543 themselves. Every item below is a fix that
  // caused new harm or only covered the case that was reported. Fixes are where bugs come from.
  {
    // 1. The dismiss-drag. v543 gave .comp-phase min-height:0 so the conversation scrolls — correct,
    //    but the swipe-to-dismiss guard was only `if(sheet.scrollTop > 4) return;`, which had worked
    //    by accident while the SHEET owned the scrollbar. With the sheet pinned at scrollTop 0
    //    forever, every touch armed a dismiss: swiping down to re-read what the companion just said
    //    closed it, mid-craving. The handle must dismiss; the conversation must scroll.
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 }, hasTouch:true, isMobile:true });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2600);
    const prep = async () => page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      openCompanion(); await new Promise(x=>setTimeout(x,600));
      const conv = document.getElementById('comp-conversation');
      if(!conv) return null;
      const ph = conv.closest('.comp-phase');
      if(ph && typeof _compPhase === 'function') _compPhase(ph.id);
      await new Promise(x=>setTimeout(x,300));
      conv.innerHTML = '';
      for(let i=0;i<12;i++){ const d=document.createElement('div');
        d.style.cssText='padding:14px;margin:6px 0'; d.textContent='message '+i; conv.appendChild(d); }
      await new Promise(x=>setTimeout(x,250));
      const sheet = document.getElementById('companion-overlay');
      return { sheetTop: Math.round(sheet.getBoundingClientRect().top),
               convTop: Math.round(conv.getBoundingClientRect().top) };
    });
    const swipeFrom = async (y) => {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{x:207,y}] });
      for(let dy=20; dy<=150; dy+=30)
        await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{x:207,y:y+dy}] });
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
      await page.waitForTimeout(500);
      await cdp.detach();
      return page.evaluate(() => { const s=document.getElementById('companion-overlay');
        return s.classList.contains('open') && getComputedStyle(s).display !== 'none'; });
    };
    const geo = await prep();
    if (!geo) findings.push('companion: no #comp-conversation to test the dismiss guard against');
    else {
      const afterConv = await swipeFrom(geo.convTop + 120);
      if (!afterConv) findings.push('companion: swiping down inside the conversation DISMISSES it — that is the gesture for scrolling back to re-read, and it closes the sheet mid-craving');
      await prep();
      const afterHandle = await swipeFrom(geo.sheetTop + 20);
      if (afterHandle) findings.push('companion: swiping down from the grab handle no longer dismisses — the gesture is gone entirely');
      if (afterConv && !afterHandle) console.log('companion: the handle dismisses, the conversation scrolls');
    }
    await ctx.close();
  }

  {
    // 2. The rest, in one person: an apostrophe in the vice name (double-escaped), a moderated vice
    //    with a purchase cost model (paid out anyway), and weigh-ins three months apart ("over the
    //    week"). The persona carries an apostrophe on purpose — this repo has been burned by one
    //    before, and the earlier test used "Porn", which has nothing to escape.
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      const d=i=>new Date(Date.now()-i*864e5).toISOString();
      s('totry_onboarded',true); s('totry_name','Sam');
      s('totry_v',[{ n:"Mum's wine", mode:'quit', startDate:d(40) },
                   { n:'Weed', mode:'moderate', startDate:d(2), costAmount:200, costPer:'purchase', lastsDays:30, lastPurchase:d(90) }]);
      s('totry_vice_uses',[{ v:"Mum's wine", ts:d(80) },{ v:"Mum's wine", ts:d(59) },{ v:"Mum's wine", ts:d(40) }]);
      s('totry_fight_log',[{ vice:"Mum's wine", won:true, ts:d(1) }]);
      s('totry_body',[{ date:d(96).slice(0,10), weight:89.4, ts:d(96) },{ date:d(0).slice(0,10), weight:82.4, ts:d(0) }]);
      s('totry_workouts',[{ id:1, ts:d(0), date:d(0).slice(0,10), title:'Push', volume:8000, sets:16, calories:400 }]);
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const r = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('fight'); await new Promise(x=>setTimeout(x,900));
      const fight = (document.getElementById('fight-evidence').innerText||'').replace(/\s+/g,' ').trim();
      go('grow'); await new Promise(x=>setTimeout(x,900));
      const track = (document.getElementById('hand-track').textContent||'').trim();
      return { fight, track, reclaimed: (typeof totalReclaimed==='function') ? totalReclaimed() : null };
    });
    if (/&#\d+;|&amp;|&quot;|&lt;/.test(r.fight))
      findings.push(`escaping: the vice name is encoded twice — the person reads "${r.fight.slice(0,58)}"`);
    if (r.reclaimed > 0)
      findings.push(`reclaimed: ${r.reclaimed} credited while the only vice with a cost model is one they are MODERATING, not stopping`);
    if (/over the week/i.test(r.track))
      findings.push(`span: weigh-ins three months apart reported as "over the week" — "${r.track.slice(0,58)}"`);
    if (!findings.some(f => f.startsWith('escaping') || f.startsWith('reclaimed') || f.startsWith('span')))
      console.log("fixes: an apostrophe survives, a moderated vice earns nothing, and a 96-day span is not \u201cthe week\u201d");
    await ctx.close();
  }

  {
    // 3. The EVENING half of the stepper restore. v542 fixed both panels and asserted only the
    //    morning — the review's own finding. Same trap: finish it, come back, and the panel is
    //    stepped with the stepper hidden and everything written unreachable.
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam');
      s('totry_start', new Date(Date.now()-40*864e5).toISOString());
      s('totry_examens',[{ ts:new Date().toISOString() }]); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const r = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('reflect'); await new Promise(x=>setTimeout(x,1100));
      eveningStep(1); await new Promise(x=>setTimeout(x,200));
      const w = document.getElementById('evening-win');
      if(w){ w.value='I held the line and called my brother'; w.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof completeEvening === 'function') await completeEvening();
      await new Promise(x=>setTimeout(x,900));
      document.querySelectorAll('.modal-bg.open:not([id])').forEach(e=>e.remove());
      go('home');    await new Promise(x=>setTimeout(x,600));
      go('reflect'); await new Promise(x=>setTimeout(x,1200));
      const panel = document.getElementById('reflect-panel-evening');
      const h = el => el ? Math.round(el.getBoundingClientRect().height) : 0;
      eveningStep(1); await new Promise(x=>setTimeout(x,250));
      const win = document.getElementById('evening-win');
      return { stepped: panel.classList.contains('stepped'),
               nav: h(panel.querySelector('.mstep-nav')),
               winReachable: !!(win && win.getBoundingClientRect().height > 0),
               winValue: win ? win.value : '' };
    });
    if (r.stepped && r.nav === 0)
      findings.push('evening: coming back after completing it leaves the panel stepped with the stepper HIDDEN — what they wrote is saved and unreachable');
    else if (!r.winReachable)
      findings.push('evening: on a second visit their own win field cannot be reached');
    else console.log(`evening: a finished ritual re-opens usable — stepper back (${r.nav}px), "${r.winValue.slice(0,26)}" still editable`);
    await ctx.close();
  }

  // ── the companion's newest words must be on the screen ─────────────────────────────────────
  // Pre-existing, and the highest-stakes of the lot. .comp-conversation has flex:1 + overflow-y:auto,
  // but its parent .comp-phase defaulted to min-height:auto, which refuses to shrink below its
  // content — so the conversation never became a scroll container (scrollHeight === clientHeight)
  // and `conv.scrollTop = conv.scrollHeight` in 08-voice.js did nothing on every single reply. The
  // newest thing the companion said sat below the fold, on the surface a person opens mid-craving,
  // with no code able to reach it. One CSS declaration, and it must never be tidied away.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2600);
    const r = await page.evaluate(async () => {
      openCompanion();
      await new Promise(x=>setTimeout(x,600));
      const conv = document.getElementById('comp-conversation');
      if(!conv) return null;
      const phase = conv.closest('.comp-phase');
      if(phase && typeof _compPhase === 'function') _compPhase(phase.id);
      await new Promise(x=>setTimeout(x,400));
      for(let i=0;i<12;i++){
        const d = document.createElement('div');
        d.style.cssText = 'padding:14px;margin:6px 0';
        d.textContent = 'message ' + i;
        conv.appendChild(d);
      }
      await new Promise(x=>setTimeout(x,300));
      conv.scrollTop = conv.scrollHeight;              // exactly what 08-voice.js does
      await new Promise(x=>setTimeout(x,250));
      const last = conv.lastElementChild.getBoundingClientRect();
      return { isScroller: conv.scrollHeight > conv.clientHeight + 2,
               scrolled: Math.round(conv.scrollTop),
               newestOnScreen: last.top < window.innerHeight && last.bottom > 0 };
    });
    if (!r) findings.push('companion: #comp-conversation is not in the markup');
    else if (!r.isScroller)
      findings.push('companion: the conversation is not a scroll container — scrollHeight equals clientHeight, so scrollTop does nothing and every reply lands below the fold');
    else if (!r.newestOnScreen)
      findings.push(`companion: after scrolling to the bottom (scrollTop ${r.scrolled}) the newest message is still off screen`);
    else console.log(`companion: the conversation scrolls, and the newest message is on screen (scrollTop ${r.scrolled})`);
    await ctx.close();
  }

  // ── a tradition's own words, with its own source ───────────────────────────────────────────
  // The SOS cites the passage it shows; the still centre printed the identical line anonymously,
  // which reads as the app's own aphorism rather than as scripture — the wrong way round for the one
  // screen whose point is that it points beyond itself. And a secular person still gets neither.
  {
    for (const [tr, wantRef] of [['islam', true], ['secular', false]]) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(t => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        s('totry_onboarded',true); s('totry_name','Sam'); s('totry_faith_tradition',t); }, tr);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2600);
      const txt = await page.evaluate(async () => {
        document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
        go('soul'); await new Promise(x=>setTimeout(x,900));
        return (document.getElementById('soul-still').innerText||'').replace(/\s+/g,' ').trim();
      });
      // a citation looks like "Qur'an 33:3" / "Isaiah 26:3" / "Dhammapada 8:103" — a source and a number
      const hasRef = /[A-Za-z\u2019']{3,}\s+\d+([:.]\d+)?/.test(txt.replace(/A WORD FOR TODAY/i,''));
      if (wantRef && !hasRef) findings.push(`citation (${tr}): scripture shown with no source — "${txt.slice(0,60)}"`);
      if (!wantRef && /A WORD FOR TODAY/i.test(txt)) findings.push('citation (secular): handed scripture unasked');
      await ctx.close();
    }
    if (!findings.some(f => f.startsWith('citation'))) console.log("citation: a tradition's word carries its source, and a secular person gets neither");
  }

  // ── the new lines must not state things that are not true ──────────────────────────────────
  // An adversarial review of v533-v541 found four ways the lines I added told a person something
  // false. They are grouped here because they share one failure: a number that is easy to compute
  // and wrong, on a screen whose only job is to be believed.
  {
    const cases = [
      { label:'one urge, recorded in BOTH stores',
        // every win path writes totry_moments_won AND totry_fight_log; adding them double-counted
        seed:{ v:[{n:'Porn',mode:'quit',days:13}], fightLog:[{d:1,won:true}], momentsWon:[1] },
        tab:'fight', el:'fight-evidence', want:/1 URGE MET/i, wantNot:/^2 URGES/i },
      { label:'sparse log cannot know a record',
        // two slips three days apart, then 200 clean — it used to congratulate them on beating 3 days
        seed:{ v:[{n:'Porn',mode:'quit',days:200}], uses:[203,200] },
        tab:'fight', el:'fight-evidence', wantNot:/LONGEST RUN/i },
      { label:'a real record, named',
        seed:{ v:[{n:'Porn',mode:'quit',days:40}], uses:[80,59,40] },
        tab:'fight', el:'fight-evidence', // The line used to read "your longest run yet — past 21 days", which sat 120px above a card
        // saying "40 days clean": two numbers for one fight, apparently disagreeing. It now names both
        // and says which is which.
        want:/PORN: 40 DAYS .* YOUR LONGEST YET, PAST YOUR OLD BEST OF 21/i },
      { label:'two weigh-ins hours apart is not a week',
        seed:{ body:[{h:0,w:82.4},{h:6,w:82.0}], workout:true },
        tab:'grow', el:'hand-track', wantNot:/over the week/i },
    ];
    for (const c of cases) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(c => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        const d=i=>new Date(Date.now()-i*864e5).toISOString();
        const hAgo=h=>new Date(Date.now()-h*3600e3).toISOString();
        s('totry_onboarded',true); s('totry_name','Sam');
        if(c.v) s('totry_v', c.v.map(x=>({ n:x.n, mode:x.mode, startDate:d(x.days) })));
        if(c.uses) s('totry_vice_uses', c.uses.map(n=>({ v:'Porn', ts:d(n) })));
        if(c.fightLog) s('totry_fight_log', c.fightLog.map(x=>({ vice:'Porn', won:x.won, ts:d(x.d) })));
        if(c.momentsWon) s('totry_moments_won', c.momentsWon.map(n=>({ v:'Porn', ts:d(n), kind:'behaviour' })));
        if(c.workout) s('totry_workouts',[{ id:1, ts:hAgo(20), date:hAgo(20).slice(0,10), title:'Push', volume:8000, sets:16, calories:400 }]);
        if(c.body) s('totry_body', c.body.map(x=>({ date:hAgo(x.h).slice(0,10), weight:x.w, ts:hAgo(x.h) })));
      }, c.seed);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2600);
      const txt = await page.evaluate(async (c) => {
        document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
        go(c.tab);
        await new Promise(x=>setTimeout(x,900));
        const el = document.getElementById(c.el);
        if(!el) return null;
        const on = (el.classList.contains('on') || getComputedStyle(el).display !== 'none') && el.getBoundingClientRect().height > 0;
        return on ? (el.textContent||'').replace(/\s+/g,' ').trim() : '';
      }, { tab:c.tab, el:c.el });
      if (txt === null) findings.push(`honesty (${c.label}): #${c.el} is not in the markup`);
      else if (c.want && !c.want.test(txt)) findings.push(`honesty (${c.label}): expected ${c.want} — got "${txt.slice(0,60)}"`);
      else if (c.wantNot && c.wantNot.test(txt)) findings.push(`honesty (${c.label}): says "${txt.slice(0,64)}" — that is not true`);
      await ctx.close();
    }

    // and the still centre must not ask a calm person how bad their craving is
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); s('totry_faith_tradition','christianity'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2600);
    const still = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('soul'); await new Promise(x=>setTimeout(x,900));
      soulBeStill(); await new Promise(x=>setTimeout(x,900));
      const ov = document.querySelector('.breath-overlay');
      const vis = el => !!(el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0);
      return { asksDistress: vis(ov && ov.querySelector('.b-pre')), breathing: vis(ov && ov.querySelector('.b-run')) };
    });
    if (still.asksDistress)
      findings.push('honesty (still centre): "be still for a minute" asks how strong the urge is — the contemplative path is running the craving protocol');
    else if (!still.breathing)
      findings.push('honesty (still centre): "be still for a minute" does not start the breathing');
    await ctx.close();

    if (!findings.some(f => f.startsWith('honesty'))) console.log('honesty: the new lines count once, claim a record only when one is knowable, name the real span, and stillness just breathes');
  }

  // ── coming BACK to a finished ritual must not lock it ──────────────────────────────────────
  // The worst bug the v533-v541 work introduced, and it was mine. morningFinished()/eveningFinished()
  // hide the stepper with an INLINE display:none and drop `stepped`. The render function re-adds
  // `stepped` but only BUILDS the nav/foot when they are absent — they already exist, so the inline
  // display:none survived. Second visit: stepped again, stepper invisible, steps 1..N hidden with
  // !important. One control left on the whole screen ("Back to home →"), and everything the person
  // wrote unreachable — against initMorningTab's own promise that it stays editable until midnight.
  //
  // It did not even need completing in-session: initMorningTab() calls morningFinished() whenever
  // today's morning is already logged. Do your morning at 7am, come back at noon, locked page.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam');
      s('totry_start', new Date(Date.now()-40*864e5).toISOString());
      // today's morning ALREADY done — the path that needs no completion in this session
      s('totry_mornings',[{ ts:new Date().toISOString(), day:41, gratitude:'my sister called', intention:'be present' }]);
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const r = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      const look = () => {
        const pane = document.getElementById('tab-morning');
        const h = el => el ? Math.round(el.getBoundingClientRect().height) : 0;
        return { stepped: pane.classList.contains('stepped'),
                 nav: h(pane.querySelector('.mstep-nav')), foot: h(pane.querySelector('.mstep-foot')),
                 controls: [...pane.querySelectorAll('button,input,textarea,[onclick]')].filter(e => {
                   const c = getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden') return false;
                   const q = e.getBoundingClientRect(); return q.width>0 && q.height>0; }).length };
      };
      go('morning'); await new Promise(x=>setTimeout(x,1100));
      const first = look();
      go('home');    await new Promise(x=>setTimeout(x,600));
      go('morning'); await new Promise(x=>setTimeout(x,1200));
      const second = look();
      // and the words must still be reachable by walking to their step
      morningStep(3); await new Promise(x=>setTimeout(x,250));
      const g = document.getElementById('morning-gratitude');
      return { first, second, gratitudeReachable: !!(g && g.getBoundingClientRect().height > 0) };
    });
    if (r.second.stepped && r.second.nav === 0)
      findings.push(`morning: coming back to a finished ritual leaves it stepped with the stepper HIDDEN — ${r.second.controls} control(s) on the whole screen and no way to advance`);
    else if (!r.gratitudeReachable)
      findings.push('morning: on a second visit their own gratitude field cannot be reached, though the app promises it stays editable until midnight');
    else console.log(`morning: a finished ritual re-opens usable — stepper back (${r.second.nav}px), their words still reachable`);
    await ctx.close();
  }

  // ── the reading plans, five times over ─────────────────────────────────────────────────────
  // RESEARCH-BACKLOG lists guided reading plans as a gap. They are not — they are built, and built
  // carefully: three plans, each written FIVE times, once per tradition in that tradition's own
  // register, with the passage text bundled so a plan works with no signal. Nothing tested them.
  //
  // The assertion that matters is the third. A content feature like this fails by COLLAPSING — one
  // tradition quietly falling back to another's text. That is not just a bug here; handing a Muslim
  // or a Buddhist a Christian passage under their own tradition's heading is the exact thing this
  // app promises never to do, and it would look completely normal on screen.
  {
    const texts = {};
    for (const tr of ['christianity','islam','hinduism','buddhism','secular']) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(t => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        s('totry_onboarded',true); s('totry_name','Sam'); s('totry_faith_tradition',t); }, tr);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2600);
      const r = await page.evaluate(async () => {
        document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
        openPlans();                                   // a TAB, not a modal — go('plans') + #plans-content
        await new Promise(x=>setTimeout(x,700));
        const el = document.getElementById('plans-content');
        if(!el) return null;
        const list = (el.innerText||'').replace(/\s+/g,' ').trim();
        openPlan('fear');
        await new Promise(x=>setTimeout(x,700));
        const d1 = (el.innerText||'').replace(/\s+/g,' ').trim();
        renderPlanDay('fear', 1);                      // day 2, zero-indexed
        await new Promise(x=>setTimeout(x,500));
        const d2 = (el.innerText||'').replace(/\s+/g,' ').trim();
        return { list, d1, d2 };
      });
      await ctx.close();
      if (!r) { findings.push(`plans (${tr}): #plans-content is not in the markup`); continue; }
      if (!/Short plans/i.test(r.list)) findings.push(`plans (${tr}): the plan list does not render`);
      else if (!/DAY 1 OF/i.test(r.d1)) findings.push(`plans (${tr}): opening a plan does not show day 1`);
      else if (!/DAY 2 OF/i.test(r.d2)) findings.push(`plans (${tr}): the runner does not advance to day 2`);
      else if (/undefined|NaN/.test(r.d1)) findings.push(`plans (${tr}): day 1 leaked undefined/NaN onto the screen`);
      else texts[tr] = r.d1.slice(0, 260);
    }
    // no tradition may be reading another's book
    const vals = Object.values(texts);
    if (vals.length === 5 && new Set(vals).size < 5) {
      const dupes = Object.keys(texts).filter(k => vals.filter(v => v === texts[k]).length > 1);
      findings.push(`plans: ${dupes.join(' and ')} are being shown the SAME passage — a tradition has collapsed into another's text`);
    }
    if (!findings.some(f => f.startsWith('plans'))) console.log('plans: all five traditions run their own seven days, each from its own book');
  }

  // ── a ritual that saves must SAY so, and point at what is left ─────────────────────────────
  // Both of these were broken by the stepping work itself, which is the point of having them.
  //
  // The done cards are shown with an inline display:block by completeMorning/completeEvening. The
  // step rule hides non-active blocks with !important, which outranks that — so the morning saved a
  // person's gratitude and intention perfectly and then said NOTHING back. They are the END of the
  // ritual, not a step, so they are excluded from assignment entirely.
  //
  // And the evening only closes once the examen is done. Its nudge said "scroll up to begin it" and
  // called scrollIntoView on a card that stepping had hidden — pointing at something not on screen.
  // It has to take them to the step instead.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam');
      s('totry_v',[{ n:'Porn', mode:'quit', startDate:new Date(Date.now()-13*864e5).toISOString() }]); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2800);

    const m = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('morning'); await new Promise(x=>setTimeout(x,1100));
      morningStep(3); await new Promise(x=>setTimeout(x,200));
      const g=document.getElementById('morning-gratitude'), i=document.getElementById('morning-intention');
      if(g){ g.value='the quiet before everyone wakes'; g.dispatchEvent(new Event('input',{bubbles:true})); }
      if(i){ i.value='finish the hard thing first'; i.dispatchEvent(new Event('input',{bubbles:true})); }
      const before=(ls('totry_mornings')||[]).length;
      if(typeof completeMorning==='function') await completeMorning();
      await new Promise(x=>setTimeout(x,900));
      const done=document.getElementById('morning-done');
      return { saved:(ls('totry_mornings')||[]).length > before,
               shown: !!(done && getComputedStyle(done).display!=='none' && done.getBoundingClientRect().height>0) };
    });
    if (!m.saved) findings.push('morning: completing it saved nothing');
    else if (!m.shown) findings.push('morning: it saved their words and then said nothing back — the done card is hidden by its own step rule');

    const e = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('reflect'); await new Promise(x=>setTimeout(x,1100));
      eveningStep(1); await new Promise(x=>setTimeout(x,200));
      const w=document.getElementById('evening-win');
      if(w){ w.value='went for the walk anyway'; w.dispatchEvent(new Event('input',{bubbles:true})); }
      const before=(ls('totry_evenings')||[]).length;
      if(typeof completeEvening==='function') await completeEvening();
      await new Promise(x=>setTimeout(x,900));
      const panel=document.getElementById('reflect-panel-evening');
      const card=document.getElementById('examen-card');
      const r=card ? card.getBoundingClientRect() : null;
      return { saved:(ls('totry_evenings')||[]).length > before,
               step:(panel.querySelector('.mstep-label')||{}).textContent || '?',
               examenOnScreen: !!(card && r.height>0 && r.top < window.innerHeight && getComputedStyle(card).display!=='none') };
    });
    if (!e.saved) findings.push('evening: completing it saved nothing');
    else if (!e.examenOnScreen)
      findings.push(`evening: it says the examen closes the day and then leaves them on "${e.step}" with the examen off screen`);

    if (!findings.some(f => f.startsWith('morning:') || f.startsWith('evening:')))
      console.log('rituals: the morning confirms what it saved, and the evening takes you to the examen it asks for');
    await ctx.close();
  }

  // ── the Calendar's day reaches Today ───────────────────────────────────────────────────────
  // SOUL-ARCHITECTURE, CALENDAR: "earn its place or fold into Today. Question first." The answer is
  // in the code rather than in taste: the VIEW is already folded in. Today's events appear on Home
  // once someone is established, and in Soul's "your day, woven"; the Calendar screen is only the
  // editor — paste a roster, add with AI — and it is not a top-level tab.
  //
  // Which means this thread is what the answer rests on. If Home ever stopped reading calendar
  // events, the Calendar would quietly become the isolated feature the TODO was worried about, and
  // nothing would fail.
  //
  // Two things this has to get right or it lies. The card is gated behind progressive disclosure at
  // day 5, so a brand-new person legitimately does not see it and testing one proves nothing. And it
  // lives inside #home-depth-body, which is COLLAPSED by default to keep the first screen calm — so
  // the honest claim is "one tap away and populated", not "visible on arrival". Checking display
  // alone passed while the card had zero height inside a closed parent; checking height without
  // opening the fold failed on a card that was perfectly fine.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam');
      s('totry_start', new Date(Date.now() - 30*864e5).toISOString());   // established, past the gate
      const dow = (new Date().getDay()+6)%7;
      s('totry_cal_events',[{ day:dow, start:'09:00', end:'17:00', title:'Work', type:'work' },
                            { day:dow, start:'18:30', title:'Gym — push day', type:'gym' }]);
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2800);
    const r = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('home');
      await new Promise(x=>setTimeout(x,1000));
      const card = document.getElementById('home-calendar-card');
      const before = !!(card && card.getBoundingClientRect().height > 0);
      // open the depth fold, the way a person does
      if (typeof toggleHomeDepth === 'function' && !before) toggleHomeDepth();
      await new Promise(x=>setTimeout(x,400));
      const shown = !!(card && getComputedStyle(card).display !== 'none' && card.getBoundingClientRect().height > 0);
      return { days:(typeof daysInstalled==='function') ? daysInstalled() : null,
               shown, oneTap: !before && shown,
               text: card ? (card.innerText||'').replace(/\s+/g,' ').trim() : '' };
    });
    if (!r.shown) findings.push("calendar: today's schedule never reaches Today — the Calendar is an island");
    else if (!/Work/.test(r.text) || !/Gym/.test(r.text))
      findings.push(`calendar: the Home card is there but not showing today's events — "${r.text.slice(0,60)}"`);
    else console.log(`calendar: today's events reach Today${r.oneTap ? ' (one tap, inside the depth fold)' : ''} — the view is folded in, the screen is just the editor`);
    await ctx.close();
  }

  // ── Money leads with what staying clean bought, not what is owed ───────────────────────────
  // SOUL-ARCHITECTURE, MONEY: "lead with the reclaimed/stewardship story, not raw debt tables." The
  // code already carried a comment saying exactly that — and then did mg.after(sh), placing the
  // reclaimed hero SECOND. Intent and execution disagreed, so the thumb still met Paid off / Debt
  // left first. Every clean day is real money back, and that is the line the 11pm man needs above
  // the number that shames him.
  //
  // The second case is the one that keeps it honest: with no vice cost set the figure is £0, and a
  // "$0 RECLAIMED — set weekly vice spend below" hero at the top of the screen would be worse than
  // the debt figures. Then the debt table leads, because it is the only thing that is true yet.
  {
    for (const c of [{ label:'reclaiming', cost:true, days:40, reclaimedLeads:true },
                     { label:'day zero, cost set', cost:true, days:0, reclaimedLeads:false }]) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(c => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        s('totry_onboarded',true); s('totry_name','Sam');
        const v = { n:'Porn', mode:'quit', startDate:new Date(Date.now()-c.days*864e5).toISOString() };
        if(c.cost){ v.costAmount = 25; v.costPeriod = 'week'; }
        s('totry_v',[v]);
        s('totry_f',{ d:[{ n:'Car loan', t:20000, p:6000 }], income:5200 });
      }, { cost:c.cost, days:c.days });
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2700);
      const r = await page.evaluate(async () => {
        document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
        go('money');
        await new Promise(x=>setTimeout(x,900));
        const pane = document.getElementById('tab-money');
        const vis = el => { const cs = getComputedStyle(el); if(cs.display==='none') return false;
          const q = el.getBoundingClientRect(); return q.width>0 && q.height>0; };
        const order = [...pane.children].filter(vis);
        const hero = document.getElementById('saved-hero');
        const gauge = pane.querySelector('.mg');
        return { heroAt: order.indexOf(hero), gaugeAt: order.indexOf(gauge),
                 heroText:(hero&&hero.innerText||'').replace(/\s+/g,' ').trim().slice(0,40) };
      });
      if (r.heroAt < 0 || r.gaugeAt < 0) findings.push(`money (${c.label}): could not find the hero or the debt gauge on screen`);
      else if (c.reclaimedLeads && r.heroAt > r.gaugeAt)
        findings.push(`money (${c.label}): the debt table still leads — "${r.heroText}" sits below it`);
      else if (!c.reclaimedLeads && r.heroAt < r.gaugeAt)
        findings.push(`money (${c.label}): "${r.heroText}" is leading the screen, and it is zero — an empty hero at the top is worse than the debt figures`);
      await ctx.close();
    }
    if (!findings.some(f => f.startsWith('money ('))) console.log('money: the reclaimed figure leads once there is one, and never when it is zero');
  }

  // ── Soul opens with stillness, not a menu ──────────────────────────────────────────────────
  // SOUL-ARCHITECTURE, SOUL: "make Soul feel like the still center, not a tab of religious features."
  // It opened as four labelled grids, which is a menu, and a menu is the opposite of stillness.
  //
  // The assertion that matters is the last one. "Faith is full but never forced" — a secular person
  // must be offered the stillness and NO scripture, because slipping religious content in unasked is
  // the one thing this app promises not to do. And each tradition must get a line from its OWN book,
  // not a Christian line with the nouns swapped.
  {
    const want = [
      { tr:'christianity', scripture:true },
      { tr:'islam',        scripture:true },
      { tr:'buddhism',     scripture:true },
      { tr:'secular',      scripture:false },
    ];
    const seen = {};
    for (const w of want) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(t => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        s('totry_onboarded',true); s('totry_name','Sam'); s('totry_faith_tradition',t); }, w.tr);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2600);
      const r = await page.evaluate(async () => {
        document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
        go('soul');
        await new Promise(x=>setTimeout(x,900));
        const el = document.getElementById('soul-still');
        if(!el) return null;
        const pane = document.getElementById('tab-soul');
        const visible = [...pane.children].filter(e => getComputedStyle(e).display !== 'none');
        const grids = visible.filter(e => e.classList.contains('hub-grid') || e.classList.contains('hub-common-grid'));
        return { pos: visible.indexOf(el),
                 beforeGrids: grids.length ? visible.indexOf(el) < visible.indexOf(grids[0]) : true,
                 text:(el.innerText||'').replace(/\s+/g,' ').trim(),
                 hasAction: !!el.querySelector('button') };
      });
      if (!r) { findings.push('soul: #soul-still is not in the markup'); await ctx.close(); continue; }
      seen[w.tr] = r.text;
      if (!r.beforeGrids) findings.push(`soul (${w.tr}): the still centre sits after the menu of features`);
      else if (!r.hasAction) findings.push(`soul (${w.tr}): a line with nothing to do about it`);
      else if (w.scripture && !/A WORD FOR TODAY/i.test(r.text))
        findings.push(`soul (${w.tr}): no word from their own tradition — "${r.text.slice(0,50)}"`);
      else if (!w.scripture && /A WORD FOR TODAY/i.test(r.text))
        findings.push(`soul (secular): handed scripture unasked — "${r.text.slice(0,60)}" — faith is full but never forced`);
      await ctx.close();
    }
    // and the traditions must not be reading each other's book
    const lines = ['christianity','islam','buddhism'].map(t => seen[t]).filter(Boolean);
    if (lines.length === 3 && new Set(lines).size < 3)
      findings.push('soul: two traditions are being shown the same line');
    if (!findings.some(f => f.startsWith('soul'))) console.log('soul: opens with stillness before the menu — each tradition its own word, and none for a secular person');
    await Promise.resolve();
  }

  // ── the evening asks one honest question at a time ─────────────────────────────────────────
  // SOUL-ARCHITECTURE, EVENING: "dusk skin, one honest question at a time, grace-first framing." It
  // ran to 27 blocks in one scroll. Looking back over a hard day is not something a person does well
  // while scrolling past nine more fields, and the ones who most need it close the tab at block four.
  //
  // GRACE FIRST is an ordering, not a tone: what they actually did lands before anything they are
  // asked to admit, and the three good things come before the examen rather than after it. The last
  // step must hold the examen and the completion — getting that wrong is easy, because an anchor
  // claims everything below it, so numbering a step by the ritual's order instead of the markup's
  // silently buried the examen inside the gratitude step.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const r = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('reflect');
      await new Promise(x=>setTimeout(x,1100));
      const panel = document.getElementById('reflect-panel-evening');
      const tab = document.getElementById('tab-reflect');
      const out = { stepped: panel.classList.contains('stepped'), dusk: tab.classList.contains('dusk'), steps: [] };
      // #evening-done likewise — the end of the ritual, not a step. See the morning note.
      out.orphans = [...panel.children].filter(e =>
        !e.classList.contains('mstep-nav') && !e.classList.contains('mstep-foot') &&
        e.id !== 'evening-done' &&
        !e.hasAttribute('data-mstep')).map(e => e.id || '.'+String(e.className||'').split(' ')[0]);
      const total = (typeof _EVENING_STEPS !== 'undefined') ? _EVENING_STEPS.length : 0;
      for (let i = 0; i < total; i++) {
        eveningStep(i);
        await new Promise(x=>setTimeout(x,170));
        const on = [...panel.querySelectorAll(':scope > [data-mstep].mstep-on')].map(e => e.id || '');
        out.steps.push({ label:(panel.querySelector('.mstep-label')||{}).textContent || '?',
                         h: Math.round(tab.scrollHeight), ids: on });
        if (!document.getElementById('evening-win') || !document.getElementById('evening-release'))
          out.fieldsGone = i;
      }
      out.total = total;
      return out;
    });
    const last = r.steps[r.steps.length-1];
    if (!r.stepped) findings.push('evening: not stepped — still one long scroll');
    else if (!r.dusk) findings.push('evening: no dusk skin');
    else if (r.orphans.length) findings.push(`evening: ${r.orphans.length} block(s) belong to no step — ${r.orphans.slice(0,3).join(', ')}`);
    else if (r.fieldsGone != null) findings.push(`evening: the fields are GONE at step ${r.fieldsGone} — hidden is fine, removed is not`);
    else if (!last || !last.ids.includes('examen-card'))
      findings.push(`evening: the examen is not in the final step — it ended up in "${(r.steps.find(s=>s.ids.includes('examen-card'))||{}).label || 'nowhere'}"`);
    else {
      const tall = r.steps.filter(s => s.h > 1000);
      if (tall.length) findings.push(`evening: ${tall.map(s=>s.label+' '+s.h+'px').join(', ')} — a step that does not fit a screen is still a form`);
      else console.log(`evening: ${r.total} steps (${r.steps.map(s=>s.h).join('/')}px), dusk on, examen last, nothing orphaned`);
    }
    await ctx.close();
  }

  // ── the morning is a ritual, not a form ────────────────────────────────────────────────────
  // SOUL-ARCHITECTURE, MORNING: "rebuild so it FEELS like morning — dawn skin, one thing at a time,
  // not a form." It was 1913px of scroll and 42 visible controls on an 896px screen. Nobody sets an
  // intention at the bottom of a form.
  //
  // Three things have to hold, and the last two are the ones that could hurt someone:
  //   - each step fits about a screen, or it is still a form with extra taps
  //   - EVERY block belongs to a step. Assignment is by anchor so anything added later inherits the
  //     step it sits in; a block with no step is a card that has silently left the app
  //   - the fields are hidden, never removed. The morning check-in is a crisis door — the gate runs
  //     on what is typed into #morning-gratitude / #morning-intention and completeMorning() reads
  //     both. A field that has been deleted cannot be written to.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const r = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('morning');
      await new Promise(x=>setTimeout(x,1100));
      const pane = document.getElementById('tab-morning');
      const out = { stepped: pane.classList.contains('stepped'), dawn: pane.classList.contains('dawn'), steps: [] };
      // nothing may be left without a step
      // #morning-done is deliberately unassigned — it is the END of the ritual, not a step, and a
      // step rule would hide it with !important over the inline display:block that reveals it.
      // #hub-back-bar is chrome, and it is matched BY ID: updateHubBackBar() builds it with
      // bar.id='hub-back-bar' and no class at all, which is how a class-only skip test let it be
      // given a step and vanish from steps 1-4.
      out.orphans = [...pane.children].filter(e =>
        e.id !== 'hub-back-bar' && e.id !== 'morning-done' &&
        !e.classList.contains('hub-back-bar') && !e.classList.contains('a11y-only') &&
        !e.classList.contains('mstep-nav') && !e.classList.contains('mstep-foot') &&
        !e.hasAttribute('data-mstep')).map(e => e.id || '.'+String(e.className||'').split(' ')[0]);
      for (let i = 0; i < 5; i++) {
        morningStep(i);
        await new Promise(x=>setTimeout(x,180));
        out.steps.push({ label:(pane.querySelector('.mstep-label')||{}).textContent || '?',
                         h: Math.round(pane.scrollHeight) });
        // the crisis fields must exist at EVERY step, not only their own
        if (!document.getElementById('morning-gratitude') || !document.getElementById('morning-intention'))
          out.crisisGone = i;
      }
      // the way out must be present on EVERY step, not just the first
      const bar = document.getElementById('hub-back-bar');
      out.backBarGoneAt = null;
      for (let i = 0; i < 5; i++) {
        morningStep(i);
        await new Promise(x=>setTimeout(x,150));
        if (bar && bar.getBoundingClientRect().height === 0) { out.backBarGoneAt = i; break; }
      }
      morningShowAll();
      await new Promise(x=>setTimeout(x,260));
      out.showAll = { h: Math.round(pane.scrollHeight), stepped: pane.classList.contains('stepped') };
      return out;
    });
    if (!r.stepped) findings.push('morning: not stepped — it is still one long form');
    else if (!r.dawn) findings.push('morning: no dawn skin');
    else if (r.orphans.length) findings.push(`morning: ${r.orphans.length} block(s) belong to no step and can never be reached — ${r.orphans.slice(0,3).join(', ')}`);
    else if (r.crisisGone != null) findings.push(`morning: the crisis fields are GONE at step ${r.crisisGone} — hidden is fine, removed is not`);
    else if (r.backBarGoneAt != null) findings.push(`morning: the "‹ Soul" way out disappears at step ${r.backBarGoneAt} — leaving mid-ritual should not need the bottom nav`);
    else {
      const tall = r.steps.filter(s => s.h > 1100);
      if (tall.length) findings.push(`morning: ${tall.map(s=>s.label+' '+s.h+'px').join(', ')} — a step that does not fit a screen is still a form`);
      else if (r.showAll.stepped || r.showAll.h < 1500)
        findings.push('morning: "show the whole morning" does not actually restore the full page');
      else console.log(`morning: five steps (${r.steps.map(s=>s.h).join('/')}px), dawn skin on, nothing orphaned, and the whole page is still one tap away`);
    }
    await ctx.close();
  }

  // ── the Fight leads with evidence, and the evidence has to be earned ───────────────────────
  // SOUL-ARCHITECTURE, FIGHT: "reframe from a list of vices into 'your fight, and how you're winning
  // it.'" The clean clock says how long; directly beneath it the person met a per-vice list opening
  // "WIN RATE 0% 0/6" — a scoreboard of every loss, which is the framing this pillar refuses.
  //
  // The trap in a line like this is that it becomes a compliment. "Your longest run yet" compared
  // against a stored v.best that NOTHING in this app writes, so it was true for everyone past three
  // days and therefore meant nothing. It is now derived from the slips actually logged, and the case
  // that matters most is the last one: someone 13 days in whose previous best was 30 must NOT be told
  // this is their longest run. An app that flatters is an app you stop believing.
  {
    const cases = [
      { label:'brand new',                    seed:{},                              want:{ shown:false } },
      // The element is shared now: 13 days without a slip legitimately earns the stayed-in sentence,
      // so hidden is the wrong assertion. What must still be absent is any EVIDENCE bit — an urge
      // count, money, a longest run — which is what this case was always guarding.
      { label:'first attempt, no slips yet',  seed:{ clean:13 },
        want:{ shown:true, hasnt:/URGES? MET|RECLAIMED|LONGEST RUN/i } },
      { label:'3 urges beaten, money back',   seed:{ clean:13, won:3, cost:true },  want:{ shown:true, has:/URGES MET AND TURNED AWAY/i, hasnt:/LONGEST RUN/i } },
      { label:'40 days, previous best 21',    seed:{ clean:40, won:1, uses:[80,59,40] }, want:{ shown:true, has:/PORN: 40 DAYS .* YOUR LONGEST YET, PAST YOUR OLD BEST OF 21/i } },
      { label:'only one completed run',       seed:{ clean:200, won:1, uses:[203,200] },   want:{ shown:true, hasnt:/LONGEST RUN/i } },
      { label:'13 days, previous best 30',    seed:{ clean:13, won:1, uses:[60,30,13] }, want:{ shown:true, hasnt:/LONGEST RUN/i } },
    ];
    for (const c of cases) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(c => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        const d=i=>new Date(Date.now()-i*864e5).toISOString();
        s('totry_onboarded',true); s('totry_name','Sam'); s('totry_currency','GBP');
        if(c.clean){ const v={ n:'Porn', mode:'quit', startDate:d(c.clean), total:6 };
          if(c.cost){ v.costAmount=25; v.costPeriod='week'; }
          s('totry_v',[v]); }
        if(c.uses) s('totry_vice_uses', c.uses.map(n=>({ v:'Porn', ts:d(n) })));
        if(c.won) s('totry_fight_log', Array.from({length:c.won},(_,i)=>({ ts:d(i+1), won:true })));
      }, c.seed);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2600);
      const txt = await page.evaluate(async () => {
        go('fight'); await new Promise(x=>setTimeout(x,900));
        const el = document.getElementById('fight-evidence');
        if(!el) return null;
        const on = getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
        return on ? (el.innerText||'').replace(/\s+/g,' ').trim() : '';
      });
      if (txt === null) { findings.push('fight evidence: #fight-evidence is not in the markup'); await ctx.close(); continue; }
      const shown = !!txt;
      if (shown !== c.want.shown)
        findings.push(`fight evidence (${c.label}): ${shown ? 'says "'+txt.slice(0,56)+'"' : 'says nothing'} — expected the opposite`);
      else if (c.want.has && !c.want.has.test(txt))
        findings.push(`fight evidence (${c.label}): missing the counted evidence — "${txt.slice(0,56)}"`);
      else if (c.want.hasnt && c.want.hasnt.test(txt))
        findings.push(`fight evidence (${c.label}): claims "${txt.slice(0,56)}" — that is a compliment, not a fact`);
      await ctx.close();
    }
    if (!findings.some(f => f.startsWith('fight evidence')))
      console.log('fight: leads with earned evidence, and withholds "longest run" from someone who has not beaten theirs');
  }

  // ── the companion is a sheet, not a takeover ───────────────────────────────────────────────
  // SOUL-ARCHITECTURE, THE COMPANION: "make it a bottom-sheet that rises like iMessage, not a
  // full-screen takeover." It was pinned to a fixed top and stood 832px on a 414x896 phone — 93% of
  // the screen — to ask one short question. This surface exists to meet someone where they already
  // are, in the second they feel it; taking over the screen to do that is the opposite.
  //
  // Two assertions, because one alone is easy to satisfy wrongly. Short content must leave the app
  // visible behind it. Long content must still get every pixel it had before — a sheet that caps
  // itself smaller would push a helpline off-screen, which is exactly the crisis bug this repo
  // already paid for once.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2600);
    const r = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e => e.classList.remove('open'));
      openCompanion();
      await new Promise(x=>setTimeout(x,700));
      const ov = document.querySelector('.companion-overlay');
      const short = Math.round(ov.getBoundingClientRect().height);
      // grow it the way a real conversation does
      const filler = document.createElement('div');
      filler.style.height = '1400px';
      ov.appendChild(filler);
      await new Promise(x=>setTimeout(x,400));
      const tall = Math.round(ov.getBoundingClientRect().height);
      filler.remove();
      const back = document.querySelector('.companion-backdrop');
      return { short, tall, viewport: window.innerHeight,
               backdrop: !!(back && getComputedStyle(back).display !== 'none'),
               handle: getComputedStyle(ov, '::before').content !== 'none' };
    });
    const behind = r.viewport - r.short;
    if (behind < 150)
      findings.push(`companion: asking one short question it stands ${r.short}px on a ${r.viewport}px screen — only ${behind}px of the app left behind it, which is a takeover, not a sheet`);
    else if (r.tall < r.viewport - 100)
      findings.push(`companion: a long conversation only gets ${r.tall}px — it used to get ${r.viewport - 64}px, and shrinking it is how a helpline ends up off-screen`);
    else if (!r.backdrop) findings.push('companion: no backdrop, so the app behind it is not dimmed');
    else console.log(`companion: ${r.short}px for a short question (${behind}px of app still behind it), ${r.tall}px for a long one`);
    await ctx.close();
  }

  // ── Grow has to read as one loop, not three tabs ───────────────────────────────────────────
  // SOUL-ARCHITECTURE, GROW: "make them FEEL like one loop — each hands off to the next with a line
  // of meaning." The failure this guards is the one that makes such a line worthless: inventing it.
  // A person with nothing logged must see NOTHING here, because a handoff that is made up is worse
  // than no handoff — it is the app pretending to know a body it has never been told about. And when
  // someone HAS trained and logged nothing to fuel it, the loop is broken at that exact link and
  // saying so is the most useful thing the line can do.
  {
    const cases = [
      { label:'nothing logged',      seed:{},                              expect:{ train:false, nourish:false, track:false } },
      { label:'trained, never ate',  seed:{ train:2 },                     expect:{ train:true,  nourish:true,  track:true  } },
      { label:'the whole loop',      seed:{ train:3, meals:5, weighins:2 },expect:{ train:true,  nourish:true,  track:true  } },
    ];
    for (const c of cases) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(c => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        s('totry_onboarded',true); s('totry_name','Sam');
        const iso=i=>new Date(Date.now()-i*864e5).toISOString();
        const au =i=>new Date(Date.now()-i*864e5).toLocaleDateString('en-AU');
        if(c.train) s('totry_workouts',Array.from({length:c.train},(_,i)=>({ id:i, ts:iso(i), date:iso(i).slice(0,10), title:'S'+i, volume:8000, sets:16, calories:420 })));
        if(c.meals){ const g={}; for(let i=0;i<c.meals;i++) g[au(i)]=[{ name:'Meal', cal:700, pro:52, ts:iso(i) }]; s('totry_nutlog',g); }
        if(c.weighins) s('totry_body',Array.from({length:c.weighins},(_,i)=>({ date:iso(i*7).slice(0,10), weight:83.2-(i*0.8), ts:iso(i*7) })));
      }, c.seed);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2600);
      const r = await page.evaluate(async () => {
        go('grow'); await new Promise(x=>setTimeout(x,900));
        const read = id => { const e = document.getElementById(id);
          if(!e) return null;
          return (e.classList.contains('on') && e.getBoundingClientRect().height > 0) ? (e.textContent||'').trim() : '';
        };
        return { train:read('hand-train'), nourish:read('hand-nourish'), track:read('hand-track') };
      });
      for (const k of ['train','nourish','track']) {
        if (r[k] === null) { findings.push(`grow handoff: #hand-${k} is not in the markup`); continue; }
        const shown = !!r[k];
        if (shown !== c.expect[k])
          findings.push(`grow handoff (${c.label}): ${k} ${shown ? 'says "'+r[k].slice(0,54)+'"' : 'says nothing'} — expected the opposite`);
        // a handoff must point somewhere or state a result; a bare stat is not a handoff
        if (shown && !/→|that is what|trend starts|shows up|start here/.test(r[k]))
          findings.push(`grow handoff (${c.label}): ${k} reads as a statistic, not a hand-off — "${r[k].slice(0,54)}"`);
      }
      await ctx.close();
    }
    if (!findings.some(f => f.startsWith('grow handoff')))
      console.log('grow: the three cards hand off to each other, and say nothing when there is nothing true to say');
  }

  // ── every control a person can reach must say what it is ───────────────────────────────────
  // A screen reader announces a button by its accessible name. An unnamed one is read as "button",
  // which in an app full of icon-only controls means a blind person is guessing. 342 controls across
  // nine tabs currently all have one; this stops the next one shipping without.
  //
  // The name is computed from CONTENTS — textContent, not innerText. innerText is empty for anything
  // inside a closed <details>, which is exactly how the settings groups are built, so an innerText
  // check reported six perfectly-labelled controls ("Male", "Female", "Christianity") as unnamed.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam');
      const iso=new Date().toISOString(), au=new Date().toLocaleDateString('en-AU');
      s('totry_v',[{ n:'Porn', mode:'quit', startDate:new Date(Date.now()-12*864e5).toISOString() }]);
      s('totry_nutlog',{ [au]:[{ name:'Meal', cal:650, pro:55, ts:iso }] });
      s('totry_f',{ d:[{ n:'Car loan', t:5000, p:1200 }], income:5200 });
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    await page.evaluate(() => document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open')));
    let total = 0; const unnamed = [];
    for (const t of ['home','fight','grow','money','soul','nourish','reflect','track','settings']) {
      const r = await page.evaluate(async (t) => {
        go(t); await new Promise(x=>setTimeout(x,700));
        const pane = document.getElementById('tab-'+t); if(!pane) return { n:0, un:[] };
        const vis = el => { const c=getComputedStyle(el); if(c.display==='none'||c.visibility==='hidden') return false;
          const q=el.getBoundingClientRect(); return q.width>0 && q.height>0; };
        const all = [...pane.querySelectorAll('button,a[href],[onclick],input,select,textarea')].filter(vis);
        const un = all.filter(e => {
          const txt = (e.textContent||'').trim();
          return !txt && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.getAttribute('title')
                 && !(e.tagName==='INPUT' && (e.placeholder || (e.labels && e.labels.length)));
        });
        return { n:all.length, un:un.slice(0,4).map(e => e.tagName.toLowerCase()+' → '+(e.getAttribute('onclick')||'(no handler)').slice(0,40)) };
      }, t);
      total += r.n;
      r.un.forEach(x => unnamed.push(`${t}: ${x}`));
    }
    if (unnamed.length) findings.push(`a11y: ${unnamed.length} control(s) a screen reader can only call "button" — ${unnamed.slice(0,3).join(' | ')}`);
    else console.log(`a11y: all ${total} controls across nine tabs have an accessible name`);
    await ctx.close();
  }

  // ── the companion's help does not depend on a model ────────────────────────────────────────
  // Not hypothetical: the ai-proxy chain is down to a single working provider in production. The
  // companion is what a person opens mid-craving, so the thing that must never happen is a spinner,
  // an error, or a dead end.
  //
  // What this actually proves — checked by injection, because the first version of this comment
  // claimed more than the code tested — is that the scripted intervention and the bridge to a real
  // person are on screen with EVERY provider throwing. Disabling the companion's catch block changes
  // nothing here, because that content never came from the model in the first place; hiding the
  // bridge button fails it immediately. That is the app's own rule stated as a test: the
  // deterministic path carries the weight and the model is only ever a nicety.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam');
      s('totry_v',[{ n:'Porn', mode:'quit', startDate:new Date(Date.now()-12*864e5).toISOString() }]); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2600);
    const r = await page.evaluate(async () => {
      window.__aiCalls = 0;
      if (typeof sb !== 'undefined' && sb) sb.functions = { invoke: async () => { window.__aiCalls++; throw new Error('Edge Function returned a non-2xx status code'); } };
      window.fetch = async () => { window.__aiCalls++; throw new Error('network down'); };
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e => e.classList.remove('open'));
      if (typeof openCompanion === 'function') openCompanion();
      await new Promise(x=>setTimeout(x,600));
      const f = document.getElementById('comp-freetext');
      if (f) f.value = 'i keep slipping and i dont know why';
      if (typeof companionFreeText === 'function') await companionFreeText();
      await new Promise(x=>setTimeout(x,2600));
      const vis = el => { if(!el) return false; const q = el.getBoundingClientRect();
        return q.width>0 && q.height>0 && getComputedStyle(el).display!=='none'; };
      const ov = document.querySelector('.companion-overlay');
      const txt = (ov && ov.innerText) || document.body.innerText || '';
      return { calls: window.__aiCalls || 0,
               // scoped to the companion — the subject of this assertion. A document-wide sweep also
               // catches the morning sentence's spinner, which at that moment is still waiting on a
               // REAL network call fired at boot before these stubs existed; measured on its own it
               // hides its card in ~100ms once the call actually fails, so that was the harness.
               spinners: [...document.querySelectorAll('.companion-overlay .pulsing, .companion-overlay .spinner, .companion-overlay .loading')].filter(vis).length,
               stuckThinking: /thinking|one moment|working on it/i.test(txt),
               bridge: /reach a real person|someone you trust|let someone in|talk to someone/i.test(txt),
               wayThrough: /I.m through it|step away|pick your own way|try this|breathe/i.test(txt),
               chars: txt.length };
    });
    if (!r.calls) findings.push('AI-down: the companion never even tried the model, so this proves nothing — check the stub');
    else if (r.spinners) findings.push(`AI-down: ${r.spinners} spinner(s) still turning after every provider failed`);
    else if (r.stuckThinking) findings.push('AI-down: the companion still says it is thinking, mid-craving, forever');
    else if (!r.wayThrough) findings.push('AI-down: the companion offers no way through when the model fails');
    else if (!r.bridge) findings.push('AI-down: the companion offers no bridge to a real person when the model fails');
    else console.log(`AI-down: ${r.calls} failed attempts, no spinner, a way through AND a bridge to a real person`);
    await ctx.close();
  }

  // ── the app must never say "saved" when it did not save ────────────────────────────────────
  // localStorage throws when it is full, and this app writes photos. The failure that matters is not
  // the throw — it is the toast that follows it saying "Saved", because the person then closes the
  // app believing their words are safe. Filling the quota with ballast the emergency prune is not
  // allowed to touch is the only way to reach the state where nothing can rescue the write.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2600);
    const r = await page.evaluate(async () => {
      const out = {};
      const readToast = async () => {
        document.querySelectorAll('.milestone-toast').forEach(e => e.remove());
        showToast('Saved', 'Your entry is safe.');       // the REAL one — stubbing it skips the thing under test
        await new Promise(x=>setTimeout(x,200));
        const t = document.querySelector('.milestone-toast');
        return t ? (t.innerText||'').replace(/\s+/g,' ').trim() : '(no toast)';
      };
      window.__lsLastWriteFailed = 0;
      out.normal = await readToast();

      // ballast under a key no prune plan touches, so the write cannot be rescued
      const blob = 'z'.repeat(200*1024);
      for (let i = 0; i < 60; i++) { try { localStorage.setItem('__ballast_'+i, blob); } catch(e){ break; } }
      window.__lsLastWriteFailed = 0;
      out.wrote = ls('totry_journal', [{ ts:new Date().toISOString(), text:'y'.repeat(300*1024) }]);
      out.recorded = !!window.__lsLastWriteFailed;
      out.afterFailure = await readToast();

      // The line above proves the PERSON sees something honest — but it does not prove which layer
      // produced it. ls() shows its own "Storage full" toast on failure, so disabling showToast's
      // rewrite entirely left that assertion green. This isolates the rewrite: no real failed write,
      // no competing toast, just the flag set and a success-shaped title handed straight to showToast.
      window.__lsLastWriteFailed = Date.now();
      out.rewrite = await readToast();
      window.__lsLastWriteFailed = 0;

      // and the prune must actually be able to free room when photos ARE the problem
      for (let i = 0; i < 60; i++) { try { localStorage.removeItem('__ballast_'+i); } catch(e){} }
      const photos = Array.from({length:30}, (_,i) => ({ id:i, img:'data:image/jpeg;base64,'+'x'.repeat(60*1024) }));
      try { localStorage.setItem('totry_progress_photos', JSON.stringify(photos)); } catch(e){}
      const before = (ls('totry_progress_photos')||[]).length;
      try { _lsEmergencyPrune(); } catch(e){ out.pruneThrew = String(e.message).slice(0,50); }
      out.prune = before + ' → ' + (ls('totry_progress_photos')||[]).length;
      return out;
    });
    if (!/Saved/.test(r.normal))
      findings.push(`storage: a normal save does not confirm — "${r.normal}"`);
    if (r.wrote !== false)
      findings.push('storage: a write that could not fit reported success');
    else if (!r.recorded)
      findings.push('storage: a failed write was not recorded, so nothing downstream can know');
    else if (/^Saved/.test(r.afterFailure))
      findings.push(`storage: right after a write that FAILED, the app still said "${r.afterFailure.slice(0,50)}"`);
    else if (/^Saved/.test(r.rewrite))
      findings.push(`storage: showToast still says "${r.rewrite.slice(0,40)}" when the last write failed — the ls() toast happens to cover this, but any other success message would lie`);
    else if (r.pruneThrew) findings.push(`storage: the emergency prune threw — ${r.pruneThrew}`);
    else console.log(`storage: a full device says "${r.afterFailure.slice(0,38)}…" instead of Saved; prune ${r.prune}`);
    await ctx.close();
  }

  // ── a merge that is not queued deletes the other device's entry FROM THE CLOUD ──────────────
  // The most invisible failure in this app. startSyncLoop runs pullFromCloud() then flushOutbox()
  // back to back, so a merge branch that unions without calling _queueWrite leaves the PRE-merge
  // array sitting in the outbox — and the flush immediately overwrites the cloud with it. Locally
  // both phones look perfect. The other device's entry is gone from the account, and nobody finds
  // out until a reinstall, a new phone, or Safari-vs-home-screen.
  //
  // core.test.js checks the ARR membership list by parsing the source. That cannot see this: the key
  // IS in the list, the union DOES run, the local array is right, and the data is still lost. So this
  // runs it — a fake user_data map, a pull, a flush — and asserts THE CLOUD ROW, not the local one.
  //
  // Two things this got wrong first, both worth keeping written down. data_value is a jsonb column,
  // so it comes back PARSED; a JSON string in the stub makes Array.isArray(cv) false and the union
  // silently never runs. And each key needs its OWN context — sharing a page shares the outbox and
  // the key-ts map, and the leftovers made the next key look broken.
  {
    const results = {};
    for (const KEY of ['totry_prayers','totry_workouts','totry_journal']) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        s('totry_onboarded',true); s('totry_name','Sam'); });
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2600);
      results[KEY] = await page.evaluate(async (KEY) => {
        const CLOUD = new Map();
        sb = { from: () => ({
          upsert: async (row) => { CLOUD.set(row.data_key, { data_value:row.data_value, updated_at:row.updated_at }); return { error:null }; },
          select: () => ({ eq: () => Promise.resolve({
            data: [...CLOUD.entries()].map(([k,v]) => ({ data_key:k, data_value:v.data_value, updated_at:v.updated_at })),
            error: null }) })
        })};
        currentUser = { id:'test-user' };
        syncEnabled = true;
        // Stop the app's OWN loop first. startSyncLoop keeps a 20s retry interval and re-pulls on
        // visibilitychange; with it live, a background flush lands between the pull and the flush
        // being driven here and the test measures a race instead of the merge. It passed alone and
        // failed under load — the definition of a test that should not be trusted.
        try { if (typeof syncInterval !== 'undefined' && syncInterval) { clearInterval(syncInterval); syncInterval = null; } } catch(e){}
        window.__consistencyHooked = true;         // and stop it re-arming
        const ck = (typeof _cloudKey === 'function') ? _cloudKey(KEY) : KEY;
        // device B put 1 and 3 in the cloud; this device has 1 and 2, with 2 still in the outbox
        CLOUD.set(ck, { data_value:[{ id:1, ts:'2026-08-01T00:00:00.000Z' },
                                    { id:3, ts:'2026-08-03T00:00:00.000Z' }],
                        updated_at:'2026-08-03T00:00:00.000Z' });
        ls(KEY, [{ id:1, ts:'2026-08-01T00:00:00.000Z' }, { id:2, ts:'2026-08-02T00:00:00.000Z' }]);
        if (typeof _queueWrite === 'function') _queueWrite(KEY, ls(KEY));
        await pullFromCloud();                     // exactly what startSyncLoop does,
        await new Promise(x=>setTimeout(x,220));
        // DRAIN, do not sleep. flushOutbox returns immediately when a flush is already in flight
        // (`if(_flushing) return`), which happens whenever the app's own sync loop is mid-cycle — so a
        // single call plus a fixed wait passed alone and failed under load. That is a flaky test, which
        // is worse than no test: it teaches people to ignore a red line that sometimes means data loss.
        // Poll the CLOUD until it converges, rather than flushing once and sleeping. flushOutbox
        // returns immediately when a flush is already in flight (`if(_flushing) return`), and the
        // app's own startSyncLoop is live in this page — so a single call plus a fixed wait passed
        // when run alone and failed under load. A flaky test here is worse than none: it teaches
        // people to ignore a red line that sometimes means real data loss. Convergence is also the
        // honest property — the merged truth has to reach the account, not merely be queued once.
        const readCloud = () => { try { const raw = CLOUD.get(ck).data_value;
          return (typeof raw === 'string' ? JSON.parse(raw) : raw).map(x => x.id).sort(); } catch(e){ return []; } };
        let cloud = [];
        for (let i = 0; i < 50; i++) {
          await flushOutbox();
          await new Promise(x=>setTimeout(x,120));
          cloud = readCloud();
          if (JSON.stringify(cloud) === JSON.stringify([1,2,3])) break;
        }
        return { local:(ls(KEY)||[]).map(x=>x.id).sort(), cloud };
      }, KEY);
      await ctx.close();
    }
    let merged = 0;
    for (const key of Object.keys(results)) {
      const want = JSON.stringify([1,2,3]);
      if (JSON.stringify(results[key].local) !== want)
        findings.push(`sync: ${key} did not union locally — got ${JSON.stringify(results[key].local)}`);
      else if (JSON.stringify(results[key].cloud) !== want)
        findings.push(`sync: ${key} merged locally but the CLOUD row is ${JSON.stringify(results[key].cloud)} — the other device's entry was deleted from the account, and both phones still look fine`);
      else merged++;
    }
    if (merged === Object.keys(results).length)
      console.log(`sync: ${merged} unioned stores survive pull\u2192flush in the CLOUD, not just locally`);
  }

  // ── a delete must remove exactly the thing that was tapped ─────────────────────────────────
  // There is no undo for most of these, and what they remove is a person's own writing — a journal
  // entry, a letter, someone they pray for. The failure mode is an index or id that no longer lines
  // up with the rendered order, so a neighbour disappears instead and there is nothing to say so.
  // Three items each time, delete the MIDDLE, assert the other two survive and the middle does not.
  {
    const CASES = [
      { fn:'deleteJournalEntry',       key:'totry_journal',       mk:i=>({ts:'2026-08-0'+(i+1)+'T02:00:00.000Z', text:'entry'+i}), arg:a=>a[1].ts, id:e=>e.text },
      { fn:'deleteLetter',             key:'totry_letters',       mk:i=>({id:100+i, text:'letter'+i, ts:'2026-08-0'+(i+1)}),       arg:a=>a[1].id, id:e=>e.text },
      { fn:'deletePrayer',             key:'totry_prayers',       mk:i=>({id:200+i, text:'prayer'+i, ts:'2026-08-0'+(i+1)}),       arg:a=>a[1].id, id:e=>e.text },
      { fn:'deleteRelationship',       key:'totry_relationships', mk:i=>({id:300+i, name:'person'+i, role:'friend'}),              arg:a=>a[1].id, id:e=>e.name },
      { fn:'deleteWeightEntry',        key:'totry_body',          mk:i=>({date:'2026-08-0'+(i+1), weight:80+i, ts:'2026-08-0'+(i+1)+'T02:00:00.000Z'}), arg:a=>a[1].ts, id:e=>String(e.weight) },
      { fn:'deleteWorkoutFromHistory', key:'totry_workouts',      mk:i=>({id:400+i, title:'w'+i, date:'2026-08-0'+(i+1), ts:'2026-08-0'+(i+1)+'T02:00:00.000Z'}), arg:a=>a[1].id, id:e=>e.title },
      { fn:'deleteMeasurement',        key:'totry_measurements',  mk:i=>({date:'2026-08-0'+(i+1), chest:90+i}),                    arg:()=>1,      id:e=>String(e.chest) },
      { fn:'deleteSavedVerse',         key:'totry_sv',            mk:i=>({verse:'v'+i, reference:'Ref '+i}),                       arg:()=>1,      id:e=>e.verse },
      { fn:'deleteRoutine',            key:'totry_routines',      mk:i=>({id:500+i, name:'r'+i, exercises:[]}),                    arg:a=>a[1].id, id:e=>e.name },
      { fn:'deleteTransaction',        key:'totry_transactions',  mk:i=>({id:600+i, name:'t'+i, amount:10+i, date:'2026-08-0'+(i+1)}), arg:a=>a[1].id, id:e=>e.name },
    ];
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    let exact = 0;
    for (const c of CASES) {
      const r = await page.evaluate(async (c) => {
        window.askConfirm = async () => true;                     // the person confirms
        window.tellUser = () => {};
        const mk = new Function('i','return ('+c.mk+')(i)');
        const idOf = new Function('e','return ('+c.id+')(e)');
        const argOf = new Function('a','return ('+c.arg+')(a)');
        const arr = [0,1,2].map(mk);
        ls(c.key, JSON.parse(JSON.stringify(arr)));
        if (typeof window[c.fn] !== 'function') return { missing:true };
        try { await window[c.fn](argOf(arr)); } catch(e){ return { threw:String(e.message).slice(0,60) }; }
        await new Promise(x=>setTimeout(x,350));
        return { left:(ls(c.key)||[]).map(idOf), want:[idOf(arr[0]), idOf(arr[2])], target:idOf(arr[1]) };
      }, { fn:c.fn, key:c.key, mk:String(c.mk), id:String(c.id), arg:String(c.arg) });
      if (r.missing)    findings.push(`delete: ${c.fn} does not exist`);
      else if (r.threw) findings.push(`delete: ${c.fn} threw — ${r.threw}`);
      else if (JSON.stringify(r.left) !== JSON.stringify(r.want))
        findings.push(`delete: ${c.fn} left ${JSON.stringify(r.left)} — it should have removed only "${r.target}"`);
      else exact++;
    }
    if (exact === CASES.length) console.log(`deletes: all ${exact} remove exactly the item that was tapped`);
    await ctx.close();
  }

  // ── one missing field must not empty a whole panel ──────────────────────────────────────────
  // renderRelationships did p.role.toUpperCase() unguarded and interpolated p.name raw. A row without
  // a role — which is what an older backup or a merge from another device can hand it, now that this
  // store is in the cloud union — threw mid-render, and a throw mid-render takes out everything after
  // it. That is how Money's entire lower half once vanished for every debt-free user.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam');
      s('totry_relationships',[{ id:1, name:'Jo <the boss>', role:'friend' },
                               { id:2, name:'Pat' },                        // no role at all
                               { id:3, name:'Sam & Kim', role:'family' }]);
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const r = await page.evaluate(async () => {
      go('reflect'); await new Promise(x=>setTimeout(x,700));
      let threw = null;
      try { renderRelationships(); } catch(e){ threw = String(e.message).slice(0,60); }
      await new Promise(x=>setTimeout(x,300));
      const box = document.getElementById('relationships-list');
      const txt = box ? (box.innerText||'') : '';
      return { threw, shown:['Jo <the boss>','Pat','Sam & Kim'].filter(n => txt.includes(n)) };
    });
    if (r.threw) findings.push(`render: one relationship with no role threw and emptied the panel — ${r.threw}`);
    else if (r.shown.length !== 3)
      findings.push(`render: only ${r.shown.length} of 3 people rendered — ${JSON.stringify(r.shown)} (an angle bracket in a name is eaten as a tag)`);
    else console.log('render: a role-less row and names with < and & all survive');
    await ctx.close();
  }

  // ── the backup has to come back ──────────────────────────────────────────────────────────────
  // This is the promise a person leans on when they change phones, and it fails in two directions.
  // Silently dropping a key loses years of someone's own record with no error to see. Including the
  // sign-in token does the opposite — a backup is a file people mail themselves and drop in cloud
  // storage, so a session in it is a session handed to whoever reads that folder. backupSafeKey()
  // guards both ends, and this drives it: export, wipe the device, import, compare.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    // seeded ONCE — the import reloads the page, and a seed that re-runs would overwrite exactly what
    // the restore just wrote and read as data loss. That mistake cost a real diagnosis here.
    await page.addInitScript(() => {
      if (localStorage.getItem('__seeded')) return;
      localStorage.setItem('__seeded','1');
      const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name',"Sam O'Brien");   // an apostrophe has broken this app before
      s('totry_v',[{ n:'Porn', mode:'quit', startDate:'2026-07-14T02:00:00.000Z', total:3 }]);
      s('totry_nutlog',{ '01/08/2026':[{ name:'Chicken & rice', cal:650, pro:55, ts:'2026-08-01T02:00:00.000Z' }] });
      s('totry_f',{ d:[{ n:"Mum's loan", t:5000, p:1200 }], income:5200 });
      s('totry_weight_unit','lb'); s('totry_currency','GBP');
      localStorage.setItem('sb-access-token','SECRET-MUST-NOT-EXPORT');
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);

    const exp = await page.evaluate(async () => {
      let captured = null;
      const real = SaveFile.save;
      SaveFile.save = async (blob) => { captured = await blob.text(); return true; };
      await exportAllData();
      SaveFile.save = real;
      if (!captured) return { failed:'export produced no file' };
      return { blob: captured, leaked: captured.includes('SECRET-MUST-NOT-EXPORT'),
               keys: Object.keys(JSON.parse(captured).data || JSON.parse(captured)).length };
    });
    if (exp.failed) findings.push(`backup: ${exp.failed}`);
    else {
      if (exp.leaked) findings.push('backup: the sign-in token is INSIDE the exported file');
      if (exp.keys < 5) findings.push(`backup: only ${exp.keys} keys exported`);
      const before = await page.evaluate(() => ['totry_name','totry_v','totry_nutlog','totry_f','totry_weight_unit','totry_currency']
        .reduce((o,k)=>(o[k]=JSON.stringify(ls(k)),o),{}));
      try {
        await page.evaluate(async (blobText) => {
          localStorage.clear(); localStorage.setItem('__seeded','1');   // a brand-new phone
          window.askConfirm = async () => true;
          importAllData({ target:{ files:[new File([blobText],'b.json',{type:'application/json'})], value:'x' } });
          await new Promise(x=>setTimeout(x,1200));
        }, exp.blob);
      } catch (e) { /* it reloads; that is the point */ }
      await page.waitForLoadState('networkidle').catch(()=>{});
      await page.waitForTimeout(3000);
      const after = await page.evaluate(() => ['totry_name','totry_v','totry_nutlog','totry_f','totry_weight_unit','totry_currency']
        .reduce((o,k)=>(o[k]=JSON.stringify(ls(k)),o),{}));
      const lost = Object.keys(before).filter(k => before[k] !== after[k]);
      if (lost.length) findings.push(`backup: ${lost.join(', ')} did not survive the round trip`);
      if (!/O'Brien/.test(String(after.totry_name||''))) findings.push('backup: an apostrophe in a name did not survive');
      if (!lost.length && !exp.leaked)
        console.log(`backup: ${exp.keys} keys out, wiped, restored identically, no token in the file`);
    }
    await ctx.close();
  }

  // ── a run logged in miles must READ in miles, everywhere ───────────────────────────────────
  // saveCardioManually always interpreted the input correctly (it multiplies by 1609.34), so a logged
  // distance was never wrong — it was ignored. Every display divided by 1000 and wrote "km", so a
  // person who set miles, typed 2, and was shown an 8'00"/mi pace on that very form then saw "3.2km"
  // in their history, their weekly summary and the context handed to the coach. The edit dialog was
  // worse than cosmetic: it hardcoded *1000 on save, so editing that 2-mile run stored 2000m — 1.24
  // miles — quietly shortening a run they had already done.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      localStorage.clear(); s('totry_onboarded',true); s('totry_name','Sam');
      const iso=new Date().toISOString();
      s('totry_workouts',[{ date:iso.slice(0,10), ts:iso, title:'Morning run', type:'Run',
                            distance:3219, durationMin:16, calories:220 }]);   // 3219m = 2.00 miles
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const read = await page.evaluate(async () => {
      const out = {};
      for (const u of ['km','mi']) {
        ls('totry_distance_unit', u);
        go('grow'); await new Promise(x=>setTimeout(x,450));
        renderUnifiedTraining(); await new Promise(x=>setTimeout(x,550));
        const t = (document.getElementById('pt-strava-card')||{}).innerText || '';
        out[u] = [...new Set(t.match(/[\d.]+\s?(km|mi)\b/g) || [])];
      }
      // and the round trip through the entry path
      ls('totry_distance_unit','mi');
      out.twoMiles = dispToM(2);                 // 3219
      out.backAgain = Math.round(mToDisp(3219) * 100) / 100;   // 2
      return out;
    });
    if (read.km.some(x => /mi\b/.test(x)))
      findings.push(`distance: a km user is shown ${read.km.filter(x=>/mi\b/.test(x)).join(', ')}`);
    if (read.mi.some(x => /km\b/.test(x)))
      findings.push(`distance: a miles user is still shown ${read.mi.filter(x=>/km\b/.test(x)).join(', ')} — the setting is being ignored`);
    if (!read.km.length || !read.mi.length)
      findings.push(`distance: no distance rendered at all — ${JSON.stringify(read)}`);
    if (Math.abs(read.twoMiles - 3219) > 2 || Math.abs(read.backAgain - 2) > 0.02)
      findings.push(`distance: the round trip drifts — 2mi → ${read.twoMiles}m → ${read.backAgain}mi`);
    if (!findings.some(f => f.startsWith('distance:')))
      console.log(`distance: ${read.km.join(',')} in km and ${read.mi.join(',')} in miles, round trip exact`);
    await ctx.close();
  }

  // ── the same body must get the same numbers in either unit ─────────────────────────────────
  // Storage is canonical kilograms and Mifflin-St Jeor takes kilograms, so the ONLY thing standing
  // between a person on pounds and a confidently wrong calorie target is interpretation at the input.
  // With that interpretation removed, someone typing 181.7 meaning pounds is handed 4335 cal instead
  // of 2797 — a 55% over-target, with nothing on screen to suggest anything is wrong. That is the
  // failure this asserts against, so it compares the SAME BODY entered both ways.
  {
    const targets = {};
    for (const [unit, typed] of [['kg', 82.4], ['lb', 181.7]]) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(u => { localStorage.clear();
        const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        s('totry_onboarded',true); s('totry_name','Sam'); s('totry_sex','male'); s('totry_weight_unit',u);
      }, unit);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2600);
      targets[unit] = await page.evaluate(async (typed) => {
        go('nourish'); await new Promise(x=>setTimeout(x,700));
        const set=(id,v)=>{ const el=document.getElementById(id); if(!el) return false;
          el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); return true; };
        if(!(set('tdee-age',30) && set('tdee-weight',typed) && set('tdee-height',180))) return null;
        const label=(document.getElementById('tdee-weight-label')||{}).textContent||'';
        calcTDEE();
        await new Promise(x=>setTimeout(x,500));
        const txt=document.getElementById('tab-nourish').innerText||'';
        const m=txt.match(/(\d{3,4})\s*\n?\s*CAL/i);
        return { label, cal: m ? parseInt(m[1]) : null };
      }, typed);
      await ctx.close();
    }
    if (!targets.kg || !targets.lb || targets.kg.cal == null || targets.lb.cal == null)
      findings.push(`weight units: could not read a calorie target — ${JSON.stringify(targets)}`);
    else {
      // within rounding: 181.7lb really is 82.42kg, so a calorie or two apart is correct
      const gap = Math.abs(targets.kg.cal - targets.lb.cal);
      if (gap > 5) findings.push(`weight units: the same body gets ${targets.kg.cal} cal in kg and ${targets.lb.cal} cal in lb — the pounds entry is not being interpreted`);
      if (!/kg/.test(targets.kg.label)) findings.push(`weight units: the kg user's input is labelled "${targets.kg.label}"`);
      if (!/lb/.test(targets.lb.label)) findings.push(`weight units: the lb user's input is still labelled "${targets.lb.label}" — this is how 180lb became 180kg`);
      if (gap <= 5 && /lb/.test(targets.lb.label))
        console.log(`weight units: same body, ${targets.kg.cal} cal in kg and ${targets.lb.cal} in lb, each box labelled right`);
    }
  }

  // ── integration IS the product: every front must reach the one brief ────────────────────────
  // The app's whole claim is that it sees the WHOLE person, so its counsel is true in a way a
  // single-feature app's cannot be. That claim lives or dies on one string: getLifeState().brief, the
  // text handed to the model. If a front stops reaching it, nothing throws and nothing looks broken —
  // the coach just quietly stops knowing what the person ate, or how they slept, and still answers
  // confidently. That is this repo's signature failure, aimed at its central promise.
  //
  // The storage shapes below are exact and were each got wrong once while writing this:
  //   totry_nutlog   — an OBJECT keyed by toLocaleDateString('en-AU'), entries use cal / pro
  //   totry_trackers — also keyed en-AU, sleep in hours under .sleep
  //   totry_workouts — an array; the session name is .title (.name is ignored)
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const brief = await page.evaluate(() => {
      const iso = new Date().toISOString();
      const au  = new Date().toLocaleDateString('en-AU');
      ls('totry_v',[{ n:'Porn', mode:'quit', startDate:new Date(Date.now()-12*864e5).toISOString() }]);
      ls('totry_nutlog',{ [au]:[{ name:'Chicken and rice', cal:650, pro:55, carb:70, fat:12, ts:iso }] });
      ls('totry_workouts',[{ date:iso.slice(0,10), ts:iso, title:'Push day', volume:8200, sets:18,
        exercises:[{ name:'Bench Press', sets:[{ weight:80, reps:5, done:true }] }] }]);
      ls('totry_body',[{ date:iso.slice(0,10), weight:82.4, ts:iso }]);
      ls('totry_trackers',{ [au]:{ sleep:7.5, sleepQuality:7, mood:6 } });
      const f = ls('totry_f') || {}; f.d = [{ n:'Car loan', t:5000, p:1200 }]; ls('totry_f', f);
      const st = getLifeState();
      return { text: st && st.brief ? st.brief : '', todayCal: st && st.nutrition && st.nutrition.todayCal,
               todayPro: st && st.nutrition && st.nutrition.todayPro };
    });
    const want = [
      ['training',  /Push day/],
      ['nutrition', /650 cal/],
      ['protein',   /55g/],
      ['body',      /82\.4 ?kg/],
      ['sleep',     /Sleep: 7\.5h/],
      ['the fight', /12 days clean/],
      ['money',     /3800|3,800/],
    ];
    const missing = want.filter(([, re]) => !re.test(brief.text)).map(([n]) => n);
    if (!brief.text) findings.push('integration: getLifeState() produced no brief at all');
    else if (missing.length)
      findings.push(`integration: ${missing.join(', ')} never reach the brief the model is given — "${brief.text.replace(/\s+/g,' ').slice(0,110)}"`);
    else console.log(`integration: all 7 threads reach the one brief (${brief.text.length} chars)`);
    await ctx.close();
  }

  // ── it has to work with the network cut ────────────────────────────────────────────────────
  // "Two taps from anywhere, no typing, works offline" is the claim the whole in-the-moment path
  // rests on, and nothing in this gate has ever tested the offline half of it. A person reaching for
  // this app at 2am on bad reception is exactly the person it was built for. The service worker is
  // cache-first, so the failure mode would not be an error — it would be a white screen.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(3200);
    const sw = await page.evaluate(async () => {
      if (!navigator.serviceWorker) return { registered:false };
      const reg = await navigator.serviceWorker.getRegistration();
      return { registered: !!reg, active: !!(reg && reg.active) };
    });
    if (!sw.active) findings.push('offline: the service worker never became active, so nothing is cached');
    await page.waitForTimeout(1500);            // let the shell finish precaching

    await ctx.setOffline(true);                 // network gone entirely
    let booted = true, why = '';
    try { await page.reload({ waitUntil:'domcontentloaded', timeout:20000 }); }
    catch (e) { booted = false; why = String(e.message).slice(0,70); }
    await page.waitForTimeout(3000);

    if (!booted) findings.push(`offline: the app will not even load without the network — ${why}`);
    else {
      const r = await page.evaluate(async () => {
        const vis = el => { if(!el) return false; const q = el.getBoundingClientRect();
          return q.width>0 && q.height>0 && getComputedStyle(el).display !== 'none'; };
        const out = { booted: typeof go === 'function',
                      chars: (document.body.innerText||'').trim().length,
                      orb: vis(document.getElementById('need-talk-btn')) };   // the orb IS #need-talk-btn
        if (typeof openFeelingDoor === 'function') {
          openFeelingDoor();
          await new Promise(x=>setTimeout(x,600));
          const fd = document.getElementById('feel-door');
          out.doorOpens = vis(fd);
          const btn = fd && [...fd.querySelectorAll('button')].filter(vis).find(x => /Restless|Anxious/i.test(x.innerText||''));
          if (btn) {
            btn.click();
            await new Promise(x=>setTimeout(x,900));
            out.moved = !![...document.querySelectorAll('.modal-bg.open, .breath-overlay, .companion-overlay.open')].filter(vis).pop();
          }
        }
        return out;
      });
      if (!r.booted)      findings.push('offline: the page loaded but the app never booted');
      if (r.chars < 400)  findings.push(`offline: the app booted to almost nothing (${r.chars} chars)`);
      if (!r.orb)         findings.push('offline: the orb — the primary action — is not on screen');
      if (!r.doorOpens)   findings.push('offline: the Feeling Door will not open');
      if (!r.moved)       findings.push('offline: naming a feeling leads nowhere');
      if (r.booted && r.orb && r.doorOpens && r.moved)
        console.log('offline: boots, orb present, Feeling Door opens and moves a person');
    }
    await ctx.close();
  }

  // ── the Feeling Door: every path has to MOVE someone ────────────────────────────────────────
  // This is the app's primary entry point — a person taps the orb because they feel something, not
  // because they want to log something. Seven feelings, and the thing that would rot silently is a
  // path whose primary button opens a modal that only closes again: it looks built, it reads well,
  // and it hands the person back to their phone. So this clicks each one and asserts where it LANDS.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); s('totry_faith_tradition','christianity'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const feels = await page.evaluate(async () => {
      const out = {};
      for (const f of ['restless','flat','anxious','down','procrast','angry','good']) {
        document.querySelectorAll('.modal-bg.open:not([id]),.breath-overlay,#form-modal').forEach(e=>e.remove());
        document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
        if (typeof go === 'function') go('home');            // or the previous feeling's tab leaks in
        await new Promise(x=>setTimeout(x,160));
        _feelMove(f);
        await new Promise(x=>setTimeout(x,240));
        const m = document.querySelector('.modal-bg.open:not([id])');
        if (!m) { out[f] = 'the door never opened'; continue; }
        const primary = [...m.querySelectorAll('button')].find(x => {
          const a = (x.getAttribute('onclick')||'').trim();
          return a && !/^closeModal\(this\)$/.test(a);       // a button that only closes is not a move
        });
        if (!primary) { out[f] = 'no action but close'; continue; }
        primary.click();
        await new Promise(x=>setTimeout(x,650));
        const vis = el => { if(!el) return false; const r = el.getBoundingClientRect();
          return r.width>0 && r.height>0 && getComputedStyle(el).display !== 'none'; };
        const breath = document.querySelector('.breath-overlay');
        const comp   = document.querySelector('.companion-overlay.open');
        const form   = document.getElementById('form-modal');   // openFormModal DOES carry an id
        const sheet  = document.querySelector('.modal-bg.open:not([id])');
        if (vis(breath) || vis(comp) || vis(form) || vis(sheet)) { out[f] = 'ok'; continue; }
        const pane = [...document.querySelectorAll('[id^="tab-"]')].find(t => getComputedStyle(t).display !== 'none');
        out[f] = (pane && pane.id && pane.id !== 'tab-home') ? 'ok' : 'landed nowhere — the door closed on them';
      }
      return out;
    });
    const bad = Object.keys(feels).filter(k => feels[k] !== 'ok');
    bad.forEach(k => findings.push(`feeling door "${k}": ${feels[k]}`));
    console.log(`feeling door: ${bad.length ? bad.length + ' dead path(s)' : 'all 7 paths move a person'}`);
    await ctx.close();
  }

  // ── what round three found: fixes that were still not finished ─────────────────────────────
  {
    // 1. A DRAG THE OS INTERRUPTS MUST NOT STICK. `dragging` was only cleared in touchend, which was
    //    self-correcting while touchstart always re-armed. v544 added early returns ABOVE that
    //    assignment, so a touchcancel — an incoming call, a Control Centre pull, the UA claiming the
    //    gesture — left dragging stuck true for the rest of the session, and the next ordinary scroll
    //    closed the companion. The harm v544 removed, made permanent.
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 }, hasTouch:true, isMobile:true });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2600);
    const geo = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      openCompanion(); await new Promise(x=>setTimeout(x,600));
      const conv = document.getElementById('comp-conversation');
      if(!conv) return null;
      const ph = conv.closest('.comp-phase');
      if(ph && typeof _compPhase === 'function') _compPhase(ph.id);
      await new Promise(x=>setTimeout(x,300));
      conv.innerHTML = '';
      for(let i=0;i<12;i++){ const d=document.createElement('div');
        d.style.cssText='padding:14px;margin:6px 0'; d.textContent='message '+i; conv.appendChild(d); }
      await new Promise(x=>setTimeout(x,250));
      const sheet=document.getElementById('companion-overlay');
      return { sheetTop:Math.round(sheet.getBoundingClientRect().top),
               convTop:Math.round(conv.getBoundingClientRect().top) };
    });
    if (!geo) findings.push('companion: no conversation to test the interrupted drag against');
    else {
      const cdp = await ctx.newCDPSession(page);
      // start on the handle, then let the OS take the gesture away
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart', touchPoints:[{x:207,y:geo.sheetTop+20}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',  touchPoints:[{x:207,y:geo.sheetTop+80}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      await page.waitForTimeout(300);
      // now the ordinary gesture: scroll the conversation
      const y = geo.convTop + 120;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart', touchPoints:[{x:207,y}]});
      for(let dy=20; dy<=150; dy+=30)
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove', touchPoints:[{x:207,y:y+dy}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',   touchPoints:[]});
      await page.waitForTimeout(500);
      const stillOpen = await page.evaluate(() => { const s=document.getElementById('companion-overlay');
        return s.classList.contains('open') && getComputedStyle(s).display !== 'none'; });
      if (!stillOpen) findings.push('companion: after a drag the OS interrupted, an ordinary scroll DISMISSES the sheet — the stale drag state never cleared');
      else console.log('companion: an interrupted drag does not arm the next scroll');
      await cdp.detach();
    }
    await ctx.close();
  }

  {
    // 2. A MODERATED SUBSTANCE VICE KEEPS ITS SUPPLY FACT. nextBuyInDays comes from lastPurchase,
    //    which saveViceUse advances in EVERY mode — it is a checkable fact about their own cupboard,
    //    not a claim about a streak. v544's blanket `return null` took it away with the money, and
    //    that line was the only concrete thing on the craving door for someone moderating.
    // 3. And the reclaimed note must state the POOLED position: totalReclaimed nets owed per-vice and
    //    floors at zero, so it used to announce a subtraction across vices that never happened.
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      const d=i=>new Date(Date.now()-i*864e5).toISOString();
      s('totry_onboarded',true); s('totry_name','Sam');
      s('totry_v',[{ n:'Vape', mode:'quit', startDate:d(100), costAmount:30, costPer:'week', owed:0 },
                   { n:'Weed', mode:'moderate', limit:2, startDate:d(100), type:'weed',
                     costAmount:120, costPer:'purchase', lastsDays:30, lastPurchase:d(12), owed:200 }]);
      s('totry_f',{ d:[{ n:'Car loan', t:5000, p:1200 }], income:5200 });
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const r = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('fight'); await new Promise(x=>setTimeout(x,800));
      openMomentStakes(1);                                  // the moderated one
      await new Promise(x=>setTimeout(x,600));
      const m = document.querySelector('.modal-bg.open:not([id])');
      const supply = /don.t need to buy for another/i.test(m ? (m.innerText||'') : '');
      document.querySelectorAll('.modal-bg.open:not([id])').forEach(e=>e.remove());
      go('money'); await new Promise(x=>setTimeout(x,1000));
      const note = document.getElementById('reclaim-owed-note');
      return { supply, note: note ? (note.innerText||'').replace(/\s+/g,' ').trim() : '',
               reclaimed: (typeof totalReclaimed==='function') ? totalReclaimed() : null };
    });
    if (!r.supply)
      findings.push('craving door: a moderated substance vice lost its supply line — the one concrete fact it had');
    else if (/after clearing/i.test(r.note))
      findings.push(`money: the note claims the figure is net of a debt it never subtracted — "${r.note.slice(0,70)}"`);
    else console.log('fixes: a moderated vice keeps its supply fact, and the reclaimed note states the pooled position');
    await ctx.close();
  }

  {
    // 4. THE PROTEIN AVERAGE MUST INCLUDE TODAY. A rolling 168-hour window can hold EIGHT en-AU day
    //    keys, so the count is capped at seven — but slice(0,7) took them in insertion order, which
    //    dropped whichever was inserted last, usually today. Nothing tested it: no other seed makes
    //    more than five days, so the fix could be reverted and the whole suite still passed.
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      const hAgo=h=>new Date(Date.now()-h*3600e3).toISOString();
      s('totry_onboarded',true); s('totry_name','Sam');
      s('totry_workouts',[{ id:1, ts:hAgo(20), date:hAgo(20).slice(0,10), title:'Push', volume:8000, sets:16, calories:400 }]);
      // EIGHT distinct en-AU day keys, by construction rather than by hoping. Deriving both the key
      // and the timestamp from the same hours-ago figure collapsed to six or seven keys depending on
      // the hour the suite ran, so no cap ever applied and this passed identically with the fix
      // reverted — the exact "passes for the wrong reason" it was written to catch.
      //
      // The key is the CALENDAR DAY (0..7 ago = eight distinct dates, always) and the timestamp is
      // what the 168-hour window filters on, so they are set independently. Oldest is inserted first,
      // so today lands in position 8 and an insertion-order slice(0,7) drops it. Today is the only
      // day at 200g: dropped, the average is 50; kept, it is 71.
      const g = {};
      for (let i = 7; i >= 0; i--) {
        const key = new Date(Date.now() - i*864e5).toLocaleDateString('en-AU');
        g[key] = [{ name:'Meal', cal:700, pro:(i===0?200:50), ts:hAgo(i*20 + 1) }];
      }
      s('totry_nutlog', g);
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2600);
    const line = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('grow'); await new Promise(x=>setTimeout(x,900));
      const el = document.getElementById('hand-nourish');
      return el && el.classList.contains('on') ? (el.textContent||'').trim() : '';
    });
    const m = line.match(/(\d+)\s*of\s*7 days fuelled/);
    const pro = line.match(/(\d+)g protein/);
    // eight keys must actually have been created, or the cap is untested and this proves nothing
    if (!m) findings.push(`nourish: no day count in the handoff — "${line.slice(0,54)}"`);
    else if (Number(m[1]) > 7) findings.push(`nourish: "${m[1]} of 7 days fuelled"`);
    else if (!pro || Number(pro[1]) <= 50)
      findings.push(`nourish: today's 200g is missing from the protein average — "${line.slice(0,60)}" — the cap dropped the newest day`);
    else console.log(`nourish: eight day-keys capped to seven and today survives the cap (${pro[1]}g)`);
    await ctx.close();
  }

  // ── the four ways v546/v547 only half-landed ───────────────────────────────────────────────
  // Every one of these is a fix of mine that a second piece of code quietly undid, or that only
  // covered the surface I was looking at. Found by MEASURING the app rather than reading the diff.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      const d=i=>new Date(Date.now()-i*864e5).toISOString();
      s('totry_onboarded',true); s('totry_name','Sam');
      const hist=[]; for(let i=50;i>=0;i--) hist.push({ date:d(i), streakLength:0 });
      // a quit fight at zero AND a moderate fight tracked far longer — the mixed-mode case
      s('totry_v',[{ n:'Lust', mode:'quit', fightingSince:d(104), startDate:d(0),
                     relapseHistory:hist, relapseCount:51, w:3, total:54 },
                   { n:'Drink', mode:'moderate', fightingSince:d(300), startDate:d(300) }]);
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const r = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('fight'); await new Promise(x=>setTimeout(x,1000));
      const out = {};
      // 1. the big clean-day hero is GONE (v550) — with several fights it showed one of them and
      //    contradicted the card open underneath. It must not come back: the screen leads with what
      //    the person did, not with a bigger streak.
      out.hero = document.getElementById('sob-days') ? 'STILL THERE' : 'gone';
      out.stayed = (document.getElementById('fight-evidence')||{}).innerText || '';
      // 2. no filler pattern line on a card whose trigger was never set
      out.card = (document.getElementById('vices-list').innerText||'').replace(/\s+/g,' ').trim();
      // 3. the live clock must still be seconds-free AFTER the ticker has run
      await new Promise(x=>setTimeout(x,2200));
      const clock = document.querySelector('.vice-card .vice-live-clock');
      out.clock = clock ? (clock.textContent||'').trim() : '';
      // 4. the Score panel must not be the same scoreboard of losses one tap away
      const btn = [...document.querySelectorAll('#tab-fight button')].find(x => /^Score$/i.test((x.innerText||'').trim()));
      if(btn){ btn.click(); await new Promise(x=>setTimeout(x,800)); }
      out.score = (document.getElementById('tab-fight').innerText||'').replace(/\s+/g,' ').trim();
      return out;
    });
    if (r.hero !== 'gone')
      findings.push('fight: the 48px clean-day hero is back — with several fights it shows one of them and contradicts the open card');
    // NOT asserted on this seed: it is a person who fell on 51 of the last 51 days, and for them the
    // stayed-in line is deliberately SILENT — "0 of 14" is the scoreboard of losses again. The line
    // is covered by its own case below, with a person it can honestly speak to.
    else if (/\d+h \d+m \d+s/.test(r.stayed))
      findings.push(`fight: seconds are ticking in the evidence line — "${String(r.stayed).slice(0,50)}"`);
    else if (/various situations|various times/i.test(r.card))
      findings.push(`fight: filler pattern line on the card — "${r.card.slice(0,60)}" — the app stating a pattern it does not have`);
    else if (/\d+s\b/.test(r.clock))
      findings.push(`fight: the live clock is ticking seconds ("${r.clock}") — the interval overwrites the seconds-free render one second later`);
    else if (/win rate|no wins yet|urges defeated/i.test(r.score))
      findings.push(`fight: the Score panel still carries the scoreboard of losses — "${r.score.slice(0,80)}"`);
    else if (!/DAYS IN THE FIGHT/i.test(r.score))
      findings.push(`fight: the Score panel does not lead with the fight — "${r.score.slice(0,70)}"`);
    else if (!/URGES MET 3\b/.test(r.score))
      findings.push(`fight: "urges met" is not the real win count — "${r.score.slice(0,80)}" (seeded 3 wins from 54)`);
    else console.log('fight: hero reads the abstinence fight, no filler, no ticking seconds, and Score leads with the fight');
    await ctx.close();
  }

  // ── the card carries what is true, not what could be configured ────────────────────────────
  // Seven controls competed on one card: an unset config row in the top slot, a pledge CTA that
  // duplicates the morning ritual, HALT, the urge door, "I used", the timeline and Manage. Nothing
  // was reachable ONLY here — HALT is the second thing inside the urge door, the pledge is in the
  // morning at the step about setting the day, the timeline keeps its own quiet line — so the cuts
  // remove competition, not paths. That check comes first: never delete a door without opening the
  // other one yourself.
  {
    const cases = [
      { label:'nothing set',   seed:{},                        maxBtns:4, wantNot:/tap to change|make the pledge|hungry, angry/i },
      { label:'pledged today', seed:{ pledged:true },           maxBtns:4, want:/pledged today/i, wantNot:/make the pledge/i },
      { label:'stage set',     seed:{ stage:'rebuilding' },     maxBtns:6, want:/rebuilding/i },
    ];
    for (const c of cases) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(s0 => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        const d=i=>new Date(Date.now()-i*864e5).toISOString();
        const pad=n=>String(n).padStart(2,'0'), t=new Date();
        s('totry_onboarded',true); s('totry_name','Sam');
        const v={ n:'Lust', mode:'quit', fightingSince:d(105), startDate:d(9), lastConfirm:new Date().toISOString() };
        if(s0.stage) v.stage = s0.stage;
        if(s0.pledged){ v.pledge = pad(t.getDate())+'/'+pad(t.getMonth()+1)+'/'+t.getFullYear(); v.pledgeDays = 4; }
        s('totry_v',[v]);
      }, c.seed);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2700);
      const r = await page.evaluate(async () => {
        document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
        go('fight'); await new Promise(x=>setTimeout(x,1000));
        const card = document.querySelector('.vice-card');
        if(!card) return null;
        const vis = el => { const s=getComputedStyle(el); if(s.display==='none') return false;
          const q=el.getBoundingClientRect(); return q.width>0 && q.height>0; };
        const btns = [...card.querySelectorAll('button')].filter(vis);
        return { n: btns.length, txt: (card.innerText||'').replace(/\s+/g,' ').trim(),
                 urgeDoor: btns.some(x => /openMomentStakes/.test(x.getAttribute('onclick')||'')) };
      });
      await ctx.close();
      if (!r) { findings.push(`card (${c.label}): no vice card`); continue; }
      if (!r.urgeDoor) findings.push(`card (${c.label}): the in-the-moment door is not on the card`);
      else if (r.n > c.maxBtns) findings.push(`card (${c.label}): ${r.n} controls, expected at most ${c.maxBtns}`);
      else if (c.want && !c.want.test(r.txt)) findings.push(`card (${c.label}): missing what it should say — "${r.txt.slice(0,56)}"`);
      else if (c.wantNot && c.wantNot.test(r.txt)) findings.push(`card (${c.label}): still offers what belongs elsewhere — "${r.txt.slice(0,56)}"`);
    }
    if (!findings.some(f => f.startsWith('card (')))
      console.log('card: four controls at rest, the urge door always among them, config only once set');
  }

  // ── one action, one place on a screen ─────────────────────────────────────────────────────
  // "there would be more like that where things double up or are redundant." There were: the same
  // action offered twice on one screen, in two visual languages, so the person has to work out
  // whether they are different. Found by grouping every visible control on a tab by the handler it
  // actually fires — which is what makes this checkable rather than a matter of taste.
  //
  // Cross-TAB repetition is fine and deliberate: several screens may legitimately point at Train.
  // This only looks within a single tab.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      const d=i=>new Date(Date.now()-i*864e5).toISOString(), au=i=>new Date(Date.now()-i*864e5).toLocaleDateString('en-AU');
      s('totry_onboarded',true); s('totry_name','Sam'); s('totry_start',d(60));
      s('totry_v',[{ n:'Lust', mode:'quit', fightingSince:d(105), startDate:d(9) }]);
      s('totry_workouts',[{ id:1, ts:d(0), date:d(0).slice(0,10), title:'Push', volume:8000, sets:16, calories:400 }]);
      s('totry_nutlog',{ [au(0)]:[{ name:'Meal', cal:700, pro:50, ts:d(0) }] });
      s('totry_body',[{ date:d(0).slice(0,10), weight:82, ts:d(0) }]);
      s('totry_f',{ d:[{ n:'Car loan', t:5000, p:1200 }], income:5200 });
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2800);
    const dupes = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      const out = [];
      for (const t of ['home','fight','grow','money','soul','nourish','reflect','track']) {
        go(t); await new Promise(x=>setTimeout(x,700));
        const pane = document.getElementById('tab-' + t);
        if(!pane) continue;
        const vis = el => { const c=getComputedStyle(el); if(c.display==='none'||c.visibility==='hidden') return false;
          const q=el.getBoundingClientRect(); return q.width>0 && q.height>0; };
        const byAction = {};
        [...pane.querySelectorAll('button,[onclick]')].filter(vis).forEach(el => {
          // The hero states its destination in dataset.act, not onclick, so its [Close the day] and
          // the evening card's [Reflect on today →] — both go('reflect') — read as two different
          // actions here and the doubling went unseen for exactly that reason. Normalise both forms
          // to the room they open before comparing.
          const HERO = { evening:"go('reflect')", morning:"go('morning')", companion:'openCompanionForUrge()' };
          let act = (el.getAttribute('onclick')||'').replace(/&apos;|&#39;/g, "'").replace(/\s+/g,'');
          if(!act && el.dataset && el.dataset.act) act = (HERO[el.dataset.act]||'').replace(/\s+/g,'');
          if(!act) return;
          // NAVIGATION IS NOT DOUBLING. Two Home entries that lead to Fight while showing different
          // facts — "9 days clean" and "106 days in the fight" — are two truths, not one twice. And a
          // card whose title, body and CTA are all tappable is one thing with a generous target. What
          // this hunts is an ACTION offered twice: two buttons that open the same sheet, log the same
          // thing, fire the same input. Those make a person work out whether they differ.
          if(/^go\(/.test(act)) return;
          // an inline signpost inside a sentence is wayfinding, not a duplicate control
          if(el.tagName !== 'BUTTON' && el.closest('p,div[style*="font-size:11px"]') && (el.innerText||'').length < 22) return;
          const label = (el.innerText||'').replace(/\s+/g,' ').trim().toLowerCase();
          if(label.length < 4) return;
          (byAction[act] = byAction[act] || []).push(label.slice(0,34));
        });
        Object.keys(byAction).forEach(act => {
          if(byAction[act].length > 1)
            out.push(t + ': ' + byAction[act].map(x => '"' + x + '"').join(' and ') + ' → ' + act.slice(0,30));
        });
      }
      return out;
    });
    dupes.forEach(d => findings.push(`doubled: ${d}`));
    if (!dupes.length) console.log('doubling: no action is offered twice on the same screen');
    await ctx.close();
  }

  // ── when the app asks a question, it asks one question ─────────────────────────────────────
  // A check-in due rendered the LARGEST card in the app: the question, plus the stage strip, the
  // pledge row, HALT, the urge door and "I used — log it honestly" — which is the same action as the
  // check-in's own "No — I've used" eleven pixels above it. Two buttons, one outcome, on a card whose
  // entire purpose at that moment is to ask whether someone has been honest. It should be the
  // smallest card, not the biggest.
  {
    for (const [label, due] of [['due', true], ['not due', false]]) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(due => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        const d=i=>new Date(Date.now()-i*864e5).toISOString();
        s('totry_onboarded',true); s('totry_name','Sam');
        s('totry_v',[{ n:'Lust', mode:'quit', fightingSince:d(105), startDate:d(20),
                       lastConfirm: due ? d(20) : new Date().toISOString() }]);
      }, due);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2700);
      const r = await page.evaluate(async () => {
        document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
        go('fight'); await new Promise(x=>setTimeout(x,1000));
        const card = document.querySelector('.vice-card');
        if(!card) return null;
        const vis = el => { const c=getComputedStyle(el); if(c.display==='none') return false;
          const q=el.getBoundingClientRect(); return q.width>0 && q.height>0; };
        const btns = [...card.querySelectorAll('button')].filter(vis);
        return { h: Math.round(card.getBoundingClientRect().height), n: btns.length,
                 logUse: btns.filter(x => /openLogUse/.test(x.getAttribute('onclick')||'')).length,
                 asking: /been a week|still clean/i.test(card.innerText||'') };
      });
      await ctx.close();
      if (!r) { findings.push(`check-in (${label}): no vice card rendered`); continue; }
      if (r.logUse > 1)
        findings.push(`check-in (${label}): "I used" is offered ${r.logUse} times on one card — the check-in's own answer does the same thing`);
      if (due && !r.asking) findings.push('check-in (due): the question does not render');
      if (due && r.n > 5)
        findings.push(`check-in (due): ${r.n} buttons while asking one question — it should be the smallest card, not the biggest`);
    }
    if (!findings.some(f => f.startsWith('check-in')))
      console.log('check-in: while the question stands it is the only thing on the card');
  }

  // ── staying in it is the win ───────────────────────────────────────────────────────────────
  // Alfy, on what winning means: "the user has successfully stayed in the fight" — then correcting
  // my first reading: "stay in the fight is NOT falling for the vices." So it counts days RESISTED,
  // it counts UP, and it is not consecutive: one bad Tuesday does not erase Monday and Wednesday.
  //
  // The two failure modes it must never have. It must not FLATTER — a fixed fortnight window told a
  // brand-new person they had "stayed in it every day this fortnight" before they had fought
  // anything, so the window is the length of the fight and there is a five-day floor. And it must not
  // SHAME — someone who fell every day gets silence, because "0 of 14" is the scoreboard again.
  {
    const cases = [
      { label:'brand new',           seed:{ none:true },            want:null },
      { label:'day 3',               seed:{ fight:3 },              want:null },
      { label:'day 60, every other', seed:{ fight:60, every:2 },    want:/stayed in it 7 of the last 14/i },
      { label:'day 60, clean',       seed:{ fight:60 },             want:/every day this fortnight/i },
      { label:'day 60, fell daily',  seed:{ fight:60, every:1 },    want:null },
    ];
    for (const c of cases) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(c => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        const d=i=>new Date(Date.now()-i*864e5).toISOString();
        s('totry_onboarded',true); s('totry_name','Sam');
        if(c.none){ s('totry_v',[]); return; }
        const uses=[];
        if(c.every) for(let i=13;i>=0;i--) if(i % c.every === 0) uses.push({ v:'Lust', ts:d(i) });
        s('totry_v',[{ n:'Lust', mode:'quit', fightingSince:d(c.fight), startDate:d(0) }]);
        s('totry_vice_uses', uses);
      }, c.seed);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2600);
      const line = await page.evaluate(() => (typeof fightStayedInLine === 'function') ? fightStayedInLine() : 'NO FN');
      await ctx.close();
      if (c.want === null && line)
        findings.push(`stayed-in (${c.label}): claims "${line.slice(0,58)}" when it should say nothing`);
      else if (c.want && !c.want.test(line))
        findings.push(`stayed-in (${c.label}): said "${line.slice(0,58)}"`);
    }
    if (!findings.some(f => f.startsWith('stayed-in')))
      console.log('stayed-in: counts days resisted, silent before it has earned the right to speak');
  }

  // ── the fight is longer than the streak ────────────────────────────────────────────────────
  // Alfy: "i have it for 105 days now but i know i've failed most of those days... I'd want to keep
  // myself at real terms at all times even if that costs me a streak. The point is that i haven't let
  // go of this and still have the heart to come back and try again even if i fell."
  //
  // The app had no number for that. A streak measures the gap since the last fall and says nothing
  // about how long someone has refused to walk away — so telling the truth meant wiping everything,
  // and keeping the number meant living with a lie. Day N of the fight never resets, through a slip
  // OR a deliberate restart, and coming back is counted as coming back.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      const d=i=>new Date(Date.now()-i*864e5).toISOString();
      s('totry_onboarded',true); s('totry_name','Sam');
      s('totry_v',[{ n:'Lust', mode:'quit', fightingSince:d(104), startDate:d(26),
                     relapseHistory:[{ date:d(60), streakLength:20 },{ date:d(26), streakLength:34 }],
                     relapseCount:2 }]);
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const r = await page.evaluate(async () => {
      window.askConfirm = async () => true;
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('fight'); await new Promise(x=>setTimeout(x,1000));
      const read = () => { loadV(); return { fight:viceFightDays(vices[0]), clean:viceCleanDays(vices[0]), back:viceCameBack(vices[0]) }; };
      const out = { start: read() };
      out.card = (document.getElementById('vices-list').innerText||'').replace(/\s+/g,' ').trim();
      // a slip must not shorten the fight
      curVice = 0; logLoss(); await new Promise(x=>setTimeout(x,700));
      out.afterSlip = read();
      document.querySelectorAll('.undo-snack,#undo-snack,[class*=undo]').forEach(e=>e.remove());
      // nor must a deliberate restart — and it must not fake a relapse
      await restartVice(0); await new Promise(x=>setTimeout(x,600));
      out.afterRestart = read();
      return out;
    });
    if (!/Day 105 of the fight/.test(r.card))
      findings.push(`fight: the card does not lead with the fight — "${r.card.slice(0,60)}"`);
    else if (!/came back 2 times/.test(r.card))
      findings.push(`fight: coming back is not counted as coming back — "${r.card.slice(0,60)}"`);
    else if (r.afterSlip.fight < r.start.fight)
      findings.push(`fight: logging a slip cut the fight from ${r.start.fight} to ${r.afterSlip.fight} days — the one thing that should never reset`);
    else if (r.afterRestart.fight < r.start.fight)
      findings.push(`fight: a deliberate restart cut the fight from ${r.start.fight} to ${r.afterRestart.fight} days`);
    else if (r.afterRestart.clean !== 0)
      findings.push(`fight: "start again from today" left the streak at ${r.afterRestart.clean}, so it did not start again`);
    else if (r.afterRestart.back !== r.afterSlip.back)
      findings.push(`fight: choosing to start again was recorded as a relapse (came back ${r.afterSlip.back} → ${r.afterRestart.back}) — it is not a fall`);
    else console.log(`fight: day ${r.start.fight} survives a slip and a restart; the streak resets and the coming back is counted`);
    await ctx.close();
  }

  // ── the fight has to be survivable for someone who falls every day ─────────────────────────
  // Alfy's own words: "i haven't been clean for a long amount of time or ever... I want to be able
  // to be clean and honest and say i have fallen everyday but can't really do that."
  //
  // He was right. Under a heading reading "Every day you try is a day you're winning", someone who
  // had fallen fifteen days running and logged it honestly every time was shown: 0 DAYS CLEAN, WIN
  // RATE 0%, 0/15. A scoreboard of losses. That is not a bug in a number — it is the app punishing
  // the exact honesty it asks for, and it is why the data is bad as well as the person feeling worse.
  {
    const cases = [
      { label:'falls every day',   days:15, wantOften:/this week/i,      wantNo:/win rate|0%/i },
      { label:'was 7, now 4',      taper:true, wantOften:/down from 7/i, wantNo:/win rate|0%/i },
    ];
    for (const c of cases) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(c => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
        const d=i=>new Date(Date.now()-i*864e5).toISOString();
        s('totry_onboarded',true); s('totry_name','Sam'); s('totry_start',d(90));
        const uses=[], hist=[];
        if(c.days){ for(let i=c.days;i>=0;i--){ uses.push({v:'Lust',ts:d(i)}); hist.push({date:d(i),streakLength:0}); } }
        else { [13,12,11,10,9,8,7].forEach(i=>uses.push({v:'Lust',ts:d(i)}));
               [5,4,2,1].forEach(i=>uses.push({v:'Lust',ts:d(i)})); }
        s('totry_v',[{ n:'Lust', mode:'quit', startDate:d(0), total:uses.length,
                       relapseCount:hist.length, relapseHistory:hist }]);
        s('totry_vice_uses', uses);
      }, c);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2700);
      const txt = await page.evaluate(async () => {
        document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
        go('fight'); await new Promise(x=>setTimeout(x,1000));
        const el = document.getElementById('vices-list');
        return el ? (el.innerText||'').replace(/\s+/g,' ').trim() : '';
      });
      if (c.wantNo.test(txt))
        findings.push(`fight (${c.label}): still shows a win rate — "${txt.slice(0,64)}" — a percentage of failure under a heading about winning`);
      else if (!c.wantOften.test(txt))
        findings.push(`fight (${c.label}): no honest frequency read — "${txt.slice(0,64)}"`);
      else if (/\d+h \d+m \d+s/.test(txt))
        findings.push(`fight (${c.label}): a seconds counter is ticking under a zero streak — "${txt.slice(0,58)}"`);
      else if (/various times/i.test(txt))
        findings.push(`fight (${c.label}): "usually hits: various times" — filler dressed as a finding`);
      await ctx.close();
    }
    if (!findings.some(f => f.startsWith('fight (')))
      console.log('fight: someone who falls daily sees how often it is happening, not a 0% win rate');
  }

  {
    // A MIS-TAP MUST NOT COST A STREAK, and money must not be asked of a fight money has nothing to
    // do with. "lust isn't going to cause money?" — it does not, and being asked implies the app has
    // not understood what is being fought.
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      const d=i=>new Date(Date.now()-i*864e5).toISOString();
      s('totry_onboarded',true); s('totry_name','Sam');
      s('totry_v',[{ n:'Lust', mode:'quit', startDate:d(26), total:3, relapseCount:2, cleanDaysTotal:40,
                     relapseHistory:[{date:d(60),streakLength:14},{date:d(26),streakLength:26}] },
                   { n:'Weed', mode:'quit', startDate:d(10) }]);
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    const r = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('fight'); await new Promise(x=>setTimeout(x,900));
      const out = {};
      // does it ask a behaviour vice about money?
      openViceManage(0); await new Promise(x=>setTimeout(x,450));
      out.lustAsksMoney = /money it costs/i.test((document.querySelector('.modal-bg.open:not([id])')||{}).innerText || '');
      document.querySelectorAll('.modal-bg.open:not([id])').forEach(e=>e.remove());
      openViceManage(1); await new Promise(x=>setTimeout(x,450));
      out.weedAsksMoney = /money it costs/i.test((document.querySelector('.modal-bg.open:not([id])')||{}).innerText || '');
      document.querySelectorAll('.modal-bg.open:not([id])').forEach(e=>e.remove());
      // log a slip by accident, then take it back
      loadV();
      out.before = viceCleanDays(vices[0]);
      curVice = 0; logLoss(); await new Promise(x=>setTimeout(x,700));
      loadV(); out.after = viceCleanDays(vices[0]);
      const snack = document.querySelector('.undo-snack,#undo-snack,[class*=undo]');
      const btn = snack ? [...snack.querySelectorAll('button')].find(x => /undo/i.test(x.innerText||'')) : null;
      out.undoOffered = !!btn;
      if(btn){ btn.click(); await new Promise(x=>setTimeout(x,700)); loadV(); out.restored = viceCleanDays(vices[0]); }
      return out;
    });
    if (r.lustAsksMoney) findings.push('fight: the app asks what a lust habit costs in money — it does not cost money');
    else if (!r.weedAsksMoney) findings.push('fight: a substance vice is no longer offered a cost, where money genuinely is part of it');
    else if (!r.undoOffered) findings.push(`fight: logging a slip wiped a ${r.before}-day streak with no undo — the one number people screenshot`);
    else if (r.restored !== r.before) findings.push(`fight: undo left the streak at ${r.restored}, not the ${r.before} it was`);
    else console.log(`fight: a mis-tapped slip is reversible (${r.before} → ${r.after} → ${r.restored}), and only money-shaped fights are asked about money`);
    await ctx.close();
  }

  // ── waiting is a designed state, not a gap ────────────────────────────────────────────────────
  // He went out, got a gyros open plate, photographed it, typed it in, and got nothing he could use.
  // Two separate failures, and neither was an exception anywhere: the results area renders ~180px
  // BELOW the fold on a 414x896 phone, so tapping search moved nothing on screen at all; and the wait
  // was a pulsing line with no elapsed time, no way to stop, and no way to just log the meal, so a
  // slow answer and a dead app looked identical. He gave up before it ever replied. Lunch unlogged.
  //
  // What is asserted is what he was owed: the state is ON SCREEN (geometry, not DOM presence — the
  // same lesson the crisis suite was written for), it proves it is alive, the way out is TAPPABLE
  // from the first second, and the ending says what happened instead of pulsing forever.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { localStorage.setItem('totry_onboarded','true');
      localStorage.setItem('totry_name', JSON.stringify('Alfy')); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2600);
    const food = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('nourish'); await new Promise(r=>setTimeout(r,900));
      const tap = t => { const b=[...document.querySelectorAll('#nut-search-results button')]
          .find(x=>new RegExp(t,'i').test(x.innerText||'')); if(!b) return false;
        const q=b.getBoundingClientRect();
        return q.top<innerHeight && q.bottom>0 && q.height>=24 && q.width>=24; };
      const seen = () => { const r=document.getElementById('nut-search-results').getBoundingClientRect();
        return r.top<innerHeight-60 && r.bottom>0; };
      const out = {};
      // his network: the request that never answers
      window.api = async()=>new Promise(()=>{});
      estimateMealMacros('Gyros open plate');
      await new Promise(r=>setTimeout(r,900));
      out.waitSeen = seen(); out.wayOutNow = tap('myself');
      out.aliveEarly = (document.getElementById('food-wait-el')||{}).textContent || '';
      await new Promise(r=>setTimeout(r,4400));
      out.aliveLater = (document.getElementById('food-wait-el')||{}).textContent || '';
      // the ending
      window.api = async()=>'';
      await estimateMealMacros('Gyros open plate'); await new Promise(r=>setTimeout(r,900));
      const txt = (document.getElementById('nut-search-results').innerText||'');
      out.endSeen = seen(); out.stillPulsing = !!document.querySelector('#nut-search-results .pulsing');
      out.endSays = /could not work/i.test(txt);
      out.endRetry = tap('Try again'); out.endManual = tap('myself');
      // and the retry has to actually re-run it, not just look like a door
      let reran=false; window.api = async()=>{reran=true; return '';};
      const rb=[...document.querySelectorAll('#nut-search-results button')].find(x=>/Try again/i.test(x.innerText));
      if(rb) rb.click(); await new Promise(r=>setTimeout(r,500));
      out.retryWorks = reran;
      return out;
    });
    if (!food.waitSeen)  findings.push('food: the wait renders BELOW the fold — tapping search moves nothing on screen');
    if (!food.wayOutNow) findings.push('food: no way to log the meal himself while the AI is thinking');
    if (!/moment|still working|hold on/i.test(food.aliveEarly))
      findings.push('food: the wait gives no sign it is alive');
    if (!/^\d+s/.test(food.aliveLater))
      findings.push('food: the wait stops counting — a slow answer looks identical to a dead app');
    if (!food.endSeen)      findings.push('food: the failure message renders below the fold');
    if (food.stillPulsing)  findings.push('food: it is STILL pulsing after the call failed');
    if (!food.endSays)      findings.push('food: the ending never says it could not work the meal out');
    if (!food.endRetry || !food.endManual)
      findings.push('food: the ending does not offer both try again and add it myself');
    if (!food.retryWorks)   findings.push('food: "Try again" does not re-run the estimate');
    if (!findings.some(f => f.startsWith('food:')))
      console.log('food: waiting is a designed state — on screen, alive, escapable, and it ends in words');
    await ctx.close();
  }

  // ── two controls must never share a pixel ────────────────────────────────────────────────────
  // The 24pt floor says a control must be big enough to hit. It says nothing about whether the thing
  // you hit is the one you aimed at — and the fix for that floor created exactly that harm: giving
  // .fli-del a 44px box with margin:-13px -12px pulled Edit and Delete 12px toward each other on icons
  // that sat 8px apart, so they overlapped by 18px and Delete, being later in the DOM, won. A tap
  // meant for "fix the numbers" deleted the meal. That is strictly worse than the 19x17 target it
  // replaced: a small button you miss costs a second, a button that silently does the destructive
  // thing costs the entry.
  //
  // Four more pairs were already like this before that fix — the verse's share and save icons (44px
  // boxes 24px apart, so "make a card" and "save" were partly one button), two rows of quick-food
  // chips whose -9px vertical pull made wrapped rows overlap, and the habits "+ Add / edit", whose
  // 17px upward pull reached into the streak card above it.
  //
  // Ancestors are skipped — a card that wraps its own buttons is containment, not collision.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s = (k,v) => localStorage.setItem(k, JSON.stringify(v));
      const N = Date.now(), au = new Date().toLocaleDateString('en-AU');
      s('totry_onboarded', true); s('totry_name', 'Alfy'); s('totry_tour_offered', true);
      s('totry_start', new Date(N - 120*864e5).toISOString());
      s('totry_v', [{ n:'Lust', mode:'abstinence', startDate:new Date(N - 106*864e5).toISOString() }]);
      s('totry_saved_meals', [{ id:1, name:'My usual breakfast', cal:520, pro:38,
        items:[{ name:'Oats', cal:320, pro:11 }] }]);
      s('totry_nutlog', { [au]: [{ id:9, name:'Gyros', brand:'', serving:'1 serving', qty:1,
        cal:720, pro:52, carb:66, fat:26, ts:new Date().toISOString(), meal:'lunch' }] });
      s('totry_body', [{ weight:82.1, ts:new Date().toISOString() }]);
      s('totry_f', { d:[{ n:'Car loan', t:12000, p:3600, r:7.2 }], u:5000, i:0 }); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2800);
    for (const tab of ['home','fight','grow','nourish','track','money','soul']) {
      const hits = await page.evaluate(async (t) => {
        try { go(t); } catch (e) { return []; }
        await new Promise(r => setTimeout(r, 1200));
        const pane = document.getElementById('tab-' + t); if (!pane) return [];
        const els = [...pane.querySelectorAll('button,[onclick]')]
          .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const out = [];
        for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
          const A = els[i], B = els[j];
          if (A.contains(B) || B.contains(A)) continue;
          const a = A.getBoundingClientRect(), b = B.getBoundingClientRect();
          if (a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom) continue;
          const nm = e => (e.innerText || e.getAttribute('aria-label') || e.getAttribute('title') || '?')
            .replace(/\s+/g, ' ').trim().slice(0, 18);
          out.push(`${nm(A)} / ${nm(B)}`);
        }
        return out;
      }, tab);
      hits.forEach(h => findings.push(`overlap: ${tab} — two controls share a hit area: ${h}`));
    }
    await ctx.close();
    if (!findings.some(f => f.startsWith('overlap:')))
      console.log('overlap: no two controls share a pixel on any tab — a tap lands on what it aimed at');
  }

  // ── one gold primary per screen ──────────────────────────────────────────────────────────────
  // The gold fill is the app saying "this is what this screen is for". Money spent it on four buttons
  // at once — the real hero beside "Add this debt", "Add goal" and "Log expense", two of them 440px
  // apart inside one card — and Nourish on three. When every button is the most important one, none
  // of them is, and the screen reads as a pile of features rather than a place with a purpose.
  //
  // Form submits are not heroes. They are what you press once you are already doing the thing.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s = (k,v) => localStorage.setItem(k, JSON.stringify(v));
      const N = Date.now();
      s('totry_onboarded', true); s('totry_name', 'Alfy');
      s('totry_f', { d:[{ n:'Car loan', t:12000, p:3600, r:7.2 }], u:5000, i:0 });
      s('totry_v', [{ n:'Lust', mode:'abstinence', startDate:new Date(N - 30*864e5).toISOString() }]);
      s('totry_transactions', Array.from({ length:8 }, (_, i) => ({ id:i, type:'expense', amount:42.5,
        category:'Food', desc:'Coles', ts:new Date(N - i*864e5).toISOString() }))); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2700);
    for (const t of ['home','fight','grow','nourish','track','money','soul']) {
      const golds = await page.evaluate(async (tab) => {
        go(tab); await new Promise(r => setTimeout(r, 1200));
        const pane = document.getElementById('tab-' + tab); if (!pane) return null;
        const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        return [...pane.querySelectorAll('.btn.primary, .hero-action')].filter(vis)
          .map(e => (e.innerText || '').replace(/\s+/g,' ').trim().slice(0,26)).filter(Boolean);
      }, t);
      if (golds && golds.length > 1)
        findings.push(`gold: ${t} has ${golds.length} competing primaries — ${golds.join(' / ')}`);
    }
    await ctx.close();
    if (!findings.some(f => f.startsWith('gold:')))
      console.log('gold: at most one gold primary per screen — the hero is not sharing its paint with a form submit');
  }

  // ── every tradition gets its own season ──────────────────────────────────────────────────────
  // applyFaithUIGate hides #hub-common-grid whenever ECHO_OK[tradition] is false — islam, hinduism,
  // buddhism — which is the right call for "Shared threads", cross-tradition echoes nobody asked for.
  // "A season of fasting" was sitting inside that same grid, so the identical gate took it too. The
  // function then went on to write "Ramadan" into #hub-fast-desc for a Muslim who could never see it,
  // while a Catholic on the same build was offered Lent. Faith full but never forced cannot mean Lent
  // for one person and nothing for another.
  {
    for (const [t, want] of [['christianity','Lent'], ['islam','Ramadan'], ['hinduism','Navratri'],
                             ['buddhism','Uposatha'], ['secular','own window']]) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript((tr) => { localStorage.setItem('totry_onboarded','true');
        localStorage.setItem('totry_name', JSON.stringify('Alfy'));
        localStorage.setItem('totry_faith_tradition', JSON.stringify(tr));
        localStorage.setItem('totry_faith_level', JSON.stringify('full')); }, t);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2500);
      const r = await page.evaluate(() => { go('soul');
        return new Promise(res => setTimeout(() => {
          const d = document.getElementById('hub-fast-desc');
          const c = d ? d.closest('.hub-card') : null;
          const rc = c ? c.getBoundingClientRect() : null;
          const g = document.getElementById('hub-common-grid');
          res({ vis: !!(rc && rc.width > 0 && rc.height > 0), desc: d ? (d.textContent||'') : '',
                echo: g ? getComputedStyle(g).display : 'absent' });
        }, 1300)); });
      await ctx.close();
      if (!r.vis)  findings.push(`faith: ${t} cannot see "A season of fasting" at all`);
      else if (!r.desc.includes(want))
        findings.push(`faith: ${t} is offered "${r.desc.slice(0,40)}" — expected ${want}`);
      // and the echoes must stay gated the way they were
      const echoWanted = (t === 'christianity' || t === 'secular');
      if (echoWanted && r.echo === 'none')
        findings.push(`faith: ${t} lost Shared threads, which it is meant to have`);
      if (!echoWanted && r.echo !== 'none')
        findings.push(`faith: ${t} is being shown cross-tradition echoes it opted out of`);
    }
    if (!findings.some(f => f.startsWith('faith:')))
      console.log('faith: all five traditions are offered their own fasting season, and only the echo grid stays gated');
  }

  // ── the reliable answer is the one the eye lands on ──────────────────────────────────────────
  // "Gyros open plate" is three words, so searchFood decided it "looks like a meal" and put a
  // GOLD-bordered "✨ Estimate with AI" card ABOVE the rows that USDA, FatSecret, Open Food Facts and
  // Nutritionix had already returned. The least reliable path in the app, dressed as the best one. He
  // tapped it — of course he did, it was the one that looked like the answer — and waited.
  //
  // Two orderings are asserted. With real matches the estimate sits UNDER them, quiet. With no
  // connection at all, the option that works offline comes FIRST: the other two need a network they
  // do not have, and offering them at the top of a dead screen is the app not knowing where it is.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { localStorage.setItem('totry_onboarded','true');
      localStorage.setItem('totry_name', JSON.stringify('Alfy')); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2600);
    const order = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      go('nourish'); await new Promise(r=>setTimeout(r,900));
      const rows = () => [...document.getElementById('nut-search-results').children]
        .map(e => (e.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean);
      const out = {};
      // four databases answer — the estimate must not be first
      const hit = n => [{ name:n, brand:'', source:'USDA', serving:'100g', gramsEquiv:100,
                          cal:180, pro:22, carb:4, fat:8 }];
      window.searchUSDA        = async q => hit('Gyros meat, cooked');
      window.searchFatSecret   = async q => hit('Chicken gyros');
      window.searchOFF         = async q => hit('Gyros kit');
      window.searchNutritionix = async q => hit('Gyros plate');
      await searchFood('Gyros open plate'); await new Promise(r=>setTimeout(r,1800));
      const withHits = rows();
      out.gotRows   = withHits.length;
      out.aiIndex   = withHits.findIndex(t => /estimate it instead|estimate .* with ai/i.test(t));
      out.firstRow  = (withHits[0]||'').slice(0,44);
      // nothing answers, and there is no connection
      window.searchUSDA = window.searchFatSecret = window.searchOFF = window.searchNutritionix = async () => [];
      Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });
      await searchFood('Gyros open plate'); await new Promise(r=>setTimeout(r,1800));
      const dead = rows();
      out.offlineFirst = (dead[0]||'').slice(0,44);
      out.offlineCount = dead.length;
      return out;
    });
    await ctx.close();
    if (order.gotRows < 2)
      findings.push(`order: only ${order.gotRows} blocks rendered with four databases answering`);
    else if (order.aiIndex === 0)
      findings.push(`order: the AI estimate is FIRST, above ${order.gotRows - 1} real matches — "${order.firstRow}"`);
    else if (order.aiIndex < 0)
      findings.push('order: the AI estimate vanished entirely when databases answered — it is the fallback, not nothing');
    if (!/create it yourself/i.test(order.offlineFirst))
      findings.push(`order: offline, the first thing offered is "${order.offlineFirst}" — it needs a network`);
    if (!findings.some(f => f.startsWith('order:')))
      console.log('order: real matches lead, the estimate follows them, and offline the offline option comes first');
  }

  // ── quiet until wanted, and never quiet about something real ─────────────────────────────────
  // Three screens were mostly made of features the person had never touched: Nourish carried 557px of
  // water, fasting and calorie cycling; Money put THIRTEEN empty forms — 2,839px — directly under the
  // sentence "I don't know anything about your money yet"; Track opened 1,123px of Sunday-night
  // reflection on a Tuesday. All of it now waits behind one row.
  //
  // Collapsing is the easy half. The half that rots is the un-collapsing, and getting it wrong hides
  // a person's own data from them — strictly worse than the clutter it replaced. So each surface is
  // driven twice: empty (must be quiet, and must still offer the way in) and with ONE real record of
  // each kind (must open itself, with nothing missing).
  {
    const quiet = async (seed, tab, probe) => {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.addInitScript(() => { localStorage.setItem('totry_onboarded','true');
        localStorage.setItem('totry_name', JSON.stringify('Alfy')); });
      if (seed) await page.addInitScript(seed);
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(2500);
      let r = null;
      try { r = await page.evaluate(([t, pr]) => {
        go(t);
        return new Promise(res => setTimeout(() => res(eval('(' + pr + ')')()), 1300));
      }, [tab, probe.toString()]); } catch (e) { r = { threw: String(e.message).slice(0,80) }; }
      await ctx.close();
      return r;
    };
    const nutProbe = () => { const b = document.getElementById('nut-secondary');
      return { open: !!(b && b.style.display !== 'none'), row: !!document.getElementById('nut-secondary-open'),
               sum: (document.getElementById('nut-secondary-sum')||{}).textContent || '' }; };
    const moneyProbe = () => { const m = [...document.querySelectorAll('#tab-money .money-more')];
      return { shown: m.filter(e => e.offsetParent !== null).length, total: m.length,
               row: !!(document.getElementById('money-more-row')||{}).offsetParent,
               gate: /don.t know anything/i.test((document.getElementById('money-gate')||{}).innerText || ''),
               wayIn: [...document.querySelectorAll('#tab-money button')].some(b => /import|manually/i.test(b.innerText||'')) }; };
    const trackProbe = () => { const b = document.getElementById('wk-body');
      return { open: !!(b && b.style.display !== 'none'), h: document.getElementById('tab-track').scrollHeight }; };

    // Nourish — empty, then one real record of each kind
    const nEmpty = await quiet(null, 'nourish', nutProbe);
    if (!nEmpty.row) findings.push('quiet: the Nourish secondary row is gone entirely');
    if (nEmpty.open) findings.push('quiet: water/fasting/cycling are open for someone using none of them');
    for (const [label, seed] of [
      ['water',  () => localStorage.setItem('totry_water', JSON.stringify({ [new Date().toLocaleDateString('en-AU')]: 1500 }))],
      // totry_fast_start is a key nothing in this app writes — seeding it proved my own detector to
      // itself while a person 5 hours into a live 16:8 was reading "not tracking these" over a running
      // clock. The fast is totry_fasting.startTs, epoch MILLISECONDS: getFastingState() computes
      // Date.now() - startTs, so an ISO string yields NaN and the state is silently discarded.
      ['fasting',() => localStorage.setItem('totry_fasting', JSON.stringify({ startTs: Date.now() - 5*3600e3, protocol: 16 }))],
      ['cycling',() => localStorage.setItem('totry_cal_cycling', JSON.stringify({ enabled:true, mode:'training' }))],
      ['season', () => localStorage.setItem('totry_fast_season', JSON.stringify({ name:'Lent' }))]
    ]) {
      const r = await quiet(seed, 'nourish', nutProbe);
      if (!r.open) findings.push(`quiet: ${label} is logged and the card stayed HIDDEN from them`);
    }

    // Money — empty must still lead somewhere, and any one real record brings everything back
    const mEmpty = await quiet(null, 'money', moneyProbe);
    if (mEmpty.shown > 0) findings.push(`quiet: ${mEmpty.shown} empty money forms under "I don't know anything about your money yet"`);
    if (!mEmpty.row)   findings.push('quiet: money collapsed with no row to open it — the features are unreachable');
    if (!mEmpty.wayIn) findings.push('quiet: money empty state offers no way to get anything in');
    for (const [label, seed] of [
      ['a debt',        () => localStorage.setItem('totry_f', JSON.stringify({ d:[{n:'Car loan',t:12000,p:3600}], u:0, i:0 }))],
      ['a savings goal',() => localStorage.setItem('totry_f', JSON.stringify({ d:[], u:5000, i:0 }))],
      ['a subscription',() => localStorage.setItem('totry_subscriptions', JSON.stringify([{ n:'Netflix', amt:18 }]))],
      ['a bill',        () => localStorage.setItem('totry_bills', JSON.stringify([{ n:'Rego', amt:900 }]))],
      ['a budget',      () => localStorage.setItem('totry_budgets', JSON.stringify({ food:600 }))],
      ['an asset',      () => localStorage.setItem('totry_assets', JSON.stringify([{ n:'Car', v:14000 }]))]
    ]) {
      const r = await quiet(seed, 'money', moneyProbe);
      if (r.threw) findings.push(`quiet: money threw with ${label} — ${r.threw}`);
      else if (r.shown < r.total) findings.push(`quiet: ${label} is real data and money still hid ${r.total - r.shown} cards`);
    }
    // and one malformed row must cost its own card, not the tab
    const mBad = await quiet(() => localStorage.setItem('totry_giving', JSON.stringify([{ amt:50 }])), 'money', moneyProbe);
    if (mBad.threw) findings.push('quiet: one malformed giving row takes the WHOLE money tab down');

    // Track — the Sunday reflection, on a Tuesday and on a Sunday
    const tue = await quiet(() => { const R = Date, t = new Date('2026-09-01T10:00:00');
      window.Date = class extends R { constructor(...a){ a.length ? super(...a) : super(t.getTime()); }
        static now(){ return t.getTime(); } }; }, 'track', trackProbe);
    if (tue.open) findings.push('quiet: 1,123px of Sunday-night reflection is open on a Tuesday');
    const sun = await quiet(() => { const R = Date, t = new Date('2026-08-30T10:00:00');
      window.Date = class extends R { constructor(...a){ a.length ? super(...a) : super(t.getTime()); }
        static now(){ return t.getTime(); } }; }, 'track', trackProbe);
    if (!sun.open) findings.push('quiet: the weekly check-in is CLOSED on the Sunday it exists for');

    if (!findings.some(f => f.startsWith('quiet:')))
      console.log('quiet: unused features wait behind one row on all three screens, and every real record opens its own');
  }

  // ── one person, one whole day, one session ─────────────────────────────────────────────────
  // Everything else in this file tests a surface in isolation. This walks a single person through a
  // day in ONE page session — morning ritual, lunch, the workout, an urge at 9:40pm, the Fight, the
  // evening, and back to the morning afterwards — because the bugs that hurt most in this app have
  // all been about state carrying badly ACROSS those moments, not within them.
  //
  // The last step is the one that matters: returning to the morning after finishing the evening must
  // still show the words written at 7am. That is the lock-out (v542) holding over a real session
  // rather than over a two-step probe.
  //
  // The vice name carries an apostrophe on purpose, and the slip history is real: 21 clean days
  // against a previous best of 22, so "your longest run yet" must NOT appear. A test person whose
  // data makes every line fire proves less than one whose data makes a line correctly stay silent.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    const dayErrs = [];
    page.on('pageerror', e => dayErrs.push(String(e.message).slice(0,110)));
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      const d=i=>new Date(Date.now()-i*864e5).toISOString();
      s('totry_onboarded',true); s('totry_name','Sam'); s('totry_start', d(40));
      s('totry_v',[{ n:"Mum's wine", mode:'quit', startDate:d(21) }]);
      s('totry_vice_uses',[{ v:"Mum's wine", ts:d(60) },{ v:"Mum's wine", ts:d(38) },{ v:"Mum's wine", ts:d(21) }]);
      s('totry_f',{ d:[{ n:'Car loan', t:20000, p:6000 }], income:5200 });
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2800);
    const day = await page.evaluate(async () => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));
      const out = {};

      go('morning'); await new Promise(x=>setTimeout(x,1100));
      morningStep(3); await new Promise(x=>setTimeout(x,200));
      const g=document.getElementById('morning-gratitude'), it=document.getElementById('morning-intention');
      if(g){ g.value='slept through for once'; g.dispatchEvent(new Event('input',{bubbles:true})); }
      if(it){ it.value='call Mum before it gets late'; it.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof completeMorning==='function') await completeMorning();
      await new Promise(x=>setTimeout(x,900));
      const mdone=document.getElementById('morning-done');
      out.morningConfirmed = !!(mdone && mdone.getBoundingClientRect().height>0);

      const au=new Date().toLocaleDateString('en-AU');
      const log=ls('totry_nutlog')||{}; log[au]=[{ name:'Chicken and rice', cal:680, pro:52, ts:new Date().toISOString() }];
      ls('totry_nutlog',log);
      const iso=new Date().toISOString();
      ls('totry_workouts',[{ id:1, ts:iso, date:iso.slice(0,10), title:'Push day', volume:8200, sets:16, calories:410 }]);

      go('grow'); await new Promise(x=>setTimeout(x,900));
      out.handoffs = ['hand-train','hand-nourish','hand-track']
        .filter(id => { const e=document.getElementById(id); return e && e.classList.contains('on'); }).length;

      openCompanion(); await new Promise(x=>setTimeout(x,700));
      const ov=document.querySelector('.companion-overlay');
      out.companionBehind = Math.round(window.innerHeight - ov.getBoundingClientRect().height);
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open'));

      ls('totry_fight_log',[{ vice:"Mum's wine", won:true, ts:new Date(Date.now()-3600e3).toISOString() }]);
      go('fight'); await new Promise(x=>setTimeout(x,900));
      out.fight = (document.getElementById('fight-evidence').innerText||'').replace(/\s+/g,' ').trim();

      go('reflect'); await new Promise(x=>setTimeout(x,1100));
      eveningStep(1); await new Promise(x=>setTimeout(x,200));
      const w=document.getElementById('evening-win');
      if(w){ w.value='rang Mum, and stayed off the wine'; w.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof completeEvening==='function') await completeEvening();
      await new Promise(x=>setTimeout(x,900));
      document.querySelectorAll('.modal-bg.open:not([id])').forEach(e=>e.remove());

      go('morning'); await new Promise(x=>setTimeout(x,1200));
      const nav=document.getElementById('tab-morning').querySelector('.mstep-nav');
      out.stepperBack = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
      morningStep(3); await new Promise(x=>setTimeout(x,220));
      const g2=document.getElementById('morning-gratitude');
      out.wordsKept = !!(g2 && g2.getBoundingClientRect().height>0 && /slept through/.test(g2.value||''));
      return out;
    });
    await page.waitForTimeout(200);
    if (!day.morningConfirmed) findings.push('a day: the morning saved and said nothing back');
    else if (day.handoffs !== 3) findings.push(`a day: only ${day.handoffs} of 3 Grow handoffs appeared after a workout and a meal`);
    else if (day.companionBehind < 150) findings.push(`a day: the companion covered all but ${day.companionBehind}px of the app`);
    else if (!/1 URGE MET AND TURNED AWAY/i.test(day.fight)) findings.push(`a day: the Fight read "${day.fight.slice(0,54)}" after exactly one win`);
    else if (/LONGEST RUN/i.test(day.fight)) findings.push(`a day: claimed a longest run at 21 days against a previous best of 22 — "${day.fight.slice(0,54)}"`);
    else if (!day.stepperBack) findings.push('a day: coming back to the morning at the end of the day, the stepper is gone');
    else if (!day.wordsKept) findings.push("a day: this morning's words are unreachable by the evening");
    else if (dayErrs.length) findings.push(`a day: ${dayErrs.length} page error(s) across the day — ${dayErrs[0]}`);
    else console.log("a day: morning → meal → workout → urge → Fight → evening → back, no errors, and this morning's words still there");
    await ctx.close();
  }

  await browser.close(); server.close();

  // The sacraments panel staying hidden for a secular person is the v427 gate working, not a finding.
  const real = findings.filter(f => !/#bible-sacraments-panel did not become visible/.test(f));
  const expected = findings.filter(f => /#bible-sacraments-panel did not become visible/.test(f));
  if (expected.length) console.log('\ngated as designed: ' + expected.length + ' (sacraments hidden for a secular user)');
  if (real.length) {
    console.log('\nFINDINGS:');
    real.forEach(f => console.log('  \u2717 ' + f));
  }
  console.log(`\n${real.length ? '\u2717' : '\u2713'} ${real.length ? real.length + ' findings' : 'all panels render for both people'}\n`);
  process.exit(real.length ? 1 : 0);
})();
