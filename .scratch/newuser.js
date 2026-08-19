const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT='/Users/alfredjohn/Desktop/ToTry/www';const PORT=8831;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((req,rq)=>{const c=decodeURIComponent(req.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rq.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rq);});s.listen(PORT,'127.0.0.1',()=>res(s));});
const VIS=`el=>{if(!el)return false;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;const r=el.getBoundingClientRect();return r.width>2&&r.height>2;}`;
(async()=>{
const server=await serve();const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:414,height:896}});const page=await ctx.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e.message).slice(0,200)));
page.on('console',m=>{if(m.type()==='error')errors.push('C:'+m.text().slice(0,140));});
// EXACTLY what the "Take me in ->" quick path writes: onboarded, start, name. nothing else.
await page.addInitScript(()=>{
  localStorage.setItem('totry_guest','true');
  localStorage.setItem('totry_onboarded','true');
  localStorage.setItem('totry_start',JSON.stringify(new Date().toISOString()));
  localStorage.setItem('totry_name','"Sam"');
});
await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(3500);

// 1. the first-run card steps
const steps = await page.evaluate(()=>{
  const c=document.getElementById('firstrun-card');
  return {display:c.style.display, html:[...document.querySelectorAll('#firstrun-steps > div')].map(d=>({t:d.innerText.replace(/\s+/g,' ').slice(0,60), on:d.getAttribute('onclick')}))};
});
console.log('FIRSTRUN', JSON.stringify(steps,null,1));

const ACTIONS = steps.html.filter(s=>s.on).map(s=>s.on);
for(const a of ACTIONS){
  await page.evaluate(()=>{document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());});
  const err = await page.evaluate(code=>{try{eval(code);return null}catch(e){return String(e.message)}}, a);
  await page.waitForTimeout(1200);
  const st = await page.evaluate(new Function('return ('+`()=>{const vis=${VIS};
    const tabs=[...document.querySelectorAll('.tab')].filter(vis).map(t=>t.id);
    const modals=[...document.querySelectorAll('.modal-bg,.form-modal')].filter(vis).map(m=>m.innerText.replace(/\\s+/g,' ').slice(0,110));
    const comp=document.getElementById('companion-overlay'); 
    return {tabs,modals,comp: comp&&vis(comp)};
  }`+')')());
  console.log('\nACTION:',a.slice(0,70));
  console.log('  ->',JSON.stringify(st), err?('ERR '+err):'');
}
console.log('\nERRORS:',[...new Set(errors)].slice(0,20));
await browser.close();server.close();})();
