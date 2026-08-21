// ── SETTINGS HELPERS ──────────────────────────────────────────
function togglePartner(){
  const current=ls('totry_partner')||false;
  ls('totry_partner',!current);
  updatePartnerBtn();
  showToast(!current?'Reach-out reminder on':'Reach-out reminder off',!current?'Your evening will nudge you to reach out to someone you love.':'Evening reach-out nudge disabled.');
}

function updatePartnerBtn(){
  const btn=document.getElementById('partner-toggle-btn');
  if(btn)btn.textContent=ls('totry_partner')?'On ✓':'Off';
  // Reflect the saved usage-counting choice too, so the switch never lies about its own state.
  try{ const mb=document.getElementById('metrics-toggle-btn'); if(mb) mb.textContent = (typeof metricsOff==='function' && metricsOff()) ? 'Off' : 'On ✓'; }catch(_){}
}


// ─── CONNECTED APPS MANAGER ────────────────────────────────────
// APP_REGISTRY: only apps that genuinely do something when tapped.
// REAL OAuth integrations: Strava (workouts), Google Health (steps/Fitbit data via Google)
// Working URL schemes (verified opens the iOS app): Hevy, Strong, Apple Health, Apple Fitness, MyFitnessPal
// Removed: JEFIT, Cal AI, Yazio, Lose It, MacroFactor, Cronometer, Samsung Health, Garmin standalone,
//          Fitbit standalone, Oura, WHOOP — all just opened the App Store with no real integration.
const APP_REGISTRY = {
  // — Training with real OAuth / API —
  strava: {name:'Strava', icon:'&#x1F6B4;', color:'#FC4C02', category:'Training', scheme:'strava://', store:'https://apps.apple.com/app/strava-run-ride-hike/id426826309', web:'https://strava.com', oauth:true, sync:true},
  hevy: {name:'Hevy', icon:'&#x1F4AA;', color:'#1C1C3A', category:'Training', scheme:'hevy://', store:'https://apps.apple.com/app/hevy-workout-tracker/id1388737828', web:'https://hevy.com', apikey:true},
  // — Working URL schemes (one-tap open the iOS app) —
  strong: {name:'Strong', icon:'&#x1F3CB;', color:'#1A2A1A', category:'Training', scheme:'strong://', store:'https://apps.apple.com/app/strong-workout-tracker-gym-log/id464254577'},
  applefit: {name:'Apple Fitness', icon:'&#x1F34E;', color:'#000', category:'Training', scheme:'x-apple-fitness://'},
  myfitnesspal: {name:'MyFitnessPal', icon:'&#x1F957;', color:'#0072CE', category:'Nutrition', scheme:'mfp://', store:'https://apps.apple.com/app/myfitnesspal/id341232718'},
  cronometer: {name:'Cronometer', icon:'&#x1F955;', color:'#F47A20', category:'Nutrition', scheme:'cronometer://', web:'https://cronometer.com'},
  applehealth: {name:'Apple Health', icon:'&#x2764;&#xFE0F;', color:'#FF2D55', category:'Health', scheme:'x-apple-health://'},
  googlehealth: {name:'Google Health', icon:'&#x2764;&#xFE0F;', color:'#34A853', category:'Health', scheme:'https://health.google.com', oauth:true, sync:true},
};

