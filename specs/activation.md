# IMPLEMENTATION SPEC — v344 · "Activation & the push that doesn't nag"

All anchors verified against `/Users/alfredjohn/Desktop/ToTry/index.html` (35,634 lines, v343).

---

## 1. WHAT IT IS

**(a) The First Felt Moment.** The signed-up first run now ends in the Feeling Door itself — the real chips, the real move — instead of explainer screens then an empty Home. *The moment: someone just made an account and has no idea what this app actually does for them.*

**(b) The Receptivity Gate.** `scheduleReachOut` stops being a daily alarm and becomes a JITAI: quiet hours, likely-asleep, just-used-the-app, one-per-day, 3-per-week cap, and a stand-down when the channel goes cold. *The moment: 1:40am, the app is closed, and the choice is buzz-or-hold.*

---

## 2. EXACT ANCHORS

| # | Anchor (verbatim) | ~Line | Action |
|---|---|---|---|
| A1 | `    <button class="btn primary" style="margin-top:8px" onclick="obNext('ob-what')">Begin &#8594;</button>` | 1145 | REPLACE (change target to `2`) |
| A2 | `    <button class="btn primary" onclick="obNext(2)">I'm in &#8594;</button>` | 1174 | REPLACE (change to `obNextToApps()`) |
| A3 | `    <button class="btn primary" onclick="obNextToApps()">Continue &#8594;</button>` | 1180 | REPLACE (change to `obNextToMoment()`) |
| A4 | `  <!-- NEW STEP: Apps you already use -->` | 1183 | INSERT **BEFORE** — new `ob-moment` step |
| A5 | `function obNextToApps(){` | 7093 | INSERT **BEFORE** — block A-JS |
| A6 | `async function finishOnboard(){` | 7234 | REPLACE function (adds `opts.quiet`) |
| B1 | `  async schedule(id, title, body, when){` | 5126 | REPLACE (add `extra` param) |
| B2 | `          await L.schedule({ notifications: [{ id: (typeof id==='number'?id:Math.abs(_hashId(id))), title, body, schedule: { at: when, allowWhileIdle: true }, smallIcon: 'ic_stat_icon', }] });` | 5131 | REPLACE (pass `extra`) |
| B3 | Everything from `function scheduleReachOut(){` (5284) up to but **not including** `function _hashId(str){` | 5284–5310 | REPLACE with block B-JS |
| B4 | `        else if(ex.route === 'reachout'){ if(typeof _feelThePull==='function') _feelThePull(); else if(typeof openCompanionForUrge==='function') openCompanionForUrge(); else if(typeof go==='function') go('home'); }` | 5331 | REPLACE (add `_reachOutResponded()`) |
| B5 | `  'totry_rosaries'` | 4603 | REPLACE (append new keys) |
| B6 | `  try{ if(typeof runSchemaMigrations === 'function') runSchemaMigrations(); }catch(_){ }` | 30876 | INSERT **AFTER** — two calls |
| B7 | `        (ls('totry_v')||[]).forEach((v,i)=>Notify.cancel('reachout_'+i));` | 30670 | REPLACE with `_cancelReachOuts();` |
| B8 | `      (ls('totry_v')||[]).forEach((v,i)=>{ if(typeof Notify!=='undefined' && Notify.cancel) Notify.cancel('reachout_'+i); });` | 30791 | REPLACE with `_cancelReachOuts(); _setReachState({pausedUntil:0});` |
| B9 | **NATIVE** branch, the 4 lines beginning `        '<div style="border-top:1px solid var(--bd);margin:6px 0 10px;padding-top:12px;display:flex;align-items:center;justify-content:space-between;gap:12px">' +` through `        '</div>' +` | 30741–30744 | REPLACE with `_reachOutRowHTML() +` |
| B10 | **WEB** branch: the comment line `      // Reach-out-first — the one thing a web PWA could never do; real once wrapped natively.` plus the 4 lines after it, ending `      '</div>' +` | 30771–30775 | REPLACE with `_reachOutRowHTML() +` |
| B11 | `function toggleReachOut(){` | 30787 | REPLACE function |

