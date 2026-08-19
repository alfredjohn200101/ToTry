const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT='/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/serve';const PORT=8814;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(r=>{const s=http.createServer((rq,rs)=>{const c=decodeURIComponent(rq.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rs.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rs);});s.listen(PORT,'127.0.0.1',()=>r(s));});
(async()=>{
const server=await serve();
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:414,height:896}});
const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(String(e.message).slice(0,200)));
page.on('dialog',async d=>{console.log('DIALOG['+d.type()+']:',JSON.stringify(d.message().slice(0,120)));await d.dismiss();});
await page.addInitScript(seed=>{for(const[k,v]of Object.entries(seed))localStorage.setItem(k,JSON.stringify(v));},{
  totry_guest:true,totry_onboarded:true,totry_name:'Sam',totry_faith_tradition:'secular',totry_sex:'male',
});
await page.goto('http://127.0.0.1:'+PORT+'/index.html',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(4500);
await page.evaluate(()=>go('train'));
await page.waitForTimeout(600);
await page.evaluate(()=>{addExerciseToSession({name:'Bench Press',bodyPart:'chest',equipment:'Barbell'});});
await page.waitForTimeout(400);
// focus the reps field then tick the SAME row's done -> does focus survive?
const focusTest = await page.evaluate(()=>{
  const rows=document.getElementById('sets-0').querySelectorAll('.set-row');
  const inp=rows[0].querySelectorAll('input.set-input');
  inp[0].value='60';inp[0].dispatchEvent(new Event('change',{bubbles:true}));
  inp[1].focus(); inp[1].value='8';
  const before=document.activeElement && document.activeElement.className;
  rows[0].querySelector('.set-done').click();
  const after=document.activeElement && (document.activeElement.className||document.activeElement.tagName);
  return {before, after};
});
console.log('FOCUS before tick:',focusTest.before,'| after tick:',focusTest.after);
// add a set: is the new row's weight input focused?
await page.evaluate(()=>addSetToEx(0));
await page.waitForTimeout(300);
console.log('activeElement after addSetToEx:',await page.evaluate(()=>document.activeElement&&(document.activeElement.className||document.activeElement.tagName)));
console.log('rows now:',await page.evaluate(()=>document.getElementById('sets-0').querySelectorAll('.set-row').length));
// swap exercise -> prompt?
await page.evaluate(()=>swapExercise(0));
await page.waitForTimeout(400);
// OFFLINE
await ctx.setOffline(true);
console.log('--- OFFLINE ---');
await page.evaluate(()=>{document.getElementById('pt-ex-search').value='squat';searchExercises('squat');});
await page.waitForTimeout(1500);
console.log('offline search results:',JSON.stringify((await page.evaluate(()=>document.getElementById('pt-ex-results').textContent)).replace(/\s+/g,' ').slice(0,160)));
await page.evaluate(()=>{document.getElementById('pt-ex-search').value='zzqqx';searchExercises('zzqqx');});
await page.waitForTimeout(4000);
console.log('offline unknown-search result:',JSON.stringify((await page.evaluate(()=>document.getElementById('pt-ex-results').textContent)).replace(/\s+/g,' ').slice(0,200)));
await page.evaluate(()=>showExerciseForm('Bench Press'));
await page.waitForTimeout(6000);
const formTxt = await page.evaluate(()=>{const m=[...document.querySelectorAll('.modal-bg.open')].pop();return m?m.innerText.replace(/\s+/g,' ').slice(0,300):'NO MODAL';});
console.log('offline FORM modal:',JSON.stringify(formTxt));
console.log('ERRORS',errs.slice(0,10));
await b.close();server.close();
})();
