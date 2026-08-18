// ── NEW TAB CONTROLLERS ───────────────────────────────────────

function setFightTab(tab){
  // Craving logging lives in the vice card tap now; the old standalone panel and its cluster are gone.
  ['vices','score'].forEach(t=>{
    const p=document.getElementById('fight-panel-'+t);
    const b=document.getElementById('fst-'+t);
    if(p)p.style.display=t===tab?'block':'none';
    if(b)b.classList.toggle('active',t===tab);
  });

  if(tab==='vices'){renderVices();}
  if(tab==='score'){renderScoreboard();}
}

function setReflectTab(tab){
  // Wins + Promises now live inside the Goals panel — redirect old deep-links
  if(tab==='wins' || tab==='promises') tab='goals';
  ['evening','journal','goals','review'].forEach(t=>{
    const p=document.getElementById('reflect-panel-'+t);
    const b=document.getElementById('rst-'+t);
    if(p)p.style.display=t===tab?'block':'none';
    if(b)b.classList.toggle('active',t===tab);
  });
  if(tab==='evening'){if(typeof renderEveningHabitTickList==='function')renderEveningHabitTickList();}
  if(tab==='journal')renderJournal();
  if(tab==='goals'){
    renderGoals();
    if(typeof renderWinsLog==='function')renderWinsLog();
    if(typeof renderPromises==='function')renderPromises();
  }
  if(tab==='review')initReviewTab();
  if(tab==='evening')initEveningTab();
}

// ── GOAL HIERARCHY ───────────────────────────────────────────
function getCurrentPeriodKey(level){
  const now = new Date();
  const year = now.getFullYear();
  if(level === 'yearly') return 'yr-' + year;
  if(level === 'quarterly'){
    const q = Math.floor(now.getMonth() / 3) + 1;
    return 'q-' + year + '-' + q;
  }
  if(level === 'monthly') return 'm-' + year + '-' + (now.getMonth() + 1);
  if(level === 'weekly'){
    // ISO week number
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return 'w-' + d.getUTCFullYear() + '-' + weekNum;
  }
  return '';
}
function getGoal(level){
  const goals = ls('totry_goals') || {};
  return goals[getCurrentPeriodKey(level)] || '';
}
function setGoal(level, text){
  const goals = ls('totry_goals') || {};
  goals[getCurrentPeriodKey(level)] = text;
  ls('totry_goals', goals);
}
function editGoal(level){
  const labels = {yearly: 'this year', quarterly: 'this quarter', monthly: 'this month', weekly: 'this week'};
  const prompts = {
    yearly: 'Your single vision for the year. One sentence. What does the version of you who lived this year well look like?',
    quarterly: 'Three outcomes you want this quarter. Specific. Measurable. Tied to your yearly vision.',
    monthly: 'Three milestones for the month. What needs to happen this month for the quarter to be won?',
    weekly: 'Your priorities for this week. Daily check-in: did I move closer to my monthly milestone?'
  };
  
  const current = getGoal(level);
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:6px">Edit goals for ' + labels[level] + '</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:12px;line-height:1.6">' + prompts[level] + '</p>' +
    '<textarea id="goal-input" style="min-height:140px;font-size:16px;line-height:1.6">' + current + '</textarea>' +
    '<button class="btn primary" onclick="saveGoalEdit(\'' + level + '\')" style="margin-top:14px;margin-bottom:8px">Save</button>' +
    '<button class="btn" onclick="closeModal(this)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
  setTimeout(() => document.getElementById('goal-input')?.focus(), 100);
}
function saveGoalEdit(level){
  const text = document.getElementById('goal-input')?.value.trim() || '';
  setGoal(level, text);
  document.querySelector('.modal-bg.open')?.remove();
  renderGoals();
  showToast('Saved', 'Goal updated.');
  haptic('success');
}
function renderGoals(){
  const now = new Date();
  const yearEl = document.getElementById('goals-year');
  const qEl = document.getElementById('goals-quarter');
  const mEl = document.getElementById('goals-month');
  if(yearEl) yearEl.textContent = now.getFullYear();
  if(qEl) qEl.textContent = 'Q' + (Math.floor(now.getMonth() / 3) + 1);
  if(mEl) mEl.textContent = now.toLocaleDateString('en-US', {month: 'long'});
  
  const empty = '<span style="color:var(--tx3);font-style:italic;font-size:13px;font-family:Outfit,sans-serif">Tap Edit to set this</span>';
  ['yearly','quarterly','monthly','weekly'].forEach(level => {
    const el = document.getElementById('goals-' + level + '-content');
    if(!el) return;
    const text = getGoal(level);
    if(!text){
      el.innerHTML = empty;
    } else {
      // Render line breaks as separate lines
      el.innerHTML = text.split('\n').map(l => '<div>' + l.replace(/</g, '&lt;') + '</div>').join('');
    }
  });
  
  // On-pace check: estimate position in year/quarter/month/week
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  const yearPct = Math.round(((now - yearStart) / (yearEnd - yearStart)) * 100);
  
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const qEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
  const qPct = Math.round(((now - qStart) / (qEnd - qStart)) * 100);
  
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const mPct = Math.round(((now - mStart) / (mEnd - mStart)) * 100);
  
  const dow = now.getDay() === 0 ? 7 : now.getDay();
  const wPct = Math.round((dow / 7) * 100);
  
  const paceEl = document.getElementById('goals-pace');
  if(paceEl){
    paceEl.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-family:DM Mono,monospace;font-size:11px">' +
        '<div>Year: ' + yearPct + '% through</div>' +
        '<div>Quarter: ' + qPct + '%</div>' +
        '<div>Month: ' + mPct + '%</div>' +
        '<div>Week: ' + wPct + '%</div>' +
      '</div>' +
      '<div style="font-family:Cormorant Garamond,serif;font-size:13px;font-style:italic;color:var(--tx3);margin-top:8px;line-height:1.5">Look at your goals. Look at where you are. Are you on pace? Adjust this week.</div>';
  }
}


