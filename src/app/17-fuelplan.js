// ════ FUEL PLAN — whole-life meal planning + PT carb-timing ════
// The integration moat in food form: plans real, priced meals around the person's actual
// training, goal and budget. Reuses getLifeState/goals/userSex — never re-asks what we know.
function _fuelCtx(){
  const sex = (typeof userSex==='function' && userSex()) || 'male';
  const goals = ls('totry_nut_goals') || (typeof defaultNutGoals==='function' ? defaultNutGoals() : {cal:2100, pro:170});
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
    sum.innerHTML = '<button class="btn" style="width:100%;margin-bottom:8px;background:var(--bg3);border:1px solid var(--go-bd);color:var(--go);font-size:13px;padding:11px" onclick="_fuelViewPlan()">View my plan →</button>';
    btn.textContent = 'Rebuild my plan';
    btn.style.background='transparent'; btn.style.border='1px solid var(--bd)'; btn.style.color='var(--tx2)';
  } else if(p && p.mealsPerDay){
    const bits = [p.mealsPerDay+' meals/day'];
    if(p.budget) bits.push(curSym()+p.budget+'/wk');
    if(p.chain) bits.push(p.chain);
    sum.innerHTML = '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--tx3);margin-bottom:10px">Set up · '+bits.join(' · ')+'</div>';
    btn.textContent = 'Update my fuel plan';
  } else {
    sum.innerHTML = '';
    btn.textContent = 'Build my fuel plan';
  }
}

function openFuelPlan(){
  if(typeof haptic==='function') haptic('tap');
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
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);margin-bottom:4px">Let’s build your fuel plan</div>'+
    '<div style="font-size:12.5px;color:var(--tx2);line-height:1.6;margin-bottom:16px">Around your real life — not a generic diet. I already know you’re <b style="color:var(--tx)">'+ctx.goalLabel+'</b>'+((typeof nutGentle==='function' && nutGentle()) ? '' : ' at about <b style="color:var(--tx)">'+ctx.cal+' cal</b> and <b style="color:var(--tx)">'+ctx.pro+'g protein</b>')+', so I’ll plan around that. A few quick things:</div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Weekly grocery budget</div>'+
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><span style="font-size:16px;color:var(--tx2)">'+curSym()+'</span><input type="number" id="fuel-budget" inputmode="numeric" placeholder="e.g. 120" value="'+(p.budget||'')+'" style="flex:1"></div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Meals per day</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:16px" id="fuel-meals-row">'+meals+'</div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Anything to work around?</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px" id="fuel-diet-row">'+diets+'</div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Foods you’d rather avoid</div>'+
    '<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-bottom:8px">Not a diet — just things you don’t like. I’ll plan around them.</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px" id="fuel-dislike-row">'+dislikes+'</div>'+
    '<input type="text" id="fuel-diet-free" placeholder="Allergies, foods you hate, anything else..." value="'+String(p.restrictions||'').replace(/"/g,'&quot;')+'" style="width:100%;margin-bottom:16px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px"><div><div style="font-size:13px;color:var(--tx);font-weight:500">Include supplements?</div><div style="font-size:11px;color:var(--tx3);line-height:1.4">Only real, evidence-backed, food-first. Optional.</div></div><button type="button" id="fuel-supp-toggle" data-on="'+(suppOn?'1':'0')+'" class="fuel-chip'+(suppOn?' on':'')+'" onclick="_fuelToggleSupp(this)" style="'+chipStyle+(suppOn?';border-color:var(--go-bd);background:var(--go-bg);color:var(--go)':'')+'">'+(suppOn?'Yes':'No')+'</button></div>'+
    '<button class="btn primary" onclick="_fuelElicitSave()">Next: pick my shop →</button>'+
    '<button class="btn" style="background:none;border:none;color:var(--tx3);font-size:12px;margin-top:6px" onclick="closeModal(this)">Maybe later</button>'+
    '</div>';
  document.body.appendChild(m);
}

function _fuelElicitSave(){
  const budget = parseFloat((document.getElementById('fuel-budget')||{}).value) || 0;
  const mealsEl = document.querySelector('#fuel-meals-row .fuel-chip.on');
  const mealsPerDay = mealsEl ? parseInt(mealsEl.getAttribute('data-n'),10) : 4;
  const diet = Array.prototype.slice.call(document.querySelectorAll('#fuel-diet-row .fuel-chip.on')).map(function(b){ return b.getAttribute('data-diet'); });
  const dislikes = Array.prototype.slice.call(document.querySelectorAll('#fuel-dislike-row .fuel-chip.on')).map(function(b){ return b.getAttribute('data-dislike'); });
  const restrictions = ((document.getElementById('fuel-diet-free')||{}).value || '').trim();
  const suppEl = document.getElementById('fuel-supp-toggle');
  const includeSupps = suppEl ? suppEl.getAttribute('data-on')==='1' : true;
  window._fuelPendingVals = { budget:budget, mealsPerDay:mealsPerDay, diet:diet, dislikes:dislikes, restrictions:restrictions, includeSupps:includeSupps };
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
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);margin-bottom:10px">Let’s keep this about fuelling you</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:16px">A plan should build the person you’re becoming, not shrink you. I’ll keep your calories in a healthy range and never push a crash. If food or your body has felt heavy lately, talking to a real person is strength — not failure.</div>'+
    '<button class="btn primary" onclick="closeModal(this);_fuelFinishSave(window._fuelPendingVals)">Build me a healthy plan</button>'+
    '<button class="btn" style="background:none;border:1px solid var(--bd);color:var(--tx2);margin-top:8px" onclick="closeModal(this);if(typeof bridgeToRealHelp===\'function\')bridgeToRealHelp(\'heavy\')">Point me to real help</button>'+
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
    b.style.cssText = 'padding:7px 12px;border-radius:100px;border:1px solid var(--go-bd);background:var(--go-bg);color:var(--go);font-size:12px;cursor:pointer';
    b.textContent = name; row.appendChild(b);
  }
  if(inp) inp.value='';
}

