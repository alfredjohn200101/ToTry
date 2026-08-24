// ── ONE THING AT A TIME ──
// SOUL-ARCHITECTURE, MORNING: "rebuild so it FEELS like morning — dawn skin, one thing at a time,
// not a form." It was 1913px of scroll and 42 visible controls on an 896px screen. Nobody sets an
// intention at the bottom of a form; they abandon it somewhere around the third field.
//
// The blocks are NOT rewritten — every card, handler and id stays exactly where it was. They are
// assigned to five steps and shown one at a time. Two rules make that safe:
//
//   1. Hidden, never removed. The morning check-in is a crisis door: detectCrisis runs on what is
//      typed into #morning-grateful / #morning-intention and completeMorning() reads both. A field
//      that has been deleted cannot be written to, and a crisis path that depends on a field is not
//      something to be clever near.
//   2. Assignment is by ANCHOR, not by tagging all 24 blocks. Every child inherits the step of the
//      last anchor above it, so a card added later joins the step it sits in rather than vanishing.
//      Nothing is ever orphaned, which is the failure that would matter.
const _MORNING_STEPS = [
  { key:'arrive',  label:'Arrive' },
  { key:'receive', label:'Receive' },
  { key:'body',    label:'Your body' },
  { key:'set',     label:'Set the day' },
  { key:'close',   label:'Close' },
];
// the block that BEGINS each step, after the first
const _MORNING_ANCHORS = {
  'morning-adaptive-card': 1,
  'morning-sleep-card':    2,
  'morning-gratitude':     3,
  'morning-pray-lbl':      4,
};
// One exception to the anchor walk. The arriving check-in ("how are you arriving? body / head /
// spirit") sits AFTER the intention field in the markup but belongs with the body step — and it
// carries thirty buttons, which on its own turned "set the day" back into the form this is meant to
// undo. An anchor cannot express this, because an anchor claims everything below it too.
const _MORNING_OVERRIDE = { 'daily-checkin': 2 };
let _mStep = 0;
function _morningAssignSteps(pane){
  let step = 0;
  [...pane.children].forEach(el => {
    // the back bar and the screen-reader heading are chrome, not part of the ritual
    if(el.classList.contains('hub-back-bar') || el.classList.contains('a11y-only') || el.classList.contains('mstep-nav') || el.classList.contains('mstep-foot')) return;
    if(el.id && _MORNING_ANCHORS[el.id] != null){
      step = _MORNING_ANCHORS[el.id];
      // a bare <div class="lbl"> sits immediately above its field and belongs with it
      const prev = el.previousElementSibling;
      if(prev && prev.classList.contains('lbl')) prev.setAttribute('data-mstep', step);
    }
    el.setAttribute('data-mstep', (el.id && _MORNING_OVERRIDE[el.id] != null) ? _MORNING_OVERRIDE[el.id] : step);
  });
}
function morningStep(n){
  const pane = document.getElementById('tab-morning');
  if(!pane) return;
  _mStep = Math.max(0, Math.min(_MORNING_STEPS.length - 1, n));
  pane.querySelectorAll(':scope > [data-mstep]').forEach(el => {
    el.classList.toggle('mstep-on', Number(el.getAttribute('data-mstep')) === _mStep);
  });
  const dots = pane.querySelector('.mstep-dots');
  if(dots) [...dots.children].forEach((d,i) => d.classList.toggle('on', i === _mStep));
  const lbl = pane.querySelector('.mstep-label');
  if(lbl) lbl.textContent = _MORNING_STEPS[_mStep].label;
  const nextBtn = pane.querySelector('.mstep-next');
  if(nextBtn) nextBtn.textContent = (_mStep === _MORNING_STEPS.length - 1) ? '' : 'Next \u2192';
  if(nextBtn) nextBtn.style.display = (_mStep === _MORNING_STEPS.length - 1) ? 'none' : '';
  try{ pane.scrollTop = 0; window.scrollTo({ top:0, behavior:'smooth' }); }catch(_){ }
  if(typeof haptic === 'function') haptic('tap');
}
// The escape hatch, and the honest one: some mornings a person wants the whole thing at once, and
// anything that traps someone in a flow they did not ask for is the opposite of this app.
function morningShowAll(){
  const pane = document.getElementById('tab-morning');
  if(!pane) return;
  pane.classList.remove('stepped');
  const nav = pane.querySelector('.mstep-nav'); if(nav) nav.style.display = 'none';
  const foot = pane.querySelector('.mstep-foot'); if(foot) foot.style.display = 'none';
  ls('totry_morning_flow', 'all');
  if(typeof haptic === 'function') haptic('tap');
}
function renderMorningFlow(){
  const pane = document.getElementById('tab-morning');
  if(!pane) return;
  if(ls('totry_morning_flow') === 'all'){ pane.classList.remove('stepped'); return; }
  _morningAssignSteps(pane);
  pane.classList.add('dawn');
  if(!pane.querySelector('.mstep-nav')){
    const nav = document.createElement('div');
    nav.className = 'mstep-nav';
    nav.innerHTML = '<div class="mstep-dots">' +
      _MORNING_STEPS.map(() => '<div class="mstep-dot"></div>').join('') +
      '</div><div class="mstep-label"></div>';
    const after = pane.querySelector('.a11y-only') || pane.querySelector('.hub-back-bar');
    if(after && after.nextSibling) pane.insertBefore(nav, after.nextSibling); else pane.insertBefore(nav, pane.firstChild);

    const foot = document.createElement('div');
    foot.className = 'mstep-foot';
    foot.innerHTML = '<button class="btn primary mstep-next" style="flex:1">Next \u2192</button>' +
                     '<button class="mstep-all" type="button">Show the whole morning</button>';
    pane.appendChild(foot);
    foot.querySelector('.mstep-next').onclick = () => morningStep(_mStep + 1);
    foot.querySelector('.mstep-all').onclick = morningShowAll;
  }
  pane.classList.add('stepped');
  morningStep(0);
}