function setBibleTab(tab){
  // Belt and braces with applyFaithUIGate: hiding a button is not the same as making a destination
  // unreachable, and this is called from several places.
  if(tab === 'sacraments' && typeof faithTradition === 'function' && faithTradition() !== 'christianity') tab = 'read';
  ['find','read','saved','prayer','sacraments'].forEach(t=>{
    const p=document.getElementById('bible-'+t+'-panel');
    const b=document.getElementById('bst-'+t);
    if(p)p.style.display=t===tab?'block':'none';
    if(b)b.classList.toggle('active',t===tab);
  });
  if(tab==='read')initBibleReader();
  if(tab==='saved'){renderBibleSavedPanel();renderSavedVerses();}
  if(tab==='prayer') renderPrayers();
  if(tab==='sacraments') renderSacraments();
}

// ── SACRAMENTS ───────────────────────────────────────────────
// Track Confession/Reconciliation and Mass/Eucharist. Grace to return to, gently surfaced —
// "last received N days ago" — never shaming, for a user wanting to grow closer to God.
function _daysAgo(iso){
  if(!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86400000);
}
function _agoPhrase(iso){
  const d = _daysAgo(iso);
  if(d === null) return '';
  if(d === 0) return 'today';
  if(d === 1) return 'yesterday';
  if(d < 7) return d + ' days ago';
  if(d < 14) return 'about a week ago';
  if(d < 31) return Math.round(d/7) + ' weeks ago';
  if(d < 60) return 'about a month ago';
  return Math.round(d/30) + ' months ago';
}
function logConfession(whenISO){
  const list = ls('totry_confessions') || [];
  list.unshift({ id: Date.now(), date: (whenISO || new Date().toISOString()) });
  ls('totry_confessions', list);
  haptic('celebrate');
  renderSacraments();
  showToast('Confession logged ✓', 'A clean heart. "Create in me a clean heart, O God." — Psalm 51:10');
}
function logMass(whenISO){
  const euchEl = document.getElementById('mass-received-eucharist');
  const received = euchEl ? euchEl.checked : true;
  const list = ls('totry_masses') || [];
  list.unshift({ id: Date.now(), date: (whenISO || new Date().toISOString()), eucharist: received });
  ls('totry_masses', list);
  haptic('celebrate');
  renderSacraments();
  showToast(received ? 'Mass & Eucharist logged ✓' : 'Mass logged ✓', received ? '"The bread of life." — John 6:35' : 'Kept close. Well done.');
}
function promptConfessionDate(){ _promptSacramentDate('confession'); }
function promptMassDate(){ _promptSacramentDate('mass'); }
function _promptSacramentDate(kind){
  const now=new Date();
  const todayStr=_todayLocalISO(now);
  const label = kind === 'confession' ? 'Confession' : 'Mass';
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.style.alignItems='center';
  m.innerHTML='<div class="modal">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:21px;color:var(--tx);font-style:italic;margin-bottom:6px">When was this '+label+'?</div>'+
    '<input type="date" id="sacrament-date-input" max="'+todayStr+'" value="'+todayStr+'" style="margin-bottom:12px;font-size:16px;padding:11px;color-scheme:dark;width:100%">'+
    (kind==='mass' ? '<label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:13px;color:var(--tx2);cursor:pointer"><input type="checkbox" id="sacrament-euch-input" checked style="width:18px;height:18px;accent-color:var(--go)">I received the Eucharist</label>' : '')+
    '<button class="btn primary" onclick="(function(){var d=document.getElementById(\'sacrament-date-input\').value;var iso=d?new Date(d+\'T12:00:00\').toISOString():null;'+
      (kind==='confession'
        ? 'closeModal(this);logConfession(iso);'
        : 'var e=document.getElementById(\'sacrament-euch-input\');var euchEl=document.getElementById(\'mass-received-eucharist\');if(euchEl&&e)euchEl.checked=e.checked;closeModal(this);logMass(iso);')+
      '}).call(this)" style="margin-bottom:8px">Log it</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>'+
    '</div>';
  document.body.appendChild(m);
}
function deleteSacrament(kind, id){
  // A one-tap destructive action on a glyph a few pixels wide, with no undo anywhere in the app.
  if(!confirm('Delete this record?')) return;
  const key = kind === 'confession' ? 'totry_confessions' : 'totry_masses';
  const before = ls(key) || [];
  const list = before.filter(x => x.id !== id);
  // Both keys are in the ARR union, so without a tombstone the cloud copy simply puts the record back
  // on the next pull. This was the only delete path into a unioned key that did not record one.
  try{ if(typeof tombstoneRemoved === 'function') tombstoneRemoved(key, before, list); }catch(_){}
  ls(key, list);
  renderSacraments();
}
function renderSacraments(){
  const confessions = ls('totry_confessions') || [];
  const masses = ls('totry_masses') || [];

  // Confession summary
  const cLast = latestByDate(confessions);
  const cLastEl = document.getElementById('confession-last');
  const cSinceEl = document.getElementById('confession-since');
  if(cLastEl){
    if(cLast){
      cLastEl.textContent = 'Last confession ' + _agoPhrase(cLast.date);
      const d = _daysAgo(cLast.date);
      if(cSinceEl){
        cSinceEl.textContent = confessions.length + ' logged' + (d >= 40 ? ' · it may be time to return' : '');
        cSinceEl.style.color = d >= 40 ? 'var(--pu)' : 'var(--tx3)';
      }
    } else {
      cLastEl.textContent = 'No confession logged yet';
      if(cSinceEl) cSinceEl.textContent = 'Whenever you\'re ready.';
    }
  }

  // Mass summary
  const mLast = latestByDate(masses);
  const mLastEl = document.getElementById('mass-last');
  const mSinceEl = document.getElementById('mass-since');
  const mCountEl = document.getElementById('mass-count');
  if(mCountEl) mCountEl.textContent = masses.length;
  if(mLastEl){
    if(mLast){
      mLastEl.textContent = 'Last Mass ' + _agoPhrase(mLast.date);
      const euchCount = masses.filter(m => m.eucharist).length;
      if(mSinceEl) mSinceEl.textContent = euchCount + ' time' + (euchCount===1?'':'s') + ' received the Eucharist';
    } else {
      mLastEl.textContent = 'No Mass logged yet';
      if(mSinceEl) mSinceEl.textContent = '';
    }
  }

  // Combined history (most recent 12)
  const histEl = document.getElementById('sacrament-history');
  if(histEl){
    const combined = [
      ...confessions.map(c => ({...c, kind:'confession'})),
      ...masses.map(m => ({...m, kind:'mass'}))
    ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 12);
    if(!combined.length){ histEl.innerHTML = ''; return; }
    histEl.innerHTML = '<div class="eyebrow" style="margin:6px 0 8px">Recent</div>' +
      combined.map(item => {
        const isC = item.kind === 'confession';
        const icon = isC ? '\u{1F54A}' : '\u271D';
        const label = isC ? 'Confession' : (item.eucharist ? 'Mass &amp; Eucharist' : 'Mass');
        const color = isC ? 'var(--pu)' : 'var(--go)';
        const dateStr = new Date(item.date).toLocaleDateString('en-AU', {weekday:'short', day:'numeric', month:'short'});
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid var(--bd)">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<span style="font-size:15px">' + icon + '</span>' +
            '<div><div style="font-size:13px;color:var(--tx)">' + label + '</div>' +
            '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">' + dateStr + '</div></div>' +
          '</div>' +
          '<button onclick="deleteSacrament(\'' + item.kind + '\',' + item.id + ')" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer;padding:4px">&times;</button>' +
        '</div>';
      }).join('');
  }
}


