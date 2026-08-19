// One-year heavy user: seed 400 days of everything, boot the real bundle, look.
const http=require('http'), fs=require('fs'), path=require('path');
const { chromium }=require('playwright');
const ROOT='/Users/alfredjohn/Desktop/ToTry/www';
const PORT=8811;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((req,rq)=>{const clean=decodeURIComponent(req.url.split('?')[0]);let f=path.join(ROOT,clean==='/'?'index.html':clean);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rq.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rq);});s.listen(PORT,'127.0.0.1',()=>res(s));});

const D=n=>new Date(Date.now()-n*864e5);
const iso=n=>D(n).toISOString();
const auKey=n=>D(n).toLocaleDateString('en-AU');

const N=400;
const workouts=[]; for(let i=0;i<N;i++){ if(i%2) continue; workouts.push({ts:iso(i),date:auKey(i),title:['Push','Pull','Legs','Run'][i%4],type:i%4===3?'run':'strength',durationMinutes:55,effort:7,distance:i%4===3?8000:null,exercises:[{name:'Bench press',sets:[{weight:80,reps:8,done:true},{weight:80,reps:8,done:true},{weight:80,reps:6,done:true}]},{name:'Squat',sets:[{weight:120,reps:5,done:true},{weight:120,reps:5,done:true}]}]}); }
const body=[]; for(let i=0;i<N;i+=3) body.push({weight:Math.round((88-(N-i)*0.02)*10)/10,ts:iso(i),d:iso(i),date:D(i).toLocaleDateString('en-AU',{day:'numeric',month:'short'}),scores:{},bf:18});
const journal=[]; for(let i=0;i<N;i++) journal.push({ts:iso(i),date:auKey(i),day:N-i,text:'Entry number '+i+' — a real sentence about the day.'});
const evenings=[]; for(let i=0;i<N;i++) evenings.push({ts:iso(i),date:auKey(i),day:N-i,win:'w'+i,release:'r'+i,see:'s'+i,rating:5});
const examens=[]; for(let i=0;i<N;i+=2) examens.push({ts:iso(i),date:auKey(i),day:N-i,gratitude:'g',review:'r'});
const checkins=[]; for(let i=0;i<N;i++) checkins.push({ts:iso(i),date:auKey(i),spiritual:7,emotional:6,physical:7,scores:{sleep:7,stress:4,energy:7}});
const mornings=[]; for(let i=0;i<N;i++) mornings.push({ts:iso(i),date:auKey(i),intention:'today I will'});
const nutlog={}; for(let i=0;i<N;i++){ const k=auKey(i); nutlog[k]=[1,2,3,4].map(m=>({id:i*10+m,name:'Chicken and rice',brand:'',serving:'1 serving',qty:1,cal:640,pro:48,carb:70,fat:14,meal:['breakfast','lunch','dinner','snack'][m-1],ts:iso(i)})); }
const fightLog=[]; for(let i=0;i<N;i++) fightLog.push({vice:'Scrolling',won:i%7!==0,intensity:6,trigger:'bored',note:'',ts:iso(i),date:auKey(i)});
const viceUses=[]; for(let i=0;i<N;i+=9) viceUses.push({v:'Scrolling',ts:iso(i),qty:1});
const momentsWon=[]; for(let i=0;i<N;i++) if(i%3) momentsWon.push({v:'Scrolling',ts:iso(i)});
const transactions=[]; for(let i=0;i<N;i++) transactions.push({type:i%5?'expense':'income',amount:i%5?42.5:3200,cat:'Food',note:'shop',ts:iso(i)});
const payments=[]; for(let i=0;i<N;i+=30) payments.push({amt:900,ts:iso(i),date:auKey(i),debt:'Card'});
const seed={
  totry_guest:true, totry_onboarded:true, totry_name:'Sam', totry_sex:'male',
  totry_faith_tradition:'christianity', totry_currency:'USD',
  totry_start: iso(N), totry_journey_start: iso(N), totry_first_start: iso(N+200),
  totry_restarts: 3,
  totry_v:[{n:'Scrolling',mode:'quit',startDate:iso(370),lastLoss:iso(370),w:1240,total:14,
            costAmount:20,costPer:'week',owed:0,
            losses:Array.from({length:14},(_,i)=>({date:iso(380+i*3)})),
            relapseHistory:Array.from({length:14},(_,i)=>({date:iso(380+i*3),streakLength:i}))}],
  totry_workouts:workouts, totry_body:body, totry_journal:journal, totry_evenings:evenings,
  totry_examens:examens, totry_checkins:checkins, totry_mornings:mornings, totry_nutlog:nutlog,
  totry_fight_log:fightLog, totry_vice_uses:viceUses, totry_moments_won:momentsWon,
  totry_transactions:transactions, totry_payments:payments,
  totry_f:{d:[{n:'Mortgage',t:485000,p:112000,interest:6.4},{n:'Card',t:18400,p:9200,interest:19.9}],u:0,i:0},
  totry_finance_goals:[{id:1,name:'House fund',target:250000,current:118500}],
  totry_nut_goals:{cal:3200,pro:190,carb:340,fat:95},
  totry_prs:[{ex:'Bench press',w:140,reps:1,ts:iso(30)}],
  totry_wins:Array.from({length:300},(_,i)=>({ts:iso(i),text:'win '+i})),
  totry_prayers:Array.from({length:200},(_,i)=>({id:i,text:'prayer '+i,createdAt:iso(i),answered:i%4===0})),
  totry_h:[{n:'Morning ritual done',d:[1,1,1,1,1,1,1]},{n:'No vice today',d:[1,1,1,1,1,1,1]},{n:'Prayer / scripture',d:[1,1,1,1,1,1,1]}],
};