// One-tap morning sleep rating → writes a check-in that computeReadiness reads, so sleep instantly
// shapes readiness, the coach's voice, and the urge companion ("running on no sleep — that's why
// the pull feels strong; it's not weakness"). Idempotent per day (updates today's entry).
// ── THE MORNING THAT GIVES SOMETHING BACK ──────────────────────────────────────────────────────
// Alfy's own words for what the morning should be: "Good morning, hope you slept beautifully — how
// do you feel? Here's what you have on for the day. Going by your history you're about to go gym?
// Given your readiness: train well / don't train too hard." Every ingredient already existed — the
// calendar, the training history, readiness — and the morning never fused them; it only COLLECTED
// (sleep, gratitude, intention). A flow you pour into but never get changed by isn't one you return
// to. This is the one fused thing that gives back.

// What does he usually do on THIS weekday? Demands a real pattern (2+ sessions on this day in the
// last 6 weeks) before claiming one — a guess he'd have to correct is worse than saying nothing.
function _usualTrainingToday(){
  try{
    const dow = new Date().getDay();
    const cutoff = Date.now() - 42*86400000;
    const sessions = (ls('totry_workouts')||[]).filter(w => {
      if(!w || !w.ts) return false;
      const t = new Date(w.ts);
      return t.getTime() >= cutoff && t.getDay() === dow;
    });
    if(sessions.length < 2) return null;
    const hours = sessions.map(w => new Date(w.ts).getHours());
    const hour = Math.round(hours.reduce((a,b)=>a+b,0) / hours.length);
    const tally = {};
    sessions.forEach(w => { const f = String(w.splitFocus || w.type || '').trim(); if(f) tally[f] = (tally[f]||0)+1; });
    const focus = Object.keys(tally).sort((a,b) => tally[b]-tally[a])[0] || '';
    return { count: sessions.length, hour, focus };
  }catch(_){ return null; }
}
function _fmtHour(h){
  const ampm = h >= 12 ? 'pm' : 'am';
  const hr = (h % 12 === 0) ? 12 : (h % 12);
  return hr + ampm;
}
function renderMorningDayAhead(){
  try{
    const card = document.getElementById('morning-day-ahead');
    const out = document.getElementById('morning-day-ahead-text');
    if(!card || !out) return;
    const bits = [];
    const todayKey = new Date().toLocaleDateString('en-AU');

    // 1) What's actually on today — their real schedule (calendar stores Mon=0).
    const dow = (new Date().getDay() + 6) % 7;
    const events = ((typeof _calEvents==='function') ? _calEvents() : [])
      .filter(e => e && e.day === dow)
      .sort((a,b) => String(a.start||'').localeCompare(String(b.start||'')));
    if(events.length){
      const list = events.slice(0,4).map(e => (e.title || e.type || 'something') + (e.start ? (' at ' + e.start) : '')).join(', ');
      bits.push('You’ve got ' + list + ' today.');
    }

    // 2) Going by their OWN history — are they likely training today? (Never if they already did,
    //    and never if the calendar already says it — no point telling them what they can see.)
    const trainedToday = (ls('totry_workouts')||[]).some(w => w && w.ts && new Date(w.ts).toLocaleDateString('en-AU') === todayKey);
    const gymOnCal = events.some(e => e && e.type === 'gym');
    const usual = _usualTrainingToday();
    if(usual && !trainedToday && !gymOnCal){
      const dayName = new Date().toLocaleDateString('en-AU', { weekday:'long' });
      bits.push('Going by the last few weeks you usually train around ' + _fmtHour(usual.hour) + ' on a ' + dayName + (usual.focus ? (' — ' + usual.focus) : '') + '.');
    }

    // 3) Given how they slept — how to MEET that training. Readiness only speaks on a real signal.
    const rd = (typeof computeReadiness==='function') ? computeReadiness() : null;
    const likelyTraining = (!!usual && !trainedToday) || gymOnCal;
    if(rd && rd.level && likelyTraining){
      if(rd.level === 'rest') bits.push('You’re not well recovered (' + rd.score + '/100) — still go, but keep it light. Drop a set, leave a rep in the tank. Showing up easy still counts.');
      else if(rd.level === 'moderate') bits.push('Recovery’s middling (' + rd.score + '/100) — train well, but quality over maxing out.');
      else bits.push('You’re well recovered (' + rd.score + '/100) — good day to push. This is when a PR gets earned.');
    } else if(rd && rd.level === 'rest'){
      bits.push('You’re running low today (' + rd.score + '/100) — go gentle and don’t stack too much on.');
    }

    // Nothing genuinely true to say → say nothing. Never fill the space for the sake of it.
    if(!bits.length){ card.style.display = 'none'; return; }
    out.textContent = bits.join(' ');
    card.style.display = 'block';
  }catch(_){ }
}

