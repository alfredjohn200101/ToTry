// ── HEVY EXERCISE TEMPLATE CACHE ──────────────────────────────
// Creating/updating Hevy routines requires each exercise's Hevy template UUID, not its name.
// We fetch the full template list once and cache it (it's large but static), then map by name.
async function ensureHevyTemplates(force){
  const cached = ls('totry_hevy_templates');
  const cachedAt = ls('totry_hevy_templates_at');
  // Re-use cache for 30 days unless forced
  if(!force && cached && cachedAt && (Date.now() - cachedAt < 30*86400000) && Object.keys(cached).length){
    return cached;
  }
  const key = ls('totry_hevy_api_key');
  if(!key) return null;
  const map = {};
  try{
    let page = 1;
    const pageSize = 100;
    while(page <= 20){ // up to 2000 templates
      let resp;
      try{ resp = await hevyFetch('/v1/exercise_templates?page=' + page + '&pageSize=' + pageSize, 'GET'); }
      catch(e){ break; }
      if(!resp || !resp.ok) break;
      const data = resp.data || {};
      const templates = data?.exercise_templates || [];
      if(!templates.length) break;
      templates.forEach(t => {
        if(t.title && t.id) map[t.title.toLowerCase().trim()] = t.id;
      });
      if(templates.length < pageSize) break;
      page++;
    }
    if(Object.keys(map).length){
      ls('totry_hevy_templates', map);
      ls('totry_hevy_templates_at', Date.now());
    }
    return map;
  }catch(e){
    console.error('[hevy] template fetch failed', e);
    return cached || null;
  }
}

// Map a ToTry exercise name to a Hevy template id (exact, then fuzzy contains)
function mapToHevyTemplate(name, templates){
  if(!templates || !name) return null;
  const n = name.toLowerCase().trim();
  if(templates[n]) return templates[n];
  // Fuzzy: find a template whose name contains all words of the query (or vice versa)
  const words = n.split(/\s+/).filter(w => w.length > 2);
  for(const [tName, tId] of Object.entries(templates)){
    if(tName.includes(n) || n.includes(tName)) return tId;
    if(words.length && words.every(w => tName.includes(w))) return tId;
  }
  return null;
}

// ── IMPORT HEVY ROUTINES → ToTry ──────────────────────────────
async function importHevyRoutines(){
  const key = ls('totry_hevy_api_key');
  if(!key){ showToast('Not connected', 'Connect Hevy first.'); return; }
  document.querySelector('.modal-bg.open')?.remove();
  showToast('Importing', 'Pulling your Hevy routines...');
  
  try{
    // Hevy caps pageSize at 10 — requesting 20 returns HTTP 400. Page through (up to 10 pages)
    // at the allowed size so users with many routines still get them all.
    let routines = [];
    let page = 1; const MAX_PAGES = 10;
    while(page <= MAX_PAGES){
      let resp;
      try{ resp = await hevyFetch('/v1/routines?page=' + page + '&pageSize=10', 'GET'); }
      catch(e){ showToast('Import failed', 'Hevy error: ' + ((e && e.message) ? String(e.message).slice(0,90) : 'no detail')); return; }
      if(!resp || !resp.ok){
        showToast('Import failed', (resp && resp.status === 401) ? 'Key invalid — reconnect (needs Hevy Pro).' : 'Hevy returned ' + (resp && resp.status) + '.');
        return;
      }
      const data = resp.data || {};
      const batch = data.routines || [];
      routines = routines.concat(batch);
      const totalPages = data.page_count || data.pageCount || 1;
      if(page >= totalPages || batch.length === 0) break;
      page++;
    }
    if(!routines.length){ showToast('No routines', 'No saved routines found in Hevy.'); return; }
    
    const existing = ls('totry_routines') || [];
    const existingHevyIds = new Set(existing.filter(r => r.hevyRoutineId).map(r => r.hevyRoutineId));
    let imported = 0;
    
    routines.forEach(r => {
      if(existingHevyIds.has(r.id)) return;
      const exercises = (r.exercises || []).map(ex => ({
        name: ex.title || 'Exercise',
        sets: (ex.sets || []).length || 3,
        reps: (ex.sets && ex.sets[0] && ex.sets[0].reps) ? String(ex.sets[0].reps) : '8-12',
        rest: ex.rest_seconds ? ex.rest_seconds + 's' : '90s',
        hevyTemplateId: ex.exercise_template_id || null
      }));
      existing.push({
        id: Date.now() + Math.floor(Math.random()*100000),
        hevyRoutineId: r.id,
        name: r.title || 'Hevy routine',
        source: 'hevy',
        exercises: exercises,
        createdAt: new Date().toISOString()
      });
      imported++;
    });
    
    ls('totry_routines', existing);
    showToast(imported ? 'Imported ✓' : 'Up to date', imported ? imported + ' routine' + (imported>1?'s':'') + ' from Hevy.' : 'No new routines.');
    haptic('success');
    if(typeof renderRoutines === 'function') renderRoutines();
  }catch(e){
    console.error('[hevy] routine import failed', e);
    showToast('Import failed', 'Check your connection and try again.');
  }
}

