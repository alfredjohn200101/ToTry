// ── SETTINGS ──────────────────────────────────────────────────
function initSettingsTab(){
  try{ if(typeof renderLockRow==='function') renderLockRow(); }catch(_){}
  // One source of truth for this copy — see RAFFLE_ACTIVE.
  try{ const _rl=document.getElementById('feedback-raffle-line'); if(_rl && typeof _raffleCopy==='function') _rl.textContent=_raffleCopy('card'); }catch(_){}
  // Honest beta framing on web only — inside the native app it's not a beta, so hide it.
  // Same gate, same reason as the support card below: what is fine on the web is a 3.1.1 problem in
  // the App Store build.
  try{ const sc=document.getElementById('support-card'); if(sc) sc.style.display = (typeof isNativeApp==='function' && isNativeApp()) ? 'none' : ''; }catch(_){}
  try{ const bn=document.getElementById('beta-web-note'); if(bn) bn.style.display = (typeof Notify!=='undefined' && Notify.isNative()) ? 'none' : 'block'; }catch(_){}
  // Reflect the CURRENT faith level when Settings opens — it was only highlighted on click, so on
  // open neither option looked selected (that's the "faith level looks messed up"). Now it's clear.
  try{ const fl=(typeof faithLevel==='function')?faithLevel():'full'; document.querySelectorAll('.faith-opt').forEach(b=>{ const on=b.dataset.faith===fl; b.style.borderColor=on?'var(--go)':'var(--bd)'; b.style.background=on?'rgba(200,169,110,0.10)':'var(--bg3)'; }); }catch(_){}
  try{ const tr=(typeof faithTradition==='function')?faithTradition():'secular'; document.querySelectorAll('.faithtr-opt').forEach(b=>{ const on=b.dataset.tr===tr; b.style.borderColor=on?'var(--go)':'var(--bd)'; b.style.background=on?'rgba(200,169,110,0.10)':'var(--bg3)'; }); }catch(_){}
  const n=document.getElementById('settings-name-display');if(n)n.textContent=ls('totry_name')||'Not set';
  // Signed-in email — was stuck on "Loading..." because nothing populated it.
  const emailEl=document.getElementById('settings-email-display');
  if(emailEl){
    if(currentUser && currentUser.email){ emailEl.textContent = currentUser.email; }
    else if(sb && sb.auth){
      emailEl.textContent = 'Not signed in';
      sb.auth.getSession().then(({data})=>{
        if(data && data.session && data.session.user){ currentUser = data.session.user; emailEl.textContent = data.session.user.email; }
      }).catch(()=>{ emailEl.textContent = 'Not signed in'; });
    } else { emailEl.textContent = 'Not signed in'; }
  }
  const s=document.getElementById('settings-start-date');
  if(s){
    const override=ls('totry_journey_start');
    const st=override||ls('totry_start');
    if(st){
      s.textContent=new Date(st).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+(override?' (custom)':'');
    }
  }
  const dc=document.getElementById('settings-day-count');if(dc)dc.textContent='Day '+getDayCount();
  try{ renderAffirmList(); }catch(e){ console.warn('[settings] renderAffirmList', e); }
  try{ renderWinsLog(); }catch(e){ console.warn('[settings] renderWinsLog', e); }
  try{ const strat=ls('totry_debt_strategy')||'snowball';setDebtStrategy(strat); }catch(e){ console.warn('[settings] setDebtStrategy', e); }
  
  // Load preferences into selects
  const curSel = document.getElementById('settings-currency');
  if(curSel) curSel.value = ls('totry_currency') || 'AUD';
  const wuSel = document.getElementById('settings-weight-unit');
  if(wuSel) wuSel.value = ls('totry_weight_unit') || 'kg';
  const duSel = document.getElementById('settings-distance-unit');
  if(duSel) duSel.value = ls('totry_distance_unit') || 'km';
  const themeSel = document.getElementById('settings-theme');
  if(themeSel) themeSel.value = ls('totry_theme') || 'dark';
  const tzSel = document.getElementById('settings-timezone');
  if(tzSel) tzSel.value = ls('totry_timezone') || 'auto';
  
  // Populate year-review dropdown
  const yrSel = document.getElementById('year-review-select');
  if(yrSel){
    const startYear = new Date(ls('totry_start') || Date.now()).getFullYear();
    const currentYear = new Date().getFullYear();
    yrSel.innerHTML = '';
    for(let y = currentYear; y >= startYear; y--){
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yrSel.appendChild(opt);
    }
  }
  
  // Reminder times live in totry_push_prefs and are rendered by the reminders card itself
  // (renderPushSetting → #push-time-morning / #push-time-evening, saved by savePushTimes). This used to
  // restore them from `totry_reminder_times` — a key nothing has ever written — into #notif-morning /
  // #notif-evening, ids that were replaced when that card became dynamic. Both reads were guarded, so it
  // silently did nothing; the harm was the false trail it left about where a person's times are kept.
  
  // Apply theme on load
  applyTheme(ls('totry_theme') || 'dark');
  if(typeof updateSynthesisCount === 'function') updateSynthesisCount();
  if(typeof renderActivityHeatmap === 'function') renderActivityHeatmap();
  
  // Dev-only: show usage stats card ONLY for the developer account.
  // Hard gate — even if init runs before currentUser loads, default is hidden.
  if(typeof checkDevPanelVisibility === 'function') checkDevPanelVisibility();
}

// Dev panel gate — called on every settings open AND on auth state change
function checkDevPanelVisibility(){
  // +studio is a plus-address: it delivers to the same inbox but is a DIFFERENT To Try account with
  // no real data in it. That is the account tutorials get filmed on, so a real vice, a real debt
  // figure or a real journal entry can never end up in a frame.
  const DEV_EMAILS = ['alfredjohn200101@gmail.com','alfredjohn200101@yahoo.com','alfredjohn200101+studio@gmail.com'];
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const usageCard = document.getElementById('usage-stats-card');
  const demoCard = document.getElementById('demo-mode-card');
  const isDev = userEmail && DEV_EMAILS.includes(userEmail);
  if(usageCard){
    usageCard.style.display = isDev ? 'block' : 'none';
    if(isDev && typeof renderUsageStats === 'function') renderUsageStats();
  }
  if(demoCard){ demoCard.style.display = isDev ? 'block' : 'none'; }
  const modCard = document.getElementById('moderation-card');
  if(modCard){
    modCard.style.display = isDev ? 'block' : 'none';
    if(isDev && typeof loadPendingSubmissions === 'function') loadPendingSubmissions();
  }
}
// ── DEMO DATA SEED (for the dedicated test/recording account) ─
// Writes a content-grade, "relatable struggle, winning now" dataset into THIS account so every
// screen is camera-ready. No backup/restore — meant for a dedicated test account that holds it.
// Persona: ~90 days in, heavy early slips, clean and climbing now; weight trending down; varied
// training; debt shrinking; net worth rising. Built to look alive and aspirational-but-believable.
// \u2500\u2500 DEMO MODE SAFETY \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// The dev panel is gated by DEV_EMAILS \u2014 which is Alfy's REAL account, because it has to be. So the
// "Load demo data" button appears while he is signed in as himself, one confirm away from replacing
// ninety-odd days of his own life with a persona called Alex. The old note said "no swap/restore,
// meant for a dedicated test account", but nothing enforced that, and the failure is unrecoverable:
// local data gone, and then pullFromCloud MERGES the demo values with his real cloud rows (arrays
// union, newer scalars win) and the next edit pushes the franken-state back up.
//
// So demo mode is now reversible and cannot touch the cloud:
//   1. snapshot every key locally BEFORE writing anything, and download a JSON backup as well
//   2. hard-disable sync for the duration, so no fake row can ever reach his account
//   3. an unmissable banner, because the real danger is forgetting which data you are looking at
//   4. one tap to put his real life back
const DEMO_SNAP = 'totry_demo_snapshot';
const DEMO_FLAG = 'totry_demo_mode';
function inDemoMode(){ try{ return localStorage.getItem(DEMO_FLAG)==='1'; }catch(_){ return false; } }
function _demoSnapshot(){
  try{
    const snap={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(typeof k==='string' && k.indexOf('totry_')===0 && k!==DEMO_SNAP && k!==DEMO_FLAG){
        snap[k]=localStorage.getItem(k);
      }
    }
    localStorage.setItem(DEMO_SNAP, JSON.stringify(snap));
    return Object.keys(snap).length;
  }catch(_){ return -1; }
}
function exitDemoMode(){
  if(!inDemoMode()){ showToast('Not in demo mode','Nothing to restore.'); return; }
  if(!confirm('Restore your real data and clear the demo dataset?')) return;
  try{
    const raw=localStorage.getItem(DEMO_SNAP);
    const snap=raw?JSON.parse(raw):null;
    if(!snap){ alert('The snapshot is missing \u2014 NOT clearing anything, so nothing else can be lost. Restore from your downloaded backup file instead (Settings \u2192 Your data \u2192 Restore).'); return; }
    // Remove demo keys, then put the real ones back exactly as they were.
    const kill=[];
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i);
      if(typeof k==='string' && k.indexOf('totry_')===0 && k!==DEMO_SNAP && k!==DEMO_FLAG) kill.push(k); }
    kill.forEach(k=>{ try{ localStorage.removeItem(k); }catch(_){} });
    Object.keys(snap).forEach(k=>{ try{ localStorage.setItem(k, snap[k]); }catch(_){} });
    localStorage.removeItem(DEMO_SNAP);
    localStorage.removeItem(DEMO_FLAG);
    try{ const _h=document.querySelector('.hdr'); if(_h) _h.style.paddingTop = _h.dataset._padWas || '';
         const _b=document.getElementById('demo-mode-banner'); if(_b) _b.remove(); }catch(_){}
    try{ syncEnabled = true; }catch(_){}
    showToast('Your data is back','Demo dataset cleared and syncing again. Reloading.');
    setTimeout(function(){ location.reload(); }, 900);
  }catch(e){ alert('Restore failed: '+(e&&e.message||e)+'\n\nNothing was cleared. Use your downloaded backup file.'); }
}
function _demoBanner(){
  try{
    let b=document.getElementById('demo-mode-banner');
    if(!inDemoMode()){ if(b) b.remove(); return; }
    if(!b){
      b=document.createElement('div'); b.id='demo-mode-banner';
      b.style.cssText='position:fixed;left:0;right:0;top:0;z-index:99999;background:#7a2e2e;color:#fff;'+
        'font-family:DM Mono,monospace;font-size:9px;letter-spacing:0.07em;text-transform:uppercase;'+
        'padding:6px 10px;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 2px 14px rgba(0,0,0,.4)';
      b.innerHTML='<span>\ud83c\udfac Demo data \u00b7 sync off</span>'+
        '<button onclick="exitDemoMode()" style="background:#fff;color:#7a2e2e;border:none;border-radius:100px;'+
        'padding:4px 10px;font-family:inherit;font-size:9px;text-transform:uppercase;letter-spacing:0.07em;cursor:pointer;white-space:nowrap">Restore</button>';
      document.body.appendChild(b);
      // Give the header enough top padding to clear the banner, so it never clips the wordmark or the
      // day counter — both in shot on almost every tutorial. It has to be the HEADER and not the body:
      // .app is a fixed 100dvh flex column, so padding the body would just push the tab bar off-screen.
      try{
        const h=document.querySelector('.hdr');
        if(h){ const bh=Math.ceil(b.getBoundingClientRect().height);
               h.dataset._padWas = h.style.paddingTop || '';
               h.style.paddingTop = 'calc(var(--st) + 14px + '+bh+'px)'; }
      }catch(_){}
    }
  }catch(_){}
}

