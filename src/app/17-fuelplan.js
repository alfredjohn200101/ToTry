// ════ FUEL PLAN — whole-life meal planning + PT carb-timing ════
// The integration moat in food form: plans real, priced meals around the person's actual
// training, goal and budget. Reuses getLifeState/goals/userSex — never re-asks what we know.
function _fuelCtx(){
  const sex = (typeof userSex==='function' && userSex()) || 'male';
  // The fuel plan sizes a whole day, so it has to size it to TODAY's target, not the flat base.
  const goals = (typeof todaysNutGoals==='function') ? todaysNutGoals() : (ls('totry_nut_goals') || (typeof defaultNutGoals==='function' ? defaultNutGoals() : {cal:2100, pro:170}));
  const tdee = ls('totry_tdee_data') || {};
  let goalDir = 'maintain', goalLabel = 'maintaining';
  if(tdee.goal === 'lose'){ goalDir='cut'; goalLabel='leaning down'; }
  else if(tdee.goal === 'gain'){ goalDir='build'; goalLabel='building'; }
  else { const gi = (typeof _goalDir==='function') ? _goalDir() : '';
         if(gi==='lose'||gi==='cut'){ goalDir='cut'; goalLabel='leaning down'; }
         else if(gi==='gain'||gi==='build'){ goalDir='build'; goalLabel='building'; } }
  return { sex, cal: goals.cal||2100, pro: goals.pro||150, goalDir, goalLabel };
}
function getMealPrefs(){ return ls('totry_meal_prefs') || {}; }
function saveMealPrefs(p){ ls('totry_meal_prefs', p); if(typeof syncToCloud==='function') syncToCloud(); }
function getPreworkoutLead(){ const v = ls('totry_preworkout_lead'); return (typeof v==='number' && v>0) ? v : 75; }

function renderFuelPlanCard(){
  const sum = document.getElementById('fuel-plan-summary');
  const btn = document.getElementById('fuel-plan-btn');
  if(!sum || !btn) return;
  const p = getMealPrefs();
  const plan = ls('totry_meal_plan');
  if(plan && plan.meals){
    sum.innerHTML = '<button class="btn" style="width:100%;margin-bottom:8px;background:var(--bg3);color:var(--go);font-size:var(--t-base);padding:11px" onclick="_fuelViewPlan()">View my plan →</button>'+
      '<button class="btn quiet" style="width:100%;margin-bottom:10px;font-size:var(--t-cap);color:var(--tx3)" onclick="openFuelPlan(true)">Change my setup</button>';
    btn.textContent = 'Rebuild my plan';
    btn.style.background='transparent'; btn.style.border='1px solid var(--bd)'; btn.style.color='var(--tx2)';
  } else if(p && p.mealsPerDay){
    const bits = [p.mealsPerDay+' meals/day'];
    if(p.budget) bits.push(curSym()+_moneyG(p.budget)+'/wk');
    if(p.chain) bits.push(p.chain);
    // The setup is a ROAD BACK, not the only road forward — the primary button builds now.
    sum.innerHTML = '<div style="font-family:var(--font-text);font-size:var(--t-mini);color:var(--tx3);margin-bottom:10px">Set up \u00b7 '+_esc(bits.join(' \u00b7 '))+'</div>'+
      '<button class="btn quiet" style="width:100%;margin-bottom:10px;font-size:var(--t-cap);color:var(--tx3)" onclick="openFuelPlan(true)">Change my setup</button>';
    btn.textContent = 'Build this week\u2019s plan';
  } else {
    sum.innerHTML = '';
    btn.textContent = 'Build my fuel plan';
  }
}

// ONE SWIFT MOTION ONCE IT IS SET UP. This ran the whole elicitation AND the shop picker on every
// single build, so a person who had already told the app how many meals, what budget, which diet and
// which shops was asked all of it again to get this week's list. Answered questions stay answered;
// "Change my setup" on the card is how they come back.
function _fuelReady(p){
  p = p || (typeof getMealPrefs==='function' ? getMealPrefs() : null);
  return !!(p && p.mealsPerDay && _fuelShopChains(p).length);
}
function openFuelPlan(force){
  if(typeof haptic==='function') haptic('tap');
  if(!force && _fuelReady()) { _fuelGenerate(); return; }
  _fuelElicit();
}

// Small chip helpers (no rebuild — toggle DOM state directly so inputs never reset).
function _fuelChipOn(el){ el.classList.add('on'); el.style.borderColor='var(--go-bd)'; el.style.background='var(--go-bg)'; el.style.color='var(--go)'; }
function _fuelChipOff(el){ el.classList.remove('on'); el.style.borderColor='var(--bd)'; el.style.background='transparent'; el.style.color='var(--tx2)'; }
function _fuelSetMeals(el){ document.querySelectorAll('#fuel-meals-row .fuel-chip').forEach(_fuelChipOff); _fuelChipOn(el); }
function _fuelToggleDiet(el){ if(el.classList.contains('on')) _fuelChipOff(el); else _fuelChipOn(el); }
// One string for the planner: diet requirements + personal dislikes (hard do-not-include).
// Dislikes aren't a "diet" — they're one-tap "just don't give me this" (mushrooms, seafood...).
function _fuelDietStr(p){
  const d = (p.diet && p.diet.length) ? p.diet.join(', ') : 'no specific diet';
  const dl = (Array.isArray(p.dislikes) && p.dislikes.length) ? ('; they DISLIKE these — do NOT include them in any meal or the shopping list, substitute something they would enjoy instead: ' + p.dislikes.join(', ')) : '';
  return d + dl;
}
function _fuelToggleSupp(el){ const on = el.getAttribute('data-on')==='1'; el.setAttribute('data-on', on?'0':'1'); el.textContent = on?'No':'Yes'; if(on) _fuelChipOff(el); else _fuelChipOn(el); }

