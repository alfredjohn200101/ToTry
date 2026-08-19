const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT='/Users/alfredjohn/Desktop/ToTry/www';const PORT=8821;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((req,rq)=>{const c=decodeURIComponent(req.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rq.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rq);});s.listen(PORT,'127.0.0.1',()=>res(s));});
(async()=>{
const server=await serve();const browser=await chromium.launch({headless:true});
const CASES=[
 {n:'guest, NO vices', seed:{totry_guest:true,totry_onboarded:true,totry_name:'Sam'}},
 {n:'guest, ONE vice', seed:{totry_guest:true,totry_onboarded:true,totry_name:'Sam',totry_v:[{n:'Weed',mode:'quit',startDate:new Date(Date.now()-5*864e5).toISOString()}]}},
 {n:'guest, TWO vices', seed:{totry_guest:true,totry_onboarded:true,totry_name:'Sam',totry_v:[{n:'Weed',mode:'quit'},{n:'Scrolling',mode:'quit'}]}},
];
for(const c of CASES){
 const ctx=await browser.newContext({viewport:{width:414,height:896}});const page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message).slice(0,200)));
 await page.addInitScript(s=>{for(const[k,v]of Object.entries(s))localStorage.setItem(k,JSON.stringify(v));},c.seed);
 await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(3000);
 const r0 = await page.evaluate(()=>({vices: (typeof vices!=='undefined')?JSON.stringify(vices).slice(0,120):'undef'}));
 await page.evaluate(()=>{ openFeelingDoor(); });
 await page.waitForTimeout(600);
 await page.evaluate(()=>{document.querySelectorAll('#feel-door .feel-chip')[0].click();});
 await page.waitForTimeout(2500);
 const s = await page.evaluate(()=>{
   const vis=el=>{if(!el)return false;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;const r=el.getBoundingClientRect();return r.width>2&&r.height>2;};
   const ids=['companion-overlay','companion-backdrop','feel-door','feel-backdrop','moment-overlay'];
   const o={};ids.forEach(id=>{const e=document.getElementById(id);o[id]=e?(vis(e)?'VISIBLE cls='+e.className:'hidden cls='+e.className):'missing';});
   o.modals=[...document.querySelectorAll('.modal-bg')].filter(vis).map(m=>m.innerText.replace(/\s+/g,' ').slice(0,90));
   o.allVisibleFixed=[...document.querySelectorAll('div')].filter(e=>getComputedStyle(e).position==='fixed'&&vis(e)&&e.getBoundingClientRect().height>250).map(e=>(e.id||e.className).slice(0,40));
   return o;
 });
 console.log('\n==',c.n,'| vices:',r0.vices);
 console.log(JSON.stringify(s,null,1));
 if(errors.length)console.log(' ERRORS',[...new Set(errors)].slice(0,5));
 await ctx.close();
}
await browser.close();server.close();})();
