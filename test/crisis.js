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
const ROOT=path.join(__dirname,'..','www'); const PORT=+process.env.PORT||8859; // PORT=… so parallel worktrees do not collide on one fixed port
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
  // ── THE FIRST THINGS A PERSON EVER TYPES ─────────────────────────────────────────────────────
  // Found 5 Sep 2026 by an audit that walked onboarding as a new person. Three free-text fields in
  // the first five minutes of the app — the identity sentence, the why, and "what are you fighting"
  // — took a suicide disclosure, showed nothing, stored it verbatim, and printed it back as who the
  // person is becoming, why it matters to them, and a vice on their card with a clean-day counter
  // attached. detectCrisis() already answered "suicide" for the sentence in that same page. The
  // doors simply never asked, and none of them were in this list.
  // DOORS 40-44 — FOUND BY CENSUSING EVERY FREE-TEXT FIELD IN THE APP (12 Oct 2026), rather than
  // every field of one SHAPE. Both earlier censuses did the latter: one walked openFormModal, the
  // other grepped for a textarea tag. This one enumerated every textarea and every text-accepting
  // input in src/ -- 102 ids -- then asked which are persisted or reach a model and are read by no
  // function that gates. Five survived, and every one was DRIVEN in a browser, with the journal as
  // a control proving the probe can see a card, before any of them was believed.
  // The universal search's placeholder asks for "a word, a name, a FEELING", and this is the exact
  // shape the note at the top of this file was written about: somebody typed the worst sentence
  // into a Bible search and the results box stayed empty, so the app appeared to do nothing.
  // THE IDENTITY SENTENCE, A THIRD TIME. The 5 Sep audit gated onboarding's; the 30 Sep sweep found
  // the in-app editIdentity() still open and gated that; saveIdentity() reads the same field, does
  // the same auto-prefix and writes the same store, and was found by neither — because both of
  // those censuses enumerated one SHAPE of door instead of asking which fields exist.
  { name: 'the identity sentence (Settings)',
    go: async page => page.evaluate(() => { try{ if(typeof go==='function') go('why'); }catch(_){ } }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('settings-identity');
      if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof saveIdentity === 'function') saveIdentity();
    }, phrase) },
  { name: 'an affirmation about yourself',
    go: async page => page.evaluate(() => { try{ if(typeof go==='function') go('why'); }catch(_){ } }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('new-affirmation');
      if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof addWhyAffirmation === 'function') addWhyAffirmation();
    }, phrase) },
  { name: 'a quick win',
    go: async page => page.evaluate(() => {}),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('quick-win-input');
      if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof logQuickWin === 'function') logQuickWin();
    }, phrase) },
  { name: 'the universal search',
    go: async page => page.evaluate(() => { if(typeof openUniversalSearch==='function') openUniversalSearch(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('search-input');
      if(i){ i.value = p; }
      if(typeof runUniversalSearch === 'function') runUniversalSearch(p);
    }, phrase) },
  { name: 'the goal routine (sent to a model)',
    go: async page => page.evaluate(() => { if(typeof openGoalRoutine==='function') openGoalRoutine(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('goal-routine-input');
      if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof generateGoalRoutine === 'function') generateGoalRoutine();
    }, phrase) },
  { name: 'feedback to Alfy',
    go: async page => page.evaluate(() => { if(typeof openFeedback==='function') openFeedback(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('fb-text');
      if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof submitFeedback === 'function') submitFeedback();
    }, phrase) },
  { name: 'a goal',
    go: async page => page.evaluate(() => { if(typeof editGoal==='function') editGoal('year'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('goal-input');
      if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof saveGoalEdit === 'function') saveGoalEdit('year');
    }, phrase) },
  // The quick log is what somebody fills in right after a SLIP. savePostUrge is already a door
  // because it catches the moment after a WIN; this is the other one, and it had no gate at all.
  { name: 'the quick log - what triggered it',
    go: async page => page.evaluate(() => { if(typeof startQuickLog==='function') startQuickLog(0); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('ql-trigger');
      if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof saveQuickLog === 'function') saveQuickLog();
    }, phrase) },
  { name: 'the quick log - the note',
    go: async page => page.evaluate(() => { if(typeof startQuickLog==='function') startQuickLog(0); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('ql-note');
      if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof saveQuickLog === 'function') saveQuickLog();
    }, phrase) },
  { name: 'a habit anchor',
    go: async page => page.evaluate(() => { if(typeof openHabitAnchor==='function') openHabitAnchor(0); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('hab-anchor');
      if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof saveHabitAnchor === 'function') saveHabitAnchor(0);
    }, phrase) },
  // DOOR 39 — THE FUEL PLAN'S ONE FREE-TEXT FIELD. It HAD a gate and the gate was DEAD: it read
  // `fuel-dislikes`, `fuel-notes` and `fuel-diet`, none of which exist (the diet and dislike
  // controls are CHIP ROWS, `fuel-diet-row` / `fuel-dislike-row`, carrying no typed text). The one
  // field a person types into is `fuel-diet-free`. So detectCrisis was never called with anything,
  // for every version that gate existed — and this door was not in this list, which is how it
  // survived. That is the pairing to remember: a gate nobody drives is a gate that may not run.
  { name: 'the fuel plan · allergies / anything else',
    go: async page => page.evaluate(async () => { if(typeof _fuelElicit==='function') _fuelElicit(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      // A budget they typed, so `also` below can ask whether their work survived the crisis branch.
      const b = document.getElementById('fuel-budget');
      if(b){ b.value = '137'; b.dispatchEvent(new Event('input',{bubbles:true})); }
      const i = document.getElementById('fuel-diet-free');
      if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof _fuelElicitSave === 'function') _fuelElicitSave();
    }, phrase),
    // BOTH QUESTIONS, because this door is the only one whose answer is not "was it stored?" alone.
    // Two risks pull opposite ways on the same object: their CHOICES must survive (losing the
    // budget is the denial of service), and the SENTENCE must not (restrictions is rendered back
    // into the form and built into three api() prompts). An earlier version asked only the first,
    // so it could not have seen the defect that actually shipped — a fix that kept their work by
    // persisting the disclosure with it.
    // And it REPORTS a missing reader instead of returning null: `typeof getMealPrefs === 'function'`
    // falling through to `return null` means the same defect reports 1 finding or 0 depending on
    // whether the reader loaded, which is a check that passes when it cannot see.
    also: async (page, phrase) => page.evaluate(p => {
      if(typeof getMealPrefs !== 'function')
        return 'getMealPrefs is not loaded, so this door asserted nothing — THE CHECK IS WRONG, NOT THE APP';
      let prefs;
      try{ prefs = getMealPrefs(); }
      catch(e){ return 'getMealPrefs threw: ' + String(e && e.message).slice(0, 60); }
      if(!prefs) return 'getMealPrefs returned nothing, so this door asserted nothing';
      const problems = [];
      if(prefs.budget !== 137) problems.push('the fuel choices were discarded (budget ' + prefs.budget + ')');
      const blob = JSON.stringify(prefs).toLowerCase();
      if(blob.indexOf(String(p).toLowerCase()) >= 0)
        problems.push('the disclosure was STORED in meal prefs, where it is rendered back into the form and built into three api() prompts');
      return problems.length ? problems.join('; ') : null;
    }, phrase) },
  // DOOR 50 — THE SHOP PICKER WITH NO CHIP SELECTED, which is the only state the defect lived in.
  // `_fuelShopSave` was gated on 11 Oct and never driven, and its gate sat UNDER
  // `if(!shops.length) return` — so a disclosure typed into `#fuel-country` by a first-time person
  // (who has no saved chains, so no chip is `on`) got a grey "Pick at least one shop" and no
  // helpline. Every chip is turned OFF here deliberately: a door that happens to run with a chip
  // selected takes the happy path and cannot see this.
  { name: 'the fuel plan · shops & country (no chip on)',
    go: async page => page.evaluate(async () => { try{ if(typeof _fuelShopPicker==='function') _fuelShopPicker(true); }catch(_){ } }),
    fire: async (page, phrase) => page.evaluate(async p => {
      document.querySelectorAll('#fuel-shops-row .fuel-shop-chip').forEach(function(b){ b.classList.remove('on'); });
      const c = document.getElementById('fuel-country');
      // Recorded so a MISSING field reports the instrument rather than reading like a missing gate.
      window.__d50 = { field: !!c, chipsOn: document.querySelectorAll('#fuel-shops-row .fuel-shop-chip.on').length };
      if(c){ c.value = p; c.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof _fuelShopSave === 'function') _fuelShopSave();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p => {
      const d50 = window.__d50 || {};
      if(!d50.field)
        return '#fuel-country was not in the DOM, so this door asserted nothing — THE CHECK IS WRONG, NOT THE APP';
      if(d50.chipsOn !== 0)
        return 'a shop chip was still on (' + d50.chipsOn + '), so this door took the happy path and did NOT test the no-chip state — THE CHECK IS WRONG, NOT THE APP';
      // THE RAW STORE, NEVER getMealPrefs(). That reader SCRUBS a disclosure out of the prefs on the
      // way past (the legacy scrub added 11 Oct, because gating the write does not reach what was
      // already written) — so asking it would report a clean pass over text that really was stored.
      let raw = '';
      try{ raw = localStorage.getItem('totry_meal_prefs') || ''; }catch(_){ }
      if(raw.toLowerCase().indexOf(String(p).toLowerCase()) >= 0)
        return 'the disclosure was STORED raw in totry_meal_prefs, where `country` is concatenated into the meal-plan prompt and the price-lookup prompt';
      return null;
    }, phrase) },
  // DOOR 51 — THE PROGRESS CHECK-IN. It hid from all three earlier censuses for a NEW reason:
  // `.pc-note` is addressed by CLASS, so every census that enumerated ids was structurally blind to
  // it. And it is one of the worst to leave open — it INSERTS STRAIGHT INTO SUPABASE and persists to
  // `totry_feedback_outbox`, which a boot timer flushes four seconds after launch.
  { name: 'the progress check-in (free-text note)',
    go: async page => page.evaluate(async () => { try{ if(typeof openProgressCheckin==='function') openProgressCheckin(); }catch(_){ } }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const el = document.querySelector('.pc-note');
      window.__d51 = { field: !!el };
      if(el){ el.value = p; el.dispatchEvent(new Event('input',{bubbles:true})); }
      const send = document.querySelector('.pc-send');
      if(send) send.click();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p => {
      const d51 = window.__d51 || {};
      if(!d51.field)
        return '.pc-note was not in the DOM, so this door asserted nothing — THE CHECK IS WRONG, NOT THE APP';
      let raw = '';
      try{ raw = localStorage.getItem('totry_feedback_outbox') || ''; }catch(_){ }
      if(raw.toLowerCase().indexOf(String(p).toLowerCase()) >= 0)
        return 'the disclosure was queued in totry_feedback_outbox, which a boot timer inserts into the Supabase feedback table four seconds after launch';
      return null;
    }, phrase) },
  // DOOR 52 — THREE GOOD THINGS. The value reaches code only as an ARGUMENT
  // (`onblur="_tgtSaveField('c',this.value)"`), so no id or selector sits on the path and five
  // earlier censuses were blind to it. `totry_tgt` is in SYNC_KEYS, so the blur upserts to Supabase
  // in the same tick — and `_tgtTellThem` composes field `c` into a message for a named person.
  { name: 'three good things (the person field)',
    go: async page => page.evaluate(async () => { try{ if(typeof go==='function') go('evening'); if(typeof renderTGT==='function') renderTGT(); }catch(_){ } }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const el = document.getElementById('tgt-c');
      window.__d52 = { field: !!el };
      if(el){ el.value = p; el.dispatchEvent(new Event('blur',{bubbles:true})); }
      // the shipped path is the inline onblur, so call it the way the attribute does
      if(typeof _tgtSaveField === 'function') _tgtSaveField('c', p);
    }, phrase),
    also: async (page, phrase) => page.evaluate(p => {
      const d52 = window.__d52 || {};
      let raw = '';
      try{ raw = localStorage.getItem('totry_tgt') || ''; }catch(_){ }
      if(raw.toLowerCase().indexOf(String(p).toLowerCase()) >= 0)
        return 'the disclosure was stored in totry_tgt, which is in SYNC_KEYS (so it upserts to Supabase user_data) and is what _tgtTellThem composes into "<name> — just so you know: …" for the clipboard';
      if(!d52.field) return null;   // the field not being built is not a finding; the save path above still ran
      return null;
    }, phrase) },
  { name: 'onboarding · the identity sentence',
    go: async page => page.evaluate(async () => { if(typeof startOnboarding==='function') startOnboarding();
      document.querySelectorAll('.ob-step').forEach(s=>s.classList.remove('active'));
      document.getElementById('ob3')?.classList.add('active'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('ob-identity'); if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof obNextToWhy === 'function') obNextToWhy();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      (ls('totry_identity')||'') === p ? 'the disclosure was stored as their identity' : null, phrase) },
  { name: 'onboarding · why it matters',
    go: async page => page.evaluate(async () => { if(typeof startOnboarding==='function') startOnboarding();
      document.querySelectorAll('.ob-step').forEach(s=>s.classList.remove('active'));
      document.getElementById('ob-why')?.classList.add('active'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('ob-why-text'); if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof finishWhyStep === 'function') finishWhyStep();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      (ls('totry_why')||'') === p ? 'the disclosure was stored as their why' : null, phrase) },
  { name: 'onboarding · what are you fighting',
    go: async page => page.evaluate(async () => { if(typeof startOnboarding==='function') startOnboarding(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('ob-custom'); if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof obPersistVices === 'function') obPersistVices();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      ((ls('totry_v')||[]).some(v => v && v.n === p)) ? 'the disclosure became a vice card' : null, phrase) },
  // The calendar's paste-your-roster box goes straight to a model. Typing a disclosure into it
  // returned the parser's own failure toast — "Couldn't read that clearly ... or rephrase" — which
  // reads as the app brushing the sentence aside.
  { name: "the calendar's Add with AI",
    go: async page => page.evaluate(async () => { go('calendar'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('cal-ai-input'); if(i){ i.value = p; i.dispatchEvent(new Event('input',{bubbles:true})); }
      if(typeof parseCalendarAI === 'function') await parseCalendarAI();
    }, phrase) },
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
  // PASTE A RECIPE. The third free-text box in Nourish and the only one that was never a door: the
  // meal describer and the food search both gated, this one handed the text straight to the model.
  // Nobody expects a disclosure in a recipe box, which is the whole reason it has to ask — the same
  // shape as onboarding's identity field, which took one, stored it verbatim, and printed it back.
  // `also` asserts what the helpline check cannot see: that the box did not KEEP what was typed.
  { name: 'paste a recipe (Nourish)',
    go: async page => page.evaluate(async () => { go('nourish'); if(typeof openPasteRecipe==='function') openPasteRecipe(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const t = document.getElementById('paste-recipe-text'); if(t) t.value = p;
      if(typeof parsePastedRecipe === 'function') await parsePastedRecipe();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p => {
      const t = document.getElementById('paste-recipe-text');
      return (t && t.value.indexOf(p) > -1) ? 'the recipe box kept the disclosure' : null;
    }, phrase) },
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
  // THE TWO MOMENT-FLOW DOORS. Neither was in this list, and both shipped ungated — found on
  // 4 Sep 2026 by driving the app rather than reading it. The if-then plan is two taps from ALL SEVEN
  // Feeling Door paths, and it did something worse than miss the gate: it SAVED the disclosure and
  // replayed it verbatim under "THE PLAN YOU SET FOR THIS" every later time that feeling was chosen —
  // a person's own worst sentence handed back as their standing instruction. The avoiding door echoed
  // it into "Don't do <it>. Just START it — the smallest first step." Both now assert the helpline,
  // and the if-then door also asserts the phrase is NOT persisted, because gating the moment without
  // gating the read-back would leave the worse half of the harm in place.
  { name: 'the if-then plan (Feeling Door)',
    go: async page => page.evaluate(async () => { if(typeof _feelMove==='function') _feelMove('anxious'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      if(typeof _lockItIn === 'function') _lockItIn('anxious');
      await new Promise(r => setTimeout(r, 400));
      const t = document.getElementById('ifthen-act'); if(t) t.value = p;
      if(typeof _saveIfThenFromModal === 'function') _saveIfThenFromModal('anxious');
    }, phrase),
    also: async (page, phrase) => page.evaluate(p => {
      const stored = JSON.stringify(JSON.parse(localStorage.getItem('totry_if_then') || '[]'));
      return stored.includes(p) ? 'the disclosure was SAVED as an if-then plan and will be read back' : null;
    }, phrase) },
  { name: 'the thing you are avoiding (Feeling Door)',
    go: async page => page.evaluate(async () => { if(typeof _startSmallestThing==='function') _startSmallestThing(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      await new Promise(r => setTimeout(r, 300));
      const i = document.getElementById('fm-thing'); if(i) i.value = p;
      const b = [...document.querySelectorAll('button')].find(x => /Start it small/i.test(x.innerText||''));
      if(b) b.click();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      (document.body.innerText||'').includes(p) ? 'the disclosure is echoed back on screen as an instruction' : null, phrase) },
  // ── FOUR MORE, FOUND 30 SEP 2026, AND ALL FOUR ARE THE SAME HALF-APPLIED SHAPE ───────────────
  // The 5 Sep audit gated onboarding's "what are you fighting" (obPersistVices). The IN-APP version
  // of that same field — addVice(), #v-name and #v-trigger — was never gated, so the identical
  // sentence typed on the Fight tab still becomes a vice card with a clean-day counter. Three more
  // sit beside it: openCantStart() (a DIFFERENT function from the _startSmallestThing door above,
  // which IS gated), _letGoName() → createLetGo(), and the letter to your future self, which is
  // the worst of the four — saveLetterFromWhy() stores the text verbatim and deliverLetter()
  // replays it back with a celebration haptic up to 730 days later.
  { name: 'what can\u2019t you start (Feeling Door)',
    go: async page => page.evaluate(async () => { if(typeof openCantStart==='function') openCantStart(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      await new Promise(r => setTimeout(r, 300));
      const i = document.getElementById('fm-thing'); if(i) i.value = p;
      const b = [...document.querySelectorAll('button')].find(x => /Make it smaller/i.test(x.innerText||''));
      if(b) b.click();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      (document.body.innerText||'').includes(p) ? 'the disclosure is echoed back as the thing to make smaller' : null, phrase) },
  { name: 'the letter to your future self',
    go: async page => page.evaluate(async () => { go('soul'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('why-letter-text'); if(i) i.value = p;
      if(typeof saveLetterFromWhy==='function') saveLetterFromWhy();
    }, phrase),
    // The letter is SEALED and re-delivered later, so storing it is the whole harm: nobody is on
    // screen when it arrives.
    also: async (page, phrase) => page.evaluate(p =>
      ((ls('totry_letters')||[]).some(function(l){ return l && String(l.text||'').includes(p); }))
        ? 'the disclosure was sealed as a letter and will be replayed back to them later' : null, phrase) },
  { name: 'letting go of someone (name it)',
    go: async page => page.evaluate(async () => { if(typeof _letGoName==='function') _letGoName(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      await new Promise(r => setTimeout(r, 300));
      const i = document.getElementById('fm-who'); if(i) i.value = p;
      const b = [...document.querySelectorAll('button')].find(x => /Add it to my Fight/i.test(x.innerText||''));
      if(b) b.click();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      ((ls('totry_v')||[]).some(function(v){ return v && String(v.n||'').includes(p); }))
        ? 'the disclosure was stored as something they are letting go of, on a card in their Fight' : null, phrase) },
  { name: 'what are you fighting (in-app, not onboarding)',
    go: async page => page.evaluate(async () => { go('fight'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const n = document.getElementById('v-name'); if(n) n.value = p;
      const t = document.getElementById('v-trigger'); if(t) t.value = p;
      if(typeof addVice==='function') addVice();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      ((ls('totry_v')||[]).some(function(v){ return v && (String(v.n||'').includes(p) || String(v.t||'').includes(p)); }))
        ? 'the disclosure was stored as a vice with a clean-day counter attached' : null, phrase) },
  // ── AND FOUR MORE FROM THE SAME SWEEP, 30 SEP 2026 ───────────────────────────────────────────
  // A census of every openFormModal call carrying a text/textarea field found fifteen doors, two of
  // them gated. These four all STORE what is typed and REPLAY it later, which is the shape that
  // matters: nobody is on screen when it comes back. editIdentity() is the in-app twin of
  // 'onboarding · the identity sentence' above — gated on 5 Sep, while the field a person actually
  // uses to CHANGE it was left open, and it prefixes "I am becoming a person who " onto whatever it
  // is given. _tkMyLine's own copy promises "I'll keep it and say it back when it turns up."
  { name: 'who you\u2019re becoming (in-app, not onboarding)',
    go: async page => page.evaluate(async () => { if(typeof editIdentity==='function') editIdentity(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      await new Promise(r => setTimeout(r, 300));
      const i = document.getElementById('fm-identity'); if(i) i.value = p;
      const b = [...document.querySelectorAll('.modal-bg.open button')].find(x => /^Save$/i.test((x.innerText||'').trim()));
      if(b) b.click();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      String(ls('totry_identity')||'').includes(p)
        ? 'the disclosure was stored as who they are becoming, behind "I am becoming a person who"' : null, phrase) },
  { name: 'the sentence it uses on you (toolkit)',
    go: async page => page.evaluate(async () => { if(typeof _tkMyLine==='function') _tkMyLine(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      await new Promise(r => setTimeout(r, 300));
      const i = document.getElementById('fm-line'); if(i) i.value = p;
      const b = [...document.querySelectorAll('.modal-bg.open button')].find(x => /Keep it/i.test(x.innerText||''));
      if(b) b.click();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      String(((ls('totry_toolkit')||{}).myLine)||'').includes(p)
        ? 'the disclosure was kept as the line to say back to them at the next urge' : null, phrase) },
  { name: 'how did you get there (walk it back)',
    go: async page => { await page.evaluate(() => localStorage.setItem('totry_v', JSON.stringify(
        [{n:'Scrolling',kind:'scrolling',mode:'quit',startDate:new Date(Date.now()-9*864e5).toISOString(),total:0,urgelog:[],relapseHistory:[]}]))); await page.evaluate(async () => {
      if(typeof loadV==='function') loadV(); if(typeof openWalkBack==='function') openWalkBack(0); }); },
    fire: async (page, phrase) => page.evaluate(async p => {
      await new Promise(r => setTimeout(r, 300));
      const i = document.getElementById('fm-chain'); if(i) i.value = p;
      const b = [...document.querySelectorAll('.modal-bg.open button')].find(x => /Save this/i.test(x.innerText||''));
      if(b) b.click();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      JSON.stringify(ls('totry_v')||[]).includes(p)
        ? 'the disclosure was stored on the vice and is replayed as "last time you traced it"' : null, phrase) },
  { name: 'the honest ledger (what it gives me)',
    go: async page => { await page.evaluate(() => localStorage.setItem('totry_v', JSON.stringify(
        [{n:'Scrolling',kind:'scrolling',mode:'quit',startDate:new Date(Date.now()-9*864e5).toISOString(),total:0,urgelog:[],relapseHistory:[]}]))); await page.evaluate(async () => {
      if(typeof loadV==='function') loadV(); if(typeof openCBA==='function') openCBA(0); }); },
    fire: async (page, phrase) => page.evaluate(async p => {
      await new Promise(r => setTimeout(r, 300));
      const i = document.getElementById('fm-gain'); if(i) i.value = p;
      const b = [...document.querySelectorAll('.modal-bg.open button')].find(x => /Keep this/i.test(x.innerText||''));
      if(b) b.click();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      JSON.stringify(ls('totry_v')||[]).includes(p)
        ? 'the disclosure was stored in their own ledger and shown back to them in it' : null, phrase) },
  // ── AND FIVE MORE, SAME DAY, FROM A SECOND CENSUS ────────────────────────────────────────────
  // The first census only walked openFormModal. A census of the static shell found 94 free-text
  // elements, so the door list had been measuring one SHAPE of door and calling it "every entry
  // point that accepts free text". Two of these five write `totry_why` — the SAME store as
  // 'onboarding · why it matters', gated on 5 Sep — from the two places a person actually edits it.
  { name: 'your why (in-app edit, not onboarding)',
    go: async page => page.evaluate(async () => { go('soul'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('why-edit'); if(i) i.value = p;
      if(typeof saveWhyEdit==='function') saveWhyEdit();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      String(ls('totry_why')||'').includes(p) ? 'the disclosure was stored as their why' : null, phrase) },
  { name: 'your why (mid-feeling)',
    // OPEN THE REAL FLOW. The first version of this door set #feelingnow-why-input directly and
    // reported "NO crisis card" — but the element does not exist until _feelingNowSetWhy() builds
    // it, so nothing was ever typed and the finding was about the DOOR. It came from a census that
    // grepped index.html for <textarea id="…">, which matches tags inside JS STRING LITERALS,
    // because index.html carries the whole app as inline script.
    go: async page => page.evaluate(async () => { go('fight');
      // BOTH calls. _feelingNowSetWhy() writes into #feelingnow-body, which only openFeelingNow()
      // creates — so on its own it returns early, no textarea is built, nothing is typed, and the
      // door reported "NO crisis card" about a gate that was working. Driven separately, the card
      // renders and nothing is stored.
      if(typeof openFeelingNow==='function') openFeelingNow();
      if(typeof _feelingNowSetWhy==='function') _feelingNowSetWhy(); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('feelingnow-why-input'); if(i) i.value = p;
      if(typeof _feelingNowSaveWhy==='function') _feelingNowSaveWhy();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      String(ls('totry_why')||'').includes(p) ? 'the disclosure was stored as their why, from inside a hard moment' : null, phrase) },
  { name: 'a prayer intention',
    go: async page => page.evaluate(async () => { go('soul'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('prayer-text'); if(i) i.value = p;
      if(typeof addPrayer==='function') addPrayer();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      ((ls('totry_prayers')||[]).some(function(x){ return x && String(x.text||'').includes(p); }))
        ? 'the disclosure was stored as something they are praying for' : null, phrase) },
  { name: 'the weekly review (what you are proud of)',
    go: async page => page.evaluate(async () => { go('reflect'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('review-proud'); if(i) i.value = p;
      if(typeof saveWeeklyReview==='function') saveWeeklyReview();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      ((ls('totry_reviews')||[]).some(function(x){ return x && String(x.proud||'').includes(p); }))
        ? 'the disclosure was stored in the weekly review, kept for 52 weeks' : null, phrase) },
  { name: 'your values (why these)',
    // Same correction: #vs-why is built by _vsRender() at phase 2, not by the shell.
    go: async page => page.evaluate(async () => {
      if(typeof openValuesSort==='function') openValuesSort();
      // PHASE 3, not 2. #vs-why lives in the fallthrough after the phase-2 block returns, so phase 2
      // renders the ordering step and builds no textarea at all.
      try{ _vsS = { phase:3, picked:['Honesty'], why:'' }; if(typeof _vsRender==='function') _vsRender(); }catch(e){}
    }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('vs-why'); if(i) i.value = p;
      if(typeof _vsSave==='function') _vsSave();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p =>
      String(((ls('totry_values')||{}).why)||'').includes(p)
        ? 'the disclosure was stored as why those values matter, and read back to them as their own words' : null, phrase) },
  { name: 'food search online (Nourish)',
    go: async page => page.evaluate(async () => { go('nourish'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      if(typeof searchFoodOnline === 'function') await searchFoodOnline(p);
    }, phrase) },

  // ── THREE MORE, 9 Oct 2026, AND EACH WAS INVISIBLE TO A DIFFERENT CENSUS ─────────────────────
  // Found by an adversarial review of the 30 Sep sweep that took this list from 22 doors to 35.
  // That sweep ran two censuses and both of them structurally could not see these:
  //   · openVicePlan's "why this matters to you" — the GATED function opens it. addVice() checks
  //     its own two fields and then, 64 lines later in the same body, auto-opens this sheet on a
  //     220ms timer. The ungated box is the very next thing a new person sees after the gated one.
  //     Replayed in the urge sheet, on the SOS screen, and handed to the model as "their WHY".
  //   · savePostUrge — opens right after somebody WINS an urge, one of the two moments they are
  //     most likely to say the true thing. Stored as the battle's trigger, aggregated into
  //     topTrigger, replayed as "Most common trigger: ...". It was also an injection sink.
  //   · addPromiseFromWhy — in the SAME static card as the gated #why-letter-text, 39 lines apart.
  //     The only difference between the gated door and this one is the TAG: the census grepped for
  //     `<textarea id="...">` and this field is an `<input>`.
  { name: 'why this matters (the vice plan)',
    go: async page => page.evaluate(async () => {
      ls('totry_v', [{ n:'porn', t:'late night', startDate:new Date().toISOString() }]);
      if(typeof loadV === 'function') loadV();
      if(typeof openVicePlan === 'function') openVicePlan(0);
    }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const t = document.querySelector('.vp-why'); if(t) t.value = p;
      const b = document.querySelector('.vp-save'); if(b) b.click();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p => {
      const v = ls('totry_v') || [];
      return (v[0] && v[0].plan && v[0].plan.why === p)
        ? 'the disclosure was stored as their why, to be said back to them when it is hard' : null;
    }, phrase) },
  { name: 'what set it off (after a win)',
    go: async page => page.evaluate(async () => {
      ls('totry_v', [{ n:'porn', t:'late night', startDate:new Date().toISOString() }]);
      ls('totry_fight_log', [{ vice:'porn', won:true, ts:Date.now() }]);
      if(typeof loadV === 'function') loadV();
      if(typeof postUrgeReflection === 'function') postUrgeReflection('porn');
    }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('pur-trigger'); if(i) i.value = p;
      if(typeof savePostUrge === 'function') savePostUrge('porn');
    }, phrase),
    also: async (page, phrase) => page.evaluate(p => {
      const fl = ls('totry_fight_log') || [];
      return fl.some(e => e.trigger === p)
        ? 'the disclosure was stored as the trigger that set off their urge' : null;
    }, phrase) },
  { name: 'a promise to yourself (your why)',
    go: async page => page.evaluate(async () => { if(typeof go === 'function') go('why'); }),
    fire: async (page, phrase) => page.evaluate(async p => {
      const i = document.getElementById('why-new-promise'); if(i) i.value = p;
      if(typeof addPromiseFromWhy === 'function') addPromiseFromWhy();
    }, phrase),
    also: async (page, phrase) => page.evaluate(p => {
      const pr = ls('totry_promises') || [];
      return pr.some(x => x.text === p)
        ? 'the disclosure was stored as a promise with a due date, to be replayed when it comes round' : null;
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
      s('totry_onboarded',true); s('totry_name','Sam'); s('totry_faith_tradition','christianity');
      // totry_v and totry_habits are the keys the APP'S OWN READERS use. A door seeded with a
      // key only the test believes in reports the app broken -- that happened once already,
      // with totry_vices against a loadV() that reads totry_v.
      s('totry_v',[{n:'porn',since:Date.now()-86400000*5,kind:'vice'}]);
      s('totry_habits',[{name:'Read',anchor:'',done:[]}]); });
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
    // A SEPARATE question, deliberately NOT part of the chain above. Some doors can show a perfect
    // helpline and still do harm — by storing the disclosure, or printing it back as counsel. Chaining
    // this as an `else if` (as it first was) skipped the usable-helpline checks for exactly the two
    // doors that most needed them, and they passed on a weaker test than every other door.
    if (door.also) {
      try { const extra = await door.also(page, PHRASE); if (extra) findings.push(`${door.name}: ${extra}`); }
      catch (e) { findings.push(`${door.name}: also-check threw — ${String(e.message).slice(0,80)}`); }
    }
    if (errs.length) findings.push(`${door.name}: page error — ${errs[0]}`);
    await ctx.close();
  }

  // ── AND THE NEGATIVE DIRECTION, WHICH THIS SUITE HAD NEVER ASSERTED ────────────────────────────
  // Every check above asks whether a disclosure REACHES a helpline. Nothing anywhere asked whether an
  // ORDINARY sentence is left alone — and that is exactly how, for months, "my quads are going to
  // hurt" returned harmothers and rendered a card reading "If you're thinking about hurting someone,
  // please step away from the situation right now" with 000, 911 and 999 on it, in an app whose whole
  // job is reporting soreness. 35 green doors and 3,000 assertions never saw it.
  // At the Can't-start door a false positive is not merely noise: a non-null REPLACES the
  // help-me-start flow with no route back, so the person who came for help starting is handed a
  // crisis card instead, every time.
  // The sentences below are the real ones this app's own fronts produce, and every one of them
  // returned a crisis kind at some point on 1 Oct 2026 before being fixed. They rotate across the
  // doors so the whole set is exercised through real UI rather than only at the function.
  // CALIBRATION IS STRUCTURAL: the pass above has already shown a card at every one of these doors
  // with the disclosure phrase, so a door that shows none here cannot be a door that shows none ever.
  const ORDINARY = [
    'my quads are going to hurt',                       // training — returned harmothers
    'nothing left in the tank',                         // training — returned suicide
    'take my life and let it be',                       // a hymn, in an app with a prayer surface
    'i want to die to my old self',                     // the Soul tab teaches this idiom
    'i took all my pills this morning',                 // a pill organiser — returned medical
    "i'm tired of living paycheck to paycheck",          // money — returned suicide
    'better off deadlifting twice a week',              // training — returned suicide
    "i can't keep going with this split",                // training — returned suicide
    'i want it to stop raining',                        // returned suicide
    "i don't want to be a burden on my kids when i'm older",  // the commonest why in fitness
    'i want to stop existing on my phone at night',     // the app's own dopamine-detox thesis
    "i'm on a deficit and i want to end it",             // returned suicide
    'i had to give up on life drawing',                 // returned suicide
    'better off without medication',                    // a word-prefix collision
    "i'd blow my brains out, this meeting is endless",   // the hyperbolic frame
    'i read about carbon monoxide poisoning after the news story',
    'i know where dad keeps his rifle, we are going shooting saturday',
    'cast your burden on the lord and he will sustain you',   // scripture
    // ── THE SHAPE THIS PANEL COULD NOT FAIL ON ───────────────────────────────────
    // Every sentence above is a PREPOSITIONAL or WORD-PREFIX completion — "nothing left in the
    // tank", "i can't keep going with this split", "i want it to stop raining" — which is exactly
    // the shape the clause bound already cleared. The panel was built from the completions the bound
    // was written against, so 31 green doors in the negative direction said nothing at all about a
    // COMMA. Twelve patterns read a comma as a sentence end for six days behind this panel.
    // These are comma-continued, from named fronts, and they are the shape that shipped.
    'i gave it everything, nothing left, best session in weeks',       // Train
    'rent went out and there is nothing left, payday is friday',       // Money
    "i'm done, i can't do this anymore, the porn has to go",          // the Fight's own words
    'the doms in my hamstrings, i want it to stop, so sore',           // Train
    "i can't keep going, the debt is crushing, need a plan",           // Money
    "my quads are cramping, make it stop, i'll stretch after",         // Train
    // And the one the Can't-start door exists for, which used to get six helplines instead.
    "i can't do this anymore, just help me start something small",
  ];
  let quiet = 0;
  for (let i = 0; i < DOORS.length; i++) {
    const door = DOORS[i], ordinary = ORDINARY[i % ORDINARY.length];
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); s('totry_faith_tradition','christianity');
      // totry_v and totry_habits are the keys the APP'S OWN READERS use. A door seeded with a
      // key only the test believes in reports the app broken -- that happened once already,
      // with totry_vices against a loadV() that reads totry_v.
      s('totry_v',[{n:'porn',since:Date.now()-86400000*5,kind:'vice'}]);
      s('totry_habits',[{name:'Read',anchor:'',done:[]}]); });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2900);
    await page.evaluate(() => document.querySelectorAll('.companion-overlay,.companion-backdrop').forEach(e=>e.classList.remove('open')));
    // DID THE SENTENCE EVEN REACH THE DETECTOR? Nothing here asked, so a door that silently failed
    // to deliver — a changed id, a renamed handler, a `go` that lands on the wrong screen — counted
    // as "left an ordinary sentence alone". A quiet door and a broken door look identical from the
    // outside, and this whole pass exists because an absence can pass for a pass.
    // detectCrisis is a top-level function declaration, so the binding IS a property of the global
    // object and reassigning it reaches the app's own internal callers.
    await page.evaluate(() => {
      window.__dcSeen = [];
      const orig = window.detectCrisis;
      if(typeof orig !== 'function') return;
      window.detectCrisis = function(t){ window.__dcSeen.push(String(t == null ? '' : t)); return orig.apply(this, arguments); };
    });
    try {
      await door.go(page);
      await page.waitForTimeout(600);
      await door.fire(page, ordinary);
      await page.waitForTimeout(900);
    } catch (e) { /* a door that will not take this input proves nothing either way */ }
    const n = await page.evaluate(PROBE);
    // SUBSTRING, NOT EQUALITY, AND THE REASON IS ON THE RECORD: two doors legitimately transform
    // what they deliver — the identity path prefixes "I am becoming a person who ", and the morning
    // check-in joins several fields into one string before asking. Measured: 29 of 31 verbatim,
    // 31 of 31 by substring.
    const delivered = await page.evaluate(o =>
      (window.__dcSeen || []).some(x => x.indexOf(o) >= 0), ordinary);
    checks++;
    if (n.card) findings.push(`${door.name}: CRIED WOLF — "${ordinary}" raised a crisis card`);
    else if (!delivered) findings.push(`${door.name}: the ordinary sentence never reached detectCrisis — this door is QUIET because it is BROKEN, not because it is calm`);
    else quiet++;
    await ctx.close();
  }
  console.log(`  ✓ ${quiet} of ${DOORS.length} doors leave an ordinary sentence alone`);

  // And the net itself: with the container gone, the card must still reach the person.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { const s=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
      s('totry_onboarded',true); s('totry_name','Sam'); s('totry_faith_tradition','christianity');
      // totry_v and totry_habits are the keys the APP'S OWN READERS use. A door seeded with a
      // key only the test believes in reports the app broken -- that happened once already,
      // with totry_vices against a loadV() that reads totry_v.
      s('totry_v',[{n:'porn',since:Date.now()-86400000*5,kind:'vice'}]);
      s('totry_habits',[{name:'Read',anchor:'',done:[]}]); });
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
      s('totry_onboarded',true); s('totry_name','Sam'); s('totry_faith_tradition','christianity');
      // totry_v and totry_habits are the keys the APP'S OWN READERS use. A door seeded with a
      // key only the test believes in reports the app broken -- that happened once already,
      // with totry_vices against a loadV() that reads totry_v.
      s('totry_v',[{n:'porn',since:Date.now()-86400000*5,kind:'vice'}]);
      s('totry_habits',[{name:'Read',anchor:'',done:[]}]); });
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

  // ── a sign-in that never answers ──────────────────────────────────────────────────────────────
  // Not a free-text door either, and the one state this app promises can never hide the helplines was
  // the one nobody had put a floor under. supabase-js has no timeout: on one bar of signal the OTP
  // request simply does not settle, so the catch never runs, authShowError is never reached, and the
  // person sits on #auth-loading — a pulsing line with NO button on it. The email step underneath
  // carries the guest door and four numbers, and the error step carries them too under a comment
  // saying they must survive a failure. Neither is reachable while it hangs, and force-quitting comes
  // back to the same screen. First contact, worst connection, no way out.
  //
  // The hang is applied at the NETWORK layer, not by stubbing `sb` — `sb` is a module-scope `let`, so
  // assigning window.sb is a different binding entirely and the first version of this check silently
  // drove the real client. Aborting instead of hanging would only re-test the error path, which
  // always worked.
  {
    const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
    const page = await ctx.newPage();
    await ctx.route('**', (route) => {
      if (route.request().url().startsWith(`http://127.0.0.1:${PORT}`)) return route.continue();
      /* held open for ever: neither continue nor abort */
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(2500);
    const reachable = () => page.evaluate(() => {
      const tels = [...document.querySelectorAll('a[href^="tel:"]')].filter(a => {
        const b = a.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && b.top < innerHeight && b.bottom > 0;
      });
      const guest = [...document.querySelectorAll('button,a')].some(e =>
        /pulling at me|without an account/i.test(e.textContent || '') && e.offsetParent !== null);
      return { tels: tels.length, number: tels[0] ? tels[0].textContent.trim() : null, guest };
    });
    await page.evaluate(() => {
      const c = document.getElementById('auth-container'); if (c) c.style.display = 'flex';
      const i = document.getElementById('auth-email-input'); if (i) i.value = 'stall-test@example.invalid';
      if (typeof authSendOtp === 'function') authSendOtp();
    });
    await page.waitForTimeout(2000);
    const during = await reachable();       // calibration: it really is stranded while it hangs
    await page.waitForTimeout(15000);       // the floor is 15s
    const after = await reachable();
    checks++;
    if (during.tels > 0) findings.push('the stalled sign-in: calibration failed — a helpline was already reachable mid-stall, so this check proves nothing');
    else if (!after.tels) findings.push('a stalled sign-in strands the person with no reachable helpline');
    else if (!after.guest) findings.push('a stalled sign-in reaches a helpline but not the guest door');
    else console.log(`  \u2713 ${'stalled sign-in (no answer)'.padEnd(34)} ${after.number} + guest door`);
    await ctx.close();
  }

  // ── EVERY ROUTE THE SENTENCE NEEDS IS ON THE CARD ───────────────────────────────────────────
  // detectCrisis returns a '+'-joined SET now, because the precedence chain could only name one
  // need and the one it dropped was the ambulance: "i took all my pills. nothing matters anymore."
  // returned 'suicide', a card of seven helplines with no 000, no 911, no 999 and no "get to a
  // hospital" on it. The kinds themselves are asserted in core.test.js; this is the half only a
  // browser can answer — what the CARD actually renders for each set.
  // It asserts BOTH directions. A missing 000 on the overdose card is the defect that prompted it;
  // a 000 on the plain suicide card is the takeover this file keeps having to undo, and an
  // emergency number shown to somebody who typed "i can't cope anymore" is that takeover.
  let cardChecks = 0;
  {
    const KINDS = [
      ['suicide',            { needs:['131114','988','116123'], forbid:['000','911','999'], hospital:false }],
      ['selfharm',           { needs:['131114'],                forbid:['000','911','999'] }],
      ['harmothers',         { needs:['131114','000'],          stepaway:true }],
      ['medical',            { needs:['000','911','999','1800022222','111'], hospital:true }],
      ['medical+suicide',    { needs:['000','911','999','131114','988','116123'], hospital:true, notalone:true }],
      ['suicide+harmothers', { needs:['131114','000','911','999'], stepaway:true }],
    ];
    for (const [kind, want] of KINDS) {
      const ctx = await browser.newContext({ viewport:{ width:414, height:896 } });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded' });
      await page.waitForFunction(() => typeof journalMeetCrisis === 'function', { timeout:20000 });
      const got = await page.evaluate(k => {
        journalMeetCrisis(k);
        // SCOPE TO THE CARD. Asking document.body reported the medical copy present on the plain
        // suicide card, because "emergency services" appears elsewhere in the shell.
        const card = document.querySelector('[role="alert"][aria-label^="Urgent"]');
        if (!card) return { missing:true };
        const tel = [...card.querySelectorAll('a[href^="tel:"]')].filter(a => {
          const r = a.getBoundingClientRect(), st = getComputedStyle(a);
          return r.width >= 24 && r.height >= 20 && st.visibility !== 'hidden'
            && st.display !== 'none' && st.pointerEvents !== 'none' && a.offsetParent !== null;
        }).map(a => a.getAttribute('href').replace('tel:', ''));
        const txt = card.textContent;
        return { tel, dup: tel.length !== new Set(tel).size,
                 rows: card.querySelectorAll('.crisis-row').length,
                 hospital: /hospital|emergency services/i.test(txt),
                 stepaway: /step away/i.test(txt),
                 notalone: /do not have to carry it on your own/i.test(txt) };
      }, kind);
      cardChecks++;
      const bad = [];
      if (got.missing) bad.push('no card element at all — THE MEASUREMENT IS WRONG, NOT THE APP');
      else {
        if (!got.tel.length) bad.push('the card carries no dialable number at all');
        (want.needs  || []).forEach(n => { if (!got.tel.includes(n)) bad.push('missing ' + n); });
        (want.forbid || []).forEach(n => { if (got.tel.includes(n))  bad.push('carries ' + n + ' — that is the takeover, not help'); });
        ['hospital','stepaway','notalone'].forEach(f => {
          if (want[f] !== undefined && got[f] !== want[f]) bad.push(f + '=' + got[f] + ' wanted ' + want[f]); });
        if (got.dup) bad.push('a number is repeated on the card');
      }
      if (bad.length) findings.push(`the card for "${kind}": ` + bad.join('; '));
      else console.log(`  ✓ card ${kind.padEnd(29)} ${got.rows} rows · ${got.tel.join(' · ')}`);
      await ctx.close();
    }
  }

  await browser.close(); server.close();
  console.log('');
  if (findings.length) { findings.forEach(f => console.log('  ✗ ' + f)); console.log(`\n✗ ${findings.length} finding(s)\n`); process.exit(1); }
  console.log(`✓ a real helpline is visible and dialable at all ${checks - DOORS.length} crisis doors\n`);
  console.log(`  and the card renders every route in the kind set at ${cardChecks} kinds \u2014 an overdose beside a hopelessness clause used to return seven helplines and no ambulance`);
  console.log(`  and ${DOORS.length} ordinary sentences from the app's own fronts were left alone — the direction this suite never asserted until 1 Oct 2026, which is how a police-and-ambulance card for DOMS survived every check in the gate`);
})();
