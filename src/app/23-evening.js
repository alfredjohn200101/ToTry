// ── ONE HONEST QUESTION AT A TIME ──
// SOUL-ARCHITECTURE, EVENING: "dusk skin, one honest question at a time, grace-first framing." The
// panel ran to 27 blocks in one scroll. Looking back over a hard day is not something a person does
// well while scrolling past nine more fields; the ones who most need this are the ones who close the
// tab at block four.
//
// Same machinery as the morning, same two rules. Hidden, never removed — the examen is a crisis door
// and completeEvening() reads fields from every step. And assignment is by ANCHOR, so a block added
// later inherits the step it sits in instead of vanishing. GRACE FIRST is the ordering: what you
// actually did comes before anything you are asked to admit.
// GRACE FIRST is the ordering, not a tone: what they actually did lands before anything they are
// asked to admit, and the three good things come before the examen rather than after it.
// The numbers here must follow DOM ORDER, because an anchor claims everything below it until the
// next one. Numbering "three good things" before the prayer block — which is true of the ritual but
// false of the markup — quietly put the examen and the complete button inside the gratitude step.
const _EVENING_STEPS = [
  { key:'land',       label:'Land' },
  { key:'win',        label:'One win' },
  { key:'release',    label:'Release' },
  { key:'did',        label:'What you did' },
  { key:'tomorrow',   label:'Tomorrow' },
  { key:'reflection', label:'Reflection' },
  { key:'close',      label:'Close' },
];
const _EVENING_ANCHORS = {
  'evening-win':          1,   // one win from today — the evidence, before the honesty
  'evening-release':      2,
  'evening-numbers':      3,
  'evening-tomorrow-lbl': 4,
  'eve-prayer-label':     5,
  'evening-good-lbl':     6,   // three good things, then the examen, then done — grace before review
};
const _EVENING_OVERRIDE = {};
let _eStep = 0;
function _eveningAssignSteps(panel){
  let step = 0;
  [...panel.children].forEach(el => {
    if(el.classList.contains('mstep-nav') || el.classList.contains('mstep-foot')) return;
    // #evening-done is the END, not a step — see the note in the morning flow. Assigning it a step
    // let the evening save everything and then say nothing back.
    if(el.id === 'evening-done') return;
    if(el.id && _EVENING_ANCHORS[el.id] != null){
      step = _EVENING_ANCHORS[el.id];
      const prev = el.previousElementSibling;
      if(prev && prev.classList.contains('lbl')) prev.setAttribute('data-mstep', step);
    }
    el.setAttribute('data-mstep', (el.id && _EVENING_OVERRIDE[el.id] != null) ? _EVENING_OVERRIDE[el.id] : step);
  });
}
function eveningStep(n){
  const panel = document.getElementById('reflect-panel-evening');
  if(!panel) return;
  _eStep = Math.max(0, Math.min(_EVENING_STEPS.length - 1, n));
  panel.querySelectorAll(':scope > [data-mstep]').forEach(el => {
    el.classList.toggle('mstep-on', Number(el.getAttribute('data-mstep')) === _eStep);
  });
  const dots = panel.querySelector('.mstep-dots');
  if(dots) [...dots.children].forEach((d,i) => d.classList.toggle('on', i === _eStep));
  const lbl = panel.querySelector('.mstep-label');
  if(lbl) lbl.textContent = _EVENING_STEPS[_eStep].label;
  const next = panel.querySelector('.mstep-next');
  if(next) next.style.display = (_eStep === _EVENING_STEPS.length - 1) ? 'none' : '';
  try{ window.scrollTo({ top:0, behavior:'smooth' }); }catch(_){ }
  if(typeof haptic === 'function') haptic('tap');
}
// Any deep link INTO the evening has to move the flow, not just scroll. scrollIntoView on a field
// whose step is display:none is a no-op, so "Add today's Watch rings" in Nourish landed on step 0
// with nothing happening and nothing to say why. Safe when the evening is not stepped: it falls back
// to a plain scroll.
function _stepToEveningField(id){
  try{
    const el = document.getElementById(id);
    if(!el) return;
    const panel = document.getElementById('reflect-panel-evening');
    const holder = el.closest('[data-mstep]');
    if(panel && panel.classList.contains('stepped') && holder && typeof eveningStep === 'function'){
      eveningStep(Number(holder.getAttribute('data-mstep')));
      setTimeout(function(){ try{ el.scrollIntoView({ block:'center' }); }catch(_){ } }, 220);
    } else {
      el.scrollIntoView({ block:'center' });
    }
    // a <details> holding it must be open, or the field is inside a collapsed fold
    const det = el.closest('details');
    if(det && !det.open) det.open = true;
  }catch(_){ }
}
function eveningFinished(){
  const panel = document.getElementById('reflect-panel-evening');
  if(!panel) return;
  const nav = panel.querySelector('.mstep-nav'); if(nav) nav.style.display = 'none';
  const foot = panel.querySelector('.mstep-foot'); if(foot) foot.style.display = 'none';
  panel.classList.remove('stepped');
}
function eveningShowAll(){
  const panel = document.getElementById('reflect-panel-evening');
  if(!panel) return;
  panel.classList.remove('stepped');
  const nav = panel.querySelector('.mstep-nav'); if(nav) nav.style.display = 'none';
  const foot = panel.querySelector('.mstep-foot'); if(foot) foot.style.display = 'none';
  ls('totry_evening_flow', 'all');
  if(typeof haptic === 'function') haptic('tap');
}
function renderEveningFlow(){
  const panel = document.getElementById('reflect-panel-evening');
  const tab = document.getElementById('tab-reflect');
  if(!panel) return;
  if(tab) tab.classList.add('dusk');
  if(ls('totry_evening_flow') === 'all'){ panel.classList.remove('stepped'); return; }
  _eveningAssignSteps(panel);
  // Same restore as the morning, same reason — see the note there. eveningFinished() hides the nav
  // and foot inline, and this builder only runs when they are absent, so a second visit came back
  // stepped with no way to move. What the person wrote was saved and unreachable.
  const _nav0 = panel.querySelector('.mstep-nav'); if(_nav0) _nav0.style.display = '';
  const _foot0 = panel.querySelector('.mstep-foot'); if(_foot0) _foot0.style.display = '';
  if(!panel.querySelector('.mstep-nav')){
    const nav = document.createElement('div');
    nav.className = 'mstep-nav';
    nav.innerHTML = '<div class="mstep-dots">' +
      _EVENING_STEPS.map(() => '<div class="mstep-dot"></div>').join('') +
      '</div><div class="mstep-label"></div>';
    panel.insertBefore(nav, panel.firstChild);
    const foot = document.createElement('div');
    foot.className = 'mstep-foot';
    foot.innerHTML = '<button class="btn primary mstep-next" style="flex:1">Next \u2192</button>' +
                     '<button class="mstep-all" type="button">Show the whole evening</button>';
    panel.appendChild(foot);
    foot.querySelector('.mstep-next').onclick = () => eveningStep(_eStep + 1);
    foot.querySelector('.mstep-all').onclick = eveningShowAll;
  }
  panel.classList.add('stepped');
  eveningStep(0);
}

// ── EVENING ───────────────────────────────────────────────────
let dayRating=3;
const CALL_PROMPTS=[
  'Tell them one genuine thing you\'re grateful for today.',
  'Share one thing you struggled with and how you handled it.',
  'Tell them one thing you\'re proud of from today.',
  'Ask how they\'re really doing \u2014 and actually listen.',
  'Share the line or verse that hit you today.',
  'Tell them one thing they do that makes this easier.',
  'Be honest about where you\'re at. No performance.',
];
const SHARED_PRAYERS=[
  'Lord, thank You for the people who love me. Keep me present with them — not half-here behind a screen. Amen.',
  'God, make me someone my people can count on: patient, honest, and actually there. Amen.',
  'Lord, when I\'m tired or distracted, remind me who I\'m really doing this for. Amen.',
  'Father, let the ones I love feel me show up today — not perfect, just present. Amen.',
];
// Adapts to the person's path (the reflect tab shows one when they've named someone they're showing up for —
// a partner, a parent, a friend, anyone). About being PRESENT for the people you love, not a romantic title.
const SHARED_PRAYERS_BY_FAITH={
  islam:[
    'O Allah, thank You for the people who love me. Keep me present with them, not lost in my phone.',
    'Ya Allah, make me someone my people can count on — patient, honest, and truly there.',
    'O Allah, when I’m tired or distracted, remind me who I’m doing this for.',
    'Ya Allah, let the ones I love feel me show up today — not perfect, just present.'
  ],
  hinduism:[
    'I give thanks for the people who love me; let me be present with them, not lost elsewhere.',
    'Let me be someone my people can count on — patient, honest, and truly there.',
    'When I am tired or distracted, let me remember who I am doing this for.',
    'Let the ones I love feel me show up today — not perfect, just present.'
  ],
  buddhism:[
    'May I be fully present with the people I love, not lost in distraction.',
    'May I be someone my people can count on — patient, honest, and kind.',
    'When I am tired or pulled away, may I remember who I am here for.',
    'May the ones I love feel me show up today — not perfect, just present.'
  ],
  secular:[
    'The people I love matter more than the screen. Let me be present with them today.',
    'Let me be someone my people can count on — patient, honest, and actually there.',
    'When I’m tired or distracted, remind me who I’m doing this for.',
    'Let the ones I love feel me show up today — not perfect, just present.'
  ]
};
function sharedPrayers(){ return SHARED_PRAYERS_BY_FAITH[faithTradition()] || SHARED_PRAYERS; }
function setDayRate(btn,rating){dayRating=rating;document.querySelectorAll('.dr-btn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');}

