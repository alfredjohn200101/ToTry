// ── STRAVA TESTER ALLOWLIST ──────────────────────────────────────────
// Strava's developer tier caps connections at a limited number of athletes (~10).
// Add a tester's email here (lowercase) to let them connect Strava. Keep it under 10.
// To add: put their email in quotes on its own line, with a comma. Example:
//   'alfredjohn200101@gmail.com',
//   'tester1@gmail.com',
//   'tester2@icloud.com',
const STRAVA_APPROVED_EMAILS = [
  'alfredjohn200101@gmail.com',
  'alfredjohn200101@yahoo.com',
  // ↓ add tester emails below this line (lowercase, comma after each)
  'amalgeot@outlook.com',
  'brooklynl2001@hotmail.com',
  'adampj09@gmail.com',
  'glensaju@gmail.com',
];
const STRAVA_MAX_ATHLETES = 10;

function isStravaApproved(){
  const email = (currentUser?.email || '').toLowerCase().trim();
  if(!email) return false; // not logged in
  // Guard the cap: even if more than 10 emails get added by mistake, only honour the first 10
  return STRAVA_APPROVED_EMAILS.slice(0, STRAVA_MAX_ATHLETES).includes(email);
}

// Wait for currentUser to be loaded before checking — handles race condition on first tap
async function ensureUserLoaded(){
  if(currentUser?.email) return true;
  if(!sb) return false;
  try{
    const {data:{user}} = await sb.auth.getUser();
    if(user){ currentUser = user; return true; }
  }catch(e){}
  return false;
}

function offerStravaConnect(){
  // Defensive: refresh currentUser if not loaded
  ensureUserLoaded().then(() => {
    _showStravaModal();
  });
}

function _showStravaModal(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  
  // If user is not on the approved list, show "coming soon" instead of a broken button
  if(!isStravaApproved()){
    m.innerHTML = '<div class="modal">' +
      '<div class="modal-handle"></div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
        '<div style="width:40px;height:40px;border-radius:8px;background:#FC4C02;display:flex;align-items:center;justify-content:center;font-size:18px">\u{1F6B4}</div>' +
        '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Strava — limited access</div><div style="font-size:11px;color:var(--tx3)">Currently invite-only</div></div>' +
      '</div>' +
      '<p style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:14px">Strava integration is live but limited to a small number of connected athletes right now. As the app grows and broader API access is approved, this opens up to everyone.</p>' +
      '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px;line-height:1.6;font-style:italic">In the meantime, you can manually log cardio in the Train tab \u2014 same outcome, just one extra tap.</p>' +
      '<button class="btn" onclick="closeModal(this)">Got it</button>' +
    '</div>';
    document.body.appendChild(m);
    try{ const st = ls('totry_strava_last'); if(st){ const f = document.createElement('div'); f.style.cssText='font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-align:center;margin-top:10px'; f.textContent='Last sync: ' + new Date(st.ts).toLocaleString('en-AU',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}) + ' \u00b7 ' + st.count + ' pulled \u00b7 one-way (Strava \u2192 To Try)'; const mm = m.querySelector('.modal'); if(mm) mm.appendChild(f); } }catch(_){}
    return;
  }
  
  // NATIVE: the OAuth round trip cannot complete inside the app shell. The WebView's origin is
  // capacitor://localhost, so STRAVA_REDIRECT_URI becomes capacitor://localhost/ -- Strava validates
  // redirect_uri against the app's registered Authorization Callback DOMAIN and rejects it outright,
  // and Capacitor hands strava.com to Safari with no CFBundleURLTypes scheme and no appUrlOpen
  // listener to route back. Tapping Connect was a one-way trip to an error page.
  // The honest path works and is permanent: totry_strava_token is in SYNC_KEYS, and getStravaToken()
  // refreshes through the edge function with no redirect_uri -- so connecting once in the browser on
  // this same account lands the token on this phone at the next foreground pull, forever after.
  if(typeof isNativeApp==='function' && isNativeApp()){
    m.innerHTML = '<div class="modal">' +
      '<div class="modal-handle"></div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
        '<div style="width:40px;height:40px;border-radius:8px;background:#FC4C02;display:flex;align-items:center;justify-content:center;font-size:18px">\u{1F6B4}</div>' +
        '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Connect Strava on the web</div><div style="font-size:11px;color:var(--tx3)">Once — then it syncs here on its own</div></div>' +
      '</div>' +
      '<p style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:12px">Strava’s sign-in can’t hand you back into the app on iOS, so you connect it once in your browser instead.</p>' +
      '<p style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:14px">Open To Try on the web, sign in with <b>this same account</b>, then Settings → Connected apps → Strava. Your runs and rides start syncing into this app by themselves — nothing else to do here.</p>' +
      '<button class="btn primary" onclick="openStravaOnWeb()" style="margin-bottom:8px">Open To Try on the web</button>' +
      '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Later</button>' +
    '</div>';
    document.body.appendChild(m);
    return;
  }

  // Approved path
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
      '<div style="width:40px;height:40px;border-radius:8px;background:#FC4C02;display:flex;align-items:center;justify-content:center;font-size:18px">\u{1F6B4}</div>' +
      '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Connect Strava</div><div style="font-size:11px;color:var(--tx3)">Auto-sync your runs, rides, workouts</div></div>' +
    '</div>' +
    '<p style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:14px">Once connected, your Strava activities sync into ToTry automatically &mdash; counting toward your gym habit and training adherence.</p>' +
    '<button class="btn primary" onclick="startStravaOAuth()" style="margin-bottom:8px">Connect with Strava</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>' +
    '</div>';
  document.body.appendChild(m);
    try{ const st = ls('totry_strava_last'); if(st){ const f = document.createElement('div'); f.style.cssText='font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-align:center;margin-top:10px'; f.textContent='Last sync: ' + new Date(st.ts).toLocaleString('en-AU',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}) + ' \u00b7 ' + st.count + ' pulled \u00b7 one-way (Strava \u2192 To Try)'; const mm = m.querySelector('.modal'); if(mm) mm.appendChild(f); } }catch(_){}
}