function _fuelShopPicker(){
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
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);margin-bottom:4px">Where do you shop?</div>'+
    '<div style="font-size:12.5px;color:var(--tx2);line-height:1.6;margin-bottom:16px">Pick every shop you use — I’ll build one shopping list, split by store so you know exactly what to get where.</div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Country</div>'+
    '<input type="text" id="fuel-country" value="'+String(country).replace(/"/g,'&quot;')+'" style="width:100%;margin-bottom:16px">'+
    '<div class="eyebrow" style="margin-bottom:6px">Your shops (pick any)</div>'+
    '<div id="fuel-shops-row" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+chips+'</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:18px"><input type="text" id="fuel-shop-add" placeholder="Add another shop (any country)..." style="flex:1"><button class="btn" style="width:auto;padding:0 16px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)" onclick="_fuelAddShop()">Add</button></div>'+
    '<button class="btn primary" onclick="_fuelShopGenerate()">Build my plan →</button>'+
    '<button class="btn" style="background:none;border:none;color:var(--tx3);font-size:12px;margin-top:6px" onclick="closeModal(this)">Later</button>'+
    '</div>';
  document.body.appendChild(m);
}

function _fuelShopGenerate(){
  const country = ((document.getElementById('fuel-country')||{}).value || 'Australia').trim();
  const shops = Array.prototype.slice.call(document.querySelectorAll('#fuel-shops-row .fuel-shop-chip.on')).map(function(b){ return b.getAttribute('data-shop'); }).filter(Boolean);
  if(!shops.length){ if(typeof showToast==='function') showToast('One thing', 'Pick at least one shop so the list and prices are real.'); return; }
  saveMealPrefs(Object.assign(getMealPrefs(), { country:country, chains:shops, chain:shops.join(', ') }));
  const m = document.getElementById('fuel-shop-modal'); if(m) m.remove();
  renderFuelPlanCard();
  _fuelGenerate();
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
  load.innerHTML = '<div class="modal" style="text-align:center"><div style="font-size:26px;margin-bottom:10px">🍽️</div><div style="font-family:Cormorant Garamond,serif;font-size:20px;color:var(--tx);margin-bottom:6px">Building your plan…</div><div style="font-size:12px;color:var(--tx3);line-height:1.6">Fitting your targets, budget and training, and building your shopping list.</div></div>';
  document.body.appendChild(load);
  let brief=''; try{ if(typeof getLifeState==='function') brief = getLifeState().brief || ''; }catch(_){ brief=''; }
  const sys = "You are a registered-dietitian-level meal planner in a faith-rooted whole-life app. You are honest, evidence-based and non-partial: food-first, never push brands or supplements, cite where prices came from, and separate general guidance from individual advice. Build realistic, affordable plans from REAL products at the named supermarket, using web search for CURRENT prices. Return ONLY valid JSON, no prose.";
  const dietStr = _fuelDietStr(p);
  const shops = _fuelShopChains(p); const shopsStr = shops.join(', ') || (p.chain || 'your supermarket');
  const timingStr = preworkout.length ? ('Their gym sessions and pre-gym meal deadlines: '+preworkout.map(function(x){return x.day+' gym '+x.sessionStart+' (finish the pre-gym meal by '+x.eatBy+')';}).join('; ')+'.') : '';
  const prompt = "Build a realistic "+(p.mealsPerDay||4)+"-meal day for one person, plus a weekly shopping list, in "+(p.country||'Australia')+". Context: "+brief+". Daily targets: the meals MUST total close to "+cal+" kcal (within ~5%) and reach about "+ctx.pro+"g protein (goal: "+ctx.goalDir+") — adjust portion sizes to hit these numbers. Weekly grocery budget ~"+curSym()+(p.budget||0)+". STRICTLY respect these dietary requirements and NEVER include any forbidden food (e.g. if vegan, no animal products; if 'no beef', no beef anywhere): "+dietStr+(p.restrictions?('; '+p.restrictions):'')+". "+((p.includeSupps!==false)?"May include 1-2 evidence-backed supermarket supplements (creatine, whey, electrolytes), optional and food-first.":"No supplements.")+" Give FULL macros per meal: cal, protein, carbs, fat. The DAY must also cover MICRONUTRIENTS — enough fibre, iron, calcium, healthy fats/omega-3, potassium, and a real range of vegetables and fruit; summarise this in 'microNote' with rough fibre grams. "+(preworkout.length?("Time carbohydrate around training. "+timingStr+" In 'carbNote', say what to eat before training referencing those times."):"In 'carbNote', explain carb timing generally and note that adding their training schedule unlocks exact meal times.")+" If their context shows an eating-related struggle or a hard time of day (late-night snacking, stress/boredom eating, alcohol, a risk window), address it directly in the plan — e.g. build in a genuinely satisfying planned snack for that window so they are not reaching for the vice on an empty stomach — and name it warmly in that meal's 'why' or in carbNote (like a big brother who knows their fight). The person shops at these stores: "+shopsStr+". For EVERY shopping item, set 'shop' to exactly ONE of those store names — choose the store that is cheapest or most likely to stock it, so the list is organised store-by-store for one trip each. Use typical current prices at that store (estimates, to confirm in-store). Keep 'items' and 'why' SHORT. Return ONLY compact JSON, no prose: {\"meals\":[{\"name\":\"\",\"items\":\"\",\"cal\":0,\"pro\":0,\"carbs\":0,\"fat\":0,\"why\":\"\"}],\"microNote\":\"\",\"carbNote\":\"\",\"shopping\":[{\"item\":\"\",\"price\":0,\"shop\":\"\"}],\"total\":0,\"note\":\"\"}. Each \"why\" ties the meal to their goal. \"note\" says prices are estimates and the science is general.";
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
  const mealsHtml = (plan.meals||[]).map(function(mm, i){
    return '<div style="padding:10px 0;border-top:1px solid var(--bd)">'+
      '<div style="display:flex;justify-content:space-between;gap:8px"><div style="font-size:13px;font-weight:600;color:var(--tx)">'+_esc(mm.name||'Meal')+'</div><div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--tx3);white-space:nowrap">'+R(mm.cal||0)+' cal · '+R(mm.pro||0)+'p · '+R(mm.carbs||0)+'c · '+R(mm.fat||0)+'f</div></div>'+
      '<div style="font-size:12px;color:var(--tx2);line-height:1.5;margin-top:3px">'+_esc(mm.items||'')+'</div>'+
      (mm.why?'<div style="font-size:11.5px;color:var(--go);line-height:1.5;margin-top:5px;font-style:italic">'+_esc(mm.why)+'</div>':'')+
      '<button onclick="_fuelSwapMeal('+i+')" style="margin-top:6px;background:none;border:none;color:var(--tx3);font-size:11px;cursor:pointer;font-family:\'DM Mono\',monospace;letter-spacing:0.03em">↻ swap this meal</button>'+
    '</div>';
  }).join('');
  // Number() so an already-stored string cannot turn addition into concatenation.
  const sum = function(k){ return (plan.meals||[]).reduce(function(a,mm){ const n=parseFloat(mm&&mm[k]); return a+(isFinite(n)?n:0); },0); };
  const dayCal=sum('cal'), dayPro=sum('pro'), dayCarbs=sum('carbs'), dayFat=sum('fat');
  const macroRow = '<div style="display:flex;justify-content:space-between;margin-top:12px;padding:9px 12px;background:var(--bg3);border-radius:8px;font-family:\'DM Mono\',monospace;font-size:10.5px;color:var(--tx2)"><span>'+R(dayCal)+' cal</span><span style="color:var(--gr)">'+R(dayPro)+'g P</span><span style="color:var(--bl)">'+R(dayCarbs)+'g C</span><span style="color:var(--go)">'+R(dayFat)+'g F</span></div>';
  const tgtCal = (plan.targets&&plan.targets.cal)||0, tgtPro = (plan.targets&&plan.targets.pro)||0;
  const calGap = tgtCal ? (dayCal - tgtCal) : 0; const onTarget = tgtCal && Math.abs(calGap) <= tgtCal*0.08;
  const targetHtml = tgtCal ? ('<div style="font-size:11.5px;line-height:1.5;margin-top:6px;color:'+(onTarget?'var(--gr)':'var(--go)')+'">'+(onTarget ? ('On target — ~'+R(dayCal)+' of your '+tgtCal+' cal, '+R(dayPro)+' of '+tgtPro+'g protein.') : (calGap<0 ? ('About '+R(-calGap)+' cal under your '+tgtCal+' target — bump portions, or <span onclick="_fuelAddSnack()" style="color:var(--go);border-bottom:1px solid var(--go-bd);cursor:pointer">add a snack to hit it →</span>') : ('About '+R(calGap)+' cal over your '+tgtCal+' target — trim portions slightly.')))+'</div>') : '';
  const _td = _fuelToday();
  const todayHtml = tgtCal ? ('<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:10px 12px;background:var(--bg3);border-radius:8px;gap:8px"><div style="font-size:11.5px;color:var(--tx2);line-height:1.4">Logged today <span style="font-family:\'DM Mono\',monospace;color:var(--tx)">'+R(_td.cal)+'</span> / '+tgtCal+' cal<br><span style="color:var(--tx3);font-size:10.5px">counts to your target, not the plan</span></div><button onclick="_fuelFlexToday()" style="flex-shrink:0;background:none;border:1px solid var(--go-bd);color:var(--go);border-radius:100px;padding:7px 13px;font-size:11.5px;cursor:pointer;white-space:nowrap">Eating out?</button></div>') : '';
  const microHtml = plan.microNote ? '<div style="font-size:11.5px;color:var(--tx2);line-height:1.6;margin-top:10px"><span style="color:var(--gr);font-weight:600">Micronutrients · </span>'+_esc(plan.microNote)+'</div>' : '';
  let timingHtml='';
  if(plan.preworkout && plan.preworkout.length){
    const rows = plan.preworkout.map(function(x){ return '<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:4px 0"><div style="color:var(--tx2)">'+_esc(x.day)+' · gym '+_esc(x.sessionStart)+'</div><div style="color:var(--go);font-family:\'DM Mono\',monospace">eat by '+_esc(x.eatBy)+'</div></div>'; }).join('');
    timingHtml='<div style="background:var(--bg3);border:1px solid var(--go-bd);border-radius:10px;padding:12px;margin-top:14px">'+
      '<div class="eyebrow" style="color:var(--go);margin-bottom:6px">Fuel around your training</div>'+rows+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--bd);gap:10px"><div style="font-size:11px;color:var(--tx3);line-height:1.4">Pre-workout meal: '+(plan.lead||getPreworkoutLead())+' min before<br>find your number — adjust by feel</div><div style="display:flex;gap:6px"><button onclick="_fuelSetLead(-15)" style="width:30px;height:30px;border-radius:8px;border:1px solid var(--bd);background:var(--bg2);color:var(--tx2);font-size:16px;cursor:pointer">−</button><button onclick="_fuelSetLead(15)" style="width:30px;height:30px;border-radius:8px;border:1px solid var(--bd);background:var(--bg2);color:var(--tx2);font-size:16px;cursor:pointer">+</button></div></div>'+
      (plan.carbNote?'<div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-top:8px">'+_esc(plan.carbNote)+'</div>':'')+
    '</div>';
  } else {
    timingHtml='<div style="background:var(--bg3);border:1px solid var(--go-bd);border-radius:10px;padding:12px;margin-top:14px">'+
      '<div class="eyebrow" style="color:var(--go);margin-bottom:6px">Fuel around your training</div>'+
      '<div style="font-size:12.5px;color:var(--tx2);line-height:1.6;margin-bottom:10px">Add your training times and I’ll tell you exactly when to eat before each session — real times, not generic advice.</div>'+
      '<button class="btn" style="width:100%;background:var(--bg2);border:1px solid var(--go-bd);color:var(--go);font-size:12.5px;padding:10px" onclick="closeModal(this);if(typeof go===\'function\')go(\'calendar\')">Add my schedule →</button>'+
    '</div>';
  }
  // Interactive shopping checklist — tap an item off as you shop (persists), per-store progress.
  const row1 = function(s){ const got=!!s.got; return '<div onclick="_fuelToggleShopItem(this,'+s._i+')" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;font-size:12.5px;cursor:pointer"><div style="display:flex;align-items:center;gap:9px;flex:1;min-width:0"><span class="fuel-tick" style="width:16px;height:16px;border-radius:4px;border:1px solid '+(got?'var(--go)':'var(--bd2)')+';background:'+(got?'var(--go)':'transparent')+';display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:#231803;flex-shrink:0">'+(got?'✓':'')+'</span><span class="fuel-item" style="color:var(--tx2)'+(got?';text-decoration:line-through;opacity:0.45':'')+'">'+_esc(s.item||'')+'</span></div><span class="fuel-price" style="font-family:\'DM Mono\',monospace;color:var(--tx);white-space:nowrap'+(got?';opacity:0.45':'')+'">'+money(s.price)+'</span></div>'; };
  const shopHtml = (function(){
    const items = (plan.shopping||[]).map(function(s,idx){ s._i=idx; return s; });
    if(!items.length) return '';
    const groups = {}, order = [];
    items.forEach(function(s){ const k=((s.shop||'').trim())||'Shopping'; if(!groups[k]){ groups[k]=[]; order.push(k); } groups[k].push(s); });
    if(order.length <= 1) return items.map(row1).join(''); // single store — flat list
    return order.map(function(k){
      const list=groups[k]; const sub=list.reduce(function(a,s){ return a+(s.price||0); },0); const gotN=list.filter(function(s){ return s.got; }).length;
      return '<div style="margin-top:10px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px"><div style="font-size:13px;font-weight:600;color:var(--go)">'+_esc(k)+' <span style="font-size:10.5px;color:var(--tx3);font-weight:400">'+gotN+'/'+list.length+'</span></div><div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--tx3)">'+money(sub)+'</div></div>'+list.map(row1).join('')+'</div>';
    }).join('');
  })();
  const total = plan.total||0; const budget = plan.budget||p.budget||0;
  const overBudget = budget>0 && total>budget;
  const m = document.createElement('div'); m.className='modal-bg open'; m.id='fuel-plan-modal'; m.style.alignItems='flex-end';
  m.innerHTML = '<div class="modal" style="text-align:left;max-height:90vh;overflow-y:auto">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx)">Your fuel plan</div><button onclick="closeModal(this)" style="background:none;border:none;color:var(--tx3);font-size:20px;cursor:pointer">×</button></div>'+
    '<div style="font-size:12px;color:var(--tx3);margin-bottom:14px">A day around '+R(dayCal)+' cal · '+_esc(p.chain||'')+'</div>'+
    '<div class="eyebrow" style="color:var(--go);margin-bottom:2px">A day of meals</div>'+
    mealsHtml+ macroRow+ targetHtml+ todayHtml+ microHtml+ timingHtml+
    '<div class="eyebrow" style="margin:16px 0 4px">Weekly shopping list</div>'+shopHtml+
    '<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--bd);font-size:13px"><div style="color:var(--tx);font-weight:600">Weekly total</div><div style="font-family:\'DM Mono\',monospace;color:'+(overBudget?'var(--re)':'var(--gr)')+'">'+money(total)+(budget?(' / '+curSym()+budget):'')+'</div></div>'+
    '<button onclick="_fuelCopyShopList()" style="width:100%;margin-top:8px;background:none;border:1px solid var(--bd);color:var(--tx3);border-radius:8px;padding:8px;font-size:11.5px;cursor:pointer">Copy shopping list</button>'+
    (overBudget?'<div style="font-size:11.5px;color:var(--re);margin-top:6px;line-height:1.5">A bit over budget — tap Regenerate for a leaner version, or nudge your budget up.</div>':'')+
    (plan._estimated?'<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-top:10px">Prices are estimates — tap “Get live prices”, or confirm in-store.</div>':'')+
    ((plan.citations&&plan.citations.length)?'<div style="font-size:10px;color:var(--tx3);line-height:1.6;margin-top:8px">Prices checked: '+plan.citations.map(_esc).join(' · ')+'</div>':'')+
    (plan.note?'<div style="font-size:11px;color:var(--tx3);line-height:1.6;margin-top:12px;font-style:italic">'+_esc(plan.note)+'</div>':'')+
    '<button class="btn primary" style="margin-top:16px" onclick="_fuelLogPlan(this)">Log today’s meals</button>'+
    (plan._estimated?'<button class="btn" style="margin-top:8px;background:var(--bg3);border:1px solid var(--go-bd);color:var(--go)" onclick="_fuelLivePrices()">Get live prices →</button>':'')+
    '<button class="btn" style="margin-top:8px;background:none;border:1px solid var(--bd);color:var(--tx2)" onclick="closeModal(this);_fuelGenerate()">↻ Regenerate</button>'+
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
  if(typeof showToast==='function') showToast('Adding a snack…', 'Filling the ~'+gapC+' cal gap.');
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
    carb: Math.round(num(meal.carbs != null ? meal.carbs : meal.carb, 500)),   // the model returns "carbs"
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
function _fuelToday(){ try{ const today=new Date().toLocaleDateString('en-AU'); const arr=(ls('totry_nutlog')||{})[today]||[]; return { cal: arr.reduce(function(a,e){return a+(e.cal||0);},0), pro: arr.reduce(function(a,e){return a+(e.pro||0);},0) }; }catch(_){ return {cal:0,pro:0}; } }

