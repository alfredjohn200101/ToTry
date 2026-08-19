// ═══════════════════════════════════════════════════════════════════════════════
// VERSE CARDS + READ-ALOUD  (Soul \u00b7 sharing & voice)
// Cards reuse _renderShareCanvas('scripture') — the app's real serif/gold card — and simply
// let it be pointed at ANY line, in the person's own tradition. Read-aloud uses the device's
// own voice: it reads the passage and stops. Not a feed, not a player.
// ═══════════════════════════════════════════════════════════════════════════════

// The tradition names its own word. Never flattened to "scripture".
function verseCardEyebrow(){
  const t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
  return ({
    christianity:'\u00b7 TODAY\u2019S WORD \u00b7',
    islam:'\u00b7 AN AYAH \u00b7',
    hinduism:'\u00b7 A VERSE \u00b7',
    buddhism:'\u00b7 A TEACHING \u00b7',
    secular:'\u00b7 A REFLECTION \u00b7'
  })[t] || '\u00b7 TODAY\u2019S WORD \u00b7';
}

// Shared markup for the two quiet tools under a passage. IDs only — no text in attributes.
function _verseToolsHTML(textId, refId){
  return '<div class="verse-tools">' +
    '<button class="btn" data-speak="' + textId + '|' + refId + '" onclick="Speak.toggleFrom(this)" aria-pressed="false">\u25B6 Listen</button>' +
    '<button class="btn" onclick="shareVerseFrom(\'' + textId + '\',\'' + refId + '\')">\u2726 Make a card</button>' +
  '</div>';
}

