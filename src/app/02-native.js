
// ─── NOTIFICATIONS ─────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════════════════════
// NATIVE WRAPPER READINESS LAYER
// To Try ships now as a PWA. But iOS PWAs can't do reliable background push — which is exactly what
// "the sibling reaching out first at the right moment" needs. So this layer abstracts notifications
// behind ONE interface that:
//   • detects if we're running inside a native wrapper (Capacitor) — window.Capacitor is present
//   • if native: routes through the LocalNotifications / PushNotifications plugin (real background
//     delivery, scheduled nudges that fire even when the app is closed)
//   • if web/PWA: falls back to the Notification API (works while installed, best-effort)
// This means the codebase is READY: wrap it with Capacitor later and native push lights up with NO
// rewrite. Nothing here breaks the PWA today; it just prefers native when native exists.
// ════════════════════════════════════════════════════════════════════════════════════════════
const Notify = {
  // Is a native wrapper present? (Capacitor injects window.Capacitor.)
  isNative(){ try{ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }catch(_){ return false; } },
  // The LocalNotifications plugin, if available (Capacitor community/official plugin).
  _local(){ try{ return window.Capacitor?.Plugins?.LocalNotifications || null; }catch(_){ return null; } },
  _push(){ try{ return window.Capacitor?.Plugins?.PushNotifications || null; }catch(_){ return null; } },
  _splash(){ try{ return window.Capacitor?.Plugins?.SplashScreen || null; }catch(_){ return null; } },

  // HOLD THE LAUNCH SCREEN UNTIL THERE IS SOMETHING TO SEE.
  //
  // iOS drops the launch storyboard the moment the process is up, and the WKWebView behind it has not
  // painted yet — so the app opened onto a BLACK screen for about 2.8 seconds on a release build
  // (measured on an iPhone 17 simulator, 18 Aug 2026; a debug build took far longer, which is what
  // made this look worse than it is). Nearly three seconds of black on launch reads as a crash, and
  // it is the first thing an App Store reviewer sees.
  //
  // launchAutoHide is false in capacitor.config.json, so the splash stays up until this is called.
  // That makes hiding it OUR responsibility, and a splash that never hides is an app that never
  // opens — so this is called from the first screen paint AND from a hard timeout, and it is safe to
  // call twice. On the web it is a no-op.
  hideSplash(){
    try{
      const sp = this._splash();
      if(sp && typeof sp.hide === 'function') sp.hide({ fadeOutDuration: 220 });
    }catch(_){ }
  },

  // Request permission through whichever channel is real. Returns a Promise<boolean>.
  async requestPermission(){
    try{
      if(this.isNative()){
        const L = this._local();
        if(L && L.requestPermissions){ const r = await L.requestPermissions(); return r && (r.display === 'granted' || r.display === 'prompt-with-rationale' || r.granted); }
        const P = this._push();
        if(P && P.requestPermissions){ const r = await P.requestPermissions(); return r && r.receive === 'granted'; }
      }
      if('Notification' in window){ const p = await Notification.requestPermission(); return p === 'granted'; }
    }catch(_){}
    return false;
  },

  // Schedule a local nudge. On native this fires even when the app is CLOSED (the real unlock).
  // On web it's best-effort while installed. `when` is a Date; id keeps schedules idempotent.
  // `extra` carries the tap route, exactly as scheduleDaily does. Without it the reach-out — the
  // quiet knock before a person's hardest hour, and the whole reason the native wrapper exists —
  // opened wherever the app was last left instead of the Feeling Door. It also made
  // _reachOutResponded() unreachable, so the strongest receptivity signal there is never fired and
  // someone who tapped the notification was scored as having ignored it.
  async schedule(id, title, body, when, extra){
    try{
      if(this.isNative()){
        const L = this._local();
        if(L && L.schedule){
          await L.schedule({ notifications: [{ id: (typeof id==='number'?id:Math.abs(_hashId(id))), title, body, schedule: { at: when, allowWhileIdle: true }, extra: extra || null, smallIcon: 'ic_stat_icon', }] });
          return true;
        }
      }
      // Web fallback: we can't truly background-schedule; record intent so app-open delivery works.
      const pend = ls('totry_notif_pending') || [];
      pend.push({ id, title, body, at: when instanceof Date ? when.getTime() : when });
      ls('totry_notif_pending', pend);
      return false;
    }catch(_){ return false; }
  },

  // Show something right now (in-the-moment).
  async now(title, body){
    try{
      if(this.isNative()){
        const L = this._local();
        if(L && L.schedule){ await L.schedule({ notifications: [{ id: Date.now()%100000, title, body, schedule:{ at: new Date(Date.now()+500) } }] }); return true; }
      }
      if('Notification' in window && Notification.permission === 'granted'){ new Notification(title, { body, icon:'icon-192.png', badge:'icon-192.png' }); return true; }
    }catch(_){}
    return false;
  },

  // Cancel a scheduled nudge by id (native only; web pending is filtered on delivery).
  async cancel(id){
    try{ if(this.isNative()){ const L=this._local(); if(L&&L.cancel){ await L.cancel({ notifications:[{ id:(typeof id==='number'?id:Math.abs(_hashId(id))) }] }); } } }catch(_){}
  },

  // Schedule a nudge that fires EVERY DAY at hour:minute, even when the app is closed. This is the
  // real "reach out first" unlock — only possible once wrapped natively (Capacitor's repeating
  // `on:{hour,minute}` schedule). On the web PWA it records intent (web can't background-repeat),
  // so nothing breaks; wrapping the app lights it up with zero code change. Idempotent per id.
  async scheduleDaily(id, title, body, hour, minute, extra){
    const nid = (typeof id==='number' ? id : Math.abs(_hashId(id)));
    try{
      if(this.isNative()){
        const L = this._local();
        if(L && L.schedule){
          try{ await L.cancel({ notifications:[{ id:nid }] }); }catch(_){}
          // `extra` carries where a TAP should take them (handled by _initNotificationTaps), so a
          // reach-out opens the companion and a morning nudge opens the ritual — not just the app.
          await L.schedule({ notifications:[{ id:nid, title, body, schedule:{ on:{ hour:hour, minute:minute }, allowWhileIdle:true }, smallIcon:'ic_stat_icon', extra: extra||null }] });
          return true;
        }
      }
      // Web: record the intent so it's visible and ready to migrate when wrapped.
      const daily = ls('totry_notif_daily') || [];
      const i = daily.findIndex(x=>x.id===id);
      const rec = { id, title, body, hour, minute };
      if(i>=0) daily[i]=rec; else daily.push(rec);
      ls('totry_notif_daily', daily.slice(0,20));
      return false;
    }catch(_){ return false; }
  }
};

