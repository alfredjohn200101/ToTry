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
  // had done anything. This means "they made this list theirs": added one, or ticked one.
  // The old fallback — "any d[] slot is 1" — had the same flaw one step further in: autoTickHabits
  // ticks "No vice today" for a person who has merely NAMED something to fight, so on a brand-new
  // install the step was already ✓ before they had touched a habit at all. A checklist that
  // congratulates you for work you have not done teaches you to ignore it. Both real acts — adding
  // one (10-habits.js) and ticking one in the evening (23-evening.js) — now set the flag themselves.
  const hasHabits = !!ls('totry_habits_touched');
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
      const tap = s.done ? '' : ' onclick="' + s.action.replace(/"/g,'&quot;') + '"';
      return '<div' + tap + ' style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)' + (s.done ? '' : ';cursor:pointer') + '">' +
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
// checkWhatsPossible() and ackWhatsPossible() lived here — a complete one-time welcome tour, gated
// to the first two days and seen-flagged, that nothing ever called. The design went the other way
// deliberately: enterAsGuest says "Straight to the thing that helps — no home tour, no setup"
// (02-native.js), because the Feeling Door exists so someone in a hard moment gets help FIRST.
// A tour is exactly the friction that door removes. Deleted rather than wired, because leaving it
// implies the question is still open. WHATS_POSSIBLE went with it (00-boot.js).

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
