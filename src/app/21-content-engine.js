// ── WEEKLY CONTENT ENGINE — To Try is the PRODUCER, never the editor ──────────────
// Assembles the real week (stats + discipline thread + session-proof clips) into a postable
// package: a storyboard (ordered clips + what each shows) + a ready caption. The user finishes in
// CapCut/IG/TikTok. To Try never stores or edits video — clips live in their camera roll.
function _weekProofClips(){
  // Gather session-proof attached to this week's sessions, for the storyboard.
  const now = Date.now(), wk = now - 7*86400000;
  let all = {}; try{ all = JSON.parse(localStorage.getItem('totry_session_proof')||'{}'); }catch(_){}
  const clips = [];
  Object.keys(all).forEach(id => {
    (all[id]||[]).forEach(p => { if(p && (p.at||0) >= wk) clips.push({ sessionId:id, kind:p.kind, name:p.name||'clip', thumb:p.thumb||null, at:p.at }); });
  });
  return clips.sort((a,b)=>a.at-b.at);
}
function _disciplineThread(){
  // The one trait working across vice / body / money / soul this week — the thing no single-purpose
  // app can show. Returns short factual strands the content + reflection can speak to.
  const s = _weekStats();
  const reclaimed = (typeof totalReclaimed==='function') ? totalReclaimed() : 0;
  const strands = [];
  if(s.wins>0) strands.push(s.wins+' urge'+(s.wins===1?'':'s')+' resisted');
  if(s.workouts>0) strands.push(s.workouts+' session'+(s.workouts===1?'':'s')+' trained');
  if(s.longestStreak>0) strands.push(s.longestStreak+'-day clean streak');
  if(reclaimed>0) strands.push(curSym()+reclaimed.toLocaleString()+' reclaimed');
  if(s.journalEntries>0) strands.push(s.journalEntries+' reflection'+(s.journalEntries===1?'':'s'));
  return { strands, stats:s, reclaimed };
}
async function generateWeeklyContent(){
  const box = document.getElementById('weekly-content-out');
  const btn = document.getElementById('weekly-content-btn');
  if(btn){ btn.textContent='Assembling\u2026'; btn.disabled=true; }
  try{
    const d = _disciplineThread();
    const clips = _weekProofClips();
    const identity = ls('totry_identity') || '';
    const sys = (typeof brotherSys==='function'?brotherSys():'') + 'You are a content producer helping someone document their self-improvement journey for TikTok/Reels. You do NOT edit video. You produce: (1) a short STORYBOARD — an ordered shot list telling this week\u2019s story using the clips and stats provided, each line "Shot N: <what to show> — <on-screen text>"; (2) a CAPTION — authentic, humble, faith-aware, not braggy, with 3-5 relevant hashtags. Return JSON: {"storyboard":["..."],"caption":"..."}. Return ONLY JSON.';
    const prompt = 'This week\u2019s real data: '+ (d.strands.join(', ')||'a quiet week') + '. '
      + (identity?('They are becoming: "'+identity+'". '):'')
      + 'They have '+clips.length+' proof clip(s) from their sessions to use. '
      + 'Make a storyboard that turns this into an honest 20-40s video, and a caption. If clips are few, lean on stat cards and one piece-to-camera.';
    const txt = await api(sys, [], prompt, 800, { timeout:35000 });
    let data=null; try{ data = JSON.parse((txt||'').replace(/```json|```/g,'').trim()); }catch(_){ data=null; }
    if(box){
      box.style.display='block';
      if(data && (data.storyboard || data.caption)){
        const board = (data.storyboard||[]).map((line,i)=>'<div style="display:flex;gap:8px;margin-bottom:7px"><div style="flex-shrink:0;width:20px;height:20px;border-radius:5px;background:var(--go);color:#1a1205;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:600">'+(i+1)+'</div><div style="flex:1;font-size:13px;color:var(--tx2);line-height:1.5">'+String(line).replace(/^shot\s*\d+\s*:?\s*/i,'').replace(/</g,'&lt;')+'</div></div>').join('');
        const cap = (data.caption||'').replace(/</g,'&lt;');
        box.innerHTML = '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px">Your storyboard \u00b7 '+clips.length+' clip'+(clips.length===1?'':'s')+' ready</div>'+
          board +
          '<div style="margin-top:14px;padding:12px;background:var(--bg3);border:1px solid var(--bd);border-radius:10px"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Caption</div><div id="weekly-caption-text" style="font-size:13px;color:var(--tx);line-height:1.6">'+cap+'</div><button class="btn" onclick="(function(){var t=document.getElementById(&quot;weekly-caption-text&quot;);if(t&&navigator.clipboard){navigator.clipboard.writeText(t.textContent).then(function(){showToast(&quot;Copied&quot;,&quot;Caption copied \u2014 paste it in your editor.&quot;);});}})()" style="margin-top:10px;width:auto;padding:8px 14px;font-size:12px;background:none;border:1px solid var(--go-bd);color:var(--go)">Copy caption</button></div>'+
          (clips.length ? '<div style="margin-top:12px"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Your clips (open these in your editor)</div><div style="display:flex;flex-wrap:wrap;gap:8px">'+clips.map(c=>c.thumb?'<img src="'+c.thumb+'" style="width:48px;height:48px;object-fit:cover;border-radius:8px">':'<div style="padding:8px 10px;background:var(--bg3);border:1px solid var(--bd);border-radius:8px;font-size:11px;color:var(--tx2)">\u{1F3AC} '+(c.name||'clip').slice(0,14)+'</div>').join('')+'</div></div>' : '<div style="margin-top:12px;font-size:11px;color:var(--tx3);line-height:1.5">No clips attached this week. Add proof to your sessions (in any workout) and they\u2019ll appear here for next week\u2019s package.</div>')+
          '<div style="margin-top:12px;font-size:11px;color:var(--tx3);line-height:1.5">To Try produces \u2014 you finish it in CapCut, Reels, or TikTok. Your videos stay in your camera roll.</div>';
      } else {
        box.innerHTML = '<div style="font-size:12px;color:var(--tx3)">Couldn\u2019t assemble it right now \u2014 try again shortly.</div>';
      }
    }
  }catch(e){ if(box){ box.style.display='block'; box.innerHTML='<div style="font-size:12px;color:var(--tx3)">Couldn\u2019t reach the producer right now. Try again shortly.</div>'; } }
  finally{ if(btn){ btn.textContent='\u{1F3AC} Make this week\u2019s content'; btn.disabled=false; } }
}

