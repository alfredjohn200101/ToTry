// ── MODERATION LOGGING ──
// For "keep it in check" vices, use is not relapse. We track whether they stayed within
// their own limit. Staying within = a win (mastery). Going over = an honest, gentle note —
// never "0 days, all is lost." This reflects that moderation, not abstinence, is the goal.
// ── LIVE MODERATION COUNTER — being accompanied through the moment, not just reviewing it ──────
// For moderate-mode vices with a numeric threshold (e.g. "max 3 drinks"), the user can count in
// real time as a night unfolds. The app responds supportively as they approach/cross the line —
// never shaming, just a steady friend keeping the line visible. Auto-rolls into the within/over
// record when they close the session.
function _modSessionKey(i){ return 'totry_mod_session_' + i; }
function _getModSession(i){
  try{ const s = JSON.parse(localStorage.getItem(_modSessionKey(i))||'null'); 
    // A session older than 18h is stale — treat as a fresh night.
    if(s && s.start && (Date.now() - s.start) < 18*3600000) return s;
  }catch(_){}
  return null;
}
function _saveModSession(i, s){ try{ localStorage.setItem(_modSessionKey(i), JSON.stringify(s)); }catch(_){} }
function _clearModSession(i){ try{ localStorage.removeItem(_modSessionKey(i)); }catch(_){} }

function modCountUp(i){
  loadV();
  const v = vices[i]; if(!v) return;
  haptic('tap');
  let s = _getModSession(i) || { start: Date.now(), count: 0 };
  const thr = v.modThreshold || 0;
  const wasAtOrUnder = thr > 0 && s.count < thr;
  s.count += 1; s.last = Date.now();
  _saveModSession(i, s);
  renderVices();
  const unit = _modUnit(v);
  if(thr > 0){
    if(s.count < thr){ showToast(s.count + ' ' + unit, 'You\u2019re within your line. Enjoy it, stay aware.'); }
    else if(s.count === thr){ showToast('That\u2019s ' + s.count + ' \u2014 your limit', 'The line you set. No stress \u2014 just be intentional from here.'); }
    else if(wasAtOrUnder || !s.askedAtCross){
      // FIRST time crossing the line this session → one gentle, non-judgmental check. Respects that
      // they may be fine (a celebration, a safe night) — we're checking they're in control, not policing.
      s.askedAtCross = true; _saveModSession(i, s);
      brotherSpeaks({ kind:'viceOver', detail:{ vice: v.n, count: s.count + ' ' + unit, limit: thr + ' ' + unit } });
    } else {
      // Already acknowledged the crossing — don't nag every tap. Just a quiet count.
      showToast(s.count + ' ' + unit, 'Counted.');
    }
  } else {
    showToast(s.count + ' ' + unit, 'Counted. Staying aware is the win.');
  }
}
// A one-time, gentle "are you still in control?" — NOT a guilt trip. The user chooses the framing.
function modCountDown(i){
  loadV(); const v = vices[i]; if(!v) return;
  let s = _getModSession(i); if(!s || s.count<=0) return;
  haptic('tap'); s.count -= 1; _saveModSession(i, s); renderVices();
}
function _modUnit(v){
  // Pick a natural unit word from the vice name/type.
  const n = (v.n||'').toLowerCase() + ' ' + (v.t||'').toLowerCase();
  if(/drink|beer|wine|alcohol|spirit/.test(n)) return 'drinks';
  if(/cig|smoke|vape|nicotine|dart/.test(n)) return 'so far';
  if(/joint|weed|cone|cannabis/.test(n)) return 'so far';
  if(/coffee|caffeine/.test(n)) return 'cups';
  return 'so far';
}
// Close the night: roll the live count into the within/over record (no extra tapping).
function modEndSession(i){
  loadV(); const v = vices[i]; if(!v) return;
  const s = _getModSession(i);
  if(!s){ return; }
  const thr = v.modThreshold || 0;
  const within = thr > 0 ? (s.count <= thr) : true;
  if(!v.modLog) v.modLog = [];
  v.modLog.push({ date:new Date().toISOString(), within, count:s.count });
  // The session counter is only for tonight — it's cleared below and gone. Mirror it into the
  // durable use log too, so the honest week-by-week picture keeps building without asking twice.
  if(s.count > 0){
    const _u = ls('totry_vice_uses') || [];
    _u.unshift({ v:v.n, ts:new Date().toISOString(), qty:s.count, via:'session' });
    ls('totry_vice_uses', _u.slice(0,500));
  }
  if(within) v.modWithin = (v.modWithin||0)+1; else v.modOver = (v.modOver||0)+1;
  v.lastModCheck = new Date().toISOString();
  saveV();
  _clearModSession(i);
  renderVices();
  if(typeof syncToCloud==='function') syncToCloud();
  haptic(within ? 'success' : 'tap');
  if(within){ showToast('Held your line \uD83C\uDF3F', 'You stayed within tonight. That\u2019s real self-respect.'); }
  else { showToast('Noted, honestly', 'You went over, and you logged it truthfully. That awareness is how the line gets easier to hold. No shame here.'); }
}

function logModerateWithin(){
  if(curVice<0)return;
  haptic('success');
  loadV();
  const v=vices[curVice];
  if(!v.modLog)v.modLog=[];
  v.modLog.push({date:new Date().toISOString(), within:true});
  v.modWithin=(v.modWithin||0)+1;
  v.lastModCheck=new Date().toISOString();
  saveV();
  closeSos();
  renderVices();renderScoreboard();if(typeof renderUrgeInsights==='function')renderUrgeInsights();
  showToast('Well held ✓', 'Staying within your limit is real strength. That\'s mastery, not deprivation.');
}
function logModerateOver(){
  if(curVice<0)return;
  haptic('tap');
  loadV();
  const v=vices[curVice];
  if(!v.modLog)v.modLog=[];
  v.modLog.push({date:new Date().toISOString(), within:false});
  v.modOver=(v.modOver||0)+1;
  v.lastModCheck=new Date().toISOString();
  saveV();
  closeSos();
  renderVices();renderScoreboard();if(typeof renderUrgeInsights==='function')renderUrgeInsights();

  // Did HE ask to be checked in on? Count recent overages (last 14 days) against his own threshold.
  const threshold = v.modThreshold || 0;
  let recentOver = 0;
  if(threshold > 0 && v.modLog){
    const cutoff = Date.now() - 14*86400000;
    recentOver = v.modLog.filter(e => !e.within && new Date(e.date).getTime() >= cutoff).length;
  }
  const alreadyAskedKey = 'totry_modcheck_' + (v.n||'') + '_' + Math.floor(Date.now()/(7*86400000)); // at most once/week
  const shouldCheckIn = threshold > 0 && recentOver >= threshold && !ls(alreadyAskedKey);

  const m=document.createElement('div');
  m.className='modal-bg open';
  m.style.alignItems='center';

  if(shouldCheckIn){
    ls(alreadyAskedKey, true); // don't ask again this week
    // This is the check-in HE requested. A mirror, never a verdict. The conclusion is his.
    m.innerHTML='<div class="modal">'+
      '<div class="modal-handle"></div>'+
      '<div class="eyebrow" style="color:var(--go);text-align:center">A check-in you asked for</div>'+
      '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);font-style:italic;margin:8px 0 12px">Is this still serving you?</div>'+
      '<div style="text-align:center;font-size:14px;color:var(--tx2);line-height:1.7;margin-bottom:16px">When you set this up, you asked me to gently check in if you went over your limit a few times. You\'ve now gone over '+recentOver+' times in the last two weeks. No judgment — only you know what that means. So, honestly: is keeping this "in check" still working, or is part of you wondering if quitting would be freer?</div>'+
      '<button class="btn primary" onclick="closeModal(this)" style="margin-bottom:8px">It\'s working — keep tracking it</button>'+
      '<button class="btn" onclick="switchViceToQuit('+curVice+');closeModal(this)" style="background:var(--bg3);border:1px solid var(--bd);margin-bottom:8px">I want to try quitting it instead</button>'+
      '<button class="btn" onclick="closeModal(this);go(\'coach\');setTimeout(()=>{if(typeof sendCoachPrompt===\'function\')sendCoachPrompt(\'I asked the app to check in on something I\\\'m moderating, and I\\\'ve gone over my limit a few times. Help me think honestly about whether moderation is working for me or whether I should quit.\');},400)" style="background:var(--bg3);border:1px solid var(--bd)">Talk it through with my Coach</button>'+
      '</div>';
  } else {
    // Honest, not catastrophic. No streak reset, no "relapse" language.
    m.innerHTML='<div class="modal">'+
      '<div class="modal-handle"></div>'+
      '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);font-style:italic;margin-bottom:10px">Noticed honestly.</div>'+
      '<div style="text-align:center;font-size:14px;color:var(--tx2);line-height:1.7;margin-bottom:16px">You went past your limit this time — and you\'re honest enough to mark it. That awareness is exactly how moderation is learned. No streak lost, no shame. Just notice the pattern and adjust next time.</div>'+
      (function(){ const _l=_faithLine('So, whether you eat or drink... do all to the glory of God.');
        return _l ? '<div style="text-align:center;font-style:italic;font-family:Cormorant Garamond,serif;font-size:15px;color:var(--tx3);margin-bottom:16px">\u201c'+_escFew(_l)+'\u201d</div>' : ''; })()+
      '<button class="btn primary" onclick="closeModal(this)" style="margin-bottom:8px">Got it</button>'+
      '<button class="btn" onclick="closeModal(this);go(\'coach\');setTimeout(()=>{if(typeof sendCoachPrompt===\'function\')sendCoachPrompt(\'I went over my limit on something I\\\'m trying to moderate. Help me think about why and how to stay within it next time.\');},400)" style="background:var(--bg3);border:1px solid var(--bd)">Talk it through</button>'+
      '</div>';
  }
  document.body.appendChild(m);
}
// Converts a moderation vice into a quit vice — his choice, from the check-in. Starts a fresh streak.
function switchViceToQuit(i){
  loadV();
  if(!vices[i])return;
  vices[i].mode='quit';
  vices[i].startDate=new Date().toISOString();
  if(!vices[i].cleanDaysTotal)vices[i].cleanDaysTotal=0;
  saveV();
  renderVices();renderDayCounter();renderScoreboard();
  showToast('Now tracking as a quit', 'Fresh start from today. This takes more courage than staying comfortable.');
}

// Lets the user say WHEN a relapse happened before logging it — not every slip is today.
function promptLossDate(){
  loadV();
  if(curVice<0)return;
  const now=new Date();
  const todayStr=_todayLocalISO(now);
  const hh=String(now.getHours()).padStart(2,'0');
  const mm=String(now.getMinutes()).padStart(2,'0');
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.style.alignItems='center';
  m.innerHTML='<div class="modal">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:21px;color:var(--tx);font-style:italic;margin-bottom:6px">When did it happen?</div>'+
    '<div style="text-align:center;font-size:13px;color:var(--tx3);line-height:1.6;margin-bottom:14px">Be honest with yourself. Set the real day and time — your clock will count correctly from that exact moment.</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:12px">'+
      '<input type="date" id="loss-date-input" max="'+todayStr+'" value="'+todayStr+'" style="flex:1;font-size:16px;padding:11px;color-scheme:dark">'+
      '<input type="time" id="loss-time-input" value="'+hh+':'+mm+'" style="width:110px;font-size:16px;padding:11px;color-scheme:dark">'+
    '</div>'+
    '<button class="btn primary" onclick="(function(){var d=document.getElementById(\'loss-date-input\').value;var t=document.getElementById(\'loss-time-input\').value||\'12:00\';closeModal(this);logLoss(d?new Date(d+\'T\'+t+\':00\').toISOString():null);}).call(this)" style="margin-bottom:8px">Log it honestly</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>'+
    '</div>';
  document.body.appendChild(m);
}

// ── MASS-ADD LOSSES ───────────────────────────────────────────────────────────
// During the data-loss period some men lost streaks they were truly keeping, or had
// relapses they never got to record. Honesty cuts both ways: a man must be able to
// enter several past slips at once without re-living each one through the full flow.
// This is reparation in the small — restoring a true record. (cf. Magnifica Humanitas:
// truth preserved against manipulation, the person never reduced to a number.)
function promptMassAddLosses(){
  loadV();
  if(curVice<0){ showToast('Pick a habit first','Open the habit you want to add past slips to.'); return; }
  const v = vices[curVice];
  const now = new Date();
  const todayStr = _todayLocalISO(now);
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:21px;color:var(--tx);font-style:italic;margin-bottom:6px">Add past slips honestly</div>'+
    '<div style="text-align:center;font-size:13px;color:var(--tx3);line-height:1.6;margin-bottom:14px">For '+(v.n||'this habit')+'. Add each day it really happened — no more, no less. Your streak and totals will be rebuilt to match the true timeline.</div>'+
    '<div id="mal-rows" style="margin-bottom:10px"></div>'+
    '<button class="btn" onclick="addMassLossRow()" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px;margin-bottom:14px">+ Add another day</button>'+
    '<button class="btn primary" onclick="commitMassAddLosses()" style="margin-bottom:8px">Log these honestly</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>'+
    '</div>';
  document.body.appendChild(m);
  window.__malToday = todayStr;
  addMassLossRow(); addMassLossRow(); // start with two rows
}
function addMassLossRow(){
  const box = document.getElementById('mal-rows');
  if(!box) return;
  const today = window.__malToday || _todayLocalISO();
  const row = document.createElement('div');
  row.className = 'mal-row';
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center';
  row.innerHTML =
    '<input type="date" class="mal-date" max="'+today+'" value="'+today+'" style="flex:1;font-size:16px;padding:10px;color-scheme:dark">'+
    '<input type="time" class="mal-time" value="12:00" style="width:96px;font-size:16px;padding:10px;color-scheme:dark">'+
    '<button class="btn" onclick="this.parentElement.remove()" style="width:40px;padding:10px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx3)">\u2715</button>';
  box.appendChild(row);
}
function commitMassAddLosses(){
  loadV();
  if(curVice<0) return;
  const rows = Array.from(document.querySelectorAll('#mal-rows .mal-row'));
  const dates = [];
  rows.forEach(r => {
    const d = r.querySelector('.mal-date')?.value;
    const t = r.querySelector('.mal-time')?.value || '12:00';
    if(d){ const iso = new Date(d+'T'+t+':00'); if(!isNaN(iso)) dates.push(iso.toISOString()); }
  });
  if(!dates.length){ showToast('Nothing to add','Add at least one day first.'); return; }
  // Apply in chronological order so each streak length is computed against the prior reset —
  // this makes relapseHistory and cleanDaysTotal come out exactly as if logged at the time.
  dates.sort();
  const v = vices[curVice];
  dates.forEach(whenStr => {
    const when = new Date(whenStr);
    // Clean days from the current startDate up to this relapse moment.
    let cleanBeforeReset = 0;
    if(v.startDate){
      const ms = when.getTime() - new Date(v.startDate).getTime();
      cleanBeforeReset = ms > 0 ? Math.floor(ms / 86400000) : 0;
    }
    v.total = (v.total||0) + 1;
    v.cleanDaysTotal = (v.cleanDaysTotal||0) + cleanBeforeReset;
    v.relapseCount = (v.relapseCount||0) + 1;
    if(!v.relapseHistory) v.relapseHistory = [];
    v.relapseHistory.push({ date: whenStr, streakLength: cleanBeforeReset });
    v.startDate = whenStr;   // streak restarts from this real moment
    v.lastLoss = whenStr;
    // Mirror into the fight log so pattern intelligence & syntheses see these losses.
    const fl = ls('totry_fight_log') || [];
    fl.unshift({ vice: v.n, won: false, intensity: null, trigger: null, note: 'backfilled', ts: whenStr, date: new Date(whenStr).toLocaleDateString('en-AU') });
    ls('totry_fight_log', fl.slice(0, 200));
  });
  saveV();
  if(typeof syncToCloud==='function') syncToCloud();
  document.querySelector('.modal-bg.open')?.remove();
  renderVices(); renderScoreboard(); renderDayCounter();
  if(typeof renderHomeQuickWins==='function') renderHomeQuickWins();
  if(typeof renderHomeHabits==='function') renderHomeHabits();
  haptic('tick');
  showToast('Logged honestly', dates.length + (dates.length===1?' slip recorded.':' slips recorded.') + ' Your record is true again — and your total clean days were kept.');
}

