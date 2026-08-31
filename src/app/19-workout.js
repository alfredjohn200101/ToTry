
// ── WORKOUT TRACKER ───────────────────────────────────────────
// EXDB_BASE and WGER_BASE lived here. Both hosts are dead - exercisedb-api.vercel.app answers 402
// DEPLOYMENT_DISABLED and wger dropped its search endpoint - and after the exercise-form tiers that
// used them were removed (see lookupExerciseForm in 22-train-deep.js) neither constant had a single
// consumer left. Deleted rather than left lying around: a base URL for a dead API is how someone
// later builds a new call on top of one.
let currentSession=[],restTimerInt=null,restTimeLeft=0;
// RECORDS BEATEN DURING THIS SESSION, remembered as they happen. The tick handler writes the new best
// to totry_prs the moment the set is ticked, so by the time Finish runs detectAndRecordPRs there is no
// improvement left to find and the summary's PR banner came back EMPTY — for everyone who taps the ✓,
// which is how the screen is built to be used. The banner only ever appeared for a session shape the
// tick flow cannot produce. Detection at save still runs, for anything ticked without celebration; this
// carries what the person was already congratulated for through to the sheet where they look for it.
let _sessionPRs=[];

// Live workout duration (Hevy shows a running stopwatch the whole session).
let __sessionStart=null, __sessionDurInt=null;
function startSessionTimer(){
  if(!__sessionStart) __sessionStart = Date.now();
  if(__sessionDurInt) clearInterval(__sessionDurInt);
  const tick=()=>{
    const el=document.getElementById('session-duration');
    if(!el || !__sessionStart) return;
    const s=Math.floor((Date.now()-__sessionStart)/1000);
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
    el.textContent = (h>0 ? h+'h '+m+'m' : m+'m '+String(sec).padStart(2,'0')+'s');
  };
  tick();
  __sessionDurInt=setInterval(tick,1000);
}
function stopSessionTimer(){
  if(__sessionDurInt){ clearInterval(__sessionDurInt); __sessionDurInt=null; }
  __sessionStart=null;
}

// Keep the screen awake during a live workout so you're not unlocking the phone every set
// (a flow-killer Hevy specifically solved). Uses the Wake Lock API where available.
let __wakeLock=null;
async function requestWakeLock(){
  try{
    if('wakeLock' in navigator && !__wakeLock){
      __wakeLock = await navigator.wakeLock.request('screen');
      __wakeLock.addEventListener('release', ()=>{ __wakeLock=null; });
    }
  }catch(e){ /* not supported / denied — silently fine */ }
}
function releaseWakeLock(){
  try{ if(__wakeLock){ __wakeLock.release(); __wakeLock=null; } }catch(e){}
}
// Re-acquire if the user tabs away and back mid-workout
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='visible' && currentSession.length>0) requestWakeLock();
});

const DEFAULT_SPLIT=[
  {focus:'Legs \u2014 Rehab',detail:'Leg press (light), RDL, seated leg curl, step-ups, tibialis raises, calf raises.'},
  {focus:'Push',detail:'Bench press, incline DB press, OHP, lateral raises, tricep dips.'},
  {focus:'Pull',detail:'Cable rows, lat pulldown, face pulls, DB rows, bicep curls.'},
  {focus:'Legs \u2014 Strength',detail:'Progressive overload on leg press. Heavier RDL. Romanian curl.'},
  {focus:'Push / Pull Hybrid',detail:'High volume. Superset-friendly. Mix chest and back.'},
  {focus:'Cardio + Core',detail:'25-30 min incline walk or bike. Core circuit. Full stretch.'},
  {focus:'Rest + God',detail:'No gym. Prayer, Scripture, journalling, plan the week.'},
];
function getUserSplit(){
  // Only return a real split if the user has actually set one up.
  // Otherwise return empty days so the home screen doesn't promise a "Push/Pull Hybrid" plan
  // that the user never created.
  const saved = ls('totry_split');
  // A day with a routine assigned IS a set-up day. The edit modal labels focus "(or leave blank for
  // rest day)", so someone who assigned a routine and left focus blank had their entire split treated
  // as empty — and the today card then told them "No routine set for today. Build a routine and
  // assign it to today", which is precisely what they had just done.
  if(saved && Array.isArray(saved) && saved.some(d => d && (d.focus || d.routine))) return saved;
  return [null, null, null, null, null, null, null]; // no plan yet
}

