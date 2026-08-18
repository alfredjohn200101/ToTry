
// ═══════════════════════════════════════════════════
// PASS 3: HAPTIC FEEDBACK + POLISH HELPERS
// ═══════════════════════════════════════════════════
function haptic(pattern){
  // pattern can be: 'tap', 'success', 'warning', 'celebrate', 'light'
  //
  // EVERY HAPTIC IN THIS APP WAS DEAD ON IPHONE. The only path was navigator.vibrate — the Vibration
  // API, which WebKit has never implemented and Apple has never shipped. So `if(!navigator.vibrate)
  // return;` was an unconditional early return on every iOS device: the Feeling Door, the breath work,
  // every confirmation and every threshold moment silently had no physical feedback, on the one platform
  // whose haptics are the best in the industry. It cost nothing and it never fired.
  //
  // Native gets the real Taptic Engine. This is one of the things wrapping genuinely unlocks: a PWA on
  // iOS cannot vibrate at all, by any means.
  try{
    const H = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) || null;
    if(H && typeof isNativeApp==='function' && isNativeApp()){
      // Mapped by MEANING, not by mimicking the old millisecond patterns: iOS haptics are designed
      // types, and a "success" tap should feel like the system's success, not like a buzz of the same
      // length. Fire-and-forget — a haptic must never block or throw into a tap handler.
      // 'alert' = the end-of-set buzz: "rest is over, go". Two firm taps, matching the
      // buzz-pause-buzz rhythm the web path has always had. Deliberately NOT notification(WARNING) --
      // on iOS that reads as "something went wrong", and a finished rest timer is a go signal.
      if(pattern==='alert'){ H.impact({ style:'HEAVY' }); setTimeout(function(){ try{ H.impact({ style:'HEAVY' }); }catch(_){ } }, 140); }
      else if(pattern==='success' || pattern==='celebrate'){ H.notification({ type:'SUCCESS' }); }
      else if(pattern==='warning'){ H.notification({ type:'WARNING' }); }
      else if(pattern==='light'){ H.impact({ style:'LIGHT' }); }
      else { H.impact({ style:'MEDIUM' }); }   // 'tap' and anything unrecognised
      return;
    }
  }catch(_){ /* fall through to the web path */ }
  if(!navigator.vibrate)return;
  const patterns={
    tap: [10],
    success: [30, 30, 60],
    warning: [60],
    celebrate: [40, 80, 40, 80, 80],
    alert: [200, 100, 200],
    light: [5]
  };
  navigator.vibrate(patterns[pattern]||[10]);
}

// Empty state helper - generates clean empty state HTML
function emptyState(icon, title, desc, ctaText, ctaAction){
  return '<div class="empty-state">'+
    '<div class="empty-state-icon">'+icon+'</div>'+
    '<div class="empty-state-title">'+title+'</div>'+
    (desc?'<div class="empty-state-desc">'+desc+'</div>':'')+
    (ctaText?'<div class="empty-state-cta" onclick="'+ctaAction+'">'+ctaText+'</div>':'')+
    '</div>';
}

// Streak freezes - mark days as "rest" so sober streak doesn\'t break
function getFreezes(){return ls('totry_freezes')||[];}
function addFreeze(reason){
  const freezes=getFreezes();
  const today=new Date().toLocaleDateString('en-AU');
  if(!freezes.find(f=>f.date===today)){
    freezes.unshift({date:today,ts:new Date().toISOString(),reason:reason||'rest'});
    ls('totry_freezes',freezes.slice(0,90));
    showToast('Freeze used','Your streak is protected today. Rest fully.');
    haptic('light');
  }
}


// ═══════════════════════════════════════════════════
// PASS 4: AI MORNING SENTENCE
// ═══════════════════════════════════════════════════

// Update share button day number on render
function updateShareDayNum(){
  const el=document.getElementById('share-day-num');
  if(el)el.textContent=getDayCount();
}


// ═══════════════════════════════════════════════════
// PASS 4: "I NEED TO TALK" + WEEKLY SYNTHESIS
// ═══════════════════════════════════════════════════
function openNeedTalk(){
  haptic('tap');
  go('coach');
  // Just land them in Coach cleanly — the page already greets them. No overlay toast
  // (it was rendering huge mid-screen as the keyboard animated up).
  const input=document.getElementById('coach-in');
  if(input) setTimeout(()=>input.focus(), 300);
}

// ── FLOATING HELP — two-tap path to SOS or Coach from anywhere ──
// openFloatingHelp() lived here — an alternative "two-tap path to SOS or Coach from anywhere".
// The live path won: the floating button (#need-talk-btn) calls orbTap() into the Feeling Door, and
// openNeedTalk() covers the talk-to-someone case. Never referenced once.


// Picks vice (or auto-skips if only one) then routes to SOS intervention

