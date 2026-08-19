const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.join('/Users/alfredjohn/Desktop/ToTry','www');
const PORT=8813;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((req,rq)=>{const c=decodeURIComponent(req.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rq.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rq);});s.listen(PORT,'127.0.0.1',()=>res(s));});

const PROBE = `(()=>{
  const vis = el => { if(!el) return false; const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)===0) return false; const r=el.getBoundingClientRect(); return r.width>2 && r.height>2; };
  const out={};
  out.modals=[...document.querySelectorAll('.modal-bg')].filter(vis).map(m=>(m.innerText||'').replace(/\\s+/g,' ').slice(0,120));
  out.anyFixedOverlay=[...document.querySelectorAll('body > div')].filter(el=>{const cs=getComputedStyle(el); return cs.position==='fixed' && vis(el) && el.getBoundingClientRect().height>200;}).map(e=>(e.id||e.className)+' :: '+(e.innerText||'').replace(/\\s+/g,' ').slice(0,90));
  out.feelDoorOpen = !!document.getElementById('feel-door')?.classList.contains('open');
  out.obVis = getComputedStyle(document.getElementById('onboard')).display!=='none';
  out.activeTab = [...document.querySelectorAll('.tab')].filter(vis).map(t=>t.id);
  return out;
})()`;

(async()=>{
  const server=await serve();
  const browser=await chromium.launch({headless:true});
  const modes=['onboard','door'];
  for(const mode of modes){
  console.log('\n########## MODE:',mode);
  for(let i=0;i<10;i++){
    const ctx=await browser.newContext({viewport:{width:414,height:896}});
    const page=await ctx.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e.message).slice(0,160)));
    if(mode==='door'){
      await page.addInitScript(()=>{localStorage.setItem('totry_guest','true');localStorage.setItem('totry_onboarded','true');localStorage.setItem('totry_name','"Sam"');});
    }
    await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(3000);
    let label;
    if(mode==='onboard'){
      await page.evaluate(()=>{
        const a=document.getElementById('auth-container'); if(a)a.style.display='none';
        const o=document.getElementById('onboard'); o.style.display='block'; o.classList.add('active');
        document.querySelectorAll('.ob-step').forEach(s=>s.classList.remove('active'));
        document.getElementById('ob1').classList.add('active'); obNext(2);
      });
      await page.fill('#ob-name','Sam');
      await page.evaluate(()=>obNextToMoment());
      await page.waitForTimeout(400);
      label = await page.evaluate(i=>{const bs=[...document.querySelectorAll('#ob-moment-grid button')];if(!bs[i])return null;const t=bs[i].innerText.replace(/\n/g,' ');bs[i].click();return t;},i);
    } else {
      await page.evaluate(()=>openFeelingDoor());
      await page.waitForTimeout(500);
      label = await page.evaluate(i=>{const bs=[...document.querySelectorAll('#feel-door .feel-chip')];if(!bs[i])return null;const t=bs[i].innerText.replace(/\n/g,' ');bs[i].click();return t;},i);
    }
    await page.waitForTimeout(3000);
    const s = await page.evaluate(PROBE);
    console.log('['+i+'] '+label);
    console.log('    modals:',JSON.stringify(s.modals));
    console.log('    fixedOverlays:',JSON.stringify(s.anyFixedOverlay));
    console.log('    feelDoorOpen:',s.feelDoorOpen,'obVis:',s.obVis,'tabs:',JSON.stringify(s.activeTab));
    if(errors.length) console.log('    ERRORS',[...new Set(errors)].slice(0,4));
    await ctx.close();
  }}
  await browser.close(); server.close();
})();
