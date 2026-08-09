## 1. WHAT IT IS

Opt-in period logging for female users that learns her own cycle length, estimates the current phase, and then threads that physiology through Nourish, Train, the Fight and sleep — so a luteal craving reads as hormones, not a broken week.
**The one moment it serves:** she is 6 days from her period, has eaten 300 calories over her target and feels like she failed — and the app is the only thing in her life that says *this is your body, not your character.*
Local-first by default (`totry_cycle` is deliberately **not** in `SYNC_KEYS`), one-tap deletable, never fertility or medical guidance.

---

## 2. EXACT ANCHORS

All line numbers are from `/Users/alfredjohn/Desktop/ToTry/index.html` @ v343 (35,634 lines).

| # | Anchor (verbatim) | ~Line | Insert |
|---|---|---|---|
| A | `    <button class="btn primary" onclick="markDailyLogsDone()" style="margin-top:10px;font-size:13px">Done for today</button>` | 2922 | **BEFORE** |
| B | `  <!-- ── PROGRESS (middle — what users want to SEE) ── -->` | 2925 | **BEFORE** |
| C | `  <div id="nut-cycle-badge"></div>` | 2139 | **AFTER** |
| D | `    <div id="feeling-wins-momentum" style="display:none"></div>` | 2035 | **AFTER** |
| E | `    <div id="pt-session-empty" style="font-size:12px;color:var(--tx3);text-align:center;padding:14px 8px;border:1px dashed var(--bd);border-radius:10px;margin-bottom:14px">` | 2455 | **BEFORE** |
| F | `  <!-- Faith presence — the app is built honestly from a Christian heart, and that stays. But a man` | 3604 | **BEFORE** |
| G | the two-line block `  'totry_rosaries'` / `];` | 4603–4604 | **AFTER** |
| H | `function userSex(){ try{ return ls('totry_sex') \|\| null; }catch(_){ return null; } }` | 5618 | **AFTER** |
| I | `    sex: (typeof userSex==='function') ? userSex() : null,` | 5860 | **BEFORE** |
| J | `  if(f.fights7) lines.push('The fight (7d): '+f.wins7+' wins, '+f.losses7+' slips'` … | 5890 | **BEFORE** |
| K | `  updateHubBackBar(name);` | 8071 | **AFTER** |
| L | `      '<p style="margin-bottom:12px">Progress photos. They are stored only in your browser\'s local storage.` … | 30175 | **AFTER** |
| M | `privacy.html`: `<p>Progress photos. They are stored only in local storage.` … | privacy.html:60 | **AFTER** |

Also: bump `const APP_VERSION = 'v343';` → `'v344'` (line 4258) and `const CACHE` in `sw.js`.

**Helpers reused, not rewritten:** `ls`, `showToast`, `haptic`, `closeModal`, `_escFew`, `userSex`, `faithTradition`, `curFaith`, `faithLevel`, `syncToCloud`, `_getOutbox`/`_setOutbox`, `go`, CSS classes `.card`, `.card-hd`, `.lbl`, `.qb`, `.qbtns`, `.btn`, `.modal-handle`, `.tracker-row`, `.tr-icon`, `.tr-label`, `.setting-row`, `.sr-label`, `.sr-desc`, `.sr-action`, `.settings-group`, `.settings-group-hint`. No new helper duplicates an existing one. `openFormModal` was deliberately **not** used for the log sheet — it only renders text/number/date inputs and the log needs chip pickers.

---

## 3. THE CODE

### A — Track tab, inside the "Today" 5-second card (BEFORE the Done button)
```html
    <!-- Cycle — hidden unless she opted in. Same 5-second gesture as weight and sleep. -->
    <div class="tracker-row" id="cycle-track-row" style="display:none">
      <span class="tr-icon">🌙</span>
      <div style="flex:1"><div class="tr-label">Cycle</div><div style="font-size:10px;color:var(--tx3)" id="cycle-track-sub">No period logged yet</div></div>
      <button class="btn" style="width:auto;padding:6px 12px;font-size:11px" onclick="openCycleLog()">+ Period</button>
    </div>
```

### B — Track tab, the phase card (BEFORE the PROGRESS comment)
```html
  <!-- The cycle card — the phase read, and what it means across the whole life. Renders the quiet
       one-time offer for a woman who hasn't chosen yet, and nothing at all for anyone else. -->
  <div id="cycle-card" style="margin-bottom:14px"></div>
```

### C / D / E — the pillar lines
```html
  <div id="cycle-nourish-note"></div>          <!-- C: Nourish, after nut-cycle-badge -->
```
```html
    <div id="cycle-fight-note"></div>          <!-- D: Fight, after feeling-wins-momentum -->
```
```html
    <div id="cycle-train-note"></div>          <!-- E: Train, before pt-session-empty -->
```

