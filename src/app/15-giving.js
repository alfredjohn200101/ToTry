// ══ SEASONS & GIVING — the Money × Soul weld ══════════════════════════════════
// One backbone, tradition-swapped content. Nothing is auto-detected unless the maths is genuinely
// trustworthy (Ramadan via Umm al-Qura, Lent via computus, Uposatha from the moon ±a day).
// Everything else the person SETS — the app never pretends to know a local panchang.
const FAST_SEASONS = {
  ramadan:{ id:'ramadan', name:'Ramadan', icon:'🌙', days:30, timeMode:'salah',
    how:'Dates from the Umm al-Qura calendar. Your local sighting may differ by a day — shift it if so.',
    why:'The month the Qur’an was sent down. The fast isn’t about the food; it’s taqwa — God-consciousness trained by restraint from first light to sunset.',
    nourish:'Your calories and protein still have to land — they just land at night. Put most of the protein at iftar and suhoor, and spread the water across the evening rather than all at once.',
    train:'Train near iftar, or an hour or two after it — not deep in the afternoon. Keep the volume honest; this isn’t the month for a PR.',
    fight:'Every hour you wanted something and didn’t take it is the same muscle the fight uses. That’s the point of the month — you learn you can want, and not take.' },
  lent:{ id:'lent', name:'Lent', icon:'✝', days:46, timeMode:'none',
    how:'Ash Wednesday to Holy Saturday, from the Western date of Easter. Orthodox Great Lent runs on a different reckoning — set it yourself if that’s yours.',
    why:'Forty days in the desert. The fast makes a small emptiness on purpose, so there’s room for something else.',
    nourish:'The old shape is one full meal and two smaller on fast days, meat set aside on Fridays. Eat properly — a fast is not a diet, and dropping protein just makes you brittle.',
    train:'Keep training. Lent isn’t a reason to go soft — but if you’ve genuinely dropped food, drop the volume with it instead of grinding through empty.',
    fight:'Fasting, prayer and almsgiving hold each other up — that’s why the Church never separates them. Give something away this week too.' },
  uposatha:{ id:'uposatha', name:'Uposatha', icon:'☸', days:1, timeMode:'noon',
    how:'Worked out from the moon, so it can be a day out. Your temple’s calendar is the authority, not this.',
    why:'An observance day. The traditional form is no solid food after midday — not to punish the body, but to see clearly how much of eating is wanting.',
    nourish:'Eat properly in the morning — that’s the whole day’s food. Protein and water early, not squeezed in at the last minute.',
    train:'Train in the morning if you train at all today. Nothing heavy on an afternoon with no fuel behind it.',
    fight:'Watching hunger arrive and pass without acting is exactly the skill an urge needs. Same practice, different object.' },
  navratri:{ id:'navratri', name:'Navratri', icon:'🕉', days:9, timeMode:'none',
    how:'You set the start date — the lunar calendar and the local panchang vary, and I won’t guess at yours.',
    why:'Nine nights. The fast is sattvic — lightening the body so the mind can hold something steadier than appetite.',
    nourish:'Fruit, dairy, nuts and the permitted grains still have to add up. Keep protein in — paneer, curd, nuts — or you’ll be running on sugar by day three.',
    train:'Lighter work, and keep it early. This isn’t the week to chase load.',
    fight:'Nine days of choosing what you take in. That’s the same choice, made over and over, that the fight is made of.' },
  window:{ id:'window', name:'Eating window', icon:'○', days:0, timeMode:'clock',
    how:'Your own window — you set when it opens.',
    why:'No belief required. A fixed window is mostly a way of deciding once instead of deciding all day.',
    nourish:'Same calories, same protein — a narrower door. If you’re under-eating rather than time-shifting, that’s worth being honest about.',
    train:'Train inside the window, or close enough to it that you can eat after.',
    fight:'A window you set and keep is a small promise kept. They add up.' },
  own:{ id:'own', name:'My fast', icon:'·', days:0, timeMode:'none',
    how:'Yours — you set the dates.',
    why:'Whatever you’re keeping, and why, is yours to hold.',
    nourish:'Whatever you’ve set aside, the rest of the day still has to feed you honestly.',
    train:'Match the effort to the fuel that’s actually in you.',
    fight:'Wanting something and not taking it is one skill, wherever you practise it.' }
};
const SEASON_AUTO = { islam:'ramadan', christianity:'lent', buddhism:'uposatha' };
// Mean-phase moon. Accurate to about a day — which is exactly how it's labelled to the user.
function _moonAge(d){ const S=29.530588853, E=Date.UTC(2000,0,6,18,14,0); let a=((d.getTime()-E)/86400000)%S; if(a<0)a+=S; return a; }
function hijriParts(d){
  try{
    const p={}; new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric'}).formatToParts(d||new Date()).forEach(x=>{p[x.type]=x.value;});
    const m=parseInt(p.month,10), day=parseInt(p.day,10);
    return (m&&day) ? {m:m, d:day, y:parseInt(String(p.year).replace(/\D/g,''),10)||0} : null;
  }catch(_){ return null; }
}
function _ramadanLeft(){ for(let i=1;i<=31;i++){ const d=new Date(); d.setDate(d.getDate()+i); const h=hijriParts(d); if(!h||h.m!==9) return i-1; } return null; }
// The one source of truth: which season is live today, or null. Never throws.
function fastSeasonNow(){
  try{
    const cfg = ls('totry_fast_season') || {choice:'auto'};
    if(cfg.choice === 'off') return null;
    const D = 86400000, shift = parseInt(cfg.shift||0,10) || 0;
    const today = new Date(); today.setHours(0,0,0,0);
    if(cfg.choice && cfg.choice !== 'auto'){
      const p = FAST_SEASONS[cfg.choice]; if(!p) return null;
      const st = cfg.start ? new Date(cfg.start+'T00:00:00') : today;
      if(isNaN(st.getTime())) return null;
      const len = parseInt(cfg.days!=null?cfg.days:p.days,10) || 0;
      const dayN = Math.floor((today - st)/D) + 1;
      if(dayN < 1 || (len > 0 && dayN > len)) return null;
      return Object.assign({}, p, {name:(cfg.name||p.name), dayN:dayN, total:(len||null), left:(len?len-dayN:null), src:'chosen'});
    }
    const t = (typeof faithTradition==='function') ? faithTradition() : 'secular';
    if(t === 'islam'){
      const h = hijriParts(new Date(today.getTime() - shift*D));
      if(h && h.m === 9) return Object.assign({}, FAST_SEASONS.ramadan, {dayN:h.d, total:null, left:_ramadanLeft(), src:'auto'});
    } else if(t === 'christianity'){
      const e = easterDate(today.getFullYear());
      const ash = new Date(e); ash.setDate(e.getDate()-46); ash.setHours(0,0,0,0);
      const dayN = Math.floor((today - ash)/D) + 1 - shift;
      if(dayN >= 1 && dayN <= 46) return Object.assign({}, FAST_SEASONS.lent, {dayN:dayN, total:46, left:46-dayN, src:'auto'});
    } else if(t === 'buddhism'){
      const S = 29.530588853, a = _moonAge(new Date(today.getTime() + 43200000 - shift*D));
      if([0,7.38,14.77,22.15].some(k => (k===0 ? Math.min(a,S-a) : Math.abs(a-k)) < 0.5))
        return Object.assign({}, FAST_SEASONS.uposatha, {dayN:1, total:1, left:0, src:'auto'});
    }
  }catch(_){ }
  return null;
}
// Suhoor/iftar from the same free Aladhan endpoint the Salah card already uses. Cached per day and
// device-local — never asks for location on its own, only uses what's already been given.
async function _seasonTimes(){
  const key = _salahDateStr(); const c = ls('totry_fast_times');
  if(c && c.key === key && c.fajr) return c;
  let url = null;
  try{ const g = geoCoarse(); if(g) url = 'https://api.aladhan.com/v1/timings/'+key+'?latitude='+g.lat+'&longitude='+g.lng+'&method=2'; }catch(_){}   // coarsened — see geoCoarse()
  if(!url){ const city = ls('totry_city'); if(city) url = 'https://api.aladhan.com/v1/timingsByCity/'+key+'?city='+encodeURIComponent(city)+'&country=&method=2'; }
  if(!url) return null;
  try{
    const r = await fetch(url); const j = await r.json();
    if(j.code !== 200 || !j.data) return null;
    const out = {key:key, fajr:j.data.timings.Fajr, maghrib:j.data.timings.Maghrib};
    ls('totry_fast_times', out); return out;
  }catch(_){ return null; }
}
function _seasonSetCity(){
  openFormModal('Your city', 'Only used to work out suhoor and iftar times.',
    [{id:'city', label:'City', type:'text', placeholder:'e.g. Melbourne', value: ls('totry_city')||''}],
    'Save', (v) => {
      if(!v.city) return 'Enter a city.';
      ls('totry_city', v.city); localStorage.removeItem('totry_fast_times');
      renderFastSeason(); return true;
    });
}
function _seasonCfg(){ return ls('totry_fast_season') || {choice:'auto'}; }
function shiftSeason(n){ const c=_seasonCfg(); c.shift=(parseInt(c.shift||0,10)||0)+n; ls('totry_fast_season',c); if(typeof syncToCloud==='function') syncToCloud(); renderFastSeason(); haptic('tick'); }
function endSeason(){ ls('totry_fast_season',{choice:'off'}); if(typeof syncToCloud==='function') syncToCloud(); renderFastSeason(); showToast('Season closed','No guilt in it. Set another whenever you want.'); }
// Choosing a season — every tradition in one sheet, nothing preached at anyone.
function openSeasonPicker(){
  const cur = _seasonCfg(), t = (typeof faithTradition==='function') ? faithTradition() : 'secular';
  const order = [SEASON_AUTO[t], 'ramadan','lent','navratri','uposatha','window','own'].filter((x,i,a)=>x&&a.indexOf(x)===i);
  const m = document.createElement('div'); m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);margin-bottom:4px">A season of fasting</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:14px">Tell me what you’re keeping and the whole app moves with it — how your food is timed, how hard you train, what the day’s word is. No weight talk, no streak, no guilt if you break it.</div>'+
    order.map(id => { const p = FAST_SEASONS[id]; return '<button class="btn" onclick="pickSeason(\''+id+'\')" style="text-align:left;margin-bottom:8px;padding:12px;background:var(--bg3);border:1px solid '+(cur.choice===id?'var(--go-bd)':'var(--bd)')+'">'+
      '<div style="font-size:14px;color:var(--tx)">'+p.icon+'&nbsp;&nbsp;'+p.name+'</div>'+
      '<div style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin-top:3px">'+p.how+'</div></button>'; }).join('')+
    (SEASON_AUTO[t] ? '<button class="btn" onclick="pickSeason(\'auto\')" style="margin-bottom:8px;background:transparent;border:1px solid var(--bd);color:var(--tx2);font-size:12.5px">Let it find '+FAST_SEASONS[SEASON_AUTO[t]].name+' on its own</button>' : '')+
    '<button class="btn" onclick="endSeason();closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not keeping one</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Close</button></div>';
  document.body.appendChild(m);
}
function pickSeason(id){
  document.querySelectorAll('.modal-bg.open').forEach(x=>x.remove());
  if(id === 'auto'){ ls('totry_fast_season',{choice:'auto',shift:0}); if(typeof syncToCloud==='function') syncToCloud(); renderFastSeason(); haptic('success'); return; }
  const p = FAST_SEASONS[id]; if(!p) return;
  const d = new Date(), iso = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const fields = [{id:'start', label:'First day', type:'date', value:iso},
                  {id:'days', label:'How many days (0 = open-ended)', type:'number', placeholder:'e.g. '+(p.days||0), value:String(p.days||0)}];
  if(id === 'own') fields.unshift({id:'name', label:'What do you call it', type:'text', placeholder:'e.g. Ekadashi, Yom Kippur, my 40 days'});
  openFormModal(p.icon+' '+p.name, p.how, fields, 'Begin', (v) => {
    if(!v.start) return 'Pick the first day.';
    const days = Math.max(0, Math.min(400, parseInt(v.days,10)||0));
    ls('totry_fast_season', {choice:id, start:v.start, days:days, name:(v.name||'').trim().slice(0,40)||p.name, shift:0});
    if(typeof syncToCloud==='function') syncToCloud();
    renderFastSeason(); haptic('success');
    showToast('Season set', 'Nourish, Train, Soul and the Fight will all read it now.');
    return true;
  });
}
// The card. One place where all four pillars say what this season means for them today.
function renderFastSeason(){
  const el = document.getElementById('fast-season'); if(!el) return;
  const s = fastSeasonNow();
  if(!s){
    el.innerHTML = '<div style="text-align:center;padding:0 0 12px"><button class="btn" onclick="openSeasonPicker()" style="width:auto;display:inline-block;padding:8px 14px;font-size:11.5px;background:transparent;border:1px solid var(--bd);color:var(--tx3)">🌙 Keeping a season of fasting? Set it →</button></div>';
    return;
  }
  const row = (icon,label,text) => '<div style="display:flex;gap:9px;padding:9px 0;border-top:1px solid var(--bd)">'+
    '<div style="font-size:13px;width:16px;flex-shrink:0;text-align:center">'+icon+'</div>'+
    '<div style="flex:1"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">'+label+'</div>'+
    '<div style="font-size:12.5px;color:var(--tx2);line-height:1.6">'+text+'</div></div></div>';
  let nourish = s.nourish;
  const g = ls('totry_nut_goals') || (typeof defaultNutGoals==='function' ? defaultNutGoals() : {});
  if(g.pro) nourish += ' Today that’s still about ' + g.pro + 'g of protein and ' + (waterGoalMl()/1000).toFixed(1) + ' L of water — the same numbers, a different door.';
  let win = '<div id="season-window" style="font-size:12px;color:var(--tx3);text-align:center;padding:8px 0"></div>';
  if(s.timeMode === 'noon') win = '<div style="font-size:12px;color:var(--go);text-align:center;padding:8px 0;line-height:1.6">Solid food before midday. After that, liquids.</div>';
  else if(s.timeMode === 'clock'){ const f = getFastingState(); win = '<div style="font-size:12px;color:var(--tx3);text-align:center;padding:8px 0;line-height:1.6">Your window: '+(24-(f.protocol||16))+'h of eating, '+(f.protocol||16)+'h closed. The timer below runs it.</div>'; }
  else if(s.timeMode === 'none') win = '';
  const rd = (typeof computeReadiness==='function') ? computeReadiness() : null;
  const trainText = s.train + ((rd && rd.score != null && rd.score < 45) ? ' Your readiness is '+rd.score+'/100 today — take that seriously before you load up.' : '');
  el.innerHTML = '<div class="card" style="border:1px solid var(--go-bd)">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">'+
      '<div><div style="font-family:Cormorant Garamond,serif;font-size:21px;color:var(--tx);line-height:1.2">'+s.icon+' '+_escFew(s.name)+'</div>'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);letter-spacing:0.1em;margin-top:2px">DAY '+s.dayN+(s.total?(' OF '+s.total):'')+(s.left>0?(' · '+s.left+' TO GO'):'')+'</div></div>'+
      '<button onclick="openSeasonPicker()" style="background:none;border:none;color:var(--tx3);font-size:11px;cursor:pointer;padding:2px 0">Change</button>'+
    '</div>'+
    win+
    row('🍽','Nourish', nourish)+
    row('🏋','Train', trainText)+
    row(s.icon==='·'?'✦':s.icon,'Why', s.why)+
    row('⚔','The fight', s.fight)+
    '<div style="border-top:1px solid var(--bd);margin-top:6px;padding-top:10px">'+
      '<button class="btn" onclick="openSolidarity()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px;padding:10px">🍞 Give what a meal costs</button>'+
      '<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-top:8px">'+_escFew(s.how)+
      (s.src==='auto' ? ' <button onclick="shiftSeason(-1)" style="background:none;border:none;color:var(--go);cursor:pointer;font-size:11px">−1 day</button> · <button onclick="shiftSeason(1)" style="background:none;border:none;color:var(--go);cursor:pointer;font-size:11px">+1 day</button>' : '')+
      '</div>'+
    '</div></div>';
  if(s.timeMode === 'salah'){
    const box = document.getElementById('season-window'); if(!box) return;
    box.textContent = 'Working out suhoor and iftar…';
    _seasonTimes().then(t => {
      const b = document.getElementById('season-window'); if(!b) return;
      if(!t){ b.innerHTML = '<button class="btn" onclick="_seasonSetCity()" style="width:auto;display:inline-block;padding:7px 12px;font-size:11.5px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)">Set your city for suhoor &amp; iftar</button>'; return; }
      b.innerHTML = '<div style="display:flex;justify-content:center;gap:18px;padding:6px 0">'+
        '<div><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);letter-spacing:0.1em">SUHOOR ENDS</div><div style="font-family:DM Mono,monospace;font-size:17px;color:var(--go)">'+_escFew(t.fajr)+'</div></div>'+
        '<div><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);letter-spacing:0.1em">IFTAR</div><div style="font-family:DM Mono,monospace;font-size:17px;color:var(--go)">'+_escFew(t.maghrib)+'</div></div></div>';
    });
  }
}
// The solidarity bridge — only an app holding both the fast and the budget can make this move.
// An invitation, once. Never a guilt trip, never a target.
function openSolidarity(){
  openGivingLog(null, 'The hunger you feel today, some feel every day. Give roughly what a meal costs — or don’t. This asks once and never keeps score.', true);
}

