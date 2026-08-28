// ── "TODAY, FOR YOU" — the adaptive daily presence ──
// One warm voice that meets the man where he is. Decides what he most needs to see today:
// a relapse is handled by the post-relapse card (we defer), otherwise we give him ONE clear
// thing — and on a low-energy day we strip the ask down to the smallest possible step.
function isLowEnergyToday(){
  const today = new Date().toLocaleDateString('en-AU');
  return ls('totry_low_day') === today;
}
function toggleLowEnergyDay(){
  const today = new Date().toLocaleDateString('en-AU');
  if(ls('totry_low_day') === today){ ls('totry_low_day', ''); }
  else { ls('totry_low_day', today); haptic('tap'); }
  renderTodayForYou();
}
// ── MONDAY CHECK-IN ── the week starts with a 20-second honest look, MacroFactor-style.
function _isoWeekKey(){
  const d = new Date(); const t = new Date(d.getFullYear(),0,1);
  return d.getFullYear() + '-' + Math.ceil((((d - t) / 86400000) + t.getDay() + 1) / 7);
}
function renderWeeklyCheckin(){
  const box = document.getElementById('weekly-checkin'); if(!box) return;
  const wk = _isoWeekKey();
  const dow = new Date().getDay(); // 1 = Monday
  if(ls('totry_weekcheck') === wk || (dow !== 1 && dow !== 2)){ box.style.display = 'none'; return; }
  const now = Date.now(), week = 7 * 86400000;
  const trained = (typeof getUnifiedTraining==='function' ? getUnifiedTraining() : (ls('totry_workouts')||[])).filter(t => t.ts && (now - new Date(t.ts).getTime()) < week).length;
  const log = ls('totry_nutlog')||{}; const goals = ls('totry_nut_goals')||defaultNutGoals();
  let proSum = 0, proDays = 0;
  for(let i = 1; i <= 7; i++){
    const d = new Date(); d.setDate(d.getDate() - i);
    const es = log[d.toLocaleDateString('en-AU')]||[];
    if(es.length){ proDays++; proSum += es.reduce((a,e) => a + (parseFloat(e.pro)||0), 0); }
  }
  const proAvg = proDays ? Math.round(proSum / proDays) : 0;
  const body = (ls('totry_body')||[]).filter(b => b.ts && b.weight);
  const avg = arr => arr.length ? arr.reduce((a,b) => a + parseFloat(b.weight), 0) / arr.length : null;
  const w1 = avg(body.filter(b => (now - new Date(b.ts).getTime()) < week));
  const w2 = avg(body.filter(b => { const a = now - new Date(b.ts).getTime(); return a >= week && a < 2*week; }));
  const wDelta = (w1 != null && w2 != null) ? (w1 - w2) : null;
  let focus;
  if(trained < 3) focus = 'Training was the gap \u2014 ' + trained + ' session' + (trained===1?'':'s') + ' last week. Book the first one today.';
  else if(proDays >= 3 && proAvg < goals.pro * 0.85) focus = 'Protein ran ' + (goals.pro - proAvg) + 'g/day under target. One extra serve at lunch closes it.';
  else if(wDelta != null && Math.abs(wDelta) > 1.2) focus = 'Weight moved ' + (wDelta>0?'+':'') + wDelta.toFixed(1) + 'kg in a week \u2014 faster than intended. Worth a look.';
  else focus = 'No weak link stands out. Hold the line and let the weeks stack.';
  box.innerHTML = '<div style="background:var(--bg2);border:1px solid var(--go-bd);border-radius:var(--r);padding:16px;position:relative">'+
    '<button onclick="ls(\'totry_weekcheck\',\''+wk+'\');renderWeeklyCheckin()" aria-label="Dismiss this weekly check-in" style="position:absolute;top:2px;right:4px;background:none;border:none;color:var(--tx3);font-size:16px;padding:10px 12px;line-height:1;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center">\u00d7</button>'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">Weekly check-in</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:6px">Trained <b style="color:var(--tx)">'+trained+'\u00d7</b>'+(proDays?' \u00b7 protein <b style="color:var(--tx)">'+proAvg+'g/day</b>':'')+(wDelta!=null?' \u00b7 weight <b style="color:var(--tx)">'+(wDelta>0?'+':'')+wDelta.toFixed(1)+'kg</b>':'')+'</div>'+
    '<div style="font-size:13px;color:var(--tx);line-height:1.6;margin-bottom:12px">'+focus+'</div>'+
    '<button class="btn primary" onclick="ls(\'totry_weekcheck\',\''+wk+'\');go(\'grow\')" style="font-size:13px;padding:10px">Read the full week \u2192</button></div>';
  box.style.display = 'block';
}

