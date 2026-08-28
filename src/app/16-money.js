let debts=[],usaS=0,indiaS=0;
function loadF(){const f=ls('totry_f');if(f){debts=f.d||[];usaS=f.u||0;indiaS=f.i||0;}else{debts=[];usaS=0;indiaS=0;}}
function saveF(){ls('totry_f',{d:debts,u:usaS,i:indiaS});}
function getDebtStr(){loadF();return debts.map(d=>d.n+' '+curSym()+Math.round(d.t-d.p)+' remaining').join(', ')||'No debts logged';}
function setDebtStrategy(type, fromUser){
  ls('totry_debt_strategy',type);
  ['snowball','avalanche'].forEach(t=>{const el=document.getElementById('strategy-'+t);if(el)el.classList.toggle('active',t===type);});
  // Only react to a real TAP — this also runs on every app launch to restore the saved choice, and
  // the hint/re-render must not fire then (a toast on every boot would be maddening).
  if(fromUser){
    try{
      if(type==='avalanche'){
        loadF();
        if(!debts.some(d=>(parseFloat(d.interest)||0)>0) && typeof showToast==='function'){
          showToast('Add interest rates','Avalanche ranks by interest — add each debt’s rate % so I can order them. Until then I’ll go smallest-first.');
        }
      }
    }catch(_){}
    if(typeof renderFinance==='function') renderFinance();
  }
}
// The two things a stewardship tool owes you that we were never saying: what the debt actually
// COSTS you each month, and whether the strategy you picked is genuinely the cheaper one. Honest and
// non-partial — snowball really does win on adherence, so we say that rather than just pushing math.
function renderDebtTruth(){
  const dl=document.getElementById('debt-list'); if(!dl) return;
  const old=document.getElementById('debt-truth'); if(old) old.remove();
  loadF();
  const active=debts.filter(d=>_debtBalance(d)>0); if(!active.length) return;
  const bits=[];
  const mi=totalMonthlyInterest(active);
  if(mi>=1) bits.push('Interest alone takes <b style="color:var(--re)">'+curSym()+Math.round(mi).toLocaleString()+'/month</b> before a dollar touches the balance.');
  const rate=monthlyPaymentRate();
  if(rate && active.length>1 && active.some(d=>(parseFloat(d.interest)||0)>0)){
    const av=projectPayoff(active, rate, 'avalanche');
    const sn=projectPayoff(active, rate, 'snowball');
    if(av&&sn&&!av.neverClears&&!sn.neverClears){
      const save=(sn.interestPaid||0)-(av.interestPaid||0);
      const cur=ls('totry_debt_strategy')||'snowball';
      if(save>0) bits.push(cur==='avalanche'
        ? 'Your Avalanche order saves about <b style="color:var(--gr)">'+curSym()+save.toLocaleString()+'</b> in interest versus smallest-first.'
        : 'Avalanche would save about <b style="color:var(--gr)">'+curSym()+save.toLocaleString()+'</b> in interest — but Snowball wins on momentum, and the best plan is the one you keep doing.');
    }
  }
  if(!bits.length) return;
  const el=document.createElement('div'); el.id='debt-truth';
  el.style.cssText='margin-top:10px;font-size:12px;color:var(--tx3);line-height:1.6';
  el.innerHTML=bits.join(' ');
  dl.after(el);
}

