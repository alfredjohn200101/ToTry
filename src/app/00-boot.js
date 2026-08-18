

// ═══════════════════════════════════════════════════════════════
// TO TRY — by Alfred John — Clean Build, no function conflicts
// ═══════════════════════════════════════════════════════════════

// ── TEST-BUILD ISOLATION ──────────────────────────────────────
// The /test/ build sets TEST_MODE true. When true, EVERY piece of data — in the cloud AND in this
// device's local storage — is namespaced with a "test__" prefix, so the test app is completely
// walled off from the real app's data at BOTH layers. This lets the new sync code be proven on a
// real phone with zero risk of touching real users' data. In the live build TEST_MODE is false and
// all of this is inert.
const TEST_MODE = false;
const TEST_PREFIX = 'test__';
function _cloudKey(k){ return TEST_MODE ? TEST_PREFIX + k : k; }
function _unCloudKey(k){ return (TEST_MODE && typeof k==='string' && k.indexOf(TEST_PREFIX)===0) ? k.slice(TEST_PREFIX.length) : k; }
if(TEST_MODE){
  try{
    const _gi = localStorage.getItem.bind(localStorage);
    const _si = localStorage.setItem.bind(localStorage);
    const _ri = localStorage.removeItem.bind(localStorage);
    const pfx = k => (typeof k==='string' && k.indexOf('totry_')===0) ? TEST_PREFIX + k : k;
    localStorage.getItem = k => _gi(pfx(k));
    localStorage.setItem = (k,v) => _si(pfx(k), v);
    localStorage.removeItem = k => _ri(pfx(k));
  }catch(_){ }
}

// ── VIEWPORT HEIGHT FIX ───────────────────────────────────────
// Mobile browsers (esp. iOS Safari) report 100vh as TALLER than the visible area when
// the URL bar is showing, which pushes page bottoms (and the nav) out of reach. We set a
// --vh variable to the true visible height and keep it updated. This is why pages can now
// always scroll to the bottom.
// Safety: never let the boot splash trap someone if init stalls.
setTimeout(()=>{ try{ const bs=document.getElementById('boot-splash'); if(bs){ bs.style.opacity='0'; setTimeout(()=>bs.remove(),400);} }catch(_){ } }, 6000);
function setVH(){
  const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
}
setVH();
window.addEventListener('resize', setVH);
window.addEventListener('orientationchange', () => setTimeout(setVH, 200));
if(window.visualViewport){ window.visualViewport.addEventListener('resize', setVH); }

// ── KEYBOARD-AWARE FOCUS ── when an input/textarea is focused and the soft keyboard opens,
// the visible viewport shrinks. Without help, content near the top can look stranded with a
// big empty gap below. We gently scroll the focused field to a comfortable position inside
// its scrolling tab, AFTER the keyboard animation settles. Outer page never scrolls (body is fixed).
(function(){
  let kbTimer = null;
  function centerFocused(){
    const ae = document.activeElement;
    if(!ae) return;
    const tag = (ae.tagName || '').toLowerCase();
    if(tag !== 'input' && tag !== 'textarea' && tag !== 'select') return;
    try{
      ae.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }catch(_){ try{ ae.scrollIntoView(); }catch(__){} }
  }
  document.addEventListener('focusin', (e) => {
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if(tag === 'input' || tag === 'textarea' || tag === 'select'){
      // Wait for the keyboard to actually open + viewport to resize before centering.
      clearTimeout(kbTimer);
      kbTimer = setTimeout(centerFocused, 300);
    }
  });
  // When the viewport resizes (keyboard open/close) while a field is focused, re-center.
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', () => {
      const ae = document.activeElement;
      const tag = (ae && ae.tagName || '').toLowerCase();
      if(tag === 'input' || tag === 'textarea'){
        clearTimeout(kbTimer);
        kbTimer = setTimeout(centerFocused, 120);
      }
    });
  }
})();

// ── FULL LOCAL BACKUP ── the escape hatch: every totry_ key, downloadable + restorable,
// so a person can NEVER truly lose their journey even with no account or a wiped device.
// CREDENTIALS MUST NEVER GO INTO A BACKUP FILE.
// exportAllData() dumps EVERY totry_ key, and sitting among them are the live Supabase session
// (access + refresh token — this is the account itself) and the OAuth tokens and API keys for Google,
// Strava, Hevy and the scripture/food services. That file is built to be AirDropped, emailed and parked
// in cloud storage, so the app's own safety net was handing out a bearer credential: anyone holding the
// file could sign in as them until the refresh token expired, with no password and no second factor.
//
// Restoring is the same hole pointing the other way — importing someone else's backup would install
// THEIR session on this device.
//
// The rest of the file already knew to skip totry_auth_session (the sync scan does exactly that); the
// backup path simply never did. Matched exactly, not by substring, so totry_pt_sessions and
// totry_poker_sessions — which are real user data — still get backed up.
const BACKUP_NEVER = [
  'totry_auth_session',                                        // Supabase access + refresh token
  'totry_google_token', 'totry_strava_token', 'totry_hevy_api_key',
  'totry_esv_key', 'totry_nutritionix_key', 'totry_usda_key'
];
function backupSafeKey(k){
  return typeof k === 'string' && k.indexOf('totry_') === 0 && BACKUP_NEVER.indexOf(k) === -1;
}

