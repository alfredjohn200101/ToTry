// ════ TRAINING SETUP — so the coach ALWAYS knows what you're about to do ════
// Meet people where they are: if they use Hevy/Strava or have their own plan, we don't force ours —
// we just link it so the coach has context. If they have genuinely nothing, we become their training
// brain (like Hevy Pro) and generate a real weekly plan from day one, so getUserSplit() resolves for
// EVERYONE and "what do I train today?" always has an answer. Deterministic — no AI needed to plan.
function generateSplit(days, goal){
  days = Math.max(2, Math.min(6, parseInt(days)||3));
  const D={
    'Push':'Chest, shoulders, triceps — bench, overhead press, dips, lateral raises.',
    'Pull':'Back, biceps — rows, pulldowns, face pulls, curls.',
    'Legs':'Squat or leg press, RDL, lunges, calves, core.',
    'Upper':'Chest, back, shoulders, arms in one — push and pull.',
    'Lower':'Squat/hinge, quads, hamstrings, calves, core.',
    'Full Body':'One big lift each: squat, press, row — plus core.',
    'Full Body A':'Squat, bench, row + core. Progressive overload.',
    'Full Body B':'Hinge, overhead press, pulldown + core.',
    'Cardio + Core':'25–30 min zone-2 (walk/bike) + a core circuit.'
  };
  const build={2:['Full Body A','Full Body B'],3:['Push','Pull','Legs'],4:['Upper','Lower','Push','Pull'],5:['Push','Pull','Legs','Upper','Lower'],6:['Push','Pull','Legs','Push','Pull','Legs']};
  const lean={2:['Full Body A','Full Body B'],3:['Full Body A','Full Body B','Cardio + Core'],4:['Upper','Lower','Full Body','Cardio + Core'],5:['Push','Pull','Legs','Full Body','Cardio + Core'],6:['Push','Pull','Legs','Upper','Lower','Cardio + Core']};
  const strength={2:['Upper','Lower'],3:['Push','Pull','Legs'],4:['Upper','Lower','Upper','Lower'],5:['Upper','Lower','Push','Pull','Legs'],6:['Push','Pull','Legs','Upper','Lower','Full Body']};
  const bank = goal==='lose'?lean : goal==='strength'?strength : build;
  const seq = bank[days] || build[3];
  const pattern = {2:[1,0,0,1,0,0,0],3:[1,0,1,0,1,0,0],4:[1,1,0,1,1,0,0],5:[1,1,0,1,1,1,0],6:[1,1,1,0,1,1,1]}[days] || pattern3();
  function pattern3(){ return [1,0,1,0,1,0,0]; }
  let si=0;
  return pattern.map(on=>{ if(!on) return {focus:'Rest', detail:'Recovery — walk, stretch, sleep. Growth happens now.'}; const f=seq[si%seq.length]; si++; return {focus:f, detail:D[f]||'Train with intent — progressive overload.'}; });
}
function _applyGeneratedPlan(days, goal){
  try{
    const split=generateSplit(days, goal);
    ls('totry_split', split); ls('totry_train_goal', goal); ls('totry_train_days', days); ls('totry_train_source','totry');
    ['renderSplitDayCards','loadTodaySplitCard','renderUnifiedTraining','renderSplitOverview'].forEach(fn=>{ try{ if(typeof window[fn]==='function') window[fn](); }catch(_){} });
    const ti=(typeof tIdx==='function')?tIdx():0; const f=(split[ti]||{}).focus||'your first session';
    if(typeof logEvent==='function') logEvent('plan_generated',{days,goal});
    if(typeof showToast==='function') showToast('Your plan is ready', 'Today: '+f+'. The coach knows your whole week now.');
    if(typeof haptic==='function') haptic('tap');
  }catch(e){ if(typeof showToast==='function') showToast('Hmm', 'Could not build the plan just now.'); }
}
function setupTraining(){
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center">'+
    '<div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);margin-bottom:4px">Set up your training</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:16px">So the coach knows what you’re doing — and tells you today’s session.</div>'+
    '<div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Days a week</div>'+
    '<div class="ts-days" style="display:flex;gap:6px;justify-content:center;margin-bottom:16px"></div>'+
    '<div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Main goal</div>'+
    '<div class="ts-goals" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:18px"></div>'+
    '<button class="btn primary ts-build" style="margin-bottom:8px">Build my plan</button>'+
    '<button class="btn ts-else" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);margin-bottom:8px;font-size:13px">I already train elsewhere (Hevy / my own)</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  const st={days:3, goal:'build'};
  const daysWrap=m.querySelector('.ts-days'), goalsWrap=m.querySelector('.ts-goals');
  const chip=(txt,active)=>{ const b=document.createElement('button'); b.textContent=txt; b.style.cssText='padding:8px 13px;border-radius:18px;border:1px solid '+(active?'var(--go)':'var(--bd)')+';background:'+(active?'rgba(200,169,110,0.14)':'var(--bg3)')+';color:var(--tx);font-size:13px;cursor:pointer'; return b; };
  function renderChips(){
    daysWrap.innerHTML=''; [2,3,4,5,6].forEach(d=>{ const b=chip(d, st.days===d); b.onclick=()=>{st.days=d;renderChips();}; daysWrap.appendChild(b); });
    goalsWrap.innerHTML=''; [['build','Build muscle'],['lose','Lose fat'],['strength','Get stronger'],['general','General']].forEach(g=>{ const b=chip(g[1], st.goal===g[0]); b.onclick=()=>{st.goal=g[0];renderChips();}; goalsWrap.appendChild(b); });
  }
  renderChips();
  m.querySelector('.ts-build').onclick=()=>{ m.remove(); _applyGeneratedPlan(st.days, st.goal); };
  m.querySelector('.ts-else').onclick=()=>{ m.remove(); if(typeof showAddAppPicker==='function') showAddAppPicker(); else if(typeof showToast==='function') showToast('Link your app','Connect Hevy or Strava in Settings → Connected apps.'); };
  if(typeof haptic==='function') haptic('tap');
}

