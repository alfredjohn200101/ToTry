I've read the real code. Here is the spec.

---

# SPEC — THE FIGHT'S MISSING MAP (v344)

## 1. WHAT IT IS

Three additive fields on data that already exists, giving the Fight the map it lacks: **a daily pledge** ("today, not this" — re-made, never owed), **a stage of change** per vice that changes what the card offers and how `brotherSpeaks` sounds, and **an anchor cue** on a habit ("after I make my coffee").

The one moment: *the morning, before it starts pulling* — you open the app, say "today, not this," and the app stops handing you quit-tactics you're not ready for.

Everything stores on `totry_v` and `totry_h`, both already in `SYNC_KEYS`. **Zero new storage keys, zero migration.**

---

## 2. EXACT ANCHORS

| # | Anchor (verbatim) | ~Line | Where |
|---|---|---|---|
| A1 | `    <div style="display:flex;align-items:center;gap:8px">` … through … `    </div>` (the 4-line block inside `#morning-vice-card`, lines 1918–1921) | 1918–1921 | **REPLACE** with `      <div id="morning-pledge-body"></div>` |
| A2 | `      body = 'That\u2019s '+(d.count||'')+' \u2014 past the '+(d.limit||'line')+' you set.'+why+'No judgment. You set that line for a reason only you know. I\u2019m just checking: are you still in the driver\u2019s seat, or is this the thing taking the wheel?';` | 5652 | **REPLACE** (block B7) |
| A3 | `  // SECONDARY: vice fight (smaller, less prominent)` … through the closing `  }` of the `if(viceEl){…}` block (lines 9040–9055) | 9040–9055 | **REPLACE** with block B6 |
| A4 | `function saveV(){ls('totry_v',vices);}` | 9090 | **AFTER** → blocks B1–B5 |
| A5 | `      brotherSpeaks({ kind:'viceOver', detail:{ count: s.count + ' ' + unit, limit: thr + ' ' + unit } });` | 11777 | **REPLACE** with the same line plus `vice: v.n,` (block B8) |
| A6 | `        '<div style="font-size:11px;color:var(--tx3);margin-bottom:10px">Usually: ' + (v.t \|\| 'various times').replace(/</g,'&lt;') + insight + '</div>' +` (moderate card) | 12311 | **AFTER** → `        _stageStripHTML(i) + _pledgeRowHTML(i) + _stageCtaHTML(i) +` |
| A7 | `      '<div style="font-size:11px;color:var(--tx3);margin-bottom:10px">Usually hits: ' + (v.t \|\| 'various times') + insight + '</div>' +` (quit card) | 12370 | **AFTER** → `      _stageStripHTML(i) + _pledgeRowHTML(i) +` |
| A8 | The 4-line red hero button, from `      '<button class="vice-btn" onclick="openMomentStakes(' + i + ')" style="width:100%;background:var(--re);color:#fff;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">' +` down to `      '</button>' +` | 12379–12382 | **REPLACE** with `      _stagePrimaryHTML(i) +` |
| A9 | `function addHabit(){` | 13783 | **BEFORE** → block B9 |
| A10 | `      '<div style="flex:1;font-size:13px;color:var(--tx)">'+h.n+'</div>';` (evening tick row) | 26727 | **REPLACE** (block B10) |
| A11 | `    nameCell.innerHTML = ` … through `    row.appendChild(nameCell);` (lines 32373–32376) | 32373–32376 | **REPLACE** (block B11) |
| A12 | `  footer.innerHTML = 'Tap today\'s circle to check a habit off · past 6 days shown on the left';` | 32420 | **REPLACE** (block B12) |

**Helpers reused (none rewritten):** `ls`, `loadV`/`saveV`, `loadH`/`saveH`, `_escFew`, `showToast`, `haptic`, `closeModal`, `theRelease`, `syncToCloud`, `logEvent`, `faithTradition`, `_breathFaithOn` (the existing faith-dial gate from the breath module), `openMomentStakes`, `openRecoveryTimeline`, `openVicePlan`, `openNaturalHighs`, `openHALT`, `renderVices`, `renderHomeHabits`, `renderEveningHabitTickList`. The anchor modal deliberately mirrors `_lockItIn` (line 10465) so the two read as one idea.

---

## 3. THE CODE

### B1–B5 — insert AFTER line 9090 (`function saveV(){ls('totry_v',vices);}`)