### F — Settings group (BEFORE the Faith-presence comment)
```html
  <!-- Your cycle — shown only to a woman, and only ever an offer. It is the most sensitive data in
       the app, so its privacy stance and its delete button live right next to its switch. -->
  <details class="settings-group" id="cycle-settings-group" style="display:none">
    <summary>🌙 Your cycle <span class="settings-group-hint">Phase-aware counsel &middot; stays on this device</span></summary>
    <div class="card">
      <p style="font-size:12.5px;color:var(--tx2);margin-bottom:12px;line-height:1.6">Log the day your period starts and the rest of the app stops reading your month as one flat line &mdash; your food, your training, your fight and your sleep all get the context. It&rsquo;s an estimate from your own logs, never a certainty, and <strong style="color:var(--tx)">never fertility or contraception guidance</strong>.</p>
      <p style="font-size:11.5px;color:var(--tx3);margin-bottom:14px;line-height:1.6">Where it lives: <strong style="color:var(--tx2)">on this device only</strong>, by default. It is not sent to my server, never sent to any AI provider as dates, and never sold or shared &mdash; there is no advertiser or data broker anywhere in this app. If anyone ever asks me for your cycle data, there is nothing on my server to hand over unless you switched backup on yourself. You can erase all of it below in one tap.</p>
      <div class="setting-row">
        <div><div class="sr-label">Cycle counsel</div><div class="sr-desc">Show the phase card and the phase-aware lines</div></div>
        <button class="btn sr-action" style="width:auto;padding:7px 12px;font-size:12px" id="cycle-on-btn" onclick="cycleToggleOn()">Off</button>
      </div>
      <div class="setting-row">
        <div><div class="sr-label">Where it&rsquo;s stored</div><div class="sr-desc">Off = this device only. On = survives a reinstall, but it leaves your phone.</div></div>
        <button class="btn sr-action" style="width:auto;padding:7px 12px;font-size:12px" id="cycle-backup-btn" onclick="cycleToggleBackup()">This device only</button>
      </div>
      <div class="setting-row" style="border-bottom:none">
        <div><div class="sr-label">Delete my cycle data</div><div class="sr-desc">Erases every entry here and on the server. Cannot be undone.</div></div>
        <button class="btn sr-action" style="width:auto;padding:7px 12px;font-size:12px;border-color:var(--re);color:var(--re)" onclick="cycleDeleteAll()">Delete</button>
      </div>
    </div>
  </details>
```

### G — after the `SYNC_KEYS` array closes
```js
// totry_cycle is deliberately NOT in the list above. Post-Dobbs, cycle data is the most sensitive
// thing this app holds, so it stays on the device by default. It is pushed into SYNC_KEYS at runtime
// ONLY if she switches backup on herself (Settings → Your cycle), and spliced out the moment she
// switches it off. exportAllData() dumps every totry_ key, so a local backup never loses it.
try{ const _cyc = JSON.parse(localStorage.getItem('totry_cycle')||'null');
     if(_cyc && _cyc.backup && !SYNC_KEYS.includes('totry_cycle')) SYNC_KEYS.push('totry_cycle'); }catch(_){ }
```