// ── APPLE HEALTH (HealthKit) — real device activity, native only ──────────────────────────────────
// Reads today's steps + active energy from Apple Health (capacitor-health, Cap 8) and folds them into
// the app's SINGLE-SOURCE stores: steps → totry_today_steps + trackers (coach + Track), active energy
// → the watch sub-ledger of the burn ledger (whole-day active energy that supersedes manual entry).
// On web / no plugin every method is a safe no-op, so nothing changes there. This is real device data
// the PWA could never get — the first step toward Track being genuinely recovery-grade.
const Health = {
  // THE PLUGIN IS CALLED HealthPlugin, NOT Health.
  //
  // capacitor-health registers itself as 'HealthPlugin' — `registerPlugin('HealthPlugin')` in its JS and
  // `jsName = "HealthPlugin"` in its Swift. This looked up Capacitor.Plugins.Health, which is undefined,
  // so _p() returned null and EVERY health call short-circuited: available() was false, connect() returned
  // "This build has no Apple Health plugin", and the whole automatic side — steps, active energy, workouts,
  // heart rate, mindful minutes — had never once worked in the native build. Nothing surfaced it because
  // the failure path is a polite toast, and on the web the card correctly hides itself instead.
  //
  // Found by printing Object.keys(Capacitor.Plugins) onto the screen in a throwaway build and reading it
  // off a screenshot; the registry said HealthPlugin while the code asked for Health.
  //
  // Resolved by name-list rather than a single key, because this is a mismatch no test caught and the
  // plugin could rename again on a major version.
  _p(){
    try{
      const P = (window.Capacitor && window.Capacitor.Plugins) || {};
      return P.HealthPlugin || P.Health || null;
    }catch(_){ return null; }
  },
  isNative(){ try{ return !!(window.Capacitor && (window.Capacitor.isNativePlatform ? window.Capacitor.isNativePlatform() : (window.Capacitor.getPlatform && window.Capacitor.getPlatform()!=='web'))); }catch(_){ return false; } },
  async available(){ const p=this._p(); if(!p) return false; try{ const r=await p.isHealthAvailable(); return !!(r && r.available); }catch(_){ return false; } },
  connected(){ try{ return !!ls('totry_health_connected'); }catch(_){ return false; } },
  // Ask for read permission (steps, active energy, workouts, heart rate) then pull today's data.
  async connect(){
    const p=this._p(); if(!p) return { ok:false, reason:'This build has no Apple Health plugin.' };
    try{
      if(!(await this.available())) return { ok:false, reason:'Apple Health isn’t available on this device.' };
      const perms=['READ_STEPS','READ_ACTIVE_CALORIES','READ_WORKOUTS','READ_HEART_RATE'];
      // Mindfulness read is iOS-only for now — the plugin maps it on HealthKit but not yet on Android
      // Health Connect, so we don't request an unsupported permission there (the read degrades to no-op).
      try{ if(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()==='ios') perms.push('READ_MINDFULNESS'); }catch(_){}
      await p.requestHealthPermissions({ permissions:perms });
      // Sleep lives in a separate native plugin because capacitor-health cannot read it. Ask in the same
      // breath so the person sees one connect journey, not two.
      try{ const sp=this._sleepP(); if(sp && sp.requestAuthorization) await sp.requestAuthorization(); }catch(_){}
      // CONNECTED MEANS DATA CAME BACK. This was written straight after requestHealthPermissions(),
      // which resolves whether the person granted or DENIED — iOS does not reject on denial, it just
      // returns nothing. So tapping "Don't Allow" left the card saying connected, promising automatic
      // syncing forever, syncing nothing, and giving the person no reason to suspect a thing.
      const synced = await this.syncToday();
      const gotSomething = !!(synced && Object.keys(synced).some(k => {
        const v = synced[k]; return typeof v === 'number' ? v > 0 : (v != null && v !== false);
      }));
      try{ ls('totry_health_connected', gotSomething); }catch(_){}
      if(!gotSomething){
        return { ok:false, reason:'no-permission',
                 message:'Apple Health did not share anything. If you tapped "Don\u2019t Allow", open Settings \u2192 Health \u2192 Data Access & Devices \u2192 To Try and turn on what you want me to see.' };
      }
      try{ synced && (synced.workouts = await this.syncWorkouts(30)); }catch(_){}   // 30 days on first connect
      try{ synced && (synced.sleepNights = await this.syncSleep(30)); }catch(_){}
      return { ok:true, synced };
    }catch(e){ return { ok:false, reason:String(e && e.message || e) }; }
  },
  // Pull today's steps + active energy and fold them into the single-source stores. Safe to call often.
  async syncToday(){
    const p=this._p(); if(!p) return null;
    try{
      const now=new Date(); const start=new Date(now); start.setHours(0,0,0,0);
      const iso=(d)=>d.toISOString();
      const sum=async(dataType)=>{ try{ const r=await p.queryAggregated({ startDate:iso(start), endDate:iso(now), dataType, bucket:'day' }); const arr=(r&&r.aggregatedData)||[]; return arr.reduce((s,x)=>s+(x.value||0),0); }catch(_){ return null; } };
      const steps=await sum('steps');
      const active=await sum('active-calories');
      const auKey=now.toLocaleDateString('en-AU');
      if(steps!=null && steps>0){ try{ ls('totry_today_steps', Math.round(steps)); const tr=ls('totry_trackers')||{}; if(!tr[auKey])tr[auKey]={water:0,sleep:0,steps:0}; tr[auKey].steps=Math.round(steps); ls('totry_trackers',tr); if(typeof updateTrackerDisplay==='function') updateTrackerDisplay(); }catch(_){} }
      if(active!=null && active>0){ try{ const w=ls('totry_watch_burns_byday')||{}; w[auKey]=Math.round(active); ls('totry_watch_burns_byday',w); if(typeof reconcileBurns==='function') reconcileBurns(); if(typeof renderNutritionLog==='function') renderNutritionLog(); }catch(_){} }
      // Mindful minutes — read the SHARED Apple Health ledger (Watch Breathe/Reflect, Calm, Headspace,
      // us — any source), so the whole-person view knows the stillness is happening, wherever it comes
      // from. We build on what exists rather than siloing our own count.
      let mindfulWk=null;
      try{
        const wkStart=new Date(now); wkStart.setDate(wkStart.getDate()-6); wkStart.setHours(0,0,0,0);
        const mr=await p.queryAggregated({ startDate:iso(wkStart), endDate:iso(now), dataType:'mindfulness', bucket:'day' });
        const secs=((mr&&mr.aggregatedData)||[]).reduce((s,x)=>s+(x.value||0),0);
        mindfulWk=Math.round((secs||0)/60); ls('totry_mindful_week', mindfulWk);
      }catch(_){}
      try{ ls('totry_health_last_sync', Date.now()); }catch(_){}
      return { steps: steps!=null?Math.round(steps):null, active: active!=null?Math.round(active):null, mindfulWk: mindfulWk };
    }catch(e){ return null; }
  },
  // SLEEP. capacitor-health has no sleep permission or data type at all, so this reads a tiny native
  // plugin added to the app target (ios/App/App/SleepPlugin.swift) that asks HealthKit for
  // sleepAnalysis and nothing else. Sleep is the highest-value automatic signal this app can have: it
  // already feeds getLifeState() and already changes what the coach says, but it was self-reported, and
  // nobody types in their sleep every morning — so in practice the whole-person view was blind to it.
  // Same lesson: accept either the jsName or the class name. SleepPlugin.swift declares
  // jsName = "Sleep" and identifier = "SleepPlugin"; on the simulator neither key appeared in
  // Capacitor.Plugins at all, so sleep sync silently does nothing there and the app falls back to the
  // manual +/- control on the Track tab. See NEXT.md — registration of an app-target plugin needs
  // confirming on a real device.
  _sleepP(){
    try{
      const P = (window.Capacitor && window.Capacitor.Plugins) || {};
      return P.Sleep || P.SleepPlugin || null;
    }catch(_){ return null; }
  },
  async syncSleep(days){
    const sp=this._sleepP(); if(!sp || !sp.querySleep) return 0;
    try{
      const r = await sp.querySleep({ days: days||14 });
      const nights = (r && r.nights) || [];
      if(!nights.length) return 0;
      const tr = ls('totry_trackers') || {};
      let filled = 0;
      nights.forEach(function(n){
        try{
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(n.date||''));
          if(!m) return;
          const key = new Date(+m[1], +m[2]-1, +m[3]).toLocaleDateString('en-AU');
          if(!tr[key]) tr[key] = { water:0, sleep:0, steps:0 };
          // NEVER overwrite a figure the person typed themselves. A value with no _sleepSrc came from
          // them, and their own account of the night outranks the watch's.
          const existing = parseFloat(tr[key].sleep) || 0;
          if(existing > 0 && tr[key]._sleepSrc !== 'health') return;
          const hrs = parseFloat(n.hours) || 0;
          if(hrs <= 0 || hrs > 18) return;                     // ignore nonsense rather than store it
          if(Math.abs(existing - hrs) < 0.05) return;          // already current
          tr[key].sleep = hrs;
          tr[key]._sleepSrc = 'health';
          filled++;
        }catch(_){}
      });
      if(filled){
        ls('totry_trackers', tr);
        try{ if(typeof syncToCloud==='function') syncToCloud('totry_trackers', tr); }catch(_){}
        try{ if(typeof updateTrackerDisplay==='function') updateTrackerDisplay(); }catch(_){}
      }
      return filled;
    }catch(_){ return 0; }
  },
  // Pull workouts Apple Health already holds — Watch rings, Fitness, Nike, Strava-via-Health, anything
  // that writes there — so training fills itself in. Held back until now for one honest reason: without
  // dedupe this would double every session a person already imports from Hevy or Strava, and a doubled
  // workout is worse than a missing one. queryWorkouts gives a stable id and a sourceBundleId, which is
  // what makes it safe.
  async syncWorkouts(days){
    const p=this._p(); if(!p || !p.queryWorkouts) return 0;
    try{
      const now=new Date(); const start=new Date(now.getTime() - (days||14)*86400000);
      const r=await p.queryWorkouts({ startDate:start.toISOString(), endDate:now.toISOString(),
                                      includeHeartRate:true, includeRoute:false, includeSteps:true });
      const list=(r&&r.workouts)||[];
      if(!list.length) return 0;
      const existing = ls('totry_workouts') || [];
      const seen = new Set((ls('totry_health_workout_ids')||[]).map(String));
      // Our own bundle writes sessions BACK to Health — never re-import our own echo.
      const selfBundle = (function(){ try{ return (window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios') ? 'app.totry' : ''; }catch(_){ return ''; } })();
      let added=0;
      list.forEach(function(w){
        try{
          const wid = String(w.id || (w.startDate+'|'+w.workoutType));
          if(seen.has(wid)) return;                                        // already imported
          if(selfBundle && String(w.sourceBundleId||'').indexOf(selfBundle)===0) return;   // our own echo
          // Same session already here from Hevy, Strava or a manual log — match on time, as the rest of
          // the app does (_sessionsOverlap, 90 minutes).
          // 90 minutes was borrowed from the Hevy/Strava dedupe, where it is right: the SAME session
          // arriving from two integrations. Applied to Apple Health it also swallows a genuine second
          // session — a lift then a walk an hour later is one workout as far as this check is concerned,
          // and `existing` is mutated by the unshift below, so the pass even de-duplicates against
          // sessions imported moments earlier in the same loop. A matching id is a real duplicate; a
          // different id inside the window is only a duplicate if it is the same TYPE, which is what the
          // cross-integration case actually looks like.
          if(existing.some(function(e){
            if(!e) return false;
            if(String(e.id||'') === wid) return true;                      // the same session, certainly
            if(!_sessionsOverlap(e.ts, w.startDate, 90)) return false;
            const a = String(e.type||e.splitFocus||e.title||'').toLowerCase();
            const b = String(w.workoutType||'').toLowerCase();
            // No type on the existing row: fall back to the old behaviour rather than duplicating.
            if(!a || !b) return true;
            return a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
          })) { seen.add(wid); return; }
          const mins = Math.round((w.duration||0)/60) || Math.round((new Date(w.endDate)-new Date(w.startDate))/60000);
          const hr = (w.heartRate&&w.heartRate.length)
            ? Math.round(w.heartRate.reduce(function(a,x){return a+(x.bpm||0);},0)/w.heartRate.length) : null;
          existing.unshift({
            id: 'health_'+wid,
            source: 'health',
            type: String(w.workoutType||'Workout'),
            durationMinutes: mins,
            distance: (w.distance!=null? Math.round(w.distance) : null),
            calories: (w.calories!=null? Math.round(w.calories) : null),
            averageHeartRate: hr,
            steps: (w.steps!=null? Math.round(w.steps) : null),
            exercises: [],
            sourceName: String(w.sourceName||'Apple Health').slice(0,40),
            ts: w.startDate
          });
          seen.add(wid); added++;
        }catch(_){}
      });
      if(added){
        ls('totry_workouts', _capWorkouts(existing));
        ls('totry_health_workout_ids', Array.from(seen).slice(-400));
        try{ if(typeof syncToCloud==='function') syncToCloud('totry_workouts', ls('totry_workouts')); }catch(_){}
        try{ if(typeof reconcileBurns==='function') reconcileBurns(); }catch(_){}
      } else {
        ls('totry_health_workout_ids', Array.from(seen).slice(-400));
      }
      return added;
    }catch(_){ return 0; }
  },
  // Throttled auto-sync. syncToday() only ever ran at boot, on opening the Track tab, or from the manual
  // button — so someone could open the app, walk 5,000 steps with it still in memory, come back, and see
  // yesterday's number. The phone already knows; the app just wasn't asking. Keyed by day and idempotent,
  // so calling it often is safe; the throttle is only to avoid pointless HealthKit queries.
  async autoSync(minMinutes){
    try{
      if(!this.isNative() || !this.connected()) return null;
      const gap = (minMinutes==null ? 5 : minMinutes) * 60000;
      const last = parseInt(ls('totry_health_last_sync')||'0', 10) || 0;
      if(Date.now() - last < gap) return null;
      const r = await this.syncToday();
      // Workouts change far less often than step counts — check them at most every 30 minutes.
      try{
        const lastW = parseInt(ls('totry_health_workouts_last')||'0',10)||0;
        if(Date.now()-lastW > 30*60000){
          ls('totry_health_workouts_last', Date.now());
          const n = await this.syncWorkouts(14);
          try{ await this.syncSleep(14); }catch(_){}
          if(n>0){
            try{ if(typeof renderPTHistory==='function') renderPTHistory(); }catch(_){}
            try{ if(typeof showToast==='function') showToast('Training synced', n+' session'+(n===1?'':'s')+' brought in from Apple Health.'); }catch(_){}
          }
        }
      }catch(_){}
      // Refresh whatever is on screen so the new numbers appear without a tab change.
      try{ if(typeof updateTrackerDisplay==='function') updateTrackerDisplay(); }catch(_){}
      try{ if(typeof renderHealthCard==='function') renderHealthCard(); }catch(_){}
      try{ if(typeof renderNutritionLog==='function') renderNutritionLog(); }catch(_){}   // net calories move with active energy
      return r;
    }catch(_){ return null; }
  }
};

// Keep Apple Health current the way a native app should: whenever the person comes BACK to the app, and
// on a slow tick while it is open. Their steps, active energy and mindful minutes are already being
// recorded by the phone all day — the whole point of being a native app is that we fold that in without
// asking them to do anything.
function _initHealthAutoSync(){
  try{
    if(window.__healthAutoWired) return;
    window.__healthAutoWired = true;
    const wake = function(reason){ try{ if(typeof Health!=='undefined') Health.autoSync(reason==='resume' ? 1 : 10); }catch(_){} };
    // Web + native: the tab/app becoming visible again.
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState === 'visible') wake('resume');
    });
    window.addEventListener('focus', function(){ wake('resume'); });
    // Native: Capacitor's own foreground event, which fires where visibilitychange can be unreliable.
    try{
      const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if(App && App.addListener) App.addListener('appStateChange', function(st){ if(st && st.isActive) wake('resume'); });
    }catch(_){}
    // And a slow tick so a long session still keeps up with the day.
    setInterval(function(){ if(document.visibilityState==='visible') wake('tick'); }, 10*60000);
  }catch(_){}
}
// The Track-tab card that connects Apple Health (native only) and shows its live status.
async function connectAppleHealth(){
  const btn=document.getElementById('health-connect-btn');
  if(btn){ btn.textContent='Connecting…'; btn.disabled=true; }
  try{
    const r = await Health.connect();
    if(r && r.ok){
      const s=r.synced||{}; const bits=[]; if(s.steps) bits.push(s.steps.toLocaleString()+' steps'); if(s.active) bits.push(s.active+' active cal');
      if(typeof showToast==='function') showToast('Apple Health connected', bits.length?('Pulled '+bits.join(' · ')+' today.'):'Your activity will sync automatically.');
    } else if(typeof showToast==='function'){ showToast('Couldn’t connect', (r&&r.reason)||'Apple Health permission was declined.'); }
  }catch(e){ if(typeof showToast==='function') showToast('Couldn’t connect', String(e&&e.message||e)); }
  renderHealthCard();
}

