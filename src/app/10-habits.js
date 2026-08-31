// ── SCOREBOARD ────────────────────────────────────────────────
// Days the person actually TURNED UP — logged something real, fought something, showed their face.
// Not days elapsed. A badge must never be a reward for installing an app and leaving it there; the
// time-based ones now require that half those days were genuinely lived in here.
function _daysShowedUp(){
  try{
    const days = new Set();
    const add = function(ts){ if(!ts) return; const d=new Date(ts); if(!isNaN(d)) days.add(d.toLocaleDateString('en-AU')); };
    ritualLog('totry_mornings').forEach(function(x){ add(x&&x.ts); });
    ritualLog('totry_evenings').forEach(function(x){ add(x&&x.ts); });
    (ls('totry_journal')||[]).forEach(function(x){ add(x&&x.ts); });
    (ls('totry_workouts')||[]).forEach(function(x){ add(x&&(x.ts||x.date)); });
    (ls('totry_examens')||[]).forEach(function(x){ add(x&&x.ts); });
    (ls('totry_fight_log')||[]).forEach(function(x){ add(x&&x.ts); });
    (ls('totry_moments_won')||[]).forEach(function(x){ add(x&&x.ts); });
    (ls('totry_checkins')||[]).forEach(function(x){ if(x&&x.date) days.add(x.date); else add(x&&x.ts); });
    return days.size;
  }catch(_){ return 0; }
}
const ACHS=[
  {icon:'\u2694\uFE0F',title:'First Battle',desc:'Fought your first urge',check:(v)=>v.some(x=>x.total>=1)},
  {icon:'\u{1F3C6}',title:'First Victory',desc:'Won your first battle',check:(v,tw)=>tw>=1},
  {icon:'\u{1F525}',title:'On Fire',desc:'10 total wins',check:(v,tw)=>tw>=10},
  {icon:'\u{1F4AF}',title:'Century',desc:'100 urges defeated',check:(v,tw)=>tw>=100},
  {icon:'\u26A1',title:'Unstoppable',desc:'70%+ win rate with 5+ battles',check:(v)=>v.some(x=>x.total>=5&&((x.w||0)/x.total)>=0.7)},
  {icon:'\u{1F6E1}\uFE0F',title:'Warrior',desc:'50 total wins',check:(v,tw)=>tw>=50},
  {icon:'\u{1F305}',title:'New Day',desc:'30 days in — and you showed up for them',check:(v,tw,day)=>day>=30&&_daysShowedUp()>=15},
  {icon:'\u{1F4D6}',title:'Faithful',desc:'7 days clean',check:(v,tw,day,str)=>str>=7},   // str is cleanStreak (see renderScoreboard), never getStreak()
  {icon:'\u{1F4B0}',title:'Debt Fighter',desc:'Made first debt payment',check:()=>(ls('totry_payments')||[]).length>=1},
  {icon:'\u2600\uFE0F',title:'Morning Person',desc:'7 morning rituals',check:()=>ritualLog('totry_mornings').length>=7},
  {icon:'\u{1F4D3}',title:'Honest',desc:'10 journal entries',check:()=>(ls('totry_journal')||[]).length>=10},
  {icon:'\u{1F4AA}',title:'Committed',desc:'100 days in — half of them you actually turned up',check:(v,tw,day)=>day>=100&&_daysShowedUp()>=50},
];
function renderScoreboard(){
  loadV();
  const tw=vices.reduce((a,v)=>a+(v.w||0),0),tf=vices.reduce((a,v)=>a+(v.total||0),0);
  // STREAK on the Fight tab = longest CURRENT clean streak across all vices (days clean),
  // not the habit-completion streak. This is what users expect to see here.
  const _streakVices = vices.filter(v => v.kind !== 'letgo'); // letting-go isn't a clean-day streak
  const cleanStreak = _streakVices.length ? Math.max(0, ..._streakVices.map(v => viceCleanDays(v))) : 0;
  const rate=tf>0?Math.round((tw/tf)*100):0,day=getDayCount(),str=cleanStreak;
  const e=id=>document.getElementById(id);
  // The hero is how long they have been in this, not how many urges they beat — see the note in the
  // markup. Someone with a long fight and no clean day has still been fighting for that long.
  // ELAPSED here, ordinal on the card. The card says "Day 301 of the fight" and this says "300 days
  // in the fight" — the same relationship as an age and a birthday: you have lived 30 years and you
  // are in your 31st. Each number is phrased to match what it counts, rather than one number wearing
  // two labels.
  const _fightMax = (vices||[]).reduce((a,v) => {
    const since = (typeof viceFightingSince === 'function') ? viceFightingSince(v) : null;
    const elapsed = (since && typeof _calDaysSince === 'function') ? _calDaysSince(since) : 0;
    return Math.max(a, elapsed);
  }, 0);
  const _cameBack = (vices||[]).reduce((a,v) =>
    a + (typeof viceCameBack === 'function' ? viceCameBack(v) : 0), 0);
  if(e('sc-total'))e('sc-total').textContent=_fightMax;
  if(e('sc-total-lbl'))e('sc-total-lbl').textContent = _fightMax === 1 ? 'Day in the fight' : 'Days in the fight';
  if(e('sc-rate'))e('sc-rate').textContent=_cameBack;      // came back, not a win rate
  if(e('sc-fought'))e('sc-fought').textContent=tw;         // urges actually met and turned away
  // For someone who has never slipped, the clean streak IS the length of the fight, so this tile
  // printed the same number the 64px hero prints 15px above it — the screen's two biggest figures
  // reading 106 and 106. A repeated number does not reinforce; it teaches the eye that nothing on the
  // panel is worth reading closely. When it has nothing of its own to add, it says so instead.
  const _streakTile = e('sc-streak') ? e('sc-streak').closest('.sc-met') : null;
  if(e('sc-streak')) e('sc-streak').textContent = str;
  if(_streakTile) _streakTile.style.display = (str === _fightMax) ? 'none' : '';
  const sub=e('sc-sub');if(sub&&tw>0)sub.textContent=tw+' moments you chose who you\'re becoming over who you used to be.';
  const bv=e('score-by-vice');
  if(bv){bv.innerHTML='';vices.forEach(v=>{
    if(v.kind==='letgo')return; // letting-go has a healing goal, not a win-rate
    // THE SAME SHAME, ONE TAP AWAY. v546 took "WIN RATE 0% · 0/15" off the vice card and left the
    // Score panel entirely built on it — so a man 105 days into the fight, who had logged 51 slips
    // honestly, read "0 TOTAL URGES DEFEATED · WIN RATE 0% · 0/51 won · No wins yet" underneath a
    // line telling him every number here is a moment he chose who he is becoming. Moving a bug is
    // not fixing it. This row now says the two things that are true — how often it is happening
    // against last week, and how many times he came back — exactly as the card does.
    const fr = (typeof viceFrequencyRead === 'function') ? viceFrequencyRead(v) : null;
    const back = (typeof viceCameBack === 'function') ? viceCameBack(v) : 0;
    const fightDays = (typeof viceFightDays === 'function') ? viceFightDays(v) : 0;
    const head = fr && fr.direction ? fr.thisWeek + ' this week'
               : fr ? fr.daysLogged + ' logged'
               : (viceCleanDays(v) + 'd clean');
    const headCol = fr && fr.direction === 'down' ? 'var(--gr)'
                  : fr && fr.direction === 'up' ? 'var(--go)' : 'var(--tx2)';
    const meta = [
      fightDays ? ('Day ' + fightDays + ' of the fight') : '',
      back ? ('came back ' + back + (back === 1 ? ' time' : ' times')) : '',
      fr && fr.direction === 'down' ? ('down from ' + fr.lastWeek)
        : fr && fr.direction === 'up' ? ('was ' + fr.lastWeek)
        : fr && fr.direction === 'level' ? 'same as last week' : ''
    ].filter(Boolean).join(' \u00b7 ');
    const row=document.createElement('div');row.className='vsr';
    row.innerHTML='<div class="vsr-top"><span class="vsr-name">'+_escFew(v.n)+'</span>'+
      '<div style="text-align:right"><div class="vsr-pct" style="font-size:15px;color:'+headCol+'">'+head+'</div></div></div>'+
      '<div class="vsr-meta"><span>'+meta+'</span><span>'+(v.lastWin?'Last win: '+new Date(v.lastWin).toLocaleDateString('en-AU',{day:'numeric',month:'short'}):'')+'</span></div>';
    bv.appendChild(row);
  });}
  const ael=e('achievements');
  if(ael){ael.innerHTML='';let earned=0;
    ACHS.forEach(a=>{if(a.check(vices,tw,day,str)){earned++;const el=document.createElement('div');el.className='ach';el.innerHTML='<div class="ach-icon">'+a.icon+'</div><div><div class="ach-title">'+a.title+'</div><div class="ach-desc">'+a.desc+'</div></div>';ael.appendChild(el);}});
    if(!earned)ael.innerHTML='<p style="font-size:13px;color:var(--tx3);text-align:center;padding:16px">Fight your first urge to unlock achievements.</p>';
  }
}