---

## 3. THE CODE

### A1 (line 1145)
```html
    <button class="btn primary" style="margin-top:8px" onclick="obNext(2)">Begin &#8594;</button>
```
### A2 (line 1174)
```html
    <button class="btn primary" onclick="obNextToApps()">I'm in &#8594;</button>
```
### A3 (line 1180)
```html
    <button class="btn primary" onclick="obNextToMoment()">Continue &#8594;</button>
```

### A4 — insert BEFORE line 1183
```html
  <!-- THE FIRST FELT MOMENT. A guest reaches the Feeling Door in ~10 seconds (enterAsGuest). Someone
       who made an ACCOUNT used to get explainer screens then an empty Home — so the best thing in the
       app was hidden from the people most likely to stay. This IS the door, inline, rendered from the
       same FEELINGS array and running the same real move. Not a wall: there is a way past, below. -->
  <div class="ob-step" id="ob-moment">
    <div class="ob-title" id="ob-moment-title" style="margin-bottom:6px">Before anything else &mdash; how are you right now?</div>
    <div class="ob-desc" style="margin-bottom:20px">This is the app. Not the setup &mdash; this. Tap whatever&rsquo;s closest and I&rsquo;ll meet you there. No right answer, nothing to fill in.</div>
    <div class="feel-grid" id="ob-moment-grid"></div>
    <button class="btn" onclick="obSkipMoment()" style="background:transparent;border:none;color:var(--tx3);font-size:12.5px;margin-top:16px">Nothing right now &mdash; show me around &#8594;</button>
  </div>
```
*Reuses existing CSS `.feel-grid` / `.feel-chip` / `.feel-chip-emoji|label|sub` (lines 254–259). No new CSS.*

### A5 — insert BEFORE line 7093 (`function obNextToApps(){`)
```js
// ── THE FIRST FELT MOMENT ─────────────────────────────────────────────────────
// The signed-up path's aha. The name step earns its place because it changes THIS screen — nothing
// else asked here would, so nothing else is asked here. Rendered from FEELINGS (one source of truth,
// same chips as renderFeelingDoor) so the founder's demo and the real door can never drift apart.
function obNextToMoment(){
  const el = document.getElementById('ob-name');
  const n = el ? el.value.trim() : '';
  if(!n){ if(el) el.style.borderColor = 'var(--re)'; return; }
  try{ userName = n; }catch(_){}
  ls('totry_name', n);
  renderObMoment();
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  document.getElementById('ob-moment').classList.add('active');
  document.querySelectorAll('.ob-dot').forEach((d,i) => d.classList.toggle('on', i < 2));
  window.scrollTo(0,0);
}
function renderObMoment(){
  const first = (ls('totry_name')||'').trim().split(' ')[0];
  const t = document.getElementById('ob-moment-title');
  // First name only, and it goes in via textContent — never innerHTML.
  if(t) t.textContent = first ? ('Before anything else, '+first+' — how are you right now?')
                              : 'Before anything else — how are you right now?';
  const grid = document.getElementById('ob-moment-grid');
  if(!grid || typeof FEELINGS === 'undefined') return;
  grid.innerHTML = '';
  FEELINGS.forEach(function(f){
    const b = document.createElement('button');
    b.className = 'feel-chip';
    // f.emoji/label/sub are app constants, not user text — same as renderFeelingDoor.
    b.innerHTML = '<span class="feel-chip-emoji">'+f.emoji+'</span><span class="feel-chip-label">'+f.label+'</span><span class="feel-chip-sub">'+f.sub+'</span>';
    b.onclick = function(){ _obFirstMoment(f.id); };
    grid.appendChild(b);
  });
}
// Finish setup FIRST so nothing is trapped behind the onboarding overlay, THEN run the real move.
// The move ends where it always ends — theRelease, or a closed modal on Home. No new dead end.
async function _obFirstMoment(id){
  try{ if(typeof haptic==='function') haptic('light'); }catch(_){}
  try{ if(typeof _recordFeeling==='function') _recordFeeling(id); }catch(_){}
  try{ ls('totry_first_moment', { id:id, ts:Date.now() }); }catch(_){}
  try{ if(typeof logEvent==='function') logEvent('first_moment', { feeling:id }); }catch(_){}
  try{ if(typeof finishOnboard==='function') await finishOnboard({ quiet:true }); }catch(_){}
  setTimeout(function(){
    try{
      const f = (typeof FEELINGS!=='undefined') ? FEELINGS.find(function(x){ return x.id===id; }) : null;
      if(f && typeof f.act==='function') f.act();
      else if(typeof openCompanionForUrge==='function') openCompanionForUrge();
    }catch(_){}
  }, 480);
}
// Not everyone arrives feeling something, and pressing them to would be the opposite of this app.
// The way past is a door, not a skip-button-shaped wall: it goes to the tour they used to get first.
function obSkipMoment(){
  try{ if(typeof logEvent==='function') logEvent('first_moment_skip'); }catch(_){}
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  document.getElementById('ob-what').classList.add('active');
  window.scrollTo(0,0);
}
```

