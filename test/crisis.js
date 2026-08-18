// ── THE CRISIS WALK ──────────────────────────────────────────────────────────────────────────────
// Types the worst thing a person will ever type into this app, at every entry point that accepts free
// text, and asserts they can SEE and TAP a real helpline.
//
// WHY THIS EXISTS, exactly. Scripture search called showCrisisResponse with a container id that exists
// nowhere in the app. Its fallback appended a bare div to document.body — and body is
// `position:fixed; inset:0; overflow:hidden`, so the card landed one full viewport down, CLIPPED, and
// scrollIntoView could not reach it. Someone typed "i want to kill myself" into a Bible search and the
// results box under the box stayed empty. The app appeared to do nothing.
//
// It survived every test in this repo, including thirteen dedicated crisis tests, because the crisis
// TEXT was in the DOM the whole time. A DOM-text assertion cannot tell "on the screen" from "in the
// document one viewport below a clipping boundary". Only geometry can. So this asserts:
//   · a helpline number is inside the viewport,
//   · elementFromPoint at its centre returns the link itself (nothing is covering it),
//   · and the href is a real tel:.
//
// Run with `npm run crisis`. Exits non-zero on any finding, so it can gate a commit.
const http=require('http'), fs=require('fs'), path=require('path');
const { chromium } = require('playwright');
const ROOT=path.join(__dirname,'..','www'); const PORT=8859;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=()=>new Promise(res=>{
  const s=http.createServer((rq,rs)=>{
    const clean=decodeURIComponent(rq.url.split('?')[0]);
    let f=path.join(ROOT, clean==='/'?'index.html':clean);
    if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()) f=path.join(ROOT,'index.html');
    rs.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(f).pipe(rs);
  }); s.listen(PORT,'127.0.0.1',()=>res(s));
});

const PHRASE = 'i want to kill myself';