// Opens the web build so a native user can complete the Strava OAuth round trip in a real browser.
// window.open is the pattern the rest of this file already uses for external links; the href fallback
// covers a shell where the popup is refused.
function openStravaOnWeb(){
  var u = 'https://alfredjohn200101.github.io/ToTry/';
  var w = null;
  try{ w = window.open(u, '_blank'); }catch(_){ }
  if(!w){ window.location.href = u; }
}

function startStravaOAuth(){
  // Belt and braces. _showStravaModal never offers this natively, but any future entry point that
  // calls it must not bounce the person into Safari and lose them -- see the note in that function.
  if(typeof isNativeApp==='function' && isNativeApp()){ openStravaOnWeb(); return; }
  if(!STRAVA_CLIENT_ID) return;
  const scope = 'read,activity:read_all';
  const state = Math.random().toString(36).slice(2);
  localStorage.setItem('totry_strava_oauth_state', state);
  const url = 'https://www.strava.com/oauth/authorize' +
    '?client_id=' + STRAVA_CLIENT_ID +
    '&response_type=code' +
    '&redirect_uri=' + encodeURIComponent(STRAVA_REDIRECT_URI) +
    '&approval_prompt=auto' +
    '&scope=' + scope +
    '&state=' + state;
  window.location.href = url;
}

