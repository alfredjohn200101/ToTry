// ── BODY ──────────────────────────────────────────────────────
async function logBody(){
  const w=parseFloat(document.getElementById('bod-weight').value||'0');
  const trainScore=parseInt(document.getElementById('wk-train')?.value||0);
  const nutScore=parseInt(document.getElementById('wk-nut')?.value||0);
  const sleepScore=parseInt(document.getElementById('wk-sleep')?.value||0);
  const stressScore=parseInt(document.getElementById('wk-stress')?.value||0);
  const energyScore=parseInt(document.getElementById('wk-energy')?.value||0);
  const faithScore=parseInt(document.getElementById('wk-faith')?.value||0);
  const winText=document.getElementById('wk-win')?.value.trim()||'';
  const struggleText=document.getElementById('wk-struggle')?.value.trim()||'';
  const focusText=document.getElementById('wk-focus')?.value.trim()||'';
  // Detected HERE, where the text is read — not further down where it used to be. My first attempt at
  // flagging the stored entry referenced _wkCrisis before its `let`, which is a TDZ ReferenceError; and
  // because that line sat inside a try/catch the error would have been SWALLOWED and the flag silently
  // never set. A gate that appears to work and does nothing is the exact failure this file keeps having.
  let _wkCrisis = null;
  try{ if(typeof detectCrisis === 'function') _wkCrisis = detectCrisis([winText, struggleText, focusText].filter(Boolean).join(' ')); }catch(_){ }

  
  // Require AT LEAST weight OR scores OR text - some data to be useful
  const hasAnyData = w > 0 || trainScore || winText || struggleText || focusText;
  if(!hasAnyData){
    showToast('Add some data','Fill in at least weight, scores, or text before logging.');
    return;
  }
  
  const entries=ls('totry_body')||[];
  const newEntry={
    date:new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'}),
    ts:new Date().toISOString(),
    weight:w,
    bf:parseFloat(document.getElementById('bod-bf')?.value||'0'),
    note:document.getElementById('bod-note')?.value.trim()||'',
    photo:_pendingBodyPhoto,
    // New PT-coach dimensions
    scores:{
      train:trainScore,
      nutrition:nutScore,
      sleep:sleepScore,
      stress:stressScore,
      energy:energyScore,
      faith:faithScore
    },
    win:winText,
    struggle:struggleText,
    focus:focusText
  };
  // FLAG IT, like the journal does. v434 gated this surface — the crisis card fires and the AI weekly
  // read is skipped — but it never MARKED what it stored, so the struggle text sat unflagged in
  // totry_body and every later reader could still hand it to a model. Gating the moment is not the
  // same as gating the record; that is the whole lesson of v449.
  try{ if(_wkCrisis) newEntry.flagged = true; }catch(_){ }
  entries.unshift(newEntry);
  ls('totry_body',entries.slice(0,1000));
  
  // Reset form
  ['bod-weight','bod-bf','bod-note','wk-win','wk-struggle','wk-focus'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  ['wk-train','wk-nut','wk-sleep','wk-stress','wk-energy','wk-faith'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value=5;
    const valEl=document.getElementById(id+'-val');if(valEl)valEl.textContent='—';
  });
  
  _pendingBodyPhoto = null;
  const preview = document.getElementById('bod-photo-preview');
  if(preview) preview.style.display='none';
  const photoInput = document.getElementById('bod-photo');
  if(photoInput) photoInput.value='';
  
  renderBody();
  renderBodyCollage();
  
  // Auto-adjust calorie target if weight trend supports it
  adjustCaloriesFromWeightTrend();
  
  // THE 8TH FREE-TEXT -> LLM SURFACE, and it had no crisis gate at all.
  // "What got in your way? Honest answers only." invites exactly the sentence that matters most, and
  // every other AI entry point in this app runs detectCrisis() before api(). This one went straight from
  // the textarea into generateWeeklyCoachResponse -> "Biggest struggle: ..." -> a third-party model.
  // Someone answering that prompt honestly at their worst got no resources and no bridge to a human.
  //
  // GRACE OVER SHAME: their words are already saved above, and they stay saved. Nothing they wrote is
  // discarded or thrown back at them. What changes is that the app stops to meet them instead of sending
  // the sentence off for a cheerful weekly read.
  if(_wkCrisis){
    haptic('warning');
    // Presented as a modal, the same way the weekly read itself is — an inline card at the top of the
    // Track tab could be scrolled past by someone who has just closed the form.
    try{
      if(typeof showCrisisResponse === 'function'){
        document.querySelectorAll('.modal-bg:not([id])').forEach(function(m){ m.remove(); });  /* :not([id]) is load-bearing. #journal-modal, #payday-modal and #rest-timer-overlay are STATIC elements that carry .modal-bg, so the bare selector deleted them from the DOM permanently. Three of these four sites are crisis paths I added in v434/v439 — meaning that after a person disclosed something serious, openJournal() threw on its first line ('Cannot set properties of null') and the journal composer was dead for the rest of the session. I diagnosed this exact symptom earlier as MY TEST's fault, which it also was; I did not check whether the shipped code did the same thing. It did. */
        const m = document.createElement('div');
        m.className = 'modal-bg open';
        m.style.alignItems = 'center';
        m.innerHTML = '<div class="modal" style="max-width:92vw">' +
          '<div class="modal-handle"></div>' +
          '<div id="wk-crisis-slot"></div>' +
          '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:1px solid var(--bd);color:var(--tx3);font-size:12px;margin-top:10px">Close</button>' +
        '</div>';
        document.body.appendChild(m);
        showCrisisResponse('wk-crisis-slot', _wkCrisis);
      }
    }catch(_){ }
    showToast('Check-in saved', 'I read what you wrote. Please look at this.');
    return;                                    // no AI weekly read on top of a disclosure
  }
  
  haptic('celebrate');
  showToast('Check-in logged','Your coach is reading your week...');
  
  // If we have scores/text, trigger AI coach response
  if(trainScore && (winText || struggleText || focusText)){
    setTimeout(()=>generateWeeklyCoachResponse(newEntry), 1500);
  }
}