```js
// ── THE MAP AROUND THE FIGHT ──────────────────────────────────────────────────────────────────
// The Fight had the in-the-moment toolkit but no map: no daily choice, and no idea WHERE in the
// arc of change a person actually is. Both live ON the vice object (totry_v — already synced), so
// every existing vice keeps working untouched:
//   v.pledge     'DD/MM/YYYY'  the day the pledge was last made
//   v.pledgeDays  int          lifetime days pledged. NEVER resets, never decrements. Breaking it
//                              is not recorded, not counted, not mentioned. It is re-made, not owed.
//   v.stage      'curious'|'torn'|'ready'|'rebuilding'|'shaky'   +  v.stageAt (ISO)
function _vDay(){ return new Date().toLocaleDateString('en-AU'); }
function vicePledgedToday(v){ return !!(v && v.pledge === _vDay()); }

// B1 — THE DAILY PLEDGE. One tap. One day. Grace-based by construction: there is no "did you keep
// it?" question anywhere, because a pledge you're audited on is a debt, and a debt shames.
const _PLEDGE_WORD = {
  christianity:'Not by your own strength alone. \u201CI can do all things through him who strengthens me.\u201D \u2014 Philippians 4:13',
  islam:'Say it and mean it. Sabr isn\u2019t one great act \u2014 it\u2019s today, and then today again.',
  hinduism:'Do today\u2019s duty and let go of the fruit. Today is the only part that was ever yours.',
  buddhism:'Just this day. A mind that resolves once can resolve again tomorrow.',
  secular:'A promise made to yourself in the morning, while you\u2019re clear. That\u2019s all today has to be.'
};
function makePledge(i, from){
  loadV(); const v=vices[i]; if(!v || vicePledgedToday(v)) return;
  v.pledge=_vDay(); v.pledgeDays=(v.pledgeDays||0)+1; saveV();
  try{ renderVices(); }catch(_){}
  try{ if(typeof renderMorningPledge==='function') renderMorningPledge(); }catch(_){}
  try{ if(typeof syncToCloud==='function') syncToCloud(); }catch(_){}
  try{ if(typeof logEvent==='function') logEvent('pledge',{stage:v.stage||''}); }catch(_){}
  if(typeof haptic==='function') haptic('celebrate');
  _pledgeSaid(v, from);
}
function _pledgeSaid(v, from){
  const t=(typeof faithTradition==='function')?faithTradition():'secular';
  const soft=(typeof _breathFaithOn==='function') ? !_breathFaithOn() : false;   // faith dial on 'light'
  const word=(soft?_PLEDGE_WORD.secular:(_PLEDGE_WORD[t]||_PLEDGE_WORD.secular));
  const n=v.pledgeDays||1;
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center"><div class="modal-handle"></div>'+
    '<div style="font-size:26px;margin-bottom:8px">\uD83E\uDD1D</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:25px;color:var(--tx);line-height:1.25;margin-bottom:10px">'+
      (v.mode==='moderate'?'Today, I hold my line.':'Today, not this.')+'</div>'+
    '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:14px">'+word+'</div>'+
    (n>1
      ? '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);letter-spacing:0.08em;margin-bottom:16px">'+n+' days now, you\u2019ve chosen this on purpose</div>'
      : '<div style="font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:16px">Just today. Tomorrow gets its own.</div>')+
    (from==='morning'
      ? '<button class="btn primary" onclick="closeModal(this)">Back to my morning</button>'
      : '<button class="btn primary" onclick="closeModal(this);theRelease({did:\'You made your pledge for today \u2014 out loud, on purpose.\'})">Now go live it</button>')+
  '</div>';
  document.body.appendChild(m);
}
function _pledgeRowHTML(i){
  const v=vices[i]; if(!v || v.kind==='letgo') return '';
  const n=v.pledgeDays||0;
  const line=(v.mode==='moderate')?'Today, I hold my line':'Today, not this';
  if(vicePledgedToday(v)){
    return '<div style="display:flex;align-items:center;gap:9px;background:var(--go-bg);border:1px solid var(--go-bd);border-radius:10px;padding:9px 11px;margin-bottom:10px">'+
      '<span style="font-size:14px;flex:none">\uD83E\uDD1D</span>'+
      '<div style="flex:1;text-align:left">'+
        '<div style="font-size:12.5px;color:var(--tx2);line-height:1.45">Pledged today. '+line+'.</div>'+
        (n>1?'<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);letter-spacing:0.08em;margin-top:2px">'+n+' days you\u2019ve chosen this</div>':'')+
      '</div></div>';
  }
  return '<button onclick="makePledge('+i+',\'fight\')" style="width:100%;background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go);border-radius:10px;padding:10px;font-size:12.5px;font-weight:500;cursor:pointer;margin-bottom:10px">\uD83E\uDD1D '+line+' \u2014 make the pledge</button>';
}

// B2 — STAGE OF CHANGE. Prochaska: pushing action-stage tactics (goals, plans, streaks) at someone
// who is only contemplating BACKFIRES. So the stage the person names changes the card's primary
// offer and the brother's tone. The in-the-moment door is NEVER removed at any stage — only demoted.
const VICE_STAGES = {
  curious:    { label:'Curious',           blurb:'Just looking at it honestly. Nothing asked of you.',
                cta:'Show me what it\u2019s really costing', act:'openRecoveryTimeline(IDX)',
                tone:'You told me you\u2019re still just looking at this \u2014 so no lecture from me. I\u2019m only saying it out loud so you\u2019ve seen it.' },
  torn:       { label:'Torn',              blurb:'Part of you wants out, part of you doesn\u2019t. Both are real.',
                cta:'Help me work out what I actually want', act:'openVicePlan(IDX)',
                tone:'You said you\u2019re torn on this, and that\u2019s an honest place to stand. I\u2019m not going to push you off it. What does the part of you that wants out say right now?' },
  ready:      { label:'Ready',             blurb:'You\u2019ve decided. Now it\u2019s moments, one at a time.',
                cta:'', act:'', tone:'' },
  rebuilding: { label:'Rebuilding',        blurb:'Just after a fall. Flat for a while is the reward system healing, not you failing.',
                cta:'Rebuild me \u2014 a real high, no crash', act:'openNaturalHighs()',
                tone:'You\u2019re rebuilding right now, so I\u2019ll say this softly: this stretch is the hardest and it counts the most. Nothing tonight is a verdict on you.' },
  shaky:      { label:'Steady but shaky',  blurb:'Holding, but you can feel it leaning. Catch the setup, not the urge.',
                cta:'What\u2019s actually going on with me?', act:'openHALT()',
                tone:'You told me steady but shaky. This is exactly the moment that tells you which one it is \u2014 and either answer is fine, as long as it\u2019s true.' }
};
function viceStage(v){ const s=v&&v.stage; return VICE_STAGES[s]?s:'ready'; }
function viceStageTone(name){
  try{ loadV(); const v=vices.find(function(x){ return x&&x.n===name; });
    if(!v||!v.stage||!VICE_STAGES[v.stage]) return '';
    return VICE_STAGES[v.stage].tone||'';
  }catch(_){ return ''; }
}

// B3 — the card strip + the stage-matched action
function _stageStripHTML(i){
  const v=vices[i]; if(!v || v.kind==='letgo') return '';
  const set=!!(v.stage && VICE_STAGES[v.stage]); const s=VICE_STAGES[viceStage(v)];
  return '<button onclick="openViceStage('+i+')" style="width:100%;text-align:left;background:none;border:none;border-bottom:1px solid var(--bd);padding:0 0 9px;margin-bottom:10px;cursor:pointer">'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:3px">Where you are with this \u00b7 tap to change</div>'+
    '<div style="font-size:12.5px;line-height:1.45;color:'+(set?'var(--go)':'var(--tx3)')+'">'+
      (set ? s.label+' <span style="color:var(--tx3)">\u2014 '+s.blurb+'</span>'
           : 'Not set \u2014 tell me, and I\u2019ll change what I offer you')+'</div>'+
  '</button>';
}
function _stageCtaHTML(i){
  const v=vices[i]; if(!v) return '';
  const s=VICE_STAGES[viceStage(v)];
  if(!s.cta || !s.act) return '';
  return '<button class="vice-btn" onclick="'+s.act.replace('IDX', i)+'" style="width:100%;background:var(--go);color:#1a1505;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:8px">'+s.cta+'</button>';
}
// The quit card's whole primary block. At 'ready' it is EXACTLY the button that was there before.
// At every other stage the stage-matched move leads and the urge door stays, one tap away.
function _stagePrimaryHTML(i){
  const v=vices[i]; if(!v) return '';
  const RED='<button class="vice-btn" onclick="openMomentStakes('+i+')" style="width:100%;background:var(--re);color:#fff;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">'+
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'+
    'I\u2019m feeling it \u2014 come here first</button>';
  if(viceStage(v)==='ready') return RED;
  return _stageCtaHTML(i)+
    '<button onclick="openMomentStakes('+i+')" style="width:100%;background:none;border:1px solid var(--re-bd);color:var(--re);border-radius:10px;padding:9px;font-size:12px;cursor:pointer">\u26A0 I\u2019m feeling it right now</button>';
}

// B4 — the chooser
function openViceStage(i){
  loadV(); const v=vices[i]; if(!v) return;
  const cur=v.stage||'';
  const rows=Object.keys(VICE_STAGES).map(function(k){
    const s=VICE_STAGES[k]; const on=cur===k;
    return '<button onclick="setViceStage('+i+',\''+k+'\')" style="width:100%;text-align:left;padding:12px 13px;background:'+(on?'var(--go-bg)':'var(--bg3)')+';border:1px solid '+(on?'var(--go-bd)':'var(--bd)')+';border-radius:10px;margin-bottom:8px;cursor:pointer">'+
      '<div style="font-size:14px;color:var(--tx)">'+s.label+'</div>'+
      '<div style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin-top:2px">'+s.blurb+'</div></button>';
  }).join('');
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);line-height:1.25;margin-bottom:6px">Where are you with '+_escFew(v.n)+' right now?</div>'+
    '<div style="text-align:center;font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:16px">Honestly \u2014 not where you think you should be. Handing quit-tactics to someone who\u2019s still deciding just makes them dig in. I\u2019d rather offer you the right thing. Change it any day; going backwards is part of it.</div>'+
    rows+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:2px">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}
function setViceStage(i, k){
  loadV(); const v=vices[i]; if(!v || !VICE_STAGES[k]) return;
  v.stage=k; v.stageAt=new Date().toISOString(); saveV();
  document.querySelector('.modal-bg.open')?.remove();
  try{ renderVices(); if(typeof syncToCloud==='function') syncToCloud(); }catch(_){}
  try{ if(typeof logEvent==='function') logEvent('vice_stage',{stage:k}); }catch(_){}
  if(typeof haptic==='function') haptic('success');
  if(typeof showToast==='function') showToast('Noted','I\u2019ll meet you there. Nothing else about you changes.');
}

// B5 — the morning pledge card body (fills #morning-pledge-body)
function renderMorningPledge(){
  const body=document.getElementById('morning-pledge-body'); if(!body) return;
  const card=document.getElementById('morning-vice-card');
  loadV();
  const live=vices.map(function(v,i){ return {v:v,i:i}; })
                  .filter(function(x){ return x.v && x.v.n && x.v.kind!=='letgo'; });
  if(!live.length){ if(card) card.style.display='none'; body.innerHTML=''; return; }
  if(card) card.style.display='';
  body.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Today\u2019s pledge</div>'+
    live.map(function(x){
      const v=x.v, n=v.pledgeDays||0;
      const line=(v.mode==='moderate')?'today, I hold my line':'today, not this';
      if(vicePledgedToday(v)){
        return '<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-top:1px solid var(--bd)">'+
          '<span style="flex:none;font-size:14px">\uD83E\uDD1D</span>'+
          '<div style="flex:1;text-align:left"><div style="font-size:12.5px;color:var(--tx2)">'+_escFew(v.n)+' \u2014 pledged.</div>'+
          (n>1?'<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">'+n+' days you\u2019ve chosen this</div>':'')+
          '</div></div>';
      }
      return '<button onclick="makePledge('+x.i+',\'morning\')" style="width:100%;display:flex;align-items:center;gap:9px;text-align:left;padding:9px 0;border:none;border-top:1px solid var(--bd);background:none;cursor:pointer">'+
        '<span style="flex:none;width:18px;height:18px;border-radius:5px;border:1.5px dashed var(--go)"></span>'+
        '<span style="flex:1;font-size:12.5px;color:var(--tx)">'+_escFew(v.n)+' \u2014 <span style="color:var(--go)">'+line+'</span></span></button>';
    }).join('')+
    '<div style="font-size:10.5px;color:var(--tx3);line-height:1.5;margin-top:8px">One day only. If it breaks, nothing here punishes you \u2014 you just make it again tomorrow.</div>';
}
```

