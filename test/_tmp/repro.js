const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.join('/Users/alfredjohn/Desktop/ToTry','www');
const PORT=8811;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((req,rq)=>{const clean=decodeURIComponent(req.url.split('?')[0]);let file=path.join(ROOT,clean==='/'?'index.html':clean);if(!file.startsWith(ROOT)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(ROOT,'index.html');rq.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(rq);});s.listen(PORT,'127.0.0.1',()=>res(s));});

// 52 weekly weigh-ins, newest first: 88.4 -> 78.2
const body=[];
for(let i=0;i<52;i++){
  const d=new Date(Date.now()-i*7*864e5);
  body.push({date:d.toLocaleDateString('en-AU',{day:'numeric',month:'short'}),ts:d.toISOString(),weight:Math.round((78.2+i*0.2)*10)/10,bf:0,note:'',scores:{train:7,nutrition:7,sleep:7,stress:4,energy:7,faith:6},win:'',struggle:'',focus:''});
}
(async()=>{
  const server=await serve();
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:414,height:896}});
  const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(String(e.message).slice(0,200)));
  await page.addInitScript(seed=>{for(const[k,v]of Object.entries(seed))localStorage.setItem(k,JSON.stringify(v));},{
    totry_guest:true,totry_onboarded:true,totry_name:'Sam',totry_faith_tradition:'secular',totry_sex:'male',
    totry_height:180,totry_body:body
  });
  await page.goto('http://127.0.0.1:'+PORT+'/index.html',{waitUntil:'load'});
  await page.waitForTimeout(2500);
  const read=()=>page.evaluate(()=>{
    const t=id=>{const e=document.getElementById(id);return e?e.textContent.trim():'(missing)';};
    return {now:t('bod-cur'),start:t('bod-st'),change:t('bod-lo'),bmi:t('bod-bmi'),summary:t('bod-current-summary'),
      entry0:(JSON.parse(localStorage.getItem('totry_body')||'[]')[0]||{}).weight};
  });
  // navigate to body tab via the app's own router
  await page.evaluate(()=>{ if(typeof go==='function') go('body'); });
  await page.waitForTimeout(1200);
  console.log('BEFORE',await read());
  // Fill the weekly reflection, leave weight blank, press the real button
  const clicked = await page.evaluate(()=>{
    const set=(id,v)=>{const e=document.getElementById(id);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));}return !!e;};
    set('wk-win','Made it to the gym four times');
    set('wk-struggle','Stress at work');
    set('wk-focus','Sleep before midnight');
    ['wk-train','wk-nut','wk-sleep','wk-stress','wk-energy','wk-faith'].forEach(id=>set(id,7));
    const w=document.getElementById('bod-weight'); if(w) w.value='';
    const btns=[...document.querySelectorAll('button')].filter(b=>/Log this week/i.test(b.textContent));
    if(btns.length){btns[0].click();return 'clicked '+btns.length;}
    return 'no button';
  });
  console.log('CLICK:',clicked);
  await page.waitForTimeout(2000);
  console.log('AFTER',await read());
  // reload — does it persist?
  await page.reload({waitUntil:'load'});
  await page.waitForTimeout(2500);
  await page.evaluate(()=>{ if(typeof go==='function') go('body'); });
  await page.waitForTimeout(1200);
  console.log('AFTER RELOAD',await read());
  const hist=await page.evaluate(()=>{const e=document.getElementById('body-history');return e?e.textContent.replace(/\s+/g,' ').slice(0,300):'(missing)';});
  console.log('HISTORY:',hist);
  console.log('PAGE ERRORS:',errs.slice(0,5));
  await browser.close();server.close();
})();
