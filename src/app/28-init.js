// ── INIT APP ──────────────────────────────────────────────────

// ── WEB PUSH REMINDERS (the daily rhythm, even when the app is closed) ──
// iOS 16.4+ supports real Web Push for PWAs installed to the Home Screen. Consent-based:
// nothing is requested until the user taps Enable. Times are theirs to choose.
const PUSH_VAPID_PUBLIC = 'BJOHDoZ7ARQCjaOn0dKRZtZT6rZOwmCiF75YnnVHBT1v4DsAy0I26ixYAdeNpwaBK1oSVPIF1KfVVi-lhOzsA1I';
function _b64uToU8(b){const p='='.repeat((4-b.length%4)%4);const r=atob((b+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(r,c=>c.charCodeAt(0));}
// Second copy of the same predicate, kept so existing call sites keep working — delegates now, so the
// two can never drift apart again (they already had: only one of them was ever going to get fixed).
function _isStandalone(){ return (typeof isStandalone==='function') ? isStandalone()
  : (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true); }
function _pushPrefs(){return ls('totry_push_prefs')||{enabled:false,morning:'07:30',evening:'21:00'};}

// WS-J: generate the user's personalized notification message sets and store them on their
// push_subscriptions row. ANTI-NAGGING by design: supportive/devotional lines only, tied to the
// reminder times they already chose (no new pressure), refreshed at most weekly. The edge function
// picks one at the scheduled time, falling back to fixed lines if these are absent.
async function refreshAIPushMessages(opts){
  opts = opts || {};
  try{
    if(!sb || !currentUser) return;
    const prefs = (typeof _pushPrefs==='function') ? _pushPrefs() : (ls('totry_push_prefs')||{});
    if(!prefs.enabled && !opts.force) return;
    // At most weekly, unless forced (e.g. just enabled).
    const last = ls('totry_ai_push_at') || 0;
    if(!opts.force && (Date.now() - last) < 7*86400000) return;
    const name = (ls('totry_name')||'').trim();
    const identity = ls('totry_identity') || '';
    const sys = 'You write short, warm push-notification lines for a whole-life self-improvement app. Each line is ONE sentence, encouraging and grounding — never guilt-inducing, never nagging, never pressuring. Think a wise friend in their corner. '+((typeof faithVoiceNote==='function')?faithVoiceNote():'')+'Return ONLY JSON.';
    const prompt = 'Write notification lines for '+(name||'someone')+' on their journey of '+((typeof faithTradition==='function'&&faithTradition()==='secular')?'self-improvement':'faith and self-improvement')+''+(identity?(' (becoming: "'+identity+'")'):'')+'.\n\nReturn ONLY this JSON, no markdown:\n{"morning":["6 short morning lines — hopeful, inviting them gently into the day"],"evening":["6 short evening lines — calm, inviting honest reflection and rest"]}\nEach line under 90 characters. No guilt, no stre***-pressure, no "don\u2019t break your streak". Warm and human.';
    const raw = await api(sys, [], prompt, 700);
    const m = raw.match(/\{[\s\S]*\}/);
    if(!m) return;
    const sets = JSON.parse(m[0]);
    const morning = Array.isArray(sets.morning) ? sets.morning.filter(x=>typeof x==='string'&&x.trim()).slice(0,8) : [];
    const evening = Array.isArray(sets.evening) ? sets.evening.filter(x=>typeof x==='string'&&x.trim()).slice(0,8) : [];
    if(!morning.length && !evening.length) return;
    await sb.from('push_subscriptions').update({ ai_morning_messages: morning, ai_evening_messages: evening }).eq('user_id', currentUser.id);
    ls('totry_ai_push_at', Date.now());
  }catch(e){ /* non-fatal — fixed fallback lines still send */ }
}

// NATIVE reminders — the real "reach out first". Schedules the two daily nudges as on-device local
// notifications (Capacitor's repeating on:{hour,minute}), which fire even when the app is CLOSED,
// with no server and no account. The web-push path below can't run in the native WebView (no
// PushManager), so before this the reminders button was dead in the wrapped app.
function _scheduleNativeReminders(prefs){
  try{
    if(typeof Notify==='undefined' || !Notify.scheduleDaily) return;
    const p = prefs || _pushPrefs();
    const parse = (t, dh, dm) => { const a=String(t||'').split(':'); const h=parseInt(a[0],10), m=parseInt(a[1],10); return [isNaN(h)?dh:h, isNaN(m)?dm:m]; };
    const [mh,mm] = parse(p.morning, 7, 30);
    const [eh,em] = parse(p.evening, 21, 0);
    Notify.scheduleDaily('reminder_morning','To Try','A quiet minute to set your intention for today.', mh, mm, { route:'morning' });
    Notify.scheduleDaily('reminder_evening','To Try','Close the day with grace — a moment to look back honestly.', eh, em, { route:'evening' });
  }catch(_){}
}
// Re-arm native reminders on every launch (the OS can clear pending ones; times/patterns shift).
function reinitNativeReminders(){
  try{
    if(!(typeof Notify!=='undefined' && Notify.isNative && Notify.isNative())) return;
    const prefs = _pushPrefs();
    if(prefs && prefs.enabled){ _scheduleNativeReminders(prefs); if(typeof scheduleReachOut==='function') scheduleReachOut(); }
    if(prefs && prefs.enabled && typeof scheduleBillReminders==='function') scheduleBillReminders();
  }catch(_){}
}

async function enablePushReminders(){
  // NATIVE: real local notifications — no account, no server, fires app-closed.
  if(typeof Notify!=='undefined' && Notify.isNative && Notify.isNative()){
    try{
      const granted = await Notify.requestPermission();
      if(!granted){ showToast('No problem','You can enable reminders anytime in Settings.'); renderPushSettings(); return; }
      const prefs = _pushPrefs(); prefs.enabled = true; ls('totry_push_prefs', prefs);
      _scheduleNativeReminders(prefs);
      if(typeof scheduleReachOut==='function') scheduleReachOut();
      if(typeof haptic==='function') haptic('success');
      if(typeof logEvent==='function') logEvent('reminders_on');
      showToast('Reminders on ✓','Morning '+prefs.morning+' · Evening '+prefs.evening+' — even when the app is closed.');
    }catch(e){ console.error('native reminders failed', e); showToast('Could not enable','Try again in a moment.'); }
    renderPushSettings();
    return;
  }
  try{
    if(!sb || !currentUser){ showToast('Sign in first','Reminders need an account so they can reach this device.'); return; }
    if(!('Notification' in window) || !('PushManager' in window)){ showToast('Not supported here','This browser cannot receive push notifications.'); renderPushSettings(); return; }
    const perm = await Notification.requestPermission();
    if(perm !== 'granted'){ showToast('No problem','You can enable reminders anytime in Settings.'); renderPushSettings(); return; }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if(!sub){ sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:_b64uToU8(PUSH_VAPID_PUBLIC) }); }
    // 'enabled' is written AFTER the server row exists, not before. Writing it first meant a failed
    // insert — offline, RLS, a dropped connection — left Settings confidently showing reminders ON with
    // no subscription behind it. The person then waits for a nudge at their hard hour that the server
    // has no way to send, and the one screen that could tell them says everything is fine.
    const prefs = _pushPrefs();
    await sb.from('push_subscriptions').delete().eq('user_id', currentUser.id);
    const { error } = await sb.from('push_subscriptions').insert({
      user_id: currentUser.id,
      subscription: sub.toJSON(),
      tz_offset_minutes: new Date().getTimezoneOffset(),
      remind_morning: prefs.morning,
      remind_evening: prefs.evening
    });
    if(error) throw error;
    prefs.enabled = true; ls('totry_push_prefs', prefs);   // only now is it true
    haptic('success');
    logEvent('reminders_on');
    // Generate the user's personalized (anti-nagging) message sets now that reminders are on.
    try{ refreshAIPushMessages({ force: true }); }catch(_){ }
    showToast('Reminders on \u2713','Morning ' + prefs.morning + ' \u00b7 Evening ' + prefs.evening + '. Change times below.');
  }catch(e){
    console.error('enablePush failed', e);
    // Leave it OFF on disk, so what Settings shows and what the server knows are the same thing.
    try{ const p2 = _pushPrefs(); p2.enabled = false; ls('totry_push_prefs', p2); }catch(_){}
    const _why = String((e && (e.message || e.error_description || e.error)) || '').slice(0, 140);
    showToast('Could not enable', _why
      ? (_why + ' \u2014 this one is on my end, not yours. Nothing about your reminders changed.')
      : 'Make sure the app is installed to your Home Screen, then try again.');
  }
  renderPushSettings();
}