// ── RESTORE: count what LANDED, not what we tried ────────────────────────────────────────────────
// A restore runs on the one day the person has already wiped the phone, and a backup file is by
// definition close to the ~5MB localStorage cap iOS Safari enforces — so QuotaExceededError on the
// biggest values is the NORMAL case here, not the edge case. importAllData wrote inside catch(_){} and
// then reported keys.length, so a device with no room said "6 items loaded" having written four.
// confirmRestore counted right but still showed a bare success tick. Neither goes through ls(), so
// neither gets ls()'s prune-and-retry or its honest "storage full" line.
//
// Two things matter, in this order: WHAT lands when not everything can, and whether we say so.
// Object key order decided the first one, so a 300KB base64 photo blob that happened to sit first in
// the file could take the last of the room and the journal — someone's own words, the one thing they
// cannot rewrite — silently did not load. Expendable-last, then smallest-first, then tell the truth.
const RESTORE_EXPENDABLE = ['totry_progress_photos','totry_coach_history','totry_pt_history','totry_strava_activities'];
const RESTORE_LABELS = {
  totry_progress_photos:'progress photos', totry_coach_history:'coach conversations',
  totry_pt_history:'PT conversations', totry_journal:'journal entries', totry_workouts:'workouts',
  totry_strava_activities:'Strava activities', totry_fight_log:'the fight log', totry_v:'your vices and streaks',
  totry_measurements:'measurements', totry_body:'body stats', totry_money:'money'
};
function restoreKeys(data){
  const keys = Object.keys(data).filter(backupSafeKey).sort((a, b) => {
    const ea = RESTORE_EXPENDABLE.indexOf(a) !== -1, eb = RESTORE_EXPENDABLE.indexOf(b) !== -1;
    if(ea !== eb) return ea ? 1 : -1;                         // the big reproducible stores go last
    return String(data[a]).length - String(data[b]).length;   // then smallest first
  });
  const out = { total: keys.length, ok: 0, failed: [], full: false };
  keys.forEach(k => {
    try{
      // Write PAST the sync monitor. enableSyncMonitoring() overrides localStorage.setItem to queue
      // every write into the durable outbox — so a restore of 178 keys queued 178 uploads AND then
      // made the explicit syncToCloud call below, putting a second full copy of the backup into the
      // outbox. On the device where a restore is most likely (the one that just ran out of room) that
      // is the backup needing twice the space it says it does, at the worst possible moment.
      (typeof _originalSetItem === 'function' ? _originalSetItem : localStorage.setItem.bind(localStorage))(k, data[k]);
      out.ok++;                                               // counted only after the write returned
      if(typeof syncToCloud === 'function' && typeof SYNC_KEYS !== 'undefined' && SYNC_KEYS.indexOf(k) !== -1){
        let parsed; try{ parsed = JSON.parse(data[k]); }catch(_){ parsed = data[k]; }
        try{ syncToCloud(k, parsed); }catch(_){ }             // a cloud hiccup must not un-count a local write
      }
    }catch(e){
      out.failed.push(k);
      if(e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)) out.full = true;
      try{ console.warn('[restore] did not fit:', k, e && e.name); }catch(_){ }
    }
  });
  return out;
}
function restoreReport(r){
  if(!r.failed.length) return { title:'Restored', body: r.ok + ' data sets loaded. Reloading…' };
  const named = r.failed.map(k => RESTORE_LABELS[k] || k.replace(/^totry_/, '').replace(/_/g, ' '));
  const shown = named.slice(0, 3).join(', ') + (named.length > 3 ? ', and ' + (named.length - 3) + ' more' : '');
  return {
    title: r.ok ? ('Restored ' + r.ok + ' of ' + r.total) : 'Restore failed',
    body: 'Did not load: ' + shown + '. ' + (r.full
      ? 'This device is out of storage — free up space, then restore the same file again. Everything else is already back.'
      : 'Keep the backup file and try again. Everything else is already back.')
  };
}

async function exportAllData(){
  try{
    const dump = {};
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(backupSafeKey(k)) dump[k] = localStorage.getItem(k);   // never the sign-in or any API token
    }
    const payload = { app:'To Try', version:(typeof APP_VERSION!=='undefined'?APP_VERSION:'?'), exported:new Date().toISOString(), keys:Object.keys(dump).length, data:dump };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    // Through SaveFile: an <a download> does nothing in a WKWebView, so on iOS this used to produce no
    // file and no error — the export promise, silently broken in the App Store build.
    const _r = await SaveFile.save(blob, 'totry-backup-' + new Date().toISOString().slice(0,10) + '.json', 'To Try backup');
    if(_r === null) return;   // share sheet dismissed — they chose not to; don't tell them it's saved
    if(typeof haptic==='function') haptic('success');
    if(typeof showToast==='function') showToast(_r ? 'Backup saved' : 'Not saved', _r ? (payload.keys + ' items exported. Your sign-in and app tokens are deliberately left out, so the file is safe to keep.') : 'Nothing was written. Try again in a moment.');
  }catch(e){ if(typeof showToast==='function') showToast('Export failed', 'Could not build the backup. Try again.'); }
}
function importAllData(ev){
  const file = ev.target && ev.target.files && ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    // Clear the picker first. A file input does not fire change when the SAME file is chosen again,
    // so cancelling the confirm below and re-picking the same backup did nothing at all — the person
    // taps, nothing happens, and there is no way to tell the app is ignoring them.
    try{ if(ev && ev.target) ev.target.value = ''; }catch(_){ }
    try{
      const parsed = JSON.parse(reader.result);
      const data = parsed.data || parsed; // tolerate raw or wrapped
      // Same rule inbound: a file from someone else must never be able to install their session
      // or tokens on this device.
      const keys = Object.keys(data).filter(backupSafeKey);
      if(!keys.length){ showToast('Nothing to restore', 'That file has no To Try data.'); return; }
      if(!confirm('Restore ' + keys.length + ' items from this backup? This overwrites matching data on this device.')) return;
      // One restore path for both entry points. My first version of this fix duplicated the counting
      // loop inline here, which is the same duplicate-implementation problem the two plate calculators
      // had. restoreKeys() also does something better than my version did: it writes SMALLEST FIRST and
      // puts the big reproducible stores last, so on a device that is nearly full the irreplaceable
      // journal lands and the photos are what fail — rather than the other way round.
      const _r = restoreKeys(data);
      const _rep = restoreReport(_r);
      if(typeof haptic==='function') haptic(_r.failed.length ? 'warning' : 'success');
      if(_r.failed.length) alert(_rep.title + '\n\n' + _rep.body);
      showToast(_r.failed.length ? _rep.title : 'Restored', _rep.body);
      // Longer pause when something did not fit, so the alert is actually read before the reload.
      setTimeout(()=>location.reload(), _r.failed.length ? 5600 : 1200);
    }catch(e){ showToast('Restore failed', 'That file could not be read as a backup.'); }
  };
  reader.readAsText(file);
}