function shareVerseCard(text, ref){
  const strip = /^[\s\u201C\u201D\u2018\u2019"'\u2014\u2013-]+|[\s\u201C\u201D\u2018\u2019"']+$/g;
  text = String(text || '').replace(strip, '').trim();
  ref  = String(ref  || '').replace(strip, '').trim();
  if(!text){ showToast('Nothing to put on it','No line is showing yet \u2014 open one first.'); return; }
  window._verseCardOverride = { t:text, r:ref };
  haptic('tap');
  createShareCard('scripture');
}
// Read the line off the screen so user/API text never touches an inline attribute.
function shareVerseFrom(textId, refId){
  const te = document.getElementById(textId);
  const re = refId ? document.getElementById(refId) : null;
  shareVerseCard(te ? (te.textContent || '') : '', re ? (re.textContent || '') : '');
}

// ── READ-ALOUD ────────────────────────────────────────────────────────────────
// window.* so anything loading earlier (go(), theRelease()) can safely null-check it.
window.Speak = (function(){
  const SS = window.speechSynthesis;
  let chunks = [], i = 0, btn = null, on = false;
  const ok = () => !!(SS && typeof window.SpeechSynthesisUtterance === 'function');

  function paint(playing){
    if(!btn) return;
    const long = /chapter/i.test(btn.textContent || '');
    btn.innerHTML = playing ? '\u25A0 Stop' : (long ? '\u25B6 Listen to this chapter' : '\u25B6 Listen');
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
  }
  function stop(){
    if(ok()){ try{ SS.cancel(); }catch(_){ } }
    paint(false);
    on = false; chunks = []; i = 0; btn = null;
  }
  // Pull readable text out of live DOM nodes: drop verse numbers and our own controls.
  function textFrom(spec){
    const out = [];
    String(spec || '').split('|').forEach(id => {
      const el = document.getElementById(id.trim());
      if(!el) return;
      String(el.innerText || el.textContent || '').split('\n').forEach(line => {
        const s = line.replace(/^\s*\d+\s+/, '').trim();
        if(!s) return;
        if(/^(\u25B6|\u25A0|Listen|Stop|Make a card|Show study notes)/i.test(s)) return;
        out.push(/[.!?;:\u201D\u2019"']$/.test(s) ? s : s + '.');
      });
    });
    return out.join(' ');
  }
  // Chrome cuts a single utterance at ~15s. Sentence chunks under ~180 chars avoid it,
  // and make Stop feel instant.
  function cut(t){
    const parts = String(t || '').replace(/\s+/g,' ').trim().match(/[^.!?;:]+[.!?;:]*\s*/g) || [String(t || '')];
    const out = []; let cur = '';
    parts.forEach(p => { if((cur + p).length > 180 && cur){ out.push(cur.trim()); cur = p; } else cur += p; });
    if(cur.trim()) out.push(cur.trim());
    return out.filter(Boolean);
  }
  function voice(){
    try{
      const vs = SS.getVoices() || [];
      if(!vs.length) return null;                       // engine not ready → device default
      const want = (navigator.language || 'en').slice(0,2).toLowerCase();
      const pool = vs.filter(v => (v.lang || '').slice(0,2).toLowerCase() === want);
      const use = pool.length ? pool : vs;
      return use.find(v => v.localService) || use[0] || null;
    }catch(_){ return null; }
  }
  function next(){
    if(!on || i >= chunks.length){ stop(); return; }
    const u = new SpeechSynthesisUtterance(chunks[i++]);
    const v = voice(); if(v){ u.voice = v; u.lang = v.lang; }
    u.rate = 0.92; u.pitch = 1;
    u.onend = () => { if(on) next(); };
    u.onerror = () => { stop(); };
    try{ SS.speak(u); }catch(_){ stop(); }
  }
  function toggleFrom(el){
    if(!ok()){ showToast('No voice here','This browser can\u2019t read aloud on this device.'); return; }
    if(on){ stop(); haptic('light'); return; }
    const text = textFrom(el.getAttribute('data-speak'));
    if(!text){ showToast('Nothing to read','Open a passage first.'); return; }
    // iOS only starts speech from inside the tap itself — nothing async may come first.
    try{ SS.cancel(); SS.resume(); }catch(_){ }
    chunks = cut(text); i = 0; btn = el; on = true;
    paint(true); haptic('tap');
    next();
    // Told once, plainly: it is not a recording and it is not a person.
    if(!ls('totry_listen_hint_seen')){
      ls('totry_listen_hint_seen', true);
      setTimeout(() => showToast('That\u2019s your phone\u2019s own voice','Not a recording. It reads the passage, then stops.'), 900);
    }
  }
  try{
    if(SS) SS.getVoices();                                    // warm the async voice list
    document.addEventListener('visibilitychange', () => { if(document.hidden) stop(); });
    window.addEventListener('pagehide', stop);
    if(!ok() && document.body) document.body.classList.add('no-tts');
  }catch(_){ }
  return { toggleFrom:toggleFrom, stop:stop, supported:ok };
})();
// Tap-to-pick check-in dots
function setCheckin(field, value){
  const row = document.querySelector('.ci-dot-row[data-target="'+field+'"]');
  if(!row) return;
  // Update visual
  row.querySelectorAll('.ci-dot').forEach((dot, i) => {
    const dotVal = parseInt(dot.dataset.val);
    dot.classList.toggle('selected', dotVal === value);
    dot.classList.toggle('below-selected', dotVal < value);
    try{ dot.setAttribute('aria-checked', dotVal === value ? 'true' : 'false'); }catch(_){ }
  });
  // Update label
  const val = document.getElementById('cv-' + field);
  if(val) val.textContent = value;
  // Store temporarily on row
  row.dataset.value = value;
  haptic('light');
}

// ANNOUNCED, NOT JUST DRAWN. All 508 of the app's notifications came through here as a bare div appended
// to body with no role and no aria-live, then removed after five seconds — so nothing was ever announced.
// Most are harmless confirmations, but this same channel carries the only notice of irreversible loss:
// "Storage was full — I had to remove 3 older progress photos", which are device-only by policy and in
// no backup. A person who cannot see the screen was never told.
//
// Two urgencies, deliberately. Anything reporting a failure or a loss is role=alert/assertive so it
// interrupts; ordinary confirmations are role=status/polite so a stream of "Saved" does not talk over
// whatever the person is doing. A tappable toast also gets an explicit role=button and Enter/Space, since
// it was previously a div with an onclick — invisible to the keyboard.
function showToast(title,msg,onTap){
  const ex=document.querySelector('.milestone-toast');if(ex)ex.remove();
  const t=document.createElement('div');t.className='milestone-toast';
  const _urgent = /full|fail|could ?n.t|error|removed|deleted|lost|expired|not saved|did not save|wrong|reconnect|offline|out of room/i.test(String(title)+' '+String(msg));
  t.setAttribute('role', onTap ? 'button' : (_urgent ? 'alert' : 'status'));
  t.setAttribute('aria-live', _urgent ? 'assertive' : 'polite');
  t.setAttribute('aria-atomic', 'true');
  t.innerHTML='<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;font-weight:500;margin-bottom:4px">'+title+'</div><div style="font-size:13px;line-height:1.5;opacity:0.85">'+msg+'</div>';
  const _fire=()=>{ if(typeof onTap==='function'){ try{ onTap(); }catch(_){} } t.remove(); };
  t.onclick=_fire;
  if(onTap){
    // A toast you can act on must be reachable and operable without a mouse.
    t.setAttribute('tabindex','0');
    t.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); _fire(); } });
  }
  document.body.appendChild(t);
  setTimeout(()=>{if(t.parentNode)t.remove();},onTap?7000:5000);
}
function closeModal(el){const m=el.closest('.modal-bg');if(m)m.remove();}
// ── UNIVERSAL SHEET DISMISS ──────────────────────────────────────────────────────────────────────
// Every bottom-sheet is dismissible three ways: tap the backdrop, tap the grab-handle, or press Esc.
// Without this, sheets built as .modal-bg (e.g. the Feeling Door's "which one's pulling?") had NO
// visible way out on a pointer device — a real trap. This is the iOS-native behaviour a thumb expects.
// Sheets that must NOT be dismissed this way can add class "modal-locked" (none currently need to).
(function(){
  document.addEventListener('click', function(e){
    const t = e.target; if(!t || !t.classList) return;
    // a direct backdrop tap (outside the sheet) OR a tap on the grab-handle
    const bg = t.classList.contains('modal-bg') ? t
             : (t.classList.contains('modal-handle') ? t.closest('.modal-bg') : null);
    if(bg && !bg.classList.contains('modal-locked')){
      if(typeof closeModal==='function') closeModal(bg); else bg.remove();
    }
  }, false);
  document.addEventListener('keydown', function(e){
    if(e.key!=='Escape' && e.key!=='Esc') return;
    // close the topmost open sheet first…
    // ONLY SHEETS THAT ARE ACTUALLY OPEN. This matched every .modal-bg in the document, and three of
    // them — #payday-modal, #journal-modal, #serving-modal — are STATIC markup that is always
    // present and merely hidden. So sheets.length was never 0, this branch always ran, and the two
    // lines below it were unreachable: pressing Escape could never close the Feeling Door or the
    // companion, the two things a person is most likely to want out of quickly. It also meant Escape
    // "closed" a modal that was already closed, so nothing happened and the key felt broken.
    const sheets = document.querySelectorAll('.modal-bg.open:not(.modal-locked)');
    if(sheets.length){ const top = sheets[sheets.length-1]; if(typeof closeModal==='function') closeModal(top); else top.remove(); return; }
    // …otherwise the Feeling Door, then the companion sheet.
    const fd = document.getElementById('feel-door');
    if(fd && fd.classList.contains('open')){ if(typeof closeFeelingDoor==='function') closeFeelingDoor(); return; }
    const co = document.getElementById('companion-overlay');
    if(co && co.classList.contains('open') && typeof dismissCompanion==='function') dismissCompanion();
  }, false);
})();