### B6 — REPLACE lines 9040–9055 inside `showMorningFocus()`

```js
  // SECONDARY: the day's pledge. This card used to only NAME the vice — it reported and did nothing.
  // Now it asks for the one thing a morning can actually give: today's choice, made on purpose.
  loadV();
  if(typeof renderMorningPledge==='function') renderMorningPledge();
```

### B7 — REPLACE line 5652 (inside `brotherSpeaks`, `viceOver` branch)

```js
      // STAGE-AWARE (Prochaska): the "are you in the driver's seat?" challenge is an ACTION-stage
      // line. Aimed at someone who is only curious or torn it reads as pressure and makes them dig
      // in. If they've told me where they are, that sets the tone instead.
      const _tone = (typeof viceStageTone==='function') ? viceStageTone(d.vice||'') : '';
      body = 'That\u2019s '+(d.count||'')+' \u2014 past the '+(d.limit||'line')+' you set.'+why+
        (_tone || 'No judgment. You set that line for a reason only you know. I\u2019m just checking: are you still in the driver\u2019s seat, or is this the thing taking the wheel?');
```

### B8 — REPLACE line 11777

```js
      brotherSpeaks({ kind:'viceOver', detail:{ vice: v.n, count: s.count + ' ' + unit, limit: thr + ' ' + unit } });
```