// ── STORAGE ──────────────────────────────────────────────────
// ls() is the single most-called function in this app, and its write path used to swallow every error
// into catch(e){}. That is fine for a JSON hiccup and catastrophic for QuotaExceededError: iOS Safari
// caps localStorage around 5MB per origin, and this app stores base64 progress photos, up to 1200 journal
// entries, coach and PT transcripts, and 120 days of food. Once full, EVERY subsequent save failed
// silently — the person kept logging meals and writing entries, saw the success toasts, and none of it
// persisted. That is the silent-failure mode in its purest form, on the platform we are shipping to.
//
// So: on a quota failure, free space from the largest EXPENDABLE stores (never the fight, never the
// journal), retry once, and if it still cannot write, say so out loud rather than pretending.
let _lsQuotaWarned = 0;   // timestamp of the last warning, not a one-shot flag
function _lsEmergencyPrune(){
  let freed = 0;
  // Ordered least-painful first. Photos are by far the biggest and are explicitly device-only, so a lost
  // photo costs a picture; a lost journal entry costs someone's words. Never touch totry_v/totry_journal.
  const plans = [
    ['totry_progress_photos', a => Array.isArray(a) ? a.slice(0, 8)  : a],
    ['totry_coach_history',   a => Array.isArray(a) ? a.slice(-6)    : a],
    ['totry_pt_history',      a => Array.isArray(a) ? a.slice(-6)    : a],
    ['totry_strava_activities', a => Array.isArray(a) ? a.slice(0, 40) : a],
    ['totry_workouts',        a => Array.isArray(a) ? a.slice(0, 120) : a],
  ];
  for(const [key, trim] of plans){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      const next = trim(JSON.parse(raw));
      const out = JSON.stringify(next);
      if(out.length < raw.length){
        // DEVICE-LOCAL WRITE. localStorage.setItem is overridden at boot (enableSyncMonitoring) to push
        // any SYNC_KEYS write to the cloud — and totry_coach_history, totry_pt_history and
        // totry_strava_activities are all in SYNC_KEYS. So freeing space on THIS phone was uploading the
        // truncated array, and "newer scalar wins" then deleted the same history on every other device.
        // Running low on storage on one device must never be a data loss on the account. pullFromCloud
        // already writes through _originalSetItem for exactly this reason; the prune did not.
        let _w = null; try{ if(_originalSetItem) _w = _originalSetItem; }catch(_){ }
        if(_w) _w.call(localStorage, key, out); else localStorage.setItem(key, out);
        freed += raw.length - out.length;
      }
    }catch(_){ }
    if(freed > 400000) break;                 // enough headroom for a normal write
  }
  // Mark the device constrained for a day, so pullFromCloud does not immediately restore the very
  // stores this just trimmed. Without it the prune freed space and the next pull gave it straight
  // back — the person saw "Storage full" again within seconds and nothing they did could help.
  if(freed > 0){
    try{ (_originalSetItem || localStorage.setItem.bind(localStorage))('totry_constrained_until', String(Date.now() + 86400000)); }catch(_){ }
  }
  // The last resort used to be `removeItem('totry_progress_photos')` — deleting EVERY progress photo,
  // silently, after which ls() retried, succeeded and returned true. Nothing was ever said.
  //
  // Its comment reasoned "they are device-only by policy, so nothing syncs back", which is true and
  // exactly backwards as a justification: device-only is precisely why there is NO other copy. Photos are
  // not in SYNC_KEYS, and exportFullBackup() walks SYNC_KEYS, so they are not in the cloud and not in the
  // backup file either. That block destroyed the only copy of the one thing in this app a person cannot
  // recreate — a year of Tuesday-morning photos — to make room for a single write.
  //
  // Now: no silent destruction. If the trims above were not enough, the write fails and ls() tells them
  // the truth, which it already does well ("that did not save... Export to back up, then clear old
  // progress photos"). Losing one save is recoverable. Losing the photos is not.
  return freed;
}
function ls(k,v){
  if(v===undefined){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}}
  try{ localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch(e){
    const quota = e && (e.name==='QuotaExceededError' || e.name==='NS_ERROR_DOM_QUOTA_REACHED' || e.code===22);
    if(!quota) return false;                  // a genuine serialisation problem — nothing to reclaim
    try{
      const _photoCount = () => { try{ return (JSON.parse(localStorage.getItem('totry_progress_photos'))||[]).length; }catch(_){ return 0; } };
      const _before = _photoCount();
      _lsEmergencyPrune();
      localStorage.setItem(k, JSON.stringify(v));
      // If making room cost them photos, SAY SO. The prune trims progress photos first because they are
      // the biggest — but they are also the only thing in this app a person cannot recreate, and they are
      // device-only, so a deleted one is gone from everywhere at once. A save that quietly ate a year of
      // Tuesday mornings is not a success just because the save worked.
      try{
        const _lost = _before - _photoCount();
        if(_lost > 0 && typeof showToast === 'function'){
          showToast('Storage was full', 'I had to remove ' + _lost + ' older progress photo' + (_lost === 1 ? '' : 's') +
            ' to save that. The newest are still here \u2014 back them up in Settings \u2192 Your data.');
        }
      }catch(_){ }
      return true;                            // recovered; the person keeps their data
    }catch(_){
      // Could not write even after reclaiming. Tell them — a lost save must never look like a saved one.
      // THROTTLED, NOT LATCHED. This was a one-shot boolean at module scope with no reset, so the
      // FIRST failed write of a session warned and every one after it was silent — a person on a full
      // device saw "Storage full" once, then wrote a journal entry, a weigh-in and a meal that all
      // silently went nowhere while the app said "Saved" each time. Once every 30 seconds is enough to
      // avoid a wall of toasts and still tell the truth about each new thing that did not save.
      if(Date.now() - _lsQuotaWarned > 30000){
        _lsQuotaWarned = Date.now();
        // SAID TWICE, DELIBERATELY. showToast() opens with `const ex=document.querySelector(
        // '.milestone-toast'); if(ex)ex.remove();` — so the caller's own success toast, fired
        // microseconds later in the same tick, deleted this warning before it ever painted. On a full
        // device the person was told "Saved" while nothing had been written.
        // The first call is synchronous so anything observing ls() directly still sees it; the second
        // lands after the caller has had its say, so the last word is the true one.
        const _quotaWarn = function(){ try{ if(typeof showToast==='function') showToast('Storage full',
          'This device is out of room, so that did not save. Settings \u2192 Your data \u2192 Export to back up, then clear old progress photos.'); }catch(_){} };
        _quotaWarn();
        try{ setTimeout(_quotaWarn, 60); }catch(_){ }
        try{ console.error('[ls] quota exceeded, write dropped:', k); }catch(_){}
      }
      return false;
    }
  }
}