(async()=>{
  const server=await serve();
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:414,height:896}});
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.message).slice(0,200)));
  page.on('console',m=>{ if(m.type()==='error') errors.push('console: '+m.text().slice(0,200)); });
  await page.addInitScript(s=>{ for(const [k,v] of Object.entries(s)) localStorage.setItem(k,JSON.stringify(v)); }, seed);
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.includes('127.0.0.1'))return r.continue();return r.abort('internetdisconnected');});
  const t0=Date.now();
  await page.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'load'});
  await page.waitForTimeout(3500);
  console.log('boot+3.5s wall:', Date.now()-t0,'ms');
  const tabs=await page.evaluate(()=>{ try{ return Array.from(document.querySelectorAll('.tab')).map(t=>t.id); }catch(e){ return ['ERR '+e.message]; } });
  console.log('tabs:',tabs.join(','));
  const gos=['home','morning','fight','nourish','train','coach','track','money','reflect','calendar','settings','grow','soul','plans','threads','today','why'];
  const bad=[];
  for(const g of gos){
    try{ await page.evaluate(t=>{ if(typeof go==='function') go(t); }, g); }catch(e){ bad.push(g+': go threw '+e.message); continue; }
    await page.waitForTimeout(700);
    const txt=await page.evaluate(()=>document.body.innerText);
    const hits=[];
    [/NaN/,/Infinity/,/undefined/,/\[object Object\]/,/null\b/].forEach(re=>{ const m=txt.match(new RegExp('.{0,60}'+re.source+'.{0,60}','g')); if(m) hits.push(...m.slice(0,4)); });
    if(hits.length) bad.push('--- TAB '+g+' ---\n'+hits.join('\n'));
  }
  console.log(bad.join('\n'));
  console.log('ERRORS:', errors.length? errors.join('\n  '):'none');
  // horizontal overflow check
  const ov=await page.evaluate(()=>{ const out=[]; document.querySelectorAll('*').forEach(e=>{ if(e.scrollWidth>e.clientWidth+2 && e.clientWidth>0 && getComputedStyle(e).overflowX==='visible'){ } }); return { docW: document.documentElement.scrollWidth, win: window.innerWidth }; });
  console.log('overflow:',JSON.stringify(ov));
  const perf=await page.evaluate(()=>{
    const names=['getLifeState','lifeStateBrief','renderTimeline','renderOnThisDay','getUnifiedWeekStats','computeReadiness','renderCalendar','analyzeUrgePatterns','renderNutWeeklyDigest','renderBody','renderVices','renderHome','initApp','buildCtx','renderTrends','renderMoneyDeep','weeklyLoadByModality','computeWeeklySetsByMuscle','renderProgress','renderInsights','renderJournal','renderWins','renderPrayerList','renderFightHistory'];
    const out={};
    for(const n of names){ const f=window[n]; if(typeof f!=='function'){ out[n]='n/a'; continue; }
      try{ const t=performance.now(); for(let i=0;i<5;i++) f.length?f(undefined):f(); out[n]=Math.round((performance.now()-t)/5*100)/100; }catch(e){ out[n]='threw: '+String(e.message).slice(0,50); } }
    return out;
  });
  console.log('perf (ms/call):', JSON.stringify(perf,null,1));
  await browser.close(); server.close();
})();
