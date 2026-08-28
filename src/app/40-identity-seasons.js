// ═══════════════════════════════════════════════════
// IDENTITY LAYER — Stage 3
// ═══════════════════════════════════════════════════

// ── IDENTITY ──────────────────────────────────────────────────
function renderIdentity(){
  const id=ls('totry_identity');
  const el=document.getElementById('identity-text');
  const labelEl=document.querySelector('.identity-strip .id-label');
  if(!el)return;
  if(id){
    // Identity set - show with highlighted "becoming" phrase
    if(labelEl)labelEl.textContent='Who you are becoming';
    let txt=id;
    if(txt.toLowerCase().startsWith('i am becoming a person who')){
      const rest=txt.substring(26);
      txt='I am becoming a person who<em>'+rest+'</em>';
    }
    el.innerHTML=txt;
    // Evidence: reflect his own actions back as proof he's living into this identity.
    // Identity isn't just a sentence — it's reinforced by what he's actually done.
    const evEl=document.getElementById('identity-evidence');
    if(evEl){
      try{
        loadV();
        const wins=ls('totry_wins')||[];
        let totalClean=0;
        (vices||[]).forEach(v=>{ if(viceIsAbstinence(v)) totalClean += (v.cleanDaysTotal||0) + (typeof viceCleanDays==='function'?viceCleanDays(v):0); });
        const dayCount = (typeof getDayCount==='function') ? getDayCount() : 0;
        // The day count is already the persistent header badge on EVERY screen, it is in the coach's
        // sentence above this, and it is on the share button below it — four times on one screen. This
        // strip's job is the evidence nothing else carries: what the days were spent fighting for. The
        // number stays only when there is nothing else true to say.
        const bits=[];
        if(totalClean>0) bits.push(totalClean+' clean day'+(totalClean===1?'':'s')+' fought for');
        if(wins.length>0) bits.push(wins.length+' win'+(wins.length===1?'':'s')+' logged');
        if(!bits.length && dayCount>1) bits.push(dayCount+' days on the journey');
        if(bits.length){
          evEl.style.display='block';
          evEl.textContent='✓ '+bits.slice(0,2).join(' · ')+' — this is you, proving it.';
        } else {
          evEl.style.display='none';
        }
      }catch(e){ evEl.style.display='none'; }
    }
  }else{
    // No identity - check if user has affirmations and rotate through them
    const affirms=(typeof getAffirmations==='function'?getAffirmations():(ls('totry_affirms')||[]));
    if(affirms.length){
      const today=new Date().toLocaleDateString('en-AU');
      const idx=Math.abs(hashStr(today))%affirms.length;
      const affirm=affirms[idx];
      if(labelEl)labelEl.textContent='Today\u2019s affirmation';
      el.innerHTML='<span style="color:var(--tx)">'+affirm+'</span>';
    }else{
      if(labelEl)labelEl.textContent='Who you are becoming';
      el.innerHTML='<span class="id-empty">You already know the person you want to be. Name them \u2014 then we build the system to get you there.</span>';
    }
  }
}

function hashStr(s){
  let h=0;
  for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}
  return h;
}

function saveIdentity(){
  const v=document.getElementById('settings-identity');
  if(!v)return;
  const text=v.value.trim();
  if(!text){showToast('Empty','Write what you are becoming first.');return;}
  // Auto-prefix if user did not include
  const lower=text.toLowerCase();
  let full;
  if(lower.startsWith('i am becoming a person who')){
    full=text;
  }else if(lower.startsWith('who ')){
    full='I am becoming a person '+text;
  }else{
    full='I am becoming a person who '+text.replace(/^who /i,'');
  }
  ls('totry_identity',full);
  renderIdentity();
  showToast('Identity saved','This is who you are becoming.');
}
// Set/edit "who you're becoming" right where it's shown — no hunting through Settings. Used by the
// morning's identity line so its empty state invites and acts, instead of pointing elsewhere.
function editIdentity(){
  const cur = (ls('totry_identity')||'').replace(/^I am becoming a person who /i,'');
  if(typeof openFormModal!=='function'){ if(typeof go==='function') go('settings'); return; }
  openFormModal('Who you’re becoming','Finish the sentence. This is the person today is for — you can change it anytime.',[{id:'identity',label:'I am becoming a person who…',type:'text',placeholder:'keeps their promises, even to themselves',value:cur}],'Save',(vals)=>{
    const t=(vals.identity||'').trim(); if(!t) return 'Just name one thing.';
    const lower=t.toLowerCase();
    const full = lower.startsWith('i am becoming a person who') ? t : (lower.startsWith('who ') ? ('I am becoming a person '+t) : ('I am becoming a person who '+t.replace(/^who /i,'')));
    ls('totry_identity',full);
    if(typeof renderIdentity==='function') renderIdentity();
    if(typeof showMorningFocus==='function') showMorningFocus();
    if(typeof showToast==='function') showToast('Identity saved','This is who you are becoming.');
    return true;
  });
}

