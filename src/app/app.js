// ── HOME HABITS WIDGET ────────────────────────────────────────
// ── NEW-USER PREVIEW BANNER ─────────────────────────────────
// Shows on home for first 7 days unless dismissed. Opens a preview modal
// that shows what the app looks like with 60 days of data — without storing
// any of it in the user's actual data.
function checkPreviewBanner(){
  renderFirstRun();
  checkPostRelapse();
  const banner = document.getElementById('newuser-preview-banner');
  if(!banner) return;
  const day = getDayCount();
  const dismissed = ls('totry_preview_dismissed');
  // Hide the 60-day preview banner while the first-run checklist is still showing,
  // so a new user isn't hit with two onboarding cards at once.
  const firstRunActive = document.getElementById('firstrun-card')?.style.display === 'block';
  if(day <= 7 && !dismissed && !firstRunActive){
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

function dismissPreviewBanner(){
  ls('totry_preview_dismissed', true);
  const banner = document.getElementById('newuser-preview-banner');
  if(banner) banner.style.display = 'none';
}

// ── FIRST-RUN GUIDANCE ────────────────────────────────────────
// New users land in a blank app. This checklist points them at the 4 foundational
// actions and disappears once they're done (or dismissed). Never shows after day 10.
function getFirstRunSteps(){
  loadV();
  const identity = ls('totry_identity');
  const habitsArr = ls('totry_h');
  // NOT "the array is non-empty" — the app seeds six habits itself, so that was true before the person
  // had done anything. This means "they made this list theirs": added one, or edited the defaults.
  const hasHabits = !!ls('totry_habits_touched') ||
    (Array.isArray(habitsArr) && habitsArr.some(h => h && Array.isArray(h.d) && h.d.some(x => x)));
  const coachHistory = ls('totry_coach_history') || [];
  return [
    {
      done: !!(identity && identity.trim()),
      label: 'Set who you\'re becoming',
      desc: 'One sentence. Your north star.',
      action: "go('why');setTimeout(()=>document.getElementById('settings-identity')?.scrollIntoView({behavior:'smooth',block:'center'}),300)"
    },
    {
      done: vices && vices.length > 0,
      label: 'Name what you\'re fighting',
      desc: 'The vices you want to beat.',
      action: "go('fight')"
    },
    {
      done: hasHabits,
      label: 'Add your first habits',
      desc: 'The daily actions that build you.',
      // Was: go('fight') then scroll to #new-habit — an id that has never existed, and the ?. meant it
      // failed silently. So the app's own "Add your first habits" suggestion did nothing at all.
      action: "openAddHabit()"
    },
    {
      done: coachHistory.length > 0,
      label: 'Say hello to your Coach',
      desc: 'It already knows your context.',
      action: "go('coach')"
    }
  ];
}
function renderFirstRun(){
  const card = document.getElementById('firstrun-card');
  if(!card) return;
  // Never show past day 10, or once the user has dismissed it
  if(ls('totry_firstrun_dismissed') || getDayCount() > 10){
    card.style.display = 'none';
    return;
  }
  const steps = getFirstRunSteps();
  const doneCount = steps.filter(s => s.done).length;
  // Auto-hide once all four are complete
  if(doneCount === steps.length){
    card.style.display = 'none';
    ls('totry_firstrun_dismissed', true);
    return;
  }
  card.style.display = 'block';
  const stepsEl = document.getElementById('firstrun-steps');
  if(stepsEl){
    stepsEl.innerHTML = steps.map(s => {
      const check = s.done
        ? '<div style="width:22px;height:22px;border-radius:50%;background:var(--gr);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#000;font-size:13px;font-weight:700">✓</div>'
        : '<div style="width:22px;height:22px;border-radius:50%;border:2px solid var(--bd2);flex-shrink:0"></div>';
      const textStyle = s.done ? 'color:var(--tx3);text-decoration:line-through' : 'color:var(--tx)';
      const tap = s.done ? '' : ' onclick="' + s.action.replace(/"/g,'&quot;') + '" style="cursor:pointer"';
      return '<div' + tap + ' style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)">' +
        check +
        '<div style="flex:1">' +
          '<div style="font-size:13px;font-weight:500;' + textStyle + '">' + s.label + '</div>' +
          (s.done ? '' : '<div style="font-size:11px;color:var(--tx3);margin-top:1px">' + s.desc + '</div>') +
        '</div>' +
        (s.done ? '' : '<span style="color:var(--go);font-size:16px">›</span>') +
      '</div>';
    }).join('');
  }
  const prog = document.getElementById('firstrun-progress');
  if(prog) prog.textContent = doneCount + ' OF ' + steps.length + ' DONE';
}
// ── WHAT'S NEW ────────────────────────────────────────────────
// Shows a one-time card when the user opens a version they haven't seen the changelog for.
// Skips brand-new users (day <= 2) — "what's new" only makes sense once you've used it a bit.
function checkChangelog(){
  const seen = ls('totry_changelog_seen');
  if(seen === APP_VERSION) return;            // already saw this version's notes
  const entry = CHANGELOG[APP_VERSION];
  // Only interrupt the user for MAJOR releases (entry.major === true). Routine updates
  // just silently mark as seen — no popup. Keeps the app feeling calm, not naggy.
  if(!entry || !entry.major){ ls('totry_changelog_seen', APP_VERSION); return; }
  // Don't interrupt a brand-new user; mark as seen so they only get FUTURE changelogs
  if(getDayCount() <= 2){
    ls('totry_changelog_seen', APP_VERSION);
    return;
  }
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:6px">' + APP_VERSION + ' · just updated</div>' +
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);font-style:italic;margin-bottom:14px">' + entry.title + '</div>' +
    '<div style="margin-bottom:16px">' +
      entry.items.map(it =>
        '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)">' +
          '<span style="color:var(--go);flex-shrink:0">›</span>' +
          '<span style="font-size:13px;color:var(--tx2);line-height:1.5">' + it + '</span>' +
        '</div>'
      ).join('') +
    '</div>' +
    '<button class="btn primary" onclick="ackChangelog()">Got it</button>' +
  '</div>';
  document.body.appendChild(m);
}
function ackChangelog(){
  ls('totry_changelog_seen', APP_VERSION);
  document.querySelector('.modal-bg.open')?.remove();
}

// One-time "what's possible" tour for brand-new users — shows the breadth of the app
// without the overwhelm. Fires once, only for genuinely new accounts.
function checkWhatsPossible(){
  if(ls('totry_possible_seen')) return;
  // Only for new users (within first 2 days); older users never see it
  if(getDayCount() > 2){ ls('totry_possible_seen', true); return; }
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.14em;margin-bottom:6px">Welcome</div>' +
    '<div style="font-family:Cormorant Garamond,serif;font-size:26px;color:var(--tx);font-style:italic;margin-bottom:6px">' + WHATS_POSSIBLE.title + '</div>' +
    /* Was "A complete tool for the modern man" — this app is explicitly for men and women both, and the
       founder's story being a big-brother one does not make the product's voice male. NOTE: this whole
       modal is currently unreachable (checkWhatsPossible has no caller), so the copy has never shipped —
       fixed anyway so it cannot ship wrong if anyone wires it up later. */
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px;line-height:1.5">Your whole life in one place. Explore at your own pace — it all lives behind five simple tabs.</p>' +
    '<div style="margin-bottom:16px">' +
      WHATS_POSSIBLE.items.map(it =>
        '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)">' +
          '<span style="color:var(--go);flex-shrink:0">›</span>' +
          '<span style="font-size:13px;color:var(--tx2);line-height:1.5">' + it + '</span>' +
        '</div>'
      ).join('') +
    '</div>' +
    '<button class="btn primary" onclick="ackWhatsPossible()">Let\'s begin</button>' +
  '</div>';
  document.body.appendChild(m);
}
function ackWhatsPossible(){
  ls('totry_possible_seen', true);
  document.querySelector('.modal-bg.open')?.remove();
}

function dismissFirstRun(){
  ls('totry_firstrun_dismissed', true);
  const card = document.getElementById('firstrun-card');
  if(card) card.style.display = 'none';
  checkPreviewBanner();
}

// ── POST-RELAPSE COMPASSION ───────────────────────────────────
// The 72 hours after a slip are the most fragile. Instead of greeting the user with a
// reset "0 days" counter, we lead with grace: their resilience is intact, today is a fresh
// start, and the Coach is one tap away. Shows only when a relapse happened within 72h.
// Find the most recent relapse timestamp (shared by the ack helpers below).
function _mostRecentRelapseTs(){
  loadV();
  let mostRecent = null;
  (vices||[]).forEach(v => { if(v.lastLoss){ const t = new Date(v.lastLoss).getTime(); if(!mostRecent || t > mostRecent) mostRecent = t; } });
  return mostRecent;
}
function dismissRelapseCard(){
  const ts = _mostRecentRelapseTs();
  if(ts){ ls('totry_relapse_ack_' + Math.floor(ts/1000), 1); }
  const card = document.getElementById('postrelapse-card');
  if(card) card.style.display = 'none';
  if(typeof renderTodayForYou === 'function') renderTodayForYou();
}
function ackRelapseAndTalk(){
  // Acknowledge first so the prompt clears once they come back, then open the coach.
  const ts = _mostRecentRelapseTs();
  if(ts){ ls('totry_relapse_ack_' + Math.floor(ts/1000), 1); }
  if(typeof openNeedTalk === 'function'){ openNeedTalk(); }
  else { go('coach'); }
}
function checkPostRelapse(){
  const card = document.getElementById('postrelapse-card');
  if(!card) return;
  loadV();
  if(!vices || !vices.length){ card.style.display = 'none'; return; }
  
  // Find the most recent relapse across all vices
  let mostRecent = null;
  let relapsedVice = null;
  vices.forEach(v => {
    if(v.lastLoss){
      const t = new Date(v.lastLoss).getTime();
      if(!mostRecent || t > mostRecent){ mostRecent = t; relapsedVice = v; }
    }
  });
  
  if(!mostRecent){ card.style.display = 'none'; return; }
  
  const hoursSince = (Date.now() - mostRecent) / 3600000;
  // Only within 72h, and not if they've dismissed this specific relapse
  const dismissKey = 'totry_relapse_ack_' + Math.floor(mostRecent / 1000);
  if(hoursSince > 72 || hoursSince < 0 || ls(dismissKey)){
    card.style.display = 'none';
    return;
  }
  
  card.style.display = 'block';
  const total = relapsedVice ? (relapsedVice.cleanDaysTotal || 0) : 0;
  const resilience = (typeof getResilienceStreak === 'function') ? getResilienceStreak() : 0;
  
  const textEl = document.getElementById('postrelapse-text');
  const subEl = document.getElementById('postrelapse-sub');
  if(textEl){
    if(hoursSince < 24){
      textEl.textContent = 'Yesterday doesn\'t cancel who you\'re becoming.';
    } else {
      textEl.textContent = 'You came back. That\'s the whole game.';
    }
  }
  if(subEl){
    let msg = '';
    if(total > 0) msg += 'Your ' + total + ' total clean days are still yours — a slip doesn\'t erase them. ';
    if(resilience > 0) msg += 'You\'ve shown up ' + resilience + ' days running. ';
    // The line that meets someone right after a slip has to be in THEIR tradition. Proverbs was
    // quoted to everyone — including the default-secular person, who chose no scripture at all, and
    // a Muslim or Buddhist who chose a different one. The thought is universal; the citation is not.
    const _fall = {
      christianity: "Proverbs 24:16 \u2014 the righteous fall seven times and rise again. Let's just do today.",
      islam:        "The best of those who err are those who return. Let's just do today.",
      hinduism:     "Better to stumble on your own path than to walk another's perfectly. Let's just do today.",
      buddhism:     "Falling is not failing \u2014 beginning again IS the practice. Let's just do today.",
      secular:      "Falling down is not the same as staying down. Let's just do today."
    };
    const _tr = (typeof faithTradition==='function') ? faithTradition() : 'secular';
    msg += (_fall[_tr] || _fall.secular);
    subEl.textContent = msg;
  }
}

function showAppPreview(){
  document.querySelector('.modal-bg.open')?.remove();
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  
  // Build a "Day 60 in the life of a user" preview — all illustrative, never saved
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:#8C6BB6;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px">Preview · sample data · not yours</div>' +
    '<h3 style="margin-bottom:6px">What Day 60 looks like</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:16px;line-height:1.6">This is a sample of what your app will look like once you\'ve been logging for 2 months. None of this is real — it\'s just so you can see what you\'re building toward.</p>' +
    '<div style="max-height:62vh;overflow-y:auto;padding-right:4px">' +
    
      // Identity + day count
      '<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:10px">' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:3px">Who you are becoming</div>' +
        '<div style="font-family:Cormorant Garamond,serif;font-size:16px;color:var(--tx);font-style:italic;margin-bottom:8px">Disciplined · present · faithful · strong</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<div style="font-family:DM Mono,monospace;font-size:11px;color:var(--go)">Day 60</div>' +
          '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">38d clean from weed</div>' +
        '</div>' +
      '</div>' +
    
      // Coach line
      '<div style="background:linear-gradient(135deg,rgba(140,107,182,0.1),rgba(200,169,110,0.06));border:1px solid rgba(140,107,182,0.3);border-radius:10px;padding:12px;margin-bottom:10px">' +
        '<div style="font-family:DM Mono,monospace;font-size:8px;color:#8C6BB6;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">Your coach says</div>' +
        '<div style="font-family:Cormorant Garamond,serif;font-size:14px;color:var(--tx);font-style:italic;line-height:1.5">"Yesterday you trained legs hard and journaled about feeling tired. Today: lighter session, double protein, sleep 8h. Phil 4:13."</div>' +
      '</div>' +
    
      // Heatmap mock
      '<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:10px">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">Show-up heatmap · 87% rate</div>' +
        '<div style="display:grid;grid-template-columns:repeat(13,1fr);gap:2px">' +
          Array.from({length:13*7}, (_,i) => {
            const intensity = [0.08, 0.25, 0.5, 0.75, 1][Math.floor(Math.random()*5)];
            return '<div style="aspect-ratio:1;background:rgba(200,169,110,' + intensity + ');border-radius:2px"></div>';
          }).join('') +
        '</div>' +
      '</div>' +
    
      // Training summary mock
      '<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:10px">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">Weekly muscle volume</div>' +
        ['Chest 18.4k kg · 2d ago','Back 22.1k kg · today','Legs 31.8k kg · 1d ago','Shoulders 8.2k kg · 3d ago'].map(r =>
          '<div style="display:flex;justify-content:space-between;font-family:DM Mono,monospace;font-size:11px;color:var(--tx2);padding:3px 0">' +
            '<span>' + r.split(' · ')[0] + '</span><span style="color:var(--tx3)">' + r.split(' · ')[1] + '</span>' +
          '</div>'
        ).join('') +
      '</div>' +
    
      // Nutrition card mock
      '<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:10px">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">Today\'s nutrition</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px">' +
          '<div style="text-align:center"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3)">CAL</div><div style="font-family:DM Mono,monospace;font-size:14px;color:var(--go)">2104</div></div>' +
          '<div style="text-align:center"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3)">PRO</div><div style="font-family:DM Mono,monospace;font-size:14px;color:#A8D8B9">178g</div></div>' +
          '<div style="text-align:center"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3)">FIBER</div><div style="font-family:DM Mono,monospace;font-size:14px;color:var(--gr)">31g</div></div>' +
          '<div style="text-align:center"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3)">VIT C</div><div style="font-family:DM Mono,monospace;font-size:14px;color:var(--tx2)">93%</div></div>' +
        '</div>' +
      '</div>' +
    
      // Vice pattern mock
      '<div style="background:linear-gradient(135deg,rgba(140,107,182,0.08),rgba(200,169,110,0.05));border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:10px">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Patterns from your fights</div>' +
        '<div style="font-size:11px;color:var(--tx2);line-height:1.6">🎯 Top trigger: "boredom" — 6 times · 67% win rate<br>📆 Hardest day: Fridays — 8 fights · 50% won<br>⏰ Peak: late night — 9 fights · 78% won</div>' +
      '</div>' +
    
      // Money mock
      '<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:10px">' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Money</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--tx2);padding:3px 0"><span>Debt remaining</span><span style="font-family:DM Mono,monospace;color:var(--re)">'+curSym()+'6,840</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--tx2);padding:3px 0"><span>Saved from vices</span><span style="font-family:DM Mono,monospace;color:var(--gr)">+'+curSym()+'432</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--tx2);padding:3px 0"><span>USA trip fund</span><span style="font-family:DM Mono,monospace;color:var(--go)">'+curSym()+'1,840 / '+curSym()+'8,000</span></div>' +
      '</div>' +
    
      // Closing line
      '<div style="text-align:center;padding:16px 8px;font-family:Cormorant Garamond,serif;font-size:15px;color:var(--tx2);font-style:italic;line-height:1.6">Your version of this fills in one log at a time. Start with one thing today.</div>' +
    
    '</div>' +
    '<button class="btn primary" onclick="dismissPreviewBanner();closeModal(this)" style="margin-top:14px">Start my Day 1</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:1px solid var(--bd);font-size:12px">Close preview</button>' +
  '</div>';
  document.body.appendChild(m);
}

// ── TESTER SETUP CARD ─────────────────────────────────────────
// Shows once for allowlisted Strava testers who haven't connected yet — pre-empts the silent
// give-up at the invite→connect step (the leakiest part of the tester funnel).
function renderTesterCard(){
  const el = document.getElementById('tester-setup-card');
  if(!el) return;
  const approved = (typeof isStravaApproved === 'function') && isStravaApproved();
  const alreadyConnected = !!ls('totry_strava_token');
  const dismissed = !!ls('totry_tester_card_dismissed');
  el.style.display = (approved && !alreadyConnected && !dismissed) ? 'block' : 'none';
}
function dismissTesterCard(){
  ls('totry_tester_card_dismissed', true);
  const el = document.getElementById('tester-setup-card');
  if(el) el.style.display = 'none';
}
// ── YOUR NEXT STEP ────────────────────────────────────────────
// One dynamic daily action. Picks the most important undone thing for right now, so the user
// never has to decide what to engage with. Reorganizes existing flows — adds no new feature.
function getNextStep(){
  const today = new Date().toLocaleDateString('en-AU');
  const hour = new Date().getHours();
  // 0. HARD-MOMENT AWARENESS (the nervous system). Late night is the classic danger window for
  // most compulsions — gently put the companion in front of them BEFORE anything routine.
  // Prefer HIS learned hard hour over a blanket assumption \u2014 if the pattern engine knows when a
  // fight tends to pull, honour THAT (it may be evening, not midnight). Fall back to late night.
  // Only for someone actually fighting something, and it opens the integrated moment door (which
  // knows the vice, the stakes, the whole life), not a blank chat.
  try{
    if(typeof loadV==='function') loadV();
    const _vs = (typeof vices!=='undefined' && Array.isArray(vices)) ? vices.filter(v=>v&&v.n) : [];
    if(_vs.length){
      const _block = (typeof _viceBlockLabel==='function') ? _viceBlockLabel(hour) : null;
      let _hardVice = null;
      _vs.forEach(v=>{ try{ const p=(typeof analyzeUrgePatterns==='function')?analyzeUrgePatterns(v.n):null; if(p && p.riskWindow===_block) _hardVice=v; }catch(_){} });
      if(_hardVice){
        return { text:'This is usually your hard hour', sub:'Right around when '+_hardVice.n+' tends to pull. Nothing has to be happening \u2014 get ahead of it with me.', action:'breath', actionArg:String(_hardVice.n) };
      }
      if(hour >= 22 || hour < 5){
        return { text:'The hard hour\u2019s near', sub:'Late hours are when it pulls \u2014 get ahead of it. One slow minute, before anything rises.', action:'breath' };
      }
    }
  }catch(_){ }
  // 0b. RECOVERY AWARENESS. Low readiness + no training yet today \u2192 steer toward rest, not pushing.
  try{
    if(typeof computeReadiness === 'function'){
      const _r = computeReadiness();
      const _trained = (typeof getUnifiedTraining==='function') && getUnifiedTraining().some(t=>t.ts && new Date(t.ts).toLocaleDateString('en-AU')===today);
      if(_r && _r.level === 'rest' && !_trained && hour >= 7 && hour < 20){
        return { text:'Your body needs rest today', sub:'Recovery is low \u2014 go gentle. Mobility or a walk, not a max effort.', action:'mobility' };
      }
    }
  }catch(_){ }
  // 1. Morning ritual not done yet today?
  const morningToday = (ls('totry_mornings')||[]).some(m=>m.ts && new Date(m.ts).toLocaleDateString('en-AU')===today);
  if(!morningToday && hour < 12){
    return { text:'Start your morning', sub:'Set today\u2019s intention and gratitude.', action:'morning' };
  }
  // 2. After the morning: surface the next thing actually on the calendar today.
  if(typeof _calEvents === 'function'){
    const nowMin = new Date().getHours()*60 + new Date().getMinutes();
    const todayDow = (new Date().getDay()+6)%7;
    const upcoming = (_calEvents()||[])
      .filter(e => e.day === todayDow && e.start)
      .map(e => { const [h,m]=e.start.split(':').map(Number); return {...e, _min:h*60+(m||0)}; })
      .filter(e => e._min >= nowMin - 30)  // include things starting within the last half hour
      .sort((a,b)=>a._min-b._min);
    if(upcoming.length){
      const nx = upcoming[0];
      const mins = nx._min - nowMin;
      const whenTxt = mins <= 0 ? 'now' : mins < 60 ? ('in '+mins+' min') : ('at '+nx.start);
      return { text: nx.title, sub: 'Coming up '+whenTxt+' \u00b7 tap to see your day', action:'calendar' };
    }
  }
  // 3. No training logged today?
  const trainedToday = (typeof getUnifiedTraining==='function') && getUnifiedTraining().some(t=>t.ts && new Date(t.ts).toLocaleDateString('en-AU')===today);
  if(!trainedToday && hour >= 10 && hour < 21){
    return { text:'Log today\u2019s training', sub:'A workout, a walk, anything you did.', action:'train' };
  }
  // 3. Evening: examen / reflection not done?
  if(hour >= 17){
    const examenToday = (ls('totry_examens')||[]).some(e=>e.ts && new Date(e.ts).toLocaleDateString('en-AU')===today);
    const eveningToday = (ls('totry_evenings')||[]).some(e=>e.ts && new Date(e.ts).toLocaleDateString('en-AU')===today);
    if(!eveningToday || !examenToday){
      return { text:'Close your day', sub:_nextStepCloseSub(), action:'reflect' };
    }
  }
  // 4. Morning's done but it's still early and nothing else pressing — gentle prayer nudge.
  // totry_prayer_done has ZERO writers anywhere in the app, so this was permanently falsy and the home's
  // next step said "Take a moment to pray" all morning even to someone who had just prayed, saved an
  // intention and finished their Examen. Nagging a person about the thing they just did is the exact
  // opposite of this app's promise. Derive it from what actually gets written instead.
  const prayedToday = (function(){
    try{
      const sameDay = ts => ts && new Date(ts).toLocaleDateString('en-AU') === today;
      if((ls('totry_prayers')||[]).some(p => p && (sameDay(p.createdAt) || sameDay(p.ts)))) return true;
      if((ls('totry_examens')||[]).some(e => e && sameDay(e.ts))) return true;
      if((ls('totry_rosaries')||[]).some(r => r && (sameDay(r.ts) || sameDay(r.date)))) return true;
      const m = (ls('totry_mornings')||[])[0];
      if(m && sameDay(m.ts) && (m.intention || m.gratitude)) return true;
      return false;
    }catch(_){ return false; }
  })();
  if(!prayedToday && hour < 17){
    return { text:'Take a moment to pray', sub:'A short scripture and prayer for today.', action:'soul' };
  }
  // 5. Everything core is done.
  return { text:'You\u2019ve done today\u2019s work', sub:'Rest, or revisit anything you like.', action:'reflect', done:true };
}
// The home's time-aware greeting — this is what makes the home FEEL different through the day.
// Morning: invite setting the day. Midday/afternoon: a light check-in. Evening: invite closing it.
// It also knows what you've already done today, so it never tells you to do something you've done.
// PROGRESSIVE DISCLOSURE — the #1 retention lever the evidence names. The research is blunt:
// "overwhelming feature presentation creates immediate abandonment." So a new man does NOT see the
// whole cathedral. The first days he sees only what serves him now — the brother, his identity, his
// one next step, the guided start. Depth UNLOCKS as he establishes himself, so the app grows WITH
// him instead of drowning him. This is the opposite of how the field fails.
function applyHomeProgressiveDisclosure(){
  try{
    // HOW LONG THEY HAVE HAD THE APP, NOT WHAT THEIR COUNTER SAYS. getDayCount() honours the
    // "Begin again — Day 1" reset in Settings, which is about their journey, not their familiarity
    // with the app. So someone who had used To Try for eight months and chose to start again had the
    // home stripped back to a new-user's home — the in-the-moment help they had come to rely on
    // hidden from them at the exact moment they had just declared they were starting over.
    const day = (typeof daysInstalled==='function') ? daysInstalled() : 99;
    // Advanced surfaces, each with the day they unlock. Before that, they're hidden so the home
    // stays calm and graspable. (If a card is already hidden by its own logic, we leave it hidden.)
    const gates = [
      { id:'home-insight',              unlock:4 },
      { id:'home-readiness-card',       unlock:3 },
      { id:'home-weekly-reflection-card', unlock:7 },
      { id:'home-quickwin-wrap',        unlock:3 },
      { id:'home-calendar-card',        unlock:5 },
      { id:'today-for-you',             unlock:4 },
      // A new person has no 'last week' — the weekly check-in only shames them. Hold it until a real
      // week of data exists. And 'today's mission' is premature before any rhythm is established.
      { id:'weekly-checkin',            unlock:7 },
      { id:'home-today-mission-wrap',   unlock:3 }
    ];
    gates.forEach(g=>{
      const el = document.getElementById(g.id);
      if(!el) return;
      if(day < g.unlock){ el.dataset._pdHidden='1'; el.style.display='none'; }
      else if(el.dataset._pdHidden==='1'){ delete el.dataset._pdHidden; /* let its own renderer show it next cycle */ }
    });
  }catch(_){}
}

