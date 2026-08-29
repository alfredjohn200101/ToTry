// ─── GOOGLE HEALTH / FITNESS OAUTH ───────────────────────────
const GOOGLE_CLIENT_ID = '785983553382-97flumrmh3i1mk6cd4avb0n214jt7npu.apps.googleusercontent.com';
const GOOGLE_REDIRECT_URI = window.location.origin + window.location.pathname;
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.location.read';

function offerGoogleHealthConnect(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
      '<div style="width:40px;height:40px;border-radius:8px;background:#34A853;display:flex;align-items:center;justify-content:center;font-size:18px">\u2764\uFE0F</div>' +
      '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Connect Google Health</div><div style="font-size:11px;color:var(--tx3)">Steps, activity & Fitbit data</div></div>' +
    '</div>' +
    '<p style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:14px">Syncs your daily steps and workouts from Google Fit and Fitbit devices. Counts toward your movement habits automatically.</p>' +
    '<button class="btn primary" onclick="startGoogleHealthOAuth()" style="margin-bottom:8px">Connect with Google</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>' +
    '</div>';
  document.body.appendChild(m);
}

function startGoogleHealthOAuth(){
  const state = 'gh_' + Math.random().toString(36).slice(2);
  localStorage.setItem('totry_google_oauth_state', state);
  const url = 'https://accounts.google.com/o/oauth2/v2/auth' +
    '?client_id=' + encodeURIComponent(GOOGLE_CLIENT_ID) +
    '&redirect_uri=' + encodeURIComponent(GOOGLE_REDIRECT_URI) +
    '&response_type=code' +
    '&scope=' + encodeURIComponent(GOOGLE_SCOPES) +
    '&access_type=offline' +
    '&prompt=consent' +
    '&state=' + state;
  window.location.href = url;
}

async function handleGoogleHealthCallback(){
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const scope = params.get('scope');
  if(!code) return;
  // Only handle if this is a Google callback (fitness scope)
  if(!scope || !scope.includes('fitness')) return;
  const expectedState = localStorage.getItem('totry_google_oauth_state');
  if(state && state !== expectedState){
    showToast('Auth error', 'Google connection failed. Try again.');
    return;
  }
  showToast('Connecting Google', 'Exchanging tokens...');
  try{
    const {data, error} = await sb.functions.invoke('google-health-auth', {body:{action:'exchange', code:code, redirect_uri:GOOGLE_REDIRECT_URI}});
    if(error || !data || data.error){
      console.error('Google exchange error:', error||data);
      showToast('Google failed', 'Could not connect. Try again from Settings.');
      window.history.replaceState({}, '', GOOGLE_REDIRECT_URI);
      return;
    }
    ls('totry_google_token', {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in||3600)*1000
    });
    window.history.replaceState({}, '', GOOGLE_REDIRECT_URI);
    showToast('Google connected', 'Pulling your activity data...');
    haptic('celebrate');
    setTimeout(()=>syncGoogleHealth(), 1000);
  }catch(e){
    console.error('Google callback error:', e);
    showToast('Google failed', 'Connection error. Try later.');
    window.history.replaceState({}, '', GOOGLE_REDIRECT_URI);
  }
}

async function getGoogleToken(){
  const tok = ls('totry_google_token');
  if(!tok || !tok.access_token) return null;
  if(tok.expires_at && tok.expires_at > Date.now() + 60000){
    return tok.access_token;
  }
  try{
    const {data, error} = await sb.functions.invoke('google-health-auth', {body:{action:'refresh', refresh_token:tok.refresh_token}});
    if(error || !data || !data.access_token) return null;
    tok.access_token = data.access_token;
    tok.expires_at = Date.now() + (data.expires_in||3600)*1000;
    ls('totry_google_token', tok);
    return tok.access_token;
  }catch(e){ return null; }
}