// ── WEEKLY SYNTHESIS (auto-generated Sunday) ──
async function generateWeeklySynthesis(){
  const today=new Date();
  const isSunday=today.getDay()===0;
  const lastSynthesis=ls('totry_last_synthesis');
  const thisWeekKey=getWeekKey(today);
  
  // Generate fresh each week regardless of day, but only SHOW the modal on Sunday morning
  if(lastSynthesis===thisWeekKey){
    // Already generated — maybe show again if Sunday and not seen this week
    if(isSunday){
      const shownKey = 'totry_synthesis_shown_' + thisWeekKey;
      if(!ls(shownKey)){
        const syntheses = ls('totry_syntheses') || [];
        const existing = syntheses.find(s => s.weekKey === thisWeekKey);
        if(existing) showWeeklySynthesisModal(existing);
        ls(shownKey, true);
      }
    }
    return;
  }
  
  // Don't retry the AI on every tab switch if it failed — once per session only.
  if(window.__synthesisAttempted) return;
  window.__synthesisAttempted = true;
  
  // Gather week's data — much richer now
  const sevenDaysAgo=new Date(today.getTime()-7*86400000);
  const journal=safeJournal().filter(j=>new Date(j.ts)>=sevenDaysAgo);
  const evenings=(ls('totry_evenings')||[]).filter(e=>new Date(e.ts)>=sevenDaysAgo);
  const workouts=(ls('totry_workouts')||[]).filter(w=>new Date(w.ts||w.date)>=sevenDaysAgo);
  const checkins=(ls('totry_checkins')||[]).filter(c=>new Date(c.ts)>=sevenDaysAgo);
  const examens=(ls('totry_examens')||[]).filter(e=>new Date(e.ts)>=sevenDaysAgo);
  const prayers=(ls('totry_prayers')||[]).filter(p=>new Date(p.createdAt)>=sevenDaysAgo);
  const answeredPrayers=prayers.filter(p=>p.status==='answered');
  loadV();
  const recentWins=vices.flatMap(v=>(v.lastWin&&new Date(v.lastWin)>=sevenDaysAgo)?[v.n]:[]);
  const fightLog=(ls('totry_fight_log')||[]).filter(f=>new Date(f.ts)>=sevenDaysAgo);
  const wonFights=fightLog.filter(f=>f.won).length;
  const transactions=(ls('totry_transactions')||[]).filter(t=>new Date(t.ts)>=sevenDaysAgo);
  const spentThisWeek=transactions.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);
  const earnedThisWeek=transactions.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0);

  // A "week reflected" needs a week actually lived. Without this gate a BRAND-NEW account (every
  // array empty) generated an "empty week" lament — "a week of stillness… no workouts, journals or
  // prayers… this depletion is spiritual and mental" — and auto-popped it as the FIRST thing a
  // person sees after onboarding. A coach mourning your inactivity thirty seconds after you arrive.
  // Require the account to be about a week old AND to have a few real entries before reflecting.
  const _synthDayCount = (typeof getDayCount==='function') ? getDayCount() : 99;
  const _synthActivity = journal.length + evenings.length + workouts.length + checkins.length + examens.length + prayers.length + fightLog.length + transactions.length;
  if(_synthDayCount < 7 || _synthActivity < 3){ return; }

  // Calc avg ratings if evenings exist
  let avgRating = null;
  if(evenings.length){
    avgRating = (evenings.reduce((s,e)=>s+(e.rating||0),0)/evenings.length).toFixed(1);
  }
  
  let summary='Week summary:\n';
  // Open from the shared nervous system so the synthesis's snapshot agrees with what the coach
  // sees — one truth across the app. The 4-week trend below adds the historical depth synthesis needs.
  try{ if(typeof getLifeState==='function'){ const ls0=getLifeState(); if(ls0&&ls0.brief) summary += 'Current state (shared with coach):\n'+ls0.brief+'\n\n'; } }catch(_){}
  // Rich training picture: cardio + strength, distance, minutes, calories — not just a count.
  const wstats = (typeof getUnifiedWeekStats === 'function') ? getUnifiedWeekStats() : null;
  if(wstats && wstats.sessions){
    summary+='Training: '+wstats.sessions+' sessions ('+wstats.strengthCount+' strength, '+wstats.cardioCount+' cardio)';
    const tb=[];
    if(wstats.totalMinutes) tb.push(wstats.totalMinutes+' min');
    if(wstats.totalVolumeKg) tb.push(wstats.totalVolumeKg.toLocaleString()+'kg lifted');
    if(wstats.totalDistanceKm) tb.push(wstats.totalDistanceKm+'km');
    // Gentle mode is numbers off. lifeStateBrief already gates its calorie lines this way; this
    // builder was written separately and never got the guard, so the Sunday reflection handed the
    // model a calorie total for someone who asked never to see one — and it read it back.
    if(wstats.totalCalories && !(typeof nutGentle==='function' && nutGentle())) tb.push(wstats.totalCalories+' cal burned');
    if(tb.length) summary+=' — '+tb.join(', ');
    summary+='\n';
  } else {
    summary+='Workouts: '+workouts.length+'\n';
  }
  summary+='Journal entries: '+journal.length+'\n';
  summary+='Evening reflections: '+evenings.length+'\n';
  summary+='Examens completed: '+examens.length+'\n';
  summary+='Prayers added: '+prayers.length+' (answered: '+answeredPrayers.length+')\n';
  summary+='Fight wins: '+wonFights+'/'+fightLog.length+'\n';
  if(avgRating) summary+='Avg day rating: '+avgRating+'/5\n';
  if(transactions.length) summary+='Money: '+curSym()+earnedThisWeek+' in / '+curSym()+spentThisWeek+' out\n';
  if(checkins.length){
    const avgPhys=checkins.reduce((s,c)=>s+c.physical,0)/checkins.length;
    const avgEmot=checkins.reduce((s,c)=>s+c.emotional,0)/checkins.length;
    const avgSpir=checkins.reduce((s,c)=>s+c.spiritual,0)/checkins.length;
    summary+='Avg state: P'+avgPhys.toFixed(1)+'/E'+avgEmot.toFixed(1)+'/S'+avgSpir.toFixed(1)+'\n';
  }
  if(journal.length){
    summary+='\nRecent journal themes:\n'+journal.slice(0,3).map(j=>'- '+String(j&&j.text||'').slice(0,100)).join('\n');
  }

  // ── 4-WEEK COMPARATIVE CONTEXT ──────────────────────────────────────────────
  // A coach doesn't react to one week in isolation — they see the trend and the
  // turn. We build the three prior weeks the same way and hand the model deltas so
  // it can say "your training held but your reflection went quiet" instead of just
  // reciting this week's totals. This is what separates diagnosis from a summary.
  const weekBucket = (startAgo, endAgo) => {
    const lo = today.getTime() - startAgo*86400000;
    const hi = today.getTime() - endAgo*86400000;
    const inWin = ts => { const t = new Date(ts).getTime(); return !isNaN(t) && t >= lo && t < hi; };
    const wo = (ls('totry_workouts')||[]).filter(w => inWin(w.ts||w.date));
    const ev = (ls('totry_evenings')||[]).filter(e => inWin(e.ts));
    const jo = safeJournal().filter(j => inWin(j.ts));
    const ex = (ls('totry_examens')||[]).filter(e => inWin(e.ts));
    const ci = (ls('totry_checkins')||[]).filter(c => inWin(c.ts));
    const fl = (ls('totry_fight_log')||[]).filter(f => inWin(f.ts));
    const avg = (arr,f) => arr.length ? (arr.reduce((a,x)=>a+(f(x)||0),0)/arr.length) : null;
    return {
      workouts: wo.length,
      reflections: ev.length + jo.length,
      examens: ex.length,
      fightWins: fl.filter(f=>f.won).length,
      fightTotal: fl.length,
      rating: avg(ev, e=>e.rating),
      spiritual: avg(ci, c=>c.spiritual),
      physical: avg(ci, c=>c.physical),
      emotional: avg(ci, c=>c.emotional)
    };
  };
  const w0 = weekBucket(7, 0);     // this week
  const w1 = weekBucket(14, 7);    // last week
  const w2 = weekBucket(21, 14);
  const w3 = weekBucket(28, 21);
  const fmtN = v => (v==null ? '—' : (Math.round(v*10)/10));
  let trend = '\n4-week trend (oldest → newest, this week last):\n';
  trend += 'Workouts/wk: '+[w3,w2,w1,w0].map(w=>w.workouts).join(' → ')+'\n';
  trend += 'Reflections/wk: '+[w3,w2,w1,w0].map(w=>w.reflections).join(' → ')+'\n';
  trend += 'Examens/wk: '+[w3,w2,w1,w0].map(w=>w.examens).join(' → ')+'\n';
  trend += 'Fight wins/wk: '+[w3,w2,w1,w0].map(w=>w.fightWins+'/'+w.fightTotal).join(' → ')+'\n';
  trend += 'Avg day rating: '+[w3,w2,w1,w0].map(w=>fmtN(w.rating)).join(' → ')+'\n';
  trend += 'Spiritual check-in: '+[w3,w2,w1,w0].map(w=>fmtN(w.spiritual)).join(' → ')+'\n';
  trend += 'Physical check-in: '+[w3,w2,w1,w0].map(w=>fmtN(w.physical)).join(' → ')+'\n';
  trend += 'Emotional check-in: '+[w3,w2,w1,w0].map(w=>fmtN(w.emotional)).join(' → ')+'\n';
  summary += trend;
  
  try{
    const prompt='You are looking at one person\'s week across their whole life — body, mind, and soul — plus how the last 4 weeks have trended. Write a warm, honest reflection under 280 words that does what a real coach does and no tracking app can:\n\n1. Name the TURN in the trend — what changed this week versus the weeks before (a stream that rose, fell, or went quiet).\n2. Connect ACROSS domains causally. If training stalled the same week reflection or the evening check-in went quiet, say the depletion is spiritual/mental, not physical. If fight-wins rose alongside spiritual check-ins, name that their inner life (their prayer, practice, or reflection) is holding the fight. Look for these links explicitly — they are the whole point.\n3. Celebrate one specific win with its real number.\n4. End with ONE thing to focus on next week, grounded in what you diagnosed — not generic advice.\n\nSpeak as their mentor, not a dashboard. Plain, grounded, faith-aware without being preachy. Their week and trend:\n'+summary;
    // brotherSys() carries sexNote() and faithVoiceNote(). Every other AI surface builds on it; this
  // one did not, so the weekly synthesis was the single place that could call a woman brother and
  // speak Christian framing to a Muslim or secular person.
  const response=await api((typeof brotherSys==='function'?brotherSys():'')+'You are this person\'s wise mentor, the personal coach inside To Try by Alfred John. You see their body, mind, and soul as one life — never as separate trackers.',[],prompt,800);
    if(response&&response.trim()){
      const synthesis = {
        weekKey:thisWeekKey,
        date:today.toLocaleDateString('en-AU'),
        text:response.trim(),
        ts:new Date().toISOString(),
        stats: {
          workouts: workouts.length,
          journal: journal.length,
          evenings: evenings.length,
          examens: examens.length,
          prayers: prayers.length,
          answeredPrayers: answeredPrayers.length,
          wins: wonFights,
          fights: fightLog.length,
          avgRating: avgRating,
          spent: Math.round(spentThisWeek),
          earned: Math.round(earnedThisWeek)
        }
      };
      const syntheses=ls('totry_syntheses')||[];
      syntheses.unshift(synthesis);
      ls('totry_syntheses',syntheses.slice(0,52));
      ls('totry_last_synthesis',thisWeekKey);
      
      // If Sunday, show the modal immediately
      if(isSunday){
        const shownKey = 'totry_synthesis_shown_' + thisWeekKey;
        if(!ls(shownKey)){
          showWeeklySynthesisModal(synthesis);
          ls(shownKey, true);
        }
      }
      return response.trim();
    }
  }catch(e){
    console.error('Synthesis failed:',e);
  }
  return null;
}