// ── PRAYER JOURNAL ───────────────────────────────────────────
let _prayerFilter = 'open';
function setPrayerFilter(filter){
  _prayerFilter = filter;
  ['open','answered','all'].forEach(f => {
    const b = document.getElementById('prayer-filter-' + f);
    if(b) b.classList.toggle('active', f === filter);
  });
  renderPrayers();
}
function addPrayer(){
  const text = document.getElementById('prayer-text')?.value.trim();
  const category = document.getElementById('prayer-category')?.value.trim();
  if(!text){ showToast('Empty', 'What are you praying for?'); return; }
  
  const prayers = ls('totry_prayers') || [];
  prayers.unshift({
    id: Date.now(),
    text: text,
    category: category || '',
    status: 'open',
    createdAt: new Date().toISOString(),
    answeredAt: null,
    answerNote: ''
  });
  ls('totry_prayers', prayers);
  
  document.getElementById('prayer-text').value = '';
  document.getElementById('prayer-category').value = '';
  renderPrayers();
  showToast('Added', 'Praying with you.');
  haptic('success');
}
function markPrayerAnswered(id){
  const note = prompt('How did God answer this prayer? (optional — leave blank to skip)');
  if(note === null) return; // cancelled
  const prayers = ls('totry_prayers') || [];
  const p = prayers.find(p => p.id === id);
  if(!p) return;
  p.status = 'answered';
  p.answeredAt = new Date().toISOString();
  p.answerNote = note || '';
  ls('totry_prayers', prayers);
  renderPrayers();
  showToast('Praise God', 'Answered prayer logged.');
  haptic('celebrate');
  setTimeout(() => showVerseToast('prayer_answered', 'Word for an answered prayer'), 800);
}
function unanswerPrayer(id){
  const prayers = ls('totry_prayers') || [];
  const p = prayers.find(p => p.id === id);
  if(!p) return;
  p.status = 'open';
  p.answeredAt = null;
  p.answerNote = '';
  ls('totry_prayers', prayers);
  renderPrayers();
}
function deletePrayer(id){
  if(!confirm('Remove this prayer from your journal?')) return;
  const prayers = ls('totry_prayers') || [];
  const _kept = prayers.filter(p => p.id !== id);
  tombstoneRemoved('totry_prayers', prayers, _kept);
  ls('totry_prayers', _kept);
  renderPrayers();
}
function renderPrayers(){
  const prayers = ls('totry_prayers') || [];
  const open = prayers.filter(p => p.status === 'open');
  const answered = prayers.filter(p => p.status === 'answered');
  
  const openCountEl = document.getElementById('prayer-open-count');
  const answeredCountEl = document.getElementById('prayer-answered-count');
  if(openCountEl) openCountEl.textContent = open.length;
  if(answeredCountEl) answeredCountEl.textContent = answered.length;
  
  const list = document.getElementById('prayer-list');
  if(!list) return;
  
  let filtered;
  if(_prayerFilter === 'open') filtered = open;
  else if(_prayerFilter === 'answered') filtered = answered;
  else filtered = prayers;
  
  if(!filtered.length){
    const empty = _prayerFilter === 'answered' ?
      'No answered prayers yet. They come — keep praying and watching.' :
      _prayerFilter === 'open' ?
      'No active prayers. Add one above to start.' :
      'Your prayer journal is empty. Add your first one above.';
    list.innerHTML = '<p style="font-size:13px;color:var(--tx3);text-align:center;padding:20px;font-style:italic">' + empty + '</p>';
  } else {
    list.innerHTML = '';
    filtered.forEach(p => {
      const created = new Date(p.createdAt);
      const ago = Math.floor((Date.now() - created.getTime()) / 86400000);
      const agoLabel = ago === 0 ? 'today' : ago === 1 ? 'yesterday' : ago + ' days ago';
      
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--bg2);border:1px solid ' + (p.status === 'answered' ? 'var(--gr-bd)' : 'var(--bd)') + ';border-radius:10px;padding:12px;margin-bottom:8px';
      
      let html = '';
      if(p.category){
        html += '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">' + p.category + '</div>';
      }
      html += '<div style="font-size:13px;color:var(--tx);line-height:1.55;margin-bottom:6px">' + p.text.replace(/</g, '&lt;') + '</div>';
      html += '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-bottom:8px">Started ' + agoLabel + '</div>';
      
      if(p.status === 'answered'){
        const ansAgo = Math.floor((Date.now() - new Date(p.answeredAt).getTime()) / 86400000);
        const ansLabel = ansAgo === 0 ? 'today' : ansAgo === 1 ? 'yesterday' : ansAgo + ' days ago';
        html += '<div style="background:var(--gr-bg);border:1px solid var(--gr-bd);border-radius:8px;padding:8px 10px;margin-bottom:8px">' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--gr);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:3px">Answered ' + ansLabel + '</div>' +
          (p.answerNote ? '<div style="font-size:12px;color:var(--tx);line-height:1.5">' + p.answerNote.replace(/</g, '&lt;') + '</div>' : '<div style="font-size:11px;color:var(--tx3);font-style:italic">No note added</div>') +
        '</div>';
        html += '<div style="display:flex;gap:8px"><button class="btn" style="flex:1;padding:6px;font-size:11px;background:transparent;border:1px solid var(--bd)" onclick="unanswerPrayer(' + p.id + ')">Reopen</button><button class="btn danger" style="width:auto;padding:6px 10px;font-size:11px" onclick="deletePrayer(' + p.id + ')">Delete</button></div>';
      } else {
        html += '<div style="display:flex;gap:8px"><button class="btn" style="flex:1;padding:8px;font-size:12px;background:var(--gr);color:#000;border:none" onclick="markPrayerAnswered(' + p.id + ')">✓ God answered this</button><button class="btn" style="width:auto;padding:8px 10px;font-size:11px;background:transparent;border:1px solid var(--bd)" onclick="deletePrayer(' + p.id + ')">×</button></div>';
      }
      
      card.innerHTML = html;
      list.appendChild(card);
    });
  }
  
  // Stats
  const statsBox = document.getElementById('prayer-stats');
  const statsText = document.getElementById('prayer-stats-text');
  if(prayers.length >= 3 && statsBox && statsText){
    statsBox.style.display = 'block';
    const answerRate = prayers.length > 0 ? Math.round((answered.length / prayers.length) * 100) : 0;
    statsText.innerHTML = answered.length + ' prayer' + (answered.length === 1 ? '' : 's') + ' answered out of ' + prayers.length + ' (' + answerRate + '%). God is working — keep praying.';
  } else if(statsBox){
    statsBox.style.display = 'none';
  }
}