// What the vice was costing, per MONTH — the money that's now free to go somewhere.
function monthlyReclaimRate(){
  try{
    loadV();
    return (vices||[]).reduce((sum,v)=>{
      const amt=parseFloat(v.costAmount)||0; if(amt<=0) return sum;
      const per=v.costPer||'week';
      if(per==='day') return sum + amt*30.44;
      if(per==='use') return sum + amt*(parseFloat(v.costUses)||7)*(30.44/7);
      // 'purchase' is a real option in the cost picker and had NO branch here, so it fell through to the
      // weekly formula: a $120 buy that lasts a month was counted as $120 a WEEK — $521/month instead of
      // $122, a 4.3x overstatement of what staying clean is giving back. viceSpendPicture() already
      // models it properly (one buy lasts lastsDays); match it, or the two disagree on screen.
      if(per==='purchase') return sum + amt*(30.44/Math.max(1, parseFloat(v.lastsDays)||30));
      return sum + amt*(30.44/7);                      // per week
    },0);
  }catch(_){ return 0; }
}
// Sobriety, priced. Put the reclaimed money on the debt and show how much sooner freedom comes and
// how much interest it saves. This is the whole thesis of the app in one sentence — and no money
// app can say it, because none of them know why you're clean.
function renderReclaimedBuysFreedom(){
  const host=document.getElementById('saved-desc'); if(!host) return;
  const old=document.getElementById('reclaim-buys-freedom'); if(old) old.remove();
  loadF();
  const owed=debts.reduce((a,d)=>a+_debtBalance(d),0); if(owed<=0) return;
  const reclaim=monthlyReclaimRate(); if(!(reclaim>0)) return;
  const base=monthlyPaymentRate(); if(!base) return;          // need real payment history to compare
  const strategy=ls('totry_debt_strategy')||'snowball';
  const now=projectPayoff(debts, base, strategy);
  const boosted=projectPayoff(debts, base+reclaim, strategy);
  if(!now||!boosted) return;
  let line='';
  if(now.neverClears && !boosted.neverClears){
    line='Right now the interest is outrunning your payments — but adding the '+curSym()+Math.round(reclaim).toLocaleString()+'/month you’re reclaiming flips it: debt-free in about '+boosted.months+' months. Staying clean is what gets you above the line.';
  } else if(!now.neverClears && !boosted.neverClears){
    const sooner=now.months-boosted.months;
    const saved=Math.max(0,(now.interestPaid||0)-(boosted.interestPaid||0));
    if(sooner<=0 && saved<=0) return;
    line='That '+curSym()+Math.round(reclaim).toLocaleString()+'/month, put straight on your debt, makes you free '+
      (sooner>0?('<b style="color:var(--gr)">'+sooner+' month'+(sooner===1?'':'s')+' sooner</b>'):'sooner')+
      (saved>0?(' and saves <b style="color:var(--gr)">'+curSym()+saved.toLocaleString()+'</b> in interest'):'')+
      '. That’s what staying clean is worth, in months of your life.';
  } else { return; }
  const el=document.createElement('div');
  el.id='reclaim-buys-freedom';
  el.style.cssText='margin-top:10px;padding-top:10px;border-top:1px solid var(--go-bd);font-size:12.5px;color:var(--tx2);line-height:1.6';
  el.innerHTML=line;
  host.after(el);
}