async function syncGoogleHealth(){
  const token = await getGoogleToken();
  // A Google refresh token stops working for ordinary reasons — the person changed their password,
  // revoked app access, or the grant expired. This returned in silence right after telling them
  // "Refreshing your Google connection", so the connection looked live forever while nothing synced
  // and no step data ever arrived. Tell them, and say what fixes it.
  if(!token){
    if(typeof showToast === 'function') showToast('Google needs reconnecting',
      'Your Google Health connection expired. Settings \u2192 Connected apps \u2192 reconnect.');
    return;
  }
  try{
    const {data, error} = await sb.functions.invoke('google-health-auth', {body:{action:'steps', access_token:token, days:7}});
    if(error || !data || !data.bucket){
      console.error('Google steps error:', error||data);
      // Also silent before. An honest app says when a sync it announced did not happen.
      if(typeof showToast === 'function') showToast('Google sync failed',
        'Could not read your steps just now. Your own logged data is untouched.');
      return;
    }
    // Parse step buckets
    const stepDays = [];
    data.bucket.forEach(b=>{
      let steps = 0;
      if(b.dataset && b.dataset[0] && b.dataset[0].point){
        b.dataset[0].point.forEach(p=>{
          if(p.value && p.value[0]) steps += p.value[0].intVal || 0;
        });
      }
      stepDays.push({date:new Date(parseInt(b.startTimeMillis)).toDateString(), ms:parseInt(b.startTimeMillis), steps});
    });
    ls('totry_google_steps', stepDays);
    // SEVEN DAYS ARE FETCHED AND ONLY TODAY WAS EVER USED. The other six went into
    // totry_google_steps, which nothing read back — so a person who connected Google Health on a
    // Friday watched Friday's steps appear and the week they had actually walked stay blank. The
    // integration reported success and delivered a seventh of what it had in hand.
    // Backfilled into the same trackers store the Track tab reads, and never over a number the
    // person entered themselves: that one is theirs, and a sync has no business replacing it.
    // Today is the deliberate exception below — a live device count beats a manual estimate for the
    // day still in progress.
    try{
      const tr = ls('totry_trackers') || {};
      let filled = 0;
      stepDays.forEach(function(d){
        if(!d.ms || !(d.steps > 0)) return;
        const k = new Date(d.ms).toLocaleDateString('en-AU');
        if(!tr[k]) tr[k] = { water:0, sleep:0, steps:0 };
        if(!(tr[k].steps > 0)){ tr[k].steps = d.steps; filled++; }
      });
      if(filled) ls('totry_trackers', tr);
    }catch(_){}
    // Today's steps
    const today = stepDays.find(d=>d.date===new Date().toDateString());
    if(today && today.steps > 0){
      ls('totry_today_steps', today.steps);
      // Mirror into the daily trackers store the Track tab reads, so synced steps show there too.
      try{ const _tr=ls('totry_trackers')||{}; const _dk=new Date().toLocaleDateString('en-AU'); if(!_tr[_dk])_tr[_dk]={water:0,sleep:0,steps:0}; _tr[_dk].steps=today.steps; ls('totry_trackers',_tr); }catch(_){}
    }
    showToast('Google synced', 'Activity data updated.');
  }catch(e){
    console.error('Google sync error:', e);
  }
}

// HEVY API - Pro tier required
function offerHevyConnect(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
      '<div style="width:40px;height:40px;border-radius:8px;background:#1C1C3A;display:flex;align-items:center;justify-content:center;font-size:18px">\u{1F4AA}</div>' +
      '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Connect Hevy</div><div style="font-size:11px;color:var(--tx3)">Import your workouts automatically</div></div>' +
    '</div>' +
    '<p style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:14px">Hevy API access requires <strong style="color:var(--go)">Hevy Pro</strong>. Get your API key at <span style="color:var(--go)">hevy.com/settings?developer</span> and paste it below.</p>' +
    '<input type="text" id="hevy-key-input" placeholder="Paste your Hevy API key..." style="margin-bottom:10px;font-family:DM Mono,monospace;font-size:16px">' +
    '<button class="btn primary" onclick="saveHevyKey()" style="margin-bottom:8px">Save and connect</button>' +
    '<div style="display:flex;align-items:center;gap:8px;margin:12px 0"><div style="flex:1;height:1px;background:var(--bd)"></div><span style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em">or</span><div style="flex:1;height:1px;background:var(--bd)"></div></div>' +
    '<p style="font-size:12px;color:var(--tx3);line-height:1.55;margin-bottom:8px">No Pro? Import your full history from a Hevy CSV export instead (Hevy app → Settings → Export Data).</p>' +
    '<input type="file" id="hevy-csv-input" accept=".csv,text/csv" style="display:none" onchange="importHevyCSV(event)">' +
    '<button class="btn" onclick="document.getElementById(\'hevy-csv-input\').click()" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">📄 Import Hevy CSV</button>' +
    '<button class="btn" onclick="closeModal(this);openLinkedAppDirect(\'hevy\')" style="margin-bottom:8px">Just open Hevy</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>' +
    '</div>';
  document.body.appendChild(m);
}


function openLinkedAppDirect(appId){
  document.querySelector('.modal-bg.open')?.remove();
  const app = APP_REGISTRY[appId];
  if(!app) return;
  if(app.scheme) window.location.href = app.scheme;
  else if(app.web) window.open(app.web, '_blank');
}

