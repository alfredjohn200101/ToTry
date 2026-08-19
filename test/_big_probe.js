const http=require('http'), fs=require('fs'), path=require('path');
const { chromium }=require('playwright');
const ROOT='/Users/alfredjohn/Desktop/ToTry/www', PORT=8823;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((q,r)=>{const c=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r);});s.listen(PORT,'127.0.0.1',()=>res(s));});
const D=n=>new Date(Date.now()-n*864e5), iso=n=>D(n).toISOString(), au=n=>D(n).toLocaleDateString('en-AU');
const N=1200; // 3+ years
const nutlog={}; for(let i=0;i<200;i++){ nutlog[au(i)]=[{id:i,name:'Feast',cal:4200,pro:210,carb:400,fat:180,meal:'dinner',ts:iso(i)},{id:i+9e5,name:'Second',cal:6100,pro:180,carb:600,fat:210,meal:'lunch',ts:iso(i)}]; }
const seed={
  totry_guest:true,totry_onboarded:true,totry_name:'Sam',totry_sex:'male',totry_faith_tradition:'christianity',
  totry_currency:'USD', totry_start:iso(N), totry_journey_start:iso(N), totry_first_start:iso(N),
  totry_height:180,
  totry_v:[{n:'Gambling',mode:'quit',startDate:iso(N-5),lastLoss:iso(N-5),w:9999,total:0,costAmount:850,costPer:'day',owed:0}],
  totry_f:{d:[{n:'Mortgage',t:1250000,p:210000,interest:6.4},{n:'Card',t:98400,p:1200,interest:24.9}],u:0,i:0},
  totry_finance_goals:[{id:1,name:'House',target:2500000,current:1187500}],
  totry_nutlog:nutlog, totry_nut_goals:{cal:10500,pro:420,carb:1100,fat:340},
  totry_body:[{weight:142.6,ts:iso(0),date:D(0).toLocaleDateString('en-AU',{day:'numeric',month:'short'}),bf:34,scores:{}},
              {weight:188.2,ts:iso(700),date:D(700).toLocaleDateString('en-AU',{day:'numeric',month:'short'}),bf:44,scores:{}}],
  totry_payments:Array.from({length:40},(_,i)=>({amt:4200,ts:iso(i*30),date:au(i*30)})),
  totry_transactions:Array.from({length:300},(_,i)=>({type:i%6?'expense':'income',amount:i%6?312.75:14500,cat:'Food',note:'x',ts:iso(i)})),
};
(async()=>{
  const server=await serve(); const b=await chromium.launch({headless:true});
  const ctx=await b.newContext({viewport:{width:414,height:896}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); p.on('console',m=>{if(m.type()==='error'&&!/DISCONNECT|vibrate|503|Failed to load/.test(m.text()))errs.push(m.text().slice(0,160));});
  await p.addInitScript(s=>{for(const[k,v]of Object.entries(s))localStorage.setItem(k,JSON.stringify(v));},seed);
  await ctx.route('**/*',r=>r.request().url().includes('127.0.0.1')?r.continue():r.abort('internetdisconnected'));
  await p.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'load'}); await p.waitForTimeout(3200);
  const dbg=await p.evaluate(()=>({
    start: localStorage.getItem('totry_start'),
    journey: localStorage.getItem('totry_journey_start'),
    first: localStorage.getItem('totry_first_start'),
    dayCount: (typeof getDayCount==='function')?getDayCount():'n/a',
    daysInstalled: (typeof daysInstalled==='function')?daysInstalled():'n/a',
    totalTrying: (typeof totalDaysTrying==='function')?totalDaysTrying():'n/a',
    dayEls: Array.from(document.querySelectorAll('#day-count,#day-num,[id*=day]')).slice(0,10).map(e=>e.id+'='+e.textContent.slice(0,20)),
    affirmLabel: (function(){ const e=document.getElementById('identity-label')||document.querySelector('.id-label'); return e?e.textContent:null; })(),
    src: String(getDayCount).slice(0,900),
    lsJourney: ls('totry_journey_start'),
    lsStart: ls('totry_start'),
  }));
  console.log('DBG', JSON.stringify(dbg,null,1));
  for(const t of ['home','money','nourish','track','fight','train']){
    await p.evaluate(x=>{if(typeof go==='function')go(x);},t); await p.waitForTimeout(900);
    const r=await p.evaluate(()=>{
      const txt=document.body.innerText;
      const over=[]; document.querySelectorAll('*').forEach(e=>{ if(e.children.length===0 && e.scrollWidth>e.clientWidth+3 && e.clientWidth>20) over.push((e.innerText||'').slice(0,50)+' [sw='+e.scrollWidth+' cw='+e.clientWidth+']'); });
      return {txt, over:over.slice(0,8), docW:document.documentElement.scrollWidth};
    });
    if(t==='home'||t==='fight'||t==='money') console.log('TEXT['+t+']:\n'+r.txt.slice(0,1800).replace(/\n{2,}/g,'\n'));
    const hits=(r.txt.match(/.{0,50}(NaN|Infinity|undefined|\[object Object\]).{0,50}/g)||[]).slice(0,6);
    console.log('### '+t+'  docW='+r.docW);
    if(hits.length) console.log('  BADTEXT: '+hits.join('\n           '));
    if(r.over.length) console.log('  CLIPPED: '+r.over.join('\n           '));
  }
  console.log('errors:',errs.join(' | ')||'none');
  await b.close(); server.close();
})();