// HOME DEPTH FOLD — the everyday home is a glance (hero + spine + habits); the deeper cards
// (schedule, in-the-moment help, readiness, weekly reflection) live behind ONE tap. Depth on-demand,
// not a wall — kills the 3-4 screen scroll for established users without hiding anything for good.
function toggleHomeDepth(){
  const body=document.getElementById('home-depth-body'); if(!body) return;
  const nowOpen = body.dataset._open!=='1';
  body.style.display = nowOpen?'block':'none';
  body.dataset._open = nowOpen?'1':'0';
  const caret=document.getElementById('home-depth-caret'); if(caret) caret.innerHTML = nowOpen?'&#8963;':'&#8964;';
  const label=document.getElementById('home-depth-label'); if(label) label.textContent = nowOpen?'Show less':'More of your day';
  try{ if(typeof haptic==='function') haptic('tap'); }catch(_){}
  try{ localStorage.setItem('totry_home_depth_open', nowOpen?'1':'0'); }catch(_){}
}
function renderHomeDepthFold(){
  const toggle=document.getElementById('home-depth-toggle');
  const body=document.getElementById('home-depth-body');
  if(!toggle||!body) return;
  // Anything worth showing? Check each child's own render intent (style.display) — the body may be
  // collapsed, so offsetHeight would read 0 for all of them.
  const ids=['home-calendar-card','home-quickwin-wrap','home-readiness-card','home-weekly-reflection-card'];
  const anyContent = ids.some(id=>{ const el=document.getElementById(id); return el && el.style.display!=='none'; });
  if(!anyContent){ toggle.style.display='none'; body.style.display='none'; body.dataset._open='0'; return; }
  toggle.style.display='block';
  let open=false; try{ open = localStorage.getItem('totry_home_depth_open')==='1'; }catch(_){}
  body.style.display = open?'block':'none';
  body.dataset._open = open?'1':'0';
  const caret=document.getElementById('home-depth-caret'); if(caret) caret.innerHTML = open?'&#8963;':'&#8964;';
  const label=document.getElementById('home-depth-label'); if(label) label.textContent = open?'Show less':'More of your day';
}

// YOUR LIFE, WOVEN — the stewardship spine. One glance across the domains a person is called to tend
// (the fight, body, spirit, money), each a door to its depth. The thesis made visible on the home.
function renderLifeWoven(){
  const box=document.getElementById('home-woven'); if(!box) return;
  const s=(typeof getLifeState==='function')?getLifeState():null;
  if(!s){ box.innerHTML=''; return; }
  const today=new Date().toLocaleDateString('en-AU'); const h=new Date().getHours();
  const dOn=(x)=>{ try{ return new Date(x.ts||x.createdAt||x.date||0).toLocaleDateString('en-AU')===today; }catch(_){ return false; } };
  // BODY — trained + fuel today
  const t=s.training||{}, n=s.nutrition||{}; const bodyBits=[];
  if(t.sessions7>0) bodyBits.push(t.sessions7+' session'+(t.sessions7===1?'':'s')+' this wk');
  const goalCal=(ls('totry_nut_goals')||{}).cal;
  // Gentle mode is someone saying "do not show me calorie numbers" — often because counting them is
  // part of what is hurting them. The Nourish tab honours it; Home did not, so the first thing they
  // saw on opening the app was "1,247 cal left". Same words the diary uses, so the two agree.
  if(typeof nutGentle==='function' && nutGentle()){
    if(n.todayCal>0 && typeof _gentleWord==='function') bodyBits.push(_gentleWord(n.todayCal, goalCal).w.toLowerCase());
  }
  else if(n.todayCal!=null && goalCal) bodyBits.push(Math.max(0,goalCal-n.todayCal).toLocaleString()+' cal left');
  else if(n.todayCal>0) bodyBits.push(n.todayCal.toLocaleString()+' cal today');
  const bodyTxt=bodyBits.length?bodyBits.join(' · '):'not logged yet';
  // THE FIGHT — clean streak (quit) or holding the line (moderate)
  const vs=(s.fight&&s.fight.vices)||[]; let fightTxt;
  if(!vs.length) fightTxt='no fight named yet';
  else { const q=vs.filter(v=>v.mode!=='moderate' && v.kind!=='letgo'); if(q.length){ const mc=Math.max.apply(null,q.map(v=>v.cleanDays||0)); fightTxt=mc+' day'+(mc===1?'':'s')+' clean'; } else { const lg=vs.filter(v=>v.kind==='letgo'); fightTxt = lg.length ? 'letting go, day '+Math.max.apply(null,lg.map(v=>v.cleanDays||0)) : 'holding your line'; } }
  // SPIRIT — the daily rhythm
  const mornDone=(ls('totry_mornings')||[]).some(dOn); const evenDone=(ls('totry_evenings')||[]).some(dOn);
  const spiritTxt = evenDone?'day closed ✓' : mornDone?'reflect tonight' : (h<15?'set your intention':'reflect on today');
  // MONEY
  const m=s.money||{}; const moneyBits=[];
  if(m.reclaimed>0) moneyBits.push(curSym()+m.reclaimed.toLocaleString()+' reclaimed');
  if(m.hasDebt) moneyBits.push(curSym()+m.totalDebt.toLocaleString()+' debt');
  const moneyTxt=moneyBits.length?moneyBits.join(' · '):'not tracked yet';
  const rows=[
    ['🛡️','The fight',fightTxt,"go('fight')"],
    ['💪','Body',bodyTxt,"go('grow')"],
    ['🙏','Spirit',spiritTxt,"go('soul')"],
    ['💰','Money',moneyTxt,"go('money')"]
  ];
  box.innerHTML='<div class="card" style="padding:4px 2px;margin-bottom:14px">'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);letter-spacing:0.14em;text-transform:uppercase;padding:8px 12px 2px">Your life, woven</div>'+
    rows.map(r=>'<button onclick="'+r[3]+'" style="width:100%;display:flex;align-items:center;gap:11px;background:none;border:none;border-top:1px solid var(--bd);padding:11px 12px;cursor:pointer;text-align:left">'+
      '<span style="font-size:15px;flex-shrink:0;width:20px;text-align:center">'+r[0]+'</span>'+
      '<span style="font-size:13px;color:var(--tx);flex-shrink:0;width:66px">'+r[1]+'</span>'+
      '<span style="flex:1;font-size:12px;color:var(--tx3);text-align:right">'+r[2]+'</span>'+
      '<span style="color:var(--tx3);font-size:14px;flex-shrink:0;margin-left:6px">›</span>'+
    '</button>').join('')+
    // The one number this app is proud of: not time spent here, but times you left better. Earned (≥3),
    // never shown at zero — the anti-engagement metric made quietly visible. (totry_releases)
    (function(){ const rc=(typeof releaseCount==='function')?releaseCount():0; return rc>=3 ? '<div style="font-family:DM Mono,monospace;font-size:9.5px;color:var(--tx3);letter-spacing:0.05em;line-height:1.5;border-top:1px solid var(--bd);padding:9px 12px 8px;text-align:center">🕊️ '+rc+' times, you came here and walked back into your life</div>' : ''; })()+
  '</div>';
}
function renderHomeGreeting(){
  const hiEl = document.getElementById('home-greeting-hi');
  const subEl = document.getElementById('home-greeting-sub');
  const actEl = document.getElementById('home-greeting-action');
  if(!hiEl || !subEl || !actEl) return;
  const name = ls('totry_name') || '';
  const h = new Date().getHours();
  const today = new Date().toLocaleDateString('en-AU');
  const didMorning = (ls('totry_mornings')||[]).some(m => m.ts && new Date(m.ts).toLocaleDateString('en-AU')===today);
  const didEvening = (ls('totry_evenings')||[]).some(e => e.ts && new Date(e.ts).toLocaleDateString('en-AU')===today);

  let hi, sub, actLabel='', actType='', daypart;
  if(h < 5){
    daypart='night';
    hi = name ? ('Still up, '+name+'?') : 'Still up?';
    sub = 'Rest is part of the work. When you\u2019re ready, the morning will be here.';
  } else if(h < 12){
    daypart='dawn';
    hi = (name ? ('Good morning, '+name+'.') : 'Good morning.');
    if(didMorning){ sub = 'Your morning\u2019s set. Carry it well \u2014 I\u2019m here if the day gets heavy.'; }
    else { sub = 'A new day, fresh and unwritten. Want to set your intention before it starts?'; actLabel='Begin the morning'; actType='morning'; }
  } else if(h < 17){
    daypart='day';
    hi = (name ? ('How\u2019s the day, '+name+'?') : 'How\u2019s the day going?');
    sub = didMorning ? 'You set out with intention this morning. Still on the path?' : 'The day\u2019s underway \u2014 it\u2019s never too late to choose how you meet it.';
    actLabel = 'Check in with me'; actType='companion';
  } else {
    daypart='dusk';
    hi = (name ? ('Good evening, '+name+'.') : 'Good evening.');
    if(didEvening){ sub = 'You\u2019ve closed the day honestly. Rest well \u2014 tomorrow is grace, new again.'; }
    else { sub = 'The day is winding down. Want to look back on it together before you rest?'; actLabel='Close the day'; actType='evening'; }
  }
  if(h >= 21 || h < 5) daypart = 'night';
  try{ document.body.setAttribute('data-daypart', daypart); }catch(_){}
  // Identity line in the hero (what they're becoming), quietly shown.
  try{ const idEl=document.getElementById('hero-identity-text'); const row=document.getElementById('hero-identity'); const identity=ls('totry_identity'); if(idEl){ if(identity){ const _t=identity.replace(/^I am\s+/i,'').trim(); idEl.textContent = _t; if(row) row.style.display=''; } else { idEl.textContent=''; if(row) row.style.display='none'; } } }catch(_){}
  hiEl.textContent = hi;
  // Honor the man's chosen faith intensity — 'light' surfaces the daily verse more gently.
  try{ const vp=document.querySelector('.hero-verse'); if(vp) vp.style.display = (faithLevel()==='light') ? 'none' : ''; }catch(_){}
  subEl.textContent = sub;
  if(actLabel){ actEl.style.display='block'; actEl.textContent = actLabel; actEl.dataset.act = actType; }
  else { actEl.style.display='none'; }
}
function homeGreetingAction(){
  const actEl = document.getElementById('home-greeting-action');
  const t = actEl ? actEl.dataset.act : '';
  if(t==='morning') go('morning');
  else if(t==='evening') go('reflect'); // the evening ritual lives in tab-reflect ("close the day"); go('evening') was a dead-end
  else if(t==='companion'){ if(typeof openCompanionForUrge==='function') openCompanionForUrge(); }
}

function renderNextStep(){
  const el = document.getElementById('next-step-anchor');
  if(!el) return;
  // Don't compete with the first-run card for brand-new users.
  if(!ls('totry_firstrun_dismissed') && getDayCount() <= 3){ el.style.display='none'; return; }
  const step = getNextStep();
  const t = document.getElementById('next-step-text');
  const sub = document.getElementById('next-step-sub');
  if(t) t.textContent = step.text;
  // On a heavy day (several things pending), gently acknowledge it and narrow to just this one —
  // reduces the paralysis of seeing every open loop at once. Calm, not naggy; only when it applies.
  let subText = step.sub;
  try{
    if(!step.done && typeof _countOpenLoops==='function'){
      const open = _countOpenLoops();
      if(open >= 4) subText = 'A lot\u2019s on your plate today \u2014 don\u2019t carry it all at once. Just this one thing for now.';
    }
  }catch(_){}
  if(sub) sub.textContent = subText;
  el.dataset.action = step.action;
  if(step.actionArg != null) el.dataset.actionArg = String(step.actionArg);
  else delete el.dataset.actionArg;
  el.style.opacity = step.done ? '0.75' : '1';
  el.style.display = 'flex';
}
// Count the open daily loops (used only to soften the framing on heavy days — never to nag).
function _countOpenLoops(){
  const today = new Date().toLocaleDateString('en-AU');
  let open = 0;
  try{
    if(!(ls('totry_mornings')||[]).some(m=>m.ts && new Date(m.ts).toLocaleDateString('en-AU')===today)) open++;
    if(!(ls('totry_evenings')||[]).some(e=>e.ts && new Date(e.ts).toLocaleDateString('en-AU')===today)) open++;
    if(typeof loadH==='function'){ loadH(); const ti=(typeof tIdx==='function')?tIdx():0; const undone=(typeof habits!=='undefined'&&Array.isArray(habits))?habits.filter(h=>h.d&&h.d[ti]!==1).length:0; if(undone>0) open++; }
    const trained = (typeof getUnifiedTraining==='function') && getUnifiedTraining().some(t=>t.ts && new Date(t.ts).toLocaleDateString('en-AU')===today);
    if(!trained) open++;
  }catch(_){}
  return open;
}
// The next-step action used to be a STRING OF CODE stored on a DOM dataset attribute and run through
// `new Function(action)()`. Every value was a literal except one, which interpolated the person's own
// vice name — defended by stripping quotes and backslashes. That denylist held, but it is the fragile
// way to secure an eval sink, and the sink itself was reachable from a DOM attribute in an app that has
// already had two XSS fixes. So there is no sink any more: the dataset carries a KEY, the argument
// travels as DATA, and the only things that can run are the seven listed here.
const NEXT_STEP_ACTIONS = {
  morning:  () => go('morning'),
  reflect:  () => go('reflect'),
  soul:     () => go('soul'),
  train:    () => go('train'),
  calendar: () => go('calendar'),
  mobility: () => { go('train'); setTimeout(function(){ try{ setPTTab('mobility'); }catch(_){ } }, 250); },
  breath:   (arg) => { if(typeof _hardHourBreath==='function') _hardHourBreath(arg || undefined); },
};
function doNextStep(){
  const el = document.getElementById('next-step-anchor');
  const key = el?.dataset.action;
  const fn = key && NEXT_STEP_ACTIONS[key];
  if(!fn){ if(key) console.warn('unknown next-step action:', key); return; }
  try{ fn(el.dataset.actionArg || ''); }catch(e){ console.warn('next step action failed', e); }
}
function renderHomeHabits(){
  autoTickHabits();
  loadH();
  const ti = tIdx();
  const list = document.getElementById('home-habit-list');
  if(!list) return;
  list.innerHTML = '';
  
  if(!habits.length){
    // Used to read "Add them in Settings" — there is no habit UI in Settings, so this sent every new
    // user looking for something that does not exist. Now it offers the thing directly.
    list.innerHTML = '<div style="text-align:center;padding:16px 8px 6px">'+
      '<div style="font-size:13px;color:var(--tx3);line-height:1.6;margin-bottom:12px">No habits yet. Pick one small thing you want to be true of you most days.</div>'+
      '<button class="btn primary" style="width:auto;padding:9px 18px;font-size:13px" onclick="openAddHabit()">Add your first habit</button>'+
    '</div>';
    return;
  }
  
  // Build the LAST 7 DAYS rolling history (today inclusive on the right edge).
  // We read habit history if it exists, otherwise fall back to this week's d[] array
  // mapping Monday=0..Sunday=6 onto the last 7 calendar days.
  const today = new Date();
  const dayLabels = [];
  for(let offset = 6; offset >= 0; offset--){
    const d = new Date(today.getTime() - offset * 86400000);
    dayLabels.push({
      letter: ['S','M','T','W','T','F','S'][d.getDay()],
      isToday: offset === 0,
      offset: offset, // 6 = oldest, 0 = today
      date: d
    });
  }
  
  // Helper to read habit completion for a given offset (0=today, 1=yesterday, ...)
  // We use the d[] array indexed by getDay()-style mapping where d[0]=Monday..d[6]=Sunday
  // Today's index in d[] is ti. So offset N back = (ti - N + 7) % 7.
  const cellFor = (habit, offset) => {
    const idx = ((ti - offset) % 7 + 7) % 7;
    return habit.d[idx] === 1;
  };
  
  // Header: past 7 days perfect-day count
  // Only days this week are knowable (the ring holds Monday->Sunday of the current week), so counting
  // six days back claimed knowledge of days whose slots belong to a different week.
  let pastPerfect = 0;
  const knowable = Math.min(6, ti);          // days before today, within this week
  for(let off = 1; off <= knowable; off++){
    if(habits.every(h => cellFor(h, off))) pastPerfect++;
  }
  const todayDone = habits.filter(h => cellFor(h, 0)).length;
  const todayTotal = habits.length;
  
  const summary = document.createElement('div');
  summary.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--bg3);border-radius:10px;margin-bottom:14px';
  summary.innerHTML = 
    '<div>' +
      '<div class="eyebrow">' + (knowable ? 'This week so far' : 'This week') + '</div>' +
      '<div class="stat-num" style="font-size:18px;color:var(--tx)">' +
        (knowable ? (pastPerfect + '/' + knowable + ' perfect') : 'starts today') + '</div>' +
    '</div>' +
    '<div style="text-align:right">' +
      '<div class="eyebrow">Today so far</div>' +
      '<div class="stat-num" style="font-size:18px;color:var(--tx2)">' + todayDone + '/' + todayTotal + '</div>' +
    '</div>';
  list.appendChild(summary);
  
  // Day-letter row across the top
  const headerRow = document.createElement('div');
  // The name column used to be 1 of 8 EQUAL columns, which on a 375px iPhone left it 36px wide — so
  // every habit rendered as "Mor…", "No v…", "Pra…" and the grid became unreadable at a glance. The day
  // cells only ever hold a tick or a dot, so they are clamped small and the name takes what is left.
  headerRow.style.cssText = 'display:grid;grid-template-columns:minmax(84px,1.4fr) repeat(7,minmax(18px,24px));gap:4px;align-items:center;margin-bottom:6px;padding:0 4px;max-width:100%';
  headerRow.innerHTML = '<div></div>' + dayLabels.map(d => 
    '<div style="font-family:DM Mono,monospace;font-size:9px;text-align:center;color:' + (d.isToday ? 'var(--go)' : 'var(--tx3)') + '">' + d.letter + '</div>'
  ).join('');
  list.appendChild(headerRow);
  
  // Each habit as a row: name on left, last 7 day cells on right (oldest left, today right)
  habits.forEach((h, hi) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:minmax(84px,1.4fr) repeat(7,minmax(18px,24px));gap:4px;align-items:center;padding:8px 4px;border-top:1px solid var(--bd);max-width:100%';
    
    // Past 6 days hit count for at-a-glance pattern
    let pastHits = 0;
    for(let off = 1; off <= knowable; off++) if(cellFor(h, off)) pastHits++;
    const pastColor = pastHits >= 5 ? 'var(--gr)' : pastHits >= 3 ? 'var(--go)' : 'var(--tx3)';
    
    const nameCell = document.createElement('div');
    nameCell.style.cssText = 'min-width:0;overflow:hidden';
    const _anc = habitAnchor(h);
    // The name is the door to the anchor. The 7 cells stay read-only exactly as before — this is
    // not ticking, so it doesn't break the "ticking lives in the evening" rule.
    nameCell.style.cursor = 'pointer';
    nameCell.innerHTML =
      '<div style="font-size:13px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px dotted var(--bd);display:inline-block;max-width:100%">' + _escFew(h.n) + '</div>' +
      (_anc
        ? '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">after ' + _escFew(_anc) + '</div>'
        : (!window.__anchorHintShown ? (window.__anchorHintShown = true, '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">\uFF0B anchor it to a cue</div>') : '')) +
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:' + pastColor + ';margin-top:2px">' + (knowable ? (pastHits + '/' + knowable + ' this week') : 'day one') + '</div>';
    nameCell.onclick = function(){ if(typeof openHabitAnchor==='function') openHabitAnchor(hi); };
    row.appendChild(nameCell);
    
    // 7 day cells: index 0 = 6 days ago (leftmost), index 6 = today (rightmost)
    dayLabels.forEach((dl, idx) => {
      const offset = 6 - idx; // 6=oldest, 0=today
      const done = cellFor(h, offset);
      const isToday = dl.isToday;
      // Days before this Monday sit outside what the ring can speak to — its seven slots describe the
      // CURRENT week only. Drawing them as empty circles read as "you missed that day", which is a
      // different lie from the stale ticks that used to appear there. Shown as unknown instead.
      const unknown = offset > ti;
      
      const cell = document.createElement('div');
      let bg, border, color, mark;
      
      if(unknown){
        bg = 'transparent';
        border = '1px dotted var(--bd)';
        color = 'rgba(242,239,232,0.22)';
        mark = '\u2013';                       // en dash: no record, not a miss
      } else if(done){
        bg = isToday ? 'var(--go-bg)' : 'rgba(89,164,103,0.18)';
        border = isToday ? '1.5px solid var(--go)' : '1px solid var(--gr)';
        color = isToday ? 'var(--go)' : 'var(--gr)';
        mark = '✓';
      } else if(isToday){
        bg = 'transparent';
        border = '1.5px dashed var(--go)';
        color = 'var(--tx3)';
        mark = '·';
      } else {
        bg = 'transparent';
        border = '1px solid var(--bd)';
        color = 'var(--tx3)';
        mark = '·';
      }
      
      cell.style.cssText = 
        'width:100%;max-width:32px;aspect-ratio:1/1;min-height:24px;margin:0 auto;border-radius:6px;display:flex;align-items:center;justify-content:center;' +
        'font-family:DM Mono,monospace;font-size:12px;font-weight:600;box-sizing:border-box;' +
        'background:' + bg + ';border:' + border + ';color:' + color + ';user-select:none' +
        '';   // no cursor:pointer — this grid is deliberately read-only (see below), so it must not
              // advertise a tap it will not honour.

      cell.textContent = mark;
      // Home grid is READ-ONLY — an at-a-glance view of the last 7 days. Habits auto-tick from
      // logged activity; manual ticking lives in the evening reflection, not here.
      row.appendChild(cell);
    });
    
    list.appendChild(row);
  });
  
  const footer = document.createElement('div');
  footer.style.cssText = 'margin-top:14px;padding-top:10px;border-top:1px solid var(--bd);font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-align:center;letter-spacing:0.05em;line-height:1.5';
footer.innerHTML = 'Tap a habit\'s name to anchor it to something you already do \u00b7 past 6 days on the left';
  list.appendChild(footer);
}


