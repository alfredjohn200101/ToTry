const http=require('http'), fs=require('fs'), path=require('path');
const { chromium } = require('playwright');
const ROOT=path.join('/Users/alfredjohn/Desktop/ToTry','www'); const PORT=8877;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((rq,rs)=>{const clean=decodeURIComponent(rq.url.split('?')[0]);let f=path.join(ROOT, clean==='/'?'index.html':clean);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rs.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rs);});s.listen(PORT,'127.0.0.1',()=>res(s));});
const SEED={ totry_guest:true, totry_onboarded:true, totry_name:'Alfy', totry_faith_tradition:'christianity', totry_sex:'male',
  totry_v:[{n:'Scrolling',startDate:new Date(Date.now()-9*864e5).toISOString(),mode:'quit',total:3}],
  totry_workouts:[{id:1,date:'14 Aug 2026',day:2,splitFocus:'Push',durationMin:52,exercises:[{name:'Bench Press',sets:[{weight:80,reps:8,done:true,rpe:8}]}]}],
  totry_h:[{n:'Read',d:new Array(30).fill(0).map((_,i)=>i%2)}], totry_body:[{w:82,d:new Date().toISOString()}] };
(async()=>{
  const server=await serve();
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:414,height:896}});
  const page=await ctx.newPage();
  await page.coverage.startJSCoverage();
  await page.addInitScript(s=>{for(const[k,v] of Object.entries(s))localStorage.setItem(k,JSON.stringify(v));},SEED);
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(3000);
  // walk every tab
  const tabs=await page.evaluate(()=>{const t=[];document.querySelectorAll('[id^="tab-"]').forEach(e=>t.push(e.id.replace(/^tab-/,'')));return t;});
  console.error('tabs:',tabs.join(','));
  for(const t of tabs){ try{ await page.evaluate(n=>{ if(typeof go==='function') go(n); },t); await page.waitForTimeout(350);}catch(e){} }
  // click every visible in-page button once? too destructive. Just open sub-panels via known openers
  const opened = await page.evaluate(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms)); let n=0;
    const names=Object.keys(window).filter(k=>typeof window[k]==='function'&&/^open[A-Z]/.test(k));
    for(const k of names){ try{ window[k](); n++; await wait(15); document.querySelectorAll('.modal-bg').forEach(m=>{if(!m.id)m.remove();}); }catch(e){} }
    return {n, names:names.length};
  });
  console.error('opened:',JSON.stringify(opened));
  await page.waitForTimeout(600);
  const cov=await page.coverage.stopJSCoverage();
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  // find the biggest entry (our inline script)
  let best=null; for(const e of cov){ const len=(e.source||'').length; if(!best||len>(best.source||'').length) best=e; }
  const src=best.source||'';
  console.error('coverage entry len',src.length,'ranges',best.functions.length);
  // V8 block coverage: each entry in best.functions has ranges[0] = that function's own range,
  // with the real call count. The enclosing script range (count 1) is a SEPARATE entry, so we must
  // key on exact function-range starts rather than asking "is this offset inside a covered range".
  const byStart=new Map();
  for(const f of best.functions){ const r=f.ranges[0]; if(!r) continue;
    const prev=byStart.get(r.startOffset);
    if(prev===undefined || r.count>prev) byStart.set(r.startOffset, r.count); }
  const decls=[...src.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)];
  let ran=0, tot=0, unknown=0; const notrun=[]; const unk=[]; const seen=new Map();
  for(const m of decls){ const name=m[1];
    // V8's range for `async function f(){}` starts at `async`, not at `function` — offset by 6.
    let c = byStart.has(m.index) ? byStart.get(m.index)
          : (byStart.has(m.index-6) ? byStart.get(m.index-6) : null);
    const prev=seen.get(name);
    seen.set(name, prev==null ? c : (c==null?prev:Math.max(prev||0,c))); }
  for(const [name,c] of seen){ tot++;
    if(c===null){ unknown++; unk.push(name); }
    else if(c>0) ran++; else notrun.push(name); }
  console.log(JSON.stringify({distinct:tot, executed:ran, neverCalled:notrun.length, noRangeFound:unknown, pct:(ran/tot*100).toFixed(1)}));
  fs.writeFileSync('/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/notrun.txt',notrun.join('\n'));
  fs.writeFileSync('/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/unknown.txt',unk.join('\n'));
  await browser.close(); server.close();
})();