function showWeeklySynthesisModal(synthesis){
  if(!synthesis) return;
  const s = synthesis.stats || {};
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  
  const statRows = [];
  if(s.workouts > 0) statRows.push({label:'Trained', value: s.workouts + ' session' + (s.workouts===1?'':'s')});
  if(s.evenings > 0) statRows.push({label:'Evenings reflected', value: s.evenings + '/7'});
  if(s.examens > 0) statRows.push({label:'Examens', value: s.examens});
  if(s.fights > 0) statRows.push({label:'Fights won', value: s.wins + '/' + s.fights});
  if(s.prayers > 0) statRows.push({label:'Prayers added', value: s.prayers + (s.answeredPrayers ? ' (' + s.answeredPrayers + ' answered)' : '')});
  if(s.avgRating) statRows.push({label:'Avg day rating', value: s.avgRating + '/5'});
  if(s.spent || s.earned) statRows.push({label:'Money', value: curSym() + s.earned + ' in / '+curSym() + s.spent + ' out'});
  
  const statsHtml = statRows.length ?
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:14px">' +
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">Your week in numbers</div>' +
      statRows.map(r => '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--bd);font-size:12px"><span style="color:var(--tx3)">' + r.label + '</span><span style="font-family:DM Mono,monospace;color:var(--tx)">' + r.value + '</span></div>').join('') +
    '</div>' : '';
  
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px">Sunday · Week ending ' + synthesis.date + '</div>' +
    '<h3 style="margin-bottom:4px">Your week, reflected</h3>' +
    '<p style="font-size:11px;color:var(--tx3);margin-bottom:14px;font-style:italic">From your coach. Take a minute with this.</p>' +
    statsHtml +
    '<div style="font-family:Cormorant Garamond,serif;font-size:15px;color:var(--tx);line-height:1.75;font-style:italic;background:linear-gradient(135deg,rgba(200,169,110,0.04),rgba(140,107,182,0.03));border-left:3px solid var(--go);padding:14px;border-radius:0 10px 10px 0;margin-bottom:14px">' + synthesis.text.replace(/\n/g, '<br>') + '</div>' +
    '<button class="btn primary" onclick="generateShareCard();closeModal(this)" style="margin-bottom:8px">Share this week</button>' +
    '<button class="btn" onclick="closeModal(this)">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}

function getWeekKey(date){
  const d=new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()-d.getDay()); // Sunday start
  // OPAQUE KEY, NOT A DATE. Only ever compared with another getWeekKey() result — never parsed back
  // and never displayed — so the UTC shift here is consistent with itself. Deliberately NOT switched
  // to _todayLocalISO with the other sites: that would orphan every week key already stored.
  return d.toISOString().split('T')[0];
}