### B9 — insert BEFORE line 13783 (`function addHabit(){`)

```js
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
    '<input type="text" id="hab-anchor" maxlength="70" placeholder="e.g. I make my coffee" value="'+_escFew(cur)+'" style="font-size:15px;padding:12px;margin-bottom:10px">'+
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
  loadH(); if(!habits[hi]) return;
  habits[hi].a=val; saveH();
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
```

### B10 — REPLACE line 26727 (evening tick row)

```js
      '<div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--tx)">'+_escFew(h.n)+'</div>'+
      (habitAnchor(h)?'<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">after '+_escFew(habitAnchor(h))+'</div>':'')+'</div>';
```

### B11 — REPLACE lines 32373–32376 (`renderHomeHabits` name cell)

```js
    const _anc = habitAnchor(h);
    // The name is the door to the anchor. The 7 cells stay read-only exactly as before — this is
    // not ticking, so it doesn't break the "ticking lives in the evening" rule.
    nameCell.style.cursor = 'pointer';
    nameCell.innerHTML =
      '<div style="font-size:13px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px dotted var(--bd);display:inline-block;max-width:100%">' + _escFew(h.n) + '</div>' +
      (_anc
        ? '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">after ' + _escFew(_anc) + '</div>'
        : (!window.__anchorHintShown ? (window.__anchorHintShown = true, '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">\uFF0B anchor it to a cue</div>') : '')) +
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:' + pastColor + ';margin-top:2px">' + pastHits + '/6 past</div>';
    nameCell.onclick = function(){ if(typeof openHabitAnchor==='function') openHabitAnchor(hi); };
    row.appendChild(nameCell);
```