// ── HABITS ────────────────────────────────────────────────────
const DN=['M','T','W','T','F','S','S'];
let habits=[];
function loadH(){
  // One-time migration: remove the redundant "Gratitude logged" habit (now covered by the
  // Morning ritual and Evening check-in). Runs once so it won't undo a user's own re-add.
  // "Gratitude logged" is permanently deprecated (covered by Morning + Evening). Strip it on EVERY
  // load so it can't return via a stale cloud sync, not just once. Migration flag kept for clarity.
  try{
    const raw = localStorage.getItem('totry_h');
    if(raw){
      const arr = JSON.parse(raw);
      if(Array.isArray(arr)){
        const filtered = arr.filter(h => !/^gratitude logged$/i.test((h.n||'').trim()));
        if(filtered.length !== arr.length){ localStorage.setItem('totry_h', JSON.stringify(filtered)); }
      }
    }
  }catch(_){ }
  localStorage.setItem('totry_grat_habit_migrated','1');
  const _hRaw=ls('totry_h');
  habits=Array.isArray(_hRaw)?_hRaw:lsArr('totry_h');
  // Guarantee every habit has a valid 7-day array — AND that habits is a list at all. Dozens of core
  // render paths (the day counter, the home grid, the morning tab) do h.d[i] unguarded, and every one
  // of them is downstream of this array existing: a totry_h that came back as an object made the very
  // next .forEach throw and took renderDayCounter with it. Normalise the container and its contents
  // once, here, so no downstream read can crash.
  let _hFixed=(_hRaw!=null && !Array.isArray(_hRaw));
  habits.forEach(h=>{ if(!h) return; if(!Array.isArray(h.d) || h.d.length!==7){ h.d=[0,0,0,0,0,0,0]; _hFixed=true; } if(h.n==null){ h.n='Habit'; _hFixed=true; } });
  // STAMP THE WEEK. h.d is seven weekday slots with no date on them, and nothing ever cleared it: the
  // only writes of 0 were corruption repair and the sober habit on a relapse day, while autoTickHabits
  // deliberately only ever sets 1. Any habit with no auto-tick rule — i.e. every habit a person adds
  // themselves — kept its ticks forever, so the home page's "last 7 days" grid stopped being a record
  // and became a loop of whatever they once ticked on that weekday. Someone who used the app for two
  // weeks and stopped came back to a fully-ticked week. That is the app flattering exactly the person
  // who most needs the truth — the failure this file names elsewhere as SILENCE IS NOT A STREAK.
  // Zeroing here, on the shared read path, means a multi-week gap resets rather than rolls.
  try{
    const _wk = _habitWeekStamp();
    if(_wk){
      habits.forEach(h=>{ if(!h) return; if(h.w !== _wk){ h.d=[0,0,0,0,0,0,0]; h.w=_wk; _hFixed=true; } });
    }
  }catch(_){ }
  if(_hFixed){ try{ ls('totry_h', habits); }catch(_){ } }
}
function saveH(){ls('totry_h',habits);}
function tIdx(){const d=new Date().getDay();return d===0?6:d-1;}
// The habit ring runs Monday(0) → Sunday(6), per tIdx. Its week stamp MUST roll on the same boundary:
// the existing _currentWeekStamp() is a Sunday-start week number, so using it here would have zeroed
// the ring every Sunday morning and thrown away Monday–Saturday — worse than the staleness it fixes.
// Identifying the week by its Monday's date is unambiguous and survives year boundaries.
function _habitWeekStamp(d){
  try{
    const dt = d ? new Date(d) : new Date();
    dt.setHours(0,0,0,0);
    const dow = dt.getDay();                 // 0=Sun
    dt.setDate(dt.getDate() - (dow===0 ? 6 : dow-1));   // back to Monday
    return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  }catch(_){ return null; }
}
// What this actually measures: consecutive completed days WITHIN the current week. The store is seven
// weekday slots (see loadH), so it cannot see past Monday and cannot exceed 7 — the "never miss twice"
// allowance below is genuinely unreachable across a week boundary. Callers must not present it as an
// all-time streak; they say "this week" instead. A real multi-week streak needs a date-keyed history.
function getStreak(){
  loadH();const ti=tIdx();let s=0;let _g=false;
  // [].every(...) is true, so a person who deleted every habit scored a full phantom week.
  if(!habits.length) return 0;
  for(let i=ti;i>=0;i--){
    // NEVER MISS TWICE: one off day is forgiven; two in a row ends the stretch. The allowance
    // resets on each completed day so every isolated gap is forgiven, not only the first.
    if(habits.slice(0,3).every(h=>h.d[i]===1)){ s++; _g=false; }
    else if(i===ti) continue;                // today still in progress — don't break on it
    else if(!_g){ _g=true; continue; }        // one missed day: forgiven
    else break;                               // two in a row: the stretch ends
  }
  return s;
}
// The spiritual habit, named in the person's own tradition. "Prayer / scripture" was seeded for
// EVERYONE, including the secular default — the sixth instance of this app's most persistent bug class
// (a Christian surface on a default path), and the first one to reach a person's own habit list rather
// than a screen they could walk away from. Written out explicitly rather than assembled from the
// registry's generic fields because these are the names people actually recognise; the same reason
// _sabbathLine() and _nextStepCloseSub() are explicit.
// Does this habit name mean the spiritual practice, in ANY tradition?
//
// autoTickHabits matches habits by NAME through a chain of substring regexes, and renaming the seeded
// habit per tradition (v465) silently walked out of that chain: 'Salah / Qur'an', 'Puja / Gita' and
// 'Meditation / sutta' matched NO branch at all and could never tick, while 'Stillness / reflection'
// matched the EVENING branch and ticked whenever an evening reflection was logged — the wrong rule.
// And getStreak scores habits.slice(0,3), with the spiritual habit at index 2, so for a Muslim, a Hindu
// or a Buddhist the streak could not advance at all. Renaming a thing that is matched by its name is
// exactly the kind of change that looks safe and is not.
function isFaithHabitName(name){
  const n = String(name || '').toLowerCase();
  return /prayer|scripture|salah|qur|puja|gita|sutta|dhikr|japa|meditation|stillness|reflection/.test(n);
}
function faithHabitName(){
  const f = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
  if(f === 'christianity') return 'Prayer / scripture';
  if(f === 'islam')        return 'Salah / Qur\u2019an';
  if(f === 'hinduism')     return 'Puja / Gita';
  if(f === 'buddhism')     return 'Meditation / sutta';
  return 'Stillness / reflection';
}
function initHabits(){
  loadH();
  if(!habits.length){
    habits=[
      {n:'Morning ritual done',d:[0,0,0,0,0,0,0]},
      {n:'No vice today',d:[0,0,0,0,0,0,0]},
      {n:faithHabitName(),d:[0,0,0,0,0,0,0]},
      {n:'Gym session',d:[0,0,0,0,0,0,0]},
      {n:'Hit nutrition goal',d:[0,0,0,0,0,0,0]},
      {n:'Evening check-in',d:[0,0,0,0,0,0,0]},
    ];saveH();
  } else {
    // Repair a list that was already seeded before this fix, but ONLY when it is plainly untouched
    // default: the exact seeded name, never ticked once, and a tradition that does not use it. Someone
    // who kept the habit, renamed it, or ticked it kept their own list exactly as it is.
    try{
      // ANY mismatch, in either direction. The first version only looked for the literal
      // 'Prayer / scripture' and only for a non-Christian — which inverted the original bug for the two
      // FAST doors ("Take me in" / the guest entry), because they skip the faith step entirely:
      // initHabits runs from initApp with no tradition chosen, seeds the SECULAR name, and then a person
      // who later picks Christianity keeps "Stillness / reflection" forever, since the repair was looking
      // for a name they never had. Compare against what the habit SHOULD be called now, not against one
      // specific wrong value — and only when it is plainly untouched default: a seeded faith name, never
      // ticked once. Anyone who renamed it or ticked it keeps their list exactly as it is.
      const want = faithHabitName();
      const SEEDED = ['Prayer / scripture','Salah / Qur\u2019an','Puja / Gita','Meditation / sutta','Stillness / reflection'];
      const i = habits.findIndex(h => h && SEEDED.indexOf((h.n||'').trim()) >= 0
                                  && (h.n||'').trim() !== want
                                  && Array.isArray(h.d) && h.d.every(x => !x));
      if(i >= 0){ habits[i].n = want; saveH(); }
    }catch(_){ }
  }
}

