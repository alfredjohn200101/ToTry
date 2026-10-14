

// ═══════════════════════════════════════════════════════════════
// TO TRY — Clean Build, no function conflicts
// The attribution came out on 14 Oct 2026 at the owner's request: "let go of me and embrace the
// app is an app for the user". The VOICE stays — the brother who knows them is the moat, and the
// owner was explicit that only the byline goes. Nobody needs to know whose brother it is.
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
        // A RESTORE IS A DELIBERATE ACT AND MUST OUTRANK AN OLD DELETION. tombstoneRevoke's own note
        // says exactly this. Without it, restoring a backup to get a deleted journal entry back said
        // "Restored 25 data sets" and the next cloud pull read the surviving tombstone and deleted
        // the entry again — then wrote the shortened list back up, so it went to every device. The
        // person did the one thing the app told them to do to recover, was told it worked, and lost
        // it a second time without being told anything at all.
        try{
          if(typeof tombstoneRevoke === 'function' && typeof syncIdOf === 'function' && Array.isArray(parsed)){
            tombstoneRevoke.apply(null, [k].concat(parsed.map(syncIdOf)));
          }
          // AND THE TWO STORES THAT ARE NOT KEYED BY syncIdOf. A deleted vice is tombstoned by its
          // NAME (09-fight-deep.js) and a deleted debt by its name inside totry_f, which is an object
          // and not an array — so neither was reachable by the line above, and restoring a backup to
          // get a vice back said "Restored" and let the very next cloud pull delete it again. That is
          // the harm the comment above this block describes, arriving through the two doors it does
          // not cover: the person does the one thing the app told them to do to recover, is told it
          // worked, and loses it a second time without being told anything at all.
          if(typeof tombstoneRevoke === 'function'){
            if(k === 'totry_v' && Array.isArray(parsed)){
              tombstoneRevoke.apply(null, ['totry_v'].concat(parsed.map(function(v){ return String((v && v.n) || '').toLowerCase(); })));
            }
            if(k === 'totry_f' && parsed && Array.isArray(parsed.d)){
              tombstoneRevoke.apply(null, ['totry_f'].concat(parsed.d.map(function(d){ return String((d && d.n) || '').toLowerCase(); })));
            }
            // AND THE THIRD SHAPE: totry_nutlog is an OBJECT OF ARRAYS, so it is neither the
            // Array.isArray case above nor totry_v nor totry_f — it fell through all three. Restoring
            // a backup to get a deleted meal back said "Restored" and the next cloud pull read the
            // surviving tombstone and deleted it again, on every device, for the 180 days a tombstone
            // lives. Same harm as the note above, arriving through the one door it does not cover.
            // Ids are syncIdOf(entry), exactly as the nutlog union looks them up.
            if(k === 'totry_nutlog' && parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof syncIdOf === 'function'){
              const _ids = [];
              Object.keys(parsed).forEach(function(d){ (Array.isArray(parsed[d]) ? parsed[d] : []).forEach(function(e){ _ids.push(syncIdOf(e)); }); });
              if(_ids.length) tombstoneRevoke.apply(null, ['totry_nutlog'].concat(_ids));
            }
          }
        }catch(_){ }
        try{ syncToCloud(k, parsed); }catch(_){ }             // a cloud hiccup must not un-count a local write
      }
    }catch(e){
      out.failed.push(k);
      if(e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)) out.full = true;
      try{ console.warn('[restore] did not fit:', k, e && e.name); }catch(_){ }
    }
  });
  // A backup file carries whatever spelling the device that EXPORTED it produced, so a file made in
  // the PWA and restored in the App Store build (or the reverse) lands a whole second set of day
  // keys. Normalise and merge here, through the same raw write + explicit push this function uses, so
  // the merged map is what reaches the cloud rather than the file's two-spelling version.
  try{ if(typeof migrateDayKeys === 'function') migrateDayKeys({raw:true}); }catch(_){ }
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
    const payload = { app:'ToTry', version:(typeof APP_VERSION!=='undefined'?APP_VERSION:'?'), exported:new Date().toISOString(), keys:Object.keys(dump).length, data:dump };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    // Through SaveFile: an <a download> does nothing in a WKWebView, so on iOS this used to produce no
    // file and no error — the export promise, silently broken in the App Store build.
    const _r = await SaveFile.save(blob, 'totry-backup-' + _todayLocalISO() + '.json', 'ToTry backup');
    if(_r === null) return;   // share sheet dismissed — they chose not to; don't tell them it's saved
    if(typeof haptic==='function') haptic('success');
    if(typeof showToast==='function') showToast(_r ? 'Backup saved' : 'Not saved', _r ? (payload.keys + ' items exported. Your sign-in and app tokens are deliberately left out, so the file is safe to keep.') : 'Nothing was written. Try again in a moment.');
  }catch(e){ if(typeof showToast==='function') showToast('Export failed', 'Could not build the backup. Try again.'); }
}
async function importAllData(ev){
  const file = ev.target && ev.target.files && ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
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
      if(!keys.length){ showToast('Nothing to restore', 'That file has no ToTry data.'); return; }
      if(!(await askConfirm('Restore ' + keys.length + ' items from this backup? This overwrites matching data on this device.'))) return;
      // One restore path for both entry points. My first version of this fix duplicated the counting
      // loop inline here, which is the same duplicate-implementation problem the two plate calculators
      // had. restoreKeys() also does something better than my version did: it writes SMALLEST FIRST and
      // puts the big reproducible stores last, so on a device that is nearly full the irreplaceable
      // journal lands and the photos are what fail — rather than the other way round.
      const _r = restoreKeys(data);
      const _rep = restoreReport(_r);
      if(typeof haptic==='function') haptic(_r.failed.length ? 'warning' : 'success');
      if(_r.failed.length) tellUser(_rep.title, _rep.body, {danger:true});
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
    ['totry_progress_photos', a => Array.isArray(a) ? a.slice(0, 20) : a],   // gentle step first
    ['totry_coach_history',   a => Array.isArray(a) ? a.slice(-6)    : a],
    ['totry_pt_history',      a => Array.isArray(a) ? a.slice(-6)    : a],
    ['totry_strava_activities', a => Array.isArray(a) ? a.slice(0, 40) : a],
    ['totry_workouts',        a => Array.isArray(a) ? a.slice(0, 120) : a],
    ['totry_progress_photos', a => Array.isArray(a) ? a.slice(0, 8)   : a],   // last resort
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
      // EVERY failed write is recorded, throttled or not — see the note below on showToast. The
      // throttle governs how often we EXPLAIN, never whether the app is allowed to claim success.
      try{ window.__lsLastWriteFailed = Date.now(); }catch(_){ }
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

// ── THE DAY KEY, BUILT FROM PARTS AND NEVER FROM A FORMATTER ──────────────────────────────────────
// `new Date().toLocaleDateString('en-AU')` was this app's PERSISTED day key, and it is not a stable
// string. Chromium zero-pads both fields, WebKit/iOS pads neither: the same instant is "22/09/2026"
// in the PWA on a desktop browser and "22/9/2026" in the App Store build. 300 of the 365 days of 2026
// diverge — only the 10th–31st of October, November and December agree — and the two are compared by
// string equality and used as OBJECT KEYS in six cloud-synced stores.
//
// What that cost: totry_nutlog's per-date union (01-sync.js) unions key STRINGS, so one day survived
// as two keys forever and each device read only its own half. totry_trackers, totry_water,
// totry_calorie_burns, totry_strava_burns_byday, totry_watch_burns_byday, totry_tgt and
// totry_usage_log had no union branch at all and fell to scalar last-write-wins — one device's whole
// map REPLACED the other's. It began on the FIRST sync of a new device: with nothing local, the pull
// adopts the other engine's keys wholesale.
//
// A SECOND divergence rides with it: {month:'short'} in en-AU is "Sept" in Chromium and "Sep" in
// WebKit (a CLDR data difference, so only Jun/Jul/Sep differ), and `new Date("5 Sept 2026")` is a
// real date in Chromium and Invalid Date in WebKit. dayKeyNorm collapses both spellings.
//
// WHAT THIS DOES NOT FIX: the day key is still decided by the DEVICE'S TIMEZONE. Two devices in
// different zones still disagree about which day an evening belongs to. The Timezone SETTING was
// REMOVED on 13 Oct 2026 rather than left standing: it was a fourteen-option select that nothing
// read, and choosing an option toasted "Your days still follow this device's clock". The
// underlying bug is unchanged and still open; what is gone is a control implying it was fixed.

// Canonical zero-padded DD/MM/YYYY from a Date, epoch ms, an ISO timestamp, a bare YYYY-MM-DD, or a
// key already in either engine's spelling. '' for anything it cannot read WITH CERTAINTY — a wrong
// day is worse than no day, because a wrong day is written to disk and then synced.
//
// "Today" is `arguments.length === 0`, NOT `v === undefined`: dayKeyOf(w.ts) on a row with a missing
// ts must return '' rather than silently filing a year-old workout under this morning.
function dayKeyOf(v){
  try{
    let d = null;
    if(arguments.length === 0){ d = new Date(); }
    else if(v instanceof Date){ d = v; }
    else if(typeof v === 'number'){ if(!isFinite(v)) return ''; d = new Date(v); }
    else if(typeof v === 'string'){
      const s = v.trim();
      if(!s) return '';
      const already = dayKeyNorm(s);
      if(already) return already;                       // a day key in either spelling, or "5 Sept 2026"
      // A BARE YYYY-MM-DD IS READ AS LOCAL PARTS. Both engines read "2026-09-22" through Date as UTC
      // midnight, which is the PREVIOUS day everywhere west of Greenwich — so parsing it would have
      // quietly shifted every Health-imported night back one day.
      const ymd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
      if(ymd) return dayKeyNorm(ymd[3] + '/' + ymd[2] + '/' + ymd[1]);
      // A full ISO 8601 timestamp — the one string shape both engines parse identically. Anything
      // else (a locale long form, "5 Sept", a two-digit year) is refused rather than guessed at.
      if(!/^\d{4}-\d{1,2}-\d{1,2}[T ]\d{1,2}:\d{2}/.test(s)) return '';
      const t = Date.parse(s);
      if(isNaN(t)) return '';
      d = new Date(t);
    }
    else return '';
    if(!d || isNaN(d.getTime())) return '';
    return dayKeyNorm(d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear());
  }catch(_){ return ''; }
}

// Either engine's spelling → the canonical one; '' when unreadable. This is also the ONE place that
// pads, which is what makes dayKeyNorm(canonical) === canonical — and that identity is what makes the
// migration below idempotent.
function dayKeyNorm(s){
  try{
    if(s === null || s === undefined) return '';
    const str = String(s).trim();
    if(!str) return '';
    let d = 0, m = 0, y = 0;
    // "22/9/2026" and "22/09/2026". A FOUR-DIGIT YEAR IS REQUIRED: a two-digit year is ambiguous
    // (is "26" 1926 or 2026?) and a year-less key cannot be a day key at all, so both are refused.
    let mt = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
    if(mt){ d = +mt[1]; m = +mt[2]; y = +mt[3]; }
    else{
      // "5 Sept 2026" / "5 Sep 2026" / "Mon, 5 September 2026" — the {month:'short'} forms the two
      // engines spell differently. Three letters settles it: all twelve English abbreviations are
      // distinct at three, so "Sept" and "September" both collapse onto "Sep".
      mt = /(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/.exec(str);
      if(!mt) return '';
      const MON = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const i = MON.indexOf(mt[2].slice(0,3).toLowerCase());
      if(i < 0) return '';
      d = +mt[1]; m = i + 1; y = +mt[3];
    }
    if(!(d >= 1 && d <= 31) || !(m >= 1 && m <= 12) || !(y >= 1000 && y <= 9999)) return '';
    return (d < 10 ? '0' : '') + d + '/' + (m < 10 ? '0' : '') + m + '/' + y;
  }catch(_){ return ''; }
}

// ONE merge rule for a day-keyed map, called by BOTH migrateDayKeys() and the cloud-pull branch in
// 01-sync.js. Two implementations WILL drift — the note above syncIdOf() in that file says exactly
// this about exactly this shape of bug — so there is one definition and both sides call it.
//
// `keep` is the side that wins a conflict, and every caller passes the NEWER side there.
//  • array day (totry_nutlog): union by syncIdOf. syncIdOf is 'i'+id and contains no date, which is
//    why moving an entry from one spelling to the other cannot orphan its tombstone.
//  • object day (totry_trackers, totry_tgt, totry_usage_log): field by field, keep winning any field
//    it actually carries. Strict === is what lets a real `false` survive: `keep[f] === undefined ||
//    null || ''` never matches it, so a told:false the person set on the newer device is copied
//    rather than skipped.
//  • scalar day (totry_water, totry_calorie_burns): keep wins outright.
//
// NO STORE TAKES Math.max. An earlier draft exempted the two burn sub-ledgers as "append-only
// importer totals, never corrected downward". Both halves of that are false in this tree:
//  • totry_watch_burns_byday is HAND-TYPED. saveEvening() reads #evening-move — a number input in
//    the evening check-in, which the same function's own comment calls "editable until midnight" —
//    and assigns it straight onto the day. A typo'd 8000 corrected to 800 five minutes later is the
//    ordinary case, and Math.max would restore the 8000 and then _queueWrite would push the undone
//    correction to every device the person owns.
//  • totry_strava_burns_byday is a FULL REPLACE. syncStrava() rebuilds `freshByDay` from the whole
//    activity list each time and writes it whole, with its own comment saying "re-syncs replace
//    rather than double-count". A day legitimately goes DOWN when an activity is deleted on Strava,
//    when its calories are corrected, and — the one that matters — when a session is newly
//    recognised as a Hevy duplicate and skipped. That skip IS the double-count removal, so Math.max
//    would reinstate exactly the number the block exists to take away.
//
// opts.zeroIsAbsent — FOR THE MIGRATION ONLY, and this is the difference between a merge and a data
// loss. adjustTracker() and the Health sync both CREATE a day as {water:0,sleep:0,steps:0}, so an
// `undefined || null || ''` guard lets those zeros through as deliberate values and they flatten a
// day the other spelling already holds. The cloud pull does not pass it: there a day's two sides
// carry cts/lts, so recency answers the question and a zero really is the newer device's answer.
// The migration has no per-day recency stamp at all, so within ONE device's own history a 0 beside
// a real number is a skeleton, not a decision.
function _mergeDayMaps(keep, add, storeKey, opts){
  try{
    const zeroIsAbsent = !!(opts && opts.zeroIsAbsent);
    const idOf = function(x){
      try{ if(typeof syncIdOf === 'function') return String(syncIdOf(x)); }catch(_){ }
      if(x && typeof x === 'object') return x.id !== undefined ? 'i'+x.id : (x.ts || JSON.stringify(x));
      return String(x);
    };
    const combine = function(a, b){                      // a wins
      if(a === undefined || a === null) return b;
      if(b === undefined || b === null) return a;
      if(Array.isArray(a) || Array.isArray(b)){
        const seen = Object.create(null), res = [];
        [].concat(Array.isArray(a) ? a : [], Array.isArray(b) ? b : []).forEach(function(x){
          const id = idOf(x);
          if(seen[id]) return;
          seen[id] = 1; res.push(x);
        });
        return res;
      }
      if(typeof a === 'number' && typeof b === 'number'){
        // The winner's own figure, even when it is smaller — a correction is the commonest reason a
        // day goes down. Under zeroIsAbsent a literal 0 is the one number that is not an answer.
        return (zeroIsAbsent && a === 0 && b !== 0) ? b : a;
      }
      if(typeof a === 'object' && typeof b === 'object'){
        const o = Object.assign({}, b);
        Object.keys(a).forEach(function(f){
          const av = a[f];
          if(av === undefined || av === null || av === '') return;   // absent on the winner ≠ erase
          // The {water:0,sleep:0,steps:0} skeleton. Only in the migration, and only where the other
          // side actually has a figure: otherwise 0 stays a value, which is what a person who drank
          // nothing today means by it.
          if(zeroIsAbsent && av === 0 && typeof b[f] === 'number' && b[f] !== 0) return;
          o[f] = av;
        });
        return o;
      }
      return a;
    };
    const out = {};
    const fold = function(src){
      if(!src || typeof src !== 'object' || Array.isArray(src)) return;
      // CANONICAL KEYS FIRST, so a collision INSIDE one map is not decided by JSON order.
      // A single map can hold both '5/9/2026' and '05/09/2026' — that is the ordinary legacy state
      // for anyone who used the PWA and the iOS build before v607, because the pre-fix pull adopted
      // the other engine's spelling wholesale. Folding in Object.keys order meant whichever
      // JSON.parse happened to list first became the winner, so which figure survived was arbitrary
      // and could differ between two devices reading the SAME cloud row. The canonical spelling is
      // the one every device writes now, so it wins, and the result is the same everywhere.
      Object.keys(src).sort(function(a, b){
        const ca = (dayKeyNorm(a) === a) ? 0 : 1, cb = (dayKeyNorm(b) === b) ? 0 : 1;
        return ca - cb;
      }).forEach(function(k){
        // A key this cannot read keeps its OWN name rather than being folded into anything — an
        // unreadable key is data we do not understand, and collapsing several of them together
        // would destroy more than it repairs.
        const nk = dayKeyNorm(k) || k;
        out[nk] = (out[nk] === undefined) ? src[k] : combine(out[nk], src[k]);
      });
    };
    fold(keep);                                          // the winner goes in first, so it is always `a`
    fold(add);
    return out;
  }catch(_){ return (keep && typeof keep === 'object') ? keep : {}; }
}

// DOES THIS ENGINE ZERO-PAD? Asked of the engine at the moment it matters, never assumed. 2 September
// 2026 is the probe because BOTH fields are single-digit: Chromium answers "02/09/2026", WebKit/iOS
// answers "2/9/2026". This is the one question that tells the migration which of two spellings of a
// day is the one THIS device has been writing all along, and therefore which one is on the person's
// own screen right now. `true` on a throw: a padding engine is the case where canonical and the
// device's own spelling are the same string, so it is the answer that can do the least harm.
function _dayKeyEnginePads(){
  try{ return /^0\d\/0\d\/\d{4}$/.test(new Date(2026, 8, 2).toLocaleDateString('en-AU')); }
  catch(_){ return true; }
}

// Every day-keyed store this app has, in one list, so a new one cannot be added without being seen.
function dayKeyedStores(){
  return ['totry_nutlog','totry_trackers','totry_water','totry_calorie_burns',
          'totry_strava_burns_byday','totry_watch_burns_byday','totry_workout_burns_byday',
          'totry_tgt','totry_usage_log'];
}

// Normalise AND MERGE — never overwrite — every day-keyed store. Idempotent: dayKeyNorm(canonical)
// === canonical, so a second run finds nothing to move. Runs on every boot, because a cloud pull can
// reintroduce the other engine's spelling at any time.
//
// opts.raw makes the writes go through _originalSetItem + syncToCloud the way restoreKeys does, so a
// restore's merged map is what reaches the cloud instead of the file's raw two-spelling version.
function migrateDayKeys(opts){
  const raw = !!(opts && opts.raw);
  const out = { moved: 0, merged: 0, stores: [] };
  // Asked ONCE per run, not once per store: this is an Intl call and it runs on every boot. The
  // answer cannot change between two stores in the same run.
  const pads = _dayKeyEnginePads();
  const _mo = { zeroIsAbsent: true };
  dayKeyedStores().forEach(function(k){
    try{
      const before = localStorage.getItem(k);
      if(before === null || before === undefined) return;
      let v = null;
      try{ v = JSON.parse(before); }catch(_){ return; }                 // not JSON: not ours to touch
      if(!v || typeof v !== 'object' || Array.isArray(v)) return;
      const keys = Object.keys(v);
      if(!keys.length) return;
      // WHICH SIDE WINS WHEN ONE DAY EXISTS UNDER BOTH SPELLINGS? THE DEVICE'S OWN.
      //
      // An earlier draft picked the already-canonical spelling, reasoning that it is the one this
      // device will write from now on. On a padding engine that is the same answer — canonical IS
      // what Chromium has always written. On WebKit it is the opposite of the truth: a padded key is
      // a spelling that device has NEVER produced, so it can only have arrived by a pre-fix cloud
      // pull, which is the OTHER phone's stale copy. Preferring it threw away the figures the person
      // was looking at while the migration ran — measured, against the real functions:
      //   totry_water  {"22/9/2026":2000,"22/09/2026":750} → {"22/09/2026":750}
      //   the 2000ml logged today, replaced by another phone's older number.
      //
      // So ask the engine (_dayKeyEnginePads) which spelling is this device's own, and let that side
      // win. Deterministic, and it appeals to something real rather than to a coin toss — there is
      // still no per-day recency stamp, which is why zeroIsAbsent below carries the rest of the load.
      const canon = {}, foreign = {};
      let dirty = false, collided = 0;
      keys.forEach(function(dk){
        const nk = dayKeyNorm(dk);
        if(!nk || nk === dk){ canon[dk] = v[dk]; return; }
        dirty = true;
        if(foreign[nk] !== undefined) collided++;        // two foreign spellings of one day (rare)
        foreign[nk] = (foreign[nk] === undefined) ? v[dk] : _mergeDayMaps({x:foreign[nk]}, {x:v[dk]}, k, _mo).x;
      });
      if(!dirty) return;
      Object.keys(foreign).forEach(function(nk){ if(canon[nk] !== undefined) collided++; });
      // A SKELETON IS NOT AN ANSWER. Whichever side wins, a 0 on it does not erase a real figure on
      // the other: adjustTracker() and the Health sync both create a day as {water:0,sleep:0,steps:0},
      // so without this the winner's empty day flattened a day the other spelling had filled —
      //   {"22/9/2026":{water:0,sleep:7.5,steps:14000},"22/09/2026":{water:0,sleep:0,steps:0}}
      //   → {"22/09/2026":{water:0,sleep:0,steps:0}}, the whole day gone, on BOTH engines.
      const next = pads ? _mergeDayMaps(canon, foreign, k, _mo)
                        : _mergeDayMaps(foreign, canon, k, _mo);
      const after = JSON.stringify(next);
      if(after === before) return;
      if(raw){
        const w = (typeof _originalSetItem === 'function' && _originalSetItem) || localStorage.setItem.bind(localStorage);
        w(k, after);
        try{
          if(typeof syncToCloud === 'function' && typeof SYNC_KEYS !== 'undefined' && SYNC_KEYS.indexOf(k) !== -1) syncToCloud(k, next);
        }catch(_){ }
      }else{
        try{ ls(k, next); }catch(_){ try{ localStorage.setItem(k, after); }catch(__){ } }
      }
      out.moved++; out.merged += collided; out.stores.push(k);
    }catch(_){ }                                                        // one bad store must never break boot
  });
  return out;
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
// THE LATEST SACRAMENT, BY DATE — NOT BY POSITION.
//
// logConfession/logMass always unshift, whatever date was chosen, and the same panel invites a person
// to "Log a past confession". So position 0 is the most recently ENTERED, not the most recent. A man
// who went to confession this morning and then back-logged one from three months ago was told "Last
// confession about 3 months ago — it may be time to return", the coach offered to help him examine
// his conscience, and the brother's context carried it as fact. On the one front built for grace, the
// app manufactured shame out of its own array order.
//
// Four readers had derived this independently; this is the one they all use now.
function latestByDate(list){
  try{
    const rows = (list || []).filter(function(x){ return x && x.date; });
    if(!rows.length) return null;
    return rows.slice().sort(function(a,b){ return new Date(b.date) - new Date(a.date); })[0];
  }catch(_){ return null; }
}

// THE UNITS THE PERSON READS, for any prompt that builds its own context. v581 put this in
// lifeStateBrief() \u2014 the brief every AI surface reads \u2014 and that was still only most of them:
// the Sunday check-in assembles its own context string and states kilograms directly, so a pounds
// user finished the check-in and the coach answered her in kg anyway. Any prompt that names a
// weight or a distance appends this.
function _unitsNote(){
  try{
    const wu = (typeof wUnit==='function') ? wUnit() : 'kg';
    const du = (typeof dUnit==='function') ? dUnit() : 'km';
    if(wu === 'kg' && du === 'km') return '';
    // SAY WHAT IS TRUE OF THE FIGURES, NOT WHAT WAS TRUE OF THE STORE. The first cut of this said
    // "figures here are in kg and km \u2014 convert every number back", and the very next line of the brief
    // was already converted by wFmt(): "Weight: 152.1lb". Telling a model to convert an
    // already-converted number is worse than saying nothing \u2014 it can answer 335lb, or 69lb. Every
    // figure that reaches a prompt is now converted at the source, so the instruction is simply:
    // these are already theirs, use them as they are, and answer in the same units.
    return '\nUNITS: every figure here is ALREADY in this person\u2019s own units \u2014 weight in ' + wu +
           ', distance in ' + du + '. Do NOT convert them. Quote them back exactly as given, and use ' +
           wu + ' and ' + du + ' for anything you work out yourself. Never say kg or km to them.' +
           // THE ONE EXCEPTION, NAMED. Lifted load and session volume are deliberately still kg (see
           // the units note in CLAUDE.md), so "every figure here is in lb" was simply false — the very
           // same prompt carries "Bench 100kg" a few lines down, and the model was under instruction
           // to quote it back as pounds. That is the whole lesson of the last units round arriving one
           // layer up: the screens were converted for fifty versions and nobody told the VOICE.
           ' The ONE exception is barbell and dumbbell load and session volume, which this person tracks in kilograms: those figures are already kg, are labelled kg, and must be quoted back in kg.';
  }catch(_){ return ''; }
}
function _todayLocalISO(d){
  const t = d ? new Date(d) : new Date();
  const p = n => String(n).padStart(2, '0');
  return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate());
}

// _jsAttr escapes a string VALUE for use inside a JS string literal in an attribute: it turns ' into
// \' so the literal does not close early. Passing it raw JS CODE is a category error — it escapes the
// code's own quotes, and inside an HTML attribute \' is a literal backslash followed by a quote, which
// is a SyntaxError. Two controls I shipped today were dead for exactly this reason: "Snap a meal" in
// the More-ways sheet, and "Try again" on every meal-photo failure. Both looked correct in the source.
//
// Raw code in an attribute needs ATTRIBUTE escaping only — & and " — because single quotes are legal
// inside a double-quoted attribute and must survive untouched.
function _jsCode(code){
  return String(code == null ? '' : code)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, ' ');
}

function _jsAttr(s){
  return String(s == null ? '' : s)
    // `&` FIRST, AND THAT ORDER IS THE WHOLE FIX. This value lands in a JS string inside an HTML
    // attribute, and the HTML parser decodes character references BEFORE the JavaScript is
    // compiled — the same mechanism that makes _escFew useless one level deeper. So a typed
    // `&#39;`, `&apos;` or `&#x27;` survived every replacement below, was decoded to a bare
    // apostrophe by the parser, terminated the string literal, and the remainder of the attribute
    // compiled as statements. Escaping `&` here means no reference can survive to that step.
    // The `&quot;` introduced two lines down is OURS and must stay a reference, which is exactly
    // why this replacement has to run before it and not after. The sibling helper directly above
    // already escaped `&` first, for this reason, on a value that only ever reaches a text
    // position — the one that reaches COMPILED CODE did not.
    // Found 1 Oct 2026. Three call sites: both of _shrinkIt's buttons (05-moment.js), the impulse
    // sheet (05-moment.js) and an exercise name in the set row (22-train-deep.js). The first two
    // carry text the person typed about themselves, so they are self-XSS. The third does not: an
    // exercise name arrives from the Hevy integration and from AI-parsed routine text, and it is
    // PERSISTED — so it re-fires on every later render, as script in the app's own origin, with
    // the whole journal readable from localStorage. Fixed in the helper, not at the call sites.
    .replace(/&/g, '&amp;')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, ' ');
}