function initPTTab(){
  try{ if(typeof restoreSessionDraft==='function') restoreSessionDraft(); }catch(_){}
  renderSplitDayCards();renderWorkoutSession();loadTodaySplitCard();updateStravaBtn();
  if(typeof renderSplitOverview==='function') renderSplitOverview();
  const history=ls('totry_workouts')||[];if(history.length>=2)getProgressiveSuggestion();
}
function setPTTab(tab){
  ['log','routines','history','mobility','ptcoach'].forEach(t=>{
    const p=document.getElementById('pt-panel-'+t);const b=document.getElementById('pt-sub-'+t);
    if(p)p.style.display=t===tab?'block':'none';if(b)b.classList.toggle('active',t===tab);
  });
  // renderWorkoutHistory() renders the session list AND calls renderPersonalRecords(). Both were
  // unreachable until v459: the function had no container in the file, so PRs sat under a permanently
  // empty heading (announced by a "New PR!" toast, then impossible to find) and a workout logged in
  // the app could never be reopened. The container now exists; the else-branch keeps PRs rendering
  // even if the history renderer is ever removed.
  if(tab==='history'){renderMuscleGroupCard();if(typeof renderWorkoutHistory==='function')renderWorkoutHistory();else if(typeof renderPersonalRecords==='function')renderPersonalRecords();if(typeof renderStravaActivities==='function')renderStravaActivities();if(typeof populateExerciseSelect==='function')populateExerciseSelect();if(typeof renderPlateauCard==='function')renderPlateauCard();}
  if(tab==='log'){ if(typeof renderSplitOverview==='function') renderSplitOverview(); }
  if(tab==='routines'){renderRoutines();}
  if(tab==='mobility'){if(typeof renderMobilityPanel==='function')renderMobilityPanel();}
  // The PT coach's saved conversation was loaded into ptH at boot and SENT to the model on every
  // message (api(buildPTCtx(), ptH.slice(0,-1), ...)) — but never shown back to the person. So they
  // reopened the coach to a blank screen while it answered as though mid-conversation, referencing
  // sessions and advice they could no longer see. restorePTMessages() was written for exactly this and
  // never called (refcount 1). Same guard idiom as the main coach, so it restores once per session.
  if(tab==='ptcoach'){
    if(typeof restorePTMessages==='function' && !window.__ptRestored){ restorePTMessages(); window.__ptRestored=true; }
  }
}
// ══════════════════════════════════════════════════════════════════════
// UNIFIED TRAINING ENGINE — merges Hevy lifts + Strava cardio into ONE timeline,
// dedupes the overlap (Hevy→Strava pushes lifts into Strava as activities), and
// classifies each session. This is the single source of truth for the Training view,
// the weekly verdict, and adherence — so lifts and cardio finally live in one system.
// ══════════════════════════════════════════════════════════════════════
function _isStrengthType(t){
  const x = (t||'').toLowerCase();
  return /weight|strength|workout|crossfit|hiit/.test(x);
}
function _isCardioType(t){
  const x = (t||'').toLowerCase();
  return /run|ride|cycl|bike|swim|walk|hike|row|elliptical|ski|skate/.test(x);
}
// Two sessions are "the same" if within 90 min of each other and both strength-type —
// the classic Hevy-lift-pushed-to-Strava duplicate.
function _sessionsOverlap(aTs, bTs, minutes){
  if(!aTs || !bTs) return false;
  return Math.abs(new Date(aTs).getTime() - new Date(bTs).getTime()) <= minutes*60000;
}
// ═══════════════════════════════════════════════════════════════════
// TRAINING INTELLIGENCE (WS1) — central helpers used everywhere: manual
// logging, Hevy sync, exercise history, the coach. One source of truth so
// 1RM/PR logic never diverges again.
// ═══════════════════════════════════════════════════════════════════
// Estimated 1-rep-max (Epley). Returns 0 for invalid input.
function estE1RM(weight, reps){
  const w = parseFloat(weight), r = parseInt(reps);
  if(!(w > 0) || !(r > 0)) return 0;
  if(r === 1) return Math.round(w);
  return Math.round(w * (1 + r / 30));
}
// Best estimated 1RM across a set list.
function bestE1RMFromSets(sets){
  let best = 0;
  (sets || []).forEach(s => { const e = estE1RM(s.weight, s.reps); if(e > best) best = e; });
  return best;
}
// Detect + record PRs for a finished workout's exercises. Returns an array of
// {name, e1rm, weight, reps, kind} for any exercise that beat its stored best.
// Used by BOTH manual finish and Hevy sync (Hevy workouts never celebrated PRs before).
function detectAndRecordPRs(exercises, opts){
  opts = opts || {};
  const prs = ls('totry_prs') || {};
  const newPRs = [];
  const today = new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
  (exercises || []).forEach(ex => {
    if(!ex || !ex.name) return;
    // Best working set this session by e1RM, plus heaviest weight + most reps.
    let bestE = 0, bestW = 0, bestR = 0, heaviest = 0, heaviestReps = 0;
    (ex.sets || []).forEach(s => {
      if(s.type && /warm/i.test(s.type)) return; // warmups don't set PRs
      // AND NEITHER IS A SET YOU HAVE NOT DONE. This only ever ran on Hevy imports, where every set
      // is completed by definition, so the missing check never showed. v566 routed our own save
      // through here too — and an in-app session carries the sets you PLANNED, unticked, sitting on
      // screen exactly as you left them. Measured: one real set of 85x5, plus a 140x5 typed in and
      // never ticked, recorded a personal record of 140kg and an estimated max of 163. A lift he
      // never did, permanent (records only move when beaten), feeding overloadSuggestion, and making
      // every honest session afterwards look like a failure. The session's own volume already got
      // this right — 425kg, the done set only — which is what made it invisible.
      // Every writer sets the flag: in-app starts false until ticked, Hevy and the screenshot parser
      // stamp true. Verified by driving all three — Hevy 120x3 and a parsed Deadlift 180x3 both still
      // record; only a set carrying NO flag at all is skipped, which today nothing produces.
      // `!s.done` and not `s.done === false` on purpose: an unflagged set is of unknown provenance, and
      // a missed record is recoverable where a claimed one is a lie that stands until it is beaten.
      // This is also the stricter of the two gates the app used to have — the one in-app saves always
      // had, before v566 routed them through this function instead.
      if(!s.done) return;
      const w = parseFloat(s.weight)||0, r = parseInt(s.reps)||0;
      const e = estE1RM(w, r);
      if(e > bestE){ bestE = e; bestW = w; bestR = r; }
      if(w > heaviest){ heaviest = w; heaviestReps = r; }
    });
    if(bestE <= 0) return;
    const prev = prs[ex.name];
    if(!prev || bestE > (prev.orm || 0)){
      prs[ex.name] = { orm: bestE, weight: bestW, reps: bestR, heaviest, date: today };
      newPRs.push({ name: ex.name, e1rm: bestE, weight: bestW, reps: bestR, kind: 'e1rm' });
    }
  });
  if(newPRs.length){ ls('totry_prs', prs); if(typeof syncToCloud==='function') syncToCloud(); }
  return newPRs;
}
// Progressive-overload suggestion for an exercise, from its own history.
// Returns {lastWeight,lastReps,lastDate,suggestion} or null if no history.
// The science: if you hit the top of your rep range, add load; otherwise add a rep.
function overloadSuggestion(exName, opts){
  opts = opts || {};
  const repCeiling = opts.repCeiling || 8;   // when reps reach this, bump weight
  const repFloor = opts.repFloor || 5;
  const history = ls('totry_workouts') || [];
  // history is newest-first; find the most recent session containing this exercise
  for(const s of history){
    const ex = (s.exercises || []).find(e => e.name === exName);
    if(!ex) continue;
    // Best working set last time
    let bw = 0, br = 0, be = 0;
    (ex.sets || []).forEach(st => {
      if(st.type && /warm/i.test(st.type)) return;
      // AND NOT A SET HE NEVER TICKED. v568 put this gate on detectAndRecordPRs only, so the coach
      // went on prescribing off a 140kg x 5 that was typed into the sheet and never done: "Last time:
      // 140kg x 5. Try to beat it" sat under a "Best set 85x5" that was gated correctly. Loading a
      // saved routine writes done:false with real weights, so this needs no typing at all to happen.
      if(st.done === false) return;
      const w = parseFloat(st.weight)||0, r = parseInt(st.reps)||0;
      const e = estE1RM(w, r);
      if(e > be){ be = e; bw = w; br = r; }
    });
    if(bw <= 0 || br <= 0) continue;
    const when = s.date || (s.ts ? new Date(s.ts).toLocaleDateString('en-AU',{day:'numeric',month:'short'}) : '');
    let suggestion;
    if(br >= repCeiling){
      // Hit the ceiling — add load and reset toward the floor.
      const inc = bw >= 60 ? 5 : 2.5; // bigger jumps on bigger lifts
      suggestion = 'You hit ' + br + ' reps at ' + bw + 'kg last time — try ' + (bw + inc) + 'kg for ' + repFloor + '\u2013' + repCeiling + '.';
    } else {
      suggestion = 'Last time: ' + bw + 'kg \u00d7 ' + br + '. Try to beat it \u2014 aim for ' + (br + 1) + ' reps at ' + bw + 'kg.';
    }
    return { lastWeight: bw, lastReps: br, lastDate: when, e1rm: be, suggestion };
  }
  return null;
}