async function disablePushReminders(){
  // NATIVE: cancel the on-device notifications (morning, evening, and every reach-out window).
  if(typeof Notify!=='undefined' && Notify.isNative && Notify.isNative()){
    const prefs=_pushPrefs(); prefs.enabled=false; ls('totry_push_prefs',prefs);
    try{
      if(Notify.cancel){
        Notify.cancel('reminder_morning'); Notify.cancel('reminder_evening');
        _cancelReachOuts();
      }
    }catch(_){}
    showToast('Reminders off','Your mornings are your own. Re-enable anytime.');
    renderPushSettings();
    return;
  }
  try{
    const prefs=_pushPrefs(); prefs.enabled=false; ls('totry_push_prefs',prefs);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if(sub) await sub.unsubscribe();
    if(sb && currentUser) await sb.from('push_subscriptions').delete().eq('user_id', currentUser.id);
    showToast('Reminders off','Your mornings are your own. Re-enable anytime.');
  }catch(e){ console.error(e); }
  renderPushSettings();
}

async function savePushTimes(){
  // NATIVE: just reschedule the on-device notifications at the new times.
  if(typeof Notify!=='undefined' && Notify.isNative && Notify.isNative()){
    const m = document.getElementById('push-time-morning')?.value || '07:30';
    const ev = document.getElementById('push-time-evening')?.value || '21:00';
    const prefs=_pushPrefs(); prefs.morning=m; prefs.evening=ev; ls('totry_push_prefs',prefs);
    if(prefs.enabled) _scheduleNativeReminders(prefs);
    if(typeof haptic==='function') haptic('tick');
    showToast('Times saved ✓','Morning '+m+' · Evening '+ev+'.');
    return;
  }
  const m = document.getElementById('push-time-morning')?.value || '07:30';
  const ev = document.getElementById('push-time-evening')?.value || '21:00';
  const prefs=_pushPrefs(); prefs.morning=m; prefs.evening=ev; ls('totry_push_prefs',prefs);
  if(sb && currentUser){
    await sb.from('push_subscriptions').update({ remind_morning:m, remind_evening:ev, tz_offset_minutes:new Date().getTimezoneOffset() }).eq('user_id', currentUser.id);
  }
  haptic('tick'); showToast('Times saved \u2713','Morning ' + m + ' \u00b7 Evening ' + ev + '.');
}

