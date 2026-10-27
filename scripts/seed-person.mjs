// ONE realistic person, written in the shapes the app's OWN ls('key', …) write sites use.
//
// This lived inside scripts/ios-shot.mjs until 16 Sep 2026, when a second consumer appeared: the
// simulator harness, which needs the same person inside WebKit rather than Chromium. Copying the
// literal into it would have re-run this repo's most expensive mistake — a seed that matches the
// reader instead of the writer renders empty states, and a REVIEW of empty states reads exactly like
// a review of the app. One source, two consumers, no drift.
//
// It is returned as SOURCE TEXT because the two consumers need it in different forms: Playwright
// evaluates it in the page, and the harness inlines it in a <script> before the app boots.
export function seedSource() {
  return `(() => {
    const ago = d => new Date(Date.now() - d * 864e5).toISOString();
    const today = new Date().toISOString().slice(0, 10);
    // saveTransaction writes its display date with toLocaleDateString('en-AU'), and the month list prints
    // that field verbatim — seeding an ISO string made every row read "2026-09-16".
    const auDay = d => new Date(Date.now() - d * 864e5).toLocaleDateString('en-AU');
    // The food diary is keyed and shaped by nutDayKey() + the five addFoodToLog/quickAddLog write
    // sites, NOT by ISO dates: "16/09/2026", and every row carries name/pro/carb/fat/meal, not
    // n/p/c/f. Seeded the ISO way this key read back as a day with nothing in it, so Nourish
    // rendered "0 eaten", an empty plate and the first-run "Let's start simple" card — a review of
    // this screen was a review of its empty state. Match the WRITER; see CLAUDE.md on seeds.
    // BUILT FROM DATE PARTS, like dayKeyOf() itself — not from the formatter. toLocaleDateString
    // pads in Chromium and not in WebKit, and this seed has two consumers, one per engine: a seed
    // spelled the Chromium way renders an empty screen on the simulator. dayKeyOf() is not called
    // directly because one consumer inlines this BEFORE the app boots, so the function may not exist
    // yet; the rule it implements is two lines.
    const _p2 = n => String(n).padStart(2, '0');
    const _dk = d => _p2(d.getDate()) + '/' + _p2(d.getMonth() + 1) + '/' + d.getFullYear();
    const dayKey = _dk(new Date());
    const _dkAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return _dk(d); };
    // URGE ENTRIES IN THE SHAPES THE APP ITSELF WRITES, not a third one invented here. 04-fight.js
    // pushes a bare ISO string and 09-fight-deep.js pushes {ts, won}; the seed used {t, won}, which
    // no live writer produces. Alternating both real shapes means a reader that handles only one of
    // them shows up as a missing day instead of passing.
    const _urge = n => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(22, 10, 0, 0);
      return n % 2 ? d.toISOString() : { ts: d.toISOString(), won: true }; };
    const a = [ago(9), ago(160), ago(30), ago(14)];
    const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    S('totry_onboarded', true); S('totry_name', 'Alfred'); S('totry_sex', 'male'); S('totry_faith_tradition', 'christianity');
    S('totry_identity', 'A man who is present, steady, and keeps his word.'); S('totry_why', 'So my kids get the version of me that shows up.');
    S('totry_journey_start', a[1]);
    // THE DEMO SEED'S LEAD VICE IS THE ONE THAT RENDERS LARGE IN THE STORE SCREENSHOT.
    // 03-fight.png showed PORN as the lead card's eyebrow label. App Store Review guideline 2.3.8
    // requires screenshots to meet a 4+ rating even when the app is rated higher, because
    // screenshots are browsable by anyone. This is DEMO DATA, not product copy: the app still ships
    // the porn vice type, the description still speaks honestly, and nothing about what the app is
    // for has changed. Nothing in the gate reads this name -- panels, personas and core.test.js each
    // define their own inline fixtures, and core.test.js's only assertion about this file is about
    // the totry_trackers day key.
    // AND NO BACKTICKS IN HERE. THIS WHOLE BODY IS A TEMPLATE LITERAL returned by seedSource(), so a
    // backtick in a comment TERMINATES it and the rest of the file parses as code. The first version
    // of this comment quoted the filename in backticks and broke the seed with "Unexpected number".
    // npm test did NOT catch it: core.test.js reads this file as TEXT for regex assertions and never
    // imports it, so a syntax error here passes the gate. Parse-check by importing it.
    // (I then wrote the warning itself with backticks in it and broke the file a SECOND time.)
    S('totry_v', [{ n: 'The old habit', type: 'general', mode: 'quit', startDate: a[0], fightingSince: a[1], cleanDaysTotal: 47, relapseCount: 6, w: 9, total: 12, urgelog: [_urge(5), _urge(2)], t: 'late nights alone', lastConfirm: new Date().toISOString() },
                  { n: 'Doomscroll', type: 'general', mode: 'quit', startDate: a[2], fightingSince: a[1], cleanDaysTotal: 22, relapseCount: 3, w: 5, total: 7, urgelog: [_urge(3)], lastConfirm: new Date().toISOString() },
                  // THE MONEY HERO READ "$0 / Set weekly vice spend below" IN THE STORE SCREENSHOT,
                  // on the one card the listing copy sells as "every dollar reclaimed from a habit
                  // you dropped". totalReclaimed() sums viceMoneySaved(), which returns 0 for any
                  // vice with no costAmount — and neither seeded fight had one. costAmount/costPer
                  // is the pair viceSpendPicture actually reads (09-fight-deep.js:2204).
                  { n: 'Vape', type: 'substance', mode: 'quit', startDate: a[0], fightingSince: a[1],
                    cleanDaysTotal: 31, relapseCount: 2, w: 7, total: 9, urgelog: [],
                    costAmount: 38, costPer: 'week', t: 'the drive home',
                    lastConfirm: new Date().toISOString() }]);
    S('totry_body', [{ date: '14 Sep', ts: new Date().toISOString(), weight: 84.2 }, { date: '31 Aug', ts: a[3], weight: 86.1 }, { date: '17 Aug', ts: a[2], weight: 87.9 }]);
    S('totry_h', [{ n: 'Morning ritual done', d: [1, 1, 0, 1, 1, 1, 0] }, { n: 'No vice today', d: [1, 0, 1, 1, 0, 1, 1] }, { n: 'Daily prayer', d: [1, 1, 1, 1, 1, 1, 1] }, { n: 'Gym session', d: [0, 1, 0, 1, 0, 1, 0] }]);
    // MONEY, IN THE SHAPES THE MONEY SCREENS ACTUALLY WRITE (16 Sep 2026). The four lines below used to
    // read {n, amt, day} — a vocabulary no write site in this app has ever produced. saveSubscription
    // writes {id,name,amount,period}, saveBill writes {id,name,amount,due,paid}, saveTransaction writes
    // {id,type,amount,category,ts}. So the Money tab rendered a subscription row with NO NAME and the
    // price "$ / month", and a bill reading "$520.00 · null days" — and any visual review of that screen
    // was a review of the seed. Dates are the ISO strings an <input type="date"> yields.
    const iso = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
    S('totry_f', { d: [{ n: 'Car loan', t: 8200, p: 2400, due: iso(43), interest: 9.5 }, { n: 'Visa', t: 1450, p: 900, due: iso(11), interest: 19.9 }], u: 0, i: 0 });
    // monthlyPaymentRate() needs dated history over a real month before it will name a debt-free date.
    S('totry_payments', [180, 150, 120, 90, 60, 30, 2].map((d, i) => ({ amt: i % 2 ? 260 : 420, ts: ago(d), date: ago(d), debt: i % 2 ? 'Visa' : 'Car loan' })));
    S('totry_bills', [{ id: 7001, name: 'Car rego', amount: 892, due: iso(5), paid: false }, { id: 7002, name: 'Power', amount: 196.4, due: iso(19), paid: false }]);
    S('totry_subscriptions', [{ id: 7101, name: 'Spotify', amount: 13.99, period: 'monthly', note: 'Family plan', addedAt: a[2] },
                              { id: 7102, name: 'Gym', amount: 72, period: 'monthly', note: '', addedAt: a[1] },
                              { id: 7103, name: 'Cloud storage', amount: 149, period: 'annual', note: '', addedAt: a[1] }]);
    S('totry_transactions', [{ id: 7201, type: 'expense', amount: 88.4, category: 'Food', note: 'Groceries', ts: ago(1), date: auDay(1) },
                             { id: 7202, type: 'income', amount: 1900, category: 'Salary', note: 'Pay', ts: ago(2), date: auDay(2) },
                             { id: 7203, type: 'expense', amount: 42, category: 'Transport', note: 'Fuel', ts: ago(4), date: auDay(4) },
                             { id: 7204, type: 'expense', amount: 61.5, category: 'Entertainment', note: 'Dinner out', ts: ago(6), date: auDay(6) },
                             { id: 7205, type: 'expense', amount: 520, category: 'Rent/bills', note: 'Rent', ts: ago(8), date: auDay(8) },
                             { id: 7206, type: 'income', amount: 1900, category: 'Salary', note: 'Pay', ts: ago(16), date: auDay(16) }]);
    S('totry_budgets', { Food: 600, 'Rent/bills': 900, Entertainment: 120 });
    S('totry_assets', [{ id: 7301, name: 'Savings account', value: 4200, addedAt: a[1], updatedAt: a[2] }, { id: 7302, name: 'Car', value: 11500, addedAt: a[1], updatedAt: a[2] }]);
    S('totry_finance_goals', [{ id: 7401, name: 'Emergency fund', target: 5000, current: 1850, created: a[1], priority: 1 }]);
    // addPrayer() writes {id,text,category,status,createdAt,answeredAt,answerNote}. This line was
    // {t, at, answered} — no write site has ever produced that — so the prayer list filtered on a
    // status nothing carried and rendered its EMPTY state, and "All" threw on p.text.replace.
    S('totry_prayers', [{ id: 7501, text: 'For Dad’s health', category: 'Family', status: 'open', createdAt: a[2], answeredAt: null, answerNote: '' },
                        { id: 7502, text: 'Patience with the kids', category: '', status: 'answered', createdAt: a[1], answeredAt: a[3], answerNote: 'A calmer fortnight than I have had in months.' }]);
    // The Word's shelf (saveVerseFromReader), the sacraments (logConfession/logMass) and a plan in
    // progress (_planDone). Without them Saved, Sacraments and the Soul plans row were empty states.
    S('totry_sv', [{ verse: 'Come to me, all who labor and are heavy laden, and I will give you rest.', reference: 'Matthew 11:28', date: '2 Sep' }]);
    S('totry_confessions', [{ id: 7601, date: a[2] }]);
    S('totry_masses', [{ id: 7701, date: ago(4), eucharist: true }, { id: 7702, date: ago(11), eucharist: false }]);
    S('totry_read_plans', { pull: { d: 2, tr: 'christianity', ts: a[3], done: false } });
    S('totry_journal', [{ ts: a[2], text: 'Held the line tonight. It wanted me tired.' }]);
    // THE DEMO PERSON HAD TRAINED ONCE, THIRTY DAYS AGO, AND NEVER CLOSED A DAY. One workout at
    // a[2] means getLifeState's train7 filter (03-person.js:541) returns ZERO, so sessions7 is 0
    // and the GROW handoff row — "3 sessions, about 1,260 cal earned → fuel it" — renders EMPTY and
    // un-classed in every screenshot, craft audit, orb audit and density audit, because all six
    // visual instruments share this one seed. Worse, everActive = (evenings.length +
    // workouts.length) >= 5 (03-person.js:781) was FALSE: the app classified its own demo person
    // as somebody who has never been active, and a review of that is a review of an empty state.
    // SHAPES COPIED FROM THE WRITERS, never invented — saveWorkoutSession (22-train-deep.js),
    // completeEvening (23-evening.js) and the morning write (03-person.js). This file has already
    // been burned once by seeding a vocabulary no write site produces.
    const _au = d => d.toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' });
    const _dAgo = n => new Date(Date.now() - n * 864e5);
    const _wk = (n, focus, exs, sets, vol, mins) => ({
      id: Date.now() - n * 864e5, source: 'manual', ts: _dAgo(n).toISOString(),
      date: _dAgo(n).toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short', year:'numeric' }),
      day: 160 - n, exercises: exs, completedSets: sets, totalSets: sets, volume: vol,
      durationMin: mins, splitFocus: focus
    });
    S('totry_workouts', [
      _wk(1, 'Push',  [{ name:'Bench Press', sets:[{weight:80,reps:6,done:true},{weight:80,reps:6,done:true},{weight:82.5,reps:5,done:true}] }], 12, 5940, 58),
      _wk(3, 'Pull',  [{ name:'Barbell Row', sets:[{weight:70,reps:8,done:true},{weight:70,reps:8,done:true}] }], 11, 5320, 52),
      _wk(5, 'Legs',  [{ name:'Back Squat',  sets:[{weight:100,reps:5,done:true},{weight:100,reps:5,done:true}] }], 13, 7100, 64),
      _wk(30,'Push',  [{ name:'Bench Press', sets:[{weight:77.5,reps:6,done:true}] }], 9, 4180, 49)
    ]);
    // Four closed days in the last week, so the rituals read as lived-in and everActive is true.
    S('totry_evenings', [1,2,4,6].map(n => ({
      date: _au(_dAgo(n)), day: 160 - n, rating: n === 1 ? 4 : 3,
      win: ['Trained before work', 'Said no at 11pm', 'Called Dad back', 'Walked instead of scrolling'][[1,2,4,6].indexOf(n)],
      release: ['The thing at work I cannot fix', 'Comparing my week to his', 'Being short with the kids', 'Yesterday'][[1,2,4,6].indexOf(n)],
      see: '', flagged: false, tasks: [], steps: null, rings: null, goalsHit: null,
      ts: _dAgo(n).toISOString()
    })));
    S('totry_mornings', [1,3,5].map(n => ({
      date: _au(_dAgo(n)), day: 160 - n,
      gratitude: ['A quiet house before six', 'My wife made coffee', 'The rain stopped for the walk'][[1,3,5].indexOf(n)],
      intention: ['Be where my feet are', 'One hard thing first', 'Patience with the eldest'][[1,3,5].indexOf(n)],
      flagged: false, ts: _dAgo(n).toISOString()
    })));
    const H = (h, m) => { const d = new Date(); d.setHours(h, m || 0, 0, 0); return d.toISOString(); };
    // THE STAMP HAS TO AGREE WITH THE KEY IT IS FILED UNDER. H() always builds TODAY, so using it
    // for an earlier day's entries files food under 22/10 carrying a ts that says 24/10 — and this
    // repo's live readers resolve the day from e.ts first and e.date only as a fallback, so every
    // one of those
    // entries would have counted as eaten TODAY. Three days of food would have read as one enormous
    // one, and the seeded person's whole Nourish front with it.
    const HAgo = (n, h, m) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, m || 0, 0, 0); return d.toISOString(); };
    S('totry_nutlog', { [dayKey]: [
      { id: 1, ts: H(7, 20), name: 'Oats & whey', brand: '', serving: '80g oats + 1 scoop', qty: 1, cal: 520, pro: 38, carb: 62, fat: 11, meal: 'breakfast', source: 'Common' },
      { id: 2, ts: H(8, 5), name: 'Flat white', brand: '', serving: 'Regular', qty: 1, cal: 120, pro: 7, carb: 10, fat: 6, meal: 'breakfast', source: 'Common' },
      { id: 3, ts: H(12, 40), name: 'Chicken & rice', brand: '', serving: '200g chicken, 1 cup rice', qty: 1, cal: 730, pro: 52, carb: 81, fat: 14, meal: 'lunch', source: 'USDA' },
      { id: 4, ts: H(15, 30), name: 'Banana', brand: '', serving: '1 medium', qty: 1, cal: 105, pro: 1, carb: 27, fat: 0, meal: 'snack', source: 'Common' }
    ],
      // TWO EARLIER DAYS, AND THEY ARE NOT DECORATION. renderNutTrend() sets its card to
      // display:none unless food is logged on 2+ of the last 14 days. With one seeded day the
      // nutrition trend chart was display:none in EVERY craft-audit run, every panels walk and
      // every screenshot — so "0 text runs under 13px, 0 in DM Mono" over ten screens was measured
      // over a card nothing could see, while four of its labels sat at 8px in a face this app
      // stopped shipping. Measured both ways before this changed: hidden on the one-day seed,
      // visible with two. This is the recorded rule that coverage is bounded by the seed, not by
      // the assertion count. Different totals per day on purpose, so the bars have a shape and a
      // flat-render bug would show.
      [_dkAgo(1)]: [
        { id: 11, ts: HAgo(1, 7, 30), name: 'Oats & whey', brand: '', serving: '80g oats + 1 scoop', qty: 1, cal: 520, pro: 38, carb: 62, fat: 11, meal: 'breakfast', source: 'Common' },
        { id: 12, ts: HAgo(1, 13, 0), name: 'Beef & potatoes', brand: '', serving: '200g beef, 300g potato', qty: 1, cal: 780, pro: 55, carb: 70, fat: 24, meal: 'lunch', source: 'USDA' },
        { id: 13, ts: HAgo(1, 19, 10), name: 'Salmon & greens', brand: '', serving: '180g salmon', qty: 1, cal: 610, pro: 44, carb: 12, fat: 38, meal: 'dinner', source: 'USDA' }
      ],
      [_dkAgo(2)]: [
        { id: 21, ts: HAgo(2, 8, 0), name: 'Eggs on toast', brand: '', serving: '3 eggs, 2 slices', qty: 1, cal: 470, pro: 28, carb: 38, fat: 22, meal: 'breakfast', source: 'Common' },
        { id: 22, ts: HAgo(2, 12, 50), name: 'Chicken & rice', brand: '', serving: '200g chicken, 1 cup rice', qty: 1, cal: 730, pro: 52, carb: 81, fat: 14, meal: 'lunch', source: 'USDA' },
        { id: 23, ts: HAgo(2, 18, 40), name: 'Stir fry & noodles', brand: '', serving: '1 bowl', qty: 1, cal: 690, pro: 34, carb: 88, fat: 20, meal: 'dinner', source: 'Common' }
      ]
    });
    // dayKey, NOT today. (No backticks in this comment: the whole seed is ONE template literal, so a
    // backtick here ends it and the file stops parsing — which is exactly what happened.)
    // 'today' is an ISO slice ("2026-09-29"); every writer and reader of this
    // store uses dayKeyOf() ("29/09/2026"), and dayKeyNorm deliberately refuses a bare ISO string so
    // migrateDayKeys does not fold it either. The seeded key was simply never read: getLifeState()
    // .sleep came back entirely null, so lifeStateBrief — the text every AI surface reads — carried
    // no sleep signal, and every screenshot and craft audit this repo has taken was of a person with
    // no sleep data. An invented key renders an empty screen, which is the rule this file's own
    // header states about itself.
    S('totry_trackers', { [dayKey]: { sleep: 7.5, water: 6, steps: 9200 } });
    // A week, in the shape _saveEventFromModal() writes one. Without it every review of the Calendar
    // was a review of its empty state — which is how a whole screen goes unlooked-at for a year.
    S('totry_cal_events', [
      { id: 7001, title: 'Work', type: 'work', day: 0, start: '09:00', end: '17:00', recurring: true, weekStamp: null },
      { id: 7002, title: 'Gym — push', type: 'gym', day: 0, start: '18:00', end: '19:15', recurring: true, weekStamp: null },
      { id: 7003, title: 'Work', type: 'work', day: 1, start: '09:00', end: '17:00', recurring: true, weekStamp: null },
      { id: 7004, title: 'Work', type: 'work', day: 2, start: '09:00', end: '17:00', recurring: true, weekStamp: null },
      { id: 7005, title: 'Gym — pull', type: 'gym', day: 2, start: '18:00', end: '19:15', recurring: true, weekStamp: null },
      { id: 7006, title: 'Night class', type: 'class', day: 3, start: '18:30', end: '21:00', recurring: true, weekStamp: null },
      { id: 7007, title: 'Work', type: 'work', day: 4, start: '09:00', end: '17:00', recurring: true, weekStamp: null },
      { id: 7008, title: 'Mass', type: 'personal', day: 6, start: '09:30', end: '10:30', recurring: true, weekStamp: null }
    ]);
  })()`;
}