// ── WHAT I'M NOTICING ── honest, observed patterns from the user's own data. These are
// OBSERVATIONS ("on days you trained, your evenings rated higher"), never predictions or
// promises. Needs enough data to be real; stays silent otherwise. Refreshes as data grows.
// ── PROACTIVE NUDGE ENGINE ────────────────────────────────────────────────────
// What a coach does that an app doesn't: reach out BETWEEN sessions, before you ask.
// Each rule detects a pattern in the data and returns a short, human nudge with a tone.
// Priority order matters — care (depletion, going quiet) outranks celebration.
// Nudges are dismissible per-day so they never nag.
function computeProactiveNudge(){
  const now = Date.now();
  const dayKey = ts => new Date(ts).toLocaleDateString('en-AU');
  const since = d => now - d*86400000;
  // Read the shared nervous system so the nudge speaks from the SAME truth as the coach and the
  // weekly synthesis — no contradicting numbers across the app. Rule-specific windows (e.g. the
  // 6-day overtraining check) still use raw streams below where finer granularity is needed.
  const life = (typeof getLifeState==='function') ? getLifeState() : null;
  const workouts = (ls('totry_workouts')||[]).filter(w => (w.ts||w.date));
  const evenings = ls('totry_evenings')||[];
  const journal = ls('totry_journal')||[];
  const checkins = ls('totry_checkins')||[];
  const fightLog = ls('totry_fight_log')||[];
  const name = (ls('totry_name')||'').trim().split(' ')[0];
  // Every nudge's .text is rendered via innerHTML, so the person's OWN name must be escaped too —
  // a name containing < or & would otherwise break (or inject into) every nudge on the home screen.
  const hi = name ? ((typeof _escFew==='function' ? _escFew(name) : name) + ', ') : '';

  // Helper: most recent timestamp across a set of streams
  const lastTs = arr => arr.reduce((m,x)=>{ const t=new Date(x.ts||x.date||x.createdAt||0).getTime(); return t>m?t:m; }, 0);

  // RULE 0 — SHORT NIGHT. Sleep is the soil under every other pillar, so this speaks FIRST: a short
  // night weakens impulse control, spikes hunger, runs emotions hot and pushes choices toward risk.
  // The whole point is forewarning WITH grace — "it's not you, it's the short night" — so a hard day
  // gets read as physiology instead of character. Once per day, dismissible.
  try{
    const _sl = (typeof getLifeState==='function') ? (getLifeState().sleep||null) : null;
    // Fires on a short night OR a rough one. Before v441 a quality tap was written into the hours
    // field, so "Rough" produced lastNight:3 and tripped this by accident. Now that hours and
    // quality are separate, someone who only taps Rough still deserves the same grace-framing —
    // it just no longer pretends to know how long they slept.
    if(_sl && ((_sl.short && _sl.lastNight != null) || (_sl.quality != null && _sl.quality <= 3))){
      const _sid = 'shortsleep'+dayKey(now);
      return { id:_sid, tone:'care',
        eyebrow:'Before today gets going',
        // In the morning there is still something to DO about it — ten minutes of outdoor light is
        // worth more for tonight's sleep than anything you can take, and more for the clock than
        // avoiding screens later. Later in the day that advice is useless, so it isn't offered.
        text: hi + (_sl.lastNight != null ? ('you got about ' + _sl.lastNight + 'h') : ('you said last night was ' + (_sl.qualityWord || 'rough'))) + '. Go gentle today — on a short night the cravings get louder, hunger runs high and everything lands harder. That’s your body running low, not you getting weaker. Lower the bar, eat properly, and don’t trust the 9pm urge.'
              + ((new Date().getHours()>=5 && new Date().getHours()<=10) ? ' One thing that genuinely helps: get outside for ten minutes in the next hour, no sunglasses. It resets tonight before today has even started.' : ''),
        actions: [{label:'Noted', ghost:true, onclick:'dismissNudge(\''+_sid+'\')'}] };
    }
  }catch(_){}

  // RULE 0.5 — A HELD PURCHASE IS DUE. The hold only means something if someone actually comes back
  // and asks. No pressure either way — the point is that the decision gets made awake.
  try{
    const _h = (typeof dueImpulseHold==='function') ? dueImpulseHold() : null;
    if(_h){
      const _esc = (typeof _escFew==='function') ? _escFew(_h.what) : _h.what;
      return { id:'hold'+_h.ts, tone:'nudge',
        eyebrow:'You slept on it',
        text: hi + 'yesterday you held off on <b>'+_esc+'</b>'+(_h.amt?(' (about '+curSym()+Math.round(_h.amt).toLocaleString()+')'):'')+'. Still want it? Either answer is fine — the point was deciding it awake instead of in the moment.',
        actions: [{label:'Still want it', onclick:'_resolveHold('+_h.ts+',true)'},
                  {label:'Nah, it passed', ghost:true, onclick:'_resolveHold('+_h.ts+',false)'}] };
    }
  }catch(_){}

  // RULE 1 — OVERTRAINED, NO REST. 5+ workouts in last 6 days with no rest day → urge a rest.
  const last6Workouts = workouts.filter(w => new Date(w.ts||w.date).getTime() >= since(6));
  const trainedDays = new Set(last6Workouts.map(w => dayKey(w.ts||w.date)));
  if(trainedDays.size >= 5){
    const trainedToday = trainedDays.has(dayKey(now));
    return { id:'overtrained', tone:'care',
      eyebrow:'A word before you train',
      text: hi + 'you\u2019ve trained ' + trainedDays.size + ' of the last 6 days without a real rest. Strength is built in recovery, not just effort. ' + (trainedToday ? 'You\u2019ve already moved today \u2014 maybe let that be enough.' : 'Today might be the day your body grows by resting.'),
      actions: [{label:'Take a rest day', onclick:'ls(\'totry_low_day\', new Date().toLocaleDateString(\'en-AU\'));if(typeof renderTodayForYou===\'function\')renderTodayForYou();dismissNudge(\'overtrained\')'},
                {label:'I\u2019m good', ghost:true, onclick:'dismissNudge(\'overtrained\')'}] };
  }

  // RULE 1.5 — PRE-WORKOUT FUEL (the integration moat: schedule + nutrition, in the moment). On a
  // training day, before the session, surface exactly when to eat the pre-gym meal so there's fuel in
  // the tank. Placed after the rest-day rule so we don't push training-fuel when we're urging rest.
  try{
    const lead = (typeof getPreworkoutLead==='function') ? getPreworkoutLead() : 75;
    const appDay = (new Date().getDay()+6)%7; // Mon=0..Sun=6
    const gymToday = (ls('totry_cal_events')||[]).filter(function(e){ return e && e.type==='gym' && e.day===appDay && e.start; });
    const nowMin = new Date().getHours()*60 + new Date().getMinutes();
    const fmt = function(mins){ const t=((mins%1440)+1440)%1440; let hh=Math.floor(t/60), mm=t%60; const ap=hh<12?'am':'pm'; let h12=hh%12; if(h12===0)h12=12; return h12+(mm?(':'+String(mm).padStart(2,'0')):'')+ap; };
    let best=null;
    gymToday.forEach(function(e){ const parts=(e.start||'').split(':'); let sh=parseInt(parts[0],10); if(isNaN(sh)) sh=18; let sm=parseInt(parts[1],10); if(isNaN(sm)) sm=0; const sMin=sh*60+sm; if(nowMin < sMin && (sMin - nowMin) <= 240){ if(!best || sMin < best.sMin) best={ sMin:sMin, eatBy:sMin-lead }; } });
    if(best){
      return { id:'preworkout'+dayKey(now)+best.sMin, tone:'nudge',
        eyebrow:'Fuel for training',
        text: hi + 'your session’s at ' + fmt(best.sMin) + '. Have your pre-gym meal by ' + fmt(best.eatBy) + ' so you’ve got fuel in the tank — some fast carbs and protein beats training on empty.',
        actions: [{label:'Open my fuel plan', onclick:'go(\'nourish\');setTimeout(function(){if(typeof _fuelViewPlan===\'function\')_fuelViewPlan();},350);dismissNudge(\'preworkout'+dayKey(now)+best.sMin+'\')'},
                  {label:'Got it', ghost:true, onclick:'dismissNudge(\'preworkout'+dayKey(now)+best.sMin+'\')'}] };
    }
  }catch(_){}

  // RULE 2 — GONE QUIET. No reflection/check-in/workout logged in 3+ days, but was active before.
  const lastActivity = Math.max(lastTs(evenings), lastTs(journal), lastTs(checkins), lastTs(workouts));
  if(lastActivity > 0){
    const daysQuiet = Math.floor((now - lastActivity)/86400000);
    const wasActive = (evenings.length + journal.length + workouts.length) >= 5;
    if(daysQuiet >= 3 && wasActive){
      return { id:'quiet'+dayKey(now), tone:'care',
        eyebrow:'Checking in',
        text: hi + 'it\u2019s been ' + daysQuiet + ' days since you logged anything. No guilt \u2014 life happens. I\u2019m just here, and a single small step today is a fine way back in.',
        actions: [{label:'Talk to your Coach', onclick:'go(\'coach\')'},
                  {label:'Not now', ghost:true, onclick:'dismissNudge(\'quiet'+dayKey(now)+'\')'}] };
    }
  }

  // RULE 2.5 — REACH OUT (relatedness: a presence that NOTICES the people you love). Fires on real
  // drift from someone in "your few" while you've been heads-down active. Names ONE person + the
  // appreciation-gap reframe (we under-estimate how welcome a lapsed check-in is). Grace, never guilt;
  // throttled to ~once / 3 days via a bucketed id; fully dismissible. Name is escaped (rendered as innerHTML).
  try{
    const _few = (typeof getYourFew==='function') ? getYourFew() : [];
    // Never fire if they've switched the reach-out off in Settings. And never for a muted person
    // (reachOutSuggestion already skips those) — the app must not nudge about someone who is gone.
    if(_few.length && ls('totry_partner')!==false && typeof reachOutSuggestion==='function'){
      const _s = reachOutSuggestion();
      if(_s && _s.person){
        const _gap = _s.days;
        const _activeDays = evenings.length + journal.length + workouts.length + fightLog.length;
        const _drift = (_gap!=null) ? (_gap>=6) : (_activeDays>=5);
        if(_drift){
          const _nm = (typeof _escFew==='function') ? _escFew(_s.person.name) : _s.person.name;
          // Honest wording: the app only knows what you LOGGED here, not whether you actually called.
          const _gtxt = (_gap==null) ? ('it’s been a while since you and ' + _nm + ' caught up') : ('it’s been about ' + _gap + ' day' + (_gap===1?'':'s') + ' since you logged reaching ' + _nm);
          // WEEKLY bucket, not every 3 days — a nudge about someone you love must never become a nag.
          const _rb = 'reachfew' + Math.floor(now/(7*86400000));
          return { id:_rb, tone:'care',
            eyebrow:'The people you love',
            text: hi + _gtxt + '. You’ll probably feel it’s awkward, or that they don’t need to hear from you — they will, more than you expect, and more because it’s been a while. One message is enough.',
            actions: [{label:'I’ll reach out', onclick:'go(\'reflect\');dismissNudge(\''+_rb+'\')'},
                      {label:'Not now', ghost:true, onclick:'dismissNudge(\''+_rb+'\')'}] };
        }
      }
    }
  }catch(_){}

  // RULE 3 — STREAK AT RISK. A meaningful evening-reflection streak that hasn't been logged today, late in day.
  const hr = new Date().getHours();
  if(hr >= 19){
    const doneToday = evenings.some(e => dayKey(e.ts) === dayKey(now));
    if(!doneToday){
      // count consecutive prior days with an evening
      let streak = 0;
      for(let i=1;i<=30;i++){
        const k = new Date(now - i*86400000).toLocaleDateString('en-AU');
        if(evenings.some(e => dayKey(e.ts) === k)) streak++; else break;
      }
      if(streak >= 3){
        return { id:'streak'+dayKey(now), tone:'nudge',
          eyebrow:'Before the day closes',
          text: hi + 'you\u2019ve closed ' + streak + ' evenings in a row with a reflection. That\u2019s a real thread \u2014 worth not dropping tonight. Two lines is enough.',
          actions: [{label:'Close today', onclick:'go(\'reflect\')'},
                    {label:'Skip tonight', ghost:true, onclick:'dismissNudge(\'streak'+dayKey(now)+'\')'}] };
      }
    }
  }

  // RULE 4 — THE TWO FIGHTS ARE ONE. When the body AND the soul both showed up this week —
  // workouts logged AND fights won — name the connection no secular app ever will: that the
  // discipline of the body and the discipline of the spirit are the same battle. This is the
  // moat. The Catholic frame treats the body as a temple stewarded, not a project optimised.
  const wins7 = fightLog.filter(f => f.won && new Date(f.ts).getTime() >= since(7)).length;
  const wo7 = workouts.filter(w => new Date(w.ts||w.date).getTime() >= since(7)).length;
  if(wins7 >= 2 && wo7 >= 2){
    return { id:'twofights'+dayKey(now), tone:'win',
      eyebrow:'What I\u2019m noticing',
      text: hi + 'this week you trained your body ' + wo7 + ' times and won ' + wins7 + ' fights against the urge. These aren\u2019t two separate disciplines \u2014 they\u2019re one person learning to govern themselves. The strength you build under the bar is the same strength that holds in the hard moment. Keep stewarding both.',
      actions: [{label:'Amen', ghost:true, onclick:'dismissNudge(\'twofights'+dayKey(now)+'\')'}] };
  }

  // RULE 5 — MOMENTUM WORTH NAMING. Strong fight-win week → encouragement (celebration, lowest priority).
  if(wins7 >= 3){
    return { id:'momentum'+dayKey(now), tone:'win',
      eyebrow:'Worth saying out loud',
      text: hi + 'you\u2019ve won ' + wins7 + ' fights this week. Each one was a real choice in a hard moment. That\u2019s not nothing \u2014 that\u2019s who you\u2019re becoming.',
      actions: [{label:'Amen', ghost:true, onclick:'dismissNudge(\'momentum'+dayKey(now)+'\')'}] };
  }

  return null;
}
function dismissNudge(id){
  const d = ls('totry_nudge_dismissed') || {};
  d[id] = Date.now();
  ls('totry_nudge_dismissed', d);
  const box = document.getElementById('home-nudge');
  if(box){ box.style.display = 'none'; }
  if(typeof renderHomeInsight === 'function') renderHomeInsight();
}
function renderProactiveNudge(){
  const box = document.getElementById('home-nudge');
  if(!box) return false;
  const n = computeProactiveNudge();
  if(!n){ box.style.display='none'; return false; }
  // Respect a recent dismissal of this exact nudge.
  const dismissed = ls('totry_nudge_dismissed') || {};
  if(dismissed[n.id] && (Date.now() - dismissed[n.id]) < 20*3600000){ box.style.display='none'; return false; }
  const accent = 'var(--go)';
  const bg = n.tone==='care'
    ? 'linear-gradient(135deg,rgba(200,169,110,0.10),rgba(140,107,182,0.04))'
    : 'var(--bg2)';
  const btns = (n.actions||[]).map(a =>
    a.ghost
      ? '<button class="btn" style="flex:1;font-size:13px;background:var(--bg3);border:1px solid var(--bd)" onclick="'+a.onclick+'">'+a.label+'</button>'
      : '<button class="btn primary" style="flex:1;font-size:13px" onclick="'+a.onclick+'">'+a.label+'</button>'
  ).join('');
  box.innerHTML =
    '<div style="background:'+bg+';border:1px solid var(--go-bd);border-radius:var(--r);padding:15px 16px">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:'+accent+';text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">'+n.eyebrow+'</div>'+
      '<div style="font-size:14px;color:var(--tx2);line-height:1.6;margin-bottom:'+(btns?'12px':'0')+'">'+n.text+'</div>'+
      (btns ? '<div style="display:flex;gap:8px">'+btns+'</div>' : '')+
    '</div>';
  box.style.display = 'block';
  return true;
}
function renderHomeInsight(){
  const box = document.getElementById('home-insight');
  if(!box) return;
  // A live nudge owns the moment — don't stack a static insight under it.
  if(typeof renderProactiveNudge === 'function' && renderProactiveNudge()){ box.style.display='none'; return; }
  const now = Date.now();
  const cutoff = now - 28*86400000; // last 4 weeks
  const dayKey = (ts) => new Date(ts).toLocaleDateString('en-AU');

  // Gather per-day signals
  const evenings = ritualLog('totry_evenings').filter(e => e.ts && new Date(e.ts).getTime() >= cutoff);
  const workouts = (ls('totry_workouts')||[]).filter(w => (w.ts||w.date) && new Date(w.ts||w.date).getTime() >= cutoff);
  const checkins = (ls('totry_checkins')||[]).filter(c => c.ts && new Date(c.ts).getTime() >= cutoff);
  const fightLog = (ls('totry_fight_log')||[]).filter(f => f.ts && new Date(f.ts).getTime() >= cutoff);

  const insights = [];

  // 1) Training ↔ evening day-rating. Compare avg rating on workout days vs non-workout days.
  if(evenings.length >= 6 && workouts.length >= 3){
    const workoutDays = new Set(workouts.map(w => dayKey(w.ts||w.date)));
    const trained = evenings.filter(e => workoutDays.has(dayKey(e.ts)) && e.rating);
    const rested = evenings.filter(e => !workoutDays.has(dayKey(e.ts)) && e.rating);
    if(trained.length >= 3 && rested.length >= 3){
      const avgT = trained.reduce((a,e)=>a+e.rating,0)/trained.length;
      const avgR = rested.reduce((a,e)=>a+e.rating,0)/rested.length;
      if(avgT - avgR >= 0.6){
        insights.push('On the days you trained this month, you rated your evenings higher than on the days you didn\u2019t \u2014 about ' + avgT.toFixed(1) + ' versus ' + avgR.toFixed(1) + ' out of 5. Your body seems to be part of how the day feels.');
      }
    }
  }

  // 2) Spiritual check-in ↔ fight wins. Higher spiritual days coincide with more urge wins?
  if(checkins.length >= 6 && fightLog.length >= 4){
    const winDays = new Set(fightLog.filter(f=>f.won).map(f=>dayKey(f.ts)));
    const spiritualOnWinDays = checkins.filter(c => winDays.has(dayKey(c.ts))).map(c=>c.spiritual).filter(Boolean);
    const spiritualOther = checkins.filter(c => !winDays.has(dayKey(c.ts))).map(c=>c.spiritual).filter(Boolean);
    if(spiritualOnWinDays.length >= 3 && spiritualOther.length >= 3){
      const a = spiritualOnWinDays.reduce((x,y)=>x+y,0)/spiritualOnWinDays.length;
      const b = spiritualOther.reduce((x,y)=>x+y,0)/spiritualOther.length;
      if(a - b >= 1){
        insights.push('On the days you won a fight, your spiritual check-in tended to be higher. Whatever you\u2019re doing on those days \u2014 prayer, scripture, showing up \u2014 it seems to be holding.');
      }
    }
  }

  // 3) A simple, encouraging consistency observation if not enough for correlations.
  if(!insights.length){
    const last7Evenings = ritualLog('totry_evenings').filter(e => e.ts && new Date(e.ts).getTime() >= now-7*86400000);
    const last7Workouts = (ls('totry_workouts')||[]).filter(w => (w.ts||w.date) && new Date(w.ts||w.date).getTime() >= now-7*86400000);
    if(last7Workouts.length >= 3){
      insights.push('You\u2019ve trained ' + last7Workouts.length + ' times in the last week. That\u2019s a real rhythm \u2014 keep showing up.');
    } else if(last7Evenings.length >= 4){
      insights.push('You\u2019ve closed ' + last7Evenings.length + ' of the last 7 evenings with a reflection. That habit of honesty with yourself is worth more than it looks.');
    }
  }

  if(!insights.length){ box.style.display = 'none'; return; }
  // Rotate which insight shows by day so it doesn't feel static.
  const pick = insights[getDayCount() % insights.length];
  box.innerHTML = '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">What I\u2019m noticing</div>' +
    '<div style="font-size:14px;color:var(--tx2);line-height:1.6">' + pick + '</div>';
  box.style.display = 'block';
}

