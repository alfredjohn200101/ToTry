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