// ── SHAPE-SAFE LIST READ ──────────────────────────────────────────────────────────────────────
// A totry_ key that should be a list can come back the WRONG SHAPE — an object where an array is
// expected (a partial cloud merge, a hand-edited export, an older build, a JSON round-trip that turned
// a sparse array into {"0":…}). Every list reader in this file is written `ls(k)||[]` and then
// .forEach/.filter/.map, and an object sails straight through `||[]` — so the very next line throws.
// Those throws land in initApp()'s try/catch and are never reported: Home quietly loses its day
// counter, habit grid and week strip, and getLifeState() dies, which takes the companion front door
// with it. Read lists through this: it recovers {"0":…} maps in key order and refuses anything else,
// so a bad shape costs one key instead of the screen.
function lsArr(k){
  try{
    const v = ls(k);
    if(Array.isArray(v)) return v;
    if(v && typeof v === 'object') return Object.keys(v).map(x => v[x]);
    return [];
  }catch(_){ return []; }
}

// ── THE CURRENCY SYMBOL, IN ONE PLACE ─────────────────────────────────────────────
// Settings has offered nine currencies since the money tab existed. Picking one saved the choice and
// fetched exchange rates — and changed nothing a person could see, because every amount in the app
// began with a hardcoded '$'. Someone in London set GBP and still read "$40 reclaimed". The setting
// even said so out loud, which made it honest but no less broken.
//
// This is the one accessor. If a symbol is ever wrong it is wrong here and nowhere else — the same
// shape as safeJournal / syncIdOf / isFaithHabitName, and for the same reason: the recurring failure
// in this codebase is fixing a class of bug in one place and missing the other forty.
//
// It does NOT convert stored amounts. A number the person typed is already in their own money;
// multiplying their debt by an exchange rate because they changed a dropdown would be a lie about
// what they owe. The symbol is a label on their number, not a conversion of it.
// Written as \u0024 rather than a bare '$' on purpose: scripts/fix-currency.js sweeps every '$' in a
// string literal into curSym(), and on its first run it happily ate this table and the fallback below,
// turning the accessor into infinite recursion. An escape is invisible to that sweep.
const CURRENCY_SYMBOLS = {
  AUD: '\u0024', USD: '\u0024', CAD: '\u0024', NZD: '\u0024', SGD: '\u0024',
  GBP: '\u00a3', EUR: '\u20ac', INR: '\u20b9', JPY: '\u00a5'
};
// PUTTING A PERSON'S OWN WORDS INTO AN onclick ATTRIBUTE.
//
// An inline handler is parsed TWICE: the HTML parser decodes entities first, then the result is
// compiled as JavaScript. So escaping an apostrophe as &#39; — which is right for text content — is
// exactly wrong here: the parser turns it back into ' before the compiler ever sees it, and
// _impulseHold('Mum's gift', 25, 0) is a SyntaxError. The button then has onclick === null. It
// renders, it looks correct, it does nothing, and nothing is thrown where anyone can see it.
//
// That shipped on two of the app's most important doors: "Before you buy" (someone about to spend
// impulsively, typing "Mum's birthday gift") and "What can't you start?" (someone frozen, typing
// "Dad's call"). Every action button was dead. iOS Smart Punctuation substitutes U+2019 and dodges
// it, which is why hand-testing on a phone never caught it — an Android or desktop keyboard does not.
//
// Escape for the JS string context, not the HTML one: backslashes first, then quotes, then the
// newlines that would end the statement. Attribute quoting is handled by using ' inside "…".
// THE LOCAL CALENDAR DAY, AS YYYY-MM-DD.
//
// `new Date().toISOString().split('T')[0]` is the UTC day, and it was being used to fill and to CAP
// date pickers that a person answers in their own timezone. At 7am in Sydney the UTC day is still
// yesterday, so "It happened earlier — set the real day" pre-filled yesterday's date next to this
// morning's clock time: a relapse logged at 7:00am was stamped 24 hours early, the streak repainted
// as "1 day clean", and max="yesterday" meant the real day could not even be selected. Every timezone
// east of UTC hits it for the first hours of every day; west of UTC the same line offers tomorrow.
function _todayLocalISO(d){
  const t = d ? new Date(d) : new Date();
  const p = n => String(n).padStart(2, '0');
  return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate());
}

function _jsAttr(s){
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, ' ');
}