// Dynamic calorie adjustment based on weight trend
function adjustCaloriesFromWeightTrend(){
  const entries = ls('totry_body') || [];
  if(entries.length < 3) return; // Need at least 3 data points
  // HONOUR THE THROTTLE THAT WAS ALREADY BEING WRITTEN. totry_weight_trend stores a lastCheck on every
  // adjustment and nothing ever read it, while all three call sites are weigh-in saves — so someone who
  // logged their weight three times in a week had the same +/-150 calorie shift applied three times,
  // compounding one weekly decision into a 450-calorie swing they never agreed to. A weight trend is a
  // weekly signal; act on it weekly.
  try{
    const _prev = ls('totry_weight_trend');
    if(_prev && _prev.lastCheck){
      const _days = (Date.now() - new Date(_prev.lastCheck).getTime()) / 86400000;
      if(_days >= 0 && _days < 7) return;
    }
  }catch(_){ }
  
  // let, not const: the floor fix below re-derives all four macros and rebinds this. As a const it
  // parsed perfectly and threw "Assignment to constant variable" only when a weight trend actually
  // fired — the exact shape of bug this file keeps getting caught by.
  let goals = ls('totry_nut_macros') || ls('totry_nut_goals');
  if(!goals || !goals.cal) return;
  
  // Get last 4 weeks of weight data
  const recent = entries.slice(0, 4);
  const withWeight = recent.filter(e => e.weight > 0);
  if(withWeight.length < 2) return;
  
  const newest = withWeight[0];
  const oldest = withWeight[withWeight.length - 1];
  const weeksDiff = (new Date(newest.ts) - new Date(oldest.ts)) / (1000 * 60 * 60 * 24 * 7);
  if(weeksDiff < 1) return;
  
  const weeklyChange = (newest.weight - oldest.weight) / weeksDiff;
  
  // Determine user's goal from their TDEE setup
  // We infer: if they had a deficit set, they're cutting. If surplus, bulking. Otherwise maintaining.
  const tdeeData = ls('totry_tdee_data');
  let userGoal = 'maintain';
  if(tdeeData && tdeeData.goal){
    userGoal = tdeeData.goal; // 'lose', 'maintain', or 'gain'
  } else if(goals.cal){
    // Fallback: check if there's a stored goal preference
    const pref = ls('totry_calorie_goal_type');
    if(pref) userGoal = pref;
  }
  
  // Define target ranges by goal (kg per week)
  let targetMin, targetMax, adjustmentMsg = '';
  if(userGoal === 'lose'){
    targetMin = -0.9;  // not more than 0.9kg loss per week
    targetMax = -0.3;  // at least 0.3kg loss per week
  } else if(userGoal === 'gain'){
    targetMin = 0.2;   // at least 0.2kg gain
    targetMax = 0.5;   // not more than 0.5kg per week
  } else {
    targetMin = -0.3;
    targetMax = 0.3;
  }
  
  // Determine if adjustment needed
  let calAdjustment = 0;
  let reason = '';
  
  if(weeklyChange < targetMin){
    // Losing/gaining too fast (or losing too much for maintenance)
    if(userGoal === 'lose'){
      calAdjustment = 150;  // add calories - losing too fast
      reason = 'You\'re dropping ' + Math.abs(weeklyChange).toFixed(1) + 'kg/week (target: 0.3-0.9kg). Bumping your calories up.';
    } else if(userGoal === 'maintain'){
      calAdjustment = 200;
      reason = 'You\'ve lost ' + Math.abs(weeklyChange).toFixed(1) + 'kg/week. Bumping calories up to maintain.';
    } else {
      calAdjustment = -100;  // gaining but losing weight, contradiction
      reason = 'Trend shows weight loss when bulking. Reviewing your calories.';
    }
  } else if(weeklyChange > targetMax){
    if(userGoal === 'lose'){
      calAdjustment = -150;  // cutting harder
      reason = 'Weight is up ' + weeklyChange.toFixed(1) + 'kg this week. Tightening your calories.';
    } else if(userGoal === 'gain'){
      calAdjustment = -100;
      reason = 'Gaining too fast at ' + weeklyChange.toFixed(1) + 'kg/week. Pulling calories back.';
    } else {
      calAdjustment = -150;
      reason = 'Trending up at ' + weeklyChange.toFixed(1) + 'kg/week. Adjusting to hold steady.';
    }
  } else {
    // On target - no change
    ls('totry_weight_trend', {weeklyChange, status: 'on_target', lastCheck: new Date().toISOString()});
    return;
  }
  
  // Apply the adjustment to displayed targets
  if(calAdjustment !== 0 && Math.abs(calAdjustment) >= 100){
    const oldCal = goals.cal;
    // THE ED-SAFE FLOOR, not a hardcoded 1200.
    // _calFloor() is 1500 for a man and 1200 for a woman, and goalAdjustedTarget() already clamps to it
    // under the comment "never prescribe a reckless deficit". This path did not — and this is the path
    // where the APP itself moves the target off a weight trend, with no one asking it to. So a man whose
    // trend looked slow could be walked down to 1200: three hundred calories under the app's own stated
    // minimum, announced as "Coach update — Your targets shifted" with a success haptic. The floor is the
    // one promise that must hold hardest in an app used by people fighting their own discipline.
    const _floor = (typeof _calFloor === 'function') ? _calFloor() : 1200;
    const _wanted = oldCal + calAdjustment;
    const newCal = Math.max(_floor, Math.min(5000, _wanted));
    const _clampedAtFloor = _wanted < _floor;
    
    if(newCal !== oldCal){
      // Re-derive all four macros for the new figure instead of scaling protein down with the calories.
      // Scaling protein DOWN in a deficit is backwards — it is the one macro to protect when calories
      // fall — and because carb and fat were left untouched, the four saved numbers stopped summing to
      // the target the macro ring draws, so the ring and the goal disagreed. macrosForCalories() already
      // does this properly: protein from bodyweight, "protein is sacred", fat trimmed first if tight,
      // and it never drops below a protein the person deliberately set higher.
      const _derived = (typeof macrosForCalories === 'function')
        ? macrosForCalories(newCal, { proPerKg: calAdjustment < 0 ? 2.2 : 1.8 })
        : null;
      if(_derived){
        goals = Object.assign({}, goals, _derived, { cal: newCal });
      } else {
        goals.cal = newCal;
      }
      if(typeof withDerivedMacros === 'function') goals = withDerivedMacros(goals);
      ls('totry_nut_macros', goals);
      ls('totry_nut_goals', goals);
      
      // Log the adjustment
      const adjustments = ls('totry_pt_adjustments') || [];
      adjustments.unshift({
        ts: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-AU'),
        oldCal,
        newCal,
        change: calAdjustment,
        reason,
        weeklyChange
      });
      ls('totry_pt_adjustments', adjustments.slice(0, 50));
      
      ls('totry_weight_trend', {weeklyChange, status: 'adjusted', adjustment: calAdjustment, lastCheck: new Date().toISOString()});
      
      // Notify user prominently
      setTimeout(() => {
        const m = document.createElement('div');
        m.className = 'modal-bg open';
        m.style.alignItems = 'center';
        m.innerHTML = '<div class="modal" style="max-width:90vw">' +
          '<div class="modal-handle"></div>' +
          '<div style="text-align:center;font-family:DM Mono,monospace;font-size:10px;color:var(--go);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:6px">Coach update</div>' +
          '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);font-style:italic;margin-bottom:14px">Your targets shifted.</div>' +
          '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:14px;margin-bottom:14px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
              '<div style="font-size:12px;color:var(--tx3)">Daily calories</div>' +
              '<div style="font-family:DM Mono,monospace;font-size:13px"><span style="color:var(--tx3);text-decoration:line-through">' + oldCal + '</span> <span style="color:var(--go);font-weight:700;margin-left:8px">' + newCal + '</span></div>' +
            '</div>' +
            '<div style="font-size:13px;color:var(--tx2);line-height:1.6">' + reason + '</div>' +
          '</div>' +
          '<button class="btn primary" onclick="closeModal(this);go(\'nourish\')" style="margin-bottom:6px">Got it &mdash; show me</button>' +
          '<button class="btn" onclick="closeModal(this)">Dismiss</button>' +
          '</div>';
        document.body.appendChild(m);
        haptic('success');
      }, 800);
      // If the trend asked for a target under the floor, the app has just refused to prescribe it.
      // Open the same gentle door the manual path uses rather than leaving it at a celebration.
      if(_clampedAtFloor && typeof showLowCalorieCare === 'function'){
        setTimeout(() => { try{ showLowCalorieCare(); }catch(_){} }, 1800);
      }
    }
  }
}