> Also add `window.__anchorHintShown = false;` immediately after `list.innerHTML = '';` (line 32302) so the hint re-evaluates each render.

### B12 — REPLACE line 32420 (footer)

```js
  footer.innerHTML = 'Tap a habit\'s name to anchor it to something you already do \u00b7 past 6 days on the left';
```

---

## 4. STORAGE KEYS

**No new keys.** Everything is additive on two objects already in `SYNC_KEYS` (line 4552):

| Key | New fields | Shape |
|---|---|---|
| `totry_v` (already synced, line 4554) | `v.pledge`, `v.pledgeDays`, `v.stage`, `v.stageAt` | `'10/08/2026'`, `14`, `'torn'`, `'2026-08-10T…Z'` |
| `totry_h` (already synced, line 4581) | `h.a` | `'I make my coffee'` |

All reads are guarded (`v.pledgeDays||0`, `VICE_STAGES[s]?s:'ready'`, `habitAnchor(h)`), so a vice or habit saved before v344 behaves exactly as it does today. `mergeFromCloud` already has a bespoke array-merge for `totry_v` (line 4991) which merges by entry, not field — an older device syncing back cannot strip these fields from a newer vice object because the newer object wins by richness/timestamp. **Verify this once on a two-device test.**

---

## 5. DISCOVERY