function curSym(){
  try{ return CURRENCY_SYMBOLS[ls('totry_currency') || 'AUD'] || '\u0024'; }
  catch(_){ return '\u0024'; }
}

// The static shell is HTML, not JavaScript, so it cannot call curSym() — the sign-in screen once
// shipped a literal \u2014 for exactly this reason. Instead each static site declares what it wants
// (data-cur-text / data-cur-ph, with {c} standing in for the symbol) and this fills them in: at boot,
// and again the moment the setting changes, so a person sees it take effect rather than being told to
// reload. The markup keeps a plain '$' as its written value, so the pre-JS paint is never blank.
function applyCurrencySymbols(){
  try{
    const c = curSym();
    document.querySelectorAll('[data-cur-text]').forEach(el => {
      el.textContent = el.getAttribute('data-cur-text').split('{c}').join(c);
    });
    document.querySelectorAll('[data-cur-ph]').forEach(el => {
      el.setAttribute('placeholder', el.getAttribute('data-cur-ph').split('{c}').join(c));
    });
  }catch(_){}
}

// ── APP VERSION & CHANGELOG ───────────────────────────────────
// Bump APP_VERSION each release. The "what's new" card ONLY shows when the current
// version is flagged major:true — routine updates ship silently. New users instead get
// a one-time "what's possible" intro (see WHATS_POSSIBLE), not a changelog.
const APP_VERSION = 'v501';
const CHANGELOG = {
  // Example of a major release entry (set major:true to surface the modal):
  // 'v50': { major:true, title:'Big update', items:['...'] }
};
// Shown ONCE to brand-new users after they finish onboarding — a tour of what the app can do,
// not a list of recent fixes.
const WHATS_POSSIBLE = {
  title: 'What To Try can do',
  items: [
    'Fight any vice with live streaks, urge support, and a coach that remembers.',
    'Train with full routines + Hevy sync; log food with macros, barcode, and recipes.',
    'Grow your soul: offline verses for every situation, morning intentions, evening reflection.',
    'Master your money: debts, budgets, savings, net worth.',
    'One AI coach that knows all of it and speaks to your whole life.'
  ]
};

// ── SUPABASE INIT ──────────────────────────────────────────────
const SUPABASE_URL='https://oklvalcgxeoudgpldzkk.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_YdBhqYPvyxeUH0E2z--84w_RXxrIuE3';
const API=SUPABASE_URL+'/functions/v1/ai-proxy';

// ESV API - approved for free use
// Limits: 500 verses/query, 5000 queries/day. No local storage of 500+ verses.
// NOTE — this key ships inside a public single-file bundle, so it is readable by anyone who views
// source on the live site. api.esv.org issues keys per person and does not expect them to be
// published: it can be rate-limited or revoked by someone else's use, which would take the ESV
// reader down for everyone. The fix is to proxy these requests through the Supabase edge function
// the way AI calls already are, and rotate the key — both need the account owner, so it is
// recorded here and in PRE-LAUNCH.md rather than silently left. A duplicate, unused copy of this
// same key (const ESV_KEY) was removed in v461.
// No hardcoded key. api.esv.org issues keys per person and does not expect them published; this one
// shipped in a public file for months, where anyone could lift it and get it rate-limited or revoked —
// taking the ESV reader down for everyone. It now comes from the key-proxy edge function, or from a key
// the person entered themselves in Settings. With neither, ESV is simply skipped and the reader falls
// back to KJV, ASV or WEB — all of which need no key at all, which is why this degrades quietly.
async function esvPassage(q){
  try{
    const d = await keyProxy({ provider:'esv', q: q });
    if(d && d.passages && d.passages[0]) return d.passages[0];
    const own = ls('totry_esv_key');
    if(!own) return null;
    const r = await fetch('https://api.esv.org/v3/passage/text/?q=' + encodeURIComponent(q) +
      '&include-verse-numbers=true&include-headings=false&include-footnotes=false' +
      '&include-short-copyright=false&include-passage-references=false',
      { headers: { 'Authorization': 'Token ' + own } });
    if(!r.ok) return null;
    const j = await r.json();
    return (j.passages && j.passages[0]) ? j.passages[0] : null;
  }catch(_){ return null; }
}
// Session-only cache (cleared on reload - respects ESV terms)
const _esvSessionCache = {};

async function fetchESV(reference){
  // Check session cache first
  if(_esvSessionCache[reference]) return _esvSessionCache[reference];
  
  try {
    const passage = await esvPassage(reference);
    if(passage){
      const text = passage.trim();
      _esvSessionCache[reference] = text;
      return text;
    }
  } catch(e){
    console.error('ESV fetch error:', e);
  }
  return null;
}

// Supabase client - initialized once on load
let sb = null;
let currentUser = null;
let syncEnabled = false;
let syncQueue = [];
let syncInterval = null;

// Initialize Supabase client when SDK loads
let _sbTries = 0;
function initSupabase(){
  if(typeof window.supabase === 'undefined'){
    // CAPPED. This retried every 200ms forever, and because nothing opens the app until sb exists,
    // "forever" meant a blank splash for as long as the person kept looking at it. 25 tries = 5s, just
    // inside the 6s splash timeout, then the app opens on what's already on the phone.
    if(++_sbTries > 25){ bootWithoutCloud('sdk-never-loaded'); return; }
    setTimeout(initSupabase, 200);
    return;
  }
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'totry_auth_session'
      }
    });
    console.log('Supabase initialized');
    // Listen for auth changes
    sb.auth.onAuthStateChange((event, session) => {
      // (auth event logging removed — fired on every state change)
      if(session && session.user){
        currentUser = session.user;
        syncEnabled = true;
        startSyncLoop();
        // SELF-HEAL: if the user verified in ANOTHER tab (e.g. tapped the email's magic link),
        // supabase-js syncs the session here and fires SIGNED_IN. If our auth screen is still
        // showing, advance it — so the original "enter the code" tab never gets stranded.
        const authEl = document.getElementById('auth-container');
        if(event === 'SIGNED_IN' && authEl && authEl.style.display !== 'none' && authEl.style.display !== ''){
          proceedAfterAuth(session.user);
        }
      } else {
        currentUser = null;
        syncEnabled = false;
        stopSyncLoop();
      }
    });
  } catch(e){
    console.error('Supabase init failed:', e);
  }
}