// THE WAY OUT of Apple Health. totry_health_connected was only ever set true, and every sync is gated on
// Health.connected() — so once connected, the app kept reading and syncing for good and the only exit was
// buried in iOS Settings. privacy.html now tells people they can stop it here, so it has to be true here.
//
// Honest about its own limits: this stops the app reading and syncing. It cannot revoke the iOS permission
// itself (no API does), so it says where that lives. And it does NOT delete what was already imported —
// silently erasing weeks of a person's training history would be the worse surprise — but it says so
// plainly, and Settings → Your data → Delete still removes it all.
async function disconnectAppleHealth(){
  if(!confirm('Turn off Apple Health?\n\nThe app stops reading your steps, sleep and workouts, and stops syncing them to your account.\n\nWhat you\'ve already imported stays in your history. To revoke the permission itself, use iOS Settings → Health → Data Access & Devices → To Try.')) return;
  try{ ls('totry_health_connected', false); }catch(_){}
  // The write side rides on the same grant — leaving it "on" would be a switch pointing at nothing.
  try{ ls('totry_health_write', false); }catch(_){}
  // AND the figures that only Health can produce. totry_mindful_week is written solely inside
  // Health.syncToday, which is gated on Health.connected() — so after disconnecting it froze at its last
  // value and "N min of stillness this week · across all your apps" kept displaying a number no longer
  // coming from anywhere. Weeks later it was still that week's number. Clear what we can no longer know.
  try{ ls('totry_mindful_week', 0); }catch(_){}
  try{ if(typeof logEvent==='function') logEvent('health_disconnect',{}); }catch(_){}
  try{ if(typeof showToast==='function') showToast('Apple Health off', 'No more reading or syncing. Revoke the permission in iOS Settings → Health.'); }catch(_){}
  try{ renderHealthCard(); }catch(_){}
}
// The write row's own state. Separate function, called from renderHealthCard, so the read card's logic
// stays readable — and so this can be called on its own after the toggle.
function renderHealthWriteRow(){
  try{
    const row=document.getElementById('health-write-row'); if(!row) return;
    const btn=document.getElementById('health-write-btn');
    const canWrite = (typeof HealthWrite!=='undefined') && HealthWrite.isNative() && !!HealthWrite._p();
    if(!canWrite){ row.style.display='none'; return; }   // never show a switch that cannot work
    row.style.display='flex';
    const on = HealthWrite.enabled();
    if(btn){
      btn.textContent = on ? 'On' : 'Turn on';
      btn.style.background = on ? 'var(--go-bg)' : 'var(--bg3)';
      btn.style.borderColor = on ? 'var(--go-bd)' : 'var(--bd)';
      btn.style.color = on ? 'var(--go)' : 'var(--tx2)';
    }
  }catch(_){}
}
async function toggleHealthWrite(){
  if(typeof HealthWrite==='undefined') return;
  const btn=document.getElementById('health-write-btn');
  if(HealthWrite.enabled()){
    // Turning it off is instant and local — iOS permission stays granted, which is correct: revoking it
    // is theirs to do in Settings, and we should not pretend to have done it.
    ls('totry_health_write', false);
    if(typeof showToast==='function') showToast('Turned off','Nothing more will be sent to Apple Health.');
    renderHealthWriteRow(); return;
  }
  if(btn){ btn.textContent='…'; btn.disabled=true; }
  const r = await HealthWrite.connect();
  if(btn) btn.disabled=false;
  if(typeof showToast==='function'){
    if(r && r.ok) showToast('On','Workouts and weigh-ins will appear in Apple Health from now on.');
    else showToast('Not connected', (r&&r.reason) || 'Permission wasn\u2019t granted.');
  }
  if(typeof logEvent==='function' && r && r.ok) logEvent('health_write_on');
  renderHealthWriteRow();
}
function renderHealthCard(){
  try{ renderHealthWriteRow(); }catch(_){ }
  try{
    const card=document.getElementById('health-connect-card'); if(!card) return;
    const title=document.getElementById('health-connect-title'), sub=document.getElementById('health-connect-sub'), btn=document.getElementById('health-connect-btn');
    const off=document.getElementById('health-off-row');
    card.style.display='block';
    // Web/PWA is the beta — HealthKit is native-only. Be honest (a heads-up), never a dead button.
    if(typeof Health==='undefined' || !Health.isNative()){
      if(title) title.textContent='Apple Health';
      if(sub) sub.textContent='Automatic steps & activity sync arrives with the To Try app on the App Store — you’ll sign in with this same email and pick up right here.';
      if(btn) btn.style.display='none';
      if(off) off.style.display='none';
      return;
    }
    if(btn) btn.style.display='';
    if(Health.connected()){
      if(off) off.style.display='block';
      if(title) title.textContent='Apple Health connected';
      if(sub) sub.textContent='Steps & activity sync automatically each time you open the app.';
      if(btn){ btn.textContent='Sync now'; btn.disabled=false; btn.onclick=async function(){ btn.textContent='Syncing…'; btn.disabled=true; const s=await Health.syncToday(); const b=[]; if(s&&s.steps)b.push(s.steps.toLocaleString()+' steps'); if(s&&s.active)b.push(s.active+' cal'); if(typeof showToast==='function') showToast('Synced', b.length?('Apple Health · '+b.join(' · ')):'Up to date.'); btn.textContent='Sync now'; btn.disabled=false; }; }
    } else {
      if(off) off.style.display='none';
      if(title) title.textContent='Connect Apple Health';
      if(sub) sub.textContent='Pull your steps and activity in automatically — no manual logging.';
      if(btn){ btn.textContent='Connect'; btn.disabled=false; btn.onclick=connectAppleHealth; }
    }
  }catch(_){}
}

