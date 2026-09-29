const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT='/Users/alfredjohn/Desktop/ToTry/www';
const PORT=8811;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((req,rq)=>{const clean=decodeURIComponent(req.url.split('?')[0]);let file=path.join(ROOT,clean==='/'?'index.html':clean);if(!file.startsWith(ROOT)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(ROOT,'index.html');rq.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(rq);});s.listen(PORT,'127.0.0.1',()=>res(s));});

(async()=>{
 const server=await serve();
 const browser=await chromium.launch({headless:true});
 for(const withTasks of [false,true]){
  const ctx=await browser.newContext({viewport:{width:414,height:896}});
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.message).slice(0,160)));
  const seed={ totry_guest:true, totry_onboarded:true, totry_name:'Alfy',
               totry_faith_tradition:'christianity', totry_sex:'male',
               totry_start:new Date(Date.now()-12*864e5).toISOString() };
  await page.addInitScript(({seed,withTasks})=>{
    for(const [k,v] of Object.entries(seed)) localStorage.setItem(k,JSON.stringify(v));
    if(withTasks){
      // EXACTLY what saveEvening() writes, stamped with the same primitive the app uses.
      const d=new Date();
      const p=n=>String(n).padStart(2,'0');
      const key=p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear();
      localStorage.setItem('totry_tomorrow_tasks',JSON.stringify({tasks:['Call mum'],date:key,ts:d.toISOString()}));
    }
  },{seed,withTasks});
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(3000);
  const probe=await page.evaluate(()=>{
    const out={};
    out.stampedKey = (typeof dayKeyOf==='function') ? dayKeyOf() : 'NO dayKeyOf';
    try{ out.stored = JSON.parse(localStorage.getItem('totry_tomorrow_tasks')||'null'); }catch(e){ out.stored=null; }
    out.dayNum = (document.getElementById('day-num')||{}).textContent;
    out.heroDay = (document.getElementById('hero-day')||{}).textContent;
    const h=document.getElementById('home');
    out.homeTextLen = h ? (h.innerText||'').replace(/\s+/g,' ').trim().length : -1;
    out.tiGlobal = (typeof ti);
    // Call renderDayCounter directly and report the throw verbatim.
    try{ renderDayCounter(); out.directCall='NO THROW'; }catch(e){ out.directCall=e.name+': '+e.message; }
    return out;
  });
  console.log('--- withTasks =',withTasks,'---');
  console.log(JSON.stringify(probe,null,1));
  console.log('pageerrors:',JSON.stringify(errors,null,1));
  await ctx.close();
 }
 await browser.close(); server.close();
})();