// Keep the server copy fresh (subscriptions can rotate; timezone can change with travel)
async function syncPushSubscription(){
  try{
    const prefs=_pushPrefs();
    if(!prefs.enabled || !sb || !currentUser || !('PushManager' in window)) return;
    if(Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if(!sub) return;
    await sb.from('push_subscriptions').delete().eq('user_id', currentUser.id);
    await sb.from('push_subscriptions').insert({ user_id:currentUser.id, subscription:sub.toJSON(), tz_offset_minutes:new Date().getTimezoneOffset(), remind_morning:prefs.morning, remind_evening:prefs.evening });
  }catch(e){ console.warn('push sync skipped', e); }
}

// DOES iOS ACTUALLY ALLOW IT? renderPushSettings' native branch renders purely from the saved
// preference (totry_push_prefs), with a comment saying permission "is handled when they tap Enable". So
// if the person declined the system prompt, or granted it once and later turned notifications off in iOS
// Settings, the card still said reminders were on and still promised to "reach you even when the app is
// closed" — while iOS delivered nothing, forever, silently. Nothing in the app ever asked the system.
//
// This asks, after the row has rendered, and corrects it in place. Deliberately additive and async: it
// never blocks the render, and if the plugin can't answer it says nothing rather than guessing.
async function _verifyNativeNotifPermission(){
  try{
    if(!(typeof Notify!=='undefined' && Notify.isNative && Notify.isNative())) return;
    if(!_pushPrefs().enabled) return;                    // nothing is being claimed, nothing to correct
    const P = (window.Capacitor && window.Capacitor.Plugins) || {};
    const L = P.LocalNotifications;
    if(!L || !L.checkPermissions) return;                // can't ask — don't invent an answer
    const r = await L.checkPermissions();
    if(r && r.display === 'granted') return;             // the card is telling the truth
    const box = document.getElementById('push-settings-card');
    if(!box || box.querySelector('.notif-perm-warn')) return;
    const warn = document.createElement('div');
    warn.className = 'notif-perm-warn';
    warn.style.cssText = 'margin-top:10px;padding:10px 12px;border:1px solid var(--go-bd);background:var(--go-bg);border-radius:8px;font-size:12px;color:var(--go);line-height:1.55';
    warn.textContent = 'Reminders are switched on in here, but iOS is not allowing notifications — so nothing can actually reach you. Turn them on in iOS Settings \u2192 Notifications \u2192 To Try.';
    box.appendChild(warn);
  }catch(_){}
}

function renderPushSettings(){
  const box=document.getElementById('push-settings-card'); if(!box) return;
  const prefs=_pushPrefs();
  const reachOn = !ls('totry_reachout_off');
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
  const head='<div class="eyebrow" style="color:var(--go);margin-bottom:6px">Daily reminders</div>';
  // NATIVE: the wrapped app has no PushManager and isn't "standalone" by the web test, so the web
  // branches below would wrongly say "can't receive notifications" / "add to Home Screen" and never
  // show the button. Render the real reminders UI here, keyed on the saved preference (native
  // permission is handled when they tap Enable), and return before the web-only checks.
  if(typeof Notify!=='undefined' && Notify.isNative && Notify.isNative()){
    if(prefs.enabled){
      box.innerHTML = head +
        '<div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:10px">A nudge for your morning ritual and your evening reflection — the rhythm of the day, kept. These reach you even when the app is closed.</div>' +
        '<div style="display:flex;gap:8px;margin-bottom:10px">' +
          '<div style="flex:1;min-width:0"><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">Morning</div><input type="time" id="push-time-morning" value="'+prefs.morning+'" style="width:100%;padding:9px;color-scheme:dark"></div>' +
          '<div style="flex:1;min-width:0"><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">Evening</div><input type="time" id="push-time-evening" value="'+prefs.evening+'" style="width:100%;padding:9px;color-scheme:dark"></div>' +
        '</div>' +
        '<button class="btn" onclick="savePushTimes()" style="background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go);font-size:12px;margin-bottom:8px">Save times</button>' +
        // The receptivity gate's real row — toggle AND quiet hours AND why nothing is scheduled.
        // A stripped hand-rolled copy used to live here, which meant quiet hours could never be set
        // (quietHours() was permanently the 22:00–07:00 default) and a stand-down was invisible.
        _reachOutRowHTML() +
        '<button class="btn" onclick="disablePushReminders()" style="background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12px">Turn reminders off</button>';
    } else {
      box.innerHTML = head +
        '<div style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:10px">Two gentle nudges a day — one to begin your morning, one to close the day — and, if you want it, a quiet check-in at your hardest hour. They reach you even when the app is closed. Nothing else, ever.</div>' +
        '<button class="btn primary" onclick="enablePushReminders()">Enable reminders</button>';
    }
    // Then ask the SYSTEM whether any of that is actually true (see below).
    try{ _verifyNativeNotifPermission(); }catch(_){}
    return;
  }
  if(!('Notification' in window) || !('PushManager' in window)){
    box.innerHTML = head + '<div style="font-size:12px;color:var(--tx3);line-height:1.6">This browser cannot receive notifications. On iPhone: open in Safari and add To Try to your Home Screen first.</div>';
    return;
  }
  if(ios && !_isStandalone()){
    box.innerHTML = head +
      '<div style="font-size:13px;color:var(--tx2);line-height:1.65">To get morning and evening reminders on iPhone, To Try needs to live on your Home Screen first:</div>' +
      '<div style="font-size:12px;color:var(--tx3);line-height:1.7;margin-top:8px">1. Tap the <b>Share</b> button in Safari<br>2. Choose <b>Add to Home Screen</b><br>3. Open To Try from your Home Screen and come back here</div>';
    return;
  }
  if(prefs.enabled && Notification.permission==='granted'){
    box.innerHTML = head +
      '<div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:10px">A nudge for your morning ritual and your evening reflection — the rhythm of the day, kept.</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
        '<div style="flex:1;min-width:0"><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">Morning</div><input type="time" id="push-time-morning" value="'+prefs.morning+'" style="width:100%;padding:9px;color-scheme:dark"></div>' +
        '<div style="flex:1;min-width:0"><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px">Evening</div><input type="time" id="push-time-evening" value="'+prefs.evening+'" style="width:100%;padding:9px;color-scheme:dark"></div>' +
      '</div>' +
      '<button class="btn" onclick="savePushTimes()" style="background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go);font-size:12px;margin-bottom:8px">Save times</button>' +
      // Reach-out-first — the one thing a web PWA could never do; real once wrapped natively. The
      // row is shown here because quiet hours are worth setting either way (they gate the in-app
      // presence too), but it says plainly that the buzz itself waits for the installed app rather
      // than implying a background nudge the browser cannot deliver.
      _reachOutRowHTML() +
      '<button class="btn" onclick="disablePushReminders()" style="background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12px">Turn reminders off</button>';
  } else {
    box.innerHTML = head +
      '<div style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:10px">Two gentle nudges a day — one to begin your morning, one to close the day. Nothing else, ever. You choose the times.</div>' +
      '<button class="btn primary" onclick="enablePushReminders()">Enable reminders</button>';
  }
}

// Turn the risk-window reach-out on/off. Anti-nagging is sacred — the person is always in control.
// Turn the risk-window reach-out on/off. Anti-nagging is sacred — the person is always in control,
// and turning it back on clears any stand-down, because a choice they make now outranks our caution.
function toggleReachOut(){
  const turningOff = !ls('totry_reachout_off');
  ls('totry_reachout_off', turningOff);
  try{
    if(turningOff){ _cancelReachOuts(); _setReachState({ next:null, hold:'you turned this off' }); }
    else { _setReachState({ pausedUntil:0, hold:null }); if(typeof scheduleReachOut==='function') scheduleReachOut(); }
  }catch(_){}
  if(typeof haptic==='function') haptic('tap');
  if(typeof renderPushSettings==='function') renderPushSettings();
  showToast(turningOff?'Reach-out off':'Reach-out on', turningOff?'I won’t message you at your risk window.':'I’ll check in before your hardest hour — at most 3 times a week, never in your quiet hours.');
}

// ── HONEST METRICS ──
// Aggregate, anonymous product signals only: opens, installs, goal mode, reminders, imports.
// NEVER logged: vices, prayers, journals, food, weights — soul and body data stay the user's.
const GOATCOUNTER_CODE = 'totry'; // traffic + referrers 2192 totry.goatcounter.com (dashboard kept private)
function _anonId(){
  let id = localStorage.getItem('totry_anon');
  if(!id){ id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); localStorage.setItem('totry_anon', id); }
  return id;
}
// One switch turns BOTH counters off, everywhere. An app whose whole promise is "your confession stays
// yours" has to let a person decline being counted at all — and the privacy policy has to describe
// exactly this and nothing more.
// One-time cleanup: earlier builds synced totry_progress_photos to the server while both privacy
// policies said photos never leave the device. The key is out of SYNC_KEYS now; this clears whatever
// a previous version already uploaded, so the policy is true retroactively and not just going forward.
async function _purgeSyncedPhotos(){
  try{
    if(localStorage.getItem('totry_photos_purged')==='1') return;
    if(!(typeof sb!=='undefined' && sb) || !(typeof currentUser!=='undefined' && currentUser)) return;
    // The real schema is ONE ROW PER KEY — {user_id, data_key, data_value, updated_at} — which is what
    // flushOutbox upserts and pullFromCloud selects. This used to .select('data') and look for a single
    // blob holding every key, a shape that does not exist: the query errored, `d` was undefined, the
    // delete never ran, and the 'purged' flag was set anyway so it never retried. A permanent no-op
    // guarding a privacy-policy promise. Delete the row, and only claim success if the server confirms.
    const { error } = await sb.from('user_data').delete()
      .eq('user_id', currentUser.id)
      .eq('data_key', _cloudKey('totry_progress_photos'));
    if(error){ console.warn('[purge] photos:', error); return; }   // no flag — try again next launch
    localStorage.setItem('totry_photos_purged','1');
  }catch(_){ /* retried next launch */ }
}
function metricsOff(){ try{ return localStorage.getItem('totry_no_metrics')==='1'; }catch(_){ return false; } }
function toggleMetrics(){
  const off = !metricsOff();
  try{ localStorage.setItem('totry_no_metrics', off?'1':'0'); }catch(_){}
  try{ showToast(off?'Counting off':'Counting on', off?'You won’t be counted at all. Nothing changes about how the app works for you.':'Thank you — anonymous counts only, never what you log.'); }catch(_){}
  try{ const b=document.getElementById('metrics-toggle-btn'); if(b) b.textContent = off?'Off':'On ✓'; }catch(_){}
}
function logEvent(name, detail){
  try{
    if(metricsOff()) return;
    if(sb){ sb.from('app_events').insert({ anon_id:_anonId(), event:name, detail:detail||null, standalone:(typeof _isStandalone==='function'&&_isStandalone()) }).then(()=>{},()=>{}); }
    if(window.goatcounter && window.goatcounter.count){ window.goatcounter.count({ path:'/e/'+name, event:true }); }
  }catch(_){ }
}
if(GOATCOUNTER_CODE && !metricsOff()){
  const g=document.createElement('script'); g.async=true; g.src='https://gc.zgo.at/count.js';
  g.setAttribute('data-goatcounter','https://'+GOATCOUNTER_CODE+'.goatcounter.com/count');
  document.head.appendChild(g);
}