function logMorningSleep(v){
  const checkins = ls('totry_checkins') || [];
  const today = new Date().toISOString().slice(0,10);
  const existingIdx = checkins.findIndex(c => (c.ts||'').slice(0,10) === today && c.kind === 'sleep');
  const entry = { kind:'sleep', scores:{ sleep:v }, ts:new Date().toISOString() };
  if(existingIdx >= 0) checkins[existingIdx] = entry; else checkins.unshift(entry);
  ls('totry_checkins', checkins.slice(0,300));
  // Single source of truth for sleep: mirror into the daily trackers store the Track tab reads, so
  // a morning sleep rating shows as "Xh" there instead of a stale 0h. (Was two disconnected stores.)
  try{ const _dk=new Date().toLocaleDateString('en-AU'); const _tr=ls('totry_trackers')||{}; if(!_tr[_dk])_tr[_dk]={water:0,sleep:0,steps:0}; /* QUALITY, NOT HOURS. This wrote v straight into .sleep — the same field the Track tab fills with real hours via adjustTracker('sleep',+/-0.5) and renders as "Xh" against "Target: 8 hours". The buttons ask "How did you sleep?" and answer Rough/Okay/Good/Great (3/5/7/9), so tapping Rough recorded THREE HOURS OF SLEEP. getLifeState then averaged it, computed a sleep debt from it, and the app said "you got about 3h" — to the person, and in the brief handed to the AI. The comment here said it was to avoid "a stale 0h", which is the trade exactly backwards: an empty field is honest, an invented number is not. Hours now come only from someone actually entering hours. */ _tr[_dk].sleepQuality=v; ls('totry_trackers',_tr); if(typeof updateTrackerDisplay==='function') updateTrackerDisplay(); }catch(_){}
  if(typeof syncToCloud==='function') syncToCloud();
  if(typeof haptic==='function') haptic('light');
  // Reflect selection in the UI.
  document.querySelectorAll('#morning-sleep-opts .sleep-opt').forEach(b => {
    const on = parseInt(b.getAttribute('data-v'),10) === v;
    b.style.background = on ? 'var(--go)' : 'var(--bg3)';
    b.style.color = on ? '#1a1205' : 'var(--tx2)';
    b.style.borderColor = on ? 'var(--go)' : 'var(--bd)';
  });
  const msgs = { 3:'Logged. Be gentle with yourself today \u2014 I\u2019ll factor it in.', 5:'Logged. We\u2019ll work with it.', 7:'Logged \u2014 good. Let\u2019s use it.', 9:'Logged \u2014 well rested. Good day to push.' };
  if(typeof showToast==='function') showToast('Sleep noted', msgs[v]||'Logged.');
  if(typeof renderReadinessCard==='function') renderReadinessCard();
  _showMorningReadiness(v);
  // Sleep just changed readiness — so the day-ahead advice must change WITH it, in front of them.
  // That visible response is the whole point: they told it something and it answered.
  renderMorningDayAhead();
}
// The morning's readiness thread made visible: given the sleep rating, tell the man how the day will
// pull and what to aim for — grace over verdict, and it arms the 11pm man preemptively.
function _showMorningReadiness(v){
  try{
    const box=document.getElementById('morning-readiness');
    const txt=document.getElementById('morning-readiness-text');
    if(!box||!txt) return;
    const lines={
      3:'Running on little sleep — the pull toward comfort, the snack, the easy dopamine will feel stronger today. That’s biology, not weakness. Aim smaller, go gentle, and if an urge hits hard tonight, remember it’s the tiredness talking.',
      5:'A short night. Enough to show up — just not your sharpest. Steady beats heroic today: pick one thing that matters and let the rest be lighter.',
      7:'Decent rest. You’ve got what you need for a solid day — spend it on something that counts.',
      9:'Well rested. Your focus and willpower are at their strongest today — a good day to push on what matters and get ahead of the fight.'
    };
    txt.textContent = lines[v] || lines[5];
    box.style.display='block';
  }catch(_){}
}
// Restore today's sleep selection when the morning view renders.
function _restoreMorningSleep(){
  try{
    const checkins = ls('totry_checkins') || [];
    const today = new Date().toISOString().slice(0,10);
    const c = checkins.find(c => (c.ts||'').slice(0,10) === today && c.kind === 'sleep');
    if(c && c.scores && c.scores.sleep!=null){
      document.querySelectorAll('#morning-sleep-opts .sleep-opt').forEach(b => {
        const on = parseInt(b.getAttribute('data-v'),10) === c.scores.sleep;
        if(on){ b.style.background='var(--go)'; b.style.color='#1a1205'; b.style.borderColor='var(--go)'; }
      });
      _showMorningReadiness(c.scores.sleep);
    }
  }catch(_){}
}

