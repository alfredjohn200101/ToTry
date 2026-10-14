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
  // The sheet's subheadline role for the prompt (it was the tertiary grey), and the person's own goal
  // ESCAPED into the field: it went in raw, so a goal containing "</textarea>" closed the field early
  // and whatever followed it became live markup in the sheet.
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    '<h3>Edit goals for ' + labels[level] + '</h3>' +
    '<p class="modal-sub">' + prompts[level] + '</p>' +
    '<textarea id="goal-input" style="min-height:140px;line-height:1.45">' + _escFew(current) + '</textarea>' +
    '<button class="btn primary" onclick="saveGoalEdit(\'' + level + '\')" style="margin-top:14px;margin-bottom:8px">Save goal</button>' +
    '<button class="btn" onclick="closeModal(this)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
  setTimeout(() => document.getElementById('goal-input')?.focus(), 100);
}
function saveGoalEdit(level){
  const text = document.getElementById('goal-input')?.value.trim() || '';
  // GATED, 12 Oct 2026, same census. A goal is a sentence about what a person wants their life to
  // be, and it is persisted and shown back on the Goals screen afterwards.
  const _gC = (typeof journalCrisisOf==='function') ? journalCrisisOf(text) : null;
  if(_gC){
    setTimeout(function(){ try{ if(typeof journalMeetCrisis==='function') journalMeetCrisis(_gC, null, { saved: false }); }catch(_){ } }, 250);
    return;
  }
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
  
  // Each goal is a row's subtitle now, and the row is what you tap — there is no Edit button to name.
  // The empty line was an italic in the tertiary grey; an unset value on iOS is the secondary grey.
  const empty = 'Tap to set this';
  ['yearly','quarterly','monthly','weekly'].forEach(level => {
    const el = document.getElementById('goals-' + level + '-content');
    if(!el) return;
    const text = getGoal(level);
    if(!text){
      el.textContent = empty;
    } else {
      // Render line breaks as separate lines — <br>, because this sits inside a <button>'s span and a
      // block <div> is not something a button may hold.
      el.innerHTML = text.split('\n').map(l => l.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>');
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
    // Four figures are four stat tiles — they were a 13px two-column text grid in a grey card over an
    // italic serif line in the tertiary grey. The line is the section's footnote.
    const tile = (lbl, pct) => '<div class="ios-stat"><div class="ios-stat-label">' + lbl + '</div><div class="ios-stat-value">' + pct + '<span class="ios-stat-unit">%</span></div></div>';
    paceEl.innerHTML =
      '<div class="ios-stats">' + tile('Year', yearPct) + tile('Quarter', qPct) + tile('Month', mPct) + tile('Week', wPct) + '</div>' +
      '<div class="ios-footnote">Look at your goals. Look at where you are. Are you on pace? Adjust this week.</div>';
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
    // The sheet title role, not a centred italic New York line; the date field without the
    // color-scheme:dark that painted a DARK picker into the light sheet; the Eucharist as a switch row.
    '<h3>When was this '+label+'?</h3>'+
    '<input type="date" id="sacrament-date-input" max="'+todayStr+'" value="'+todayStr+'" style="margin-bottom:12px;width:100%">'+
    (kind==='mass' ? '<label class="card-toggle"><span>I received the Eucharist</span><input type="checkbox" class="ios-switch" id="sacrament-euch-input" checked></label>' : '')+
    '<button class="btn primary" onclick="(function(){var d=document.getElementById(\'sacrament-date-input\').value;var iso=d?new Date(d+\'T12:00:00\').toISOString():null;'+
      (kind==='confession'
        ? 'closeModal(this);logConfession(iso);'
        : 'var e=document.getElementById(\'sacrament-euch-input\');var euchEl=document.getElementById(\'mass-received-eucharist\');if(euchEl&&e)euchEl.checked=e.checked;closeModal(this);logMass(iso);')+
      '}).call(this)" style="margin-bottom:8px">Save '+(kind==='confession'?'confession':'Mass')+'</button>'+
    '<button class="btn quiet" onclick="closeModal(this)">Cancel</button>'+
    '</div>';
  document.body.appendChild(m);
}
async function deleteSacrament(kind, id){
  // A one-tap destructive action on a glyph a few pixels wide, with no undo anywhere in the app.
  if(!(await askConfirm('Delete this record?'))) return;
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
        // The gentle "it may be time" keeps its purple; the ordinary count is the footnote's own grey
        // (the class), not the tertiary one this used to write inline.
        cSinceEl.style.color = d >= 40 ? 'var(--pu)' : '';
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
  // An inset list under a section header: the kind as the row's title, the day as its subtitle, and a
  // remove control a thumb can land on, named for a screen reader. Each entry was a hand-built flex row
  // with a 17px dove or cross glyph, the date at 12px tertiary, and a bare × with 4px of padding.
  const histEl = document.getElementById('sacrament-history');
  if(histEl){
    const combined = [
      ...confessions.map(c => ({...c, kind:'confession'})),
      ...masses.map(m => ({...m, kind:'mass'}))
    ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 12);
    if(!combined.length){ histEl.innerHTML = ''; return; }
    histEl.innerHTML = iosList(combined.map(item => {
      const isC = item.kind === 'confession';
      const label = isC ? 'Confession' : (item.eucharist ? 'Mass & Eucharist' : 'Mass');
      const dateStr = new Date(item.date).toLocaleDateString('en-AU', {weekday:'short', day:'numeric', month:'short'});
      return iosRow({ title: label, sub: dateStr, chevron: false,
        trailing: '<button type="button" class="ios-row-x" aria-label="Delete this record" onclick="deleteSacrament(\'' + item.kind + '\',' + Number(item.id) + ')">&times;</button>' });
    }), { header: 'Recent' });
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
  // GATED, 30 Sep 2026. A prayer intention is exactly where someone says the thing they cannot say anywhere else, and it is stored and shown back in the list.
  const _cc = (typeof journalCrisisOf==='function') ? (journalCrisisOf(text)) : null;
  if(_cc){
    setTimeout(function(){ try{ if(typeof journalMeetCrisis==='function') journalMeetCrisis(_cc, null, { saved: false }); }catch(_){ } }, 250);
    return;
  }
  
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
async function markPrayerAnswered(id){
  const note = await askText('How was it answered?', 'Optional \u2014 leave it blank to skip.', {confirmLabel:'Mark answered', cancelLabel:'Skip'});
  if(note === null) return; // cancelled
  const prayers = ls('totry_prayers') || [];
  const p = prayers.find(p => p.id === id);
  if(!p) return;
  // GATED, 12 Oct 2026. The note arrives from `askText`, as an ARGUMENT-shaped value no census
  // could see. Its own prompt is "How was it answered?" on a PRAYER surface — the register this
  // app's faith layer invites five ways over — and `renderPrayers()` prints it back afterwards.
  // THE ANSWER IS KEPT AND THE NOTE IS DROPPED, which the surface itself makes easy: the prompt
  // says "Optional — leave it blank to skip", so marking the prayer answered is the choice and the
  // note is the sentence. And the celebration is skipped: "Praise God", a celebrate haptic and a
  // verse toast landing on top of what they just wrote is the app talking over them.
  const _paC = (typeof crisisInAny==='function') ? crisisInAny([note]) : null;
  p.status = 'answered';
  p.answeredAt = new Date().toISOString();
  p.answerNote = _paC ? '' : (note || '');
  ls('totry_prayers', prayers);
  renderPrayers();
  if(_paC){
    try{ if(typeof haptic==='function') haptic('warning'); }catch(_){}
    if(typeof journalMeetCrisis==='function') journalMeetCrisis(_paC, null, { saved: false });
    return;
  }
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
async function deletePrayer(id){
  if(!(await askConfirm('Remove this prayer from your journal?'))) return;
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

  // Everything a person typed into this journal is escaped, every field. The TEXT was; the CATEGORY —
  // typed into its own box one line below, and written by the AI composer from the person's intention —
  // went into innerHTML raw, and it is the first line of every card.
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  if(!filtered.length){
    const empty = _prayerFilter === 'answered' ?
      'No answered prayers yet. They come — keep praying and watching.' :
      _prayerFilter === 'open' ?
      'No active prayers. Add one above to start.' :
      'Your prayer journal is empty. Add your first one above.';
    // The empty-state body, upright; it was a centred italic in the tertiary grey.
    list.innerHTML = '<div class="ios-empty"><div class="ios-empty-body">' + empty + '</div></div>';
  } else {
    list.innerHTML = '';
    filtered.forEach(p => {
      const created = new Date(p.createdAt);
      const ago = Math.floor((Date.now() - created.getTime()) / 86400000);
      const agoLabel = ago === 0 ? 'today' : ago === 1 ? 'yesterday' : ago + ' days ago';

      // One card per prayer, drawn from the card roles: the prayer itself at body size beside the card's
      // own remove control, and its category and start as one footnote. It was a bordered box
      // (green-bordered once answered) holding 11px tint caps, an 11px tertiary date, a green-tinted
      // panel inside the card, a bare × in a grey box, and "✓ God answered this" painted black on green.
      const card = document.createElement('div');
      card.className = 'card prayer-card';

      let html = '<div class="home-card-top"><div class="card-text">' + esc(p.text) + '</div>' +
        '<button type="button" class="card-x" aria-label="Delete this prayer" onclick="deletePrayer(' + Number(p.id) + ')">&times;</button></div>';
      html += '<div class="card-foot">' + (p.category ? esc(p.category) + ' · started ' : 'Started ') + agoLabel + '</div>';

      if(p.status === 'answered'){
        const ansAgo = Math.floor((Date.now() - new Date(p.answeredAt).getTime()) / 86400000);
        const ansLabel = ansAgo === 0 ? 'today' : ansAgo === 1 ? 'yesterday' : ansAgo + ' days ago';
        // The answer is grouped with a hairline inside the card — a card does not hold a card.
        html += '<div class="prayer-answer">' +
          '<div class="eyebrow">Answered ' + ansLabel + '</div>' +
          (p.answerNote ? '<div class="card-text">' + esc(p.answerNote) + '</div>' : '<div class="card-foot">No note added</div>') +
        '</div>';
        html += '<button class="btn" onclick="unanswerPrayer(' + Number(p.id) + ')">Reopen</button>';
      } else {
        html += '<button class="btn success" onclick="markPrayerAnswered(' + Number(p.id) + ')">' + svgIcon('check', 18) + 'God answered this</button>';
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

