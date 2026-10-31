// ── CUSTOM EXERCISES (Hevy-style) ─────────────────────────────────────────────
// No fixed library is ever complete, so users can create their own movement: name it, pick the
// body part and equipment, and it then behaves exactly like a library exercise — searchable,
// loggable, counts toward volume, shows in history and PRs. Stored in totry_custom_exercises.
function getCustomExercises(){ return ls('totry_custom_exercises') || []; }
function openCreateExercise(prefillName){
  const bodyParts = ['chest','back','shoulders','biceps','triceps','legs','glutes','core','forearms','cardio'];
  const equip = ['Barbell','Dumbbells','Cable','Machine','Smith Machine','Bodyweight','Kettlebell','Bands','Plate','EZ Bar','Other'];
  const m = document.createElement('div');
  m.className = 'modal-bg open'; m.id = 'create-ex-modal';
  m.innerHTML = '<div class="modal" style="max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<h3 style="margin-bottom:4px">Create an exercise</h3>'+
    '<p style="font-size:var(--t-sm);color:var(--tx3);margin-bottom:14px">Add a movement we don\u2019t have yet. It\u2019ll work like any other — log sets, track progress, hit PRs.</p>'+
    '<div class="lbl">Name</div>'+
    '<input type="text" id="cx-name" placeholder="e.g. Pendulum Squat" value="'+((prefillName||'').replace(/"/g,'&quot;'))+'" style="margin-bottom:14px">'+
    '<div class="lbl">Body part</div>'+
    '<select id="cx-bodypart" style="margin-bottom:14px">'+bodyParts.map(b=>'<option value="'+b+'">'+b.charAt(0).toUpperCase()+b.slice(1)+'</option>').join('')+'</select>'+
    '<div class="lbl">Equipment</div>'+
    '<select id="cx-equip" style="margin-bottom:14px">'+equip.map(e=>'<option value="'+e+'">'+e+'</option>').join('')+'</select>'+
    '<div class="lbl">How is it tracked?</div>'+
    '<select id="cx-tracking" style="margin-bottom:18px">'+
      '<option value="weight_reps">Weight &amp; reps (most lifts)</option>'+
      '<option value="bodyweight">Bodyweight reps (e.g. pull-ups)</option>'+
      '<option value="weighted_bodyweight">Bodyweight + added weight</option>'+
      '<option value="assisted">Assisted (machine/band takes weight off)</option>'+
      '<option value="time">Time / hold (e.g. plank)</option>'+
      '<option value="distance">Distance (e.g. carries)</option>'+
    '</select>'+
    '<label style="display:flex;align-items:flex-start;gap:10px;margin-bottom:18px;cursor:pointer">'+
      '<input type="checkbox" id="cx-share" style="margin-top:3px;width:18px;height:18px;flex-shrink:0">'+
      '<span style="font-size:var(--t-sm);color:var(--tx2);line-height:1.5">Share with the community<br><span style="color:var(--tx3)">Off by default — this stays private to you. Tick to add it to ToTry\u2019s shared library so other users can find it too.</span></span>'+
    '</label>'+
    '<button class="btn primary" onclick="saveCustomExercise()" style="margin-bottom:8px">Create &amp; add to workout</button>'+
    '<button class="btn" onclick="closeModal(this)">Cancel</button></div>';
  document.body.appendChild(m);
  setTimeout(()=>{ const n=document.getElementById('cx-name'); if(n && !prefillName) n.focus(); }, 100);
}
function saveCustomExercise(){
  const name = (document.getElementById('cx-name')?.value || '').trim();
  if(!name){ showToast('Name needed','Give the exercise a name.'); return; }
  const bodyPart = document.getElementById('cx-bodypart')?.value || 'core';
  const equipment = document.getElementById('cx-equip')?.value || 'Other';
  const tracking = document.getElementById('cx-tracking')?.value || 'weight_reps';
  const customs = getCustomExercises();
  const primary = bodyPart.charAt(0).toUpperCase()+bodyPart.slice(1);
  // Avoid duplicating an existing custom one locally
  if(customs.some(c => c.name.toLowerCase() === name.toLowerCase())){
    showToast('Already added','That exercise is already in your list.');
  } else {
    customs.push({ name, bodyPart, equipment, primary, tracking, custom:true, created: Date.now() });
    ls('totry_custom_exercises', customs);
    if(typeof syncToCloud==='function') syncToCloud();
  }
  // Private by default. Share with the community only if explicitly ticked — works whether or not
  // the exercise already existed locally.
  const shareIt = document.getElementById('cx-share')?.checked;
  if(shareIt && typeof contributeToSharedLibrary==='function'){
    contributeToSharedLibrary('exercise', name, { bodyPart, equipment, primary, tracking });
  }
  document.getElementById('create-ex-modal')?.remove();
  // Add straight into the current session, like Hevy does.
  addExerciseToSession({ name, bodyPart, equipment, primary: bodyPart.charAt(0).toUpperCase()+bodyPart.slice(1), tracking, source:'Custom' });
  showToast('Created', name + ' added to your workout.');
  haptic('success');
}
// EVERY KEYSTROKE WAS A SEARCH, AND THE SLOWEST ONE WON. v564 wired a 260ms-debounced type-ahead onto
// this, which was already an async function with an AI fallback and no in-flight guard: typing one
// exercise the 324-item library does not hold sent eight real POSTs to ai-proxy, and whenever an
// earlier call came back slower than a later one the list settled on a STALE query's rows — tappable
// straight into the session. So a lifter typing "nordic ham curl" could be looking at "AI result for
// nordic h" and tap it in. The generation counter makes a superseded search render nothing, and the
// model is asked only when a person deliberately asks — Find, or Enter — never on the way through a
// word. The proxy chain is down to one working provider on a free-tier quota; eight calls per search
// is not a cost this feature can justify.
let _exSearchGen = 0;
// EVERY CHANGE OF THE BOX SUPERSEDES WHAT IS IN FLIGHT — including one that starts no search of its
// own. The generation counter only advanced inside searchExercises, so clearing the box (or cutting it
// to one character) while the model was thinking could not cancel anything: the abandoned query's AI
// rows landed in an empty box and were tappable straight into the session. That is the same defect the
// guard was added for, surviving in the path the `length > 1` check blocks.
function exSearchInput(v){
  _exSearchGen++;                                   // whatever is in flight is now stale
  clearTimeout(window.__exSearchT);
  const q = String(v == null ? '' : v).trim();
  if(q.length <= 1){
    const res = document.getElementById('pt-ex-results');
    if(res) res.innerHTML = '';                     // an empty box shows nothing, not the last answer
    return;
  }
  window.__exSearchT = setTimeout(function(){ searchExercises(v, { typeahead: true }); }, 260);
}
async function searchExercises(query, opts){
  if(!query.trim())return;
  const _gen = ++_exSearchGen;
  const _superseded = () => _gen !== _exSearchGen;
  const _typeahead = !!(opts && opts.typeahead);
  const res=document.getElementById('pt-ex-results');
  if(!res)return;
  res.className='tr-results'; res.innerHTML='<div class="tr-loading pulsing">Finding exercises\u2026</div>';
  
  const q=query.toLowerCase().trim();
  let exercises=[];
  const customs = getCustomExercises();
  const shared = (typeof getSharedExercises==='function') ? getSharedExercises() : [];

  // First: try direct body part match from our DB + custom + shared community exercises
  if(EXERCISE_DB[q]){
    exercises = EXERCISE_DB[q].map(e=>({...e,bodyPart:q,source:'Library'}));
    shared.filter(c => (c.bodyPart||'') === q).forEach(c => exercises.push({...c, bodyPart:q, source:'Community'}));
    customs.filter(c => c.bodyPart === q).forEach(c => exercises.unshift({...c, source:'Custom'}));
  }

  // Second: search by name across all body parts (library + custom + shared)
  if(!exercises.length){
    customs.forEach(c => {
      if(c.name.toLowerCase().includes(q) || (c.primary && c.primary.toLowerCase().includes(q))){
        exercises.push({...c, source:'Custom'});
      }
    });
    shared.forEach(c => {
      if((c.name||'').toLowerCase().includes(q) || (c.primary && c.primary.toLowerCase().includes(q))){
        exercises.push({...c, source:'Community'});
      }
    });
    for(const [bodyPart, list] of Object.entries(EXERCISE_DB)){
      list.forEach(e=>{
        if(e.name.toLowerCase().includes(q) || (e.primary && e.primary.toLowerCase().includes(q))){
          exercises.push({...e,bodyPart,source:'Library'});
        }
      });
    }
  }
  
  // Third: if still nothing, and the person actually asked, ask the AI for custom exercises
  if(!exercises.length && !_typeahead){
    if(_superseded()) return;
    try{
      const raw=await api('Return a JSON array of 8 distinct exercises for: "'+query+'". Each must be a different specific exercise (not generic). Format: [{"name":"Exercise Name","equipment":"Equipment needed","primary":"Primary muscle"}]. Only JSON, no markdown.',[],query,500);
      const m=raw.match(/\[[\s\S]*\]/);
      if(m){
        const parsed=JSON.parse(m[0]);
        if(Array.isArray(parsed)){
          exercises = parsed.filter(e=>e.name).map(e=>({...e,source:'AI'}));
        }
      }
    }catch(e){console.log('AI exercise fallback failed:',e);}
  }
  
  // Render — unless a later keystroke has already started its own search, in which case this result
  // is describing a query the person has moved on from.
  if(_superseded()) return;
  if(!exercises.length){
    if(_typeahead){ res.className='tr-results'; res.innerHTML=''; return; }   // mid-word: say nothing rather than "No exercises found"
    const safeQ = _jsAttr(query);   // a JS string inside an attribute: & first, then \ ' " and newline
    res.className='tr-results';
    res.innerHTML='<div class="ios-empty">'+svgIcon('search',44)+'<div class="ios-empty-title">Nothing found</div>'+
      '<div class="ios-empty-body">No exercises found for \u201c'+_escFew(query)+'\u201d.</div>'+
      '<button class="btn primary tr-empty-btn" onclick="openCreateExercise(\''+safeQ+'\')">Create \u201c'+_escFew(query)+'\u201d</button></div>';
    return;
  }
  
  // Dedupe by name
  const seen=new Set();
  exercises=exercises.filter(e=>{
    const key=e.name.toLowerCase();
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
  
  // Each result was its own 1px-bordered box with a 6px gap — a stack of cards where iOS has a
  // list. The source tag was 11px caps with no tracking, jammed against the name.
  res.className='tr-results ios-list';
  res.innerHTML='';
  exercises.forEach(ex=>{
    const el=document.createElement('div');
    el.className='ex-result';
    const srcTag = ex.source==='Custom' ? '<span class="src-tag tint">Custom</span>'
      : ex.source==='Community' ? '<span class="src-tag">Community</span>' : '';
    // ex can come from three untrusted places: the community library (any signed-in user can write to
    // it), a third-party exercise API, and raw AI output from the api() call in this same flow. Escape
    // every field. Once an item is approved this list renders for EVERY user, not just the reviewer.
    const meta=[ex.bodyPart,ex.equipment,ex.primary,ex.secondary].filter(Boolean).map(_escFew).join(' \u00b7 ');
    el.innerHTML='<div class="ex-name">'+_escFew(ex.name)+srcTag+'</div><div class="ex-meta">'+meta+'</div>';
    el.onclick=()=>addExerciseToSession(ex);
    res.appendChild(el);
  });
  // Persistent "create your own" option at the bottom, like Hevy — for anything not listed.
  const createEl=document.createElement('div');
  createEl.className='ex-result tr-create';
  createEl.innerHTML='<div class="ex-name">'+svgIcon('plus',17)+' Create a new exercise</div><div class="ex-meta">Can\u2019t find it? Add your own movement.</div>';
  createEl.onclick=()=>openCreateExercise('');
  res.appendChild(createEl);
}
function getLastPerformance(exName){const history=ls('totry_workouts')||[];for(const session of history){const ex=session.exercises?.find(e=>e.name===exName);if(ex&&ex.sets?.length)return ex.sets;}return null;}
// Item 15 — progression suggestion, but ONLY when the data earns it. A real coach pushes you
// up when you're clearly ready: last session you hit (or beat) your top working set's reps and
// it wasn't a grind (RPE ≤ 8 if logged). Then we suggest a small, honest bump — load if you hit
// the top of the rep range, otherwise a rep. If the data doesn't justify it, we stay silent:
// no false confidence, no pushing a struggling lift. Returns {text} or null.
function suggestProgression(ex, lastSets){
  if(!ex || !lastSets || !lastSets.length) return null;
  // Work off the heaviest completed working set last time (ignore warmups).
  const working = lastSets.filter(s => (s.type||'normal')!=='warmup' && (parseFloat(s.weight)||0)>0 && (parseInt(s.reps)||0)>0);
  if(!working.length) return null;
  // Best working set = heaviest, and at equal weight the one with the most reps (the real best).
  const top = working.reduce((b,s)=> {
    const sw=parseFloat(s.weight), bw=parseFloat(b.weight);
    if(sw>bw) return s; if(sw===bw && (parseInt(s.reps)||0)>(parseInt(b.reps)||0)) return s; return b;
  }, working[0]);
  const w = parseFloat(top.weight), r = parseInt(top.reps);
  if(!w || !r) return null;
  // If RPE was logged and it was a true grind (>8.5), don't push — hold and consolidate.
  const rpe = top.rpe!=null ? parseFloat(top.rpe) : null;
  if(rpe!=null && rpe > 8.5) return null;
  // Determine the rep target. Routines may store "8-12", "10", or a number.
  let repHi = null;
  if(ex.targetReps){
    const m = String(ex.targetReps).match(/(\d+)\s*[-–]\s*(\d+)/);
    if(m) repHi = parseInt(m[2]); else { const n=parseInt(ex.targetReps); if(!isNaN(n)) repHi=n; }
  }
  // Double progression. With an explicit target, honour it. WITHOUT one, infer the scheme from what
  // they actually did: a low-rep set (≤6) is strength work — add load at 6, don't tell them to rep it
  // out to 12; a higher-rep set is hypertrophy — build toward 12 then load. The old flat ceiling of
  // 12 meant a 3–6 rep strength lifter got NO progression nudge at all — the feature silently failed
  // for exactly the people who overload most deliberately.
  const ceiling = repHi || (r <= 6 ? 6 : 12);
  // Only suggest if they actually MET the target last time (earned the bump).
  if(r < ceiling){
    // Hit fewer than ceiling reps — earn it by adding a rep, but only if they were already at/above
    // a reasonable floor (don't nudge a set that collapsed).
    if(r >= Math.max(5, ceiling-4)){
      return { kind:'rep', text: 'Last time: '+w+'kg × '+r+'. You\'re close — try for '+(r+1)+' reps at '+w+'kg today.' };
    }
    return null;
  }
  // Hit the ceiling: add load. Small jump — 2.5kg for most, round sensibly.
  const bump = w >= 60 ? 2.5 : w >= 20 ? 2.5 : 1;
  const newW = Math.round((w + bump)*2)/2;
  const lowReps = repHi ? (String(ex.targetReps).match(/(\d+)/)?.[1] || Math.max(5, ceiling-4)) : Math.max(5, ceiling-4);
  // `kind` exists so detectPlateau can ask what this IS rather than read what it SAYS. The two ran
  // independently and contradicted each other on the same lift on the same day — see the note there.
  return { kind:'load', text: 'You hit '+w+'kg × '+r+' last time — ready to try '+newW+'kg today. Build back up the reps.' };
}

// ── EXERCISE FORM LOOKUP ─────────────────────────────────────
// Free APIs: ExerciseDB (exercisedb.dev, 1300+ exercises w/ GIFs)
// + Wger.de (open-source exercise database, EN+DE+ES, no key needed)
const _exFormCache = {};
// BOTH UPSTREAM SOURCES DIED. Verified live 19 Aug 2026:
//   · exercisedb-api.vercel.app  → HTTP 402 DEPLOYMENT_DISABLED. The free deployment is gone.
//   · wger.de/api/v2/exercise/   → answers 200 but IGNORES ?name=, returning the whole catalogue
//     (count 860). The old code took results[0] and so served a random unrelated exercise as "how to
//     do it"; and because wger moved name/description into `translations`, both came back undefined,
//     so the modal rendered an empty panel with "Wger" stamped underneath. Worse than a miss, and it
//     preempted the honest empty state. wger removed /exercise/search/ too (404), and there is no
//     server-side filter left — matching would mean crawling all 860 entries on every lookup.
//
// So both tiers are removed rather than left to fail: two guaranteed-dead network requests on every
// tap, for nothing. showExerciseForm now says plainly that there is no reference and hands over a
// YouTube search, which is what the old copy told people to do by hand anyway.
//
// TO RE-ADD A SOURCE: return { source, name, gif, instructions[], target, equipment, secondary[] }
// from here, or null. Anything with no instructions must return null so the honest state still shows.
async function lookupExerciseForm(name){
  if(Object.prototype.hasOwnProperty.call(_exFormCache, name)) return _exFormCache[name];
  _exFormCache[name] = null;
  return null;
}

// Show exercise form info in a modal: GIF + instructions
async function showExerciseForm(name){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    // _escFew: this name comes from wger, from a Hevy import, or from a custom exercise somebody
    // typed — the same three sources the search row names in its own comment when it escapes it.
    '<h3 style="margin-bottom:4px">' + _escFew(name) + '</h3>' +
    '<p id="ex-form-status" style="font-size:var(--t-cap);color:var(--tx3);margin-bottom:14px">Looking up form &amp; instructions\u2026</p>' +
    '<div id="ex-form-body" style="text-align:center;padding:20px"><p class="pulsing" style="font-style:italic;color:var(--tx3)">Looking up...</p></div>' +
    '<button class="btn" onclick="closeModal(this)" style="margin-top:14px">Close</button>' +
  '</div>';
  document.body.appendChild(m);
  
  const info = await lookupExerciseForm(name);
  const body = document.getElementById('ex-form-body');
  if(!body) return;
  
  const _status = document.getElementById('ex-form-status');
  if(!info){
    // Both upstream sources are gone (ExerciseDB 402, wger's search endpoint 404). Say so plainly and
    // hand them the search rather than describing it. window.open(url,'_blank') is the house pattern
    // (app.js:1666) and Capacitor routes it to the system browser in the native shell.
    if(_status) _status.textContent = 'No reference for this one';
    const q = encodeURIComponent(name + ' proper form');
    body.innerHTML = '<p style="font-size:var(--t-sm);color:var(--tx2);text-align:center;line-height:1.65;padding:6px 4px 14px">I do not have a form reference for this exercise. The clearest thing is usually thirty seconds of video from someone who coaches it.</p>'+
      '<button class="btn" onclick="window.open(\'https://www.youtube.com/results?search_query='+q+'\',\'_blank\')" style="background:var(--bg3);color:var(--tx);font-size:var(--t-base)">Search YouTube for this</button>';
    return;
  }
  if(_status) _status.textContent = 'Form & instructions';
  
  let html = '';
  if(info.gif){
    html += '<img loading="lazy" decoding="async" src="' + info.gif + '" alt="' + info.name + '" style="max-width:100%;max-height:50vh;border-radius:var(--rm);background:#000;margin-bottom:12px" onerror="this.style.display=\'none\'">';
  }
  
  const tags = [info.target, info.equipment, ...(info.secondary || [])].filter(Boolean);
  if(tags.length){
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:14px">' +
      tags.map(t => '<span style="background:var(--bg3);border-radius:var(--rm);padding:3px 10px;font-size:var(--t-cap);color:var(--tx2);text-transform:capitalize">' + t + '</span>').join('') +
    '</div>';
  }
  
  if(info.instructions && info.instructions.length){
    html += '<div style="text-align:left;background:var(--bg3);border-radius:var(--rm);padding:14px">' +
      '<div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--go);text-transform:uppercase;letter-spacing:0.01em;margin-bottom:8px">How to do it</div>' +
      info.instructions.map((s, i) => '<div style="font-size:var(--t-base);color:var(--tx);line-height:1.6;margin-bottom:8px"><span style="color:var(--go);font-family:var(--font-text);font-size:var(--t-mini)">' + (i+1) + '.</span> ' + s + '</div>').join('') +
    '</div>';
  }
  
  html += '<div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--tx3);text-align:center;margin-top:10px;letter-spacing:0.01em">' + info.source + '</div>';
  body.innerHTML = html;
}
// ── LOADING THE BAR ──────────────────────────────────────────────────────────────────────────────
// The last real gap against Hevy and Strong: you know you want 102.5kg, and standing at the rack you
// have to work out what that is in plates.
//
// The thing that is easy to get wrong — and that my own test caught me getting wrong in this comment —
// is the step size. Plates load in PAIRS, so the smallest 1.25kg plate adds 2.5kg to the TOTAL. Every
// multiple of 2.5 above the bar is loadable exactly; 101kg is not, and never will be. When a target
// isn't reachable this says the closest it can actually do and by how much, instead of silently
// rounding and being wrong at the rack.
// Unlimited plates is assumed on purpose: pretending to know your gym's inventory would be false
// precision, and the count per side is what you need.
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const BARS_KG = [20, 15, 10];

function platesForSide(target, bar, plates){
  const t = parseFloat(target), b = parseFloat(bar);
  if(!isFinite(t) || !isFinite(b) || b < 0) return null;
  const avail = ((plates && plates.length) ? plates.slice() : PLATES_KG.slice()).sort((x, y) => y - x);
  if(t < b) return { bar: b, perSide: [], achieved: b, off: +(b - t).toFixed(2), under: true };
  // Greedy is exact here because every plate is a multiple of the smallest (1.25).
  let rem = +(((t - b) / 2).toFixed(4));
  const perSide = [];
  for(const p of avail){
    while(rem + 1e-9 >= p){ perSide.push(p); rem = +((rem - p).toFixed(4)); }
  }
  const loaded = perSide.reduce((a, x) => a + x, 0);
  const achieved = +((b + 2 * loaded).toFixed(2));
  return { bar: b, perSide: perSide, achieved: achieved, off: +((achieved - t).toFixed(2)), under: false };
}

function _plateChipsHTML(r){
  if(!r) return '';
  if(r.under){
    return '<div class="tr-plate-note">That’s under the bar on its own — the bar is ' + r.bar + 'kg.</div>';
  }
  const chips = r.perSide.length
    ? r.perSide.map(function(p){ return '<span class="tr-plate">' + p + '</span>'; }).join('')
    : '<span class="tr-plate-none">Just the bar.</span>';
  const off = r.off === 0
    ? ''
    : '<div class="tr-plate-note">Closest you can actually load is <b>' +
      r.achieved + 'kg</b> — ' + (r.off > 0 ? r.off + 'kg over' : Math.abs(r.off) + 'kg under') +
      ' what you asked for. Plates go on both sides, so the total can only move in 2.5kg steps.</div>';
  return '<div class="ios-header tr-flush">Per side</div>' +
    '<div class="tr-plate-row">' + chips + '</div>' +
    '<div class="tr-plate-sum">' + r.bar + 'kg bar + ' +
      r.perSide.length + ' plate' + (r.perSide.length === 1 ? '' : 's') + ' each side = <b>' +
      r.achieved + 'kg</b></div>' + off;
}

let _plateBar = 20;
function _plateRender(){
  try{
    const t = document.getElementById('plate-target');
    const out = document.getElementById('plate-out');
    if(!t || !out) return;
    const v = parseFloat(t.value);
    out.innerHTML = isFinite(v) ? _plateChipsHTML(platesForSide(v, _plateBar)) : '';
  }catch(_){}
}
function _plateSetBar(b){
  _plateBar = b;
  try{
    BARS_KG.forEach(function(x){
      const el = document.getElementById('plate-bar-' + x);
      if(el) el.classList.toggle('active', x === b);
    });
  }catch(_){}
  _plateRender();
}

// exIndex is optional — when it comes from an exercise row, prefill the heaviest weight already logged
// against it, because that is almost always what you are about to load again.
function openPlateMath(exIndex){
  let prefill = '';
  try{
    if(exIndex != null && typeof currentSession !== 'undefined' && currentSession[exIndex]){
      const ws = (currentSession[exIndex].sets || [])
        .map(function(st){ return parseFloat(st && st.weight); })
        .filter(function(n){ return isFinite(n) && n > 0; });
      if(ws.length) prefill = String(Math.max.apply(null, ws));
    }
  }catch(_){}
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  // Three bar buttons repainted by hand on every tap (background, border and colour, in _plateSetBar)
  // is a segmented control written the long way — same shape as the mobility durations.
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
    '<h3>Load the bar</h3>' +
    '<div class="tr-sheet-sub">What you want on the bar, and what goes on each side.</div>' +
    '<input type="number" id="plate-target" class="tr-bignum" inputmode="decimal" step="2.5" value="' + _escFew(prefill) + '" placeholder="102.5" oninput="_plateRender()">' +
    '<div class="ios-header tr-flush">Bar</div>' +
    '<div class="seg tr-seg">' +
      BARS_KG.map(function(b){
        return '<button type="button" id="plate-bar-' + b + '" onclick="_plateSetBar(' + b + ')" class="fst">' + b + 'kg</button>';
      }).join('') +
    '</div>' +
    '<div id="plate-out" class="tr-plate-out"></div>' +
    '<button class="btn quiet" onclick="closeModal(this)">Done</button>' +
  '</div>';
  document.body.appendChild(m);
  _plateSetBar(_plateBar);
  try{ if(prefill){ _plateRender(); } else { const i=document.getElementById('plate-target'); if(i) setTimeout(function(){ i.focus(); }, 150); } }catch(_){}
}

function addExerciseToSession(ex){
  if(currentSession.find(e=>e.name===ex.name)){showToast('Already added',ex.name+' is in your session');return;}
  currentSession.push({name:ex.name,bodyPart:ex.bodyPart||'',equipment:ex.equipment||'',tracking:ex.tracking||'weight_reps',custom:!!ex.custom,sets:[{weight:'',reps:'',type:'normal',done:false}]});
  document.getElementById('pt-ex-search').value='';document.getElementById('pt-ex-results').innerHTML='';
  renderWorkoutSession();
}
// Persist the live session on every render. This function is called after every mutation — a set
// added, edited, removed, an exercise appended — so it is the one place that sees them all. Without
// this the entire in-progress workout lived in a JS variable and nowhere else: one backgrounded tab
// reclaimed by iOS and every set logged so far was gone, with nothing to restore from.
function _saveSessionDraft(){
  try{
    if(typeof currentSession === 'undefined') return;
    if(currentSession && currentSession.length){
      // The records beaten so far ride with the draft. _sessionPRs is a plain module variable, so a
      // reload mid-session emptied it — and by then the tick handler had already written the new best
      // into totry_prs, so detectAndRecordPRs at Finish had nothing left to find and the banner went
      // missing again. That is the exact bug this list was added to fix, returning by a second route.
      ls('totry_session_draft', { session: currentSession, prs: (typeof _sessionPRs!=='undefined' ? _sessionPRs : []), startedAt: (typeof __sessionStart!=='undefined' && __sessionStart) || null, ts: Date.now() });
    } else {
      ls('totry_session_draft', null);
    }
  }catch(_){ }
}
// Bring one back if the app died mid-workout. Anything older than 18 hours is not a session someone
// is still in — it is a session they abandoned, and offering it back would be noise.
function restoreSessionDraft(){
  try{
    const d = ls('totry_session_draft');
    if(!d || !d.session || !d.session.length) return false;
    if(d.ts && (Date.now() - d.ts) > 18*3600000){ ls('totry_session_draft', null); return false; }
    if(typeof currentSession !== 'undefined' && currentSession.length) return false;   // never overwrite a live one
    currentSession = d.session;
    _sessionPRs = Array.isArray(d.prs) ? d.prs : [];
    if(d.startedAt && typeof __sessionStart !== 'undefined') __sessionStart = d.startedAt;
    renderWorkoutSession();
    if(typeof showToast === 'function') showToast('Picked up where you left off', currentSession.length + ' exercise' + (currentSession.length===1?'':'s') + ' from your last session were still open.');
    return true;
  }catch(_){ return false; }
}
function renderWorkoutSession(){
  try{ _saveSessionDraft(); }catch(_){ }
  const container=document.getElementById('pt-session-exercises');if(!container)return;
  const sessionWrap=document.getElementById('pt-session-wrap');
  const emptyState=document.getElementById('pt-session-empty');
  if(!currentSession.length){
    // Hide the populated session section and show the empty state guidance
    if(sessionWrap) sessionWrap.style.display='none';
    if(emptyState) emptyState.style.display='block';
    // Hevy's core flow: routine-first. Present routines as a clean, grouped, scannable list —
    // your in-app routines and your imported Hevy routines clearly separated, each showing its
    // exercise count so they're distinguishable (not a flat wall of identical buttons).
    const rBox = document.getElementById('pt-empty-routines');
    if(rBox){
      const own = (ls('totry_routines')||[]).filter(r=>r&&(r.name||r.title));
      const ownNames = new Set(own.map(r=>String(r.name||'').toLowerCase()));
      const hevy = (ls('totry_hevy_routines')||[]).filter(hr=>hr&&(hr.title||hr.name) && !ownNames.has(String(hr.title||hr.name).toLowerCase()));
      const rowFor = (r, isHevy) => {
        const name = String(isHevy ? (r.title||r.name) : (r.name||'Routine'));
        const exs = Array.isArray(r.exercises)?r.exercises:[];
        const sub = exs.length ? (exs.length+' exercise'+(exs.length>1?'s':'')+' · '+exs.slice(0,2).map(e=>String((e&&(e.name||e.title))||'').split(' ').slice(0,2).join(' ')).filter(Boolean).join(', ')) : 'tap to start';
        // JSON.stringify emits DOUBLE quotes, which terminated this double-quoted onclick attribute at the
        // first inner quote — so the handler never compiled and every Hevy "Start →" was inert. Single
        // quotes, escaped. Also hevyId, not id: normalised routines carry hevyId (see fetchHevyRoutines),
        // so the old argument was the literal string "undefined".
        const _rid = String(r.hevyId != null ? r.hevyId : (r.id != null ? r.id : '')).replace(/[\\'"]/g, '');
        const fn = isHevy ? ("startHevyRoutine('"+_rid+"')") : ('loadRoutine('+r.id+')');
        // Was a hand-rolled .routine-row: its own background, its own radius, a 17px title over a
        // 13px TERTIARY sub, and a tint "Start →" standing in for a chevron. It is an inset grouped
        // row now — same height, same separator inset, same chevron as every other destination in
        // the app — and iosRow escapes the name, which a person types.
        return iosRow({ title:name, sub:sub, value:'Start', onclick:fn });
      };
      // Reform: if Hevy routines exist (Pro live-sync OR free import/export), Hevy is the source of
      // truth — one clean list, no "From Hevy" split, no native builder competing. No Hevy routines
      // → native user: show their routines + a build option. Single coherent surface either way.
      const hevyAll = (ls('totry_hevy_routines')||[]).filter(hr=>hr&&(hr.title||hr.name));
      const hevyOwns = hevyAll.length > 0;
      // One section, one header, one footnote \u2014 instead of a .lbl carrying a second 12px tertiary
      // badge inside it, and a centred 12px line at the bottom that belonged in the footnote.
      let html='';
      if(hevyOwns){
        const list = hevyAll.length>6 ? hevyAll.slice(0,6) : hevyAll;
        const rows = list.map(r=>rowFor(r,true));
        if(hevyAll.length>6) rows.push(iosRow({ title:'Show all '+hevyAll.length+' routines', onclick:'_showAllHevyRoutines()', cls:'tint' }));
        html = iosList(rows, { header:'Your routines', footer:'Managed in Hevy and synced here \u00b7 edit them in Hevy.' });
      } else {
        // The dashed 1px border was the only dashed border in the app. A destination is a row.
        const rows = own.map(r=>rowFor(r,false));
        rows.push(iosRow({ icon:'plus', tone:'blue', title:'Build a routine', onclick:'setPTTab(\'routines\')' }));
        html = iosList(rows, { header: own.length ? 'Your routines' : 'Routines' });
      }
      rBox.innerHTML = html;
    }
    container.innerHTML='';
    releaseWakeLock();
    stopSessionTimer();
    return;
  }
  // We have exercises — show the session wrap, hide empty state
  if(sessionWrap) sessionWrap.style.display='block';
  if(emptyState) emptyState.style.display='none';
  requestWakeLock();
  startSessionTimer();
  container.innerHTML='';
  // Item 16 — readiness biases the session in the moment you train, not just on the home screen.
  // When recovery is low, gently suggest going lighter today; when you're primed, encourage the push.
  // Only speaks when there's a real signal; silent otherwise.
  try{
    // The banner below was 12px — a size that exists nowhere else in the app — inside a 1px
    // tinted border. Footnote size on a tinted fill, no border; the level tints the fill.
    const rd = (typeof computeReadiness==='function') ? computeReadiness() : null;
    if(rd && rd.level){
      let msg = '';
      if(rd.level === 'rest'){ msg = 'Your recovery\u2019s low today (' + rd.score + '/100' + (rd.reasons&&rd.reasons.length?' · '+rd.reasons.slice(0,2).join(', '):'') + '). No shame in keeping today light — drop a set or two, leave a rep in the tank. Showing up easy still counts.'; }
      else if(rd.level === 'moderate'){ msg = 'Recovery\u2019s moderate today (' + rd.score + '/100). Train well, but quality over maxing out — hit your reps clean rather than grinding.'; }
      else { msg = 'You\u2019re well recovered (' + rd.score + '/100). Good day to push — this is when a PR or a load bump is earned.'; }
      const banner = document.createElement('div');
      banner.className = 'tr-readiness' + (rd.level === 'go' ? ' tr-good' : '');
      banner.innerHTML = '<b>'+svgIcon("zap",14)+' Today:</b> ' + msg;
      container.appendChild(banner);
    }
  }catch(_){}
  currentSession.forEach((ex,ei)=>{
    const card=document.createElement('div');
    card.className='session-exercise';
    card.id='ex-card-'+ei;
    // Superset visual: if paired with previous, show connector. A class, not two inline styles —
    // the card's border is `border:0 !important` in the design system, so an inline borderLeft here
    // painted nothing at all and the pair read as two unrelated cards.
    if(ex.superset && ei > 0) card.classList.add('tr-paired');
    // Escapes the apostrophe and NOT the double quote, while the value goes into a double-quoted
  // attribute — so a name like 5\" deficit deadlift ends the attribute early and sprays the rest of
  // the handler into the markup as stray attributes. _jsAttr does both.
  const safeName = (typeof _jsAttr === 'function') ? _jsAttr(ex.name) : ex.name.replace(/'/g, "\\'");
    // SEVEN CONTROLS ON ONE 17px TITLE LINE, each hand-painted at its own size and grey: FORM in
    // 13px tint caps with no tracking, a swap arrow at 15px, a superset arrow at 13px, two 15px
    // reorder arrows and a delete — so the exercise NAME, which is the only thing on the card a
    // person is looking for, was squeezed to whatever was left and wrapped. The name and the two
    // actions that belong to it (form, remove) stay on the title line; the four that act on the
    // session — swap, pair, move up, move down — move to the card's own utility row at the bottom,
    // beside Add set and Plates, as icon buttons on the same 34px target. Every handler is the
    // handler it always was. The arrow glyphs become the app's own icons: ⇆ and ⇄ were two
    // characters doing an icon's job in a build that has one icon language.
    const supersetBadge = ex.superset && ei > 0 ?
      '<span class="tr-ex-pair">Superset</span>' : '';
    const supersetBtn = ei > 0 ?
      '<button class="tr-ex-btn' + (ex.superset ? ' on' : '') + '" title="' + (ex.superset ? 'Unpair from previous exercise' : 'Pair with previous exercise as a superset') + '" aria-label="' + (ex.superset ? 'Unpair from the previous exercise' : 'Pair with the previous exercise as a superset') + '" onclick="toggleSuperset(' + ei + ')">' + svgIcon('link',17) + '</button>' : '';
    // Reorder controls — move an exercise up/down in the session (Hevy lets you drag-reorder).
    const upBtn = ei > 0 ? '<button class="tr-ex-btn tr-up" title="Move up" aria-label="Move this exercise up" onclick="moveExercise('+ei+',-1)">'+svgIcon('chevronright',15)+'</button>' : '';
    const downBtn = ei < currentSession.length-1 ? '<button class="tr-ex-btn tr-down" title="Move down" aria-label="Move this exercise down" onclick="moveExercise('+ei+',1)">'+svgIcon('chevronright',15)+'</button>' : '';

    // Target reps/rest badge (from routine builder)
    const targets = [];
    if(ex.targetReps) targets.push('Target: ' + ex.targetReps + ' reps');
    if(ex.targetRest) targets.push('Rest: ' + ex.targetRest);
    const targetBadge = targets.length ?
      '<div class="tr-ex-badge">' + targets.join(' \u00b7 ') + '</div>' : '';
    // Item 15 — light progression nudge, shown only when the data earns it (see suggestProgression).
    const prog = (typeof suggestProgression==='function') ? suggestProgression(ex, getLastPerformance(ex.name)) : null;
    const progBadge = prog ?
      '<div class="tr-ex-prog"><b>' + prog.text + '</b></div>' : '';

    // A THIRD EXECUTING SINK, same class as the routine name and the bank-CSV description. Exercise
    // names are not all from the catalogue — addCustomExercise() lets a person type their own, and
    // that name lands here raw. Driven with `<img src=x onerror=...>`: it fired.
    card.innerHTML='<div class="se-name"><span class="tr-ex-title">'+_escFew(ex.name)+'</span>' + supersetBadge +
      '<button class="se-form" title="Show form & instructions" onclick="showExerciseForm(\''+safeName+'\')">Form</button>'+
      '<button class="se-del" onclick="removeExFromSession('+ei+')" aria-label="Remove this exercise from the session">&#215;</button></div>'+
      targetBadge +
      progBadge +
      '<div id="sets-'+ei+'"></div>'+
      '<div class="tr-ex-notes">' +
        '<button class="tr-ex-note" onclick="toggleExerciseNotes('+ei+')" id="ex-notes-toggle-'+ei+'">' + (ex.notes ? svgIcon("edit",13)+' Notes: "' + _escFew(ex.notes.length > 40 ? ex.notes.slice(0,40)+'\u2026' : ex.notes) + '"' : '+ Add note') + '</button>' +
        '<div id="ex-notes-wrap-'+ei+'" style="display:none;margin-top:4px">' +
          '<textarea id="ex-notes-input-'+ei+'" class="tr-ex-notes-in" placeholder="Form cue, how it felt, what to try next..." oninput="saveExerciseNote('+ei+',this.value)">' + _escFew(ex.notes || '') + '</textarea>' +
        '</div>' +
      '</div>' +
      '<div class="tr-ex-foot">' +
        '<button class="add-set-btn" onclick="addSetToEx('+ei+')">'+svgIcon('plus',15)+' Add set</button>' +
        // Right where the weight is being typed: the rack question, answered.
        '<button class="add-set-btn" onclick="openPlateMath('+ei+')">'+svgIcon('scale',15)+' Plates</button>' +
        '<span class="tr-ex-spacer"></span>' +
        '<button class="tr-ex-btn" title="Swap exercise \u2014 keeps your sets" aria-label="Swap this exercise, keeping your sets" onclick="swapExercise('+ei+')">'+svgIcon('repeat',16)+'</button>' +
        supersetBtn + upBtn + downBtn +
      '</div>';
    container.appendChild(card);renderSets(ei);
  });
}

// Swap an exercise mid-session, keeping every set/weight/rep (Hevy's replace).
async function swapExercise(ei){
  const cur = currentSession[ei]; if(!cur) return;
  const n = await askText('Swap this exercise', 'Your logged sets stay with it.', {placeholder:cur.name, confirmLabel:'Swap it'});
  if(!n || !n.trim()) return;
  const _new = n.trim();
  cur.name = _new;
  // Metadata must follow the name — see the note above.
  try{
    const norm = (typeof _normLibName === 'function') ? _normLibName(_new) : _new.toLowerCase().trim();
    let hit = null, hitPart = null;
    if(typeof EXERCISE_DB === 'object'){
      for(const part of Object.keys(EXERCISE_DB)){
        const m = (EXERCISE_DB[part]||[]).find(e => e && e.name &&
          ((typeof _normLibName === 'function') ? _normLibName(e.name) : String(e.name).toLowerCase().trim()) === norm);
        if(m){ hit = m; hitPart = part; break; }
      }
    }
    if(!hit){
      const customs = (typeof ls === 'function') ? (ls('totry_custom_exercises') || []) : [];
      const m = customs.find(e => e && e.name &&
        ((typeof _normLibName === 'function') ? _normLibName(e.name) : String(e.name).toLowerCase().trim()) === norm);
      if(m){ hit = m; hitPart = m.bodyPart || null; }
    }
    if(hit){
      if(hitPart) cur.bodyPart = hitPart;
      if(hit.primary) cur.primary = hit.primary;
      if(hit.secondary) cur.secondary = hit.secondary;
      if(hit.equipment) cur.equipment = hit.equipment;
    } else {
      // Unknown name: no metadata is better than the previous exercise's. weeklyLoadByModality and the
      // heatmap already handle a missing bodyPart; a WRONG one they cannot detect.
      delete cur.bodyPart; delete cur.primary; delete cur.secondary; delete cur.equipment;
    }
  }catch(_){ }
  haptic('tick');
  renderWorkoutSession();
}

// Reorder an exercise within the session (Hevy drag-reorder, done with up/down here).
function moveExercise(ei, dir){
  const ni = ei + dir;
  if(ni < 0 || ni >= currentSession.length) return;
  const tmp = currentSession[ei];
  currentSession[ei] = currentSession[ni];
  currentSession[ni] = tmp;
  // Moving breaks a superset pairing cleanly — clear the flag on the moved pair to avoid orphans
  if(currentSession[ei]) currentSession[ei].superset = false;
  if(currentSession[ni]) currentSession[ni].superset = false;
  haptic('tap');
  renderWorkoutSession();
}

function toggleExerciseNotes(ei){
  const wrap = document.getElementById('ex-notes-wrap-'+ei);
  if(!wrap) return;
  const open = wrap.style.display !== 'none';
  wrap.style.display = open ? 'none' : 'block';
  if(!open){
    setTimeout(() => document.getElementById('ex-notes-input-'+ei)?.focus(), 50);
  }
}

function saveExerciseNote(ei, text){
  // Notes are part of the session too — same reason as renderSets above.
  try{ setTimeout(function(){ try{ _saveSessionDraft(); }catch(_){ } }, 0); }catch(_){ }
  if(!currentSession[ei]) return;
  currentSession[ei].notes = text;
  // GATED, 12 Oct 2026 — AND DEBOUNCED, WHICH IS THE WHOLE POINT. The value is argument-shaped
  // (`oninput="saveExerciseNote(N,this.value)"`), so no census could see it, and the field's own
  // placeholder is "Form cue, HOW IT FELT, what to try next..." — it asks.
  // This handler fires PER KEYSTROKE. Gating it the obvious way would rebuild the defect found in
  // `runUniversalSearch` the same afternoon: every innocent completion in this detector is a SUFFIX
  // test, so a half-typed sentence has no suppressing suffix and 19 of 25 of the suite's own
  // ordinary sentences raise a card mid-word. Judge the SETTLED note.
  // The visible textarea is deliberately NOT cleared — yanking text out from under a cursor
  // mid-typing is its own harm. What is undone is the PERSISTED note: the draft is re-saved without
  // it, so the sentence does not travel into the finished workout (and `finishWorkout` is what puts
  // a session where the coach and the model can read it).
  // Latched per exercise, because a card re-rendering under a moving cursor is its own kind of
  // not-listening.
  try{
    saveExerciseNote._t = saveExerciseNote._t || {};
    saveExerciseNote._met = saveExerciseNote._met || {};
    clearTimeout(saveExerciseNote._t[ei]);
    saveExerciseNote._t[ei] = setTimeout(function(){
      try{
        if(saveExerciseNote._met[ei]) return;
        if(typeof crisisInAny !== 'function') return;
        const _k = crisisInAny([currentSession[ei] && currentSession[ei].notes]);
        if(!_k) return;
        saveExerciseNote._met[ei] = true;
        if(currentSession[ei]) currentSession[ei].notes = '';
        try{ _saveSessionDraft(); }catch(_){ }
        if(typeof journalMeetCrisis==='function') journalMeetCrisis(_k, null, { saved: false });
      }catch(_){ }
    }, 500);
  }catch(_){ }
  // Update the toggle label live
  const toggle = document.getElementById('ex-notes-toggle-'+ei);
  if(toggle){
    if(text.trim()){
      toggle.innerHTML = svgIcon("edit",12)+' Notes: "' + _escFew(text.length > 40 ? text.slice(0,40)+'…' : text) + '"';
    } else {
      toggle.textContent = '+ Add note';
    }
  }
}

function toggleSuperset(ei){
  if(ei <= 0) return;
  currentSession[ei].superset = !currentSession[ei].superset;
  renderWorkoutSession();
  if(currentSession[ei].superset){
    showToast('Superset', 'Paired with ' + currentSession[ei-1].name + '. Alternate sets between them.');
  } else {
    showToast('Unpaired', 'No longer a superset.');
  }
}
function renderSets(ei){
  const container=document.getElementById('sets-'+ei);if(!container)return;
  // Every set change lands here and nowhere else — see the note above. Cheap and idempotent: the
  // draft is one small JSON blob, and without this it never contained a single logged set.
  try{ _saveSessionDraft(); }catch(_){ }
  const ex=currentSession[ei];const lastSets=getLastPerformance(ex.name);
  container.innerHTML='';
  // A SET ROW IS A TABLE, AND ITS HEADER HAD ITS OWN HAND-TYPED WIDTHS. Nine 11px cells with no
  // tracking, whose widths did not match the cells under them — so on a 393px phone "TYPE" and
  // "PREV" ran into each other with no gap and read as one word, TYPEPREV. Header and cells share
  // the .tr-c-* classes now, which is the only way the two can stay agreed.
  // The unit moved INTO the header. There was a "kg" column label AND a per-row "kg" span beside
  // every weight box, saying the same thing twice — and the header's was a literal "kg" while the
  // span was the real unit, so a distance or time exercise showed "kg" over a field measuring
  // metres. One unit, read from the exercise, in the place a table puts it.
  const _trk0 = ex.tracking || 'weight_reps';
  const _unit = _trk0==='assisted' ? 'assist' : _trk0==='time' ? 'sec' : _trk0==='distance' ? 'm' : 'kg';
  const hdr=document.createElement('div');
  hdr.className='tr-set-hd';
  hdr.innerHTML='<span class="tr-c-num">#</span>'+
    '<span class="tr-c-type"></span>'+
    '<span class="tr-c-prev">Prev</span>'+
    '<span class="tr-c-w">'+_unit+'</span>'+
    '<span class="tr-c-r">Reps</span>'+
    '<span class="tr-ex-spacer"></span>'+
    '<span class="tr-c-done"></span>'+
    '<span class="tr-c-rpe">RPE</span>';
  container.appendChild(hdr);
  if(lastSets){const lr=document.createElement('div');lr.className='tr-set-hint';lr.innerHTML='<b>Tap the blue numbers</b> to reuse last session\'s weight \u00d7 reps.';container.appendChild(lr);}
  const tl={normal:'S',warmup:'W',drop:'D',failure:'F'};
  // PREV HAS TO COMPARE LIKE WITH LIKE. This was lastSets[si] — raw index — so today's first WORKING
  // set was shown last session's WARM-UP. The row then says "Tap the blue numbers to reuse last
  // session's weight x reps", which is the app's headline affordance on this screen, and tapping it
  // loaded 46kg into a set meant for 92.5kg. A person who trusts the number logs a warm-up as a
  // working set, and every downstream reading — e1RM, the PR store, tonnage, plateau detection —
  // inherits it. suggestProgression() twenty lines up already filters warm-ups out before it reasons;
  // the column a person actually READS did not.
  // Matched by type and by ordinal WITHIN that type: today's first warm-up against last session's
  // first warm-up, today's first working set against last session's first working set. When today
  // has a kind last session did not, there is nothing comparable and the cell stays empty, which is
  // the honest answer rather than the nearest row.
  const _prevByType = (function(){
    const out = {};
    (lastSets || []).forEach(function(ps){
      const t = (ps && ps.type) || 'normal';
      (out[t] = out[t] || []).push(ps);
    });
    return out;
  })();
  const _seenByType = {};
  ex.sets.forEach((s,si)=>{
    const _t = (s && s.type) || 'normal';
    const _n = (_seenByType[_t] = (_seenByType[_t] || 0) + 1) - 1;
    const lastSet=(_prevByType[_t] || [])[_n];
    const row=document.createElement('div');row.className='set-row';
    // Hevy-style swipe-left-to-delete: drag a row left to remove that set. Touch + mouse.
    let _sx=0,_dx=0,_drag=false;
    row.style.transition='transform 0.15s ease, background 0.15s';
    const _resetSwipe=()=>{row.style.transform='translateX(0)';row.style.background='';};
    const _doDelete=()=>{
      if(currentSession[ei].sets.length<=1){ _resetSwipe(); showToast('Keep one set','An exercise needs at least one set. Remove the exercise instead.'); return; }
      row.style.transform='translateX(-100%)';row.style.opacity='0';
      setTimeout(()=>{ currentSession[ei].sets.splice(si,1); haptic('tap'); renderSets(ei); },150);
    };
    row.addEventListener('touchstart',e=>{_sx=e.touches[0].clientX;_drag=true;},{passive:true});
    row.addEventListener('touchmove',e=>{ if(!_drag)return; _dx=e.touches[0].clientX-_sx; if(_dx<0){ row.style.transform='translateX('+Math.max(_dx,-120)+'px)'; row.style.background=_dx<-60?'var(--re-bg)':''; } },{passive:true});
    row.addEventListener('touchend',()=>{ _drag=false; if(_dx<-60){ _doDelete(); } else { _resetSwipe(); } _dx=0; });
    // Set number prefix
    const numEl=document.createElement('span');
    numEl.className='tr-c-num';
    numEl.textContent=(si+1);
    row.appendChild(numEl);
    // A 1px-bordered 11px box was the only outlined control on the screen. Same size, iOS fill,
    // and the tint tells you at a glance that this set is not an ordinary one.
    const tb=document.createElement('button');tb.className='tr-c-type tr-type-btn'+((s.type&&s.type!=='normal')?' on':'');tb.title='Set type: normal, warm-up, drop set, to failure';tb.setAttribute('aria-label','Set type');
    tb.textContent=tl[s.type||'normal'];tb.onclick=()=>{const types=['normal','warmup','drop','failure'];const cur=types.indexOf(s.type||'normal');currentSession[ei].sets[si].type=types[(cur+1)%types.length];renderSets(ei);};row.appendChild(tb);
    // Hevy's killer feature: tap your previous-session number to instantly fill this set.
    // The single biggest friction-remover for progressive overload.
    const prevBtn=document.createElement('button');
    prevBtn.title='Tap to use last time';
    if(lastSet && (lastSet.weight || lastSet.reps)){
      // Was --bl (teal) at 11px under an opacity multiplier: a fourth accent colour, dimmed, on the
      // one control this screen exists to make easy to hit. Tint, at footnote size, at full strength.
      prevBtn.className='tr-c-prev tr-prev-btn';
      prevBtn.innerHTML=(lastSet.weight||'?')+'<br>×'+(lastSet.reps||'?');
      prevBtn.onclick=()=>{
        currentSession[ei].sets[si].weight=lastSet.weight||'';
        currentSession[ei].sets[si].reps=lastSet.reps||'';
        haptic('tap');
        renderSets(ei);
      };
    } else {
      prevBtn.className='tr-c-prev tr-prev-btn';
      prevBtn.innerHTML='\u2013';
      prevBtn.disabled=true;
    }
    row.appendChild(prevBtn);
    // Adapt the weight field to how this exercise is tracked. Assisted = enter the assistance
    // (positive number, stored negative so progress math reads "less help = stronger"). Bodyweight
    // needs no weight. Time/distance reuse the field with a clearer unit.
    const trk = currentSession[ei].tracking || 'weight_reps';
    const unitLabel = trk==='assisted' ? 'assist' : trk==='time' ? 'sec' : trk==='distance' ? 'm' : 'kg';
    const wPlaceholder = trk==='assisted' ? 'assist' : trk==='bodyweight' ? 'BW' : (lastSet?(trk==='assisted'? Math.abs(lastSet.weight): lastSet.weight):unitLabel);
    const wIn=document.createElement('input');wIn.type='number';wIn.className='set-input';wIn.placeholder=wPlaceholder||'kg';
    // Display assisted weight as positive (the assistance amount); store as negative internally.
    wIn.value = (s.weight!==''&&s.weight!=null) ? (trk==='assisted' ? Math.abs(parseFloat(s.weight)) : s.weight) : '';
    wIn.classList.add('tr-c-w');
    if(trk==='bodyweight'){ wIn.disabled=true; wIn.style.opacity='0.4'; }
    // ONE READER FOR THIS FIELD. The input shows assistance as a positive number and stores it as
    // NEGATIVE ("less help = stronger", 19-workout.js). This did the negation; the ✓ handler below
    // assigned wIn.value raw — and a click is always preceded by the input's own blur/change, so the
    // ✓ won every time and every set a person actually ticked was stored positive. exerciseVolume
    // computes Math.max(0, bw + w) for assisted work, so 30kg of help at bodyweight 90 became 120kg
    // per rep instead of 60: double the volume, a celebrated "New PR" for needing help, and an
    // overload suggestion to use MORE assistance next time — aimed at the person who cannot do a
    // pull-up yet. Two writers of one value is how that happened; there is one now.
    const _readWeight = () => {
      let v = wIn.value;
      if(trk==='assisted' && v!=='' && !isNaN(parseFloat(v))) v = String(-Math.abs(parseFloat(v))); // assistance is negative
      return (trk==='bodyweight') ? '0' : v;
    };
    wIn.onchange=()=>{ currentSession[ei].sets[si].weight = _readWeight(); };
    row.appendChild(wIn);
    // The unit span that used to sit here said the same word as the column header directly above it.
    // It is in the header now — see the note there.
    const rIn=document.createElement('input');rIn.type='number';rIn.className='set-input';rIn.placeholder=lastSet?.reps||'reps';rIn.value=s.reps||'';rIn.classList.add('tr-c-r');rIn.onchange=()=>{currentSession[ei].sets[si].reps=rIn.value;};row.appendChild(rIn);
    const spacer=document.createElement('span');spacer.className='tr-ex-spacer';row.appendChild(spacer);
    const db=document.createElement('button');db.className='set-done tr-c-done'+(s.done?' on':'');db.setAttribute('aria-label','Mark set '+(si+1)+' done');db.textContent='\u2713';
    db.onclick=()=>{
      currentSession[ei].sets[si].weight=_readWeight();currentSession[ei].sets[si].reps=rIn.value;
      const wasDone=currentSession[ei].sets[si].done;currentSession[ei].sets[si].done=!wasDone;
      if(!wasDone){haptic('success');
        // Assistance is not load. A "PR" for needing 30kg of help is the app congratulating someone
        // for the thing they came here to stop needing — and it was firing because this read the
        // positive displayed value. Assisted sets do not set records.
        const w=(trk==='assisted') ? 0 : parseFloat(_readWeight()),r=parseInt(rIn.value);
        if(w&&r&&(s.type||'normal')!=='warmup'){const orm=estE1RM(w,r);const prs=ls('totry_prs')||{};if(!prs[ex.name]||orm>prs[ex.name].orm){showToast('New PR!',ex.name+' \u2014 est. 1RM: '+orm+'kg');prs[ex.name]={orm,weight:w,reps:r,date:new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})};ls('totry_prs',prs);_sessionPRs=(_sessionPRs||[]).filter(p=>p.name!==ex.name).concat([{name:ex.name,orm:orm}]);setTimeout(()=>showVerseToast('pr','Word for your PR'),800);}}
        // Rest timer: use this exercise's remembered rest, default 90s. Hevy-style per-exercise.
        // Hevy rip: warmup sets don't trigger rest \u2014 you ramp, you don't sit.
        const justDone = currentSession[ei] && currentSession[ei].sets && currentSession[ei].sets[si];
        // Live PR check — celebrate THE MOMENT you beat your best, not just at finish
        if(justDone && justDone.type !== 'warmup' && typeof maybeCelebratePR === 'function'){
          maybeCelebratePR(currentSession[ei].name, parseFloat(justDone.weight)||0, parseInt(justDone.reps)||0);
        }
        if(justDone && justDone.type === 'warmup'){ /* no rest after warmups */ }
        else {
        const restMap = ls('totry_rest_times') || {};
        // Read what is actually stored — see the note above. restTime was never written by anything.
        const restSecs = restMap[ex.name] || _restSeconds(ex) || 90;
        // Hevy superset flow: partners alternate with no rest between; rest after the pair.
        const isSecond = currentSession[ei] && currentSession[ei].superset === true;
        const partner = isSecond ? ei - 1 : ((currentSession[ei+1] && currentSession[ei+1].superset) ? ei + 1 : -1);
        if(partner > -1){
          if(isSecond) startRestTimer(restSecs, ex.name);
          const pc = document.getElementById('ex-card-' + partner);
          if(pc) setTimeout(() => { try{ pc.scrollIntoView({block:'center', behavior:'smooth'}); }catch(_){} }, 150);
        } else {
          startRestTimer(restSecs, ex.name);
        }
        }
      }
      renderSets(ei);
    };
    row.appendChild(db);
    
    // RPE — native select: one tap opens the iOS wheel, pick the number directly.
    // Two of these six colours were hex literals (#A8D8B9, #E89B5C) that no theme could follow, and
    // the select they painted named "DM Mono" — a font this app does not ship, so every RPE control
    // in the logger rendered in the system monospace. One app, one typeface; system colours only.
    const rpeColors = {'':'var(--tx3)','6':'var(--gr)','6.5':'var(--gr)','7':'var(--gr)','7.5':'var(--gr)','8':'var(--tx)','8.5':'var(--tx)','9':'var(--re)','9.5':'var(--re)','10':'var(--re)'};
    const curRpe = (s.rpe || '') + '';
    const rpeSel = document.createElement('select');
    rpeSel.title = 'RPE (rate of perceived exertion)';
    ['','6','6.5','7','7.5','8','8.5','9','9.5','10'].forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v||'\u2013';if(v===curRpe)o.selected=true;rpeSel.appendChild(o);});
    rpeSel.className = 'tr-c-rpe tr-rpe';
    rpeSel.style.color = rpeColors[curRpe] || 'var(--tx3)';
    rpeSel.setAttribute('aria-label','RPE, rate of perceived exertion');
    rpeSel.onchange = () => { currentSession[ei].sets[si].rpe = rpeSel.value || null; haptic('tick'); renderSets(ei); };
    row.appendChild(rpeSel);
    
    container.appendChild(row);
  });
}
function addSetToEx(ei){const last=currentSession[ei].sets[currentSession[ei].sets.length-1];currentSession[ei].sets.push({weight:last.weight,reps:last.reps,type:'normal',done:false});renderSets(ei);}
function removeExFromSession(ei){currentSession.splice(ei,1);renderWorkoutSession();}

// ── PLATE CALCULATOR ─────────────────────────────────────────
// User inputs total barbell weight, we calculate plates per side
// openPlateCalculator() and renderPlateBreakdown() lived here and were REMOVED in v442.
// They were a second plate calculator, predating the one I added in v426 — which I built without
// checking whether the app already had one. Two consequences, both real:
//   · they disagreed. This one carried a 0.5kg plate, so it answered 101kg as loadable while the
//     other correctly said the closest is 100kg. Same lift, same card, two answers.
//   · they COLLIDED. Both used id="plate-target" for their input, so whichever modal was in the DOM
//     could be read by the other function.
// Consolidated on openPlateMath(): it is the tested one (a 46-row bodyweight/step sweep), it is honest
// when a target is not loadable ("closest you can load is 100kg — 1kg under"), and it prefills from the
// heaviest set already logged against that exercise. Both "Plates" buttons now open it.
// The 0.5kg plate is deliberately not carried: 1.25kg is the smallest plate in a normal commercial gym,
// and pretending otherwise makes the app confidently wrong at the rack.
async function saveWorkoutSession(){
  if(!currentSession.length){
    showToast('Nothing to save','Add some exercises first.');
    return;
  }
  // Warn if no completed sets
  const totalDone = currentSession.reduce((a,ex)=>a+ex.sets.filter(s=>s.done).length,0);
  if(totalDone === 0){
    if(!(await askConfirm('You haven\'t marked any sets as done. Save anyway?'))) return;
  }
  const cs=currentSession.reduce((a,ex)=>a+ex.sets.filter(s=>s.done).length,0);
  const ts=currentSession.reduce((a,ex)=>a+ex.sets.length,0);
  const vol=Math.round(currentSession.reduce((total,ex)=>total + (typeof exerciseVolume==='function' ? exerciseVolume({...ex, sets: ex.sets.filter(s=>s.done)}) : ex.sets.filter(s=>s.done&&parseFloat(s.weight)>0&&s.reps).reduce((a,s)=>a+(parseFloat(s.weight)*parseInt(s.reps)),0)),0));
  const durationMin = __sessionStart ? Math.max(1, Math.round((Date.now()-__sessionStart)/60000)) : null;
  // source:'manual' — without it getUnifiedTraining's `w.source || 'hevy'` branded every session you
  // logged HERE as coming from Hevy: the history showed a HEVY tag, the card read "From your Hevy", and
  // the detail modal told you to go edit it in Hevy. For someone who has never heard of Hevy that is a
  // claim the app cannot keep, and it left in-app sessions with no edit path at all.
  const session={id:Date.now(),source:'manual',date:new Date().toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'}),ts:new Date().toISOString(),startedAt:(__sessionStart ? new Date(__sessionStart).toISOString() : null),day:getDayCount(),exercises:JSON.parse(JSON.stringify(currentSession.filter(ex => (ex && Array.isArray(ex.sets)) ? ex.sets.some(st => st && st.done) : false))),completedSets:cs,totalSets:ts,volume:vol,durationMin:durationMin,splitFocus:getUserSplit()[tIdx()]?.focus||'Workout'};
  const history=ls('totry_workouts')||[];history.unshift(session);
  const _saved = ls('totry_workouts',_capWorkouts(history));
  // PRs were detected on a HEVY SYNC and nowhere else — so a person who logged their session in this
  // app, on this screen, with these sets, never got one. The whole reason a lifter opens Strong twice
  // is that it tells them when they have just done something they have never done before, and ours
  // told only the people who lift somewhere else. Detect on OUR save too, from the same function.
  let prHit = [];
  if(_saved !== false){
    try{
      // THE SUMMARY SHEET IS THE CELEBRATION — a gold "NEW PERSONAL RECORD" line under the session's
      // own numbers, which is where a lifter looks when they finish. v566 put a toast here instead,
      // and did something worse on the way: by recording the PR first it left updatePersonalRecords
      // with no improvement to find, so that call returned nothing and the banner went EMPTY.
      // Measured — 90kg x 5 against last week's 80 x 5: the summary read "1 EXERCISES / NOW FUEL IT"
      // where it used to read "1 EXERCISES / 🏆 NEW PERSONAL RECORD Bench Press — est. 1RM 105".
      // The fix that finally told in-app lifters about their PRs had quietly removed the place those
      // PRs had always been shown. Detect once, here, and hand the result down.
      // detectAndRecordPRs returns e1rm; the banner reads .orm — mapped, not renamed, because the
      // stored record and the two Hevy callers both speak e1rm. Lifted load stays kg on purpose.
      prHit = ((typeof detectAndRecordPRs === 'function')
        ? (detectAndRecordPRs(session.exercises || []) || []) : [])
        .map(function(p){ return { name: p.name, orm: Math.round(p.e1rm || 0) }; });
      // Anything already celebrated at the tick is invisible to the detection above, by design — it is
      // ALREADY the stored record. Merge, so the sheet shows every record beaten in this session
      // whichever way it was entered, and never the same lift twice.
      // RECONCILED AGAINST WHAT WAS ACTUALLY DONE. _sessionPRs is appended the moment a set is ticked,
      // so a lift ticked and then UN-ticked before Finish still reached the banner — routing straight
      // around the `if(!s.done) return;` gate v568 added so the app cannot celebrate a lift the person
      // did not do. Kept only where the saved session still holds a ticked, non-warmup set that earns
      // it, which is the same criterion detectAndRecordPRs applies.
      const _stillDone = function(name, orm){
        const ex = (session.exercises || []).find(function(e){ return e && e.name === name; });
        if(!ex) return false;
        return (ex.sets || []).some(function(st){
          if(!st || st.done === false) return false;
          if(st.type && /warm/i.test(st.type)) return false;
          const w = parseFloat(st.weight) || 0, r = parseInt(st.reps) || 0;
          return w > 0 && r > 0 && estE1RM(w, r) >= orm;
        });
      };
      (_sessionPRs || []).forEach(function(p){
        const orm = Math.round(p.orm || 0);
        if(!_stillDone(p.name, orm)) return;
        if(!prHit.some(function(x){ return x.name === p.name; })) prHit.push({ name: p.name, orm: orm });
      });
      if(prHit.length && typeof haptic === 'function') haptic('success');
    }catch(_){ prHit = []; }
  }
  if(_saved === false){
    // Keep everything. The session is still in currentSession and still in the draft, so they can
    // free some space and finish again — see the note above.
    if(typeof showToast==='function') showToast('Not saved \u2014 your session is still here',
      'There was no room to write it. Free some space in Settings \u2192 Your data, then tap Finish again. Nothing has been lost.');
    // 'error' is NOT one of haptic()'s patterns (tap|success|warning|celebrate|light|alert) — it fell
    // through to impact MEDIUM, so a failed save felt exactly like an ordinary tap.
    if(typeof haptic==='function') haptic('warning');
    return;
  }
  if(typeof logEvent==='function') logEvent('workout_logged');
  // Mirror it into Apple Health, if they turned that on. Fire and forget.
  try{ if(typeof HealthWrite!=='undefined') HealthWrite.workout(session); }catch(_){}
  // updatePersonalRecords used to run here as a SECOND pass over the same session, writing the same
  // store in a different shape (no `heaviest`) and racing the detection above for which shape won.
  // With the done-gate added to detectAndRecordPRs the two now apply identical criteria, so the
  // second pass could only ever re-write what the first had just written. One recorder.
  stopRestTimer();
  const savedExCount = session.exercises.length;
  stopSessionTimer();
  currentSession=[];_sessionPRs=[];renderWorkoutSession();
  showWorkoutSummary({exercises:savedExCount, sets:cs, vol:vol, durationMin:durationMin, prs:prHit});
  loadH();const gi=habits.findIndex(h=>h.n.toLowerCase().includes('gym'));if(gi>=0){habits[gi].d[tIdx()]=1;saveH();renderHabits();}
  checkMilestones();
}

// Hevy-style post-workout summary: duration, volume, sets, and any PRs hit.
function showWorkoutSummary(s){
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.style.alignItems='center';
  const prLines = (s.prs && s.prs.length)
    ? '<div class="tr-sheet-block"><div class="ios-header tr-flush tint">New personal record'+(s.prs.length>1?'s':'')+'</div>'+
      s.prs.slice(0,5).map(p=>'<div class="tr-sheet-line">'+_escFew(p.name)+' \u2014 est. 1RM '+p.orm+'kg</div>').join('')+'</div>'
    : '';
  // ── THE LOOP: Train → Nourish handoff. Training creates a fueling need; bridge straight
  // into it: rough burn estimate, today's protein status, one tap to log a meal.
  let fuelBlock = '';
  try{
    const burnEst = s.durationMin ? Math.round(s.durationMin * 6) : null; // ~6 kcal/min resistance training, honest rough estimate
    // The session is already saved to totry_workouts; rebuild the burn ledger from there (single
    // source of truth) so this session is counted exactly once, never stacked with a later resync.
    recomputeWorkoutBurns();
    const goals = ls('totry_nut_goals') || defaultNutGoals();
    const todayEntries = ((ls('totry_nutlog')||{})[dayKeyOf()]) || [];
    const proSoFar = Math.round(todayEntries.reduce((a,e)=>a+(e.pro||0),0));
    const proGoal = goals.pro || 170;
    const proLeft = Math.max(0, proGoal - proSoFar);
    // NUMBERS OFF MEANS NUMBERS OFF, HERE TOO. Nourish's gentle mode promises "I'll hold the maths.
    // You'll still get counsel, just no numbers to fight with" — and this sheet, which opens the second
    // a session is saved, has been answering with "Roughly ~348 cal burned" and "Protein: 0g of 170g"
    // the whole time. This file has never mentioned nutGentle. For someone who turned counting off
    // because counting is the thing that hurt them, a calorie figure and a gram target on the way out
    // of a workout is the promise broken at the worst moment; the app's own note says a promise that
    // leaks a figure two cards down is worse than no promise at all. The handoff itself still stands —
    // it just says the true thing without the arithmetic.
    const _gentle = (typeof nutGentle==='function') && nutGentle();
    fuelBlock = '<div class="tr-sheet-block">'+
      '<div class="ios-header tr-flush">Now fuel it</div>'+
      '<div class="tr-sheet-body">'+
        (_gentle
          ? 'You have just asked something of your body \u2014 give it what it needs. The meal after training is the one that matters most.'
          : ((burnEst ? 'Roughly <span style="color:var(--go)">~'+burnEst+' cal</span> burned (added to today\'s net). ' : '')+
             (proLeft > 0 ? 'Protein: <span style="color:var(--gr)">'+proSoFar+'g of '+proGoal+'g</span> — '+proLeft+'g to go. The next meal matters most after training.' : 'Protein: <span style="color:var(--gr)">'+proSoFar+'g</span> — goal hit. Well fuelled.')))+
      '</div>'+
      '<button class="btn tr-sheet-go" onclick="closeModal(this);go(\'nourish\')">Log a meal</button>'+
    '</div>';
  }catch(_){ fuelBlock=''; }
  // FOUR HAND-PAINTED STAT TILES where the app has .ios-stats: a 22px number over an 11px caps
  // label with 0.01em of tracking, on --bg3, four times. And the title was centred italic serif in
  // the TINT with an icon after the words — the reading face doing a display face's job. The sheet
  // title role is the brand serif, which is what this sheet should have been speaking in all along.
  const tile = (v,l) => '<div class="ios-stat"><div class="ios-stat-value">'+v+'</div><div class="ios-stat-label">'+l+'</div></div>';
  m.innerHTML='<div class="modal">'+
    '<div class="modal-handle"></div>'+
    '<h3>Session complete</h3>'+
    '<div class="tr-sheet-sub">Logged and saved. Strong work.</div>'+
    '<div class="ios-stats">'+
      (s.durationMin?tile((s.durationMin>=60?Math.floor(s.durationMin/60)+'h '+(s.durationMin%60)+'m':s.durationMin+'m'),'Duration'):'')+
      tile((s.vol>0?s.vol.toLocaleString():'\u2014'),'kg volume')+
      tile(s.sets,'Sets done')+
      tile(s.exercises,'Exercises')+
    '</div>'+
    prLines+
    fuelBlock+
    '<button class="btn primary tr-sheet-go" onclick="closeModal(this)">Done</button>'+
    '</div>';
  document.body.appendChild(m);
  haptic('celebrate');
}
async function clearWorkoutSession(){
  if(!currentSession.length)return;
  if(!(await askConfirm('Clear this session? Anything not saved will be lost.'))) return;
  currentSession=[];_sessionPRs=[];
  renderWorkoutSession();
  showToast('Cleared','Session cleared. Ready for the next one.');
}

// ── WORKOUT SCREENSHOT UPLOAD ────────────────────────────────
// User uploads an Apple Watch / Fitness / Strava workout summary screenshot.
// AI vision extracts the workout type, duration, and calories. Logs it like any session.
// Manual cardio/workout log — the reliable fallback when the screenshot reader can't be used
// (e.g. AI vision down, or no screenshot handy). Saves a workout that ticks the gym habit and
// feeds the calorie loop, exactly like a screenshot-logged one.
// Edit or delete a logged training session (from the unified "All training" card).
// Manual/screenshot entries are fully editable; Hevy/Strava synced entries can be deleted
// locally (they live in their source app, so we only remove our copy).
// ── SESSION PROOF (per-workout video/photo reference) ─────────────────────────
// ToTry is the record + content layer over Hevy/Strava. A user can attach proof (a clip/photo)
// to a session — but we DON'T host the file: it lives in their own camera roll / Photos. We keep a
// lightweight reference + an optional small thumbnail (data URL, compressed) so the weekly review
// can assemble a content package. Beats Hevy's one-photo-per-workout cap.
function _getSessionProof(id){ try{ return (JSON.parse(localStorage.getItem('totry_session_proof')||'{}'))[id] || []; }catch(_){ return []; } }
function _saveSessionProof(id, arr){
  // Through ls(), which reports whether the write actually landed. This used a raw setItem inside a
  // bare catch, so on a full device the photo silently went nowhere and the caller still said "Proof
  // saved" — a person building a record of their training gets a record with holes and no idea.
  let ok = false;
  try{
    const all = JSON.parse(localStorage.getItem('totry_session_proof')||'{}');
    all[id] = arr;
    ok = (typeof ls === 'function') ? ls('totry_session_proof', all) !== false
       : (localStorage.setItem('totry_session_proof', JSON.stringify(all)), true);
  }catch(_){ ok = false; }
  if(!ok && typeof showToast === 'function'){
    showToast('Not saved', 'There was no room on this device for that one. Free some space in Settings and try again.');
  }
  if(typeof syncToCloud==='function') syncToCloud();
}
function attachSessionProof(unifiedId){
  const input = document.createElement('input');
  input.type='file'; input.accept='image/*,video/*'; input.style.display='none';
  input.onchange = async (e) => {
    const file = e.target.files && e.target.files[0]; if(!file) return;
    const isVideo = (file.type||'').startsWith('video');
    const arr = _getSessionProof(unifiedId);
    // Cap proof per session — photos are stored as small thumbnails in localStorage (which syncs),
    // so an unbounded count could bloat storage and the sync payload. 6 per session is plenty.
    if(arr.length >= 6){ showToast('That\u2019s plenty','Up to 6 proofs per session keeps things light.'); return; }
    // For an image we keep a compressed thumbnail; for a video we keep just a reference (the file
    // stays in their camera roll — we never store the video itself). Name + type + when is enough
    // for the weekly content package to say "drop your clip here".
    if(isVideo){
      arr.push({ kind:'video', name:file.name||'clip', at:Date.now() });
      _saveSessionProof(unifiedId, arr);
      showToast('Proof noted','Your clip stays in your camera roll \u2014 ToTry points to it for your weekly review.');
      const wrap=document.getElementById('session-proof-wrap'); if(wrap) wrap.innerHTML=_renderProofChips(unifiedId);
    } else {
      // Compress the image to a small thumbnail data URL (reuse the app's image handling pattern).
      try{
        const dataUrl = await _compressToThumb(file, 320, 0.6);
        arr.push({ kind:'photo', thumb:dataUrl, at:Date.now() });
        _saveSessionProof(unifiedId, arr);
        showToast('Proof added','Saved to this session for your weekly review.');
        const wrap=document.getElementById('session-proof-wrap'); if(wrap) wrap.innerHTML=_renderProofChips(unifiedId);
      }catch(_){ showToast('Couldn\u2019t add','That image couldn\u2019t be processed.'); }
    }
  };
  document.body.appendChild(input); input.click(); setTimeout(()=>input.remove(), 1000);
}
function _compressToThumb(file, maxDim, quality){
  return new Promise((res, rej)=>{
    const r=new FileReader();
    r.onload=e=>{ const img=new Image(); img.onload=()=>{
      let {width:w,height:h}=img; if(w>h && w>maxDim){ h=h*maxDim/w; w=maxDim; } else if(h>maxDim){ w=w*maxDim/h; h=maxDim; }
      const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
      res(c.toDataURL('image/jpeg', quality||0.7));
    }; img.onerror=rej; img.src=e.target.result; };
    r.onerror=rej; r.readAsDataURL(file);
  });
}
function _renderProofChips(unifiedId){
  const arr=_getSessionProof(unifiedId);
  const chips = arr.map((p,i)=> p.kind==='photo'
    ? '<div style="position:relative;display:inline-block"><img loading="lazy" decoding="async" src="'+p.thumb+'" style="width:54px;height:54px;object-fit:cover;border-radius:var(--rs)"><button onclick="_removeProof(&quot;'+unifiedId+'&quot;,'+i+')" style="position:absolute;top:-6px;right:-6px;background:var(--re);border:none;color:#fff;border-radius:50%;width:18px;height:18px;font-size:var(--t-cap);cursor:pointer">&times;</button></div>'
    : '<div class="tr-proof-clip">'+svgIcon("film",15)+' '+_escFew((p.name||'clip').slice(0,16))+'<button class="tr-proof-x" onclick="_removeProof(&quot;'+unifiedId+'&quot;,'+i+')" aria-label="Remove this clip">&times;</button></div>'
  ).join('');
  // The add button was the app's second dashed border. A quiet tint button is the iOS shape.
  return '<div class="tr-proof-row">'+chips+
    '<button class="btn quiet tr-proof-add" onclick="attachSessionProof(&quot;'+unifiedId+'&quot;)">'+svgIcon("image",15)+' Add proof</button></div>';
}
function _removeProof(unifiedId, i){
  const arr=_getSessionProof(unifiedId); arr.splice(i,1); _saveSessionProof(unifiedId, arr);
  const wrap=document.getElementById('session-proof-wrap'); if(wrap) wrap.innerHTML=_renderProofChips(unifiedId);
}

function openEditTraining(unifiedId){
  // unifiedId looks like "manual_123", "hevy_123", "strava_123".
  const isStrava = unifiedId.indexOf('strava_') === 0;
  const rawId = unifiedId.replace(/^(hevy|strava|manual|screenshot)_/, '');
  if(isStrava){
    const acts = ls('totry_strava_activities') || [];
    const a = acts.find(x => String(x.id) === rawId);
    if(!a){ showToast('Not found','Could not find that activity.'); return; }
    const km = a.distance ? mToDisp(a.distance) : null;   // named km for history; it is the person's unit
    const mins = a.moving_time ? Math.round(a.moving_time/60) : null;
    const pace = (km && mins) ? (mins/km) : null;
    const _pp = _paceParts(pace);
    const paceStr = _pp ? (_pp.m + ':' + _pp.s + ' /' + _pp.unit) : null;
    const when = a.date ? new Date(a.date).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'}) : '';
    // Six hand-painted tiles — a 20px number over an 11px caps label with 0.01em of tracking — where
    // the app has .ios-stat. Same numbers, in the rounded face with tabular figures.
    const stat = (label,val) => val ? '<div class="ios-stat"><div class="ios-stat-value">'+val+'</div><div class="ios-stat-label">'+label+'</div></div>' : '';
    const stats = [
      stat('distance', km ? km.toFixed(2)+dUnit() : null),   // km holds mToDisp(...) — the person's unit
      stat('time', mins ? mins+' min' : null),
      stat('pace', paceStr),
      stat('calories', a.calories ? Math.round(a.calories) : null),
      stat('avg hr', (a.avg_hr||a.average_heartrate) ? Math.round(a.avg_hr||a.average_heartrate)+' bpm' : null),
      stat('max hr', a.max_hr ? Math.round(a.max_hr)+' bpm' : null),
    ].filter(Boolean).join('');
    const m = document.createElement('div');
    m.className = 'modal-bg open'; m.id = 'edit-training-modal';
    // The source was 11px caps in Strava's own orange above the title — a brand colour used as ink
    // on the app's own surface. It is the sheet's subtitle now, in words.
    m.innerHTML = '<div class="modal"><div class="modal-handle"></div>'+
      '<h3>'+_escFew(a.name||a.type||'Activity')+'</h3>'+
      '<div class="tr-sheet-sub">From Strava \u00b7 '+_escFew((a.type||'')+(when?' \u00b7 '+when:''))+'</div>'+
      (stats ? '<div class="ios-stats tr-sheet-stats">'+stats+'</div>' : '<div class="tr-sheet-body">No detailed metrics on this activity.</div>')+
      '<div class="tr-sheet-block"><div class="ios-header tr-flush">Proof</div>'+
      '<div id="session-proof-wrap">'+_renderProofChips(unifiedId)+'</div>'+
      '<div class="ios-footnote tr-flush">For your weekly review. Synced from Strava \u2014 edit it in Strava; you can remove it from ToTry here.</div></div>'+
      '<button class="btn danger tr-sheet-go" onclick="deleteTraining(&quot;strava&quot;,&quot;'+rawId+'&quot;)">Remove from ToTry</button>'+
      '<button class="btn tr-sheet-alt" onclick="closeModal(this)">Cancel</button></div>';
    document.body.appendChild(m);
    return;
  }
  // Hevy / manual / screenshot all live in totry_workouts.
  const workouts = ls('totry_workouts') || [];
  const w = workouts.find(x => String(x.id) === rawId || String(x.id) === unifiedId);
  if(!w){ showToast('Not found','Could not find that workout.'); return; }
  // Two separate questions, previously conflated. WHICH VIEW: a session with exercises needs the
  // strength detail view; the else-branch is a cardio form and would show the wrong fields entirely.
  // WHAT IT SAYS: only a session actually stamped source:'hevy' may claim it came from Hevy. Legacy
  // in-app sessions carry no stamp, and telling those people to "edit it in Hevy" was a claim the
  // app could not keep.
  const hasExercises = !!(w.exercises && w.exercises.length);
  const fromHevy = w.source === 'hevy';
  const isHevy = fromHevy || (!w.source && hasExercises);
  if(isHevy){
    // Show the actual session: exercises with their sets (weight × reps), plus volume/duration.
    const m = document.createElement('div');
    m.className = 'modal-bg open'; m.id = 'edit-training-modal';
    const when = w.ts ? new Date(w.ts).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'}) : (w.date||'');
    const exList = (w.exercises||[]).map(ex => {
      const setRows = (ex.sets||[]).filter(s => s).map((s,i) => {
        const wt = (s.weight!=null && s.weight!=='') ? s.weight+'kg' : '';
        const rp = (s.reps!=null && s.reps!=='') ? s.reps+' reps' : '';
        const meta = [wt,rp].filter(Boolean).join(' \u00d7 ') || '\u2014';
        return '<div class="tr-setline"><span>Set '+(i+1)+'</span><span>'+meta+'</span></div>';
      }).join('');
      return '<div class="tr-hist-ex"><div class="tr-hist-ex-name">'+_escFew(ex.name||'Exercise')+'</div>'+(setRows||'<div class="tr-setline"><span>No sets recorded</span></div>')+'</div>';
    }).join('');
    const meta = [];
    if(w.volume) meta.push(Math.round(w.volume).toLocaleString()+'kg volume');
    if(w.completedSets||w.totalSets){ const _n = (w.completedSets||w.totalSets); meta.push(_n + (_n === 1 ? ' set' : ' sets')); }
    if(w.durationMin || w.durationMinutes) meta.push((w.durationMin || w.durationMinutes)+' min');
    // Three stacked lines at three sizes and three colours opened this sheet — an 11px caps source,
    // a 17px name, a 15px tertiary date and a 13px tint metrics line. One title, one subtitle.
    m.innerHTML = '<div class="modal" style="max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
      '<h3>'+_escFew(w.splitFocus||w.type||'Workout')+'</h3>'+
      '<div class="tr-sheet-sub">'+(fromHevy?'From Hevy':'Logged here')+(when?' \u00b7 '+_escFew(when):'')+(meta.length?' \u00b7 '+meta.join(' \u00b7 '):'')+'</div>'+
      '<div class="tr-sheet-scroll">'+(exList || '<div class="tr-hist-ex"><div class="tr-setline"><span>No exercise detail came through on this session.</span></div></div>')+'</div>'+
      '<div class="tr-sheet-block"><div class="ios-header tr-flush">Proof</div>'+
      '<div id="session-proof-wrap">'+_renderProofChips(unifiedId)+'</div>'+
      (fromHevy ? '<div class="ios-footnote tr-flush">For your weekly review. Synced from Hevy \u2014 edit the exercises in Hevy; you can remove it from ToTry here.</div>' : '<div class="ios-footnote tr-flush">For your weekly review. You logged this one here; set-by-set editing is not in yet \u2014 for now you can remove it and log it again.</div>')+'</div>'+
      '<button class="btn danger tr-sheet-go" onclick="deleteTraining(&quot;workout&quot;,&quot;'+w.id+'&quot;)">Remove from ToTry</button>'+
      '<button class="btn tr-sheet-alt" onclick="closeModal(this)">Cancel</button></div>';
    document.body.appendChild(m);
    return;
  }
  // Manual / screenshot cardio — fully editable, reuse the cardio form pre-filled.
  const types = Object.keys(CARDIO_TYPES);
  const curType = types.includes(w.type) ? w.type : 'Other';
  const m = document.createElement('div');
  m.className = 'modal-bg open'; m.id = 'edit-training-modal';
  const tsDate = w.ts ? new Date(w.ts) : new Date();
  const dateStr = tsDate.getFullYear()+'-'+String(tsDate.getMonth()+1).padStart(2,'0')+'-'+String(tsDate.getDate()).padStart(2,'0');
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>'+
    '<h3>Edit workout</h3>'+
    '<div class="ios-header tr-flush">Activity</div>'+
    '<select id="edit-cardio-type" class="tr-field" onchange="renderEditCardioFields()">'+
      types.map(t=>'<option value="'+t+'"'+(t===curType?' selected':'')+'>'+t+'</option>').join('')+
    '</select>'+
    '<div id="edit-cardio-fields"></div>'+
    '<div class="ios-header tr-flush">When</div>'+
    '<input type="date" id="edit-cardio-date" class="tr-field" value="'+dateStr+'">'+
    '<button class="btn primary tr-sheet-go" onclick="saveEditTraining(&quot;'+w.id+'&quot;)">Save changes</button>'+
    '<button class="btn danger tr-sheet-alt" onclick="deleteTraining(&quot;workout&quot;,&quot;'+w.id+'&quot;)">Delete workout</button>'+
    '<button class="btn tr-sheet-alt" onclick="closeModal(this)">Cancel</button></div>';
  document.body.appendChild(m);
  // Pre-fill fields after the select renders them.
  renderEditCardioFields();
  const setv = (id,val)=>{ const e=document.getElementById(id); if(e && val!=null) e.value = val; };
  if(w.durationMinutes) setv('edit-cardio-time', w.durationMinutes+':00');
  if(w.distance) setv('edit-cardio-distance', mToDisp(w.distance).toFixed(2));
  if(w.totalCalories || w.calories) setv('edit-cardio-totalCal', w.totalCalories || w.calories);
  if(w.activeCalories) setv('edit-cardio-activeCal', w.activeCalories);
  if(w.averageHeartRate) setv('edit-cardio-hr', w.averageHeartRate);
  if(w.effort) setv('edit-cardio-effort', w.effort);
  if(typeof updateEditCardioPace==='function') updateEditCardioPace();
}
const _EDIT_CARDIO_INPUTS = ['edit-cardio-time','edit-cardio-distance','edit-cardio-activeCal',
                            'edit-cardio-totalCal','edit-cardio-hr','edit-cardio-effort'];
function renderEditCardioFields(){
  // KEEP WHAT IS ALREADY ON SCREEN. This re-renders from scratch on every type change and emits fresh,
  // EMPTY inputs — so correcting "Indoor Run" to "Elliptical" blanked the time, calories and heart
  // rate the person had just been looking at, and saveEditTraining then wrote null over all three
  // while announcing "Saved · Workout updated." A 30-minute session became a session with no duration,
  // and getUnifiedWeekStats().totalMinutes fell with it, so the week under-credited them for training
  // they actually did. The note below records an EARLIER version of this same harm from a different
  // cause — the values are only populated once, by the open path, and nothing has ever restored them.
  const _keep = {};
  _EDIT_CARDIO_INPUTS.forEach(function(id){
    const e = document.getElementById(id);
    if(e && e.value !== '') _keep[id] = e.value;
  });
  const type = document.getElementById('edit-cardio-type')?.value || 'Other';
  const cfg = CARDIO_TYPES[type] || CARDIO_TYPES['Other'] || {fields:['time','distance','activeCal','hr']};
  const wrap = document.getElementById('edit-cardio-fields');
  if(!wrap) return;
  const labels = {
    time:      ['Workout time',    'e.g. 20:00 or 20 min',  'edit-cardio-time'],
    distance:  ['Distance ('+dUnit()+')', dUnit()==='km'?'e.g. 3.43':'e.g. 2.13', 'edit-cardio-distance'],
    activeCal: ['Active calories', 'e.g. 260',              'edit-cardio-activeCal'],
    totalCal:  ['Total calories',  'e.g. 394',              'edit-cardio-totalCal'],
    hr:        ['Avg heart rate',  'e.g. 128 bpm',          'edit-cardio-hr'],
    // 'effort' was missing here while HIIT, Conditioning, Sport, HYROX and 'Other' — the fallback for
    // every unknown type — all list it. labels['effort'] was undefined, destructuring it threw
    // "undefined is not iterable" MID-LOOP, so wrap.innerHTML was never assigned and the sheet opened
    // with no fields at all. Saving then read inputs that did not exist and wrote null over the
    // session's duration, calories and heart rate — and said "Saved · Workout updated."
    // The logging form has had this label all along (cardio-effort); only the edit form lacked it.
    effort:    ['Effort (RPE 1\u201310)', 'e.g. 7',           'edit-cardio-effort'],
  };
  let html = '';
  ((cfg&&Array.isArray(cfg.fields))?cfg.fields:[]).forEach(f=>{
    // A field nobody has labelled yet must cost that one field, never the whole form.
    if(!labels[f]) return;
    const [lab,ph,id] = labels[f];
    html += '<div style="font-size:var(--t-cap);color:var(--tx3);margin-bottom:6px;font-family:var(--font-text);text-transform:uppercase;letter-spacing:0.01em">'+lab+'</div>'+
      '<input type="text" id="'+id+'" inputmode="'+(f==='time'?'text':'decimal')+'" placeholder="'+ph+'" oninput="updateEditCardioPace()" style="margin-bottom:12px">';
  });
  if(cfg.pace){ html += '<div id="edit-cardio-pace" style="font-family:var(--font-text);font-size:var(--t-cap);color:var(--go);margin:-4px 0 12px 0;min-height:14px"></div>'; }
  wrap.innerHTML = html;
  // Restore only into fields the NEW type still has. One the new type does not carry is deliberately
  // not restored — saveEditTraining clears exactly those, which is how a distance stops following an
  // elliptical around.
  Object.keys(_keep).forEach(function(id){
    const e = document.getElementById(id);
    if(e) e.value = _keep[id];
  });
  if(typeof updateEditCardioPace === 'function') try{ updateEditCardioPace(); }catch(_){ }
}
// Minutes-per-unit -> the parts of "M:SS", carrying when the seconds round up to sixty, and the
// person's own distance unit. Math.round on the remainder returns 60 for any fraction above 0.9917:
// 45 minutes over 5.00 miles is 8.9996 min/mi, which printed "8:60". Both pace lines had that bug and
// only one of them had the unit right — the Strava detail hardcoded "/km" and showed it to a miles
// user beside a distance already rendered in miles. One helper, so they cannot drift again.
function _paceParts(perUnit){
  if(!(perUnit > 0) || !isFinite(perUnit)) return null;
  let m = Math.floor(perUnit), sec = Math.round((perUnit - m) * 60);
  if(sec === 60){ m += 1; sec = 0; }
  return { m: m, s: String(sec).padStart(2,'0'), unit: (typeof dUnit === 'function') ? dUnit() : 'km' };
}
function updateEditCardioPace(){
  const paceEl = document.getElementById('edit-cardio-pace');
  if(!paceEl) return;
  const mins = _parseCardioTime(document.getElementById('edit-cardio-time')?.value||'');
  const km = parseFloat(document.getElementById('edit-cardio-distance')?.value||'')||0;   // in dUnit(), converted at the store below
  if(mins>0 && km>0){
    const pp = _paceParts(mins/km);
    paceEl.textContent = pp ? ('Pace: '+pp.m+"'"+pp.s+'"/'+pp.unit) : '';
  } else { paceEl.textContent=''; }
}
function saveEditTraining(id){
  const workouts = ls('totry_workouts') || [];
  const idx = workouts.findIndex(x => String(x.id) === id);
  if(idx < 0){ showToast('Not found','Could not save.'); return; }
  const type = document.getElementById('edit-cardio-type')?.value || 'Other';
  const mins = _parseCardioTime(document.getElementById('edit-cardio-time')?.value||'');
  const km = parseFloat(document.getElementById('edit-cardio-distance')?.value||'')||0;   // in dUnit(), converted at the store below
  const activeCal = parseInt(document.getElementById('edit-cardio-activeCal')?.value||'')||0;
  const totalCal = parseInt(document.getElementById('edit-cardio-totalCal')?.value||'')||0;
  const cal = totalCal || activeCal || 0;
  const hr = parseInt(document.getElementById('edit-cardio-hr')?.value||'')||0;
  const effort = parseInt(document.getElementById('edit-cardio-effort')?.value||'')||0;
  const dateVal = document.getElementById('edit-cardio-date')?.value;
  let when = workouts[idx].ts ? new Date(workouts[idx].ts) : new Date();
  if(dateVal){ const [y,mo,d]=dateVal.split('-').map(Number); when = new Date(y, mo-1, d, 12, 0, 0); }
  // ONLY WRITE WHAT THE FORM ACTUALLY SHOWED. This used to null every field unconditionally, so any
  // input the sheet failed to render — one missing label was enough to render none of them — silently
  // erased a real figure and then reported success. A blank box the person SAW means "clear it"; a box
  // that was never on screen means nothing at all, and must leave the stored value alone.
  const shown = id => !!document.getElementById(id);
  const patch = { type, splitFocus: type, date: dayKeyOf(when), ts: when.toISOString() };
  if(shown('edit-cardio-time'))     patch.durationMinutes = mins ? Math.round(mins) : null;
  // dispToM, not *1000: the box holds the person's own unit, so editing a 2-mile run while set
  // to miles used to store 2000m — 1.24 miles — quietly shortening a run they had already logged.
  // AND CLEAR WHAT THE NEW TYPE DOES NOT HAVE. "Only write what the form showed" was right for the
  // unit bug it fixed, but it also stopped clearing a field the person just removed by changing the
  // activity: log an Indoor Run of 5.00km, correct it to Elliptical, and the distance box is gone from
  // the sheet while distance:5000 stays on the row. The chip then reads "5.0km" on an elliptical
  // session, _isCardioType still counts it, so the week's total — and the weekly review handed to the
  // coach — carries 5km nobody covered. The input never renders again for that type, so the person
  // cannot clear it without deleting the workout. The TYPE's own field list is the authority, not the
  // DOM: a field absent because the sheet is not rendered must never wipe anything.
  const _cfg = CARDIO_TYPES[type] || CARDIO_TYPES['Other'] || { fields: [] };
  const _typeHas = f => (_cfg.fields || []).indexOf(f) > -1;
  if(shown('edit-cardio-distance')) patch.distance = km ? dispToM(km) : null;
  else if(!_typeHas('distance'))    patch.distance = null;
  if(shown('edit-cardio-activeCal') || shown('edit-cardio-totalCal')) patch.calories = cal || null;
  if(shown('edit-cardio-hr'))       patch.averageHeartRate = hr || null;
  if(shown('edit-cardio-effort'))   patch.effort = effort || null;
  else if(!_typeHas('effort'))      patch.effort = null;
  workouts[idx] = { ...workouts[idx], ...patch };
  ls('totry_workouts', workouts);
  // Rebuild the burn ledger from the (now edited) workouts — single source of truth, no drift.
  recomputeWorkoutBurns();
  if(typeof syncToCloud==='function') syncToCloud();
  if(typeof autoTickHabits==='function') autoTickHabits();
  if(typeof renderHomeHabits==='function') renderHomeHabits();
  if(typeof renderUnifiedTraining==='function') renderUnifiedTraining();
  document.getElementById('edit-training-modal')?.remove();
  haptic('success'); showToast('Saved','Workout updated.');
}
async function deleteTraining(kind, id){
  if(!(await askConfirm('Delete this workout? This cannot be undone.'))) return;
  if(kind === 'strava'){
    const _before = ls('totry_strava_activities')||[];
    const acts = _before.filter(x => String(x.id) !== id);
    tombstoneRemoved('totry_strava_activities', _before, acts);   // or the next pull unions it back
    ls('totry_strava_activities', acts);
  } else {
    const workouts = ls('totry_workouts') || [];
    const _kept = workouts.filter(x => String(x.id) !== id);
    tombstoneRemoved('totry_workouts', workouts, _kept);
    ls('totry_workouts', _kept);
    // Rebuild the burn ledger from the remaining workouts — single source of truth.
    recomputeWorkoutBurns();
  }
  if(typeof syncToCloud==='function') syncToCloud();
  if(typeof autoTickHabits==='function') autoTickHabits();
  if(typeof renderHomeHabits==='function') renderHomeHabits();
  if(typeof renderUnifiedTraining==='function') renderUnifiedTraining();
  document.getElementById('edit-training-modal')?.remove();
  haptic('success'); showToast('Deleted','Workout removed.');
}
// Apple-Fitness-style manual cardio entry. You pick the activity, then enter exactly the fields
// Apple shows for THAT activity (distance + pace for walks/runs, no distance for cycling, etc).
// Catalogue of activity types and which fields they show, mirroring the Apple Fitness summary.
const CARDIO_TYPES = {
  'Indoor Walk':    { emoji:'\ud83d\udeb6', fields:['time','distance','activeCal','totalCal','hr'], pace:true },
  'Outdoor Walk':   { emoji:'\ud83d\udeb6', fields:['time','distance','activeCal','totalCal','hr'], pace:true },
  'Indoor Run':     { emoji:'\ud83c\udfc3', fields:['time','distance','activeCal','totalCal','hr'], pace:true },
  'Outdoor Run':    { emoji:'\ud83c\udfc3', fields:['time','distance','activeCal','totalCal','hr'], pace:true },
  'Hike':           { emoji:'\ud83e\udd7e', fields:['time','distance','activeCal','totalCal','hr'], pace:true },
  'Indoor Cycle':   { emoji:'\ud83d\udeb4', fields:['time','distance','activeCal','totalCal','hr'], pace:false },
  'Outdoor Cycle':  { emoji:'\ud83d\udeb4', fields:['time','distance','activeCal','totalCal','hr'], pace:true },
  'Elliptical':     { emoji:'\ud83c\udfcb\ufe0f', fields:['time','activeCal','totalCal','hr'], pace:false },
  'Rower':          { emoji:'\ud83d\udea3', fields:['time','distance','activeCal','totalCal','hr'], pace:false },
  'Stair Stepper':  { emoji:'\ud83e\ude9c', fields:['time','activeCal','totalCal','hr'], pace:false },
  'Swim':           { emoji:'\ud83c\udfca', fields:['time','distance','activeCal','totalCal','hr'], pace:false },
  'HIIT':           { emoji:'\u26a1', fields:['time','activeCal','totalCal','hr','effort'], pace:false },
  'Conditioning':   { emoji:'\ud83d\udd25', fields:['time','activeCal','totalCal','hr','effort'], pace:false },
  'HYROX / Functional': { emoji:'\ud83c\udfc5', fields:['time','distance','activeCal','totalCal','hr','effort'], pace:false },
  'Sport':          { emoji:'\u26bd', fields:['time','activeCal','totalCal','hr','effort'], pace:false },
  'Strength':       { emoji:'\ud83c\udfcb\ufe0f', fields:['time','activeCal','totalCal','hr'], pace:false },
  'Other':          { emoji:'\ud83d\udcaa', fields:['time','distance','activeCal','totalCal','hr','effort'], pace:false },
};
function logCardioManually(){
  const types = Object.keys(CARDIO_TYPES);
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.id = 'cardio-log-modal';
  // The sheet's own title was a 17px div, so this sheet was the one place in the app where a sheet
  // did not speak in the app's face. <h3> is the sheet-title role. Every field label was 13px caps
  // in TERTIARY grey with 0.01em of tracking — caps with no tracking is the shape that reads as
  // typed rather than set — and they are .ios-header now, at the section-header tracking.
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>'+
    '<h3>Log a workout</h3>'+
    '<div class="tr-sheet-sub">Pick the activity, then enter what you see on your Apple Fitness summary.</div>'+
    '<div class="ios-header tr-flush">Activity</div>'+
    '<select id="cardio-type" class="tr-field" onchange="renderCardioFields()">'+
      types.map(t=>'<option value="'+t+'">'+t+'</option>').join('')+
    '</select>'+
    '<div id="cardio-fields"></div>'+
    '<div class="ios-header tr-flush">When</div>'+
    '<input type="date" id="cardio-date" class="tr-field">'+
    '<div class="tr-session-actions"><button class="btn primary" onclick="saveCardioManually()">Save workout</button>'+
    '<button class="btn" onclick="closeModal(this)">Cancel</button></div></div>';
  document.body.appendChild(m);
  // Default the date to today.
  const di = document.getElementById('cardio-date');
  if(di){ const t=new Date(); di.value = t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'); }
  renderCardioFields();
}
function renderCardioFields(){
  const type = document.getElementById('cardio-type')?.value || 'Other';
  const cfg = CARDIO_TYPES[type] || CARDIO_TYPES['Other'];
  const wrap = document.getElementById('cardio-fields');
  if(!wrap) return;
  const unit = (ls('totry_distance_unit')) || 'km';
  const labels = {
    time:      ['Workout time',    'e.g. 20:00 or 20 min',  'cardio-time'],
    distance:  ['Distance ('+unit+')', unit==='km'?'e.g. 3.43':'e.g. 2.13', 'cardio-distance'],
    activeCal: ['Active calories', 'e.g. 260',              'cardio-activeCal'],
    totalCal:  ['Total calories',  'e.g. 394',              'cardio-totalCal'],
    hr:        ['Avg heart rate',  'e.g. 128 bpm',          'cardio-hr'],
    effort:    ['Effort (RPE 1\u201310)', 'e.g. 7',              'cardio-effort'],
  };
  let html = '';
  ((cfg&&Array.isArray(cfg.fields))?cfg.fields:[]).forEach(f=>{
    const [lab,ph,id] = labels[f];
    // Distance row gets a km/miles toggle on the right.
    if(f==='distance'){
      // km / mi was two tappable <span>s at 12px with a slash between them — the "Manage · edit ·
      // remove" strip this design brief names by hand, on a 12px target. It is a segmented control,
      // which is what a two-way exclusive choice is on iOS, and it clears the 44pt floor.
      html += '<div class="tr-label-row"><span class="ios-header tr-flush">'+lab.replace(/\s*\([^)]*\)$/,'')+'</span>'+
        '<span class="seg tr-unit-seg">'+
          '<button type="button" class="fst'+(unit==='km'?' active':'')+'" onclick="setCardioUnit(&quot;km&quot;)">km</button>'+
          '<button type="button" class="fst'+(unit==='mi'?' active':'')+'" onclick="setCardioUnit(&quot;mi&quot;)">mi</button>'+
        '</span></div>'+
        '<input type="text" id="'+id+'" class="tr-field" inputmode="decimal" placeholder="'+ph+'" oninput="updateCardioPace()">';
    } else if(f==='effort'){
      // Effort as an RPE 1–10 dropdown — feeds training-load + interference awareness (WS4/WS6).
      html += '<div class="ios-header tr-flush">'+lab+'</div>'+
        '<select id="'+id+'" class="tr-field"><option value="">\u2014</option>'+
        [1,2,3,4,5,6,7,8,9,10].map(n=>'<option value="'+n+'">'+n+(n<=3?' (easy)':n<=6?' (moderate)':n<=8?' (hard)':' (max)')+'</option>').join('')+
        '</select>';
    } else {
      html += '<div class="ios-header tr-flush">'+lab+'</div>'+
        '<input type="text" id="'+id+'" class="tr-field" inputmode="'+(f==='time'?'text':'decimal')+'" placeholder="'+ph+'" oninput="updateCardioPace()">';
    }
  });
  // Live pace readout for distance-based activities (e.g. Indoor Walk → min/km or min/mi).
  if(cfg.pace){
    html += '<div id="cardio-pace" class="tr-pace"></div>';
  }
  wrap.innerHTML = html;
  updateCardioPace();
}
// Parse "20:00", "1:00:00", or "20 min" → minutes (number).
function _parseCardioTime(raw){
  if(!raw) return 0;
  const t = raw.trim().toLowerCase().replace(/\s*min.*$/,'').trim();
  if(t.includes(':')){
    const parts = t.split(':').map(x=>parseInt(x)||0);
    if(parts.length===3) return parts[0]*60 + parts[1] + parts[2]/60;
    if(parts.length===2) return parts[0] + parts[1]/60;
  }
  return parseFloat(t)||0;
}
function setCardioUnit(u){ ls('totry_distance_unit', u); if(typeof renderCardioFields==='function') renderCardioFields(); }
function updateCardioPace(){
  const paceEl = document.getElementById('cardio-pace');
  if(!paceEl) return;
  const mins = _parseCardioTime(document.getElementById('cardio-time')?.value||'');
  const dist = parseFloat(document.getElementById('cardio-distance')?.value||'')||0;
  if(mins>0 && dist>0){
    // Rounding the seconds independently of the minutes printed "Pace: 5'60\"/km" for a 5K in 29:59 —
    // the same run the edit sheet, which already uses _paceParts, calls 6'00\". The v570 commit said
    // "one formatter now" and this, the LOGGING path, was never changed. It is now.
    const p = _paceParts(mins/dist);
    paceEl.textContent = p ? ('Pace: '+p.m+"'"+p.s+'"/'+p.unit) : '';
  } else { paceEl.textContent = ''; }
}
// ── DISTANCE UNITS ───────────────────────────────────────────────────────────────────────────
// Storage is ALWAYS metres. saveCardioManually already interprets correctly on the way in — it
// multiplies by 1609.34 for miles — so a logged distance has never been WRONG. What it has been is
// ignored: every display divided by 1000 and wrote "km", so a person who set miles, typed 2, and was
// even shown a per-mile pace on the same form then saw "3.2km" in their history, their evening
// summary, and the context handed to the coach. The edit dialog went further and hardcoded its own
// label to "Distance (km)" while the log dialog beside it honoured the setting.
// Same shape as the weight units, one step less dangerous: no maths was wrong, only the reading.
const _M_PER_MI = 1609.34;
function dUnit(){ return (ls('totry_distance_unit') === 'mi') ? 'mi' : 'km'; }
function mToDisp(metres){
  const n = parseFloat(metres);
  if(!isFinite(n)) return n;
  return n / (dUnit() === 'mi' ? _M_PER_MI : 1000);
}
function dispToM(v){
  const n = parseFloat(v);
  if(!isFinite(n)) return n;
  return Math.round(n * (dUnit() === 'mi' ? _M_PER_MI : 1000));
}
// metres in, the string a person should read out
function dFmt(metres, opts){
  opts = opts || {};
  const n = parseFloat(metres);
  if(!isFinite(n)) return opts.blank != null ? opts.blank : '';
  const d = mToDisp(n);
  const dp = (opts.dp != null) ? opts.dp : 1;
  return d.toFixed(dp) + (opts.bare ? '' : dUnit());
}
function saveCardioManually(){
  const type = document.getElementById('cardio-type')?.value || 'Other';
  const cfg = CARDIO_TYPES[type] || CARDIO_TYPES['Other'];
  const mins = _parseCardioTime(document.getElementById('cardio-time')?.value||'');
  const unit = (ls('totry_distance_unit')) || 'km';
  const distInput = parseFloat(document.getElementById('cardio-distance')?.value||'')||0;
  const metres = distInput ? Math.round(distInput * (unit==='mi' ? 1609.34 : 1000)) : null;
  const activeCal = parseInt(document.getElementById('cardio-activeCal')?.value||'')||0;
  const totalCal = parseInt(document.getElementById('cardio-totalCal')?.value||'')||0;
  // The calorie loop uses TOTAL (what your watch counts as burned); fall back to active if only that's given.
  const cal = totalCal || activeCal || 0;
  const hr = parseInt(document.getElementById('cardio-hr')?.value||'')||0;
  const effort = parseInt(document.getElementById('cardio-effort')?.value||'')||null;
  const dateVal = document.getElementById('cardio-date')?.value;
  if(!mins && !cal){ showToast('Add a little more','Enter at least the time or the calories.'); return; }
  // Build a Date from the chosen day (noon, to avoid timezone edge cases).
  let when = new Date();
  if(dateVal){ const [y,mo,d]=dateVal.split('-').map(Number); when = new Date(y, mo-1, d, 12, 0, 0); }
  const workouts = ls('totry_workouts') || [];
  workouts.unshift({
    id: 'manual_' + Date.now(),
    source: 'manual',
    type: type,
    splitFocus: type,
    durationMinutes: mins ? Math.round(mins) : null,
    distance: metres,   // stored in metres, like Strava
    calories: cal || null,           // total (or active fallback) — feeds the loop
    activeCalories: activeCal || null,
    totalCalories: totalCal || null,
    averageHeartRate: hr || null,
    effort: effort || null,
    exercises: [],
    volume: 0,
    completedSets: 0,
    date: dayKeyOf(when),
    ts: when.toISOString()
  });
  ls('totry_workouts', _capWorkouts(workouts));
  // Rebuild the burn ledger from totry_workouts — single source of truth, counted exactly once.
  recomputeWorkoutBurns();
  if(typeof syncToCloud === 'function') syncToCloud();
  if(typeof autoTickHabits === 'function') autoTickHabits();
  if(typeof renderHomeHabits === 'function') renderHomeHabits();
  if(typeof renderUnifiedTraining === 'function') renderUnifiedTraining();
  document.getElementById('cardio-log-modal')?.remove();
  haptic('success');
  const bits = [type];
  if(mins) bits.push(Math.round(mins)+' min');
  // `km` was never declared in this function — logging any manual cardio threw ReferenceError right
  // after the workout had been saved, so the confirmation never appeared and the person had no idea
  // whether it had worked. The distance they typed is `distInput`, and `unit` is their own km/mi
  // choice, which this line also ignored.
  if(distInput) bits.push(distInput+' '+unit);
  // NOT TO SOMEONE WHO TURNED THE NUMBERS OFF. The workout summary sheet was gated and this toast, the
  // other Train logging door, was not — same promise, same person, one screen apart.
  if(cal && !((typeof nutGentle==='function') && nutGentle())) bits.push(cal+' cal');
  showToast('Workout logged', bits.join(' \u00b7 ') + ' \u2014 counts as your gym session.');
}
async function handleWorkoutScreenshot(event){
  if(typeof aiOffNotice==='function' && aiOffNotice('Reading a workout screenshot')) return;
  const file = event.target.files?.[0];
  event.target.value = '';
  if(!file) return;
  if(!file.type.startsWith('image/')){
    showToast('Wrong file', 'Please upload an image of your workout summary.');
    return;
  }
  const resultDiv = document.getElementById('workout-screenshot-result');
  if(resultDiv){
    resultDiv.innerHTML = '<div style="padding:12px;background:var(--bg3);border-radius:var(--rm);font-size:var(--t-sm);color:var(--tx2);text-align:center"><span class="pulsing">Reading your workout...</span></div>';
  }
  // Downscale on-device first — full-size phone photos blow the request size and time out.
  let dataUrl;
  try{ dataUrl = await downscaleImage(file, 1280, 0.85); }
  catch(_e){ if(resultDiv) resultDiv.innerHTML = '<div style="padding:12px;background:var(--re-bg);border-radius:var(--rm);font-size:var(--t-base);color:var(--re)">Could not read that image. Try a screenshot rather than a photo.</div>'; return; }
  {
    const base64 = dataUrl.split(',')[1];
    const mime = 'image/jpeg';
    
    try{
      const prompt = 'This is a screenshot of a fitness/workout summary (could be from Apple Fitness, Apple Watch, Strava, Garmin, Fitbit, Whoop, etc). Extract the following details if visible. Return ONLY valid JSON, no markdown, no preamble:\n\n{\n  "workoutType": "the exercise type (e.g. Indoor Cycle, Traditional Strength Training, Stepper, Run, Walk, etc)",\n  "durationMinutes": number (total workout time in minutes),\n  "calories": number (total or active calories - prefer total if both shown),\n  "averageHeartRate": number or null,\n  "date": "the date if visible (YYYY-MM-DD), or null",\n  "confidence": "high | medium | low — how confident you are these are correct"\n}\n\nIf you cannot identify a workout summary in the image, return {"error": "no workout found"}.';
      
      // 30s timeout so a stalled vision call can't leave the UI stuck on "Reading..."
      const {data, error} = await Promise.race([
        aiInvoke({
          action: 'vision',
          prompt: prompt,
          image_base64: base64,
          image_mime: mime,
          max_tokens: 600
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out after 30s')), 30000))
      ]).catch(e => ({ error: e }));
      
      if(error || !data?.text){
        const reason = error?.message ? ' (' + error.message + ')' : '';
        resultDiv.innerHTML = '<div style="padding:12px;background:var(--re-bg);border-radius:var(--rm);font-size:var(--t-base);color:var(--re)">Couldn\'t read the screenshot' + reason + '. Try a clearer image, or check Settings → Test AI connection.</div>';
        return;
      }
      
      const text = data.text;
      const m = text.match(/\{[\s\S]*\}/);
      if(!m){
        resultDiv.innerHTML = '<div style="padding:12px;background:var(--re-bg);border-radius:var(--rm);font-size:var(--t-base);color:var(--re)">AI response unreadable. Please try again.</div>';
        return;
      }
      
      const parsed = JSON.parse(m[0]);
      if(parsed.error){
        resultDiv.innerHTML = '<div style="padding:12px;background:var(--bg3);border-radius:var(--rm);font-size:var(--t-sm);color:var(--tx2)">No workout summary detected in this image. Make sure your screenshot shows the full workout details.</div>';
        return;
      }
      
      // Show preview with confirm/edit options
      const type = parsed.workoutType || 'Workout';
      const mins = parsed.durationMinutes || 0;
      const cal = parsed.calories || 0;
      const hr = parsed.averageHeartRate;
      const confidence = parsed.confidence || 'medium';
      
      resultDiv.innerHTML = 
        '<div style="padding:14px;background:var(--bg3);border-radius:var(--rm)">' +
          '<div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--go);text-transform:uppercase;letter-spacing:0.01em;margin-bottom:6px">Detected · ' + confidence + ' confidence</div>' +
          '<div style="font-size:var(--t-base);color:var(--tx);margin-bottom:8px">' + type + '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">' +
            '<div><div style="font-size:var(--t-mini);color:var(--tx3)">Duration</div><div style="font-family:var(--font-text);color:var(--tx)">' + mins + ' min</div></div>' +
            '<div><div style="font-size:var(--t-mini);color:var(--tx3)">Calories</div><div style="font-family:var(--font-text);color:var(--re)">' + cal + '</div></div>' +
            (hr ? '<div><div style="font-size:var(--t-mini);color:var(--tx3)">Avg HR</div><div style="font-family:var(--font-text);color:var(--tx)">' + hr + ' bpm</div></div>' : '<div></div>') +
          '</div>' +
          '<button class="btn primary" onclick="confirmScreenshotWorkout(' + JSON.stringify(parsed).replace(/"/g, '&quot;') + ')" style="margin-bottom:6px">Log this workout</button>' +
          '<button class="btn quiet" onclick="document.getElementById(\'workout-screenshot-result\').innerHTML=\'\';document.getElementById(\'workout-screenshot-input\').value=\'\'">Cancel</button>' +
        '</div>';
    }catch(err){
      console.error('Screenshot processing failed:', err);
      resultDiv.innerHTML = '<div style="padding:12px;background:var(--re-bg);border-radius:var(--rm);font-size:var(--t-base);color:var(--re)">Failed to process: ' + (err.message || err) + '</div>';
    }
  }
}

// Save the detected workout into history + apply calorie burn to today
function confirmScreenshotWorkout(detected){
  const type = detected.workoutType || 'Workout';
  const mins = detected.durationMinutes || 0;
  const cal = detected.calories || 0;
  const hr = detected.averageHeartRate || null;
  const dateStr = detected.date || _todayLocalISO();
  
  // Save as a logged workout
  const session = {
    id: Date.now(),
    date: new Date(dateStr).toLocaleDateString('en-AU', {weekday:'short', day:'numeric', month:'short', year:'numeric'}),
    ts: new Date(dateStr).toISOString(),
    day: getDayCount(),
    source: 'screenshot',
    type: type,
    durationMinutes: mins,
    calories: cal,
    averageHeartRate: hr,
    exercises: [], // no per-exercise breakdown
    completedSets: 0,
    totalSets: 0,
    volume: 0,
    splitFocus: type
  };
  const history = ls('totry_workouts') || [];
  history.unshift(session);
  ls('totry_workouts', _capWorkouts(history));
  
  // Rebuild the burn ledger from totry_workouts — single source of truth (stays correct even when
  // you upload yesterday's session, since it's keyed by each workout's own date).
  recomputeWorkoutBurns();
  if(typeof syncToCloud === 'function') syncToCloud();
  
  // Re-run the smart auto-tick so the gym habit lands on the workout's actual day (it reads
  // totry_workouts + dates), then refresh the home grid.
  if(typeof autoTickHabits === 'function') autoTickHabits();
  if(typeof renderHomeHabits === 'function') renderHomeHabits();
  
  // Clear UI
  document.getElementById('workout-screenshot-result').innerHTML = '';
  document.getElementById('workout-screenshot-input').value = '';
  
  showToast('Workout logged', type + ' · ' + mins + ' min · ' + cal + ' cal added to today.');
  haptic('celebrate');
  if(typeof renderNutritionLog === 'function') renderNutritionLog();
}
// updatePersonalRecords() lived here and is deliberately gone. It was the SECOND of two PR
// recorders running on the same save, writing the same store in a different shape. Its one
// distinct behaviour — refusing a set that was not ticked — now lives in detectAndRecordPRs,
// which is the single recorder for our own saves and both Hevy paths.
// '3m' | '90s' | '2:30' | 180 | '180' -> seconds. Routines write targetRest, Hevy imports write
// rest, and the manual editor writes restTime; all three end up here so the timer honours whichever
// the exercise actually carries.
function _restSeconds(ex){
  if(!ex) return 0;
  const raw = ex.targetRest != null ? ex.targetRest : (ex.rest != null ? ex.rest : ex.restTime);
  if(raw == null || raw === '') return 0;
  if(typeof raw === 'number' && isFinite(raw)) return Math.max(0, Math.round(raw));
  const t = String(raw).trim().toLowerCase();
  let m = t.match(/^(\d+):(\d{1,2})$/);                       // 2:30
  if(m) return (+m[1]) * 60 + (+m[2]);
  m = t.match(/^(\d+(?:\.\d+)?)\s*m(in)?$/);                  // 3m / 1.5min
  if(m) return Math.round(parseFloat(m[1]) * 60);
  m = t.match(/^(\d+)\s*s(ec)?$/);                            // 90s
  if(m) return +m[1];
  m = t.match(/^(\d+)$/);                                     // bare number = seconds
  if(m) return +m[1];
  return 0;
}
// The rest clock is an END TIME, not a count of ticks. Counting `restTimeLeft--` once per interval
// assumed the interval keeps firing — and it does not: pocket the phone during a 3-minute rest, which
// is the normal thing to do between sets, and the browser throttles the timer to a crawl or stops it
// entirely. The countdown froze and resumed when you looked, so the number on screen was not how long
// you had actually rested, and the buzz that was meant to bring you back came late or never.
let restEndAt = 0;
function _restRemaining(){ return Math.max(0, Math.ceil((restEndAt - Date.now()) / 1000)); }
function _restSync(){
  if(!restTimerInt) return;
  const display = document.getElementById('rest-timer-display');
  restTimeLeft = _restRemaining();
  if(display){ display.textContent = restTimeLeft; display.style.color = (restTimeLeft<=10) ? 'var(--re)' : 'var(--tx)'; }
  if(restTimeLeft<=0) _restFinish();
}
function _restFinish(){
  stopRestTimer();
  /* Through haptic(), not navigator.vibrate. This was the ONLY direct call left outside haptic()
     itself, and WebKit has never implemented the Vibration API — so the end-of-set buzz, the one
     moment in a workout you are not looking at the screen, did nothing at all on iPhone. v422 routed
     haptic() through the Taptic Engine; this line never got the memo. */
  if(typeof haptic==='function') haptic('success');
  showToast('Rest done','Next set.');
}
// WHICH EXERCISE THIS REST BELONGS TO, so an adjustment can be remembered against it. The map
// `totry_rest_times` has been READ at the set-completion path for however long and written by
// NOTHING — one reference in the whole bundle — so it was always {} and every exercise fell to the
// same default forever. The comment at the read site even says "restTime was never written by
// anything": somebody noticed, wrote it down, and left the feature dead.
// The mechanic Hevy and Strong both use is the cheap one: there is no settings screen for this. You
// adjust the rest once with the buttons already on the timer, and the app remembers it for that
// exercise from then on.
let _restForEx = null, _restBase = 0;
function startRestTimer(secs, exName){
  _restForEx = exName || null; _restBase = secs;
  stopRestTimer();restTimeLeft=secs;restEndAt=Date.now()+secs*1000;
  const overlay=document.getElementById('rest-timer-overlay');const display=document.getElementById('rest-timer-display');
  if(!overlay||!display)return;overlay.style.display='block';display.textContent=restTimeLeft;display.style.color='var(--tx)';
  // On the wrapper this also fires with the screen off, which is the whole point of the buzz.
  try{ if(typeof Notify!=='undefined' && Notify && typeof Notify.schedule==='function' && Notify.isNative && Notify.isNative())
    Notify.schedule('rest_timer','Rest done','Next set.', new Date(restEndAt)); }catch(_){ }
  document.addEventListener('visibilitychange', _restSync);
  restTimerInt=setInterval(()=>{
    restTimeLeft=_restRemaining();if(display)display.textContent=restTimeLeft;
    if(restTimeLeft<=10&&display)display.style.color='var(--re)';
    if(restTimeLeft<=0) _restFinish();
  },250);   // four times a second, so coming back to the app corrects the display immediately
}
function stopRestTimer(){if(restTimerInt){clearInterval(restTimerInt);restTimerInt=null;}document.removeEventListener('visibilitychange', _restSync);restEndAt=0;const o=document.getElementById('rest-timer-overlay');if(o)o.style.display='none';}
function addRestTime(secs){
  // REMEMBER IT. The adjustment used to extend only the timer in front of them, so the same person
  // added the same fifteen seconds to the same exercise every session. Floored at 15s so a run of
  // taps on minus cannot store a rest nobody can use, and stored against the exercise rather than
  // globally, because the rest a squat needs is not the rest a curl needs.
  _restBase = Math.max(15, (_restBase || 0) + secs);
  if(_restForEx){ try{ const m = ls('totry_rest_times') || {}; m[_restForEx] = _restBase; ls('totry_rest_times', m); }catch(_){ } }
  restEndAt=Math.max(Date.now(),restEndAt+secs*1000);restTimeLeft=_restRemaining();const d=document.getElementById('rest-timer-display');if(d)d.textContent=restTimeLeft;}
function saveRoutine(){
  if(!currentSession.length){showToast('No exercises','Add exercises first.');return;}
  const name=document.getElementById('pt-routine-name')?.value.trim();if(!name){showToast('Name needed','Give your routine a name.');return;}
  const routines=ls('totry_routines')||[];const idx=routines.findIndex(r=>r.name===name);
  const routine={
    name,
    id: idx>=0 ? routines[idx].id : Date.now(),
    exercises: currentSession.map(ex => ({
      name: ex.name,
      bodyPart: ex.bodyPart,
      equipment: ex.equipment,
      // Preserve target reps/rest if they came from a previous routine load
      ...(ex.targetReps ? {targetReps: ex.targetReps} : {}),
      ...(ex.targetRest ? {targetRest: ex.targetRest} : {}),
      // Don't carry notes — those are per-session, not per-routine
      sets: ex.sets.map(s => ({weight: s.weight, reps: s.reps, type: s.type || 'normal', done: false}))
    }))
  };
  if(idx>=0)routines[idx]=routine;else routines.unshift(routine);
  ls('totry_routines',routines.slice(0,20));
  const inp=document.getElementById('pt-routine-name');if(inp)inp.value='';
  renderRoutines();showToast('Routine saved',name);
}
// ── LIVE PR DETECTION ── beat your all-time best mid-session and the app says so right then.
window.__prToasted = window.__prToasted || {};
function _exerciseBest(name){
  if(!window.__exBest) window.__exBest = {};
  if(window.__exBest[name]) return window.__exBest[name];
  let bw = 0, be = 0;
  (ls('totry_workouts')||[]).forEach(w => (w.exercises||[]).forEach(ex => {
    if(ex.name !== name) return;
    (ex.sets||[]).forEach(st => {
      const wt = parseFloat(st.weight)||0, rp = parseInt(st.reps)||0;
      if(wt > bw) bw = wt;
      const e = wt * (1 + rp/30);
      if(rp > 0 && e > be) be = e;
    });
  }));
  window.__exBest[name] = { w: bw, e: be };
  return window.__exBest[name];
}
function maybeCelebratePR(name, weight, reps){
  try{
    if(!name || !weight || weight <= 0 || window.__prToasted[name]) return;
    const best = _exerciseBest(name);
    if(best.w === 0 && best.e === 0) return; // first time doing it — no baseline yet
    const e1 = weight * (1 + (reps||0)/30);
    if(weight > best.w){
      window.__prToasted[name] = true;
      haptic('success');
      showToast('New PR \u2014 ' + name, weight + 'kg. Heaviest you\u2019ve ever moved on this.');
    } else if(reps > 0 && e1 > best.e){
      window.__prToasted[name] = true;
      haptic('success');
      showToast('Rep PR \u2014 ' + name, weight + 'kg \u00d7 ' + reps + '. Strongest set on record.');
    }
  }catch(_){ }
}

// ── PROVEN PROGRAM LIBRARY ── one-tap classic programs, each day becomes a routine.
const TEMPLATE_LIBRARY = [
  { name:'Full Body 3\u00d7/week', desc:'The classic beginner engine. Same day, three times a week.', days:[
    { name:'Full Body', exs:[['Barbell Squat','upper legs',3,'5'],['Bench Press','chest',3,'5'],['Barbell Row','back',3,'8'],['Overhead Press','shoulders',2,'8'],['Romanian Deadlift','upper legs',2,'10'],['Plank','waist',3,'45s']] } ]},
  { name:'Push / Pull / Legs', desc:'The most-run split in the world. Three days, rotate.', days:[
    { name:'PPL \u2014 Push', exs:[['Bench Press','chest',4,'6-8'],['Overhead Press','shoulders',3,'8'],['Incline Dumbbell Press','chest',3,'10'],['Lateral Raise','shoulders',3,'12-15'],['Tricep Pushdown','upper arms',3,'12']] },
    { name:'PPL \u2014 Pull', exs:[['Deadlift','back',3,'5'],['Lat Pulldown','back',3,'10'],['Barbell Row','back',3,'8'],['Face Pull','shoulders',3,'15'],['Bicep Curl','upper arms',3,'12']] },
    { name:'PPL \u2014 Legs', exs:[['Barbell Squat','upper legs',4,'6-8'],['Romanian Deadlift','upper legs',3,'10'],['Leg Press','upper legs',3,'12'],['Leg Curl','upper legs',3,'12'],['Calf Raise','lower legs',4,'15']] } ]},
  { name:'Upper / Lower', desc:'Four sessions a week, every muscle twice.', days:[
    { name:'Upper', exs:[['Bench Press','chest',4,'6'],['Barbell Row','back',4,'8'],['Overhead Press','shoulders',3,'8'],['Lat Pulldown','back',3,'10'],['Bicep Curl','upper arms',2,'12'],['Tricep Pushdown','upper arms',2,'12']] },
    { name:'Lower', exs:[['Barbell Squat','upper legs',4,'6'],['Romanian Deadlift','upper legs',3,'8'],['Leg Press','upper legs',3,'10'],['Leg Curl','upper legs',3,'12'],['Calf Raise','lower legs',4,'12']] } ]},
  { name:'5\u00d75 Strength', desc:'Two alternating days. Add weight every session you complete.', days:[
    { name:'5\u00d75 \u2014 A', exs:[['Barbell Squat','upper legs',5,'5'],['Bench Press','chest',5,'5'],['Barbell Row','back',5,'5']] },
    { name:'5\u00d75 \u2014 B', exs:[['Barbell Squat','upper legs',5,'5'],['Overhead Press','shoulders',5,'5'],['Deadlift','back',1,'5']] } ]},
  { name:'Dumbbells Only', desc:'Full body with nothing but a pair of dumbbells.', days:[
    { name:'Dumbbell Full Body', exs:[['Goblet Squat','upper legs',3,'10'],['Dumbbell Bench Press','chest',3,'10'],['Dumbbell Row','back',3,'10'],['Dumbbell Shoulder Press','shoulders',3,'10'],['Dumbbell Lunge','upper legs',3,'10'],['Bicep Curl','upper arms',3,'12']] } ]},
  { name:'Bodyweight Start', desc:'No gym, no excuses. Master your own weight first.', days:[
    { name:'Bodyweight', exs:[['Push Up','chest',3,'max'],['Bodyweight Squat','upper legs',3,'15'],['Pull Up','back',3,'max'],['Walking Lunge','upper legs',3,'12'],['Plank','waist',3,'45s']] } ]}
];
function renderTemplates(){
  const box = document.getElementById('pt-templates'); if(!box) return;
  const mine = (ls('totry_routines')||[]).map(r=>r.name);
  box.innerHTML = TEMPLATE_LIBRARY.map((p,pi) =>
    '<div style="background:var(--bg3);border-radius:var(--rm);padding:12px;margin-bottom:8px">'+
    '<div style="font-size:var(--t-base);color:var(--tx);margin-bottom:2px">'+_escFew(p.name)+'</div>'+
    '<div style="font-size:var(--t-cap);color:var(--tx3);margin-bottom:8px">'+p.desc+'</div>'+
    p.days.map((d,di) => {
      const added = mine.includes(d.name);
      return '<button class="btn" onclick="addTemplateDay('+pi+','+di+')" style="width:auto;padding:6px 12px;font-size:var(--t-cap);margin:0 6px 6px 0;'+(added?'background:transparent;color:var(--tx3)':'background:var(--bg2);color:var(--go)')+'">'+(added?'\u2713 ':'+ ')+d.name+'</button>';
    }).join('')+'</div>'
  ).join('');
}
function addTemplateDay(pi, di){
  const d = TEMPLATE_LIBRARY[pi].days[di];
  const routines = ls('totry_routines')||[];
  if(routines.find(r => r.name === d.name)){ showToast('Already added', d.name + ' is in your routines.'); return; }
  routines.push({ name: d.name, id: Date.now(), exercises: d.exs.map(e => ({
    name: e[0], bodyPart: e[1], equipment: '', targetReps: e[3],
    sets: Array.from({length: e[2]}, () => ({weight:'', reps:'', type:'normal', done:false}))
  })) });
  ls('totry_routines', routines);
  haptic('success');
  showToast('Added to your routines', d.name + ' \u2014 it\u2019s on your Train tab now.');
  renderTemplates();
  if(typeof renderRoutines === 'function') renderRoutines();
  // The name is the person's own words — it belongs in their data, not in the anonymous counter table.
  if(typeof logEvent === 'function') logEvent('template_added');
}

// Start a session from an imported Hevy routine (stored under totry_hevy_routines, normalized
// shape: {id,title,exercises:[{name,targetSets,targetReps}]}). Seeds each exercise with its
// target number of empty sets so the user just fills in weight/reps.
// Show every imported Hevy routine in a clean scrollable sheet (when there are more than fit inline).
function _showAllHevyRoutines(){
  const hevy=(ls('totry_hevy_routines')||[]).filter(r=>r&&(r.title||r.name));
  const m=document.createElement('div'); m.className='modal-bg open'; m.id='hevy-all-modal';
  const rows=hevy.map(r=>{
    const exs=Array.isArray(r.exercises)?r.exercises:[];
    const sub=exs.length?(exs.length+' exercise'+(exs.length>1?'s':'')):'tap to start';
    return '<button class="routine-row" onclick="document.getElementById(\'hevy-all-modal\')?.remove();startHevyRoutine(&#39;'+String(r.hevyId!=null?r.hevyId:(r.id!=null?r.id:'')).replace(/[\\\'"]/g,'')+'&#39;)" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 13px;margin-bottom:6px;background:var(--bg3);border-radius:var(--rm);cursor:pointer"><div style="flex:1;min-width:0"><div style="font-size:var(--t-base);color:var(--tx);font-weight:500">'+String(r.title||r.name).replace(/</g,'&lt;')+'</div><div style="font-size:var(--t-cap);color:var(--tx3);margin-top:2px">'+sub+'</div></div><span style="color:var(--go);font-size:var(--t-base)">Start &rarr;</span></button>';
  }).join('');
  m.innerHTML='<div class="modal" style="max-height:85vh;overflow-y:auto"><div class="modal-handle"></div><div style="font-family:var(--font-serif);font-size:var(--t-xl);font-style:italic;color:var(--tx);margin-bottom:4px">Your Hevy routines</div><div style="font-size:var(--t-sm);color:var(--tx3);margin-bottom:16px">'+hevy.length+' imported</div>'+rows+'<button class="btn" onclick="document.getElementById(\'hevy-all-modal\')?.remove()" style="background:none;border:none;color:var(--tx3);font-size:var(--t-sm);margin-top:6px">Close</button></div>';
  document.body.appendChild(m); m.addEventListener('click',e=>{if(e.target===m)m.remove();});
}
async function startHevyRoutine(id){
  // AN IN-PROGRESS SESSION IS SOMEONE'S WORKOUT. Loading a routine overwrote currentSession with no
  // warning, so tapping a routine mid-session — easy to do, they are on the same screen — erased every
  // set already logged, with nothing to undo it. Ask first.
  try{
    if(typeof currentSession !== 'undefined' && currentSession && currentSession.length &&
       !(await askConfirm('You have a workout in progress. Loading a routine will replace it \u2014 the sets you have logged will be lost. Continue?'))) return;
  }catch(_){ }
  // Match on hevyId — what fetchHevyRoutines actually stores. Matching on x.id meant comparing
  // String(undefined) to String(undefined), which "matched" the FIRST routine in the list rather
  // than failing loudly: tapping any routine would have started the wrong one.
  const key = String(id == null ? '' : id);
  const list = ls('totry_hevy_routines')||[];
  const r = list.find(x => x && x.hevyId != null && String(x.hevyId) === key)
         || list.find(x => x && x.id != null && String(x.id) === key);
  if(!r){ showToast('Routine not found','Try Refresh in Routines.'); return; }
  currentSession = (r.exercises||[]).map(ex => {
    const n = Math.max(1, Math.min(10, parseInt(ex.targetSets)||3));
    const reps = (ex.targetReps!=null && ex.targetReps!=='') ? String(ex.targetReps) : '';
    return { name: ex.name||'Exercise', bodyPart:'', equipment:'', sets: Array.from({length:n}, ()=>({weight:'', reps:reps, type:'normal', done:false})) };
  });
  if(typeof renderWorkoutSession==='function') renderWorkoutSession();
  haptic('tap');
  showToast('Routine loaded', (r.title||'Hevy routine'));
}
async function loadRoutine(id){
  // AN IN-PROGRESS SESSION IS SOMEONE'S WORKOUT. Loading a routine overwrote currentSession with no
  // warning, so tapping a routine mid-session — easy to do, they are on the same screen — erased every
  // set already logged, with nothing to undo it. Ask first.
  try{
    if(typeof currentSession !== 'undefined' && currentSession && currentSession.length &&
       !(await askConfirm('You have a workout in progress. Loading a routine will replace it \u2014 the sets you have logged will be lost. Continue?'))) return;
  }catch(_){ }
  const routine=(ls('totry_routines')||[]).find(r=>r.id===id);if(!routine)return;
  currentSession=routine.exercises.map(ex=>({...ex,sets:ex.sets.map(s=>({...s,done:false}))}));
  setPTTab('log');renderWorkoutSession();showToast('Routine loaded',routine.name);
}
async function deleteRoutine(id){
  // One tap on a small × used to destroy an entire routine — no confirm, no undo, no toast. A routine is
  // a person's own training plan, often built exercise by exercise.
  const all=(ls('totry_routines')||[]);
  const r=all.find(function(x){ return x && x.id===id; });
  const nm=r&&r.name?String(r.name):'this routine';
  if(!(await askConfirm('Delete "'+nm+'"?\n\nThe routine and its exercises are removed. Sessions you already logged with it are kept.'))) return;
  const _keptRoutines = all.filter(function(x){ return x.id!==id; });
  tombstoneRemoved('totry_routines', all, _keptRoutines);
  ls('totry_routines', _keptRoutines);
  try{ if(typeof syncToCloud==='function') syncToCloud('totry_routines', ls('totry_routines')); }catch(_){}
  try{ if(typeof haptic==='function') haptic('tap'); }catch(_){}
  try{ showToast('Routine deleted', nm+' is off your list.'); }catch(_){}
  renderRoutines();
}

// ── CUSTOM ROUTINE BUILDER ──────────────────────────────────
// Lets users build a routine from scratch: name + list of exercises with default sets/reps.
// Does NOT require logging a session first.
let _builderRoutine = null;

function openRoutineBuilder(){
  // Start with a fresh draft or resume an existing one being edited
  _builderRoutine = { name: '', exercises: [] };
  showRoutineBuilderModal();
}

function showRoutineBuilderModal(){
  closeOpenSheets();
  const r = _builderRoutine;
  if(!r || !Array.isArray(r.exercises)){ return; }   // nothing to build — don't crash
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  
  const exListHtml = r.exercises.length ?
    r.exercises.map((ex, i) =>
      '<div style="background:var(--bg3);border-radius:var(--rs);padding:10px;margin-bottom:6px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">' +
          '<div style="flex:1;font-size:var(--t-base);color:var(--tx)">' + (i+1) + '. ' + ex.name.replace(/</g, '&lt;') + '</div>' +
          '<div style="display:flex;gap:4px">' +
            (i > 0 ? '<button onclick="builderMoveEx(' + i + ',-1)" style="background:none;border-radius:4px;color:var(--tx3);font-size:var(--t-cap);cursor:pointer;padding:2px 6px;background:var(--fill2)">↑</button>' : '') +
            (i < r.exercises.length - 1 ? '<button onclick="builderMoveEx(' + i + ',1)" style="background:none;border-radius:4px;color:var(--tx3);font-size:var(--t-cap);cursor:pointer;padding:2px 6px;background:var(--fill2)">↓</button>' : '') +
            '<button onclick="builderRemoveEx(' + i + ')" style="background:none;border-radius:4px;color:var(--re);font-size:var(--t-cap);cursor:pointer;padding:2px 6px;background:var(--fill2)">×</button>' +
          '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-family:var(--font-text);font-size:var(--t-mini);color:var(--tx3)">' +
          '<div>Sets: <input type="number" min="1" max="20" value="' + ex.sets + '" oninput="builderUpdateEx(' + i + ',\'sets\',this.value)" style="width:38px;padding:3px;font-size:var(--t-base);text-align:center"></div>' +
          '<div>Reps: <input type="text" value="' + (ex.reps || '') + '" placeholder="8-12" oninput="builderUpdateEx(' + i + ',\'reps\',this.value)" style="width:50px;padding:3px;font-size:var(--t-base);text-align:center"></div>' +
          '<div>Rest: <input type="text" value="' + (ex.rest || '') + '" placeholder="90s" oninput="builderUpdateEx(' + i + ',\'rest\',this.value)" style="width:50px;padding:3px;font-size:var(--t-base);text-align:center"></div>' +
        '</div>' +
      '</div>'
    ).join('') :
    '<div class="empty-note">No exercises yet. Add the first one below.</div>';
  
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--go);text-transform:uppercase;letter-spacing:0.01em;margin-bottom:4px">Routine builder</div>' +
    '<h3 style="margin-bottom:6px">Build a routine</h3>' +
    '<p style="font-size:var(--t-sm);color:var(--tx3);margin-bottom:12px;line-height:1.55">Name the routine, list the exercises with their target sets/reps. Save and assign to a day in your weekly split.</p>' +
    '<div class="eyebrow">Routine name</div>' +
    '<input type="text" id="builder-name" value="' + (r.name || '') + '" placeholder="e.g. Push Day A, Heavy Legs, Pull (Volume)" oninput="_builderRoutine.name=this.value" style="margin-bottom:14px">' +
    
    '<div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--tx3);text-transform:uppercase;letter-spacing:0.01em;margin-bottom:6px">Exercises (' + r.exercises.length + ')</div>' +
    '<div id="builder-ex-list" style="max-height:45vh;overflow-y:auto;margin-bottom:12px;padding-right:4px">' + exListHtml + '</div>' +
    
    '<div class="eyebrow">Add exercise</div>' +
    '<div style="position:relative;margin-bottom:14px">' +
      '<div style="display:flex;gap:6px">' +
        '<input type="text" id="builder-add-input" placeholder="Search or type an exercise…" autocomplete="off" oninput="builderSearchExercises(this.value)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();builderAddExFromInput();}" style="flex:1">' +
        '<button class="btn" onclick="builderAddExFromInput()" style="width:auto;padding:9px 14px;background:var(--bg3);white-space:nowrap">+ Add</button>' +
      '</div>' +
      '<div id="builder-ex-suggestions" style="margin-top:6px"></div>' +
    '</div>' +
    
    '<button class="btn primary" onclick="saveBuilderRoutine()" style="margin-bottom:8px">Save routine</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;background:var(--fill2)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
  
  // Focus the name input if empty, otherwise the add-exercise input
  setTimeout(() => {
    if(!r.name){
      document.getElementById('builder-name')?.focus();
    } else {
      document.getElementById('builder-add-input')?.focus();
    }
  }, 80);
}

function builderAddExFromInput(){
  const input = document.getElementById('builder-add-input');
  const name = (input?.value || '').trim();
  if(!name){ showToast('Empty', 'Type or pick an exercise.'); return; }
  _builderRoutine.exercises.push({ name, sets: 3, reps: '8-12', rest: '90s' });
  if(input){ input.value = ''; }
  showRoutineBuilderModal();
}

// Search the local exercise library and show tappable suggestions in the builder
function builderSearchExercises(q){
  const box = document.getElementById('builder-ex-suggestions');
  if(!box) return;
  q = (q || '').trim().toLowerCase();
  if(q.length < 2){ box.innerHTML = ''; return; }
  const matches = [];
  for(const [bodyPart, list] of Object.entries(EXERCISE_DB)){
    list.forEach(ex => {
      if(ex.name.toLowerCase().includes(q) || bodyPart.includes(q) || (ex.primary||'').toLowerCase().includes(q)){
        matches.push({ name: ex.name, meta: ex.equipment + ' · ' + (ex.primary||bodyPart) });
      }
    });
  }
  if(!matches.length){ box.innerHTML = '<div style="font-size:var(--t-cap);color:var(--tx3);padding:6px 2px;font-style:italic">No library match — tap "+ Add" to use what you typed.</div>'; return; }
  box.innerHTML = matches.slice(0, 8).map(m =>
    '<button onclick="builderAddNamed(&apos;' + m.name.replace(/'/g, "\\'") + '&apos;)" style="display:block;width:100%;text-align:left;background:var(--bg3);border-radius:var(--rs);padding:9px 12px;margin-bottom:4px;cursor:pointer;color:var(--tx)">' +
      '<div style="font-size:var(--t-base)">' + m.name.replace(/</g,'&lt;') + '</div>' +
      '<div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--tx3);margin-top:2px">' + m.meta.replace(/</g,'&lt;') + '</div>' +
    '</button>'
  ).join('');
}

// Add a specific exercise picked from suggestions
function builderAddNamed(name){
  _builderRoutine.exercises.push({ name, sets: 3, reps: '8-12', rest: '90s' });
  showRoutineBuilderModal();
}

function builderRemoveEx(i){
  _builderRoutine.exercises.splice(i, 1);
  showRoutineBuilderModal();
}

function builderMoveEx(i, dir){
  const arr = _builderRoutine.exercises;
  const j = i + dir;
  if(j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  showRoutineBuilderModal();
}

function builderUpdateEx(i, field, val){
  if(!_builderRoutine.exercises[i]) return;
  _builderRoutine.exercises[i][field] = val;
  // Don't re-render — let user keep typing
}

function saveBuilderRoutine(){
  const r = _builderRoutine;
  const name = (r.name || '').trim();
  if(!name){ showToast('Name needed', 'Give your routine a name first.'); return; }
  if(!r.exercises.length){ showToast('No exercises', 'Add at least one exercise.'); return; }
  
  // Convert builder format → saved routine format (same as saveRoutine does)
  const routines = ls('totry_routines') || [];
  const existing = routines.findIndex(x => x.name === name);
  const routine = {
    name: name,
    id: existing >= 0 ? routines[existing].id : Date.now(),
    exercises: r.exercises.map(ex => {
      // Pre-fill the set count using "sets" value, with empty weight/reps
      const setCount = Math.max(1, Math.min(20, parseInt(ex.sets) || 3));
      const sets = [];
      for(let i = 0; i < setCount; i++){
        sets.push({ weight: '', reps: '', type: 'normal', done: false });
      }
      return {
        name: ex.name,
        sets: sets,
        targetReps: ex.reps || '',
        targetRest: ex.rest || ''
      };
    })
  };
  
  if(existing >= 0) routines[existing] = routine;
  else routines.unshift(routine);
  ls('totry_routines', routines.slice(0, 20));
  
  closeOpenSheets();
  _builderRoutine = null;
  if(typeof renderRoutines === 'function') renderRoutines();
  showToast('Routine saved', name + ' · ' + r.exercises.length + ' exercise' + (r.exercises.length===1?'':'s'));
  haptic('success');
}

// ── WS-E: ROUTINE BUILDER FROM A GOAL ──────────────────────────────
// User states a goal in plain language; AI drafts a full routine they can save (and push to Hevy).
function openGoalRoutine(){
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.innerHTML='<div class="modal" style="max-height:92vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:var(--font-serif);font-size:var(--t-xl);font-style:italic;color:var(--tx);margin-bottom:6px">Build from your goal</div>'+
    '<div style="font-size:var(--t-sm);color:var(--tx3);line-height:1.6;margin-bottom:14px">Tell me your goal, how many days you can train, and any equipment or limits. I\u2019ll draft a routine you can save and tweak \u2014 a starting point, not gospel.</div>'+
    '<textarea id="goal-routine-input" placeholder="e.g. Build muscle, 4 days a week, full gym, bad left shoulder so easy on overhead pressing" style="min-height:90px;margin-bottom:10px"></textarea>'+
    '<button class="btn primary" id="goal-routine-btn" onclick="generateGoalRoutine()">Draft my routine</button>'+
    '<div id="goal-routine-out" style="margin-top:14px"></div>'+
    '<button class="btn quiet" onclick="closeModal(this)" style="margin-top:10px">Close</button>'+
  '</div>';
  document.body.appendChild(m);
}
async function generateGoalRoutine(){
  const goal=(document.getElementById('goal-routine-input')||{}).value||'';
  // GATED, 12 Oct 2026 — ABOVE the empty-field check, because a validation rule must never be able
  // to outrank a disclosure (the Sunday check-in's out-of-band weight, recorded in CLAUDE.md, and
  // rebuilt by me in saveQuickLog an hour ago). This text is sent straight to a MODEL.
  const _grC = (typeof journalCrisisOf==='function') ? journalCrisisOf(goal) : null;
  if(_grC){
    setTimeout(function(){ try{ if(typeof journalMeetCrisis==='function') journalMeetCrisis(_grC, null, { saved: false }); }catch(_){ } }, 250);
    return;
  }
  if(!goal.trim()){ showToast('Tell me your goal','Describe what you\u2019re training for first.'); return; }
  const btn=document.getElementById('goal-routine-btn'); const out=document.getElementById('goal-routine-out');
  if(btn){ btn.textContent='Drafting...'; btn.disabled=true; }
  try{
    const sys='You are an expert strength coach. Design safe, effective, evidence-based routines. Respect stated limits/injuries. Return ONLY JSON.';
    const prompt='Design a training routine for this goal: "'+goal.trim()+'".\n\nReturn ONLY this JSON, no markdown:\n{"days":[{"name":"day label e.g. Push A","focus":"main focus","exercises":[{"name":"exercise","sets":number,"reps":"e.g. 8-12","note":"optional cue or substitution"}]}],"summary":"1-2 sentences on the approach + how to progress"}\nKeep each day to 4-7 exercises. Use common gym exercise names. Respect any injury/equipment limits stated.';
    const raw=await api(sys,[],prompt,1100);
    const mt=raw.match(/\{[\s\S]*\}/);
    if(mt && out){
      const plan=JSON.parse(mt[0]);
      window.__pendingGoalRoutine=plan;
      let html='';
        // A MODEL'S REPLY IS A PERSON'S TYPING WEARING A HAT. This block is api() + JSON.parse
        // and then innerHTML, which is the class CLAUDE.md names by name — and the prompt carries
        // the goal the person typed, so the model paraphrases their own words back into these
        // fields. Driven before the fix: five of them executed and three live <img> landed.
      (plan.days||[]).forEach((d,di)=>{
        html+='<div class="card"><div style="font-size:var(--t-base);color:var(--tx);font-weight:500;margin-bottom:2px">'+_escFew(d.name||'Day '+(di+1))+'</div>'+
          (d.focus?'<div style="font-size:var(--t-cap);color:var(--go);margin-bottom:8px">'+_escFew(d.focus)+'</div>':'')+
          (d.exercises||[]).map(ex=>'<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;font-size:var(--t-sm);border-bottom:1px solid var(--bd)"><span style="color:var(--tx2)">'+_escFew(ex.name)+(ex.note?' <span style="color:var(--tx3);font-size:var(--t-mini)">('+_escFew(ex.note)+')</span>':'')+'</span><span style="color:var(--tx3);font-family:var(--font-text);font-size:var(--t-mini);white-space:nowrap">'+(ex.sets||3)+'\u00d7'+(ex.reps||'')+'</span></div>').join('')+
          '<button class="btn" onclick="saveGoalRoutineDay('+di+')" style="margin-top:8px;font-size:var(--t-sm);background:var(--bg3)">Save \u201c'+(d.name||'Day '+(di+1)).replace(/"/g,'')+'\u201d as a routine</button>'+
          '</div>';
      });
      if(plan.summary) html+='<div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.6;padding:10px;background:var(--bg3);border-radius:var(--rs);margin-bottom:8px">'+_escFew(plan.summary)+'</div>';
      html+='<button class="btn primary" onclick="saveAllGoalRoutineDays()" style="margin-top:4px">Save all days as routines</button>';
      out.innerHTML=html;
    } else if(out){ out.innerHTML='<div style="font-size:var(--t-sm);color:var(--tx3)">Couldn\u2019t draft that. Try describing your goal differently.</div>'; }
  }catch(e){ if(out){ out.innerHTML='<div style="font-size:var(--t-sm);color:var(--tx3)">Couldn\u2019t reach the coach right now.</div>'; } }
  finally{ if(btn){ btn.textContent='Draft my routine'; btn.disabled=false; } }
}
function _goalDayToRoutine(d){
  return {
    name: d.name || 'Routine',
    id: Date.now() + Math.floor(Math.random()*1000),
    exercises: (d.exercises||[]).map(ex => ({
      name: ex.name, bodyPart: '', equipment: '',
      targetReps: ex.reps || '',
      sets: Array.from({length: ex.sets||3}, () => ({weight:'', reps:'', type:'normal', done:false}))
    }))
  };
}
function saveGoalRoutineDay(di){
  const plan=window.__pendingGoalRoutine; if(!plan||!plan.days||!plan.days[di]) return;
  const routines=ls('totry_routines')||[];
  routines.unshift(_goalDayToRoutine(plan.days[di]));
  ls('totry_routines',routines.slice(0,20));
  if(typeof syncToCloud==='function') syncToCloud();
  if(typeof renderRoutines==='function') renderRoutines();
  haptic('success'); showToast('Routine saved', (plan.days[di].name||'Day')+' added to your routines.');
}
function saveAllGoalRoutineDays(){
  const plan=window.__pendingGoalRoutine; if(!plan||!plan.days) return;
  let routines=ls('totry_routines')||[];
  plan.days.forEach(d=>routines.unshift(_goalDayToRoutine(d)));
  ls('totry_routines',routines.slice(0,20));
  if(typeof syncToCloud==='function') syncToCloud();
  if(typeof renderRoutines==='function') renderRoutines();
  closeOpenSheets();
  haptic('success'); showToast('Routines saved', plan.days.length+' routines added. Find them in Saved routines.');
}

function renderRoutines(){
  const routines=ls('totry_routines')||[];const container=document.getElementById('pt-routines-list');if(!container)return;
  // Same two defects as the history list: a centred italic serif empty state, and — when there ARE
  // routines — one .card per routine, each holding a name, a delete x, a grey line and a full-width
  // tint button reading "Load this routine →". Five stacked cards for five routines. One list.
  if(!routines.length){container.className='';container.innerHTML='<div class="ios-empty">'+svgIcon('book',44)+'<div class="ios-empty-title">No routines saved yet</div><div class="ios-empty-body">Log a session and save it as a routine.</div></div>';return;}
  container.className='ios-list';
  // Built here rather than through iosRow because iosRow emits a <button> when it is given an
  // onclick, and a button may not contain a button \u2014 the delete has to stay a real control. Same
  // classes, same escaper, so it is the same row.
  container.innerHTML=routines.map(r=>{
    const _ex=(r&&Array.isArray(r.exercises))?r.exercises:[];
    const sub=_ex.length+' exercise'+(_ex.length===1?'':'s')+' \u00b7 '+_ex.map(e=>e&&e.name||'?').slice(0,3).join(', ')+(_ex.length>3?'\u2026':'');
    return '<div class="ios-row" onclick="loadRoutine('+r.id+')">'+
      '<span class="ios-row-body"><span class="ios-row-title" style="display:block">'+_escFew(r.name||'Routine')+'</span>'+
      '<span class="ios-row-sub" style="display:block">'+_escFew(sub)+'</span></span>'+
      '<button type="button" class="tr-row-del" onclick="event.stopPropagation();deleteRoutine('+r.id+')" aria-label="Delete this routine">&#215;</button></div>';
  }).join('');
}
// renderSplitDayCards() removed. It painted .pt-split-day-card rows into #pt-split-days — an id
// that is not in the shell — so it returned on its first line at both call sites. Its live
// successor is renderSplitOverview() in 04-fight.js, which fills #pt-split-overview. Its
// new-user invite ('No training plan yet — let me build you one') had never been reachable.
// Old saveSplitDay removed (unified into routines)

// ── PER-EXERCISE PROGRESS CHART ───────────────────────────────
// Hevy's signature feature: pick a lift, see your estimated 1RM climb over time.
// Populates the dropdown with every exercise the user has actually logged.
function populateExerciseSelect(){
  const sel = document.getElementById('pt-exercise-select');
  if(!sel) return;
  const history = ls('totry_workouts') || [];
  const names = new Set();
  history.forEach(s => (s.exercises || []).forEach(ex => {
    if(ex.name && (ex.sets || []).some(st => st.weight && st.reps)) names.add(ex.name);
  }));
  const sorted = Array.from(names).sort();
  const current = sel.value;
  sel.innerHTML = '<option value="">Select an exercise...</option>' +
    sorted.map(n => '<option value="' + n.replace(/"/g,'&quot;') + '"' + (n===current?' selected':'') + '>' + n.replace(/</g,'&lt;') + '</option>').join('');
  if(!sorted.length){
    sel.innerHTML = '<option value="">No logged lifts yet</option>';
  }
}

function renderExerciseProgressChart(exName){
  const box = document.getElementById('pt-exercise-chart');
  if(!box) return;
  if(!exName){ box.innerHTML = ''; return; }
  
  const history = ls('totry_workouts') || [];
  // Build a time series of best estimated-1RM per session for this exercise (Epley: w*(1+r/30))
  const points = [];
  // history is newest-first; reverse to go oldest→newest for the chart
  [...history].reverse().forEach(s => {
    const ex = (s.exercises || []).find(e => e.name === exName);
    if(!ex) return;
    let bestE1RM = 0, bestSet = null;
    (ex.sets || []).forEach(st => {
      const w = parseFloat(st.weight), r = parseInt(st.reps);
      // st.done !== false, like the aggregate block below it — the two halves of this one card
      // disagreed by construction, so the chart plotted a lift the "Best set" line refused.
      if(w > 0 && r > 0 && st.done !== false){
        const e1rm = estE1RM(w, r);
        if(e1rm > bestE1RM){ bestE1RM = e1rm; bestSet = {w, r}; }
      }
    });
    if(bestE1RM > 0){
      points.push({
        ts: s.ts ? new Date(s.ts).getTime() : Date.now(),
        e1rm: Math.round(bestE1RM),
        set: bestSet,
        date: s.ts ? new Date(s.ts).toLocaleDateString('en-AU',{day:'numeric',month:'short'}) : ''
      });
    }
  });
  
  if(points.length < 2){
    box.innerHTML = '<div style="padding:18px;text-align:center;color:var(--tx3);font-size:var(--t-sm);font-style:italic;background:var(--bg3);border-radius:var(--rs)">Log this lift at least twice to see your strength curve. One session in — keep going.</div>';
    return;
  }
  
  // Chart geometry
  const W = 320, H = 140, padL = 34, padR = 10, padT = 14, padB = 22;
  const e1rms = points.map(p => p.e1rm);
  const minV = Math.min(...e1rms), maxV = Math.max(...e1rms);
  const range = maxV - minV || 1;
  const minTs = points[0].ts, maxTs = points[points.length-1].ts;
  const tsRange = maxTs - minTs || 1;
  
  const x = ts => padL + ((ts - minTs) / tsRange) * (W - padL - padR);
  const y = v => padT + (1 - (v - minV) / range) * (H - padT - padB);
  
  // Build polyline + area
  const linePts = points.map(p => x(p.ts).toFixed(1) + ',' + y(p.e1rm).toFixed(1)).join(' ');
  const areaPts = padL + ',' + (H-padB) + ' ' + linePts + ' ' + (W-padR) + ',' + (H-padB);
  
  // Y-axis labels (min, mid, max)
  const mid = Math.round((minV + maxV) / 2);
  let svg = '<svg aria-hidden="true" viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;display:block">';
  // gridlines + labels
  [maxV, mid, minV].forEach(v => {
    const yy = y(v);
    svg += '<line x1="' + padL + '" y1="' + yy.toFixed(1) + '" x2="' + (W-padR) + '" y2="' + yy.toFixed(1) + '" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>';
    svg += '<text x="' + (padL-4) + '" y="' + (yy+3).toFixed(1) + '" text-anchor="end" style="font-family:var(--font-rounded)" font-size="12" fill="var(--tx3)">' + v + '</text>';
  });
  // area fill
  svg += '<polygon points="' + areaPts + '" fill="var(--go-bg)"/>';
  // line
  svg += '<polyline points="' + linePts + '" fill="none" stroke="var(--go)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  // dots
  points.forEach(p => {
    svg += '<circle cx="' + x(p.ts).toFixed(1) + '" cy="' + y(p.e1rm).toFixed(1) + '" r="2.5" fill="var(--go)"/>';
  });
  // first + last date labels
  svg += '<text x="' + padL + '" y="' + (H-6) + '" style="font-family:var(--font-rounded)" font-size="12" fill="var(--tx3)">' + points[0].date + '</text>';
  svg += '<text x="' + (W-padR) + '" y="' + (H-6) + '" text-anchor="end" style="font-family:var(--font-rounded)" font-size="12" fill="var(--tx3)">' + points[points.length-1].date + '</text>';
  svg += '</svg>';
  
  // Summary line: change from first to last
  const first = points[0].e1rm, last = points[points.length-1].e1rm;
  const delta = last - first;
  const pct = Math.round((delta / first) * 100);
  const deltaColor = delta > 0 ? 'var(--gr)' : (delta < 0 ? 'var(--re)' : 'var(--tx3)');
  const deltaTxt = delta > 0 ? '+' + delta + 'kg (+' + pct + '%)' : (delta < 0 ? delta + 'kg (' + pct + '%)' : 'no change');

  // Hevy-style aggregate stats across all history for this lift
  let totalVol = 0, totalReps = 0, sessions = 0, bestSet = {w:0, r:0, e1rm:0};
  history.forEach(s => {
    const ex = (s.exercises || []).find(e => e.name === exName);
    if(!ex) return;
    let did = false;
    (ex.sets || []).forEach(st => {
      const w = parseFloat(st.weight), r = parseInt(st.reps);
      if(w > 0 && r > 0 && st.done !== false){
        totalVol += w * r; totalReps += r; did = true;
        const e1 = estE1RM(w, r);
        if(e1 > bestSet.e1rm) bestSet = {w, r, e1rm:e1};
      }
    });
    if(did) sessions++;
  });

  box.innerHTML = svg +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:10px;border-top:1px solid var(--bd)">' +
      '<div><div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--tx3);text-transform:uppercase;letter-spacing:0.01em">Est. 1RM now</div><div style="font-size:var(--t-hd);color:var(--tx)">' + last + 'kg</div></div>' +
      '<div style="text-align:right"><div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--tx3);text-transform:uppercase;letter-spacing:0.01em">Since first log</div><div style="font-size:var(--t-base);color:' + deltaColor + '">' + deltaTxt + '</div></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px">' +
      '<div style="background:var(--bg3);border-radius:var(--rs);padding:9px;text-align:center"><div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--tx3);text-transform:uppercase;letter-spacing:0.01em">Best set</div><div style="font-size:var(--t-base);color:var(--tx);margin-top:2px">' + (bestSet.w?bestSet.w+'×'+bestSet.r:'—') + '</div></div>' +
      '<div style="background:var(--bg3);border-radius:var(--rs);padding:9px;text-align:center"><div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--tx3);text-transform:uppercase;letter-spacing:0.01em">Total volume</div><div style="font-size:var(--t-base);color:var(--tx);margin-top:2px">' + (totalVol>=1000?(totalVol/1000).toFixed(1)+'t':Math.round(totalVol)+'kg') + '</div></div>' +
      '<div style="background:var(--bg3);border-radius:var(--rs);padding:9px;text-align:center"><div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--tx3);text-transform:uppercase;letter-spacing:0.01em">Sessions</div><div style="font-size:var(--t-base);color:var(--tx);margin-top:2px">' + sessions + '</div></div>' +
    '</div>';
  // Progressive-overload nudge — what to try next session, from this lift's own history.
  try{
    const ov = (typeof overloadSuggestion==='function') ? overloadSuggestion(exName) : null;
    if(ov && ov.suggestion){
      box.innerHTML += '<div style="margin-top:10px;padding:11px 13px;background:var(--go-bg);border-radius:var(--rs)"><div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--go);text-transform:uppercase;letter-spacing:0.01em;margin-bottom:4px">\u2197 Next session</div><div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.5">' + ov.suggestion + '</div></div>';
    }
  }catch(_){ }
}

function renderWorkoutHistory(){
  renderPersonalRecords();
  const history=ls('totry_workouts')||[];const container=document.getElementById('pt-history-list');if(!container)return;
  // Was a centred ITALIC SERIF line over a 15px tertiary one — the reading face used as a shrug.
  // ContentUnavailableView: an icon, a title, a sentence. Same words.
  if(!history.length){container.className='';container.innerHTML='<div class="ios-empty">'+svgIcon('dumbbell',44)+'<div class="ios-empty-title">No sessions logged yet</div><div class="ios-empty-body">Log a workout in the Log tab, or sync Hevy to import your history.</div></div>';return;}
  container.className='ios-list';
  container.innerHTML='';
  history.forEach(s=>{
    const item=document.createElement('div');item.className='workout-history-item';
    // completedSets/totalSets are only written by the in-app logger. A session converted from Hevy or
    // Strava, or saved by an older version, has neither \u2014 and read "undefined/undefined sets" on the
    // row. Derive them from the sets that are actually there, and say nothing when there are none.
    const _allSets=(s&&Array.isArray(s.exercises))?s.exercises.reduce((a,ex)=>a.concat(Array.isArray(ex.sets)?ex.sets:[]),[]):[];
    const _doneSets=(typeof s.completedSets==='number')?s.completedSets:_allSets.filter(x=>x&&x.done).length;
    const _totSets=(typeof s.totalSets==='number')?s.totalSets:_allSets.length;
    // Only the in-app logger writes date/day/splitFocus. Everything that arrives from Hevy or Strava
    // carries ts and a name instead \u2014 so every imported row read "undefined \u2014 Day undefined". Fall
    // back to the timestamp, and drop the clauses that have nothing behind them rather than print a
    // gap. (The rows a person is most likely to have are exactly the imported ones.)
    const _when=s.date||(s.ts?new Date(s.ts).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):'');
    const _dayLbl=(s.day!==undefined&&s.day!==null&&s.day!=='')?(' \u2014 Day '+s.day):'';
    const _focus=s.splitFocus||s.type||'Session';
    // Built as parts rather than a fixed sentence: a cardio session has no exercises and no sets but
    // does have a duration, and "1 exercises" is not something a person should be shown.
    const _exN=(s&&Array.isArray(s.exercises))?s.exercises.length:0;
    const _mins=s.durationMin||s.durationMinutes||null;
    const _meta=[];
    if(_exN) _meta.push(_exN+' exercise'+(_exN===1?'':'s'));
    if(displayVolume(s)) _meta.push(displayVolume(s).toLocaleString()+'kg vol');
    if(_totSets) _meta.push(_doneSets+'/'+_totSets+' sets');
    if(!_exN&&_mins) _meta.push(_mins+' min');
    // The date led the row in 11px TINT caps above the session name, which read as a label nobody
    // sized; iOS puts the name first. _focus is a split focus the person typed, so it is escaped —
    // it was not, here or in the sheet below.
    item.innerHTML='<div class="tr-whi-body"><div class="whi-name">'+_escFew(_focus)+'</div><div class="whi-date">'+_escFew(_when+_dayLbl)+'</div><div class="whi-meta">'+_meta.join(' \u00b7 ')+'</div></div>'+
      '<span class="ios-row-chevron">'+svgIcon('chevronright',14)+'</span>';
    item.onclick=()=>{
      const m=document.createElement('div');m.className='modal-bg open';
      // Build per-exercise block: sets (with RPE) + notes (if any)
      const exList = s.exercises.map(ex => {
        const setsHtml = (ex.sets || []).map((set, i) => {
          const rpe = set.rpe ? ' <b>@' + set.rpe + '</b>' : '';
          return '<span class="tr-hist-set' + (set.done ? ' done' : '') + '">S' + (i+1) + ': ' + (set.weight||'?') + 'kg\u00d7' + (set.reps||'?') + rpe + '</span>';
        }).join('');
        const noteHtml = ex.notes && ex.notes.trim() ?
          '<div class="tr-hist-note">' + _escFew(ex.notes) + '</div>' : '';
        return '<div class="tr-hist-ex">' +
          '<div class="tr-hist-ex-name">' + _escFew(ex.name) + '</div>' +
          '<div class="tr-hist-sets">' + setsHtml + '</div>' +
          noteHtml +
        '</div>';
      }).join('');
      // The sheet opened with an 11px tint date at 0.1em tracking, then a 17px name, then a 12px
      // tint volume line — three sizes, three colours, three trackings, in the first 60px. Sheet
      // title, one subtitle line, then the record.
      const _vol = displayVolume(s);
      m.innerHTML='<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>'+
        '<h3>'+_escFew(_focus)+'</h3>'+
        '<div class="tr-sheet-sub">'+_escFew(_when)+(_vol?' \u00b7 '+_vol.toLocaleString()+'kg volume'+(ls('totry_bw_volume')?' (incl. bodyweight)':''):'')+'</div>'+
        '<div class="tr-sheet-scroll">'+exList+'</div>'+
        // THE ID IS A STRING AND THIS PASSED IT AS AN IDENTIFIER. `totry_workouts` ids come from
        // five producers and every one of them is a STRING: 'manual_'+Date.now() (1622),
        // 'health_'+wid (02-native:321), 'strava_'+a.id (03-person:536), 'hevy_'+w.id
        // (21-content-engine:99) and 'stravahevy_'+a.id. Unquoted, `reloadSession('+s.id+')`
        // compiles to `reloadSession(health_abc)` — a bare identifier, in global scope, naming
        // nothing — so "Repeat session" and "Delete this session" threw ReferenceError for EVERY
        // session except one with a bare numeric id. Measured: 5 of 6 real id shapes broken.
        // This is the live remnant of the `d0 is not defined @ #money:1` family that 16 real users
        // hit on 4 Sep; c31c24b fixed the money and nourish call sites with
        // `_jsCode(JSON.stringify(...))` and left these two. Both receivers compare with `==`
        // (2533, 2553), so a string literal is correct for a numeric id too.
        '<div class="tr-session-actions"><button class="btn primary" onclick="reloadSession('+_jsCode(JSON.stringify(s.id))+');this.closest(\'.modal-bg\').remove()">Repeat session</button>'+
        '<button class="btn" onclick="this.closest(\'.modal-bg\').remove()">Close</button></div>'+
        '<button class="btn quiet tr-delete" onclick="deleteWorkoutFromHistory('+_jsCode(JSON.stringify(s.id))+')">Delete this session</button></div>';
      document.body.appendChild(m);
    };
    container.appendChild(item);
  });
}

async function deleteWorkoutFromHistory(id){
  if(!(await askConfirm('Delete this workout session permanently? Your PRs from it will stay, but the session record will be gone.'))) return;
  const history = ls('totry_workouts') || [];
  const _kept = history.filter(s => s.id != id);
  tombstoneRemoved('totry_workouts', history, _kept);   // the OTHER workout delete — see deleteTraining
  ls('totry_workouts', _kept);
  closeOpenSheets();
  if(typeof renderUnifiedTraining==='function') renderUnifiedTraining();
  // AND REDRAW THE LIST THE ROW IS IN. renderUnifiedTraining() paints the analytics above, not
  // #pt-history-list, so the deleted session stayed on screen with its "Repeat session" button —
  // which then looked up an id that was no longer in storage and silently did nothing. The delete
  // had worked; the only thing that disagreed was the screen.
  if(typeof renderWorkoutHistory==='function') renderWorkoutHistory();
  showToast('Deleted', 'Session removed from history.');
  haptic('warning');
}
// MAKE THE CODE MATCH THE PROMISE. The toast says "Last performance shown as placeholders" and the
// fields held last week's REAL values — the same colour as typed text, not the dim placeholder grey.
// Tapping the done check re-reads the input, so one tap with nothing typed wrote last week's
// performance into today's session and on into volume, PRs and the progression maths. renderSets()
// already derives placeholders from the last performance and already renders a "tap to use last
// time" button, so clearing the values gives exactly what the toast describes, plus one tap to
// accept them — which is the affordance sitting right beside the field.
function reloadSession(id){const session=(ls('totry_workouts')||[]).find(s=>s.id==id);if(!session)return;currentSession=session.exercises.map(ex=>({...ex,sets:ex.sets.map(s=>({...s,weight:'',reps:'',done:false}))}));setPTTab('log');renderWorkoutSession();showToast('Session reloaded','Last time is shown under each field \u2014 tap to reuse it.');}

// ── MUSCLE GROUP CLASSIFICATION ─────────────────────────────
// Maps exercise names to one or more major muscle groups (chest, back, shoulders,
// biceps, triceps, quads, hamstrings, glutes, calves, core).
// Used for weekly volume aggregation + body part frequency.
const MUSCLE_KEYWORDS = {
  chest: ['bench','press chest','chest press','push-up','pushup','push up','fly','flye','dip','pec','incline press','decline press'],
  back: ['row','pull-up','pullup','pull up','chin-up','chinup','lat pull','pulldown','deadlift','rdl','romanian','good morning','shrug','rack pull','t-bar','tbar','seal row'],
  shoulders: ['shoulder press','overhead press','ohp','military press','arnold press','lateral raise','front raise','rear delt','reverse fly','reverse pec','face pull','upright row','landmine press'],
  biceps: ['curl','chin-up','chinup','preacher','hammer','concentration','spider'],
  triceps: ['tricep','triceps','pushdown','skullcrusher','skull crusher','overhead extension','close grip bench','close-grip bench','jm press','kickback','dip'],
  quads: ['squat','leg press','leg extension','lunge','split squat','step-up','step up','sissy','bulgarian','front squat','hack squat'],
  hamstrings: ['rdl','romanian','leg curl','hamstring curl','stiff-leg','stiff leg','good morning','glute ham','nordic'],
  glutes: ['hip thrust','glute bridge','glute kickback','cable kickback','sumo','romanian deadlift','rdl','bulgarian','hip abduction'],
  calves: ['calf raise','calf press','seated calf','standing calf','tibialis'],
  core: ['plank','sit-up','situp','sit up','crunch','leg raise','knee raise','hanging','ab wheel','rollout','russian twist','dead bug','pallof','farmer','farmer\'s carry','cable woodchop','hollow body']
};

function classifyExerciseMuscles(exName, exData){
  // If exercise has explicit data from ExerciseDB, use it first
  if(exData){
    const primary = (exData.primary || exData.target || '').toLowerCase();
    const bodyPart = (exData.bodyPart || '').toLowerCase();
    const matched = [];
    // Map ExerciseDB body parts to our groups
    const dbMap = {
      'chest': 'chest', 'back': 'back', 'shoulders': 'shoulders', 'upper arms': null,
      'upper legs': null, 'lower legs': 'calves', 'waist': 'core', 'neck': null,
      'cardio': null, 'biceps': 'biceps', 'triceps': 'triceps',
      'quads': 'quads', 'glutes': 'glutes', 'hamstrings': 'hamstrings', 'calves': 'calves',
      'abs': 'core', 'forearms': null, 'lats': 'back', 'traps': 'back'
    };
    if(dbMap[primary]) matched.push(dbMap[primary]);
    if(dbMap[bodyPart] && !matched.includes(dbMap[bodyPart])) matched.push(dbMap[bodyPart]);
    if(matched.length) return matched;
  }
  
  // Fallback: keyword matching on the name
  const lc = (exName || '').toLowerCase();
  const matched = [];
  Object.keys(MUSCLE_KEYWORDS).forEach(group => {
    const kws = MUSCLE_KEYWORDS[group];
    if(kws.some(kw => lc.includes(kw))){
      if(!matched.includes(group)) matched.push(group);
    }
  });
  return matched.length ? matched : ['other'];
}

// Compute weekly volume (last 7 days) per muscle group.
// Volume = sum of (weight × reps) for all completed sets attributed to that muscle.
// ── MUSCLE MAP (volume heatmap on a body silhouette, last 7 days) ──
// THE TWO LABELS IN HERE ARE DIAGRAM LABELS, NOT CHART ANNOTATIONS, AND ARE LEFT AT 10px ON
// PURPOSE. The repo has twice decided that a CHART's own point labels are 12px (#weight-chart
// text "12, not 10", then #nut-trend-chart text), and the seven labels in
// renderExerciseProgressChart and showExerciseProgress were raised to match. FRONT/BACK sit on a
// fixed-viewBox body diagram where a wider run can collide with the artwork, and nothing has
// measured that — craft-audit reports 0 runs under 13px on Train only because its seed never
// reaches this card, the same blind spot the nutrition trend chart had. An unmeasured change to
// a third role would be the blanket sweep this repo fails builds over, so it is named here
// rather than made.
function renderMuscleHeatmap(){
  const box = document.getElementById('pt-heatmap'); if(!box) return;
  let vol = {}; try{ vol = computeWeeklyVolumeByMuscle() || {}; }catch(_){ return; }
  const get = (...keys) => keys.reduce((a,k)=>a+(vol[k]||0),0);
  const R = {
    chest: get('chest'), back: get('back','lats','upper back','lower back'),
    shoulders: get('shoulders','delts'), biceps: get('upper arms','arms','biceps'),
    triceps: get('upper arms','arms','triceps'), forearms: get('lower arms','forearms'),
    abs: get('waist','core','abs'), quads: get('upper legs','legs','quadriceps','quads'),
    hams: get('upper legs','legs','hamstrings'), glutes: get('glutes','hips'),
    calves: get('lower legs','calves')
  };
  const max = Math.max(1, ...Object.values(R));
  const c = r => R[r] > 0 ? 'rgba(200,169,110,' + (0.18 + 0.82 * R[r] / max).toFixed(2) + ')' : 'rgba(255,255,255,0.05)';
  const st = r => 'fill="' + c(r) + '" stroke="rgba(255,255,255,0.10)" stroke-width="1"';
  const front =
    '<svg aria-hidden="true" viewBox="0 0 120 250" style="width:46%;max-width:130px">'+
    '<circle cx="60" cy="18" r="13" fill="rgba(255,255,255,0.06)"/>'+
    '<rect x="40" y="36" width="40" height="10" rx="4" '+st('shoulders')+'/>'+
    '<rect x="42" y="48" width="36" height="26" rx="6" '+st('chest')+'/>'+
    '<rect x="44" y="76" width="32" height="32" rx="6" '+st('abs')+'/>'+
    '<rect x="27" y="48" width="12" height="30" rx="5" '+st('biceps')+'/>'+
    '<rect x="81" y="48" width="12" height="30" rx="5" '+st('biceps')+'/>'+
    '<rect x="27" y="80" width="11" height="26" rx="5" '+st('forearms')+'/>'+
    '<rect x="82" y="80" width="11" height="26" rx="5" '+st('forearms')+'/>'+
    '<rect x="43" y="112" width="15" height="50" rx="6" '+st('quads')+'/>'+
    '<rect x="62" y="112" width="15" height="50" rx="6" '+st('quads')+'/>'+
    '<rect x="44" y="166" width="13" height="38" rx="5" '+st('calves')+'/>'+
    '<rect x="63" y="166" width="13" height="38" rx="5" '+st('calves')+'/>'+
    '<text x="60" y="232" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.35)" style="font-family:var(--font-rounded)">FRONT</text></svg>';
  const back =
    '<svg aria-hidden="true" viewBox="0 0 120 250" style="width:46%;max-width:130px">'+
    '<circle cx="60" cy="18" r="13" fill="rgba(255,255,255,0.06)"/>'+
    '<rect x="40" y="36" width="40" height="10" rx="4" '+st('shoulders')+'/>'+
    '<rect x="42" y="48" width="36" height="60" rx="6" '+st('back')+'/>'+
    '<rect x="27" y="48" width="12" height="30" rx="5" '+st('triceps')+'/>'+
    '<rect x="81" y="48" width="12" height="30" rx="5" '+st('triceps')+'/>'+
    '<rect x="27" y="80" width="11" height="26" rx="5" '+st('forearms')+'/>'+
    '<rect x="82" y="80" width="11" height="26" rx="5" '+st('forearms')+'/>'+
    '<rect x="42" y="110" width="36" height="18" rx="7" '+st('glutes')+'/>'+
    '<rect x="43" y="130" width="15" height="34" rx="6" '+st('hams')+'/>'+
    '<rect x="62" y="130" width="15" height="34" rx="6" '+st('hams')+'/>'+
    '<rect x="44" y="166" width="13" height="38" rx="5" '+st('calves')+'/>'+
    '<rect x="63" y="166" width="13" height="38" rx="5" '+st('calves')+'/>'+
    '<text x="60" y="232" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.35)" style="font-family:var(--font-rounded)">BACK</text></svg>';
  box.innerHTML = '<div class="card tr-map-card"><div class="card-hd">Muscle map &middot; last 7 days</div>'+
    '<div class="tr-note tr-map-note">Brighter gold = more sets this week. Dark = untouched.</div>'+
    // AN ALWAYS-DARK PANEL, the way .breath-overlay already does it. This diagram is built entirely
    // out of white-on-dark alphas — untouched muscles are rgba(255,255,255,0.05) and the card's own
    // caption says "Dark = untouched" — so on the light theme the whole body went invisible on cream
    // and the sentence explaining it described shapes nobody could see. Converting just the labels to
    // a token would have left that caption lying. Giving the figure its own ground makes the fixed
    // ink correct rather than merely overlooked, which is the rule this codebase already states:
    // fixed ink only on always-dark surfaces, tokens on themed ones.
    '<div style="display:flex;justify-content:center;gap:14px;background:#14141a;border:1px solid rgba(255,255,255,0.06);border-radius:var(--rm);padding:10px 6px">'+front+back+'</div>'+
    _renderSetsPerMuscle() + '</div>';
}
// WS3: weekly sets per muscle vs the 10–20 sets/week growth target + balance warnings.
function _renderSetsPerMuscle(){
  try{
    const sets = computeWeeklySetsByMuscle();
    const groups = ['chest','back','shoulders','biceps','triceps','quads','hamstrings','glutes','calves','core'];
    const labels = {chest:'Chest',back:'Back',shoulders:'Shoulders',biceps:'Biceps',triceps:'Triceps',quads:'Quads',hamstrings:'Hamstrings',glutes:'Glutes',calves:'Calves',core:'Core'};
    const trained = groups.filter(g => (sets[g]||0) > 0);
    if(!trained.length) return '';
    // sets vs target: 10–20 ideal. <10 under, 10–20 in range, >20 high.
    let rows = trained.map(g => {
      const n = sets[g] || 0;
      const status = n < 10 ? 'under' : (n <= 20 ? 'in' : 'high');
      const col = status==='in' ? 'var(--gr)' : (status==='under' ? 'var(--tx3)' : 'var(--go)');
      const tag = status==='in' ? 'in range' : (status==='under' ? 'build up' : 'high');
      const pct = Math.min(100, (n/20)*100);
      // A 13px label beside a 12px tag — one pixel apart, same row, same ink. One size.
      return '<div class="tr-sets-row">'+
        '<div class="tr-sets-top"><span class="tr-sets-name">'+labels[g]+'</span><span class="tr-sets-tag" style="color:'+col+'">'+plural(n,'set')+' \u00b7 '+tag+'</span></div>'+
        '<div class="tr-sets-track"><div class="tr-sets-fill" style="width:'+pct+'%;background:'+col+'"></div></div>'+
        '</div>';
    }).join('');
    let warnHtml = '';
    const warns = muscleBalanceWarnings();
    if(warns.length){
      warnHtml = warns.map(w => '<div class="tr-balance">'+svgIcon("scale",15)+' '+w+'</div>').join('');
    }
    return '<div class="tr-sets-block">'+
      '<div class="tr-vol-hd">Weekly sets \u00b7 target 10\u201320</div>'+
      rows + warnHtml + '</div>';
  }catch(e){ return ''; }
}
// WS4: weekly training-load across modalities + today's interference note.
function renderTrainingLoad(){
  const box = document.getElementById('pt-load-card');
  if(!box) return;
  try{
    const load = (typeof weeklyLoadByModality==='function') ? weeklyLoadByModality() : {};
    const mods = Object.keys(load);
    const intf = (typeof interferenceNote==='function') ? interferenceNote() : null;
    if(!mods.length && !intf){ box.innerHTML = ''; return; }
    // [icon name, label]. A null icon means the icon set has no honest mark for that modality
    // (rowing, "other") \u2014 the label stands alone rather than borrowing a mark that means
    // something else. svgIcon('') returns '', so a wrong name would silently print nothing.
    const labels = {strength:['dumbbell','Strength'],run:['run','Running'],cycle:['bike','Cycling'],row:[null,'Rowing'],swim:['swim','Swim'],walk:['walk','Walk'],conditioning:['flame','Conditioning'],cardio:['heart','Cardio'],other:[null,'Other']};
    let rows = mods.map(m => {
      const d = load[m];
      const meta = [d.sessions + ' session' + (d.sessions===1?'':'s'), d.minutes?d.minutes+' min':null, d.avgEffort?('avg RPE '+d.avgEffort):null].filter(Boolean).join(' \u00b7 ');
      const lb = labels[m];
      const lbHtml = lb ? ((lb[0] ? '<span style="color:var(--go)">'+svgIcon(lb[0],14)+'</span> ' : '') + lb[1]) : m;
      return '<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;font-size:var(--t-sm)"><span style="color:var(--tx2)">' + lbHtml + '</span><span style="color:var(--tx3);font-family:var(--font-text);font-size:var(--t-mini)">' + meta + '</span></div>';
    }).join('');
    const intfHtml = intf ? '<div style="margin-top:10px;padding:10px 12px;background:rgba(140,107,182,0.08);border-radius:var(--rs);font-size:var(--t-sm);color:var(--tx2);line-height:1.5">'+svgIcon("zap")+' ' + intf + '</div>' : '';
    box.innerHTML = '<div class="card" style="margin-top:8px"><div class="card-hd" style="margin-bottom:4px">Training mix \u00b7 last 7 days</div>'+
      (mods.length>1?'<div style="font-size:var(--t-cap);color:var(--tx3);margin-bottom:8px">How your week balances across training types.</div>':'')+
      rows + intfHtml + '</div>';
  }catch(e){ box.innerHTML = ''; }
}

// WS3: weekly WORKING SETS per muscle group (the metric the 10–20 sets/week science target uses).
function computeWeeklySetsByMuscle(){
  const history = ls('totry_workouts') || [];
  const weekAgo = Date.now() - 7 * 86400000;
  const bySets = {};
  history.forEach(session => {
    const sessTs = session.ts ? new Date(session.ts).getTime() : 0;
    if(sessTs < weekAgo) return;
    (session.exercises || []).forEach(ex => {
      const groups = classifyExerciseMuscles(ex.name, ex);
      // Count working sets (exclude warmups; require reps).
      const workingSets = (ex.sets || []).filter(s => !(s.type && /warm/i.test(s.type)) && (parseInt(s.reps) > 0)).length;
      if(workingSets <= 0) return;
      groups.forEach(g => { bySets[g] = (bySets[g] || 0) + workingSets; });
    });
  });
  return bySets;
}
// WS3: muscle-balance check. Returns array of human-readable warnings (push vs pull, quads vs hams).
function muscleBalanceWarnings(){
  const sets = computeWeeklySetsByMuscle();
  const warnings = [];
  const sum = (arr) => arr.reduce((a,g)=>a+(sets[g]||0),0);
  const push = sum(['chest','shoulders','triceps']);
  const pull = sum(['back','biceps']);
  if(push >= 6 && push > Math.max(pull, 0.5) * 1.8){
    warnings.push('Your push volume (' + push + ' sets) is well above your pull (' + pull + '). Add back/biceps work to protect your shoulders and posture.');
  } else if(pull >= 6 && pull > Math.max(push, 0.5) * 1.8){
    warnings.push('Your pull volume (' + pull + ' sets) is well above your push (' + push + '). Balance it with chest/shoulder work.');
  }
  const quads = sets['quads']||0, hams = sets['hamstrings']||0;
  if(quads >= 6 && quads > Math.max(hams, 0.5) * 2){
    warnings.push('Quads (' + quads + ' sets) are getting a lot more than hamstrings (' + hams + '). More hamstring/posterior work lowers injury risk.');
  }
  return warnings;
}

function computeWeeklyVolumeByMuscle(){
  const history = ls('totry_workouts') || [];
  const weekAgo = Date.now() - 7 * 86400000;
  const byGroup = {};
  
  history.forEach(session => {
    const sessTs = session.ts ? new Date(session.ts).getTime() : 0;
    if(sessTs < weekAgo) return;
    
    (session.exercises || []).forEach(ex => {
      const groups = classifyExerciseMuscles(ex.name, ex);
      // Use the honest effective-load model so assisted (negative) and bodyweight movements
      // contribute correctly, not as negative or zero. Filter to completed sets first.
      const doneEx = {...ex, sets: (ex.sets||[]).filter(s => s.done && s.reps)};
      const exVolume = (typeof exerciseVolume==='function')
        ? exerciseVolume(doneEx)
        : (ex.sets||[]).filter(s=>s.done&&parseFloat(s.weight)>0&&s.reps).reduce((sum,s)=>sum+(parseFloat(s.weight)*parseInt(s.reps)),0);
      if(exVolume <= 0) return;
      
      // If exercise hits multiple groups, attribute full volume to each
      // (could split but full attribution is standard in lifting analytics)
      groups.forEach(g => { byGroup[g] = (byGroup[g] || 0) + exVolume; });
    });
  });
  
  return byGroup;
}

// Days since each major muscle group was last hit
function computeBodyPartFrequency(){
  const history = ls('totry_workouts') || [];
  const now = Date.now();
  const lastHit = {};
  
  history.forEach(session => {
    const sessTs = session.ts ? new Date(session.ts).getTime() : 0;
    if(!sessTs) return;
    (session.exercises || []).forEach(ex => {
      const groups = classifyExerciseMuscles(ex.name, ex);
      // Only count if at least one set was completed
      const hasCompletedSet = (ex.sets || []).some(s => s.done);
      if(!hasCompletedSet) return;
      groups.forEach(g => {
        if(!lastHit[g] || sessTs > lastHit[g]) lastHit[g] = sessTs;
      });
    });
  });
  
  // Convert to days-ago
  const out = {};
  Object.keys(lastHit).forEach(g => {
    out[g] = Math.floor((now - lastHit[g]) / 86400000);
  });
  return out;
}

// Math.round(v/1000)+'k' printed "0k kg" for every real session under 500kg per muscle group —
// beside a full-width bar, and directly under a session row correctly reading "288kg vol". The same
// screen said 288 and 0. It also flattened everything between: 3,715kg read "4k". Under a tonne,
// say the kilos; over it, keep one decimal so 3,715 is 3.7t rather than 4.
function _volLabel(v){
  const n = Math.round(Number(v) || 0);
  if(n < 1000) return n + ' kg';
  return (n / 1000).toFixed(1).replace(/\.0$/, '') + 't';
}
function renderMuscleGroupCard(){
  const container = document.getElementById('pt-muscle-card');
  if(typeof renderMuscleHeatmap==='function') renderMuscleHeatmap();
  if(typeof renderTrainingLoad==='function') renderTrainingLoad();
  if(!container) return;
  
  const volumes = computeWeeklyVolumeByMuscle();
  const freq = computeBodyPartFrequency();
  
  const groups = ['chest','back','shoulders','biceps','triceps','quads','hamstrings','glutes','calves','core'];
  const groupLabels = {
    chest: 'Chest', back: 'Back', shoulders: 'Shoulders',
    biceps: 'Biceps', triceps: 'Triceps',
    quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
    calves: 'Calves', core: 'Core'
  };
  
  const totalVol = Object.values(volumes).reduce((s,v) => s+v, 0);
  
  if(totalVol === 0){
    container.innerHTML = '<div class="tr-quiet">Log some workouts to see your weekly volume + frequency.</div>';
    return;
  }
  
  // Volume bars
  const maxVol = Math.max(...Object.values(volumes));
  const volumeRows = groups
    .filter(g => volumes[g] > 0)
    .sort((a,b) => volumes[b] - volumes[a])
    .map(g => {
      const v = volumes[g];
      const pct = maxVol > 0 ? Math.round((v / maxVol) * 100) : 0;
      const days = freq[g];
      // Four cells at three sizes — 13px label, 13px volume, 12px freshness — plus a bar. Volume is
      // a NUMBER, so it is set in the rounded face with tabular figures like every other metric in
      // the app, and the freshness is the same footnote size as its neighbours.
      const tone = days <= 3 ? 'fresh' : days <= 7 ? 'due' : 'cold';
      const freqLabel = days === 0 ? 'today' : days === 1 ? 'yesterday' : days + 'd ago';

      return '<div class="tr-vol-row">' +
        '<div class="tr-vol-name">' + groupLabels[g] + '</div>' +
        '<div class="tr-vol-track"><div class="tr-vol-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="tr-vol-val">' + _volLabel(v) + '</div>' +
        '<div class="tr-vol-age ' + tone + '">' + freqLabel + '</div>' +
      '</div>';
    }).join('');
  
  // Groups NOT hit this week (warning)
  const notHitThisWeek = groups.filter(g => !volumes[g] || volumes[g] === 0);
  const neglected = notHitThisWeek.length ? notHitThisWeek.map(g => groupLabels[g]).join(', ') : null;
  
  // The definition of "volume" was set in ITALIC SERIF and centred — the reading face used for a
  // technical footnote — and the warning sat on a hardcoded rgba red no theme could follow.
  container.innerHTML =
    '<div class="tr-vol-hd">Weekly volume \u00b7 last hit</div>' +
    volumeRows +
    (neglected ?
      '<div class="tr-warn"><b>Not trained this week:</b> ' + neglected + '</div>' : '') +
    '<div class="tr-note">Volume = weight \u00d7 reps for completed sets. Volume per group hit by multi-joint lifts counts once per primary muscle.</div>';
}

// ── STARTER ROUTINE TEMPLATES ────────────────────────────────
// Curated, proven splits with full exercise breakdowns. One-tap import.
const STARTER_TEMPLATES = [
  {
    name: 'Push / Pull / Legs (6 days)',
    description: 'Classic 6-day split. High volume. Each muscle hit twice/week. Best for intermediate lifters.',
    // week: 7 entries Mon→Sun. Number = index into days[]. null = rest day.
    week: [0, 1, 2, 3, 4, 5, null],
    days: [
      {focus: 'Push (chest, shoulders, triceps)', exercises: ['Bench press','Overhead press','Incline dumbbell press','Lateral raise','Triceps pushdown','Overhead triceps extension']},
      {focus: 'Pull (back, biceps, rear delts)', exercises: ['Deadlift','Pull-up','Barbell row','Face pull','Barbell curl','Hammer curl']},
      {focus: 'Legs (quads, hamstrings, glutes, calves)', exercises: ['Squat','Romanian deadlift','Leg press','Leg curl','Walking lunge','Standing calf raise']},
      {focus: 'Push (chest, shoulders, triceps)', exercises: ['Incline barbell press','Dumbbell shoulder press','Cable fly','Cable lateral raise','Skullcrusher','Diamond push-up']},
      {focus: 'Pull (back, biceps, rear delts)', exercises: ['Pull-up','Seated cable row','T-bar row','Reverse pec deck','Preacher curl','Cable curl']},
      {focus: 'Legs (quads, hamstrings, glutes, calves)', exercises: ['Front squat','Stiff-leg deadlift','Bulgarian split squat','Leg extension','Hip thrust','Seated calf raise']}
    ]
  },
  {
    name: 'Upper / Lower (4 days)',
    description: 'Balanced 4-day split. Sustainable. Great for busy schedules. Each muscle hit twice/week.',
    week: [0, 1, null, 2, 3, null, null],
    days: [
      {focus: 'Upper body strength', exercises: ['Bench press','Barbell row','Overhead press','Pull-up','Barbell curl','Triceps pushdown']},
      {focus: 'Lower body strength', exercises: ['Squat','Romanian deadlift','Leg press','Leg curl','Standing calf raise','Plank']},
      {focus: 'Upper body hypertrophy', exercises: ['Incline dumbbell press','Seated cable row','Dumbbell shoulder press','Lateral raise','Hammer curl','Skullcrusher']},
      {focus: 'Lower body hypertrophy', exercises: ['Front squat','Stiff-leg deadlift','Walking lunge','Hip thrust','Leg extension','Seated calf raise']}
    ]
  },
  {
    name: 'Full Body (3 days)',
    description: 'Beginner-friendly. Each session hits everything. Best for starting out or busy weeks.',
    week: [0, null, 1, null, 2, null, null],
    days: [
      {focus: 'Full body A', exercises: ['Squat','Bench press','Barbell row','Overhead press','Plank']},
      {focus: 'Full body B', exercises: ['Deadlift','Incline press','Pull-up','Lateral raise','Dumbbell curl']},
      {focus: 'Full body C', exercises: ['Front squat','Dumbbell bench press','Seated cable row','Dumbbell shoulder press','Triceps pushdown']}
    ]
  },
  {
    name: '5/3/1 Boring But Big (4 days)',
    description: 'Jim Wendler\'s strength program. Main lift heavy + 5 sets of 10 same lift. Brutal but proven.',
    week: [0, 1, null, 2, 3, null, null],
    days: [
      {focus: 'Press day', exercises: ['Overhead press 5/3/1','Overhead press 5×10','Chin-up','Triceps pushdown']},
      {focus: 'Deadlift day', exercises: ['Deadlift 5/3/1','Deadlift 5×10','Hanging leg raise','Plank']},
      {focus: 'Bench day', exercises: ['Bench press 5/3/1','Bench press 5×10','Dumbbell row','Hammer curl']},
      {focus: 'Squat day', exercises: ['Squat 5/3/1','Squat 5×10','Leg curl','Standing calf raise']}
    ]
  },
  {
    name: 'StrongLifts 5×5 (3 days)',
    description: 'Compound strength program for beginners. Add 2.5kg every session. Linear progress.',
    week: [0, null, 1, null, 2, null, null],
    days: [
      {focus: 'Workout A', exercises: ['Squat 5×5','Bench press 5×5','Barbell row 5×5']},
      {focus: 'Workout B', exercises: ['Squat 5×5','Overhead press 5×5','Deadlift 1×5']},
      {focus: 'Workout A', exercises: ['Squat 5×5','Bench press 5×5','Barbell row 5×5']}
    ]
  },
  {
    name: 'Bro Split (5 days)',
    description: 'Classic bodybuilding split. One muscle per day. High frequency for vanity muscles.',
    week: [0, 1, 2, 3, 4, null, null],
    days: [
      {focus: 'Chest', exercises: ['Bench press','Incline dumbbell press','Cable fly','Push-up','Dips']},
      {focus: 'Back', exercises: ['Deadlift','Pull-up','Barbell row','Lat pulldown','Face pull','Shrug']},
      {focus: 'Shoulders', exercises: ['Overhead press','Lateral raise','Rear delt fly','Front raise','Upright row']},
      {focus: 'Arms (biceps + triceps)', exercises: ['Barbell curl','Hammer curl','Preacher curl','Skullcrusher','Triceps pushdown','Diamond push-up']},
      {focus: 'Legs', exercises: ['Squat','Romanian deadlift','Leg press','Leg extension','Leg curl','Standing calf raise']}
    ]
  }
];

function openRoutineTemplates(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  let cards = '';
  STARTER_TEMPLATES.forEach((t, i) => {
    cards += '<div style="background:var(--bg3);border-radius:var(--rm);padding:14px;margin-bottom:10px;cursor:pointer" onclick="previewTemplate(' + i + ')">' +
      '<div style="font-size:var(--t-base);color:var(--tx);margin-bottom:4px">' + t.name + '</div>' +
      '<div style="font-size:var(--t-cap);color:var(--tx3);line-height:1.5">' + t.description + '</div>' +
      '<div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--go);margin-top:6px;text-transform:uppercase;letter-spacing:0.01em">' + t.days.length + ' day' + (t.days.length > 1 ? 's' : '') + ' · Tap to preview</div>' +
    '</div>';
  });
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:6px">Starter templates</h3>' +
    '<p style="font-size:var(--t-sm);color:var(--tx3);margin-bottom:14px">Proven routines used by lifters worldwide. Pick one to import as your weekly split.</p>' +
    cards +
    '<button class="btn" onclick="closeModal(this)">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}

function previewTemplate(idx){
  const t = STARTER_TEMPLATES[idx];
  if(!t) return;
  closeOpenSheets();
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  let daysHtml = '';
  t.days.forEach((d, i) => {
    daysHtml += '<div style="background:var(--bg3);border-radius:var(--rm);padding:12px;margin-bottom:8px">' +
      '<div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--go);text-transform:uppercase;letter-spacing:0.01em;margin-bottom:4px">Day ' + (i+1) + ' · ' + d.focus + '</div>' +
      '<div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.7">' + d.exercises.map(e => '• ' + e).join('<br>') + '</div>' +
    '</div>';
  });
  m.innerHTML = '<div class="modal" style="max-height:90vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:4px">' + t.name + '</h3>' +
    '<p style="font-size:var(--t-sm);color:var(--tx3);margin-bottom:14px;line-height:1.5">' + t.description + '</p>' +
    daysHtml +
    '<button class="btn primary" onclick="importTemplate(' + idx + ')" style="margin-bottom:8px">Import as my split</button>' +
    '<button class="btn" onclick="closeModal(this)">Back</button>' +
  '</div>';
  document.body.appendChild(m);
}

function importTemplate(idx){
  const t = STARTER_TEMPLATES[idx];
  if(!t) return;
  
  // Remove any routines previously imported from a template so splits don't STACK.
  // Keep the user's own hand-built routines (those without fromTemplate).
  const existingRoutines = (ls('totry_routines') || []).filter(r => !r.fromTemplate);
  const newRoutines = t.days.map((d, i) => ({
    id: Date.now() + i,
    name: d.focus,
    focus: d.focus,
    exercises: d.exercises.map(name => ({
      name: name,
      sets: [{weight:'', reps:'', type:'normal', done:false}, {weight:'', reps:'', type:'normal', done:false}, {weight:'', reps:'', type:'normal', done:false}],
      bodyPart: '',
      equipment: ''
    })),
    createdAt: new Date().toISOString(),
    fromTemplate: t.name
  }));
  ls('totry_routines', [...existingRoutines, ...newRoutines]);
  
  // Build the full 7-day week from the template's explicit schedule.
  // Every day is populated: a training day (with focus + exercises) OR an explicit Rest day.
  // This means the user always sees all 7 days laid out, with the training/rest rhythm clear.
  const weekSchedule = t.week || t.days.map((_, i) => i); // fallback: sequential
  const split = [];
  for(let dayIdx = 0; dayIdx < 7; dayIdx++){
    const sessionIdx = weekSchedule[dayIdx];
    if(sessionIdx === null || sessionIdx === undefined || !t.days[sessionIdx]){
      split.push({focus: 'Rest day', detail: 'Recovery. Rest is part of the program.', exercises: [], rest: true});
    } else {
      const d = t.days[sessionIdx];
      split.push({focus: d.focus, detail: 'Template: ' + t.name, exercises: d.exercises, rest: false});
    }
  }
  ls('totry_split', split);
  
  closeOpenSheets();
  showToast('Template imported', t.name + ' — your full week is set.');
  haptic('celebrate');
  
  if(typeof renderRoutines === 'function') renderRoutines();
  if(typeof renderSplitOverview === 'function') renderSplitOverview();
  if(typeof loadTodaySplitCard === 'function') loadTodaySplitCard();
}
function renderPersonalRecords(){
  const prs=ls('totry_prs')||{};const container=document.getElementById('pt-pr-list');if(!container)return;
  const keys=Object.keys(prs);
  // A centred 15px tertiary paragraph floating with no container was the "nothing here" state.
  if(!keys.length){container.className='';container.innerHTML='<div class="ios-empty">'+svgIcon('trophy',44)+'<div class="ios-empty-title">No records yet</div><div class="ios-empty-body">Log workouts to track personal records.</div></div>';return;}
  container.className='ios-list';
  container.innerHTML='';
  keys.sort().forEach(name=>{
    const pr=prs[name];
    const card=document.createElement('div');
    card.className='pr-card';
    card.style.cursor = 'pointer';
    card.title = 'Tap to see progress chart';
    // "Tap to chart" was an 11px tint line under every single row — 11px, and the same instruction
    // repeated as many times as you have records. The row is tappable; a chevron says so once.
    card.innerHTML='<div class="tr-pr-l"><div class="pr-ex">'+_escFew(name)+'</div><div class="pr-date">est. 1RM '+pr.orm+'kg \u00b7 '+pr.date+'</div></div>'+
      '<div class="tr-pr-r"><div class="pr-val">'+pr.weight+'kg \u00d7 '+pr.reps+'</div></div>'+
      '<span class="ios-row-chevron">'+svgIcon('chevronright',14)+'</span>';
    card.onclick = () => showExerciseProgress(name);
    container.appendChild(card);
  });
}

// Show a weight-progression chart for a single exercise across all logged sessions.
function showExerciseProgress(exName){
  const history = ls('totry_workouts') || [];
  const dataPoints = [];
  
  // Walk history newest-first; build a list of {date, maxWeight, est1RM, volume}
  history.slice().reverse().forEach(session => {
    const ex = session.exercises?.find(e => e.name === exName);
    if(!ex || !ex.sets?.length) return;
    let maxW = 0, est1RM = 0, vol = 0, bestReps = 0;
    ex.sets.forEach(s => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps) || 0;
      if(w > 0 && r > 0 && s.done !== false){
        vol += w * r;
        if(w > maxW){ maxW = w; bestReps = r; }
        // estE1RM, not Epley written out again — it special-cases a single, so the curve and the PR
        // list agree with the number that was actually recorded.
        const e1 = estE1RM(w, r);
        if(e1 > est1RM) est1RM = e1;
      }
    });
    if(maxW > 0){
      dataPoints.push({
        date: session.date,
        ts: session.ts || new Date(session.date).toISOString(),
        maxW: maxW,
        bestReps: bestReps,
        est1RM: Math.round(est1RM),
        vol: Math.round(vol)
      });
    }
  });
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  
  if(!dataPoints.length){
    m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
      '<h3 style="margin-bottom:8px">' + _escFew(exName) + '</h3>' +
      '<p class="empty-note">No logged sessions for this exercise yet.</p>' +
      '<button class="btn" onclick="closeModal(this)">Close</button>' +
    '</div>';
    document.body.appendChild(m);
    return;
  }
  
  // Build a simple inline SVG chart
  const w = 320, h = 140, padL = 30, padR = 8, padT = 10, padB = 22;
  const maxOrm = Math.max(...dataPoints.map(d => d.est1RM));
  const minOrm = Math.min(...dataPoints.map(d => d.est1RM));
  const range = Math.max(1, maxOrm - minOrm);
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  
  let pathData = '';
  let points = '';
  dataPoints.forEach((d, i) => {
    const x = padL + (dataPoints.length === 1 ? chartW/2 : (i / (dataPoints.length - 1)) * chartW);
    const y = padT + chartH - ((d.est1RM - minOrm) / range) * chartH;
    pathData += (i === 0 ? 'M' : 'L') + x + ',' + y + ' ';
    points += '<circle cx="' + x + '" cy="' + y + '" r="3" fill="var(--go)" stroke="var(--bg2)" stroke-width="1"/>';
  });
  
  const svg = '<svg aria-hidden="true" viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;background:var(--bg3);border-radius:var(--rs)">' +
    '<text x="4" y="14" style="font-family:var(--font-rounded)" font-size="12" fill="var(--tx3)">' + maxOrm + 'kg</text>' +
    '<text x="4" y="' + (h - 26) + '" style="font-family:var(--font-rounded)" font-size="12" fill="var(--tx3)">' + minOrm + 'kg</text>' +
    '<path d="' + pathData + '" stroke="var(--go)" stroke-width="2" fill="none"/>' +
    points +
    '<text x="' + padL + '" y="' + (h - 6) + '" style="font-family:var(--font-rounded)" font-size="12" fill="var(--tx3)">' + dataPoints[0].date.replace(/^.+?, /, '') + '</text>' +
    '<text x="' + (w - padR - 50) + '" y="' + (h - 6) + '" style="font-family:var(--font-rounded)" font-size="12" fill="var(--tx3)">' + dataPoints[dataPoints.length-1].date.replace(/^.+?, /, '') + '</text>' +
  '</svg>';
  
  // Last 5 sessions table
  const recent = dataPoints.slice(-5).reverse();
  let tableHtml = '<div style="margin-top:14px"><div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--tx3);text-transform:uppercase;letter-spacing:0.01em;margin-bottom:6px">Recent sessions</div>';
  recent.forEach(d => {
    tableHtml += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd);font-size:var(--t-sm)">' +
      '<span style="color:var(--tx2)">' + d.date + '</span>' +
      '<span style="font-family:var(--font-text);color:var(--tx)">' + d.maxW + 'kg × ' + d.bestReps + ' · 1RM ' + d.est1RM + 'kg</span>' +
    '</div>';
  });
  tableHtml += '</div>';
  
  // Progress stat
  const first = dataPoints[0];
  const last = dataPoints[dataPoints.length - 1];
  const progressKg = last.est1RM - first.est1RM;
  const progressPct = first.est1RM > 0 ? Math.round((progressKg / first.est1RM) * 100) : 0;
  const progressLine = dataPoints.length > 1 ?
    '<div style="text-align:center;background:var(--bg3);border:1px solid ' + (progressKg >= 0 ? 'var(--gr-bd)' : 'var(--re-bd)') + ';border-radius:var(--rs);padding:10px;margin-bottom:12px">' +
      '<div style="font-family:var(--font-text);font-size:var(--t-micro);color:var(--tx3);text-transform:uppercase;letter-spacing:0.01em">Progress since first session</div>' +
      '<div style="font-size:var(--t-hd);color:' + (progressKg >= 0 ? 'var(--gr)' : 'var(--re)') + ';margin-top:2px">' + (progressKg >= 0 ? '+' : '') + progressKg + 'kg (' + (progressPct >= 0 ? '+' : '') + progressPct + '%)</div>' +
    '</div>' : '';
  
  m.innerHTML = '<div class="modal" style="max-height:90vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:4px">' + _escFew(exName) + '</h3>' +
    '<p style="font-size:var(--t-cap);color:var(--tx3);margin-bottom:12px">Estimated 1RM (Epley formula) over time</p>' +
    progressLine +
    svg +
    tableHtml +
    '<button class="btn" onclick="closeModal(this)" style="margin-top:14px">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}
// CACHED, AND IT WAS NOT. initPTTab() calls this on EVERY Train tab open, and it went straight to the
// model with no cache and no tried-marker — measured as roughly a quarter of a median person's whole
// AI volume, for a line of text nobody asked for. Every other automatic call in this app is already
// guarded: showAIMorningSentence caches under a day key AND sets a tried-marker so a failure does not
// re-fire (25-soul.js), generateWeeklySynthesis gates on a week key plus __synthesisAttempted
// (24-review.js), generateAIPushMessages is at-most-weekly (28-init.js). This was the outlier.
//
// That matters more than it sounds: every free tier in the chain is metered PER PROJECT — the app's
// key, not the person's — so the whole app shares roughly 500 free calls a day. An unguarded
// automatic call is not one person's cost, it is everyone's ceiling.
//
// The key is the local date built from PARTS plus the number of logged sessions, so it refreshes the
// moment a workout is logged and never otherwise. Built from parts deliberately: this app's day key
// is a locale formatter that two engines spell differently (docs/DAY-KEY.md), and a cache must not
// inherit that. One row, not one per day, so nothing accumulates.
function _ptSuggKey(){
  const d = new Date(), h = (ls('totry_workouts')||[]).length;
  return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2) + ':' + h;
}
async function getProgressiveSuggestion(){
  const history=ls('totry_workouts')||[];if(history.length<2)return;
  const _k = _ptSuggKey();
  const _el = () => document.getElementById('pt-today-split-detail');
  try{
    const c = ls('totry_ai_pt_sugg');
    if(c && c.k === _k && c.v){ const e=_el(); if(e) e.textContent = c.v; return; }
    // A failure must not re-fire on the next tab open either — the same reason the morning sentence
    // keeps a tried-marker. In-memory is enough: a fresh launch may reasonably try once more.
    if(window.__ptSuggTried === _k) return;
    window.__ptSuggTried = _k;
  }catch(_){ }
  const todayFocus=getUserSplit()[tIdx()]?.focus||'Workout';
  const recent=history.slice(0,3).map(s=>((s&&Array.isArray(s.exercises))?s.exercises:[]).map(ex=>(ex&&ex.name||'?')+': '+((ex&&Array.isArray(ex.sets))?ex.sets:[]).map(set=>(set&&set.weight!=null?set.weight:'?')+'kg\u00d7'+(set&&set.reps!=null?set.reps:'?')).join(', ')).join('; ')).join('\n');
  const suggestion=await api(buildPTCtx(),[],'Based on these recent sessions:\n'+recent+'\nToday is '+todayFocus+'. Give specific progressive overload targets — what weight and reps to aim for on the main lifts, with a sentence of why for each. Be concrete with numbers; a short paragraph is fine.',500);
  if(suggestion){const el=_el();if(el)el.textContent=suggestion;
    try{ ls('totry_ai_pt_sugg', { k:_k, v:suggestion }); }catch(_){ }}
}

// updateStravaBtn() removed: #strava-link-status is not in the shell, and it read 'strava_token'
// while the app writes 'totry_strava_token' — dead twice over. Connection state is shown by
// renderUnifiedTraining() in 21-content-engine.js, which reads the key the app actually writes.
function tryApp(e,sc,st){
  e.preventDefault();
  // Try the app's scheme. If the app opens, the page hides — cancel the store fallback.
  // If it doesn't open, open the store in a NEW tab (never navigate the PWA itself → white screen).
  let opened=false;
  const onHide=()=>{ opened=true; document.removeEventListener('visibilitychange',onHide); };
  document.addEventListener('visibilitychange',onHide);
  const f=document.createElement('iframe');f.style.display='none';f.src=sc;document.body.appendChild(f);
  setTimeout(()=>{ try{document.body.removeChild(f);}catch(_){}; document.removeEventListener('visibilitychange',onHide); if(!opened && !document.hidden){ window.open(st,'_blank'); } },1200);
}
function toggleCalPicker(){const p=document.getElementById('cal-picker');if(p)p.style.display=p.style.display==='none'?'block':'none';}
// DEAD STORE IDS, VERIFIED AGAINST APPLE'S LOOKUP API rather than against a curl status code — both
// a live and a dead apps.apple.com URL stop at a 301 to itms-apps://, so the status cannot tell them
// apart. `itunes.apple.com/lookup?id=…&country=au` returns resultCount 0 for a dead id, and
// MyFitnessPal's id is the control that proves the method.
//   6447167650 -> 0 (the id this picker shipped)   6480417616 -> "Cal AI - Calorie Tracker"
// The picker's row hardcoded its own copy of the id, which is why the registry's own "Removed: … Cal
// AI …" note at 34-settings-apps.js:21 never reached it — a half-applied removal.
const _DEAD_STORE_IDS = { '6447167650': '6480417616', '1388737828': '1458862350' };
function _repairStoreUrl(u){
  try{
    let out = String(u || '');
    Object.keys(_DEAD_STORE_IDS).forEach(function(bad){
      if(out.indexOf('id' + bad) >= 0) out = out.replace('id' + bad, 'id' + _DEAD_STORE_IDS[bad]);
    });
    return out;
  }catch(_){ return u; }
}
function setCalApp(n,ic,sc,st){
  // A wrong link here becomes a PERMANENT one: totry_ca is persisted and openLinkedCalApp() reuses
  // it every time, with no way to correct it short of picking a different app. So it is repaired on
  // the way in as well as in the markup.
  st = _repairStoreUrl(st);
  ls('totry_ca',{name:n,icon:ic,scheme:sc,store:st});
  const cn=document.getElementById('cal-name');
  const ci=document.getElementById('cal-icon');
  if(cn)cn.textContent=n;
  if(ci)ci.innerHTML=ic;
  const cp=document.getElementById('cal-picker');
  if(cp)cp.style.display='none';
  showToast('App linked',n+' is now your calorie tracker. Tap the row anytime to open it.');
  // Open the app immediately (try scheme, fallback to store)
  openLinkedCalApp();
}

function useToTryTracker(){
  // Make ToTry's own tracker behave exactly like picking an external app: it becomes the linked
  // tracker, the row shows it, and selecting it takes you straight into Nourish (where food + weight
  // tracking live together) — so users stay in-app instead of bouncing out to MyFitnessPal.
  ls('totry_ca',{name:'ToTry',icon:'&#x1F34E;',scheme:'totry-internal',store:''});
  const cn=document.getElementById('cal-name'); if(cn)cn.textContent='ToTry';
  const ci=document.getElementById('cal-icon'); if(ci)ci.innerHTML='&#x1F34E;';
  const cs=document.getElementById('cal-sub'); if(cs)cs.textContent='Calorie tracker · in-app';
  const cp=document.getElementById('cal-picker'); if(cp)cp.style.display='none';
  // renderCalAppPref() has never existed. The five lines directly above already set cal-name,
  // cal-icon, cal-sub and cal-picker by hand, which is the whole of what it would have done.
  showToast('Using ToTry','Food & weight tracking, all in one place.');
  // Go straight to Nourish, the same way picking an external app would open that app.
  if(typeof go==='function') go('nourish');
}

// AND REPAIR WHAT IS ALREADY STORED. Somebody who picked CalAI before this fix has the dead URL in
// totry_ca; without this they would keep opening an "app unavailable" page forever.
function _repairStoredCalApp(){
  try{
    const c = ls('totry_ca');
    if(c && c.store){ const fixed = _repairStoreUrl(c.store);
      if(fixed !== c.store){ c.store = fixed; ls('totry_ca', c); } }
  }catch(_){ }
}
function openLinkedCalApp(){
  _repairStoredCalApp();
  const ca=ls('totry_ca');
  if(!ca){toggleCalPicker();return;}
  // ToTry's own tracker → just go to Nourish in-app (no external app to launch).
  if(ca.scheme==='totry-internal' || ca.name==='ToTry'){ if(typeof go==='function') go('nourish'); return; }
  // Try the scheme; if the app opens (page hides) cancel the store fallback. Store opens in a
  // NEW tab so the PWA never navigates away to a white screen.
  let opened=false;
  const onHide=()=>{ opened=true; clearTimeout(fallback); document.removeEventListener('visibilitychange',onHide); };
  document.addEventListener('visibilitychange',onHide);
  const fallback=setTimeout(()=>{ document.removeEventListener('visibilitychange',onHide); if(!opened && !document.hidden && ca.store){ window.open(ca.store,'_blank'); } },1200);
  window.location.href=ca.scheme;
  // If user comes back, the timer fires opening the store
}

// Override the name row click to open the linked app instead of toggling
function smartCalAppClick(){
  const ca=ls('totry_ca');
  if(ca){
    // Don't trap the user — open it, but offer a long-press-free way to change it.
    openLinkedCalApp();
  } else {
    toggleCalPicker();
  }
}
// Explicitly change or remove the linked calorie app (reachable from the row's "Change" control
// and from Settings → Preferences). Fixes being locked into a wrong pick (e.g. CalAI).
function changeCalApp(){
  const cp=document.getElementById('cal-picker');
  if(cp){ cp.style.display='block'; cp.scrollIntoView&&cp.scrollIntoView({block:'center',behavior:'smooth'}); }
}