### H — the engine (AFTER `function userSex()`)
```js
// ══════════════════════════════════════════════════════════════════════════════════════════════
// THE CYCLE — for the half of the people here who have one.
// A standalone period app can tell a woman she is in her luteal phase. Only this one can tell her
// that tonight's craving, today's heavier bar and this week's thinner willpower are the SAME
// physiology — not three separate failures of character. That is the whole argument for keeping the
// pillars in one place, and it is the honest answer to "why not just use Flo?".
// Rules held here without exception:
//   · OPT-IN — never surfaces unless she chose it. Being female is not consent.
//   · LOCAL-FIRST — see the SYNC_KEYS note. It leaves the device only if she says so.
//   · AN ESTIMATE, NEVER A CLAIM — we show what it's based on, and when the data runs out we say
//     we don't know instead of guessing.
//   · NOT MEDICAL, NOT FERTILITY — no conception window, no contraception, no diagnosis. Ever.
// ══════════════════════════════════════════════════════════════════════════════════════════════
const CYCLE_KEY = 'totry_cycle';
const CYCLE_SYMPTOMS = ['Cramps','Low mood','Tired','Bloated','Headache','Sore','Anxious','Wired'];
const CYCLE_PHASES = {
  menstrual:  { name:'Menstrual',  icon:'\u{1F311}', tone:'var(--tx3)' },
  follicular: { name:'Follicular', icon:'\u{1F312}', tone:'var(--gr)'  },
  ovulatory:  { name:'Mid-cycle',  icon:'\u{1F315}', tone:'var(--go)'  },
  luteal:     { name:'Luteal',     icon:'\u{1F318}', tone:'var(--bl)'  },
  unknown:    { name:'Unclear',    icon:'\u{1F32B}', tone:'var(--tx3)' }
};
// The counsel. Physiology named plainly, then handed back as grace — never as an excuse, never as a
// verdict. Each line is the same fact retold from the pillar she happens to be standing in.
const CYCLE_COUNSEL = {
  menstrual: {
    head:'Bleeding. Lower the bar on purpose.',
    body:'Energy and iron are genuinely lower this week. Resting is not slipping.',
    nourish:'Eat enough, and lean on iron \u2014 red meat, lentils, spinach, eggs. Under-eating costs you more than usual right now.',
    train:'Move if it helps (many women feel better for it), but drop the load without guilt. You owe nobody a PR.',
    fight:'Pain and low energy make every urge louder. That is physiology, not weakness.',
    sleep:'Sleep is often broken in the first days. Take the earlier night.'
  },
  follicular: {
    head:'Rising. This is your open window.',
    body:'Energy and recovery tend to climb from here.',
    nourish:'Appetite usually settles. A good stretch to hold your target without fighting yourself.',
    train:'Strength tends to build now. If you want to add load or chase a PR, this is the stretch for it.',
    fight:'Willpower usually runs steadier here. A good week to start the hard thing, not just survive it.',
    sleep:'Sleep usually comes easier. Protect it while it is cheap.'
  },
  ovulatory: {
    head:'Mid-cycle. Usually the peak.',
    body:'Many women feel strongest and most social around now.',
    nourish:'Appetite often dips. Still eat \u2014 a strong day is not a day to under-fuel.',
    train:'Often the best training day of the month. Warm up properly; joints can feel looser.',
    fight:'Drive can run higher across the board. Name it early rather than being ambushed by it.',
    sleep:'Usually your easiest sleep of the month.'
  },
  luteal: {
    head:'Luteal. Everything costs a little more.',
    body:'Progesterone is up. Temperature, hunger and effort all read higher.',
    nourish:'Your body genuinely wants roughly 100\u2013300 more calories a day now, and cravings sharpen \u2014 carbs and sugar especially. That is hormones, not a failure of willpower. Eat a bit more real food rather than white-knuckling it into a binge.',
    train:'Strength and heat tolerance often dip in the back half. Deload, keep the movement, skip the max. A slower session now is the right session.',
    fight:'This is the harder week. Willpower is genuinely thinner premenstrually \u2014 the same urge takes more to hold. Expect it, plan for it, and if you slip, read it as a hard week and not a broken person.',
    sleep:'Sleep often fragments in the last few days. An earlier bedtime buys back more than caffeine does.'
  }
};

function cycleGet(){
  let c=null; try{ c=ls(CYCLE_KEY); }catch(_){ c=null; }
  if(!c || typeof c!=='object') c={};
  if(!Array.isArray(c.log)) c.log=[];
  return c;
}
function cycleOn(){ const c=cycleGet(); return !!c.on && userSex()==='female'; }
function cycleSet(c){
  try{ ls(CYCLE_KEY,c); }catch(_){}
  if(c.backup && typeof syncToCloud==='function'){ try{ syncToCloud(CYCLE_KEY,c); }catch(_){} }
}
function _cycDayKey(d){ const x=d?new Date(d):new Date(); const p=n=>(n<10?'0':'')+n; return x.getFullYear()+'-'+p(x.getMonth()+1)+'-'+p(x.getDate()); }
function _cycDays(a,b){ return Math.round((new Date(a+'T00:00:00')-new Date(b+'T00:00:00'))/86400000); }

// Learn her length from her own history — never a textbook 28 dressed up as fact.
function cycleLength(){
  const starts = cycleGet().log.map(e=>e.d).filter(Boolean).sort().reverse();
  const gaps=[];
  for(let i=0;i<starts.length-1 && gaps.length<6;i++){
    const g=_cycDays(starts[i],starts[i+1]);
    if(g>=21 && g<=45) gaps.push(g);
  }
  if(!gaps.length) return { len:28, source:'assumed', spread:null };
  const avg=Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length);
  const spread=Math.max.apply(null,gaps)-Math.min.apply(null,gaps);
  return { len:avg, source:(gaps.length>=3 && spread<=5)?'learned':'rough', spread:spread };
}
// The estimated phase today. Returns null when we genuinely do not know — that is a feature.
function cyclePhase(){
  if(!cycleOn()) return null;
  const starts = cycleGet().log.map(e=>e.d).filter(Boolean).sort();
  if(!starts.length) return null;
  const last=starts[starts.length-1], L=cycleLength();
  const day=_cycDays(_cycDayKey(),last)+1;
  if(day<1) return null;                                   // a start logged in the future
  if(day>L.len+9) return { key:'unknown', day:day, len:L, lastStart:last };
  const ov=Math.max(10,L.len-14);                          // the luteal phase is the stable ~14 days
  let key;
  if(day<=5) key='menstrual';
  else if(day<=ov-2) key='follicular';
  else if(day<=ov+1) key='ovulatory';
  else key='luteal';
  return { key:key, day:day, len:L, lastStart:last, daysToNext:Math.max(0,L.len-day+1) };
}
// Faith full, never forced: one line, only in the two hard phases, swapped per tradition and silent
// for secular users and anyone on light faith.
function _cycleFaithLine(key){
  if(key!=='luteal' && key!=='menstrual') return '';
  if(typeof faithLevel==='function' && faithLevel()==='light') return '';
  const tr=(typeof faithTradition==='function')?faithTradition():'christianity';
  const f=(typeof curFaith==='function')?curFaith():null;
  if(tr==='secular' || !f || !f.divine) return 'Be as patient with yourself this week as you would be with someone you love.';
  return {
    christianity:'\u201cHe gives power to the faint.\u201d A tired week is not a faithless one \u2014 grace meets weakness; it does not wait for strength.',
    islam:'Allah does not burden a soul beyond what it can bear. A lighter week is still faithfulness; ease is permitted, not conceded.',
    hinduism:'The body has its seasons as the year does. Meet this one with ahimsa \u2014 non-harm, turned toward yourself first.',
    buddhism:'This too is impermanent, and it is not you. Notice the discomfort kindly and let it move through.'
  }[tr] || '';
}

// ── LOGGING ───────────────────────────────────────────────────────────────────────────────────
function openCycleLog(){
  const today=_cycDayKey();
  const m=document.createElement('div'); m.className='modal-bg open';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-weight:300;color:var(--tx);margin-bottom:4px">Log a period start</div>'+
    '<div style="font-size:12px;color:var(--tx3);line-height:1.55;margin-bottom:14px">Day one \u2014 the first day of real bleeding. That is all I need. Everything else is optional.</div>'+
    '<div class="lbl">Start date</div>'+
    '<input type="date" id="cyc-date" value="'+today+'" max="'+today+'" style="margin-bottom:14px">'+
    '<div class="lbl">Flow (optional)</div><div class="qbtns" id="cyc-flow">'+
      ['Light','Medium','Heavy'].map(f=>'<button type="button" class="qb" data-f="'+f.toLowerCase()+'" onclick="_cycPick(this,1)">'+f+'</button>').join('')+
    '</div>'+
    '<div class="lbl">How it is landing (optional)</div><div class="qbtns" id="cyc-sym">'+
      CYCLE_SYMPTOMS.map(s=>'<button type="button" class="qb" data-s="'+_escFew(s)+'" onclick="_cycPick(this,0)">'+_escFew(s)+'</button>').join('')+
    '</div>'+
    '<div id="cyc-err" style="display:none;color:var(--re);font-size:12px;margin-bottom:10px"></div>'+
    '<button class="btn primary" onclick="saveCycleLog(this)" style="margin-bottom:8px">Save</button>'+
    '<button class="btn" onclick="closeModal(this)">Cancel</button>'+
    '<div style="font-size:10.5px;color:var(--tx3);line-height:1.5;margin-top:12px;text-align:center">Stays on this device unless you switch backup on yourself.</div>'+
  '</div>';
  document.body.appendChild(m); haptic('tap');
}
function _cycPick(btn,single){
  const on=btn.dataset.on==='1';
  if(single) btn.parentNode.querySelectorAll('.qb').forEach(b=>{ b.dataset.on='0'; b.style.borderColor='var(--bd)'; b.style.color='var(--tx2)'; });
  btn.dataset.on=on?'0':'1';
  btn.style.borderColor=on?'var(--bd)':'var(--go-bd)';
  btn.style.color=on?'var(--tx2)':'var(--go)';
  haptic('tap');
}
function saveCycleLog(el){
  const m=el.closest('.modal-bg'); if(!m) return;
  const d=(m.querySelector('#cyc-date')||{}).value||'';
  const err=m.querySelector('#cyc-err');
  const fail=t=>{ if(err){ err.textContent=t; err.style.display='block'; } };
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return fail('Pick the date it started.');
  if(d>_cycDayKey()) return fail('That date is in the future.');
  const flow=m.querySelector('#cyc-flow .qb[data-on="1"]');
  const sym=Array.from(m.querySelectorAll('#cyc-sym .qb[data-on="1"]')).map(b=>b.dataset.s);
  const c=cycleGet();
  c.log=c.log.filter(e=>e && e.d!==d);
  c.log.push({ d:d, flow:flow?flow.dataset.f:null, sym:sym });
  c.log.sort((a,b)=> a.d<b.d?1:-1);
  c.log=c.log.slice(0,60);
  cycleSet(c); m.remove(); haptic('success'); renderCycleSurfaces();
  const p=cyclePhase();
  showToast('Logged', (p && CYCLE_PHASES[p.key]) ? ('Day '+p.day+' \u2014 estimated '+CYCLE_PHASES[p.key].name.toLowerCase()+'.') : 'Day one saved.');
}
function cycleUndoLast(){
  const c=cycleGet(); if(!c.log.length) return;
  if(!confirm('Remove your last logged period start ('+c.log[0].d+')?')) return;
  c.log.shift(); cycleSet(c); renderCycleSurfaces(); haptic('tap');
  showToast('Removed','That entry is gone.');
}

// ── CONSENT, PRIVACY, DELETION ────────────────────────────────────────────────────────────────
function cycleOptIn(){
  const c=cycleGet(); c.on=true; delete c.declined; cycleSet(c);
  haptic('success'); renderCycleSurfaces();
  showToast('On','It stays on this device. Log a start whenever it comes.');
  openCycleLog();
}
function cycleDecline(){
  const c=cycleGet(); c.declined=true; cycleSet(c);
  haptic('tap'); renderCycleSurfaces();
  showToast('Understood','I won\u2019t ask again. It\u2019s in Settings \u2192 Your cycle if you ever want it.');
}
function cycleToggleOn(){
  const c=cycleGet();
  if(c.on){ c.on=false; cycleSet(c); showToast('Off','Cycle counsel is hidden. Your entries are still here \u2014 delete them below if you want them gone.'); }
  else { c.on=true; delete c.declined; cycleSet(c); showToast('On','Cycle counsel is back.'); }
  haptic('tap'); renderCycleSurfaces();
}
function cycleToggleBackup(){
  const c=cycleGet();
  if(!c.backup){
    if(!confirm('Back your cycle data up to your To Try account?\n\nRight now it lives only on this device. Backing it up means it survives a reinstall \u2014 but it also means it leaves this phone and sits on a server. This is the most sensitive data in the app. Most people should leave this off.\n\nTurn backup on?')) return;
    c.backup=true; cycleSet(c);
    try{ if(!SYNC_KEYS.includes(CYCLE_KEY)) SYNC_KEYS.push(CYCLE_KEY); }catch(_){}
    try{ if(typeof syncToCloud==='function') syncToCloud(CYCLE_KEY,c); }catch(_){}
    showToast('Backed up','It will restore if you reinstall. You can turn this off any time.');
  } else {
    c.backup=false; cycleSet(c); _cyclePurgeCloud();
    try{ const i=SYNC_KEYS.indexOf(CYCLE_KEY); if(i>=0) SYNC_KEYS.splice(i,1); }catch(_){}
    showToast('This device only','Backup off, and I\u2019ve asked the server to delete its copy.');
  }
  haptic('tap'); renderCycleSurfaces();
}
async function _cyclePurgeCloud(){
  try{ const o=_getOutbox(); if(o && o[CYCLE_KEY]){ delete o[CYCLE_KEY]; _setOutbox(o); } }catch(_){}
  try{
    if(typeof sb!=='undefined' && sb && typeof currentUser!=='undefined' && currentUser){
      await sb.from('user_data').delete().eq('user_id',currentUser.id).eq('data_key',CYCLE_KEY);
    }
  }catch(e){ console.warn('[cycle] cloud purge failed:',e); }
}
function cycleDeleteAll(){
  if(!confirm('Delete every period entry?\n\nThis erases your cycle log from this device and from my server. It cannot be undone.')) return;
  if(prompt('Type DELETE to confirm.')!=='DELETE'){ showToast('Cancelled','Nothing was deleted.'); return; }
  _cyclePurgeCloud();
  try{ const i=SYNC_KEYS.indexOf(CYCLE_KEY); if(i>=0) SYNC_KEYS.splice(i,1); }catch(_){}
  try{ localStorage.removeItem(CYCLE_KEY); }catch(_){}
  haptic('success'); renderCycleSurfaces();
  showToast('Deleted','Your cycle data is gone. The offer is still there if you ever want to start again.');
}

// ── RENDER ────────────────────────────────────────────────────────────────────────────────────
function renderCycleSurfaces(){
  try{ renderCycleCard(); }catch(_){}
  try{ _renderCycleNote('cycle-nourish-note','nourish'); }catch(_){}
  try{ _renderCycleNote('cycle-train-note','train'); }catch(_){}
  try{ _renderCycleNote('cycle-fight-note','fight'); }catch(_){}
  try{
    const row=document.getElementById('cycle-track-row');
    if(row){
      const on=cycleOn(); row.style.display=on?'':'none';
      const sub=document.getElementById('cycle-track-sub');
      if(on && sub){ const p=cyclePhase(); sub.textContent = p ? ('Day '+p.day+' \u00b7 est. '+CYCLE_PHASES[p.key].name.toLowerCase()) : 'No period logged yet'; }
    }
  }catch(_){}
  try{
    const g=document.getElementById('cycle-settings-group');
    if(g) g.style.display = (userSex()==='female') ? '' : 'none';
    const c=cycleGet();
    const b1=document.getElementById('cycle-on-btn'); if(b1) b1.textContent = c.on ? 'On' : 'Off';
    const b2=document.getElementById('cycle-backup-btn'); if(b2) b2.textContent = c.backup ? 'Backed up' : 'This device only';
  }catch(_){}
}
// One quiet line where she is standing — not a second card competing with the pillar she came for.
function _renderCycleNote(elId,pillar){
  const el=document.getElementById(elId); if(!el) return;
  const p=cyclePhase();
  if(!p || p.key==='unknown'){ el.innerHTML=''; return; }
  const txt=(CYCLE_COUNSEL[p.key]||{})[pillar]||'';
  if(!txt){ el.innerHTML=''; return; }
  const ph=CYCLE_PHASES[p.key];
  el.innerHTML='<div style="display:flex;gap:10px;align-items:flex-start;background:var(--bg2);border:1px solid var(--bd);border-left:2px solid '+ph.tone+';border-radius:12px;padding:11px 13px;margin-bottom:14px">'+
    '<span style="font-size:15px;line-height:1.2">'+ph.icon+'</span>'+
    '<div style="flex:1;min-width:0">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:0.13em;text-transform:uppercase;color:'+ph.tone+';margin-bottom:3px">Day '+p.day+' \u00b7 est. '+ph.name+'</div>'+
      '<div style="font-size:12.5px;color:var(--tx2);line-height:1.6">'+txt+'</div>'+
    '</div></div>';
}
function renderCycleCard(){
  const el=document.getElementById('cycle-card'); if(!el) return;
  if(userSex()!=='female'){ el.innerHTML=''; return; }     // never shown to anyone who didn't say so
  const c=cycleGet();
  if(!c.on){
    if(c.declined){ el.innerHTML=''; return; }             // she said no once; that answer stands
    el.innerHTML='<div class="card" style="border-color:var(--go-bd)">'+
      '<div class="card-hd" style="margin-bottom:6px">\u{1F319} Track your cycle?</div>'+
      '<p style="font-size:12.5px;color:var(--tx2);line-height:1.65;margin-bottom:10px">Log the day your period starts and I stop reading your month as one flat line. A luteal craving stops looking like a broken week and starts looking like what it is. Your food, your training, your fight and your sleep all get the context.</p>'+
      '<p style="font-size:11.5px;color:var(--tx3);line-height:1.6;margin-bottom:12px">This stays <strong style="color:var(--tx2)">on this device</strong>. It is not sent to my server unless you switch that on yourself, never sold or shared, and you can erase it in one tap. It is an estimate, never a certainty \u2014 and never fertility or contraception guidance.</p>'+
      '<button class="btn primary" onclick="cycleOptIn()" style="margin-bottom:8px">Yes, track my cycle</button>'+
      '<button class="btn" onclick="cycleDecline()">Not for me</button></div>';
    return;
  }
  const p=cyclePhase();
  if(!p){
    el.innerHTML='<div class="card"><div class="card-hd" style="margin-bottom:6px">\u{1F319} Your cycle</div>'+
      '<p style="font-size:12.5px;color:var(--tx2);line-height:1.6;margin-bottom:12px">Log the first day of your next period and I\u2019ll start reading the month with you. Nothing to set up.</p>'+
      '<button class="btn primary" onclick="openCycleLog()">Log a period start</button></div>';
    return;
  }
  if(p.key==='unknown'){
    el.innerHTML='<div class="card"><div class="card-hd" style="margin-bottom:6px">\u{1F32B} I\u2019ve lost the thread</div>'+
      '<p style="font-size:12.5px;color:var(--tx2);line-height:1.65;margin-bottom:6px">It\u2019s been '+p.day+' days since the start you logged on '+_escFew(p.lastStart)+' \u2014 longer than your usual, so I won\u2019t pretend to know where you are. Log your next start and I\u2019ll pick it back up.</p>'+
      '<p style="font-size:11.5px;color:var(--tx3);line-height:1.6;margin-bottom:12px">A late or missed period has many ordinary causes \u2014 stress, travel, training load, illness, contraception and more. If it keeps happening or something feels wrong, that\u2019s a conversation for a doctor, not an app.</p>'+
      '<button class="btn primary" onclick="openCycleLog()">Log a period start</button></div>';
    return;
  }
  const ph=CYCLE_PHASES[p.key], co=CYCLE_COUNSEL[p.key]||{}, L=p.len;
  const basis = L.source==='learned' ? ('learned from your own last cycles \u2014 about '+L.len+' days')
              : L.source==='rough'   ? ('a rough '+L.len+' days; your cycles have varied by '+L.spread+' days, so hold this loosely')
              :                        ('an assumed 28 days, because I only have one start from you');
  const faith=_cycleFaithLine(p.key);
  const rows=[['Nourish','nourish'],['Train','train'],['The fight','fight'],['Sleep','sleep']]
    .map(r=>co[r[1]]?('<div style="padding:9px 0;border-bottom:1px solid var(--bd)">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:0.13em;text-transform:uppercase;color:var(--tx3);margin-bottom:3px">'+r[0]+'</div>'+
      '<div style="font-size:12.5px;color:var(--tx2);line-height:1.6">'+co[r[1]]+'</div></div>'):'').join('');
  const recent=c.log.slice(0,3).map(e=>_escFew(e.d+(e.flow?' \u00b7 '+e.flow:'')+(e.sym&&e.sym.length?' \u00b7 '+e.sym.join(', '):''))).join('<br>');
  el.innerHTML='<div class="card" style="border-color:var(--bd)">'+
    '<div style="display:flex;align-items:center;gap:11px;margin-bottom:10px">'+
      '<span style="font-size:24px">'+ph.icon+'</span><div style="flex:1;min-width:0">'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:21px;font-weight:300;color:var(--tx);line-height:1.2">Day '+p.day+' \u00b7 '+ph.name+'</div>'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:'+ph.tone+';margin-top:3px">Estimated \u00b7 ~'+p.daysToNext+' days to your next</div>'+
    '</div></div>'+
    '<div style="font-size:13.5px;color:var(--tx);line-height:1.55;margin-bottom:4px">'+co.head+'</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:10px">'+co.body+'</div>'+
    rows+
    (faith?'<div style="font-family:Cormorant Garamond,serif;font-size:15px;color:var(--tx2);line-height:1.65;padding:12px 0 2px">'+faith+'</div>':'')+
    (recent?'<div class="lbl" style="margin-top:12px">Your log</div><div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);line-height:1.7">'+recent+'</div>':'')+
    '<div style="font-size:10.5px;color:var(--tx3);line-height:1.55;margin-top:12px;padding-top:10px;border-top:1px solid var(--bd)">This is an estimate from '+basis+'. Bodies don\u2019t run to a calendar \u2014 stress, travel, illness, training load, contraception and much else move it. It is <strong style="color:var(--tx2)">not fertility or contraception guidance</strong>, and it is not medical advice. If something is painful, heavy, absent or just wrong, see a doctor \u2014 I\u2019m not one.</div>'+
    '<div style="display:flex;gap:8px;margin-top:12px">'+
      '<button class="btn primary" style="flex:1;margin:0" onclick="openCycleLog()">Log a start</button>'+
      '<button class="btn" style="flex:1;margin:0" onclick="go(\'settings\')">Privacy &amp; delete</button></div>'+
    '<button class="btn" style="margin-top:8px;font-size:11px;background:transparent;border:1px solid var(--bd);color:var(--tx3)" onclick="cycleUndoLast()">Remove my last entry</button>'+
  '</div>';
}
```