// ── SEASONS ───────────────────────────────────────────────────
const SEASONS={
  Fighting:{emoji:'&#x2694;&#xfe0f;',desc:'In the trenches. Daily battle with vices, urges, old patterns.'},
  Rebuilding:{emoji:'&#x1f527;',desc:'Coming back after a hard period. Picking up pieces and getting steady again.'},
  Building:{emoji:'&#x1f9f1;',desc:'Stable now. Stacking habits, growing, going from okay to great.'},
  Celebrating:{emoji:'&#x1f389;',desc:'Things are clicking. Wins are real. Keeping momentum.'},
  Grieving:{emoji:'&#x1f494;',desc:'Loss, heartbreak, or pain you are carrying. Survival mode is okay.'},
  Resting:{emoji:'&#x1f338;',desc:'Recovering. Not pushing. This is also part of becoming.'}
};


function renderSeasonSettings(){
  const container=document.getElementById('settings-seasons');
  if(!container)return;
  const current=ls('totry_season')||'Building';
  container.innerHTML='';
  Object.entries(SEASONS).forEach(([name,data])=>{
    const chip=document.createElement('div');
    chip.className='season-chip'+(name===current?' on':'');
    chip.innerHTML='<div class="sc-name">'+data.emoji+' '+name+'</div><div class="sc-desc">'+data.desc+'</div>';
    chip.onclick=()=>{
      ls('totry_season',name);
      renderSeasonSettings();
      showToast('Season set',name+' — the app will speak to you accordingly.');
    };
    container.appendChild(chip);
  });
}

// ── DAILY CHECK-IN ────────────────────────────────────────────
function maybeShowCheckin(){
  const today=new Date().toLocaleDateString('en-AU');
  const last=ls('totry_checkin_last');
  if(last===today)return;
  const skip=ls('totry_checkin_skip');
  if(skip===today)return;
  const strip=document.getElementById('daily-checkin');
  if(strip)strip.style.display='block';
}

function skipCheckin(){
  ls('totry_checkin_skip',new Date().toLocaleDateString('en-AU'));
  const strip=document.getElementById('daily-checkin');
  if(strip)strip.style.display='none';
}

function saveCheckin(){
  // Read from data attrs (new tap-to-pick UI)
  const phys = document.querySelector('.ci-dot-row[data-target="physical"]');
  const emot = document.querySelector('.ci-dot-row[data-target="emotional"]');
  const spir = document.querySelector('.ci-dot-row[data-target="spiritual"]');
  const p = parseInt(phys?.dataset.value || 0);
  const e = parseInt(emot?.dataset.value || 0);
  const s = parseInt(spir?.dataset.value || 0);
  if(!p || !e || !s){
    showToast('Quick tap','Pick a value for each before saving.');
    return;
  }
  haptic('success');
  const today=new Date().toLocaleDateString('en-AU');
  const prevCheckins = ls('totry_checkins') || [];
  const prevLast = ls('totry_checkin_last');
  const checkins=[...prevCheckins];
  checkins.unshift({date:today,ts:new Date().toISOString(),physical:p,emotional:e,spiritual:s,day:getDayCount()});
  ls('totry_checkins',checkins.slice(0,300)); // unified: was 90 here vs 300 elsewhere — the smaller cap deleted 210 check-ins
  ls('totry_checkin_last',today);
  const strip=document.getElementById('daily-checkin');
  if(strip)strip.style.display='none';
  // Show undo
  showUndo('Check-in saved', () => {
    ls('totry_checkins', prevCheckins);
    if(prevLast === null || prevLast === undefined) localStorage.removeItem('totry_checkin_last');
    else ls('totry_checkin_last', prevLast);
    if(strip)strip.style.display='block';
  });
}

