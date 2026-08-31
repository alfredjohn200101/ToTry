// and offered both as structured data (for logic) and a text block (for the AI's context).
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE BROTHER AT THE THRESHOLD
// A real big brother is quiet by default, watching always, and speaks only when you're about to
// cross a line that'll hurt you. Not "STOP" — "oi, you sure?" with love behind it, the choice left
// to you. EVERY threshold in the app (vice over limit, calories over, training wrecked, spending
// heavy) calls this ONE voice, so the brother is consistent everywhere. He draws on getLifeState —
// the WHOLE man — so what he says is true in a way no single-feature app could manage.
//
// moment = { kind, detail }  where kind ∈ 'viceOver' | 'calorieOver' | 'trainTired' | 'spendHeavy'
// Returns once, gently, and respects the user's autonomy. He never shames, never blocks.
// ════════════════════════════════════════════════════════════════════════════════════════════
// Biological sex as a known property (set via TDEE, or onboarding). Returns 'male'|'female'|null.
// Used app-wide for gender-aware care: calorie/protein math, training context, and the sibling's
// understanding (same love, but it knows whether it's speaking to a brother or a sister).
function userSex(){ try{ return ls('totry_sex') || null; }catch(_){ return null; } }
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
  const tr=(typeof faithTradition==='function')?faithTradition():'secular';
  // Check the tradition's OWN words first. Gating on curFaith().divine made Buddhism fall through to
  // the generic line — Buddhism has no deity by design, which is exactly why its line was written.
  const BY_TRADITION = {
    christianity:'\u201cHe gives power to the faint.\u201d A tired week is not a faithless one \u2014 grace meets weakness; it does not wait for strength.',
    islam:'Allah does not burden a soul beyond what it can bear. A lighter week is still faithfulness; ease is permitted, not conceded.',
    hinduism:'The body has its seasons as the year does. Meet this one with ahimsa \u2014 non-harm, turned toward yourself first.',
    buddhism:'This too is impermanent, and it is not you. Notice the discomfort kindly and let it move through.'
  };
  // A secular user gets the same care without borrowed language — grace, not scripture.
  return BY_TRADITION[tr] || 'Be as patient with yourself this week as you would be with someone you love.';
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
async function cycleUndoLast(){
  const c=cycleGet(); if(!c.log.length) return;
  if(!(await askConfirm('Remove your last logged period start ('+c.log[0].d+')?'))) return;
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
  // Turning it back on is a fresh decision, so it lifts the delete tombstone. Nothing is restored —
  // the old entries are gone — it just means a new log is allowed to sync again if they enable backup.
  else { c.on=true; delete c.declined; try{ localStorage.removeItem(CYCLE_TOMB); }catch(_){} cycleSet(c); showToast('On','Cycle counsel is back.'); }
  haptic('tap'); renderCycleSurfaces();
}
function cycleToggleAI(){
  const c=cycleGet(); c.aiOK=!c.aiOK; cycleSet(c);
  try{ const b=document.getElementById('cycle-ai-btn'); if(b) b.textContent=c.aiOK?'On \u2713':'Off'; }catch(_){}
  try{ showToast(c.aiOK?'Coach can see your phase':'Coach can\u2019t see your phase',
    c.aiOK?'Only the phase word \u2014 never your dates. It helps it read a hard week as physiology.'
          :'Your phase stays on this device. Every card in the app still works.'); }catch(_){}
}
async function cycleToggleBackup(){
  const c=cycleGet();
  if(!c.backup){
    if(!(await askConfirm('Back your cycle data up to your To Try account?\n\nRight now it lives only on this device. Backing it up means it survives a reinstall \u2014 but it also means it leaves this phone and sits on a server. This is the most sensitive data in the app. Most people should leave this off.\n\nTurn backup on?'))) return;
    c.backup=true; cycleSet(c);
    // Turning backup off tombstones the key so a stale server copy can never sync back. Turning it
    // ON again is the explicit reversal, so lift it — otherwise she would push a backup she could
    // never restore, which is the worst of both worlds.
    try{ localStorage.removeItem(CYCLE_TOMB); }catch(_){}
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
// A delete that only succeeds when the network happens to be up is not a delete. The purge below can
// fail (offline, signed out, server down) and used to fail SILENTLY — and because pullFromCloud writes
// every row the server returns without consulting SYNC_KEYS, the next sync quietly restored the most
// sensitive data in the app, after the person had typed DELETE. The tombstone is the guarantee: it
// blocks the key on every future pull and keeps re-issuing the purge until the server confirms.
const CYCLE_TOMB = 'totry_cycle_tombstone';
function _cycleTombed(){ try{ return !!localStorage.getItem(CYCLE_TOMB); }catch(_){ return false; } }
async function _cyclePurgeCloud(){
  try{ const o=_getOutbox(); if(o && o[CYCLE_KEY]){ delete o[CYCLE_KEY]; _setOutbox(o); } }catch(_){}
  try{ localStorage.setItem(CYCLE_TOMB, String(Date.now())); }catch(_){}
  try{
    if(typeof sb!=='undefined' && sb && typeof currentUser!=='undefined' && currentUser){
      const { error } = await sb.from('user_data').delete()
        .eq('user_id',currentUser.id).eq('data_key',_cloudKey(CYCLE_KEY));
      if(!error){ try{ localStorage.setItem(CYCLE_TOMB,'done'); }catch(_){} return true; }
      console.warn('[cycle] cloud purge failed, tombstone holds:', error.message);
    }
  }catch(e){ console.warn('[cycle] cloud purge failed, tombstone holds:',e); }
  return false;                                  // tombstone stays pending; retried on next pull
}
async function cycleDeleteAll(){
  if(!(await askConfirm('Delete every period entry?\n\nThis erases your cycle log from this device and from my server. It cannot be undone.'))) return;
  if((await askText('Type DELETE to confirm', 'This erases your cycle log from this device and from my server. It cannot be undone.', {placeholder:'DELETE', confirmLabel:'Delete it all'}))!=='DELETE'){ showToast('Cancelled','Nothing was deleted.'); return; }
  _cyclePurgeCloud();
  try{ const i=SYNC_KEYS.indexOf(CYCLE_KEY); if(i>=0) SYNC_KEYS.splice(i,1); }catch(_){}
  try{ localStorage.removeItem(CYCLE_KEY); }catch(_){}
  haptic('success'); renderCycleSurfaces();
  // Say what is actually guaranteed. The server copy is deleted, and if that call cannot go through
  // right now the entry is blocked from ever syncing back and the delete is retried until it lands.
  showToast('Deleted','Gone from this device and from my server — and it will not come back on a sync. If you use To Try on another phone, delete it there too.');
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
    const b3=document.getElementById('cycle-ai-btn'); if(b3) b3.textContent = c.aiOK ? 'On \u2713' : 'Off';
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
// Sensible default nutrition targets when the user hasn't run the TDEE calc yet — sex-aware so a
// woman isn't handed male numbers. Real targets still come from TDEE; this is just a humane default.
function defaultNutGoals(){ const s=userSex(); if(s==='female') return {cal:1900, pro:110}; return {cal:2100, pro:170}; }

function brotherSpeaks(moment){
  try{
    if(!moment || !moment.kind) return;
    // Throttle: the brother doesn't nag. Once per kind per ~3h is plenty — like a brother who said
    // his piece and trusts you heard it.
    const tkey = 'totry_brother_last_' + moment.kind;
    const last = parseInt(ls(tkey)||'0', 10);
    if(Date.now() - last < 3*3600000) return;
    ls(tkey, Date.now());

    const life = (typeof getLifeState==='function') ? getLifeState() : null;
    const name = ls('totry_name') || '';
    // Gender-aware sibling voice: a nameless user shouldn't be called "brother" if she's not one.
    const _sx = (typeof userSex==='function') ? userSex() : null;
    const hi = name ? name : (_sx==='female' ? 'sister' : _sx==='male' ? 'brother' : 'friend');

    // Build the line from the WHOLE man, not just the one number. This is the integration that makes
    // him a brother. Each kind gets a truthful, specific, respectful line + the choice left open.
    let title = '', body = '', primary = 'I\u2019m good \u2014 I\u2019ve got this', secondary = null, secondaryAct = null;
    const d = moment.detail || {};

    if(moment.kind === 'viceOver'){
      title = 'You\u2019re past your line.';
      let why = '';
      if(life){
        const r = life.readiness;
        if(r && r.level && /low|rest|depleted|poor/i.test(r.level)) why = ' You\u2019re running low today \u2014 tired is when the pull wins. ';
        else if(life.fight && life.fight.losses7 >= 2 && life.fight.losses7 > life.fight.wins7) why = ' It\u2019s been a heavy week. ';
      }
      // Stage of change decides the TONE, not just the card's offer. Prochaska's whole finding is that
      // action-stage pressure aimed at someone who is merely contemplating backfires \u2014 and the
      // threshold is the loudest thing the app ever says. viceStageTone() has existed for this and was
      // never called, so someone who told us "I'm just looking at this honestly" got the same push as
      // someone who had decided. When they've named a stage, their words lead and we stay quiet after.
      const _tone = (typeof viceStageTone==='function' && d.vice) ? viceStageTone(d.vice) : '';
      if(_tone){
        body = 'That\u2019s '+(d.count||'')+' \u2014 past the '+(d.limit||'line')+' you set.'+why+' '+_tone;
      } else {
        body = 'That\u2019s '+(d.count||'')+' \u2014 past the '+(d.limit||'line')+' you set.'+(why||' ')+'No judgment. You set that line for a reason only you know. I\u2019m just checking: are you still in the driver\u2019s seat, or is this the thing taking the wheel?';
      }
      secondary = 'Talk it through with me'; secondaryAct = 'companion';
    }
    else if(moment.kind === 'calorieOver'){
      title = 'Heads up on the food.';
      let ctx = '';
      let _cp = null; try{ _cp = (typeof cyclePhase==='function') ? cyclePhase() : null; }catch(_){ }
      if(_cp && _cp.key === 'luteal') ctx = ' Your body genuinely wants a bit more in the back half of your cycle \u2014 that is hormones, not willpower \u2014 ';
      else if(life && life.training && life.training.sessions7 >= 4) ctx = ' You\u2019ve trained hard this week, so your body can use more than usual \u2014 ';
      else ctx = ' ';
      body = 'You\u2019re over today\u2019s target.'+ctx+'I\u2019m not here to police a number. If it\u2019s a real meal you needed, good. If it\u2019s the day getting away from you, maybe the next one\u2019s water and a walk. Your call.';
    }
    else if(moment.kind === 'trainTired'){
      title = 'Before you load that bar.';
      const _rr = (life&&life.readiness&&Array.isArray(life.readiness.reasons)) ? life.readiness.reasons.filter(Boolean) : [];
      const _why = _rr.length ? (' \u2014 ' + _rr.slice(0,3).join(', ') + '.') : ' \u2014 likely sleep and a hard week stacking up.';
      body = 'Your readiness is low today'+((life&&life.readiness&&life.readiness.score)?(' ('+life.readiness.score+'/100)'):'')+_why+' Someone in your corner would tell you straight: pushing a max effort now is how you get hurt or burnt out. Train smart today \u2014 a lighter session still counts. But you know your body. Choose well.';
      primary = 'Got it \u2014 I\u2019ll train smart'; secondary = 'I\u2019m good to push'; secondaryAct = 'dismiss';
    }
    else if(moment.kind === 'spendHeavy'){
      title = 'One thing on the money.';
      body = 'I know the debt\u2019s been on your shoulders. This isn\u2019t about guilt \u2014 it\u2019s that every dollar you hold is a dollar closer to free. Is this one worth it? Sometimes it is. You decide \u2014 I just didn\u2019t want you to drift past it without a beat.';
    }
    else return;

    // Render as a calm, respectful sheet — the brother's hand on your shoulder, not an alarm.
    const m = document.createElement('div');
    m.className = 'modal-bg open'; m.style.alignItems='center';
    m.innerHTML = '<div class="modal" style="text-align:center">'+
      '<div style="font-size:26px;margin-bottom:8px">\uD83E\uDEC2</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);line-height:1.3;margin-bottom:10px">'+title+'</div>'+
      '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:20px">'+body+'</div>'+
      '<button class="btn primary" onclick="closeModal(this)" style="margin-bottom:'+(secondary?'8px':'0')+'">'+primary+'</button>'+
      (secondary ? '<button class="btn" onclick="closeModal(this);'+(secondaryAct==='companion'?'openCompanionForUrge()':'')+'" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)">'+secondary+'</button>' : '')+
      '</div>';
    document.body.appendChild(m);
    if(typeof haptic==='function') haptic('warning');
  }catch(_){ }
}

// THE BROTHER'S PROACTIVE COUNSEL — when a man turns to him and asks "what should I do right now?"
// He reads the whole day (getNextStep is already whole-life aware) and speaks the ONE thing that
// matters, in his voice, with a warm frame. Not crisis — direction. The other half of the brother.
function brotherGuidance(){
  try{
    const name = ls('totry_name') || '';
    const step = (typeof getNextStep==='function') ? getNextStep() : null;
    const life = (typeof getLifeState==='function') ? getLifeState() : null;
    // A short, true read of where he's at — so the counsel feels seen, not generic.
    let read = '';
    if(life){
      const bits = [];
      if(life.readiness && life.readiness.level){ if(/low|rest|depleted|poor/i.test(life.readiness.level)) bits.push('your body\u2019s running low today'); }
      if(life.fight && life.fight.wins7 != null && life.fight.wins7 > 0) bits.push(life.fight.wins7+' urges beaten this week');
      if(life.training && life.training.sessions7 >= 4) bits.push('you\u2019ve trained hard this week');
      if(life.money && life.money.reclaimed > 0) bits.push(curSym()+life.money.reclaimed+' reclaimed toward your freedom');
      if(bits.length) read = 'Looking at where you\u2019re at \u2014 '+bits.slice(0,2).join(', ')+'. ';
    }
    const headline = step ? step.text : 'Just take the next small step.';
    const sub = step ? step.sub : 'You don\u2019t have to do everything. Just the next right thing.';
    const act = step ? step.action : null;

    const m = document.createElement('div');
    m.className = 'modal-bg open'; m.style.alignItems='center';
    m.innerHTML = '<div class="modal" style="text-align:center">'+
      '<div style="font-size:26px;margin-bottom:8px">\uD83E\uDEC2</div>'+
      '<div style="font-size:13px;color:var(--tx3);line-height:1.6;margin-bottom:14px">'+(read || ('Here\u2019s what I\u2019d point you to'+(name?', '+name:'')+'.'))+'</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.25;margin-bottom:8px">'+String(headline).replace(/</g,'&lt;')+'</div>'+
      '<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:20px">'+String(sub).replace(/</g,'&lt;')+'</div>'+
      (act ? '<button class="btn primary" id="bg-do-it" style="margin-bottom:8px">Let\u2019s do it</button>' : '')+
      '<button class="btn" onclick="closeModal(this)" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)">Not now</button>'+
      '</div>';
    document.body.appendChild(m);
    // DEAD SINCE v407, ON A FIRST-FIVE-MINUTES SURFACE.
    //
    // getNextStep().action used to be a string of executable code ("go('morning')"). v407 changed
    // every one of them to a plain KEY ('morning') and routed doNextStep() through NEXT_STEP_ACTIONS
    // \u2014 but this button was left interpolating the value straight into an onclick. So the rendered
    // handler was `closeModal(this);morning`: the modal closed, which looks like something happened,
    // then a bare identifier threw ReferenceError and the person went nowhere.
    //
    // Both callers are first-session surfaces \u2014 the "Actually good" door's "What's my next step?"
    // and the companion's "what should I do?" \u2014 so someone in their first five minutes tapped the
    // one thing offered and the app did nothing but disappear. Dispatch through the same table
    // doNextStep uses; there is no code in a DOM attribute here any more.
    try{
      const _btn = m.querySelector('#bg-do-it');
      if(_btn) _btn.onclick = function(){
        try{ if(typeof closeModal==='function') closeModal(_btn); else m.remove(); }catch(_){ }
        try{
          const fn = (typeof NEXT_STEP_ACTIONS === 'object') && NEXT_STEP_ACTIONS[act];
          if(typeof fn === 'function') fn((step && step.actionArg) || '');
          else if(typeof go === 'function') go('home');   // never leave them nowhere
        }catch(_){ }
      };
    }catch(_){ }
    if(typeof haptic==='function') haptic('tap');
  }catch(_){ }
}

function getLifeState(){
  const now = Date.now();
  const L = (typeof ls==='function') ? ls : (()=>null);
  const within = (ts, days) => { const t = new Date(ts).getTime(); return !isNaN(t) && (now - t) <= days*86400000; };
  const auKey = ts => new Date(ts).toLocaleDateString('en-AU');
  const avg = (arr, f) => { const v = arr.map(f).filter(x=>x!=null && !isNaN(x)); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; };

  // ── TRAINING ──
  // A RUN IS TRAINING. Strava activities live in their own store, and this counted only
  // totry_workouts — so someone whose whole week is running had three runs listed on the Train tab
  // while GROW said "0 WORKOUTS" and the brief the AI reads opened "Training: 0 sessions in 7 days".
  // The app was looking straight at the sessions and telling the coach they had not trained.
  // Only the Hevy-DESCRIBED Strava activities are ever converted into totry_workouts (35-strava.js,
  // id 'stravahevy_<id>'), so skipping exactly those ids is the whole dedupe — everything else in
  // totry_strava_activities exists nowhere else. weeklyLoadByModality already merges the two stores
  // this way; this brings the whole-life brief in line with it.
  const _wRaw = (L('totry_workouts')||[]).filter(w => w && (w.ts||w.date));
  const _haveConverted = new Set(_wRaw.map(w => String(w.id)));
  const _stravaTrain = (L('totry_strava_activities')||[])
    .filter(a => a && (a.ts||a.date) && !_haveConverted.has('stravahevy_' + a.id))
    .map(a => ({ id:'strava_'+a.id, source:'strava', ts:a.ts||a.date,
                 type:a.type||'Cardio', splitFocus:a.name||a.type||'Cardio', title:a.name||a.type||'Cardio',
                 durationMin:a.durationMinutes||(a.moving_time?Math.round(a.moving_time/60):null),
                 calories:a.calories||null, exercises:[] }));
  const workouts = _wRaw.concat(_stravaTrain);
  const train7 = workouts.filter(w => within(w.ts||w.date, 7));
  const train14 = workouts.filter(w => within(w.ts||w.date, 14));
  const trainDays7 = new Set(train7.map(w => auKey(w.ts||w.date))).size;

  // ── NUTRITION ── (nutlog is a {dateKey: [entries]} map)
  const nutLog = L('totry_nutlog')||{};
  let nutCal7=0, nutPro7=0, nutDays7=0;
  const todayKey = auKey(now);
  let todayCal=0, todayPro=0;
  Object.keys(nutLog).forEach(k => {
    const ents = nutLog[k]||[]; if(!ents.length) return;
    const ts = ents[0].ts ? new Date(ents[0].ts).getTime() : null;
    const dayCal = ents.reduce((a,e)=>a+(e.cal||0),0);
    const dayPro = ents.reduce((a,e)=>a+(e.pro||0),0);
    if(k === todayKey){ todayCal += dayCal; todayPro += dayPro; }
    if(ts && (now-ts) <= 7*86400000 && dayCal>0){ nutCal7+=dayCal; nutPro7+=dayPro; nutDays7++; }
  });

  // ── BODY / COMPOSITION ──
  const body = (L('totry_body')||[]).filter(e => e && e.weight>0);
  const curWeight = body.length ? body[0].weight : null;
  const withComp = body.filter(e => e.comp && (e.comp.fatMassKg!=null || e.comp.muscleKg!=null));
  let recomp = null;
  if(withComp.length >= 2){
    const r = withComp[0], e = withComp[withComp.length-1];
    recomp = {
      dWeight: Math.round((r.weight - e.weight)*10)/10,
      dFat: (r.comp.fatMassKg!=null && e.comp.fatMassKg!=null) ? Math.round((r.comp.fatMassKg-e.comp.fatMassKg)*10)/10 : null,
      dMuscle: (r.comp.muscleKg!=null && e.comp.muscleKg!=null) ? Math.round((r.comp.muscleKg-e.comp.muscleKg)*10)/10 : null
    };
  }

  // ── SOUL / MIND ──
  const checkins = L('totry_checkins')||[];
  const ci7 = checkins.filter(c => within(c.ts||c.date, 7));
  // !e.flagged for the same reason journal7 below carries it: completeEvening() marks a row whose
  // reflection tripped the crisis gate, and getLifeState feeds lifeStateBrief(), which is handed to
  // the model. A store that can hold a disclosure gets filtered wherever it is read for AI.
  const evenings = (L('totry_evenings')||[]).filter(e => e && e.ts && !e.flagged);
  const ev7 = evenings.filter(e => within(e.ts, 7));
  const examens7 = (L('totry_examens')||[]).filter(e => e && within(e.ts, 7));
  const prayers7 = (L('totry_prayers')||[]).filter(p => p && within(p.createdAt || p.ts, 7));
  const journal7 = (L('totry_journal')||[]).filter(j => j && !j.flagged && within(j.ts, 7));

  // ── VICE / FIGHT ──
  const fightLog = (L('totry_fight_log')||[]).filter(f => f && f.ts);
  const fight7 = fightLog.filter(f => within(f.ts, 7));
  const wins7 = fight7.filter(f => f.won).length;
  const losses7 = fight7.filter(f => f.won === false).length;
  // totry_cravings has no writer outside the demo seeder — every real urge is a totry_fight_log row,
  // already counted as wins7/losses7 above. Kept as a read so an old device's data still resolves,
  // but it is not reported separately: a second count of the same moments is not more truth.
  const cravings7 = [];

  // ── PER-VICE HONEST STATE ── so the Brother's counsel knows exactly where each fight stands, not
  // just an aggregate. Carries the honest use log (the truth a clean streak alone can hide) and the
  // moments he came here and turned away. Without this the app's VOICE was blind to its own tracking.
  const _usesLog = L('totry_vice_uses') || [];
  const _momWon = L('totry_moments_won') || [];
  const momentsWon7 = _momWon.filter(x => x && within(x.ts, 7)).length;
  const viceStates = ((typeof lsArr==='function') ? lsArr('totry_v') : (L('totry_v')||[])).filter(v => v && v.n).map(v => {
    const uses7 = _usesLog.filter(u => u && u.v === v.n && within(u.ts, 7));
    const lastUse = uses7.length ? uses7.reduce((m,u)=>Math.max(m, new Date(u.ts).getTime()), 0) : null;
    const turned7 = _momWon.filter(x => x && x.v === v.n && within(x.ts, 7)).length;
    let pattern = null;
    try{ pattern = (typeof analyzeUrgePatterns==='function') ? analyzeUrgePatterns(v.n) : null; }catch(_){}
    return {
      name: v.n,
      mode: (typeof viceMode==='function') ? viceMode(v) : (v.mode || 'quit'),
      kind: v.kind || null,
      cleanDays: ((typeof viceIsAbstinence==='function') ? viceIsAbstinence(v) : (v.mode!=='moderate'))
                   ? ((typeof viceCleanDays==='function') ? viceCleanDays(v) : null) : null,
      uses7: uses7.reduce((a,u)=>a+(parseInt(u.qty,10)||1),0),
      daysSinceUse: lastUse ? Math.max(0, Math.floor((now-lastUse)/86400000)) : null,
      turnedAway7: turned7,
      weeklyLimit: v.mode==='moderate' ? (v.modLimit||null) : null,
      nightlyLine:  v.mode==='moderate' ? (v.modThreshold||null) : null,
      hardHour: pattern && pattern.riskWindow ? pattern.riskWindow : null,
      topTrigger: pattern && pattern.topTrigger ? pattern.topTrigger : null,
      plan: (v.plan && (v.plan.why||v.plan.move)) ? { why:v.plan.why||null, move:v.plan.move||null } : null
    };
  });

  // ── READINESS ──
  const readiness = (typeof computeReadiness==='function') ? computeReadiness() : null;

  // ── last activity across everything (for "gone quiet") ──
  const lastActivity = Math.max(
    workouts.reduce((m,w)=>Math.max(m,new Date(w.ts||w.date||0).getTime()||0),0),
    evenings.reduce((m,e)=>Math.max(m,new Date(e.ts||0).getTime()||0),0),
    checkins.reduce((m,c)=>Math.max(m,new Date(c.ts||c.date||0).getTime()||0),0),
    journal7.reduce((m,j)=>Math.max(m,new Date(j.ts||0).getTime()||0),0)
  );
  const daysQuiet = lastActivity ? Math.floor((now-lastActivity)/86400000) : null;

  const state = {
    now,
    training: {
      sessions7: train7.length, sessions14: train14.length, daysTrained7: trainDays7,
      // workouts is the RAW unsorted array and Health.syncWorkouts unshifts imported HealthKit sessions
      // onto the front in unspecified query order, so [0] was an arbitrary import rather than the latest
      // session — and the brief then told the model "last: Workout". Pick the genuinely most recent.
      lastTitle: (function(){
        try{
          const _sorted = (workouts||[]).filter(function(w){ return w && (w.ts || w.date); })
            .sort(function(a,b){ return new Date(b.ts||b.date||0) - new Date(a.ts||a.date||0); });
          const _l = _sorted[0] || workouts[0];
          return _l ? (_l.title||_l.splitFocus||_l.type||'Workout') : null;
        }catch(_){ return workouts[0] ? (workouts[0].title||workouts[0].splitFocus||'Workout') : null; }
      })()
    },
    nutrition: {
      todayCal: Math.round(todayCal), todayPro: Math.round(todayPro),
      avgCal7: nutDays7 ? Math.round(nutCal7/nutDays7) : null,
      avgPro7: nutDays7 ? Math.round(nutPro7/nutDays7) : null,
      daysLogged7: nutDays7,
      // The target, so the brief can describe WHERE they are without quoting a number (gentle mode).
      goalCal: (function(){ try{ const g=ls('totry_nut_goals')||{}; return g.cal||null; }catch(_){ return null; } })()
    },
    body: { currentWeight: curWeight, recomp },
    soul: {
      spiritual: avg(ci7, c=>c.spiritual), emotional: avg(ci7, c=>c.emotional), physical: avg(ci7, c=>c.physical),
      examens7: examens7.length, prayers7: prayers7.length, reflections7: ev7.length + journal7.length,
      avgDayRating: avg(ev7, e=>e.rating)
    },
    fight: { wins7, losses7, cravings7: cravings7.length, fights7: fight7.length, momentsWon7, vices: viceStates },
    readiness: readiness ? { score: readiness.score, level: readiness.level } : null,
    // ── SLEEP — the soil the other five pillars grow in ──
    // A short night pre-loads the whole day against a person at once: impulse control drops (the
    // Fight), hunger hormones spike (Nourish), the amygdala runs hot (the Feeling Door) and choices
    // turn risk-seeking (Money). It was already being collected in three places and the counsel
    // never saw it. Now every surface can say the one true thing: "you slept 5h — go gentle today."
    sleep: (function(){
      try{
        const tr = L('totry_trackers') || {};
        const hoursOn = function(off){ const k = auKey(now - off*86400000); const d = tr[k]; const h = d && parseFloat(d.sleep); return (h && h > 0) ? h : null; };
        const last = hoursOn(0) != null ? hoursOn(0) : hoursOn(1);   // last night (or the night before, if today isn't logged yet)
        const recent = []; for(let i=0;i<7;i++){ const h=hoursOn(i); if(h!=null) recent.push(h); }
        const avg7 = recent.length ? Math.round((recent.reduce((a,b)=>a+b,0)/recent.length)*10)/10 : null;
        const goal = parseFloat(L('totry_sleep_goal')) || 8;
        const debt = recent.length ? Math.round(recent.reduce((a,h)=>a+Math.max(0,goal-h),0)*10)/10 : null;
        const short = (last != null) && (last < 6);
        // Quality is a SEPARATE signal from hours. The morning card's Rough/Okay/Good/Great used to be
        // written into the hours field, so "Rough" became "3 hours slept" everywhere downstream. Someone
        // can sleep eight hours badly; the two facts are not interchangeable and must not be averaged
        // together. Read here so the app can say what they actually told it.
        const qOn = function(off){ const d = tr[auKey(now - off*86400000)]; const q = d && parseFloat(d.sleepQuality); return (q && q > 0) ? q : null; };
        const qual = qOn(0) != null ? qOn(0) : qOn(1);
        const qualWord = qual == null ? null : (qual <= 3 ? 'rough' : qual <= 5 ? 'okay' : qual <= 7 ? 'good' : 'great');
        return { lastNight: last, avg7: avg7, nights7: recent.length, goal: goal, debt7: debt, short: short,
                 quality: qual, qualityWord: qualWord };
      }catch(_){ return { lastNight:null, avg7:null, nights7:0, goal:8, debt7:null, short:false, quality:null, qualityWord:null }; }
    })(),
    money: (function(){ try{ const f=ls('totry_f')||{}; const debts=f.d||[]; const totalDebt=debts.reduce((s,d)=>s+Math.max(0,(d.t||0)-(d.p||0)),0); const reclaimed=(typeof totalReclaimed==='function')?totalReclaimed():0; return { totalDebt:Math.round(totalDebt), reclaimed, hasDebt: totalDebt>0 }; }catch(_){ return { totalDebt:0, reclaimed:0, hasDebt:false }; } })(),
    // Her cycle, if she chose to track it. Present ONLY when she opted in — the whole-life brain
    // must never quietly hold something she didn't hand it.
    // Her cycle reaches the AI ONLY on a separate, explicit opt-in (cycleGet().aiOK). Tracking it is
    // one decision; sending the phase to a third-party model is a different one, and the privacy
    // policy promises cycle data is never sent to an AI provider. The phase still powers every LOCAL
    // surface (the phase card, Nourish/Train/Fight notes) with no consent needed, because that never
    // leaves the device. Default: off.
    cycle: (function(){ try{
      if(typeof cyclePhase!=='function') return null;
      if(!(typeof cycleGet==='function' && cycleGet().aiOK === true)) return null;
      const p=cyclePhase(); if(!p) return null;
      return { phase:p.key, day:p.day, lenDays:p.len.len, basis:p.len.source }; }catch(_){ return null; } })(),
    // Their OWN top values, in their own order — so counsel argues from their standard, not ours.
    values: (function(){ try{ const o=(typeof getValues==='function')?getValues():null; return o?{ top:o.v.map(function(id){ return valLabel(id); }), why:o.why||'' }:null; }catch(_){ return null; } })(),
    sex: (typeof userSex==='function') ? userSex() : null,
    activity: { daysQuiet, everActive: (evenings.length + workouts.length) >= 5 }
  };
  // Pre-formatted text block for AI context — the whole person in a compact, honest brief.
  state.brief = lifeStateBrief(state);
  return state;
}
// Render the life-state as a compact text brief for the coach/synthesis system prompt.
function lifeStateBrief(s){
  const lines = [];
  const t = s.training, n = s.nutrition, b = s.body, soul = s.soul, f = s.fight;
  if(t.sessions7 != null) lines.push('Training: '+t.sessions7+' sessions in 7 days ('+t.daysTrained7+' days)'+(t.lastTitle?', last: '+t.lastTitle:''));
  // Gentle mode ("numbers on/off") is a promise that this person does not see calorie or macro
  // figures — often because counting them is the thing that hurt them. Handing the raw numbers to the
  // coach broke that promise from the other side: the diary hid them and then the coach said them out
  // loud. Under gentle mode the model gets the SHAPE of their eating and an explicit instruction.
  const _gentleBrief = (typeof nutGentle==='function' && nutGentle());
  if(n.daysLogged7){
    if(_gentleBrief){
      // Reuse the app's own gentle vocabulary so the coach says what the diary says.
      const _gw=(typeof _gentleWord==='function')?_gentleWord(n.todayCal, n.goalCal):null;
      const _where=_gw ? (_gw.w+' ('+_gw.s+')') : 'logged today';
      lines.push('Nutrition: they have NUMBERS TURNED OFF — they log food without seeing calories or macros. '+
        'Ate on '+n.daysLogged7+' of the last 7 days; today reads as: '+_where+'. '+
        'CRITICAL: never state a calorie count, macro gram figure, deficit, surplus or target number. Speak in food, portions, energy and how they feel. If they ask for a number, tell them it is switched off and they can turn numbers back on in Nourish.');
    } else {
      lines.push('Nutrition: avg '+(n.avgCal7||'?')+' cal / '+(n.avgPro7||'?')+'g protein over '+n.daysLogged7+' logged days; today '+n.todayCal+' cal / '+n.todayPro+'g');
    }
  }
  if(b.currentWeight) lines.push('Weight: '+wFmt(b.currentWeight)+(b.recomp&&b.recomp.dFat!=null?' (last stretch: '+(b.recomp.dWeight>0?'+':'')+b.recomp.dWeight+'kg scale, '+(b.recomp.dFat>0?'+':'')+b.recomp.dFat+'kg fat'+(b.recomp.dMuscle!=null?', '+(b.recomp.dMuscle>0?'+':'')+b.recomp.dMuscle+'kg muscle':'')+')':''));
  const soulBits = [];
  if(soul.spiritual!=null) soulBits.push('spiritual '+soul.spiritual.toFixed(1)+'/10');
  if(soul.emotional!=null) soulBits.push('emotional '+soul.emotional.toFixed(1)+'/10');
  if(soul.physical!=null) soulBits.push('physical '+soul.physical.toFixed(1)+'/10');
  if(soulBits.length) lines.push('Self-reported (7d avg): '+soulBits.join(', '));
  if(soul.reflections7 || soul.examens7 || soul.prayers7) lines.push('Inner life (7d): '+soul.reflections7+' reflections, '+soul.examens7+' examens, '+soul.prayers7+' prayers logged');
  // Sleep is the foundation under every other line above — say it plainly, and say what it MEANS,
  // because a short night is the single best predictor of a hard day across all five pillars.
  try{
    const sl = s.sleep;
    if(sl && sl.lastNight != null){
      let sleepLine = 'Sleep: '+sl.lastNight+'h last night'+(sl.avg7!=null?(', '+sl.avg7+'h avg over '+sl.nights7+' logged nights'):'')+(sl.qualityWord?(' (they described it as '+sl.qualityWord+')'):'');
      if(sl.short) sleepLine += ' — SHORT. Cravings will feel louder, hunger runs high, emotions amplify and impulse control is thinner today. Meet them with grace and lower the bar; do NOT read a hard day as weakness in them.';
      lines.push(sleepLine);
    } else if(sl && sl.qualityWord){
      // Quality WITHOUT hours. Before quality and hours were separated, a "Rough" tap wrote 3 into the
      // hours field, so this branch never existed — the model was simply told "Sleep: 3h" and believed
      // it. Now the honest version: the coach still learns the night was hard, and is explicitly told
      // that no hours were measured, so it cannot invent a number back at them.
      let qLine = 'Sleep: no hours logged, but they described last night as ' + sl.qualityWord + '.';
      if(sl.quality != null && sl.quality <= 3) qLine += ' Treat today like a short night — cravings louder, hunger higher, impulse control thinner. Grace, and lower the bar.';
      lines.push(qLine);
    }
  }catch(_){}
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
        // Gentle mode means numbers off. Handing the model a calorie range here let it say one back
        // to someone who explicitly asked never to see them \u2014 the leak defeats the whole setting.
        luteal:'appetite genuinely rises'+((typeof nutGentle==='function' && nutGentle())?'':' (~100-300 cal/day)')+', cravings sharpen and willpower is genuinely thinner. Read a heavy day or a slip this week as PHYSIOLOGY \u2014 never as weakness or a failure of will'
      }[cy.phase] || '';
      // THE PHASE WORD ONLY. The setting that turns this on says, in the person's own Settings screen,
      // "the phase word only (never your dates)" — and privacy.html says her period dates never leave
      // the device. The day NUMBER is her start date: day 9 on the 18th is the 10th, by subtraction.
      // Sending it broke both promises at once, with reproductive health data, to a third-party model.
      // The phase is what makes the counsel useful; the date adds nothing the coach can act on.
      lines.push('Cycle (self-logged, ESTIMATE only \u2014 never state it as fact, never give fertility, contraception or medical advice): likely '+cy.phase+' phase'+(meaning?' \u2014 '+meaning:'')+'.');
    }
  }catch(_){}
  try{
    const fp = (typeof feelingPattern==='function') ? feelingPattern(14) : null;
    if(fp) lines.push('What keeps bringing them to the app (14d): '+fp.label+' '+fp.count+' of '+fp.total+' times \u2014 this is the recurring feeling, treat it as the pattern, not the exception');
  }catch(_){ }
  if(f.fights7) lines.push('The fight (7d): '+f.wins7+' wins, '+f.losses7+' slips'+(f.momentsWon7?', came here and turned away '+f.momentsWon7+'x':''));
  // Per-vice honest state — the truth a streak alone can hide. If he's been logging real use, the
  // Brother must MEET that with grace, never congratulate a clean streak that isn't real.
  if(f.vices && f.vices.length){
    f.vices.forEach(v => {
      const bits = [];
      if(v.mode === 'watch'){
        bits.push('JUST WATCHING this — they have NOT set a goal for it and have not committed to quitting or to a limit');
        bits.push(v.uses7+' logged this week'+(v.daysSinceUse!=null?(', last '+v.daysSinceUse+'d ago'):''));
        bits.push('do NOT congratulate a streak, do NOT call anything a relapse, and do NOT push them to quit — reflect what they logged and let them draw the conclusion');
      } else if(v.mode === 'moderate'){
        // Say which kind of limit it is, or say neither. Never label one as the other.
        const _lim = [];
        if(v.weeklyLimit) _lim.push(v.weeklyLimit+'/wk');
        if(v.nightlyLine) _lim.push('a line of '+v.nightlyLine+' in one sitting');
        bits.push('keeping it within a limit'+(_lim.length?(' of '+_lim.join(', ')):''));
        bits.push(v.uses7+' logged this week');
      } else {
        if(v.cleanDays != null) bits.push(v.cleanDays+' day'+(v.cleanDays===1?'':'s')+' clean');
        if(v.uses7 > 0) bits.push('BUT honestly used '+v.uses7+'x in 7d'+(v.daysSinceUse!=null?(', last '+v.daysSinceUse+'d ago'):'')+' — meet with grace, not a false streak');
      }
      if(v.turnedAway7) bits.push('turned away '+v.turnedAway7+'x this week');
      if(v.hardHour) bits.push('hardest around '+v.hardHour+(v.topTrigger?(', often '+v.topTrigger):''));
      if(v.plan){ if(v.plan.why) bits.push('their WHY (say it back to them): "'+v.plan.why+'"'); if(v.plan.move) bits.push('the move THEY chose: '+v.plan.move); }
      lines.push('· '+v.name+': '+bits.join('; '));
    });
  }
  // The person's own values, in their own order — the only standard the counsel may argue from.
  // A mirror, never a judge: never scored, never graded, never used to imply they are failing.
  if(s.values && s.values.top && s.values.top.length){
    lines.push('What THEY said matters most, in their order: '+s.values.top.map(function(v,i){ return (i+1)+' '+v; }).join(', ')+'.'
      + (s.values.why?(' In their own words about the first one: "'+s.values.why+'"'):'')
      + ' Use THEIR words, not yours, and ask whether a choice moves toward these. NEVER score, grade or rank them against their values, and never imply they are failing them.');
  }
  if(s.readiness) lines.push('Readiness today: '+s.readiness.score+'/100 ('+s.readiness.level+')');
  if(s.money && (s.money.hasDebt || s.money.reclaimed > 0)) lines.push('Money: '+(s.money.hasDebt?(curSym()+s.money.totalDebt+' debt remaining'):'no tracked debt')+(s.money.reclaimed>0?(', '+curSym()+s.money.reclaimed+' reclaimed from vices'):'')+'. (Debt is a real weight — freedom is the goal.)');
  if(s.sex) lines.push('They are '+(s.sex==='female'?'a woman':'a man')+' — speak as an older sibling who understands what that means for them (training, nutrition, the specific pressures), same love, attuned to who they actually are. Never patronising.');
  if(s.activity.daysQuiet != null && s.activity.daysQuiet >= 2) lines.push('Note: nothing logged in '+s.activity.daysQuiet+' days.');
  try{
    const _fs = (typeof fastSeasonNow==='function') ? fastSeasonNow() : null;
    if(_fs) lines.push('SEASON OF FASTING: '+_fs.name+', day '+_fs.dayN+(_fs.total?(' of '+_fs.total):'')+'. This is a sacred/chosen discipline, NOT a diet. Do NOT nag about an empty daytime food diary, do NOT mention weight, fat loss or calories burned, and do NOT shame a broken fast. Speak to timing, energy and meaning instead.');
  }catch(_){}
  return lines.length ? lines.join('\n') : 'Not much logged yet — early days.';
}
function buildPTCtx(){
  try{ loadV(); loadF(); loadH(); }catch(_){}
  const userName = ls('totry_name') || 'this person';
  const dayCount = (typeof getDayCount==='function') ? getDayCount() : 0;
  const split = (typeof getUserSplit==='function') ? getUserSplit() : [];
  const ti = (typeof tIdx==='function') ? tIdx() : 0;
  const todayFocus = split[ti] && split[ti].focus ? split[ti].focus : 'Rest';
  const nutGoals = ls('totry_nut_goals') || defaultNutGoals();
  const bodyEntries = ls('totry_body') || [];
  const currentWeight = bodyEntries[0] && bodyEntries[0].weight ? bodyEntries[0].weight : null;
  const goalWeight = ls('totry_goal_weight') || null;
  const trainGoal = ls('totry_train_goal') || null;     // what they chose the plan FOR
  const trainDays = ls('totry_train_days') || null;     // how many days a week they said they have
  // Same dead key: the coach was never told whether this person is cutting, gaining or maintaining —
  // one of the most basic things a whole-life coach should know before it talks about food or training.
  const goalIntent = (function(){
    try{
      const g = (typeof _goalDir==='function') ? _goalDir() : '';
      return g==='lose' ? 'losing fat' : (g==='gain' ? 'building muscle' : (g==='maintain' ? 'maintaining' : ''));
    }catch(_){ return ''; }
  })();
  // Recent training — pull last few sessions from workout history (Hevy-synced or local)
  let recentTraining = 'No recent sessions logged.';
  try{
    const workouts = ls('totry_workouts') || ls('totry_pt_sessions') || [];
    if(workouts.length){
      recentTraining = workouts.slice(0,5).map(w => {
        const title = w.title || w.name || w.routine || 'Session';
        const when = w.date ? new Date(w.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'}) : '';
        const exCount = (w.exercises && w.exercises.length) ? w.exercises.length + ' exercises' : '';
        const vol = w.volume ? Math.round(w.volume) + 'kg volume' : '';
        return '- ' + [title, when, exCount, vol].filter(Boolean).join(', ');
      }).join('\n');
    }
  }catch(_){}
  // Today's nutrition so far
  const todayKey = new Date().toLocaleDateString('en-AU');
  const nutLog = ls('totry_nutlog') || {};
  const todayEntries = nutLog[todayKey] || [];
  const todayCals = Math.round(todayEntries.reduce((a,e)=>a+(e.cal||0),0));
  const todayPro = Math.round(todayEntries.reduce((a,e)=>a+(e.pro||0),0));
  // Strava context if present
  let cardioCtx = '';
  try{
    const acts = ls('totry_strava_activities') || [];
    // THE FIELD THIS FILTERED ON IS NEVER WRITTEN. The Strava sync stores `date: act.start_date_local`
    // (35-strava.js:303); nothing anywhere writes `start_date` onto a saved activity. So the whole
    // block was dead — this carefully-composed line, the one place the coach is handed real HR and
    // effort data, has never once reached the model. Verified both ways: with the shape the sync
    // actually writes the line is absent, and adding a start_date field to the same rows produces it.
    const _actDate = x => (x && (x.start_date || x.date)) || null;
    // NEWEST FIRST, because the line calls itself "Most recent cardio". The stored order is whatever
    // the Strava sync happened to write, so [0] handed the coach the OLDEST activity in the fortnight:
    // someone who ran 10km yesterday was described to the model as a twelve-day-old 40km ride, and
    // yesterday's run was invisible. This is the one place the coach is given real HR and effort data,
    // so getting it wrong makes it confidently wrong rather than merely silent.
    const _fresh = acts.filter(x => _actDate(x) && (Date.now() - new Date(_actDate(x)).getTime()) < 14*86400000)
      .sort((x, y) => new Date(_actDate(y)).getTime() - new Date(_actDate(x)).getTime());
    if(_fresh.length){ const a = _fresh[0];
      cardioCtx = '\nMost recent cardio (Strava, ' + new Date(_actDate(a)).toLocaleDateString('en-AU') + '): ' + (a.type||'activity') + ', ' + (a.distance? dFmt(a.distance):'') + (a.moving_time? ', '+Math.round(a.moving_time/60)+'min':'')
        + (a.avg_hr? ', avg HR '+a.avg_hr+'bpm':'') + (a.max_hr? ' (max '+a.max_hr+')':'')
        + ((a.calories && !(typeof nutGentle==='function'&&nutGentle()))? ', '+a.calories+' cal':'') + (a.suffer_score? ', effort '+a.suffer_score:'')
        + '. (Use this real performance data — HR and effort tell you how hard it actually was.)';
    }
  }catch(_){}

  return (typeof brotherSys==='function' ? brotherSys() : '') + `You are the personal strength & nutrition coach inside To Try, ${userName}'s app.${trainGoal ? ` They built this plan for ${trainGoal}${trainDays ? `, training ${trainDays} days a week` : ''} — coach toward that, not toward a generic programme.` : ''} You know them and their training, and you coach like a real PT who's invested in their progress — not a generic exercise database.

WHO THEY ARE:
${userName} | Day ${dayCount} of their journey${goalIntent?'\nGoal: '+goalIntent:''}
Current weight: ${currentWeight?wFmt(currentWeight):'not logged'}${goalWeight?' → goal '+wFmt(goalWeight):''}
${(typeof nutGentle==='function'&&nutGentle())?'Daily nutrition target: held privately \u2014 this person has numbers turned off.':('Daily nutrition target: '+nutGoals.cal+' cal / '+nutGoals.pro+'g protein')}
Today's planned focus: ${todayFocus}

RECENT TRAINING:
${recentTraining}${cardioCtx}${_ptIntel()}

TODAY SO FAR:
${nutPromptBlock(todayCals, todayPro, nutGoals.cal, nutGoals.pro, todayEntries.length).replace(/^- /,'')}

THEIR WHOLE LIFE RIGHT NOW (body, mind, and soul — this is what makes you more than a PT; reference it when it's relevant, connect across these domains, but never list it back robotically):
${(function(){ try{ return (typeof getLifeState==='function') ? getLifeState().brief : ''; }catch(_){ return ''; } })()}

HOW TO COACH:
${(typeof nutGentle==='function'&&nutGentle())?'Talk like a knowledgeable coach who knows this person\u2019s training history \u2014 reference it. Their calorie and macro numbers are DELIBERATELY hidden from them, so describe food in portions and plates, never in figures.':'Talk like a knowledgeable coach who actually knows this person\u2019s numbers and history \u2014 reference them.'} When they ask for a workout or a meal, be specific (exact exercises, sets, reps, rest; exact foods, calories, protein) BUT also explain the WHY in a sentence or two so they learn, and connect it to their goal and where they are right now. When they're discouraged or inconsistent, address that honestly and constructively — training is mental too. Don't dump a wall of text for a simple question, but when they're asking something real (programming, a plateau, how to structure their week, recovery), give them a genuinely substantial, reasoned answer they could act on today. You have their real data above — use it, never say you don't have access. Be the coach they train hard for because they don't want to let you down.`;
}

function buildCtx(){
  loadV();loadF();loadH();
  const tw=vices.reduce((a,v)=>a+(v.w||0),0);
  const tf=vices.reduce((a,v)=>a+(v.total||0),0);
  const owed=(typeof debts!=='undefined'?debts:[]).reduce((a,d)=>a+(d.t-d.p),0);
  const streak=getStreak();
  const split=getUserSplit();
  const ti=tIdx();
  const todayFocus=split[ti]?.focus||'Rest';
  const nutGoals=ls('totry_nut_goals')||defaultNutGoals();
  const bodyEntries=ls('totry_body')||[];
  const currentWeight=bodyEntries[0]?.weight||null;
  // Flagged entries are excluded permanently. Gating at write time is not enough on its own: this line
  // re-reads the journal on EVERY coach message, so without the filter a disclosure written once was
  // sent to the model again and again for as long as it stayed in the newest three.
  const recentJournal=(ls('totry_journal')||[]).filter(e=>!e.flagged).slice(0,3).map(e=>e.text?.slice(0,100)).filter(Boolean).join('; ');
  const winRate=tf>0?Math.round((tw/tf)*100):0;
  
  // Per-vice clean days with grace
  const viceDetails=vices.map(v=>{
    const clean=viceCleanDays(v);
    if(v.kind==='letgo'){ return v.n+': '+clean+' day'+(clean===1?'':'s')+' into letting go (a grief/attachment they’re releasing — healing goal, NOT a clean-streak; going back is part of it, meet with grace, never "days clean" or relapse language)'; }
    const total=(v.cleanDaysTotal||0)+clean;
    let s=v.n+': '+clean+' days clean';
    if(v.relapseCount>0)s+=' ('+total+' total across '+v.relapseCount+' attempts)';
    return s;
  }).join(' | ')||'none set';
  
  // ── LIVE TODAY STATE ──
  // Today's nutrition log so far
  const todayKey = new Date().toLocaleDateString('en-AU');
  const nutLog = ls('totry_nutlog') || {};
  const todayEntries = nutLog[todayKey] || [];
  const todayCals = Math.round(todayEntries.reduce((a,e)=>a+(e.cal||0),0));
  const todayPro = Math.round(todayEntries.reduce((a,e)=>a+(e.pro||0),0));
  const todayMeals = todayEntries.length;
  const calVsGoal = nutGoals.cal > 0 ? Math.round((todayCals / nutGoals.cal) * 100) : 0;
  const proVsGoal = nutGoals.pro > 0 ? Math.round((todayPro / nutGoals.pro) * 100) : 0;
  
  // Today's habits state
  const habitsToday = habits.map(h => h.n + ' ' + (h.d[ti] ? '✓' : '○')).join(', ') || 'none';
  const habitsDone = habits.filter(h => h.d[ti] === 1).length;
  
  // Water + fasting
  const waterToday = (ls('totry_water') || {})[todayKey] || 0;
  const waterGoal = (typeof waterGoalMl==='function') ? waterGoalMl() : 2000;
  const waterTodayL = (waterToday/1000).toFixed(2).replace(/\.?0+$/,'') + 'L';
  const waterGoalL = (waterGoal/1000).toFixed(1) + 'L';
  // Sacraments — spiritual life context (Catholic user growing closer to God)
  const _conf = ls('totry_confessions') || [];
  const _mass = ls('totry_masses') || [];
  let sacramentCtx = '';
  if(_conf.length || _mass.length){
    // Latest by DATE — these arrays are ordered by when a row was entered, not by when it happened.
    const _cL = latestByDate(_conf), _mL = latestByDate(_mass);
    const cd = _cL ? Math.floor((Date.now()-new Date(_cL.date))/86400000) : null;
    const md = _mL ? Math.floor((Date.now()-new Date(_mL.date))/86400000) : null;
    sacramentCtx = '\nSACRAMENTS: ' +
      (cd!==null ? 'Last confession '+cd+' days ago. ' : 'No confession logged. ') +
      (md!==null ? 'Last Mass '+md+' days ago ('+_mass.length+' total). ' : 'No Mass logged. ');
  }
  const fastState = ls('totry_fasting') || {startTs: null, protocol: 16};
  let fastingCtx = '';
  if(fastState.startTs){
    const hr = (Date.now() - fastState.startTs) / 3600000;
    fastingCtx = '\nFasting: currently ' + hr.toFixed(1) + 'h into a ' + fastState.protocol + 'h fast';
  }
  
  // Today's workouts logged
  const workouts = ls('totry_workouts') || [];
  const todayDateStr = new Date().toLocaleDateString('en-AU', {weekday:'short', day:'numeric', month:'short', year:'numeric'});
  const workoutsToday = workouts.filter(w => w.date === todayDateStr);
  const calsBurnedToday = Math.round((ls('totry_calorie_burns') || {})[todayKey] || 0);
  // Gentle mode is about CALORIE FIGURES, not about food specifically. The nutrition line was fixed and
  // these two were not, so with numbers off the prompt still carried "Burned 620 cal from training
  // today" — and my own ratchet passed, because it only checked the line it had already fixed. What the
  // person turned off was seeing calorie counts; the coach must not read them one screen over.
  const _gentleNow = (typeof nutGentle==='function' && nutGentle());
  let workoutCtx = '';
  if(workoutsToday.length){
    workoutCtx = '\nTrained today: ' + workoutsToday.map(w => w.splitFocus || w.type).join(', ')
      + (_gentleNow ? '' : ' (' + calsBurnedToday + ' cal burned)');
  } else if(calsBurnedToday > 0 && !_gentleNow){
    workoutCtx = '\nBurned ' + calsBurnedToday + ' cal from training today';
  }
  
  // Recent exercise notes + high RPE (last 5 sessions) — gives Coach insight into what the lifter is feeling
  let trainingInsightCtx = '';
  if(workouts.length){
    const recent = workouts.slice(0, 5);
    const notesFound = [];
    let highRpeCount = 0;
    let allRpeSets = 0;
    recent.forEach(w => {
      (w.exercises || []).forEach(ex => {
        if(ex.notes && ex.notes.trim()){
          notesFound.push(ex.name + ': "' + ex.notes.trim().slice(0, 80) + '"');
        }
        (ex.sets || []).forEach(s => {
          if(s.rpe){
            allRpeSets++;
            const n = parseInt(s.rpe);
            if(n >= 9) highRpeCount++;
          }
        });
      });
    });
    if(notesFound.length){
      trainingInsightCtx += '\nRecent training notes: ' + notesFound.slice(0, 4).join('; ');
    }
    if(allRpeSets > 0){
      const intensityPct = Math.round((highRpeCount / allRpeSets) * 100);
      if(intensityPct >= 40){
        trainingInsightCtx += '\nIntensity flag: ' + intensityPct + '% of recent logged sets were RPE 9-10. Possibly approaching overtraining.';
      }
    }
    
    // Neglected muscle groups (using the existing classifier)
    if(typeof computeWeeklyVolumeByMuscle === 'function'){
      try{
        const weekly = computeWeeklyVolumeByMuscle();
        const allGroups = ['chest','back','shoulders','biceps','triceps','quads','hamstrings','glutes','calves','core'];
        const neglected = allGroups.filter(g => !weekly[g] || weekly[g] === 0);
        if(neglected.length >= 3 && neglected.length < allGroups.length){
          trainingInsightCtx += '\nNot trained this week: ' + neglected.join(', ');
        }
      }catch(e){}
    }
    // Strength intelligence (WS1): current estimated 1RMs + recent PRs, so the coach can give
    // real progressive-overload advice instead of generic encouragement.
    try{
      const prs = ls('totry_prs') || {};
      const prNames = Object.keys(prs);
      if(prNames.length){
        const top = prNames.map(n => ({n, orm: prs[n].orm||0})).sort((a,b)=>b.orm-a.orm).slice(0,5);
        trainingInsightCtx += '\nEstimated 1RMs: ' + top.map(x => x.n + ' ~' + x.orm + 'kg').join(', ');
        // Any PR set in the last 7 days?
        const wk = Date.now() - 7*86400000;
        const recentPRs = prNames.filter(n => { const d = prs[n].date ? new Date(prs[n].date).getTime() : 0; return d >= wk; });
        if(recentPRs.length) trainingInsightCtx += '\nNEW PRs this week (celebrate these): ' + recentPRs.join(', ');
      }
    }catch(e){}
    // Hybrid/endurance load + interference (WS4): so the coach sequences training intelligently.
    try{
      if(typeof weeklyLoadByModality === 'function'){
        const load = weeklyLoadByModality();
        const parts = Object.keys(load).map(m => m + ' ' + load[m].sessions + 'x' + (load[m].minutes?' ('+load[m].minutes+'min)':''));
        if(parts.length > 1) trainingInsightCtx += '\nThis week\u2019s training mix: ' + parts.join(', ');
      }
      if(typeof interferenceNote === 'function'){
        const intf = interferenceNote();
        if(intf) trainingInsightCtx += '\nInterference note: ' + intf;
      }
    }catch(e){}
  }
  
  // Today's mood/morning if logged
  // Flagged rows are excluded the same way safeJournal() excludes flagged journal entries: a crisis
  // disclosure written into the morning intention must never ride along to a model on a later
  // message. This is exactly the v439 leak (the gate stopped the reply and left the sentence in the
  // context), one store over. The person's own words stay in totry_mornings exactly as written.
  const mornings = safeMornings();   // one definition — see safeMornings()
  // Match on the ISO timestamp, not the display string. completeMorning() writes
  // date: toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'}) — "Tue, 11 Aug" —
  // while todayKey here is the plain en-AU key "11/08/2026". Those can never be equal, so todayMorning
  // was ALWAYS undefined: the coach never once heard the gratitude or the intention a person had just
  // written, in an app whose entire claim is that the fronts talk to each other.
  const todayMorning = mornings.find(m => {
    if(!m) return false;
    if(m.ts){ try{ if(new Date(m.ts).toLocaleDateString('en-AU') === todayKey) return true; }catch(_){} }
    return m.date === todayKey;   // tolerate any older row that stored the plain key
  });
  let moodCtx = '';
  if(todayMorning){
    if(todayMorning.mood) moodCtx += '\nThis morning they felt: ' + todayMorning.mood;
    if(todayMorning.intention) moodCtx += '\nToday\'s intention: "' + todayMorning.intention + '"';
  }

  // Their most recent honest evening reflection ("if the people you love watched today, what would
  // they see?"). A profound self-knowledge signal — the brother holds it and speaks to the gap
  // between who they are and who they want to be seen as. Grace-first, never a weapon.
  let honestCtx = '';
  try{
    // Never a flagged one — see completeEvening. Without this the gate would stop the moment and the
    // sentence would still be read back to the model on every later coach message.
    const lastSee = ritualLog('totry_evenings').find(e => e && !e.flagged && (e.see||'').trim());
    if(lastSee && lastSee.see) honestCtx = '\nTheir last honest evening reflection — asked what the people they love would see in their day — was: "' + lastSee.see.trim().slice(0,220) + '". Hold this tenderly; speak to who they want to become, never shame them with it.';
  }catch(_){ }

  // Recent prayer log
  const prayers = ls('totry_prayers') || [];
  const recentPrayers = prayers.slice(0, 3);
  let prayerCtx = '';
  if(recentPrayers.length){
    const unanswered = prayers.filter(p => p.status === 'open').length;
    prayerCtx = '\nPrayer life: ' + prayers.length + ' prayers logged, ' + unanswered + ' still being prayed over';
  }
  
  // ── END LIVE STATE ──
  
  // Latest weekly check-in
  const lastCheckin=bodyEntries.find(e=>e.scores);
  let checkinCtx='';
  if(lastCheckin&&lastCheckin.scores){
    const s=lastCheckin.scores;
    checkinCtx='\nLATEST WEEKLY CHECK-IN: Training '+s.train+'/10, Nutrition '+s.nutrition+'/10, Sleep '+s.sleep+'/10, Stress '+s.stress+'/10, Energy '+s.energy+'/10, Faith '+s.faith+'/10';
    if(lastCheckin.win)checkinCtx+='\n  Their recent win: "'+lastCheckin.win+'"';
    if(lastCheckin.struggle)checkinCtx+='\n  Their recent struggle: "'+lastCheckin.struggle+'"';
    if(lastCheckin.focus)checkinCtx+='\n  Their focus this week: "'+lastCheckin.focus+'"';
  }
  // Readiness (WS6) — recovery-aware signal so the coach can tell them to push or back off today.
  try{
    if(typeof computeReadiness==='function'){
      const rd = computeReadiness();
      if(rd) checkinCtx += '\nREADINESS TODAY: ' + rd.score + '/100 (' + rd.level + ')' + (rd.reasons.length?' \u2014 '+rd.reasons.join(', '):'') + '. ' + rd.advice;
    }
    // Mobility profile — so the coach knows tight areas worth addressing.
    if(typeof getMobilityProfile==='function'){
      const mp = getMobilityProfile();
      if(mp){ const tight = Object.keys(mp).filter(k=>k!=='_ts'&&mp[k]<=2); if(tight.length) checkinCtx += '\nTight mobility areas: ' + tight.join(', '); }
    }
  }catch(e){}
  
  // Identity + season (who they're becoming)
  const identity=ls('totry_identity')||'';
  const season=ls('totry_season')||'';
  const why=ls('totry_why')||'';
  
  // Recent fights
  const fightLog=ls('totry_fight_log')||[];
  const recentFights=fightLog.slice(0,5);
  let fightCtx='';
  if(recentFights.length){
    const wonRecent=recentFights.filter(f=>f.won).length;
    fightCtx='\nRECENT FIGHTS: Won '+wonRecent+' of last '+recentFights.length+'.';
    const triggers=recentFights.map(f=>f.trigger).filter(Boolean);
    if(triggers.length)fightCtx+=' Triggers mentioned: '+triggers.join(', ')+'.';
  }
  
  // Strava activity
  const strava=ls('totry_strava_activities')||[];
  let stravaCtx='';
  if(strava.length){
    const recent=strava.slice(0,3);
    stravaCtx='\nRECENT WORKOUTS (Strava): '+recent.map(a=>a.type+' '+(a.distance?dFmt(a.distance,{dp:0}):'')).join(', ');
  }
  
  // Steps from Google
  const todaySteps=ls('totry_today_steps');
  // The step + sleep goals he set should actually inform the brother — a target no one references
  // is a target that does nothing. Feed them in with today's actuals so counsel can use them.
  const stepGoal=parseInt(ls('totry_step_goal'))||0;
  const sleepGoal=parseFloat(ls('totry_sleep_goal'))||0;
  let stepsCtx=todaySteps?('\nTODAY\'S STEPS: '+todaySteps+(stepGoal?(' (goal '+stepGoal+(todaySteps>=stepGoal?' — hit it':'')+')'):'')):(stepGoal?('\nSTEP GOAL: '+stepGoal+'/day (none logged yet today)'):'');
  if(sleepGoal) stepsCtx+='\nSLEEP GOAL: '+sleepGoal+'h a night';
  
  return brotherSys() + sharedWisdomNote() + `You're their whole-life coach here as well as their brother — you have their REAL data right now, so use it.

WHO THEY ARE:
${userName} | Day ${getDayCount()} of their journey | ${streak} day${streak===1?'':'s'} of habits kept THIS WEEK (resets Monday — not an all-time streak, never call it one)${identity?'\nIDENTITY (who they are becoming): "'+identity+'"':''}${season?'\nCURRENT SEASON: '+season:''}${why?'\nTHEIR WHY: "'+why+'"':''}

THE FIGHT:
${viceDetails}
Overall: ${tw} wins from ${tf} battles (${winRate}% win rate)${fightCtx}

TODAY (live data, right now):
${nutPromptBlock(todayCals, todayPro, nutGoals.cal, nutGoals.pro, todayMeals)}
- Habits ticked: ${habitsDone}/${habits.length} — ${habitsToday}
- Water: ${waterTodayL}/${waterGoalL}${fastingCtx}${workoutCtx}${trainingInsightCtx}${moodCtx}${honestCtx}

BODY & TRAINING:
Today's planned training: ${todayFocus}
Weight: ${currentWeight?wFmt(currentWeight):'Not logged'}
${(typeof nutGentle==='function'&&nutGentle())?'Nutrition target: held privately \u2014 numbers are turned off for this person.':('Nutrition target: '+nutGoals.cal+' cal / '+nutGoals.pro+'g protein')}${stravaCtx}${stepsCtx}${checkinCtx}
${(function(){ let s=''; try{ if(typeof computeReadiness==='function'){ const rd=computeReadiness(); if(rd) s+='\\nReadiness today: '+rd.score+'/100 ('+rd.level+'). '+rd.advice; } if(typeof detectVicePatterns==='function'){ const vp=detectVicePatterns(); if(vp&&vp.patterns&&vp.patterns.length) s+='\\nVice patterns (use gently, only if they raise it): '+vp.patterns.join(' '); } const fw = (typeof ls==='function') ? (ls('totry_feeling_wins')||[]) : []; if(fw.length){ const _since = Date.now()-7*86400000; const _recent = fw.filter(w=>w.ts && new Date(w.ts).getTime()>=_since); if(_recent.length){ s+='\\nIN THE LAST WEEK they reached for help the instant an urge rose and got through it '+_recent.length+' time(s) \u2014 this is them fighting in real time; honour it. Recent feelings they named: '+_recent.slice(0,3).map(w=>String.fromCharCode(34)+(w.feeling||'an urge').slice(0,60)+String.fromCharCode(34)).join(', ')+'.'; } } }catch(e){} return s; })()}

FINANCES: ${curSym()}${Math.round(owed).toLocaleString()} debt remaining${prayerCtx}${sacramentCtx}

RECENT JOURNAL: ${recentJournal||'No entries yet'}
${(function(){ const m = (typeof ls==='function') ? ls('totry_coach_memory') : null; return m && m.summary ? '\nWHAT YOU\u2019VE BEEN WORKING ON TOGETHER (from past conversations — reference it naturally, like a coach who remembers):\n'+m.summary : ''; })()}

HOW TO COACH:
Speak like a trusted friend and mentor who knows their whole situation — direct, warm, personal, never generic. When they ask about today's progress, USE the live data above (${(typeof nutGentle==='function'&&nutGentle())?'habits, water, training':'calories, habits, water'}, etc.) — don't say "I don't have access to that." You DO have it. Reference their actual numbers when it matters. Hold them to who they said they want to become, with grace not shame. If they've relapsed, meet it as feedback and not a verdict — the falling isn't the line, the getting up is. (Scriptural framing comes from FAITH CONTEXT above and nowhere else: never reach for a Bible verse unless that is their tradition.)

Match the depth of your reply to what they're asking. A quick check-in deserves a few warm, focused sentences. But when they're wrestling with something real — a craving, a setback, a hard decision, a question about who they're becoming — give them a substantial, thoughtful answer: name what's really going on, draw on their actual situation, offer a concrete next step or two, and where it fits naturally, ground it in their tradition’s teaching or a solid principle (per the faith context). Don't pad, don't ramble, and always finish your thought completely — but don't artificially cut yourself short either. Be the kind of voice anyone would actually want in their corner at 11pm. You are not a chatbot. You are their coach.`;
}


// ─── OFFLINE GRACE ─────────────────────────────────────────────
let isOnline = navigator.onLine;
window.addEventListener('online', ()=>{ isOnline=true; });
window.addEventListener('offline', ()=>{ isOnline=false; });


// Multi-provider AI client. The Edge Function picks Gemini → Groq → OpenRouter → Anthropic.
// Returns {text, provider, error} so callers can show real failures instead of pretending.
// Hard timeout on every path so the UI never hangs on "Testing..." / "Thinking...".
async function api(sys, hist, msg, tok, opts){
  // MEASURED against the live proxy today, which is what the app actually talks to. The chain is
  // Gemini 2.5 Flash first (Groq's model 404s — qwen/qwen3-32b was retired — and OpenRouter is 429
  // rate-limited on the free tier), and 2.5 Flash is a THINKING model: it spends the token budget on
  // reasoning before it emits a character. At max_tokens 700 — what estimateMealMacros sent — a meal
  // estimate came back as 74 characters ending mid-number, `"carb":123`, flagged "best available
  // (truncated)". JSON.parse threw. Every time. On a perfect connection.
  //
  //   simple total-only prompt   700 truncates · 1200 truncates · 1800 PARSES
  //   full items+total prompt   2400 truncates · 4000 PARSES
  //
  // Seven JSON-parsing callers sat under that. max_tokens is a CEILING, not a target — raising it
  // costs nothing on a short answer and is the difference between an answer and nothing on a long
  // one. A truncated reply is worth exactly zero to the person waiting for it.
  tok = Math.max(tok || 1200, 2000);
  opts = opts || {};
  const TIMEOUT_MS = opts.timeout || 30000; // 30s ceiling — for the WHOLE call, not per attempt
  // Deadline for everything below. Two methods are tried in sequence; giving each the full ceiling
  // made the real wait double the number the caller asked for, on the surface where it matters most.
  const _deadline = Date.now() + TIMEOUT_MS;
  const _left = () => Math.max(1200, _deadline - Date.now());   // never below a second — a doomed
                                                                // request is still better than none
  const body = {
    max_tokens: tok,
    system: sys,
    messages: [...(hist || []), {role:'user', content: msg}]
  };
  if(opts.prefer) body.prefer = opts.prefer; // e.g. 'anthropic' for crisis SOS
  if(opts.web_search) body.web_search = true; // route to search-capable provider (food lookup)
  // No user id in the body. The proxy takes identity from the signed token and nothing else — it used
  // to prefer this field, which meant the public anon key was enough to spend someone else's quota.
  // Sending it anyway would only tell the next reader something untrue about how metering works.
  
  // Track this call for usage monitoring (always log attempt, regardless of success)
  trackAPIUsage('ai', tok);
  
  let lastError = null;
  
  // Helper: race any promise against a timeout
  const withTimeout = (p, ms, label) => Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out after ' + (ms/1000) + 's (' + label + ')')), ms))
  ]);
  
  // Method 1: Supabase client (handles auth correctly)
  if(sb && sb.functions){
    try{
      const {data, error} = await withTimeout(
        sb.functions.invoke('ai-proxy', {body}),
        _left(),
        'supabase-invoke'
      );
      if(!error && data){
        if(data.text){
          const _frag = data.note === 'best available (truncated)';
          if(_frag){
            // Give it one honest retry with room to finish before giving up on the AI path.
            if(!body.__retriedTruncated){
              try{
                const _r = await withTimeout(
                  sb.functions.invoke('ai-proxy', { body: Object.assign({}, body, {
                    // 2048 was below what a thinking model needs to finish a real answer, so the
                    // one honest retry truncated too and the person got nothing twice.
                    max_tokens: Math.min(6000, Math.round((body.max_tokens || 600) * 2)),
                    __retriedTruncated: true
                  })}),
                  _left(),
                  'supabase-invoke-retry'
                );
                const _d = _r && _r.data;
                if(!(_r && _r.error) && _d && _d.text && _d.note !== 'best available (truncated)'){
                  window.__lastAIProvider = _d.provider;
                  window.__lastAIModel = _d.model || null;
                  window.__lastAIError = null;
                  return _d.text;
                }
              }catch(_){ }
            }
            // Still a fragment. Fall back to the written copy rather than speaking half a sentence.
            window.__lastAIError = { error: 'truncated', note: data.note };
            return '';
          }
          window.__lastAIProvider = data.provider;
          window.__lastAIModel = data.model || null;
          window.__lastAIError = null;
          return data.text;
        }
        // Server-side daily limit reached — surface the friendly message, don't keep retrying
        if(data.error === 'rate_limited'){
          window.__lastAIError = data;
          return '';   // NOT the message — see getAIErrorMessage(); callers render a return value as content
        }
        if(data.error){
          lastError = data;
          console.warn('[ai-proxy] all providers failed:', data);
        }
      } else if(error){
        lastError = {error: error.message || String(error), context: error.context || null};
        console.warn('[ai-proxy] invoke error:', error);
      }
    }catch(e){
      lastError = {error: String(e?.message || e)};
      console.warn('[ai-proxy] invoke threw/timed out:', e);
    }
  }
  
  // Method 2: Direct fetch fallback (with its own timeout via AbortController)
  try{
    const headers = {'Content-Type':'application/json', 'apikey': SUPABASE_ANON_KEY};
    if(sb){
      try{
        const {data:{session}} = await withTimeout(sb.auth.getSession(), 5000, 'get-session');
        if(session?.access_token) headers['Authorization'] = 'Bearer ' + session.access_token;
      }catch(e){}
    }
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), _left());   // the REMAINING budget, not a fresh one
    let r, d;
    try{
      r = await fetch(API, {method:'POST', headers, body: JSON.stringify(body), signal: ctrl.signal});
      d = await r.json().catch(() => ({}));
    } finally {
      clearTimeout(tid);
    }
    if(r && r.ok && d.text){
      window.__lastAIProvider = d.provider;
      window.__lastAIError = null;
      return d.text;
    }
    lastError = d.error ? d : {error: 'HTTP ' + (r ? r.status : '?'), body: d};
    console.warn('[ai-proxy] direct fetch failed:', r ? r.status : '?', d);
  }catch(e){
    const msg = e?.name === 'AbortError' ? 'Request timed out after ' + (TIMEOUT_MS/1000) + 's' : String(e?.message || e);
    lastError = {error: msg};
    console.warn('[ai-proxy] direct fetch threw:', e);
  }
  
  // All providers down - return empty string, but stash error for callers who care
  window.__lastAIError = lastError;
  return '';
}

// Get a human message about why AI is currently down (or null if it works)
// WHAT TO SHOW WHEN THE COACH IS NOT THERE.
//
// api() returns an empty string when every provider fails — it does not throw. So `if(response &&
// response.trim())` quietly did nothing and the surrounding catch was unreachable: three surfaces
// promised a person something ("your coach is reading your week…", "Show me my patterns") and then
// rendered an empty box. Silence reads as "there is nothing to say about you", which on the vice
// patterns screen is the opposite of true and lands on someone already struggling.
//
// `local` is the honest offline answer where one exists — the patterns are computed on device before
// the model is ever asked, so the model going down should not take them with it.
function aiUnavailableHtml(local){
  const why = (typeof getAIErrorMessage === 'function' && getAIErrorMessage()) ||
              'I could not reach the coach just now.';
  const esc = t => String(t == null ? '' : t).replace(/</g, '&lt;');
  return (local ? '<div style="font-size:13px;color:var(--tx2);line-height:1.7;white-space:pre-wrap">' + esc(local) + '</div>' : '') +
    '<div style="font-size:12px;color:var(--tx3);line-height:1.6' + (local ? ';margin-top:10px' : '') + '">' +
      esc(why) + (local ? ' The reading above is from your own logged data, not the coach.' : ' Nothing is lost — try again in a moment.') +
    '</div>';
}

function getAIErrorMessage(){
  const err = window.__lastAIError;
  if(!err) return null;
  // The server's daily-limit notice is the most useful message we have — it names the reset and says
  // the rest of the app keeps working. api() stopped returning it as CONTENT (it was being rendered
  // as a person's prayer), so it surfaces here instead.
  if(err.error === 'rate_limited' && err.message) return err.message;
  
  // Try to extract specific failure reason from attempts
  if(err.attempts && err.attempts.length){
    const attempted = err.attempts.filter(a => !a.skipped);
    
    // If every provider gave a quota/billing error → out of free tier
    const allQuota = attempted.length > 0 && attempted.every(a => {
      const e = (a.error || '').toLowerCase();
      return e.includes('credit') || e.includes('quota') || e.includes('billing') || e.includes('insufficient');
    });
    if(allQuota) return 'AI quota reached on all providers — usually resets within 24h. (Gemini/Groq free tiers refill daily; Anthropic monthly.)';
    
    // If all 429
    const allRate = attempted.length > 0 && attempted.every(a => a.status === 429 || (a.error||'').toLowerCase().includes('rate'));
    if(allRate) return 'All providers rate-limited. Try again in 30-60 seconds.';
    
    // If a specific provider failed for specific reason, surface it
    const real = attempted[0];
    if(real?.error){
      const e = (real.error || '').toLowerCase();
      if(e.includes('api key') || e.includes('unauthorized') || e.includes('forbidden')) {
        return 'AI keys invalid or missing. Check Supabase secrets (GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY).';
      }
      if(e.includes('timeout')) return 'AI providers timed out. Try a shorter message.';
    }
  }
  
  // Edge function failed entirely (not just providers within it)
  if(err.error){
    const e = (err.error || '').toLowerCase();
    if(e.includes('failed to fetch') || e.includes('network')) return 'Network issue — your phone can\'t reach Supabase. Check Wi-Fi/data.';
    if(e.includes('500') || e.includes('502') || e.includes('503')) return 'Supabase edge function down. Usually back within minutes.';
  }
  
  return 'AI is temporarily unavailable. Try again in a moment.';
}

// Diagnostic: run a tiny test call and report exactly what happens.
// Dev-only — surfaces real reason for AI failure. Probes the edge function directly
// so it can distinguish "edge function unreachable" from "all providers failing".
async function runAIDiagnostic(){
  const out = document.getElementById('ai-diag-out');
  if(out) out.innerHTML = '<span style="color:var(--tx3)">Testing… (max 30s)</span>';
  
  const lines = [];
  const t0 = Date.now();
  
  // Step 1: can we even reach the edge function? Raw fetch, short timeout.
  let session = null;
  try{
    const s = await Promise.race([
      sb.auth.getSession(),
      new Promise((_,r)=>setTimeout(()=>r(new Error('session timeout')),5000))
    ]);
    session = s?.data?.session || null;
    lines.push('Auth session: ' + (session ? '✓ logged in' : '⚠ no session'));
  }catch(e){
    lines.push('Auth session: ✗ ' + (e.message || e));
  }
  
  // Step 2: raw POST to the edge function
  try{
    const headers = {'Content-Type':'application/json', 'apikey': SUPABASE_ANON_KEY};
    if(session?.access_token) headers['Authorization'] = 'Bearer ' + session.access_token;
    
    const ctrl = new AbortController();
    const tid = setTimeout(()=>ctrl.abort(), 30000);
    let r, raw, d;
    try{
      r = await fetch(API, {
        method:'POST', headers, signal: ctrl.signal,
        body: JSON.stringify({max_tokens:50, system:'Reply with exactly OK.', messages:[{role:'user',content:'Test'}]})
      });
      raw = await r.text();
      try{ d = JSON.parse(raw); }catch(_){ d = {_raw: raw}; }
    } finally { clearTimeout(tid); }
    
    lines.push('Edge function HTTP: ' + r.status + ' ' + (r.ok ? '✓' : '✗'));
    
    if(r.ok && d && d.text){
      lines.push('Provider used: ' + (d.provider || '?'));
      lines.push('Reply: "' + String(d.text).slice(0,50) + '"');
      lines.push('Latency: ' + ((Date.now()-t0)/1000).toFixed(1) + 's');
      // Step 3: test VISION specifically (this is what screenshot/food-photo reading uses).
      // A 1×1 PNG is enough to see if a vision provider answers vs returns 503.
      lines.push('');
      lines.push('— Vision (screenshots / food photos) —');
      try{
        const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        const vctrl = new AbortController();
        const vtid = setTimeout(()=>vctrl.abort(), 25000);
        let vr, vraw, vd;
        try{
          vr = await fetch(API, { method:'POST', headers, signal: vctrl.signal,
            body: JSON.stringify({ action:'vision', image_base64: tinyPng, image_mime:'image/png', prompt:'Reply with the word OK.', max_tokens:20 }) });
          vraw = await vr.text();
          try{ vd = JSON.parse(vraw); }catch(_){ vd = {_raw: vraw}; }
        } finally { clearTimeout(vtid); }
        if(vr.ok && vd && vd.text){
          lines.push('Vision: ✓ working (via ' + (vd.provider||'?') + ')');
        } else {
          lines.push('Vision: ✗ not working');
          if(vd && vd.geminiStatus) lines.push('  Gemini vision status: ' + vd.geminiStatus);
          if(vd && vd.openrouterStatus) lines.push('  OpenRouter vision status: ' + vd.openrouterStatus);
          lines.push('  Fix: ensure GEMINI_API_KEY (and ideally OPENROUTER_API_KEY) are set in Supabase secrets. Until then, use "Log it manually" for workouts.');
        }
      }catch(ve){
        lines.push('Vision: ✗ ' + (ve.message || ve));
      }
      renderDiag(out, true, lines, d);
      return;
    }
    // Edge function reached but no text — show the provider attempts if present
    if(d && d.attempts){
      lines.push('— Provider attempts —');
      d.attempts.forEach(a=>{
        lines.push('• ' + (a.provider||'?') + ': ' + (a.skipped ? 'skipped (no key)' : (a.status||'') + ' ' + (fmtErr(a.error)||'failed')));
      });
    } else if(d && d.error){
      lines.push('Error: ' + fmtErr(d.error));
      // Specific, common case: reached Anthropic (paid) directly = free keys missing in Supabase
      const errStr = fmtErr(d.error).toLowerCase();
      if(errStr.includes('credit balance') || errStr.includes('anthropic') || errStr.includes('billing')){
        lines.push('');
        lines.push('⚠ This means it skipped the FREE providers and went straight to paid Anthropic.');
        lines.push('Fix: add GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY in Supabase → Edge Functions → secrets, then redeploy. The free tiers should answer first.');
      }
    } else if(d && d.message){
      lines.push('Message: ' + fmtErr(d.message));
    } else if(d && d._raw){
      lines.push('Raw response: ' + d._raw.slice(0,300));
    } else if(d){
      // No recognised error field — dump the whole object so nothing is hidden
      lines.push('Response: ' + fmtErr(d));
    }
    renderDiag(out, false, lines, d);
  }catch(e){
    const msg = e?.name==='AbortError' ? 'Timed out after 30s — edge function not responding' : (e.message || String(e));
    lines.push('Edge function: ✗ ' + msg);
    lines.push('');
    lines.push('This usually means the ai-proxy function is down, or a CORS/network issue between your phone and Supabase.');
    renderDiag(out, false, lines, {error: msg});
  }
}

// Turn an error value (string, Error, or object) into readable text — never "[object Object]"
function fmtErr(e){
  if(e == null) return '';
  if(typeof e === 'string') return e;
  if(e.message && typeof e.message === 'string') return e.message;
  try{ return JSON.stringify(e); }catch(_){ return String(e); }
}

function renderDiag(out, ok, lines, rawObj){
  if(!out) return;
  let html = '<div style="color:' + (ok?'var(--gr)':'var(--re)') + ';font-weight:600;margin-bottom:6px">' + (ok?'✓ AI is working':'✗ AI is not working') + '</div>';
  html += '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx2);white-space:pre-wrap;line-height:1.6">' + lines.map(l=>l.replace(/</g,'&lt;')).join('\n') + '</div>';
  if(rawObj){
    html += '<details style="margin-top:8px"><summary style="font-size:10px;color:var(--tx3);cursor:pointer">Raw response</summary>' +
      '<pre style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);white-space:pre-wrap;word-break:break-all;margin-top:6px;background:var(--bg3);padding:8px;border-radius:6px">' +
      JSON.stringify(rawObj,null,2).replace(/</g,'&lt;').slice(0,1500) + '</pre></details>';
  }
  out.innerHTML = html;
}

function addMsg(cid,txt,cls){
  const c=document.getElementById(cid);if(!c)return '';
  const id='m'+Date.now()+Math.random().toString(36).slice(2);
  const d=document.createElement('div');d.className='msg '+cls;d.id=id;d.textContent=txt;
  c.appendChild(d);c.scrollTop=c.scrollHeight;return id;
}
function rmMsg(id){const e=document.getElementById(id);if(e)e.remove();}
function ar(el){el.style.height='40px';el.style.height=Math.min(el.scrollHeight,100)+'px';}

// ── COACH ─────────────────────────────────────────────────────
let cH = ls('totry_coach_history') || [];
// Rolling "what we've been working on" memory — survives beyond the 20-message window so the
// coach feels continuous, like it actually remembers you. Updated quietly every few exchanges.
async function maybeUpdateCoachMemory(){
  try{
    const mem = ls('totry_coach_memory') || { summary:'', exchanges:0, updated:null };
    mem.exchanges = (mem.exchanges||0) + 1;
    ls('totry_coach_memory', mem);
    // Only re-distill every 4 user exchanges, and not more than once/day, to respect cost.
    if(mem.exchanges % 4 !== 0) return;
    const today = new Date().toLocaleDateString('en-AU');
    if(mem.updated === today) return;
    if(!navigator.onLine || !sb || !currentUser) return;
    // Feed recent conversation + existing summary; ask for a tight evolving memory.
    const recent = cH.slice(-12).map(m => (m.role==='user'?'Them: ':'Coach: ') + (m.content||'').slice(0,300)).join('\n');
    const prompt = 'You keep a SHORT private memory of what this person and their coach have been working through, so the coach can be continuous across conversations. Here is the current memory and the latest conversation. Return an UPDATED memory: 3-5 short bullet-style lines (no markdown bullets, just newline-separated), capturing ongoing themes, what they\u2019re struggling with, what\u2019s helping, and any commitment they made. Keep it under 120 words. Be specific and warm, not clinical. Return ONLY the memory text.\n\nCURRENT MEMORY:\n' + (mem.summary || '(none yet)') + '\n\nLATEST CONVERSATION:\n' + recent;
    const updated = await api('You maintain a concise, caring memory of an ongoing coaching relationship.', [], prompt, 350);
    if(updated && updated.trim()){
      mem.summary = updated.trim();
      mem.updated = today;
      ls('totry_coach_memory', mem);
    }
  }catch(_){ }
}
function persistCoachHistory(){ try{ ls('totry_coach_history', cH.slice(-20)); }catch(e){} }

// Restore visible coach messages on page load
function restoreCoachMessages(){
  const msgsEl = document.getElementById('coach-msgs');
  if(!msgsEl || !cH.length) return;
  // Clear welcome message — we have real history
  msgsEl.innerHTML = '';
  cH.slice(-20).forEach(m => {
    const cls = m.role === 'user' ? 'user' : 'coach';
    addMsg('coach-msgs', m.content, cls);
  });
}

async function sendCoach(){
  const el=document.getElementById('coach-in'),t=el.value.trim();if(!t)return;
  el.value='';el.style.height='40px';
  addMsg('coach-msgs',t,'user');
  
  // CRISIS GATE — runs before AI call. If risk detected, show resources instead.
  //
  // THE RAW TEXT MUST NOT ENTER THE HISTORY. It used to be pushed to cH on the line above, BEFORE this
  // gate, and the gate's `return` left it sitting there. So the gate stopped the immediate AI reply and
  // then the very next message shipped the disclosure anyway, inside cH, to Gemini / Groq / OpenRouter /
  // Anthropic. Worse, persistCoachHistory() writes totry_coach_history, which IS in SYNC_KEYS — so the
  // most sensitive sentence a person will ever type into this app was also uploaded to the database.
  //
  // The companion path already got this right and says why (see _compHistory) — "never let the disclosure
  // ride along in the history of the next message". addMsg() still runs first, so they see what they
  // typed; only the model's copy is redacted.
  const crisis = detectCrisis(t);
  if(crisis){
    showCrisisResponse('coach-msgs', crisis);
    cH.push({role:'user',content:'[the person disclosed something serious; crisis resources were shown instead of an AI reply]'});
    cH.push({role:'assistant',content:'[Crisis resources shown]'});
    persistCoachHistory();
    return;
  }
  cH.push({role:'user',content:t});
  
  const lid=addMsg('coach-msgs','...','coach');
  
  // Diagnostic: check state before calling
  if(!navigator.onLine){
    rmMsg(lid);
    addMsg('coach-msgs','You\'re offline right now. Your coach needs a connection to think — I\'ll be here when you\'re back online.','coach');
    return;
  }
  if(!sb){
    rmMsg(lid);
    addMsg('coach-msgs','Setting up... please try again in a few seconds.','coach');
    return;
  }
  // THE GUEST DOOR IS THE APP'S OWN FRONT DOOR, AND THIS WAS A WALL BEHIND IT.
  // A guard here refused every guest with "You're not signed in. Please refresh and log in." — advice
  // that cannot be followed, because refreshing keeps them a guest. It was the only !currentUser guard
  // in the app that blocked an AI reply: sendPT has none, the companion has none, and in the same
  // session as this refusal both of them answered the same guest with a real reply. So the app could
  // always reach the model for this person; only the coach pretended it could not.
  // Nothing past this point needs an account — api() has no user dependency and persistCoachHistory
  // writes to localStorage. Someone who came in through "Something's pulling at me right now" and was
  // told "He's read your whole story — ask him anything" now gets an answer.

  const r=await api(buildCtx(),cH.slice(0,-1),t,2600);
  rmMsg(lid);
  if(r){
    addMsg('coach-msgs',r,'coach');
    cH.push({role:'assistant',content:r});
    if(cH.length>20)cH=cH.slice(-20);
    persistCoachHistory();
    maybeUpdateCoachMemory();
  } else {
    const errMsg = (typeof getAIErrorMessage==='function' && getAIErrorMessage()) || 'The coach is unavailable for a moment.';
    addMsg('coach-msgs', errMsg + '\n\nWhile it\u2019s down, you can still get it out — tap to write it in your journal instead, and bring it to the coach later.', 'coach');
    const msgs = document.getElementById('coach-msgs');
    if(msgs){
      const btn = document.createElement('button');
      btn.className = 'btn'; btn.textContent = 'Write it in my journal';
      btn.style.cssText = 'margin:8px 0;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:13px';
      btn.onclick = () => { if(typeof go==='function') go('reflect');
        setTimeout(()=>{ try{ if(typeof setReflectTab==='function') setReflectTab('journal');
                              if(typeof openJournal==='function') openJournal();
                              document.getElementById('journal-text')?.focus(); }catch(_){} },300); };
      msgs.appendChild(btn);
    }
  }
}
// Runs BEFORE any AI call. Catches messages indicating self-harm, suicide,
// imminent harm to others, severe medical emergency, or acute mental health crisis.
// On detection: bypasses AI entirely and shows real-world resources.
// This is intentionally conservative — false positives are acceptable here.
function detectCrisis(text){
  if(!text || typeof text !== 'string') return null;
  // APOSTROPHE NORMALISATION — non-negotiable. iOS Smart Punctuation (on by default) rewrites ' to
  // U+2019 as the person types, so an ASCII-only phrase list fails OPEN on the platform most people
  // use: "i don’t want to live anymore" would not match and the gate would never fire. We normalise
  // every curly/typographic apostrophe to ASCII, and also match an apostrophe-STRIPPED pass so
  // "dont want to live" lands too. This makes the phrase lists below work as written on any keyboard.
  let t = text.toLowerCase().replace(/[‘’ʼʻ´`]/g, "'");
  // INNOCENT COMPLETIONS. A few phrases below are serious on their own and ordinary when finished a
  // particular way: "ending things WITH MY EX", "no reason to keep going TO THAT GYM", "can't go on
  // THIS CUT". Dropping those phrases would reopen real misses, so instead the benign span is removed
  // and the phrase list is run against what remains — which means a sentence that ALSO contains a
  // genuine disclosure still fires. Suppression by completion, not by deletion.
  // The spans are deliberately SHORT and stop at the object, never running on through a conjunction.
  // A greedy window swallowed the rest of the sentence, so "ending things with my ex and i want to die"
  // lost its disclosure along with the benign part — the suppression has to be narrower than the risk.
  // The object decides. "ending things with my ex" is a breakup; "ending things with MYSELF" is the thing
  // this gate exists for — and v444's span matched both, because "myself" is under fourteen characters.
  // The negative lookahead is the whole safety of this mechanism: suppress only when the object is
  // plainly another person or a place, never when it is the person, their life, or it all.
  [/ending things with (?!myself|my life|my own life|it all)(?:my |the |her |him |them )?[a-z']{1,14}/g,
   /keep going to (?!be |feel |live)(?:that |the |my )?[a-z']{1,14}/g,
   /go on (?:this|that|the) (?:cut|diet|program|plan|session|split|block)\b/g  /* \b is load-bearing: without it "plan" matched inside "go on this PLANET", so "i can't go on this planet anymore" was silently suppressed as gym talk. Same substring trap that made [Pp]late match TemPLATE in a ratchet earlier the same day. */,
   /killing (?:it|this|the) [a-z]{0,14}/g].forEach(function(re){ t = t.replace(re, ' '); });
  const tNo = t.replace(/'/g, '');
  const _hit = function(list){ for(const p of list){ if(t.includes(p) || tNo.includes(p.replace(/'/g,''))) return true; } return false; };

  // Direct self-harm / suicide indicators
  const SUICIDE_PHRASES = [
    'kill myself', 'killing myself', 'end my life', 'end it all', 'want to die',
    'wanna die', 'want to be dead', 'better off dead', 'better if i was dead',
    'no reason to live', 'no point living', "don't want to be here anymore",
    "don't want to live", 'plan to die', 'planning to die',
    // 'going to kill' (bare) was here and fired on "this workout is going to kill me" — the single
    // most natural sentence in a training app. Nothing is lost by removing it: the self-directed form
    // is caught by 'kill myself' above, and kill her/him/them by HARMOTHERS below. Same reasoning the
    // bare 'stroke' and bare 'jump off' entries were already narrowed for: a gate that cries wolf
    // trains people to dismiss it, and this one has to be believed the one time it matters.
    'suicide', 'suicidal', 'i\'m going to end', 'gonna end it',
    // ADDED v444, after testing the detector against real phrasings rather than invented ones: it
    // missed 5 of 12 genuine disclosures while producing 0 false positives in 10 training-context
    // sentences. So the list was too NARROW, not too broad — the opposite of what was reported. Each
    // phrase below is a full clause carrying intent, not a bare word, so the false-positive rate stays
    // at zero (re-tested both directions after adding them).
    'want to end it', 'wanna end it', 'ready to end it', 'about to end it',
    'ending things', 'end things tonight',
    "can't go on like this", "can't go on anymore", "can't go on any longer",
    // Existential forms the list missed entirely — these are not suppression failures, they were
    // simply never present. Found by probing with phrasings people actually use rather than the
    // ones already in the list, which is the only way this kind of gap ever surfaces.
    "go on this earth", "go on in this world", "go on this planet", "be on this earth",
    "don't want to be alive", "stop existing", "not wake up tomorrow", "never wake up again",
    "can't do this anymore", "can't keep going",
    'no reason to keep going', 'no point in going on', 'nothing to live for',
    'nothing left to live for', 'have a plan to die', 'have a plan to end',
    'hang myself', 'overdose on', 'shoot myself',
    // "jump off" alone false-fires constantly in a training app ("jump off the box"), and a gate that
    // cries wolf trains people to dismiss it. Keep every phrasing that carries real intent.
    'jump off a bridge', 'jump off the bridge', 'jump off a building', 'jump off the roof',
    'jump off the balcony', 'want to jump off', 'going to jump off', 'gonna jump off',
    'take my own life', 'taking my own life', "don't want to wake up",
    // Added after the pre-release audit flagged these as common first-disclosure phrasings.
    'want it to stop', 'make it stop', 'cant do this anymore', "can't do this anymore",
    'tired of living', 'sick of living', 'nothing left', 'give up on life',
    'not worth living', 'rather be dead', 'wish i was dead', 'wish i were dead',
    'end the pain', 'stop existing', 'disappear forever',
    'dont want to wake up', 'better off without me',
    'everyone would be better without me', 'no reason to be here',
    // "unalive" is now the most common euphemism, precisely because it evades keyword filters. Matched
    // on the STEM: "unaliving" contains no 'e' after the v, so the full word would have missed the
    // continuous form entirely. No English word contains "unaliv", so no qualifier is needed.
    'unaliv',
    // "kms" = "kill myself" in the shorthand a lot of people actually type. It is NOT safe bare: this
    // app logs running and cycling distances, so "i ran 5 kms today" must stay clear. Qualified by
    // intent instead.
    'wanna kms', 'want to kms', 'gonna kms', 'going to kms', 'about to kms', 'might kms',
    // 'not worth living' was already listed but misses the commonest phrasing, because stripping the
    // apostrophe turns "isn't" into "isnt", which does not contain "not".
    'isnt worth living', 'is not worth living', 'no longer want to live'
  ];
  
  // Self-harm
  const SELFHARM_PHRASES = [
    'cut myself', 'cutting myself', 'hurt myself', 'self-harm', 'self harm',
    'burn myself', 'starve myself'
  ];
  
  // Harm to others
  const HARMOTHERS_PHRASES = [
    'kill her', 'kill him', 'kill them', 'hurt her', 'hurt him', 'hurt them',
    'shoot up', 'going to hurt', 'plan to hurt'
  ];
  
  // Medical emergency. NOTE: bare 'stroke' fired on every swim/row/rep question in a training app
  // ("my stroke felt off"), so it's phrased to catch someone describing an actual event instead.
  const MEDICAL_PHRASES = [
    'chest pain', 'heart attack', 'can\'t breathe', 'cant breathe',
    'having a stroke', 'im having a stroke', 'signs of a stroke', 'think it\'s a stroke',
    'overdosed', 'took too many pills', 'bleeding badly', 'unconscious',
    'took a bunch of pills', 'took a bottle of pills', 'swallowed a bunch of pills', 'took all my pills'
  ];
  
  // REGEX PASS — for phrasings a flat substring list structurally CANNOT express, because each needs
  // either an inflection or a negative completion. Every one was MISSED by the shipped list, and found
  // by RUNNING the real function against phrasings people actually use, not by reading it:
  //   · "ending my life"   — the list had 'end my life', and "ending my life" does not contain it.
  //   · "taking my life"   — the list had 'take my OWN life' only. Bare "take my life" must never fire
  //                          on "take my life back", which is a RECOVERY phrase people write in here.
  //   · "off myself"       — absent entirely. Qualified by intent so "a day off myself" stays clear.
  //   · "can't go on"      — the list had ONLY the qualified forms (like this / anymore / any longer).
  //                          v444 was recorded in PRE-LAUNCH.md as closing "I can't go on" and did not:
  //                          all three apostrophe forms of the bare phrase returned null. Matched only
  //                          at a clause END, so "can't go on this trip" stays clear.
  //   · "don't want to be here" — the list required the trailing "anymore".
  // Re-tested BOTH directions after adding: 22 must-fire phrasings all fire, 16 training-context
  // sentences still return null. A gate that cries wolf gets dismissed the once it matters.
  const SUICIDE_RE = [
    /\bend(?:ing)? my (?:own )?life\b/,
    /\btak(?:e|ing) my (?:own )?life\b(?!\s*back)/,
    /\boffing myself\b/,
    /\b(?:want|wanna|going|gonna|about|ready|plan|planning|thinking about|might)\b[^.!?]{0,24}\boff myself\b/,
    // A NEWLINE IS A CLAUSE END. This was written as `\\s*(?:[.!?,]|$)` with no /m flag, so \\s* swallowed
    // the newline and then found neither punctuation nor end-of-input — and every field this gate
    // protects is a multi-line textarea. "I can't go on" fired; "I can't go on\\nI don't know what else
    // to say" did not. The person who keeps typing is the one still reaching for help.
    /\bcan'?t go on\s*(?:[.!?,\n\r]|$)/,
    /\bdon'?t want to be here\b/,
    /\bdon'?t belong here anymore\b/,
    /\bwon'?t be around (?:much longer|for long|tomorrow)\b/
  ];
  const _hitRe = function(list){ for(const re of list){ if(re.test(t) || re.test(tNo)) return true; } return false; };

  if(_hit(SUICIDE_PHRASES) || _hitRe(SUICIDE_RE))    return 'suicide';
  if(_hit(SELFHARM_PHRASES))   return 'selfharm';
  if(_hit(HARMOTHERS_PHRASES)) return 'harmothers';
  if(_hit(MEDICAL_PHRASES))    return 'medical';
  
  return null;
}

function showCrisisResponse(containerId, type){
  const container = document.getElementById(containerId);
  if(!container) return;
  
  let title, body, resources;
  
  if(type === 'suicide' || type === 'selfharm'){
    title = "I hear you — and this is more than I should hold alone.";
    body = "What you're carrying right now is real, and it's heavier than this app is built for. " +
           "Please don't do this alone. Speak to a real human who is trained for exactly this moment. " +
           "They've helped people through this before — they'll help you too.";
    resources = [
      {region: 'Australia', name: 'Lifeline', contact: '13 11 14', detail: '24/7 phone'},
      {region: 'Australia', name: 'Beyond Blue', contact: '1300 22 4636', detail: '24/7 phone'},
      {region: 'Australia', name: 'Suicide Call Back Service', contact: '1300 659 467', detail: '24/7 phone & online chat'},
      {region: 'Australia', name: '13YARN', contact: '13 92 76', detail: '24/7 · Aboriginal & Torres Strait Islander'},
      {region: 'USA / Canada', name: '988 Suicide & Crisis Lifeline', contact: '988', detail: 'Call or text'},
      {region: 'UK', name: 'Samaritans', contact: '116 123', detail: '24/7 phone'},
      {region: 'International', name: 'findahelpline.com', contact: 'findahelpline.com', detail: 'Helplines in 130+ countries'}
    ];
  } else if(type === 'harmothers'){
    title = "I can't help with this, and I need you to stop and breathe.";
    body = "If you're thinking about hurting someone, please step away from the situation right now and call a crisis line or someone you trust. " +
           "What you feel can be talked through with a real person before it becomes something you can't take back.";
    resources = [
      {region: 'Australia', name: 'Lifeline', contact: '13 11 14', detail: '24/7 phone'},
      {region: 'Emergency', name: 'Police / Ambulance', contact: '000 (AU) · 911 (US) · 999 (UK)', detail: 'If imminent'}
    ];
  } else if(type === 'medical'){
    title = "This sounds like it needs real medical help right now.";
    body = "I'm an app — I can't help with medical emergencies. Please call emergency services or get to a hospital immediately. " +
           "If you're unsure, call your country's health advice line.";
    resources = [
      {region: 'Australia', name: 'Emergency', contact: '000', detail: 'Ambulance'},
      {region: 'Australia', name: 'healthdirect', contact: '1800 022 222', detail: '24/7 nurse advice'},
      {region: 'USA', name: 'Emergency', contact: '911', detail: 'Ambulance'},
      {region: 'UK', name: 'Emergency', contact: '999', detail: 'Ambulance'},
      {region: 'UK', name: 'NHS 111', contact: '111', detail: '24/7 health advice'}
    ];
  }
  
  // ONE TAP, NOT TRANSCRIBE IT. These contacts were rendered as plain text, so the crisis response the
  // app shows when someone says the worst thing they will ever type into it asked them to memorise a
  // number and dial it by hand. The same numbers ARE tappable on the sign-in screen (tel: links, because
  // "crisis help must never sit behind a login") — the AI path was the one that lost it. A phone number
  // becomes a tel: link; the international directory becomes a real link.
  const _crisisContact = (c) => {
    const raw = String(c || '');
    const a = 'style="color:var(--go);text-decoration:none;border-bottom:1px solid var(--go-bd)"';
    if(/^[\d\s]+$/.test(raw) && /\d/.test(raw)){
      return '<a href="tel:' + raw.replace(/\s+/g,'') + '" ' + a + '>' + raw + '</a>';
    }
    if(/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(raw)){
      return '<a href="https://' + raw + '" target="_blank" rel="noopener" ' + a + '>' + raw + '</a>';
    }
    return raw;
  };
  const resHtml = resources.map(r =>
    '<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:10px 12px;margin-bottom:6px">' +
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:3px">' + r.region + '</div>' +
      '<div style="font-size:14px;font-weight:500;color:var(--tx);margin-bottom:2px">' + r.name + '</div>' +
      '<div style="font-size:13px;color:var(--tx2);font-family:DM Mono,monospace">' + _crisisContact(r.contact) + '</div>' +
      '<div style="font-size:11px;color:var(--tx3);margin-top:2px">' + r.detail + '</div>' +
    '</div>'
  ).join('');
  
  const msg = document.createElement('div');
  msg.className = 'msg coach';
  msg.style.background = 'linear-gradient(135deg, rgba(216,93,75,0.08), rgba(200,169,110,0.04))';
  msg.style.border = '1px solid var(--re-bd, rgba(216,93,75,0.3))';
  msg.style.borderLeft = '3px solid var(--re)';
  msg.innerHTML =
    '<h2 style="font-family:Cormorant Garamond,serif;font-size:17px;font-weight:400;font-style:italic;color:var(--tx);line-height:1.5;margin-bottom:10px">' + title + '</h2>' +
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:14px">' + body + '</div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">Real people, right now</div>' +
    resHtml +
    '<div style="font-size:11px;color:var(--tx3);margin-top:10px;line-height:1.5;font-style:italic">I will not give AI advice on this. You deserve a real person.</div>';
  // ANNOUNCED, NOT JUST DRAWN. This is the one surface in the app that must reach a person who cannot
  // see the screen: it was appended silently — no live region, no role, no heading, no focus move — so
  // for a VoiceOver user mid-crisis the helpline numbers simply were not there. They would have had to
  // guess that something had appeared and go hunting for it.
  //   · role="alert" + aria-live="assertive" makes the whole block read out the moment it lands.
  //   · a real <h2> gives it a landmark to jump to with rotor navigation.
  //   · tabindex="-1" + focus() puts the screen reader cursor INSIDE it, so the next swipe reaches the
  //     phone numbers rather than whatever preceded the block.
  // The focus move is deliberately last, after the node is in the document, or it is a no-op.
  msg.setAttribute('role', 'alert');
  msg.setAttribute('aria-live', 'assertive');
  msg.setAttribute('aria-atomic', 'true');
  msg.setAttribute('tabindex', '-1');
  msg.setAttribute('aria-label', 'Urgent: real people you can contact right now');
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
  try{ msg.focus({ preventScroll: true }); }catch(_){ try{ msg.focus(); }catch(__){} }

  // A CRISIS CARD IN THE DOM BUT NOT ON THE SCREEN IS NOT A CRISIS CARD.
  //
  // Scripture search called this with a container id that exists nowhere ('bible-search-results'), so
  // its fallback appended a bare div to document.body — and body is `position:fixed; inset:0;
  // overflow:hidden`, which put the card exactly one viewport down, CLIPPED, unreachable even by
  // scrollIntoView. Someone typed "i want to kill myself" into a Bible search and the app appeared to
  // do nothing at all. Every DOM-text test passed the whole time, because the text WAS in the document.
  //
  // Fixing only that one call site would leave the next one free to do the same thing, so the check
  // lives here, where every crisis path already passes through. If the card cannot be seen, it is
  // lifted into a fixed overlay that cannot be missed. This is the one surface in the app where
  // failing loudly is correct.
  try{ _crisisMustBeSeen(msg); }catch(_){}
}

// Only acts when the card is NOT visible: when it is, the container's own scrolling above is already
// right, and second-guessing it would move the screen under people it currently serves well.
function _crisisMustBeSeen(msg){
  if(!msg || typeof msg.getBoundingClientRect !== 'function') return;
  const vh = window.innerHeight || 800, vw = window.innerWidth || 400;
  const r = msg.getBoundingClientRect();
  const seen = r.width > 0 && r.height > 0 && r.top >= -4 && r.top < vh && r.bottom > 0 && r.left < vw && r.right > 0;
  if(seen) return;
  // Before lifting it into an overlay, try simply scrolling to it — the card may be perfectly placed
  // and merely out of view, and moving the DOM is the heavier answer.
  try{
    msg.scrollIntoView({ block: 'start' });
    const r2 = msg.getBoundingClientRect();
    if(r2.width > 0 && r2.height > 0 && r2.top >= -4 && r2.top < vh && r2.bottom > 0) return;
  }catch(_){}
  const ov = document.createElement('div');
  ov.className = 'crisis-rescue-ov';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Urgent: real people you can contact right now');
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg,#0e0e10);overflow-y:auto;' +
    '-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top) + 22px) 18px calc(env(safe-area-inset-bottom) + 26px)';
  const holder = document.createElement('div');
  holder.style.cssText = 'max-width:430px;margin:0 auto';
  holder.appendChild(msg);                       // move the real card, so there is only ever one of it
  const close = document.createElement('button');
  close.className = 'btn';
  close.type = 'button';
  close.textContent = 'Close';
  close.style.cssText = 'width:100%;margin-top:16px;min-height:48px';
  close.onclick = function(){ try{ ov.remove(); }catch(_){} };
  holder.appendChild(close);
  ov.appendChild(holder);
  document.body.appendChild(ov);
  try{ msg.focus({ preventScroll: true }); }catch(_){}
}

function goCoach(t){go('coach');document.getElementById('coach-in').value=t;sendCoach();}

// ── USAGE TRACKING ──────────────────────────────────────────
// Lightweight local-only AI call counter so Alfred can see how heavy this gets.
// Stores rolling 30-day window. No server-side logging — runs entirely in browser.
function trackAPIUsage(kind, tokens){
  try{
    const log = ls('totry_usage_log') || {};
    const day = new Date().toLocaleDateString('en-AU');
    if(!log[day]) log[day] = {ai: 0, tokens: 0, calls: []};
    log[day].ai = (log[day].ai || 0) + 1;
    log[day].tokens = (log[day].tokens || 0) + (tokens || 0);
    // Keep only last 31 days
    const keys = Object.keys(log).sort((a,b) => {
      const [da,ma,ya] = a.split('/').map(n => parseInt(n));
      const [db,mb,yb] = b.split('/').map(n => parseInt(n));
      return new Date(ya,ma-1,da) - new Date(yb,mb-1,db);
    });
    while(keys.length > 31){ delete log[keys.shift()]; }
    ls('totry_usage_log', log);
  }catch(e){ /* never let tracking break anything */ }
}

function renderUsageStats(){
  const container = document.getElementById('usage-stats-body');
  if(!container) return;
  const log = ls('totry_usage_log') || {};
  const days = Object.keys(log);
  
  if(!days.length){
    container.innerHTML = '<p class="empty-note">No usage yet — this fills in as you talk to Coach.</p>';
    return;
  }
  
  // Aggregate
  let totalCalls = 0, totalTokens = 0;
  let today = 0, last7 = 0;
  const todayKey = new Date().toLocaleDateString('en-AU');
  const wkAgo = Date.now() - 7 * 86400000;
  
  days.forEach(d => {
    const entry = log[d];
    totalCalls += (entry.ai || 0);
    totalTokens += (entry.tokens || 0);
    if(d === todayKey) today = entry.ai || 0;
    const [dd,mm,yy] = d.split('/').map(n => parseInt(n));
    if(new Date(yy,mm-1,dd).getTime() >= wkAgo) last7 += (entry.ai || 0);
  });
  
  // Worst-case cost ceiling assuming EVERY call hit the paid Anthropic fallback (Haiku 4.5
  // at $1/M input, $5/M output). Blended ~$3/M assuming a rough 50/50 in/out split.
  // In reality almost all calls are served free by Gemini/Groq, so true cost ≈ near-zero.
  const costEstimateUSD = (totalTokens / 1000000 * 3).toFixed(3);
  
  container.innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">' +
      '<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Today</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:18px;color:var(--go)">' + today + '</div>' +
        '<div style="font-size:10px;color:var(--tx3)">AI calls</div>' +
      '</div>' +
      '<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Last 7d</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:18px;color:var(--go)">' + last7 + '</div>' +
        '<div style="font-size:10px;color:var(--tx3)">AI calls</div>' +
      '</div>' +
      '<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Last 30d</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:18px;color:var(--go)">' + totalCalls + '</div>' +
        '<div style="font-size:10px;color:var(--tx3)">AI calls</div>' +
      '</div>' +
    '</div>' +
    '<div style="font-family:DM Mono,monospace;font-size:11px;color:var(--tx3);line-height:1.7;padding:10px;background:var(--bg3);border-radius:8px;margin-bottom:10px">' +
      '~' + (totalTokens/1000).toFixed(1) + 'k tokens · est. ceiling $' + costEstimateUSD + ' USD<br>' +
      '<span style="color:var(--tx3);font-size:10px">Real cost likely 50-80% lower (Gemini/Groq free tiers absorb most calls)</span>' +
    '</div>' +
    '<button class="btn" onclick="runAIDiagnostic()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx);font-size:12px;margin-bottom:8px">🩺 Test AI connection</button>' +
    '<div id="ai-diag-out" style="font-size:12px;padding:8px;border-radius:6px;background:var(--bg3);min-height:32px"></div>';
}

// Allow user to clear coach history
async function clearCoachHistory(){
  if(!(await askConfirm('Clear your conversation history with the Coach? This cannot be undone.'))) return;
  cH = [];
  persistCoachHistory();
  const msgsEl = document.getElementById('coach-msgs');
  if(msgsEl){
    msgsEl.innerHTML = '<div class="msg coach">Hey ' + (userName || 'friend') + '. New conversation. What\'s on your mind?</div>';
  }
  showToast('History cleared', 'Starting fresh.');
}

// ── PT COACH ─────────────────────────────────────────────────
let ptH = ls('totry_pt_history') || [];
function persistPTHistory(){ try{ ls('totry_pt_history', ptH.slice(-20)); }catch(e){} }

function restorePTMessages(){
  const msgsEl = document.getElementById('pt-msgs');
  if(!msgsEl || !ptH.length) return;
  msgsEl.innerHTML = '';
  ptH.slice(-20).forEach(m => {
    const cls = m.role === 'user' ? 'user' : 'coach';
    addMsg('pt-msgs', m.content, cls);
  });
}

async function sendPT(){
  const el=document.getElementById('pt-in'),t=el.value.trim();if(!t)return;
  el.value='';el.style.height='40px';
  addMsg('pt-msgs',t,'user');
  
  // Crisis gate also applies to PT Coach. Same redaction as sendCoach: the raw disclosure never enters
  // ptH, because the next message would carry it to the model and persistPTHistory() would sync it.
  const crisis = detectCrisis(t);
  if(crisis){
    showCrisisResponse('pt-msgs', crisis);
    ptH.push({role:'user',content:'[the person disclosed something serious; crisis resources were shown instead of an AI reply]'});
    ptH.push({role:'assistant',content:'[Crisis resources shown]'});
    persistPTHistory();
    return;
  }
  ptH.push({role:'user',content:t});
  
  const lid=addMsg('pt-msgs','...','coach');
  let r=null;
  try{
    r=await api(buildPTCtx(),ptH.slice(0,-1),t,2200);
  }catch(e){
    r=null;
  }
  rmMsg(lid);   // always clear the "..." bubble, even if the call threw
  if(r){addMsg('pt-msgs',r,'coach');ptH.push({role:'assistant',content:r});if(ptH.length>20)ptH=ptH.slice(-20);persistPTHistory();}
  else {
    const errMsg = (typeof getAIErrorMessage==='function' && getAIErrorMessage()) || 'I couldn\u2019t reach the coach just now \u2014 check your connection and try again. What you wrote is safe.';
    addMsg('pt-msgs', errMsg, 'coach');
  }
}
function goPTCoach(t){setPTTab('ptcoach');document.getElementById('pt-in').value=t;sendPT();}

// ── DAY COUNT ─────────────────────────────────────────────────
// If the journey-start key is missing (e.g. fresh install restored from an older cloud row),
// derive it from the oldest real evidence instead of silently becoming "Day 1".
function repairJourneyStart(){
  try{
    const existing = ls('totry_journey_start') || ls('totry_start');
    ensureFirstStart(existing); // lock in the lifetime anchor (survives restarts/new chapters)
    if(existing) return;
    let oldest = null;
    const take = ts => { if(!ts) return; const t = new Date(ts).getTime(); if(t && (!oldest || t < oldest)) oldest = t; };
    (ls('totry_workouts')||[]).forEach(w=>take(w.ts));
    (ls('totry_body')||[]).forEach(b=>take(b.ts));
    ritualLog('totry_mornings').forEach(m=>take(m.ts));
    ritualLog('totry_evenings').forEach(e=>take(e.ts));
    (ls('totry_journal')||[]).forEach(j=>take(j.ts));
    (ls('totry_v')||[]).forEach(v=>{ take(v.start); take(v.startDate); (v.losses||[]).forEach(l=>take(l.date||l)); });
    if(oldest){
      ls('totry_journey_start', new Date(oldest).toISOString());
      if(!ls('totry_start')) ls('totry_start', new Date(oldest).toISOString());
    }
  }catch(_){}
}
function getDayCount(){
  // "Days in" = days since the journey began. Default for everyone is account start
  // (totry_start). A user CAN override the journey-start date in Settings → Profile
  // (e.g. anchor it to the day they actually quit, which for many people predates the
  // day they found the app). This only changes the displayed day count — it never
  // fabricates streaks or hides losses, which are tracked separately per-vice.
  const override = ls('totry_journey_start');
  let anchorStr = override || ls('totry_start');
  if(!anchorStr) return 1;
  const anchor = new Date(anchorStr);
  if(isNaN(anchor)) return 1;
  // A bare number parses as a valid Date — new Date(12345) is 1 Jan 1970 — so the isNaN check above
  // lets corruption through. Reject the TYPE rather than the calendar value: a v515 fix floored this
  // at 2024 and thereby refused every legitimate old anchor, and editJourneyStart exists so someone
  // clean since 2019 can say so (its input has a max and deliberately no min).
  if(typeof anchorStr === 'number') return 1;
  const _FLOOR = new Date('1980-01-01T00:00:00Z').getTime();   // absurd, not merely old
  if(anchor.getTime() < _FLOOR || anchor.getTime() > Date.now() + 86400000) return 1;
  // MIDNIGHT TO MIDNIGHT, not "how many 24-hour blocks have elapsed". `totry_start` is a full
  // timestamp: sign up at 9pm and at 9am the next calendar day only 12 hours have passed, so the
  // floor gave 0 and the counter said "Day 1" for a second time. Everything gated on a day number
  // — the unlocks, the checklist, the day-N cards — then landed a calendar day late, forever.
  // Whole days between two local midnights is what "days in" means to a person.
  const a = new Date(anchor); a.setHours(0,0,0,0);
  const t = new Date();      t.setHours(0,0,0,0);
  return Math.max(1, Math.round((t - a) / 86400000) + 1);
}

// DAYS SINCE INSTALL — deliberately NOT getDayCount(). getDayCount() honours the Settings
// journey-start override, so someone who anchors day 1 to the day they actually quit reads "Day 401"
// on the morning they install. Any copy that speaks about a yesterday, a streak, a previous session or
// a history must ask THIS instead, or it will tell a brand-new person what they did on a day they were
// never here — which is how the morning card opened with "You skipped your habits yesterday."
function daysInstalled(){
  try{
    const st = ls('totry_start');
    if(!st) return 1;
    const t = new Date(st).getTime();
    if(isNaN(t)) return 1;
    return Math.max(1, Math.floor((Date.now() - t) / 86400000) + 1);
  }catch(_){ return 1; }
}

// Same as getDayCount but for a specific (often past) date — used when backdating an entry, so a
// re-added journal shows the correct "Day N" for when it actually happened.
function getDayCountForDate(d){
  try{
    const anchorStr = ls('totry_journey_start') || ls('totry_start');
    if(!anchorStr) return 1;
    const anchor = new Date(anchorStr);
    if(isNaN(anchor)) return 1;
    const t = (d instanceof Date) ? d.getTime() : new Date(d).getTime();
    if(isNaN(t)) return getDayCount();
    return Math.max(1, Math.floor((t - anchor) / 86400000) + 1);
  }catch(_){ return getDayCount(); }
}

// ── THE LIFETIME JOURNEY ────────────────────────────────────────────────────────
// Grace over shame, made real: you can start a NEW CHAPTER (reset the visible day-count to Day 1)
// without erasing that you've been trying all along. `totry_first_start` is the true beginning —
// set once, only ever moved earlier, NEVER wiped by a restart. So the app can always say, honestly:
// "Day 1 of this chapter — and 400 days trying in all. You fell, you're here, you're going again."
function ensureFirstStart(candidate){
  try{
    const cand = candidate ? new Date(candidate).getTime() : null;
    const fs = ls('totry_first_start');
    if(!fs){ if(cand && !isNaN(cand)) ls('totry_first_start', new Date(cand).toISOString()); return; }
    const cur = new Date(fs).getTime();
    if(cand && !isNaN(cand) && cand < cur) ls('totry_first_start', new Date(cand).toISOString()); // only ever earlier
  }catch(_){}
}
function totalDaysTrying(){
  try{
    const anchor = ls('totry_first_start') || ls('totry_journey_start') || ls('totry_start');
    if(!anchor) return getDayCount();
    const a = new Date(anchor); if(isNaN(a)) return getDayCount();
    return Math.max(1, Math.floor((Date.now() - a) / 86400000) + 1);
  }catch(_){ return getDayCount(); }
}
function restartCount(){ try{ return parseInt(ls('totry_restarts')||'0',10) || 0; }catch(_){ return 0; } }
// Start a new chapter: reset the visible day-count to today, keep the lifetime total + count the restart.
function restartJourney(){
  try{
    const cur = ls('totry_journey_start') || ls('totry_start');
    ensureFirstStart(cur);                       // lock the true beginning before moving the chapter
    ls('totry_journey_start', new Date().toISOString());
    ls('totry_restarts', restartCount() + 1);
    try{ if(typeof syncToCloud==='function'){ syncToCloud('totry_journey_start', ls('totry_journey_start')); syncToCloud('totry_first_start', ls('totry_first_start')); syncToCloud('totry_restarts', ls('totry_restarts')); } }catch(_){}
    document.querySelector('.modal-bg.open')?.remove();
    if(typeof renderDayCounter==='function') renderDayCounter();
    if(typeof initSettingsTab==='function') initSettingsTab();
    if(typeof go==='function') go('home');
    const total = totalDaysTrying();
    if(typeof showToast==='function') showToast('New chapter — Day 1', total>1 ? (total+' days trying in all. You fell, you’re here, you’re going again.') : 'A clean start. Showing up is the win.');
    if(typeof haptic==='function') haptic('success');
  }catch(_){}
}

// Let the user set the true date their journey began (e.g. the day they quit),
// which may predate when they installed the app. Honest anchor, not a fake streak.
function editJourneyStart(){
  const current = ls('totry_journey_start') || ls('totry_start') || new Date().toISOString();
  const currentDate = new Date(current).toISOString().slice(0,10);
  const today = new Date().toISOString().slice(0,10);
  
  const total = totalDaysTrying();
  const rc = restartCount();
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:10px">Your journey</h3>' +
    ((total>1) ? '<div class="card" style="text-align:center;padding:18px;margin-bottom:16px;background:linear-gradient(135deg,rgba(200,169,110,0.08),rgba(140,107,182,0.04));border-color:var(--go-bd)">' +
        '<div style="font-family:DM Mono,monospace;font-size:36px;color:var(--go);line-height:1">'+total+'</div>' +
        '<div style="font-size:12px;color:var(--tx2);letter-spacing:0.05em;margin-top:2px">days trying, in all</div>' +
        (rc>0 ? '<div style="font-size:12px;color:var(--tx3);margin-top:8px">'+rc+' fresh start'+(rc===1?'':'s')+' · still here</div>' : '') +
      '</div>' : '') +
    '<div class="lbl">When did it begin?</div>' +
    '<p style="font-size:12px;color:var(--tx3);margin:6px 0 12px;line-height:1.6">If you started before you found this app — the day you actually decided to change — set that here. Your "days in" counter reflects the real start.</p>' +
    '<input type="date" id="journey-start-in" value="'+currentDate+'" max="'+today+'" style="width:100%;padding:12px;font-size:16px;margin-bottom:14px">' +
    '<div style="display:flex;gap:8px">' +
      '<button class="btn primary" style="flex:1" onclick="saveJourneyStart()">Save date</button>' +
      '<button class="btn" style="flex:1" onclick="closeModal(this)">Cancel</button>' +
    '</div>' +
    '<div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--bd)">' +
      '<div class="lbl">Start a new chapter</div>' +
      '<p style="font-size:12px;color:var(--tx3);margin:6px 0 12px;line-height:1.6">Fell hard, or want a clean slate to begin again? Reset your day-count to <b style="color:var(--tx2)">Day 1</b> — and keep every day you’ve already put in. The falling isn’t erased; it’s the proof you kept going.</p>' +
      '<button class="btn" style="width:100%;background:var(--bg3);border:1px solid var(--go-bd);color:var(--go)" onclick="askConfirm(\'Start a new chapter at Day 1?\', \'Your total days trying is kept and shown.\', {confirmLabel:\'Start a new chapter\', danger:false}).then(function(ok){ if(ok) restartJourney(); })">Begin again — Day 1</button>' +
    '</div>' +
    (ls('totry_journey_start') ? '<button class="btn" style="width:100%;margin-top:10px;background:transparent;border:none;color:var(--tx3);font-size:12px" onclick="resetJourneyStart()">Reset to account creation date</button>' : '') +
  '</div>';
  document.body.appendChild(m);
}

function saveJourneyStart(){
  const val = document.getElementById('journey-start-in')?.value;
  if(!val){ showToast('Pick a date','Choose when your journey began.'); return; }
  const picked = new Date(val + 'T12:00:00');
  if(isNaN(picked) || picked > new Date()){ showToast('Invalid date','That date is in the future.'); return; }
  ls('totry_journey_start', picked.toISOString());
  document.querySelector('.modal-bg.open')?.remove();
  if(typeof initSettingsTab==='function') initSettingsTab();
  if(typeof renderDayCounter==='function') renderDayCounter();
  showToast('Saved', 'Day ' + getDayCount() + ' of your journey.');
  haptic('success');
}

function resetJourneyStart(){
  localStorage.removeItem('totry_journey_start');
  if(typeof syncToCloud==='function') syncToCloud('totry_journey_start', null);
  document.querySelector('.modal-bg.open')?.remove();
  if(typeof initSettingsTab==='function') initSettingsTab();
  if(typeof renderDayCounter==='function') renderDayCounter();
  showToast('Reset', 'Back to account creation date.');
}

// ── ONBOARDING ────────────────────────────────────────────────
// `hasPartner` starts false and is only ever set by tapping the partner question — which the quick
// routes ("Take me in →", any "I'll do this later", the guest door) never show at all. Writing it
// unconditionally recorded a decisive "no" for people who were never asked, and that mattered because
// a null there is what lets the evening screen turn the reach-out ON once they add someone to their
// few (23-evening.js:854 self-heals only when the pref is null/undefined). A false blocks that
// forever. So: only record an answer that was actually given.
let obVices=[],hasPartner=false,partnerAnswered=false;
function toggleChip(el,name){
  el.classList.toggle('on');
  try{ el.setAttribute('aria-checked', el.classList.contains('on') ? 'true' : 'false'); }catch(_){ }
  if(el.classList.contains('on'))obVices.push(name);
  else obVices=obVices.filter(v=>v!==name);
}
function setHasPartner(val){
  hasPartner=val; partnerAnswered=true;
  document.getElementById('pyes').className='btn'+(val?' primary':'');
  document.getElementById('pno').className='btn'+(!val?' primary':'');
}

function fillIdentity(text){
  const el=document.getElementById('ob-identity');
  if(el){
    el.value=text;
    el.focus();
    el.style.borderColor='var(--go)';
    haptic('tap');
  }
}


// A role="checkbox" that only responds to a mouse is a lie. One delegated listener gives every
// chip in the app Enter/Space activation without touching 24 inline handlers.
document.addEventListener('keydown', function(e){
  if(e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
  const el = e.target;
  if(!el || !el.classList || !el.classList.contains('vchip')) return;
  e.preventDefault();
  if(typeof el.click === 'function') el.click();
});

// ─── ONBOARDING: APPS STEP ────────────────────────────────────
let _selectedApps = [];
let _hevyTier = null;

function toggleAppChip(el, appId){
  el.classList.toggle('app-on');
  try{ el.setAttribute('aria-checked', el.classList.contains('app-on') ? 'true' : 'false'); }catch(_){ }
  if(el.classList.contains('app-on')){
    if(!_selectedApps.includes(appId)) _selectedApps.push(appId);
  } else {
    _selectedApps = _selectedApps.filter(a => a !== appId);
  }
  // Reveal Hevy free/pro follow-up when Hevy is toggled
  if(appId === 'hevy'){
    const fu = document.getElementById('ob-hevy-followup');
    if(fu) fu.style.display = _selectedApps.includes('hevy') ? 'block' : 'none';
  }
  // Reveal nutrition CSV note when a food app is toggled
  if(appId === 'myfitnesspal' || appId === 'cronometer'){
    const ff = document.getElementById('ob-food-followup');
    const anyFood = _selectedApps.includes('myfitnesspal') || _selectedApps.includes('cronometer');
    if(ff) ff.style.display = anyFood ? 'block' : 'none';
  }
  haptic('light');
}

function selectHevyTier(tier){
  _hevyTier = tier;
  const freeBtn = document.getElementById('ob-hevy-free');
  const proBtn = document.getElementById('ob-hevy-pro');
  const freeMsg = document.getElementById('ob-hevy-free-msg');
  const proMsg = document.getElementById('ob-hevy-pro-msg');
  if(freeBtn) freeBtn.style.background = tier === 'free' ? 'var(--go)' : 'var(--bg2)';
  if(freeBtn) freeBtn.style.color = tier === 'free' ? '#000' : 'var(--tx2)';
  if(proBtn) proBtn.style.background = tier === 'pro' ? 'var(--go)' : 'var(--bg2)';
  if(proBtn) proBtn.style.color = tier === 'pro' ? '#000' : 'var(--tx2)';
  if(freeMsg) freeMsg.style.display = tier === 'free' ? 'block' : 'none';
  if(proMsg) proMsg.style.display = tier === 'pro' ? 'block' : 'none';
  haptic('tap');
}

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
  try{ if(typeof logEvent==='function') logEvent('first_moment'); }catch(_){}
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
function obNextToApps(){
  // Save name first
  const n = document.getElementById('ob-name')?.value.trim();
  if(!n){
    document.getElementById('ob-name').style.borderColor = 'var(--re)';
    return;
  }
  userName = n;
  ls('totry_name', n);
  
  // Hide step 2, show apps step
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  document.getElementById('ob-apps').classList.add('active');
  window.scrollTo(0, 0);
}

function finishAppsStep(){
  ls('totry_apps_used', _selectedApps);
  // Persist Hevy tier choice if they made one
  if(_selectedApps.includes('hevy') && _hevyTier){
    ls('totry_hevy_tier', _hevyTier);
    // If they pasted a Pro API key, save it and kick off the first sync
    if(_hevyTier === 'pro'){
      const key = document.getElementById('ob-hevy-key')?.value.trim();
      if(key){
        ls('totry_hevy_api_key', key);
        if(typeof syncHevyWorkouts === 'function') setTimeout(syncHevyWorkouts, 500);
      }
    }
  }
  // Continue to the fork (jump in now, or set foundation)
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  document.getElementById('ob-fork').classList.add('active');
  // Update progress dots
  document.querySelectorAll('.ob-dot').forEach((d, i) => d.classList.toggle('on', i < 3));
  window.scrollTo(0, 0);
}

// Fork: jump straight into the app. The firstrun-card on Home drips identity/vices/habits/coach.
async function obQuickFinish(){
  // Persist what they already told us before leaving. This button sits beside "Continue" on the vices
  // step and used to drop every tick on the floor — see obPersistVices().
  try{ if(typeof obPersistVices === 'function') obPersistVices(); }catch(_){ }
  if(typeof finishOnboard === 'function') await finishOnboard();
}
// Fork: go set the deeper foundation now (identity → why → season → vices → ready).
function obStartFoundation(){
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  document.getElementById('ob3').classList.add('active');
  window.scrollTo(0, 0);
}

function skipAppsStep(){
  ls('totry_apps_used', []);
  finishAppsStep();
}


// ─── ONBOARDING: WHY STEP ─────────────────────────────────────
function fillWhy(text){
  const el=document.getElementById('ob-why-text');
  if(el){el.value=text;el.focus();el.style.borderColor='var(--go)';haptic('tap');}
}

function obNextToWhy(){
  // Save identity first
  const identity=document.getElementById('ob-identity')?.value.trim();
  if(identity) ls('totry_identity', identity);
  document.querySelectorAll('.ob-step').forEach(s=>s.classList.remove('active'));
  document.getElementById('ob-why').classList.add('active');
  window.scrollTo(0,0);
}

function finishWhyStep(){
  const why=document.getElementById('ob-why-text')?.value.trim();
  if(why) ls('totry_why', why);
  // Continue to the faith / path step (then season)
  document.querySelectorAll('.ob-step').forEach(s=>s.classList.remove('active'));
  const faithStep=document.getElementById('ob-faith');
  if(faithStep) faithStep.classList.add('active');
  window.scrollTo(0,0);
}
function obPickFaith(tr){
  try{ if(typeof FAITHS!=='undefined' && FAITHS[tr]) ls('totry_faith_tradition', tr); }catch(_){}
  document.querySelectorAll('.ob-step').forEach(s=>s.classList.remove('active'));
  const next=document.getElementById('ob4');
  if(next) next.classList.add('active');
  window.scrollTo(0,0);
}

function obNext(step){
  // Step 2 -> 3: save name
  if(step===3){
    const n=document.getElementById('ob-name').value.trim();
    if(!n){document.getElementById('ob-name').style.borderColor='var(--re)';return;}
    userName=n;ls('totry_name',n);
  }
  // Step 3 -> 4: save identity
  if(step===4){
    const idEl=document.getElementById('ob-identity');
    if(idEl){
      const v=idEl.value.trim();
      if(v){
        const lower=v.toLowerCase();
        let full;
        if(lower.startsWith('i am becoming')){full=v;}
        else{full='I am becoming a person who '+v.replace(/^who /i,'');}
        ls('totry_identity',full);
      }
    }
  }
  // Step 4 -> 5: save season
  if(step===5){
    const sel=document.querySelector('.season-chip.on');
    const season=sel?sel.dataset.season:'Building';
    ls('totry_season',season);
  }
  // Step 5 -> 6: save vices + partner
  if(step===6){
    obPersistVices();
    document.getElementById('ob-ready-title').textContent='You\'re ready, '+userName+'.';
    document.getElementById('ob-ready-desc').textContent='Your space is set. Every day you open this is a day you chose to try.';
  }
  document.querySelectorAll('.ob-step').forEach(s=>s.classList.remove('active'));
  // Accept either a numeric step (→ 'ob'+N) or a full element id like 'ob-what'
  const targetId = (typeof step === 'string' && step.startsWith('ob')) ? step : ('ob'+step);
  document.getElementById(targetId).classList.add('active');
  if(typeof step === 'number'){
    document.querySelectorAll('.ob-dot').forEach((d,i)=>d.classList.toggle('on',i<step-1));
  }
  window.scrollTo(0,0);
}

// The one place the "what are you fighting?" step reaches storage. It used to live INSIDE obNext(6),
// which is only reached by "Continue" — so "I'll do this later", sitting right beside it on the same
// step, called finishOnboard() directly and silently threw away every vice the person had just ticked,
// their custom entry, and the partner flag. Someone who named porn and scrolling and then chose the
// quieter-looking button began with an empty Fight tab and no idea why.
function obPersistVices(){
  try{
    const customEl = document.getElementById('ob-custom');
    const custom = customEl ? customEl.value.trim() : '';
    if(custom && obVices.indexOf(custom) < 0) obVices.push(custom);
    if(obVices.length){
      const ex=ls('totry_v')||[];
      // Match the shape addVice() produces. Without startDate, viceCleanDays() returns 0 forever, so
      // someone who named their vices during onboarding saw "0 days clean" every day no matter how long
      // they held on — and the live clock and Recovery Timeline never appeared at all. Doing MORE setup
      // left you worse off than the quick route, which creates vices through addVice().
      obVices.forEach(n=>{if(!ex.find(v=>v.n===n))ex.push({n,type:(typeof classifyVice==='function'?classifyVice(n):''),mode:'quit',t:'Various situations',w:0,total:0,lastWin:null,lastLoss:null,urgelog:[],startDate:new Date().toISOString(),cleanDaysTotal:0,relapseCount:0,relapseHistory:[]});});
      ls('totry_v',ex);
    }
    if(partnerAnswered) ls('totry_partner',hasPartner);   // silence is not a no
  }catch(_){ }
}

function selectObSeason(chip){
  document.querySelectorAll('.ob-step.active .season-chip').forEach(c=>c.classList.remove('on'));
  chip.classList.add('on');
}
async function finishOnboard(opts){
  ls('totry_onboarded',true);
  // NEVER re-stamp the journey anchor. This ran on every pass through onboarding, so any second visit
  // silently reset the person's day count to 1 and wiped the one number the whole app leans on.
  if(!ls('totry_start')) ls('totry_start', new Date().toISOString());
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

// ── HEADER VERSES (per-tradition banks below; activeVerses() returns the current one) ──
const VS_CHRISTIANITY=[
  {t:"I can do all things through him who strengthens me.",r:"Philippians 4:13 (ESV)"},
  {t:"Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.",r:"Joshua 1:9 (ESV)"},
  {t:"No temptation has overtaken you that is not common to man. God is faithful, and he will not let you be tempted beyond your ability.",r:"1 Corinthians 10:13 (ESV)"},
  {t:"Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come.",r:"2 Corinthians 5:17 (ESV)"},
  {t:"For God gave us a spirit not of fear but of power and love and self-control.",r:"2 Timothy 1:7 (ESV)"},
  {t:"Do not be conformed to this world, but be transformed by the renewal of your mind.",r:"Romans 12:2 (ESV)"},
  {t:"But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.",r:"Isaiah 40:31 (ESV)"},
  {t:"Create in me a clean heart, O God, and renew a right spirit within me.",r:"Psalm 51:10 (ESV)"},
  {t:"So flee youthful passions and pursue righteousness, faith, love, and peace.",r:"2 Timothy 2:22 (ESV)"},
  {t:"Commit your work to the Lord, and your plans will be established.",r:"Proverbs 16:3 (ESV)"},
  {t:"For the moment all discipline seems painful rather than pleasant, but later it yields the peaceful fruit of righteousness.",r:"Hebrews 12:11 (ESV)"},
  {t:"The Lord is my strength and my shield; in him my heart trusts, and I am helped.",r:"Psalm 28:7 (ESV)"},
  {t:"I have fought the good fight, I have finished the race, I have kept the faith.",r:"2 Timothy 4:7 (ESV)"},
  {t:"Trust in the Lord with all your heart, and do not lean on your own understanding.",r:"Proverbs 3:5 (ESV)"},
  {t:"He gives power to the faint, and to him who has no might he increases strength.",r:"Isaiah 40:29 (ESV)"},
  {t:"Whoever rules his spirit is better than one who takes a city.",r:"Proverbs 16:32 (ESV)"},
  {t:"Flee from sexual immorality. The sexually immoral person sins against his own body.",r:"1 Corinthians 6:18 (ESV)"},
  {t:"If we confess our sins, he is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.",r:"1 John 1:9 (ESV)"},
  {t:"For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.",r:"Jeremiah 29:11 (ESV)"},
  {t:"Be sober-minded; be watchful. Your adversary the devil prowls around like a roaring lion, seeking someone to devour.",r:"1 Peter 5:8 (ESV)"},
  {t:"The Lord is near to the brokenhearted and saves the crushed in spirit.",r:"Psalm 34:18 (ESV)"},
  {t:"Let us not grow weary of doing good, for in due season we will reap, if we do not give up.",r:"Galatians 6:9 (ESV)"},
  {t:"And we know that for those who love God all things work together for good.",r:"Romans 8:28 (ESV)"},
  {t:"Draw near to God, and he will draw near to you.",r:"James 4:8 (ESV)"},
  {t:"You keep him in perfect peace whose mind is stayed on you, because he trusts in you.",r:"Isaiah 26:3 (ESV)"},
  {t:"Cast all your anxieties on him, because he cares for you.",r:"1 Peter 5:7 (ESV)"},
  {t:"The Lord is near to all who call on him, to all who call on him in truth.",r:"Psalm 145:18 (ESV)"},
  {t:"Come to me, all who labor and are heavy laden, and I will give you rest.",r:"Matthew 11:28 (ESV)"},
  {t:"The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning.",r:"Lamentations 3:22-23 (ESV)"},
  {t:"Be still, and know that I am God.",r:"Psalm 46:10 (ESV)"},
  {t:"The Lord your God is in your midst, a mighty one who will save; he will rejoice over you with gladness.",r:"Zephaniah 3:17 (ESV)"},
  {t:"There is therefore now no condemnation for those who are in Christ Jesus.",r:"Romans 8:1 (ESV)"},
  {t:"Cast your burden on the Lord, and he will sustain you; he will never permit the righteous to be moved.",r:"Psalm 55:22 (ESV)"},
  {t:"My grace is sufficient for you, for my power is made perfect in weakness.",r:"2 Corinthians 12:9 (ESV)"},
  {t:"But the one who endures to the end will be saved.",r:"Matthew 24:13 (ESV)"},
  {t:"Give thanks in all circumstances; for this is the will of God in Christ Jesus for you.",r:"1 Thessalonians 5:18 (ESV)"},
  {t:"Wait for the Lord; be strong, and let your heart take courage; wait for the Lord!",r:"Psalm 27:14 (ESV)"},
  {t:"He heals the brokenhearted and binds up their wounds.",r:"Psalm 147:3 (ESV)"},
  {t:"I have said these things to you, that in me you may have peace. In the world you will have tribulation. But take heart; I have overcome the world.",r:"John 16:33 (ESV)"},
  {t:"Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you.",r:"Isaiah 41:10 (ESV)"},
  {t:"But seek first the kingdom of God and his righteousness, and all these things will be added to you.",r:"Matthew 6:33 (ESV)"},
  {t:"For nothing will be impossible with God.",r:"Luke 1:37 (ESV)"},
  {t:"The name of the Lord is a strong tower; the righteous man runs into it and is safe.",r:"Proverbs 18:10 (ESV)"},
  {t:"Weeping may tarry for the night, but joy comes with the morning.",r:"Psalm 30:5 (ESV)"},
];
// ── MULTI-FAITH VERSE BANKS ───────────────────────────────────────────────────
// The person is served in THEIR tradition. Each bank is a small, carefully-attributed
// set on the app's themes (strength, patience, self-mastery, fresh starts, stillness,
// hope). verseThemes() reads the TEXT for contextual selection, so it works for every
// bank with no per-tradition tagging. Secular is real Stoic/philosophical wisdom —
// grounded in reality, standing on its own, not "faith removed."
const VS_ISLAM=[
  {t:"Indeed, with hardship [will be] ease.",r:"Qur’an 94:6"},
  {t:"Allah does not charge a soul except [with that within] its capacity.",r:"Qur’an 2:286"},
  {t:"And whoever fears Allah — He will make for him a way out.",r:"Qur’an 65:2"},
  {t:"Verily, in the remembrance of Allah do hearts find rest.",r:"Qur’an 13:28"},
  {t:"O you who have believed, seek help through patience and prayer.",r:"Qur’an 2:153"},
  {t:"Do not despair of the mercy of Allah; indeed, Allah forgives all sins.",r:"Qur’an 39:53"},
  {t:"And He found you lost and guided you.",r:"Qur’an 93:7"},
  {t:"So remember Me; I will remember you.",r:"Qur’an 2:152"},
  {t:"And that there is not for man except that for which he strives.",r:"Qur’an 53:39"},
  {t:"And rely upon Allah; and sufficient is Allah as Disposer of affairs.",r:"Qur’an 33:3"},
  {t:"So do not weaken and do not grieve.",r:"Qur’an 3:139"},
  {t:"Indeed, prayer prohibits immorality and wrongdoing.",r:"Qur’an 29:45"},
  {t:"And when I am ill, it is He who cures me.",r:"Qur’an 26:80"},
  {t:"My success is not but through Allah.",r:"Qur’an 11:88"},
  {t:"Indeed, Allah is with the patient.",r:"Qur’an 2:153"},
];
const VS_HINDU=[
  {t:"You have a right to your actions, but never to the fruits of your actions.",r:"Bhagavad Gita 2.47"},
  {t:"Yoga is skill in action.",r:"Bhagavad Gita 2.50"},
  {t:"Let a man lift himself by his own self; let him not degrade himself.",r:"Bhagavad Gita 6.5"},
  {t:"For one who has conquered the self, the self is a friend.",r:"Bhagavad Gita 6.6"},
  {t:"The restless mind is subdued by practice and by detachment.",r:"Bhagavad Gita 6.35"},
  {t:"He who is even-minded in pleasure and pain, and steadfast, is fit for the deathless.",r:"Bhagavad Gita 2.15"},
  {t:"Better is one’s own duty, though imperfect, than the duty of another well performed.",r:"Bhagavad Gita 3.35"},
  {t:"Cold and heat, pleasure and pain, come and go; they are impermanent. Bear them patiently.",r:"Bhagavad Gita 2.14"},
  {t:"As a lamp in a windless place does not flicker — so is the disciplined mind.",r:"Bhagavad Gita 6.19"},
  {t:"Perform your duty, for action is indeed better than inaction.",r:"Bhagavad Gita 3.8"},
  {t:"The wise grieve neither for the living nor for the dead.",r:"Bhagavad Gita 2.11"},
  {t:"Whatever you do, offer it as a gift.",r:"Bhagavad Gita 9.27"},
  {t:"One who sees inaction in action, and action in inaction, is truly wise.",r:"Bhagavad Gita 4.18"},
  {t:"Little by little, through patience and repeated effort, the mind becomes stilled.",r:"Bhagavad Gita 6.25"},
];
const VS_BUDDHIST=[
  {t:"All that we are is the result of what we have thought.",r:"Dhammapada 1"},
  {t:"Hatred is never appeased by hatred; by love alone is it appeased.",r:"Dhammapada 5"},
  {t:"One who conquers himself is greater than one who conquers a thousand in battle.",r:"Dhammapada 103"},
  {t:"Irrigators guide the water; fletchers shape the arrow; the wise master themselves.",r:"Dhammapada 80"},
  {t:"As a solid rock is unshaken by the wind, the wise are unshaken by praise or blame.",r:"Dhammapada 81"},
  {t:"Better than a thousand hollow words is one word that brings peace.",r:"Dhammapada 100"},
  {t:"Do good again and again — the gathering of good, little by little, is happiness.",r:"Dhammapada 118"},
  {t:"Health is the greatest gift, contentment the greatest wealth.",r:"Dhammapada 204"},
  {t:"Long is the night to the sleepless; long the road to the weary.",r:"Dhammapada 60"},
  {t:"Do not think good is far off; even a water-pot is filled by falling drops.",r:"Dhammapada 122"},
  {t:"The mind is hard to check, swift, and flies wherever it wills; to master it is good.",r:"Dhammapada 35"},
  {t:"By oneself is one purified; purity and impurity depend on oneself.",r:"Dhammapada 165"},
  {t:"Know your own good, and be intent upon it.",r:"Dhammapada 166"},
  {t:"Him I call wise who, though wronged, bears no ill will.",r:"Dhammapada 400"},
  {t:"Let go of the past, let go of the future, let go of the present.",r:"Dhammapada 348"},
  {t:"Heedfulness is the path to the deathless; heedlessness the path to death.",r:"Dhammapada 21"},
  {t:"As rain breaks through an ill-thatched house, passion breaks through an untrained mind.",r:"Dhammapada 13"},
  {t:"He who holds back rising anger like a rolling chariot — him I call a charioteer.",r:"Dhammapada 222"},
  {t:"Conquer anger by love, evil by good, the miserly by giving, the liar by truth.",r:"Dhammapada 223"},
  {t:"The peaceful live happily, having given up both victory and defeat.",r:"Dhammapada 201"},
  {t:"The fool who knows he is a fool is wise at least so far.",r:"Dhammapada 63"},
  {t:"Better than a hundred years lived without seeing the deathless is one day lived seeing it.",r:"Dhammapada 114"},
];
const VS_SECULAR=[
  {t:"You have power over your mind — not outside events. Realize this, and you will find strength.",r:"Marcus Aurelius, Meditations"},
  {t:"We suffer more often in imagination than in reality.",r:"Seneca"},
  {t:"It is not what happens to you, but how you react to it, that matters.",r:"Epictetus"},
  {t:"The happiness of your life depends upon the quality of your thoughts.",r:"Marcus Aurelius, Meditations"},
  {t:"No one is free who is not master of himself.",r:"Epictetus"},
  {t:"Waste no more time arguing what a good person should be. Be one.",r:"Marcus Aurelius, Meditations"},
  {t:"First say to yourself what you would be; then do what you have to do.",r:"Epictetus"},
  {t:"Difficulties strengthen the mind, as labour does the body.",r:"Seneca"},
  {t:"The impediment to action advances action. What stands in the way becomes the way.",r:"Marcus Aurelius, Meditations"},
  {t:"How long will you wait before you demand the best of yourself?",r:"Epictetus"},
  {t:"Begin at once to live, and count each day as a separate life.",r:"Seneca"},
  {t:"Wealth consists not in having great possessions, but in having few wants.",r:"Epictetus"},
  {t:"He who is brave is free.",r:"Seneca"},
  {t:"Luck is what happens when preparation meets opportunity.",r:"Seneca"},
  {t:"Confine yourself to the present.",r:"Marcus Aurelius, Meditations"},
  {t:"The best revenge is not to be like your enemy.",r:"Marcus Aurelius, Meditations"},
  {t:"When you arise in the morning, think of what a precious privilege it is to be alive.",r:"Marcus Aurelius"},
  {t:"Very little is needed to make a happy life; it is all within yourself, in your way of thinking.",r:"Marcus Aurelius, Meditations"},
  {t:"Choose not to be harmed — and you won’t feel harmed. Don’t feel harmed — and you haven’t been.",r:"Marcus Aurelius, Meditations"},
  {t:"While we wait for life, life passes.",r:"Seneca"},
  {t:"It is not that we have a short time to live, but that we waste a lot of it.",r:"Seneca"},
  {t:"Make the best use of what is in your power, and take the rest as it happens.",r:"Epictetus"},
  {t:"It is not things that disturb us, but our judgements about things.",r:"Epictetus"},
  {t:"Don’t explain your philosophy. Embody it.",r:"Epictetus"},
];

// ── FAITH REGISTRY ────────────────────────────────────────────────────────────
// One place that fills the universal backbone (sacred-text reader, the daily "today"
// anchor, a prayer/stillness practice, the voice, the verse pill) per tradition.
// faithTradition() = which path; faithLevel() (elsewhere) = how much surfaces.
const FAITHS = {
  christianity: {
    id:'christianity', label:'Christianity', icon:'✝', divine:'God',
    bookName:'the Bible', bookShort:'Bible',
    todayTitle:'Today in the Church', todayDesc:'The Mass readings for today and the saint the Church remembers.',
    practiceTitle:'The Rosary', practiceDesc:'Pray it guided, bead by bead — today’s mysteries chosen for you.',
    scriptureWord:'scripture', wordWord:'a word', prayWord:'pray', prayTo:'God',
    voice:'Draw on the Bible and the Christian tradition; speak of God, grace, and Christ naturally when it fits.',
    verses: VS_CHRISTIANITY,
  },
  islam: {
    id:'islam', label:'Islam', icon:'☪', divine:'Allah',
    bookName:'the Qur’an', bookShort:'Qur’an',
    todayTitle:'Prayer times', todayDesc:'Today’s five prayers, the Hijri date, and an ayah.',
    practiceTitle:'Dhikr', practiceDesc:'Remembrance of Allah — guided, with the beautiful names.',
    scriptureWord:'the Qur’an', wordWord:'an ayah', prayWord:'pray', prayTo:'Allah',
    voice:'Draw on the Qur’an and the Islamic tradition; speak of Allah, mercy (rahma), patience (sabr), and gratitude (shukr) naturally when it fits. Be reverent and never misquote.',
    verses: VS_ISLAM,
  },
  hinduism: {
    id:'hinduism', label:'Hinduism', icon:'🕉', divine:'the Divine',
    bookName:'the Bhagavad Gita', bookShort:'Gita',
    todayTitle:'Today’s verse', todayDesc:'A verse from the Gita to carry through the day.',
    practiceTitle:'Japa', practiceDesc:'Mantra repetition — steady the mind, bead by bead.',
    scriptureWord:'the Gita', wordWord:'a verse', prayWord:'pray', prayTo:'the Divine',
    voice:'Draw on the Bhagavad Gita and the dharmic tradition; speak of dharma, doing one’s duty without attachment to the fruits, and the steady mind. Respectful, never dogmatic.',
    verses: VS_HINDU,
  },
  buddhism: {
    id:'buddhism', label:'Buddhism', icon:'☸', divine:null,
    bookName:'the Dhammapada', bookShort:'Dhammapada',
    todayTitle:'Today’s teaching', todayDesc:'A teaching from the Dhammapada for today.',
    practiceTitle:'Meditation', practiceDesc:'Sit with the breath — guided, at your own pace.',
    scriptureWord:'the Dhammapada', wordWord:'a teaching', prayWord:'sit', prayTo:null,
    voice:'Draw on the Dhammapada and the Buddhist path; speak of mindfulness, non-attachment, and the mind as the root of both suffering and freedom. No deity — the work is inner.',
    verses: VS_BUDDHIST,
  },
  secular: {
    id:'secular', label:'Secular / None', icon:'○', divine:null,
    bookName:'the Stoics', bookShort:'Reflections',
    todayTitle:'Today’s reflection', todayDesc:'A grounded reflection to steady the day.',
    practiceTitle:'Stillness', practiceDesc:'A few quiet minutes with the breath — no belief required.',
    scriptureWord:'a reflection', wordWord:'a reflection', prayWord:'reflect', prayTo:null,
    voice:'Use NO religious language at all. Lead with the human and the practical — Stoic clarity, the science of habit, honest self-respect. Never mention God, scripture, or prayer.',
    verses: VS_SECULAR,
  },
};
// UNCHOSEN = SECULAR. This used to fall back to Christianity, so anyone who skipped the faith step —
// which every fast path does — was handed scripture and prayer they never asked for. The default is now
// no religious views at all: the app works completely without them (Stoic reflections, the science of
// habit, plain honest counsel). Faith is never withheld — it is one tap away in Settings and offered
// once, plainly, in the Soul tab. Anyone who HAS chosen a path is unaffected.
function faithTradition(){ try{ return ls('totry_faith_tradition') || 'secular'; }catch(_){ return 'secular'; } }
function curFaith(){ return FAITHS[faithTradition()] || FAITHS.secular; }
// The fallback text when a generated reflection fails or comes back empty.
//
// showAdaptivePrayer() is built for all five traditions — its title reads "A <noun> for right now" for
// anyone non-Christian, and applyFaithMorning() relabels the button "A reflection for today" for a
// secular person. But BOTH failure exits assigned PRAYERS.scripture.text, a hardcoded Christian
// scripture prayer. So the one moment the app had nothing generated to offer was the moment it handed a
// Muslim, a Hindu, a Buddhist or an atheist someone else's prayer — the seventh instance of this
// codebase's most persistent bug class, and a failure path is exactly where nobody looks.
//
// Falls back to the person's OWN tradition's verse pool, which activeVerses() already scopes correctly.
function faithFallbackReflection(){
  try{
    const t=(typeof faithTradition==='function')?faithTradition():'secular';
    if(t==='christianity' && typeof PRAYERS!=='undefined' && PRAYERS.scripture) return PRAYERS.scripture.text;
    const pool=(typeof activeVerses==='function')?activeVerses():[];
    if(pool && pool.length){
      const i=(typeof _dailyIndex==='function')?_dailyIndex(pool.length):0;
      const v=pool[i]||pool[0];
      const body=(v&&(v.t||v.verse||v.text))||'';
      const ref=(v&&(v.r||v.reference))||'';
      const w=(v&&(v.w||v.reflection))||'';
      if(body) return body + (ref?('\n\n\u2014 '+ref):'') + (w?('\n\n'+w):'');
    }
    // Nothing at all to draw on: say something true rather than something borrowed.
    return 'Take one slow breath. You showed up, and that is the part that counts today.';
  }catch(_){ return 'Take one slow breath. You showed up, and that is the part that counts today.'; }
}
function activeVerses(){ try{ const v=curFaith().verses; return (v&&v.length)?v:VS_SECULAR; }catch(_){ return VS_SECULAR; } }
function faithChosen(){ try{ return !!ls('totry_faith_tradition'); }catch(_){ return false; } }

// The quiet door. Nothing in this app requires belief, and for someone who never chose a path we say so
// out loud rather than assuming one for them. Offered once, after they have actually been using it.
function renderFaithDoor(){
  try{
    const el=document.getElementById('faith-door'); if(!el) return;
    const dismissed = ls('totry_faith_door_seen');
    const day = (typeof getDayCount==='function') ? getDayCount() : 1;
    if(faithChosen() || dismissed || day < 7){ el.style.display='none'; el.innerHTML=''; return; }
    el.style.display='block';
    el.innerHTML =
      '<div style="border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:14px;background:var(--bg3)">'+
        '<div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:7px">One thing worth saying</div>'+
        '<div style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:12px">Everything here works without any faith at all, and it will stay that way unless you say otherwise. But it was built by someone with one, and if you ever want it to speak from a tradition — Christian, Muslim, Hindu or Buddhist — that is a single tap, and you can undo it just as easily.</div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
          '<button class="btn" style="width:auto;margin:0;padding:8px 14px;font-size:12.5px;background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go)" onclick="_faithDoorOpen()">Show me the options</button>'+
          '<button class="btn" style="width:auto;margin:0;padding:8px 14px;font-size:12.5px;background:transparent;border:1px solid var(--bd);color:var(--tx3)" onclick="_faithDoorNo()">No thanks</button>'+
        '</div>'+
      '</div>';
  }catch(_){}
}
function _faithDoorOpen(){
  try{ ls('totry_faith_door_seen', 1); renderFaithDoor();
       if(typeof go==='function') go('settings');
       setTimeout(function(){ try{
         const _opts = document.getElementById('faith-tradition-options');
         // The group is a <details> that is closed by default — scrolling to a collapsed element
         // lands on a strip of nothing, and this offer is only made once (the flag above is already
         // spent). Open it first, so the choices are actually on screen.
         const _grp = _opts && _opts.closest ? _opts.closest('details') : null;
         if(_grp) _grp.open = true;
         _opts?.scrollIntoView({behavior:'smooth', block:'center'});
       }catch(_){} }, 420);
  }catch(_){}
}
function _faithDoorNo(){
  // Asked once, answered, never again. No second attempt, no softer re-ask later.
  try{ ls('totry_faith_door_seen', 1); renderFaithDoor();
       if(typeof showToast==='function') showToast('Understood','It stays exactly as it is. You can change it any time in Settings.');
  }catch(_){}
}
// The voice speaks from the PERSON'S tradition — their scripture, their vocabulary — not Christian
// verses with the names swapped. Composed into every Brother/companion prompt. Secular = no God-talk.
// SHARED WISDOM. The traditions arrived at the same handful of truths independently — self-mastery,
// letting go, patience under hardship, stillness — and SHARED_THREADS already holds each one in all five
// voices. Until now that only existed as a page someone could browse. This puts it where it actually
// helps: in counsel, when a person is asking about a struggle.
//
// The asymmetry is deliberate and matters:
//   • Someone WITH a tradition gets their own words first, and may hear a Stoic or philosophical echo
//     alongside — Stoicism sits comfortably beside every faith here because it is practical philosophy,
//     not a competing claim about God.
//   • Someone SECULAR gets the Stoic line only. They chose no religious views; answering their question
//     about a habit with scripture they did not ask for would break the promise the app makes them.
//     The door to a tradition stays open in Settings; it is not walked through on their behalf.
// And it is offered as a resonance, never as equivalence — "another tradition arrived here too" is a
// true and humbling thing to say; "all paths are the same" is a claim this app has no business making.
// WHICH traditions get an outside echo at all — Alfy's call, and deliberately conservative.
//
// No religion is EVER paired with another religion here: a Muslim would never be handed a line from the
// Gita, a Hindu never one from the Qur'an. That mixing is not something an app should do to someone's
// faith uninvited, and for many people it would read as the app not taking their tradition seriously.
//
// Even the Stoic echo is opt-in per tradition rather than assumed. Christianity is on because the two
// have been genuinely intertwined for eighteen centuries — the Church Fathers, Boethius and Aquinas all
// read and argued with the Stoics, so a Seneca line beside a Psalm is a familiar pairing rather than a
// foreign one. Islam, Hinduism and Buddhism are OFF: each has its own deep tradition of practical
// wisdom, and importing Greek philosophy into counsel about someone's faith, unasked, is presumptuous.
// They still get the full shared-theme material in their OWN voice.
//
// This is one line to change per tradition if that judgement ever changes.
const ECHO_OK = { christianity:true, islam:false, hinduism:false, buddhism:false, secular:true };

// ECHO_OK governed only what the AI was TOLD. The visible hub had a static section — "Common ground —
// the same struggle, across every path" — shown to every tradition, so a Muslim user was offered a card
// about how Lent and Navratri hold the same struggle, and a secular user got religious cross-references
// they never asked for. The rule has to hold in the UI too, not just in the prompt.
//
// Each tradition's own fasting season, so the card names THEIRS instead of listing everyone's.
const FAST_SEASON_NAME = { christianity:'Lent', islam:'Ramadan', hinduism:'Navratri', buddhism:'Uposatha', secular:'' };
// Copy that assumed one tradition, on surfaces the faith pass never reached.
// · The Sunday Sabbath card said "God designed you to need this." to EVERY tradition including secular,
//   whose own contract is "never mention God".
// · getNextStep — the Home tab's primary call to action — named the examen, a Catholic practice, as the
//   way everyone closes their day.
// The registry already knows the right words; these surfaces simply never asked it.
function _sabbathLine(){
  const t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
  if(t === 'christianity') return 'Rest is also discipline.<br>You don\'t have to perform today.<br>God designed you to need this.';
  if(t === 'islam')        return 'Rest is also discipline.<br>You don\'t have to perform today.<br>You were made to need it.';
  if(t === 'hinduism' || t === 'buddhism') return 'Rest is also discipline.<br>You don\'t have to perform today.<br>Stillness is part of the practice, not a pause from it.';
  return 'Rest is also discipline.<br>You don\'t have to perform today.<br>You were built to need it.';
}
function _nextStepCloseSub(){
  const t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
  if(t === 'christianity') return 'Your evening reflection and examen.';
  return 'Your evening reflection.';
}

function applyFaithUIGate(){
  try{
    const t = (typeof faithTradition==='function') ? faithTradition() : 'secular';
    const show = !!ECHO_OK[t];
    ['hub-common-label','hub-common-grid'].forEach(function(id){
      const el = document.getElementById(id);
      if(el) el.style.display = show ? '' : 'none';
    });
    // THE SACRAMENTS TAB IS CHRISTIAN-SPECIFIC — Confession, the Eucharist, Mass. It lived in the static
    // HTML (index.html:2825) and NOTHING ever gated it: #bst-sacraments appears exactly once in the whole
    // file, and applyFaithUIGate only ever touched the common-ground and fasting elements. Verified by
    // driving it: the tab rendered visible for islam, buddhism and secular alike, while the vocabulary
    // layer correctly called their book the Qur'an, the Dhammapada and the Stoics. So the app offered a
    // Muslim a Confession tracker as if it were his. "Faith is full but never forced" cuts both ways —
    // full for a Catholic, never imposed on anyone else.
    try{ const _sb=document.getElementById('sabbath-text'); if(_sb) _sb.innerHTML=_sabbathLine(); }catch(_){ }
    const sac = document.getElementById('bst-sacraments');
    if(sac){
      const christian = (t === 'christianity');
      sac.style.display = christian ? '' : 'none';
      // If they were standing on that tab when they changed tradition, move them somewhere that is theirs
      // rather than leaving a hidden tab's panel on screen.
      if(!christian && sac.classList.contains('active') && typeof setBibleTab === 'function') setBibleTab('read');
    }
    const fd = document.getElementById('hub-fast-desc');
    if(fd){
      const own = FAST_SEASON_NAME[t];
      fd.textContent = own
        ? (own + ', or a window you set yourself — and the whole app moves with it.')
        : 'Set your own window — and the whole app moves with it.';
    }
  }catch(_){ }
}
function sharedWisdomNote(){
  try{
    if(typeof SHARED_THREADS==='undefined' || !SHARED_THREADS.length) return '';
    const t = (typeof faithTradition==='function') ? faithTradition() : 'secular';
    const level = (typeof faithLevel==='function') ? faithLevel() : 'full';
    const pick = th => (th && th.lines) ? th.lines[t] : null;
    const lines = SHARED_THREADS.map(function(th){
      const own = pick(th);
      const sec = th.lines && th.lines.secular;
      if(t === 'secular'){
        return sec ? ('· ' + th.theme + ' — "' + sec.t + '" (' + sec.r + ')') : '';
      }
      const bits = [];
      if(own) bits.push('their tradition: "' + own.t + '" (' + own.r + ')');
      if(sec && level !== 'light' && ECHO_OK[t]) bits.push('a Stoic echo: "' + sec.t + '" (' + sec.r + ')');
      return bits.length ? ('· ' + th.theme + ' — ' + bits.join('; ')) : '';
    }).filter(Boolean);
    if(!lines.length) return '';
    const how = (t === 'secular')
      ? 'SHARED WISDOM you may draw on when it fits what they are actually asking. This person follows no religion — use these as practical philosophy and NEVER introduce religious language or scripture.\n'
      : (ECHO_OK[t]
          ? 'SHARED WISDOM you may draw on when it fits what they are actually asking. Lead with THEIR tradition. You may add the second line as a resonance — "the Stoics came at the same thing from another direction" — when it genuinely helps, never to imply the paths are interchangeable, and never more than one per reply. If they are in acute distress, drop it entirely and just be present.\n'
          : 'SHARED WISDOM from THEIR OWN tradition, to draw on when it fits what they are actually asking. Speak only from within their tradition — do NOT bring in other religions, and do not import outside philosophy into counsel about their faith. If they are in acute distress, drop it entirely and just be present.\n');
    return how + lines.join('\n') + '\n\n';
  }catch(_){ return ''; }
}
function faithVoiceNote(){
  try{
    const f = curFaith();
    let s = "FAITH CONTEXT — the person follows "+f.label+". "+f.voice+" ";
    if(typeof faithLevel==='function' && faithLevel()==='light'){
      s += (f.id==='secular')
        ? "They've set intensity LIGHTER too — keep it minimal and purely practical. "
        : "They've also set faith LIGHTER — ease off further; lead with the human and the practical, keep all your warmth, and let their tradition surface only when they open that door. ";
    }
    return s;
  }catch(_){ return ""; }
}

// Shared, non-Soul faith labels (the weekly check-in dimension, etc.) — relabel per tradition so a
// Buddhist/secular user isn't asked to rate "connection with God."
function faithConnLabel(){
  return {christianity:'Faith / connection with God',islam:'Faith / connection with Allah',hinduism:'Faith / connection with the Divine',buddhism:'Spirit / inner peace',secular:'Meaning / groundedness'}[faithTradition()] || 'Faith / connection';
}
function applyFaithGlobal(){
  // Extend the existing global apply rather than adding parallel call sites — it already runs at boot
  // (35193) and whenever the tradition changes (11531), which is exactly when the gate must re-evaluate.
  try{ applyFaithUIGate(); }catch(_){}
  try{ const e=document.getElementById('wk-faith-label'); if(e) e.textContent=faithConnLabel(); }catch(_){}
  try{ const e2=document.getElementById('shared-prayer-label'); if(e2){ const t=faithTradition(); e2.textContent=(t==='buddhism'||t==='secular')?'Words to share':'A prayer to share'; } }catch(_){}
}
// The static evening + weekly "prayers" in the Reflect tab, per tradition (Christianity keeps its own).
// The examen's closing screen, per tradition. It used to hardcode Psalm 139:23, a Christian prayer and
// the toast "God walked with you today" — for a Muslim, a Hindu, a Buddhist and for someone who chose no
// religion at all. The examen itself is deliberately offered to everyone (it is a nightly review of the
// day, not a Catholic-only practice), so its ending has to belong to whoever just did it.
const _EXAMEN_CLOSE={
  christianity:{ q:'Search me, O God, and know my heart;<br>try me and know my thoughts.', r:'Psalm 139:23',
                 toast:'God walked with you today.' },
  islam:        { q:'And it is He who takes your souls by night,<br>and knows what you have done by day.', r:'Qur\u2019an 6:60',
                 toast:'Allah saw all of it \u2014 and His mercy is wider.' },
  hinduism:     { q:'Let a man lift himself by himself;<br>let him not lower himself.', r:'Bhagavad Gita 6:5',
                 toast:'You looked honestly at your day.' },
  buddhism:     { q:'Thus should you train yourself:<br>\u201CI will review my actions, by day and by night.\u201D', r:'Majjhima Nik\u0101ya 61',
                 toast:'You reviewed the day clearly.' },
  secular:      { q:'The unexamined life is not worth living.', r:'Socrates',
                 toast:'You looked honestly at your day.' }
};
function _examenClose(){
  const t = (typeof faithTradition==='function') ? faithTradition() : 'secular';
  return _EXAMEN_CLOSE[t] || _EXAMEN_CLOSE.secular;
}
const _EVE_PRAYERS={
  christianity:{lbl:'Evening prayer',text:'Lord, thank You for this day.\nFor the moments I got it right, and for Your grace when I didn’t.\nI give You what I carried today — the wins, the failures, the urges I fought.\nForgive me where I fell short. Strengthen me for tomorrow.\nNot perfect. Just better.\nAmen.'},
  islam:{lbl:'Evening du’a',text:'Alhamdulillah for this day —\nfor what I got right, and for Your mercy where I fell short.\nO Allah, I give You what I carried: the wins, the struggles, the urges I fought.\nForgive my shortcomings and strengthen me for tomorrow.\nNot perfect. Just better.'},
  hinduism:{lbl:'Evening prayer',text:'I give thanks for this day —\nfor what I did well, and for the lessons in what I didn’t.\nI offer up what I carried: the wins, the struggles, the pulls I resisted.\nLet me meet tomorrow with a steadier mind, doing my duty without clinging to the fruits.\nNot perfect. Just better.'},
  buddhism:{lbl:'Evening reflection',text:'I take this moment to be grateful for the day —\nfor what went well, and for what taught me.\nI set down what I carried: the wins, the struggles, the cravings I met.\nMay I meet tomorrow with mindfulness and an open heart.\nNot perfect. Just present.'},
  secular:{lbl:'Evening reflection',text:'I close the day honestly —\nfor what I got right, and what I didn’t.\nI set down what I carried: the wins, the failures, the urges I fought.\nWhat’s done is done; tomorrow I begin again.\nNot perfect. Just better.'}
};
const _WK_PRAYERS={
  christianity:{lbl:'Closing prayer',text:'Lord, a week has passed.\nYou saw all of it — what I did well and what I failed at.\nThank You for not giving up on me when I gave up on myself.\nAs I begin a new week, give me the strength to be better than the last.\nAmen.'},
  islam:{lbl:'Closing du’a',text:'A week has passed, and Allah saw all of it —\nwhat I did well and where I failed.\nAlhamdulillah for the mercy that met me when I gave up on myself.\nAs a new week begins, give me the strength to be better than the last.'},
  hinduism:{lbl:'Closing prayer',text:'A week has passed —\nwhat I did well, and where I fell short.\nI am grateful for the steadiness that held when I lost my own.\nAs a new week begins, let me act with a clearer, steadier mind than the last.'},
  buddhism:{lbl:'Closing reflection',text:'A week has passed —\nwhat went well, and what I struggled with.\nI hold it all with an even mind, without clinging or aversion.\nAs a new week begins, may I return, again and again, to the present.'},
  secular:{lbl:'Closing reflection',text:'A week has passed —\nwhat I did well, and where I fell short.\nI’m grateful for the resolve that held when I nearly let go.\nAs a new week begins, I choose to be a little better than the last.'}
};
// The weekly review's CLOSING PRAYER was swapped per tradition and the six questions above it were
// not — so on one card a Buddhist read a closing reflection written for them and, four lines higher,
// was asked "Did I honour God in how I spent my time?" under the heading "Examination of conscience",
// which is itself a Catholic term. Five of the six questions are about a life anyone is living — vice,
// honesty, patience, keeping your word, what you avoided — and they stay exactly as they are. Only the
// one that names God, and the heading, belong to a tradition.
const _WK_CONSCIENCE={
  christianity:{lbl:'Examination of conscience', q:'Did I honour God in how I spent my time?'},
  islam:{lbl:'Muhasabah \u2014 taking account of yourself', q:'Did I honour Allah in how I spent my time?'},
  hinduism:{lbl:'Self-examination', q:'Did I live in line with my dharma in how I spent my time?'},
  buddhism:{lbl:'Looking back honestly', q:'Did I spend my time with intention, or let it slip past me?'},
  secular:{lbl:'An honest look back', q:'Did I spend my time on what actually matters to me?'}
};
function applyFaithReflect(){
  try{
    const t=faithTradition();
    const e=_EVE_PRAYERS[t]||_EVE_PRAYERS.christianity, w=_WK_PRAYERS[t]||_WK_PRAYERS.christianity;
    const set=(id,txt)=>{ const el=document.getElementById(id); if(el) el.textContent=txt; };
    set('eve-prayer-label',e.lbl); set('eve-prayer-text',e.text);
    set('wk-prayer-label',w.lbl); set('wk-prayer-text',w.text);
    const c=_WK_CONSCIENCE[t]||_WK_CONSCIENCE.christianity;
    set('wk-conscience-label',c.lbl); set('wk-conscience-faith',c.q);
  }catch(_){}
}

// Tradition-appropriate spec for AI-written prayers/reflections. Christianity keeps its Amen close;
// Islam = du'a to Allah; Hinduism = to the Divine + dharma; Buddhism = metta/mindfulness (no deity);
// Secular = Stoic reflection, zero religious language.
function faithPrayer(){
  const specs={
    christianity:{ noun:'prayer', sys:'You are a wise, warm Christian spiritual director writing a personal prayer. Scripturally rich, pastorally deep, never generic or rushed. CRITICAL: always finish completely, ending with “Amen.”', how:'Address God, give thanks, bring the situation honestly before God, ask for grace, and close with trust and Amen. Weave in a relevant scripture verse with its reference.', ends:/amen[.!]?$/i },
    islam:{ noun:'du’a', sys:'You write warm, sincere Islamic du’a (personal supplication) in the first person — humble and hopeful, never performative. A real person turning to Allah. Never use Christian words (Christ, Amen, saint).', how:'Address Allah (you may open “O Allah”). Give thanks (alhamdulillah where natural), bring the situation honestly before Allah, ask for help, patience (sabr) and guidance, and close in trust. You may weave in a theme from the Qur’an.', ends:null },
    hinduism:{ noun:'prayer', sys:'You write warm, sincere Hindu prayers in the first person — reverent toward the Divine, grounded in dharma, never performative. Avoid Christian-specific words.', how:'Address the Divine. Give thanks, bring the situation honestly forward, ask for a steady mind and the strength to do one’s duty without attachment to the fruits, and close in trust. You may weave in a theme from the Bhagavad Gita.', ends:null },
    buddhism:{ noun:'reflection', sys:'You write gentle Buddhist reflections and loving-kindness (metta) in the first person — no deity, grounded in mindfulness and compassion.', how:'There is no God to address — this is an inner turning. Acknowledge what is present honestly and without judgment, set an intention of mindfulness and non-attachment, extend loving-kindness to self and others, and rest in the breath. You may draw on the Dhammapada. Do not address any deity.', ends:null },
    secular:{ noun:'reflection', sys:'You write clear, grounded first-person reflections — Stoic in spirit, honest and practical. Use NO religious language whatsoever.', how:'This is honest reflection, not a prayer. Name what is true now, separate what is in their control from what is not, choose how they want to meet the moment, and commit to one concrete thing. Never mention God, prayer, scripture, or the sacred.', ends:null }
  };
  return specs[faithTradition()]||specs.christianity;
}

// ── SOUL TAB — make the cards speak the person's tradition ─────────────────────
// Relabels the book/today/practice/stillness cards and shows only what fits the path.
// Christianity keeps liturgy + Rosary; other paths get their reader + the universal stillness.
// THE SCREEN AND THE VOICE DISAGREED ABOUT WHO THE COACH IS. The Coach tab opened "He's read your
// whole story … Ask him anything" for everyone, while sexNote() in the same build was telling the model
// "THEIR SEX: female. You are her big SISTER. Never call her brother, man, mate, bro or lad." So a woman
// read one thing on the page and was answered as another. It was the only tab of fifteen still gendered
// in its static copy, and it had no id, so nothing could reach it.
// No sex on file gets the neutral form rather than a guess — the app asks in Settings, it does not assume.
function applyCoachVoiceCopy(){
  try{
    const el = document.getElementById('coach-intro-desc');
    if(!el) return;
    const sx = (typeof userSex === 'function') ? userSex() : null;
    const who  = sx === 'female' ? 'She\u2019s' : sx === 'male' ? 'He\u2019s' : 'Your coach has';
    const them = sx === 'female' ? 'her' : sx === 'male' ? 'him' : '';
    el.textContent = who + ' read your whole story \u2014 your training, your fight, your money, your faith, '
      + 'what weighs on you. Not a search bar. Someone who knows you, and points you toward who you\u2019re '
      + 'becoming. Ask ' + (them ? them + ' ' : '') + 'anything.';
  }catch(_){}
}
function applyFaithLabels(){
  try{
    const f=curFaith(), t=f.id;
    const set=(id,txt)=>{ const el=document.getElementById(id); if(el&&txt!=null) el.textContent=txt; };
    const show=(id,on)=>{ const el=document.getElementById(id); if(el) el.style.display= on ? '' : 'none'; };
    set('soul-book-title', f.bookShort);
    set('soul-book-desc', (t==='secular')
      ? 'Grounded reflections for whatever you’re facing — read, and carry one with you.'
      : 'A passage for whatever you’re facing, a full reader, and passages to carry.');
    // Every path has a "today" anchor: Christianity=liturgy, Islam=prayer times, others=a daily passage.
    show('soul-today-card', true);
    set('soul-today-title', f.todayTitle);
    set('soul-today-desc', f.todayDesc);
    // Practice: Christianity=Rosary, Islam=Dhikr, Hinduism=Japa; Buddhism/Secular lean on the stillness card.
    // Every tradition has an authored practice — Rosary, Dhikr, Japa, Meditation, Stillness — and
    // openPractice() already routes all five (Buddhism and Secular fall through to the breath menu,
    // which IS the practice for them). This gate listed only three, so a Buddhist never saw a door to
    // meditation and a secular person never saw one to stillness, despite both being written and wired.
    // It also left the title element holding the PREVIOUS tradition's text, so switching from Hinduism
    // to Secular in Settings showed a secular user the word "Japa".
    const hasPractice = !!(f && f.practiceTitle);
    show('soul-practice-card', hasPractice);
    // Set unconditionally so the label can never go stale from a previous tradition.
    // For a Buddhist this read "Meditation — Sit with the breath, guided, at your own pace" and opened
    // metta, which is loving-kindness and not breath — while metta had its own card directly beneath
    // it and "Stillness & breath" its own card above. Three consecutive doors, two of them duplicates,
    // and the one with the breath copy leading somewhere else. Both of its destinations already sit on
    // this screen under their own names, so here it has nothing left of its own to open. Removing is
    // intention. Every other tradition keeps it — for them it is the ONLY door to that practice.
    try{
      const _pc = document.getElementById('soul-practice-card');
      if(_pc) _pc.style.display = (t === 'buddhism') ? 'none' : '';
    }catch(_){ }
    set('soul-practice-title', f.practiceTitle || '');
    set('soul-practice-desc', f.practiceDesc || '');
    const still={
      christianity:'A minute of guided breathing — or the Jesus Prayer carried on your breath. The one work you can always do.',
      islam:'A minute of guided breathing — or dhikr carried on your breath. The one work you can always do.',
      hinduism:'A minute of guided breathing — or a mantra carried on your breath. The one work you can always do.',
      buddhism:'A minute of guided breathing — resting attention on the breath itself. The one work you can always do.',
      secular:'A minute of guided breathing — just you and the breath, no belief required. The one work you can always do.'
    };
    set('soul-still-desc', still[t]||still.christianity);
    // The Blessing — named honestly per path. Metta is Buddhist; the others have their own word.
    const blessT={christianity:'Pray for the people you carry',islam:'Du\u2019a for the people you carry',hinduism:'Maitri \u2014 goodwill, one at a time',buddhism:'Metta \u2014 loving-kindness',secular:'Wish them well \u2014 one at a time'};
    const blessD={
      christianity:'Hold them before God one at a time \u2014 yourself, someone you love, a stranger, someone difficult, everyone. Ends by naming one to actually go to.',
      islam:'Make du\u2019a for them one at a time \u2014 yourself, someone you love, a stranger, someone difficult, everyone. Ends by naming one to actually go to.',
      hinduism:'Goodwill without conditions \u2014 yourself, someone you love, a stranger, someone difficult, all beings. Ends by naming one to actually go to.',
      buddhism:'The classic practice \u2014 self, a loved one, a stranger, a difficult person, all beings. Ends by naming one to actually go to.',
      secular:'Deliberately wish one person well, then widen \u2014 yourself, someone you love, a stranger, someone difficult, everyone. Ends with one to actually go to.'
    };
    const _pl=(typeof planLastLine==='function')?planLastLine():'';
    // Someone three days into a plan was still being sold the idea of plans, with the only fact they
    // needed — "The pull — day 3 of 7" — appended after a middot as the last six words of three
    // wrapped lines. The invitation is for the person who has not started. Once they have, the card's
    // job is to get them back to where they were.
    set('soul-plans-desc', _pl
      ? (_pl + '. Pick up where you left off.')
      : ('Don\u2019t know where to read? Take a short plan \u2014 fear, the pull, starting again. Five to seven days ' +
         (t==='secular'?'with the Stoics':'in '+f.bookName) + ', finishable.'));
    set('soul-bless-title', blessT[t]||blessT.christianity);
    const _bl=(typeof blessLastLine==='function')?blessLastLine():'';
    set('soul-bless-desc', (blessD[t]||blessD.christianity)+(_bl?' \u00B7 '+_bl:''));
    set('soul-drawnear-label',
      t==='secular' ? 'Steady yourself — reflection & stillness, all in one place'
      : t==='buddhism' ? 'Draw near — teachings & stillness, all in one place'
      : 'Draw near — ' + f.scriptureWord + ' & stillness, all in one place');
    const introTail={
      christianity:'to Christ, to the sacraments, to the people who love you',
      islam:'to Allah, to prayer, to the people who love you',
      hinduism:'to the Divine, to your dharma, to the people who love you',
      buddhism:'to the path, to a clear and steady mind, to the people who love you',
      secular:'to your values, to the people who love you, to the life you actually want'
    };
    set('soul-intro', 'The root beneath everything else. The body, the money, the fight — they all grow from here, or they don’t last. This is where the app points past itself: '+(introTail[t]||introTail.christianity)+'. Stay grounded here, and the rest holds.');
    set('soul-reflect-desc', t==='christianity' ? 'Close the day: how it went, journal, examen, wins.' : 'Close the day: how it went, journal, review, wins.');
    // THE CARD NEXT TO IT SAID "AND PRAYER" TO EVERYONE. This function rewrote the Reflect blurb for
    // every tradition and could not reach the Morning one beside it, or the Morning tab's own intro,
    // because neither had an id — so a secular person read "Close the day: … review, wins" directly
    // under "Start the day: gratitude, intention, a word, and prayer", and the ritual itself never
    // mentions prayer at any of its five steps. Only these two blurbs carried it.
    const _mDesc = { christianity:'Start the day: gratitude, intention, a word, and prayer.',
      islam:'Start the day: gratitude, intention, a word, and du\u2019a.',
      hinduism:'Start the day: gratitude, intention, a word, and prayer.',
      buddhism:'Start the day: gratitude, intention, a word, and a moment of stillness.',
      secular:'Start the day: gratitude, intention, a word, and a moment of stillness.' };
    const _mIntro = { christianity:'then pray', islam:'then make du\u2019a', hinduism:'then pray',
      buddhism:'then sit with it for a moment', secular:'then sit with it for a moment' };
    set('soul-morning-desc', _mDesc[t] || _mDesc.christianity);
    set('morning-intro-desc', 'A few quiet minutes to set the day: receive a word, name your gratitude and intention, '
      + (_mIntro[t] || _mIntro.christianity) + '. Take it at your own pace \u2014 there\u2019s no wrong way.');
  }catch(_){}
}

// Morning ritual prayer section — adapt per tradition. The canned quick/full prayers are Christian
// pre-written text, so for other paths we hide them and keep the (tradition-aware) generated one.
function applyFaithMorning(){
  try{
    const t=faithTradition(), pr=faithPrayer();
    const set=(id,txt)=>{ const e=document.getElementById(id); if(e&&txt!=null) e.textContent=txt; };
    const show=(id,on)=>{ const e=document.getElementById(id); if(e) e.style.display=on?'':'none'; };
    if(t==='christianity'){
      set('morning-pray-lbl','Finish with prayer');
      set('morning-pray-sub','Close your morning in prayer. The scripture prayer is written for exactly where you are today.');
      show('morning-pray-quick',true); show('morning-pray-full',true);
      set('morning-pray-adaptive','✨ Scripture prayer for today');
      set('morning-prayed-btn','I prayed — begin my day');
      set('morning-complete-direct','Set my morning without praying now');
    } else {
      show('morning-pray-quick',false); show('morning-pray-full',false);
      const lbl={islam:'Finish with du’a',hinduism:'Finish with prayer',buddhism:'Finish by sitting a moment',secular:'Finish with reflection'}[t]||'Finish';
      set('morning-pray-lbl',lbl);
      set('morning-pray-sub','Written for exactly where you are today.');
      const btn={islam:'✨ A du’a for today',hinduism:'✨ A prayer for today',buddhism:'✨ A reflection for today',secular:'✨ A reflection for today'}[t]||'✨ For today';
      set('morning-pray-adaptive',btn);
      // The two finish states — see the note above. A ritual should not end in someone else's verb.
      const done={islam:'I made du’a — begin my day',hinduism:'I prayed — begin my day',
                  buddhism:'I sat with it — begin my day',secular:'I reflected — begin my day'}[t]||'Begin my day';
      const skip={islam:'Set my morning without du’a now',hinduism:'Set my morning without praying now',
                  buddhism:'Set my morning without sitting yet',secular:'Set my morning without reflecting yet'}[t]||'Set my morning';
      set('morning-prayed-btn',done);
      set('morning-complete-direct',skip);
    }
  }catch(_){}
}

// ── READER — the person's sacred text (Qur'an/Gita live; Dhammapada/Stoic bundled; Bible = tab-bible) ──
function openScripture(){ const t=faithTradition(); if(t==='christianity'){ if(typeof go==='function') go('bible'); return; } openReader(t); }
function openTodayAnchor(){ const t=faithTradition(); if(t==='christianity'){ if(typeof go==='function') go('liturgy'); return; } if(typeof go==='function') go('today'); _renderTodayAnchor(); }
function openPractice(){ const t=faithTradition(); if(t==='christianity'){ if(typeof openRosary==='function') openRosary(); return; } if(t==='islam'){ openDhikr(); return; } if(t==='hinduism'){ openJapa(); return; } // Buddhism and secular used to fall through to the breath menu because they had no practice at all.
if(t==='buddhism'){ openMetta(); return; } if(t==='secular'){ openStillness(); return; } if(typeof openBreathMenu==='function') openBreathMenu(); }
function openMetta(){ if(typeof go==='function') go('practice'); _renderPractice('metta'); }
function openStillness(){ if(typeof go==='function') go('practice'); _renderPractice('stillness'); }
// Every scripture and prayer-time fetch below shipped with NO timeout, and `fetch` does not time out
// on its own. Offline is the easy case — it rejects fast and the catch shows the bundled passages. The
// bad case is a stalled connection or a captive portal: the promise never settles, so the catch never
// runs, the bundled fallback that exists precisely so the tab is never empty never fires, and the
// reader sits on "Loading…" — eight characters — for as long as the person is willing to wait. That is
// worse than being offline.
// Nine seconds comes from the measured live calls: Wikisource returns a 12-23KB book, alquran.cloud a
// surah, and both land in well under two seconds on a normal line. Past nine a person is watching a
// spinner, and their own tradition's bundled text is a better answer than a longer wait.
function _fetchT(u, ms, init){
  const o = init || {};
  if(typeof AbortController !== 'function') return fetch(u, o);
  const ctrl = new AbortController();
  const t = setTimeout(function(){ try{ ctrl.abort(); }catch(_){ } }, ms || 9000);
  const opts = {}; for(const k in o) opts[k] = o[k];
  opts.signal = ctrl.signal;
  return fetch(u, opts).then(function(r){
    // THE CLOCK HAS TO OUTLIVE THE HEADERS. Clearing it the moment the fetch promise settled meant the
    // bound covered connect-to-first-byte and nothing else: a server that answers and then stalls
    // mid-transfer — the ordinary shape of one bar in a supermarket aisle, and of a CDN that returns
    // headers before the origin has finished — left the BODY read unbounded at all 26 call sites. So
    // the barcode scanner still sat on "Looking up 9310072019283..." forever and the reader still sat
    // on "Loading...", exactly as they did before v567 added any of this. Disarmed when the body
    // lands, not when the first byte does.
    const _done = function(){ clearTimeout(t); };
    ['json','text','blob','arrayBuffer','formData'].forEach(function(m){
      if(typeof r[m] !== 'function') return;
      const _orig = r[m].bind(r);
      try{ r[m] = function(){ return _orig().then(function(v){ _done(); return v; },
                                                  function(e){ _done(); throw e; }); }; }
      catch(_){ /* a Response that refuses the shadow keeps the old behaviour rather than throwing */ }
    });
    return r;
  }, function(e){ clearTimeout(t); throw e; });
}
function _readLoading(){ return '<div style="text-align:center;padding:26px;color:var(--tx3);font-size:13px">Loading…</div>'; }
function _readErr(msg){ return '<div class="card" style="text-align:center;color:var(--tx3);font-size:13px;padding:18px">'+(msg||'Couldn’t load right now. Check your connection and try again.')+'</div>'; }
function _selStyle(){ return 'background:var(--bg3);border:1px solid var(--bd);color:var(--tx);border-radius:9px;padding:9px 11px;font-size:13px;max-width:100%'; }
function _readBtnStyle(){ return 'background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:14px;padding:8px 13px'; }
function openReader(t){
  const f=FAITHS[t]||curFaith();
  if(typeof go==='function') go('read');
  const subs={islam:'The Qur’an — Sahih International translation.',hinduism:'The Bhagavad Gita — chapter and verse.',buddhism:'The Dhammapada \u2014 all 26 chapters, translated by Bhikkhu Sujato.',secular:'Meditations \u2014 Marcus Aurelius, all 12 books, trans. George Long.'};
  const ttl=document.getElementById('read-title'); if(ttl) ttl.textContent=f.bookName.replace(/^the /,'').replace(/^./,c=>c.toUpperCase());
  const sub=document.getElementById('read-sub'); if(sub) sub.textContent=subs[t]||'';
  const sel=document.getElementById('read-selector'), content=document.getElementById('read-content');
  if(content) content.innerHTML=_readLoading();
  if(t==='islam') _readQuranInit(sel,content);
  else if(t==='hinduism') _readGitaInit(sel,content);
  else if(t==='buddhism') _readDhammapadaInit(sel,content);
  else _readStoicInit(sel,content);
  try{
    const panel = document.getElementById('read-saved-panel');
    const saved = (typeof ls==='function') ? (ls('totry_sv')||[]) : [];
    if(panel) panel.style.display = saved.length ? '' : 'none';
    if(saved.length && typeof renderSavedVerses==='function') renderSavedVerses('read-saved-list');
  }catch(_){ }
}
function _readBundled(sel,content,bank){
  // THE PICKER NEEDS NO NETWORK, SO IT STAYS. This cleared it — and once v567 made the fallback fire on
  // a 9s abort rather than only on a connection that was actually gone, a secular or Buddhist person on
  // a slow-but-working line watched the Book I–XII dropdown disappear along with the live text. That
  // dropdown is built entirely from the local STOIC_BOOKS / DHP_CHAPTERS arrays. Deleting it left no
  // way to choose another book, no way to retry, and no way back to the text at all without leaving the
  // tab and coming back. Choosing a book is the retry, so the door is left open.
  if(!content) return;
  content.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9.5px;color:var(--tx3);text-align:center;margin-bottom:10px">Kept on your phone — the live text did not answer. Pick a book above to try again.</div>'+'<div class="card">'+bank.map(v=>'<div style="margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--bd)"><div style="font-size:15px;line-height:1.75;color:var(--tx)">“'+v.t+'”</div><div style="font-size:12px;color:var(--tx3);margin-top:6px">— '+v.r+'</div></div>').join('')+'</div>';
}
// Qur'an — Al-Quran Cloud (free, no key): surah picker + Arabic + English.
async function _readQuranInit(sel,content){
  let surahs=window.__quranSurahs;
  if(!surahs){ try{ const r=await _fetchT('https://api.alquran.cloud/v1/surah'); const j=await r.json(); surahs=(j&&j.data)||null; window.__quranSurahs=surahs; }catch(e){ surahs=null; } }
  let start=1; try{ if(typeof getDayCount==='function'){ start=(getDayCount()%20)+1; } }catch(_){ }
  try{ if(window.__quranJump){ start=window.__quranJump; window.__quranJump=0; } }catch(_){ }
  if(sel){ sel.innerHTML = surahs ? '<select id="quran-surah" onchange="_readQuranLoad(this.value)" style="'+_selStyle()+'">'+surahs.map(s=>'<option value="'+s.number+'"'+(s.number===start?' selected':'')+'>'+s.number+'. '+s.englishName+'</option>').join('')+'</select>' : ''; }
  _readQuranLoad(String(start));
}
async function _readQuranLoad(n){
  const content=document.getElementById('read-content'); if(!content) return; content.innerHTML=_readLoading();
  try{
    let ar=null,en=null;
    try{ const r=await _fetchT('https://api.alquran.cloud/v1/surah/'+n+'/editions/quran-uthmani,en.sahih'); const j=await r.json(); if(j&&j.data&&j.data.length>=2){ ar=j.data[0].ayahs; en=j.data[1].ayahs; } }catch(e){}
    if(!en){ const r2=await _fetchT('https://api.alquran.cloud/v1/surah/'+n+'/en.sahih'); const j2=await r2.json(); en=j2.data.ayahs; }
    content.innerHTML='<div class="card">'+en.map((a,i)=>'<div style="margin-bottom:15px">'+(ar&&ar[i]?'<div dir="rtl" style="font-size:21px;line-height:2.1;color:var(--tx);text-align:right;margin-bottom:5px">'+ar[i].text+'</div>':'')+'<div style="font-size:13.5px;color:var(--tx2);line-height:1.65">'+a.text+' <span style="color:var(--tx3);font-size:11px">('+n+':'+a.numberInSurah+')</span></div></div>').join('')+'</div>';
  }catch(e){
    // Offline: the bundled pool, not an error box. The Dhammapada and Meditations readers added later
    // do this; the Qur'an and Gita ones did not, so the same loss of signal produced a dead tab for two
    // traditions and a readable one for two others. _readBundled also clears the picker.
    _readBundled(document.getElementById('read-selector'), content, VS_ISLAM);
  }
}
// Meditations — Wikisource (free, NO KEY): all 12 books, George Long's 1862 translation, public domain.
//
// Secular was the last tradition with no live text: it fell through to _readBundled() with the 24
// hardcoded passages in VS_SECULAR, while Christianity had a 66-book reader with search, and Islam,
// Hinduism and Buddhism each had their own. The registry already names the secular canon — bookName
// 'the Stoics', bookShort 'Reflections' — there just was nothing behind it.
//
// WHY WIKISOURCE AND NOT GUTENBERG. Project Gutenberg has the same translation and serves it happily to
// curl, but sends NO access-control-allow-origin, so a browser fetch is blocked outright — and its file
// is one 425KB blob including the licence header and the translator's endnotes. Wikisource is
// institutional, sends `*`, and its extracts API returns ONE BOOK of clean plain text at a time (12-23KB),
// which is the same shape as the Qur'an's surah picker and the Dhammapada's chapter picker. Checked all
// twelve book pages resolve before writing this.
//
// The extracts API only returns one extract per request whatever you pass to titles (exlimit defaults to
// 1), so this fetches per book — which is what we want anyway.
const STOIC_BOOKS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const STOIC_PAGE = 'The Thoughts of the Emperor Marcus Aurelius Antoninus/Book ';
async function _readStoicInit(sel,content){
  let i=0; try{ if(typeof getDayCount==='function') i=getDayCount()%STOIC_BOOKS.length; }catch(_){ }
  if(sel) sel.innerHTML='<select id="stoic-bk" onchange="_readStoicLoad(this.value)" style="'+_selStyle()+'">'+
    STOIC_BOOKS.map((b,n)=>'<option value="'+b+'"'+(n===i?' selected':'')+'>Book '+b+'</option>').join('')+'</select>';
  _readStoicLoad(STOIC_BOOKS[i]);
}
async function _readStoicLoad(book){
  const content=document.getElementById('read-content'); if(!content) return;
  content.innerHTML=_readLoading();
  try{
    const u='https://en.wikisource.org/w/api.php?action=query&format=json&origin=*&prop=extracts'+
            '&explaintext=1&redirects=1&titles='+encodeURIComponent(STOIC_PAGE+book);
    const r=await _fetchT(u);
    if(!r.ok) throw new Error('net');
    const j=await r.json();
    const pages=(j&&j.query&&j.query.pages)||{};
    let text='';
    for(const k in pages){ const t=(pages[k]&&pages[k].extract)||''; if(t.length>text.length) text=t; }
    text=String(text).trim();
    if(text.length<200) throw new Error('empty');
    // Long's sections are separated by SINGLE newlines, not blank lines — the extract for Book II has
    // 20 newlines and only 2 blank-line breaks, so splitting on blank lines returned the whole book as
    // one 12KB paragraph. Checked against the real response rather than assumed.
    // Also drop what Wikisource appends around the text: "== Footnotes ==" headings and marginal notes
    // like "This in Carnuntum." that are shorter than a section.
    const paras=text.split(/\n+/).map(function(x){ return x.replace(/\s+/g,' ').trim(); })
      .filter(function(x){ return x.length>40 && !/^=+.*=+$/.test(x) && !/^(Notes?|Footnotes?|References?)$/i.test(x); });
    if(!paras.length) throw new Error('empty');
    content.innerHTML='<div class="card">'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px">Meditations &middot; Book '+_escFew(book)+'</div>'+
      paras.map(function(t,n){
        // The text carries its own section numbers from section 2 on ("2. Whatever this is that I am"),
        // so adding an index as well would print "1" above "2.". Use the number the translation gives
        // when it has one, and strip it from the body so it is not shown twice.
        // Long's text numbers itself from section 2 on, but the FIRST section of every book, his quoted
        // verse lines and his continuation paragraphs carry no "N. " at all. Falling back to the running
        // index for those interleaved two unrelated numberings: Book VII rendered 50, 51, 52, 51, 54...
        // — duplicated and going backwards. A paragraph with no number of its own is a continuation and
        // gets no label, rather than being given a number that means nothing.
        const m=/^(\d{1,3})\.\s+([\s\S]+)$/.exec(t);
        const label=m?m[1]:'';
        const bodyText=m?m[2]:t;
        return '<div style="margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--bd)">'+
          (label?'<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-bottom:5px">'+_escFew(label)+'</div>':'')+
          '<div style="font-size:15px;line-height:1.85;color:var(--tx)">'+_escFew(bodyText)+'</div>'+
        '</div>';
      }).join('')+
      '<div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-align:center;margin-top:6px;letter-spacing:0.08em">MARCUS AURELIUS &middot; TRANS. GEORGE LONG 1862 &middot; VIA WIKISOURCE &middot; PUBLIC DOMAIN</div>'+
    '</div>';
  }catch(e){
    // Offline, or the page moved — the bundled passages rather than an empty tab.
    _readBundled(document.getElementById('read-selector'),content,VS_SECULAR);   // see the note in the Dhammapada fallback
  }
}
// Dhammapada — SuttaCentral (free, NO KEY): all 26 chapters, 423 verses, Bhikkhu Sujato's translation.
//
// WHY THIS EXISTS. Islam had a live Qur'an reader and Hinduism a live Gita reader, while Buddhism fell
// through to _readBundled() with the 22 hardcoded verses in VS_BUDDHIST — and the subtitle admitted it
// ("Selected teachings from the Dhammapada"). A Christian could read 66 books and search them; a
// Buddhist got 22 verses on a single screen. That is the multi-faith gap in one line of dispatch.
//
// No key needed, which is the general shape here: ESV is the ONLY text API in this app that requires
// one. alquran.cloud, vedicscriptures, bible.helloao.org, bible-api.com and SuttaCentral are all
// keyless — so serving another tradition properly is never blocked on getting a credential.
//
// Sujato's translation is dedicated to the public domain (CC0), so it can be shown in full; the credit
// below is courtesy, not obligation. Pāli is shown alongside the English the same way the Qur'an reader
// shows the Arabic — the source language belongs on the page.
//
// Falls back to VS_BUDDHIST when the network is gone, so the tab is never empty.
const DHP_CHAPTERS = [
  ['dhp1-20','1. Pairs'],['dhp21-32','2. Diligence'],['dhp33-43','3. The Mind'],
  ['dhp44-59','4. Flowers'],['dhp60-75','5. Fools'],['dhp76-89','6. The Astute'],
  ['dhp90-99','7. The Perfected Ones'],['dhp100-115','8. The Thousands'],['dhp116-128','9. Wickedness'],
  ['dhp129-145','10. The Rod'],['dhp146-156','11. Old Age'],['dhp157-166','12. The Self'],
  ['dhp167-178','13. The World'],['dhp179-196','14. The Buddhas'],['dhp197-208','15. Happiness'],
  ['dhp209-220','16. The Beloved'],['dhp221-234','17. Anger'],['dhp235-255','18. Stains'],
  ['dhp256-272','19. The Just'],['dhp273-289','20. The Path'],['dhp290-305','21. Miscellaneous'],
  ['dhp306-319','22. Hell'],['dhp320-333','23. Elephants'],['dhp334-359','24. Craving'],
  ['dhp360-382','25. Mendicants'],['dhp383-423','26. Brahmins'],
];
async function _readDhammapadaInit(sel,content){
  let i=0; try{ if(typeof getDayCount==='function') i=getDayCount()%DHP_CHAPTERS.length; }catch(_){ }
  if(sel) sel.innerHTML='<select id="dhp-ch" onchange="_readDhammapadaLoad(this.value)" style="'+_selStyle()+'">'+
    DHP_CHAPTERS.map((c,n)=>'<option value="'+c[0]+'"'+(n===i?' selected':'')+'>'+_escFew(c[1])+'</option>').join('')+'</select>';
  _readDhammapadaLoad(DHP_CHAPTERS[i][0]);
}
async function _readDhammapadaLoad(uid){
  const content=document.getElementById('read-content'); if(!content) return;
  content.innerHTML=_readLoading();
  try{
    const r=await _fetchT('https://suttacentral.net/api/bilarasuttas/'+encodeURIComponent(uid)+'/sujato');
    if(!r.ok) throw new Error('net');
    const j=await r.json();
    const tr=j.translation_text||{}, root=j.root_text||{};
    const order=Array.isArray(j.keys_order)?j.keys_order:Object.keys(tr);
    // Segment keys are dhp{verse}:{line} — dhp1:1..dhp1:6 are the six lines of verse 1. Keys with a
    // dotted line number (dhp1:0.1) are the collection/chapter headers, not text.
    const verses={}, seen=[];
    order.forEach(function(k){
      // Line 0 is NOT text. The comment above said only DOTTED zero keys (dhp1:0.1) are headers, and the
      // live response also carries UNDOTTED ones — dhp2:0, dhp3:0, dhp5:0 — whose root_text is the
      // commentary's background-story title. They were being glued onto the Pāli of 13 of 20 verses.
      const m=/^dhp(\d+):(\d+)$/.exec(k); if(!m) return;
      if(m[2] === '0') return;
      const n=m[1], en=(tr[k]||'').trim(), pli=(root[k]||'').trim();
      if(!en && !pli) return;
      if(!verses[n]){ verses[n]={en:[],pli:[]}; seen.push(n); }
      if(en) verses[n].en.push(en);
      if(pli) verses[n].pli.push(pli);
    });
    if(!seen.length) throw new Error('empty');
    const title=(DHP_CHAPTERS.find(function(c){ return c[0]===uid; })||['',''])[1];
    content.innerHTML='<div class="card">'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px">Dhammapada &middot; '+_escFew(title)+'</div>'+
      seen.map(function(n){
        const v=verses[n];
        return '<div style="margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--bd)">'+
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-bottom:5px">'+n+'</div>'+
          (v.pli.length?'<div style="font-family:Cormorant Garamond,serif;font-size:14px;font-style:italic;color:var(--tx3);line-height:1.75;margin-bottom:7px">'+_escFew(v.pli.join(' '))+'</div>':'')+
          '<div style="font-size:15px;line-height:1.85;color:var(--tx)">'+_escFew(v.en.join(' '))+'</div>'+
        '</div>';
      }).join('')+
      '<div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-align:center;margin-top:6px;letter-spacing:0.08em">TRANSLATED BY BHIKKHU SUJATO &middot; SUTTACENTRAL &middot; PUBLIC DOMAIN</div>'+
    '</div>';
  }catch(e){
    // Offline or the endpoint moved — show the bundled selection rather than an empty tab.
    const sel=document.getElementById('read-selector');
    // Pass the selector so _readBundled clears it. Passing null left a fully populated 26-chapter picker
    // above 22 bundled verses, under a subtitle promising all 26 chapters — every option rendering the
    // same text. _readBundled has cleared the picker since long before these readers existed.
    _readBundled(document.getElementById('read-selector'),content,VS_BUDDHIST);
    if(sel && !document.getElementById('dhp-ch')){ /* keep whatever selector is there */ }
  }
}
// Bhagavad Gita — vedicscriptures (free): chapter select + per-verse navigation.
const GITA_COUNTS=[47,72,43,42,29,47,30,28,34,42,55,20,35,27,20,24,28,78]; // verses per chapter (1–18)
function _gitaCount(ch){ return GITA_COUNTS[ch-1] || 40; }
async function _readGitaInit(sel,content){
  if(!window.__gita){ let ch=1; try{ if(typeof getDayCount==='function') ch=(getDayCount()%18)+1; }catch(_){ } window.__gita={ch:ch,v:1}; }
  if(sel){ sel.innerHTML='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label style="font-size:12px;color:var(--tx3)">Chapter</label><select id="gita-ch" onchange="window.__gita.ch=+this.value;window.__gita.v=1;_readGitaLoad()" style="'+_selStyle()+'">'+Array.from({length:18},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'</option>').join('')+'</select><button class="btn" onclick="_gitaNav(-1)" style="'+_readBtnStyle()+'">‹</button><button class="btn" onclick="_gitaNav(1)" style="'+_readBtnStyle()+'">›</button></div>'; }
  const chSel=document.getElementById('gita-ch'); if(chSel) chSel.value=String(window.__gita.ch);
  _readGitaLoad();
}
async function _readGitaLoad(){
  const content=document.getElementById('read-content'); if(!content) return; content.innerHTML=_readLoading();
  try{
    const g=window.__gita; const r=await _fetchT('https://vedicscriptures.github.io/slok/'+g.ch+'/'+g.v+'/index.json');
    if(!r.ok) throw new Error('net'); const j=await r.json();
    const en=(j.siva&&j.siva.et)||(j.purohit&&j.purohit.et)||(j.raman&&j.raman.et)||(j.gambir&&j.gambir.et)||'';
    content.innerHTML='<div class="card"><div style="font-size:12px;color:var(--go);margin-bottom:8px;letter-spacing:0.05em">BHAGAVAD GITA '+g.ch+'.'+g.v+' <span style="color:var(--tx3);letter-spacing:0">· verse '+g.v+' of '+_gitaCount(g.ch)+'</span></div>'+(j.slok?'<div style="font-size:16px;line-height:1.95;color:var(--tx);margin-bottom:8px">'+j.slok+'</div>':'')+(j.transliteration?'<div style="font-size:12.5px;font-style:italic;color:var(--tx3);line-height:1.6;margin-bottom:10px">'+String(j.transliteration).trim()+'</div>':'')+'<div style="font-size:14px;color:var(--tx2);line-height:1.75">'+en+'</div></div>';
  }catch(e){
    const c2=document.getElementById('read-content');
    if(c2) _readBundled(document.getElementById('read-selector'), c2, VS_HINDU);   // see the Qur'an note
  }
}
// Continuous nav: past a chapter's last verse rolls to the next chapter (and wraps 18→1).
function _gitaNav(d){
  if(!window.__gita) window.__gita={ch:1,v:1};
  let ch=window.__gita.ch, v=(window.__gita.v||1)+d;
  if(v<1){ ch=ch>1?ch-1:18; v=_gitaCount(ch); }
  else if(v>_gitaCount(ch)){ ch=ch<18?ch+1:1; v=1; }
  window.__gita={ch:ch,v:v};
  const chSel=document.getElementById('gita-ch'); if(chSel) chSel.value=String(ch);
  _readGitaLoad();
}

// ── TODAY ANCHOR (per tradition) ───────────────────────────────────────────────
// Christianity=liturgy (tab-liturgy). Islam=prayer times + Hijri + ayah. Others=a daily passage.
function _dailyIndex(len){ let d; try{ d=(typeof getDayCount==='function')?getDayCount():Math.floor(Date.now()/86400000); }catch(_){ d=Math.floor(Date.now()/86400000); } return ((d%len)+len)%len; }
function _renderTodayAnchor(){
  const t=faithTradition(), f=curFaith();
  const ttl=document.getElementById('today-title'); if(ttl) ttl.textContent=f.todayTitle;
  const sub=document.getElementById('today-sub'); if(sub) sub.textContent=f.todayDesc;
  const el=document.getElementById('today-content'); if(!el) return;
  if(t==='islam') _renderIslamToday(el); else _renderDailyPassage(el,t);
}
function _renderDailyPassage(el,t){
  const bank=(t==='hinduism')?VS_HINDU:(t==='buddhism')?VS_BUDDHIST:VS_SECULAR;
  const v=bank[_dailyIndex(bank.length)];
  const kind=(t==='hinduism')?'Today’s verse':(t==='buddhism')?'Today’s teaching':'Today’s reflection';
  el.innerHTML='<div class="card" style="text-align:center;padding:28px 20px"><div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:var(--tx3);margin-bottom:16px">'+kind+'</div><div id="daily-passage-text" style="font-family:Cormorant Garamond,serif;font-size:23px;font-style:italic;line-height:1.65;color:var(--tx);margin-bottom:14px">“'+v.t+'”</div><div id="daily-passage-ref" style="font-size:12px;color:var(--go)">— '+v.r+'</div>'+((typeof _verseToolsHTML==='function')?_verseToolsHTML('daily-passage-text','daily-passage-ref'):'')+'</div><div style="display:flex;gap:8px;margin-top:12px"><button class=\'btn\' onclick=\'openBreathMenu()\' style=\'flex:1;background:var(--bg3);border:1px solid var(--bd);font-size:12.5px\'>Sit with it \u2014 a minute</button><button class=\'btn\' onclick=\'openJournal()\' style=\'flex:1;background:var(--bg3);border:1px solid var(--bd);font-size:12.5px\'>Write what it stirs</button></div>';
}
// Islam — prayer times (Aladhan, free) + Hijri + a daily ayah. Geolocation, with a city fallback.
function _renderIslamToday(el){
  const a=VS_ISLAM[_dailyIndex(VS_ISLAM.length)];
  el.innerHTML='<div class="card" style="text-align:center;padding:22px 18px;margin-bottom:12px"><div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:var(--tx3);margin-bottom:12px">Ayah for today</div><div style="font-family:Cormorant Garamond,serif;font-size:20px;font-style:italic;line-height:1.6;color:var(--tx);margin-bottom:10px">“'+a.t+'”</div><div style="font-size:12px;color:var(--go)">— '+a.r+'</div></div><div id="salah-box">'+_readLoading()+'</div>';
  _loadSalah();
}
// THE CARD NAMED A METHOD THE APP DOES NOT ASK FOR. Every prayer-time request sends Aladhan's
// method=2, which is the Islamic Society of North America — and the card underneath read "Muslim World
// League method". They are not the same calculation: MWL and ISNA use different twilight angles, so the
// Fajr and Isha printed were ISNA's while the line beneath claimed MWL's. Verified against the live API
// on the same date and coordinates: method=2 returns meta.method.name "Islamic Society of North America
// (ISNA)", Fajr 05:08 / Isha 18:44 — exactly what the app displayed.
// Changing the METHOD would move a person's prayer times without being asked; changing the LABEL tells
// them the truth about the times they already have. Both now come from one constant, so a future change
// to either cannot leave the other behind. A method picker is the honest next step, not a silent shift.
const SALAH_METHOD = 2;
const SALAH_METHOD_NAME = 'Islamic Society of North America (ISNA)';
function _salahDateStr(){ const d=new Date(); return String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+d.getFullYear(); }
// EVERY read of a stored location is coarsened, not just the fresh fetch.
// v437 rounded coordinates to ~1km, but the rounding sat INSIDE the `if(!coords)` branch — it only
// touched a freshly-obtained position. A value already in totry_geo (including anything written by a
// build before v437) went out untouched, and a second call site at the fasting-times URL read that key
// and sent it raw. So the privacy claim in both policies — "rounded to about a kilometre before it is
// used" — was true of the first request and false of every one after it.
// Coarsening on READ is the version that cannot be bypassed by a path nobody remembered.
function geoCoarse(){
  try{
    const g = ls('totry_geo');
    if(!g || g.lat == null) return null;
    return { lat: Math.round(g.lat * 100) / 100, lng: Math.round(g.lng * 100) / 100 };
  }catch(_){ return null; }
}

async function _loadSalah(){
  const box=document.getElementById('salah-box'); if(!box) return;
  let coords = geoCoarse();                      // never the raw stored value
  if(!coords){
    try{ coords=await new Promise((res,rej)=>{ if(!navigator.geolocation) return rej(); navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude}), ()=>rej(), {timeout:8000,maximumAge:3600000}); }); if(coords){ try{ ls('totry_geo',coords); }catch(_){} } }catch(_){ coords=null; }
    // COARSENED TO ~1km BEFORE IT LEAVES THE DEVICE. Prayer times shift by a few seconds over a
    // kilometre, so two decimal places is every bit as accurate for this purpose — and it is the
    // difference between telling a third party the suburb someone prays in and telling it their address.
    // The full-precision fix reads badly in a URL query string too, which is where these coordinates go.
    try{ if(coords && coords.lat!=null){ coords={ lat:Math.round(coords.lat*100)/100, lng:Math.round(coords.lng*100)/100 }; } }catch(_){}
  }
  // A saved city is as good as coordinates, and the app already stores one (Settings writes totry_city
  // for fasting times). Without this, someone who declines location — and plenty of people do — had to
  // retype their city on EVERY visit to see prayer times, the most-used feature of their tradition.
  if(!coords){
    try{ const _c = ls('totry_city'); if(_c){ return _loadSalahByCity(_c); } }catch(_){}
  }
  if(!coords){ box.innerHTML='<div class="card" style="text-align:center;font-size:13px;color:var(--tx3);padding:18px;line-height:1.6">Allow location to see today’s prayer times.<br><button class="btn" onclick="_promptCity()" style="margin-top:10px;display:inline-block;padding:7px 14px;font-size:12px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)">Or enter your city</button></div>'; return; }
  try{
    const r=await _fetchT('https://api.aladhan.com/v1/timings/'+_salahDateStr()+'?latitude='+coords.lat+'&longitude='+coords.lng+'&method='+SALAH_METHOD+'');
    const j=await r.json(); if(j.code!==200||!j.data) throw new Error('n'); box.innerHTML=_salahCard(j.data.timings,j.data.date.hijri);
  }catch(e){ box.innerHTML=_readErr('Couldn’t load prayer times right now.'); }
}
async function _promptCity(){ try{ const c=await askText('Your city', 'Used only to work out prayer times where you are.', {confirmLabel:'Set city'}); if(c&&c.trim()) _loadSalahByCity(c.trim()); }catch(_){} }
async function _loadSalahByCity(city){
  const box=document.getElementById('salah-box'); if(box) box.innerHTML=_readLoading();
  // NB: the city is saved further down, only after the API confirms it resolved — so a typo is never
  // persisted and then silently reused. The bug was never the write; it was that _loadSalah() did not
  // READ it, so the saved city sat there unused and people retyped it every visit.
  try{ const r=await _fetchT('https://api.aladhan.com/v1/timingsByCity/'+_salahDateStr()+'?city='+encodeURIComponent(city)+'&country=&method='+SALAH_METHOD+''); const j=await r.json(); if(j.code!==200||!j.data) throw new Error('c'); try{ ls('totry_city',city); }catch(_){} if(box) box.innerHTML=_salahCard(j.data.timings,j.data.date.hijri)+'<div style="text-align:center;margin-top:8px"><button class="btn" onclick="_promptCity()" style="padding:5px 10px;font-size:11px;background:transparent;border:1px solid var(--bd);color:var(--tx3)">Change city</button></div>'; }
  // A STALL IS NOT A TYPO. v567's 9s abort throws into this same catch, so a real city on a slow line
  // was answered with "Couldn't find that city" — the app blaming the person's typing for the network.
  // And _readErr renders a card with no controls at all ("Change city" exists only on the success path),
  // so there was then no way to try again without leaving the tab. Both halves fixed here.
  catch(e){
    const _stalled = !!(e && (e.name === 'AbortError' || /abort|network|failed to fetch/i.test(String(e.message || e))));
    if(box) box.innerHTML = _readErr(_stalled
      ? 'The connection stalled before the times came back \u2014 the city is fine.'
      : 'Couldn\u2019t find that city \u2014 try a larger nearby one.') +
      '<div style="text-align:center;margin-top:8px">' +
        '<button class="btn" onclick="_loadSalahByCity(' + JSON.stringify(String(city)) + ')" style="padding:5px 10px;font-size:11px;background:transparent;border:1px solid var(--bd);color:var(--tx3)">Try again</button> ' +
        '<button class="btn" onclick="_promptCity()" style="padding:5px 10px;font-size:11px;background:transparent;border:1px solid var(--bd);color:var(--tx3)">Change city</button>' +
      '</div>';
  }
}
function _salahCard(t,h){
  const order=[['Fajr',t.Fajr],['Sunrise',t.Sunrise],['Dhuhr',t.Dhuhr],['Asr',t.Asr],['Maghrib',t.Maghrib],['Isha',t.Isha]];
  const now=new Date(); const nowM=now.getHours()*60+now.getMinutes();
  const toM=s=>{const m=/(\d+):(\d+)/.exec(s||''); return m?(+m[1]*60+ +m[2]):9999;};
  const prayers=order.filter(o=>o[0]!=='Sunrise');
  let nextIdx=prayers.findIndex(o=>toM(o[1])>nowM), mins;
  if(nextIdx<0){ nextIdx=0; mins=(24*60-nowM)+toM(prayers[0][1]); } else { mins=toM(prayers[nextIdx][1])-nowM; }
  const nextName=prayers[nextIdx][0];
  const hh=Math.floor(mins/60), mm=mins%60; const cd=(hh>0?hh+'h ':'')+mm+'m';
  const rows=order.map(o=>{ const isNext=(o[0]===nextName); const dim=(o[0]==='Sunrise'); return '<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 4px;border-bottom:1px solid var(--bd)"><span style="font-size:14px;color:'+(isNext?'var(--go)':dim?'var(--tx3)':'var(--tx2)')+';'+(isNext?'font-weight:600':'')+'">'+o[0]+(isNext?' · next':'')+'</span><span style="font-family:DM Mono,monospace;font-size:14px;color:'+(isNext?'var(--go)':'var(--tx2)')+'">'+o[1]+'</span></div>'; }).join('');
  const header='<div style="text-align:center;padding:2px 0 14px;margin-bottom:8px;border-bottom:1px solid var(--bd)"><div style="font-size:11px;letter-spacing:0.05em;color:var(--tx3);margin-bottom:2px">NEXT PRAYER</div><div style="font-family:Cormorant Garamond,serif;font-size:25px;color:var(--go);line-height:1.1">'+nextName+'</div><div style="font-family:DM Mono,monospace;font-size:12px;color:var(--tx2);margin-top:2px">in '+cd+'</div></div>';
  return '<div class="card"><div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--tx3);margin-bottom:8px">Today · '+h.day+' '+h.month.en+' '+h.year+' AH</div>'+header+rows+'<div style="font-size:11px;color:var(--tx3);margin-top:10px;text-align:center">Times for your location · '+SALAH_METHOD_NAME+'</div></div>';
}

// ── PRACTICE (Dhikr / Japa bead counters + the 99 Names) ───────────────────────
const JAPA_MANTRAS=[
  {name:'Om',dev:'ॐ',sub:'the primordial sound'},
  {name:'Om Namah Shivaya',dev:'ॐ नमः शिवाय',sub:'I bow to the Divine within'},
  {name:'Hare Krishna',dev:'हरे कृष्ण',sub:'the maha-mantra'},
  {name:'So Ham',dev:'सो ऽहम्',sub:'I am That'},
  {name:'Om Namo Bhagavate',dev:'ॐ नमो भगवते',sub:'surrender to the Divine'}
];
const _PRACTICE={
  dhikr:{ title:'Dhikr', sub:'Remembrance of Allah. Tap for each — a full tasbih is 33 + 33 + 34.', done:'Tasbih complete', doneSub:'100 remembrances. Carry the stillness with you.', phases:[{name:'SubhanAllah',sub:'Glory be to Allah',n:33},{name:'Alhamdulillah',sub:'Praise be to Allah',n:33},{name:'Allahu Akbar',sub:'Allah is greatest',n:34}] },
  japa:{ title:'Japa', sub:'Mantra repetition. Tap for each — a full mala is 108.', done:'Mala complete', doneSub:'108 repetitions. Carry the stillness with you.' },
  // METTA — Buddhism. Until v447 _PRACTICE held only dhikr and japa, so a Buddhist opening their practice
  // got nothing: _paintPractice returns early on an unknown kind. The four directions are the traditional
  // sequence (self, someone loved, someone neutral, someone difficult) and the order matters — it starts
  // with the self because a person who cannot wish themselves well has nowhere to begin, which is the same
  // reason this app leads with grace rather than discipline.
  metta:{ title:'Mettā', sub:'Loving-kindness. Say each line silently, once per tap — for yourself first, then outward.',
    done:'Mettā complete', doneSub:'Four directions held. Carry the warmth with you.',
    phases:[
      {name:'May I be safe. May I be well. May I be at ease.', sub:'For yourself — start here, always', n:8},
      {name:'May you be safe. May you be well. May you be at ease.', sub:'Someone you love — hold their face', n:8},
      {name:'May you be safe. May you be well. May you be at ease.', sub:'Someone you barely know — the person at the counter', n:8},
      {name:'May you be safe. May you be well. May you be at ease.', sub:'Someone difficult — this is the hard one, and the point', n:8}
    ] },
  // STILLNESS — secular. FAITHS.secular is explicit: "Use NO religious language at all. Never mention God,
  // scripture, or prayer." So this is attention training and nothing else: no deity, no mantra, no
  // devotion. Stoic in spirit because that is the app's secular voice, and the counts are short enough
  // that someone restless can actually finish one.
  stillness:{ title:'Stillness', sub:'Not emptying your mind — practising bringing it back. Tap each time you return.',
    done:'Done', doneSub:'That was attention training, and you did the reps.',
    phases:[
      {name:'Feel the breath at the nostrils', sub:'When you notice you have wandered, that IS the rep — tap and return', n:10},
      {name:'Name what is here without arguing with it', sub:'Tight chest. Restless. Bored. Naming it loosens its grip', n:8},
      {name:'One thing you can control today', sub:'Hold it. Everything else is outside you', n:6}
    ] }
};
function openDhikr(){ if(typeof go==='function') go('practice'); _renderPractice('dhikr'); }
function openJapa(){ if(typeof go==='function') go('practice'); _renderPractice('japa'); }
function _mantraIdx(){ let mi=0; try{ mi=parseInt(ls('totry_mantra')||'0',10)||0; }catch(_){} return (mi>=0&&mi<JAPA_MANTRAS.length)?mi:0; }
function _practicePhases(kind){ if(kind==='japa'){ const m=JAPA_MANTRAS[_mantraIdx()]; return [{name:m.dev,sub:m.name+' · '+m.sub,n:108}]; } return _PRACTICE[kind].phases; }
function _renderPractice(kind){ if(!_PRACTICE[kind]) return; window.__practice={kind:kind,phase:0,count:0}; _paintPractice(); }
function _selectMantra(i){ try{ ls('totry_mantra',i); }catch(_){} window.__practice={kind:'japa',phase:0,count:0}; _paintPractice(); }
function _paintPractice(){
  const el=document.getElementById('practice-content'); if(!el) return;
  const st=window.__practice||{kind:'dhikr',phase:0,count:0}; const cfg=_PRACTICE[st.kind]; const phases=_practicePhases(st.kind); const ph=phases[st.phase];
  const ttl=document.getElementById('practice-title'); if(ttl) ttl.textContent=cfg.title;
  const sub=document.getElementById('practice-sub'); if(sub) sub.textContent=cfg.sub;
  let chooser='';
  if(st.kind==='japa'){ const mi=_mantraIdx(); chooser='<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:16px">'+JAPA_MANTRAS.map((m,i)=>'<button onclick="_selectMantra('+i+')" style="cursor:pointer;font-size:12px;padding:6px 11px;border-radius:20px;border:1px solid '+(i===mi?'var(--go)':'var(--bd)')+';background:'+(i===mi?'rgba(200,169,110,0.12)':'var(--bg3)')+';color:'+(i===mi?'var(--go)':'var(--tx2)')+'">'+m.name+'</button>').join('')+'</div>'; }
  const roundInfo=phases.length>1?('<div style="font-size:11px;color:var(--tx3);margin-top:4px">Part '+(st.phase+1)+' of '+phases.length+'</div>'):'';
  const namesBtn=st.kind==='dhikr'?'<button class="btn" onclick="_openAsma()" style="width:100%;margin-top:12px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:13px">✦ The 99 Names of Allah ›</button>':'';
  el.innerHTML=chooser+'<div class="card" style="text-align:center;padding:24px 18px"><div style="font-family:Cormorant Garamond,serif;font-size:'+(st.kind==='japa'?'34':'26')+'px;color:var(--tx);margin-bottom:2px">'+ph.name+'</div><div style="font-size:12px;color:var(--tx3);font-style:italic">'+ph.sub+'</div>'+roundInfo+'<div onclick="_practiceTap()" style="cursor:pointer;user-select:none;width:180px;height:180px;margin:22px auto;border-radius:50%;border:2px solid var(--go-bd);background:radial-gradient(circle at 50% 40%,rgba(200,169,110,0.12),rgba(140,107,182,0.05));display:flex;flex-direction:column;align-items:center;justify-content:center"><div id="practice-count" style="font-family:DM Mono,monospace;font-size:42px;color:var(--go)">'+st.count+'</div><div style="font-size:11px;color:var(--tx3);letter-spacing:0.1em">of '+ph.n+'</div></div><div style="font-size:12px;color:var(--tx3);margin-bottom:14px">Tap the circle for each repetition</div><button class="btn" onclick="_practiceReset()" style="background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12px;padding:7px 14px">Reset</button></div>'+namesBtn;
  // The intention composer lives under the practice, so this tab is a HOME and not one exercise.
  try{ if(typeof faithHomeHTML === 'function') el.innerHTML += faithHomeHTML(); }catch(_){ }
}
// ── A HOME FOR "WHAT'S ON MY HEART", FOR EVERY TRADITION ─────────────────────────────────────────
// The app had exactly ONE intention composer — type what is weighing on you, get a prayer written for it
// — and it lived inside the Christian "The Word" tab. v435 correctly stopped routing non-Christians into
// that tab, but routing someone AWAY from a surface is not the same as giving them one: a Muslim was left
// with dhikr (a practice) and no way to bring a specific worry and be answered in his own voice.
//
// Everything needed already existed and was simply never connected: faithPrayer() has carried the specs
// for du'a, Hindu prayer, Buddhist metta and a Stoic reflection ("NO religious language whatsoever") since
// the multi-faith work, and generateIntentionPrayer now reads them instead of a hardcoded Catholic prompt.
// This is the surface that lets a person actually reach it. Ids are prefixed 'fh-prayer' so nothing
// collides with the Christian panel's — both live in the DOM at once.
function openFaithHome(){
  const t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
  if(typeof go === 'function') go('practice');
  // Render the tradition's practice if it HAS one — only dhikr (islam) and japa (hinduism) exist today.
  // Buddhism and secular have none, and _paintPractice returns early for them, which is exactly why the
  // composer cannot be hung off the practice renderer alone.
  try{
    const KIND = { islam:'dhikr', hinduism:'japa', buddhism:'metta', secular:'stillness' }[t];
    if(KIND && typeof _renderPractice === 'function') _renderPractice(KIND);
    else {
      const el = document.getElementById('practice-content');
      const ttl = document.getElementById('practice-title');
      const sub = document.getElementById('practice-sub');
      const secular = (t === 'secular');
      if(ttl) ttl.textContent = secular ? 'Stillness' : 'Practice';
      if(sub) sub.textContent = secular
        ? 'A few minutes of quiet, and somewhere to put what is on your mind.'
        : 'Sit with it, and bring what is on your heart.';
      if(el) el.innerHTML = '';
    }
  }catch(_){ }
  // The composer always renders, for every tradition that is not Christian (they have the Word tab).
  try{
    const el = document.getElementById('practice-content');
    if(el && typeof faithHomeHTML === 'function'){
      const html = faithHomeHTML();
      if(html && el.innerHTML.indexOf('fh-prayer-intention') === -1) el.innerHTML += html;
    }
  }catch(_){ }
}

function faithHomeHTML(){
  const t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
  if(t === 'christianity') return '';                       // they already have the Word tab
  const fp = (typeof faithPrayer === 'function') ? faithPrayer() : { noun: 'reflection' };
  const noun = fp.noun || 'reflection';
  const secular = (t === 'secular');
  const heading = secular ? 'Something on your mind' : ('Something on your heart');
  const hint = secular
    ? 'Say what is actually weighing on you. You will get a short, plain reflection written for it — no religious language.'
    : ('Say what is actually weighing on you, and a ' + noun + ' will be written for it — yours, in your own tradition’s voice.');
  const ph = secular
    ? 'e.g. the conversation I keep avoiding / staying steady this weekend'
    : 'e.g. my mother’s health / staying clean this weekend / gratitude for today';
  return '<div class="card" style="margin-top:14px">' +
      '<div class="card-hd" style="margin-bottom:6px">' + _escFew(heading) + '</div>' +
      '<p style="font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:10px">' + _escFew(hint) + '</p>' +
      '<textarea id="fh-prayer-intention" placeholder="' + _escFew(ph) + '" style="min-height:70px;font-size:16px;line-height:1.5;margin-bottom:10px"></textarea>' +
      '<button class="btn primary" id="fh-prayer-btn" onclick="generateIntentionPrayer(\'fh-prayer\')">' +
        _escFew(secular ? 'Write my reflection' : ('Write my ' + noun)) + '</button>' +
      '<div id="fh-prayer-out" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--bd)"></div>' +
    '</div>';
}

function _practiceTap(){
  const st=window.__practice; if(!st) return; const cfg=_PRACTICE[st.kind]; const phases=_practicePhases(st.kind); const ph=phases[st.phase];
  st.count++;
  if(typeof haptic==='function') haptic('light');
  if(st.count>=ph.n){
    if(st.phase<phases.length-1){ st.phase++; st.count=0; if(typeof haptic==='function') haptic('success'); _paintPractice(); }
    else {
      if(typeof haptic==='function') haptic('success');
      // RECORD IT, THE WAY A ROSARY IS RECORDED. A Catholic who walks the rosary has it written to
      // totry_rosaries, is told "that's N rosaries walked with Our Lady", and Home stops asking him to
      // pray. A Muslim who taps a hundred times through the full tasbih — or a Hindu through 108 japa,
      // or anyone through mettā or a stillness sit — got a card and nothing else: not one byte written,
      // and Home still said "Take a moment to pray" to someone who had just spent ten minutes praying.
      // Measured by diffing the whole of localStorage across a completed tasbih: changed=[], added=[].
      // Best-effort inside its own try, on the rosary's principle: a failed write must never rob a
      // person of the moment. prayedToday in 31-nextstep.js reads this key, so it is not another
      // write nobody looks at.
      let _n = 0;
      try{
        const _list = ls('totry_practices') || [];
        _list.unshift({ ts:new Date().toISOString(), kind:st.kind });
        ls('totry_practices', _list.slice(0,500));
        _n = _list.length;
        if(typeof logEvent==='function') logEvent('practice_complete');
        if(typeof syncToCloud==='function') syncToCloud();
      }catch(_){ }
      const _kept = _n ? '<div style="font-size:12px;color:var(--go);margin-bottom:16px">That’s '+_n+' kept.</div>' : '';
      const el=document.getElementById('practice-content');
      if(el) el.innerHTML='<div class="card" style="text-align:center;padding:32px 20px"><div style="font-size:34px;margin-bottom:10px">✓</div><div style="font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;color:var(--tx);margin-bottom:8px">'+cfg.done+'</div><div style="font-size:13px;color:var(--tx3);margin-bottom:18px">'+cfg.doneSub+'</div>'+_kept+'<button class="btn primary" onclick="_renderPractice(\''+st.kind+'\')" style="max-width:200px;margin:0 auto">Again</button></div>';
    }
  } else {
    const c=document.getElementById('practice-count'); if(c) c.textContent=st.count; else _paintPractice();
  }
}
function _practiceReset(){ const st=window.__practice; if(!st) return; st.phase=0; st.count=0; _paintPractice(); }
// The 99 Names of Allah (Asma ul-Husna), from Aladhan — a reverent scrollable list.
async function _openAsma(){
  const el=document.getElementById('practice-content'); if(!el) return; el.innerHTML=_readLoading();
  let names=window.__asma;
  if(!names){ try{ const r=await _fetchT('https://api.aladhan.com/v1/asmaAlHusna'); const j=await r.json(); names=(j&&j.code===200)?j.data:null; window.__asma=names; }catch(e){ names=null; } }
  const back='<div style="margin-bottom:10px"><button class="btn" onclick="_renderPractice(\'dhikr\')" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12px;padding:7px 12px">‹ Tasbih counter</button></div>';
  if(!names){ el.innerHTML=back+_readErr('Couldn’t load the names right now.'); return; }
  const rows=names.map((n,i)=>'<div style="display:flex;align-items:center;gap:12px;padding:12px 4px;border-bottom:1px solid var(--bd)"><div style="font-family:DM Mono,monospace;font-size:11px;color:var(--tx3);min-width:22px">'+(i+1)+'</div><div style="flex:1"><div style="font-size:14px;color:var(--tx)">'+n.transliteration+'</div><div style="font-size:12px;color:var(--tx3)">'+n.en.meaning+'</div></div><div dir="rtl" style="font-size:22px;color:var(--go)">'+n.name+'</div></div>').join('');
  el.innerHTML=back+'<div style="text-align:center;font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:var(--tx3);margin-bottom:12px">Asma ul-Husna · the 99 Names</div><div class="card">'+rows+'</div>';
}

// ── SHARED THREADS ─────────────────────────────────────────────────────────────
// The founder's idea: show how traditions ECHO each other on the same human struggle —
// to build peace between faiths. Framed as echoes, NOT equivalence (never "all religions
// are the same" — that quietly insults the devout). Each line is real and attributed.
const SHARED_THREADS = [
  // Awe is the one practice every tradition arrived at independently: go outside, look up, and be
  // made small in a way that doesn't diminish you. Pairs with the "Look Up" off-ramp.
  { theme:'Looking up at creation', lines:{
    christianity:{t:'The heavens declare the glory of God; the skies proclaim the work of his hands.',r:'Psalm 19:1'},
    islam:{t:'In the creation of the heavens and the earth, and the alternation of night and day, there are signs for people of understanding.',r:'Qur\u2019an 3:190'},
    hinduism:{t:'I am the taste in water, the light of the sun and the moon, the sound in air.',r:'Bhagavad Gita 7.8'},
    buddhism:{t:'Look on the world as a bubble, look on it as a mirage \u2014 and the king of death will not find you.',r:'Dhammapada 170'},
    secular:{t:'We are a way for the cosmos to know itself.',r:'Carl Sagan'} } },
  { theme:'Patience in hardship', lines:{
    christianity:{t:'Count it all joy when you meet trials, for the testing of your faith produces steadfastness.',r:'James 1:2–3'},
    islam:{t:'Indeed, with hardship comes ease.',r:'Qur’an 94:6'},
    hinduism:{t:'Cold and heat, pleasure and pain come and go; they are impermanent. Endure them patiently.',r:'Bhagavad Gita 2.14'},
    buddhism:{t:'As a solid rock is unshaken by the wind, the wise are unshaken by praise or blame.',r:'Dhammapada 81'},
    secular:{t:'We suffer more often in imagination than in reality.',r:'Seneca'} } },
  { theme:'Mastering yourself', lines:{
    christianity:{t:'Whoever rules his spirit is better than one who takes a city.',r:'Proverbs 16:32'},
    islam:{t:'The strong is not the one who overpowers others, but the one who controls himself when angry.',r:'Hadith (Bukhari)'},
    hinduism:{t:'For one who has conquered the self, the self is a friend.',r:'Bhagavad Gita 6.6'},
    buddhism:{t:'One who conquers himself is greater than one who conquers a thousand in battle.',r:'Dhammapada 103'},
    secular:{t:'No one is free who is not master of himself.',r:'Epictetus'} } },
  { theme:'Stillness & inner peace', lines:{
    christianity:{t:'Be still, and know that I am God.',r:'Psalm 46:10'},
    islam:{t:'Verily, in the remembrance of Allah do hearts find rest.',r:'Qur’an 13:28'},
    hinduism:{t:'As a lamp in a windless place does not flicker — so is the disciplined mind.',r:'Bhagavad Gita 6.19'},
    buddhism:{t:'Better than a thousand hollow words is one word that brings peace.',r:'Dhammapada 100'},
    secular:{t:'Confine yourself to the present.',r:'Marcus Aurelius'} } },
  { theme:'Gratitude & contentment', lines:{
    christianity:{t:'Give thanks in all circumstances.',r:'1 Thessalonians 5:18'},
    islam:{t:'If you are grateful, I will surely increase you.',r:'Qur’an 14:7'},
    hinduism:{t:'Whatever you do, offer it as a gift.',r:'Bhagavad Gita 9.27'},
    buddhism:{t:'Health is the greatest gift, contentment the greatest wealth.',r:'Dhammapada 204'},
    secular:{t:'Wealth consists not in having great possessions, but in having few wants.',r:'Epictetus'} } },
  { theme:'Compassion & mercy', lines:{
    christianity:{t:'Be kind to one another, tenderhearted, forgiving one another.',r:'Ephesians 4:32'},
    islam:{t:'The merciful are shown mercy by the Most Merciful.',r:'Hadith (Tirmidhi)'},
    hinduism:{t:'The wise see the same Self in all beings, and all beings in the Self.',r:'Bhagavad Gita 6.29'},
    buddhism:{t:'Hatred is never appeased by hatred; by love alone is it appeased.',r:'Dhammapada 5'},
    secular:{t:'What is not good for the hive is not good for the bee.',r:'Marcus Aurelius'} } },
  { theme:'Letting go', lines:{
    christianity:{t:'Cast all your anxieties on him, because he cares for you.',r:'1 Peter 5:7'},
    islam:{t:'And rely upon Allah; sufficient is Allah as Disposer of affairs.',r:'Qur’an 33:3'},
    hinduism:{t:'You have a right to your actions, but never to the fruits of your actions.',r:'Bhagavad Gita 2.47'},
    buddhism:{t:'From craving springs grief, from craving springs fear; for one free from craving there is no grief — whence fear?',r:'Dhammapada 216'},
    secular:{t:'Some things are within our power, and some are not.',r:'Epictetus'} } },
];
const _THREAD_LABELS={christianity:'Christianity',islam:'Islam',hinduism:'Hinduism',buddhism:'Buddhism',secular:'Stoic & secular'};
// ── GUIDED READING PLANS ──────────────────────────────────────────────────────
// Short, finishable plans (5–7 days) on what this app actually meets people in. Each plan is
// written FIVE TIMES — once per tradition, in that tradition's own register, with references
// checked one by one. Not Christian plans with the deity swapped. All passage text is bundled,
// so a plan works with no signal; the live Qur'an/Gita readers are an optional deeper look.
// Day shape: {r:reference, t:passage, w:reflection (the app's voice), q:one small question}.
// To add a plan: append an object of this shape. Nothing else needs to change.
const READING_PLANS = [
{ id:'fear', title:'When fear has you', short:'fear', sub:'7 days · anxiety, dread, the thing you keep turning over at 2am.', days:{
 christianity:[
  {r:'Philippians 4:6-7',t:'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds.',w:'Notice what Paul doesn’t say. He doesn’t say stop being anxious — he says hand it over, item by item, out loud. And the promise isn’t that the situation resolves; it’s that something stands guard over your mind while it’s still unresolved.',q:'Name the one thing, in plain words, as if you were saying it to God.'},
  {r:'Psalm 23:4',t:'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me.',w:'Through the valley. Not around it. The psalm never promises the road avoids the dark place — it promises company inside it.',q:'What are you hoping to be rescued out of, that you may instead be walked through?'},
  {r:'Matthew 6:34',t:'Therefore do not be anxious about tomorrow, for tomorrow will be anxious for itself. Sufficient for the day is its own trouble.',w:'Almost all anxiety is time travel. Christ hands you a boundary you’re allowed to keep: today has enough in it. Tomorrow’s weight isn’t yours yet, and grace is issued daily, not in advance.',q:'What’s on today’s list that actually belongs to tomorrow? Put it down.'},
  {r:'1 Peter 5:6-7',t:'Humble yourselves, therefore, under the mighty hand of God, casting all your anxieties on him, because he cares for you.',w:'Cast is a violent word — you throw it, you don’t set it down politely. And the reason given isn’t that your worry is silly. The reason is that he cares.',q:'What would you have to stop holding for this to be a handover and not a loan?'},
  {r:'Isaiah 41:10',t:'Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.',w:'Four promises, all future tense: strengthen, help, uphold. God isn’t asking you to feel brave first. He’s telling you what he’ll be doing while you’re still afraid.',q:'Read it once more, slowly, with your own name after “fear not”.'},
  {r:'Mark 4:38-40',t:'Teacher, do you not care that we are perishing? … And he said to them, Why are you so afraid? Have you still no faith?',w:'They weren’t wrong that the boat was filling. They were wrong that they were alone in it. And notice he was asleep in the storm — the danger was real and he was still at rest.',q:'What are you convinced God has slept through?'},
  {r:'2 Timothy 1:7',t:'For God gave us a spirit not of fear but of power and love and self-control.',w:'Fear shrinks a life down to self-protection. What you were given instead is outward-facing: power to act, love to spend, self-control to hold a line. That’s the test of whether fear is running you — has it made you smaller?',q:'One thing fear has made you avoid this week. Do the smallest version of it today.'}],
 islam:[
  {r:'Qur’an 2:286',t:'Allah does not charge a soul except with that within its capacity.',w:'Read it as a promise about the load, not about the ease. Whatever has been placed on you was measured against what you were given to carry — the fear says otherwise, and the ayah answers it directly.',q:'What are you afraid you cannot carry? Say the ayah over it.'},
  {r:'Qur’an 13:28',t:'Those who have believed, and whose hearts are assured by the remembrance of Allah. Verily, in the remembrance of Allah do hearts find rest.',w:'The ayah names a mechanism, not a mood: dhikr settles the heart. It doesn’t say the fear is unfounded — it says there’s a place the heart goes and is quiet.',q:'One minute, SubhanAllah on the breath. Where is your heart after?'},
  {r:'Qur’an 94:5-6',t:'For indeed, with hardship will be ease. Indeed, with hardship will be ease.',w:'Said twice, which is emphasis, not repetition. And the word is with, not after — the ease is bound up inside the hardship, not waiting on the far side of it.',q:'Where is the ease already sitting inside this hard thing, if you look honestly?'},
  {r:'Qur’an 3:173',t:'Sufficient for us is Allah, and He is the best disposer of affairs.',w:'This was said by people who had just been told an army was gathering against them. It isn’t a denial of the threat; it’s a decision about where the outcome sits. What you can’t control has an Owner.',q:'What is the one part of this that is yours to do? Do that; hand the rest over.'},
  {r:'Qur’an 9:40',t:'Do not grieve; indeed, Allah is with us.',w:'Spoken in a cave, hidden, with the pursuers close enough to hear. The comfort wasn’t that they were safe — it was Who was with them in the narrow place.',q:'Where is your narrow place right now? Who is in it with you?'},
  {r:'Qur’an 20:46',t:'Fear not. Indeed, I am with you both; I hear and I see.',w:'Musa was sent to a tyrant and said plainly that he was afraid. The answer wasn’t “you are strong” — it was I hear, I see. Being heard and seen by Allah changes the size of the thing in front of you.',q:'Say the fear out loud in du’a, unedited. You are heard.'},
  {r:'Qur’an 65:3',t:'And whoever relies upon Allah — then He is sufficient for him.',w:'Tawakkul isn’t passivity; the camel is still tied. It’s doing your part and then refusing to carry the outcome, which was never your part.',q:'Name one thing you’ll do today, and one thing you’ll stop rehearsing.'}],
 hinduism:[
  {r:'Bhagavad Gita 2.11',t:'You grieve for those who should not be grieved for. The wise mourn neither for the living nor for the dead.',w:'Krishna doesn’t begin by comforting Arjuna — he begins by widening his view. Fear takes a slice of time and treats it as the whole. From the larger frame, most of what panics you is a change of form, not an ending.',q:'What are you treating as final that is actually a change?'},
  {r:'Bhagavad Gita 2.14',t:'The contacts of the senses with their objects give rise to cold and heat, pleasure and pain. They come and go; they are impermanent. Bear them patiently.',w:'Fear promises permanence. The Gita just reports the physics: sensation arrives, sensation leaves. Titikshasva — bear it — isn’t grim endurance; it’s discovering that you are the one watching the weather, not the weather.',q:'Time the feeling. How long does the sharpest part actually last?'},
  {r:'Bhagavad Gita 6.35',t:'The mind is restless and hard to restrain, but it is subdued by practice and by detachment.',w:'Two tools, neither of them willpower. Abhyasa is the repetition you return to daily; vairagya is loosening the grip on outcomes. A mind is not argued into steadiness — it is trained into it.',q:'What will your abhyasa be tomorrow morning, for five minutes?'},
  {r:'Bhagavad Gita 6.19',t:'As a lamp in a windless place does not flicker, so is the disciplined mind of one absorbed in the Self.',w:'Notice where the stillness comes from: not from the absence of wind outside, but from being sheltered. The practice builds the shelter. Fear is the flame reading every draught as its own end.',q:'Sit until the flame steadies, even a little. That is the whole task today.'},
  {r:'Bhagavad Gita 2.47',t:'You have a right to your work, but never to its fruits. Let not the fruit be your motive, nor withdraw from the work.',w:'Almost all fear lives in the fruit — the result, the verdict. Karma yoga cuts the cord between your action and your peace. You still act, fully; you simply stop paying rent on a future that hasn’t arrived.',q:'Do your part of this today, deliberately, without checking for the result.'},
  {r:'Bhagavad Gita 18.58',t:'Fixing your mind on Me, you shall by My grace cross over every difficulty.',w:'Cross over, not skirt around. The verse takes the obstacle seriously and still calls it crossable. What it asks is where the mind rests while you cross.',q:'What do you want your mind resting on when the hard hour comes?'},
  {r:'Bhagavad Gita 18.66',t:'Abandon all other supports and take refuge in Me alone. I shall free you; do not grieve.',w:'Sharanagati is the end of the arc: not one more technique, but setting the weight down at last. Ma shuchah — grieve not — is the last thing Krishna says on the matter.',q:'What are you still holding that you could hand over tonight?'}],
 buddhism:[
  {r:'Dhammapada 1',t:'All that we are arises with our thoughts. With our thoughts we make the world.',w:'The Dhammapada opens here for a reason. It isn’t saying your fear is imaginary — it’s saying the mind that met the event is part of the event. That is the only part you can train.',q:'What did your mind add to today’s facts?'},
  {r:'Dhammapada 216',t:'From craving springs grief, from craving springs fear. For one wholly freed from craving there is no grief, and no fear.',w:'Look for what the fear is guarding. Under nearly every fear is a wanting — that this must not be lost, that this must go my way. Not that you shouldn’t care; that clinging is the machinery.',q:'What am I holding so tightly that losing it became terrifying?'},
  {r:'Dhammapada 277',t:'All conditioned things are impermanent. One who sees this wearies of suffering.',w:'Anicca isn’t consolation, it’s observation — and it cuts both ways. The good passes, and so does this. Fear survives on the assumption that this state is where you now permanently live.',q:'Watch one wave of fear from arising to fading, without moving.'},
  {r:'Dhammapada 33',t:'The flickering, fickle mind, hard to guard, hard to check — the wise straighten it as a fletcher straightens an arrow.',w:'A crooked arrow isn’t scolded, it’s worked. Straightening is patient, repeated, unemotional. Bring the hands of a craftsman to your own mind.',q:'What is the one bend in your thinking that keeps recurring?'},
  {r:'Dhammapada 35',t:'The mind is hard to check, swift, and flits wherever it wills. To tame the mind is good; a tamed mind brings happiness.',w:'The promise is modest and testable: a trained mind is a happier place to live. Not fearless — trained. You aren’t failing because it still runs. You’d only be failing if you stopped bringing it back.',q:'Ten breaths. Every time it leaves, bring it back — the returning is the practice.'},
  {r:'Dhammapada 81',t:'As a solid rock is unshaken by the wind, so the wise are unshaken by praise or blame.',w:'Much of what we call fear is fear of the verdict — being judged, exposed, found wanting. The rock isn’t unshaken because it’s loved. It’s unshaken because it no longer needs the wind’s approval.',q:'Whose opinion is doing most of the frightening? What if it were simply weather?'},
  {r:'Dhammapada 348',t:'Let go of the past, let go of the future, let go of the present, and cross over to the further shore.',w:'The whole path in one line, and it isn’t about detaching from your life — it’s about stopping the grip. Fear is grip. Crossing begins with an open hand.',q:'One thing to set down before you sleep. Say it, then put the phone down.'}],
 secular:[
  {r:'Epictetus, Enchiridion 5',t:'Men are disturbed not by things, but by the views which they take of things.',w:'This is the oldest cognitive insight we have, and modern therapy essentially rediscovered it. Between the event and your dread sits a judgement — and the judgement is the part with a handle on it.',q:'Write the event in one sentence with no adjectives. Then write what you added.'},
  {r:'Seneca, Letters 13.4',t:'There are more things likely to frighten us than there are to crush us; we suffer more often in imagination than in reality.',w:'Seneca is doing arithmetic, not poetry. Count the catastrophes you’ve rehearsed against the ones that arrived. The ledger is comically lopsided — and the rehearsals cost real hours of your life.',q:'What have you already survived that you were certain you wouldn’t?'},
  {r:'Marcus Aurelius, Meditations 8.47',t:'If you are distressed by anything external, the pain is not due to the thing itself but to your own judgement of it — and this you have the power to revoke at any moment.',w:'At any moment is the operative phrase. He isn’t claiming it’s easy; he’s locating the switch. A man who ran an empire wrote this to himself at night, because he needed reminding too.',q:'Revoke one judgement today. Which one?'},
  {r:'Epictetus, Enchiridion 1',t:'Some things are in our control and others are not. In our control are opinion, impulse, desire, aversion; not in our control are the body, reputation, office.',w:'Draw the line and half of anxiety loses its funding. Most fear is effort spent on the far side of that line, where effort does nothing but exhaust you.',q:'Two columns — mine, not mine. Be ruthless. Then work only the left one.'},
  {r:'Marcus Aurelius, Meditations 8.36',t:'Do not let the general view of your whole life crush you. Do not gather up all the troubles that may come, but ask of each present thing: what is unbearable here?',w:'Fear works by aggregation — it hands you the sum of every hard hour at once. Taken apart, almost nothing in the present moment is unbearable. It’s the pile, and the pile is imaginary.',q:'Ask it literally: what in this hour is unbearable?'},
  {r:'Epictetus, Discourses 2.1',t:'It is not death or pain that is fearful, but the fear of death or pain.',w:'The dread is a separate object from the event, and it usually lasts far longer. This is why people say the waiting was the worst part. If the fear is the real problem, the fear is what you get to work on.',q:'Which are you actually suffering right now — the thing, or the waiting?'},
  {r:'Marcus Aurelius, Meditations 4.49',t:'Be like the rock that the waves keep crashing over. It stands unmoved, and the raging of the sea falls still around it.',w:'Not a fantasy of never being hit. A picture of taking the hit and staying where you are. That is all courage has ever been — built by small refusals to be moved, not by feeling different.',q:'Where will you stand today instead of moving?'}]}},
{ id:'pull', title:'The pull', short:'the pull', sub:'7 days · temptation, and becoming someone who can say no.', days:{
 christianity:[
  {r:'1 Corinthians 10:13',t:'No temptation has overtaken you that is not common to man. God is faithful, and he will not let you be tempted beyond your ability, but with the temptation will also provide the way of escape.',w:'Two things are promised, and neither is that you won’t be tempted: that it isn’t unique to you, and that there is a way out. Part of the work is looking for the exit early, while you can still see it.',q:'Where is the exit in your pattern — the last moment you could still turn?'},
  {r:'James 1:14-15',t:'Each person is tempted when he is lured and enticed by his own desire. Then desire when it has conceived gives birth to sin.',w:'James describes a sequence, not an ambush. There’s a gap between the lure and the birth, and everything you can do lives in that gap. Naming your own desire honestly isn’t shameful; it’s the first accurate map.',q:'What does yours actually promise you? Say the real want, not the behaviour.'},
  {r:'Genesis 4:7',t:'Sin is crouching at the door. Its desire is for you, but you must rule over it.',w:'Said to Cain before he did anything — at the door, while it was still outside. And the word isn’t resist harder, it’s rule. You’re addressed as someone with authority here.',q:'What’s at your door today, and what time does it usually knock?'},
  {r:'Matthew 26:41',t:'Watch and pray that you may not enter into temptation. The spirit indeed is willing, but the flesh is weak.',w:'Watch comes first: know the hour, know the setup. Christ says this to men who genuinely loved him and still fell asleep — willingness was never the missing piece.',q:'What is your weak hour? Put something in it before it arrives.'},
  {r:'Romans 7:15, 24-25',t:'I do not do what I want, but the very thing I hate … Wretched man that I am! Who will deliver me? Thanks be to God through Jesus Christ our Lord.',w:'This is Paul, mid-ministry, describing the split you thought disqualified you. It doesn’t end in despair, and it doesn’t end in self-improvement either. It ends in a Person.',q:'Where have you been trying to be your own deliverer?'},
  {r:'Galatians 5:16',t:'Walk by the Spirit, and you will not gratify the desires of the flesh.',w:'The instruction is a direction, not a prohibition. You don’t empty the appetite by staring at it; you occupy the life with something better and truer.',q:'What good thing will you walk toward tonight, in the hour you’d usually fall?'},
  {r:'Hebrews 4:15-16',t:'We do not have a high priest who is unable to sympathise with our weaknesses, but one who in every respect has been tempted as we are, yet without sin. Let us then with confidence draw near to the throne of grace.',w:'With confidence — after a week of thinking about your worst pull. The One you approach knows the pull from the inside, which is why shame has no argument here.',q:'Draw near now, as you are, without cleaning yourself up first.'}],
 islam:[
  {r:'Qur’an 12:53',t:'Indeed, the soul is a persistent enjoiner of evil, except those upon whom my Lord has mercy.',w:'Yusuf says this at the height of his vindication, about himself. That isn’t self-hatred; it’s realism about the nafs — and realism protects you. A man who thinks he is past the pull doesn’t guard against it.',q:'Where have you assumed you’re past this? Guard there.'},
  {r:'Qur’an 24:30-31',t:'Tell the believing men to lower their gaze and guard themselves … and tell the believing women to lower their gaze and guard themselves.',w:'The command lands before the act, at the glance — because that’s where it’s still cheap. Ghadd al-basar isn’t prudishness; it’s the recognition that the eye feeds the heart.',q:'What is your first look, each day? Cut it there.'},
  {r:'Qur’an 7:200',t:'And if an evil suggestion comes to you from Satan, then seek refuge in Allah. Indeed, He is Hearing and Knowing.',w:'A waswasa isn’t a verdict on your character; it’s traffic. And the instruction is astonishingly practical — don’t debate it, relocate. Say a’udhu billah and move your body.',q:'Practise it once now, out loud, before you need it.'},
  {r:'Qur’an 29:69',t:'And those who strive for Us — We will surely guide them to Our ways.',w:'The guidance follows the striving, not the other way round. Mujahada is the effort you make while still unsure it’s working, and the ayah promises the effort itself is met.',q:'One act of striving today that costs you something real.'},
  {r:'Qur’an 13:11',t:'Indeed, Allah will not change the condition of a people until they change what is in themselves.',w:'The order matters, and it isn’t harsh — it’s dignifying. You aren’t waiting to be rescued from your habit; you’re being told your move counts.',q:'One thing in yourself, today. Not the whole self.'},
  {r:'Qur’an 79:40-41',t:'But as for he who feared the position of his Lord and restrained his soul from unlawful inclination — Paradise will be his refuge.',w:'Restraining the nafs is named here as the achievement. The Qur’an doesn’t treat your resistance as a small private matter; it treats it as the thing a life turns on.',q:'Name the last time you restrained it. That counted.'},
  {r:'Qur’an 39:53',t:'Say: O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, He forgives all sins.',w:'The week ends here on purpose, because despair is the second trap and it takes more people than the first. Tawba isn’t a limited offer you’ve exhausted; the door is wider than your record.',q:'If you fell today, what’s the next right act? Do that, not the punishing.'}],
 hinduism:[
  {r:'Bhagavad Gita 3.37',t:'It is desire, it is anger, born of rajas — all-devouring and most sinful. Know this to be the enemy here.',w:'Krishna names it as an enemy, not as you. That distinction is the whole practice: the craving is a force moving through the system, and you are the one who gets to see it as such.',q:'Say it as weather — desire is arising. Watch what changes.'},
  {r:'Bhagavad Gita 2.62-63',t:'Dwelling on objects breeds attachment; from attachment, desire; from desire, anger; from anger, delusion; from delusion, loss of memory; and from that, ruin.',w:'This is a mechanism diagram, and it starts with dwelling — the looking, the lingering, the scroll. Every stage after that is harder to interrupt than the one before.',q:'Where in the chain do you usually notice? Move one step earlier.'},
  {r:'Bhagavad Gita 5.22',t:'The pleasures born of contact with the senses are wombs of pain. The wise take no delight in them.',w:'Not a condemnation of pleasure but an honest cost accounting. And notice the Gita asks you to become someone who genuinely sees the pain in it — not someone gritting their teeth against something they still believe is good.',q:'Recall the hour after, honestly. Was it as promised?'},
  {r:'Bhagavad Gita 6.5-6',t:'Lift yourself by your own self; do not degrade yourself. For the self is a friend to one who has conquered it, and an enemy to one who has not.',w:'The same self, two roles, decided by practice. This is the most encouraging line in the Gita for anyone inside a habit: the material you’re working with is the material that will help you.',q:'One act today that makes your own self an ally tomorrow.'},
  {r:'Bhagavad Gita 6.26',t:'Whenever the restless mind wanders away, draw it back and fix it again on the Self.',w:'Whenever — not if, and not once. The instruction contains the expectation of repeated failure and doesn’t treat it as failure at all. Bringing it back is the yoga.',q:'How many times can you bring it back today without one word of self-blame?'},
  {r:'Bhagavad Gita 3.42-43',t:'The senses are subtle; subtler than the senses is the mind; subtler than mind, the intellect; and subtler still is the Self. Knowing this, restrain the lower by the higher.',w:'A hierarchy you can actually use: you don’t fight a craving on its own level, you meet it from a higher one. Sit still, become the one watching, and the pull loses its authority.',q:'From where are you meeting this — the senses, or the seer?'},
  {r:'Bhagavad Gita 2.70',t:'As the ocean is not disturbed by the rivers pouring into it, so is the one whom desires enter and who abides in peace.',w:'Not a man with no rivers. A man large enough that they no longer change him. This is what practice is quietly building while you feel nothing changing.',q:'Where have you already become bigger than something that used to move you?'}],
 buddhism:[
  {r:'Dhammapada 326',t:'Formerly this mind wandered as it liked, where it wished, as it pleased. Today I shall hold it in check, as a rider holds a rutting elephant.',w:'Honest about the force involved — an elephant in rut isn’t talked down. And honest about your position: you are the rider, not the elephant, however loud it gets.',q:'Which is speaking right now, the rider or the elephant?'},
  {r:'Dhammapada 338',t:'As a felled tree grows again if its root is unharmed, so suffering returns again and again while the root of craving is untouched.',w:'This explains why cutting the behaviour alone keeps failing. The visible branch isn’t the problem; the root is what gets watered every time you feed the wanting.',q:'What feeds the root in your day, hours before the branch appears?'},
  {r:'Dhammapada 336',t:'Whoever overcomes this craving, so hard to overcome, from him sorrow falls away like water from a lotus leaf.',w:'Hard to overcome is stated plainly — the text never pretends otherwise. But look at the image: not a scrubbed leaf, a leaf water cannot stick to. Freedom is a change in what adheres to you.',q:'What has already stopped sticking, compared to a year ago?'},
  {r:'Dhammapada 80',t:'Irrigators guide the water; fletchers shape the shaft; carpenters shape the wood; the wise master themselves.',w:'Three trades, one point: mastery is craft, not temperament. Nobody expects a fletcher to straighten an arrow by wanting it straight.',q:'What is the tool you will actually pick up today?'},
  {r:'Dhammapada 103',t:'Better than conquering a thousand men in battle is conquering oneself. He is the greatest of conquerors.',w:'The scale is deliberately absurd, because the private victory nobody saw last night is genuinely larger than the public one. Don’t let the smallness of the moment fool you about the size of the work.',q:'Name last night’s unseen victory. Count it.'},
  {r:'Dhammapada 121',t:'Think not lightly of evil, saying it will not come near me. Drop by drop the water-pot is filled.',w:'And the very next verse says the same of good. Nothing you did today felt decisive — which is exactly how both directions accumulate.',q:'Which pot did today’s drops go into?'},
  {r:'Dhammapada 205',t:'Having tasted the sweetness of solitude and of stillness, one is freed from sorrow and from wrong.',w:'This is the part most attempts at self-control skip: something has to taste better. Stillness isn’t the punishment that replaces the pleasure — trained a little, it becomes the sweeter thing.',q:'Sit for three minutes. Is there anything here worth staying for?'}],
 secular:[
  {r:'Epictetus, Enchiridion 34',t:'When you are struck by the appearance of any pleasure, do not be carried away by it; let the thing wait for you. Then compare the time of enjoyment with the time you will afterwards repent.',w:'Two moves, both mechanical: insert delay, then run the tape forward. He isn’t asking you to be virtuous in the moment — only to be slow, and honest about the hour after.',q:'Let it wait ten minutes. Write what you predict you’ll feel at 11pm.'},
  {r:'Marcus Aurelius, Meditations 9.7',t:'Wipe out imagination. Check impulse. Quench appetite. Keep the governing self in its own power.',w:'Four short orders, in the order things actually happen — the picture comes first, then the impulse, then the appetite. Interrupt at the picture and the rest never assembles.',q:'What image starts it for you? Name it, then stop feeding it.'},
  {r:'Epictetus, Discourses 2.18',t:'Every habit and faculty is confirmed and strengthened by the corresponding acts. If you would not be angry, do not feed the habit; give it nothing to help its increase.',w:'The clearest ancient statement of what we now call reinforcement. Each act is a vote. Today you aren’t deciding one evening — you’re adjusting the odds of every evening after it.',q:'Which habit did today strengthen?'},
  {r:'Seneca, Letters 18',t:'Set aside a number of days on which you will be content with the scantiest fare … so that you may ask yourself whether this is really the thing you feared.',w:'Voluntary discomfort, chosen while calm, on purpose. Seneca’s point is that you meet the deprivation once on your own terms, and it stops holding a knife to your throat afterwards.',q:'Choose one small comfort to go without tomorrow. Deliberately, not as punishment.'},
  {r:'Marcus Aurelius, Meditations 5.1',t:'At dawn, when you have trouble getting out of bed, tell yourself: I have to go to work — as a human being. What do I have to complain of, if I am going to do what I was born for?',w:'An emperor negotiating with his own bedsheets is oddly reassuring. And notice the argument he uses on himself: not discipline. Identity, and purpose.',q:'What were you made for, that this pull keeps costing you?'},
  {r:'Seneca, On Anger 3.36',t:'I examine my whole day and go back over what I have done and said, hiding nothing from myself, passing nothing by.',w:'A nightly audit with no punishment attached — he calls himself to account, then sleeps. That combination, honesty plus no self-flagellation, is what makes it repeatable.',q:'Review today plainly: what happened, what set it off, what worked. No verdict.'},
  {r:'Epictetus, Enchiridion 51',t:'How long will you wait before you demand the best of yourself? Let whatever appears to be best be to you an inviolable law.',w:'The week ends with a demand rather than a comfort, and it’s meant kindly. Some version of you already knows what the rule should be. The only question is whether it’s a rule or a preference.',q:'Write the one rule. Make it a law, not a hope.'}]}},
{ id:'again', title:'Starting again', short:'starting again', sub:'5 days · for the morning after. A lapse is feedback, not a verdict.', days:{
 christianity:[
  {r:'Lamentations 3:22-23',t:'The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.',w:'Written from rubble, by a man watching a city burn — this isn’t a cheerful verse, it’s a defiant one. New every morning means the supply wasn’t reduced by yesterday.',q:'What did you think you had used up?'},
  {r:'Proverbs 24:16',t:'The righteous falls seven times and rises again, but the wicked stumble in times of calamity.',w:'Notice that the righteous man in this proverb falls — repeatedly. The line between the two isn’t the falling. It’s the getting up.',q:'What is the smallest possible act of rising today?'},
  {r:'Luke 15:20',t:'But while he was still a long way off, his father saw him and felt compassion, and ran and embraced him and kissed him.',w:'The son had a speech prepared; he barely got through it. The father was already watching the road, and ran — which no dignified man of that culture did.',q:'What speech are you rehearsing that God isn’t waiting to hear?'},
  {r:'Psalm 51:10-12',t:'Create in me a clean heart, O God, and renew a right spirit within me. Restore to me the joy of your salvation.',w:'David doesn’t ask to feel better; he asks to be remade, and specifically for the joy to come back. Ask for the same. A restart with no joy in it won’t last a fortnight.',q:'Pray those two lines slowly, as your own words.'},
  {r:'Philippians 3:13-14',t:'Forgetting what lies behind and straining forward to what lies ahead, I press on toward the goal.',w:'Forgetting here isn’t amnesia; it’s refusing to live there. Paul had a real past and chose to face the other way — a decision that’s available to you this morning.',q:'What is the one thing forward you can press toward today?'}],
 islam:[
  {r:'Qur’an 39:53',t:'Say: O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, He forgives all sins.',w:'Notice who’s being addressed — those who have transgressed are still called My servants. Despair is the trap that follows the slip, and it’s the more dangerous of the two.',q:'What has despair been telling you that this ayah contradicts?'},
  {r:'Qur’an 2:222',t:'Indeed, Allah loves those who turn to Him in repentance and those who purify themselves.',w:'Loves the tawwabin — the ones who keep returning, plural and repeated. Your return isn’t tolerated. It is what is loved.',q:'Return now, in your own words. That is the whole act.'},
  {r:'Qur’an 3:135',t:'And those who, when they commit an immorality or wrong themselves, remember Allah and seek forgiveness — and who forgives sins except Allah?',w:'The believer described here isn’t the one who never fell; he’s the one who remembers quickly. Speed of return, not spotlessness, is the marker.',q:'How long did it take you to turn back last time? Shorten it.'},
  {r:'Qur’an 25:70',t:'Except for those who repent, believe and do righteous work — for them Allah will replace their evil deeds with good.',w:'Replace, not merely erase. The Qur’an describes a trade so generous it’s hard to read soberly: the record itself is changed by what you do next.',q:'One righteous work today, in place of what happened. Name it and do it.'},
  {r:'Qur’an 11:114',t:'Indeed, good deeds do away with misdeeds. That is a reminder for those who remember.',w:'A practical instruction to follow a fall with an act, not a mood. Do the next good thing immediately — that is how ground is retaken.',q:'What is the next good thing, in the next hour?'}],
 hinduism:[
  {r:'Bhagavad Gita 9.30-31',t:'Even if one of most sinful conduct worships Me with undivided devotion, he is to be considered righteous, for he has rightly resolved. He will swiftly become holy.',w:'The verse turns on resolve, not on record. In the Gita’s view your direction of travel matters more than the distance you’ve already covered.',q:'State your resolve in one plain sentence.'},
  {r:'Bhagavad Gita 4.36',t:'Even if you were the most sinful of all sinners, you would cross the ocean of sin by the raft of knowledge.',w:'The raft is knowledge — seeing clearly what happened and why. Which means the honest look at last night isn’t the punishment. It’s the vessel.',q:'What did you actually learn from it? Write it as information.'},
  {r:'Bhagavad Gita 2.40',t:'In this path no effort is wasted and no obstacle prevails. Even a little effort toward spiritual life protects you.',w:'Nothing you did before the slip was deleted by it. This is scripture’s clearest answer to the feeling of being back at zero: there is no zero here.',q:'Name three things from the last month that still stand.'},
  {r:'Bhagavad Gita 12.9-10',t:'If you cannot fix your mind steadily on Me, then seek to reach Me by the practice of yoga. If you are unable even to practise, then work for My sake.',w:'Krishna walks down the ladder until he finds a rung you can actually reach. Start where you honestly are today, not where you were on your best week.',q:'Which rung can you stand on today? Take that one.'},
  {r:'Bhagavad Gita 6.40',t:'No one who does good comes to an evil end.',w:'Said plainly, with no conditions attached. The good you do now goes somewhere, even when today feels like it undid everything.',q:'One good act, offered without needing to feel better first.'}],
 buddhism:[
  {r:'Dhammapada 172',t:'Whoever was formerly heedless and afterwards becomes heedful brightens the world, like the moon emerging from cloud.',w:'The image gives the cloud its due and still says the moon was never diminished. Heedfulness resumed is not a lesser state than heedfulness unbroken.',q:'What does becoming heedful look like in the next ten minutes?'},
  {r:'Dhammapada 173',t:'Whoever covers over an ill deed with what is skilful brightens the world, like the moon emerging from cloud.',w:'Covers over, in the sense of overlaying with action — not hiding. The remedy prescribed is skilful conduct now, and no self-punishment appears anywhere in the verse.',q:'What skilful thing will you lay over yesterday?'},
  {r:'Dhammapada 116',t:'Make haste in doing good; restrain the mind from wrong. Whoever is slow in doing good, his mind delights in wrong.',w:'The urgency is about the gap. Wrong doesn’t need to be invited in — it moves into empty time. Fill the next hour rather than adjudicating the last one.',q:'What good thing can start within the hour?'},
  {r:'Dhammapada 25',t:'By effort, heedfulness, restraint and self-mastery, let the wise build an island no flood can overwhelm.',w:'An island is built, load by load, in advance of the flood. What you construct in ordinary hours is what stands when the next wave comes.',q:'What is one load you can add to the island today?'},
  {r:'Dhammapada 160',t:'By oneself is one’s refuge. Who else could it be? By a well-controlled self one finds a refuge hard to find.',w:'Not a lonely teaching but a dignifying one: the refuge is being built by you, out of ordinary restraint. Nobody is coming to do it — and nobody can take it from you either.',q:'What would a person building a refuge do tonight?'}],
 secular:[
  {r:'Marcus Aurelius, Meditations 5.9',t:'Do not be disgusted, do not give up, do not despair, if acting rightly is not continuous. After a fall, return to it again.',w:'He wrote this to himself, which means he needed it. The instruction is a loop, not a straight line — the return is the practice, and the fall is assumed.',q:'Return now. What is the next right action, this hour?'},
  {r:'Marcus Aurelius, Meditations 10.16',t:'Waste no more time arguing about what a good man should be. Be one.',w:'The morning after generates enormous amounts of talk — about your character, your history, whether you’re the kind of person who can do this. He cuts it all off. Be one, now, in some small way.',q:'Stop the argument. What is the action?'},
  {r:'Seneca, Letters 27',t:'I am not so shameless as to undertake to cure my fellow-men when I am ill myself. I am discussing with you troubles which concern us both, and sharing the remedy, just as if we were lying ill in the same hospital.',w:'The man who wrote the letters on self-mastery openly said he hadn’t mastered himself. Whatever you feel this morning isn’t disqualification. It’s the ordinary condition of anyone doing this work.',q:'Say it to one real person today — as a fellow patient, not a failure.'},
  {r:'Marcus Aurelius, Meditations 6.21',t:'If anyone can prove and show me that I do not think or act rightly, I will gladly change; for I seek the truth, by which no one was ever harmed.',w:'A slip is the clearest evidence you’ll get about what your plan can’t yet handle. Treat it as data handed to you, and change the plan rather than the self-assessment.',q:'What exactly did the plan fail to cover? Patch that one hole.'},
  {r:'Marcus Aurelius, Meditations 2.5',t:'Do every act as if it were your last, free from all inattention … concentrate on what is before you.',w:'The restart doesn’t need a new identity, or a Monday. It needs the next act, done properly, with attention.',q:'Name the next act. Do it well.'}]}}
];

// State: {planId:{d:<index of the day to resume>, tr:tradition, ts:iso, done:bool}}. A position,
// not a score — no streak, no percentage, nothing decays if you leave it for a month.
function _plans(){ try{ return ls('totry_read_plans')||{}; }catch(_){ return {}; } }
function _plansSave(o){ try{ ls('totry_read_plans',o); }catch(_){} }
function _planById(id){ for(let i=0;i<READING_PLANS.length;i++){ if(READING_PLANS[i].id===id) return READING_PLANS[i]; } return null; }
function _planDays(p){ try{ const t=faithTradition(); return (p&&p.days&&(p.days[t]||p.days.christianity))||[]; }catch(_){ return []; } }
function _planClamp(i,n){ return Math.max(0,Math.min(i,n-1)); }
// The resume line the Soul card wears. Empty unless something is genuinely in progress.
function planLastLine(){
  try{
    const st=_plans(); let best=null;
    READING_PLANS.forEach(function(p){ const s=st[p.id]; if(!s||s.done||!(s.d>0)) return; if(!best||String(s.ts||'')>String(best.s.ts||'')) best={p:p,s:s}; });
    if(!best) return '';
    const n=_planDays(best.p).length; if(!n) return '';
    return best.p.title+' \u2014 day '+Math.min((best.s.d||0)+1,n)+' of '+n;
  }catch(_){ return ''; }
}
function openPlans(){ if(typeof go==='function') go('plans'); renderPlans(); }
function renderPlans(){
  const el=document.getElementById('plans-content'); if(!el) return;
  const f=curFaith(), t=faithTradition(), st=_plans();
  let h='<div style="text-align:center;margin-bottom:16px"><div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:var(--tx3)">Guided reading</div>'+
    '<h2 style="font-family:Cormorant Garamond,serif;font-size:27px;font-weight:300;color:var(--tx);margin:6px 0 8px">Short plans</h2>'+
    '<p style="font-size:12.5px;color:var(--tx3);line-height:1.65;max-width:330px;margin:0 auto">Five to seven days on one thing you’re actually carrying. Finishable \u2014 not a year-long debt. Miss a week and nothing is lost; you pick up where you left off.</p></div>';
  READING_PLANS.forEach(function(p){
    const days=_planDays(p), n=days.length; if(!n) return;
    const s=st[p.id]||null, d=s&&typeof s.d==='number'?_planClamp(s.d,n):0;
    const line=(s&&s.done)?'Finished \u00B7 read it again any time':(d>0?'Day '+(d+1)+' of '+n+' \u00B7 whenever you’re ready':n+' days');
    h+='<div class="card" onclick="openPlan(\''+p.id+'\')" style="cursor:pointer;margin-bottom:10px">'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--go);margin-bottom:7px">'+line+'</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:21px;color:var(--tx);line-height:1.25;margin-bottom:5px">'+p.title+'</div>'+
      '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6">'+p.sub+'</div>'+
      '<div style="font-size:12.5px;color:var(--go);margin-top:10px">'+((s&&!s.done&&d>0)?'Continue':'Begin')+' \u203A</div></div>';
  });
  h+='<p style="font-size:11.5px;color:var(--tx3);font-style:italic;line-height:1.65;text-align:center;margin:16px 8px 4px">Written for your path \u2014 '+f.label+' \u2014 not translated from someone else’s. Every passage is here even with no signal'+((t==='islam'||t==='hinduism')?', and you can open the full '+f.bookShort+' from any day':'')+'. No streaks, no percentage: a plan is a door, not a scoreboard.</p>';
  el.innerHTML=h;
}
function openPlan(id){
  const p=_planById(id); if(!p) return;
  if(typeof go==='function') go('plans');
  const n=_planDays(p).length, s=_plans()[id];
  renderPlanDay(id, s&&typeof s.d==='number'?_planClamp(s.d,n):0);
}
function renderPlanDay(id,i){
  const el=document.getElementById('plans-content'); if(!el) return;
  const p=_planById(id); if(!p) return;
  const days=_planDays(p);
  if(!days.length){ el.innerHTML=_readErr('This plan isn’t written for your path yet.'); return; }
  i=_planClamp(i,days.length);
  const day=days[i], t=faithTradition(), s=_plans()[id]||{};
  // Derived from the registry rather than a hardcoded list of three. The button was hidden entirely for
  // Buddhism and Secular — so someone reading a plan day had no way through to the Dhammapada or the
  // Stoics, even though openReader() serves both. Every tradition has a bookName; use it.
  const readLbl = (function(){ try{ const bn=(FAITHS[t]||curFaith()).bookName; return bn?('Open it in '+bn):''; }catch(_){ return ''; } })();
  let h='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px">'+
    '<button class="btn" onclick="renderPlans()" style="width:auto;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px;padding:7px 11px">\u2039 Plans</button>'+
    '<div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--tx3)">Day '+(i+1)+' of '+days.length+'</div></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-weight:300;color:var(--tx);line-height:1.25;margin-bottom:12px">'+p.title+'</div>'+
    '<div class="card" style="border-color:var(--go-bd);background:linear-gradient(135deg,rgba(200,169,110,0.08),rgba(140,107,182,0.04));padding:22px 18px;margin-bottom:12px">'+
      '<div id="plan-day-text" style="font-family:Cormorant Garamond,serif;font-size:19px;font-style:italic;line-height:1.7;color:var(--tx)">\u201C'+day.t+'\u201D</div>'+
      '<div id="plan-day-ref" style="font-size:12px;color:var(--go);margin-top:11px">\u2014 '+day.r+'</div>'+
      // Hallow's whole reason to exist is that you can LISTEN to it, and this was the one surface
      // in Soul with a passage on it and no way to hear it — or to send it to anyone. The component
      // that puts both on the morning verse works here unchanged.
      ((typeof _verseToolsHTML==='function')?_verseToolsHTML('plan-day-text','plan-day-ref'):'')+'</div>'+
    '<div class="card" style="margin-bottom:12px"><div style="font-size:14px;line-height:1.8;color:var(--tx2)">'+day.w+'</div></div>'+
    '<div class="card" style="margin-bottom:12px"><div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--tx3);margin-bottom:9px">One question</div>'+
      '<div style="font-size:15px;line-height:1.7;color:var(--tx);margin-bottom:13px">'+day.q+'</div>'+
      '<button class="btn" onclick="_planAnswer(\''+id+'\','+i+')" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:13px">Write your answer</button></div>'+
    '<button class="btn primary" onclick="_planDone(\''+id+'\','+i+')" style="margin-bottom:8px">That’s today</button>'+
    '<div style="display:flex;gap:8px;margin-bottom:8px">'+
      (readLbl?'<button class="btn" onclick="_planOpenFull(\''+id+'\','+i+')" style="flex:1;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px">'+readLbl+'</button>':'')+
      '<button class="btn" onclick="_planCarry(\''+id+'\','+i+')" style="flex:1;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px">Carry this passage</button></div>';
  const seen=Math.max(typeof s.d==='number'?s.d:0, i);
  let nav='';
  if(i>0) nav+='<button class="btn" onclick="renderPlanDay(\''+id+'\','+(i-1)+')" style="flex:1;background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12px">\u2039 Day '+i+'</button>';
  if(i<days.length-1 && i<seen) nav+='<button class="btn" onclick="renderPlanDay(\''+id+'\','+(i+1)+')" style="flex:1;background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12px">Day '+(i+2)+' \u203A</button>';
  if(s.done) nav+='<button class="btn" onclick="_planRestart(\''+id+'\')" style="flex:1;background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12px">Read it again</button>';
  if(nav) h+='<div style="display:flex;gap:8px;margin-top:4px">'+nav+'</div>';
  h+='<p style="font-size:11.5px;color:var(--tx3);font-style:italic;line-height:1.65;text-align:center;margin:16px 10px 4px">One day at a time is the whole design. Come back tomorrow, or in a fortnight \u2014 day '+(i+1)+' will still be here.</p>';
  el.innerHTML=h;
  try{ const tab=document.getElementById('tab-plans'); if(tab) tab.scrollTop=0; }catch(_){}
}
function _planDone(id,i){
  const p=_planById(id); if(!p) return;
  const days=_planDays(p); if(!days.length) return;
  const st=_plans(), s=st[id]||{}, next=i+1, fin=next>=days.length;
  s.d=fin?days.length-1:Math.max(typeof s.d==='number'?s.d:0,next);
  s.tr=faithTradition(); s.ts=new Date().toISOString(); if(fin) s.done=true;
  st[id]=s; _plansSave(st);
  haptic('success');
  if(typeof applyFaithLabels==='function') applyFaithLabels();
  _planClose(id,i,fin);
}
function _planClose(id,i,finished){
  const el=document.getElementById('plans-content'); if(!el) return;
  const p=_planById(id); if(!p) return;
  const days=_planDays(p), f=curFaith(), t=faithTradition();
  const beyond={christianity:'a priest, or one person who’ll pray it with you',islam:'your imam, or one person who’ll make du’a with you',hinduism:'a teacher, or one person who’ll sit with you',buddhism:'a teacher, or a sangha \u2014 someone further down the path',secular:'one person who’ll actually hear it \u2014 a friend, or a counsellor'}[t]||'one person who’ll actually hear it';
  let h='<div style="text-align:center;padding:14px 4px 0">';
  if(finished){
    h+='<div style="font-size:26px;margin-bottom:12px">\u{1F54A}\uFE0F</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:26px;font-weight:300;color:var(--tx);line-height:1.3;margin-bottom:12px">You finished it.</div>'+
      '<div style="font-size:14px;color:var(--tx2);line-height:1.75;max-width:330px;margin:0 auto 16px">'+days.length+' days on '+p.short+'. No badge for this, and no streak \u2014 you simply sat with '+f.wordWord+' on '+days.length+' days and let it work on you. That’s a different kind of thing.</div>'+
      '<div class="card" style="text-align:left;margin-bottom:14px"><div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--tx3);margin-bottom:8px">Now take it past the app</div>'+
      '<div style="font-size:13.5px;color:var(--tx2);line-height:1.75">The reading did part of the work. The rest happens with '+beyond+'. Say one thing out loud this week that you only wrote down in here.</div></div>';
  } else {
    h+='<div style="font-family:Cormorant Garamond,serif;font-size:25px;font-weight:300;color:var(--tx);line-height:1.3;margin-bottom:12px">That’s today.</div>'+
      '<div style="font-size:14px;color:var(--tx2);line-height:1.75;max-width:330px;margin:0 auto 18px">Day '+(i+2)+' of '+days.length+' is there whenever you’re ready \u2014 tomorrow, or next week. Nothing resets, and nothing is lost if you leave it a while.</div>';
  }
  h+='<button class="btn primary" onclick="theRelease({did:\'You sat with the reading and answered it honestly. That was the work.\'})" style="margin-bottom:8px">Put it down and carry it</button>'+
    '<button class="btn" onclick="renderPlans()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:13px">Back to the plans</button></div>';
  el.innerHTML=h;
}
function _planRestart(id){
  const st=_plans(); st[id]={d:0,tr:faithTradition(),ts:new Date().toISOString(),done:false}; _plansSave(st);
  haptic('tap'); if(typeof applyFaithLabels==='function') applyFaithLabels(); renderPlanDay(id,0);
}
// The question, answered into the real journal (so the weekly review and the AI see it).
function _planAnswer(id,i){
  const p=_planById(id); if(!p) return;
  const days=_planDays(p); if(!days.length) return;
  i=_planClamp(i,days.length); const day=days[i];
  const m=document.createElement('div'); m.className='modal-bg open';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--tx3);margin-bottom:9px">'+p.title+' \u00B7 day '+(i+1)+'</div>'+
    '<div style="font-size:15.5px;color:var(--tx);line-height:1.65;margin-bottom:5px">'+day.q+'</div>'+
    '<div style="font-size:11.5px;color:var(--tx3);margin-bottom:13px">'+day.r+'</div>'+
    '<textarea id="plan-answer" placeholder="However it comes out. Nobody reads this but you." style="height:130px;resize:none;font-size:16px;line-height:1.6;margin-bottom:12px"></textarea>'+
    '<button class="btn primary" onclick="_planAnswerSave(\''+id+'\','+i+',this)" style="margin-bottom:8px">Keep it in my journal</button>'+
    '<button class="btn" onclick="closeModal(this)">Not now</button></div>';
  document.body.appendChild(m);
  setTimeout(function(){ const ta=document.getElementById('plan-answer'); if(ta) ta.focus(); },120);
}
function _planAnswerSave(id,i,btn){
  const ta=document.getElementById('plan-answer'), txt=ta?ta.value.trim():'';
  if(!txt){ showToast('Nothing kept yet','Write one line \u2014 even a short one.'); return; }
  // Prompted with "However it comes out. Nobody reads this but you." \u2014 an explicit invitation to
  // say the hardest thing, right after a scripture reflection, and it had no gate either.
  const _paCrisis = journalCrisisOf(txt);
  const p=_planById(id), days=p?_planDays(p):[], day=days.length?days[_planClamp(i,days.length)]:{q:'',r:''};
  const entries=ls('totry_journal')||[];
  entries.unshift({ date:new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'short',year:'numeric'}),
    ts:new Date().toISOString(), day:(typeof getDayCount==='function')?getDayCount():null,
    text:day.q+'\n\n'+txt, flagged:!!_paCrisis, plan:(p?p.title:''), planRef:day.r });
  ls('totry_journal', entries.slice(0,1200));
  if(typeof renderJournal==='function'){ try{ renderJournal(); }catch(_){} }
  if(btn) closeModal(btn);
  if(journalMeetCrisis(_paCrisis)) return;
  haptic('success'); showToast('Kept','In your journal, with the passage.');
}
// Carry = the existing saved-passages shelf (totry_sv), same shape the Bible reader writes.
function _planCarry(id,i){
  const p=_planById(id); if(!p) return;
  const days=_planDays(p); if(!days.length) return;
  const day=days[_planClamp(i,days.length)], saved=ls('totry_sv')||[];
  if(!saved.some(function(v){ return v&&v.verse===day.t; })){
    saved.unshift({verse:day.t, reference:day.r, date:new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'})});
    ls('totry_sv', saved.slice(0,200));
    if(typeof renderSavedVerses==='function'){ try{ renderSavedVerses(); }catch(_){} }
  }
  haptic('light'); showToast('Carried', day.r+' is with your saved passages.');
}
// Deeper look: hand the day's reference to the reader that already exists, at that exact place.
function _planOpenFull(id,i){
  const t=faithTradition();
  if(t==='christianity'){ if(typeof go==='function') go('bible'); return; }
  const p=_planById(id), days=p?_planDays(p):[];
  const ref=days.length?String(days[_planClamp(i,days.length)].r||''):'';
  if(t==='hinduism'){ const m=ref.match(/(\d+)\.(\d+)/); if(m) window.__gita={ch:+m[1],v:+m[2]}; }
  if(t==='islam'){ const m=ref.match(/(\d+):(\d+)/); if(m) window.__quranJump=+m[1]; }
  if(typeof openReader==='function') openReader(t);
}

function openThreads(){
  if(typeof go==='function') go('threads');
  if(typeof window.__threadIdx!=='number'){ let s=0; try{ if(typeof getDayCount==='function') s=getDayCount()%SHARED_THREADS.length; }catch(_){ } window.__threadIdx=s; }
  renderThread();
}
function _threadNav(d){ window.__threadIdx=(((window.__threadIdx||0)+d)%SHARED_THREADS.length+SHARED_THREADS.length)%SHARED_THREADS.length; renderThread(); }
function renderThread(){
  const el=document.getElementById('threads-content'); if(!el) return;
  const idx=(((window.__threadIdx||0))%SHARED_THREADS.length+SHARED_THREADS.length)%SHARED_THREADS.length;
  const th=SHARED_THREADS[idx]; const mine=faithTradition();
  const order=[mine].concat(['christianity','islam','hinduism','buddhism','secular'].filter(x=>x!==mine));
  let html='<div style="text-align:center;margin-bottom:2px"><div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.15em;color:var(--tx3);text-transform:uppercase">Shared thread '+(idx+1)+' / '+SHARED_THREADS.length+'</div></div>';
  html+='<h2 style="font-family:Cormorant Garamond,serif;font-size:27px;font-weight:300;color:var(--tx);text-align:center;margin-bottom:16px">'+th.theme+'</h2>';
  order.forEach(function(k){ const L=th.lines[k]; if(!L) return; const isMine=(k===mine);
    html+='<div class="card" style="margin-bottom:10px;'+(isMine?'border-color:var(--go-bd);background:linear-gradient(135deg,rgba(200,169,110,0.08),rgba(140,107,182,0.04))':'')+'">'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:'+(isMine?'var(--go)':'var(--tx3)')+';margin-bottom:6px">'+_THREAD_LABELS[k]+(isMine?' · your path':'')+'</div>'+
      '<div style="font-size:15px;line-height:1.7;color:var(--tx)">“'+L.t+'”</div>'+
      '<div style="font-size:12px;color:var(--tx3);margin-top:5px">— '+L.r+'</div></div>';
  });
  html+='<p style="font-size:12px;color:var(--tx3);font-style:italic;text-align:center;line-height:1.6;margin:14px 6px 10px">The same human struggle, held across traditions — echoes, not sameness. Each speaks in its own voice.</p>';
  html+='<div style="display:flex;gap:8px"><button class="btn" onclick="_threadNav(-1)" style="flex:1;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)">‹ Previous</button><button class="btn" onclick="_threadNav(1)" style="flex:1;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)">Next ›</button></div>';
  el.innerHTML=html;
}

let vi=Math.floor(Math.random()*activeVerses().length); // overridden by pickContextualVerse() on load
// ── SCRIPTURE THAT MEETS YOU ── pick today's verse with gentle awareness of what the person
// is facing (their fight, season, recent mood) and what has landed before (saved verses).
// Still fresh each day, but no longer blind random. Falls back to deterministic daily rotation.
function verseThemes(v){
  const t = (v.t + ' ' + v.r).toLowerCase();
  const themes = [];
  if(/fear|afraid|courage|dismay|anxious|worry|troubled/.test(t)) themes.push('fear');
  if(/strength|strong|power|might|weary|weak/.test(t)) themes.push('strength');
  if(/tempt|sin|flee|self-control|desire|flesh/.test(t)) themes.push('temptation');
  if(/new creation|new|transform|renew|old has passed|forgiv|mercy|restore/.test(t)) themes.push('renewal');
  if(/rest|peace|still|burden|heavy laden|weary|anxious/.test(t)) themes.push('rest');
  if(/love|kind|compassion|grace/.test(t)) themes.push('love');
  if(/wait|hope|endure|persever|run the race|steadfast/.test(t)) themes.push('perseverance');
  if(/joy|rejoice|glad|delight/.test(t)) themes.push('joy');
  return themes.length ? themes : ['strength'];
}
function pickDailyContextualVerse(){
  const VS = activeVerses();
  const _dc = () => { try{ return (typeof getDayCount==='function') ? getDayCount() : Math.floor(Date.now()/86400000); }catch(_){ return Math.floor(Date.now()/86400000); } };
  try{
    const today = new Date().toLocaleDateString('en-AU');
    const cacheKey = 'totry_verse_today';
    const cached = ls(cacheKey);
    // KEYED BY TRADITION, AND BOUNDS-CHECKED. The banks are very different sizes (Christianity 44,
    // secular 24, Buddhist 22, Islam 15, Hindu 14). Caching only {date, idx} meant that choosing a
    // tradition mid-day handed the NEW smaller bank an index from the old larger one — activeVerses()[idx]
    // came back undefined and showV() dereferenced it, which at boot is not inside a try and killed the
    // rest of initApp(). The person who took the app's own day-7 invitation to choose a faith path got a
    // half-dead app for the rest of that day, and nothing told them why.
    const _tr = (typeof faithTradition==='function') ? faithTradition() : 'secular';
    const _bankLen = (typeof activeVerses==='function') ? (activeVerses()||[]).length : 0;
    if(cached && cached.date === today && cached.tr === _tr &&
       typeof cached.idx === 'number' && cached.idx >= 0 && cached.idx < _bankLen){ return cached.idx; }

    // What's the person facing? Build a light theme-weight map.
    const weights = {};
    const bump = (th, n) => { (Array.isArray(th)?th:[th]).forEach(t => weights[t] = (weights[t]||0) + n); };

    // Fight → temptation/strength
    try{ loadV(); if(vices && vices.length){ bump(['temptation','strength'], 2); } }catch(_){}
    // Season
    const season = ls('totry_season') || '';
    if(/heal|recover|rebuild/i.test(season)) bump(['renewal','rest'], 2);
    if(/build/i.test(season)) bump(['strength','perseverance'], 2);
    if(/fight|battle/i.test(season)) bump(['temptation','strength'], 2);
    // Recent mood (low emotional/spiritual → rest, love, renewal)
    // Mood rows only — a morning sleep tap has no emotional/spiritual and would silently take the head.
    const checkins = (ls('totry_checkins') || []).filter(c => c && c.physical!=null);
    if(checkins.length){
      const c = checkins[0];
      if(c.emotional && c.emotional <= 4) bump(['rest','love'], 2);
      if(c.spiritual && c.spiritual <= 4) bump(['renewal','hope'], 2);
      if(c.physical && c.physical <= 4) bump(['rest','strength'], 1);
    }
    // What landed before — saved verses' themes get a gentle bump.
    const saved = ls('totry_sv') || [];
    saved.slice(0,10).forEach(sv => { const match = VS.find(v => v.t === sv.verse); if(match) bump(verseThemes(match), 1); });

    // If we have no signal at all, fall back to deterministic daily rotation.
    if(!Object.keys(weights).length){
      return _dc() % VS.length;
    }
    // Score every verse by theme overlap; pick among the top scorers, rotating by day.
    const scored = VS.map((v,idx) => {
      const th = verseThemes(v);
      const score = th.reduce((a,t)=>a+(weights[t]||0), 0);
      return { idx, score };
    }).sort((a,b)=>b.score-a.score);
    const topScore = scored[0].score;
    if(topScore === 0){ return _dc() % VS.length; }
    const top = scored.filter(x => x.score >= Math.max(1, topScore - 1));
    const chosen = top[_dc() % top.length].idx;
    ls(cacheKey, { date: today, tr: _tr, idx: chosen });
    return chosen;
  }catch(_){ try{ return _dc() % VS.length; }catch(__){ return 0; } }
}

// Adaptive verse selection — pick from VS based on user's current state.
// Returns an index into VS. Re-evaluates per app open.
function pickAdaptiveVerseIndex(){
  const VS = activeVerses();
  try{
    loadV(); loadH();
    const ti = tIdx();
    
    // 1. Recent relapse (within 48h) → confession + grace
    const recentRelapse = vices.some(v => {
      if(!v.startDate || !v.relapseCount) return false;
      const hrsSince = (Date.now() - new Date(v.startDate).getTime()) / 3600000;
      return hrsSince < 48;
    });
    if(recentRelapse){
      // Find 1 John 1:9 or Psalm 51:10
      const i = VS.findIndex(v => /1 John 1:9|Psalm 51:10/.test(v.r));
      if(i >= 0) return i;
    }
    
    // 2. Currently fasting → discipline / hidden devotion
    const fast = ls('totry_fasting') || {};
    if(fast.startTs){
      const i = VS.findIndex(v => /Hebrews 12:11|Proverbs 16:32/.test(v.r));
      if(i >= 0) return i;
    }
    
    // 3. Strong streak (7+ days clean on any vice) → endurance / not growing weary
    const strongStreak = vices.some(v => viceCleanDays(v) >= 7);
    if(strongStreak){
      const i = VS.findIndex(v => /Galatians 6:9|2 Timothy 4:7|Hebrews 12:11/.test(v.r));
      if(i >= 0) return i;
    }
    
    // 4. Yesterday rough or skipped morning → new mercies / strength
    const yEvening = (ls('totry_evenings') || []).find(e => e.day === getDayCount() - 1);
    if(yEvening && yEvening.rating <= 2){
      const i = VS.findIndex(v => /Isaiah 40:29|Isaiah 40:31|Psalm 34:18/.test(v.r));
      if(i >= 0) return i;
    }
    
    // 5. Heavy training day per split → strength
    const split = getUserSplit();
    const todayFocus = (split[ti]?.focus || '').toLowerCase();
    if(/squat|deadlift|legs|push|pull/.test(todayFocus)){
      const i = VS.findIndex(v => /Philippians 4:13|Psalm 28:7|Isaiah 40:31/.test(v.r));
      if(i >= 0) return i;
    }
    
    // 6. Active vices but no recent relapse → flee / self-control
    if(vices.length && !recentRelapse){
      const i = VS.findIndex(v => /2 Timothy 2:22|1 Corinthians 6:18|Proverbs 16:32/.test(v.r));
      if(i >= 0) return i;
    }
    
    // 7. Otherwise: stable rotation based on day count (not random — same verse all day)
    return getDayCount() % VS.length;
  }catch(e){
    return Math.floor(Math.random() * VS.length);
  }
}

function showV(v){
  // Defensive on purpose: this runs UNGUARDED during initApp, so a bad index here used to take out
  // every core render after it (the sobriety clock, milestones, the front-door check-in). Falling back
  // to the first verse of the current bank is always better than a half-booted app.
  if(!v || v.t == null){
    try{ v = (typeof activeVerses==='function' ? (activeVerses()||[]) : [])[0] || { t:'', r:'' }; }
    catch(_){ v = { t:'', r:'' }; }
  }
  document.getElementById('hdr-verse').textContent=v.t;
  document.getElementById('hdr-ref').textContent='\u2014 '+v.r;
  document.getElementById('vsave-btn').textContent='\u2661';
  document.getElementById('vsave-btn').classList.remove('saved');
  // Persist the current verse so the scripture share card can use it.
  try{ ls('totry_hdr_verse_text', v.t); ls('totry_hdr_verse_ref', v.r); }catch(_){ }
  const mt=document.getElementById('morning-verse-text');
  const mr=document.getElementById('morning-verse-ref');
  if(mt)mt.textContent='\u201C'+v.t+'\u201D';
  if(mr)mr.textContent='\u2014 '+v.r;
}
function nextVerse(){const VS=activeVerses();vi=(vi+1)%VS.length;showV(VS[vi]);}
function saveHdrVerse(){
  const v=document.getElementById('hdr-verse').textContent;
  const r=document.getElementById('hdr-ref').textContent.replace('\u2014 ','');
  if(!v||v.includes('Loading'))return;
  const saved=ls('totry_sv')||[];
  if(!saved.find(sv=>sv.verse===v)){
    saved.unshift({verse:v,reference:r,date:new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'})});
    ls('totry_sv',saved.slice(0,200));renderSavedVerses();
  }
  const btn=document.getElementById('vsave-btn');
  btn.textContent='\u2665';btn.classList.add('saved');
}

// ── NAV ───────────────────────────────────────────────────────
const TABS=['home','fight','grow','money','soul'];
// Sub-tabs map to their parent hub so the right nav button highlights.
// The 5 tabs ARE the stewardship map: Today · Fight (freedom) · Grow (body) · Money · Soul (spirit).
// Mind lives in the ever-present orb (Feeling Door); Settings moved to the header gear.
const TAB_PARENT={
  nourish:'grow', train:'grow', track:'grow',
  morning:'soul', reflect:'soul', bible:'soul', why:'soul', liturgy:'soul', read:'soul', threads:'soul', today:'soul', practice:'soul', plans:'soul',
  calendar:'home', settings:'home'
  // fight, money & soul are their own top-level tabs; coach is the floating button
};

// Inserts/updates a small "‹ Back to {Hub}" bar at the top of any sub-page that
// lives under a hub, so the 5-tab nav still feels navigable. Removed on hub/top pages.
const HUB_LABELS={grow:'Grow', soul:'Soul', home:'Home'};
function updateHubBackBar(name){
  const existing=document.getElementById('hub-back-bar');
  if(existing) existing.remove();
  const parent=TAB_PARENT[name];
  if(!parent){
    // Coach is parentless (floating button). Give it a clear way back to where you were.
    if(name === 'coach'){
      const tab=document.getElementById('tab-coach');
      if(tab){
        const bar=document.createElement('div');
        bar.id='hub-back-bar';
        bar.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:12px;cursor:pointer;color:var(--tx3);font-size:13px;user-select:none';
        const back = window.__prevTab && window.__prevTab !== 'coach' ? window.__prevTab : 'home';
        const lbl = HUB_LABELS[back] || ({home:'Home',grow:'Grow',soul:'Soul',track:'Track',money:'Money',settings:'Settings'}[back]) || 'Back';
        bar.innerHTML='<span style="font-size:18px;line-height:1">\u2039</span><span>'+lbl+'</span>';
        bar.onclick=()=>go(back);
        tab.insertBefore(bar, tab.firstChild);
      }
    }
    return; // not a hub sub-page
  }
  const tab=document.getElementById('tab-'+name);
  if(!tab) return;
  const bar=document.createElement('div');
  bar.id='hub-back-bar';
  bar.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:12px;cursor:pointer;color:var(--tx3);font-size:13px;user-select:none';
  bar.innerHTML='<span style="font-size:18px;line-height:1">‹</span><span>'+(HUB_LABELS[parent]||'Back')+'</span>';
  bar.onclick=()=>go(parent);
  tab.insertBefore(bar, tab.firstChild);
}

// Gently nudges the time-appropriate ritual in the Soul hub: Morning before noon, Reflect
// in the evening. Adds a small "now" badge so a man knows where to start.
function highlightSoulByTime(){
  const hr = new Date().getHours();
  const soul = document.getElementById('tab-soul');
  if(!soul) return;
  // Remove any existing badges first
  soul.querySelectorAll('.soul-now-badge').forEach(b => b.remove());
  let targetFn = null;
  if(hr < 12) targetFn = "go('morning')";
  else if(hr >= 17) targetFn = "go('reflect')";
  if(!targetFn) return;
  const card = soul.querySelector('.hub-card[onclick="' + targetFn + '"]');
  if(card){
    const badge = document.createElement('div');
    badge.className = 'soul-now-badge';
    badge.textContent = hr < 12 ? 'now' : 'now';
    badge.style.cssText = 'position:absolute;top:10px;right:10px;font-family:"DM Mono",monospace;font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:#1a1505;background:var(--go);padding:2px 7px;border-radius:100px';
    card.style.position = 'relative';
    card.appendChild(badge);
  }
}

// HEADING NAVIGATION AND A MAIN LANDMARK. Measured: h1 count 0, <main> 0, <header> 0, and visible
// headings per tab — home [], fight [], money [], grow ["Grow"], soul ["Soul"]. Section titles are styled
// divs (.eyebrow is font/colour/letter-spacing only), so a screen-reader user had no way to jump between
// sections: the fastest non-visual navigation in the app was simply absent, and on Today, Fight and Money
// there was not one heading element on screen.
//
// Done here rather than in 21 places of markup because this function is the one thing that knows which
// screen is showing. Only the visible tab gets role="main" — display:none keeps the rest out of the
// accessibility tree, so exactly one landmark is exposed at a time, and each screen legitimately has its
// own top-level heading.
const A11Y_TAB_NAMES = {
  home:'Today', fight:'The fight', train:'Train', grow:'Grow', nourish:'Nourish', money:'Money',
  soul:'Soul', track:'Track', reflect:'Reflect', coach:'Coach', bible:'Scripture', read:'Read',
  plans:'Reading plans', threads:'Shared threads', today:'Today in your tradition', practice:'Practice',
  liturgy:'Liturgy', why:'Your why', morning:'Morning', calendar:'Calendar', settings:'Settings',
};
function _a11yScreenChrome(name){
  try{
    document.querySelectorAll('.tab[role="main"]').forEach(function(el){ el.removeAttribute('role'); });
    const pane = document.getElementById('tab-' + name);
    if(!pane) return;
    const label = A11Y_TAB_NAMES[name] || name;
    pane.setAttribute('role','main');
    pane.setAttribute('aria-label', label);
    if(!pane.querySelector('h1,h2,h3')){
      const h = document.createElement('h1');
      h.className = 'a11y-only';
      h.textContent = label;
      pane.insertBefore(h, pane.firstChild);
    }
  }catch(_){ }
}
function go(name){
  _a11yScreenChrome(name);
  // Static weight labels are markup, so a unit change has to reach them somewhere. Here, because
  // every screen that has one is arrived at through go().
  try{ if(typeof syncWeightUnitLabels==='function') syncWeightUnitLabels(); }catch(_){}
  haptic("tap");
  // Nothing should still be talking after you leave the screen you started it on.
  try{ if(typeof Speak!=='undefined' && Speak.stop) Speak.stop(); }catch(_){}
  // Remember the previous tab so floating screens (Coach) can send you back where you were.
  try{
    const cur = document.querySelector('.tab.active');
    if(cur){ const curName = cur.id.replace('tab-',''); if(curName !== name) window.__prevTab = curName; }
  }catch(_){}
  // Browser history - push state so back button navigates within app
  try{
    if(history.state?.tab !== name){
      history.pushState({tab:name}, '', '#'+name);
    }
  }catch(e){}
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current');});
  const tab=document.getElementById('tab-'+name);
  if(tab){
    tab.classList.add('active');
    // Native feel: each screen opens at its top, never mid-scroll (a webby giveaway), and content
    // rises in fresh. Re-trigger the entrance animation so every visit feels alive, not static.
    try{ tab.scrollTop = 0; }catch(_){}
    tab.classList.remove('tab-entered'); void tab.offsetWidth; tab.classList.add('tab-entered');
  }
  // Highlight the nav button: the tab itself if it's a top-level nav item,
  // otherwise its parent hub (e.g. on 'fight', highlight 'grow')
  const navName = TABS.includes(name) ? name : (TAB_PARENT[name] || 'home');
  const navIdx = TABS.indexOf(navName);
  if(navIdx>=0){const _nb=document.querySelectorAll('.nb')[navIdx]; if(_nb){_nb.classList.add('active'); _nb.setAttribute('aria-current','page');}}
  // Show a "back to hub" bar on sub-pages so users can climb back up easily
  updateHubBackBar(name);
  try{ if(typeof renderCycleSurfaces==='function') renderCycleSurfaces(); }catch(_){}
  if(name==='fight'){renderVices();renderScoreboard();if(typeof renderFightEvidence==='function')renderFightEvidence();}
  if(name==='track'){renderBody();if(typeof renderBodyGoalCard==='function')renderBodyGoalCard();if(typeof syncWeeklyCheckin==='function')syncWeeklyCheckin();renderBodyCollage();updateTrackerDisplay();if(typeof renderHealthCard==='function')renderHealthCard();if(typeof Health!=='undefined'&&Health.connected()&&Health.isNative())Health.syncToday();}
  if(name==='grow'){ if(typeof renderBodySystemReport==='function') renderBodySystemReport();
                     if(typeof renderGrowHandoffs==='function') renderGrowHandoffs(); }
  if(name==='settings' && typeof renderPushSettings==='function'){renderPushSettings();}
  if(name==='bible'){renderSavedVerses();initBibleReader();}
  if(name==='why'){initWhyTab();}
  if(name==='liturgy'){renderLiturgy();}
  if(name==='plans' && typeof renderPlans==='function'){renderPlans();}
  if(name==='calendar' && typeof renderCalendar==='function'){renderCalendar();}
  
  if(name==='morning'){initMorningTab();showMorningAffirm();showMorningFocus();if(typeof renderMorningFlow==='function')setTimeout(renderMorningFlow,60);if(typeof _restoreMorningSleep==='function')_restoreMorningSleep();}
  if(name==='soul'){ if(typeof renderSoulStill==='function') renderSoulStill(); if(typeof applyFaithLabels==='function') applyFaithLabels(); if(typeof highlightSoulByTime==='function') highlightSoulByTime(); if(typeof renderFaithDoor==='function') renderFaithDoor(); }
  if(name==='coach'){ if(typeof applyCoachVoiceCopy==='function') applyCoachVoiceCopy(); }
  if(name==='reflect'){initEveningTab();initReviewTab();if(typeof renderEveningFlow==='function')setTimeout(renderEveningFlow,60);}
  
  if(name==='nourish'){renderNutritionLog();if(typeof prefillNutGoals==='function')prefillNutGoals();if(typeof renderFuelPlanCard==='function')renderFuelPlanCard();}
  if(name==='train'){initPTTab();
    // The brother glances at your readiness as you arrive to train. If you're wrecked, he says it
    // straight — once — before you load up. Quiet otherwise.
    try{
      if(typeof computeReadiness==='function'){
        const _rd = computeReadiness();
        if(_rd && _rd.score!=null && _rd.score < 40){
          setTimeout(()=>{ if(typeof brotherSpeaks==='function') brotherSpeaks({ kind:'trainTired' }); }, 700);
        }
      }
    }catch(_){}
  }
  if(name==='fight'){renderVices();renderScoreboard();if(typeof renderFightEvidence==='function')renderFightEvidence();}
  
  if(name==='reflect'){renderJournal();setReflectTab('evening');}
  if(name==='fight'){renderVices();renderScoreboard();if(typeof renderFightEvidence==='function')renderFightEvidence();setFightTab('vices');if(typeof renderFeelingWinsMomentum==='function')renderFeelingWinsMomentum();if(typeof renderUrgeInsights==='function')renderUrgeInsights();if(typeof renderVicePatternCard==='function')renderVicePatternCard();}
  if(name==='bible'){setBibleTab('find');}
  if(name==='money'){renderFinance();if(typeof renderFinanceGoals==='function')renderFinanceGoals();
    // renderFinance() early-returns when there are no debts, and renderTransactions() — the only
    // caller of Giving, subscription auto-detection, subscriptions, bills, budgets, net worth and
    // family contribution — sat AFTER that return. So every debt-free user (i.e. every new user)
    // got a Money tab of empty card headers, and v348 + v355 shipped doing nothing at all.
    if(typeof renderTransactions==='function') renderTransactions();
  }
  if(name==='coach'){if(typeof renderCoachQuickReplies==='function')renderCoachQuickReplies();if(typeof restoreCoachMessages==='function' && !window.__coachRestored){restoreCoachMessages();window.__coachRestored=true;}}
  if(name==='home'){if(typeof renderHomeGreeting==='function')renderHomeGreeting();if(typeof renderLifeWoven==='function')renderLifeWoven();renderHomeHabits();if(typeof renderNextStep==='function')renderNextStep();if(typeof renderReadinessCard==='function')renderReadinessCard();if(typeof renderWeeklyReflectionCard==='function')renderWeeklyReflectionCard();if(typeof renderTourPrompt==='function')renderTourPrompt();if(typeof renderHomeCalendar==='function')renderHomeCalendar();if(typeof renderTesterCard==='function')renderTesterCard();if(typeof renderHomeQuickWins==='function')renderHomeQuickWins();if(typeof checkPreviewBanner==='function')checkPreviewBanner();if(typeof renderTodayForYou==='function')renderTodayForYou();if(typeof renderHomeInsight==='function')renderHomeInsight();renderDayCounter();showAIMorningSentence();updateShareDayNum();generateWeeklySynthesis();checkLettersDue();checkYearInReviewPrompt();if(typeof refreshAIPushMessages==='function')refreshAIPushMessages();if(typeof applyHomeProgressiveDisclosure==='function')applyHomeProgressiveDisclosure();if(typeof renderHomeDepthFold==='function')renderHomeDepthFold();}
  if(name==='settings'){
    // Each render is guarded independently: a single failing widget must never blank the whole
    // Settings page (which is what was happening). Failures are logged, the rest still render.
    const safe = (fn, label) => { try{ if(typeof fn==='function') fn(); }catch(e){ console.warn('[settings] '+label+' failed:', e); } };
    safe(initSettingsTab, 'initSettingsTab');
    safe(()=>{ const lv=faithLevel(); document.querySelectorAll('.faith-opt').forEach(b=>{ const on=b.dataset.faith===lv; b.style.borderColor=on?'var(--go)':'var(--bd)'; b.style.background=on?'rgba(200,169,110,0.10)':'var(--bg3)'; }); }, 'faithLevelReflect');
    safe(()=>{ const sx=userSex(); if(sx) document.querySelectorAll('.sex-opt').forEach(b=>{ const on=b.dataset.sex===sx; b.style.borderColor=on?'var(--go)':'var(--bd)'; b.style.background=on?'rgba(200,169,110,0.10)':'var(--bg3)'; }); }, 'sexReflect');
    safe(renderSyncStatus, 'renderSyncStatus');
    try{ const vs=document.getElementById('app-version-stamp'); if(vs) vs.textContent = (typeof APP_VERSION!=='undefined'?APP_VERSION:'?') + ' · refined'; }catch(_){ }
    safe(updatePartnerBtn, 'updatePartnerBtn');
    safe(renderRelationships, 'renderRelationships');
    safe(renderLetters, 'renderLetters');
    safe(renderConnectedApps, 'renderConnectedApps');
    safe(renderActivityHeatmap, 'renderActivityHeatmap');
    safe(renderAffirmList, 'renderAffirmList');
  }
}

// ── HOME ──────────────────────────────────────────────────────
// Smoothly counts a number up to its target — used for the day counter's premium feel.
function countUp(el, target, ms){
  if(!el) return;
  const dur = ms || 900;
  const start = performance.now();
  const from = 0;
  function frame(now){
    const t = Math.min((now - start) / dur, 1);
    // easeOutExpo for a satisfying fast-then-settle
    const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    el.textContent = Math.round(from + (target - from) * eased);
    if(t < 1) requestAnimationFrame(frame);
    else el.textContent = target;
  }
  requestAnimationFrame(frame);
  // Safety net: requestAnimationFrame is paused while the page is hidden (backgrounded or
  // throttled), which can freeze the counter on a partial number. setTimeout still fires, so
  // guarantee the correct final value lands regardless of rAF state.
  setTimeout(()=>{ if(el.textContent != String(target)) el.textContent = target; }, dur + 400);
}

function renderDayCounter(){
  const day=getDayCount();
  // Count up on the FIRST home view of the session (a premium, alive feel); instant after that
  const animate = !window.__dayCountAnimated && day > 1 && day <= 9999;
  window.__dayCountAnimated = true;
  ['day-num','hero-day'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    if(animate){ countUp(el, day); } else { el.textContent=day; }
  });
  // The lifetime journey — only shows once you've begun again, so the falling becomes the proof.
  try{
    const badge=document.getElementById('journey-badge');
    if(badge){
      const rc=(typeof restartCount==='function')?restartCount():0;
      const total=(typeof totalDaysTrying==='function')?totalDaysTrying():day;
      if(rc>0 && total>day){
        badge.textContent = total+' days trying in all · '+rc+' fresh start'+(rc===1?'':'s')+' · still here';
        badge.style.display='';
      } else { badge.style.display='none'; }
    }
  }catch(_){}
  const quotes=[
    '"The only thing required is that you try."',
    '"Every day you open this is a day you chose differently."',
    '"You\'re not starting over. You\'re starting from experience."',
    '"The person you\'re becoming is built one day at a time."',
    '"God doesn\'t need you perfect. He needs you present."',
    '"Discipline is choosing who you want to be over what you feel."',
    '"Every urge you defeat is proof of who you\'re becoming."',
    '"Show up today. That\'s the whole plan."',
    '"The pursuit matters more than the performance."',
    '"Not perfect. Just better than yesterday."',
    '"I know exactly who I am. Now I need to live like it."',
    '"Strip the person you were. Become the person you know you can be."',
  ];
  // Fix singular/plural: "1 day in" not "1 days in". (.hero-dayl was missing here — that's why the
  // hero label was stuck on the plural "days in" even on day 1.)
  document.querySelectorAll('.day-l, .hero-lbl, .hero-dayl').forEach(el=>{ if(el) el.textContent = (day===1?'day in':'days in'); });
  const hq=document.getElementById('hero-quote');if(hq)hq.textContent=quotes[day%quotes.length];
  const dots=document.getElementById('streak-dots');
  if(dots){dots.innerHTML='';const streak=getStreak();for(let i=0;i<7;i++){const d=document.createElement('div');d.className='sdot'+(i<streak?' on':'');dots.appendChild(d);}}
  loadV();const tw=vices.reduce((a,v)=>a+(v.w||0),0);
  const hw=document.getElementById('h-wins');if(hw)hw.textContent=tw;
  const hs=document.getElementById('h-streak');if(hs)hs.textContent=getStreak();
  loadH();const ti=tIdx();const done=habits.filter(h=>h.d[ti]===1).length;
  const hh=document.getElementById('h-habits');if(hh)hh.textContent=done+'/'+habits.length;
  loadF();const owed=debts.reduce((a,d)=>a+(d.t-d.p),0);
  const hd=document.getElementById('h-debt');if(hd)hd.textContent=owed>0?curSym()+Math.round(owed).toLocaleString():'Clear';
  loadTodaySplitCard();
  const tmrw=ls('totry_tomorrow_tasks');
  // Only show a list that was written FOR today (or last night). Nothing checked the stamp, so a list
  // set on Sunday for Monday was still being presented as "Today's priorities" on Thursday.
  const _tmrwFresh = (() => {
    try{
      if(!tmrw || !tmrw.date) return false;
      const t = new Date(); const y = new Date(Date.now() - 86400000);
      return tmrw.date === t.toLocaleDateString('en-AU') || tmrw.date === y.toLocaleDateString('en-AU');
    }catch(_){ return false; }
  })();
  if(_tmrwFresh && tmrw&&tmrw.tasks?.length){
    const det=document.getElementById('today-detail');
    const split=getUserSplit();const todayDetail=split[ti]?.detail||'';
    if(det)det.textContent=todayDetail+'\n\nToday\'s priorities:\n'+tmrw.tasks.map((t,i)=>(i+1)+'. '+t).join('\n');
  }
  // Sabbath card — only on Sundays (getDay() === 0)
  const sabbathCard = document.getElementById('sabbath-card');
  if(sabbathCard) sabbathCard.style.display = (new Date().getDay() === 0) ? 'block' : 'none';
}

// ── MORNING ───────────────────────────────────────────────────
const PRAYER_POOLS={
  quick:[
    'Lord, good morning.\n\nThank You for another day \u2014 another chance to be better than yesterday.\n\nGive me strength to face my battles. Discipline to honour my commitments. Humility to ask for help.\n\nI\'m trying. That\'s enough.\n\nAmen.',
    'Father, before the day takes me \u2014 I come to You.\n\nSteady my hands. Quiet my mind. Keep my eyes on what matters.\n\nWhatever comes today, let me meet it as the man You\'re making me.\n\nAmen.',
    'God, thank You for breath in my lungs and another sunrise.\n\nI don\'t want to drift through today. I want to live it on purpose.\n\nWalk with me. Catch me if I slip. Keep me honest.\n\nAmen.',
    'Lord, I\'m not asking for an easy day.\n\nI\'m asking for the strength to do the right thing in a hard one.\n\nGo before me. I\'ll follow.\n\nAmen.'
  ],
  full:[
    'Heavenly Father,\n\nThank You for waking me up. For another chance. For grace that doesn\'t run out no matter how many times I fall.\n\nToday I face my battles. I don\'t face them alone.\n\nGive me:\n\u2014 Strength when the urges come\n\u2014 Discipline to honour what I know is right\n\u2014 Humility to admit when I\'m wrong\n\u2014 Courage to keep going when it\'s hard\n\nI don\'t need to be perfect today. I just need to try.\n\nAmen.',
    'Father in Heaven,\n\nThis morning I lay the day before You \u2014 the parts I\'m looking forward to and the parts I\'m dreading.\n\nIn the easy hours, keep me grateful. In the hard ones, keep me close.\n\nGuard my eyes, my words, and my heart. Let the people around me be better for having crossed my path today.\n\nWhen I fall short, remind me Your mercy is new every morning.\n\nAmen.',
    'Lord God,\n\nYou know exactly what today holds, and I don\'t. I give it to You anyway.\n\nMake me patient where I\'m usually short. Make me brave where I\'m usually quiet. Make me faithful in the small things no one sees.\n\nKeep me from the things that pull me under. Anchor me to the reason I started.\n\nI\'m Yours today. Lead me.\n\nAmen.'
  ],
  scripture:[
    '"Create in me a clean heart, O God, and renew a right spirit within me." \u2014 Psalm 51:10\n\nLord, that\'s my prayer. Not for perfection. For a clean heart.\n\n"For God gave us a spirit not of fear but of power and love and self-control." \u2014 2 Timothy 1:7\n\nLet that spirit lead me today.\n\nWhen I feel weak \u2014 remind me.\nWhen the urge comes \u2014 remind me.\nWhen I want to give up \u2014 remind me.\n\nAmen.',
    '"I can do all things through Christ who strengthens me." \u2014 Philippians 4:13\n\nNot by my willpower, Lord \u2014 by Your strength.\n\n"The Lord is my shepherd; I shall not want." \u2014 Psalm 23:1\n\nLead me today. Where I\'m anxious, still me. Where I\'m weak, carry me.\n\nAmen.',
    '"Trust in the Lord with all your heart, and do not lean on your own understanding." \u2014 Proverbs 3:5\n\nFather, I\'ve leaned on myself too long. Today I lean on You.\n\n"Be strong and courageous. Do not be afraid." \u2014 Joshua 1:9\n\nGo with me into this day. That\'s all I need.\n\nAmen.',
    '"Cast all your anxieties on Him, because He cares for you." \u2014 1 Peter 5:7\n\nLord, here are mine. I\'m done carrying them alone.\n\n"Those who hope in the Lord will renew their strength." \u2014 Isaiah 40:31\n\nRenew mine this morning. Let me rise and try again.\n\nAmen.'
  ]
};
const PRAYER_TITLES={quick:'Quick prayer (2 min)',full:'Full morning prayer (5 min)',scripture:'Scripture-based prayer'};
// Rotates by day-count so the prayer changes daily but stays on its theme.
function pickPrayer(type){
  const pool=PRAYER_POOLS[type]||PRAYER_POOLS.quick;
  const idx=(getDayCount()+ (type==='full'?1:type==='scripture'?2:0)) % pool.length;
  return {title:PRAYER_TITLES[type], text:pool[idx]};
}
const PRAYERS=new Proxy({},{get:(t,k)=>pickPrayer(k)});
// Standalone prayer modal — works from the Soul hub, any time, regardless of morning state.
// (Fixes the bug where tapping scripture prayer in the morning tab landed on "morning done".)
// Prayer now lives in Bible → Prayer (AI prayer-from-intention, saints' library, your prayer list).
// The Soul "Pray right now" card jumps straight there rather than a separate modal.
// Toggle the unified prayer composer between writing your own and AI help.
function setPrayerMode(mode){
  const w=document.getElementById('prayer-mode-write-body'), a=document.getElementById('prayer-mode-ai-body');
  const wb=document.getElementById('prayer-mode-write'), ab=document.getElementById('prayer-mode-ai');
  const on='background:var(--bg);border:1px solid var(--bd);color:var(--tx)', off='background:transparent;border:1px solid transparent;color:var(--tx3)';
  if(mode==='ai'){ if(w)w.style.display='none'; if(a)a.style.display='block'; if(ab)ab.style.cssText='flex:1;padding:8px;font-size:12px;'+on; if(wb)wb.style.cssText='flex:1;padding:8px;font-size:12px;'+off; }
  else{ if(w)w.style.display='block'; if(a)a.style.display='none'; if(wb)wb.style.cssText='flex:1;padding:8px;font-size:12px;'+on; if(ab)ab.style.cssText='flex:1;padding:8px;font-size:12px;'+off; }
}
// Lowkey, honest "this was AI-generated" label that names the model that actually answered (the
// proxy reports it; the model can vary per call due to provider fallback). Used wherever the app
// shows AI-written content, so users always know. Quiet (small, muted) — informative, not loud.
function _friendlyModel(){
  const m = window.__lastAIModel || '';
  const p = window.__lastAIProvider || '';
  if(m){
    const s = String(m).toLowerCase();
    if(s.includes('gemini-2.5-flash')) return 'Gemini 2.5 Flash';
    if(s.includes('gemini-2.5')) return 'Gemini 2.5';
    if(s.includes('gemini')) return 'Gemini';
    if(s.includes('llama-3.3-70b')) return 'Llama 3.3 70B';
    if(s.includes('llama')) return 'Llama';
    if(s.includes('claude-haiku')) return 'Claude Haiku 4.5';
    if(s.includes('claude')) return 'Claude';
    if(s.includes('deepseek')) return 'DeepSeek';
    // Otherwise show the raw model id (still transparent), trimmed of any vendor prefix.
    return String(m).split('/').pop().replace(':free','');
  }
  if(p) return p.charAt(0).toUpperCase()+p.slice(1);
  return 'AI';
}
function aiTag(){
  return '<div style="font-size:9px;color:var(--tx3);margin-top:8px;font-family:DM Mono,monospace;letter-spacing:0.04em;opacity:0.7">✨ Written by '+_friendlyModel()+' · may not be perfect</div>';
}
// "Today" in Soul — weaves the practical day (schedule) with the inner day (streaks, this morning's
// mood/intention, prayer) so you can feel how the whole day is going in one place.
// "Pray about today" was shown to ALL FIVE traditions. For a secular person that breaks the app's own
// contract in FAITHS.secular — "Never mention God, scripture, or prayer" — and for a Buddhist it is
// simply the wrong verb, since Buddhism is non-theistic and one reflects rather than petitions. The noun
// each tradition already declares in faithPrayer() carries this correctly, so nothing new is invented.
function _soulTodayCta(){
  try{
    const t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
    if(t === 'christianity' || t === 'hinduism') return 'Pray about today';
    if(t === 'islam') return 'Make du\u2019a for today';
    return 'Reflect on today';                    // buddhism + secular: no petition, no deity
  }catch(_){ return 'Reflect on today'; }
}

function openSoulToday(){
  const now = new Date();
  const todayKey = now.toLocaleDateString('en-AU');
  const todayDow = (now.getDay()+6)%7;
  const dateLabel = now.toLocaleDateString('en-AU',{weekday:'long', day:'numeric', month:'long'});

  // --- Schedule (today's events) ---
  const events = (typeof _calEvents==='function'?_calEvents():[]).filter(e=>e&&e.day===todayDow).sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));
  let schedHtml;
  if(!events.length){
    schedHtml = '<div style="font-size:13px;color:var(--tx3);font-style:italic">Nothing scheduled today. <span class="tlink" onclick="document.getElementById(\'soul-today-modal\')?.remove();go(\'calendar\')">Add your week \u2192</span></div>';
  } else {
    schedHtml = events.map(e=>{
      const col = (typeof CAL_TYPE_COLORS!=='undefined' && CAL_TYPE_COLORS[e.type]) || 'var(--go)';
      return '<div style="display:flex;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--bd)"><div style="font-family:DM Mono,monospace;font-size:11px;color:'+col+';min-width:42px">'+(e.start||'')+'</div><div style="font-size:13px;color:var(--tx)">'+(e.title||'')+'</div></div>';
    }).join('');
  }

  // --- Soul state: streaks ---
  if(typeof loadV==='function') loadV();
  const vlist = (typeof vices!=='undefined' && Array.isArray(vices)) ? vices : (ls('totry_v')||[]);
  let streakHtml = '';
  if(vlist.length){
    streakHtml = vlist.slice(0,4).map(v=>{
      const days = (typeof viceCleanDays==='function') ? viceCleanDays(v) : 0;
      return '<div style="flex:1;min-width:70px;text-align:center;padding:8px;background:var(--bg3);border-radius:8px"><div style="font-size:20px;font-family:Cormorant Garamond,serif;color:var(--go)">'+days+'</div><div style="font-size:10px;color:var(--tx3);margin-top:2px">'+(v.n||'')+'</div></div>';
    }).join('');
  }

  // --- Soul state: this morning's mood + intention ---
  // completeMorning writes date as toLocaleDateString('en-AU',{weekday,day,month}) -> "Fri, 28 Aug".
  // todayKey is the bare toLocaleDateString('en-AU') -> "28/08/2026". Those two strings can never be
  // equal, so didMorning has been permanently false for every user since this shipped: the Morning
  // tile could not turn green even on a morning that was finished, sitting beside a green Evening tile
  // on the same day, and the whole "Your soul today" block gated on `tm` has never rendered for
  // anyone. The line directly below already matches the evening by timestamp, and every other reader
  // of this store in the codebase does too — this one line was the outlier.
  const mornings = (typeof ritualLog === 'function') ? ritualLog('totry_mornings') : (ls('totry_mornings')||[]);
  const tm = mornings.find(m => m && m.ts && new Date(m.ts).toLocaleDateString('en-AU') === todayKey);
  let moodHtml = '';
  if(tm){
    if(tm.mood) moodHtml += '<div style="font-size:13px;color:var(--tx2);margin-bottom:4px">This morning you felt <span style="color:var(--tx)">'+tm.mood+'</span></div>';
    if(tm.intention) moodHtml += '<div style="font-size:13px;color:var(--tx2);font-style:italic">\u201c'+String(tm.intention).slice(0,140)+'\u201d</div>';
  }
  const didMorning = !!tm;
  const evenings = (typeof ritualLog === 'function') ? ritualLog('totry_evenings') : (ls('totry_evenings')||[]);
  const didEvening = evenings.some(e=>e && e.ts && new Date(e.ts).toLocaleDateString('en-AU')===todayKey);

  const m = document.createElement('div');
  m.className='modal-bg open'; m.id='soul-today-modal';
  m.innerHTML = '<div class="modal" style="max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:DM Mono,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:var(--go);margin-bottom:4px">'+dateLabel+'</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;font-style:italic;color:var(--tx);margin-bottom:18px">How your day is going</div>'+

    // Soul state first — the inner day
    (streakHtml?('<div class="lbl">Holding the line</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">'+streakHtml+'</div>'):'')+
    (moodHtml?('<div class="lbl">Your soul today</div><div style="background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:16px">'+moodHtml+'</div>'):'')+

    // The two daily anchors
    '<div class="lbl">The day\u2019s rhythm</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:16px">'+
      '<div onclick="document.getElementById(\'soul-today-modal\')?.remove();go(\'morning\')" style="flex:1;padding:12px;background:var(--bg3);border-radius:10px;cursor:pointer;text-align:center"><div style="font-size:18px;margin-bottom:2px">'+(didMorning?'\u2705':'\u2600\ufe0f')+'</div><div style="font-size:12px;color:var(--tx2)">Morning</div></div>'+
      '<div onclick="document.getElementById(\'soul-today-modal\')?.remove();go(\'reflect\')" style="flex:1;padding:12px;background:var(--bg3);border-radius:10px;cursor:pointer;text-align:center"><div style="font-size:18px;margin-bottom:2px">'+(didEvening?'\u2705':'\u{1F319}')+'</div><div style="font-size:12px;color:var(--tx2)">Evening</div></div>'+
    '</div>'+

    // The practical day — schedule
    '<div class="lbl">Today\u2019s schedule</div>'+
    '<div style="background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:16px">'+schedHtml+'</div>'+

    // Prayer still one tap away (just not its own hub card)
    '<button class="btn primary" style="padding:14px;margin-bottom:8px" onclick="document.getElementById(\'soul-today-modal\')?.remove();openPrayerSection()">'+_escFew(_soulTodayCta())+' \u2192</button>'+
    '<button class="btn" onclick="document.getElementById(\'soul-today-modal\')?.remove()" style="background:none;border:none;color:var(--tx3);font-size:13px">Close</button>'+
  '</div>';
  document.body.appendChild(m);
  m.addEventListener('click', e=>{ if(e.target===m) m.remove(); });
  if(typeof haptic==='function') haptic('tap');
}
function openPrayerSection(){
  // GATED, like its three siblings. openScripture, openTodayAnchor and openPractice all branch on
  // faithTradition(); this one did not, and its destination is the Christian "The Word" tab — the saints'
  // prayers (St Francis, Padre Pio, Aquinas), the 66-book Bible reader, and markPrayerAnswered's "How did
  // God answer this prayer?" / "Praise God". It is reached from an ungated "Pray about today →" button in
  // the Soul hub, so it was two taps from every Muslim, Hindu, Buddhist and secular user — and secular is
  // the DEFAULT. Same violation as the Sacraments tab (v427) and the SOS anchor (v431).
  const t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
  if(t === 'christianity'){
    if(typeof go==='function') go('bible');
    if(typeof setBibleTab==='function') setBibleTab('prayer');
    try{ const el=document.getElementById('ai-prayer-intention'); if(el&&el.scrollIntoView) el.scrollIntoView({block:'center'}); }catch(_){ }
    return;
  }
  // Everyone else goes to their own HOME — the practice if their tradition has one, plus the composer
  // where they can say what is actually on their heart and be answered in their own voice. Routing to
  // openPractice() alone was not enough: only dhikr and japa exist, so Buddhism and secular landed on a
  // breath menu with nowhere to bring a specific worry.
  if(typeof openFaithHome === 'function') { openFaithHome(); return; }
  if(typeof go === 'function') go('soul');
}
// openPrayerModal() lived here — superseded by the Prayer tab (setBibleTab('prayer') +
// generateIntentionPrayer()). Never referenced once.

// showModalPrayer() lived here — the render half of the superseded openPrayerModal. Its only DOM
// target (#modal-prayer-text) was created by that modal, so with the modal gone this could never find
// anything. Unreferenced.

async function showPrayer(type){
  // For scripture-based prayer, make it adaptive based on user's state
  if(type==='scripture'){
    return showAdaptivePrayer();
  }
  const p=PRAYERS[type];
  document.getElementById('morning-prayer-title').textContent=p.title;
  document.getElementById('morning-prayer-text').textContent=p.text;
  document.getElementById('morning-prayer-display').style.display='block';
  document.getElementById('morning-prayer-display').scrollIntoView({behavior:'smooth'});
}

async function showAdaptivePrayer(){
  const titleEl=document.getElementById('morning-prayer-title');
  const textEl=document.getElementById('morning-prayer-text');
  const displayEl=document.getElementById('morning-prayer-display');
  if(!titleEl||!textEl||!displayEl)return;
  
  titleEl.textContent = (faithTradition()==='christianity') ? 'Scripture prayer' : ('A '+faithPrayer().noun+' for right now');
  textEl.innerHTML='<span class="pulsing" style="font-style:italic;color:var(--tx3)">Writing a prayer for where you are right now...</span>';
  displayEl.style.display='block';
  displayEl.scrollIntoView({behavior:'smooth'});
  
  // Gather user state
  const identity=ls('totry_identity')||'';
  const season=ls('totry_season')||'Building';
  // Only the mood rows carry physical/emotional/spiritual — the morning sleep tap writes
  // {kind:'sleep', scores:{…}} into the same store, and taking [0] blindly made that the
  // person's "most recent state".
  const checkins=(ls('totry_checkins')||[]).filter(c => c && c.physical!=null);
  const recentCheckin=checkins[0];
  loadV();
  const dayCount=getDayCount();
  
  // Find what they\'re struggling with most
  let primaryStruggle='';
  if(vices.length){
    const worst=vices.reduce((wst,v)=>{
      const rate=v.total>0?(v.w||0)/v.total:1;
      const wrate=wst.total>0?(wst.w||0)/wst.total:1;
      return rate<wrate?v:wst;
    });
    primaryStruggle=worst.n;
  }
  
  let stateDesc='Day '+dayCount+' of the journey. Season: '+season+'.';
  if(identity)stateDesc+=' Identity: '+identity+'.';
  if(primaryStruggle)stateDesc+=' Currently fighting: '+primaryStruggle+'.';
  if(recentCheckin){
    stateDesc+=' Yesterday felt: Physical '+recentCheckin.physical+'/10, Emotional '+recentCheckin.emotional+'/10, Spiritual '+recentCheckin.spiritual+'/10.';
  }
  
  // Pull today's actual Mass readings so the prayer is rooted in what the Church reads today.
  // (Christianity only — other paths don't have a daily lectionary here.)
  let liturgyCtx = '';
  try{
    if(faithTradition()==='christianity' && typeof fetchLiturgy === 'function'){
      const lit = await fetchLiturgy();
      if(lit){
        if(lit.celebration && lit.celebration.name) liturgyCtx += ' Today the Church remembers ' + lit.celebration.name + '.';
        if(lit.readings){
          if(lit.readings.gospel) liturgyCtx += ' Today\u2019s Gospel: ' + lit.readings.gospel + '.';
          if(lit.readings.firstReading) liturgyCtx += ' First reading: ' + lit.readings.firstReading + '.';
          if(lit.readings.psalm) liturgyCtx += ' Psalm: ' + lit.readings.psalm + '.';
        }
        if(lit.season) liturgyCtx += ' Liturgical season: ' + lit.season + '.';
      }
    }
  }catch(_){ }
  try{
    const pr=faithPrayer();
    const useLit = liturgyCtx && faithTradition()==='christianity';
    const prompt='Write a warm, personal morning '+pr.noun+' for this person in their current state \u2014 something to pray or sit with slowly, not a quick blessing. '+pr.how+(useLit?' Where it fits naturally, weave in a theme or line from TODAY\u2019S actual readings (below) and name the reference \u2014 rooting it in what the whole community reads today.':'')+' Aim for 8-14 sentences of real substance. Return ONLY the '+pr.noun+' text, no preamble, no title. Their state: '+stateDesc+(useLit?liturgyCtx:'');
    const sys=pr.sys;
    let response=await api(sys,[],prompt,1400);
    // Detect a truncated/too-short response (server-side providers sometimes cut off) and retry once.
    const looksTruncated=(t)=>{ if(!t) return true; const x=t.trim(); if(x.length<160) return true; const endsOk = pr.ends ? (pr.ends.test(x) || /[.!?\u201d\u2019]$/.test(x)) : /[.!?\u201d\u2019]$/.test(x); return !endsOk; };
    if(looksTruncated(response)){
      try{ const retry=await api(sys,[],prompt+'\n\nIMPORTANT: Write it in FULL, start to finish, 8-14 sentences. Do not cut off.',1600); if(retry && retry.trim().length > (response||'').trim().length) response=retry; }catch(_){ }
    }
    if(response&&response.trim()){
      textEl.textContent=response.trim();
    }else{
      textEl.textContent=faithFallbackReflection();
    }
  }catch(e){
    console.error('Adaptive prayer failed:',e);
    textEl.textContent=faithFallbackReflection();
  }
}
function completeMorning(){
  // GATED. The morning asks for a gratitude and an intention in free text, and those reach the coach's
  // context — so it is an AI surface by the same definition as the journal and the evening, and it was
  // the only one of the three still ungated. Same contract: their words are always kept, the app simply
  // stops and meets them instead of carrying on with the ritual.
  let _mCrisis = null;
  try{
    if(typeof detectCrisis === 'function'){
      const _g = (document.getElementById('morning-gratitude')||{}).value || '';
      const _i = (document.getElementById('morning-intention')||{}).value || '';
      _mCrisis = detectCrisis([_g, _i].filter(Boolean).join(' '));
    }
  }catch(_){ }
  // PERSIST FIRST, ALWAYS. The crisis branch below used to `return` before this write, so the single
  // moment a person disclosed was the single moment their words were thrown away — while the toast said
  // "Saved". The gate's own comment three lines up promises "their words are always kept, the app simply
  // stops and meets them"; now it is true. Marked, never censored, same contract as the journal.
  const g=document.getElementById('morning-gratitude').value.trim();
  const intent=document.getElementById('morning-intention').value.trim();
  const log=ls('totry_mornings')||[];
  log.unshift({date:new Date().toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'}),day:getDayCount(),gratitude:g,intention:intent,flagged:!!_mCrisis,ts:new Date().toISOString()});
  ls('totry_mornings',log.slice(0,1200)); // keep years of reflections (~3+ yrs daily), not ~3 months — an inner journey shouldn't silently vanish
  if(typeof syncToCloud==='function') syncToCloud();

  if(_mCrisis){
    try{
      document.querySelectorAll('.modal-bg:not([id])').forEach(function(m){ m.remove(); });
      const _m = document.createElement('div');
      _m.className = 'modal-bg open';
      _m.style.alignItems = 'center';
      _m.innerHTML = '<div class="modal" style="max-width:92vw"><div class="modal-handle"></div>' +
        '<div id="morning-crisis-slot"></div>' +
        '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12px;margin-top:10px">Close</button></div>';
      document.body.appendChild(_m);
      if(typeof showCrisisResponse === 'function') showCrisisResponse('morning-crisis-slot', _mCrisis);
    }catch(_){ }
    if(typeof haptic==='function') haptic('warning');
    if(typeof showToast==='function') showToast('Saved', 'I read what you wrote. Please look at this.');
    return;
  }

  if(typeof logEvent==='function') logEvent('morning_done');
  if(typeof syncToCloud==='function') syncToCloud();
  document.getElementById('morning-prayer-display').style.display='none';
  document.getElementById('morning-done').style.display='block';
  if(typeof morningFinished==='function') morningFinished();
  // The last tap of the flagship ritual moved nothing on screen. The save works, but morningFinished()
  // un-hides all five steps at once and the pane is still at scrollTop 0, so the person is left looking
  // at the top of step one and has no way to tell whether their morning was kept. The confirmation
  // lands 1871px below the fold. Bring it to them.
  try{
    const _d = document.getElementById('morning-done');
    if(_d) setTimeout(function(){ try{ _d.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ } }, 90);
    // The closing line is written per tradition — "your prayer is heard" is not something to say to a
    // person who chose another path, or none, at the end of their own morning.
    try{
      const _ln = document.getElementById('morning-done-line');
      if(_ln){
        const _t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
        const _mid = { christianity:' Your prayer is heard.', islam:' Your du\u2019a is heard.',
                       hinduism:' Your prayer is offered.', buddhism:' Held in stillness.',
                       secular:'' }[_t] || '';
        _ln.textContent = 'Your intention is set.' + _mid + ' Now go live the day.';
      }
    }catch(_){ }
    if(typeof showToast === 'function') showToast('Morning kept', 'Gratitude and intention saved for today.');
    if(typeof haptic === 'function') haptic('success');
  }catch(_){ }

  const po=document.querySelector('.prayer-opts');if(po)po.style.display='none';
  const dc=document.getElementById('morning-complete-direct');if(dc)dc.style.display='none';
  checkMilestones();
  // Refresh the home anchor so "Your next step" advances past the morning immediately.
  if(typeof renderNextStep==='function') renderNextStep();
  if(typeof renderHomeCalendar==='function') renderHomeCalendar();
}
function initMorningTab(){
  try{ renderMorningLightCard(); }catch(_){}   // so the card stops asking once they have been out
  if(typeof applyFaithMorning === 'function') applyFaithMorning();
  if(typeof renderMorningLiturgy === 'function') renderMorningLiturgy();
  // The one fused thing the morning gives back: today's schedule + whether you're likely training
  // (from your own history) + how to meet it given your readiness. Silent when it has nothing true.
  if(typeof renderMorningDayAhead === 'function') renderMorningDayAhead();
  const h=new Date().getHours();
  const el=document.getElementById('morning-eyebrow');
  if(el)el.textContent=(h<12?'Good morning':h<17?'Good afternoon':'Good evening')+(userName?', '+userName:'');
  const today=ls('totry_mornings');
  if(today&&today.length>0&&today[0].day===getDayCount()){
    document.getElementById('morning-done').style.display='block';
  if(typeof morningFinished==='function') morningFinished();

    const po=document.querySelector('.prayer-opts');if(po)po.style.display='none';
    const dc=document.getElementById('morning-complete-direct');if(dc)dc.style.display='none';
    if(today[0].gratitude)document.getElementById('morning-gratitude').value=today[0].gratitude;
    if(today[0].intention)document.getElementById('morning-intention').value=today[0].intention;
  }
  
  // ── Adaptive yesterday response ──
  renderAdaptiveMorning();
}

function renderAdaptiveMorning(){
  const card = document.getElementById('morning-adaptive-card');
  const tag = document.getElementById('morning-adaptive-tag');
  const headline = document.getElementById('morning-adaptive-headline');
  const body = document.getElementById('morning-adaptive-body');
  if(!card || !tag || !headline || !body) return;
  
  // Look at yesterday's data
  const yesterdayKey = new Date(Date.now() - 86400000).toLocaleDateString('en-AU');
  const evenings = ls('totry_evenings') || [];
  // Match on the CALENDAR day already computed two lines up, not on a day NUMBER. e.day is written
  // from getDayCount() at the time the evening was saved, so any day the person did not open the app
  // shifts every later match — and the morning card then quotes a different night's reflection back
  // to them as if it were last night's. yesterdayKey was computed and never used.
  const yEvening = evenings.find(e => (e.ts && new Date(e.ts).toLocaleDateString('en-AU') === yesterdayKey)
                                      || e.date === yesterdayKey);
  
  // Yesterday's habits
  loadH();
  const yIdx = (tIdx() - 1 + 7) % 7;
  // ONLY THE HABITS THAT WERE DUE. v565 taught the home row about h.pw and this card never heard: a
  // person whose one habit is "Gym session, 3 days a week" opened the app on a REST morning and was
  // met with "You skipped your habits yesterday. No shame — but notice it." — while the row below said
  // "3 of 3 \u2713 this week". It also cost them the other direction: the "Yesterday was a strong day"
  // branch needs done === total, which a rest day can never satisfy. A day a habit is not due is not a
  // day it was skipped, and this card is the first thing the app says in the morning.
  const _dueDaily = habits.filter(h => !(h && h.pw >= 1 && h.pw <= 6));
  const yHabitsDone = _dueDaily.filter(h => h.d[yIdx] === 1).length;
  const yHabitsTotal = _dueDaily.length;
  
  // Vices: any recent relapses?
  loadV();
  const recentRelapses = vices.filter(v => {
    if(!v.startDate) return false;
    const daysSince = (Date.now() - new Date(v.startDate).getTime()) / 86400000;
    return daysSince < 2 && (v.relapseCount || 0) > 0; // Reset within last 48h
  });
  
  // Yesterday's evening rating (1-5)
  const yRating = yEvening?.rating || 0;
  
  // DAY ONE HAS NO YESTERDAY — and neither does a Monday. This card reads the seven-slot habit ring
  // (h.d, Mon..Sun) and then speaks about "yesterday". But a person on day 1 did not have a yesterday
  // here, and on a MONDAY loadH()'s week-roll has just zeroed the whole ring, so slot 6 is the Sunday
  // that has not happened yet. Both read as "0 of N done", and the app opened with "You skipped your
  // habits yesterday" — an accusation about a day that never existed. The habit grid already knows
  // the ring cannot see before Monday (see `knowable = Math.min(6, ti)`); this card did not.
  const _daysHere = (typeof daysInstalled === 'function') ? daysInstalled() : 1;
  const _yKnown = _daysHere >= 2 && tIdx() >= 1;   // tIdx: Mon=0, so on Monday there is no in-ring yesterday

  // Pick the most resonant message
  let tagText = '', headlineText = '', bodyText = '';

  if(_daysHere <= 1){
    // The first morning. Nothing is behind them — saying otherwise makes the app's first sentence false.
    tagText = 'Day one';
    const _v1 = activeVerses()[_dailyIndex(activeVerses().length)];
    headlineText = '“' + _v1.t + '” — ' + _v1.r;
    bodyText = 'This is your first morning here — nothing behind you to answer for. Set one intention below, and let that be the whole of today.';
  }
  else if(recentRelapses.length > 0){
    // Most recent relapse — speak with grace
    const v = recentRelapses[0];
    // "within 48h" includes THIS MORNING, so this said "yesterday" about a restart made an hour ago.
    const _rd = Math.max(0, Math.round((new Date().setHours(0,0,0,0) - new Date(v.startDate).setHours(0,0,0,0)) / 86400000));
    const _rwhen = _rd <= 0 ? 'today' : (_rd === 1 ? 'yesterday' : _rd + ' days ago');
    tagText = (_rd <= 0 ? 'Today' : 'Yesterday') + ' — grace';
    headlineText = '"The righteous fall seven times and rise again." — Proverbs 24:16';
    bodyText = 'You restarted ' + v.n + ' ' + _rwhen + '. That\'s not the end — it\'s the next attempt. Today, the same fight. Same Lord. Same grace. You\'re back at it. That\'s what counts.';
  }
  else if(_yKnown && yEvening && yRating >= 4 && yHabitsDone === yHabitsTotal && yHabitsTotal > 0){
    // Perfect day yesterday — challenge them
    tagText = 'Yesterday — locked in';
    headlineText = 'Yesterday was a strong day.';
    bodyText = 'You hit ' + yHabitsDone + '/' + yHabitsTotal + ' habits and rated it ' + ['','rough','hard','okay','good','strong'][yRating] + '. The challenge today: don\'t coast on yesterday\'s win. Do one thing harder than you did then.';
  }
  else if(yEvening && yRating <= 2){
    // Rough day yesterday — encourage
    tagText = 'Yesterday — hard';
    headlineText = 'Yesterday was rough. Today is new.';
    bodyText = (yEvening.release ? 'You wrote: "' + yEvening.release + '". ' : '') + 'You don\'t have to carry it forward. New mercies this morning (Lamentations 3:23). Start small today — one habit, one win, one prayer.';
  }
  else if(_yKnown && yHabitsTotal > 0 && yHabitsDone === 0){
    // Skipped everything yesterday
    tagText = 'Yesterday — missed';
    headlineText = 'You skipped your habits yesterday.';
    bodyText = 'No shame — but notice it. Pick the one habit that matters most today and just do that one. Build momentum from the smallest possible action.';
  }
  else if(_yKnown && yHabitsTotal > 0 && yHabitsDone < yHabitsTotal / 2){
    // Half-effort yesterday
    tagText = 'Yesterday — partial';
    headlineText = 'Yesterday was half there.';
    bodyText = 'You hit ' + yHabitsDone + '/' + yHabitsTotal + ' habits. Today, finish the ones you missed. The smallest action beats the best intention.';
  }
  else if(!yEvening){
    // No evening reflection yesterday
    tagText = 'A new day';
    { const _v = activeVerses()[_dailyIndex(activeVerses().length)]; headlineText = '“' + _v.t + '” — ' + _v.r; }
    bodyText = 'You didn\'t reflect last night — that\'s okay. The day in front of you matters more than the one behind. Set your intention below.';
  }
  else {
    // Default morning, decent day yesterday
    tagText = 'A new day';
    const _av = activeVerses();
    const v = _av[_dailyIndex(_av.length)];
    headlineText = '“' + v.t + '” — ' + v.r;
    bodyText = 'Set your intention below. Make today a day you\'d be proud to reflect on tonight.';
  }
  
  tag.textContent = tagText;
  headline.textContent = headlineText;
  body.textContent = bodyText;
  card.style.display = 'block';
}

// ── AFFIRMATIONS ──────────────────────────────────────────────
const DEFAULT_AFFIRMS=[
  "I am becoming who God made me to be.",
  "I am not my past. I am my choices today.",
  "Every day I try is a day I grow.",
  "I am stronger than this urge.",
  "Progress, not perfection.",
];
// TWO STORES, ONE MEANING. The "Your why" page writes what a person types into `totry_affirmations`;
// an older editor writes `totry_affirms`, and every surface that SPEAKS them back read only the latter.
// So somebody wrote the sentence they most needed to hear, and the app never said it to them once.
// One accessor over both, newest input first. Defaults only when the person has written nothing —
// their own words should never be crowded out by ours.
function getAffirmations(){
  try{
    const own = [].concat(ls('totry_affirmations') || [], ls('totry_affirms') || [])
                  .filter(x => typeof x === 'string' && x.trim());
    return own.length ? own : DEFAULT_AFFIRMS;
  }catch(_){ return DEFAULT_AFFIRMS; }
}
function showMorningAffirm(){
  const affirms=getAffirmations();if(!affirms.length)return;
  const el=document.getElementById('morning-affirm-text');
  if(el)el.textContent=affirms[getDayCount()%affirms.length];
}