// ── YEAR IN REVIEW ────────────────────────────────────────────
// Computes a full year retrospective. Manual trigger from Settings
// + auto-prompts in last 5 days of December if not yet seen for the year.
function computeYearInReview(year){
  year = year || new Date().getFullYear();
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year + 1, 0, 1).getTime();
  
  const inYear = ts => {
    if(!ts) return false;
    const t = typeof ts === 'string' ? new Date(ts).getTime() : ts;
    return t >= yearStart && t < yearEnd;
  };
  
  // Days "tried" = days with any activity (journal/evening/workout/morning logged)
  const allActivityDates = new Set();
  (ls('totry_journal')||[]).forEach(j => { if(inYear(j.ts)) allActivityDates.add(new Date(j.ts).toLocaleDateString('en-AU')); });
  (ls('totry_evenings')||[]).forEach(e => { if(inYear(e.ts)) allActivityDates.add(new Date(e.ts).toLocaleDateString('en-AU')); });
  (ls('totry_mornings')||[]).forEach(m => { if(inYear(m.ts || m.createdAt)) allActivityDates.add(new Date(m.ts || m.createdAt).toLocaleDateString('en-AU')); });
  (ls('totry_workouts')||[]).forEach(w => { if(inYear(w.ts)) allActivityDates.add(new Date(w.ts).toLocaleDateString('en-AU')); });
  (ls('totry_examens')||[]).forEach(e => { if(inYear(e.ts)) allActivityDates.add(new Date(e.ts).toLocaleDateString('en-AU')); });
  
  // Fight wins
  loadV();
  const fightLog = (ls('totry_fight_log')||[]).filter(f => inYear(f.ts));
  const totalWins = fightLog.filter(f => f.won).length;
  const totalFights = fightLog.length;
  
  // Workouts
  const workouts = (ls('totry_workouts')||[]).filter(w => inYear(w.ts));
  const totalVolume = workouts.reduce((s, w) => s + (w.volume || 0), 0);
  
  // Money: vice savings + transactions
  const viceSavings = (ls('totry_vice_savings_log')||[])
    .filter(e => inYear(e.ts)).reduce((s, e) => s + (e.amount || 0), 0);
  const transactions = (ls('totry_transactions')||[]).filter(t => inYear(t.ts));
  const yearIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const yearExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  
  // Prayers
  const prayers = (ls('totry_prayers')||[]).filter(p => inYear(p.createdAt));
  const answered = prayers.filter(p => p.status === 'answered').length;
  
  // Saved verses
  const savedVerses = (ls('totry_sv')||[]).length; // Not date-filterable (no ts on legacy)
  
  // Longest streak across all vices
  let longestStreak = 0;
  vices.forEach(v => {
    const cur = viceCleanDays(v);
    if(cur > longestStreak) longestStreak = cur;
    // Check relapse history for longest past streak
    if(v.relapseHistory){
      v.relapseHistory.forEach(r => {
        if(r.streakLength > longestStreak) longestStreak = r.streakLength;
      });
    }
  });
  
  // Weight change
  const bodyEntries = (ls('totry_body')||[]).filter(b => inYear(b.ts || b.date));
  let weightChange = null;
  if(bodyEntries.length >= 2){
    weightChange = Math.round((bodyEntries[0].weight - bodyEntries[bodyEntries.length-1].weight) * 10) / 10;
  }
  
  // PRs set this year (we can't tell exactly, but count distinct exercises)
  const prs = ls('totry_prs') || {};
  const prCount = Object.keys(prs).length;
  
  // Reviews + examens
  const reviews = (ls('totry_reviews')||[]).filter(r => inYear(r.ts)).length;
  const examens = (ls('totry_examens')||[]).filter(e => inYear(e.ts)).length;
  
  return {
    year,
    daysTried: allActivityDates.size,
    totalWins,
    totalFights,
    winRate: totalFights > 0 ? Math.round((totalWins / totalFights) * 100) : 0,
    workouts: workouts.length,
    totalVolume: Math.round(totalVolume),
    viceSavings: Math.round(viceSavings),
    yearIncome: Math.round(yearIncome),
    yearExpenses: Math.round(yearExpenses),
    netMoney: Math.round(yearIncome - yearExpenses),
    prayers: prayers.length,
    answered,
    savedVerses,
    longestStreak,
    weightChange,
    prCount,
    reviews,
    examens
  };
}