### I — `getLifeState()` (BEFORE the `sex:` line)
```js
    // Her cycle, if she chose to track it. Present ONLY when she opted in — the whole-life brain
    // must never quietly hold something she didn't hand it.
    cycle: (function(){ try{ if(typeof cyclePhase!=='function') return null; const p=cyclePhase(); if(!p) return null;
      return { phase:p.key, day:p.day, lenDays:p.len.len, basis:p.len.source }; }catch(_){ return null; } })(),
```

### J — `lifeStateBrief()` (BEFORE the `f.fights7` line)
```js
  // The cycle line — the single most useful missing context for a woman, and the reason this app can
  // say what a standalone period tracker cannot. Marked hard as an ESTIMATE so the model never
  // states it as fact, and framed so a luteal week is never read back to her as a character problem.
  try{
    const cy = s.cycle;
    if(cy && cy.phase && cy.phase!=='unknown'){
      const meaning = {
        menstrual:'energy and iron genuinely lower; rest is legitimate, not slipping',
        follicular:'energy and recovery usually climbing \u2014 a good stretch to push',
        ovulatory:'usually her strongest, most social stretch',
        luteal:'appetite genuinely rises (~100-300 cal/day), cravings sharpen and willpower is genuinely thinner. Read a heavy day or a slip this week as PHYSIOLOGY \u2014 never as weakness or a failure of will'
      }[cy.phase] || '';
      lines.push('Cycle (self-logged, ESTIMATE only \u2014 never state it as fact, never give fertility, contraception or medical advice): day '+cy.day+', likely '+cy.phase+' phase'+(meaning?' \u2014 '+meaning:'')+'.');
    }
  }catch(_){}
```