// Grace when real life happens (a buffet, a night out, anything off-plan). The plan is a guide,
// not a cage — let it slide, anchor to the day's TARGET, and log whatever they actually ate.
function _fuelFlexToday(){
  const plan = ls('totry_meal_plan')||{};
  const tgt = (plan.targets&&plan.targets.cal)||0;
  const td = _fuelToday();
  const left = tgt ? Math.max(0, Math.round(tgt - td.cal)) : 0;
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:left">'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);margin-bottom:10px">Going out? Enjoy it.</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:16px">A meal out, a buffet, a night with people — that’s a life, not a failure. One meal won’t undo your week; what you do <i>most</i> days is what shapes you. The plan is a guide, not a cage.'+(tgt?(' You’ve still got about <b style="color:var(--tx)">'+left+' cal</b> to your target today if you want a rough anchor — or just be present and pick it up tomorrow.'):'')+'</div>'+
    '<button class="btn primary" onclick="closeModal(this);if(typeof go===\'function\')go(\'nourish\');setTimeout(function(){var i=document.getElementById(\'nut-search-in\');if(i)i.focus();},350)">Log what I ate</button>'+
    '<button class="btn" style="margin-top:8px;background:none;border:1px solid var(--bd);color:var(--tx2)" onclick="closeModal(this);if(typeof haptic===\'function\')haptic(\'tap\');if(typeof showToast===\'function\')showToast(\'Enjoy it\',\'You’re living, not failing. Back on track tomorrow.\')">Just enjoy it — back tomorrow</button>'+
    '</div>';
  document.body.appendChild(m);
}

