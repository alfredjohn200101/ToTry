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
    const a = [ago(9), ago(160), ago(30), ago(14)];
    const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    S('totry_onboarded', true); S('totry_name', 'Alfred'); S('totry_sex', 'male'); S('totry_faith_tradition', 'christianity');
    S('totry_identity', 'A man who is present, steady, and keeps his word.'); S('totry_why', 'So my kids get the version of me that shows up.');
    S('totry_journey_start', a[1]);
    S('totry_v', [{ n: 'Porn', type: 'general', mode: 'quit', startDate: a[0], fightingSince: a[1], cleanDaysTotal: 47, relapseCount: 6, w: 9, total: 12, urgelog: [{ t: a[2], won: true }], t: 'late nights alone', lastConfirm: new Date().toISOString() },
                  { n: 'Doomscroll', type: 'general', mode: 'quit', startDate: a[2], fightingSince: a[1], cleanDaysTotal: 22, relapseCount: 3, w: 5, total: 7, urgelog: [], lastConfirm: new Date().toISOString() }]);
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
    S('totry_prayers', [{ t: 'For Dad’s health', at: a[2], answered: false }, { t: 'Patience with the kids', at: a[2], answered: true }]);
    S('totry_journal', [{ ts: a[2], text: 'Held the line tonight. It wanted me tired.' }]);
    S('totry_workouts', [{ ts: a[2], kind: 'strength', name: 'Push', sets: [{ ex: 'Bench Press', w: 80, r: 6 }] }]);
    S('totry_nutlog', { [today]: [{ n: 'Oats & whey', cal: 520, p: 38, c: 62, f: 11 }, { n: 'Chicken rice', cal: 730, p: 52, c: 81, f: 14 }] });
    S('totry_trackers', { [today]: { sleep: 7.5, water: 6 } });
  })()`;
}