// ── PUSH ToTry ROUTINE → HEVY ─────────────────────────────────
async function openPushRoutineToHevy(){
  document.querySelector('.modal-bg.open')?.remove();
  const routines = ls('totry_routines') || [];
  // Only routines NOT already from Hevy make sense to push
  const pushable = routines.filter(r => !r.hevyRoutineId);
  if(!pushable.length){
    showToast('No routines to push', 'Build a routine in Train first.');
    return;
  }
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal" style="max-height:80vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:6px">Push a routine to Hevy</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px;line-height:1.5">Send a routine you built here into your Hevy account, so you can run it in the Hevy app too.</p>' +
    pushable.map((r, i) =>
      '<button class="btn" onclick="pushRoutineToHevy(' + routines.indexOf(r) + ')" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd);text-align:left;display:flex;justify-content:space-between;align-items:center">' +
        '<span>' + (r.name || 'Routine').replace(/</g,'&lt;') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3)">' + (r.exercises||[]).length + ' ex →</span>' +
      '</button>'
    ).join('') +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:4px">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
}

async function pushRoutineToHevy(routineIdx){
  const key = ls('totry_hevy_api_key');
  if(!key){ showToast('Not connected', 'Connect Hevy first.'); return; }
  const routines = ls('totry_routines') || [];
  const routine = routines[routineIdx];
  if(!routine){ showToast('Not found', 'Routine missing.'); return; }
  
  document.querySelector('.modal-bg.open')?.remove();
  showToast('Mapping exercises', 'Matching to Hevy\'s library...');
  
  // Get Hevy templates so we can resolve exercise IDs
  const templates = await ensureHevyTemplates();
  if(!templates){ showToast('Push failed', 'Couldn\'t load Hevy exercise list. Try again.'); return; }
  
  const hevyExercises = [];
  const unmapped = [];
  (routine.exercises || []).forEach(ex => {
    const tid = ex.hevyTemplateId || mapToHevyTemplate(ex.name, templates);
    if(tid){
      const setCount = typeof ex.sets === 'number' ? ex.sets : ((ex.sets && ex.sets.length) || 3);
      const reps = parseInt(ex.reps) || null;
      hevyExercises.push({
        exercise_template_id: tid,
        superset_id: null,
        rest_seconds: parseInt(ex.rest) || null,
        notes: null,
        sets: Array.from({length: setCount}, () => ({
          type: 'normal',
          weight_kg: null,
          reps: reps,
          distance_meters: null,
          duration_seconds: null,
          custom_metric: null
        }))
      });
    } else {
      unmapped.push(ex.name);
    }
  });
  
  if(!hevyExercises.length){
    showToast('Couldn\'t map exercises', 'None matched Hevy\'s library. Try renaming them.');
    return;
  }
  
  showToast('Pushing', 'Creating routine in Hevy...');
  try{
    let resp;
    try{
      resp = await hevyFetch('/v1/routines', 'POST', {
        routine: {
          title: routine.name || 'ToTry routine',
          folder_id: null,
          notes: 'Created in ToTry',
          exercises: hevyExercises
        }
      });
    }catch(e){ showToast('Push failed', 'Hevy error: ' + ((e && e.message) ? String(e.message).slice(0,90) : 'no detail')); return; }

    if(!resp || !resp.ok){
      console.warn('[hevy] push failed', resp && resp.status);
      showToast('Push failed', (resp && resp.status === 401) ? 'Key invalid — reconnect (needs Hevy Pro).' : 'Hevy returned ' + (resp && resp.status) + '.');
      return;
    }
    const result = resp.data || {};
    // Tag the local routine with the new Hevy id so we don't duplicate later
    const newId = result?.routine?.id || (Array.isArray(result?.routines) && result.routines[0]?.id);
    if(newId){ routine.hevyRoutineId = newId; ls('totry_routines', routines); }
    
    let msg = 'It\'s now in your Hevy app.';
    if(unmapped.length) msg = unmapped.length + ' exercise' + (unmapped.length>1?'s':'') + ' couldn\'t be matched and ' + (unmapped.length>1?'were':'was') + ' skipped.';
    showToast('Pushed to Hevy ✓', msg);
    haptic('celebrate');
  }catch(e){
    console.error('[hevy] push error', e);
    showToast('Push failed', 'Check your connection and try again.');
  }
}