function calcDebtFreeDate(){
  loadF();
  const owed=debts.reduce((a,d)=>a+_debtBalance(d),0); if(owed<=0) return;
  const rate=monthlyPaymentRate(); if(!rate) return;      // needs dated history to be honest
  const strategy=ls('totry_debt_strategy')||'snowball';
  const proj=projectPayoff(debts, rate, strategy);
  if(!proj) return;
  const dh=document.getElementById('df-hero'); if(dh) dh.style.display='block';
  const dd=document.getElementById('df-date');
  const ddesc=document.getElementById('df-desc');
  // The honest case first: if the payment can't cover the interest, there IS no freedom date yet.
  // Saying so plainly is worth more than a comforting number that will never arrive.
  if(proj.neverClears){
    if(dd) dd.textContent='Not yet on track';
    if(ddesc) ddesc.innerHTML='At '+curSym()+Math.round(rate).toLocaleString()+'/month the interest ('+curSym()+proj.monthlyInterest.toLocaleString()+'/mo) is eating the payment — the balance grows. Getting above that line is the whole battle, and every dollar reclaimed goes straight at it.';
    return;
  }
  const fd=new Date(); fd.setMonth(fd.getMonth()+proj.months);
  if(dd) dd.textContent=fd.toLocaleDateString('en-AU',{month:'long',year:'numeric'});
  if(ddesc){
    const interestBit = proj.interestPaid>0 ? (' · '+curSym()+proj.interestPaid.toLocaleString()+' of that is interest') : '';
    ddesc.textContent='~'+proj.months+' month'+(proj.months===1?'':'s')+' at '+curSym()+Math.round(rate).toLocaleString()+'/month'+interestBit;
  }
}
// A money tab full of zeros teaches a person nothing and quietly tells them they're fine. Until it
// knows something real, this tab has one job. Once it does, it leads with the read — and says how
// stale that read has gone, because a balance sheet nobody feeds stops being true.
function reclaimedFigure(){
  // The single source of truth for #saved-num — see the note above. Returns {amount, desc, model}.
  try{
    if(typeof totalReclaimed === 'function'){
      let hasCost = false;
      try{ loadV(); hasCost = (vices||[]).some(v => v && (parseFloat(v.costAmount)||0) > 0); }catch(_){ }
      if(hasCost){
        return { amount: totalReclaimed(), model: 'per-vice',
                 desc: 'Reclaimed by staying clean \u2014 that\u2019s money toward your debt and your freedom.' };
      }
    }
  }catch(_){ }
  // No per-vice cost set: fall back to the legacy flat estimate the person typed in, if any.
  try{
    const vs = ls('totry_vs');
    if(vs && vs.saved != null){
      return { amount: vs.saved, model: 'legacy',
               desc: curSym()+vs.weekly+'/week \u00d7 '+(vs.weeks || Math.max(1, Math.round(vs.saved/(vs.weekly||1))))+' weeks.' };
    }
  }catch(_){ }
  return { amount: 0, model: 'none', desc: '' };
}
function renderReclaimed(){
  const r = reclaimedFigure();
  const sn = document.getElementById('saved-num');
  const sd = document.getElementById('saved-desc');
  if(sn) sn.textContent = curSym() + Math.round(r.amount).toLocaleString();
  if(sd && r.desc) sd.textContent = r.desc;
  return r;
}
function showMoneyMore(){
  document.querySelectorAll('#tab-money .money-more').forEach(el => { el.style.display = ''; });
  const row = document.getElementById('money-more-row'); if(row) row.style.display = 'none';
  const first = document.querySelector('#tab-money .money-more');
  if(first) try{ first.scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){ }
  if(typeof haptic === 'function') haptic('tap');
}