function _fuelElicit(){
  const ctx = _fuelCtx();
  const p = getMealPrefs();
  const dietChips = ['Vegetarian','Vegan','Pescatarian','Halal','Kosher','No beef','No pork','Dairy-free','Gluten-free','Nut-free'];
  const savedDiet = Array.isArray(p.diet) ? p.diet : [];
  const mealsSel = p.mealsPerDay || 4;
  const suppOn = p.includeSupps !== false;
  const chipStyle = 'padding:7px 12px;border-radius:100px;border:1px solid var(--bd);background:transparent;color:var(--tx2);font-size:12px;cursor:pointer';
  const meals = [3,4,5].map(n =>
    '<button type="button" class="fuel-chip'+(mealsSel===n?' on':'')+'" data-n="'+n+'" onclick="_fuelSetMeals(this)" style="'+chipStyle+(mealsSel===n?';border-color:var(--go-bd);background:var(--go-bg);color:var(--go)':'')+'">'+n+' meals</button>'
  ).join('');
  const diets = dietChips.map(d => {
    const on = savedDiet.indexOf(d) >= 0;
    return '<button type="button" class="fuel-chip'+(on?' on':'')+'" data-diet="'+d+'" onclick="_fuelToggleDiet(this)" style="'+chipStyle+(on?';border-color:var(--go-bd);background:var(--go-bg);color:var(--go)':'')+'">'+d+'</button>';
  }).join('');
  // Personal dislikes — not a diet, just "don't give me this". One tap beats typing it out.
  const dislikeChips = ['Mushrooms','Seafood','Fish','Eggs','Tofu','Olives','Onion','Coriander','Spicy food','Beetroot','Blue cheese','Liver'];
  const savedDislikes = Array.isArray(p.dislikes) ? p.dislikes : [];
  const dislikes = dislikeChips.map(d => {
    const on = savedDislikes.indexOf(d) >= 0;
    return '<button type="button" class="fuel-chip'+(on?' on':'')+'" data-dislike="'+d+'" onclick="_fuelToggleDiet(this)" style="'+chipStyle+(on?';border-color:var(--go-bd);background:var(--go-bg);color:var(--go)':'')+'">'+d+'</button>';
  }).join('');
  const m = document.createElement('div');
  m.className='modal-bg open'; m.id='fuel-elicit-modal'; m.style.alignItems='flex-end';
  m.innerHTML = '<div class="modal" style="text-align:left;max-height:88vh;overflow-y:auto">'+
    '<div style="font-family:var(--font-display);font-size:var(--t-title1);font-weight:700;color:var(--tx);margin-bottom:4px">Let’s build your fuel plan</div>'+
    '<div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.6;margin-bottom:16px">Around your real life — not a generic diet. I already know you’re <b style="color:var(--tx)">'+ctx.goalLabel+'</b>'+((typeof nutGentle==='function' && nutGentle()) ? '' : ' at about <b style="color:var(--tx)">'+ctx.cal+' cal</b> and <b style="color:var(--tx)">'+ctx.pro+'g protein</b>')+', so I’ll plan around that. A few quick things:</div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Weekly grocery budget</div>'+
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><span style="font-size:var(--t-base);color:var(--tx2)">'+curSym()+'</span><input type="number" id="fuel-budget" inputmode="numeric" placeholder="e.g. 120" value="'+(p.budget||'')+'" style="flex:1"></div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Meals per day</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:16px" id="fuel-meals-row">'+meals+'</div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Anything to work around?</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px" id="fuel-diet-row">'+diets+'</div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Foods you’d rather avoid</div>'+
    '<div style="font-size:var(--t-cap);color:var(--tx3);line-height:1.5;margin-bottom:8px">Not a diet — just things you don’t like. I’ll plan around them.</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px" id="fuel-dislike-row">'+dislikes+'</div>'+
    '<input type="text" id="fuel-diet-free" placeholder="Allergies, foods you hate, anything else..." value="'+String(p.restrictions||'').replace(/"/g,'&quot;')+'" style="width:100%;margin-bottom:16px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px"><div><div style="font-size:var(--t-base);color:var(--tx);font-weight:500">Include supplements?</div><div style="font-size:var(--t-cap);color:var(--tx3);line-height:1.4">Only real, evidence-backed, food-first. Optional.</div></div><button type="button" id="fuel-supp-toggle" data-on="'+(suppOn?'1':'0')+'" class="fuel-chip'+(suppOn?' on':'')+'" onclick="_fuelToggleSupp(this)" style="'+chipStyle+(suppOn?';border-color:var(--go-bd);background:var(--go-bg);color:var(--go)':'')+'">'+(suppOn?'Yes':'No')+'</button></div>'+
    '<button class="btn primary" onclick="_fuelElicitSave()">Next: pick my shop →</button>'+
    '<button class="btn" style="background:none;border:none;color:var(--tx3);font-size:var(--t-sm);margin-top:6px" onclick="closeModal(this)">Not now</button>'+
    '</div>';
  document.body.appendChild(m);
}

function _fuelElicitSave(){
  // COLLECT FIRST, ALWAYS. The crisis branch below used to run before any of this and bare-return,
  // so a person who typed something true into the one free-text field lost their budget, meals,
  // diet, dislikes and supplement choice as well. `docs/CRISIS-REGISTERS.md` names that shape as the
  // one place a false positive stops being cheap: a denial of service for somebody who told the app
  // the truth about their life. `completeMorning()` already carries the contract this now follows —
  // their words are always kept, the app simply stops and meets them instead of carrying on.
  const budget = parseFloat((document.getElementById('fuel-budget')||{}).value) || 0;
  const mealsEl = document.querySelector('#fuel-meals-row .fuel-chip.on');
  const mealsPerDay = mealsEl ? parseInt(mealsEl.getAttribute('data-n'),10) : 4;
  const diet = Array.prototype.slice.call(document.querySelectorAll('#fuel-diet-row .fuel-chip.on')).map(function(b){ return b.getAttribute('data-diet'); });
  const dislikes = Array.prototype.slice.call(document.querySelectorAll('#fuel-dislike-row .fuel-chip.on')).map(function(b){ return b.getAttribute('data-dislike'); });
  const restrictions = ((document.getElementById('fuel-diet-free')||{}).value || '').trim();
  const suppEl = document.getElementById('fuel-supp-toggle');
  const includeSupps = suppEl ? suppEl.getAttribute('data-on')==='1' : true;
  window._fuelPendingVals = { budget:budget, mealsPerDay:mealsPerDay, diet:diet, dislikes:dislikes, restrictions:restrictions, includeSupps:includeSupps };
  // THE GATE READ THREE ELEMENT IDS THAT DO NOT EXIST, so it never fired once (10 Oct 2026).
  // It asked for `fuel-dislikes`, `fuel-notes` and `fuel-diet`; this form's only free-text field is
  // `fuel-diet-free` (the others are CHIP ROWS — `fuel-diet-row`, `fuel-dislike-row` — which carry
  // no typed text at all). So `_txt` was always '' and `detectCrisis` was never called with
  // anything. Driven on the real function with the real detector: a disclosure typed into
  // `fuel-diet-free` did NOT bridge and WAS saved on to the model, while the same string placed in
  // `fuel-notes` DID bridge — which is the calibration proving the logic was fine and only the ids
  // were wrong. The app's signature failure: it parses, the suite is green, and it does nothing.
  try{
    if(typeof detectCrisis === 'function'){
      const _c = restrictions ? detectCrisis(restrictions) : null;
      if(_c){
        // Keep what they chose before meeting them — see the note at the top of this function.
        try{
          if(typeof saveMealPrefs === 'function' && typeof getMealPrefs === 'function'){
            saveMealPrefs(Object.assign(getMealPrefs(), window._fuelPendingVals));
          }
        }catch(_){ }
        document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
        // THE SAME CARD AS THE OTHER 38 DOORS. This used to call bridgeToRealHelp('heavy'), which
        // does show three tappable helplines — but it is a DIFFERENT surface: it carries no
        // `aria-label="Urgent: real people you can contact right now"`, so it sits outside the
        // visible-and-tappable geometry guarantee `npm run crisis` holds every other door to, and
        // its numbers are a THIRD hardcoded copy (tel:131114 / tel:988 / tel:116123) outside
        // CRISIS_LINES — the drift this repo closed when it made one list serve both the card and
        // the model's prompt. journalMeetCrisis renders the unified card, which is what every door
        // added since 30 Sep uses. bridgeToRealHelp keeps its six other callers.
        setTimeout(function(){
          try{
            if(typeof journalMeetCrisis === 'function') journalMeetCrisis(_c);
            else if(typeof bridgeToRealHelp === 'function') bridgeToRealHelp('heavy');
          }catch(_){ }
        }, 250);
        return;
      }
    }
  }catch(_){ }
  // ED / restriction off-ramp: gentle language flags or an aggressively low cut target.
  const ctx = _fuelCtx();
  const redFlags = /(fast(ing)?\b|starv|skip meals|barely eat|hardly eat|900 cal|1000 cal|as few calories|purg|not eat(ing)?|hate my body|crash diet|lose weight fast)/i;
  const tooLow = ctx.goalDir==='cut' && ctx.cal < (ctx.sex==='female' ? 1300 : 1500);
  if(redFlags.test(restrictions) || tooLow){ _fuelSafetyModal(); return; }
  _fuelFinishSave(window._fuelPendingVals);
}

function _fuelFinishSave(vals){
  const prefs = Object.assign(getMealPrefs(), vals);
  saveMealPrefs(prefs);
  const m = document.getElementById('fuel-elicit-modal'); if(m) m.remove();
  if(typeof haptic==='function') haptic('tap');
  renderFuelPlanCard();
  _fuelShopPicker();
}

function _fuelSafetyModal(){
  const m = document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML = '<div class="modal" style="text-align:left">'+
    '<div style="font-family:var(--font-display);font-size:var(--t-xl);font-weight:700;color:var(--tx);margin-bottom:10px">Let’s keep this about fuelling you</div>'+
    '<div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.7;margin-bottom:16px">A plan should build the person you’re becoming, not shrink you. I’ll keep your calories in a healthy range and never push a crash. If food or your body has felt heavy lately, talking to a real person is strength — not failure.</div>'+
    '<button class="btn primary" onclick="closeModal(this);_fuelFinishSave(window._fuelPendingVals)">Build me a healthy plan</button>'+
    '<button class="btn" style="background:none;color:var(--tx2);margin-top:8px;background:var(--fill2)" onclick="closeModal(this);if(typeof bridgeToRealHelp===\'function\')bridgeToRealHelp(\'heavy\')">Point me to real help</button>'+
    '</div>';
  document.body.appendChild(m);
}

function _esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _fuelShopChains(p){ p = p || getMealPrefs(); return Array.isArray(p.chains) && p.chains.length ? p.chains.slice() : (p.chain ? [p.chain] : []); }
function _fuelToggleShop(el){ if(el.classList.contains('on')) _fuelChipOff(el); else _fuelChipOn(el); }
function _fuelAddShop(){
  const inp = document.getElementById('fuel-shop-add'); const name = (inp && inp.value || '').trim();
  const row = document.getElementById('fuel-shops-row');
  if(!name || !row) return;
  const existing = Array.prototype.slice.call(row.querySelectorAll('.fuel-shop-chip')).filter(function(b){ return (b.getAttribute('data-shop')||'').toLowerCase()===name.toLowerCase(); })[0];
  if(existing){ _fuelChipOn(existing); }
  else {
    const b = document.createElement('button'); b.type='button'; b.className='fuel-shop-chip on'; b.setAttribute('data-shop', name); b.setAttribute('onclick','_fuelToggleShop(this)');
    b.style.cssText = 'padding:7px 12px;border-radius:100px;border:1px solid var(--go-bd);background:var(--go-bg);color:var(--go);font-size:var(--t-sm);cursor:pointer';
    b.textContent = name; row.appendChild(b);
  }
  if(inp) inp.value='';
}

function _fuelShopPicker(settingsOnly){
  const p = getMealPrefs();
  const country = p.country || 'Australia';
  const saved = _fuelShopChains(p);
  const auChains = ['Woolworths','Coles','Aldi','IGA'];
  const all = auChains.slice(); saved.forEach(function(s){ if(all.indexOf(s)<0) all.push(s); });
  const chipStyle = 'padding:7px 12px;border-radius:100px;border:1px solid var(--bd);background:transparent;color:var(--tx2);font-size:12px;cursor:pointer';
  const chips = all.map(function(c){
    const on = saved.indexOf(c) >= 0;
    return '<button type="button" class="fuel-shop-chip'+(on?' on':'')+'" data-shop="'+String(c).replace(/"/g,'&quot;')+'" onclick="_fuelToggleShop(this)" style="'+chipStyle+(on?';border-color:var(--go-bd);background:var(--go-bg);color:var(--go)':'')+'">'+_esc(c)+'</button>';
  }).join('');
  const m = document.createElement('div');
  m.className='modal-bg open'; m.id='fuel-shop-modal'; m.style.alignItems='flex-end';
  m.innerHTML = '<div class="modal" style="text-align:left">'+
    '<div style="font-family:var(--font-display);font-size:var(--t-title1);font-weight:700;color:var(--tx);margin-bottom:4px">Where do you shop?</div>'+
    '<div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.6;margin-bottom:16px">Pick every shop you use — I’ll build one shopping list, split by store so you know exactly what to get where.</div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Country</div>'+
    '<input type="text" id="fuel-country" value="'+String(country).replace(/"/g,'&quot;')+'" style="width:100%;margin-bottom:16px">'+
    '<div class="eyebrow" style="margin-bottom:6px">Your shops (pick any)</div>'+
    '<div id="fuel-shops-row" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+chips+'</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:18px"><input type="text" id="fuel-shop-add" placeholder="Add another shop (any country)..." style="flex:1"><button class="btn subtle" style="width:auto;padding:0 16px" onclick="_fuelAddShop()">Add</button></div>'+
    '<button class="btn primary" onclick="'+(settingsOnly?'_fuelShopSave(false)':'_fuelShopGenerate()')+'">'+(settingsOnly?'Save':'Build my plan \u2192')+'</button>'+
    '<button class="btn" style="background:none;border:none;color:var(--tx3);font-size:var(--t-sm);margin-top:6px" onclick="closeModal(this)">Not now</button>'+
    '</div>';
  document.body.appendChild(m);
}

// WHERE THEY SHOP IS A SETTING, NOT A STEP. It was only reachable at the end of the setup flow and
// only ever handed straight on to a generate — so changing one shop meant walking the whole
// elicitation again, and every plan build asked again for something already answered. Saving and
// generating are two things; this does the first and optionally the second.
// The Settings row shows what is set without opening anything. textContent, because a shop name is
// whatever the person typed into "Add another shop (any country)".
function syncShopsRow(){
  try{
    const el = document.getElementById('settings-shops-value');
    if(!el) return;
    const shops = _fuelShopChains();
    el.textContent = shops.length ? shops.join(', ') : 'Not set';
  }catch(_){ }
}

function _fuelShopSave(andGenerate){
  const country = ((document.getElementById('fuel-country')||{}).value || 'Australia').trim();
  const shops = Array.prototype.slice.call(document.querySelectorAll('#fuel-shops-row .fuel-shop-chip.on')).map(function(b){ return b.getAttribute('data-shop'); }).filter(Boolean);
  if(!shops.length){ if(typeof showToast==='function') showToast('One thing', 'Pick at least one shop so the list and prices are real.'); return; }
  saveMealPrefs(Object.assign(getMealPrefs(), { country:country, chains:shops, chain:shops.join(', ') }));
  const m = document.getElementById('fuel-shop-modal'); if(m) m.remove();
  renderFuelPlanCard();
  try{ if(typeof syncShopsRow === 'function') syncShopsRow(); }catch(_){ }
  if(andGenerate) _fuelGenerate();
  else if(typeof showToast==='function') showToast('Saved', shops.join(', ') + ' \u2014 your list and prices use these from now on.');
}
function _fuelShopGenerate(){ _fuelShopSave(true); }

// ── THE SEAM: THE PLANNER HAS NEVER HEARD OF THE PERSON'S OWN RECIPES ────────────────────────────
// `grep -ci recipe src/app/17-fuelplan.js` returned 1 — a passing mention in a dislikes string. The
// collectors stopped at collecting and the planner invented every meal, so someone who had built up
// a shelf of their own food opened the plan and met a stranger's week. Both ends were already in
// this app, plus the store routing, the prices, the diary and the whole-person brief; nothing joined
// them. This is that join, and it needs no third-party service (docs/REELS-TO-PLAN.md, phase 1).
// WHAT THEY ACTUALLY EAT, WHICH THE PLANNER HAS NEVER ONCE LOOKED AT.
// _fuelRecipeLines tells the model what they SAVED. This tells it what they REPEATEDLY EAT, which is
// a different and better thing: a saved recipe is an intention, a meal eaten forty mornings running
// is a fact about a person. A plan built from food they already reach for is a plan they will keep,
// and keeping it is the entire problem — docs/THE-GAP.md.
//
// Grouped by MEAL SLOT, because "eats oats" is useless and "eats oats at breakfast" is a plan. The
// threshold is deliberate: a meal eaten three times in two months is noise, and noise in a prompt
// costs the rest of the brief its attention.
function _fuelHabitLines(){
  try{
    const log = (typeof ls === 'function' ? ls('totry_nutlog') : null);
    if(!log || typeof log !== 'object') return '';
    const cutoff = Date.now() - 60 * 86400000;
    const bySlot = {};                                  // slot -> name -> {n, days:Set}
    Object.keys(log).forEach(function(day){
      (log[day] || []).forEach(function(r){
        if(!r || !r.name) return;
        const t = r.ts ? new Date(r.ts).getTime() : NaN;
        if(isFinite(t) && t < cutoff) return;           // a row with no ts is kept; the map is capped anyway
        const slot = String(r.meal || 'snack');
        const key = String(r.name).trim().toLowerCase();
        if(!key) return;
        const m = (bySlot[slot] = bySlot[slot] || {});
        const e = (m[key] = m[key] || { n: 0, name: String(r.name).trim(), days: {} });
        e.n++; e.days[day] = 1;
      });
    });
    const order = ['breakfast','lunch','dinner','snack'];
    const lines = [];
    order.forEach(function(slot){
      const m = bySlot[slot]; if(!m) return;
      const top = Object.keys(m).map(function(k){ return m[k]; })
        .map(function(e){ e.dayCount = Object.keys(e.days).length; return e; })
        .filter(function(e){ return e.dayCount >= 4; })   // four separate days, not four rows in one
        .sort(function(a, b){ return b.dayCount - a.dayCount; })
        .slice(0, 3);
      if(!top.length) return;
      lines.push('\u00b7 ' + slot + ': ' + top.map(function(e){
        return e.name + ' (' + e.dayCount + ' days)';
      }).join(', '));
    });
    if(!lines.length) return '';
    return "\n\nWHAT THEY ACTUALLY EAT, from their own diary over the last two months. This is not a "
      + "preference list they wrote down \u2014 it is what they have really reached for, repeatedly. Where "
      + "one of these fits the targets and the dietary rules, USE IT rather than inventing something "
      + "new: a plan made of food someone already eats is a plan they will still be following in three "
      + "weeks, and that matters more than a better-optimised one they abandon. Do not force them in, "
      + "and do not comment on the habit itself:\n" + lines.join('\n');
  }catch(_){ return ''; }
}

function _fuelRecipeLines(){
  try{
    const rs = (typeof ls === 'function' ? ls('totry_recipes') : null) || [];
    if(!Array.isArray(rs) || !rs.length) return '';
    // Bounded on purpose: this rides in a prompt, and a person with forty recipes must not push the
    // rest of the brief out of the model's attention.
    const lines = rs.slice(0, 8).map(function(r){
      if(!r || !r.name) return '';
      const sv = Math.max(1, parseInt(r.servings) || 1);
      const ing = (r.ingredients || []);
      const tot = ing.reduce(function(a, x){
        a.cal += (parseFloat(x && x.cal) || 0); a.pro += (parseFloat(x && x.pro) || 0); return a;
      }, { cal:0, pro:0 });
      // Ingredient NAMES, because that is what a shopping list is made of. Macros stay per serving,
      // because that is what a meal slot is sized by.
      const names = ing.map(function(x){ return (x && x.name) ? String(x.name) : ''; })
                       .filter(Boolean).slice(0, 12).join(', ');
      const per = (tot.cal > 0)
        ? ' (about ' + Math.round(tot.cal / sv) + ' kcal, ' + Math.round(tot.pro / sv) + 'g protein per serving)'
        : '';
      return '\u00b7 "' + String(r.name) + '"' + per + (names ? ' \u2014 ' + names : '');
    }).filter(Boolean);
    if(!lines.length) return '';
    return "\n\nTHEIR OWN SAVED RECIPES. Build the day around these wherever one genuinely fits the "
      + "targets and the dietary rules \u2014 a plan made of food they already chose is worth more than a "
      + "better-optimised plan of food they did not. Name each one EXACTLY as written here so the app "
      + "can recognise it, and put its ingredients on the shopping list. Do not use one that breaks a "
      + "dietary rule or a dislike, and do not feel obliged to use any of them:\n" + lines.join('\n');
  }catch(_){ return ''; }
}

// WHAT THE MODEL FORGETS, THE APP STILL OWES THEM. If a meal names one of their recipes, every
// ingredient of that recipe has to reach the one shopping list — otherwise the plan tells them to
// cook something and the list they shop from is missing half of it. Added items carry `fromRecipe`
// and NO price: we genuinely do not know what it costs at their store, and a 0 in the price column
// reads as free. The row renders the recipe name there instead.
// THE TOTAL IS WHAT THE LIST ADDS UP TO — not what the model said it would.
// Both places that set plan.total preferred the MODEL's own `total` field: at generation that figure
// covers only the items the model itself listed, so every ingredient _fuelMergeRecipeShopping adds
// afterwards was excluded from it; and after the live-price pass it was still preferred over the
// real sum, so an item the pricer could not match silently left the total unchanged. A person
// planning a week is being told what it costs — that number cannot come from anywhere but the rows
// they are looking at.
//
// It also reports what it does NOT know. An un-priced row is food they will still be buying, so a
// total that quietly omits it is worse than one that says it is incomplete — and "under budget" must
// never be claimed on a figure with holes in it.
// A PLANNER THAT LEARNS NEEDS A DENOMINATOR, AND THERE ISN'T ONE.
// Every logged row already carries what the plan SAID (`fromPlan`) — that is the numerator. But
// totry_meal_plan holds only the CURRENT plan, and regenerating overwrites it, so "you have never
// once made the Thursday dinner" is unanswerable: the app has no record that Thursday's dinner was
// ever planned. The outgoing plan is archived here, with which of its meals were actually eaten,
// because like `fromPlan` it cannot be recovered afterwards and everything downstream needs it to
// have started today. Names and outcomes only — no macros, no shopping list, no prices.
function _fuelArchivePlan(plan){
  try{
    if(!plan || !Array.isArray(plan.meals) || !plan.meals.length) return;
    const hist = ls('totry_plan_history') || [];
    hist.unshift({
      at: plan.generatedAt || Date.now(),
      meals: plan.meals.map(function(m){
        return { name: String((m && m.name) || 'Meal'), ate: !!(m && m.ateOn), servings: (m && m.ateServings) || null };
      })
    });
    // Twenty plans is months of history and a few kilobytes. This store syncs; it does not get to grow.
    ls('totry_plan_history', hist.slice(0, 20));
  }catch(_){ }
}

// WHAT THEY ACTUALLY KEEP, PER MEAL. Not "78% adherence" — that number is a scold and tells nobody
// what to do. The useful shape is which meals survive contact with their life and which never do,
// because the planner can then stop proposing the ones that never do. That is a meal planner that
// improves by being used, which no meal planner does, because none of them ever find out.
//
// The bar: a meal has to have been planned at least THREE times before its record means anything,
// and the whole thing stays quiet until there are at least two plans behind it. One abandoned week
// is a bad week, not a pattern — and calling it one is the shame this app refuses.
// A SWAP IS THE CLEAREST PREFERENCE SIGNAL IN THE APP, AND IT WAS BEING THROWN AWAY.
// _fuelSwapMeal replaced the meal and the rejected one vanished — so the next plan could offer the
// same thing again, and the one after that. "I do not want this" is worth more than "I ate this",
// because it is deliberate: eating can be convenience, rejecting is a choice. Kept as names and
// nothing else, capped, and it is the one list the planner is told to treat as final.
function _fuelReject(name){
  try{
    const n = String(name || '').trim(); if(!n) return;
    const list = ls('totry_food_rejects') || [];
    const k = n.toLowerCase();
    if(list.some(function(x){ return x && String(x.name || '').toLowerCase() === k; })) return;
    list.unshift({ name: n, at: Date.now() });
    ls('totry_food_rejects', list.slice(0, 40));
  }catch(_){ }
}

function _fuelRejectLines(){
  try{
    const list = ls('totry_food_rejects') || [];
    if(!Array.isArray(list) || !list.length) return '';
    return "\n\nTHEY HAVE ALREADY SWAPPED THESE AWAY: " + list.slice(0, 12).map(function(x){ return x.name; }).join(', ')
      + ". Never offer any of them, or anything that is obviously the same meal under another name. "
      + "A person who has to reject the same suggestion twice stops trusting the whole plan.";
  }catch(_){ return ''; }
}

// AND WHAT A COACH ACTUALLY DOES THAT THIS DID NOT.
// Everything above narrows: use their recipes, use what they already eat, drop what they never make,
// never repeat a rejection. Narrowing alone ends in the same four meals forever — which is its own
// failure, because boredom is why people stop, and a diet of four things is a thin one whatever its
// macros say. A good coach mostly gives you what you will actually eat and ONE new thing, close
// enough to what you like that you will try it.
//
// Only once there is something to anchor to. For someone the app does not know yet, everything is
// new and the instruction means nothing.
function _fuelTryLines(anchored){
  if(!anchored) return '';
  return "\n\nAND EXACTLY ONE NEW THING. Everything above tells you what they already eat, and a plan "
    + "made only of that goes stale \u2014 which is its own way of losing someone. Include ONE meal they "
    + "have not had before, chosen to sit CLOSE to something they already like (a familiar protein "
    + "cooked differently, a swap of one component, the same shape of meal from somewhere else) "
    + "rather than something adventurous. One, not two. It must still fit the targets, the budget and "
    + "every dietary rule, and it must not be anything on the swapped-away or never-made lists. Do "
    + "not label it as the new one or draw attention to it.";
}

function _fuelAdherence(){
  try{
    const hist = ls('totry_plan_history') || [];
    if(!Array.isArray(hist) || hist.length < 2) return null;
    const by = {};
    hist.forEach(function(h){
      ((h && h.meals) || []).forEach(function(m){
        if(!m || !m.name) return;
        const k = String(m.name).trim().toLowerCase(); if(!k) return;
        const e = (by[k] = by[k] || { name: String(m.name).trim(), planned: 0, kept: 0 });
        e.planned++; if(m.ate) e.kept++;
      });
    });
    const rows = Object.keys(by).map(function(k){ return by[k]; }).filter(function(e){ return e.planned >= 3; });
    if(!rows.length) return null;
    const kept = rows.filter(function(e){ return e.kept / e.planned >= 0.8; })
                     .sort(function(a, b){ return b.planned - a.planned; }).slice(0, 4);
    const never = rows.filter(function(e){ return e.kept === 0; })
                      .sort(function(a, b){ return b.planned - a.planned; }).slice(0, 4);
    if(!kept.length && !never.length) return null;
    return { kept: kept, never: never, plans: hist.length };
  }catch(_){ return null; }
}

// Told to the planner as a fact about the person, not as a verdict on them.
function _fuelAdherenceLines(){
  const a = _fuelAdherence();
  if(!a) return '';
  const bits = [];
  if(a.kept.length) bits.push('They reliably make: ' + a.kept.map(function(e){ return e.name; }).join(', ') + '.');
  if(a.never.length) bits.push('They have never once made: ' + a.never.map(function(e){
    return e.name + ' (planned ' + e.planned + ' times)'; }).join(', ') + '.');
  return "\n\nWHAT THEY ACTUALLY KEEP, from " + a.plans + " of their own past plans. " + bits.join(' ')
    + " Build around the first list. Do NOT propose anything on the second one again \u2014 something they "
    + "have never made is not a plan, whatever its macros say, and offering it a fourth time is how a "
    + "person decides the whole thing is not for them. Say nothing to them about either list.";
}

function _fuelTotals(plan){
  const rows = (plan && Array.isArray(plan.shopping)) ? plan.shopping : [];
  let sum = 0, unpriced = 0;
  rows.forEach(function(s){
    const v = parseFloat(s && s.price);
    if(isFinite(v) && v > 0) sum += v; else unpriced++;
  });
  return { sum: Math.round(sum * 100) / 100, unpriced: unpriced, complete: unpriced === 0 };
}

function _fuelMergeRecipeShopping(plan){
  try{
    if(!plan || !Array.isArray(plan.meals)) return plan;
    const rs = (typeof ls === 'function' ? ls('totry_recipes') : null) || [];
    if(!Array.isArray(rs) || !rs.length) return plan;
    const norm = function(x){ return String(x == null ? '' : x).trim().toLowerCase(); };
    const byName = {};
    rs.forEach(function(r){ if(r && r.name) byName[norm(r.name)] = r; });
    if(!Array.isArray(plan.shopping)) plan.shopping = [];
    const have = plan.shopping.map(function(s){ return norm(s && s.item); });
    const already = function(n){
      const k = norm(n); if(!k) return true;
      return have.some(function(h){ return h === k || h.indexOf(k) > -1 || k.indexOf(h) > -1; });
    };
    plan.meals.forEach(function(m){
      const r = m && byName[norm(m.name)];
      if(!r) return;
      m.mine = true;                                  // so the plan can say this one is theirs
      (r.ingredients || []).forEach(function(x){
        const n = x && x.name ? String(x.name) : '';
        if(!n || already(n)) return;
        // A GROUP OF ITS OWN, because these are the ones we cannot place. An empty `shop` falls into
        // the generic "Shopping" heading beside real store groups, which reads as if we had simply
        // failed to route them. Named, they read as what they are: the rest of what your own recipe
        // needs, for you to pick up wherever you already buy it.
        plan.shopping.push({ item: n, price: 0, shop: 'From your recipes', fromRecipe: String(r.name) });
        have.push(norm(n));
      });
    });
    return plan;
  }catch(_){ return plan; }
}

async function _fuelGenerate(){
  const p = getMealPrefs();
  const ctx = _fuelCtx();
  let cal = ctx.cal;
  const floor = ctx.sex==='female' ? 1300 : 1500;
  if(ctx.goalDir==='cut' && cal < floor) cal = floor; // never plan a crash
  const dn = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const gym = (ls('totry_cal_events')||[]).filter(function(e){ return e && e.type==='gym'; });
  const trainingDays = gym.length ? Array.from(new Set(gym.map(function(e){ return dn[e.day]; }))).join(', ') : '';
  const lead = getPreworkoutLead();
  const preworkout = _fuelComputePreworkout(lead); // concrete pre-gym meal times from their real schedule
  const load = document.createElement('div'); load.className='modal-bg open'; load.id='fuel-loading'; load.style.alignItems='center';
  load.innerHTML = '<div class="modal" style="text-align:center"><div style="font-size:var(--t-title1);margin-bottom:10px">'+svgIcon("utensils",24)+'</div><div style="font-family:var(--font-display);font-size:var(--t-xl);font-weight:700;color:var(--tx);margin-bottom:6px">Building your plan…</div><div style="font-size:var(--t-sm);color:var(--tx3);line-height:1.6">Fitting your targets, budget and training, and building your shopping list.</div></div>';
  document.body.appendChild(load);
  let brief=''; try{ if(typeof getLifeState==='function') brief = getLifeState().brief || ''; }catch(_){ brief=''; }
  // RESOLVE THE CONTRADICTION FOR A NUMBERS-OFF PERSON. The brief embedded above tells the model
  // never to state a calorie figure; this prompt then tells it to hit a kcal target within 5%. Two
  // instructions that cannot both be followed, and the model resolves it however it likes — which
  // for a person whose relationship with counting is the thing that hurt them can mean a plan whose
  // meal names carry the numbers. The render already hides its OWN figures under gentle mode; the
  // model's free text is the part nothing was guarding. Say both halves plainly instead.
  const _fuelGentle = (typeof nutGentle==='function') && nutGentle();
  const _gentleRule = _fuelGentle
    ? "\n\nIMPORTANT: build the plan TO the calorie and protein targets given \u2014 they are how the plan is "
      + "sized \u2014 but this person has numbers turned OFF and must never read one. Do NOT write any calorie "
      + "or macro figure in ANY text you return: not in a meal name, not in a note, not in the shopping "
      + "list, not in the summary. Describe portions in food terms (a palm of chicken, a fist of rice)."
    : '';
  const sys = "You are a registered-dietitian-level meal planner in a faith-rooted whole-life app. You are honest, evidence-based and non-partial: food-first, never push brands or supplements, cite where prices came from, and separate general guidance from individual advice. Build realistic, affordable plans from REAL products at the named supermarket, using web search for CURRENT prices. Return ONLY valid JSON, no prose.";
  const dietStr = _fuelDietStr(p);
  const shops = _fuelShopChains(p); const shopsStr = shops.join(', ') || (p.chain || 'your supermarket');
  const timingStr = preworkout.length ? ('Their gym sessions and pre-gym meal deadlines: '+preworkout.map(function(x){return x.day+' gym '+x.sessionStart+' (finish the pre-gym meal by '+x.eatBy+')';}).join('; ')+'.') : '';
  // Narrowing first — their recipes, what they eat, what they keep, what they rejected — and then
  // the one thing that widens, anchored to all of it.
  const _habits = _fuelHabitLines();
  const _recipeBlock = _fuelRecipeLines() + _habits + _fuelAdherenceLines() + _fuelRejectLines()
    + _fuelTryLines(!!_habits || !!_fuelRecipeLines());
  const prompt = _gentleRule + _recipeBlock + "Build a realistic "+(p.mealsPerDay||4)+"-meal day for one person, plus a weekly shopping list, in "+(p.country||'Australia')+". Context: "+brief+". Daily targets: the meals MUST total close to "+cal+" kcal (within ~5%) and reach about "+ctx.pro+"g protein (goal: "+ctx.goalDir+") — adjust portion sizes to hit these numbers. Weekly grocery budget ~"+curSym()+(p.budget||0)+". STRICTLY respect these dietary requirements and NEVER include any forbidden food (e.g. if vegan, no animal products; if 'no beef', no beef anywhere): "+dietStr+(p.restrictions?('; '+p.restrictions):'')+". "+((p.includeSupps!==false)?"May include 1-2 evidence-backed supermarket supplements (creatine, whey, electrolytes), optional and food-first.":"No supplements.")+" Give FULL macros per meal: cal, protein, carbs, fat. The DAY must also cover MICRONUTRIENTS — enough fibre, iron, calcium, healthy fats/omega-3, potassium, and a real range of vegetables and fruit; summarise this in 'microNote' with rough fibre grams. "+(preworkout.length?("Time carbohydrate around training. "+timingStr+" In 'carbNote', say what to eat before training referencing those times."):"In 'carbNote', explain carb timing generally and note that adding their training schedule unlocks exact meal times.")+" If their context shows an eating-related struggle or a hard time of day (late-night snacking, stress/boredom eating, alcohol, a risk window), address it directly in the plan — e.g. build in a genuinely satisfying planned snack for that window so they are not reaching for the vice on an empty stomach — and name it warmly in that meal's 'why' or in carbNote (like a big brother who knows their fight). The person shops at these stores: "+shopsStr+". For EVERY shopping item, set 'shop' to exactly ONE of those store names — choose the store that is cheapest or most likely to stock it, so the list is organised store-by-store for one trip each. Use typical current prices at that store (estimates, to confirm in-store). Keep 'items' and 'why' SHORT. Return ONLY compact JSON, no prose: {\"meals\":[{\"name\":\"\",\"items\":\"\",\"cal\":0,\"pro\":0,\"carbs\":0,\"fat\":0,\"why\":\"\"}],\"microNote\":\"\",\"carbNote\":\"\",\"shopping\":[{\"item\":\"\",\"price\":0,\"shop\":\"\"}],\"total\":0,\"note\":\"\"}. Each \"why\" ties the meal to their goal. \"note\" says the science is general \u2014 do NOT write anything about prices being estimates, the app says that itself, with the button that fixes it.";
  const parsePlan = function(t){ try{
    let c=(t||'').replace(/```json|```/g,'').trim();
    c = c.slice(c.indexOf('{'), c.lastIndexOf('}')+1);
    // Repair common free-model JSON glitches: object separators emitted as "}={" or "}{" instead of "},{".
    c = c.replace(/}\s*=\s*{/g, '},{').replace(/}\s*{/g, '},{').replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(c);
  }catch(_){ return null; } };
  // Fast + reliable: build the plan from the model's knowledge (prices as estimates). Live pricing
  // (a focused web-search pass on just the shopping list) is a follow-up so generation stays quick.
  let txt=''; try{ txt = await api(sys, [], prompt, 1800, { timeout:35000 }); }catch(e){ txt=''; }
  let plan = parsePlan(txt);
  if(plan) plan._estimated = true;
  const lm = document.getElementById('fuel-loading'); if(lm) lm.remove();
  // A model returning {"meals":"see below"} passed `!plan.meals`, was persisted AND synced, and then
  // every consumer does plan.meals.map(...) — so "View my plan" threw and did nothing, on every device.
  if(!plan || !Array.isArray(plan.meals) || !plan.meals.length){ if(typeof showToast==='function') showToast('Hmm', 'Couldn’t build it just now — try again in a moment.'); return; }
  // Before the new plan replaces the old one, keep what became of the old one. This is the only
  // moment that record exists.
  try{ _fuelArchivePlan(ls('totry_meal_plan')); }catch(_){ }
  plan = _fuelMergeRecipeShopping(plan);
  // AFTER the merge, so the ingredients it just added are counted rather than silently dropped.
  plan.total = _fuelTotals(plan).sum;
  plan.generatedAt = Date.now(); plan.targets = { cal:cal, pro:ctx.pro }; plan.budget = p.budget||0; plan.preworkout = preworkout; plan.lead = lead;
  ls('totry_meal_plan', plan); if(typeof syncToCloud==='function') syncToCloud();
  if(typeof haptic==='function') haptic('success');
  renderFuelPlanCard();
  _fuelRenderPlan(plan);
}

function _fuelViewPlan(){ const plan = ls('totry_meal_plan'); if(plan && plan.meals) _fuelRenderPlan(plan); else openFuelPlan(); }

// Concrete pre-gym meal times from the person's REAL scheduled gym events + their personal lead.
function _fuelComputePreworkout(lead){
  const dn=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const gym=(ls('totry_cal_events')||[]).filter(function(e){ return e && e.type==='gym' && e.start; });
  const fmt=function(H,M){ const ap=H<12?'am':'pm'; let hr=H%12; if(hr===0)hr=12; return hr+(M?(':'+String(M).padStart(2,'0')):'')+ap; };
  return gym.map(function(e){
    const parts=(e.start||'18:00').split(':');
    // NaN-check, never `|| default` — a midnight session (hour 00) is a real 0, and `0 || 18` would
    // silently turn 12:30am into 6:30pm. That bug gave late-night lifters and shift workers the
    // wrong fuel window entirely.
    let h=parseInt(parts[0],10); if(isNaN(h)) h=18;
    let mn=parseInt(parts[1],10); if(isNaN(mn)) mn=0;
    let total=h*60+mn-(lead||75); if(total<0) total+=1440;
    return { day:(dn[e.day]||''), sessionStart:fmt(h,mn), eatBy:fmt(Math.floor(total/60), total%60) };
  });
}
// "Find your number" — adjust the personal pre-workout lead and re-time everything from the real schedule.
function _fuelSetLead(delta){
  let lead = getPreworkoutLead() + delta;
  if(lead<15) lead=15; if(lead>240) lead=240;
  ls('totry_preworkout_lead', lead); if(typeof syncToCloud==='function') syncToCloud();
  const plan = ls('totry_meal_plan');
  if(plan){ plan.preworkout = _fuelComputePreworkout(lead); plan.lead=lead; ls('totry_meal_plan', plan); }
  const m=document.getElementById('fuel-plan-modal'); if(m) m.remove();
  if(plan) _fuelRenderPlan(plan);
}

function _fuelRenderPlan(plan){
  const p = getMealPrefs();
  const R = Math.round;
  const money = function(v){ return curSym()+(R((v||0)*100)/100).toFixed(2); };
  const _gentle = (typeof nutGentle==='function' && nutGentle());   // numbers off means numbers off
  const _todayKey = (typeof dayKeyOf==='function') ? dayKeyOf() : '';
  const mealsHtml = (plan.meals||[]).map(function(mm, i){
    return '<div style="padding:10px 0;border-top:1px solid var(--bd)">'+
      '<div style="display:flex;justify-content:space-between;gap:8px"><div style="font-size:var(--t-base);font-weight:500;color:var(--tx)">'+_esc(mm.name||'Meal')+(mm.mine?'<span style="font-size:var(--t-cap);color:var(--go);font-weight:400;margin-left:6px">one of yours</span>':'')+'</div><div style="font-family:var(--font-text);font-size:var(--t-mini);color:var(--tx3);white-space:nowrap">'+(_gentle?'':(R(mm.cal||0)+' cal \u00b7 '+R(mm.pro||0)+'p \u00b7 '+R(mm.carbs||0)+'c \u00b7 '+R(mm.fat||0)+'f'))+'</div></div>'+
      '<div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.5;margin-top:3px">'+_esc(mm.items||'')+'</div>'+
      (mm.why?'<div style="font-size:var(--t-cap);color:var(--go);line-height:1.5;margin-top:5px;font-style:italic">'+_esc(mm.why)+'</div>':'')+
      '<button onclick="_fuelSwapMeal('+i+')" style="margin-top:6px;background:none;border:none;color:var(--tx3);font-size:var(--t-cap);cursor:pointer;font-family:var(--font-text);letter-spacing:0.03em">↻ swap this meal</button>'+
      // The meal's own confirmation, because the day is not one event. Shown as done once it is
      // down, so a second tap cannot record the same dinner twice.
      ((mm.ateOn === _todayKey)
        ? '<span style="margin-top:6px;margin-left:10px;color:var(--gr);font-size:var(--t-cap);font-family:var(--font-text)">\u2713 logged'+(mm.ateServings && mm.ateServings !== 1 ? ' \u00d7 '+mm.ateServings : '')+'</span>'
        : '<button onclick="_fuelAteMeal('+i+')" style="margin-top:6px;margin-left:10px;background:none;border:none;color:var(--go);font-size:var(--t-cap);cursor:pointer;font-family:var(--font-text);letter-spacing:0.03em">I ate this</button>')+
    '</div>';
  }).join('');
  // Number() so an already-stored string cannot turn addition into concatenation.
  const sum = function(k){ return (plan.meals||[]).reduce(function(a,mm){ const n=parseFloat(mm&&mm[k]); return a+(isFinite(n)?n:0); },0); };
  const dayCal=sum('cal'), dayPro=sum('pro'), dayCarbs=sum('carbs'), dayFat=sum('fat');
  const macroRow = _gentle ? '' : '<div style="display:flex;justify-content:space-between;margin-top:12px;padding:9px 12px;background:var(--bg3);border-radius:var(--rs);font-family:var(--font-text);font-size:var(--t-mini);color:var(--tx2)"><span>'+R(dayCal)+' cal</span><span style="color:var(--gr)">'+R(dayPro)+'g P</span><span style="color:var(--bl)">'+R(dayCarbs)+'g C</span><span style="color:var(--go)">'+R(dayFat)+'g F</span></div>';
  const tgtCal = (plan.targets&&plan.targets.cal)||0, tgtPro = (plan.targets&&plan.targets.pro)||0;
  const calGap = tgtCal ? (dayCal - tgtCal) : 0; const onTarget = tgtCal && Math.abs(calGap) <= tgtCal*0.08;
  const targetHtml = (tgtCal && !_gentle) ? ('<div style="font-size:var(--t-cap);line-height:1.5;margin-top:6px;color:'+(onTarget?'var(--gr)':'var(--go)')+'">'+(onTarget ? ('On target — ~'+R(dayCal)+' of your '+tgtCal+' cal, '+R(dayPro)+' of '+tgtPro+'g protein.') : (calGap<0 ? ('About '+R(-calGap)+' cal under your '+tgtCal+' target — bump portions, or <span onclick="_fuelAddSnack()" style="color:var(--go);border-bottom:1px solid var(--go-bd);cursor:pointer">add a snack to hit it →</span>') : ('About '+R(calGap)+' cal over your '+tgtCal+' target — trim portions slightly.')))+'</div>') : '';
  const _td = _fuelToday();
  const todayHtml = tgtCal ? ('<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:10px 12px;background:var(--bg3);border-radius:var(--rs);gap:8px"><div style="font-size:var(--t-cap);color:var(--tx2);line-height:1.4">'+(_gentle ? 'What you ate today counts toward your day, not the plan.' : 'Logged today <span style="font-family:var(--font-text);color:var(--tx)">'+R(_td.cal)+'</span> / '+tgtCal+' cal<br><span style="color:var(--tx3);font-size:var(--t-mini)">counts to your target, not the plan</span>')+'</div><button onclick="_fuelFlexToday()" style="flex-shrink:0;background:none;color:var(--go);border-radius:100px;padding:7px 13px;font-size:var(--t-cap);cursor:pointer;white-space:nowrap;background:var(--fill2)">Eating out?</button></div>') : '';
  const microHtml = plan.microNote ? '<div style="font-size:var(--t-cap);color:var(--tx2);line-height:1.6;margin-top:10px"><span style="color:var(--gr);font-weight:600">Micronutrients · </span>'+_esc(plan.microNote)+'</div>' : '';
  let timingHtml='';
  if(plan.preworkout && plan.preworkout.length){
    const rows = plan.preworkout.map(function(x){ return '<div style="display:flex;justify-content:space-between;font-size:var(--t-sm);padding:4px 0"><div style="color:var(--tx2)">'+_esc(x.day)+' · gym '+_esc(x.sessionStart)+'</div><div style="color:var(--go);font-family:var(--font-text)">eat by '+_esc(x.eatBy)+'</div></div>'; }).join('');
    timingHtml='<div style="background:var(--bg3);border-radius:var(--rm);padding:12px;margin-top:14px">'+
      '<div class="eyebrow" style="color:var(--go);margin-bottom:6px">Fuel around your training</div>'+rows+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--bd);gap:10px"><div style="font-size:var(--t-cap);color:var(--tx3);line-height:1.4">Pre-workout meal: '+(plan.lead||getPreworkoutLead())+' min before<br>find your number — adjust by feel</div><div style="display:flex;gap:6px"><button onclick="_fuelSetLead(-15)" style="width:30px;height:30px;border-radius:var(--rs);background:var(--bg2);color:var(--tx2);font-size:var(--t-base);cursor:pointer">−</button><button onclick="_fuelSetLead(15)" style="width:30px;height:30px;border-radius:var(--rs);background:var(--bg2);color:var(--tx2);font-size:var(--t-base);cursor:pointer">+</button></div></div>'+
      (plan.carbNote?'<div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.6;margin-top:8px">'+_esc(plan.carbNote)+'</div>':'')+
    '</div>';
  } else {
    timingHtml='<div style="background:var(--bg3);border-radius:var(--rm);padding:12px;margin-top:14px">'+
      '<div class="eyebrow" style="color:var(--go);margin-bottom:6px">Fuel around your training</div>'+
      '<div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.6;margin-bottom:10px">Add your training times and I’ll tell you exactly when to eat before each session — real times, not generic advice.</div>'+
      '<button class="btn" style="width:100%;background:var(--bg2);color:var(--go);font-size:var(--t-sm);padding:10px" onclick="closeModal(this);if(typeof go===\'function\')go(\'calendar\')">Add my schedule →</button>'+
    '</div>';
  }
  // Interactive shopping checklist — tap an item off as you shop (persists), per-store progress.
  const row1 = function(s){ const got=!!s.got; return '<div onclick="_fuelToggleShopItem(this,'+s._i+')" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;font-size:var(--t-sm);cursor:pointer"><div style="display:flex;align-items:center;gap:9px;flex:1;min-width:0"><span class="fuel-tick" style="width:16px;height:16px;border-radius:4px;border:1px solid '+(got?'var(--go)':'var(--bd2)')+';background:'+(got?'var(--go)':'transparent')+';display:inline-flex;align-items:center;justify-content:center;font-size:var(--t-cap);color:#231803;flex-shrink:0">'+(got?'✓':'')+'</span><span class="fuel-item" style="color:var(--tx2)'+(got?';text-decoration:line-through;opacity:0.45':'')+'">'+_esc(s.item||'')+'</span></div><span class="fuel-price" style="font-family:var(--font-text);color:var(--tx);white-space:nowrap'+(got?';opacity:0.45':'')+'">'+((!s.price && s.fromRecipe) ? _esc(s.fromRecipe) : money(s.price))+'</span></div>'; };
  const shopHtml = (function(){
    const items = (plan.shopping||[]).map(function(s,idx){ s._i=idx; return s; });
    if(!items.length) return '';
    const groups = {}, order = [];
    items.forEach(function(s){ const k=((s.shop||'').trim())||'Shopping'; if(!groups[k]){ groups[k]=[]; order.push(k); } groups[k].push(s); });
    if(order.length <= 1) return items.map(row1).join(''); // single store — flat list
    return order.map(function(k){
      const list=groups[k]; const sub=list.reduce(function(a,s){ return a+(s.price||0); },0); const gotN=list.filter(function(s){ return s.got; }).length;
      // A GROUP WE DELIBERATELY DID NOT PRICE MUST NOT SHOW A TOTAL OF ZERO. The recipe items carry
      // no price because we do not know what they cost at this person's store — printing "$0.00"
      // beside them says they are free, which is the same lie the row avoids by showing the recipe
      // name where the price would be.
      const _unpriced = sub === 0 && list.length > 0 && list.every(function(s){ return !s.price && s.fromRecipe; });
      return '<div style="margin-top:10px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px"><div style="font-size:var(--t-base);font-weight:600;color:var(--go)">'+_esc(k)+' <span style="font-size:var(--t-mini);color:var(--tx3);font-weight:400">'+gotN+'/'+list.length+'</span></div><div style="font-family:var(--font-text);font-size:var(--t-cap);color:var(--tx3)">'+(_unpriced ? '' : money(sub))+'</div></div>'+list.map(row1).join('')+'</div>';
    }).join('');
  })();
  // THE TOTAL COMES FROM THE ROWS, and it says what it does not know. plan.total is recomputed by
  // _fuelTotals at both write sites, but a plan restored from the cloud may still carry the model's
  // old figure, so the render works it out again rather than trusting the stored one.
  const _t = _fuelTotals(plan);
  const total = _t.sum; const budget = plan.budget||p.budget||0;
  // OVER budget is CERTAIN even with rows still to price — the missing ones can only add. UNDER is
  // not: claiming it on an incomplete figure is how a person plans a week they cannot afford. The
  // verdict is withheld until the list is whole, rather than guessed at.
  const overBudget = budget>0 && total>budget;
  const _budgetUnknown = budget>0 && !overBudget && !_t.complete;
  const m = document.createElement('div'); m.className='modal-bg open'; m.id='fuel-plan-modal'; m.style.alignItems='flex-end';
  m.innerHTML = '<div class="modal" style="text-align:left;max-height:90vh;overflow-y:auto">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-family:var(--font-display);font-size:var(--t-title1);font-weight:700;color:var(--tx)">Your fuel plan</div><button onclick="closeModal(this)" style="background:none;border:none;color:var(--tx3);font-size:var(--t-xl);cursor:pointer">×</button></div>'+
    '<div style="font-size:var(--t-sm);color:var(--tx3);margin-bottom:14px">'+(_gentle ? 'A full day of eating' : ('A day around '+R(dayCal)+' cal'))+(p.chain?' \u00b7 '+_esc(p.chain):'')+'</div>'+
    '<div class="eyebrow" style="color:var(--go);margin-bottom:2px">A day of meals</div>'+
    mealsHtml+ macroRow+ targetHtml+ todayHtml+ microHtml+ timingHtml+
    '<div class="eyebrow" style="margin:16px 0 4px">Weekly shopping list</div>'+shopHtml+
    '<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--bd);font-size:var(--t-base)"><div style="color:var(--tx);font-weight:600">Weekly total</div><div style="font-family:var(--font-text);color:'+(overBudget?'var(--re)':(_t.complete?'var(--gr)':'var(--tx2)'))+'">'+(_t.complete?'':'at least ')+money(total)+(budget?(' / '+curSym()+_moneyG(budget)):'')+'</div></div>'+
    (_t.unpriced?('<div style="font-size:var(--t-cap);color:var(--tx3);margin-top:6px;line-height:1.5">'+plural(_t.unpriced,'item')+' '+(_t.unpriced===1?'has':'have')+' no price yet \u2014 mostly what came from your own recipes'+(plan._estimated?', and the rest are estimates':'')+'. Get live prices and this total is the real one.</div>'):'')+
    '<button onclick="_fuelCopyShopList()" style="width:100%;margin-top:8px;background:none;color:var(--tx3);border-radius:var(--rs);padding:8px;font-size:var(--t-cap);cursor:pointer;background:var(--fill2)">Copy shopping list</button>'+
    (overBudget?'<div style="font-size:var(--t-cap);color:var(--re);margin-top:6px;line-height:1.5">A bit over budget — tap Regenerate for a leaner version, or nudge your budget up.</div>':'')+
    (_budgetUnknown?'<div style="font-size:var(--t-cap);color:var(--tx3);margin-top:6px;line-height:1.5">Under budget on what is priced so far \u2014 but not all of it is, so this is not the final answer yet.</div>':'')+
    ((plan._estimated && _t.complete)?'<div style="font-size:var(--t-cap);color:var(--tx3);line-height:1.5;margin-top:10px">Prices are estimates — tap “Get live prices”, or confirm in-store.</div>':'')+
    ((plan.citations&&plan.citations.length)?'<div style="font-size:var(--t-mini);color:var(--tx3);line-height:1.6;margin-top:8px">Prices checked: '+plan.citations.map(_esc).join(' · ')+'</div>':'')+
    (plan.note?'<div style="font-size:var(--t-cap);color:var(--tx3);line-height:1.6;margin-top:12px;font-style:italic">'+_esc(plan.note)+'</div>':'')+
    '<button class="btn primary" style="margin-top:16px" onclick="_fuelLogPlan(this)">Log today’s meals</button>'+
    (plan._estimated?'<button class="btn" style="margin-top:8px;background:var(--bg3);color:var(--go)" onclick="_fuelLivePrices()">Get live prices →</button>':'')+
    '<button class="btn" style="margin-top:8px;background:none;color:var(--tx2);background:var(--fill2)" onclick="closeModal(this);_fuelGenerate()">↻ Regenerate</button>'+
    '</div>';
  document.body.appendChild(m);
}

// Close the target gap in one tap — add a snack sized to the remaining calories/protein.
async function _fuelAddSnack(){
  const plan = ls('totry_meal_plan'); if(!plan || !plan.meals) return;
  const p = getMealPrefs(); const dietStr = _fuelDietStr(p);
  const dayCal = plan.meals.reduce(function(a,m){return a+(m.cal||0);},0), dayPro = plan.meals.reduce(function(a,m){return a+(m.pro||0);},0);
  const tgt = (plan.targets&&plan.targets.cal)||0, tgtP = (plan.targets&&plan.targets.pro)||0;
  const gapC = Math.max(100, Math.round(tgt - dayCal)), gapP = Math.max(0, Math.round(tgtP - dayPro));
  if(typeof showToast==='function') showToast('Adding a snack…', (typeof nutGentle==='function'&&nutGentle()) ? 'Topping up the day.' : ('Filling the ~'+gapC+' cal gap.'));
  const shopsStr = (p.chains&&p.chains.join(', ')) || p.chain || 'the supermarket';
  const sys = "You are a dietitian. Return ONLY one JSON snack object, no prose.";
  const prompt = "Add ONE realistic snack to close a daily gap of about "+gapC+" kcal and "+gapP+"g protein. STRICTLY respect diet: "+dietStr+(p.restrictions?('; '+p.restrictions):'')+". Available at "+shopsStr+" ("+(p.country||'Australia')+"). Return ONLY JSON: {\"name\":\"\",\"items\":\"\",\"cal\":0,\"pro\":0,\"carbs\":0,\"fat\":0,\"why\":\"\"}.";
  let txt=''; try{ txt = await api(sys, [], prompt, 300, { timeout:25000 }); }catch(e){ txt=''; }
  let meal=null; try{ let c=(txt||'').replace(/```json|```/g,'').trim(); c=c.slice(c.indexOf('{'),c.lastIndexOf('}')+1).replace(/,\s*([}\]])/g,'$1'); meal=JSON.parse(c); }catch(_){ meal=null; }
  if(!meal || !meal.name){ if(typeof showToast==='function') showToast('Hmm','Couldn’t add it — try again shortly.'); return; }
  if(!meal.name.match(/snack/i)) meal.name = 'Snack — '+meal.name;
  const _clean = _fuelSaneMeal(meal);
  if(!_clean){ if(typeof showToast==='function') showToast('Hmm','That snack came back unusable — try again shortly.'); return; }
  plan.meals.push(_clean); ls('totry_meal_plan', plan); if(typeof syncToCloud==='function') syncToCloud();
  if(typeof haptic==='function') haptic('success');
  const m=document.getElementById('fuel-plan-modal'); if(m) m.remove();
  _fuelRenderPlan(plan);
}