// ── LOG A COMPLETED ToTry WORKOUT → HEVY ──────────────────────
// Pushes your most recent ToTry-native session into Hevy as a completed workout,
// so sessions you log here also show up in your Hevy history.
async function pushLastWorkoutToHevy(){
  const key = ls('totry_hevy_api_key');
  if(!key){ showToast('Not connected', 'Connect Hevy first.'); return; }
  const workouts = ls('totry_workouts') || [];
  // Most recent workout that did NOT come from Hevy (avoid pushing Hevy's own data back)
  const native = workouts.find(w => w.source !== 'hevy' && w.source !== 'hevy-csv' && !w.pushedToHevy && (w.exercises||[]).length);
  if(!native){ showToast('Nothing to push', 'No new ToTry workout to log to Hevy.'); return; }
  
  document.querySelector('.modal-bg.open')?.remove();
  showToast('Mapping exercises', 'Matching to Hevy\'s library...');
  const templates = await ensureHevyTemplates();
  if(!templates){ showToast('Push failed', 'Couldn\'t load Hevy exercise list.'); return; }
  
  const hevyExercises = [];
  const unmapped = [];
  (native.exercises || []).forEach(ex => {
    const tid = ex.hevyTemplateId || mapToHevyTemplate(ex.name, templates);
    if(!tid){ unmapped.push(ex.name); return; }
    const sets = (ex.sets || []).map(s => ({
      type: (s.type === 'warmup' || s.type === 'drop' || s.type === 'failure') ? s.type : 'normal',
      weight_kg: parseFloat(s.weight) || null,
      reps: parseInt(s.reps) || null,
      distance_meters: null,
      duration_seconds: null,
      rpe: (s.rpe && !isNaN(s.rpe)) ? parseFloat(s.rpe) : null,
      custom_metric: null
    }));
    hevyExercises.push({ exercise_template_id: tid, superset_id: null, notes: ex.note || null, sets: sets.length ? sets : [{type:'normal',weight_kg:null,reps:null,distance_meters:null,duration_seconds:null,rpe:null,custom_metric:null}] });
  });
  
  if(!hevyExercises.length){ showToast('Couldn\'t map exercises', 'None matched Hevy\'s library.'); return; }
  
  // Build start/end times from the session timestamp (assume ~60 min if unknown)
  const start = native.ts ? new Date(native.ts) : new Date();
  const durMin = native.durationMinutes || 60;
  const end = new Date(start.getTime() + durMin * 60000);
  
  showToast('Logging to Hevy', 'Creating the workout...');
  try{
    let resp;
    try{
      resp = await hevyFetch('/v1/workouts', 'POST', {
        workout: {
          title: native.splitFocus || 'ToTry workout',
          description: 'Logged in ToTry',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          is_private: false,
          exercises: hevyExercises
        }
      });
    }catch(e){ showToast('Push failed', 'Hevy error: ' + ((e && e.message) ? String(e.message).slice(0,90) : 'no detail')); return; }
    if(!resp || !resp.ok){
      console.warn('[hevy] workout push failed', resp && resp.status);
      showToast('Push failed', (resp && resp.status === 401) ? 'Key invalid — reconnect (needs Hevy Pro).' : 'Hevy returned ' + (resp && resp.status) + '.');
      return;
    }
    // Mark as pushed so we don't duplicate
    native.pushedToHevy = true;
    ls('totry_workouts', workouts);
    let msg = 'It\'s now in your Hevy history.';
    if(unmapped.length) msg = unmapped.length + ' exercise' + (unmapped.length>1?'s':'') + ' skipped (no match).';
    showToast('Logged to Hevy ✓', msg);
    haptic('celebrate');
  }catch(e){
    console.error('[hevy] workout push error', e);
    showToast('Push failed', 'Check your connection and try again.');
  }
}