async function generateWeeklyCoachResponse(entry){
  // Read identity, season, recent data
  const identity = ls('totry_identity')||'';
  const season = ls('totry_season')||'Building';
  const dayCount = getDayCount();
  // Flagged check-ins never become AI context — same rule as safeJournal(). logBody gates the moment and
  // marks the record; this is the reader that would otherwise carry a disclosure into every later weekly
  // read, and it is invoked with the entry object directly as well as reading the store.
  const allEntries = (ls('totry_body')||[]).filter(function(e){ return e && !e.flagged; });
  const last4 = allEntries.slice(0,4);
  if(entry && entry.flagged) return;                 // never write a coach response onto a disclosure
  
  // Build context
  let context = `User: Day ${dayCount} of journey. Season: ${season}.`;
  if(identity) context += ` Identity: "${identity}".`;
  context += `\nThis week\'s check-in:`;
  if(entry.weight) context += `\n- Weight: ${entry.weight}kg`;
  if(entry.scores){
    context += `\n- Training adherence: ${entry.scores.train}/10`;
    context += `\n- Nutrition adherence: ${entry.scores.nutrition}/10`;
    context += `\n- Sleep: ${entry.scores.sleep}/10`;
    context += `\n- Stress: ${entry.scores.stress}/10`;
    context += `\n- Energy: ${entry.scores.energy}/10`;
    context += `\n- Faith: ${entry.scores.faith}/10`;
  }
  if(entry.win) context += `\n- Biggest win: ${entry.win}`;
  if(entry.struggle) context += `\n- Biggest struggle: ${entry.struggle}`;
  if(entry.focus) context += `\n- Next week focus: ${entry.focus}`;
  
  // Compare to last entries for trend
  if(last4.length > 1){
    const prev = last4[1];
    if(prev?.scores){
      context += `\n\nLast week\'s scores for comparison: Train ${prev.scores.train}/Nutr ${prev.scores.nutrition}/Sleep ${prev.scores.sleep}/Stress ${prev.scores.stress}.`;
    }
    if(entry.weight && prev?.weight){
      const diff = (entry.weight - prev.weight).toFixed(1);
      context += `\nWeight change since last check-in: ${diff > 0 ? '+' : ''}${diff}kg.`;
    }
  }
  
  const prompt = `You are this person\'s personal coach. Write a warm, honest, specific response to their weekly check-in. Notice patterns. Celebrate wins. Be direct about struggles without being harsh. End with ONE specific thing for them to focus on next week. 200-300 words. Use their name (${ls('totry_name')||'Friend'}) once. No corporate fluff.\n\n${context}`;
  
  try {
    const response = await api(brotherSys() + 'You’re giving them an honest weekly read here — what you see across the whole week and the one thing that matters most. Direct because you care.', [], prompt, 1000);
    if(response && response.trim()){
      // Save and show
      const syntheses = ls('totry_syntheses')||[];
      syntheses.unshift({
        weekKey: getWeekKey(new Date()),
        date: new Date().toLocaleDateString('en-AU'),
        text: response.trim(),
        ts: new Date().toISOString(),
        type: 'weekly_checkin'
      });
      ls('totry_syntheses', syntheses.slice(0,52));
      
      // Show modal with response
      const m = document.createElement('div');
      m.className = 'modal-bg open';
      m.style.alignItems = 'center';
      m.innerHTML = '<div class="modal">'+
        '<div class="modal-handle"></div>'+
        '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;text-align:center;margin-bottom:8px">Your coach response</div>'+
        '<div style="font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);font-style:italic;text-align:center;margin-bottom:16px">For this week.</div>'+
        '<div style="font-size:14px;line-height:1.75;color:var(--tx2);white-space:pre-wrap;margin-bottom:18px">'+response.trim()+'</div>'+
        '<button class="btn primary" onclick="closeModal(this)">Got it</button>'+
        '</div>';
      document.body.appendChild(m);
      haptic('celebrate');
    } else {
      // api() returns '' when every provider fails — it does not throw — so the catch below never ran
      // and NOTHING happened. The toast forty lines up already told them "Your coach is reading your
      // week…", so silence here reads as being ignored right after being asked to be honest.
      const why = (typeof getAIErrorMessage === 'function' && getAIErrorMessage()) || 'I could not reach the coach just now.';
      showToast('Check-in saved', why + ' Your week is logged — open it again in a bit and I will read it back.');
    }
  } catch(e){
    console.error('Coach response failed:', e);
    showToast('Coach offline','Your check-in is saved. Coach response will retry later.');
  }
}
// Recent weight entries with delete — weight was previously un-removable (a "trapped entry").
function renderWeightHistory(){
  const wrap = document.getElementById('bod-weight-history');
  if(!wrap) return;
  const entries = (ls('totry_body')||[]).filter(e => e.weight > 0);
  if(!entries.length){ wrap.innerHTML = ''; return; }
  wrap.innerHTML = '<div class="lbl" style="margin-bottom:6px">Recent weigh-ins</div>' +
    entries.slice(0,8).map(e => {
      const when = e.ts ? new Date(e.ts).toLocaleDateString('en-AU',{day:'numeric',month:'short'}) : (e.date||'');
      return '<div class="body-entry"><span style="font-size:14px;color:var(--tx)">'+e.weight+'kg</span>'+
        '<span style="display:flex;align-items:center;gap:10px"><span style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">'+when+'</span>'+
        '<button onclick="deleteWeightEntry(&quot;'+(e.ts||e.date)+'&quot;)" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer" aria-label="Delete">\u00d7</button></span></div>';
    }).join('');
}
function deleteWeightEntry(key){
  if(!confirm('Delete this weigh-in?')) return;
  const entries = ls('totry_body') || [];
  const filtered = entries.filter(e => (e.ts||e.date) !== key);
  tombstoneRemoved('totry_body', entries, filtered);   // or the next cloud pull unions it back
  ls('totry_body', filtered);
  if(typeof syncToCloud==='function') syncToCloud();
  renderBody();
  haptic('success'); showToast('Deleted','Weigh-in removed.');
}
// ── RECOMP READ (the Train×Nourish squeeze #5) ─────────────────────────────────────────────────
// The read no single-purpose app can give: it needs BOTH your weight trend AND your strength trend.
// The scale alone lies — "up 1kg" could be muscle or fat; "flat" could be perfect recomposition.
// Cross the two and the truth appears. Deterministic reads on your own numbers — it reflects, never
// prescribes — and stays null until there's genuinely enough of both to be honest.
function weightTrendDir(){
  const body=(ls('totry_body')||[]).filter(e=>e&&e.weight>0).map(e=>({w:+e.weight,t:new Date(e.ts||e.date).getTime()})).filter(x=>x.w>0&&!isNaN(x.t)).sort((a,b)=>a.t-b.t);
  if(body.length<3) return null;
  const spanDays=(body[body.length-1].t-body[0].t)/86400000;
  if(spanDays<21) return null;                         // ~3 weeks before a trend is trustworthy
  const trendNow=(typeof getTrendWeight==='function')?getTrendWeight(ls('totry_body')||[]):body[body.length-1].w;
  const changeKg=trendNow-body[0].w;
  const perWeek=changeKg/(spanDays/7);
  return { dir: perWeek>0.12?'up':perWeek<-0.12?'down':'stable', perWeek:Math.round(perWeek*100)/100, changeKg:Math.round(changeKg*10)/10, days:Math.round(spanDays) };
}
function strengthTrend(){
  const sess=((typeof getUnifiedTraining==='function')?getUnifiedTraining():[]).filter(t=>t&&t.kind==='strength'&&t.ts&&(t.volume||0)>0).sort((a,b)=>new Date(a.ts)-new Date(b.ts));
  if(sess.length<4) return null;
  const half=Math.floor(sess.length/2);
  const avg=a=>a.reduce((s,t)=>s+(t.volume||0),0)/a.length;
  const oAvg=avg(sess.slice(0,half)), rAvg=avg(sess.slice(half));
  if(oAvg<=0) return null;
  const pct=(rAvg-oAvg)/oAvg;
  return { dir: pct>0.05?'up':pct<-0.05?'down':'flat', pct:Math.round(pct*100), sessions:sess.length };
}
// Smart-scale body-comp trend (fat mass / muscle mass) — the extra dimension a scale like Eufy adds,
// synced in by CSV today or Apple Health once native. Null unless there's real comp data spanning time.
function bodyCompTrend(){
  const pts=(ls('totry_body')||[]).filter(e=>e&&e.weight>0&&e.comp&&(e.comp.fatMassKg!=null||e.comp.muscleKg!=null))
    .map(e=>({t:new Date(e.ts||e.date).getTime(), fat:e.comp.fatMassKg, mus:e.comp.muscleKg})).filter(x=>!isNaN(x.t)).sort((a,b)=>a.t-b.t);
  if(pts.length<2) return null;
  const spanDays=(pts[pts.length-1].t-pts[0].t)/86400000;
  if(spanDays<14) return null;
  const f=pts[0], l=pts[pts.length-1];
  return {
    dFat:(f.fat!=null&&l.fat!=null)?Math.round((l.fat-f.fat)*10)/10:null,
    dMus:(f.mus!=null&&l.mus!=null)?Math.round((l.mus-f.mus)*10)/10:null,
    days:Math.round(spanDays)
  };
}
function recompRead(){
  const w=weightTrendDir(), s=strengthTrend();
  if(!w||!s) return null;
  const up=w.dir==='up', down=w.dir==='down', stable=w.dir==='stable';
  const sUp=s.dir==='up', sDown=s.dir==='down', sFlat=s.dir==='flat';
  const kg=Math.abs(w.changeKg);
  let tone='good', head, body;
  if(stable && sUp){ head='Recomposition — the scale is lying in your favour.'; body='Your weight held over '+w.days+' days while your training volume climbed. That’s muscle replacing fat at about the same weight — the hardest, best result there is. Don’t chase the scale down.'; }
  else if(down && (sUp||sFlat)){ head='Cutting clean.'; body='Down '+kg+'kg while your strength '+(sUp?'even rose':'held')+'. You’re losing fat, not muscle — exactly how a cut should look. Keep the protein high.'; }
  else if(up && sUp){ head='Lean gain.'; body='Up '+kg+'kg and your training’s rising with it — the weight’s going where you want it. If the scale ever climbs faster than your lifts, ease the surplus.'; }
  else if(down && sDown){ tone='warn'; head='Strength is dropping with the weight.'; body='Down '+kg+'kg, but your lifts are falling too — usually the deficit’s too steep or protein’s low. Ease the cut a little and hold your protein; strength is the thing worth protecting.'; }
  else if(up && sDown){ tone='warn'; head='Gaining faster than you’re building.'; body='Up '+kg+'kg but strength isn’t following — more of this is fat than muscle. Tighten the surplus and make sure the training keeps progressing.'; }
  else return null;                                    // no honest signal strong enough to speak
  // If a smart scale is feeding fat/muscle data, corroborate the read with it — or, when the scale
  // disagrees with the lifts, say so honestly: bioimpedance muscle/fat numbers wobble, and rising
  // strength is the more reliable sign of real muscle. This is how the scale "maximises" the read.
  const bc=(typeof bodyCompTrend==='function')?bodyCompTrend():null;
  if(bc){
    const fatDown=bc.dFat!=null&&bc.dFat<-0.2, fatUp=bc.dFat!=null&&bc.dFat>0.2;
    const musUp=bc.dMus!=null&&bc.dMus>0.2, musDown=bc.dMus!=null&&bc.dMus<-0.2;
    const agrees = (tone==='good' && (fatDown||musUp)) || (tone==='warn' && (fatUp||musDown));
    if(agrees){
      const bits=[]; if(fatDown) bits.push('down '+Math.abs(bc.dFat)+'kg fat'); if(musUp) bits.push('up '+bc.dMus+'kg muscle');
      if(fatUp) bits.push('up '+bc.dFat+'kg fat'); if(musDown) bits.push('down '+Math.abs(bc.dMus)+'kg muscle');
      if(bits.length) body += ' Your scale backs it up: '+bits.join(', ')+' over '+bc.days+' days.';
    } else if(sUp && bc.dMus!=null && bc.dMus<=0){
      body += ' (Your scale doesn’t show the muscle yet — bioimpedance readings wobble day to day; your rising strength is the more reliable sign.)';
    }
  }
  return { tone, head, body, w, s, bc };
}
function renderRecompInsight(){
  const box=document.getElementById('recomp-insight'); if(!box) return;
  const r=(typeof recompRead==='function')?recompRead():null;
  if(!r){ box.style.display='none'; return; }
  const col=r.tone==='warn'?'var(--go)':'var(--gr)';
  box.style.display='block';
  box.style.background=r.tone==='warn'?'linear-gradient(135deg,rgba(200,169,110,0.10),rgba(200,169,110,0.02))':'linear-gradient(135deg,rgba(91,185,125,0.10),rgba(91,185,125,0.02))';
  box.style.borderColor=r.tone==='warn'?'var(--go-bd)':'var(--gr-bd)';
  box.innerHTML=
    '<div class="eyebrow" style="color:'+col+';margin-bottom:6px">Weight × strength · what the scale can’t see</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:18px;font-style:italic;color:var(--tx);line-height:1.3;margin-bottom:6px">'+r.head+'</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.6">'+r.body+'</div>';
}
function renderBody(){
  const entries=ls('totry_body')||[];
  if(typeof renderWeightHistory === 'function') renderWeightHistory();
  if(typeof renderRecompInsight === 'function') renderRecompInsight();
  
  // Update the daily-log card today summary
  const todaySummary = document.getElementById('bod-current-summary');
  if(todaySummary){
    const todayStr = new Date().toLocaleDateString('en-AU', {day:'numeric', month:'short'});  // display only
  const todayFull = new Date().toLocaleDateString('en-AU');                                   // identity
    const todayEntry = entries.find(e => (e.ts ? new Date(e.ts).toLocaleDateString('en-AU') === todayFull : e.date === todayStr));
    if(todayEntry && todayEntry.weight > 0){
      todaySummary.textContent = todayEntry.weight + 'kg logged today';
      todaySummary.style.color = 'var(--gr)';
    } else if(entries.length && entries[0].weight > 0){
      todaySummary.textContent = 'Last: ' + entries[0].weight + 'kg (' + (entries[0].date || (entries[0].ts ? new Date(entries[0].ts).toLocaleDateString('en-AU') : 'earlier')) + ')';
      todaySummary.style.color = 'var(--tx3)';
    } else {
      todaySummary.textContent = 'No log yet';
      todaySummary.style.color = 'var(--tx3)';
    }
  }
  
  if(entries.length){
    const cur=entries[0].weight,start=entries[entries.length-1].weight,diff=Math.round((cur-start)*10)/10;
    document.getElementById('bod-cur').textContent=cur+'kg';
    document.getElementById('bod-st').textContent=start+'kg';
    document.getElementById('bod-lo').textContent=(diff<0?diff:diff>0?'+'+diff:'\u2014')+'kg';
    const h=ls('totry_height')||175;const bmi=Math.round((cur/((h/100)**2))*10)/10;
    const bmiEl=document.getElementById('bod-bmi');
    if(bmiEl)bmiEl.textContent=bmi+' ('+(bmi<18.5?'Underweight':bmi<25?'Healthy':bmi<30?'Overweight':'Obese')+')';
  }
  if(entries.length>=2){
    const pts=entries.slice(0,12).reverse(),weights=pts.map(e=>e.weight),mn=Math.min(...weights),mx=Math.max(...weights),range=mx-mn||1,W=340,H=90,pad=12;
    const x=i=>pad+(i/(pts.length-1))*(W-2*pad);const y=w=>H-pad-((w-mn)/range)*(H-2*pad);
    const pathD=pts.map((p,i)=>(i===0?'M':'L')+x(i).toFixed(1)+','+y(p.weight).toFixed(1)).join(' ');
    const svg=document.getElementById('weight-chart');
    if(svg)svg.innerHTML='<defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5BB97D" stop-opacity="0.25"/><stop offset="100%" stop-color="#5BB97D" stop-opacity="0"/></linearGradient></defs><path d="'+pathD+' L'+x(pts.length-1).toFixed(1)+','+H+' L'+x(0).toFixed(1)+','+H+' Z" fill="url(#wg)"/><path d="'+pathD+'" stroke="#5BB97D" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+pts.map((p,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(p.weight).toFixed(1)+'" r="3.5" fill="#5BB97D"/><text x="'+x(i).toFixed(1)+'" y="'+(y(p.weight)-8).toFixed(1)+'" text-anchor="middle" fill="rgba(242,239,232,0.4)" font-size="8" font-family="DM Mono,monospace">'+p.weight+'</text>').join('');
  }
  const hist=document.getElementById('body-history');
  if(hist){
    hist.innerHTML='';
    if(!entries.length){
      hist.innerHTML='<p style="font-size:13px;color:var(--tx3);text-align:center;padding:10px 0">No check-ins yet</p>';
      // Run the tail before bailing. Measurements, progress photos and the body-comp insight do NOT
      // depend on a weight check-in existing, and skipping them meant someone who tracked their waist
      // or took photos but never weighed themselves saw none of their own data.
      try{ renderMeasurements(); }catch(_){}
      try{ renderProgressPhotos(); }catch(_){}
      try{ renderBodyCompInsight(); }catch(_){}
      return;
    }
    // Full entry per check-in (not just weight) so progress reads as a story over time:
    // weight + change, body-fat, the scores, and the win/struggle/focus reflections.
    entries.forEach((e,i)=>{
      const prev=entries[i+1];
      const change=(prev&&e.weight&&prev.weight)?Math.round((e.weight-prev.weight)*10)/10:0;
      const cls=change<0?'down':change>0?'up':'same';
      const cs=change===0?'\u2014':(change>0?'+':'')+change+'kg';
      const sc=e.scores||{};
      const scoreLine=[['Train',sc.train],['Food',sc.nutrition],['Sleep',sc.sleep],['Faith',sc.faith]]
        .filter(x=>x[1]>0).map(x=>x[0]+' '+x[1]+'/5').join(' \u00b7 ');
      const card=document.createElement('div');
      card.style.cssText='background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:8px';
      let html='<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:'+((scoreLine||e.win||e.struggle||e.focus||e.note)?'8px':'0')+'">'+
        '<span style="font-family:DM Mono,monospace;font-size:11px;color:var(--tx3)">'+(e.date || (e.ts ? new Date(e.ts).toLocaleDateString('en-AU',{day:'numeric',month:'short'}) : ''))+'</span>'+
        (e.weight>0?'<span style="font-size:15px;color:var(--tx)">'+e.weight+'kg <span style="font-size:11px;color:'+(cls==='down'?'var(--gr)':cls==='up'?'var(--re)':'var(--tx3)')+'">'+cs+'</span></span>':'')+
        '</div>';
      if(e.bf>0) html+='<div style="font-size:11px;color:var(--tx3);margin-bottom:6px">Body fat: '+e.bf+'%</div>';
      if(scoreLine) html+='<div style="font-size:11px;color:var(--tx2);margin-bottom:6px">'+scoreLine+'</div>';
      if(e.win) html+='<div style="font-size:12px;color:var(--tx2);line-height:1.5;margin-bottom:4px"><span style="color:var(--gr)">Win:</span> '+e.win.replace(/</g,'&lt;')+'</div>';
      if(e.struggle) html+='<div style="font-size:12px;color:var(--tx2);line-height:1.5;margin-bottom:4px"><span style="color:var(--go)">Struggle:</span> '+e.struggle.replace(/</g,'&lt;')+'</div>';
      if(e.focus) html+='<div style="font-size:12px;color:var(--tx2);line-height:1.5;margin-bottom:4px"><span style="color:var(--tx3)">Next:</span> '+e.focus.replace(/</g,'&lt;')+'</div>';
      if(e.note) html+='<div style="font-size:12px;color:var(--tx3);line-height:1.5;font-style:italic">'+e.note.replace(/</g,'&lt;')+'</div>';
      card.innerHTML=html;
      hist.appendChild(card);
    });
  }
  
  // Render measurements + progress photos
  renderMeasurements();
  renderProgressPhotos();
  renderBodyCompInsight();
}

