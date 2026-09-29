const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT='/Users/alfredjohn/Desktop/ToTry/www',PORT=8815;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((rq,rs)=>{const c=decodeURIComponent(rq.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rs.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rs);});s.listen(PORT,'127.0.0.1',()=>res(s));});
(async()=>{const server=await serve();const b=await chromium.launch({headless:true});
 for(const withTasks of [false,true]){
  const ctx=await b.newContext({viewport:{width:414,height:896}});const p=await ctx.newPage();
  await p.addInitScript((withTasks)=>{
    const s={totry_guest:true,totry_onboarded:true,totry_name:'Alfy',totry_faith_tradition:'christianity',
             totry_v:[{n:'Scrolling',startDate:new Date(Date.now()-9*864e5).toISOString(),mode:'quit',cleanDaysTotal:9,trackPatterns:true}]};
    for(const[k,v]of Object.entries(s))localStorage.setItem(k,JSON.stringify(v));
    if(withTasks){const d=new Date(),pa=n=>String(n).padStart(2,'0');
      localStorage.setItem('totry_tomorrow_tasks',JSON.stringify({tasks:['Call mum'],date:pa(d.getDate())+'/'+pa(d.getMonth()+1)+'/'+d.getFullYear(),ts:d.toISOString()}));}
  },withTasks);
  await p.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});await p.waitForTimeout(6000);
  const r=await p.evaluate(()=>{
    const out={};
    // Drive the REAL "I won the urge" handler the SOS sheet calls.
    window.curVice=0;
    let toastText='(no toast)';
    const _st=window.showToast; window.showToast=(a,bb)=>{toastText=a+' | '+bb;};
    try{ logWin(); out.logWin='returned normally'; }catch(e){ out.logWin=e.name+': '+e.message; }
    window.showToast=_st;
    out.toastAfterWin=toastText;
    // and the honest-loss handler
    let toast2='(no toast)'; const _s2=window.showToast; window.showToast=(a,bb)=>{toast2=a+' | '+String(bb).slice(0,60);};
    try{ logHonestLoss('Scrolling'); out.logHonestLoss='returned normally'; }catch(e){ out.logHonestLoss=e.name+': '+e.message; }
    window.showToast=_s2; out.toastAfterLoss=toast2;
    return out;
  });
  console.log('--- tomorrow tasks seeded:',withTasks,'---'); console.log(JSON.stringify(r,null,1));
  await ctx.close();
 }
 await b.close();server.close();})();