// Swap a single meal without regenerating the whole plan.
// Never store a model's numbers unchecked. Coerce to finite numbers, clamp to what a single meal can
// plausibly be, and keep the text fields as strings — a swapped meal is written straight into
// totry_meal_plan and synced, so a bad value follows the person to every device.
function _fuelSaneMeal(meal){
  if(!meal || typeof meal!=='object') return null;
  const num=(v,max)=>{ const n=parseFloat(v); return (isFinite(n) && n>=0) ? Math.min(n,max) : 0; };
  const str=(v,len)=>String(v==null?'':v).slice(0,len);
  const out={
    name: str(meal.name,80),
    items: str(meal.items||meal.ingredients||'',300),
    cal:  Math.round(num(meal.cal,  3000)),   // one meal, not one day
    pro:  Math.round(num(meal.pro,   300)),
    carbs: Math.round(num(meal.carbs != null ? meal.carbs : meal.carb, 500)),   // the model returns "carbs"
    fat:  Math.round(num(meal.fat,   300)),
  };
  if(meal.slot!=null) out.slot=str(meal.slot,24);
  if(meal.time!=null) out.time=str(meal.time,24);
  return out.name ? out : null;
}
async function _fuelSwapMeal(i){
  const plan = ls('totry_meal_plan'); if(!plan || !plan.meals || !plan.meals[i]) return;
  const p = getMealPrefs();
  const dietStr = _fuelDietStr(p);
  const old = plan.meals[i];
  if(typeof showToast==='function') showToast('Swapping…', 'Finding a different '+(old.name||'meal')+'.');
  const others = plan.meals.filter(function(_,j){ return j!==i; }).map(function(mm){ return mm.name; }).join(', ');
  const shopsStr = (p.chains&&p.chains.join(', ')) || p.chain || 'the supermarket';
  const sys = "You are a dietitian. Return ONLY one JSON meal object, no prose.";
  const prompt = "Replace this meal: \""+(old.name||'')+" — "+(old.items||'')+"\" with a DIFFERENT meal for the same slot. Keep roughly the same calories (~"+Math.round(old.cal||0)+" kcal) and protein (~"+Math.round(old.pro||0)+"g). STRICTLY respect diet: "+dietStr+(p.restrictions?('; '+p.restrictions):'')+". Available at "+shopsStr+" ("+(p.country||'Australia')+"). Do NOT duplicate these meals: "+others+". Return ONLY JSON: {\"name\":\"\",\"items\":\"\",\"cal\":0,\"pro\":0,\"carbs\":0,\"fat\":0,\"why\":\"\"}.";
  let txt=''; try{ txt = await api(sys, [], prompt, 400, { timeout:25000 }); }catch(e){ txt=''; }
  let meal=null; try{ let c=(txt||'').replace(/```json|```/g,'').trim(); c=c.slice(c.indexOf('{'),c.lastIndexOf('}')+1).replace(/,\s*([}\]])/g,'$1'); meal=JSON.parse(c); }catch(_){ meal=null; }
  if(!meal || !meal.name){ if(typeof showToast==='function') showToast('Hmm','Couldn’t swap that one — try again shortly.'); return; }
  const _clean = _fuelSaneMeal(meal);
  if(!_clean){ if(typeof showToast==='function') showToast('Hmm','That swap came back unusable — try again shortly.'); return; }
  try{ _fuelReject(old && old.name); }catch(_){ }   // what they turned down, before it is gone
  plan.meals[i] = _clean; // Re-read after the await: a second edit started while this one was in flight holds its own
  // stale copy of the whole plan, and whichever returns last silently reverts the other.
  const _fresh = ls('totry_meal_plan') || plan;
  if(_fresh && _fresh.meals && plan && plan.meals) _fresh.meals = plan.meals.slice();
  ls('totry_meal_plan', _fresh || plan); if(typeof syncToCloud==='function') syncToCloud();
  if(typeof haptic==='function') haptic('success');
  const m=document.getElementById('fuel-plan-modal'); if(m) m.remove();
  _fuelRenderPlan(plan);
}

