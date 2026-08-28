// ── JOURNAL ───────────────────────────────────────────────────
let curMood='&#128528;';
const PROMPTS=[
  'What was the hardest moment today and how did you handle it?','What did you choose well today, even if it was small?',
  'What is one thing you want to do differently tomorrow?','How did your faith show up \u2014 or not \u2014 today?',
  'What vice tried to take hold today and what happened?','What are you most grateful for right now?',
  'What does the person you\'re becoming look like today?','What fear are you still carrying that you need to let go?',
  'Where did God show up today, even in something small?','What would you tell yourself from a month ago?',
  'What does winning actually look like for you today?','Who are you doing this for, really?',
  'What is the one thing you\'re avoiding that you know you need to face?','How did your body feel today and what does that tell you?',
  'What does discipline feel like right now \u2014 punishment or identity?','What is the difference between who you were and who you\'re becoming?',
  'What do you need to forgive yourself for today?','What would you do tomorrow if you weren\'t afraid?',
  'If someone watched your whole day on replay, what would they see?','What promise did you keep today, even a small one?',
];
function openJournal(){
  curMood='&#128528;';
  document.querySelectorAll('.mood-btn').forEach(b=>b.classList.remove('on'));
  document.getElementById('journal-text').value='';
  document.getElementById('j-urges').value='';
  document.getElementById('j-wins').value='';
  const day=getDayCount();
  document.getElementById('journal-prompt').textContent='Day '+day+' \u2014 '+PROMPTS[day%PROMPTS.length];
  document.getElementById('journal-modal').classList.add('open');
}

// ── UNIVERSAL QUICK-JOURNAL (floating button) ─────────────────
// One-tap entry from anywhere in the app. Mood + 1 textarea + Save.
// Same data shape as the full journal so entries appear in the main list.
let _qjMood = '\u{1F642}';
function openQuickJournal(){
  _qjMood = '\u{1F642}';
  document.querySelector('.modal-bg.open')?.remove();
  
  const moods = ['\u{1F60A}','\u{1F642}','\u{1F610}','\u{1F614}','\u{1F62D}','\u{1F621}','\u{1F914}','\u{1F525}'];
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:80vh"><div class="modal-handle"></div>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em">Quick journal · Day ' + getDayCount() + '</div>' +
    '</div>' +
    '<h3 style="margin-bottom:6px">Get it out</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:12px;line-height:1.55">Drop a thought, a feeling, what just happened. Saves straight to your journal.</p>' +
    
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">How am I right now</div>' +
    '<div id="qj-mood-grid" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">' +
      moods.map((mo, i) => '<button type="button" class="qj-mood-btn' + (i === 1 ? ' on' : '') + '" data-mood="' + mo + '" onclick="setQuickMood(this)" style="font-size:24px;width:44px;height:44px;background:var(--bg3);border:1px solid var(--bd);border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s">' + mo + '</button>').join('') +
    '</div>' +
    
    '<textarea id="qj-text" placeholder="What\'s going on..." style="min-height:120px;font-size:16px;line-height:1.6;margin-bottom:14px" autofocus></textarea>' +
    '<button class="btn primary" onclick="saveQuickJournal()" style="margin-bottom:8px">Save entry</button>' +
    '<button class="btn" onclick="closeModal(this)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
  
  // Style the selected mood
  setTimeout(() => {
    const onBtn = m.querySelector('.qj-mood-btn.on');
    if(onBtn){ onBtn.style.background = 'var(--go)'; onBtn.style.borderColor = 'var(--go)'; }
    document.getElementById('qj-text')?.focus();
  }, 50);
}

function setQuickMood(btn){
  _qjMood = btn.dataset.mood;
  document.querySelectorAll('.qj-mood-btn').forEach(b => {
    b.classList.remove('on');
    b.style.background = 'var(--bg3)';
    b.style.borderColor = 'var(--bd)';
  });
  btn.classList.add('on');
  btn.style.background = 'var(--go)';
  btn.style.borderColor = 'var(--go)';
}