// ─── EVENING HABIT TICKING ────────────────────────────────────
function renderEveningHabitTickList(){
  loadH();
  // Re-assert auto-tick from real activity (morning done, workouts, etc.) so the evening list
  // reflects everything completed today — not a stale grid. This is why "morning ritual done"
  // wasn't showing ticked even though the morning was finished.
  if(typeof autoTickHabits === 'function') autoTickHabits();
  loadH();
  const ti = tIdx();
  const list = document.getElementById('evening-habit-tick-list');
  if(!list) return;
  if(!habits.length){
    list.innerHTML = '<p class="empty-note">No habits to tick. Add some in Settings.</p>';
    return;
  }
  list.innerHTML = '';
  habits.forEach((h, hi) => {
    // Don't show the "evening check-in" habit in the evening check-in itself — you're doing it
    // right now, so it's auto-ticked on save; listing it here is redundant/confusing.
    if(/evening check.?in|evening checkin|night check.?in/i.test(h.n)) return;
    const done = h.d[ti] === 1;
    // A CHECKBOX A KEYBOARD CAN REACH. This was a <div> with an onclick — the only manual way to tick
    // a habit in the whole app, and it was unfocusable, unannounced, and its state lived in the colour
    // of a nested empty div. "Tick today's habits" had nothing tickable for anyone not using a mouse
    // or a touchscreen, and nothing at all for a screen reader.
    const row = document.createElement('button');
    row.type = 'button';
    row.setAttribute('role', 'checkbox');
    row.setAttribute('aria-checked', done ? 'true' : 'false');
    row.setAttribute('aria-label', h.n);
    row.style.cssText = 'width:100%;text-align:left;font:inherit;border:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:10px 12px;background:'+(done?'var(--gr-bg)':'var(--bg3)')+';border:1px solid '+(done?'var(--gr-bd)':'var(--bd)')+';border-radius:8px;margin-bottom:6px;cursor:pointer';
    row.onclick = () => toggleEveningHabit(hi);
    row.innerHTML = '<div style="width:22px;height:22px;border-radius:6px;border:2px solid '+(done?'var(--gr)':'var(--bd)')+';background:'+(done?'var(--gr)':'transparent')+';display:flex;align-items:center;justify-content:center;color:#0C0C0E;font-weight:700;flex-shrink:0">'+(done?'&#10003;':'')+'</div>'+
      '<div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--tx)">'+_escFew(h.n)+'</div>'+
      (habitAnchor(h)?'<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">after '+_escFew(habitAnchor(h))+'</div>':'')+'</div>';
    list.appendChild(row);
  });
}

function toggleEveningHabit(hi){
  loadH();
  const ti = tIdx();
  habits[hi].d[ti] = habits[hi].d[ti] === 1 ? 0 : 1;
  saveH();
  renderEveningHabitTickList();
  haptic('light');
}

// ── IGNATIAN EXAMEN — 5-step nightly examination ─────────────
// Step 1: Gratitude — what am I thankful for today?
// Step 2: Petition — ask God for clarity to see the day truly
// Step 3: Review — walk through the day, hour by hour
// Step 4: Repent — where did I fall short? Where did I act in love?
// Step 5: Renewal — what is one resolution for tomorrow?
// ── THE EVENING REVIEW, PER TRADITION ────────────────────────────────────────────────────────────
// Same nightly practice, five steps, named and worded in the person's own tradition. Nothing is
// flattened: each is called what it actually is, and the theistic step becomes an honest self-
// accounting where there is no deity to petition.
const _EXAMEN_FACE = {
  christianity:{ noun:'Examen', eyebrow:'Ignatian Examen · 5 steps', label:'The last step — your examen',
    title:'Walk through your day with God.', blurb:'A 600-year-old practice. Five questions. This closes your day — do it last.', cta:'Begin the Examen' },
  islam:{ noun:'Muhāsaba', eyebrow:'Muhāsaba · 5 steps', label:'The last step — your muhāsaba',
    title:'Take account of your day before Allah.', blurb:'Muhāsaba — the nightly self-accounting the scholars urged. Five questions. This closes your day.', cta:'Begin the muhāsaba' },
  hinduism:{ noun:'Reflection', eyebrow:'Evening reflection · 5 steps', label:'The last step — your reflection',
    title:'Look back over your day with honesty.', blurb:'Svādhyāya — the practice of self-study. Five questions. This closes your day.', cta:'Begin the reflection' },
  buddhism:{ noun:'Reflection', eyebrow:'Evening reflection · 5 steps', label:'The last step — your reflection',
    title:'Look back over your day with clear eyes.', blurb:'The nightly reflection the Buddha taught Rāhula — look at what you did, kindly and without flinching. Five questions.', cta:'Begin the reflection' },
  secular:{ noun:'Review', eyebrow:'Evening review · 5 steps', label:'The last step — your evening review',
    title:'Go back over the day, honestly.', blurb:'Seneca did this nightly: what did I do, where did I fall short, what will I do better. Five questions. This closes your day.', cta:'Begin the review' }
};
// The noun the door used, for everything inside — see the note on _EXAMEN_FACE.
function _examenNoun(){
  try{
    const t = (typeof faithTradition==='function') ? faithTradition() : 'secular';
    const f = _EXAMEN_FACE[t] || _EXAMEN_FACE.christianity;
    return f.noun || 'Review';
  }catch(_){ return 'Review'; }
}
function applyFaithExamen(){
  const t = (typeof faithTradition==='function') ? faithTradition() : 'secular';
  const f = _EXAMEN_FACE[t] || _EXAMEN_FACE.christianity;
  const card = document.getElementById('examen-card');
  const lbl  = document.getElementById('examen-label');
  // Always visible now — every tradition gets the closing ritual.
  if(lbl){ lbl.style.display=''; lbl.textContent = f.label; }
  if(card){
    card.style.display='';
    const kids = card.children;
    if(kids[0]) kids[0].textContent = f.eyebrow;
    if(kids[1]) kids[1].textContent = f.title;
    if(kids[2]) kids[2].textContent = f.blurb;
    const btn = card.querySelector('button.primary'); if(btn) btn.textContent = f.cta;
  }
}
// Swap the divine language in a step for the person's tradition. For non-theistic paths the
// "petition" becomes a request of oneself rather than of a deity — honest, not bolted on.
function examenStepFor(step){
  // The terminator: showExamenStep ends on a falsy step. Object.assign({}, undefined) is {}, which is
  // truthy — so without this the examen could never be COMPLETED by any non-Christian tradition, the
  // default included. Pass the falsy value straight through, exactly as the christianity branch does.
  if(!step) return step;
  const t = (typeof faithTradition==='function') ? faithTradition() : 'secular';
  if(t === 'christianity') return step;
  const divine = (typeof curFaith==='function' && curFaith().divine) ? curFaith().divine : 'God';
  const theistic = (t === 'islam' || t === 'hinduism');
  const s = Object.assign({}, step);
  const swap = function(txt){
    if(!txt) return txt;
    return theistic
      ? txt.replace(/\bGod\b/g, divine).replace(/\bYou saw it\b/g, divine + ' saw it').replace(/\bYour\b/g, 'Your')
      : txt.replace(/\bGod, give me\b/g, 'Let me find').replace(/\bGod\b/g, 'life').replace(/\bYou saw it\b/g, 'it truly was');
  };
  s.sub = swap(s.sub); s.body = swap(s.body); s.placeholder = swap(s.placeholder);
  if(!theistic && step.field === 'petition'){
    s.title = 'Honesty';
    s.sub = 'Ask yourself for the clarity to see today truly.';
    s.body = 'A moment of plain honesty: "Let me see today as it actually was. Not the version that flatters me. Not the version that condemns me. The truth."';
    s.placeholder = '(Optional) What do you need to see clearly right now?';
  }
  return s;
}

const EXAMEN_STEPS = [
  {
    n: 1,
    title: 'Gratitude',
    sub: 'What gifts did God give you today?',
    body: 'Big or small. A meal. A laugh. A breath of fresh air. A moment you didn\'t fall when you could have. Take a minute. Notice them.',
    field: 'gratitude',
    placeholder: 'List three things you are grateful for from today...',
    minHeight: 100
  },
  {
    n: 2,
    title: 'Petition',
    sub: 'Ask for the grace to see today truly.',
    body: 'A short prayer: "God, give me the eyes to see today as You saw it. Not what I want to see. Not the version that makes me feel good. The truth."',
    field: 'petition',
    placeholder: '(Optional) Write your own prayer asking for clarity...',
    minHeight: 80
  },
  {
    n: 3,
    title: 'Review',
    sub: 'Walk through your day.',
    body: 'From the moment you woke up to right now. Don\'t edit yet. Just remember. The conversations. The choices. The thoughts you returned to. Where did you feel close to God? Where did you feel far?',
    field: 'review',
    placeholder: 'Walk through what actually happened today...',
    minHeight: 140
  },
  {
    n: 4,
    title: 'Repent',
    sub: 'Where did you fall short? Where did you act in love?',
    body: 'Be specific. Not "I was a bad person" — but "I snapped at her when she asked about dinner." And on the other side: "I called my mum even though I didn\'t feel like it." Confess the first. Receive the second.',
    field: 'repent',
    placeholder: 'Be specific. Both the falls and the wins...',
    minHeight: 120
  },
  {
    n: 5,
    title: 'Renewal',
    sub: 'One resolution for tomorrow.',
    body: 'Not ten. One. Specific. Doable. "I will not check my phone before prayer." "I will text her first." "I will go to bed by 10:30." This is the seed. Plant it now.',
    field: 'renewal',
    placeholder: 'One specific thing I will do tomorrow...',
    minHeight: 80
  }
];

