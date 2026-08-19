const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT='/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/serve';const PORT=8812;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(r=>{const s=http.createServer((rq,rs)=>{const c=decodeURIComponent(rq.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rs.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rs);});s.listen(PORT,'127.0.0.1',()=>r(s));});
(async()=>{
const server=await serve();
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:414,height:896}});
const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(String(e.message).slice(0,200)));
await page.addInitScript(seed=>{for(const[k,v]of Object.entries(seed))localStorage.setItem(k,JSON.stringify(v));},{
  totry_guest:true,totry_onboarded:true,totry_name:'Sam',totry_faith_tradition:'secular',totry_sex:'male',
  totry_routines:[{name:'Heavy Legs',id:111,exercises:[
    {name:'Barbell Squat',targetReps:'5',targetRest:'3m',sets:[{weight:'',reps:'',type:'normal',done:false},{weight:'',reps:'',type:'normal',done:false},{weight:'',reps:'',type:'normal',done:false}]},
    {name:'Romanian Deadlift',targetReps:'8',targetRest:'2m',sets:[{weight:'',reps:'',type:'normal',done:false},{weight:'',reps:'',type:'normal',done:false}]}]}],
});
await page.goto('http://127.0.0.1:'+PORT+'/index.html',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(4500);
console.log('EARLY ERRS',errs);
console.log('typeof go', await page.evaluate(()=>typeof window.go));
await page.evaluate(()=>{ go('train'); });
await page.waitForTimeout(700);
await page.evaluate(()=>{ loadRoutine(111); });
await page.waitForTimeout(700);
console.log('SESSION LEN', await page.evaluate(()=>currentSession.length));
console.log('DRAFT AFTER LOAD sets(ex0)', JSON.stringify(await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('totry_session_draft')||'null');return d&&d.session[0].sets;})));
console.log('TARGET BADGE "Rest: 3m" ON SCREEN', await page.evaluate(()=>document.getElementById('pt-session-exercises').textContent.includes('Rest: 3m')));
await page.evaluate(()=>{
  const c=document.getElementById('sets-0');
  const r=c.querySelectorAll('.set-row')[0];
  const inputs=r.querySelectorAll('input.set-input');
  inputs[0].value='140'; inputs[0].dispatchEvent(new Event('change',{bubbles:true}));
  inputs[1].value='5'; inputs[1].dispatchEvent(new Event('change',{bubbles:true}));
  c.querySelectorAll('.set-row')[0].querySelector('.set-done').click();
});
await page.waitForTimeout(600);
console.log('currentSession ex0 set0', JSON.stringify(await page.evaluate(()=>currentSession[0].sets[0])));
console.log('DRAFT AFTER LOGGING SET sets(ex0)', JSON.stringify(await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('totry_session_draft')||'null');return d&&d.session[0].sets;})));
console.log('REST TIMER shown =', await page.evaluate(()=>document.getElementById('rest-timer-overlay').style.display), 'value =', await page.evaluate(()=>document.getElementById('rest-timer-display').textContent));
// second + third set to make it substantial
await page.evaluate(()=>{
  const c=document.getElementById('sets-0');
  [1,2].forEach(i=>{const r=c.querySelectorAll('.set-row')[i];const inp=r.querySelectorAll('input.set-input');inp[0].value='140';inp[0].dispatchEvent(new Event('change',{bubbles:true}));inp[1].value='5';inp[1].dispatchEvent(new Event('change',{bubbles:true}));r.querySelector('.set-done').click();});
});
await page.waitForTimeout(500);
console.log('DRAFT AFTER 3 SETS', JSON.stringify(await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('totry_session_draft')||'null');return d&&d.session[0].sets;})));
// simulate the app being killed
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForTimeout(4500);
await page.evaluate(()=>{ go('train'); });
await page.waitForTimeout(900);
console.log('AFTER RELOAD sets restored:', JSON.stringify(await page.evaluate(()=>typeof currentSession!=='undefined'?currentSession.map(e=>({n:e.name,sets:e.sets})):null)));
console.log('TOASTS on screen:', await page.evaluate(()=>document.body.innerText.match(/Picked up where you left off[\s\S]{0,120}/)||'none'));
await page.evaluate(()=>setPTTab('routines'));
await page.waitForTimeout(600);
console.log('#pt-templates innerHTML length =', await page.evaluate(()=>document.getElementById('pt-templates').innerHTML.length));
console.log('#pt-templates visible text =', JSON.stringify((await page.evaluate(()=>document.getElementById('pt-templates').textContent)).slice(0,120)));
console.log('ERRORS',errs.slice(0,10));
await b.close();server.close();
})();