// AUTO-TICK habits based on actual app activity
function autoTickHabits(){
  loadH();
  const ti=tIdx();
  let anyTicked=false;
  // Backfill EACH of the last 7 days from real activity data — not just today. This is why
  // yesterday's synced workout / completed reflection now correctly shows ticked.
  // Bounded to THIS WEEK (off <= ti). h.d is seven slots for the current Monday->Sunday week, and
  // since the weekly zeroing landed that is literally true. Backfilling a rolling 7 CALENDAR days into
  // it wrapped: on a Tuesday (ti=1), three days ago is last Saturday, and ((1-3)%7+7)%7 = 5 = THIS
  // Saturday — a day that has not happened yet. So last week's workout ticked a future day, the home
  // grid drew it as done, and getStreak counted it. Only days from this Monday to today can be backfilled.
  const dayList = [];
  for(let off=0; off<=ti; off++){
    const d = new Date(Date.now() - off*86400000);
    // dayStart is carried so a branch can ask WHEN a day was, not only what it is called — the clean
    // -day tick below has to refuse days that precede the fight itself.
    const _ds = new Date(d); _ds.setHours(0,0,0,0);
    dayList.push({ dateStr: d.toLocaleDateString('en-AU'), idx: ((ti - off) % 7 + 7) % 7, dayStart: _ds.getTime() });
  }
  // Determine the nutrition-goal direction once (lose = stay under, gain = hit/over, else hit).
  // Was reading totry_goal_intent, which nothing writes — so neither branch below could ever match and
  // the "hit nutrition goal" habit auto-ticked on the wrong rule for anyone cutting or gaining.
  const nutGoalIntent = (typeof _goalDir==='function') ? _goalDir() : (ls('totry_calorie_goal_type')||'').toLowerCase();
  loadV();
  const allMornings = ls('totry_mornings')||[];
  const allEvenings = ls('totry_evenings')||[];
  const allWorkouts = ls('totry_workouts')||[];
  const allStrava = ls('totry_strava_activities')||[];
  const allJournal = ls('totry_journal')||[];
  const allSaved = ls('totry_sv')||[];
  const nutLog = ls('totry_nutlog')||{};
  const nutGoals = ls('totry_nut_goals')||{};

  habits.forEach((h,hi)=>{
    const name=h.n.toLowerCase();
    dayList.forEach(({dateStr, idx, dayStart})=>{
      let shouldTick=false;
      if(/gratitude/.test(name)){
        // Gratitude habit: ticks when the morning's gratitude field was actually filled that day.
        shouldTick = allMornings.some(m=>m.ts && new Date(m.ts).toLocaleDateString('en-AU')===dateStr && (m.gratitude||'').trim());
      } else if(/morning|intention/.test(name) || (isFaithHabitName(name) && !/evening|night/.test(name))){
        shouldTick = allMornings.some(m=>m.ts && new Date(m.ts).toLocaleDateString('en-AU')===dateStr);
      } else if(/workout|gym|train|lift|exercise/.test(name)){
        shouldTick = allWorkouts.some(w=>w.date===dateStr || (w.ts && new Date(w.ts).toLocaleDateString('en-AU')===dateStr))
                  || allStrava.some(a=>a.date && new Date(a.date).toLocaleDateString('en-AU')===dateStr);
      } else if(/evening|wind down|night|reflect/.test(name)){
        shouldTick = allEvenings.some(e=>e.ts && new Date(e.ts).toLocaleDateString('en-AU')===dateStr);
      } else if(/journal|write|diary/.test(name)){
        shouldTick = allJournal.some(j=>j.ts && new Date(j.ts).toLocaleDateString('en-AU')===dateStr);
      } else if(/nutrition|macro|protein|calorie|eat|under|target/.test(name)){
        // Direction-aware: lose → stayed UNDER calorie target; gain → hit protein/over; else → logged + hit protein.
        const entries = nutLog[dateStr] || [];
        if(entries.length && nutGoals.cal){
          const cals = entries.reduce((a,e)=>a+(e.cal||0),0);
          const pro = entries.reduce((a,e)=>a+(e.pro||0),0);
          if(nutGoalIntent==='lose'){ shouldTick = cals>0 && cals <= nutGoals.cal; }
          else if(nutGoalIntent==='gain'||nutGoalIntent==='build'){ shouldTick = pro >= (nutGoals.pro||0)*0.9; }
          else { shouldTick = cals>0 && pro >= (nutGoals.pro||0)*0.9; }
        }
      } else if(/sober|clean|no urge|abstain|won|fight|no vice/.test(name)){
        // Check ALL relapse history (not just lastLoss) for a loss on this day.
        const lossThatDay = vices.some(v=>{
          if(v.lastLoss && new Date(v.lastLoss).toLocaleDateString('en-AU')===dateStr) return true;
          return (v.relapseHistory||[]).some(r=>r.date && new Date(r.date).toLocaleDateString('en-AU')===dateStr);
        });
        // Every day without a logged loss is a clean win. But if a loss WAS logged this day,
        // actively UN-tick it (this is the one habit that can flip true→false on the same day).
        if(lossThatDay){ if(h.d[idx]===1){ h.d[idx]=0; anyTicked=true; } return; }
        // A CLEAN DAY YOU WERE NOT HERE FOR IS NOT A CLEAN DAY. `vices.length>0` ticked every day the
        // backfill walked, with no lower bound — so a person who signed up on a Sunday and named one
        // thing to fight opened the app to a full week of ✓✓✓✓✓✓✓ and "6/6 this week" for days that
        // happened before they had an account, while the Fight tab beside it correctly read "0 days
        // clean". It also satisfied the first-run checklist's "any d[] slot is 1" test, so "Add your
        // first habits" arrived pre-ticked. The app's first act was to hand someone a week they had
        // not lived. Every other branch here requires evidence ON that day; this one now requires at
        // least that the day was theirs — on or after the journey start, and on or after the fight
        // they are being credited for.
        const _startTs = (function(){
          try{ const st = ls('totry_start'); const t = st ? new Date(st).getTime() : NaN;
               return isNaN(t) ? null : t; }catch(_){ return null; }
        })();
        const _liveVice = vices.some(function(v){
          if(!v) return false;
          const vs = v.fightingSince || v.startDate;
          const t = vs ? new Date(vs).getTime() : NaN;
          return isNaN(t) ? true : (dayStart >= new Date(new Date(t).setHours(0,0,0,0)).getTime());
        });
        const _afterStart = (_startTs == null) || (dayStart >= new Date(new Date(_startTs).setHours(0,0,0,0)).getTime());
        shouldTick = vices.length>0 && _liveVice && _afterStart;
      } else if(/bible|scripture|verse|word|read/.test(name)){
        shouldTick = allSaved.some(v=>v.date===dateStr || (v.ts && new Date(v.ts).toLocaleDateString('en-AU')===dateStr));
      } else if(/water|hydrate/.test(name)){
        const water=(typeof waterMlOn==='function')?waterMlOn(dateStr):0;
        const goal=(typeof waterBaseGoal==='function')?waterBaseGoal():2500;   // both in ml now
        shouldTick = water>0 && water>=goal;
      }
      // Re-assert directly from live data every time (idempotent). This prevents the
      // "habits disappear after sync" desync — auto-tick ADDS based on real activity and
      // never depends on a stale log. Manual ticks (set elsewhere) are preserved because
      // we only ever set to 1 here, never back to 0.
      if(shouldTick && h.d[idx]!==1){
        h.d[idx]=1; anyTicked=true;
      }
    });
  });
  if(anyTicked) saveH();
  return;
  // ─── legacy single-day logic below (unreachable) ───
  
  habits.forEach((h,hi)=>{
    const name=h.n.toLowerCase();
    let shouldTick=false;
    
    // Check various habit patterns
    // Mutually exclusive (else-if): the FIRST matching category wins, so a habit named
    // "evening reflection" matches evening only — it won't also trip the journal rule.
    if(/morning|gratitude|intention/.test(name) || (isFaithHabitName(name) && !/evening|night/.test(name))){
      const mornings=ls('totry_mornings')||[];
      shouldTick=mornings.some(m=>new Date(m.ts).toLocaleDateString('en-AU')===today);
    }
    else if(/workout|gym|train|lift|exercise/.test(name)){
      const workouts=ls('totry_workouts')||[];
      shouldTick=workouts.some(w=>w.date===today || (w.ts && new Date(w.ts).toLocaleDateString('en-AU')===today));
    }
    else if(/evening|wind down|night|reflect/.test(name)){
      const evenings=ls('totry_evenings')||[];
      shouldTick=evenings.some(e=>new Date(e.ts).toLocaleDateString('en-AU')===today);
    }
    else if(/journal|write|diary/.test(name)){
      const journals=ls('totry_journal')||[];
      shouldTick=journals.some(j=>new Date(j.ts).toLocaleDateString('en-AU')===today);
    }
    else if(/sober|clean|no urge|abstain|won|fight/.test(name)){
      // Check vices for losses today
      loadV();
      const losses=vices.filter(v=>v.lastLoss && new Date(v.lastLoss).toLocaleDateString('en-AU')===today);
      shouldTick=losses.length===0 && (vices.some(v=>(v.w||0)>0) || vices.length>0);
    }
    else if(/bible|scripture|verse|word|read/.test(name)){
      const saved=ls('totry_sv')||[];
      shouldTick=saved.some(v=>v.date===today || (v.ts && new Date(v.ts).toLocaleDateString('en-AU')===today));
    }
    else if(/water|hydrate/.test(name)){
      const water=(typeof waterMlOn==='function')?waterMlOn(today):0;
      const goal=(typeof waterBaseGoal==='function')?waterBaseGoal():2500;     // both in ml now
      shouldTick=water>0 && water>=goal;
    }
    else if(/check.?in|mood|energy/.test(name)){
      shouldTick=ls('totry_checkin_last')===today;
    }
    
    // Only auto-tick ONCE per habit per day. After that the user owns the box —
    // if they deliberately untick it, we don't fight them by re-ticking on next render.
    const stamp = today + '#' + hi;
    const autoLog = ls('totry_autotick_log') || {};
    if(shouldTick && h.d[ti]!==1 && !autoLog[stamp]){
      h.d[ti]=1;
      autoLog[stamp]=1;
      ls('totry_autotick_log', autoLog);
      anyTicked=true;
    } else if(shouldTick && !autoLog[stamp]){
      // first time seeing it already done by the user — record so we never re-touch
      autoLog[stamp]=1;
      ls('totry_autotick_log', autoLog);
    }
  });
  
  if(anyTicked){
    saveH();
  }
}

