const http=require('http'), fs=require('fs'), path=require('path');
const { chromium }=require('playwright');
const ROOT='/Users/alfredjohn/Desktop/ToTry/www', PORT=8843;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((q,r)=>{const c=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r);});s.listen(PORT,'127.0.0.1',()=>res(s));});
const iso=n=>new Date(Date.now()-n*864e5).toISOString();
const body=[]; for(let i=1;i<=52;i++) body.push({weight:Math.round((78+i*0.2)*10)/10,ts:iso(i*7),date:new Date(Date.now()-i*7*864e5).toLocaleDateString('en-AU',{day:'numeric',month:'short'}),bf:18,scores:{}});
const seed={totry_guest:true,totry_onboarded:true,totry_name:'Sam',totry_sex:'male',totry_faith_tradition:'secular',
  totry_start:iso(370), totry_height:180, totry_body:body};
(async()=>{
  const server=await serve(); const b=await chromium.launch({headless:true});
  const ctx=await b.newContext({viewport:{width:414,height:896}}); const p=await ctx.newPage();
  await p.addInitScript(s=>{for(const[k,v]of Object.entries(s))localStorage.setItem(k,JSON.stringify(v));},seed);
  await ctx.route('**/*',r=>r.request().url().includes('127.0.0.1')?r.continue():r.abort('internetdisconnected'));
  await p.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'load'}); await p.waitForTimeout(3000);
  await p.evaluate(()=>go('track')); await p.waitForTimeout(900);
  const before=await p.evaluate(()=>({now:document.getElementById('bod-cur').textContent,change:document.getElementById('bod-lo').textContent,bmi:document.getElementById('bod-bmi').textContent}));
  console.log('BEFORE weekly check-in:',JSON.stringify(before));
  // Fill the weekly check-in EXACTLY as a person would, leaving "This week's weight (optional)" blank.
  await p.evaluate(async()=>{
    document.getElementById('wk-win').value='Trained four times';
    document.getElementById('wk-struggle').value='Late nights';
    document.getElementById('wk-focus').value='Sleep by 11';
    ['wk-train','wk-nut','wk-sleep','wk-stress','wk-energy','wk-faith'].forEach(id=>{const e=document.getElementById(id); if(e) e.value='8';});
    document.getElementById('bod-weight').value='';           // optional — left blank
    await logBody();
  });
  await p.waitForTimeout(1200);
  await p.evaluate(()=>go('track')); await p.waitForTimeout(900);
  const after=await p.evaluate(()=>({now:document.getElementById('bod-cur').textContent,change:document.getElementById('bod-lo').textContent,bmi:document.getElementById('bod-bmi').textContent,
    summary:document.getElementById('bod-current-summary').textContent,
    stored0:(ls('totry_body')||[])[0]}));
  console.log('AFTER  weekly check-in:',JSON.stringify({now:after.now,change:after.change,bmi:after.bmi,summary:after.summary},null,1));
  console.log('stored entry[0].weight =', after.stored0 && after.stored0.weight);
  await b.close(); server.close();
})();
