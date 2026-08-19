const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT='/Users/alfredjohn/Desktop/ToTry/www';const PORT=8841;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((req,rq)=>{const c=decodeURIComponent(req.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rq.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rq);});s.listen(PORT,'127.0.0.1',()=>res(s));});
(async()=>{
const server=await serve();const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:414,height:896},permissions:[]});const page=await ctx.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e.message).slice(0,200)));
// deny every permission
await page.addInitScript(()=>{
  navigator.permissions && (navigator.permissions.query = async ()=>({state:'denied',onchange:null}));
  if(window.Notification){ Object.defineProperty(Notification,'permission',{get:()=>'denied'}); Notification.requestPermission=async()=>'denied'; }
  navigator.mediaDevices && (navigator.mediaDevices.getUserMedia = ()=>Promise.reject(new Error('NotAllowedError')));
  navigator.geolocation && (navigator.geolocation.getCurrentPosition=(_,e)=>e&&e({code:1}));
});
await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(3500);
const pre = await page.evaluate(()=>({auth:getComputedStyle(document.getElementById('auth-container')).display, txt:(document.body.innerText||'').replace(/\s+/g,' ').slice(0,300)}));
console.log('BEFORE:',JSON.stringify(pre));
await page.click('#auth-guest-btn');
await page.waitForTimeout(2000);
const after = await page.evaluate(()=>{
  const vis=el=>{if(!el)return false;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return false;const r=el.getBoundingClientRect();return r.width>2&&r.height>2;};
  return {door:document.getElementById('feel-door').classList.contains('open'), doorText:(document.getElementById('feel-door').innerText||'').replace(/\s+/g,' ').slice(0,220), ls:Object.keys(localStorage)};
});
console.log('AFTER GUEST TAP:',JSON.stringify(after,null,1));
// close door, browse tabs
await page.evaluate(()=>closeFeelingDoor());
await page.waitForTimeout(600);
for(const t of ['home','fight','grow','money','soul']){
  await page.evaluate(t=>go(t),t);
  await page.waitForTimeout(900);
  const s=await page.evaluate(t=>{
    const pane=document.getElementById('tab-'+t); if(!pane) return {t,missing:true};
    const txt=(pane.innerText||'').replace(/\s+/g,' ');
    return {t, len:txt.length, bad:(txt.match(/undefined|NaN|null|\[object|Infinity/g)||[]).slice(0,6), head:txt.slice(0,180)};
  },t);
  console.log('TAB',JSON.stringify(s));
}
console.log('ERRORS',[...new Set(errors)].slice(0,15));
await browser.close();server.close();})();