function logLoss(whenISO){
  haptic("warning");
  loadV();
  // Backdating: a relapse may have happened earlier than "now". If a valid past date is
  // given, the streak resets as of THAT day and the clean-days credited reflect the real timeline.
  const when = (whenISO && !isNaN(new Date(whenISO))) ? new Date(whenISO) : new Date();
  const whenStr = when.toISOString();
  if(curVice>=0){
    const v=vices[curVice];
    v.total=(v.total||0)+1;
    // GRACEFUL RELAPSE: preserve all progress, reset streak with compassion
    const cleanBeforeReset=viceCleanDays(v);
    v.cleanDaysTotal=(v.cleanDaysTotal||0)+cleanBeforeReset;
    v.relapseCount=(v.relapseCount||0)+1;
    if(!v.relapseHistory)v.relapseHistory=[];
    v.relapseHistory.push({date:whenStr,streakLength:cleanBeforeReset});
    v.startDate=whenStr;   // streak restarts from when it actually happened
    v.lastLoss=whenStr;
    // MIRROR IT INTO THE FIGHT LOG. This is the SOS "I gave in" button — the most honest thing a
    // person does in this app — and it wrote nothing here, so the slip was invisible to every
    // surface built on totry_fight_log: trigger pattern analysis, the risk-window engine that
    // decides when to reach out first, the weekly synthesis, "N slips this week". The mass-backfill
    // path twenty lines up already does this; the live one, which matters more, did not.
    try{
      const fl = ls('totry_fight_log') || [];
      // NO intensity/trigger HERE. Those globals belong to the quick-log flow (04-fight.js sets them,
      // logWin clears them), and this live SOS path never captures either — so reading them stamped
      // a relapse with whatever a previous, unrelated quick-log had left behind, and the trigger
      // analysis built on that field would have learned a pattern from someone else's answer.
      // Better an honest null than a borrowed value.
      fl.unshift({ vice: v.n, won: false, intensity: null, trigger: null,
        ts: whenStr, date: new Date(whenStr).toLocaleDateString('en-AU') });
      ls('totry_fight_log', fl.slice(0, 200));
    }catch(_){ }
    saveV();
    
    // Compassionate response - show total progress preserved
    const total=(v.cleanDaysTotal||0);
    closeSos();
    renderVices();renderScoreboard();renderDayCounter();
    if(typeof renderHomeQuickWins==='function') renderHomeQuickWins();
    if(typeof autoTickHabits==='function') autoTickHabits();
    if(typeof renderHomeHabits==='function') renderHomeHabits();
    
    const m=document.createElement('div');
    m.className='modal-bg open';
    m.style.alignItems='center';
    m.innerHTML='<div class="modal">'+
      '<div class="modal-handle"></div>'+
      '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);font-style:italic;margin-bottom:10px">This isn\'t the end.</div>'+
      '<div style="text-align:center;font-size:14px;color:var(--tx2);line-height:1.7;margin-bottom:16px">You showed up and told the truth. That takes more strength than pretending.</div>'+
      (cleanBeforeReset>0?'<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:14px;margin-bottom:16px;text-align:center">'+
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">You did not lose your progress</div>'+
        '<div style="font-size:16px;color:var(--gr)">'+total+' total clean days still yours</div>'+
        '<div style="font-size:12px;color:var(--tx3);margin-top:4px">That '+cleanBeforeReset+'-day streak was real. It still counts.</div>'+
      '</div>':'')+
      (function(){ const _l=_faithLine('The righteous falls seven times and rises again.');
        return _l ? '<div style="text-align:center;font-style:italic;font-family:Cormorant Garamond,serif;font-size:15px;color:var(--tx3);margin-bottom:16px">\u201c'+_escFew(_l)+'\u201d</div>' : ''; })()+
      '<button class="btn primary" onclick="closeModal(this)" style="margin-bottom:8px">Begin again from today</button>'+
      '<button class="btn" onclick="closeModal(this);go(\'coach\');setTimeout(()=>{if(typeof sendCoachPrompt===\'function\')sendCoachPrompt(\'I just had a relapse and I want to understand what led to it.\');},400)" style="background:var(--bg3);border:1px solid var(--bd)">Talk to my coach about it</button>'+
      '</div>';
    document.body.appendChild(m);
    return;
  }
  closeSos();
  renderVices();renderScoreboard();renderDayCounter();
}

// "I failed before opening the app" - log a loss without opening intervention
function logHonestLoss(viceName){
  loadV();
  const v=vices.find(vc=>vc.n===viceName);
  if(!v)return;
  v.total=(v.total||0)+1;
  v.lastLoss=new Date().toISOString();
  // This did NOT reset the streak — it only bumped `total` and stamped lastLoss. viceCleanDays()
  // reads startDate FIRST and only falls back to lastLoss, so for any established vice the counter
  // kept climbing after an admitted relapse. Someone taps "I failed before opening this. Be honest."
  // — the hardest button in the app — and the app answers with a clean streak they know they do not
  // have. CLAUDE.md is explicit: never congratulate a clean streak that isn't real. It also made
  // honesty the one action with no consequence, which teaches people not to bother being honest.
  // Same bookkeeping a normal relapse does, so the number tells the truth and the days they DID put
  // in are banked rather than erased.
  const cleanBeforeReset = (typeof viceCleanDays==='function') ? viceCleanDays(v) : 0;
  v.cleanDaysTotal = (v.cleanDaysTotal || 0) + cleanBeforeReset;
  v.relapseCount = (v.relapseCount || 0) + 1;
  if(!v.relapseHistory) v.relapseHistory = [];
  v.relapseHistory.push({date: new Date().toISOString(), streakLength: cleanBeforeReset, honest: true});
  v.startDate = new Date().toISOString();
  // An honestly-logged slip is real data about WHEN it happens — teach the risk-window engine too.
  try{ if(typeof _recordFightMoment==='function') _recordFightMoment(v.n, false); }catch(_){}
  saveV();
  renderVices();
  renderScoreboard();
  renderDayCounter();
  // Grace over shame, and honest about what changed. The banked days are the point: nothing they
  // actually did is taken away from them.
  showToast('Honest. Logged.', cleanBeforeReset>0
    ? ('The count starts again today \u2014 and your '+cleanBeforeReset+' day'+(cleanBeforeReset===1?'':'s')+' stay in your total. Telling the truth is the harder thing, and you did it.')
    : 'The count starts again today. Telling the truth is the harder thing, and you did it.');
}

function logWin(){
  haptic("celebrate");
  loadV();
  if(curVice>=0){
    vices[curVice].w=(vices[curVice].w||0)+1;
    vices[curVice].total=(vices[curVice].total||0)+1;
    vices[curVice].lastWin=new Date().toISOString();
    
    // Ensure startDate exists for streak counting
    if(!vices[curVice].startDate)vices[curVice].startDate=new Date().toISOString();
    // Track money saved on this specific decision
    const viceName=vices[curVice].n.toLowerCase();
    // Default $/decision estimates by vice type
    let savedNow=0;
    if(/weed|cannabis|marijuana/.test(viceName))savedNow=20;
    else if(/vape|nicotine/.test(viceName))savedNow=5;
    else if(/cigarette|smoke/.test(viceName))savedNow=15;
    else if(/alcohol|drink/.test(viceName))savedNow=15;
    else if(/gambl|bet/.test(viceName))savedNow=30;
    else if(/spend|shop/.test(viceName))savedNow=25;
    else if(/food binge|junk|fast food/.test(viceName))savedNow=15;
    // The person's OWN figure wins over the guess table above. This used to read
    // ls('totry_vice_amt_'+name) — a key that occurs exactly once in this file, this read, and that
    // nothing has ever written, so the override was permanently unreachable and everyone got the
    // hardcoded guess. The real number is captured by saveViceCost() on the vice itself, which even
    // toasts a confirmation, so a person who took the trouble to enter what it costs them was told it
    // had been recorded and then never saw it used here.
    try{
      const _v = vices[curVice];
      const _amt = _v && parseFloat(_v.costAmount);
      // THE CONTRACT (line ~17505, and saveViceCost): costPer is 'day' | 'week' | 'use', and costUses is
      // written ONLY when costPer==='use', where it means USES PER WEEK — not "uses per the period".
      // My first version divided amount by costUses, which for the only configuration that HAS costUses
      // divides a per-use price by a weekly frequency: a $15 pack smoked 20 times a week became $0.75
      // saved per avoided cigarette instead of $15. Wrong in every configuration it fired in.
      //
      // What one avoided use is worth:
      //   costPer 'use'  → costAmount already IS the per-use price. Use it as-is.
      //   costPer 'day'  → the day's spend, only if they avoid it all day; too generous per single urge,
      //   costPer 'week' → likewise. For both, fall back to the guess table rather than invent a
      //                    frequency the person never gave us. A wrong number is worse than a rough one.
      if(_amt > 0 && String(_v.costPer||'') === 'use'){
        savedNow = Math.round(_amt * 100) / 100;
      }
    }catch(_){ }
    
    if(savedNow > 0){
      const savings=ls('totry_vice_savings_log')||[];
      savings.push({
        vice:vices[curVice].n,
        amount:savedNow,
        ts:new Date().toISOString(),
        date:new Date().toLocaleDateString('en-AU')
      });
      ls('totry_vice_savings_log',savings);
    }
    // Auto-log this victory into the Reflect wins log so the user is reminded of it.
    // Tagged with source:'vice' so it's clear it came from a defeated urge.
    const wins = ls('totry_wins') || [];
    wins.unshift({
      text: 'Defeated an urge to ' + vices[curVice].n.toLowerCase() + ' — chose who I\'m becoming.',
      ts: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-AU'),
      source: 'vice'
    });
    ls('totry_wins', wins.slice(0, 500));
    saveV();
  }
  // Record into the fight log so consented vices build pattern intelligence from SOS wins too.
  if(curVice>=0 && vices[curVice]){
    const fl = ls('totry_fight_log') || [];
    fl.unshift({ vice: vices[curVice].n, won: true, intensity: (window.__sosIntensity||null), trigger: (window.__sosTrigger||null), note: null, ts: new Date().toISOString(), date: new Date().toLocaleDateString('en-AU') });
    ls('totry_fight_log', fl.slice(0, 200));
    window.__sosIntensity = null; window.__sosTrigger = null;
  }
  const _viceWon = (curVice>=0 && vices[curVice] && vices[curVice].trackPatterns) ? vices[curVice].n : null;
  closeSos();renderVices();renderScoreboard();renderDayCounter();checkMilestones();
  if(typeof renderHomeQuickWins==='function')renderHomeQuickWins();
  if(typeof renderUrgeInsights==='function')renderUrgeInsights();
  if(typeof renderWinsLog==='function')renderWinsLog();
  if(typeof renderViceSavingsTotal==='function')renderViceSavingsTotal();
  setTimeout(() => showVerseToast('win', 'Word for your win'), 600);
  // Post-urge reflection — only for consented vices, only occasionally (every 3rd win),
  // so it captures what worked without nagging. Feeds future pattern insight.
  if(_viceWon){
    const fl = ls('totry_fight_log') || [];
    const wins = fl.filter(e => e.vice === _viceWon && e.won).length;
    if(wins % 3 === 0){ setTimeout(() => postUrgeReflection(_viceWon), 1400); }
  }
}