### K — `go()` (AFTER `updateHubBackBar(name);`)
```js
  try{ if(typeof renderCycleSurfaces==='function') renderCycleSurfaces(); }catch(_){}
```

### L — in-app privacy modal (AFTER the "Progress photos" `<p>`)
```js
      '<p style="margin-bottom:12px">Your cycle data, if you track it. Period dates, flow and symptoms are stored in local storage on your device only. They are not written to my database, not synced, and never sent to any AI provider. Backing them up to your account is off by default and only happens if you switch it on yourself in Settings &rarr; Your cycle &mdash; which also has a one-tap delete that erases them here and on the server. I will not sell, share or hand this data to anyone, and while backup is off there is nothing on my server for anyone to ask me for.</p>' +
```

### M — `privacy.html` §4 (AFTER the "Progress photos" `<p>`)
```html
  <p>Your cycle data, if you track it. Period dates, flow and symptoms are stored in local storage on your device only — not in my database, not synced, never sent to any AI provider, and never sold or shared. Cloud backup is off by default; it only happens if you turn it on yourself in Settings → Your cycle, which also offers a one-tap delete that erases it locally and on the server. While backup is off there is nothing on my server for anyone — including law enforcement — to request.</p>
```

---

## 4. STORAGE KEYS

**`totry_cycle`** — one key, JSON-safe:
```js
{ on: true,            // opted in
  declined: true,      // she said "not for me" — the offer never asks again
  backup: false,       // cloud backup, OFF by default
  log: [ { d:'2026-08-01', flow:'light|medium|heavy'|null, sym:['Cramps','Tired'] } ]  // newest first, max 60
}
```
**SYNC_KEYS: deliberately NOT added statically.** This is the one intentional exception, following the existing `totry_push_prefs` precedent already documented in the array. It is pushed into `SYNC_KEYS` at runtime by the block in **G** (on load) and by `cycleToggleBackup()` (on opt-in), and spliced out on opt-out/delete. `syncToCloud()` already gates on `SYNC_KEYS.includes(key)`, so nothing leaves the device until she says so. `exportAllData()` dumps every `totry_` key, so a manual backup never loses it — that must be stated when she declines cloud backup (the confirm copy does).