// Adaptive nutrition (WS1, MacroFactor-style but free + suggestion-only). Looks at the body-weight
// trend over ~2 weeks vs the user's goal direction, and suggests a calorie adjustment. Never changes
// goals silently — returns a suggestion the user approves. Returns null if not enough data.
function adaptiveNutritionSuggestion(){
  const body = ls('totry_body') || [];
  if(body.length < 2) return null;
  const goals = ls('totry_nut_goals');
  if(!goals || !goals.cal) return null;
  const intent = (ls('totry_calorie_goal_type') || ls('totry_goal_intent') || 'maintain').toLowerCase();
  // body is newest-first with a ts. Take entries within the last ~21 days.
  const withTs = body.filter(b => b && b.weight && (b.ts || b.date)).map(b => ({
    w: parseFloat(b.weight),
    t: b.ts ? new Date(b.ts).getTime() : new Date(b.date).getTime()
  })).filter(x => x.w > 0 && !isNaN(x.t)).sort((a,b)=>a.t-b.t);
  if(withTs.length < 2) return null;
  const newest = withTs[withTs.length-1], oldest = withTs[0];
  const days = Math.max(1, (newest.t - oldest.t) / 86400000);
  if(days < 10) return null;            // need ~1.5+ weeks of spread to be meaningful
  const deltaKg = newest.w - oldest.w;
  const perWeek = deltaKg / (days/7);
  const want = /lose|cut|loss/.test(intent) ? 'lose' : (/gain|build|bulk|muscle/.test(intent) ? 'gain' : 'maintain');
  // Healthy rates: lose ~0.25–0.75 kg/wk, gain ~0.1–0.4 kg/wk.
  let msg = null, dir = 0;
  if(want === 'lose'){
    if(perWeek > -0.1){ msg = 'Your weight has held about steady (' + (deltaKg>=0?'+':'') + deltaKg.toFixed(1) + 'kg over ' + Math.round(days) + ' days) while you\u2019re aiming to lose. Consider dropping ~150 cal.'; dir = -150; }
    else if(perWeek < -1.0){ msg = 'You\u2019re losing fast (' + perWeek.toFixed(1) + 'kg/wk) \u2014 that can cost muscle. Consider adding ~150 cal to slow it to a sustainable rate.'; dir = 150; }
  } else if(want === 'gain'){
    if(perWeek < 0.05){ msg = 'Your weight is flat (' + (deltaKg>=0?'+':'') + deltaKg.toFixed(1) + 'kg over ' + Math.round(days) + ' days) while you\u2019re aiming to gain. Consider adding ~150 cal.'; dir = 150; }
    else if(perWeek > 0.6){ msg = 'You\u2019re gaining fast (' + perWeek.toFixed(1) + 'kg/wk) \u2014 more of that is fat. Consider trimming ~150 cal.'; dir = -150; }
  } else {
    if(Math.abs(perWeek) > 0.4){ msg = 'You\u2019re aiming to maintain but trending ' + (perWeek>0?'up':'down') + ' (' + perWeek.toFixed(1) + 'kg/wk). Consider ' + (perWeek>0?'trimming':'adding') + ' ~150 cal.'; dir = perWeek>0 ? -150 : 150; }
  }
  if(!msg) return null;
  return { message: msg, suggestedCal: Math.max(1200, Math.round(goals.cal + dir)), currentCal: goals.cal, perWeek: perWeek.toFixed(2), days: Math.round(days) };
}
// LEGACY (neutralised). This used a crude first-vs-last weight subtraction that ignored intake
// entirely, and rendered a SECOND card that contradicted the real adaptive-TDEE engine on the
// same screen. The real engine (computeAdaptiveTDEE → renderAdaptiveTDEE) is the single source of
// truth now. We keep this function as a no-op that hides the old card, so the many callers don't
// need touching and no stale suggestion can resurface.
function renderAdaptiveNutrition(){
  const card = document.getElementById('nut-adaptive-card');
  if(card) card.style.display = 'none';
}
// Kept for safety in case anything still calls it; routes through the protein-protected path.

// Current bodyweight (kg) from the most recent body log or the TDEE profile. Null if unknown.
function getBodyweight(){
  const body = ls('totry_body') || [];
  if(body[0] && body[0].weight) return parseFloat(body[0].weight);
  const tdee = ls('totry_tdee_data');
  if(tdee && tdee.weight) return parseFloat(tdee.weight);
  return null;
}
// Is this a bodyweight-loaded movement (bodyweight contributes to the load)? Used so volume can
// optionally match Hevy, which adds bodyweight for pull-ups/dips/chins etc.
function isBodyweightLoadedExercise(name){
  const n = (name||'').toLowerCase();
  return /pull-?up|pullup|chin-?up|chinup|dip\b|dips\b|muscle-?up|push-?up|pushup|inverted row|pistol|nordic|sit-?up|leg raise|hanging|bodyweight/.test(n);
}
// Volume for one exercise, honestly accounting for HOW it's loaded:
//  • assisted (negative weight = assistance): effective load = bodyweight − assistance, never below 0.
//    A 90kg person doing assisted pull-ups with 40kg help still moves ~50kg/rep — real work, not zero.
//  • bodyweight: load = bodyweight per rep.
//  • weighted bodyweight (e.g. weighted pull-up, +20kg): load = bodyweight + added.
//  • normal weighted lifts: load = the weight on the bar.
// Bodyweight is needed for the first three; if unknown we fall back gracefully (assisted/bw → 0 added,
// so we never invent numbers). Warmups excluded.
function exerciseVolume(ex, opts){
  opts = opts || {};
  const bw = getBodyweight() || 0;
  const trk = ex && ex.tracking;
  const nameIsBW = isBodyweightLoadedExercise(ex && ex.name);
  return (ex && ex.sets || []).reduce((a, s) => {
    if(s.type && /warm/i.test(s.type)) return a;
    const w = parseFloat(s.weight)||0, r = parseInt(s.reps)||0;
    if(r <= 0) return a;
    let load;
    if(trk === 'assisted' || (w < 0 && (nameIsBW || /assist/i.test(ex.name||'')))){
      // weight is stored negative (assistance). Effective = bodyweight − assistance.
      load = bw > 0 ? Math.max(0, bw + w) : 0; // w is negative, so bw + w = bw − assist
    } else if(trk === 'bodyweight'){
      load = bw > 0 ? bw : 0;
    } else if(trk === 'weighted_bodyweight'){
      load = (bw > 0 ? bw : 0) + Math.max(0, w);
    } else if(opts.addBodyweight && bw > 0 && nameIsBW){
      // Legacy Hevy-style toggle: add bodyweight to recognised bodyweight lifts.
      load = w + bw;
    } else {
      load = w > 0 ? w : 0; // normal lift; ignore stray negatives
    }
    return a + load * r;
  }, 0);
}