// Light, optional capture after a win: what helped + what set it off. Updates the most
// recent fight-log entry so the pattern engine gets richer over time.
function postUrgeReflection(viceName){
  const m = document.createElement('div');
  m.id = 'post-urge-modal';   // so saving closes THIS sheet, not whichever opened last
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:22px;color:var(--go);font-style:italic;margin-bottom:6px">You beat it. What helped?</div>'+
    '<div style="text-align:center;font-size:12px;color:var(--tx3);margin-bottom:16px">10 seconds now makes the next fight easier. Optional.</div>'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">What set it off?</div>'+
    '<input type="text" id="pur-trigger" placeholder="stress, boredom, a person, late night..." style="margin-bottom:12px">'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">What got you through?</div>'+
    '<input type="text" id="pur-helped" placeholder="prayer, walked away, called someone, breathed..." style="margin-bottom:14px">'+
    '<button class="btn primary" onclick="savePostUrge(\''+viceName.replace(/'/g,"\\'")+'\')" style="margin-bottom:8px">Save</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Skip</button>'+
    '</div>';
  document.body.appendChild(m);
}
function savePostUrge(viceName){
  const trig = document.getElementById('pur-trigger')?.value.trim();
  const helped = document.getElementById('pur-helped')?.value.trim();
  const fl = ls('totry_fight_log') || [];
  const idx = fl.findIndex(e => e.vice === viceName && e.won);
  if(idx > -1){
    if(trig) fl[idx].trigger = trig;
    if(helped) fl[idx].note = 'what helped: ' + helped;
    ls('totry_fight_log', fl);
  }
  document.getElementById('post-urge-modal')?.remove();
  if(typeof renderUrgeInsights === 'function') renderUrgeInsights();
  haptic('tick');
  showToast('Saved', 'That\'s how you build the map out.');
}

function getViceSavingsTotal(){
  const log=ls('totry_vice_savings_log')||[];
  return log.reduce((sum,e)=>sum+(e.amount||0),0);
}

function renderViceSavingsTotal(){
  const total=getViceSavingsTotal();
  // #saved-num has one owner — see reclaimedFigure in 16-money.js. This used to overwrite the
  // per-vice figure with the savings-log total, so the same number differed by navigation order.
  if(typeof renderReclaimed === 'function') renderReclaimed();
  const desc=document.getElementById('saved-desc');
  const log=ls('totry_vice_savings_log')||[];
  if(desc){
    if(log.length){
      desc.textContent=log.length+' wins logged · each "no" saved real money';
    }else{
      desc.textContent='Every "I beat it" saves money. Start fighting to see this grow.';
    }
  }
}
// The add-a-vice form is collapsed once you already have vices — this reveals it on demand so the
// screen stays about the fight, not a setup form sitting open forever.
function toggleAddVice(){
  const body=document.getElementById('add-vice-body');
  const tog=document.getElementById('add-vice-toggle');
  if(!body||!tog) return;
  const show = body.style.display==='none';
  body.style.display = show ? 'block' : 'none';
  tog.textContent = show ? '− Close' : '+ Add another to the fight';
  if(show){ const n=document.getElementById('v-name'); if(n) setTimeout(()=>n.focus(),50); }
  if(typeof haptic==='function') haptic('tap');
}
function renderVices(){
  loadV();const list=document.getElementById('vices-list');if(!list)return;
  list.innerHTML='';let tw=0;
  vices.forEach((v,i)=>{
    tw+=v.w||0;
    const pct=v.total>0?Math.round(((v.w||0)/v.total)*100):0;
    // Clean days from startDate (the real streak)
    const cleanDays=viceCleanDays(v);
    
    // Pattern insight from urge log
    let insight='';
    if(v.urgelog&&v.urgelog.length>=3){
      const counts={};v.urgelog.forEach(t=>{const h=new Date(t).getHours();counts[h]=(counts[h]||0)+1;});
      const peak=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
      if(peak){const h=parseInt(peak[0]);const label=h<6?'late night':h<12?'morning':h<17?'afternoon':h<21?'evening':'late night';insight=' \u00b7 Peaks '+label;}
    }
    
    // Total clean days across all attempts (grace - never lose your progress)
    let totalInsight='';
    if(v.relapseCount&&v.relapseCount>0){
      const total=(v.cleanDaysTotal||0)+cleanDays;
      totalInsight='<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--bl);margin-top:6px;padding-top:6px;border-top:1px solid var(--bd)">' + total + ' total clean days &middot; ' + v.relapseCount + ' reset' + (v.relapseCount===1?'':'s') + ' &middot; you keep going</div>';
    }
    
    // Live HH:MM:SS clock for hours-precision when day < 7
    let liveClock = '';
    if(cleanDays < 7 && v.startDate){
      const start = new Date(v.startDate).getTime();
      // Never negative — see the note above. A use stamped later today means the clock starts then.
      const elapsed = Math.max(0, Date.now() - start);
      const h = Math.floor((elapsed % 86400000) / 3600000);
      const m = Math.floor((elapsed % 3600000) / 60000);
      const s = Math.floor((elapsed % 60000) / 1000);
      liveClock = ' &middot; ' + h + 'h ' + m + 'm ' + s + 's';
    }
    
    const c=document.createElement('div');
    c.className='vice-card';
    c.style.cssText = 'background:var(--bg2);border:1px solid var(--bd);border-radius:14px;padding:14px;margin-bottom:10px';
    c.dataset.viceIdx = i;
    if(v.startDate) c.dataset.viceStart = v.startDate;

    if(v.kind === 'letgo'){
      // LETTING-GO CARD: a healing goal, not a streak. The counter only ever climbs (days of choosing
      // yourself) — going back never resets it, because grief isn't linear. No red, no shame, no relapse.
      const lgDays = v.startDate ? _calDaysSince(v.startDate) : 0;
      c.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">'+
          '<div style="flex:1">'+
            '<div class="eyebrow">'+String(v.n).replace(/</g,'&lt;')+'</div>'+
            '<div style="font-family:DM Mono,monospace;font-size:24px;font-weight:500;color:var(--go)">'+lgDays+' <span style="font-size:11px;color:var(--tx3)">day'+(lgDays===1?'':'s')+' of choosing yourself</span></div>'+
          '</div>'+
          '<div style="font-size:20px">🕊️</div>'+
        '</div>'+
        '<div style="font-size:11.5px;color:var(--tx3);margin-bottom:12px;line-height:1.55">Grief isn’t linear — going back is part of letting go, not a failure. Nothing resets here.</div>'+
        '<button class="vice-btn" onclick="openLettingGo()" style="width:100%;background:var(--go);color:#1a1505;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:600;cursor:pointer">Feeling the pull? Come here first</button>'+
        '<button onclick="_letGoWentBack('+i+')" style="width:100%;margin-top:8px;background:none;border:1px solid var(--bd);color:var(--tx2);border-radius:10px;padding:9px;font-size:12px;cursor:pointer">I reached out / looked them up</button>'+
        '<button onclick="openViceManage('+i+')" style="width:100%;margin-top:10px;background:none;border:none;color:var(--tx3);font-size:11px;cursor:pointer;padding:6px">Manage &middot; rename, remove</button>';
      list.appendChild(c);
      return;
    }

    if(viceMode(v) === 'watch'){
      // WATCHING CARD: a mirror, and nothing else. No streak, no line, no verdict, no colour that
      // means good or bad. They have not made a promise, so there is nothing here to keep or break.
      // The only thing the app does is show them what they logged — which, for someone still
      // deciding, is the intervention. Anything more is pressure, and pressure is what produces
      // resistance rather than change.
      const _uses = (ls('totry_vice_uses')||[]).filter(u=>u && u.v===v.n && u.ts);
      const _now = Date.now();
      const _in = (d)=>_uses.filter(u=>{const t=new Date(u.ts).getTime(); return !isNaN(t) && (_now-t) <= d*86400000;});
      const _n7 = _in(7).reduce((a,u)=>a+(parseInt(u.qty,10)||1),0);
      const _n30 = _in(30).reduce((a,u)=>a+(parseInt(u.qty,10)||1),0);
      const _days30 = new Set(_in(30).map(u=>new Date(u.ts).toLocaleDateString('en-AU'))).size;
      const _lastT = _uses.length ? Math.max.apply(null, _uses.map(u=>new Date(u.ts).getTime()).filter(t=>!isNaN(t))) : 0;
      const _since = _lastT ? Math.floor((_now-_lastT)/86400000) : null;
      // The offer, once they have enough of their own data to be looking at something real — and
      // never again once they have answered it. An offer that repeats is a nag.
      const _enough = _uses.length >= 6 && _days30 >= 3;
      const _offer = (_enough && !v.goalOffered)
        ? '<div style="margin-top:12px;padding:11px 12px;background:var(--bg3);border:1px solid var(--bd);border-radius:10px">'+
            '<div style="font-size:12.5px;color:var(--tx2);line-height:1.6;margin-bottom:9px">You have been watching this a while now. Want to name what you actually want with it \u2014 or keep just watching? Either is a real answer.</div>'+
            '<div style="display:flex;gap:8px">'+
              '<button onclick="_watchSetGoal('+i+')" style="flex:1;background:var(--bg2);border:1px solid var(--go-bd);color:var(--go);border-radius:9px;padding:9px;font-size:12px;cursor:pointer">Set a goal</button>'+
              '<button onclick="_watchKeepWatching('+i+')" style="flex:1;background:none;border:1px solid var(--bd);color:var(--tx3);border-radius:9px;padding:9px;font-size:12px;cursor:pointer">Keep watching</button>'+
            '</div></div>'
        : '';
      c.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">'+
          '<div style="flex:1">'+
            '<div class="eyebrow">'+_escFew(v.n)+' &middot; just watching</div>'+
            '<div style="font-family:DM Mono,monospace;font-size:24px;font-weight:500;color:var(--tx2)">'+_n30+' <span style="font-size:11px;color:var(--tx3)">in the last 30 days'+(_days30?(' \u00b7 '+_days30+' day'+(_days30===1?'':'s')):'')+'</span></div>'+
          '</div>'+
          '<div style="font-size:20px">\uD83D\uDC41\uFE0F</div>'+
        '</div>'+
        '<div style="font-size:11.5px;color:var(--tx3);margin-bottom:12px;line-height:1.55">'+
          (_uses.length
            ? ('This week: '+_n7+'.'+(_since!=null?(' Last: '+(_since===0?'today':_since===1?'yesterday':_since+' days ago')+'.'):'')+' No goal set \u2014 nothing here to keep or break. I am just holding the mirror.')
            : 'Nothing logged yet. Log it honestly when it happens and I will show you the shape of it \u2014 no target, no streak, no verdict.')+
        '</div>'+
        '<button class="vice-btn" onclick="openLogUse('+i+')" style="width:100%;background:var(--bg3);border:1px solid var(--bd);color:var(--tx);border-radius:10px;padding:11px;font-size:13px;cursor:pointer">Log honestly</button>'+
        _offer+
        '<button onclick="openViceManage('+i+')" style="width:100%;margin-top:10px;background:none;border:none;color:var(--tx3);font-size:11px;cursor:pointer;padding:4px">Manage</button>';
      list.appendChild(c);
      return;
    }

    if(v.mode === 'moderate'){
      // MODERATION CARD: the goal is staying within a limit, not a streak. No "clean days",
      // no "relapse", no shame — just how often they held their line.
      const within = v.modWithin || 0;
      const over = v.modOver || 0;
      const totalChecks = within + over;
      const holdRate = totalChecks > 0 ? Math.round((within / totalChecks) * 100) : null;
      c.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">' +
          '<div style="flex:1">' +
            '<div class="eyebrow">' + String(v.n||'').replace(/</g,'&lt;') + ' &middot; keeping in check</div>' +
            '<div style="font-family:DM Mono,monospace;font-size:24px;font-weight:500;color:var(--go)">' + within + ' <span style="font-size:11px;color:var(--tx3)">time' + (within===1?'':'s') + ' within limit</span></div>' +
            (v.limit ? '<div style="font-size:11px;color:var(--tx2);margin-top:3px">Your limit: ' + String(v.limit).replace(/</g,'&lt;') + '</div>' : '') +
          '</div>' +
          (holdRate !== null ? '<div style="text-align:right">' +
            '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em">Held it</div>' +
            '<div style="font-family:DM Mono,monospace;font-size:14px;color:' + (holdRate >= 70 ? 'var(--gr)' : holdRate >= 40 ? 'var(--go)' : 'var(--tx2)') + ';margin-top:2px">' + holdRate + '%</div>' +
            '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">' + within + '/' + totalChecks + '</div>' +
          '</div>' : '') +
        '</div>' +
        '<div style="font-size:11px;color:var(--tx3);margin-bottom:10px">Usually: ' + (v.t || 'various times').replace(/</g,'&lt;') + insight + '</div>' +
        _stageStripHTML(i) + _pledgeRowHTML(i) + _stageCtaHTML(i) +
        (function(){
          const thr = v.modThreshold || 0;
          const s = _getModSession(i);
          const unit = _modUnit(v);
          if(thr > 0){
            const count = s ? s.count : 0;
            const col = count===0 ? 'var(--tx2)' : count < thr ? 'var(--gr)' : count === thr ? 'var(--go)' : 'var(--re)';
            const statusLine = !s ? ('Tap + as you go. Your line: ' + thr + ' ' + unit + '.')
              : count < thr ? ('Within your line of ' + thr + '. ' + (thr-count) + ' to go.')
              : count === thr ? ('At your limit of ' + thr + '. Be intentional from here.' + ((v.plan&&v.plan.move)?(' Your move: '+v.plan.move+'.'):''))
              : ('Past your line of ' + thr + ' \u2014 noticed, not judged.' + ((v.plan&&v.plan.move)?(' Your move: '+v.plan.move+'.'):''));
            return '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:8px">'+
              '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">'+
                '<button onclick="modCountDown('+i+')" aria-label="minus" style="width:40px;height:40px;border-radius:50%;background:var(--bg);border:1px solid var(--bd);color:var(--tx2);font-size:20px;cursor:pointer">\u2212</button>'+
                '<div style="text-align:center;flex:1"><div style="font-family:DM Mono,monospace;font-size:34px;font-weight:600;color:'+col+';line-height:1">'+count+'</div><div style="font-size:10px;color:var(--tx3);margin-top:2px">'+unit+' tonight</div></div>'+
                '<button onclick="modCountUp('+i+')" aria-label="plus" style="width:40px;height:40px;border-radius:50%;background:var(--go);border:none;color:#1a1505;font-size:22px;font-weight:600;cursor:pointer">+</button>'+
              '</div>'+
              '<div style="font-size:11px;color:var(--tx3);text-align:center;margin-top:10px;line-height:1.5">'+statusLine+'</div>'+
              (s ? '<button onclick="modEndSession('+i+')" style="width:100%;margin-top:10px;background:none;border:1px solid var(--bd);color:var(--tx2);border-radius:8px;padding:8px;font-size:11px;cursor:pointer">End the night \u00b7 log it</button>' : '')+
            '</div>'+
            (function(){
              // The counter above is tonight. This is the truth of the week — the number that
              // actually tells you whether "limiting it" is happening or just being said.
              const wk = viceUsesInWeek(v.n); if(!wk) return '';
              const spend = viceSpendInWeek(v.n);
              return '<div style="font-size:11px;color:var(--tx3);text-align:center;margin-bottom:8px;line-height:1.5">'+
                wk+' '+unit+' logged in the last 7 days'+(spend>0?' · '+curSym()+Math.round(spend)+' spent':'')+'</div>';
            })()+
            '<button class="vice-btn" onclick="openMomentStakes(' + i + ')" style="width:100%;background:none;border:1px solid var(--go-bd);color:var(--go);border-radius:10px;padding:9px;font-size:12px;cursor:pointer;margin-bottom:6px">Feeling the pull? Come here first</button>'+
            // TIER 1.4 — HALT lived only behind the mid-craving door, which is the worst moment to
            // learn a tool. Most urges are a body asking for food, rest, or a person; naming that
            // BEFORE the pull starts is the cheap version of the same skill. Same openHALT(), one tap
            // from the card they already look at.
            '<button onclick="openHALT()" style="width:100%;background:none;border:1px dashed var(--bd);color:var(--tx3);border-radius:10px;padding:8px;font-size:11px;cursor:pointer;margin-bottom:6px">\uD83C\uDF7D What\u2019s underneath it right now?</button>'+
            '<button onclick="openLogUse(' + i + ')" style="width:100%;background:none;border:1px solid var(--bd);color:var(--tx3);border-radius:10px;padding:8px;font-size:11px;cursor:pointer;margin-bottom:6px">Log a day I missed</button>';
          }
          return '<button class="vice-btn" onclick="fightVice(' + i + ')" style="width:100%;background:var(--go);color:#1a1505;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">I\'m in a situation now</button>'+
            '<div style="display:flex;gap:8px;margin-top:8px">'+
              '<button onclick="curVice=' + i + ';logModerateWithin()" style="flex:1;background:var(--gr-bg);border:1px solid var(--gr-bd);color:var(--gr);border-radius:8px;padding:8px;font-size:11px;cursor:pointer">Stayed within \u2713</button>'+
              '<button onclick="curVice=' + i + ';logModerateOver()" style="flex:1;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);border-radius:8px;padding:8px;font-size:11px;cursor:pointer">Went over</button>'+
            '</div>';
        })() +
        '<div style="display:flex;gap:10px;margin-top:8px;font-size:10px;align-items:center">' +
          '<button onclick="openRecoveryTimeline(' + i + ')" style="background:none;border:none;color:var(--gr);cursor:pointer;padding:4px 0">\uD83C\uDF3F What moderation is earning you</button>' +
          '<button onclick="openViceManage(' + i + ')" style="background:none;border:none;color:var(--tx3);cursor:pointer;padding:4px 0;margin-left:auto">Manage</button>' +
        '</div>';
      list.appendChild(c);
      return;
    }

    c.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">' +
        '<div style="flex:1">' +
          '<div class="eyebrow">' + _escFew(v.n) + '</div>' +
          '<div style="font-family:DM Mono,monospace;font-size:24px;font-weight:500;color:' + (cleanDays >= 7 ? 'var(--gr)' : cleanDays >= 1 ? 'var(--go)' : 'var(--tx2)') + '">' + cleanDays + ' <span style="font-size:11px;color:var(--tx3)">day' + (cleanDays===1?'':'s') + ' clean</span></div>' +
          (liveClock ? '<div class="vice-live-clock" style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);margin-top:2px">' + liveClock.replace(' &middot; ', '') + '</div>' : '') +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em">Win rate</div>' +
          '<div style="font-family:DM Mono,monospace;font-size:14px;color:' + (pct >= 70 ? 'var(--gr)' : pct >= 40 ? 'var(--go)' : 'var(--tx2)') + ';margin-top:2px">' + pct + '%</div>' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">' + (v.w||0) + '/' + (v.total||0) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--tx3);margin-bottom:10px">Usually hits: ' + _escFew(v.t || 'various times') + insight + '</div>' +
      _stageStripHTML(i) + _pledgeRowHTML(i) +
      (viceNeedsCheckIn(v) ?
        '<div style="background:var(--go-bg);border:1px solid var(--go-bd);border-radius:12px;padding:12px;margin-bottom:10px">' +
          '<div style="font-size:12px;color:var(--tx2);line-height:1.55;margin-bottom:10px">It\'s been a week since you last said anything here, and the count kept climbing on its own. I\'d rather it be true than tidy — are you still clean?</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button onclick="confirmViceClean(' + i + ')" style="flex:1;background:var(--gr-bg);border:1px solid var(--gr-bd);color:var(--gr);border-radius:9px;padding:9px;font-size:12px;cursor:pointer">Still clean</button>' +
            '<button onclick="openLogUse(' + i + ')" style="flex:1;background:none;border:1px solid var(--bd);color:var(--tx2);border-radius:9px;padding:9px;font-size:12px;cursor:pointer">No — I\'ve used</button>' +
          '</div>' +
        '</div>' : '') +
      _stagePrimaryHTML(i) +
      '<button class="vice-btn" onclick="openHALT()" style="width:100%;background:var(--bg3);color:var(--tx2);border:1px solid var(--bd);border-radius:10px;padding:9px;font-size:12.5px;cursor:pointer;margin-top:6px">\u{1F37D} Hungry, angry, lonely or tired?</button>' +
      (function(){
        // The wins for NOT acting, counted back to him. This is the one number most recovery apps
        // never show, because they only track the fall.
        const tw=momentsWonInWeek(v.n); if(!tw) return '';
        return '<div style="text-align:center;font-size:11px;color:var(--gr);margin-top:8px;line-height:1.5">You came here and turned away '+tw+' time'+(tw===1?'':'s')+' this week. That’s the fight, won.</div>';
      })() +
      '<button onclick="openLogUse(' + i + ')" style="width:100%;margin-top:8px;background:none;border:1px solid var(--bd);color:var(--tx2);border-radius:10px;padding:9px;font-size:12px;cursor:pointer">I used — log it honestly</button>' +
      '<button onclick="openRecoveryTimeline(' + i + ')" style="width:100%;margin-top:8px;background:var(--gr-bg);border:1px solid var(--gr-bd);color:var(--gr);border-radius:10px;padding:9px;font-size:12px;cursor:pointer">\u{1F33F} What this streak is earning you</button>' +
      totalInsight +
      // One quiet "manage" door instead of six loose links. Backdating lives in "I used" (it takes any
      // date), so the old "log a past slip / add several" buttons are gone — they did the same thing.
      '<button onclick="openViceManage(' + i + ')" style="width:100%;margin-top:10px;background:none;border:none;color:var(--tx3);font-size:11px;cursor:pointer;padding:14px 6px;min-height:44px;letter-spacing:0.03em">Manage &middot; start date, cost, mode, remove</button>';
    list.appendChild(c);
  });
  
  // Add-a-vice form: expanded for the first-time user (they need it), collapsed behind a button
  // once there's at least one vice — so the screen stays about the fight, not the setup form.
  const avBody=document.getElementById('add-vice-body');
  const avTog=document.getElementById('add-vice-toggle');
  if(avBody&&avTog){
    const has=vices.length>0;
    avBody.style.display = has ? 'none' : 'block';
    avTog.style.display  = has ? 'block' : 'none';
    avTog.textContent = '+ Add another to the fight';
  }
  const tapHint=document.getElementById('fight-tap-hint');
  if(tapHint) tapHint.style.display = vices.length>0 ? '' : 'none';

  // Update main sobriety clock to show the LONGEST current streak.
  // Only abstinence ("quit") vices count here — moderation vices have no clean-day streak.
  // Hide the whole clock when there's no quit-vice to count: a big "0 Days clean" over an empty or
  // moderation-only fight is confusing, and against grace-over-shame.
  const quitVices = vices.filter(v => viceIsAbstinence(v));
  const sobClock=document.getElementById('sob-clock-main');
  if(sobClock) sobClock.style.display = quitVices.length ? '' : 'none';
  if(quitVices.length){
    const maxClean=Math.max(...quitVices.map(v=>viceCleanDays(v)));
    const cleanEl=document.getElementById('sob-days');
    if(cleanEl)cleanEl.textContent=maxClean;
    
    // Start live ticker for vices with sub-7-day streaks
    if(!window.__viceTickerRunning){
      window.__viceTickerRunning = true;
      setInterval(() => {
        const cards = document.querySelectorAll('.vice-card .vice-live-clock');
        cards.forEach(el => {
          const card = el.closest('.vice-card');
          const start = card?.dataset.viceStart;
          if(!start) return;
          const elapsed = Date.now() - new Date(start).getTime();
          const h = Math.floor((elapsed % 86400000) / 3600000);
          const m = Math.floor((elapsed % 3600000) / 60000);
          const s = Math.floor((elapsed % 60000) / 1000);
          el.textContent = h + 'h ' + m + 'm ' + s + 's';
        });
      }, 1000);
    }
  }
  
  // Render trigger pattern card if there's enough data
  renderTriggerPatternCard();
}

// ── TRIGGER PATTERN ANALYSIS ────────────────────────────────────
// Parses totry_fight_log for: top triggers, day-of-week peaks, time windows,
// common note words, and win rates per trigger context. Surfaces in Fight tab.
function renderTriggerPatternCard(){
  const container = document.getElementById('vices-list');
  if(!container) return;
  
  // Find existing pattern card and remove (we re-render)
  const existing = document.getElementById('trigger-pattern-card');
  if(existing) existing.remove();
  
  const _all = ls('totry_fight_log') || [];
  // Only vices whose owner ticked "track my patterns for this" — see the note above.
  let log = _all;
  try{
    loadV();
    const consented = new Set((vices||[]).filter(v => v && v.trackPatterns && v.n).map(v => String(v.n)));
    log = _all.filter(e => e && e.vice && consented.has(String(e.vice)));
  }catch(_){ log = []; }
  if(log.length < 5) return; // Need at least 5 fights for meaningful patterns
  
  // ── Aggregate stats ──
  const triggerCounts = {};
  const dowCounts = [0,0,0,0,0,0,0]; // Sun-Sat
  const dowWins = [0,0,0,0,0,0,0];
  const timeBuckets = {morning:0, afternoon:0, evening:0, night:0};
  const timeWins = {morning:0, afternoon:0, evening:0, night:0};
  const wordCounts = {};
  const triggerWins = {};
  
  // Common stopwords to skip (don't surface boring words)
  const STOPWORDS = new Set([
    'the','a','an','i','my','me','to','of','in','on','at','and','or','but','so',
    'is','was','are','were','be','been','being','have','has','had','do','does','did',
    'with','for','from','by','it','its','this','that','these','those','as','if','then',
    'just','about','really','very','too','also','some','any','all','no','not','again',
    'when','where','why','how','what','who','which','can','could','would','should','will',
    'feel','feeling','felt','went','go','going','get','got','make','made','want','wanted',
    'know','think','thinking','thought','say','said','tell','told','one','two','three',
    'still','because','even','only','more','most','am','m','re','ve','ll','t','s','d',
    'today','yesterday','tomorrow','time','day','night','morning','afternoon','evening',
    'after','before','during','until','while','since','than','now','yet','here','there'
  ]);
  
  log.forEach(f => {
    if(!f.ts) return;
    const d = new Date(f.ts);
    const dow = d.getDay();
    dowCounts[dow]++;
    if(f.won) dowWins[dow]++;
    
    const hour = d.getHours();
    let bucket;
    if(hour < 6) bucket = 'night';
    else if(hour < 12) bucket = 'morning';
    else if(hour < 17) bucket = 'afternoon';
    else if(hour < 21) bucket = 'evening';
    else bucket = 'night';
    timeBuckets[bucket]++;
    if(f.won) timeWins[bucket]++;
    
    if(f.trigger){
      const t = f.trigger.toLowerCase().trim();
      if(t && t.length < 60){
        triggerCounts[t] = (triggerCounts[t] || 0) + 1;
        if(!triggerWins[t]) triggerWins[t] = {wins:0, total:0};
        triggerWins[t].total++;
        if(f.won) triggerWins[t].wins++;
      }
    }
    
    if(f.note){
      const words = f.note.toLowerCase().match(/[a-z']+/g) || [];
      words.forEach(w => {
        if(w.length < 4) return; // skip tiny words
        if(STOPWORDS.has(w)) return;
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      });
    }
  });
  
  // ── Find top signals ──
  const topTrigger = Object.entries(triggerCounts).sort((a,b)=>b[1]-a[1])[0];
  const topWords = Object.entries(wordCounts).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]).slice(0,5);
  
  const dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const topDow = dowCounts.map((c,i) => ({dow:i, count:c, wins:dowWins[i]}))
    .filter(d => d.count >= 2)
    .sort((a,b) => b.count - a.count)[0];
  
  const topBucket = Object.entries(timeBuckets).sort((a,b)=>b[1]-a[1])[0];
  
  // Build insights — only show ones we have data for
  const insights = [];
  
  if(topTrigger && topTrigger[1] >= 2){
    const tw = triggerWins[topTrigger[0]];
    const rate = tw.total > 0 ? Math.round((tw.wins/tw.total)*100) : 0;
    insights.push({
      icon: '🎯',
      title: 'Top trigger',
      body: '"' + topTrigger[0] + '" — ' + topTrigger[1] + ' times · ' + rate + '% win rate'
    });
  }
  
  if(topDow && topDow.count >= 3){
    const rate = topDow.count > 0 ? Math.round((topDow.wins/topDow.count)*100) : 0;
    insights.push({
      icon: '📆',
      title: 'Hardest day',
      body: dowNames[topDow.dow] + 's — ' + topDow.count + ' fights · ' + rate + '% won'
    });
  }
  
  if(topBucket && topBucket[1] >= 3){
    const rate = topBucket[1] > 0 ? Math.round((timeWins[topBucket[0]]/topBucket[1])*100) : 0;
    insights.push({
      icon: '⏰',
      title: 'Peak window',
      body: topBucket[0].charAt(0).toUpperCase() + topBucket[0].slice(1) + ' — ' + topBucket[1] + ' fights · ' + rate + '% won'
    });
  }
  
  if(topWords.length >= 2){
    insights.push({
      icon: '🔍',
      title: 'Recurring words',
      body: topWords.map(([w,c]) => w + ' (' + c + ')').join(' · ')
    });
  }
  
  if(!insights.length) return; // Nothing meaningful to show
  
  // Build the card
  const card = document.createElement('div');
  card.id = 'trigger-pattern-card';
  card.style.cssText = 'background:linear-gradient(135deg,rgba(140,107,182,0.06),rgba(200,169,110,0.04));border:1px solid var(--go-bd);border-radius:14px;padding:14px;margin-top:12px;margin-bottom:10px';
  
  card.innerHTML =
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">Patterns from your fights</div>' +
    '<div style="font-family:Cormorant Garamond,serif;font-size:16px;color:var(--tx);font-style:italic;margin-bottom:12px">What the data is showing</div>' +
    insights.map(ins =>
      '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);font-size:12px">' +
        '<div style="font-size:16px;line-height:1">' + ins.icon + '</div>' +
        '<div style="flex:1">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">' + ins.title + '</div>' +
          '<div style="color:var(--tx2);line-height:1.5">' + ins.body.replace(/</g, '&lt;') + '</div>' +
        '</div>' +
      '</div>'
    ).join('') +
    '<div style="font-size:11px;color:var(--tx3);margin-top:10px;line-height:1.5;font-style:italic">Based on your last ' + log.length + ' fights. The more you log, the clearer the picture.</div>';
  
  container.appendChild(card);
}

async function removeVice(i){
  loadV();
  if(!vices[i])return;
  if(!(await askConfirm('Remove "'+vices[i].n+'"? Your fight history for it will be lost.'))) return;
  const _goneName = String(vices[i].n || '').toLowerCase();
  vices.splice(i,1);
  // Record the removal so the cloud merge cannot bring it back. pullFromCloud unions vices by NAME,
  // so that is the identity the tombstone has to carry — an id-based one would never be looked at.
  // Without this the vice reappeared on the next pull AND was re-uploaded, so deleting it again
  // could not work either: the only way out was to stop using the app on a second device.
  try{ if(typeof _tombAdd === 'function') _tombAdd('totry_v', _goneName); }catch(_){}
  saveV();renderVices();renderDayCounter();
  showToast('Removed','Vice removed from your list.');
}
// Quit vs moderate: not everything is total-abstinence. A drink with friends isn't a sin;
// drunkenness is. Moderation mode tracks "did I stay within my own limit" instead of streaks.
let viceModeChoice = 'quit';
function setViceMode(mode){
  viceModeChoice = mode;
  document.querySelectorAll('.v-mode-btn').forEach(b=>{
    const on = b.dataset.mode === mode;
    b.classList.toggle('on', on);
    b.style.borderColor = on ? 'var(--go-bd)' : 'var(--bd)';
    b.style.background = on ? 'var(--go-bg)' : 'var(--bg3)';
    b.style.color = on ? 'var(--tx)' : 'var(--tx2)';
  });
  const limitBox = document.getElementById('v-moderate-limit');
  if(limitBox) limitBox.style.display = mode === 'moderate' ? 'block' : 'none';
  const startLbl = document.getElementById('v-start-lbl');
  if(startLbl) startLbl.textContent = mode === 'moderate' ? 'Tracking since (optional)'
                                    : mode === 'watch'    ? 'Watching since (optional)'
                                    :                       'Already quit? Set your real start date (optional)';
}

function addVice(){
  loadV();
  const n=document.getElementById('v-name').value.trim();
  const t=document.getElementById('v-trigger').value.trim();
  if(!n)return;
  // Optional backdated start
  const startInput=document.getElementById('v-start');
  let startDate=new Date().toISOString();
  if(startInput && startInput.value){
    // 'YYYY-MM-DD' parses as UTC MIDNIGHT, which is the previous evening anywhere west of Greenwich —
    // so a quit date picked as the 1st became the 31st, and the streak was a day short forever. Noon
    // local is inside the chosen day in every timezone on earth.
    const picked=new Date(startInput.value + 'T12:00:00');
    if(!isNaN(picked) && picked<=new Date()){
      startDate=picked.toISOString();
    }
  }
  // Re-adding a name that was once removed must revoke its tombstone, or the cloud merge drops it
  // again on the very next pull — silently, and for TOMB_MAX_AGE_MS (180 days). Adding it back is
  // a deliberate act and outranks a past deletion. See tombstoneRevoke in 01-sync.js.
  try{ if(typeof tombstoneRevoke==='function') tombstoneRevoke('totry_v', String(n).toLowerCase()); }catch(_){ }
  vices.push({
    n,
    type: classifyVice(n),
    mode: viceModeChoice,
    limit: (viceModeChoice === 'moderate' && document.getElementById('v-limit')) ? document.getElementById('v-limit').value.trim() : '',
    modThreshold: (viceModeChoice === 'moderate' && document.getElementById('v-mod-threshold')) ? parseInt(document.getElementById('v-mod-threshold').value, 10) : 0,
    t:t||'Various situations',
    w:0,total:0,
    lastWin:null,lastLoss:null,
    urgelog:[],
    startDate:startDate,
    cleanDaysTotal:0,
    relapseCount:0,
    relapseHistory:[],
    trackPatterns: (document.getElementById('v-track-consent') && document.getElementById('v-track-consent').checked) || false
  });
  document.getElementById('v-name').value='';
  document.getElementById('v-trigger').value='';
  const limitEl=document.getElementById('v-limit'); if(limitEl) limitEl.value='';
  const tc=document.getElementById('v-track-consent'); if(tc) tc.checked=false;
  const thrEl=document.getElementById('v-mod-threshold'); if(thrEl) thrEl.value='3';
  setViceMode('quit'); // reset toggle back to default for the next entry
  if(startInput) startInput.value='';
  saveV();renderVices();renderDayCounter();
  haptic('success');
  // Right after naming it, ask HOW they want to handle it — the plan is the first conversation, not
  // an afterthought buried in a settings sheet. Meet them at the goal the moment they name the fight.
  try{ const _ni=vices.length-1; if(_ni>=0 && typeof openVicePlan==='function') setTimeout(function(){ try{ document.querySelectorAll('.modal-bg.open').forEach(function(x){x.remove();}); }catch(_){} try{ openVicePlan(_ni); }catch(_){} }, 220); }catch(_){}
}

// Get clean days for a vice based on startDate (the streak counter)
// ── RECOVERY TIMELINE — "what your streak is earning you" ──────────────────────
// The most-loved feature in the recovery category. Per vice type, milestone-based recovery science
// (brain, sleep, focus, mood, body, money, who you're becoming) + a faith dimension. Built-in for
// the common vices; for anything else we research it live (internet-first), verify, and cache so
// it's grounded and instant next time. Never shaming — always "here's what you're gaining."
const RECOVERY_TIMELINES = {
  nicotine: [
    { d:1, body:'Your heart rate and blood pressure have already started to drop back toward normal.', soul:'One day. You proved the first \u201cno\u201d is possible \u2014 and the hardest one is behind you.' },
    { d:3, body:'Nicotine is now fully out of your system. Breathing feels easier; sense of taste and smell begin returning.', soul:'The fog of craving lifts a little. Notice it \u2014 that\u2019s freedom returning.' },
    { d:14, body:'Circulation has improved and lung function is climbing. Physical activity feels less laboured.', soul:'Two weeks. The reflex is weakening. You\u2019re rebuilding who reaches for what.' },
    { d:30, body:'Coughing and shortness of breath decline as your lungs keep healing.', soul:'A month of small faithful \u201cno\u201ds. This is what discipline looks like up close.' },
    { d:90, body:'Lung function can be up to 30% better; risk markers keep falling.', soul:'Ninety days. You are not the person who started \u2014 you\u2019ve become someone steadier.' },
    { d:365, body:'Your risk of heart disease has dropped to roughly half that of a smoker.', soul:'A year. What felt impossible is now simply who you are.' }
  ],
  alcohol: [
    { d:1, body:'Your body begins clearing alcohol; blood sugar and hydration start to stabilise. If you have been drinking heavily every day, stopping suddenly can be genuinely dangerous \u2014 shaking, sweating, confusion or a seizure need a doctor, not willpower. Please talk to a GP or call a helpline before you white-knuckle this one.', soul:'Day one is sacred. Getting help to do it safely is not a smaller kind of courage.' },
    { d:3, body:'Sleep architecture begins to recover. Days two and three are also when withdrawal is at its most serious for a dependent drinker \u2014 if you feel very unwell, see things that are not there, or your hands will not stop shaking, that is a medical emergency, not weakness.', soul:'The body fights to rebalance \u2014 be gentle with yourself today.' },
    { d:7, body:'Deeper, more restorative sleep returns; energy and hydration improve.', soul:'A week of waking up clear. Remember this feeling.' },
    { d:30, body:'Liver fat can drop significantly; skin, focus and mood noticeably improve.', soul:'A month. The mind you\u2019re thinking with now is more truly yours.' },
    { d:90, body:'Liver function, blood pressure and immune markers continue improving.', soul:'Ninety days of facing life sober. That is real strength, quietly built.' },
    { d:365, body:'Major long-term health risks fall substantially across the body.', soul:'A year of showing up as yourself. This is a different life.' }
  ],
  porn: [
    { d:1, body:'You interrupted the dopamine loop. The brain\u2019s reward system begins, slowly, to recalibrate.', soul:'One day clean. You chose the real over the counterfeit.' },
    { d:7, body:'Cravings often spike this week then begin to settle \u2014 this is the brain re-learning, not failure.', soul:'A week. If it feels hard, that\u2019s the rewiring, not weakness. Hold on.' },
    { d:14, body:'Many report clearer focus and more stable mood as sensitivity to ordinary pleasure returns.', soul:'Two weeks. Your eyes and mind are becoming your own again.' },
    { d:30, body:'Motivation, presence and real-world attraction often noticeably improve.', soul:'A month of integrity in secret. Nobody had to see it for it to count.' },
    { d:90, body:'The reward system has had real time to rebalance; many describe feeling \u201creset.\u201d', soul:'Ninety days. You\u2019ve proven you are not a slave to the impulse.' },
    { d:365, body:'A year of rewiring \u2014 presence, self-respect and genuine intimacy deepen.', soul:'A year. You became free where you were once bound.' }
  ],
  gambling: [
    { d:1, body:'The chase stops. Your nervous system begins stepping down from the highs and crashes.', soul:'Day one. You kept what was yours \u2014 your money and your peace.' },
    { d:7, body:'Sleep and anxiety often improve as the constant urge to bet quiets.', soul:'A week without the chase. Notice how much lighter your mind is.' },
    { d:30, body:'Stress hormones settle; focus and financial clarity return.', soul:'A month. Every day you didn\u2019t bet is money and dignity reclaimed.' },
    { d:90, body:'The compulsion loosens its grip; decision-making feels clearer and calmer.', soul:'Ninety days of choosing the long good over the quick thrill.' },
    { d:365, body:'A year of rebuilt trust \u2014 with yourself, your finances, your people.', soul:'A year. You\u2019re the steward you said you wanted to be.' }
  ],
  scrolling: [
    { d:1, body:'You reclaimed attention the algorithm wanted. Focus circuits get a moment to rest.', soul:'One day more present. The world got a little more real.' },
    { d:7, body:'Attention span and boredom-tolerance start to recover; less compulsive reaching for the phone.', soul:'A week. You\u2019re learning to be with yourself again.' },
    { d:30, body:'Many report better sleep, deeper focus and less comparison-driven low mood.', soul:'A month of living your own life instead of watching others\u2019.' },
    { d:90, body:'Sustained attention and real-world engagement noticeably strengthen.', soul:'Ninety days. Your time is yours again.' }
  ],
  food: [
    { d:1, body:'One day of steady choices begins stabilising blood sugar and energy.', soul:'You fed the body, not the feeling. That\u2019s a real win.' },
    { d:7, body:'Cravings often ease as blood sugar steadies; energy becomes more even.', soul:'A week of eating with intention. Notice the steadiness.' },
    { d:30, body:'Digestion, energy and relationship with hunger cues all improve.', soul:'A month. Food is becoming fuel, not a fix.' },
    { d:90, body:'Sustained patterns reshape metabolism, energy and self-trust.', soul:'Ninety days of honouring your body as a gift.' }
  ]
};

// Return the timeline for a vice type, or null if we should research it live.
function _recoveryTimelineFor(type){ return RECOVERY_TIMELINES[type] || null; }

// Open the recovery timeline modal for a vice.
async function openRecoveryTimeline(i){
  loadV();
  const v = vices[i]; if(!v) return;
  if(typeof haptic==='function') haptic('tap');
  const days = viceCleanDays(v);
  const type = v.type || (typeof classifyVice==='function' ? classifyVice(v.n) : 'general');
  // Watching earns no streak, so the 'what you're earning' framing would be about a goal they
  // have not set. The limit framing is the closer fit; neither implies a promise.
  const _moderate = !viceIsAbstinence(v);
  const m = document.createElement('div');
  m.className='modal-bg open'; m.id='recovery-timeline-modal';
  m.innerHTML = '<div class="modal" style="max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div class="src-tag" style="color:var(--gr);margin-bottom:4px">'+(_moderate?'WHAT HOLDING YOUR LINE IS WORTH':'WHAT YOU\u2019RE EARNING')+'</div>'+
    '<div style="font-size:20px;font-weight:500;color:var(--tx);margin-bottom:2px">'+String(v.n||'Your streak').replace(/</g,'&lt;')+'</div>'+
    '<div style="font-size:13px;color:var(--go);font-family:DM Mono,monospace;margin-bottom:16px">'+days+' day'+(days===1?'':'s')+' clean'+(viceMoneySaved(v)>0?(' \u00b7 '+curSym()+viceMoneySaved(v).toLocaleString()+' reclaimed'):'')+'</div>'+
    '<div id="recovery-timeline-body"><div style="font-size:13px;color:var(--tx3);text-align:center;padding:20px">Loading what your body and soul are gaining\u2026</div></div>'+
    '<button class="btn" onclick="closeModal(this)" style="margin-top:14px">Close</button></div>';
  document.body.appendChild(m);
  let _timelineWasResearched = false;
  let timeline = _recoveryTimelineFor(type);
  if(!timeline){
    // Research it live (internet-first), cache to local protocols so it's instant next time.
    timeline = await _researchRecoveryTimeline(v.n, type);
    // MARK WHAT A MODEL MADE UP. The three built-in timelines are checked physiology; this path asks a
    // model to invent one for any struggle a person names, and it was rendered in the same card, in
    // the same voice, with the same authority — day-by-day bodily claims about their recovery that
    // nobody verified. Say where it came from; a person deciding whether to trust it deserves to know.
    if(timeline && timeline.length) _timelineWasResearched = true;
  }
  const body = document.getElementById('recovery-timeline-body');
  if(!body) return;
  // The abstinence milestones are earned by NOT doing the thing at all. Someone holding a limit has
  // not earned them and should not be told they have — say what their mode actually achieves instead.
  if(_moderate){
    const _within = (v.modWithin || 0), _over = (v.modOver || 0);
    const _sessions = _within + _over;
    const _rate = _sessions > 0 ? Math.round((_within / _sessions) * 100) : null;
    body.innerHTML =
      '<div style="font-size:13px;color:var(--tx2);line-height:1.75">' +
        'You are not counting clean days here \u2014 you are counting whether you stayed inside your own line, ' +
        'which is a different and harder kind of honest.' +
      '</div>' +
      (_rate != null
        ? '<div style="margin-top:14px;font-family:DM Mono,monospace;font-size:13px;color:var(--go)">' +
            'You held it ' + _within + ' of ' + _sessions + ' times \u00b7 ' + _rate + '%</div>'
        : '<div style="margin-top:14px;font-size:12.5px;color:var(--tx3)">Log a few sessions and I will show you your hold rate here.</div>') +
      '<div style="margin-top:14px;font-size:12.5px;color:var(--tx3);line-height:1.7">' +
        'The body milestones below belong to stopping altogether. They are real, and they are not yours yet \u2014 ' +
        'if you ever want them, switching this to "quit" in Manage is how they start counting.' +
      '</div>';
    return;
  }
  if(!timeline || !timeline.length){
    body.innerHTML = '<div style="font-size:13px;color:var(--tx2);line-height:1.7">Every clean day is rebuilding you \u2014 your focus, your steadiness, your self-respect. Keep going; the body and mind heal in ways you\u2019ll feel before you can measure.</div>';
    return;
  }
  body.innerHTML = timeline.map(ms => {
    const reached = days >= ms.d;
    const label = ms.d===1?'Day 1':ms.d<30?('Day '+ms.d):ms.d<365?(Math.round(ms.d/30)+' month'+(ms.d>=60?'s':'')):'1 year';
    return '<div style="display:flex;gap:12px;margin-bottom:14px;opacity:'+(reached?'1':'0.5')+'">'+
      '<div style="flex-shrink:0;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;'+(reached?'background:var(--gr);color:#0C0C0E':'background:var(--bg3);border:1px solid var(--bd);color:var(--tx3)')+'">'+(reached?'\u2713':'')+'</div>'+
      '<div style="flex:1"><div style="font-family:DM Mono,monospace;font-size:9px;color:'+(reached?'var(--gr)':'var(--tx3)')+';text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">'+label+(reached?' \u00b7 reached':'')+'</div>'+
      '<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:3px">'+ms.body+'</div>'+
      '<div style="font-size:13px;color:var(--tx);line-height:1.6;font-style:italic">'+ms.soul+'</div></div></div>';
  }).join('');
  // WHERE THIS CAME FROM. The built-in timelines for nicotine, alcohol and porn are checked
  // physiology. Anything else is a model's best guess, generated live and cached — and it was
  // rendered in the same card, same voice, same authority, making day-by-day claims about a person's
  // body that nobody verified. An honest source line costs one sentence.
  if(_timelineWasResearched){
    body.innerHTML += '<div style="margin-top:14px;padding:10px 12px;background:var(--bg3);border:1px solid var(--bd);' +
      'border-radius:8px;font-size:11.5px;color:var(--tx3);line-height:1.6">' +
      'These milestones were researched for this struggle rather than drawn from the checked timelines ' +
      'I keep for nicotine, alcohol and porn. Treat them as a reasonable guide, not as measurements of ' +
      'you \u2014 and take anything medical to someone qualified.</div>';
  }
}

async function _researchRecoveryTimeline(name, type){
  try{
    const _who = (typeof faithTradition==='function' ? faithTradition() : 'x') + '_' +
                 (function(){ try{ return ls('totry_sex') || 'u'; }catch(_){ return 'u'; } })();
    const cacheKey = 'rt_'+(type||'')+'_'+_who+'_'+(name||'').toLowerCase().slice(0,30);
    const store = (()=>{ try{ return JSON.parse(localStorage.getItem('totry_recovery_timelines')||'{}'); }catch(_){ return {}; } })();
    if(store[cacheKey]) return store[cacheKey];
    const sys = 'You are a recovery scientist. ' + (typeof faithVoiceNote==='function' ? faithVoiceNote() : '') + (typeof sexNote==='function' ? sexNote() : '') + ' For the given struggle, return a JSON array of 4-6 recovery milestones a person gains by abstaining, as evidence-based as possible. Each item: {"d": days_as_number, "body": "the physical/mental recovery at this milestone, 1 sentence, factual", "soul": "an encouraging faith-aware reflection, 1 sentence, never preachy"}. Days should be like 1,7,14,30,90,365. Return ONLY the JSON array, no markdown.';
    const txt = await api(sys, [], 'The struggle: "'+name+'". Give the recovery timeline.', 700, { web_search:true, timeout:40000 });
    let arr = null;
    try{ arr = JSON.parse((txt||'').replace(/```json|```/g,'').trim()); }catch(_){ arr = null; }
    if(Array.isArray(arr) && arr.length){
      store[cacheKey] = arr;
      try{ localStorage.setItem('totry_recovery_timelines', JSON.stringify(store)); }catch(_){}
      return arr;
    }
  }catch(_){}
  return null;
}

// On-demand pattern insight — opt-in per vice, never pushed. Turning it on reveals risk windows /
// triggers / win-rate trend (computed locally from logged battles) on the Fight page.
function toggleVicePatterns(i){
  loadV();
  const v = vices[i]; if(!v) return;
  v.trackPatterns = !v.trackPatterns;
  saveV();
  renderVices();
  if(typeof renderUrgeInsights==='function') renderUrgeInsights();
  if(typeof syncToCloud==='function') syncToCloud();
  if(v.trackPatterns){ showToast('Patterns on','As you log battles, I\u2019ll quietly show when and why they hit hardest \u2014 only here, never nagging.'); }
  else { showToast('Patterns off','No problem.'); }
}

// THE ONE ANCHOR A STREAK COUNTS FROM.
//
// startDate is authoritative — every relapse path writes it (including the backdating flow, which
// sets it to the real moment rather than to now), and "start again from today" writes it too.
// lastLoss is only the fallback for rows old enough to predate it.
//
// The Fight tab's big clock read `v.lastLoss` FIRST and fell back to totry_start, so after someone
// backdated a slip — or used start-again — the headline and the vice card below it showed different
// numbers of days clean, on the same screen, about the same fight. Both go through here now.
function viceStreakAnchor(v){
  if(!v) return null;
  if(v.startDate){ const d = new Date(v.startDate); if(!isNaN(d)) return d; }
  if(v.lastLoss){ const d = new Date(v.lastLoss); if(!isNaN(d)) return d; }
  return null;
}
// A streak is counted in calendar days, not in elapsed 24-hour blocks. A quit date entered as a date
// ("2026-06-01") parses as UTC midnight, which is 10am local in Australia — so elapsed arithmetic read
// a day short every morning until 10am for anyone who backdated their start, which the app actively
// invites them to do. It is the headline number of this pillar and the one people screenshot.
// Elapsed time is still what the sub-7-day live clock means, so that keeps using it.
function _calDaysSince(ts){
  if(ts === null || ts === undefined) return 0;
  const s = new Date(ts); if(isNaN(s.getTime())) return 0;
  const a = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const n = new Date(); const t = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.max(0, Math.round((t - a) / 86400000));   // round, so a DST shift cannot lose a day
}
// ── HOW YOU ARE WINNING IT ──
// SOUL-ARCHITECTURE, FIGHT: "reframe from a list of vices into 'your fight, and how you're winning
// it.'" The clean clock says how LONG. Directly beneath it the person met a per-vice list opening
// with "WIN RATE 0% 0/6" — a scoreboard of every time they lost, which is precisely the framing this
// pillar is supposed to refuse. Strong AND tender, per the doc: the number is not in question, but
// the first thing after it should be the evidence that they are winning.
//
// Counted, never estimated, and never asked of a model. Silent when there is nothing true to say —
// an invented encouragement is worse here than in any other part of the app, because the person
// reading it is deciding whether to believe the app about their own life.
function fightEvidenceLine(){
  const bits = [];
  try{
    const now = Date.now(), W = 7*86400000;
    const within = t => { const x = new Date(t).getTime(); return !isNaN(x) && x > now - W; };

    // Urges met and turned away — the thing they actually DID, not the thing they avoided.
    //
    // ONE SOURCE. Every win path (_momentWin, _gambleWin, _riskGreetSteady) writes totry_moments_won
    // AND calls _recordFightMoment(), which writes totry_fight_log with won:true. Adding the two
    // together counted every single turned-away urge TWICE — the app told a person they had met two
    // when they had met one, in the one place on the screen whose whole job is to be believed.
    // totry_fight_log is the complete record and the source getLifeState().fight.wins7 already
    // treats as truth, so the two agree by construction rather than by luck.
    const log = (ls('totry_fight_log')||[]).filter(f => f && f.ts && within(f.ts));
    const met = log.filter(f => f.won).length;
    if(met > 0) bits.push(met + (met === 1 ? ' urge met and turned away' : ' urges met and turned away') + ' this week');

    // money the clean days actually put back — the vice→money pipe, which only exists because both
    // fronts live in one app
    // Only from vices they are actually abstaining from. totalReclaimed() sums every vice with a
    // cost model, including ones in watch or moderate mode — where viceCleanDays deliberately returns
    // 0 because there is no abstinence to count. So this line could tell someone they had "reclaimed"
    // money from a habit they used twice this week, under a heading that says how they are WINNING.
    // No gate needed here any more: viceSpendPicture() refuses a non-abstinence vice at the source,
    // so totalReclaimed() cannot include one. The v543 gate asked "is ANY vice abstinence?", which
    // opened the whole sum the moment one qualified — including money from the ones that did not.
    let reclaimed = 0;
    try{ if(typeof totalReclaimed === 'function') reclaimed = totalReclaimed() || 0; }catch(_){ }
    // curSym(), with no ASCII fallback: a hardcoded $ is the currency bug this repo already has a
    // test for, and showing a GBP user dollars is worse than showing them nothing.
    if(reclaimed > 0) bits.push(curSym() + Math.round(reclaimed).toLocaleString() + ' reclaimed');

    // and whether this run is the longest they have managed — the fact a person most wants to know,
    // and the one a list of vices never tells them.
    //
    // Derived from the slips they actually logged, NOT from a stored `best`: nothing in this app ever
    // writes v.best, so comparing against it made the claim true for everyone past three days, which
    // is a compliment rather than a fact. The previous best is the longest gap between consecutive
    // logged uses (and the gap from the quit date to the first one). If there are no slips on record
    // there is no previous run to beat, so the line is not earned and is not shown.
    try{
      loadV();
      // ONE claim, about ONE vice, and only when the log can actually support it.
      //
      // Two things were wrong. The loop pushed a bit per vice, so someone fighting three things read
      // "your longest run yet" three times in a row with nothing naming which fight it meant. And the
      // "record" came from the longest gap between LOGGED uses, which understates badly on a sparse
      // log: two slips three days apart a year ago, then two hundred clean days, and the app
      // congratulated them on beating a three-day record. Quoting a number we cannot actually know is
      // worse than saying nothing, and on this screen it reads as the app not having been paying
      // attention.
      //
      // So: the longest CURRENT run only, named, and only when the previous best is itself
      // substantial (a week) and there are at least two completed runs to compare against. This
      // under-claims by design — it will stay quiet on a thin history rather than invent a record.
      let best = null;
      (vices||[]).forEach(v => {
        if(typeof viceIsAbstinence === 'function' && !viceIsAbstinence(v)) return;
        const current = (typeof viceCleanDays === 'function') ? viceCleanDays(v) : 0;
        if(current < 3) return;
        const uses = (ls('totry_vice_uses')||[])
          .filter(u => u && u.v === v.n && u.ts)
          .map(u => new Date(u.ts).getTime())
          .filter(t => !isNaN(t))
          .sort((a,b) => a - b);
        if(uses.length < 3) return;                    // fewer than two completed runs tells us nothing
        let prevBest = 0;
        for(let k = 1; k < uses.length; k++){
          const gap = Math.floor((uses[k] - uses[k-1]) / 86400000);
          if(gap > prevBest) prevBest = gap;
        }
        if(prevBest < 7) return;                       // a "record" of a few days is a logging artefact
        if(current <= prevBest) return;
        if(!best || current > best.current) best = { name: v.n, current: current, prev: prevBest };
      });
      if(best){
        // NOT _escFew here: renderFightEvidence escapes every bit before it writes innerHTML, so
        // escaping the name as well double-encoded it — "Mum's wine" reached the screen as
        // MUM&#39;S WINE, in capitals, on the headline evidence line. bits are plain text; the one
        // renderer owns the escaping.
        bits.push(best.name + ': your longest run yet \u2014 past ' + best.prev + ' days');
      }
    }catch(_){ }
  }catch(_){ }
  return bits;
}
function renderFightEvidence(){
  const el = document.getElementById('fight-evidence');
  if(!el) return;
  const bits = fightEvidenceLine();
  if(!bits.length){ el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = 'block';
  el.innerHTML = '<div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.08em;' +
    'text-transform:uppercase;color:var(--go);margin-bottom:12px;line-height:1.7;text-align:center">' +
    bits.map(b => _escFew(b)).join(' &middot; ') + '</div>';
}
function viceCleanDays(v){
  // A clean streak is elapsed time since a COMMITMENT to zero. Watch mode has made none, moderation
  // is a limit rather than a zero, and letting go is not a streak at all — so none of them has one.
  // Gating here rather than at ~30 call sites, several of which only aggregate the number. See the
  // note above; every caller already handles 0.
  if(typeof viceIsAbstinence === 'function' && !viceIsAbstinence(v)) return 0;
  const start = viceStreakAnchor(v);
  if(!start) return 0;
  return _calDaysSince(start);
}

// SILENCE IS NOT A STREAK. A clean count is only elapsed time — it grows just as fast for someone
// who stopped being honest as for someone doing the work, which means the app flatters exactly the
// person who most needs the truth. So a long streak has to be confirmed now and then. This asks,
// it doesn't accuse, and it never resets anything on its own.
function _viceLastWord(v){
  const stamps=[v.lastConfirm, v.lastLoss, v.startDate].filter(Boolean).map(s=>new Date(s).getTime()).filter(t=>!isNaN(t));
  const uses=(ls('totry_vice_uses')||[]).filter(u=>u&&u.v===v.n).map(u=>new Date(u.ts).getTime()).filter(t=>!isNaN(t));
  return Math.max(0, ...stamps, ...uses);
}
function viceNeedsCheckIn(v){
  if(!viceIsAbstinence(v)) return false;
  if(viceCleanDays(v) < 6) return false;               // let a young streak just be
  const last=_viceLastWord(v); if(!last) return false;
  return (Date.now()-last)/86400000 >= 7;              // a week of silence — worth asking
}
function confirmViceClean(i){
  loadV(); const v=vices[i]; if(!v) return;
  v.lastConfirm=new Date().toISOString(); saveV();
  try{ renderVices(); if(typeof haptic==='function') haptic('tap'); }catch(_){}
  if(typeof showToast==='function') showToast('Good','Then it counts. '+viceCleanDays(v)+' days that are actually yours.');
}

// Money reclaimed by staying clean — the vice→stewardship pipe. A vice can carry an optional
// cost: { costAmount, costPer } where costPer is 'day' | 'week' | 'use', costUses = uses/week.
// Returns dollars saved across the current clean streak. No cost set → 0 (feature is opt-in).
// REAL-LIFE vice money. Two things the smooth "cost × weeks clean" model got wrong:
//  1) LUMPY BUYING. You buy a carton that lasts a month. That money is already spent — quitting on
//     day 3 has saved you nothing yet. Your first real saving is the purchase you DON'T make when
//     the supply you already paid for runs out.
//  2) MONEY OWED. If you still owe your dealer, being clean doesn't put you ahead — it puts you less
//     behind. Nothing is "reclaimed" until what you owe for past use is cleared.
// Returns the honest picture: what you've avoided, what you still owe, and what's actually yours.
function viceSpendPicture(v){
  if(!v) return null;
  const amt = parseFloat(v.costAmount)||0;
  const owed = Math.max(0, parseFloat(v.owed)||0);
  if(amt<=0 && owed<=0) return null;
  const days = viceCleanDays(v);
  // NOTHING IS RECLAIMED FROM A FIGHT THAT IS NOT ABSTINENCE. viceCleanDays already returns 0 for
  // watch and moderate modes, which zeroes the day / week / use models because they all multiply by
  // it — but the 'purchase' model below derives its own `since` from v.lastPurchase and never looks
  // at days at all. So a vice the person is deliberately moderating still "reclaimed" the full
  // purchase figure, and it surfaced under a heading about how they are WINNING, and on the Money
  // tab as money staying clean had put back. Gating at the source fixes both, and any future caller.
  if(typeof viceIsAbstinence === 'function' && !viceIsAbstinence(v)) return null;
  let avoided = 0;
  const per = v.costPer || 'week';
  if(per === 'purchase'){
    // One buy lasts N days. Count only the buys you've actually skipped, measured from your LAST
    // purchase (so supply you'd already paid for is never counted as a saving).
    const lasts = Math.max(1, parseFloat(v.lastsDays)||30);
    const since = v.lastPurchase ? Math.max(0, Math.floor((Date.now()-new Date(v.lastPurchase))/86400000)) : days;
    avoided = Math.floor(since / lasts) * amt;
  } else if(per === 'day'){ avoided = amt * days; }
  else if(per === 'use'){ avoided = amt * ((parseFloat(v.costUses)||7) * (days/7)); }
  else { avoided = amt * (days/7); }
  avoided = Math.round(avoided);
  const net = avoided - Math.round(owed);
  return {
    avoided,
    owed: Math.round(owed),
    net,                                   // can be negative — that's the honest position
    ahead: net > 0,
    toGo: Math.max(0, Math.round(owed) - avoided),  // what's left before you're actually ahead
    nextBuyInDays: (per==='purchase') ? (()=>{ const lasts=Math.max(1,parseFloat(v.lastsDays)||30); const since=v.lastPurchase?Math.max(0,Math.floor((Date.now()-new Date(v.lastPurchase))/86400000)):days; return lasts - (since % lasts); })() : null
  };
}
function viceMoneySaved(v){
  const p = viceSpendPicture(v);
  // Never claim money you haven't actually got yet — debts owed cancel savings first.
  return p ? Math.max(0, p.net) : 0;
}
// Total reclaimed across all vices with a cost set.
function totalReclaimed(){
  try{ loadV(); return (vices||[]).reduce((sum,v)=> sum + viceMoneySaved(v), 0); }catch(_){ return 0; }
}

// Switch an existing vice between "quit" (aim for zero) and "moderate" (stay within a limit).
// Previously the mode was fixed at creation — you couldn't change a past vice's goal.
function changeViceMode(i){
  loadV();
  const v = vices[i];
  if(!v) return;
  // WAS A TOGGLE, IS NOW A CHOICE. `toModerate = v.mode !== 'moderate'` meant a third mode had no
  // way through here at all: someone watching who tapped "set a goal" would have been pushed straight
  // into moderation without ever being asked. Three real options, the current one marked, and no
  // direction treated as the failure direction — stepping back to watching is allowed and is not a
  // relapse. That is the whole point of having stages.
  const cur = viceMode(v);
  const m = document.createElement('div');
  m.className = 'modal-bg open'; m.style.alignItems = 'center';
  const opt = (mode, title, sub) => {
    const on = cur === mode;
    return '<button '+(on?'disabled':'onclick="_pickViceMode('+i+',\''+mode+'\')"')+
      ' style="width:100%;text-align:left;padding:12px 14px;margin-bottom:8px;border-radius:10px;border:1px solid '+(on?'var(--go-bd)':'var(--bd)')+
      ';background:'+(on?'var(--go-bg)':'var(--bg3)')+';color:'+(on?'var(--go)':'var(--tx)')+';font-size:13.5px;cursor:'+(on?'default':'pointer')+'">'+
      title+(on?' <span style="font-size:11px;opacity:0.8">\u00b7 current</span>':'')+
      '<span style="display:block;font-size:11.5px;color:var(--tx3);line-height:1.5;margin-top:3px">'+sub+'</span></button>';
  };
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);font-style:italic;margin-bottom:6px">'+_escFew(v.n)+'</div>'+
    '<div style="text-align:center;font-size:12.5px;color:var(--tx2);line-height:1.6;margin-bottom:16px">What do you actually want with this right now? You can change it whenever the truth changes.</div>'+
    opt('watch','Just watching','No goal, no streak, no line. I log it and show you the shape of it. Nothing to keep or break.')+
    opt('moderate','Keeping it in check','A limit you set for yourself, and how often you stay within it.')+
    opt('quit','Quitting','Aiming for zero, with a clean-day streak from the day you start.')+
    '<div id="change-mode-extra"></div>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:4px">Cancel</button>'+
    '</div>';
  document.body.appendChild(m);
}
// Moderation needs one more answer before it means anything; the other two do not.
function _pickViceMode(i, mode){
  if(mode !== 'moderate'){ applyViceMode(i, mode); return; }
  loadV(); const v = vices[i]; if(!v) return;
  const box = document.getElementById('change-mode-extra');
  if(!box){ applyViceMode(i, 'moderate'); return; }
  box.innerHTML = '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin:6px 0 6px">Weekly limit</div>'+
    '<div style="position:relative;margin-bottom:10px"><input type="number" id="change-mode-limit" inputmode="numeric" placeholder="e.g. 3" value="'+(v.modLimit||'')+'" style="font-size:16px;padding:11px;width:100%"></div>'+
    '<p style="font-size:11px;color:var(--tx3);line-height:1.6;margin-bottom:12px">How many times a week is within your limit? You\u2019ll track how often you stay within it.</p>'+
    '<button class="btn primary" onclick="applyViceMode('+i+',\'moderate\')" style="margin-bottom:4px">Switch to moderation</button>';
  try{ document.getElementById('change-mode-limit').focus(); }catch(_){ }
}

function applyViceMode(i, mode){
  loadV();
  const v = vices[i];
  if(!v) return;
  // Accepts the old boolean as well as a mode string: `true` meant "to moderation", `false` meant
  // "to quitting". Nothing should still call it that way, but a silently-wrong mode here would set
  // someone's goal to the string "false".
  if(mode === true) mode = 'moderate';
  else if(mode === false) mode = 'quit';
  if(mode !== 'moderate' && mode !== 'quit' && mode !== 'watch') mode = 'quit';
  if(mode === 'moderate'){
    const lim = parseInt(document.getElementById('change-mode-limit')?.value);
    if(isNaN(lim) || lim < 1){ showToast('Set a limit','Enter how many times per week is within your limit.'); return; }
    v.mode = 'moderate';
    v.modLimit = lim;
    // The card reads v.limit ("Your limit: …"), and this dialog was the only way to switch an existing
    // vice to moderate mode — so someone did that, set a limit, and the card showed no limit at all.
    // Written here in the same shape the add-a-vice flow writes it, so the two agree.
    v.limit = lim + ' a week';
    if(v.modWithin == null) v.modWithin = 0;
  } else if(mode === 'watch'){
    v.mode = 'watch';
    // Deliberately keeps startDate: if they come back to quitting later, applyViceMode resets it then.
    // Nothing about watching is a streak, so nothing here is lost by not touching it.
  } else {
    v.mode = 'quit';
    // Fresh clean-day streak from today when committing to zero.
    v.startDate = new Date().toISOString();
  }
  saveV();
  document.querySelector('.modal-bg.open')?.remove();
  renderVices();
  if(typeof renderHomeQuickWins==='function') renderHomeQuickWins();
  haptic('success');
  showToast(mode === 'watch' ? 'Just watching' : 'Goal updated',
    v.n + (mode === 'moderate' ? ' \u2014 now keeping it in check.'
         : mode === 'watch'    ? ' \u2014 no goal, no streak. I will just hold the mirror.'
         :                       ' \u2014 now aiming for zero.'));
}

// One home for the vice's settings — so the card face stays about the fight, not the admin. Backdating
// isn't here: "I used — log it honestly" already takes any date, so there's one way to do it, not three.
// The offer answered. Either way it is recorded so it is never asked again — an offer that repeats
// is a nag, and nagging someone who is still deciding is the thing the evidence says backfires.
function _watchSetGoal(i){
  loadV(); const v=vices[i]; if(!v) return;
  v.goalOffered = new Date().toISOString(); saveV();
  if(typeof changeViceMode==='function') changeViceMode(i);
  else if(typeof openViceManage==='function') openViceManage(i);
}
function _watchKeepWatching(i){
  loadV(); const v=vices[i]; if(!v) return;
  v.goalOffered = new Date().toISOString(); saveV();
  try{ renderVices(); }catch(_){ }
  if(typeof haptic==='function') haptic('tap');
  if(typeof showToast==='function') showToast('Still watching', 'That is a real answer. I will keep holding the mirror and I will not ask again.');
}
function openViceManage(i){
  loadV(); const v=vices[i]; if(!v) return;
  const row=(label, act, danger)=>'<button onclick="closeModal(this);'+act+'" style="width:100%;text-align:left;padding:13px 14px;background:var(--bg3);border:1px solid var(--bd);border-radius:10px;margin-bottom:8px;color:'+(danger?'var(--re)':'var(--tx)')+';font-size:14px;cursor:pointer">'+label+'</button>';
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;color:var(--tx);margin-bottom:14px">'+String(v.n).replace(/</g,'&lt;')+'</div>'+
    row('Your plan — how you want to handle this', 'openVicePlan('+i+')')+
    row('Edit the start date', 'editViceStart('+i+')')+
    // The truth of the timeline. logLoss() has always accepted a backdate and promptLossDate() has
    // always collected one, but nothing connected them — so a slip that happened yesterday restarted
    // the clock from the moment he got around to admitting it, and the record quietly lied. The
    // mass-add is for someone arriving with months of real history behind them. Both need curVice.
    row('It happened earlier — set the real day', 'curVice='+i+';promptLossDate()')+
    row('Log slips from before I started here', 'curVice='+i+';promptMassAddLosses()')+
    row(v.costAmount?('Money it costs &middot; '+curSym()+viceMoneySaved(v).toLocaleString()+' reclaimed'):'Track the money it costs', 'editViceCost('+i+')')+
    row('Change what I want with this \u2014 now: '+viceModeLabel(v), 'changeViceMode('+i+')')+
    row(v.trackPatterns?'Hide my patterns':'Show my patterns', 'toggleVicePatterns('+i+')')+
    row('Remove this from the fight', 'removeVice('+i+')', true)+
    '<button class="btn" onclick="closeModal(this)" style="margin-top:4px;background:transparent;border:none;color:var(--tx3);font-size:13px">Done</button>'+
    '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}
// Edit a vice's start date (fix your real quit date)
function editViceStart(i){
  loadV();
  const v = vices[i];
  if(!v) return;
  const currentStart = v.startDate ? v.startDate.slice(0,10) : _todayLocalISO();
  const today = _todayLocalISO();
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);font-style:italic;margin-bottom:6px">' + v.n + '</div>' +
    '<div style="text-align:center;font-size:12px;color:var(--tx3);margin-bottom:16px">When did your current streak actually start?</div>' +
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Streak start date</div>' +
    '<input type="date" id="edit-vice-start" value="' + currentStart + '" max="' + today + '" style="margin-bottom:14px;font-size:16px;padding:12px">' +
    '<p style="font-size:11px;color:var(--tx3);line-height:1.6;margin-bottom:14px">If you quit before installing To Try, set the real date so your day count matches your life.</p>' +
    '<button class="btn primary" onclick="saveViceStart(' + i + ')" style="margin-bottom:8px">Save start date</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>' +
    '</div>';
  document.body.appendChild(m);
}

function saveViceStart(i){
  loadV();
  const input = document.getElementById('edit-vice-start');
  if(!input || !input.value) return;
  const picked = new Date(input.value + 'T12:00:00');   // local noon — see addVice
  const _today = new Date(); _today.setHours(23,59,59,999);
  if(isNaN(picked) || picked > _today){
    showToast('Invalid date', 'Pick a date today or earlier.');
    return;
  }
  // Anchored to noon, but never ahead of the actual moment: a start stamped later today would give
  // the card a negative ticking clock (see renderVices).
  if(picked.getTime() > Date.now()) picked.setTime(Date.now());
  vices[i].startDate = picked.toISOString();
  saveV();
  document.querySelector('.modal-bg.open')?.remove();
  renderVices();
  renderDayCounter();
  const days = viceCleanDays(vices[i]);
  showToast('Updated', vices[i].n + ' — now showing ' + days + ' days clean.');
  haptic('success');
}

// ── VICE COST → STEWARDSHIP ───────────────────────────────────────────────────
// Optional: what the vice cost when active. Powers viceMoneySaved — money NOT spent becomes
// visible progress (the vice→stewardship pipe no single-purpose app can show).
// ── HONEST USE LOG ────────────────────────────────────────────────────────────────────────────
// You should never have to go through an urge intervention to tell the truth about a day that's
// already gone. Everything before this was either a live session counter (stale after 18h) or a
// slip logged mid-crisis — so a person who simply isn't clean had no way to say so, and the app
// mistook their silence for success. That flatters people instead of helping them. This records
// real use, today or backdated, with what it cost and whether it went on credit. It never scolds.
function openLogUse(i){
  loadV(); const v=vices[i]; if(!v) return;
  const today=_todayLocalISO();
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;color:var(--tx);margin-bottom:4px">'+String(v.n).replace(/</g,'&lt;')+'</div>'+
    '<div style="text-align:center;font-size:12px;color:var(--tx3);line-height:1.55;margin-bottom:16px">Just the truth — no scolding. Knowing where you actually are is the only way I’m any use to you.</div>'+
    '<div class="lbl">When</div>'+
    '<input type="date" id="lu-date" value="'+today+'" max="'+today+'" style="margin-bottom:12px;font-size:16px;padding:12px;color-scheme:dark">'+
    '<div class="lbl">How many times</div>'+
    '<input type="number" inputmode="numeric" id="lu-qty" value="1" min="1" style="margin-bottom:12px;font-size:16px;padding:12px">'+
    '<div class="lbl">Did you buy? (optional)</div>'+
    '<input type="number" inputmode="decimal" id="lu-cost" placeholder="What it cost '+curSym()+'" style="margin-bottom:8px;font-size:16px;padding:12px">'+
    '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--tx2);margin-bottom:14px"><input type="checkbox" id="lu-credit" style="width:auto;flex:none"> Put it on credit — I still owe this</label>'+
    '<button class="btn primary" onclick="saveViceUse('+i+')" style="margin-bottom:8px">Log it honestly</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>'+
    '</div>';
  document.body.appendChild(m);
}
function saveViceUse(i){
  loadV(); const v=vices[i]; if(!v) return;
  const dateStr=document.getElementById('lu-date')?.value||'';
  const qty=Math.max(1, parseInt(document.getElementById('lu-qty')?.value||'1',10)||1);
  const cost=parseFloat(document.getElementById('lu-cost')?.value||'')||0;
  const credit=!!(document.getElementById('lu-credit')||{}).checked;
  const ts=dateStr?new Date(dateStr+'T12:00:00').toISOString():new Date().toISOString();
  const uses=ls('totry_vice_uses')||[];
  const rec={ v:v.n, ts, qty };
  if(cost>0){ rec.cost=cost; rec.credit=credit; }
  uses.unshift(rec);
  ls('totry_vice_uses', uses.slice(0,500));
  if(cost>0){
    if(credit) v.owed=(parseFloat(v.owed)||0)+cost;  // a buy on credit grows what you owe
    v.lastPurchase=ts;                                // supply you've now paid (or owe) for
  }
  // Quitting: an honest use is simply the truth of the streak. Recorded, not dramatised — and only
  // moved forward, so backfilling older days can't rewrite a more recent reality.
  // The streak is counted from startDate everywhere else in the app, so that's the field that has
  // to move — setting only lastLoss would let a logged slip leave the count untouched, which is the
  // exact dishonesty this whole feature exists to end. Only ever moves forward, so backfilling an
  // older day can't rewrite a more recent reality.
  if(viceIsAbstinence(v)){
    const used=new Date(ts).getTime();
    // Bank the streak BEFORE moving the anchor — the same order logLoss uses (04-fight.js:1096). Skip
    // it when the log is backdated behind an existing loss, because that streak was already banked.
    const _movesAnchor = used > (v.startDate?new Date(v.startDate).getTime():0);
    if(_movesAnchor){
      const before = viceCleanDays(v);
      v.cleanDaysTotal = (v.cleanDaysTotal || 0) + before;
      if(!v.relapseHistory) v.relapseHistory = [];
      v.relapseHistory.push({ date: ts, streakLength: before, honest: true });
    }
    if(used > (v.lastLoss?new Date(v.lastLoss).getTime():0)) v.lastLoss=ts;
    if(_movesAnchor) v.startDate=ts;                // streak restarts from when it actually happened
    v.relapseCount=(v.relapseCount||0)+1;
  }
  saveV();
  document.querySelector('.modal-bg.open')?.remove();
  try{ renderVices(); if(typeof renderScoreboard==='function') renderScoreboard(); if(typeof renderFinance==='function') renderFinance(); }catch(_){}
  try{ if(typeof syncToCloud==='function') syncToCloud(); if(typeof haptic==='function') haptic('tap'); }catch(_){}
  if(typeof showToast==='function') showToast('Logged','Thank you for being honest. That’s the part that actually moves things.');
}
// Real use in the last 7 days — the honest denominator for limits and trends.
function viceUsesInWeek(name){
  const wk=Date.now()-7*86400000;
  return (ls('totry_vice_uses')||[]).filter(u=>u&&u.v===name&&new Date(u.ts).getTime()>=wk)
    .reduce((a,u)=>a+(parseInt(u.qty,10)||1),0);
}
function viceSpendInWeek(name){
  const wk=Date.now()-7*86400000;
  return (ls('totry_vice_uses')||[]).filter(u=>u&&u.v===name&&u.cost>0&&new Date(u.ts).getTime()>=wk)
    .reduce((a,u)=>a+(parseFloat(u.cost)||0),0);
}
// Times he came here and turned away in the last 7 days. A win for NOT acting should be visible —
// otherwise the most important thing he does never gets counted back to him.
function momentsWonInWeek(name){
  const wk=Date.now()-7*86400000;
  return (ls('totry_moments_won')||[]).filter(x=>x&&x.v===name&&new Date(x.ts).getTime()>=wk).length;
}

// ── BEFORE IT TAKES OVER ────────────────────────────────────────────────────────────────────────
// The whole promise of one app instead of ten: when the pull comes, it doesn't just say "don't."
// It already knows your real losses (the bank), your debt, your goals, your body, and the hour —
// so it can put the exact stakes in front of you BEFORE the feeling wins, in a way no gambling app,
// no budget app, and no blocker could, because none of them hold the rest of your life. This is the
// calm door you reach for early, not the white-knuckle SOS. Every vice gets the stakes that are
// true FOR IT — money for the ones money touches, and never money for the ones it doesn't.

// What KIND of stakes this vice answers to. A porn or masturbation win is never measured in dollars
// (he asked for exactly this); gambling and substances are.
// A LINE OF SCRIPTURE IS NOT A NEUTRAL COMFORT. Two modals in this file hardcoded a Bible verse and
// showed it to everyone — the relapse sheet and the over-the-limit sheet — so a Muslim, Hindu,
// Buddhist or secular person logging honestly at their lowest was handed a Christian text they never
// asked for. _sosAnchor (04-fight.js:1817) already solved this for the SOS: Christianity keeps its
// verse, every other tradition gets its OWN set through activeVerses(), and a person on light faith
// gets no religious line at all. Same resolver, same rules.
//
// Returns '' when there should be no line — the caller drops the block entirely rather than printing
// an empty italic div.
// The same line as _faithLine, but with its reference. Every entry in the verse sets is {t, r} and
// _sosAnchor already shows the r — so the crisis surface cited a passage while the still centre
// printed the identical words anonymously. A tradition's text without its source reads as the app's
// own aphorism rather than as scripture, which is the wrong way round for a screen whose whole point
// is that it is pointing beyond itself.
function _faithLineCited(fallbackText){
  try{
    if(typeof faithLevel === 'function' && faithLevel() === 'light') return null;
    const t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
    if(t === 'secular') return null;
    const set = (typeof activeVerses === 'function') ? activeVerses() : null;
    if(set && set.length){
      const i = new Date().getDate() % set.length;    // same index as _faithLine, so they agree
      return { text: set[i].t || '', ref: set[i].r || '' };
    }
    if(t === 'christianity' && fallbackText) return { text: fallbackText, ref: '' };
  }catch(_){ }
  return null;
}
function _faithLine(fallbackText){
  try{
    if(typeof faithLevel === 'function' && faithLevel() === 'light') return '';
    const t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
    if(t === 'secular') return '';
    const set = (typeof activeVerses === 'function') ? activeVerses() : null;
    if(set && set.length){
      // Deterministic per day so it does not reshuffle under a re-render mid-moment.
      const i = new Date().getDate() % set.length;
      return set[i].t || '';
    }
    if(t === 'christianity') return fallbackText || '';
  }catch(_){ }
  return '';
}
function _viceStakeKind(v){
  const n=String((v&&v.n)||v||'').toLowerCase();
  if(/gambl|bet|punt|pokie|casino|lotto|lottery/.test(n)) return 'gambling';
  if(/smok|cig|tobac|nicotine|vape|weed|cannabis|drink|alcohol|booze|beer|wine/.test(n)) return 'substance';
  return 'behaviour';
}
// The priority debt (the one the current strategy says to hit first) and what a one-off payment
// against it would move. Returns null when there's no debt to speak to.
function _priorityDebt(){
  try{
    loadF();
    if(!debts || !debts.length) return null;
    const strat=ls('totry_debt_strategy')||'snowball';
    const sorted=_sortDebtsByStrategy(debts.map((d,i)=>({...d,idx:i})), strat);
    const top=sorted.find(d=>(d.t-d.p)>0);
    return top||null;
  }catch(_){ return null; }
}
// The highest-priority savings goal not yet complete.
function _priorityGoal(){
  const goals=ls('totry_finance_goals')||[];
  const open=goals.filter(g=>!(g.target>0)||g.current<g.target)
    .sort((a,b)=>{const ap=a.target>0?a.current/a.target:0,bp=b.target>0?b.current/b.target:0;return ap-bp;});
  return open[0]||null;
}
// What a dollar amount, kept out of a vice and put somewhere real, is actually WORTH — pulled from
// his own numbers, not a platitude. Returns an array of honest, specific lines.
function stakesForAmount(amount){
  const out=[]; if(!(amount>0)) return out;
  const money=n=>curSym()+Math.abs(Math.round(n)).toLocaleString();
  // Against the freedom date — the most motivating frame the app has. When there's a payment history
  // to project from, say how many months sooner freedom comes. When there isn't yet, fall back to
  // the interest this dollar stops bleeding — still true, still concrete, never nothing.
  try{
    const debt=_priorityDebt();
    if(debt){
      const now=monthlyPaymentRate();
      const strat=ls('totry_debt_strategy')||'snowball';
      const base=projectPayoff(debts, now, strat);
      // A one-off payment is a LUMP SUM off the balance, not a permanent raise in the monthly rate.
      // This used to pass now+amount, i.e. it modelled paying an extra $50 EVERY MONTH for the rest of
      // the payoff — so a single $50 was reported as bringing the freedom date months closer. Motivating
      // and false, on the number the app treats as its most motivating frame. Knock the amount off the
      // priority debt's balance instead and re-project at the unchanged rate.
      const _after = (debts||[]).map(function(d, i){
        if(i !== debt.idx) return d;
        const c = Object.assign({}, d);
        c.p = (parseFloat(c.p)||0) + amount;      // paid-off portion grows by the one-off
        return c;
      });
      const withIt=projectPayoff(_after, now, strat);
      if(base&&withIt&&base.months&&withIt.months&&base.months>withIt.months){
        out.push({icon:'\u{1F513}', text:money(amount)+' straight at your debt brings your freedom date '+(base.months-withIt.months)+' month'+(base.months-withIt.months===1?'':'s')+' closer. Tonight.'});
      } else {
        const rate=parseFloat(debt.interest)||0;
        if(rate>0){
          const yr=amount*(rate/100);
          out.push({icon:'\u{1F513}', text:money(amount)+' off '+String(debt.n).replace(/</g,'&lt;')+' stops it charging you ~'+money(yr)+' a year in interest — every year, until it’s gone.'});
        } else {
          out.push({icon:'\u{1F513}', text:money(amount)+' off '+String(debt.n).replace(/</g,'&lt;')+' is '+money(amount)+' you never have to pay back with interest on top.'});
        }
      }
    }
  }catch(_){}
  // Against the priority goal.
  const g=_priorityGoal();
  if(g){
    const pct=g.target>0?Math.round((amount/g.target)*100):0;
    out.push({icon:'\u{1F3AF}', text:money(amount)+' into '+g.name+(pct>0?' — that’s '+pct+'% of it, in one honest move':'')+'.'});
  }
  // Against the real cost of living, from his own statement.
  try{
    const r=spendingRead();
    if(r){
      // Same guard as the Money card: perMonth is extrapolated, and from a few days of data it is a
      // guess. Telling someone mid-craving that "£40 is about 6 days of real food on the table" is
      // only worth saying if the grocery figure behind it is real.
      const groc=(r.enoughForMonthly===false) ? 0 : ((r.cats.find(c=>c.name==='Groceries')||{}).perMonth||0);
      if(groc>0){ const days=Math.round((amount/(groc/30.44))); if(days>=1) out.push({icon:'\u{1F35E}', text:money(amount)+' is about '+days+' day'+(days===1?'':'s')+' of real food on the table.'}); }
    }
  }catch(_){}
  return out;
}

// The moment door is where the pull actually hits — the truest timestamp there is for learning his
// hard hour. Feed it into the same fight log the risk-window engine reads, so the reach-out learns
// from his real primary flow, not just the old SOS. Recorded at the time the urge OPENED the door.
function _recordFightMoment(viceName, won){
  try{
    const openedAt = window.__momentOpenedAt || Date.now();
    const log = ls('totry_fight_log') || [];
    log.unshift({ vice: viceName, won: !!won, ts: new Date(openedAt).toISOString(), date: new Date(openedAt).toLocaleDateString('en-AU'), via:'moment' });
    ls('totry_fight_log', log.slice(0, 200));
  }catch(_){}
}

// THE MOAT, IN THE MOMENT. The reason one app beats ten: at the point of temptation it can see the
// whole person, so it says the true thing no single-purpose app could. The pull feels like weakness;
// usually it's exhaustion, or the hour, or a promise made this morning now being tested. Naming that
// dissolves the shame that actually fuels the fall. Pulled live from Track (readiness/sleep), Soul
// (this morning's intention) and the clock — and silent when it has nothing honest to say.
function _wholeLifeReframe(){
  const out=[];
  // His own words from this morning, resurfaced at the exact moment they're tested. Most powerful.
  try{
    const today=safeMornings()[0];
    if(today && today.day===getDayCount() && today.intention && today.intention.trim()){
      out.push({icon:'\u{1F305}', text:'This morning you said who you’d be today: “'+today.intention.trim().replace(/</g,'&lt;').slice(0,120)+'”. This is the exact moment that meant.'});
    }
  }catch(_){}
  // Exhaustion — the clinician's reframe. The pull is loud because you're depleted, not weak.
  try{
    const r=(typeof computeReadiness==='function')?computeReadiness():null;
    if(r && (r.level==='rest' || (r.sleep && r.sleep<=5))){
      out.push({icon:'\u{1FAAB}', text:'You’re running on empty right now'+(r.sleep&&r.sleep<=5?' \u2014 you rated last night rough':'')+'. The pull is this loud because you’re depleted, not because you’re weak. That’s your body, not your character.'});
    }
  }catch(_){}
  // The hour itself — after midnight everything feels heavier and more permissible.
  try{
    const h=new Date().getHours();
    if(out.length<2 && (h>=23 || h<4)){
      out.push({icon:'\u{1F319}', text:'It’s late. Everything feels heavier and more allowed after midnight — that’s the hour, not the truth. Nothing decided now is decided well. Hold it till morning.'});
    }
  }catch(_){}
  return out.slice(0,2);
}
function _reframeHTML(){
  const r=_wholeLifeReframe(); if(!r.length) return '';
  return '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;margin-bottom:14px">'+
    r.map(s=>'<div style="display:flex;gap:10px;align-items:flex-start;padding:5px 0"><span style="font-size:16px;flex:none">'+s.icon+'</span><span style="font-size:12.5px;color:var(--tx2);line-height:1.6">'+s.text+'</span></div>').join('')+
  '</div>';
}

// The gambling intervention he asked for, whole: the honest total first (from the bank, not a
// guess), then "how much have you got on you right now?", then — if he's honest — where that exact
// money does more for him than the bookie ever will, and a real move to make it count.
function openGambleMoment(i){
  loadV(); const v=vices[i]; if(!v) return;
  window.__momentOpenedAt = Date.now();  // the true moment the pull hit — for risk-window learning
  document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());
  const bank=viceSpendFromBank('gambling');
  const lost = bank && bank.total>0 ? bank.total : null;
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="max-height:88vh;overflow-y:auto">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:24px;font-style:italic;color:var(--tx);margin-bottom:6px">Before you put it on</div>'+
    '<div style="text-align:center;font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:16px">You came here first. That’s the whole game, right there — you already did the hard part.</div>'+
    _reframeHTML()+
    (lost
      ? '<div style="background:var(--re-bg);border:1px solid var(--re-bd);border-radius:12px;padding:14px;margin-bottom:14px;text-align:center">'+
          '<div style="font-family:DM Mono,monospace;font-size:11px;color:var(--tx3);letter-spacing:0.1em;margin-bottom:4px">THE BANK’S RECORD, NOT A GUESS</div>'+
          '<div style="font-family:DM Mono,monospace;font-size:30px;color:var(--re);line-height:1">−'+curSym()+Math.round(lost).toLocaleString()+'</div>'+
          '<div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-top:8px">That’s what it has already taken from you. Not a story — '+bank.count+' transactions it can’t erase. You have never once walked away up. Neither has anyone.</div>'+
        '</div>'
      : '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:14px;font-size:12.5px;color:var(--tx2);line-height:1.65">The house is built to win over time — that’s not bad luck, it’s the maths it’s made of. Import a statement sometime and I’ll show you your real number. For now, let’s deal with right now.</div>')+
    '<div style="font-size:13.5px;color:var(--tx);line-height:1.6;margin-bottom:8px;text-align:center">Be straight with me — how much have you actually got on you right now?</div>'+
    '<input type="number" inputmode="decimal" id="gm-cash" placeholder="'+curSym()+' on hand" style="font-size:18px;padding:14px;text-align:center;margin-bottom:12px">'+
    '<button class="btn primary" onclick="_gambleStakes('+i+')" style="margin-bottom:8px">Show me the truth about this money</button>'+
    '<button class="btn" onclick="closeModal(this);openCompanionForUrge()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);margin-bottom:8px;font-size:13px">I just need to talk it out</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>'+
    '</div>';
  document.body.appendChild(m);
  try{ if(typeof haptic==='function') haptic('tap'); }catch(_){}
  setTimeout(()=>{ const el=document.getElementById('gm-cash'); if(el) el.focus(); }, 300);
}
function _gambleStakes(i){
  const cash=parseFloat(document.getElementById('gm-cash')?.value||'')||0;
  if(cash<=0){ showToast('Just a number','However much it is — that’s the honest start. No wrong answer.'); return; }
  document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());
  const money=n=>curSym()+Math.abs(Math.round(n)).toLocaleString();
  loadF();
  const stakes=stakesForAmount(cash);
  const debt=_priorityDebt(); const goal=_priorityGoal();
  let stakesHTML = stakes.length
    ? stakes.map(s=>'<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--bd)"><span style="font-size:16px;flex:none">'+s.icon+'</span><span style="font-size:13px;color:var(--tx2);line-height:1.55">'+s.text+'</span></div>').join('')
    : '<div style="font-size:13px;color:var(--tx2);line-height:1.6">'+money(cash)+' kept is '+money(cash)+' you still have at breakfast. Gambled, it’s almost certainly gone — that’s not pessimism, it’s the maths. Keeping it is the only move that’s ever up.</div>';
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  let actionBtns='';
  if(debt){ actionBtns+='<button class="btn primary" onclick="_bookRedirect('+i+','+cash+',\'debt\')" style="margin-bottom:8px">I’ll put it at '+String(debt.n).replace(/'/g,'').replace(/</g,'&lt;').slice(0,24)+' instead</button>'; }
  if(goal){ actionBtns+='<button class="btn'+(debt?'':' primary')+'" onclick="_bookRedirect('+i+','+cash+',\'goal\')" style="margin-bottom:8px'+(debt?';background:var(--bg3);border:1px solid var(--bd);color:var(--tx)':'')+'">Into '+String(goal.name).replace(/'/g,'').replace(/</g,'&lt;').slice(0,24)+' instead</button>'; }
  if(!debt && !goal){ actionBtns+='<button class="btn primary" onclick="closeModal(this);go(\'money\')" style="margin-bottom:8px">Start a fund with it</button>'; }
  m.innerHTML='<div class="modal" style="max-height:88vh;overflow-y:auto">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:23px;font-style:italic;color:var(--tx);margin-bottom:4px">'+money(cash)+' — here’s what it really is</div>'+
    '<div style="text-align:center;font-size:12px;color:var(--tx3);line-height:1.55;margin-bottom:14px">Same money. One of these you keep. The other, the house keeps.</div>'+
    '<div style="margin-bottom:16px">'+stakesHTML+'</div>'+
    actionBtns+
    '<button class="btn" onclick="_gambleWin('+i+','+cash+')" style="background:var(--gr-bg);border:1px solid var(--gr-bd);color:var(--gr);margin-bottom:8px;font-size:13px">I’m keeping it in my pocket — done</button>'+
    '<button class="btn" onclick="closeModal(this);openCompanionForUrge()" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Still shaky — talk to me</button>'+
    '</div>';
  document.body.appendChild(m);
  try{ if(typeof haptic==='function') haptic('tap'); }catch(_){}
}
// Record that he came here and walked away — a real, tracked win for NOT acting (anti-engagement as
// the ethic). Never inflates the money ledger with cash that only stayed in his pocket.
function _gambleWin(i, cash){
  loadV(); const v=vices[i];
  if(v){
    v.w=(v.w||0)+1; v.total=(v.total||0)+1; v.lastWin=new Date().toISOString();
    const moments=ls('totry_moments_won')||[];
    moments.unshift({v:v.n, ts:new Date().toISOString(), kept:cash||0, kind:'gambling'});
    ls('totry_moments_won', moments.slice(0,300));
    _recordFightMoment(v.n, true);   // teach the risk-window engine when the pull hits
    saveV();
  }
  document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());
  try{ renderVices(); if(typeof syncToCloud==='function') syncToCloud(); if(typeof haptic==='function') haptic('success'); }catch(_){}
  const kept=cash>0?(curSym()+Math.round(cash).toLocaleString()+' still yours. '):'';
  showToast('That’s a win — a real one', kept+'The urge passes. What you did here is what changes the number.');
}
// Book a redirect ONLY as something he actually does — moving cash to debt/savings is a real-world
// action, so the app confirms he did it rather than fabricating a payment (non-partial truth). Moves
// the real ledger, so the freedom date he just earned shows up the next time he looks.
function _bookRedirect(i, cash, target){
  const money=n=>curSym()+Math.abs(Math.round(n)).toLocaleString();
  document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  const where = target==='debt' ? (_priorityDebt()||{}).n : (_priorityGoal()||{}).name;
  m.innerHTML='<div class="modal" style="text-align:center">'+
    '<div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:23px;font-style:italic;color:var(--tx);margin-bottom:10px">Do it now, while you’re here</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:18px">Move the '+money(cash)+' to '+String(where||'it').replace(/</g,'&lt;')+' in your banking app — right now, before the moment cools. Then tell me it’s done and I’ll move your freedom date to match. I won’t log money you didn’t actually move.</div>'+
    '<button class="btn primary" onclick="_confirmRedirect('+i+','+cash+',\''+target+'\')" style="margin-bottom:8px">Done — I moved it</button>'+
    '<button class="btn" onclick="_gambleWin('+i+','+cash+')" style="background:var(--gr-bg);border:1px solid var(--gr-bd);color:var(--gr);margin-bottom:8px;font-size:13px">Couldn’t right now, but I’m not gambling it</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Back</button>'+
    '</div>';
  document.body.appendChild(m);
}
function _confirmRedirect(i, cash, target){
  try{
    if(target==='debt'){
      loadF();
      const strat=ls('totry_debt_strategy')||'snowball';
      const sorted=_sortDebtsByStrategy(debts.map((d,idx)=>({...d,idx})), strat);
      const top=sorted.find(d=>(d.t-d.p)>0);
      if(top && debts[top.idx]){
        debts[top.idx].p=Math.min((parseFloat(debts[top.idx].p)||0)+cash, debts[top.idx].t);
        const pays=ls('totry_payments')||[]; pays.push({debt:debts[top.idx].n, amt:cash, ts:new Date().toISOString(), via:'moment'}); ls('totry_payments', pays.slice(-200));
        saveF();
      }
    } else {
      const goals=ls('totry_finance_goals')||[];
      const g=_priorityGoal();
      const idx=goals.findIndex(x=>g&&x.id===g.id);
      if(idx>=0){ goals[idx].current=(parseFloat(goals[idx].current)||0)+cash; ls('totry_finance_goals', goals); }
    }
  }catch(_){}
  _gambleWin(i, 0); // count the moment won; money already booked above, don't double-count as "kept"
  try{ if(typeof renderFinance==='function') renderFinance(); }catch(_){}
  showToast('Moved — and it counts', curSym()+Math.round(cash).toLocaleString()+' where it builds you instead of the house. Your freedom date just moved.');
}

// The router: the right door for the right vice, always reachable BEFORE the crisis. Money vices get
// their stakes; behaviour vices get theirs (time, clarity, self-respect — never dollars).
function openMomentStakes(i){
  loadV(); const v=vices[i]; if(!v){ return; }
  const kind=_viceStakeKind(v);
  if(kind==='gambling'){ openGambleMoment(i); return; }
  window.__momentOpenedAt = Date.now();  // the true moment the pull hit — for risk-window learning
  document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());
  // Only an abstinence goal HAS a clean streak — see viceIsAbstinence. Watch mode has made no
  // promise, so there is nothing here to keep or end, and saying otherwise is the one thing that
  // mode exists to prevent.
  const clean = viceIsAbstinence(v) ? viceCleanDays(v) : 0;
  let body='', extra='';
  if(kind==='substance'){
    // What NOT buying right now is worth, plus where it's already going instead.
    const pic=viceSpendPicture(v);
    const saved=pic?Math.max(0,pic.net):0;
    const nextBuy=pic&&pic.nextBuyInDays!=null?pic.nextBuyInDays:null;
    body='This craving is a wave — it peaks and falls whether or not you feed it, usually inside 20 minutes. You don’t have to win forever right now. Just outlast this one.';
    const bits=[];
    if(clean>0) bits.push({icon:'\u{1F33F}', text:clean+' day'+(clean===1?'':'s')+' clean. This is the moment that keeps it, or ends it — nothing else does.'});
    if(saved>0) bits.push({icon:'\u{1F4B0}', text:curSym()+Math.round(saved).toLocaleString()+' already reclaimed by not buying. Falling now spends the streak AND restarts the meter.'});
    if(nextBuy!=null) bits.push({icon:'⏳', text:'You don’t need to buy for another '+nextBuy+' day'+(nextBuy===1?'':'s')+'. This urge is trying to move that up. It’s lying about how much you need it.'});
    bits.push({icon:'\u{1F9E0}', text:'What’s this really about right now — tired, bored, stressed, alone? The urge is usually managing something else. Name that, and it loosens.'});
    extra=bits.map(s=>'<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--bd)"><span style="font-size:16px;flex:none">'+s.icon+'</span><span style="font-size:13px;color:var(--tx2);line-height:1.55">'+s.text+'</span></div>').join('');
  } else {
    // Behaviour: never money. Time, clarity, self-respect, and what the urge is managing.
    body='This is a wave, not a command. It rises and it passes — 15, 20 minutes — and it passes faster when you don’t argue with it. You’re not fighting forever. Just this one.';
    const bits=[
      {icon:'\u{1F33F}', text:(clean>0?clean+' day'+(clean===1?'':'s')+' clean — this exact moment is the whole streak. ':'')+'Ten minutes from now this feeling is smaller. You just have to still be standing then.'},
      {icon:'\u{1FAA9}', text:'What you’re protecting here doesn’t show up on any balance sheet — the clear head tomorrow, the self-respect, being able to look people in the eye. That’s the real reward, and it’s only earned in moments exactly like this one.'},
      {icon:'\u{1F9E0}', text:'What’s underneath it — lonely, understimulated, avoiding something? This is almost never about the thing itself. Name what it’s managing and it loses its grip.'},
    ];
    extra=bits.map(s=>'<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--bd)"><span style="font-size:16px;flex:none">'+s.icon+'</span><span style="font-size:13px;color:var(--tx2);line-height:1.55">'+s.text+'</span></div>').join('');
  }
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="max-height:88vh;overflow-y:auto">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:24px;font-style:italic;color:var(--tx);margin-bottom:6px">You came here first</div>'+
    '<div style="text-align:center;font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:16px">'+body+'</div>'+
    _planCardHTML(i)+
    _reframeHTML()+
    '<div style="margin-bottom:16px">'+extra+'</div>'+
    '<button class="btn primary" onclick="_momentWin('+i+')" style="margin-bottom:8px">The wave’s passing — I’m good</button>'+
    '<button class="btn" onclick="closeModal(this);openBreath(\'sigh\',{reason:\'the pull\'})" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);margin-bottom:8px;font-size:13px">🌊 Breathe through it — 1 min</button>'+
    '<button class="btn" onclick="closeModal(this);openHALT()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);margin-bottom:8px;font-size:13px">🍽 Wait — am I hungry, angry, lonely or tired?</button>'+
    '<button class="btn" onclick="closeModal(this);startLiveIntervention('+i+')" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);margin-bottom:8px;font-size:13px">Stay with me — full SOS</button>'+
    '<button class="btn" onclick="closeModal(this);openCompanionForUrge()" style="background:transparent;border:none;color:var(--tx3);font-size:12px">I need to talk</button>'+
    '</div>';
  document.body.appendChild(m);
  try{ if(typeof haptic==='function') haptic('tap'); }catch(_){}
}
function _momentWin(i){
  loadV(); const v=vices[i];
  if(v){
    v.w=(v.w||0)+1; v.total=(v.total||0)+1; v.lastWin=new Date().toISOString();
    const moments=ls('totry_moments_won')||[];
    moments.unshift({v:v.n, ts:new Date().toISOString(), kind:_viceStakeKind(v)});
    ls('totry_moments_won', moments.slice(0,300));
    _recordFightMoment(v.n, true);   // teach the risk-window engine when the pull hits
    saveV();
  }
  document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());
  try{ renderVices(); if(typeof syncToCloud==='function') syncToCloud(); if(typeof haptic==='function') haptic('success'); }catch(_){}
  // The win isn't a toast you scroll past — it's a door OUT. You turned away; now go live.
  theRelease({did:'The wave passed — and you didn’t. Not falling was the whole thing; the feeling goes, this is what stays.'});
}