// ── DUAL STREAKS ──────────────────────────────────────────────
// Sober streak — longest CURRENT clean streak across all vices.
// Each vice has its own clean count. The home-screen number reflects whichever
// vice you're doing best on right now — so relapsing on one doesn't erase
// progress on another. Per-vice detail lives in the Fight tab.
function getSoberStreak(){
  loadV();
  if(!vices||!vices.length){
    // No vices configured → count days since app start as best-effort.
    // CLAMPED AT THE SOURCE. If the device clock sits behind totry_start — a phone with the wrong
    // date, a restore from a device that was ahead, a flight across the date line — this went
    // negative and Home rendered "-27 · SOBER STREAK · Days clean": the app telling someone their
    // clean time is a debt. Every other elapsed-day count in this file is already clamped
    // (getDayCount, totalDaysTrying, viceCleanDays); this was the one that was not. An unparseable
    // date returns 0 too, so the card can never show NaN.
    const start=ls('totry_start');
    if(!start)return 0;
    const t=new Date(start).getTime();
    if(isNaN(t))return 0;
    return Math.max(0, Math.floor((Date.now()-t)/86400000));
  }
  // Return the longest CURRENT clean streak across all vices
  return Math.max(0, ...vices.map(v => viceCleanDays(v)));
}

function getResilienceStreak(){
  const start=ls('totry_start');
  if(!start)return 1;
  const today=new Date();today.setHours(0,0,0,0);
  let streak=0;let _graceUsed=false;
  for(let i=0;i<365;i++){
    const checkDate=new Date(today);
    checkDate.setDate(today.getDate()-i);
    const dateStr=checkDate.toLocaleDateString('en-AU');
    const hasActivity=
      ritualLog('totry_mornings').some(m=>new Date(m.ts).toLocaleDateString('en-AU')===dateStr)||
      ritualLog('totry_evenings').some(e=>new Date(e.ts).toLocaleDateString('en-AU')===dateStr)||
      (ls('totry_journal')||[]).some(j=>new Date(j.ts).toLocaleDateString('en-AU')===dateStr)||
      (ls('totry_workouts')||[]).some(w=>new Date(w.ts).toLocaleDateString('en-AU')===dateStr)||
      (ls('totry_checkins')||[]).some(c=>c.date===dateStr)||
      ls('totry_last_open')===dateStr;
    // NEVER MISS TWICE (Lally 2010): a single off day never breaks the chain, but two IN A ROW does.
    // The allowance resets on every day they showed up — so it forgives each isolated gap, not just
    // the first one in the whole history.
    if(hasActivity){ streak++; _graceUsed=false; }
    else if(i===0)continue;                              // today not logged yet — that's fine
    else if(!_graceUsed){ _graceUsed=true; continue; }   // one missed day: forgiven
    else break;                                          // two in a row: the stretch ends
  }
  return Math.max(streak,1);
}

function renderDualStreaks(){
  // The longest fight, not the longest clean streak — the streak is already on the nav card above.
  // Falls back to the streak for anyone whose vices predate fightingSince having a value.
  const sober=(function(){
    try{
      loadV();
      let d=0;
      (vices||[]).forEach(v=>{ const n=(typeof viceFightDays==='function')?viceFightDays(v):0; if(n>d) d=n; });
      return d || getSoberStreak();
    }catch(_){ return getSoberStreak(); }
  })();
  const resilience=getResilienceStreak();
  const sEl=document.getElementById('streak-sober');
  const rEl=document.getElementById('streak-resilience');
  if(sEl)sEl.textContent=sober;
  if(rEl)rEl.textContent=resilience;
  // The one number a slip can't take away: every time you came here and rode it out.
  try{
    const el=document.getElementById('urges-survived');
    if(el){
      const n=(ls('totry_moments_won')||[]).length;
      if(n>0){
        el.style.display='block';
        el.innerHTML='<span style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);letter-spacing:0.05em">'+
          '<b style="color:var(--go)">'+n+'</b> urge'+(n===1?'':'s')+' ridden out, all time — that’s skill, and nothing resets it</span>';
      } else { el.style.display='none'; el.innerHTML=''; }
    }
  }catch(_){}
  // The tile counts the FIGHT now, not the clean streak, so "Days clean" here was relabelling the
  // number under it — 106 days in the fight, described as 106 days clean. The number never being 0
  // is also why the old "A fresh start" reframe is gone: a fight does not reset, so it has no zero
  // to soften. The clean streak still lives on the nav card above, where it always did.
  try{ const ss=document.querySelector('.streak-card.sober .streak-sub'); if(ss) ss.textContent='Days in'; }catch(_){}
}