async function generateWeeklyReflection(){
  const box = document.getElementById('weekly-reflection-out');
  const btn = document.getElementById('weekly-reflection-btn');
  if(btn){ btn.textContent='Reflecting...'; btn.disabled=true; }
  try{
    const s = _weekStats();
    const ctx = (typeof _ptIntel==='function') ? _ptIntel() : '';
    const rd = (typeof computeReadiness==='function') ? computeReadiness() : null;
    const identity = ls('totry_identity') || '';
    const sys = brotherSys() + 'RIGHT NOW you\u2019re reflecting their WHOLE week back to them in one honest, encouraging paragraph (4-6 sentences) \u2014 connecting body, discipline, money and spirit the way only someone who sees all of a person could. Specific, never generic. Name the effort, not just the outcomes. Then, on a new line, ask ONE real, specific question drawn from a genuine tension in their week (e.g. trained hard but slipped twice \u2014 "what was going on those nights?"). Invite honest reflection, never judgment. Format the question on its own line prefixed exactly with "Q: ".';
    const prompt = 'This week: ' + s.workouts + ' workouts, ' + s.nutDays + ' days food logged, ' + s.journalEntries + ' journal entries, ' + s.wins + ' urges resisted, ' + s.slips7 + ' slips, longest clean streak ' + s.longestStreak + ' days' + (s.reclaimed>0 ? (', '+curSym()+s.reclaimed+' reclaimed from vices toward their freedom') : '') + '.' + (identity?' They are becoming: "'+identity+'".':'') + (rd?' Current readiness: '+rd.level+'.':'') + ' Training context:' + ctx + '\n\nWrite their weekly reflection as an older sibling who sees their whole life, then the one honest question.';
    const resp = await api(sys, [], prompt, 550);
    if(box){
      box.style.display='block';
      // Split the reflection from the "Q:" question so the question can become a tappable prompt
      // into the companion/coach — the weekly check-in becomes a short conversation, not a monologue.
      const raw = (resp||'');
      const qMatch = raw.match(/\bQ:\s*(.+)$/s);
      const reflection = qMatch ? raw.slice(0, qMatch.index).trim() : raw.trim();
      const question = qMatch ? qMatch[1].trim() : '';
      box.innerHTML = '<div style="font-family:Cormorant Garamond,serif;font-size:15px;font-style:italic;color:var(--tx);line-height:1.8;white-space:pre-wrap">'+reflection.replace(/</g,'&lt;')+'</div>'+
        (question ? '<div style="margin-top:14px;padding:13px 15px;background:var(--bg3);border:1px solid var(--go-bd);border-radius:12px"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">One honest question</div><div style="font-size:14px;color:var(--tx);line-height:1.6;margin-bottom:10px">'+question.replace(/</g,'&lt;')+'</div><button class="btn" onclick="(function(){var q='+JSON.stringify(question).replace(/"/g,'&quot;')+';try{goCoach? goCoach(q):go(\'coach\');}catch(e){go(\'coach\')}})()" style="width:auto;padding:8px 14px;font-size:12px;background:none;border:1px solid var(--go-bd);color:var(--go)">Answer with my coach</button></div>' : '');
    }
    ls('totry_weekly_reflection_at', Date.now());
  }catch(e){ if(box){ box.style.display='block'; box.innerHTML='<div style="font-size:12px;color:var(--tx3)">Couldn\u2019t reach the coach right now. Try again shortly.</div>'; } }
  finally{ if(btn){ btn.textContent='Reflect on my week'; btn.disabled=false; } }
}

function getUnifiedTraining(){
  const lifts = (ls('totry_workouts') || []).map(w => ({
    id: 'hevy_' + w.id,
    // A Strava-pushed Hevy session lands in totry_workouts with a "stravahevy_" id. Capture that from
    // the ORIGINAL id here — the unified id above prefixes everything with "hevy_", which is exactly
    // what silently broke the dedup (a "hevy_stravahevy_9" id no longer startsWith "stravahevy_").
    fromStrava: String(w.id||'').startsWith('stravahevy_'),
    // Default to 'manual', not 'hevy'. Every real Hevy import stamps source:'hevy' explicitly
    // (syncHevyWorkouts / importHevyCSV), so an unstamped row is one logged here — defaulting the
    // other way credited Hevy for the person's own work and tagged their history HEVY.
    source: w.source || 'manual',
    kind: (w.exercises && w.exercises.length) ? 'strength' : (_isCardioType(w.type) ? 'cardio' : 'strength'),
    title: w.splitFocus || w.type || 'Workout',
    ts: w.ts,
    durationMin: w.durationMin || w.durationMinutes || null,
    // Use the honest effective-load volume so the row matches the detail modal and counts
    // assisted/bodyweight correctly — not the raw stored import value.
    volume: (typeof displayVolume==='function' && w.exercises && w.exercises.length) ? displayVolume(w) : (w.volume || 0),
    sets: w.completedSets || 0,
    exercises: (w.exercises || []).length,
    calories: w.calories || null,
    distance: w.distance || null,
    hr: w.averageHeartRate || w.avgHeartRate || null,
    activityType: w.type || null,
    raw: w
  }));
  // A Hevy session can land in totry_workouts TWICE: once via the Hevy API (id "hevy_…") and once as
  // a Strava-pushed copy converted to a workout (id "stravahevy_…"). Same session, two rows — the old
  // dedup only compared Strava cardio against lifts, never two lifts against each other, so this
  // doubled everywhere (the loop, the week counts, Nourish's burn). Drop the Strava-derived copy
  // whenever a direct import overlaps it in time; keep it only when it's the sole copy of that session.
  const _primaryLifts = lifts.filter(l => !l.fromStrava);
  const liftsDeduped = lifts.filter(l => {
    if(!l.fromStrava) return true;
    return !_primaryLifts.some(p => p.kind === 'strength' && _sessionsOverlap(p.ts, l.ts, 90));
  });
  const cardio = (ls('totry_strava_activities') || []).map(a => ({
    id: 'strava_' + a.id,
    source: 'strava',
    kind: _isStrengthType(a.type) ? 'strength' : 'cardio',
    title: a.name || a.type || 'Activity',
    ts: a.date,
    durationMin: a.moving_time ? Math.round(a.moving_time/60) : null,
    volume: 0,
    sets: 0,
    exercises: 0,
    calories: a.calories || null,
    distance: a.distance || null,
    hr: a.avg_hr || a.average_heartrate || null,
    maxHr: a.max_hr || null,
    effort: a.suffer_score || null,
    elapsedMin: a.elapsed_time ? Math.round(a.elapsed_time/60) : null,
    activityType: a.type,
    raw: a
  }));

  // DEDUP: a Hevy lift pushed to Strava shows up as a Strava activity. Drop the Strava copy when a
  // Hevy lift exists within 90 min — REGARDLESS of how Strava typed it (it often arrives typed as
  // "WeightTraining" → classified cardio, which the old kind-only check missed, so the same session
  // appeared twice). We match on time proximity, and treat a same-name match as a definite duplicate.
  const liftSessions = liftsDeduped.filter(l => l.kind === 'strength').map(l => ({ ts: l.ts, name: String(l.title||'').toLowerCase().trim() }));
  const norm = s => String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
  // DEFINITIVE dedup: when a Hevy-via-Strava activity is converted to a structured workout, that
  // workout's id is literally "stravahevy_<the Strava activity id>". So the raw Strava activity with
  // that id is the SAME session — drop it by ID, not by fuzzy time/name. This is what was still
  // doubling: Hevy and Strava stamp slightly different times, so the 90-min proximity check missed it.
  const convertedStravaIds = new Set();
  (ls('totry_workouts')||[]).forEach(w => { const id=String(w.id||''); if(id.indexOf('stravahevy_')===0) convertedStravaIds.add(id.slice(11)); });
  const deduped = cardio.filter(c => {
    if(c.raw && c.raw.id!=null && convertedStravaIds.has(String(c.raw.id))) return false;   // its structured copy is already in the list
    const cName = norm(c.title);
    // Same name as a Hevy lift within a wider window → definitely the same pushed session.
    const nameDup = liftSessions.some(l => l.name && cName && l.name === cName && _sessionsOverlap(l.ts, c.ts, 180));
    if(nameDup) return false;
    // Strength-typed Strava activity overlapping a Hevy lift in time → the classic push duplicate.
    if(c.kind === 'strength'){
      const timeDup = liftSessions.some(l => _sessionsOverlap(l.ts, c.ts, 90));
      if(timeDup) return false;
    }
    return true;
  });

  // Merge, newest first.
  return [...liftsDeduped, ...deduped].sort((a,b) => new Date(b.ts||0) - new Date(a.ts||0));
}
// Weekly training stats from the unified set — powers the verdict + adherence honestly.
function getUnifiedWeekStats(){
  const now = Date.now();
  const weekAgo = now - 7*86400000;
  const week = getUnifiedTraining().filter(t => t.ts && new Date(t.ts).getTime() >= weekAgo);
  const strength = week.filter(t => t.kind === 'strength');
  const cardio = week.filter(t => t.kind === 'cardio');
  const totalMin = week.reduce((a,t) => a + (t.durationMin||0), 0);
  const totalVol = strength.reduce((a,t) => a + (t.volume||0), 0);
  const totalDist = cardio.reduce((a,t) => a + (t.distance||0), 0);
  const totalCals = week.reduce((a,t) => a + (t.calories||0), 0);
  return {
    sessions: week.length, strengthCount: strength.length, cardioCount: cardio.length,
    totalMinutes: totalMin, totalVolumeKg: Math.round(totalVol),
    totalDistanceKm: +(totalDist/1000).toFixed(1), totalCalories: Math.round(totalCals)
  };
}

// Surface synced Strava activities — runs, rides, etc — so connecting Strava has visible benefit.
function renderStravaActivities(){ renderUnifiedTraining(); }
// Training trend: once there are 3+ cardio sessions of the same activity, compare the most
// recent few against the prior few for pace (distance activities) or HR efficiency. Returns a
// short honest sentence, or '' if there isn't enough data yet (so it never fabricates a trend).
function getTrainingTrend(){
  const all = (typeof getUnifiedTraining==='function') ? getUnifiedTraining() : [];
  const cardio = all.filter(t => t.kind==='cardio' && t.ts).sort((a,b)=>new Date(a.ts)-new Date(b.ts));
  if(cardio.length < 4) return '';
  // Group by a normalized activity label.
  const byType = {};
  cardio.forEach(t => { const k=(t.activityType||t.title||'cardio').toLowerCase(); (byType[k]=byType[k]||[]).push(t); });
  // Pick the activity with the most sessions (and at least 4).
  let best=null, bestN=0;
  Object.entries(byType).forEach(([k,arr])=>{ if(arr.length>bestN){ best=arr; bestN=arr.length; } });
  if(!best || best.length < 4) return '';
  const half = Math.floor(best.length/2);
  const older = best.slice(0, half);
  const recent = best.slice(half);
  const label = (best[0].title || best[0].activityType || 'sessions');
  // Distance activities → compare pace (sec/km, lower is faster).
  const paceOf = arr => {
    const valid = arr.filter(t=>t.distance && t.durationMin);
    if(!valid.length) return null;
    const tot = valid.reduce((a,t)=>a + (t.durationMin*60)/(t.distance/1000), 0);
    return tot/valid.length;
  };
  const oP=paceOf(older), rP=paceOf(recent);
  if(oP && rP){
    const diff = oP - rP; // positive = faster now
    if(Math.abs(diff) >= 5){
      const mmss = sec => Math.floor(sec/60)+"'"+String(Math.round(sec%60)).padStart(2,'0')+'"';
      return diff>0
        ? 'Your '+label+' pace is improving — now ~'+mmss(rP)+'/km (was ~'+mmss(oP)+'/km).'
        : 'Your '+label+' pace has eased to ~'+mmss(rP)+'/km. Some weeks are like that.';
    }
    return 'Your '+label+' pace is holding steady around '+Math.floor(rP/60)+"'"+String(Math.round(rP%60)).padStart(2,'0')+'"/km.';
  }
  // Otherwise → compare avg HR (lower for similar work can mean improving fitness).
  const hrOf = arr => { const v=arr.filter(t=>t.hr); return v.length ? v.reduce((a,t)=>a+t.hr,0)/v.length : null; };
  const oH=hrOf(older), rH=hrOf(recent);
  if(oH && rH && Math.abs(oH-rH) >= 3){
    return rH < oH
      ? 'Your average heart rate on '+label+' is trending down ('+Math.round(rH)+' vs '+Math.round(oH)+' bpm) — often a sign of improving fitness.'
      : 'Your average heart rate on '+label+' is up a little lately ('+Math.round(rH)+' bpm).';
  }
  return '';
}
function renderUnifiedTraining(){
  const card = document.getElementById('pt-strava-card');
  if(!card) return;
  const all = getUnifiedTraining();
  const hasStrava = !!ls('totry_strava_token');
  const hasHevy = !!ls('totry_hevy_api_key');
  // First-run / empty state. The history panel is full of analytics cards (PRs, muscle volume,
  // strength curves) that are hollow with no data — which is exactly what made testers think it
  // was broken ("couldn't see anything"). When there's no training yet, show ONE clear guidance
  // card and hide the empty analytics. The moment real data syncs, flip to the full view.
  const emptyBox = document.getElementById('pt-train-empty');
  const populated = document.getElementById('pt-history-populated');
  if(!all.length){
    if(populated) populated.style.display = 'none';
    if(emptyBox){
      const connected = [];
      if(hasStrava) connected.push('Strava');
      if(hasHevy) connected.push('Hevy');
      let body;
      if(connected.length){
        body = '<div style="font-size:14px;color:var(--tx);margin-bottom:8px">'+connected.join(' &amp; ')+' connected \u2713</div>'+
          '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:14px">No workouts have come through yet — that\u2019s normal before your first session. Record a workout in '+connected.join(' or ')+', then tap Refresh below and it\u2019ll appear here with your stats.</div>'+
          (hasStrava ? '<button class="btn primary" onclick="syncStravaActivities();showToast(\'Syncing\',\'Checking Strava\u2026\')" style="width:auto;padding:10px 18px;font-size:13px">Refresh now</button>' : '');
      } else {
        body = '<div style="font-size:14px;color:var(--tx);margin-bottom:8px">Let’s get you training</div>'+
          '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:14px">Already have a plan, or use Hevy / Strava? Link it and the coach works around it. Starting from nothing? I’ll build you a plan and tell you today’s session — no guesswork.</div>'+
          '<button class="btn primary" onclick="setupTraining()" style="width:auto;padding:10px 18px;font-size:13px">Set up my training</button>';
      }
      emptyBox.innerHTML = '<div class="card" style="text-align:center;padding:24px 18px"><div style="font-size:30px;margin-bottom:10px">\ud83c\udfcb\ufe0f</div>'+body+'</div>';
      emptyBox.style.display = 'block';
    }
    card.style.display = 'none';
    return;
  }
  if(emptyBox) emptyBox.style.display = 'none';
  if(populated) populated.style.display = 'block';
  const w = getUnifiedWeekStats();
  const typeEmoji = (t) => {
    const item = t || {};
    if(item.kind === 'strength') return '\ud83c\udfcb\ufe0f';
    const x = (item.activityType||'').toLowerCase();
    if(x.includes('run')) return '\ud83c\udfc3';
    if(x.includes('ride')||x.includes('cycl')||x.includes('bike')) return '\ud83d\udeb4';
    if(x.includes('swim')) return '\ud83c\udfca';
    if(x.includes('walk')||x.includes('hike')) return '\ud83d\udeb6';
    return '\ud83d\udcaa';
  };
  const srcDot = (src) => {
    if(src === 'strava') return '<span class="src-tag" style="color:#FC4C02">STRAVA</span>';
    if(src === 'hevy') return '<span class="src-tag" style="color:var(--go)">HEVY</span>';
    if(src === 'screenshot') return '<span class="src-tag">SCREENSHOT</span>';
    if(src === 'manual') return '<span class="src-tag">LOGGED</span>';
    return '';
  };
  const fmtMeta = (t) => {
    const parts = [];
    if(t.distance) parts.push((t.distance/1000).toFixed(1)+'km');
    if(t.durationMin) parts.push(t.durationMin+'min');
    if(t.volume) parts.push(Math.round(t.volume).toLocaleString()+'kg');
    if(t.sets) parts.push(t.sets + (t.sets === 1 ? ' set' : ' sets'));
    if(t.calories) parts.push(Math.round(t.calories)+' cal');
    if(t.hr) parts.push(Math.round(t.hr)+' bpm');
    return parts.join(' \u00b7 ');
  };
  const rows = all.slice(0,10).map(t => {
    const when = t.ts ? new Date(t.ts).toLocaleDateString('en-AU',{day:'numeric',month:'short'}) : '';
    return '<div class="strava-activity" onclick="openEditTraining(&quot;'+t.id+'&quot;)" style="display:flex;align-items:center;gap:10px;cursor:pointer">'+
      '<span style="font-size:17px;flex-shrink:0">'+typeEmoji(t)+'</span>'+
      '<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px"><span style="font-size:13px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(t.title||'Session').replace(/</g,'&lt;')+'</span>'+srcDot(t.source)+'</div>'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);margin-top:2px">'+fmtMeta(t)+'</div></div>'+
      '<span style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);flex-shrink:0">'+when+' ›</span></div>';
  }).join('');
  // Weekly summary strip
  const summaryBits = [];
  if(w.strengthCount) summaryBits.push(w.strengthCount + ' strength');
  if(w.cardioCount) summaryBits.push(w.cardioCount + ' cardio');
  const detailBits = [];
  if(w.totalMinutes) detailBits.push(w.totalMinutes + ' min');
  if(w.totalVolumeKg) detailBits.push(w.totalVolumeKg.toLocaleString() + 'kg lifted');
  if(w.totalDistanceKm) detailBits.push(w.totalDistanceKm + 'km');
  const refreshBtn = hasStrava ? '<button class="btn" onclick="syncStravaActivities();showToast(\'Syncing\',\'Pulling latest\u2026\')" style="width:auto;padding:5px 10px;font-size:11px;background:var(--bg3);border:1px solid var(--bd)">Refresh</button>' : '';
  card.innerHTML = '<div class="card">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'+
      '<div class="card-hd" style="margin-bottom:0">All training</div>'+ refreshBtn +
    '</div>'+
    (summaryBits.length ? '<div style="font-size:12px;color:var(--go);margin-bottom:2px">This week: '+summaryBits.join(' \u00b7 ')+'</div>' : '')+
    (detailBits.length ? '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);margin-bottom:12px">'+detailBits.join(' \u00b7 ')+'</div>' : '<div style="margin-bottom:10px"></div>')+
    (function(){ const tr = (typeof getTrainingTrend==='function') ? getTrainingTrend() : ''; return tr ? '<div style="font-size:11px;color:var(--bl);background:var(--bg3);border-radius:8px;padding:9px 11px;margin-bottom:12px;line-height:1.5">\ud83d\udcc8 '+tr+'</div>' : ''; })()+
    rows +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-align:center;margin-top:10px">' + (function(){
      const srcs = new Set(all.map(t=>t.source));
      const names = []; if(srcs.has('hevy')) names.push('Hevy'); if(srcs.has('strava')) names.push('Strava'); if(srcs.has('screenshot')) names.push('screenshots'); if(srcs.has('manual')||srcs.has(undefined)) names.push('logged');
      if(names.length>1) return names.join(' + ') + ', merged \u00b7 duplicates removed';
      if(names.length===1) return 'From your ' + names[0];
      return 'All your training';
    })() + '</div>'+
    '</div>';
  card.style.display = 'block';
}