// The self-efficacy proof (JITAI's proximal effect, made personal): of the recent breath sessions
// where the person rated before AND after, how many brought the wave DOWN? Their own evidence it works.
function _breathProof(){
  try{
    const log=(ls('totry_breath_log')||[]).filter(e=>e && e.before!=null && e.after!=null);
    if(log.length<3) return null;
    const recent=log.slice(0,12);
    const helped=recent.filter(e=>e.after < e.before).length;
    return { m:recent.length, n:helped };
  }catch(_){ return null; }
}
// PROACTIVE hard-hour moment (Phase 2 JITAI): at the person's LEARNED risk window, the breath comes to
// THEM — before the wave, not after. Leads with the pre-emptive minute; the deeper support is one tap away.
function _hardHourBreath(viceName){
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center">'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);margin-bottom:8px">Get ahead of it</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:18px">'+(viceName?('This is usually when '+String(viceName).replace(/</g,'&lt;')+' pulls. '):'')+'Nothing has to be happening yet — that’s the point. One slow minute now makes the next hour easier.</div>'+
    '<button class="btn primary" onclick="closeModal(this);openBreath(\'settle\',{reason:\'hard hour\'})" style="margin-bottom:8px">Breathe through it — 1 min</button>'+
    '<button class="btn" onclick="closeModal(this);_feelThePull()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);margin-bottom:8px;font-size:13px">Talk it through instead</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">I’m okay</button>'+
  '</div>';
  document.body.appendChild(m); if(typeof haptic==='function') haptic('tap');
}

function openCompanionForUrge(){
  const ov = document.getElementById('companion-overlay');
  if(!ov) return;
  ls('totry_companion_last', String(Date.now()));
  ov.classList.add('open'); document.getElementById('companion-backdrop')?.classList.add('open');
  // PRESENCE FIRST — the most important 3 seconds in the app must not be a "name it" menu while he's
  // white-knuckling. If he's fighting ONE known vice, skip straight to the voice with the right
  // mechanism (he can still say more inside the conversation). Several fights → one-tap which-one
  // (needed for the right spine + streak); none yet → the gentle picker.
  try{
    if(typeof loadV==='function') loadV();
    const vs = (typeof vices!=='undefined' && Array.isArray(vices)) ? vices.filter(v=>v&&v.n) : ((ls('totry_v')||[]).filter(v=>v&&v.n));
    if(vs.length === 1){
      const v = vs[0];
      _beginCompanion(v.n, v.type || (typeof classifyVice==='function' ? classifyVice(v.n) : 'general'));
      return;
    }
  }catch(_){}
  companionStruggling();
}