**(a) Daily pledge — two doors, both unmissable.**
1. **Morning tab**, the card directly under "Your day, before it starts pulling": eyebrow **"TODAY'S PLEDGE"**, then one tappable row per vice — `weed — today, not this` with a dashed gold checkbox. Tap → the pledge modal → "Back to my morning". *(This card previously only printed the vice's name and did nothing — it reported. Now it asks.)*
2. **Fight tab**, on every vice card, directly under "Usually hits:": a full-width gold button **"🤝 Today, not this — make the pledge"**. After tapping it becomes a quiet gold strip: *"Pledged today. Today, not this. · 14 days you've chosen this."*

**(b) Habit anchoring — Home tab → "Today's habits" card.** Every habit name now has a dotted underline; the first un-anchored one shows **"＋ anchor it to a cue"**. Tap the name → *"After I… I will gym session."* with one-tap idea chips → **"Lock in my anchor"**. The anchor then prints in gold under the habit name on Home, and under the habit in the evening check-in list.

**(c) Stage of change — Fight tab, top of every vice card.** A strip reading **"WHERE YOU ARE WITH THIS · TAP TO CHANGE"** / *"Not set — tell me, and I'll change what I offer you."* Tap → five options → the card's big button changes on the spot (Curious ⇒ "Show me what it's really costing"; Torn ⇒ "Help me work out what I actually want"; Ready ⇒ the red "I'm feeling it" door; Rebuilding ⇒ "Rebuild me — a real high, no crash"; Steady but shaky ⇒ "What's actually going on with me?").

**30-second demo:** Fight tab → tap the stage strip → pick "Torn" → the red button becomes gold and reads *"Help me work out what I actually want"* → tap the pledge → the modal says *"Today, not this."*

---

## 6. RISKS — verify after applying

1. **Div balance (A1).** The morning HTML edit removes 3 `<div`/3 `</div>` and adds 1/1. Re-run the `<div` vs `</div>` count outside scripts; must still be 0.
2. **`morning-focus-vice` is deleted.** Grep confirms only two references (the HTML at 1920, the JS at 9042) and both are replaced. **Re-grep after applying** — a stale `getElementById('morning-focus-vice')` elsewhere would silently no-op, but confirm.
3. **A8 replaces a 4-line string concatenation.** The lines around it (`(function(){ …momentsWonInWeek… })() +` at 12383) must still receive a trailing `+`. `_stagePrimaryHTML(i) +` supplies it. Parse-check is the guard.
4. **`--re-bd` confirmed to exist** (line 30). `--go-bg`, `--go-bd` confirmed (line 29).
5. **`_breathFaithOn()` is a breath-module helper** reused for the faith dial. If it is ever renamed, `_pledgeSaid` falls through to the tradition line (the `typeof` guard makes the failure mode "faith text still shows", not a crash). Acceptable; noted so a future refactor sees it.
6. **`viceStageTone` calls `loadV()` inside `brotherSpeaks`**, which is itself called from `modCountUp` after `loadV()`. `loadV` is idempotent (reassigns the module `vices` array); confirm `modCountUp`'s local `v`/`s` are not stale afterward — `_saveModSession` already ran before the `brotherSpeaks` call at 11777, so it is safe. **Verify by crossing a moderation limit live.**
7. **`renderHomeHabits` row height grows** by one 9px line when anchored. Check the 7-cell grid does not wrap on a 375px viewport (`grid-template-columns:minmax(0,1fr) repeat(7,minmax(24px,1fr))` is unchanged; only the first column's content grows vertically).
8. **`window.__anchorHintShown`** must be reset at the top of each `renderHomeHabits` call or the hint disappears after the first render.
9. **No `npm test` impact** — no core math touched (no streak, TDEE, nutrition, or money code changed). `getStreak()` and `viceCleanDays()` are untouched; the pledge count is a separate lifetime integer that never feeds a streak.
10. **Soul check to re-read before shipping:** nothing anywhere asks "did you keep your pledge?"; `pledgeDays` only increments; `setViceStage` explicitly says going backwards is part of it; and `openMomentStakes` remains one tap away at **every** stage — the crisis path is demoted, never removed.
11. **Bump `APP_VERSION` to `'v344'` (line 4258) and `CACHE` in `sw.js` together.**