function showYearInReview(year){
  year = year || new Date().getFullYear();
  const stats = computeYearInReview(year);
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  
  // Build the headline stats — only show ones that have data
  const heroStats = [];
  if(stats.daysTried > 0) heroStats.push({big: stats.daysTried, label: 'days you tried'});
  if(stats.totalWins > 0) heroStats.push({big: stats.totalWins, label: 'urges fought and won'});
  if(stats.workouts > 0) heroStats.push({big: stats.workouts, label: 'sessions trained'});
  if(stats.longestStreak > 0) heroStats.push({big: stats.longestStreak, label: 'longest clean streak (days)'});
  
  const heroHtml = heroStats.length ?
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">' +
      heroStats.map(h =>
        '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:14px;text-align:center">' +
          '<div style="font-family:Georgia,serif;font-size:34px;color:var(--go);line-height:1.1">' + h.big + '</div>' +
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-top:6px">' + h.label + '</div>' +
        '</div>'
      ).join('') +
    '</div>' : '';
  
  // Detail rows
  const details = [];
  if(stats.examens > 0) details.push(['Ignatian Examens', stats.examens]);
  if(stats.reviews > 0) details.push(['Weekly reviews', stats.reviews]);
  if(stats.prayers > 0) details.push(['Prayers added', stats.prayers + (stats.answered > 0 ? ' (' + stats.answered + ' answered)' : '')]);
  if(stats.savedVerses > 0) details.push(['Verses saved', stats.savedVerses]);
  if(stats.prCount > 0) details.push(['Exercises with PRs', stats.prCount]);
  if(stats.totalVolume > 0) details.push(['Total volume moved', stats.totalVolume.toLocaleString() + ' kg']);
  if(stats.weightChange !== null) details.push(['Weight change', (stats.weightChange > 0 ? '+' : '') + stats.weightChange + ' kg']);
  if(stats.viceSavings > 0) details.push(['Money saved from vices', curSym() + stats.viceSavings.toLocaleString()]);
  if(stats.yearIncome > 0 || stats.yearExpenses > 0) details.push(['Money flow', curSym() + stats.yearIncome.toLocaleString() + ' in / '+curSym() + stats.yearExpenses.toLocaleString() + ' out']);
  if(stats.winRate > 0) details.push(['Battle win rate', stats.winRate + '%']);
  
  const detailHtml = details.length ?
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:14px;margin-bottom:14px">' +
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">' + year + ' · the full year</div>' +
      details.map(([k,v]) => '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd);font-size:12px"><span style="color:var(--tx3)">' + k + '</span><span style="font-family:DM Mono,monospace;color:var(--tx)">' + v + '</span></div>').join('') +
    '</div>' : '';
  
  // Empty fallback
  if(!heroStats.length && !details.length){
    m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
      '<h3 style="margin-bottom:8px">' + year + ' in review</h3>' +
      '<p style="font-size:13px;color:var(--tx3);padding:20px 0;text-align:center;font-style:italic">No data logged in ' + year + ' yet. Come back at year-end.</p>' +
      '<button class="btn" onclick="closeModal(this)">Close</button>' +
    '</div>';
    document.body.appendChild(m);
    return;
  }
  
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px">A year of trying</div>' +
    '<h3 style="margin-bottom:14px">' + year + ' in review</h3>' +
    heroHtml +
    detailHtml +
    '<div style="font-family:Cormorant Garamond,serif;font-size:16px;font-style:italic;color:var(--tx2);text-align:center;line-height:1.6;margin-bottom:14px">"The least we can do everyday, is to try."<br>You did. ' + stats.daysTried + ' times this year.</div>' +
    '<button class="btn primary" onclick="generateShareCard();closeModal(this)" style="margin-bottom:8px">Share this year</button>' +
    '<button class="btn" onclick="closeModal(this)">Close</button>' +
  '</div>';
  document.body.appendChild(m);
  haptic('celebrate');
}