let _examenAnswers = {};

function startExamen(){
  _examenAnswers = {};
  showExamenStep(0);
}

function showExamenStep(idx){
  const step = examenStepFor(EXAMEN_STEPS[idx]);
  if(!step){ saveExamen(); return; }
  
  document.querySelector('.modal-bg.open')?.remove();
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  
  const isLast = idx === EXAMEN_STEPS.length - 1;
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<div style="display:flex;gap:4px;margin-bottom:12px">' +
      EXAMEN_STEPS.map((_, i) => '<div style="flex:1;height:3px;border-radius:2px;background:' + (i <= idx ? 'var(--go)' : 'var(--bd)') + '"></div>').join('') +
    '</div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px">Step ' + step.n + ' of 5</div>' +
    '<h3 style="margin-bottom:4px">' + step.title + '</h3>' +
    '<div style="font-family:Cormorant Garamond,serif;font-size:17px;color:var(--tx2);font-style:italic;margin-bottom:10px">' + step.sub + '</div>' +
    '<p style="font-size:13px;color:var(--tx3);line-height:1.65;margin-bottom:14px">' + step.body + '</p>' +
    '<textarea id="examen-input" placeholder="' + step.placeholder + '" style="min-height:' + step.minHeight + 'px;margin-bottom:14px">' + (_examenAnswers[step.field] || '') + '</textarea>' +
    '<div style="display:flex;gap:8px">' +
      (idx > 0 ? '<button class="btn" onclick="examenBack(' + idx + ')" style="flex:1;background:transparent;border:1px solid var(--bd)">Back</button>' : '') +
      '<button class="btn primary" onclick="examenNext(' + idx + ')" style="flex:2">' + (isLast ? 'Complete Examen' : 'Next →') + '</button>' +
    '</div>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:11px;margin-top:8px">Exit (progress lost)</button>' +
  '</div>';
  document.body.appendChild(m);
  setTimeout(() => document.getElementById('examen-input')?.focus(), 100);
}

function examenBack(idx){
  const step = examenStepFor(EXAMEN_STEPS[idx]);
  _examenAnswers[step.field] = document.getElementById('examen-input')?.value || '';
  showExamenStep(idx - 1);
}

function examenNext(idx){
  const step = examenStepFor(EXAMEN_STEPS[idx]);
  _examenAnswers[step.field] = document.getElementById('examen-input')?.value || '';
  showExamenStep(idx + 1);
}

function saveExamen(){
  // SAFETY GATE — the examen's fourth step asks where they fell short and tells them to be specific,
  // at the end of a day, in the one place the app actively pushes them to. It was the only free-text
  // soul surface with no gate: a disclosure here was met with a celebration haptic and "Rest in peace
  // tonight". Flag it on the record too, so safeJournal-style readers never hand it to a model.
  const _exText = Object.values(_examenAnswers || {}).filter(function(v){ return typeof v === 'string'; }).join(' ');
  const _exCrisis = (typeof journalCrisisOf === 'function') ? journalCrisisOf(_exText) : null;
  const log = ls('totry_examens') || [];
  log.unshift({
    flagged: !!_exCrisis,
    date: new Date().toLocaleDateString('en-AU'),
    ts: new Date().toISOString(),
    day: getDayCount(),
    ..._examenAnswers
  });
  if(typeof logEvent==='function') logEvent('examen_done');
  ls('totry_examens', log.slice(0, 1200)); // the examen is a reflection too — keep years of it
  // Saved first — their words are never lost — then meet them, instead of celebrating.
  if(typeof journalMeetCrisis === 'function' && journalMeetCrisis(_exCrisis)) return;
  if(typeof updateExamenCount === 'function') updateExamenCount();
  document.querySelector('.modal-bg.open')?.remove();
  
  // Show closing prayer
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
    '<div style="text-align:center;padding:14px 0">' +
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:8px">'+_examenNoun()+' Complete</div>' +
      '<div style="font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);font-style:italic;line-height:1.4;margin-bottom:14px">"'+_examenClose().q+'"</div>' +
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">'+_escFew(_examenClose().r)+'</div>' +
    '</div>' +
    '<div class="prayer-box" style="margin-bottom:14px"><div class="prayer-text">'+_escFew(((typeof _EVE_PRAYERS!=='undefined' && _EVE_PRAYERS[(typeof faithTradition==='function'?faithTradition():'secular')]) || _EVE_PRAYERS.secular).text)+'</div></div>' +
    '<button class="btn primary" onclick="closeModal(this)">Rest in peace tonight</button>' +
  '</div>';
  document.body.appendChild(m);
  haptic('celebrate');
  showToast('Examen logged', _examenClose().toast);
}