async function handleStravaCallback(){
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const scope = params.get('scope');
  const error = params.get('error');
  
  // User denied permission on Strava
  if(error){
    console.warn('[strava] OAuth denied:', error);
    showToast('Strava cancelled', 'You can connect Strava anytime from Settings.');
    window.history.replaceState({}, '', STRAVA_REDIRECT_URI);
    return;
  }
  
  if(!code) return;
  
  // Only handle if this is a Strava callback. Strava sends scope like "read,activity:read_all".
  // Google sends scope like "https://www.googleapis.com/auth/fitness.activity.read ..."
  // Detect Strava by presence of "activity:read" or absence of "googleapis"
  const isStrava = scope && (scope.includes('activity:read') || scope.includes('activity:write')) && !scope.includes('googleapis');
  if(scope && !isStrava) return; // Not for us — let Google handler take it
  
  const expectedState = localStorage.getItem('totry_strava_oauth_state');
  if(state && expectedState && state !== expectedState){
    console.warn('[strava] state mismatch', {got: state, expected: expectedState});
    showToast('Auth error', 'Strava session expired. Please try again.');
    window.history.replaceState({}, '', STRAVA_REDIRECT_URI);
    return;
  }
  
  console.log('[strava] callback received, exchanging code for token...');
  showToast('Connecting Strava', 'Exchanging tokens...');
  
  // Clear URL immediately so reload doesn't re-trigger exchange
  window.history.replaceState({}, '', STRAVA_REDIRECT_URI);
  
  try{
    if(!sb){
      console.error('[strava] Supabase client not ready');
      showToast('Strava failed', 'App not fully loaded. Refresh and try again.');
      return;
    }
    const {data, error: invokeErr} = await sb.functions.invoke('strava-oauth', {
      body: {action: 'exchange', code: code}
    });
    
    console.log('[strava] exchange', invokeErr ? 'failed' : 'ok');
    
    if(invokeErr){
      console.error('[strava] invoke error:', invokeErr);
      showToast('Strava failed', 'Server error. Check console (F12) for details.');
      return;
    }
    if(!data || data.errors || data.message){
      console.error('[strava] exchange returned error:', data);
      const msg = data?.errors?.[0]?.field ? 'Invalid auth code. Please try connecting again.' : 'Strava rejected the request. Check your app settings.';
      showToast('Strava failed', msg);
      return;
    }
    if(!data.access_token){
      console.error('[strava] no access_token in response:', data);
      showToast('Strava failed', 'No token returned. Check the Edge Function logs.');
      return;
    }
    
    // Save tokens
    ls('totry_strava_token', {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      athlete: data.athlete ? {
        id: data.athlete.id,
        name: (data.athlete.firstname || '') + ' ' + (data.athlete.lastname || '')
      } : null
    });
    
    console.log('[strava] tokens saved, athlete:', data.athlete?.firstname);
    showToast('Strava connected ✓', 'Pulling your recent activities...');
    haptic('celebrate');
    setTimeout(() => syncStravaActivities(), 1000);
  }catch(e){
    console.error('[strava] callback exception:', e);
    showToast('Strava failed', 'Connection error: ' + (e?.message || 'unknown'));
  }
}

// Get a valid Strava access token, refreshing if expired
async function getStravaToken(){
  const tok = ls('totry_strava_token');
  if(!tok || !tok.access_token) return null;
  // Check if expired (expires_at is unix seconds)
  if(tok.expires_at && tok.expires_at > (Date.now()/1000 + 60)){
    return tok.access_token; // still valid
  }
  // Refresh
  try{
    const {data, error} = await sb.functions.invoke('strava-oauth', {body:{action:'refresh', refresh_token:tok.refresh_token}});
    if(error || !data || !data.access_token){
      console.error('Strava refresh failed:', error||data);
      return null;
    }
    tok.access_token = data.access_token;
    tok.refresh_token = data.refresh_token || tok.refresh_token;
    tok.expires_at = data.expires_at;
    ls('totry_strava_token', tok);
    return tok.access_token;
  }catch(e){
    console.error('Strava refresh error:', e);
    return null;
  }
}

