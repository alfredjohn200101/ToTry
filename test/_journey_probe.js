const http=require('http'), fs=require('fs'), path=require('path');
const { chromium }=require('playwright');
const ROOT='/Users/alfredjohn/Desktop/ToTry/www', PORT=8833;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((q,r)=>{const c=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r);});s.listen(PORT,'127.0.0.1',()=>res(s));});
const iso=n=>new Date(Date.now()-n*864e5).toISOString();
const seed={totry_guest:true,totry_onboarded:true,totry_name:'Sam',totry_faith_tradition:'secular',
  totry_start:iso(200), totry_identity:'', totry_affirms:['I keep my word.']};
(async()=>{
  const server=await serve(); const b=await chromium.launch({headless:true});
  const ctx=await b.newContext({viewport:{width:414,height:896}}); const p=await ctx.newPage();
  await p.addInitScript(s=>{for(const[k,v]of Object.entries(s))localStorage.setItem(k,JSON.stringify(v));},seed);
  await ctx.route('**/*',r=>r.request().url().includes('127.0.0.1')?r.continue():r.abort('internetdisconnected'));
  await p.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'load'}); await p.waitForTimeout(3000);
  const before=await p.evaluate(()=>({day:getDayCount(),el:document.getElementById('day-num')?.textContent}));
  console.log('before override:',JSON.stringify(before));
  // Drive the REAL Settings flow: open the journey modal, set 2019-06-01, save.
  const after=await p.evaluate(()=>{
    editJourneyStart();
    const inp=document.getElementById('journey-start-in');
    inp.value='2019-06-01';
    let toast=null; const orig=window.showToast; window.showToast=(a,b)=>{toast=a+' | '+b;};
    saveJourneyStart();
    window.showToast=orig;
    return { toast, stored: ls('totry_journey_start'), day: getDayCount(),
             total: (typeof totalDaysTrying==='function')?totalDaysTrying():null,
             el: document.getElementById('day-num')?.textContent };
  });
  console.log('after override:',JSON.stringify(after,null,1));
  // 2024-01-02 (just inside the fence) for contrast
  const ctrl=await p.evaluate(()=>{ ls('totry_journey_start', new Date('2024-01-02T12:00:00').toISOString()); return getDayCount(); });
  console.log('control 2024-01-02 ->', ctrl);
  const ctrl2=await p.evaluate(()=>{ ls('totry_journey_start', new Date('2023-12-30T12:00:00').toISOString()); return getDayCount(); });
  console.log('control 2023-12-30 ->', ctrl2);
  // affirmation label
  const lab=await p.evaluate(()=>{ const e=document.querySelector('.id-label')||document.getElementById('identity-label'); return e? {id:e.id,cls:e.className,text:e.textContent, shown:getComputedStyle(e).textTransform}:null; });
  console.log('identity label:',JSON.stringify(lab));
  await b.close(); server.close();
})();
