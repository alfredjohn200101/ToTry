// ═══════════════════════════════════════════════════════════════════════════
// CLOUD-FIRST SYNC (v111). Supabase is the source of truth, the device is a cache.
// The fix for the June-15 data loss: a DURABLE outbox in localStorage. Every write is queued
// to disk first, so if a network write fails AND the app closes, the pending write survives and
// is retried on next open — it can never silently vanish. Sync status is observable (Settings).
// ═══════════════════════════════════════════════════════════════════════════
const SYNC_OUTBOX_KEY = 'totry_sync_outbox';

// ── TOMBSTONES: so a deletion survives the next sync ─────────────────────────────────────────────
// pullFromCloud UNIONS 32 keys across devices, which is right for an append-only log and wrong the
// moment something can be deleted. EIGHT of those keys have delete paths — journal entries, weigh-ins,
// workouts, giving, poker sessions, Strava activities, saved meals, custom exercises — so deleting a
// journal entry did not stick: the next pull unioned it straight back, and the person watched it
// reappear with no way to make it go. The comment justifying the union claimed none of these keys could
// be deleted from; it was wrong for a quarter of them.
//
// A tombstone records "this id was deleted". The store is itself in SYNC_KEYS and merges as a UNION of
// both devices' maps, so the deletion PROPAGATES rather than being re-argued on every pull.
const TOMB_KEY = 'totry_tombstones';
const TOMB_MAX_AGE_MS = 180 * 86400000;   // half a year is long past any device catching up

// The SAME identity function the cloud union uses. If these two ever disagree the tombstone silently
// never matches and the whole mechanism does nothing — which is exactly the class of bug this file is
// full of — so there is one definition and both sides call it.
function syncIdOf(x){
  return (x && typeof x === 'object') ? (x.id !== undefined ? 'i'+x.id : (x.ts || JSON.stringify(x))) : x;
}
function _tombs(){
  try{ const t = JSON.parse(localStorage.getItem(TOMB_KEY) || '{}'); return (t && typeof t === 'object') ? t : {}; }
  catch(_){ return {}; }
}
function isTombed(key, id){
  try{ const b = _tombs()[key]; return !!(b && Object.prototype.hasOwnProperty.call(b, String(id))); }
  catch(_){ return false; }
}
// Derives the deleted ids from the BEFORE/AFTER diff rather than from the caller's filter predicate.
// Each delete site filters on a different field (e.ts, e.id, (e.ts||e.date)); diffing means the
// tombstone id can never drift from what the union will actually look for.
// Record one deletion. Most lists identify their rows with syncIdOf, and tombstoneRemoved() below
// derives those ids from a before/after diff. But the vices merge identifies rows by NAME — it builds
// its own map instead of going through union() — so a tombstone for a vice has to be written under
// the name, not under syncIdOf(vice). Both go through here, so the pruning and the write-back to the
// cloud can never drift apart between the two.
function _tombAdd(key, ...ids){
  try{
    const gone = ids.filter(id => id !== undefined && id !== null && id !== '');
    if(!gone.length) return;
    const t = _tombs();
    const bucket = t[key] || {};
    const now = Date.now();
    gone.forEach(id => { bucket[String(id)] = now; });
    // Prune anything long since propagated, so this cannot grow without bound on a device used for years.
    Object.keys(bucket).forEach(id => { if(now - (bucket[id] || 0) > TOMB_MAX_AGE_MS) delete bucket[id]; });
    t[key] = bucket;
    ls(TOMB_KEY, t);   // ls() queues it for sync because TOMB_KEY is in SYNC_KEYS
  }catch(_){ }
}
// Adding something back revokes its tombstone. Without this, re-adding a vice or a debt under a name
// that was ever removed is silently deleted again by the next pull, for TOMB_MAX_AGE_MS — 180 days.
// A deliberate act now outranks a deletion from before.
function tombstoneRevoke(key, ...ids){
  try{
    const t = _tombs();
    const bucket = t[key];
    if(!bucket) return;
    let changed = false;
    ids.forEach(id => {
      const k = String(id);
      if(Object.prototype.hasOwnProperty.call(bucket, k)){ delete bucket[k]; changed = true; }
    });
    if(!changed) return;
    t[key] = bucket;
    localStorage.setItem(TOMB_KEY, JSON.stringify(t));
  }catch(_){ }
}
function tombstoneRemoved(key, before, after){
  try{
    if(!Array.isArray(before)) return;
    const keep = new Set((Array.isArray(after) ? after : []).map(syncIdOf));
    const gone = before.filter(x => !keep.has(syncIdOf(x))).map(syncIdOf);
    _tombAdd(key, ...gone);
  }catch(_){ }
}      // durable pending writes {key:{value,ts}}
window.__syncState = { status: 'idle', lastSyncAt: null, pending: 0, error: null };

