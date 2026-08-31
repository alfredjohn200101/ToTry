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
      // morning-gratitudE, not morning-grateful. The old id does not exist, so this line silently
      // wrote nothing for as long as it has been here and the door was only ever tested through the
      // intention field. Both are gated, and both should be proven.
      const g = document.getElementById('morning-gratitude'), i = document.getElementById('morning-intention');
      if(g) g.value = p; if(i) i.value = p;
      if(typeof completeMorning === 'function') await completeMorning();
    }, phrase) },
  { name: 'the examen (Repent)',
    go: async page => page.evaluate(async () => { go('soul'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      // Step 4 asks where they fell short and tells them to be specific. The app pushes them here at
      // the end of the day, and it was the only free-text soul surface with no gate.
      if(typeof _examenAnswers === 'object' && _examenAnswers) _examenAnswers.repent = p;
      else window._examenAnswers = { repent: p };
      if(typeof saveExamen === 'function') saveExamen();
    }, phrase) },
  { name: 'the journal',
    go: async page => page.evaluate(async () => { go('soul'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      if(typeof journalCrisisOf === 'function' && typeof journalMeetCrisis === 'function'){
        const k = journalCrisisOf(p); if(k) journalMeetCrisis(k);
      } }, phrase) },
  { name: 'the meal describer (Nourish)',
    go: async page => page.evaluate(async () => { go('nourish'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      if(typeof estimateMealMacros === 'function') await estimateMealMacros(p);
    }, phrase) },
  // THE SUNDAY CHECK-IN, WITH A WEIGHT THE APP REFUSES. This door was never in this list, and that is
  // exactly how v568 broke it: a 20–400 weight band was added to logBody 80 lines ABOVE the crisis
  // response, so "i want to kill myself" typed under "What got in your way? Honest answers only."
  // alongside a fat-fingered 854 returned at the band with a grey toast and no helpline — while the
  // same sentence with the box left blank got the full response. A validation rule outranked a
  // disclosure. The bad weight is the POINT of this fixture: without it the door passes either way.
  { name: 'the weekly check-in (bad weight)',
    go: async page => page.evaluate(async () => { go('track'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const t = document.getElementById('wk-struggle'); if(t) t.value = p;
      const w = document.getElementById('bod-weight'); if(w) w.value = '854';
      if(typeof logBody === 'function') await logBody();
    }, phrase) },
  { name: 'food search online (Nourish)',
    go: async page => page.evaluate(async () => { go('nourish'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      if(typeof searchFoodOnline === 'function') await searchFoodOnline(p);
    }, phrase) },
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
    // A number that is on screen and unobstructed but only 18px tall is still not usable by a
    // shaking thumb. Every helpline in this app was exactly that until v528.
    const minSide = Math.min(q.width, q.height);
    if(clear){ best = { number: t.textContent.trim(), href: t.getAttribute('href'), minSide: Math.round(minSide),
                        tooSmall: minSide < 24 }; break; }
    if(!best) best = { number: t.textContent.trim(), href: t.getAttribute('href'), covered: (hit ? (hit.id||hit.tagName) : 'nothing') };
  }
  return { card:true, tels: tels.length, usable: !!(best && !best.covered && !best.tooSmall), detail: best,
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

  // ── the guest door: no account, no onboarding, first contact ────────────────────────────────
  // Every door above runs as an ONBOARDED person, because the harness seeds totry_onboarded for the
  // whole loop. So the one door most likely to receive the worst sentence was never tested: a person
  // with no account taps "Something's pulling at me right now" on the sign-in screen — the app's own
  // no-setup promise — names a feeling, and types into free text. That is first contact, in distress,
  // with nothing stored. It needs its own context precisely because it must have NOTHING stored.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.clear());
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(3000);
    const reached = await page.evaluate(async (phrase) => {
      const vis = el => { if(!el) return false; const r = el.getBoundingClientRect();
        return r.width>0 && r.height>0 && getComputedStyle(el).display !== 'none'; };
      const guest = [...document.querySelectorAll('#auth-container button')]
        .find(x => /pulling at me/i.test(x.innerText || ''));
      if(!guest) return 'the sign-in screen has no no-account door';
      guest.click();
      await new Promise(x=>setTimeout(x,900));
      const fd = document.getElementById('feel-door');
      const feel = fd && [...fd.querySelectorAll('button')].find(x => /pull/i.test(x.innerText || ''));
      if(!feel) return 'the guest door did not open the Feeling Door';
      feel.click();
      await new Promise(x=>setTimeout(x,800));
      const layer = [...document.querySelectorAll('.modal-bg.open, .companion-overlay.open')].filter(vis).pop();
      const field = layer && [...layer.querySelectorAll('textarea, input[type=text]')].filter(vis)[0];
      if(!field) return 'no free text behind the guest door';
      field.value = phrase;
      field.dispatchEvent(new Event('input', { bubbles:true }));
      const send = [...layer.querySelectorAll('button')].filter(vis)
        .find(x => /send|go|continue|next|→|talk|tell|ready/i.test(x.innerText || ''));
      if(!send) return 'nothing to send it with';
      send.click();
      return null;
    }, PHRASE);
    await page.waitForTimeout(2600);
    checks++;
    if (reached) findings.push(`the guest door: ${reached}`);
    else {
      const r = await page.evaluate(PROBE);
      if (!r.card) findings.push(`the guest door: NO crisis card after "${PHRASE}" — with no account, this is first contact`);
      else if (!r.usable) findings.push(`the guest door: the helpline is NOT usable — ${JSON.stringify(r.detail)}`);
      else console.log(`  ✓ ${'the guest door (no account)'.padEnd(34)} ${r.detail.number} ${r.detail.minSide}px`);
    }
    await ctx.close();
  }

  // ── the breath's own escalation branch ────────────────────────────────────────────────────────
  // Not a free-text door, so the sweep above never reaches it — but it is the same moment. The person
  // has just told the app on a 0–10 scale that a minute of guided breathing did NOT move their
  // distress. The ending names the right next step ("let a real person in") and used to give them a
  // single button: close. Rating the same number twice is how you fault-inject it.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); s('totry_faith_tradition','christianity'); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2900);
    const r = await page.evaluate(async () => {
      // the protocol is shortened so the run finishes inside the test rather than in real minutes
      BREATH_PROTOCOLS.settle = { name:'Settle', cycles:1, phases:[{l:'In',s:0.05,scale:1.4},{l:'Out',s:0.05,scale:1}] };
      openBreath('settle', { reason:'test' });
      await new Promise(x=>setTimeout(x,150));
      const ov = document.querySelector('.breath-overlay');
      const pick = (sel,n) => [...ov.querySelectorAll(sel)].find(x=>x.textContent.trim()===String(n));
      pick('.b-pre button', 8)?.click();
      await new Promise(x=>setTimeout(x,2600));
      pick('.b-post button', 8)?.click();          // unchanged — it did not work for them
      await new Promise(x=>setTimeout(x,250));
      const more = ov.querySelector('.b-done-more');
      const shown = !!(more && more.style.display !== 'none' && more.querySelector('button'));
      if (!shown) return { shown:false };
      ov.querySelector('.b-done-bridge')?.click();
      await new Promise(x=>setTimeout(x,450));
      const txt = document.body.innerText;
      return { shown:true, help: /Lifeline|13 11 14|Beyond Blue|Samaritans|988/i.test(txt) };
    });
    checks++;
    if (!r.shown) findings.push('the breath ending: distress unchanged and the only control is close');
    else if (!r.help) findings.push('the breath ending: "Let someone in" does not reach a helpline');
    else console.log(`  ✓ ${'breath ending (still heavy)'.padEnd(34)} reaches a real helpline`);
  }

  await browser.close(); server.close();
  console.log('');
  if (findings.length) { findings.forEach(f => console.log('  ✗ ' + f)); console.log(`\n✗ ${findings.length} finding(s)\n`); process.exit(1); }
  console.log(`✓ a real helpline is visible and dialable at all ${checks} crisis doors\n`);
})();