function renderMoneyGate(){
  const gate = document.getElementById('money-gate');
  const readCard = document.getElementById('money-read-card');
  if(!gate || !readCard) return;
  const tx = ls('totry_transactions')||[];
  let hasDebts = false;
  try{ loadF(); hasDebts = (debts && debts.length > 0); }catch(_){}
  let hasReclaimed = false;
  try{ hasReclaimed = (typeof totalReclaimed==='function') && totalReclaimed() > 0; }catch(_){ }
  // Emptiness has to mean empty of EVERYTHING this tab can hold, not just of transactions, debts and
  // reclaimed money. Someone with a savings goal, a Netflix subscription, a bill, a budget, an asset,
  // a giving pledge or a poker ledger is a real user of this screen, and the collapse below would
  // have taken their own data off it. Any one of these is enough to say the person has started.
  let hasAnything = false;
  try{
    hasAnything = (usaS > 0) || (indiaS > 0) ||
      ['totry_subscriptions','totry_bills','totry_budgets','totry_assets','totry_giving',
       'totry_giving_pledge','totry_zakat','totry_poker_sessions','totry_family_contrib',
       'totry_family_target','totry_payments'].some(function(k){
         const v = ls(k);
         return Array.isArray(v) ? v.length > 0 : !!(v && (typeof v !== 'object' || Object.keys(v).length));
       });
  }catch(_){ }
  const empty = tx.length < 5 && !hasDebts && !hasReclaimed && !hasAnything;

  // The empty-state heroes are the ones that lie loudest — a debt-free date of "—" and $0
  // reclaimed read as "all good" to someone who has never told the app anything.
  ['df-hero','saved-hero'].forEach(id => { const el=document.getElementById(id); if(el) el.style.display = empty ? 'none' : ''; });
  const mg = document.querySelector('#tab-money .mg'); if(mg) mg.style.display = empty ? 'none' : '';

  // Thirteen fully-built empty forms used to sit directly beneath the sentence "I don't know anything
  // about your money yet" — 2,839px of debt fields, subscription rows, budget setters and a poker
  // ledger, all blank, all shouting at someone who has not told the app a single number. The gate is
  // right; what followed it made the gate look like a lie. When there is nothing to show, the way in
  // IS the screen, and everything else waits behind one row that says plainly what is in there.
  const more = document.querySelectorAll('#tab-money .money-more');
  more.forEach(el => { el.style.display = empty ? 'none' : ''; });
  const moreRow = document.getElementById('money-more-row');
  if(moreRow) moreRow.style.display = empty ? '' : 'none';

  if(empty){
    readCard.innerHTML = '';
    gate.innerHTML = '<div class="card" style="margin-bottom:14px">'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:21px;font-style:italic;color:var(--tx);margin-bottom:8px">I don’t know anything about your money yet.</div>'+
      '<div style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:14px">Most people can’t say where theirs actually goes — that’s not a failing, it’s just never been shown to them. Export a statement from your banking app and I’ll read it back to you: what comes in, where it leaves, and the one place worth locking in. It’s parsed on your phone and goes nowhere.</div>'+
      '<button class="btn primary" onclick="openCSVImport()" style="margin-bottom:8px">Import a bank statement</button>'+
      '<button class="btn" onclick="openTransactionLogger()">I’ll add it manually</button>'+
    '</div>';
    return;
  }
  gate.innerHTML = '';

  const r = spendingRead();
  if(!r){ readCard.innerHTML = ''; return; }
  const money = n => curSym()+Math.abs(Math.round(n)).toLocaleString();
  const staleDays = Math.floor((Date.now() - r.to.getTime())/86400000);
  const neg = r.netPerMonth < 0;
  // THE FLAG EXISTS; THIS CARD WAS NOT READING IT. spendingRead exports enoughForMonthly precisely
  // so a caller can refuse to say "/mo" before there is a month behind it — and only the fuel plan
  // was using it. This card is the Money tab's LEAD, headed "Your money, honestly", and from five
  // transactions inside one week it printed "+$3,622/mo". Worse, "See the full read" directly
  // beneath it opens a panel that labels the identical data "the last 5 days of your money" — the
  // same object contradicting itself one tap apart. Say the span they actually have.
  const _thin = r.enoughForMonthly === false;
  const _spanLbl = 'over ' + Math.max(1, Math.round(r.spanDays || 0)) + ' days';
  const _net = _thin ? (r.income - r.spend) : r.netPerMonth;
  const _negNow = _thin ? (_net < 0) : neg;
  readCard.innerHTML = '<div class="card" style="margin-bottom:14px">'+
    '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">'+
      '<div class="card-hd" style="margin-bottom:0">Your money, honestly</div>'+
      '<span style="font-family:DM Mono,monospace;font-size:15px;color:'+(_negNow?'var(--re)':'var(--gr)')+'">'+(_negNow?'−':'+')+money(_net)+(_thin?'':'/mo')+'</span>'+
    '</div>'+
    (_thin ? '<div style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin-bottom:10px">That is '+_spanLbl+' — not a month yet. I will not turn a few days into a monthly figure and call it honest.</div>' : '')+
    // The "biggest movable cost" is a per-MONTH number too, so it waits for the same evidence.
    (r.lockIn && !_thin ? '<div style="font-size:12.5px;color:var(--tx2);line-height:1.6;margin-bottom:10px">Biggest movable cost: <b style="color:var(--tx)">'+r.lockIn.name+'</b>, '+money(r.lockIn.perMonth)+' a month.</div>' : '')+
    (staleDays > 9
      ? '<div style="font-size:11.5px;color:var(--go);line-height:1.5;margin-bottom:10px">Your last statement stops '+staleDays+' days ago. A balance sheet nobody feeds stops being true — import the latest when you get a minute.</div>'
      : '<div style="font-size:11px;color:var(--tx3);margin-bottom:10px">Up to date as of '+r.to.toLocaleDateString('en-AU')+'.</div>')+
    '<div style="display:flex;gap:8px">'+
      '<button class="btn" style="flex:1;width:auto;padding:9px;font-size:12px" onclick="openSpendingRead()">See the full read</button>'+
      '<button class="btn" style="flex:1;width:auto;padding:9px;font-size:12px;background:transparent;border:1px solid var(--bd)" onclick="openCSVImport()">Update</button>'+
    '</div>'+
  '</div>';
}