// ─── AUTH FLOW ─────────────────────────────────────────────────
// Single routing point after a successful sign-in (from code entry OR a magic-link click in
// another tab): restore cloud data if returning, else start onboarding. Idempotent.
let __authProceeded = false;
async function proceedAfterAuth(user){
  if(__authProceeded) return;
  __authProceeded = true;
  try{
    currentUser = user;
    syncEnabled = true;
    if(user && user.email){ localStorage.setItem('totry_user_email', user.email); }
    const restored = await restoreFromCloud();
    try{ if(typeof flushOutbox==='function') await flushOutbox(); }catch(_){ }
    if(typeof repairJourneyStart === 'function') repairJourneyStart();
  try{
    if(!localStorage.getItem('totry_first_open')){ localStorage.setItem('totry_first_open','1'); logEvent('first_open'); }
    const tk = new Date().toLocaleDateString('en-AU');
    if(localStorage.getItem('totry_open_logged') !== tk){ localStorage.setItem('totry_open_logged', tk); logEvent('open'); }
  }catch(_){ }
  if(typeof renderTemplates === 'function') renderTemplates();
    document.getElementById('auth-container').style.display='none';
    if(restored){
      document.getElementById('onboard').classList.remove('active');
      document.getElementById('onboard').style.display = 'none';
      document.querySelector('.app').classList.add('app-ready');
      if(typeof initApp === 'function') await initApp();
      if(typeof go === 'function') go('home');
      showToast('Welcome back','Your journey continues.');
    } else {
      document.getElementById('onboard').classList.add('active');
      document.getElementById('onboard').style.display = 'block';
      try{ const sc=document.getElementById('ob-chip-strava'); if(sc && typeof isStravaApproved==='function' && isStravaApproved()) sc.style.display=''; }catch(_){}
        try{ const gh=document.getElementById('ob-chip-googlehealth'); if(gh && !(typeof isNativeApp==='function' && isNativeApp())) gh.style.display=''; }catch(_){}
    }
    startSyncLoop();
    haptic('celebrate');
  }catch(e){
    console.error('proceedAfterAuth failed:', e);
    __authProceeded = false; // allow retry
  }
}
// One-tap Google sign-in. No email quota involved — auth scales with launch waves.
// Google sign-in is intentionally DISABLED for now (removed from the UI). Email OTP is the
// single sign-in path, which avoids the "same Gmail, two account types" confusion. The full
// working code + setup steps live in GOOGLE_SIGNIN.md if we choose to re-enable it later.
async function authGoogle(){ /* disabled — see GOOGLE_SIGNIN.md to re-enable */ }

async function authSendOtp(){
  const email = document.getElementById('auth-email-input')?.value.trim().toLowerCase();
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    showToast('Invalid email','Please enter a valid email address.');
    return;
  }
  
  authShowStep('loading');
  document.getElementById('auth-loading-msg').textContent = 'Sending your code...';
  
  if(!sb){
    authShowError('Connection issue. Please refresh and try again.');
    return;
  }
  
  try {
    const { error } = await sb.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });
    
    if(error){
      console.error('OTP send error:', error);
      authShowError(error.message || 'Could not send the code. Please try again.');
      return;
    }
    
    // Save email for verify step
    localStorage.setItem('totry_pending_email', email);
    document.getElementById('auth-email-display').textContent = email;
    authShowStep('otp');
    setTimeout(()=>document.getElementById('auth-otp-input')?.focus(), 100);
  } catch(e){
    console.error('Auth error:', e);
    authShowError('Something went wrong. Please try again.');
  }
}

async function authVerifyOtp(){
  const code = document.getElementById('auth-otp-input')?.value.trim();
  const email = localStorage.getItem('totry_pending_email');
  
  if(!code || code.length !== 6){
    showToast('Invalid code','Please enter the 6-digit code.');
    return;
  }
  
  if(!email){
    authShowError('Session expired. Please start over.');
    return;
  }
  
  authShowStep('loading');
  document.getElementById('auth-loading-msg').textContent = 'Verifying...';
  
  try {
    const { data, error } = await sb.auth.verifyOtp({
      email: email,
      token: code,
      type: 'email'
    });
    
    if(error){
      console.error('OTP verify error:', error);
      authShowError(error.message || 'Code did not match. Please try again.');
      return;
    }
    
    if(data?.user){
      localStorage.removeItem('totry_pending_email');
      localStorage.setItem('totry_user_email', email);
      await proceedAfterAuth(data.user);
    }
  } catch(e){
    console.error('Verify error:', e);
    authShowError('Something went wrong. Please try again.');
  }
}

async function authResendOtp(){
  const email = localStorage.getItem('totry_pending_email');
  if(!email) return;
  document.getElementById('auth-email-input').value = email;
  await authSendOtp();
}

function authBack(){
  authShowStep('email');
  const email = localStorage.getItem('totry_pending_email');
  if(email){
    document.getElementById('auth-email-input').value = email;
  }
}

function authShowStep(step){
  ['email','otp','loading','error'].forEach(s=>{
    const el = document.getElementById('auth-'+s);
    if(el) el.style.display = s === step ? 'block' : 'none';
  });
}