// Today's ACTUAL logged intake (from the tracker) — the day is anchored to targets, not the plan.
function _fuelToday(){ try{ const today=dayKeyOf(); const arr=(ls('totry_nutlog')||{})[today]||[]; return { cal: arr.reduce(function(a,e){return a+(e.cal||0);},0), pro: arr.reduce(function(a,e){return a+(e.pro||0);},0) }; }catch(_){ return {cal:0,pro:0}; } }

// Grace when real life happens (a buffet, a night out, anything off-plan). The plan is a guide,
// not a cage — let it slide, anchor to the day's TARGET, and log whatever they actually ate.
function _fuelFlexToday(){
  const plan = ls('totry_meal_plan')||{};
  const tgt = (plan.targets&&plan.targets.cal)||0;
  const td = _fuelToday();
  const left = tgt ? Math.max(0, Math.round(tgt - td.cal)) : 0;
  const _gentle = (typeof nutGentle==='function' && nutGentle());
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:left">'+
    '<div style="font-family:var(--font-display);font-size:var(--t-xl);font-weight:700;color:var(--tx);margin-bottom:10px">Going out? Enjoy it.</div>'+
    '<div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.7;margin-bottom:16px">A meal out, a buffet, a night with people — that’s a life, not a failure. One meal won’t undo your week; what you do <i>most</i> days is what shapes you. The plan is a guide, not a cage.'+((tgt&&!_gentle)?(' You’ve still got about <b style="color:var(--tx)">'+left+' cal</b> to your target today if you want a rough anchor — or just be present and pick it up tomorrow.'):'')+'</div>'+
    '<button class="btn primary" onclick="closeModal(this);if(typeof go===\'function\')go(\'nourish\');setTimeout(function(){var i=document.getElementById(\'nut-search-in\');if(i)i.focus();},350)">Log what I ate</button>'+
    '<button class="btn" style="margin-top:8px;background:none;color:var(--tx2);background:var(--fill2)" onclick="closeModal(this);if(typeof haptic===\'function\')haptic(\'tap\');if(typeof showToast===\'function\')showToast(\'Enjoy it\',\'You’re living, not failing. Back on track tomorrow.\')">Just enjoy it — back tomorrow</button>'+
    '</div>';
  document.body.appendChild(m);
}

