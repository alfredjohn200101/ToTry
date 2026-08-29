// ── YOUR NEXT STEP ────────────────────────────────────────────
// One dynamic daily action. Picks the most important undone thing for right now, so the user
// never has to decide what to engage with. Reorganizes existing flows — adds no new feature.
// The ritual logs are read as arrays in fifteen places, each guarded with `|| []` — which catches a
// log that is MISSING and not one that is the wrong shape. _doneToday, a few lines from some of these
// callers, carefully handles BOTH an array and a date-keyed object, which is the codebase telling us
// plainly that both shapes exist in the wild. A date-keyed morning log therefore throws inside
// go('home') and takes the entire home screen down — the third store in this app that could do that.
// One reader, one shape out, and an object is converted rather than discarded.
function ritualLog(key){
  const v = ls(key);
  if(Array.isArray(v)) return v;
  if(v && typeof v === 'object'){
    return Object.keys(v).map(function(k){
      const e = v[k];
      return (e && typeof e === 'object') ? Object.assign({ ts: e.ts || k, date: e.date || k }, e)
                                          : { ts: k, date: k };
    });
  }
  return [];
}

function getNextStep(){
  const today = new Date().toLocaleDateString('en-AU');
  const hour = new Date().getHours();
  // 0. HARD-MOMENT AWARENESS (the nervous system). Late night is the classic danger window for
  // most compulsions — gently put the companion in front of them BEFORE anything routine.
  // Prefer HIS learned hard hour over a blanket assumption \u2014 if the pattern engine knows when a
  // fight tends to pull, honour THAT (it may be evening, not midnight). Fall back to late night.
  // Only for someone actually fighting something, and it opens the integrated moment door (which
  // knows the vice, the stakes, the whole life), not a blank chat.
  try{
    if(typeof loadV==='function') loadV();
    const _vs = (typeof vices!=='undefined' && Array.isArray(vices)) ? vices.filter(v=>v&&v.n) : [];
    if(_vs.length){
      const _block = (typeof _viceBlockLabel==='function') ? _viceBlockLabel(hour) : null;
      let _hardVice = null;
      _vs.forEach(v=>{ try{ const p=(typeof analyzeUrgePatterns==='function')?analyzeUrgePatterns(v.n):null; if(p && p.riskWindow===_block) _hardVice=v; }catch(_){} });
      if(_hardVice){
        return { text:'This is usually your hard hour', sub:'Right around when '+_hardVice.n+' tends to pull. Nothing has to be happening \u2014 get ahead of it with me.', action:'breath', actionArg:String(_hardVice.n) };
      }
      if(hour >= 22 || hour < 5){
        return { text:'The hard hour\u2019s near', sub:'Late hours are when it pulls \u2014 get ahead of it. One slow minute, before anything rises.', action:'breath' };
      }
    }
  }catch(_){ }
  // 0b. RECOVERY AWARENESS. Low readiness + no training yet today \u2192 steer toward rest, not pushing.
  try{
    if(typeof computeReadiness === 'function'){
      const _r = computeReadiness();
      const _trained = (typeof getUnifiedTraining==='function') && getUnifiedTraining().some(t=>t.ts && new Date(t.ts).toLocaleDateString('en-AU')===today);
      if(_r && _r.level === 'rest' && !_trained && hour >= 7 && hour < 20){
        return { text:'Your body needs rest today', sub:'Recovery is low \u2014 go gentle. Mobility or a walk, not a max effort.', action:'mobility' };
      }
    }
  }catch(_){ }
  // 1. Morning ritual not done yet today?
  const morningToday = ritualLog('totry_mornings').some(m=>m.ts && new Date(m.ts).toLocaleDateString('en-AU')===today);
  if(!morningToday && hour < 12){
    return { text:'Start your morning', sub:'Set today\u2019s intention and gratitude.', softenOk:true, action:'morning' };
  }
  // 2. After the morning: surface the next thing actually on the calendar today.
  if(typeof _calEvents === 'function'){
    const nowMin = new Date().getHours()*60 + new Date().getMinutes();
    const todayDow = (new Date().getDay()+6)%7;
    const upcoming = (_calEvents()||[])
      .filter(e => e.day === todayDow && e.start)
      .map(e => { const [h,m]=e.start.split(':').map(Number); return {...e, _min:h*60+(m||0)}; })
      .filter(e => e._min >= nowMin - 30)  // include things starting within the last half hour
      .sort((a,b)=>a._min-b._min);
    if(upcoming.length){
      const nx = upcoming[0];
      const mins = nx._min - nowMin;
      const whenTxt = mins <= 0 ? 'now' : mins < 60 ? ('in '+mins+' min') : ('at '+nx.start);
      return { text: nx.title, sub: 'Coming up '+whenTxt+' \u00b7 tap to see your day', action:'calendar' };
    }
  }
  // 3. No training logged today?
  const trainedToday = (typeof getUnifiedTraining==='function') && getUnifiedTraining().some(t=>t.ts && new Date(t.ts).toLocaleDateString('en-AU')===today);
  if(!trainedToday && hour >= 10 && hour < 21){
    return { text:'Log today\u2019s training', sub:'A workout, a walk, anything you did.', softenOk:true, action:'train' };
  }
  // 3. Evening: examen / reflection not done?
  if(hour >= 17){
    const examenToday = (ls('totry_examens')||[]).some(e=>e.ts && new Date(e.ts).toLocaleDateString('en-AU')===today);
    const eveningToday = ritualLog('totry_evenings').some(e=>e.ts && new Date(e.ts).toLocaleDateString('en-AU')===today);
    if(!eveningToday || !examenToday){
      return { text:'Close your day', sub:_nextStepCloseSub(), softenOk:true, action:'reflect' };
    }
  }
  // 4. Morning's done but it's still early and nothing else pressing — gentle prayer nudge.
  // totry_prayer_done has ZERO writers anywhere in the app, so this was permanently falsy and the home's
  // next step said "Take a moment to pray" all morning even to someone who had just prayed, saved an
  // intention and finished their Examen. Nagging a person about the thing they just did is the exact
  // opposite of this app's promise. Derive it from what actually gets written instead.
  const prayedToday = (function(){
    try{
      const sameDay = ts => ts && new Date(ts).toLocaleDateString('en-AU') === today;
      if((ls('totry_prayers')||[]).some(p => p && (sameDay(p.createdAt) || sameDay(p.ts)))) return true;
      if((ls('totry_examens')||[]).some(e => e && sameDay(e.ts))) return true;
      if((ls('totry_rosaries')||[]).some(r => r && (sameDay(r.ts) || sameDay(r.date)))) return true;
      const m = ritualLog('totry_mornings')[0];
      if(m && sameDay(m.ts) && (m.intention || m.gratitude)) return true;
      return false;
    }catch(_){ return false; }
  })();
  if(!prayedToday && hour < 17){
    return { text:'Take a moment to pray', sub:'A short scripture and prayer for today.', action:'soul' };
  }
  // 5. Everything core is done.
  return { text:'You\u2019ve done today\u2019s work', sub:'Rest, or revisit anything you like.', action:'reflect', done:true };
}
// The home's time-aware greeting — this is what makes the home FEEL different through the day.
// Morning: invite setting the day. Midday/afternoon: a light check-in. Evening: invite closing it.
// It also knows what you've already done today, so it never tells you to do something you've done.
// PROGRESSIVE DISCLOSURE — the #1 retention lever the evidence names. The research is blunt:
// "overwhelming feature presentation creates immediate abandonment." So a new man does NOT see the
// whole cathedral. The first days he sees only what serves him now — the brother, his identity, his
// one next step, the guided start. Depth UNLOCKS as he establishes himself, so the app grows WITH
// him instead of drowning him. This is the opposite of how the field fails.
function applyHomeProgressiveDisclosure(){
  try{
    // HOW LONG THEY HAVE HAD THE APP, NOT WHAT THEIR COUNTER SAYS. getDayCount() honours the
    // "Begin again — Day 1" reset in Settings, which is about their journey, not their familiarity
    // with the app. So someone who had used To Try for eight months and chose to start again had the
    // home stripped back to a new-user's home — the in-the-moment help they had come to rely on
    // hidden from them at the exact moment they had just declared they were starting over.
    const day = (typeof daysInstalled==='function') ? daysInstalled() : 99;
    // Advanced surfaces, each with the day they unlock. Before that, they're hidden so the home
    // stays calm and graspable. (If a card is already hidden by its own logic, we leave it hidden.)
    const gates = [
      { id:'home-insight',              unlock:4 },
      { id:'home-readiness-card',       unlock:3 },
      { id:'home-weekly-reflection-card', unlock:7 },
      { id:'home-quickwin-wrap',        unlock:3 },
      { id:'home-calendar-card',        unlock:5 },
      { id:'today-for-you',             unlock:4 },
      // A new person has no 'last week' — the weekly check-in only shames them. Hold it until a real
      // week of data exists. And 'today's mission' is premature before any rhythm is established.
      { id:'weekly-checkin',            unlock:7 },
      { id:'home-today-mission-wrap',   unlock:3 }
    ];
    gates.forEach(g=>{
      const el = document.getElementById(g.id);
      if(!el) return;
      if(day < g.unlock){ el.dataset._pdHidden='1'; el.style.display='none'; }
      else if(el.dataset._pdHidden==='1'){ delete el.dataset._pdHidden; /* let its own renderer show it next cycle */ }
    });
  }catch(_){}
}