function renderFinance(){
  loadF();
  try{ renderMoneyGate(); }catch(_){}
  const owed=debts.reduce((a,d)=>a+(d.t-d.p),0),paid=debts.reduce((a,d)=>a+d.p,0);
  ['f-debt','h-debt'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=curSym()+Math.round(owed).toLocaleString();});
  const fp=document.getElementById('f-paid');if(fp)fp.textContent=curSym()+Math.round(paid).toLocaleString();
  const fu=document.getElementById('f-usa');if(fu)fu.textContent=curSym()+Math.round(usaS).toLocaleString();
  const fi=document.getElementById('f-india');if(fi)fi.textContent=curSym()+Math.round(indiaS).toLocaleString();
  const dl=document.getElementById('debt-list');if(!dl)return;dl.innerHTML='';
  const _noDebts = !debts.length;
  if(_noDebts){
    dl.innerHTML='<p class="empty-note">No debts added yet</p>';
  } else {
  const strategy=ls('totry_debt_strategy')||'snowball';
  const sorted=_sortDebtsByStrategy(debts.map((d,i)=>({...d,idx:i})), strategy);
  // THE STAR GOES ON THE FIGHT, NOT THE TROPHY. Snowball sorts by smallest remaining first, and a debt
  // you have fully paid off has the smallest remaining of all — zero. So the moment someone cleared
  // their first debt, "attack this first" moved onto the one they had already beaten, and the debt
  // actually costing them interest lost the mark. The payday allocator filters cleared debts out
  // (18-money-deep.js:1065); this list never did.
  const starIdx = sorted.findIndex(d => (d.t - d.p) > 0.005);
  sorted.forEach((d,si)=>{
    const rem=d.t-d.p,pct=d.t>0?Math.round((d.p/d.t)*100):0;
    const cleared = rem <= 0.005;
    const item=document.createElement('div');item.className='debt-row';
    if(cleared) item.style.opacity='0.62';
    item.innerHTML='<div class="dr-top"><span class="dr-name">'+_escFew(d.n)+(si===starIdx?' \u2b50':'')+(cleared?' \u2713':'')+' </span><span class="dr-amt">'+(cleared?'Paid off':curSym()+Math.round(rem).toLocaleString())+'</span></div>'+
      (d.due&&!cleared?'<span class="dr-date" style="color:'+_dueColor(d.due)+'">'+_escFew(_dueLabel(d.due)||('Due: '+d.due))+'</span>':'')+
      '<div class="bar-wrap"><div class="bar" style="width:'+Math.min(100,pct)+'%"></div></div>'+
      '<div class="dr-meta"><span class="dr-paid">'+curSym()+Math.round(d.p).toLocaleString()+' paid ('+pct+'%)</span><span>'+(cleared?'Cleared \u2014 tap to edit':'Tap to log payment')+'</span><button class="dr-edit" aria-label="Edit '+_jsAttr(d.n)+'" onclick="event.stopPropagation();editDebt('+d.idx+')" style="background:none;border:none;color:var(--tx3);font-size:11px;cursor:pointer;padding:2px 6px;text-decoration:underline">Edit</button></div>';
    item.onclick=()=>{ if(cleared){ editDebt(d.idx); return; } openFormModal('Log a payment','Payment toward '+d.n+'.',[{id:'amt',label:'Amount',type:'number',prefix:curSym(),placeholder:'e.g. 200'}],'Log payment',(vals)=>{const a=parseFloat(vals.amt);if(isNaN(a)||a<=0)return 'Enter an amount greater than 0.';loadF();debts[d.idx].p=Math.min(debts[d.idx].p+a,debts[d.idx].t);saveF();const payments=ls('totry_payments')||[];payments.push({amt:a,ts:new Date().toISOString(),date:new Date().toISOString(),debt:d.n});ls('totry_payments',payments.slice(-200));if(typeof syncToCloud==='function')syncToCloud();renderFinance();calcDebtFreeDate();checkMilestones();return true;});};
    dl.appendChild(item);
  });
  }
  if(!_noDebts) calcDebtFreeDate();
  try{ renderDebtTruth(); }catch(_){}
  // Stewardship pipe: if any vice has a cost set, show the real reclaimed total (per-vice × clean
  // days) — more accurate than the legacy flat weekly estimate. Falls back to totry_vs otherwise.
  const reclaimed = (typeof totalReclaimed==='function') ? totalReclaimed() : 0;
  // Anyone with a cost or an owed amount set has something true to be told here — not only the people
  // already in the black. totalReclaimed() is max(0, avoided - owed), so it is 0 for exactly the
  // person the honest note was written for. See the note above.
  let _hasCostModel = false;
  try{ loadV(); _hasCostModel = (vices||[]).some(v => v && ((parseFloat(v.costAmount)||0) > 0 || (parseFloat(v.owed)||0) > 0)); }catch(_){ }
  if(reclaimed > 0 || _hasCostModel){
    const sd=document.getElementById('saved-desc');
    if(typeof renderReclaimed === 'function') renderReclaimed();
    // The desc below is rewritten for the behind case by the owed-note block; the figure stays 0,
    // which is the truth — nothing is reclaimed yet while the debt for past use stands.
    // SOUL-ARCHITECTURE, MONEY: "lead with the reclaimed/stewardship story, not raw debt tables."
    // This said "lead with the freedom story" and then did mg.after(sh) — placing it SECOND, beneath
    // the Paid off / Debt left figures. The thumb still met the debt table first, so the intent and
    // the code disagreed. mg.before(sh) is what the comment always meant: every clean day is real
    // money back, and that is the line the 11pm man needs above the number that shames him.
    //
    // Gated on reclaimed > 0, not on merely having a cost model. A "$0 RECLAIMED — set weekly vice
    // spend below" hero leading the screen would be worse than the debt figures: it is the
    // empty-state-that-lies problem renderMoneyGate already guards, moved to the top of the page.
    // Idempotent — it only moves when it is not already in place.
    try{
      const mg = document.querySelector('#tab-money .mg');
      const sh = document.getElementById('saved-hero');
      if(mg && sh){
        if(reclaimed > 0){ if(mg.previousElementSibling !== sh) mg.before(sh); }
        else if(mg.nextElementSibling !== sh) mg.after(sh);
      }
    }catch(_){}
    if(sd) sd.textContent='Reclaimed by staying clean — that\u2019s money toward your debt and your freedom.';
    // Honest position, not a fictional total: if money is still owed for past use, say so and show
    // what's left before they're genuinely ahead. Being clean while you owe = less behind, not ahead.
    try{
      loadV();
      const owedTotal=(vices||[]).reduce((a,v)=>a+Math.max(0,parseFloat(v.owed)||0),0);
      const avoidedTotal=(vices||[]).reduce((a,v)=>{ const p=viceSpendPicture(v); return a+(p?p.avoided:0); },0);
      const oldN=document.getElementById('reclaim-owed-note'); if(oldN) oldN.remove();
      if(owedTotal>0 && sd){
        const left=Math.max(0, owedTotal-avoidedTotal);
        const n=document.createElement('div'); n.id='reclaim-owed-note';
        n.style.cssText='margin-top:8px;font-size:12px;color:var(--tx3);line-height:1.55';
        // "That's after clearing it" was a claim the figure above could not support. totalReclaimed()
        // nets owed PER VICE and floors each at zero, so a debt on one vice never reduces the savings
        // from another — yet this compared the POOLED totals and, whenever avoided won, announced the
        // subtraction had happened. Someone $429 up on a vape with $200 still owed on weed read
        // "$429 — that's after clearing the $200". The honest pooled position is $229.
        //
        // The hero figure is left alone (it is the per-vice truth and other screens read it); the
        // note now states the pooled position rather than asserting a netting that did not occur.
        const pooledNet = avoidedTotal - owedTotal;
        n.innerHTML = left>0
          ? 'You’ve avoided <b>'+curSym()+avoidedTotal.toLocaleString()+'</b> of spending, but still owe <b style="color:var(--go)">'+curSym()+owedTotal.toLocaleString()+'</b> for past use. Clear that first — then it is all yours.'
          : 'Across everything you have avoided <b>'+curSym()+avoidedTotal.toLocaleString()+'</b> and owe <b>'+curSym()+owedTotal.toLocaleString()+'</b> for past use, so you are <b style="color:var(--gr)">'+curSym()+pooledNet.toLocaleString()+'</b> genuinely ahead.';
        sd.after(n);
      }
    }catch(_){}
    // THE THING NO MONEY APP CAN SAY: what staying clean actually BUYS. Redirect the money the vice
    // was taking onto the debt and show the freedom date move — sobriety, priced in months and
    // interest saved. Only possible because the fight and the money live in the same app.
    try{ renderReclaimedBuysFreedom(); }catch(_){}
  } else {
  const vs=ls('totry_vs');if(vs){ if(typeof renderReclaimed==='function') renderReclaimed();
    // Restore the input fields too, so it doesn't look like nothing saved when you return.
    if(vs.fields){ const set=(id,v)=>{const el=document.getElementById(id); if(el && v) el.value=v;}; set('weed-s',vs.fields.w); set('vape-s',vs.fields.va); set('gamb-s',vs.fields.g); set('other-s',vs.fields.o); }
    const ss=document.getElementById('sober-since'); if(ss && vs.since) ss.value=vs.since;
  }
  }
  renderTransactions();
}