function authShowError(msg){
  // Launch-wave honesty: a raw "rate limit exceeded" reads like the app is broken.
  // Say what's actually happening and keep their spot warm.
  // "Failed to fetch" is what a browser says, not what a person needs. Offline, the honest version also
  // tells them the thing that still works.
  if(/failed to fetch|networkerror|load failed|network request failed/i.test(msg || '')){
    msg = 'No connection right now, so the code can\u2019t reach you. You can come in without an account below \u2014 everything saves on this phone.';
  }
  else if(/rate limit/i.test(msg || '')){
    msg = 'So many people are joining right now that sign-up emails are briefly throttled. Wait a few minutes and tap Try again \u2014 your spot is safe. \ud83d\ude4f';
  }
  document.getElementById('auth-error-msg').textContent = msg;
  authShowStep('error');
}

function authReset(){
  authShowStep('email');
  document.getElementById('auth-email-input')?.focus();
}

async function signOut(){
  if(!sb) return;
  // "Your data is saved and you can sign back in anytime" was a promise this function did not keep.
  // It wipes every totry_ key, and several of the most personal ones are DELIBERATELY never uploaded:
  // progress photos never leave the device (privacy policy §4), and cycle data only leaves if she
  // switched backup on. Signing out — something people do casually, to tidy up or switch accounts —
  // destroyed every progress photo they had ever taken, permanently, while telling them it was safe.
  // Now: flush anything still pending first, then name exactly what cannot come back.
  const _n = k => { try{ const v=ls(k); return Array.isArray(v) ? v.length : (v ? 1 : 0); }catch(_){ return 0; } };
  const photos = _n('totry_progress_photos');
  const cyc = (function(){ try{ const c=ls(CYCLE_KEY); return (c && !c.backup) ? 1 : 0; }catch(_){ return 0; } })();
  let pending = 0;
  try{ pending = Object.keys(_getOutbox()||{}).length; }catch(_){}

  // Give un-uploaded work its best chance of reaching the cloud before anything is deleted.
  if(pending){ try{ await flushOutbox(); pending = Object.keys(_getOutbox()||{}).length; }catch(_){} }

  const losses = [];
  if(photos) losses.push(photos + ' progress photo' + (photos===1?'':'s'));
  if(cyc) losses.push('your cycle log (backup is off, so it is only on this device)');
  if(pending) losses.push(pending + ' change' + (pending===1?'':'s') + ' that have not reached the cloud yet');

  const msg = losses.length
    ? ('Signing out clears this device. Everything synced comes back when you sign in \u2014 but these '
       + 'are only here and will be gone for good:\n\n\u2022 ' + losses.join('\n\u2022 ')
       + '\n\nSettings \u2192 Your data \u2192 Export saves them first. Sign out anyway?')
    : 'Sign out? Everything is synced, so it all comes back when you sign in.';
  if(!confirm(msg)) return;

  try {
    await sb.auth.signOut();
    // Clear local data so next user gets clean slate
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if(k.startsWith('totry_') && k !== 'totry_auth_session') {
        localStorage.removeItem(k);
      }
    });
    location.reload();
  } catch(e){
    console.error('Sign out error:', e);
  }
}

// ─── SYNC LAYER ────────────────────────────────────────────────
// Mirrors localStorage to Supabase user_data table
// All app state syncs in background