// One-tap vice win straight from home — logs a win for a specific vice without
// needing to navigate to Fight, select the vice, then tap. The most common daily action.
// ── "TODAY, FOR YOU" — the adaptive daily presence ──
// One warm voice that meets the man where he is. Decides what he most needs to see today:
// a relapse is handled by the post-relapse card (we defer), otherwise we give him ONE clear
// thing — and on a low-energy day we strip the ask down to the smallest possible step.
function isLowEnergyToday(){
  const today = new Date().toLocaleDateString('en-AU');
  return ls('totry_low_day') === today;
}
function toggleLowEnergyDay(){
  const today = new Date().toLocaleDateString('en-AU');
  if(ls('totry_low_day') === today){ ls('totry_low_day', ''); }
  else { ls('totry_low_day', today); haptic('tap'); }
  renderTodayForYou();
}
// ── MONDAY CHECK-IN ── the week starts with a 20-second honest look, MacroFactor-style.
function _isoWeekKey(){
  const d = new Date(); const t = new Date(d.getFullYear(),0,1);
  return d.getFullYear() + '-' + Math.ceil((((d - t) / 86400000) + t.getDay() + 1) / 7);
}
function renderWeeklyCheckin(){
  const box = document.getElementById('weekly-checkin'); if(!box) return;
  const wk = _isoWeekKey();
  const dow = new Date().getDay(); // 1 = Monday
  if(ls('totry_weekcheck') === wk || (dow !== 1 && dow !== 2)){ box.style.display = 'none'; return; }
  const now = Date.now(), week = 7 * 86400000;
  const trained = (typeof getUnifiedTraining==='function' ? getUnifiedTraining() : (ls('totry_workouts')||[])).filter(t => t.ts && (now - new Date(t.ts).getTime()) < week).length;
  const log = ls('totry_nutlog')||{}; const goals = ls('totry_nut_goals')||defaultNutGoals();
  let proSum = 0, proDays = 0;
  for(let i = 1; i <= 7; i++){
    const d = new Date(); d.setDate(d.getDate() - i);
    const es = log[d.toLocaleDateString('en-AU')]||[];
    if(es.length){ proDays++; proSum += es.reduce((a,e) => a + (parseFloat(e.pro)||0), 0); }
  }
  const proAvg = proDays ? Math.round(proSum / proDays) : 0;
  const body = (ls('totry_body')||[]).filter(b => b.ts && b.weight);
  const avg = arr => arr.length ? arr.reduce((a,b) => a + parseFloat(b.weight), 0) / arr.length : null;
  const w1 = avg(body.filter(b => (now - new Date(b.ts).getTime()) < week));
  const w2 = avg(body.filter(b => { const a = now - new Date(b.ts).getTime(); return a >= week && a < 2*week; }));
  const wDelta = (w1 != null && w2 != null) ? (w1 - w2) : null;
  let focus;
  if(trained < 3) focus = 'Training was the gap \u2014 ' + trained + ' session' + (trained===1?'':'s') + ' last week. Book the first one today.';
  else if(proDays >= 3 && proAvg < goals.pro * 0.85) focus = 'Protein ran ' + (goals.pro - proAvg) + 'g/day under target. One extra serve at lunch closes it.';
  else if(wDelta != null && Math.abs(wDelta) > 1.2) focus = 'Weight moved ' + (wDelta>0?'+':'') + wDelta.toFixed(1) + 'kg in a week \u2014 faster than intended. Worth a look.';
  else focus = 'No weak link stands out. Hold the line and let the weeks stack.';
  box.innerHTML = '<div style="background:var(--bg2);border:1px solid var(--go-bd);border-radius:var(--r);padding:16px;position:relative">'+
    '<button onclick="ls(\'totry_weekcheck\',\''+wk+'\');renderWeeklyCheckin()" aria-label="Dismiss this weekly check-in" style="position:absolute;top:2px;right:4px;background:none;border:none;color:var(--tx3);font-size:16px;padding:10px 12px;line-height:1;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center">\u00d7</button>'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">Weekly check-in</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:6px">Trained <b style="color:var(--tx)">'+trained+'\u00d7</b>'+(proDays?' \u00b7 protein <b style="color:var(--tx)">'+proAvg+'g/day</b>':'')+(wDelta!=null?' \u00b7 weight <b style="color:var(--tx)">'+(wDelta>0?'+':'')+wDelta.toFixed(1)+'kg</b>':'')+'</div>'+
    '<div style="font-size:13px;color:var(--tx);line-height:1.6;margin-bottom:12px">'+focus+'</div>'+
    '<button class="btn primary" onclick="ls(\'totry_weekcheck\',\''+wk+'\');go(\'grow\')" style="font-size:13px;padding:10px">Read the full week \u2192</button></div>';
  box.style.display = 'block';
}

// ── WHAT I'M NOTICING ── honest, observed patterns from the user's own data. These are
// OBSERVATIONS ("on days you trained, your evenings rated higher"), never predictions or
// promises. Needs enough data to be real; stays silent otherwise. Refreshes as data grows.
// ── PROACTIVE NUDGE ENGINE ────────────────────────────────────────────────────
// What a coach does that an app doesn't: reach out BETWEEN sessions, before you ask.
// Each rule detects a pattern in the data and returns a short, human nudge with a tone.
// Priority order matters — care (depletion, going quiet) outranks celebration.
// Nudges are dismissible per-day so they never nag.
function computeProactiveNudge(){
  const now = Date.now();
  const dayKey = ts => new Date(ts).toLocaleDateString('en-AU');
  const since = d => now - d*86400000;
  // Read the shared nervous system so the nudge speaks from the SAME truth as the coach and the
  // weekly synthesis — no contradicting numbers across the app. Rule-specific windows (e.g. the
  // 6-day overtraining check) still use raw streams below where finer granularity is needed.
  const life = (typeof getLifeState==='function') ? getLifeState() : null;
  const workouts = (ls('totry_workouts')||[]).filter(w => (w.ts||w.date));
  const evenings = ls('totry_evenings')||[];
  const journal = ls('totry_journal')||[];
  const checkins = ls('totry_checkins')||[];
  const fightLog = ls('totry_fight_log')||[];
  const name = (ls('totry_name')||'').trim().split(' ')[0];
  // Every nudge's .text is rendered via innerHTML, so the person's OWN name must be escaped too —
  // a name containing < or & would otherwise break (or inject into) every nudge on the home screen.
  const hi = name ? ((typeof _escFew==='function' ? _escFew(name) : name) + ', ') : '';

  // Helper: most recent timestamp across a set of streams
  const lastTs = arr => arr.reduce((m,x)=>{ const t=new Date(x.ts||x.date||x.createdAt||0).getTime(); return t>m?t:m; }, 0);

  // RULE 0 — SHORT NIGHT. Sleep is the soil under every other pillar, so this speaks FIRST: a short
  // night weakens impulse control, spikes hunger, runs emotions hot and pushes choices toward risk.
  // The whole point is forewarning WITH grace — "it's not you, it's the short night" — so a hard day
  // gets read as physiology instead of character. Once per day, dismissible.
  try{
    const _sl = (typeof getLifeState==='function') ? (getLifeState().sleep||null) : null;
    // Fires on a short night OR a rough one. Before v441 a quality tap was written into the hours
    // field, so "Rough" produced lastNight:3 and tripped this by accident. Now that hours and
    // quality are separate, someone who only taps Rough still deserves the same grace-framing —
    // it just no longer pretends to know how long they slept.
    if(_sl && ((_sl.short && _sl.lastNight != null) || (_sl.quality != null && _sl.quality <= 3))){
      const _sid = 'shortsleep'+dayKey(now);
      return { id:_sid, tone:'care',
        eyebrow:'Before today gets going',
        // In the morning there is still something to DO about it — ten minutes of outdoor light is
        // worth more for tonight's sleep than anything you can take, and more for the clock than
        // avoiding screens later. Later in the day that advice is useless, so it isn't offered.
        text: hi + (_sl.lastNight != null ? ('you got about ' + _sl.lastNight + 'h') : ('you said last night was ' + (_sl.qualityWord || 'rough'))) + '. Go gentle today — on a short night the cravings get louder, hunger runs high and everything lands harder. That’s your body running low, not you getting weaker. Lower the bar, eat properly, and don’t trust the 9pm urge.'
              + ((new Date().getHours()>=5 && new Date().getHours()<=10) ? ' One thing that genuinely helps: get outside for ten minutes in the next hour, no sunglasses. It resets tonight before today has even started.' : ''),
        actions: [{label:'Noted', ghost:true, onclick:'dismissNudge(\''+_sid+'\')'}] };
    }
  }catch(_){}

  // RULE 0.5 — A HELD PURCHASE IS DUE. The hold only means something if someone actually comes back
  // and asks. No pressure either way — the point is that the decision gets made awake.
  try{
    const _h = (typeof dueImpulseHold==='function') ? dueImpulseHold() : null;
    if(_h){
      const _esc = (typeof _escFew==='function') ? _escFew(_h.what) : _h.what;
      return { id:'hold'+_h.ts, tone:'nudge',
        eyebrow:'You slept on it',
        text: hi + 'yesterday you held off on <b>'+_esc+'</b>'+(_h.amt?(' (about '+curSym()+Math.round(_h.amt).toLocaleString()+')'):'')+'. Still want it? Either answer is fine — the point was deciding it awake instead of in the moment.',
        actions: [{label:'Still want it', onclick:'_resolveHold('+_h.ts+',true)'},
                  {label:'Nah, it passed', ghost:true, onclick:'_resolveHold('+_h.ts+',false)'}] };
    }
  }catch(_){}

  // RULE 1 — OVERTRAINED, NO REST. 5+ workouts in last 6 days with no rest day → urge a rest.
  const last6Workouts = workouts.filter(w => new Date(w.ts||w.date).getTime() >= since(6));
  const trainedDays = new Set(last6Workouts.map(w => dayKey(w.ts||w.date)));
  if(trainedDays.size >= 5){
    const trainedToday = trainedDays.has(dayKey(now));
    return { id:'overtrained', tone:'care',
      eyebrow:'A word before you train',
      text: hi + 'you\u2019ve trained ' + trainedDays.size + ' of the last 6 days without a real rest. Strength is built in recovery, not just effort. ' + (trainedToday ? 'You\u2019ve already moved today \u2014 maybe let that be enough.' : 'Today might be the day your body grows by resting.'),
      actions: [{label:'Take a rest day', onclick:'ls(\'totry_low_day\', new Date().toLocaleDateString(\'en-AU\'));if(typeof renderTodayForYou===\'function\')renderTodayForYou();dismissNudge(\'overtrained\')'},
                {label:'I\u2019m good', ghost:true, onclick:'dismissNudge(\'overtrained\')'}] };
  }

  // RULE 1.5 — PRE-WORKOUT FUEL (the integration moat: schedule + nutrition, in the moment). On a
  // training day, before the session, surface exactly when to eat the pre-gym meal so there's fuel in
  // the tank. Placed after the rest-day rule so we don't push training-fuel when we're urging rest.
  try{
    const lead = (typeof getPreworkoutLead==='function') ? getPreworkoutLead() : 75;
    const appDay = (new Date().getDay()+6)%7; // Mon=0..Sun=6
    const gymToday = (ls('totry_cal_events')||[]).filter(function(e){ return e && e.type==='gym' && e.day===appDay && e.start; });
    const nowMin = new Date().getHours()*60 + new Date().getMinutes();
    const fmt = function(mins){ const t=((mins%1440)+1440)%1440; let hh=Math.floor(t/60), mm=t%60; const ap=hh<12?'am':'pm'; let h12=hh%12; if(h12===0)h12=12; return h12+(mm?(':'+String(mm).padStart(2,'0')):'')+ap; };
    let best=null;
    gymToday.forEach(function(e){ const parts=(e.start||'').split(':'); let sh=parseInt(parts[0],10); if(isNaN(sh)) sh=18; let sm=parseInt(parts[1],10); if(isNaN(sm)) sm=0; const sMin=sh*60+sm; if(nowMin < sMin && (sMin - nowMin) <= 240){ if(!best || sMin < best.sMin) best={ sMin:sMin, eatBy:sMin-lead }; } });
    if(best){
      return { id:'preworkout'+dayKey(now)+best.sMin, tone:'nudge',
        eyebrow:'Fuel for training',
        text: hi + 'your session’s at ' + fmt(best.sMin) + '. Have your pre-gym meal by ' + fmt(best.eatBy) + ' so you’ve got fuel in the tank — some fast carbs and protein beats training on empty.',
        actions: [{label:'Open my fuel plan', onclick:'go(\'nourish\');setTimeout(function(){if(typeof _fuelViewPlan===\'function\')_fuelViewPlan();},350);dismissNudge(\'preworkout'+dayKey(now)+best.sMin+'\')'},
                  {label:'Got it', ghost:true, onclick:'dismissNudge(\'preworkout'+dayKey(now)+best.sMin+'\')'}] };
    }
  }catch(_){}

  // RULE 2 — GONE QUIET. No reflection/check-in/workout logged in 3+ days, but was active before.
  const lastActivity = Math.max(lastTs(evenings), lastTs(journal), lastTs(checkins), lastTs(workouts));
  if(lastActivity > 0){
    const daysQuiet = Math.floor((now - lastActivity)/86400000);
    const wasActive = (evenings.length + journal.length + workouts.length) >= 5;
    if(daysQuiet >= 3 && wasActive){
      return { id:'quiet'+dayKey(now), tone:'care',
        eyebrow:'Checking in',
        text: hi + 'it\u2019s been ' + daysQuiet + ' days since you logged anything. No guilt \u2014 life happens. I\u2019m just here, and a single small step today is a fine way back in.',
        actions: [{label:'Talk to your Coach', onclick:'go(\'coach\')'},
                  {label:'Not now', ghost:true, onclick:'dismissNudge(\'quiet'+dayKey(now)+'\')'}] };
    }
  }

  // RULE 2.5 — REACH OUT (relatedness: a presence that NOTICES the people you love). Fires on real
  // drift from someone in "your few" while you've been heads-down active. Names ONE person + the
  // appreciation-gap reframe (we under-estimate how welcome a lapsed check-in is). Grace, never guilt;
  // throttled to ~once / 3 days via a bucketed id; fully dismissible. Name is escaped (rendered as innerHTML).
  try{
    const _few = (typeof getYourFew==='function') ? getYourFew() : [];
    // Never fire if they've switched the reach-out off in Settings. And never for a muted person
    // (reachOutSuggestion already skips those) — the app must not nudge about someone who is gone.
    if(_few.length && ls('totry_partner')!==false && typeof reachOutSuggestion==='function'){
      const _s = reachOutSuggestion();
      if(_s && _s.person){
        const _gap = _s.days;
        const _activeDays = evenings.length + journal.length + workouts.length + fightLog.length;
        const _drift = (_gap!=null) ? (_gap>=6) : (_activeDays>=5);
        if(_drift){
          const _nm = (typeof _escFew==='function') ? _escFew(_s.person.name) : _s.person.name;
          // Honest wording: the app only knows what you LOGGED here, not whether you actually called.
          const _gtxt = (_gap==null) ? ('it’s been a while since you and ' + _nm + ' caught up') : ('it’s been about ' + _gap + ' day' + (_gap===1?'':'s') + ' since you logged reaching ' + _nm);
          // WEEKLY bucket, not every 3 days — a nudge about someone you love must never become a nag.
          const _rb = 'reachfew' + Math.floor(now/(7*86400000));
          return { id:_rb, tone:'care',
            eyebrow:'The people you love',
            text: hi + _gtxt + '. You’ll probably feel it’s awkward, or that they don’t need to hear from you — they will, more than you expect, and more because it’s been a while. One message is enough.',
            actions: [{label:'I’ll reach out', onclick:'go(\'reflect\');dismissNudge(\''+_rb+'\')'},
                      {label:'Not now', ghost:true, onclick:'dismissNudge(\''+_rb+'\')'}] };
        }
      }
    }
  }catch(_){}

  // RULE 3 — STREAK AT RISK. A meaningful evening-reflection streak that hasn't been logged today, late in day.
  const hr = new Date().getHours();
  if(hr >= 19){
    const doneToday = evenings.some(e => dayKey(e.ts) === dayKey(now));
    if(!doneToday){
      // count consecutive prior days with an evening
      let streak = 0;
      for(let i=1;i<=30;i++){
        const k = new Date(now - i*86400000).toLocaleDateString('en-AU');
        if(evenings.some(e => dayKey(e.ts) === k)) streak++; else break;
      }
      if(streak >= 3){
        return { id:'streak'+dayKey(now), tone:'nudge',
          eyebrow:'Before the day closes',
          text: hi + 'you\u2019ve closed ' + streak + ' evenings in a row with a reflection. That\u2019s a real thread \u2014 worth not dropping tonight. Two lines is enough.',
          actions: [{label:'Close today', onclick:'go(\'reflect\')'},
                    {label:'Skip tonight', ghost:true, onclick:'dismissNudge(\'streak'+dayKey(now)+'\')'}] };
      }
    }
  }

  // RULE 4 — THE TWO FIGHTS ARE ONE. When the body AND the soul both showed up this week —
  // workouts logged AND fights won — name the connection no secular app ever will: that the
  // discipline of the body and the discipline of the spirit are the same battle. This is the
  // moat. The Catholic frame treats the body as a temple stewarded, not a project optimised.
  const wins7 = fightLog.filter(f => f.won && new Date(f.ts).getTime() >= since(7)).length;
  const wo7 = workouts.filter(w => new Date(w.ts||w.date).getTime() >= since(7)).length;
  if(wins7 >= 2 && wo7 >= 2){
    return { id:'twofights'+dayKey(now), tone:'win',
      eyebrow:'What I\u2019m noticing',
      text: hi + 'this week you trained your body ' + wo7 + ' times and won ' + wins7 + ' fights against the urge. These aren\u2019t two separate disciplines \u2014 they\u2019re one person learning to govern themselves. The strength you build under the bar is the same strength that holds in the hard moment. Keep stewarding both.',
      actions: [{label:'Amen', ghost:true, onclick:'dismissNudge(\'twofights'+dayKey(now)+'\')'}] };
  }

  // RULE 5 — MOMENTUM WORTH NAMING. Strong fight-win week → encouragement (celebration, lowest priority).
  if(wins7 >= 3){
    return { id:'momentum'+dayKey(now), tone:'win',
      eyebrow:'Worth saying out loud',
      text: hi + 'you\u2019ve won ' + wins7 + ' fights this week. Each one was a real choice in a hard moment. That\u2019s not nothing \u2014 that\u2019s who you\u2019re becoming.',
      actions: [{label:'Amen', ghost:true, onclick:'dismissNudge(\'momentum'+dayKey(now)+'\')'}] };
  }

  return null;
}
function dismissNudge(id){
  const d = ls('totry_nudge_dismissed') || {};
  d[id] = Date.now();
  ls('totry_nudge_dismissed', d);
  const box = document.getElementById('home-nudge');
  if(box){ box.style.display = 'none'; }
  if(typeof renderHomeInsight === 'function') renderHomeInsight();
}
function renderProactiveNudge(){
  const box = document.getElementById('home-nudge');
  if(!box) return false;
  const n = computeProactiveNudge();
  if(!n){ box.style.display='none'; return false; }
  // Respect a recent dismissal of this exact nudge.
  const dismissed = ls('totry_nudge_dismissed') || {};
  if(dismissed[n.id] && (Date.now() - dismissed[n.id]) < 20*3600000){ box.style.display='none'; return false; }
  const accent = 'var(--go)';
  const bg = n.tone==='care'
    ? 'linear-gradient(135deg,rgba(200,169,110,0.10),rgba(140,107,182,0.04))'
    : 'var(--bg2)';
  const btns = (n.actions||[]).map(a =>
    a.ghost
      ? '<button class="btn" style="flex:1;font-size:13px;background:var(--bg3);border:1px solid var(--bd)" onclick="'+a.onclick+'">'+a.label+'</button>'
      : '<button class="btn primary" style="flex:1;font-size:13px" onclick="'+a.onclick+'">'+a.label+'</button>'
  ).join('');
  box.innerHTML =
    '<div style="background:'+bg+';border:1px solid var(--go-bd);border-radius:var(--r);padding:15px 16px">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:'+accent+';text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">'+n.eyebrow+'</div>'+
      '<div style="font-size:14px;color:var(--tx2);line-height:1.6;margin-bottom:'+(btns?'12px':'0')+'">'+n.text+'</div>'+
      (btns ? '<div style="display:flex;gap:8px">'+btns+'</div>' : '')+
    '</div>';
  box.style.display = 'block';
  return true;
}
function renderHomeInsight(){
  const box = document.getElementById('home-insight');
  if(!box) return;
  // A live nudge owns the moment — don't stack a static insight under it.
  if(typeof renderProactiveNudge === 'function' && renderProactiveNudge()){ box.style.display='none'; return; }
  const now = Date.now();
  const cutoff = now - 28*86400000; // last 4 weeks
  const dayKey = (ts) => new Date(ts).toLocaleDateString('en-AU');

  // Gather per-day signals
  const evenings = (ls('totry_evenings')||[]).filter(e => e.ts && new Date(e.ts).getTime() >= cutoff);
  const workouts = (ls('totry_workouts')||[]).filter(w => (w.ts||w.date) && new Date(w.ts||w.date).getTime() >= cutoff);
  const checkins = (ls('totry_checkins')||[]).filter(c => c.ts && new Date(c.ts).getTime() >= cutoff);
  const fightLog = (ls('totry_fight_log')||[]).filter(f => f.ts && new Date(f.ts).getTime() >= cutoff);

  const insights = [];

  // 1) Training ↔ evening day-rating. Compare avg rating on workout days vs non-workout days.
  if(evenings.length >= 6 && workouts.length >= 3){
    const workoutDays = new Set(workouts.map(w => dayKey(w.ts||w.date)));
    const trained = evenings.filter(e => workoutDays.has(dayKey(e.ts)) && e.rating);
    const rested = evenings.filter(e => !workoutDays.has(dayKey(e.ts)) && e.rating);
    if(trained.length >= 3 && rested.length >= 3){
      const avgT = trained.reduce((a,e)=>a+e.rating,0)/trained.length;
      const avgR = rested.reduce((a,e)=>a+e.rating,0)/rested.length;
      if(avgT - avgR >= 0.6){
        insights.push('On the days you trained this month, you rated your evenings higher than on the days you didn\u2019t \u2014 about ' + avgT.toFixed(1) + ' versus ' + avgR.toFixed(1) + ' out of 5. Your body seems to be part of how the day feels.');
      }
    }
  }

  // 2) Spiritual check-in ↔ fight wins. Higher spiritual days coincide with more urge wins?
  if(checkins.length >= 6 && fightLog.length >= 4){
    const winDays = new Set(fightLog.filter(f=>f.won).map(f=>dayKey(f.ts)));
    const spiritualOnWinDays = checkins.filter(c => winDays.has(dayKey(c.ts))).map(c=>c.spiritual).filter(Boolean);
    const spiritualOther = checkins.filter(c => !winDays.has(dayKey(c.ts))).map(c=>c.spiritual).filter(Boolean);
    if(spiritualOnWinDays.length >= 3 && spiritualOther.length >= 3){
      const a = spiritualOnWinDays.reduce((x,y)=>x+y,0)/spiritualOnWinDays.length;
      const b = spiritualOther.reduce((x,y)=>x+y,0)/spiritualOther.length;
      if(a - b >= 1){
        insights.push('On the days you won a fight, your spiritual check-in tended to be higher. Whatever you\u2019re doing on those days \u2014 prayer, scripture, showing up \u2014 it seems to be holding.');
      }
    }
  }

  // 3) A simple, encouraging consistency observation if not enough for correlations.
  if(!insights.length){
    const last7Evenings = (ls('totry_evenings')||[]).filter(e => e.ts && new Date(e.ts).getTime() >= now-7*86400000);
    const last7Workouts = (ls('totry_workouts')||[]).filter(w => (w.ts||w.date) && new Date(w.ts||w.date).getTime() >= now-7*86400000);
    if(last7Workouts.length >= 3){
      insights.push('You\u2019ve trained ' + last7Workouts.length + ' times in the last week. That\u2019s a real rhythm \u2014 keep showing up.');
    } else if(last7Evenings.length >= 4){
      insights.push('You\u2019ve closed ' + last7Evenings.length + ' of the last 7 evenings with a reflection. That habit of honesty with yourself is worth more than it looks.');
    }
  }

  if(!insights.length){ box.style.display = 'none'; return; }
  // Rotate which insight shows by day so it doesn't feel static.
  const pick = insights[getDayCount() % insights.length];
  box.innerHTML = '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">What I\u2019m noticing</div>' +
    '<div style="font-size:14px;color:var(--tx2);line-height:1.6">' + pick + '</div>';
  box.style.display = 'block';
}