// Auto-prompt year in review in the last 5 days of December
function checkYearInReviewPrompt(){
  const now = new Date();
  // Dec 27, 28, 29, 30, 31
  if(now.getMonth() === 11 && now.getDate() >= 27){
    const year = now.getFullYear();
    const seenKey = 'totry_year_review_shown_' + year;
    // Install on 28 December and the very first thing the app did was hand you a review of a year you
    // had not been here for: "No data logged in 2026 yet. Come back at year-end." It is year-end. A
    // retrospective needs something to look back on, so wait until there is.
    if(typeof daysInstalled === 'function' && daysInstalled() < 30){ ls(seenKey, true); return; }
    if(!ls(seenKey)){
      ls(seenKey, true);
      setTimeout(() => showYearInReview(year), 1500);
    }
  }
}


function showSynthesisHistory(){
  const syntheses=ls('totry_syntheses')||[];
  document.querySelector('.modal-bg.open')?.remove();
  const m=document.createElement('div');
  m.className='modal-bg open';
  
  if(!syntheses.length){
    m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
      '<h3 style="margin-bottom:8px">Past Sundays</h3>' +
      '<p style="font-size:13px;color:var(--tx3);padding:20px 0;text-align:center;font-style:italic">No weekly syntheses yet. One generates each Sunday automatically — based on your week\'s data.</p>' +
      '<button class="btn" onclick="closeModal(this)">Close</button>' +
    '</div>';
    document.body.appendChild(m);
    return;
  }
  
  const itemsHtml = syntheses.map((s, i) => {
    const stats = s.stats || {};
    const summary = [];
    if(stats.workouts > 0) summary.push(stats.workouts + ' workout' + (stats.workouts===1?'':'s'));
    if(stats.examens > 0) summary.push(stats.examens + ' examen' + (stats.examens===1?'':'s'));
    if(stats.wins > 0) summary.push(stats.wins + ' fight' + (stats.wins===1?'':'s') + ' won');
    if(stats.prayers > 0) summary.push(stats.prayers + ' prayer' + (stats.prayers===1?'':'s'));
    const summaryLine = summary.length ? '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:6px">' + summary.join(' · ') + '</div>' : '';
    const previewText = (s.text || '').slice(0, 130) + ((s.text || '').length > 130 ? '…' : '');
    
    return '<div onclick="viewSingleSynthesis(' + i + ')" style="background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:12px 14px;margin-bottom:8px;cursor:pointer">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
        '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em">Week of ' + s.date + '</div>' +
        '<div style="font-size:14px;color:var(--tx3)">›</div>' +
      '</div>' +
      '<div style="font-family:Cormorant Garamond,serif;font-size:13px;font-style:italic;color:var(--tx2);line-height:1.6">' + previewText.replace(/</g, '&lt;') + '</div>' +
      summaryLine +
    '</div>';
  }).join('');
  
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px">' + syntheses.length + ' week' + (syntheses.length === 1 ? '' : 's') + ' reflected</div>' +
    '<h3 style="margin-bottom:12px">Past Sundays</h3>' +
    '<div style="max-height:60vh;overflow-y:auto;padding-right:4px;margin-bottom:14px">' + itemsHtml + '</div>' +
    '<button class="btn" onclick="closeModal(this)">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}

function viewSingleSynthesis(idx){
  document.querySelector('.modal-bg.open')?.remove();
  const syntheses=ls('totry_syntheses')||[];
  const s=syntheses[idx];
  if(!s)return;
  
  // Use the rich modal if stats present
  if(s.stats && typeof showWeeklySynthesisModal === 'function'){
    showWeeklySynthesisModal(s);
    return;
  }
  
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.innerHTML='<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px">Week of '+s.date+'</div>'+
    '<h3 style="margin-bottom:14px">Reflection</h3>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:15px;color:var(--tx);line-height:1.75;font-style:italic;background:linear-gradient(135deg,rgba(200,169,110,0.04),rgba(140,107,182,0.03));border-left:3px solid var(--go);padding:14px;border-radius:0 10px 10px 0;margin-bottom:14px">'+(s.text || '').replace(/\n/g, '<br>')+'</div>'+
    '<button class="btn" onclick="showSynthesisHistory()" style="margin-bottom:8px">Back to list</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:1px solid var(--bd)">Close</button>'+
  '</div>';
  document.body.appendChild(m);
}

function updateSynthesisCount(){
  const el = document.getElementById('synthesis-count');
  if(el) el.textContent = (ls('totry_syntheses') || []).length;
}


// ═══════════════════════════════════════════════════
// PASS 4: RELATIONSHIPS LAYER
// ═══════════════════════════════════════════════════
function addRelationship(){
  const name=document.getElementById('rel-name')?.value.trim();
  const role=document.getElementById('rel-role')?.value;
  if(!name)return;
  const people=ls('totry_relationships')||[];
  if(people.find(p=>p.name===name)){
    showToast('Already added',name+' is in your list.');
    return;
  }
  people.push({
    id:Date.now(),
    name,
    role,
    lastContact:null,
    addedAt:new Date().toISOString()
  });
  ls('totry_relationships',people);
  document.getElementById('rel-name').value='';
  renderRelationships();
  showToast('Added',name+' is now on your list. Stay in touch.');
}

function logContact(id){
  const people=ls('totry_relationships')||[];
  const p=people.find(p=>p.id===id);
  if(!p)return;
  p.lastContact=new Date().toISOString();
  ls('totry_relationships',people);
  renderRelationships();
  showToast('Logged','Connected with '+p.name+' today.');
  haptic('success');
}

function deleteRelationship(id){
  // A one-tap destructive action on a glyph a few pixels wide, with no undo anywhere in the app.
  if(!confirm('Remove this person? Everything you have logged about them goes too.')) return;
  const people=ls('totry_relationships')||[];
  const removed=people.find(p=>p.id===id);
  const newPeople=people.filter(p=>p.id!==id);
  // totry_relationships joined the ARR union this release — merged instead of overwritten — so from
  // now on a removal must be recorded or the cloud copy restores the person on the next pull.
  try{ if(typeof tombstoneRemoved === 'function') tombstoneRemoved('totry_relationships', people, newPeople); }catch(_){}
  ls('totry_relationships',newPeople);
  renderRelationships();
  if(removed){
    showUndo('Removed '+removed.name,()=>{
      const cur=ls('totry_relationships')||[];
      cur.push(removed);
      ls('totry_relationships',cur);
      renderRelationships();
    });
  }
}

function renderRelationships(){
  const list=document.getElementById('relationships-list');
  if(!list)return;
  const people=ls('totry_relationships')||[];
  if(!people.length){
    list.innerHTML='<p style="font-size:12px;color:var(--tx3);text-align:center;padding:14px;font-style:italic">No one added yet.</p>';
    return;
  }
  // Sort: those without recent contact first
  const sorted=[...people].sort((a,b)=>{
    if(!a.lastContact)return -1;
    if(!b.lastContact)return 1;
    return new Date(a.lastContact)-new Date(b.lastContact);
  });
  list.innerHTML='';
  sorted.forEach(p=>{
    let timeAgo='Never';
    let nudge='';
    if(p.lastContact){
      const days=Math.floor((Date.now()-new Date(p.lastContact))/86400000);
      if(days===0)timeAgo='Today';
      else if(days===1)timeAgo='Yesterday';
      else if(days<7)timeAgo=days+' days ago';
      else if(days<30)timeAgo=Math.floor(days/7)+' weeks ago';
      else timeAgo=Math.floor(days/30)+' months ago';
      // Nudge color based on time
      if(days>14)nudge='var(--re)';
      else if(days>7)nudge='var(--go)';
      else nudge='var(--gr)';
    }else{
      nudge='var(--re)';
    }
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg3);border:1px solid var(--bd);border-radius:8px;margin-bottom:6px';
    row.innerHTML='<div style="flex:1">'+
      '<div style="font-size:13px;font-weight:500;color:var(--tx)">'+p.name+'</div>'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:'+nudge+';margin-top:2px">'+p.role.toUpperCase()+' · '+timeAgo+'</div>'+
    '</div>'+
    '<button class="btn" style="width:auto;padding:5px 8px;font-size:11px" onclick="logContact('+p.id+')">Connected</button>'+
    '<button class="btn" style="width:auto;padding:5px 8px;font-size:11px;background:none;border:none;color:var(--tx3)" onclick="deleteRelationship('+p.id+')" aria-label="Close">&#215;</button>';
    list.appendChild(row);
  });
}