function removeLinkedApp(appId){
  const used = ls('totry_apps_used') || [];
  const filtered = used.filter(a => a !== appId);
  ls('totry_apps_used', filtered);
  renderConnectedApps();
  showToast('Removed', APP_REGISTRY[appId]?.name+' unlinked.');
}

function showAddAppPicker(){
  const used = ls('totry_apps_used') || [];
  // Don't offer Strava to anyone who isn't on the approved allowlist — otherwise they'd hit the
  // "invite-only" wall, which reads to an App Store reviewer like a broken/placeholder feature.
  const stravaOk = (typeof isStravaApproved==='function') && isStravaApproved();
  const available = Object.entries(APP_REGISTRY)
    .filter(([id]) => !used.includes(id))
    .filter(([id]) => id !== 'strava' || stravaOk)
    // Google Health cannot work in the iOS shell at all: GOOGLE_REDIRECT_URI becomes
    // capacitor://localhost/, which a Google web client rejects outright (redirect_uri_mismatch), and
    // Capacitor hands accounts.google.com to Safari with no route back into the app. So it was a
    // guaranteed error page sitting next to Apple Health, which already covers iOS — a visibly broken
    // advertised integration (Guideline 2.1). Still offered on the web, where it works.
    .filter(([id]) => id !== 'googlehealth' || !(typeof isNativeApp==='function' && isNativeApp()));
  
  if(available.length === 0){
    showToast('All linked','You\'re using all the apps we support.');
    return;
  }
  
  // Group by category
  const byCategory = {};
  available.forEach(([id, app]) => {
    if(!byCategory[app.category]) byCategory[app.category] = [];
    byCategory[app.category].push([id, app]);
  });
  
  let modalHtml = '<div class="modal-handle"></div>';
  modalHtml += '<div style="font-size:16px;font-weight:500;color:var(--tx);margin-bottom:14px">Add an app to link</div>';
  
  Object.entries(byCategory).forEach(([cat, apps]) => {
    modalHtml += '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;margin-top:10px">'+cat+'</div>';
    apps.forEach(([id, app]) => {
      modalHtml += '<button class="btn" style="text-align:left;margin-bottom:6px;padding:10px 12px;display:flex;align-items:center;gap:10px" onclick="addLinkedApp(\''+id+'\')">'+
        '<div style="width:32px;height:32px;border-radius:8px;background:'+app.color+';display:flex;align-items:center;justify-content:center;font-size:16px">'+app.icon+'</div>'+
        '<div style="font-size:13px">'+app.name+'</div>'+
        '</button>';
    });
  });
  modalHtml += '<button class="btn" onclick="closeModal(this)" style="margin-top:10px">Cancel</button>';
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">'+modalHtml+'</div>';
  document.body.appendChild(m);
}

function addLinkedApp(appId){
  const used = ls('totry_apps_used') || [];
  if(!used.includes(appId)){
    used.push(appId);
    ls('totry_apps_used', used);
  }
  document.querySelector('.modal-bg.open')?.remove();
  renderConnectedApps();
  // For apps that need authentication, launch their connect flow straight away
  // instead of just adding a dead row the user then has to figure out.
  if(appId === 'hevy'){
    if(!ls('totry_hevy_api_key')) { offerHevyConnect(); return; }
    manageHevyConnection(); return;
  }
  if(appId === 'strava'){
    if(!ls('totry_strava_token')) { offerStravaConnect(); return; }
  }
  if(appId === 'googlehealth' || appId === 'googlefit' || appId === 'fitbit'){
    if(!ls('totry_google_token')) { offerGoogleHealthConnect(); return; }
  }
  showToast('Linked', APP_REGISTRY[appId]?.name+' added.');
}

// (Removed showHevyInstructions — a dead, never-called second Hevy modal that duplicated the
//  hevy-key-input field. offerHevyConnect() is the single Hevy connect flow.)