// ── MEETING HIM IN THE HARD HOUR, PROACTIVELY ──────────────────────────────────────────────────
// Background push (reaching out app-closed) is the native step. But the app can already be present
// the moment he opens it inside his known risk window — the hour the pattern engine learned is
// hardest for him. This is "before it takes over" made proactive, and it works in the PWA today.
// Quiet by default: it OFFERS the door, never forces it, and never nags — once per window, per day.
function _maybeRiskWindowGreeting(){
  try{
    if(typeof loadV==='function') loadV();
    const vs=(typeof vices!=='undefined'&&Array.isArray(vices))?vices.filter(v=>v&&v.n):[];
    if(!vs.length) return;
    const nowBlock=_viceBlockLabel(new Date().getHours());
    const today=_todayLocalISO();
    // Don't intrude right after he just handled a moment — he's already met.
    const lastWon=(ls('totry_moments_won')||[])[0];
    if(lastWon && (Date.now()-new Date(lastWon.ts).getTime()) < 90*60000) return;
    // Find a vice whose learned hard hour is NOW.
    let hit=null;
    vs.forEach(v=>{
      const p=(typeof analyzeUrgePatterns==='function')?analyzeUrgePatterns(v.n):null;
      if(p && p.riskWindow===nowBlock){ if(!hit || (p.total>hit.p.total)) hit={v, p, idx:vices.indexOf(v)}; }
    });
    if(!hit) return;
    // Once per window, per day.
    const key='totry_riskgreet_'+_hashId(hit.v.n);
    if(ls(key)===today+'|'+nowBlock) return;
    ls(key, today+'|'+nowBlock);
    const first=(ls('totry_name')||'').trim().split(' ')[0];
    const hi=first?first+', ':'';
    const trig=hit.p.topTrigger?(' It’s often '+hit.p.topTrigger+' that starts it.'):'';
    const _hitAct=(hit.v.kind==='letgo')?'openLettingGo()':('openMomentStakes('+hit.idx+')'); // letting-go → the grief door, not the substance-stakes door
    const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
    m.innerHTML='<div class="modal" style="text-align:center">'+
      '<div class="modal-handle"></div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:24px;font-style:italic;color:var(--tx);line-height:1.3;margin-bottom:10px">I’m here.</div>'+
      '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:18px">'+hi+'this is usually the hardest stretch for you with '+String(hit.v.n).replace(/</g,'&lt;')+'.'+trig+' Nothing has to be happening — I just wanted to be here before it does. How are you, honestly?</div>'+
      '<button class="btn primary" onclick="closeModal(this);'+_hitAct+'" style="margin-bottom:8px">The pull’s here — walk me through it</button>'+
      '<button class="btn" onclick="_riskGreetSteady('+hit.idx+')" style="background:var(--gr-bg);border:1px solid var(--gr-bd);color:var(--gr);margin-bottom:8px;font-size:13px">I’m steady tonight</button>'+
      '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Just checking in — I’m fine</button>'+
      '</div>';
    document.body.appendChild(m);
    if(typeof haptic==='function') haptic('tap');
  }catch(_){}
}
// "I'm steady" during the hard hour is itself a small win worth marking — he showed up to the moment
// and stood in it. Recorded gently, and it teaches the pattern engine too.
function _riskGreetSteady(i){
  loadV(); const v=vices[i];
  if(v){
    const moments=ls('totry_moments_won')||[];
    moments.unshift({v:v.n, ts:new Date().toISOString(), kind:'steady'});
    ls('totry_moments_won', moments.slice(0,300));
    window.__momentOpenedAt=Date.now(); _recordFightMoment(v.n, true);
    v.w=(v.w||0)+1; v.total=(v.total||0)+1; v.lastWin=new Date().toISOString(); saveV();
  }
  document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());
  try{ renderVices(); if(typeof syncToCloud==='function') syncToCloud(); if(typeof haptic==='function') haptic('success'); }catch(_){}
  showToast('Good', 'Standing steady through your hard hour is its own kind of strong. I’ll be here.');
}