// ── REACH-OUT-FIRST — the sibling messages you at YOUR known risk window, app closed ─────────────
// The app already learns each fight's hardest time of day (analyzeUrgePatterns → riskWindow). This
// turns that knowledge into a real, daily, background notification ~20 min before that window opens —
// grace-first, choice-first, never guilt. Web-safe (records intent); fires for real once wrapped.
// ── THE RECEPTIVITY GATE (JITAI) — vulnerable AND receptive, or don't send ───────────────────────
// A nudge at a known risk window still fails if the person can't receive it — and a failed nudge
// doesn't cost nothing, it burns the channel: they turn notifications off, and then we can never
// reach them at the moment that matters. So a reach-out is armed only after it passes a gate:
// quiet hours, likely-asleep, already-in-the-app, one per day, a hard weekly cap, and a stand-down
// when the last few went unanswered. When the gate HOLDS, the presence isn't lost —
// _maybeRiskWindowGreeting still meets them in-app the moment they open inside that window.
const REACHOUT_MAX_PER_WEEK = 3;                              // presence, not a daily alarm
const REACHOUT_QUIET_DEFAULT = { start:'22:00', end:'07:00' };
const REACHOUT_STANDDOWN_DAYS = 14;

function quietHours(){ const q=ls('totry_quiet_hours'); return (q&&q.start&&q.end)?q:REACHOUT_QUIET_DEFAULT; }
function _hm(t,dh,dm){ const a=String(t||'').split(':'); const h=parseInt(a[0],10), m=parseInt(a[1],10); return (isNaN(h)?dh:h)*60+(isNaN(m)?dm:m); }
function _reachState(){ const s=ls('totry_reachout_state'); return (s&&typeof s==='object')?s:{next:null,hold:null,pausedUntil:0}; }
function _setReachState(patch){ try{ const s=_reachState(); Object.assign(s,patch,{ts:Date.now()}); ls('totry_reachout_state',s); }catch(_){} }
function _reachPaused(){ return (_reachState().pausedUntil||0) > Date.now(); }
function _touchActive(){ try{ ls('totry_last_active_ts', Date.now()); }catch(_){} }
function _usedRecently(mins){ const t=parseInt(ls('totry_last_active_ts')||'0',10); return t>0 && (Date.now()-t) < (mins||90)*60000; }

// We never GUESS that someone is asleep. We use the hours THEY set — the app must not claim to know
// something it cannot know. A short logged night only widens that band by an hour either side.
function _inQuiet(min){ const q=quietHours(); const s=_hm(q.start,22,0), e=_hm(q.end,7,0); return (s<e)?(min>=s&&min<e):(min>=s||min<e); }
function _likelyAsleep(min){
  if(_inQuiet(min)) return true;
  try{ const life=(typeof getLifeState==='function')?getLifeState():null;
    if(life && life.sleep && life.sleep.short) return _inQuiet((min+60)%1440) || _inQuiet((min+1380)%1440);
  }catch(_){}
  return false;
}
// If the hard hour sits inside their night we don't buzz at 1:40am — we come to the NEARER edge of
// the quiet band (just before it starts, or just after they're up) and the message says why.
// Returns {min, shifted:-1|0|1} or null when their whole receptive band is quiet (→ hold).
function _receptiveTime(min){
  if(!_likelyAsleep(min)) return { min:min, shifted:0 };
  const q=quietHours(); const s=_hm(q.start,22,0), e=_hm(q.end,7,0);
  const before=(s-20+1440)%1440, after=(e+10)%1440;
  const back=(min-before+1440)%1440, fwd=(after-min+1440)%1440;
  const cand=(fwd<=back)?{min:after,shifted:1}:{min:before,shifted:-1};
  return _likelyAsleep(cand.min) ? null : cand;
}

function _reachLog(){ try{ const a=ls('totry_reachout_log'); return Array.isArray(a)?a:[]; }catch(_){ return []; } }
function _saveReachLog(a){ try{ ls('totry_reachout_log', a.slice(-60)); }catch(_){} }
function _reachCount7(){ const now=Date.now(), wk=now-7*86400000; return _reachLog().filter(function(e){ return e && e.ts<=now && e.ts>=wk; }).length; }
// Channel health: three armed reach-outs in a row that were never answered means the channel is
// going cold. Stand down for two weeks rather than keep spending their attention — and say so.
function _reachUnansweredRun(){
  // Only nudges since the last stand-down ENDED. Without this the three that caused a stand-down were
  // still at the tail of the log when it expired, so the feature armed another 14 days on the same
  // three, and again, and again. The app's flagship "I reach out first" turned itself off for good
  // after three missed notifications, and the only way back was tapping a nudge that could not arrive.
  let since = 0;
  try{ since = _reachState().standDownEndedAt || 0; }catch(_){ }
  const d=_reachLog().filter(function(e){ return e && e.opened!=null && !(since && e.ts && e.ts < since); });
  let r=0; for(let i=d.length-1;i>=0;i--){ if(d[i].opened===false) r++; else break; } return r;
}
// Cancelling must also un-log. Entries are written at ARM time with a FUTURE ts and sent:true, so a
// nudge the app itself cancelled — because reminders were switched off, or quiet hours moved to cover
// the hard hour — stayed in the log. Once its ts passed, _reachCount7() counted it toward the 3-a-week
// ceiling and _resolveReachOuts() marked it unanswered (nobody can open a notification that was never
// delivered). Three phantoms stood the channel down for 14 days and told the person "the last few went
// unanswered, so I stopped" — about messages they never received. Anything not yet delivered is dropped.
function _cancelReachOuts(){
  try{ if(typeof Notify!=='undefined' && Notify.cancel){ for(let i=0;i<3;i++) Notify.cancel('reachout_'+i); } }catch(_){}
  try{ const now=Date.now(); _saveReachLog(_reachLog().filter(function(e){ return e && e.ts <= now; })); }catch(_){}
}
function _reachHold(why){ _setReachState({ next:null, hold:why }); _cancelReachOuts(); return 0; }
function _wonMomentToday(){ try{ const m=(ls('totry_moments_won')||[])[0]; if(!m||!m.ts) return false; return new Date(m.ts).toLocaleDateString('en-AU')===new Date().toLocaleDateString('en-AU'); }catch(_){ return false; } }
// A tap is the strongest receptivity signal we can get, and it is GROUND TRUTH — everything else here
// is a guess. So it may overrule the guess.
//
// It had to, because it could never win the race: _resolveReachOuts() runs from initApp() and judges
// every past nudge with a 45-minute heuristic, while the listener that calls this is wired inside
// initNotifications(), four seconds later on a timer. Capacitor retains a launch tap until it is
// consumed, so on a cold start the tap always arrived AFTER the verdict — and the old `opened==null`
// guard then refused it. Someone who saw the nudge at 23:15, tapped it, and came in was recorded as
// having ignored it. Three of those and the app stands down for two weeks and tells them: "the last
// few went unanswered, so I stopped." It said that to a person who answered every time.
//
// So: mark the newest unjudged nudge if there is one, else CORRECT the most recent judged-unanswered
// nudge from the last 12 hours. And if that correction means they are no longer ignoring us, lift a
// stand-down that should never have started.
function _reachOutResponded(){
  try{
    const a=_reachLog(); const now=Date.now();
    let hit=-1;
    for(let i=a.length-1;i>=0;i--){ if(a[i] && a[i].opened==null && a[i].ts<=now){ hit=i; break; } }
    if(hit<0){
      for(let i=a.length-1;i>=0;i--){
        if(a[i] && a[i].opened===false && a[i].ts<=now && (now-a[i].ts) < 12*3600000){ hit=i; break; }
      }
    }
    if(hit<0) return;
    a[hit].opened=true;
    _saveReachLog(a);
    // Undo a stand-down this correction has just invalidated. Staying quiet for two weeks because we
    // miscounted is the app withdrawing from someone at their hard hour for no reason at all.
    try{ if(_reachPaused() && _reachUnansweredRun() < 3) _setReachState({ pausedUntil: 0 }); }catch(_){}
  }catch(_){}
}
// Runs on every app open: did the ones we sent actually land?
function _resolveReachOuts(){
  try{
    const now=Date.now(); const a=_reachLog(); let changed=false;
    // Only judge nudges we actually sent. An unsent one has no answer to give.
    a.forEach(function(e){ if(!e||e.sent!==true||e.opened!=null||e.ts>now) return; e.opened=(now-e.ts)<=45*60000; changed=true; });
    if(changed) _saveReachLog(a);
    // A stand-down that has run its course must actually END: stamp the moment it lapsed so the nudges
    // that caused it stop counting. Otherwise the next resolve re-arms it on exactly the same three.
    try{
      const _st = _reachState();
      if(_st.pausedUntil && _st.pausedUntil <= now && (_st.standDownEndedAt||0) < _st.pausedUntil){
        _setReachState({ standDownEndedAt: now, pausedUntil: 0 });
      }
    }catch(_){ }
    if(_reachUnansweredRun()>=3 && !_reachPaused()){
      _setReachState({ pausedUntil: Date.now()+REACHOUT_STANDDOWN_DAYS*86400000, next:null, hold:null });
      _cancelReachOuts();
    }
  }catch(_){}
}
// Choice-first words. A short night changes the MESSAGE rather than suppressing it — that's the one
// line only a whole-life app can say. No faith content here: this reaches everyone.
function _reachBody(hi, viceName, shifted){
  let s='';
  try{ const life=(typeof getLifeState==='function')?getLifeState():null;
    if(life && life.sleep && life.sleep.short) s=' You slept short — cravings lie louder on a short night. Go gentle today.';
  }catch(_){}
  if(shifted===-1) return hi+'the hard stretch with '+viceName+' usually comes later tonight. I won’t buzz you at that hour — so here’s the door now, while it’s easy to walk through.'+s;
  if(shifted===1)  return hi+'the hard stretch with '+viceName+' usually lands while you’re meant to be asleep. I’m not waking you for it — but the day’s starting, and I’m here.'+s;
  return hi+'this is usually when it gets hardest with '+viceName+'. Nothing has to happen — I’m just here. Open me if anything’s rising.'+s;
}

