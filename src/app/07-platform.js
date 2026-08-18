// ── SAVING A FILE, ON A PHONE ───────────────────────────────────────────────────────────────────
// Every "save this" path used the web pattern: URL.createObjectURL(blob) then a synthetic click on an
// <a download>. That works in a browser and does NOTHING in a WKWebView — downloads there need a
// WKDownloadDelegate (iOS 14.5+) and Capacitor's bridge does not install one. So in the App Store build,
// tapping Export produced no file, no error and no explanation. It silently broke the app's entire
// data-custody promise — privacy.html says "Export everything" — plus the CSV exports, the progress
// collage and the shareable day card.
//
// One helper now, so no save path can drift back to the broken pattern. Native gets the share sheet,
// which is better than a download anyway: save to Files, AirDrop, message it, open it elsewhere — one
// action instead of "downloaded, now go find it". The web keeps the download it always had.
const SaveFile = {
  _p(){ try{ const P=(window.Capacitor&&window.Capacitor.Plugins)||{}; return P.ShareFile || P.ShareFilePlugin || null; }catch(_){ return null; } },
  isNative(){ try{ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }catch(_){ return false; } },
  _b64(blob){
    return new Promise(function(res, rej){
      const r = new FileReader();
      r.onload = function(){ const s=String(r.result||''); res(s.slice(s.indexOf(',')+1)); };
      r.onerror = function(){ rej(new Error('could not read the file')); };
      r.readAsDataURL(blob);
    });
  },
  // The one entry point. Returns true if the file reached the person, false if it could not — and null
  // if they CANCELLED, which is neither. That distinction matters: the plugin resolves {ok:true,
  // completed:false} when someone dismisses the share sheet, and reading only .ok made every caller
  // announce "Ready — save it or share it, your call" to a person who had just decided not to. Callers
  // treat null as "say nothing"; they chose, and a toast congratulating them on it is a small lie.
  async save(blob, filename, title){
    try{
      const p = this._p();
      if(this.isNative() && p){
        const base64 = await this._b64(blob);
        const r = await p.share({ filename: filename, base64: base64, title: title || filename });
        if(r && r.ok && r.completed === false) return null;   // dismissed, not failed
        return !!(r && r.ok);
      }
    }catch(e){
      // Fall through to the web path rather than failing outright — better a download attempt than nothing.
      try{ console.warn('[SaveFile] native share failed, falling back', e); }catch(_){}
    }
    try{
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ try{ URL.revokeObjectURL(url); }catch(_){} }, 4000);
      return true;
    }catch(_){ return false; }
  }
};

// ── APP LOCK — Face ID / Touch ID / passcode ─────────────────────────────────────────────────────
// This app holds vice logs, confessions, journal entries, prayers and money. People hand their unlocked
// phone to a partner, a friend, a child. A PWA cannot lock itself by any means, so this is one of the few
// things the wrapper genuinely unlocks — and it serves the soul directly: a place you can be completely
// honest has to be a place that is safe.
//
// THE FIRST RULE IS NOT LOCKING SOMEONE OUT OF THEIR OWN JOURNAL. The plugin uses iOS's
// deviceOwnerAuthentication, so the passcode is always a fallback to Face ID; and every path that could
// possibly trap a person — no biometry, no passcode, biometrics un-enrolled later, the plugin missing
// entirely (the web) — turns the lock OFF and lets them in, rather than holding the door shut.
// The preference is deliberately NOT in SYNC_KEYS: a lock belongs to a device, and syncing it would lock
// a new phone before Face ID had ever been set up on it.
const Lock = {
  _p(){ try{ const P=(window.Capacitor&&window.Capacitor.Plugins)||{}; return P.Biometric || P.BiometricPlugin || null; }catch(_){ return null; } },
  enabled(){ try{ return ls('totry_lock_on') === true; }catch(_){ return false; } },

  // MIRROR THE FLAG WHERE UIKIT CAN SEE IT.
  //
  // iOS photographs the screen when the app resigns active and shows that image in the app switcher,
  // to anyone holding the phone, with no Face ID in the way — so the lock was being handed away at the
  // exact moment it existed to prevent. AppDelegate covers the window before the snapshot, but it runs
  // in UIKit and cannot read the WebView's localStorage (and willResignActive is synchronous, so an
  // async read would arrive after the photograph).
  //
  // @capacitor/preferences writes to UserDefaults, which UIKit CAN read synchronously. This is called
  // wherever totry_lock_on changes, so one setting still governs both halves — a second source of
  // truth that could drift is exactly how a lock ends up on in one layer and off in the other.
  async _mirrorToNative(on){
    try{
      const P = (window.Capacitor && window.Capacitor.Plugins) || {};
      if(P.Preferences && P.Preferences.set) await P.Preferences.set({ key:'totry_lock_on', value: on ? 'true' : 'false' });
    }catch(_){ }
  },
  async capability(){
    const p=this._p(); if(!p) return { available:false, kind:'none' };
    try{ return (await p.isAvailable()) || { available:false, kind:'none' }; }
    catch(_){ return { available:false, kind:'none' }; }
  },
  // What to call it on screen. Never "biometrics" — people know Face ID.
  label(kind){ return kind==='faceId' ? 'Face ID' : kind==='touchId' ? 'Touch ID' : 'your passcode'; },
  async prove(reason){
    const p=this._p(); if(!p) return { ok:false, unavailable:true };
    try{ return (await p.authenticate({ reason: reason || 'Unlock To Try' })) || { ok:false }; }
    catch(e){ console.warn('[Lock] authenticate threw', e); return { ok:false, unavailable:true }; }
  }
};