// Interactive shopping checklist — tick items off as you shop (persists per item).
function _fuelToggleShopItem(el, idx){
  const plan = ls('totry_meal_plan'); if(!plan || !plan.shopping || !plan.shopping[idx]) return;
  plan.shopping[idx].got = !plan.shopping[idx].got; // Re-read after the await: a second edit started while this one was in flight holds its own
  // stale copy of the whole plan, and whichever returns last silently reverts the other.
  const _fresh = ls('totry_meal_plan') || plan;
  if(_fresh && _fresh.meals && plan && plan.meals) _fresh.meals = plan.meals.slice();
  ls('totry_meal_plan', _fresh || plan);
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
  let txt='My To Try shopping list\n';
  order.forEach(function(k){ txt+='\n'+k+':\n'; groups[k].forEach(function(s){ txt+='  - '+(s.item||'')+(s.price?(' ('+curSym()+s.price+')'):'')+'\n'; }); });
  txt+='\nTotal: '+curSym()+(plan.total||0);
  try{ if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(function(){ if(typeof showToast==='function') showToast('Copied','Shopping list copied — paste it anywhere.'); }, function(){ if(typeof showToast==='function') showToast('List ready', txt.slice(0,80)); }); return; } }catch(_){}
  if(typeof showToast==='function') showToast('List', txt.slice(0,80));
}