const _REACH_WIN_START = { 'late night':0, 'morning':6, 'afternoon':12, 'evening':17, 'night':21 };
let _reachConfirm = Promise.resolve();   // serialises the native schedule confirmations below
function scheduleReachOut(){
  try{
    const _remindersOn = (typeof _pushPrefs==='function' && _pushPrefs().enabled)
      || ls('totry_notif_enabled') || ls('totry_notif_perm') === 'granted';
    if(!_remindersOn) return _reachHold('reminders are off');
    if(ls('totry_reachout_off')) return _reachHold('you turned this off');
    if(_reachPaused()) return _reachHold('standing down — the last few went unanswered, so I’ve stopped spending your attention');
    if(_reachCount7() >= REACHOUT_MAX_PER_WEEK) return _reachHold('already reached out '+REACHOUT_MAX_PER_WEEK+' times this week — that’s the ceiling');
    if(typeof loadV==='function') loadV();
    const vs = (typeof vices!=='undefined' && Array.isArray(vices)) ? vices : (ls('totry_v')||[]);
    // ONE reach-out, not one per vice. Four named fights used to mean four notifications a day —
    // exactly the pattern that gets an app muted. Take the single strongest learned window.
    let best=null;
    vs.forEach(function(v){
      if(!v||!v.n) return;
      const p=(typeof analyzeUrgePatterns==='function')?analyzeUrgePatterns(v.n):null;
      if(!p||!p.riskWindow) return;
      if(!best || p.total>best.p.total) best={v:v,p:p};
    });
    if(!best) return _reachHold('not enough logged moments yet for me to honestly know your hard hour');
    const key=Object.keys(_REACH_WIN_START).find(function(k){ return best.p.riskWindow.toLowerCase().includes(k); });
    if(!key) return _reachHold('your hard hour isn’t clear enough yet');
    const planned=(_REACH_WIN_START[key]*60 - 20 + 1440)%1440;
    const rt=_receptiveTime(planned);
    if(!rt) return _reachHold('your hard hour sits inside your quiet hours — I’ll meet you here instead, in the app');

    // Arm up to three single occurrences (re-armed on every open) rather than a blind daily repeat,
    // so "they're already here" and "they already won this one" can actually cancel a nudge.
    const now=Date.now();
    const past=_reachLog().filter(function(e){ return e && e.ts<=now; });   // drop unfired plans; re-arm below
    const remaining=Math.max(0, REACHOUT_MAX_PER_WEEK-_reachCount7());
    const slots=[]; const d0=new Date();
    for(let d=0; d<3 && slots.length<Math.min(3,remaining); d++){
      const t=new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()+d, Math.floor(rt.min/60), rt.min%60, 0, 0);
      if(t.getTime() <= now+10*60000) continue;                                        // already gone
      if(d===0 && _usedRecently(90) && (t.getTime()-now) < 90*60000) continue;          // they're here now
      if(d===0 && _wonMomentToday()) continue;                                          // already met today
      if(past.some(function(e){ return Math.abs(e.ts-t.getTime()) < 12*3600000; })) continue; // never twice a day
      slots.push(t);
    }
    if(!slots.length) return _reachHold('you’ve already been here today — no need for me to buzz');

    _cancelReachOuts();
    const first=(ls('totry_name')||'').trim().split(' ')[0];
    const body=_reachBody(first?first+', ':'', String(best.v.n), rt.shifted);
    const native=!!(typeof Notify!=='undefined' && Notify.isNative && Notify.isNative());
    const log=past.slice();
    slots.forEach(function(t,i){
      // Web can't background-fire, and Notify.schedule's web fallback grows totry_notif_pending
      // unbounded — so on web we compute and SHOW the plan without queueing anything.
      // And critically: on web we do NOT write it to the log. The log exists to measure whether a
      // nudge we ACTUALLY SENT landed. Recording an unsent one made web self-destruct silently —
      // the phantom entries ate the 3-a-week ceiling, then _resolveReachOuts marked all three
      // unanswered (nobody opened a notification that never arrived) and stood the channel down for
      // two weeks. Worse, it followed the person into the native app: a fresh install inherited a
      // log that already said "three ignored", so the one feature the wrapper unlocks was mute on
      // day one. Nothing sent, nothing logged.
      if(native){
        // sent:true was written UNCONDITIONALLY. Notify.schedule is async and swallows every failure
        // (catch(_){ return false; }), and this neither awaited nor checked it — so a nudge that never
        // scheduled was logged as sent, _resolveReachOuts later saw it unanswered (nobody opens a
        // notification that never arrived), and three phantom sends stood the channel down for fourteen
        // days. The app then concluded the person was ignoring it. Only log what actually happened.
        // Queued on ONE chain rather than each callback re-reading storage — two concurrent confirmations
        // reading the same snapshot would lose an entry, which is the same shape of bug as the phantom
        // sends this is fixing.
        _reachConfirm = _reachConfirm.then(function(){
          return Promise.resolve(Notify.schedule('reachout_'+i, 'To Try', body, t, { route:'reachout', vice:best.v.n }))
            .then(function(ok){
              if(ok === false) return;   // never scheduled — do not blame the person for not answering it
              const l = _reachLog();
              l.push({ ts:t.getTime(), vice:String(best.v.n), opened:null, sent:true });
              _saveReachLog(l);
            })
            .catch(function(){ /* nothing scheduled, nothing logged */ });
        });
      }
    });
    _saveReachLog(log);
    _setReachState({ next: slots[0].getTime(), hold: null });
    return slots.length;
  }catch(_){ return 0; }
}

// One shared Settings row for both branches of renderPushSettings (they were duplicated). It shows
// the person EXACTLY what the gate is doing — a channel that restrains itself has to prove it, or
// "we won't nag you" is only a claim.
function _reachOutRowHTML(){
  const on=!ls('totry_reachout_off'); const q=quietHours(); const st=_reachState();
  const _native=!!(typeof Notify!=='undefined' && Notify.isNative && Notify.isNative());
  let status;
  if(!on) status='Off. Nothing is scheduled.';
  else if(_reachPaused()) status='Standing down until '+new Date(st.pausedUntil).toLocaleDateString('en-AU')+' — the last few went unanswered, so I stopped.';
      // On the web nothing wakes the browser at their hard hour — there is no scheduler at all — so a
      // time here promised a check-in that could not arrive. Native says when; the web says why not.
      else if(st.next && st.next>Date.now()){
        const _native = (typeof Notify==='object' && Notify.isNative && Notify.isNative());
        status = _native
          ? ('Next: ' + new Date(st.next).toLocaleString('en-AU',{weekday:'short',hour:'numeric',minute:'2-digit'})+' · '+_reachCount7()+' of '+REACHOUT_MAX_PER_WEEK+' used this week.')
          : 'Ready when you install To Try as an app \u2014 a browser cannot wake itself at your hard hour.';
      }
  else if(st.hold) status='Holding — '+st.hold+'.';
  else status='Nothing scheduled right now.';
  return '<div style="border-top:1px solid var(--bd);margin:6px 0 10px;padding-top:12px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">'+
      '<div style="flex:1"><div style="font-size:13px;color:var(--tx);font-weight:500">Reach out to me first</div>'+
      '<div style="font-size:11px;color:var(--tx3);line-height:1.45">A quiet check-in before your hardest hour — learned from your own patterns. At most '+REACHOUT_MAX_PER_WEEK+' a week, never in your quiet hours, never when you’ve just been here.</div></div>'+
      '<button type="button" onclick="toggleReachOut()" style="padding:7px 14px;border-radius:100px;border:1px solid '+(on?'var(--go-bd)':'var(--bd)')+';background:'+(on?'var(--go-bg)':'transparent')+';color:'+(on?'var(--go)':'var(--tx2)')+';font-size:12px;white-space:nowrap">'+(on?'On':'Off')+'</button>'+
    '</div>'+
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);line-height:1.6;margin-top:8px">'+_escFew(status)+'</div>'+
    // Two time fields on their own row, then a full-width Save beneath — the same shape as the
    // morning/evening row above, which is why that one has always looked right.
    // On a 402pt iPhone this row used to overflow and clip Save off the right edge. Two causes, and I
    // only spotted the second after the first "fix" made it worse: <input type="time"> has a large
    // intrinsic width on iOS and flex children default to min-width:auto (hence min-width:0), AND
    // .btn carries width:100%, so flex:0 0 auto resolved the button's basis to the FULL row width.
    // With the inputs finally able to shrink, they collapsed to nothing and the labels collided.
    // Found by running the real build; a desktop browser never showed any of it.
    '<div style="display:flex;gap:8px;align-items:flex-end;margin-top:10px">'+
      '<div style="flex:1;min-width:0"><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">Quiet from</div><input type="time" id="quiet-start" value="'+q.start+'" style="width:100%;padding:9px;color-scheme:dark"></div>'+
      '<div style="flex:1;min-width:0"><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">Until</div><input type="time" id="quiet-end" value="'+q.end+'" style="width:100%;padding:9px;color-scheme:dark"></div>'+
    '</div>'+
      '<button class="btn" onclick="saveQuietHours()" style="margin-top:8px;background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go);font-size:12px;padding:9px 12px">Save quiet hours</button>'+
    '<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-top:6px">Nothing reaches you between these hours. If your hard hour falls inside them I come to the nearer edge instead — and the message says why.</div>'+
    // Say the limit out loud. A browser cannot wake itself, so on the web this works out your hard
    // hour and holds it — nothing buzzes. Claiming otherwise would be the exact promise this app
    // is built not to make.
    (_native ? '' : '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);line-height:1.6;margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)">In the browser I can work out your hard hour but I can’t buzz you — a web page can’t wake itself. The check-in starts once To Try is installed as an app; what you set here is kept and waiting. Quiet hours only ever silence what I send you — if you open me at 3am I’ll still meet you properly.</div>')+
  '</div>';
}
function saveQuietHours(){
  const s=(document.getElementById('quiet-start')||{}).value || '22:00';
  const e=(document.getElementById('quiet-end')||{}).value || '07:00';
  ls('totry_quiet_hours',{start:s,end:e});
  if(typeof scheduleReachOut==='function') scheduleReachOut();
  if(typeof haptic==='function') haptic('tap');
  if(typeof showToast==='function') showToast('Quiet hours saved','Nothing will reach you between '+s+' and '+e+'.');
  if(typeof renderPushSettings==='function') renderPushSettings();
}