let _lockShown = false;
let _lockHiddenAt = 0;

function _lockOverlay(){
  let el = document.getElementById('app-lock');
  if(el) return el;
  el = document.createElement('div');
  el.id = 'app-lock';
  // Covers everything, including any open sheet, and cannot be dismissed by tapping away.
  el.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--bg,#0a0a0c);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;text-align:center';
  el.innerHTML =
    '<div style="font-size:34px">\u{1F512}</div>' +
    '<div style="font-family:Cormorant Garamond,serif;font-size:28px;color:var(--go)">To Try</div>' +
    '<div id="app-lock-msg" style="font-size:13px;color:var(--tx2);line-height:1.6;max-width:280px">Locked — just for you.</div>' +
    '<button class="btn primary" id="app-lock-btn" style="max-width:240px" onclick="unlockApp()">Unlock</button>' +
    // CRISIS HELP IS NEVER BEHIND A GATE. The sign-in screen states the rule in its own comment
    // ("Crisis help must never sit behind a login") and carries the numbers for exactly that reason —
    // but this overlay is opaque at z-index 100000, so it covers them along with everything else. A
    // cancelled Face ID, or a face it will not read at 2am, left a person on a black screen with one
    // button and no way to reach a human. These numbers are hardcoded, need no network and no account,
    // and reveal nothing private, so carrying them here costs the lock nothing at all.
    '<div style="margin-top:6px;padding-top:14px;border-top:1px solid var(--bd);max-width:300px">' +
      '<div style="font-size:11.5px;color:var(--tx3);line-height:1.6;margin-bottom:6px">Need real help right now? You don&#8217;t have to unlock anything.</div>' +
      '<div style="font-size:12.5px;line-height:1.9;color:var(--tx3)">' +
        '&#127462;&#127482; Lifeline <a href="tel:131114" style="color:var(--go);text-decoration:none">13 11 14</a> &nbsp;&#183;&nbsp; ' +
        '&#127482;&#127480; <a href="tel:988" style="color:var(--go);text-decoration:none">988</a> &nbsp;&#183;&nbsp; ' +
        '&#127468;&#127463; <a href="tel:116123" style="color:var(--go);text-decoration:none">116 123</a><br>' +
        '&#127760; <a href="https://findahelpline.com" target="_blank" rel="noopener" style="color:var(--bl);text-decoration:none">findahelpline.com</a> &mdash; anywhere in the world' +
      '</div>' +
    '</div>';
  document.body.appendChild(el);
  return el;
}

async function unlockApp(){
  const msg = document.getElementById('app-lock-msg');
  if(msg) msg.textContent = 'Verifying…';
  const r = await Lock.prove('Unlock To Try');
  if(r && r.ok){
    _lockShown = false;
    const el = document.getElementById('app-lock'); if(el) el.remove();
    if(typeof haptic==='function') haptic('light');
    return;
  }
  if(r && r.unavailable){
    // The trap case. Turn the lock off and open the app — never leave someone shut out of their own words.
    try{ ls('totry_lock_on', false); }catch(_){}
    try{ Lock._mirrorToNative(false); }catch(_){}
    _lockShown = false;
    const el = document.getElementById('app-lock'); if(el) el.remove();
    try{ if(typeof renderLockRow==='function') renderLockRow(); }catch(_){}
    if(typeof showToast==='function'){
      showToast('Lock turned off', ((r && r.reason) || 'This device can no longer verify it’s you.') + ' Turn it back on any time.');
    }
    return;
  }
  if(msg) msg.textContent = (r && r.cancelled) ? 'Tap Unlock when you’re ready.' : ((r && r.reason) || 'That didn’t verify. Try again.');
}