// Management panel for an already-connected Hevy account: sync now, change key, disconnect.
function manageStravaConnection(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
      '<div style="width:40px;height:40px;border-radius:8px;background:#FC4C02;display:flex;align-items:center;justify-content:center;font-size:18px">\u{1F6B4}</div>' +
      '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Strava connected</div><div style="font-size:11px;color:var(--gr)">✓ syncing your activities</div></div>' +
    '</div>' +
    '<button class="btn primary" onclick="document.querySelector(&apos;.modal-bg.open&apos;)?.remove();if(typeof syncStravaActivities===&apos;function&apos;){showToast(&apos;Syncing&apos;,&apos;Pulling recent activities...&apos;);syncStravaActivities();}" style="margin-bottom:8px">↻ Sync now</button>' +
    '<button class="btn" onclick="window.open(&apos;https://www.strava.com&apos;,&apos;_blank&apos;)" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">Open Strava app</button>' +
    '<button class="btn" onclick="disconnectStrava()" style="margin-bottom:8px;background:var(--re-bg);border:1px solid var(--re-bd);color:var(--re)">Disconnect Strava</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}
function disconnectStrava(){
  localStorage.removeItem('totry_strava_token');
  if(typeof syncToCloud === 'function') syncToCloud('totry_strava_token', null);
  document.querySelector('.modal-bg.open')?.remove();
  showToast('Strava disconnected', 'Reconnect anytime from Settings.');
  if(typeof renderConnectedApps === 'function') renderConnectedApps();
}

function manageHevyConnection(){
  const tier = ls('totry_hevy_tier') || 'pro';
  const workouts = (ls('totry_workouts') || []).filter(w => w.source === 'hevy' || w.source === 'hevy-csv');
  const lastSynced = ls('totry_hevy_synced_once');
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
      '<div style="width:40px;height:40px;border-radius:8px;background:#1C1C3A;display:flex;align-items:center;justify-content:center;font-size:18px">\u{1F4AA}</div>' +
      '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Hevy connected</div><div style="font-size:11px;color:var(--gr)">✓ ' + workouts.length + ' workout' + (workouts.length===1?'':'s') + ' imported</div></div>' +
    '</div>' +
    '<button class="btn primary" onclick="document.querySelector(&apos;.modal-bg.open&apos;)?.remove();showToast(&apos;Syncing&apos;,&apos;Pulling your latest Hevy workouts...&apos;);setTimeout(()=>syncHevyWorkouts(),300)" style="margin-bottom:8px">↻ Sync workouts now</button>' +
    '<button class="btn" onclick="importHevyRoutines()" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">⬇ Import my Hevy routines</button>' +
    '<button class="btn" onclick="document.querySelector(&apos;.modal-bg.open&apos;)?.remove();showToast(&apos;Loading&apos;,&apos;Pulling your Hevy routines...&apos;);setTimeout(()=>fetchHevyRoutines(),300)" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">⬇ Load my Hevy routines</button>' +
    '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd);border-radius:var(--r);cursor:pointer"><input type="checkbox" id="hevy-bw-toggle" ' + (ls('totry_bw_volume')?'checked':'') + ' onchange="ls(&apos;totry_bw_volume&apos;,this.checked); showToast(&apos;Saved&apos;, this.checked?&apos;Bodyweight now counts in volume (matches Hevy).&apos;:&apos;Volume counts external load only.&apos;); if(typeof renderUnifiedTraining===&apos;function&apos;)renderUnifiedTraining();" style="width:18px;height:18px;flex-shrink:0"><span style="font-size:12px;color:var(--tx2);line-height:1.4">Count bodyweight in volume for pull-ups, dips, etc. <span style="color:var(--tx3)">(matches how Hevy totals volume)</span></span></label>' +
    '<button class="btn" onclick="openPushRoutineToHevy()" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">⬆ Push a routine to Hevy</button>' +
    '<button class="btn" onclick="pushLastWorkoutToHevy()" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">⬆ Log my last ToTry workout to Hevy</button>' +
    '<div style="height:1px;background:var(--bd);margin:6px 0"></div>' +
    '<button class="btn" onclick="changeHevyKey()" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">Change API key</button>' +
    '<button class="btn" onclick="disconnectHevy()" style="margin-bottom:8px;background:var(--re-bg);border:1px solid var(--re-bd);color:var(--re)">Disconnect Hevy</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}
function changeHevyKey(){
  // Clearing the key sends them back through the connect flow (used after rotating the key)
  document.querySelector('.modal-bg.open')?.remove();
  offerHevyConnect();
}
function disconnectHevy(){
  localStorage.removeItem('totry_hevy_api_key');
  localStorage.removeItem('totry_hevy_synced_once');
  if(typeof syncToCloud === 'function'){ syncToCloud('totry_hevy_api_key', null); syncToCloud('totry_hevy_synced_once', null); }
  const used = (ls('totry_apps_used') || []).filter(a => a !== 'hevy');
  ls('totry_apps_used', used);
  document.querySelector('.modal-bg.open')?.remove();
  showToast('Hevy disconnected', 'Your imported workouts stay. Reconnect anytime.');
  if(typeof renderConnectedApps === 'function') renderConnectedApps();
}