// (Removed a duplicate focusin auto-scroll handler that double-fired with the keyboard-centering
// logic above, causing janky double-scroll when a field was focused. The handler near setVH/
// centerFocused is the single source of truth for centering focused fields.)
// ── PHASE 0: SCHEMA MIGRATIONS ─────────────────────────────────
// Runs on every load. Idempotent, versioned migrations so a future release can change a data
// shape without ever corrupting the data already on a user's device. Bump CURRENT_SCHEMA and add
// a numbered step. Each step must be safe to run on data that's already been migrated.
const CURRENT_SCHEMA = 1;
// Throttled, anonymous error logging (Phase 0). Lets the dev see if a release is breaking for real
// users, via the existing app_events pipeline. NEVER logs personal data — only the error message,
// source file/line, and a count. Max a few per session so one looping error can't spam the table.
(function(){
  let _errCount = 0;
  window.addEventListener('error', function(e){
    try{
      if(_errCount >= 5) return; _errCount++;
      const msg = (e && e.message ? String(e.message) : 'unknown').slice(0,200);
      const where = (e && e.filename ? String(e.filename).split('/').pop() : '') + ':' + (e && e.lineno ? e.lineno : '');
      if(typeof logEvent === 'function') logEvent('jserror', (msg + ' @ ' + where).slice(0,300));
    }catch(_){ }
  });
})();
function runSchemaMigrations(){
  let v = parseInt(ls('totry_schema') || '0', 10);
  if(isNaN(v)) v = 0;
  if(v >= CURRENT_SCHEMA){ return; }
  try{
    // v0 → v1: establish the baseline. Self-heal nutrition goals missing carbs/fat (the Nourish
    // fix) so older goals get correct macros even if the user never re-saves.
    if(v < 1){
      try{
        const g = ls('totry_nut_goals');
        if(g && g.cal && (g.carb==null || g.fat==null) && typeof withDerivedMacros==='function'){
          ls('totry_nut_goals', withDerivedMacros(g));
        }
      }catch(_){ }
    }
    // (future steps: if(v < 2){ ... } etc.)
    ls('totry_schema', CURRENT_SCHEMA);
  }catch(e){ /* never let a migration break boot */ console.warn('migration skipped', e); }
}