### A6 — replace `finishOnboard` (line 7234)
```js
async function finishOnboard(opts){
  ls('totry_onboarded',true);
  ls('totry_start',new Date().toISOString());
  // Suppress the companion auto-check-in for this first session — a brand-new user shouldn't be
  // greeted with "what's pulling at you?" seconds after finishing setup. It returns next open.
  try{ sessionStorage.setItem('totry_just_onboarded','1'); }catch(_){}
  document.getElementById('onboard').style.display='none';
  await initApp();
  // Show home tab
  if(typeof go === 'function') go('home');
  // A celebration haptic on top of "I'm heavy" would be tone-deaf. When setup ends INSIDE a felt
  // moment (the first-moment path) we finish quietly and let the move carry the feeling.
  haptic((opts && opts.quiet) ? 'light' : 'celebrate');
}
```

---

### B1/B2 — `Notify.schedule` gains `extra` (lines 5126, 5131)
```js
  async schedule(id, title, body, when, extra){
```
```js
          await L.schedule({ notifications: [{ id: (typeof id==='number'?id:Math.abs(_hashId(id))), title, body, schedule: { at: when, allowWhileIdle: true }, smallIcon: 'ic_stat_icon', extra: extra||null }] });
```

### B3 — replace lines 5284–5310 (the whole old `scheduleReachOut`)
```js
// ── THE RECEPTIVITY GATE (JITAI) — vulnerable AND receptive, or don't send ───────────────────────
// A nudge at a known risk window still fails if the person can't receive it — and a failed nudge
// doesn't cost nothing, it burns the channel: they turn notifications off, and then we can never
// reach them at the moment that matters. So a reach-out is armed only after it passes a gate:
// quiet hours, likely-asleep, already-in-the-app, one per day, a hard weekly cap, and a stand-down
// when the last few went unanswered. When the gate HOLDS, the presence isn't lost —
// _maybeRiskWindowGreeting still meets them in-app the moment they open inside that window.
const REACHOUT_MAX_PER_WEEK = 3;                              // presence, not a daily alarm
const REACHOUT_QUIET_DEFAULT = { start:'22:00', end:'07:00' };
const REACHOUT_STANDDOWN_DAYS = 14;

function quietHours(){ const q=ls('totry_quiet_hours'); return (q&&q.start&&q.end)?q:REACHOUT_QUIET_DEFAULT; }
function _hm(t,dh,dm){ const a=String(t||'').split(':'); const h=parseInt(a[0],10), m=parseInt(a[1],10); return (isNaN(h)?dh:h)*60+(isNaN(m)?dm:m); }
function _reachState(){ const s=ls('totry_reachout_state'); return (s&&typeof s==='object')?s:{next:null,hold:null,pausedUntil:0}; }
function _setReachState(patch){ try{ const s=_reachState(); Object.assign(s,patch,{ts:Date.now()}); ls('totry_reachout_state',s); }catch(_){} }
function _reachPaused(){ return (_reachState().pausedUntil||0) > Date.now(); }
function _touchActive(){ try{ ls('totry_last_active_ts', Date.now()); }catch(_){} }
function _usedRecently(mins){ const t=parseInt(ls('totry_last_active_ts')||'0',10); return t>0 && (Date.now()-t) < (mins||90)*60000; }

// We never GUESS that someone is asleep. We use the hours THEY set — the app must not claim to know
// something it cannot know. A short logged night only widens that band by an hour either side.
function _inQuiet(min){ const q=quietHours(); const s=_hm(q.start,22,0), e=_hm(q.end,7,0); return (s<e)?(min>=s&&min<e):(min>=s||min<e); }
function _likelyAsleep(min){
  if(_inQuiet(min)) return true;
  try{ const life=(typeof getLifeState==='function')?getLifeState():null;
    if(life && life.sleep && life.sleep.short) return _inQuiet((min+60)%1440) || _inQuiet((min+1380)%1440);
  }catch(_){}
  return false;
}
// If the hard hour sits inside their night we don't buzz at 1:40am — we come to the NEARER edge of
// the quiet band (just before it starts, or just after they're up) and the message says why.
// Returns {min, shifted:-1|0|1} or null when their whole receptive band is quiet (→ hold).
function _receptiveTime(min){
  if(!_likelyAsleep(min)) return { min:min, shifted:0 };
  const q=quietHours(); const s=_hm(q.start,22,0), e=_hm(q.end,7,0);
  const before=(s-20+1440)%1440, after=(e+10)%1440;
  const back=(min-before+1440)%1440, fwd=(after-min+1440)%1440;
  const cand=(fwd<=back)?{min:after,shifted:1}:{min:before,shifted:-1};
  return _likelyAsleep(cand.min) ? null : cand;
}

function _reachLog(){ try{ const a=ls('totry_reachout_log'); return Array.isArray(a)?a:[]; }catch(_){ return []; } }
function _saveReachLog(a){ try{ ls('totry_reachout_log', a.slice(-60)); }catch(_){} }
function _reachCount7(){ const now=Date.now(), wk=now-7*86400000; return _reachLog().filter(function(e){ return e && e.ts<=now && e.ts>=wk; }).length; }
// Channel health: three armed reach-outs in a row that were never answered means the channel is
// going cold. Stand down for two weeks rather than keep spending their attention — and say so.
function _reachUnansweredRun(){ const d=_reachLog().filter(function(e){ return e && e.opened!=null; }); let r=0; for(let i=d.length-1;i>=0;i--){ if(d[i].opened===false) r++; else break; } return r; }
function _cancelReachOuts(){ try{ if(typeof Notify!=='undefined' && Notify.cancel){ for(let i=0;i<3;i++) Notify.cancel('reachout_'+i); } }catch(_){} }
function _reachHold(why){ _setReachState({ next:null, hold:why }); _cancelReachOuts(); return 0; }
function _wonMomentToday(){ try{ const m=(ls('totry_moments_won')||[])[0]; if(!m||!m.ts) return false; return new Date(m.ts).toLocaleDateString('en-AU')===new Date().toLocaleDateString('en-AU'); }catch(_){ return false; } }
// A tap is the strongest receptivity signal we can get. Mark it against the newest unresolved nudge.
function _reachOutResponded(){ try{ const a=_reachLog(); for(let i=a.length-1;i>=0;i--){ if(a[i]&&a[i].opened==null&&a[i].ts<=Date.now()){ a[i].opened=true; break; } } _saveReachLog(a); }catch(_){} }
// Runs on every app open: did the ones we sent actually land?
function _resolveReachOuts(){
  try{
    const now=Date.now(); const a=_reachLog(); let changed=false;
    a.forEach(function(e){ if(!e||e.opened!=null||e.ts>now) return; e.opened=(now-e.ts)<=45*60000; changed=true; });
    if(changed) _saveReachLog(a);
    if(_reachUnansweredRun()>=3 && !_reachPaused()){
      _setReachState({ pausedUntil: Date.now()+REACHOUT_STANDDOWN_DAYS*86400000, next:null, hold:null });
      _cancelReachOuts();
    }
  }catch(_){}
}
// Choice-first words. A short night changes the MESSAGE rather than suppressing it — that's the one
// line only a whole-life app can say. No faith content here: this reaches everyone.
function _reachBody(hi, viceName, shifted){
  let s='';
  try{ const life=(typeof getLifeState==='function')?getLifeState():null;
    if(life && life.sleep && life.sleep.short) s=' You slept short — cravings lie louder on a short night. Go gentle today.';
  }catch(_){}
  if(shifted===-1) return hi+'the hard stretch with '+viceName+' usually comes later tonight. I won’t buzz you at that hour — so here’s the door now, while it’s easy to walk through.'+s;
  if(shifted===1)  return hi+'the hard stretch with '+viceName+' usually lands while you’re meant to be asleep. I’m not waking you for it — but the day’s starting, and I’m here.'+s;
  return hi+'this is usually when it gets hardest with '+viceName+'. Nothing has to happen — I’m just here. Open me if anything’s rising.'+s;
}

const _REACH_WIN_START = { 'late night':0, 'morning':6, 'afternoon':12, 'evening':17, 'night':21 };
function scheduleReachOut(){
  try{
    const _remindersOn = (typeof _pushPrefs==='function' && _pushPrefs().enabled)
      || ls('totry_notif_enabled') || ls('totry_notif_perm') === 'granted';
    if(!_remindersOn) return _reachHold('reminders are off');
    if(ls('totry_reachout_off')) return _reachHold('you turned this off');
    if(_reachPaused()) return _reachHold('standing down — the last few went unanswered, so I’ve stopped spending your attention');
    if(_reachCount7() >= REACHOUT_MAX_PER_WEEK) return _reachHold('already reached out '+REACHOUT_MAX_PER_WEEK+' times this week — that’s the ceiling');
    if(typeof loadV==='function') loadV();
    const vs = (typeof vices!=='undefined' && Array.isArray(vices)) ? vices : (ls('totry_v')||[]);
    // ONE reach-out, not one per vice. Four named fights used to mean four notifications a day —
    // exactly the pattern that gets an app muted. Take the single strongest learned window.
    let best=null;
    vs.forEach(function(v){
      if(!v||!v.n) return;
      const p=(typeof analyzeUrgePatterns==='function')?analyzeUrgePatterns(v.n):null;
      if(!p||!p.riskWindow) return;
      if(!best || p.total>best.p.total) best={v:v,p:p};
    });
    if(!best) return _reachHold('not enough logged moments yet for me to honestly know your hard hour');
    const key=Object.keys(_REACH_WIN_START).find(function(k){ return best.p.riskWindow.toLowerCase().includes(k); });
    if(!key) return _reachHold('your hard hour isn’t clear enough yet');
    const planned=(_REACH_WIN_START[key]*60 - 20 + 1440)%1440;
    const rt=_receptiveTime(planned);
    if(!rt) return _reachHold('your hard hour sits inside your quiet hours — I’ll meet you here instead, in the app');

    // Arm up to three single occurrences (re-armed on every open) rather than a blind daily repeat,
    // so "they're already here" and "they already won this one" can actually cancel a nudge.
    const now=Date.now();
    const past=_reachLog().filter(function(e){ return e && e.ts<=now; });   // drop unfired plans; re-arm below
    const remaining=Math.max(0, REACHOUT_MAX_PER_WEEK-_reachCount7());
    const slots=[]; const d0=new Date();
    for(let d=0; d<3 && slots.length<Math.min(3,remaining); d++){
      const t=new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()+d, Math.floor(rt.min/60), rt.min%60, 0, 0);
      if(t.getTime() <= now+10*60000) continue;                                        // already gone
      if(d===0 && _usedRecently(90) && (t.getTime()-now) < 90*60000) continue;          // they're here now
      if(d===0 && _wonMomentToday()) continue;                                          // already met today
      if(past.some(function(e){ return Math.abs(e.ts-t.getTime()) < 12*3600000; })) continue; // never twice a day
      slots.push(t);
    }
    if(!slots.length) return _reachHold('you’ve already been here today — no need for me to buzz');

    _cancelReachOuts();
    const first=(ls('totry_name')||'').trim().split(' ')[0];
    const body=_reachBody(first?first+', ':'', String(best.v.n), rt.shifted);
    const native=!!(typeof Notify!=='undefined' && Notify.isNative && Notify.isNative());
    const log=past.slice();
    slots.forEach(function(t,i){
      // Web can't background-fire, and Notify.schedule's web fallback grows totry_notif_pending
      // unbounded — so on web we compute and SHOW the plan without queueing anything.
      if(native) Notify.schedule('reachout_'+i, 'To Try', body, t, { route:'reachout', vice:best.v.n });
      log.push({ ts:t.getTime(), vice:String(best.v.n), opened:null });
    });
    _saveReachLog(log);
    _setReachState({ next: slots[0].getTime(), hold: null });
    return slots.length;
  }catch(_){ return 0; }
}

// One shared Settings row for both branches of renderPushSettings (they were duplicated). It shows
// the person EXACTLY what the gate is doing — a channel that restrains itself has to prove it, or
// "we won't nag you" is only a claim.
function _reachOutRowHTML(){
  const on=!ls('totry_reachout_off'); const q=quietHours(); const st=_reachState();
  let status;
  if(!on) status='Off. Nothing is scheduled.';
  else if(_reachPaused()) status='Standing down until '+new Date(st.pausedUntil).toLocaleDateString('en-AU')+' — the last few went unanswered, so I stopped.';
  else if(st.next && st.next>Date.now()) status='Next: '+new Date(st.next).toLocaleString('en-AU',{weekday:'short',hour:'numeric',minute:'2-digit'})+' · '+_reachCount7()+' of '+REACHOUT_MAX_PER_WEEK+' used this week.';
  else if(st.hold) status='Holding — '+st.hold+'.';
  else status='Nothing scheduled right now.';
  return '<div style="border-top:1px solid var(--bd);margin:6px 0 10px;padding-top:12px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">'+
      '<div style="flex:1"><div style="font-size:13px;color:var(--tx);font-weight:500">Reach out to me first</div>'+
      '<div style="font-size:11px;color:var(--tx3);line-height:1.45">A quiet check-in before your hardest hour — learned from your own patterns. At most '+REACHOUT_MAX_PER_WEEK+' a week, never in your quiet hours, never when you’ve just been here.</div></div>'+
      '<button type="button" onclick="toggleReachOut()" style="padding:7px 14px;border-radius:100px;border:1px solid '+(on?'var(--go-bd)':'var(--bd)')+';background:'+(on?'var(--go-bg)':'transparent')+';color:'+(on?'var(--go)':'var(--tx2)')+';font-size:12px;white-space:nowrap">'+(on?'On':'Off')+'</button>'+
    '</div>'+
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);line-height:1.6;margin-top:8px">'+_escFew(status)+'</div>'+
    '<div style="display:flex;gap:8px;align-items:flex-end;margin-top:10px">'+
      '<div style="flex:1"><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">Quiet from</div><input type="time" id="quiet-start" value="'+q.start+'" style="width:100%;padding:9px;color-scheme:dark"></div>'+
      '<div style="flex:1"><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">Until</div><input type="time" id="quiet-end" value="'+q.end+'" style="width:100%;padding:9px;color-scheme:dark"></div>'+
      '<button class="btn" onclick="saveQuietHours()" style="flex:0 0 auto;margin:0;background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go);font-size:12px;padding:9px 12px">Save</button>'+
    '</div>'+
    '<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-top:6px">Nothing reaches you between these hours. If your hard hour falls inside them I come to the nearer edge instead — and the message says why.</div>'+
  '</div>';
}
function saveQuietHours(){
  const s=(document.getElementById('quiet-start')||{}).value || '22:00';
  const e=(document.getElementById('quiet-end')||{}).value || '07:00';
  ls('totry_quiet_hours',{start:s,end:e});
  if(typeof scheduleReachOut==='function') scheduleReachOut();
  if(typeof haptic==='function') haptic('tap');
  if(typeof showToast==='function') showToast('Quiet hours saved','Nothing will reach you between '+s+' and '+e+'.');
  if(typeof renderPushSettings==='function') renderPushSettings();
}
```

