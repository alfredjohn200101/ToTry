const http=require('http'), fs=require('fs'), path=require('path');
const { chromium }=require('playwright');
const ROOT='/Users/alfredjohn/Desktop/ToTry/www', PORT=8812;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{const s=http.createServer((q,r)=>{const c=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,c==='/'?'index.html':c);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r);});s.listen(PORT,'127.0.0.1',()=>res(s));});
const D=n=>new Date(Date.now()-n*864e5), iso=n=>D(n).toISOString();
const au=(n,o)=>D(n).toLocaleDateString('en-AU',o);

// A year of honest weekly weigh-ins, then THIS week's check-in written with the weight box left blank
// (the form calls it "optional").
const body=[];
body.push({date:au(0,{day:'numeric',month:'short'}),ts:iso(0),weight:0,bf:0,note:'',photo:null,
           scores:{train:8,nutrition:7,sleep:6,stress:4,energy:7,faith:8},
           win:'Trained four times',struggle:'Late nights',focus:'Sleep by 11'});
for(let i=1;i<=52;i++) body.push({date:au(i*7,{day:'numeric',month:'short'}),ts:iso(i*7),weight:Math.round((78+i*0.2)*10)/10,bf:18,note:'',scores:{}});

const seed={ totry_guest:true, totry_onboarded:true, totry_name:'Sam', totry_sex:'male',
  totry_faith_tradition:'secular', totry_start:iso(400), totry_journey_start:iso(400),
  totry_height:180, totry_body:body };

(async()=>{
  const server=await serve(); const b=await chromium.launch({headless:true});
  const ctx=await b.newContext({viewport:{width:414,height:896}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,120));});
  await p.addInitScript(s=>{for(const[k,v]of Object.entries(s))localStorage.setItem(k,JSON.stringify(v));},seed);
  await ctx.route('**/*',r=>r.request().url().includes('127.0.0.1')?r.continue():r.abort('internetdisconnected'));
  await p.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'load'});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{ if(typeof go==='function') go('track'); });
  await p.waitForTimeout(1200);
  const out=await p.evaluate(()=>({
    now:document.getElementById('bod-cur')?.textContent,
    start:document.getElementById('bod-st')?.textContent,
    change:document.getElementById('bod-lo')?.textContent,
    bmi:document.getElementById('bod-bmi')?.textContent,
    summary:document.getElementById('bod-current-summary')?.textContent,
    chart:(document.getElementById('weight-chart')?.innerHTML||'').slice(0,300),
    history:(document.getElementById('bod-weight-history')?.innerText||'').slice(0,120)
  }));
  console.log(JSON.stringify(out,null,1));
  console.log('errors:',errs.filter(e=>!/DISCONNECT|vibrate/.test(e)).join(' | ')||'none');
  await b.close(); server.close();
})();
