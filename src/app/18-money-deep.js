
// ── THE LIFE BALANCE SHEET ───────────────────────────────────────────────────────────────────
// Importing transactions only ever stored them, and storage isn't counsel. Everything below reads
// the ledger and says the thing a person can act on: where the money actually goes, the one place
// to lock in, and — the part no single-purpose money app can do — whether the spending matches
// what's claimed over in the Fight. Cash is invisible to a bank export; that gets said plainly
// rather than pretended away.

// A transaction's identity, so re-uploading an overlapping statement can't double-count. Same day,
// same payee, same cents, same direction = the same event, whatever order the rows arrive in.
function _txFingerprint(t){
  const d = new Date(t.ts);
  const day = isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10);
  const desc = String(t.note || t.desc || '').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,24);
  return day+'|'+desc+'|'+Math.round((t.amount||0)*100)+'|'+(t.type||'');
}
function _existingFingerprints(){
  const set = new Set();
  (ls('totry_transactions')||[]).forEach(t => set.add(_txFingerprint(t)));
  return set;
}

// Merchants that give a vice away. Gambling is the one that leaves a perfect paper trail — which
// is why a bank export can tell someone the true number they've been avoiding.
const VICE_MERCHANTS = {
  gambling: ['sportsbet','ladbrokes','bet365','pointsbet','neds','betfair','tabcorp','tab ','crownbet','unibet','betr ','dabble','casino','pokies','keno','lottery','lotto','tatts','sportingbet','picklebet'],
  tobacco:  ['tobacco','tobacconist','smokemart','smoke mart','cigarette','ciggie','vape','shisha'],
  alcohol:  ['liquor','bws','dan murphy','liquorland','bottle shop','bottleshop','first choice liq','cellarbrations','sip n save','thirsty camel'],
};
function _viceKindFor(v){
  const n = String((v && v.n) || v || '').toLowerCase();
  if(/gambl|bet|punt|pokie|casino/.test(n)) return 'gambling';
  if(/smok|cig|tobac|nicotine|vape/.test(n)) return 'tobacco';
  if(/drink|alcohol|booze|beer|wine/.test(n)) return 'alcohol';
  return null;
}
// What the bank says a vice actually cost, over a window. Returns null when there's nothing to go on.
function viceSpendFromBank(kind, sinceTs){
  const kws = VICE_MERCHANTS[kind]; if(!kws) return null;
  const list = (ls('totry_transactions')||[]).filter(t => t.type==='expense');
  if(!list.length) return null;
  const hits = list.filter(t => {
    if(sinceTs && new Date(t.ts).getTime() < sinceTs) return false;
    const d = String(t.note||'').toLowerCase();
    return kws.some(k => d.includes(k));
  });
  if(!hits.length) return { total:0, count:0, hits:[] };
  return {
    total: hits.reduce((s,t)=>s+(t.amount||0),0),
    count: hits.length,
    hits: hits.slice(0,6),
    firstTs: Math.min(...hits.map(t=>new Date(t.ts).getTime())),
  };
}

// Categories a person can actually move, and can name. Rent and power aren't a discipline problem;
// "Other" isn't advice you can act on; and vices are confronted by the ledger below, not softened
// into a "lock in here" nudge. What's left is honest, movable, and specific.
const _DISCRETIONARY = ['Eating out','Shopping','Subscriptions','Entertainment'];

// The whole picture, normalised to a month so any length of statement reads the same.
function spendingRead(){
  const list = ls('totry_transactions')||[];
  if(list.length < 5) return null;
  const times = list.map(t=>new Date(t.ts).getTime()).filter(t=>!isNaN(t));
  if(!times.length) return null;
  const spanDays = Math.max(1, (Math.max(...times) - Math.min(...times))/86400000);
  const months = Math.max(0.5, spanDays/30.44);
  // A monthly figure from six days of data is a guess wearing a number's clothes. Callers get the real
  // span so they can withhold the /mo line until there is a month behind it — see enoughForMonthly.
  const enoughForMonthly = spanDays >= 21;
  const exp = list.filter(t=>t.type==='expense');
  const inc = list.filter(t=>t.type==='income');
  const spend = exp.reduce((s,t)=>s+(t.amount||0),0);
  const income = inc.reduce((s,t)=>s+(t.amount||0),0);
  // Income is PERIODIC — see the note above. Normalise it by its own covered span, not the raw
  // transaction span, or a salary at each end of a one-month export reads as two months' pay.
  const incTimes = inc.map(t=>new Date(t.ts).getTime()).filter(t=>!isNaN(t)).sort((a,b)=>a-b);
  let incomeMonths = months;
  if(incTimes.length >= 2){
    const incSpan = (incTimes[incTimes.length-1] - incTimes[0])/86400000;
    const n = incTimes.length;
    incomeMonths = Math.max(0.5, (incSpan * (n/(n-1)))/30.44);
  } else if(incTimes.length === 1){
    incomeMonths = 1;                          // one deposit is one month's pay, not a fraction of one
  }
  const byCat = {};
  exp.forEach(t => { const c=t.category||'Other'; byCat[c]=(byCat[c]||0)+(t.amount||0); });
  const cats = Object.keys(byCat).map(c=>({
    name:c, total:byCat[c], perMonth:byCat[c]/months, share: spend>0 ? byCat[c]/spend : 0
  })).sort((a,b)=>b.total-a.total);
  const lockIn = cats.filter(c=>_DISCRETIONARY.indexOf(c.name)>=0 && c.perMonth>=40)[0] || null;
  return {
    months, spend, income, net: income-spend,
    spendPerMonth: spend/months, incomePerMonth: income/incomeMonths,
    netPerMonth: (income/incomeMonths) - (spend/months),
    cats, lockIn, count: list.length,
    from: new Date(Math.min(...times)), to: new Date(Math.max(...times)),
    spanDays, enoughForMonthly
  };
}

function quickSpend(){
  const amount = parseFloat(document.getElementById('qs-amount')?.value || 0);
  const cat = document.getElementById('qs-cat')?.value || '';
  if(amount <= 0){ showToast('Enter an amount', 'How much was it?'); return; }
  if(!cat){ showToast('Pick a category', 'Choose from the dropdown.'); return; }
  const list = ls('totry_transactions') || [];
  list.unshift({
    id: Date.now(),
    type: 'expense',
    amount: amount,
    category: cat,
    note: '',
    ts: new Date().toISOString(),
    date: new Date().toLocaleDateString('en-AU')
  });
  ls('totry_transactions', list.slice(0, 1000)); // unified with confirmCSVImport — was 500 here, so one quick spend after a CSV import deleted 500 transactions
  // Reset inputs
  document.getElementById('qs-amount').value = '';
  document.getElementById('qs-cat').value = '';
  renderTransactions();
  showToast('Logged', '−'+curSym() + amount.toFixed(2) + ' · ' + cat);
  haptic('success');
}