// Interactive shopping checklist — tick items off as you shop (persists per item).
function _fuelToggleShopItem(el, idx){
  const plan = ls('totry_meal_plan'); if(!plan || !plan.shopping || !plan.shopping[idx]) return;
  plan.shopping[idx].got = !plan.shopping[idx].got;
  // Synchronous — nothing can have changed under us, and re-reading here would DISCARD the tick we
  // just made. It did: the v496 race fix was applied to this function by mistake as well as to the
  // async meal editors, so a ticked item came back unticked on every return to the tab.
  ls('totry_meal_plan', plan);
  const got = plan.shopping[idx].got;
  const tick = el.querySelector('.fuel-tick'), item = el.querySelector('.fuel-item'), price = el.querySelector('.fuel-price');
  if(tick){ tick.style.background = got?'var(--go)':'transparent'; tick.style.borderColor = got?'var(--go)':'var(--bd2)'; tick.textContent = got?'✓':''; }
  if(item){ item.style.textDecoration = got?'line-through':'none'; item.style.opacity = got?'0.45':'1'; }
  if(price){ price.style.opacity = got?'0.45':'1'; }
  // update this store's got/total counter
  try{ const header = el.parentElement.querySelector('div span'); if(header && /^\d+\/\d+$/.test(header.textContent)){ const rows=el.parentElement.querySelectorAll('[onclick^="_fuelToggleShopItem"]'); const done=Array.prototype.filter.call(rows,function(r){ return r.querySelector('.fuel-tick') && r.querySelector('.fuel-tick').textContent==='✓'; }).length; header.textContent = done+'/'+rows.length; } }catch(_){}
  if(typeof haptic==='function') haptic('tap');
}
function _fuelCopyShopList(){
  const plan = ls('totry_meal_plan'); if(!plan || !plan.shopping) return;
  const groups={}, order=[]; plan.shopping.forEach(function(s){ const k=(s.shop||'Shopping'); if(!groups[k]){ groups[k]=[]; order.push(k); } groups[k].push(s); });
  let txt='My ToTry shopping list\n';
  order.forEach(function(k){ txt+='\n'+k+':\n'; groups[k].forEach(function(s){ txt+='  - '+(s.item||'')+(s.price?(' ('+curSym()+_moneyG(s.price)+')'):'')+'\n'; }); });
  txt+='\nTotal: '+curSym()+(plan.total||0);
  try{ if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(function(){ if(typeof showToast==='function') showToast('Copied','Shopping list copied — paste it anywhere.'); }, function(){ if(typeof showToast==='function') showToast('List ready', txt.slice(0,80)); }); return; } }catch(_){}
  if(typeof showToast==='function') showToast('List', txt.slice(0,80));
}

// Push the plan's meals into today's food log — closes the loop with the tracker.
// WHICH MEAL OF THE DAY IS THIS? The planner's meals carry a dish name, not a slot, so the slot comes
// from the name when the name says so and from the position otherwise. Position is the honest default:
// a 3-meal day is breakfast/lunch/dinner, and the snacks in a 4- or 5-meal day sit between them, which
// is how _fuelGenerate is asked to build it in the first place.
function _fuelMealSlot(name, i, n){
  const s = String(name || '').toLowerCase();
  if(/\bbreakfast\b|\bbrekky\b/.test(s)) return 'breakfast';
  if(/\blunch\b/.test(s)) return 'lunch';
  if(/\bdinner\b|\bsupper\b/.test(s)) return 'dinner';
  if(/\bsnack\b/.test(s)) return 'snack';
  const BY_COUNT = {
    1: ['lunch'],
    2: ['breakfast','dinner'],
    3: ['breakfast','lunch','dinner'],
    4: ['breakfast','lunch','snack','dinner'],
    5: ['breakfast','snack','lunch','snack','dinner'],
    6: ['breakfast','snack','lunch','snack','dinner','snack']
  };
  const row = BY_COUNT[n];
  if(row && row[i]) return row[i];
  // More meals than the table names: the ends are still the ends, the middle alternates.
  if(i === 0) return 'breakfast';
  if(i === n - 1) return 'dinner';
  return (i % 2) ? 'snack' : 'lunch';
}
// A PLAN IS AN INTENTION. A DIARY IS A RECORD. Writing one into the other makes the record a claim
// about the future, and this app's counsel is only ever as true as what it is counselling from — a
// fictional diary poisons the calorie target, the weight correlation, and the brief every AI surface
// reads. What a person actually cooks and eats is reliably NOT what the plan said: they eat one and
// a half servings, they leave the parmesan out, they skip lunch, they eat out, they make Thursday's
// dinner on Tuesday. So the plan does not become the day. The person says what happened, per meal.
//
// The amount is asked because it is the single biggest real discrepancy for a home-cooked recipe:
// "one serving" is what the plan assumed and almost never what the pot produced.
async function _fuelAteMeal(i){
  const plan = ls('totry_meal_plan'); if(!plan || !plan.meals || !plan.meals[i]) return;
  const mm = plan.meals[i];
  const today = dayKeyOf();
  let servings = 1;
  try{
    const a = await askText('How much of it did you have?', mm.name || 'This meal',
      { value:'1', type:'number', confirmLabel:'Log it' });
    if(a === null || a === undefined || a === '') return;          // they backed out; nothing is claimed
    servings = parseFloat(a); if(!isFinite(servings) || servings <= 0) return;
  }catch(_){ return; }
  const rows = _fuelPlanRows(plan, [i], servings);
  if(!rows.length) return;
  const log = ls('totry_nutlog') || {}; if(!log[today]) log[today] = [];
  rows.forEach(function(r){ log[today].push(r); });
  if(typeof _pruneNutLog === 'function') _pruneNutLog(log);
  ls('totry_nutlog', log); if(typeof syncToCloud === 'function') syncToCloud();
  // WHAT THEY PLANNED AND WHAT THEY ATE, BOTH KEPT. The row carries the planned figure beside the
  // eaten one, which is the only way the gap between the two is ever measurable — and that gap is
  // the thing no other app has, because no other app holds both.
  mm.ateOn = today; mm.ateServings = servings;
  ls('totry_meal_plan', plan);
  if(typeof renderNutritionLog === 'function') renderNutritionLog();
  if(typeof autoTickHabits === 'function') autoTickHabits();
  if(typeof haptic === 'function') haptic('success');
  const mdl = document.getElementById('fuel-plan-modal'); if(mdl) mdl.remove();
  _fuelRenderPlan(plan);
  if(typeof showToast === 'function') showToast('Logged', (mm.name || 'Meal') + (servings === 1 ? '' : ' \u00d7 ' + servings));
}

// The rows a set of planned meals becomes. One implementation, so the per-meal path and the
// whole-day one cannot record the same meal two different ways.
function _fuelPlanRows(plan, idxs, servings){
  const today = dayKeyOf();
  const mult = (servings == null) ? 1 : servings;
  const _recipes = (typeof ls === 'function' ? ls('totry_recipes') : null) || [];
  const _byName = {};
  _recipes.forEach(function(r){ if(r && r.name) _byName[String(r.name).trim().toLowerCase()] = r; });
  const out = [];
  idxs.forEach(function(i, n){
    const mm = plan.meals[i]; if(!mm) return;
    const row = { id: Date.now()+n, name: mm.name||'Meal', serving: String(mm.items||'').slice(0,120)||'1 serving',
      qty: 1, meal: _fuelMealSlot(mm.name, i, plan.meals.length),
      cal: Math.round((mm.cal||0)*mult), pro: Math.round((mm.pro||0)*mult*10)/10,
      carb: Math.round((mm.carbs||0)*mult*10)/10, fat: Math.round((mm.fat||0)*mult*10)/10,
      ts: new Date().toISOString(), date: today,
      // THE GAP, KEPT. What the plan said, beside what they had. Nothing reads this yet; it is the
      // only record of the distance between intention and act, and it cannot be recovered later.
      fromPlan: { cal: Math.round(mm.cal||0), servings: mult, at: plan.generatedAt || null },
      source: 'Fuel plan' };
    const r = _byName[String(mm.name||'').trim().toLowerCase()];
    if(r && Array.isArray(r.ingredients) && r.ingredients.length && typeof nutPick === 'function' && typeof NUTRIENTS !== 'undefined'){
      const tot = {};
      r.ingredients.forEach(function(ing){
        NUTRIENTS.forEach(function(k){ const v = Number(ing && ing[k]); if(isFinite(v)) tot[k] = (tot[k]||0) + v; });
      });
      const one = nutPick(tot, mult / Math.max(1, parseInt(r.servings) || 1));
      if(one && isFinite(one.cal) && one.cal > 0){
        NUTRIENTS.forEach(function(k){ if(typeof one[k] === 'number' && isFinite(one[k])) row[k] = one[k]; });
        row.serving = (mult === 1) ? '1 serving' : (mult + ' servings');
        row.source = 'Your recipe';
      }
    }
    out.push(row);
  });
  return out;
}

async function _fuelLogPlan(btn){
  const plan = ls('totry_meal_plan'); if(!plan || !plan.meals || !plan.meals.length) return;
  const today = dayKeyOf();
  // ONLY WHAT IS NOT ALREADY DOWN. Tapping this after logging two meals by hand must not record
  // them a second time.
  const idxs = plan.meals.map(function(_, i){ return i; })
    .filter(function(i){ return plan.meals[i] && plan.meals[i].ateOn !== today; });
  if(!idxs.length){
    if(typeof showToast === 'function') showToast('Already down', 'Every meal in this plan is logged for today.');
    return;
  }
  // AND IT IS A CLAIM THEY MAKE, NOT ONE THE APP MAKES FOR THEM. This used to write the whole
  // planned day into the diary on one tap — an intention recorded as a fact. Whatever else it is,
  // the diary has to be the thing that actually happened, or nothing built on top of it is worth
  // reading. Asked plainly, with the count, so "yes" means yes.
  const names = idxs.map(function(i){ return plan.meals[i].name || 'a meal'; }).join(', ');
  const ok = (typeof askConfirm === 'function')
    ? await askConfirm('Did you eat ' + (idxs.length === plan.meals.length ? 'the whole plan' : 'the rest of it') + ' today?\n\n' + names + '\n\nOnly say yes if that is what actually happened \u2014 anything else and it is better to log the meals one at a time.')
    : true;
  if(!ok) return;
  const rows = _fuelPlanRows(plan, idxs, 1);
  const log = ls('totry_nutlog') || {}; if(!log[today]) log[today] = [];
  rows.forEach(function(r){ log[today].push(r); });
  if(typeof _pruneNutLog === 'function') _pruneNutLog(log);
  ls('totry_nutlog', log); if(typeof syncToCloud === 'function') syncToCloud();
  idxs.forEach(function(i){ plan.meals[i].ateOn = today; plan.meals[i].ateServings = 1; });
  ls('totry_meal_plan', plan);
  if(typeof renderNutritionLog === 'function') renderNutritionLog();
  if(typeof autoTickHabits === 'function') autoTickHabits();
  if(typeof haptic === 'function') haptic('success');
  if(btn && typeof closeModal === 'function') closeModal(btn);
  if(typeof showToast === 'function') showToast('Logged', plural(rows.length, 'meal') + ' added to today.');
}

// A focused web-search pass to replace estimated prices with real, cited ones (per store).
async function _fuelLivePrices(){
  const plan = ls('totry_meal_plan'); if(!plan || !plan.shopping || !plan.shopping.length) return;
  const p = getMealPrefs();
  const shops = _fuelShopChains(p); const shopsStr = shops.join(', ') || (p.chain||'');
  if(typeof showToast==='function') showToast('Checking prices…', 'Looking up current prices at '+(shopsStr||'your shops')+'.');
  const items = plan.shopping.map(function(s){ return s.item; }).filter(Boolean);
  const sys = "You look up CURRENT real supermarket prices via web search and return ONLY JSON. Be honest; if unsure, give your best estimate.";
  const prompt = "In "+(p.country||'Australia')+", at these stores: "+shopsStr+", find the current price of each grocery item below and pick the cheapest of those stores that stocks it. Items: "+items.join('; ')+". Return ONLY JSON: {\"prices\":[{\"item\":\"\",\"price\":0,\"shop\":\"\"}],\"total\":0,\"citations\":[\"\"]}.";
  let txt=''; try{ txt = await api(sys, [], prompt, 1500, { web_search:true, timeout:40000 }); }catch(e){ txt=''; }
  let data=null; try{ let c=(txt||'').replace(/```json|```/g,'').trim(); c=c.slice(c.indexOf('{'),c.lastIndexOf('}')+1); c=c.replace(/}\s*=\s*{/g,'},{').replace(/}\s*{/g,'},{').replace(/,\s*([}\]])/g,'$1'); data=JSON.parse(c); }catch(_){ data=null; }
  if(!data || !data.prices){ if(typeof showToast==='function') showToast('Hmm','Couldn’t fetch live prices just now — try again shortly.'); return; }
  const byItem = {}; data.prices.forEach(function(pr){ if(pr && pr.item) byItem[String(pr.item).toLowerCase().trim()] = pr; });
  plan.shopping.forEach(function(s){ const mm = byItem[String(s.item||'').toLowerCase().trim()]; if(mm){ if(typeof mm.price==='number' && mm.price>0) s.price=mm.price; if(mm.shop) s.shop=mm.shop; } });
  // The model's own `total` is a CLAIM about the list; the list is the fact. They disagree whenever
  // an item could not be matched, and taking the claim hid exactly those.
  plan.total = _fuelTotals(plan).sum;
  plan.citations = data.citations||[]; plan._estimated = false;
  ls('totry_meal_plan', plan); if(typeof syncToCloud==='function') syncToCloud();
  if(typeof haptic==='function') haptic('success');
  const mm2=document.getElementById('fuel-plan-modal'); if(mm2) mm2.remove();
  _fuelRenderPlan(plan);
  if(typeof showToast==='function') showToast('Prices updated','Live prices from '+(shopsStr||'your shops')+'.');
}