function renderTodayForYou(){
  const card = document.getElementById('today-for-you');
  if(!card) return;
  if(typeof renderWeeklyCheckin === 'function') renderWeeklyCheckin();
  const name = (ls('totry_name') || '').trim();
  const first = name ? name.split(' ')[0] : '';

  // If the post-relapse card is showing, it owns this moment — don't compete.
  const relapseCard = document.getElementById('postrelapse-card');
  if(relapseCard && relapseCard.style.display !== 'none'){ card.style.display = 'none'; return; }
  // During first-run, the welcome card leads.
  const firstRun = document.getElementById('firstrun-card');
  if(firstRun && firstRun.style.display !== 'none'){ card.style.display = 'none'; return; }

  card.style.display = 'block';
  const msgEl = card.querySelector('#tfy-message');
  const actEl = card.querySelector('#tfy-action');
  const eyebrowEl = card.querySelector('#tfy-eyebrow');
  const lowToggle = card.querySelector('#tfy-low-toggle');
  const low = isLowEnergyToday();
  if(lowToggle){
    lowToggle.style.color = low ? 'var(--go)' : 'var(--tx3)';
    lowToggle.style.borderColor = low ? 'var(--go-bd)' : 'var(--bd)';
    lowToggle.textContent = low ? '✓ Taking it easy' : 'Low day?';
  }

  // ── LOW-ENERGY DAY: strip everything back to one gentle, tiny step ──
  if(low){
    if(eyebrowEl) eyebrowEl.textContent = 'Today · gently';
    const lines = [
      'Some days, showing up is the whole victory.',
      'You opened the app. On a hard day, that counts.',
      'No pressure today. Just one small thing, if you can.',
      'Rest is not failure. Be kind to yourself today.'
    ];
    if(msgEl) msgEl.textContent = first ? first + ', ' + lines[getDayCount() % lines.length].charAt(0).toLowerCase() + lines[getDayCount() % lines.length].slice(1) : lines[getDayCount() % lines.length];
    if(actEl){
      actEl.innerHTML =
        '<button class="btn primary" onclick="go(&apos;coach&apos;)" style="margin-bottom:8px">Just talk to your Coach</button>' +
        '<button class="btn" onclick="go(&apos;bible&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Read one verse</button>';
    }
    return;
  }

  // ── RETURNING AFTER A GAP: adaptive re-plan ──────────────────────────────────
  // A coach doesn't open with "you missed 5 days." When a man comes back after a
  // break, the plan bends to meet him: one small, frictionless re-entry step — never
  // the full stack of everything he didn't do. This is what kills the streak-guilt
  // that makes people quit apps for good.
  (function(){
    const lastBack = ls('totry_last_return_ease');
    const tkNow = new Date().toLocaleDateString('en-AU');
    if(lastBack === tkNow) return; // only ease once per day
    const lastActivity = [ls('totry_evenings'),ls('totry_journal'),ls('totry_workouts'),ls('totry_checkins')]
      .flatMap(a => Array.isArray(a)?a:[])
      .reduce((m,x)=>{ const t=new Date(x.ts||x.date||x.createdAt||0).getTime(); return t>m?t:m; }, 0);
    if(!lastActivity) return;
    const daysAway = Math.floor((Date.now()-lastActivity)/86400000);
    const everActive = ((ls('totry_evenings')||[]).length + (ls('totry_workouts')||[]).length) >= 5;
    if(daysAway >= 3 && everActive){
      ls('totry_last_return_ease', tkNow);
      if(eyebrowEl) eyebrowEl.textContent = 'Welcome back';
      if(msgEl) msgEl.textContent = (first ? first + ', it' : 'It') + '\u2019s good to see you. ' + daysAway + ' days away is nothing \u2014 we don\u2019t pick up the whole plan today, just one honest step. The rest follows on its own.';
      if(actEl){
        actEl.innerHTML =
          '<button class="btn primary" onclick="go(&apos;coach&apos;)" style="margin-bottom:8px">Pick up where we left off</button>' +
          '<button class="btn" onclick="go(&apos;reflect&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Just close today</button>';
      }
      card.__easedReturn = true;
    }
  })();
  if(card.__easedReturn){ card.__easedReturn = false; return; }

  // ── NORMAL DAY: give him ONE clear focus ──
  loadV(); loadH();
  if(eyebrowEl) eyebrowEl.textContent = 'Today';

  // Priority 0 — THE DAY'S RHYTHM. The app should know what time it is: before noon, the
  // morning ritual leads from Home (no hunting through Soul); evening leads to Reflect.
  const _doneToday = (key) => {
    const v = ls(key); if(!v) return false;
    const tk = new Date().toLocaleDateString('en-AU');
    if(Array.isArray(v)) return v.some(e => e && (e.date === tk || (typeof getDayCount==='function' && e.day === getDayCount()) || (e.ts && new Date(e.ts).toLocaleDateString('en-AU') === tk)));
    if(typeof v === 'object') return !!v[tk];
    return false;
  };
  const hr = new Date().getHours();
  if(hr < 12 && !_doneToday('totry_mornings')){
    if(eyebrowEl) eyebrowEl.textContent = 'This morning';
    if(msgEl) msgEl.textContent = (first ? first + ', begin' : 'Begin') + ' the day before the day begins you — a word, your gratitude, your intention, a prayer. A few quiet minutes.';
    if(actEl){
      actEl.innerHTML =
        '<button class="btn primary" onclick="go(&apos;morning&apos;)" style="margin-bottom:8px">Begin your morning →</button>' +
        '<button class="btn" onclick="go(&apos;grow&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Skip to the day</button>';
    }
    return;
  }
  if(hr >= 12 && hr < 17 && !_doneToday('totry_mornings')){
    if(eyebrowEl) eyebrowEl.textContent = 'A gentle check';
    if(msgEl) msgEl.textContent = (first ? first + ', the' : 'The') + ' morning got away from you — that\u2019s alright. It\u2019s not too late to set an intention for what\u2019s left of today.';
    if(actEl){
      actEl.innerHTML =
        '<button class="btn primary" onclick="go(&apos;morning&apos;)" style="margin-bottom:8px">Set my intention →</button>' +
        '<button class="btn" onclick="go(&apos;grow&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Just carry on</button>';
    }
    return;
  }
  if(hr >= 17 && !_doneToday('totry_evenings')){
    if(eyebrowEl) eyebrowEl.textContent = 'This evening';
    if(msgEl) msgEl.textContent = (first ? first + ', close' : 'Close') + ' the day honestly — how it went, one win, one thing to release. Then rest.';
    if(actEl){
      actEl.innerHTML =
        '<button class="btn primary" onclick="go(&apos;reflect&apos;)" style="margin-bottom:8px">Reflect on today →</button>' +
        '<button class="btn" onclick="go(&apos;coach&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Talk it out with Coach</button>';
    }
    return;
  }

  // Priority 1: a vice with a strong streak worth protecting (his core fight)
  let focusVice = null, bestStreak = -1;
  (vices||[]).forEach(v => {
    if(v.mode === 'moderate') return; // moderation vices have no abstinence streak to protect
    // Nor does a grief. A letting-go struggle (a breakup, a loss, an attachment being released) is
    // not something a person is abstaining FROM, and Home was rendering it as one: "day 6 free of
    // Letting go of her". That is the app misreading someone's mourning as a vice they are resisting,
    // on the first screen they see. Every other surface already excludes kind:'letgo' from streaks.
    if(v.kind === 'letgo') return;
    const s = (typeof viceCleanDays === 'function') ? viceCleanDays(v) : 0;
    if(s > bestStreak){ bestStreak = s; focusVice = v; }
  });

  // Priority 2: unticked habits today
  loadH();
  const ti = (new Date().getDay() + 6) % 7;
  const untickedHabits = (habits||[]).filter(h => !(h.d && h.d[ti] === 1));

  if(focusVice && bestStreak >= 1){
    if(msgEl) msgEl.textContent = (first ? first + ', day ' : 'Day ') + bestStreak + ' free of ' + focusVice.n + '. Protect it today.';
    if(actEl){
      // No "Stay in the fight" button here — the "Fighting an urge right now?" section below
      // already gives a direct, in-place way to go through an urge. This just nudges habits.
      actEl.innerHTML =
        (untickedHabits.length ? '<div style="font-size:11px;color:var(--tx3);text-align:center;font-family:DM Mono,monospace">' + untickedHabits.length + ' habit' + (untickedHabits.length>1?'s':'') + ' still to tick below</div>' : '<div style="font-size:11px;color:var(--tx3);text-align:center;font-family:DM Mono,monospace">If an urge hits, the section below is right there.</div>');
    }
    return;
  }

  if(untickedHabits.length){
    const h = untickedHabits[0];
    if(msgEl) msgEl.textContent = (first ? first + ', one' : 'One') + ' thing today: ' + h.n + '.';
    if(actEl){
      actEl.innerHTML = '<div style="font-size:12px;color:var(--tx3);line-height:1.5">Tap its circle in <span style="color:var(--go)">Today\'s habits</span> below when it\'s done. Small steps, every day.</div>';
    }
    return;
  }

  // Everything done / nothing set up yet — affirm and point forward
  if((vices||[]).length === 0 && (habits||[]).length === 0){
    if(msgEl) msgEl.textContent = (first ? first + ', let\'s' : 'Let\'s') + ' set the first stone. What are you fighting to become?';
    if(actEl) actEl.innerHTML = '<button class="btn primary" onclick="go(&apos;fight&apos;)">Name what you\'re fighting</button>';
    return;
  }
  if(eyebrowEl) eyebrowEl.textContent = 'Today · well done';
  if(msgEl) msgEl.textContent = (first ? first + ', you\'ve' : 'You\'ve') + ' done today\'s work. This is who you\'re becoming.';
  if(actEl) actEl.innerHTML = '<button class="btn" onclick="go(&apos;reflect&apos;)" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Reflect on today</button>';
}

function renderHomeQuickWins(){
  const wrap = document.getElementById('home-quickwin-wrap');
  const list = document.getElementById('home-quickwin-list');
  if(!wrap || !list) return;
  loadV();
  if(!vices || !vices.length){ wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  list.innerHTML = vices.map((v, i) => {
    if(v.kind === 'letgo'){
      // A letting-go struggle: healing stat + the grief door, never "clean days" / the substance flow.
      const lgDays = v.startDate ? Math.floor((Date.now()-new Date(v.startDate).getTime())/86400000) : 0;
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0' + (i>0?';border-top:1px solid var(--bd)':'') + '">' +
        '<div style="min-width:0;flex:1"><div style="font-size:14px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + v.n.replace(/</g,'&lt;') + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">day ' + lgDays + ' of letting go</div></div>' +
        '<button class="btn" onclick="openLettingGo()" style="width:auto;padding:8px 14px;font-size:12px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);flex-shrink:0">Feeling the pull?</button>' +
      '</div>';
    }
    const moderate = v.mode === 'moderate';
    // Honest stat: clean-day streak since last slip + lifetime wins + slips. Updates whether you
    // log a win OR a loss, for every vice. (Moderation-mode vices show their within-limit count.)
    let stat;
    if(moderate){
      stat = (v.modWithin||0) + ' times within limit';
    } else {
      const start = v.startDate ? new Date(v.startDate) : null;
      const cleanDays = start ? Math.floor((Date.now() - start.getTime())/86400000) : 0;
      const wins = v.w||0;
      const slips = v.relapseCount||0;
      const bits = [cleanDays + 'd clean'];
      if(wins) bits.push(wins + (wins===1?' win':' wins'));
      if(slips) bits.push(slips + (slips===1?' slip':' slips'));
      stat = bits.join(' · ');
    }
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0' + (i>0?';border-top:1px solid var(--bd)':'') + '">' +
      '<div style="min-width:0;flex:1"><div style="font-size:14px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + v.n.replace(/</g,'&lt;') + '</div>' +
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">' + stat + '</div></div>' +
      // Primary: open the real urge-support flow (the whole point — you're going THROUGH it now)
      '<button class="btn" onclick="fightVice(' + i + ')" style="width:auto;padding:8px 14px;font-size:12px;background:var(--re-bg);border:1px solid var(--re-bd);color:var(--re);flex-shrink:0">I\'m feeling it</button>' +
    '</div>';
  }).join('');
}

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
    list.innerHTML = '<p style="font-size:12px;color:var(--tx3);text-align:center;padding:14px;font-style:italic">No apps linked yet.</p>';
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
      '<button class="btn sr-action" style="width:auto;padding:6px 8px;font-size:11px;background:var(--re-bg);color:var(--re);border-color:var(--re-bd)" onclick="removeLinkedApp(&apos;'+appId+'&apos;)" aria-label="Close">&#215;</button>';
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
// ── STRAVA TESTER ALLOWLIST ──────────────────────────────────────────
// Strava's developer tier caps connections at a limited number of athletes (~10).
// Add a tester's email here (lowercase) to let them connect Strava. Keep it under 10.
// To add: put their email in quotes on its own line, with a comma. Example:
//   'alfredjohn200101@gmail.com',
//   'tester1@gmail.com',
//   'tester2@icloud.com',
const STRAVA_APPROVED_EMAILS = [
  'alfredjohn200101@gmail.com',
  'alfredjohn200101@yahoo.com',
  // ↓ add tester emails below this line (lowercase, comma after each)
  'amalgeot@outlook.com',
  'brooklynl2001@hotmail.com',
  'adampj09@gmail.com',
  'glensaju@gmail.com',
];
const STRAVA_MAX_ATHLETES = 10;

function isStravaApproved(){
  const email = (currentUser?.email || '').toLowerCase().trim();
  if(!email) return false; // not logged in
  // Guard the cap: even if more than 10 emails get added by mistake, only honour the first 10
  return STRAVA_APPROVED_EMAILS.slice(0, STRAVA_MAX_ATHLETES).includes(email);
}

// Wait for currentUser to be loaded before checking — handles race condition on first tap
async function ensureUserLoaded(){
  if(currentUser?.email) return true;
  if(!sb) return false;
  try{
    const {data:{user}} = await sb.auth.getUser();
    if(user){ currentUser = user; return true; }
  }catch(e){}
  return false;
}

function offerStravaConnect(){
  // Defensive: refresh currentUser if not loaded
  ensureUserLoaded().then(() => {
    _showStravaModal();
  });
}

function _showStravaModal(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  
  // If user is not on the approved list, show "coming soon" instead of a broken button
  if(!isStravaApproved()){
    m.innerHTML = '<div class="modal">' +
      '<div class="modal-handle"></div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
        '<div style="width:40px;height:40px;border-radius:8px;background:#FC4C02;display:flex;align-items:center;justify-content:center;font-size:18px">\u{1F6B4}</div>' +
        '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Strava — limited access</div><div style="font-size:11px;color:var(--tx3)">Currently invite-only</div></div>' +
      '</div>' +
      '<p style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:14px">Strava integration is live but limited to a small number of connected athletes right now. As the app grows and broader API access is approved, this opens up to everyone.</p>' +
      '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px;line-height:1.6;font-style:italic">In the meantime, you can manually log cardio in the Train tab \u2014 same outcome, just one extra tap.</p>' +
      '<button class="btn" onclick="closeModal(this)">Got it</button>' +
    '</div>';
    document.body.appendChild(m);
    try{ const st = ls('totry_strava_last'); if(st){ const f = document.createElement('div'); f.style.cssText='font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-align:center;margin-top:10px'; f.textContent='Last sync: ' + new Date(st.ts).toLocaleString('en-AU',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}) + ' \u00b7 ' + st.count + ' pulled \u00b7 one-way (Strava \u2192 To Try)'; const mm = m.querySelector('.modal'); if(mm) mm.appendChild(f); } }catch(_){}
    return;
  }
  
  // NATIVE: the OAuth round trip cannot complete inside the app shell. The WebView's origin is
  // capacitor://localhost, so STRAVA_REDIRECT_URI becomes capacitor://localhost/ -- Strava validates
  // redirect_uri against the app's registered Authorization Callback DOMAIN and rejects it outright,
  // and Capacitor hands strava.com to Safari with no CFBundleURLTypes scheme and no appUrlOpen
  // listener to route back. Tapping Connect was a one-way trip to an error page.
  // The honest path works and is permanent: totry_strava_token is in SYNC_KEYS, and getStravaToken()
  // refreshes through the edge function with no redirect_uri -- so connecting once in the browser on
  // this same account lands the token on this phone at the next foreground pull, forever after.
  if(typeof isNativeApp==='function' && isNativeApp()){
    m.innerHTML = '<div class="modal">' +
      '<div class="modal-handle"></div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
        '<div style="width:40px;height:40px;border-radius:8px;background:#FC4C02;display:flex;align-items:center;justify-content:center;font-size:18px">\u{1F6B4}</div>' +
        '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Connect Strava on the web</div><div style="font-size:11px;color:var(--tx3)">Once — then it syncs here on its own</div></div>' +
      '</div>' +
      '<p style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:12px">Strava’s sign-in can’t hand you back into the app on iOS, so you connect it once in your browser instead.</p>' +
      '<p style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:14px">Open To Try on the web, sign in with <b>this same account</b>, then Settings → Connected apps → Strava. Your runs and rides start syncing into this app by themselves — nothing else to do here.</p>' +
      '<button class="btn primary" onclick="openStravaOnWeb()" style="margin-bottom:8px">Open To Try on the web</button>' +
      '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Later</button>' +
    '</div>';
    document.body.appendChild(m);
    return;
  }

  // Approved path
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
      '<div style="width:40px;height:40px;border-radius:8px;background:#FC4C02;display:flex;align-items:center;justify-content:center;font-size:18px">\u{1F6B4}</div>' +
      '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Connect Strava</div><div style="font-size:11px;color:var(--tx3)">Auto-sync your runs, rides, workouts</div></div>' +
    '</div>' +
    '<p style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:14px">Once connected, your Strava activities sync into ToTry automatically &mdash; counting toward your gym habit and training adherence.</p>' +
    '<button class="btn primary" onclick="startStravaOAuth()" style="margin-bottom:8px">Connect with Strava</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>' +
    '</div>';
  document.body.appendChild(m);
    try{ const st = ls('totry_strava_last'); if(st){ const f = document.createElement('div'); f.style.cssText='font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-align:center;margin-top:10px'; f.textContent='Last sync: ' + new Date(st.ts).toLocaleString('en-AU',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}) + ' \u00b7 ' + st.count + ' pulled \u00b7 one-way (Strava \u2192 To Try)'; const mm = m.querySelector('.modal'); if(mm) mm.appendChild(f); } }catch(_){}
}

// Opens the web build so a native user can complete the Strava OAuth round trip in a real browser.
// window.open is the pattern the rest of this file already uses for external links; the href fallback
// covers a shell where the popup is refused.
function openStravaOnWeb(){
  var u = 'https://alfredjohn200101.github.io/ToTry/';
  var w = null;
  try{ w = window.open(u, '_blank'); }catch(_){ }
  if(!w){ window.location.href = u; }
}

function startStravaOAuth(){
  // Belt and braces. _showStravaModal never offers this natively, but any future entry point that
  // calls it must not bounce the person into Safari and lose them -- see the note in that function.
  if(typeof isNativeApp==='function' && isNativeApp()){ openStravaOnWeb(); return; }
  if(!STRAVA_CLIENT_ID) return;
  const scope = 'read,activity:read_all';
  const state = Math.random().toString(36).slice(2);
  localStorage.setItem('totry_strava_oauth_state', state);
  const url = 'https://www.strava.com/oauth/authorize' +
    '?client_id=' + STRAVA_CLIENT_ID +
    '&response_type=code' +
    '&redirect_uri=' + encodeURIComponent(STRAVA_REDIRECT_URI) +
    '&approval_prompt=auto' +
    '&scope=' + scope +
    '&state=' + state;
  window.location.href = url;
}

async function handleStravaCallback(){
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const scope = params.get('scope');
  const error = params.get('error');
  
  // User denied permission on Strava
  if(error){
    console.warn('[strava] OAuth denied:', error);
    showToast('Strava cancelled', 'You can connect Strava anytime from Settings.');
    window.history.replaceState({}, '', STRAVA_REDIRECT_URI);
    return;
  }
  
  if(!code) return;
  
  // Only handle if this is a Strava callback. Strava sends scope like "read,activity:read_all".
  // Google sends scope like "https://www.googleapis.com/auth/fitness.activity.read ..."
  // Detect Strava by presence of "activity:read" or absence of "googleapis"
  const isStrava = scope && (scope.includes('activity:read') || scope.includes('activity:write')) && !scope.includes('googleapis');
  if(scope && !isStrava) return; // Not for us — let Google handler take it
  
  const expectedState = localStorage.getItem('totry_strava_oauth_state');
  if(state && expectedState && state !== expectedState){
    console.warn('[strava] state mismatch', {got: state, expected: expectedState});
    showToast('Auth error', 'Strava session expired. Please try again.');
    window.history.replaceState({}, '', STRAVA_REDIRECT_URI);
    return;
  }
  
  console.log('[strava] callback received, exchanging code for token...');
  showToast('Connecting Strava', 'Exchanging tokens...');
  
  // Clear URL immediately so reload doesn't re-trigger exchange
  window.history.replaceState({}, '', STRAVA_REDIRECT_URI);
  
  try{
    if(!sb){
      console.error('[strava] Supabase client not ready');
      showToast('Strava failed', 'App not fully loaded. Refresh and try again.');
      return;
    }
    const {data, error: invokeErr} = await sb.functions.invoke('strava-oauth', {
      body: {action: 'exchange', code: code}
    });
    
    console.log('[strava] exchange', invokeErr ? 'failed' : 'ok');
    
    if(invokeErr){
      console.error('[strava] invoke error:', invokeErr);
      showToast('Strava failed', 'Server error. Check console (F12) for details.');
      return;
    }
    if(!data || data.errors || data.message){
      console.error('[strava] exchange returned error:', data);
      const msg = data?.errors?.[0]?.field ? 'Invalid auth code. Please try connecting again.' : 'Strava rejected the request. Check your app settings.';
      showToast('Strava failed', msg);
      return;
    }
    if(!data.access_token){
      console.error('[strava] no access_token in response:', data);
      showToast('Strava failed', 'No token returned. Check the Edge Function logs.');
      return;
    }
    
    // Save tokens
    ls('totry_strava_token', {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      athlete: data.athlete ? {
        id: data.athlete.id,
        name: (data.athlete.firstname || '') + ' ' + (data.athlete.lastname || '')
      } : null
    });
    
    console.log('[strava] tokens saved, athlete:', data.athlete?.firstname);
    showToast('Strava connected ✓', 'Pulling your recent activities...');
    haptic('celebrate');
    setTimeout(() => syncStravaActivities(), 1000);
  }catch(e){
    console.error('[strava] callback exception:', e);
    showToast('Strava failed', 'Connection error: ' + (e?.message || 'unknown'));
  }
}

// Get a valid Strava access token, refreshing if expired
async function getStravaToken(){
  const tok = ls('totry_strava_token');
  if(!tok || !tok.access_token) return null;
  // Check if expired (expires_at is unix seconds)
  if(tok.expires_at && tok.expires_at > (Date.now()/1000 + 60)){
    return tok.access_token; // still valid
  }
  // Refresh
  try{
    const {data, error} = await sb.functions.invoke('strava-oauth', {body:{action:'refresh', refresh_token:tok.refresh_token}});
    if(error || !data || !data.access_token){
      console.error('Strava refresh failed:', error||data);
      return null;
    }
    tok.access_token = data.access_token;
    tok.refresh_token = data.refresh_token || tok.refresh_token;
    tok.expires_at = data.expires_at;
    ls('totry_strava_token', tok);
    return tok.access_token;
  }catch(e){
    console.error('Strava refresh error:', e);
    return null;
  }
}

// Fetch recent Strava activities and import them
// Parse a Hevy workout description (pushed Hevy→Strava) into structured exercises+sets.
// This is the free-tier bypass of the gated Hevy Pro API: Strava carries the full session text,
// e.g.  "Romanian Deadlift (Dumbbell)\nSet 1: 49.89 kg x 12 @ 8.5 rpe\nSet 2: 54.42 kg x 12..."
// We turn that back into the same {name, sets:[{weight,reps}]} shape a Hevy import produces.
function parseHevyDescription(desc){
  if(!desc || typeof desc !== 'string') return null;
  const lines = desc.split(/\r?\n/).map(l => l.trim());
  const exercises = [];
  let cur = null;
  const setRe = /^set\s*\d+\s*:?\s*(.+)$/i;
  for(const line of lines){
    if(!line) continue;
    if(/logged with hevy|hevyapp\.com/i.test(line)) continue;
    const sm = line.match(setRe);
    if(sm){
      // A set line. Extract weight, reps, distance/time where present.
      const body = sm[1];
      let weight='', reps='', dist='';
      const wkg = body.match(/([\d.]+)\s*kg/i);          if(wkg) weight = parseFloat(wkg[1]);
      const wlb = body.match(/([\d.]+)\s*lb/i);          if(!wkg && wlb) weight = Math.round(parseFloat(wlb[1])*0.453592*100)/100;
      const rp  = body.match(/x\s*([\d.]+)(?:\s|$|@)/i) || body.match(/([\d.]+)\s*reps/i); if(rp) reps = parseInt(rp[1]);
      const dm  = body.match(/([\d.]+)\s*m\b/i);          if(dm && !rp) dist = parseFloat(dm[1]);
      if(cur){ cur.sets.push({ weight: weight===''?'':weight, reps: reps===''?'':reps, dist: dist||'', type:'normal', done:true }); }
    } else {
      // An exercise name line (anything that isn't a set). Start a new exercise.
      if(cur && cur.sets.length) exercises.push(cur);
      cur = { name: line.replace(/\s*\(.*?\)\s*$/, m=>m).trim(), bodyPart:'', equipment:'', sets:[] };
    }
  }
  if(cur && cur.sets.length) exercises.push(cur);
  return exercises.length ? exercises : null;
}