// ── EXAMEN HISTORY VIEWER ──────────────────────────────────────
function showExamenHistory(){
  const log = ls('totry_examens') || [];
  document.querySelector('.modal-bg.open')?.remove();
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  
  if(!log.length){
    m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
      '<h3 style="margin-bottom:8px">Past examens</h3>' +
      '<p class="empty-note">No examens logged yet. Begin one tonight — it builds the practice.</p>' +
      '<button class="btn" onclick="closeModal(this)">Close</button>' +
    '</div>';
    document.body.appendChild(m);
    return;
  }
  
  const itemsHtml = log.slice(0, 60).map((e, i) => {
    // Build a 1-line preview from any filled answer
    const previewSrc = e.gratitude || e.review || e.repent || e.renewal || e.petition || '';
    const preview = previewSrc.slice(0, 80) + (previewSrc.length > 80 ? '…' : '');
    return '<div onclick="showExamenDetail(' + i + ')" style="background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:12px 14px;margin-bottom:8px;cursor:pointer">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
        '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em">' + (e.date || (e.ts ? new Date(e.ts).toLocaleDateString('en-AU') : 'Earlier')) + ' · Day ' + (e.day || '?') + '</div>' +
        '<div style="font-size:14px;color:var(--tx3)">›</div>' +
      '</div>' +
      (preview ? '<div style="font-size:12px;color:var(--tx2);line-height:1.55;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + preview.replace(/</g,'&lt;') + '</div>' : '<div style="font-size:11px;color:var(--tx3);font-style:italic">No notes — just walked the steps</div>') +
    '</div>';
  }).join('');
  
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px">' + log.length + ' examen' + (log.length === 1 ? '' : 's') + ' walked</div>' +
    '<h3 style="margin-bottom:12px">Past examens</h3>' +
    '<div style="max-height:60vh;overflow-y:auto;padding-right:4px;margin-bottom:14px">' + itemsHtml + '</div>' +
    '<button class="btn" onclick="closeModal(this)">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}

function showExamenDetail(idx){
  const log = ls('totry_examens') || [];
  const e = log[idx];
  if(!e) return;
  document.querySelector('.modal-bg.open')?.remove();
  
  const labels = {
    gratitude: 'Gratitude',
    petition: 'Petition',
    review: 'Review',
    repent: 'Repent',
    renewal: 'Renewal'
  };
  
  let body = '';
  Object.keys(labels).forEach(k => {
    const val = (e[k] || '').trim();
    if(val){
      body += '<div style="margin-bottom:14px">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">' + labels[k] + '</div>' +
        '<div style="font-size:13px;color:var(--tx);line-height:1.65;white-space:pre-wrap">' + val.replace(/</g, '&lt;') + '</div>' +
      '</div>';
    }
  });
  if(!body) body = '<p class="empty-note">No written notes — just walked the steps with God.</p>';
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px">' + (e.date || (e.ts ? new Date(e.ts).toLocaleDateString('en-AU') : 'Earlier')) + ' · Day ' + (e.day || '?') + '</div>' +
    '<h3 style="margin-bottom:14px">Examen</h3>' +
    '<div style="max-height:60vh;overflow-y:auto;padding-right:4px;margin-bottom:14px">' + body + '</div>' +
    '<button class="btn" onclick="showExamenHistory()" style="margin-bottom:8px">Back to list</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:1px solid var(--bd)">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}

function updateExamenCount(){
  const el = document.getElementById('examen-count');
  if(el) el.textContent = (ls('totry_examens') || []).length;
}

// ── ACTIVITY HEATMAP ────────────────────────────────────────
// Last 13 weeks grid. Each cell = a day. Lit by activity level.
// Activity = journal entry + workout + evening reflection + examen + prayer + win
function computeDayActivity(){
  // Returns Map: 'DD/MM/YYYY' (au) → activity score
  const map = {};
  const addDate = (ts) => {
    if(!ts) return;
    const d = new Date(ts);
    if(isNaN(d.getTime())) return;
    const key = d.toLocaleDateString('en-AU');
    map[key] = (map[key] || 0) + 1;
  };
  (ls('totry_journal') || []).forEach(j => addDate(j.ts));
  (ls('totry_evenings') || []).forEach(e => addDate(e.ts));
  (ls('totry_mornings') || []).forEach(m => addDate(m.ts || m.createdAt));
  (ls('totry_workouts') || []).forEach(w => addDate(w.ts));
  (ls('totry_examens') || []).forEach(e => addDate(e.ts));
  (ls('totry_wins') || []).forEach(w => addDate(w.ts));
  (ls('totry_fight_log') || []).forEach(f => addDate(f.ts));
  (ls('totry_prayers') || []).forEach(p => addDate(p.createdAt));
  return map;
}

function renderActivityHeatmap(){
  const container = document.getElementById('activity-heatmap');
  if(!container) return;
  
  const activity = computeDayActivity();
  const weeks = 13;
  
  // Find start: 13 weeks ago, aligned to Monday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const dow = start.getDay() === 0 ? 7 : start.getDay(); // make Sun=7
  start.setDate(start.getDate() - (dow - 1)); // back to Monday of this week
  start.setDate(start.getDate() - (weeks - 1) * 7); // back N weeks
  
  // Build SVG
  const cellSize = 14;
  const gap = 3;
  const labelWidth = 22;
  const monthLabelHeight = 14;
  const svgWidth = labelWidth + weeks * (cellSize + gap);
  const svgHeight = monthLabelHeight + 7 * (cellSize + gap) + 4;
  
  let svg = '<svg aria-hidden="true" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" style="width:100%;max-width:' + svgWidth + 'px;display:block">';
  
  // Day labels (M W F)
  ['M', 'W', 'F'].forEach((lbl, i) => {
    const dayIdx = [0, 2, 4][i]; // Mon=0, Wed=2, Fri=4
    const y = monthLabelHeight + dayIdx * (cellSize + gap) + cellSize - 3;
    svg += '<text x="0" y="' + y + '" font-family="DM Mono, monospace" font-size="9" fill="var(--tx3)">' + lbl + '</text>';
  });
  
  // Month labels (along top, show start of each month)
  let lastMonth = -1;
  for(let w = 0; w < weeks; w++){
    const cellDate = new Date(start);
    cellDate.setDate(cellDate.getDate() + w * 7);
    const month = cellDate.getMonth();
    if(month !== lastMonth){
      const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month];
      svg += '<text x="' + (labelWidth + w * (cellSize + gap)) + '" y="' + (monthLabelHeight - 3) + '" font-family="DM Mono, monospace" font-size="9" fill="var(--tx3)">' + monthName + '</text>';
      lastMonth = month;
    }
  }
  
  // Cells
  for(let w = 0; w < weeks; w++){
    for(let d = 0; d < 7; d++){
      const cellDate = new Date(start);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      
      const x = labelWidth + w * (cellSize + gap);
      const y = monthLabelHeight + d * (cellSize + gap);
      
      // Don't render cells in the future
      if(cellDate > today){
        svg += '<rect x="' + x + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" rx="2" fill="var(--bg3)" opacity="0.3"/>';
        continue;
      }
      
      const key = cellDate.toLocaleDateString('en-AU');
      const score = activity[key] || 0;
      
      // Color buckets — green-gold scale
      let color;
      if(score === 0) color = 'rgba(255,255,255,0.04)';
      else if(score === 1) color = 'rgba(200,169,110,0.25)';
      else if(score === 2) color = 'rgba(200,169,110,0.5)';
      else if(score === 3) color = 'rgba(200,169,110,0.75)';
      else color = 'rgba(200,169,110,1)';
      
      const tooltip = cellDate.toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'}) + ' · ' + (score === 0 ? 'no activity' : score + ' log' + (score===1?'':'s'));
      svg += '<rect x="' + x + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" rx="2" fill="' + color + '" stroke="rgba(255,255,255,0.05)" stroke-width="0.5" style="cursor:pointer" onclick="showDayActivityDetail(\'' + key + '\')"><title>' + tooltip + '</title></rect>';
    }
  }
  
  svg += '</svg>';
  container.innerHTML = svg;
  
  // Legend
  const totalDays = Object.keys(activity).filter(k => {
    const [d,m,y] = k.split('/').map(n=>parseInt(n));
    const dt = new Date(y,m-1,d);
    return dt >= start && dt <= today;
  }).length;
  const totalCells = Math.min(weeks * 7, Math.ceil((today - start) / 86400000) + 1);
  const showupRate = totalCells > 0 ? Math.round((totalDays / totalCells) * 100) : 0;
  
  const legend = document.getElementById('activity-heatmap-legend');
  if(legend){
    legend.innerHTML = '<span>' + totalDays + '/' + totalCells + ' days · ' + showupRate + '% show-up</span>' +
      '<span style="display:flex;align-items:center;gap:4px">less' +
        ['rgba(255,255,255,0.04)','rgba(200,169,110,0.25)','rgba(200,169,110,0.5)','rgba(200,169,110,0.75)','rgba(200,169,110,1)']
          .map(c => '<span style="width:10px;height:10px;border-radius:2px;background:' + c + '"></span>').join('') +
        'more</span>';
  }
}

function showDayActivityDetail(dateKey){
  // dateKey is 'DD/MM/YYYY' au format
  // Collect every entry with this date
  const items = [];
  const matchDate = (ts) => ts && new Date(ts).toLocaleDateString('en-AU') === dateKey;
  
  (ls('totry_journal') || []).forEach(j => { if(matchDate(j.ts)) items.push({kind: 'Journal', text: j.text?.slice(0, 80), mood: j.mood}); });
  (ls('totry_evenings') || []).forEach(e => { if(matchDate(e.ts)) items.push({kind: 'Evening reflection', text: e.win || e.release || e.see || ''}); });
  (ls('totry_mornings') || []).forEach(m => { if(matchDate(m.ts || m.createdAt)) items.push({kind: 'Morning ritual', text: m.intention || m.gratitude || ''}); });
  // Unified: lifts AND cardio both count toward the week's training picture.
  (typeof getUnifiedTraining === 'function' ? getUnifiedTraining() : (ls('totry_workouts')||[])).forEach(t => {
    if(!matchDate(t.ts)) return;
    if(t.kind === 'cardio'){
      const d = t.distance ? (dFmt(t.distance) + ' ') : '';
      items.push({kind:'Cardio', text: (t.title||'Activity') + ' · ' + d + (t.durationMin? t.durationMin+'min':'')});
    } else {
      items.push({kind:'Workout', text: (t.title||'Workout') + ' · ' + (t.exercises||0) + ' exercises'});
    }
  });
  (ls('totry_examens') || []).forEach(e => { if(matchDate(e.ts)) items.push({kind: 'Examen', text: '5-step walked'}); });
  (ls('totry_wins') || []).forEach(w => { if(matchDate(w.ts)) items.push({kind: 'Win', text: w.text?.slice(0, 80)}); });
  (ls('totry_fight_log') || []).forEach(f => { if(matchDate(f.ts)) items.push({kind: f.won ? 'Fight won' : 'Fight lost', text: f.vice + (f.trigger ? ' · ' + f.trigger : '')}); });
  (ls('totry_prayers') || []).forEach(p => { if(matchDate(p.createdAt)) items.push({kind: 'Prayer added', text: p.text?.slice(0, 80)}); });
  // Nutrition logged that day
  const nutLog = (ls('totry_nutlog') || {})[dateKey];
  if(nutLog && nutLog.length){
    const cals = nutLog.reduce((s,e)=>s+(e.cal||0),0);
    const _n = nutLog.length + ' item' + (nutLog.length===1?'':'s');
    // Tapping a day in the heatmap is a back door to the same number gentle mode exists to hide.
    items.push({kind: 'Nutrition', text: (typeof nutGentle==='function' && nutGentle())
      ? (_n + ' logged') : (_n + ' \u00b7 ' + Math.round(cals) + ' cal')});
  }
  // Body / weight check-ins
  (ls('totry_body') || []).forEach(b => { if(matchDate(b.ts)) items.push({kind: 'Body check-in', text: (b.weight ? b.weight + 'kg' : '') + (b.win ? ' · ' + b.win.slice(0,50) : '')}); });
  // Measurements
  (ls('totry_measurements') || []).forEach(ms => { if(matchDate(ms.ts)) items.push({kind: 'Measurements', text: 'Snapshot logged'}); });
  // Daily trackers (sleep/steps/water)
  const trackers = (ls('totry_trackers') || {})[dateKey];
  if(trackers && (trackers.sleep || trackers.steps || trackers.water)){
    const parts = [];
    if(trackers.sleep) parts.push(trackers.sleep + 'h sleep');
    if(trackers.steps) parts.push((trackers.steps).toLocaleString() + ' steps');
    if(trackers.water) parts.push(trackers.water + ' water');
    items.push({kind: 'Trackers', text: parts.join(' · ')});
  }
  
  document.querySelector('.modal-bg.open')?.remove();
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  
  if(!items.length){
    m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
      '<div class="eyebrow">' + dateKey + '</div>' +
      '<h3 style="margin-bottom:8px">A quiet day</h3>' +
      '<p class="empty-note">Nothing logged this day. That\'s okay — rest is part of the rhythm.</p>' +
      '<button class="btn" onclick="closeModal(this)">Close</button>' +
    '</div>';
    document.body.appendChild(m);
    return;
  }
  
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px">' + dateKey + '</div>' +
    '<h3 style="margin-bottom:12px">' + items.length + ' thing' + (items.length===1?'':'s') + ' logged</h3>' +
    '<div style="max-height:55vh;overflow-y:auto;padding-right:4px;margin-bottom:14px">' +
      items.map(it => '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:8px;padding:10px;margin-bottom:6px">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">' + it.kind + '</div>' +
        (it.text ? '<div style="font-size:12px;color:var(--tx2);line-height:1.5">' + (it.mood ? it.mood + ' ' : '') + it.text.replace(/</g, '&lt;') + '</div>' : '') +
      '</div>').join('') +
    '</div>' +
    '<button class="btn" onclick="closeModal(this)">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}

// ── THREE GOOD THINGS ────────────────────────────────────────────────────────────────────────
// The validated PPI core (Seligman), with one deliberate change the evidence supports: the strongest
// form of gratitude is RELATIONAL. A private list moves the needle a little; telling a real person
// moves it more — and we chronically under-estimate how much it lands. So the third slot points at a
// person, and offers to carry it. No streak, no daily obligation, no scoring — three lines on the
// days you feel like it, and nothing at all on the days you don't.
function _tgtKey(){ return new Date().toLocaleDateString('en-AU'); }
function getTGT(d){ try{ const all=ls('totry_tgt')||{}; return all[d||_tgtKey()]||null; }catch(_){ return null; } }
function saveTGT(patch){
  try{
    const all=ls('totry_tgt')||{}; const k=_tgtKey();
    all[k]=Object.assign({ts:new Date().toISOString()}, all[k]||{}, patch);
    // keep it light — a season of entries, not a lifetime archive
    const keys=Object.keys(all); if(keys.length>120){ keys.sort(); delete all[keys[0]]; }
    ls('totry_tgt', all);
  }catch(_){}
}
function _tgtSaveField(which, val){
  const v=String(val||'').trim().slice(0,160);
  const cur=getTGT()||{};
  if(cur[which]===v) return;
  const patch={}; patch[which]=v; saveTGT(patch);
  // Do NOT re-render on every keystroke-or-blur. renderTGT() rebuilds the whole block via innerHTML,
  // which replaces all three inputs — so tabbing from the first field to the second destroyed the
  // field you were moving to and dropped focus. Writing three short lines meant tapping six times.
  // The only structural change is the "Tell them" button appearing once the person field has text,
  // so re-render only when that condition actually flips.
  try{
    const wasTellable = !!(cur.c && String(cur.c).trim());
    const nowTellable = !!((which==='c' ? v : cur.c) && String(which==='c' ? v : cur.c).trim());
    if(wasTellable !== nowTellable) renderTGT();
  }catch(_){}
}
function renderTGT(){
  const el=document.getElementById('tgt-body'); if(!el) return;
  const t=getTGT()||{};
  const few=(typeof getYourFew==='function')?getYourFew().filter(function(p){return p&&!yourFewMuted(p);}):[];
  const person=(t.person||'').trim();
  const field=function(id,ph,val){
    return '<input type="text" id="'+id+'" maxlength="160" placeholder="'+ph+'" value="'+_escFew(val||'')+'" '+
      /* onblur alone — onchange also fires on blur for a text input, so both meant a double save. */
      'onblur="_tgtSaveField(\''+id.replace('tgt-','')+'\',this.value)" '+
      'style="width:100%;margin-bottom:8px;padding:9px 11px;font-size:16px;background:var(--bg3);border:1px solid var(--bd);border-radius:9px;color:var(--tx)">';
  };
  const told = !!t.told;
  el.innerHTML =
    '<div style="font-size:12px;color:var(--tx3);line-height:1.55;margin-bottom:10px">Three things that went right today, however small. Not a gratitude exercise to perform — just three true things, so the day isn’t only remembered by what went wrong.</div>'+
    field('tgt-a','Something that went right…', t.a)+
    field('tgt-b','Something else…', t.b)+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.1em;text-transform:uppercase;margin:10px 0 5px">And one that was a person</div>'+
    field('tgt-c','Someone who made today better…', t.c)+
    (few.length
      ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 8px">'+
          few.slice(0,5).map(function(p){ const on=(person===p.name);
            return '<button class="btn" onclick="_tgtPickPerson(\''+String(p.name).replace(/'/g,"\\'").replace(/"/g,'')+'\')" style="width:auto;padding:5px 10px;font-size:11.5px;background:'+(on?'var(--go-bg)':'transparent')+';border:1px solid '+(on?'var(--go-bd)':'var(--bd)')+';color:'+(on?'var(--go)':'var(--tx3)')+'">'+_escFew(p.name)+'</button>'; }).join('')+
        '</div>'
      : '')+
    ((t.c && t.c.trim())
      ? (told
          ? '<div style="font-size:12px;color:var(--gr);line-height:1.5;margin-top:4px">✓ You told them. That’s the part that actually lands.</div>'
          : '<button class="btn" onclick="_tgtTellThem()" style="margin-top:4px;background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go);font-size:12.5px">Tell them →</button>'+
            '<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-top:6px">Saying it out loud is worth more than writing it down. They’ll take it better than you expect — people almost always do.</div>')
      : '');
}
function _tgtPickPerson(name){ saveTGT({person:String(name||'').slice(0,40)}); try{ renderTGT(); }catch(_){} }
// Hands them the words and gets out of the way. Counts as a real reach-out, because it is one.
function _tgtTellThem(){
  const t=getTGT()||{};
  const who=(t.person||'').trim();
  const what=(t.c||'').trim();
  if(!what) return;
  const msg = who
    ? (who+' — just so you know: '+what.charAt(0).toLowerCase()+what.slice(1)+'. Thought you should hear it.')
    : ('Just so you know: '+what.charAt(0).toLowerCase()+what.slice(1)+'. Thought you should hear it.');
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);margin-bottom:8px">Send it as it is.</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:12px">Edit it if you want — but plain and unpolished lands better than clever. Copy it, then send it in whatever you normally use.</div>'+
    '<textarea id="tgt-msg" style="min-height:92px;font-size:16px;line-height:1.55;margin-bottom:12px">'+_escFew(msg)+'</textarea>'+
    '<button class="btn primary" style="margin-bottom:8px" onclick="_tgtCopyAndDone()">Copy &amp; mark as told</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not yet</button>'+
  '</div>';
  document.body.appendChild(m);
  setTimeout(function(){ const a=document.getElementById('tgt-msg'); if(a) a.focus(); },60);
}
function _tgtCopyAndDone(){
  const a=document.getElementById('tgt-msg');
  const txt=a?a.value:'';
  try{ if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt); }catch(_){}
  saveTGT({told:true});
  const who=((getTGT()||{}).person||'').trim();
  if(who && typeof logReachOut==='function'){ try{ logReachOut(who); }catch(_){} }
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  try{ if(typeof haptic==='function') haptic('celebrate'); }catch(_){}
  try{ showToast('Copied','Now go send it. That one message is worth more than the whole list.'); }catch(_){}
  try{ renderTGT(); }catch(_){}
}

function completeEvening(){
  const _todayStrForBurns = () => new Date().toLocaleDateString('en-AU');
  const win=document.getElementById('evening-win')?.value.trim()||'';
  const release=document.getElementById('evening-release')?.value.trim()||'';
  // The heaviest question ("if the people you love watched today, what would they see?"). It used
  // to be saved to an orphan store nothing ever read. Now it lives on the evening record — synced,
  // shown back in the journal, and given to the brother's context so the answer actually serves him.
  const see=document.getElementById('evening-see')?.value.trim()||'';
  // Same gate as the journal. "If the people you love watched today, what would they see?" is the
  // heaviest question the app asks, and it was ungated — the answer went straight into the coach's
  // context (see honestCtx in buildCtx) and was narrated back to a model afterwards.
  let _evCrisis = null;
  try{ if(typeof detectCrisis === 'function') _evCrisis = detectCrisis([win, release, see].filter(Boolean).join(' ')); }catch(_){ }
  const t1=document.getElementById('eve-task1')?.value.trim()||'';
  const t2=document.getElementById('eve-task2')?.value.trim()||'';
  const t3=document.getElementById('eve-task3')?.value.trim()||'';
  const tasks=[t1,t2,t3].filter(Boolean);
  if(tasks.length)ls('totry_tomorrow_tasks',{tasks,date:new Date().toLocaleDateString('en-AU'),ts:new Date().toISOString()});
  // Steps entered at night (from the user's watch) — store where the rest of the app reads them.
  const stepsVal=parseInt(document.getElementById('evening-steps')?.value||'0');
  if(stepsVal>0){ ls('totry_today_steps', stepsVal); try{ const _tr=ls('totry_trackers')||{}; const _dk=new Date().toLocaleDateString('en-AU'); if(!_tr[_dk])_tr[_dk]={water:0,sleep:0,steps:0}; _tr[_dk].steps=stepsVal; ls('totry_trackers',_tr); }catch(_){} }
  // Apple Watch rings, entered at a glance. Move = active calories → feed the burn ledger so it
  // affects the nutrition net (idempotent via its own per-day key, like Strava/strength).
  const moveCal=parseInt(document.getElementById('evening-move')?.value||'0')||0;
  const exMin=parseInt(document.getElementById('evening-exercise')?.value||'0')||0;
  const standHrs=parseInt(document.getElementById('evening-stand')?.value||'0')||0;
  const totalBurn=parseInt(document.getElementById('evening-total-burn')?.value||'0')||0;
  const rings = (moveCal||exMin||standHrs||totalBurn) ? {move:moveCal||null, exercise:exMin||null, stand:standHrs||null, total:totalBurn||null} : null;
  try{
    if(moveCal>0){
      // Watch "Move" is whole-day active energy that ALREADY includes any logged/synced workout.
      // Write it only to the watch sub-ledger; reconcileBurns() makes it SUPERSEDE the per-session
      // estimates for the day (max), instead of stacking on top (which double-counted the workout).
      const prevWatch = ls('totry_watch_burns_byday')||{};
      prevWatch[_todayStrForBurns()] = moveCal;
      ls('totry_watch_burns_byday', prevWatch);
      reconcileBurns();
    }
  }catch(_){ }
  const goalsHit=window.__goalsHit||null;
  const log=ls('totry_evenings')||[];
  const _todayStr=new Date().toLocaleDateString('en-AU');
  const entry={date:new Date().toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'}),day:getDayCount(),rating:dayRating,win,release,see,flagged:!!_evCrisis,tasks,steps:stepsVal||null,rings,goalsHit,ts:new Date().toISOString()};
  // Editable until midnight: replace today's existing entry rather than stacking duplicates.
  const _exIdx=log.findIndex(e=>e.ts && new Date(e.ts).toLocaleDateString('en-AU')===_todayStr);
  if(_exIdx>=0) log[_exIdx]=entry; else log.unshift(entry);
  if(typeof logEvent==='function') logEvent('evening_done');
  ls('totry_evenings',log.slice(0,1200)); // keep years of reflections, not ~3 months — his honest evenings shouldn't silently vanish
  // Evening check-in is now done → re-run auto-tick so the evening habit (hidden from the tick
  // list because you're doing it right now) lands ticked, plus anything else logged today.
  if(typeof autoTickHabits === 'function') autoTickHabits();
  if(typeof renderHomeHabits === 'function') renderHomeHabits();
  // Has the examen been done today? It's the closing act — if not done, gently point there
  // instead of falsely declaring the day complete.
  const today=new Date().toLocaleDateString('en-AU');
  const examenToday=(ls('totry_examens')||[]).some(e=>e.ts && new Date(e.ts).toLocaleDateString('en-AU')===today);
  const done=document.getElementById('evening-done');

  // THE CRISIS RESPONSE FIRES FIRST, AND UNCONDITIONALLY.
  // It used to live inside the !examenToday branch below — the one that ends in `return;` — so whether a
  // person disclosing something serious got the crisis card depended on whether they had already ticked
  // an unrelated evening ritual. Examen done: no card at all, a success haptic, and a "Want to share
  // today?" prompt two seconds later. That is the app celebrating on top of a disclosure.
  // Nothing about someone's state should be conditional on their streak bookkeeping.
  if(_evCrisis){
    try{
      document.querySelectorAll('.modal-bg:not([id])').forEach(function(m){ m.remove(); });
      const _m = document.createElement('div');
      _m.className = 'modal-bg open';
      _m.style.alignItems = 'center';
      _m.innerHTML = '<div class="modal" style="max-width:92vw"><div class="modal-handle"></div>' +
        '<div id="evening-crisis-slot"></div>' +
        '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12px;margin-top:10px">Close</button></div>';
      document.body.appendChild(_m);
      if(typeof showCrisisResponse === 'function') showCrisisResponse('evening-crisis-slot', _evCrisis);
    }catch(_){ }
    if(typeof haptic==='function') haptic('warning');
    if(typeof showToast==='function') showToast('Reflection saved','I read what you wrote. Please look at this.');
    return;                       // no examen nudge, no completion, no share prompt on top of this
  }

  if(!examenToday){
    haptic('tap');
    // Save the reflection, but the day isn't fully closed until the examen is done.
    // The examen lives on the LAST step now, not further down one long page. "Scroll up to begin it"
    // sent people looking the wrong way, and scrollIntoView on a card whose step has hidden it does
    // nothing at all — so the nudge pointed at something that was not on the screen. Take them there.
    const _panel = document.getElementById('reflect-panel-evening');
    const _stepped = !!(_panel && _panel.classList.contains('stepped'));
    const card = document.getElementById('examen-card');
    const _holder = card && card.closest('[data-mstep]');
    if(_stepped && _holder){
      if(typeof showToast==='function') showToast('Reflection saved','One last thing \u2014 your examen closes the day.');
      if(typeof eveningStep === 'function') eveningStep(Number(_holder.getAttribute('data-mstep')));
    } else {
      if(typeof showToast==='function') showToast('Reflection saved','One last thing \u2014 your examen closes the day. Scroll up to begin it.');
      if(card) card.scrollIntoView({behavior:'smooth',block:'center'});
    }
    if(card){ card.style.boxShadow='0 0 0 2px var(--go-bd)'; setTimeout(()=>{card.style.boxShadow='';},2000); }
    return;
  }
  if(done){
    done.style.display='block';
    if(typeof eveningFinished==='function') eveningFinished();
    done.scrollIntoView({behavior:'smooth'});
  }
  haptic('success');
  // Offer share card now that the day is genuinely complete (reflection + examen).
  setTimeout(()=>{
    askConfirm('Day closed.', 'Reflection and examen both done. Want a card to share it?',
      { confirmLabel:'Make a card', cancelLabel:'Not tonight', danger:false })
      .then(function(ok){ if(ok) generateShareCard(); });
  },2000);
}
function initEveningTab(){
  // The Ignatian Examen is Catholic; other paths keep the universal journal + wins + rating.
  // THE EVENING REVIEW IS UNIVERSAL — it was being HIDDEN for 4 of 5 traditions with nothing in its
  // place, which quietly removed the closing ritual of the day from most users. Every tradition has
  // this same nightly move; only the name and the words change. Ignatian examen ↔ Islamic muhasaba
  // ↔ Hindu/Buddhist evening reflection ↔ Seneca's Stoic review. Same 5 steps, attributed honestly.
  try{ applyFaithExamen(); }catch(_){}
  try{ if(typeof applyFaithReflect==='function') applyFaithReflect(); }catch(_){}
  const h=new Date().getHours();const el=document.getElementById('evening-eyebrow');
  if(el)el.textContent=(userName?userName+', ':'')+'the day winds down';
  // Close the arc: if a morning intention was set today, reflect it back here.
  try{
    const _t=new Date().toLocaleDateString('en-AU');
    const _m=(ls('totry_mornings')||[]).find(x=>x.ts&&new Date(x.ts).toLocaleDateString('en-AU')===_t);
    const _recall=document.getElementById('evening-intention-recall');
    const _txt=document.getElementById('evening-intention-text');
    if(_m&&_m.intention&&_m.intention.trim()&&_recall&&_txt){ _txt.textContent='\u201c'+_m.intention.trim()+'\u201d'; _recall.style.display='block'; }
    else if(_recall){ _recall.style.display='none'; }
  }catch(_){}
  // The winning man sees his evidence: reflect the day he ACTUALLY lived, from the whole-life data,
  // so looking back is grounded in what he really did \u2014 not a blank recall. Grace over shame.
  try{
    const _au=new Date().toLocaleDateString('en-AU');
    const _isToday=(ts)=> ts && new Date(ts).toLocaleDateString('en-AU')===_au;
    const ev=[];
    if((ls('totry_mornings')||[]).some(m=>_isToday(m.ts))) ev.push('\ud83c\udf05 Set your intention');
    if((ls('totry_workouts')||[]).some(w=>_isToday(w.ts))) ev.push('\ud83d\udcaa Trained');
    const _meals=((ls('totry_nutlog')||{})[_au]||[]).length; if(_meals) ev.push('\ud83c\udf7d Logged '+_meals+' meal'+(_meals>1?'s':''));
    const _wins=(ls('totry_feeling_wins')||[]).filter(w=>_isToday(w.ts)).length; if(_wins) ev.push('\ud83d\udee1 Outlasted '+_wins+' urge'+(_wins>1?'s':''));
    if((ls('totry_prayers')||[]).some(p=>_isToday(p.createdAt || p.ts))) ev.push('\ud83d\ude4f Prayed');
    const _tr=(ls('totry_trackers')||{})[_au]||{}; if(_tr.steps>=1000) ev.push('\ud83d\udc5f '+Number(_tr.steps).toLocaleString()+' steps');
    const _box=document.getElementById('evening-day-evidence');
    const _list=document.getElementById('evening-day-evidence-list');
    if(_box&&_list){
      if(ev.length){ _list.innerHTML=ev.map(e=>'<span style="font-size:12.5px;color:var(--tx);background:var(--bg3);border:1px solid var(--bd);border-radius:999px;padding:5px 11px;white-space:nowrap">'+e+'</span>').join(''); _box.style.display='block'; }
      else { _box.style.display='none'; }
    }
  }catch(_){}
  // Editable until midnight: if today's evening reflection is already saved, prefill the fields so
  // the user can adjust it as the day finishes (e.g. steps added later) rather than starting blank
  // or creating a duplicate. completeEvening() updates today's entry in place.
  try{
    const today=new Date().toLocaleDateString('en-AU');
    const todays=(ls('totry_evenings')||[]).find(e=>e.ts && new Date(e.ts).toLocaleDateString('en-AU')===today);
    if(todays){
      const setv=(id,v)=>{const n=document.getElementById(id); if(n&&v!=null&&n.value==='') n.value=v;};
      setv('review-proud', todays.win);
      setv('review-release', todays.release);
      setv('evening-steps', todays.steps);
      if(todays.rings){ setv('evening-move', todays.rings.move); setv('evening-exercise', todays.rings.exercise); setv('evening-stand', todays.rings.stand); setv('evening-total-burn', todays.rings.total); }
      if(todays.tasks){ setv('tomorrow-1', todays.tasks[0]); setv('tomorrow-2', todays.tasks[1]); setv('tomorrow-3', todays.tasks[2]); }
    }
  }catch(_){ }
  const ps=document.getElementById('partner-section');
  // Respect an EXPLICIT off (Settings → Someone you love). Having people in your few must never
  // silently override a choice the person deliberately made.
  const _pref = ls('totry_partner');
  const _fewOn = (_pref === false) ? false : (_pref || (typeof getYourFew==='function' && getYourFew().length>0));
  if(_fewOn && ps){
    ps.style.display='block';const day=getDayCount();
    if(typeof renderReachOutCard==='function'){ renderReachOutCard(); }
    else { const cp=document.getElementById('call-prompt'); if(cp) cp.textContent=CALL_PROMPTS[day%CALL_PROMPTS.length]; }
    const sp=document.getElementById('shared-prayer');if(sp){const _sps=sharedPrayers();sp.textContent=_sps[day%_sps.length];}
  }
  try{ renderOnThisDay(); }catch(_){}
  try{ renderTGT(); }catch(_){}
  if(typeof updateExamenCount === 'function') updateExamenCount();
  try{ renderTGT(); }catch(_){}
  if(typeof updateExamenCount === 'function') updateExamenCount();
  // Reflect today's examen state — if done, show the green confirmation in the card.
  const today=new Date().toLocaleDateString('en-AU');
  const examenToday=(ls('totry_examens')||[]).some(e=>e.ts && new Date(e.ts).toLocaleDateString('en-AU')===today);
  const edt=document.getElementById('examen-done-today');
  if(edt) edt.style.display = examenToday ? 'block' : 'none';
}

// ── YOUR FEW — the people you carry, and the noticing reach-out ───────────────
// Real relatedness is the single biggest lever the research found for lasting change: a presence that
// NOTICES whether you showed up — for the people you love. "Your few" holds the names (any title);
// the card names ONE real person, carries the appreciation-gap reframe (we chronically UNDER-estimate
// how welcome a lapsed check-in is — the gap is largest exactly when it's been a while), adapts to sex
// (shoulder-to-shoulder activity framing for men), and lets you log the reach-out as the win it is.
function _escFew(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function getYourFew(){ try{ const a=ls('totry_your_few'); return Array.isArray(a)?a:[]; }catch(_){ return []; } }
function saveYourFew(a){
  try{
    ls('totry_your_few', (a||[]).slice(0,12));
    // Turn the evening reach-out on for a FIRST-time user — but NEVER override an explicit choice.
    // If they've deliberately switched it off in Settings, adding a person must not silently re-arm it.
    const pref = ls('totry_partner');
    if((a||[]).length && (pref===null || pref===undefined)) ls('totry_partner', true);
  }catch(_){}
}
// Some people in your few can't be reached — someone who died, someone you're estranged from, someone
// it isn't safe to contact. They still belong here: they can be the WHY you're doing this. So a person
// can be carried without ever being nudged about. Nothing in this app should cheerfully tell a grieving
// person to text someone who is gone.
function yourFewMuted(p){ return !!(p && p.mute); }
function toggleFewMute(idx){
  const few=getYourFew(); if(!few[idx]) return;
  few[idx].mute = !few[idx].mute;
  saveYourFew(few);
  const m=document.getElementById('yourfew-modal'); if(m) m.remove();
  openYourFew();
  try{ showToast(few[idx].mute?'Held quietly':'Reminders on', few[idx].mute?'They stay part of your why — I just won’t nudge you to reach out.':'I’ll gently remind you again.'); }catch(_){}
}
function muteCurrentReachOut(){
  const s=(typeof reachOutSuggestion==='function')?reachOutSuggestion():null; if(!s||!s.person) return;
  const few=getYourFew(); const i=few.findIndex(function(p){ return p&&p.name===s.person.name; });
  if(i>=0){ few[i].mute=true; saveYourFew(few); }
  try{ showToast('Held quietly','They stay part of your why — I won’t nudge you about them.'); }catch(_){}
  try{ renderReachOutCard(); }catch(_){}
}
function _reachOutLog(){ try{ const a=ls('totry_reachouts'); return Array.isArray(a)?a:[]; }catch(_){ return []; } }
function daysSinceReachOut(name){
  const rs=_reachOutLog().filter(function(r){return r&&r.name===name&&r.ts;});
  if(!rs.length) return null;
  const last=Math.max.apply(null, rs.map(function(r){return new Date(r.ts).getTime();}));
  return Math.floor((Date.now()-last)/86400000);
}
function logReachOut(name){
  try{ const rs=_reachOutLog(); rs.unshift({name:name, ts:new Date().toISOString()}); ls('totry_reachouts', rs.slice(0,300)); }catch(_){}
  try{ if(typeof haptic==='function') haptic('celebrate'); }catch(_){}
  try{ showToast('That mattered', 'Showing up for the people you love is the whole point — well done.'); }catch(_){}
  try{ renderReachOutCard(); }catch(_){}
}
function logReachOutCurrent(){ const s=reachOutSuggestion(); if(s&&s.person) logReachOut(s.person.name); }
function pickReachOutPerson(){
  const few=getYourFew().filter(function(p){ return p && !yourFewMuted(p); });
  if(!few.length) return null;
  // Longest since you reached out wins; never-contacted ranks first (the biggest gap). Ties break by
  // the person added LONGEST ago rather than always naming whoever happens to sit first in the list.
  let best=null, bestScore=-1;
  few.forEach(function(p){
    const d=daysSinceReachOut(p.name);
    const score=(d==null)?1e9:d;
    if(score>bestScore){ bestScore=score; best=p; }
  });
  return best;
}
// Two ways in: shoulder-to-shoulder (do something together) and face-to-face (say something).
// Research finds men more often reconnect through a shared ACTIVITY — but that's a tendency, not a
// rule, and how someone loves people isn't decided by a field we collected for calorie maths. So
// everyone gets both kinds, rotating; sex only nudges which one comes up first.
const _REACH_ACTIVITY=[
  'see if {name} is free this week — a walk, a coffee, a session. Doing something side by side beats a big talk.',
  'ask {name} to do the thing you both used to do. No agenda, just time.',
  'send {name} something that made you think of them — a clip, a track, a memory.',
];
function reachOutSuggestion(){
  const p=pickReachOutPerson(); if(!p) return null;
  const d=daysSinceReachOut(p.name);
  const day=(typeof getDayCount==='function')?getDayCount():0;
  // Alternate between doing-something-together and saying-something. Everyone gets both; a man just
  // starts on the activity side, and anyone can be met either way on any given day.
  const leansActivity = (typeof userSex==='function' && userSex()==='male') ? (day%2===0) : (day%3===0);
  const prompt = leansActivity ? _REACH_ACTIVITY[day%_REACH_ACTIVITY.length] : CALL_PROMPTS[day%CALL_PROMPTS.length];
  // the appreciation-gap reframe — only when it's been a while (or never), where the gap is largest
  const stale=(d==null || d>=5);
  const reframe = stale ? 'You’ll probably feel it’s awkward, or that they don’t need to hear from you. They will — far more than you expect, and more <em>because</em> it’s been a while. Reaching out is almost never regretted.' : '';
  return { person:p, days:d, prompt:prompt, reframe:reframe };
}
function renderReachOutCard(){
  const cp=document.getElementById('call-prompt'); if(!cp) return;
  const few=getYourFew();
  if(!few.length){
    cp.innerHTML='<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:10px">Who are you doing this for? Add the people you carry — and the app will help you stay close to them.</div>'+
      '<button class="btn" style="width:auto;padding:7px 14px;font-size:12px" onclick="openYourFew()">Add someone</button>';
    return;
  }
  const s=reachOutSuggestion(); if(!s){ cp.textContent=''; return; }
  const nm=_escFew(s.person.name);
  let line;
  if(s.prompt.indexOf('{name}')>=0){ line=_escFew(s.prompt).replace(/\{name\}/g,'<b>'+nm+'</b>'); }
  else { line='<b>'+nm+'</b> — '+_escFew(s.prompt); }
  const dtxt = (s.days==null)?'':(s.days===0?'you reached out today':(s.days===1?'1 day since you last reached out':s.days+' days since you last reached out'));
  // The remembered detail comes FIRST — it's the difference between "reach out" and knowing someone.
  const noteLine = (s.person.note && s.person.note.trim())
    ? '<div style="font-size:12.5px;color:var(--go);line-height:1.55;margin-bottom:6px">You wanted to remember: '+_escFew(s.person.note.trim())+'</div>'
    : '';
  cp.innerHTML =
    noteLine+
    '<div style="font-size:13px;color:var(--tx);line-height:1.6;margin-bottom:6px">'+line+'</div>'+
    (s.reframe?'<div style="font-size:12px;color:var(--tx3);line-height:1.55;margin-bottom:10px;font-style:italic">'+s.reframe+'</div>':'')+
    (dtxt?'<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);letter-spacing:0.04em;margin-bottom:10px">'+dtxt+'</div>':'')+
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
      '<button class="btn" style="width:auto;padding:7px 14px;font-size:12px;background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go)" onclick="logReachOutCurrent()">I reached out ✓</button>'+
      '<button class="btn" style="width:auto;padding:7px 12px;font-size:12px" onclick="openYourFew()">Your few</button>'+
      '<button class="btn" style="width:auto;padding:7px 12px;font-size:12px" onclick="openBlessing()">'+(((typeof faithTradition==='function')&&(faithTradition()==='buddhism'||faithTradition()==='secular'))?'Wish them well':'Pray for them')+'</button>'+
      // For someone who has died, or who it isn't safe or possible to contact — carried, never nudged.
      '<button class="btn" style="width:auto;padding:7px 10px;font-size:12px;background:transparent;border:none;color:var(--tx3)" onclick="muteCurrentReachOut()">Not this one</button>'+
    '</div>';
}
function openYourFew(){
  const few=getYourFew();
  const rows = few.length ? few.map(function(p,i){ return
    '<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--bd)">'+
      '<div style="flex:1;min-width:0"><div style="font-size:14px;color:var(--tx)">'+_escFew(p.name)+'</div>'+
      // The note is the whole point: "she mentioned the surgery — ask how it went". Remembering the
      // specific thing is what turns a generic nudge into actually knowing someone.
      '<input type="text" value="'+_escFew(p.note||'')+'" maxlength="90" placeholder="what to remember — e.g. ask about her surgery" '+
        'onchange="_yfNote('+i+',this.value)" onblur="_yfNote('+i+',this.value)" '+
        'style="width:100%;margin:4px 0 0;padding:5px 7px;font-size:16px;background:var(--bg3);border:1px solid var(--bd);border-radius:7px;color:var(--tx2)">'+
      (function(){ if(yourFewMuted(p)) return '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);letter-spacing:0.04em;margin-top:3px">held quietly · no reminders</div>'; const d=daysSinceReachOut(p.name); return d==null?'':'<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);letter-spacing:0.04em;margin-top:3px">'+(d===0?'reached out today':d+'d since you logged one')+'</div>'; })()+
      '</div>'+
      '<button class="btn" style="width:auto;padding:5px 8px;font-size:11px;color:var(--tx3)" title="Carry them without reminders" onclick="toggleFewMute('+i+')">'+(yourFewMuted(p)?'🔔':'🔕')+'</button>'+
      '<button class="btn" style="width:auto;padding:5px 10px;font-size:11px;color:var(--tx3)" onclick="_yfRemove('+i+')">Remove</button>'+
    '</div>'; }).join('') : '<div style="font-size:12px;color:var(--tx3);padding:8px 0">No one yet. Add the people you carry.</div>';
  const m=document.createElement('div'); m.className='modal-bg open'; m.id='yourfew-modal';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<h3 style="margin-bottom:4px">Your few</h3>'+
    '<div style="font-size:12px;color:var(--tx3);line-height:1.5;margin-bottom:14px">The people you carry — a partner, a parent, a friend, anyone. Private to you. The app helps you stay close to them; it never nags, never scores. Tap 🔕 for someone you want to carry <em>without</em> reminders — someone you’ve lost, or who it isn’t right to contact. They stay part of your why.</div>'+
    '<div id="yf-list">'+rows+'</div>'+
    '<div style="display:flex;gap:8px;margin-top:14px">'+
      '<input type="text" id="yf-name" placeholder="Name" maxlength="40" style="flex:1">'+
      '<button class="btn primary" style="width:auto;padding:8px 16px" onclick="_yfAdd()">Add</button>'+
    '</div>'+
    '<button class="btn" style="margin-top:12px;background:transparent;border:none;color:var(--tx3)" onclick="closeYourFew()">Done</button>'+
  '</div>';
  m.addEventListener('click', function(e){ if(e.target===m) closeYourFew(); });
  // Every close path must go through closeYourFew, or the card behind it goes stale (still saying
  // "Add someone" after you just added three people). Backdrop, grab-handle and Esc all route here.
  try{ const h=m.querySelector('.modal-handle'); if(h){ h.style.cursor='pointer'; h.addEventListener('click', closeYourFew); } }catch(_){}
  m._yfEsc = function(e){ if(e.key==='Escape') closeYourFew(); };
  document.addEventListener('keydown', m._yfEsc);
  document.body.appendChild(m);
  setTimeout(function(){ const i=document.getElementById('yf-name'); if(i) i.focus(); }, 80);
}
function _yfAdd(){
  const i=document.getElementById('yf-name'); const name=i?i.value.trim():''; if(!name) return;
  const few=getYourFew();
  if(few.length>=12){ try{ showToast('That’s a full few','This is meant to be the handful you carry closest — remove someone first.'); }catch(_){} return; }
  if(few.some(function(p){ return p && p.name.toLowerCase()===name.toLowerCase(); })){ try{ showToast('Already here', name+' is already one of your few.'); }catch(_){} if(i) i.value=''; return; }
  few.push({name:name.slice(0,40), note:''}); saveYourFew(few);
  const m=document.getElementById('yourfew-modal'); if(m) m.remove(); openYourFew();
}
function _yfRemove(idx){ const few=getYourFew(); few.splice(idx,1); saveYourFew(few); const m=document.getElementById('yourfew-modal'); if(m) m.remove(); openYourFew(); }
// Saved quietly in place — no Save button, no modal rebuild, so typing a note never costs you your spot.
function _yfNote(idx, val){
  const few=getYourFew(); if(!few[idx]) return;
  const v=String(val||'').trim().slice(0,90);
  if(few[idx].note===v) return;
  few[idx].note=v; saveYourFew(few);
  try{ renderReachOutCard(); }catch(_){}
}
function closeYourFew(){
  const m=document.getElementById('yourfew-modal');
  if(m){ try{ if(m._yfEsc) document.removeEventListener('keydown', m._yfEsc); }catch(_){} m.remove(); }
  try{ renderReachOutCard(); }catch(_){}
  try{ const ps=document.getElementById('partner-section'); const pref=ls('totry_partner'); if(ps && pref!==false && (pref||getYourFew().length)) ps.style.display='block'; }catch(_){}
}

// ── WEEKLY REVIEW ─────────────────────────────────────────────
function initReviewTab(){
  try{ if(typeof applyFaithReflect==='function') applyFaithReflect(); }catch(_){}
  loadV();const tw=vices.reduce((a,v)=>a+(v.w||0),0);
  const ws=document.getElementById('week-stats');
  if(ws){ws.innerHTML='';[{num:getDayCount(),lbl:'Day'},{num:tw,lbl:'Vice wins'},{num:getStreak(),lbl:'Habits this week'}].forEach(s=>{const m=document.createElement('div');m.className='week-stat';m.innerHTML='<div class="ws-num">'+s.num+'</div><div class="ws-lbl">'+s.lbl+'</div>';ws.appendChild(m);});}
  renderReviewHistory();
}
function saveWeeklyReview(){
  const proud=document.getElementById('review-proud')?.value.trim()||'';
  const focus=document.getElementById('review-focus')?.value.trim()||'';
  const reviews=ls('totry_reviews')||[];
  reviews.unshift({week:'Week of '+new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}),day:getDayCount(),proud,focus,ts:new Date().toISOString()});
  ls('totry_reviews',reviews.slice(0,52));
  const rp=document.getElementById('review-proud');if(rp)rp.value='';
  const rf=document.getElementById('review-focus');if(rf)rf.value='';
  renderReviewHistory();
  const btn=document.querySelector('#tab-review .btn.primary');
  if(btn){btn.textContent='Week logged \u2713';setTimeout(()=>{btn.textContent='Complete this week\'s review';},2000);}
}
function renderReviewHistory(){
  const reviews=ls('totry_reviews')||[];const hist=document.getElementById('review-history');if(!hist)return;
  hist.innerHTML='';if(!reviews.length)return;
  hist.innerHTML='<div class="lbl" style="margin-top:8px">Past reviews</div>';
  reviews.slice(0,8).forEach(r=>{const item=document.createElement('div');item.className='review-item';item.innerHTML='<div class="ri-week">'+r.week+' \u2014 Day '+r.day+'</div><div style="font-size:13px;color:var(--tx);margin-bottom:2px">'+r.proud+'</div><div style="font-size:12px;color:var(--tx3)">Focus: '+r.focus+'</div>';hist.appendChild(item);});
}

// ── MILESTONES + TOAST ────────────────────────────────────────
function checkMilestones(){
  const day=getDayCount();const achieved=ls('totry_ms')||[];
  const dayMsgs={7:'7 days. One full week of choosing differently.',14:'Two weeks in. The habits are forming.',30:'30 days. Most people never make it here.',60:'60 days. You are not who you were.',90:'90 days. This rewires the brain. You just did it.',180:'Half a year. The old you feels like someone else.',365:'One full year. You did the impossible thing.'};
  // Fire a day-milestone ONLY on the exact day it's reached (day === milestone). Any milestone
  // already passed is marked seen silently so it never pops late (fixes "30 days" showing on day 32).
  Object.entries(dayMsgs).forEach(([m,msg])=>{
    const mDay=parseInt(m);
    if(day>=mDay && !achieved.includes('d'+m)){
      achieved.push('d'+m); ls('totry_ms',achieved);
      if(day === mDay){ showToast(m+' Days \u2728', msg + ' \u00b7 Tap to make a share card.', ()=>{ try{ if(typeof createShareCard==='function'){ if(typeof setShareTheme==='function') setShareTheme(ls('totry_share_theme')||'dark'); createShareCard('milestone'); } }catch(_){} }); }
    }
  });
  loadV();const tw=vices.reduce((a,v)=>a+(v.w||0),0);
  const winMsgs={1:'First win. You proved you can.',10:'10 urges defeated. You fight back.',25:'25 wins. This is becoming who you are.',50:'50 victories.',100:'100 wins. 100 moments you chose differently.'};
  Object.entries(winMsgs).forEach(([m,msg])=>{if(tw>=parseInt(m)&&!achieved.includes('w'+m)){achieved.push('w'+m);ls('totry_ms',achieved);showToast(m+' Wins \ud83c\udfc6',msg);}});
}