// ═══════════════════════════════════════════════════
// PASS 4: LETTERS TO SELF
// ═══════════════════════════════════════════════════

function deliverLetter(id){
  const letters=ls('totry_letters')||[];
  const letter=letters.find(l=>l.id===id);
  if(!letter)return;
  letter.delivered=true;
  letter.openedAt=new Date().toISOString();
  ls('totry_letters',letters);
  
  // Show the letter beautifully
  const writtenDate=new Date(letter.written).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="max-width:90vw">'+
    '<div class="modal-handle"></div>'+
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;text-align:center;margin-bottom:6px">Letter from '+writtenDate+' · Day '+letter.writtenDay+'</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:18px;color:var(--tx);text-align:center;margin-bottom:18px;font-style:italic">A message from past you.</div>'+
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:8px;padding:16px;font-family:Cormorant Garamond,serif;font-size:16px;color:var(--tx);line-height:1.7;white-space:pre-wrap;margin-bottom:14px">'+letter.text+'</div>'+
    '<button class="btn primary" onclick="closeModal(this)">Close</button>'+
  '</div>';
  document.body.appendChild(m);
  haptic('celebrate');
  renderLetters();
}

function deleteLetter(id){
  // A one-tap destructive action on a glyph a few pixels wide, with no undo anywhere in the app.
  if(!confirm('Delete this letter? You wrote it to yourself — it cannot be recovered.')) return;
  const letters=ls('totry_letters')||[];
  const removed=letters.find(l=>l.id===id);
  const kept=letters.filter(l=>l.id!==id);
  // Same as above: totry_letters is unioned now. "It cannot be recovered" is what the confirm promises,
  // and a letter that reappears after they chose to destroy it breaks that promise the other way.
  try{ if(typeof tombstoneRemoved === 'function') tombstoneRemoved('totry_letters', letters, kept); }catch(_){}
  ls('totry_letters',kept);
  renderLetters();
  if(removed){
    showUndo('Letter deleted',()=>{
      const cur=ls('totry_letters')||[];
      cur.push(removed);
      ls('totry_letters',cur);
      renderLetters();
    });
  }
}