async function parseCalendarAI(){
  const input = document.getElementById('cal-ai-input');
  const btn = document.getElementById('cal-ai-btn');
  const text = (input?.value||'').trim();
  if(!text){ showToast('Nothing to add','Paste a roster or type your schedule first.'); return; }
  // A FREE-TEXT BOX THAT GOES TO A MODEL, WITH NO GATE. Typing a suicide disclosure here returned
  // the parser's own failure toast — "Couldn't read that clearly ... or rephrase" — which reads as
  // the app brushing the sentence off. detectCrisis() already answered "suicide" for it in this very
  // page; this door just never asked. Gated before the text leaves the device.
  const _calC = (typeof journalCrisisOf==='function') ? journalCrisisOf(text) : null;
  if(_calC && typeof journalMeetCrisis==='function' && journalMeetCrisis(_calC)) return;
  if(btn){ btn.textContent = 'Reading...'; btn.disabled = true; }
  try{
    const sys = 'You extract calendar events from messy text (work rosters, class timetables, plain notes) into strict JSON. Today is '+new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'.';
    const prompt = 'From the text below, extract every event as a JSON array. Each item: {"title":string,"type":"work"|"class"|"gym"|"personal"|"other","day":0-6 (0=Monday..6=Sunday),"start":"HH:MM" 24h,"end":"HH:MM" 24h or null,"recurring":true if it repeats weekly}. Infer type from context (shift/work=work, lecture/tutorial/class=class, gym/training/workout=gym). If a specific date is given, still map it to its weekday. Return ONLY the JSON array, no prose.\n\nTEXT:\n'+text;
    const resp = await api(sys, [], prompt, 1500);
    let events = [];
    try{
      const clean = (resp||'').replace(/```json|```/g,'').trim();
      const start = clean.indexOf('['); const end = clean.lastIndexOf(']');
      events = JSON.parse(clean.slice(start, end+1));
    }catch(e){ throw new Error('parse'); }
    if(!Array.isArray(events) || !events.length){ throw new Error('empty'); }
    // Normalize + store
    const list = _calEvents();
    let added = 0;
    events.forEach((e,i) => {
      if(typeof e.day !== 'number' || e.day < 0 || e.day > 6) return;
      list.push({
        id: Date.now()+i,
        title: (e.title||'Event').slice(0,50),
        type: ['work','class','gym','personal','other'].includes(e.type) ? e.type : 'other',
        day: e.day,
        start: /^\d{1,2}:\d{2}$/.test(e.start||'') ? e.start : '09:00',
        end: /^\d{1,2}:\d{2}$/.test(e.end||'') ? e.end : null,
        recurring: e.recurring !== false,
      });
      added++;
    });
    _saveCalEvents(list);
    if(input) input.value = '';
    renderCalendar();
    haptic('success'); showToast('Added', added+' event'+(added===1?'':'s')+' added to your week.');
  }catch(err){
    // Graceful fallback — never leave them stuck.
    const msg = (err.message==='parse'||err.message==='empty')
      ? 'Couldn\u2019t read that clearly. Try the "+ Add one" button, or rephrase (e.g. "gym Mon 6am, work Tue 9-5").'
      : ((typeof getAIErrorMessage==='function' && getAIErrorMessage()) || 'AI is unavailable right now. You can add events manually with "+ Add one".');
    showToast('Hmm', msg);
  }finally{
    if(btn){ btn.textContent = 'Add to my week'; btn.disabled = false; }
  }
}

// Compact home card — today's events at a glance.
function renderHomeCalendar(){
  const card = document.getElementById('home-calendar-card');
  const summary = document.getElementById('home-calendar-summary');
  if(!card || !summary) return;
  const events = _calEvents();
  if(!events.length){
    // Don't hide entirely — without a visible door, a new user can never reach the calendar to add
    // their first event. Show a gentle invitation instead.
    summary.innerHTML = '<span style="color:var(--tx2)">'+svgIcon("calendar")+' Add your week \u2014 paste a roster or type your schedule, and it shows up across the app.</span>';
    card.style.display = 'block';
    return;
  }
  const todayDow = (new Date().getDay()+6)%7;
  const todayEvents = events.filter(e => e.day === todayDow).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  if(!todayEvents.length){
    summary.innerHTML = '<span style="color:var(--tx3)">Nothing scheduled today.</span>';
  } else {
    const items = todayEvents.slice(0,3).map(e => {
      const col = CAL_TYPE_COLORS[e.type] || CAL_TYPE_COLORS.other;
      return '<span style="color:'+col+'">\u25cf</span> '+e.start+' '+_escFew(e.title);
    }).join('<br>');
    const more = todayEvents.length > 3 ? '<br><span style="color:var(--tx3);font-size:var(--t-cap)">+ '+(todayEvents.length-3)+' more</span>' : '';
    summary.innerHTML = items + more;
  }
  card.style.display = 'block';
}

function renderCalendar(){
  // Dispatch to the active view (day / week / month). Week is the default.
  const view = ls('totry_cal_view') || 'week';
  // AND PAINT THE SWITCHER TO MATCH. The selected-segment styling lived only in setCalView(), and
  // the markup hardcodes Week as the selected one — so reopening the app on Day or Month restored
  // the right pane under a switcher still saying Week.
  // It is the app's own segmented control now, so "selected" is a class, not three inline
  // declarations written out in two places that had to agree with each other.
  _calPaintSeg(view);
  const wk=document.getElementById('cal-week-view'), dy=document.getElementById('cal-day-view'), mo=document.getElementById('cal-month-view');
  if(wk) wk.style.display = view==='week'?'block':'none';
  if(dy) dy.style.display = view==='day'?'block':'none';
  if(mo) mo.style.display = view==='month'?'block':'none';
  if(view==='day') return renderCalendarDay();
  if(view==='month') return renderCalendarMonth();
  return renderCalendarWeek();
}
function _calPaintSeg(view){
  ['day','week','month'].forEach(function(x){
    const b = document.getElementById('calview-'+x);
    if(!b) return;
    b.classList.toggle('active', x === view);
    b.setAttribute('aria-selected', x === view ? 'true' : 'false');
  });
}
function setCalView(v){
  ls('totry_cal_view', v);
  _calPaintSeg(v);
  haptic('tap');
  renderCalendar();
}
// One event, one row, everywhere the calendar shows one. It was hand-painted twice over — a --bg3
// chip with a 3px coloured left border inside a card (a card inside a card), a 12px time in the
// third grey, and a delete glyph at 15px. The tile colour is the type; the row is the row.
const CAL_TYPE_TILE = {
  work:     { icon:'briefcase', tone:'indigo' },
  class:    { icon:'school',    tone:'purple' },
  // Orange, not green: the same dumbbell is orange on Grow and on Train, and green is food.
  gym:      { icon:'dumbbell',  tone:'orange' },
  personal: { icon:'user',      tone:'blue'   },
  other:    { icon:'calendar',  tone:'gray'   }
};
function calEventRow(e, opts){
  const t = CAL_TYPE_TILE[e.type] || CAL_TYPE_TILE.other;
  const time = (e.start || '') + (e.end ? '–' + e.end : '');
  // A <button> cannot contain the delete <button>, so the row is a div carrying the same onclick it
  // has always had — tap the row to edit, tap the x to remove. Both routes are unchanged.
  return iosRow({
    tag:'div', icon:t.icon, tone:t.tone,
    title: e.title,
    // THE SUBTITLE IS THE TIME. It read "09:00–17:00 · weekly" on six rows out of six, because the
    // add sheet ships "Repeats every week" checked and the roster parser defaults to it — so the
    // word marked nothing, on a screen already titled "Your week", and turned every subtitle into a
    // dot-joined strip instead of a time. The exception is what is worth saying: an event that does
    // NOT repeat only appears during the week it was added, and now the row says so.
    sub: time + (e.recurring ? '' : ' · This week only'),
    onclick: 'editCalEvent(' + e.id + ')',
    // No chevron: the row already carries a control at its end, and two trailing marks on one row is
    // the shape iOS never draws. Calendar.app's own list rows are tappable without one.
    chevron: false,
    cls: 'cal-row' + ((opts && opts.past) ? ' is-past' : ''),
    // The mark is the app's own icon, on the same grid and stroke as the chevron every other row
    // ends in — it was a literal × in the text face, the one hand-drawn control in a list of system
    // rows. The row and the delete are both unchanged: tap the row to edit, tap the mark to remove.
    trailing: '<button class="cal-row-x" onclick="event.stopPropagation();deleteCalEvent(' + e.id + ')" aria-label="Remove this event">' + svgIcon('close', 18) + '</button>'
  });
}
const CAL_DAY_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
// DAY VIEW — today's events as a simple ordered timeline.
function renderCalendarDay(){
  const wrap = document.getElementById('cal-day-view');
  if(!wrap) return;
  const events = _calEvents();
  const today = (typeof _calDayISO !== 'undefined' && _calDayISO) ? new Date(_calDayISO + 'T12:00:00') : new Date();
  const todayDow = (today.getDay()+6)%7;
  const dateLabel = today.toLocaleDateString('en-AU', {weekday:'long', day:'numeric', month:'long'});
  const dayEvents = events.filter(e => e.day === todayDow).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  let html;
  if(!dayEvents.length){
    html = iosList([iosRow({ title:'Nothing scheduled', cls:'cal-free' })],
      { header: dateLabel, footer:'Tap “Add an event” to block something in.' });
  } else {
    // "PASSED" MEANS PASSED NOW, ON THE DAY YOU ARE LOOKING AT. `today` is noon of the VIEWED date
    // when you arrive from the month grid, so this made nowMin a hard 720 — an event at 09:00 next
    // Sunday rendered greyed out as though it had already happened, and an 18:00 two weeks ago
    // rendered live. A day that is not today has no "now": nothing on it is passed or pending.
    const _real = new Date();
    const _viewingToday = today.toDateString() === _real.toDateString();
    const nowMin = _viewingToday ? (_real.getHours()*60 + _real.getMinutes()) : null;
    const rows = dayEvents.map(e => {
      const [sh,sm]=(e.start||'0:0').split(':').map(Number);
      // AND AN END TIME IS A REASON TO DECIDE, NOT TO GIVE UP. `e.end ? false` meant the events the
      // app knows most about — a 12:00-13:00 lift, a 9-5 shift, anything the roster parser fills an
      // end for — could never read as finished, while a vaguer no-end entry could. Dim once the end
      // has passed; wrap past midnight the way renderCalInsight does for overnight shifts.
      const _startMin = sh*60+(sm||0);
      let _endMin = null;
      if(e.end){
        const [eh,em] = String(e.end).split(':').map(Number);
        if(isFinite(eh)){ _endMin = eh*60+(em||0); if(_endMin < _startMin) _endMin += 1440; }
      }
      const isPast = (nowMin == null) ? false
        : (_endMin != null ? (_endMin < nowMin) : (_startMin < nowMin - 60));
      return calEventRow(e, { past: isPast });
    });
    html = iosList(rows, { header: dateLabel });
  }
  wrap.innerHTML = html;
  renderCalInsight(events);
}
function renderCalendarWeek(){
  const wrap = document.getElementById('cal-week-view');
  if(!wrap) return;
  const events = _calEvents();
  const todayDow = (new Date().getDay()+6)%7; // 0=Mon
  if(!events.length){
    wrap.innerHTML = '<div class="card"><div class="ios-empty">'+svgIcon('calendar',44)+
      '<div class="ios-empty-title">Nothing scheduled yet</div>'+
      '<div class="ios-empty-body">Add an event below, or paste a roster and let the app read it for you.</div></div></div>';
    const ic = document.getElementById('cal-insight-card'); if(ic) ic.style.display='none';
    return;
  }
  let html = '';
  CAL_DAY_FULL.forEach((dayName, dow) => {
    const dayEvents = events.filter(e => e.day === dow).sort((a,b) => (a.start||'').localeCompare(b.start||''));
    // An empty day is a row that says so, the way Calendar.app draws one — not an italic dash
    // hanging under a label.
    const rows = dayEvents.length ? dayEvents.map(e => calEventRow(e))
                                  : [iosRow({ title:'Nothing on', cls:'cal-free' })];
    html += iosList(rows, { header: dayName + (dow === todayDow ? ' · Today' : '') });
  });
  wrap.innerHTML = html;
  renderCalInsight(events);
}
// MONTH VIEW — a real month grid. Events are weekly-recurring (day-of-week based), so each date
// shows dots for whichever weekday's events fall on it. Tap a day to jump to it.
function renderCalendarMonth(){
  const wrap = document.getElementById('cal-month-view');
  if(!wrap) return;
  const events = _calEvents();
  const ref = window.__calMonthRef ? new Date(window.__calMonthRef) : new Date();
  const year = ref.getFullYear(), month = ref.getMonth();
  const first = new Date(year, month, 1);
  const startDow = (first.getDay()+6)%7; // Mon=0
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayStr = new Date().toDateString();
  const monthLabel = ref.toLocaleDateString('en-AU', {month:'long', year:'numeric'});
  // The month name set its own family and a font-weight:700 the brand face cannot render, and every
  // cell was a --bg3 tile with a border. iOS draws a month as numerals on the ground, with today as
  // one filled tint disc. The arrows are the app's own icons rather than two guillemets.
  let html = '<div class="card"><div class="cal-month-bar">'+
    '<button class="cal-arrow" onclick="calMonthShift(-1)" aria-label="Previous month">'+svgIcon('chevronleft',20)+'</button>'+
    '<div class="cal-month-name">'+monthLabel+'</div>'+
    '<button class="cal-arrow" onclick="calMonthShift(1)" aria-label="Next month">'+svgIcon('chevronright',20)+'</button></div>';
  html += '<div class="cal-month-grid cal-month-dow">';
  ['M','T','W','T','F','S','S'].forEach(d => html += '<div>'+d+'</div>');
  html += '</div><div class="cal-month-grid">';
  for(let i=0;i<startDow;i++) html += '<div></div>';
  for(let d=1; d<=daysInMonth; d++){
    const cellDate = new Date(year, month, d);
    const dow = (cellDate.getDay()+6)%7;
    // LOCAL midnight, formatted as UTC, is the day BEFORE at any positive offset. cellDate is
    // new Date(year, month, d) — local midnight — so at UTC+10 toISOString() returned the 5th
    // for the cell painted as the 6th: the grid highlighted today in gold and opened yesterday,
    // with yesterday's events. Everything from UTC+1 to UTC+14, all 24 hours of every day, which
    // includes this app's own home timezone and all of Europe on summer time.
    // This line IS the previous round's fix for "tapping any date opens today" (ae93f6b) — it
    // replaced one wrong day with another, which is why the dots two lines down disagree with it:
    // they scope off local `dow` and `cellDate` and are right, while the onclick was not.
    const _calCellISO = _todayLocalISO(cellDate);
    // A ONE-OFF IS NOT A WEEKLY. This matched on weekday alone, so an event saved with "Repeats
    // every week" OFF was drawn on that weekday in every week of the grid, for ever. Scope a
    // non-recurring event to the week it actually belongs to.
    const dayEvents = events.filter(e => e.day === dow && (e.recurring !== false || _calSameWeek(e, cellDate)));
    const isToday = cellDate.toDateString() === todayStr;
    const dots = dayEvents.slice(0,4).map(e => '<span style="background:'+(CAL_TYPE_COLORS[e.type]||CAL_TYPE_COLORS.other)+'"></span>').join('');
    html += '<button type="button" class="cal-cell" onclick="calJumpToDay('+dow+',\''+_calCellISO+'\')" aria-label="'+cellDate.toLocaleDateString('en-AU',{day:'numeric',month:'long'})+'">'+
      '<span class="cal-cell-n'+(isToday?' is-today':'')+'">'+d+'</span>'+
      '<span class="cal-cell-dots">'+dots+'</span></button>';
  }
  html += '</div></div>';
  wrap.innerHTML = html;
  renderCalInsight(events);
}
function calMonthShift(delta){
  const ref = window.__calMonthRef ? new Date(window.__calMonthRef) : new Date();
  // setMonth() on a day-of-month the target month does not have OVERFLOWS: 31 Jan + 1 month is
  // 31 February, which JavaScript rolls forward to 3 March. So from the 29th-31st the › arrow
  // skipped February entirely and it could not be reached going forward at all. Anchor to the 1st
  // before shifting — the grid only ever uses the month and year of this reference.
  ref.setDate(1);
  ref.setMonth(ref.getMonth()+delta);
  window.__calMonthRef = ref.toISOString();
  renderCalendarMonth();
}
function calJumpToDay(dow, iso){
  // Tapping a month-grid day jumps to the day view. The date was thrown away — every cell opened
  // today, whichever one you tapped — so the day view now gets the date it was asked for.
  _calDayISO = iso || null;
  setCalView('day');
}
// The day the day-view is showing. Null means today, which is what every other entry point wants.
let _calDayISO = null;
// A one-off event belongs to the week it was created in. Events carry no date of their own beyond
// `ts`, so that is the anchor; without a ts we cannot place it and it is treated as recurring,
// which is the behaviour it had before.
function _calSameWeek(e, cellDate){
  try{
    if(!e || !e.ts) return true;
    const made = new Date(e.ts);
    if(isNaN(made.getTime())) return true;
    const mondayOf = d => { const x = new Date(d); const off = (x.getDay()+6)%7;
      x.setHours(0,0,0,0); x.setDate(x.getDate()-off); return x.getTime(); };
    return mondayOf(made) === mondayOf(cellDate);
  }catch(_){ return true; }
}

