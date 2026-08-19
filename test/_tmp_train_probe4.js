const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT='/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/serve';const PORT=8815;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(r=>{const s=http.createServer((rq,rs)=>{const c=decodeURIComponent(rq.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rs.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rs);});s.listen(PORT,'127.0.0.1',()=>r(s));});
(async()=>{
const server=await serve();
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:414,height:896}});
const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(String(e.message).slice(0,200)));
page.on('dialog',async d=>{ if(d.type()==='prompt') await d.accept('Barbell Row'); else await d.accept(); });
await page.addInitScript(seed=>{for(const[k,v]of Object.entries(seed))localStorage.setItem(k,JSON.stringify(v));},{
  totry_guest:true,totry_onboarded:true,totry_name:'Sam',totry_faith_tradition:'secular',totry_sex:'male'});
await page.goto('http://127.0.0.1:'+PORT+'/index.html',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(4500);
await page.evaluate(()=>go('train'));
await page.waitForTimeout(500);
await page.evaluate(()=>addExerciseToSession({name:'Bench Press',bodyPart:'chest',equipment:'Barbell',primary:'Chest'}));
await page.waitForTimeout(300);
console.log('currentSession[0] as stored:',JSON.stringify(await page.evaluate(()=>currentSession[0])));
await page.evaluate(()=>swapExercise(0));
await page.waitForTimeout(500);
console.log('after swap:',JSON.stringify(await page.evaluate(()=>({name:currentSession[0].name,bodyPart:currentSession[0].bodyPart}))));
console.log('classify:',JSON.stringify(await page.evaluate(()=>classifyExerciseMuscles(currentSession[0].name,currentSession[0]))));
console.log('classify by name only:',JSON.stringify(await page.evaluate(()=>classifyExerciseMuscles('Barbell Row',null))));
// log a set and save
await page.evaluate(()=>{
  const r=document.getElementById('sets-0').querySelectorAll('.set-row')[0];
  const inp=r.querySelectorAll('input.set-input');
  inp[0].value='80';inp[0].dispatchEvent(new Event('change',{bubbles:true}));
  inp[1].value='10';inp[1].dispatchEvent(new Event('change',{bubbles:true}));
  r.querySelector('.set-done').click();
});
await page.waitForTimeout(400);
await page.evaluate(()=>saveWorkoutSession());
await page.waitForTimeout(1200);
console.log('weekly sets by muscle:',JSON.stringify(await page.evaluate(()=>computeWeeklySetsByMuscle())));
console.log('weekly volume by muscle:',JSON.stringify(await page.evaluate(()=>computeWeeklyVolumeByMuscle())));
console.log('ERRORS',errs.slice(0,6));
await b.close();server.close();
})();