// HOME DEPTH FOLD — the everyday home is a glance (hero + spine + habits); the deeper cards
// (schedule, in-the-moment help, readiness, weekly reflection) live behind ONE tap. Depth on-demand,
// not a wall — kills the 3-4 screen scroll for established users without hiding anything for good.
function toggleHomeDepth(){
  const body=document.getElementById('home-depth-body'); if(!body) return;
  const nowOpen = body.dataset._open!=='1';
  body.style.display = nowOpen?'block':'none';
  body.dataset._open = nowOpen?'1':'0';
  const caret=document.getElementById('home-depth-caret'); if(caret) caret.innerHTML = nowOpen?'&#8963;':'&#8964;';
  const label=document.getElementById('home-depth-label'); if(label) label.textContent = nowOpen?'Show less':'More of your day';
  try{ if(typeof haptic==='function') haptic('tap'); }catch(_){}
  try{ localStorage.setItem('totry_home_depth_open', nowOpen?'1':'0'); }catch(_){}
}
function renderHomeDepthFold(){
  const toggle=document.getElementById('home-depth-toggle');
  const body=document.getElementById('home-depth-body');
  if(!toggle||!body) return;
  // Anything worth showing? Check each child's own render intent (style.display) — the body may be
  // collapsed, so offsetHeight would read 0 for all of them.
  const ids=['home-calendar-card','home-quickwin-wrap','home-readiness-card','home-weekly-reflection-card'];
  const anyContent = ids.some(id=>{ const el=document.getElementById(id); return el && el.style.display!=='none'; });
  if(!anyContent){ toggle.style.display='none'; body.style.display='none'; body.dataset._open='0'; return; }
  toggle.style.display='block';
  let open=false; try{ open = localStorage.getItem('totry_home_depth_open')==='1'; }catch(_){}
  body.style.display = open?'block':'none';
  body.dataset._open = open?'1':'0';
  const caret=document.getElementById('home-depth-caret'); if(caret) caret.innerHTML = open?'&#8963;':'&#8964;';
  const label=document.getElementById('home-depth-label'); if(label) label.textContent = open?'Show less':'More of your day';
}