// Items 9 + 10: surface what the scale ALONE hides. Uses the body-composition data imported
// from a smart scale (comp.fatMassKg, comp.muscleKg). Only shows when the data supports a real,
// honest observation — never invents one. This is the view that stops a man quitting because
// "the scale won't move" when he's actually recomping.
function renderBodyCompInsight(){
  const box = document.getElementById('body-comp-insight');
  if(!box) return;
  // When the recomp card is already telling the fat/muscle story (it folds scale data in when there's
  // also training history), don't stack a second card saying the same thing — defer to the richer one.
  try{ const rr=(typeof recompRead==='function')?recompRead():null; if(rr && rr.bc){ box.style.display='none'; return; } }catch(_){}
  const entries = (ls('totry_body')||[]).filter(e => e.weight > 0);
  if(entries.length < 2){ box.style.display='none'; return; }
  // entries are newest-first. Compare a recent window to an earlier one (need comp data on both).
  const withComp = entries.filter(e => e.comp && (e.comp.fatMassKg!=null || e.comp.muscleKg!=null));
  let html = '';
  if(withComp.length >= 2){
    const recent = withComp[0], earlier = withComp[withComp.length-1];
    const dWeight = Math.round((recent.weight - earlier.weight)*10)/10;
    const dFat = (recent.comp.fatMassKg!=null && earlier.comp.fatMassKg!=null) ? Math.round((recent.comp.fatMassKg - earlier.comp.fatMassKg)*10)/10 : null;
    const dMuscle = (recent.comp.muscleKg!=null && earlier.comp.muscleKg!=null) ? Math.round((recent.comp.muscleKg - earlier.comp.muscleKg)*10)/10 : null;
    // Recomp win: weight roughly flat (or up) but fat down — the scale lies, the body's improving.
    if(dFat!=null && dFat < -0.3 && Math.abs(dWeight) <= 1.5){
      html += '<div style="font-size:13px;color:var(--tx2);line-height:1.6"><span style="color:var(--gr)">Recomposition.</span> Your weight barely moved ('+(dWeight>0?'+':'')+dWeight+'kg), but you\'ve lost '+Math.abs(dFat)+'kg of fat'+(dMuscle!=null && dMuscle>0?' and gained '+dMuscle+'kg of muscle':'')+'. The scale hides this. Your body is changing — keep going.</div>';
    } else if(dFat!=null && dMuscle!=null && dFat < 0 && dMuscle > 0){
      html += '<div style="font-size:13px;color:var(--tx2);line-height:1.6"><span style="color:var(--gr)">Fat down, muscle up.</span> Down '+Math.abs(dFat)+'kg fat, up '+dMuscle+'kg muscle. That\'s exactly the direction that matters.</div>';
    } else if(dMuscle!=null && dMuscle > 0.3){
      html += '<div style="font-size:13px;color:var(--tx2);line-height:1.6"><span style="color:var(--gr)">Building.</span> You\'ve added '+dMuscle+'kg of muscle. The work is showing.</div>';
    }
    // Protein ↔ muscle context (item 10): pair the muscle trend with recent protein intake.
    if(dMuscle!=null){
      const log = ls('totry_nutlog')||{}; const now=Date.now(); let pT=0,pD=0;
      Object.keys(log).forEach(k=>{const en=log[k]||[];if(!en.length)return;const ts=en[0].ts?new Date(en[0].ts).getTime():null;if(!ts||now-ts>14*86400000)return;const p=en.reduce((a,e)=>a+(e.pro||0),0);if(p>0){pT+=p;pD++;}});
      if(pD>=3){
        const avgPro=Math.round(pT/pD);
        html += '<div style="margin-top:8px;font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">Muscle '+(dMuscle>0?'+':'')+dMuscle+'kg · avg protein '+avgPro+'g/day over 2 weeks</div>';
      }
    }
  }
  if(html){ box.innerHTML = html; box.style.display='block'; }
  else { box.style.display='none'; }
}