// Quick mood/stress log tied to the soul side (one-tap, feeds whole-person coaching).
// Home readiness card (cross-integration anchor — also referenced by warm-up + mission).
function renderReadinessCard(){
  const card = document.getElementById('home-readiness-card');
  if(!card) return;
  const r = computeReadiness();
  if(!r){ card.style.display = 'none'; return; }
  const col = r.level==='go' ? 'var(--gr)' : (r.level==='moderate' ? 'var(--go)' : 'var(--re)');
  const icon = r.level==='go' ? '\u2705' : (r.level==='moderate' ? '\u26a1' : '\ud83d\udecc');
  const label = r.level==='go' ? 'Ready to go' : (r.level==='moderate' ? 'Train controlled' : 'Recover today');
  const reasonTxt = r.reasons.length ? r.reasons.slice(0,3).join(' \u00b7 ') : 'based on your recent days';
  card.style.display = 'block';
  card.innerHTML = '<div class="lbl">Readiness</div>'+
    '<div class="card" style="margin-bottom:12px;cursor:pointer" onclick="explainReadiness()">'+
      '<div style="display:flex;align-items:center;gap:14px">'+
        '<div style="position:relative;width:52px;height:52px;flex-shrink:0">'+
          '<svg viewBox="0 0 36 36" style="width:52px;height:52px;transform:rotate(-90deg)"><circle cx="18" cy="18" r="16" fill="none" stroke="var(--bg3)" stroke-width="3"/><circle cx="18" cy="18" r="16" fill="none" stroke="'+col+'" stroke-width="3" stroke-dasharray="'+(r.score*1.005)+' 100" stroke-linecap="round"/></svg>'+
          '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--tx);font-family:DM Mono,monospace">'+r.score+'</div>'+
        '</div>'+
        '<div style="flex:1"><div style="font-size:14px;color:'+col+';font-weight:500">'+icon+' '+label+'</div>'+
        '<div style="font-size:11px;color:var(--tx3);margin-top:2px">'+reasonTxt+'</div></div>'+
        '<div style="color:var(--tx3);font-size:16px;flex-shrink:0">›</div>'+
      '</div>'+
      '<div style="font-size:12px;color:var(--tx2);line-height:1.5;margin-top:10px">'+r.advice+'</div>'+
      '<div style="font-size:10px;color:var(--tx3);margin-top:8px;font-family:DM Mono,monospace;text-transform:uppercase;letter-spacing:0.08em">From your check-ins · tap for the full picture</div>'+
    '</div>';
}