// YOUR LIFE, WOVEN — the stewardship spine. One glance across the domains a person is called to tend
// (the fight, body, spirit, money), each a door to its depth. The thesis made visible on the home.
function renderLifeWoven(){
  const box=document.getElementById('home-woven'); if(!box) return;
  const s=(typeof getLifeState==='function')?getLifeState():null;
  if(!s){ box.innerHTML=''; return; }
  const today=new Date().toLocaleDateString('en-AU'); const h=new Date().getHours();
  const dOn=(x)=>{ try{ return new Date(x.ts||x.createdAt||x.date||0).toLocaleDateString('en-AU')===today; }catch(_){ return false; } };
  // BODY — trained + fuel today
  const t=s.training||{}, n=s.nutrition||{}; const bodyBits=[];
  if(t.sessions7>0) bodyBits.push(t.sessions7+' session'+(t.sessions7===1?'':'s')+' this wk');
  const goalCal=(ls('totry_nut_goals')||{}).cal;
  // Gentle mode is someone saying "do not show me calorie numbers" — often because counting them is
  // part of what is hurting them. The Nourish tab honours it; Home did not, so the first thing they
  // saw on opening the app was "1,247 cal left". Same words the diary uses, so the two agree.
  if(typeof nutGentle==='function' && nutGentle()){
    if(n.todayCal>0 && typeof _gentleWord==='function') bodyBits.push(_gentleWord(n.todayCal, goalCal).w.toLowerCase());
  }
  else if(n.todayCal!=null && goalCal) bodyBits.push(Math.max(0,goalCal-n.todayCal).toLocaleString()+' cal left');
  else if(n.todayCal>0) bodyBits.push(n.todayCal.toLocaleString()+' cal today');
  const bodyTxt=bodyBits.length?bodyBits.join(' · '):'not logged yet';
  // THE FIGHT — clean streak (quit) or holding the line (moderate)
  const vs=(s.fight&&s.fight.vices)||[]; let fightTxt;
  if(!vs.length) fightTxt='no fight named yet';
  else { const q=vs.filter(v=>viceIsAbstinence(v)); if(q.length){ const mc=Math.max.apply(null,q.map(v=>v.cleanDays||0)); fightTxt=mc+' day'+(mc===1?'':'s')+' clean'; } else { const lg=vs.filter(v=>v.kind==='letgo'); fightTxt = lg.length ? 'letting go, day '+Math.max.apply(null,lg.map(v=>v.cleanDays||0)) : 'holding your line'; } }
  // SPIRIT — the daily rhythm
  const mornDone=ritualLog('totry_mornings').some(dOn); const evenDone=ritualLog('totry_evenings').some(dOn);
  const spiritTxt = evenDone?'day closed ✓' : mornDone?'reflect tonight' : (h<15?'set your intention':'reflect on today');
  // MONEY
  const m=s.money||{}; const moneyBits=[];
  if(m.reclaimed>0) moneyBits.push(curSym()+m.reclaimed.toLocaleString()+' reclaimed');
  if(m.hasDebt) moneyBits.push(curSym()+m.totalDebt.toLocaleString()+' debt');
  const moneyTxt=moneyBits.length?moneyBits.join(' · '):'not tracked yet';
  const rows=[
    ['🛡️','The fight',fightTxt,"go('fight')"],
    ['💪','Body',bodyTxt,"go('grow')"],
    ['🙏','Spirit',spiritTxt,"go('soul')"],
    ['💰','Money',moneyTxt,"go('money')"]
  ];
  box.innerHTML='<div class="card" style="padding:4px 2px;margin-bottom:14px">'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);letter-spacing:0.14em;text-transform:uppercase;padding:8px 12px 2px">Your life, woven</div>'+
    rows.map(r=>'<button onclick="'+r[3]+'" style="width:100%;display:flex;align-items:center;gap:11px;background:none;border:none;border-top:1px solid var(--bd);padding:11px 12px;cursor:pointer;text-align:left">'+
      '<span style="font-size:15px;flex-shrink:0;width:20px;text-align:center">'+r[0]+'</span>'+
      '<span style="font-size:13px;color:var(--tx);flex-shrink:0;width:66px">'+r[1]+'</span>'+
      '<span style="flex:1;font-size:12px;color:var(--tx3);text-align:right">'+r[2]+'</span>'+
      '<span style="color:var(--tx3);font-size:14px;flex-shrink:0;margin-left:6px">›</span>'+
    '</button>').join('')+
    // The one number this app is proud of: not time spent here, but times you left better. Earned (≥3),
    // never shown at zero — the anti-engagement metric made quietly visible. (totry_releases)
    (function(){ const rc=(typeof releaseCount==='function')?releaseCount():0; return rc>=3 ? '<div style="font-family:DM Mono,monospace;font-size:9.5px;color:var(--tx3);letter-spacing:0.05em;line-height:1.5;border-top:1px solid var(--bd);padding:9px 12px 8px;text-align:center">🕊️ '+rc+' times, you came here and walked back into your life</div>' : ''; })()+
  '</div>';
}
function renderHomeGreeting(){
  const hiEl = document.getElementById('home-greeting-hi');
  const subEl = document.getElementById('home-greeting-sub');
  const actEl = document.getElementById('home-greeting-action');
  if(!hiEl || !subEl || !actEl) return;
  const name = ls('totry_name') || '';
  const h = new Date().getHours();
  const today = new Date().toLocaleDateString('en-AU');
  const didMorning = ritualLog('totry_mornings').some(m => m.ts && new Date(m.ts).toLocaleDateString('en-AU')===today);
  const didEvening = ritualLog('totry_evenings').some(e => e.ts && new Date(e.ts).toLocaleDateString('en-AU')===today);

  let hi, sub, actLabel='', actType='', daypart;
  if(h < 5){
    daypart='night';
    hi = name ? ('Still up, '+name+'?') : 'Still up?';
    sub = 'Rest is part of the work. When you\u2019re ready, the morning will be here.';
  } else if(h < 12){
    daypart='dawn';
    hi = (name ? ('Good morning, '+name+'.') : 'Good morning.');
    if(didMorning){ sub = 'Your morning\u2019s set. Carry it well \u2014 I\u2019m here if the day gets heavy.'; }
    else { sub = 'A new day, fresh and unwritten. Want to set your intention before it starts?'; actLabel='Begin the morning'; actType='morning'; }
  } else if(h < 17){
    daypart='day';
    hi = (name ? ('How\u2019s the day, '+name+'?') : 'How\u2019s the day going?');
    sub = didMorning ? 'You set out with intention this morning. Still on the path?' : 'The day\u2019s underway \u2014 it\u2019s never too late to choose how you meet it.';
    actLabel = 'Check in with me'; actType='companion';
  } else {
    daypart='dusk';
    hi = (name ? ('Good evening, '+name+'.') : 'Good evening.');
    if(didEvening){ sub = 'You\u2019ve closed the day honestly. Rest well \u2014 tomorrow is grace, new again.'; }
    else { sub = 'The day is winding down. Want to look back on it together before you rest?'; actLabel='Close the day'; actType='evening'; }
  }
  if(h >= 21 || h < 5) daypart = 'night';
  try{ document.body.setAttribute('data-daypart', daypart); }catch(_){}
  // Identity line in the hero (what they're becoming), quietly shown.
  try{ const idEl=document.getElementById('hero-identity-text'); const row=document.getElementById('hero-identity'); const identity=ls('totry_identity'); if(idEl){ if(identity){ const _t=identity.replace(/^I am\s+/i,'').trim(); idEl.textContent = _t; if(row) row.style.display=''; } else { idEl.textContent=''; if(row) row.style.display='none'; } } }catch(_){}
  hiEl.textContent = hi;
  // Honor the man's chosen faith intensity — 'light' surfaces the daily verse more gently.
  try{ const vp=document.querySelector('.hero-verse'); if(vp) vp.style.display = (faithLevel()==='light') ? 'none' : ''; }catch(_){}
  subEl.textContent = sub;
  if(actLabel){ actEl.style.display='block'; actEl.textContent = actLabel; actEl.dataset.act = actType; }
  else { actEl.style.display='none'; }
}
function homeGreetingAction(){
  const actEl = document.getElementById('home-greeting-action');
  const t = actEl ? actEl.dataset.act : '';
  if(t==='morning') go('morning');
  else if(t==='evening') go('reflect'); // the evening ritual lives in tab-reflect ("close the day"); go('evening') was a dead-end
  else if(t==='companion'){ if(typeof openCompanionForUrge==='function') openCompanionForUrge(); }
}