// Fetch recent Strava activities and import them
// Parse a Hevy workout description (pushed Hevy→Strava) into structured exercises+sets.
// This is the free-tier bypass of the gated Hevy Pro API: Strava carries the full session text,
// e.g.  "Romanian Deadlift (Dumbbell)\nSet 1: 49.89 kg x 12 @ 8.5 rpe\nSet 2: 54.42 kg x 12..."
// We turn that back into the same {name, sets:[{weight,reps}]} shape a Hevy import produces.
function parseHevyDescription(desc){
  if(!desc || typeof desc !== 'string') return null;
  const lines = desc.split(/\r?\n/).map(l => l.trim());
  const exercises = [];
  let cur = null;
  const setRe = /^set\s*\d+\s*:?\s*(.+)$/i;
  for(const line of lines){
    if(!line) continue;
    if(/logged with hevy|hevyapp\.com/i.test(line)) continue;
    const sm = line.match(setRe);
    if(sm){
      // A set line. Extract weight, reps, distance/time where present.
      const body = sm[1];
      let weight='', reps='', dist='';
      const wkg = body.match(/([\d.]+)\s*kg/i);          if(wkg) weight = parseFloat(wkg[1]);
      const wlb = body.match(/([\d.]+)\s*lb/i);          if(!wkg && wlb) weight = Math.round(parseFloat(wlb[1])*0.453592*100)/100;
      const rp  = body.match(/x\s*([\d.]+)(?:\s|$|@)/i) || body.match(/([\d.]+)\s*reps/i); if(rp) reps = parseInt(rp[1]);
      const dm  = body.match(/([\d.]+)\s*m\b/i);          if(dm && !rp) dist = parseFloat(dm[1]);
      if(cur){ cur.sets.push({ weight: weight===''?'':weight, reps: reps===''?'':reps, dist: dist||'', type:'normal', done:true }); }
    } else {
      // An exercise name line (anything that isn't a set). Start a new exercise.
      if(cur && cur.sets.length) exercises.push(cur);
      cur = { name: line.replace(/\s*\(.*?\)\s*$/, m=>m).trim(), bodyPart:'', equipment:'', sets:[] };
    }
  }
  if(cur && cur.sets.length) exercises.push(cur);
  return exercises.length ? exercises : null;
}