async function syncStravaActivities(){
  const token = await getStravaToken();
  if(!token){ if(typeof showToast==='function') showToast('Strava not connected','Connect Strava first in Settings \u2192 Connected apps.'); return; }
  try{
    const {data, error} = await sb.functions.invoke('strava-oauth', {body:{action:'activities', access_token:token, per_page:30}});
    if(error || !Array.isArray(data)){
      console.error('Strava activities error:', error||data);
      if(typeof showToast==='function') showToast('Strava sync failed', (error && error.message) ? error.message : 'Could not reach Strava. Try again in a moment.');
      return;
    }
    // Store imported activities
    const existing = ls('totry_strava_activities') || [];
    const existingIds = new Set(existing.map(a=>a.id));
    let added = 0;
    data.forEach(act=>{
      if(existingIds.has(act.id)) return;
      existing.unshift({
        id: act.id,
        name: act.name,
        type: act.type,
        distance: act.distance,
        moving_time: act.moving_time,
        elapsed_time: act.elapsed_time || null,
        date: act.start_date_local,
        calories: act.calories || act.kilojoules ? (act.calories || Math.round((act.kilojoules||0)*0.239)) : null,
        // The performance layer Strava captures that Hevy doesn't — feeds the coach + readiness.
        avg_hr: act.average_heartrate || null,
        max_hr: act.max_heartrate || null,
        avg_watts: act.average_watts || null,
        suffer_score: act.suffer_score || null,
        elevation: act.total_elevation_gain || null,
        device: act.device_name || null,
        // Description carries Hevy's per-set detail when a Hevy session is pushed Hevy→Strava —
        // the free-tier bypass of the gated Hevy Pro API. Parsed downstream into structured sets.
        description: act.description || null,
        manufacturer: (act.device_name||'').toLowerCase().includes('hevy') || (act.description||'').toLowerCase().includes('hevyapp') ? 'hevy' : null
      });
      added++;
    });
    // BYPASS: any synced Strava activity that's actually a Hevy session (pushed Hevy→Strava) with a
    // parseable description → turn it into a structured strength workout in totry_workouts, so free
    // Hevy users get full set detail WITHOUT the Hevy Pro API. Stable id avoids re-sync duplicates.
    try{
      const wkts = ls('totry_workouts') || [];
      const haveIds = new Set(wkts.map(w => String(w.id)));
      let convertedAny = false;
      existing.forEach(a => {
        if(a.manufacturer !== 'hevy' || !a.description) return;
        const wid = 'stravahevy_' + a.id;
        if(haveIds.has(wid)) return;
        const parsed = parseHevyDescription(a.description);
        if(!parsed) return;
        const totalSets = parsed.reduce((n,ex)=>n+ex.sets.length, 0);
        const volume = parsed.reduce((v,ex)=> v + ex.sets.reduce((s,st)=> s + ((parseFloat(st.weight)||0) * (parseInt(st.reps)||0)), 0), 0);
        wkts.unshift({
          id: wid, source:'hevy', via:'strava',
          splitFocus: a.name || 'Workout', type: a.name || 'Weight Training',
          ts: a.date, exercises: parsed,
          completedSets: totalSets, totalSets, volume: Math.round(volume),
          durationMin: a.moving_time ? Math.round(a.moving_time/60) : (a.elapsed_time?Math.round(a.elapsed_time/60):null),
          calories: a.calories || null, averageHeartRate: a.avg_hr || null
        });
        haveIds.add(wid); convertedAny = true;
      });
      if(convertedAny){ ls('totry_workouts', _capWorkouts(wkts)); }
    }catch(_){ /* best-effort; raw Strava activity still shows regardless */ }
    const saved = existing.slice(0,100);
    ls('totry_strava_activities', saved);
    // Feed the calorie loop: sum each day's Strava calories into the burns ledger that the
    // Nourish net-calorie math reads. Keyed by the app's local date string. Strava-sourced
    // burns are tracked separately so re-syncs replace (not double-count) them.
    try{
      const freshByDay = {};
      saved.forEach(a => {
        if(!a.date) return;
        // A session that came from the lifting app is already counted once via the workout ledger
        // (either its direct import or its converted copy). Counting it here too inflated "Burned"
        // in Nourish for every pushed session — the net-calorie math was wrong all day because of it.
        if(a.manufacturer === 'hevy') return;
        let cals = a.calories;
        // Strava's activity LIST endpoint often omits calories (only the detail endpoint has them).
        // Until the edge function fetches detail, estimate from HR + duration so "Burned" isn't 0.
        // Formula: a reasonable kcal/min from avg HR (falls back to a moderate rate by activity type).
        if(!cals){
          const mins = a.moving_time ? a.moving_time/60 : (a.elapsed_time ? a.elapsed_time/60 : 0);
          if(mins > 0){
            let perMin = 6; // moderate default
            if(a.avg_hr){ perMin = Math.max(4, Math.min(16, (a.avg_hr - 60) / 8)); } // ~HR-scaled
            else { const ty=(a.type||'').toLowerCase(); if(/run/.test(ty)) perMin=11; else if(/ride|cycl/.test(ty)) perMin=8; else if(/walk/.test(ty)) perMin=4; else if(/weight|strength/.test(ty)) perMin=5; }
            cals = Math.round(mins * perMin);
            a._estimatedCal = true; // mark it so the UI can show "~"
          }
        }
        if(!cals) return;
        const dk = new Date(a.date).toLocaleDateString('en-AU');
        freshByDay[dk] = (freshByDay[dk]||0) + Math.round(cals);
      });
      // Write only the Strava sub-ledger; reconcileBurns() folds it into the aggregate (single
      // source of truth), so re-syncs replace rather than double-count.
      ls('totry_strava_burns_byday', freshByDay);
      reconcileBurns();
    }catch(_){ }
    // Auto-tick gym habit if there's an activity today
    if(added > 0){
      const today = new Date().toDateString();
      const hasToday = data.some(a => new Date(a.start_date_local).toDateString() === today);
      if(hasToday){
        loadH();
        const gymHabit = habits.findIndex(h => /gym|train|workout|exercise|move/i.test(h.n));
        if(gymHabit >= 0){
          habits[gymHabit].d[tIdx()] = 1;
          saveH();
        }
      }
      showToast('Strava synced', added + ' new activit'+(added===1?'y':'ies')+' imported.');
      ls('totry_strava_last', {ts: Date.now(), count: added});
    } else {
      const total = saved.length;
      if(typeof showToast==='function') showToast('Strava up to date', total ? 'No new activities since last sync.' : 'Connected, but no activities found on Strava yet. Record one and sync again.');
    }
    if(typeof renderUnifiedTraining==='function') renderUnifiedTraining();
    updateStravaBtn();
  }catch(e){
    console.error('Strava sync error:', e);
  }
}

// ─── GOOGLE HEALTH / FITNESS OAUTH ───────────────────────────
const GOOGLE_CLIENT_ID = '785983553382-97flumrmh3i1mk6cd4avb0n214jt7npu.apps.googleusercontent.com';
const GOOGLE_REDIRECT_URI = window.location.origin + window.location.pathname;
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.location.read';

function offerGoogleHealthConnect(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
      '<div style="width:40px;height:40px;border-radius:8px;background:#34A853;display:flex;align-items:center;justify-content:center;font-size:18px">\u2764\uFE0F</div>' +
      '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Connect Google Health</div><div style="font-size:11px;color:var(--tx3)">Steps, activity & Fitbit data</div></div>' +
    '</div>' +
    '<p style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:14px">Syncs your daily steps and workouts from Google Fit and Fitbit devices. Counts toward your movement habits automatically.</p>' +
    '<button class="btn primary" onclick="startGoogleHealthOAuth()" style="margin-bottom:8px">Connect with Google</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>' +
    '</div>';
  document.body.appendChild(m);
}

function startGoogleHealthOAuth(){
  const state = 'gh_' + Math.random().toString(36).slice(2);
  localStorage.setItem('totry_google_oauth_state', state);
  const url = 'https://accounts.google.com/o/oauth2/v2/auth' +
    '?client_id=' + encodeURIComponent(GOOGLE_CLIENT_ID) +
    '&redirect_uri=' + encodeURIComponent(GOOGLE_REDIRECT_URI) +
    '&response_type=code' +
    '&scope=' + encodeURIComponent(GOOGLE_SCOPES) +
    '&access_type=offline' +
    '&prompt=consent' +
    '&state=' + state;
  window.location.href = url;
}

async function handleGoogleHealthCallback(){
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const scope = params.get('scope');
  if(!code) return;
  // Only handle if this is a Google callback (fitness scope)
  if(!scope || !scope.includes('fitness')) return;
  const expectedState = localStorage.getItem('totry_google_oauth_state');
  if(state && state !== expectedState){
    showToast('Auth error', 'Google connection failed. Try again.');
    return;
  }
  showToast('Connecting Google', 'Exchanging tokens...');
  try{
    const {data, error} = await sb.functions.invoke('google-health-auth', {body:{action:'exchange', code:code, redirect_uri:GOOGLE_REDIRECT_URI}});
    if(error || !data || data.error){
      console.error('Google exchange error:', error||data);
      showToast('Google failed', 'Could not connect. Try again from Settings.');
      window.history.replaceState({}, '', GOOGLE_REDIRECT_URI);
      return;
    }
    ls('totry_google_token', {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in||3600)*1000
    });
    window.history.replaceState({}, '', GOOGLE_REDIRECT_URI);
    showToast('Google connected', 'Pulling your activity data...');
    haptic('celebrate');
    setTimeout(()=>syncGoogleHealth(), 1000);
  }catch(e){
    console.error('Google callback error:', e);
    showToast('Google failed', 'Connection error. Try later.');
    window.history.replaceState({}, '', GOOGLE_REDIRECT_URI);
  }
}

async function getGoogleToken(){
  const tok = ls('totry_google_token');
  if(!tok || !tok.access_token) return null;
  if(tok.expires_at && tok.expires_at > Date.now() + 60000){
    return tok.access_token;
  }
  try{
    const {data, error} = await sb.functions.invoke('google-health-auth', {body:{action:'refresh', refresh_token:tok.refresh_token}});
    if(error || !data || !data.access_token) return null;
    tok.access_token = data.access_token;
    tok.expires_at = Date.now() + (data.expires_in||3600)*1000;
    ls('totry_google_token', tok);
    return tok.access_token;
  }catch(e){ return null; }
}

async function syncGoogleHealth(){
  const token = await getGoogleToken();
  // A Google refresh token stops working for ordinary reasons — the person changed their password,
  // revoked app access, or the grant expired. This returned in silence right after telling them
  // "Refreshing your Google connection", so the connection looked live forever while nothing synced
  // and no step data ever arrived. Tell them, and say what fixes it.
  if(!token){
    if(typeof showToast === 'function') showToast('Google needs reconnecting',
      'Your Google Health connection expired. Settings \u2192 Connected apps \u2192 reconnect.');
    return;
  }
  try{
    const {data, error} = await sb.functions.invoke('google-health-auth', {body:{action:'steps', access_token:token, days:7}});
    if(error || !data || !data.bucket){
      console.error('Google steps error:', error||data);
      // Also silent before. An honest app says when a sync it announced did not happen.
      if(typeof showToast === 'function') showToast('Google sync failed',
        'Could not read your steps just now. Your own logged data is untouched.');
      return;
    }
    // Parse step buckets
    const stepDays = [];
    data.bucket.forEach(b=>{
      let steps = 0;
      if(b.dataset && b.dataset[0] && b.dataset[0].point){
        b.dataset[0].point.forEach(p=>{
          if(p.value && p.value[0]) steps += p.value[0].intVal || 0;
        });
      }
      stepDays.push({date:new Date(parseInt(b.startTimeMillis)).toDateString(), steps});
    });
    ls('totry_google_steps', stepDays);
    // Today's steps
    const today = stepDays.find(d=>d.date===new Date().toDateString());
    if(today && today.steps > 0){
      ls('totry_today_steps', today.steps);
      // Mirror into the daily trackers store the Track tab reads, so synced steps show there too.
      try{ const _tr=ls('totry_trackers')||{}; const _dk=new Date().toLocaleDateString('en-AU'); if(!_tr[_dk])_tr[_dk]={water:0,sleep:0,steps:0}; _tr[_dk].steps=today.steps; ls('totry_trackers',_tr); }catch(_){}
    }
    showToast('Google synced', 'Activity data updated.');
  }catch(e){
    console.error('Google sync error:', e);
  }
}

// HEVY API - Pro tier required
function offerHevyConnect(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
      '<div style="width:40px;height:40px;border-radius:8px;background:#1C1C3A;display:flex;align-items:center;justify-content:center;font-size:18px">\u{1F4AA}</div>' +
      '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Connect Hevy</div><div style="font-size:11px;color:var(--tx3)">Import your workouts automatically</div></div>' +
    '</div>' +
    '<p style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:14px">Hevy API access requires <strong style="color:var(--go)">Hevy Pro</strong>. Get your API key at <span style="color:var(--go)">hevy.com/settings?developer</span> and paste it below.</p>' +
    '<input type="text" id="hevy-key-input" placeholder="Paste your Hevy API key..." style="margin-bottom:10px;font-family:DM Mono,monospace;font-size:16px">' +
    '<button class="btn primary" onclick="saveHevyKey()" style="margin-bottom:8px">Save and connect</button>' +
    '<div style="display:flex;align-items:center;gap:8px;margin:12px 0"><div style="flex:1;height:1px;background:var(--bd)"></div><span style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em">or</span><div style="flex:1;height:1px;background:var(--bd)"></div></div>' +
    '<p style="font-size:12px;color:var(--tx3);line-height:1.55;margin-bottom:8px">No Pro? Import your full history from a Hevy CSV export instead (Hevy app → Settings → Export Data).</p>' +
    '<input type="file" id="hevy-csv-input" accept=".csv,text/csv" style="display:none" onchange="importHevyCSV(event)">' +
    '<button class="btn" onclick="document.getElementById(\'hevy-csv-input\').click()" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">📄 Import Hevy CSV</button>' +
    '<button class="btn" onclick="closeModal(this);openLinkedAppDirect(\'hevy\')" style="margin-bottom:8px">Just open Hevy</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>' +
    '</div>';
  document.body.appendChild(m);
}


function openLinkedAppDirect(appId){
  document.querySelector('.modal-bg.open')?.remove();
  const app = APP_REGISTRY[appId];
  if(!app) return;
  if(app.scheme) window.location.href = app.scheme;
  else if(app.web) window.open(app.web, '_blank');
}

function removeLinkedApp(appId){
  const used = ls('totry_apps_used') || [];
  const filtered = used.filter(a => a !== appId);
  ls('totry_apps_used', filtered);
  renderConnectedApps();if(typeof renderNotifSetting==='function')renderNotifSetting();
  showToast('Removed', APP_REGISTRY[appId]?.name+' unlinked.');
}

function showAddAppPicker(){
  const used = ls('totry_apps_used') || [];
  // Don't offer Strava to anyone who isn't on the approved allowlist — otherwise they'd hit the
  // "invite-only" wall, which reads to an App Store reviewer like a broken/placeholder feature.
  const stravaOk = (typeof isStravaApproved==='function') && isStravaApproved();
  const available = Object.entries(APP_REGISTRY)
    .filter(([id]) => !used.includes(id))
    .filter(([id]) => id !== 'strava' || stravaOk)
    // Google Health cannot work in the iOS shell at all: GOOGLE_REDIRECT_URI becomes
    // capacitor://localhost/, which a Google web client rejects outright (redirect_uri_mismatch), and
    // Capacitor hands accounts.google.com to Safari with no route back into the app. So it was a
    // guaranteed error page sitting next to Apple Health, which already covers iOS — a visibly broken
    // advertised integration (Guideline 2.1). Still offered on the web, where it works.
    .filter(([id]) => id !== 'googlehealth' || !(typeof isNativeApp==='function' && isNativeApp()));
  
  if(available.length === 0){
    showToast('All linked','You\'re using all the apps we support.');
    return;
  }
  
  // Group by category
  const byCategory = {};
  available.forEach(([id, app]) => {
    if(!byCategory[app.category]) byCategory[app.category] = [];
    byCategory[app.category].push([id, app]);
  });
  
  let modalHtml = '<div class="modal-handle"></div>';
  modalHtml += '<div style="font-size:16px;font-weight:500;color:var(--tx);margin-bottom:14px">Add an app to link</div>';
  
  Object.entries(byCategory).forEach(([cat, apps]) => {
    modalHtml += '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;margin-top:10px">'+cat+'</div>';
    apps.forEach(([id, app]) => {
      modalHtml += '<button class="btn" style="text-align:left;margin-bottom:6px;padding:10px 12px;display:flex;align-items:center;gap:10px" onclick="addLinkedApp(\''+id+'\')">'+
        '<div style="width:32px;height:32px;border-radius:8px;background:'+app.color+';display:flex;align-items:center;justify-content:center;font-size:16px">'+app.icon+'</div>'+
        '<div style="font-size:13px">'+app.name+'</div>'+
        '</button>';
    });
  });
  modalHtml += '<button class="btn" onclick="closeModal(this)" style="margin-top:10px">Cancel</button>';
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">'+modalHtml+'</div>';
  document.body.appendChild(m);
}

function addLinkedApp(appId){
  const used = ls('totry_apps_used') || [];
  if(!used.includes(appId)){
    used.push(appId);
    ls('totry_apps_used', used);
  }
  document.querySelector('.modal-bg.open')?.remove();
  renderConnectedApps();
  // For apps that need authentication, launch their connect flow straight away
  // instead of just adding a dead row the user then has to figure out.
  if(appId === 'hevy'){
    if(!ls('totry_hevy_api_key')) { offerHevyConnect(); return; }
    manageHevyConnection(); return;
  }
  if(appId === 'strava'){
    if(!ls('totry_strava_token')) { offerStravaConnect(); return; }
  }
  if(appId === 'googlehealth' || appId === 'googlefit' || appId === 'fitbit'){
    if(!ls('totry_google_token')) { offerGoogleHealthConnect(); return; }
  }
  showToast('Linked', APP_REGISTRY[appId]?.name+' added.');
}

// (Removed showHevyInstructions — a dead, never-called second Hevy modal that duplicated the
//  hevy-key-input field. offerHevyConnect() is the single Hevy connect flow.)

