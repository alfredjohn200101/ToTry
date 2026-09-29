const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT='/Users/alfredjohn/Desktop/ToTry/www';
const PORT=8812;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((req,rq)=>{const clean=decodeURIComponent(req.url.split('?')[0]);let file=path.join(ROOT,clean==='/'?'index.html':clean);if(!file.startsWith(ROOT)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(ROOT,'index.html');rq.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(rq);});s.listen(PORT,'127.0.0.1',()=>res(s));});

(async()=>{
 const server=await serve();
 const browser=await chromium.launch({headless:true});
 const results={};
 for(const withTasks of [false,true]){
  const ctx=await browser.newContext({viewport:{width:414,height:896}});
  const page=await ctx.newPage();
  const errors=[]; const rejections=[];
  page.on('pageerror',e=>errors.push(e.name+': '+String(e.message).slice(0,140)));
  page.on('console',m=>{ if(m.type()==='error') rejections.push(m.text().slice(0,140)); });
  const seed={ totry_guest:true, totry_onboarded:true, totry_name:'Alfy',
               totry_faith_tradition:'christianity', totry_sex:'male',
               totry_start:new Date(Date.now()-12*864e5).toISOString() };
  await page.addInitScript(({seed,withTasks})=>{
    for(const [k,v] of Object.entries(seed)) localStorage.setItem(k,JSON.stringify(v));
    if(withTasks){
      const d=new Date(); const p=n=>String(n).padStart(2,'0');
      const key=p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear();
      localStorage.setItem('totry_tomorrow_tasks',JSON.stringify({tasks:['Call mum'],date:key,ts:d.toISOString()}));
    }
  },{seed,withTasks});
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(4000);
  const probe=await page.evaluate(()=>{
    const out={};
    const h=document.getElementById('tab-home');
    out.homeChars = h ? (h.innerText||'').replace(/\s+/g,' ').trim().length : -1;
    out.homeHasGreeting = h ? /Good (morning|afternoon|evening)/.test(h.innerText||'') : false;
    out.activeTab = (document.querySelector('.tab.active')||{}).id;
    out.locHash = location.hash;
    out.historyTab = (history.state||{}).tab;
    // things that run AFTER renderDayCounter in initApp
    out.debtStratSet = (typeof window.__debtStrategy!=='undefined') ? window.__debtStrategy : 'n/a';
    out.splashGone = !document.getElementById('boot-splash') || getComputedStyle(document.getElementById('boot-splash')).opacity==='0' || document.getElementById('boot-splash').style.display==='none';
    out.todayDetail = (document.getElementById('today-detail')||{}).textContent;
    return out;
  });
  results[withTasks?'WITH tomorrow tasks':'control (none)']={probe,pageerrors:errors,consoleErrors:rejections.slice(0,6)};
  await ctx.close();
 }
 console.log(JSON.stringify(results,null,1));
 await browser.close(); server.close();
})();