const JOURNAL_MAX = 20000;   // ~4,000 words. Long enough for anything real, short enough to not eat the device.
// Wins logged TODAY, from the dated record. Both journal writers used to compute
//   todayWins = (sum of every vice's lifetime w) - (ls('totry_wins_yesterday') || 0)
// and nothing in the app has ever written totry_wins_yesterday — zero write sites. So prevWins was
// always 0 and every journal entry was stamped with the person's LIFETIME win total as if it were that
// day's: someone 200 wins in wrote "47 wins" on a day they won twice. totry_fight_log is the honest
// dated record (each entry carries won + ts + date), so count from that instead of a phantom baseline.
function _winsOnDay(dayKey){
  try{
    const key = dayKey || new Date().toLocaleDateString('en-AU');
    return (ls('totry_fight_log')||[]).filter(function(e){
      if(!e || e.won !== true) return false;
      if(e.date === key) return true;
      if(e.ts){ try{ return new Date(e.ts).toLocaleDateString('en-AU') === key; }catch(_){ return false; } }
      return false;
    }).length;
  }catch(_){ return 0; }
}
function saveQuickJournal(){
  let text = document.getElementById('qj-text')?.value.trim();
  if(!text){ showToast('Empty', 'Write a few words first.'); return; }
  let _trimmed = false;
  if(text.length > JOURNAL_MAX){ text = text.slice(0, JOURNAL_MAX); _trimmed = true; }
  
  loadV();
  const todayKey = new Date().toLocaleDateString('en-AU');
  const autoUrges = vices.reduce((a,v) => a + (v.urgelog || []).filter(t => new Date(t).toLocaleDateString('en-AU') === todayKey).length, 0);
  const todayWins = _winsOnDay(todayKey);
  
  // "Get it out" is the fastest way into this app's journal and it had NO gate: someone typing the
  // hardest sentence of their life got "Saved \u2014 In your journal." and nothing else.
  const _qjCrisis = journalCrisisOf(text);

  const entries = ls('totry_journal') || [];
  entries.unshift({
    date: new Date().toLocaleDateString('en-AU', {weekday:'long', day:'numeric', month:'short', year:'numeric'}),
    ts: new Date().toISOString(),
    day: getDayCount(),
    mood: _qjMood,
    text: text,
    flagged: !!_qjCrisis,
    urges: autoUrges,
    wins: todayWins,
    quick: true
  });
  ls('totry_journal', entries.slice(0, 1200)); // was an inconsistent 90 here vs 365 elsewhere — unified to a years-long cap
  
  document.querySelector('.modal-bg.open')?.remove();
  if(typeof renderJournal === 'function') renderJournal();
  // Saved first, above \u2014 then met. Never celebrate over a disclosure.
  // Tell them their words were cut BEFORE the bridge takes over the screen. The crisis return sits above
  // the only line that honours _trimmed, so someone who wrote past the cap and ended on a disclosure had
  // their text silently truncated and was never told — at the one moment every word mattered most.
  if(_trimmed && _qjCrisis && typeof showToast==='function'){
    showToast('Saved', 'In your journal \u2014 though it was very long, so the last part was trimmed.');
  }
  if(journalMeetCrisis(_qjCrisis)) return;
  // Never trim someone's words without telling them.
  showToast('Saved', _trimmed ? 'In your journal \u2014 though it was very long, so the last part was trimmed.' : 'In your journal.');
  haptic('success');
}


