// ── UNIFIED SEND COACH PROMPT ─────────────────────────────────
function sendCoachPrompt(text){
  document.getElementById('coach-in').value=text;
  sendCoach();
}

// getDebtStr defined above

// ── ADAPTIVE COACH QUICK-REPLIES ─────────────────────────────
// Renders chips based on what's actually happening right now in the user's data.
// Called every time the Coach tab opens. Limits to 6-8 most relevant chips.
function renderCoachQuickReplies(){
  const box = document.getElementById('coach-quick-replies');
  if(!box) return;
  
  const chips = []; // {label, prompt, priority}
  
  loadV(); loadH(); loadF();
  const ti = tIdx();
  const split = getUserSplit();
  const todayFocus = split[ti]?.focus;
  
  const todayKey = new Date().toLocaleDateString('en-AU');
  const nutLog = ls('totry_nutlog') || {};
  const todayEntries = nutLog[todayKey] || [];
  const todayCals = todayEntries.reduce((a,e)=>a+(e.cal||0),0);
  const nutGoals = ls('totry_nut_goals') || {cal:2100,pro:170};
  
  const habitsToday = habits.filter(h => h.d[ti] === 1).length;
  const habitsTotal = habits.length;
  
  const fast = ls('totry_fasting') || {};
  const isFasting = !!fast.startTs;
  const fastHours = isFasting ? (Date.now() - fast.startTs) / 3600000 : 0;
  
  const recentRelapse = vices.some(v => {
    if(!v.startDate || !v.relapseCount) return false;
    const hrs = (Date.now() - new Date(v.startDate).getTime()) / 3600000;
    return hrs < 36;
  });
  const longestStreak = vices.length ? Math.max(...vices.map(v => viceCleanDays(v))) : 0;
  
  const debtRemaining = debts.reduce((s,d)=>s+(d.t-d.p),0);
  
  const bills = (ls('totry_bills') || []).filter(b => !b.paid);
  const dueSoon = bills.filter(b => {
    const days = (new Date(b.due).getTime() - Date.now()) / 86400000;
    return days < 7;
  });
  
  const prayers = (ls('totry_prayers') || []).filter(p => p.status === 'open');
  
  const hour = new Date().getHours();
  const isMorning = hour < 11;
  const isEvening = hour >= 19;
  const isNight = hour >= 22 || hour < 6;
  
  // PRIORITY 1 — urgent state
  if(recentRelapse){
    chips.push({p: 9, label: '💔 Help me reset', prompt: 'I just slipped up. Help me reset without shame and without losing what I had built.'});
  }
  if(isNight){
    chips.push({p: 8, label: '🌙 Get me to bed clean', prompt: 'It is late at night and I feel my willpower is gone. What do I do for the next 20 minutes to get to sleep without falling?'});
  }
  if(dueSoon.length > 0){
    chips.push({p: 7, label: '⚠ What bill first?', prompt: 'I have ' + dueSoon.length + ' bill' + (dueSoon.length===1?'':'s') + ' due in the next week. ' + getDebtStr() + '. What do I pay first?'});
  }
  
  // PRIORITY 2 — time of day
  if(isMorning){
    chips.push({p: 6, label: '🌅 What\'s my focus today?', prompt: 'I just woke up. Day ' + getDayCount() + '. What should be my one focus for today based on what you know about me?'});
  }
  if(isEvening){
    chips.push({p: 6, label: '🌆 Walk me through today', prompt: 'Walk me through my day. What did I do well? What do I need to address before bed?'});
  }
  
  // PRIORITY 3 — opportunities/state
  if(isFasting && fastHours >= 12){
    chips.push({p: 5, label: '⏱ Push me to finish the fast', prompt: 'I am ' + Math.floor(fastHours) + 'h into my fast. Help me push through to the end with the right mindset.'});
  }
  if(todayFocus && todayFocus !== 'Rest'){
    chips.push({p: 5, label: '💪 Plan ' + (todayFocus.length > 12 ? todayFocus.slice(0,12)+'…' : todayFocus), prompt: 'Today is ' + todayFocus + ' day in my split. Give me exact sets/reps and meals to crush it.'});
  }
  if(longestStreak >= 7){
    chips.push({p: 4, label: '🔥 Keep me sharp at day ' + longestStreak, prompt: 'I am on a ' + longestStreak + '-day clean streak. How do I keep building without getting complacent?'});
  }
  if(habitsTotal > 0 && habitsToday < habitsTotal / 2){
    chips.push({p: 4, label: '📋 What habits matter most?', prompt: 'I have only hit ' + habitsToday + '/' + habitsTotal + ' habits today. Which ones matter most for me to finish before bed?'});
  }
  if(prayers.length > 0){
    chips.push({p: 3, label: '🙏 Pray with me', prompt: 'I have ' + prayers.length + ' prayer' + (prayers.length===1?'':'s') + ' I am still praying about. Help me bring them to God right now.'});
  }
  // Cronometer "Oracle"-style: if protein is tracking low today, offer food fixes via Coach.
  try{
    const _today = new Date().toLocaleDateString('en-AU');
    const _ents = (ls('totry_nutlog')||{})[_today] || [];
    if(_ents.length >= 2){
      const _pro = _ents.reduce((a,e)=>a+(e.pro||0),0);
      const _proGoal = (ls('totry_nut_goals')||{}).pro || 0;
      const _hr = new Date().getHours();
      if(_proGoal > 0 && _hr >= 14 && _pro < _proGoal * 0.5){
        chips.push({p: 4, label: '🍗 I\'m low on protein today', prompt: 'I\'ve only had about ' + Math.round(_pro) + 'g of protein today and my goal is ' + _proGoal + 'g. Suggest a few realistic high-protein foods or meals to help me close the gap before bed.'});
      }
    }
  }catch(_){}
  // Sacraments — gently surface if confession has been a while (the user wants to grow closer to God)
  const _confList = ls('totry_confessions') || [];
  if(_confList.length){
    const cdays = Math.floor((Date.now() - new Date((latestByDate(_confList)||{}).date).getTime()) / 86400000);
    if(cdays >= 35){
      chips.push({p: 4, label: '🕊 It\'s been a while since confession', prompt: 'It has been about ' + cdays + ' days since my last confession. Help me prepare my heart and examine my conscience honestly.'});
    }
  }
  if(debtRemaining > 0){
    chips.push({p: 3, label: '💰 How do I clear debt faster?', prompt: 'How do I get out of '+curSym() + Math.round(debtRemaining).toLocaleString() + ' debt faster based on my actual income and spending?'});
  }
  
  // PRIORITY 4 — always-on fallbacks
  chips.push({p: 2, label: '📖 Verse for what I\'m feeling', prompt: 'I need a verse and a word for what I am going through right now.'});
  chips.push({p: 2, label: '🎯 Full check-in', prompt: 'Give me a full check-in. What should I prioritise this week across everything you know about me?'});
  chips.push({p: 1, label: '💭 Who am I becoming?', prompt: 'I want to talk about who I am becoming and why I keep falling into old patterns.'});
  
  // Sort by priority descending, take top 7
  chips.sort((a,b) => b.p - a.p);
  const top = chips.slice(0, 7);
  
  box.innerHTML = top.map(c => {
    const safe = c.prompt.replace(/'/g, "&apos;").replace(/"/g, '&quot;');
    return '<button class="qb" onclick="sendCoachPrompt(\'' + safe.replace(/'/g, "\\'") + '\')">' + c.label + '</button>';
  }).join('');
}