// Volume to DISPLAY for a whole workout, honoring the bodyweight-volume setting. Recomputes from
// sets when the toggle is on (adding bodyweight to bodyweight-loaded lifts); else uses stored volume.
function displayVolume(workout){
  if(!workout) return 0;
  if(!workout.exercises || !workout.exercises.length) return workout.volume || 0;
  const addBW = !!ls('totry_bw_volume'); // legacy toggle still adds BW to recognised lifts by name
  // Always recompute — exerciseVolume intrinsically handles assisted/bodyweight/weighted-bodyweight,
  // so their volume is honest whether or not the legacy bodyweight toggle is on.
  return Math.round(workout.exercises.reduce((a, ex) => a + exerciseVolume(ex, { addBodyweight: addBW }), 0));
}

// ═══════════════════════════════════════════════════════════════════
// WS4 — HYBRID / ENDURANCE INTELLIGENCE. Treats running/cycling/rowing/
// conditioning as first-class, computes weekly load across modalities, and
// warns about training interference (hard legs/run yesterday → go lighter today).
// ═══════════════════════════════════════════════════════════════════
// Classify any logged session into a broad modality.
function sessionModality(w){
  if(!w) return 'other';
  if(w.exercises && w.exercises.length) return 'strength';
  const t = (w.type || w.splitFocus || '').toLowerCase();
  if(/run|jog/.test(t)) return 'run';
  if(/cycle|bike|cycling/.test(t)) return 'cycle';
  if(/row/.test(t)) return 'row';
  if(/swim/.test(t)) return 'swim';
  if(/walk|hike/.test(t)) return 'walk';
  if(/hiit|conditioning|hyrox|functional|sport|metcon/.test(t)) return 'conditioning';
  return 'cardio';
}
// Weekly load across modalities (last 7 days): minutes + session count + avg effort per modality.
function weeklyLoadByModality(){
  const history = ls('totry_workouts') || [];
  const strava = ls('totry_strava_activities') || [];
  const weekAgo = Date.now() - 7*86400000;
  const all = history.concat(strava.map(a => ({ type: a.type, ts: a.ts || a.date, durationMinutes: a.durationMinutes || (a.moving_time?Math.round(a.moving_time/60):null), effort: null })));
  const by = {};
  all.forEach(w => {
    const ts = w.ts ? new Date(w.ts).getTime() : 0;
    if(!ts || ts < weekAgo) return;
    const mod = sessionModality(w);
    if(!by[mod]) by[mod] = { minutes: 0, sessions: 0, effortSum: 0, effortN: 0 };
    by[mod].minutes += w.durationMinutes || 0;
    by[mod].sessions += 1;
    if(w.effort){ by[mod].effortSum += w.effort; by[mod].effortN += 1; }
  });
  Object.keys(by).forEach(k => { by[k].avgEffort = by[k].effortN ? Math.round(by[k].effortSum/by[k].effortN) : null; });
  return by;
}
// Training-interference check for TODAY: did the user do something yesterday that should change
// today's training? Returns a short string or null. The hybrid-app insight: a hard lower-body or
// long endurance session yesterday means legs aren't fresh today.
function interferenceNote(){
  const history = ls('totry_workouts') || [];
  if(!history.length) return null;
  const now = new Date();
  const yKey = new Date(now.getTime() - 86400000).toLocaleDateString('en-AU');
  // Find yesterday's sessions.
  const yest = history.filter(w => (w.date === yKey) || (w.ts && new Date(w.ts).toLocaleDateString('en-AU') === yKey));
  if(!yest.length) return null;
  for(const w of yest){
    const mod = sessionModality(w);
    const hardEffort = w.effort && w.effort >= 8;
    const longEndurance = (mod==='run'||mod==='cycle'||mod==='row') && (w.durationMinutes >= 60 || (w.distance && w.distance >= 10000));
    // Hard lower-body strength yesterday?
    let hardLegs = false;
    if(mod === 'strength'){
      (w.exercises||[]).forEach(ex => {
        const groups = (typeof classifyExerciseMuscles==='function') ? classifyExerciseMuscles(ex.name, ex) : [];
        if(groups.some(g => ['quads','hamstrings','glutes','calves'].includes(g))){
          const working = (ex.sets||[]).filter(s => !(s.type && /warm/i.test(s.type))).length;
          if(working >= 3) hardLegs = true;
        }
      });
    }
    if(longEndurance || (mod==='run' && hardEffort)) return 'You did a hard ' + (mod==='run'?'run':mod) + ' yesterday — your legs may not be fresh. If today is lower-body or another run, consider easing the intensity or prioritising recovery.';
    if(hardLegs) return 'You trained legs hard yesterday — if today involves running or more lower-body work, expect some fatigue. Quality over ego today.';
    if(hardEffort) return 'Yesterday was a high-effort session (RPE ' + w.effort + '). Listen to your body today — a lighter day or mobility work may serve you better.';
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// WS5 — MOBILITY & WARM-UPS. Self-assessment (no camera) of per-joint range
// of motion → a mobility profile that targets your weak areas. Adaptive warm-ups
// for the exact muscles you're training today. Daily mobility, "little and often".
// ═══════════════════════════════════════════════════════════════════
const MOBILITY_JOINTS = [
  { id:'ankles',   label:'Ankles',          test:'Deep squat — can your heels stay flat?' },
  { id:'hips',     label:'Hips',            test:'Sit cross-legged / deep squat comfort' },
  { id:'tspine',   label:'Upper back (t-spine)', test:'Reach overhead without arching' },
  { id:'shoulders',label:'Shoulders',       test:'Clasp hands behind back, both sides' },
  { id:'hamstrings',label:'Hamstrings',     test:'Toe-touch — how close to the floor?' },
  { id:'wrists',   label:'Wrists',          test:'Palms flat, fingers back (front rack/push-up)' },
];
function getMobilityProfile(){ return ls('totry_mobility_profile') || null; }
// The assessment modal: rate each joint 1 (very tight) to 5 (full, easy range).
function openMobilityAssessment(){
  const prof = getMobilityProfile() || {};
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:92vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;color:var(--tx);margin-bottom:4px">Mobility check</div>'+
    '<div style="font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:16px">Rate each area honestly: 1 = very tight, 5 = full, easy range. No camera \u2014 just try the movement and score how it feels. Re-check every few weeks to see progress.</div>'+
    MOBILITY_JOINTS.map(j =>
      '<div style="margin-bottom:14px"><div style="font-size:13px;color:var(--tx);margin-bottom:2px">' + j.label + '</div>'+
      '<div style="font-size:11px;color:var(--tx3);margin-bottom:8px;line-height:1.4">' + j.test + '</div>'+
      '<div style="display:flex;gap:6px" id="mob-row-' + j.id + '">'+
      [1,2,3,4,5].map(n => '<button onclick="_pickMob(\'' + j.id + '\',' + n + ')" data-v="' + n + '" class="mob-dot" style="flex:1;padding:10px 0;border-radius:8px;border:1px solid ' + ((prof[j.id]===n)?'var(--go)':'var(--bd)') + ';background:' + ((prof[j.id]===n)?'rgba(200,169,110,0.15)':'var(--bg3)') + ';color:' + ((prof[j.id]===n)?'var(--go)':'var(--tx2)') + ';font-size:14px">' + n + '</button>').join('')+
      '</div></div>'
    ).join('')+
    '<button class="btn primary" onclick="saveMobilityAssessment()" style="margin-bottom:8px;margin-top:6px">Save my mobility profile</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3)">Cancel</button></div>';
  document.body.appendChild(m);
}
let _mobPick = {};
function _pickMob(joint, val){
  _mobPick[joint] = val;
  const row = document.getElementById('mob-row-' + joint);
  if(row){ row.querySelectorAll('.mob-dot').forEach(b => {
    const on = parseInt(b.dataset.v) === val;
    b.style.border = '1px solid ' + (on?'var(--go)':'var(--bd)');
    b.style.background = on?'rgba(200,169,110,0.15)':'var(--bg3)';
    b.style.color = on?'var(--go)':'var(--tx2)';
  }); }
}
function saveMobilityAssessment(){
  const prof = Object.assign({}, getMobilityProfile() || {}, _mobPick);
  prof._ts = Date.now();
  ls('totry_mobility_profile', prof);
  if(typeof syncToCloud==='function') syncToCloud();
  _mobPick = {};
  document.querySelector('.modal-bg.open')?.remove();
  haptic('success'); showToast('Saved', 'Your mobility profile is set. Warm-ups will target your tight areas.');
  if(typeof renderMobilityPanel==='function') renderMobilityPanel();
}
// The muscles to warm up today — from the picked Hevy routine, today's app split, or general.
function _todayTrainedMuscles(){
  const muscles = new Set();
  try{
    if(typeof getTodayHevyRoutine==='function'){
      const r = getTodayHevyRoutine();
      if(r) (r.exercises||[]).forEach(ex => (classifyExerciseMuscles(ex.name, ex)||[]).forEach(g => muscles.add(g)));
    }
    if(!muscles.size && typeof getUserSplit==='function'){
      const split = getUserSplit(); const ti = tIdx();
      if(split[ti] && split[ti].focus) split[ti].focus.toLowerCase().split(/[\s,/&]+/).forEach(w => { if(w.length>2) muscles.add(w); });
    }
  }catch(_){ }
  return Array.from(muscles);
}
// \u2500\u2500 DETERMINISTIC MOBILITY ENGINE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Warm-ups and flows are composed from a curated movement library by transparent rules \u2014 NOT
// generated fresh by AI each tap. This is deliberate: a warm-up is a repeatable prescription, so it
// must be the SAME every time, instant, and work with no signal. (AI stays only for the fuzzy
// form-check photo.) Each move is tagged by warm-up phase, the joints it frees, and the muscle
// groups it prepares \u2014 the same vocabulary classifyExerciseMuscles produces.
const MOBILITY_MOVES = [
  // RAISE \u2014 get warm, raise the heart rate
  { name:'Easy cardio \u2014 bike, row, or brisk incline walk', cue:'Nose-breathing pace until you\u2019re warm and lightly sweating', dur:'2\u20133 min', secs:150, phase:'raise', joints:[], groups:['*'] },
  { name:'Skips or jumping jacks', cue:'Loose and springy \u2014 shake the whole body awake', dur:'45 sec', secs:45, phase:'raise', joints:[], groups:['*'] },
  // MOBILISE \u2014 move the joints through range
  { name:'Leg swings \u2014 front to back', cue:'Hold something; let the leg swing tall and free', dur:'10 / leg', secs:60, phase:'mobility', joints:['hips','hamstrings'], groups:['quads','glutes','hamstrings'] },
  { name:'Leg swings \u2014 side to side', cue:'Open the hip, control the swing', dur:'10 / leg', secs:60, phase:'mobility', joints:['hips'], groups:['glutes','quads'] },
  { name:'Deep bodyweight squats', cue:'Sink slow, elbows push the knees out, chest tall', dur:'8 reps', secs:60, phase:'mobility', joints:['ankles','hips'], groups:['quads','glutes','hamstrings'] },
  { name:'Ankle rocks to the wall', cue:'Knee tracks over the toes, heel stays down', dur:'10 / side', secs:45, phase:'mobility', joints:['ankles'], groups:['quads','calves'] },
  { name:'World\u2019s greatest stretch', cue:'Lunge, hand down, rotate the top arm to the sky', dur:'5 / side', secs:90, phase:'mobility', joints:['hips','tspine','hamstrings'], groups:['quads','glutes','hamstrings','back'] },
  { name:'Hip 90/90 switches', cue:'Sit tall; rotate both knees floor to floor', dur:'8 / side', secs:75, phase:'mobility', joints:['hips'], groups:['glutes','quads'] },
  { name:'Cat\u2013cow', cue:'Slow, one vertebra at a time, moving with the breath', dur:'8 reps', secs:45, phase:'mobility', joints:['tspine'], groups:['back','core'] },
  { name:'T-spine open-books', cue:'On your side, follow the top hand, let the chest open', dur:'6 / side', secs:60, phase:'mobility', joints:['tspine','shoulders'], groups:['back','chest'] },
  { name:'Thread the needle', cue:'Reach one arm under and through; breathe into the mid-back', dur:'6 / side', secs:60, phase:'mobility', joints:['tspine','shoulders'], groups:['back','shoulders'] },
  { name:'Shoulder pass-throughs (band or broomstick)', cue:'Wide grip, take it overhead and behind, no shrug', dur:'10 reps', secs:45, phase:'mobility', joints:['shoulders'], groups:['shoulders','chest'] },
  { name:'Arm circles + cross-body swings', cue:'Big circles both ways, then hug and open', dur:'10 each', secs:40, phase:'mobility', joints:['shoulders'], groups:['shoulders','chest','back'] },
  { name:'Wrist rocks + prep', cue:'Palms down then up; rock gently to load the wrists', dur:'10 each', secs:40, phase:'mobility', joints:['wrists'], groups:['chest','shoulders','triceps'] },
  { name:'Toe-touch walkouts', cue:'Hinge, walk the hands out to a plank, walk them back', dur:'6 reps', secs:60, phase:'mobility', joints:['hamstrings','shoulders'], groups:['hamstrings','core'] },
  // ACTIVATE \u2014 wake up the movers for today\u2019s work
  { name:'Glute bridges', cue:'Drive through the heels, squeeze the top, ribs down', dur:'12 reps', secs:45, phase:'activation', joints:['hips'], groups:['glutes','hamstrings'] },
  { name:'Band pull-aparts', cue:'Straight arms; pull to the chest, squeeze the blades', dur:'15 reps', secs:40, phase:'activation', joints:['shoulders'], groups:['back','shoulders'] },
  { name:'Scapular push-ups', cue:'Arms locked; pinch and spread the shoulder blades', dur:'10 reps', secs:40, phase:'activation', joints:['shoulders'], groups:['chest','shoulders'] },
  { name:'Dead bugs', cue:'Low back glued to the floor, opposite arm and leg', dur:'8 / side', secs:50, phase:'activation', joints:[], groups:['core'] },
  { name:'Bird dogs', cue:'Reach long, stay square, no twist in the hips', dur:'8 / side', secs:50, phase:'activation', joints:['tspine'], groups:['core','back'] },
  { name:'Bodyweight good-mornings', cue:'Soft knees, hinge back, feel the hamstrings load', dur:'12 reps', secs:40, phase:'activation', joints:['hamstrings','hips'], groups:['hamstrings','glutes'] },
];
// Split words \u2192 concrete groups, so "push"/"legs"/"upper" from a split focus still target movements.
const _MUSCLE_EXPAND = {
  push:['chest','shoulders','triceps'], pull:['back','biceps'],
  legs:['quads','glutes','hamstrings','calves'], lower:['quads','glutes','hamstrings','calves'],
  upper:['chest','back','shoulders','biceps','triceps'], arms:['biceps','triceps'],
  full:['chest','back','shoulders','biceps','triceps','quads','glutes','hamstrings','calves','core'],
  delts:['shoulders'], quadriceps:['quads'], abs:['core'], waist:['core'], hips:['glutes']
};
function _expandMuscles(list){
  const out=new Set();
  (list||[]).forEach(mRaw=>{ const m=String(mRaw||'').toLowerCase().trim(); if(!m) return;
    if(_MUSCLE_EXPAND[m]) _MUSCLE_EXPAND[m].forEach(x=>out.add(x)); else out.add(m); });
  return out;
}
function _jointLabel(id){ const j=MOBILITY_JOINTS.find(x=>x.id===id); return j?j.label.toLowerCase():id; }
// Build today's warm-up: raise \u2192 mobilise (today's muscles + your very-tight joints) \u2192 activate.
function buildWarmup(){
  const todays=_expandMuscles(_todayTrainedMuscles());
  const prof=getMobilityProfile()||{};
  const veryTight=new Set(Object.keys(prof).filter(k=>k!=='_ts'&&prof[k]<=2));
  const muscleHit=m=>!m.groups.includes('*')&&m.groups.some(g=>todays.has(g));
  const jointHit=m=>m.joints.some(j=>veryTight.has(j));
  const score=m=>(jointHit(m)?3:0)+(muscleHit(m)?1:0);
  const pick=(phase,n)=>MOBILITY_MOVES.filter(m=>m.phase===phase)
    .map((m)=>({m,s:score(m),i:MOBILITY_MOVES.indexOf(m)}))
    .sort((a,b)=>b.s-a.s||a.i-b.i).slice(0,n).map(x=>x.m);
  return { raise:pick('raise',1), mobility:pick('mobility',3), activation:pick('activation', todays.size?2:1),
           muscles:_todayTrainedMuscles(), tight:[...veryTight] };
}
// Build a daily flow to fit the chosen minutes, prioritising your tight areas. Deterministic.
function buildMobilityRoutine(minutes){
  const prof=getMobilityProfile()||{};
  const tight=new Set(Object.keys(prof).filter(k=>k!=='_ts'&&prof[k]<=3));
  const budget=(minutes||8)*60;
  const ranked=MOBILITY_MOVES.filter(m=>m.phase==='mobility'||m.phase==='activation')
    .map((m)=>({m,s:(m.joints.some(j=>tight.has(j))?2:0)+(m.phase==='mobility'?1:0),i:MOBILITY_MOVES.indexOf(m)}))
    .sort((a,b)=>b.s-a.s||a.i-b.i).map(x=>x.m);
  const chosen=[]; let t=0;
  for(const m of ranked){ if(t>=budget) break; if(t+m.secs<=budget+20){ chosen.push(m); t+=m.secs; } }
  if(chosen.length<4){ for(const m of ranked){ if(chosen.indexOf(m)<0){ chosen.push(m); if(chosen.length>=4) break; } } }
  return { moves:chosen, minutes:minutes||8, tight:[...tight] };
}
function _mobMoveRow(m){
  return '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:9px 0;border-top:1px solid var(--bd)">'+
    '<div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--tx);line-height:1.35">'+m.name+'</div>'+
    '<div style="font-size:11px;color:var(--tx3);line-height:1.45;margin-top:2px">'+m.cue+'</div></div>'+
    '<div style="font-family:DM Mono,monospace;font-size:11px;color:var(--go);white-space:nowrap">'+m.dur+'</div></div>';
}
// Warm-up renders directly in the panel \u2014 instant, so there's no "Generate" button to tap.
function renderWarmupInline(){
  const box=document.getElementById('mob-warmup-out'); if(!box) return;
  const w=buildWarmup();
  const rd=(typeof computeReadiness==='function')?computeReadiness():null;
  const section=(label,moves)=>moves.length?'<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin:12px 0 0">'+label+'</div>'+moves.map(_mobMoveRow).join(''):'';
  const musc=w.muscles.length?w.muscles.slice(0,5).join(', '):'a general session';
  box.style.display='block';
  box.innerHTML=
    '<div style="font-size:12px;color:var(--tx3);line-height:1.5;margin-bottom:2px">Prepping '+musc+(w.tight.length?' \u00b7 easing your tight '+w.tight.map(_jointLabel).join(', '):'')+'.</div>'+
    (rd&&rd.level==='rest'?'<div style="font-size:11px;color:var(--go);line-height:1.5;margin-top:4px">Readiness is low today \u2014 keep it gentle, don\u2019t force range.</div>':'')+
    section('Raise',w.raise)+section('Mobilise',w.mobility)+section('Activate',w.activation);
}
// Daily flow renders on tap of a duration (5 / 8 / 12) \u2014 the duration is a real choice, so it stays.
function generateMobilityRoutine(minutes){
  const box=document.getElementById('mob-daily-out'); if(!box) return;
  ['5','8','12'].forEach(v=>{ const b=document.getElementById('mob-daily-'+v); if(b){ const on=String(minutes)===v;
    b.style.background=on?'var(--go)':'var(--bg3)'; b.style.color=on?'#1a1505':'var(--tx2)'; b.style.border='1px solid '+(on?'var(--go)':'var(--bd)'); } });
  const r=buildMobilityRoutine(minutes);
  const total=Math.round(r.moves.reduce((a,m)=>a+m.secs,0)/60);
  box.style.display='block';
  box.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">\u2728 '+r.minutes+'-min flow'+(r.tight.length?' \u00b7 for your tight '+r.tight.map(_jointLabel).join(', '):' \u00b7 full body')+'</div>'+
    r.moves.map(_mobMoveRow).join('')+
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);margin-top:8px">\u2248 '+total+' min \u00b7 move slow, breathe through each one</div>';
}
// WS-I: form-check from a single photo via AI vision. Heavily caveated — "things to look at",
// never medical/coaching certainty, and honest that one still can't capture a full movement.
async function runFormCheck(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  if(!file.type || !file.type.startsWith('image/')){ showToast('Wrong file','Please choose an image.'); return; }
  const out = document.getElementById('formcheck-out');
  if(out){ out.style.display='block'; out.innerHTML='<p class="pulsing" style="font-family:Cormorant Garamond,serif;font-style:italic;color:var(--tx3);text-align:center;padding:8px">Looking at your position...</p>'; }
  try{
    const dataUrl = await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=e=>{
        const img=new Image();
        img.onload=()=>{
          const maxDim=720, scale=Math.min(1,maxDim/Math.max(img.width,img.height));
          const c=document.createElement('canvas'); c.width=Math.round(img.width*scale); c.height=Math.round(img.height*scale);
          c.getContext('2d').drawImage(img,0,0,c.width,c.height);
          resolve(c.toDataURL('image/jpeg',0.8));
        };
        img.onerror=reject; img.src=e.target.result;
      };
      reader.onerror=reject; reader.readAsDataURL(file);
    });
    const base64=dataUrl.split(',')[1];
    if(!sb){ if(out) out.innerHTML='<div style="font-size:12px;color:var(--tx3)">Form check needs you to be signed in.</div>'; return; }
    const prompt='This is a photo of someone performing a strength exercise (or holding a position). As a knowledgeable strength coach, give GENERAL, encouraging observations about what you can see of their body position — "things to look at" only. Identify the exercise if you can. Mention up to 3 things that look okay and up to 3 things worth checking (e.g. back angle, knee tracking, bar path, depth). Be clear these are observations from a single still, not a diagnosis. NEVER give medical advice. Plain text, short. End with one line reminding them a single photo can\u2019t capture the full movement and a coach is best for real assessment. If this is not a person exercising, say so briefly.';
    const {data,error}=await Promise.race([
      sb.functions.invoke('ai-proxy', { body:{ action:'vision', prompt, image_base64:base64, image_mime:'image/jpeg', max_tokens:600 } }),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('Timed out')),35000))
    ]).catch(e=>({error:e}));
    if(error || !(data && data.text)){
      if(out) out.innerHTML='<div style="font-size:12px;color:var(--tx3)">Couldn\u2019t read that photo. Try better lighting and a side-on angle, or check your AI key is set up.</div>';
      return;
    }
    if(out){
      out.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Things to look at</div>'+
        '<div style="font-size:13px;color:var(--tx2);line-height:1.7;white-space:pre-wrap">'+data.text.replace(/</g,'&lt;')+'</div>'+
        '<div style="font-size:10px;color:var(--tx3);margin-top:10px;line-height:1.5;font-style:italic">General guidance from one still image — not medical or coaching certainty.</div>';
    }
  }catch(e){
    if(out) out.innerHTML='<div style="font-size:12px;color:var(--tx3)">Something went wrong reading that photo.</div>';
  }
}

