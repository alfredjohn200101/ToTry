const http=require('http'), fs=require('fs'), path=require('path');
const { chromium } = require('playwright');
const ROOT=path.join('/Users/alfredjohn/Desktop/ToTry','www'); const PORT=8881;
const serve=()=>new Promise(res=>{const s=http.createServer((rq,rs)=>{const clean=decodeURIComponent(rq.url.split('?')[0]);let f=path.join(ROOT, clean==='/'?'index.html':clean);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(ROOT,'index.html');rs.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});fs.createReadStream(f).pipe(rs);});s.listen(PORT,'127.0.0.1',()=>res(s));});
(async()=>{
  const server=await serve(); const browser=await chromium.launch({headless:true});
  const page=await (await browser.newContext()).newPage();
  await page.addInitScript(()=>{localStorage.setItem('totry_guest','true');localStorage.setItem('totry_onboarded','true');});
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2500);
  const data=await page.evaluate(()=>{
    const out=[];
    for(const k of Object.getOwnPropertyNames(window)){
      let v; try{ v=window[k]; }catch(e){ continue; }
      if(typeof v!=='function') continue;
      let s; try{ s=v.toString(); }catch(e){ continue; }
      if(!/^\s*(async\s+)?function\s/.test(s)) continue;
      if(/\{\s*\[native code\]\s*\}/.test(s)) continue;
      out.push({name:k, lines:s.split('\n').length, bytes:s.length,
                stmts:(s.match(/;/g)||[]).length,
                branches:(s.match(/\bif\s*\(|\?|\&\&|\|\||\bcase\b/g)||[]).length,
                innerHTMLw:(s.match(/innerHTML\s*(\+?=)/g)||[]).length,
                lsCalls:(s.match(/\bls\(/g)||[]).length,
                inlineStyle:(s.match(/style="/g)||[]).length});
    }
    return out;
  });
  data.sort((a,b)=>b.lines-a.lines);
  console.log('functions reachable as globals:', data.length);
  console.log('median lines:', data.map(d=>d.lines).sort((a,b)=>a-b)[Math.floor(data.length/2)]);
  console.log('>100 lines:', data.filter(d=>d.lines>100).length, ' >200:', data.filter(d=>d.lines>200).length, ' >300:', data.filter(d=>d.lines>300).length);
  console.log('--- top 25 by lines ---');
  for(const d of data.slice(0,25)) console.log(String(d.lines).padStart(4), String(d.bytes).padStart(6), 'br='+String(d.branches).padStart(3), 'ihtml='+String(d.innerHTMLw).padStart(2), 'sty='+String(d.inlineStyle).padStart(3), d.name);
  console.log('--- top 12 by inline style= count ---');
  data.sort((a,b)=>b.inlineStyle-a.inlineStyle);
  for(const d of data.slice(0,12)) console.log(String(d.inlineStyle).padStart(4), 'lines='+String(d.lines).padStart(4), d.name);
  console.log('--- top 12 by branches ---');
  data.sort((a,b)=>b.branches-a.branches);
  for(const d of data.slice(0,12)) console.log(String(d.branches).padStart(4), 'lines='+String(d.lines).padStart(4), d.name);
  fs.writeFileSync('/private/tmp/claude-501/-Users-alfredjohn-Desktop-ToTry/0fcac028-f9bf-4731-ab57-8b340678f2e7/scratchpad/fnsize.json', JSON.stringify(data));
  await browser.close(); server.close();
})();