// ── IN-APP FEEDBACK ───────────────────────────────────────────
// The QA channel. Users report bugs/ideas; saved to Supabase (feedback table) so Alfred
// sees everything, with an email fallback so nothing is ever lost if the network is down.
function openFeedback(){
  document.querySelector('.modal-bg.open')?.remove();
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:90vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:6px">Help improve ToTry</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px;line-height:1.55">Honest and specific helps most. What happened, what you expected, what you\'d want instead.</p>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Type</div>' +
    '<div style="display:flex;gap:6px;margin-bottom:14px">' +
      '<button class="meal-chip selected" id="fb-type-bug" onclick="setFeedbackType(\'bug\')" style="flex:1">🐛 Bug</button>' +
      '<button class="meal-chip" id="fb-type-idea" onclick="setFeedbackType(\'idea\')" style="flex:1">💡 Idea</button>' +
      '<button class="meal-chip" id="fb-type-other" onclick="setFeedbackType(\'other\')" style="flex:1">💬 Other</button>' +
    '</div>' +
    '<textarea id="fb-text" placeholder="Tell me what\'s on your mind..." style="height:120px;resize:none;margin-bottom:10px;font-size:16px;line-height:1.6"></textarea>' +
    '<label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:12px;color:var(--tx3);cursor:pointer">' +
      '<input type="checkbox" id="fb-include-state" checked style="width:auto;margin:0"> Include basic app info (helps me debug)' +
    '</label>' +
    '<button class="btn primary" onclick="submitFeedback()" style="margin-bottom:8px">Send</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:1px solid var(--bd)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
  setTimeout(() => document.getElementById('fb-text')?.focus(), 80);
}
let _feedbackType = 'bug';
function setFeedbackType(t){
  _feedbackType = t;
  ['bug','idea','other'].forEach(x => {
    const btn = document.getElementById('fb-type-' + x);
    if(btn) btn.classList.toggle('selected', x === t);
  });
}
// Retry any feedback that never reached the server (e.g. cloud was down when submitted).
// Runs quietly on app open so nothing a user took the time to write is ever lost.
async function flushFeedbackOutbox(){
  try{
    if(!sb || !navigator.onLine) return;
    let outbox = ls('totry_feedback_outbox') || [];
    if(!outbox.length) return;
    const remaining = [];
    for(const entry of outbox){
      if(entry.__sent){ continue; } // already confirmed — submitFeedback marks it on a successful insert
      try{
        const { error } = await Promise.race([
          sb.from('feedback').insert([{ type:entry.type, message:entry.message, email:entry.email, app_info:entry.app_info, created_at:entry.ts }]),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
        ]);
        if(error){ remaining.push(entry); } // keep for next try
      }catch(_){ remaining.push(entry); }
    }
    ls('totry_feedback_outbox', remaining.slice(0,50));
  }catch(_){ }
}