// force=true re-locks even if the overlay was shown before (used on return from the background).
function maybeLockApp(force){
  try{
    if(!Lock.enabled()) return;
    // On the web there is nothing to unlock WITH, so a lock there is a locked door with no key.
    if(!(typeof isNativeApp==='function' && isNativeApp())) return;
    if(_lockShown && !force) return;
    _lockShown = true;
    _lockOverlay();
    unlockApp();
  }catch(e){ console.warn('[Lock] gate failed', e); }
}

document.addEventListener('visibilitychange', function(){
  try{
    if(document.visibilityState === 'hidden'){ _lockHiddenAt = Date.now(); return; }
    // Only after a real absence. Presenting the share sheet, the camera scanner or a permission prompt
    // also hides the web view, and demanding Face ID on the way back from those would be maddening.
    // The stated threat model is "people hand their unlocked phone to a partner, a friend, a child" —
    // and a 20-second grace window defeats exactly that: hand the phone over, they reopen To Try within
    // twenty seconds, and the journal is simply there. The window exists for a real reason (the share
    // sheet, the barcode scanner and permission prompts all hide the web view), so it is kept but cut to
    // a length that covers a returning dialog without covering a handover.
    if(_lockHiddenAt && (Date.now() - _lockHiddenAt) > 2500) maybeLockApp(true);
  }catch(_){}
});

// ── The Settings row. Hidden unless this device can really honour a lock. ──
async function renderLockRow(){
  try{
    const row = document.getElementById('lock-row'); if(!row) return;
    const native = (typeof isNativeApp==='function' && isNativeApp());
    if(!native){ row.style.display='none'; return; }
    const cap = await Lock.capability();
    if(!cap.available){
      // Say why, rather than hiding a feature they may be looking for.
      row.style.display = '';
      const k = document.getElementById('lock-kind'); if(k) k.textContent = 'Face ID';
      const sub = document.getElementById('lock-sub');
      if(sub) sub.textContent = cap.reason || 'Set up Face ID or a passcode on this iPhone first.';
      const btn = document.getElementById('lock-btn');
      if(btn){ btn.textContent = 'Unavailable'; btn.disabled = true; btn.style.opacity = '.45'; }
      return;
    }
    row.style.display = '';
    const k = document.getElementById('lock-kind'); if(k) k.textContent = Lock.label(cap.kind);
    const on = Lock.enabled();
    const sub = document.getElementById('lock-sub');
    if(sub) sub.textContent = on
      ? 'On. Asked when you open the app, and when you come back to it.'
      : 'Your journal, your fight and your money, behind ' + Lock.label(cap.kind) + '. Off by default.';
    const btn = document.getElementById('lock-btn');
    if(btn){ btn.disabled = false; btn.style.opacity = ''; btn.textContent = on ? 'Turn off' : 'Turn on'; }
  }catch(e){ console.warn('[Lock] row failed', e); }
}

async function toggleAppLock(){
  const on = Lock.enabled();
  // Prove it works BEFORE committing to it — turning a lock on without testing it is how someone ends up
  // locked out. And require the same proof to turn it off, so grabbing an open phone can't quietly
  // remove the protection for good.
  const r = await Lock.prove(on ? 'Turn off the lock on To Try' : 'Turn on the lock for To Try');
  if(r && r.unavailable){
    try{ ls('totry_lock_on', false); }catch(_){}
    try{ Lock._mirrorToNative(false); }catch(_){}
    if(typeof showToast==='function') showToast('Not available', (r.reason||'This device can’t verify it’s you.'));
    renderLockRow(); return;
  }
  if(!(r && r.ok)){
    if(!(r && r.cancelled) && typeof showToast==='function') showToast('Not changed', (r && r.reason) || 'That didn’t verify.');
    return;
  }
  try{ ls('totry_lock_on', !on); }catch(_){}
  try{ Lock._mirrorToNative(!on); }catch(_){}
  if(typeof haptic==='function') haptic('success');
  if(typeof showToast==='function'){
    showToast(!on ? 'Lock on' : 'Lock off', !on ? 'To Try will ask for you when it opens.' : 'The app opens without asking now.');
  }
  renderLockRow();
}