function loadDemoData(){
  if(inDemoMode()){ showToast('Already in demo mode','Restore your real data first (red bar at the bottom).'); return; }
  if(!confirm('Load the camera-ready demo dataset?\n\nYour real data is snapshotted first and a backup file is downloaded, syncing is switched OFF so nothing fake can reach your account, and one tap puts everything back.\n\nContinue?')) return;
  // Belt: the in-browser snapshot. Braces: a file on disk, in case the browser store is ever cleared.
  const n=_demoSnapshot();
  if(n < 0){ alert('Could not snapshot your current data, so I have not touched anything. Nothing was changed.'); return; }
  try{ if(typeof exportFullBackup==='function') exportFullBackup(); }catch(_){}
  try{ syncEnabled = false; }catch(_){}                 // nothing fake may ever reach the cloud
  try{ localStorage.setItem(DEMO_FLAG,'1'); }catch(_){}
  const now = new Date();
  const iso = d => d.toISOString();
  const dayAgo = n => new Date(now.getTime() - n*86400000);
  const auKey = d => d.toLocaleDateString('en-AU');
  // Identity / journey (~92 days in)
  ls('totry_name','Alex');
  ls('totry_identity','I am becoming a person who keeps their promises, even to themselves.');
  ls('totry_why','For my future family, and the man I know God made me to be.');
  ls('totry_season','Building');
  ls('totry_journey_start', iso(dayAgo(92)));
  ls('totry_start', iso(dayAgo(92)));
  ls('totry_onboarded', true);
  ls('totry_firstrun_dismissed', true);
  ls('totry_partner', true);
  // Vices: the comeback. Lust — long clean streak now, but real slips early. Doomscroll — recovering.
  ls('totry_v',[
    {n:'Lust',t:'Late nights, alone, phone in hand',w:54,total:54,relapseCount:7,startDate:iso(dayAgo(23)),lastWin:iso(dayAgo(0)),urgelog:[]},
    {n:'Doomscrolling',t:'First thing in the morning, in bed',w:38,total:38,relapseCount:11,startDate:iso(dayAgo(4)),lastWin:iso(dayAgo(0)),urgelog:[]},
  ]);
  ls('totry_ms',['d7','d14','d30','d60','w1','w10','w25','w50']); // milestones already earned
  // Habits — strong recent week
  ls('totry_h',[
    {n:'Morning ritual done',d:[1,1,1,1,1,0,1]},
    {n:'No vice today',d:[1,1,1,0,1,1,1]},
    {n:'Prayer / scripture',d:[1,1,0,1,1,1,1]},
    {n:'Gym session',d:[1,0,1,1,0,1,1]},
    {n:'Hit nutrition goal',d:[1,1,1,0,1,1,1]},
    {n:'Evening check-in',d:[1,1,1,1,0,1,1]},
  ]);
  // Training — varied, recent, so the unified card + pace trend both fire on camera.
  const W = [];
  // 5 indoor walks getting FASTER over 3 weeks (pace trend: improving)
  [ [21,60,3000,104],[18,58,3050,103],[15,56,3000,101],[12,54,3000,100],[1,52,3050,99] ].forEach((x,i)=>{
    W.push({id:'demo_w'+i,source:'manual',type:'Indoor Walk',durationMinutes:x[1],distance:x[2],calories:Math.round(x[2]*0.115),averageHeartRate:x[3],exercises:[],ts:iso(dayAgo(x[0]))});
  });
  W.push({id:'demo_c1',source:'manual',type:'Indoor Cycle',durationMinutes:30,calories:405,averageHeartRate:128,exercises:[],ts:iso(dayAgo(0))});
  W.push({id:'demo_p1',source:'hevy',type:'Push Day',splitFocus:'Push',exercises:[{name:'Bench Press'},{name:'Overhead Press'},{name:'Dips'}],volume:4350,completedSets:16,durationMinutes:58,ts:iso(dayAgo(1))});
  W.push({id:'demo_pl1',source:'hevy',type:'Pull Day',splitFocus:'Pull',exercises:[{name:'Deadlift'},{name:'Rows'},{name:'Pulldowns'}],volume:5100,completedSets:15,durationMinutes:61,ts:iso(dayAgo(3))});
  W.push({id:'demo_l1',source:'hevy',type:'Leg Day',splitFocus:'Legs',exercises:[{name:'Squat'},{name:'RDL'},{name:'Leg Press'}],volume:6200,completedSets:14,durationMinutes:64,ts:iso(dayAgo(5))});
  ls('totry_workouts', W);
  ls('totry_calorie_burns',{[auKey(dayAgo(0))]:405,[auKey(dayAgo(1))]:351,[auKey(dayAgo(12))]:345});
  // Weight — visibly down over the journey
  ls('totry_body',[
    {date:auKey(dayAgo(0)),ts:iso(dayAgo(0)),weight:82.1,bf:0},
    {date:auKey(dayAgo(10)),ts:iso(dayAgo(10)),weight:83.4,bf:0},
    {date:auKey(dayAgo(24)),ts:iso(dayAgo(24)),weight:84.9,bf:0},
    {date:auKey(dayAgo(45)),ts:iso(dayAgo(45)),weight:86.7,bf:0},
    {date:auKey(dayAgo(70)),ts:iso(dayAgo(70)),weight:88.5,bf:0},
    {date:auKey(dayAgo(90)),ts:iso(dayAgo(90)),weight:90.2,bf:0},
  ]);
  ls('totry_body_goal', 80);
  ls('totry_height', 180);
  // Money — debt shrinking, net worth climbing, family target met, honest poker
  ls('totry_f',{d:[{n:'Credit card',t:4000,p:2600,due:''},{n:'Car loan',t:12000,p:5200,due:''}], u:0, i:0});
  ls('totry_payments',[{amt:300,ts:iso(dayAgo(5)),date:iso(dayAgo(5)),debt:'Credit card'},{amt:250,ts:iso(dayAgo(20)),date:iso(dayAgo(20)),debt:'Car loan'},{amt:300,ts:iso(dayAgo(35)),date:iso(dayAgo(35)),debt:'Credit card'}]);
  ls('totry_bills',[{id:1,name:'Rent',amount:1800,due:iso(dayAgo(-9)),paid:false},{id:2,name:'Gym',amount:60,due:iso(dayAgo(-3)),paid:false}]);
  ls('totry_budgets',{'Food':600,'Going out':300});
  ls('totry_assets',[{id:1,name:'Savings',value:8400},{id:2,name:'Super',value:21000},{id:3,name:'Car',value:9000}]);
  ls('totry_family_contrib',[{id:1,amount:500,note:'monthly help',date:iso(dayAgo(2))},{id:2,amount:500,note:'monthly help',date:iso(dayAgo(33))},{id:3,amount:200,note:'groceries',date:iso(dayAgo(48))}]);
  ls('totry_family_target',{amount:500,dueDay:1});
  ls('totry_poker_sessions',[{id:1,buyin:100,cashout:285,net:185,note:'home game',date:iso(dayAgo(6))},{id:2,buyin:150,cashout:0,net:-150,note:'casino',date:iso(dayAgo(19))},{id:3,buyin:100,cashout:140,net:40,note:'home game',date:iso(dayAgo(40))}]);
  // Reflections that read well on camera
  ls('totry_mornings',[
    {ts:iso(dayAgo(0)),gratitude:'Woke up before the alarm. Clear head. Grateful for another clean morning.',intention:'Train legs, stay off the phone till after prayer, be present with family tonight.'},
    {ts:iso(dayAgo(1)),gratitude:'A hard conversation that went better than I feared.',intention:'Lead with patience today.'},
  ]);
  ls('totry_evenings',[{date:dayAgo(0).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'}),day:92,rating:4,win:'Said no to the late-night scroll and read instead.',release:'The frustration from work — handing it over.',tasks:['Call mum','Meal prep'],ts:iso(dayAgo(0))}]);
  ls('totry_examens',[
    {ts:iso(dayAgo(0)),answers:['Grateful for discipline today','Felt God in the quiet this morning','I was impatient at lunch','Tomorrow: more patience, less reaction','Lord, thank you for carrying me this far']},
    {ts:iso(dayAgo(1)),answers:['Grateful for my family','Noticed peace after prayer','Slipped on the phone before bed','Tomorrow: phone out of the bedroom','Help me keep this promise']},
  ]);
  ls('totry_journal',[{ts:iso(dayAgo(0)),text:'92 days ago I couldn\u2019t go three days. Today the streak feels normal. Not because it\u2019s easy \u2014 because I stopped doing it alone.'}]);
  ls('totry_prayers',[{ts:iso(dayAgo(1)),text:'For patience with the people I love, and strength to keep the promises I\u2019ve made.'}]);

  // \u2500\u2500 EVERYTHING BUILT SINCE THIS SEEDER WAS WRITTEN \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // The dataset above stopped at v~250 and covered 30 keys. Twenty-three were missing, and the
  // omissions were exactly the features worth filming \u2014 most painfully totry_nutlog, so the food
  // diary, the most visual screen in the whole app, recorded as an empty plate. A tutorial of an
  // empty feature is worse than no tutorial. Everything below exists so every tab films alive.

  // FOOD \u2014 14 days of real meals, so the diary, the macro rings, the by-meal split, the weekly
  // digest, adaptive TDEE and "copy yesterday" all have something to show.
  (function(){
    const MEALS=[
      [['Greek yoghurt, berries, honey',320,24,38,6,'1 bowl','breakfast'],['Chicken, rice, broccoli',620,52,68,12,'1 plate','lunch'],['Salmon, potatoes, salad',680,46,52,28,'1 plate','dinner'],['Protein shake',180,30,6,2,'1 scoop','snack']],
      [['Three eggs on sourdough',420,26,32,20,'2 slices','breakfast'],['Beef burrito bowl',740,48,72,26,'1 bowl','lunch'],['Stir-fry with tofu',560,32,64,18,'1 plate','dinner'],['Apple and peanut butter',210,7,24,11,'1 serve','snack']],
      [['Oats, banana, whey',480,34,66,9,'1 bowl','breakfast'],['Tuna salad wrap',520,42,44,18,'1 wrap','lunch'],['Roast chicken and veg',700,58,48,26,'1 plate','dinner']],
    ];
    const log={};
    for(let i=0;i<14;i++){
      const d=dayAgo(i); const k=auKey(d); const set=MEALS[i%MEALS.length];
      log[k]=set.map(function(m,j){
        const t=new Date(d); t.setHours(8+j*4, 15, 0, 0);
        return {id:'demo_f'+i+'_'+j, name:m[0], cal:m[1], pro:m[2], carb:m[3], fat:m[4],
                serving:m[5], qty:1, meal:m[6], ts:t.toISOString()};
      });
    }
    ls('totry_nutlog', log);
  })();
  ls('totry_nut_goals',{cal:2600,pro:180});
  ls('totry_nut_macros',{carb:280,fat:80});
  ls('totry_water',{[auKey(dayAgo(0))]:2100});
  ls('totry_water_goal',3000);
  ls('totry_recent_foods',[
    {name:'Chicken breast',cal:165,pro:31,carb:0,fat:3.6,serving:'100g'},
    {name:'Jasmine rice, cooked',cal:130,pro:2.7,carb:28,fat:0.3,serving:'100g'},
    {name:'Whey protein',cal:120,pro:24,carb:3,fat:1.5,serving:'1 scoop'},
  ]);

  // THE FIGHT'S REAL HISTORY \u2014 this is what teaches the risk window, the hard hour, the patterns
  // panel and the reach-out. Without it every pattern surface says "not enough logged moments yet".
  (function(){
    const fl=[]; const TRIG=['bored','tired','alone','stressed','scrolling in bed'];
    for(let i=1;i<=40;i++){
      const d=dayAgo(i);
      d.setHours(i%4===0?23:(i%3===0?22:21), 20, 0, 0);          // clusters at night \u2192 a learnable window
      fl.push({vice:'Lust', ts:iso(d), won:(i%5!==0), trigger:TRIG[i%TRIG.length]});
    }
    for(let i=1;i<=18;i++){
      const d=dayAgo(i); d.setHours(7,10,0,0);                    // morning-in-bed cluster
      fl.push({vice:'Doomscrolling', ts:iso(d), won:(i%3!==0), trigger:'first thing in the morning'});
    }
    ls('totry_fight_log', fl);
  })();
  ls('totry_moments_won',[
    {v:'Lust', ts:iso(dayAgo(0)), kind:'urge'},
    {v:'Doomscrolling', ts:iso(dayAgo(1)), kind:'urge'},
    {v:'Lust', ts:iso(dayAgo(2)), kind:'urge'},
  ]);
  ls('totry_wins',[
    {text:'Defeated an urge to lust \u2014 chose who I\u2019m becoming.', ts:iso(dayAgo(0)), date:auKey(dayAgo(0)), source:'vice'},
    {text:'Put the phone in the kitchen before bed.', ts:iso(dayAgo(1)), date:auKey(dayAgo(1)), source:'manual'},
    {text:'Trained when I did not feel like it.', ts:iso(dayAgo(2)), date:auKey(dayAgo(2)), source:'train'},
  ]);
  // totry_cravings has no writer in the real app — seeding it made a dead field look alive in the
  // one dataset anybody demos with, which is how it survived this long. Left unseeded deliberately.

  // The Fight's deeper tools, each with the person's OWN words in it \u2014 the ledger and the walk-back
  // are mirrored back at the threshold, so they need content or that moment shows nothing.
  (function(){
    const v=ls('totry_v')||[];
    if(v[0]){
      v[0].stage='ready';
      v[0].plan={why:'I want to be the same man alone at midnight as I am at noon.',
                 move:'Phone out of the room \u00b7 cold water \u00b7 ten slow breaths', updatedAt:Date.now()};
      v[0].cba={cost:'It steals the morning after, and it makes me quieter with the people I love.',
                free:'Clear-headed. Not hiding anything. Able to look my future wife in the eye.',
                ts:iso(dayAgo(20))};
      v[0].walkbacks=[{chain:'stayed up past midnight \u2192 took my phone to bed \u2192 told myself I\u2019d just check one thing \u2192 forty minutes gone',
                       catch:'Phone charges in the kitchen, not the bedroom.', ts:iso(dayAgo(18))}];
    }
    if(v[1]){
      v[1].stage='shaky';
      v[1].plan={why:'The first ten minutes of the day set the other fifteen hours.',
                 move:'Feet on the floor \u00b7 curtains open \u00b7 no phone until after prayer', updatedAt:Date.now()};
    }
    ls('totry_v', v);
  })();
  ls('totry_if_then',[
    {feeling:'restless', label:'Restless', action:'Ten minutes outside, no phone, no destination.', ts:iso(dayAgo(9))},
    {feeling:'lonely',   label:'Lonely',   action:'Text Dan. Not about anything \u2014 just text him.',  ts:iso(dayAgo(14))},
  ]);
  ls('totry_toolkit',{seen:{wave:iso(dayAgo(11)), defuse:iso(dayAgo(7)), halt:iso(dayAgo(3))},
                      myLine:'A craving is a wave, not an order. I am allowed to let it pass without obeying it.'});

  // BODY \u2014 sleep, steps and water, so the readiness read and the whole-person brief are real.
  (function(){
    const tr={};
    const SL=[7.5,6.2,8.1,7.0,5.4,7.8,8.0,6.9,7.4,7.1,6.0,7.6,8.2,7.3];
    for(let i=0;i<14;i++){ tr[auKey(dayAgo(i))]={sleep:SL[i], steps:6200+((i*937)%5200), water:1600+((i*311)%1500)}; }
    ls('totry_trackers', tr);
    ls('totry_today_steps', 8420);
  })();
  ls('totry_step_goal',10000); ls('totry_sleep_goal',8);

  // MONEY \u2014 transactions are what make subscription auto-detection and the balance sheet demo-able.
  (function(){
    const tx=[]; let id=0;
    for(let m=0;m<5;m++){                                        // a real monthly rhythm
      tx.push({id:'d'+(id++),type:'expense',amount:22.99,note:'NETFLIX.COM',       ts:iso(dayAgo(m*30+3))});
      tx.push({id:'d'+(id++),type:'expense',amount:12.99,note:'SPOTIFY P1DE4B',    ts:iso(dayAgo(m*30+8))});
      tx.push({id:'d'+(id++),type:'expense',amount:59.00,note:'FITNESS FIRST DD',  ts:iso(dayAgo(m*30+1))});
      tx.push({id:'d'+(id++),type:'income', amount:3200,  note:'SALARY',            ts:iso(dayAgo(m*30+15))});
    }
    [88.20,143.55,61.10,102.40,37.85,74.20].forEach(function(a,i){
      tx.push({id:'g'+(id++),type:'expense',amount:a,note:'WOOLWORTHS METRO',ts:iso(dayAgo(i*5+2))});
    });
    [18.50,22.00,15.75].forEach(function(a,i){
      tx.push({id:'e'+(id++),type:'expense',amount:a,note:'UBER EATS',ts:iso(dayAgo(i*11+4))});
    });
    ls('totry_transactions', tx);
  })();
  ls('totry_subscriptions',[]);                                   // left empty so DETECTION is what shows
  ls('totry_goals',[{id:1,name:'Emergency fund',target:5000,current:2150,created:iso(dayAgo(60)),priority:1}]);
  ls('totry_giving',[
    {id:1,amount:120,kind:'tithe',to:'Parish',        ts:iso(dayAgo(4))},
    {id:2,amount:50, kind:'alms', to:'Vinnies',       ts:iso(dayAgo(26))},
  ]);
  ls('totry_giving_pledge',{pct:10});

  // SOUL + PEOPLE \u2014 the threads, the plans, the values, the people he carries.
  ls('totry_read_plans',{ pull:{d:4,tr:'christianity',ts:iso(dayAgo(2)),done:false},
                          fear:{d:7,tr:'christianity',ts:iso(dayAgo(21)),done:true} });
  ls('totry_values',{v:['Honesty','Discipline','Family','Faith','Courage'],
                     why:'Because the man I want to be is decided in the small hours, not the big ones.',
                     ts:iso(dayAgo(30))});
  ls('totry_blessings',[{ts:iso(dayAgo(1)),reach:'Dad',faith:'christianity'},
                        {ts:iso(dayAgo(6)),reach:'Dan',faith:'christianity'}]);
  ls('totry_your_few',[{name:'Mum',note:''},{name:'Dad',note:''},{name:'Dan',note:'oldest mate'},{name:'Fr. Peter',note:''}]);
  ls('totry_reachouts',[{name:'Dan',ts:iso(dayAgo(5))},{name:'Mum',ts:iso(dayAgo(12))}]);
  ls('totry_promises',[
    {id:1,text:'Phone stays out of the bedroom.',to:'myself',status:'kept',  created:iso(dayAgo(18))},
    {id:2,text:'Call Mum every Sunday.',         to:'Mum',   status:'kept',  created:iso(dayAgo(40))},
  ]);
  ls('totry_tgt',{[auKey(dayAgo(0))]:{a:'Trained even though I was flat.',b:'Read instead of scrolling at night.',
                                      c:'Dan called just to check in.',person:'Dan',told:false,ts:iso(dayAgo(0))}});
  ls('totry_feeling_wins',[{feeling:'restless',moved:'walk',ts:iso(dayAgo(0))},
                           {feeling:'lonely',moved:'reach out',ts:iso(dayAgo(3))}]);
  ls('totry_relationships',[{id:1,name:'Mum',lastContact:iso(dayAgo(3))},{id:2,name:'Dan',lastContact:iso(dayAgo(5))}]);

  // FIRST-RUN GATES A 92-DAY PERSON WOULD HAVE PASSED LONG AGO. Without these the persona looks
  // established everywhere except the surfaces that gate on them — and the worst offender is the
  // Feeling Door, the app's primary action and the single most important thing to film: unset,
  // totry_first_moment makes it render the two-option beginner stub instead of the real door with all
  // eleven feelings. Every reel of the front door would have shown the wrong product.
  ls('totry_first_moment',{feeling:'restless', ts:iso(dayAgo(90))});
  ls('totry_tour_offered', true);
  ls('totry_first_win_done', true);
  ls('totry_nourish_care_shown', true);
  try{ localStorage.setItem('totry_home_depth_open','1'); }catch(_){}   // depth open, so Home films full

  if(typeof initApp === 'function') initApp();
  // Guarantee a VISIBLE app afterwards. initApp() alone does not reveal it, so if the auth overlay
  // happened to be up the person was left staring at a sign-in spinner with demo data silently loaded
  // behind it — the one thing that must never happen when the next action is "press record".
  try{ const ac=document.getElementById('auth-container'); if(ac) ac.style.display='none'; }catch(_){}
  try{ const ob=document.getElementById('onboard'); if(ob){ ob.classList.remove('active'); ob.style.display='none'; } }catch(_){}
  try{ document.querySelectorAll('.app').forEach(function(a){ a.classList.add('app-ready'); }); }catch(_){}
  if(typeof go === 'function') go('home');
  _demoBanner();
  haptic('success'); showToast('Demo data loaded','Camera-ready. Your real data is saved — the red bar puts it back.');
}

// ── GUIDED FEATURE TOUR (for tutorials) ───────────────────────
// Steps through the main tabs with a caption overlay, so you can screen-record a clean walkthrough.
// Interactive tour: each step navigates to a tab, spotlights a real element, and explains how to
// USE it. Steps with no `target` show a centered card (intro/outro). `tab` is the tab to open;
// `find` returns the element to highlight (a function so it runs after the tab is shown).
const TOUR_STEPS = [
  { tab:'home', title:'Welcome to To Try', caption:'A 60-second walk through how it all fits together. Tap Next \u2014 or Skip anytime.' },
  { tab:'home', find:()=>document.getElementById('home-habit-list'),
    title:'Your daily habits', caption:'These are the things you\u2019re building \u2014 the last seven days at a glance. Workouts and prayer tick themselves when you log them; you tick the rest when you close the day.' },
  { tab:'home', find:()=>document.getElementById('home-quickwin-list'),
    prep:()=>{ try{ localStorage.setItem('totry_home_depth_open','1');
                    if(typeof renderHomeDepthFold==='function') renderHomeDepthFold(); }catch(_){} },
    title:'Fighting an urge?', caption:'Your vices live here, tracked honestly \u2014 wins and slips. Tap one the moment you\u2019re tempted and you\u2019ll get walked through it.' },
  // The orb opens the FEELING DOOR, not the coach \u2014 orbTap() calls openFeelingDoor(). This step used
  // to call it "your AI coach, 24/7", which taught people the wrong thing about the single most
  // important action in the app. The Feeling Door IS the thesis: you come because you FEEL something.
  { tab:'home', find:()=>document.getElementById('need-talk-btn'),
    title:'The one button that matters', caption:'Tap this whenever you feel anything \u2014 restless, low, tempted, wired, ashamed. It asks what you\u2019re feeling, then moves you through it. This is the thing to open instead of your feed.' },
  { tab:'home', find:()=>document.getElementById('need-talk-btn'),
    title:'It knows your whole life', caption:'Whatever it says is shaped by everything else in here \u2014 how you slept, whether you trained, where the money is, how the week has gone in your fight. That is the part a single-purpose app cannot do.' },
  { tab:'nourish', find:()=>document.getElementById('nut-search-in'),
    title:'Log food in plain words', caption:'Just describe a meal \u2014 \u201c200g chicken, 1 cup rice\u201d or \u201cdinner out\u201d \u2014 and the AI works out the macros. Give exact amounts when you want it precise.' },
  { tab:'nourish', find:()=>document.getElementById('nut-gentle-toggle'),
    title:'Or turn the numbers off', caption:'If counting is the thing that hurt you, tap this. You still log food, you just never see a number \u2014 and the coach is told never to say one either.' },
  { tab:'fight', find:()=>document.getElementById('toolkit-card'),
    title:'Learn the tools before 11pm', caption:'Eight skills, two minutes each \u2014 urge surfing, defusion, HALT. Learn them while you\u2019re calm, so they\u2019re already yours in the moment. Free, and nothing to finish.' },
  { tab:'money', find:()=>document.getElementById('sub-detect'),
    title:'Money, honestly', caption:'Import a statement and it finds the subscriptions quietly draining you \u2014 and shows what a habit actually costs you a year. The same habit you\u2019re fighting one tab over.' },
  { tab:'soul', title:'Faith, woven in \u2014 or not', caption:'A daily verse, the Examen, and prayer. It works for Christian, Muslim, Hindu, Buddhist and secular \u2014 Settings lets you choose, or dial faith all the way down. Nothing is forced on you.' },
  { tab:'reflect', title:'Close the day', caption:'Each evening: one win, one thing to release, tomorrow\u2019s priorities, ending in the Examen. You can edit it right up until midnight.' },
  { tab:'home', title:'It won\u2019t chase you', caption:'No streak held over your head, no guilt, no notifications begging you back. At most a few quiet check-ins a week, before your hardest hour \u2014 and you can turn even those off.' },
  { tab:'home', title:'Free, and built with care', caption:'No ads, no paywall \u2014 this was made to help, not to profit. The goal is to keep it free for as long as that\u2019s possible.' },
];
let _tourIdx = 0;
// Onboarding trigger: brand-new users get the tour automatically on first Home view; people who
// were already signed in before the tour existed get a one-time gentle prompt. Either way, once
// they've been offered (and chosen), it never shows again.
function renderTourPrompt(){
  const card = document.getElementById('home-tour-prompt');
  if(!card) return;
  if(ls('totry_tour_offered')){ card.style.display='none'; return; }
  // Don't compete with the multi-day first-run onboarding card.
  const firstRunActive = document.getElementById('firstrun-card')?.style.display === 'block';
  if(firstRunActive){ card.style.display='none'; return; }
  // Brand-new user (onboarded this session, barely any history): start the tour automatically once.
  const dayCount = (typeof getDayCount==='function') ? getDayCount() : 99;
  const brandNew = dayCount <= 1;
  if(brandNew){
    // Don't ambush someone with an 8-step tour the second they finish onboarding — that's the whole
    // cathedral before they've touched anything. Land them on the home (hero + the one next step),
    // and OFFER the tour gently. One clear thing first; the guided walk is one tap away if they want it.
    card.style.display='block';
    card.innerHTML='<div style="font-family:Cormorant Garamond,serif;font-size:18px;color:var(--tx);margin-bottom:4px">Welcome in.</div>'+
      '<div style="font-size:13px;color:var(--tx2);line-height:1.55;margin-bottom:12px">Start wherever you feel something. Or, if you’d rather, take a 60-second look at how it all fits together.</div>'+
      '<div style="display:flex;gap:8px"><button class="btn primary" style="flex:1;font-size:13px" onclick="acceptTourPrompt()">Show me around</button>'+
      '<button class="btn" style="flex:1;font-size:13px;background:var(--bg3);border:1px solid var(--bd)" onclick="dismissTourPrompt()">I’ll explore</button></div>';
    return;
  }
  // Returning user: gentle one-time offer.
  card.style.display='block';
  card.innerHTML='<div style="font-family:Cormorant Garamond,serif;font-size:18px;color:var(--tx);margin-bottom:4px">A quick look around?</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.55;margin-bottom:12px">There\u2019s a lot new in here. Want a 60-second tour of how it all fits together?</div>'+
    '<div style="display:flex;gap:8px"><button class="btn primary" style="flex:1;font-size:13px" onclick="acceptTourPrompt()">Show me</button>'+
    '<button class="btn" style="flex:1;font-size:13px;background:var(--bg3);border:1px solid var(--bd)" onclick="dismissTourPrompt()">No thanks</button></div>';
}
function acceptTourPrompt(){ ls('totry_tour_offered', true); const c=document.getElementById('home-tour-prompt'); if(c)c.style.display='none'; if(typeof startFeatureTour==='function') startFeatureTour(); }
function dismissTourPrompt(){ ls('totry_tour_offered', true); const c=document.getElementById('home-tour-prompt'); if(c)c.style.display='none'; }
function startFeatureTour(){
  _tourIdx = 0;
  // Build the overlay layers once: a dimming backdrop with a "spotlight" hole, plus a tooltip card.
  let ov = document.getElementById('tour-overlay');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'tour-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none';
    ov.innerHTML =
      '<div id="tour-spot" style="position:absolute;border-radius:14px;box-shadow:0 0 0 9999px rgba(0,0,0,0.78);transition:all 0.3s cubic-bezier(.4,0,.2,1);pointer-events:none;border:2px solid var(--go)"></div>'+
      '<div id="tour-card" style="position:absolute;left:16px;right:16px;background:var(--bg2);border:1px solid var(--go-bd);border-radius:var(--r);padding:16px;box-shadow:0 12px 40px rgba(0,0,0,0.6);pointer-events:auto;transition:top 0.3s,bottom 0.3s"></div>';
    document.body.appendChild(ov);
  }
  ov.style.display = 'block';
  renderTourStep();
}
function renderTourStep(){
  const ov = document.getElementById('tour-overlay');
  if(!ov) return;
  const step = TOUR_STEPS[_tourIdx];
  if(typeof go === 'function' && step.tab) go(step.tab);
  // Some targets live inside a collapsed section ("More of your day"), so the spotlight had nothing
  // to point at and the step silently fell back to a centred card — the tour talked about a thing the
  // viewer could not see. `prep` opens whatever needs opening first.
  if(typeof step.prep === 'function'){ try{ step.prep(); }catch(_){ } }
  const spot = document.getElementById('tour-spot');
  const card = document.getElementById('tour-card');
  // Give the tab a moment to render/layout, then find + spotlight the target element.
  setTimeout(()=>{
    let rect = null;
    if(step.find){
      try{
        const elTarget = step.find();
        if(elTarget && elTarget.scrollIntoView){ elTarget.scrollIntoView({block:'center', behavior:'instant'}); }
        if(elTarget && elTarget.getBoundingClientRect){
          const r = elTarget.getBoundingClientRect();
          if(r.width>0 && r.height>0) rect = r;
        }
      }catch(_){ }
    }
    if(rect && spot){
      // Spotlight the element (with a little padding).
      const pad = 8;
      spot.style.display='block';
      spot.style.top = (rect.top - pad) + 'px';
      spot.style.left = (rect.left - pad) + 'px';
      spot.style.width = (rect.width + pad*2) + 'px';
      spot.style.height = (rect.height + pad*2) + 'px';
    } else if(spot){
      // No target → no hole; just dim the screen (centered card).
      spot.style.display='block';
      spot.style.top='50%'; spot.style.left='50%'; spot.style.width='0px'; spot.style.height='0px';
    }
    // Position the card: below the element if it's in the top half, above if in the bottom half;
    // centered when there's no target.
    if(card){
      if(rect){
        const vh = window.innerHeight || 700;
        if(rect.top < vh*0.5){ card.style.top = Math.min(rect.bottom + 18, vh-220) + 'px'; card.style.bottom='auto'; }
        else { card.style.bottom = (vh - rect.top + 18) + 'px'; card.style.top='auto'; }
      } else {
        card.style.top='50%'; card.style.bottom='auto'; card.style.transform='translateY(-50%)';
      }
      if(!rect){ card.style.transform='translateY(-50%)'; } else { card.style.transform='none'; }
      card.innerHTML =
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:6px">Tour \u00b7 '+(_tourIdx+1)+' of '+TOUR_STEPS.length+'</div>'+
        '<div style="font-family:Cormorant Garamond,serif;font-size:21px;color:var(--tx);margin-bottom:6px">'+step.title+'</div>'+
        '<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:14px">'+step.caption+'</div>'+
        '<div style="display:flex;gap:8px;align-items:center">'+
          (_tourIdx>0?'<button class="btn" onclick="tourPrev()" style="flex:1;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:13px">Back</button>':'')+
          (_tourIdx<TOUR_STEPS.length-1
            ? '<button class="btn primary" onclick="tourNext()" style="flex:2;font-size:13px">Next \u2192</button>'
            : '<button class="btn primary" onclick="endFeatureTour()" style="flex:2;font-size:13px">Got it</button>')+
          '<button class="btn" onclick="endFeatureTour()" style="flex:0 0 auto;padding:10px 12px;background:none;border:none;color:var(--tx3);font-size:12px">Skip</button>'+
        '</div>';
    }
  }, step.tab ? 220 : 0);
}
function tourNext(){ if(_tourIdx < TOUR_STEPS.length-1){ _tourIdx++; renderTourStep(); } else { endFeatureTour(); } }
function tourPrev(){ if(_tourIdx > 0){ _tourIdx--; renderTourStep(); } }
function endFeatureTour(){ const ov=document.getElementById('tour-overlay'); if(ov) ov.style.display='none'; if(typeof go==='function') go('home'); }


// ── PREFERENCE HELPERS ───────────────────────────────────────
function savePref(key, value){
  ls(key, value);
}

// Apply theme — light mode swaps CSS variables for warm-on-cream palette
function applyTheme(theme){
  const root = document.documentElement;
  // Mirror the choice where the native side can see it. ViewController.preferredStatusBarStyle reads
  // CapacitorStorage.totry_theme — without this the iOS status bar follows the DEVICE's light/dark
  // setting instead of the app's, and drew black-on-black for anyone whose phone is in Light Mode.
  // Same route the Face ID lock already uses (07-platform.js:82).
  try{
    const P = (window.Capacitor && window.Capacitor.Plugins) || {};
    if(P.Preferences && P.Preferences.set) P.Preferences.set({ key:'totry_theme', value: (theme==='light' ? 'light' : 'dark') });
  }catch(_){ }
  if(theme === 'light'){
    root.style.setProperty('--bg', '#F5F1E8');
    root.style.setProperty('--bg2', '#FFFFFF');
    root.style.setProperty('--bg3', '#EBE4D2');
    root.style.setProperty('--tx', '#1A1A1F');
    root.style.setProperty('--tx2', '#3D3D45');
    root.style.setProperty('--tx3', '#7A7A82');
    root.style.setProperty('--bd', '#D9D2BE');
    root.style.setProperty('--bd2', '#C4BBA0');
  } else {
    // Restore dark (default)
    root.style.removeProperty('--bg');
    root.style.removeProperty('--bg2');
    root.style.removeProperty('--bg3');
    root.style.removeProperty('--tx');
    root.style.removeProperty('--tx2');
    root.style.removeProperty('--tx3');
    root.style.removeProperty('--bd');
    root.style.removeProperty('--bd2');
  }
}

// ── ACCOUNT DELETION ─────────────────────────────────────────
async function deleteAccount(){
  const confirm1 = confirm('Delete your account permanently?\n\nThis will:\n• Sign you out\n• Delete ALL your data from the cloud\n• Clear everything on this device\n\nThis cannot be undone.');
  if(!confirm1) return;
  
  const confirm2 = prompt('Last chance.\n\nType DELETE in capitals to confirm permanent account deletion:');
  if(confirm2 !== 'DELETE'){
    showToast('Cancelled', 'Your account is safe.');
    return;
  }
  
  // SIGNED OUT, NOTHING REACHES THE SERVER. Every server call below sits behind `sb && currentUser`, but
  // the confirm promises "Delete ALL your data from the cloud" and the success toast says "Account
  // deleted". Signed out, this wiped the device and claimed the account was gone while it sat untouched
  // on the server with their email on it. Say so instead, before they type DELETE.
  if(!(sb && currentUser)){
    const _local = Object.keys(localStorage).filter(function(k){ return k.indexOf('totry_') === 0; }).length;
    if(!confirm('You are signed out, so I cannot reach your account from here.\n\nI can clear all ' + _local +
                ' items on THIS DEVICE now, but your account and anything synced to it will still exist.\n\n' +
                'To delete the account itself: sign in first, then use this button again.\n\nClear this device anyway?')) return;
    try{
      const keep = ['totry_theme'];
      Object.keys(localStorage).forEach(function(k){ if(k.indexOf('totry_') === 0 && keep.indexOf(k) === -1) localStorage.removeItem(k); });
    }catch(_){ }
    alert('This device is cleared.\n\nYour ACCOUNT was not deleted — I could not reach the server while signed out. Sign in and use Delete account again to remove it, or email totrybyaj@gmail.com and I will do it by hand.');
    setTimeout(function(){ location.reload(); }, 1200);
    return;
  }

  try{
    if(sb && currentUser){
      // Delete EVERY row that is tied to them, not just user_data. The confirm promises "delete ALL
      // your data from the cloud", and two tables were being left behind: push_subscriptions (keyed by
      // user_id, so a stale device row outlived the account) and feedback (which stores their email
      // address alongside whatever they wrote to me). app_events is deliberately left — it is keyed by a
      // random anon_id that is not the email and holds no content, so there is nothing there to identify.
      //
      // CHECK THE RESULT, DON'T ASSUME IT. supabase-js does NOT throw when a delete is refused — an RLS
      // policy that has no DELETE rule returns {error} (or silently affects zero rows) and resolves
      // normally. So try/catch caught nothing, the {error} was discarded, and the app said "Account
      // deleted" whether or not anything was. That is a false statement to the person, a broken promise
      // in the privacy policy, and an App Store 5.1.1(v) failure. Now every delete is verified and the
      // toast tells the truth.
      const _uid = currentUser.id, _email = currentUser.email || null;
      const _failed = [];
      const _del = async (table, col, val, label) => {
        try{
          const { error } = await sb.from(table).delete().eq(col, val);
          if(error){ _failed.push(label); console.warn('[delete] '+table+':', error); }
        }catch(e){ _failed.push(label); console.warn('[delete] '+table+':', e); }
      };
      await _del('user_data', 'user_id', _uid, 'your logged data');
      await _del('push_subscriptions', 'user_id', _uid, 'your notification registration');
      if(_email) await _del('feedback', 'email', _email, 'messages you sent me');
      // THE ACCOUNT ITSELF — the auth.users row, which is what holds their email address. Deleting rows
      // is not deleting an account: signing in with the same email returned the same user id, so the app
      // said "Account deleted" while the account was still there. That needs the service-role key, which a
      // browser must never hold, so it lives in the delete-user edge function
      // (supabase/functions/delete-user/index.ts). Must run BEFORE signOut — afterwards there is no JWT to
      // authorise it with. If it fails, or is not deployed yet, it joins _failed and the person is told the
      // truth rather than a comforting lie.
      // Two routes, because removing an auth.users row needs privileges a browser must never hold.
      // PREFERRED: delete_own_account(), a SECURITY DEFINER Postgres function. It takes no arguments and
      // can only ever delete auth.uid(), so there is no id for anyone to tamper with, and no service-role
      // key exists anywhere in the system. FALLBACK: the delete-user edge function, for a project whose
      // SQL role lacks rights on the auth schema. If neither answers, this joins _failed and the person is
      // told the truth instead of a comforting lie.
      let _acctGone = false;
      try{
        const { data, error } = await sb.rpc('delete_own_account');
        const r = Array.isArray(data) ? data[0] : data;
        if(!error && r && (r.ok === true || r === true)) _acctGone = true;
        else console.warn('[delete] delete_own_account:', error || r);
      }catch(e){ console.warn('[delete] delete_own_account threw:', e); }
      if(!_acctGone){
        try{
          const { data, error } = await sb.functions.invoke('delete-user');
          if(!error && data && data.ok) _acctGone = true;
          else console.warn('[delete] delete-user:', error || data);
        }catch(e){ console.warn('[delete] delete-user threw:', e); }
      }
      if(!_acctGone) _failed.push('your account itself (your email address and sign-in)');
      window.__deleteFailures = _failed;
      // Sign out
      try{ await sb.auth.signOut(); }catch(e){ console.warn('[delete] signOut failed:', e); }
    }
  }catch(e){
    console.error('[delete] error:', e);
  }
  
  // Wipe local
  const keep = ['totry_theme']; // Keep theme so post-delete login isn't jarring
  Object.keys(localStorage).forEach(k => {
    if(k.startsWith('totry_') && !keep.includes(k)) localStorage.removeItem(k);
  });
  
  const _f = window.__deleteFailures || [];
  if(_f.length){
    // Never claim a deletion that did not happen. Local data is gone either way, so say precisely what
    // is still on the server and give them a person to ask — that is the only honest move left here.
    alert('This device has been wiped, and you are signed out.\n\nBut the server refused to delete:\n\n\u2022 '
      + _f.join('\n\u2022 ')
      + '\n\nI will not tell you it is gone when it is not. Email totrybyaj@gmail.com and I will delete it by hand '
      + 'and confirm to you. I am sorry \u2014 this is my bug, not something you did wrong.');
    showToast('Partly deleted', 'This device is wiped. Please email me about the rest.');
  } else {
    showToast('Account deleted', 'Goodbye. The door is always open.');
  }
  setTimeout(() => location.reload(), 1500);
}

// ── PRIVACY / TERMS ──────────────────────────────────────────
function showPrivacyPolicy(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:6px">Privacy policy</h3>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px">To Try by Alfred John · Last updated June 2026 · Plain English</div>' +
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;overflow-y:auto;max-height:60vh;padding-right:6px">' +
    
      '<p style="margin-bottom:12px">This is a one-person project, not a corporation. I (Alfred) built this and I run it. I will not pretend the app does more privacy work than it does. Here is exactly what happens to your data.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">1. What is collected</strong></p>' +
      '<p style="margin-bottom:12px">Your email (to sign in), and everything you log inside the app: vices, habits, journal entries, training, nutrition, finances, prayers, goals, reflections, scripture, examens, measurements. Plus an anonymous identifier that links your data to your sign-in.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">2. Where it lives</strong></p>' +
      '<p style="margin-bottom:12px">Two places. (a) On your device, in your browser\'s local storage. (b) In a Supabase database hosted on AWS in Sydney, Australia. Supabase encrypts data at rest. I (Alfred), as the project owner, can technically read this database — I have not, and I don\'t intend to, but it is not zero-knowledge encryption. If that matters to you, you should know it.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">3. What gets sent to third parties</strong></p>' +
      '<p style="margin-bottom:6px">Some app features call external services to work. Each one sees something specific:</p>' +
      '<ul style="margin:0 0 12px 18px;padding:0;line-height:1.7">' +
        '<li><strong style="color:var(--tx)">Coach &amp; AI features</strong> — your message + relevant context (recent state from your logs) goes to whichever AI provider responds first: Google (Gemini), Groq (Llama), OpenRouter, or Anthropic. These companies have their own privacy policies. By default many providers retain prompts for safety review for 30 days, and some may use prompts to improve models unless their enterprise tier is used. I use their standard API tiers — assume your Coach messages may be reviewed by automated systems and could be retained briefly by the provider.</li>' +
        '<li><strong style="color:var(--tx)">Photos you send to the coach</strong> \u2014 five things can send an image, and all of them go to whichever vision model answers first (Google Gemini, then OpenRouter as a fallback): a <strong>form check</strong> (a photo of you doing the movement \u2014 your body is in it), a <strong>meal photo</strong>, a <strong>barcode or package photo</strong> when the scanner cannot read the code, a <strong>workout screenshot</strong>, and a <strong>smart-scale screenshot</strong> (your weight and body composition are in it). Each is sent when you choose that action, never in the background, and is not stored by me.</li>' +
        '<li><strong style="color:var(--tx)">Barcode scanning</strong> — the barcode is sent to OpenFoodFacts (open database).</li>' +
        '<li><strong style="color:var(--tx)">USDA food search</strong> — the search query is sent to api.nal.usda.gov.</li>' +
        '<li><strong style="color:var(--tx)">Apple Health</strong> — on iPhone, only if you grant it. Your steps, sleep and imported workout summaries (type, duration, distance, calories, average heart rate) are saved to your account so they follow you between devices, and your sleep and recent training form part of the context sent to the AI when you ask for coaching. Never sold, never advertising, never shared with anyone else. Turn it off any time in Settings, and revoke it in iOS Settings &#8594; Health.</li>' +
        '<li><strong style="color:var(--tx)">Prayer times</strong> — if you use them, your location is rounded to about a kilometre and sent to api.aladhan.com to work out the times where you are. The rounded figure is not stored on my server and is not linked to your account. You can skip location entirely and type your city instead.</li>' +
        '<li><strong style="color:var(--tx)">Exercise GIFs</strong> — exercise name is sent to ExerciseDB / Wger.</li>' +
        '<li><strong style="color:var(--tx)">Scripture you read</strong> \u2014 the passage you open is fetched live, so the service sees which one: the Qur\u2019an from api.alquran.cloud, the Bhagavad Gita from vedicscriptures.github.io, and the Dhammapada from suttacentral.net. The Bible is fetched the same way: the ESV goes through my own server when it is available, but the public translations (ASV, KJV, WEB) and the study notes come straight from bible.helloao.org, bible-api.com and cdn.jsdelivr.net, so those services see the passage \u2014 and an ESV request falls back to them if my server is down. Nothing about you is attached to any of them.</li>' +
        '<li><strong style="color:var(--tx)">Currency rates</strong> — your selected currency is sent to api.frankfurter.dev.</li>' +
        '<li><strong style="color:var(--tx)">Strava</strong> — if you connect it, Strava sees your access tokens and serves your activities. You explicitly authorise this via OAuth.</li>' +
        '<li><strong style="color:var(--tx)">Hevy</strong> — if you enter an API key, Hevy sees your sync requests. You explicitly authorise this.</li>' +
        '<li><strong style="color:var(--tx)">Bible verse lookups</strong> — verse references go to api.esv.org.</li>' +
      '</ul>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">4. What never leaves your device</strong></p>' +
      '<p style="margin-bottom:12px">Progress photos. They are stored only in your browser\'s local storage. They are not uploaded to my database, not synced across devices, not sent to any AI provider. If you clear your browser data, they\'re gone.</p>' +
      '<p style="margin-bottom:12px">Your cycle data, if you track it. Period dates, flow and symptoms are stored in local storage on your device only. They are not written to my database and not synced. They are never sent to any AI provider \u2014 with one exception you control: if you switch on Settings &rarr; Your cycle &rarr; "Let the coach see my phase" (off by default), the coach is told the phase word only (e.g. "luteal"), never your dates, flow or symptoms. Leave it off and nothing about your cycle ever leaves the device. Backing them up to your account is off by default and only happens if you switch it on yourself in Settings &rarr; Your cycle &mdash; which also has a one-tap delete that erases them here and on the server. I will not sell, share or hand this data to anyone, and while backup is off there is nothing on my server for anyone to ask me for.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">5. What I do not do</strong></p>' +
      '<p style="margin-bottom:12px">I do not run ads. I do not sell or share your data with advertisers or data brokers. No third party pays me to feature their service. There is no advertising or profiling SDK in this app.</p>' +
      '<p style="margin-bottom:12px">Two things do count <em>usage</em>, and you should know exactly what they are. <strong>A visitor counter</strong> (GoatCounter) records page views and where visits came from — cookie-free, no personal data, no cross-site tracking, no profile of you. <strong>Anonymous feature counts</strong> go to my own database against a random ID that is not your email — which <em>features</em> got used, with no content attached: &ldquo;app opened&rdquo;, &ldquo;reminder set&rdquo;, &ldquo;import run&rdquo;, &ldquo;a breathing exercise was done&rdquo;. Neither ever includes what you log: your vices, prayers, journal, food, money and body data are never in it. They record <em>that</em> a feature was used, never what you put into it — not the feeling you picked, not the vice, not your day rating, not the name you gave anything. <strong>One exception, and it is the only one:</strong> if the app hits an error, it sends the error message and the line it came from, so I can fix it. That text comes from the code, not from you \u2014 but I would rather tell you it exists than let you find it. There is no per-person record of whether you slipped or held on; watching someone&rsquo;s fight from the outside is the opposite of what this is for. You can switch both off in Settings &rarr; Your data, and the app works exactly the same — though a message you send me still reaches me, because you pressed send.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">6. What I cannot control</strong></p>' +
      '<p style="margin-bottom:12px">Once your Coach message reaches Google or Anthropic, that data is governed by their privacy policies, not mine. I have no influence over their model-training practices or retention periods. If a provider has a security breach, I cannot prevent it. Treat your Coach messages the way you would treat a message to any cloud service — not a sealed diary.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">7. Your control</strong></p>' +
      '<p style="margin-bottom:12px">Export everything (Settings → Your data → Export). Delete your account and all server-side data (Settings → Account → Delete account permanently). Clear local data by clearing your browser. You can do any of these at any time without asking me.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">8. Children</strong></p>' +
      '<p style="margin-bottom:12px">To Try is not designed for users under 16. I cannot verify age. If you are under 16, please don\'t use this app without a parent\'s knowledge.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">9. Contact</strong></p>' +
      '<p style="margin-bottom:12px">Email <strong style="color:var(--tx)">totrybyaj@gmail.com</strong> or DM <strong style="color:var(--tx)">@totry_aj</strong> on Instagram if you have a privacy concern. I respond personally — there is no support team.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">10. Changes</strong></p>' +
      '<p>If this policy changes, the date at the top updates and the change goes in-app. I will not silently expand what I do with your data.</p>' +
    
    '</div>' +
    '<button class="btn" onclick="closeModal(this)" style="margin-top:14px">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}

function showTermsOfUse(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:6px">Terms of use</h3>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px">To Try by Alfred John · Last updated June 2026</div>' +
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;overflow-y:auto;max-height:60vh;padding-right:6px">' +
    
      '<p style="margin-bottom:12px">By using To Try, you agree to these terms. They are written in plain English so you can actually read them.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">1. What this app is</strong></p>' +
      '<p style="margin-bottom:12px">A free self-improvement app built by one person (Alfred John) on a Christian foundation. It tracks habits, training, nutrition, finances, faith practices, and provides AI coaching. Use it for personal growth.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">2. Not professional advice</strong></p>' +
      '<p style="margin-bottom:12px">Nothing in this app is medical, psychiatric, legal, financial, or pastoral advice. The Coach is an AI — it can be wrong, it can be insensitive, it can hallucinate facts. If you have a real problem (mental health crisis, physical injury, financial emergency, suicidal thoughts), you need a real human professional. The app has a crisis-detection layer that will point you to one when it can — but it is not a substitute for one.</p>' +
    
      // This said the app "reflects a Christian worldview" and that people of other faiths get "the
      // practical features". That was true when it was written and is no longer: the faith registry
      // serves Christianity, Islam, Hinduism, Buddhism and a fully secular path, each with its own
      // scripture, prayer language and practice — and the default is SECULAR. Telling a Muslim only the
      // training and money features work for him is now simply false, and it is the kind of sentence
      // that makes someone close the app before they find what is actually there.
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">3. Where this comes from</strong></p>' +
      '<p style="margin-bottom:12px">I built this honestly from what I believe — I am Catholic, and that is the heart it was made with. It is not built to convert you. The app follows <em>your</em> path: set it in Settings &#8594; Faith and the whole app moves with you — Christianity, Islam, Hinduism, Buddhism, or none at all, which is the default. Your scripture or none, your prayer or a plain reflection, your practice, your fasting season. If you want the faith side turned down or off entirely, that dial is yours too, and everything else works exactly the same.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">4. Acceptable use</strong></p>' +
      '<p style="margin-bottom:12px">Don\'t use this app to plan harm to yourself or others. Don\'t attempt to reverse-engineer, scrape, or abuse the service. Don\'t share your account with others. Don\'t use the AI Coach to generate content for purposes outside personal growth.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">5. No guarantees</strong></p>' +
      '<p style="margin-bottom:12px">The app is provided "as is." It might break, it might lose data despite my best efforts, the AI might say something you disagree with, a third-party service might go down. I will work to fix things, but I cannot promise uninterrupted service or be liable for damages from app failure. Export your important data regularly.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">6. Free, sustained by goodwill</strong></p>' +
      '<p style="margin-bottom:12px">This app is free and ad-free. Running it costs me money in AI API calls and hosting. ' +
      // The support link is hidden in the App Store build (Guideline 3.1.1), so the terms must not
      // point at it there — otherwise this promises a button that isn't on the screen.
      ((typeof isNativeApp==='function' && isNativeApp())
        ? 'Nothing is paywalled, and no feature is ever unlocked by paying.'
        : 'If you find it valuable and want to help keep it free for others, you can support the project (link in Settings). Donations are entirely optional and never unlock features.') +
      '</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">7. Your data, your account</strong></p>' +
      '<p style="margin-bottom:12px">One account per person. You can export your data or delete your account at any time. See the Privacy policy for how data is handled.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">8. Changes</strong></p>' +
      '<p style="margin-bottom:12px">Features may change. To Try is free today and the intention is to keep it free for as long as it can be sustained — but that can\'t be guaranteed forever. If anything about cost or terms changes materially, I\'ll tell you in-app first.</p>' +
    
      '<p style="margin-bottom:6px"><strong style="color:var(--tx)">9. Contact</strong></p>' +
      '<p><strong style="color:var(--tx)">totrybyaj@gmail.com</strong> · <strong style="color:var(--tx)">@totry_aj</strong> on Instagram · <strong style="color:var(--tx)">@alfred_john</strong> (personal).</p>' +
    
    '</div>' +
    '<button class="btn" onclick="closeModal(this)" style="margin-top:14px">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}


function changeName(){openFormModal('Your name','What should the app call you?',[{id:'name',label:'First name',type:'text',placeholder:'Your first name',value: (typeof userName!=='undefined'?userName:'')}],'Save',(vals)=>{if(!vals.name||!vals.name.trim())return 'Enter a name.';userName=vals.name.trim();ls('totry_name',userName);initSettingsTab();showToast('Name updated','Hey '+userName+'.');return true;});}
function logQuickWin(){
  const input=document.getElementById('quick-win-input');const text=input?.value.trim();if(!text)return;
  const wins=ls('totry_wins')||[];
  wins.unshift({id:Date.now(),text,date:new Date().toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'}),ts:new Date().toISOString(),day:getDayCount()});
  ls('totry_wins',wins.slice(0,500));input.value='';renderWinsLog();showToast('Win logged \u2b50',text.slice(0,50));
}
function renderWinsLog(){
  const wins=ls('totry_wins')||[];const list=document.getElementById('wins-log-list');if(!list)return;
  if(!wins.length){list.innerHTML='<p style="font-size:13px;color:var(--tx3);text-align:center;padding:12px 0;line-height:1.6">No wins logged yet.<br><span style="font-size:12px">Type one above — even getting out of bed counts on a hard day.</span></p>';return;}
  list.innerHTML='';
  wins.slice(0,20).forEach(w=>{
    const el=document.createElement('div');el.className='win-item';
    const icon = w.source==='vice' ? '\u{1F94A}' : '\u2b50';
    const dateLine = w.date + (w.day ? ' \u00b7 Day '+w.day : '');
    el.innerHTML='<span class="win-icon">'+icon+'</span><div><div class="win-text">'+(w.text||'').replace(/</g,'&lt;')+'</div><div class="win-date">'+dateLine+'</div></div>';
    list.appendChild(el);
  });
}

// ── UNIVERSAL SEARCH ────────────────────────────────────────
// Search across journal, wins, saved verses, examens, prayers. One bar, all your text history.
function openUniversalSearch(){
  document.querySelector('.modal-bg.open')?.remove();
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:6px">Search your history</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:12px;line-height:1.55">Across journal, wins, saved verses, examens, prayers. Type 2+ characters.</p>' +
    '<input type="text" id="search-input" placeholder="Try a word, a name, a feeling..." style="margin-bottom:14px;font-size:16px" oninput="runUniversalSearch(this.value)" autofocus>' +
    '<div id="search-results" style="max-height:55vh;overflow-y:auto;padding-right:4px"></div>' +
    '<button class="btn" onclick="closeModal(this)" style="margin-top:12px">Close</button>' +
  '</div>';
  document.body.appendChild(m);
  setTimeout(() => {
    document.getElementById('search-input')?.focus();
    runUniversalSearch('');
  }, 100);
}

function runUniversalSearch(query){
  const box = document.getElementById('search-results');
  if(!box) return;
  
  const q = (query || '').trim().toLowerCase();
  if(q.length < 2){
    box.innerHTML = '<p style="font-size:12px;color:var(--tx3);text-align:center;padding:30px 12px;font-style:italic">Start typing to search across your journal entries, wins, saved verses, examens, and prayers.</p>';
    return;
  }
  
  const results = [];
  
  // Search journal
  (ls('totry_journal') || []).forEach((e, i) => {
    if(e.text && e.text.toLowerCase().includes(q)){
      results.push({
        source: 'Journal',
        sourceColor: 'var(--go)',
        date: e.date,
        body: e.text,
        mood: e.mood,
        onclick: 'document.querySelector(\'.modal-bg.open\')?.remove();go(\'reflect\');setTimeout(()=>setReflectTab(\'journal\'),100)'
      });
    }
  });
  
  // Search wins
  (ls('totry_wins') || []).forEach(w => {
    if(w.text && w.text.toLowerCase().includes(q)){
      results.push({
        source: 'Win',
        sourceColor: '#A8D8B9',
        date: w.date + (w.day ? ' · Day ' + w.day : ''),
        body: w.text,
        onclick: 'document.querySelector(\'.modal-bg.open\')?.remove();go(\'reflect\');setTimeout(()=>setReflectTab(\'wins\'),100)'
      });
    }
  });
  
  // Search saved verses
  (ls('totry_sv') || []).forEach(v => {
    if((v.verse && v.verse.toLowerCase().includes(q)) || (v.reference && v.reference.toLowerCase().includes(q))){
      results.push({
        source: 'Verse',
        sourceColor: '#C8A96E',
        date: v.reference || '',
        body: v.verse,
        verse: true,
        onclick: 'document.querySelector(\'.modal-bg.open\')?.remove();go(\'bible\');setTimeout(()=>setBibleTab(\'saved\'),100)'
      });
    }
  });
  
  // Search examens — any of the 5 step answers
  (ls('totry_examens') || []).forEach((e, i) => {
    const allText = [e.gratitude, e.petition, e.review, e.repent, e.renewal].filter(Boolean).join(' ').toLowerCase();
    if(allText.includes(q)){
      const preview = [e.gratitude, e.review, e.repent, e.renewal].filter(Boolean).find(t => t.toLowerCase().includes(q)) || '';
      results.push({
        source: 'Examen',
        sourceColor: '#8C6BB6',
        date: e.date + (e.day ? ' · Day ' + e.day : ''),
        body: preview,
        onclick: 'document.querySelector(\'.modal-bg.open\')?.remove();showExamenDetail(' + i + ')'
      });
    }
  });
  
  // Search prayers
  (ls('totry_prayers') || []).forEach(p => {
    if(p.text && p.text.toLowerCase().includes(q)){
      const created = new Date(p.createdAt);
      const days = Math.floor((Date.now() - created.getTime()) / 86400000);
      results.push({
        source: 'Prayer · ' + (p.status === 'answered' ? 'answered' : 'praying'),
        sourceColor: p.status === 'answered' ? 'var(--gr)' : 'var(--tx2)',
        date: days === 0 ? 'today' : days + ' day' + (days===1?'':'s') + ' ago',
        body: p.text,
        onclick: 'document.querySelector(\'.modal-bg.open\')?.remove();go(\'bible\');setTimeout(()=>setBibleTab(\'prayer\'),100)'
      });
    }
  });
  
  if(!results.length){
    box.innerHTML = '<p style="font-size:13px;color:var(--tx3);text-align:center;padding:30px 12px;font-style:italic">Nothing found for "' + q.replace(/</g, '&lt;') + '". Try a different word.</p>';
    return;
  }
  
  // Sort: journal/examen first (richest content), then verses, then wins, then prayers
  const order = {Journal: 1, Examen: 2, Verse: 3, Win: 4};
  results.sort((a, b) => (order[a.source.split(' ')[0]] || 5) - (order[b.source.split(' ')[0]] || 5));
  
  // Highlight matched word in preview
  const highlight = (text, q) => {
    if(!text) return '';
    const safe = text.replace(/</g, '&lt;');
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return safe.replace(re, '<mark style="background:rgba(200,169,110,0.25);color:var(--tx);padding:0 2px;border-radius:2px">$1</mark>');
  };
  
  // Take 1-line preview around the match
  const previewText = (body, q) => {
    if(!body) return '';
    const idx = body.toLowerCase().indexOf(q);
    if(idx === -1) return body.slice(0, 140) + (body.length > 140 ? '…' : '');
    const start = Math.max(0, idx - 40);
    const end = Math.min(body.length, idx + q.length + 100);
    return (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '');
  };
  
  box.innerHTML = '<div class="eyebrow" style="margin-bottom:8px">' + results.length + ' result' + (results.length===1?'':'s') + '</div>' +
    results.slice(0, 60).map(r => {
      const preview = previewText(r.body, q);
      return '<div onclick="' + r.onclick + '" style="background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:10px 12px;margin-bottom:6px;cursor:pointer">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:' + r.sourceColor + ';text-transform:uppercase;letter-spacing:0.1em">' + r.source + '</div>' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3)">' + r.date + '</div>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--tx2);line-height:1.55' + (r.verse ? ';font-family:Cormorant Garamond,serif;font-style:italic;font-size:13px' : '') + '">' + highlight(preview, q) + '</div>' +
      '</div>';
    }).join('');
}

// ── FULL BACKUP / RESTORE ─────────────────────────────────────
// Downloads every ToTry key as one JSON file — the safety net against device loss or
// sync failure. Restore reads it back. Uses SYNC_KEYS as the canonical list of app data.
async function exportFullBackup(){
  const data = {};
  let count = 0;
  SYNC_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if(v !== null){ data[k] = v; count++; }
  });
  const backup = {
    app: 'ToTry',
    version: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'v40'),
    exportedAt: new Date().toISOString(),
    keyCount: count,
    data: data
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
  // The one SaveFile caller that threw its result away, so a CANCELLED share sheet and an outright
  // failed write both produced "Backup saved". Its sibling exportAllData already does this correctly.
  const _r = await SaveFile.save(blob, 'totry-backup-' + new Date().toISOString().slice(0,10) + '.json', 'To Try backup');
  if(_r === null) return;                                   // dismissed — they chose; say nothing
  if(!_r){ showToast('Not saved', 'Nothing was written. Try again in a moment.'); return; }
  // Name the exclusions. Progress photos and un-backed-up cycle data never leave the device by design
  // (see the privacy policy), so a "full backup" does not contain them — and someone about to wipe their
  // phone needs to know that BEFORE they wipe it, not after.
  const _omitted = [];
  try{ if((ls('totry_progress_photos')||[]).length) _omitted.push('progress photos'); }catch(_){}
  try{ const _c=ls('totry_cycle'); if(_c && !_c.backup && (_c.log||[]).length) _omitted.push('cycle data'); }catch(_){}
  showToast('Backup saved', count + ' data sets downloaded.' +
    (_omitted.length ? ' Not included: ' + _omitted.join(' and ') + ' — those stay on this device only.' : ' Keep it somewhere safe.'));
  haptic('success');
}

function restoreFullBackup(event){
  const file = event.target.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const backup = JSON.parse(e.target.result);
      if(!backup || String(backup.app||'').replace(/\s+/g,'') !== 'ToTry' || !backup.data){
        showToast('Not a ToTry backup', 'That file isn\'t a valid ToTry backup.');
        event.target.value = '';
        return;
      }
      const keys = Object.keys(backup.data);
      // Confirm before overwriting — this replaces current data
      const m = document.createElement('div');
      m.className = 'modal-bg open';
      m.style.alignItems = 'center';
      m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
        '<h3 style="margin-bottom:6px">Restore this backup?</h3>' +
        '<p style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:8px">From <strong>' + (backup.exportedAt ? new Date(backup.exportedAt).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'}) : 'unknown date') + '</strong> · ' + keys.length + ' data sets.</p>' +
        '<p style="font-size:12px;color:var(--re);line-height:1.5;margin-bottom:14px">This replaces your current data on this device with the backup. Your cloud will then sync to match.</p>' +
        '<button class="btn primary" onclick="confirmRestore()" style="margin-bottom:8px">Yes, restore it</button>' +
        '<button class="btn" onclick="closeModal(this);window.__pendingRestore=null" style="background:transparent;border:1px solid var(--bd)">Cancel</button>' +
      '</div>';
      document.body.appendChild(m);
      window.__pendingRestore = backup.data;
    }catch(err){
      console.error('Restore parse failed:', err);
      showToast('Restore failed', 'Couldn\'t read that backup file.');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function confirmRestore(){
  const data = window.__pendingRestore;
  if(!data){ document.querySelector('.modal-bg.open')?.remove(); return; }
  // FILTERED, like importAllData (restoreKeys does the filtering for both). v430 closed this on export
  // and on the secondary import path, but this is the restore half of the prominent Settings pair and it
  // wrote every key in the file verbatim — including totry_auth_session. Restoring someone else's backup
  // installed THEIR live session on this device: the account-takeover direction the BACKUP_NEVER comment
  // already warns about. It also had no totry_ prefix check at all, so any key in a hand-edited file
  // landed in localStorage.
  const r = restoreKeys(data);
  window.__pendingRestore = null;
  document.querySelector('.modal-bg.open')?.remove();
  const rep = restoreReport(r);
  showToast(r.failed.length ? rep.title : 'Restored ✓', rep.body);
  haptic(r.failed.length ? 'warning' : 'celebrate');
  setTimeout(() => window.location.reload(), r.failed.length ? 5600 : 1400);
}

function exportJournal(){
  const entries=ls('totry_journal')||[];if(!entries.length){showToast('No entries','Write journal entries first.');return;}
  const text=entries.map(e=>'=== '+e.date+' (Day '+e.day+') ===\nMood: '+e.mood+'\n\n'+e.text+'\n').join('\n\n');
  copyToClipboard(text);showToast('Copied!',entries.length+' entries copied to clipboard.');
}
function exportWins(){
  const wins=ls('totry_wins')||[];if(!wins.length){showToast('No wins','Log some wins first.');return;}
  const text=wins.map(w=>'\u2b50 Day '+w.day+' \u2014 '+w.date+'\n'+w.text).join('\n\n');
  copyToClipboard(text);showToast('Copied!',wins.length+' wins copied to clipboard.');
}
function copyToClipboard(text){
  if(navigator.clipboard){navigator.clipboard.writeText(text).catch(()=>fallbackCopy(text));}else fallbackCopy(text);
}
function fallbackCopy(text){
  const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');document.body.removeChild(ta);
}
function resetAll(){
  // SAY WHAT THIS ACTUALLY DOES. It clears localStorage and nothing else — the account, and everything
  // already synced to it, survives — while the old text promised "permanently delete ALL your data".
  // Someone reaching for this button is usually trying to erase something they regret, and telling them
  // it is gone when it is on a server is the worst possible moment to be imprecise.
  const _signedIn = !!(typeof currentUser !== 'undefined' && currentUser);
  if(!confirm('Start fresh on this device?\n\nThis clears everything stored on THIS PHONE.' +
    (_signedIn
      ? '\n\nYour account and anything already synced to it are NOT deleted — signing in again will bring the synced data back. To delete the account itself, use Settings \u2192 Delete account permanently.'
      : '\n\nIf you have an account, anything already synced to it is NOT deleted.')))return;
  if(!confirm('Last check \u2014 clear this device and start fresh?'))return;
  Object.keys(localStorage).filter(k=>k.startsWith('totry_')||k.startsWith('strava_')).forEach(k=>localStorage.removeItem(k));
  window.location.reload();
}

// ── PWA INSTALL ───────────────────────────────────────────────
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',(e)=>{
  e.preventDefault();deferredInstallPrompt=e;
  if(!isNativeApp() && !ls('totry_pwa_dismissed'))setTimeout(()=>{const b=document.getElementById('pwa-banner');if(b)b.style.display='block';},2000);
});
window.addEventListener('appinstalled',()=>{ls('totry_pwa_installed',true);showToast('To Try installed \u2713','Find it on your home screen.');});

function isIOSSafari(){const ua=navigator.userAgent;return /iP(ad|hone|od)/.test(ua)&&/WebKit/.test(ua)&&!/(CriOS|FxiOS|OPiOS|mercury)/.test(ua);}
// ── "IS THIS AN INSTALLED APP, OR A BROWSER TAB?" ────────────────────────────────────────────────
// Every functional use of this asks that question, and the old answer was wrong in the one place it
// matters most: inside the native App Store build. A Capacitor WKWebView reports display-mode
// "browser", and navigator.standalone is a Safari-only property that is undefined there — so
// isStandalone() returned FALSE in the native app while isIOSSafari() returned TRUE (the user agent
// genuinely says iPhone + WebKit).
//
// The result, confirmed on a device: the native app told people to
//   "Install To Try on your iPhone — 1. Tap the Share button at the bottom of Safari"
// inside an app that has no Safari and no Share button, and the notification settings told them to add
// the app to their Home Screen before reminders would work. It also silently withheld the daily
// "good to see you back" greeting from native users, because that was gated on the same check.
//
// A native build IS the installed app, so it answers true. isNativeApp() stays separate for the cases
// that genuinely mean "has native APIs" (HealthKit, local notifications) rather than "is installed".
function isNativeApp(){
  try{ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  catch(_){ return false; }
}
function isStandalone(){
  if(isNativeApp()) return true;
  return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
}
function checkIOSInstall(){
  if(isNativeApp() || !isIOSSafari() || isStandalone() || ls('totry_pwa_dismissed')) return;
  
  // Show on first open after 8 seconds, then every 3 days if still not installed/dismissed
  const lastShown = ls('totry_ios_shown_ts') || 0;
  const daysSince = (Date.now() - lastShown) / 86400000;
  const isFirstTime = !lastShown;
  
  if(isFirstTime || daysSince >= 3){
    setTimeout(() => {
      const b = document.getElementById('ios-install-banner');
      if(b && !isStandalone()){
        b.style.display = 'block';
        ls('totry_ios_shown_ts', Date.now());
      }
    }, isFirstTime ? 8000 : 5000);
  }
}
function dismissPWA(){
  ls('totry_pwa_dismissed',true);
  ['pwa-banner','ios-install-banner'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
}
async function requestPersistentStorage(){if(navigator.storage&&navigator.storage.persist){await navigator.storage.persist();}}