function renderNextStep(){
  const el = document.getElementById('next-step-anchor');
  if(!el) return;
  // Don't compete with the first-run card for brand-new users.
  if(!ls('totry_firstrun_dismissed') && getDayCount() <= 3){ el.style.display='none'; return; }
  const step = getNextStep();
  const t = document.getElementById('next-step-text');
  const sub = document.getElementById('next-step-sub');
  if(t) t.textContent = step.text;
  // On a heavy day (several things pending), gently acknowledge it and narrow to just this one —
  // reduces the paralysis of seeing every open loop at once. Calm, not naggy; only when it applies.
  let subText = step.sub;
  try{
    if(!step.done && typeof _countOpenLoops==='function'){
      const open = _countOpenLoops();
      // keepSub was opt-OUT, so I marked three steps and missed the calendar one — whose headline is a
      // bare user-typed event title ("Physio with Dan") and whose sub carries the only "when" on the
      // card ("Coming up in 20 min"). Overwriting it left an appointment with no time anywhere on the
      // screen. Worse, opt-out means the NEXT step added here inherits the trap by default.
      // Inverted: a step is softened only if it says its sub is generic encouragement.
      if(open >= 4 && step.softenOk) subText = 'A lot\u2019s on your plate today \u2014 don\u2019t carry it all at once. Just this one thing for now.';
    }
  }catch(_){}
  if(sub) sub.textContent = subText;
  el.dataset.action = step.action;
  if(step.actionArg != null) el.dataset.actionArg = String(step.actionArg);
  else delete el.dataset.actionArg;
  el.style.opacity = step.done ? '0.75' : '1';
  el.style.display = 'flex';
}
// Count the open daily loops (used only to soften the framing on heavy days — never to nag).
function _countOpenLoops(){
  const today = new Date().toLocaleDateString('en-AU');
  let open = 0;
  try{
    if(!ritualLog('totry_mornings').some(m=>m.ts && new Date(m.ts).toLocaleDateString('en-AU')===today)) open++;
    if(!ritualLog('totry_evenings').some(e=>e.ts && new Date(e.ts).toLocaleDateString('en-AU')===today)) open++;
    if(typeof loadH==='function'){ loadH(); const ti=(typeof tIdx==='function')?tIdx():0; const undone=(typeof habits!=='undefined'&&Array.isArray(habits))?habits.filter(h=>h.d&&h.d[ti]!==1).length:0; if(undone>0) open++; }
    const trained = (typeof getUnifiedTraining==='function') && getUnifiedTraining().some(t=>t.ts && new Date(t.ts).toLocaleDateString('en-AU')===today);
    if(!trained) open++;
  }catch(_){}
  return open;
}
// The next-step action used to be a STRING OF CODE stored on a DOM dataset attribute and run through
// `new Function(action)()`. Every value was a literal except one, which interpolated the person's own
// vice name — defended by stripping quotes and backslashes. That denylist held, but it is the fragile
// way to secure an eval sink, and the sink itself was reachable from a DOM attribute in an app that has
// already had two XSS fixes. So there is no sink any more: the dataset carries a KEY, the argument
// travels as DATA, and the only things that can run are the seven listed here.
const NEXT_STEP_ACTIONS = {
  morning:  () => go('morning'),
  reflect:  () => go('reflect'),
  soul:     () => go('soul'),
  train:    () => go('train'),
  calendar: () => go('calendar'),
  mobility: () => { go('train'); setTimeout(function(){ try{ setPTTab('mobility'); }catch(_){ } }, 250); },
  breath:   (arg) => { if(typeof _hardHourBreath==='function') _hardHourBreath(arg || undefined); },
};
function doNextStep(){
  const el = document.getElementById('next-step-anchor');
  const key = el?.dataset.action;
  const fn = key && NEXT_STEP_ACTIONS[key];
  if(!fn){ if(key) console.warn('unknown next-step action:', key); return; }
  try{ fn(el.dataset.actionArg || ''); }catch(e){ console.warn('next step action failed', e); }
}
function renderHomeHabits(){
  autoTickHabits();
  loadH();
  const ti = tIdx();
  const list = document.getElementById('home-habit-list');
  if(!list) return;
  list.innerHTML = '';
  
  if(!habits.length){
    // Used to read "Add them in Settings" — there is no habit UI in Settings, so this sent every new
    // user looking for something that does not exist. Now it offers the thing directly.
    list.innerHTML = '<div style="text-align:center;padding:16px 8px 6px">'+
      '<div style="font-size:13px;color:var(--tx3);line-height:1.6;margin-bottom:12px">No habits yet. Pick one small thing you want to be true of you most days.</div>'+
      '<button class="btn primary" style="width:auto;padding:9px 18px;font-size:13px" onclick="openAddHabit()">Add your first habit</button>'+
    '</div>';
    return;
  }
  
  // Build the LAST 7 DAYS rolling history (today inclusive on the right edge).
  // We read habit history if it exists, otherwise fall back to this week's d[] array
  // mapping Monday=0..Sunday=6 onto the last 7 calendar days.
  const today = new Date();
  const dayLabels = [];
  for(let offset = 6; offset >= 0; offset--){
    const d = new Date(today.getTime() - offset * 86400000);
    dayLabels.push({
      letter: ['S','M','T','W','T','F','S'][d.getDay()],
      isToday: offset === 0,
      offset: offset, // 6 = oldest, 0 = today
      date: d
    });
  }
  
  // Helper to read habit completion for a given offset (0=today, 1=yesterday, ...)
  // We use the d[] array indexed by getDay()-style mapping where d[0]=Monday..d[6]=Sunday
  // Today's index in d[] is ti. So offset N back = (ti - N + 7) % 7.
  const cellFor = (habit, offset) => {
    const idx = ((ti - offset) % 7 + 7) % 7;
    return habit.d[idx] === 1;
  };
  
  // Header: past 7 days perfect-day count
  // Only days this week are knowable (the ring holds Monday->Sunday of the current week), so counting
  // six days back claimed knowledge of days whose slots belong to a different week.
  let pastPerfect = 0;
  const knowable = Math.min(6, ti);          // days before today, within this week
  for(let off = 1; off <= knowable; off++){
    if(habits.every(h => cellFor(h, off))) pastPerfect++;
  }
  const todayDone = habits.filter(h => cellFor(h, 0)).length;
  const todayTotal = habits.length;
  
  const summary = document.createElement('div');
  summary.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--bg3);border-radius:10px;margin-bottom:14px';
  summary.innerHTML = 
    '<div>' +
      '<div class="eyebrow">' + (knowable ? 'This week so far' : 'This week') + '</div>' +
      '<div class="stat-num" style="font-size:18px;color:var(--tx)">' +
        (knowable ? (pastPerfect + '/' + knowable + ' perfect') : 'starts today') + '</div>' +
    '</div>' +
    '<div style="text-align:right">' +
      '<div class="eyebrow">Today so far</div>' +
      '<div class="stat-num" style="font-size:18px;color:var(--tx2)">' + todayDone + '/' + todayTotal + '</div>' +
    '</div>';
  list.appendChild(summary);
  
  // Day-letter row across the top
  const headerRow = document.createElement('div');
  // The name column used to be 1 of 8 EQUAL columns, which on a 375px iPhone left it 36px wide — so
  // every habit rendered as "Mor…", "No v…", "Pra…" and the grid became unreadable at a glance. The day
  // cells only ever hold a tick or a dot, so they are clamped small and the name takes what is left.
  headerRow.style.cssText = 'display:grid;grid-template-columns:minmax(84px,1.4fr) repeat(7,minmax(18px,24px));gap:4px;align-items:center;margin-bottom:6px;padding:0 4px;max-width:100%';
  headerRow.innerHTML = '<div></div>' + dayLabels.map(d => 
    '<div style="font-family:DM Mono,monospace;font-size:9px;text-align:center;color:' + (d.isToday ? 'var(--go)' : 'var(--tx3)') + '">' + d.letter + '</div>'
  ).join('');
  list.appendChild(headerRow);
  
  // Each habit as a row: name on left, last 7 day cells on right (oldest left, today right)
  habits.forEach((h, hi) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:minmax(84px,1.4fr) repeat(7,minmax(18px,24px));gap:4px;align-items:center;padding:8px 4px;border-top:1px solid var(--bd);max-width:100%';
    
    // Past 6 days hit count for at-a-glance pattern
    let pastHits = 0;
    for(let off = 1; off <= knowable; off++) if(cellFor(h, off)) pastHits++;
    // Against a TARGET when the person set one, against elapsed days when they did not. Someone who
    // lifts three times a week and has done all three was reading "3/5 this week" — measured against
    // days that merely passed, so two planned rest days looked like two failures. With a target it
    // reads "3 of 3 this week" and goes green, which is the truth.
    const _pw = (h && h.pw >= 1 && h.pw <= 7) ? h.pw : null;
    const _weekHits = (function(){ let n = 0; for(let off = 0; off <= knowable; off++) if(cellFor(h, off)) n++; return n; })();
    const pastColor = _pw
      ? (_weekHits >= _pw ? 'var(--gr)' : _weekHits >= Math.ceil(_pw * 0.6) ? 'var(--go)' : 'var(--tx3)')
      : (pastHits >= 5 ? 'var(--gr)' : pastHits >= 3 ? 'var(--go)' : 'var(--tx3)');
    
    const nameCell = document.createElement('div');
    nameCell.style.cssText = 'min-width:0;overflow:hidden';
    const _anc = habitAnchor(h);
    // The name is the door to the anchor. The 7 cells stay read-only exactly as before — this is
    // not ticking, so it doesn't break the "ticking lives in the evening" rule.
    nameCell.style.cursor = 'pointer';
    nameCell.innerHTML =
      '<div style="font-size:13px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px dotted var(--bd);display:inline-block;max-width:100%">' + _escFew(h.n) + '</div>' +
      (_anc
        ? '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">after ' + _escFew(_anc) + '</div>'
        : (!window.__anchorHintShown ? (window.__anchorHintShown = true, '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">\uFF0B anchor it to a cue</div>') : '')) +
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:' + pastColor + ';margin-top:2px">' + (knowable ? ((_pw ? (_weekHits + ' of ' + _pw + (_weekHits >= _pw ? ' \u2713' : '')) : (pastHits + '/' + knowable)) + ' this week') : 'day one') + '</div>';
    nameCell.onclick = function(){ if(typeof openHabitAnchor==='function') openHabitAnchor(hi); };
    row.appendChild(nameCell);
    
    // 7 day cells: index 0 = 6 days ago (leftmost), index 6 = today (rightmost)
    dayLabels.forEach((dl, idx) => {
      const offset = 6 - idx; // 6=oldest, 0=today
      const done = cellFor(h, offset);
      const isToday = dl.isToday;
      // Days before this Monday sit outside what the ring can speak to — its seven slots describe the
      // CURRENT week only. Drawing them as empty circles read as "you missed that day", which is a
      // different lie from the stale ticks that used to appear there. Shown as unknown instead.
      const unknown = offset > ti;
      
      const cell = document.createElement('div');
      let bg, border, color, mark;
      
      if(unknown){
        bg = 'transparent';
        border = '1px dotted var(--bd)';
        color = 'rgba(242,239,232,0.22)';
        mark = '\u2013';                       // en dash: no record, not a miss
      } else if(done){
        bg = isToday ? 'var(--go-bg)' : 'rgba(89,164,103,0.18)';
        border = isToday ? '1.5px solid var(--go)' : '1px solid var(--gr)';
        color = isToday ? 'var(--go)' : 'var(--gr)';
        mark = '✓';
      } else if(isToday){
        bg = 'transparent';
        border = '1.5px dashed var(--go)';
        color = 'var(--tx3)';
        mark = '·';
      } else {
        bg = 'transparent';
        border = '1px solid var(--bd)';
        color = 'var(--tx3)';
        mark = '·';
      }
      
      cell.style.cssText = 
        'width:100%;max-width:32px;aspect-ratio:1/1;min-height:24px;margin:0 auto;border-radius:6px;display:flex;align-items:center;justify-content:center;' +
        'font-family:DM Mono,monospace;font-size:12px;font-weight:600;box-sizing:border-box;' +
        'background:' + bg + ';border:' + border + ';color:' + color + ';user-select:none' +
        '';   // no cursor:pointer — this grid is deliberately read-only (see below), so it must not
              // advertise a tap it will not honour.

      cell.textContent = mark;
      // Home grid is READ-ONLY — an at-a-glance view of the last 7 days. Habits auto-tick from
      // logged activity; manual ticking lives in the evening reflection, not here.
      row.appendChild(cell);
    });
    
    list.appendChild(row);
  });
  
  const footer = document.createElement('div');
  footer.style.cssText = 'margin-top:14px;padding-top:10px;border-top:1px solid var(--bd);font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-align:center;letter-spacing:0.05em;line-height:1.5';
footer.innerHTML = 'Tap a habit\'s name to anchor it to something you already do \u00b7 past 6 days on the left';
  list.appendChild(footer);
}


// One-tap vice win straight from home — logs a win for a specific vice without
// needing to navigate to Fight, select the vice, then tap. The most common daily action.