function companionStruggling(){
  if(typeof haptic==='function') haptic('light');
  _compPhase('comp-name');
  // Offer their known vices as quick chips.
  if(typeof loadV==='function') loadV();
  const wrap = document.getElementById('comp-known-vices');
  if(wrap){
    const vs = (typeof vices!=='undefined' && Array.isArray(vices)) ? vices : (ls('totry_v')||[]);
    const named = vs.filter(v=>v&&v.n);
    wrap.innerHTML = named.map(v =>
      '<button class="comp-vice-chip" onclick="companionPickVice('+JSON.stringify(String(v.n)).replace(/"/g,'&quot;')+')">'+String(v.n).replace(/</g,'&lt;')+'</button>'
    ).join('');
    // Copy must be honest to what's on screen: no "Tap one" when there's nothing to tap yet.
    const sub = document.querySelector('#comp-name .comp-sub');
    const ft = document.getElementById('comp-freetext');
    if(named.length){
      if(sub) sub.textContent = "Tap one, or tell me in your own words. Whatever it is, I'm not here to judge it.";
      if(ft) ft.placeholder = 'or say it in your own words...';
    } else {
      if(sub) sub.textContent = "Tell me what's on you, in your own words. Whatever it is, I'm not here to judge it.";
      if(ft) ft.placeholder = 'say it in your own words...';
    }
  }
  setTimeout(()=>{ const f=document.getElementById('comp-freetext'); if(f) f.focus(); }, 350);
}

function companionPickVice(name){
  if(typeof loadV==='function') loadV();
  const vs = (typeof vices!=='undefined' && Array.isArray(vices)) ? vices : (ls('totry_v')||[]);
  const v = vs.find(x=>x&&x.n===name);
  const type = (v && v.type) ? v.type : (typeof classifyVice==='function' ? classifyVice(name) : 'general');
  _beginCompanion(name, type);
}

function companionFreeText(){
  const f = document.getElementById('comp-freetext');
  const txt = f ? f.value.trim() : '';
  if(!txt){ if(f) f.focus(); return; }
  if(f) f.value = '';   // clear it — so what you typed never haunts the NEXT time you open this
  // SAFETY GATE — these are the companion's FIRST words: the single likeliest place in the whole app
  // for a crisis disclosure (this is the 11pm door, and the field is auto-focused). It must never
  // reach the LLM, and must never fire _researchProtocol (which would send the person's verbatim
  // words out with web_search enabled and cache them). companionReply() already gates every LATER
  // message; without this, the first one — the most important one — was the only ungated message.
  try{
    if(typeof detectCrisis==='function'){
      const crisis = detectCrisis(txt);
      if(crisis){
        _compStruggle = { name:'this moment', type:'general', mechanism:'ground', spine:'', label:'Here with you' };
        _compHistory = [];
        _compLocalStep = 0;
        try{ if(typeof _compPhase==='function') _compPhase('comp-meet'); }catch(_){}
        const conv = document.getElementById('comp-conversation');
        if(conv){
          conv.innerHTML = '';
          const m=document.createElement('div'); m.className='comp-msg comp-msg-me'; m.textContent=txt; conv.appendChild(m);
        }
        if(typeof showCrisisResponse==='function') showCrisisResponse('comp-conversation', crisis);
        // REDACTED IN HISTORY. The gate above stops this message reaching the LLM, but storing the
        // verbatim words meant the very next thing the person typed carried the disclosure straight to
        // whichever provider answered — the gate held for exactly one turn. They still see their own
        // words on screen (appended above); only what LEAVES the device is replaced.
        _compHistory.push({ role:'user', content:'[the person disclosed something serious; crisis resources were shown instead of an AI reply]' });
        _compHistory.push({ role:'assistant', content:'[Crisis resources shown]' });
        return;
      }
    }
  }catch(_){}
  const type = (typeof classifyVice==='function') ? classifyVice(txt) : 'general';
  _beginCompanion(txt, type, txt);   // 3rd arg: your actual words, so they open the conversation
}

// Begin the companion conversation for a named struggle.
async function _beginCompanion(name, type, userMessage){
  if(typeof haptic==='function') haptic('light');
  // classifyVice doesn't know overthinking/anxiety/panic — catch those here so the right built-in
  // mechanism (defuse / ground) applies immediately instead of falling to 'general'.
  const lc = (name||'').toLowerCase();
  if(type === 'general'){
    if(/overthink|rumina|spiral|can't stop think|cant stop think|in my head|racing thought|worry|worrying/.test(lc)) type = 'overthinking';
    else if(/anxi|panic|overwhelm|can't breathe|cant breathe|heart racing/.test(lc)) type = 'anxiety';
  }
  const mechKey = _mechanismForType(type);
  let mech = COMPANION_MECHANISMS[mechKey];
  let spine = mech ? mech.spine : COMPANION_MECHANISMS.ground.spine;
  let mechLabel = mech ? mech.label : 'Here with you';

  // If this is a struggle we weren't ready for (type 'general' and not an obvious
  // wave/defuse/interrupt match), check our researched-protocol cache; if missing,
  // research it live (faith + science) and cache it for everyone.
  if(type === 'general'){
    const cached = _getCompanionProtocols();
    const key = name.toLowerCase().trim().slice(0,40);
    if(cached[key] && cached[key].spine){
      spine = cached[key].spine; mechLabel = cached[key].label || mechLabel;
    } else {
      // Kick off live research in the background; the first AI reply will use it.
      _researchProtocol(name, key); // fire and forget, result cached for next time
    }
  }

  _compStruggle = { name, type, mechanism: mechKey, spine, label: mechLabel };
  _compHistory = [];
  _compPhase('comp-meet');
  const titleEl = document.getElementById('comp-meet-title');
  const mechEl = document.getElementById('comp-meet-mech');
  if(titleEl) titleEl.textContent = "I'm with you";
  if(mechEl) mechEl.textContent = mechLabel;
  const conv = document.getElementById('comp-conversation');
  if(conv) conv.innerHTML = '';
  _compLocalStep = 0;
  if(userMessage){
    // They said it in their own words. Show what they said as THEIR message, and have the Brother
    // answer THAT — not a canned greeting. _companionSay(text, false) renders their bubble, sends
    // their words, and generates a real reply to them.
    await _companionSay(userMessage, false);
  } else {
    // Vice chip / direct entry (no words to answer): INSTANT PRESENCE — the sibling speaks the moment
    // the sheet opens (local, zero network), then the AI deepens it. The 3 seconds must not be a spinner.
    const instant = COMPANION_INSTANT_OPEN[mechKey] || COMPANION_INSTANT_OPEN.ground;
    _compHistory.push({ role:'assistant', content: instant });
    if(conv){ const m=document.createElement('div'); m.className='comp-msg comp-msg-them'; m.textContent=instant; conv.appendChild(m); conv.scrollTop=conv.scrollHeight; }
    await _companionSay(null, 'deepen');
  }
}

// Research a faith+science protocol for an unexpected struggle, cache to shared knowledge.
async function _researchProtocol(name, key){
  try{
    // Was hardcoded "AND Christian faith", which sent a Muslim, Hindu, Buddhist or secular person a
    // Christian anchor as the centre of their in-the-moment protocol. faithVoiceNote() already carries
    // the person's tradition (and says "no religious framing" for secular).
    const _fv = (typeof faithVoiceNote==='function') ? faithVoiceNote() : '';
    const sys = "You are a clinical researcher with deep knowledge of evidence-based behavior-change protocols. " + _fv + " Given a struggle, return the single best evidence-based mechanism for helping someone through an acute moment of it, in 2-3 sentences, naming the approach (e.g. urge surfing, cognitive defusion, behavioral interruption, grounding) and how it's applied in the moment. Be specific and practical. Then in one more sentence, note how faith can anchor it. Return ONLY the guidance text, no preamble.";
    const txt = await api(sys, [], 'The struggle: "'+name+'". What is the best evidence-based in-the-moment approach?', 350, { web_search:true, timeout:38000 });
    if(txt && txt.length > 40){
      const store = _getCompanionProtocols();
      store[key] = { spine: txt.trim(), label: 'Here with you', at: Date.now() };
      try{ localStorage.setItem('totry_companion_protocols', JSON.stringify(store)); }catch(_){}
      // DELIBERATELY NOT SHARED. This used to call contributeToSharedLibrary('exercise', '__protocol__'
      // + key) — and `key` is the person's own words for what they are fighting, lowercased and
      // truncated. That put "porn at 2am" or "drinking when dad calls" into `shared_library`, a table
      // any signed-in user can read, filed as an EXERCISE. Three things wrong at once: it published
      // someone's most private sentence, it polluted the exercise library, and it made the App Store
      // answer "nothing a user writes is visible to any other user" untrue. The protocol is cached
      // locally above, which is the part that actually helps this person. Sharing it would need real
      // consent and moderation, and neither exists.
    }
  }catch(_){ /* research is best-effort; the base mechanism still carries the moment */ }
}


// The morning half. One screen, no timer, nothing to log — the act is going outside.
// The morning half of the sleep lever. The EVENING half already existed (openWindDown — faith-aware,
// wired from the evening ritual, with a per-tradition closing line); this did not. Daylight in the eyes
// early sets tonight's sleep more than anything done at bedtime. One screen, no timer, nothing logged
// but the fact it was done — so the card can stop asking once they have been out.
function _sleepDayKey(){ try{ return new Date().toLocaleDateString('en-AU'); }catch(_){ return 'x'; } }
// Has this person already been out today? _morningLightGo() has always WRITTEN totry_morning_light_last,
// and nothing ever read it — so the card asked "Get light in your eyes" every time they opened the
// Morning tab, including straight after they had done it and told the app so. A test asserted this
// function existed "so the card can stop asking"; nothing made the card stop.
function morningLightDoneToday(){ try{ return ls('totry_morning_light_last') === _sleepDayKey(); }catch(_){ return false; } }
// Acknowledged rather than hidden: a thing you did is worth seeing you did.
function renderMorningLightCard(){
  try{
    const card = document.getElementById('morning-light-card');
    if(!card) return;
    const done = morningLightDoneToday();
    const title = card.querySelector('div[style*="font-size:14px"]');
    const sub = card.querySelector('div[style*="font-size:11.5px"]');
    const chev = card.lastElementChild;
    if(done){
      if(title) title.textContent = 'Light in your eyes \u2713';
      if(sub) sub.textContent = 'Done today. Tonight\u2019s sleep is already better for it.';
      if(chev) chev.style.opacity = '0.35';
      card.style.opacity = '0.72';
    } else {
      if(title) title.textContent = 'Get light in your eyes';
      if(sub) sub.textContent = 'Outside, no sunglasses, a few minutes. It sets tonight\u2019s sleep more than anything you do at bedtime.';
      if(chev) chev.style.opacity = '';
      card.style.opacity = '';
    }
  }catch(_){ }
}
function openMorningLight(){
  const m=document.createElement('div'); m.className='modal-bg open';
  m.innerHTML='<div class="modal" style="text-align:center"><div class="modal-handle"></div>'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.15em;text-transform:uppercase;margin-bottom:10px">Morning light</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:23px;font-style:italic;color:var(--tx);line-height:1.35;margin-bottom:10px">Outside, before the screen.</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:8px">A few minutes of real daylight in your eyes — no sunglasses, and a window does not count for much. Even grey and overcast is many times brighter than any room you own.</div>'+
    '<div style="font-size:12px;color:var(--tx3);line-height:1.65;margin-bottom:18px">It sets tonight’s sleep far more than anything you do at bedtime. Do it while the kettle boils.</div>'+
    '<button class="btn primary" onclick="_morningLightGo()" style="padding:14px">I’m going out</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:none;border:none;color:var(--tx3);font-size:12px;margin-top:8px">Later</button>'+
  '</div>';
  document.body.appendChild(m);
  m.addEventListener('click', function(e){ if(e.target===m) m.remove(); });
  if(typeof haptic==='function') haptic('tap');
}
function _morningLightGo(){
  try{ ls('totry_morning_light_last', _sleepDayKey()); }catch(_){}
  try{ renderMorningLightCard(); }catch(_){}
  if(typeof logEvent==='function') logEvent('morning_light');
  document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());
  // Same principle as the wind-down: the app gets out of the way rather than keeping them here.
  if(typeof theRelease==='function') theRelease({ did:'You went out for the light.' });
}



// ── THE NEXT SMALL REAL THING ───────────────────────────────────────────────────────────────────
// The one gap the research kept naming, from two independent angles at once: an exit must never end on
// "go live your life". Behavioural activation is about as effective as antidepressants for low mood and
// its whole claim is that ACTION PRECEDES MOTIVATION — so the moment someone puts the phone down is
// exactly when they need one concrete thing, not encouragement.
//
// Two rules make this different from a generic suggestion list:
//   1. MATCHED TO THE ACTUAL PERSON. It reads getLifeState() and picks the pillar that is genuinely
//      thinnest right now — a short night gets a sleep act, a quiet week gets a movement act, a lapsed
//      person gets a person. A random tip would be noise; this is the integration the app exists for.
//   2. PHONE-OFF, AND SMALL ENOUGH TO BE EMBARRASSING. "One glass of water" beats "hydrate properly".
//      If it needs planning, it is the wrong size.
//
// Phrased as an if-then ("when I put this down, I'll…"), because implementation intentions roughly double
// follow-through versus an intention alone (Gollwitzer, d≈0.65) — and it costs one sentence.
//
// It suggests, it does not track. Nothing here is logged, scored or checked up on later: a chore list
// with a memory is the nagging this app refuses to do.
const NEXT_SMALL = {
  sleep:    ['put your phone on the other side of the room, now, while you are thinking of it',
             'turn off every light but one',
             'fill a glass of water and put it by the bed'],
  movement: ['step outside and walk to the end of the street and back',
             'do ten slow press-ups against the kitchen bench',
             'stand up and stretch until something clicks'],
  people:   ['send one message to the person you thought of first',
             'ask someone how the thing they were dreading went'],
  order:    ['clear one surface — just one',
             'put away the thing that has been sitting out for days',
             'wash the three things in the sink'],
  body:     ['drink one full glass of water',
             'eat something with actual protein in it',
             'sit down and eat without a screen'],
  soul:     ['sit still for two minutes with nothing on',
             'write one line about today, then close the book',
             'step outside and look up for a minute'],
};
// Which pillar is actually thinnest right now. Ordered by urgency, not by preference — the first honest
// match wins, and there is always a fallback so the exit can never be blank.
function nextSmallThing(){
  let L=null; try{ L=(typeof getLifeState==='function')?getLifeState():null; }catch(_){}
  const pick = k => { const a=NEXT_SMALL[k]; const d=(typeof getDayCount==='function')?getDayCount():0;
                      return { kind:k, act:a[d % a.length] }; };
  try{
    const hr = new Date().getHours();
    // Late and short on sleep — the most time-sensitive thing there is.
    if(L && L.sleep && (L.sleep.short || (L.sleep.lastNight && L.sleep.lastNight < 6)) && (hr >= 20 || hr < 4)) return pick('sleep');
    if(hr >= 22 || hr < 4) return pick('sleep');
    // Gone quiet — movement is the cheapest re-entry, and a quiet week is the strongest signal here.
    if(L && L.activity && L.activity.daysQuiet >= 3) return pick('movement');
    // Fought something today and won — the best thing to walk back into is a person.
    if(L && L.fight && (L.fight.momentsWon7 > 0 || L.fight.wins7 > 0)) return pick('people');
    if(L && L.nutrition && L.nutrition.daysLogged7 === 0) return pick('body');
    if(L && L.training && L.training.sessions7 === 0) return pick('movement');
    if(L && L.soul && L.soul.reflections7 === 0) return pick('soul');
  }catch(_){}
  return pick('order');   // never blank: everyone has one surface
}
// Rendered into an exit. Deliberately quiet — this sits UNDER the reason they came, and the button that
// puts the phone down still wins the page.
function nextSmallThingHTML(){
  try{
    const n = nextSmallThing(); if(!n) return '';
    return '<div style="margin:2px auto 22px;max-width:330px;padding:13px 15px;background:rgba(255,255,255,0.03);border:1px solid var(--bd);border-radius:12px">'+
      '<div style="font-family:DM Mono,monospace;font-size:8.5px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">One small real thing</div>'+
      '<div style="font-size:13.5px;color:var(--tx);line-height:1.6">When I put this down, I’ll '+_escFew(n.act)+'.</div>'+
    '</div>';
  }catch(_){ return ''; }
}


// ── WRITE BACK TO APPLE HEALTH ──────────────────────────────────────────────────────────────────
// The app has always DECLARED this: NSHealthUpdateUsageDescription says "To Try can record activity you
// log here back to Apple Health, so your data stays in one place", and the privacy policy promised
// anything written back happens "only at your request". Neither was true — capacitor-health exposes only
// query methods, and nothing else wrote. So the app asked for a permission it could not use and described
// a feature that did not exist. Apple checks that a requested permission is used, and beyond the review
// risk it was a claim the code did not keep.
//
// Narrow on purpose. It writes only what the person explicitly logged:
//   · the workout they just finished
//   · a weigh-in
// It never writes nutrition — the app's calorie numbers are estimates, and an estimate does not belong in
// a health record next to data from a scale. It never writes anything inferred, and never on a timer.
//
// Opt-in, and OFF by default. Nothing is mirrored until the person turns it on in the Track tab, because
// silently pushing their training into a system health record is not a decision an app should make for
// them. The HealthKit sheet appears when they choose it, not at startup — a permission prompt before
// someone has logged anything is a prompt with no story attached, and those get declined.
const HealthWrite = {
  _p(){ try{ const P=(window.Capacitor&&window.Capacitor.Plugins)||{}; return P.HealthWrite || P.HealthWritePlugin || null; }catch(_){ return null; } },
  isNative(){ try{ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }catch(_){ return false; } },
  enabled(){ try{ return ls('totry_health_write') === true; }catch(_){ return false; } },
  async available(){ const p=this._p(); if(!p) return false; try{ const r=await p.isAvailable(); return !!(r&&r.available); }catch(_){ return false; } },
  // Called from Settings. Returns true only if iOS actually granted it — write authorization is one of
  // the few HealthKit answers iOS tells you honestly.
  async connect(){
    const p=this._p(); if(!p) return { ok:false, reason:'This build cannot write to Apple Health.' };
    try{
      if(!(await this.available())) return { ok:false, reason:'Apple Health isn’t available on this device.' };
      const r = await p.requestAuthorization();
      const ok = !!(r && r.granted);
      ls('totry_health_write', ok);
      return ok ? { ok:true } : { ok:false, reason:'Permission wasn’t granted — you can change it in iOS Settings → Health.' };
    }catch(e){ return { ok:false, reason:String(e&&e.message||e) }; }
  },
  // Fire-and-forget from the logging paths. A failed write must never block or interrupt a log: the
  // person's own record is the source of truth and Health is a mirror of it.
  async workout(sess){
    if(!this.enabled() || !this.isNative()) return;
    const p=this._p(); if(!p || !sess) return;
    try{
      const mins = parseFloat(sess.durationMin || sess.durationMinutes || 0) || 0;
      if(mins <= 0) return;                      // nothing honest to write
      await p.saveWorkout({
        type: String(sess.splitFocus || sess.type || 'Strength'),
        startMs: sess.ts ? Date.parse(sess.ts) : Date.now(),
        durationMin: mins,
        calories: parseFloat(sess.calories || 0) || 0
      });
    }catch(_){ /* mirror only — never surface */ }
  },
  async weight(kg, atMs){
    if(!this.enabled() || !this.isNative()) return;
    const p=this._p(); if(!p) return;
    const n = parseFloat(kg) || 0;
    if(n <= 20 || n >= 500) return;              // same sanity floor the plugin enforces
    try{ await p.saveWeight({ kg:n, atMs: atMs || Date.now() }); }catch(_){}
  }
};