// Management panel for an already-connected Hevy account: sync now, change key, disconnect.
function manageStravaConnection(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
      '<div style="width:40px;height:40px;border-radius:8px;background:#FC4C02;display:flex;align-items:center;justify-content:center;font-size:18px">\u{1F6B4}</div>' +
      '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Strava connected</div><div style="font-size:11px;color:var(--gr)">✓ syncing your activities</div></div>' +
    '</div>' +
    '<button class="btn primary" onclick="document.querySelector(&apos;.modal-bg.open&apos;)?.remove();if(typeof syncStravaActivities===&apos;function&apos;){showToast(&apos;Syncing&apos;,&apos;Pulling recent activities...&apos;);syncStravaActivities();}" style="margin-bottom:8px">↻ Sync now</button>' +
    '<button class="btn" onclick="window.open(&apos;https://www.strava.com&apos;,&apos;_blank&apos;)" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">Open Strava app</button>' +
    '<button class="btn" onclick="disconnectStrava()" style="margin-bottom:8px;background:var(--re-bg);border:1px solid var(--re-bd);color:var(--re)">Disconnect Strava</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}
function disconnectStrava(){
  localStorage.removeItem('totry_strava_token');
  if(typeof syncToCloud === 'function') syncToCloud('totry_strava_token', null);
  document.querySelector('.modal-bg.open')?.remove();
  showToast('Strava disconnected', 'Reconnect anytime from Settings.');
  if(typeof renderConnectedApps === 'function') renderConnectedApps();
}

function manageHevyConnection(){
  const tier = ls('totry_hevy_tier') || 'pro';
  const workouts = (ls('totry_workouts') || []).filter(w => w.source === 'hevy' || w.source === 'hevy-csv');
  const lastSynced = ls('totry_hevy_synced_once');
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
      '<div style="width:40px;height:40px;border-radius:8px;background:#1C1C3A;display:flex;align-items:center;justify-content:center;font-size:18px">\u{1F4AA}</div>' +
      '<div><div style="font-size:16px;font-weight:500;color:var(--tx)">Hevy connected</div><div style="font-size:11px;color:var(--gr)">✓ ' + workouts.length + ' workout' + (workouts.length===1?'':'s') + ' imported</div></div>' +
    '</div>' +
    '<button class="btn primary" onclick="document.querySelector(&apos;.modal-bg.open&apos;)?.remove();showToast(&apos;Syncing&apos;,&apos;Pulling your latest Hevy workouts...&apos;);setTimeout(()=>syncHevyWorkouts(),300)" style="margin-bottom:8px">↻ Sync workouts now</button>' +
    '<button class="btn" onclick="importHevyRoutines()" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">⬇ Import my Hevy routines</button>' +
    '<button class="btn" onclick="document.querySelector(&apos;.modal-bg.open&apos;)?.remove();showToast(&apos;Loading&apos;,&apos;Pulling your Hevy routines...&apos;);setTimeout(()=>fetchHevyRoutines(),300)" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">⬇ Load my Hevy routines</button>' +
    '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd);border-radius:var(--r);cursor:pointer"><input type="checkbox" id="hevy-bw-toggle" ' + (ls('totry_bw_volume')?'checked':'') + ' onchange="ls(&apos;totry_bw_volume&apos;,this.checked); showToast(&apos;Saved&apos;, this.checked?&apos;Bodyweight now counts in volume (matches Hevy).&apos;:&apos;Volume counts external load only.&apos;); if(typeof renderUnifiedTraining===&apos;function&apos;)renderUnifiedTraining();" style="width:18px;height:18px;flex-shrink:0"><span style="font-size:12px;color:var(--tx2);line-height:1.4">Count bodyweight in volume for pull-ups, dips, etc. <span style="color:var(--tx3)">(matches how Hevy totals volume)</span></span></label>' +
    '<button class="btn" onclick="openPushRoutineToHevy()" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">⬆ Push a routine to Hevy</button>' +
    '<button class="btn" onclick="pushLastWorkoutToHevy()" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">⬆ Log my last ToTry workout to Hevy</button>' +
    '<div style="height:1px;background:var(--bd);margin:6px 0"></div>' +
    '<button class="btn" onclick="changeHevyKey()" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">Change API key</button>' +
    '<button class="btn" onclick="disconnectHevy()" style="margin-bottom:8px;background:var(--re-bg);border:1px solid var(--re-bd);color:var(--re)">Disconnect Hevy</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}
function changeHevyKey(){
  // Clearing the key sends them back through the connect flow (used after rotating the key)
  document.querySelector('.modal-bg.open')?.remove();
  offerHevyConnect();
}
function disconnectHevy(){
  localStorage.removeItem('totry_hevy_api_key');
  localStorage.removeItem('totry_hevy_synced_once');
  if(typeof syncToCloud === 'function'){ syncToCloud('totry_hevy_api_key', null); syncToCloud('totry_hevy_synced_once', null); }
  const used = (ls('totry_apps_used') || []).filter(a => a !== 'hevy');
  ls('totry_apps_used', used);
  document.querySelector('.modal-bg.open')?.remove();
  showToast('Hevy disconnected', 'Your imported workouts stay. Reconnect anytime.');
  if(typeof renderConnectedApps === 'function') renderConnectedApps();
}

// ── HEVY EXERCISE TEMPLATE CACHE ──────────────────────────────
// Creating/updating Hevy routines requires each exercise's Hevy template UUID, not its name.
// We fetch the full template list once and cache it (it's large but static), then map by name.
async function ensureHevyTemplates(force){
  const cached = ls('totry_hevy_templates');
  const cachedAt = ls('totry_hevy_templates_at');
  // Re-use cache for 30 days unless forced
  if(!force && cached && cachedAt && (Date.now() - cachedAt < 30*86400000) && Object.keys(cached).length){
    return cached;
  }
  const key = ls('totry_hevy_api_key');
  if(!key) return null;
  const map = {};
  try{
    let page = 1;
    const pageSize = 100;
    while(page <= 20){ // up to 2000 templates
      let resp;
      try{ resp = await hevyFetch('/v1/exercise_templates?page=' + page + '&pageSize=' + pageSize, 'GET'); }
      catch(e){ break; }
      if(!resp || !resp.ok) break;
      const data = resp.data || {};
      const templates = data?.exercise_templates || [];
      if(!templates.length) break;
      templates.forEach(t => {
        if(t.title && t.id) map[t.title.toLowerCase().trim()] = t.id;
      });
      if(templates.length < pageSize) break;
      page++;
    }
    if(Object.keys(map).length){
      ls('totry_hevy_templates', map);
      ls('totry_hevy_templates_at', Date.now());
    }
    return map;
  }catch(e){
    console.error('[hevy] template fetch failed', e);
    return cached || null;
  }
}

// Map a ToTry exercise name to a Hevy template id (exact, then fuzzy contains)
function mapToHevyTemplate(name, templates){
  if(!templates || !name) return null;
  const n = name.toLowerCase().trim();
  if(templates[n]) return templates[n];
  // Fuzzy: find a template whose name contains all words of the query (or vice versa)
  const words = n.split(/\s+/).filter(w => w.length > 2);
  for(const [tName, tId] of Object.entries(templates)){
    if(tName.includes(n) || n.includes(tName)) return tId;
    if(words.length && words.every(w => tName.includes(w))) return tId;
  }
  return null;
}

// ── IMPORT HEVY ROUTINES → ToTry ──────────────────────────────
async function importHevyRoutines(){
  const key = ls('totry_hevy_api_key');
  if(!key){ showToast('Not connected', 'Connect Hevy first.'); return; }
  document.querySelector('.modal-bg.open')?.remove();
  showToast('Importing', 'Pulling your Hevy routines...');
  
  try{
    // Hevy caps pageSize at 10 — requesting 20 returns HTTP 400. Page through (up to 10 pages)
    // at the allowed size so users with many routines still get them all.
    let routines = [];
    let page = 1; const MAX_PAGES = 10;
    while(page <= MAX_PAGES){
      let resp;
      try{ resp = await hevyFetch('/v1/routines?page=' + page + '&pageSize=10', 'GET'); }
      catch(e){ showToast('Import failed', 'Hevy error: ' + ((e && e.message) ? String(e.message).slice(0,90) : 'no detail')); return; }
      if(!resp || !resp.ok){
        showToast('Import failed', (resp && resp.status === 401) ? 'Key invalid — reconnect (needs Hevy Pro).' : 'Hevy returned ' + (resp && resp.status) + '.');
        return;
      }
      const data = resp.data || {};
      const batch = data.routines || [];
      routines = routines.concat(batch);
      const totalPages = data.page_count || data.pageCount || 1;
      if(page >= totalPages || batch.length === 0) break;
      page++;
    }
    if(!routines.length){ showToast('No routines', 'No saved routines found in Hevy.'); return; }
    
    const existing = ls('totry_routines') || [];
    const existingHevyIds = new Set(existing.filter(r => r.hevyRoutineId).map(r => r.hevyRoutineId));
    let imported = 0;
    
    routines.forEach(r => {
      if(existingHevyIds.has(r.id)) return;
      const exercises = (r.exercises || []).map(ex => ({
        name: ex.title || 'Exercise',
        sets: (ex.sets || []).length || 3,
        reps: (ex.sets && ex.sets[0] && ex.sets[0].reps) ? String(ex.sets[0].reps) : '8-12',
        rest: ex.rest_seconds ? ex.rest_seconds + 's' : '90s',
        hevyTemplateId: ex.exercise_template_id || null
      }));
      existing.push({
        id: Date.now() + Math.floor(Math.random()*100000),
        hevyRoutineId: r.id,
        name: r.title || 'Hevy routine',
        source: 'hevy',
        exercises: exercises,
        createdAt: new Date().toISOString()
      });
      imported++;
    });
    
    ls('totry_routines', existing);
    showToast(imported ? 'Imported ✓' : 'Up to date', imported ? imported + ' routine' + (imported>1?'s':'') + ' from Hevy.' : 'No new routines.');
    haptic('success');
    if(typeof renderRoutines === 'function') renderRoutines();
  }catch(e){
    console.error('[hevy] routine import failed', e);
    showToast('Import failed', 'Check your connection and try again.');
  }
}

// ── PUSH ToTry ROUTINE → HEVY ─────────────────────────────────
async function openPushRoutineToHevy(){
  document.querySelector('.modal-bg.open')?.remove();
  const routines = ls('totry_routines') || [];
  // Only routines NOT already from Hevy make sense to push
  const pushable = routines.filter(r => !r.hevyRoutineId);
  if(!pushable.length){
    showToast('No routines to push', 'Build a routine in Train first.');
    return;
  }
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal" style="max-height:80vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:6px">Push a routine to Hevy</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px;line-height:1.5">Send a routine you built here into your Hevy account, so you can run it in the Hevy app too.</p>' +
    pushable.map((r, i) =>
      '<button class="btn" onclick="pushRoutineToHevy(' + routines.indexOf(r) + ')" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd);text-align:left;display:flex;justify-content:space-between;align-items:center">' +
        '<span>' + (r.name || 'Routine').replace(/</g,'&lt;') + '</span>' +
        '<span style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3)">' + (r.exercises||[]).length + ' ex →</span>' +
      '</button>'
    ).join('') +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:4px">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
}

async function pushRoutineToHevy(routineIdx){
  const key = ls('totry_hevy_api_key');
  if(!key){ showToast('Not connected', 'Connect Hevy first.'); return; }
  const routines = ls('totry_routines') || [];
  const routine = routines[routineIdx];
  if(!routine){ showToast('Not found', 'Routine missing.'); return; }
  
  document.querySelector('.modal-bg.open')?.remove();
  showToast('Mapping exercises', 'Matching to Hevy\'s library...');
  
  // Get Hevy templates so we can resolve exercise IDs
  const templates = await ensureHevyTemplates();
  if(!templates){ showToast('Push failed', 'Couldn\'t load Hevy exercise list. Try again.'); return; }
  
  const hevyExercises = [];
  const unmapped = [];
  (routine.exercises || []).forEach(ex => {
    const tid = ex.hevyTemplateId || mapToHevyTemplate(ex.name, templates);
    if(tid){
      const setCount = typeof ex.sets === 'number' ? ex.sets : ((ex.sets && ex.sets.length) || 3);
      const reps = parseInt(ex.reps) || null;
      hevyExercises.push({
        exercise_template_id: tid,
        superset_id: null,
        rest_seconds: parseInt(ex.rest) || null,
        notes: null,
        sets: Array.from({length: setCount}, () => ({
          type: 'normal',
          weight_kg: null,
          reps: reps,
          distance_meters: null,
          duration_seconds: null,
          custom_metric: null
        }))
      });
    } else {
      unmapped.push(ex.name);
    }
  });
  
  if(!hevyExercises.length){
    showToast('Couldn\'t map exercises', 'None matched Hevy\'s library. Try renaming them.');
    return;
  }
  
  showToast('Pushing', 'Creating routine in Hevy...');
  try{
    let resp;
    try{
      resp = await hevyFetch('/v1/routines', 'POST', {
        routine: {
          title: routine.name || 'ToTry routine',
          folder_id: null,
          notes: 'Created in ToTry',
          exercises: hevyExercises
        }
      });
    }catch(e){ showToast('Push failed', 'Hevy error: ' + ((e && e.message) ? String(e.message).slice(0,90) : 'no detail')); return; }

    if(!resp || !resp.ok){
      console.warn('[hevy] push failed', resp && resp.status);
      showToast('Push failed', (resp && resp.status === 401) ? 'Key invalid — reconnect (needs Hevy Pro).' : 'Hevy returned ' + (resp && resp.status) + '.');
      return;
    }
    const result = resp.data || {};
    // Tag the local routine with the new Hevy id so we don't duplicate later
    const newId = result?.routine?.id || (Array.isArray(result?.routines) && result.routines[0]?.id);
    if(newId){ routine.hevyRoutineId = newId; ls('totry_routines', routines); }
    
    let msg = 'It\'s now in your Hevy app.';
    if(unmapped.length) msg = unmapped.length + ' exercise' + (unmapped.length>1?'s':'') + ' couldn\'t be matched and ' + (unmapped.length>1?'were':'was') + ' skipped.';
    showToast('Pushed to Hevy ✓', msg);
    haptic('celebrate');
  }catch(e){
    console.error('[hevy] push error', e);
    showToast('Push failed', 'Check your connection and try again.');
  }
}

// ── LOG A COMPLETED ToTry WORKOUT → HEVY ──────────────────────
// Pushes your most recent ToTry-native session into Hevy as a completed workout,
// so sessions you log here also show up in your Hevy history.
async function pushLastWorkoutToHevy(){
  const key = ls('totry_hevy_api_key');
  if(!key){ showToast('Not connected', 'Connect Hevy first.'); return; }
  const workouts = ls('totry_workouts') || [];
  // Most recent workout that did NOT come from Hevy (avoid pushing Hevy's own data back)
  const native = workouts.find(w => w.source !== 'hevy' && w.source !== 'hevy-csv' && !w.pushedToHevy && (w.exercises||[]).length);
  if(!native){ showToast('Nothing to push', 'No new ToTry workout to log to Hevy.'); return; }
  
  document.querySelector('.modal-bg.open')?.remove();
  showToast('Mapping exercises', 'Matching to Hevy\'s library...');
  const templates = await ensureHevyTemplates();
  if(!templates){ showToast('Push failed', 'Couldn\'t load Hevy exercise list.'); return; }
  
  const hevyExercises = [];
  const unmapped = [];
  (native.exercises || []).forEach(ex => {
    const tid = ex.hevyTemplateId || mapToHevyTemplate(ex.name, templates);
    if(!tid){ unmapped.push(ex.name); return; }
    const sets = (ex.sets || []).map(s => ({
      type: (s.type === 'warmup' || s.type === 'drop' || s.type === 'failure') ? s.type : 'normal',
      weight_kg: parseFloat(s.weight) || null,
      reps: parseInt(s.reps) || null,
      distance_meters: null,
      duration_seconds: null,
      rpe: (s.rpe && !isNaN(s.rpe)) ? parseFloat(s.rpe) : null,
      custom_metric: null
    }));
    hevyExercises.push({ exercise_template_id: tid, superset_id: null, notes: ex.note || null, sets: sets.length ? sets : [{type:'normal',weight_kg:null,reps:null,distance_meters:null,duration_seconds:null,rpe:null,custom_metric:null}] });
  });
  
  if(!hevyExercises.length){ showToast('Couldn\'t map exercises', 'None matched Hevy\'s library.'); return; }
  
  // Build start/end times from the session timestamp (assume ~60 min if unknown)
  const start = native.ts ? new Date(native.ts) : new Date();
  const durMin = native.durationMinutes || 60;
  const end = new Date(start.getTime() + durMin * 60000);
  
  showToast('Logging to Hevy', 'Creating the workout...');
  try{
    let resp;
    try{
      resp = await hevyFetch('/v1/workouts', 'POST', {
        workout: {
          title: native.splitFocus || 'ToTry workout',
          description: 'Logged in ToTry',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          is_private: false,
          exercises: hevyExercises
        }
      });
    }catch(e){ showToast('Push failed', 'Hevy error: ' + ((e && e.message) ? String(e.message).slice(0,90) : 'no detail')); return; }
    if(!resp || !resp.ok){
      console.warn('[hevy] workout push failed', resp && resp.status);
      showToast('Push failed', (resp && resp.status === 401) ? 'Key invalid — reconnect (needs Hevy Pro).' : 'Hevy returned ' + (resp && resp.status) + '.');
      return;
    }
    // Mark as pushed so we don't duplicate
    native.pushedToHevy = true;
    ls('totry_workouts', workouts);
    let msg = 'It\'s now in your Hevy history.';
    if(unmapped.length) msg = unmapped.length + ' exercise' + (unmapped.length>1?'s':'') + ' skipped (no match).';
    showToast('Logged to Hevy ✓', msg);
    haptic('celebrate');
  }catch(e){
    console.error('[hevy] workout push error', e);
    showToast('Push failed', 'Check your connection and try again.');
  }
}

async function saveHevyKey(){
  const input = document.getElementById('hevy-key-input');
  const key = input?.value.trim();
  if(!key || key.length < 10){
    showToast('Invalid key', 'Paste your full Hevy API key (from hevy.com/settings?developer).');
    return;
  }
  // NOTE: We can't reliably validate by calling api.hevyapp.com from the browser — Hevy's API
  // doesn't send CORS headers, so a browser fetch throws regardless of whether the key is valid.
  // So we SAVE the key first (that's what was silently failing before), then attempt a sync and
  // report honestly. The sync itself runs through the proxy path where available.
  const btn = document.querySelector('.modal-bg.open .btn.primary');
  if(btn){ btn.textContent = 'Saving...'; btn.disabled = true; }

  ls('totry_hevy_api_key', key);
  const used = ls('totry_apps_used') || [];
  if(!used.includes('hevy')){ used.push('hevy'); ls('totry_apps_used', used); }
  if(typeof syncToCloud === 'function') syncToCloud('totry_hevy_api_key', key);

  document.querySelector('.modal-bg.open')?.remove();
  showToast('Hevy key saved ✓', 'Trying to pull your workouts...');
  haptic('celebrate');

  if(typeof renderConnectedApps === 'function') renderConnectedApps();
  // Attempt the sync; syncHevyWorkouts reports its own success/failure toast.
  setTimeout(() => { if(typeof syncHevyWorkouts === 'function') syncHevyWorkouts(); }, 600);
}

// ── legacy validation path kept for reference, no longer used ──

// Fetch recent Hevy workouts and import them into the training history
// Routes a Hevy API request through our edge function (the browser can't call Hevy directly
// due to CORS). Returns {status, ok, data} or throws. method/path/body mirror the Hevy REST API.
async function hevyFetch(path, method, bodyObj){
  const key = ls('totry_hevy_api_key');
  if(!key) throw new Error('no hevy key');
  const { data, error } = await sb.functions.invoke('ai-proxy', {
    body: { action:'hevy', hevy_key:key, hevy_path:path, hevy_method:method||'GET', hevy_body:bodyObj || undefined }
  });
  if(error) throw error;
  if(data && data.error) throw new Error(data.message || data.error);
  return data; // {status, ok, data}
}

// ═══════════════════════════════════════════════════════════════════
// WS2 — REAL HEVY INTEGRATION. Read the user's actual routines + folders and
// surface THOSE (not an app-invented split). A Hevy user trains from Hevy;
// To Try should reflect their real routines, with last weights per exercise.
// ═══════════════════════════════════════════════════════════════════
// Single source of truth for "does this user train from Hevy?"
function isHevyUser(){
  const r = ls('totry_hevy_routines');
  return !!ls('totry_hevy_api_key') && Array.isArray(r) && r.length > 0;
}
// Most recent logged weight×reps for an exercise (by name OR templateId), for the "last time" column.
function getLastWeightForExercise(name, templateId){
  const history = ls('totry_workouts') || []; // newest-first
  for(const w of history){
    const ex = (w.exercises || []).find(e => e.name === name || (templateId && e.templateId === templateId));
    if(!ex) continue;
    let bw = 0, br = 0, be = 0;
    (ex.sets || []).forEach(s => {
      if(s.type && /warm/i.test(s.type)) return;
      const e = estE1RM(s.weight, s.reps);
      if(e > be){ be = e; bw = parseFloat(s.weight)||0; br = parseInt(s.reps)||0; }
    });
    if(bw > 0) return { weight: bw, reps: br, date: w.date || '' };
  }
  return null;
}
// Pull raw Hevy routines + folders and store them as-is. Routines are templates (no weekday),
// so we present them as a pickable list rather than forcing them onto days.
async function fetchHevyRoutines(opts){
  opts = opts || {};
  const key = ls('totry_hevy_api_key');
  if(!key){ if(!opts.silent) showToast('Not connected', 'Connect Hevy first.'); return false; }
  try{
    // Folders first (cheap), then routines (paginate up to a few pages).
    let folders = [];
    try{ const fr = await hevyFetch('/v1/routine_folders?page=1&pageSize=10', 'GET'); if(fr && fr.ok) folders = (fr.data && (fr.data.routine_folders || fr.data.folders)) || []; }catch(_){ }
    let routines = [], page = 1, keep = true;
    while(keep && page <= 5){
      let resp;
      try{ resp = await hevyFetch('/v1/routines?page=' + page + '&pageSize=10', 'GET'); }
      catch(e){ if(!opts.silent) showToast('Hevy error', 'Could not load routines.'); break; }
      if(!resp || !resp.ok){
        if(!opts.silent) showToast('Hevy', (resp && resp.status === 401) ? 'Key invalid — reconnect (needs Hevy Pro).' : 'Hevy returned ' + (resp && resp.status) + '.');
        break;
      }
      const batch = (resp.data && resp.data.routines) || [];
      routines = routines.concat(batch);
      if(batch.length < 10) keep = false;
      page++;
    }
    // Normalize to a compact shape we control.
    const norm = routines.map(r => ({
      hevyId: r.id,
      title: r.title || 'Routine',
      folderId: r.folder_id || null,
      exercises: (r.exercises || []).map(ex => ({
        name: ex.title || 'Exercise',
        templateId: ex.exercise_template_id || null,
        targetSets: (ex.sets || []).length || null,
        targetReps: (ex.sets && ex.sets[0] && ex.sets[0].reps != null) ? String(ex.sets[0].reps) : null,
        rest: ex.rest_seconds || null,
        note: ex.notes || ''
      }))
    }));
    ls('totry_hevy_routines', norm);
    ls('totry_hevy_folders', (folders || []).map(f => ({ id: f.id, title: f.title || 'Folder' })));
    ls('totry_hevy_routines_at', Date.now());
    if(typeof syncToCloud==='function') syncToCloud();
    if(!opts.silent) showToast('Hevy routines loaded', norm.length + ' routine' + (norm.length===1?'':'s') + ' from Hevy.');
    return true;
  }catch(e){ if(!opts.silent) showToast('Hevy', 'Could not load routines.'); return false; }
}
// Which Hevy routine is "today's"? Hevy templates carry no weekday, so we let the user pick and
// remember it per-day. Returns the chosen routine object or null.
function getTodayHevyRoutine(){
  const routines = ls('totry_hevy_routines') || [];
  if(!routines.length) return null;
  const pick = ls('totry_hevy_today_pick') || {};
  const todayKey = new Date().toLocaleDateString('en-AU');
  if(pick.date === todayKey && pick.hevyId){
    const found = routines.find(r => r.hevyId === pick.hevyId);
    if(found) return found;
  }
  return null;
}
function setTodayHevyRoutine(hevyId){
  ls('totry_hevy_today_pick', { date: new Date().toLocaleDateString('en-AU'), hevyId });
  if(typeof loadTodaySplitCard==='function') loadTodaySplitCard();
  if(typeof renderHevyRoutines==='function') renderHevyRoutines();
  haptic('success');
}
// Modal to change today's Hevy routine.
function openHevyTodayPicker(){
  const routines = ls('totry_hevy_routines') || [];
  if(!routines.length){ showToast('No routines', 'Load your Hevy routines first.'); return; }
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;color:var(--tx);margin-bottom:12px">Today\u2019s routine</div>'+
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">'+
    routines.map(r => '<button class="btn" style="background:var(--bg3);border:1px solid var(--bd);text-align:left;padding:12px" onclick="setTodayHevyRoutine(\'' + r.hevyId + '\');this.closest(\'.modal-bg\').remove()"><div style="color:var(--tx);font-size:14px">' + r.title + '</div><div style="color:var(--tx3);font-size:11px;margin-top:2px">' + (r.exercises||[]).length + ' exercises</div></button>').join('')+
    '</div>'+
    '<button class="btn" onclick="this.closest(\'.modal-bg\').remove()" style="background:transparent;border:none;color:var(--tx3)">Cancel</button></div>';
  document.body.appendChild(m);
}

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

// ── HEVY CSV IMPORT ───────────────────────────────────────────
// Works without Hevy Pro. Parses the official Hevy CSV export (Settings → Export Data).
// Groups rows into workouts by (title + start_time), dedupes against already-imported CSV rows.
// ── EUFY SMART SCALE CSV IMPORT ───────────────────────────────────────────────
// EufyLife exports (Settings → Privacy & Data → Export All Data) come as CSV, but the
// column names and date formatting vary by app version, locale, and scale model, and Eufy
// is known for inconsistent 1-vs-2-digit dates. So we detect columns by fuzzy header match
// (never fixed position) and parse dates leniently. Weigh-ins dedupe by day+weight so a
// re-import is always safe. This brings a man's whole real weight history in at once.
function _eufyParseDate(s){
  if(!s) return null;
  s = String(s).trim().replace(/^"|"$/g,'');
  // Try native first (ISO and many locale forms)
  let d = new Date(s);
  if(!isNaN(d)) return d;
  // Eufy quirk: "yyyy-m-d h:m" or "yyyy/m/d", 1-or-2 digit parts. Normalise separators.
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(s);
  if(m){
    d = new Date(+m[1], +m[2]-1, +m[3], +(m[4]||12), +(m[5]||0), +(m[6]||0));
    if(!isNaN(d)) return d;
  }
  // d/m/yyyy or m/d/yyyy — assume day-first (en-AU). Fall back gracefully.
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{1,2}))?/.exec(s);
  if(m){
    d = new Date(+m[3], +m[2]-1, +m[1], +(m[4]||12), +(m[5]||0));
    if(!isNaN(d)) return d;
  }
  return null;
}
// Works for ANY smart scale's CSV (Eufy, Withings, Renpho, Fitbit Aria, Garmin, etc.) —
// the unified engine maps columns by synonym, with an AI fallback for unfamiliar exports.
function importEufyCSV(event){
  const file = event.target.files?.[0];
  event.target.value = '';
  if(!file) return;
  const schema = {
    date:'required', weight:'required', bodyfat:true, musclepct:true, musclekg:true,
    bmi:true, bmr:true, water:true, fatmass:true, lean:true, bonekg:true, bonepct:true,
    visceral:true, protein:true, skeletal:true, subcut:true, heartrate:true, bodyage:true
  };
  smartImportCSV(file, schema, (cols, rows) => {
    const header = rows[0].map(h => String(h||'').toLowerCase());
    const unitIsLb = cols.weight!=null && /lb/.test(header[cols.weight]||'');
    const num = (row, f) => { const i = cols[f]; if(i==null) return null; const v = parseFloat(String(row[i]||'').replace(/[^0-9.\-]/g,'')); return (isNaN(v)||v===0) ? null : v; };
    const existing = ls('totry_body') || [];
    const dayKey = (d, w) => new Date(d).toLocaleDateString('en-AU') + '|' + (Math.round(w*10)/10);
    const existingKeys = new Set(existing.filter(en => en.weight>0 && en.ts).map(en => dayKey(en.ts, en.weight)));
    let imported = 0, skipped = 0;
    for(let r=1; r<rows.length; r++){
      const row = rows[r];
      if(!row || row.length < 2) continue;
      const d = _eufyParseDate(row[cols.date]);
      let w = parseFloat(String(row[cols.weight]||'').replace(/[^0-9.]/g,''));
      if(!d || !w || isNaN(w)){ skipped++; continue; }
      if(unitIsLb) w = w * 0.453592;
      w = Math.round(w*10)/10;
      if(w < 20 || w > 400){ skipped++; continue; }
      const key = dayKey(d, w);
      if(existingKeys.has(key)){ skipped++; continue; }
      const bf = num(row,'bodyfat');
      const comp = {
        bmi:num(row,'bmi'), bmr:num(row,'bmr'), water:num(row,'water'),
        musclePct:num(row,'musclepct'), muscleKg:num(row,'musclekg'),
        fatMassKg:num(row,'fatmass'), leanKg:num(row,'lean'),
        boneKg:num(row,'bonekg'), bonePct:num(row,'bonepct'),
        visceral:num(row,'visceral'), protein:num(row,'protein'),
        skeletalKg:num(row,'skeletal'), subcutaneous:num(row,'subcut'),
        heartRate:num(row,'heartrate'), bodyAge:num(row,'bodyage')
      };
      Object.keys(comp).forEach(k => { if(comp[k]==null) delete comp[k]; });
      // Same as the screenshot path: a scale exporting pounds exports every mass in pounds, and only
      // bodyweight was being converted above. These are stored under *Kg names and read back as kg
      // everywhere, so leaving them unconverted silently inflates a person's muscle mass by 2.2x.
      if(unitIsLb){
        for(const k of ['muscleKg','fatMassKg','leanKg','boneKg','skeletalKg']){
          if(comp[k] != null && !isNaN(comp[k])) comp[k] = Math.round(comp[k] * 0.453592 * 10) / 10;
        }
      }
      const entry = {
        date: d.toLocaleDateString('en-AU',{day:'numeric',month:'short'}),
        ts: d.toISOString(), weight: w,
        bf: (bf && !isNaN(bf)) ? bf : 0,
        note:'', photo:null, source:'scale-csv'
      };
      if(Object.keys(comp).length) entry.comp = comp;
      existing.push(entry); existingKeys.add(key); imported++;
    }
    if(imported > 0){
      existing.sort((a,b) => new Date(b.ts) - new Date(a.ts));
      ls('totry_body', existing.slice(0, 1000));
      if(typeof syncToCloud==='function') syncToCloud();
      document.querySelector('.modal-bg.open')?.remove();
      if(typeof renderBody==='function') renderBody();
      if(typeof renderWeightHistory==='function') renderWeightHistory();
      if(typeof adjustCaloriesFromWeightTrend==='function') adjustCaloriesFromWeightTrend();
      haptic('celebrate');
      showToast('Imported ✓', imported + ' weigh-in' + (imported>1?'s':'') + (skipped?' · '+skipped+' skipped (duplicates/invalid)':'') + '.');
    } else {
      showToast('Nothing new', skipped ? 'Those weigh-ins were already imported.' : 'No valid rows found.');
    }
  });
}