// ── QUICK WEIGHT LOG ─────────────────────────────────────────
// Daily weight-only log, separate from the deeper weekly check-in.
// Lets users tap a daily weight without filling out the full weekly form.
function openQuickWeightLog(){
  const entries = ls('totry_body') || [];
  const todayStr = new Date().toLocaleDateString('en-AU', {day:'numeric', month:'short'});  // display only
  const todayFull = new Date().toLocaleDateString('en-AU');                                   // identity
  const todayEntry = entries.find(e => (e.ts ? new Date(e.ts).toLocaleDateString('en-AU') === todayFull : e.date === todayStr));
  const last = entries[0];
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:6px">Log today\'s weight</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px">Just the number. The deeper check-in is for Sundays.</p>' +
    '<div style="margin-bottom:14px">' +
      '<label style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;display:block">Weight (kg)</label>' +
      '<input type="number" id="quick-weight-in" step="0.1" inputmode="decimal" placeholder="' + (last?.weight || '75.0') + '" style="width:100%;font-size:24px;text-align:center;padding:14px;font-family:DM Mono,monospace" autofocus>' +
    '</div>' +
    (todayEntry && todayEntry.weight > 0 ? '<p style="font-size:11px;color:var(--go);margin-bottom:10px;text-align:center">Already logged today: ' + todayEntry.weight + 'kg — this will replace it.</p>' : '') +
    '<div style="display:flex;gap:8px">' +
      '<button class="btn primary" style="flex:1" onclick="saveQuickWeight()">Save</button>' +
      '<button class="btn" style="flex:1" onclick="closeModal(this)">Cancel</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(m);
  setTimeout(() => document.getElementById('quick-weight-in')?.focus(), 100);
}