// Push the plan's meals into today's food log — closes the loop with the tracker.
function _fuelLogPlan(btn){
  const plan = ls('totry_meal_plan'); if(!plan || !plan.meals || !plan.meals.length) return;
  const today = new Date().toLocaleDateString('en-AU');
  const log = ls('totry_nutlog') || {}; if(!log[today]) log[today]=[];
  plan.meals.forEach(function(mm, i){
    log[today].push({ id: Date.now()+i, name: mm.name||'Meal', serving: String(mm.items||'').slice(0,120)||'1 serving', qty:1,
      cal: Math.round(mm.cal||0), pro: Math.round((mm.pro||0)*10)/10, carb: Math.round((mm.carbs||0)*10)/10, fat: Math.round((mm.fat||0)*10)/10, source: 'Fuel plan' });
  });
  if(typeof _pruneNutLog==='function') _pruneNutLog(log);
  ls('totry_nutlog', log); if(typeof syncToCloud==='function') syncToCloud();
  if(typeof renderNutritionLog==='function') renderNutritionLog();
  if(typeof autoTickHabits==='function') autoTickHabits();
  if(typeof haptic==='function') haptic('success');
  if(btn && typeof closeModal==='function') closeModal(btn);
  if(typeof showToast==='function') showToast('Logged', plan.meals.length+' meals added to today.');
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
  plan.total = (typeof data.total==='number' && data.total>0) ? data.total : plan.shopping.reduce(function(a,s){ return a+(s.price||0); },0);
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
    summary.innerHTML = '<span style="color:var(--tx2)">\ud83d\uddd3\ufe0f Add your week \u2014 paste a roster or type your schedule, and it shows up across the app.</span>';
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
      return '<span style="color:'+col+'">\u25cf</span> '+e.start+' '+e.title;
    }).join('<br>');
    const more = todayEvents.length > 3 ? '<br><span style="color:var(--tx3);font-size:11px">+ '+(todayEvents.length-3)+' more</span>' : '';
    summary.innerHTML = items + more;
  }
  card.style.display = 'block';
}