function setMood(btn,mood){curMood=mood;document.querySelectorAll('.mood-btn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');}
// Resolve an optional backdate <input type="date"> into the {ts,date,day} an entry expects.
// If blank or invalid, falls back to right now — so normal entries behave exactly as before.
function _resolveEntryDate(inputId){
  const el = document.getElementById(inputId);
  const v = el && el.value ? el.value.trim() : '';
  let d;
  if(v && /^\d{4}-\d{2}-\d{2}$/.test(v)){
    // Anchor to local noon so the date can't slip a day from timezone math.
    d = new Date(v + 'T12:00:00');
    if(isNaN(d.getTime())) d = new Date();
  } else { d = new Date(); }
  const now = new Date();
  if(d.getTime() > now.getTime()) d = now;           // never allow a future date
  return {
    ts: d.toISOString(),
    date: d.toLocaleDateString('en-AU', {weekday:'long', day:'numeric', month:'short', year:'numeric'}),
    day: (typeof getDayCountForDate === 'function') ? getDayCountForDate(d) : getDayCount(),
    backdated: !!v
  };
}
// THE ONLY JOURNAL READER ANY AI PATH MAY USE.
// v439 gated saveEntry, marked the entry flagged, and its comment named all three downstream leaks by
// name — "buildCtx's RECENT JOURNAL on every coach message, the morning prompt, and the weekly synthesis"
// — then claimed "it is marked so it never becomes AI context again". Only buildCtx was actually filtered.
// showAIMorningSentence took entry [0], the NEWEST one, which is precisely the entry just flagged, and
// generateWeeklySynthesis filtered by date but not by flag. Both run unconditionally on every Home tap.
// A person wrote the worst sentence they will ever type, got the crisis card, tapped Today — and the app
// sent that sentence to a third-party model twice. Proven by capturing the outbound request body.
//
// So the fix is not three filters, it is ONE ACCESSOR. Any path that feeds a model reads through this;
// forgetting it is now a visible choice rather than an oversight.
// The morning ritual's equivalent of safeJournal(). v463 made completeMorning PERSIST a flagged row
// instead of discarding the person's words — right, and it created a store that can now hold a
// disclosure. Two readers were filtered at the time (buildCtx and getLifeState) and the others were not,
// so the companion's prompt still shipped it to a model, and _wholeLifeReframe quoted it back mid-urge
// as "This morning you said…" — turning the worst sentence someone wrote into their stated aspiration.
//
// Fixing readers one at a time is what produced this; there are twenty-two of them. Anything that sends
// a morning anywhere — a model, or back to the person as encouragement — uses this. Counts, dates and
// streaks may keep using the raw store: they never surface the words.
function safeMornings(){
  try{ return (ls('totry_mornings') || []).filter(function(m){ return m && !m.flagged; }); }
  catch(_){ return []; }
}
function safeJournal(){
  try{ return (ls('totry_journal') || []).filter(function(e){ return e && !e.flagged; }); }
  catch(_){ return []; }
}

// ── THE JOURNAL CONTRACT, IN ONE PLACE ───────────────────────────────────────────────────────────
// FOUR surfaces write to totry_journal: the full journal (saveEntry), the quick "get it out" note
// (saveQuickJournal), the letting-go door (_letGoSaveJournal, placeholder "I miss…") and a reading-plan
// answer (_planAnswerSave, prompted with "However it comes out. Nobody reads this but you.").
// Only saveEntry gated. The other three saved a disclosure with a cheerful toast, left it UNFLAGGED —
// so safeJournal() above handed it to the model on the next request — and never showed anyone the
// bridge to real help. The two most likely places for a first disclosure were the two least guarded.
//
// Three copies of a gate are three things to remember; one is none. Same lesson as safeJournal() and
// geoCoarse(): make the safe path the only path.
//
// The contract, unchanged from saveEntry: the entry is ALWAYS saved, exactly as written. It is marked,
// never censored, never refused, never thrown back at the person. Grace over shame.
function journalCrisisOf(text){
  try{ return (typeof detectCrisis === 'function') ? detectCrisis(text) : null; }catch(_){ return null; }
}
// Call AFTER the entry is persisted. Returns true when it met the person, so the caller skips its
// ordinary success toast and any celebratory UI.
function journalMeetCrisis(kind){
  if(!kind) return false;
  try{
    // :not([id]) is load-bearing — #journal-modal, #payday-modal and #rest-timer-overlay are STATIC
    // elements carrying .modal-bg, and the bare selector deleted them from the DOM permanently.
    document.querySelectorAll('.modal-bg:not([id])').forEach(function(m){ m.remove(); });
    const m = document.createElement('div');
    m.className = 'modal-bg open';
    m.style.alignItems = 'center';
    m.innerHTML = '<div class="modal" style="max-width:92vw"><div class="modal-handle"></div>' +
      '<div id="jgate-crisis-slot"></div>' +
      '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12px;margin-top:10px">Close</button></div>';
    document.body.appendChild(m);
    if(typeof showCrisisResponse === 'function') showCrisisResponse('jgate-crisis-slot', kind);
  }catch(_){ }
  try{ if(typeof haptic === 'function') haptic('warning'); }catch(_){ }
  try{ if(typeof showToast === 'function') showToast('Saved', 'I read what you wrote. Please look at this.'); }catch(_){ }
  return true;
}