// Renders the human-readable sync status in Settings. Called on every state change + tab open.
function renderSyncStatus(){
  const el = document.getElementById('sync-status-line');
  if(!el) return;
  const s = window.__syncState || {};
  const ago = (t) => { if(!t) return ''; const m = Math.round((Date.now()-t)/60000); return m<1?'just now':(m<60?(m+' min ago'):(Math.round(m/60)+'h ago')); };
  if(typeof currentUser==='undefined' || !currentUser){ el.innerHTML = '<span style="color:var(--tx3)">Sign in to sync</span>'; return; }
  if(s.status==='syncing'){ el.innerHTML = '<span style="color:var(--go)">Syncing\u2026</span>'; return; }
  if(s.status==='error'){ el.innerHTML = '<span style="color:var(--re)">Not fully synced</span> <span style="color:var(--tx3);font-size:11px">\u00b7 '+(s.pending||0)+' change'+((s.pending===1)?'':'s')+' waiting, will retry</span>'; return; }
  if(s.status==='synced' || s.lastSyncAt){ el.innerHTML = '<span style="color:var(--gr)">\u2713 Saved to cloud</span> <span style="color:var(--tx3);font-size:11px">'+(s.lastSyncAt?('\u00b7 '+ago(s.lastSyncAt)):'')+'</span>'; return; }
  el.innerHTML = '<span style="color:var(--tx3)">Up to date</span>';
}
function _setSyncState(patch){
  Object.assign(window.__syncState, patch);
  try{ window.__syncState.pending = Object.keys(_getOutbox()).length; }catch(_){ }
  if(typeof renderSyncStatus === 'function'){ try{ renderSyncStatus(); }catch(_){ } }
}
function _getOutbox(){ try{ return JSON.parse(localStorage.getItem(SYNC_OUTBOX_KEY) || '{}'); }catch(_){ return {}; } }
// Returns false when the outbox could NOT be persisted. It used to swallow that: on a full device the
// queue silently failed to save while the UI still reported the write as on its way to the cloud, so an
// edit was lost with a success message over it. The caller decides what to tell the person.
function _setOutbox(o){
  try{ localStorage.setItem(SYNC_OUTBOX_KEY, JSON.stringify(o)); return true; }
  catch(_){ try{ _setSyncState({ status:'error', error:'This device is out of room, so that change is not queued to sync yet.' }); }catch(__){} return false; }
}
function _queueWrite(key, value){
  if(!SYNC_KEYS.includes(key)) return;
  const o = _getOutbox();
  o[key] = { value: value, ts: Date.now() };   // last-write-wins per key, durable on disk
  _setOutbox(o);
  _setSyncState({});
}

// Cloud-first write: record locally (already done by caller), durably queue, then flush.
async function syncToCloud(key, value){
  if(!SYNC_KEYS.includes(key)) return;          // only app data
  // Demo mode is checked HERE, not just via the syncEnabled flag, because three separate auth paths
  // set syncEnabled = true (sign-in, session restore, token refresh). Relying on the flag meant a
  // refresh mid-recording would quietly resume syncing and push demo data into a real account. This
  // is the one gate that cannot be flipped from underneath, and it also keeps the outbox clean —
  // queueing a fake write would push it the moment demo mode ended.
  if(typeof inDemoMode==='function' && inDemoMode()) return;
  _queueWrite(key, value);                        // DURABLE first — survives close even if flush fails
  if(!sb || !currentUser || !syncEnabled) return; // will flush once signed in / online
  flushOutbox();
}

let _flushing = false;
let _flushPending = false;
async function flushOutbox(){
  if(_flushing){ _flushPending = true; return; }   // a flush is running; ask it to loop again after
  if(typeof inDemoMode==='function' && inDemoMode()) return;   // never upload a persona (see syncToCloud)
  if(!sb || !currentUser || !syncEnabled){ return; }
  _flushing = true;
  _flushPending = false;
  try{
    // Drain in passes: keep going while the outbox still has entries (new writes can arrive mid-flush).
    let guard = 0;
    while(guard++ < 50){
      const o = _getOutbox();
      const keys = Object.keys(o);
      if(!keys.length){ break; }
      _setSyncState({ status:'syncing', error:null });
      let hadError = false;
      for(const key of keys){
        const entry = o[key];
        if(!entry) continue;
        try{
          const { error } = await sb.from('user_data').upsert({
            user_id: currentUser.id,
            data_key: _cloudKey(key),
            data_value: entry.value,
            updated_at: new Date(entry.ts).toISOString()
          }, { onConflict: 'user_id,data_key' });
          if(error){
            hadError = true;
            _setSyncState({ status:'error', error: error.message });
          } else {
            // Confirmed in cloud — only NOW remove from the durable outbox, and record the key's ts.
            const cur = _getOutbox();
            // Don't drop a newer write that landed while we were flushing this one.
            if(cur[key] && cur[key].ts === entry.ts){ delete cur[key]; _setOutbox(cur); }
            _recordKeyTs(key, entry.ts);
          }
        }catch(e){
          hadError = true;
          _setSyncState({ status:'error', error: String(e && e.message || e) });
        }
      }
      if(hadError) break;   // stop the drain on a real error; the retry loop will try again later
    }
    const remaining = Object.keys(_getOutbox()).length;
    _setSyncState({ status: remaining ? 'error' : 'synced', lastSyncAt: remaining ? window.__syncState.lastSyncAt : Date.now() });
  } finally {
    _flushing = false;
    // If writes came in while we were flushing, run one more time to catch them.
    if(_flushPending && Object.keys(_getOutbox()).length){ _flushPending = false; setTimeout(()=>flushOutbox(), 0); }
  }
}