// The hero and this card were asking for the same thing, twice, on one screen. In the evening the hero
// said "The day is winding down. Want to look back on it together before you rest?" over a gold
// [Close the day], and 600px below, this card said "close the day honestly — how it went, one win,
// one thing to release" over a gold [Reflect on today →]. Both are go('reflect'). The same at dawn:
// [Begin the morning] and [Set my intention →], both go('morning').
//
// Two buttons to the same room is not emphasis, it is the app failing to notice what it has already
// said — and a person reads that instantly, even when they could not name it. The hero keeps the ask,
// because it is the part that is above the fold. This card stops repeating it and offers the thing
// the hero does NOT: the other way to answer, for the evening when writing it out is beyond you.
function _heroAlreadyAsks(kind){
  try{
    const a = document.getElementById('home-greeting-action');
    return !!(a && a.style.display !== 'none' && a.dataset.act === kind &&
              (a.textContent || '').trim());
  }catch(_){ return false; }
}

function renderTodayForYou(){
  const card = document.getElementById('today-for-you');
  if(!card) return;
  if(typeof renderWeeklyCheckin === 'function') renderWeeklyCheckin();
  const name = (ls('totry_name') || '').trim();
  const first = name ? name.split(' ')[0] : '';

  // If the post-relapse card is showing, it owns this moment — don't compete.
  const relapseCard = document.getElementById('postrelapse-card');
  if(relapseCard && relapseCard.style.display !== 'none'){ card.style.display = 'none'; return; }
  // During first-run, the welcome card leads.
  const firstRun = document.getElementById('firstrun-card');
  if(firstRun && firstRun.style.display !== 'none'){ card.style.display = 'none'; return; }

  card.style.display = 'block';
  const msgEl = card.querySelector('#tfy-message');
  const actEl = card.querySelector('#tfy-action');
  const eyebrowEl = card.querySelector('#tfy-eyebrow');
  const lowToggle = card.querySelector('#tfy-low-toggle');
  const low = isLowEnergyToday();
  if(lowToggle){
    lowToggle.style.color = low ? 'var(--go)' : 'var(--tx3)';
    lowToggle.style.borderColor = low ? 'var(--go-bd)' : 'var(--bd)';
    lowToggle.textContent = low ? '✓ Taking it easy' : 'Low day?';
  }

  // ── LOW-ENERGY DAY: strip everything back to one gentle, tiny step ──
  if(low){
    if(eyebrowEl) eyebrowEl.textContent = 'Today · gently';
    const lines = [
      'Some days, showing up is the whole victory.',
      'You opened the app. On a hard day, that counts.',
      'No pressure today. Just one small thing, if you can.',
      'Rest is not failure. Be kind to yourself today.'
    ];
    if(msgEl) msgEl.textContent = first ? first + ', ' + lines[getDayCount() % lines.length].charAt(0).toLowerCase() + lines[getDayCount() % lines.length].slice(1) : lines[getDayCount() % lines.length];
    if(actEl){
      actEl.innerHTML =
        '<button class="btn primary" onclick="go(&apos;coach&apos;)" style="margin-bottom:8px">Just talk to your Coach</button>' +
        '<button class="btn" onclick="go(&apos;bible&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Read one verse</button>';
    }
    return;
  }

  // ── RETURNING AFTER A GAP: adaptive re-plan ──────────────────────────────────
  // A coach doesn't open with "you missed 5 days." When a man comes back after a
  // break, the plan bends to meet him: one small, frictionless re-entry step — never
  // the full stack of everything he didn't do. This is what kills the streak-guilt
  // that makes people quit apps for good.
  (function(){
    const lastBack = ls('totry_last_return_ease');
    const tkNow = new Date().toLocaleDateString('en-AU');
    if(lastBack === tkNow) return; // only ease once per day
    const lastActivity = [ls('totry_evenings'),ls('totry_journal'),ls('totry_workouts'),ls('totry_checkins')]
      .flatMap(a => Array.isArray(a)?a:[])
      .reduce((m,x)=>{ const t=new Date(x.ts||x.date||x.createdAt||0).getTime(); return t>m?t:m; }, 0);
    if(!lastActivity) return;
    const daysAway = Math.floor((Date.now()-lastActivity)/86400000);
    const everActive = (ritualLog('totry_evenings').length + (ls('totry_workouts')||[]).length) >= 5;
    if(daysAway >= 3 && everActive){
      ls('totry_last_return_ease', tkNow);
      if(eyebrowEl) eyebrowEl.textContent = 'Welcome back';
      if(msgEl) msgEl.textContent = (first ? first + ', it' : 'It') + '\u2019s good to see you. ' + daysAway + ' days away is nothing \u2014 we don\u2019t pick up the whole plan today, just one honest step. The rest follows on its own.';
      if(actEl){
        actEl.innerHTML =
          '<button class="btn primary" onclick="go(&apos;coach&apos;)" style="margin-bottom:8px">Pick up where we left off</button>' +
          '<button class="btn" onclick="go(&apos;reflect&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Just close today</button>';
      }
      card.__easedReturn = true;
    }
  })();
  if(card.__easedReturn){ card.__easedReturn = false; return; }

  // ── NORMAL DAY: give him ONE clear focus ──
  loadV(); loadH();
  if(eyebrowEl) eyebrowEl.textContent = 'Today';

  // Priority 0 — THE DAY'S RHYTHM. The app should know what time it is: before noon, the
  // morning ritual leads from Home (no hunting through Soul); evening leads to Reflect.
  const _doneToday = (key) => {
    const v = ls(key); if(!v) return false;
    const tk = new Date().toLocaleDateString('en-AU');
    if(Array.isArray(v)) return v.some(e => e && (e.date === tk || (typeof getDayCount==='function' && e.day === getDayCount()) || (e.ts && new Date(e.ts).toLocaleDateString('en-AU') === tk)));
    if(typeof v === 'object') return !!v[tk];
    return false;
  };
  const hr = new Date().getHours();
  if(hr < 12 && !_doneToday('totry_mornings')){
    // Same doubling at dawn: the hero's [Begin the morning] and this card's [Set my intention →] both
    // go('morning'). The hero asks; this offers the lighter door for a morning that has no words in it.
    if(_heroAlreadyAsks('morning')){
      if(eyebrowEl) eyebrowEl.textContent = 'This morning';
      if(msgEl) msgEl.textContent = 'Or start smaller — one thing that would make today count.';
      if(actEl) actEl.innerHTML =
        '<button class="btn" onclick="go(&apos;grow&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Just carry one thing</button>';
      return;
    }
    if(eyebrowEl) eyebrowEl.textContent = 'This morning';
    if(msgEl) msgEl.textContent = (first ? first + ', begin' : 'Begin') + ' the day before the day begins you — a word, your gratitude, your intention, a prayer. A few quiet minutes.';
    if(actEl){
      actEl.innerHTML =
        '<button class="btn primary" onclick="go(&apos;morning&apos;)" style="margin-bottom:8px">Begin your morning →</button>' +
        '<button class="btn" onclick="go(&apos;grow&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Skip to the day</button>';
    }
    return;
  }
  if(hr >= 12 && hr < 17 && !_doneToday('totry_mornings')){
    if(eyebrowEl) eyebrowEl.textContent = 'A gentle check';
    if(msgEl) msgEl.textContent = (first ? first + ', the' : 'The') + ' morning got away from you — that\u2019s alright. It\u2019s not too late to set an intention for what\u2019s left of today.';
    if(actEl){
      actEl.innerHTML =
        '<button class="btn primary" onclick="go(&apos;morning&apos;)" style="margin-bottom:8px">Set my intention →</button>' +
        '<button class="btn" onclick="go(&apos;grow&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Just carry on</button>';
    }
    return;
  }
  if(hr >= 17 && !_doneToday('totry_evenings')){
    if(_heroAlreadyAsks('evening')){
      if(eyebrowEl) eyebrowEl.textContent = 'This evening';
      if(msgEl) msgEl.textContent = 'Not up to writing it out? We can just talk it through instead.';
      if(actEl) actEl.innerHTML =
        '<button class="btn" onclick="go(&apos;coach&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Talk it out with Coach</button>';
      return;
    }
    if(eyebrowEl) eyebrowEl.textContent = 'This evening';
    if(msgEl) msgEl.textContent = (first ? first + ', close' : 'Close') + ' the day honestly — how it went, one win, one thing to release. Then rest.';
    if(actEl){
      actEl.innerHTML =
        '<button class="btn primary" onclick="go(&apos;reflect&apos;)" style="margin-bottom:8px">Reflect on today →</button>' +
        '<button class="btn" onclick="go(&apos;coach&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Talk it out with Coach</button>';
    }
    return;
  }

  // Priority 1: a vice with a strong streak worth protecting (his core fight)
  let focusVice = null, bestStreak = -1;
  (vices||[]).forEach(v => {
    if(!viceIsAbstinence(v)) return; // only an abstinence streak can be protected
    // Nor does a grief. A letting-go struggle (a breakup, a loss, an attachment being released) is
    // not something a person is abstaining FROM, and Home was rendering it as one: "day 6 free of
    // Letting go of her". That is the app misreading someone's mourning as a vice they are resisting,
    // on the first screen they see. Every other surface already excludes kind:'letgo' from streaks.
    if(v.kind === 'letgo') return;
    const s = (typeof viceCleanDays === 'function') ? viceCleanDays(v) : 0;
    if(s > bestStreak){ bestStreak = s; focusVice = v; }
  });

  // Priority 2: unticked habits today
  loadH();
  const ti = (new Date().getDay() + 6) % 7;
  const untickedHabits = (habits||[]).filter(h => !(h.d && h.d[ti] === 1));

  if(focusVice && bestStreak >= 1){
    if(msgEl) msgEl.textContent = (first ? first + ', day ' : 'Day ') + bestStreak + ' free of ' + focusVice.n + '. Protect it today.';
    if(actEl){
      // No "Stay in the fight" button here — the "Fighting an urge right now?" section below
      // already gives a direct, in-place way to go through an urge. This just nudges habits.
      actEl.innerHTML =
        (untickedHabits.length ? '<div style="font-size:11px;color:var(--tx3);text-align:center;font-family:DM Mono,monospace">' + untickedHabits.length + ' habit' + (untickedHabits.length>1?'s':'') + ' still to tick below</div>' : '<div style="font-size:11px;color:var(--tx3);text-align:center;font-family:DM Mono,monospace">If an urge hits, the section below is right there.</div>');
    }
    return;
  }

  if(untickedHabits.length){
    const h = untickedHabits[0];
    if(msgEl) msgEl.textContent = (first ? first + ', one' : 'One') + ' thing today: ' + h.n + '.';
    if(actEl){
      actEl.innerHTML = '<div style="font-size:12px;color:var(--tx3);line-height:1.5">Tap its circle in <span style="color:var(--go)">Today\'s habits</span> below when it\'s done. Small steps, every day.</div>';
    }
    return;
  }

  // Everything done / nothing set up yet — affirm and point forward
  if((vices||[]).length === 0 && (habits||[]).length === 0){
    if(msgEl) msgEl.textContent = (first ? first + ', let\'s' : 'Let\'s') + ' set the first stone. What are you fighting to become?';
    if(actEl) actEl.innerHTML = '<button class="btn primary" onclick="go(&apos;fight&apos;)">Name what you\'re fighting</button>';
    return;
  }
  if(eyebrowEl) eyebrowEl.textContent = 'Today · well done';
  if(msgEl) msgEl.textContent = (first ? first + ', you\'ve' : 'You\'ve') + ' done today\'s work. This is who you\'re becoming.';
  if(actEl) actEl.innerHTML = '<button class="btn" onclick="go(&apos;reflect&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Reflect on today</button>';
}