function saveQuickWeight(){
  const w = parseFloat(document.getElementById('quick-weight-in')?.value || 0);
  if(!w || w < 20 || w > 400){
    showToast('Enter a real weight', 'Between 20 and 400 kg.');
    return;
  }
  const entries = ls('totry_body') || [];
  const todayStr = new Date().toLocaleDateString('en-AU', {day:'numeric', month:'short'});  // display only
  const todayFull = new Date().toLocaleDateString('en-AU');                                   // identity
  // Replace today's entry if it exists, else create a minimal one
  const existingIdx = entries.findIndex(e => (e.ts ? new Date(e.ts).toLocaleDateString('en-AU') === todayFull : e.date === todayStr));
  if(existingIdx >= 0){
    entries[existingIdx].weight = w;
    entries[existingIdx].ts = new Date().toISOString();
  } else {
    entries.unshift({
      date: todayStr,
      ts: new Date().toISOString(),
      weight: w,
      bf: 0, waist: 0, chest: 0,
      note: '',
      photo: null
    });
  }
  ls('totry_body', entries);
  document.querySelector('.modal-bg.open')?.remove();
  renderBody();
  try{ if(typeof HealthWrite!=='undefined') HealthWrite.weight(w); }catch(_){}
  showToast('Logged', w + 'kg saved.');
  haptic('success');
}

