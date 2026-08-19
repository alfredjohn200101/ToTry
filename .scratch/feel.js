const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.join('/Users/alfredjohn/Desktop/ToTry','www');
const PORT=8812;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((req,rq)=>{const c=decodeURIComponent(req.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rq.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rq);});s.listen(PORT,'127.0.0.1',()=>res(s));});

(async()=>{
  const server=await serve();
  const browser=await chromium.launch({headless:true});
  const N = 10;
  for(let i=0;i<N;i++){
    const ctx=await browser.newContext({viewport:{width:414,height:896}});
    const page=await ctx.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e.message).slice(0,160)));
    await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(3000);
    await page.evaluate(()=>{
      const a=document.getElementById('auth-container'); if(a)a.style.display='none';
      const o=document.getElementById('onboard'); o.style.display='block'; o.classList.add('active');
      document.querySelectorAll('.ob-step').forEach(s=>s.classList.remove('active'));
      document.getElementById('ob1').classList.add('active');
      obNext(2);
    });
    await page.fill('#ob-name','Sam');
    await page.evaluate(()=>obNextToMoment());
    await page.waitForTimeout(400);
    const label = await page.evaluate(i=>{
      const bs=[...document.querySelectorAll('#ob-moment-grid button')];
      if(!bs[i]) return null;
      const t=bs[i].innerText.replace(/\n/g,' ');
      bs[i].click(); return t;
    }, i);
    await page.waitForTimeout(2500);
    const state = await page.evaluate(()=>{
      const vis = el => el && el.offsetParent!==null && getComputedStyle(el).display!=='none' && getComputedStyle(el).visibility!=='hidden';
      const out={};
      out.modals=[...document.querySelectorAll('.modal-bg')].filter(vis).map(m=>(m.innerText||'').replace(/\n+/g,' | ').slice(0,140));
      const sheets=['companion-sheet','feel-door','release-sheet'];
      out.sheets={}; sheets.forEach(id=>{const e=document.getElementById(id); out.sheets[id]= e? (e.className+' vis='+vis(e)) : 'missing';});
      // anything full-screen-ish and open
      out.openish=[...document.querySelectorAll('[class*=open]')].filter(vis).map(e=>e.id||e.className).slice(0,12);
      out.obVis=getComputedStyle(document.getElementById('onboard')).display!=='none';
      // topmost visible interactive overlay text
      out.body=(document.body.innerText||'').replace(/\n+/g,' | ').slice(0,300);
      return out;
    });
    console.log('\n['+i+'] '+label);
    console.log('   modals:',JSON.stringify(state.modals));
    console.log('   sheets:',JSON.stringify(state.sheets));
    console.log('   openish:',JSON.stringify(state.openish));
    if(errors.length) console.log('   ERRORS',[...new Set(errors)].slice(0,5));
    await ctx.close();
  }
  await browser.close(); server.close();
})();