function openTransactionLogger(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:14px">Log a transaction</h3>' +
    '<div style="display:flex;gap:6px;margin-bottom:14px">' +
      '<button class="meal-chip selected" id="trans-type-expense" data-type="expense" onclick="selectTransType(\'expense\')" style="flex:1">− Expense</button>' +
      '<button class="meal-chip" id="trans-type-income" data-type="income" onclick="selectTransType(\'income\')" style="flex:1">+ Income</button>' +
    '</div>' +
    '<div class="eyebrow">Amount</div>' +
    '<input type="number" id="trans-amount" step="0.01" placeholder="'+curSym()+'0.00" style="font-size:18px;padding:14px;margin-bottom:14px">' +
    '<div class="eyebrow">Category</div>' +
    '<div id="trans-category-grid" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px"></div>' +
    '<div class="eyebrow">Note (optional)</div>' +
    '<input type="text" id="trans-note" placeholder="What was it for..." style="margin-bottom:14px">' +
    '<button class="btn primary" onclick="saveTransaction()" style="margin-bottom:8px">Save transaction</button>' +
    '<button class="btn" onclick="closeModal(this)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
  window.__transType = 'expense';
  window.__transCategory = '';
  renderTransCategories();
  setTimeout(() => document.getElementById('trans-amount')?.focus(), 100);
}
function selectTransType(type){
  window.__transType = type;
  window.__transCategory = '';
  document.getElementById('trans-type-expense')?.classList.toggle('selected', type === 'expense');
  document.getElementById('trans-type-income')?.classList.toggle('selected', type === 'income');
  renderTransCategories();
}
function renderTransCategories(){
  const grid = document.getElementById('trans-category-grid');
  if(!grid) return;
  const cats = window.__transType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  grid.innerHTML = cats.map(c => '<button class="meal-chip' + (window.__transCategory === c ? ' selected' : '') + '" onclick="selectTransCategory(\'' + c + '\')">' + c + '</button>').join('');
}
function selectTransCategory(c){
  window.__transCategory = c;
  renderTransCategories();
}
function saveTransaction(){
  const amount = parseFloat(document.getElementById('trans-amount')?.value || 0);
  if(amount <= 0){ showToast('Invalid amount', 'Enter a positive amount.'); return; }
  if(!window.__transCategory){ showToast('Pick a category', 'Tap a category chip.'); return; }
  const note = document.getElementById('trans-note')?.value.trim() || '';
  const list = ls('totry_transactions') || [];
  list.unshift({
    id: Date.now(),
    type: window.__transType,
    amount: amount,
    category: window.__transCategory,
    note: note,
    ts: new Date().toISOString(),
    date: new Date().toLocaleDateString('en-AU')
  });
  ls('totry_transactions', list.slice(0, 1000)); // unified with confirmCSVImport — was 500 here, so one quick spend after a CSV import deleted 500 transactions
  document.querySelector('.modal-bg.open')?.remove();
  renderTransactions();
  showToast('Logged', (window.__transType === 'expense' ? '−' : '+') + curSym() + amount + ' · ' + window.__transCategory);
  haptic('success');
}
async function deleteTransaction(id){
  if(!(await askConfirm('Delete this transaction?'))) return;
  const list = ls('totry_transactions') || [];
  const next = list.filter(t => t.id !== id);
  // Record the removal so the cloud union cannot bring it back — see the note above.
  try{ if(typeof tombstoneRemoved === 'function') tombstoneRemoved('totry_transactions', list, next); }catch(_){ }
  ls('totry_transactions', next);
  renderTransactions();
}
function renderTransactions(){
  // Every money writer calls this, so it owns the rest of the surface too — see the note above.
  // Deferred to the end of the turn so it cannot recurse if a renderer below ever calls back in.
  setTimeout(function(){
    try{ if(typeof renderMoneyGate==='function') renderMoneyGate(); }catch(_){ }
  }, 0);
  const summary = document.getElementById('money-month-summary');
  const breakdown = document.getElementById('money-category-breakdown');
  const recent = document.getElementById('money-recent-transactions');
  if(!summary) return;
  
  const list = ls('totry_transactions') || [];
  // Filter this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonth = list.filter(t => new Date(t.ts).getTime() >= monthStart);
  
  const income = thisMonth.filter(t => t.type === 'income').reduce((a,t)=>a+t.amount, 0);
  const expenses = thisMonth.filter(t => t.type === 'expense').reduce((a,t)=>a+t.amount, 0);
  const net = income - expenses;
  
  summary.innerHTML = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' +
    '<div style="text-align:center;background:var(--bg3);border-radius:8px;padding:10px"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em">In</div><div style="font-size:16px;color:var(--gr);margin-top:3px">'+curSym() + Math.round(income).toLocaleString() + '</div></div>' +
    '<div style="text-align:center;background:var(--bg3);border-radius:8px;padding:10px"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em">Out</div><div style="font-size:16px;color:var(--re);margin-top:3px">'+curSym() + Math.round(expenses).toLocaleString() + '</div></div>' +
    '<div style="text-align:center;background:var(--bg3);border-radius:8px;padding:10px"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em">Net</div><div style="font-size:16px;color:' + (net >= 0 ? 'var(--gr)' : 'var(--re)') + ';margin-top:3px">'+curSym() + Math.round(net).toLocaleString() + '</div></div>' +
  '</div>';
  
  // Category breakdown for expenses
  if(breakdown){
    const byCategory = {};
    thisMonth.filter(t => t.type === 'expense').forEach(t => {
      const _c = t.category || 'Uncategorised';   // was t.category — an unset one keyed the string "undefined"
      byCategory[_c] = (byCategory[_c] || 0) + t.amount;
    });
    const cats = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
    if(cats.length){
      breakdown.innerHTML = '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;margin-top:8px">Spending by category</div>' +
        cats.map(([cat, amt]) => {
          const pct = expenses > 0 ? Math.round((amt / expenses) * 100) : 0;
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--bd);font-size:12px">' +
            '<div style="display:flex;align-items:center;gap:8px;flex:1"><span style="color:var(--tx2)">' + cat + '</span><span style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3)">' + pct + '%</span></div>' +
            '<span style="font-family:DM Mono,monospace;color:var(--re)">'+curSym() + Math.round(amt).toLocaleString() + '</span>' +
          '</div>';
        }).join('');
    } else {
      breakdown.innerHTML = '';
    }
  }
  
  if(recent){
    const recentList = thisMonth.slice(0, 8);
    if(!recentList.length){
      recent.innerHTML = '<p class="empty-note">No transactions this month yet</p>';
    } else {
      recent.innerHTML = '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;margin-top:8px">Recent (this month)</div>' +
        recentList.map(t => {
          const sign = t.type === 'expense' ? '−' : '+';
          const color = t.type === 'expense' ? 'var(--re)' : 'var(--gr)';
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--bd);font-size:12px">' +
            '<div style="flex:1;min-width:0"><div style="color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _escFew(t.note || t.category || 'Transaction') + '</div><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">' + (t.date || (t.ts ? new Date(t.ts).toLocaleDateString('en-AU') : '')) +
              ((t.category || t.cat) ? ' \u00b7 ' + (t.category || t.cat) : '') + '</div></div>' +
            '<div style="display:flex;align-items:center;gap:6px"><span style="font-family:DM Mono,monospace;color:' + color + '">' + sign + curSym() + t.amount + '</span><button onclick="deleteTransaction(' + t.id + ')" style="background:none;border:none;color:var(--tx3);font-size:14px;cursor:pointer">×</button></div>' +
          '</div>';
        }).join('');
    }
  }
  
  // Render the new cards
  renderSubscriptions();
  if(typeof renderFamilyContribution==='function') renderFamilyContribution();
  if(typeof renderGiving==='function') renderGiving();
  try{ renderSubDetect(); }catch(_){}
  if(typeof renderPoker==='function') renderPoker();
  renderBills();
  renderBudgets();
  renderNetWorth();
}

