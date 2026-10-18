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
  const today = dayKeyOf();
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
      const _trained = (typeof getUnifiedTraining==='function') && getUnifiedTraining().some(t=>t.ts && dayKeyOf(t.ts)===today);
      if(_r && _r.level === 'rest' && !_trained && hour >= 7 && hour < 20){
        return { text:'Your body needs rest today', sub:'Recovery is low \u2014 go gentle. Mobility or a walk, not a max effort.', action:'mobility' };
      }
    }
  }catch(_){ }
  // 1. Morning ritual not done yet today?
  const morningToday = ritualLog('totry_mornings').some(m=>m.ts && dayKeyOf(m.ts)===today);
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
  const trainedToday = (typeof getUnifiedTraining==='function') && getUnifiedTraining().some(t=>t.ts && dayKeyOf(t.ts)===today);
  if(!trainedToday && hour >= 10 && hour < 21){
    return { text:'Log today\u2019s training', sub:'A workout, a walk, anything you did.', softenOk:true, action:'train' };
  }
  // 3. Evening: examen / reflection not done?
  if(hour >= 17){
    const examenToday = (ls('totry_examens')||[]).some(e=>e.ts && dayKeyOf(e.ts)===today);
    const eveningToday = ritualLog('totry_evenings').some(e=>e.ts && dayKeyOf(e.ts)===today);
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
      const sameDay = ts => ts && dayKeyOf(ts) === today;
      if((ls('totry_prayers')||[]).some(p => p && (sameDay(p.createdAt) || sameDay(p.ts)))) return true;
      if((ls('totry_examens')||[]).some(e => e && sameDay(e.ts))) return true;
      if((ls('totry_rosaries')||[]).some(r => r && (sameDay(r.ts) || sameDay(r.date)))) return true;
      // Every tradition's counted practice, not only the Catholic one: dhikr, japa, mettā, stillness.
      // Without this the app kept asking a Muslim to pray on a day he had finished the whole tasbih.
      if((ls('totry_practices')||[]).some(p => p && sameDay(p.ts))) return true;
      const m = ritualLog('totry_mornings')[0];
      if(m && sameDay(m.ts) && (m.intention || m.gratitude)) return true;
      return false;
    }catch(_){ return false; }
  })();
  if(!prayedToday && hour < 17){
    // Was hardcoded Christian and shown to every tradition, secular included — the single most
    // prominent line on Home, telling someone who chose "Secular / None" to pray.
    const _pv = (typeof faithPrayVerb==='function') ? faithPrayVerb() : 'pray';
    const _wp = (typeof faithWordPhrase==='function') ? faithWordPhrase() : 'a word';
    const _pt = (typeof faithPrayTo==='function') ? faithPrayTo() : null;
    const _cap = _wp.charAt(0).toUpperCase() + _wp.slice(1);
    return { text:'Take a moment to ' + _pv,
             sub:_cap + ' for today' + (_pt ? ', and a moment with ' + _pt : '') + '.',
             action:'soul' };
  }
  // 5. Everything core is done — unless a habit is still open, which the card further down the
  //    same screen says out loud. The hero read "You've done today's work" at 325px while
  //    "1 habit still open today" sat at 764px. Same person, same scroll, opposite claims. Counted
  //    exactly as 32-presence.js:531 counts it, so the two cannot drift apart again.
  try{
    if(typeof loadH === 'function') loadH();
    const _ti = (typeof tIdx === 'function') ? tIdx() : -1;
    const _open = (typeof habits !== 'undefined' && Array.isArray(habits) && _ti >= 0)
      ? habits.filter(h => !(h.d && h.d[_ti] === 1)) : [];
    if(_open.length){
      return { text: _open.length === 1 ? 'One habit still open' : _open.length + ' habits still open',
               sub: _open.length === 1 ? _open[0].n + ' \u2014 tick it tonight, or let it go with grace.'
                                       : 'Tick what you did tonight. A miss is feedback, not failure.',
               action:'reflect' };
    }
  }catch(_){ }
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
// ── The tab intros step back once they are no longer needed ────────────────────
// Every tab opened with its title and then a grey paragraph explaining what the tab is FOR. Eleven
// of them, 1,660 characters, and they reprinted on EVERY visit — so measured on a populated app,
// Settings was 69% explanatory prose above the fold, Track 56%, Coach 46%. That is what a demo
// looks like: software still introducing itself to someone who has used it for months.
//
// The fix is NOT to delete the voice. That voice is the product, and a person opening Money for the
// first time genuinely needs to be told what this app thinks money is for. The fix is that it stops
// once it has been heard: the orientation stays for anybody who has nothing on that tab yet, and
// steps back the moment they have something of their own there.
//
// It fails OPEN. Any error, any unknown key, any empty answer and the paragraph stays — over-
// explaining is a much smaller sin than leaving someone on a blank screen with no idea what it is.
function tabIntroHasContent(what){
  try{
    const n = k => { const v = ls(k); return Array.isArray(v) ? v.length
                     : (v && typeof v === 'object') ? Object.keys(v).length : 0; };
    switch(what){
      case 'soul':      return n('totry_prayers') > 0 || n('totry_journal') > 0 || n('totry_letters') > 0;
      case 'body':      return n('totry_body') > 0 || n('totry_measurements') > 0 || n('totry_progress_photos') > 0;
      case 'train':     return n('totry_workouts') > 0 || n('totry_routines') > 0;
      case 'money':     { const f = ls('totry_f'); return (f && Array.isArray(f.d) && f.d.length > 0)
                                 || n('totry_bills') > 0 || n('totry_transactions') > 0 || n('totry_subscriptions') > 0; }
      case 'scripture': return n('totry_sv') > 0 || n('totry_reading_plan') > 0;
      case 'coach':     return n('totry_coach_thread') > 0 || n('totry_syntheses') > 0;
      // Settings earns its sentence differently: it is not about having DATA there, it is about
      // having been there. Once someone has changed anything at all, they know what it is.
      case 'settings':  return !!ls('totry_theme') || !!ls('totry_weight_unit') || !!ls('totry_currency')
                                 || n('totry_push_prefs') > 0;
    }
  }catch(_){ }
  return false;
}
function applyTabIntroDisclosure(){
  try{
    document.querySelectorAll('[data-intro-for]').forEach(function(el){
      const what = el.getAttribute('data-intro-for');
      if(tabIntroHasContent(what)){
        // Remember what it said. Nothing here destroys copy — "Show me what this is" in Settings
        // puts every one of them back, and so does an empty tab.
        if(el.style.display !== 'none'){ el.dataset._introHidden = '1'; el.style.display = 'none'; }
      } else if(el.dataset._introHidden === '1'){
        delete el.dataset._introHidden; el.style.display = '';
      }
    });
  }catch(_){ }
}