function editViceCost(i){
  loadV();
  const v = vices[i]; if(!v) return;
  const m = document.createElement('div');
  m.className = 'modal-bg open'; m.style.alignItems='center';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);font-style:italic;margin-bottom:6px">'+String(v.n).replace(/</g,'&lt;')+'</div>'+
    '<div style="text-align:center;font-size:12px;color:var(--tx3);margin-bottom:16px">What did this cost you when it was active? Every clean day turns that into reclaimed money.</div>'+
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Amount ('+curSym()+')</div>'+
    '<input type="number" inputmode="decimal" id="vc-amount" value="'+(v.costAmount||'')+'" placeholder="e.g. 25" style="margin-bottom:12px;font-size:16px;padding:12px">'+
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Per</div>'+
    '<select id="vc-per" style="margin-bottom:14px;font-size:16px;padding:12px">'+
      '<option value="purchase"'+(v.costPer==='purchase'?' selected':'')+'>each time I buy (a pack, a bag — lasts a while)</option>'+
      '<option value="day"'+(v.costPer==='day'?' selected':'')+'>day</option>'+
      '<option value="week"'+(!v.costPer||v.costPer==='week'?' selected':'')+'>week</option>'+
      '<option value="use"'+(v.costPer==='use'?' selected':'')+'>each time I use it (set uses/week below)</option>'+
    '</select>'+
    '<div id="vc-uses-wrap" style="display:'+(v.costPer==='use'?'block':'none')+'">'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Times per week</div>'+
      '<input type="number" inputmode="numeric" id="vc-uses" value="'+(v.costUses||'')+'" placeholder="e.g. 7" style="margin-bottom:14px;font-size:16px;padding:12px">'+
    '</div>'+
    // Lumpy buying, told honestly: one buy lasts a while, and that supply was already paid for.
    '<div id="vc-buy-wrap" style="display:'+(v.costPer==='purchase'?'block':'none')+'">'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">One buy lasts (days)</div>'+
      '<input type="number" inputmode="numeric" id="vc-lasts" value="'+(v.lastsDays||'')+'" placeholder="e.g. 30" style="margin-bottom:12px;font-size:16px;padding:12px">'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">When did you last buy?</div>'+
      '<input type="date" id="vc-lastbuy" value="'+(v.lastPurchase?String(v.lastPurchase).slice(0,10):'')+'" style="margin-bottom:6px;font-size:16px;padding:12px;color-scheme:dark">'+
      '<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-bottom:14px">You already paid for what you have. Saving starts at the buy you don’t make.</div>'+
    '</div>'+
    // Money owed for past use — you're not ahead until this is cleared.
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Still owe anyone for it? ('+curSym()+')</div>'+
    '<input type="number" inputmode="decimal" id="vc-owed" value="'+(v.owed||'')+'" placeholder="e.g. 200 — leave blank if none" style="margin-bottom:6px;font-size:16px;padding:12px">'+
    '<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-bottom:14px">Being clean doesn’t put you ahead until what you owe is cleared. I’ll count that first, honestly.</div>'+
    '<button class="btn primary" onclick="saveViceCost('+i+')" style="margin-bottom:8px">Save</button>'+
    (v.costAmount?'<button class="btn" onclick="clearViceCost('+i+')" style="background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12px;margin-bottom:8px">Remove cost tracking</button>':'')+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>'+
    '</div>';
  document.body.appendChild(m);
  const perSel = document.getElementById('vc-per');
  if(perSel) perSel.onchange = () => {
    const w=document.getElementById('vc-uses-wrap'); if(w) w.style.display = perSel.value==='use'?'block':'none';
    const b=document.getElementById('vc-buy-wrap'); if(b) b.style.display = perSel.value==='purchase'?'block':'none';
  };
}
function saveViceCost(i){
  loadV();
  const amt = parseFloat(document.getElementById('vc-amount')?.value||'');
  const per = document.getElementById('vc-per')?.value || 'week';
  const uses = parseFloat(document.getElementById('vc-uses')?.value||'');
  const lasts = parseFloat(document.getElementById('vc-lasts')?.value||'');
  const lastBuy = document.getElementById('vc-lastbuy')?.value || '';
  const owed = parseFloat(document.getElementById('vc-owed')?.value||'');
  if(!amt || amt<=0){ showToast('Enter an amount','Add what it cost, or cancel.'); return; }
  vices[i].costAmount = amt; vices[i].costPer = per;
  if(per==='use') vices[i].costUses = uses||7;
  if(per==='purchase'){
    vices[i].lastsDays = lasts||30;
    vices[i].lastPurchase = lastBuy ? new Date(lastBuy+'T12:00:00').toISOString() : (vices[i].lastPurchase||null);
  }
  vices[i].owed = (owed>0) ? owed : 0;
  saveV();
  document.querySelector('.modal-bg.open')?.remove();
  renderVices();
  const saved = viceMoneySaved(vices[i]);
  showToast('Saved', saved>0 ? (curSym()+saved.toLocaleString()+' reclaimed so far \u2014 see it in Money.') : 'Cost tracked.');
  haptic('success');
}
function clearViceCost(i){
  loadV();
  delete vices[i].costAmount; delete vices[i].costPer; delete vices[i].costUses;
  saveV();
  document.querySelector('.modal-bg.open')?.remove();
  renderVices();
  showToast('Removed','Cost tracking off for this one.');
}

