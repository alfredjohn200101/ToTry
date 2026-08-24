// ════ THE FEELING DOOR ════ The whole point: meet the person IN the feeling, then move them through
// it to the ONE thing that helps. Not a tracker. The significant moment.
const FEELINGS = [
  { id:'pull',        emoji:'\uD83C\uDF0A', label:'The pull',        sub:'tempted, craving',        act:()=>{ closeFeelingDoor(); setTimeout(_feelThePull, 260); } },
  { id:'restless',    emoji:'\u26A1',       label:'Restless',        sub:'can\u2019t settle, antsy', act:()=>_feelMove('restless') },
  { id:'flat',        emoji:'\uD83D\uDE36', label:'Flat',            sub:'numb, can\u2019t be bothered', act:()=>_feelMove('flat') },
  { id:'anxious',     emoji:'\uD83C\uDF00', label:'Anxious',         sub:'tense, spinning',         act:()=>_feelMove('anxious') },
  { id:'down',        emoji:'\uD83C\uDF27\uFE0F', label:'Heavy',     sub:'low, sad, defeated',      act:()=>_feelMove('down') },
  { id:'heartache',   emoji:'\uD83D\uDC94', label:'Heartache',       sub:'missing someone, a loss', act:()=>{ closeFeelingDoor(); setTimeout(openLettingGo, 260); } },
  { id:'procrast',    emoji:'\uD83C\uDF6F', label:'Avoiding',        sub:'putting something off',   act:()=>_feelMove('procrast') },
  // Frozen is NOT avoiding, and a person stuck in it doesn't recognise themselves in that word.
  { id:'frozen',      emoji:'\uD83E\uDDCA', label:'Can\u2019t start',     sub:'frozen, staring at it',   act:()=>{ closeFeelingDoor(); setTimeout(openCantStart, 260); } },
  { id:'angry',       emoji:'\uD83D\uDD25', label:'Fired up',        sub:'angry, frustrated',       act:()=>_feelMove('angry') },
  { id:'good',        emoji:'\u2728',       label:'Actually good',   sub:'steady, grateful',        act:()=>_feelMove('good') }
];
// The orb that opens this is a proper button with aria-label="I need help right now", so a keyboard or
// VoiceOver user reaches it fine — and then the door it opened was unusable. It covered the screen and set
// body overflow:hidden, but it was a plain div: no role, no aria-modal, no label, and focus stayed on
// BODY. Measured with the door open, SEVENTEEN background controls came before the first feeling chip in
// tab order — the settings button, the nav, everything behind it. The app's entire entry point, the thing
// it exists to be, could not be operated without sight.
let _feelReturnFocus = null;
function openFeelingDoor(){
  try{
    renderFeelingDoor();
    document.getElementById('feel-backdrop')?.classList.add('open');
    const d = document.getElementById('feel-door'); if(d) d.classList.add('open');
    if(typeof haptic==='function') haptic('light');
    // Remember where they were so closing returns them there rather than to the top of the page.
    try{ _feelReturnFocus = document.activeElement; }catch(_){ _feelReturnFocus = null; }
    // Hide everything behind it from the screen reader, so swiping cannot wander out of the sheet.
    try{ document.querySelectorAll('.tab, .nav, .navbar, #topbar').forEach(function(el){
      if(el && !el.closest('#feel-door')) el.setAttribute('aria-hidden','true'); }); }catch(_){ }
    // Focus the first feeling, not the container, so the next swipe is a choice rather than a heading.
    setTimeout(function(){
      try{
        const first = d && d.querySelector('.feel-chip');
        if(first) first.focus({ preventScroll:true }); else if(d) d.focus({ preventScroll:true });
      }catch(_){ }
    }, 60);
  }catch(_){}
}
// Escape closes it, and Tab cycles WITHIN it — otherwise the first Tab leaves the sheet and the person is
// silently operating the page underneath a full-screen overlay.
document.addEventListener('keydown', function(e){
  const d = document.getElementById('feel-door');
  if(!d || !d.classList.contains('open')) return;
  if(e.key === 'Escape'){ e.preventDefault(); closeFeelingDoor(); return; }
  if(e.key !== 'Tab') return;
  const items = [].slice.call(d.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
                  .filter(function(el){ return el.offsetParent !== null || el === document.activeElement; });
  if(!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
});
function closeFeelingDoor(){
  document.getElementById('feel-backdrop')?.classList.remove('open');
  const d = document.getElementById('feel-door'); if(d) d.classList.remove('open');
  // Give the rest of the app back to the screen reader, and put focus where they left it.
  try{ document.querySelectorAll('[aria-hidden="true"]').forEach(function(el){
    if(el && !el.closest('#feel-door') && (el.classList.contains('tab') || el.classList.contains('nav') ||
       el.classList.contains('navbar') || el.id === 'topbar')) el.removeAttribute('aria-hidden'); }); }catch(_){ }
  try{ if(_feelReturnFocus && document.contains(_feelReturnFocus)) _feelReturnFocus.focus({ preventScroll:true }); }catch(_){ }
  _feelReturnFocus = null;
}
function renderFeelingDoor(){
  const name = ls('totry_name') || '';
  const h = new Date().getHours();
  const greet = document.getElementById('feel-greeting');
  if(greet) greet.textContent = name ? ('What are you feeling, '+name+'?') : 'What are you feeling?';
  const grid = document.getElementById('feel-grid');
  if(!grid) return;
  grid.innerHTML = '';
  FEELINGS.forEach((f,i)=>{
    const b = document.createElement('button');
    b.className = 'feel-chip';
    b.innerHTML = '<span class="feel-chip-emoji">'+f.emoji+'</span><span class="feel-chip-label">'+f.label+'</span><span class="feel-chip-sub">'+f.sub+'</span>';
    b.onclick = ()=>{ if(typeof haptic==='function') haptic('light'); try{ _recordFeeling(f.id); }catch(_){}; f.act(); };
    grid.appendChild(b);
  });
}
// "The pull" from the orb. If he's fighting a named vice, the integrated stakes door is the truer
// first response than a blank AI chat — it already knows the losses, the debt, the streak, the hour.
// One vice: straight in. Several: a one-tap which-one (needed for the right stakes). None yet, or he
// just wants to talk: the companion. Reachable in two taps from anywhere, before the feeling wins.
function _feelThePull(){
  try{
    closeFeelingDoor();   // the door's done its job — don't stack the next sheet on top of it
    if(typeof loadV==='function') loadV();
    const vs=(typeof vices!=='undefined'&&Array.isArray(vices))?vices.filter(v=>v&&v.n):((ls('totry_v')||[]).filter(v=>v&&v.n));
    if(!vs.length){ openCompanionForUrge(); return; }
    if(vs.length===1){ const _only=vs[0]; if(_only.kind==='letgo'){ openLettingGo(); return; } openMomentStakes(vices.indexOf(_only)); return; }
    document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());
    const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
    m.innerHTML='<div class="modal">'+
      '<div class="modal-handle"></div>'+
      '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:23px;font-style:italic;color:var(--tx);margin-bottom:4px">Which one’s pulling?</div>'+
      '<div class="empty-note">No wrong answer. I just want to meet the right one.</div>'+
      vs.map(v=>{ const idx=vices.indexOf(v); const _act=(v.kind==='letgo')?'openLettingGo()':('openMomentStakes('+idx+')'); return '<button class="btn" onclick="closeModal(this);'+_act+'" style="margin-bottom:8px;text-align:left;padding:13px;font-size:14px">'+String(v.n).replace(/</g,'&lt;')+'</button>'; }).join('')+
      '<button class="btn" onclick="closeModal(this);openCompanionForUrge()" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:4px">Something else — just talk</button>'+
      '</div>';
    document.body.appendChild(m);
    if(typeof haptic==='function') haptic('tap');
  }catch(_){ openCompanionForUrge(); }
}
// Log the feeling quietly (so patterns can form over time — the mirror learns).
// AND SOMETHING HAS TO LEARN. This store was written on every single tap of the Feeling Door and read
// by nothing at all — five hundred entries of the most intimate signal in the app, going nowhere. The
// comment above promised a mirror; there was no mirror. Two readers now: the door itself (below) and
// the whole-person brief the Brother speaks from (lifeStateBrief).
function feelingPattern(days){
  try{
    const log = ls('totry_feelings'); if(!Array.isArray(log) || !log.length) return null;
    const since = Date.now() - (Number(days)||7)*86400000;
    const recent = log.filter(function(e){ return e && e.ts >= since && e.id; });
    if(recent.length < 3) return null;
    const counts = {};
    recent.forEach(function(e){ counts[e.id] = (counts[e.id]||0) + 1; });
    let topId = null, topN = 0;
    Object.keys(counts).forEach(function(k){ if(counts[k] > topN){ topN = counts[k]; topId = k; } });
    if(topN < 2) return null;
    return { id: topId, count: topN, total: recent.length, days: Number(days)||7,
             label: (typeof _FEEL_LABELS==='object' && _FEEL_LABELS[topId]) || topId };
  }catch(_){ return null; }
}
// How many times THIS feeling has brought them here lately — the number the door needs.
function feelingCount(id, days){
  try{
    const log = ls('totry_feelings'); if(!Array.isArray(log)) return 0;
    const since = Date.now() - (Number(days)||7)*86400000;
    return log.filter(function(e){ return e && e.id===id && e.ts >= since; }).length;
  }catch(_){ return 0; }
}
function _recordFeeling(id){
  try{ const log = ls('totry_feelings') || []; log.push({ id, ts: Date.now() }); if(log.length>500) log.splice(0, log.length-500); ls('totry_feelings', log); }catch(_){}
}
// Meet the feeling, then MOVE through it — to the one thing that actually helps THIS feeling. The
// brother's voice. Each path ends with a single, doable next step, never a lecture, never a tracker.
// ── IF-THEN PLANS (implementation intentions) ────────────────────────────────
// The highest-evidence habit mechanic in the literature (Gollwitzer/Sheeran, 94 studies, d≈0.65):
// turn a rescued moment into a rule. We co-write it — PRE-FILLED from the move that just worked, so
// there's nothing to compose — save it, and surface it back at the NEXT time this feeling comes, so
// counsel COMPOUNDS instead of starting from zero. One current plan per feeling. Names are escaped.
const _FEEL_LABELS = { restless:'restless', flat:'flat', anxious:'anxious', down:'heavy', procrast:'avoiding something', angry:'fired up', good:'steady & good' };
const _FEEL_PLAN = {
  restless:'burn it off — 20 push-ups or a fast walk, not the scroll',
  flat:'get one real hit of clean dopamine — cold water, sunlight, or move my body',
  anxious:'one minute of slow breathing, the long exhale, then name the one real thing in front of me',
  down:'be gentle — water, light, a slow walk, and tell one real person',
  procrast:'start the smallest version of it for just 2 minutes',
  angry:'one slow cooling breath before I decide or say anything',
  good:'do one thing now that future-me will thank me for'
};
function _ifThenLib(){ try{ const a=ls('totry_if_then'); return Array.isArray(a)?a:[]; }catch(_){ return []; } }
function getIfThen(feeling){ return _ifThenLib().find(function(p){ return p&&p.feeling===feeling; }) || null; }
function saveIfThen(feeling, action){
  action=(action||'').trim(); if(!action){ try{ showToast('Empty','A plan needs one line — what will you do?'); }catch(_){} return; }
  try{ const lib=_ifThenLib().filter(function(p){ return p&&p.feeling!==feeling; });
    lib.unshift({ feeling:feeling, label:(_FEEL_LABELS[feeling]||feeling), action:action.slice(0,160), ts:new Date().toISOString() });
    ls('totry_if_then', lib.slice(0,40));
  }catch(_){}
  try{ if(typeof haptic==='function') haptic('success'); }catch(_){}
  try{ showToast('Plan locked in', 'Next time this hits, I’ll hand you back your own words.'); }catch(_){}
}
// Save, then hand them BACK to the move they were in the middle of — locking in a plan must never
// cost someone the thing that was actually helping them in the moment.
function _saveIfThenFromModal(feeling){
  const v=document.getElementById('ifthen-act');
  const ok=(v && v.value && v.value.trim());
  saveIfThen(feeling, v?v.value:'');
  if(!ok) return;                                   // nothing saved → leave the plan modal open
  document.querySelector('.modal-bg.open')?.remove();
  setTimeout(function(){ try{ if(typeof _feelMove==='function') _feelMove(feeling); }catch(_){} }, 180);
}
function _lockItIn(feeling){
  const existing=getIfThen(feeling); const preset=existing?existing.action:(_FEEL_PLAN[feeling]||''); const label=_FEEL_LABELS[feeling]||feeling;
  document.querySelector('.modal-bg.open')?.remove();
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center;max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px">A plan for next time</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);line-height:1.3;margin-bottom:6px">When I feel '+_escFew(label)+', I will…</div>'+
    '<div style="font-size:12px;color:var(--tx3);line-height:1.55;margin-bottom:14px">Decide it now, while you’re clear. Next time the feeling comes, I’ll hand you back your own words — that’s what makes it hold.</div>'+
    '<textarea id="ifthen-act" style="min-height:70px;font-size:16px;line-height:1.5;margin-bottom:14px">'+_escFew(preset)+'</textarea>'+
    '<button class="btn primary" style="margin-bottom:8px" onclick="_saveIfThenFromModal(\''+feeling+'\')">Lock in my plan</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  setTimeout(function(){ const t=document.getElementById('ifthen-act'); if(t) t.focus(); },60);
}

function _feelMove(feeling){
  closeFeelingDoor();
  const name = ls('totry_name') || '';
  const life = (typeof getLifeState==='function') ? getLifeState() : null;
  const sets = {
    restless: { title:'Restless energy', body:'That buzz wants OUT, not in. Don\u2019t scroll it away \u2014 that just traps it. Burn it: 20 push-ups right now, or a fast walk around the block. Move the body and the mind follows.', cta:'Log a quick workout', go:'train' },
    flat: { title:'Flat is not failure', body:'Numb usually means depleted, not broken \u2014 and if you\u2019ve quit something, this grey stretch is your reward system healing, not you failing. It lifts. You don\u2019t need motivation to act; you need ONE real hit of clean dopamine, and the feeling follows.', cta:'Chase a real high', go:'__naturalhighs' },
    anxious: { title:'Let\u2019s slow it down', body:'Anxiety is a body running ahead of the moment. We\u2019ll bring it back down together \u2014 one minute of slow breathing, the long exhale that tells your body it\u2019s safe. Then name the ONE thing actually in front of you. The spinning is just the mind borrowing tomorrow\u2019s weight.', cta:'Breathe with me', go:'__breath:settle' },
    down: { title:'Heavy is allowed', body:'You don\u2019t have to fix this right now. Heavy days are part of it, not proof you\u2019re failing. Be gentle \u2014 water, light, a slow walk, maybe tell one real person. And if it\u2019s been heavy for a while, that\u2019s a sign to let a real person in, not a weakness.', cta:'I might need real help', go:'__bridge' },
    procrast: { title:'The thing you\u2019re avoiding', body:'Avoiding it costs more than doing it \u2014 you already know that, because it\u2019s sitting on you right now. Don\u2019t plan it, don\u2019t perfect it. Start the smallest possible version for 2 minutes. Momentum is the whole secret. What\u2019s the one thing?', cta:'Name it & start', go:'__procrast' },
    angry: { title:'Fired up', body:'Anger is energy with nowhere to go. Don\u2019t aim it at someone or stuff it down. Cool the heat first \u2014 a slow cooling breath drops the temperature in about a minute \u2014 THEN decide what\u2019s actually worth doing, from a calm place.', cta:'Cool it down', go:'__breath:cool' },
    good: { title:'Good \u2014 let\u2019s build on it', body:'When you\u2019re steady is exactly when to invest, because the hard days spend what the good days save. Do one thing now that future-you will thank you for. Don\u2019t coast it away.', cta:'What\u2019s my next step?', go:'__nextstep' }
  };
  // STATE-MATCHED BREATH on every door. Eight real protocols existed but five of seven feelings
  // never offered one, and 'sigh' (the fastest way to drop a spike) and 'box' had no caller at all.
  // Offered as a SECOND option, never replacing the move — a breath is the one work always available.
  const BREATH_FOR = { restless:'settle', flat:'energize', anxious:'settle', down:'settle', procrast:'box', angry:'cool', good:'' };
  const s = sets[feeling]; if(!s) return;
  const m = document.createElement('div');
  m.className='modal-bg open'; m.style.alignItems='center';
  let onclick = 'closeModal(this)';
  if(s.go==='__nextstep') onclick = 'closeModal(this);brotherGuidance()';
  else if(s.go==='__companion') onclick = 'closeModal(this);openCompanionForUrge()';
  else if(s.go==='__bridge') onclick = 'closeModal(this);bridgeToRealHelp(\'heavy\')';
  else if(s.go==='__procrast') onclick = 'closeModal(this);_startSmallestThing()';
  else if(s.go==='__naturalhighs') onclick = 'closeModal(this);openNaturalHighs()';
  else if(s.go && s.go.indexOf('__breath:')===0) onclick = 'closeModal(this);openBreath(\''+s.go.split(':')[1]+'\',{reason:\''+feeling+'\'})';
  else onclick = 'closeModal(this);go(\''+s.go+'\')';
  // The suggested move is never the ONLY door. Whatever they're feeling, they can always choose to
  // just TALK (the companion) or WRITE it down (journal) instead of following the prescription — met
  // where they are, not railroaded into a workout or a task. (Skip the talk chip when talking IS the
  // primary action, e.g. "anxious".)
  const _talkBtn = (s.go==='__companion') ? '' :
    '<button class="btn" onclick="closeModal(this);openCompanionForUrge()" style="flex:1;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);margin:0;font-size:13px">💬 Just talk</button>';
  const _saved = (typeof getIfThen==='function') ? getIfThen(feeling) : null;
  // THE DOOR REMEMBERS. Coming back to the same feeling over and over is the single most useful thing
  // this app knows about a person, and it was being written to disk and forgotten. Said as an
  // observation, never a count-of-failures: "this keeps coming" is information, not a verdict — and
  // it points at the one thing that actually compounds, the if-then plan.
  const _recur = (function(){
    try{
      // _recordFeeling already logged this tap, so the count includes right now.
      const n = (typeof feelingCount==='function') ? feelingCount(feeling, 7) : 0;
      if(n < 3) return '';
      const lbl = (_FEEL_LABELS && _FEEL_LABELS[feeling]) || feeling;
      const tail = _saved
        ? 'Your plan below is the right place to start.'
        : 'That is worth a plan, not just a moment \u2014 there is one at the bottom of this.';
      return '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:14px;text-align:left;background:var(--bg3);border-radius:10px;padding:10px 12px">'+
        'This is the <b style="color:var(--tx2)">'+n+((n%100>=11&&n%100<=13)?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'))+'</b> time '+_escFew(lbl)+' has brought you here this week. '+tail+'</div>';
    }catch(_){ return ''; }
  })();
  const _savedBanner = _saved ? '<div style="background:var(--go-bg);border:1px solid var(--go-bd);border-radius:10px;padding:10px 12px;margin-bottom:16px;text-align:left"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px">The plan you set for this</div><div style="font-size:12.5px;color:var(--tx2);line-height:1.55">'+_escFew(_saved.action)+'</div></div>' : '';
  // Their own #1 value, as a QUESTION, never a verdict. Skipped when they're heavy: a person who is
  // low does not need their own standard held up in front of them. That would be shame, not counsel.
  const _valBanner = (function(){
    try{
      if(feeling==='down') return '';
      const tv=(typeof topValue==='function')?topValue():null; if(!tv) return '';
      return '<div style="font-size:12.5px;color:var(--tx3);line-height:1.55;margin-bottom:16px;font-style:italic">You said <span style="color:var(--go);font-style:normal">'+_escFew(tv)+'</span> matters most to you. Does the next hour move toward it?</div>';
    }catch(_){ return ''; }
  })();
  m.innerHTML = '<div class="modal" style="text-align:center">'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.25;margin-bottom:10px">'+s.title+'</div>'+
    '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:18px">'+s.body+'</div>'+
    _recur+
    _savedBanner+
    _valBanner+
    '<button class="btn primary" style="margin-bottom:8px" onclick="'+onclick+'">'+s.cta+'</button>'+
    (function(){
      const bp = BREATH_FOR[feeling];
      // Skip when the primary move IS this breath already, or the feeling doesn't want one.
      if(!bp || (s.go && s.go.indexOf('__breath:')===0)) return '';
      const p = (typeof _protoFor==='function') ? _protoFor(bp) : null;
      const why = p ? p.why : 'One minute of breathing';
      return '<button class="btn" onclick="closeModal(this);openBreath(\''+bp+'\',{reason:\''+feeling+'\'})" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px">🫁 Take a breath first — <span style="color:var(--tx3)">'+why.toLowerCase()+'</span></button>';
    })()+
    '<div style="display:flex;gap:8px;margin-bottom:8px">'+_talkBtn+
      '<button class="btn" onclick="closeModal(this);openQuickJournal()" style="flex:1;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);margin:0;font-size:13px">✎ Write it down</button>'+
    '</div>'+
    // The outward exit — offered where rumination and self-focus are loudest.
    ((feeling==='flat'||feeling==='restless'||feeling==='down'||feeling==='angry')
      ? '<button class="btn" onclick="closeModal(this);openLookUp()" style="margin-bottom:8px;background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12.5px">🌄 Go outside and look up</button>' : '')+
    '<button class="btn" onclick="_lockItIn(\''+feeling+'\')" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin:0 0 4px">🔒 '+(_saved?'Update':'Make')+' my plan for next time</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin:0">Not now</button>'+
    '</div>';
  // A DIALOG, AND THE READER GOES INTO IT. closeFeelingDoor() runs first and hands focus back to the
  // orb, so without this the sheet that is the whole point of the door — the move they were sent to —
  // opened behind them, unannounced, with focus on a button on the screen underneath.
  m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('tabindex','-1');
  document.body.appendChild(m);
  try{ (m.querySelector('button') || m).focus({preventScroll:true}); }catch(_){}
  if(typeof haptic==='function') haptic('tap');
}
// The 2-minute start — for procrastination. Asks the one thing, then shrinks it to a startable size.
function _startSmallestThing(){
  if(typeof openFormModal==='function'){
    openFormModal('The thing you\u2019re avoiding','What\u2019s the one thing? Don\u2019t overthink it.',[{id:'thing',label:'',type:'text',placeholder:'e.g. the assignment, the call, the gym'}],'Start it small',(vals)=>{
      if(!vals.thing||!vals.thing.trim()) return 'Just name it.';
      const t = vals.thing.trim();
      setTimeout(()=>{ const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center'; m.innerHTML='<div class="modal" style="text-align:center"><div style="font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);margin-bottom:10px">Just 2 minutes</div><div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:20px">Don\u2019t do <b style="color:var(--tx)">'+t.replace(/</g,'&lt;')+'</b>. Just START it \u2014 the smallest first step, for 2 minutes. Open the doc. Put on the shoes. Dial the number. You\u2019re allowed to stop after 2 minutes. You won\u2019t want to.</div><button class="btn primary" onclick="closeModal(this)">I\u2019m starting now</button></div>'; document.body.appendChild(m); if(typeof haptic==='function') haptic('tap'); }, 250);
      return true;
    });
  }
}

// ════ LETTING GO — the grief-of-a-person path (a breakup, a loss, an attachment you're releasing) ════
// Not a vice, and not NOT a vice. Some feel this fresh for a week; others carry it for months and it
// grips exactly like an addiction they can't quit — same cry ("help me stop reaching for them"), same
// in-the-moment machinery. What differs is the GOAL (letting go, not abstaining) and the VOICE (healing
// and grace, never shame, never reset-to-zero — going back is part of letting go). Met in the acute
// moment here; can GRADUATE into a named struggle in the Fight for anyone carrying it longer. Gender-
// neutral throughout ("them", never assumes who left whom). And every path ENDS — theRelease — because
// the whole point of a dopamine detox is an app that hands you back to your life instead of holding you.
function openLettingGo(){
  document.querySelector('.modal-bg.open')?.remove();
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center;max-height:90vh;overflow-y:auto">'+
    '<div class="modal-handle"></div>'+
    '<div style="font-size:30px;margin-bottom:6px">💔</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:25px;color:var(--tx);line-height:1.25;margin-bottom:10px">You\u2019re letting go of someone.</div>'+
    '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:14px">Missing them isn\u2019t weakness \u2014 it\u2019s love that hasn\u2019t found its new shape yet. You don\u2019t have to stop feeling it. You just don\u2019t have to feed it. Let\u2019s tend it here, and then let you go and live.</div>'+
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:13px 15px;margin-bottom:16px;text-align:left">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px">One honest thing</div>'+
      '<div style="font-size:12.5px;color:var(--tx2);line-height:1.65">Looking them up feels like staying close. It isn\u2019t. The research is blunt: on the days people check an ex, their mood is measurably worse \u2014 <i>that same day</i> \u2014 and it keeps the wound open. Watching them isn\u2019t reaching them. It\u2019s reaching the wound.</div>'+
    '</div>'+
    '<button class="btn primary" style="margin-bottom:8px" onclick="closeModal(this);_letGoSurf()">The urge to look \u2014 ride it out</button>'+
    '<button class="btn" style="margin-bottom:8px;text-align:left;background:var(--bg3);border:1px solid var(--bd);color:var(--tx)" onclick="closeModal(this);_letGoJournal()">\u270E&nbsp;&nbsp;Put it here, not in their feed</button>'+
    '<button class="btn" style="margin-bottom:8px;text-align:left;background:var(--bg3);border:1px solid var(--bd);color:var(--tx)" onclick="closeModal(this);_letGoAct()">🌿&nbsp;&nbsp;One real thing instead</button>'+
    '<div style="display:flex;gap:8px;margin-bottom:8px">'+
      '<button class="btn" onclick="closeModal(this);openCompanionForUrge()" style="flex:1;background:transparent;border:1px solid var(--bd);color:var(--tx3);margin:0;font-size:12px">💬 Just talk</button>'+
      '<button class="btn" onclick="closeModal(this);_letGoName()" style="flex:1;background:transparent;border:1px solid var(--bd);color:var(--tx3);margin:0;font-size:12px">I keep going back</button>'+
    '</div>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin:0">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}
// Ride the urge with a gentle long-exhale breath, then release into life (no shame gate — it's grief).
function _letGoSurf(){ openBreath('settle', {reason:'letgo', onClose:()=>setTimeout(()=>theRelease({did:'You felt the urge to look \u2014 and let it pass instead of feeding it.'}), 220)}); }
// A grief-prompted journal that beats Notes at the moment: a real prompt, saved to your journal (day +
// mood + tagged), and it ENDS by handing you back to your life. Notes just stores; this processes.
function _letGoJournal(){
  document.querySelector('.modal-bg.open')?.remove();
  const m=document.createElement('div'); m.className='modal-bg open';
  m.innerHTML='<div class="modal" style="max-height:86vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px">Let it out \u00b7 not in their feed</div>'+
    '<h3 style="margin-bottom:6px">What are you actually missing?</h3>'+
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:12px;line-height:1.55">Not them, necessarily \u2014 the feeling underneath. What do you miss? What were you getting from them that you need right now? Write it here, where it gets processed instead of poured back into the wound.</p>'+
    '<textarea id="lg-jtext" placeholder="I miss\u2026" style="min-height:130px;font-size:16px;line-height:1.6;margin-bottom:14px" autofocus></textarea>'+
    '<button class="btn primary" onclick="_letGoSaveJournal()" style="margin-bottom:8px">Set it down</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  setTimeout(()=>document.getElementById('lg-jtext')?.focus(),60);
}
function _letGoSaveJournal(){
  const text=document.getElementById('lg-jtext')?.value.trim();
  if(!text){ if(typeof showToast==='function') showToast('Empty','Even one line counts.'); return; }
  // The grief door \u2014 placeholder "I miss\u2026" \u2014 is the likeliest place after the companion for a
  // first disclosure, and it went straight to theRelease() with an encouraging line and no gate.
  const _lgCrisis = journalCrisisOf(text);
  try{
    const entries=ls('totry_journal')||[];
    entries.unshift({ date:new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'short',year:'numeric'}), ts:new Date().toISOString(), day:(typeof getDayCount==='function'?getDayCount():0), mood:'😔', text:text, flagged:!!_lgCrisis, tag:'letting_go', quick:true });
    ls('totry_journal', entries.slice(0,1200));
    if(typeof renderJournal==='function') renderJournal();
  }catch(_){}
  document.querySelector('.modal-bg.open')?.remove();
  if(journalMeetCrisis(_lgCrisis)) return;   // saved above; met here rather than released
  if(typeof haptic==='function') haptic('success');
  theRelease({did:'You put it into words \u2014 and set it down. That\u2019s processing it, not feeding it.'});
}
// Behavioral activation — the evidence-based antidote to rumination is ONE valued real action (not
// avoidance, not numbing). Pick one, then the app closes and you go do it.
function _letGoAct(){
  document.querySelector('.modal-bg.open')?.remove();
  const acts=[
    ['🚶','Walk \u2014 10 minutes, outside, phone in your pocket'],
    ['📞','Message ONE real person who loves you'],
    ['🚿','Cold water on your face, or a shower'],
    ['🧹','One thing with your hands \u2014 tidy, cook, fix something'],
    ['🏋️','Move your body \u2014 even 20 push-ups']
  ];
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center;max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);margin-bottom:6px">One real thing</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:16px">Rumination breaks when you do something real. Pick one \u2014 then put the phone down and go do it.</div>'+
    acts.map(a=>'<button class="btn" style="text-align:left;margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx);font-size:13px" onclick="closeModal(this);theRelease({did:\''+a[1].replace(/'/g,"\\'")+'\'})">'+a[0]+'&nbsp;&nbsp;'+a[1]+'</button>').join('')+
    '<button class="btn" onclick="closeModal(this);openLettingGo()" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin:0">Back</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}
// For anyone carrying this longer than a moment — name it, and it becomes something the Fight helps with
// every day: same urge support, a healing goal, grace on going back. Optional label, gender-free.
function _letGoName(){
  document.querySelector('.modal-bg.open')?.remove();
  if(typeof openFormModal==='function'){
    openFormModal('Make this something you\u2019re letting go of','You don\u2019t have to name them \u2014 a word is enough, or leave it blank. I\u2019ll keep it in your Fight with a healing goal (no shame clock), and meet you in the urge whenever it pulls.',[{id:'who',label:'',type:'text',placeholder:'e.g. my ex, someone, a name \u2014 optional'}],'Add it to my Fight',(vals)=>{ createLetGo((vals.who||'').trim()); return true; });
  } else { createLetGo(''); }
}
function createLetGo(who){
  try{
    if(typeof loadV==='function') loadV();
    const label = who ? ('Letting go of '+who) : 'Letting go';
    vices.push({ n:label, type:'letgo', kind:'letgo', mode:'watch', t:'When the missing hits', w:0, total:0, lastWin:null, lastLoss:null, urgelog:[], startDate:new Date().toISOString(), cleanDaysTotal:0, relapseCount:0, relapseHistory:[], plan:{ why:'To let them go and come home to myself.', move:'Ride the urge \u00b7 don\u2019t look them up \u00b7 one real thing', updatedAt:Date.now() } });
    if(typeof saveV==='function') saveV();
    if(typeof renderVices==='function') renderVices();
    if(typeof logEvent==='function') logEvent('letgo_named',{});
    if(typeof haptic==='function') haptic('success');
    setTimeout(()=>theRelease({did:'It\u2019s in your Fight now \u2014 I\u2019ll be with you in it, with grace, every time it pulls.'}), 200);
  }catch(_){}
}
// The grace-log for a named letting-go struggle: reaching back is part of the process, nothing resets.
function _letGoWentBack(i){
  try{ if(typeof loadV==='function') loadV(); const v=vices[i]; if(v){ v.urgelog=v.urgelog||[]; v.urgelog.push(Date.now()); if(typeof saveV==='function') saveV(); } }catch(_){}
  document.querySelector('.modal-bg.open')?.remove();
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center"><div class="modal-handle"></div>'+
    '<div style="font-size:26px;margin-bottom:8px">🕊️</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);margin-bottom:10px">Noticed, not judged.</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:18px">Reaching back is part of letting go, not the end of it. Nothing resets \u2014 you\u2019re still on the way. What do you need right now?</div>'+
    '<button class="btn primary" style="margin-bottom:8px" onclick="closeModal(this);openLettingGo()">Help me with this moment</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">I\u2019m okay</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}

// ════ THE RELEASE — the off-ramp the whole app was missing ════ A phone has no natural stopping cue
// (Adam Alter): no last page, no credits, so we never put it down. This BUILDS the ending. Any regulated
// moment can close here — it names what you did, hands you back to your life, and gives you NOTHING to
// scroll. The opposite of a feed. And it quietly counts the only metric that matters for a detox: not
// time-in-app, but the times you came, regulated, and LEFT (totry_releases = "time returned to life").
function _logRelease(via){ try{ const r=ls('totry_releases')||[]; r.unshift({ts:Date.now(),via:via||''}); ls('totry_releases', r.slice(0,500)); if(typeof logEvent==='function') logEvent('release',{}); }catch(_){} }
function releaseCount(){ try{ return (ls('totry_releases')||[]).length; }catch(_){ return 0; } }
function theRelease(opts){
  opts = opts || {};
  // The Release ends the session — nothing should still be talking after it.
  try{ if(typeof Speak!=='undefined' && Speak.stop) Speak.stop(); }catch(_){}
  document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());
  document.querySelectorAll('.breath-overlay').forEach(o=>o.remove());
  _logRelease(opts.did||'');
  const name = ls('totry_name') || '';
  const n = releaseCount();
  const did = opts.did ? '<div style="font-size:14px;color:var(--tx2);line-height:1.6;margin-bottom:22px;max-width:340px">'+opts.did+'</div>' : '';
  const countLine = n>1 ? '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);letter-spacing:0.05em;margin-top:28px;line-height:1.6">'+n+' times now, you\u2019ve come here and walked back into your life<br>instead of down the glass.</div>' : '';
  const ov=document.createElement('div');
  ov.className='totry-release-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:9600;background:radial-gradient(circle at 50% 38%,#14180f,#09090c 72%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;text-align:center;color:var(--tx);opacity:0;transition:opacity 0.5s ease';
  ov.innerHTML=
    '<div style="font-size:30px;margin-bottom:16px;opacity:0.9">🕊️</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:27px;line-height:1.3;margin-bottom:14px;max-width:340px">You came here instead.</div>'+
    did+
    // Behavioural activation: hand over ONE concrete phone-off act, matched to whichever pillar is
    // actually thinnest tonight. "Go live your life" is a sentiment; this is a thing you can do.
    ((typeof nextSmallThingHTML==='function') ? nextSmallThingHTML() : '')+
    '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:26px;max-width:330px">Now put me down'+(name?', '+name.replace(/</g,'&lt;'):'')+'. Go live the next hour \u2014 the real one, off the glass. I\u2019m right here if the wave comes back. But you don\u2019t need me right now.</div>'+
    '<button class="btn primary rel-go" style="max-width:240px;margin:0 auto">I\u2019m putting it down</button>'+
    // The best thing to walk back into is a person. Offered only when someone is actually named and
    // not held quietly \u2014 never a nag, and it logs the reach-out so the app stops asking.
    (function(){
      try{
        const _s=(typeof reachOutSuggestion==='function')?reachOutSuggestion():null;
        if(!_s||!_s.person) return '';
        return '<button class="btn rel-person" style="max-width:240px;margin:10px auto 0;background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12.5px;padding:10px">\u2026or go message '+_escFew(_s.person.name)+'</button>';
      }catch(_){ return ''; }
    })()+
    // A guest has now actually BEEN helped \u2014 the honest moment to offer an account, framed as keeping
    // what just happened. Sits UNDER the release button on purpose: putting the phone down still wins.
    ((typeof isGuest==='function' && isGuest())
      ? '<button class="btn rel-keep" style="max-width:240px;margin:10px auto 0;background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12.5px;padding:10px">Keep this \u2192</button>'+
        '<div style="font-size:11px;color:var(--tx3);opacity:0.75;margin-top:8px;max-width:280px;line-height:1.5">An account keeps tonight \u2014 and lets me remember you next time.</div>'
      : '')+
    countLine;
  document.body.appendChild(ov);
  requestAnimationFrame(()=>{ ov.style.opacity='1'; });
  try{ const _keep=ov.querySelector('.rel-keep'); if(_keep) _keep.onclick=function(){ if(typeof guestKeepThis==='function') guestKeepThis(); }; }catch(_){}
  try{ const _rp=ov.querySelector('.rel-person'); if(_rp) _rp.onclick=function(){ ov.remove(); if(typeof releaseReachOut==='function') releaseReachOut(); }; }catch(_){}
  ov.querySelector('.rel-go').onclick=()=>{
    // No "what's next", no feed — a genuine end. A brief goodbye, then it clears itself and gets out of your way.
    ov.innerHTML='<div class="rel-bye" style="font-family:Cormorant Garamond,serif;font-size:32px;color:var(--tx);opacity:0;transition:opacity 0.7s ease">Go well.</div>';
    const g=ov.querySelector('.rel-bye'); requestAnimationFrame(()=>{ g.style.opacity='0.9'; });
    setTimeout(()=>{ ov.style.opacity='0'; setTimeout(()=>ov.remove(),700); }, 1600);
    if(typeof haptic==='function') haptic('success');
  };
  if(typeof haptic==='function') haptic('tap');
}

// ════ THE IMPULSE PAUSE — money as an emotion, not arithmetic ════
// Budgeting apps treat money as maths. The evidence says a spending urge is the same dopamine loop as
// any other vice: spike on the decision, crash in ~20 minutes, then guilt, which drives the next one.
// ~70% of impulse urges fade within a day. So this is the before-it-takes-over door pointed at money —
// name the feeling underneath, then a 24-hour hold you can actually keep. Never shame, never a budget
// lecture: money stress already eats the mental bandwidth good decisions need.
function _holds(){ try{ const a=ls('totry_impulse_holds'); return Array.isArray(a)?a:[]; }catch(_){ return []; } }
function openImpulsePause(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  if(typeof openFormModal!=='function') return;
  openFormModal('Before you buy','No judgement — most of this is just a feeling looking for an exit. What is it, and what’s it cost?',
    [{id:'what',label:'',type:'text',placeholder:'What is it?'},
     {id:'amt',label:'',type:'number',placeholder:'Roughly how much? ('+curSym()+')'}],
    'Next',
    function(vals){
      const what=(vals.what||'').trim(); if(!what) return 'Just name it.';
      const amt=parseFloat(vals.amt)||0;
      setTimeout(function(){ _impulseFeeling(what, amt); }, 200);
      return true;
    });
}
const _IMPULSE_FEELINGS = [
  ['😖','Stressed or wound up','Spending is a fast way to feel in control when something else isn’t. The relief is real — and it’s about twenty minutes long.'],
  ['😐','Bored','Boredom is the cheapest trigger there is, and the most expensive to obey. This is the one most worth sleeping on.'],
  ['😔','Flat or low','Buying something lifts the floor for an hour, then puts it back lower. If today’s heavy, this won’t be the thing that fixes it.'],
  ['🥳','Actually happy — celebrating','Then that might be genuinely fine. Money spent on purpose isn’t a leak. Just make it a choice, not a reflex.'],
  ['🤷','I want it and I don’t know why','That’s the honest answer, and it’s the most common one. Hold it a day and see if the wanting is still there.']
];
function _impulseFeeling(what, amt){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const safe=_jsAttr(what);          // for the onclick attribute — see _jsAttr in 00-boot
  const shown=_escFew(what);         // for anything the person reads
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center;max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);line-height:1.3;margin-bottom:6px">What’s underneath it?</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:16px">Naming the feeling takes some of the heat out of it. That’s not a trick — it’s the same thing that works on any other urge.</div>'+
    _IMPULSE_FEELINGS.map(function(f,i){ return '<button class="btn" onclick="_impulseHold(\''+safe+'\','+amt+','+i+')" style="text-align:left;margin-bottom:8px;padding:12px;background:var(--bg3);border:1px solid var(--bd);font-size:13.5px">'+f[0]+'&nbsp;&nbsp;'+f[1]+'</button>'; }).join('')+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}
function _impulseHold(what, amt, fi){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const f=_IMPULSE_FEELINGS[fi]||_IMPULSE_FEELINGS[4];
  const safe=String(what).replace(/</g,'&lt;');
  const why=(ls('totry_why')||'').trim();
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center;max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-size:26px;margin-bottom:8px">'+f[0]+'</div>'+
    '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:14px">'+f[2]+'</div>'+
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:13px 15px;margin-bottom:14px;text-align:left">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px">The 24-hour hold</div>'+
      '<div style="font-size:12.5px;color:var(--tx2);line-height:1.65">Don’t decide now — decide tomorrow. About seven in ten urges to buy are gone within a day, and the ones that aren’t are usually the ones worth having. I’ll ask you about <b style="color:var(--tx)">'+safe+'</b> then.</div>'+
    '</div>'+
    (why?'<div style="font-size:12px;color:var(--go);line-height:1.6;margin-bottom:14px;font-style:italic">Why you started: “'+why.replace(/</g,'&lt;').slice(0,150)+'”</div>':'')+
    '<button class="btn primary" style="margin-bottom:8px" onclick="_impulseSaveHold(\''+String(what).replace(/'/g,"").replace(/"/g,'')+'\','+amt+')">Hold it for a day</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px;margin-bottom:8px">I’m buying it anyway — that’s allowed</button>'+
    '<div style="font-size:11px;color:var(--tx3);line-height:1.5">Either way there’s no telling-off here. Buying something isn’t a moral failure; doing it without noticing is just how money leaks.</div>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}
function _impulseSaveHold(what, amt){
  try{ const h=_holds(); h.unshift({what:String(what).slice(0,80), amt:parseFloat(amt)||0, ts:Date.now()}); ls('totry_impulse_holds', h.slice(0,100)); }catch(_){}
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  try{ if(typeof haptic==='function') haptic('success'); }catch(_){}
  theRelease({did:'You stopped before you spent, and named what was actually going on. That’s the whole move.'});
}
// Asked the next day — the honest follow-through that makes the hold mean something.
function dueImpulseHold(){
  try{ return _holds().find(function(h){ return h && !h.done && (Date.now()-h.ts) >= 20*3600000; }) || null; }catch(_){ return null; }
}
function _resolveHold(ts, bought){
  try{ const h=_holds(); const i=h.findIndex(function(x){ return x && x.ts===ts; }); if(i>=0){ h[i].done=true; h[i].bought=!!bought; ls('totry_impulse_holds', h); } }catch(_){}
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  if(!bought){
    let saved=0; try{ saved=_holds().filter(function(x){ return x.done && !x.bought; }).reduce(function(a,x){ return a+(x.amt||0); },0); }catch(_){}
    try{ showToast('Still yours', saved>0 ? ('That’s about '+curSym()+Math.round(saved).toLocaleString()+' held onto by just waiting a day.') : 'The wanting passed. That’s how most of them go.'); }catch(_){}
  } else {
    try{ showToast('Fair enough','You looked at it properly and chose it. That’s the difference that matters.'); }catch(_){}
  }
  try{ if(typeof renderMoney==='function') renderMoney(); }catch(_){}
}

// ════ THE TOOLKIT — learn the tool BEFORE the moment ═══════════════════════════════════════════
// The companion applies these mechanisms in the grip of it. Nobody ever got to LEARN them somewhere
// calm — the whole category charges for that. This app already refuses to paywall prayer; it refuses
// here too. NOT a course: no streak, no badge, no percentage, nothing to complete. You pick a tool up
// and then you put the phone down (every lesson ends in theRelease, like every other exit here).
// Each lesson carries its OWN honest evidence line and its OWN source, because overclaiming a
// technique to someone who is suffering is a way of lying to them.
// Reuses: openBreath · openCompanion · openHALT · openValuesSort · openBlessing · _letGoAct ·
// theRelease · openFormModal · bridgeToRealHelp · faithLevel/faithTradition · _escFew · showToast · haptic.
const _TOOLKIT = [
  { id:'wave', ic:'\uD83C\uDF0A', t:'Riding the wave', st:'Why an urge fades if you stop fighting it',
    idea:[
      'An urge is not a straight line that climbs until you give in. It rises, it peaks, and it comes down \u2014 whether or not you feed it. That shape is the entire reason you can outlast one.',
      'Bracing against it is what makes it louder. Push a thought away and it comes back with interest; that rebound is one of the most reliably reproduced findings in the field. So you do the opposite of fighting: notice it, find where it sits in your body, breathe, and let it crest with you watching.',
      'You are not trying to win an argument with it. You are trying to still be here when it passes.'],
    ex:'11pm, phone in your hand. The pull arrives and you clamp down \u2014 not tonight, not tonight, not tonight. Two minutes later it is the only thing in your head, and the clamping is why. Surfing it looks embarrassingly small from outside: \u201cthere it is \u2014 tight chest, hot ears \u2014 okay.\u201d Then you breathe, and it moves.',
    prac:'Where does an urge usually sit in your body? Chest, throat, stomach, hands. Find it now, while nothing is happening, and put three words to it. Knowing the address means at 11pm you recognise the visitor instead of being ambushed.',
    pracBtn:'I found it',
    ev:'Urge surfing is a core piece of Mindfulness-Based Relapse Prevention, which in head-to-head trials does about as well as standard relapse prevention, with some advantage on heavy-use days at longer follow-up. Real, and modest. The \u201curges pass in 15\u201330 minutes\u201d line you hear everywhere is a clinical rule of thumb, not a measured law \u2014 yours may be shorter or longer.',
    src:'Paraphrased from Marlatt & Gordon\u2019s relapse-prevention work and Mindfulness-Based Relapse Prevention (Bowen, Chawla, Witkiewitz). The rebound point is Wegner\u2019s thought-suppression research.',
    // No reason: this is the TOOLKIT, and its own practice text says "while nothing is happening".
    // A reason turns on the 0-10 "how strong is it right now?" scale, which belongs to the urge path
    // where a before and after is what proves the breathing worked. Asking it of someone practising
    // in the calm answers a question they do not have — the same slip fixed in soulBeStill. The other
    // reason-carrying calls (letgo, and the HALT angry/tired ones) ARE in the moment and keep theirs.
    live:'Breathe one through now', act:"openBreath('settle')" },

  { id:'defuse', ic:'\u26C5', t:'Thoughts as weather', st:'Getting half a step back from what your mind says',
    idea:[
      'Your mind produces sentences all day. Some are useful, some are rubbish, and none of them are orders. The trouble starts when you are so far inside a thought that you cannot see it is a thought \u2014 it just feels like the truth about you.',
      'Defusion is the half-step back. Not arguing with it, not replacing it, not pretending it isn\u2019t there. Only changing your relationship to it: from being inside it, to hearing it. \u201cI never follow through\u201d becomes \u201cI\u2019m having the thought that I never follow through.\u201d Same sentence \u2014 and suddenly there is a person there, holding it.',
      'Weather, not commands. You don\u2019t negotiate with rain. You notice it and go where you were going anyway.'],
    ex:'One skipped session turns into \u201cI never follow through with anything,\u201d and that single sentence can end a whole week \u2014 because it stopped being a thought and became a fact about you. Say it the other way and it goes back to being a sentence. Then you can look at your last month honestly, instead of through it.',
    prac:'Take whatever your mind has been repeating this week. Put \u201cI\u2019m having the thought that\u2026\u201d in front of it and say the whole thing out loud, once. Out loud matters more than it should \u2014 hearing it in your own voice is most of the effect.',
    pracBtn:'I said it',
    ev:'Short defusion exercises reliably reduce how believable and how uncomfortable a thought feels, and they do it fast \u2014 that part is well replicated in small experiments. The knock-on effect on what people actually DO is smaller and patchier. It makes a thought easier to carry. It does not delete it, and it isn\u2019t meant to.',
    src:'Paraphrased from Acceptance and Commitment Therapy (Steven Hayes and colleagues), where defusion and the \u201cI\u2019m having the thought that\u2026\u201d move come from.',
    live:'Say one to me now', act:'openCompanion()' },

  { id:'reframe', ic:'\uD83E\uDDF2', t:'Catching the sentence before the slip', st:'The permission-giving thought, and how to test it',
    idea:[
      'Almost nobody slips out of nowhere. There is a sentence first, and it always sounds reasonable: just once. I\u2019ve had a hard week. I\u2019ve already ruined today. I\u2019ll start properly tomorrow. I can\u2019t cope with this without it.',
      'That sentence is doing a job \u2014 it is giving you permission. Catch it and you take the permission back. Three moves: catch it (say it in the exact words your head used), test it (is that actually true? has \u201cjust once\u201d ever been just once?), and replace it with something truer that you genuinely believe.',
      'You are not trying to think positively. You are trying to think accurately \u2014 which usually turns out to be kinder anyway.'],
    ex:'\u201cI\u2019ve already blown today.\u201d Test it: one bad choice at 4pm, and the other twenty hours are what \u2014 void? You wouldn\u2019t write off a week of training over one bad set. Truer: \u201cI made one choice I don\u2019t like. The rest of today is still mine.\u201d That isn\u2019t motivational. It\u2019s just more correct than the first version.',
    prac:'Write down the exact sentence your head uses on you \u2014 not the tidy version, the real one. I\u2019ll keep it, and you\u2019ll recognise it the next time it turns up.',
    pracBtn:'Write my sentence', pracFn:'_tkMyLine',
    ev:'Cognitive behavioural therapy as a whole is among the best-evidenced psychological treatments there is \u2014 clearly better than nothing or waiting, and roughly on par with other decent active treatments. Restructuring is one component of that package, and researchers genuinely argue about how much of the benefit is specifically down to it. Strong evidence for the whole; honest uncertainty about the part.',
    src:'Paraphrased from Aaron Beck\u2019s cognitive therapy and standard CBT relapse-prevention practice. The permission-giving thoughts listed are the ones this app\u2019s companion already listens for.',
    live:'One is loud right now', act:'openCompanion()' },

  { id:'ave', ic:'\uD83E\uDE79', t:'Why one becomes five', st:'Stopping a slip from becoming a night',
    idea:[
      'The damage in a slip is usually not the slip. It is the story you tell in the ninety seconds afterwards. \u201cWell, that\u2019s gone.\u201d \u201cI\u2019m clearly not built for this.\u201d And once you are the kind of person who has blown it, there is no reason left to stop at one.',
      'Clinicians named this decades ago because they kept watching it happen: one lapse, plus shame, plus all-or-nothing thinking, equals a full relapse. The lapse was survivable. The story wasn\u2019t.',
      'The way out is unglamorous. Decide now, while you are calm, what the next ten minutes look like if it happens \u2014 because you will not be inventing a plan at the time.'],
    ex:'One drink at a wedding you said you wouldn\u2019t drink at. Version one: \u201cnight\u2019s gone\u201d \u2014 and it\u2019s five. Version two, decided in advance: \u201cif I have one, I put the glass down, I go outside for four minutes, and I log it honestly.\u201d Same slip. Completely different Sunday.',
    prac:'Say your ten-minute plan out loud, in one sentence, starting with \u201cif it happens, I will\u2026\u201d. Keep it small enough to do while feeling awful \u2014 stand up, step outside, tell one person, log it honestly. Heroic plans are for people who aren\u2019t in it.',
    pracBtn:'I\u2019ve said mine',
    ev:'The abstinence violation effect is one of the most recognisable patterns in addiction practice, described consistently for over forty years. How much of relapse it explains is genuinely contested, and the original model has been revised more than once. Naming it in advance is a plan, not armour \u2014 people who do this still slip. They just tend to stop sooner.',
    src:'Paraphrased from Marlatt & Gordon\u2019s relapse-prevention model, where the abstinence violation effect was first described.',
    live:'Put it in my plan', act:"go('fight')" },

  { id:'compassion', ic:'\uD83E\uDEB6', t:'Why the hard voice loses', st:'Self-compassion, and the honest evidence for it',
    idea:[
      'The hard voice makes a promise: be brutal with yourself and you will finally get in line. It is worth asking whether it has delivered. Most people have been running that experiment for years.',
      'Here is the mechanism, and it isn\u2019t sentimental. Self-attack produces shame. Shame makes you want to disappear \u2014 and the fastest way to disappear is the exact behaviour you were attacking yourself for. So the hard voice reliably manufactures the next slip it is furious about.',
      'Self-compassion is not going easy on yourself. It is three plain things: speak to yourself as you would to someone you love in your exact position; remember that struggling is a normal human condition, not a defect unique to you; and see the situation clearly instead of drowning in it. None of those three is \u201clower your standards.\u201d'],
    ex:'Three days, no gym, and the voice says \u201cpathetic, you always do this.\u201d Now imagine your brother said it about himself. You wouldn\u2019t agree with him \u2014 not out of politeness, but because it isn\u2019t true and it wouldn\u2019t help. Say to yourself what you\u2019d have said to him. Then go and do the ten-minute version.',
    prac:'One sentence, out loud, about the thing you are currently hardest on yourself about \u2014 the sentence you\u2019d say to someone you love. A hand on your own chest while you say it isn\u2019t a gimmick; it\u2019s a physiological cue that takes some heat out. Feel free to feel ridiculous.',
    pracBtn:'I said it',
    ev:'This is the one to be careful about. Self-compassion is consistently and fairly strongly linked to lower anxiety, depression and shame across a very large body of research \u2014 but most of that is correlational, so it cannot prove which way the arrow points. Trials that actually train it show real improvements of small-to-moderate size. And the worry that self-compassion breeds slacking is not supported \u2014 it tends to travel WITH taking more responsibility, not less \u2014 though that finding is correlational too. So: promising, probably true, not proven. And not one more thing to feel bad about failing at.',
    src:'Paraphrased from Kristin Neff\u2019s self-compassion research (the three components are hers) and Paul Gilbert\u2019s compassion-focused therapy, which is where the shame-avoidance mechanism and the soothing-touch cue come from.',
    live:'Sit with it a minute', act:'openBlessing()' },

  { id:'values', ic:'\uD83E\uDDED', t:'Doing it when you don\u2019t feel like it', st:'Values, and why motivation was never the entry fee',
    idea:[
      'You were sold a sequence: first you feel motivated, then you act. It is backwards often enough to ruin people. Waiting to feel like it hands your life to whichever mood turns up.',
      'The alternative is boring and it works: pick the direction you actually care about, and act in that direction regardless of the weather inside you. A value isn\u2019t a goal \u2014 you cannot complete \u201cbeing someone my sister can rely on.\u201d That\u2019s the point. It is available again in ten minutes, no matter how today went.',
      'You will still not want to. That\u2019s allowed. Wanting to was never the entry fee.'],
    ex:'Nobody wants to train at 6am. There is no version of you that wakes up delighted. You go because of what you\u2019re becoming, and the not-wanting comes along \u2014 in the car, into the gym, through the first set \u2014 and then quietly leaves. It was never a verdict on the plan. It was weather.',
    prac:'Name out loud the one value actually driving this season of your life \u2014 your words, no committee language. Then do the two-minute version of one thing that points at it. Now, not later.',
    pracBtn:'Named it',
    ev:'ACT as a whole treatment has decent evidence, broadly comparable to CBT across a range of problems. Values work is one ingredient of it and has not been cleanly isolated and tested on its own, so \u201cvalues make you follow through\u201d is a reasonable inference rather than a demonstrated fact. What IS well established sits right next to it: acting for reasons you own yourself sustains behaviour better than acting under pressure.',
    src:'Paraphrased from ACT (Hayes and colleagues) for the values-versus-goals distinction, and self-determination theory (Deci & Ryan) for the autonomy point.',
    live:'Sort my values', act:'openValuesSort()' },

  { id:'activation', ic:'\uD83D\uDC5F', t:'Action comes first', st:'The strongest-evidenced idea on this list',
    idea:[
      'Low mood shrinks your world. You do less, so less good happens, so you feel worse, so you do even less. It is a spiral with a very simple mechanism \u2014 which is good news, because simple mechanisms can be interrupted from the outside.',
      'You interrupt it by doing, not by feeling. Not the whole thing \u2014 one specific, small, scheduled, real action. Not \u201cget my life together.\u201d \u201cWalk to the end of the road at four.\u201d The motivation shows up afterwards, if it shows up at all, and you don\u2019t need it either way.',
      'This is the least glamorous idea in the toolkit and it has the best track record.'],
    ex:'Sunday, 4pm, flat. Nothing done, so nothing feels worth starting, and the day is quietly writing itself off. Behavioural activation says: don\u2019t fix the mood, fix the afternoon. Shoes on, ten minutes outside, phone in your pocket. You won\u2019t feel better at minute one. Often you do by minute seven.',
    prac:'Pick the two-minute version of one thing you\u2019ve been putting off. Two minutes, specific, and now \u2014 then put me down and go and do it. That is the entire technique.',
    pracBtn:'Give me one real thing', pracFn:'_letGoAct',
    ev:'Behavioural activation is the strongest-evidenced thing on this list. In several good trials, including a large non-inferiority trial, it performs about as well as full cognitive behavioural therapy for depression, while being simpler to deliver. That is a big claim and it holds up. It is evidenced for low mood and depression specifically \u2014 a good bet for a flat day, not a cure for everything.',
    src:'Paraphrased from behavioural activation research: Lewinsohn\u2019s original model, Jacobson\u2019s component study, the Ekers meta-analysis, and the COBRA non-inferiority trial.',
    live:'', act:'' },

  { id:'halt', ic:'\uD83C\uDF7D', t:'The need under the urge', st:'Hungry, angry, lonely, tired \u2014 and the honest caveat',
    idea:[
      'A lot of urges are not really about the thing. They are an unmet need arriving in the only costume it knows. Four candidates cover most of it: hungry, angry, lonely, tired.',
      'Check them before you reach for any technique \u2014 because if you\u2019re running on no food and no sleep and you\u2019ve spoken to nobody all day, no clever exercise is going to hold. You are not weak in that state. You are depleted, which is a different problem with a different fix.',
      'Meet the need and the urge often deflates on its own, without a fight.'],
    ex:'11pm, the pull is enormous, and you\u2019re gearing up for a battle of willpower. Then you notice: you last ate at one, you haven\u2019t spoken to anyone since work, and you\u2019re exhausted. That isn\u2019t a moral crisis. That\u2019s a sandwich, a message to one person, and bed \u2014 and the urge usually leaves with them.',
    prac:'Run the four now, honestly, even though nothing is happening. Whichever one is already true today is the one that will be true at 11pm.',
    pracBtn:'Run the four', pracFn:'openHALT',
    ev:'Be straight about this one: HALT is a mnemonic out of recovery practice, not a tested intervention \u2014 nobody has run a trial on the acronym and it would be strange to. The pieces underneath it do have support: sleep loss and hunger measurably degrade self-control, and loneliness and negative mood are among the better-established predictors of relapse. So \u2014 useful checklist, borrowed authority. Judge it on whether it helps you.',
    src:'HALT comes from twelve-step and wider recovery practice; the supporting pieces come from self-regulation and relapse-prediction research.',
    live:'', act:'' }
];
const _TK_NOT_THERAPY = 'These are skills, not treatment. A skill can carry a hard hour; it cannot carry everything, and nobody\u2019s suffering continues because they haven\u2019t learned a technique yet. If what you\u2019re facing is bigger than an hour, that deserves a real person, not a better exercise.';
const _TK_FAITH = { // Only the compassion lesson, only when faith is full. Faith full, never forced.
  christianity:'The theological version is older than the psychology: grace is not a wage you earn by being hard enough on yourself. If you\u2019d accept mercy from God, it\u2019s strange to refuse it from yourself.',
  islam:'The older version: Allah is Ar-Rahman, the Most Merciful \u2014 and that mercy is not less available to you than to anyone else. Harshness with yourself is not a form of piety.',
  hinduism:'The older version: act without clinging to the fruit of the act. Self-punishment is only another kind of clinging \u2014 to an outcome you already missed.',
  buddhism:'The older version: metta begins with yourself, and not as a warm-up. Cruelty aimed inward is still cruelty, and it still produces suffering.',
  secular:'' };
function _tkStore(){ try{ const o=ls('totry_toolkit'); return (o&&typeof o==='object')?o:{}; }catch(_){ return {}; } }
function _tkSeen(id){ try{ const s=_tkStore().seen||{}; return !!s[id]; }catch(_){ return false; } }
function _tkMark(id){ try{ const o=_tkStore(); o.seen=o.seen||{}; o.seen[id]=new Date().toISOString(); ls('totry_toolkit',o); if(typeof syncToCloud==='function') syncToCloud(); }catch(_){} }
function _tkLesson(id){ for(let i=0;i<_TOOLKIT.length;i++){ if(_TOOLKIT[i].id===id) return _TOOLKIT[i]; } return null; }
// Which one to point at first — integration, not a curriculum. A fresh reset means the slip-to-night
// lesson is the one that would actually have helped; otherwise the oldest one they haven't picked up.
function _tkSuggest(){
  try{
    if(typeof loadV==='function') loadV();
    const vs=(typeof vices!=='undefined'&&Array.isArray(vices))?vices:[];
    // cleanDays is COMPUTED (viceCleanDays), never a field on the stored vice — reading v.cleanDays
    // here was always undefined, so the abstinence-violation lesson could never be suggested at the
    // one moment it exists for: the two days after a slip.
    const fresh=vs.some(function(v){
      if(!viceIsAbstinence(v) || _tkSeen('ave')) return false;
      if(!(v.startDate || v.lastLoss)) return false;   // never reset = not fresh, just new
      const cd=(typeof viceCleanDays==='function')?viceCleanDays(v):null;
      return cd!=null && cd<=2;
    });
    if(fresh) return 'ave';
    for(let i=0;i<_TOOLKIT.length;i++){ if(!_tkSeen(_TOOLKIT[i].id)) return _TOOLKIT[i].id; }
  }catch(_){}
  return '';
}
function openToolkit(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const sug=_tkSuggest();
  const myLine=(_tkStore().myLine||'').trim();
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="max-height:90vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.3;margin-bottom:6px">The tools I use with you.</div>'+
    '<div style="text-align:center;font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:14px">Two minutes each. Learn one somewhere calm and it works far better at 11pm, because you\u2019ll recognise it. Nothing to finish here \u2014 no streak, no score. Pick one up and put me down.</div>'+
    (myLine?'<div style="background:rgba(200,169,110,0.08);border:1px solid var(--go-bd);border-radius:12px;padding:11px 13px;margin-bottom:12px"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:5px">The sentence you told me about</div><div style="font-size:13px;color:var(--tx);line-height:1.55;font-style:italic">\u201c'+_escFew(myLine)+'\u201d</div></div>':'')+
    _TOOLKIT.map(function(l){
      const hi=(l.id===sug);
      return '<button class="btn" onclick="openLesson(\''+l.id+'\')" style="text-align:left;margin-bottom:8px;padding:13px;background:'+(hi?'rgba(200,169,110,0.10)':'var(--bg3)')+';border:1px solid '+(hi?'var(--go-bd)':'var(--bd)')+';display:block;width:100%">'+
        (hi?'<div style="font-family:DM Mono,monospace;font-size:8.5px;color:var(--go);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:5px">Maybe start here</div>':'')+
        '<div style="font-size:14px;color:var(--tx);margin-bottom:3px">'+l.ic+'&nbsp;&nbsp;'+l.t+'</div>'+
        '<div style="font-size:12px;color:var(--tx3);line-height:1.5">'+l.st+'</div></button>';
    }).join('')+
    '<div style="font-size:11.5px;color:var(--tx3);line-height:1.65;margin:10px 0 12px;text-align:left">'+_TK_NOT_THERAPY+'</div>'+
    '<button class="btn" onclick="closeModal(this);if(typeof bridgeToRealHelp===\'function\')bridgeToRealHelp(\'heavy\')" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px;margin-bottom:8px">\uD83E\uDD1D This is bigger than a skill \u2014 point me to real help</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin:0">Close</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
  try{ if(typeof logEvent==='function') logEvent('toolkit_open'); }catch(_){}
}
function openLesson(id){
  const l=_tkLesson(id); if(!l) return;
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const again=_tkSeen(id);
  const faithOn=(typeof faithLevel!=='function')||faithLevel()!=='light';
  const tr=(typeof faithTradition==='function')?faithTradition():'secular';
  const fLine=(id==='compassion'&&faithOn)?(_TK_FAITH[tr]||''):'';
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="max-height:90vh;overflow-y:auto">'+
    '<div class="modal-handle"></div>'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.13em;text-transform:uppercase;margin-bottom:7px">'+l.ic+'&nbsp; about 2 minutes</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:25px;color:var(--tx);line-height:1.25;margin-bottom:12px">'+l.t+'</div>'+
    (again?'<div style="font-size:11.5px;color:var(--tx3);line-height:1.55;margin-bottom:12px;font-style:italic">You\u2019ve picked this one up before. Good \u2014 repetition is how a skill stops being information and starts being a reflex.</div>':'')+
    l.idea.map(function(p){ return '<div style="font-size:14px;color:var(--tx2);line-height:1.75;margin-bottom:12px">'+p+'</div>'; }).join('')+
    (fLine?'<div style="font-size:13.5px;color:var(--tx2);line-height:1.75;margin-bottom:12px;padding-left:11px;border-left:2px solid var(--go-bd)">'+fLine+'</div>':'')+
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:13px 14px;margin:4px 0 14px">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);letter-spacing:0.13em;text-transform:uppercase;margin-bottom:6px">What it looks like</div>'+
      '<div style="font-size:13px;color:var(--tx2);line-height:1.7">'+l.ex+'</div></div>'+
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:13px 14px;margin-bottom:14px">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);letter-spacing:0.13em;text-transform:uppercase;margin-bottom:6px">What it\u2019s honestly evidenced for</div>'+
      '<div style="font-size:12.5px;color:var(--tx2);line-height:1.7;margin-bottom:8px">'+l.ev+'</div>'+
      '<div style="font-size:11px;color:var(--tx3);line-height:1.6">Where it comes from: '+l.src+' The wording, the example and the practice here are the app\u2019s own.</div></div>'+
    '<button class="btn primary" onclick="_tkPractice(\''+l.id+'\')" style="margin-bottom:8px">Try the practice \u2014 one minute</button>'+
    // A person can land straight in a lesson without passing the index, so the honest limit travels
    // with the lesson rather than living only on the shelf it came from.
    '<div style="font-size:11px;color:var(--tx3);line-height:1.6;margin:2px 0 10px;text-align:left">A skill, not treatment \u2014 and nobody\u2019s suffering continues because they haven\u2019t learned one yet. If this is bigger than an hour, <a href="#" onclick="event.preventDefault();closeModal(this);if(typeof openRecoveryBridge===\'function\')openRecoveryBridge()" style="color:var(--go);text-decoration:none">that deserves a real person</a>.</div>'+
    '<button class="btn" onclick="closeModal(this);openToolkit()" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin:0">Back to the toolkit</button>'+
  '</div>';
  document.body.appendChild(m);
  try{ m.querySelector('.modal').scrollTop=0; }catch(_){}
  if(typeof haptic==='function') haptic('tap');
  try{ if(typeof logEvent==='function') logEvent('lesson_open'); }catch(_){}
}
function _tkPractice(id){
  const l=_tkLesson(id); if(!l) return;
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  // Two lessons hand straight to a tool that already exists rather than describing one.
  if(l.pracFn==='_tkMyLine'){ _tkMyLine(); return; }
  if(l.pracFn==='openHALT' || l.pracFn==='_letGoAct'){ _tkMark(id); try{ window[l.pracFn](); }catch(_){} return; }
  const yourVal=(id==='values'&&typeof getValues==='function')?getValues():null;
  const valLine=(yourVal&&yourVal.v&&yourVal.v.length)?'<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:14px">You already told me one of yours: <span style="color:var(--go)">'+_escFew(yourVal.v[0])+'</span>. Start there.</div>':'';
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center;max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.13em;text-transform:uppercase;margin-bottom:8px">One tiny practice \u2014 now</div>'+
    '<div style="font-size:14.5px;color:var(--tx);line-height:1.75;margin-bottom:14px;text-align:left">'+l.prac+'</div>'+
    valLine+
    '<button class="btn primary" onclick="_tkDone(\''+l.id+'\')" style="margin-bottom:8px">'+(l.pracBtn||'Done')+'</button>'+
    (l.live?'<button class="btn" onclick="_tkMark(\''+l.id+'\');closeModal(this);'+l.act+'" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px;margin-bottom:8px">'+l.live+'</button>':'')+
    '<button class="btn" onclick="closeModal(this);openLesson(\''+l.id+'\')" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin:0">Back to the lesson</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}
// The person's own permission-giving sentence, in their words — the single most useful thing they can
// hand the app from a calm moment. Stored locally, shown back at the top of the toolkit.
function _tkMyLine(){
  if(typeof openFormModal!=='function'){ _tkDone('reframe'); return; }
  const cur=(_tkStore().myLine||'');
  openFormModal('The sentence it uses on you','Not the tidy version \u2014 the real one. \u201cJust once.\u201d \u201cI\u2019ve earned this.\u201d \u201cToday\u2019s already gone.\u201d I\u2019ll keep it and say it back when it turns up.',
    [{id:'line',label:'In your own words',type:'text',value:cur,placeholder:'e.g. I\u2019ve had a hard week, I deserve it'}],
    'Keep it',
    function(vals){
      const t=(vals.line||'').trim(); if(!t) return 'Just write the sentence \u2014 however it actually sounds.';
      try{ const o=_tkStore(); o.myLine=t.slice(0,180); ls('totry_toolkit',o); if(typeof syncToCloud==='function') syncToCloud(); }catch(_){}
      setTimeout(function(){ _tkDone('reframe'); },200);
      return true;
    });
}
// Every lesson ends the same way every other exit in this app ends: off the phone.
function _tkDone(id){
  const l=_tkLesson(id);
  _tkMark(id);
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  if(typeof haptic==='function') haptic('success');
  try{ if(typeof logEvent==='function') logEvent('lesson_done'); }catch(_){}
  const did='You learned '+((l&&l.t)?l.t.charAt(0).toLowerCase()+l.t.slice(1):'a skill')+' while nothing was going wrong \u2014 which is the only time anybody ever really learns anything. It\u2019ll be there when you need it.';
  if(typeof theRelease==='function') theRelease({did:did});
  else if(typeof showToast==='function') showToast('Picked up','It\u2019ll be there when you need it.');
}

// ════ HALT — the 4-tap check before the urge tools ════
// Hungry / Angry / Lonely / Tired. Half of all relapses trace to a negative state or a conflict, and
// an urge is very often a real need wearing a disguise. This is the single best fit for a whole-life
// app: every answer resolves INSIDE the app's own pillars — food, grounding, the person you love,
// rest — instead of being generic advice. Meet the need and the urge often loses its grip on its own.
const _HALT = [
  { k:'h', icon:'🍽', label:'Hungry', sub:'or just running on empty',
    line:'Then that’s the first thing. An empty tank makes everything harder to hold — cravings included. Eat something real before you fight anything.',
    cta:'Go log something to eat', act:"go('nourish')" },
  { k:'a', icon:'🔥', label:'Angry', sub:'wound up, something’s sitting badly',
    line:'Anger is energy with nowhere to go, and it will happily take the nearest exit. Cool the heat first — then decide anything.',
    cta:'Cool it down — 1 min', act:"openBreath('cool',{reason:'halt'})" },
  { k:'l', icon:'🫂', label:'Lonely', sub:'disconnected, on your own with it',
    line:'This one matters most. Isolation feeds the urge and contact starves it — reaching one real person does more here than any technique.',
    cta:'Reach someone', act:"_reachOneNow()" },
  { k:'t', icon:'😴', label:'Tired', sub:'wrung out, no fuel left',
    line:'Then this isn’t a character problem, it’s a battery problem. Willpower is thinnest when you’re depleted — go gentle and get horizontal earlier than you think.',
    cta:'Wind down', act:"openBreath('sleep',{reason:'halt'})" }
];
function openHALT(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center;max-height:88vh;overflow-y:auto">'+
    '<div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.3;margin-bottom:6px">Before anything else — what’s actually going on?</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:16px">An urge is often a different need wearing a disguise. Pick whichever is truest right now. More than one can be.</div>'+
    _HALT.map(function(h){ return '<button class="btn" onclick="_haltPick(\''+h.k+'\')" style="text-align:left;margin-bottom:8px;padding:13px;background:var(--bg3);border:1px solid var(--bd)">'+
      '<div style="font-size:14px;color:var(--tx)">'+h.icon+'&nbsp;&nbsp;'+h.label+'</div>'+
      '<div style="font-size:11.5px;color:var(--tx3);margin-left:26px">'+h.sub+'</div></button>'; }).join('')+
    '<button class="btn" onclick="closeModal(this);openCompanionForUrge()" style="background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12.5px;margin-top:2px">None of these — just stay with me</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}
function _haltPick(k){
  const h=_HALT.find(function(x){ return x.k===k; }); if(!h) return;
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center">'+
    '<div style="font-size:28px;margin-bottom:8px">'+h.icon+'</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);margin-bottom:10px">'+h.label+'.</div>'+
    '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:18px">'+h.line+'</div>'+
    '<button class="btn primary" style="margin-bottom:8px" onclick="closeModal(this);'+h.act+'">'+h.cta+'</button>'+
    '<button class="btn" onclick="closeModal(this);openCompanionForUrge()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px;margin-bottom:8px">Stay with me instead</button>'+
    '<button class="btn" onclick="closeModal(this);openHALT()" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Back</button>'+
    '<button class="btn" onclick="closeModal(this);openServiceExit()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);margin-bottom:8px;font-size:13px">\u{1F91D} Do something for someone else instead</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}

// ════ CAN'T START — the frozen door ════
// Task-initiation paralysis is not avoidance and doesn't read as "avoiding" to the person stuck in it.
// The block is emotional (the residue of every past failure), so the move is to shrink the thing until
// it's too small to trigger it, then start a VISIBLE two minutes. Written for anyone having a low-
// capacity day; it happens to name exactly how an ADHD brain gets stuck, without diagnosing anyone.
function openCantStart(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  if(typeof openFormModal==='function'){
    openFormModal('What can’t you start?','Name it in a few words. Naming it is already the first inch.',
      [{id:'thing',label:'',type:'text',placeholder:'e.g. the assignment, the washing, the call'}],'Make it smaller',
      function(vals){
        const t=(vals.thing||'').trim(); if(!t) return 'Just name it — messy is fine.';
        setTimeout(function(){ _shrinkIt(t, 0); }, 220);
        return true;
      });
  }
}
const _SHRINK = [
  function(t){ return 'Do the smallest visible piece of “'+t+'” — just enough that it’s started.'; },
  function(t){ return 'Smaller: open it. Put the file, the page or the app on your screen and nothing else.'; },
  function(t){ return 'Smaller still: stand up and put one object where it needs to be. That’s it.'; },
  function(t){ return 'Then just this: sit where you’d do it, for two minutes, doing nothing. Starting is allowed to be that small.'; }
];
function _shrinkIt(thing, level){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const lv=Math.min(level, _SHRINK.length-1);
  const safe=_jsAttr(thing);         // for the onclick attribute
  const shown=_escFew(thing);        // for display
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center">'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px">Two minutes. That’s the whole ask.</div>'+
    '<div style="font-size:14px;color:var(--tx);line-height:1.65;margin-bottom:16px">'+_SHRINK[lv](shown)+'</div>'+
    '<button class="btn primary" style="margin-bottom:8px" onclick="closeModal(this);_startTwoMin(\''+safe+'\')">Start two minutes</button>'+
    (lv < _SHRINK.length-1
      ? '<button class="btn" onclick="closeModal(this);_shrinkIt(\''+safe+'\','+(lv+1)+')" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px;margin-bottom:8px">Still too big — make it smaller</button>'
      : '<div style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin-bottom:10px">If even that’s too much today, that’s information about your capacity, not your character. Rest counts.</div>')+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}
// A visible countdown — time-blindness means an abstract "two minutes" isn't real until you can see
// it draining. It ends by handing them back to their life, not to another screen.
function _startTwoMin(thing, round){
  // TIER 3.4 — BODY DOUBLING. This used to be a solo countdown: a clock, and you alone with it. The
  // thing that actually makes body doubling work is not the timer, it is that someone is THERE — which
  // is the one thing an app can genuinely offer at 9pm when nobody else is awake.
  //
  // So the sibling stays present through the two minutes and says three things, spaced out, then asks
  // once whether you are still going. Deliberately small:
  //   · The lines are pre-written and local. No network, no AI, nothing to wait for at the moment of
  //     starting — a spinner here would break the exact thing being built.
  //   · ONE extension only. Body doubling is a push-off, not a place to live; an infinite "keep going"
  //     loop would be the dependence CLAUDE.md forbids.
  //   · It ends in theRelease(), off the phone, like every other real exit here.
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  document.querySelectorAll('.tm-overlay').forEach(function(o){ o.remove(); });
  const r = round || 1;
  const ov=document.createElement('div');
  ov.className='tm-overlay';
  ov.style.cssText='position:fixed;inset:0;z-index:9500;background:radial-gradient(circle at 50% 40%,#141810,#09090c 72%);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px';
  ov.innerHTML='<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:16px">'+(r>1?'Still with you':'Starting together')+'</div>'+
    '<div class="tm-clock stat-num" style="font-size:54px;color:var(--tx);margin-bottom:14px">2:00</div>'+
    '<div class="tm-say" style="font-family:Cormorant Garamond,serif;font-size:17px;font-style:italic;color:var(--tx2);line-height:1.6;max-width:320px;min-height:76px;margin-bottom:20px;transition:opacity 0.4s ease">I’m here. You don’t have to do it well — just do it while I’m sitting with you.</div>'+
    '<button class="btn tm-done" style="max-width:220px">I’m going / done</button>';
  document.body.appendChild(ov);

  // Presence, spaced out. Silence between them is the point — this is company, not commentary.
  const SAY = [
    'I’m here. You don’t have to do it well — just do it while I’m sitting with you.',
    'Still here. Whatever you have done so far is more than the version of tonight where you did not start.',
    'Nearly. Do not tidy it, do not restart it — just keep your hands on it.'
  ];
  const say = ov.querySelector('.tm-say');
  const setSay = function(i){
    if(!say || !SAY[i]) return;
    say.style.opacity='0';
    setTimeout(function(){ say.textContent = SAY[i]; say.style.opacity='1'; }, 380);
  };
  const t1=setTimeout(function(){ setSay(1); }, 45000);
  const t2=setTimeout(function(){ setSay(2); }, 95000);

  let left=120;
  const clock=ov.querySelector('.tm-clock');
  const tick=setInterval(function(){
    left--;
    if(clock) clock.textContent = Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
    if(left<=0){
      clearInterval(tick);
      if(clock) clock.textContent='done';
      try{ if(typeof haptic==='function') haptic('celebrate'); }catch(_){}
      _twoMinCheckIn(ov, thing, r);
    }
  }, 1000);

  const cleanup=function(){ clearInterval(tick); clearTimeout(t1); clearTimeout(t2); };
  ov.querySelector('.tm-done').onclick=function(){
    cleanup(); ov.remove();
    if(typeof logEvent==='function') logEvent('two_min_done');
    theRelease({did:'You started the thing you couldn’t start. That’s the hardest part, and it’s behind you.'});
  };
  ov._cleanup = cleanup;
  if(typeof haptic==='function') haptic('tap');
}
// The check-in. Asked ONCE — a second round is offered only on the first, so this can never become a
// loop that keeps someone on the phone.
function _twoMinCheckIn(ov, thing, round){
  if(!ov || !document.body.contains(ov)) return;
  const canAgain = (round || 1) < 2;
  const say = ov.querySelector('.tm-say');
  if(say) say.textContent = canAgain
    ? 'That’s two minutes. Still going, or is that enough for tonight?'
    : 'That’s four. Whatever happens now, you started — go on without me.';
  const btns = document.createElement('div');
  btns.style.cssText='display:flex;flex-direction:column;gap:8px;width:100%;max-width:240px;margin-top:4px';
  btns.innerHTML =
    (canAgain ? '<button class="btn tm-again" style="background:var(--bg3);border:1px solid var(--bd)">Two more, with me</button>' : '')+
    '<button class="btn primary tm-fin">I’m going / done</button>';
  const old = ov.querySelector('.tm-done'); if(old) old.remove();
  ov.appendChild(btns);
  const again = ov.querySelector('.tm-again');
  if(again) again.onclick=function(){
    if(ov._cleanup) ov._cleanup();
    ov.remove();
    _startTwoMin(thing, (round||1)+1);
  };
  ov.querySelector('.tm-fin').onclick=function(){
    if(ov._cleanup) ov._cleanup();
    ov.remove();
    if(typeof logEvent==='function') logEvent('two_min_done');
    theRelease({did:'You started the thing you couldn’t start. That’s the hardest part, and it’s behind you.'});
  };
}


// ════ LOOK UP — the awe off-ramp ════
// Awe is measurably the inverse of the phone loop: it quiets the same default-mode network that
// rumination and scrolling run on, shrinks the self, and pulls attention outward. The flagship study
// found the whole intervention was ONE instruction — shift your attention outward and let yourself
// be struck by something. So this is deliberately tiny, returns NOTHING to log, and ends with the
// phone in a pocket. Its success is measured by the app being closed. No photo, no streak, no proof.
const _LOOK_UP_PROMPTS = [
  'the sky — whatever it’s doing right now',
  'the biggest tree you can see',
  'the horizon, or as far as your eyes can reach',
  'the moon, or one star if you can find it',
  'clouds — how fast they’re actually moving',
  'a building or hill older than everyone you know'
];
function openLookUp(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const day = (typeof getDayCount==='function') ? getDayCount() : 0;
  const what = _LOOK_UP_PROMPTS[day % _LOOK_UP_PROMPTS.length];
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center">'+
    '<div style="font-size:30px;margin-bottom:10px">🌄</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:25px;color:var(--tx);line-height:1.3;margin-bottom:12px">Go outside and look up.</div>'+
    '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:8px">Phone in your pocket. Step outside, even just the doorway. Find <b style="color:var(--tx)">'+what+'</b> — and actually look at it for a minute.</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:18px">Don’t photograph it. Don’t post it. Nothing to log — I won’t even ask how it went. Something bigger than you, for one minute, is the oldest way there is to get out of your own head.</div>'+
    '<button class="btn primary" onclick="closeModal(this);theRelease({did:\'You went outside and looked up — out of your head, into the world.\'})">I’m going out</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:4px">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}
// Reconnection as an off-ramp: the Release hands you back to your life — and the most valuable thing
// in it is a person. Only ever offered when someone is actually named and not held quietly.
function releaseReachOut(){
  const s=(typeof reachOutSuggestion==='function')?reachOutSuggestion():null;
  if(!s||!s.person) return;
  try{ logReachOut(s.person.name); }catch(_){}
  theRelease({did:'You put the phone down and went to '+String(s.person.name).replace(/</g,'&lt;')+'. That’s the whole point.'});
}

// ════ THE BLESSING — loving-kindness that starts from the people you already carry ════
// The most evidence-backed contemplative practice there is (Fredrickson broaden-and-build; Zeng
// meta-analysis g≈0.39) — and here it is a literal expression of the loved-ones reframe: it SEEDS
// from your few, widens self → loved → stranger → difficult → all, then ends by naming ONE person
// to actually go to. Contemplation into connection, then the Release. Named honestly per path
// (metta is Buddhist; Christians intercede, Muslims make du'a, Hindus hold maitri, and a secular
// person is simply wishing someone well). No timer, no streak, no score, no push to come back.
const BLESS = {
  christianity:{ eyebrow:'INTERCESSION', title:'Praying for people',
    intro:'The oldest work in the Church: holding people before God, one at a time. Not many words \u2014 the same short prayer, for one person, then the next.',
    p:['God, keep {t} safe.','God, give {t} peace.','God, hold {t} in your love.'], me:'me', close:'Amen.' },
  islam:{ eyebrow:'DU\u2019A FOR OTHERS', title:'Du\u2019a for others',
    intro:'It is narrated that when you make du\u2019a for someone in their absence, the angel appointed to you answers: and for you the same. This is that \u2014 one person at a time.',
    p:['O Allah, keep {t} safe.','O Allah, grant {t} ease.','O Allah, be merciful to {t}.'], me:'me', close:'Ameen.' },
  hinduism:{ eyebrow:'MAITRI \u00B7 GOODWILL', title:'Maitri',
    intro:'Maitri is goodwill without conditions \u2014 the steady wish that others be well, whether or not they have earned it today. Say each line slowly.',
    p:['May {t} be free from suffering.','May {t} be at peace.','May {t} be well and happy.'], me:'I',
    close:'Lokah samastah sukhino bhavantu \u2014 may all beings everywhere be happy and free.' },
  buddhism:{ eyebrow:'METTA \u00B7 LOVING-KINDNESS', title:'Metta',
    intro:'Metta is the oldest form of this practice \u2014 training the heart toward goodwill, beginning with yourself and widening until no one is left out. Mean each line as best you can; that is enough.',
    p:['May {t} be safe.','May {t} be at ease.','May {t} be happy and free from suffering.'], me:'I',
    close:'May all beings be happy. May all beings be free.' },
  secular:{ eyebrow:'A COMPASSION PRACTICE', title:'Well-wishing',
    intro:'A simple, well-studied exercise: hold one person in mind and deliberately wish them well. No belief required \u2014 most of the effect lands on you.',
    p:['May {t} be safe.','May {t} be at ease.','May {t} be well.'], me:'I', close:'That\u2019s everyone. Including you.' }
};
const _BLESS_STEPS = [ null,
  { eye:'FIRST, YOURSELF', sub:'You can\u2019t hand out what you won\u2019t take. This is the step people skip \u2014 don\u2019t.' },
  { eye:'SOMEONE YOU LOVE', sub:'One of the people you carry. Picture their face before you start.' },
  { eye:'SOMEONE NEUTRAL', sub:'Someone you barely know \u2014 the person at the till, a neighbour, someone on the train. No story, no history. Just a person.' },
  { eye:'SOMEONE DIFFICULT', sub:'Someone who irritates you \u2014 start small. This is not forgiveness on demand and it is not therapy for what was done to you. If someone hurt you badly, skip them. Skipping is the correct instruction, not a failure.' },
  { eye:'EVERYONE', sub:'Widen it until no one is left out \u2014 including the ones you\u2019ll never meet.' }
];
function _bless(){ return BLESS[(typeof faithTradition==='function')?faithTradition():'secular'] || BLESS.secular; }
function blessLog(){ try{ const a=ls('totry_blessings'); return Array.isArray(a)?a:[]; }catch(_){ return []; } }
function blessLastLine(){
  try{ const l=blessLog(); if(!l.length) return '';
    const d=Math.floor((Date.now()-new Date(l[0].ts).getTime())/86400000);
    return d<=0?'last done today':(d===1?'last done yesterday':'last done '+d+' days ago');
  }catch(_){ return ''; }
}
let _blessS = null;
function openBlessing(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const few=(typeof getYourFew==='function')?getYourFew():[];
  _blessS={ step:0, few:few, lovedIdx:(few.length?0:-1), loved:'', neutral:'', hard:'', reach:'', cands:[] };
  const m=document.createElement('div'); m.className='modal-bg open'; m.id='bless-modal'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center;max-height:88vh;overflow-y:auto"><div class="modal-handle"></div><div id="bless-body"></div></div>';
  document.body.appendChild(m);
  _blessRender();
  try{ if(typeof haptic==='function') haptic('light'); }catch(_){}
}
function _blessTarget(){
  const s=_blessS, f=_bless();
  if(s.step===1) return f.me;
  if(s.step===2){ const p=(s.lovedIdx>=0 && s.few[s.lovedIdx])?s.few[s.lovedIdx]:null; return (p&&p.name)?p.name:(((s.loved||'').trim())||'this person'); }
  if(s.step===3) return ((s.neutral||'').trim())||'this person';
  if(s.step===4) return ((s.hard||'').trim())||'this person';
  return 'everyone';
}
// Phrases substituted with a FUNCTION replacer so a name containing $ can never inject a pattern.
function _blessLines(name, anim){
  const t=_escFew(name);
  return '<div id="bless-lines">'+_bless().p.map(function(l,i){
    const a = anim ? ';animation:fadeUpY .6s ease both;animation-delay:'+(i*0.45)+'s' : '';
    return '<div style="font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);line-height:1.45;margin-bottom:9px'+a+'">'+l.replace(/\{t\}/g, function(){ return t; })+'</div>';
  }).join('')+'</div>';
}
function _blessPicker(){
  const s=_blessS;
  if(s.step===2 && s.few.length){
    const cur=s.few[s.lovedIdx]||{};
    return '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:10px">'+
      s.few.map(function(p,i){ const on=(i===s.lovedIdx);
        return '<button class="btn" style="width:auto;margin:0;padding:6px 11px;font-size:12px;background:'+(on?'var(--go-bg)':'var(--bg3)')+';border:1px solid '+(on?'var(--go-bd)':'var(--bd)')+';color:'+(on?'var(--go)':'var(--tx2)')+'" onclick="_blessPick('+i+')">'+_escFew(p.name)+(yourFewMuted(p)?' <span style="color:var(--tx3);font-size:10px">\u00B7 held quietly</span>':'')+'</button>';
      }).join('')+'</div>'+
      // Held quietly = someone lost, or someone it isn't safe to contact. They can still be blessed.
      (yourFewMuted(cur)?'<div style="font-size:11.5px;color:var(--tx3);line-height:1.55;margin-bottom:10px;font-style:italic">You hold them quietly \u2014 no reminders, ever. You can still wish them well. For someone you\u2019ve lost, this may be the only thing left to give them, and it counts.</div>':'');
  }
  if(s.step>=2 && s.step<=4){
    const v=(s.step===2)?s.loved:(s.step===3?s.neutral:s.hard);
    return '<input type="text" id="bless-in" maxlength="40" value="'+_escFew(v)+'" placeholder="'+(s.step===2?'A name \u2014 anyone you love':'A name, or leave it blank')+'" oninput="_blessTyped(this.value)" style="margin-bottom:12px;text-align:center">';
  }
  return '';
}
function _blessPick(i){ _blessS.lovedIdx=i; try{ if(typeof haptic==='function') haptic('tap'); }catch(_){} _blessRender(); }
// Typing updates the lines in place (no re-render) so the caret is never stolen mid-name.
function _blessTyped(v){
  const s=_blessS; if(!s) return; const val=String(v||'').slice(0,40);
  if(s.step===2){ s.loved=val; s.lovedIdx=-1; } else if(s.step===3){ s.neutral=val; } else if(s.step===4){ s.hard=val; }
  const w=document.getElementById('bless-lines'); if(w) w.outerHTML=_blessLines(_blessTarget(), false);
}
function _blessNext(){ const s=_blessS; if(!s) return; s.step=(s.step===5)?6:s.step+1; try{ if(typeof haptic==='function') haptic('tap'); }catch(_){} _blessRender(); }
function _blessSkipHard(){ const s=_blessS; if(!s) return; s.hard=''; s.step=5; _blessRender(); }
function _blessReach(i){ const s=_blessS; const p=s.cands[i]; if(p){ s.reach=p.name; } _blessRender(); }
function _blessReachTyped(v){ if(_blessS) _blessS.reach=String(v||'').slice(0,40); }
function _blessSave(nm){
  try{ const log=blessLog(); log.unshift({ ts:new Date().toISOString(), reach:String(nm||'').slice(0,40), faith:(typeof faithTradition==='function')?faithTradition():'' }); ls('totry_blessings', log.slice(0,100)); }catch(_){}
  try{ if(typeof haptic==='function') haptic('success'); }catch(_){}
}
function _blessGo(){
  const s=_blessS; const nm=((s&&s.reach)||'').trim();
  if(!nm){ try{ showToast('One name','Just one person. Who is it?'); }catch(_){} return; }
  _blessSave(nm);
  try{ if(typeof logReachOut==='function') logReachOut(nm); }catch(_){}
  if(typeof theRelease==='function') theRelease({did:'You wished them all well \u2014 then you went to '+_escFew(nm)+'. That\u2019s the whole point of it.'});
}
function _blessHold(){
  const s=_blessS; const nm=((s&&s.reach)||'').trim();
  _blessSave(nm);
  if(typeof theRelease==='function') theRelease({did: nm ? ('You held '+_escFew(nm)+' and wished them well. Reach out when you\u2019re ready \u2014 there\u2019s no clock on it.') : 'You wished people well, yourself included. That counts, and nobody needs to know you did it.'});
}
function _blessRender(){
  const b=document.getElementById('bless-body'); if(!b) return;
  const s=_blessS, f=_bless();
  if(s.step===0){
    b.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.14em;margin-bottom:8px">'+f.eyebrow+'</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:27px;color:var(--tx);line-height:1.25;margin-bottom:10px">'+f.title+'</div>'+
      '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:14px">'+f.intro+'</div>'+
      // Honest about what this can and can't do. The app must never claim more than it knows.
      '<div style="font-size:11.5px;color:var(--tx3);line-height:1.6;margin-bottom:16px;font-style:italic">Straight with you: the research here is real but modest \u2014 warmth toward yourself and others lifts over weeks of practice, not in one sitting. It is not a treatment for depression, and it is not a substitute for a real person.</div>'+
      '<button class="btn primary" style="margin-bottom:8px" onclick="_blessNext()">Begin</button>'+
      '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>';
    return;
  }
  if(s.step>=1 && s.step<=5){
    const meta=_BLESS_STEPS[s.step];
    b.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.14em;margin-bottom:10px">'+meta.eye+' \u00B7 '+s.step+' of 5</div>'+
      _blessPicker()+
      '<div style="font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:18px">'+meta.sub+'</div>'+
      _blessLines(_blessTarget(), true)+
      (s.step===5?'<div style="font-family:Cormorant Garamond,serif;font-size:16px;font-style:italic;color:var(--go);line-height:1.5;margin-top:14px">'+f.close+'</div>':'')+
      '<button class="btn primary" style="margin-top:20px;margin-bottom:8px" onclick="_blessNext()">'+(s.step===5?'Done':'Next')+'</button>'+
      (s.step===4
        ? '<button class="btn" onclick="_blessSkipHard()" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Skip this one \u2014 I\u2019m not there</button>'
        : '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Stop here</button>');
    return;
  }
  // ── into connection: contemplation is where this starts, not where it ends ──
  // Muted people are never offered here. They can be blessed; they are never a task.
  s.cands=(s.few||[]).filter(function(p){ return p && !yourFewMuted(p); });
  const chips = s.cands.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:12px">'+
    s.cands.map(function(p,i){ const on=(s.reach===p.name);
      return '<button class="btn" style="width:auto;margin:0;padding:7px 12px;font-size:12.5px;background:'+(on?'var(--go-bg)':'var(--bg3)')+';border:1px solid '+(on?'var(--go-bd)':'var(--bd)')+';color:'+(on?'var(--go)':'var(--tx2)')+'" onclick="_blessReach('+i+')">'+_escFew(p.name)+'</button>';
    }).join('')+'</div>' : '';
  b.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.14em;margin-bottom:8px">INTO CONNECTION</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.3;margin-bottom:8px">Now make one of them real.</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:14px">Wishing someone well is where this starts, not where it ends. Name ONE person you\u2019ll actually reach out to \u2014 today, not one day.</div>'+
    chips+
    '<input type="text" id="bless-reach" maxlength="40" value="'+_escFew(s.reach)+'" placeholder="'+(s.cands.length?'\u2026or someone else':'Who will you reach out to?')+'" oninput="_blessReachTyped(this.value)" style="margin-bottom:14px;text-align:center">'+
    '<button class="btn primary" style="margin-bottom:8px" onclick="_blessGo()">I\u2019m going to them now</button>'+
    '<button class="btn" onclick="_blessHold()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px">Just hold them for now</button>';
}

// ════ WHAT MATTERS — the values card sort ════
// ACT/MI's most-validated single exercise. A person names, in their own words, what their life is
// FOR — then counsel argues from THEIR standard instead of the app's rules. A mirror, never a judge:
// values are never scored, never graded against behaviour, never a streak. Re-sortable any time,
// and the app never nags you to redo it. Universal, faith-neutral set — "Faith / meaning" carries
// both a believer and a secular reading without forcing either.
const VALUES = [
  ['family','Family','The people I come from, and the people I\u2019m building with.'],
  ['love','Love','Loving someone well \u2014 and letting myself be loved.'],
  ['friendship','Friendship','Real friends, kept. Not contacts.'],
  ['health','Health','A body that can do what my life asks of it.'],
  ['faith','Faith / meaning','Something bigger than me that the rest hangs on.'],
  ['honesty','Honesty','The same person in private as in public.'],
  ['discipline','Discipline','Doing it when I don\u2019t feel like it.'],
  ['freedom','Freedom','Not owned \u2014 by debt, by a habit, by anyone.'],
  ['courage','Courage','Doing the frightening thing anyway.'],
  ['kindness','Kindness','Leaving people better than I found them.'],
  ['growth','Growth','Further along than I was.'],
  ['security','Security','Solid ground under me and mine.'],
  ['service','Service','Being useful to people who need it.'],
  ['justice','Justice','Doing right, especially when it costs.'],
  ['humility','Humility','Not needing to be the biggest thing in the room.'],
  ['loyalty','Loyalty','Staying, when staying is hard.'],
  ['peace','Peace of mind','A quiet head. Not braced all the time.'],
  ['independence','Independence','Standing on my own feet.'],
  ['achievement','Achievement','Building something that lasts.'],
  ['learning','Learning','Still curious. Still a student.'],
  ['responsibility','Responsibility','Carrying what\u2019s mine to carry.'],
  ['adventure','Adventure','A life with some wild left in it.'],
  ['creativity','Creativity','Making things that weren\u2019t here before.'],
  ['joy','Joy','Actually enjoying the life I\u2019m working this hard on.']
];
function valLabel(id){ const v=VALUES.find(function(x){ return x[0]===id; }); return v?v[1]:String(id); }
function getValues(){ try{ const o=ls('totry_values'); return (o && Array.isArray(o.v) && o.v.length)?o:null; }catch(_){ return null; } }
function topValue(){ const o=getValues(); return o?valLabel(o.v[0]):null; }
let _vsS=null;
function openValuesSort(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const cur=getValues();
  _vsS={ phase:1, picked: cur?cur.v.slice(0,5):[], why: cur?(cur.why||''):'' };
  const m=document.createElement('div'); m.className='modal-bg open'; m.id='values-modal';
  m.innerHTML='<div class="modal" style="max-height:88vh;overflow-y:auto"><div class="modal-handle"></div><div id="vs-body"></div></div>';
  document.body.appendChild(m); _vsRender();
  try{ if(typeof haptic==='function') haptic('light'); }catch(_){}
}
function _vsToggle(id){
  const s=_vsS; if(!s) return; const i=s.picked.indexOf(id);
  if(i>=0){ s.picked.splice(i,1); }
  else{
    if(s.picked.length>=5){ try{ showToast('That\u2019s five','Five is the point \u2014 it forces the choice. Tap one off to swap it.'); }catch(_){} return; }
    s.picked.push(id);
  }
  try{ if(typeof haptic==='function') haptic('tap'); }catch(_){}
  _vsRender();
}
function _vsMove(i,d){ const p=_vsS.picked, j=i+d; if(j<0||j>=p.length) return; const t=p[i]; p[i]=p[j]; p[j]=t; try{ if(typeof haptic==='function') haptic('tap'); }catch(_){} _vsRender(); }
function _vsPhase(n){
  const s=_vsS; if(!s) return;
  if(n===2 && !s.picked.length){ try{ showToast('Pick a few first','Even one is a start \u2014 tap the ones you\u2019d actually defend.'); }catch(_){} return; }
  try{ const w=document.getElementById('vs-why'); if(w) s.why=w.value; }catch(_){}
  s.phase=n; _vsRender();
}
function _vsSave(){
  const s=_vsS; if(!s||!s.picked.length) return;
  const w=document.getElementById('vs-why');
  try{ ls('totry_values', { v:s.picked.slice(0,5), why:String(w?w.value:(s.why||'')).trim().slice(0,160), ts:new Date().toISOString() }); }catch(_){}
  try{ if(typeof haptic==='function') haptic('success'); }catch(_){}
  try{ showToast('Held','I\u2019ll hold you to your own words, not mine.'); }catch(_){}
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  try{ renderValuesCard(); }catch(_){}
}
function _vsRender(){
  const b=document.getElementById('vs-body'); if(!b) return; const s=_vsS;
  if(s.phase===1){
    b.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.14em;margin-bottom:8px">WHAT MATTERS \u00B7 1 OF 3</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.25;margin-bottom:6px">Pick the five you\u2019d defend.</div>'+
      '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:12px">Not the five that sound good \u2014 the five you\u2019d actually give something up for. There is no right answer here and nothing is scored. Redo it whenever you like.</div>'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.1em;margin-bottom:10px;color:'+(s.picked.length===5?'var(--go)':'var(--tx3)')+'">'+s.picked.length+' of 5 chosen</div>'+
      VALUES.map(function(v){ const on=s.picked.indexOf(v[0])>=0;
        return '<button class="btn" onclick="_vsToggle(\''+v[0]+'\')" style="text-align:left;margin-bottom:6px;padding:11px 12px;background:'+(on?'var(--go-bg)':'var(--bg3)')+';border:1px solid '+(on?'var(--go-bd)':'var(--bd)')+'">'+
          '<div style="font-size:14px;color:'+(on?'var(--go)':'var(--tx)')+'">'+v[1]+'</div>'+
          '<div style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin-top:2px">'+v[2]+'</div></button>';
      }).join('')+
      '<button class="btn primary" style="margin-top:10px;margin-bottom:8px" onclick="_vsPhase(2)">Order them \u203A</button>'+
      '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>';
    return;
  }
  if(s.phase===2){
    b.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.14em;margin-bottom:8px">WHAT MATTERS \u00B7 2 OF 3</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.25;margin-bottom:6px">Now put them in order.</div>'+
      '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:12px">When two of them pull against each other \u2014 and they will \u2014 which one wins? That\u2019s all the order means.</div>'+
      s.picked.map(function(id,i){
        return '<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--bd)">'+
          '<div style="font-family:DM Mono,monospace;font-size:11px;color:var(--go);width:16px">'+(i+1)+'</div>'+
          '<div style="flex:1;min-width:0;font-size:14px;color:var(--tx)">'+valLabel(id)+'</div>'+
          '<button class="btn" style="width:auto;margin:0;padding:5px 10px;font-size:12px" onclick="_vsMove('+i+',-1)">\u25B2</button>'+
          '<button class="btn" style="width:auto;margin:0;padding:5px 10px;font-size:12px" onclick="_vsMove('+i+',1)">\u25BC</button></div>';
      }).join('')+
      '<button class="btn primary" style="margin-top:14px;margin-bottom:8px" onclick="_vsPhase(3)">That\u2019s the order \u203A</button>'+
      '<button class="btn" onclick="_vsPhase(1)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">\u2039 Back to the list</button>';
    return;
  }
  b.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.14em;margin-bottom:8px">WHAT MATTERS \u00B7 3 OF 3</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.3;margin-bottom:6px">'+valLabel(s.picked[0])+' is your first.</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:12px">One line: why that one? This is the sentence I\u2019ll hand back to you when a hard choice comes. Optional \u2014 blank is fine.</div>'+
    '<textarea id="vs-why" maxlength="160" placeholder="e.g. because I\u2019d rather be the person my kids describe than the one they explain" style="min-height:76px;font-size:16px;line-height:1.5;margin-bottom:14px">'+_escFew(s.why)+'</textarea>'+
    '<button class="btn primary" style="margin-bottom:8px" onclick="_vsSave()">Hold me to this</button>'+
    '<button class="btn" onclick="_vsPhase(2)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">\u2039 Back</button>';
}
function renderValuesCard(){
  const el=document.getElementById('values-body'); if(!el) return;
  const o=getValues();
  if(!o){
    el.innerHTML='<p style="font-size:12px;color:var(--tx3);margin-bottom:10px;line-height:1.5">Five words for what your life is actually for. Once you\u2019ve named them, the counsel argues from <em>your</em> standard instead of mine \u2014 and the Feeling Door asks the only question that matters: does the next hour move toward them?</p>'+
      '<button class="btn primary" style="font-size:13px" onclick="openValuesSort()">Sort my values</button>';
    return;
  }
  el.innerHTML='<div style="margin-bottom:10px">'+o.v.map(function(id,i){
      return '<div style="display:flex;align-items:baseline;gap:9px;padding:5px 0">'+
        '<span style="font-family:DM Mono,monospace;font-size:11px;color:var(--go)">'+(i+1)+'</span>'+
        '<span style="font-size:'+(i===0?'16px':'14px')+';color:'+(i===0?'var(--go)':'var(--tx)')+'">'+valLabel(id)+'</span></div>';
    }).join('')+'</div>'+
    (o.why?'<div style="font-family:Cormorant Garamond,serif;font-size:15px;font-style:italic;color:var(--tx2);line-height:1.55;border-left:2px solid var(--go-bd);padding-left:11px;margin-bottom:12px">'+_escFew(o.why)+'</div>':'')+
    '<p style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin-bottom:10px">A mirror, not a scoreboard. Nothing here is ever scored against you \u2014 and values move as life moves. Re-sort whenever it stops being true.</p>'+
    '<button class="btn" style="font-size:13px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)" onclick="openValuesSort()">Re-sort</button>';
}

// ════ BREATH & STILLNESS — the minimum viable work ════
// "Faith without works is dead." When willpower is gone, the one work a person can ALWAYS do is take
// a breath. This is not a modal that TELLS you to breathe — it breathes WITH you, matched to the
// feeling: the pull gets a physiological sigh, anxiety a long slow exhale, a flat day gets energised,
// anger gets cooled, faith carries the Jesus Prayer. Deterministic, brief, evidence-led (full research
// + sources in BREATH-STILLNESS-RESEARCH.md), then it hands you back to your life. No streaks — a
// tool, not a feed. Intense techniques are safety-gated. Optional 0–10 before/after proves it works
// with the person's own data.
const BREATH_PROTOCOLS = {
  settle:   { name:'Settle',        why:'The long exhale that calms the body', cycles:8,
    phases:[ {l:'Breathe in', s:4, scale:1.55}, {l:'Slow out', s:6, scale:1.0} ] },
  sigh:     { name:'Reset',         why:'The fastest way to drop a spike or a craving', cycles:5,
    phases:[ {l:'Breathe in', s:2.4, scale:1.4}, {l:'Sip a little more', s:1.2, scale:1.62}, {l:'Long slow out', s:6.5, scale:1.0} ] },
  box:      { name:'Steady',        why:'Steady the mind before a hard choice', cycles:6,
    phases:[ {l:'Breathe in', s:4, scale:1.55}, {l:'Hold', s:4, scale:1.55}, {l:'Breathe out', s:4, scale:1.0}, {l:'Hold', s:4, scale:1.0} ] },
  cool:     { name:'Cool it',       why:'Take the heat out of anger', cycles:8,
    phases:[ {l:'Cool breath in (through your teeth)', s:4, scale:1.55}, {l:'Slow out through the nose', s:6, scale:1.0} ] },
  sleep:    { name:'Wind down',     why:'For a racing mind at night', cycles:5,
    phases:[ {l:'Breathe in', s:4, scale:1.55}, {l:'Hold', s:7, scale:1.55}, {l:'Long out', s:8, scale:1.0} ] },
  prayer:   { name:'Breath prayer', why:'Carry the Jesus Prayer on your breath', faith:true, cycles:8,
    phases:[ {l:'Lord Jesus Christ, Son of God', s:5, scale:1.55}, {l:'have mercy on me, a sinner', s:6, scale:1.0} ] },
  presence: { name:'Presence',      why:'Wordless stillness', cycles:8,
    phases:[ {l:'Receive', s:4, scale:1.55}, {l:'Let go', s:6, scale:1.0} ] },
  energize: { name:'Lift',          why:'Raise your energy on a flat, numb day', intense:true, cycles:2,
    phases:[ {l:'Fast breaths — follow the orb', s:15, scale:1.5, pulse:true}, {l:'Now rest — slow breath in', s:4, scale:1.55}, {l:'Long out', s:7, scale:1.0} ] },
  surf:     { name:'Ride the wave',  why:'Train the muscle for riding a craving', intense:true, cycles:6,
    done:'That’s the same muscle as riding a craving — sit with the still point enough times, and the next urge moves you less.',
    phases:[ {l:'Breathe in', s:4, scale:1.55}, {l:'Slow out', s:6, scale:1.0}, {l:'Rest on empty — sit with it', s:5, scale:1.0} ] }
};
function _breathFaithOn(){ return (typeof faithLevel!=='function') || faithLevel()!=='light'; }
// THE BREATH PRAYER MUST BE THE PERSON'S OWN TRADITION'S WORDS. Handing a Muslim user "Lord Jesus
// Christ, Son of God" while the card calls it "dhikr carried on your breath" makes the multi-faith
// promise false at the most intimate moment in the app. Same engine, same paced breath — words swap.
// ── THE PULL, MET IN EACH TRADITION'S OWN PRACTICE ─────────────────────────────────────────────
// This is the intervention behind "I'm feeling it right now" — the moment someone is white-knuckling.
// It used to hand EVERY person the Jesus Prayer. Swapping one line per tradition was not enough either:
// each of these traditions has its OWN in-the-moment practice for exactly this, developed over centuries,
// and the practice is the point — the words, the posture, the count. So each tradition gets its real one.
//
// `why` states an honest mechanism and never a false one. Where a claim is clinical it is a real finding
// (paced breathing and the long exhale; affect labelling; urge surfing); where it is a tradition's own
// teaching it is named as that, not dressed up as science.
const _PULL_PRACTICE = {
  christianity: {
    name: 'The Jesus Prayer',
    line: "Lord Jesus Christ, Son of God, have mercy on me, a sinner.",
    how:  "Hand on your heart. Say it on each out-breath \u2014 three times, slower than feels natural.",
    why:  "The desert monks used this prayer for this exact moment, and a slow out-breath settles your body while the words take your attention off the pull."
  },
  islam: {
    name: "Ta\u02BFawwudh, then istighf\u0101r",
    line: "A\u02BF\u016Bdhu bill\u0101hi min ash-shay\u1E6D\u0101n \u2014 Astaghfirull\u0101h.",
    how:  "Seek refuge once, then Astaghfirull\u0101h three times. Then change your position: if you are standing, sit; if you are sitting, lie down. Make wu\u1E0D\u016B\u02BE if you can.",
    why:  "The Prophet \uFDFA taught changing your posture and seeking refuge when something rises in you. Moving your body genuinely interrupts the moment, and the words turn you back to All\u0101h."
  },
  hinduism: {
    name: "Japa, and the witness",
    line: "So\u2019ham \u2014 I am That.",
    how:  "Repeat it with the breath eleven times, counting on your fingers. Then watch the urge as something moving through you \u2014 not as you.",
    why:  "Japa gives a restless mind one thing to hold. Watching as the witness (s\u0101k\u1E63\u012B) puts space between you and the craving: it is happening in you, it is not you."
  },
  buddhism: {
    name: "Noting, and the breath",
    line: "This is craving. It arose, and it will pass.",
    how:  "Name it once, out loud \u2014 \u201Ccraving\u201D. Then follow three full breaths, feeling where it sits in your body without pushing it away.",
    why:  "Naming what is present loosens its grip (labelling an emotion measurably lowers its intensity), and watching it change is seeing anicca directly. Modern urge-surfing is this practice, borrowed."
  },
  secular: {
    name: "Urge surfing",
    line: "This is a wave. I can feel it without riding it.",
    how:  "Two short breaths in through your nose, one long breath out. Three rounds. Then describe the urge to yourself: where it sits, how strong, rising or falling.",
    why:  "The double inhale with a long exhale drops your heart rate faster than deep breathing does. Tracking an urge instead of fighting it is urge surfing \u2014 it peaks and falls, usually within minutes."
  }
};
function _fnPractice(){
  const t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
  return _PULL_PRACTICE[t] || _PULL_PRACTICE.secular;
}
const _BREATH_PRAYERS = {
  christianity: { name:'Breath prayer',      why:'Carry the Jesus Prayer on your breath',
                  in:'Lord Jesus Christ, Son of God', out:'have mercy on me, a sinner' },
  islam:        { name:'Dhikr on the breath', why:'Carry the remembrance of Allah on your breath',
                  in:'Lā ilāha',                      out:'illā Allāh' },
  hinduism:     { name:'So’ham',              why:'The mantra already in your breath',
                  in:'So — I am',                     out:'ham — That' },
  buddhism:     { name:'Mindful breath',      why:'Ānāpānasati — awareness carried on the breath',
                  in:'Breathing in, I know I am breathing in', out:'Breathing out, I am at peace' },
  secular:      { name:'Presence',            why:'Wordless stillness',
                  in:'Receive',                       out:'Let go' }
};
function _faithBreath(){
  const t = (typeof faithTradition==='function') ? faithTradition() : 'secular';
  return _BREATH_PRAYERS[t] || _BREATH_PRAYERS.christianity;
}
// Resolve a protocol, swapping the prayer's words for the person's tradition.
function _protoFor(id){
  const base = BREATH_PROTOCOLS[id];
  if(id !== 'prayer' || !base) return base;
  const f = _faithBreath();
  return Object.assign({}, base, { name:f.name, why:f.why,
    phases:[ {l:f.in, s:5, scale:1.55}, {l:f.out, s:6, scale:1.0} ] });
}
function _breathScale(el, v, dur){ if(!el) return; el.style.transitionDuration=dur+'s'; el.style.transform='scale('+v+')'; }
function _breathLog(entry){ try{ const log=ls('totry_breath_log')||[]; log.unshift(Object.assign({ts:Date.now()},entry)); ls('totry_breath_log', log.slice(0,200)); }catch(_){} }
function _breathSafetyGate(cb){
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center">'+
    '<div style="font-size:30px;margin-bottom:8px">⚠️</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);margin-bottom:10px">One quick check</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:16px">This one is more intense — fast breathing. <b style="color:var(--tx)">Skip it</b> if you’re pregnant, have heart, blood-pressure or breathing conditions, or get panic attacks. Never do it while driving or in water. Sit down first, and stop if you feel dizzy.</div>'+
    '<button class="btn primary" id="b-safe-ok" style="margin-bottom:8px">I understand — continue</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  m.querySelector('#b-safe-ok').onclick=()=>{ try{ ls('totry_breath_intense_ok',true); }catch(_){} m.remove(); if(typeof cb==='function') cb(); };
}
function openBreathMenu(){
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  const ids = ['settle','sigh','box','cool','sleep', _breathFaithOn()?'prayer':'presence','energize','surf'];
  const mw = ls('totry_mindful_week')||0;
  const mindfulLine = (mw>0) ? '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);letter-spacing:0.06em;margin-bottom:14px">'+mw+' min of stillness this week · across all your apps</div>' : '';
  const _pf = _breathProof();
  const proofLine = (_pf && _pf.n>0) ? '<div style="font-size:12px;color:var(--tx2);line-height:1.5;margin-bottom:14px;font-style:italic">Breathing brought the wave down '+_pf.n+' of your last '+_pf.m+' times.</div>' : '';
  let html='<div class="modal" style="text-align:center"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);margin-bottom:4px">Take a breath</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:'+((mw>0||proofLine)?'10px':'16px')+'">The one work you can always do. Pick what fits right now.</div>'+mindfulLine+proofLine;
  ids.forEach(id=>{ const p=_protoFor(id); html+=
    '<button class="btn" onclick="closeModal(this);openBreath(\''+id+'\')" style="text-align:left;margin-bottom:8px;padding:12px 14px">'+
      '<div style="font-size:14px;color:var(--tx)">'+p.name+(p.intense?' <span style="color:var(--tx3);font-size:10px">· intense</span>':'')+'</div>'+
      '<div style="font-size:11.5px;color:var(--tx3)">'+p.why+'</div>'+
    '</button>'; });
  html+='<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:4px">Not now</button></div>';
  m.innerHTML=html; document.body.appendChild(m); if(typeof haptic==='function') haptic('tap');
}
function openBreath(id, opts){
  opts = opts || {};
  const p = _protoFor(id) || BREATH_PROTOCOLS.settle;
  if(p.intense && !ls('totry_breath_intense_ok')){ _breathSafetyGate(()=>openBreath(id, opts)); return; }
  const reason = opts.reason || null;
  const ov=document.createElement('div'); ov.className='breath-overlay';
  ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
  ov.setAttribute('aria-label','Guided breathing'); ov.setAttribute('tabindex','-1');
  ov.style.cssText='position:fixed;inset:0;z-index:9500;background:radial-gradient(circle at 50% 40%,#151a28,#09090c 72%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:26px;text-align:center;color:var(--tx)';
  ov.innerHTML=
    // top:14px put this behind the notch / Dynamic Island on every modern iPhone — on the breathing
    // screen, which is exactly where someone arrives mid-panic and most needs a way out. Respect the safe
    // area, and give it a 44x44 target while we are here.
    '<button class="b-x" aria-label="Close" style="position:absolute;top:calc(env(safe-area-inset-top, 0px) + 10px);right:10px;background:none;border:none;color:var(--tx3);font-size:28px;line-height:1;cursor:pointer;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center">×</button>'+
    '<div class="b-pre" style="display:none;max-width:340px">'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:24px;margin-bottom:6px">Before we begin</div>'+
      '<div style="font-size:13.5px;color:var(--tx2);line-height:1.6;margin-bottom:18px">How strong is it right now? <span style="color:var(--tx3)">0 is gone, 10 is overwhelming.</span></div>'+
      '<div class="b-scale" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:16px"></div>'+
      '<button class="b-skip" style="background:transparent;border:none;color:var(--tx3);font-size:12px;cursor:pointer">Skip — just breathe</button>'+
    '</div>'+
    '<div class="b-run" style="display:none;flex-direction:column;align-items:center">'+
      '<div class="b-name" style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--tx3);margin-bottom:26px"></div>'+
      '<div style="width:220px;height:220px;display:flex;align-items:center;justify-content:center;margin-bottom:26px">'+
        '<div class="b-orb" style="width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(200,169,110,0.92),rgba(200,169,110,0.22));box-shadow:0 0 60px rgba(200,169,110,0.35);transform:scale(1);transition:transform 4s ease-in-out"></div>'+
      '</div>'+
      '<div class="b-phase" role="status" aria-live="assertive" aria-atomic="true" style="font-family:Cormorant Garamond,serif;font-size:26px;min-height:36px;line-height:1.3;max-width:360px"></div>'+
      '<div class="b-count" role="status" aria-live="polite" aria-atomic="true" style="font-family:DM Mono,monospace;font-size:11px;color:var(--tx3);margin-top:16px;min-height:14px"></div>'+
      '<button class="b-change" style="margin-top:22px;background:none;border:1px solid var(--bd);border-radius:20px;color:var(--tx3);font-size:12px;padding:7px 16px;cursor:pointer">Change breath</button>'+
    '</div>'+
    '<div class="b-post" style="display:none;max-width:340px">'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:24px;margin-bottom:6px">And now?</div>'+
      '<div style="font-size:13.5px;color:var(--tx2);line-height:1.6;margin-bottom:18px">Same scale — where is it now?</div>'+
      '<div class="b-scale2" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:16px"></div>'+
    '</div>'+
    '<div class="b-done" style="display:none;max-width:360px">'+
      '<div class="b-done-msg" style="font-family:Cormorant Garamond,serif;font-size:25px;line-height:1.3;margin-bottom:20px"></div>'+
      '<div class="b-done-more" style="display:none;margin:0 auto 10px;max-width:240px"></div>'+
      '<button class="btn primary b-done-btn" style="max-width:240px;margin:0 auto">I’m ready</button>'+
    '</div>';
  document.body.appendChild(ov);
  try{ ov.focus({preventScroll:true}); }catch(_){}
  const q=(s)=>ov.querySelector(s);
  const state={alive:true, timer:null, pulse:null, cycle:0, pi:0, before:null, after:null};
  function cleanup(){ state.alive=false; if(state.timer){clearTimeout(state.timer);state.timer=null;} if(state.pulse){clearInterval(state.pulse);state.pulse=null;} }
  function close(){ cleanup(); ov.remove(); if(opts && typeof opts.onClose==='function'){ const cb=opts.onClose; opts.onClose=null; try{ cb(); }catch(_){} } }
  q('.b-x').onclick=close;
  q('.b-change').onclick=()=>{ cleanup(); ov.remove(); openBreathMenu(); };
  function show(sec){ ['.b-pre','.b-run','.b-post','.b-done'].forEach(s=>{ const e=q(s); if(e) e.style.display=(s===sec)?(s==='.b-run'?'flex':'block'):'none'; }); }
  function buildScale(container, cb){ if(!container) return; container.innerHTML=''; for(let n=0;n<=10;n++){ const b=document.createElement('button'); b.textContent=n; b.style.cssText='width:26px;height:34px;border-radius:8px;border:1px solid var(--bd);background:var(--bg3);color:var(--tx2);font-size:13px;cursor:pointer'; b.onclick=()=>cb(n); container.appendChild(b); } }
  function startBreathing(){
    show('.b-run');
    const orb=q('.b-orb'), phaseEl=q('.b-phase'), countEl=q('.b-count');
    q('.b-name').textContent=p.name;
    state.cycle=0; state.pi=0;
    function doneMsg(){ show('.b-done'); q('.b-done-msg').textContent = p.done || (_breathFaithOn()?'Rest here a moment. That was a work — small, real, yours.':'Notice how your body feels now. That was one real thing done.'); q('.b-done-btn').onclick=close; try{ if(typeof logEvent==='function') logEvent('breath'); }catch(_){} if(typeof haptic==='function') haptic('tap'); }
    function afterDone(){ show('.b-done'); const d=state.before-state.after; let msg; if(d>=3) msg='From '+state.before+' to '+state.after+'. You just moved it — with nothing but your breath.'; else if(d>0) msg='From '+state.before+' to '+state.after+'. Even a little down is the wave passing. You stayed.'; else msg='Still heavy — and you showed up and did the work anyway. That counts. If it stays high, let a real person in.'; q('.b-done-msg').textContent=msg;
      // This is the escalation branch: the person has just told us, on a 0–10 scale, that a minute of
      // guided breathing did NOT move their distress. Naming the right next step and then offering
      // only a close button leaves them to find it themselves at the worst moment to be asked to.
      const more=q('.b-done-more');
      if(more){
        if(d<=0){
          more.style.display='block';
          more.innerHTML='<button class="btn b-done-bridge" style="width:100%;margin-bottom:8px">Let someone in</button>'+
                         '<button class="btn b-done-stay" style="width:100%;background:none;border-color:var(--bd);color:var(--tx2)">Stay with me a minute</button>';
          const bb=more.querySelector('.b-done-bridge');
          if(bb) bb.onclick=function(){ close(); if(typeof bridgeToRealHelp==='function') bridgeToRealHelp('heavy'); };
          const bs=more.querySelector('.b-done-stay');
          if(bs) bs.onclick=function(){ close(); if(typeof openCompanionForUrge==='function') openCompanionForUrge(); else if(typeof openFeelingDoor==='function') openFeelingDoor(); };
        } else { more.style.display='none'; more.innerHTML=''; }
      }
      q('.b-done-btn').onclick=close; try{ if(typeof logEvent==='function') logEvent('breath'); }catch(_){} }
    function askAfter(){ show('.b-post'); buildScale(q('.b-scale2'), (n)=>{ state.after=n; _breathLog({protocol:id, reason:reason, before:state.before, after:n}); afterDone(); }); }
    function finish(){ cleanup(); _breathScale(orb,1.18,1.6); if(reason && state.before!=null){ askAfter(); return; } doneMsg(); }
    function runPhase(){
      if(!state.alive) return;
      const ph=p.phases[state.pi];
      phaseEl.textContent=ph.l; countEl.textContent='Round '+(state.cycle+1)+' of '+p.cycles;
      if(ph.pulse){
        let up=true; _breathScale(orb,1.5,0.5);
        state.pulse=setInterval(()=>{ if(!state.alive) return; up=!up; _breathScale(orb, up?1.5:1.1, 0.5); if(typeof haptic==='function') haptic('light'); }, 650);
        state.timer=setTimeout(()=>{ if(state.pulse){clearInterval(state.pulse);state.pulse=null;} advance(); }, ph.s*1000);
      } else {
        _breathScale(orb, ph.scale, ph.s); if(typeof haptic==='function') haptic('light');
        state.timer=setTimeout(advance, ph.s*1000);
      }
    }
    function advance(){ if(!state.alive) return; state.pi++; if(state.pi>=p.phases.length){ state.pi=0; state.cycle++; if(state.cycle>=p.cycles){ finish(); return; } } runPhase(); }
    phaseEl.textContent='Get comfortable…'; countEl.textContent='';
    state.timer=setTimeout(()=>{ if(state.alive) runPhase(); }, 1200);
    if(typeof haptic==='function') haptic('tap');
  }
  if(reason){
    show('.b-pre');
    buildScale(q('.b-scale'), (n)=>{ state.before=n; startBreathing(); });
    q('.b-skip').onclick=()=>{ state.before=null; startBreathing(); };
  } else { startBreathing(); }
  if(typeof haptic==='function') haptic('tap');
}

// ════ THE PLAN — coach the path, don't just track it ════ For each vice, we ask HOW they want to
// handle it (quit / moderate to a line / just watch), WHY it matters (said back to them when it's
// hard), and WHAT actually helps them in the moment. Stored on the vice as v.plan; the fight, the
// at-the-line moment, and the urge door all shape around it. Help appears as they asked for it.

// ── THE MAP AROUND THE MOMENT — walk-back, cost/benefit, and named escapes ────────────────────
// The companion handles the urge itself well. What was missing is everything AROUND it: how you got
// there (Marlatt's "seemingly irrelevant decisions" — the quiet chain of small choices that walks a
// person to the brink while feeling like nothing), your own reasons in your own words, and a set of
// named responses so the answer to a craving isn't only "endure it".

// The links they have already named, read back to them. Written since v354 and never once shown —
// a walk-back that only writes is a diary entry, not an intervention. Marlatt's whole point is that
// the chain gets INTERRUPTED, which requires the person to see it again outside the moment.
function walkBackLinks(v){
  try{
    const w=(v&&Array.isArray(v.walkbacks))?v.walkbacks:[];
    if(!w.length) return null;
    const catches=[]; w.forEach(function(e){ const c=((e&&e.catch)||'').trim(); if(c && catches.indexOf(c)<0) catches.push(c); });
    return { count:w.length, last:w[0], catches:catches.slice(0,3) };
  }catch(_){ return null; }
}
// The threshold block: their own runway, in their own words, at the moment it is about to run again.
function _walkBackAtThreshold(v){
  try{
    const L=walkBackLinks(v); if(!L || !L.catches.length) return '';
    return '<div style="border:1px solid var(--bd);border-radius:12px;padding:12px;margin-top:10px;background:var(--bg3)">'+
      '<div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">The link you said you’d break</div>'+
      L.catches.map(function(c){ return '<div style="font-size:12.5px;color:var(--tx);line-height:1.5">• '+_escFew(c)+'</div>'; }).join('')+
      '<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-top:6px">You worked that out when you were clear-headed. It is still true now.</div>'+
    '</div>';
  }catch(_){ return ''; }
}

// 2.1 — THE WALK-BACK. Done in the calm, never mid-urge: an urge cannot see its own runway.
function openWalkBack(i){
  if(typeof loadV==='function') loadV();
  const v=vices[i]; if(!v) return;
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  if(typeof openFormModal!=='function') return;
  const _L=walkBackLinks(v);
  const _prev=_L ? ('\n\nLast time you traced it: “'+String(_L.last.chain||'').slice(0,180)+'”'+(_L.last.catch?(' — and the link you named was: '+_L.last.catch):'')) : '';
  openFormModal('How did you get there?',
    'Think of the last time it got you \u2014 and work backwards. Not the moment itself: the hour before, and the hour before that. What were the small, innocent-looking decisions that quietly put you in the room?'+_prev,
    [{id:'chain',label:'',type:'textarea',placeholder:'e.g. stayed up past midnight \u2192 took my phone to bed \u2192 told myself I\u2019d just check one thing'},
     {id:'catch',label:'',type:'text',placeholder:'Which link could you realistically break next time?'}],
    'Save this',
    function(vals){
      const chain=(vals.chain||'').trim(); if(!chain) return 'Even a rough chain is worth more than none.';
      try{
        const _name=v.n;
        if(typeof loadV==='function') loadV();
        const _i=vices.findIndex(function(x){ return x && x.n===_name; });
        const _t=(_i>=0)?vices[_i]:v;
        _t.walkbacks=_t.walkbacks||[];
        _t.walkbacks.unshift({chain:chain.slice(0,600), catch:(vals.catch||'').trim().slice(0,200), ts:new Date().toISOString()});
        _t.walkbacks=_t.walkbacks.slice(0,12);
        if(typeof saveV==='function') saveV();
      }catch(_){}
      try{ showToast('Saved','That chain is the thing to interrupt \u2014 miles earlier than the moment itself.'); }catch(_){}
      try{ if(typeof renderVices==='function') renderVices(); }catch(_){}
      return true;
    });
}

// 2.2 — COST / BENEFIT. SMART Recovery's core tool. Their reasons, their words, mirrored back later.
function openCBA(i){
  if(typeof loadV==='function') loadV();
  const v=vices[i]; if(!v) return;
  const c=v.cba||{};
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  if(typeof openFormModal!=='function') return;
  openFormModal('The honest ledger',
    'Both columns, honestly \u2014 including what it genuinely gives you. A list that pretends it does nothing for you is a list you won\u2019t believe at 11pm.',
    [{id:'gain',label:'',type:'textarea',placeholder:'What it actually gives me\u2026', value:c.gain||''},
     {id:'cost',label:'',type:'textarea',placeholder:'What it actually costs me\u2026', value:c.cost||''},
     {id:'free',label:'',type:'text',placeholder:'What being free of it would look like', value:c.free||''}],
    'Keep this',
    function(vals){
      // Re-resolve by NAME inside the callback. `v` was captured before the form opened, and any
      // loadV() in between REPLACES the vices array with fresh objects — mutating the stale one and
      // calling saveV() then writes an array that never contained the edit, silently discarding
      // everything the person just typed. Same trap in the walk-back below.
      try{
        const _name=v.n;
        if(typeof loadV==='function') loadV();
        const _i=vices.findIndex(function(x){ return x && x.n===_name; });
        const _t=(_i>=0)?vices[_i]:v;
        _t.cba={gain:(vals.gain||'').trim().slice(0,500),cost:(vals.cost||'').trim().slice(0,500),free:(vals.free||'').trim().slice(0,240),ts:new Date().toISOString()};
        if(typeof saveV==='function') saveV();
      }catch(_){}
      try{ showToast('Kept','I\u2019ll hand these back to you in your own words when it counts.'); }catch(_){}
      try{ if(typeof renderVices==='function') renderVices(); }catch(_){}
      return true;
    });
}

// 2.3 — DEADS. Named escapes, so a craving has more answers than "hold on".
const _DEADS=[
  ['\u23F1','Delay','Not "no" \u2014 just not now. Set fifteen minutes and decide at the end of it. Most of the wave is gone by then.'],
  ['\u{1F6AA}','Escape','Leave the room. Not a metaphor \u2014 the actual room. Most urges are half-made of where you\u2019re standing.'],
  ['\u{1F91D}','Accept','Stop wrestling it. Let it be there, unfought, and watch it move. It always does.'],
  ['\u{1F3AF}','Distract','Something with your hands and a bit of friction \u2014 cold water, a walk, tidying, press-ups. Not a screen.'],
  ['\u{1F504}','Substitute','Give the need what it actually wants. Tired \u2192 rest. Lonely \u2192 a person. Bored \u2192 something real.']
];
function openDEADS(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);line-height:1.3;margin-bottom:6px">Five ways through.</div>'+
    '<div style="text-align:center;font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:15px">Enduring it is only one of them, and usually the hardest. Pick whichever you could actually do in the next minute.</div>'+
    _DEADS.map(function(d){ return '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;margin-bottom:8px">'+
      '<div style="font-size:13.5px;color:var(--tx);margin-bottom:2px">'+d[0]+'&nbsp;&nbsp;'+d[1]+'</div>'+
      '<div style="font-size:12px;color:var(--tx2);line-height:1.55">'+d[2]+'</div></div>'; }).join('')+
    '<button class="btn primary" style="margin-top:4px" onclick="closeModal(this);theRelease({did:\'You picked a way through instead of white-knuckling it.\'})">Doing one now</button>'+
    '<button class="btn" onclick="closeModal(this);openToolkit()" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:8px">Learn these properly when it\u2019s quiet \u2192</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:6px">Back</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}

function openVicePlan(i){
  if(typeof loadV==='function') loadV();
  const v=(typeof vices!=='undefined'&&vices[i])?vices[i]:null; if(!v) return;
  const plan=v.plan||{};
  const MOVES=['Walk it off','Breathe','Message someone','Leave the room','Wait it out 20 min','Pray','Cold water'];
  const chosen=new Set((plan.move?String(plan.move).split(' · '):[]).filter(Boolean));
  let mode=v.mode||'quit';
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="max-height:92vh;overflow-y:auto">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);margin-bottom:2px">Your plan for '+String(v.n).replace(/</g,'&lt;')+'</div>'+
    '<div style="text-align:center;font-size:12px;color:var(--tx3);line-height:1.5;margin-bottom:16px">However you want to handle it — I’ll shape everything around this. No wrong answer.</div>'+
    '<div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">The goal</div>'+
    '<div class="vp-mode" style="display:flex;gap:6px;margin-bottom:16px"></div>'+
    '<div class="vp-line-wrap" style="display:none;margin-bottom:16px">'+
      '<div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Your line (how much is okay)</div>'+
      '<input class="vp-line" type="number" min="1" value="'+(v.modThreshold||3)+'" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--bd);background:var(--bg3);color:var(--tx);font-size:16px;box-sizing:border-box" placeholder="e.g. 3 a week">'+
    '</div>'+
    '<div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Why this matters to you</div>'+
    '<textarea class="vp-why" placeholder="The real reason. I’ll say it back to you when it’s hard." style="width:100%;min-height:56px;padding:12px;border-radius:10px;border:1px solid var(--bd);background:var(--bg3);color:var(--tx);font-size:16px;font-family:inherit;margin-bottom:16px;resize:vertical;box-sizing:border-box">'+(plan.why?String(plan.why).replace(/</g,'&lt;'):'')+'</textarea>'+
    '<div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">When it pulls hardest, what helps you?</div>'+
    '<div class="vp-moves" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px"></div>'+
    '<button class="btn primary vp-save">Save my plan</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:6px">Not now</button>'+
      '<div style="display:flex;gap:8px;margin-bottom:8px">'+
      '<button class="btn" onclick="closeModal(this);openCBA('+i+')" style="flex:1;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12px;margin:0">\u2696 The honest ledger</button>'+
      '<button class="btn" onclick="closeModal(this);openWalkBack('+i+')" style="flex:1;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12px;margin:0">\u{1F50E} How did I get there?</button>'+
    '</div>'+
    '</div>';
  document.body.appendChild(m);
  const modeWrap=m.querySelector('.vp-mode'), lineWrap=m.querySelector('.vp-line-wrap');
  function renderMode(){
    modeWrap.innerHTML='';
    [['quit','Quit it'],['moderate','Moderate it'],['watch','Just watch it']].forEach(o=>{ const b=document.createElement('button'); b.type='button'; b.textContent=o[1]; const on=mode===o[0]; b.style.cssText='flex:1;padding:9px 4px;border-radius:10px;border:1px solid '+(on?'var(--go)':'var(--bd)')+';background:'+(on?'rgba(200,169,110,0.14)':'var(--bg3)')+';color:var(--tx);font-size:12.5px;cursor:pointer'; b.onclick=()=>{mode=o[0];renderMode();}; modeWrap.appendChild(b); });
    lineWrap.style.display = mode==='moderate' ? 'block' : 'none';
  }
  renderMode();
  const movesWrap=m.querySelector('.vp-moves');
  MOVES.forEach(mv=>{ const b=document.createElement('button'); b.type='button'; b.textContent=mv; const on=chosen.has(mv); b.style.cssText='padding:7px 11px;border-radius:15px;border:1px solid '+(on?'var(--go)':'var(--bd)')+';background:'+(on?'rgba(200,169,110,0.14)':'var(--bg3)')+';color:'+(on?'var(--tx)':'var(--tx2)')+';font-size:12px;cursor:pointer'; b.onclick=()=>{ if(chosen.has(mv)){chosen.delete(mv);b.style.borderColor='var(--bd)';b.style.background='var(--bg3)';b.style.color='var(--tx2)';}else{chosen.add(mv);b.style.borderColor='var(--go)';b.style.background='rgba(200,169,110,0.14)';b.style.color='var(--tx)';} }; movesWrap.appendChild(b); });
  m.querySelector('.vp-save').onclick=()=>{
    if(typeof loadV==='function') loadV();
    const vv=(typeof vices!=='undefined'&&vices[i])?vices[i]:null; if(!vv){ m.remove(); return; }
    vv.mode=mode;
    if(mode==='moderate'){ const ln=parseInt(m.querySelector('.vp-line').value,10); if(ln>0) vv.modThreshold=ln; }
    vv.plan=Object.assign({}, vv.plan, { why:(m.querySelector('.vp-why').value||'').trim(), move:[...chosen].join(' · '), updatedAt:Date.now() });
    try{ if(typeof saveV==='function') saveV(); }catch(_){}
    try{ if(typeof renderVices==='function') renderVices(); }catch(_){}
    try{ if(typeof logEvent==='function') logEvent('vice_plan'); }catch(_){}
    m.remove();
    if(typeof showToast==='function') showToast('Plan saved','I’ll shape the help around this — and say your why back when it’s hard.');
    if(typeof haptic==='function') haptic('success');
  };
  if(typeof haptic==='function') haptic('tap');
}

// The in-moment plan card — the person's OWN why + chosen move, shown when the urge hits. Their plan,
// in their words, exactly when they need it. Empty (returns '') until they've made a plan.
function _planCardHTML(i){
  try{
    if(typeof loadV==='function') loadV();
    const v=(typeof vices!=='undefined'&&vices[i])?vices[i]:null; if(!v||!v.plan) return '';
    const why=v.plan.why, move=v.plan.move;
    if(!why && !move) return '';
    let inner='';
    if(why) inner+='<div style="font-size:13px;color:var(--tx);line-height:1.6;font-style:italic;margin-bottom:'+(move?'8px':'0')+'">“'+String(why).replace(/</g,'&lt;')+'”</div>';
    if(move) inner+='<div style="font-size:11px;color:var(--tx3);line-height:1.5"><span style="color:var(--go)">Your move:</span> '+String(move).replace(/</g,'&lt;')+'</div>';
    return '<div style="background:rgba(200,169,110,0.08);border:1px solid var(--go-bd);border-radius:12px;padding:13px 14px;margin-bottom:14px;text-align:left">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px">Your plan — in your words</div>'+inner+'</div>';
  }catch(_){ return ''; }
}

// ════ NATURAL HIGHS ════ Quitting any dopamine-driven vice leaves the reward system flat for a while
// (anhedonia — it's the brain recalibrating, not failure). These are the evidence-based ways to rebuild
// it for real, no crash: exercise hits the SAME endocannabinoid receptor the vice did (the runner's
// high), cold spikes dopamine ~2.5× for hours, morning light + real connection repair the system.
// Honest, deterministic, on-mission for EVERY vice — see BREATH-STILLNESS-RESEARCH.md.
// A TOAST IS NOT A MOVE. Three of these five closed every sheet and fired a five-second toast over
// whatever tab happened to be behind — so someone who tapped "Flat", then "Chase a real high", then
// "Cold water" was left staring at an empty screen with a sentence already fading. The two that
// worked (move, breath) went somewhere. These three now do too.
function _pickHigh(type){
  try{ if(typeof logEvent==='function') logEvent('natural_high'); }catch(_){}
  document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());
  if(type==='move'){ if(typeof go==='function') go('train'); }
  else if(type==='breath'){ if(typeof openBreath==='function') openBreath('energize'); }
  else if(type==='sun'){ if(typeof openLookUp==='function') openLookUp(); else if(typeof go==='function') go('home'); }
  else if(type==='cold'){ _coldPlunge(); }
  else if(type==='connect'){ _reachOneNow(); }
}
// Ninety seconds you can actually stand in. The timer runs on screen, so the move has a shape and an
// end — and the release at the end is the point, not a log entry.
function _coldPlunge(){
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center">'+
    '<div style="font-size:30px;margin-bottom:8px">\uD83E\uDDCA</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:25px;color:var(--tx);line-height:1.3;margin-bottom:10px">Go cold.</div>'+
    '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:14px">Turn it all the way cold at the end of your shower. It will feel like too much for about fifteen seconds, and then it will not. Breathe out slowly \u2014 do not hold your breath.</div>'+
    '<div id="cold-clock" role="timer" aria-live="polite" style="font-family:\'DM Mono\',monospace;font-size:44px;color:var(--go);line-height:1;margin-bottom:6px">1:30</div>'+
    '<div id="cold-sub" style="font-size:12px;color:var(--tx3);margin-bottom:16px">Ninety seconds. Start it when the water turns.</div>'+
    '<button class="btn primary" id="cold-go" style="margin-bottom:8px">Start</button>'+
    '<button class="btn" id="cold-close" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin:0">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
  let left=90, tick=null;
  const clock=m.querySelector('#cold-clock'), sub=m.querySelector('#cold-sub'), go=m.querySelector('#cold-go');
  const fmt=function(n){ return Math.floor(n/60)+':'+String(n%60).padStart(2,'0'); };
  const stop=function(){ if(tick){ clearInterval(tick); tick=null; } };
  m.querySelector('#cold-close').onclick=function(){ stop(); m.remove(); };
  go.onclick=function(){
    if(tick){ stop(); go.textContent='Start'; sub.textContent='Paused.'; return; }
    go.textContent='Pause'; sub.textContent='Long, slow exhale. Do not brace against it.';
    tick=setInterval(function(){
      left--; clock.textContent=fmt(Math.max(0,left));
      if(left<=0){
        stop(); clock.textContent='Done';
        sub.textContent='That is real, clean energy \u2014 and no crash coming.';
        go.textContent='Finish';
        go.onclick=function(){
          m.remove();
          if(typeof haptic==='function') haptic('celebrate');
          if(typeof theRelease==='function') theRelease({did:'You went cold for ninety seconds \u2014 a real lift, no crash.'});
        };
      }
    },1000);
  };
  // A timer that keeps running after the sheet is gone is a leak; make closing it stop the clock.
  try{ const obs=new MutationObserver(function(){ if(!document.body.contains(m)){ stop(); obs.disconnect(); } });
       obs.observe(document.body,{childList:true}); }catch(_){ }
}
// One real person, named — not "reach out to someone". The app already knows their few and how long
// it has been; an unnamed instruction is exactly the thing a flat person will not act on.
function _reachOneNow(){
  const s = (typeof reachOutSuggestion==='function') ? reachOutSuggestion() : null;
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  if(!s || !s.person){
    m.innerHTML='<div class="modal" style="text-align:center">'+
      '<div style="font-size:30px;margin-bottom:8px">\uD83E\uDD1D</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.3;margin-bottom:10px">Reach out to one person.</div>'+
      '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:16px">Isolation feeds the flatness; contact starves it. One message, to one person who is good for you \u2014 it does not have to be deep.</div>'+
      '<button class="btn primary" onclick="closeModal(this);if(typeof openYourFew===\'function\')openYourFew()" style="margin-bottom:8px">Add the people I carry</button>'+
      '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin:0">Not now</button>'+
    '</div>';
  } else {
    const nm = _escFew(s.person.name);
    const since = (s.days==null) ? 'You have not logged reaching out to them yet.'
                                 : ('It has been '+s.days+' day'+(s.days===1?'':'s')+'.');
    m.innerHTML='<div class="modal" style="text-align:center">'+
      '<div style="font-size:30px;margin-bottom:8px">\uD83E\uDD1D</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.3;margin-bottom:6px">Message '+nm+'.</div>'+
      '<div style="font-size:11.5px;color:var(--tx3);margin-bottom:12px">'+since+'</div>'+
      '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:14px">'+_escFew(s.prompt||'Say one true thing. It does not have to be deep.')+'</div>'+
      (s.reframe?'<div style="font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:16px">'+s.reframe+'</div>':'')+
      '<button class="btn primary" id="reach-one-did" style="margin-bottom:8px">I reached out</button>'+
      '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin:0">Not now</button>'+
    '</div>';
  }
  document.body.appendChild(m);
  try{
    const btn = m.querySelector('#reach-one-did');
    if(btn && s && s.person) btn.onclick = function(){
      m.remove();
      try{ if(typeof logReachOut==='function') logReachOut(s.person.name); }catch(_){ }
    };
  }catch(_){ }
  if(typeof haptic==='function') haptic('tap');
}
// Where are they in the recovery arc? (uses the existing clean-streak — works for ANY vice). General
// dopamine-recalibration science, framed as healing, so the flat window isn't read as failure.
function _recoveryPhaseNote(days){
  if(days<1) return null;
  const d='Day '+days+' — ';
  if(days<=3) return d+'the first days are the hardest. Raw, loud, survivable. One real high now.';
  if(days<=10) return d+'the pull is still loud but already weakening. Feed the clean dopamine.';
  if(days<=21) return d+'the flat window. If it all feels grey, that’s your reward system recalibrating — not failure. This is exactly when a real high helps most.';
  if(days<=45) return d+'the fog is lifting, colour coming back. Keep feeding it clean.';
  return days+' days clean — you’re rebuilding. The vice moves you less because you’re becoming someone it moves less.';
}
function openNaturalHighs(){
  const HIGHS=[
    ['move','🏃','Move your body','Movement lifts mood and takes the edge off a craving more reliably than anything else here — and it works on the day you least feel like it.'],
    ['cold','🧊','Cold water','60–90 seconds of cold gives most people a sharp, clean lift in alertness and mood. Short-lived, but no crash, and it breaks the loop you are in.'],
    ['sun','☀️','Morning light','10–20 min of early sun anchors your body clock — which is what actually fixes the sleep that is feeding the craving.'],
    ['connect','🤝','Reach out to someone','Real connection rebuilds the reward the vice was faking.'],
    ['breath','🌬️','A charged breath','A fast breathing round to lift a flat, numb day.']
  ];
  // Recovery-arc framing applies ONLY to vices being QUIT (abstinence). Someone moderating has no
  // "clean streak" to heal — natural highs still help them (clean dopamine beats the fake), but we
  // don't mis-frame their planned use as "flat after quitting". Help shaped to what they chose.
  let _days=-1; try{ if(typeof loadV==='function')loadV(); const _vs=(typeof vices!=='undefined'&&Array.isArray(vices))?vices:[]; const _quit=_vs.filter(v=>((v.mode||'quit')!=='moderate') && v.kind!=='letgo'); if(_quit.length && typeof viceCleanDays==='function') _days=Math.max.apply(null,_quit.map(v=>viceCleanDays(v)||0)); }catch(_){}
  const _phase=(_days>=1)?_recoveryPhaseNote(_days):null;
  const _phaseLine=_phase?'<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);letter-spacing:0.03em;line-height:1.55;margin-bottom:14px">'+_phase+'</div>':'';
  const _intro=_phase?'Feeling flat after quitting is the reward system healing — not you failing. These rebuild it for real. Pick one and go.':'A real hit of clean dopamine beats the fake one every time — no crash, and it makes the pull quieter. Pick one and go.';
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  let html='<div class="modal" style="text-align:center;max-height:92vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);margin-bottom:4px">Chase a real high</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:'+(_phase?'10px':'16px')+'">'+_intro+'</div>'+_phaseLine;
  HIGHS.forEach(h=>{ html+=
    '<button class="btn" onclick="_pickHigh(\''+h[0]+'\')" style="text-align:left;margin-bottom:8px;padding:12px 14px;display:flex;align-items:center;gap:11px">'+
      '<span style="font-size:20px;flex-shrink:0">'+h[1]+'</span>'+
      '<span style="flex:1"><span style="font-size:14px;color:var(--tx);display:block">'+h[2]+'</span><span style="font-size:11.5px;color:var(--tx3);line-height:1.45">'+h[3]+'</span></span>'+
    '</button>'; });
  html+='<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:4px">Not now</button></div>';
  m.innerHTML=html; document.body.appendChild(m); if(typeof haptic==='function') haptic('tap');
}

// A RAFFLE THE APP CANNOT RUN. Four places told people "you're in the raffle" — the Settings card, the
// check-in intro, the send note and the thank-you screen — and nowhere in this codebase, the docs or the
// backend is there a prize, an eligibility rule, a draw date, a draw mechanism or any terms. So the app
// made a promise to a real person that nothing could keep, which is the same class as a toast that lies,
// except it also collects their email on the strength of it. It is a submission risk too (review expects
// contest rules stated in the app, and an Australian trade promotion can need a permit depending on the
// prize), but the reason to fix it is the first one.
//
// The feedback channel is untouched and is the genuinely valuable part — Alfy reading every note. Only
// the unbacked promise is gone. TO TURN A REAL RAFFLE ON: set RAFFLE_ACTIVE = true and fill RAFFLE_TERMS
// with the prize, who is eligible, the draw date and how winners are contacted — the copy below then says
// it, with the terms attached. Do not flip the flag without those.
const RAFFLE_ACTIVE = false;
const RAFFLE_TERMS = '';   // e.g. 'One $50 voucher, drawn 1 Sep 2026, 18+, winner emailed.'
function _raffleCopy(kind){
  if(!RAFFLE_ACTIVE || !RAFFLE_TERMS){
    // The truth, which is the better offer anyway: a real person actually reads your words.
    if(kind==='card')   return 'Tell me what\u2019s improving and what\u2019s missing \u2014 I read every note.';
    if(kind==='intro')  return 'Alfy reads every one personally.';
    if(kind==='send')   return 'Sent from your account, so Alfy knows who to thank.';
    if(kind==='thanks') return 'Every word helps me build this for you and the next person who needs it. Keep going.';
    return '';
  }
  if(kind==='card')   return 'Tell me what\u2019s improving and what\u2019s missing \u2014 I read every note. Share honest feedback and you\u2019re in the draw. ' + RAFFLE_TERMS;
  if(kind==='intro')  return 'Alfy reads every one personally, and everyone who shares goes in the draw. ' + RAFFLE_TERMS;
  if(kind==='send')   return 'Sent from your account, so Alfy knows who to thank \u2014 and who to add to the draw.';
  if(kind==='thanks') return 'You\u2019re in the draw. Every word helps me build this for you and the next person who needs it. Keep going.';
  return '';
}

// ════ PROGRESS CHECK-IN + FEEDBACK ════ Not a competition — people share what's IMPROVING for
// them (which tells Alfy what's working) and can opt into a raffle for sharing honest feedback. Feedback
// lands in Supabase app_events (event='feedback') so it's queryable; raffle opt-in attaches their
// sign-in email so winners can be contacted. See ANALYTICS-QUERIES.md for the raffle/feedback queries.
function openProgressCheckin(){
  const AREAS=['Clearer head','More disciplined','Better sleep','Stronger / fitter','Less of my vice','More at peace','More energy','Closer to God','More present with people'];
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  const picked=new Set();
  m.innerHTML='<div class="modal" style="text-align:center;max-height:92vh;overflow-y:auto">'+
    '<div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);margin-bottom:4px">How far have you come?</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:16px">Since you started with To Try — what have you noticed? Tap any that fit. '+_raffleCopy('intro')+'</div>'+
    '<div class="pc-areas" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:16px"></div>'+
    '<textarea class="pc-note" placeholder="Anything you’d want Alfy to know? What’s working, what’s missing?" style="width:100%;min-height:70px;padding:12px;border-radius:10px;border:1px solid var(--bd);background:var(--bg3);color:var(--tx);font-size:16px;font-family:inherit;margin-bottom:14px;resize:vertical;box-sizing:border-box"></textarea>'+
    '<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-bottom:16px">'+_raffleCopy('send')+'</div>'+
    '<button class="btn primary pc-send" style="margin-bottom:8px">Send it to Alfy</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Maybe later</button>'+
  '</div>';
  document.body.appendChild(m);
  const areasWrap=m.querySelector('.pc-areas');
  AREAS.forEach(a=>{ const b=document.createElement('button'); b.type='button'; b.textContent=a; b.style.cssText='padding:8px 12px;border-radius:16px;border:1px solid var(--bd);background:var(--bg3);color:var(--tx2);font-size:12.5px;cursor:pointer'; b.onclick=()=>{ if(picked.has(a)){ picked.delete(a); b.style.borderColor='var(--bd)'; b.style.color='var(--tx2)'; b.style.background='var(--bg3)'; } else { picked.add(a); b.style.borderColor='var(--go)'; b.style.color='var(--tx)'; b.style.background='rgba(200,169,110,0.14)'; } }; areasWrap.appendChild(b); });
  m.querySelector('.pc-send').onclick=()=>{
    const note=(m.querySelector('.pc-note').value||'').trim();
    if(!picked.size && !note){ if(typeof showToast==='function') showToast('Tell me one thing','Tap what’s improved, or write a line.'); return; }
    const email = (typeof currentUser!=='undefined'&&currentUser&&currentUser.email)||null;
    // This is feedback, not a metric, and it used to go ONLY to app_events — the anonymous counter
    // table — carrying their free-text note and their email. Two failures in one: it put identifying
    // content into the table both privacy policies describe as never containing what you log, and it
    // ran through logEvent(), which returns early when someone has turned counting off. So a person
    // who opted out of being counted tapped "Send it to Alfy", read "Thank you — you're in the
    // raffle", and their words went nowhere. Now it goes to the feedback table like every other
    // message, through the local outbox that retries until it lands, regardless of the metrics
    // setting — because they pressed send. app_events gets a bare count and nothing else.
    const _entry={
      type:'progress_checkin',
      message:(picked.size?('Improved: '+[...picked].join(', ')):'')+(note?((picked.size?'\n\n':'')+note):''),
      email: email || 'anonymous',
      app_info:{ day:(typeof getDayCount==='function'?getDayCount():null), version:(typeof APP_VERSION!=='undefined'?APP_VERSION:null), improvements:[...picked] },
      ts:new Date().toISOString()
    };
    try{
      const _ob=ls('totry_feedback_outbox')||[]; _ob.unshift(_entry); ls('totry_feedback_outbox', _ob.slice(0,50));
      if(typeof sb!=='undefined' && sb){
        sb.from('feedback').insert([{ type:_entry.type, message:_entry.message, email:_entry.email, app_info:_entry.app_info, created_at:_entry.ts }])
          .then(function(r){ if(!r||!r.error){ try{ const o=ls('totry_feedback_outbox')||[]; ls('totry_feedback_outbox', o.filter(function(x){ return !(x&&x.ts===_entry.ts); })); }catch(_){} } }, function(){});
      }
    }catch(_){}
    // A count, with nothing personal in it — how many people answered, not what they said.
    // How many life areas someone checked in on, and whether they wrote something, is a shape of their
    // week. The event that a check-in happened is the feature signal; the rest is theirs.
    try{ if(typeof logEvent==='function') logEvent('progress_checkin'); }catch(_){}
    try{ ls('totry_last_checkin', Date.now()); }catch(_){}
    m.remove();
    const t=document.createElement('div'); t.className='modal-bg open'; t.style.alignItems='center';
    t.innerHTML='<div class="modal" style="text-align:center"><div style="font-size:30px;margin-bottom:8px">🙏</div><div style="font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);margin-bottom:10px">Thank you — really.</div><div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:16px">'+_raffleCopy('thanks')+'</div><button class="btn primary" onclick="closeModal(this)">Back to it</button></div>';
    document.body.appendChild(t);
    if(typeof haptic==='function') haptic('tap');
  };
  if(typeof haptic==='function') haptic('tap');
}