// Per-key cloud timestamps, stored durably so merge-on-open is deterministic (replaces the fragile
// totry_meta approach). Maps data_key -> last-known-synced epoch ms.
function _getKeyTsMap(){ try{ return JSON.parse(localStorage.getItem('totry_key_ts') || '{}'); }catch(_){ return {}; } }
function _recordKeyTs(key, ts){ const m=_getKeyTsMap(); m[key]=ts; try{ localStorage.setItem('totry_key_ts', JSON.stringify(m)); }catch(_){ } }

// Manual "Sync now" from Settings.
async function syncNow(){
  if(!sb || !currentUser){ if(typeof showToast==='function') showToast('Not signed in','Sign in to sync your data.'); return; }
  _setSyncState({ status:'syncing' });
  const pulled = await pullFromCloud();   // pull authority first
  await flushOutbox();                    // push anything pending
  // TELL THEM WHAT ACTUALLY HAPPENED. This said "Your data is up to date." unconditionally — after a
  // pull that returned false, with writes still sitting in the outbox. Someone taps Sync now precisely
  // because they are worried about their data; a false all-clear is worse than no button at all.
  let stuck = 0;
  try{ stuck = Object.keys(_getOutbox() || {}).length; }catch(_){}
  if(typeof showToast === 'function'){
    if(pulled && !stuck) showToast('Synced', 'Your data is up to date.');
    else if(stuck) showToast('Not finished', stuck + ' change' + (stuck===1?'':'s') + ' still waiting. They are saved on this device and will go up when the connection is back.');
    else showToast('Could not reach the cloud', 'Nothing was lost — your data is on this device and will sync when you are back online.');
  }
}

// Override localStorage.setItem to trigger sync
let _originalSetItem = null;
function enableSyncMonitoring(){
  if(_originalSetItem) return; // Already enabled
  _originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value){
    _originalSetItem(key, value);
    // Record WHEN each key changed locally (durable per-key ts), so pull-on-open can compare
    // deterministically against the cloud row's updated_at instead of clobbering either side.
    if(SYNC_KEYS.includes(key)){
      try{ _recordKeyTs(key, Date.now()); }catch(_){ }
      // Durably queue the write to the on-disk outbox so it can NEVER be silently lost — even if
      // the network write fails and the app closes. flushOutbox() pushes it when signed in/online.
      try{
        let parsed; try{ parsed = JSON.parse(value); }catch(_){ parsed = value; }
        syncToCloud(key, parsed);
      }catch(_){ }
    }
  };
}

// ── SHARED COMMUNITY LIBRARY ──────────────────────────────────────────────────
// To Try grows its own knowledge from real use. When a user creates an exercise we don't have,
// or a web food lookup finds a real product, we contribute it to a SHARED table so every other
// user benefits — the library expands naturally from the community instead of staying capped at
// what we hardcoded. Contributions are deduped by name, lightly validated, and pulled on open.
//
// Backend: a Supabase table `shared_library` (see AI-PROXY-DEPLOY.md). Anyone signed in can insert
// and read; a future moderation pass can hide flagged rows. We never attach who contributed what
// in the client — it's just shared knowledge, not a social feed.
const SHARED_LIB_CACHE_KEY = 'totry_shared_lib_cache';
const SHARED_LIB_TTL = 12 * 3600 * 1000; // refresh at most twice a day

function _getSharedLibCache(){
  try{ const c = JSON.parse(localStorage.getItem(SHARED_LIB_CACHE_KEY) || 'null'); return c || { at:0, exercises:[], foods:[] }; }
  catch(_){ return { at:0, exercises:[], foods:[] }; }
}
function getSharedExercises(){ return _getSharedLibCache().exercises || []; }
function getSharedFoods(){ return _getSharedLibCache().foods || []; }

// Pull the shared library (cached, throttled). Called on open after sign-in.
async function pullSharedLibrary(force){
  if(!sb) return;
  const cache = _getSharedLibCache();
  if(!force && cache.at && (Date.now() - cache.at) < SHARED_LIB_TTL) return; // fresh enough
  try{
    const { data, error } = await sb.from('shared_library')
      .select('kind,name,data,verified')
      .eq('approved', true)
      .eq('flagged', false)
      .order('votes', { ascending:false })
      .limit(2000);
    if(error || !Array.isArray(data)) return;
    const exercises = [], foods = [];
    data.forEach(row => {
      if(!row || !row.name) return;
      let d = row.data; if(typeof d === 'string'){ try{ d = JSON.parse(d); }catch(_){ d = {}; } }
      const base = { name: row.name, ...(d||{}), verified: !!row.verified, shared:true };
      if(row.kind === 'exercise') exercises.push(base);
      else if(row.kind === 'food') foods.push(base);
    });
    try{ localStorage.setItem(SHARED_LIB_CACHE_KEY, JSON.stringify({ at: Date.now(), exercises, foods })); }catch(_){}
  }catch(_){ /* offline or table missing — app still works on local + hardcoded data */ }
}