async function initApp(){
  try{ if(typeof runSchemaMigrations === 'function') runSchemaMigrations(); }catch(_){ }
  try{ if(typeof _purgeSyncedPhotos==='function') _purgeSyncedPhotos(); }catch(_){ }
  try{ if(typeof _watchA11y==='function') _watchA11y(); }catch(_){ }
  try{ if(typeof _initHealthAutoSync==='function') _initHealthAutoSync(); }catch(_){ }
  // Demo mode has to survive a reload, or the first restart silently turns syncing back on and starts
  // pushing a persona named Alex into a real account. Re-assert both facts, and show the banner.
  try{
    if(typeof inDemoMode==='function' && inDemoMode()){
      syncEnabled = false;
      if(typeof _demoBanner==='function') _demoBanner();
    }
  }catch(_){ }
  // One-time: clear a reach-out log poisoned by the web phantom-send bug. Until now every entry was
  // written whether or not a notification was actually scheduled, and web can't background-fire —
  // so the log in the wild is all phantoms, already marked unanswered, and may have stood the
  // channel down for two weeks over nudges nobody ever received. Drop the unsent ones and lift a
  // stand-down that only phantoms caused, so the gate starts honest.
  try{
    if(!ls('totry_reach_phantom_purged')){
      const a=_reachLog().filter(function(e){ return e && e.sent===true; });
      _saveReachLog(a);
      if(_reachUnansweredRun() < 3) _setReachState({ pausedUntil:0 });
      ls('totry_reach_phantom_purged', 1);
    }
  }catch(_){ }
  // Receptivity bookkeeping, first thing: mark that they're here (so nothing buzzes them while they
  // are), then judge whether the reach-outs we already sent actually landed.
  try{ if(typeof _touchActive==='function') _touchActive(); }catch(_){}
  try{ if(typeof _resolveReachOuts==='function') _resolveReachOuts(); }catch(_){}
  // Swipe-down-to-dismiss on the companion sheet — the iOS convention thumbs expect. Drag the sheet
  // down and it follows your finger; release past a threshold and it closes like a native sheet.
  try{
    const sheet = document.getElementById('companion-overlay');
    if(sheet && !sheet._swipeWired){
      sheet._swipeWired = true;
      let startY=0, curY=0, dragging=false;
      sheet.addEventListener('touchstart', (e)=>{
        // Only start a dismiss-drag from near the top of the sheet (the handle zone) AND when the
        // sheet is scrolled to the top — so it never fights with scrolling the content.
        if(sheet.scrollTop > 4) return;
        startY = e.touches[0].clientY; curY = startY; dragging = true;
        sheet.style.transition = 'none';
      }, {passive:true});
      sheet.addEventListener('touchmove', (e)=>{
        if(!dragging) return;
        curY = e.touches[0].clientY;
        const dy = curY - startY;
        if(dy > 0){ sheet.style.transform = 'translateY('+dy+'px)'; }
      }, {passive:true});
      sheet.addEventListener('touchend', ()=>{
        if(!dragging) return;
        dragging = false;
        sheet.style.transition = '';
        const dy = curY - startY;
        if(dy > 110){ // past threshold → dismiss
          if(typeof dismissCompanion==='function') dismissCompanion();
          setTimeout(()=>{ sheet.style.transform=''; }, 300);
        } else {
          sheet.style.transform = ''; // snap back
        }
      });
    }
  }catch(_){}
  // Set the app-wide daypart ambience immediately and refresh it every 10 min, so the WHOLE app
  // breathes with the day no matter which screen you're on (not just the home hero).
  try{
    const _setDaypart=()=>{ const h=new Date().getHours(); const dp = (h>=21||h<5)?'night':(h<12?'dawn':(h<17?'day':'dusk')); document.body.setAttribute('data-daypart',dp); };
    _setDaypart(); setInterval(_setDaypart, 600000);
  }catch(_){}
  try{
    const _go = new URLSearchParams(location.search).get('go');
    if(_go){ setTimeout(()=>{ try{ go(_go); }catch(_){} }, 350); history.replaceState({}, '', location.pathname); }
  }catch(_){ }
  if('clearAppBadge' in navigator){ try{ navigator.clearAppBadge(); }catch(_){ } }
  if(typeof syncPushSubscription === 'function') setTimeout(syncPushSubscription, 1500);
  if(typeof flushFeedbackOutbox === 'function') setTimeout(flushFeedbackOutbox, 4000);
  if(typeof repairJourneyStart === 'function') repairJourneyStart();
  // Apply saved theme immediately to avoid FOUC
  if(typeof applyTheme === 'function') applyTheme(ls('totry_theme') || 'dark');
  userName=ls('totry_name')||'Friend';
  if(!ls('totry_start'))ls('totry_start',new Date().toISOString());
  // Set the day
  vi = pickAdaptiveVerseIndex();
  if(typeof pickDailyContextualVerse==='function'){ vi = pickDailyContextualVerse(); } showV(activeVerses()[vi]);
  try{ if(typeof applyFaithGlobal==='function') applyFaithGlobal(); }catch(_){}
  try{ if(typeof applyFaithLabels==='function') applyFaithLabels(); }catch(_){}
  // The static shell paints '$' before any JS runs; this corrects it to the person's own symbol.
  // It sits with the other applyX() passes because it is the same kind of thing: markup that declared
  // what it wants, and one function that gives it.
  try{ if(typeof applyCurrencySymbols==='function') applyCurrencySymbols(); }catch(_){}
  // Re-assert the app-lock flag into UserDefaults each launch: a device that had the lock on before
  // this shipped has nothing in the native mirror, so its very first backgrounding would be uncovered.
  try{ if(typeof Lock==='object' && Lock._mirrorToNative) Lock._mirrorToNative(Lock.enabled()); }catch(_){}
  // Background: refresh currency rates if user has set a preference different from base
  if(typeof fetchCurrencyRates === 'function') fetchCurrencyRates(getUserCurrency());
  // Personalise coach
  const cw=document.getElementById('coach-welcome');
  if(cw)cw.textContent='Hey '+userName+'. Day '+getDayCount()+'. Your coach is here \u2014 vices, faith, habits, finances, training. What do you need right now?';
  // PT coach
  const ptw=document.getElementById('pt-coach-welcome');
  if(ptw)ptw.textContent='Your PT coach. What do you need today?';
  // Core renders
  initHabits();renderHabits();
  loadF();renderFinance();
  loadV();renderVices();renderScoreboard();
  renderJournal();
  renderBody();updateTrackerDisplay();
  renderDayCounter();
  renderSavedVerses();
  // Sobriety clock
  startSobrietyClock();
  // Restore calorie app
  const ca=ls('totry_ca');if(ca){const cn=document.getElementById('cal-name');const ci=document.getElementById('cal-icon');if(cn)cn.textContent=ca.name;if(ci)ci.innerHTML=ca.icon;}
  // Debt strategy
  const strat=ls('totry_debt_strategy')||'snowball';setDebtStrategy(strat);
  // Milestones
  checkMilestones();
  // PWA checks
  checkIOSInstall();requestPersistentStorage();
  // Welcome back if installed PWA
  if(isStandalone()){
    const today=new Date().toLocaleDateString('en-AU');
    if(ls('totry_last_open')!==today){
      ls('totry_last_open',today);
      setTimeout(()=>showToast('Day '+getDayCount()+', '+userName,'Good to see you back. Let\'s make today count.'),1000);
    }
  }
  // Install button
  const installBtn=document.getElementById('pwa-install-btn');
  if(installBtn){installBtn.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;const b=document.getElementById('pwa-banner');if(b)b.style.display='none';});}
  renderHomeHabits();
  updatePartnerBtn();
  // Show "what's new" once per version (skips brand-new users), after a beat so it doesn't clash with welcome toast
  if(typeof checkChangelog === 'function') setTimeout(checkChangelog, 1600);
  // Meet him in his hard hour if he's opened the app inside it — the proactive "before it takes
  // over". After the welcome/changelog beats so it never stacks on top of them.
  if(typeof _maybeRiskWindowGreeting === 'function') setTimeout(_maybeRiskWindowGreeting, 2600);
  // Restore height
  const h=ls('totry_height');const hEl=document.getElementById('settings-height');if(hEl&&h)hEl.value=h;
  // AND the three daily targets beside it, which were NOT restored. saveAllTargets() reads each field
  // with a `|| default` fallback, so an empty box is indistinguishable from a deliberate 8000. Someone
  // who had set 12,000 steps, came back to change only their water goal, and tapped "Save targets" had
  // their step goal silently reset to 8000 and their sleep goal to 8 — on a settings screen, with a
  // toast confirming success. An input that feeds a defaulted save MUST show its current value.
  try{
    const restore = (id, key) => {
      const el = document.getElementById(id); if(!el) return;
      const v = ls(key); if(v !== null && v !== undefined && v !== '') el.value = v;
    };
    restore('settings-steps-goal', 'totry_step_goal');
    restore('settings-sleep-goal', 'totry_sleep_goal');
    restore('settings-water-goal', 'totry_water_goal');
  }catch(_){ }
  // Service worker — a PWA/WEB feature only. Inside the native Capacitor shell it intercepts the
  // local capacitor:// requests and, after a CACHE bump, can serve a stale/broken shell → blank
  // screen. Native already loads the bundled files directly, so there we UNREGISTER any existing SW
  // and clear its caches, and never register one. (This is standard Capacitor guidance.)
  const _isNativeShell = !!(window.Capacitor && (
    (typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
    (window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web')
  ));
  if(_isNativeShell){
    try{
      if(navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
        navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>{try{r.unregister();}catch(_){}})).catch(()=>{});
      }
      if(window.caches && caches.keys){ caches.keys().then(ks=>ks.forEach(k=>{try{caches.delete(k);}catch(_){}})).catch(()=>{}); }
    }catch(_){}
  } else if('serviceWorker' in navigator){
    let refreshing=false;
    // Was the page already controlled when it loaded? If yes, a later controllerchange means
    // a genuine UPDATE took over → reload to it. If NO (first-ever install), clients.claim
    // fires controllerchange too, but we must NOT reload — that would flash a new user's first open.
    const hadControllerAtLoad = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(hadControllerAtLoad && !refreshing){ refreshing=true; window.location.reload(); }
    });
    function activateWaiting(reg){
      if(reg && reg.waiting){ reg.waiting.postMessage('SKIP_WAITING'); }
    }
    // Show a small, non-blocking "update ready" banner instead of reloading from under the user
    // (a surprise reload can wipe an in-progress journal entry). They tap when ready; the new
    // worker then takes over → controllerchange → reload. Never nags: one banner per update.
    let _updateBannerShown=false;
    function showUpdateReady(reg){
      if(_updateBannerShown) return; _updateBannerShown=true;
      let bar=document.getElementById('update-ready-bar');
      if(!bar){
        bar=document.createElement('div');
        bar.id='update-ready-bar';
        bar.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(var(--sb,0px) + 150px);z-index:200;background:var(--bg2);border:1px solid var(--go-bd);border-radius:12px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,0.5);display:flex;align-items:center;gap:10px';
        bar.innerHTML='<div style="flex:1;font-size:13px;color:var(--tx);line-height:1.4">A new version is ready.</div>'+
          '<button class="btn primary" style="width:auto;padding:8px 14px;font-size:12px;margin:0" onclick="(function(){var b=document.getElementById(\'update-ready-bar\');if(b)b.remove();window.__doUpdate&&window.__doUpdate();})()">Refresh</button>'+
          '<button class="btn" style="width:auto;padding:8px 10px;font-size:12px;margin:0;background:none;border:none;color:var(--tx3)" onclick="(function(){var b=document.getElementById(\'update-ready-bar\');if(b)b.remove();})()">Later</button>';
        document.body.appendChild(bar);
      }
      window.__doUpdate=function(){ activateWaiting(reg); };
    }
    navigator.serviceWorker.register('./sw.js').then(reg=>{
      // If one is already waiting from a previous visit, offer the update now.
      if(reg && reg.waiting && navigator.serviceWorker.controller){ showUpdateReady(reg); }
      reg.addEventListener('updatefound',()=>{
        const nw=reg.installing;
        if(!nw) return;
        nw.addEventListener('statechange',()=>{
          // New worker installed AND an old one controls the page = an update is ready → offer it.
          if(nw.state==='installed' && navigator.serviceWorker.controller){
            showUpdateReady(reg);
          }
        });
      });
      // Suspended Home-Screen apps rarely close, so re-check for updates on focus/visibility/online.
      const recheck=()=>{ try{ reg.update(); }catch(_){ } if(reg.waiting && navigator.serviceWorker.controller) showUpdateReady(reg); };
      document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') recheck(); });
      window.addEventListener('focus', recheck);
      window.addEventListener('online', recheck);
      setTimeout(recheck, 3000);
    }).catch(()=>{});
  }
  // App is interactive — fade out the instant boot splash.
  if(typeof _clearBootSplash==='function') _clearBootSplash();
  // THE FRONT DOOR: after the app settles, the companion checks in. Time-aware
  // (morning defers to the day), throttled, one-tap dismiss — so it becomes the
  // reflex you reach for before the slip. This is the keystone of the whole app.
  // On open: if they've been away a few days, a warm welcome takes precedence (gentler than the
  // urge check-in). Otherwise the companion checks in. Never both — that would be overbearing.
  try{
    const life = (typeof getLifeState==='function') ? getLifeState() : null;
    const quiet = life && life.activity && life.activity.daysQuiet != null && life.activity.daysQuiet >= 3;
    if(quiet){ setTimeout(()=>{ if(typeof checkGoneQuietWelcome==='function') checkGoneQuietWelcome(); }, 1200); }
    else { setTimeout(()=>{ if(typeof maybeShowCompanion==='function') maybeShowCompanion(); }, 1200); }
  }catch(_){ }

  // LAND ON A HOME THAT IS ACTUALLY RENDERED. renderHomeGreeting, renderLifeWoven, renderNextStep and
  // checkPreviewBanner have exactly ONE call site between them — the `name==='home'` branch of go() —
  // and no launch path called it. Only finishOnboard() did, which is why the person who had just
  // onboarded saw a complete Home and everybody else did not: measured in a browser, a returning guest
  // on day 3 got 416 characters of Home on launch (a quote, the streak tiles, a habit grid) and 1274
  // after one tap of the Today nav, gaining "Good evening, Sam.", the single one-action CTA, the whole
  // "your life, woven" spine and the first-run foundation card that had been sitting at display:none.
  // Home is already the visible tab at this point, so this renders it rather than switching to it — no
  // flash. A ?go= deep link is handled on a 350ms timer above and still wins.
  if(typeof go === 'function') go(window.__currentTab || 'home');
}