// ── BODY MEASUREMENTS ────────────────────────────────────────
function openMeasurementLogger(){
  const last = (ls('totry_measurements') || [])[0] || {};
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:90vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:6px">Log measurements</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px">Same tape, same time of day, every time. Decimal places ok (e.g. 87.5).</p>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">' +
      '<div><div class="eyebrow">Waist (cm)</div><input type="number" id="meas-waist" step="0.5" placeholder="' + (last.waist || '') + '" value="' + (last.waist || '') + '"></div>' +
      '<div><div class="eyebrow">Chest (cm)</div><input type="number" id="meas-chest" step="0.5" placeholder="' + (last.chest || '') + '" value="' + (last.chest || '') + '"></div>' +
      '<div><div class="eyebrow">Arm L (cm)</div><input type="number" id="meas-arml" step="0.5" placeholder="' + (last.armL || '') + '" value="' + (last.armL || '') + '"></div>' +
      '<div><div class="eyebrow">Arm R (cm)</div><input type="number" id="meas-armr" step="0.5" placeholder="' + (last.armR || '') + '" value="' + (last.armR || '') + '"></div>' +
      '<div><div class="eyebrow">Thigh L (cm)</div><input type="number" id="meas-thighl" step="0.5" placeholder="' + (last.thighL || '') + '" value="' + (last.thighL || '') + '"></div>' +
      '<div><div class="eyebrow">Thigh R (cm)</div><input type="number" id="meas-thighr" step="0.5" placeholder="' + (last.thighR || '') + '" value="' + (last.thighR || '') + '"></div>' +
      '<div><div class="eyebrow">Neck (cm)</div><input type="number" id="meas-neck" step="0.5" placeholder="' + (last.neck || '') + '" value="' + (last.neck || '') + '"></div>' +
      '<div><div class="eyebrow">Body fat % (opt)</div><input type="number" id="meas-bf" step="0.1" placeholder="' + (last.bf || '') + '" value="' + (last.bf || '') + '"></div>' +
    '</div>' +
    // Evolt 360 body scan section — for Revo gym users with access to the scanner
    '<details style="margin-bottom:14px">' +
      '<summary style="cursor:pointer;padding:10px 12px;background:var(--bg3);border:1px solid var(--bd);border-radius:8px;font-family:DM Mono,monospace;font-size:10px;color:var(--tx2);text-transform:uppercase;letter-spacing:0.1em;list-style:none">🔬 Add Evolt 360 scan data</summary>' +
      '<div style="padding:12px 2px 0">' +
        '<p style="font-size:11px;color:var(--tx3);margin-bottom:10px;line-height:1.5">Got a body scan at the gym (Evolt 360 / InBody)? Enter the key numbers from your printout to track composition over time.</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
          '<div><div class="eyebrow">Skeletal muscle (kg)</div><input type="number" id="meas-smm" step="0.1" placeholder="' + (last.smm || '') + '" value="' + (last.smm || '') + '"></div>' +
          '<div><div class="eyebrow">Body fat mass (kg)</div><input type="number" id="meas-fatmass" step="0.1" placeholder="' + (last.fatMass || '') + '" value="' + (last.fatMass || '') + '"></div>' +
          '<div><div class="eyebrow">Visceral fat level</div><input type="number" id="meas-visceral" step="0.5" placeholder="' + (last.visceral || '') + '" value="' + (last.visceral || '') + '"></div>' +
          '<div><div class="eyebrow">Total body water (%)</div><input type="number" id="meas-tbw" step="0.1" placeholder="' + (last.tbw || '') + '" value="' + (last.tbw || '') + '"></div>' +
          '<div><div class="eyebrow">BMR (cal)</div><input type="number" id="meas-bmr" step="1" placeholder="' + (last.bmr || '') + '" value="' + (last.bmr || '') + '"></div>' +
          '<div><div class="eyebrow">Evolt points</div><input type="number" id="meas-evoltpts" step="1" placeholder="' + (last.evoltPts || '') + '" value="' + (last.evoltPts || '') + '"></div>' +
        '</div>' +
      '</div>' +
    '</details>' +
    '<button class="btn primary" onclick="saveMeasurement()" style="margin-bottom:8px">Save snapshot</button>' +
    '<button class="btn" onclick="closeModal(this)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
}
function saveMeasurement(){
  const vals = ['waist','chest','arml','armr','thighl','thighr','neck','bf','smm','fatmass','visceral','tbw','bmr','evoltpts'];
  const keys = ['waist','chest','armL','armR','thighL','thighR','neck','bf','smm','fatMass','visceral','tbw','bmr','evoltPts'];
  const entry = {date: new Date().toLocaleDateString('en-AU'), ts: new Date().toISOString()};
  let any = false;
  vals.forEach((id, i) => {
    const v = parseFloat(document.getElementById('meas-' + id)?.value);
    if(v && v > 0){ entry[keys[i]] = v; any = true; }
  });
  if(!any){ showToast('Empty', 'Add at least one measurement.'); return; }
  const list = ls('totry_measurements') || [];
  list.unshift(entry);
  ls('totry_measurements', list.slice(0, 200));
  document.querySelector('.modal-bg.open')?.remove();
  renderMeasurements();
  showToast('Saved', 'Measurement snapshot logged.');
  haptic('success');
}
function renderMeasurements(){
  const list = ls('totry_measurements') || [];
  const summary = document.getElementById('measurements-summary');
  const history = document.getElementById('measurements-history');
  if(!summary || !history) return;
  
  if(!list.length){
    summary.textContent = 'Track waist, chest, arms, thighs. Tap "Log today" to add a snapshot.';
    history.innerHTML = '';
    return;
  }
  
  const cur = list[0];
  const first = list[list.length - 1];
  
  // Summary line: which dimensions changed and by how much
  const labels = {waist:'Waist', chest:'Chest', armL:'L arm', armR:'R arm', thighL:'L thigh', thighR:'R thigh', neck:'Neck', bf:'BF%'};
  const changes = [];
  Object.keys(labels).forEach(k => {
    if(cur[k] !== undefined && first[k] !== undefined && list.length > 1){
      const d = Math.round((cur[k] - first[k]) * 10) / 10;
      if(d !== 0) changes.push(labels[k] + ': ' + (d > 0 ? '+' : '') + d);
    }
  });
  
  summary.innerHTML = list.length === 1 ?
    '<span style="font-family:DM Mono,monospace">First snapshot logged ' + cur.date + ' — baseline set.</span>' :
    '<span style="font-family:DM Mono,monospace;color:var(--tx2)">' + list.length + ' snapshots · Change since baseline: ' + (changes.join(' · ') || 'no change yet') + '</span>';
  
  // Show last 5
  history.innerHTML = '';
  list.slice(0, 5).forEach((e, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'padding:8px 0;border-top:1px solid var(--bd);font-size:11px';
    const parts = [];
    Object.keys(labels).forEach(k => {
      if(e[k] !== undefined) parts.push(labels[k] + ' ' + e[k]);
    });
    row.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
      '<div style="flex:1"><div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">' + e.date + '</div>' +
      '<div style="color:var(--tx2);margin-top:2px;line-height:1.5">' + parts.join(' · ') + '</div></div>' +
      (i === 0 ? '<button onclick="deleteMeasurement(0)" style="background:none;border:none;color:var(--tx3);font-size:14px;cursor:pointer">×</button>' : '') +
    '</div>';
    history.appendChild(row);
  });
}
function deleteMeasurement(idx){
  if(!confirm('Delete this measurement snapshot?')) return;
  const list = ls('totry_measurements') || [];
  list.splice(idx, 1);
  ls('totry_measurements', list);
  renderMeasurements();
}

