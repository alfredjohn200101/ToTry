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

(async()=>{
  const server=await serve();
  const browser=await chromium.launch({headless:true});
  const findings=[];
  for(const [label,seed] of [['new user',NEW],['established',ESTAB]]){
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