async function submitFeedback(){
  const text = (document.getElementById('fb-text')?.value || '').trim();
  if(!text){ showToast('Empty', 'Write something first.'); return; }
  const includeState = document.getElementById('fb-include-state')?.checked;
  
  // Basic, non-sensitive app info to help debugging (only if user opted in)
  let appInfo = {};
  if(includeState){
    appInfo = {
      day: getDayCount(),
      version: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'v36'),
      ua: navigator.userAgent,
      screen: window.innerWidth + 'x' + window.innerHeight,
      lastAIProvider: window.__lastAIProvider || null,
      lastAIError: window.__lastAIError ? JSON.stringify(window.__lastAIError).slice(0,200) : null
    };
  }
  
  const entry = {
    type: _feedbackType,
    message: text,
    email: currentUser?.email || 'anonymous',
    app_info: appInfo,
    ts: new Date().toISOString()
  };
  
  // Save locally first (never lose it), then try cloud
  const localFb = ls('totry_feedback_outbox') || [];
  localFb.unshift(entry);
  ls('totry_feedback_outbox', localFb.slice(0, 50));
  
  let sent = false;
  if(sb){
    try{
      const { error } = await Promise.race([
        sb.from('feedback').insert([{
          type: entry.type,
          message: entry.message,
          email: entry.email,
          app_info: entry.app_info,
          created_at: entry.ts
        }]),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
      ]);
      if(!error){
        sent = true;
        try{
          const _ob = ls('totry_feedback_outbox') || [];
          const _i = _ob.findIndex(x => x && x.ts === entry.ts);
          if(_i > -1){ _ob[_i].__sent = true; ls('totry_feedback_outbox', _ob); }
        }catch(_){ }
      }
    }catch(e){ /* fall through to email */ }
  }
  
  document.querySelector('.modal-bg.open')?.remove();
  
  if(sent){
    showToast('Thank you', 'Your feedback came through. It genuinely helps.');
    haptic('success');
  } else {
    // Cloud failed — offer email fallback so it's never lost
    const subject = encodeURIComponent('ToTry feedback: ' + _feedbackType);
    const bodyText = encodeURIComponent(text + '\n\n---\n' + (includeState ? JSON.stringify(appInfo, null, 2) : 'No app info included'));
    const mailto = 'mailto:totrybyaj@gmail.com?subject=' + subject + '&body=' + bodyText;
    const m = document.createElement('div');
    m.className = 'modal-bg open';
    m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
      '<h3 style="margin-bottom:6px">Send via email instead?</h3>' +
      '<p style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:14px">Couldn\'t reach the server right now, but your feedback is saved. Tap below to send it by email so it reaches me directly.</p>' +
      '<a href="' + mailto + '" class="btn primary" style="display:block;text-align:center;text-decoration:none;margin-bottom:8px" onclick="closeModal(this)">Open email</a>' +
      '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:1px solid var(--bd)">Later</button>' +
    '</div>';
    document.body.appendChild(m);
  }
}