function saveEntry(){
  const text=document.getElementById('journal-text').value.trim();if(!text)return;
  // "Write honestly. This is just for you..." is an invitation to say the hardest thing, and this was the
  // one place that asked for it and then did nothing with it. No gate here, and the entry is fed back to
  // the AI three separate ways afterwards (buildCtx's RECENT JOURNAL on every coach message, the morning
  // prompt, and the weekly synthesis) — so a disclosure written here was quietly narrated to a model for
  // days. GRACE OVER SHAME: the entry is always saved, exactly as written. It is marked, not censored.
  let _jCrisis = null;
  try{ if(typeof detectCrisis === 'function') _jCrisis = detectCrisis(text); }catch(_){ }
  // Auto-pull vice stats from today's data
  loadV();
  const autoUrges=vices.reduce((a,v)=>a+(v.urgelog||[]).filter(t=>new Date(t).toLocaleDateString('en-AU')===new Date().toLocaleDateString('en-AU')).length,0);
  const todayWins=_winsOnDay();
  const entries=ls('totry_journal')||[];
  const when=_resolveEntryDate('journal-date');
  // If the user typed urge/win numbers, honour them (esp. useful when backdating a past day).
  const manualUrges=parseInt((document.getElementById('j-urges')||{}).value||'');
  const manualWins=parseInt((document.getElementById('j-wins')||{}).value||'');
  entries.push({date:when.date,ts:when.ts,day:when.day,mood:curMood,text,flagged:!!_jCrisis,urges:isNaN(manualUrges)?(when.backdated?0:autoUrges):manualUrges,wins:isNaN(manualWins)?(when.backdated?0:todayWins):manualWins,backdated:when.backdated});
  // Keep newest-first by timestamp so a backdated entry lands in the right place in the timeline.
  entries.sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  ls('totry_journal',entries.slice(0,1200)); // unified journal cap — reflections persist for years
  const dm=document.getElementById('journal-modal'); if(dm) dm.classList.remove('open');
  const di=document.getElementById('journal-date'); if(di) di.value='';
  renderJournal();
  // If they wrote something serious, stop and meet them. The entry is already saved above — nothing they
  // wrote is refused or thrown back at them — and it is marked so it never becomes AI context again.
  if(_jCrisis){
    try{
      document.querySelectorAll('.modal-bg:not([id])').forEach(function(m){ m.remove(); });  /* :not([id]) is load-bearing. #journal-modal, #payday-modal and #rest-timer-overlay are STATIC elements that carry .modal-bg, so the bare selector deleted them from the DOM permanently. Three of these four sites are crisis paths I added in v434/v439 — meaning that after a person disclosed something serious, openJournal() threw on its first line ('Cannot set properties of null') and the journal composer was dead for the rest of the session. I diagnosed this exact symptom earlier as MY TEST's fault, which it also was; I did not check whether the shipped code did the same thing. It did. */
      const m = document.createElement('div');
      m.className = 'modal-bg open';
      m.style.alignItems = 'center';
      m.innerHTML = '<div class="modal" style="max-width:92vw"><div class="modal-handle"></div>' +
        '<div id="journal-crisis-slot"></div>' +
        '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12px;margin-top:10px">Close</button></div>';
      document.body.appendChild(m);
      if(typeof showCrisisResponse === 'function') showCrisisResponse('journal-crisis-slot', _jCrisis);
    }catch(_){ }
    if(typeof haptic==='function') haptic('warning');
    showToast('Saved', 'I read what you wrote. Please look at this.');
    return;
  }
  showToast(when.backdated?'Added':'Saved', when.backdated?('Backdated to '+when.date):'In your journal.');
}
function renderJournal(){
  const list=document.getElementById('journal-list');if(!list)return;
  // Unified timeline: journal entries + morning rituals + evening reflections, newest first,
  // so the whole inner life is reviewable in one place. Rituals are read-only here.
  const journal=(ls('totry_journal')||[]).map(e=>({kind:'journal', ts:e.ts||e.date, e}));
  const mornings=ritualLog('totry_mornings').map(m=>({kind:'morning', ts:m.ts, e:m}));
  const evenings=ritualLog('totry_evenings').map(v=>({kind:'evening', ts:v.ts, e:v}));
  const all=[...journal,...mornings,...evenings].sort((a,b)=>new Date(b.ts||0)-new Date(a.ts||0));
  if(!all.length){list.innerHTML='<div style="text-align:center;padding:40px 16px"><div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;font-style:italic;color:var(--tx3);margin-bottom:8px">Your journal is empty.</div><div style="font-size:13px;color:var(--tx3);line-height:1.6">Tap + New entry, or complete a morning or evening reflection \u2014 they all gather here.<br>Nobody else reads your journal. It is backed up to your account so a lost phone can\u2019t take it, and the coach sees a short excerpt so it can speak to what you\u2019re actually carrying. Settings \u2192 Your data says exactly what goes where.</div></div>';return;}
  list.innerHTML='';
  all.forEach(rec=>{
    const e=rec.e;
    const item=document.createElement('div');item.className='j-entry';
    if(rec.kind==='journal'){
      const wTag=e.wins>0?'<span class="je-tag w">+'+e.wins+' wins</span>':'';
      const lTag=e.urges>0?'<span class="je-tag l">'+e.urges+' battles</span>':'';
      const dTag=e.day?'<span class="je-tag">Day '+e.day+'</span>':'';
      item.innerHTML='<div class="je-date">'+_escFew(e.date||'')+'</div><div class="je-mood">'+_escFew(e.mood||'')+'</div><div class="je-prev">'+_escFew(String(e.text||'').slice(0,240))+'</div><div class="je-tags">'+dTag+wTag+lTag+'</div>';
      item.onclick=()=>{const m=document.createElement('div');m.className='modal-bg open';m.innerHTML='<div class="modal"><div class="modal-handle"></div><div style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--go);margin-bottom:8px;letter-spacing:0.1em">'+e.date+(e.day?' \u2014 Day '+e.day:'')+'</div><div style="font-size:28px;margin-bottom:12px">'+_escFew(e.mood||'')+'</div><div style="font-size:14px;line-height:1.75;color:var(--tx);white-space:pre-wrap;margin-bottom:16px">'+_escFew(e.text||'')+'</div><button class="btn" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx3);margin-bottom:8px" onclick="this.closest(\'.modal-bg\').remove();deleteJournalEntry(\''+String(e.ts||'').replace(/[\\'"\\\\]/g,'')+'\')">Delete this entry</button><button class="btn" onclick="this.closest(\'.modal-bg\').remove()">Close</button></div>';document.body.appendChild(m);};
    } else if(rec.kind==='morning'){
      const parts=[]; if(e.gratitude)parts.push('Grateful: '+_escFew(e.gratitude)); if(e.intention)parts.push('Intention: '+_escFew(e.intention));
      const hasContent = e.gratitude || e.intention;
      const preview = parts.join(' \u00b7 ') || (hasContent ? 'Morning ritual' : 'Morning completed \u2014 no notes written');
      item.innerHTML='<div class="je-date">'+(e.date||'')+'</div><div class="je-mood">\ud83c\udf05</div><div class="je-prev">'+preview+'</div><div class="je-tags"><span class="je-tag">Morning'+(e.day?' \u2014 Day '+e.day:'')+'</span></div>';
      item.onclick=()=>{const m=document.createElement('div');m.className='modal-bg open';
        const bodyHtml = hasContent
          ? ((e.gratitude?'<div style="font-size:13px;color:var(--tx3);margin-bottom:4px">One thing I was grateful for</div><div style="font-size:14px;line-height:1.7;color:var(--tx);margin-bottom:12px;white-space:pre-wrap">'+e.gratitude.replace(/</g,"&lt;")+'</div>':'')+(e.intention?'<div style="font-size:13px;color:var(--tx3);margin-bottom:4px">My intention</div><div style="font-size:14px;line-height:1.7;color:var(--tx);margin-bottom:16px;white-space:pre-wrap">'+e.intention.replace(/</g,"&lt;")+'</div>':''))
          : '<div style="font-size:14px;line-height:1.7;color:var(--tx3);font-style:italic;margin-bottom:16px">You completed your morning ritual this day, but didn\u2019t write a gratitude or intention. That\u2019s okay \u2014 showing up is what counts.</div>';
        m.innerHTML='<div class="modal"><div class="modal-handle"></div><div style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--go);margin-bottom:8px;letter-spacing:0.1em">'+(e.date||'')+' \u2014 Morning'+(e.day?', Day '+e.day:'')+'</div><div style="font-size:28px;margin-bottom:12px">\ud83c\udf05</div>'+bodyHtml+'<button class="btn" onclick="this.closest(\'.modal-bg\').remove()">Close</button></div>';document.body.appendChild(m);};
    } else {
      const RAT=['','Rough','Hard','Okay','Good','Strong'];
      const parts=[]; if(e.win)parts.push('Win: '+_escFew(e.win)); if(e.release)parts.push('Released: '+_escFew(e.release)); if(e.see)parts.push('Honest: '+_escFew(e.see));
      item.innerHTML='<div class="je-date">'+(e.date||'')+'</div><div class="je-mood">\ud83c\udf19</div><div class="je-prev">'+(parts.join(' \u00b7 ')||'Evening reflection')+'</div><div class="je-tags"><span class="je-tag">Evening'+(e.rating?' \u2014 '+RAT[e.rating]:'')+'</span>'+(e.steps?'<span class="je-tag">'+e.steps+' steps</span>':'')+'</div>';
      item.onclick=()=>{const m=document.createElement('div');m.className='modal-bg open';m.innerHTML='<div class="modal"><div class="modal-handle"></div><div style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--go);margin-bottom:8px;letter-spacing:0.1em">'+(e.date||'')+' \u2014 Evening'+(e.rating?', '+RAT[e.rating]:'')+'</div><div style="font-size:28px;margin-bottom:12px">\ud83c\udf19</div>'+(e.win?'<div style="font-size:13px;color:var(--tx3);margin-bottom:4px">One win</div><div style="font-size:14px;line-height:1.7;color:var(--tx);margin-bottom:12px;white-space:pre-wrap">'+e.win.replace(/</g,"&lt;")+'</div>':'')+(e.release?'<div style="font-size:13px;color:var(--tx3);margin-bottom:4px">Released</div><div style="font-size:14px;line-height:1.7;color:var(--tx);margin-bottom:12px;white-space:pre-wrap">'+e.release.replace(/</g,"&lt;")+'</div>':'')+(e.see?'<div style="font-size:13px;color:var(--tx3);margin-bottom:4px">If the people they love had watched today</div><div style="font-size:14px;line-height:1.7;color:var(--tx);margin-bottom:12px;white-space:pre-wrap;font-style:italic">'+e.see.replace(/</g,"&lt;")+'</div>':'')+(e.goalsHit?'<div style="font-size:13px;color:var(--tx3)">Goals hit: '+e.goalsHit+'</div>':'')+'<button class="btn" style="margin-top:12px" onclick="this.closest(\'.modal-bg\').remove()">Close</button></div>';document.body.appendChild(m);};
    }
    list.appendChild(item);
  });
}