const SYNC_KEYS = [
  // Identity & onboarding
  'totry_v','totry_identity','totry_season','totry_name','totry_partner','totry_why','totry_start','totry_height','totry_onboarded','totry_journey_start','totry_first_start','totry_restarts',
  // Daily reflection data
  'totry_journal','totry_evenings','totry_mornings','totry_examens','totry_prayers',
  'totry_cal_events','totry_feeling_wins',
  // Sacraments (Confession/Reconciliation + Mass/Eucharist)
  // Durable, user-authored things that were staying on one device. totry_releases is the one that
  // stung most: it is the anti-engagement metric the app SHOWS — the count of times someone came,
  // regulated, and left — and switching phones silently reset it to zero. train_goal/train_days are
  // the answers that generated totry_split, which already synced without them.
  'totry_health_write',   // opted in to mirroring logs into Apple Health — see HealthWrite
  'totry_cba',   // the person's own cost-benefit reasons, per vice — see openCBA()
  'totry_releases','totry_feelings','totry_hunger_log','totry_breath_log',
  'totry_meal_plan','totry_meal_prefs','totry_train_goal','totry_train_days',
  'totry_confessions','totry_masses','totry_saved_meals','totry_migrate_dismissed','totry_food_imported','totry_body_goal','totry_fight_log',
  // NOTE: totry_push_prefs is deliberately NOT synced — notification permission is granted per-device,
  // so a stale cloud value (from before you enabled it, or another device) was silently flipping your
  // reminders back off. Reminders are device-local; you re-enable per device (which requires that
  // device's permission anyway).
  // Training & body
  'totry_workouts','totry_body','totry_measurements','totry_ms','totry_split','totry_routines','totry_prs',
  'totry_strava_token','totry_google_token','totry_strava_activities','totry_strava_burns_byday','totry_strength_burns_byday','totry_watch_burns_byday','totry_calorie_burns','totry_google_steps',
  'totry_hevy_api_key','totry_hevy_synced_once','totry_hevy_tier','totry_hevy_templates','totry_hevy_templates_at','totry_hevy_routines','totry_hevy_folders','totry_hevy_routines_at','totry_hevy_today_pick','totry_mobility_profile','totry_mood_log','totry_meal_plans','totry_pt_adjustments','totry_bar_weight','totry_last_plate_target','totry_last_warmup_target',
  'totry_custom_exercises','totry_bw_volume','totry_session_proof','totry_first_win_done','totry_quiet_greeted',
  // totry_progress_photos is deliberately NOT synced: both privacy policies state photos stay on
  // the device, and a policy that isn't true is worse than no policy. (Also: base64 photos would eat
  // the row.) A one-time purge below clears any copy an earlier build already uploaded.
  'totry_weight_trend',
  // The people you carry, the plans you set, and the numbers-off preference. These are among the most
  // personal things in the app — losing them on a reinstall would mean losing your few and every
  // if-then plan you wrote, so they sync like everything else.
  'totry_your_few','totry_reachouts','totry_if_then','totry_nut_gentle','totry_nourish_care_shown','totry_impulse_holds',
  // Nutrition
  'totry_nutlog','totry_nut_goals','totry_nut_macros','totry_tdee_data','totry_calorie_goal_type','totry_ca',
  'totry_recipes','totry_custom_foods','totry_recent_foods','totry_water','totry_water_goal','totry_fasting','totry_fast_log','totry_usda_key','totry_esv_key','totry_nutritionix_id','totry_nutritionix_key',
  // Money — totry_f holds debts+savings, totry_payments holds logged payments
  'totry_finance_goals','totry_transactions','totry_debt_strategy','totry_savings_usa','totry_savings_india',
  'totry_subscriptions','totry_bills','totry_budgets','totry_assets','totry_f','totry_payments','totry_family_contrib','totry_poker_sessions','totry_family_target',
  // Habits & wins — totry_h is the habit grid, totry_trackers holds daily sleep/steps/weight
  'totry_habits','totry_h','totry_sv','totry_vs','totry_wins','totry_streaks',
  'totry_step_goal','totry_sleep_goal','totry_trackers','totry_today_steps','totry_cravings',
  // Relationships, promises, letters
  'totry_relationships','totry_letters','totry_promises','totry_affirmations','totry_checkins','totry_freezes',
  // Vices & fights
  'totry_vice_savings_log','totry_syntheses',
  // Goals & weekly review
  'totry_goals','totry_reviews','totry_tomorrow_tasks',
  // Apps & personalisation
  'totry_apps_used','totry_affirms','totry_notif_schedule','totry_honest_q',
  // Preferences (v29)
  'totry_currency','totry_weight_unit','totry_distance_unit','totry_theme','totry_timezone',
  'totry_tombstones',   // deletions, so a union cannot resurrect what someone removed
  // Late additions — real state that should survive a reinstall
  'totry_notif_enabled','totry_user_email','totry_last_synthesis','totry_usage_log','totry_reminder_times','totry_reminder_morning','totry_reminder_evening',// v30: conversation memory + share preferences + reading position
  'totry_coach_history','totry_coach_memory','totry_pt_history','totry_share_prefs','totry_bible_last_position',
  // Your corrected food numbers — they're yours, so they follow you to every device.
  'totry_food_overrides',
  'totry_vice_uses',
  'totry_moments_won',
  'totry_cal_cycling',
  // Money × Soul — the season you keep and what you give away
  'totry_fast_season','totry_giving','totry_giving_pledge','totry_zakat',
  'totry_rosaries',
  // Values card sort (their own standard) + the loving-kindness/blessing log.
  'totry_values','totry_blessings',
  // Three good things — the evening's gratitude, incl. who it was about and whether it got said.
  'totry_tgt',
  // Dismissed subscription suggestions + the last 'on this day' entry shown.
  'totry_sub_dismissed','totry_otd_seen',
  // Where you are in each reading plan. A position, never a score.
  'totry_read_plans',
  // v344 — the first felt moment, and the receptivity gate under the reach-out.
  'totry_first_moment','totry_quiet_hours','totry_reachout_log','totry_reachout_state','totry_last_active_ts',
  // The Toolkit — which skills you've picked up, and the permission-giving sentence in your own words.
  'totry_toolkit',
  // Who you are and what you believe. These were missing, and their absence was not cosmetic: on a
  // new device faith fell back to Christianity, so a Muslim or secular person reinstalling was handed
  // someone else's tradition, and userSex() went null, which changes the calorie and protein maths and
  // the voice. Identity has to survive a reinstall.
  'totry_sex','totry_faith_tradition','totry_faith_level','totry_faith_door_seen'
];

// ONE LIST FOR "THIS IS A CREDENTIAL, NOT DATA".
//
// BACKUP_NEVER already says these must never go into an export file — the reasoning is written above
// it — and then SYNC_KEYS uploaded the very same values to the database. So a live Strava OAuth token,
// a Google Fit token and a Hevy API key were held server-side for every signed-in person, while the
// privacy policy says only that "Strava sees your Strava data" and "Hevy sees your Hevy data". It does
// not say I hold the keys to those accounts. Two lists disagreeing about what a secret is meant one of
// them was wrong; the export list had it right.
//
// The cost is honest and small: reconnect Strava or Hevy on a new device, which is two taps. The
// alternative is a database of other people's live account credentials that nobody was told about.
for(const _cred of BACKUP_NEVER){
  const _i = SYNC_KEYS.indexOf(_cred);
  if(_i !== -1) SYNC_KEYS.splice(_i, 1);
}
// totry_cycle is deliberately NOT in the list above. Post-Dobbs, cycle data is the most sensitive
// thing this app holds, so it stays on the device by default. It is pushed into SYNC_KEYS at runtime
// ONLY if she switches backup on herself (Settings → Your cycle), and spliced out the moment she
// switches it off. exportAllData() dumps every totry_ key, so a local backup never loses it.
try{ const _cyc = JSON.parse(localStorage.getItem('totry_cycle')||'null');
     if(_cyc && _cyc.backup && !SYNC_KEYS.includes('totry_cycle')) SYNC_KEYS.push('totry_cycle'); }catch(_){ }

async function restoreFromCloud(){
  // IMPORTANT: this runs FIRST on every signed-in open. It must use the SAME safe, non-clobbering
  // merge as the sync loop — otherwise it could overwrite today's just-saved local data (food log,
  // evening check-in) with a stale cloud copy before the good merge runs. So we delegate to
  // mergeFromCloud, which date-keyed-unions totry_nutlog, id-unions history arrays, and uses
  // per-key timestamps for everything else. Never loses data logged in either place.
  if(!sb || !currentUser) return false;
  return await mergeFromCloud();
}