function renderCalendar(){
  // Dispatch to the active view (day / week / month). Week is the default.
  const view = ls('totry_cal_view') || 'week';
  const wk=document.getElementById('cal-week-view'), dy=document.getElementById('cal-day-view'), mo=document.getElementById('cal-month-view');
  if(wk) wk.style.display = view==='week'?'block':'none';
  if(dy) dy.style.display = view==='day'?'block':'none';
  if(mo) mo.style.display = view==='month'?'block':'none';
  if(view==='day') return renderCalendarDay();
  if(view==='month') return renderCalendarMonth();
  return renderCalendarWeek();
}
function setCalView(v){
  ls('totry_cal_view', v);
  ['day','week','month'].forEach(x=>{
    const b=document.getElementById('calview-'+x);
    if(b){ const on = x===v; b.style.background = on?'var(--bg)':'transparent'; b.style.border = on?'1px solid var(--bd)':'none'; b.style.color = on?'var(--tx)':'var(--tx3)'; }
  });
  haptic('tap');
  renderCalendar();
}
// DAY VIEW — today's events as a simple ordered timeline.
function renderCalendarDay(){
  const wrap = document.getElementById('cal-day-view');
  if(!wrap) return;
  const events = _calEvents();
  const todayDow = (new Date().getDay()+6)%7;
  const dayName = CAL_DAYS[todayDow];
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-AU', {weekday:'long', day:'numeric', month:'long'});
  const dayEvents = events.filter(e => e.day === todayDow).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  let html = '<div style="font-family:DM Mono,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:var(--go);margin-bottom:10px">'+dateLabel+'</div>';
  if(!dayEvents.length){
    html += '<div style="text-align:center;padding:24px 12px;color:var(--tx3);font-size:13px;line-height:1.5">Nothing scheduled today.<br>Tap "+ Add one" to block something in.</div>';
  } else {
    const nowMin = today.getHours()*60 + today.getMinutes();
    dayEvents.forEach(e => {
      const col = CAL_TYPE_COLORS[e.type] || CAL_TYPE_COLORS.other;
      const time = e.start + (e.end ? '\u2013'+e.end : '');
      const [sh,sm]=(e.start||'0:0').split(':').map(Number);
      const isPast = e.end ? false : (sh*60+(sm||0) < nowMin - 60);
      html += '<div onclick="deleteCalEvent('+e.id+')" style="display:flex;align-items:center;gap:12px;padding:12px 13px;margin-bottom:7px;background:var(--bg3);border-radius:9px;border-left:3px solid '+col+';cursor:pointer;opacity:'+(isPast?'0.5':'1')+'">'+
        '<div style="font-family:DM Mono,monospace;font-size:12px;color:'+col+';flex-shrink:0;min-width:46px">'+(e.start||'')+'</div>'+
        '<div style="flex:1;min-width:0"><div style="font-size:14px;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e.title+'</div>'+
        '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);margin-top:1px">'+time+(e.recurring?' \u00b7 weekly':'')+'</div></div>'+
        '<span style="color:var(--tx3);font-size:12px;flex-shrink:0">\u00d7</span></div>';
    });
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
    wrap.innerHTML = '<div style="text-align:center;padding:24px 12px;color:var(--tx3)"><div style="font-size:32px;margin-bottom:8px">\ud83d\uddd3\ufe0f</div><div style="font-size:13px;line-height:1.5">Nothing scheduled yet.<br>Paste a roster above, or tap "+ Add one".</div></div>';
    const ic = document.getElementById('cal-insight-card'); if(ic) ic.style.display='none';
    return;
  }
  let html = '';
  CAL_DAYS.forEach((dayName, dow) => {
    const dayEvents = events.filter(e => e.day === dow).sort((a,b) => (a.start||'').localeCompare(b.start||''));
    const isToday = dow === todayDow;
    html += '<div style="margin-bottom:12px">'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:'+(isToday?'var(--go)':'var(--tx3)')+';margin-bottom:6px">'+dayName+(isToday?' \u00b7 today':'')+'</div>';
    if(!dayEvents.length){
      html += '<div style="font-size:12px;color:var(--tx3);font-style:italic;padding-left:2px">\u2014</div>';
    } else {
      dayEvents.forEach(e => {
        const col = CAL_TYPE_COLORS[e.type] || CAL_TYPE_COLORS.other;
        const time = e.start + (e.end ? '\u2013'+e.end : '');
        html += '<div onclick="deleteCalEvent('+e.id+')" style="display:flex;align-items:center;gap:10px;padding:9px 11px;margin-bottom:5px;background:var(--bg3);border-radius:8px;border-left:3px solid '+col+';cursor:pointer">'+
          '<div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e.title+'</div>'+
          '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);margin-top:1px">'+time+(e.recurring?' \u00b7 weekly':'')+'</div></div>'+
          '<span style="color:var(--tx3);font-size:11px;flex-shrink:0">\u00d7</span></div>';
      });
    }
    html += '</div>';
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
  let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'+
    '<button class="btn" onclick="calMonthShift(-1)" style="width:auto;padding:4px 10px;font-size:14px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)">\u2039</button>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:18px;color:var(--tx)">'+monthLabel+'</div>'+
    '<button class="btn" onclick="calMonthShift(1)" style="width:auto;padding:4px 10px;font-size:14px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)">\u203a</button></div>';
  html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:4px">';
  ['M','T','W','T','F','S','S'].forEach(d => html += '<div style="text-align:center;font-family:DM Mono,monospace;font-size:9px;color:var(--tx3)">'+d+'</div>');
  html += '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">';
  for(let i=0;i<startDow;i++) html += '<div></div>';
  for(let d=1; d<=daysInMonth; d++){
    const cellDate = new Date(year, month, d);
    const dow = (cellDate.getDay()+6)%7;
    const dayEvents = events.filter(e => e.day === dow);
    const isToday = cellDate.toDateString() === todayStr;
    const dots = dayEvents.slice(0,4).map(e => '<span style="width:5px;height:5px;border-radius:50%;background:'+(CAL_TYPE_COLORS[e.type]||CAL_TYPE_COLORS.other)+'"></span>').join('');
    html += '<div onclick="calJumpToDay('+dow+')" style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:5px;gap:3px;border-radius:7px;cursor:pointer;background:'+(isToday?'rgba(200,169,110,0.16)':'var(--bg3)')+';border:1px solid '+(isToday?'var(--go-bd)':'transparent')+'">'+
      '<div style="font-size:12px;color:'+(isToday?'var(--go)':'var(--tx2)')+'">'+d+'</div>'+
      '<div style="display:flex;gap:2px;flex-wrap:wrap;justify-content:center;max-width:80%">'+dots+'</div></div>';
  }
  html += '</div>';
  wrap.innerHTML = html;
  renderCalInsight(events);
}
function calMonthShift(delta){
  const ref = window.__calMonthRef ? new Date(window.__calMonthRef) : new Date();
  ref.setMonth(ref.getMonth()+delta);
  window.__calMonthRef = ref.toISOString();
  renderCalendarMonth();
}
function calJumpToDay(dow){
  // Tapping a month-grid day jumps to the day view (shows that weekday's recurring events).
  setCalView('day');
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
    if(mins <= 0) return;
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
  // Time options every 15 min, 05:00–23:45, in 12h-ish labels but 24h values.
  let timeOpts='<option value="">—</option>';
  for(let h=5; h<=23; h++){ for(let mn=0; mn<60; mn+=15){ const v=String(h).padStart(2,'0')+':'+String(mn).padStart(2,'0'); const ampm=h<12?'am':'pm'; const h12=h%12===0?12:h%12; timeOpts+='<option value="'+v+'">'+h12+':'+String(mn).padStart(2,'0')+' '+ampm+'</option>'; } }
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  m.innerHTML='<div class="modal" style="max-height:90vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;font-style:italic;color:var(--tx);margin-bottom:4px">Add to your week</div>'+
    '<div style="font-size:12px;color:var(--tx3);margin-bottom:18px">Pick the day(s), set a time, done.</div>'+
    '<div class="lbl">What is it?</div>'+
    '<input type="text" id="ev-title" placeholder="e.g. Work shift, Lecture, Gym, Mass" style="margin-bottom:14px">'+
    '<div class="lbl">Which day(s)?</div>'+
    '<div id="ev-days" style="display:flex;gap:5px;margin-bottom:14px;flex-wrap:wrap">'+
      days.map((d,i)=>'<button type="button" class="ev-day-btn" data-day="'+i+'" onclick="_evToggleDay('+i+')" style="flex:1;min-width:38px;padding:10px 4px;border-radius:9px;border:1px solid var(--bd);background:var(--bg3);color:var(--tx2);font-size:12px;font-family:Outfit,sans-serif">'+d+'</button>').join('')+
    '</div>'+
    '<div style="display:flex;gap:10px;margin-bottom:14px">'+
      '<div style="flex:1"><div class="lbl">Start</div><select id="ev-start">'+timeOpts+'</select></div>'+
      '<div style="flex:1"><div class="lbl">End <span style="opacity:0.6">(optional)</span></div><select id="ev-end">'+timeOpts+'</select></div>'+
    '</div>'+
    '<div class="lbl">Type</div>'+
    '<div id="ev-types" style="display:flex;gap:5px;margin-bottom:16px;flex-wrap:wrap">'+
      [['work','Work'],['class','Class'],['gym','Gym'],['personal','Personal'],['other','Other']].map(t=>'<button type="button" class="ev-type-btn" data-type="'+t[0]+'" onclick="_evSetType(\''+t[0]+'\')" style="flex:1;min-width:56px;padding:9px 4px;border-radius:9px;border:1px solid var(--bd);background:var(--bg3);color:var(--tx2);font-size:12px;font-family:Outfit,sans-serif">'+t[1]+'</button>').join('')+
    '</div>'+
    '<label style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg3);border-radius:10px;margin-bottom:18px;cursor:pointer"><span style="font-size:14px;color:var(--tx)">Repeats every week</span><input type="checkbox" id="ev-recurring" checked style="width:auto;transform:scale(1.3)"></label>'+
    '<button class="btn primary" style="padding:14px;margin-bottom:8px" onclick="_saveEventFromModal()">Add to week</button>'+
    '<button class="btn" onclick="document.getElementById(\'event-modal\')?.remove()" style="background:none;border:none;color:var(--tx3);font-size:13px">Cancel</button>'+
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
function _saveEventFromModal(){
  const title=(document.getElementById('ev-title')?.value||'').trim();
  const start=document.getElementById('ev-start')?.value||'';
  const end=document.getElementById('ev-end')?.value||'';
  const recurring=!!document.getElementById('ev-recurring')?.checked;
  const days=Array.from(window.__evDays||[]);
  if(!title){ showToast('Add a name','What is the event?'); return; }
  if(!days.length){ showToast('Pick a day','Tap at least one day.'); return; }
  if(!start){ showToast('Set a start time','When does it start?'); return; }
  const list=(ls('totry_cal_events')||[]);
  const wk=_currentWeekStamp();
  days.forEach(d=>{ list.push({ id: Date.now()+d+Math.floor(Math.random()*1000), title:title.slice(0,50), type:window.__evType||'other', day:d, start, end:end||null, recurring, weekStamp: recurring?null:wk }); });
  _saveCalEvents(list);
  document.getElementById('event-modal')?.remove();
  renderCalendar();
  if(typeof haptic==='function') haptic('success');
  showToast('Added', title+(days.length>1?(' on '+days.length+' days'):'')+'.');
}
function deleteCalEvent(id){
  if(!confirm('Remove this from your week?')) return;
  _saveCalEvents((ls('totry_cal_events')||[]).filter(e => e.id !== id));
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
    ['Income', ['salary','payroll','wage','deposit','transfer in','refund','centrelink']],
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
  const find = (cands) => { for(const c of cands){ const i = h.findIndex(x => x.includes(c)); if(i>=0) return i; } return -1; };
  return {
    date: find(['date','posted','transaction date']),
    desc: find(['description','details','narrative','memo','payee','transaction']),
    amount: find(['amount','value','debit']),
    credit: find(['credit']),
    debit: find(['debit']),
  };
}
function openCSVImport(){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;color:var(--tx);margin-bottom:6px">Import transactions</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:14px">Export a CSV from your banking app (most banks let you do this), then upload it here. To Try reads the date, description, and amount, auto-sorts each into a category, and lets you review before saving. The file itself is never uploaded \u2014 it\u2019s read on your phone. What you choose to save is stored with the rest of your data, and syncs to your account if you\u2019re signed in.</div>'+
    '<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-bottom:16px;padding:10px 12px;background:var(--bg3);border-radius:8px">Works with standard bank exports (columns like Date, Description, Amount). Negative amounts = spending, positive = income.</div>'+
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
        let amt = 0;
        if(cols.amount>=0 && f[cols.amount]) amt = _csvAmount(f[cols.amount]);
        else if(cols.debit>=0 && f[cols.debit]) amt = -Math.abs(_csvAmount(f[cols.debit]));
        if(cols.credit>=0 && f[cols.credit]){ const c = _csvAmount(f[cols.credit]); if(c) amt = Math.abs(c); }
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
      type: amt < 0 ? 'expense' : (/\btransfer|from savings|internal|own account|repayment received\b/i.test(String(desc||'')) ? 'transfer' : 'income'),
          category: amt < 0 ? _autoCategory(desc) : 'Income',
          ts: validWhen.toISOString(),
          date: validWhen.toLocaleDateString('en-AU'),
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
  const preview = parsed.slice(0,8).map(p =>
    '<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--bd);font-size:12px">'+
    '<span style="color:var(--tx2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">'+p.desc+' <span style="color:var(--tx3)">\u00b7 '+p.category+'</span></span>'+
    '<span style="color:'+(p.type==='expense'?'var(--re)':'var(--gr)')+';flex-shrink:0">'+(p.type==='expense'?'\u2212':'+')+curSym()+p.amount.toFixed(2)+'</span></div>'
  ).join('');
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;color:var(--tx);margin-bottom:6px">Review import</div>'+
    '<div style="font-size:13px;color:var(--tx2);margin-bottom:12px"><b>'+parsed.length+'</b> new: '+expenses.length+' expenses (\u2212'+curSym()+totalExp.toFixed(2)+'), '+income.length+' income (+'+curSym()+totalInc.toFixed(2)+').'+
      (dupes.length ? ' <span style="color:var(--tx3)">'+dupes.length+' already imported \u2014 skipped, not double-counted.</span>' : '')+'</div>'+
    '<div style="margin-bottom:14px">'+preview+(parsed.length>8?'<div style="font-size:11px;color:var(--tx3);text-align:center;padding-top:8px">+ '+(parsed.length-8)+' more</div>':'')+'</div>'+
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
  if(!r) return '<div style="font-size:13px;color:var(--tx2);line-height:1.6">Not enough yet to see a pattern. Import a statement and I’ll show you where it’s going.</div>';
  const money = n => curSym()+Math.abs(Math.round(n)).toLocaleString();
  // Say the span they ACTUALLY have. Math.max(0.5, …) inside spendingRead invents 15.2 days out of a
  // week, so six days of logging were reported as "about a month" and the totals divided accordingly.
  const period = r.enoughForMonthly === false
    ? ('the last ' + Math.max(1, Math.round(r.spanDays)) + ' days')
    : (r.months < 1.4 ? 'about a month' : Math.round(r.months) + ' months');
  let h = '';

  // 1. The shape of it. Honest first — including the uncomfortable direction.
  const neg = r.netPerMonth < 0;
  h += '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:12px">'+
    '<div style="font-size:11px;color:var(--tx3);margin-bottom:8px">'+period+' of your money · '+r.count+' transactions</div>'+
    '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--tx2);padding:3px 0"><span>Coming in</span><span style="font-family:DM Mono,monospace;color:var(--gr)">'+money(r.incomePerMonth)+'/mo</span></div>'+
    '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--tx2);padding:3px 0"><span>Going out</span><span style="font-family:DM Mono,monospace;color:var(--re)">'+money(r.spendPerMonth)+'/mo</span></div>'+
    '<div style="display:flex;justify-content:space-between;font-size:14px;color:var(--tx);padding:8px 0 0;margin-top:6px;border-top:1px solid var(--bd)"><span>'+(neg?'Short by':'Left over')+'</span>'+
      '<span style="font-family:DM Mono,monospace;color:'+(neg?'var(--re)':'var(--gr)')+'">'+money(r.netPerMonth)+'/mo</span></div>'+
    (r.incomePerMonth <= 0 ? '<div style="font-size:11px;color:var(--tx3);margin-top:8px;line-height:1.5">No income rows in this export — if your pay lands in another account, the leftover figure isn’t the full story.</div>' : '')+
  '</div>';

  // 2. Where it goes.
  const top = r.cats.slice(0,5);
  if(top.length){
    h += '<div style="font-size:12px;color:var(--tx3);margin-bottom:8px">Where it goes</div><div style="margin-bottom:14px">';
    top.forEach(c => {
      const pct = Math.round(c.share*100);
      h += '<div style="margin-bottom:8px">'+
        '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--tx2);margin-bottom:4px"><span>'+c.name+'</span><span style="font-family:DM Mono,monospace">'+money(c.perMonth)+'/mo · '+pct+'%</span></div>'+
        '<div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+Math.max(2,pct)+'%;background:var(--go);border-radius:3px"></div></div>'+
      '</div>';
    });
    h += '</div>';
  }

  // 3. The one place to lock in — and what it's actually worth. This is where the money tab stops
  // reporting and starts counselling, so it has to name a real consequence, not a vibe.
  if(r.lockIn){
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
    h += '<div style="background:var(--go-bg);border:1px solid var(--go-bd);border-radius:12px;padding:14px;margin-bottom:12px">'+
      '<div style="font-size:11px;color:var(--go);margin-bottom:6px">WHERE TO LOCK IN</div>'+
      '<div style="font-size:13px;color:var(--tx);line-height:1.6">'+r.lockIn.name+' is '+money(r.lockIn.perMonth)+' a month — your biggest movable cost. '+consequence+'</div>'+
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
      const contradicts = v.mode!=='moderate' && insideStreak && insideStreak.total > 0;
      out += '<div style="background:'+(contradicts?'var(--re-bg)':'var(--bg3)')+';border:1px solid '+(contradicts?'var(--re-bd)':'var(--bd)')+';border-radius:12px;padding:14px;margin-bottom:12px">'+
        '<div style="font-size:11px;color:var(--tx3);margin-bottom:6px">'+_escFew(v.n.toUpperCase())+' · WHAT THE BANK SAYS</div>'+
        '<div style="font-family:DM Mono,monospace;font-size:26px;color:'+(contradicts?'var(--re)':'var(--tx)')+';line-height:1">'+curSym()+Math.round(bank.total).toLocaleString()+'</div>'+
        '<div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-top:8px">'+
          bank.count+' transactions'+(since?' over the last '+since+' days':'')+'. '+
          (contradicts
            ? 'But this card says you’ve been clean '+clean+' days — and '+curSym()+Math.round(insideStreak.total).toLocaleString()+' of that spending falls inside it. One of the two isn’t true. No judgement either way; I’d just rather you had the real number.'
            : 'That’s the real number — not an estimate. It’s what this cost you.')+
        '</div>'+
        (contradicts ? '<button onclick="openLogUse('+i+')" style="width:100%;margin-top:10px;background:none;border:1px solid var(--re-bd);color:var(--re);border-radius:9px;padding:9px;font-size:12px;cursor:pointer">Set it straight</button>' : '')+
      '</div>';
    });
  }catch(_){}
  // Cash is the hole in all of this, and pretending otherwise would make the app a liar.
  if(out) out += '<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-bottom:12px">A bank export can’t see cash. If something gets paid for in notes, or you owe someone directly, only you can put that in.</div>';
  return out;
}

function openSpendingRead(justImported){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:86vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:23px;font-style:italic;color:var(--tx);margin-bottom:4px">'+(justImported?'Here’s how it looks':'Your money, honestly')+'</div>'+
    (justImported?'<div style="font-size:12px;color:var(--tx3);margin-bottom:14px">'+justImported+' new transactions read.</div>':'<div style="height:10px"></div>')+
    spendingReadHTML()+
    '<button class="btn" onclick="closeModal(this)">Close</button></div>';
  document.body.appendChild(m);
}