// ══ GIVING — one backbone, tradition-swapped maths ════════════════════════════
const GIVING = {
  christianity:{ mode:'tithe', title:'Tithe & almsgiving', kind:'alms',
    sub:'A tenth is the old measure — offered here as a suggestion, never a debt.',
    quiet:'“Do not let your left hand know what your right hand is doing.” — Matthew 6:3' },
  islam:{ mode:'zakat', title:'Zakat & sadaqah', kind:'sadaqah',
    sub:'Zakat is due once your wealth has sat above nisab for a lunar year. Sadaqah is whenever you choose.',
    quiet:'“If you conceal it and give it to the poor, that is better for you.” — Qur’an 2:271' },
  hinduism:{ mode:'intent', title:'Dāna', kind:'dana',
    sub:'Giving as duty freely done — a share you choose, not a score you chase.',
    quiet:'Dāna given without expecting anything back. — Gita 17:20' },
  buddhism:{ mode:'intent', title:'Dāna', kind:'dana',
    sub:'Generosity as practice — it loosens the grip of holding on.',
    quiet:'Dāna is practised without display.' },
  secular:{ mode:'pledge', title:'Giving', kind:'gift',
    sub:'A share of what comes in, given on purpose.',
    quiet:'Given quietly. Nothing here is shared, ranked or shown to anyone.' }
};
function curGiving(){ return GIVING[(typeof faithTradition==='function')?faithTradition():'secular'] || GIVING.secular; }
function givingLog(){ return ls('totry_giving') || []; }
function givingPledge(){ return ls('totry_giving_pledge') || {mode:'off', percent:10, amount:0, quiet:false}; }
function monthIncome(){
  const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return (ls('totry_transactions')||[]).filter(t => t.type==='income' && new Date(t.ts).getTime() >= start).reduce((a,t)=>a+(t.amount||0), 0);
}
function givingTotals(){
  const list = givingLog(), now = new Date();
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime(), yStart = new Date(now.getFullYear(),0,1).getTime();
  const sum = f => list.filter(f).reduce((a,x)=>a+(x.amount||0), 0);
  return { month: sum(x=>new Date(x.ts).getTime()>=mStart), year: sum(x=>new Date(x.ts).getTime()>=yStart), all: sum(()=>true), count: list.length };
}
function openGivingLog(kind, subtitle, viaRelease){
  const cg = curGiving();
  openFormModal('Log what you gave', subtitle || cg.sub,
    [ {id:'amount', label:'Amount', type:'number', prefix:curSym(), placeholder:'e.g. 50'},
      {id:'to', label:'Where it went (optional)', type:'text', placeholder:'e.g. the parish, a friend, a charity'} ],
    'Log it', (v) => {
      const n = parseFloat(v.amount);
      if(isNaN(n) || n <= 0) return 'Enter an amount greater than 0.';
      const list = givingLog();
      list.unshift({id:Date.now(), amount:n, kind:(kind||cg.kind), to:(v.to||'').trim().slice(0,60), ts:new Date().toISOString()});
      ls('totry_giving', list.slice(0,400));
      if(typeof syncToCloud==='function') syncToCloud();
      renderGiving(); haptic('success');
      if(viaRelease && typeof theRelease==='function'){ theRelease({did:'You were hungry, and you turned it outward. That’s the whole point of the fast.'}); }
      else showToast('Logged', 'Kept between you and this app.');
      return true;
    });
}
async function deleteGiving(id){
  // A one-tap destructive action on a glyph a few pixels wide, with no undo anywhere in the app.
  if(!(await askConfirm('Delete this giving record? It is part of your giving history.'))) return; ls('totry_giving', givingLog().filter(x=>x.id!==id)); if(typeof syncToCloud==='function') syncToCloud(); renderGiving(); }
