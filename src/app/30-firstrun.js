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
  // ...and the same for the tour prompt, which is the OTHER onboarding card. The guard above only
  // knew about the checklist, so dismissing that left the 60-day preview banner and the welcome
  // tour on Home together — two cards, 142px and 152px, both introducing the app, stacked.
  const tourActive = document.getElementById('home-tour-prompt')?.style.display === 'block';
  if(day <= 7 && !dismissed && !firstRunActive && !tourActive){
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
      // The tick was a text glyph at 17px/700 in hardcoded black on the green disc; it is the app's
      // own check icon now, in the ink that belongs on a filled tint, and the empty ring is a
      // hairline rather than a 2px border.
      const check = s.done
        ? '<div style="width:22px;height:22px;border-radius:50%;background:var(--gr);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--on-tint)">'+svgIcon('check',13)+'</div>'
        : '<div style="width:22px;height:22px;border-radius:50%;border:1.5px solid var(--bd2);flex-shrink:0"></div>';
      const textStyle = s.done ? 'color:var(--tx3);text-decoration:line-through' : 'color:var(--tx)';
      // A DIV WITH AN ONCLICK IS NOT A BUTTON. These four rows are the app's own "four quick things
      // to start" — the first thing a new person is offered — and a keyboard or Full Keyboard Access
      // user could not reach any of them: no role, no tabindex, no key handler. Give them the three
      // things that make a div behave like the button it already looks like.
      const tap = s.done ? '' :
        ' role="button" tabindex="0"' +
        ' onclick="' + s.action.replace(/"/g,'&quot;') + '"' +
        ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.click();}"';
      return '<div' + tap + ' style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:.5px solid var(--bd)' + (s.done ? '' : ';cursor:pointer') + '">' +
        check +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:17px;letter-spacing:-0.006em;' + textStyle + '">' + s.label + '</div>' +
          (s.done ? '' : '<div style="font-size:13px;color:var(--tx2);margin-top:1px;line-height:1.38">' + s.desc + '</div>') +
        '</div>' +
        (s.done ? '' : '<span class="ios-row-chevron">'+svgIcon('chevronright',14)+'</span>') +
      '</div>';
    }).join('');
  }
  const prog = document.getElementById('firstrun-progress');
  // It was typed in capitals and printed at 11px, centred — caps as a decoration rather than a role.
  if(prog) prog.textContent = doneCount + ' of ' + steps.length + ' done';
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
  // A sheet title and a list, the way iOS says what changed. It was an 11px tint caps label over a
  // New York ITALIC title, and each item a 15px secondary line behind a hand-typed "›" in the tint.
  // CHANGELOG entries are app-authored constants, as before.
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3>' + entry.title + '</h3>' +
    '<div class="modal-sub">Just updated to ' + APP_VERSION + '</div>' +
    '<div class="ios-section fr-sheet-list"><div class="ios-list wrap">' +
      entry.items.map(it =>
        '<div class="ios-row"><span class="ios-row-body"><span class="ios-row-title">' + it + '</span></span></div>'
      ).join('') +
    '</div></div>' +
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

  // Build a "Day 60 in the life of a user" preview — all illustrative, never saved.
  // REBUILT FROM THE COMPONENTS (17 Sep 2026). Seven hand-painted panels, each opening with an 11px
  // capital label tracked at 0.01em, three in the third grey and two in purple; the identity and the
  // coach's line in New York ITALIC; the day count in a tinted panel with a purple border written as an
  // rgba literal; the nutrition figures in four colours, one of them a hex no theme could reach; and
  // the heatmap in a gold that is the brand's signature, not a measure of anything. It is the same
  // sample, said the way the real screens now say it: section headers, cards, stat tiles and rows.
  // Every string here is an app-authored constant, so the markup is as trusted as it was.
  const cur = curSym();
  const row = (title, value, tone) =>
    '<div class="ios-row"><span class="ios-row-body"><span class="ios-row-title">' + title + '</span></span>' +
    '<span class="ios-row-value' + (tone ? ' ' + tone : '') + '">' + value + '</span></div>';
  const irow = (icon, tone, title, sub) =>
    '<div class="ios-row has-icon"><span class="ios-row-icon tone-' + tone + '">' + svgIcon(icon, 18) + '</span>' +
    '<span class="ios-row-body"><span class="ios-row-title">' + title + '</span><span class="ios-row-sub">' + sub + '</span></span></div>';
  const stat = (label, value, unit) =>
    '<div class="ios-stat"><div class="ios-stat-label">' + label + '</div><div class="ios-stat-value">' + value +
    (unit ? '<span class="ios-stat-unit">' + unit + '</span>' : '') + '</div></div>';
  const heat = Array.from({length:13*7}, () => '<i class="l' + Math.floor(Math.random()*5) + '"></i>').join('');

  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<h3>What Day 60 looks like</h3>' +
    '<div class="modal-sub">This is a sample of what your app will look like once you’ve been logging for 2 months. None of this is real — it’s just so you can see what you’re building toward.</div>' +
    '<div class="fr-preview">' +

      '<div class="ios-section"><div class="ios-header">Who you are becoming</div>' +
        '<div class="card"><div class="card-say">Disciplined, present, faithful, strong</div>' +
        '<div class="card-foot">Day 60 · 38 days clean from weed</div></div></div>' +

      '<div class="ios-section"><div class="ios-header">Your coach says</div>' +
        '<div class="card"><div class="card-body">Yesterday you trained legs hard and journaled about feeling tired. Today: lighter session, double protein, sleep 8h. Phil 4:13.</div></div></div>' +

      '<div class="ios-section"><div class="ios-header">Show-up heatmap</div>' +
        '<div class="card"><div class="fr-heat" aria-hidden="true">' + heat + '</div>' +
        '<div class="card-foot">Showed up 87% of days</div></div></div>' +

      '<div class="ios-section"><div class="ios-header">Weekly muscle volume</div><div class="ios-list">' +
        row('Chest', '18.4k kg · 2d ago') + row('Back', '22.1k kg · today') +
        row('Legs', '31.8k kg · 1d ago') + row('Shoulders', '8.2k kg · 3d ago') +
      '</div></div>' +

      '<div class="ios-section"><div class="ios-header">Today’s nutrition</div><div class="ios-stats">' +
        stat('Calories', '2,104') + stat('Protein', '178', 'g') + stat('Fibre', '31', 'g') + stat('Vitamin C', '93', '%') +
      '</div></div>' +

      '<div class="ios-section"><div class="ios-header">Patterns from your fights</div><div class="ios-list">' +
        irow('target', 'orange', 'Top trigger: “boredom”', '6 times · 67% won') +
        irow('calendar', 'red', 'Hardest day: Fridays', '8 fights · 50% won') +
        irow('clock', 'indigo', 'Peak: late night', '9 fights · 78% won') +
      '</div></div>' +

      '<div class="ios-section"><div class="ios-header">Money</div><div class="ios-list">' +
        row('Debt remaining', cur + '6,840', 'bad') + row('Saved from vices', '+' + cur + '432', 'good') +
        row('USA trip fund', cur + '1,840 of ' + cur + '8,000') +
      '</div></div>' +

      '<div class="fr-preview-close">Your version of this fills in one log at a time. Start with one thing today.</div>' +
    '</div>' +
    '<button class="btn primary" onclick="dismissPreviewBanner();closeModal(this)">Start my Day 1</button>' +
    '<button class="btn quiet" onclick="closeModal(this)">Close preview</button>' +
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