// Each entry point: how to get there, and how the person submits their text.
const DOORS = [
  { name: 'scripture search (Soul → Read)',
    go: async page => page.evaluate(async () => { go('bible'); if(typeof setBibleTab==='function') setBibleTab('read'); }),
    fire: async (page, phrase) => page.evaluate(async p => { await searchBible(p); }, phrase) },
  { name: 'find a verse for how I feel',
    go: async page => page.evaluate(async () => { go('bible'); if(typeof setBibleTab==='function') setBibleTab('find'); }),
    fire: async (page, phrase) => page.evaluate(async p => { if(typeof findVerse==='function') await findVerse(p); }, phrase) },
  // The four doors below were added after the first walk: every remaining place a person can type
  // free text that reaches a model. A gate that exists in source but is bypassed by the actual call
  // path is the shape this file was written for, so each is DRIVEN rather than grepped.
  { name: 'the coach chat',
    go: async page => page.evaluate(async () => { go('coach'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('coach-in'); if(i) i.value = p;
      if(typeof sendCoach === 'function') await sendCoach();
    }, phrase) },
  { name: 'the PT chat',
    go: async page => page.evaluate(async () => { go('train'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('pt-in'); if(i) i.value = p;
      if(typeof sendPT === 'function') await sendPT();
    }, phrase) },
  { name: 'the companion free text',
    go: async page => page.evaluate(async () => { if(typeof openCompanion==='function') openCompanion(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const f = document.getElementById('comp-freetext');
      if(f) f.value = p;                                  // it reads the field, it takes no argument
      if(typeof companionFreeText === 'function') await companionFreeText();
    }, phrase) },
  { name: 'the morning check-in',
    go: async page => page.evaluate(async () => { go('home'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const g = document.getElementById('morning-grateful'), i = document.getElementById('morning-intention');
      if(g) g.value = p; if(i) i.value = p;
      if(typeof completeMorning === 'function') await completeMorning();
    }, phrase) },
  { name: 'the journal',
    go: async page => page.evaluate(async () => { go('soul'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      if(typeof journalCrisisOf === 'function' && typeof journalMeetCrisis === 'function'){
        const k = journalCrisisOf(p); if(k) journalMeetCrisis(k);
      } }, phrase) },
];

// A crisis card a person can actually use: on screen, on top, and dialable.
const PROBE = `(() => {
  const card = document.querySelector('[aria-label="Urgent: real people you can contact right now"]');
  if(!card) return { card:false };
  const vh = window.innerHeight, vw = window.innerWidth;
  const tels = [...card.querySelectorAll('a[href^="tel:"]')];
  if(!tels.length) return { card:true, tels:0 };
  let best = null;
  for(const t of tels){
    t.scrollIntoView({ block:'center' });
    const q = t.getBoundingClientRect();
    if(q.top < 0 || q.bottom > vh || q.left < 0 || q.right > vw || q.width < 1) continue;
    const hit = document.elementFromPoint(q.left + q.width/2, q.top + q.height/2);
    const clear = !!(hit && (hit === t || t.contains(hit)));
    if(clear){ best = { number: t.textContent.trim(), href: t.getAttribute('href') }; break; }
    if(!best) best = { number: t.textContent.trim(), href: t.getAttribute('href'), covered: (hit ? (hit.id||hit.tagName) : 'nothing') };
  }
  return { card:true, tels: tels.length, usable: !!(best && !best.covered), detail: best,
           lifted: !!card.closest('.crisis-rescue-ov') };
})()`;

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ headless:true });
  const findings = [];
  let checks = 0;

  for (const door of DOORS) {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0,120)));
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); s('totry_faith_tradition','christianity'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2900);
    // Anything that opened on its own would sit over the card and make this measure the overlay, not
    // the app. (It did, the first time — the guest flow auto-opens the companion at z-410.)
    await page.evaluate(() => document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open')));
    await door.go(page);
    await page.waitForTimeout(600);
    try { await door.fire(page, PHRASE); } catch (e) { findings.push(`${door.name}: threw — ${String(e.message).slice(0,90)}`); }
    await page.waitForTimeout(1000);
    const r = await page.evaluate(PROBE);
    checks++;
    if (!r.card) findings.push(`${door.name}: NO crisis card at all after "${PHRASE}"`);
    else if (!r.tels) findings.push(`${door.name}: crisis card has no tel: link`);
    else if (!r.usable) findings.push(`${door.name}: the helpline is NOT usable — ${JSON.stringify(r.detail)}`);
    else console.log(`  ✓ ${door.name.padEnd(34)} ${r.detail.number} (${r.detail.href})${r.lifted?' [rescued into overlay]':''}`);
    if (errs.length) findings.push(`${door.name}: page error — ${errs[0]}`);
    await ctx.close();
  }

  // And the net itself: with the container gone, the card must still reach the person.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); s('totry_faith_tradition','christianity'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2900);
    await page.evaluate(() => {
      document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.remove());
      go('bible'); if(typeof setBibleTab==='function') setBibleTab('read');
    });
    await page.waitForTimeout(600);
    await page.evaluate(async p => {
      const box = document.getElementById('br-search-results');   // the exact state the bug produced
      if(box) box.parentNode.removeChild(box);
      await searchBible(p);
    }, PHRASE);
    await page.waitForTimeout(1000);
    const r = await page.evaluate(PROBE);
    checks++;
    if (!r.card || !r.usable) findings.push(`the safety net: with no container, the helpline is unreachable — ${JSON.stringify(r)}`);
    else console.log(`  ✓ ${'safety net (container deleted)'.padEnd(34)} ${r.detail.number} lifted=${r.lifted}`);
  }

  await browser.close(); server.close();
  console.log('');
  if (findings.length) { findings.forEach(f => console.log('  ✗ ' + f)); console.log(`\n✗ ${findings.length} finding(s)\n`); process.exit(1); }
  console.log(`✓ a real helpline is visible and dialable at all ${checks} crisis doors\n`);
})();