function renderConnectedApps(){
  const list = document.getElementById('connected-apps-list');
  if(!list) return;
  // Connected apps shows only what you've actually linked (no force-injected entries). Hevy + Strava
  // are connectable right from the Train tab, and land here once linked.
  const used = ls('totry_apps_used') || [];
  
  if(used.length === 0){
    list.innerHTML = '<p class="empty-note">No apps linked yet.</p>';
    return;
  }
  
  list.innerHTML = '';
  used.forEach(appId => {
    const app = APP_REGISTRY[appId];
    if(!app) return;
    // The picker already hides Google Health on iOS (line ~2253), but this list renders whatever is in
    // the SYNCED `totry_apps_used` — so a person who linked it on the web and then installed the iOS
    // app got a row for it, and its Open button walked them into Google's own error page. The filter
    // has to live here too, where the row is actually built, or the picker's version is bypassed by
    // the one route nobody tests: a web account arriving on a phone.
    if((appId==='googlehealth' || appId==='googlefit' || appId==='fitbit') &&
       typeof isNativeApp==='function' && isNativeApp()) return;
    const row = document.createElement('div');
    row.className = 'connected-app';
    // Honest status: does this app actually integrate, or do we just open it?
    let statusLabel = app.category;
    if(app.sync || app.apikey){
      const connected = (appId==='strava' && ls('totry_strava_token')) || (appId==='hevy' && ls('totry_hevy_api_key'));
      statusLabel = connected ? '\u25cf Connected \u00b7 syncs data' : 'Tap to connect';
    } else {
      statusLabel = 'Opens the app';   // Strong, MyFitnessPal, Cronometer — no data sync possible
    }
    row.innerHTML = '<div class="ca-icon" style="background:'+app.color+'">'+app.icon+'</div>'+
      '<div style="flex:1"><div class="ca-name">'+app.name+'</div><div class="ca-status">'+statusLabel+'</div></div>'+
      '<button class="btn sr-action" style="width:auto;padding:6px 10px;font-size:11px" onclick="openLinkedApp(&apos;'+appId+'&apos;)">Open</button>'+
      '<button class="btn sr-action" style="width:auto;padding:6px 8px;font-size:11px;background:var(--re-bg);color:var(--re);border-color:var(--re-bd)" onclick="removeLinkedApp(&apos;'+appId+'&apos;)" aria-label="Unlink this app">&#215;</button>';
    list.appendChild(row);
  });
}

function openLinkedApp(appId){
  const app = APP_REGISTRY[appId];
  if(!app) return;
  haptic('tap');
  
  // STRAVA: OAuth flow if not yet connected
  if(appId === 'strava'){
    const stravaToken = ls('totry_strava_token');
    if(!stravaToken){
      offerStravaConnect();
      return;
    }
    // Connected — show management options, not just "open the app"
    manageStravaConnection();
    return;
  }
  
  // HEVY: API key flow if not yet connected; management panel if connected
  if(appId === 'hevy'){
    const hevyKey = ls('totry_hevy_api_key');
    if(!hevyKey){
      offerHevyConnect();
      return;
    }
    manageHevyConnection();
    return;
  }
  
  // GOOGLE FIT / FITBIT: real OAuth via Google Health
  if(appId === 'googlehealth' || appId === 'googlefit' || appId === 'fitbit'){
    const gToken = ls('totry_google_token');
    if(!gToken){
      offerGoogleHealthConnect();
      return;
    }
    syncGoogleHealth();
    showToast('Syncing', 'Refreshing your Google Health data...');
    return;
  }
  
  // Default: try app scheme, fall back to App Store
  if(app.scheme){
    const fallback = setTimeout(() => {
      window.open(app.store || app.web || 'about:blank', '_blank');
    }, 1000);
    const onHide = () => {
      if(document.hidden){
        clearTimeout(fallback);
        document.removeEventListener('visibilitychange', onHide);
      }
    };
    document.addEventListener('visibilitychange', onHide);
    window.location.href = app.scheme;
  } else if(app.web){
    window.open(app.web, '_blank');
  } else if(app.store){
    window.open(app.store, '_blank');
  }
}

// STRAVA OAUTH - requires app registration at developers.strava.com
const STRAVA_CLIENT_ID = '252158';
const STRAVA_REDIRECT_URI = window.location.origin + window.location.pathname;

// Strava is in development-mode at developers.strava.com — only approved athletes
// can connect until production API access is granted. We gate at the UI layer to
// avoid showing a broken "Connect" button to anyone not on the approved list.
// STRAVA — Standard developer tier gives 10 athlete slots. These are LIMITED and precious.
// Only people on this allowlist can connect (Alfred grants a slot to subscribers / chosen users).
// HARD CAP: do not exceed 10 emails here, or Strava connections will start failing for everyone.