// ── "YOUR WHY" PAGE ── the reason + affirmations + promises + letters, all in one home.
// ── TODAY IN THE CHURCH ── free Catholic readings API (cpbjr.github.io, no key, no rate limit).
// Cached per-day in localStorage so it loads instantly and survives the API being down.
async function fetchLiturgy(){
  const now = new Date();
  const y = now.getFullYear();
  const mmdd = String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  const cacheKey = 'totry_liturgy_' + y + '-' + mmdd;
  const cached = ls(cacheKey);
  if(cached) return cached;
  const base = 'https://cpbjr.github.io/catholic-readings-api';
  const out = { readings:null, celebration:null, season:null };
  try{
    const r = await fetch(base + '/readings/' + y + '/' + mmdd + '.json');
    if(r.ok){ const d = await r.json(); out.readings = d.readings || null; out.season = d.season || null; out.usccb = d.usccbLink || null; }
  }catch(_){ }
  try{
    const c = await fetch(base + '/liturgical-calendar/' + y + '/' + mmdd + '.json');
    if(c.ok){ const d = await c.json(); out.celebration = d.celebration || null; if(!out.season) out.season = d.season || null; }
  }catch(_){ }
  if(out.readings || out.celebration){ ls(cacheKey, out); }
  return out;
}
// True when the celebration's description is clearly ABOUT a different saint than the one named — the
// free API's occasional name/bio mismatch. We look for the description's subject ("St. X was/founded/
// devoted…") and flag it when that saint's name doesn't appear in the feast name. Conservative: only
// suppresses on a clear subject mismatch, so a real bio that merely mentions another saint is kept.
function _liturgyCelebrationMismatch(c){
  try{
    if(!c || !c.name || !c.description) return false;
    const m = String(c.description).match(/(?:St\.?|Saint|Bl\.?|Blessed)\s+([A-Z][a-z]+)\s+(?:was|is|were|became|devoted|founded|lived|died|entered|joined|gave|served|preached)/);
    if(!m) return false;
    const subject = m[1].toLowerCase();
    return String(c.name).toLowerCase().indexOf(subject) === -1;
  }catch(_){ return false; }
}
async function renderLiturgy(){
  const box = document.getElementById('liturgy-content');
  const dateEl = document.getElementById('liturgy-date');
  if(!box) return;
  if(dateEl) dateEl.textContent = new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'});
  let d;
  try{ d = await fetchLiturgy(); }catch(_){ d = {readings:null,celebration:null}; }
  if(!d || (!d.readings && !d.celebration)){
    box.innerHTML = '<div class="card" style="text-align:center;padding:24px 16px"><div style="font-size:13px;color:var(--tx2);line-height:1.6">Today\u2019s readings couldn\u2019t load right now. Your verse and prayer above are ready whenever you are.</div><button class="btn" onclick="renderLiturgy()" style="margin-top:12px;width:auto;padding:8px 16px;font-size:12px;background:var(--bg3);border:1px solid var(--bd)">Try again</button></div>';
    return;
  }
  let html = '';
  if(d.season){ html += '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px">'+d.season+'</div>'; }
  if(d.celebration){
    const c = d.celebration;
    // The free calendar API sometimes pairs a correct feast NAME with a quote/bio for a DIFFERENT