// Weekly reflection home card (WS-A). Surfaces gently: on Sundays, or when 7+ days have passed
// since the last reflection. Pull-based — shows a prompt; the AI paragraph only generates on tap.
function renderWeeklyReflectionCard(){
  const card = document.getElementById('home-weekly-reflection-card');
  if(!card) return;
  // A week reflection needs about a week actually lived — never offer it to a brand-new account
  // (it would generate an "empty week" reflection about a week they were never here for).
  if(((typeof getDayCount==='function') ? getDayCount() : 99) < 7){ card.style.display='none'; return; }
  const lastAt = ls('totry_weekly_reflection_at') || 0;
  const daysSince = (Date.now() - lastAt) / 86400000;
  const isSunday = new Date().getDay() === 0;
  // Show if never done, or it's Sunday and not done today, or 7+ days since last.
  const show = (!lastAt) || (isSunday && daysSince >= 1) || (daysSince >= 7);
  if(!show){ card.style.display='none'; return; }
  card.style.display='block';
  card.innerHTML = '<div class="lbl">Your week</div>'+
    '<div class="card" style="margin-bottom:12px;background:linear-gradient(135deg,rgba(200,169,110,0.06),rgba(140,107,182,0.03));border-color:var(--go-bd)">'+
      '<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:12px">Take a moment to see your week honestly \u2014 body, discipline, and spirit, woven together.</div>'+
      '<button class="btn primary" id="weekly-reflection-btn" onclick="generateWeeklyReflection()" style="font-size:13px">Reflect on my week</button>'+
      '<button class="btn" id="weekly-content-btn" onclick="generateWeeklyContent()" style="font-size:13px;margin-top:8px;background:none;border:1px solid var(--go-bd);color:var(--go)">\u{1F3AC} Make this week\u2019s content</button>'+
      '<div id="weekly-content-out" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--bd)"></div>'+
      '<div id="weekly-reflection-out" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--bd)"></div>'+
    '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// v107 — AI DEEPENING. Positive, non-intrusive, pull-based AI features that
// reuse data the app already has. Nothing here nags or auto-pops (except where
// the user explicitly enabled it). All AI calls degrade gracefully.
// ═══════════════════════════════════════════════════════════════════

// ── WS-C: PLATEAU / TREND DETECTION (pure logic; AI explains on request) ──
// Detects a stalled lift (est-1RM flat/declining over recent sessions) or a
// bodyweight plateau vs the user's goal direction. Returns {type, detail} or null.
function detectPlateau(){
  // Lift plateau: look at exercises with >=4 logged sessions; flag if best e1RM hasn't improved in last 3.
  // TWO THINGS WERE WRONG HERE, and both told a person who was progressing that they had stalled.
  //   1. priorBest was the ALL-TIME best, so someone returning after a layoff and adding weight every
  //      session — 95 -> 97.5 -> 100kg — is measured against a 123kg PR from months ago and told their
  //      lift "hasn't improved in your last 3 sessions". Three consecutive PRs, reported as a plateau.
  //   2. series carried no date window at all, so a lift not trained for six months was also called
  //      "stalled in your last 3 sessions" — sessions that happened half a year ago.
  // A plateau is a RECENT failure to progress against RECENT work. Both are now bounded, and the first
  // qualifying exercise no longer wins by object key order: the staleness is checked before reporting.
  const history = ls('totry_workouts') || [];
  const PLATEAU_WINDOW_MS = 90 * 86400000;   // a lift untouched for a quarter has not plateaued, it has stopped
  const _now = Date.now();
  const byEx = {};
  [...history].reverse().forEach(w => {
    const wt = w && (w.ts || w.date) ? new Date(w.ts || w.date).getTime() : NaN;
    if(!isFinite(wt) || (_now - wt) > PLATEAU_WINDOW_MS) return;   // outside the window: not evidence of a stall
    (w.exercises || []).forEach(ex => {
      const e = (typeof bestE1RMFromSets==='function') ? bestE1RMFromSets(ex.sets) : 0;
      if(e > 0){ (byEx[ex.name] = byEx[ex.name] || []).push({ e, ts: wt }); }
    });
  });
  for(const name of Object.keys(byEx)){
    const entries = byEx[name];
    if(entries.length >= 5){
      const series = entries.map(x => x.e);
      const recent = series.slice(-3);
      const priorBest = Math.max(...series.slice(0, -3));   // best WITHIN the window, not all time
      // And a run of consecutive improvements is progress however it compares to an older peak.
      const climbing = recent.length === 3 && recent[0] < recent[1] && recent[1] < recent[2];
      if(!climbing && recent.every(v => v <= priorBest)){
        return { type:'lift', name, detail: name + ' has stalled — your estimated 1RM hasn\u2019t improved in your last 3 sessions (best ~' + priorBest + 'kg).' };
      }
    }
  }
  // Weight plateau vs goal.
  if(typeof adaptiveNutritionSuggestion==='function'){
    const an = adaptiveNutritionSuggestion();
    if(an && /stall|steady|flat|held/i.test(an.message)) return { type:'weight', detail: an.message };
  }
  return null;
}
async function explainPlateau(){
  const box = document.getElementById('plateau-explain-out');
  const btn = document.getElementById('plateau-explain-btn');
  const p = detectPlateau();
  if(!p){ if(box){ box.style.display='block'; box.innerHTML = '<div style="font-size:13px;color:var(--tx2);line-height:1.6">No plateau detected right now \u2014 your numbers are moving. Keep going.</div>'; } return; }
  if(btn){ btn.textContent='Thinking...'; btn.disabled=true; }
  try{
    const ctx = (typeof _ptIntel==='function') ? _ptIntel() : '';
    const sys = (typeof brotherSys==='function'?brotherSys():'') + 'You are an encouraging, knowledgeable strength & nutrition coach. Diagnose plateaus from data, give 2-3 concrete, safe things to try. Concise, practical, never medical claims.';
    const prompt = 'This person seems to have hit a plateau: ' + p.detail + '\n\nTheir recent training data:' + ctx + '\n\nIn a short, encouraging paragraph plus 2-3 specific bullet actions, explain likely reasons and what to try next.';
    const resp = await api(sys, [], prompt, 700);
    if(box){
      box.style.display='block';
      box.innerHTML = (resp && resp.trim())
        ? '<div style="font-size:13px;color:var(--tx2);line-height:1.7;white-space:pre-wrap">'+resp.replace(/</g,'&lt;')+'</div>'
        : aiUnavailableHtml(p.detail || '');
    }
  }catch(e){ if(box){ box.style.display='block'; box.innerHTML='<div style="font-size:12px;color:var(--tx3)">Couldn\u2019t reach the coach right now. Try again shortly.</div>'; } }
  finally{ if(btn){ btn.textContent='Why am I stuck?'; btn.disabled=false; } }
}
// Shows the plateau card ONLY when a genuine stall is detected (pull-based, never nags).
function renderPlateauCard(){
  const card = document.getElementById('pt-plateau-card');
  if(!card) return;
  const p = (typeof detectPlateau==='function') ? detectPlateau() : null;
  if(!p){ card.style.display='none'; return; }
  card.style.display='block';
  card.className='card';
  card.style.cssText='display:block;margin-bottom:14px;background:linear-gradient(135deg,rgba(140,107,182,0.08),rgba(200,169,110,0.04));border:1px solid var(--go-bd)';
  card.innerHTML = '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">\u26f0\ufe0f Plateau spotted</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:12px">'+p.detail+'</div>'+
    '<button class="btn primary" id="plateau-explain-btn" onclick="explainPlateau()" style="font-size:13px">Why am I stuck?</button>'+
    '<div id="plateau-explain-out" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--bd)"></div>';
}

// ── WS-D: VICE PATTERN INSIGHT (OPT-IN ONLY; compassionate; never auto-popped) ──
// Detects clustering in relapse history (day-of-week, low-sleep correlation). Returns {patterns[]} or null.
function detectVicePatterns(){
  loadV();
  const all = [];
  (vices||[]).forEach(v => {
    (v.relapseHistory||[]).forEach(r => { if(r.date) all.push(new Date(r.date)); });
    if(v.lastLoss) all.push(new Date(v.lastLoss));
  });
  const valid = all.filter(d => !isNaN(d.getTime()));
  if(valid.length < 4) return null; // need enough data to see a pattern
  const patterns = [];
  // Day-of-week clustering.
  const dow = [0,0,0,0,0,0,0];
  valid.forEach(d => { dow[d.getDay()]++; });
  const total = valid.length;
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const maxDay = dow.indexOf(Math.max(...dow));
  if(dow[maxDay] >= 3 && dow[maxDay] / total >= 0.4){
    patterns.push('A large share of slips happen on ' + dayNames[maxDay] + 's.');
  }
  // Weekend clustering (Fri-Sun).
  const weekend = dow[5] + dow[6] + dow[0];
  if(weekend / total >= 0.6 && weekend >= 3){
    patterns.push('Most slips cluster around weekends.');
  }
  return patterns.length ? { patterns, count: valid.length } : null;
}
async function explainVicePatterns(){
  const box = document.getElementById('vice-pattern-out');
  const btn = document.getElementById('vice-pattern-btn');
  const p = detectVicePatterns();
  if(btn){ btn.textContent='Thinking...'; btn.disabled=true; }
  try{
    if(!p){ if(box){ box.style.display='block'; box.innerHTML='<div style="font-size:13px;color:var(--tx2);line-height:1.6">There\u2019s no clear pattern in your slips yet \u2014 and that\u2019s okay. Keep logging honestly; if a pattern emerges, I\u2019ll help you see it gently.</div>'; } return; }
    const sys = brotherSys() + 'RIGHT NOW you’re helping them look honestly at the PATTERN in their fight — the times, the triggers. Acknowledge the courage it takes to look at all. Read what you see and offer 2-3 gentle, practical, hopeful moves tied to it. Brief and warm — never shame, only grace and growth.';
    const prompt = 'A person fighting a vice has these patterns in when they slip: ' + p.patterns.join(' ') + ' (' + p.count + ' slips logged). Compassionately reflect this back and suggest 2-3 specific, doable strategies for those high-risk moments. Hopeful, never shaming.';
    const resp = await api(sys, [], prompt, 600);
    if(box){
      box.style.display='block';
      // detectVicePatterns() already found these on this device, before the model was asked. If the
      // model is down, say so AND still show them — the person came here to understand themselves.
      box.innerHTML = (resp && resp.trim())
        ? '<div style="font-size:13px;color:var(--tx2);line-height:1.7;white-space:pre-wrap">'+resp.replace(/</g,'&lt;')+'</div>'
        : aiUnavailableHtml('What your own log shows: ' + p.patterns.join(' ') + ' (' + p.count + ' logged).');
    }
  }catch(e){ if(box){ box.style.display='block'; box.innerHTML='<div style="font-size:12px;color:var(--tx3)">Couldn\u2019t reach the coach right now.</div>'; } }
  finally{ if(btn){ btn.textContent='Show me my patterns'; btn.disabled=false; } }
}
// Renders the OPT-IN vice-pattern entry point. Shows ONLY when there's enough slip data to find a
// pattern, and only offers a button — never auto-reveals the analysis (the user chooses to look).
function renderVicePatternCard(){
  const card = document.getElementById('vice-pattern-card');
  if(!card) return;
  const p = (typeof detectVicePatterns==='function') ? detectVicePatterns() : null;
  if(!p){ card.style.display='none'; return; }
  card.style.display='block';
  card.className='card';
  card.style.cssText='display:block;margin-top:8px;background:var(--bg2);border:1px solid var(--bd)';
  card.innerHTML = '<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:10px">When you\u2019re ready, I can gently show you the patterns in when slips tend to happen \u2014 no judgment, just to help you prepare for the hard moments.</div>'+
    '<button class="btn" id="vice-pattern-btn" onclick="explainVicePatterns()" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Show me my patterns</button>'+
    '<div id="vice-pattern-out" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--bd)"></div>';
}

// ── WS-G: EXPLAIN MY READINESS ──
async function explainReadiness(){
  const r = (typeof computeReadiness==='function') ? computeReadiness() : null;
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div><div style="font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;color:var(--tx);margin-bottom:10px">Your readiness</div><div id="readiness-explain-body" style="font-size:13px;color:var(--tx2);line-height:1.7">Thinking...</div><div style="font-size:11px;color:var(--tx3);line-height:1.55;margin-top:12px;padding-top:10px;border-top:1px solid var(--bd)">This reads your own check-ins — sleep, stress, energy — plus your recent training load. An honest daily gauge, not a wearable\'s HRV. Connect Apple Health / Health Connect and it sharpens.</div><button class="btn" onclick="this.closest(\'.modal-bg\').remove()" style="margin-top:14px">Close</button></div>';
  document.body.appendChild(m);
  const body = document.getElementById('readiness-explain-body');
  if(!r){ if(body) body.innerHTML = 'Log a check-in (sleep, stress, energy) and a workout or two, and I\u2019ll be able to read your recovery.'; return; }
  try{
    const sys = brotherSys() + 'RIGHT NOW you\u2019re explaining their readiness score to them in plain, encouraging words \u2014 what\u2019s driving it and what would move it. 3-4 sentences. No medical claims.';
    const prompt = 'Readiness today is ' + r.score + '/100 (' + r.level + '). Inputs: ' + (r.sleep!=null?'sleep '+r.sleep+'/10, ':'') + (r.stress!=null?'stress '+r.stress+'/10, ':'') + (r.energy!=null?'energy '+r.energy+'/10, ':'') + 'reasons: ' + (r.reasons.join(', ')||'recent days') + '. Explain why it\u2019s here and 2 things that would raise it.';
    const resp = await api(sys, [], prompt, 400);
    if(body) body.innerHTML = '<div style="white-space:pre-wrap">'+(resp||r.advice).replace(/</g,'&lt;')+'</div>';
  }catch(e){ if(body) body.innerHTML = r.advice + '<div style="font-size:11px;color:var(--tx3);margin-top:8px">(Detailed explanation unavailable right now.)</div>'; }
}

// ── WS-A: WEEKLY NARRATIVE REFLECTION (pull-based, once weekly) ──
function _weekStats(){
  const now = Date.now(), wk = now - 7*86400000;
  const workouts = (ls('totry_workouts')||[]).filter(w => w.ts && new Date(w.ts).getTime() >= wk);
  const journal = safeJournal().filter(j => j.ts && new Date(j.ts).getTime() >= wk);
  const prayers = (ls('totry_prayers')||[]).filter(p => p && new Date(p.createdAt || p.ts).getTime() >= wk);
  loadV();
  // v.w is a LIFETIME total; every other figure on this screen is the last seven days. Count the wins
  // in the fight log, which is dated, so "this week" means this week.
  const wins = (ls('totry_fight_log')||[]).filter(f => f && f.won && f.ts && new Date(f.ts).getTime() >= wk).length;
  const slips7 = (vices||[]).reduce((a,v)=>a+((v.relapseHistory||[]).filter(r=>r.date&&new Date(r.date).getTime()>=wk).length),0);
  const _lq = (vices||[]).filter(v=>v.kind!=='letgo'); // letting-go isn't a clean-day streak
  const longest = _lq.length ? Math.max(..._lq.map(v=>(typeof viceCleanDays==='function')?viceCleanDays(v):0)) : 0;
  // Money — the fourth front, so the weekly word can speak to a man's whole life, not just body+soul.
  const reclaimed = (typeof totalReclaimed==='function') ? totalReclaimed() : 0;
  // Nutrition consistency — days actually logged this week.
  let nutDays = 0; try{ const nl=ls('totry_nutlog')||{}; for(let i=0;i<7;i++){ const d=new Date(now-i*86400000).toLocaleDateString('en-AU'); if((nl[d]||[]).length) nutDays++; } }catch(_){}
  return { workouts: workouts.length, journalEntries: journal.length, wins, slips7, longestStreak: longest, reclaimed, nutDays };
}