function renderCalInsight(events){
  const card = document.getElementById('cal-insight-card');
  const body = document.getElementById('cal-insight-body');
  if(!card || !body) return;
  // Compute weekly committed hours by type.
  const hoursByType = {};
  let totalMins = 0;
  events.forEach(e => {
    if(!e.start || !e.end) return;
    const [sh,sm] = e.start.split(':').map(Number);
    const [eh,em] = e.end.split(':').map(Number);
    let mins = (eh*60+em) - (sh*60+sm);
    // AN OVERNIGHT SHIFT IS NOT ZERO HOURS. 22:00 to 06:00 gives -960 here and was dropped by the
    // guard below, so night shift — the pattern most likely to be someone's whole working week —
    // counted for nothing in "Your time".
    if(mins < 0) mins += 1440;
    if(mins <= 0) return;   // start equals end: nothing to count
    hoursByType[e.type] = (hoursByType[e.type]||0) + mins;
    totalMins += mins;
  });
  if(totalMins === 0){ card.style.display = 'none'; return; }
  const fmt = m => (m/60).toFixed(1).replace('.0','')+'h';
  const parts = Object.entries(hoursByType).sort((a,b)=>b[1]-a[1])
    .map(([t,m]) => '<span style="color:'+(CAL_TYPE_COLORS[t]||CAL_TYPE_COLORS.other)+'">'+t+'</span>: '+fmt(m));
  const gymMins = hoursByType.gym || 0;
  let nudge = '';
  if(gymMins === 0) nudge = ' No training blocked in yet — want to add a gym slot?';
  else if(gymMins >= 180) nudge = ' Solid training load this week. 💪';
  body.innerHTML = 'This week you\u2019ve committed <b>'+fmt(totalMins)+'</b> across '+parts.join(', ')+'.'+nudge;
  card.style.display = 'block';
}

function openEventLogger(){
  const m=document.createElement('div'); m.className='modal-bg open'; m.id='event-modal';
  // Opened fresh from "+ Add one" means this is not an edit, whatever the last one was.
  if(!_evEditPending) _evEditId = null;
  _evEditPending = false;
  // Time options every 15 min, 05:00–23:45, in 12h-ish labels but 24h values.
  let timeOpts='<option value="">—</option>';
  for(let h=5; h<=23; h++){ for(let mn=0; mn<60; mn+=15){ const v=String(h).padStart(2,'0')+':'+String(mn).padStart(2,'0'); const ampm=h<12?'am':'pm'; const h12=h%12===0?12:h%12; timeOpts+='<option value="'+v+'">'+h12+':'+String(mn).padStart(2,'0')+' '+ampm+'</option>'; } }
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  m.innerHTML='<div class="modal" style="max-height:90vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:var(--font-serif);font-size:var(--t-title1);font-style:italic;color:var(--tx);margin-bottom:4px">Add to your week.</div>'+
    '<div style="font-size:var(--t-sm);color:var(--tx3);margin-bottom:18px">Pick the day(s), set a time, done.</div>'+
    '<div class="lbl">What is it?</div>'+
    '<input type="text" id="ev-title" placeholder="e.g. Work shift, Lecture, Gym, Mass" style="margin-bottom:14px">'+
    '<div class="lbl">Which day(s)?</div>'+
    '<div id="ev-days" style="display:flex;gap:5px;margin-bottom:14px;flex-wrap:wrap">'+
      days.map((d,i)=>'<button type="button" class="ev-day-btn" data-day="'+i+'" onclick="_evToggleDay('+i+')" style="flex:1;min-width:38px;padding:10px 4px;border-radius:var(--rs);background:var(--bg3);color:var(--tx2);font-size:var(--t-sm);font-family:var(--font-text)">'+d+'</button>').join('')+
    '</div>'+
    '<div style="display:flex;gap:10px;margin-bottom:14px">'+
      '<div style="flex:1"><div class="lbl">Start</div><select id="ev-start">'+timeOpts+'</select></div>'+
      '<div style="flex:1"><div class="lbl">End <span style="opacity:0.6">(optional)</span></div><select id="ev-end">'+timeOpts+'</select></div>'+
    '</div>'+
    '<div class="lbl">Type</div>'+
    '<div id="ev-types" style="display:flex;gap:5px;margin-bottom:16px;flex-wrap:wrap">'+
      [['work','Work'],['class','Class'],['gym','Gym'],['personal','Personal'],['other','Other']].map(t=>'<button type="button" class="ev-type-btn" data-type="'+t[0]+'" onclick="_evSetType(\''+t[0]+'\')" style="flex:1;min-width:56px;padding:9px 4px;border-radius:var(--rs);background:var(--bg3);color:var(--tx2);font-size:var(--t-sm);font-family:var(--font-text)">'+t[1]+'</button>').join('')+
    '</div>'+
    '<label style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg3);border-radius:var(--rm);margin-bottom:18px;cursor:pointer"><span style="font-size:var(--t-base);color:var(--tx)">Repeats every week</span><input type="checkbox" id="ev-recurring" checked style="width:auto;transform:scale(1.3)"></label>'+
    '<button class="btn primary" style="padding:14px;margin-bottom:8px" onclick="_saveEventFromModal()">Add to week</button>'+
    '<button class="btn" onclick="document.getElementById(\'event-modal\')?.remove()" style="background:none;border:none;color:var(--tx3);font-size:var(--t-sm)">Cancel</button>'+
  '</div>';
  document.body.appendChild(m);
  m.addEventListener('click',e=>{ if(e.target===m) m.remove(); });
  window.__evDays=new Set(); window.__evType='other';
  // default to today selected
  const todayDow=(new Date().getDay()+6)%7; _evToggleDay(todayDow); _evSetType('other');
  if(typeof haptic==='function') haptic('tap');
}
function _evToggleDay(i){
  window.__evDays=window.__evDays||new Set();
  if(window.__evDays.has(i)) window.__evDays.delete(i); else window.__evDays.add(i);
  document.querySelectorAll('.ev-day-btn').forEach(b=>{
    const on=window.__evDays.has(parseInt(b.dataset.day));
    b.style.background=on?'var(--go-bg)':'var(--bg3)'; b.style.borderColor=on?'var(--go-bd)':'var(--bd)'; b.style.color=on?'var(--go)':'var(--tx2)';
  });
}
function _evSetType(t){
  window.__evType=t;
  document.querySelectorAll('.ev-type-btn').forEach(b=>{
    const on=b.dataset.type===t;
    b.style.background=on?'var(--go-bg)':'var(--bg3)'; b.style.borderColor=on?'var(--go-bd)':'var(--bd)'; b.style.color=on?'var(--go)':'var(--tx2)';
  });
}
// AN EVENT COULD ONLY BE DELETED. Tapping a row went straight to "Remove this from your week?",
// so a shift that moved by an hour meant deleting it and typing the whole thing again — and the
// only other control on the row was the same delete. The row edits now; the x still removes.
let _evEditId = null, _evEditPending = false;
function editCalEvent(id){
  const ev = (ls('totry_cal_events')||[]).find(function(e){ return e && e.id === id; });
  if(!ev){ if(typeof showToast==='function') showToast('That one is gone','It may have been removed already.'); return; }
  _evEditId = id; _evEditPending = true;
  openEventLogger();
  // The form is built synchronously by openEventLogger, so it is safe to fill straight after.
  try{
    const set = (i,v) => { const el=document.getElementById(i); if(el) el.value = v == null ? '' : v; };
    set('ev-title', ev.title); set('ev-start', ev.start); set('ev-end', ev.end);
    const rec = document.getElementById('ev-recurring'); if(rec) rec.checked = !!ev.recurring;
    window.__evType = ev.type || 'other';
    window.__evDays = new Set([ev.day]);
    if(typeof _evSetType === 'function') _evSetType(window.__evType);
    document.querySelectorAll('#ev-days [data-day]').forEach(function(b){
      const on = Number(b.getAttribute('data-day')) === ev.day;
      b.style.background = on ? 'var(--go-bg)' : 'var(--bg3)';
      b.style.borderColor = on ? 'var(--go-bd)' : 'var(--bd)';
      b.style.color = on ? 'var(--go)' : 'var(--tx2)';
    });
    const save = document.querySelector('#event-modal .btn.primary');
    if(save) save.textContent = 'Save changes';
  }catch(_){ }
}
function _saveEventFromModal(){
  const title=(document.getElementById('ev-title')?.value||'').trim();
  const start=document.getElementById('ev-start')?.value||'';
  const end=document.getElementById('ev-end')?.value||'';
  const recurring=!!document.getElementById('ev-recurring')?.checked;
  const days=Array.from(window.__evDays||[]);
  if(!title){ showToast('Add a name','What is the event?'); return; }
  if(!days.length){ showToast('Pick a day','Tap at least one day.'); return; }
  if(!start){ showToast('Set a start time','When does it start?'); return; }
  let list=(ls('totry_cal_events')||[]);
  // Editing replaces rather than adds — otherwise "save changes" would leave the old copy behind.
  // AND THE REMOVED ROW MUST BE TOMBSTONED, because v587 added totry_cal_events to the cloud union.
  // Before that, replacing locally was enough; after it, the old row still sits in the cloud and the
  // next pull unions it straight back — so editing a shift DUPLICATED it on every device, and the
  // duplicate was then pushed up. That is my own change's blast radius, and it is the case my notes
  // already name: never rewrite an entry's identity on edit without tombstoning what you replaced.
  if(_evEditId != null){
    const _before = list;
    list = list.filter(function(e){ return !(e && e.id === _evEditId); });
    try{ if(typeof tombstoneRemoved === 'function') tombstoneRemoved('totry_cal_events', _before, list); }catch(_){ }
  }
  const wk=_currentWeekStamp();
  days.forEach(d=>{ list.push({ id: Date.now()+d+Math.floor(Math.random()*1000), title:title.slice(0,50), type:window.__evType||'other', day:d, start, end:end||null, recurring, weekStamp: recurring?null:wk }); });
  _saveCalEvents(list);
  document.getElementById('event-modal')?.remove();
  renderCalendar();
  if(typeof haptic==='function') haptic('success');
  showToast(_evEditId != null ? 'Updated' : 'Added', title+(days.length>1?(' on '+days.length+' days'):'')+'.');
  _evEditId = null;
}
async function deleteCalEvent(id){
  if(!(await askConfirm('Remove this from your week?'))) return;
  const _before = ls('totry_cal_events') || [];
  const _after = _before.filter(e => e.id !== id);
  // TOMBSTONE THE DELETE, because this list is about to be UNIONED across devices. It was in
  // SYNC_KEYS but not the append-only union list, so it fell to the scalar rule and the last
  // device to write replaced the other's whole list \u2014 enter it on your phone, open your laptop,
  // and it is gone. Union fixes that; without a tombstone, union then makes the DELETE undoable
  // instead, which is the trap the union list's own comment warns about. Both halves or neither.
  try{ if(typeof tombstoneRemoved==='function') tombstoneRemoved('totry_cal_events', _before, _after); }catch(_){ }
  _saveCalEvents(_after);
  renderCalendar();
}


// Auto-categorize a transaction from its description using keyword matching.
function _autoCategory(desc){
  const d = (desc||'').toLowerCase();
  const rules = [
    ['Groceries', ['woolworths','coles','aldi','iga','grocery','supermarket','foodland']],
    ['Eating out', ['uber eats','ubereats','mcdonald','kfc','restaurant','cafe','coffee','doordash','menulog','hungry jack','dominos','pizza','bar ','pub']],
    ['Transport', ['uber','didi','opal','myki','fuel','petrol','bp ','shell','caltex','ampol','parking','transport','metro','train']],
    ['Bills', ['telstra','optus','vodafone','agl','origin','energy','water','council','insurance','rent','mortgage','electricity','gas bill']],
    ['Subscriptions', ['netflix','spotify','disney','youtube','prime','apple.com','icloud','adobe','gym','fitness','membership']],
    ['Shopping', ['amazon','ebay','kmart','target','big w','jb hi','myer','david jones','clothing','cotton on','uniqlo']],
    ['Health', ['pharmacy','chemist','priceline','doctor','medical','dental','hospital','medicare']],
    // Vices get their own lines. Seeing "$842/mo · Gambling" sitting in the breakdown is the whole
    // point — it's the truth that stays hidden when it's smeared into "Other". These reuse the same
    // merchant lists the vice ledger checks against, so the two never disagree.
    ['Gambling', VICE_MERCHANTS.gambling],
    ['Tobacco', VICE_MERCHANTS.tobacco],
    ['Alcohol', VICE_MERCHANTS.alcohol],
    ['Income', ['salary','payroll','wage','deposit','centrelink']],
  ];
  for(const [cat, kws] of rules){ if(kws.some(k => d.includes(k))) return cat; }
  return 'Other';
}
// Parse a CSV line respecting simple quoted fields.
// dd/mm/yyyy IS THE DEFAULT HERE, NOT mm/dd/yyyy.
// The importer used `new Date(dateStr)`, which reads "03/08/2026" as 8 MARCH (US order) instead of
// 3 August, and returns Invalid Date for "13/08/2026" because there is no thirteenth month. So every
// Australian or UK bank statement — the ones this feature exists for — arrived either shifted by months
// or unparseable, and an unparseable row silently fell back to today's date.
// The order is inferred from the file rather than assumed: a first number above 12 anywhere proves the
// file is day-first, and that decides the whole file.
function _csvDate(str, dayFirst){
  const t = String(str || '').trim();
  if(!t) return null;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);            // ISO first — unambiguous
  if(m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if(m){
    let a = +m[1], b = +m[2], y = +m[3];
    if(y < 100) y += 2000;
    const day = dayFirst ? a : b, mon = dayFirst ? b : a;
    if(day > 31 || mon > 12) return null;
    return new Date(y, mon - 1, day);
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}
function _csvDayFirst(values){
  try{
    for(const v of values){
      const m = String(v || '').trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.]\d{2,4}/);
      if(m){ if(+m[1] > 12) return true; if(+m[2] > 12) return false; }
    }
  }catch(_){ }
  return true;     // AU/UK default — this app is Australian and every other date in it is en-AU
}