// ── PROGRESS PHOTOS ──────────────────────────────────────────
// Stored as base64 in localStorage. Stays on device. Capped at last 12 photos to manage size.
function handleProgressPhoto(event){
  const files = Array.from(event.target.files || []);
  if(!files.length) return;
  const images = files.filter(f => f.type.startsWith('image/'));
  if(!images.length){ showToast('Wrong file', 'Pick image files.'); return; }
  
  let processed = 0;
  const total = images.length;
  
  // Process each image: compress to max 720px long edge, store as JPEG
  // Every other image path in this file (the meal photo, the scale screenshot, the body photo) binds
  // reader.onerror and img.onerror. This one bound neither, so a HEIC the browser cannot decode, a
  // truncated file, or a photo picked from a cloud album that failed to download produced NOTHING: no
  // toast, no row, no error — the person tapped, waited, and concluded the app was broken. The
  // `processed === total` counter also never completed, so even the successful photos in a multi-select
  // were never rendered or reported.
  let failed = 0;
  const _photoFailed = (why) => {
    failed++;
    if(failed + processed >= total){
      if(typeof renderProgressPhotos === 'function') renderProgressPhotos();
      if(typeof showToast === 'function'){
        showToast(processed ? 'Some photos did not save' : 'Could not read that photo',
          processed ? (processed + ' of ' + total + ' saved. ' + failed + ' could not be read \u2014 try a JPEG or PNG.')
                    : 'This device could not read that image. A JPEG or PNG usually works.');
      }
    }
  };
  images.forEach((file, fileIdx) => {
    const reader = new FileReader();
    reader.onerror = () => _photoFailed('read');
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => _photoFailed('decode');
      img.onload = () => {
        const maxDim = 720;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        const photos = ls('totry_progress_photos') || [];
        photos.unshift({
          // Unique id even when several are added in the same millisecond
          id: Date.now() + fileIdx,
          date: new Date().toLocaleDateString('en-AU'),
          ts: new Date().toISOString(),
          dataUrl: dataUrl
        });
        ls('totry_progress_photos', photos.slice(0, 30));
        processed++;
        if(processed === total){
          renderProgressPhotos();
          showToast(total === 1 ? 'Photo saved' : total + ' photos saved', 'Stored on your device only.');
          haptic('success');
          event.target.value = '';
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
function renderProgressPhotos(){
  const grid = document.getElementById('progress-photo-grid');
  if(!grid) return;
  const photos = ls('totry_progress_photos') || [];
  if(!photos.length){
    grid.style.display = 'block';
    grid.innerHTML = '<div style="text-align:center;padding:20px;color:var(--tx3);font-size:12px;font-style:italic">No photos yet. Add one to start your timeline.</div>';
    return;
  }
  // Group photos by upload date so each date is its own labeled section
  grid.style.display = 'block';
  const byDate = {};
  photos.forEach(p => { (byDate[p.date] = byDate[p.date] || []).push(p); });
  // Sort dates newest-first using the ISO timestamp of the first photo in each group
  const dates = Object.keys(byDate).sort((a,b) => {
    const ta = new Date(byDate[a][0].ts || 0).getTime();
    const tb = new Date(byDate[b][0].ts || 0).getTime();
    return tb - ta;
  });
  grid.innerHTML = dates.map(date => {
    const tiles = byDate[date].map(p =>
      '<div onclick="openProgressPhotoViewer(' + p.id + ')" style="position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;cursor:pointer;background:var(--bg3)">' +
        '<img loading="lazy" decoding="async" src="' + p.dataUrl + '" style="width:100%;height:100%;object-fit:cover" alt="' + date + '">' +
      '</div>'
    ).join('');
    return '<div style="margin-bottom:14px">' +
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">' + date + ' · ' + byDate[date].length + (byDate[date].length === 1 ? ' photo' : ' photos') + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">' + tiles + '</div>' +
    '</div>';
  }).join('');
}
function openProgressPhotoViewer(id){
  const photos = ls('totry_progress_photos') || [];
  const p = photos.find(p => p.id === id);
  if(!p) return;
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">' + p.date + '</div>' +
    '<img loading="lazy" decoding="async" src="' + p.dataUrl + '" style="width:100%;border-radius:10px;background:#000;margin-bottom:12px">' +
    '<button class="btn danger" onclick="deleteProgressPhoto(' + p.id + ')" style="margin-bottom:8px">Delete this photo</button>' +
    '<button class="btn" onclick="closeModal(this)">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}
function deleteProgressPhoto(id){
  if(!confirm('Delete this progress photo? Cannot be undone.')) return;
  const photos = ls('totry_progress_photos') || [];
  ls('totry_progress_photos', photos.filter(p => p.id !== id));
  document.querySelector('.modal-bg.open')?.remove();
  renderProgressPhotos();
}
// Confirm the daily logs (weight + sleep). They already persist on entry; this gives a clear
// "committed" moment + feedback, and marks the day so Home can reflect it.
// The flag markDailyLogsDone writes was read by nothing at all, so "Done for today" gave a moment of
// completion and then looked exactly like it had before — tap it twice and you would not know. One
// reader, called after the write and on every Track render, so the button reflects the day it is in.
function renderDailyDoneState(){
  try{
    const btn = document.querySelector('button[onclick="markDailyLogsDone()"]');
    if(!btn) return;
    const today = new Date().toLocaleDateString('en-AU');
    const done = !!ls('totry_daily_logged_'+today);
    btn.textContent = done ? 'Logged for today \u2713' : 'Done for today';
    btn.classList.toggle('primary', !done);
    btn.style.opacity = done ? '0.72' : '';
  }catch(_){}
}
function markDailyLogsDone(){
  const today=new Date().toLocaleDateString('en-AU');
  const t=(ls('totry_trackers')||{})[today]||{sleep:0};
  const body=ls('totry_body')||[];
  const hasWeight = body.some(b=>b.date===today || (b.ts && new Date(b.ts).toLocaleDateString('en-AU')===today));
  ls('totry_daily_logged_'+today, 1);
  try{ renderDailyDoneState(); }catch(_){}
  const bits=[];
  if(hasWeight) bits.push('weight'); 
  if(t.sleep>0) bits.push(t.sleep+'h sleep');
  haptic('success');
  if(bits.length){ showToast('Logged for today', bits.join(' · ') + ' saved.'); }
  else { showToast('Nothing logged yet', 'Add your weight or sleep above first.'); }
}
function adjustTracker(type,delta){
  const today=new Date().toLocaleDateString('en-AU');
  const trackers=ls('totry_trackers')||{};
  if(!trackers[today])trackers[today]={water:0,sleep:0,steps:0};
  trackers[today][type]=Math.max(0,Math.round((trackers[today][type]+delta)*10)/10);
  ls('totry_trackers',trackers);
  // Sleep is shared with the readiness model (via totry_checkins). Mirror precise hours into today's
  // sleep check-in so readiness uses what you logged here, and Morning/Track never disagree.
  if(type==='sleep'){ try{ const _iso=new Date().toISOString().slice(0,10); const _ck=ls('totry_checkins')||[]; const _i=_ck.findIndex(c=>(c.ts||'').slice(0,10)===_iso && c.kind==='sleep'); const _e={kind:'sleep',scores:{sleep:trackers[today].sleep},ts:new Date().toISOString()}; if(_i>=0)_ck[_i]=_e; else _ck.unshift(_e); ls('totry_checkins',_ck.slice(0,300)); }catch(_){} }
  // Steps are shared with the coach/whole-person brief (via totry_today_steps). Keep them in lockstep
  // so logging steps here isn't invisible to the coach, and vice-versa. (Was two disconnected stores.)
  if(type==='steps'){ try{ ls('totry_today_steps', trackers[today].steps); }catch(_){} }
  updateTrackerDisplay();
  haptic('tap');
}
function updateTrackerDisplay(){
  // Called on every Track render, so the button is correct when the screen opens — not only in the
  // second after it is tapped. Without this the state resets visually at midnight-crossing or reload.
  try{ renderDailyDoneState(); }catch(_){}
  const today=new Date().toLocaleDateString('en-AU');
  const t=(ls('totry_trackers')||{})[today]||{water:0,sleep:0,steps:0};
  // 'water-count' belongs to renderWaterTracker() in the Nourish tab, which paints "1.2 / 2.5 L" from
  // totry_water_<date>. This function read totry_trackers, where nothing has ever written water — so
  // whenever it ran it replaced a real reading with a hardcoded 0 and a person's logged water vanished
  // from the screen. Two owners for one element; the one that has the data keeps it.
  const s=document.getElementById('sleep-count');const st=document.getElementById('steps-count');
  if(s)s.textContent=t.sleep;if(st)st.textContent=(t.steps||0).toLocaleString();
  // Honour the user's own sleep goal instead of a hardcoded "7-9 hours" — a target they set should
  // actually show, and the value goes green once they've met it.
  try{
    const _sg=parseFloat(ls('totry_sleep_goal'))||0;
    const _lbl=document.getElementById('sleep-target-lbl');
    if(_lbl) _lbl.textContent = _sg>0 ? ('Target: '+_sg+' hours') : 'Target: 7-9 hours';
    if(s){ const _met = _sg>0 ? (t.sleep>=_sg) : (t.sleep>=7); s.style.color = (t.sleep>0 && _met) ? 'var(--gr)' : ''; }
  }catch(_){}
  // Keep the weight "today" summary in sync too
  const body=ls('totry_body')||[];
  const todayWeight=body.find(b=>b.date===today || (b.ts && new Date(b.ts).toLocaleDateString('en-AU')===today));
  const sum=document.getElementById('bod-current-summary');
  if(sum){
    if(todayWeight){
      const unit=ls('totry_weight_unit')||'kg';
      sum.textContent='Logged today: '+todayWeight.weight+' '+unit;
      sum.style.color='var(--gr)';
    } else {
      sum.textContent='No log today';
      sum.style.color='var(--tx3)';
    }
  }
}