function openPledge(){
  const p = givingPledge();
  openFormModal('Your own measure', 'Set a share of what comes in, or a flat monthly amount. Yours to change or drop — nothing chases you about it.',
    [ {id:'percent', label:'Percent of income (blank if using an amount)', type:'number', placeholder:'e.g. 10', value: p.mode==='percent'?p.percent:''},
      {id:'amount', label:'Or a flat monthly amount', type:'number', prefix:curSym(), placeholder:'e.g. 100', value: p.mode==='amount'?p.amount:''} ],
    'Set it', (v) => {
      const pc = parseFloat(v.percent), am = parseFloat(v.amount);
      let next = {mode:'off', percent:10, amount:0, quiet:p.quiet};
      if(!isNaN(pc) && pc > 0){ if(pc > 100) return 'A percent between 1 and 100.'; next = {mode:'percent', percent:pc, amount:0, quiet:p.quiet}; }
      else if(!isNaN(am) && am > 0){ next = {mode:'amount', percent:10, amount:am, quiet:p.quiet}; }
      ls('totry_giving_pledge', next);
      if(typeof syncToCloud==='function') syncToCloud();
      renderGiving(); haptic('success'); return true;
    });
}
function toggleGivingQuiet(){ const p = givingPledge(); p.quiet = !p.quiet; ls('totry_giving_pledge', p); if(typeof syncToCloud==='function') syncToCloud(); renderGiving(); haptic('tick'); }
// Zakat — 2.5% of net qualifying wealth once it has sat above nisab for a lunar year (354 days).
// Prefilled from the person's real savings, assets and debts, every line editable, because not
// everything you own is zakatable and this app must not pretend otherwise.
const ZAKAT_G = {silver:612.36, gold:87.48};
function zakatState(){ return ls('totry_zakat') || {basis:'silver', pricePerGram:0, hawlStart:null, last:null}; }
function openZakat(){
  const z = zakatState();
  let cash = 0, owedOut = 0, invest = 0;
  // Cash comes from the savings goals, which is where savings ACTUALLY live. usaS/indiaS are the dead
  // legacy path: the inputs they read (#usa-in, #india-in) do not exist in the markup any more and
  // its updater was deleted as dead code, so both are permanently 0 — meaning "Cash & savings" was always
  // blank while the modal told the person it had been filled in from what they had tracked. Savings were
  // migrated to totry_finance_goals long ago (see the migration in renderSavingsGoals); each goal's
  // `current` is money actually set aside, which is exactly what is zakatable. loadF() is still called
  // because owedOut below needs the debts it loads.
  try{ if(typeof loadF==='function'){ loadF(); cash = (ls('totry_finance_goals')||[]).reduce((n,g)=>n+(parseFloat(g&&g.current)||0),0)
                                             + (typeof usaS==='number'?usaS:0) + (typeof indiaS==='number'?indiaS:0); owedOut = (debts||[]).reduce((s,d)=>s+Math.max(0,(d.t||0)-(d.p||0)), 0); } }catch(_){}
  try{ invest = (ls('totry_assets')||[]).reduce((s,a)=>s+(a.value||0), 0); }catch(_){}
  openFormModal('Zakat', 'Filled in from what you’ve already tracked — correct any line. Your home, your car and the tools of your trade are not zakatable, so take them out.',
    [ {id:'cash', label:'Cash & savings', type:'number', prefix:curSym(), value: Math.round(cash)||''},
      {id:'invest', label:'Gold, silver, shares, business stock', type:'number', prefix:curSym(), value: Math.round(invest)||''},
      {id:'owed', label:'Money owed TO you that you expect back', type:'number', prefix:curSym(), placeholder:'0'},
      {id:'debts', label:'Debts you owe now', type:'number', prefix:curSym(), value: Math.round(owedOut)||''},
      {id:'price', label:'Silver price per gram today (your local source)', type:'number', prefix:curSym(), value: z.pricePerGram||''} ],
    'Work it out', (v) => {
      const num = k => { const n = parseFloat(v[k]); return isNaN(n) ? 0 : n; };
      const price = num('price');
      if(price <= 0) return 'Nisab moves with the metal price — put in today’s silver price per gram.';
      const net = num('cash') + num('invest') + num('owed') - num('debts');
      const nisab = ZAKAT_G.silver * price;
      const due = net >= nisab ? Math.round(net * 0.025 * 100) / 100 : 0;
      const st = zakatState();
      st.pricePerGram = price;
      st.last = {net: Math.round(net), nisab: Math.round(nisab), due: due, at: new Date().toISOString()};
      if(!st.hawlStart && net >= nisab) st.hawlStart = new Date().toISOString();
      ls('totry_zakat', st);
      if(typeof syncToCloud==='function') syncToCloud();
      renderGiving(); haptic('tap');
      showToast(due > 0 ? 'Zakat: '+curSym()+due.toLocaleString() : 'Below nisab',
        due > 0 ? 'On '+curSym()+Math.round(net).toLocaleString()+' of qualifying wealth.' : 'No zakat is owed on wealth below nisab.');
      return true;
    });
}
function _hawlLine(z){
  if(!z.hawlStart) return '';
  const start = new Date(z.hawlStart).getTime(), doneAt = start + 354*86400000;
  const left = Math.ceil((doneAt - Date.now()) / 86400000);
  const h = hijriParts(new Date(doneAt));
  const when = h ? (h.d+'/'+h.m+'/'+h.y+' AH') : new Date(doneAt).toLocaleDateString('en-AU');
  return left > 0
    ? '<div style="font-size:11px;color:var(--tx3);margin-top:5px">Your lunar year completes around '+when+' — about '+left+' days. <button onclick="resetHawl()" style="background:none;border:none;color:var(--go);cursor:pointer;font-size:11px">Reset</button></div>'
    : '<div style="font-size:11px;color:var(--go);margin-top:5px">Your lunar year has completed. Whenever you’ve paid it, reset the year. <button onclick="resetHawl()" style="background:none;border:none;color:var(--go);cursor:pointer;font-size:11px">Reset</button></div>';
}
function resetHawl(){ const z = zakatState(); z.hawlStart = new Date().toISOString(); ls('totry_zakat', z); if(typeof syncToCloud==='function') syncToCloud(); renderGiving(); showToast('Year reset','Counting a fresh lunar year from today.'); }
function renderGiving(){
  const el = document.getElementById('giving-body'); if(!el) return;
  const cg = curGiving(), p = givingPledge(), t = givingTotals(), inc = monthIncome();
  const ttl = document.getElementById('giving-title'); if(ttl) ttl.textContent = cg.title;
  let strip = '';
  if(cg.mode === 'tithe'){
    const sug = Math.round(inc * 0.10);
    strip = inc > 0
      ? '<div style="font-size:14px;color:var(--tx)">'+curSym()+sug.toLocaleString()+'<span style="font-size:11.5px;color:var(--tx3)"> — a tenth of the '+curSym()+Math.round(inc).toLocaleString()+' that came in this month.</span></div><div style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin-top:4px">A suggestion, not a debt. Give more, less, or nothing this month — nothing here holds it against you.</div>'
      : '<div style="font-size:11.5px;color:var(--tx3);line-height:1.6">Log your income in the money tab above and I can suggest a figure from what actually came in — rather than a number from nowhere.</div>';
  } else if(cg.mode === 'zakat'){
    const z = zakatState();
    strip = (z.last
      ? '<div style="font-size:14px;color:var(--tx)">'+curSym()+z.last.due.toLocaleString()+'<span style="font-size:11.5px;color:var(--tx3)"> — 2.5% of '+curSym()+z.last.net.toLocaleString()+', nisab '+curSym()+z.last.nisab.toLocaleString()+'.</span></div>'+_hawlLine(z)
      : '<div style="font-size:11.5px;color:var(--tx3);line-height:1.6">Work out your zakat from what you’ve already tracked — savings, assets and debts are filled in for you, and every line is yours to correct.</div>')+
      '<button class="btn" onclick="openZakat()" style="margin-top:9px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px;padding:9px">'+(z.last?'Work it out again':'Calculate zakat')+'</button>'+
      (z.last && z.last.due > 0 ? '<button class="btn" onclick="openGivingLog(\'zakat\')" style="margin-top:7px;background:transparent;border:1px solid var(--go-bd);color:var(--go);font-size:12.5px;padding:9px">Log zakat paid</button>' : '');
  } else {
    const sug = p.mode === 'percent' ? Math.round(inc * (p.percent/100)) : (p.mode === 'amount' ? p.amount : 0);
    strip = (p.mode === 'off'
      ? '<div style="font-size:11.5px;color:var(--tx3);line-height:1.6">'+(cg.mode==='pledge'?'Set your own share — a percent of what comes in, or a flat amount. Entirely optional.':'Set your own measure if it helps. Dāna has no fixed percentage, and nothing here will invent one.')+'</div>'
      : '<div style="font-size:14px;color:var(--tx)">'+curSym()+sug.toLocaleString()+'<span style="font-size:11.5px;color:var(--tx3)"> — '+(p.mode==='percent'?(p.percent+'% of the '+curSym()+Math.round(inc).toLocaleString()+' in this month'):'your monthly measure')+'. '+curSym()+Math.round(t.month).toLocaleString()+' given so far.</span></div>')+
      '<button class="btn" onclick="openPledge()" style="margin-top:9px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px;padding:9px">'+(p.mode==='off'?'Set a measure':'Change it')+'</button>';
  }
  const list = givingLog();
  let body;
  if(!list.length) body = '<p style="font-size:12px;color:var(--tx3);text-align:center;padding:12px 0;font-style:italic">Nothing logged yet.</p>';
  else if(p.quiet) body = '<p style="font-size:12px;color:var(--tx3);text-align:center;padding:12px 0">'+list.length+' kept quietly. Amounts hidden.</p>';
  else body = list.slice(0,10).map(x => '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bd)">'+
      '<div><div style="font-size:14px;color:var(--tx)">'+curSym()+x.amount.toLocaleString()+'</div>'+
      (x.to ? '<div style="font-size:11px;color:var(--tx3)">'+_escFew(x.to)+'</div>' : '')+'</div>'+
      '<div style="display:flex;align-items:center;gap:10px"><span style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">'+new Date(x.ts).toLocaleDateString('en-AU',{day:'numeric',month:'short'})+'</span>'+
      '<button onclick="deleteGiving('+x.id+')" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer">×</button></div></div>').join('')+
      '<div style="font-family:DM Mono,monospace;font-size:11px;color:var(--tx3);text-align:center;margin-top:10px">'+curSym()+Math.round(t.year).toLocaleString()+' this year · '+curSym()+Math.round(t.all).toLocaleString()+' all time</div>';
  el.innerHTML = '<div style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin-bottom:10px">'+cg.sub+'</div>'+
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:12px">'+strip+'</div>'+
    body+
    '<div style="border-top:1px solid var(--bd);margin-top:12px;padding-top:10px;font-size:11px;color:var(--tx3);line-height:1.6">'+
      cg.quiet+' <button onclick="toggleGivingQuiet()" style="background:none;border:none;color:var(--go);cursor:pointer;font-size:11px;padding:16px 0;margin:-16px 0;position:relative">'+(p.quiet?'Show amounts':'Hide amounts')+'</button><br>'+
      'Spending on others tends to lift mood a little more than spending on yourself — real, but modest, and strongest when it’s your own choice and you can see who it reaches (Dunn, Aknin &amp; Norton). That’s the whole claim. Giving isn’t a mood technique, and there’s no score here: nothing is shared, ranked or counted against you.'+
    '</div>';
}
// ── FINANCE ───────────────────────────────────────────────────
