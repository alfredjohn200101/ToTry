const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.join('/Users/alfredjohn/Desktop/ToTry','www');
const PORT=8811;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((req,rq)=>{const c=decodeURIComponent(req.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rq.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rq);});s.listen(PORT,'127.0.0.1',()=>res(s));});

const PATHS = {
  // name -> array of steps: ['fn:obNext(2)'] or ['click:#sel']
  quick:   ["obNext(2)","#ob-name<<Sam","obNextToMoment()","obSkipMoment()","obNextToApps()","skipAppsStep()","obQuickFinish()"],
  feeling: ["obNext(2)","#ob-name<<Sam","obNextToMoment()","FEEL0"],
  full:    ["obNext(2)","#ob-name<<Sam","obNextToMoment()","obSkipMoment()","obNextToApps()","skipAppsStep()","obStartFoundation()","obNextToWhy()","finishWhyStep()","obPickFaith('secular')","obNext(5)","obNext(6)","finishOnboard()"],
};

(async()=>{
  const server=await serve();
  const browser=await chromium.launch({headless:true});
  for(const [name,steps] of Object.entries(PATHS)){
    const ctx=await browser.newContext({viewport:{width:414,height:896}});
    const page=await ctx.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e.message).slice(0,200)));
    page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text().slice(0,160));});
    await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(3000);
    // force onboarding visible (simulates: signed up, not yet onboarded)
    await page.evaluate(()=>{
      const a=document.getElementById('auth-container'); if(a)a.style.display='none';
      const o=document.getElementById('onboard'); o.style.display='block'; o.classList.add('active');
      document.querySelectorAll('.ob-step').forEach(s=>s.classList.remove('active'));
      document.getElementById('ob1').classList.add('active');
    });
    const trace=[];
    for(const st of steps){
      const before = await page.evaluate(()=>{const a=document.querySelector('.ob-step.active');return a?a.id:'(none)';});
      let err=null;
      if(st.includes('<<')){
        const [sel,val]=st.split('<<');
        await page.fill(sel,val);
      } else if(st==='FEEL0'){
        await page.evaluate(()=>{const b=document.querySelector('#ob-moment-grid button'); if(b)b.click(); else window.__noChips=true;});
      } else {
        err = await page.evaluate(code=>{try{eval(code);return null;}catch(e){return String(e.message);}}, st);
      }
      await page.waitForTimeout(900);
      const after = await page.evaluate(()=>{
        const a=document.querySelector('.ob-step.active');
        const ob=document.getElementById('onboard');
        return {step:a?a.id:'(none)', obVisible: ob && getComputedStyle(ob).display!=='none'};
      });
      trace.push(`${st}  [${before} -> ${after.step}] obVis=${after.obVisible}${err?' ERR:'+err:''}`);
    }
    await page.waitForTimeout(1500);
    const final = await page.evaluate(()=>{
      const out={};
      out.obVisible = getComputedStyle(document.getElementById('onboard')).display!=='none';
      out.authVisible = getComputedStyle(document.getElementById('auth-container')).display!=='none';
      const home=document.getElementById('tab-home');
      out.homeVisible = home && getComputedStyle(home).display!=='none';
      out.ls = {};
      ['totry_onboarded','totry_start','totry_name','totry_identity','totry_season','totry_faith_tradition','totry_v','totry_why','totry_apps_used','totry_sex','totry_first_moment','totry_h'].forEach(k=>{out.ls[k]=localStorage.getItem(k);});
      // visible modal?
      out.openModals = [...document.querySelectorAll('.modal-bg.open')].map(m=>(m.innerText||'').slice(0,80));
      out.firstrun = (()=>{const c=document.getElementById('firstrun-card');return c?c.style.display:'(missing)';})();
      out.bodyText=(document.body.innerText||'').slice(0,400);
      return out;
    });
    console.log('\n===== PATH:',name,'=====');
    trace.forEach(t=>console.log('  ',t));
    console.log('  FINAL:',JSON.stringify(final,null,1).slice(0,2200));
    if(errors.length)console.log('  ERRORS:',[...new Set(errors)].slice(0,12));
    await ctx.close();
  }
  await browser.close(); server.close();
})();