// ── SUBSCRIPTIONS ────────────────────────────────────────────
const SUBSCRIPTION_PERIODS = ['weekly','monthly','quarterly','annual'];
function openSubscriptionLogger(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:14px">Add subscription</h3>' +
    '<div class="eyebrow">Name</div>' +
    '<input type="text" id="sub-name" placeholder="e.g. Netflix, Spotify, gym membership" style="margin-bottom:10px">' +
    '<div style="display:flex;gap:8px;margin-bottom:10px">' +
      '<div style="flex:1"><div class="eyebrow">Amount '+curSym()+'</div><input type="number" id="sub-amount" step="0.01" placeholder="14.99"></div>' +
      '<div style="flex:1"><div class="eyebrow">Period</div><select id="sub-period"><option value="weekly">Weekly</option><option value="monthly" selected>Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select></div>' +
    '</div>' +
    '<div class="eyebrow">Note (optional)</div>' +
    '<input type="text" id="sub-note" placeholder="Why you have it" style="margin-bottom:14px">' +
    '<button class="btn primary" onclick="saveSubscription()" style="margin-bottom:8px">Save</button>' +
    '<button class="btn" onclick="closeModal(this)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
  setTimeout(() => document.getElementById('sub-name')?.focus(), 100);
}
function saveSubscription(){
  const name = document.getElementById('sub-name')?.value.trim();
  const amount = parseFloat(document.getElementById('sub-amount')?.value || 0);
  const period = document.getElementById('sub-period')?.value || 'monthly';
  const note = document.getElementById('sub-note')?.value.trim() || '';
  if(!name || amount <= 0){ showToast('Need name + amount', 'Both are required.'); return; }
  const list = ls('totry_subscriptions') || [];
  list.unshift({id: Date.now(), name, amount, period, note, addedAt: new Date().toISOString()});
  ls('totry_subscriptions', list);
  document.querySelector('.modal-bg.open')?.remove();
  renderSubscriptions();
  showToast('Subscription tracked', name);
  haptic('success');
}
async function deleteSubscription(id){
  if(!(await askConfirm('Remove this subscription from tracking?'))) return;
  const list = ls('totry_subscriptions') || [];
  const next = list.filter(s => s.id !== id);
  // Tombstone the removal so the cloud union cannot resurrect it — see deleteTransaction.
  try{ if(typeof tombstoneRemoved === 'function') tombstoneRemoved('totry_subscriptions', list, next); }catch(_){ }
  ls('totry_subscriptions', next);
  renderSubscriptions();
}
function monthlyEquivalent(sub){
  // TWO VOCABULARIES REACH HERE. Subscriptions added by hand carry 'weekly'/'monthly'/'quarterly'/
  // 'annual'; detectSubscriptions() emits 'week'/'month'/'year'. Only the first set was tested, so
  // tapping "Track" on a DETECTED subscription fell through to the monthly branch: a $10-a-week
  // charge counted as $10 a month (4.3x too low) and a $120-a-year one as $120 a month (12x too
  // high). Both feed the monthly total a person budgets against. Accept either spelling.
  const p = String(sub && sub.period || '').toLowerCase();
  const amt = parseFloat(sub && sub.amount) || 0;
  if(p === 'weekly' || p === 'week') return amt * 4.345;
  if(p === 'fortnightly' || p === 'fortnight') return amt * 2.1725;
  if(p === 'quarterly' || p === 'quarter') return amt / 3;
  if(p === 'annual' || p === 'annually' || p === 'year' || p === 'yearly') return amt / 12;
  return amt; // monthly
}
// ── FAMILY CONTRIBUTION ──────────────────────────────
// Reusable validated input modal — replaces fragile native prompt() for money/number entry.
function openFormModal(title, subtitle, fields, submitLabel, onSubmit){
  const m = document.createElement('div');
  m.className = 'modal-bg open'; m.id = 'form-modal';
  const fieldHtml = fields.map(f => {
    const pre = f.prefix ? '<span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--tx3);font-size:15px;pointer-events:none">'+f.prefix+'</span>' : '';
    const pad = f.prefix ? 'padding-left:26px' : '';
    const inMode = f.type==='number' ? ' inputmode="decimal"' : '';
    const val = (f.value!=null && f.value!=='') ? ' value="'+String(f.value).replace(/"/g,'&quot;')+'"' : '';
    // type:'textarea' renders a real multi-line field. It used to fall through to <input type="text">,
    // which silently turned a "write me a few sentences" prompt into a one-line box — the form looked
    // fine and quietly discouraged the very answer it was asking for.
    if(f.type === 'textarea'){
      return '<label for="fm-'+f.id+'" style="display:block;font-size:11px;color:var(--tx3);margin-bottom:6px;font-family:DM Mono,monospace;text-transform:uppercase;letter-spacing:0.1em">'+f.label+'</label>'+
        '<div style="position:relative;margin-bottom:14px">'+
        '<textarea id="fm-'+f.id+'" rows="3" placeholder="'+(f.placeholder||'').replace(/"/g,'&quot;')+'" '+
        'style="width:100%;min-height:74px;resize:vertical;line-height:1.55">'+
        String(f.value==null?'':f.value).replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</textarea></div>';
    }
    return '<label for="fm-'+f.id+'" style="display:block;font-size:11px;color:var(--tx3);margin-bottom:6px;font-family:DM Mono,monospace;text-transform:uppercase;letter-spacing:0.1em">'+f.label+'</label>'+
      '<div style="position:relative;margin-bottom:14px">'+pre+
      '<input type="'+(f.type==='date'?'date':'text')+'"'+inMode+' id="fm-'+f.id+'"'+val+' placeholder="'+(f.placeholder||'').replace(/"/g,'&quot;')+'" style="'+pad+'"></div>';
  }).join('');
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-size:17px;font-weight:500;color:var(--tx);margin-bottom:4px">'+title+'</div>'+
    (subtitle?'<div style="font-size:12px;color:var(--tx3);margin-bottom:16px">'+subtitle+'</div>':'<div style="margin-bottom:8px"></div>')+
    fieldHtml+
    '<div id="fm-error" role="alert" aria-live="assertive" style="display:none;color:var(--re);font-size:12px;margin-bottom:10px"></div>'+
    '<button class="btn primary" id="fm-submit" style="margin-bottom:8px">'+submitLabel+'</button>'+
    '<button class="btn" onclick="closeModal(this)">Cancel</button></div>';
  document.body.appendChild(m);
  const getVals = () => { const v={}; fields.forEach(f=>{ const el=document.getElementById('fm-'+f.id); v[f.id] = el? el.value.trim() : ''; }); return v; };
  document.getElementById('fm-submit').onclick = () => {
    const vals = getVals();
    const res = onSubmit(vals);
    if(res === true){ m.remove(); }
    else if(typeof res === 'string'){
      const e=document.getElementById('fm-error');
      if(e){ e.textContent=res; e.style.display='block'; }
      // put the cursor back where the fix has to happen, not left on a button that did nothing
      try{ const first=document.getElementById('fm-'+fields[0].id); if(first) first.focus(); }catch(_){ }
    }
  };
  setTimeout(()=>{ const first=document.getElementById('fm-'+fields[0].id); if(first) first.focus(); }, 100);
}

function openFamilyContribution(){
  openFormModal('Log a family contribution', 'Money you gave to family.',
    [ {id:'amount', label:'Amount', type:'number', prefix:curSym(), placeholder:'e.g. 200'},
      {id:'note', label:'Note (optional)', type:'text', placeholder:'e.g. rent help, groceries'} ],
    'Save contribution',
    (v) => {
      const n = parseFloat(v.amount);
      if(isNaN(n) || n<=0) return 'Enter an amount greater than 0.';
      const list = ls('totry_family_contrib') || [];
      list.unshift({ id: Date.now(), amount: n, note: (v.note||'').trim(), date: new Date().toISOString() });
      ls('totry_family_contrib', list.slice(0,200));
      if(typeof syncToCloud==='function') syncToCloud();
      renderFamilyContribution(); haptic('success'); showToast('Logged', curSym()+n+' contribution saved.');
      return true;
    });
}
async function deleteFamilyContribution(id){
  // A one-tap destructive action on a glyph a few pixels wide, with no undo anywhere in the app.
  if(!(await askConfirm('Delete this contribution? It is part of your record of what you gave.'))) return;
  const _before = ls('totry_family_contrib')||[];
  const list = _before.filter(x=>x.id!==id);
  tombstoneRemoved('totry_family_contrib', _before, list);
  ls('totry_family_contrib', list); if(typeof syncToCloud==='function') syncToCloud(); renderFamilyContribution();
}
// Set a recurring monthly family-contribution target (treated like a commitment/subscription).
function setFamilyTarget(){
  const cur = ls('totry_family_target') || {};
  openFormModal('Monthly family target', 'A recurring amount to contribute each month, like a commitment.',
    [ {id:'amount', label:'Target amount', type:'number', prefix:curSym(), placeholder:'e.g. 500', value: cur.amount||''},
      {id:'dueDay', label:'Day of month it\u2019s due (1\u201328)', type:'number', placeholder:'e.g. 1', value: cur.dueDay||'1'} ],
    'Set target',
    (v) => {
      if(!v.amount){ localStorage.removeItem('totry_family_target'); if(typeof syncToCloud==='function') syncToCloud(); renderFamilyContribution(); showToast('Target cleared','No monthly family target set.'); return true; }
      const n = parseFloat(v.amount);
      if(isNaN(n)||n<=0) return 'Enter an amount greater than 0 (or clear it).';
      const d = Math.max(1, Math.min(28, parseInt(v.dueDay)||1));
      ls('totry_family_target', { amount: n, dueDay: d });
      if(typeof syncToCloud==='function') syncToCloud();
      renderFamilyContribution(); haptic('success'); showToast('Target set',curSym()+n+'/month by the '+d+(d===1?'st':d===2?'nd':d===3?'rd':'th')+'.');
      return true;
    });
}
function renderFamilyContribution(){
  const wrap = document.getElementById('family-contribution-list');
  const totalEl = document.getElementById('family-contribution-total');
  if(!wrap) return;
  const list = ls('totry_family_contrib') || [];
  const target = ls('totry_family_target') || null;
  // Target progress strip (recurring monthly commitment, like a subscription you owe).
  const now = new Date();
  const monthGiven = list.filter(c=>{const d=new Date(c.date); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();}).reduce((a,c)=>a+c.amount,0);
  let targetHtml = '';
  if(target && target.amount){
    const pct = Math.min(100, Math.round((monthGiven/target.amount)*100));
    const remaining = Math.max(0, target.amount - monthGiven);
    const met = monthGiven >= target.amount;
    const dueStr = target.dueDay + (target.dueDay===1?'st':target.dueDay===2?'nd':target.dueDay===3?'rd':'th');
    targetHtml = '<div style="background:var(--bg3);border:1px solid '+(met?'var(--go-bd)':'var(--bd)')+';border-radius:10px;padding:12px;margin-bottom:12px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em">This month\u2019s target \u00b7 due '+dueStr+'</span><button onclick="setFamilyTarget()" style="background:none;border:none;color:var(--go);font-size:11px;cursor:pointer;padding:16px 13px;margin:-16px -13px;position:relative">Edit</button></div>'+
      '<div style="font-size:15px;color:'+(met?'var(--gr)':'var(--tx)')+'">'+curSym()+monthGiven.toLocaleString()+' / '+curSym()+target.amount.toLocaleString()+(met?'  \u2713':'')+'</div>'+
      '<div style="height:6px;background:var(--bg);border-radius:3px;margin-top:6px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+(met?'var(--gr)':'var(--go)')+'"></div></div>'+
      (met?'':'<div style="font-size:11px;color:var(--tx3);margin-top:5px">'+curSym()+remaining.toLocaleString()+' to go this month</div>')+
      '</div>';
  }
  if(!list.length){
    wrap.innerHTML = targetHtml + '<p class="empty-note">No contributions logged yet.'+(target?'':' <button onclick="setFamilyTarget()" style="background:none;border:none;color:var(--go);cursor:pointer;font-size:12px;padding:15px 0;margin:-15px 0;position:relative">Set a monthly target</button>')+'</p>';
    if(totalEl) totalEl.textContent='';
    return;
  }
  wrap.__targetHtml = targetHtml;
  wrap.innerHTML = (wrap.__targetHtml||'') + (target ? '' : '<button onclick="setFamilyTarget()" style="width:100%;background:var(--bg3);border:1px dashed var(--bd);color:var(--go);border-radius:8px;padding:8px;font-size:12px;cursor:pointer;margin-bottom:10px">+ Set a recurring monthly target</button>') + list.slice(0,12).map(c=>{
    const when = new Date(c.date).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bd)">'+
      '<div><div style="font-size:14px;color:var(--tx)">'+curSym()+c.amount.toLocaleString()+'</div>'+(c.note?'<div style="font-size:11px;color:var(--tx3)">'+c.note.replace(/</g,'&lt;')+'</div>':'')+'</div>'+
      '<div style="display:flex;align-items:center;gap:10px"><span style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">'+when+'</span>'+
      '<button onclick="deleteFamilyContribution('+c.id+')" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">\u00d7</button></div></div>';
  }).join('');
  const total = list.reduce((a,c)=>a+c.amount,0);
  // monthGiven was already computed above for the target strip — reuse it.
  if(totalEl) totalEl.textContent = curSym()+total.toLocaleString()+' all time \u00b7 '+curSym()+monthGiven.toLocaleString()+' this month';
}

// ── POKER TRACKER ────────────────────────────────────────────
function openPokerSession(){
  openFormModal('Log a poker session', 'Track buy-in vs cash-out to see if you\u2019re up or down over time.',
    [ {id:'buyin', label:'Buy-in', type:'number', prefix:curSym(), placeholder:'e.g. 100'},
      {id:'cashout', label:'Cash-out (0 if you busted)', type:'number', prefix:curSym(), placeholder:'e.g. 240'},
      {id:'note', label:'Note (optional)', type:'text', placeholder:'e.g. venue or game type'} ],
    'Save session',
    (v) => {
      const bi = parseFloat(v.buyin);
      if(isNaN(bi) || bi<0) return 'Enter a valid buy-in.';
      const co = parseFloat(v.cashout);
      if(isNaN(co) || co<0) return 'Enter a valid cash-out (0 if you busted).';
      const list = ls('totry_poker_sessions') || [];
      list.unshift({ id: Date.now(), buyin: bi, cashout: co, net: co-bi, note: (v.note||'').trim(), date: new Date().toISOString() });
      ls('totry_poker_sessions', list.slice(0,300));
      if(typeof syncToCloud==='function') syncToCloud();
      renderPoker(); haptic(co>=bi?'success':'warning');
      const net = co-bi;
      showToast(net>=0?'Session logged \u2014 up '+curSym()+net:'Session logged \u2014 down '+curSym()+Math.abs(net), 'Tracked honestly.');
      return true;
    });
}
async function deletePokerSession(id){
  // A one-tap destructive action on a glyph a few pixels wide, with no undo anywhere in the app.
  if(!(await askConfirm('Delete this session? Its result comes out of your totals.'))) return;
  const _before = ls('totry_poker_sessions')||[];
  const list = _before.filter(x=>x.id!==id);
  tombstoneRemoved('totry_poker_sessions', _before, list);
  ls('totry_poker_sessions', list); if(typeof syncToCloud==='function') syncToCloud(); renderPoker();
}
function renderPoker(){
  const wrap = document.getElementById('poker-list');
  const sumEl = document.getElementById('poker-summary');
  if(!wrap) return;
  const list = ls('totry_poker_sessions') || [];
  if(!list.length){ wrap.innerHTML = '<p class="empty-note">No sessions logged yet.</p>'; if(sumEl) sumEl.innerHTML=''; return; }
  const totalNet = list.reduce((a,s)=>a+s.net,0);
  const sessions = list.length;
  const wins = list.filter(s=>s.net>0).length;
  if(sumEl){
    const col = totalNet>=0 ? 'var(--gr)' : 'var(--re)';
    sumEl.innerHTML = '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:14px;text-align:center">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">Lifetime net</div>'+
      '<div style="font-size:24px;color:'+col+'">'+(totalNet>=0?'+'+curSym():'\u2212'+curSym())+Math.abs(totalNet).toLocaleString()+'</div>'+
      '<div style="font-size:11px;color:var(--tx3);margin-top:4px">'+sessions+' session'+(sessions===1?'':'s')+' \u00b7 '+wins+' winning</div></div>';
  }
  wrap.innerHTML = list.slice(0,15).map(p=>{
    const when = new Date(p.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'});
    const col = p.net>=0 ? 'var(--gr)' : 'var(--re)';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bd)">'+
      '<div><div style="font-size:13px;color:'+col+'">'+(p.net>=0?'+'+curSym():'\u2212'+curSym())+Math.abs(p.net).toLocaleString()+'</div>'+
      '<div style="font-size:10px;color:var(--tx3)">in '+curSym()+p.buyin.toLocaleString()+' \u2192 out '+curSym()+p.cashout.toLocaleString()+(p.note?' \u00b7 '+p.note.replace(/</g,'&lt;'):'')+'</div></div>'+
      '<div style="display:flex;align-items:center;gap:10px"><span style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">'+when+'</span>'+
      '<button onclick="deletePokerSession('+p.id+')" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">\u00d7</button></div></div>';
  }).join('');
}


// ── SUBSCRIPTION AUTO-DETECTION ───────────────────────────────────────────────────────────────
// The one real Money gap against Rocket Money — and the importer already exists, so this is just
// pattern-matching on top of it. A subscription is the purest form of money leaking without a
// decision: nobody chooses it monthly, they chose it once and then stopped noticing. Finding them is
// not a gotcha, it is handing back a decision. It never cancels anything or judges a single charge.
function _subNorm(str){
  return String(str||'').toLowerCase()
    .replace(/\b(pty|ltd|inc|llc|com|au|usa?)\b/g,'')
    .replace(/[^a-z ]+/g,' ').replace(/\s+/g,' ').trim().slice(0,28);
}
function detectSubscriptions(){
  try{
    const tx=(ls('totry_transactions')||[]).filter(function(t){ return t && t.type==='expense' && t.amount>0 && (t.ts||t.date); });
    if(tx.length<6) return [];
    const groups={};
    tx.forEach(function(t){
      const k=_subNorm(t.note||t.category);
      if(!k || k.length<3) return;
      (groups[k]=groups[k]||[]).push({ amt:Math.round(t.amount*100)/100, ts:new Date(t.ts||t.date).getTime(), note:(t.note||t.category||'').slice(0,40) });
    });
    const known=(ls('totry_subscriptions')||[]).map(function(x){ return _subNorm(x.name); });
    const dismissed=ls('totry_sub_dismissed')||[];
    const out=[];
    Object.keys(groups).forEach(function(k){
      if(known.indexOf(k)>=0 || dismissed.indexOf(k)>=0) return;
      const g=groups[k].sort(function(a,b){ return a.ts-b.ts; });
      if(g.length<3) return;
      // same-ish amount every time — a real subscription barely moves
      const amts=g.map(function(x){ return x.amt; });
      const avg=amts.reduce(function(a,b){ return a+b; },0)/amts.length;
      if(avg<=0) return;
      const spread=Math.max.apply(null,amts)-Math.min.apply(null,amts);
      if(spread > Math.max(2, avg*0.12)) return;
      // and it lands on a rhythm — monthly, or roughly weekly/yearly
      const gaps=[]; for(let i=1;i<g.length;i++) gaps.push(Math.round((g[i].ts-g[i-1].ts)/86400000));
      const avgGap=gaps.reduce(function(a,b){ return a+b; },0)/gaps.length;
      let period=null;
      if(avgGap>=25 && avgGap<=35) period='month';
      else if(avgGap>=6 && avgGap<=8) period='week';
      else if(avgGap>=350 && avgGap<=380) period='year';
      if(!period) return;
      const drift=gaps.filter(function(x){ return Math.abs(x-avgGap) > Math.max(4, avgGap*0.3); }).length;
      if(drift > Math.floor(gaps.length/2)) return;
      out.push({ key:k, name:g[g.length-1].note || k, amount:Math.round(avg*100)/100, period:period, seen:g.length, yearly:Math.round(avg*(period==='month'?12:period==='week'?52:1)) });
    });
    return out.sort(function(a,b){ return b.yearly-a.yearly; }).slice(0,8);
  }catch(_){ return []; }
}
function renderSubDetect(){
  const el=document.getElementById('sub-detect'); if(!el) return;
  const found=detectSubscriptions();
  if(!found.length){ el.style.display='none'; el.innerHTML=''; return; }
  const total=found.reduce(function(a,f){ return a+f.yearly; },0);
  el.style.display='block';
  el.innerHTML='<div style="background:var(--bg3);border:1px solid var(--go-bd);border-radius:12px;padding:13px 15px;margin-bottom:12px">'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px">Found in your statements</div>'+
    '<div style="font-size:12.5px;color:var(--tx2);line-height:1.6;margin-bottom:10px">'+found.length+' charge'+(found.length===1?'':'s')+' that repeat like subscriptions \u2014 about <b style="color:var(--tx)">'+curSym()+total.toLocaleString()+'/year</b> between them. Not an accusation, just the ones you may have stopped noticing.</div>'+
    found.map(function(f){ return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid var(--bd)">'+
      '<div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_escFew(f.name)+'</div>'+
      '<div style="font-family:DM Mono,monospace;font-size:9.5px;color:var(--tx3)">'+curSym()+f.amount+'/'+f.period+' \u00b7 seen '+f.seen+'\u00d7 \u00b7 ~'+curSym()+f.yearly.toLocaleString()+'/yr</div></div>'+
      '<button class="btn" style="width:auto;padding:5px 10px;font-size:11px;background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go)" onclick="_subAccept(\''+String(f.key).replace(/'/g,"")+'\')">Track</button>'+
      '<button class="btn" style="width:auto;padding:5px 8px;font-size:11px;color:var(--tx3)" onclick="_subDismiss(\''+String(f.key).replace(/'/g,"")+'\')">Not one</button>'+
    '</div>'; }).join('')+
  '</div>';
}
function _subAccept(key){
  const f=detectSubscriptions().find(function(x){ return x.key===key; }); if(!f) return;
  try{
    const list=ls('totry_subscriptions')||[];
    list.unshift({id:Date.now(), name:f.name, amount:f.amount, period:f.period, note:'found in your statements', addedAt:new Date().toISOString()});
    ls('totry_subscriptions', list);
  }catch(_){}
  try{ if(typeof renderSubscriptions==='function') renderSubscriptions(); }catch(_){}
  renderSubDetect();
  try{ showToast('Tracked', f.name+' \u2014 about '+curSym()+f.yearly.toLocaleString()+' a year. Now it is a decision again.'); }catch(_){}
}
function _subDismiss(key){
  try{ const d=ls('totry_sub_dismissed')||[]; d.push(key); ls('totry_sub_dismissed', d.slice(-100)); }catch(_){}
  renderSubDetect();
}

// ── ON THIS DAY — resurfacing as witness, never as a metric ───────────────────────────────────
// Pull, never push: it appears in the reflect tab, not as a notification. Showing someone how they
// wrote about the same struggle a season ago is the only proof of change that doesn't require them
// to trust the app's arithmetic — it's their own handwriting.
function onThisDay(){
  try{
    const j=ls('totry_journal')||[];
    if(j.length<8) return null;
    const now=Date.now();
    const scored=j.map(function(e){
      if(!e||!e.ts||!e.text||e.text.length<40) return null;
      const age=Math.floor((now-new Date(e.ts).getTime())/86400000);
      if(age<150) return null;                         // needs real distance to mean anything
      // prefer close to a year, then any older entry
      const d=Math.abs(age-365);
      return { e:e, age:age, score:d };
    }).filter(Boolean).sort(function(a,b){ return a.score-b.score; });
    return scored.length ? scored[0] : null;
  }catch(_){ return null; }
}
function renderOnThisDay(){
  const el=document.getElementById('on-this-day'); if(!el) return;
  const hit=onThisDay();
  const seen=ls('totry_otd_seen')||'';
  const key=hit?String(hit.e.ts):'';
  if(!hit || seen===key){ el.style.display='none'; el.innerHTML=''; return; }
  const months=Math.round(hit.age/30);
  const when = hit.age>=330 ? 'about a year ago' : (months+' months ago');
  el.style.display='block';
  el.innerHTML='<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:13px 15px;margin-bottom:12px">'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px">You wrote this '+when+'</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:14.5px;font-style:italic;color:var(--tx2);line-height:1.7;margin-bottom:10px">\u201c'+_escFew(String(hit.e.text).slice(0,340))+(String(hit.e.text).length>340?'\u2026':'')+'\u201d</div>'+
    '<div style="font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:10px">Not to make you feel anything in particular \u2014 just so you can hear how you were speaking then, and notice whether it has moved.</div>'+
    // "Read it" used to hide the card and jump to Reflect \u2014 it never opened anything, and it burned
    // the entry: totry_otd_seen was stamped so it could never resurface. The card is already the
    // entry, so the only honest actions are: show the rest of it, respond to it, or put it down.
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
      (String(hit.e.text).length>340 ? '<button class="btn" style="width:auto;padding:6px 12px;font-size:12px;margin:0" onclick="_otdExpand()">Read the rest</button>' : '')+
      '<button class="btn" style="width:auto;padding:6px 12px;font-size:12px;margin:0;background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go)" onclick="_otdRespond()">Write to that version of me</button>'+
      '<button class="btn" style="width:auto;padding:6px 12px;font-size:12px;margin:0;background:transparent;border:1px solid var(--bd);color:var(--tx3)" onclick="_otdSeen()">Put it down</button>'+
    '</div>'+
  '</div>';
}
// Show the whole entry in place. No navigation, no dismissal \u2014 they asked to read, so let them read.
function _otdExpand(){
  try{
    const hit=onThisDay(); if(!hit) return;
    const el=document.getElementById('on-this-day'); if(!el) return;
    const q=el.querySelector('div[style*="Cormorant"]');
    if(q) q.innerHTML='\u201c'+_escFew(String(hit.e.text))+'\u201d';
    const b=el.querySelector('button'); if(b && /Read the rest/.test(b.textContent||'')) b.remove();
    if(typeof haptic==='function') haptic('tap');
  }catch(_){}
}
// Respond to it. This is the one move that earns the resurfacing: then vs now, in their own hand.
function _otdRespond(){
  try{
    const hit=onThisDay();
    if(hit){ try{ ls('totry_otd_seen', String(hit.e.ts)); }catch(_){} window.__otdPrompt = String(hit.e.text).slice(0,300); }
    const el=document.getElementById('on-this-day'); if(el){ el.style.display='none'; el.innerHTML=''; }
    if(typeof go==='function') go('reflect');
    setTimeout(function(){
      try{
        // Open the JOURNAL properly. #journal-input has never existed in this file; the old fallback
        // took the first textarea in the reflect tab, which is the evening "one win" box — so their
        // answer to their own past self was filed as tonight's win.
        if(typeof setReflectTab==='function') setReflectTab('journal');
        if(typeof openJournal==='function') openJournal();
        const ta=document.getElementById('journal-text');
        if(ta){
          ta.placeholder='You wrote that '+(hit?(hit.age>=330?'about a year ago':Math.round(hit.age/30)+' months ago'):'a while back')+'. What would you say to yourself now?';
          ta.focus();
        }
      }catch(_){}
    }, 420);
  }catch(_){}
}
// Put it down. Marks it seen so it doesn't chase them \u2014 that's the anti-engagement promise.
function _otdSeen(){
  const hit=onThisDay(); if(hit){ try{ ls('totry_otd_seen', String(hit.e.ts)); }catch(_){} }
  const el=document.getElementById('on-this-day'); if(el){ el.style.display='none'; el.innerHTML=''; }
  if(typeof haptic==='function') haptic('tap');
}

function renderSubscriptions(){
  const list = ls('totry_subscriptions') || [];
  const box = document.getElementById('subscriptions-list');
  const totalBox = document.getElementById('subscriptions-total');
  if(!box) return;
  if(!list.length){
    box.innerHTML = '<p class="empty-note">No subscriptions tracked yet. Add Netflix, Spotify, gym, anything recurring.</p>';
    if(totalBox) totalBox.textContent = '';
    return;
  }
  // Sort by monthly equivalent descending
  list.sort((a, b) => monthlyEquivalent(b) - monthlyEquivalent(a));
  let monthlyTotal = 0;
  let annualTotal = 0;
  box.innerHTML = list.map(s => {
    const monthly = monthlyEquivalent(s);
    monthlyTotal += monthly;
    annualTotal += monthly * 12;
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd);font-size:12px">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + s.name + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">'+curSym() + s.amount + ' / ' + s.period + (s.note ? ' · ' + s.note : '') + '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px"><span style="font-family:DM Mono,monospace;color:var(--re)">~'+curSym() + monthly.toFixed(2) + '/mo</span><button onclick="deleteSubscription(' + s.id + ')" style="background:none;border:none;color:var(--tx3);font-size:14px;cursor:pointer">×</button></div>' +
    '</div>';
  }).join('');
  if(totalBox){
    totalBox.textContent = 'Total: ~'+curSym() + monthlyTotal.toFixed(0) + '/mo · ~'+curSym() + annualTotal.toFixed(0) + '/year';
  }
}

// ── BILLS WITH DUE DATES ─────────────────────────────────────
// A REMINDER NOTHING EVER SET. The bills empty state read "Add ones with due dates to get reminders"
// and nothing in this codebase ever scheduled one — Notify.schedule exists and is used for the
// reach-out nudges, but no bill ever reached it. So the promise was made on the screen where a person
// decides whether to trust the app with a due date, and then quietly not kept.
//
// Web browsers cannot fire a background notification, so on web this schedules nothing and says so
// rather than queueing a phantom (the same trap _sendReachOuts documents at 02-native.js:681).
function _billNotifId(b){ return 'bill_' + String(b && b.id); }
function scheduleBillReminders(){
  try{
    if(typeof Notify==='undefined' || !Notify.schedule) return 0;
    if(!(Notify.isNative && Notify.isNative())) return 0;   // web cannot background-fire
    const list = ls('totry_bills') || [];
    let n = 0;
    list.forEach(function(b){
      if(!b || !b.due) return;
      Notify.cancel(_billNotifId(b));          // always re-arm from scratch: dates and paid state move
      if(b.paid) return;
      // Local midnight, not UTC — `new Date('2026-08-19')` is UTC and east of Greenwich that fires the
      // reminder on the wrong day, which for a bill is the one day it had to be right.
      const parts = String(b.due).split('-').map(Number);
      if(parts.length !== 3 || parts.some(isNaN)) return;
      const at = new Date(parts[0], parts[1]-1, parts[2], 9, 0, 0, 0);
      if(at.getTime() <= Date.now() + 60000) return;        // already due or past — a nudge is noise now
      const amt = Number(b.amount != null ? b.amount : b.amt) || 0;
      Notify.schedule(_billNotifId(b), 'To Try',
        (b.name || 'A bill') + ' is due today' + (amt ? (' \u2014 ' + curSym() + amt.toLocaleString()) : '') + '.',
        at, { route:'money' });
      n++;
    });
    return n;
  }catch(_){ return 0; }
}
function openBillLogger(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:14px">Add upcoming bill</h3>' +
    '<div class="eyebrow">Bill name</div>' +
    '<input type="text" id="bill-name" placeholder="e.g. Car rego, electricity, rent" style="margin-bottom:10px">' +
    '<div style="display:flex;gap:8px;margin-bottom:10px">' +
      '<div style="flex:1"><div class="eyebrow">Amount '+curSym()+'</div><input type="number" id="bill-amount" step="0.01" placeholder="0.00"></div>' +
      '<div style="flex:1"><div class="eyebrow">Due date</div><input type="date" id="bill-due"></div>' +
    '</div>' +
    '<button class="btn primary" onclick="saveBill()" style="margin-bottom:8px">Save bill</button>' +
    '<button class="btn" onclick="closeModal(this)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
  setTimeout(() => document.getElementById('bill-name')?.focus(), 100);
}
function saveBill(){
  const name = document.getElementById('bill-name')?.value.trim();
  const amount = parseFloat(document.getElementById('bill-amount')?.value || 0);
  const due = document.getElementById('bill-due')?.value;
  if(!name || amount <= 0 || !due){ showToast('Need all fields', 'Name, amount and due date.'); return; }
  const list = ls('totry_bills') || [];
  list.push({id: Date.now(), name, amount, due, paid: false});
  ls('totry_bills', list);
  document.querySelector('.modal-bg.open')?.remove();
  renderBills();
  try{ scheduleBillReminders(); }catch(_){ }
  showToast('Bill tracked', name);
  haptic('success');
}
function markBillPaid(id){
  const list = ls('totry_bills') || [];
  const b = list.find(b => b.id === id);
  if(!b) return;
  b.paid = true;
  b.paidAt = new Date().toISOString();
  ls('totry_bills', list);
  renderBills();
  // Nothing is more annoying than being reminded about a bill you already paid.
  try{ if(typeof Notify!=='undefined' && Notify.cancel) Notify.cancel(_billNotifId(b)); }catch(_){ }
  showToast('Marked paid', b.name);
}
async function deleteBill(id){
  if(!(await askConfirm('Delete this bill?'))) return;
  const list = ls('totry_bills') || [];
  const next = list.filter(b => b.id !== id);
  // Tombstone the removal so the cloud union cannot resurrect it — see deleteTransaction.
  try{ if(typeof tombstoneRemoved === 'function') tombstoneRemoved('totry_bills', list, next); }catch(_){ }
  ls('totry_bills', next);
  try{ if(typeof Notify!=='undefined' && Notify.cancel) Notify.cancel('bill_' + String(id)); }catch(_){ }
  renderBills();
}
function renderBills(){
  const list = ls('totry_bills') || [];
  const box = document.getElementById('bills-list');
  if(!box) return;
  // Remove paid bills older than 30 days
  const now = Date.now();
  const cleaned = list.filter(b => {
    if(!b.paid) return true;
    return new Date(b.paidAt || now).getTime() > now - 30 * 86400000;
  });
  if(cleaned.length !== list.length) ls('totry_bills', cleaned);
  
  const unpaid = cleaned.filter(b => !b.paid).sort((a, b) => new Date(a.due) - new Date(b.due));
  if(!unpaid.length){
    box.innerHTML = '<p class="empty-note">No upcoming bills. Add ones with due dates and I\u2019ll keep them in front of you.'+((typeof Notify!=='undefined'&&Notify.isNative&&Notify.isNative())?' I\u2019ll remind you the morning each one is due.':'')+'</p>';
    return;
  }
  box.innerHTML = unpaid.slice(0, 8).map(b => {
    // `new Date('2026-08-19')` is parsed as UTC MIDNIGHT, and `now` is local. East of Greenwich that
  // makes a bill due today look like it is due tomorrow all day — "Due today" arrives the day after
  // it was due, which for a bill is the one day the reminder had to be right. Compare local midnights.
  const _dueParts = String(b.due||'').split('-').map(Number);
  const _due = (_dueParts.length === 3 && !_dueParts.some(isNaN))
    ? new Date(_dueParts[0], _dueParts[1]-1, _dueParts[2])
    : new Date(b.due);
  _due.setHours(0,0,0,0);
  const _today = new Date(); _today.setHours(0,0,0,0);
  const daysUntil = Math.round((_due.getTime() - _today.getTime()) / 86400000);
    let urgency;
    if(daysUntil < 0) urgency = {color: 'var(--re)', label: Math.abs(daysUntil) + 'd overdue', bg: 'rgba(216,93,75,0.1)', border: 'var(--re)'};
    else if(daysUntil <= 3) urgency = {color: 'var(--re)', label: daysUntil === 0 ? 'Due today' : daysUntil + ' day' + (daysUntil===1?'':'s'), bg: 'rgba(216,93,75,0.08)', border: 'var(--re-bd)'};
    else if(daysUntil <= 7) urgency = {color: 'var(--go)', label: daysUntil + ' days', bg: 'rgba(200,169,110,0.06)', border: 'var(--go-bd)'};
    else urgency = {color: 'var(--tx3)', label: daysUntil + ' days', bg: 'var(--bg3)', border: 'var(--bd)'};
    return '<div style="background:' + urgency.bg + ';border:1px solid ' + urgency.border + ';border-radius:8px;padding:10px 12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (b.name||b.n||'Bill') + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:10px;color:' + urgency.color + ';margin-top:2px">'+curSym() + (Number(b.amount!=null?b.amount:b.amt)||0).toLocaleString() + ' · ' + urgency.label + '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:6px">' +
        '<button class="btn" aria-label="Mark paid" style="width:auto;padding:13px 15px;font-size:10px;background:var(--gr);color:#000;border:none" onclick="markBillPaid(' + b.id + ')">✓</button>' +
        '<button onclick="deleteBill(' + b.id + ')" style="background:none;border:none;color:var(--tx3);font-size:14px;cursor:pointer">×</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ── CATEGORY BUDGETS ─────────────────────────────────────────
function openBudgetLogger(){
  const budgets = ls('totry_budgets') || {};
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:14px">Set category budgets</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px">Monthly limit per expense category. Leave blank to skip.</p>' +
    EXPENSE_CATEGORIES.map(cat => 
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<div style="flex:1;font-size:13px;color:var(--tx)">' + cat + '</div>' +
        '<input type="number" id="budget-' + cat.replace(/[^a-z]/gi, '') + '" step="10" value="' + (budgets[cat] || '') + '" placeholder="'+curSym()+'" style="max-width:100px;text-align:right">' +
      '</div>'
    ).join('') +
    '<button class="btn primary" onclick="saveBudgets()" style="margin-top:14px;margin-bottom:8px">Save budgets</button>' +
    '<button class="btn" onclick="closeModal(this)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
}
function saveBudgets(){
  const out = {};
  EXPENSE_CATEGORIES.forEach(cat => {
    const v = parseFloat(document.getElementById('budget-' + cat.replace(/[^a-z]/gi, ''))?.value || 0);
    if(v > 0) out[cat] = v;
  });
  ls('totry_budgets', out);
  document.querySelector('.modal-bg.open')?.remove();
  renderBudgets();
  showToast('Budgets saved', Object.keys(out).length + ' categor' + (Object.keys(out).length === 1 ? 'y' : 'ies') + ' tracked.');
  haptic('success');
}
// Budget limits are keyed to EXPENSE_CATEGORIES ('Food', 'Rent/bills', 'Entertainment'...), but the bank
// importer labels rows with _autoCategory's richer vocabulary ('Groceries', 'Eating out', 'Bills',
// 'Subscriptions', 'Gambling'...). Nothing reconciled the two, so for anyone who used the CSV import —
// the flagship money feature — a Food budget read $0 spent no matter how much they spent on food, and an
// Entertainment budget could never be spent against at all. Budgets looked permanently, reassuringly
// untouched. This maps any incoming category onto the budget bucket it belongs to, without migrating
// stored data, so both vocabularies land in the same place.
const _BUDGET_BUCKET = {
  'groceries':'Food', 'eating out':'Food', 'food':'Food',
  'bills':'Rent/bills', 'rent/bills':'Rent/bills', 'rent':'Rent/bills',
  'subscriptions':'Entertainment', 'entertainment':'Entertainment', 'going out':'Entertainment',
  'transport':'Transport', 'health':'Health', 'shopping':'Shopping'
};
function _budgetBucket(cat, budgetCats){
  const raw = String(cat == null ? '' : cat).trim();
  if(!raw) return 'Uncategorised';
  // An exact budget name always wins, so a person who set a budget literally called "Gambling" or
  // "Groceries" sees their own spend against it rather than having it folded away.
  if(budgetCats && budgetCats.some(c => String(c).toLowerCase() === raw.toLowerCase())){
    return budgetCats.find(c => String(c).toLowerCase() === raw.toLowerCase());
  }
  return _BUDGET_BUCKET[raw.toLowerCase()] || raw;
}
function renderBudgets(){
  let budgets = ls('totry_budgets') || {};
  // Legacy/malformed guard: older data (and a bad demo seed) stored an ARRAY of {cat,limit}; the render
  // expects a {category: limit} map. Coerce so we never show "$[object Object]" / "$NaN left".
  if(Array.isArray(budgets)){ const _o={}; budgets.forEach(b=>{ if(b&&b.cat!=null) _o[b.cat]=Number(b.limit)||0; }); budgets=_o; ls('totry_budgets', budgets); }
  const box = document.getElementById('budgets-list');
  if(!box) return;
  const cats = Object.keys(budgets);
  if(!cats.length){
    box.innerHTML = '<p class="empty-note">No budgets set yet. Tap "+ Set" to assign monthly limits.</p>';
    return;
  }
  // Get this month's transactions by category
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const transactions = (ls('totry_transactions') || []).filter(t => t.type === 'expense' && new Date(t.ts).getTime() >= monthStart);
  const spentByCat = {};
  transactions.forEach(t => { const c = _budgetBucket(t.category, cats); spentByCat[c] = (spentByCat[c] || 0) + (parseFloat(t.amount)||0); });
  
  box.innerHTML = cats.map(cat => {
    const limit = budgets[cat];
    const spent = spentByCat[cat] || 0;
    const pct = Math.min(100, Math.round((spent / limit) * 100));
    const over = spent > limit;
    const barColor = over ? 'var(--re)' : pct >= 80 ? 'var(--go)' : 'var(--gr)';
    const remaining = limit - spent;
    return '<div style="margin-bottom:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;font-size:12px;margin-bottom:4px">' +
        '<span style="color:var(--tx)">' + cat + '</span>' +
        '<span style="font-family:DM Mono,monospace;color:' + (over ? 'var(--re)' : 'var(--tx2)') + '">'+curSym() + Math.round(spent) + ' / '+curSym() + limit + '</span>' +
      '</div>' +
      '<div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:4px">' +
        '<div style="height:100%;background:' + barColor + ';width:' + pct + '%;transition:width 0.3s"></div>' +
      '</div>' +
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:' + (over ? 'var(--re)' : 'var(--tx3)') + '">' + (over ? curSym() + Math.round(Math.abs(remaining)) + ' over' : curSym() + Math.round(remaining) + ' left') + '</div>' +
    '</div>';
  }).join('');
}

// ── NET WORTH (assets + linked to debts) ─────────────────────
function openAssetLogger(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:14px">Add asset</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px">Cash, savings accounts, investments, property, vehicles. Anything that has value.</p>' +
    '<div class="eyebrow">Asset name</div>' +
    '<input type="text" id="asset-name" placeholder="e.g. Savings account, car, ETF holdings" style="margin-bottom:10px">' +
    '<div class="eyebrow">Current value ('+curSym()+')</div>' +
    '<input type="number" id="asset-value" step="0.01" placeholder="0.00" style="margin-bottom:14px">' +
    '<button class="btn primary" onclick="saveAsset()" style="margin-bottom:8px">Save asset</button>' +
    '<button class="btn" onclick="closeModal(this)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
  setTimeout(() => document.getElementById('asset-name')?.focus(), 100);
}
function saveAsset(){
  const name = document.getElementById('asset-name')?.value.trim();
  const value = parseFloat(document.getElementById('asset-value')?.value || 0);
  if(!name || value <= 0){ showToast('Need name + value', 'Both are required.'); return; }
  const list = ls('totry_assets') || [];
  list.unshift({id: Date.now(), name, value, addedAt: new Date().toISOString(), updatedAt: new Date().toISOString()});
  ls('totry_assets', list);
  document.querySelector('.modal-bg.open')?.remove();
  renderNetWorth();
  showToast('Asset added', name);
  haptic('success');
}
function updateAsset(id){
  const list = ls('totry_assets') || [];
  const a = list.find(a => a.id === id);
  if(!a) return;
  openFormModal('Update '+a.name, 'Current value of this asset.',
    [ {id:'value', label:'Value', type:'number', prefix:curSym(), placeholder:'e.g. 8400', value: a.value} ],
    'Save',
    (vals) => {
      const v = parseFloat(vals.value);
      if(isNaN(v) || v < 0) return 'Enter a value of 0 or more.';
      a.value = v; a.updatedAt = new Date().toISOString();
      ls('totry_assets', list); if(typeof syncToCloud==='function') syncToCloud(); renderNetWorth();
      return true;
    });
}
async function deleteAsset(id){
  if(!(await askConfirm('Remove this asset?'))) return;
  const list = ls('totry_assets') || [];
  const next = list.filter(a => a.id !== id);
  // Tombstone the removal so the cloud union cannot resurrect it — see deleteTransaction.
  try{ if(typeof tombstoneRemoved === 'function') tombstoneRemoved('totry_assets', list, next); }catch(_){ }
  ls('totry_assets', next);
  renderNetWorth();
}
function renderNetWorth(){
  const assets = ls('totry_assets') || [];
  const summary = document.getElementById('networth-summary');
  const box = document.getElementById('assets-list');
  if(!summary || !box) return;
  
  const totalAssets = assets.reduce((s, a) => s + (a.value || 0), 0);
  loadF();
  const totalDebts = (typeof debts !== 'undefined' && debts) ? debts.reduce((s, d) => s + (d.t - d.p), 0) : 0;
  const netWorth = totalAssets - totalDebts;
  
  summary.innerHTML = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' +
    '<div style="text-align:center;background:var(--bg3);border-radius:8px;padding:10px"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em">Assets</div><div style="font-size:14px;color:var(--gr);margin-top:3px">'+curSym() + Math.round(totalAssets).toLocaleString() + '</div></div>' +
    '<div style="text-align:center;background:var(--bg3);border-radius:8px;padding:10px"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em">Debts</div><div style="font-size:14px;color:var(--re);margin-top:3px">'+curSym() + Math.round(totalDebts).toLocaleString() + '</div></div>' +
    '<div style="text-align:center;background:var(--bg3);border-radius:8px;padding:10px;border:1px solid var(--go-bd)"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em">Net</div><div style="font-size:14px;color:' + (netWorth >= 0 ? 'var(--gr)' : 'var(--re)') + ';margin-top:3px">'+curSym() + Math.round(netWorth).toLocaleString() + '</div></div>' +
  '</div>';
  
  if(!assets.length){
    box.innerHTML = '<p style="font-size:12px;color:var(--tx3);text-align:center;padding:14px;font-style:italic">Add assets to see your full net worth.</p>';
    return;
  }
  box.innerHTML = assets.map(a => 
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd);font-size:12px">' +
      '<div style="flex:1;min-width:0;cursor:pointer" onclick="updateAsset(' + a.id + ')"><div style="color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + a.name + '</div><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">Tap to update</div></div>' +
      '<div style="display:flex;align-items:center;gap:8px"><span style="font-family:DM Mono,monospace;color:var(--gr)">'+curSym() + Math.round(a.value).toLocaleString() + '</span><button onclick="deleteAsset(' + a.id + ')" style="background:none;border:none;color:var(--tx3);font-size:14px;cursor:pointer">×</button></div>' +
    '</div>'
  ).join('');
}
function addDebt(){loadF();const n=document.getElementById('dn').value.trim(),t=parseFloat(document.getElementById('dt').value||'0'),p=parseFloat(document.getElementById('dp').value||'0'),due=document.getElementById('dd').value,interest=parseFloat(document.getElementById('di')?.value||'0')||0;
  // Was a bare `if(!n||t<=0)return;`. Someone who filled in the amount and the due date but tapped
  // "Add this debt" before typing who they owe got NOTHING: no row, no toast, no hint which field
  // was the problem — indistinguishable from the button being broken.
  if(!n){ if(typeof showToast==='function') showToast('Who is it owed to?','Give the debt a name so you can tell them apart.'); return; }
  if(!(t>0)){ if(typeof showToast==='function') showToast('How much is owed?','Enter the total amount \u2014 it needs a number above zero.'); return; }
  if(p > t){ if(typeof showToast==='function') showToast('Paid is more than the total','Check the two numbers \u2014 you cannot have paid off more than the debt.'); return; }
  // Same as vices: the tombstone written when a debt is removed is keyed on the lowercased name,
  // so adding that name back has to revoke it or the next pull deletes it again.
  try{ if(typeof tombstoneRevoke==='function') tombstoneRevoke('totry_f', String(n).toLowerCase()); }catch(_){ }
  debts.push({n,t,p,due,interest});['dn','dt','dp','dd','di'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});saveF();renderFinance();}
// A debt could be created and paid down but never CORRECTED. A typo in the name, a total entered as
// 1200 instead of 12000, an interest rate learned later, a card that was closed — all of it was
// permanent, and the freedom date was computed off the wrong number for as long as the app lived.
async function editDebt(idx){
  loadF();
  const d = debts[Number(idx)];
  if(!d){ if(typeof showToast==='function') showToast('That debt is gone','It may have been removed on another device.'); return; }
  openFormModal('Edit debt', 'Correct the details, or remove it if it no longer applies.',
    [ {id:'n', label:'Owed to', type:'text', value:d.n||''},
      {id:'t', label:'Total owed', type:'number', prefix:curSym(), value:(d.t!=null?d.t:'')},
      {id:'p', label:'Paid so far', type:'number', prefix:curSym(), value:(d.p!=null?d.p:'')},
      {id:'due', label:'Due date (optional)', type:'date', value:d.due||''},
      {id:'interest', label:'Interest % per year (optional)', type:'number', value:(d.interest!=null?d.interest:'')} ],
    'Save changes',
    function(v){
      const name = (v.n||'').trim();
      if(!name) return 'Give the debt a name so you can tell them apart.';
      const t = parseFloat(v.t);
      if(!(t>0)) return 'The total owed needs to be a number above zero.';
      let p = parseFloat(v.p); if(isNaN(p) || p<0) p = 0;
      // Paid can never exceed the total: that would render a negative remaining and a bar past 100%.
      if(p > t) p = t;
      let interest = parseFloat(v.interest); if(isNaN(interest) || interest<0) interest = '';
      loadF();
      const cur = debts[Number(idx)];
      if(!cur) return 'That debt is gone \u2014 close this and try again.';
      cur.n = name; cur.t = t; cur.p = p; cur.due = v.due||''; cur.interest = interest;
      saveF();
      if(typeof syncToCloud==='function') syncToCloud();
      renderFinance(); try{ calcDebtFreeDate(); }catch(_){ }
      if(typeof haptic==='function') haptic('success');
      if(typeof showToast==='function') showToast('Updated', name+' saved.');
      return true;
    });
  // A remove option, inside the same sheet, guarded — this is part of someone's record.
  try{
    const m = document.getElementById('form-modal');
    const box = m && m.querySelector('.modal');
    if(box){
      const del = document.createElement('button');
      del.className='btn';
      del.style.cssText='margin-top:8px;background:none;border:1px solid var(--re-bd);color:var(--re)';
      del.textContent='Remove this debt';
      del.onclick=async function(){
        if(!(await askConfirm('Remove '+(d.n||'this debt')+'? Payments you already logged against it stay in your history.'))) return;
        loadF();
        const _gone = debts[Number(idx)];
        debts.splice(Number(idx),1);
        // Tell every other device it was removed on purpose, or the cloud union brings it back.
        try{ if(_gone && _gone.n && typeof _tombAdd === 'function') _tombAdd('totry_f', String(_gone.n).toLowerCase()); }catch(_){ }
        saveF();
        if(typeof syncToCloud==='function') syncToCloud();
        m.remove();
        renderFinance(); try{ calcDebtFreeDate(); }catch(_){ }
        if(typeof showToast==='function') showToast('Removed', 'That debt is off your list.');
      };
      box.appendChild(del);
    }
  }catch(_){ }
}
// One correct debt ordering for BOTH the list and the payday allocator. Avalanche ranks by interest
// (highest first, ties → smaller balance), but ONLY when interest is actually known; otherwise it
// falls back to smallest-balance-first so the "attack this first" star is never on an arbitrary debt.
// ── HONEST DEBT MATH ──────────────────────────────────────────────────────────────────────────
// A freedom date you can plan your life around has to include what the debt actually COSTS. The old
// projection was owed ÷ average-payment: interest ignored entirely, and every logged payment treated
// as a month (pay weekly and the date was nonsense). This simulates month by month with real
// compounding, applying the payment in the chosen strategy's order — and tells the truth when a
// payment is too small to ever clear the balance, instead of printing a comforting date.
function _debtMonthlyRate(d){ return (parseFloat(d.interest)||0)/100/12; }
function _debtBalance(d){ return Math.max(0, (parseFloat(d.t)||0) - (parseFloat(d.p)||0)); }
function totalMonthlyInterest(list){
  return (list||[]).reduce((a,d)=> a + _debtBalance(d)*_debtMonthlyRate(d), 0);
}
// Real monthly payment rate from dated history (fixes "every payment = one month").
function monthlyPaymentRate(){
  // Accept `date` as well as `ts`: the main logging path wrote only `date` for a long time, so requiring
  // ts made every one of those payments invisible and this function returned null forever.
  const _T=p=>new Date(p.ts||p.date);
  const pays=(ls('totry_payments')||[]).filter(p=>p&&(parseFloat(p.amt)||0)>0&&(p.ts||p.date))
    .sort((a,b)=>_T(a)-_T(b));
  if(pays.length<2) return null;
  const spanDays=(_T(pays[pays.length-1])-_T(pays[0]))/86400000;
  // FENCEPOST. n payments span only n-1 gaps, but they COVER n periods. Dividing the total by the span
  // alone overstated the rate by n/(n-1) — 20% with six payments and a full 100% with two, which is
  // exactly where a new user starts. An overstated rate means a debt-free date that arrives sooner than
  // the money ever will, and it also suppresses the "the interest is outrunning your payments" warning,
  // which is the one thing that person most needs to hear. Scale the span up by one average interval so
  // the last payment is credited with the period it actually bought.
  // A SPAN OF ONE DAY IS NOT A MONTHLY RATE. The payday allocator books several payments in a single tap,
  // so pays.length >= 2 is satisfied instantly while spanDays is ~0 — and with months floored at 1 below,
  // the entire lump was reported as the amount this person pays EVERY month. One tap of the allocator
  // therefore produced a debt-free date years too soon, on the screen someone is most likely to believe.
  // Distinct DAYS is the honest unit, and a real month of history is the honest minimum: until then this
  // returns null, which callers already treat as "not enough dated history to say" and print no date.
  const distinctDays = new Set(pays.map(p => new Date(_T(p)).toLocaleDateString('en-AU'))).size;
  if(distinctDays < 2 || spanDays < 25) return null;
  // PAYMENT OCCASIONS, NOT PAYMENT RECORDS. Paying three debts on payday is three records and ONE
  // occasion; using the record count inflates the covered span, which inflates the monthly rate,
  // which brings the debt-free date forward. Measured on six months of two-debts-on-one-day history:
  // it reported $605/mo against a true $550/mo, and a $12,000 balance cleared "in 20 months" instead
  // of 22. The more debts a person is juggling, the more optimistic the date they are told.
  const n=distinctDays;
  const covered=spanDays * (n/(n-1));
  const months=Math.max(1, covered/30.44);            // never claim a rate faster than monthly
  const total=pays.reduce((a,p)=>a+(parseFloat(p.amt)||0),0);
  return total/months;
}
// Simulate payoff. Returns {months, interestPaid} | {neverClears, monthlyInterest} | null.
function projectPayoff(list, monthlyPayment, strategy){
  const items=_sortDebtsByStrategy(list||[], strategy)
    .map(d=>({ b:_debtBalance(d), r:_debtMonthlyRate(d) })).filter(x=>x.b>0);
  if(!items.length || !(monthlyPayment>0)) return null;
  const firstInterest=items.reduce((a,x)=>a+x.b*x.r,0);
  // If the payment can't even cover the interest, the balance GROWS. Say so — never print a date.
  if(monthlyPayment<=firstInterest) return { neverClears:true, monthlyInterest:Math.round(firstInterest) };
  let months=0, interest=0;
  while(items.some(x=>x.b>0.01) && months<600){
    months++;
    items.forEach(x=>{ const i=x.b*x.r; x.b+=i; interest+=i; });
    let pay=monthlyPayment;
    for(const x of items){ if(pay<=0) break; const use=Math.min(pay,x.b); x.b-=use; pay-=use; }
  }
  return { months, interestPaid: Math.round(interest) };
}

function _sortDebtsByStrategy(list, strategy){
  const arr=[...list];
  const anyInterest=arr.some(d=>(parseFloat(d.interest)||0)>0);
  if(strategy==='avalanche' && anyInterest){
    return arr.sort((a,b)=> ((parseFloat(b.interest)||0)-(parseFloat(a.interest)||0)) || ((a.t-a.p)-(b.t-b.p)));
  }
  return arr.sort((a,b)=>(a.t-a.p)-(b.t-b.p)); // snowball, or avalanche w/o interest data
}
// updateSavings() lived here. It read #usa-in and #india-in, neither of which exists in the markup any
// more, so it would have thrown on the first line if anything had called it — and nothing did. Savings
// moved to totry_finance_goals (see the migration in renderSavingsGoals). Deleted rather than left
// lying around, because dead code that looks like a savings entry point is how the Zakat modal came to
// read usaS/indiaS and always show $0.
function calcViceSavings(){
  const w=parseFloat(document.getElementById('weed-s').value||'0'),va=parseFloat(document.getElementById('vape-s').value||'0'),g=parseFloat(document.getElementById('gamb-s').value||'0'),o=parseFloat(document.getElementById('other-s').value||'0');
  const weekly=w+va+g+o;if(!weekly){ if(typeof showToast==='function') showToast('Add a weekly amount','Enter at least one vice\u2019s weekly spend to calculate.'); return; }
  const since=document.getElementById('sober-since').value;let weeks=1;
  if(since){const days=Math.floor((Date.now()-new Date(since))/86400000);weeks=Math.max(1,Math.floor(days/7));}
  const saved=Math.round(weekly*weeks);
  // Persist below, but let the one owner decide what is displayed — see reclaimedFigure.
  if(typeof renderReclaimed !== 'function'){ const sn=document.getElementById('saved-num'); if(sn) sn.textContent=curSym()+saved.toLocaleString(); }
  const sd=document.getElementById('saved-desc');if(sd)sd.textContent=curSym()+weekly+'/week \u00d7 '+weeks+' weeks. '+curSym()+saved.toLocaleString()+' redirected.';
  ls('totry_vs',{weekly,since,saved,fields:{w,va,g,o}});
  if(typeof renderReclaimed === 'function') renderReclaimed();
  if(typeof syncToCloud==='function') syncToCloud();
  haptic('success'); if(typeof showToast==='function') showToast('Saved',curSym()+saved.toLocaleString()+' redirected from vices.');
}
function openPayday(){document.getElementById('payday-modal').classList.add('open');}
function calcPayday(){
  loadF();const amt=parseFloat(document.getElementById('paid-amt').value||'0');if(!amt)return;
  document.getElementById('payday-modal').classList.remove('open');go('money');
  const result=document.getElementById('payday-result');result.style.display='block';result.scrollIntoView({behavior:'smooth'});
  const strategy=ls('totry_debt_strategy')||'snowball';
  let rem=amt,steps=[];
  const buf=Math.round(amt*0.05);steps.push({n:1,kind:'buffer',title:'Emergency buffer (5%)',desc:'Before anything. Non-negotiable.',amt:buf});rem-=buf;
  // idx must be the ORIGINAL index (map before filter) so an applied payment lands on the right debt.
  const sortedD=_sortDebtsByStrategy(debts.map((d,i)=>({...d,idx:i})).filter(d=>(d.t-d.p)>0), strategy);
  if(sortedD.length){const top=sortedD[0],pay=Math.min(Math.round(rem*0.4),Math.round(top.t-top.p));steps.push({n:2,kind:'debt',debtIdx:top.idx,title:top.n+' \u2014 '+strategy+' priority',desc:'Your strategy says attack this first.',amt:pay});rem-=pay;}
  if(sortedD.length>1){const s2=sortedD[1],p2=Math.min(Math.round(rem*0.25),Math.round(s2.t-s2.p));steps.push({n:3,kind:'debt',debtIdx:s2.idx,title:s2.n,desc:'Second priority debt.',amt:p2});rem-=p2;}
  const saveAmt=Math.round(rem*0.5);steps.push({n:steps.length+1,kind:'savings',title:'Savings goals',desc:'Future you will thank current you.',amt:saveAmt});rem-=saveAmt;
  if(rem>0)steps.push({n:steps.length+1,kind:'other',title:'Remaining / family',desc:'Flexible. Never take advantage.',amt:rem});
  window.__paydaySteps = steps;
  // A plan you have to re-type by hand isn't a plan, it's homework. "Apply" actually books the debt
  // payments and the savings contribution \u2014 the feature finishing what it started.
  const canApply = steps.some(s => (s.kind==='debt' || s.kind==='savings') && s.amt > 0);
  result.innerHTML='<h4>Allocation for '+curSym()+amt.toLocaleString()+'</h4>'+steps.map(s=>'<div class="pay-step"><div class="pay-n">'+s.n+'</div><div style="flex:1"><div class="pay-title">'+s.title+'</div><div class="pay-desc">'+s.desc+'</div></div><div class="pay-amt">'+curSym()+s.amt.toLocaleString()+'</div></div>').join('')+
    (canApply ? '<button class="btn primary" style="margin-top:14px" onclick="applyPaydayAllocation()">Apply this \u2014 book it all</button>' : '')+
    '<button class="btn" style="margin-top:8px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)" onclick="document.getElementById(\'payday-result\').style.display=\'none\'">Just showing me</button>';
}
// Book the allocation for real: pay down the named debts (and record each payment so the debt-free
// projection has data), and move the savings slice into the top goal. One tap instead of re-entering
// every number by hand.
function applyPaydayAllocation(){
  const steps = window.__paydaySteps || [];
  if(!steps.length) return;
  loadF();
  let onDebts = 0, toSavings = 0, goalName = '';
  const pays = ls('totry_payments') || [];
  steps.forEach(s => {
    if(s.kind==='debt' && s.debtIdx != null && debts[s.debtIdx] && s.amt > 0){
      const d = debts[s.debtIdx];
      d.p = Math.min((parseFloat(d.p)||0) + s.amt, d.t); // never overpay past the total
      onDebts += s.amt;
      pays.push({ amt: s.amt, ts: new Date().toISOString(), debt: d.n });
    }
    if(s.kind==='savings' && s.amt > 0){
      const goals = ls('totry_finance_goals') || [];
      if(goals.length){
        const _pg = (typeof _priorityGoal === 'function') ? _priorityGoal() : null;
        let _gi = 0;
        if(_pg){ const _f = goals.findIndex(x => (x.id != null && x.id === _pg.id) || x.name === _pg.name); if(_f > -1) _gi = _f; }
        goals[_gi].current = (parseFloat(goals[_gi].current)||0) + s.amt;
        ls('totry_finance_goals', goals); toSavings += s.amt; goalName = goals[_gi].name||'your goal';
      }
    }
  });
  if(pays.length) ls('totry_payments', pays.slice(-200));
  saveF();
  try{ if(typeof syncToCloud==='function') syncToCloud(); }catch(_){}
  try{ renderFinance(); if(typeof renderFinanceGoals==='function') renderFinanceGoals(); }catch(_){}
  const el=document.getElementById('payday-result'); if(el) el.style.display='none';
  try{ if(typeof haptic==='function') haptic('success'); }catch(_){}
  const bits=[];
  if(onDebts>0) bits.push(curSym()+Math.round(onDebts).toLocaleString()+' onto your debts');
  if(toSavings>0) bits.push(curSym()+Math.round(toSavings).toLocaleString()+' to '+goalName);
  if(typeof showToast==='function') showToast(bits.length?'Booked \u2713':'Nothing to book', bits.length?bits.join(' \u00b7 '):'Add a debt or a savings goal first.');
}