function _hashId(str){ let h=0; const s=String(str); for(let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; } return h; }

// Local notifications via the Notification API. Daily nudge to return.
// Route a notification TAP to where it belongs, so reaching out actually lands somewhere: a
// reach-out opens the companion (the 2am door), a morning nudge opens the ritual, an evening one
// opens the reflection. Without this, tapping any of them just opened the app to wherever it was.
// Native only; wired once per session.
// ── ACCESSIBLE NAMES ──────────────────────────────────────────────────────────────────────────
// A sweep found 135 form controls in the static markup and ZERO with an accessible name: no aria-label,
// no <label for>. 57 had no placeholder either, so VoiceOver announces them as a bare "text field" or
// "pop up button" — the date you started, your sex, your activity level, the vice-tracking consent
// checkbox. Someone using a screen reader cannot fill in this app.
//
// Doing it at runtime rather than by hand-editing 135 tags: it also covers every dynamically-built
// modal (openFormModal, the quick journal, the fuel plan), which is most of the app's real inputs, and
// it cannot break the markup — it only ever ADDS an attribute where none existed.
function _a11yName(el){
  try{
    if(!el || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return;
    if(el.id && document.querySelector('label[for="'+CSS.escape(el.id)+'"]')) return;
    const clean = t => String(t||'').replace(/\s+/g,' ').trim().slice(0,60);
    let name = '';
    // 1. a wrapping <label>
    const lab = el.closest('label');
    if(lab) name = clean(lab.textContent);
    // 2. the nearest preceding sibling that is SHORT TEXT ONLY. A class allowlist was too narrow — it
    //    missed .tdee-label ("Sex", "Activity level"), which is exactly the kind of label this app uses.
    //    Any element that is short and contains no form controls is almost certainly a label.
    const looksLikeLabel = n => {
      if(!n) return '';
      // Reject the element itself being interactive as well as containing something interactive —
      // querySelector only searches DESCENDANTS, so a sibling <button> was passing as a label and a date
      // field ended up announced as "+ Add another to the fight".
      if(/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(n.tagName)) return '';
      if(n.getAttribute && (n.getAttribute('onclick') || n.getAttribute('role')==='button')) return '';
      if(n.querySelector && n.querySelector('input,textarea,select,button')) return '';
      const t = clean(n.textContent);
      return t.length>0 && t.length<=45 ? t : '';
    };
    if(!name){
      let n = el.previousElementSibling;
      for(let i=0;i<3 && n && !name;i++){ name = looksLikeLabel(n) || ''; n = n.previousElementSibling; }
    }
    // 3. the same, one level up (a label + input wrapped in a div)
    if(!name && el.parentElement){
      let n = el.parentElement.previousElementSibling;
      for(let i=0;i<2 && n && !name;i++){ name = looksLikeLabel(n) || ''; n = n.previousElementSibling; }
    }
    // 4. placeholder, then a last-resort type name so nothing is announced as nothing
    if(!name) name = clean(el.getAttribute('placeholder'));
    if(!name){
      const t=(el.getAttribute('type')||el.tagName).toLowerCase();
      name = t==='file' ? 'Choose a file' : t==='date' ? 'Pick a date' : t==='range' ? 'Adjust value'
           : t==='checkbox' ? 'Toggle option' : (t==='select' || el.tagName==='SELECT') ? 'Choose an option'
           : el.tagName==='TEXTAREA' ? 'Write here' : 'Enter a value';   // never leave one announced as nothing
    }
    if(name) el.setAttribute('aria-label', name);
  }catch(_){}
}
function applyA11yNames(root){
  try{
    (root||document).querySelectorAll('input,textarea,select').forEach(_a11yName);
  }catch(_){}
}
let _a11yPending = null;
function _watchA11y(){
  try{
    applyA11yNames(document);
    if(!window.MutationObserver || window.__a11yWatching) return;
    window.__a11yWatching = true;
    // Debounced: most of this app's inputs appear inside modals built after the fact.
    new MutationObserver(function(){
      if(_a11yPending) return;
      _a11yPending = setTimeout(function(){ _a11yPending=null; applyA11yNames(document); }, 300);
    }).observe(document.body, { childList:true, subtree:true });
  }catch(_){}
}

function _initNotificationTaps(){
  try{
    if(!(typeof Notify!=='undefined' && Notify.isNative && Notify.isNative())) return;
    const L = Notify._local && Notify._local();
    if(!L || !L.addListener || window.__notifTapWired) return;
    window.__notifTapWired = true;
    L.addListener('localNotificationActionPerformed', (action)=>{
      try{
        const ex = (action && action.notification && action.notification.extra) || {};
        if(ex.route === 'morning'){ if(typeof go==='function') go('morning'); }
        else if(ex.route === 'evening'){ if(typeof go==='function') go('reflect'); }
        else if(ex.route === 'reachout'){
          // A tap is the strongest receptivity signal there is — record it before routing, or the
          // 45-minute "did they come back" heuristic is the only evidence we ever have and a nudge
          // they answered from the lock screen can still count against the channel.
          try{ if(typeof _reachOutResponded==='function') _reachOutResponded(); }catch(_){}
          if(typeof _feelThePull==='function') _feelThePull(); else if(typeof openCompanionForUrge==='function') openCompanionForUrge(); else if(typeof go==='function') go('home');
        }
      }catch(_){}
    });
  }catch(_){}
}
function initNotifications(){
  // NATIVE: re-arm on-device reminders every launch (the OS can drop pending schedules; the person's
  // risk-window pattern shifts over time). No permission prompt here — only re-schedules if already on.
  if(typeof Notify!=='undefined' && Notify.isNative && Notify.isNative()){
    if(typeof reinitNativeReminders==='function') reinitNativeReminders();
    if(typeof _initNotificationTaps==='function') _initNotificationTaps();
    return;
  }
  if(!('Notification' in window)) return;
  // Don't ask immediately - wait until they've engaged
  const asked = ls('totry_notif_asked');
  if(asked) {
    if(Notification.permission === 'granted') scheduleNotifications();
    return;
  }
}


function scheduleNotifications(){
  // Store the schedule preference. Actual delivery handled by checking on app open
  // (true background push requires a push server; this is the lightweight version)
  const hour = ls('totry_notif_hour') || 7;
  ls('totry_notif_schedule', {hour, enabled: true});
  // Reach-out-first: (re)schedule the risk-window nudges from the latest pattern data. Runs on every
  // app open so the schedule tracks how the person's hardest hours actually shift over time.
  if(typeof scheduleReachOut==='function') scheduleReachOut();
}

// THE GONE-QUIET WELCOME — the single thing the research says cures abandonment: notice when
// someone drifts away, and reach out ONCE, warmly, with zero guilt. Not a habit nag — a friend
// who's glad you're back. Fires only after 3+ days quiet, only for a set-up user, at most once per
// return (tracked so it never repeats until they've gone quiet again).
function checkGoneQuietWelcome(){
  try{
    if(!isSetUpPerson()) return;
    const life = (typeof getLifeState==='function') ? getLifeState() : null;
    const daysQuiet = life && life.activity ? life.activity.daysQuiet : null;
    if(daysQuiet == null || daysQuiet < 3) return;
    // Only welcome once per quiet-spell: remember the last spell we greeted.
    const lastGreeted = parseInt(ls('totry_quiet_greeted')||'0', 10);
    const lastActivityKey = Math.floor(Date.now()/86400000); // today as a day-number
    if(lastGreeted === lastActivityKey) return; // already greeted today
    ls('totry_quiet_greeted', lastActivityKey);
    const name = ls('totry_name') || '';
    const hi = name ? ('Hey '+name+'.') : 'Hey.';
    setTimeout(()=>{
      if(typeof showToast==='function'){
        showToast(hi + ' Good to see you. \uD83C\uDF3F',
          'It\u2019s been a few days \u2014 no guilt at all. Whatever happened, you\u2019re here now, and that\u2019s what counts. Tap if you want to ease back in.',
          ()=>{ try{ if(typeof go==='function') go('home'); }catch(_){} });
      }
    }, 1800);
  }catch(_){}
}

// Check if we should show a "welcome back" or streak reminder when app opens
function checkReturnNudge(){
  // TWO BUGS IN THREE LINES.
  // 1. `totry_last_open` is a DAY STRING everywhere else — initApp writes toLocaleDateString('en-AU')
  //    and app.js compares it to a date string. This wrote a raw millisecond timestamp over it, so
  //    initApp's `if(ls('totry_last_open') !== today)` was true on every launch and the once-a-day
  //    "Day N, <name>" toast fired every single time the app opened. Its own key now.
  // 2. The guard is the WEB Notification API. The native build never calls Notification
  //    .requestPermission — it uses Capacitor — so permission is 'default' forever and this returned
  //    immediately in the App Store build. The nudge shows a toast; it does not need notification
  //    permission at all.
  try{ if(typeof Notification !== 'undefined' && Notification.permission === 'denied') return; }catch(_){}
  const lastOpen = ls('totry_last_open_ts');
  const now = Date.now();
  ls('totry_last_open_ts', now);
  if(!lastOpen) return;
  
  const hoursSince = (now - lastOpen) / (1000*60*60);
  // If they've been away over 20 hours, gentle nudge already happened via notification
  // This just updates streak-at-risk awareness
  if(hoursSince > 20){
    loadH();
    const ti = tIdx();
    const undone = habits.filter(h => h.d[ti] !== 1).length;
    if(undone > 0){
      // Soft in-app reminder, not a notification
      setTimeout(()=>{
        if(typeof showToast === 'function'){
          showToast('Welcome back', undone + ' habit' + (undone>1?'s':'') + ' still open today. You\'ve got time.');
        }
      }, 2000);
    }
  }
}

function renderNotifSetting(){
  const el = document.getElementById('notif-setting-status');
  if(!el) return;
  if(!('Notification' in window)){
    el.textContent = 'Not supported on this device';
    return;
  }
  if(Notification.permission === 'granted'){
    el.textContent = 'On — gentle morning nudge';
  } else if(Notification.permission === 'denied'){
    el.textContent = 'Blocked — enable in browser settings';
  } else {
    el.textContent = 'Off';
  }
}


// ─── INITIAL AUTH CHECK ────────────────────────────────────────
// ── GUEST MODE — the aha before the wall ─────────────────────────────────────────────────────────
// A signup wall in front of the first real value loses a large share of people AND hides the thing
// that actually helps. Worse, the person most likely to open this app is mid-moment — asking them to
// make an account first is the opposite of a presence. So a guest gets the Feeling Door and one real
// move immediately, stored locally. Signing up is offered AFTERWARDS, at the natural moment, framed as
// "keep this" — never as the toll to get in. Everything a guest does is kept and carried into the
// account they later make (it all lives in the same local storage the app already syncs from).
// Someone the app may speak to first. This gate used to read `!totry_onboarded && !totry_name`, and
// enterAsGuest() writes NEITHER — it writes only totry_guest. So a guest was permanently excluded from
// the companion check-in AND the gone-quiet welcome: the two things the app does to reach out first,
// and the ones its own comments call "the keystone of the whole app" and "the single thing the
// research says cures abandonment". A guest has deliberately come in and used the Feeling Door; they
// count. Kept as one helper so the two gates cannot drift apart again.
function isSetUpPerson(){
  try{ return !!(ls('totry_onboarded') || ls('totry_name') || ls('totry_guest')); }catch(_){ return false; }
}
function isGuest(){ try{ return !!ls('totry_guest') && !currentUser; }catch(_){ return false; } }
function enterAsGuest(){
  try{ ls('totry_guest', true); }catch(_){}
  try{ if(typeof logEvent==='function') logEvent('guest_enter',{}); }catch(_){}
  // Told once, on the way in, rather than as a fourth paragraph on the landing page. A guest's work
  // lives in this browser and nowhere else; clearing it loses the lot. That is a real cost and they
  // are entitled to know it — but a line under a button competes with three other lines and is read by
  // nobody. Here it is the only new thing on screen, and it arrives after they have already chosen, so
  // it informs rather than delays. Once per device: a warning repeated is a warning ignored.
  try{
    if(!ls('totry_guest_told') && typeof showToast==='function'){
      ls('totry_guest_told', true);
      setTimeout(function(){ showToast('Kept on this device', 'Add an account any time to keep it safe.'); }, 900);
    }
  }catch(_){}
  try{ const ac=document.getElementById('auth-container'); if(ac) ac.style.display='none'; }catch(_){}
  try{ const ob=document.getElementById('onboard'); if(ob){ ob.classList.remove('active'); ob.style.display='none'; } }catch(_){}
  try{ document.querySelectorAll('.app').forEach(function(a){ a.classList.add('app-ready'); }); }catch(_){}
  try{ if(typeof initApp==='function') initApp(); }catch(e){ console.warn('[guest] initApp:', e); }
  // Straight to the thing that helps — no home tour, no setup.
  setTimeout(function(){ try{ if(typeof openFeelingDoor==='function') openFeelingDoor(); }catch(e){ console.warn('[guest] door:', e); } }, 320);
}
// Offered after a guest has actually been helped. "Keep this", not "pay the toll".
function guestKeepThis(){
  try{ if(typeof logEvent==='function') logEvent('guest_to_signup',{}); }catch(_){}
  try{ document.querySelectorAll('.modal-bg:not([id])').forEach(function(m){ m.remove(); });  /* :not([id]) is load-bearing. #journal-modal, #payday-modal and #rest-timer-overlay are STATIC elements that carry .modal-bg, so the bare selector deleted them from the DOM permanently. Three of these four sites are crisis paths I added in v434/v439 — meaning that after a person disclosed something serious, openJournal() threw on its first line ('Cannot set properties of null') and the journal composer was dead for the rest of the session. I diagnosed this exact symptom earlier as MY TEST's fault, which it also was; I did not check whether the shipped code did the same thing. It did. */ }catch(_){}
  try{ document.querySelectorAll('.totry-release-ov').forEach(function(o){ o.remove(); }); }catch(_){}
  try{ document.querySelectorAll('.breath-overlay').forEach(function(o){ o.remove(); }); }catch(_){}
  try{ const ac=document.getElementById('auth-container'); if(ac) ac.style.display='flex'; }catch(_){}
  try{ if(typeof authShowStep==='function') authShowStep('email'); }catch(_){}
  try{ const i=document.getElementById('auth-email-input'); if(i) setTimeout(function(){ i.focus(); },120); }catch(_){}
}

// THE OFFLINE FLOOR — the app opens even when the cloud never arrives.
//
// checkAuthAndStart() is the ONLY caller of initApp() and the only thing that hides #onboard or reveals
// the sign-in screen, and both it and initSupabase() used to retry every 200ms with no cap and no
// fallback. So if the SDK or the client never materialised, the app simply never opened: no Feeling
// Door, no companion, and no crisis numbers — which are hardcoded and need no network at all — exactly
// when someone has no signal. The PWA's service worker hid this by caching the CDN; the native shell
// unregisters the service worker, so the App Store build had no mitigation whatsoever.
//
// Nothing in here touches sb. Everything needed to meet a person is already on the phone.
let _bootedLocal = false;
let _authTries = 0;
function bootWithoutCloud(reason){
  if(_bootedLocal) return;
  _bootedLocal = true;
  console.warn('[boot] opening without the cloud:', reason);
  // The reason is a diagnostic string, not a feature name, and it goes to the same row as everything
  // else. console.error carries it for debugging without putting it in the database.
  try{ if(typeof logEvent==='function') logEvent('boot_offline'); }catch(_){}
  try{
    const ac = document.getElementById('auth-container');
    const ob = document.getElementById('onboard');
    // Anyone this phone already knows — their whole app is in local storage. Open it.
    const known = !!(ls('totry_onboarded') || ls('totry_guest') || (ls('totry_identity') && ls('totry_name')));
    if(known){
      if(ac) ac.style.display = 'none';
      if(ob){ ob.classList.remove('active'); ob.style.display = 'none'; }
      document.querySelectorAll('.app').forEach(function(a){ a.classList.add('app-ready'); });
      if(typeof initApp === 'function') initApp();
      // Said once, quietly, so an unsynced day reads as "offline" rather than "my data is gone".
      setTimeout(function(){
        try{ if(typeof showToast==='function') showToast('Offline', 'Everything works and saves here. It syncs when you’re back on.'); }catch(_){}
      }, 900);
    } else {
      // Brand new with no connection. The code can't send — say so plainly instead of failing silently.
      // The guest door sitting right under it ("Something's pulling at me right now") needs no network,
      // so the person in the hard moment still gets in.
      if(ob){ ob.classList.remove('active'); ob.style.display = 'none'; }
      if(ac) ac.style.display = 'flex';
      if(typeof authShowStep === 'function') authShowStep('email');
      try{ const n = document.getElementById('auth-offline-note'); if(n) n.style.display = 'block'; }catch(_){}
    }
  }catch(e){ console.error('[boot] offline fallback failed:', e); }
  // Clear the splash now that there is something behind it (it also self-removes at 6s).
  try{
    const bs = document.getElementById('boot-splash');
    if(bs){ bs.style.opacity = '0'; setTimeout(function(){ try{ bs.remove(); }catch(_){} }, 400); }
  }catch(_){}
  // If the connection turns up later, pick the cloud back up: a fresh client restores the saved session,
  // which starts the sync loop. initApp() is guarded by _bootedLocal, so nothing runs twice.
  try{
    window.addEventListener('online', function(){
      try{ const n = document.getElementById('auth-offline-note'); if(n) n.style.display = 'none'; }catch(_){}
      try{ if(!sb && typeof initSupabase === 'function'){ _sbTries = 0; initSupabase(); } }catch(_){}
      // A client without a restored session is not "signed in" to anything. checkAuthAndStart() is
      // guarded by _bootedLocal/__authProceeded, so re-running it is safe and is what actually picks
      // the session back up — without it a signed-in person who booted offline was told, once they
      // were back online, to sign in to data they already had.
      try{ if(sb && (typeof currentUser === 'undefined' || !currentUser) && typeof checkAuthAndStart === 'function') checkAuthAndStart(); }catch(_){}
      try{ if(typeof renderSyncStatus === 'function') renderSyncStatus(); }catch(_){}
    }, {once:true});
  }catch(_){}
}

// ONE WATCHER, NOT FIVE CALL SITES. Four different places add .app-ready and a fifth reveals the
// sign-in screen; hooking each would be five chances to miss one, and a missed one means the splash
// never hides and the app never opens — strictly worse than the black screen this replaces.
// So watch for the person having something on screen, whatever put it there, and hide then. The
// backstop is not optional: it is the difference between a slow launch and a bricked app.
function _splashWatch(){
  try{
    if(!(typeof Notify === 'object' && Notify.isNative && Notify.isNative())) return;
    let done = false;
    const finish = () => { if(done) return; done = true; try{ Notify.hideSplash(); }catch(_){ } };
    const showing = () => {
      try{
        const big = el => el && el.getBoundingClientRect().height > 120 &&
                          getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
        if(big(document.getElementById('auth-container'))) return true;
        if(big(document.querySelector('.app.app-ready'))) return true;
        const ob = document.getElementById('onboard');
        if(ob && ob.classList.contains('active') && big(ob)) return true;
      }catch(_){ }
      return false;
    };
    const t = setInterval(() => { if(showing()){ clearInterval(t); finish(); } }, 100);
    setTimeout(() => { clearInterval(t); finish(); }, 6000);
  }catch(_){ }
}

async function checkAuthAndStart(){
  try{ _splashWatch(); }catch(_){}
  // Wait for Supabase to be ready
  if(!sb){
    // CAPPED — see bootWithoutCloud above. This also covers createClient() throwing, which leaves sb
    // null with no retry of its own.
    if(++_authTries > 25){ bootWithoutCloud('no-client'); return; }
    setTimeout(checkAuthAndStart, 200);
    return;
  }
  
  try {
    // BOUNDED. Offline with an EXPIRED access token (they last an hour), supabase-js sits in its
    // _callRefreshToken retry/backoff loop for ~25-30 seconds before resolving with session:null. For all
    // that time #onboard is still showing — it is visible by default — so a person who has used this app
    // for months stares at the first-run welcome screen, with no Feeling Door and no reachable crisis
    // numbers, and then lands on the sign-up wall. Which is verbatim the harm v420's own commit message
    // claimed to have fixed.
    //
    // v420 vendored the SDK and capped the two retry loops, and that was necessary — but it fixed the
    // WRONG CAUSE and then hid the right one: bootWithoutCloud() is only ever called when the SDK or the
    // client is missing, and vendoring the SDK means it now always loads. So the offline floor became
    // unreachable for an actual network outage. Racing the session lookup is what actually reaches it.
    const _sess = await Promise.race([
      sb.auth.getSession(),
      new Promise(res => setTimeout(() => res({ __timeout: true }), 2500))
    ]);
    if(_sess && _sess.__timeout){
      bootWithoutCloud('session-timeout');       // the 'online' listener inside it picks the cloud back up
      return;
    }
    const session = (_sess && _sess.data) ? _sess.data.session : null;
    
    if(session && session.user){
      // Logged in - hide auth, show app
      currentUser = session.user;
      syncEnabled = true;
      document.getElementById('auth-container').style.display = 'none';
      
      // Check if onboarded.
      // This used to gate ONLY on identity + name, and finishOnboard() writes neither — it writes
      // totry_onboarded. So the two paths the app deliberately optimised for, "Take me in →" and
      // tapping a feeling at the first felt moment, produced a person who was thrown back to onboarding
      // screen one on EVERY launch, with initApp() never running. And because each pass through
      // finishOnboard re-stamped totry_start, getDayCount() returned 1 forever: the day counter, the
      // milestones and every progressive-disclosure gate (day>=3..7) were frozen at day one. Someone
      // could use the app for a month and never leave their first ten minutes.
      const hasIdentity = ls('totry_identity');
      const hasName = ls('totry_name');
      const isOnboarded = !!ls('totry_onboarded');

      if(isOnboarded || (hasIdentity && hasName)){
        // Returning user
        document.getElementById('onboard').classList.remove('active');
        document.getElementById('onboard').style.display = 'none';
        if(typeof initApp === 'function') await initApp();
      } else {
        // Logged in but not onboarded yet - show onboarding starting at name
        document.getElementById('onboard').classList.add('active');
        document.getElementById('onboard').style.display = 'block';
        try{ const sc=document.getElementById('ob-chip-strava'); if(sc && typeof isStravaApproved==='function' && isStravaApproved()) sc.style.display=''; }catch(_){}
        try{ const gh=document.getElementById('ob-chip-googlehealth'); if(gh && !(typeof isNativeApp==='function' && isNativeApp())) gh.style.display=''; }catch(_){}
      }
      
      startSyncLoop();
      // Auto-sync connected fitness services in background
      setTimeout(()=>{
        if(ls('totry_strava_token') && typeof syncStravaActivities==='function') syncStravaActivities();
        if(ls('totry_google_token') && typeof syncGoogleHealth==='function') syncGoogleHealth();
        if(ls('totry_hevy_api_key') && typeof syncHevyWorkouts==='function') syncHevyWorkouts();
      }, 3000);
    } else if(ls('totry_guest')){
      // A GUEST COMING BACK. There was no branch for this at all: no Supabase session meant "show the
      // sign-up wall", so anyone who came in through "Something's pulling at me right now — no account,
      // no setup, just help" was met on their NEXT open with "Welcome. Enter your email to begin." Their
      // vices, journal and everything else were sitting in local storage the whole time, invisible behind
      // an account request. That door exists for someone in a hard moment; asking them to register to get
      // back to what they wrote is the worst possible second impression. initApp() never ran for them
      // either, so migrations, faith labels and the receptivity bookkeeping were all skipped.
      document.getElementById('auth-container').style.display = 'none';
      const _ob=document.getElementById('onboard');
      if(_ob){ _ob.classList.remove('active'); _ob.style.display='none'; }
      document.querySelectorAll('.app').forEach(function(a){ a.classList.add('app-ready'); });
      if(typeof initApp === 'function') await initApp();
    } else {
      // NO SESSION IS NOT THE SAME AS NO ACCOUNT. Offline, an expired token resolves to session:null and
      // this branch used to wall a long-time user out of months of their own data — data sitting
      // untouched in localStorage on the device in their hand, while signing in is impossible with no
      // network. If this phone already knows them, open their app.
      if(ls('totry_onboarded') || ls('totry_guest') || (ls('totry_identity') && ls('totry_name'))){
        bootWithoutCloud('no-session-offline');
        return;
      }
      // Genuinely new here, and no session: the sign-in screen is the right answer.
      document.getElementById('auth-container').style.display = 'flex';
      document.getElementById('onboard').style.display = 'none';
      authShowStep('email');
    }
  } catch(e){
    console.error('Auth check failed:', e);
    // Same rule on the error path — it hard-landed on the wall too.
    if(ls('totry_onboarded') || ls('totry_guest') || (ls('totry_identity') && ls('totry_name'))){
      bootWithoutCloud('auth-check-failed');
      return;
    }
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('onboard').style.display = 'none';
  }
}

// ── API ───────────────────────────────────────────────────────

// Single source of truth for the user's name: storage. Initialised from totry_name at boot so a
// greeting that renders before any init pass never falls back to "Friend" while a name is set
// (was the cause of Home saying "Alfy" but the rituals saying "Friend"). changeName + onboarding
// keep it in sync when the name changes.
let userName = ls('totry_name') || 'Friend';

const BIBLE_SYS=`You are a Bible scholar and pastoral counsellor. Someone has described their situation, feeling, or struggle. Your job is to find 6-8 genuinely relevant Bible verses that speak to what they are going through - drawing from across the entire Bible, not just the well-known passages.

RULES:
- Return ONLY a raw JSON array. No markdown, no backticks, no preamble.
- Draw from Old Testament AND New Testament. Psalms, Proverbs, Isaiah, Jeremiah, the Gospels, Epistles, Wisdom literature.
- Do NOT include Philippians 4:13, John 3:16, or Jeremiah 29:11 unless they are genuinely the best fit for this exact situation.
- Vary the books - do not pick 3 verses from the same book.
- Choose verses that would genuinely surprise and comfort someone in this exact situation.
- Identify the deeper themes beneath the surface words (e.g. "I feel worthless" means shame, identity, God's love for the broken, restoration).
- Each verse must come with a short personal reflection connecting it directly to THIS situation.

FORMAT - return ONLY this JSON array:
[
  {"reference":"Book Chapter:Verse (ESV)","verse":"exact verse text","reflection":"1-2 sentences why this verse speaks to this exact situation"},
  ...6-8 total
]`;

const PT_SYS='You are a personal trainer.'; // legacy fallback; buildPTCtx() is the real prompt
// Aggregates the v106 training intelligence (1RM/PRs, readiness, mobility, per-muscle, hybrid
// load + interference, today's Hevy routine) into a compact block for the PT coach. So the coach
// reasons from everything the app knows — the whole-system payoff.
function _ptIntel(){
  let out = '';
  try{
    const prs = ls('totry_prs') || {};
    const prNames = Object.keys(prs);
    if(prNames.length){
      const top = prNames.map(n=>({n,orm:prs[n].orm||0})).sort((a,b)=>b.orm-a.orm).slice(0,5);
      out += '\nEstimated 1RMs: ' + top.map(x=>x.n+' ~'+x.orm+'kg').join(', ');
      const wk = Date.now()-7*86400000;
      const recent = prNames.filter(n=>{const d=prs[n].date?new Date(prs[n].date).getTime():0;return d>=wk;});
      if(recent.length) out += '\nNEW PRs this week (celebrate): ' + recent.join(', ');
    }
    if(typeof getTodayHevyRoutine==='function'){
      const r = getTodayHevyRoutine();
      if(r) out += '\nToday\u2019s Hevy routine: ' + r.title + ' (' + (r.exercises||[]).map(e=>e.name).slice(0,8).join(', ') + ')';
    }
    if(typeof computeWeeklySetsByMuscle==='function'){
      const sets = computeWeeklySetsByMuscle();
      const parts = Object.keys(sets).map(g=>g+' '+sets[g]);
      if(parts.length) out += '\nWeekly sets per muscle: ' + parts.join(', ') + ' (target 10\u201320 each)';
    }
    if(typeof muscleBalanceWarnings==='function'){
      const w = muscleBalanceWarnings();
      if(w.length) out += '\nBalance flags: ' + w.join(' ');
    }
    if(typeof weeklyLoadByModality==='function'){
      const load = weeklyLoadByModality();
      const parts = Object.keys(load).map(m=>m+' '+load[m].sessions+'x');
      if(parts.length>1) out += '\nTraining mix this week: ' + parts.join(', ');
    }
    if(typeof interferenceNote==='function'){ const i=interferenceNote(); if(i) out += '\nInterference: ' + i; }
    if(typeof computeReadiness==='function'){ const rd=computeReadiness(); if(rd) out += '\nReadiness today: ' + rd.score + '/100 (' + rd.level + '). ' + rd.advice; }
    if(typeof getMobilityProfile==='function'){ const mp=getMobilityProfile(); if(mp){ const tight=Object.keys(mp).filter(k=>k!=='_ts'&&mp[k]<=2); if(tight.length) out += '\nTight mobility areas: ' + tight.join(', '); } }
    if(typeof detectPlateau==='function'){ const pl=detectPlateau(); if(pl) out += '\nPlateau detected: ' + pl.detail; }
  }catch(e){}
  return out;
}
// ── THE NERVOUS SYSTEM ────────────────────────────────────────────────────────
// getLifeState() is the single sensory cortex of To Try. Every "brain" — the coach, the
// proactive nudge, the home insight, the weekly synthesis — reads from THIS instead of each
// re-gathering raw streams with its own date logic. That's what turns separate trackers into
// one system that genuinely knows the person: body, mind, and soul gathered once, consistently,
