// ── CALORIE BURN LEDGER — single source of truth ─────────────────────────────────────────────
// Every source writes ONLY its own per-day sub-ledger; reconcileBurns() rebuilds the aggregate
// totry_calorie_burns that the Nourish net-calorie math reads. This ends two double-counts:
//  (1) a session logged in-app was ALSO folded in by a recompute (counted twice), and
//  (2) Apple Watch "Move" (whole-day active energy that already INCLUDES your workouts) was ADDED
//      on top of the per-session estimates instead of superseding them.
// Sub-ledgers: totry_workout_burns_byday (strength + cardio from totry_workouts, not Strava),
// totry_strava_burns_byday, totry_watch_burns_byday. Rule/day: Watch Move supersedes (max), never stacks.
function _burnForWorkout(w){
  if(!w) return 0;
  const c = parseFloat(w.calories || w.totalCalories || w.activeCalories || 0) || 0;
  if(c > 0) return Math.round(c);                       // logged calories (typical cardio)
  const mins = w.durationMinutes || w.durationMin || 0; // strength: ~6 kcal/min honest estimate
  return mins ? Math.round(mins * 6) : 0;
}
// Rebuild the workout sub-ledger from totry_workouts (idempotent — no add/subtract bookkeeping).
function recomputeWorkoutBurns(){
  try{
    const byDay = {};
    const all = (ls('totry_workouts')||[]).filter(w => w && w.ts);
    // Directly-imported sessions (not Strava-derived) — used to spot the Hevy→Strava copies.
    const direct = all.filter(w => w.source !== 'strava' && w.via !== 'strava');
    all.forEach(w => {
      if(w.source === 'strava') return;                 // genuine Strava cardio counted via its own ledger
      // A Hevy session pushed to Strava and converted back (via:'strava') is the SAME session as its
      // direct Hevy import — count it once. Skip the copy only when a direct import overlaps in time.
      if(w.via === 'strava' && direct.some(d => d.id !== w.id && _sessionsOverlap(d.ts, w.ts, 90))) return;
      const cal = _burnForWorkout(w);
      if(cal <= 0) return;
      const dk = new Date(w.ts).toLocaleDateString('en-AU');
      byDay[dk] = (byDay[dk]||0) + cal;
    });
    ls('totry_workout_burns_byday', byDay);
  }catch(_){ }
  reconcileBurns();
}
// The single authority: aggregate = workout + Strava, with Watch Move superseding (not stacking).
function reconcileBurns(){
  try{
    const workout = ls('totry_workout_burns_byday') || {};
    const strava  = ls('totry_strava_burns_byday')  || {};
    const watch   = ls('totry_watch_burns_byday')   || {};
    const days = new Set([...Object.keys(workout), ...Object.keys(strava), ...Object.keys(watch)]);
    const out = {};
    days.forEach(dk => {
      const est  = (workout[dk]||0) + (strava[dk]||0); // per-session estimates for the day
      const move = watch[dk]||0;                         // whole-day active energy (already includes them)
      const val  = move > 0 ? Math.max(move, est) : est;
      if(val > 0) out[dk] = Math.round(val);
    });
    ls('totry_calorie_burns', out);
  }catch(_){ }
}
// Back-compat alias: the Hevy sync path still calls this; it now rebuilds the whole workout ledger.
function recomputeStrengthBurns(){ recomputeWorkoutBurns(); }
async function syncHevyWorkouts(){
  const key = ls('totry_hevy_api_key');
  if(!key) return;
  
  // First sync pulls full history (paginated); later syncs just grab the latest page.
  const fullHistory = !ls('totry_hevy_synced_once');
  const pageSize = 10;
  const maxPages = fullHistory ? 50 : 1; // up to ~500 workouts on first import
  
  try{
    const existing = ls('totry_workouts') || [];
    const existingHevyIds = new Set(existing.filter(w => w.hevyId).map(w => w.hevyId));
    let imported = 0;
    let page = 1;
    let keepGoing = true;
    
    while(keepGoing && page <= maxPages){
      let resp;
      try{
        resp = await hevyFetch('/v1/workouts?page=' + page + '&pageSize=' + pageSize, 'GET');
      }catch(e){
        console.warn('[hevy] sync via proxy failed', e);
        showToast('Hevy sync failed', 'Hevy error: ' + ((e && e.message) ? String(e.message).slice(0,90) : 'no detail') + '. Key saved — if this repeats, redeploy the ai-proxy function.');
        break;
      }
      if(!resp || !resp.ok){
        console.warn('[hevy] sync HTTP', resp && resp.status);
        if(resp && (resp.status === 401 || resp.status === 403)){
          showToast('Hevy key rejected', 'That API key isn\'t working. Re-check it at hevy.com/settings?developer (needs Hevy Pro).');
        } else {
          showToast('Hevy sync issue', 'Hevy returned an error. Try again shortly.');
        }
        break;
      }
      const data = resp.data || {};
      const workouts = data?.workouts || [];
      if(!workouts.length){ break; }
      
      let pageNew = 0;
      workouts.forEach(w => {
        if(existingHevyIds.has(w.id)) return;
        
        const exercises = (w.exercises || []).map(ex => ({
          name: ex.title || ex.exercise_template_id || 'Exercise',
          templateId: ex.exercise_template_id || null,
          sets: (ex.sets || []).map(s => ({
            weight: s.weight_kg || 0,
            reps: s.reps || 0,
            rpe: s.rpe || null,
            type: s.type || 'normal',
            distance: s.distance_meters || null,
            duration: s.duration_seconds || null,
            done: true
          }))
        }));
        
        const totalSets = exercises.reduce((a, ex) => a + ex.sets.length, 0);
        // Working volume = weight × reps over WORKING sets (warmups excluded), matching how
        // most lifters read "volume". We keep set.type so this is honest and adjustable.
        const volume = Math.round(exercises.reduce((total, ex) => 
          total + ex.sets.reduce((a, s) => { const w=parseFloat(s.weight)||0, r=parseInt(s.reps)||0; return a + (/warm/i.test(s.type||'') || w<=0 ? 0 : w*r); }, 0), 0));
        
        const dateObj = new Date(w.start_time || w.created_at || Date.now());
        const _durMin = w.end_time && w.start_time ? Math.round((new Date(w.end_time) - new Date(w.start_time)) / 60000) : null;
        // Honest rough burn estimate for resistance training (~6 kcal/min), so Hevy strength
        // sessions count toward the day's "burned" calories just like in-app workouts do.
        const _burnEst = _durMin ? Math.round(_durMin * 6) : null;
        existing.push({
          id: Date.now() + Math.floor(Math.random() * 100000),
          hevyId: w.id,
          source: 'hevy',
          date: dateObj.toLocaleDateString('en-AU', {weekday:'short', day:'numeric', month:'short', year:'numeric'}),
          ts: dateObj.toISOString(),
          day: getDayCount(),
          exercises: exercises,
          completedSets: totalSets,
          totalSets: totalSets,
          volume: volume,
          splitFocus: w.title || 'Hevy workout',
          durationMinutes: _durMin,
          calories: _burnEst
        });
        existingHevyIds.add(w.id);
        imported++; pageNew++;
      });
      
      // If a full page was all duplicates, we've caught up — stop paginating
      if(pageNew === 0 && !fullHistory) keepGoing = false;
      if(workouts.length < pageSize) keepGoing = false; // last page
      page++;
    }
    
    if(imported > 0){
      // Sort newest-first by timestamp and cap
      // RE-READ BEFORE WRITING. `existing` was taken before a long run of network calls; anything the
      // person logged or deleted meanwhile is in storage and not in this array, and writing it back
      // whole would erase their work. Merge onto what is actually there now.
      const _fresh = ls('totry_workouts') || [];
      const _key = w => w && (w.hevyId ? 'h'+w.hevyId : (w.stravaId ? 's'+w.stravaId : (w.id != null ? 'i'+w.id : JSON.stringify(w))));
      const _byId = new Map();
      _fresh.forEach(w => { const k=_key(w); if(k) _byId.set(k, w); });
      existing.forEach(w => { const k=_key(w); if(k && !_byId.has(k)) _byId.set(k, w); });
      const _merged = Array.from(_byId.values());
      _merged.sort((a,b) => new Date(b.ts) - new Date(a.ts));
      ls('totry_workouts', _capWorkouts(_merged));
      ls('totry_hevy_synced_once', true);
      // Fold strength-session burn estimates into the day's burned-calorie total so Hevy workouts
      // affect the nutrition net (cardio already does this via its own path). Idempotent: we
      // recompute the strength portion from totry_workouts rather than incrementing blindly.
      try{
        if(typeof recomputeStrengthBurns === 'function') recomputeStrengthBurns();
      }catch(_){ }
      showToast('Hevy synced', imported + ' workout' + (imported>1?'s':'') + ' imported.');
      // Also refresh the user's actual routines + folders so we can show THEM (WS2).
      try{ fetchHevyRoutines({ silent: true }); }catch(_){ }
      // Celebrate PRs from the most recent synced session (Hevy workouts never did this before).
      // Only for incremental syncs, so the first full-history import doesn't fire a PR storm.
      if(!fullHistory && existing.length){
        try{
          const latest = existing[0];
          const prsHit = detectAndRecordPRs(latest.exercises || []);
          if(prsHit.length){
            const top = prsHit.sort((a,b)=>b.e1rm-a.e1rm)[0];
            setTimeout(()=>{ showToast('New PR! \u{1F3C6}', top.name + ' \u2014 est. 1RM ' + top.e1rm + 'kg'); if(typeof showVerseToast==='function') setTimeout(()=>showVerseToast('pr','Word for your PR'),800); }, 600);
          }
        }catch(_){ }
      } else if(fullHistory && existing.length){
        // On first import, seed PR records silently from all history so future syncs compare correctly.
        try{ [...existing].reverse().forEach(w => detectAndRecordPRs(w.exercises || [])); }catch(_){ }
      }
      
      // Auto-tick habits from the freshly synced workouts. Use the canonical autoTickHabits(),
      // which backfills the last 7 days from ALL activity sources by date — so a workout synced
      // for today OR a recent day correctly ticks the gym habit (the narrow today-only tick missed
      // workouts whose timestamp didn't match today's local date string).
      if(typeof autoTickHabits === 'function') autoTickHabits();
      if(typeof renderHabits === 'function') renderHabits();
      if(typeof renderHomeHabits === 'function') renderHomeHabits();
      
      if(typeof renderUnifiedTraining === 'function') renderUnifiedTraining();
    }
  }catch(e){
    console.error('[hevy] sync error:', e);
  }
}