### B4 (line 5331)
```js
        else if(ex.route === 'reachout'){ try{ if(typeof _reachOutResponded==='function') _reachOutResponded(); }catch(_){} if(typeof _feelThePull==='function') _feelThePull(); else if(typeof openCompanionForUrge==='function') openCompanionForUrge(); else if(typeof go==='function') go('home'); }
```

### B5 (line 4603)
```js
  'totry_rosaries',
  // v344 — the first felt moment, and the receptivity gate under the reach-out.
  'totry_first_moment','totry_quiet_hours','totry_reachout_log','totry_reachout_state','totry_last_active_ts'
```

### B6 — insert AFTER line 30876
```js
  // Receptivity bookkeeping, first thing: mark that they're here (so nothing buzzes them while they
  // are), then judge whether the reach-outs we already sent actually landed.
  try{ if(typeof _touchActive==='function') _touchActive(); }catch(_){}
  try{ if(typeof _resolveReachOuts==='function') _resolveReachOuts(); }catch(_){}
```

### B7 (line 30670) / B8 (line 30791) / B9 (30741–30744) / B10 (30771–30775)
```js
        _cancelReachOuts();
```
```js
      _cancelReachOuts(); _setReachState({pausedUntil:0});
```
B9 and B10 both become exactly (matching each branch's own indentation):
```js
        _reachOutRowHTML() +
```

### B11 — replace `toggleReachOut` (line 30787)
```js
// Turn the risk-window reach-out on/off. Anti-nagging is sacred — the person is always in control,
// and turning it back on clears any stand-down, because a choice they make now outranks our caution.
function toggleReachOut(){
  const turningOff = !ls('totry_reachout_off');
  ls('totry_reachout_off', turningOff);
  try{
    if(turningOff){ _cancelReachOuts(); _setReachState({ next:null, hold:'you turned this off' }); }
    else { _setReachState({ pausedUntil:0, hold:null }); if(typeof scheduleReachOut==='function') scheduleReachOut(); }
  }catch(_){}
  if(typeof haptic==='function') haptic('tap');
  if(typeof renderPushSettings==='function') renderPushSettings();
  showToast(turningOff?'Reach-out off':'Reach-out on', turningOff?'I won’t message you at your risk window.':'I’ll check in before your hardest hour — at most 3 times a week, never in your quiet hours.');
}
```

**Helpers reused, not rewritten:** `ls`, `_escFew`, `showToast`, `haptic`, `logEvent`, `closeModal`, `FEELINGS`, `_recordFeeling`, `_feelMove`/`_feelThePull` (via `f.act()`), `finishOnboard`, `getLifeState().sleep`, `analyzeUrgePatterns`, `_viceBlockLabel`, `Notify.schedule/cancel`, `_pushPrefs`, `totry_moments_won`, `_maybeRiskWindowGreeting` (the in-app HOLD delivery — untouched).

---

## 4. STORAGE KEYS

All five must be added to `SYNC_KEYS` (edit B5) or they are lost on reinstall.

| Key | Shape |
|---|---|
| `totry_first_moment` | `{id:'restless', ts:1723276800000}` — which feeling opened their story |
| `totry_quiet_hours` | `{start:'22:00', end:'07:00'}` — a rhythm preference, so it follows the person |
| `totry_reachout_log` | `[{ts:<planned ms>, vice:'Weed', opened:true|false|null}]`, capped 60 |
| `totry_reachout_state` | `{next:<ms>|null, hold:'<why>'|null, pausedUntil:<ms>, ts:<ms>}` |
| `totry_last_active_ts` | `1723276800000` |

`totry_push_prefs` stays unsynced (device permission) — unchanged. `totry_last_open` is deliberately untouched: it is already used with two conflicting shapes (ms at line 5409, a date string at 30963), which is why receptivity uses its own key.

---

## 5. DISCOVERY

**(a)** It *is* the signed-up first run. Email → code → **Begin** → **name** → the Feeling Door. Three taps, ~20 seconds, then a real move. *Video:* fresh email (or `localStorage.clear()` in the console), sign up, tap "Anxious", get the breath. Escape hatch "Nothing right now — show me around →" leads to the old tour.

**(b)** **Settings → Daily reminders card → "Reach out to me first"**. The row now carries a live status line (`Next: Thu 9:40 pm · 0 of 3 used this week` / `Holding — you've already been here today`) and **Quiet from / Until** time pickers with a Save button. *Video:* set quiet hours to 20:00–07:00, tap Save, watch the status flip to "Holding — your hard hour sits inside your quiet hours — I'll meet you here instead, in the app." Works in the browser: state is computed on web even though nothing is queued there. Needs a vice with **≥4** entries in `totry_fight_log` for `analyzeUrgePatterns` to return a window.

---

## 6. RISKS — verify after applying

1. **Parse-check + div balance.** A4 adds one `<div class="ob-step">` with one closing `</div>` plus one self-contained `<div class="feel-grid">`; count must stay balanced. B9/B10 each delete a `'<div …>' + … '</div>' +` string pair from inside JS string concatenation — a missed `+` or a stray quote here is the single likeliest breakage. Extract the big `<script>` and `node --check` before anything else.
2. **`renderPushSettings` string surgery.** B9 and B10 are near-identical blocks at different indentation; B10 is the one preceded by `// Reach-out-first — the one thing a web PWA could never do`. Do not `replace_all`.
3. **Onboarding routing.** After A1–A3, confirm all three paths still terminate: Begin→name→moment→(chip)→Home; Begin→name→moment→"show me around"→ob-what→"I'm in"→ob-apps→ob-fork→both fork buttons. `obNextToApps()` re-reads `#ob-name`, which is still populated on the tour path — verify it doesn't red-border and stall.
4. **No trap.** `_obFirstMoment` must `await finishOnboard({quiet:true})` **before** `f.act()`; if the order flips, the move's modal renders under the `#onboard` overlay and the user is stuck on a blank screen. Test the `pull` chip with zero vices (falls to `openCompanionForUrge`) and `heartache` (`openLettingGo`).
5. **Web `totry_notif_pending` growth.** `scheduleReachOut` runs on every open; the `native` guard around `Notify.schedule` is what stops it queueing 3 entries per open on the PWA. Do not remove it.
6. **Cancel-id parity.** Old ids were `reachout_0..N` per vice; new ones are `reachout_0..2`. A user upgrading from v343 on a wrapped build may hold stale `reachout_3+` schedules. Acceptable (they expire as one-shots never re-armed), but note it in the release; if the founder wants it clean, widen `_cancelReachOuts`'s loop to 8 once.
7. **`getLifeState()` cost.** `_likelyAsleep` and `_reachBody` call it; `scheduleReachOut` runs on every open and on every settings save. It's called at most twice per invocation — confirm no jank on a large `totry_nutlog`.
8. **House rules.** `npm test` (no core math touched, but the harness extracts real functions — keep it green). Bump `APP_VERSION` to `v344` in index.html and `CACHE` in sw.js together.
9. **Soul check.** No streak, no points, no badge; the cap only ever *reduces* contact; the stand-down takes nothing away and is reversible in one tap; `_reachBody` carries no faith content so it serves every tradition and both sexes; the first moment ends in the existing `theRelease` off-ramp wherever the chosen move already leads there.