const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT='/Users/alfredjohn/Desktop/ToTry/www';
const PORT=8813;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((req,rq)=>{const clean=decodeURIComponent(req.url.split('?')[0]);let file=path.join(ROOT,clean==='/'?'index.html':clean);if(!file.startsWith(ROOT)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(ROOT,'index.html');rq.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(rq);});s.listen(PORT,'127.0.0.1',()=>res(s));});

(async()=>{
 const server=await serve();
 const browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:414,height:896}});
 const page=await ctx.newPage();
 const seed={ totry_guest:true, totry_onboarded:true, totry_name:'Alfy',
              totry_faith_tradition:'christianity', totry_sex:'male',
              totry_start:new Date(Date.now()-12*864e5).toISOString() };
 await page.addInitScript((seed)=>{
   for(const [k,v] of Object.entries(seed)) localStorage.setItem(k,JSON.stringify(v));
   const d=new Date(); const p=n=>String(n).padStart(2,'0');
   const key=p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear();
   localStorage.setItem('totry_tomorrow_tasks',JSON.stringify({tasks:['Call mum'],date:key,ts:d.toISOString()}));
 },seed);
 await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(9000);   // past the 6000ms boot-splash failsafe
 const before=await page.evaluate(()=>{
   const h=document.getElementById('tab-home');
   const bs=document.getElementById('boot-splash');
   return { homeChars:(h.innerText||'').replace(/\s+/g,' ').trim().length,
            greeting:/Good (morning|afternoon|evening)/.test(h.innerText||''),
            splashDisplay: bs?getComputedStyle(bs).display:'(no #boot-splash)',
            splashOpacity: bs?getComputedStyle(bs).opacity:'-',
            tabTap:(()=>{ try{ go('home'); return 'go(home) ok'; }catch(e){ return 'go(home) THREW '+e.name+': '+e.message; } })() };
 });
 console.log('BEFORE (ti undefined):', JSON.stringify(before,null,1));
 // FAULT INJECTION IN REVERSE: supply the missing binding and re-render.
 const after=await page.evaluate(()=>{
   // eslint-disable-next-line no-eval
   (0,eval)('var ti = tIdx();');
   const r={};
   try{ go('home'); r.goHome='ok'; }catch(e){ r.goHome=e.name+': '+e.message; }
   const h=document.getElementById('tab-home');
   r.homeChars=(h.innerText||'').replace(/\s+/g,' ').trim().length;
   r.greeting=/Good (morning|afternoon|evening)/.test(h.innerText||'');
   r.todayDetail=(document.getElementById('today-detail')||{}).textContent;
   return r;
 });
 console.log('AFTER  (ti supplied):', JSON.stringify(after,null,1));
 await browser.close(); server.close();
})();