// ── START ─────────────────────────────────────────────────────
// Initialize Supabase, then check auth status before showing app
// CRITICAL: start tracking localStorage writes IMMEDIATELY at boot — before auth completes.
// Previously enableSyncMonitoring() only ran after sign-in (inside startSyncLoop), so anything a
// user logged during the open→auth window (a vice win, a debt, a morning routine) was written with
// NO timestamp and NO outbox entry. The next pullFromCloud then saw lts=0 and let cloud clobber the
// local edit — silent data loss. Activating here means every write is timestamped + durably queued
// from the very first moment; the outbox survives offline and flushes once signed in.
try{ if(typeof enableSyncMonitoring === 'function') enableSyncMonitoring(); }catch(_){}
// One-time migration to the single-source burn ledger: if this device already has workouts, rebuild
// the aggregate from them so any previously double-counted "Burned" figure is corrected on load.
try{ if(typeof recomputeWorkoutBurns === 'function' && (ls('totry_workouts')||[]).length) recomputeWorkoutBurns(); }catch(_){}
// Apple Health: if already connected, pull today's steps + active energy on open (native only).
try{ if(typeof Health!=='undefined' && Health.connected() && Health.isNative()) Health.syncToday(); }catch(_){}
// The lock, last: the DOM exists by now, so the overlay covers a fully built screen rather than racing it.
try{ if(typeof maybeLockApp==='function') maybeLockApp(); }catch(_){}
initSupabase();
// Handle OAuth callbacks if returning from Strava or Google
if(window.location.search.includes('code=')){
  setTimeout(()=>{
    if(typeof handleStravaCallback==='function')handleStravaCallback();
    if(typeof handleGoogleHealthCallback==='function')handleGoogleHealthCallback();
  },500);
}
// Wait briefly for Supabase to init, then check auth
setTimeout(() => {
  checkAuthAndStart();
}, 300);
// Initialize notifications + return nudge after app settles
setTimeout(() => {
  if(typeof initNotifications === 'function') initNotifications();
  if(typeof checkReturnNudge === 'function') checkReturnNudge();
}, 4000);