async function saveHevyKey(){
  const input = document.getElementById('hevy-key-input');
  const key = input?.value.trim();
  if(!key || key.length < 10){
    showToast('Invalid key', 'Paste your full Hevy API key (from hevy.com/settings?developer).');
    return;
  }
  // NOTE: We can't reliably validate by calling api.hevyapp.com from the browser — Hevy's API
  // doesn't send CORS headers, so a browser fetch throws regardless of whether the key is valid.
  // So we SAVE the key first (that's what was silently failing before), then attempt a sync and
  // report honestly. The sync itself runs through the proxy path where available.
  const btn = document.querySelector('.modal-bg.open .btn.primary');
  if(btn){ btn.textContent = 'Saving...'; btn.disabled = true; }

  ls('totry_hevy_api_key', key);
  const used = ls('totry_apps_used') || [];
  if(!used.includes('hevy')){ used.push('hevy'); ls('totry_apps_used', used); }
  if(typeof syncToCloud === 'function') syncToCloud('totry_hevy_api_key', key);

  document.querySelector('.modal-bg.open')?.remove();
  showToast('Hevy key saved ✓', 'Trying to pull your workouts...');
  haptic('celebrate');

  if(typeof renderConnectedApps === 'function') renderConnectedApps();
  // Attempt the sync; syncHevyWorkouts reports its own success/failure toast.
  setTimeout(() => { if(typeof syncHevyWorkouts === 'function') syncHevyWorkouts(); }, 600);
}

// ── legacy validation path kept for reference, no longer used ──

// Fetch recent Hevy workouts and import them into the training history
// Routes a Hevy API request through our edge function (the browser can't call Hevy directly
// due to CORS). Returns {status, ok, data} or throws. method/path/body mirror the Hevy REST API.
async function hevyFetch(path, method, bodyObj){
  const key = ls('totry_hevy_api_key');
  if(!key) throw new Error('no hevy key');
  const { data, error } = await sb.functions.invoke('ai-proxy', {
    body: { action:'hevy', hevy_key:key, hevy_path:path, hevy_method:method||'GET', hevy_body:bodyObj || undefined }
  });
  if(error) throw error;
  if(data && data.error) throw new Error(data.message || data.error);
  return data; // {status, ok, data}
}