function showResilienceInfo(){
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-size:16px;font-weight:500;color:var(--bl);margin-bottom:10px">What is resilience streak?</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:14px">'+
    '<strong style="color:var(--tx)">Sober streak</strong> resets to zero if you relapse. That is honest.<br><br>'+
    '<strong style="color:var(--bl)">Resilience streak</strong> counts the days you showed up and tried, regardless of outcome — and it is built with grace: <strong>one missed day won’t break it</strong>. Miss two in a row and it starts again. One off day is being human, not failing.<br><br>'+
    'Both matter. The first measures sobriety. The second measures the person you are becoming. Relapse breaks the first. Giving up breaks the second.<br><br>'+
    'Being straight with you: because one off day is forgiven, this number isn’t a claim that you were perfect every single day — it’s the length of the stretch you’ve kept coming back in. (Sobriety stays strictly honest: a relapse does reset the sober count — but never your resilience, and never the total days you’ve been trying.) And real habits take about <strong>66 days</strong> to form, not 21 — so this is a long game, and you’re in it.<br><br>'+
    '<em style="color:var(--go);font-family:Cormorant Garamond,serif;font-size:15px">"I am not here because I made it. I am here because I am trying."</em>'+
    '</div>'+
    '<button class="btn primary" onclick="this.closest(\'.modal-bg\').remove()">Got it</button></div>';
  document.body.appendChild(m);
}

// ── PROMISE LOG ──────────────────────────────────────────────

function markPromise(id,status){
  const promises=ls('totry_promises')||[];
  const p=promises.find(p=>p.id===id);
  if(!p)return;
  p.status=status;
  p.resolvedAt=new Date().toISOString();
  ls('totry_promises',promises);
  renderPromises();
  if(status==='kept'){
    showToast('Promise kept','One more brick in who you are becoming.');
  }else{
    showToast('Honest','Acknowledging is the first step to keeping the next one.');
  }
}

function renderPromises(){
  const promises=ls('totry_promises')||[];
  const dueList=document.getElementById('promises-due');
  const list=document.getElementById('promises-list');
  if(!list||!dueList)return;
  const now=Date.now();
  const dueNow=promises.filter(p=>p.status==='pending'&&new Date(p.due).getTime()<=now);
  const pending=promises.filter(p=>p.status==='pending'&&new Date(p.due).getTime()>now);
  const resolved=promises.filter(p=>p.status!=='pending');

  // Due now
  if(dueNow.length){
    dueList.innerHTML='<div class="lbl" style="margin-bottom:6px;color:var(--go)">Time to check in</div>';
    dueNow.forEach(p=>{
      const card=document.createElement('div');
      card.className='promise-card pending';
      card.innerHTML='<div class="promise-text">"'+_escFew(p.text)+'"</div>'+
        '<div class="promise-meta">Made Day '+p.day+' · <span class="status">Did you keep this?</span></div>'+
        '<div class="promise-actions">'+
        '<button class="keep" onclick="markPromise('+p.id+',\'kept\')">Yes, I kept it</button>'+
        '<button class="break" onclick="markPromise('+p.id+',\'broken\')">No, I did not</button>'+
        '</div>';
      dueList.appendChild(card);
    });
  }else{
    dueList.innerHTML='';
  }

  // Active + history
  list.innerHTML='';
  if(pending.length){
    const hdr=document.createElement('div');
    hdr.className='lbl';
    hdr.textContent='Active promises';
    list.appendChild(hdr);
    pending.forEach(p=>{
      const dueDate=new Date(p.due).toLocaleDateString('en-AU',{day:'numeric',month:'short'});
      const card=document.createElement('div');
      card.className='promise-card pending';
      card.innerHTML='<div class="promise-text">"'+_escFew(p.text)+'"</div>'+
        '<div class="promise-meta">Made Day '+p.day+' · <span class="status">Due '+dueDate+'</span></div>';
      list.appendChild(card);
    });
  }
  if(resolved.length){
    const kept=resolved.filter(p=>p.status==='kept').length;
    const broken=resolved.filter(p=>p.status==='broken').length;
    const ratio=resolved.length>0?Math.round((kept/resolved.length)*100):0;
    const hdr=document.createElement('div');
    hdr.className='lbl';
    hdr.innerHTML='History · <span style="color:var(--gr);text-transform:none;letter-spacing:0">'+kept+' kept</span> · <span style="color:var(--re);text-transform:none;letter-spacing:0">'+broken+' broken</span> · '+ratio+'% kept';
    list.appendChild(hdr);
    resolved.slice(0,10).forEach(p=>{
      const card=document.createElement('div');
      card.className='promise-card '+p.status;
      card.innerHTML='<div class="promise-text">"'+_escFew(p.text)+'"</div>'+
        '<div class="promise-meta">Day '+p.day+' · <span class="status">'+p.status+'</span></div>';
      list.appendChild(card);
    });
  }
  if(!pending.length&&!resolved.length&&!dueNow.length){
    list.innerHTML='<p class="empty-note">No promises logged yet.<br>The first one is always the hardest.</p>';
  }
}