function renderMobilityPanel(){
  const box = document.getElementById('pt-mobility-body');
  if(!box) return;
  const prof = getMobilityProfile();
  let profHtml;
  if(!prof){
    profHtml = '<div class="card" style="margin-bottom:12px"><div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:12px">Start with a quick mobility check so warm-ups can target your tight spots.</div>'+
      '<button class="btn primary" onclick="openMobilityAssessment()">Take the mobility check</button></div>';
  } else {
    const items = MOBILITY_JOINTS.filter(j => prof[j.id]).map(j => {
      const v = prof[j.id];
      const col = v <= 2 ? 'var(--re)' : (v >= 4 ? 'var(--gr)' : 'var(--go)');
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px"><span style="color:var(--tx2)">' + j.label + '</span>'+
        '<span style="display:flex;gap:3px">' + [1,2,3,4,5].map(n=>'<span style="width:7px;height:7px;border-radius:50%;background:'+(n<=v?col:'var(--bg3)')+'"></span>').join('') + '</span></div>';
    }).join('');
    const when = prof._ts ? new Date(prof._ts).toLocaleDateString('en-AU',{day:'numeric',month:'short'}) : '';
    profHtml = '<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div class="card-hd" style="margin-bottom:0">Your mobility</div><span style="font-size:10px;color:var(--tx3)">checked ' + when + '</span></div>'+
      items + '<button class="btn" onclick="openMobilityAssessment()" style="margin-top:10px;background:var(--bg3);border:1px solid var(--bd);font-size:12px">Re-check mobility</button></div>';
  }
  box.innerHTML = profHtml +
    '<div class="card" style="margin-bottom:12px;background:linear-gradient(135deg,rgba(200,169,110,0.06),rgba(140,107,182,0.03));border-color:var(--go-bd)">'+
      '<div class="card-hd" style="margin-bottom:6px">\ud83d\udd25 Warm up for today</div>'+
      '<div id="mob-warmup-out"></div>'+
    '</div>'+
    '<div class="card">'+
      '<div class="card-hd" style="margin-bottom:6px">\ud83e\uddd8 Daily mobility</div>'+
      '<div style="font-size:12px;color:var(--tx3);margin-bottom:10px;line-height:1.5">Little and often beats long and rare. A short daily flow for your tight areas.</div>'+
      '<div style="display:flex;gap:8px;margin-bottom:8px">'+
        '<button class="btn" id="mob-daily-5" onclick="generateMobilityRoutine(5)" style="flex:1;background:var(--bg3);border:1px solid var(--bd);font-size:12px">5 min</button>'+
        '<button class="btn primary" id="mob-daily-8" onclick="generateMobilityRoutine(8)" style="flex:1;font-size:12px">8 min</button>'+
        '<button class="btn" id="mob-daily-12" onclick="generateMobilityRoutine(12)" style="flex:1;background:var(--bg3);border:1px solid var(--bd);font-size:12px">12 min</button>'+
      '</div>'+
      '<div id="mob-daily-out" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--bd)"></div>'+
    '</div>';
  // Warm-up shows immediately (deterministic + instant); daily flow waits for a duration tap.
  if(typeof renderWarmupInline==='function') renderWarmupInline();
}