// Normalize a name for dedup: lowercase, strip brand-y punctuation, collapse spaces, drop common
// noise words and trailing sizes (e.g. "200g", "1L") so "Musashi Protein Bar 90g" and
// "musashi protein bar" collapse to the same key. Prevents near-duplicate pile-ups.
function _normLibName(s){
  return String(s||'').toLowerCase()
    .replace(/[®™''`".,()]/g,'')
    .replace(/\b\d+(\.\d+)?\s?(g|kg|ml|l|oz|lb|pack|pk|x)\b/g,' ') // strip sizes/quantities
    .replace(/\b(the|a|an|with|of|original|new)\b/g,' ')
    .replace(/\s+/g,' ').trim();
}

// Contribute one item to the shared library. Opt-in only (caller decides). Dedupes hard by
// normalized name, and records whether the data is VERIFIED (from a real online lookup) vs
// unverified (AI estimate). Verified entries win; unverified ones never overwrite verified.
async function contributeToSharedLibrary(kind, name, data){
  if(!sb || !currentUser || !name) return;
  const clean = String(name).trim();
  if(clean.length < 2 || clean.length > 80) return;
  const norm = _normLibName(clean);
  if(!norm) return;
  try{
    if(kind === 'exercise'){
      const inHardcoded = Object.values(EXERCISE_DB).some(list => list.some(e => _normLibName(e.name) === norm));
      if(inHardcoded) return;                                   // already in our base library
      if(getSharedExercises().some(e => _normLibName(e.name) === norm)) return; // already shared
    } else if(kind === 'food'){
      if(getSharedFoods().some(f => {
        if(_normLibName(f.name) !== norm) return false;
        // If an existing shared row is already verified and ours isn't, skip (don't downgrade).
        return f.verified || !(data && data.verified);
      })) return;
    }
  }catch(_){}
  try{
    await sb.from('shared_library').upsert({
      kind, name: clean, norm,
      data: data || {},
      verified: !!(data && data.verified),
      approved: false,                                        // pending — you review before it goes live
      votes: 1, created_at: new Date().toISOString()
    }, { onConflict: 'kind,norm', ignoreDuplicates: true });  // dup = already submitted; skip (update is admin-only)
    const cache = _getSharedLibCache();
    const arr = kind === 'exercise' ? cache.exercises : cache.foods;
    const idx = arr.findIndex(x => _normLibName(x.name) === norm);
    const entry = { name: clean, ...(data||{}), shared:true };
    if(idx === -1) arr.push(entry);
    else if(data && data.verified && !arr[idx].verified) arr[idx] = entry; // upgrade to verified
    try{ localStorage.setItem(SHARED_LIB_CACHE_KEY, JSON.stringify(cache)); }catch(_){}
  }catch(_){ /* never block the user on a contribution failure */ }
}

// ── COMMUNITY MODERATION (dev/admin only) ─────────────────────────────────────
// You review what users submitted before it reaches the public library. Gated by DEV_EMAILS in
// the UI; the table's RLS should also restrict approve/delete to you (see AI-PROXY-DEPLOY.md).
async function loadPendingSubmissions(){
  const body = document.getElementById('moderation-body');
  if(!body) return;
  if(!sb || !currentUser){ body.innerHTML = '<div style="font-size:12px;color:var(--tx3);text-align:center;padding:14px">Sign in to review submissions.</div>'; return; }
  body.innerHTML = '<div style="font-size:12px;color:var(--tx3);text-align:center;padding:14px">Loading…</div>';
  try{
    const { data, error } = await sb.from('shared_library')
      .select('id,kind,name,data,verified,created_at')
      .eq('approved', false).eq('flagged', false)
      .order('created_at', { ascending:false })
      .limit(100);
    if(error){ body.innerHTML = '<div style="font-size:12px;color:var(--re);padding:8px">Couldn\u2019t load: '+(error.message||'error')+'</div>'; return; }
    if(!data || !data.length){ body.innerHTML = '<div style="font-size:12px;color:var(--tx3);text-align:center;padding:14px">Nothing pending. \u2713</div>'; return; }
    body.innerHTML = data.map(row => {
      let d = row.data; if(typeof d === 'string'){ try{ d = JSON.parse(d); }catch(_){ d = {}; } }
      // Every component is another user's text — escape each BEFORE joining. This blob arrives from a
      // table any signed-in person can write to, and it renders in the reviewer's own session.
      const meta = row.kind === 'exercise'
        ? [d.bodyPart, d.equipment, d.tracking].filter(Boolean).map(_escFew).join(' \u00b7 ')
        : [d.brand, d.serving, (d.cal!=null?d.cal+' cal':''), (d.pro!=null?d.pro+'g P':'')].filter(Boolean).map(_escFew).join(' \u00b7 ');
      const vTag = row.verified ? '<span class="src-tag" style="color:var(--gr);margin-left:6px">VERIFIED</span>' : '';
      return '<div style="border:1px solid var(--bd);border-radius:10px;padding:11px 12px;margin-bottom:8px">'+
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="font-size:8px;color:var(--tx3);font-family:DM Mono,monospace;text-transform:uppercase">'+row.kind+'</span>'+vTag+'</div>'+
        '<div style="font-size:14px;color:var(--tx);margin-bottom:2px">'+_escFew(row.name||'')+'</div>'+
        '<div style="font-size:11px;color:var(--tx3);margin-bottom:10px">'+(meta||'\u2014')+'</div>'+
        '<div style="display:flex;gap:8px">'+
          '<button class="btn primary" style="flex:1;font-size:12px;padding:8px" onclick="approveSubmission('+row.id+')">Approve</button>'+
          '<button class="btn" style="flex:1;font-size:12px;padding:8px;background:var(--re-bg);border:1px solid var(--re-bd);color:var(--re)" onclick="rejectSubmission('+row.id+')">Reject</button>'+
        '</div></div>';
    }).join('');
  }catch(e){ body.innerHTML = '<div style="font-size:12px;color:var(--re);padding:8px">Error loading submissions.</div>'; }
}
async function approveSubmission(id){
  if(!sb || !id) return;
  try{
    const { error } = await sb.from('shared_library').update({ approved: true }).eq('id', id);
    if(error){ showToast('Couldn\u2019t approve', error.message||''); return; }
    showToast('Approved \u2713', 'It\u2019s now in the community library.');
    if(typeof pullSharedLibrary==='function') pullSharedLibrary(true); // refresh local cache with the new item
    loadPendingSubmissions();
  }catch(_){ showToast('Error','Could not approve.'); }
}
async function rejectSubmission(id){
  if(!sb || !id) return;
  if(!confirm('Reject and delete this submission?')) return;
  try{
    const { error } = await sb.from('shared_library').delete().eq('id', id);
    if(error){ showToast('Couldn\u2019t reject', error.message||''); return; }
    showToast('Rejected', 'Submission removed.');
    loadPendingSubmissions();
  }catch(_){ showToast('Error','Could not reject.'); }
}

// ── CONSISTENCY LAYER ──
// Browser Safari and the Home-Screen app are SEPARATE storage worlds on iOS. The cloud row is
// the bridge. This merge runs on every signed-in open and every return-to-foreground:
//  • history keys (workouts, food days, weigh-ins, journal, rituals, sacraments) are UNION-merged
//    by id/timestamp — an entry logged in either world can never be clobbered by the other;
//  • settings keys go to whichever side changed most recently (local stamp vs cloud updated_at);
//  • anything merged is written back up, so both worlds converge on the same truth.
// Pull cloud as the source of truth, merge deterministically:
//  - array keys (workouts, journal, etc.): UNION by id/ts — never lose entries from either side
//  - totry_nutlog: per-date union
//  - everything else: newer-wins by timestamp (cloud updated_at vs our durable per-key ts), and if
//    LOCAL is newer (offline edit not yet synced) we keep local AND re-queue it so it pushes up.
// This is the behaviour confirmed with the user: cloud authority, but newer local edits are never
// thrown away — they win and sync up.
async function pullFromCloud(){
  if(!sb || !currentUser) return false;
  // And no pulling either. A pull would merge his real rows INTO the demo dataset — ruining the shot
  // with half-real data, and worse, the merged result is what a later restore would be measured
  // against. Demo mode is a sealed local session in both directions.
  if(typeof inDemoMode==='function' && inDemoMode()) return false;
  _setSyncState({ status:'syncing', error:null });
  try{
    let { data, error } = await sb.from('user_data')
      .select('data_key,data_value,updated_at').eq('user_id', currentUser.id);
    if(error){ _setSyncState({ status:'error', error:error.message }); return false; }
    // data.length===0, NOT just !data. PostgREST resolves a .select() with no matching rows to an
    // EMPTY ARRAY, which is truthy — so a brand-new account fell straight through this guard to the
    // `return true` at the end, and proceedAfterAuth reads that return as "this is a returning user".
    // The result on the app's ONLY sign-in path (email OTP; authGoogle is a disabled stub): a person
    // signing up for the first time had onboarding hidden, was greeted "Welcome back — your journey
    // continues", and never saw the name, first-moment, faith or apps steps. totry_onboarded,
    // totry_name and totry_faith_tradition stayed unwritten, so Home called them "Friend", the faith
    // registry silently defaulted to secular, and on the NEXT launch checkAuthAndStart's
    // `isOnboarded || (hasIdentity && hasName)` was false — landing them on the first-run welcome
    // screen with initApp() never running.
    // This exact check existed all along in _restoreFromCloud_legacy_unused, which nothing calls.
    if(!data || data.length === 0){ _setSyncState({ status:'synced', lastSyncAt:Date.now() }); return false; }
    const tsMap = _getKeyTsMap();
    const outbox = _getOutbox();
    // Append-only logs get UNIONED across devices; anything absent from this list falls through to
    // "newer scalar wins", which silently discards the other device's copy. A two-phone test found
    // exactly that: a win logged on phone B was thrown away by phone A's newer write.
    //
    // ⚠️ THIS COMMENT USED TO CLAIM every key below is "a pure event log with NO delete function
    // anywhere in the app, so unioning cannot resurrect something a person removed". THAT IS FALSE, and
    // it was the entire justification for unioning them. EIGHT of these keys have delete paths:
    //   totry_journal (deleteJournalEntry), totry_body (a weigh-in), totry_workouts, totry_family_contrib,
    //   totry_poker_sessions, totry_strava_activities, totry_saved_meals, totry_custom_exercises.
    // So deleting a journal entry or a weigh-in on one device does NOT stick: the next pull unions it
    // straight back. Fixing that properly needs synced tombstones (record the deleted id, sync it, and
    // filter it out of the union) — it is not done yet, and until it is, this is a known data-integrity
    // bug rather than a safe design. Do not re-derive "these are append-only" from this list.
    // totry_fight_log matters most: it is what teaches the risk window and the hard hour, so losing half
    // of it on a device switch quietly degrades the app's whole sense of when a person is vulnerable.
    const ARR = ['totry_workouts','totry_body','totry_journal','totry_mornings','totry_evenings','totry_confessions','totry_masses','totry_routines','totry_saved_meals','totry_family_contrib','totry_poker_sessions','totry_examens','totry_prayers','totry_strava_activities','totry_feeling_wins','totry_custom_exercises',
      'totry_wins','totry_moments_won','totry_fight_log','totry_cravings','totry_blessings','totry_reachouts',
      'totry_rosaries','totry_syntheses','totry_reviews','totry_vice_uses','totry_impulse_holds','totry_freezes',
      'totry_checkins','totry_mood_log','totry_fast_log','totry_releases',
      // Authored, id-bearing and append-shaped, and every bit as irreplaceable as a journal entry:
      // a letter to your future self, a promise you made, the people you carry. They were in
      // SYNC_KEYS but not here, so the whole list was taken from one side and the other side's was
      // dropped — write a letter on your phone, open the app on your laptop, and it is simply gone.
      'totry_letters','totry_promises','totry_relationships',
      // Append-only logs with a stable id/ts — see the note above.
      'totry_payments','totry_transactions','totry_vice_savings_log','totry_feelings','totry_hunger_log',
      // Editable lists — safe to union ONLY because their deletes now tombstone. See note.
      'totry_bills','totry_assets','totry_subscriptions'];
    const idOf = syncIdOf;   // ONE identity function, shared with tombstoneRemoved (see TOMB_KEY)
    // union(local, cloud) kept the FIRST occurrence of each id — always the LOCAL one — so an entry
    // EDITED on the other device never arrived: the correction was silently dropped while both copies
    // existed. Same-id collisions now resolve the way the scalar branch does — the side that is actually
    // newer wins. preferB=true means the cloud row is newer than our local copy and unsynced local
    // edits are not pending.
    // tombKey: entries whose id is tombstoned are DROPPED rather than merged, so a deletion made on
    // either device survives the pull instead of being undone by the other device's copy.
    const union = (a,b,preferB,tombKey) => {
      const m = new Map();
      const aLen = (a||[]).length;
      [].concat(a||[], b||[]).forEach((x,i) => {
        const k = idOf(x);
        if(tombKey && isTombed(tombKey, k)) return;
        if(!m.has(k)){ m.set(k, x); return; }
        if(i >= aLen && preferB) m.set(k, x);   // this id is on both sides and cloud is the newer side
      });
      return Array.from(m.values());
    };
    let changed = 0;
    // TOMBSTONES FIRST. isTombed() re-reads localStorage, and the incoming tombstone map only lands there
    // when its OWN row is reached inside this same loop — while the .select() above has no .order(), so
    // PostgREST returns rows in whatever order it likes. A union that ran before the tombstone row
    // arrived resurrected exactly what the other device had deleted, and whether it did was pure luck.
    // Sorting costs nothing and makes the ordering a property of this code rather than of the server.
    data = [].concat(data).sort((a, b) => {
      const at = _unCloudKey(a && a.data_key) === TOMB_KEY ? 0 : 1;
      const bt = _unCloudKey(b && b.data_key) === TOMB_KEY ? 0 : 1;
      return at - bt;
    });
    data.forEach(row => {
      // Only consume rows from THIS build's namespace (test rows in test build, real rows in live).
      const rawK = row.data_key;
      if(TEST_MODE){ if(typeof rawK!=='string' || rawK.indexOf(TEST_PREFIX)!==0) return; }
      else { if(typeof rawK==='string' && rawK.indexOf(TEST_PREFIX)===0) return; }
      const k = _unCloudKey(rawK), cv = row.data_value;
      if(cv === null || cv === undefined) return;
      // A DEVICE THAT JUST RAN OUT OF ROOM MUST NOT BE REFILLED IMMEDIATELY.
      // _lsEmergencyPrune trims the expendable stores and deliberately writes LOCALLY, so the account
      // keeps the history and other devices are untouched — which is right. But the very next pull
      // merged the full cloud copy straight back in, so the space was reclaimed and then handed back
      // within seconds, and the person's next save failed again. For a day after a prune, this device
      // skips the stores it just trimmed. The data is not deleted anywhere; this phone simply stops
      // being told about it until it has room.
      try{
        const _until = parseInt(localStorage.getItem('totry_constrained_until') || '0', 10);
        if(_until > Date.now() && typeof RESTORE_EXPENDABLE !== 'undefined' && RESTORE_EXPENDABLE.indexOf(k) !== -1) return;
      }catch(_){ }
      // A tombstoned cycle log is never restored, no matter what the server still holds. If the
      // original purge never landed (offline when they deleted), retry it here — quietly, once per
      // pull — so the row cannot outlive the person's decision.
      if(k === CYCLE_KEY && typeof _cycleTombed==='function' && _cycleTombed()){
        if(localStorage.getItem(CYCLE_TOMB) !== 'done'){ try{ _cyclePurgeCloud(); }catch(_){} }
        return;
      }
      const lraw = localStorage.getItem(k);
      let lv = null; try{ lv = lraw ? JSON.parse(lraw) : null; }catch(_){ lv = lraw; }
      const cts = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      const lts = tsMap[k] || 0;                 // when our local copy last synced/changed
      const pendingLocal = outbox[k] && outbox[k].ts > cts;  // unsynced local edit newer than cloud
      let nv;
      if(k === TOMB_KEY && lv && cv && typeof lv === 'object' && typeof cv === 'object'){
        // Both devices' deletions matter. Last-write-wins here would let the newer device's tombstone
        // map erase the other device's deletions, and those entries would come straight back.
        nv = {};
        const allKeys = new Set([].concat(Object.keys(lv), Object.keys(cv)));
        allKeys.forEach(bk => {
          const merged = Object.assign({}, cv[bk] || {}, lv[bk] || {});
          if(Object.keys(merged).length) nv[bk] = merged;
        });
        _queueWrite(k, nv);
      } else if(k === 'totry_nutlog' && lv && cv && typeof lv === 'object' && typeof cv === 'object'){
        nv = {}; const days = new Set([].concat(Object.keys(lv), Object.keys(cv)));
        const _cloudNewer = (cts >= lts) && !pendingLocal;
        days.forEach(d => { nv[d] = union(lv[d], cv[d], _cloudNewer, 'totry_nutlog'); });
        _queueWrite(k, nv);                        // push the merged truth back up — see the ARR note
      } else if(k === 'totry_v' && Array.isArray(lv) && Array.isArray(cv)){
        // Vices: merge by name so a win/relapse logged on one device is never lost. For a vice on
        // both sides, keep the higher relapseCount + total and the most recent lastWin/startDate,
        // and union the urge log. This is why a logged vice win now survives a cross-device pull.
        // A REMOVAL HAS TO SURVIVE THE MERGE. This branch builds its own map instead of going through
        // union(), so the isTombed() check every other list gets was structurally unreachable here: a
        // person removed a vice, watched it disappear, and the next pull unioned it straight back from
        // the cloud AND re-uploaded the resurrected list on line ~490 — so deleting it again could
        // never work either. Identity in this branch is the NAME, so that is what the tombstone holds
        // (see removeVice, which now records it under the same key).
        const byName = new Map();
        [].concat(lv, cv).forEach(v => {
          if(!v || !v.n) return;
          const key = String(v.n).toLowerCase();
          if(isTombed('totry_v', key)) return;
          const ex = byName.get(key);
          if(!ex){ byName.set(key, {...v}); return; }
          ex.relapseCount = Math.max(ex.relapseCount||0, v.relapseCount||0);
          ex.total = Math.max(ex.total||0, v.total||0);
          ex.w = Math.max(ex.w||0, v.w||0);
          const exWin = ex.lastWin ? new Date(ex.lastWin).getTime() : 0;
          const vWin = v.lastWin ? new Date(v.lastWin).getTime() : 0;
          if(vWin > exWin) ex.lastWin = v.lastWin;
          // startDate IS THE STREAK ANCHOR, NOT THE DATE THEY FIRST TRIED.
          //
          // This took the EARLIEST of the two, under the comment "longest-standing record of the
          // attempt" — but every relapse path rewrites startDate to now, so the earliest value is
          // simply the streak as it stood before the most recent slip. A woman 60 days clean who
          // logged a relapse honestly at 11pm with no signal had it silently reversed the next
          // morning: the pull merged her local copy against the stale cloud row, min() restored the
          // 60 days, and _queueWrite pushed that back up, so the reversal was permanent. Her card
          // then claimed a streak she knew she did not have while relapseCount said she had fallen.
          //
          // Recency is the only rule that is right for both cases — an offline relapse (local is
          // newer, or has pending writes) and a deliberately BACK-dated quit date set on the other
          // device (cloud is newer). It is the same rule the nutrition log already uses.
          const _vCloudNewer = (cts >= lts) && !pendingLocal;
          if(_vCloudNewer && v.startDate) ex.startDate = v.startDate;
          // else keep ex.startDate — ex is the local copy, since local is concatenated first.
          ex.urgelog = union(ex.urgelog, v.urgelog);
          if(!ex.type && v.type) ex.type = v.type;
        });
        nv = Array.from(byName.values());
        _queueWrite(k, nv);                        // push the merged truth back up
      } else if(k === 'totry_f' && lv && cv && typeof lv === 'object' && typeof cv === 'object'){
        // Finance: union debts by name so a debt added on one device isn't wiped by the other — but
        // honour tombstones, and let the newer side WIN on a debt both sides have. See the note above.
        const debts = new Map();
        const _dKey = d => String(d.n).toLowerCase();
        const _preferCloud = (cts >= lts) && !pendingLocal;
        const _sides = _preferCloud ? [lv.d||[], cv.d||[]] : [cv.d||[], lv.d||[]];   // newer side LAST
        [].concat(_sides[0], _sides[1]).forEach(d => {
          if(!d || !d.n) return;
          const key = _dKey(d);
          if(isTombed('totry_f', key)) return;     // removed deliberately — do not resurrect it
          debts.set(key, {...d});                   // later side overwrites: the newer value wins
        });
        nv = { d: Array.from(debts.values()), u: Math.max(lv.u||0, cv.u||0), i: Math.max(lv.i||0, cv.i||0) };
        _queueWrite(k, nv);
      } else if(ARR.indexOf(k) > -1 && Array.isArray(lv) && Array.isArray(cv)){
        nv = union(lv, cv, (cts >= lts) && !pendingLocal, k);   // keep every entry except a tombstoned one
        _queueWrite(k, nv);                        // push the merged truth back up — see the note
      } else if(lv === null || lv === undefined){
        nv = cv;                                   // nothing local → take cloud
      } else if(pendingLocal){
        nv = lv;                                   // local edit newer & unsynced → keep it, push up
        _queueWrite(k, lv);
      } else {
        nv = cts >= lts ? cv : lv;                 // newer-wins; ties go to cloud (authority)
        // AND if cloud won, the queued local value has been SUPERSEDED — drop it. It used to survive,
        // so the very next flushOutbox re-uploaded the exact value this pull had just rejected, wiping
        // the other device's newer edit. A two-phone loop that destroyed real data on every sync.
        if(nv === cv && outbox[k] && outbox[k].ts <= cts){
          // RE-READ, do not write back the pre-loop snapshot. `outbox` was captured once before this
          // forEach, but _queueWrite re-reads and re-writes it from disk on every call — so persisting
          // the stale object silently erased every write queued EARLIER IN THIS SAME PASS: the tombstone
          // map union, the vices merge, the finance merge. v470 introduced it and it quietly disabled
          // v471's tombstone propagation, so a deletion never left the device. Worse, PostgREST returns
          // rows unordered, so whether it fired at all depended on row order — intermittent and silent.
          const _o = _getOutbox();
          delete _o[k];
          _setOutbox(_o);
          delete outbox[k];   // keep the local snapshot consistent for the rest of the loop
        }
      }
      const out = JSON.stringify(nv);
      if(out !== lraw){
        // write WITHOUT re-queuing a cloud round-trip for values we just got FROM cloud
        try{ if(_originalSetItem) _originalSetItem.call(localStorage, k, out); else localStorage.setItem(k, out); }catch(_){ try{ localStorage.setItem(k,out); }catch(__){} }
        if(nv === cv) _recordKeyTs(k, cts);        // local now matches cloud at this ts
        changed++;
      }
    });
    if(changed > 0){
      if(typeof repairJourneyStart === 'function') repairJourneyStart();
      // Cloud data (workouts / Strava / Watch) just landed — rebuild the burn ledger from the single
      // source of truth so the "Burned" figure is correct and never double-counted.
      if(typeof recomputeWorkoutBurns === 'function') try{ recomputeWorkoutBurns(); }catch(_){ }
      if(typeof go === 'function' && window.__currentTab) try{ go(window.__currentTab); }catch(_){ }
    }
    _setSyncState({ status:'synced', lastSyncAt:Date.now() });
    return true;
  }catch(e){ _setSyncState({ status:'error', error:String(e&&e.message||e) }); return false; }
}
// Back-compat alias: old call sites used mergeFromCloud.
async function mergeFromCloud(){ return await pullFromCloud(); }

function startSyncLoop(){
  // Sync-FIRST on open: pull cloud authority, then push any durable outbox writes. Also re-pull
  // whenever the app returns to the foreground (you may have logged on another device meanwhile),
  // and flush the outbox when the network returns.
  if(!window.__consistencyHooked){
    window.__consistencyHooked = true;
    (async () => { await pullFromCloud(); await flushOutbox(); if(typeof pullSharedLibrary==='function') pullSharedLibrary(); })();
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'visible'){ (async () => { await pullFromCloud(); await flushOutbox(); })(); }
    });
    window.addEventListener('online', () => { flushOutbox(); });
  }
  enableSyncMonitoring();
  if(syncInterval) return;
  // Retry the durable outbox every 20s — anything that failed to reach the cloud keeps trying,
  // and because the outbox lives in localStorage it survives the app being closed.
  syncInterval = setInterval(() => { flushOutbox(); }, 20000);
}

function stopSyncLoop(){
  if(syncInterval){
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