// One number, one noun, the right ending. "1 days clean" is the single most-seen sentence in
// this app \u2014 day one is where everybody starts and where anybody who slips returns \u2014 and it
// read as broken English on the day a person most needed it to sound like it meant them.
// Takes the SINGULAR and adds to it. The first cut took the plural and stripped /e?s$/, which
// turned "battles" into "battl" and "times" into "tim"; a helper that has to guess where a word
// ends will always be wrong somewhere, so it is never asked to.
// The irregulars live INSIDE the function on purpose. plural() is hoisted; a const beside it is
// not, so a call from anything that runs during module evaluation would hit the temporal dead zone
// and throw, in a helper whose whole job is to be safe to call from anywhere.
function plural(n, singular){
  const IRREG = { person:'people', entry:'entries', life:'lives', foot:'feet' };
  const c = Number(n);
  const w = String(singular == null ? '' : singular);
  if(Math.abs(c) === 1) return c + ' ' + w;
  return c + ' ' + (IRREG[w] || (/(s|x|z|ch|sh)$/.test(w) ? w + 'es' : w + 's'));
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
// a one-time intro, not a changelog. (That intro was removed at v519 — see app.js.)
const APP_VERSION = 'v627';
const CHANGELOG = {
  // Example of a major release entry (set major:true to surface the modal):
  // 'v50': { major:true, title:'Big update', items:['...'] }
};
// Shown ONCE to brand-new users after they finish onboarding — a tour of what the app can do,
// not a list of recent fixes.
// WHATS_POSSIBLE lived here — the content for a welcome tour that was never wired. See the note in
// app.js where checkWhatsPossible was removed.

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
    const r = await _fetchT('https://api.esv.org/v3/passage/text/?q=' + encodeURIComponent(q) +
      '&include-verse-numbers=true&include-headings=false&include-footnotes=false' +
      '&include-short-copyright=false&include-passage-references=false',
      9000, { headers: { 'Authorization': 'Token ' + own } });
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
    if(user && user.email){ try{ localStorage.setItem('totry_user_email', user.email); }catch(_){ } }
    const restored = await restoreFromCloud();
    try{ if(typeof flushOutbox==='function') await flushOutbox(); }catch(_){ }
    if(typeof repairJourneyStart === 'function') repairJourneyStart();
  try{
    if(!localStorage.getItem('totry_first_open')){ localStorage.setItem('totry_first_open','1'); logEvent('first_open'); }
    const tk = dayKeyOf();
    if(localStorage.getItem('totry_open_logged') !== tk){ localStorage.setItem('totry_open_logged', tk); logEvent('open'); }
  }catch(_){ }
  if(typeof renderTemplates === 'function') renderTemplates();
    document.getElementById('auth-container').style.display='none';
    // isSetUpPerson(), not `restored` alone. `restored` is true only when a cloud pull returned rows —
    // so someone who came in through the guest door, used the Feeling Door, reached The Release and
    // tapped "Keep this →" to make an account was walked back through all twelve onboarding screens,
    // re-asked their name and what they are fighting, on the night they came in because something was
    // pulling at them. The guest branch could never catch them either: isGuest() is `totry_guest &&
    // !currentUser`, and by this point a session exists. isSetUpPerson() is the helper written for
    // exactly this question, and its own comment says it exists so these gates cannot drift apart —
    // this was a third gate that never used it.
    // Same correction as the offline gate: isSetUpPerson() is true on totry_name alone, which
    // onboarding writes partway through, so this swallowed anyone who quit mid-setup and made the
    // resume branch below unreachable. The guest term is the only one this needed.
    if(restored || ls('totry_guest') || (ls('totry_onboarded') && ls('totry_name'))){
      document.getElementById('onboard').classList.remove('active');
      document.getElementById('onboard').style.display = 'none';
      document.querySelector('.app').classList.add('app-ready');
      if(typeof initApp === 'function') await initApp();
      if(typeof go === 'function') go('home');
      showToast('Welcome back','Your journey continues.');
    } else {
      document.getElementById('onboard').classList.add('active');
      document.getElementById('onboard').style.display = 'block';
      // Paint the progress row for screen one. The observer covers every transition AFTER this, but
      // the first screen is not a transition, so without this the row is empty until you move.
      try{ if(typeof obDots === 'function') obDots(); }catch(_){ }
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
    // BOUNDED, BECAUSE A STALL IS NOT AN ERROR AND NOTHING ELSE CATCHES IT. supabase-js never times
    // out: on hotel wifi or one bar this promise simply does not settle, so the catch below never
    // runs, authShowError is never reached, and the person sits on #auth-loading — which is a pulsing
    // line with no button on it. The email step underneath carries the guest door and four crisis
    // numbers, and the error step carries them too, under a comment saying in as many words that
    // they must survive a failure. Neither is reachable from the loading step. So the one state this
    // app promises can never hide the helplines was the one state nobody had put a floor under, and
    // force-quitting comes back to it. Fifteen seconds, then the error step, which has the doors.
    const _AUTH_TIMEOUT_MS = 15000;
    const _sent = await Promise.race([
      sb.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      }),
      new Promise(function(res){ setTimeout(function(){ res({ __timedOut: true }); }, _AUTH_TIMEOUT_MS); })
    ]);
    if(_sent && _sent.__timedOut){
      // The same words authShowError already writes for a dead network, and it names the guest door.
      authShowError('Failed to fetch');
      return;
    }
    const { error } = _sent;
    
    if(error){
      console.error('OTP send error:', error);
      authShowError(error.message || 'Could not send the code. Please try again.');
      return;
    }
    
    // Save email for verify step
    try{ localStorage.setItem('totry_pending_email', email); }catch(_){ }
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
    // Same floor on the verify step: it shows 'Verifying...' on the same buttonless screen.
    const _ver = await Promise.race([
      sb.auth.verifyOtp({ email: email, token: code, type: 'email' }),
      new Promise(function(res){ setTimeout(function(){ res({ __timedOut: true }); }, 15000); })
    ]);
    if(_ver && _ver.__timedOut){ authShowError('Failed to fetch'); return; }
    const { data, error } = _ver;
    
    if(error){
      console.error('OTP verify error:', error);
      authShowError(error.message || 'Code did not match. Please try again.');
      return;
    }
    
    if(data?.user){
      localStorage.removeItem('totry_pending_email');
      try{ localStorage.setItem('totry_user_email', email); }catch(_){ }
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

  // A GUEST HAS NO CLOUD, AND THIS TOLD THEM THE OPPOSITE. The only guard was `if(!sb) return`, and
  // sb exists for a guest too — so someone who had never made an account tapped Sign out, read
  // "Everything is synced, so it all comes back when you sign in", confirmed, and lost every key on
  // the device with nothing anywhere to restore from. The losses list above counts photos, cycle and
  // outbox depth as the only casualties, which is true ONLY when the rest is really in the cloud.
  const _signedIn = !!currentUser;
  const msg = !_signedIn
    ? ('You are not signed in, so none of this is in the cloud \u2014 it is all on this device only. '
       + 'Clearing it now deletes everything: your streaks, your journal, your logs, all of it, with '
       + 'nothing to restore from.\n\nSettings \u2192 Your data \u2192 Export saves it all to a file '
       + 'first. Clear this device anyway?')
    : losses.length
      ? ('Signing out clears this device. Everything synced comes back when you sign in \u2014 but these '
         + 'are only here and will be gone for good:\n\n\u2022 ' + losses.join('\n\u2022 ')
         + '\n\nSettings \u2192 Your data \u2192 Export saves them first. Sign out anyway?')
      : 'Sign out? Everything is synced, so it all comes back when you sign in.';
  if(!(await askConfirm(msg))) return;

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
  // totry_health_write is NOT here, for the same reason totry_push_prefs is not: HealthKit write
  // authorisation is granted per installation, so a synced 'on' told a fresh phone it was allowed
  // to write into Apple Health before that device had ever asked — every write then failing
  // silently while the Settings row said it was on. Re-opt in per device, which needs that
  // device's permission anyway.
  'totry_cba',   // the person's own cost-benefit reasons, per vice — see openCBA()
  'totry_releases','totry_feelings','totry_hunger_log','totry_breath_log',
  'totry_meal_plan','totry_plan_history','totry_food_rejects','totry_meal_prefs','totry_train_goal','totry_train_days',
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
  'totry_recipes','totry_custom_foods','totry_barcode_memory','totry_recent_foods','totry_water','totry_water_goal','totry_fasting','totry_fast_log','totry_usda_key','totry_esv_key','totry_nutritionix_id','totry_nutritionix_key',
  // Money — totry_f holds debts+savings, totry_payments holds logged payments
  'totry_finance_goals','totry_transactions','totry_debt_strategy','totry_savings_usa','totry_savings_india',
  'totry_subscriptions','totry_bills','totry_budgets','totry_assets','totry_f','totry_payments','totry_family_contrib','totry_poker_sessions','totry_family_target',
  // Habits & wins — totry_h is the habit grid, totry_trackers holds daily sleep/steps/weight
  'totry_habits','totry_h','totry_sv','totry_vs','totry_wins','totry_streaks',
  // A trophy case must survive a restore and a second device, or "once earned, earned" only
  // holds until someone changes phone. Append-only, so the union merge cannot lose one.
  'totry_achievements_earned',
  'totry_step_goal','totry_sleep_goal','totry_trackers','totry_today_steps','totry_cravings',
  // Relationships, promises, letters
  'totry_relationships','totry_letters','totry_promises','totry_affirmations','totry_checkins','totry_freezes',
  // Vices & fights
  'totry_vice_savings_log','totry_syntheses',
  // Goals & weekly review
  'totry_goals','totry_reviews','totry_tomorrow_tasks',
  // Apps & personalisation
  'totry_apps_used','totry_affirms','totry_honest_q',
  // Preferences (v29)
  // totry_haptics joined them at v600.1. It was added as a preference and not wired like a single one
  // of its siblings — currency, both units, theme and timezone all follow a person to a new phone, and
  // so does totry_nut_gentle, whose note says outright that a preference this personal syncs like
  // everything else. Somebody who turns the buzzing off because they cannot stand it against their
  // skin would have had it switched back on by their next handset. Not a per-device capability like
  // totry_push_prefs (permission, deliberately local): this is a statement about the person.
  // totry_city is the same shape and predates it. It is TYPED BY HAND (_seasonSetCity), and it is the
  // only input suhoor and iftar times are computed from — while totry_fast_season, set two lines away
  // in the same feature, has always synced. So a Muslim keeping Ramadan changed phone, found the
  // season still there, and found the times it depends on gone.
  'totry_currency','totry_weight_unit','totry_distance_unit','totry_theme',
  'totry_haptics','totry_city',
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
  // A walked rosary was recorded and a completed tasbih, japa, mettā or stillness sit was not —
  // so the same practice counted as the day's prayer for a Catholic and vanished for everyone else.
  'totry_rosaries','totry_practices',
  // The weight you are aiming at. v563 made this writable and every surface reads it - the goal card,
  // the reopened field, the projection, and the AI prompt ("Current weight: 82kg -> goal 78kg") - but
  // it was never added here, so saveGoalWeight's own syncToCloud() call was a no-op for it. Someone
  // set a goal, watched the projection build for three weeks, signed in on a new phone and found the
  // card back at "Want me to tell you where this is heading?".
  'totry_goal_weight',
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



// ── The icon set ───────────────────────────────────────────────────────────────
// The app already had ONE icon language — 25 stroke icons on a 24x24 grid, fill:none,
// stroke:currentColor, 1.5-1.6 weight, round caps — and it lived only in the tab bar and
// the header. Everywhere else fell back to Apple's emoji art: 328 of them across src/,
// 62 rendered on an ordinary walk of 13 tabs, 34 of those inside a tappable control.
// Two icon languages in one app is the loudest "this is a prototype" signal there is,
// because emoji are full-colour, differently weighted, and drawn by another hand entirely.
// So: one language. svgIcon() renders the same grid and the same weight as the tab bar, and
// takes its ink from currentColor — an icon in a gold card is gold, an icon in a quiet
// row is quiet. That is the thing a flat emoji can never do.
//
// What deliberately STAYS emoji, because it is CONTENT and not chrome:
//   - the mood and feeling pickers (angry / tired / hungry / flat) — a face is the fastest
//     thing a person in a bad moment can read, and a grey line drawing of a face is worse
//   - the traditions' own marks (cross, crescent, om, wheel) — those belong to the people
//     who hold them; redrawing them in house style would be presumptuous
//   - typographic marks already monochrome in the app's own font: check, cross, arrow, heart
function svgIcon(name, size){
  const P = svgIcon.P || (svgIcon.P = {
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    chart:'<polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/>',
    camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>',
    barcode:'<path d="M3 5v14M7 5v14M11 5v10M15 5v14M19 5v10"/>',
    mic:'<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    repeat:'<polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>',
    save:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    globe:'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    bulb:'<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.75V17h8v-2.25A7 7 0 0 0 12 2z"/>',
    ruler:'<path d="M4.5 12.5 12.5 4.5a2 2 0 0 1 2.83 0l4.17 4.17a2 2 0 0 1 0 2.83l-8 8a2 2 0 0 1-2.83 0L4.5 15.33a2 2 0 0 1 0-2.83z"/><path d="M9 8.5 11 10.5M11.5 6 14 8.5M6.5 11 8.5 13"/>',
    stop:'<polygon points="7.86,2 16.14,2 22,7.86 22,16.14 16.14,22 7.86,22 2,16.14 2,7.86"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    // Read-aloud's two states. `stop` above is the octagon — a prohibition sign, not a transport
    // control. These replace a typed U+25B6 and U+25A0 sitting at the label's own weight beside real
    // stroked icons; a Geometric Shapes character is a glyph, not an icon, and no emoji check sees it.
    play:'<polygon points="7,4 19,12 7,20"/>',
    stopsquare:'<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    coffee:'<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',

    // Drawn to the same live area as briefcase (y3–21) and shield, because it sits in an identical
    // 29pt tile beside them on the week and on Today's spine. It spanned only y6.5–17.5: measured on
    // the rendered screen it came out 14.7x10.0pt against the briefcase's 16.7x15.3pt directly above
    // it, with half the ink at the same stroke weight, so one row's icon read smaller and lighter
    // than its neighbour's for no reason a person could name.
    dumbbell:'<path d="M6.5 4.5v15M2.5 8.5v7M17.5 4.5v15M21.5 8.5v7M6.5 12h11"/>',
    wallet:'<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    run:'<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>',
    bike:'<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
    utensils:'<path d="M3 2v7a3 3 0 0 0 6 0V2"/><path d="M6 9v13"/><path d="M18 2c-1.7 1-3 3-3 6v4h3"/><path d="M18 2v20"/>',
    compass:'<circle cx="12" cy="12" r="10"/><polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/>',
    target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    sunrise:'<path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><polyline points="8,6 12,2 16,6"/><line x1="2" y1="22" x2="22" y2="22"/>',
    sunset:'<path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><polyline points="16,5 12,9 8,5"/><line x1="2" y1="22" x2="22" y2="22"/>',
    sun:'<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
    moon:'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    heart:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    scale:'<path d="M12 3v18M7 21h10M5 8h14"/><path d="M5 8 2 14a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"/>',
    award:'<circle cx="12" cy="8" r="6"/><polyline points="8.21,13.89 7,23 12,20.5 17,23 15.79,13.88"/>',
    sparkle:'<path d="M12 3l1.6 4.9L18.5 9.5 13.6 11.1 12 16l-1.6-4.9L5.5 9.5l4.9-1.6z"/><path d="M19 15l.6 1.9 1.9.6-1.9.6L19 20l-.6-1.9-1.9-.6 1.9-.6z"/>',
    clock:'<circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>',
    flame:'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    message:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    edit:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    plus:'<line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/>',
    walk:'<circle cx="13" cy="4" r="1.7"/><path d="M11 21l1.5-6-2.5-2.5 1-5 3 2 2.5 1.5"/><path d="M10 12.5 7 16l-1 5"/>',
    phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    tool:'<path d="M14.7 6.3a4 4 0 0 0 5.1 5.1L21 10a5.5 5.5 0 0 1-7.7 6.4L6.4 22a2 2 0 0 1-2.8-2.8l5.6-6.9A5.5 5.5 0 0 1 15.6 4z"/>',
    unlock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    battery:'<rect x="1" y="7" width="17" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><line x1="5" y1="11" x2="5" y2="13"/>',
    leaf:'<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-6.9 6-9"/>',
    cloud:'<path d="M18 17H7A4.5 4.5 0 1 1 8.1 8.1 6 6 0 1 1 18 17z"/>',
    stethoscope:'<path d="M4 2v6a4 4 0 0 0 8 0V2"/><path d="M4 2H2.5M12 2h1.5"/><path d="M8 12v3a5 5 0 0 0 10 0v-1"/><circle cx="18" cy="11" r="2.5"/>',
    sprout:'<path d="M12 22V11"/><path d="M12 11C12 7 9 5 5 5c0 4 3 6 7 6z"/><path d="M12 13c0-3.5 2.5-5.5 6-5.5 0 3.5-2.5 5.5-6 5.5z"/>',
    map:'<polygon points="1,6 8,3 16,6 23,3 23,18 16,21 8,18 1,21"/><line x1="8" y1="3" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="21"/>',
    breath:'<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 13h15a3 3 0 1 1-3 3"/><path d="M3 18h8"/>',
    // A loop of prayer beads with its pendant bead: the rosary, the misbaha and the mala are all this
    // shape, so one mark serves the practice row for every tradition that has one. It was a one-off
    // literal on the Soul hub, outside the set.
    beads:'<circle cx="12" cy="3" r="1.3"/><circle cx="16.6" cy="4.9" r="1.3"/><circle cx="18.5" cy="9.5" r="1.3"/><circle cx="16.6" cy="14.1" r="1.3"/><circle cx="12" cy="16" r="1.3"/><circle cx="7.4" cy="14.1" r="1.3"/><circle cx="5.5" cy="9.5" r="1.3"/><circle cx="7.4" cy="4.9" r="1.3"/><path d="M12 17.3v3.4"/><circle cx="12" cy="22" r="1.2"/>',
    heartbreak:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><path d="M12 5.67 9.5 10l4 2.5-2.5 4.2"/>',
    snow:'<line x1="12" y1="2" x2="12" y2="22"/><line x1="3.3" y1="7" x2="20.7" y2="17"/><line x1="3.3" y1="17" x2="20.7" y2="7"/><path d="M9 4.5 12 7l3-2.5M9 19.5 12 17l3 2.5"/>',
    phoneoff:'<path d="M10.7 13.3a16 16 0 0 1-2.6-3.4l1.3-1.3a2 2 0 0 0 .5-2.1c-.3-.9-.6-1.8-.7-2.8A2 2 0 0 0 7.1 2h-3a2 2 0 0 0-2 2.2 19.8 19.8 0 0 0 5.4 11.6"/><path d="M14 16.4a16 16 0 0 0 2 1.1l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-9.7-4.1"/><line x1="2" y1="2" x2="22" y2="22"/>',
    eye:'<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
    chartdown:'<polyline points="23,18 13.5,8.5 8.5,13.5 1,6"/><polyline points="17,18 23,18 23,12"/>',
    mountain:'<path d="M2 20h20L14.5 5.5 11 12l-2.5-3z"/>',
    home:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>',
    briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    car:'<path d="M5 17h14M3 17v-4l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5v4"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
    school:'<path d="M12 3 1.5 8.5 12 14l10.5-5.5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>',
    bed:'<path d="M2 19V7M2 12h18a2 2 0 0 1 2 2v5"/><path d="M2 16h20"/><circle cx="7" cy="9.5" r="1.8"/>',
    swim:'<path d="M2 18c1.6 0 1.6 1.2 3.2 1.2S6.8 18 8.4 18s1.6 1.2 3.2 1.2S13.2 18 14.8 18s1.6 1.2 3.2 1.2S19.6 18 22 18"/><path d="M6 14.5 10.5 11 8 8.5"/><circle cx="16.5" cy="6.5" r="1.6"/><path d="M10.5 11 15 9l2.5 3"/>',
    wind:'<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 13h15a3 3 0 1 1-3 3"/><path d="M3 18h8"/>',
    shoe:'<path d="M2 17v-6l4 1 3.5-3 2 3H18a4 4 0 0 1 4 4v1z"/><path d="M2 14h20"/>',
    bell:'<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    belloff:'<path d="M13.7 21a2 2 0 0 1-3.4 0"/><path d="M18.6 13A17.9 17.9 0 0 1 18 8"/><path d="M6.3 6.3A6 6 0 0 0 6 8c0 7-3 8-3 8h13"/><path d="M18 8a6 6 0 0 0-9.3-5"/><line x1="2" y1="2" x2="22" y2="22"/>',
    trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5A2.5 2.5 0 0 0 7 10.5M17 6h2.5A2.5 2.5 0 0 1 17 10.5"/>',
    chevronleft:'<polyline points="15,4 7,12 15,20"/>',
    chevronright:'<polyline points="9,4 17,12 9,20"/>',
    check:'<polyline points="20,6 9,17 4,12"/>',
    // The set had a plus and a check and no way to say "remove". Every row that ends in a dismiss
    // was therefore a literal × typed in the UI font — a different hand, a lighter weight and a
    // smaller mark than the chevron beside it. Same grid, same caps, same stroke as the rest.
    close:'<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    droplet:'<path d="M12 2.7 6.7 8a7.5 7.5 0 1 0 10.6 0z"/>',
    zap:'<polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>',
    users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    film:'<rect x="2" y="3" width="20" height="18" rx="2.5"/><path d="M7 3v18M17 3v18M2 9h5M2 15h5M17 9h5M17 15h5"/>',
    lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    gem:'<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M8.5 3 6 9l6 12M15.5 3 18 9l-6 12"/>',
    apple:'<path d="M12 7c-1.5-2-4-2.5-5.5-1C4.5 7.5 4 11 5.5 15c1 2.6 2.3 4.5 4 4.5 1 0 1.5-.6 2.5-.6s1.5.6 2.5.6c1.7 0 3-1.9 4-4.5 1.5-4 1-7.5-1-9-1.5-1.5-4-1-5.5 1z"/><path d="M12 7c0-1.7 1-3.3 2.5-4"/>',
    // The warning triangle on the Fight's urge door. It was an inline <svg> literal at three call
    // sites, drawn outside the icon set and so outside everything that keeps the set consistent —
    // the same path, now on the grid with the other sixty-six.
    alert:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
  });
  const d = P[name];
  if(!d) return '';
  const s = size || 16;
  return '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" width="'+s+'" height="'+s+'">'+d+'</svg>';
}

// ── iOS list helpers ────────────────────────────────────────────────────────────────────────────────
// Every screen that shows rows builds them through these, so a row is the same row everywhere: one
// height, one separator inset, one chevron, one tap highlight. Hand-writing the markup is how the old
// design ended up with 190 different button recipes. Text passed in is ESCAPED here (title, sub, value,
// header, footer) — callers pass plain text. Pass `html:true` only for trusted, app-authored markup.
function iosRow(o){
  o = o || {};
  const esc = (v) => (o.html ? String(v == null ? '' : v) : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  // `tag:'div'` for the one shape a <button> cannot hold: a tappable row that also carries its own
  // control (the calendar's delete). A <button> inside a <button> is not parseable HTML — the parser
  // closes the outer one — so that row is a div with the same onclick it has always had.
  const tag = o.tag || (o.onclick ? 'button' : 'div');
  const cls = 'ios-row' + (o.icon ? ' has-icon' : '') + (o.destructive ? ' destructive' : '') + (o.tint ? ' tint' : '') + (o.cls ? ' ' + o.cls : '');
  const attrs = (o.onclick ? ((tag === 'button' ? ' type="button"' : '') + ' onclick="' + String(o.onclick).replace(/"/g, '&quot;') + '"') : '') + (o.id ? ' id="' + o.id + '"' : '') + (o.label ? ' aria-label="' + esc(o.label) + '"' : '');
  return '<' + tag + ' class="' + cls + '"' + attrs + '>' +
    (o.icon ? '<span class="ios-row-icon tone-' + (o.tone || 'blue') + '">' + svgIcon(o.icon, 18) + '</span>' : '') +
    '<span class="ios-row-body"><span class="ios-row-title" style="display:block">' + esc(o.title) + '</span>' +
      (o.sub ? '<span class="ios-row-sub" style="display:block">' + esc(o.sub) + '</span>' : '') + '</span>' +
    (o.value != null && o.value !== '' ? '<span class="ios-row-value">' + esc(o.value) + '</span>' : '') +
    (o.trailing ? o.trailing : '') +
    ((o.onclick && o.chevron !== false) ? '<span class="ios-row-chevron">' + svgIcon('chevronright', 14) + '</span>' : '') +
  '</' + tag + '>';
}
function iosList(rows, o){
  o = o || {};
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return '<div class="ios-section">' +
    (o.header ? '<div class="ios-header">' + esc(o.header) + '</div>' : '') +
    '<div class="ios-list">' + (rows || []).join('') + '</div>' +
    (o.footer ? '<div class="ios-footnote">' + esc(o.footer) + '</div>' : '') +
  '</div>';
}
