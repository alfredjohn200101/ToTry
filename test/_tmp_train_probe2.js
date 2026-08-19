const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT='/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/serve';const PORT=8813;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(r=>{const s=http.createServer((rq,rs)=>{const c=decodeURIComponent(rq.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rs.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rs);});s.listen(PORT,'127.0.0.1',()=>r(s));});
const ago=d=>new Date(Date.now()-d*864e5).toISOString();
(async()=>{
const server=await serve();
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:414,height:896}});
const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(String(e.message).slice(0,200)));
await page.addInitScript(seed=>{for(const[k,v]of Object.entries(seed))localStorage.setItem(k,JSON.stringify(v));},{
  totry_guest:true,totry_onboarded:true,totry_name:'Sam',totry_faith_tradition:'secular',totry_sex:'male',
  totry_prs:{'Barbell Squat':{orm:145,weight:130,reps:5,date:'12 Aug 2026'}},
  totry_workouts:[
    {id:1,source:'manual',ts:ago(3),date:'16 Aug',exercises:[{name:'Barbell Squat',sets:[{weight:'130',reps:'5',type:'normal',done:true},{weight:'130',reps:'5',type:'normal',done:true}]}],completedSets:2,totalSets:2,volume:1300,durationMin:45},
    {id:2,source:'manual',ts:ago(10),date:'9 Aug',exercises:[{name:'Barbell Squat',sets:[{weight:'125',reps:'5',type:'normal',done:true}]}],completedSets:1,totalSets:1,volume:625,durationMin:40}
  ],
});
await page.goto('http://127.0.0.1:'+PORT+'/index.html',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(4500);
await page.evaluate(()=>go('train'));
await page.waitForTimeout(700);
// e1RM sanity: single-rep
console.log('estE1RM(100,1)=',await page.evaluate(()=>estE1RM(100,1)));
console.log('manual-save formula for 100x1 =',await page.evaluate(()=>Math.round(100*(1+1/30))));
// add squat and beat the PR
await page.evaluate(()=>addExerciseToSession({name:'Barbell Squat',bodyPart:'upper legs',equipment:'Barbell'}));
await page.waitForTimeout(500);
console.log('PREV column text =',JSON.stringify(await page.evaluate(()=>document.getElementById('sets-0').textContent.replace(/\s+/g,' ').slice(0,200))));
// capture toasts
await page.evaluate(()=>{window.__toasts=[];const o=window.showToast;window.showToast=function(a,b){window.__toasts.push(String(a)+' | '+String(b));return o&&o.apply(this,arguments);};});
await page.evaluate(()=>{
  const r=document.getElementById('sets-0').querySelectorAll('.set-row')[0];
  const inp=r.querySelectorAll('input.set-input');
  inp[0].value='150';inp[0].dispatchEvent(new Event('change',{bubbles:true}));
  inp[1].value='5';inp[1].dispatchEvent(new Event('change',{bubbles:true}));
  r.querySelector('.set-done').click();
});
await page.waitForTimeout(1500);
console.log('TOASTS on one PR tick:',JSON.stringify(await page.evaluate(()=>window.__toasts)));
console.log('visible toast elements:',await page.evaluate(()=>document.querySelectorAll('.toast, .undo-snack, .milestone-toast').length));
// history panel
await page.evaluate(()=>setPTTab('history'));
await page.waitForTimeout(1200);
const hist=await page.evaluate(()=>({
  hist:(document.getElementById('pt-history-list')||{}).innerHTML?.length||-1,
  prs:(document.getElementById('pt-pr-list')||{}).textContent?.replace(/\s+/g,' ').slice(0,200)||'MISSING',
  heat:(document.getElementById('muscle-heatmap')||{}).innerHTML?.length??-1,
  panel:document.getElementById('pt-panel-history').innerText.replace(/\s+/g,' ').slice(0,900)
}));
console.log('HISTORY PANEL:',JSON.stringify(hist,null,1));
console.log('ERRORS',errs.slice(0,10));
await b.close();server.close();
})();
