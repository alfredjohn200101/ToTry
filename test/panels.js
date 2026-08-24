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
      const seed = { totry_guest: true, totry_onboarded: true, totry_name: 'Alfy',
                     totry_faith_tradition: 'christianity', totry_sex: 'male',
                     totry_bills: [{ id: 2, name: 'Rent', amount: 420, due: '2026-09-01' }],
                     totry_v: [{ n: 'Scrolling', startDate: new Date(Date.now() - 9 * 864e5).toISOString(), mode: 'quit' }] };
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
      out.orphans = [...panel.children].filter(e =>
        !e.classList.contains('mstep-nav') && !e.classList.contains('mstep-foot') &&
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
      out.orphans = [...pane.children].filter(e =>
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
      morningShowAll();
      await new Promise(x=>setTimeout(x,260));
      out.showAll = { h: Math.round(pane.scrollHeight), stepped: pane.classList.contains('stepped') };
      return out;
    });
    if (!r.stepped) findings.push('morning: not stepped — it is still one long form');
    else if (!r.dawn) findings.push('morning: no dawn skin');
    else if (r.orphans.length) findings.push(`morning: ${r.orphans.length} block(s) belong to no step and can never be reached — ${r.orphans.slice(0,3).join(', ')}`);
    else if (r.crisisGone != null) findings.push(`morning: the crisis fields are GONE at step ${r.crisisGone} — hidden is fine, removed is not`);
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
      { label:'first attempt, no slips yet',  seed:{ clean:13 },                    want:{ shown:false } },
      { label:'3 urges beaten, money back',   seed:{ clean:13, won:3, cost:true },  want:{ shown:true, has:/URGES MET AND TURNED AWAY/i, hasnt:/LONGEST RUN/i } },
      { label:'40 days, previous best 21',    seed:{ clean:40, won:1, uses:[61,40] },want:{ shown:true, has:/LONGEST RUN YET .* 21 DAYS/i } },
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