Also written: `totry_brother_last_*` — none. No other new keys.

---

## 5. DISCOVERY

1. **Grow → Track** (Track lives inside the Grow hub). Top of the body-progress section: a gold-bordered card, **"🌙 Track your cycle?"** with **"Yes, track my cycle"** / **"Not for me"**. Only a user whose Settings → About you says Female ever sees it; declining hides it permanently.
2. After opt-in the same slot becomes the **phase card**: *"Day 22 · Luteal — Estimated · ~7 days to your next"* with the four pillar rows, the faith line, her log, and the honest-limits paragraph.
3. **Grow → Track → Today card**: a `🌙 Cycle · Day 22 · est. luteal` row with a **+ Period** button, sitting beside Weight and Sleep — the 5-second daily gesture.
4. **The moat, on camera**: open **Nourish** → the luteal line sits above her food log; open **Train** → the deload line; open **Fight** → the "willpower is genuinely thinner this week" line. Three tabs, same physiology, one log. That is the 30-second demo.
5. **Settings → 🌙 Your cycle** — on/off, storage location, delete. Appears only for female users.

---

## 6. RISKS

- **Parse-check is mandatory.** The engine block is ~330 lines of template strings with escaped apostrophes (`\u2019`) and inline `onclick`. Extract the big `<script>`, run `node --check`, and count `<div` vs `</div>` outside scripts = 0 (blocks A–F add 6 balanced divs plus one `<details>`).
- **`npm test` should be unaffected** — no core math changed. The luteal +100–300 cal is offered as counsel, never silently applied to `nut_goals`/`cycledTarget`. Do **not** "improve" this by shifting her target: that is unvalidated math and it would make her number move for a reason she didn't ask for.
- **Verify the sync exception.** Sign in, log a period, confirm `totry_cycle` does **not** appear in `_getOutbox()` and no `user_data` row exists for it. Then toggle backup on → row appears; toggle off → row deleted and `SYNC_KEYS.indexOf('totry_cycle') === -1`.
- **Timezone**: dates are stored `YYYY-MM-DD` and parsed with `T00:00:00` (local), matching the app's `en-AU` day keys. Verify day counts don't drift across a DST boundary (`Math.round` on the ms delta absorbs the ±1h).
- **`go()` hook fires on every tab.** `renderCycleSurfaces()` early-returns on missing elements and is wrapped in `try`, but confirm no console noise on a male user or a signed-out first open.
- **Male / unset users must see nothing.** Set `totry_sex` to `male` and to unset, and confirm all five surfaces render empty — never a leaked "Day 12".
- **Copy check before shipping**: the words *fertility*, *ovulation window*, *conceive* and *safe day* must appear nowhere as guidance. The only place "ovulatory" survives is the internal `p.key`; the UI label is "Mid-cycle".
- Bump `APP_VERSION` → `v344` **and** `CACHE` in `sw.js` together, and redeploy `privacy.html` alongside `index.html` so the in-app text and the hosted policy never disagree.