// ═══════════════════════════════════════════════════════════════════
// WS6 — READINESS & WHOLE-PERSON. A daily readiness signal WITHOUT a wearable:
// estimated from recent sleep/stress/energy self-reports + recent training load +
// yesterday's intensity. Honest guidance, not medical truth. Ties the whole app
// together: training, recovery, and (uniquely) the soul side feed one picture.
// ═══════════════════════════════════════════════════════════════════
// Returns { score 0-100, level 'go'|'moderate'|'rest', reasons[], advice } or null if no data.
function computeReadiness(){
  const checkins = ls('totry_checkins') || [];
  const body = ls('totry_body') || [];
  // Pull the most recent self-reported sleep/stress/energy — but ONLY from the last few days.
  //
  // There was no age limit at all, and the result is labelled "READINESS TODAY" in the coach prompt,
  // "Readiness today" in the whole-person brief, and "Your readiness is low today" in the card that
  // auto-fires on entering the Train tab. Someone who rated their sleep 9/10 in February and had not
  // checked in since was told in August that they were well recovered and should chase a PR. Ran the
  // real function with a single six-month-old check-in: score 86, level 'go'. The sleep block in
  // getLifeState is carefully date-keyed per night, so the app already knows how to scope a signal to
  // today — this simply did not.
  //
  // The date parse was also unsafe: `ts ? new Date(ts).getTime() : 0` yields NaN for a display-format
  // date like "Tue, 11 Aug" (which completeMorning and older writers store), and `NaN < when` is false,
  // so the guard did not return, `when` became NaN, and then EVERY remaining entry passed `t < NaN`
  // too — collapsing the newest-wins ordering entirely rather than merely going stale.
  const READINESS_MAX_AGE_MS = 3 * 86400000;   // a self-report older than three days is not "today"
  const nowMs = Date.now();
  let sleep=null, stress=null, energy=null, when=0, readinessTs=null;
  const considerScores = (s, ts) => {
    if(!s) return;
    const t = ts ? new Date(ts).getTime() : NaN;
    if(!isFinite(t)) return;                       // unparseable date: ignore rather than poison `when`
    if(nowMs - t > READINESS_MAX_AGE_MS) return;   // too old to be called today
    if(t > nowMs + 86400000) return;               // a future date means a wrong clock; do not trust it
    if(t < when) return;
    when = t; readinessTs = ts;
    if(s.sleep!=null) sleep = s.sleep;
    if(s.stress!=null) stress = s.stress;
    if(s.energy!=null) energy = s.energy;
  };
  checkins.forEach(c => considerScores(c.scores || c, c.ts || c.date));
  body.forEach(b => considerScores(b.scores, b.ts));
  // Watch-measured sleep, mapped onto the same 1-10 scale the self-reports use — see the note above.
  try{
    const tr = ls('totry_trackers') || {};
    [0, 1].forEach(back => {
      const d = new Date(); d.setDate(d.getDate() - back);
      const key = d.toLocaleDateString('en-AU');
      const row = tr[key];
      if(!row || row._sleepSrc !== 'health') return;
      const hrs = parseFloat(row.sleep) || 0;
      if(hrs <= 0) return;
      // 4h -> 3, 6h -> 6, 7h -> 7, 8h+ -> 9. Deliberately coarse: this is a proxy for how a person
      // would rate the night, not a measurement of it.
      const rated = hrs >= 8 ? 9 : hrs >= 7 ? 7 : hrs >= 6 ? 6 : hrs >= 5 ? 4 : 3;
      d.setHours(9, 0, 0, 0);
      considerScores({ sleep: rated }, d.toISOString());
    });
  }catch(_){ }
  // If we have nothing self-reported and no training history, no signal.
  const history = ls('totry_workouts') || [];
  if(sleep==null && stress==null && energy==null && !history.length) return null;
  // Base from self-report (default neutral 6/10 if missing).
  let score = 50;
  const reasons = [];
  if(sleep!=null){ score += (sleep - 6) * 5; if(sleep <= 4) reasons.push('low sleep'); else if(sleep >= 8) reasons.push('good sleep'); }
  if(energy!=null){ score += (energy - 6) * 3; if(energy <= 3) reasons.push('low energy'); }
  if(stress!=null){ score += (6 - stress) * 3; if(stress >= 8) reasons.push('high stress'); }
  // Training load: hard/long session yesterday or a heavy week lowers readiness.
  const intf = (typeof interferenceNote==='function') ? interferenceNote() : null;
  if(intf){ score -= 12; reasons.push('hard session yesterday'); }
  // Volume of last 7 days vs a rough heavy threshold (many sessions = accumulated fatigue).
  try{
    if(typeof weeklyLoadByModality==='function'){
      const load = weeklyLoadByModality();
      const totalSessions = Object.values(load).reduce((a,m)=>a+m.sessions,0);
      if(totalSessions >= 6){ score -= 8; reasons.push('high training frequency'); }
    }
  }catch(_){ }
  // HER CYCLE IS A RECOVERY SIGNAL AND THIS DID NOT KNOW IT EXISTED. The card that fires on entering
  // the Train tab says "chase a PR or add load" — and for a woman bleeding, or in the back half of her
  // luteal phase, it said that on the days her own body is asking for less. When she then could not hit
  // it, the app had framed a hormonal week as a personal failure. That is the exact inversion of grace
  // over shame, on the pillar most likely to produce it.
  //
  // HONEST ABOUT THE STRENGTH OF THIS. The research on cycle phase and performance is genuinely mixed:
  // effects are small on average and vary enormously between women. So this does NOT pretend to know
  // her capacity — it applies a deliberately small nudge, names the phase as a reason so she can see
  // exactly why the number moved, and never claims a mechanism. Her own experience outranks the estimate,
  // and the text says so. It only runs at all when she has explicitly opted in (cycleOn()).
  let cycle = null;
  try{
    if(typeof cyclePhase==='function'){
      const cp = cyclePhase();
      if(cp && cp.key && cp.key !== 'unknown'){
        cycle = cp;
        // Asymmetric on purpose: the cost of telling a depleted person to max out is higher than the
        // cost of holding someone back a little on a day she felt fine.
        if(cp.key === 'menstrual'){ score -= 8; reasons.push('period week'); }
        else if(cp.key === 'luteal' && cp.daysToNext != null && cp.daysToNext <= 5){ score -= 6; reasons.push('late luteal'); }
      }
    }
  }catch(_){ }
  score = Math.max(5, Math.min(100, Math.round(score)));
  const level = score >= 70 ? 'go' : (score >= 45 ? 'moderate' : 'rest');
  let advice;
  if(level === 'go') advice = 'You\u2019re well recovered. Good day to push \u2014 chase a PR or add load.';
  else if(level === 'moderate') advice = 'You\u2019re moderately recovered. Train, but keep it controlled \u2014 quality over maxing out.';
  else advice = 'Your body\u2019s asking for recovery. Consider mobility, an easy walk, or rest today \u2014 it\u2019s part of the work.';
  // Never a verdict on her body — a reason, held loosely, that she can overrule.
  if(cycle && (cycle.key === 'menstrual' || (cycle.key === 'luteal' && cycle.daysToNext != null && cycle.daysToNext <= 5))){
    advice += cycle.key === 'menstrual'
      ? ' You\u2019re in your period week too \u2014 dropping the load today is a choice, not a concession. This varies a lot between women; if you feel strong, trust that over my estimate.'
      : ' You\u2019re in the back half of your luteal phase \u2014 effort often reads higher there. Keep the movement, skip the max. If today feels good, go by that instead.';
  }
  return { score, level, reasons, advice, sleep, stress, energy, asOf: readinessTs,
           cyclePhase: cycle ? cycle.key : null };
}