// ═══════════════════════════════════════════════════════════════════
// WS2 — REAL HEVY INTEGRATION. Read the user's actual routines + folders and
// surface THOSE (not an app-invented split). A Hevy user trains from Hevy;
// To Try should reflect their real routines, with last weights per exercise.
// ═══════════════════════════════════════════════════════════════════
// Single source of truth for "does this user train from Hevy?"
function isHevyUser(){
  const r = ls('totry_hevy_routines');
  return !!ls('totry_hevy_api_key') && Array.isArray(r) && r.length > 0;
}
// Most recent logged weight×reps for an exercise (by name OR templateId), for the "last time" column.
function getLastWeightForExercise(name, templateId){
  const history = ls('totry_workouts') || []; // newest-first
  for(const w of history){
    const ex = (w.exercises || []).find(e => e.name === name || (templateId && e.templateId === templateId));
    if(!ex) continue;
    let bw = 0, br = 0, be = 0;
    (ex.sets || []).forEach(s => {
      if(s.type && /warm/i.test(s.type)) return;
      const e = estE1RM(s.weight, s.reps);
      if(e > be){ be = e; bw = parseFloat(s.weight)||0; br = parseInt(s.reps)||0; }
    });
    if(bw > 0) return { weight: bw, reps: br, date: w.date || '' };
  }
  return null;
}
// Pull raw Hevy routines + folders and store them as-is. Routines are templates (no weekday),
// so we present them as a pickable list rather than forcing them onto days.
async function fetchHevyRoutines(opts){
  opts = opts || {};
  const key = ls('totry_hevy_api_key');
  if(!key){ if(!opts.silent) showToast('Not connected', 'Connect Hevy first.'); return false; }
  try{
    // Folders first (cheap), then routines (paginate up to a few pages).
    let folders = [];
    try{ const fr = await hevyFetch('/v1/routine_folders?page=1&pageSize=10', 'GET'); if(fr && fr.ok) folders = (fr.data && (fr.data.routine_folders || fr.data.folders)) || []; }catch(_){ }
    let routines = [], page = 1, keep = true;
    while(keep && page <= 5){
      let resp;
      try{ resp = await hevyFetch('/v1/routines?page=' + page + '&pageSize=10', 'GET'); }
      catch(e){ if(!opts.silent) showToast('Hevy error', 'Could not load routines.'); break; }
      if(!resp || !resp.ok){
        if(!opts.silent) showToast('Hevy', (resp && resp.status === 401) ? 'Key invalid — reconnect (needs Hevy Pro).' : 'Hevy returned ' + (resp && resp.status) + '.');
        break;
      }
      const batch = (resp.data && resp.data.routines) || [];
      routines = routines.concat(batch);
      if(batch.length < 10) keep = false;
      page++;
    }
    // Normalize to a compact shape we control.
    const norm = routines.map(r => ({
      hevyId: r.id,
      title: r.title || 'Routine',
      folderId: r.folder_id || null,
      exercises: (r.exercises || []).map(ex => ({
        name: ex.title || 'Exercise',
        templateId: ex.exercise_template_id || null,
        targetSets: (ex.sets || []).length || null,
        targetReps: (ex.sets && ex.sets[0] && ex.sets[0].reps != null) ? String(ex.sets[0].reps) : null,
        rest: ex.rest_seconds || null,
        note: ex.notes || ''
      }))
    }));
    ls('totry_hevy_routines', norm);
    ls('totry_hevy_folders', (folders || []).map(f => ({ id: f.id, title: f.title || 'Folder' })));
    ls('totry_hevy_routines_at', Date.now());
    if(typeof syncToCloud==='function') syncToCloud();
    if(!opts.silent) showToast('Hevy routines loaded', norm.length + ' routine' + (norm.length===1?'':'s') + ' from Hevy.');
    return true;
  }catch(e){ if(!opts.silent) showToast('Hevy', 'Could not load routines.'); return false; }
}
// Which Hevy routine is "today's"? Hevy templates carry no weekday, so we let the user pick and
// remember it per-day. Returns the chosen routine object or null.
function getTodayHevyRoutine(){
  const routines = ls('totry_hevy_routines') || [];
  if(!routines.length) return null;
  const pick = ls('totry_hevy_today_pick') || {};
  const todayKey = new Date().toLocaleDateString('en-AU');
  if(pick.date === todayKey && pick.hevyId){
    const found = routines.find(r => r.hevyId === pick.hevyId);
    if(found) return found;
  }
  return null;
}
function setTodayHevyRoutine(hevyId){
  ls('totry_hevy_today_pick', { date: new Date().toLocaleDateString('en-AU'), hevyId });
  if(typeof loadTodaySplitCard==='function') loadTodaySplitCard();
  if(typeof renderHevyRoutines==='function') renderHevyRoutines();
  haptic('success');
}
// Modal to change today's Hevy routine.
function openHevyTodayPicker(){
  const routines = ls('totry_hevy_routines') || [];
  if(!routines.length){ showToast('No routines', 'Load your Hevy routines first.'); return; }
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;color:var(--tx);margin-bottom:12px">Today\u2019s routine</div>'+
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">'+
    routines.map(r => '<button class="btn" style="background:var(--bg3);border:1px solid var(--bd);text-align:left;padding:12px" onclick="setTodayHevyRoutine(\'' + r.hevyId + '\');this.closest(\'.modal-bg\').remove()"><div style="color:var(--tx);font-size:14px">' + r.title + '</div><div style="color:var(--tx3);font-size:11px;margin-top:2px">' + (r.exercises||[]).length + ' exercises</div></button>').join('')+
    '</div>'+
    '<button class="btn" onclick="this.closest(\'.modal-bg\').remove()" style="background:transparent;border:none;color:var(--tx3)">Cancel</button></div>';
  document.body.appendChild(m);
}