// ── SCALE SCREENSHOT → ENTRY (AI vision) ──────────────────────────────────────
// For daily weigh-ins after the bulk import: the EufyLife app only lets you copy the
// stats as an image, not text. So we read the screenshot with vision and fill a full
// entry. A confirmation step lets the man correct any misread digit before saving —
// honest data matters more than speed.
async function importScaleScreenshot(event){
  const file = event.target.files?.[0];
  event.target.value = '';
  if(!file) return;
  if(!file.type.startsWith('image/')){ showToast('Wrong file','Please choose a screenshot of your scale stats.'); return; }
  showToast('Reading your scale...', 'One moment while I read the numbers.');
  let dataUrl;
  try{ dataUrl = await downscaleImage(file, 1280, 0.85); }
  catch(e){ showToast('Couldn\'t read that', 'Try a clearer screenshot.'); return; }
  const base64 = dataUrl.split(',')[1];
  try{
    const prompt = 'This is a screenshot from a smart-scale app (e.g. EufyLife) showing body-composition cards. Read every value you can see. Return ONLY this JSON, no markdown, numbers only (no units), use null for anything not shown: {"weight":number,"unit":"kg or lb","bf":number,"musclePct":number,"muscleKg":number,"fatMassKg":number,"bmi":number,"water":number,"bonePct":number,"boneKg":number,"bmr":number,"visceral":number,"leanKg":number,"heartRate":number,"protein":number,"bodyAge":number}. If this is not a scale/body-composition screenshot, return {"error":"not a scale"}.';
    const {data, error} = await Promise.race([
      sb.functions.invoke('ai-proxy', { body:{ action:'vision', prompt, image_base64:base64, image_mime:'image/jpeg', max_tokens:400 } }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out')), 35000))
    ]).catch(e => ({ error:e }));
    if(error || !data?.text){ showToast('Couldn\'t read it', 'Try a clearer screenshot, or use + Log to enter manually.'); return; }
    const mm = data.text.match(/\{[\s\S]*\}/);
    const parsed = mm ? JSON.parse(mm[0]) : null;
    if(!parsed || parsed.error || !parsed.weight){
      showToast('Not a scale screenshot', 'I couldn\'t find a weight in that image. Try + Log instead.');
      return;
    }
    let w = parseFloat(parsed.weight);
    // A SCALE IN POUNDS REPORTS EVERY MASS IN POUNDS. Only bodyweight was converted, and the confirm
    // sheet then labelled muscle, fat, lean and bone mass "kg" while they still held pounds — a 2.2x
    // overstatement, presented as a measurement of the person's own body. Convert the whole family,
    // or none of it. Percentages, BMI, water, visceral and BMR are unitless or already absolute.
    if(parsed.unit && /lb/i.test(parsed.unit)){
      w = w * 0.453592;
      for(const k of ['muscleKg','fatMassKg','leanKg','boneKg','skeletalKg']){
        const v = parseFloat(parsed[k]);
        if(!isNaN(v)) parsed[k] = Math.round(v * 0.453592 * 10) / 10;
      }
    }
    w = Math.round(w*10)/10;
    confirmScaleScreenshotEntry(w, parsed);
  }catch(err){
    console.error('scale screenshot failed', err);
    showToast('Something went wrong', 'Couldn\'t read that screenshot. Try + Log to enter manually.');
  }
}
function confirmScaleScreenshotEntry(weight, p){
  const today = _todayLocalISO();
  const row = (label, val, unit) => (val!=null && !isNaN(val))
    ? '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--tx2);padding:4px 0"><span style="color:var(--tx3)">'+label+'</span><span>'+val+(unit?' '+unit:'')+'</span></div>' : '';
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal" style="max-height:90vh;overflow-y:auto">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:21px;color:var(--tx);font-style:italic;margin-bottom:4px">I read your scale</div>'+
    '<div style="text-align:center;font-size:12px;color:var(--tx3);margin-bottom:14px">Check the weight and correct it if I misread, then save.</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">'+
      '<div style="flex:1"><label style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:4px">Weight (kg)</label>'+
      '<input type="number" id="shot-weight" step="0.1" value="'+weight+'" style="width:100%;font-size:22px;text-align:center;padding:10px;font-family:DM Mono,monospace"></div>'+
      '<div style="width:140px"><label style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:4px">Date</label>'+
      '<input type="date" id="shot-date" max="'+today+'" value="'+today+'" style="width:100%;font-size:16px;padding:11px;color-scheme:dark"></div>'+
    '</div>'+
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:10px 12px;margin-bottom:14px">'+
      row('Body fat', p.bf, '%')+row('Muscle mass', p.musclePct, '%')+row('Muscle mass', p.muscleKg, 'kg')+
      row('Body fat mass', p.fatMassKg, 'kg')+row('Lean body mass', p.leanKg, 'kg')+row('BMI', p.bmi, '')+
      row('Water', p.water, '%')+row('Visceral fat', p.visceral, '')+row('BMR', p.bmr, 'kcal')+
      row('Bone mass', p.boneKg, 'kg')+row('Protein', p.protein, '%')+row('Heart rate', p.heartRate, 'bpm')+
    '</div>'+
    '<button class="btn primary" onclick="saveScaleScreenshotEntry()" style="margin-bottom:8px">Save this weigh-in</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>'+
    '</div>';
  m.__parsed = p;
  document.body.appendChild(m);
  window.__shotParsed = p;
}
function saveScaleScreenshotEntry(){
  const p = window.__shotParsed || {};
  const w = parseFloat(document.getElementById('shot-weight')?.value || 0);
  const dStr = document.getElementById('shot-date')?.value;
  if(!w || w < 20 || w > 400){ showToast('Enter a real weight','Between 20 and 400 kg.'); return; }
  const d = dStr ? new Date(dStr+'T12:00:00') : new Date();
  const comp = {
    bmi:p.bmi, bmr:p.bmr, water:p.water, musclePct:p.musclePct, muscleKg:p.muscleKg,
    fatMassKg:p.fatMassKg, leanKg:p.leanKg, boneKg:p.boneKg, bonePct:p.bonePct,
    visceral:p.visceral, protein:p.protein, heartRate:p.heartRate, bodyAge:p.bodyAge
  };
  Object.keys(comp).forEach(k => { if(comp[k]==null || isNaN(comp[k])) delete comp[k]; });
  const entries = ls('totry_body') || [];
  // Replace an existing same-day entry, else add.
  const dayStr = d.toLocaleDateString('en-AU');
  const idx = entries.findIndex(e => e.ts && new Date(e.ts).toLocaleDateString('en-AU') === dayStr);
  const entry = {
    date: d.toLocaleDateString('en-AU',{day:'numeric',month:'short'}),
    ts: d.toISOString(), weight: Math.round(w*10)/10,
    bf: (p.bf && !isNaN(p.bf)) ? p.bf : 0,
    note:'', photo:null, source:'eufy-screenshot'
  };
  if(Object.keys(comp).length) entry.comp = comp;
  if(idx >= 0) entries[idx] = { ...entries[idx], ...entry };
  else entries.unshift(entry);
  entries.sort((a,b) => new Date(b.ts) - new Date(a.ts));
  ls('totry_body', entries.slice(0,1000));
  if(typeof syncToCloud==='function') syncToCloud();
  document.querySelector('.modal-bg.open')?.remove();
  if(typeof renderBody==='function') renderBody();
  if(typeof renderWeightHistory==='function') renderWeightHistory();
  if(typeof adjustCaloriesFromWeightTrend==='function') adjustCaloriesFromWeightTrend();
  haptic('celebrate');
  showToast('Logged ✓', w + 'kg saved with your full body composition.');
}

// Works for ANY workout app's CSV (Hevy, Strong, FitNotes, etc.) via the unified engine:
// synonym mapping first, AI fallback for unfamiliar exports. Rows are grouped into sessions.
function importHevyCSV(event){
  const file = event.target.files?.[0];
  event.target.value = '';
  if(!file) return;
  const schema = { exercise:'required', start_time:'required', workout_title:true, weight_lifted:true, reps:true, rpe:true, distance:true, duration:true, end_time:true };
  smartImportCSV(file, schema, (cols, rows) => {
    const v = (row,f) => cols[f]!=null ? row[cols[f]] : undefined;
    // Group data rows into workouts keyed by title+start
    const groups = {};
    for(let r=1; r<rows.length; r++){
      const row = rows[r];
      if(!row || row.length < 3) continue;
      const start = (v(row,'start_time')||'').trim();
      const title = (v(row,'workout_title')||'Workout').trim();
      if(!start) continue;
      const key = title + '|' + start;
      if(!groups[key]) groups[key] = {title, start, end:(v(row,'end_time')||'').trim(), exercises:{}};
      const exName = (v(row,'exercise')||'Exercise').trim();
      if(!groups[key].exercises[exName]) groups[key].exercises[exName] = [];
      const w = parseFloat(v(row,'weight_lifted'));
      const reps = parseInt(v(row,'reps'));
      const rpe = parseFloat(v(row,'rpe'));
      groups[key].exercises[exName].push({
        weight: isNaN(w)?0:w, reps: isNaN(reps)?0:reps,
        rpe: (rpe && !isNaN(rpe))?rpe:null, done:true
      });
    }
    const existing = ls('totry_workouts') || [];
    const existingCsvKeys = new Set(existing.filter(w => w.csvKey).map(w => w.csvKey));
    let imported = 0;
    Object.values(groups).forEach(g => {
      const csvKey = g.title + '|' + g.start;
      if(existingCsvKeys.has(csvKey)) return;
      const exercises = Object.entries(g.exercises).map(([name, sets]) => ({name, sets}));
      const totalSets = exercises.reduce((a, ex) => a + ex.sets.length, 0);
      const volume = Math.round(exercises.reduce((t, ex) => t + ex.sets.reduce((a, s) => { const w=parseFloat(s.weight)||0, r=parseInt(s.reps)||0; return a + (w>0 ? w*r : 0); }, 0), 0));
      const dateObj = new Date(g.start.replace(' ', 'T'));
      const validDate = !isNaN(dateObj) ? dateObj : new Date();
      existing.push({
        id: Date.now() + Math.floor(Math.random()*100000),
        csvKey, source:'workout-csv',
        date: validDate.toLocaleDateString('en-AU', {weekday:'short', day:'numeric', month:'short', year:'numeric'}),
        ts: validDate.toISOString(), day: getDayCount(),
        exercises, completedSets: totalSets, totalSets, volume,
        splitFocus: g.title || 'Imported workout',
        durationMinutes: g.end ? Math.round((new Date(g.end.replace(' ','T')) - validDate)/60000) || null : null
      });
      existingCsvKeys.add(csvKey);
      imported++;
    });
    if(imported > 0){
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
      if(typeof syncToCloud==='function') syncToCloud();
      document.querySelector('.modal-bg.open')?.remove();
      showToast('Imported', imported + ' workout' + (imported>1?'s':'') + ' from your CSV.');
      haptic('celebrate');
      if(typeof renderUnifiedTraining === 'function') renderUnifiedTraining();
      if(typeof renderBody === 'function') renderBody();
    } else {
      showToast('Nothing new', 'Those workouts were already imported.');
    }
  });
}

// Minimal RFC-4180-ish CSV parser: handles quoted fields, commas in quotes, escaped quotes, newlines
// ── UNIFIED IMPORT ENGINE ─────────────────────────────────────────────────────
// To Try is the engine between other apps — it should accept fuel from ANY of them.
// Every CSV importer (weight, food, workouts) runs through this one path:
//   Tier 1: deterministic column matching against a rich multi-app/multi-locale synonym
//           dictionary. Free, instant, offline. Handles ~95% of real exports.
//   Tier 2: if Tier 1 can't find the REQUIRED columns, one AI call maps just the header
//           (plus a few sample rows) to our schema. Rare, cheap, makes nothing unimportable.
// The AI only ever maps STRUCTURE; the deterministic code still parses every row.
const COLUMN_SYNONYMS = {
  // weight / body
  date:        ['date','time','timestamp','date/time','日期','datum','fecha','data','measured','measurement time','time of measurement','day'],
  weight:      ['weight','weight (kg)','weight (lb)','weight (lbs)','weight(kg)','mass','body weight','poids','gewicht','peso','体重','wt'],
  bodyfat:     ['body fat %','body fat','fat %','fat percent','bf%','bf','body fat (%)','体脂','fat ratio','fat'],
  musclepct:   ['muscle mass %','muscle %','muscle (%)','skeletal muscle %'],
  musclekg:    ['muscle mass (kg)','muscle mass','muscle (kg)','muscle','lean muscle'],
  bmi:         ['bmi','body mass index'],
  bmr:         ['bmr','basal metabolic rate','rmr'],
  water:       ['water','water %','body water','hydration','total body water'],
  fatmass:     ['body fat mass (kg)','body fat mass','fat mass','fat mass (kg)'],
  lean:        ['lean body mass (kg)','lean body mass','lean mass','lean','ffm','fat free mass','fat-free mass'],
  bonekg:      ['bone mass (kg)','bone mass','bone'],
  bonepct:     ['bone mass %','bone %'],
  visceral:    ['visceral fat','visceral','visceral fat index','vfi'],
  protein:     ['protein %','protein','protein percent'],
  skeletal:    ['skeletal muscle mass (kg)','skeletal muscle','skeletal muscle mass'],
  subcut:      ['subcutaneous fat %','subcutaneous fat','subcutaneous'],
  heartrate:   ['heart rate (bpm)','heart rate','bpm','hr','pulse'],
  bodyage:     ['body age','metabolic age'],
  // food / nutrition
  food:        ['food name','food','name','description','item','product','meal name'],
  meal:        ['meal','meal type','meal group','group','category','time of day'],
  calories:    ['calories','energy (kcal)','energy','kcal','cal','calories (kcal)','energy kcal'],
  protein_g:   ['protein (g)','protein','protein(g)','protein g','prot (g)'],
  carbs_g:     ['carbohydrates (g)','carbs (g)','carbs','carbohydrate','carbohydrates','net carbs (g)','carbs(g)'],
  fat_g:       ['fat (g)','fat','total fat','total lipid','total fat (g)','fat(g)'],
  // workouts
  exercise:    ['exercise','exercise title','exercise name','movement','lift'],
  sets:        ['sets','set','set number','set order'],
  reps:        ['reps','rep','repetitions','reps done'],
  weight_lifted:['weight','weight (kg)','weight_kg','weight (lb)','load','kg','lbs'],
  rpe:         ['rpe','rir','intensity','effort'],
  workout_title:['title','workout','workout name','routine','session','workout title'],
  start_time:  ['start_time','start time','start','date','time','workout date'],
  end_time:    ['end_time','end time','end','finish'],
  distance:    ['distance','distance_km','distance (km)','distance (mi)','km','miles'],
  duration:    ['duration','duration_seconds','duration (s)','time','elapsed','minutes']
};
// Deterministic mapper. schema = {field:true/'required'}. Returns {field:index} for found cols.
function mapColumns(headerRaw, schema){
  const header = headerRaw.map(h => String(h||'').trim().toLowerCase().replace(/^["']|["']$/g,'').replace(/^\ufeff/,''));
  const used = new Set();
  const out = {};
  // Pass 1: exact synonym match (longest synonyms first so "muscle mass (kg)" beats "muscle").
  for(const field of Object.keys(schema)){
    const syns = (COLUMN_SYNONYMS[field]||[field]).slice().sort((a,b)=>b.length-a.length);
    for(const syn of syns){
      const i = header.findIndex((h,idx) => !used.has(idx) && h === syn);
      if(i > -1){ out[field] = i; used.add(i); break; }
    }
  }
  // Pass 2: 'contains' match for fields still unfound.
  for(const field of Object.keys(schema)){
    if(out[field] != null) continue;
    const syns = (COLUMN_SYNONYMS[field]||[field]).slice().sort((a,b)=>b.length-a.length);
    for(const syn of syns){
      const i = header.findIndex((h,idx) => !used.has(idx) && h.includes(syn));
      if(i > -1){ out[field] = i; used.add(i); break; }
    }
  }
  return out;
}
// AI fallback — maps header (+ samples) to our schema fields. Returns {field:index} or null.
async function aiMapColumns(header, sampleRows, schema){
  if(typeof api !== 'function') return null;
  try{
    const fields = Object.keys(schema);
    const sample = sampleRows.slice(0,3).map(r => r.join(' | ')).join('\n');
    const prompt = 'You are mapping CSV columns to a fixed schema. The CSV header columns are (0-indexed):\n'+
      header.map((h,i)=>i+': '+h).join('\n')+'\n\nSample rows:\n'+sample+'\n\n'+
      'Map each of these schema fields to the column INDEX that best matches, or null if absent: '+fields.join(', ')+'.\n'+
      'Return ONLY JSON like {"'+fields[0]+'":0}. Numbers or null only, no other text.';
    const txt = await api('You map CSV columns to schema fields. Reply with JSON only.', [], prompt, 300);
    if(!txt) return null;
    const m = txt.match(/\{[\s\S]*\}/);
    if(!m) return null;
    const raw = JSON.parse(m[0]);
    const out = {};
    for(const f of fields){ if(typeof raw[f] === 'number' && raw[f] >= 0 && raw[f] < header.length) out[f] = raw[f]; }
    return out;
  }catch(e){ console.error('aiMapColumns failed', e); return null; }
}
// Orchestrator: parse file → map columns (Tier 1, then Tier 2) → verify required → hand to caller.
// schema: {field:'required'|true}. onReady(cols, rows) does the domain-specific row parsing.
async function smartImportCSV(file, schema, onReady, opts){
  opts = opts || {};
  const text = await file.text();
  const rows = parseCSV(text);
  if(rows.length < 2){ showToast('Empty file', 'No rows found in that file.'); return; }
  const header = rows[0];
  const required = Object.keys(schema).filter(f => schema[f] === 'required');
  let cols = mapColumns(header, schema);
  let missing = required.filter(f => cols[f] == null);
  if(missing.length){
    // Tier 2 — ask AI to map the structure, then merge in only the missing fields.
    showToast('Reading your file...', 'Working out the columns.');
    const aiCols = await aiMapColumns(header, rows.slice(1), schema);
    if(aiCols){ for(const f of Object.keys(aiCols)){ if(cols[f] == null) cols[f] = aiCols[f]; } }
    missing = required.filter(f => cols[f] == null);
  }
  if(missing.length){
    showToast('Unrecognised file', 'Couldn\'t find: ' + missing.join(', ') + '. Try your app\'s standard CSV export.');
    return;
  }
  onReady(cols, rows);
}

// Normalise a money string from a bank export. The old code stripped everything except [0-9.-], which
// silently multiplied European amounts by 100: '-22,99' became -2299 and '1.234,56' became 1.23456.
// Rule: whichever of . or , appears LAST is the decimal separator; the other is a thousands grouper.
function _csvAmount(raw){
  let t = String(raw == null ? '' : raw).trim();
  if(!t) return 0;
  const neg = /^\(.*\)$/.test(t) || /-/.test(t);        // some exports use (123.45) for negatives
  t = t.replace(/[^0-9.,]/g, '');
  const lastDot = t.lastIndexOf('.'), lastComma = t.lastIndexOf(',');
  if(lastDot >= 0 && lastComma >= 0){
    if(lastComma > lastDot) t = t.replace(/\./g, '').replace(',', '.');   // 1.234,56
    else t = t.replace(/,/g, '');                                        // 1,234.56
  } else if(lastComma >= 0){
    // Only commas: a trailing group of exactly 2 digits reads as a decimal, otherwise thousands.
    t = /,\d{2}$/.test(t) ? t.replace(/,/g, '.') : t.replace(/,/g, '');
  } else if(lastDot >= 0 && /\.\d{3}$/.test(t) && t.indexOf('.') === lastDot){
    // Only a single dot, followed by exactly THREE digits: '2.500'. Money carries two decimal places, not
    // three, so in every locale this is a thousands grouper — European exports write 2.500 for 2,500.
    // Reading it as 2.5 understated the amount by 1000x.
    t = t.replace(/\./g, '');
  }
  const n = parseFloat(t);
  if(isNaN(n)) return 0;
  return neg ? -Math.abs(n) : n;
}
function parseCSV(text){
  const rows = [];
  // Excel and most Windows bank exports start with a UTF-8 BOM, which stayed glued to the first header
  // ("\uFEFFDate"), so header detection missed the very first column every time.
  text = String(text || '').replace(/^\uFEFF/, '');
  // Delimiter is not always a comma: European exports use ';' (with ',' as the decimal point) and some
  // use tabs. Sniff it from the first line, which is the header on every real export.
  const firstLine = text.slice(0, text.indexOf('\n') < 0 ? text.length : text.indexOf('\n'));
  const counts = { ',': (firstLine.match(/,/g)||[]).length, ';': (firstLine.match(/;/g)||[]).length, '\t': (firstLine.match(/\t/g)||[]).length };
  const DELIM = Object.keys(counts).reduce((a,b)=> counts[b] > counts[a] ? b : a, ',');
  let row = [], field = '', inQuotes = false;
  for(let i = 0; i < text.length; i++){
    const c = text[i], next = text[i+1];
    if(inQuotes){
      if(c === '"' && next === '"'){ field += '"'; i++; }
      else if(c === '"'){ inQuotes = false; }
      else { field += c; }
    } else {
      if(c === '"'){ inQuotes = true; }
      else if(c === DELIM){ row.push(field); field = ''; }
      else if(c === '\r'){ /* skip */ }
      else if(c === '\n'){ row.push(field); rows.push(row); row = []; field = ''; }
      else { field += c; }
    }
  }
  // Last field/row
  if(field.length || row.length){ row.push(field); rows.push(row); }
  return rows.filter(r => r.length && !(r.length === 1 && r[0].trim() === ''));
}

// ── FOOD CSV IMPORT / EXPORT ──────────────────────────────────
// Import: handles MyFitnessPal and Cronometer CSV exports (column names vary, so we
// fuzzy-match headers). Each row becomes a logged food entry on its date.
// Works for ANY nutrition app's CSV (MyFitnessPal, Cronometer, LoseIt, MacroFactor, etc.)
// via the unified engine: synonym mapping first, AI fallback for unfamiliar exports.
function importFoodCSV(event){
  const file = event.target.files?.[0];
  event.target.value = '';
  if(!file) return;
  const schema = { calories:'required', food:'required', date:true, meal:true, protein_g:true, carbs_g:true, fat_g:true };
  smartImportCSV(file, schema, (cols, rows) => {
    const log = ls('totry_nutlog') || {};
    let imported = 0;
    const mealMap = m => { m=(m||'').toLowerCase(); if(/break/.test(m))return'breakfast'; if(/lunch/.test(m))return'lunch'; if(/din/.test(m))return'dinner'; return'snack'; };
    const val = (row,f) => cols[f]!=null ? row[cols[f]] : undefined;
    for(let r=1; r<rows.length; r++){
      const row = rows[r];
      if(!row || row.length < 2) continue;
      const name = (val(row,'food')||'').trim();
      const cal = Math.round(parseFloat(val(row,'calories')) || 0);
      if(!name || cal <= 0) continue;
      // ts must be the HISTORICAL date — the digest, adaptive TDEE and reports window by ts.
      let dateKey = new Date().toLocaleDateString('en-AU');
      let entryTs = new Date().toISOString();
      const dRaw = val(row,'date');
      if(dRaw){ const d = new Date(String(dRaw).trim()); if(!isNaN(d)){ dateKey = d.toLocaleDateString('en-AU'); entryTs = new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0,0).toISOString(); } }
      if(!log[dateKey]) log[dateKey] = [];
      log[dateKey].push({
        id: Date.now() + Math.floor(Math.random()*100000),
        name, serving:'1 serving (imported)', qty:1, cal,
        pro: Math.round((parseFloat(val(row,'protein_g'))||0)*10)/10,
        carb: Math.round((parseFloat(val(row,'carbs_g'))||0)*10)/10,
        fat: Math.round((parseFloat(val(row,'fat_g'))||0)*10)/10,
        meal: cols.meal!=null ? mealMap(val(row,'meal')) : 'snack',
        source:'CSV import', ts: entryTs
      });
      imported++;
    }
    if(imported > 0){
      ls('totry_nutlog', log);
      ls('totry_food_imported', true);
      if(typeof logEvent==='function') logEvent('csv_import');
      if(typeof syncToCloud==='function') syncToCloud();
      document.querySelector('.modal-bg.open')?.remove();
      showToast('Welcome — your history is here ✓', imported + ' entries imported. No re-logging needed.');
      haptic('celebrate');
      if(typeof renderNutritionLog === 'function') renderNutritionLog();
    } else {
      showToast('Nothing imported', 'No valid food rows found in that file.');
    }
  });
}

// Export: ToTry's full food log as a CSV anyone can open in Excel / re-import elsewhere
async function exportFoodCSV(){
  const log = ls('totry_nutlog') || {};
  const dates = Object.keys(log);
  if(!dates.length){ showToast('Nothing to export', 'Log some food first.'); return; }
  
  const esc = v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  let csv = 'Date,Meal,Food,Calories,Protein (g),Carbs (g),Fat (g)\n';
  // Sort dates chronologically
  dates.sort((a,b) => {
    const pa = a.split('/').map(Number), pb = b.split('/').map(Number);
    return new Date(pa[2],pa[1]-1,pa[0]) - new Date(pb[2],pb[1]-1,pb[0]);
  });
  dates.forEach(date => {
    (log[date] || []).forEach(e => {
      csv += [esc(date), esc(e.meal||''), esc(e.name), e.cal||0, e.pro||0, e.carb||0, e.fat||0].join(',') + '\n';
    });
  });
  
  const blob = new Blob([csv], {type: 'text/csv'});
  const _r = await SaveFile.save(blob, 'totry-food-log-' + new Date().toISOString().slice(0,10) + '.csv', 'Food log');
  if(_r === null) return;   // dismissed
  // "Downloaded" is browser language: on iOS this hands the file to the share sheet, so the person
  // chose where it went. Say the true thing for the platform they're on.
  const _native = (typeof isNativeApp==='function' && isNativeApp());
  showToast(_r ? 'Exported' : 'Not saved', _r ? (_native ? 'Your food log is ready as a CSV.' : 'Your food log downloaded as CSV.') : 'Nothing was written. Try again in a moment.');
  if(_r) haptic('success');
}


function saveESVKey(){
  const key=document.getElementById('esv-key-input')?.value.trim();
  if(!key)return;
  ls('totry_esv_key',key);
  document.querySelector('.modal-bg.open')?.remove();
  showToast('ESV key saved','ESV Bible will now load in the Scripture tab.');
}

function saveAllTargets(){
  // Calorie and protein goals deliberately live in Nourish (and the TDEE calculator) — this card's
  // own copy says so. The reads for #settings-cal-goal / #settings-pro-goal were left behind when
  // targets moved out of Settings; neither element exists any more, so they resolved to 0 and the
  // `cal>0&&pro>0` guard quietly dropped them — while the toast still claimed "All daily targets".
  const steps=parseInt(document.getElementById('settings-steps-goal')?.value||8000);
  const sleep=parseFloat(document.getElementById('settings-sleep-goal')?.value||8);
  // Stored in ML. A small number can only mean glasses, so convert rather than corrupt the goal.
  let water=parseInt(document.getElementById('settings-water-goal')?.value||2500);
  if(water>0 && water<=30) water = water*250;
  const h=parseInt(document.getElementById('settings-height')?.value||0);
  if(h>0)ls('totry_height',h);
  ls('totry_step_goal',steps);ls('totry_sleep_goal',sleep);ls('totry_water_goal',water);
  showToast('Targets saved','Steps, sleep and water updated.');
}

function exportWorkouts(){
  const history=ls('totry_workouts')||[];
  if(!history.length){showToast('No workouts','Log some sessions first.');return;}
  const NL='\n';
  // This assumed every session is a structured strength log: s.exercises[].sets[]. It is not. A Hevy
  // import stores exercises with no sets array, and cardio, Strava and the Apple Health sessions added in
  // v389 have no exercises at all — so ex.sets.map threw and the Export workouts button in Settings just
  // did nothing, on the most common shapes in the store. Describe whatever the session actually is.
  const text=history.map(function(s){
    const head = '=== ' + (s.date || (s.ts ? new Date(s.ts).toLocaleDateString('en-AU') : '')) +
                 (s.day ? ' (Day ' + s.day + ')' : '') + ' ===';
    const title = s.splitFocus || s.type || 'Session';
    const meta = [
      s.durationMinutes ? s.durationMinutes + ' min' : '',
      s.distance ? (Math.round(s.distance) + ' m') : '',
      s.calories ? (Math.round(s.calories) + ' cal') : '',
      s.averageHeartRate ? (Math.round(s.averageHeartRate) + ' bpm') : '',
      s.sourceName ? ('via ' + s.sourceName) : ''
    ].filter(Boolean).join(' \u00b7 ');
    const exList = Array.isArray(s.exercises) ? s.exercises : [];
    const body = exList.map(function(ex){
      const sets = Array.isArray(ex && ex.sets) ? ex.sets : [];
      const name = (ex && ex.name) || 'Exercise';
      if(!sets.length) return name;                       // Hevy-style entry with no set detail
      return name + ':' + NL + sets.map(function(set,i){
        return '  S' + (i+1) + ': ' + ((set && set.weight) || '?') + 'kg x ' + ((set && set.reps) || '?') + ' reps' + ((set && set.done) ? ' done' : '');
      }).join(NL);
    }).join(NL);
    return [head, title, meta, body].filter(Boolean).join(NL);
  }).join(NL+NL);
  copyToClipboard(text);showToast('Copied!',history.length+' sessions copied to clipboard.');
}

// (orphan go() extension removed)

// (orphan initApp extension removed)

// ═══════════════════════════════════════════════════
// IDENTITY LAYER — Stage 3
// ═══════════════════════════════════════════════════

// ── IDENTITY ──────────────────────────────────────────────────
function renderIdentity(){
  const id=ls('totry_identity');
  const el=document.getElementById('identity-text');
  const labelEl=document.querySelector('.identity-strip .id-label');
  if(!el)return;
  if(id){
    // Identity set - show with highlighted "becoming" phrase
    if(labelEl)labelEl.textContent='Who you are becoming';
    let txt=id;
    if(txt.toLowerCase().startsWith('i am becoming a person who')){
      const rest=txt.substring(26);
      txt='I am becoming a person who<em>'+rest+'</em>';
    }
    el.innerHTML=txt;
    // Evidence: reflect his own actions back as proof he's living into this identity.
    // Identity isn't just a sentence — it's reinforced by what he's actually done.
    const evEl=document.getElementById('identity-evidence');
    if(evEl){
      try{
        loadV();
        const wins=ls('totry_wins')||[];
        let totalClean=0;
        (vices||[]).forEach(v=>{ if(v.mode!=='moderate') totalClean += (v.cleanDaysTotal||0) + (typeof viceCleanDays==='function'?viceCleanDays(v):0); });
        const dayCount = (typeof getDayCount==='function') ? getDayCount() : 0;
        const bits=[];
        if(dayCount>1) bits.push(dayCount+' days on the journey');
        if(totalClean>0) bits.push(totalClean+' clean day'+(totalClean===1?'':'s')+' fought for');
        if(wins.length>0) bits.push(wins.length+' win'+(wins.length===1?'':'s')+' logged');
        if(bits.length){
          evEl.style.display='block';
          evEl.textContent='✓ '+bits.slice(0,2).join(' · ')+' — this is you, proving it.';
        } else {
          evEl.style.display='none';
        }
      }catch(e){ evEl.style.display='none'; }
    }
  }else{
    // No identity - check if user has affirmations and rotate through them
    const affirms=(typeof getAffirmations==='function'?getAffirmations():(ls('totry_affirms')||[]));
    if(affirms.length){
      const today=new Date().toLocaleDateString('en-AU');
      const idx=Math.abs(hashStr(today))%affirms.length;
      const affirm=affirms[idx];
      if(labelEl)labelEl.textContent='Today&apos;s affirmation';
      el.innerHTML='<span style="color:var(--tx)">'+affirm+'</span>';
    }else{
      if(labelEl)labelEl.textContent='Who you are becoming';
      el.innerHTML='<span class="id-empty">You already know the person you want to be. Name them \u2014 then we build the system to get you there.</span>';
    }
  }
}

function hashStr(s){
  let h=0;
  for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}
  return h;
}

function saveIdentity(){
  const v=document.getElementById('settings-identity');
  if(!v)return;
  const text=v.value.trim();
  if(!text){showToast('Empty','Write what you are becoming first.');return;}
  // Auto-prefix if user did not include
  const lower=text.toLowerCase();
  let full;
  if(lower.startsWith('i am becoming a person who')){
    full=text;
  }else if(lower.startsWith('who ')){
    full='I am becoming a person '+text;
  }else{
    full='I am becoming a person who '+text.replace(/^who /i,'');
  }
  ls('totry_identity',full);
  renderIdentity();
  showToast('Identity saved','This is who you are becoming.');
}
// Set/edit "who you're becoming" right where it's shown — no hunting through Settings. Used by the
// morning's identity line so its empty state invites and acts, instead of pointing elsewhere.
function editIdentity(){
  const cur = (ls('totry_identity')||'').replace(/^I am becoming a person who /i,'');
  if(typeof openFormModal!=='function'){ if(typeof go==='function') go('settings'); return; }
  openFormModal('Who you’re becoming','Finish the sentence. This is the person today is for — you can change it anytime.',[{id:'identity',label:'I am becoming a person who…',type:'text',placeholder:'keeps their promises, even to themselves',value:cur}],'Save',(vals)=>{
    const t=(vals.identity||'').trim(); if(!t) return 'Just name one thing.';
    const lower=t.toLowerCase();
    const full = lower.startsWith('i am becoming a person who') ? t : (lower.startsWith('who ') ? ('I am becoming a person '+t) : ('I am becoming a person who '+t.replace(/^who /i,'')));
    ls('totry_identity',full);
    if(typeof renderIdentity==='function') renderIdentity();
    if(typeof showMorningFocus==='function') showMorningFocus();
    if(typeof showToast==='function') showToast('Identity saved','This is who you are becoming.');
    return true;
  });
}

// ── SEASONS ───────────────────────────────────────────────────
const SEASONS={
  Fighting:{emoji:'&#x2694;&#xfe0f;',desc:'In the trenches. Daily battle with vices, urges, old patterns.'},
  Rebuilding:{emoji:'&#x1f527;',desc:'Coming back after a hard period. Picking up pieces and getting steady again.'},
  Building:{emoji:'&#x1f9f1;',desc:'Stable now. Stacking habits, growing, going from okay to great.'},
  Celebrating:{emoji:'&#x1f389;',desc:'Things are clicking. Wins are real. Keeping momentum.'},
  Grieving:{emoji:'&#x1f494;',desc:'Loss, heartbreak, or pain you are carrying. Survival mode is okay.'},
  Resting:{emoji:'&#x1f338;',desc:'Recovering. Not pushing. This is also part of becoming.'}
};


function renderSeasonSettings(){
  const container=document.getElementById('settings-seasons');
  if(!container)return;
  const current=ls('totry_season')||'Building';
  container.innerHTML='';
  Object.entries(SEASONS).forEach(([name,data])=>{
    const chip=document.createElement('div');
    chip.className='season-chip'+(name===current?' on':'');
    chip.innerHTML='<div class="sc-name">'+data.emoji+' '+name+'</div><div class="sc-desc">'+data.desc+'</div>';
    chip.onclick=()=>{
      ls('totry_season',name);
      renderSeasonSettings();
      showToast('Season set',name+' — the app will speak to you accordingly.');
    };
    container.appendChild(chip);
  });
}

// ── DAILY CHECK-IN ────────────────────────────────────────────
function maybeShowCheckin(){
  const today=new Date().toLocaleDateString('en-AU');
  const last=ls('totry_checkin_last');
  if(last===today)return;
  const skip=ls('totry_checkin_skip');
  if(skip===today)return;
  const strip=document.getElementById('daily-checkin');
  if(strip)strip.style.display='block';
}

function skipCheckin(){
  ls('totry_checkin_skip',new Date().toLocaleDateString('en-AU'));
  const strip=document.getElementById('daily-checkin');
  if(strip)strip.style.display='none';
}

function saveCheckin(){
  // Read from data attrs (new tap-to-pick UI)
  const phys = document.querySelector('.ci-dot-row[data-target="physical"]');
  const emot = document.querySelector('.ci-dot-row[data-target="emotional"]');
  const spir = document.querySelector('.ci-dot-row[data-target="spiritual"]');
  const p = parseInt(phys?.dataset.value || 0);
  const e = parseInt(emot?.dataset.value || 0);
  const s = parseInt(spir?.dataset.value || 0);
  if(!p || !e || !s){
    showToast('Quick tap','Pick a value for each before saving.');
    return;
  }
  haptic('success');
  const today=new Date().toLocaleDateString('en-AU');
  const prevCheckins = ls('totry_checkins') || [];
  const prevLast = ls('totry_checkin_last');
  const checkins=[...prevCheckins];
  checkins.unshift({date:today,ts:new Date().toISOString(),physical:p,emotional:e,spiritual:s,day:getDayCount()});
  ls('totry_checkins',checkins.slice(0,300)); // unified: was 90 here vs 300 elsewhere — the smaller cap deleted 210 check-ins
  ls('totry_checkin_last',today);
  const strip=document.getElementById('daily-checkin');
  if(strip)strip.style.display='none';
  // Show undo
  showUndo('Check-in saved', () => {
    ls('totry_checkins', prevCheckins);
    if(prevLast === null || prevLast === undefined) localStorage.removeItem('totry_checkin_last');
    else ls('totry_checkin_last', prevLast);
    if(strip)strip.style.display='block';
  });
}

// ── DUAL STREAKS ──────────────────────────────────────────────
// Sober streak — longest CURRENT clean streak across all vices.
// Each vice has its own clean count. The home-screen number reflects whichever
// vice you're doing best on right now — so relapsing on one doesn't erase
// progress on another. Per-vice detail lives in the Fight tab.
function getSoberStreak(){
  loadV();
  if(!vices||!vices.length){
    // No vices configured → count days since app start as best-effort.
    // CLAMPED AT THE SOURCE. If the device clock sits behind totry_start — a phone with the wrong
    // date, a restore from a device that was ahead, a flight across the date line — this went
    // negative and Home rendered "-27 · SOBER STREAK · Days clean": the app telling someone their
    // clean time is a debt. Every other elapsed-day count in this file is already clamped
    // (getDayCount, totalDaysTrying, viceCleanDays); this was the one that was not. An unparseable
    // date returns 0 too, so the card can never show NaN.
    const start=ls('totry_start');
    if(!start)return 0;
    const t=new Date(start).getTime();
    if(isNaN(t))return 0;
    return Math.max(0, Math.floor((Date.now()-t)/86400000));
  }
  // Return the longest CURRENT clean streak across all vices
  return Math.max(0, ...vices.map(v => viceCleanDays(v)));
}

function getResilienceStreak(){
  const start=ls('totry_start');
  if(!start)return 1;
  const today=new Date();today.setHours(0,0,0,0);
  let streak=0;let _graceUsed=false;
  for(let i=0;i<365;i++){
    const checkDate=new Date(today);
    checkDate.setDate(today.getDate()-i);
    const dateStr=checkDate.toLocaleDateString('en-AU');
    const hasActivity=
      (ls('totry_mornings')||[]).some(m=>new Date(m.ts).toLocaleDateString('en-AU')===dateStr)||
      (ls('totry_evenings')||[]).some(e=>new Date(e.ts).toLocaleDateString('en-AU')===dateStr)||
      (ls('totry_journal')||[]).some(j=>new Date(j.ts).toLocaleDateString('en-AU')===dateStr)||
      (ls('totry_workouts')||[]).some(w=>new Date(w.ts).toLocaleDateString('en-AU')===dateStr)||
      (ls('totry_checkins')||[]).some(c=>c.date===dateStr)||
      ls('totry_last_open')===dateStr;
    // NEVER MISS TWICE (Lally 2010): a single off day never breaks the chain, but two IN A ROW does.
    // The allowance resets on every day they showed up — so it forgives each isolated gap, not just
    // the first one in the whole history.
    if(hasActivity){ streak++; _graceUsed=false; }
    else if(i===0)continue;                              // today not logged yet — that's fine
    else if(!_graceUsed){ _graceUsed=true; continue; }   // one missed day: forgiven
    else break;                                          // two in a row: the stretch ends
  }
  return Math.max(streak,1);
}

function renderDualStreaks(){
  const sober=getSoberStreak();
  const resilience=getResilienceStreak();
  const sEl=document.getElementById('streak-sober');
  const rEl=document.getElementById('streak-resilience');
  if(sEl)sEl.textContent=sober;
  if(rEl)rEl.textContent=resilience;
  // The one number a slip can't take away: every time you came here and rode it out.
  try{
    const el=document.getElementById('urges-survived');
    if(el){
      const n=(ls('totry_moments_won')||[]).length;
      if(n>0){
        el.style.display='block';
        el.innerHTML='<span style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);letter-spacing:0.05em">'+
          '<b style="color:var(--go)">'+n+'</b> urge'+(n===1?'':'s')+' ridden out, all time — that’s skill, and nothing resets it</span>';
      } else { el.style.display='none'; el.innerHTML=''; }
    }
  }catch(_){}
  // Reframe the bare "0" after a relapse — a fresh start, not a scoreboard of shame.
  try{ const ss=document.querySelector('.streak-card.sober .streak-sub'); if(ss) ss.textContent=(sober===0?'A fresh start':'Days clean'); }catch(_){}
}

function showResilienceInfo(){
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-size:16px;font-weight:500;color:var(--bl);margin-bottom:10px">What is resilience streak?</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:14px">'+
    '<strong style="color:var(--tx)">Sober streak</strong> resets to zero if you relapse. That is honest.<br><br>'+
    '<strong style="color:var(--bl)">Resilience streak</strong> counts the days you showed up and tried, regardless of outcome — and it is built with grace: <strong>one missed day won’t break it</strong>. Miss two in a row and it starts again. One off day is being human, not failing.<br><br>'+
    'Both matter. The first measures sobriety. The second measures the person you are becoming. Relapse breaks the first. Giving up breaks the second.<br><br>'+
    'Being straight with you: because one off day is forgiven, this number isn’t a claim that you were perfect every single day — it’s the length of the stretch you’ve kept coming back in. (Sobriety stays strictly honest: a relapse does reset the sober count — but never your resilience, and never the total days you’ve been trying.) And real habits take about <strong>66 days</strong> to form, not 21 — so this is a long game, and you’re in it.<br><br>'+
    '<em style="color:var(--go);font-family:Cormorant Garamond,serif;font-size:15px">"I am not here because I made it. I am here because I am trying."</em>'+
    '</div>'+
    '<button class="btn primary" onclick="this.closest(\'.modal-bg\').remove()">Got it</button></div>';
  document.body.appendChild(m);
}

// ── PROMISE LOG ──────────────────────────────────────────────

function markPromise(id,status){
  const promises=ls('totry_promises')||[];
  const p=promises.find(p=>p.id===id);
  if(!p)return;
  p.status=status;
  p.resolvedAt=new Date().toISOString();
  ls('totry_promises',promises);
  renderPromises();
  if(status==='kept'){
    showToast('Promise kept','One more brick in who you are becoming.');
  }else{
    showToast('Honest','Acknowledging is the first step to keeping the next one.');
  }
}

function renderPromises(){
  const promises=ls('totry_promises')||[];
  const dueList=document.getElementById('promises-due');
  const list=document.getElementById('promises-list');
  if(!list||!dueList)return;
  const now=Date.now();
  const dueNow=promises.filter(p=>p.status==='pending'&&new Date(p.due).getTime()<=now);
  const pending=promises.filter(p=>p.status==='pending'&&new Date(p.due).getTime()>now);
  const resolved=promises.filter(p=>p.status!=='pending');

  // Due now
  if(dueNow.length){
    dueList.innerHTML='<div class="lbl" style="margin-bottom:6px;color:var(--go)">Time to check in</div>';
    dueNow.forEach(p=>{
      const card=document.createElement('div');
      card.className='promise-card pending';
      card.innerHTML='<div class="promise-text">"'+_escFew(p.text)+'"</div>'+
        '<div class="promise-meta">Made Day '+p.day+' · <span class="status">Did you keep this?</span></div>'+
        '<div class="promise-actions">'+
        '<button class="keep" onclick="markPromise('+p.id+',\'kept\')">Yes, I kept it</button>'+
        '<button class="break" onclick="markPromise('+p.id+',\'broken\')">No, I did not</button>'+
        '</div>';
      dueList.appendChild(card);
    });
  }else{
    dueList.innerHTML='';
  }

  // Active + history
  list.innerHTML='';
  if(pending.length){
    const hdr=document.createElement('div');
    hdr.className='lbl';
    hdr.textContent='Active promises';
    list.appendChild(hdr);
    pending.forEach(p=>{
      const dueDate=new Date(p.due).toLocaleDateString('en-AU',{day:'numeric',month:'short'});
      const card=document.createElement('div');
      card.className='promise-card pending';
      card.innerHTML='<div class="promise-text">"'+_escFew(p.text)+'"</div>'+
        '<div class="promise-meta">Made Day '+p.day+' · <span class="status">Due '+dueDate+'</span></div>';
      list.appendChild(card);
    });
  }
  if(resolved.length){
    const kept=resolved.filter(p=>p.status==='kept').length;
    const broken=resolved.filter(p=>p.status==='broken').length;
    const ratio=resolved.length>0?Math.round((kept/resolved.length)*100):0;
    const hdr=document.createElement('div');
    hdr.className='lbl';
    hdr.innerHTML='History · <span style="color:var(--gr);text-transform:none;letter-spacing:0">'+kept+' kept</span> · <span style="color:var(--re);text-transform:none;letter-spacing:0">'+broken+' broken</span> · '+ratio+'% kept';
    list.appendChild(hdr);
    resolved.slice(0,10).forEach(p=>{
      const card=document.createElement('div');
      card.className='promise-card '+p.status;
      card.innerHTML='<div class="promise-text">"'+_escFew(p.text)+'"</div>'+
        '<div class="promise-meta">Day '+p.day+' · <span class="status">'+p.status+'</span></div>';
      list.appendChild(card);
    });
  }
  if(!pending.length&&!resolved.length&&!dueNow.length){
    list.innerHTML='<p style="font-size:13px;color:var(--tx3);text-align:center;padding:20px">No promises logged yet.<br>The first one is always the hardest.</p>';
  }
}

// ── SABBATH MODE (Sundays only) ───────────────────────────────
function applySabbathMode(){
  const today=new Date();
  const isSunday=today.getDay()===0;
  const app=document.querySelector('.app');
  if(app)app.classList.toggle('sabbath-mode',isSunday);
}

// ── EXTEND setReflectTab for promises ─────────────────────────
// setReflectTab promises panel handled in main function above

// The "would they see" answer is now saved directly on the evening record (entry.see) inside
// completeEvening — synced, shown back in the journal, and fed to the brother's context. The old
// wrapper that siloed it in an unread, unsynced totry_honest_q store has been retired.

// ── HOOK INTO initSettingsTab for identity + seasons ──────────
if(typeof initSettingsTab==='function'){
  const _origInitSettings=initSettingsTab;
  window.initSettingsTab=function(){
    _origInitSettings();
    setTimeout(()=>{
      const id=ls('totry_identity')||'';
      const v=id.replace(/^i am becoming a person who /i,'');
      const idEl=document.getElementById('settings-identity');
      if(idEl)idEl.value=v;
      renderSeasonSettings();
    },60);
  };
}

// ── HOOK INTO buildCtx for coach awareness of identity + season ──
if(typeof buildCtx==='function'){
  const _origBuildCtx=buildCtx;
  window.buildCtx=function(){
    const baseCtx=_origBuildCtx();
    const identity=ls('totry_identity')||'';
    const season=ls('totry_season')||'Building';
    // Only the mood rows carry physical/emotional/spiritual — the morning sleep tap writes
  // {kind:'sleep', scores:{…}} into the same store, and taking [0] blindly made that the
  // person's "most recent state".
  const checkins=(ls('totry_checkins')||[]).filter(c => c && c.physical!=null);
    const recent=checkins[0];
    let extras='';
    if(identity)extras+='\nIDENTITY: '+identity;
    if(season&&SEASONS[season])extras+='\nSEASON: '+season+' — '+SEASONS[season].desc;
    if(recent)extras+='\nLAST CHECK-IN ('+recent.date+'): Physical '+recent.physical+'/10, Emotional '+recent.emotional+'/10, Spiritual '+recent.spiritual+'/10';
    return baseCtx+extras+'\nWhen relevant, reference their identity statement and adapt your tone to their current season. Someone in Grieving needs different words than someone in Celebrating.';
  };
}

// ── HOOK INTO go() to refresh home identity elements ─────────
if(typeof go==='function'){
  const _origGoForIdentity=go;
  window.go=function(name){
    _origGoForIdentity(name);
    if(name==='morning'){
      maybeShowCheckin();
    }
    if(name==='home'){
      renderIdentity();
      renderDualStreaks();
      applySabbathMode();
    }
  };
}

// ── HOOK INTO initApp ─────────────────────────────────────────
if(typeof initApp==='function'){
  const _origInitApp=initApp;
  // initApp is async. This used to call it WITHOUT awaiting, then immediately run the four renderers
  // below — so they read state the original had not finished assembling yet, and every caller that does
  // `await initApp()` was really only awaiting the wrapper. Await it, and keep the wrapper async so the
  // boot paths that await it still get a settled app.
  window.initApp=async function(){
    try{ await _origInitApp(); }catch(e){ console.warn('[initApp]', e); }
    try{ renderIdentity(); }catch(_){}
    try{ renderDualStreaks(); }catch(_){}
    try{ applySabbathMode(); }catch(_){}
    setTimeout(maybeShowCheckin,2000);
  };
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (e) => {
  const target = (e.state && e.state.tab) ? e.state.tab : 'home';
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('active'));
  const tab=document.getElementById('tab-'+target);
  if(tab)tab.classList.add('active');
  const navName = TABS.includes(target) ? target : (TAB_PARENT[target] || 'home');
  const navIdx = TABS.indexOf(navName);
  if(navIdx>=0)document.querySelectorAll('.nb')[navIdx]?.classList.add('active');
  if(typeof updateHubBackBar==='function') updateHubBackBar(target);
});

// Set initial history state to home
if(!history.state){
  try{ history.replaceState({tab:'home'}, '', '#home'); }catch(e){}
}


// ═══════════════════════════════════════════════════
// UNDO SYSTEM
// ═══════════════════════════════════════════════════
// Shows a snackbar for 5 seconds after a destructive/important action
// User can tap Undo to revert. Auto-dismisses after 5 sec.
let _undoTimer = null;
function showUndo(message, undoFn){
  // Remove any existing
  document.querySelector('.undo-snack')?.remove();
  if(_undoTimer) clearTimeout(_undoTimer);
  
  const snack = document.createElement('div');
  snack.className = 'undo-snack';
  snack.innerHTML = 
    '<span class="undo-msg">' + message + '</span>' +
    '<button class="undo-btn" id="_undo-btn">Undo</button>' +
    '<button class="undo-close" id="_undo-close" aria-label="Close">&#215;</button>';
  document.body.appendChild(snack);
  
  document.getElementById('_undo-btn').onclick = () => {
    try { undoFn(); } catch(e) { console.error(e); }
    snack.remove();
    if(_undoTimer) clearTimeout(_undoTimer);
    showToast('Undone','Reverted.');
  };
  document.getElementById('_undo-close').onclick = () => {
    snack.remove();
    if(_undoTimer) clearTimeout(_undoTimer);
  };
  
  _undoTimer = setTimeout(() => snack.remove(), 5000);
}