function deleteJournalEntry(ts){
  if(!confirm('Delete this journal entry?'))return;
  const _before=ls('totry_journal')||[];
  const entries=_before.filter(e=>e.ts!==ts);
  tombstoneRemoved('totry_journal', _before, entries);   // or the next cloud pull unions it back
  ls('totry_journal',entries);renderJournal();
}

function calcTDEE(){
  const age=parseInt(document.getElementById('tdee-age')?.value||25);
  const weight=parseFloat(document.getElementById('tdee-weight')?.value||70);
  const height=parseFloat(document.getElementById('tdee-height')?.value||175);
  // A SEX ALREADY STATED WINS over this dropdown, always. prefillNutGoals() makes the control show the
  // truth, but this is the belt as well as the braces: if prefill has not run for any reason, the maths
  // still uses what the person actually told us, and the calculator cannot overwrite it. Settings ->
  // About you is where that changes. Persisted here only when nothing is known yet.
  const _storedSex = (typeof userSex==='function') ? userSex() : null;
  const sex = (_storedSex === 'male' || _storedSex === 'female')
    ? _storedSex
    : (document.getElementById('tdee-sex')?.value || 'male');
  if(!_storedSex){ try{ ls('totry_sex', sex); }catch(_){} }
  // SANITY FLOOR. These three feed a calorie target the person is asked to eat to, and there was no
  // bound on any of them: a mistyped weight of 7 (or 700) produced a confidently-wrong number with no
  // sign anything was off. Refuse rather than guess — a nonsense target is worse than no target, and this
  // is the same principle as the ED-safe floor two screens away.
  if(!(age >= 13 && age <= 100)){ showToast('Check your age', 'Enter an age between 13 and 100.'); return; }
  if(!(weight >= 30 && weight <= 300)){ showToast('Check your weight', 'Enter a weight between 30 and 300 kg.'); return; }
  if(!(height >= 120 && height <= 230)){ showToast('Check your height', 'Enter a height between 120 and 230 cm.'); return; }
  const activity=parseFloat(document.getElementById('tdee-activity')?.value||1.55);
  const goal=document.getElementById('tdee-goal')?.value||'maintain';
  // Mifflin-St Jeor equation
  let bmr;
  if(sex==='male') bmr=10*weight+6.25*height-5*age+5;
  else bmr=10*weight+6.25*height-5*age-161;
  const tdee=Math.round(bmr*activity);
  const targets={
    lose: {cal:tdee-500, pro:Math.round(weight*2.2), label:'Fat loss (-500 cal deficit)'},
    maintain: {cal:tdee, pro:Math.round(weight*1.8), label:'Maintenance'},
    gain: {cal:tdee+300, pro:Math.round(weight*2.4), label:'Muscle gain (+300 cal surplus)'},
  };
  const t=targets[goal];
  // Apply the SAME floor the adaptive path applies. Without this, calcTDEE persisted a sub-floor deficit
  // to totry_nut_goals and totry_nut_macros and nothing ever corrected it.
  try{
    const _fl=_calFloor();
    if(t && t.cal > 0 && t.cal < _fl){ t.cal = _fl; t.label = (t.label||'') + ' \u2014 held at a safe floor'; }
  }catch(_){}
  
  // Save TDEE inputs so PT layer can adjust later
  ls('totry_tdee_data', {age, weight, height, sex, activity, goal, tdee, ts: new Date().toISOString()});
  ls('totry_calorie_goal_type', goal);
  
  // Carbs & fat targets — derived so all four macros SUM to the calorie goal (fat ≈30% of the
  // calories left after protein, carbs take the rest). Shared with the manual-goal path via
  // withDerivedMacros so the two never disagree. (Was a 0.45/0.35 split summing to only 80% of
  // calories — the macros silently undershot the target by ~14%.)
  const _dm = withDerivedMacros({cal: t.cal, pro: t.pro});
  const carbsG = _dm.carb;
  const fatG = _dm.fat;
  // Save the targets immediately — ALL four macros so the top display reflects them
  ls('totry_nut_goals', {cal: t.cal, pro: t.pro, carb: carbsG, fat: fatG, _ts: Date.now()});
  ls('totry_nut_macros', {cal: t.cal, pro: t.pro, carb: carbsG, fat: fatG, _ts: Date.now()});
  // Refresh the progress display at the top so the new goals show right away
  if(typeof renderNutritionLog === 'function') renderNutritionLog();
  if(typeof prefillNutGoals === 'function') prefillNutGoals();
  const res=document.getElementById('tdee-result');
  if(res){
    res.style.display='block';
    res.innerHTML='<div style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">'+t.label+'</div>'+
      '<div class="macro-grid" style="margin-bottom:10px">'+
      '<div class="macro-met"><div class="mm-l">Calories</div><div class="mm-v cal">'+t.cal+'</div></div>'+
      '<div class="macro-met"><div class="mm-l">Protein</div><div class="mm-v pro">'+t.pro+'g</div></div>'+
      '<div class="macro-met"><div class="mm-l">Carbs</div><div class="mm-v carb">'+carbsG+'g</div></div>'+
      '<div class="macro-met"><div class="mm-l">Fat</div><div class="mm-v fat">'+fatG+'g</div></div>'+
      '</div>'+
      (function(){
        if(goal === 'maintain') return '';
        const verb = goal === 'lose' ? 'fat loss' : 'building muscle';
        const dir = goal === 'lose' ? 'deficit' : 'surplus';
        const amt = goal === 'lose' ? '500' : '300';
        let h = '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:14px;margin-bottom:8px;text-align:left">';
        h += '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">What ' + verb + ' actually asks of you</div>';
        h += '<div style="font-size:13px;color:var(--tx2);line-height:1.65">Your target sits at a <b>' + amt + '-calorie ' + dir + '</b> each day. In real terms: ';
        if(goal === 'lose'){ h += 'hitting your protein (' + t.pro + 'g) keeps muscle while the fat comes off, and the deficit is small on purpose \u2014 sustainable beats fast. Progress shows over weeks, not days, and the scale will bounce around from water and food. What matters is the <b>direction over a month</b>, not any single morning.'; }
        else { h += 'the surplus is deliberately small so most of what you gain is muscle, not fat. You\u2019ll need to <b>train hard and progress the weights</b> for it to go where you want, and hit your protein (' + t.pro + 'g) consistently. Gaining is slow \u2014 a little each month \u2014 and the scale moving up is part of the deal.'; }
        h += '</div><div style="font-size:12px;color:var(--tx3);line-height:1.6;margin-top:10px;font-style:italic">This is the work, not a promise. Life happens \u2014 weeks you fall short aren\u2019t failure, they\u2019re part of it. Keep coming back. The least you can do is try.</div></div>';
        return h;
      })()+
      "<div style=\"background:var(--gr-bg);border:1px solid var(--gr-bd);border-radius:8px;padding:10px;font-size:12px;color:var(--gr);text-align:center;margin-bottom:8px\">&#10003; Saved as your daily targets</div>" + 
      (function(){
        // Apple Watch goal helper. Their Watch "Move" ring tracks ACTIVE calories (on top of the
        // calories the body burns at rest). We derive a sensible active-calorie target from the
        // gap between their full TDEE and their resting burn (BMR), nudged by their goal, plus a
        // standard Exercise-minutes target. These are starting points, not medical targets.
        try{
          const restBurn = Math.round(bmr);
          let activeTarget = Math.max(250, Math.round(tdee - restBurn)); // the "moving" portion of the day
          if(goal === 'lose') activeTarget = Math.round(activeTarget * 1.15); // a touch higher to support the deficit
          if(goal === 'gain') activeTarget = Math.round(activeTarget * 0.9);  // a touch lower so the surplus isn't eaten by cardio
          activeTarget = Math.round(activeTarget/10)*10;
          const exerciseMin = goal === 'lose' ? 45 : 30;
          return "<div style=\"background:var(--bg3);border:1px solid var(--bd);border-radius:8px;padding:12px;margin-bottom:8px\">"+
            "<div style=\"font-family:'DM Mono',monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px\">&#8986; Apple Watch goals to set</div>"+
            "<div style=\"display:flex;justify-content:space-between;font-size:13px;color:var(--tx);margin-bottom:5px\"><span>Move (active calories)</span><b>"+activeTarget+" cal</b></div>"+
            "<div style=\"display:flex;justify-content:space-between;font-size:13px;color:var(--tx);margin-bottom:5px\"><span>Exercise</span><b>"+exerciseMin+" min</b></div>"+
            "<div style=\"display:flex;justify-content:space-between;font-size:13px;color:var(--tx);margin-bottom:10px\"><span>Stand</span><b>12 hrs</b></div>"+
            "<div style=\"font-size:11px;color:var(--tx3);line-height:1.55\">On your iPhone: <b>Fitness app &rarr; your profile &rarr; Change Goals</b>. \u201CMove\u201D is the active calories you burn above resting \u2014 it does <i>not</i> include the ~"+restBurn+" cal your body uses at rest. So a full day \u2248 "+restBurn+" resting + "+activeTarget+" active &asymp; "+(restBurn+activeTarget)+" total burned, which lines up with your "+tdee+"-cal maintenance.</div>"+
          "</div>";
        }catch(e){ return ''; }
      })() +
"<button class=\"btn\" onclick=\"document.getElementById(&apos;tdee-result&apos;).style.display=&apos;none&apos;\">Got it</button>";
  }
  ls('totry_height',height);
  renderNutritionLog();
  haptic('success');
  // Same duty-of-care check as the manual goal path
  if(t.cal > 0 && t.cal <= _calFloor()){   // was a hardcoded 1200 — a man below his own 1500 floor got no warning at all
    setTimeout(() => { if(typeof showLowCalorieCare==='function') showLowCalorieCare(); }, 600);
  }
}
// Ensures a goals object has sensible carb/fat targets derived from cal + protein when missing,
// so the macro legend never shows 0g for a real calorie goal. Pure; returns a new object.
function withDerivedMacros(g){
  if(!g || !g.cal) return g || {};
  const out = Object.assign({}, g);
  const pro = out.pro || 0;
  if(out.carb==null || out.fat==null || (out.carb===0 && out.fat===0)){
    const remain = Math.max(0, out.cal - pro*4);
    if(out.fat==null || out.fat===0) out.fat = Math.round((remain*0.30)/9);
    const fatCal = (out.fat||0)*9;
    if(out.carb==null || out.carb===0) out.carb = Math.round(Math.max(0, remain - fatCal)/4);
  }
  return out;
}