function _parseCSVLine(line){
  const out = []; let cur = ''; let inQ = false;
  for(let i=0;i<line.length;i++){
    const c = line[i];
    if(c === '"'){ if(inQ && line[i+1]==='"'){ cur+='"'; i++; } else inQ = !inQ; }
    else if(c === ',' && !inQ){ out.push(cur); cur=''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}
// Try to find date/description/amount columns from a header row.
function _detectCSVColumns(header){
  const h = header.map(x => x.toLowerCase());
  const find = (cands, veto) => { for(const c of cands){
    const i = h.findIndex(x => x.includes(c) && !(veto||[]).some(v => x.includes(v)));
    if(i>=0) return i; } return -1; };
  // A COLUMN NAMED LIKE MONEY THAT IS NOT A TRANSACTION. "Credit Limit", "Available Credit" and
  // "Closing Balance" all contain a credit/debit word and all carry the same large number on every
  // row — which is precisely what makes them catastrophic if mistaken for the amount.
  const NOT_A_TX = ['limit','available','balance','score','rate','interest','opening','closing'];
  const out = {
    date: find(['date','posted','transaction date']),
    desc: find(['description','details','narrative','memo','payee','transaction']),
    // 'debit' was listed as a synonym for 'amount', so a bank exporting the common
    //     Date,Description,Debit,Credit,Balance
    // shape resolved amount to the DEBIT column — and the row loop takes the amount branch first, as
    // a signed figure, without negating it. Every purchase imported as INCOME: a statement with four
    // debits and one salary came in as "5 income, +$3,338.58", so the person's spending became their
    // earnings and every read built on it was wrong. A debit column is not an amount column; it is
    // half of a pair, and the branch below already knows how to negate it.
    amount: find(['amount','value']),
    credit: find(['credit','deposit','money in','paid in','received'], NOT_A_TX),
    debit: find(['debit','withdrawal','withdrawn','money out','paid out'], NOT_A_TX),
  };
  // AND THE HALF-FIX FROM LAST TIME. Dropping 'debit' from the amount synonyms was not enough: `find`
  // matches a SUBSTRING, so the extremely common
  //     Transaction Date,Narrative,Debit Amount,Credit Amount,Balance
  // still resolved amount to the DEBIT column — it contains the word "amount" — and the row loop takes
  // the amount branch first, unsigned. Measured on a real-shaped statement: "7 new: 0 expenses
  // (-$0.00), 7 income (+$3581.54)" — Uber Eats, BP, Coles, Woolworths, Netflix and a sportsbook all
  // booked as INCOME, spendPerMonth 0. Every read built on that is wrong, and the giving screens take
  // a percentage OF the income figure.
  // A column that is one half of a debit/credit pair is not an amount column, whatever it is called.
  if(out.amount >= 0 && (out.amount === out.debit || out.amount === out.credit)) out.amount = -1;
  return out;
}
function openCSVImport(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-family:var(--font-serif);font-size:var(--t-xl);font-style:italic;color:var(--tx);margin-bottom:6px">Import transactions</div>'+
    '<div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.6;margin-bottom:14px">Export a CSV from your banking app (most banks let you do this), then upload it here. ToTry reads the date, description, and amount, auto-sorts each into a category, and lets you review before saving. The file itself is never uploaded \u2014 it\u2019s read on your phone. What you choose to save is stored with the rest of your data, and syncs to your account if you\u2019re signed in.</div>'+
    '<div style="font-size:var(--t-cap);color:var(--tx3);line-height:1.5;margin-bottom:16px;padding:10px 12px;background:var(--bg3);border-radius:var(--rs)">Works with standard bank exports (columns like Date, Description, Amount). Negative amounts = spending, positive = income.</div>'+
    '<button class="btn primary" onclick="document.getElementById(&quot;csv-import-input&quot;).click()" style="margin-bottom:8px">Choose CSV file</button>'+
    '<button class="btn" onclick="closeModal(this)">Cancel</button></div>';
  document.body.appendChild(m);
}
function handleCSVFile(ev){
  const file = ev.target && ev.target.files && ev.target.files[0];
  if(!file) return;
  document.querySelector('.modal-bg.open')?.remove();
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const text = String(reader.result || '');
      const rows = text.split(/\r?\n/).filter(r => r.trim());
      if(rows.length < 2){ showToast('Empty file','That CSV had no rows to import.'); return; }
      // Detect columns from the header; if no recognizable header, assume date,desc,amount.
      let cols = _detectCSVColumns(_parseCSVLine(rows[0]));
      let startRow = 1;
      if(cols.date < 0 && cols.amount < 0 && cols.debit < 0){ cols = {date:0, desc:1, amount:2, credit:-1, debit:-1}; startRow = 0; }
      const parsed = [];
      // One decision for the whole file — a statement does not change date order halfway through.
      const __csvDayFirst = _csvDayFirst(rows.slice(startRow, startRow + 200).map(function(r){
        const ff = _parseCSVLine(r); return cols.date >= 0 ? (ff[cols.date] || '') : '';
      }));
      for(let i=startRow;i<rows.length;i++){
        const f = _parseCSVLine(rows[i]);
        if(f.length < 2) continue;
        const desc = cols.desc>=0 ? (f[cols.desc]||'') : (f[1]||'');
        let amt = 0, _fromAmountCol = false;
        if(cols.amount>=0 && f[cols.amount]){ amt = _csvAmount(f[cols.amount]); _fromAmountCol = !!amt; }
        else if(cols.debit>=0 && f[cols.debit]) amt = -Math.abs(_csvAmount(f[cols.debit]));
        // AND THE CREDIT COLUMN ONLY SPEAKS AS THE OTHER HALF OF A PAIR. This override was
        // unconditional, so a column merely NAMED like a credit replaced the real signed amount on
        // every row of the file: three purchases totalling -$174.29 imported as three incomes of
        // $5,000 each, and monthIncome() then had the giving and tithe screens asking for a tenth
        // of $15,000 nobody earned — the same disaster the debit fix was written for, and worse,
        // because the figure is now the credit limit rather than the spend. A real amount column
        // is the signed truth and nothing may overrule it.
        if(!_fromAmountCol && cols.credit>=0 && f[cols.credit]){ const c = _csvAmount(f[cols.credit]); if(c) amt = Math.abs(c); }
        if(!amt) continue;
        const dateStr = cols.date>=0 ? (f[cols.date]||'') : '';
        const when = dateStr ? (_csvDate(dateStr, __csvDayFirst) || new Date()) : new Date();
        const validWhen = isNaN(when.getTime()) ? new Date() : when;
        parsed.push({
          desc: desc.slice(0,60),
          amount: Math.abs(amt),
          // A CREDIT IS NOT INCOME. Moving money from savings, a refund, or a repaid loan all arrive as
      // positive amounts, and every one of them was booked as income — which inflates the figure the
      // tithe and giving screens take a percentage OF. Someone is then told to give ten percent of
      // money they already had. Self-transfers become a neutral type the income totals ignore.
      type: amt < 0 ? 'expense' : (/\b(transfer|from savings|internal|own account|repayment received|refund|refunded|reversal|reversed|chargeback|charge back|credit adjustment|returned)\b/i.test(String(desc||'')) ? 'transfer' : 'income'),
          category: amt < 0 ? _autoCategory(desc) : (/\b(transfer|from savings|internal|own account|repayment received|refund|refunded|reversal|reversed|chargeback|charge back|credit adjustment|returned)\b/i.test(String(desc||'')) ? 'Transfer' : 'Income'),
          ts: validWhen.toISOString(),
          date: dayKeyOf(validWhen),
        });
      }
      if(!parsed.length){ showToast('Nothing to import','Couldn\u2019t find transactions in that file. Check it has date, description, and amount columns.'); return; }
      _showCSVPreview(parsed);
    }catch(e){ console.error('CSV parse failed', e); showToast('Couldn\u2019t read that file','Make sure it\u2019s a standard CSV export.'); }
  };
  reader.readAsText(file);
  ev.target.value = '';
}
let _csvPending = [];
function _showCSVPreview(rawParsed){
  // Re-uploading is the whole point — a statement you pull weekly always overlaps the last one.
  // Drop what's already here so the ledger stays true no matter how often it's fed.
  const seen = _existingFingerprints();
  const dupes = [];
  const parsed = rawParsed.filter(p => {
    const fp = _txFingerprint(p);
    if(seen.has(fp)){ dupes.push(p); return false; }
    seen.add(fp);   // also catches duplicate rows inside this same file
    return true;
  });
  if(!parsed.length){
    haptic('tap');
    showToast('Already up to date', dupes.length+' transactions in that file were all imported before. Nothing double-counted.');
    return;
  }
  _csvPending = parsed;
  const expenses = parsed.filter(p=>p.type==='expense');
  const income = parsed.filter(p=>p.type==='income');
  const totalExp = expenses.reduce((s,p)=>s+p.amount,0);
  const totalInc = income.reduce((s,p)=>s+p.amount,0);
  const transfers = parsed.filter(p=>p.type==='transfer');
  const preview = parsed.slice(0,8).map(p =>
    '<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--bd);font-size:var(--t-sm)">'+
    '<span style="color:var(--tx2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">'+_escFew(p.desc)+' <span style="color:var(--tx3)">\u00b7 '+_escFew(p.category)+'</span></span>'+
    '<span style="color:'+(p.type==='expense'?'var(--re)':'var(--gr)')+';flex-shrink:0">'+(p.type==='expense'?'\u2212':'+')+curSym()+p.amount.toFixed(2)+'</span></div>'
  ).join('');
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-family:var(--font-serif);font-size:var(--t-xl);font-style:italic;color:var(--tx);margin-bottom:6px">Review import</div>'+
    '<div style="font-size:var(--t-sm);color:var(--tx2);margin-bottom:12px"><b>'+parsed.length+'</b> new: '+expenses.length+' expenses (\u2212'+curSym()+totalExp.toFixed(2)+'), '+income.length+' income (+'+curSym()+totalInc.toFixed(2)+')'+(transfers.length ? ', '+transfers.length+' moved between your own accounts \u2014 not counted as income' : '')+'.'+
      (dupes.length ? ' <span style="color:var(--tx3)">'+dupes.length+' already imported \u2014 skipped, not double-counted.</span>' : '')+'</div>'+
    '<div style="margin-bottom:14px">'+preview+(parsed.length>8?'<div style="font-size:var(--t-cap);color:var(--tx3);text-align:center;padding-top:8px">+ '+(parsed.length-8)+' more</div>':'')+'</div>'+
    '<button class="btn primary" onclick="confirmCSVImport()" style="margin-bottom:8px">Import all '+parsed.length+'</button>'+
    '<button class="btn" onclick="closeModal(this);_csvPending=[]">Cancel</button></div>';
  document.body.appendChild(m);
}
function confirmCSVImport(){
  if(!_csvPending.length){ return; }
  const list = ls('totry_transactions') || [];
  _csvPending.forEach((p,i) => {
    list.unshift({ id: Date.now()+i, type: p.type, amount: p.amount, category: p.category, note: p.desc, ts: p.ts, date: p.date });
  });
  ls('totry_transactions', list.slice(0, 1000));
  if(typeof syncToCloud==='function') syncToCloud();
  const n = _csvPending.length;
  _csvPending = [];
  document.querySelector('.modal-bg.open')?.remove();
  renderTransactions();
  try{ renderFinance(); }catch(_){}
  haptic('success');
  // Don't just confirm the file landed — say what it means. That's the whole difference between
  // a ledger and a read.
  setTimeout(()=>{ try{ openSpendingRead(n); }catch(_){ showToast('Imported', n+' transactions added.'); } }, 260);
}

// The read. What the money actually says, and the one place to lock in.
function spendingReadHTML(){
  const r = spendingRead();
  if(!r) return '<div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.6">Not enough yet to see a pattern. Import a statement and I’ll show you where it’s going.</div>';
  const money = n => curSym()+Math.abs(Math.round(n)).toLocaleString();
  // Say the span they ACTUALLY have. Math.max(0.5, …) inside spendingRead invents 15.2 days out of a
  // week, so six days of logging were reported as "about a month" and the totals divided accordingly.
  const period = r.enoughForMonthly === false
    ? ('the last ' + Math.max(1, Math.round(r.spanDays)) + ' days')
    : (r.months < 1.4 ? 'about a month' : Math.round(r.months) + ' months');
  let h = '';

  // 1. The shape of it. Honest first — including the uncomfortable direction.
  // /mo ONLY when there is a month behind it — the same rule the lead card applies (16-money.js:167).
  // Below the threshold these are raw totals for the span, and the suffix says so.
  const _thin = r.enoughForMonthly === false;
  const _suffix = _thin ? '' : '/mo';
  const _in  = _thin ? r.income : r.incomePerMonth;
  const _out = _thin ? r.spend  : r.spendPerMonth;
  const _net = _thin ? (r.income - r.spend) : r.netPerMonth;
  const neg = _net < 0;
  h += '<div style="background:var(--bg3);border-radius:var(--rm);padding:14px;margin-bottom:12px">'+
    '<div style="font-size:var(--t-cap);color:var(--tx3);margin-bottom:8px">'+period+' of your money · '+r.count+' transactions</div>'+
    '<div style="display:flex;justify-content:space-between;font-size:var(--t-sm);color:var(--tx2);padding:3px 0"><span>Coming in</span><span style="font-family:var(--font-text);color:var(--gr)">'+money(_in)+_suffix+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;font-size:var(--t-sm);color:var(--tx2);padding:3px 0"><span>Going out</span><span style="font-family:var(--font-text);color:var(--re)">'+money(_out)+_suffix+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;font-size:var(--t-base);color:var(--tx);padding:8px 0 0;margin-top:6px;border-top:1px solid var(--bd)"><span>'+(neg?'Short by':'Left over')+'</span>'+
      '<span style="font-family:var(--font-text);color:'+(neg?'var(--re)':'var(--gr)')+'">'+money(_net)+_suffix+'</span></div>'+
    (r.incomePerMonth <= 0 ? '<div style="font-size:var(--t-cap);color:var(--tx3);margin-top:8px;line-height:1.5">No income rows in this export — if your pay lands in another account, the leftover figure isn’t the full story.</div>' : '')+
  '</div>';

  // 2. Where it goes.
  const top = r.cats.slice(0,5);
  if(top.length){
    h += '<div style="font-size:var(--t-sm);color:var(--tx3);margin-bottom:8px">Where it goes</div><div style="margin-bottom:14px">';
    top.forEach(c => {
      const pct = Math.round(c.share*100);
      h += '<div style="margin-bottom:8px">'+
        '<div style="display:flex;justify-content:space-between;font-size:var(--t-sm);color:var(--tx2);margin-bottom:4px"><span>'+c.name+'</span><span style="font-family:var(--font-text)">'+money(_thin ? c.total : c.perMonth)+_suffix+' \u00b7 '+pct+'%</span></div>'+
        '<div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+Math.max(2,pct)+'%;background:var(--go);border-radius:3px"></div></div>'+
      '</div>';
    });
    h += '</div>';
  }

  // 3. The one place to lock in — and what it's actually worth. This is where the money tab stops
  // reporting and starts counselling, so it has to name a real consequence, not a vibe.
  if(r.lockIn && !_thin){
    const half = r.lockIn.perMonth/2;
    let consequence = 'That’s '+money(half*12)+' a year back in your hands.';
    try{
      loadF();
      const owed = debts.reduce((a,d)=>a+(d.t-d.p),0);
      if(owed > 0){
        const strat = ls('totry_debt_strategy')||'snowball';
        const now = monthlyPaymentRate();
        const base = projectPayoff(debts, now, strat);
        const better = projectPayoff(debts, now+half, strat);
        if(base && better && base.months && better.months && base.months > better.months){
          consequence = 'Put half of that at your debt and you’re free '+(base.months-better.months)+' months sooner.';
        }
      }
    }catch(_){}
    h += '<div style="background:var(--go-bg);border-radius:var(--rm);padding:14px;margin-bottom:12px">'+
      '<div style="font-size:var(--t-cap);color:var(--go);margin-bottom:6px">WHERE TO LOCK IN</div>'+
      '<div style="font-size:var(--t-base);color:var(--tx);line-height:1.6">'+r.lockIn.name+' is '+money(r.lockIn.perMonth)+' a month — your biggest movable cost. '+consequence+'</div>'+
    '</div>';
  }

  // 4. What the bank says about the fight. The thread no money app can pull, because no money app
  // is also holding the vice.
  h += viceLedgerHTML();
  return h;
}

// The balance-sheet enforcer: the ledger checked against what's claimed in the Fight.
function viceLedgerHTML(){
  let out = '';
  try{
    loadV();
    (vices||[]).forEach((v,i) => {
      const kind = _viceKindFor(v); if(!kind) return;
      const bank = viceSpendFromBank(kind);
      if(!bank || !bank.total) return;
      const clean = viceCleanDays(v);
      const since = bank.firstTs ? Math.floor((Date.now()-bank.firstTs)/86400000) : 0;
      // Did it happen inside the streak the app is currently crediting?
      const insideStreak = viceSpendFromBank(kind, Date.now() - clean*86400000);
      const contradicts = viceIsAbstinence(v) && insideStreak && insideStreak.total > 0;
      out += '<div style="background:'+(contradicts?'var(--re-bg)':'var(--bg3)')+';border:1px solid '+(contradicts?'var(--re-bd)':'var(--bd)')+';border-radius:var(--rm);padding:14px;margin-bottom:12px">'+
        '<div style="font-size:var(--t-cap);color:var(--tx3);margin-bottom:6px">'+_escFew(v.n.toUpperCase())+' · WHAT THE BANK SAYS</div>'+
        '<div style="font-family:var(--font-text);font-size:var(--t-title1);color:'+(contradicts?'var(--re)':'var(--tx)')+';line-height:1">'+curSym()+Math.round(bank.total).toLocaleString()+'</div>'+
        '<div style="font-size:var(--t-sm);color:var(--tx2);line-height:1.6;margin-top:8px">'+
          bank.count+' transactions'+(since?' over the last '+since+' days':'')+'. '+
          (contradicts
            ? 'But this card says you’ve been clean '+clean+' days — and '+curSym()+Math.round(insideStreak.total).toLocaleString()+' of that spending falls inside it. One of the two isn’t true. No judgement either way; I’d just rather you had the real number.'
            : 'That’s the real number — not an estimate. It’s what this cost you.')+
        '</div>'+
        (contradicts ? '<button onclick="openLogUse('+i+')" style="width:100%;margin-top:10px;background:none;color:var(--re);border-radius:var(--rs);padding:9px;font-size:var(--t-sm);cursor:pointer;background:var(--fill2)">Set it straight</button>' : '')+
      '</div>';
    });
  }catch(_){}
  // Cash is the hole in all of this, and pretending otherwise would make the app a liar.
  if(out) out += '<div style="font-size:var(--t-cap);color:var(--tx3);line-height:1.5;margin-bottom:12px">A bank export can’t see cash. If something gets paid for in notes, or you owe someone directly, only you can put that in.</div>';
  return out;
}

function openSpendingRead(justImported){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:86vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:var(--font-serif);font-size:var(--t-xl);font-style:italic;color:var(--tx);margin-bottom:4px">'+(justImported?'Here’s how it looks':'Your money, honestly')+'</div>'+
    (justImported?'<div style="font-size:var(--t-sm);color:var(--tx3);margin-bottom:14px">'+justImported+' new transactions read.</div>':'<div style="height:10px"></div>')+
    spendingReadHTML()+
    '<button class="btn" onclick="closeModal(this)">Close</button></div>';
  document.body.appendChild(m);
}