function loadTodaySplitCard(){
  const split=getUserSplit();const ti=tIdx();const today=split[ti];
  const nameEl=document.getElementById('pt-today-split-name');const detailEl=document.getElementById('pt-today-split-detail');
  const hf=document.getElementById('today-focus');const hd=document.getElementById('today-detail');
  const wrap=document.getElementById('home-today-mission-wrap');
  // If the user trains from Hevy, surface THEIR real routines (WS2). If they've picked today's
  // routine, show it with last weights; otherwise prompt them to pick from their actual Hevy routines.
  if(typeof isHevyUser === 'function' && isHevyUser()){
    const routines = ls('totry_hevy_routines') || [];
    const todayR = (typeof getTodayHevyRoutine === 'function') ? getTodayHevyRoutine() : null;
    if(todayR){
      if(nameEl) nameEl.textContent = todayR.title;
      const exLines = (todayR.exercises || []).slice(0, 8).map(ex => {
        const last = (typeof getLastWeightForExercise === 'function') ? getLastWeightForExercise(ex.name, ex.templateId) : null;
        const lastTxt = last ? ' \u00b7 last ' + last.weight + 'kg\u00d7' + last.reps : '';
        const tgt = ex.targetSets ? ex.targetSets + '\u00d7' + (ex.targetReps || '') : '';
        return '<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;font-size:12px"><span style="color:var(--tx2)">' + ex.name + '</span><span style="color:var(--tx3);font-family:DM Mono,monospace;font-size:10px;white-space:nowrap">' + tgt + lastTxt + '</span></div>';
      }).join('');
      if(detailEl) detailEl.innerHTML = exLines + '<div style="margin-top:8px;font-size:11px;color:var(--tx3);cursor:pointer" onclick="openHevyTodayPicker()">Change today\u2019s routine</div>';
      if(hf) hf.textContent = todayR.title;
      if(hd) hd.innerHTML = (todayR.exercises||[]).length + ' exercises from your Hevy routine';
      if(wrap) wrap.style.display = 'block';
    } else {
      if(nameEl) nameEl.textContent = 'Pick today\u2019s routine';
      const pickHtml = 'Choose which of your <b>' + routines.length + '</b> Hevy routine' + (routines.length===1?'':'s') + ' you\u2019re training today:' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">' +
        routines.slice(0, 8).map(r => '<button class="btn" style="width:auto;padding:7px 12px;font-size:12px;background:var(--bg3);border:1px solid var(--bd)" onclick="setTodayHevyRoutine(\'' + r.hevyId + '\')">' + r.title + '</button>').join('') +
        '</div>';
      if(detailEl) detailEl.innerHTML = pickHtml;
      // Mirror onto the HOME mission so it never shows a stale app-split day for Hevy users.
      if(hf) hf.textContent = 'Pick today\u2019s routine';
      if(hd) hd.innerHTML = pickHtml;
      if(wrap) wrap.style.display = 'block';
    }
    return;
  }
  // Fallback: linked to Hevy but routines not loaded yet.
  const hevyLinked = !!ls('totry_hevy_api_key');
  if(hevyLinked){
    if(wrap) wrap.style.display='none';
    if(nameEl) nameEl.textContent='Your routines are in Hevy';
    if(detailEl) detailEl.innerHTML='You\u2019re linked to Hevy \u2014 <span class="tlink" onclick="fetchHevyRoutines()">load your routines</span> to see today\u2019s session here.';
    return;
  }
  
  // Start the routine this day is bound to. The split stores it by NAME, so a rename or a delete
  // leaves the day pointing at something that is gone — say so plainly rather than doing nothing.
  window._startAssignedRoutine = function(){
    try{
      const d = (typeof getUserSplit==='function' ? getUserSplit() : [])[(typeof tIdx==='function'?tIdx():0)] || {};
      const list = ls('totry_routines') || [];
      const match = list.find(r => r && (r.name === d.routine || r.title === d.routine));
      if(!match){
        if(typeof showToast==='function') showToast('That routine is gone', '“' + (d.routine||'It') + '” was deleted or renamed. Pick another in Routines & Split.');
        return;
      }
      if(typeof setPTTab==='function') setPTTab('log');
      // loadRoutine takes the routine's ID, not its index — passing an index finds nothing and
      // returns silently, which would have made this button another control that does nothing.
      if(typeof loadRoutine==='function') loadRoutine(match.id);
    }catch(_){ }
  };

  // A ROUTINE ASSIGNED TO TODAY IS THE WHOLE POINT OF ASSIGNING IT. The split editor's only routine
  // control wrote totry_split[i].routine and NOTHING read it — not this card, not the coach, nothing
  // loaded it into a session. So a person followed the app's own instruction ("assign it to today"),
  // and the card kept telling them to do the thing they had just done. Name it, and let them start it.
  if(today && today.routine && !today.focus){
    if(nameEl)nameEl.textContent=String(today.routine);
    if(detailEl)detailEl.innerHTML='Assigned to today. <span class="tlink" onclick="_startAssignedRoutine()">Start this routine</span>';
    if(wrap) wrap.style.display='';
    return;
  }

  if(!today || !today.focus){
    // No routine assigned for today
    if(nameEl)nameEl.textContent='No routine set for today';
    if(detailEl)detailEl.innerHTML='Build a routine in <span class="tlink" onclick="setPTTab(\'routines\')">Routines &amp; Split</span> and assign it to today.';
    if(wrap) wrap.style.display='none';
    return;
  }
  
  const isRest = today.rest === true || /^rest/i.test(today.focus||'');
  
  if(isRest){
    // Rest day — celebrate the recovery, don't nag about logging
    if(nameEl)nameEl.textContent='😴 Rest day';
    if(detailEl)detailEl.textContent='Recovery is part of the program. Rest well — you train again tomorrow.';
    if(hf){
      hf.textContent='😴 Rest day';
      if(hd)hd.textContent='Recovery is part of the program. Rest is where the growth happens.';
    }
    if(wrap) wrap.style.display='block';
    return;
  }
  
  if(nameEl)nameEl.textContent='\u2605 Today: '+today.focus;
  if(detailEl)detailEl.textContent=today.detail||'';
  if(hf){
    hf.textContent='\u2605 Today: '+today.focus;
    if(hd)hd.textContent=(today.detail||'')+(today.detail?'\n\n':'')+'Log your session in the Workout tab.';
  }
  if(wrap) wrap.style.display='block';
}
// Comprehensive exercise database - guaranteed distinct exercises per body part
const EXERCISE_DB = {
  chest: [
    {name:'Bench Press',equipment:'Barbell',primary:'Chest',secondary:'Triceps, Shoulders'},
    {name:'Incline Bench Press',equipment:'Barbell',primary:'Upper Chest',secondary:'Shoulders'},
    {name:'Dumbbell Bench Press',equipment:'Dumbbells',primary:'Chest',secondary:'Triceps'},
    {name:'Incline Dumbbell Press',equipment:'Dumbbells',primary:'Upper Chest',secondary:'Shoulders'},
    {name:'Chest Fly',equipment:'Dumbbells',primary:'Chest'},
    {name:'Cable Crossover',equipment:'Cable',primary:'Chest'},
    {name:'Push-Up',equipment:'Bodyweight',primary:'Chest',secondary:'Triceps, Core'},
    {name:'Dips',equipment:'Bodyweight',primary:'Lower Chest',secondary:'Triceps'},
    {name:'Pec Deck',equipment:'Machine',primary:'Chest'},
    {name:'Decline Bench Press',equipment:'Barbell',primary:'Lower Chest'},
    {name:'Landmine Press',equipment:'Barbell',primary:'Chest',secondary:'Shoulders'},
    {name:'Smith Machine Bench Press',equipment:'Smith Machine',primary:'Chest'},
    {name:'Incline Cable Fly',equipment:'Cable',primary:'Upper Chest'},
    {name:'Low Cable Fly',equipment:'Cable',primary:'Lower Chest'},
    {name:'Machine Chest Press',equipment:'Machine',primary:'Chest',secondary:'Triceps'},
    {name:'Incline Machine Press',equipment:'Machine',primary:'Upper Chest'},
    {name:'Decline Dumbbell Press',equipment:'Dumbbells',primary:'Lower Chest'},
    {name:'Svend Press',equipment:'Plate',primary:'Chest'},
    {name:'Floor Press',equipment:'Barbell',primary:'Chest',secondary:'Triceps'},
    {name:'Weighted Dip',equipment:'Bodyweight',primary:'Lower Chest',secondary:'Triceps'},
    {name:'Incline Push-Up',equipment:'Bodyweight',primary:'Upper Chest'},
    {name:'Assisted Dip',equipment:'Machine',primary:'Lower Chest',secondary:'Triceps',tracking:'assisted'},
    {name:'Band-Assisted Dip',equipment:'Bands',primary:'Lower Chest',secondary:'Triceps',tracking:'assisted'},
    {name:'Guillotine Press',equipment:'Barbell',primary:'Chest'},
    {name:'Plate Squeeze Press',equipment:'Plate',primary:'Chest'},
    {name:'Cable Press',equipment:'Cable',primary:'Chest'},
    {name:'Reverse-Grip Bench Press',equipment:'Barbell',primary:'Upper Chest',secondary:'Triceps'},
    {name:'Squeeze Press',equipment:'Dumbbells',primary:'Chest'},
    {name:'Hex Press',equipment:'Dumbbells',primary:'Chest',secondary:'Triceps'},
    {name:'Deficit Push-Up',equipment:'Bodyweight',primary:'Chest',tracking:'bodyweight'},
    {name:'Cable Incline Press',equipment:'Cable',primary:'Upper Chest'},
    {name:'Machine Fly',equipment:'Machine',primary:'Chest'},
    {name:'Single-Arm Cable Fly',equipment:'Cable',primary:'Chest'},
    {name:'Spoto Press',equipment:'Barbell',primary:'Chest',secondary:'Triceps'},
    {name:'Larsen Press',equipment:'Barbell',primary:'Chest'},
    {name:'Archer Push-Up',equipment:'Bodyweight',primary:'Chest',tracking:'bodyweight'},
    {name:'Resistance Band Press',equipment:'Bands',primary:'Chest'},
    {name:'Decline Cable Fly',equipment:'Cable',primary:'Lower Chest'},
    {name:'Incline Smith Press',equipment:'Smith Machine',primary:'Upper Chest'},
  ],
  back: [
    {name:'Pull-Up',equipment:'Bodyweight',primary:'Back',secondary:'Biceps'},
    {name:'Chin-Up',equipment:'Bodyweight',primary:'Back',secondary:'Biceps'},
    {name:'Lat Pulldown',equipment:'Cable',primary:'Lats'},
    {name:'Barbell Row',equipment:'Barbell',primary:'Back'},
    {name:'Dumbbell Row',equipment:'Dumbbells',primary:'Back'},
    {name:'Seated Cable Row',equipment:'Cable',primary:'Mid Back'},
    {name:'T-Bar Row',equipment:'Barbell',primary:'Back'},
    {name:'Deadlift',equipment:'Barbell',primary:'Back',secondary:'Hamstrings, Glutes'},
    {name:'Romanian Deadlift',equipment:'Barbell',primary:'Hamstrings',secondary:'Back'},
    {name:'Face Pull',equipment:'Cable',primary:'Rear Delts',secondary:'Upper Back'},
    {name:'Pendlay Row',equipment:'Barbell',primary:'Back'},
    {name:'Single-Arm Lat Pulldown',equipment:'Cable',primary:'Lats'},
    {name:'Wide-Grip Lat Pulldown',equipment:'Cable',primary:'Lats'},
    {name:'Close-Grip Lat Pulldown',equipment:'Cable',primary:'Lats'},
    {name:'Chest-Supported Row',equipment:'Machine',primary:'Mid Back'},
    {name:'Machine Row',equipment:'Machine',primary:'Back'},
    {name:'Inverted Row',equipment:'Bodyweight',primary:'Back',secondary:'Biceps'},
    {name:'Meadows Row',equipment:'Barbell',primary:'Back'},
    {name:'Straight-Arm Pulldown',equipment:'Cable',primary:'Lats'},
    {name:'Rack Pull',equipment:'Barbell',primary:'Back',secondary:'Traps'},
    {name:'Good Morning',equipment:'Barbell',primary:'Lower Back',secondary:'Hamstrings'},
    {name:'Hyperextension',equipment:'Bodyweight',primary:'Lower Back',secondary:'Glutes'},
    {name:'Seal Row',equipment:'Barbell',primary:'Back'},
    {name:'Assisted Pull-Up',equipment:'Machine',primary:'Back',secondary:'Biceps',tracking:'assisted'},
    {name:'Assisted Chin-Up',equipment:'Machine',primary:'Back',secondary:'Biceps',tracking:'assisted'},
    {name:'Band-Assisted Pull-Up',equipment:'Bands',primary:'Back',secondary:'Biceps',tracking:'assisted'},
    {name:'Kroc Row',equipment:'Dumbbells',primary:'Back'},
    {name:'Gironda Row',equipment:'Cable',primary:'Back'},
    {name:'Neutral-Grip Pull-Up',equipment:'Bodyweight',primary:'Back',secondary:'Biceps',tracking:'bodyweight'},
    {name:'Weighted Pull-Up',equipment:'Bodyweight',primary:'Back',secondary:'Biceps',tracking:'weighted_bodyweight'},
    {name:'Wide-Grip Pull-Up',equipment:'Bodyweight',primary:'Lats',tracking:'bodyweight'},
    {name:'Renegade Row',equipment:'Dumbbells',primary:'Back',secondary:'Core'},
    {name:'Yates Row',equipment:'Barbell',primary:'Back'},
    {name:'Cable Pullover',equipment:'Cable',primary:'Lats'},
    {name:'Machine Pullover',equipment:'Machine',primary:'Lats'},
    {name:'Smith Machine Row',equipment:'Smith Machine',primary:'Back'},
    {name:'Snatch-Grip Deadlift',equipment:'Barbell',primary:'Back',secondary:'Hamstrings'},
    {name:'Deficit Deadlift',equipment:'Barbell',primary:'Back',secondary:'Hamstrings'},
    {name:'Sumo Deadlift',equipment:'Barbell',primary:'Back',secondary:'Glutes'},
    {name:'Cable Row (Wide Grip)',equipment:'Cable',primary:'Upper Back'},
    {name:'High Row Machine',equipment:'Machine',primary:'Back'},
    {name:'Landmine Row',equipment:'Barbell',primary:'Back'},
    {name:'Dumbbell Pullover',equipment:'Dumbbell',primary:'Lats',secondary:'Chest'},
    {name:'Banded Lat Pulldown',equipment:'Bands',primary:'Lats'},
    {name:'Reverse-Grip Lat Pulldown',equipment:'Cable',primary:'Lats',secondary:'Biceps'},
    {name:'Muscle-Up',equipment:'Bodyweight',primary:'Back',secondary:'Chest',tracking:'bodyweight'},
    {name:'Trap Bar Shrug',equipment:'Trap Bar',primary:'Traps'},
  ],
  shoulders: [
    {name:'Overhead Press',equipment:'Barbell',primary:'Shoulders',secondary:'Triceps'},
    {name:'Dumbbell Shoulder Press',equipment:'Dumbbells',primary:'Shoulders'},
    {name:'Lateral Raise',equipment:'Dumbbells',primary:'Side Delts'},
    {name:'Front Raise',equipment:'Dumbbells',primary:'Front Delts'},
    {name:'Rear Delt Fly',equipment:'Dumbbells',primary:'Rear Delts'},
    {name:'Arnold Press',equipment:'Dumbbells',primary:'Shoulders'},
    {name:'Cable Lateral Raise',equipment:'Cable',primary:'Side Delts'},
    {name:'Push Press',equipment:'Barbell',primary:'Shoulders',secondary:'Triceps, Legs'},
    {name:'Upright Row',equipment:'Barbell',primary:'Side Delts',secondary:'Traps'},
    {name:'Reverse Pec Deck',equipment:'Machine',primary:'Rear Delts'},
    {name:'Shrugs',equipment:'Dumbbells',primary:'Traps'},
    {name:'Landmine Press',equipment:'Barbell',primary:'Shoulders'},
    {name:'Machine Shoulder Press',equipment:'Machine',primary:'Shoulders'},
    {name:'Cable Front Raise',equipment:'Cable',primary:'Front Delts'},
    {name:'Cable Rear Delt Fly',equipment:'Cable',primary:'Rear Delts'},
    {name:'Seated Dumbbell Press',equipment:'Dumbbells',primary:'Shoulders'},
    {name:'Behind-the-Neck Press',equipment:'Barbell',primary:'Shoulders'},
    {name:'Leaning Cable Lateral Raise',equipment:'Cable',primary:'Side Delts'},
    {name:'Barbell Shrug',equipment:'Barbell',primary:'Traps'},
    {name:'Cable Upright Row',equipment:'Cable',primary:'Side Delts',secondary:'Traps'},
    {name:'Plate Front Raise',equipment:'Plate',primary:'Front Delts'},
    {name:'Cable Y-Raise',equipment:'Cable',primary:'Rear Delts',secondary:'Traps'},
    {name:'Powell Raise',equipment:'Dumbbell',primary:'Rear Delts'},
    {name:'Z Press',equipment:'Barbell',primary:'Shoulders',secondary:'Core'},
    {name:'Viking Press',equipment:'Machine',primary:'Shoulders'},
    {name:'Cable Face Pull',equipment:'Cable',primary:'Rear Delts',secondary:'Upper Back'},
    {name:'Machine Lateral Raise',equipment:'Machine',primary:'Side Delts'},
    {name:'Seated Lateral Raise',equipment:'Dumbbells',primary:'Side Delts'},
    {name:'Lu Raise',equipment:'Dumbbells',primary:'Side Delts'},
    {name:'Cable Lateral Raise (Behind Back)',equipment:'Cable',primary:'Side Delts'},
    {name:'Dumbbell Y-Raise',equipment:'Dumbbells',primary:'Rear Delts',secondary:'Traps'},
    {name:'Bradford Press',equipment:'Barbell',primary:'Shoulders'},
    {name:'Pike Push-Up',equipment:'Bodyweight',primary:'Shoulders',tracking:'bodyweight'},
    {name:'Cable Reverse Fly',equipment:'Cable',primary:'Rear Delts'},
    {name:'Dumbbell Shrug',equipment:'Dumbbells',primary:'Traps'},
    {name:'Smith Machine Shoulder Press',equipment:'Smith Machine',primary:'Shoulders'},
    {name:'Kettlebell Press',equipment:'Kettlebell',primary:'Shoulders',secondary:'Core'},
  ],
  biceps: [
    {name:'Barbell Curl',equipment:'Barbell',primary:'Biceps'},
    {name:'Dumbbell Curl',equipment:'Dumbbells',primary:'Biceps'},
    {name:'Hammer Curl',equipment:'Dumbbells',primary:'Biceps',secondary:'Forearms'},
    {name:'Preacher Curl',equipment:'Barbell',primary:'Biceps'},
    {name:'Cable Curl',equipment:'Cable',primary:'Biceps'},
    {name:'Concentration Curl',equipment:'Dumbbell',primary:'Biceps'},
    {name:'EZ Bar Curl',equipment:'EZ Bar',primary:'Biceps'},
    {name:'Incline Dumbbell Curl',equipment:'Dumbbells',primary:'Biceps'},
    {name:'Zottman Curl',equipment:'Dumbbells',primary:'Biceps',secondary:'Forearms'},
    {name:'21s Bicep Curl',equipment:'Barbell',primary:'Biceps'},
    {name:'Spider Curl',equipment:'Dumbbells',primary:'Biceps'},
    {name:'Cable Hammer Curl',equipment:'Cable',primary:'Biceps',secondary:'Forearms'},
    {name:'Bayesian Cable Curl',equipment:'Cable',primary:'Biceps'},
    {name:'Machine Preacher Curl',equipment:'Machine',primary:'Biceps'},
    {name:'Drag Curl',equipment:'Barbell',primary:'Biceps'},
    {name:'Cross-Body Hammer Curl',equipment:'Dumbbells',primary:'Biceps',secondary:'Forearms'},
    {name:'Reverse Curl',equipment:'Barbell',primary:'Biceps',secondary:'Forearms'},
    {name:'Cable Rope Hammer Curl',equipment:'Cable',primary:'Biceps',secondary:'Forearms'},
    {name:'Seated Incline Curl',equipment:'Dumbbells',primary:'Biceps'},
    {name:'Waiter Curl',equipment:'Dumbbell',primary:'Biceps'},
    {name:'High Cable Curl',equipment:'Cable',primary:'Biceps'},
    {name:'Dumbbell Preacher Curl',equipment:'Dumbbell',primary:'Biceps'},
    {name:'EZ Bar Reverse Curl',equipment:'EZ Bar',primary:'Biceps',secondary:'Forearms'},
  ],
  triceps: [
    {name:'Tricep Pushdown',equipment:'Cable',primary:'Triceps'},
    {name:'Skull Crusher',equipment:'EZ Bar',primary:'Triceps'},
    {name:'Close-Grip Bench Press',equipment:'Barbell',primary:'Triceps',secondary:'Chest'},
    {name:'Overhead Tricep Extension',equipment:'Dumbbell',primary:'Triceps'},
    {name:'Tricep Dip',equipment:'Bodyweight',primary:'Triceps'},
    {name:'Cable Overhead Extension',equipment:'Cable',primary:'Triceps'},
    {name:'Diamond Push-Up',equipment:'Bodyweight',primary:'Triceps',secondary:'Chest'},
    {name:'Single-Arm Tricep Pushdown',equipment:'Cable',primary:'Triceps'},
    {name:'Tricep Kickback',equipment:'Dumbbell',primary:'Triceps'},
    {name:'JM Press',equipment:'Barbell',primary:'Triceps'},
    {name:'Rope Pushdown',equipment:'Cable',primary:'Triceps'},
    {name:'Bench Dip',equipment:'Bodyweight',primary:'Triceps'},
    {name:'Dumbbell Skull Crusher',equipment:'Dumbbells',primary:'Triceps'},
    {name:'Cable Kickback',equipment:'Cable',primary:'Triceps'},
    {name:'Machine Tricep Extension',equipment:'Machine',primary:'Triceps'},
    {name:'Reverse-Grip Pushdown',equipment:'Cable',primary:'Triceps'},
    {name:'Assisted Tricep Dip',equipment:'Machine',primary:'Triceps',tracking:'assisted'},
    {name:'Tate Press',equipment:'Dumbbells',primary:'Triceps'},
    {name:'California Press',equipment:'Barbell',primary:'Triceps',secondary:'Chest'},
    {name:'Cable Rope Overhead Extension',equipment:'Cable',primary:'Triceps'},
    {name:'Single-Arm Overhead Extension',equipment:'Dumbbell',primary:'Triceps'},
    {name:'Incline Skull Crusher',equipment:'EZ Bar',primary:'Triceps'},
    {name:'Bodyweight Tricep Extension',equipment:'Bodyweight',primary:'Triceps',tracking:'bodyweight'},
    {name:'Cable Crossbody Extension',equipment:'Cable',primary:'Triceps'},
    {name:'Floor Skull Crusher',equipment:'Barbell',primary:'Triceps'},
    {name:'Band Pushdown',equipment:'Bands',primary:'Triceps'},
  ],
  legs: [
    {name:'Back Squat',equipment:'Barbell',primary:'Quads',secondary:'Glutes'},
    {name:'Front Squat',equipment:'Barbell',primary:'Quads',secondary:'Core'},
    {name:'Leg Press',equipment:'Machine',primary:'Quads',secondary:'Glutes'},
    {name:'Romanian Deadlift',equipment:'Barbell',primary:'Hamstrings',secondary:'Glutes'},
    {name:'Bulgarian Split Squat',equipment:'Dumbbells',primary:'Quads',secondary:'Glutes'},
    {name:'Walking Lunge',equipment:'Dumbbells',primary:'Quads',secondary:'Glutes'},
    {name:'Leg Curl',equipment:'Machine',primary:'Hamstrings'},
    {name:'Leg Extension',equipment:'Machine',primary:'Quads'},
    {name:'Calf Raise',equipment:'Machine',primary:'Calves'},
    {name:'Hip Thrust',equipment:'Barbell',primary:'Glutes',secondary:'Hamstrings'},
    {name:'Goblet Squat',equipment:'Dumbbell',primary:'Quads'},
    {name:'Step-Up',equipment:'Dumbbells',primary:'Quads',secondary:'Glutes'},
    {name:'Hack Squat',equipment:'Machine',primary:'Quads'},
    {name:'Stiff-Leg Deadlift',equipment:'Barbell',primary:'Hamstrings'},
    {name:'Seated Leg Curl',equipment:'Machine',primary:'Hamstrings'},
    {name:'Lying Leg Curl',equipment:'Machine',primary:'Hamstrings'},
    {name:'Pendulum Squat',equipment:'Machine',primary:'Quads'},
    {name:'Smith Machine Squat',equipment:'Smith Machine',primary:'Quads'},
    {name:'Seated Calf Raise',equipment:'Machine',primary:'Calves'},
    {name:'Standing Calf Raise',equipment:'Machine',primary:'Calves'},
    {name:'Reverse Lunge',equipment:'Dumbbells',primary:'Quads',secondary:'Glutes'},
    {name:'Sissy Squat',equipment:'Bodyweight',primary:'Quads'},
    {name:'Belt Squat',equipment:'Machine',primary:'Quads',secondary:'Glutes'},
    {name:'Nordic Curl',equipment:'Bodyweight',primary:'Hamstrings'},
    {name:'Adductor Machine',equipment:'Machine',primary:'Adductors'},
    {name:'Box Squat',equipment:'Barbell',primary:'Quads',secondary:'Glutes'},
    {name:'Zercher Squat',equipment:'Barbell',primary:'Quads',secondary:'Core'},
    {name:'Landmine Squat',equipment:'Barbell',primary:'Quads'},
    {name:'Cossack Squat',equipment:'Bodyweight',primary:'Quads',secondary:'Adductors'},
    {name:'Pistol Squat',equipment:'Bodyweight',primary:'Quads',tracking:'bodyweight'},
    {name:'Trap Bar Deadlift',equipment:'Trap Bar',primary:'Quads',secondary:'Glutes, Back'},
    {name:'Single-Leg Press',equipment:'Machine',primary:'Quads'},
    {name:'Tibialis Raise',equipment:'Bodyweight',primary:'Shins'},
    {name:'Donkey Calf Raise',equipment:'Machine',primary:'Calves'},
    {name:'Smith Machine Calf Raise',equipment:'Smith Machine',primary:'Calves'},
    {name:'Leg Press Calf Raise',equipment:'Machine',primary:'Calves'},
    {name:'Heels-Elevated Goblet Squat',equipment:'Dumbbell',primary:'Quads'},
    {name:'Reverse Nordic',equipment:'Bodyweight',primary:'Quads',tracking:'bodyweight'},
    {name:'Glute-Ham Raise',equipment:'Machine',primary:'Hamstrings',secondary:'Glutes'},
    {name:'Single-Leg RDL',equipment:'Dumbbells',primary:'Hamstrings',secondary:'Glutes'},
    {name:'Hack Squat Calf Raise',equipment:'Machine',primary:'Calves'},
    {name:'Safety Bar Squat',equipment:'Barbell',primary:'Quads',secondary:'Glutes'},
    {name:'Paused Squat',equipment:'Barbell',primary:'Quads'},
    {name:'Tempo Squat',equipment:'Barbell',primary:'Quads'},
    {name:'Curtsy Lunge',equipment:'Dumbbells',primary:'Quads',secondary:'Glutes'},
    {name:'Lateral Lunge',equipment:'Dumbbells',primary:'Quads',secondary:'Adductors'},
    {name:'Smith Machine Lunge',equipment:'Smith Machine',primary:'Quads',secondary:'Glutes'},
    {name:'Banded Leg Curl',equipment:'Bands',primary:'Hamstrings'},
    {name:'Sled Leg Press',equipment:'Machine',primary:'Quads'},
    {name:'Jefferson Deadlift',equipment:'Barbell',primary:'Quads',secondary:'Glutes'},
    {name:'Wall Sit',equipment:'Bodyweight',primary:'Quads',tracking:'time'},
    {name:'Spanish Squat',equipment:'Bands',primary:'Quads'},
    {name:'Seated Adductor Machine',equipment:'Machine',primary:'Adductors'},
    {name:'Standing Hamstring Curl',equipment:'Machine',primary:'Hamstrings'},
  ],
  core: [
    {name:'Side Plank',equipment:'Bodyweight',primary:'Obliques'},
    {name:'Hanging Leg Raise',equipment:'Bodyweight',primary:'Lower Abs'},
    {name:'Cable Crunch',equipment:'Cable',primary:'Abs'},
    {name:'Russian Twist',equipment:'Bodyweight',primary:'Obliques'},
    {name:'Ab Wheel Rollout',equipment:'Ab Wheel',primary:'Core'},
    {name:'Dead Bug',equipment:'Bodyweight',primary:'Core'},
    {name:'Mountain Climber',equipment:'Bodyweight',primary:'Core',secondary:'Cardio'},
    {name:'Bicycle Crunch',equipment:'Bodyweight',primary:'Abs',secondary:'Obliques'},
    {name:'V-Up',equipment:'Bodyweight',primary:'Core'},
    {name:'Pallof Press',equipment:'Cable',primary:'Core'},
    {name:'Hollow Body Hold',equipment:'Bodyweight',primary:'Core'},
    {name:'Hanging Knee Raise',equipment:'Bodyweight',primary:'Lower Abs'},
    {name:'Decline Sit-Up',equipment:'Bodyweight',primary:'Abs'},
    {name:'Toes-to-Bar',equipment:'Bodyweight',primary:'Lower Abs'},
    {name:'Weighted Plank',equipment:'Bodyweight',primary:'Core'},
    {name:'Cable Woodchop',equipment:'Cable',primary:'Obliques'},
    {name:'Machine Crunch',equipment:'Machine',primary:'Abs'},
    {name:'Flutter Kick',equipment:'Bodyweight',primary:'Lower Abs'},
    {name:'Plank',equipment:'Bodyweight',primary:'Core',tracking:'time'},
    {name:'Side Plank Hold',equipment:'Bodyweight',primary:'Obliques',tracking:'time'},
    {name:'Dragon Flag',equipment:'Bodyweight',primary:'Core'},
    {name:'Cable Pallof Press',equipment:'Cable',primary:'Core'},
    {name:'Weighted Decline Sit-Up',equipment:'Plate',primary:'Abs',tracking:'weighted_bodyweight'},
    {name:'L-Sit Hold',equipment:'Bodyweight',primary:'Core',tracking:'time'},
    {name:'Reverse Crunch',equipment:'Bodyweight',primary:'Lower Abs'},
    {name:'Cable Side Bend',equipment:'Cable',primary:'Obliques'},
    {name:'Weighted Russian Twist',equipment:'Plate',primary:'Obliques'},
    {name:'Hanging Windshield Wiper',equipment:'Bodyweight',primary:'Obliques'},
    {name:'Ab Crunch Machine',equipment:'Machine',primary:'Abs'},
    {name:'Stomach Vacuum',equipment:'Bodyweight',primary:'Core',tracking:'time'},
    {name:'Copenhagen Plank',equipment:'Bodyweight',primary:'Obliques',tracking:'time'},
    {name:'Sit-Up',equipment:'Bodyweight',primary:'Abs',tracking:'bodyweight'},
    {name:'Landmine Twist',equipment:'Barbell',primary:'Obliques'},
    {name:'Decline Russian Twist',equipment:'Bodyweight',primary:'Obliques'},
  ],
  cardio: [
    {name:'Treadmill Run',equipment:'Treadmill',primary:'Cardio'},
    {name:'Stationary Bike',equipment:'Bike',primary:'Cardio',secondary:'Legs'},
    {name:'Rowing Machine',equipment:'Rower',primary:'Cardio',secondary:'Full Body'},
    {name:'Stair Climber',equipment:'Stair Master',primary:'Cardio',secondary:'Legs'},
    {name:'Elliptical',equipment:'Elliptical',primary:'Cardio'},
    {name:'Jump Rope',equipment:'Rope',primary:'Cardio',secondary:'Calves'},
    {name:'Burpees',equipment:'Bodyweight',primary:'Cardio',secondary:'Full Body'},
    {name:'Battle Ropes',equipment:'Ropes',primary:'Cardio',secondary:'Shoulders'},
    {name:'Box Jump',equipment:'Box',primary:'Cardio',secondary:'Legs'},
    {name:'Incline Walk',equipment:'Treadmill',primary:'Cardio'},
    {name:'Assault Bike',equipment:'Bike',primary:'Cardio',secondary:'Full Body'},
    {name:'Ski Erg',equipment:'Machine',primary:'Cardio',secondary:'Back'},
    {name:'Sled Push',equipment:'Sled',primary:'Cardio',secondary:'Legs',tracking:'distance'},
    {name:'Sled Pull',equipment:'Sled',primary:'Cardio',secondary:'Back',tracking:'distance'},
    {name:'Sprint Intervals',equipment:'Track',primary:'Cardio',tracking:'distance'},
    {name:'Shadow Boxing',equipment:'Bodyweight',primary:'Cardio',tracking:'time'},
    {name:'Swimming',equipment:'Pool',primary:'Cardio',secondary:'Full Body',tracking:'distance'},
    {name:'Outdoor Run',equipment:'None',primary:'Cardio',tracking:'distance'},
    {name:'Outdoor Cycle',equipment:'Bike',primary:'Cardio',secondary:'Legs',tracking:'distance'},
    {name:'Hiking',equipment:'None',primary:'Cardio',tracking:'distance'},
    {name:'Versaclimber',equipment:'Machine',primary:'Cardio',secondary:'Full Body'},
    {name:'Jacobs Ladder',equipment:'Machine',primary:'Cardio'},
    {name:'High Knees',equipment:'Bodyweight',primary:'Cardio',tracking:'time'},
    {name:'Tuck Jumps',equipment:'Bodyweight',primary:'Cardio',secondary:'Legs'},
    {name:'Bear Crawl',equipment:'Bodyweight',primary:'Cardio',secondary:'Core',tracking:'distance'},
    {name:'Kettlebell Swing',equipment:'Kettlebell',primary:'Cardio',secondary:'Glutes'},
  ],
  glutes: [
    {name:'Hip Thrust',equipment:'Barbell',primary:'Glutes'},
    {name:'Glute Bridge',equipment:'Bodyweight',primary:'Glutes'},
    {name:'Cable Kickback',equipment:'Cable',primary:'Glutes'},
    {name:'Bulgarian Split Squat',equipment:'Dumbbells',primary:'Glutes',secondary:'Quads'},
    {name:'Sumo Deadlift',equipment:'Barbell',primary:'Glutes',secondary:'Hamstrings'},
    {name:'Glute Kickback Machine',equipment:'Machine',primary:'Glutes'},
    {name:'Step-Up',equipment:'Dumbbells',primary:'Glutes'},
    {name:'Hip Abduction',equipment:'Machine',primary:'Glutes'},
    {name:'Cable Pull-Through',equipment:'Cable',primary:'Glutes',secondary:'Hamstrings'},
    {name:'Single-Leg Hip Thrust',equipment:'Bodyweight',primary:'Glutes'},
    {name:'Curtsy Lunge',equipment:'Dumbbells',primary:'Glutes'},
    {name:'Frog Pump',equipment:'Bodyweight',primary:'Glutes'},
    {name:'Reverse Hyperextension',equipment:'Machine',primary:'Glutes',secondary:'Hamstrings'},
    {name:'Cable Hip Abduction',equipment:'Cable',primary:'Glutes'},
    {name:'Banded Lateral Walk',equipment:'Bands',primary:'Glutes'},
    {name:'Single-Leg Glute Bridge',equipment:'Bodyweight',primary:'Glutes',tracking:'bodyweight'},
    {name:'B-Stance Hip Thrust',equipment:'Barbell',primary:'Glutes'},
    {name:'Kas Glute Bridge',equipment:'Barbell',primary:'Glutes'},
    {name:'Cable Glute Kickback',equipment:'Cable',primary:'Glutes'},
    {name:'Machine Hip Thrust',equipment:'Machine',primary:'Glutes'},
    {name:'Romanian Deadlift (Glute Focus)',equipment:'Barbell',primary:'Glutes',secondary:'Hamstrings'},
  ],
  forearms: [
    {name:'Wrist Curl',equipment:'Barbell',primary:'Forearms'},
    {name:'Reverse Wrist Curl',equipment:'Barbell',primary:'Forearms'},
    {name:'Farmer\'s Walk',equipment:'Dumbbells',primary:'Forearms',secondary:'Traps'},
    {name:'Hammer Curl',equipment:'Dumbbells',primary:'Forearms',secondary:'Biceps'},
    {name:'Plate Pinch',equipment:'Plates',primary:'Forearms'},
    {name:'Wrist Roller',equipment:'Roller',primary:'Forearms'},
    {name:'Cable Wrist Curl',equipment:'Cable',primary:'Forearms'},
    {name:'Behind-Back Wrist Curl',equipment:'Barbell',primary:'Forearms'},
    {name:'Dead Hang',equipment:'Bodyweight',primary:'Forearms',secondary:'Grip',tracking:'time'},
    {name:'Farmer\'s Carry',equipment:'Dumbbells',primary:'Forearms',secondary:'Traps',tracking:'distance'},
    {name:'Suitcase Carry',equipment:'Dumbbells',primary:'Forearms',secondary:'Obliques',tracking:'distance'},
    {name:'Towel Pull-Up Hold',equipment:'Bodyweight',primary:'Grip',tracking:'time'},
    {name:'Captains of Crush',equipment:'Gripper',primary:'Grip'},
    {name:'Reverse Barbell Curl',equipment:'Barbell',primary:'Forearms',secondary:'Biceps'},
    {name:'Wrist Pronation/Supination',equipment:'Dumbbell',primary:'Forearms'},
    {name:'Finger Curl',equipment:'Barbell',primary:'Grip'},
    {name:'Gripper Hold',equipment:'Gripper',primary:'Grip',tracking:'time'},
  ],
};