function renderHomeQuickWins(){
  const wrap = document.getElementById('home-quickwin-wrap');
  const list = document.getElementById('home-quickwin-list');
  if(!wrap || !list) return;
  loadV();
  if(!vices || !vices.length){ wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  list.innerHTML = vices.map((v, i) => {
    if(v.kind === 'letgo'){
      // A letting-go struggle: healing stat + the grief door, never "clean days" / the substance flow.
      const lgDays = v.startDate ? Math.floor((Date.now()-new Date(v.startDate).getTime())/86400000) : 0;
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0' + (i>0?';border-top:1px solid var(--bd)':'') + '">' +
        '<div style="min-width:0;flex:1"><div style="font-size:14px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + v.n.replace(/</g,'&lt;') + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">day ' + lgDays + ' of letting go</div></div>' +
        '<button class="btn" onclick="openLettingGo()" style="width:auto;padding:8px 14px;font-size:12px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);flex-shrink:0">Feeling the pull?</button>' +
      '</div>';
    }
    const moderate = v.mode === 'moderate';
    // A watch-mode vice has no streak and no limit — the honest stat is simply what they logged.
    const watching = (typeof viceMode==='function') && viceMode(v) === 'watch';
    // Honest stat: clean-day streak since last slip + lifetime wins + slips. Updates whether you
    // log a win OR a loss, for every vice. (Moderation-mode vices show their within-limit count.)
    let stat;
    if(watching){
      const _wk = Date.now() - 7*86400000;
      const _n = (ls('totry_vice_uses')||[]).filter(u=>u && u.v===v.n && u.ts && new Date(u.ts).getTime() >= _wk)
                   .reduce((a,u)=>a+(parseInt(u.qty,10)||1),0);
      stat = _n ? (_n + ' logged this week') : 'watching \u00b7 nothing logged this week';
    } else if(moderate){
      stat = (v.modWithin||0) + ' times within limit';
    } else {
      const start = v.startDate ? new Date(v.startDate) : null;
      const cleanDays = start ? Math.floor((Date.now() - start.getTime())/86400000) : 0;
      const wins = v.w||0;
      const slips = v.relapseCount||0;
      const bits = [cleanDays + 'd clean'];
      if(wins) bits.push(wins + (wins===1?' win':' wins'));
      if(slips) bits.push(slips + (slips===1?' slip':' slips'));
      stat = bits.join(' · ');
    }
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0' + (i>0?';border-top:1px solid var(--bd)':'') + '">' +
      '<div style="min-width:0;flex:1"><div style="font-size:14px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + v.n.replace(/</g,'&lt;') + '</div>' +
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">' + stat + '</div></div>' +
      // Primary: open the real urge-support flow (the whole point — you're going THROUGH it now)
      '<button class="btn" onclick="fightVice(' + i + ')" style="width:auto;padding:8px 14px;font-size:12px;background:var(--re-bg);border:1px solid var(--re-bd);color:var(--re);flex-shrink:0">I\'m feeling it</button>' +
    '</div>';
  }).join('');
}