function applyHomeProgressiveDisclosure(){
  try{
    // HOW LONG THEY HAVE HAD THE APP, NOT WHAT THEIR COUNTER SAYS. getDayCount() honours the
    // "Begin again — Day 1" reset in Settings, which is about their journey, not their familiarity
    // with the app. So someone who had used ToTry for eight months and chose to start again had the
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
  const today=dayKeyOf(); const h=new Date().getHours();
  const dOn=(x)=>{ try{ return dayKeyOf(x.ts||x.createdAt||x.date||0)===today; }catch(_){ return false; } };
  // BODY — trained + fuel today
  const t=s.training||{}, n=s.nutrition||{}; const bodyBits=[];
  // A ROW VALUE THAT TRUNCATES HAS LOST THE NUMBER. iosRow truncates rather than wraps — which is
  // right for a TITLE and wrong for a value, because the thing cut off is the fact. With one bit
  // this fit; with two ("3 sessions this wk · 607 cal left") it rendered "3 sessions this wk · 6…"
  // on a 6.9" phone, which is the widest screen there is. So the qualifier goes when there is a
  // second bit to make room for: the row is already headed Body and sits under a weekly spine.
  if(t.sessions7>0) bodyBits.push(t.sessions7+' session'+(t.sessions7===1?'':'s'));
  const goalCal=((typeof todaysNutGoals==='function')?todaysNutGoals():(ls('totry_nut_goals')||{})).cal;
  // Gentle mode is someone saying "do not show me calorie numbers" — often because counting them is
  // part of what is hurting them. The Nourish tab honours it; Home did not, so the first thing they
  // saw on opening the app was "1,247 cal left". Same words the diary uses, so the two agree.
  if(typeof nutGentle==='function' && nutGentle()){
    if(n.todayCal>0 && typeof _gentleWord==='function') bodyBits.push(_gentleWord(n.todayCal, goalCal).w.toLowerCase());
  }
  else if(n.todayCal!=null && goalCal) bodyBits.push(Math.max(0,goalCal-n.todayCal).toLocaleString()+' cal left');
  else if(n.todayCal>0) bodyBits.push(n.todayCal.toLocaleString()+' cal today');
  // AN EMPTY ROW IS NOT A FAILED ROW. For a brand-new person three of these four said the same
  // thing in three different words — "no fight named yet", "not logged yet", "not tracked yet" —
  // so the surface built to deliver "they saw their whole life in one place" read as a scorecard
  // of absences on the one day it matters most. Same four states, said as readiness: this row's
  // neighbour already says "Morning open", which is the register.
  // ONE FACT PER ROW. Joining two with a dot does not fit and never did: shortening the words got
  // "3 sessions · 625 cal l…" instead of "3 sessions this wk · 6…", which is the same defect with
  // fewer characters. iosRow truncates rather than wraps, so a second fact does not cost space —
  // it costs the FIRST fact's number. The row takes the one about TODAY where there is one, and
  // the week belongs to the footer, which already says it without competing for the same 120px.
  const bodyTxt = bodyBits.length ? bodyBits[bodyBits.length-1] : 'Open';
  // THE FIGHT — clean streak (quit) or holding the line (moderate)
  const vs=(s.fight&&s.fight.vices)||[]; let fightTxt;
  if(!vs.length) fightTxt='Yours to name';
  else { const q=vs.filter(v=>viceIsAbstinence(v)); if(q.length){ const mc=Math.max.apply(null,q.map(v=>v.cleanDays||0));
    // "0 days clean", sixty seconds after naming your first fight, directly under a vice card
    // that says "Day 1 of the fight". Two surfaces, one person, opposite arithmetic \u2014 and the one
    // that greets them is the discouraging one. Zero full days HAVE passed, so the number is not
    // wrong; it is the wrong thing to say. Day one is where everybody starts, and where anybody
    // who slips returns.
    fightTxt = mc === 0 ? 'day one' : plural(mc,'day')+' clean'; } else { const lg=vs.filter(v=>v.kind==='letgo'); /* v.cleanDays is null for a letting-go goal BY DESIGN: viceCleanDays() refuses to count clean days for something that has no unclean ones. So `|| 0` printed 'letting go, day 0' forever — on day 1 and day 42 alike — while the vice card said '41 days of choosing yourself'. renderHomeQuickWins already counts this correctly from startDate; same sum here. */ const lgDay=lg.length?Math.max.apply(null,lg.map(function(v){ return v.letGoDays || 0; })):0; fightTxt = lg.length ? (lgDay>0 ? 'letting go, day '+lgDay : 'letting go') : 'holding your line'; } }
  // SPIRIT — the daily rhythm. A row VALUE states a value: iOS puts "On" and "Automatic" in this
  // slot, never an instruction. Its neighbours here say "30 days clean", "825 cal left", "$6,350
  // debt" — states — and this one said "set your intention", a lowercase imperative asking for the
  // third time on one screen for something the hero's own button already asks for. Same four
  // states, said as states, and "day closed ✓" loses the typed check: a character borrowed from a
  // font is not this app's icon language, and the row is a door, not a checkbox.
  const mornDone=ritualLog('totry_mornings').some(dOn); const evenDone=ritualLog('totry_evenings').some(dOn);
  const spiritTxt = evenDone?'Day closed' : mornDone?'Morning kept' : (h<15?'Morning open':'Evening open');
  // MONEY
  const m=s.money||{}; const moneyBits=[];
  // Same overflow: "$217 reclaimed · $6,350 debt" truncated to "$217 reclaimed · $6,…". Debt is
  // the number a person in debt is actually tracking, so when both exist the shorter word wins
  // and the full figures both survive.
  if(m.reclaimed>0) moneyBits.push(curSym()+m.reclaimed.toLocaleString()+(m.hasDebt?' back':' reclaimed'));
  if(m.hasDebt) moneyBits.push(curSym()+m.totalDebt.toLocaleString()+' debt');
  // Same: "$217 back · $6,350 …" lost the debt figure, which is the number somebody in debt is
  // actually tracking. Debt wins when there is debt; what staying clean put back is the Money
  // front's own hero and says it in full there.
  const moneyTxt = moneyBits.length ? moneyBits[moneyBits.length-1] : 'Yours to set up';
  // Four grouped rows, built from the components rather than painted here. The hand-rolled version
  // gave the label a fixed 66px, so "The fight" — the row this app exists for — broke across two
  // lines under its own value on every phone. A row cell is one line that truncates; the component
  // knows that and no call site has to remember it.
  const rows=[
    iosRow({icon:'shield',tone:'blue',title:'The fight',value:fightTxt,onclick:"go('fight')"}),
    // Teal, not green: this row's value is body data (a weigh-in and what is left to eat), which is
    // the tone Grow's own Track row carries. Green is food, and it was carrying four meanings at once.
    iosRow({icon:'dumbbell',tone:'teal',title:'Body',value:bodyTxt,onclick:"go('grow')"}),
    iosRow({icon:'flame',tone:'orange',title:'Spirit',value:spiritTxt,onclick:"go('soul')"}),
    iosRow({icon:'wallet',tone:'indigo',title:'Money',value:moneyTxt,onclick:"go('money')"})
  ];
  // The one number this app is proud of: not time spent here, but times you left better. Earned (≥3),
  // never shown at zero — the anti-engagement metric made quietly visible. (totry_releases)
  const rc=(typeof releaseCount==='function')?releaseCount():0;
  // FOUR ROWS THAT NEVER TOUCH ARE FOUR APPS IN A LIST. "Integration IS the product" is this app's
  // own soul statement and this is the surface that is supposed to show it — and every value here
  // was computed independently, with no sentence anywhere that exists BECAUSE two fronts are both
  // true. The footer carries one now, and it is only ever said when it is earned.
  const _cleanBest = (function(){ try{
    const q = vs.filter(function(v){ return viceIsAbstinence(v); });
    return q.length ? Math.max.apply(null, q.map(function(v){ return v.cleanDays||0; })) : 0;
  }catch(_){ return 0; } })();
  // A DEFAULT IS NOT SOMETHING THEY DID. `bodyBits` is non-empty for a brand-new person because a
  // calorie GOAL exists ("2,100 cal left") before they have logged anything — caught by screenshotting
  // the real first-run Home, where the day-one footer never appeared. Count a front as live only on
  // something the person actually did.
  const _live = [vs.length>0, (t.sessions7>0 || n.todayCal>0), (mornDone||evenDone), moneyBits.length>0]
                  .filter(Boolean).length;
  const _sess = t.sessions7||0;
  let _footer = '';
  if(rc>=3) _footer = rc+' times, you came here and walked back into your life.';
  // Nothing anywhere: day one. Say what this IS, rather than four things it is not.
  else if(_live===0) _footer = 'It fills in as you go — one thing today is enough.';
  // A cross-front fact: true only because two fronts are both true, which is the whole claim.
  else if(_sess>0 && _cleanBest>0)
    _footer = plural(_sess,'session')+' this week, and you were clean through every one.';
  else if(_sess>0 && (n.todayCal!=null && n.todayCal>0))
    _footer = 'You trained today, and you fuelled it.';
  else if(_cleanBest>0 && (mornDone||evenDone))
    _footer = plural(_cleanBest,'day')+' clean, and you kept today\u2019s rhythm.';
  box.innerHTML=iosList(rows,{header:'Your life, woven', footer:_footer});
}
function renderHomeGreeting(){
  const hiEl = document.getElementById('home-greeting-hi');
  const subEl = document.getElementById('home-greeting-sub');
  const actEl = document.getElementById('home-greeting-action');
  if(!hiEl || !subEl || !actEl) return;
  const name = ls('totry_name') || '';
  const h = new Date().getHours();
  const today = dayKeyOf();
  const didMorning = ritualLog('totry_mornings').some(m => m.ts && dayKeyOf(m.ts)===today);
  const didEvening = ritualLog('totry_evenings').some(e => e.ts && dayKeyOf(e.ts)===today);

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
  try{ const idEl=document.getElementById('hero-identity-text'); const row=document.getElementById('hero-identity'); const identity=ls('totry_identity'); if(idEl){ if(identity){ let _t=identity.replace(/^I am\s+/i,'').trim(); _t=_t.charAt(0).toUpperCase()+_t.slice(1);   // stripping "I am" left a lowercase fragment in italic serif under the greeting; a capital makes it a line rather than a truncation
    idEl.textContent = _t; if(row) row.style.display=''; } else { idEl.textContent=''; if(row) row.style.display='none'; } } }catch(_){}
  hiEl.textContent = hi;
  // Honor the man's chosen faith intensity — 'light' surfaces the daily verse more gently. The verse
  // has its own section now, so hide the SECTION: hiding only the pill left its header stranded over
  // nothing — a caps label introducing empty space, which is the shape this rebuild is removing.
  try{ const vs=document.getElementById('home-verse-section') || document.querySelector('.hero-verse');
    if(vs) vs.style.display = (faithLevel()==='light') ? 'none' : ''; }catch(_){}
  subEl.textContent = sub;
  // display:'' , not 'block': .btn is a flex box that centres its own label, and forcing it to block
  // would drop the centring and start the label at the left edge — the trap this codebase has already
  // met from the other side (`text-align:left` on a flex .btn doing nothing).
  if(actLabel){ actEl.style.display=''; actEl.textContent = actLabel; actEl.dataset.act = actType; }
  else { actEl.style.display='none'; }
}
function homeGreetingAction(){
  const actEl = document.getElementById('home-greeting-action');
  const t = actEl ? actEl.dataset.act : '';
  if(t==='morning') go('morning');
  else if(t==='evening') go('reflect'); // the evening ritual lives in tab-reflect ("close the day"); go('evening') was a dead-end
  else if(t==='companion'){ if(typeof openCompanionForUrge==='function') openCompanionForUrge(); }
}

// The hero's button names the ACT ('morning' / 'evening' / 'companion'); the next step names the
// ACTION it runs ('morning' / 'reflect' / …). These two pairs are the same room by different names —
// the evening ritual lives in tab-reflect — and they are the only two that can collide. Declared
// above its one reader, because in one shared top-level scope a const has a temporal dead zone.
const _HERO_ACT = { morning:'morning', reflect:'evening' };
function renderNextStep(){
  const el = document.getElementById('next-step-anchor');
  if(!el) return;
  // The row lives in a grouped section with its own header, so hiding the ROW alone would leave a
  // "NEXT" label sitting over an empty list. Hide the section; the row's own display stays in step.
  const sec = document.getElementById('next-step-section');
  const _hide = () => { el.style.display='none'; if(sec) sec.style.display='none'; };
  // Don't compete with the first-run card for brand-new users.
  if(!ls('totry_firstrun_dismissed') && getDayCount() <= 3){ _hide(); return; }
  const step = getNextStep();
  // TWO ASKS FOR ONE ACT. The hero's filled button and this row resolved to the same room — "Begin
  // the morning" 24pt above "Start your morning", both go('morning') — and the softening subtitle
  // ("just this one thing for now") sat under the SECOND copy of the first thing. 32-presence.js
  // dedupes its own card against the hero for exactly this reason, in _heroAlreadyAsks: "two buttons
  // to the same room is not emphasis". This row never asked. The hero keeps the ask because it is
  // above the fold; NEXT appears when the hero is hidden or is asking for something else.
  if(typeof _heroAlreadyAsks === 'function' && _heroAlreadyAsks(_HERO_ACT[step.action])){ _hide(); return; }
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
  if(sec) sec.style.display = '';
}
// Count the open daily loops (used only to soften the framing on heavy days — never to nag).
function _countOpenLoops(){
  const today = dayKeyOf();
  let open = 0;
  try{
    if(!ritualLog('totry_mornings').some(m=>m.ts && dayKeyOf(m.ts)===today)) open++;
    if(!ritualLog('totry_evenings').some(e=>e.ts && dayKeyOf(e.ts)===today)) open++;
    if(typeof loadH==='function'){ loadH(); const ti=(typeof tIdx==='function')?tIdx():0; const undone=(typeof habits!=='undefined'&&Array.isArray(habits))?habits.filter(h=>h.d&&h.d[ti]!==1).length:0; if(undone>0) open++; }
    const trained = (typeof getUnifiedTraining==='function') && getUnifiedTraining().some(t=>t.ts && dayKeyOf(t.ts)===today);
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
  // The two scores and the instructions are a stat pair ABOVE the card and a footnote BELOW it now,
  // so the card holds only the grid. Both are hidden until there is something to put in them.
  const sumBox = document.getElementById('home-habit-summary');
  const noteBox = document.getElementById('home-habit-note');
  if(sumBox){ sumBox.innerHTML=''; sumBox.style.display='none'; }
  if(noteBox){ noteBox.textContent=''; noteBox.style.display='none'; }

  if(!habits.length){
    // Used to read "Add them in Settings" — there is no habit UI in Settings, so this sent every new
    // user looking for something that does not exist. Now it offers the thing directly, in the
    // standard empty state rather than a hand-centred block at an improvised size.
    list.innerHTML = '<div class="ios-empty">'+svgIcon('target',44)+
      '<div class="ios-empty-title">No habits yet</div>'+
      '<div class="ios-empty-body">Pick one small thing you want to be true of you most days.</div>'+
    '</div><button class="btn primary" onclick="openAddHabit()">Add your first habit</button>';
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
  // DAYS WE CAN ACTUALLY SPEAK TO: ones that have happened this week AND that the person has had
  // the app for. Counting from Monday alone graded days before they installed — someone who signed
  // up on a Saturday met a card reading "0/5 perfect" and six rows of "0/5 this week", a verdict on
  // five days they had never seen. getDayCount() is 1 on the first day, so this is 0 then, and the
  // card falls to its own "starts today" / "day one" copy.
  const _daysHere = (typeof getDayCount === 'function') ? Math.max(0, getDayCount() - 1) : 6;
  // ...but never argue with their own data. A tick on an earlier day this week is proof they were
  // here for it, whatever the install date says — a restored backup, a reinstall, a device clock
  // that moved. Clamping on getDayCount() alone told someone with three sessions logged this week
  // that it was their first day.
  let _tickedBack = 0;
  for(let off = 1; off <= Math.min(6, ti); off++){
    if(habits.some(h => cellFor(h, off))) _tickedBack = off;
  }
  const knowable = Math.min(6, ti, Math.max(_daysHere, _tickedBack));
  // Counted INCLUSIVE of today, because the seven cells beside these captions include today. The
  // loops started at off=1 while the row rendered a tick for off=0, so every caption sat exactly
  // one behind its own ticks: "5/5 this week" printed next to six green cells.
  const elapsed = knowable + 1;
  // A HABIT WITH A WEEKLY TARGET CANNOT MAKE A DAY IMPERFECT. v565 taught the habit ROW about h.pw and
  // stopped there, so someone who lifts three times a week and has hit all three read "2/4 perfect" in
  // 18px at the top of this card while the row 40px below it said "3 of 3 \u2713". One week, measured two
  // ways, and the headline is the one that judges. A day a target habit is not due is not a failure, so
  // only genuinely daily habits can decide whether a day was perfect.
  const _isDaily = h => !(h && h.pw >= 1 && h.pw <= 6);
  const _dailyHabits = habits.filter(_isDaily);
  for(let off = 0; off <= knowable; off++){
    if(_dailyHabits.length && _dailyHabits.every(h => cellFor(h, off))) pastPerfect++;
  }
  // And when EVERY habit is a weekly target there are no perfect days to count — "0/4 perfect" would be
  // a verdict on a week the person may be winning. Measure the week itself instead.
  const _weeklyOnly = !_dailyHabits.length && habits.length > 0;
  let _wkHits = 0, _wkTarget = 0;
  if(_weeklyOnly) habits.forEach(h => {
    _wkTarget += h.pw;
    for(let off = 0; off <= knowable; off++) if(cellFor(h, off)) _wkHits++;
  });
  const todayDone = habits.filter(h => cellFor(h, 0)).length;
  const todayTotal = habits.length;
  
  // THE SCORES ARE STAT TILES, NOT A PANEL INSIDE THE CARD. This was a --bg3 box nested inside the
  // habit card \u2014 a card inside a card \u2014 with the two labels in one grey and the two numbers in two
  // different greys, the right-hand one wearing a DOTTED UNDERLINE to suggest it could be tapped.
  // They are the same tiles Money and Grow use, on the ground above the card, and the tappable one
  // says so in the tint, which is how iOS says it.
  const summary = sumBox || list;
  summary.innerHTML =
    '<div class="ios-stat">' +
      '<div class="ios-stat-label">' + (knowable ? 'This week so far' : 'This week') + '</div>' +
      '<div class="ios-stat-value" style="font-size:22px">' +
        (knowable
          ? (_weeklyOnly ? (_wkHits + ' of ' + _wkTarget + ' this week' + (_wkHits >= _wkTarget ? ' \u2713' : ''))
                         : (pastPerfect + '/' + elapsed + ' perfect'))
          : 'starts today') + '</div>' +
    '</div>' +
    '<div class="ios-stat" style="cursor:pointer" id="home-habit-today">' +
      '<div class="ios-stat-label">Today so far</div>' +
      '<div class="ios-stat-value" style="font-size:22px;color:var(--go)">' + todayDone + '/' + todayTotal + '</div>' +
    '</div>';
  if(sumBox) sumBox.style.display = '';
  // This card counted the day and offered no way to move it. The grid is deliberately read-only
  // (ticking belongs to the evening, where it is one step of closing the day) \u2014 but "0/3" with no
  // route is a scoreboard with no game. The score itself is now the door to the tick list.
  const _todayTile = summary.querySelector('#home-habit-today');
  if(_todayTile) _todayTile.onclick = function(){
    if(typeof go !== 'function') return;
    go('reflect');
    // go('reflect') lands on evening step 0 — the mood question — and the tick boxes are on step 3,
    // so "tap today's score to tick them off" put the person three taps from any tick box. Land on
    // the step that actually HOLDS the list, found at runtime rather than hardcoded, because the
    // evening's step anchors have been renumbered before and a magic 3 would rot silently.
    let _tries = 0;
    const _land = function(){
      const tl = document.getElementById('evening-habit-tick-list');
      const holder = tl && tl.closest ? tl.closest('[data-mstep]') : null;
      const n = holder ? parseInt(holder.getAttribute('data-mstep'), 10) : NaN;
      if(isFinite(n) && typeof eveningStep === 'function'){ eveningStep(n); return; }
      if(++_tries < 12) setTimeout(_land, 90);   // the flow renders on a timeout after go()
    };
    setTimeout(_land, 120);
  };
  
  // Day-letter row across the top
  const headerRow = document.createElement('div');
  // The name column used to be 1 of 8 EQUAL columns, which on a 375px iPhone left it 36px wide — so
  // every habit rendered as "Mor…", "No v…", "Pra…" and the grid became unreadable at a glance. The day
  // cells only ever hold a tick or a dot, so they are clamped small and the name takes what is left.
  headerRow.style.cssText = 'display:grid;grid-template-columns:minmax(84px,1.6fr) repeat(7,minmax(16px,22px));gap:3px;align-items:center;margin-bottom:4px;padding:0;max-width:100%';
  headerRow.innerHTML = '<div></div>' + dayLabels.map(d =>
    '<div style="font-family:var(--font-text);font-size:13px;text-align:center;color:' + (d.isToday ? 'var(--go)' : 'var(--tx3)') + '">' + d.letter + '</div>'
  ).join('');
  list.appendChild(headerRow);
  
  // Each habit as a row: name on left, last 7 day cells on right (oldest left, today right)
  habits.forEach((h, hi) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:minmax(84px,1.6fr) repeat(7,minmax(16px,22px));gap:3px;align-items:center;padding:10px 0;border-top:.5px solid var(--bd);max-width:100%';
    
    // Past 6 days hit count for at-a-glance pattern
    let pastHits = 0;
    for(let off = 0; off <= knowable; off++) if(cellFor(h, off)) pastHits++;
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
    // The name carried a DOTTED UNDERLINE to advertise its tap, and its two sub-lines sat at 11px in
    // two different colours. The name is a plain row title; both sub-lines are the one 13pt footnote
    // size, and the tap is advertised the way iOS advertises one \u2014 the anchor line in the tint.
    nameCell.innerHTML =
      '<div style="font-size:17px;letter-spacing:-0.006em;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">' + _escFew(h.n) + '</div>' +
      (_anc
        ? '<div style="font-family:var(--font-text);font-size:13px;color:var(--go);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">after ' + _escFew(_anc) + '</div>'
        : (!window.__anchorHintShown ? (window.__anchorHintShown = true, '<div style="font-family:var(--font-text);font-size:13px;color:var(--go);margin-top:1px">Anchor it to a cue</div>') : '')) +
      '<div style="font-family:var(--font-text);font-size:13px;color:' + pastColor + ';margin-top:1px">' + (knowable ? ((_pw ? (_weekHits + ' of ' + _pw + (_weekHits >= _pw ? ' \u2713' : '')) : (pastHits + '/' + elapsed)) + ' this week') : 'day one') + '</div>';
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
      
      // FILLED OR EMPTY, NEVER DOTTED. Each state here was a different BORDER — dotted for no record,
      // dashed for today, solid green for done — so one row of seven days read as four kinds of sketch
      // outline, which is as generated-looking as this screen gets. A day is a dot: filled when it
      // happened, an empty recess when it did not, a tint ring on today. And the mark inside was set
      // in "DM Mono, monospace", a family this app does not ship — every one of these cells has been
      // rendering in the browser's own Courier.
      if(unknown){
        bg = 'transparent';
        border = '0';
        color = 'var(--tx3)';
        mark = '\u2013';                       // en dash: no record, not a miss
      } else if(done){
        bg = isToday ? 'var(--go)' : 'var(--gr)';
        border = '0';
        color = 'var(--on-tint)';
        mark = '✓';
      } else if(isToday){
        bg = 'var(--fill2)';
        border = '1.5px solid var(--go)';
        color = 'var(--go)';
        mark = '';
      } else {
        bg = 'var(--fill2)';
        border = '0';
        color = 'var(--tx3)';
        mark = '';
      }

      cell.style.cssText =
        'width:100%;max-width:26px;aspect-ratio:1/1;min-height:24px;margin:0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
        'font-family:var(--font-rounded);font-size:13px;font-weight:600;box-sizing:border-box;' +
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
  
  // THE INSTRUCTIONS ARE A FOOTNOTE, NOT A STRIP. This was three separate instructions joined by
  // middots, centred, at 11px, inside the card \u2014 the "Manage \u00b7 edit \u00b7 remove" shape that reads as
  // generated wherever it appears. Two sentences, at the one footnote size, outside the card, where
  // iOS puts the note that explains a grouped section.
  if(noteBox){
    noteBox.textContent = 'Tap a name to anchor it to something you already do. Tap today\u2019s score to tick them off \u2014 the last six days run to the left.';
    noteBox.style.display = '';
  }
}


// One-tap vice win straight from home — logs a win for a specific vice without
// needing to navigate to Fight, select the vice, then tap. The most common daily action.