async function syncStravaActivities(){
  const token = await getStravaToken();
  if(!token){ if(typeof showToast==='function') showToast('Strava not connected','Connect Strava first in Settings \u2192 Connected apps.'); return; }
  try{
    const {data, error} = await sb.functions.invoke('strava-oauth', {body:{action:'activities', access_token:token, per_page:30}});
    if(error || !Array.isArray(data)){
      console.error('Strava activities error:', error||data);
      if(typeof showToast==='function') showToast('Strava sync failed', (error && error.message) ? error.message : 'Could not reach Strava. Try again in a moment.');
      return;
    }
    // Store imported activities
    const existing = ls('totry_strava_activities') || [];
    const existingIds = new Set(existing.map(a=>a.id));
    let added = 0;
    data.forEach(act=>{
      if(existingIds.has(act.id)) return;
      existing.unshift({
        id: act.id,
        name: act.name,
        type: act.type,
        distance: act.distance,
        moving_time: act.moving_time,
        elapsed_time: act.elapsed_time || null,
        date: act.start_date_local,
        calories: act.calories || act.kilojoules ? (act.calories || Math.round((act.kilojoules||0)*0.239)) : null,
        // The performance layer Strava captures that Hevy doesn't — feeds the coach + readiness.
        avg_hr: act.average_heartrate || null,
        max_hr: act.max_heartrate || null,
        avg_watts: act.average_watts || null,
        suffer_score: act.suffer_score || null,
        elevation: act.total_elevation_gain || null,
        device: act.device_name || null,
        // Description carries Hevy's per-set detail when a Hevy session is pushed Hevy→Strava —
        // the free-tier bypass of the gated Hevy Pro API. Parsed downstream into structured sets.
        description: act.description || null,
        manufacturer: (act.device_name||'').toLowerCase().includes('hevy') || (act.description||'').toLowerCase().includes('hevyapp') ? 'hevy' : null
      });
      added++;
    });
    // BYPASS: any synced Strava activity that's actually a Hevy session (pushed Hevy→Strava) with a
    // parseable description → turn it into a structured strength workout in totry_workouts, so free
    // Hevy users get full set detail WITHOUT the Hevy Pro API. Stable id avoids re-sync duplicates.
    try{
      const wkts = ls('totry_workouts') || [];
      const haveIds = new Set(wkts.map(w => String(w.id)));
      let convertedAny = false;
      existing.forEach(a => {
        if(a.manufacturer !== 'hevy' || !a.description) return;
        const wid = 'stravahevy_' + a.id;
        if(haveIds.has(wid)) return;
        const parsed = parseHevyDescription(a.description);
        if(!parsed) return;
        const totalSets = parsed.reduce((n,ex)=>n+ex.sets.length, 0);
        const volume = parsed.reduce((v,ex)=> v + ex.sets.reduce((s,st)=> s + ((parseFloat(st.weight)||0) * (parseInt(st.reps)||0)), 0), 0);
        wkts.unshift({
          id: wid, source:'hevy', via:'strava',
          splitFocus: a.name || 'Workout', type: a.name || 'Weight Training',
          ts: a.date, exercises: parsed,
          completedSets: totalSets, totalSets, volume: Math.round(volume),
          durationMin: a.moving_time ? Math.round(a.moving_time/60) : (a.elapsed_time?Math.round(a.elapsed_time/60):null),
          calories: a.calories || null, averageHeartRate: a.avg_hr || null
        });
        haveIds.add(wid); convertedAny = true;
      });
      if(convertedAny){ ls('totry_workouts', _capWorkouts(wkts)); }
    }catch(_){ /* best-effort; raw Strava activity still shows regardless */ }
    const saved = existing.slice(0,100);
    ls('totry_strava_activities', saved);
    // Feed the calorie loop: sum each day's Strava calories into the burns ledger that the
    // Nourish net-calorie math reads. Keyed by the app's local date string. Strava-sourced
    // burns are tracked separately so re-syncs replace (not double-count) them.
    try{
      const freshByDay = {};
      saved.forEach(a => {
        if(!a.date) return;
        // A session that came from the lifting app is already counted once via the workout ledger
        // (either its direct import or its converted copy). Counting it here too inflated "Burned"
        // in Nourish for every pushed session — the net-calorie math was wrong all day because of it.
        if(a.manufacturer === 'hevy') return;
        let cals = a.calories;
        // Strava's activity LIST endpoint often omits calories (only the detail endpoint has them).
        // Until the edge function fetches detail, estimate from HR + duration so "Burned" isn't 0.
        // Formula: a reasonable kcal/min from avg HR (falls back to a moderate rate by activity type).
        if(!cals){
          const mins = a.moving_time ? a.moving_time/60 : (a.elapsed_time ? a.elapsed_time/60 : 0);
          if(mins > 0){
            let perMin = 6; // moderate default
            if(a.avg_hr){ perMin = Math.max(4, Math.min(16, (a.avg_hr - 60) / 8)); } // ~HR-scaled
            else { const ty=(a.type||'').toLowerCase(); if(/run/.test(ty)) perMin=11; else if(/ride|cycl/.test(ty)) perMin=8; else if(/walk/.test(ty)) perMin=4; else if(/weight|strength/.test(ty)) perMin=5; }
            cals = Math.round(mins * perMin);
            a._estimatedCal = true; // mark it so the UI can show "~"
          }
        }
        if(!cals) return;
        const dk = new Date(a.date).toLocaleDateString('en-AU');
        freshByDay[dk] = (freshByDay[dk]||0) + Math.round(cals);
      });
      // Write only the Strava sub-ledger; reconcileBurns() folds it into the aggregate (single
      // source of truth), so re-syncs replace rather than double-count.
      ls('totry_strava_burns_byday', freshByDay);
      reconcileBurns();
    }catch(_){ }
    // Auto-tick gym habit if there's an activity today
    if(added > 0){
      const today = new Date().toDateString();
      const hasToday = data.some(a => new Date(a.start_date_local).toDateString() === today);
      if(hasToday){
        loadH();
        const gymHabit = habits.findIndex(h => /gym|train|workout|exercise|move/i.test(h.n));
        if(gymHabit >= 0){
          habits[gymHabit].d[tIdx()] = 1;
          saveH();
        }
      }
      showToast('Strava synced', added + ' new activit'+(added===1?'y':'ies')+' imported.');
      ls('totry_strava_last', {ts: Date.now(), count: added});
    } else {
      const total = saved.length;
      if(typeof showToast==='function') showToast('Strava up to date', total ? 'No new activities since last sync.' : 'Connected, but no activities found on Strava yet. Record one and sync again.');
    }
    if(typeof renderUnifiedTraining==='function') renderUnifiedTraining();
    updateStravaBtn();
  }catch(e){
    console.error('Strava sync error:', e);
  }
}