// ── INCOME & EXPENSE TRACKING ───────────────────────────────
const EXPENSE_CATEGORIES = ['Food','Rent/bills','Transport','Health','Entertainment','Shopping','Other'];
const INCOME_CATEGORIES = ['Salary','Side income','Gift','Refund','Other'];

// Quick spend — single tap to log a recent expense without the full modal
// ── SMART CALENDAR ────────────────────────────────────────────
// Events: { id, title, type, day(0-6 Mon-Sun), start('HH:MM'), end('HH:MM'), recurring(bool), date(ISO if one-off) }
const CAL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const CAL_TYPE_COLORS = { work:'#C8A96E', class:'#8C6BB6', gym:'#5BA88A', personal:'#6B8CB6', other:'rgba(255,255,255,0.4)' };
// Keep the nutrition log from growing forever (it's a {date:[entries]} map that otherwise
// accumulates a key per day indefinitely and re-syncs the whole thing on every meal). 120 days
// of history is plenty for trends; older days are dropped. Mutates the passed object in place.
// Parse an en-AU d/m/yyyy diary key to a real timestamp. new Date('10/08/2026') CANNOT be used: V8 reads
// it as US m/d/yyyy, so 10 August silently becomes 8 October, and anything past the 12th ('25/08/2026')
// is an Invalid Date whose NaN makes a sort comparator return NaN — a garbage ordering, not a stable one.
function _auKeyMs(k){
  try{
    const q=String(k).split('/').map(function(n){ return parseInt(n,10); });
    if(q.length<3 || !q[2] || isNaN(q[0]) || isNaN(q[1]) || isNaN(q[2])) return 0;
    return new Date(q[2], q[1]-1, q[0]).getTime();
  }catch(_){ return 0; }
}
// Training history is capped in ONE place. It used to be capped at each of the eight write sites with a
// different number (300, 365, 400, 500, 1000, and twice not at all), which meant the smallest cap won
// whenever its path ran: a person could import 1000 sessions from Hevy, finish one workout, and lose 636
// of them to saveWorkoutSession's slice(0,365). Same shape as the payments bug — silent, permanent.
const WORKOUT_CAP = 1000;
function _workoutMs(w){
  try{
    if(!w) return 0;
    if(w.ts){ const t=Date.parse(w.ts); if(!isNaN(t)) return t; }
    // Two date shapes exist in the wild: "3/08/2026" (en-AU short) and "Mon, 3 Aug 2026" (en-AU long).
    const au=_auKeyMs(w.date); if(au) return au;
    const p=Date.parse(w.date); if(!isNaN(p)) return p;
  }catch(_){}
  return 0;
}
function _capWorkouts(arr){
  try{
    const a=(arr||[]).slice();
    if(a.length<=WORKOUT_CAP) return a;
    // Sort newest-first before culling, so "keep the newest N" keeps the actually-newest N. Undated rows
    // resolve to 0 and would be culled first, so they hold their original position instead.
    a.sort(function(x,y){
      const mx=_workoutMs(x), my=_workoutMs(y);
      if(!mx || !my) return 0;
      return my-mx;
    });
    return a.slice(0, WORKOUT_CAP);
  }catch(_){ return (arr||[]).slice(0, WORKOUT_CAP); }
}
function _pruneNutLog(log){
  try{
    const keys=Object.keys(log||{});
    if(keys.length<=120) return;
    // Sort by REAL date (see _auKeyMs) and never drop the day being written to. Both mattered: the old
    // comparator ordered days arbitrarily, so "keep the newest 120" could evict recent days and keep old
    // ones, and with no guard the very diary the caller was mid-write on could be deleted underneath it.
    keys.sort(function(a,b){ return _auKeyMs(a)-_auKeyMs(b); });
    const today=(typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU');
    // Compare by PARSED date, not string equality: '10/8/2026' and '10/08/2026' are the same day but
    // different strings, so a string guard silently stops protecting today the moment any write path
    // produces an unpadded key. Timestamps cannot drift apart on formatting.
    const todayMs=_auKeyMs(today);
    while(keys.length>120){ const k=keys.shift(); if(_auKeyMs(k)!==todayMs) delete log[k]; }
  }catch(_){ }
}
function _calEvents(){
  const all = ls('totry_cal_events') || [];
  // Non-recurring (one-off) events carry a weekStamp; they only appear during the week they were
  // added for. Recurring events (the default for a weekly timetable) always show.
  const nowWeek = _currentWeekStamp();
  return all.filter(e => e && (e.recurring !== false || !e.weekStamp
                              || _isLegacyWeekStamp(e.weekStamp) || e.weekStamp === nowWeek));
}
// ISO-ish week stamp (year + week number) so one-off events can be scoped to "this week only".
// ONE week definition for the whole app: the week runs Monday -> Sunday, matching tIdx() and the habit
// ring. This used to compute a Sunday-start ISO-ish week NUMBER, which rolled over on SATURDAY — so a
// one-off event added on Tuesday for "Saturday 10am" had its stamp go stale the moment Saturday arrived
// and silently disappeared from the calendar on exactly the two days of the week people plan around.
function _currentWeekStamp(d){
  return _habitWeekStamp(d);
}
// Stamps written before that change look like "2026-W33" and can no longer be compared. A one-off event
// lingering an extra week is a far smaller harm than a dentist appointment vanishing, so legacy stamps
// are shown rather than hidden; they age out as events are re-added.
function _isLegacyWeekStamp(v){ return typeof v === 'string' && /^\d{4}-W\d{1,2}$/.test(v); }
function _saveCalEvents(list){ ls('totry_cal_events', list.slice(0,300)); if(typeof syncToCloud==='function') syncToCloud(); }