// ── SABBATH MODE (Sundays only) ───────────────────────────────
function applySabbathMode(){
  const today=new Date();
  const isSunday=today.getDay()===0;
  const app=document.querySelector('.app');
  if(app)app.classList.toggle('sabbath-mode',isSunday);
}

// ── EXTEND setReflectTab for promises ─────────────────────────
// setReflectTab promises panel handled in main function above

// The "would they see" answer is now saved directly on the evening record (entry.see) inside
// completeEvening — synced, shown back in the journal, and fed to the brother's context. The old
// wrapper that siloed it in an unread, unsynced totry_honest_q store has been retired.

// ── HOOK INTO initSettingsTab for identity + seasons ──────────
if(typeof initSettingsTab==='function'){
  const _origInitSettings=initSettingsTab;
  window.initSettingsTab=function(){
    _origInitSettings();
    setTimeout(()=>{
      const id=ls('totry_identity')||'';
      const v=id.replace(/^i am becoming a person who /i,'');
      const idEl=document.getElementById('settings-identity');
      if(idEl)idEl.value=v;
      renderSeasonSettings();
    },60);
  };
}

// ── HOOK INTO buildCtx for coach awareness of identity + season ──
if(typeof buildCtx==='function'){
  const _origBuildCtx=buildCtx;
  window.buildCtx=function(){
    const baseCtx=_origBuildCtx();
    const identity=ls('totry_identity')||'';
    const season=ls('totry_season')||'Building';
    // Only the mood rows carry physical/emotional/spiritual — the morning sleep tap writes
  // {kind:'sleep', scores:{…}} into the same store, and taking [0] blindly made that the
  // person's "most recent state".
  const checkins=(ls('totry_checkins')||[]).filter(c => c && c.physical!=null);
    const recent=checkins[0];
    let extras='';
    if(identity)extras+='\nIDENTITY: '+identity;
    if(season&&SEASONS[season])extras+='\nSEASON: '+season+' — '+SEASONS[season].desc;
    if(recent)extras+='\nLAST CHECK-IN ('+recent.date+'): Physical '+recent.physical+'/10, Emotional '+recent.emotional+'/10, Spiritual '+recent.spiritual+'/10';
    return baseCtx+extras+'\nWhen relevant, reference their identity statement and adapt your tone to their current season. Someone in Grieving needs different words than someone in Celebrating.';
  };
}

// ── HOOK INTO go() to refresh home identity elements ─────────
if(typeof go==='function'){
  const _origGoForIdentity=go;
  window.go=function(name){
    _origGoForIdentity(name);
    if(name==='morning'){
      maybeShowCheckin();
    }
    if(name==='home'){
      renderIdentity();
      renderDualStreaks();
      applySabbathMode();
    }
  };
}

// ── HOOK INTO initApp ─────────────────────────────────────────
if(typeof initApp==='function'){
  const _origInitApp=initApp;
  // initApp is async. This used to call it WITHOUT awaiting, then immediately run the four renderers
  // below — so they read state the original had not finished assembling yet, and every caller that does
  // `await initApp()` was really only awaiting the wrapper. Await it, and keep the wrapper async so the
  // boot paths that await it still get a settled app.
  window.initApp=async function(){
    try{ await _origInitApp(); }catch(e){ console.warn('[initApp]', e); }
    try{ renderIdentity(); }catch(_){}
    try{ renderDualStreaks(); }catch(_){}
    try{ applySabbathMode(); }catch(_){}
    setTimeout(maybeShowCheckin,2000);
  };
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (e) => {
  const target = (e.state && e.state.tab) ? e.state.tab : 'home';
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current');});
  const tab=document.getElementById('tab-'+target);
  if(tab)tab.classList.add('active');
  const navName = TABS.includes(target) ? target : (TAB_PARENT[target] || 'home');
  const navIdx = TABS.indexOf(navName);
  if(navIdx>=0){const _nb=document.querySelectorAll('.nb')[navIdx]; if(_nb){_nb.classList.add('active'); _nb.setAttribute('aria-current','page');}}
  if(typeof updateHubBackBar==='function') updateHubBackBar(target);
});

// Set initial history state to home
if(!history.state){
  try{ history.replaceState({tab:'home'}, '', '#home'); }catch(e){}
}