// Orphan renderer kept as a safe delegate — old callers route to the unified home renderer
function renderHabits(){
  if(typeof renderHomeHabits === 'function') renderHomeHabits();
  // Update header counts that still exist
  loadH();
  const ti = tIdx();
  let done = 0;
  habits.forEach(h => { if(h.d[ti] === 1) done++; });
  const s = getStreak();
  const hs = document.getElementById('h-streak'); if(hs) hs.textContent = s;
  const hh = document.getElementById('h-habits'); if(hh) hh.textContent = done + '/' + habits.length;
  const hsc = document.getElementById('h-score'); if(hsc) hsc.textContent = done + '/' + habits.length + ' today';
}
// ── HABIT ANCHORING ("after I ___, I will ___") ───────────────────────────────────────────────
// The SAME mechanic as the Feeling Door's if-then plans (getIfThen/saveIfThen, line ~10445 —
// Gollwitzer/Sheeran, 94 studies, d≈0.65), pointed at habits instead of feelings. Habits here were
// named as OUTCOMES ("Gym session") with no cue, so they wait on motivation. Stored as h.a on the
// existing habit object (totry_h) — optional, guarded everywhere, no migration.
const _ANCHOR_IDEAS=['I make my coffee','I brush my teeth','I get out of bed','I log dinner','I get home','I finish work','I put my phone on charge'];
function habitAnchor(h){ return (h && typeof h.a==='string' && h.a.trim()) ? h.a.trim() : ''; }
function openHabitAnchor(hi){
  loadH(); const h=habits[hi]; if(!h) return;
  const cur=habitAnchor(h);
  const chips=_ANCHOR_IDEAS.map(function(a){
    return '<button type="button" class="qb" style="margin:0 6px 6px 0" onclick="var e=document.getElementById(\'hab-anchor\');if(e)e.value=this.textContent">'+a+'</button>';
  }).join('');
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center"><div class="modal-handle"></div>'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px">Anchor it to something you already do</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);line-height:1.3;margin-bottom:6px">After I\u2026 I will '+_escFew(h.n).toLowerCase()+'.</div>'+
    '<div style="font-size:12px;color:var(--tx3);line-height:1.55;margin-bottom:14px">A habit with no cue waits on motivation, and motivation doesn\u2019t show up daily. Tied to something already in your day, it just happens. Same move as the plans you lock in at the Feeling Door \u2014 decide it now, while you\u2019re clear.</div>'+
    '<input type="text" id="hab-anchor" maxlength="70" placeholder="e.g. I make my coffee" value="'+_escFew(cur)+'" style="font-size:16px;padding:12px;margin-bottom:10px">'+
    // The target was write-once at creation. Someone who typed it wrong, or left it blank and then
    // found their week being measured against days that merely passed, had no way back to it short of
    // deleting the habit and its ticks. This row is the habit's own editor, opened from the very line
    // that reads "3 of 3 this week", so it is where the target belongs.
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:6px">Days a week you are aiming for</div>'+
    '<input type="number" id="hab-pw" min="1" max="7" placeholder="blank for most days" value="'+((h.pw>=1&&h.pw<=7)?h.pw:'')+'" style="font-size:16px;padding:12px;margin-bottom:14px">'+
    '<div style="display:flex;flex-wrap:wrap;justify-content:center;margin-bottom:14px">'+chips+'</div>'+
    '<button class="btn primary" style="margin-bottom:8px" onclick="saveHabitAnchor('+hi+')">Lock in my anchor</button>'+
    (cur?'<button class="btn" onclick="clearHabitAnchor('+hi+')" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-bottom:4px">Remove the anchor</button>':'')+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  setTimeout(function(){ const t=document.getElementById('hab-anchor'); if(t) t.focus(); },60);
  if(typeof haptic==='function') haptic('tap');
}
function _anchorRefresh(){
  try{ if(typeof renderHomeHabits==='function') renderHomeHabits(); }catch(_){}
  try{ if(typeof renderEveningHabitTickList==='function') renderEveningHabitTickList(); }catch(_){}
  try{ if(typeof syncToCloud==='function') syncToCloud(); }catch(_){}
}
function saveHabitAnchor(hi){
  const el=document.getElementById('hab-anchor');
  const val=((el&&el.value)||'').trim().slice(0,70);
  if(!val){ if(typeof showToast==='function') showToast('Empty','Name one thing you already do every day.'); return; }
  // The target rides with the anchor — one sheet, one save. Blank clears it back to "most days".
  const _pwEl=document.getElementById('hab-pw');
  const _pwRaw=((_pwEl&&_pwEl.value)||'').trim();
  if(_pwRaw && !(Number(_pwRaw)>=1 && Number(_pwRaw)<=7)){
    if(typeof showToast==='function') showToast('Days a week','A number from 1 to 7, or leave it blank for most days.');
    return;
  }
  loadH(); if(!habits[hi]) return;
  habits[hi].a=val;
  if(_pwRaw) habits[hi].pw=Math.round(Number(_pwRaw)); else delete habits[hi].pw;
  saveH();
  document.querySelector('.modal-bg.open')?.remove();
  _anchorRefresh();
  try{ if(typeof logEvent==='function') logEvent('habit_anchor',{}); }catch(_){}
  if(typeof haptic==='function') haptic('success');
  if(typeof showToast==='function') showToast('Anchored','After you '+_escFew(val)+' \u2014 that\u2019s the cue. I\u2019ll show it with the habit.');
}
function clearHabitAnchor(hi){
  loadH(); if(!habits[hi]) return;
  delete habits[hi].a; saveH();
  document.querySelector('.modal-bg.open')?.remove();
  _anchorRefresh();
  if(typeof haptic==='function') haptic('light');
}
// Habits were uncreatable. addHabit() was never called from anywhere (refcount 1) and its first line
// read #new-habit — an id that has never existed in this file — so even a wired-up button would have
// thrown a TypeError. No rename, no delete, no other path. A new user landed on "Today's habits", saw
// "No habits yet. Add them in Settings", went to Settings, and found nothing. The daily action the whole
// home page is built around could not be started.
// pw = how many days a week this one is FOR. Without it every habit was measured against the days
// that had simply elapsed — "3/5 this week" to someone who lifts three times a week and had done all
// three. A planned rest day read as a miss, which is the shame-by-default this app exists not to do.
// Absent means "most days", which is what the copy has always promised, so nothing existing changes.
function addHabit(name, perWeek){
  const n = String(name==null ? '' : name).trim().slice(0,60);
  if(!n) return false;
  loadH();
  if(habits.some(function(h){ return h && String(h.n).toLowerCase()===n.toLowerCase(); })) return 'dupe';
  const pw = Math.round(Number(perWeek));
  habits.push(Object.assign({n:n, d:[0,0,0,0,0,0,0]}, (pw >= 1 && pw <= 7) ? {pw:pw} : {}));
  saveH();
  try{ if(typeof syncToCloud==='function') syncToCloud('totry_h', habits); }catch(_){}
  renderHabits();
  return true;
}
function openAddHabit(){
  if(typeof openFormModal!=='function') return;
  openFormModal('Add a habit',
    'One small thing you want to be true of you most days. Keep it small enough that a bad day can still hold it.',
    [{id:'habit', label:'The habit', placeholder:'e.g. Read 10 pages · Walk after dinner · Pray before bed'},
     {id:'perweek', label:'Days a week you are aiming for', type:'number',
      placeholder:'leave blank for most days'}],
    'Add it',
    function(vals){
      // "3-4", "every day" and "10" all parsed to something outside 1-7 and were thrown away without a
      // word — the modal closed, "Added" appeared, and the habit was quietly measured against elapsed
      // days instead of the target the person had just typed. Blank still means "most days", which is
      // what the placeholder promises; a number that cannot be a week is worth one sentence.
      const _pwRaw = String(vals.perweek == null ? '' : vals.perweek).trim();
      if(_pwRaw && !(Number(_pwRaw) >= 1 && Number(_pwRaw) <= 7))
        return 'Days a week needs to be a number from 1 to 7 \u2014 or leave it blank for most days.';
      const r = addHabit(vals.habit, vals.perweek);
      if(r === 'dupe') return 'That one is already on your list.';
      if(!r) return 'Give it a name first.';
      // The first-run checklist asked "have you added your first habits?" by testing whether the
      // habits array was non-empty — and the app seeds six of them before the person arrives, so the
      // step was ticked on a brand-new install. A checklist that congratulates you for work you have
      // not done teaches you to ignore it. This flag means THEY did something.
      try{ ls('totry_habits_touched', true); }catch(_){}
      try{ if(typeof haptic==='function') haptic('success'); }catch(_){}
      try{ showToast('Added','It shows up on your home from today.'); }catch(_){}
      return true;
    });
}
async function deleteHabit(i){
  loadH();
  const h = habits[i]; if(!h) return;
  if(!(await askConfirm('Remove "'+String(h.n)+'"?\n\nYour ticks for it are removed too. This only takes it off your list \u2014 it is not a failure.'))) return;
  habits.splice(i,1);
  saveH();
  try{ if(typeof syncToCloud==='function') syncToCloud('totry_h', habits); }catch(_){}
  try{ if(typeof haptic==='function') haptic('tap'); }catch(_){}
  try{ showToast('Removed','One less thing to carry.'); }catch(_){}
  renderHabits();
}
function openManageHabits(){
  loadH();
  const m=document.createElement('div'); m.className='modal-bg open';
  const rows = habits.length
    ? habits.map(function(h,i){
        return '<div style="display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--bd)">'+
          '<div style="flex:1;font-size:14px;color:var(--tx)">'+_escFew(h.n)+'</div>'+
          '<button onclick="closeModal(this);deleteHabit('+i+')" style="background:none;border:none;color:var(--tx3);font-size:12px;cursor:pointer;padding:6px 8px">Remove</button>'+
        '</div>';
      }).join('')
    : '<div class="empty-note">Nothing on your list yet.</div>';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<h3 style="margin-bottom:4px">Your habits</h3>'+
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:12px;line-height:1.55">Small and few beats long and forgotten. Removing one is a choice, not a failure.</p>'+
    rows+
    '<button class="btn primary" style="margin-top:14px;margin-bottom:8px" onclick="closeModal(this);openAddHabit()">+ Add a habit</button>'+
    '<button class="btn" onclick="closeModal(this)">Done</button></div>';
  document.body.appendChild(m);
}

