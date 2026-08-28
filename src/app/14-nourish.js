// ── NUTRITION ─────────────────────────────────────────────────
// ── THIRD-PARTY CREDENTIALS LIVE ON THE SERVER, NOT HERE ─────────────────────────────────────────
// index.html is one public file on GitHub Pages, so anything in it is readable by anyone who views
// source. Three credentials used to sit in it, and the worst was FS_SECRET — a FatSecret OAuth CLIENT
// SECRET, base64'd into a client-credentials exchange performed in the browser. A client secret is the
// app's own identity, not a read-only key: publishing it lets anyone act as this app. ESV_API_KEY and
// USDA_DEFAULT_KEY were the same mistake with smaller blast radii (revocation, and quota theft).
//
// All three now come from the `key-proxy` edge function (supabase/functions/key-proxy), which holds
// them as Supabase secrets. Each caller degrades gracefully when the function is not deployed, so
// nothing here breaks while it is being set up — see the note at each call site.
async function keyProxy(payload){
  try{
    if(!sb || !sb.functions) return null;
    const { data, error } = await sb.functions.invoke('key-proxy', { body: payload });
    if(error || !data || data.error) return null;
    return data;
  }catch(_){ return null; }
}
let fsToken=null,fsTokenExpiry=0;

async function getFSToken(){
  if(fsToken&&Date.now()<fsTokenExpiry)return fsToken;
  // Returns a short-lived token instead of embedding a permanent client secret. Until key-proxy is
  // deployed with FATSECRET_ID/FATSECRET_SECRET set this returns null, searchFatSecret() returns [] as
  // it always did on failure, and searchFood() carries on with USDA, OpenFoodFacts and Nutritionix —
  // it runs all four through Promise.allSettled, so three sources is a quieter result list, not a
  // broken search.
  const d = await keyProxy({ provider:'fatsecret' });
  if(d && d.access_token){
    fsToken = d.access_token;
    fsTokenExpiry = Date.now() + 55*60*1000;   // the proxy already expires its own cache early
    return fsToken;
  }
  return null;
}
async function searchFatSecret(query){
  const token=await getFSToken();if(!token)return[];
  try{
    const r=await fetch('https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression='+encodeURIComponent(query)+'&format=json&max_results=8',{headers:{'Authorization':'Bearer '+token}});
    if(r.ok){const d=await r.json();const foods=d.foods?.food||[];
      return(Array.isArray(foods)?foods:[foods]).map(f=>({
        id:f.food_id,name:f.food_name,brand:f.brand_name||'',
        cal:parseFloat(f.food_description?.match(/Calories:\s*([\d.]+)/)?.[1]||0),
        pro:parseFloat(f.food_description?.match(/Protein:\s*([\d.]+)/)?.[1]||0),
        carb:parseFloat(f.food_description?.match(/Carbs:\s*([\d.]+)/)?.[1]||0),
        fat:parseFloat(f.food_description?.match(/Fat:\s*([\d.]+)/)?.[1]||0),
        source:'FatSecret',
        servings:[{name:'Per serving',cal:parseFloat(f.food_description?.match(/Calories:\s*([\d.]+)/)?.[1]||0),pro:parseFloat(f.food_description?.match(/Protein:\s*([\d.]+)/)?.[1]||0),carb:parseFloat(f.food_description?.match(/Carbs:\s*([\d.]+)/)?.[1]||0),fat:parseFloat(f.food_description?.match(/Fat:\s*([\d.]+)/)?.[1]||0)}]
      }));}
  }catch(e){}return[];
}
async function searchOFF(query){
  try{
    // Use the Australian Open Food Facts endpoint so AU products (Woolworths/Coles/local brands)
    // rank first — closer to how Aussie nutrition apps behave. Also pull countries_tags so we can
    // flag AU items for ranking in the merge step.
    const r=await fetch('https://au.openfoodfacts.org/cgi/search.pl?search_terms='+encodeURIComponent(query)+'&action=process&json=1&page_size=8&fields=code,product_name,brands,nutriments,serving_size,countries_tags',{headers:{'User-Agent':'ToTry-App/1.0 (AU)'}});
    if(r.ok){const d=await r.json();
      return(d.products||[]).filter(p=>p.product_name&&p.nutriments).map(p=>{
        const n = p.nutriments;
        // Grams per serving from the product (e.g. "80g"). Needed to scale honestly.
        const servingG = parseFloat(n.serving_quantity || p.serving_quantity || (p.serving_size ? (p.serving_size.match(/([\d.]+)\s*(g|ml)/i)||[])[1] : 0)) || 0;
        // ALWAYS compute a clean per-100g base: prefer _100g; if only _serving exists, derive it
        // from the serving grams. This stops the per-serving/per-100 mixing that gave wrong macros.
        const per100 = (base) => {
          const v100 = n[base+'_100g'];
          if(v100 != null && v100 !== '' && !isNaN(v100) && Number(v100) !== 0) return Number(v100);
          const vServ = n[base+'_serving'];
          if(vServ != null && vServ !== '' && !isNaN(vServ) && servingG > 0) return Number(vServ) * 100 / servingG;
          return Number(v100) || 0;
        };
        let cal100 = per100('energy-kcal');
        if(!cal100){ const ej = per100('energy'); if(ej) cal100 = ej/4.184; }
        cal100 = Math.round(cal100);
        const pro100 = Math.round(per100('proteins')*10)/10;
        const carb100 = Math.round(per100('carbohydrates')*10)/10;
        const fat100 = Math.round(per100('fat')*10)/10;
        const isAU = Array.isArray(p.countries_tags) && p.countries_tags.some(t=>/australia/i.test(t));
        // Build servings: the product's real serving FIRST (correctly scaled), then 100g. Every
        // serving carries its own correctly-scaled macros so the modal never mis-scales.
        const scaleTo = (g) => ({ cal: Math.round(cal100*g/100), pro: Math.round(pro100*g/100*10)/10, carb: Math.round(carb100*g/100*10)/10, fat: Math.round(fat100*g/100*10)/10 });
        const servings = [];
        if(servingG > 0){ const m = scaleTo(servingG); servings.push({ name: p.serving_size || (servingG+'g'), gramsEquiv:servingG, cal:m.cal, pro:m.pro, carb:m.carb, fat:m.fat }); }
        servings.push({ name:'100g', gramsEquiv:100, cal:cal100, pro:pro100, carb:carb100, fat:fat100 });
        return {
          id: 'off_'+p.code,
          name: p.product_name,
          brand: p.brands||'',
          per100: true,
          cal: cal100, pro: pro100, carb: carb100, fat: fat100,
          _au: isAU,
          fiber: Math.round(per100('fiber')*10)/10,
          sugar: Math.round(per100('sugars')*10)/10,
          sodium: Math.round(per100('sodium')*1000),
          sat_fat: Math.round(per100('saturated-fat')*10)/10,
          calcium: Math.round(per100('calcium')*1000),
          iron: Math.round(per100('iron')*1000*10)/10,
          potassium: Math.round(per100('potassium')*1000),
          vit_c: Math.round(per100('vitamin-c')*1000*10)/10,
          source: 'Open Food Facts',
          servings
        };
      });
    }
  }catch(e){}return[];
}

// USDA FoodData Central — 380,000 government-verified whole foods + branded products.
// 1000 requests/hour with this key. Users can override via Settings.
// No default key any more — it shipped in this public file, where a FoodData Central key can be lifted
// and its 1,000-requests-an-hour quota spent by anyone. Order of preference: the key-proxy edge
// function, then a key the person entered themselves in Settings. If neither is available searchUSDA
// returns nothing and searchFood() carries on with its other three sources. A FoodData Central key is
// free and issued instantly at api.data.gov, which is the two-minute workaround.
function getUSDAKey(){ return ls('totry_usda_key') || null; }
async function searchUSDA(query){
  try{
    const key = getUSDAKey();
    // USDA FoodData Central holds ~1.9 MILLION branded products against only ~8k generic
    // Foundation/SR-Legacy whole foods. Asking for them together (dataType=Foundation,SR Legacy,
    // Branded) let branded drown everything — searching "chicken breast" returned nothing but
    // supermarket packets from Tyson and Giant Eagle, and the real food never even reached the
    // ranker. Ask SEPARATELY so the actual whole food always gets a seat at the table.
    const call = async (dataType, pageSize) => {
      // Through the proxy when it is available, so no key is needed on the device at all. dataType and
      // pageSize are passed through because the two separate calls below are deliberate.
      // call() must return an ARRAY — the direct path below returns d.foods||[] and both results are
      // .map()'d straight after. Returning the raw proxy object (or null) here would throw on the very
      // next line, which is the kind of thing that parses cleanly and dies only when someone searches.
      const _p = await keyProxy({ provider:'usda', query, dataType, pageSize });
      if(_p) return Array.isArray(_p.foods) ? _p.foods : [];
      if(!key) return [];
      const r = await fetch('https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + key +
        '&query=' + encodeURIComponent(query) +
        '&dataType=' + encodeURIComponent(dataType) +
        '&pageSize=' + pageSize);
      if(!r.ok){
        if(r.status === 429){ console.warn('[usda] rate-limited (DEMO_KEY)'); }
        return [];
      }
      const d = await r.json();
      return d.foods || [];
    };
    const [genericFoods, brandedFoods] = await Promise.all([
      call('Foundation,SR Legacy', 6).catch(()=>[]),
      call('Branded', 4).catch(()=>[])
    ]);
    // Tag the real foods so ranking can let them compete with same-named branded packets.
    const foods = [...genericFoods.map(f => Object.assign(f, {__generic:true})), ...brandedFoods];
    return foods.map(f => {
      // USDA gives nutrients as an array we need to parse
      const n = {cal: 0, pro: 0, carb: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0,
                 // Vitamins
                 vit_a: 0, vit_c: 0, vit_d: 0, vit_e: 0, vit_k: 0,
                 b1: 0, b2: 0, b3: 0, b6: 0, b9: 0, b12: 0,
                 // Minerals
                 calcium: 0, iron: 0, magnesium: 0, phosphorus: 0,
                 potassium: 0, zinc: 0, selenium: 0, copper: 0,
                 // Fat breakdown
                 sat_fat: 0, cholesterol: 0};
      (f.foodNutrients || []).forEach(fn => {
        const name = (fn.nutrientName || '').toLowerCase();
        const val = fn.value || 0;
        const unit = (fn.unitName || '').toLowerCase();
        
        if(name.includes('energy') && (unit === 'kcal' || name.includes('kcal'))) n.cal = Math.round(val);
        else if(name === 'protein') n.pro = Math.round(val * 10) / 10;
        else if(name.includes('carbohydrate, by difference')) n.carb = Math.round(val * 10) / 10;
        else if(name.includes('total lipid') || name === 'fat') n.fat = Math.round(val * 10) / 10;
        // Macros expansion
        else if(name.includes('fiber, total dietary')) n.fiber = Math.round(val * 10) / 10;
        else if(name.includes('sugars, total') || name === 'total sugars') n.sugar = Math.round(val * 10) / 10;
        else if(name === 'sodium, na') n.sodium = Math.round(val);
        else if(name.includes('fatty acids, total saturated')) n.sat_fat = Math.round(val * 10) / 10;
        else if(name === 'cholesterol') n.cholesterol = Math.round(val);
        // Vitamins (USDA returns these in mcg or mg — we store in standard unit; display layer formats)
        else if(name.includes('vitamin a, rae')) n.vit_a = Math.round(val);
        else if(name.includes('vitamin c')) n.vit_c = Math.round(val * 10) / 10;
        else if(name.includes('vitamin d (d2 + d3)')) n.vit_d = Math.round(val * 10) / 10;
        else if(name.includes('vitamin e (alpha-tocopherol)')) n.vit_e = Math.round(val * 10) / 10;
        else if(name.includes('vitamin k (phylloquinone)')) n.vit_k = Math.round(val * 10) / 10;
        else if(name === 'thiamin') n.b1 = Math.round(val * 100) / 100;
        else if(name === 'riboflavin') n.b2 = Math.round(val * 100) / 100;
        else if(name === 'niacin') n.b3 = Math.round(val * 10) / 10;
        else if(name === 'vitamin b-6') n.b6 = Math.round(val * 100) / 100;
        else if(name === 'folate, total' || name === 'folate, dfe') n.b9 = Math.round(val);
        else if(name === 'vitamin b-12') n.b12 = Math.round(val * 100) / 100;
        // Minerals
        else if(name === 'calcium, ca') n.calcium = Math.round(val);
        else if(name === 'iron, fe') n.iron = Math.round(val * 10) / 10;
        else if(name === 'magnesium, mg') n.magnesium = Math.round(val);
        else if(name === 'phosphorus, p') n.phosphorus = Math.round(val);
        else if(name === 'potassium, k') n.potassium = Math.round(val);
        else if(name === 'zinc, zn') n.zinc = Math.round(val * 10) / 10;
        else if(name === 'selenium, se') n.selenium = Math.round(val * 10) / 10;
        else if(name === 'copper, cu') n.copper = Math.round(val * 100) / 100;
      });
      // USDA values are per 100g for Foundation/SR, varying for Branded
      const isBranded = f.dataType === 'Branded';
      // ALWAYS "100g". FDC's search endpoint returns foodNutrients per 100g for Branded foods exactly as
      // it does for Foundation/SR — the identical n.cal/n.pro/n.carb/n.fat values were simply LABELLED
      // with the product's own servingSize, so a 30g bar showed 100g of calories, roughly 2-3x over. The
      // raw unit code came through too, so real labels read "50 GRM" and "46 MG". One set of numbers
      // cannot be both per 100g and per serving; the numbers were right and the label was wrong.
      // The serving size is kept as a separate, correctly-scaled option below rather than thrown away.
      const servingLabel = '100g';
      const _brandServing = (isBranded && f.servingSize > 0 && /^(g|grm|gram|grams)$/i.test(String(f.servingSizeUnit||'g')))
        ? { name: Math.round(f.servingSize) + 'g serving',
            cal: Math.round(n.cal * f.servingSize / 100),
            pro: +(n.pro * f.servingSize / 100).toFixed(1),
            carb: +(n.carb * f.servingSize / 100).toFixed(1),
            fat: +(n.fat * f.servingSize / 100).toFixed(1) }
        : null;
      const name = f.description || f.lowercaseDescription || 'USDA food';
      const brand = f.brandOwner || f.brandName || '';
      return {
        id: 'usda_' + f.fdcId,
        name: name.length > 80 ? name.slice(0, 80) + '...' : name,
        brand: brand,
        cal: n.cal,
        pro: n.pro,
        carb: n.carb,
        fat: n.fat,
        // Full micros carried through
        fiber: n.fiber, sugar: n.sugar, sodium: n.sodium,
        sat_fat: n.sat_fat, cholesterol: n.cholesterol,
        vit_a: n.vit_a, vit_c: n.vit_c, vit_d: n.vit_d, vit_e: n.vit_e, vit_k: n.vit_k,
        b1: n.b1, b2: n.b2, b3: n.b3, b6: n.b6, b9: n.b9, b12: n.b12,
        calcium: n.calcium, iron: n.iron, magnesium: n.magnesium, phosphorus: n.phosphorus,
        potassium: n.potassium, zinc: n.zinc, selenium: n.selenium, copper: n.copper,
        source: 'USDA',
        __generic: !!f.__generic,   // a real whole food, not a branded packet — ranking uses this
        per100: true,   // these figures are per 100g — openServingModal's micro maths depends on knowing
        servings: [{name: servingLabel, cal: n.cal, pro: n.pro, carb: n.carb, fat: n.fat}]
                    .concat(_brandServing ? [_brandServing] : [])
      };
    });
  }catch(e){ console.warn('[usda] search failed:', e); return []; }
}
// Nutritionix — strong for branded + restaurant items USDA/OFF miss. Uses the public
// instant-search endpoint. Keys are optional (works app-wide via the proxy if set);
// without keys this simply returns [] and the other three sources cover it.
async function searchNutritionix(query){
  try{
    const appId = ls('totry_nutritionix_id'); const appKey = ls('totry_nutritionix_key');
    if(!appId || !appKey) return []; // optional source; silent if not configured
    const r = await fetch('https://trackapi.nutritionix.com/v2/search/instant?query=' + encodeURIComponent(query), {
      headers: { 'x-app-id': appId, 'x-app-key': appKey }
    });
    if(!r.ok) return [];
    const d = await r.json();
    const branded = (d.branded || []).slice(0, 6).map(b => ({
      name: b.food_name,
      brand: b.brand_name || 'Nutritionix',
      cal: Math.round(b.nf_calories || 0),
      pro: 0, carb: 0, fat: 0, // instant endpoint is calorie-only; serving modal lets them refine
      servings: [{ name: (b.serving_qty || 1) + ' ' + (b.serving_unit || 'serving'), cal: Math.round(b.nf_calories || 0), pro: 0, carb: 0, fat: 0 }],
      source: 'Nutritionix'
    }));
    return branded;
  }catch(_){ return []; }
}

// ── VOICE LOG ── say the meal, the app searches it. Falls back to keyboard dictation.
function startVoiceLog(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const input = document.getElementById('nut-search-in');
  // iOS exposes webkitSpeechRecognition but it does NOT actually work in a installed PWA / standalone
  // Safari (it appears to listen, then fails or does nothing — confusing). So on iOS we always route
  // to keyboard dictation, which is the reliable path. Only use in-app SR off iOS (e.g. Android Chrome).
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if(!SR || isIOS){
    if(input){ input.focus(); input.setAttribute('enterkeyhint','search'); }
    showToast('Use your keyboard\u2019s mic', 'Tap the \ud83c\udfa4 on your iPhone keyboard to speak your meal \u2014 it types straight into the box. (In-app voice isn\u2019t supported on iPhone.)');
    return;
  }
  try{
    const rec = new SR();
    rec.lang = 'en-AU'; rec.interimResults = false; rec.maxAlternatives = 1;
    showToast('Listening\u2026', 'Say what you ate \u2014 e.g. \u201ctwo eggs and a banana\u201d');
    haptic('tap');
    rec.onresult = ev => {
      const t = ev.results[0][0].transcript;
      if(input) input.value = t;
      searchFood(t);
      if(typeof logEvent === 'function') logEvent('voice_log');
    };
    rec.onerror = () => { if(input) input.focus(); showToast('Didn\u2019t catch that', 'Try again, or tap the mic on your keyboard.'); };
    rec.start();
  }catch(_){ if(input) input.focus(); }
}

// ── WAITING, HONESTLY ──────────────────────────────────────────────────────────────────────────
// Alfy stood in a shop with a gyros open plate, photographed it, typed it in, and watched a pulsing
// line for a minute and a half on 17% battery and two bars. Nothing was broken that a console would
// show: the call had a ceiling and would have ended. But a silent pulse with no elapsed time, no way
// to stop, and no way to just log the meal is indistinguishable from a dead app — so he gave up
// before it ever answered, and his lunch went unlogged.
//
// Three things a person is owed while they wait, and every food path uses these two helpers to give
// them: proof it is still alive (a ticking count), a way out that logs the meal anyway (manual entry
// is one tap, not a fallback after failure), and an ending that says what happened in plain words.
// Nothing here is any use where he cannot see it. The results area sits ~180px BELOW the fold on a
// 414x896 phone, so tapping search moved nothing on screen: the spinner, the answer and the failure
// all rendered off the bottom. That is what "didn't do shit" looked like from his side of the glass.
function _foodReveal(res){
  try{
    if(!res) return;
    const r = res.getBoundingClientRect();
    if(r.top > innerHeight - 120 || r.bottom < 80)
      res.scrollIntoView({block:'center', behavior:'smooth'});
  }catch(_){ }
}

let _foodWaitTimer = null;
function _foodWaitStop(){ if(_foodWaitTimer){ clearInterval(_foodWaitTimer); _foodWaitTimer=null; } }

function foodWorking(res, line){
  if(!res) return;
  _foodWaitStop();
  res.innerHTML =
    '<div style="padding:16px;background:var(--bg3);border:1px solid var(--bd);border-radius:14px">' +
      '<div class="pulsing" style="font-family:\'Cormorant Garamond\',serif;font-size:16px;font-style:italic;' +
        'color:var(--tx);line-height:1.45;margin-bottom:10px">' + _escFew(line) + '</div>' +
      '<div id="food-wait-el" style="font-size:11.5px;color:var(--tx3);letter-spacing:.04em;margin-bottom:14px;' +
        'font-variant-numeric:tabular-nums">just a moment</div>' +
      '<button class="btn" onclick="_foodWaitStop();openQuickAdd()" style="width:100%;background:var(--bg2);' +
        'border:1px solid var(--bd);font-size:13px">Add it myself instead</button>' +
    '</div>';
  const t0 = Date.now();
  _foodWaitTimer = setInterval(function(){
    const el = document.getElementById('food-wait-el');
    if(!el){ _foodWaitStop(); return; }
    const sec = Math.round((Date.now()-t0)/1000);
    el.textContent = sec < 4  ? 'just a moment'
                   : sec < 10 ? sec + 's · still working'
                   :            sec + 's · slow connection, hold on';
  }, 1000);
  _foodReveal(res);
}

// The ending. Says what happened, offers the same try again, and keeps the manual path — because the
// meal still has to get logged whether or not the model ever cooperates.
function foodTypeItInstead(){
  _foodWaitStop();
  const el = document.getElementById('nut-search-in');
  if(!el) { openQuickAdd(); return; }
  try{ el.scrollIntoView({block:'center', behavior:'smooth'}); }catch(_){ }
  setTimeout(function(){ try{ el.focus(); }catch(_){ } }, 320);
}

// primaryJs/primaryLbl override the default "Add it myself". After a photo fails, the next thing he
// wants is to say what the meal WAS — not to key in calories he does not know. Quick add is the right
// ending for a failed text estimate (he already typed the words); it is the wrong one for a photo.
function foodFailed(res, headline, sub, retryJs, primaryJs, primaryLbl){
  _foodWaitStop();
  if(!res) return;
  res.innerHTML =
    '<div style="padding:16px;background:var(--bg3);border:1px solid var(--bd);border-radius:14px">' +
      '<div style="font-size:14px;color:var(--tx);line-height:1.5;margin-bottom:5px">' + _escFew(headline) + '</div>' +
      '<div style="font-size:12px;color:var(--tx3);line-height:1.55;margin-bottom:14px">' + _escFew(sub) + '</div>' +
      (retryJs ? '<button class="btn" onclick="' + _jsAttr(retryJs) + '" style="width:100%;margin-bottom:8px;' +
        'background:var(--bg2);border:1px solid var(--bd);font-size:13px">Try again</button>' : '') +
      '<button class="btn primary" onclick="' + _jsAttr(primaryJs || 'openQuickAdd()') + '" ' +
        'style="width:100%;font-size:13px">' + _escFew(primaryLbl || 'Add it myself') + '</button>' +
    '</div>';
  _foodReveal(res);
}

// ── QUICK ADD ── log calories (+ optional macros) with no food search — MFP's fastest path.
// The rest of the ways in. They were six equal buttons in a row on the main screen, which made every
// one of them look as routine as the two he uses daily. Behind one door they are findable without
// setting the weight of the screen — and the hunger check, which is the thing no calorie app does,
// finally sits with the other ways to answer "I'm about to eat" instead of as a dashed afterthought.
// Open only when they are wanted — and open on their own for anyone who IS using them, so nothing a
// person relies on ever gets hidden behind a tap they do not know to make. The summary line carries
// today's real numbers, so the row is worth reading even while it is closed.
function toggleNutSecondary(){
  const box = document.getElementById('nut-secondary');
  const btn = document.getElementById('nut-secondary-open');
  if(!box || !btn) return;
  const open = box.style.display === 'none';
  box.style.display = open ? '' : 'none';
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if(open) try{ ls('totry_nut_sec_open', true); }catch(_){ }
  else     try{ ls('totry_nut_sec_open', false); }catch(_){ }
}

function syncNutSecondary(){
  const box = document.getElementById('nut-secondary');
  const btn = document.getElementById('nut-secondary-open');
  const sum = document.getElementById('nut-secondary-sum');
  if(!box || !btn || !sum) return;
  const bits = [];
  let inUse = false;
  try{
    // The real getter, not a second reading of the same key: it resolves the day the tab is SHOWING
    // and converts the old cups-based rows. Re-deriving it here is how the two would drift apart.
    const w = (typeof getWaterCount === 'function') ? getWaterCount() : 0;
    if(w > 0){ inUse = true; bits.push((Math.round(w/100)/10) + ' L water'); }
  }catch(_){ }
  try{
    // totry_fast_start is a key NOTHING in this app has ever written. My own check passed because I
    // seeded the key my code reads instead of the one the timer writes — a test proving my assumption
    // to itself. A person 5 hours into a live 16:8 landed on Nourish and read "not tracking these"
    // over a running clock. The real state is totry_fasting.startTs; read it through the app's getter.
    const fs = (typeof getFastingState === 'function') ? getFastingState() : (ls('totry_fasting') || {});
    if(fs && fs.startTs){
      inUse = true;
      const mins = Math.max(0, Math.round((Date.now() - new Date(fs.startTs).getTime()) / 60000));
      bits.push(mins >= 60 ? ('fasting ' + Math.floor(mins/60) + 'h ' + (mins%60) + 'm') : 'fasting');
    }
  }catch(_){ }
  try{
    const cyc = ls('totry_cal_cycling');
    if(cyc && cyc.enabled){ inUse = true; bits.push('cycling on'); }
  }catch(_){ }
  try{
    if(ls('totry_fast_season')){ inUse = true; bits.push('fasting season'); }
  }catch(_){ }
  sum.textContent = bits.length ? bits.join(' · ') : 'not tracking these';
  const remembered = ls('totry_nut_sec_open');
  const open = remembered === true || (remembered !== false && inUse);
  box.style.display = open ? '' : 'none';
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function openMoreWaysToLog(){
  const ways = [
    ['\u{1F4F7}','Snap a meal','A photo of the plate','document.getElementById(\'meal-photo-input\').click()'],
    ['\u{1F4C7}','Scan a barcode','Packaged food, straight off the label','openBarcodeScanner()'],
    ['\u{1F5E3}','Say it','Speak the meal — fastest one-handed','startVoiceLog()'],
    ['\u{1F4D2}','My recipes','Something you make often','openRecipeBuilder()'],
    ['\u{1F504}','Repeat a day','Copy everything from another day','openRepeatDay()'],
    ['\u{1F914}','Am I actually hungry?','Six seconds, before you eat','openHungerCheck()'],
    ['\u{1F4C4}','Import a CSV','Bring a log over from another app','document.getElementById(\'food-csv-input\').click()']
  ];
  const m = document.createElement('div'); m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:4px">More ways to log</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px;line-height:1.5">' +
      'Whatever gets the meal down. None of them is better than the others.</p>' +
    '<div style="display:flex;flex-direction:column;gap:2px;margin-bottom:10px">' +
    ways.map(w => '<button class="mw-row" onclick="closeModal(this);setTimeout(function(){' + _jsAttr(w[3]) + '},220)">' +
      '<span class="mw-ic">' + w[0] + '</span>' +
      '<span class="mw-txt"><span class="mw-t">' + w[1] + '</span>' +
        '<span class="mw-s">' + w[2] + '</span></span>' +
      '<span class="mw-ch">›</span></button>').join('') +
    '</div>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}

// His foods, not a stock list. Seven chips read "Chicken breast / Oats / Rice / Eggs / Banana ..." to
// everyone alike, including someone who has logged a hundred meals and never eaten one of them — the
// clearest sign on the screen that nothing was paying attention. These are counted from what he has
// actually logged; the stock list only stands in for someone with no history yet.
function renderQuickFoods(){
  const box = document.getElementById('nut-quick-foods'); if(!box) return;
  const log = (typeof nutLogSafe === 'function') ? nutLogSafe() : (ls('totry_nutlog') || {});
  const counts = {};
  Object.keys(log).forEach(k => (log[k]||[]).forEach(it => {
    const n = String(it && it.name || '').trim();
    if(!n || /^quick add$/i.test(n)) return;
    counts[n] = (counts[n] || 0) + 1;
  }));
  let names = Object.keys(counts).filter(n => counts[n] >= 2)
                    .sort((a,b) => counts[b] - counts[a]).slice(0,6);
  let mine = names.length >= 3;
  if(!mine) names = ['Chicken breast','Oats','Rice','Eggs','Banana','Greek yogurt'];
  box.innerHTML =
    '<div style="width:100%;font-size:10.5px;color:var(--tx3);letter-spacing:.07em;text-transform:uppercase;margin-bottom:2px">' +
      (mine ? 'What you eat most' : 'Common foods') + '</div>' +
    names.map(n => '<button class="qb" onclick="searchFood(' + _jsAttr(JSON.stringify(n)) + ')">' +
      _escFew(n.length > 24 ? n.slice(0,23) + '…' : n) + '</button>').join('');
}

function openQuickAdd(){
  const meal = (typeof currentMealSlot==='function') ? currentMealSlot() : 'snack';
  const meals=[['breakfast','🌅'],['lunch','☀️'],['dinner','🌙'],['snack','🍎']];
  window.__qaMeal=meal;
  const m=document.createElement('div'); m.className='modal-bg open';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<h3 style="margin-bottom:4px">Quick add</h3>'+
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px;line-height:1.5">Just the numbers — when you know roughly what you ate but don’t want to search. Calories required; macros optional.</p>'+
    '<div class="lbl" style="margin-bottom:6px">Which meal?</div>'+
    '<div id="qa-meals" style="display:flex;gap:6px;margin-bottom:14px">'+meals.map(x=>'<button class="qa-meal" data-meal="'+x[0]+'" onclick="_qaMeal(\''+x[0]+'\')" style="flex:1;padding:9px 4px;border-radius:9px;border:1px solid '+(x[0]===meal?'var(--go)':'var(--bd)')+';background:'+(x[0]===meal?'rgba(200,169,110,0.12)':'var(--bg3)')+';color:var(--tx2);font-size:15px;cursor:pointer">'+x[1]+'</button>').join('')+'</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'+
      '<div><div class="lbl" style="margin-bottom:4px">Calories</div><input type="number" id="qa-cal" inputmode="numeric" placeholder="e.g. 350" style="width:100%"></div>'+
      '<div><div class="lbl" style="margin-bottom:4px">Protein (g)</div><input type="number" id="qa-pro" inputmode="numeric" placeholder="opt." style="width:100%"></div>'+
      '<div><div class="lbl" style="margin-bottom:4px">Carbs (g)</div><input type="number" id="qa-carb" inputmode="numeric" placeholder="opt." style="width:100%"></div>'+
      '<div><div class="lbl" style="margin-bottom:4px">Fat (g)</div><input type="number" id="qa-fat" inputmode="numeric" placeholder="opt." style="width:100%"></div>'+
    '</div>'+
    '<button class="btn primary" onclick="quickAddLog()" style="margin-bottom:8px">Add to diary</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>'+
  '</div>';
  document.body.appendChild(m);
  setTimeout(()=>document.getElementById('qa-cal')?.focus(),80);
}
function _qaMeal(m){ window.__qaMeal=m; document.querySelectorAll('#qa-meals .qa-meal').forEach(b=>{ const on=b.dataset.meal===m; b.style.borderColor=on?'var(--go)':'var(--bd)'; b.style.background=on?'rgba(200,169,110,0.12)':'var(--bg3)'; }); }
function quickAddLog(){
  const cal=parseFloat(document.getElementById('qa-cal')?.value)||0;
  if(cal<=0){ if(typeof showToast==='function') showToast('Add calories','Enter at least the calories.'); return; }
  const pro=parseFloat(document.getElementById('qa-pro')?.value)||0;
  const carb=parseFloat(document.getElementById('qa-carb')?.value)||0;
  const fat=parseFloat(document.getElementById('qa-fat')?.value)||0;
  const meal=window.__qaMeal||'snack';
  const today=(typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU');
  const log=ls('totry_nutlog')||{}; if(!log[today]) log[today]=[];
  log[today].push({ id:Date.now()+Math.floor(Math.random()*1000), name:'Quick add', brand:'', serving:'', qty:1, cal:Math.round(cal), pro:Math.round(pro), carb:Math.round(carb), fat:Math.round(fat), meal:meal, source:'quick add', ts:(typeof nutStampFor==='function'?nutStampFor():new Date().toISOString()) });
  ls('totry_nutlog', log);
  document.querySelector('.modal-bg.open')?.remove();
  if(typeof renderNutritionLog==='function') renderNutritionLog();
  if(typeof autoTickHabits==='function') autoTickHabits();
  if(typeof haptic==='function') haptic('success');
  // Numbers off → confirm the log without stating the calories.
  if(typeof showToast==='function') showToast('Added', (typeof nutGentle==='function'&&nutGentle()) ? ('Logged to '+meal+'.') : (Math.round(cal)+' cal to '+meal+'.'));
  if(typeof logEvent==='function') logEvent('quick_add');
}

// ── CURATED COMMON-FOODS DATABASE ────────────────────────────────────────────
// The ~100 foods people actually log every day, with accurate per-100g macros and real portions.
// Matched and rendered INSTANTLY, before any network call — so logging a staple is as fast as MFP
// (searching the 4 online sources takes ~2s). The online DBs still fill the long tail below. This is
// the reliability principle again: the common case is deterministic, offline, and instant; AI/network
// is only for the fuzzy long tail. Row = [name, [cal,pro,carb,fat,fiber,sugar,sodium] per 100g,
// [[portion label, grams], ...] (first = default), aliases?]. Values are per 100 g, cooked where
// that's how it's eaten.
const COMMON_FOODS_RAW = [
  // Proteins
  ['Chicken breast, cooked',   [165,31,0,3.6,0,0,74],   [['1 breast (170g)',170]], 'poultry'],
  ['Chicken thigh, cooked',    [209,26,0,10.9,0,0,88],  [['1 thigh (90g)',90]], 'poultry'],
  ['Beef mince, lean, cooked', [217,26,0,12,0,0,72],    [['100 g',100]], 'ground beef hamburger'],
  ['Beef steak, cooked',       [250,27,0,15,0,0,58],    [['1 steak (200g)',200]], ''],
  ['Pork chop, cooked',        [231,26,0,13,0,0,62],    [['1 chop (120g)',120]], ''],
  ['Salmon, cooked',           [208,20,0,13,0,0,59],    [['1 fillet (150g)',150]], 'fish'],
  ['White fish (cod), cooked', [105,23,0,0.9,0,0,78],   [['1 fillet (150g)',150]], 'fish'],
  ['Tuna, canned in springwater', [116,26,0,1,0,0,247], [['1 can (95g)',95]], 'fish'],
  ['Prawns, cooked',           [99,24,0.2,0.3,0,0,111], [['100 g',100]], 'shrimp seafood'],
  ['Egg, whole',               [143,13,1.1,9.5,0,1.1,142],[['1 large egg (50g)',50]], ''],
  ['Egg white',                [52,11,0.7,0.2,0,0.7,166],[['1 white (33g)',33]], ''],
  ['Greek yogurt, plain',      [59,10,3.6,0.4,0,3.2,36],[['1 tub (170g)',170],['100 g',100]], ''],
  ['Cottage cheese',           [98,11,3.4,4.3,0,2.7,364],[['1/2 cup (110g)',110],['100 g',100]], ''],
  ['Whey protein powder',      [400,80,8,6,0,5,300],    [['1 scoop (30g)',30]], 'protein shake'],
  ['Tofu, firm',               [144,17,3,9,2,0.6,14],   [['100 g',100]], ''],
  ['Ham, sliced',              [145,18,1.5,7,0,1,1200], [['2 slices (46g)',46],['100 g',100]], 'deli'],
  ['Bacon, cooked',            [541,37,1.4,42,0,0,1717],[['2 rashers (40g)',40],['100 g',100]], ''],
  ['Turkey mince, cooked',     [176,27,0,7,0,0,70],     [['100 g',100]], 'ground turkey'],
  ['Sausage, cooked',          [300,18,3,24,0,1,700],   [['1 sausage (60g)',60]], 'snag'],
  // Legumes
  ['Lentils, cooked',          [116,9,20,0.4,7.9,1.8,2],[['1 cup (200g)',200],['100 g',100]], ''],
  ['Chickpeas, cooked',        [164,9,27,2.6,7.6,4.8,7],[['1 cup (160g)',160],['100 g',100]], 'garbanzo'],
  ['Black beans, cooked',      [132,9,24,0.5,8.7,0.3,1],[['1 cup (170g)',170],['100 g',100]], ''],
  ['Baked beans',              [94,5,15,0.5,4.1,5,422], [['1 cup (220g)',220],['100 g',100]], ''],
  ['Kidney beans, cooked',     [127,9,23,0.5,6.4,0.3,1],[['1 cup (170g)',170],['100 g',100]], ''],
  // Grains & carbs
  ['White rice, cooked',       [130,2.7,28,0.3,0.4,0.1,1],[['1 cup (180g)',180],['100 g',100]], ''],
  ['Brown rice, cooked',       [123,2.7,26,1,1.6,0.4,4],[['1 cup (180g)',180],['100 g',100]], ''],
  ['Pasta, cooked',            [158,6,31,0.9,1.8,0.6,1],[['1 cup (140g)',140],['100 g',100]], 'spaghetti'],
  ['Oats, dry',                [379,13,68,7,10,1,6],    [['1/2 cup (40g)',40]], 'oatmeal porridge'],
  ['White bread',              [265,9,49,3.2,2.7,5,491],[['1 slice (36g)',36]], 'toast'],
  ['Wholemeal bread',          [247,13,41,3.4,7,6,400], [['1 slice (40g)',40]], 'wholewheat toast'],
  ['Potato, boiled',           [87,1.9,20,0.1,1.8,0.9,4],[['1 medium (170g)',170],['100 g',100]], ''],
  ['Sweet potato, baked',      [90,2,21,0.1,3.3,6.5,36],[['1 medium (150g)',150],['100 g',100]], 'kumara'],
  ['Quinoa, cooked',           [120,4.4,21,1.9,2.8,0.9,7],[['1 cup (185g)',185],['100 g',100]], ''],
  ['Couscous, cooked',         [112,3.8,23,0.2,1.4,0,5],[['1 cup (155g)',155],['100 g',100]], ''],
  ['Tortilla wrap',            [310,8,52,7,3,2,600],    [['1 wrap (60g)',60]], 'burrito'],
  ['Bagel',                    [250,10,48,1.5,2,5,430], [['1 bagel (95g)',95]], ''],
  ['Weet-Bix',                 [340,12,67,1.6,11,3,270],[['2 biscuits (30g)',30]], 'cereal breakfast'],
  ['Rice cakes',               [387,8,82,3,4,0.6,30],   [['1 cake (9g)',9]], ''],
  ['Muesli',                   [360,10,66,6,7,20,90],   [['1/2 cup (45g)',45]], 'cereal granola'],
  // Fruit
  ['Banana',                   [89,1.1,23,0.3,2.6,12,1],[['1 medium (118g)',118]], ''],
  ['Apple',                    [52,0.3,14,0.2,2.4,10,1],[['1 medium (180g)',180]], ''],
  ['Orange',                   [47,0.9,12,0.1,2.4,9,0], [['1 medium (130g)',130]], ''],
  ['Strawberries',             [32,0.7,7.7,0.3,2,4.9,1],[['1 cup (150g)',150],['100 g',100]], 'berries'],
  ['Blueberries',              [57,0.7,14,0.3,2.4,10,1],[['1 cup (148g)',148],['100 g',100]], 'berries'],
  ['Grapes',                   [69,0.7,18,0.2,0.9,15,2],[['1 cup (150g)',150],['100 g',100]], ''],
  ['Mango',                    [60,0.8,15,0.4,1.6,14,1],[['1 cup (165g)',165],['100 g',100]], ''],
  ['Avocado',                  [160,2,9,15,7,0.7,7],    [['1/2 avocado (100g)',100]], ''],
  ['Dates',                    [277,1.8,75,0.2,6.7,66,1],[['2 dates (48g)',48],['100 g',100]], ''],
  // Vegetables
  ['Broccoli, cooked',         [35,2.4,7,0.4,3.3,1.4,41],[['1 cup (156g)',156],['100 g',100]], ''],
  ['Spinach',                  [23,2.9,3.6,0.4,2.2,0.4,79],[['1 cup (30g)',30],['100 g',100]], 'greens'],
  ['Carrot',                   [41,0.9,10,0.2,2.8,4.7,69],[['1 medium (60g)',60]], ''],
  ['Tomato',                   [18,0.9,3.9,0.2,1.2,2.6,5],[['1 medium (120g)',120]], ''],
  ['Cucumber',                 [15,0.7,3.6,0.1,0.5,1.7,2],[['100 g',100]], ''],
  ['Capsicum',                 [31,1,6,0.3,2.1,4.2,4],  [['1 medium (120g)',120],['100 g',100]], 'bell pepper'],
  ['Mushroom',                 [22,3.1,3.3,0.3,1,2,5],  [['100 g',100]], ''],
  ['Mixed veg, cooked',        [60,3,12,0.4,4,4,50],    [['1 cup (160g)',160],['100 g',100]], ''],
  ['Sweet corn',               [86,3.2,19,1.2,2.7,3.2,15],[['1 cob (90g)',90],['100 g',100]], ''],
  ['Peas, cooked',             [84,5.4,16,0.4,5.5,6,3], [['1 cup (160g)',160],['100 g',100]], ''],
  ['Green beans, cooked',      [35,1.9,8,0.3,3.4,3.3,1],[['1 cup (125g)',125],['100 g',100]], ''],
  // Dairy & fats
  ['Whole milk',               [61,3.2,4.8,3.3,0,5,43], [['1 cup (250ml)',250],['100 ml',100]], ''],
  ['Skim milk',                [34,3.4,5,0.1,0,5,42],   [['1 cup (250ml)',250],['100 ml',100]], 'nonfat milk'],
  ['Cheddar cheese',           [402,25,1.3,33,0,0.5,621],[['1 slice (20g)',20],['100 g',100]], ''],
  ['Butter',                   [717,0.9,0.1,81,0,0.1,11],[['1 tbsp (14g)',14]], ''],
  ['Olive oil',                [884,0,0,100,0,0,2],     [['1 tbsp (14g)',14]], ''],
  ['Peanut butter',            [588,25,20,50,6,9,17],   [['1 tbsp (16g)',16]], 'nut butter'],
  ['Almonds',                  [579,21,22,50,12,4,1],   [['handful (28g)',28]], 'nuts'],
  ['Cashews',                  [553,18,30,44,3.3,6,12], [['handful (28g)',28]], 'nuts'],
  ['Walnuts',                  [654,15,14,65,7,2.6,2],  [['handful (28g)',28]], 'nuts'],
  ['Mixed nuts',               [607,20,21,54,7,4,300],  [['handful (30g)',30]], 'nuts'],
  // Common / snacks
  ['Protein bar',              [350,30,40,10,5,20,200], [['1 bar (60g)',60]], ''],
  ['Honey',                    [304,0.3,82,0,0.2,82,4], [['1 tbsp (21g)',21]], ''],
  ['Sugar',                    [387,0,100,0,0,100,1],   [['1 tsp (4g)',4]], ''],
  ['Hummus',                   [166,8,14,10,6,0.4,379], [['2 tbsp (30g)',30],['100 g',100]], ''],
  ['Dark chocolate',           [546,5,61,31,7,48,24],   [['2 squares (20g)',20],['100 g',100]], ''],
  ['Milk chocolate',           [535,7.6,59,30,3.4,52,79],[['1 row (25g)',25],['100 g',100]], ''],
  ['Vegemite',                 [174,26,19,0,0,2,3400],  [['1 tsp (5g)',5]], 'spread'],
  ['Milo powder',              [400,8,79,4,3,44,180],   [['3 tsp (20g)',20]], ''],
];
function _buildCommonFood(row){
  const [name, m, portions, aliases] = row;
  const [cal,pro,carb,fat,fiber,sugar,sodium] = m;
  const per = g => ({
    cal: Math.round(cal*g/100),
    pro: Math.round(pro*g/100*10)/10,
    carb: Math.round(carb*g/100*10)/10,
    fat: Math.round(fat*g/100*10)/10,
    fiber: Math.round((fiber||0)*g/100*10)/10,
    sugar: Math.round((sugar||0)*g/100*10)/10,
    sodium: Math.round((sodium||0)*g/100)
  });
  let ports = portions.slice();
  if(!ports.some(p=>p[1]===100)) ports.push(['100 g',100]);
  const servings = ports.map(([label,g])=>Object.assign({name:label, gramsEquiv:g}, per(g)));
  return Object.assign({ name, brand:'', source:'Common', __generic:true, __local:true,
    __aliases:(aliases||''), servings }, per(portions[0][1]));
}
const COMMON_FOODS = COMMON_FOODS_RAW.map(_buildCommonFood);
// Instant, offline match. Returns up to `limit` foods, best first. No network.
function searchCommonFoods(query, limit){
  const ql = (query||'').toLowerCase().trim();
  if(!ql || ql.length<2) return [];
  const toks = ql.split(/\s+/).filter(Boolean);
  const scored = [];
  COMMON_FOODS.forEach(f=>{
    const nm = f.name.toLowerCase();
    const hay = nm + ' ' + (f.__aliases||'');
    const firstWord = nm.split(/[ ,]/)[0];
    let s = 0;
    if(nm === ql) s += 1000;
    else if(nm.startsWith(ql)) s += 700;
    else if(firstWord === ql) s += 500;
    else if(hay.includes(ql)) s += 350;
    if(toks.length>1 && toks.every(t=>hay.includes(t))) s += 300;
    if(s>0) scored.push({f,s});
  });
  return scored.sort((a,b)=>b.s-a.s).slice(0, limit||6).map(x=>x.f);
}
// One food-result row (tap to adjust portion, + to log instantly). Shared by the instant local pass
// and the full network render so they look and behave identically.
// Data-trust signal — the #1 long-term trust-killer across trackers is not knowing which numbers are
// real vs junk. A verified food DB gets a green ✓; an AI estimate gets a ≈ (with an invite to correct);
// community/other stays neutral. At-a-glance trust, consistently — MFP's green check but not flaky.
function _foodVerified(src){ return /USDA|Open Food Facts|FatSecret|Nutritionix|Common/i.test(src||''); }
function _foodSrcBadge(src){
  if(!src) return '';
  const s=String(src).replace(/</g,'&lt;');
  if(_foodVerified(src)) return '<span style="color:var(--gr)" title="From a verified food database">✓ '+s+'</span>';
  if(/\bAI\b/i.test(src)) return '<span style="color:var(--go)" title="AI estimate — tap to check or correct">≈ '+s+'</span>';
  return '<span style="color:var(--tx3)">'+s+'</span>';
}
function _makeFoodResultRow(food){
  const el=document.createElement('div'); el.className='food-result';
  el.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px';
  const tap=document.createElement('div');
  tap.style.cssText='flex:1;cursor:pointer;min-width:0';
  // Show the SAME serving the (+) logs and name it. The row used to print the bare per-100g figure
  // with no unit, so a 25g bar read "535 cal" and the person had no way to know what that number was of.
  const _rs = _quickServing(food);
  tap.innerHTML='<div class="fr-name">'+_escFew(food.name)+'</div>'+(food.brand?'<div class="fr-brand">'+_escFew(food.brand)+'</div>':'')+
    '<div class="fr-macros"><span class="fr-cal">'+_rs.cal+' cal</span><span>P: '+_rs.pro+'g</span><span>C: '+_rs.carb+'g</span><span>F: '+_rs.fat+'g</span>'+
    '<span style="color:var(--tx3)">'+_escFew(String(_rs.label))+'</span>'+_foodSrcBadge(food.source)+'</div>';
  tap.onclick=()=>openServingModal(food);
  el.appendChild(tap);
  // The floating help orb is fixed at right:14px, 54px wide, so it owns the column from 14px to 68px
  // in from the right edge on every screen. This button's right edge sat 35px in — inside that band —
  // so whichever result row happened to scroll under the orb had its "+" swallowed: tapping to log
  // lunch opened the Feeling Door instead, silently, with the food not added. Every row can be
  // scrolled clear, so it was never a permanently dead control, but a person does not know the orb is
  // there and has no reason to suspect the tap went somewhere else.
  //
  // 40px of right margin puts the "+" at 75px in, clear of the orb at any scroll position, and the
  // gutter reads as deliberate spacing rather than as a gap.
  const plus=document.createElement('button');
  plus.title='Log instantly';
  plus.style.cssText='background:var(--go);border:none;color:#1a1505;font-size:18px;font-weight:700;width:34px;height:34px;border-radius:8px;cursor:pointer;flex-shrink:0;line-height:1;margin-right:40px';
  plus.textContent='+';
  plus.onclick=(ev)=>{ ev.stopPropagation(); quickLogSearchFood(food); };
  el.appendChild(plus);
  return el;
}

// Type-ahead: MFP-style search-as-you-type. Instant local (common-food) matches on every keystroke —
// zero network, zero wait — then a debounced full search fills in the online long-tail. This is the
// difference between "type, hit Search, wait" and a logger that just feels alive under your fingers.
let _nutSearchTimer=null, _nutLastQuery='';
function nutSearchTypeahead(q){
  q=(q||'').trim();
  const res=document.getElementById('nut-search-results');
  if(_nutSearchTimer){ clearTimeout(_nutSearchTimer); _nutSearchTimer=null; }
  if(q.length<2){ if(res) res.innerHTML=''; _nutLastQuery=''; return; }
  // Instant local matches right now (0ms) so the staple you want is tappable before you finish typing.
  if(res && typeof searchCommonFoods==='function' && typeof _makeFoodResultRow==='function'){
    try{
      const local=searchCommonFoods(q);
      if(local.length){
        res.innerHTML='';
        local.forEach(f=>res.appendChild(_makeFoodResultRow(f)));
        const m=document.createElement('div'); m.className='pulsing';
        m.style.cssText='font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-align:center;padding:8px';
        m.textContent='finding more…';
        res.appendChild(m);
      }
    }catch(_){}
  }
  // Barcodes go through the scan button or Enter — don't fire a lookup mid-type.
  if(/^\d+$/.test(q.replace(/\s+/g,''))) return;
  // Debounce the networked full search so we don't hit the food APIs on every keystroke.
  _nutSearchTimer=setTimeout(()=>{ _nutLastQuery=q; try{ searchFood(q); }catch(_){} }, 400);
}

async function searchFood(query){
  if(!query.trim())return;
  
  // If it's all digits 6-14 chars, treat as a barcode
  const trimmed = query.trim().replace(/\s+/g, '');
  if(/^\d{6,14}$/.test(trimmed)){
    lookupBarcode(trimmed);
    return;
  }
  
  const res=document.getElementById('nut-search-results');
  // The search path had the same bare pulsing line as the estimate did — no elapsed time, no way out —
  // and this is the one he hits FIRST. Four databases are queried at once; on two bars all four can be
  // slow together, and a person watching a motionless italic line concludes the app is broken. Same
  // designed wait everywhere: it is on screen, it counts, and logging the meal himself is one tap.
  foodWorking(res, 'Looking for \u201c' + String(query||'').slice(0,32) + '\u201d\u2026');
  // INSTANT: curated common foods match with zero network, so the staple you want appears immediately
  // — tap it now, or wait a beat for the online long-tail to fill in below.
  const localMatches = searchCommonFoods(query);
  if(localMatches.length){
    res.innerHTML='';
    localMatches.forEach(f=>res.appendChild(_makeFoodResultRow(f)));
    const more=document.createElement('div');
    more.className='pulsing';
    more.style.cssText='font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-align:center;padding:10px';
    more.textContent='finding more options…';
    res.appendChild(more);
  }
  const ql = query.toLowerCase().trim();
  // SEARCH BROAD, RANK SPECIFIC. Sending "chicken breast skin off seasoned oven" verbatim makes the
  // databases return narrow oddities ("chicken breast roll") and miss the generic family entirely —
  // the entry someone actually wants ("breast, meat only, roasted") never even reaches the ranker.
  // So strip the prep/negation words for the LOOKUP to get the whole family back, then rank with
  // every word they typed (scoreFood below still uses the full query).
  const PREP_WORDS = /\b(skin\s*off|skinless|no\s+skin|without\s+skin|seasoned|unseasoned|oven|roasted|roast|baked|bake|grilled|grill|bbq|barbecue|chargrilled|boiled|boil|poached|steamed|fried|raw|cooked|fresh|homemade|plain|hot|cold)\b/g;
  const coreQuery = ql.replace(PREP_WORDS, ' ').replace(/\s+/g, ' ').trim() || ql;
  // allSettled, not all: if ONE food source is down/slow, we still show results from the others
  // instead of the whole search failing. Each rejected source just contributes nothing.
  // Cap each source so no single slow/cold/hanging DB stalls the whole search — this is what turned a
  // cold-start first search into a 12-second wait. A timed-out source contributes nothing instead of
  // blocking; the instant local matches are already on screen, so worst case is snappy, not broken.
  const _srcTimeout = (p, ms) => Promise.race([ Promise.resolve(p).catch(()=>[]), new Promise(r=>setTimeout(()=>r([]), ms)) ]);
  const _settled = await Promise.allSettled([searchUSDA(coreQuery), searchFatSecret(coreQuery), searchOFF(coreQuery), searchNutritionix(coreQuery)].map(p=>_srcTimeout(p, 3500)));
  const [usdaR, fsR, offR, nxR] = _settled.map(s => (s.status==='fulfilled' && Array.isArray(s.value)) ? s.value : []);
  // Personal custom foods match first — the user made these, they're most relevant
  const customMatches = (ls('totry_custom_foods')||[]).filter(f => f.name.toLowerCase().includes(ql));
  // Community foods contributed by other users. Verified (real online data) rank above estimates.
  // We only surface community items the live databases DIDN'T already return — no point showing a
  // community protein bar when USDA/OFF already has the real one (online verified beats community).
  const dbNorms = new Set();
  const sharedMatches = ((typeof getSharedFoods==='function') ? getSharedFoods() : [])
    .filter(f => (f.name||'').toLowerCase().includes(ql))
    .sort((a,b) => (b.verified?1:0) - (a.verified?1:0))
    .map(f => ({
      ...f, source:'Community',
      // Community foods store flat macros + a serving label. Give them a servings array so the
      // serving modal has something to select (otherwise the dropdown would be empty).
      servings: f.servings || [{ name: f.serving || '1 serving', cal: f.cal||0, pro: f.pro||0, carb: f.carb||0, fat: f.fat||0 }],
      per100: false
    }));
  // Pool every source, then RANK by relevance rather than just source order. The old approach
  // (USDA-first, no ranking) buried exact branded matches — e.g. searching "Nutella" surfaced
  // recipes containing Nutella before the jar itself. Australia-first: branded/international DBs
  // (OFF, FatSecret) are weighted up vs the US-centric USDA for branded queries.
  const pool = [...usdaR, ...fsR, ...offR, ...nxR];
  const scoreFood = (f) => {
    const name = (f.name||'').toLowerCase();
    const brand = (f.brand||'').toLowerCase();
    let s = 0;
    if(name === ql) s += 1000;                                   // exact name match
    else if(name.startsWith(ql)) s += 600;                       // starts with the query
    else if(new RegExp('\\b'+ql.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(name)) s += 400; // whole word
    else if(name.includes(ql)) s += 150;                         // contains
    if(brand.includes(ql)) s += 120;                             // brand matches (e.g. "Nutella" as brand)
    // MULTI-WORD queries matched NONE of the rules above — nothing is literally named "chicken breast
    // skin off seasoned oven" — so every result scored 0 on relevance and the list ranked by SOURCE
    // instead, burying the right whole food under random branded products. Score the individual
    // TERMS, and translate what people type into what the databases actually call it (someone says
    // "skin off" and "oven"; USDA says "meat only" and "roasted").
    const CONCEPTS = [
      { words:['skinless','skin','skinoff'], dbWords:['skinless','meat only','without skin','no skin'] },
      { words:['oven','roasted','roast','baked','bake'], dbWords:['roasted','baked','oven'] },
      { words:['grilled','grill','bbq','barbecue','chargrilled'], dbWords:['grilled','broiled'] },
      { words:['boiled','boil','poached','steamed'], dbWords:['boiled','poached','simmered','steamed'] },
      { words:['fried','pan'], dbWords:['fried'] },
      { words:['raw','fresh','uncooked'], dbWords:['raw'] },
      { words:['cooked'], dbWords:['cooked','roasted','grilled','boiled','baked'] }
    ];
    // "skin off" is a NEGATION — the word "skin" appears in the very thing being excluded, so naive
    // term matching scores "meat AND skin" exactly as high as "meat only". Handle the intent instead.
    const wantsSkinless = /\bskin\s*off\b|\bskinless\b|\bno skin\b|\bwithout skin\b/.test(ql);
    if(wantsSkinless){
      if(/meat only|skinless|without skin|no skin/.test(name)) s += 400;
      else if(/meat and skin|with skin/.test(name)) s -= 400;
    }
    let terms = ql.split(/\s+/).filter(t => t.length > 2);
    if(wantsSkinless) terms = terms.filter(t => t !== 'skin' && t !== 'off'); // handled above, don't double-count
    const nameHas = (t) => {
      if(name.includes(t) || brand.includes(t)) return true;
      const c = CONCEPTS.find(c => c.words.includes(t));
      return !!(c && c.dbWords.some(w => name.includes(w)));
    };
    if(terms.length > 1){
      let hit = 0;
      terms.forEach(t => { if(nameHas(t)) hit++; });
      s += hit * 120;                                            // every term they typed that lands
      if(hit === terms.length) s += 250;                         // all of it matched — almost certainly it
      else if(hit === 0) s -= 200;                               // nothing matched — get it out of the way
    }
    // Real whole foods are named descriptively — "Chicken, broilers or fryers, breast, meat only,
    // cooked, roasted" — so the phrase someone actually types ("chicken breast") NEVER appears in
    // them. They can't earn the exact/starts-with bonuses above, while a branded packet literally
    // named "CHICKEN BREAST" wins every time and buries the real food. When every word they typed
    // genuinely IS in the entry, let the actual food compete.
    if(f.__generic && terms.length && terms.every(nameHas)) s += 700;
    // Penalise recipe/multi-ingredient-looking results when the query is a single product word.
    const singleWord = !/\s/.test(ql);
    if(singleWord){
      if(/,|with |and | recipe| in /.test(name)) s -= 120;       // looks like a recipe/dish
      const wordCount = name.split(/\s+/).length;
      if(wordCount <= 3) s += 60;                                // short, clean product names
      if(wordCount >= 7) s -= 80;                                // long descriptive entries
    }
    // Australia-first nudge: prefer OFF/FatSecret (better AU + international branded coverage).
    if(f.source === 'Open Food Facts' || f.source === 'FatSecret') s += 25;
    if(f._au) s += 90;                                            // prefer Australian products (local brands, AU labels)
    return s;
  };
  pool.sort((a,b) => scoreFood(b) - scoreFood(a));
  // Searching "chicken breast" returned FIVE rows all literally named "CHICKEN BREAST" — the same
  // product from different sources/brands, which just wastes the whole list. Sorted best-first, so
  // keep the first of each name+brand and drop the rest.
  const _seenPool = new Set();
  const _nameCount = {};
  const pooled = pool.filter(f => {
    // Dedupe by normalized name + calorie bucket, NOT name+brand — supermarket "SALMON" entries from
    // different brands but identical macros are the same food to the user; showing them all reads as
    // broken. Same name + same calories collapses; genuinely different macros survive.
    const nm = (f.name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const k = nm + '|' + Math.round((Number(f.cal)||0)/10);
    if(_seenPool.has(k)) return false;
    _seenPool.add(k);
    // And cap any one generic name (e.g. four "SALMON") at 2 rows — beyond that is just clutter.
    // Pool is sorted best-first, so the kept two are the most relevant.
    _nameCount[nm] = (_nameCount[nm]||0) + 1;
    if(_nameCount[nm] > 2) return false;
    return true;
  });
  pool.length = 0; pool.push(...pooled);
  // Online/database results are authoritative — collect their normalized names so we can drop any
  // community entry that duplicates one (no double-ups; verified online data wins over community).
  pool.forEach(f => { try{ dbNorms.add(_normLibName(f.name)); }catch(_){} });
  // Curated common foods (instant, at the top) already cover these staples — drop any DB/community/
  // custom duplicate so nothing shows twice. Order: your custom foods → common foods → community → online.
  const _norm = s => { try{ return _normLibName(s); }catch(_){ return (s||'').toLowerCase().trim(); } };
  const customNorms = new Set(customMatches.map(f=>_norm(f.name)));
  const localMatchesF = localMatches.filter(f=>!customNorms.has(_norm(f.name)));
  const localNorms = new Set(localMatchesF.map(f=>_norm(f.name)));
  const poolFiltered = pool.filter(f=>!localNorms.has(_norm(f.name)));
  const sharedFiltered = sharedMatches.filter(f => { const n=_norm(f.name); return !dbNorms.has(n) && !localNorms.has(n); });
  const all = [...customMatches, ...localMatchesF, ...sharedFiltered, ...poolFiltered].slice(0, 22);
  res.innerHTML='';

  // If NO database results came back, the web lookup is the best path — it finds real branded
  // products (incl. multi-word names like "Woolworths Pain Au Chocolate") that our DBs miss. Show
  // it FIRST and always, then AI-estimate as a secondary option. (Previously this was wrongly gated
  // behind !looksLikeMeal, so multi-word product searches showed nothing useful.)
  if(!all.length){
    const webCard=document.createElement('div');
    webCard.className='food-result';
    webCard.style.cssText='border:1px solid var(--go-bd);background:var(--go-bg)';
    webCard.innerHTML='<div class="fr-name" style="color:var(--go)">🔎 Search the web for "'+query+'"</div><div class="fr-brand">Find the real product nutrition online (best for branded items).</div>';
    webCard.onclick=()=>searchFoodOnline(query);
    res.appendChild(webCard);
    const aiCard=document.createElement('div');
    aiCard.className='food-result';
    aiCard.style.cssText='margin-top:8px';
    aiCard.innerHTML='<div class="fr-name">✨ Or estimate with AI</div><div class="fr-brand">Quick estimate from the description.</div>';
    aiCard.onclick=()=>estimateMealMacros(query);
    res.appendChild(aiCard);
    // BOTH OF THOSE NEED A CONNECTION. Offline they are two buttons that cannot work, on a dead end.
    // Making a custom food is entirely local, so it belongs here — first, when there is no signal.
    const ownCard=document.createElement('div');
    ownCard.className='food-result';
    ownCard.style.cssText='margin-top:8px';
    const _off = (typeof navigator!=='undefined' && navigator.onLine === false);
    ownCard.innerHTML='<div class="fr-name">\u270f\ufe0f Create it yourself</div><div class="fr-brand">' +
      (_off ? 'You are offline \u2014 the two above need a connection. This one does not.' : 'Type the numbers off the packet. Saved for next time.') + '</div>';
    ownCard.onclick=()=>{ if(typeof openCustomFoodCreator==='function') openCustomFoodCreator(query); };
    if(_off) res.insertBefore(ownCard, res.firstChild); else res.appendChild(ownCard);
    return;
  }

  // "Gyros open plate" is three words, so this fired, and a GOLD-bordered "Estimate with AI" card was
  // placed ABOVE the real database rows — the least reliable path in the app, dressed as the best one.
  // He tapped it, because it looked like the answer, and waited. USDA, FatSecret, Open Food Facts and
  // Nutritionix had already answered underneath it, instantly and without a model.
  //
  // The AI estimate is genuinely the right tool for a described plate no database holds. It is not the
  // right tool when four databases just returned the food. So it goes where it belongs: first and
  // prominent when nothing was found (the branch above), last and quiet when something was.
  const looksLikeMeal=/\b(and|with|plus|,)\b/.test(query.toLowerCase()) || query.trim().split(/\s+/).length>=3;
  let _aiCard = null;
  if(looksLikeMeal){
    _aiCard = document.createElement('div');
    _aiCard.className='food-result';
    _aiCard.style.cssText='margin-top:10px;border:1px dashed var(--bd);background:transparent';
    _aiCard.innerHTML='<div class="fr-name" style="color:var(--tx2)">\u2728 None of these? Estimate it instead</div>' +
      '<div class="fr-brand">I will work out "' + _escFew(query.length>34?query.slice(0,33)+'\u2026':query) + '" from the description.</div>';
    _aiCard.onclick=()=>estimateMealMacros(query);
  }

  
  // MFP's signature: tap the row to adjust portion, (+) to log instantly at the default serving.
  all.forEach((food)=>{ res.appendChild(_makeFoodResultRow(food)); });
  
  // After the real rows, before making one from scratch: a real match should be what the eye lands
  // on first, and estimating a described plate is the likelier next want than typing a label out.
  if(_aiCard) res.appendChild(_aiCard);

  // Always offer custom food creation at the end — for foods in no database (homemade, regional, supplements)
  const customBtn=document.createElement('button');
  customBtn.className='btn';
  customBtn.style.cssText='margin-top:8px;background:transparent;border:1px dashed var(--bd2);color:var(--tx2);font-size:12px';
  customBtn.textContent='+ Create a custom food';
  customBtn.onclick=()=>openCustomFoodCreator(query);
  res.appendChild(customBtn);

}

// ── CUSTOM FOOD CREATION ──────────────────────────────────────
// For foods in no database — homemade meals, regional dishes, specific supplements.
// Saved to a personal library (totry_custom_foods) so they're reusable.
function openCustomFoodCreator(prefillName){
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:90vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:6px">Create a custom food</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px;line-height:1.5">Enter the nutrition per serving. It saves to your foods so you can log it again anytime.</p>' +
    '<div class="eyebrow">Name</div>' +
    '<input type="text" id="cf-name" placeholder="e.g. Mum\'s chicken curry" value="' + (prefillName ? prefillName.replace(/"/g,'&quot;') : '') + '" style="margin-bottom:12px">' +
    '<div class="eyebrow">Serving description</div>' +
    '<input type="text" id="cf-serving" placeholder="e.g. 1 bowl, 1 scoop, 100g" style="margin-bottom:12px">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
      '<div><div class="eyebrow">Calories</div><input type="number" id="cf-cal" inputmode="numeric" placeholder="0"></div>' +
      '<div><div class="eyebrow">Protein (g)</div><input type="number" id="cf-pro" inputmode="decimal" placeholder="0"></div>' +
      '<div><div class="eyebrow">Carbs (g)</div><input type="number" id="cf-carb" inputmode="decimal" placeholder="0"></div>' +
      '<div><div class="eyebrow">Fat (g)</div><input type="number" id="cf-fat" inputmode="decimal" placeholder="0"></div>' +
    '</div>' +
    '<label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:12px;color:var(--tx3);cursor:pointer">' +
      '<input type="checkbox" id="cf-save-library" checked style="width:auto;margin:0"> Save to my foods for next time' +
    '</label>' +
    '<button class="btn primary" onclick="saveCustomFood()" style="margin-bottom:8px">Add to today</button>' +
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:1px solid var(--bd)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
  setTimeout(()=>document.getElementById(prefillName?'cf-serving':'cf-name')?.focus(),80);
}
function saveCustomFood(){
  const name=(document.getElementById('cf-name')?.value||'').trim();
  const cal=parseInt(document.getElementById('cf-cal')?.value||0);
  if(!name){ showToast('Name it','Give your food a name.'); return; }
  if(cal<=0){ showToast('Add calories','At least enter the calories.'); return; }
  const food={
    name: name,
    brand: 'My foods',
    serving: (document.getElementById('cf-serving')?.value||'1 serving').trim(),
    cal: cal,
    pro: parseFloat(document.getElementById('cf-pro')?.value||0),
    carb: parseFloat(document.getElementById('cf-carb')?.value||0),
    fat: parseFloat(document.getElementById('cf-fat')?.value||0),
    source: 'Custom'
  };
  // Save to personal library if requested
  if(document.getElementById('cf-save-library')?.checked){
    const lib=ls('totry_custom_foods')||[];
    if(!lib.find(f=>f.name.toLowerCase()===food.name.toLowerCase())){
      lib.unshift(food);
      ls('totry_custom_foods',lib.slice(0,200));
    }
  }
  document.querySelector('.modal-bg.open')?.remove();
  // Log it straight to today via the serving modal (so quantity can be adjusted)
  if(typeof openServingModal==='function'){
    openServingModal({...food, servings:[{name:food.serving,cal:food.cal,pro:food.pro,carb:food.carb,fat:food.fat}]});
  }
}

// AI estimates macros for a described meal, the way a nutrition coach would
// Downscale a photo on-device before sending to AI: full-size phone photos (3–12MB, often
// HEIC) blow past request limits and time out. ≤1280px JPEG is plenty for food/barcode reading,
// uploads in a second, and normalises HEIC → JPEG so every provider accepts it.
function downscaleImage(file, maxDim, quality){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try{
        let w = img.naturalWidth, h = img.naturalHeight;
        const scale = Math.min(1, (maxDim||1280) / Math.max(w, h));
        w = Math.round(w*scale); h = Math.round(h*scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality||0.8));
      }catch(e){ URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

// ── AI MEAL PHOTO (beats Cal AI — our Coach IS Claude) ──
// Snap a photo of your plate; Claude identifies the foods and estimates macros for the whole meal.
async function handleMealPhoto(event){
  const file = event.target.files?.[0];
  event.target.value = '';
  if(!file) return;
  if(!file.type.startsWith('image/')){ showToast('Wrong file','Please choose a photo of your meal.'); return; }
  const res = document.getElementById('nut-search-results');
      foodWorking(res, 'Looking at your plate\u2026');
  let dataUrl;
  try{
    dataUrl = await downscaleImage(file, 1280, 0.8);
  }catch(e){
          foodFailed(res, 'The photo did not get through.',
        'The connection dropped it. Try again, or add the meal yourself \u2014 it still counts.',
        'document.getElementById(\'meal-photo-input\')&&document.getElementById(\'meal-photo-input\').click()',
        'foodTypeItInstead()', 'Type what it was');
    return;
  }
  const base64 = dataUrl.split(',')[1];
  const mime = 'image/jpeg';
  try{
      const prompt = 'This is a photo of a meal. Identify EACH distinct food/component SEPARATELY and estimate each one\'s nutrition for the portion actually shown — reason about portion size from visual cues (plate size, utensils, a hand). IMPORTANT: account for realistic cooking fats — oil, butter, dressings, sauces — even when they are not directly visible; these are the #1 reason photo calorie estimates run ~30% too low, so do NOT underestimate fat or portion size (lean toward realistic-to-generous, not optimistic). Return ONLY this JSON, no markdown: {"meal":"short overall name for the meal","items":[{"food":"one item\'s name","portion":"estimated portion, e.g. ~180g or 1 cup","cal":number,"pro":number,"carb":number,"fat":number}],"assumptions":"1 short sentence on what you assumed, incl. any hidden fat you added","confidence":"high|medium|low"}. List 1 to 8 items. If this is not food, return {"error":"no food"}.';
      const {data, error} = await Promise.race([
        sb.functions.invoke('ai-proxy', { body:{ action:'vision', prompt, image_base64:base64, image_mime:mime, max_tokens:500 } }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out')), 18000))
      ]).catch(e => ({ error:e }));
      if(error || !data?.text){
              foodFailed(res, 'The photo did not get through.',
        'The connection dropped it. Try again, or add the meal yourself \u2014 it still counts.',
        'document.getElementById(\'meal-photo-input\')&&document.getElementById(\'meal-photo-input\').click()',
        'foodTypeItInstead()', 'Type what it was');
        return;
      }
      const mm = data.text.match(/\{[\s\S]*\}/);
      const parsed = mm ? JSON.parse(mm[0]) : null;
      if(!parsed || parsed.error){
      foodFailed(res, 'That did not look like food to me.',
        'Try again with the plate filling more of the frame, or add it yourself.',
        'document.getElementById(\'meal-photo-input\')&&document.getElementById(\'meal-photo-input\').click()',
        'foodTypeItInstead()', 'Type what it was');
        return;
      }
      // Per-item beats Cal AI's single blob: each detected food is separately adjustable and removable,
      // so a wrong rice estimate doesn't force you to redo the whole plate. Handle both the new items[]
      // shape and the old single-macro shape (graceful if the model returns the older format).
      let _items = Array.isArray(parsed.items) ? parsed.items : null;
      if(!_items && parsed.cal!=null){ _items = [{ food: parsed.name||'Meal', portion:'as served', cal:parsed.cal, pro:parsed.pro, carb:parsed.carb, fat:parsed.fat }]; }
      _items = (_items||[]).filter(it=>it && (it.food||it.name)).map(it=>({ food:String(it.food||it.name||'Item'), portion:String(it.portion||''), cal:Number(it.cal)||0, pro:Number(it.pro)||0, carb:Number(it.carb)||0, fat:Number(it.fat)||0, mult:1 }));
            if(!_items.length){ foodFailed(res, 'I could not make out the food in that photo.',
        'A clearer, closer shot usually does it \u2014 or add the meal yourself.',
        'document.getElementById(\'meal-photo-input\')&&document.getElementById(\'meal-photo-input\').click()',
        'foodTypeItInstead()', 'Type what it was'); return; }
      _photoMeal = { name: parsed.meal||parsed.name||'Your meal', items:_items, assumptions:parsed.assumptions||'', confidence:parsed.confidence||'', meal:(typeof currentMealSlot==='function'?currentMealSlot():null) };
      _renderPhotoMeal();
    }catch(err){
      console.error('meal photo failed', err);
            foodFailed(res, 'The photo did not get through.',
        'The connection dropped it. Try again, or add the meal yourself \u2014 it still counts.',
        'document.getElementById(\'meal-photo-input\')&&document.getElementById(\'meal-photo-input\').click()',
        'foodTypeItInstead()', 'Type what it was');
    }
}

// ── PHOTO MEAL — per-item, editable (beats Cal AI's single-blob) ──────────────────────────────────
// The AI returns each food on the plate separately. Every item is adjustable (− / + scales just that
// item) and removable, with a live total, a meal slot, and honest confidence — then logs as real,
// separate diary items. Cal AI guesses a blob and charges you; this is per-item, correctable, and free.
let _photoMeal = null;
function _pmTotals(){ return (_photoMeal?_photoMeal.items:[]).reduce((a,it)=>{ const m=it.mult||1; a.cal+=it.cal*m; a.pro+=it.pro*m; a.carb+=it.carb*m; a.fat+=it.fat*m; return a; },{cal:0,pro:0,carb:0,fat:0}); }
function _renderPhotoMeal(){
  const res=document.getElementById('nut-search-results'); if(!res||!_photoMeal) return;
  const pm=_photoMeal, R=n=>Math.round(n), esc=s=>String(s).replace(/</g,'&lt;');
  const tot=_pmTotals();
  const confCol = pm.confidence==='high'?'var(--gr)':pm.confidence==='low'?'var(--re)':'var(--go)';
  const sel = pm.meal || (typeof currentMealSlot==='function'?currentMealSlot():'dinner');
  const rows = pm.items.map((it,i)=>{
    const m=it.mult||1;
    if(pm._editing===i){
      // Edit mode — the thing Cal AI won't let you do: correct WHAT it is AND the numbers.
      return ''+
      '<div style="padding:10px 0;border-top:1px solid var(--bd)">'+
        '<input id="pm-e-name" value="'+esc(it.food)+'" placeholder="What is it?" autocomplete="off" style="width:100%;box-sizing:border-box;margin-bottom:6px;font-size:16px;padding:9px">'+
        '<div style="display:flex;gap:6px;margin-bottom:6px">'+
          '<input id="pm-e-cal" type="number" inputmode="numeric" value="'+R(it.cal*m)+'" placeholder="cal" style="flex:1.3;min-width:0;padding:9px;font-size:16px">'+
          '<input id="pm-e-pro" type="number" inputmode="numeric" value="'+R(it.pro*m)+'" placeholder="P" style="flex:1;min-width:0;padding:9px;font-size:16px">'+
          '<input id="pm-e-carb" type="number" inputmode="numeric" value="'+R(it.carb*m)+'" placeholder="C" style="flex:1;min-width:0;padding:9px;font-size:16px">'+
          '<input id="pm-e-fat" type="number" inputmode="numeric" value="'+R(it.fat*m)+'" placeholder="F" style="flex:1;min-width:0;padding:9px;font-size:16px">'+
        '</div>'+
        '<div style="display:flex;gap:6px">'+
          '<button onclick="_pmSaveEdit('+i+')" class="btn primary" style="flex:1;padding:9px;font-size:12px;margin:0">Save</button>'+
          '<button onclick="_pmCancelEdit()" class="btn" style="flex:1;padding:9px;font-size:12px;margin:0;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)">Cancel</button>'+
        '</div>'+
      '</div>';
    }
    return ''+
    '<div style="display:flex;align-items:center;gap:5px;padding:9px 0;border-top:1px solid var(--bd)">'+
      '<div style="flex:1;min-width:0;cursor:pointer" onclick="_pmEdit('+i+')">'+
        '<div style="font-size:13px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(it.food||'Tap to name')+'</div>'+
        '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">'+R(it.cal*m)+' cal · P'+R(it.pro*m)+' C'+R(it.carb*m)+' F'+R(it.fat*m)+(it.portion?' · '+esc(it.portion):'')+(m!==1?' ×'+m:'')+'</div>'+
      '</div>'+
      '<button onclick="_pmEdit('+i+')" aria-label="edit" title="Fix what it is / the numbers" style="width:30px;height:30px;border-radius:7px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:13px;cursor:pointer;flex-shrink:0">✎</button>'+
      '<button onclick="_pmAdj('+i+',-0.25)" aria-label="less" style="width:30px;height:30px;border-radius:7px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:17px;cursor:pointer;flex-shrink:0">−</button>'+
      '<button onclick="_pmAdj('+i+',0.25)" aria-label="more" style="width:30px;height:30px;border-radius:7px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:17px;cursor:pointer;flex-shrink:0">+</button>'+
      '<button onclick="_pmRemove('+i+')" aria-label="remove" style="width:28px;height:30px;border-radius:7px;background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer;flex-shrink:0">×</button>'+
    '</div>'; }).join('');
  const meals=[['breakfast','🌅','Breakfast'],['lunch','☀️','Lunch'],['dinner','🌙','Dinner'],['snack','🍎','Snack']];
  _foodWaitStop();
  res.innerHTML =
    '<div style="border:1px solid var(--go-bd);border-radius:14px;padding:14px;background:var(--bg2)">'+
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:2px">'+
        '<div style="font-family:Cormorant Garamond,serif;font-size:19px;color:var(--tx);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📸 '+esc(pm.name)+'</div>'+
        (pm.confidence?'<div style="font-family:DM Mono,monospace;font-size:9px;color:'+confCol+';text-transform:uppercase;letter-spacing:0.08em;flex-shrink:0">'+esc(pm.confidence)+' confidence</div>':'')+
      '</div>'+
      (pm.assumptions?'<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-bottom:6px">'+esc(pm.assumptions)+'</div>':'')+
      rows+
      // Add a missed item + the hidden-fat one-tap. Photo AI runs ~30% low mainly because cooking oil,
      // butter and dressings are invisible in a 2D image — one tap puts that back. Nobody else does this.
      '<div style="display:flex;gap:6px;margin-top:8px">'+
        '<button onclick="_pmAddItem()" style="flex:1;padding:8px;border-radius:8px;background:var(--bg3);border:1px dashed var(--bd);color:var(--tx2);font-size:11.5px;cursor:pointer">＋ Add an item</button>'+
        '<button onclick="_pmAddFat()" title="Cooking oil, butter and dressings don\'t show in a photo — this is why AI apps read low" style="flex:1;padding:8px;border-radius:8px;background:var(--bg3);border:1px dashed var(--bd);color:var(--tx2);font-size:11.5px;cursor:pointer">＋ Hidden fat</button>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;align-items:center;border-top:2px solid var(--bd);margin-top:10px;padding-top:10px">'+
        '<div style="font-size:13px;color:var(--tx);font-weight:600">Total</div>'+
        '<div style="font-family:DM Mono,monospace;font-size:13px;color:var(--go)">'+R(tot.cal)+' cal · P'+R(tot.pro)+' C'+R(tot.carb)+' F'+R(tot.fat)+'</div>'+
      '</div>'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin:12px 0 6px">Add to</div>'+
      '<div style="display:flex;gap:6px;margin-bottom:10px">'+
        meals.map(mm=>'<button onclick="_pmMeal(\''+mm[0]+'\')" style="flex:1;padding:8px 2px;border-radius:8px;border:1px solid '+(sel===mm[0]?'var(--go)':'var(--bd)')+';background:'+(sel===mm[0]?'var(--go)':'var(--bg3)')+';color:'+(sel===mm[0]?'#1a1505':'var(--tx2)')+';font-size:11px;cursor:pointer">'+mm[1]+' '+mm[2]+'</button>').join('')+
      '</div>'+
      '<button class="btn primary" onclick="_pmLog()">Add '+pm.items.length+' item'+(pm.items.length===1?'':'s')+' to log</button>'+
      // Save the CORRECTED meal so re-logging is identical forever — the consistency Cal AI can\'t give
      // you (it re-scans to a different number every time). Fix it once; it sticks.
      '<button class="btn" onclick="_pmSave()" style="margin-top:6px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12px">💾 Save this meal · re-log it identically</button>'+
      '<div style="font-size:11px;color:var(--tx3);text-align:center;padding:8px 0 0;line-height:1.5">Tap any item to fix <b style="color:var(--tx2)">what it is</b> or its numbers. Heads up — photo estimates tend to read <b style="color:var(--tx2)">low</b> on hidden fats, so round up if in doubt.</div>'+
    '</div>';
}
function _pmAdj(i,d){ if(!_photoMeal||!_photoMeal.items[i])return; const it=_photoMeal.items[i]; it.mult=Math.max(0.25, Math.round(((it.mult||1)+d)*4)/4); _renderPhotoMeal(); }
function _pmRemove(i){ if(!_photoMeal)return; if(_photoMeal._editing===i) _photoMeal._editing=null; else if(_photoMeal._editing>i) _photoMeal._editing--; _photoMeal.items.splice(i,1); if(!_photoMeal.items.length){ _photoMeal=null; const res=document.getElementById('nut-search-results'); if(res) res.innerHTML='<p class="empty-note">No items left — snap again or search.</p>'; return; } _renderPhotoMeal(); }
function _pmMeal(m){ if(!_photoMeal)return; _photoMeal.meal=m; _renderPhotoMeal(); }
// Correct WHAT the item is + its macros — the fix Cal AI locks you out of (it hands you one guess).
function _pmEdit(i){ if(!_photoMeal||!_photoMeal.items[i])return; _photoMeal._editing=i; _renderPhotoMeal(); setTimeout(()=>{ const el=document.getElementById('pm-e-name'); if(el){ try{ el.focus(); if(el.value) el.select(); }catch(_){} } }, 40); }
function _pmSaveEdit(i){
  if(!_photoMeal||!_photoMeal.items[i])return;
  const num=id=>{ const el=document.getElementById(id); const v=parseFloat(el&&el.value); return (isNaN(v)||v<0)?0:v; };
  const name=((document.getElementById('pm-e-name')||{}).value||'').trim();
  const it=_photoMeal.items[i];
  it.food = name || it.food || 'Item';
  it.cal=num('pm-e-cal'); it.pro=num('pm-e-pro'); it.carb=num('pm-e-carb'); it.fat=num('pm-e-fat');
  it.mult=1; it.portion=it.portion||'as entered'; it.__edited=true;
  _photoMeal._editing=null;
  if(typeof haptic==='function') haptic('tap');
  _renderPhotoMeal();
}
function _pmCancelEdit(){
  if(!_photoMeal)return;
  const idx=_photoMeal._editing; _photoMeal._editing=null;
  // A freshly-added blank item that was cancelled shouldn't linger.
  if(idx!=null && _photoMeal.items[idx] && !String(_photoMeal.items[idx].food).trim() && !_photoMeal.items[idx].cal){ _photoMeal.items.splice(idx,1); }
  if(!_photoMeal.items.length){ _photoMeal=null; const res=document.getElementById('nut-search-results'); if(res) res.innerHTML=''; return; }
  _renderPhotoMeal();
}
function _pmAddItem(){ if(!_photoMeal)return; _photoMeal.items.push({food:'',portion:'',cal:0,pro:0,carb:0,fat:0,mult:1}); _pmEdit(_photoMeal.items.length-1); }
function _pmAddFat(){ if(!_photoMeal)return; _photoMeal.items.push({food:'Cooking oil / hidden fat',portion:'~1 tbsp',cal:120,pro:0,carb:0,fat:14,mult:1}); if(typeof haptic==='function') haptic('tap'); _renderPhotoMeal(); }
// Save the corrected photo meal into My Meals (same schema as saveMealGroup) so it re-logs identically
// forever — Cal AI re-scans to a different number each time; a saved meal is one truth, one tap.
async function _pmSave(){
  if(!_photoMeal||!_photoMeal.items.length) return;
  const items=_photoMeal.items.filter(it=>it && (String(it.food).trim() || it.cal));
  if(!items.length){ if(typeof showToast==='function') showToast('Nothing to save','Name or add an item first.'); return; }
  const R=n=>Math.round(n);
  const name=await askText('Save this meal', 'Give it a name and you can re-log it identically any time.', {value:_photoMeal.name||'My meal', confirmLabel:'Save meal'});
  if(!name || !name.trim()) return;
  const saved=ls('totry_saved_meals')||[];
  saved.unshift({ id:Date.now(), name:name.trim(),
    items: items.map(it=>{ const m=it.mult||1; return { name:it.food||'Item', brand:'', serving:(it.portion||'1 serving')+(m!==1?' ×'+m:''), qty:1, cal:R(it.cal*m), pro:R(it.pro*m), carb:R(it.carb*m), fat:R(it.fat*m), source:'AI photo' }; }) });
  ls('totry_saved_meals', saved.slice(0,30));
  if(typeof haptic==='function') haptic('success');
  if(typeof showToast==='function') showToast('Meal saved ✓', name.trim()+' — one tap to re-log it, same numbers, forever.');
  if(typeof renderSavedMeals==='function') renderSavedMeals();
}
function _pmLog(){
  if(!_photoMeal||!_photoMeal.items.length) return;
  const items=_photoMeal.items.filter(it=>it && (String(it.food).trim() || it.cal));
  if(!items.length){ if(typeof showToast==='function') showToast('Nothing to log','Name or add an item first.'); return; }
  const today=(typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU');
  const log=ls('totry_nutlog')||{}; if(!log[today]) log[today]=[];
  const meal=_photoMeal.meal||(typeof currentMealSlot==='function'?currentMealSlot():'dinner');
  const R=n=>Math.round(n);
  items.forEach(it=>{ const m=it.mult||1; log[today].push({ id:Date.now()+Math.floor(Math.random()*100000), name:it.food||'Item', brand:'', serving:(it.portion||'1 serving')+(m!==1?' ×'+m:''), qty:1, cal:R(it.cal*m), pro:R(it.pro*m), carb:R(it.carb*m), fat:R(it.fat*m), meal:meal, source:'AI photo', ts:(typeof nutStampFor==='function'?nutStampFor():new Date().toISOString()) }); });
  ls('totry_nutlog', log);
  const n=items.length; _photoMeal=null;
  if(typeof haptic==='function') haptic('success');
  if(typeof showToast==='function') showToast('Logged ✓', n+' item'+(n===1?'':'s')+' added to '+meal);
  const res=document.getElementById('nut-search-results'); if(res) res.innerHTML='';
  const si=document.getElementById('nut-search-in'); if(si) si.value='';
  if(typeof renderNutritionLog==='function') renderNutritionLog();
}

// ── WHY AM I EATING? — the root cause no mainstream calorie app touches ──────────────────────────
// Research (UCL 2025 + emotional-eating literature): every big tracker counts food but NEVER asks why
// you're eating, and their streaks/targets actively harm mental health. Emotional eating — stress,
// boredom, tiredness, not hunger — is the common root they all ignore. We already have the emotional
// engine (Feeling Door, breath, the Fight), so a calorie log can meet the FEELING, with grace, never
// shame, and never block the eating. Opt-in, never nags. Tags the pattern into self-knowledge.
const _HUNGER_REASONS = [
  { id:'hungry',   emoji:'😋', label:'Actually hungry' },
  { id:'stressed', emoji:'😤', label:'Stressed' },
  { id:'bored',    emoji:'😑', label:'Bored' },
  { id:'tired',    emoji:'😴', label:'Tired' },
  { id:'craving',  emoji:'🌊', label:'A craving' },
  { id:'sad',      emoji:'🌧️', label:'Low / down' },
  { id:'social',   emoji:'🥂', label:'Social / joy' },
  { id:'habit',    emoji:'💭', label:'Just habit' }
];
// PROACTIVE — meet the pattern BEFORE the snack, not only when they tap. Late-evening window (when
// emotional snacking peaks), only for people who've actually shown the pattern (2+ non-hunger checks),
// once per day, dismissible. This is the emotional-eating moat made present — never a nag.
function _emotionalEatCount(){ try{ return (ls('totry_hunger_log')||[]).filter(e=>e && e.id && e.id!=='hungry' && e.id!=='social').length; }catch(_){ return 0; } }
function _hungerCheckedToday(){ try{ const t=new Date().toLocaleDateString('en-AU'); return (ls('totry_hunger_log')||[]).some(e=>e && e.ts && new Date(e.ts).toLocaleDateString('en-AU')===t); }catch(_){ return false; } }
function _hungerNudgeGo(){ try{ ls('totry_hunger_nudge_day', new Date().toLocaleDateString('en-AU')); }catch(_){} openHungerCheck(); }
function _hungerNudgeDismiss(){ try{ ls('totry_hunger_nudge_day', new Date().toLocaleDateString('en-AU')); }catch(_){} const el=document.getElementById('nut-hunger-nudge'); if(el){ el.style.display='none'; el.innerHTML=''; } }
function renderHungerNudge(){
  const el=document.getElementById('nut-hunger-nudge'); if(!el) return;
  el.style.display='none'; el.innerHTML='';
  const h=new Date().getHours(); const today=new Date().toLocaleDateString('en-AU');
  if(h<20) return;                                  // late-snack window only
  if(_emotionalEatCount()<2) return;                // only once the pattern is real
  if(_hungerCheckedToday()) return;                 // already checked in today
  if(ls('totry_hunger_nudge_day')===today) return;  // once per day, and remembers a dismiss
  el.style.display='block';
  el.innerHTML='<div style="display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px solid var(--go-bd);border-radius:10px;padding:11px 13px;margin-bottom:12px">'+
    '<div style="font-size:20px;flex-shrink:0">🌙</div>'+
    '<div style="flex:1;font-size:12.5px;color:var(--tx2);line-height:1.5">Late-snack hour. Before you reach for it — hungry, or something else?</div>'+
    '<button onclick="_hungerNudgeGo()" style="flex-shrink:0;background:var(--go);border:none;color:#1a1505;border-radius:8px;padding:7px 11px;font-size:12px;font-weight:600;cursor:pointer">Check in</button>'+
    '<button onclick="_hungerNudgeDismiss()" aria-label="dismiss" style="flex-shrink:0;background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer;padding:2px;line-height:1">×</button>'+
  '</div>';
}
function openHungerCheck(){
  document.querySelectorAll('.modal-bg.open').forEach(x=>x.remove());
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center;max-height:90vh;overflow-y:auto">'+
    '<div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.25;margin-bottom:6px">Hungry — or something else?</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:16px">No wrong answer, no judgement. One honest second before you eat — the thing a calorie count can never tell you.</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
      _HUNGER_REASONS.map(r=>'<button onclick="_hungerPick(\''+r.id+'\')" style="display:flex;align-items:center;gap:9px;padding:13px;border-radius:11px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx);font-size:12.5px;cursor:pointer;text-align:left"><span style="font-size:19px;flex-shrink:0">'+r.emoji+'</span><span>'+r.label+'</span></button>').join('')+
    '</div>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:12px">Skip</button>'+
  '</div>';
  document.body.appendChild(m); if(typeof haptic==='function') haptic('tap');
}
function _hungerCount7(id){ try{ const wk=Date.now()-7*86400000; return (ls('totry_hunger_log')||[]).filter(e=>e && e.id===id && e.ts>=wk).length; }catch(_){ return 0; } }
function _hungerPick(id){
  try{ const log=ls('totry_hunger_log')||[]; log.unshift({id, ts:Date.now()}); ls('totry_hunger_log', log.slice(0,300)); if(typeof logEvent==='function') logEvent('hunger_check'); }catch(_){}
  document.querySelectorAll('.modal-bg.open').forEach(x=>x.remove());
  if(id==='hungry'){ if(typeof showToast==='function') showToast('Good','Real hunger — fuel up well.'); return; }
  if(id==='social'){ if(typeof showToast==='function') showToast('Enjoy it','Eating for joy, together, is part of a good life — be present.'); return; }
  const R={
    stressed:{t:'Stress, not hunger.', b:'Food quiets it for a minute — then the stress is still there. You’re allowed to eat. But a slow breath might be what you actually need.', move:'breath'},
    bored:{t:'Boredom, not hunger.', b:'The mouth just wants something to do. Water or a 2-minute move often scratches the same itch — no shame if you eat anyway.', move:'act'},
    tired:{t:'That’s tiredness.', b:'Low energy reads as hunger, and tired brains grab quick sugar. Rest or water first if you can — be gentle, you’re running low.', move:null},
    craving:{t:'A craving — a wave.', b:'It crests and passes whether you feed it or not. Want to ride it out first? Either way, no shame.', move:'feel'},
    sad:{t:'Eating the feeling.', b:'Comfort food is real comfort — for a moment. You’re allowed it. But if it’s heavy, a person helps more than a plate.', move:'feel'},
    habit:{t:'Habit, not hunger.', b:'Same time, same reach, not really hungry. Just naming it loosens its grip. Eat if you want — you’re awake to it now.', move:null}
  };
  const r=R[id]||R.habit;
  const n=_hungerCount7(id);
  const patternLine = n>=3 ? '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);letter-spacing:0.04em;margin-top:14px;line-height:1.5">That’s '+(n+1)+' times this week you’ve eaten for this, not hunger. Worth knowing — gently.</div>' : '';
  let moveBtn='';
  if(r.move==='feel') moveBtn='<button class="btn primary" onclick="closeModal(this);openFeelingDoor()" style="margin-bottom:8px">Sit with it first</button>';
  else if(r.move==='breath') moveBtn='<button class="btn primary" onclick="closeModal(this);openBreath(\'settle\',{reason:\'eating\'})" style="margin-bottom:8px">One slow breath first</button>';
  else if(r.move==='act') moveBtn='<button class="btn primary" onclick="closeModal(this)" style="margin-bottom:8px">Water / a 2-min move first</button>';
  const mm=document.createElement('div'); mm.className='modal-bg open'; mm.style.alignItems='center';
  mm.innerHTML='<div class="modal" style="text-align:center">'+
    '<div class="modal-handle"></div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);line-height:1.25;margin-bottom:10px">'+r.t+'</div>'+
    '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:18px">'+r.b+'</div>'+
    moveBtn+
    '<button class="btn" onclick="closeModal(this)" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:13px">Eat anyway — no shame</button>'+
    patternLine+
  '</div>';
  document.body.appendChild(mm); if(typeof haptic==='function') haptic('tap');
}

// ── WS-F: MEAL-PREP + GROCERY LIST ─────────────────────────────────
// AI builds a few days of meals around the user's cal/protein targets + budget/preferences,
// plus a consolidated shopping list. Saveable.
// openMealPlan() lived here — superseded by openFuelPlan(), which is what the Nourish tab's
// "Build my plan" button actually calls. Never referenced once.

// generateMealPlan() lived here — the AI half of the superseded openMealPlan. Its inputs
// (#mealplan-input/-btn/-out) only ever existed inside that modal. Unreferenced; openFuelPlan() is the
// live meal-planning path.


async function estimateMealMacros(description){
  const res=document.getElementById('nut-search-results');
  // Before the model sees it — see the note above. The gate every other free-text door already has.
  try{
    const _c = (typeof detectCrisis === 'function') ? detectCrisis(description) : null;
    if(_c){
      if(res) res.innerHTML = '';
      if(typeof showCrisisResponse === 'function') showCrisisResponse('nut-search-results', _c);
      return null;
    }
  }catch(_){ }
  foodWorking(res, 'Working out the macros for "'+String(description||'').slice(0,40)+'"\u2026');
  // Adaptive prompt: honor any quantities the user SPECIFIED (g, ml, count, cups, tbsp) exactly;
  // estimate standard portions ONLY for items left vague. Reason per-item for accuracy, then sum
  // into ONE clean meal entry. Flag which items were estimated vs taken as given.
  const prompt='A person is logging this — it may be a described meal OR a specific branded product (e.g. a protein powder, a snack bar, a supplement) that wasn\'t in the food database:\n\n"'+description+'"\n\n'+
    'If it names a SPECIFIC BRANDED PRODUCT, use your knowledge of that exact product\'s label (per its standard serving — e.g. one scoop for protein powder, one bar, one bottle). If you don\'t know the exact product, estimate from the closest typical product in that category and say so. '+
    'If it\'s a described MEAL, break it into component foods: for ANY item with a stated quantity use it EXACTLY; for vague items assume a normal serving. Then SUM into one entry.\n\n'+
    'Return ONLY this JSON, no markdown:\n'+
    '{"name":"short name","items":[{"food":"item name","amount":"e.g. 1 scoop / 200g","cal":number,"pro":number,"carb":number,"fat":number,"estimated":true_or_false}],'+
    '"total":{"cal":number,"pro":number,"carb":number,"fat":number,"fiber":number,"sugar":number,"sodium":number,"sat_fat":number},'+
    '"vague":true_or_false,'+
    '"note":"1 short sentence: exact product label used, or what you estimated from"}\n'+
    'estimated=false when the amount/product is known precisely, true when assumed. Set vague=true ONLY if too unspecific to estimate at all. Numbers only. sodium in mg. For a protein powder, anchor protein realistically (typically 20-27g per scoop).';
  try{
    const raw=await api('You are a precise nutrition coach. You convert real-world meal descriptions into accurate per-item macros, always respecting any amounts the user specified.',[],prompt,700,{timeout:15000});
    const m=raw.match(/\{[\s\S]*\}/);
    if(m){
      const meal=JSON.parse(m[0]);
      const t=meal.total||{};
      // Stash for the confirm/log step.
      window.__pendingMeal=meal;
      _foodWaitStop();
      setTimeout(function(){_foodReveal(res);},30);
      res.innerHTML='';
      const card=document.createElement('div');
      card.className='food-result';
      card.style.cssText='border:1px solid var(--go-bd);cursor:default';
      const itemsHtml=(meal.items||[]).map(it=>
        '<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;font-size:12px;border-bottom:1px solid var(--bd)">'+
          '<span style="color:var(--tx2)">'+(it.food||'item')+' <span style="color:var(--tx3)">'+(it.amount||'')+'</span>'+(it.estimated?' <span style="color:var(--go);font-size:9px">~est</span>':'')+'</span>'+
          '<span style="color:var(--tx3);font-family:DM Mono,monospace;font-size:10px;white-space:nowrap">'+Math.round(it.cal||0)+' cal</span>'+
        '</div>').join('');
      card.innerHTML='<div class="fr-name" style="margin-bottom:6px">'+(meal.name||description)+'</div>'+
        (itemsHtml?'<div style="margin:8px 0">'+itemsHtml+'</div>':'')+
        '<div class="fr-macros" style="margin-top:8px"><span class="fr-cal">'+Math.round(t.cal||0)+' cal</span><span>P: '+Math.round(t.pro||0)+'g</span><span>C: '+Math.round(t.carb||0)+'g</span><span>F: '+Math.round(t.fat||0)+'g</span></div>'+
        (meal.note?'<div class="fr-brand" style="margin-top:8px">'+meal.note+'</div>':'');
      res.appendChild(card);
      // If the AI judged the description too vague to be confident, be honest about it: we've given
      // the best estimate we can, but accuracy is capped by what they told us. Offer to refine OR log as-is.
      const itemsAllEstimated = (meal.items||[]).length>0 && meal.items.every(i=>i.estimated);
      const isVague = meal.vague === true || itemsAllEstimated;
      if(isVague){
        const vagueNote=document.createElement('div');
        vagueNote.style.cssText='margin-top:10px;padding:10px 12px;background:rgba(200,169,110,0.08);border:1px solid var(--go-bd);border-radius:8px;font-size:12px;color:var(--tx2);line-height:1.5';
        vagueNote.innerHTML='\u2728 This was a little vague, so these are estimates. For a more accurate entry, add amounts \u2014 e.g. <span style="color:var(--tx)">\u201c200g chicken, 1 cup rice\u201d</span> \u2014 and search again. Or log the estimate as-is.';
        res.appendChild(vagueNote);
        const refineBtn=document.createElement('button');
        refineBtn.className='btn';
        refineBtn.style.cssText='margin-top:8px;background:var(--bg3);border:1px solid var(--bd)';
        refineBtn.textContent='Refine my description';
        refineBtn.onclick=()=>{ const sIn=document.getElementById('nut-search-in'); if(sIn){ sIn.value=description; sIn.focus(); } res.innerHTML=''; };
        res.appendChild(refineBtn);
      }
      const logBtn=document.createElement('button');
      logBtn.className='btn primary';
      logBtn.style.cssText='margin-top:10px';
      logBtn.textContent='Log this meal · '+Math.round(t.cal||0)+' cal';
      logBtn.onclick=()=>logEstimatedMeal();
      res.appendChild(logBtn);
      const note=document.createElement('p');
      note.style.cssText='font-size:11px;color:var(--tx3);text-align:center;padding:10px;line-height:1.5';
      note.textContent='Logs as one combined entry. Items you gave amounts for are used as-is; vague items use normal servings.';
      res.appendChild(note);
      return;
    }
  }catch(e){
    // THIS WROTE TO THE CONSOLE AND LEFT "Working out the macros…" ON SCREEN FOREVER. Alfy stood in a
    // shop with a gyros open plate, typed it in, and watched a pulsing line for a minute and a half
    // before giving up — on 17% battery, Low Power Mode, two bars. api() has a 30s ceiling, so it had
    // already failed; nothing told him, and nothing gave him a way to log his lunch anyway.
    //
    // A failure a person can see and act on is worth more than a perfect estimate they never get. It
    // says what happened, offers the retry, and offers the manual path so the meal still gets logged.
    console.error('Meal estimate failed:', e);
    foodFailed(document.getElementById('nut-search-results'),
      'I could not work that one out.',
      'That is on me, not on you \u2014 the connection, or my end. Your lunch still counts.',
      'estimateMealMacros('+JSON.stringify(String(description||''))+')');
  }
  foodFailed(res, 'I could not work that one out.',
      'Try naming it more plainly \u2014 "chicken gyros plate, rice, salad" \u2014 or add it yourself.',
      'estimateMealMacros('+JSON.stringify(String(description||''))+')');
}
// Web-search food lookup: for products not in our databases (branded protein powders, local items).
// Uses the proxy's search-capable path (web_search flag) so it finds the REAL product nutrition
// online rather than guessing from memory. Falls back to a plain estimate if search returns nothing.
async function searchFoodOnline(query){
  // Same gate as estimateMealMacros — this reaches a model too.
  try{
    const _c = (typeof detectCrisis === 'function') ? detectCrisis(query) : null;
    if(_c){
      const _r = document.getElementById('nut-search-results');
      if(_r) _r.innerHTML = '';
      if(typeof showCrisisResponse === 'function') showCrisisResponse('nut-search-results', _c);
      return null;
    }
  }catch(_){ }
  const res=document.getElementById('nut-search-results');
  if(res) res.innerHTML='<p class="pulsing" style="font-family:\'Cormorant Garamond\',serif;font-size:15px;font-style:italic;color:var(--tx3);text-align:center;padding:16px">Searching the web for "'+query+'"...</p>';
  const prompt='Find the real nutrition facts for this specific food/product by searching the web: "'+query+'".\n'+
    'Prioritise AUSTRALIAN sources and products first (the user base is in Australia): the brand\u2019s AU site, Woolworths/Coles, FSANZ/AUSNUT, then broaden to other regions only if needed.\n'+
    'Use the actual product label. Give values for ONE standard serving (state what the serving is). '+
    'If you genuinely cannot find this exact product, use the closest real match and say so in note.\n\n'+
    'Return ONLY this JSON, no markdown:\n'+
    '{"name":"product name","brand":"brand if known","serving":"e.g. 1 scoop (30g) / 250ml","cal":number,"pro":number,"carb":number,"fat":number,"fiber":number,"sugar":number,"sodium":number,"found":true_or_false,"note":"where this came from"}\n'+
    'Numbers only, sodium in mg. found=false if you had to guess.';
  try{
    // web_search:true asks the proxy to enable its search-capable provider path for this call.
    const raw = await api('You are a nutrition lookup that searches the web for real product data and returns precise label values.', [], prompt, 700, { web_search:true, timeout:40000 });
    const m = raw && raw.match(/\{[\s\S]*\}/);
    if(m){
      const p = JSON.parse(m[0]);
      if(p && (p.cal || p.pro)){
        const food = {
          name: p.name || query,
          brand: (p.brand ? p.brand+' · ' : '') + 'web' + (p.found===false?' (closest match)':''),
          cal: Math.round(p.cal||0), pro: Math.round((p.pro||0)*10)/10,
          carb: Math.round((p.carb||0)*10)/10, fat: Math.round((p.fat||0)*10)/10,
          fiber: p.fiber||0, sugar: p.sugar||0, sodium: p.sodium||0,
          source: 'Web',
          servings: [{ name: p.serving || '1 serving', cal: Math.round(p.cal||0), pro: p.pro||0, carb: p.carb||0, fat: p.fat||0 }]
        };
        // Stash the verified web data so the serving modal can offer an opt-in "share" toggle.
        // Web-sourced = verified (real online label); we mark it so community trusts it over guesses.
        window.__lastWebFood = (p.found!==false) ? {
          name: (p.name||query), brand: p.brand||'', serving: p.serving||'1 serving',
          cal: Math.round(p.cal||0), pro: p.pro||0, carb: p.carb||0, fat: p.fat||0,
          fiber: p.fiber||0, sugar: p.sugar||0, sodium: p.sodium||0, per100: false, verified: true
        } : null;
        openServingModal(food);
        return;
      }
    }
  }catch(e){ console.warn('web food search failed', e); }
  // Fallback: plain estimate
  estimateMealMacros(query);
}
// Logs the pending estimated meal as ONE clean combined entry (with micros).
function logEstimatedMeal(){
  const meal=window.__pendingMeal;
  if(!meal){ showToast('Nothing to log','Describe a meal first.'); return; }
  const t=meal.total||{};
  const today=(typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU');
  const log=ls('totry_nutlog')||{};
  if(!log[today]) log[today]=[];
  log[today].push({
    id: Date.now(),
    ts: (typeof nutStampFor==='function' ? nutStampFor() : new Date().toISOString()),
    date: today,
    name: meal.name || 'Meal',
    serving: (meal.items||[]).map(i=>i.amount?(i.amount+' '+i.food):i.food).join(', ').slice(0,120) || '1 serving',
    qty: 1,
    cal: Math.round(t.cal||0),
    pro: Math.round((t.pro||0)*10)/10,
    carb: Math.round((t.carb||0)*10)/10,
    fat: Math.round((t.fat||0)*10)/10,
    fiber: Math.round((t.fiber||0)*10)/10,
    sugar: Math.round((t.sugar||0)*10)/10,
    sodium: Math.round(t.sodium||0),
    sat_fat: Math.round((t.sat_fat||0)*10)/10,
    source: 'AI estimate'
  });
  _pruneNutLog(log);
  ls('totry_nutlog', log);
  if(typeof syncToCloud==='function') syncToCloud();
  window.__pendingMeal=null;
  const sIn=document.getElementById('nut-search-in'); if(sIn) sIn.value='';
  const res=document.getElementById('nut-search-results'); if(res) res.innerHTML='';
  if(typeof renderNutritionLog==='function') renderNutritionLog();
  if(typeof autoTickHabits==='function') autoTickHabits();
  haptic('success'); showToast('Logged', (meal.name||'Meal') + ' · ' + Math.round(t.cal||0) + ' cal');
}

// ── BARCODE SCANNER ──────────────────────────────────────────
// THREE PATHS, best first: a real live camera scan in the native app; a photo read by AI vision
// anywhere; and typing the digits, which always works.
//
// The photo path is still the only one the web can offer. Its "fast path" tried BarcodeDetector with a
// comment claiming iOS Safari 17+ supported it — WebKit has never shipped the Shape Detection API, so on
// every iPhone that check was false and EVERY scan went to the AI: a network round trip, a paid call per
// scan, nothing at all offline, and worse accuracy than the decoder Apple has shipped in AVFoundation for
// a decade. That is why BarcodeScannerPlugin exists (AVCaptureMetadataOutput, on-device, no CocoaPods).
// Barcode scanning is the interaction people judge a food tracker by, so it should feel instant.
const LiveScan = {
  _p(){ try{ const P=(window.Capacitor&&window.Capacitor.Plugins)||{}; return P.BarcodeScanner || P.BarcodeScannerPlugin || null; }catch(_){ return null; } },
  async available(){
    const p=this._p(); if(!p) return false;
    try{
      const r = await p.isAvailable();
      // A denied permission is a dead end — offer the photo path instead of a black screen.
      return !!(r && r.available && r.permission !== 'denied' && r.permission !== 'restricted');
    }catch(_){ return false; }
  },
  // Digits on a successful read; null if they cancelled or it cannot run (the caller stays put).
  async scan(){
    const p=this._p(); if(!p) return null;
    try{
      const r = await p.scan();
      if(r && r.code) return String(r.code).replace(/\D/g,'');
      if(r && r.available === false && r.reason && typeof showToast==='function'){
        showToast('Camera unavailable', r.reason);
      }
      return null;                       // cancelled: say nothing, they chose
    }catch(e){ console.warn('[LiveScan] scan failed', e); return null; }
  }
};

async function startLiveBarcodeScan(){
  const code = await LiveScan.scan();
  if(!code) return;                      // cancelled or unavailable — the photo path is still on screen
  const st = document.getElementById('barcode-photo-status');
  if(st) st.innerHTML = '<span style="color:var(--gr)">Found ' + _escFew(code) + ' \u2014 looking it up\u2026</span>';
  if(typeof haptic==='function') haptic('success');
  lookupBarcode(code);
}
async function openBarcodeScanner(){
  const m = document.createElement('div');
  m.id = 'barcode-scanner-modal';   // so closeBarcodeScanner removes THIS sheet and not the caller's
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:8px">Scan a barcode</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:14px;line-height:1.5">Snap a photo of the product barcode (or pick one from your library). We\'ll read the number and look it up.</p>' +
    // capture="environment" hints the rear camera on phones; without it the OS shows Camera + Library
    // Revealed only when a live scan can really happen (native + camera + permission not denied), so it
    // is never a button that does nothing. Fails closed.
    '<button class="btn primary" id="barcode-live-btn" style="display:none;margin-bottom:8px" onclick="startLiveBarcodeScan()">\u2b1c Scan with camera</button>' +
    '<input type="file" id="barcode-photo-input" accept="image/*" capture="environment" style="display:none" onchange="readBarcodePhoto(event)">' +
    '<button class="btn primary" id="barcode-photo-btn" onclick="document.getElementById(\'barcode-photo-input\').click()" style="margin-bottom:8px">📷 Take / choose barcode photo</button>' +
    '<div id="barcode-photo-status" style="font-family:DM Mono,monospace;font-size:11px;color:var(--tx3);text-align:center;margin:6px 0;min-height:16px"></div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin:10px 0"><div style="flex:1;height:1px;background:var(--bd)"></div><span style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em">or type it</span><div style="flex:1;height:1px;background:var(--bd)"></div></div>' +
    '<input type="text" id="barcode-manual" placeholder="e.g. 5060337504331" inputmode="numeric" style="font-family:DM Mono,monospace;margin-bottom:10px">' +
    '<button class="btn" onclick="lookupBarcode(document.getElementById(\'barcode-manual\').value)" style="margin-bottom:8px;background:var(--bg3);border:1px solid var(--bd)">Look up number</button>' +
    '<button class="btn" onclick="closeBarcodeScanner()" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
  // Async, after the modal exists: reveal the live scanner and step the photo button down to secondary,
  // since photo-plus-AI is the fallback once a real scanner is available.
  try{
    LiveScan.available().then(function(ok){
      if(!ok) return;
      const b = document.getElementById('barcode-live-btn'); if(b) b.style.display='';
      const ph = document.getElementById('barcode-photo-btn');
      if(ph){ ph.className='btn'; ph.style.background='var(--bg3)'; ph.style.border='1px solid var(--bd)'; }
    });
  }catch(_){}
}

// Reads the barcode digits out of a photo using the AI vision model, then looks them up.
async function readBarcodePhoto(event){
  const file = event.target.files?.[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){ showToast('Wrong file', 'Please choose an image.'); return; }
  const statusEl = document.getElementById('barcode-photo-status');
  if(statusEl){ statusEl.innerHTML = '<span class="pulsing">Reading barcode...</span>'; }

  // Normalise ANY image (HEIC, webp, huge photos) to a canvas bitmap first. This guarantees the
  // BarcodeDetector and the AI fallback both get a format they can read, instead of failing on
  // iPhone HEIC or odd formats. We downscale very large photos for speed too.
  async function toBitmap(f){
    try{ return await createImageBitmap(f); }
    catch(_){
      // Fallback: load via an <img> (handles HEIC that the browser can decode for display) → canvas
      return await new Promise((resolve,reject)=>{
        const url=URL.createObjectURL(f);
        const img=new Image();
        img.onload=()=>{ URL.revokeObjectURL(url); resolve(img); };
        img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error('decode failed')); };
        img.src=url;
      });
    }
  }
  function bitmapToCanvas(bmp){
    const w=bmp.width||bmp.naturalWidth, h=bmp.height||bmp.naturalHeight;
    const scale=Math.min(1, 1600/Math.max(w,h)); // cap longest side at 1600px
    const cw=Math.round(w*scale), ch=Math.round(h*scale);
    const cv=document.createElement('canvas'); cv.width=cw; cv.height=ch;
    cv.getContext('2d').drawImage(bmp, 0,0, cw,ch);
    return cv;
  }

  // FAST PATH: native BarcodeDetector (iOS Safari 17+, Chrome Android). Instant, accurate, offline.
  try{
    if('BarcodeDetector' in window){
      const det = new BarcodeDetector({ formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'] });
      const bmp = await toBitmap(file);
      const canvas = bitmapToCanvas(bmp);
      try{ bmp.close && bmp.close(); }catch(_){}
      const codes = await det.detect(canvas);
      if(codes && codes.length){
        const digits = String(codes[0].rawValue||'').replace(/\D/g,'');
        if(digits.length >= 6){
          if(statusEl) statusEl.innerHTML = '<span style="color:var(--gr)">Found '+digits+' — looking it up...</span>';
          lookupBarcode(digits);
          return;
        }
      }
    }
  }catch(e){ console.warn('BarcodeDetector failed, falling back to AI vision', e); }

  // AI VISION FALLBACK — convert to a clean JPEG data URL so the model always gets a readable image.
  let base64='', mime='image/jpeg';
  try{
    const bmp = await toBitmap(file);
    const canvas = bitmapToCanvas(bmp);
    try{ bmp.close && bmp.close(); }catch(_){}
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    base64 = dataUrl.split(',')[1];
  }catch(convErr){
    // Last resort: read the raw file as-is
    try{
      const buf = await file.arrayBuffer();
      base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      mime = file.type || 'image/jpeg';
    }catch(_){
      if(statusEl) statusEl.innerHTML = '<span style="color:var(--re)">Couldn\'t read that image. Try another photo or type the number below.</span>';
      return;
    }
  }
  await _barcodeVisionLookup(base64, mime, statusEl);
}
// AI vision barcode read, split out so the photo handler stays clean.
async function _barcodeVisionLookup(base64, mime, statusEl){
    try{
      const prompt = 'This image contains a product barcode (EAN-13, EAN-8, UPC-A, or UPC-E). Read the digits printed beneath or beside the barcode lines. Return ONLY valid JSON, no markdown: {"barcode":"the digits as a string, no spaces","confidence":"high|medium|low"}. If you cannot read any barcode digits, return {"error":"no barcode"}.';
      const {data, error} = await Promise.race([
        sb.functions.invoke('ai-proxy', {
          body: { action:'vision', prompt, image_base64: base64, image_mime: mime, max_tokens: 200 }
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out')), 30000))
      ]).catch(e => ({ error: e }));
      
      if(error || !data?.text){
        if(statusEl) statusEl.innerHTML = '<span style="color:var(--re)">Couldn\'t read it. Try a clearer, closer photo — or type the number below.</span>';
        return;
      }
      const mm = data.text.match(/\{[\s\S]*\}/);
      const parsed = mm ? JSON.parse(mm[0]) : null;
      if(!parsed || parsed.error || !parsed.barcode){
        if(statusEl) statusEl.innerHTML = '<span style="color:var(--re)">No barcode found in that photo. Get the lines and digits in frame, or type the number below.</span>';
        return;
      }
      const digits = String(parsed.barcode).replace(/\D/g, '');
      if(digits.length < 6){
        if(statusEl) statusEl.innerHTML = '<span style="color:var(--re)">Barcode unclear. Try again or type it below.</span>';
        return;
      }
      if(statusEl) statusEl.innerHTML = '<span style="color:var(--gr)">Found ' + digits + ' — looking up...</span>';
      lookupBarcode(digits);
    }catch(err){
      console.error('barcode photo read failed', err);
      if(statusEl) statusEl.innerHTML = '<span style="color:var(--re)">Something went wrong. Type the number below instead.</span>';
    }
}

function closeBarcodeScanner(){
  // Remove THIS sheet, not "the first .modal-bg.open in the document". Six sheets share that class,
  // and the recipe builder opens its own before launching the scanner from inside it — so scanning an
  // ingredient closed the recipe editor and left the camera running over the top, losing everything
  // typed into the recipe so far.
  const m = document.getElementById('barcode-scanner-modal');
  if(m){ m.remove(); return; }
  document.querySelector('.modal-bg.open')?.remove();
}

async function lookupBarcode(barcode){
  // CONSUME THE MODE FLAG UP FRONT. __recipeScan says "this scan is for the recipe builder", and it
  // was only cleared on the SUCCESS path far below — so an unreadable code, a product not in the
  // database, or a dropped connection left it set, and the person's NEXT scan from the food diary
  // silently added the item to a recipe they were not building. Taken here, before any early return,
  // so a failed scan cannot change what the following one means.
  const _recipeMode = !!(typeof window !== 'undefined' && window.__recipeScan);
  try{ if(typeof window !== 'undefined') window.__recipeScan = false; }catch(_){ }
  barcode = (barcode || '').trim();
  if(!barcode || !/^\d{6,14}$/.test(barcode)){
    // The scanner STAYS OPEN here — this is a misread, and the person simply tries again. So put the
    // mode back: clearing it up front protects against a failed lookup leaking into a LATER scan, but
    // this path is the same scan continuing, and stripping it would drop their next attempt into the
    // food diary instead of the recipe they are still building.
    try{ if(typeof window !== 'undefined') window.__recipeScan = _recipeMode; }catch(_){ }
    showToast('Invalid barcode', 'Barcode should be 6-14 digits.');
    return;
  }
  closeBarcodeScanner();
  
  const res = document.getElementById('nut-search-results');
  if(res) res.innerHTML = '<p class="pulsing" style="text-align:center;padding:16px;color:var(--tx3);font-style:italic">Looking up ' + barcode + '...</p>';
  
  try{
    // Try the main OFF endpoint, then the US mirror, to widen coverage
    let d = null;
    for(const base of ['https://world.openfoodfacts.org', 'https://us.openfoodfacts.org']){
      try{
        const r = await fetch(base + '/api/v2/product/' + encodeURIComponent(barcode) + '.json');
        if(r.ok){ const j = await r.json(); if(j.status === 1 && j.product){ d = j; break; } }
      }catch(_){ /* try next */ }
    }
    
    if(!d || d.status !== 1 || !d.product){
      if(res) res.innerHTML = '<div style="padding:14px;background:var(--bg3);border-radius:10px;font-size:13px;color:var(--tx2);line-height:1.5;text-align:center">Barcode <strong>' + barcode + '</strong> isn\'t in the food database. Try searching the product by name above, or tap "+ Create a custom food" to add it yourself.</div>';
      return;
    }
    
    const p = d.product;
    const n = p.nutriments || {};
    // Open Food Facts stores nutriments per 100g in *_100g, but MANY products only carry per-serving
    // values (*_serving) — reading only _100g then gives all ZEROS (the YoPRO bug). So: prefer _100g,
    // but if a field's _100g is missing/zero while a _serving value exists, derive per-100 from the
    // serving size. serving_quantity is grams per serving when present.
    const servingG = parseFloat(n.serving_quantity || p.serving_quantity || (p.serving_size ? (p.serving_size.match(/([\d.]+)\s*(g|ml)/i)||[])[1] : 0)) || 0;
    const per100Of = (base) => {
      const v100 = n[base+'_100g'];
      if(v100 != null && v100 !== '' && !isNaN(v100) && Number(v100) !== 0) return Number(v100);
      const vServ = n[base+'_serving'];
      if(vServ != null && vServ !== '' && !isNaN(vServ) && servingG > 0) return Number(vServ) * 100 / servingG;
      return Number(v100) || 0; // last resort (may be 0)
    };
    const kcal100 = (() => {
      let v = per100Of('energy-kcal');
      if(!v){ const ej = per100Of('energy'); if(ej) v = ej/4.184; }
      return Math.round(v || 0);
    })();
    const food = { per100:true,
      name: p.product_name || p.generic_name || 'Unknown product',
      brand: p.brands || '',
      cal: kcal100,
      pro: Math.round(per100Of('proteins') * 10) / 10,
      carb: Math.round(per100Of('carbohydrates') * 10) / 10,
      fat: Math.round(per100Of('fat') * 10) / 10,
      // Micros from OFF per 100g — sodium/calcium/iron/potassium/vit-c need g→mg conversion
      fiber: Math.round(per100Of('fiber') * 10) / 10,
      sugar: Math.round(per100Of('sugars') * 10) / 10,
      sodium: Math.round(per100Of('sodium') * 1000),
      sat_fat: Math.round(per100Of('saturated-fat') * 10) / 10,
      calcium: Math.round(per100Of('calcium') * 1000),
      iron: Math.round(per100Of('iron') * 1000 * 10) / 10,
      potassium: Math.round(per100Of('potassium') * 1000),
      vit_c: Math.round(per100Of('vitamin-c') * 1000 * 10) / 10,
      // 'Open Food Facts', spaced — _foodVerified(:476) and the ranking bonus (:655) both test the
      // spaced string, so the unspaced one meant a scanned barcode was the ONE food path that never
      // earned the verified badge and never got its ranking bonus. Scanning is the most trustworthy
      // source there is; it was being presented as the least.
      source: 'Open Food Facts',
      barcode: barcode,
      // If OFF gave a real serving size, offer it as the FIRST option with correct per-serving macros.
      servings: (servingG > 0 ? [{
        name: (p.serving_size || (servingG+'g')), gramsEquiv: servingG,
        cal: Math.round(kcal100*servingG/100), pro: Math.round(per100Of('proteins')*servingG/100*10)/10,
        carb: Math.round(per100Of('carbohydrates')*servingG/100*10)/10, fat: Math.round(per100Of('fat')*servingG/100*10)/10
      }] : []).concat([{name: '100g', gramsEquiv:100, cal: kcal100, pro: Math.round(per100Of('proteins')*10)/10, carb: Math.round(per100Of('carbohydrates')*10)/10, fat: Math.round(per100Of('fat')*10)/10}])
    };
    
    // NOTE: the product's real serving is ALREADY built above (from servingG, correctly scaled off the
    // per-100g base). A previous block re-added it here as food.servings[0].cal * sq/100 — but
    // servings[0].cal was ALREADY the per-serving value, so that DOUBLE-scaled the macros (a 320g meal
    // read 1290 cal instead of 404). Removed. Micros were unaffected (scaled elsewhere), which is why
    // sodium looked right while calories were 3.2x too high. Do not re-add a serving here.

    // Recipe-scan mode: route this scan into the open recipe instead of the day log.
    if(_recipeMode){   // captured and cleared at the top, so a failed scan cannot leak into the next
      try{ if(typeof closeBarcodeScanner === 'function') closeBarcodeScanner(); }catch(_){}
      const g = parseFloat(await askText('How much ' + food.name + '?', 'Grams that go into this recipe.', {value:'100', type:'number', confirmLabel:'Add it'})) || 100;
      const f = g / 100;
      if(window.__editingRecipe){
        window.__editingRecipe.ingredients.push({ name: food.name + ' (' + g + 'g)', cal: Math.round((food.cal||0)*f), pro: Math.round((food.pro||0)*f*10)/10, carb: Math.round((food.carb||0)*f*10)/10, fat: Math.round((food.fat||0)*f*10)/10 });
        if(typeof renderRecipeIngredients === 'function') renderRecipeIngredients();
        showToast('Ingredient added', food.name + ' \u00b7 ' + g + 'g');
      }
      return;
    }
    if(res) res.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'food-result';
    el.style.cssText = 'border:1px solid var(--go-bd)';
    el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
        '<div style="flex:1;cursor:pointer" id="barcode-result-tap">' +
          '<div class="fr-name">' + _escFew(food.name) + '</div>' +
          (food.brand ? '<div class="fr-brand">' + _escFew(food.brand) + '</div>' : '') +
          '<div class="fr-macros"><span class="fr-cal">' + food.cal + ' cal/100g</span><span>P: ' + food.pro + 'g</span><span>C: ' + food.carb + 'g</span><span>F: ' + food.fat + 'g</span><span style="color:var(--go)">Barcode</span></div>' +
          '<div style="font-size:11px;color:var(--go);margin-top:4px">Tap to choose serving &amp; add →</div>' +
        '</div>' +
        '<button onclick="document.getElementById(&apos;nut-search-results&apos;).innerHTML=&apos;&apos;" title="Wrong product? Clear it" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer;flex-shrink:0;line-height:1">&times;</button>' +
      '</div>';
    const tapZone = el.querySelector('#barcode-result-tap');
    if(tapZone) tapZone.onclick = () => openServingModal(food);
    if(res) res.appendChild(el);
    showToast('Found', food.name);
  }catch(e){
    console.error('[barcode] lookup error:', e);
    if(res) res.innerHTML = '<div style="padding:14px;background:var(--re-bg);border:1px solid var(--re-bd);border-radius:10px;font-size:13px;color:var(--re)">Lookup failed. Check your connection and try again.</div>';
  }
}

// ── RECIPE BUILDER ───────────────────────────────────────────
// Build a custom recipe from ingredients. Save it. Log it as a single meal forever.
function openRecipeBuilder(){
  const recipes = ls('totry_recipes') || [];
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  
  let listHtml = '';
  if(recipes.length){
    listHtml = '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;margin-top:14px">Your saved recipes</div>';
    recipes.forEach((r, i) => {
      const totalCal = r.ingredients.reduce((a, ing) => a + (ing.cal || 0), 0);
      const totalPro = r.ingredients.reduce((a, ing) => a + (ing.pro || 0), 0);
      const perServing = r.servings && r.servings > 1 ? ' · ' + Math.round(totalCal/r.servings) + ' cal/serving' : '';
      listHtml += '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:8px;cursor:pointer" onclick="logRecipeAsMeal(' + i + ')">' +
        '<div style="font-size:14px;color:var(--tx);margin-bottom:3px">' + _escFew(r.name) + '</div>' +
        '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">' + Math.round(totalCal) + ' cal total · ' + Math.round(totalPro) + 'g protein · ' + r.ingredients.length + ' ingredients' + perServing + '</div>' +
        '<div style="display:flex;gap:6px;margin-top:8px">' +
          '<button class="btn" style="flex:1;padding:6px 8px;font-size:11px" onclick="event.stopPropagation();logRecipeAsMeal(' + i + ')">Log this</button>' +
          '<button class="btn" style="flex:1;padding:6px 8px;font-size:11px" onclick="event.stopPropagation();editRecipe(' + i + ')">Edit</button>' +
          '<button class="btn danger" style="width:auto;padding:6px 8px;font-size:11px" onclick="event.stopPropagation();deleteRecipe(' + i + ')">×</button>' +
        '</div>' +
      '</div>';
    });
  } else {
    listHtml = '<p class="empty-note">No recipes yet. Build one below.</p>';
  }
  
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:8px">My recipes</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:6px">Build meals once, log them in one tap.</p>' +
    listHtml +
    '<div style="display:flex;gap:8px;margin-top:10px;margin-bottom:8px">' +
      '<button class="btn primary" onclick="openPasteRecipe()" style="flex:1">📋 Paste a recipe</button>' +
      '<button class="btn" onclick="newRecipe()" style="flex:1;background:var(--bg3);border:1px solid var(--bd)">+ Build manually</button>' +
    '</div>' +
    '<button class="btn" onclick="closeModal(this)">Done</button>' +
  '</div>';
  document.body.appendChild(m);
}

function newRecipe(){
  document.querySelector('.modal-bg.open')?.remove();
  editRecipe(-1);
}

// Paste a recipe from anywhere (a site, a note, a message) and let the AI turn the ingredient list
// into a full recipe with macros — the tedious part done in one step. We parse pasted TEXT, not a
// URL: text parsing is what the model is reliably good at, and it can't fail on a paywalled or
// unreachable page. The result is always an EDITABLE draft, so a wrong number is a tweak, not a trap.
function openPasteRecipe(){
  document.querySelector('.modal-bg.open')?.remove();
  const m=document.createElement('div'); m.className='modal-bg open';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<h3 style="margin-bottom:6px">Paste a recipe</h3>'+
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:10px;line-height:1.5">Paste the ingredients from anywhere — a website, a note, a message. I’ll turn them into a recipe with macros you can edit. Add how many servings it makes if you know.</p>'+
    '<textarea id="paste-recipe-text" placeholder="500g chicken breast\n2 cups basmati rice\n1 tbsp olive oil\n1 onion\n\nMakes 4 servings" style="min-height:150px;font-size:16px;line-height:1.5;margin-bottom:12px"></textarea>'+
    '<button class="btn primary" onclick="parsePastedRecipe()" style="margin-bottom:8px">Build the recipe</button>'+
    '<button class="btn" onclick="closeModal(this)">Cancel</button>'+
  '</div>';
  document.body.appendChild(m);
  setTimeout(function(){ var t=document.getElementById('paste-recipe-text'); if(t) t.focus(); }, 200);
}
async function parsePastedRecipe(){
  const text=(document.getElementById('paste-recipe-text')?.value||'').trim();
  if(!text){ showToast('Paste something first','Add the ingredients and I’ll build it.'); return; }
  const btn=document.querySelector('.modal-bg.open .btn.primary');
  if(btn){ btn.textContent='Working out the macros…'; btn.disabled=true; }
  const prompt='Parse this into a structured recipe with macros:\n\n"'+text+'"\n\n'+
    'For each ingredient, respect any stated quantity EXACTLY and estimate accurate nutrition for it. Macros are for the WHOLE recipe (every ingredient), not per serving. Ignore non-ingredient lines (instructions, headings, method). Return ONLY this JSON, no markdown:\n'+
    '{"name":"short recipe name","servings":number,"ingredients":[{"name":"e.g. 500g chicken breast","cal":number,"pro":number,"carb":number,"fat":number}]}\n'+
    'servings = how many meals the whole recipe makes (estimate from the amounts if not stated; default 1). Numbers only. sodium not needed.';
  try{
    const raw=await api('You are a precise nutrition coach who converts recipe ingredient lists into accurate per-ingredient macros.',[],prompt,900);
    const mm=raw.match(/\{[\s\S]*\}/); if(!mm) throw new Error('no json');
    const parsed=JSON.parse(mm[0]);
    const recipe={ name:parsed.name||'New recipe', servings:Math.max(1, parseInt(parsed.servings)||1),
      ingredients:(parsed.ingredients||[]).map(function(i){ return { name:String(i.name||'ingredient'), cal:Math.round(i.cal||0), pro:Math.round((i.pro||0)*10)/10, carb:Math.round((i.carb||0)*10)/10, fat:Math.round((i.fat||0)*10)/10 }; }) };
    if(!recipe.ingredients.length) throw new Error('no ingredients');
    document.querySelector('.modal-bg.open')?.remove();
    editRecipe(-1, recipe);
    if(typeof haptic==='function') haptic('success');
    if(typeof showToast==='function') showToast('Recipe drafted ✨', recipe.ingredients.length+' ingredients — review, tweak anything, then save.');
  }catch(e){
    if(btn){ btn.textContent='Build the recipe'; btn.disabled=false; }
    showToast('Couldn’t read that','Try pasting just the ingredient lines — or add them manually.');
  }
}

function editRecipe(idx, prefill){
  const recipes = ls('totry_recipes') || [];
  const recipe = idx >= 0 ? recipes[idx] : (prefill || {name: '', ingredients: [], servings: 1});
  if(!recipe) return;
  
  window.__editingRecipe = JSON.parse(JSON.stringify(recipe));
  window.__editingRecipeIdx = idx;
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:90vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:8px">' + (idx >= 0 ? 'Edit recipe' : 'New recipe') + '</h3>' +
    '<div class="eyebrow">Recipe name</div>' +
    '<input type="text" id="recipe-name" value="' + (recipe.name || '').replace(/"/g, '&quot;') + '" placeholder="e.g. Chicken & rice bowl" style="margin-bottom:10px">' +
    '<div class="eyebrow">Servings (how many meals does this make?)</div>' +
    '<input type="number" id="recipe-servings" value="' + (recipe.servings || 1) + '" min="1" style="margin-bottom:14px">' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Ingredients</div>' +
    '<button class="btn" style="margin-bottom:10px;background:var(--bg3);border:1px solid var(--bd);font-size:12px" onclick="window.__recipeScan=true;openBarcodeScanner()">\ud83d\udcf7 Scan an ingredient</button>' +
    '<div id="recipe-ingredients" style="margin-bottom:10px"></div>' +
    '<div style="display:flex;gap:6px;margin-bottom:14px">' +
      '<input type="text" id="recipe-add-name" placeholder="Ingredient (e.g. 100g chicken)" style="flex:2">' +
      '<input type="number" id="recipe-add-cal" placeholder="kcal" style="flex:1">' +
    '</div>' +
    '<div style="display:flex;gap:6px;margin-bottom:14px">' +
      '<input type="number" id="recipe-add-pro" placeholder="P (g)" style="flex:1">' +
      '<input type="number" id="recipe-add-carb" placeholder="C (g)" style="flex:1">' +
      '<input type="number" id="recipe-add-fat" placeholder="F (g)" style="flex:1">' +
      '<button class="btn primary" style="width:auto;padding:8px 12px" onclick="addRecipeIngredient()">+</button>' +
    '</div>' +
    '<div id="recipe-totals" style="background:var(--bg3);border:1px solid var(--bd);border-radius:8px;padding:10px;margin-bottom:14px;font-family:DM Mono,monospace;font-size:11px;color:var(--tx2);text-align:center"></div>' +
    '<button class="btn primary" onclick="saveCurrentRecipe()" style="margin-bottom:8px">Save recipe</button>' +
    '<button class="btn" onclick="closeModal(this)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
  renderRecipeIngredients();
}

function renderRecipeIngredients(){
  const r = window.__editingRecipe;
  const box = document.getElementById('recipe-ingredients');
  const totalsBox = document.getElementById('recipe-totals');
  if(!box || !r) return;
  
  if(!r.ingredients.length){
    box.innerHTML = '<p class="empty-note">No ingredients yet</p>';
  } else {
    box.innerHTML = '';
    r.ingredients.forEach((ing, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid var(--bd);font-size:12px';
      row.innerHTML = '<div style="flex:1;color:var(--tx)">' + ing.name + '</div>' +
        '<div style="font-family:DM Mono,monospace;color:var(--tx3);font-size:10px">' + Math.round(ing.cal||0) + 'kcal · P' + Math.round(ing.pro||0) + ' C' + Math.round(ing.carb||0) + ' F' + Math.round(ing.fat||0) + '</div>' +
        '<button onclick="removeRecipeIngredient(' + i + ')" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer;padding:0 4px">×</button>';
      box.appendChild(row);
    });
  }
  
  const tc = r.ingredients.reduce((a, ing) => a + (ing.cal||0), 0);
  const tp = r.ingredients.reduce((a, ing) => a + (ing.pro||0), 0);
  const tcb = r.ingredients.reduce((a, ing) => a + (ing.carb||0), 0);
  const tf = r.ingredients.reduce((a, ing) => a + (ing.fat||0), 0);
  if(totalsBox){
    const servings = parseInt(document.getElementById('recipe-servings')?.value || 1);
    const perCal = Math.round(tc / Math.max(1, servings));
    totalsBox.innerHTML = 'Total: ' + Math.round(tc) + ' cal · P ' + Math.round(tp) + 'g · C ' + Math.round(tcb) + 'g · F ' + Math.round(tf) + 'g' +
      (servings > 1 ? '<br>Per serving: ' + perCal + ' cal' : '');
  }
}

function addRecipeIngredient(){
  const name = document.getElementById('recipe-add-name')?.value.trim();
  if(!name){ showToast('Need a name','What is this ingredient?'); return; }
  const cal = parseFloat(document.getElementById('recipe-add-cal')?.value || 0);
  const pro = parseFloat(document.getElementById('recipe-add-pro')?.value || 0);
  const carb = parseFloat(document.getElementById('recipe-add-carb')?.value || 0);
  const fat = parseFloat(document.getElementById('recipe-add-fat')?.value || 0);
  window.__editingRecipe.ingredients.push({name, cal, pro, carb, fat});
  ['recipe-add-name','recipe-add-cal','recipe-add-pro','recipe-add-carb','recipe-add-fat'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  renderRecipeIngredients();
  document.getElementById('recipe-add-name')?.focus();
}

function removeRecipeIngredient(i){
  window.__editingRecipe.ingredients.splice(i, 1);
  renderRecipeIngredients();
}

function saveCurrentRecipe(){
  const r = window.__editingRecipe;
  const idx = window.__editingRecipeIdx;
  r.name = document.getElementById('recipe-name')?.value.trim();
  r.servings = parseInt(document.getElementById('recipe-servings')?.value || 1);
  if(!r.name){ showToast('Name required','Give your recipe a name.'); return; }
  if(!r.ingredients.length){ showToast('No ingredients','Add at least one ingredient.'); return; }
  
  const recipes = ls('totry_recipes') || [];
  if(idx >= 0) recipes[idx] = r;
  else recipes.unshift(r);
  ls('totry_recipes', recipes);
  
  document.querySelector('.modal-bg.open')?.remove();
  showToast('Recipe saved', r.name);
  haptic('success');
  openRecipeBuilder();
}

async function deleteRecipe(i){
  if(!(await askConfirm('Delete this recipe?'))) return;
  const recipes = ls('totry_recipes') || [];
  recipes.splice(i, 1);
  ls('totry_recipes', recipes);
  document.querySelector('.modal-bg.open')?.remove();
  openRecipeBuilder();
}

async function logRecipeAsMeal(i){
  const recipes = ls('totry_recipes') || [];
  const r = recipes[i];
  if(!r) return;
  
  const servings = r.servings || 1;
  // Ask: how many servings?
  const qty = parseFloat(await askText('How many servings?', r.name, {value:'1', type:'number', confirmLabel:'Log it'}));
  if(!qty || qty <= 0) return;
  
  const portion = qty / servings;
  const totalCal = r.ingredients.reduce((a, ing) => a + (ing.cal||0), 0) * portion;
  const totalPro = r.ingredients.reduce((a, ing) => a + (ing.pro||0), 0) * portion;
  const totalCarb = r.ingredients.reduce((a, ing) => a + (ing.carb||0), 0) * portion;
  const totalFat = r.ingredients.reduce((a, ing) => a + (ing.fat||0), 0) * portion;
  
  const today = (typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU');
  const log = ls('totry_nutlog') || {};
  if(!log[today]) log[today] = [];
  log[today].push({
    id: Date.now(),
    ts: (typeof nutStampFor==='function' ? nutStampFor() : new Date().toISOString()),
    date: today,
    name: r.name,
    serving: qty + (qty === 1 ? ' serving' : ' servings'),
    qty: 1,
    cal: Math.round(totalCal),
    pro: Math.round(totalPro * 10) / 10,
    carb: Math.round(totalCarb * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    source: 'recipe'
  });
  ls('totry_nutlog', log);
  
  document.querySelector('.modal-bg.open')?.remove();
  if(typeof renderNutritionLog === 'function') renderNutritionLog();
  showToast('Logged', r.name + ' · ' + Math.round(totalCal) + ' cal');
  haptic('success');
}

// ── REPEAT A DAY ─────────────────────────────────
// One button instead of two near-identical ones. Both paths (yesterday, same weekday last week)
// are here, each showing whether there's actually anything to copy — so a dead tap never happens.
function openRepeatDay(){
  const log = ls('totry_nutlog') || {};
  // Relative to the day being VIEWED, like repeatMealsFrom — these counts and the enabled/disabled
  // state describe the days the copy will actually read from. Computed from Date.now(), they described
  // days around today while the person was filling in a past one.
  const _rk = (n) => (typeof nutRelKey==='function') ? nutRelKey(n)
              : new Date(Date.now()-n*86400000).toLocaleDateString('en-AU');
  const _rd = (n) => { const d = (typeof nutViewDate==='function') ? nutViewDate() : new Date();
              d.setDate(d.getDate()-n); return d; };
  const yKey = _rk(1);
  const yCount = (log[yKey]&&log[yKey].length) ? log[yKey].length : 0;
  const lwKey = _rk(7);
  const lwCount = (log[lwKey]&&log[lwKey].length) ? log[lwKey].length : 0;
  const lwDow = _rd(7).toLocaleDateString('en-AU',{weekday:'long'});
  const row=(label, count, act)=>{
    const dead = !count;
    return '<button '+(dead?'disabled':'onclick="closeModal(this);'+act+'"')+
      ' style="width:100%;text-align:left;padding:13px 14px;background:var(--bg3);border:1px solid var(--bd);border-radius:10px;margin-bottom:8px;color:'+(dead?'var(--tx3)':'var(--tx)')+';font-size:14px;cursor:'+(dead?'default':'pointer')+';opacity:'+(dead?'0.45':'1')+'">'+
      label+'<span style="display:block;font-size:11px;color:var(--tx3);margin-top:2px">'+(count?(count+' item'+(count>1?'s':'')+' to copy'):'nothing logged')+'</span></button>';
  };
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;color:var(--tx);margin-bottom:6px">Repeat a day</div>'+
    '<div style="text-align:center;font-size:12px;color:var(--tx3);margin-bottom:14px">Copy a previous day&rsquo;s meals into today</div>'+
    row('Yesterday', yCount, 'repeatYesterdayMeals()')+
    row('This '+lwDow+', last week', lwCount, 'repeatLastWeekday()')+
    '<button class="btn" onclick="closeModal(this)" style="margin-top:4px;background:transparent;border:none;color:var(--tx3);font-size:13px">Cancel</button>'+
    '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}
// ── REPEAT YESTERDAY'S MEALS ─────────────────────────────────
function repeatYesterdayMeals(){ repeatMealsFrom(1, (typeof nutIsToday==='function' && !nutIsToday()) ? 'the day before' : 'yesterday'); }
// Same-as-last-[weekday]: people eat on a weekly rhythm (gym days, work days, Sunday roast),
// so "last Tuesday" is often a truer template than "yesterday". Looks back up to 7 days to the
// same weekday that actually has a log.
function repeatLastWeekday(){
  const log = ls('totry_nutlog') || {};
  // COUNTS ONE DAY, COPIES ANOTHER. openRepeatDay measures this button against the day being VIEWED
  // (nutRelKey(7)) and repeatMealsFrom copies from the viewed day too — but this guard was computed
  // from Date.now(). Fill in last Saturday and the row reads "This Saturday, last week — 4 items to
  // copy"; tap it and, if today-7 happens to be empty, you get "Nothing last week" instead. When
  // today-7 was NOT empty it went through, but named the wrong weekday in the confirmation. The loop
  // ran exactly once (back=7 to 7) and todayDow was never read, so neither did what they looked like.
  const d = (typeof nutViewDate==='function') ? nutViewDate() : new Date();
  d.setDate(d.getDate() - 7);
  const key = (typeof nutRelKey==='function') ? nutRelKey(7) : d.toLocaleDateString('en-AU');
  const dow = d.toLocaleDateString('en-AU',{weekday:'long'});
  if(log[key] && log[key].length){ repeatMealsFrom(7, 'last ' + dow); return; }
  showToast('Nothing that ' + dow, 'No food logged on that day last week.');
}
function repeatMealsFrom(daysAgo, label){
  const log = ls('totry_nutlog') || {};
  // Relative to the day being VIEWED, not to today. The copy lands on the viewed day, so sourcing
  // from today-1 meant that while looking at Saturday you were offered "yesterday" — which was
  // actually a day AFTER the one you were filling in.
  const _base = (typeof nutViewDate==='function') ? nutViewDate() : new Date();
  const src = new Date(_base.getTime() - daysAgo*86400000).toLocaleDateString('en-AU');
  // Stash the RESOLVED key. confirmRepeatYesterday used to recompute it from Date.now(), so on any
  // day you had navigated to it listed one day's meals and then logged a different day's — indexing
  // the checkbox positions into an array they were never built against. Items past the end were
  // silently skipped; the rest were the wrong food, written with no indication.
  window.__repeatSrcKey = src;
  const srcMeals = log[src] || [];
  if(!srcMeals.length){
    showToast('Nothing to copy', 'No food logged ' + (label||('on '+src)) + '.');
    return;
  }
  window.__repeatSrcDays = daysAgo;
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  let itemsHtml = '';
  srcMeals.forEach((e, i) => {
    itemsHtml += '<label style="display:flex;align-items:center;gap:10px;padding:8px;border-bottom:1px solid var(--bd);cursor:pointer">' +
      '<input type="checkbox" data-idx="' + i + '" checked style="width:auto">' +
      '<div style="flex:1"><div style="font-size:13px;color:var(--tx)">' + _escFew(e.name) + '</div>' +
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">' + e.serving + ' · ' + e.cal + ' cal</div></div>' +
    '</label>';
  });
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:8px">Repeat ' + (label||('the day before ' + ((typeof nutDayWord==='function')?nutDayWord():'today'))) + '</h3>' +
    '<p style="font-size:12px;color:var(--tx3);margin-bottom:10px">Pick which meals to log '+((typeof nutIsToday==='function' && !nutIsToday() && typeof nutDayLabel==='function') ? ('on '+nutDayLabel()) : 'today')+'.</p>' +
    '<div id="repeat-yesterday-list">' + itemsHtml + '</div>' +
    '<button class="btn primary" onclick="confirmRepeatYesterday()" style="margin-top:10px;margin-bottom:8px">Log selected</button>' +
    '<button class="btn" onclick="closeModal(this)">Cancel</button>' +
  '</div>';
  document.body.appendChild(m);
}

function confirmRepeatYesterday(){
  const log = ls('totry_nutlog') || {};
  const daysAgo = window.__repeatSrcDays || 1;
  // Same key the preview listed (see repeatMealsFrom); fall back to the day-nav-relative helper.
  const src = window.__repeatSrcKey || (typeof nutRelKey==='function' ? nutRelKey(daysAgo)
              : new Date(Date.now() - daysAgo*86400000).toLocaleDateString('en-AU'));
  const today = (typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU');
  const srcMeals = log[src] || [];
  const checks = document.querySelectorAll('#repeat-yesterday-list input[type="checkbox"]');
  
  if(!log[today]) log[today] = [];
  let added = 0;
  checks.forEach(c => {
    if(!c.checked) return;
    const idx = parseInt(c.dataset.idx);
    const e = srcMeals[idx];
    if(!e) return;
    log[today].push({...e, id: Date.now() + idx, ts: (typeof nutStampFor==='function'?nutStampFor():new Date().toISOString())});
    added++;
  });
  ls('totry_nutlog', log);
  if(typeof syncToCloud==='function') syncToCloud();
  document.querySelector('.modal-bg.open')?.remove();
  if(typeof renderNutritionLog === 'function') renderNutritionLog();
  // "today" was a lie whenever the diary was day-navigated — the copy lands on the VIEWED day.
  const _dayWord = (typeof nutDayLabel==='function') ? nutDayLabel() : 'today';
  showToast('Added', added + ' meal' + (added > 1 ? 's' : '') + ' copied to ' + String(_dayWord).toLowerCase() + '.');
  haptic('success');
}
let currentFood=null;
// ── FOOD CORRECTIONS — your label beats a stranger's database entry ────────────────────────────
// Food databases are crowd-sourced, so a barcode can return a completely different product's macros
// (a 250ml coconut water reading 225 cal when the label says 88). Wrong numbers are the one thing a
// tracker can't survive. The big trackers make you scroll duplicate community entries hoping one is
// right; here you fix it ONCE against the label in your hand — stored per barcode, applied to every
// future scan, and synced across your devices. The library gets more accurate the more you use it,
// and the numbers become yours.
const _FIX_KEYS = ['cal','pro','carb','fat','fiber','sugar','sodium','potassium'];
function _foodKey(food){
  if(!food) return '';
  if(food.barcode) return 'bc_' + String(food.barcode);
  if(food.id) return 'id_' + String(food.id);
  return 'nm_' + String(food.name||'').toLowerCase().replace(/\s+/g,' ').trim().slice(0,60);
}
function getFoodOverride(food){
  try{ const all = ls('totry_food_overrides') || {}; return all[_foodKey(food)] || null; }catch(_){ return null; }
}
function saveFoodOverride(food, per100){
  try{
    const all = ls('totry_food_overrides') || {};
    all[_foodKey(food)] = Object.assign({}, per100, { _name: food.name||'', _at: new Date().toISOString() });
    ls('totry_food_overrides', all);
  }catch(_){ }
}
// Apply a saved correction BEFORE servings are used, and rescale any existing servings from the
// corrected per-100 base (so the product's own serving option survives instead of being discarded).
function applyFoodOverride(food){
  try{
    const ov = getFoodOverride(food);
    if(!ov || !food) return food;
    _FIX_KEYS.forEach(k => { if(typeof ov[k] === 'number' && !isNaN(ov[k])) food[k] = ov[k]; });
    food.per100 = true;
    food.__corrected = true;
    if(Array.isArray(food.servings) && food.servings.length){
      food.servings = food.servings.map(s => {
        if(!s || !s.gramsEquiv) return s;
        const m = s.gramsEquiv / 100;
        return Object.assign({}, s, {
          cal:(food.cal||0)*m, pro:(food.pro||0)*m, carb:(food.carb||0)*m, fat:(food.fat||0)*m
        });
      });
    }
  }catch(_){ }
  return food;
}
// Prefill the fix panel with what we currently show for the SELECTED serving, so a person only has
// to change what's actually wrong — and reads straight off the label's "per serve" column.
function openFoodFix(){
  const panel = document.getElementById('sm-fix-panel');
  if(!panel || !currentFood) return;
  const si = parseInt(document.getElementById('sm-serving-select').value || 0);
  const s = (currentFood.servings||[])[si] || {};
  const ge = s.gramsEquiv || 100;
  const lbl = document.getElementById('sm-fix-serving');
  if(lbl) lbl.textContent = s.name || (ge + (currentFood.__unit||'g'));
  const m = ge / 100;
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.value = (v && !isNaN(v)) ? Math.round(v*10)/10 : ''; };
  set('fix-cal', (currentFood.cal||0)*m);
  set('fix-pro', (currentFood.pro||0)*m);
  set('fix-carb', (currentFood.carb||0)*m);
  set('fix-fat', (currentFood.fat||0)*m);
  set('fix-fiber', (currentFood.fiber||0)*m);
  set('fix-sugar', (currentFood.sugar||0)*m);
  set('fix-sodium', (currentFood.sodium||0)*m);
  set('fix-potassium', (currentFood.potassium||0)*m);
  panel.style.display = 'block';
  try{ panel.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ }
}
function saveFoodFix(){
  if(!currentFood) return;
  const si = parseInt(document.getElementById('sm-serving-select').value || 0);
  const s = (currentFood.servings||[])[si] || {};
  const ge = s.gramsEquiv || 100;
  const num = id => { const el = document.getElementById(id); const v = parseFloat(el && el.value); return (isNaN(v) || v < 0) ? null : v; };
  if(num('fix-cal') == null){
    if(typeof showToast==='function') showToast('Calories needed', 'Type at least the calories from the label.');
    return;
  }
  // The label's numbers are for THIS serving — convert back to a per-100 base so every serving scales.
  const per100 = {};
  _FIX_KEYS.forEach(k => {
    const v = num('fix-' + k);
    if(v != null) per100[k] = Math.round((v * 100 / ge) * 100) / 100;
  });
  saveFoodOverride(currentFood, per100);
  const p = document.getElementById('sm-fix-panel'); if(p) p.style.display = 'none';
  openServingModal(currentFood);   // re-apply + rescale so the corrected numbers show instantly
  if(typeof showToast==='function') showToast('Saved your numbers', 'Every future scan of this uses your label — not the database.');
  if(typeof haptic==='function') haptic('success');
}

// Portion by hand — the visual reference that fixes the universal weakest link (portion accuracy).
// No scale needed; your hand travels with you. Standard dietitian references. Rough beats not logging.
function openPortionGuide(){
  const rows=[
    ['✋','Palm','≈ 1 serving of protein — ~100–120g of meat/fish, ~25–30g protein'],
    ['✊','Fist','≈ 1 cup — a serving of veg, or of cooked carbs (rice, pasta, potato)'],
    ['🤲','Cupped hand','≈ ½ cup — a serving of nuts, or dry oats/cereal'],
    ['👍','Thumb','≈ 1 tbsp — a serving of fats (oil, butter, nut butter, cheese)']
  ];
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);margin-bottom:4px">Estimate by hand</div>'+
    '<div class="empty-note">No scale? Your hand is always with you. A rough log beats no log.</div>'+
    rows.map(r=>'<div style="display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-top:1px solid var(--bd)"><div style="font-size:26px;flex-shrink:0;width:34px;text-align:center">'+r[0]+'</div><div><div style="font-size:14px;color:var(--tx);font-weight:500">'+r[1]+'</div><div style="font-size:12px;color:var(--tx3);line-height:1.5">'+r[2]+'</div></div></div>').join('')+
    '<button class="btn" onclick="closeModal(this)" style="margin-top:14px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)">Got it</button>'+
  '</div>';
  document.body.appendChild(m); if(typeof haptic==='function') haptic('tap');
}
function openServingModal(food){
  currentFood=food;
  // Close any correction panel left open from the last food — see the note above. It is prefilled
  // with THAT food's numbers, and one tap would save them against this one.
  try{ const _fp=document.getElementById('sm-fix-panel'); if(_fp) _fp.style.display='none'; }catch(_){ }
  try{ applyFoodOverride(food); }catch(_){ }
  window.__editingEntry = null;
  document.getElementById('sm-food-name').textContent=food.name;
  document.getElementById('sm-food-brand').innerHTML=(food.brand?String(food.brand).replace(/</g,'&lt;'):(food.source&&typeof _foodSrcBadge==='function'?_foodSrcBadge(food.source):''))+(food.__corrected?' <span style="color:var(--gr)">· your numbers ✓</span>':'');
  // Per-100 foods (barcodes): values are per 100g/ml. Build sensible servings WITHOUT discarding
  // a real serving_size the product database already provided. We synthesize gram/ml options and
  // tag each with gramsEquiv so micros scale correctly. Default is one serving — never qty=100.
  // EXCEPTION: if servings were already built with proper gramsEquiv + macros (e.g. the barcode path
  // now provides a real serving first), trust them and don't rebuild — rebuilding caused mismatches.
  const _preBuilt = food.per100 && Array.isArray(food.servings) && food.servings.length && food.servings.every(s => s && s.gramsEquiv && (s.cal!=null));
  // Liquid detection drives g vs ml. Word-boundaried whole words, excluding solids that merely
  // CONTAIN a liquid word (ice cream, milk chocolate, watermelon, cream cheese). This runs for EVERY
  // per-100 food — including barcode scans that arrive pre-built — so the exact-amount option below
  // always names the right unit.
  if(food.per100){
    const nm = ((food.name||'')+' '+(food.brand||'')).toLowerCase();
    const solidTrap = /\b(ice cream|cream cheese|sour cream|milk chocolate|chocolate milk powder|watermelon|milk powder|coconut water gumm|creamed|biscuit|bar|powder|cereal|yog(h)?urt)\b/.test(nm);
    const liquidWord = /\b(milk|juice|drink|beverage|smoothie|soda|cola|lemonade|cordial|kombucha|water)\b/.test(nm) || /\b\d+\s*ml\b/.test(nm);
    food.__unit = (liquidWord && !solidTrap) ? 'ml' : 'g';
  }
  if(food.per100 && !_preBuilt){
    const unit = food.__unit;
    const isLiquid = unit === 'ml';
    const per1 = k => (food[k]||0)/100;
    const mk = (label, grams, extra) => Object.assign({ name: label, gramsEquiv: grams,
      cal: per1('cal')*grams, pro: per1('pro')*grams, carb: per1('carb')*grams, fat: per1('fat')*grams }, extra||{});
    // Preserve any real product serving the DB gave us (it has a name not equal to "100g").
    const realServing = (food.servings||[]).find(s => s && s.name && !/^100\s*g$/i.test(s.name));
    const built = [ mk('1 serving (100'+unit+')', 100), mk('250'+unit+(isLiquid?' (≈1 cup)':''), 250) ];
    if(realServing){
      // Put the product's own serving first, tagged with its gram-equivalent if we can infer it.
      const sq = parseFloat((realServing.name.match(/([\d.]+)\s*(g|ml)/i)||[])[1]);
      realServing.gramsEquiv = (sq && sq>0) ? sq : 100;
      food.servings = [realServing, ...built];
    } else {
      food.servings = built;
    }
  }
  // EVERY per-100 food must offer "type the exact amount". Barcode scans arrive with their servings
  // pre-built (the product's serving + 100g only) and so skipped the block above entirely — which is
  // why weighing 91g of something meant selecting 100g and typing 0.91. It sits right after the
  // product's own serving, and the quantity field relabels to "grams" so it reads "91 grams".
  if(food.per100 && Array.isArray(food.servings) && food.servings.length && !food.servings.some(s => s && s.__exact)){
    const u = (food.__unit === 'ml') ? 'Millilitres' : 'Grams';
    food.servings.splice(1, 0, { name: u + ' — type the exact amount', gramsEquiv: 1, __exact: true,
      cal:(food.cal||0)/100, pro:(food.pro||0)/100, carb:(food.carb||0)/100, fat:(food.fat||0)/100 });
  }
  if(!food.per100 && food.servings && !food.servings.some(x => x && x.__gram)){
    const hg = food.servings.find(x => x && /100\s*g/i.test(x.name || ''));
    // Same as the per-100 path: weighing it should mean typing the real number, not a fraction \u2014
    // so this sits right after the product's own serving instead of last, and says what it does.
    if(hg){ food.servings.splice(1, 0, {__gram:true, __exact:true, gramsEquiv:1, name:'Grams \u2014 type the exact amount', cal:(hg.cal||0)/100, pro:(hg.pro||0)/100, carb:(hg.carb||0)/100, fat:(hg.fat||0)/100}); }
  }
  // SAFETY NET: guarantee every serving carries macros. Web/AI/community foods sometimes arrive
  // with flat top-level macros but servings missing cal/pro/carb/fat — which showed as all-ZEROS
  // (the YoPRO bug). If a serving is missing values, fall back to the food's top-level numbers.
  if(Array.isArray(food.servings) && food.servings.length){
    food.servings = food.servings.map(s => {
      if(!s) return s;
      const hasMacros = (s.cal||0)||(s.pro||0)||(s.carb||0)||(s.fat||0);
      if(hasMacros) return s;
      return Object.assign({}, s, { cal: food.cal||0, pro: food.pro||0, carb: food.carb||0, fat: food.fat||0 });
    });
  } else if(!food.servings || !food.servings.length){
    // No servings at all → make one from the food's own macros so it's always loggable.
    food.servings = [{ name: food.serving || '1 serving', cal: food.cal||0, pro: food.pro||0, carb: food.carb||0, fat: food.fat||0 }];
  }
  const sel=document.getElementById('sm-serving-select');sel.innerHTML='';
  (food.servings||[]).forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.name;sel.appendChild(o);});
  document.getElementById('sm-qty').value = '1';
  // Auto-pick meal type based on time of day
  const h = new Date().getHours();
  const defaultMeal = h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
  selectMealChip(defaultMeal);
  updateServingPreview();
  document.getElementById('serving-modal').classList.add('open');
}
function selectMealChip(meal){
  window.__currentMeal = meal;
  document.querySelectorAll('#sm-meal-grid .meal-chip').forEach(c => {
    c.classList.toggle('selected', c.dataset.meal === meal);
  });
}
function updateServingPreview(){
  if(!currentFood)return;
  const qty=parseFloat(document.getElementById('sm-qty').value||1);
  const si=parseInt(document.getElementById('sm-serving-select').value||0);
  const s=(currentFood.servings||[])[si]||{cal:currentFood.cal,pro:currentFood.pro,carb:currentFood.carb,fat:currentFood.fat};
  // When they've chosen to weigh it, the number IS grams/ml — say so, so it reads "91 grams".
  const unitEl = document.getElementById('sm-qty-unit');
  if(unitEl) unitEl.textContent = s.__exact ? (currentFood.__unit === 'ml' ? 'ml' : 'grams') : 'servings';
  document.getElementById('sm-cal').textContent=Math.round((s.cal||0)*qty);
  document.getElementById('sm-pro').textContent=Math.round((s.pro||0)*qty*10)/10+'g';
  document.getElementById('sm-carb').textContent=Math.round((s.carb||0)*qty*10)/10+'g';
  document.getElementById('sm-fat').textContent=Math.round((s.fat||0)*qty*10)/10+'g';
  
  // Micros preview. For per-100 foods, currentFood.micros are per 100g/ml, so scale by the
  // serving's gram-equivalent × qty / 100. For non-per100 foods, the legacy ×qty path is kept.
  const microPreview = document.getElementById('sm-micros-preview');
  if(microPreview){
    const ge = s.gramsEquiv;
    // Same rule as below — see the note there on why the serving decides this, not the flag.
    const _gramServing = !!(ge && (s && (s.__gram || /^\s*100\s*(g|ml)\b/i.test(String(s.name||'')))));
    const microMult = (ge && (currentFood.per100 || _gramServing)) ? (ge * qty / 100) : qty;
    const micros = [];
    if(currentFood.fiber > 0) micros.push('Fiber ' + (Math.round(currentFood.fiber * microMult * 10) / 10) + 'g');
    if(currentFood.sugar > 0) micros.push('Sugar ' + (Math.round(currentFood.sugar * microMult * 10) / 10) + 'g');
    if(currentFood.sodium > 0) micros.push('Sodium ' + Math.round(currentFood.sodium * microMult) + 'mg');
    if(currentFood.iron > 0) micros.push('Iron ' + (Math.round(currentFood.iron * microMult * 10) / 10) + 'mg');
    if(currentFood.calcium > 0) micros.push('Ca ' + Math.round(currentFood.calcium * microMult) + 'mg');
    if(currentFood.vit_c > 0) micros.push('Vit C ' + (Math.round(currentFood.vit_c * microMult * 10) / 10) + 'mg');
    
    if(micros.length){
      microPreview.innerHTML = '<div style="color:var(--go);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;font-size:9px">Micros (selected)</div>' + micros.join(' · ');
      microPreview.style.display = 'block';
    } else {
      microPreview.style.display = 'none';
    }
  }
}
function addFoodToLog(){
  if(!currentFood)return;
  const qty=parseFloat(document.getElementById('sm-qty').value||1);
  const si=parseInt(document.getElementById('sm-serving-select').value||0);
  const s=(currentFood.servings||[])[si]||{cal:currentFood.cal,pro:currentFood.pro,carb:currentFood.carb,fat:currentFood.fat};
  const meal = window.__currentMeal || 'snack';
  
  // Build entry with macros + micros (micros come from currentFood if USDA)
  const entry={
    id:Date.now(),
    name:currentFood.name,
    cal:Math.round((s.cal||0)*qty),
    pro:Math.round((s.pro||0)*qty*10)/10,
    carb:Math.round((s.carb||0)*qty*10)/10,
    fat:Math.round((s.fat||0)*qty*10)/10,
    serving:s.name,
    qty,
    meal: meal,
    ts:(typeof nutStampFor==='function'?nutStampFor():new Date().toISOString()),
    date:(typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU')
  };
  
  // Carry-through full micronutrient panel if source supplied them.
  // For per-100 foods micros are per 100g/ml — scale by the serving's gram-equiv, NOT raw qty
  // (raw qty was the 100x sodium bug). For other foods the legacy per-serving ×qty path stands.
  const MICRO_KEYS = ['fiber','sugar','sodium','sat_fat','cholesterol',
                      'vit_a','vit_c','vit_d','vit_e','vit_k',
                      'b1','b2','b3','b6','b9','b12',
                      'calcium','iron','magnesium','phosphorus','potassium','zinc','selenium','copper'];
  // Derived from the SERVING rather than a per100 flag the source may never have set. searchUSDA did not
  // set it, so its per-100g micros took the legacy per-serving path and were multiplied by the raw gram
  // count: 30g of a food reported 30x its per-100g sodium instead of 0.3x — the 100x-sodium bug by
  // another door. Any source whose serving is measured in grams is per-100g by construction here, so
  // that is what decides it, and the flag is only a fallback.
  const _servIsGrams = !!(s && s.gramsEquiv && (s.__gram || /^\s*100\s*(g|ml)\b/i.test(String(s.name||''))));
  const microMult = (s && s.gramsEquiv && (currentFood.per100 || _servIsGrams))
    ? (s.gramsEquiv * qty / 100)
    : qty;
  MICRO_KEYS.forEach(k => {
    if(typeof currentFood[k] === 'number' && currentFood[k] > 0){
      entry[k] = Math.round(currentFood[k] * microMult * 100) / 100;
    }
  });
  
  const today=(typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU');
  // Edit mode: replace the original entry in place (keep its id + historical timestamp)
  if(window.__editingEntry){
    const ed = window.__editingEntry; window.__editingEntry = null;
    const log2 = ls('totry_nutlog') || {};
    const arr = log2[ed.date] || [];
    const idx = arr.findIndex(e => e.id === ed.id);
    if(idx > -1){
      entry.id = ed.id;
      entry.ts = arr[idx].ts || entry.ts;
      entry.date = arr[idx].date || ed.date;
      entry.meal = window.__currentMeal || arr[idx].meal || entry.meal;
      arr[idx] = entry;
      log2[ed.date] = arr;
      ls('totry_nutlog', log2);
      document.getElementById('serving-modal')?.classList.remove('open');
      showToast('Updated \u2713', entry.name + ' \u00b7 ' + entry.cal + ' cal');
      haptic('tick');
      renderNutritionLog();
      return;
    }
  }
  const log=ls('totry_nutlog')||{};if(!log[today])log[today]=[];
  log[today].push(entry);
  // en-AU keys are d/m/yyyy, so a plain .sort() is LEXICOGRAPHIC — '10/08/2026' sorts before
  // '9/12/2026', which means keys[0] can be TODAY and this used to delete the current diary outright.
  // Sort by real date, and keep 120 days to match what day-navigation promises.
  try{ _pruneNutLog(log); }catch(_){}   // one implementation, shared by every write path
  ls('totry_nutlog',log);
  // Remember this food for one-tap re-logging (recent foods list, most-recent first, deduped)
  rememberRecentFood(currentFood);
  document.getElementById('serving-modal').classList.remove('open');
  document.getElementById('nut-search-in').value='';
  document.getElementById('nut-search-results').innerHTML='';
  renderNutritionLog();showToast('Added', (typeof nutGentle==='function'&&nutGentle()) ? entry.name : (entry.name+' \u2014 '+entry.cal+' cal'));
  // The brother notices if this entry pushed you over today's calorie line — and speaks once, gently,
  // knowing your week (he'll cut you slack if you've trained hard). Only when crossing, never nagging.
  try{
    const _g = ls('totry_nut_goals')||{}; const _gc = _g.cal||0;
    if(_gc > 0){
      const _today = (typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU');
      const _log = ls('totry_nutlog')||{}; const _dayArr = _log[_today]||[];
      const _sum = _dayArr.reduce((a,e)=>a+(e.cal||0),0);
      const _prev = _sum - (entry.cal||0);
      if(_sum > _gc && _prev <= _gc){ // this entry is the one that crossed it
        // Never announce going 'over' when the person has asked not to see the numbers — that is
        // the exact over-goal shame moment gentle mode exists to remove.
        if(!(typeof nutGentle==='function'&&nutGentle())) setTimeout(()=>{ if(typeof brotherSpeaks==='function') brotherSpeaks({ kind:'calorieOver', detail:{ over: Math.round(_sum-_gc) } }); }, 600);
      }
    }
  }catch(_){}
  // If this was a verified web-found product, offer to share it with the community (opt-in, private
  // otherwise). Verified online data is exactly what's worth sharing — others skip the web lookup.
  try{
    const wf = window.__lastWebFood;
    if(wf && _normLibName(wf.name) === _normLibName(currentFood.name) && sb && currentUser){
      window.__lastWebFood = null; // one-shot
      setTimeout(() => {
        document.querySelector('.undo-snack')?.remove();
        const snack = document.createElement('div');
        snack.className = 'undo-snack';
        snack.innerHTML = '<span class="undo-msg">Share "'+wf.name.replace(/</g,'&lt;').slice(0,28)+'" with the community?</span>'+
          '<button class="undo-btn" id="_share-btn">Share</button>'+
          '<button class="undo-close" id="_share-close" aria-label="Close">&#215;</button>';
        document.body.appendChild(snack);
        document.getElementById('_share-btn').onclick = () => {
          try{ contributeToSharedLibrary('food', wf.name, wf); showToast('Shared \u2713','Others can now find this.'); }catch(_){}
          snack.remove();
        };
        document.getElementById('_share-close').onclick = () => snack.remove();
        setTimeout(() => snack.remove(), 6000);
      }, 900);
    }
  }catch(_){}
}

// ── RECENT & FAVOURITE FOODS ──────────────────────────────────
// MFP's most-used convenience: re-log frequent foods in one tap. We store the food object
// (with servings/macros) keyed by name, tracking how often + how recently it's eaten.
// Single source of truth for "what meal is it right now" — used by time-aware logging,
// quick-log slotting, and the serving modal default. Was duplicated in 4 places.
function currentMealSlot(){
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}
function rememberRecentFood(food){
  if(!food || !food.name) return;
  // Track which meal-slot this food is usually eaten at, so the list can be time-aware:
  // at 8am we surface foods you normally have at breakfast. mealHits accumulates per slot.
  const slot = (typeof currentMealSlot==='function') ? currentMealSlot() : null;
  const recents = ls('totry_recent_foods') || [];
  const key = food.name.toLowerCase().trim();
  const existingIdx = recents.findIndex(f => f.name.toLowerCase().trim() === key);
  if(existingIdx > -1){
    // Bump count + recency, keep the stored macros
    recents[existingIdx].count = (recents[existingIdx].count || 1) + 1;
    recents[existingIdx].lastAt = Date.now();
    if(slot){ recents[existingIdx].mealHits = recents[existingIdx].mealHits || {}; recents[existingIdx].mealHits[slot] = (recents[existingIdx].mealHits[slot]||0)+1; }
    const item = recents.splice(existingIdx, 1)[0];
    recents.unshift(item);
  } else {
    recents.unshift({
      name: food.name,
      brand: food.brand || '',
      cal: food.cal, pro: food.pro, carb: food.carb, fat: food.fat,
      servings: food.servings || null,
      per100: !!food.per100,   // so _quickServing can label a serving-less entry '100g', not '1 serving'
      source: food.source || '',
      count: 1,
      lastAt: Date.now(),
      mealHits: slot ? {[slot]:1} : {},
      fav: false
    });
  }
  ls('totry_recent_foods', recents.slice(0, 60));
}
function toggleFavFood(name){
  const recents = ls('totry_recent_foods') || [];
  const f = recents.find(x => x.name.toLowerCase().trim() === name.toLowerCase().trim());
  if(f){ f.fav = !f.fav; ls('totry_recent_foods', recents); renderRecentFoods(); haptic('tap'); }
}
function logRecentFood(name){
  const recents = ls('totry_recent_foods') || [];
  const f = recents.find(x => x.name.toLowerCase().trim() === name.toLowerCase().trim());
  if(!f){ showToast('Not found', 'Search for it instead.'); return; }
  // Open the serving modal pre-loaded so they can confirm quantity/meal
  currentFood = {
    name: f.name, brand: f.brand, cal: f.cal, pro: f.pro, carb: f.carb, fat: f.fat,
    servings: f.servings || [{name:'1 serving', cal:f.cal, pro:f.pro, carb:f.carb, fat:f.fat}],
    source: f.source
  };
  if(typeof openServingModal === 'function') openServingModal(currentFood);
}
// MFP-style one-tap (+): logs the food instantly at default serving into the current meal slot,
// with a quick confirmation. No modal. This is what makes repeat logging "take seconds".
// MFP-style saved meals: group foods you eat together ("my usual breakfast") and log them in one tap.
async function saveMealGroup(meal){
  const today = (typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU');
  const entries = ((ls('totry_nutlog')||{})[today]||[]).filter(e => (e.meal||'snack') === meal);
  if(!entries.length){ showToast('Nothing to save', 'Log some foods in this meal first.'); return; }
  const name = await askText('Name this meal', 'For example: my usual breakfast.', {confirmLabel:'Save meal', value: meal.charAt(0).toUpperCase()+meal.slice(1)});
  if(!name) return;
  const saved = ls('totry_saved_meals')||[];
  saved.unshift({
    id: Date.now(), name: name.trim(),
    items: entries.map(e=>({name:e.name, brand:e.brand||'', serving:e.serving||'1 serving', qty:e.qty||1, cal:e.cal, pro:e.pro, carb:e.carb, fat:e.fat, source:e.source||''}))
  });
  ls('totry_saved_meals', saved.slice(0,30));
  haptic('success');
  showToast('Meal saved ✓', name + ' — log it anytime from My meals.');
  renderSavedMeals();
}
function logSavedMeal(id){
  const saved = ls('totry_saved_meals')||[];
  const m = saved.find(x=>x.id===id);
  if(!m){ return; }
  const today = (typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU');
  const log = ls('totry_nutlog')||{};
  if(!log[today]) log[today]=[];
  const hr = new Date().getHours();
  const meal = hr < 11 ? 'breakfast' : hr < 15 ? 'lunch' : hr < 21 ? 'dinner' : 'snack';
  m.items.forEach(it => {
    log[today].push({ id: Date.now()+Math.floor(Math.random()*100000), name:it.name, brand:it.brand||'', serving:it.serving||'1 serving', qty:it.qty||1, cal:it.cal, pro:it.pro, carb:it.carb, fat:it.fat, meal:meal, source:it.source||'', ts:(typeof nutStampFor==='function'?nutStampFor():new Date().toISOString()) });
  });
  ls('totry_nutlog', log);
  haptic('success');
  const totCal = m.items.reduce((a,i)=>a+(i.cal||0),0);
  showToast('Logged \u2713', (typeof nutGentle==='function'&&nutGentle()) ? m.name : (m.name + ' \u2014 ' + Math.round(totCal) + ' cal'));
  renderNutritionLog();
}
async function deleteSavedMeal(id){
  // A one-tap destructive action on a glyph a few pixels wide, with no undo anywhere in the app.
  if(!(await askConfirm('Delete this saved meal? You will have to build it again.'))) return;
  const _before = ls('totry_saved_meals')||[];
  const saved = _before.filter(x=>x.id!==id);
  tombstoneRemoved('totry_saved_meals', _before, saved);
  ls('totry_saved_meals', saved);
  renderSavedMeals();
}
function renderSavedMeals(){
  const box = document.getElementById('nut-saved-meals');
  if(!box) return;
  const saved = ls('totry_saved_meals')||[];
  if(!saved.length){ box.innerHTML=''; return; }
  box.innerHTML = '<div class="eyebrow" style="margin:4px 0 8px">My meals · one tap to log</div>' +
    saved.map(m => {
      const totCal = Math.round(m.items.reduce((a,i)=>a+(i.cal||0),0));
      return '<div class="food-result" style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
        '<div style="flex:1;min-width:0"><div class="fr-name">' + m.name.replace(/</g,'&lt;') + '</div>' +
        '<div class="fr-macros"><span class="fr-cal">' + totCal + ' cal</span><span style="color:var(--tx3)">' + m.items.length + ' item' + (m.items.length>1?'s':'') + '</span></div></div>' +
        '<button onclick="deleteSavedMeal('+m.id+')" style="background:none;border:none;color:var(--tx3);font-size:15px;cursor:pointer;padding:4px">&times;</button>' +
        '<button onclick="logSavedMeal('+m.id+')" title="Log this meal" style="background:var(--go);border:none;color:#1a1505;font-size:18px;font-weight:700;width:34px;height:34px;border-radius:8px;cursor:pointer;flex-shrink:0;line-height:1">+</button>' +
      '</div>';
    }).join('');
}

// MFP-style one-tap log from a search result: logs at default serving into the time-based
// meal slot, remembers it for next time. Tapping the row instead opens the portion editor.
// What ONE tap of (+) should actually log.
//
// Open Food Facts results carry per-100g/ml macros at the top level (per100:true) and the product's
// REAL serving, correctly scaled, in servings[0]. The quick-log paths read the top level and labelled
// it "1 serving", so tapping (+) on a 25g chocolate bar logged ~535 cal while tapping the ROW — which
// opens the serving modal and honours servings[0] — logged ~134. Two buttons on the same row, wildly
// different numbers, and the diary line said "1 serving" so nothing on screen revealed which you got.
// Wrong numbers flow straight into the day total, the rings, the weekly average and adaptive TDEE.
function _quickServing(food){
  try{
    if(food && typeof getFoodOverride==='function' && getFoodOverride(food) && typeof applyFoodOverride==='function'){
      // shallow copy: the caller's object (a search result, a recents row) must not be rewritten
      food = applyFoodOverride(Object.assign({}, food, {servings: (food.servings||[]).map(x=>Object.assign({}, x))}));
    }
  }catch(_){ }
  const s = (food && Array.isArray(food.servings) && food.servings.length) ? food.servings[0] : null;
  if(s && s.cal != null){
    return { label: s.name || (s.gramsEquiv ? s.gramsEquiv+'g' : '1 serving'),
             cal: s.cal, pro: s.pro, carb: s.carb, fat: s.fat };
  }
  // No serving info: say plainly that this is the per-100 figure rather than calling it "1 serving".
  return { label: food && food.per100 ? (food._ml ? '100ml' : '100g') : '1 serving',
           cal: food.cal, pro: food.pro, carb: food.carb, fat: food.fat };
}
function quickLogSearchFood(food){
  const _qs = _quickServing(food);
  const today = (typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU');
  const log = ls('totry_nutlog') || {};
  if(!log[today]) log[today] = [];
  const hr = new Date().getHours();
  const meal = hr < 11 ? 'breakfast' : hr < 15 ? 'lunch' : hr < 21 ? 'dinner' : 'snack';
  log[today].push({
    id: Date.now() + Math.floor(Math.random()*100000),
    name: food.name, brand: food.brand || '',
    serving: _qs.label, qty: 1,
    cal: _qs.cal, pro: _qs.pro, carb: _qs.carb, fat: _qs.fat,
    meal: meal, source: food.source || '', ts: (typeof nutStampFor==='function'?nutStampFor():new Date().toISOString())
  });
  ls('totry_nutlog', log);
  if(typeof rememberRecentFood === 'function') rememberRecentFood(food);
  haptic('success');
  showToast('Logged \u2713', (typeof nutGentle==='function'&&nutGentle()) ? food.name : (food.name + ' \u2014 ' + _qs.cal + ' cal \u00b7 ' + _qs.label));
  renderNutritionLog();
}
function quickLogRecent(name){
  const recents = ls('totry_recent_foods') || [];
  const f = recents.find(x => x.name.toLowerCase().trim() === name.toLowerCase().trim());
  if(!f){ showToast('Not found', 'Search for it instead.'); return; }
  const _qs = _quickServing(f);
  const today = (typeof nutDayKey==='function')?nutDayKey():new Date().toLocaleDateString('en-AU');
  const log = ls('totry_nutlog') || {};
  if(!log[today]) log[today] = [];
  // Best-guess meal slot by time of day
  const hr = new Date().getHours();
  const meal = hr < 11 ? 'breakfast' : hr < 15 ? 'lunch' : hr < 21 ? 'dinner' : 'snack';
  log[today].push({
    id: Date.now() + Math.floor(Math.random()*100000),
    name: f.name, brand: f.brand || '',
    serving: _qs.label, qty: 1,
    cal: _qs.cal, pro: _qs.pro, carb: _qs.carb, fat: _qs.fat,
    meal: meal, source: f.source || '', ts: (typeof nutStampFor==='function'?nutStampFor():new Date().toISOString())
  });
  ls('totry_nutlog', log);
  rememberRecentFood(f); // bump its recency/count
  haptic('success');
  showToast('Logged \u2713', (typeof nutGentle==='function'&&nutGentle()) ? f.name : (f.name + ' \u2014 ' + _qs.cal + ' cal \u00b7 ' + _qs.label));
  renderNutritionLog();
}
function renderRecentFoods(){
  const box = document.getElementById('nut-recent-foods');
  if(!box) return;
  const recents = ls('totry_recent_foods') || [];
  if(!recents.length){ box.innerHTML = ''; return; }
  const slot = currentMealSlot();
  const slotLabel = {breakfast:'breakfast', lunch:'lunch', dinner:'dinner', snack:'now'}[slot];
  const now = Date.now();
  // Score each food: frequency (how often you log it) + recency + a strong boost if you
  // usually eat it at THIS meal. So at 8am your usual breakfasts rise to the top. Favourites
  // always pin first. This makes the list feel like it read your mind, with zero input.
  const scored = recents.map(f => {
    const count = f.count || 1;
    const daysSince = f.lastAt ? (now - f.lastAt)/86400000 : 30;
    const recencyBoost = Math.max(0, 14 - daysSince);        // logged in last fortnight = boost
    const mealHits = (f.mealHits && f.mealHits[slot]) || 0;  // times eaten at this slot
    const totalHits = f.mealHits ? Object.values(f.mealHits).reduce((a,b)=>a+b,0) : 0;
    const mealAffinity = totalHits ? (mealHits/totalHits) : 0;
    const score = (count * 2) + recencyBoost + (mealAffinity * 12) + (mealHits * 3);
    return { f, score };
  });
  const favs = scored.filter(s => s.f.fav).map(s => s.f);
  const rest = scored.filter(s => !s.f.fav).sort((a,b) => b.score - a.score).slice(0, 8).map(s => s.f);
  const show = [...favs, ...rest];
  if(!show.length){ box.innerHTML = ''; return; }
  box.innerHTML = '<div class="eyebrow" style="margin:4px 0 8px">Your usual for ' + slotLabel + ' · tap + to log</div>' +
    show.map(f => {
      const star = f.fav ? '★' : '☆';
      const starColor = f.fav ? 'var(--go)' : 'var(--tx3)';
      const safe = f.name.replace(/'/g,"\\'").replace(/</g,'&lt;');
      // The serving the (+) button will log — the same source of truth quickLogRecent uses.
      const _qs = (typeof _quickServing === 'function') ? _quickServing(f) : { cal: f.cal, pro: f.pro, label: '' };
      return '<div class="food-result" style="display:flex;align-items:center;justify-content:space-between;gap:6px">' +
        '<div style="flex:1;cursor:pointer;min-width:0" onclick="logRecentFood(&apos;' + safe + '&apos;)">' +
          '<div class="fr-name">' + f.name.replace(/</g,'&lt;') + '</div>' +
          // SHOW WHAT THE (+) WILL ACTUALLY LOG. This printed f.cal — which for a scanned product is
          // the per-100g figure — while the (+) beside it logs _quickServing(f), the real serving. A
          // 50g bar read "488 cal" and logged 244. Someone at 1,900 of a 2,100 target decides they
          // cannot afford a number the app was never going to record. The search list one screen up
          // was already repaired for exactly this (_makeFoodResultRow); this list was missed, and it
          // showed no unit either, so there was nothing on screen to reveal the mismatch.
          (( typeof nutGentle==='function' && nutGentle() )
            ? ('<div class="fr-macros"><span style="color:var(--tx3)">' + _escFew(String(_qs.label || '')) + '</span>' +
               (f.count>1?'<span style="color:var(--tx3)">×'+f.count+'</span>':'') + '</div>')
            : ('<div class="fr-macros"><span class="fr-cal">' + _qs.cal + ' cal</span><span>P' + _qs.pro + '</span>' +
               '<span style="color:var(--tx3)">' + _escFew(String(_qs.label || '')) + '</span>' +
               (f.count>1?'<span style="color:var(--tx3)">×'+f.count+'</span>':'') + '</div>')) +
        '</div>' +
        '<button onclick="toggleFavFood(&apos;' + safe + '&apos;)" style="background:none;border:none;color:' + starColor + ';font-size:18px;cursor:pointer;padding:4px;flex-shrink:0">' + star + '</button>' +
        '<button onclick="quickLogRecent(&apos;' + safe + '&apos;)" title="Log instantly" style="background:var(--go);border:none;color:#1a1505;font-size:18px;font-weight:700;width:34px;height:34px;border-radius:8px;cursor:pointer;flex-shrink:0;line-height:1">+</button>' +
      '</div>';
    }).join('');
}
// ── NUTRITION STREAK (LoseIt/MFP retention rip) ──
function computeNutStreak(){
  const log = ls('totry_nutlog') || {};
  let streak = 0; const today = new Date();
  const has = d => { const k = d.toLocaleDateString('en-AU'); return (log[k]||[]).length > 0; };
  const cur = new Date(today);
  if(!has(cur)) cur.setDate(cur.getDate() - 1); // today not logged yet — streak still alive from yesterday
  while(has(cur)){ streak++; cur.setDate(cur.getDate() - 1); }
  return { n: streak, todayLogged: has(today) };
}
function celebrateNutMilestone(n){
  const MS = [3,7,14,30,60,100,365];
  if(!MS.includes(n)) return;
  const done = ls('totry_nutms') || [];
  if(done.includes(n)) return;
  done.push(n); ls('totry_nutms', done);
  haptic('success');
  showToast('\ud83d\udd25 ' + n + '-day logging streak', n >= 30 ? 'This is a habit now. Most people never get here.' : 'Consistency is the whole game. Keep going.');
}

// ── WEEKLY FOOD GROUP INSIGHTS (MFP 2025 winter-release rip) ──
function classifyFoodGroup(name){
  const n = (name||'').toLowerCase();
  const hit = ws => ws.some(w => n.includes(w));
  if(hit(['chicken','beef','steak','egg','fish','tuna','salmon','pork','lamb','turkey','mince','tofu','whey','protein','prawn','shrimp','kebab'])) return 'Protein';
  if(hit(['broccoli','spinach','salad','carrot','vege','veggie','beans','peas','capsicum','tomato','cucumber','lettuce','cauliflower','pumpkin','zucchini','onion','mushroom'])) return 'Veg';
  if(hit(['apple','banana','berr','orange','mango','grape','melon','pear','peach','kiwi','pineapple','fruit'])) return 'Fruit';
  if(hit(['rice','bread','oat','pasta','wrap','cereal','noodle','potato','quinoa','toast','bagel','roti','naan','tortilla'])) return 'Grains';
  if(hit(['milk','yogurt','yoghurt','cheese','dairy'])) return 'Dairy';
  if(hit(['chocolate','cake','biscuit','chip','ice cream','icecream','lolly','candy','cookie','donut','soft drink','soda','coke','pastry','dessert'])) return 'Treats';
  return null;
}
// One malformed day used to take the WHOLE tab down. Sixty-eight places read totry_nutlog and ten of
// them guard with `|| []`, which covers a day that is MISSING and not one that is the wrong shape —
// so a single old-format or half-merged day threw inside renderFoodGroups, go('nourish') never
// finished, and Nourish rendered nothing at all. A person cannot repair that; they just see a dead
// tab. Repairing once at the read keeps every other caller honest without touching sixty-eight sites.
function nutLogSafe(){
  const log = ls('totry_nutlog') || {};
  let bad = 0;
  for(const k in log) if(!Array.isArray(log[k])){ delete log[k]; bad++; }
  if(bad) try{ ls('totry_nutlog', log); }catch(_){ }
  return log;
}

function renderFoodGroups(){
  const box = document.getElementById('nut-foodgroups'); if(!box) return;
  const log = nutLogSafe();
  const counts = { Protein:0, Veg:0, Fruit:0, Grains:0, Dairy:0, Treats:0 };
  let total = 0, unknown = 0;
  for(let i = 0; i < 7; i++){
    const d = new Date(); d.setDate(d.getDate() - i);
    (log[d.toLocaleDateString('en-AU')]||[]).forEach(e => {
      // Only classified foods were counted, and nothing tracked how many were NOT — so a week whose
    // pizza, curry and burrito the classifier does not know still produced "A genuinely balanced week.
    // Keep this shape." from whatever it happened to recognise. A verdict on a fifth of the evidence.
    const g = classifyFoodGroup(e.name); if(g){ counts[g]++; total++; } else { unknown++; }
    });
  }
  if(total < 5){ box.innerHTML = ''; return; } // not enough data to say anything honest
  let nudge = '';
  if(counts.Veg < 4) nudge = 'Vegetables are the quiet gap this week.';
  else if(counts.Fruit < 3) nudge = 'Fruit barely featured this week.';
  else if(counts.Protein < 7) nudge = 'Protein sources were thin this week.';
  else if(counts.Treats > counts.Veg) nudge = 'Treats outnumbered vegetables this week \u2014 worth noticing.';
  else nudge = 'A genuinely balanced week. Keep this shape.';
  // If it could not place a third of what was eaten, it has not seen the week and must not grade it.
  const _seen = total + unknown;
  if(_seen > 0 && unknown / _seen > 0.33)
    nudge = 'I could only place ' + Math.round((total/_seen)*100) + '% of what you logged, so this is a partial picture.';
  const order = ['Protein','Veg','Fruit','Grains','Dairy','Treats'];
  box.innerHTML = '<div class="card" style="margin-bottom:12px"><div class="card-hd" style="margin-bottom:6px">Food groups \u00b7 last 7 days</div>'+
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">'+
    order.map(g => '<span style="font-family:DM Mono,monospace;font-size:10px;padding:4px 9px;border-radius:20px;background:var(--bg3);border:1px solid var(--bd);color:'+(counts[g]>0?'var(--tx2)':'var(--tx3)')+'">'+g+' '+counts[g]+'</span>').join('')+
    '</div><div style="font-size:12px;color:var(--tx3);line-height:1.5">'+nudge+' <span style="opacity:0.7">(rough read from food names)</span></div></div>';
}

// ── NOURISHMENT SCORE ──────────────────────────────────────────────────────────────────────────
// The word is "Nourish", not "Count calories". This answers what the macro ring can't: was today
// actually NOURISHING? Deterministic, from reliable always-present signals — protein (satiety +
// muscle), fibre (the whole-food marker), and sugar restraint — so it never hangs on spotty
// micronutrient data. Micros are an informational footnote, never a penalty (a whole-food meal
// logged by text often carries no micro data and shouldn't be punished for it). Shows only once
// enough of the day is logged to judge it fairly.
function nourishmentScore(totals, goals){
  if(!totals) return null;
  const cal = totals.cal||0;
  const goalCal = (goals && goals.cal) || 2100;
  if(cal < Math.max(500, goalCal*0.35)) return null;         // too little logged to be fair
  const goalPro = (goals && goals.pro) || 150;
  const pPro = Math.min(40, 40 * (totals.pro||0) / Math.max(1, goalPro));   // protein — the king
  const fibreTarget = Math.max(25, cal/1000 * 14);                          // ~14g / 1000 kcal
  const pFib = Math.min(35, 35 * (totals.fiber||0) / fibreTarget);
  const sugarShare = cal>0 ? ((totals.sugar||0)*4)/cal : 0;                 // lenient — total sugar includes fruit
  let pSug; if(sugarShare<=0.10) pSug=25; else if(sugarShare>=0.30) pSug=0; else pSug=25*(1-(sugarShare-0.10)/0.20);
  // A day of oats, banana, broccoli and chicken scored 65 and was told "fibre is where today is
  // light". It was not light — it was UNKNOWN. Most entries in this app carry calories and protein and
  // nothing else, so totals.fiber is 0 for a person who ate plenty of it, and 35 points of the 100
  // were being deducted for a number nobody ever recorded. Zero is not the same as unknown, and a
  // score that punishes you for the app's own blind spot is worse than no score.
  //
  // A component the day has no data for drops OUT of the total and the remaining weights are rescaled,
  // so the number means "of what I can actually see". If nothing is knowable, there is no score.
  const _known = [];
  if((totals.pro||0) > 0)   _known.push({p:pPro, w:40});
  if((totals.fiber||0) > 0) _known.push({p:pFib, w:35});
  if((totals.sugar||0) > 0 || (totals.carb||0) > 0) _known.push({p:pSug, w:25});
  if(!_known.length) return null;
  const _wSum = _known.reduce((a,x)=>a+x.w, 0);
  const _pSum = _known.reduce((a,x)=>a+x.p, 0);
  const score = Math.max(0, Math.min(100, Math.round(_pSum * (100/_wSum))));
  const dims = [
    {pct:pPro/40, tip:'A protein source at the next meal would lift this most.'},
    {pct:(totals.fiber||0) > 0 ? pFib/35 : 1, tip:'More veg, fruit, beans or whole grains — fibre is where today is light.'},
    {pct:((totals.sugar||0) > 0 || (totals.carb||0) > 0) ? pSug/25 : 1, tip:'Sugar’s running high as a share of today — worth easing back.'}
  ].sort((a,b)=>a.pct-b.pct);
  // A strong day earns an affirmation, not a "you're light on X" nudge.
  // This line names fibre explicitly, so it cannot be said on a day whose entries carry no fibre at
  // all — that is the same overclaim as scoring the unknown zero, just pointed the other way. Name
  // only what was actually read.
  const _fibKnown = (totals.fiber||0) > 0;
  const tip = dims[0].pct > 0.85
    ? (_fibKnown ? 'Protein, fibre and whole foods all here — this is what nourished looks like.'
                 : 'Protein is well covered today — that is the part that carries the most.')
    : dims[0].tip;
  const MICROS=['vit_a','vit_c','vit_d','vit_e','vit_k','b1','b2','b3','b6','b9','b12','calcium','iron','magnesium','phosphorus','potassium','zinc','selenium','copper'];
  const microsHit=MICROS.filter(k=>(totals[k]||0)>0).length;
  let tier, col;
  if(score>=85){ tier='Deeply nourishing'; col='var(--gr)'; }
  else if(score>=70){ tier='Nourishing'; col='var(--gr)'; }
  else if(score>=50){ tier='Getting there'; col='var(--go)'; }
  else { tier='Light on nourishment'; col='var(--go)'; }
  // What the score was actually able to see. Rescaling for unknowns fixed the number and left the
  // copy claiming "Protein, fibre and whole foods all here" on a day where fibre was never recorded —
  // the same lie in the other direction. The card says which parts it read, so a 100 based on protein
  // alone cannot be mistaken for a 100 based on everything.
  const basis = _known.length === 3 ? null
    : ('Scored on ' + _known.map(function(x){ return x.w===40?'protein':x.w===35?'fibre':'sugar'; }).join(' and ') +
       ' \u2014 the rest was not in what you logged.');
  return { score, tier, col, tip, basis, microsHit, microsTotal:MICROS.length };
}
// The diary that COACHES, not just counts — a single actionable, time-of-day-aware, grace-first line.
// Protein-first (it's what this audience is chasing); over-cal is met with grace; under-cal warns
// against undereating (anti-ED); a hit target is affirmed. No mainstream tracker turns the log into
// counsel like this. Returns {tone,text} or '' (nothing logged yet / nothing worth saying).
function _nutrientNudge(totals, goals){
  try{
    if(!goals || !goals.cal || !totals || !(totals.cal>0)) return '';
    const h=new Date().getHours();
    const calLeft=Math.round((goals.cal||0)-(totals.cal||0));
    const proLeft=Math.round((goals.pro||0)-(totals.pro||0));
    const proPct=goals.pro?(totals.pro/goals.pro):1;
    const dayLeft = h<11?'most of the day':h<15?'lunch and dinner':h<19?'dinner':h<22?'a snack':'the day almost done';
    // Over on calories — grace, never shame.
    if(totals.cal > goals.cal*1.1){ return {tone:'over', text:'About '+Math.abs(calLeft)+' cal over today — no drama, tomorrow resets. Still hungry? Lean protein and veg.'}; }
    // Protein short with eating time left — the highest-value nudge, with a concrete fix.
    if(proLeft>=25 && h<22){
      const fix = proLeft>=45?'a chicken breast or a shake':proLeft>=30?'Greek yogurt or a shake':'a couple of eggs';
      return {tone:'protein', text:proLeft+'g short on protein with '+dayLeft+' to go — '+fix+' gets you there.'};
    }
    // Comfortably under with the day nearly done — warn against undereating.
    if(calLeft>350 && h>=19){ return {tone:'under', text:calLeft+' cal still to go — room for a proper dinner. Don’t undereat; fuel the work.'}; }
    // Protein handled — affirm it (the day is working).
    if(proPct>=0.95 && h>=15){ return {tone:'good', text:'Protein’s handled ('+Math.round(totals.pro)+'g). That’s the day working.'}; }
    return '';
  }catch(_){ return ''; }
}
function renderNourishmentScore(totals, goals){
  const box=document.getElementById('nourishment-score'); if(!box) return;
  const r=(typeof nourishmentScore==='function')?nourishmentScore(totals, goals):null;
  if(!r){ box.innerHTML=''; return; }
  const C=2*Math.PI*22;
  box.innerHTML=
    '<div class="card" style="background:var(--bg2)">'+
      '<div style="display:flex;align-items:center;gap:14px">'+
        '<div style="position:relative;width:54px;height:54px;flex:none">'+
          '<svg viewBox="0 0 54 54" style="width:54px;height:54px;transform:rotate(-90deg)">'+
            '<circle cx="27" cy="27" r="22" fill="none" stroke="var(--bg4)" stroke-width="5"/>'+
            '<circle cx="27" cy="27" r="22" fill="none" stroke="'+r.col+'" stroke-width="5" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+(C*(1-r.score/100)).toFixed(1)+'"/>'+
          '</svg>'+
          '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:16px;color:var(--tx)">'+r.score+'</div>'+
        '</div>'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em">Nourishment · today</div>'+
          '<div style="font-size:15px;color:'+r.col+';font-weight:600">'+r.tier+'</div>'+
          '<div style="font-size:11.5px;color:var(--tx3);line-height:1.4;margin-top:2px">'+r.tip+'</div>'+
      (r.basis ? '<div style="font-size:10.5px;color:var(--tx3);opacity:.75;line-height:1.4;margin-top:5px">'+
        _escFew(r.basis)+'</div>' : '')+
        '</div>'+
      '</div>'+
      (r.microsHit>0?'<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)">'+r.microsHit+' of '+r.microsTotal+' vitamins &amp; minerals covered today</div>':'')+
    '</div>';
}
// ── GENTLE MODE — numbers off, nourishment still counted ─────────────────────────────────────────
// The evidence here is blunt: calorie-tracking UIs elicit perfectionist, all-or-nothing thinking —
// a known eating-disorder risk factor — and a large share of people in ED treatment say a tracking
// app contributed to theirs. So To Try ships the antidote no mainstream tracker will: keep the
// LOGGING (the whole-life counsel still works — energy, training, recovery) but let a person turn
// the NUMBERS OFF. Food as fuel for a life, not a maths test to win. Never a red "over budget".
// ONE gentle-aware nutrition block for EVERY prompt builder.
//
// "Numbers off" is a promise that this person does not see calorie or macro figures — usually because
// counting them is the thing that hurt them. lifeStateBrief() honoured it. buildCtx() (the live Coach
// prompt) did not: it handed the model the raw figures under a "TODAY (live data, right now)" header
// and then instructed it to "Reference their actual numbers when it matters." buildPTCtx() did not
// either, and it embeds the brief — so that single prompt carried the raw calories AND an instruction
// never to state a calorie count, in the same breath.
//
// So the diary hid the number and the coach said it out loud. Three builders, one rule, one place.
function nutPromptBlock(eaten, protein, goalCal, goalPro, meals){
  const _n = (v) => (v == null || (typeof v === 'number' && !isFinite(v))) ? 0 : v;
  eaten=_n(eaten); protein=_n(protein); meals=_n(meals);
  if(typeof nutGentle==='function' && nutGentle()){
    const _gw=(typeof _gentleWord==='function')?_gentleWord(eaten, goalCal):null;
    const _where=_gw ? (_gw.w+' ('+_gw.s+')') : 'logged';
    return '- Nutrition: this person has NUMBERS TURNED OFF \u2014 they log food without ever seeing calories '+
      'or macros. Today reads as: '+_where+' across '+meals+' meal'+(meals===1?'':'s')+'. '+
      'CRITICAL: never state a calorie count, a macro gram figure, a deficit, a surplus or a target number, '+
      'even if asked directly. Speak in food, portions, energy and how they feel. If they ask for a number, '+
      'tell them kindly that you are holding the maths for them.';
  }
  const calPct = goalCal ? Math.round((eaten/goalCal)*100) : 0;
  const proPct = goalPro ? Math.round((protein/goalPro)*100) : 0;
  return '- Nutrition so far: '+eaten+' cal ('+calPct+'% of '+goalCal+'), '+protein+'g protein ('+proPct+'% of '+goalPro+'g) across '+meals+' meal'+(meals===1?'':'s');
}
function nutGentle(){ try{ return !!ls('totry_nut_gentle'); }catch(_){ return false; } }
function toggleNutGentle(){
  const on = !nutGentle();
  try{ ls('totry_nut_gentle', on); }catch(_){}
  try{ if(typeof haptic==='function') haptic('tap'); }catch(_){}
  try{ showToast(on?'Numbers off':'Numbers back on',
    on?'Keep logging — I’ll hold the maths. You’ll still get counsel, just no numbers to fight with.'
      :'Full detail is back. You can turn it off again any time.'); }catch(_){}
  try{ renderNutritionLog(); }catch(_){}
}
function _gentleWord(eaten, goal){
  if(!(eaten>0)) return { w:'—', s:'nothing logged yet' };
  if(!(goal>0))  return { w:'Fed', s:'today' };
  const p = eaten/goal;
  if(p<0.35) return { w:'Started', s:'early yet' };
  if(p<0.70) return { w:'On your way', s:'today' };
  if(p<1.10) return { w:'Nourished', s:'today' };
  return { w:'Fed well', s:'today' };
}
function _gentleCounsel(eaten, goal){
  const _past = (typeof nutIsToday==='function') && !nutIsToday();
  if(_past) return (eaten>0) ? 'Logged for that day. Filling a gap honestly is worth more than a tidy record.' : 'Nothing logged that day. A gap isn’t a failure — put in what you remember.';
  if(!(eaten>0)) return 'Nothing logged yet. When you eat, put it here — no numbers, no verdict.';
  if(!(goal>0))  return 'Logged. That’s all this needs to be.';
  const p = eaten/goal;
  const hr = new Date().getHours();
  if(p<0.5 && hr>=17) return 'That’s a light day so far. Not a rule to obey — just worth asking whether your body’s actually been fed.';
  if(p<0.7 && hr>=20) return 'Lighter day. If you’re hungry, eat — under-fuelling costs you tomorrow more than it saves you today.';
  if(p>=1.10) return 'You’ve eaten well today. That’s a body being fed, not a budget being broken. Nothing to make up for.';
  return 'You’re fed and on track. Nothing to fix — carry on with your day.';
}
// A quiet, caring check for a pattern that looks clinical rather than casual — sustained severe
// under-eating. It NEVER diagnoses and never shames: it offers the numbers-off mode and a real human.
function _nourishConcern(){
  try{
    // When sex is unset, use the LOWER floor. Guessing the higher one would flag a smaller person
    // eating perfectly well — and a false "you're not eating enough" is exactly the intrusive,
    // body-policing message this whole mode exists to avoid.
    const sx = (typeof userSex==='function') ? userSex() : null;
    const floor = (sx === 'male') ? 1500 : 1200;
    const log = ls('totry_nutlog') || {};
    let low=0, counted=0;
    for(let i=1;i<=7;i++){
      const k = new Date(Date.now()-i*86400000).toLocaleDateString('en-AU');
      const items = log[k];
      // A day only counts if they actually TRACKED it. One lonely entry is almost always someone who
      // started logging and stopped — reading that as under-eating would be the app inventing a
      // problem out of an incomplete diary.
      if(!items || items.length < 2) continue;
      counted++;
      const cal = items.reduce(function(a,x){ return a + (parseFloat(x.cal)||0); }, 0);
      if(cal>0 && cal<floor) low++;
    }
    return (counted>=3 && low>=3) ? { low:low, floor:floor } : null;
  }catch(_){ return null; }
}
function _renderNourishCare(){
  const el = document.getElementById('nut-care'); if(!el) return;
  const c = _nourishConcern();
  const weekKey = 'w'+Math.floor(Date.now()/(7*86400000));
  let shown=null; try{ shown = ls('totry_nourish_care_shown'); }catch(_){}
  if(!c || shown===weekKey){ el.style.display='none'; el.innerHTML=''; return; }
  el.style.display='block';
  el.innerHTML =
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:13px 15px;text-align:left">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px">Just checking in</div>'+
      '<div style="font-size:12.5px;color:var(--tx2);line-height:1.65;margin-bottom:10px">A few days this week came in low on what you logged. That might just be an unfinished diary — I can’t see what I don’t get told. But if counting has started to feel like something you can’t put down, that’s worth being honest about. You can keep logging with the numbers hidden, and talking to a real person about it is strength, not weakness.</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
        '<button class="btn" style="width:auto;padding:7px 12px;font-size:12px;background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go)" onclick="if(!nutGentle())toggleNutGentle();_dismissNourishCare()">Turn the numbers off</button>'+
        // Route to the FOOD-specific support that already exists (Butterfly Foundation, GP, Lifeline)
        // — the generic bridge names a priest and a mentor and never mentions eating at all.
        '<button class="btn" style="width:auto;padding:7px 12px;font-size:12px" onclick="_dismissNourishCare();if(typeof showEDSupport===\'function\')showEDSupport();else if(typeof bridgeToRealHelp===\'function\')bridgeToRealHelp(\'heavy\')">Talk to someone</button>'+
        '<button class="btn" style="width:auto;padding:7px 10px;font-size:12px;background:transparent;border:none;color:var(--tx3)" onclick="_dismissNourishCare()">I’m okay</button>'+
      '</div>'+
    '</div>';
}
function _dismissNourishCare(){
  try{ ls('totry_nourish_care_shown', 'w'+Math.floor(Date.now()/(7*86400000))); }catch(_){}
  const el=document.getElementById('nut-care'); if(el){ el.style.display='none'; el.innerHTML=''; }
}
// Applied at the END of the numeric render, so it wins over whatever the counters just painted.
function applyNutGentle(eaten, goalCal){
  const on = nutGentle();
  const g = function(id){ return document.getElementById(id); };
  const tb = g('nut-gentle-toggle');
  if(tb){ tb.textContent = on ? 'numbers off' : 'numbers on'; tb.style.color = on ? 'var(--go)' : 'var(--tx3)'; }
  // Every numeric surface in Nourish, not just the hero — a "numbers off" promise that leaks a red
  // over-budget figure two cards down is worse than no promise at all.
  const HIDE = ['nut-equation','nut-extended','nut-meal-split','nut-macro-glance','nut-nudge',
                'nut-net-card','nut-weekly-digest','nut-trend-card','adaptive-tdee-card'];
  // 'nut-extended' was in here, so turning gentle mode OFF forced the four extended macros back to
  // display:grid — including for a day whose entries carry no fibre, sugar, sodium or saturated fat,
  // which is exactly the case renderNutritionLog had just decided to hide. Two renderers disagreeing,
  // the later one winning, and four zeros telling a person who ate all day that he ate no fibre.
  // The equation is genuinely always-on; the extended row is conditional, so its owner keeps it.
  const RESTORE = { 'nut-equation':'flex' };
  const line = g('nut-gentle-line');
  if(on){
    HIDE.forEach(function(id){ const el=g(id); if(el) el.style.display='none'; });
    const num=g('nut-cal'), lbl=g('nut-cal-hero-lbl');
    const w=_gentleWord(eaten, goalCal);
    if(num){ num.textContent=w.w; num.style.color='var(--go)'; num.style.fontSize=(w.w.length>8?'12.5px':(w.w.length>6?'14px':'18px')); num.style.lineHeight='1.15'; num.style.maxWidth='74px'; num.style.textAlign='center'; num.style.whiteSpace='normal'; }
    if(lbl) lbl.textContent=w.s;
    ['nut-pro-goal-lbl','nut-carb-goal-lbl','nut-fat-goal-lbl'].forEach(function(id){ const el=g(id); if(el) el.textContent=''; });
    if(line){ line.style.display='block'; line.innerHTML='<div style="font-size:12px;color:var(--tx2);line-height:1.55;padding:9px 12px;background:var(--bg3);border:1px solid var(--bd);border-radius:10px">'+_escFew(_gentleCounsel(eaten, goalCal))+'</div>'; }
  } else {
    Object.keys(RESTORE).forEach(function(id){ const el=g(id); if(el && el.style.display==='none') el.style.display=RESTORE[id]; });
    const num=g('nut-cal'); if(num){ num.style.fontSize='26px'; num.style.maxWidth=''; num.style.lineHeight=''; num.style.whiteSpace=''; }
    if(line){ line.style.display='none'; line.innerHTML=''; }
  }
  try{ _renderNourishCare(); }catch(_){}
}

// ── NOURISH DAY NAVIGATION ──────────────────────────────────────────────────────────────────
// The offset lives in memory ONLY — never a storage key. Two reasons: nobody should reopen the app
// and find themselves silently stranded three days in the past, and 0 always means "today, right
// now", so midnight rollover needs no code at all.
let _nutDayOff = 0;              // 0 = today. Negative = days back. NEVER positive.
const NUT_DAY_MIN = -120;
function nutViewDate(){ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+_nutDayOff); return d; }
function nutDayKey(){ return nutViewDate().toLocaleDateString('en-AU'); }
function nutIsToday(){ return _nutDayOff === 0; }
// Key of N days BEFORE the day being viewed — so "yesterday" means the day before the one you're on.
function nutRelKey(daysAgo){ const d=nutViewDate(); d.setDate(d.getDate()-(daysAgo||0)); return d.toLocaleDateString('en-AU'); }
// A timestamp INSIDE the day being written to. Every ts-based reader (weekly digest, adaptive TDEE,
// the coach brief) buckets by ts — a backfilled entry stamped "now" would land on the wrong day.
function nutStampFor(){ if(nutIsToday()) return new Date().toISOString(); const d=nutViewDate(); d.setHours(12,0,0,0); return d.toISOString(); }
// The word the copy uses, so nothing ever says "today" about a day that isn't.
function nutDayWord(){ return nutIsToday() ? 'today' : 'that day'; }
function nutDayLabel(){
  if(_nutDayOff===0) return 'Today';
  if(_nutDayOff===-1) return 'Yesterday';
  return nutViewDate().toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'});
}
function nutShiftDay(delta){
  const next = Math.max(NUT_DAY_MIN, Math.min(0, _nutDayOff + delta));
  if(next === _nutDayOff){
    if(delta > 0) showToast('That day hasn’t happened yet','You can log today and any day behind it — never ahead.');
    return;
  }
  _nutDayOff = next;
  if(typeof haptic==='function') haptic('tap');
  renderNutritionLog();
}
function nutGoToday(){
  if(nutIsToday()) return;
  _nutDayOff = 0;
  if(typeof haptic==='function') haptic('light');
  renderNutritionLog();
  showToast('Back to today','Diary’s caught up. Log the rest as it happens.');
}
function nutPickDay(){
  const d0 = nutViewDate();
  const iso = d0.getFullYear()+'-'+String(d0.getMonth()+1).padStart(2,'0')+'-'+String(d0.getDate()).padStart(2,'0');
  openFormModal('Jump to a day','Any day up to today. Whatever you log lands on the day you pick.',
    [{id:'d', label:'Date', type:'date', value:iso}], 'Go to that day',
    function(v){
      if(!v.d) return 'Pick a date first.';
      const p = String(v.d).split('-').map(Number);
      if(p.length<3 || !p[0]) return 'That date didn’t read right.';
      const picked = new Date(p[0], p[1]-1, p[2], 12,0,0,0);
      const t = new Date(); t.setHours(12,0,0,0);
      const off = Math.round((picked - t)/86400000);
      if(off > 0) return 'That day hasn’t happened yet.';
      if(off < NUT_DAY_MIN) return 'The diary keeps about '+Math.abs(NUT_DAY_MIN)+' days.';
      _nutDayOff = off;
      if(typeof haptic==='function') haptic('tap');
      renderNutritionLog();
      return true;
    });
}
function renderNutDayNav(){
  const lbl=document.getElementById('nut-day-nav-lbl');
  const prev=document.getElementById('nut-day-prev');
  const next=document.getElementById('nut-day-next');
  const title=document.getElementById('nut-day-title');
  const ban=document.getElementById('nut-day-banner');
  const name=nutDayLabel();
  if(lbl) lbl.textContent=name;
  if(title) title.textContent=name;
  if(prev){ const cap=_nutDayOff<=NUT_DAY_MIN; prev.disabled=cap; prev.style.opacity=cap?'0.28':'1'; }
  if(next){ const t=nutIsToday(); next.disabled=t; next.style.opacity=t?'0.28':'1'; }
  if(!ban) return;
  if(nutIsToday()){ ban.style.display='none'; ban.innerHTML=''; return; }
  const n=((ls('totry_nutlog')||{})[nutDayKey()]||[]).length;
  const ago=Math.abs(_nutDayOff);
  ban.style.display='block';
  ban.innerHTML='<div style="display:flex;align-items:center;gap:10px;background:var(--go-bg);border:1px solid var(--go-bd);border-radius:10px;padding:10px 12px;margin-bottom:12px">'+
    '<div style="font-size:16px;flex-shrink:0">🗓</div>'+
    '<div style="flex:1;min-width:0;font-size:12.5px;color:var(--tx2);line-height:1.55">You’re on <span style="color:var(--go)">'+_escFew(name)+'</span> · '+ago+' day'+(ago===1?'':'s')+' back. Anything you log lands on that day.'+
      (n?'':' Nothing logged then — a gap isn’t a failure, it’s just a gap. Fill it in if you remember.')+'</div>'+
    '<button onclick="nutGoToday()" style="flex-shrink:0;background:var(--go);border:none;color:#1a1505;border-radius:8px;padding:7px 11px;font-size:12px;font-weight:600;cursor:pointer">Today</button>'+
  '</div>';
}

function renderNutritionLog(){
  if(typeof renderAdaptiveNutrition==='function') renderAdaptiveNutrition();
  // Before any of the empty-plate early returns below — the brand-new user with nothing logged is
  // exactly who needs the "set a real target" nudge, so it must run up here, not after.
  if(typeof renderNutSetupNudge==='function') renderNutSetupNudge();
  try{ renderNutDayNav(); }catch(_){}
  const today=nutDayKey();
  const dateEl=document.getElementById('nut-date');
  if(dateEl){
    const st = computeNutStreak();
    dateEl.textContent = today;
    if(st.n >= 2){
      dateEl.innerHTML = today + ' <span style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);margin-left:6px">\ud83d\udd25 ' + st.n + '-day streak' + (st.todayLogged ? '' : ' \u00b7 log today to keep it') + '</span>';
      if(st.todayLogged) celebrateNutMilestone(st.n);
    }
  }
  if(typeof renderFoodGroups === 'function') renderFoodGroups();
  if(typeof renderQuickFoods === 'function') renderQuickFoods();
  if(typeof syncNutSecondary === 'function') syncNutSecondary();
  const log=ls('totry_nutlog')||{};const entries=log[today]||[];
  let goals=(typeof withDerivedMacros==='function')?withDerivedMacros(ls('totry_nut_goals')||defaultNutGoals()):(ls('totry_nut_goals')||defaultNutGoals());
  // Calorie/carb cycling: if it's on, TODAY's displayed target is the cycled one (training vs rest),
  // while the stored goal stays the flat weekly base. A transform, never a rewrite.
  let _cyc = null;
  try{ if(typeof cycledTarget==='function'){ const c=cycledTarget(goals); if(c){ _cyc=c; goals=c; } } }catch(_){}
  try{ if(typeof renderCycleBadge==='function') renderCycleBadge(_cyc); }catch(_){}
  try{ if(typeof renderCyclingSetup==='function') renderCyclingSetup(); }catch(_){}

  // Aggregate macros + micros across the day
  const MICRO_KEYS = ['fiber','sugar','sodium','sat_fat','cholesterol',
                      'vit_a','vit_c','vit_d','vit_e','vit_k',
                      'b1','b2','b3','b6','b9','b12',
                      'calcium','iron','magnesium','phosphorus','potassium','zinc','selenium','copper'];
  const totals = entries.reduce((a,e) => {
    a.cal += (e.cal||0);
    a.pro += (e.pro||0);
    a.carb += (e.carb||0);
    a.fat += (e.fat||0);
    MICRO_KEYS.forEach(k => { a[k] = (a[k] || 0) + (e[k] || 0); });
    return a;
  }, {cal:0, pro:0, carb:0, fat:0});
  try{ if(typeof renderNourishmentScore==='function') renderNourishmentScore(totals, goals); }catch(_){}
  try{ if(typeof renderHungerNudge==='function') renderHungerNudge(); }catch(_){}
  try{ const _nEl=document.getElementById('nut-nudge'); if(_nEl){ const _nd=(typeof _nutrientNudge==='function')?_nutrientNudge(totals,goals):''; if(_nd&&_nd.text){ const _c=_nd.tone==='over'?'var(--re)':_nd.tone==='good'?'var(--gr)':'var(--go)'; _nEl.style.display='block'; _nEl.innerHTML='<div style="font-size:12px;color:'+_c+';line-height:1.55;padding:9px 12px;background:var(--bg3);border:1px solid var(--bd);border-radius:10px;margin-top:10px">'+_nd.text+'</div>'; } else { _nEl.style.display='none'; _nEl.innerHTML=''; } } }catch(_){}
  
  // Net calories: consumed − burned (from workouts, screenshots, Strava)
  const burns = ls('totry_calorie_burns') || {};
  const burned = Math.round(burns[today] || 0);
  const net = Math.round(totals.cal) - burned;
  // With nothing burned, net IS what he ate — the same 1130 the ring and the equation already showed,
  // presented as a third fact. A card that repeats a number teaches the person to stop reading cards.
  // It earns its place the moment training has moved it.
  const netCard = document.getElementById('nut-net-card');
  if(netCard && !nutGentle()) netCard.style.display = burned > 0 ? '' : 'none';
  const netEl = document.getElementById('nut-net-calories');
  const netDetail = document.getElementById('nut-net-detail');
  if(netEl){
    netEl.textContent = net + ' cal';
    netEl.style.color = (net > goals.cal * 1.1) ? 'var(--re)' : (net < goals.cal * 0.5 && totals.cal > 0) ? 'var(--go)' : 'var(--tx)';
  }
  if(netDetail){
    netDetail.textContent = 'In: ' + Math.round(totals.cal) + ' · Burned: ' + burned;
    // Eat-back, but goal-aware. For someone CUTTING, burned calories are deficit *progress* —
    // telling them to eat it back works against their goal. For bulk/maintain, it's fuel earned.
    const fuelEl = document.getElementById('nut-fuel-earned');
    if(fuelEl){
      // Resolve goal direction the same way the rest of the app does.
      const tdeeData = ls('totry_tdee_data');
      let goalDir = 'maintain';
      const gi = ls('totry_goal_intent'); // 'cut' / 'maintain' / 'build'
      if(tdeeData && tdeeData.goal){ goalDir = tdeeData.goal === 'lose' ? 'cut' : tdeeData.goal === 'gain' ? 'build' : 'maintain'; }
      else if(gi){ goalDir = gi; }
      else { const pref = ls('totry_calorie_goal_type'); if(pref==='lose') goalDir='cut'; else if(pref==='gain') goalDir='build'; }
      // Prefer TOTAL calories burned (active + BMR) for a true deficit; fall back to the burn number.
      const ev = ritualLog('totry_evenings').find(x => x.ts && new Date(x.ts).toLocaleDateString('en-AU') === today);
      const totalBurned = (ev && ev.rings && ev.rings.total) ? ev.rings.total : null;
      if(burned >= 150 || (goalDir==='cut' && totalBurned)){
        if(goalDir === 'cut'){
          // Deficit framing: show how much of a deficit they've created today.
          if(totalBurned && totals.cal > 0){
            const deficit = Math.round(totalBurned - totals.cal);
            if(deficit > 0){
              fuelEl.innerHTML = '<span style="color:var(--gr)">📉 Deficit today: ~'+deficit.toLocaleString()+' cal.</span> You\'ve eaten '+Math.round(totals.cal).toLocaleString()+' against ~'+totalBurned.toLocaleString()+' burned. That gap is the work of a cut — steady wins it.';
            } else {
              fuelEl.innerHTML = '<span style="color:var(--go)">You\'re about '+Math.abs(deficit).toLocaleString()+' cal over your burn today.</span> One day won\'t undo a cut — the weekly average is what moves the needle.';
            }
          } else {
            fuelEl.innerHTML = '<span style="color:var(--gr)">🔥 You burned about '+burned+' cal training today</span> — that\'s deeper into your deficit. Hold the line; you don\'t need to eat it back on a cut.';
          }
        } else {
          // Bulk / maintain: fuel earned.
          fuelEl.innerHTML = '<span style="color:var(--go)">🔥 You trained today</span> — that\'s about '+burned+' extra cal earned. Fuel the work; you don\'t have to eat it all back, but the room is there if you\'re hungry.';
        }
        fuelEl.style.display = 'block';
      } else {
        fuelEl.style.display = 'none';
      }
    }
  }

  // Today's Apple Watch rings, entered in the evening reflection — shown here at a glance so the
  // user sees where their day's at without leaving the life-system app.
  const ringsEl = document.getElementById('nut-rings-today');
  if(ringsEl){
    const ev = ritualLog('totry_evenings').find(e => e.ts && new Date(e.ts).toLocaleDateString('en-AU') === today);
    const r = ev && ev.rings;
    if(r && (r.move||r.exercise||r.stand)){
      const cell = (label,val,unit) => '<div style="flex:1;text-align:center"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">'+label+'</div><div style="font-size:15px;color:var(--tx);font-weight:500">'+(val!=null?val:'\u2014')+(val!=null?'<span style=\"font-size:10px;color:var(--tx3)\"> '+unit+'</span>':'')+'</div></div>';
      ringsEl.innerHTML = '<div style="display:flex;gap:8px;padding:10px;background:var(--bg3);border-radius:8px">'+
        '<div style="display:flex;align-items:center;font-size:11px;color:var(--go);padding-right:6px">\u231a Rings</div>'+
        cell('Move', r.move, 'cal') + cell('Exercise', r.exercise, 'min') + cell('Stand', r.stand, 'hr') + '</div>';
      ringsEl.style.display = 'block';
    } else {
      ringsEl.innerHTML = '<button onclick="go(&apos;reflect&apos;);setTimeout(function(){_stepToEveningField(&apos;evening-move&apos;)},320)" style="width:100%;background:none;border:none;color:var(--tx3);font-size:12px;cursor:pointer;text-align:left;padding:14px 0;margin:-10px 0">\u231a <span style="color:var(--go)">Add today\u2019s Watch rings</span> \u00b7 Move, Exercise, Stand</button>';
      ringsEl.style.display = 'block';
    }
  }

  // Today's training summary, right where food is tracked — closes the loop visibly.
  const trainEl = document.getElementById('nut-training-today');
  if(trainEl){
    const allTrain = (typeof getUnifiedTraining === 'function') ? getUnifiedTraining() : [];
    const todays = allTrain.filter(t => t.ts && new Date(t.ts).toLocaleDateString('en-AU') === today);
    if(todays.length){
      const names = todays.map(t => (t.title || 'Workout')).join(', ');
      trainEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'+
        '<div style="font-size:12px;color:var(--tx2);min-width:0;flex:1"><span style="color:var(--go)">\ud83c\udfcb\ufe0f Trained today:</span> '+names.replace(/</g,'&lt;')+'</div>'+
        '<button onclick="go(&apos;train&apos;)" style="background:none;border:none;color:var(--tx3);font-size:11px;cursor:pointer;flex-shrink:0;padding:16px 8px;margin:-16px -8px">View ›</button></div>';
      trainEl.style.display = 'block';
    } else {
      trainEl.innerHTML = '<button onclick="logCardioManually()" style="width:100%;background:none;border:none;color:var(--tx3);font-size:12px;cursor:pointer;text-align:left;padding:14px 0;margin:-10px 0">\ud83c\udfcb\ufe0f No training logged today \u00b7 <span style="color:var(--go)">log a workout</span></button>';
      trainEl.style.display = 'block';
    }
  }
  
  // Render water + fasting alongside
  renderWaterTracker();
  renderFastingTimer();
  
  const e=id=>document.getElementById(id);
  // Show REMAINING toward goal (counts down as you log), with consumed in the label
  const goalCal=goals.cal||2100, goalPro=goals.pro||170;
  const goalCarb=goals.carb||0, goalFat=goals.fat||0;
  const remCal=Math.round(goalCal-totals.cal), remPro=Math.round(goalPro-totals.pro);
  const remCarb=Math.round(goalCarb-totals.carb), remFat=Math.round(goalFat-totals.fat);
  // Big numbers show what's LEFT (or "over" if exceeded)
  if(e('nut-cal'))e('nut-cal').textContent = remCal>=0 ? remCal : '+'+Math.abs(remCal);
  if(e('nut-pro'))e('nut-pro').textContent = (remPro>=0 ? remPro : '+'+Math.abs(remPro))+'g';
  // Carbs/fat: show remaining toward goal (consistent with protein). If no goal set, show consumed.
  if(e('nut-carb'))e('nut-carb').textContent = goalCarb ? ((remCarb>=0?remCarb:'+'+Math.abs(remCarb))+'g') : (Math.round(totals.carb)+'g');
  if(e('nut-fat'))e('nut-fat').textContent = goalFat ? ((remFat>=0?remFat:'+'+Math.abs(remFat))+'g') : (Math.round(totals.fat)+'g');
  // Relabel the hero calorie figure to make "remaining" explicit (macros now in legend, no .macro-met)
  const calLblEl=document.getElementById('nut-cal-hero-lbl');
  if(calLblEl) calLblEl.textContent = remCal>=0 ? 'cal left' : 'cal over';
  // Macro donut ring: each arc sized by that macro's share of calories (P×4, C×4, F×9)
  const pCal = (totals.pro||0)*4, cCal = (totals.carb||0)*4, fCal = (totals.fat||0)*9;
  const macroTotal = pCal + cCal + fCal;
  // Read the radius off the element instead of hardcoding it. This was 251.2 for r=40, and the ring
  // is now r=54 (C=339.3) — every macro arc would have drawn at 74% of its true length, with nothing
  // to show for it but three slightly short bands nobody could check by eye.
  const _rEl = e('ring-pro');
  const _r = _rEl ? (parseFloat(_rEl.getAttribute('r')) || 40) : 40;
  const C = 2 * Math.PI * _r;
  const setArc = (id, fraction, offset) => {
    const el = e(id); if(!el) return;
    const len = Math.max(0, fraction * C);
    el.setAttribute('stroke-dasharray', len.toFixed(1) + ' ' + (C - len).toFixed(1));
    el.setAttribute('stroke-dashoffset', (-offset * C).toFixed(1));
  };
  if(macroTotal > 0){
    const pf = pCal/macroTotal, cf = cCal/macroTotal, ff = fCal/macroTotal;
    setArc('ring-pro', pf, 0);
    setArc('ring-carb', cf, pf);
    setArc('ring-fat', ff, pf+cf);
  } else {
    ['ring-pro','ring-carb','ring-fat'].forEach(id=>{const el=e(id); if(el) el.setAttribute('stroke-dasharray','0 251');});
  }
  // Tint the hero number subtly when over budget (the one place red carries real meaning)
  const calHeroNum=document.getElementById('nut-cal');
  if(calHeroNum) calHeroNum.style.color = remCal>=0 ? 'var(--go)' : 'var(--re)';
  // Extended macros
  // Four zeros is not the same as four unknowns. Most food entries carry calories and protein and
  // nothing else, so fibre/sugar/sodium/sat-fat read 0g for a person who has eaten all day — which
  // says he ate no fibre, and that is simply false. Shown when there is something real to show.
  const _micro = (totals.fiber||0) + (totals.sugar||0) + (totals.sodium||0) + (totals.satfat||totals.sat_fat||0);
  const _ext = e('nut-extended');
  if(_ext && !nutGentle()) _ext.style.display = _micro > 0 ? 'grid' : 'none';
  if(e('nut-fiber')) e('nut-fiber').textContent = Math.round(totals.fiber || 0) + 'g';
  if(e('nut-sugar')) e('nut-sugar').textContent = Math.round(totals.sugar || 0) + 'g';
  if(e('nut-sodium')) e('nut-sodium').textContent = Math.round(totals.sodium || 0) + 'mg';
  if(e('nut-satfat')) e('nut-satfat').textContent = Math.round((totals.sat_fat || 0) * 10) / 10 + 'g';
  
  // ── Calorie equation transparency (MFP-familiar): Base goal − Food = Remaining (the ring's math) ──
  if(e('eq-goal')) e('eq-goal').textContent = goalCal;
  if(e('eq-food')) e('eq-food').textContent = Math.round(totals.cal);
  if(e('eq-rem')){ e('eq-rem').textContent = remCal>=0 ? remCal : ('+'+Math.abs(remCal)); e('eq-rem').style.color = remCal>=0 ? 'var(--go)' : 'var(--re)'; }
  // Exercise surfaced honestly — NOT eaten back (it's already inside your adaptive target). Accurate, not MFP's double-count.
  if(e('eq-burn')){ const b=(typeof burned!=='undefined'&&burned)?Math.round(burned):0; if(b>0){ e('eq-burn').textContent='🔥 '+b+' burned · already in your target'; e('eq-burn').style.display=''; } else { e('eq-burn').style.display='none'; } }
  // ── Three macro bars (Protein / Carbs / Fat), colored, eaten / target ──
  const _mb=(barId,lblId,eaten,goal)=>{ const bar=e(barId); if(bar){ const pct=goal>0?Math.min(100,Math.round((eaten/goal)*100)):0; bar.style.width=pct+'%'; } const lbl=e(lblId); if(lbl) lbl.textContent=Math.round(eaten||0)+'g / '+(Math.round(goal)||0)+'g'; };
  _mb('nut-pro-bar','nut-pro-goal-lbl',totals.pro,goalPro);
  _mb('nut-carb-bar','nut-carb-goal-lbl',totals.carb,goalCarb);
  _mb('nut-fat-bar','nut-fat-goal-lbl',totals.fat,goalFat);
  // Item 11 — gentle macro glance. A quiet, ignorable line that surfaces only later in the day
  // when there's still meaningful protein to get, offering portable options because they might not
  // be somewhere they can cook. Never a push; dismissible for the day with one tap.
  const glanceEl = e('nut-macro-glance');
  if(glanceEl){
    const hr = new Date().getHours();
    const proLeft = Math.round(goalPro - totals.pro);
    const dismissedDay = ls('totry_glance_dismissed');
    const todayKey = new Date().toLocaleDateString('en-AU');
    // The hero's nudge already says "90g short on protein with dinner to go". Saying it again 800px
    // lower does not reinforce it; it just makes the screen longer and the app look like it is not
    // listening to itself. If the nudge has the protein point, the glance stays quiet.
    let _nudgeHasIt = false;
    try{ const _n = document.getElementById('nut-nudge');
      _nudgeHasIt = !!(_n && _n.offsetParent !== null && /protein/i.test(_n.textContent || '')); }catch(_){ }
    const show = !_nudgeHasIt && (typeof nutIsToday!=='function' || nutIsToday()) && hr >= 15 && proLeft >= 30 && totals.cal > 0 && dismissedDay !== todayKey;
    if(show){
      glanceEl.innerHTML =
        '<div style="display:flex;align-items:flex-start;gap:8px">'+
          '<div style="flex:1;font-size:12px;color:var(--tx2);line-height:1.6">You\'ve got about <span style="color:var(--gr)">'+proLeft+'g protein</span> still to get today. If you\'re home: eggs, Greek yoghurt, chicken, or a quick shake. Out and about: a tin of tuna, jerky, a protein bar, or milk all travel well.</div>'+
          '<button onclick="ls(&apos;totry_glance_dismissed&apos;,new Date().toLocaleDateString(&apos;en-AU&apos;));document.getElementById(&apos;nut-macro-glance&apos;).style.display=&apos;none&apos;" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer;padding:0 2px;flex-shrink:0;line-height:1">×</button>'+
        '</div>';
      glanceEl.style.display = 'block';
    } else {
      glanceEl.style.display = 'none';
    }
  }
  
  // GENTLE MODE last — it overrides whatever the counters above just painted (numbers off).
  try{ applyNutGentle(totals.cal, goalCal); }catch(_){}

  // Render micro panel content (always populated, hidden until toggled)
  renderMicroPanel(totals);
  
  const list=e('nut-log-list');
  const _gentleOn = (typeof nutGentle==='function' && nutGentle());
  if(typeof renderRecentFoods === 'function') renderRecentFoods();
  if(list){
    if(!entries.length){
      const log=ls('totry_nutlog')||{};
      const yKey=(typeof nutRelKey==='function')?nutRelKey(1):(function(){const y=new Date();y.setDate(y.getDate()-1);return y.toLocaleDateString('en-AU');})();
      const hadYesterday = log[yKey] && log[yKey].length;
      const everLogged = Object.keys(log).some(k => (log[k]||[]).length) || (ls('totry_recent_foods')||[]).length;
      const hasGoals = !!(ls('totry_nut_goals')||{}).cal;
      if(!everLogged && !hasGoals){
        // TRUE first-run only: no targets AND nothing ever logged. If targets already exist (even with
        // nothing logged yet) we must NOT say "no targets to figure out" — the dashboard above shows them.
        // First-ever use: don't confront them with a setup wall or a feature list. One warm,
        // low-pressure step. Goals can derive from real intake later — just log one thing.
        list.innerHTML='<div style="text-align:center;padding:22px 14px;line-height:1.6">'+
          '<div style="font-size:26px;margin-bottom:10px">🍽️</div>'+
          '<div style="font-size:15px;color:var(--tx);margin-bottom:6px">Let\'s start simple.</div>'+
          '<div style="font-size:12px;color:var(--tx3);margin-bottom:14px">No setup, no targets to figure out yet. Just log one thing you ate today — we\'ll learn your rhythm from there.</div>'+
          '<button class="btn primary" style="width:auto;padding:10px 20px;font-size:13px" onclick="document.getElementById(&apos;nut-search-in&apos;)?.focus()">Log one thing</button>'+
          '</div>';
        _nutTailRenders(totals, goalCal);
        return;
      }
      list.innerHTML='<div style="text-align:center;padding:18px 12px;font-size:13px;color:var(--tx3);line-height:1.6"><div style="font-size:24px;margin-bottom:8px">🍽️</div><div style="margin-bottom:4px;color:var(--tx2)">'+((typeof nutIsToday==='function'&&!nutIsToday())?(_escFew(nutDayLabel())+'\'s plate is empty.'):'Today\'s plate is empty.')+'</div><div style="font-size:11px">Search a food, scan a barcode, or describe a whole meal — the AI will estimate macros.</div>' +
        (hadYesterday ? '<button class="btn" style="margin-top:12px;background:var(--bg3);border:1px solid var(--bd);font-size:12px;width:auto;padding:8px 14px" onclick="repeatYesterdayMeals()">↻ Copy ' + ((typeof nutIsToday==='function'&&!nutIsToday()) ? 'the day before' : 'yesterday\'s') + ' ' + log[yKey].length + ' items</button>' : '') +
        '</div>';
      _nutTailRenders(totals, goalCal);
      return;
    }
    
    // Group entries by meal type
    const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
    const mealLabels = {breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner', snack: '🍎 Snacks'};
    const grouped = {breakfast: [], lunch: [], dinner: [], snack: []};
    entries.forEach(en => {
      const meal = en.meal || 'snack';
      (grouped[meal] || grouped.snack).push(en);
    });
    
    list.innerHTML = '';
    mealOrder.forEach(meal => {
      const mealEntries = grouped[meal];
      const has = mealEntries.length > 0;
      const mealCals = Math.round(mealEntries.reduce((a,en)=>a+(en.cal||0),0));
      const mealPro = Math.round(mealEntries.reduce((a,en)=>a+(en.pro||0),0));
      
      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 4px 4px 4px;margin-top:10px;border-bottom:1px solid var(--bd)';
      header.innerHTML = '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx2);text-transform:uppercase;letter-spacing:0.1em">' + mealLabels[meal] + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          (has ? '<button onclick="saveMealGroup(\''+meal+'\')" title="Save these foods as a reusable meal" style="background:none;border:none;color:var(--go);font-family:DM Mono,monospace;font-size:9px;cursor:pointer;min-height:34px;padding:0 8px;margin:-11px -8px;letter-spacing:0.05em">save meal</button>' : '') +
          // Numbers off → the meal still lists what you ate, just not what it "cost".
          ((has && !_gentleOn) ? '<span style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">' + mealCals + ' cal · ' + mealPro + 'g P</span>' : '') +
        '</div>';
      list.appendChild(header);
      
      mealEntries.forEach(en => {
        const row=document.createElement('div');
        row.className='food-log-item';
        row.innerHTML='<div style="min-width:0;flex:1"><div class="fli-name">'+_escFew(en.name)+'</div>'+((en.serving||en.qty)?'<div style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--tx3)">'+_escFew(en.serving||'serving')+(en.qty?(' \u00d7 '+en.qty):'')+'</div>':'')+'<div style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--tx3);margin-top:2px">P '+(Math.round((en.pro||0)*10)/10)+'g \u00b7 C '+(Math.round((en.carb||0)*10)/10)+'g \u00b7 F '+(Math.round((en.fat||0)*10)/10)+'g</div></div><div style="display:flex;align-items:center;gap:6px"><span class="fli-cal">'+en.cal+' cal</span><button class="fli-del" style="font-size:14px;color:var(--tx3)" onclick="editFoodEntry(\''+today+'\','+en.id+')" title="Edit">✎</button><button class="fli-del" onclick="deleteFoodEntry(\''+today+'\','+en.id+')" aria-label="Delete '+_escFew(en.name)+'">&#215;</button></div>';
        // NUMBERS OFF — strip the calorie figure and the macro breakdown from the row. What you ate
        // still shows (that IS the log, and the whole-life counsel still uses it); what it "cost" doesn't.
        if(_gentleOn){
          try{
            const c=row.querySelector('.fli-cal'); if(c) c.remove();
            row.querySelectorAll('div[style*="margin-top:2px"]').forEach(function(s){ s.remove(); });
          }catch(_){}
        }
        list.appendChild(row);
      });
      // "Add food" under every meal — MFP's core interaction, one tap from each meal to the search.
      const add=document.createElement('div');
      add.style.cssText='padding:'+(has?'8px':'9px')+' 4px 2px 4px';
      add.innerHTML='<button onclick="selectMealChip(\''+meal+'\');var s=document.getElementById(\'nut-search-in\');if(s){s.scrollIntoView({behavior:\'smooth\',block:\'center\'});setTimeout(function(){s.focus();},300);}" style="background:none;border:none;color:'+(has?'var(--go)':'var(--tx3)')+';font-family:\'Outfit\',sans-serif;font-size:12.5px;cursor:pointer;padding:14px 10px;margin:-14px -10px;min-height:44px">+ Add food</button>';
      list.appendChild(add);
    });
  }
  _nutTailRenders(totals, goalCal);
}

// The tail of renderNutritionLog, extracted so the two empty-plate early returns can still run it.
// They used to `return` outright, which skipped all six renderers below — the same shape as the
// renderFinance()/no-debt return that hid Money's entire lower half. The cruellest casualty was
// renderMigrateCard(): its own gate only shows the "switching from another app — import your CSV"
// card when the person has fewer than 10 entries, yet it could only be REACHED once today's plate was
// non-empty. So the import offer was invisible to precisely the person it exists for — someone
// arriving from MyFitnessPal, who had just been told in onboarding that it lives in Nourish. It became
// available only after they hand-logged a meal, i.e. after doing the work the import would have saved.
function _nutTailRenders(totals, goalCal){
  if(typeof renderNutTrend==='function') renderNutTrend();
  if(typeof renderAdaptiveTDEE==='function') renderAdaptiveTDEE();
  if(typeof renderMealSplit==='function') renderMealSplit();
  if(typeof renderNutWeeklyDigest==='function') renderNutWeeklyDigest();
  if(typeof renderSavedMeals==='function') renderSavedMeals();
  if(typeof renderMigrateCard==='function') renderMigrateCard();
  // Only show the "Trends & reports" header once one of its cards is actually visible — no bare header.
  try{
    const lbl=document.getElementById('nut-reports-lbl');
    if(lbl){
      const any=['adaptive-tdee-card','nut-macro-glance','nut-weekly-digest','nut-trend-card']
        .some(id=>{ const el=document.getElementById(id); return el && el.style.display!=='none'; });
      lbl.style.display = any ? '' : 'none';
    }
  }catch(_){}
  // FINAL gentle pass — several cards above (trend, digest, adaptive TDEE, meal split) render AFTER
  // the first call, so re-apply last. Order can then never re-leak a number.
  try{ if(typeof applyNutGentle==='function') applyNutGentle(totals&&totals.cal, goalCal); }catch(_){}
}

// Shows the "switching from another app" card until the user imports history or dismisses it,
// or once they already have a decent log of their own (so it never nags established users).
function renderMigrateCard(){
  const card = document.getElementById('nut-migrate-card');
  if(!card) return;
  if(ls('totry_migrate_dismissed') || ls('totry_food_imported')){ card.style.display='none'; return; }
  // Count total logged food entries across all days
  const log = ls('totry_nutlog') || {};
  let totalEntries = 0;
  Object.values(log).forEach(arr => totalEntries += (arr||[]).length);
  // Only surface to newish users (few entries) — established loggers don't need it
  card.style.display = totalEntries < 10 ? 'block' : 'none';
}
function dismissMigrateCard(){
  ls('totry_migrate_dismissed', true);
  const card = document.getElementById('nut-migrate-card');
  if(card) card.style.display='none';
}

// 14-day calorie trend vs goal — the nutrition equivalent of the strength curve
// Weekly nutrition digest (MyFitnessPal/MacroFactor weekly report): the past 7 days at a glance —
// average calories vs goal, days logged, and your most-logged foods.
function renderNutWeeklyDigest(){
  const box = document.getElementById('nut-weekly-digest');
  if(!box) return;
  const log = ls('totry_nutlog')||{};
  const now = Date.now();
  let calTotal = 0, daysLogged = 0, proTotal = 0;
  const foodCounts = {};
  // Walk the last 7 days using each entry's timestamp
  const seenDays = new Set();
  Object.keys(log).forEach(dateKey => {
    const entries = log[dateKey]||[];
    if(!entries.length) return;
    const dayTs = entries[0].ts ? new Date(entries[0].ts).getTime() : null;
    if(!dayTs || now - dayTs > 7*86400000) return;
    const dayCal = entries.reduce((a,e)=>a+(e.cal||0),0);
    if(dayCal>0){ calTotal += dayCal; proTotal += entries.reduce((a,e)=>a+(e.pro||0),0); daysLogged++; seenDays.add(dateKey); }
    entries.forEach(e => { const n=(e.name||'').trim(); if(n) foodCounts[n]=(foodCounts[n]||0)+1; });
  });
  if(daysLogged < 2){ box.style.display='none'; return; }
  box.style.display='block';
  const goals = ls('totry_nut_goals') || defaultNutGoals();
  const goalCal = goals.cal || 2100;
  const avgCal = Math.round(calTotal/daysLogged);
  const avgPro = Math.round(proTotal/daysLogged);
  const diff = avgCal - goalCal;
  const topFoods = Object.entries(foodCounts).sort((a,b)=>b[1]-a[1]).slice(0,3);
  // Trend band: compare this 7 days to the previous 7. The moving average is the truth — a single
  // high or low day barely moves it, which is the whole anti-guilt point. We surface the direction
  // of the trend, not a daily pass/fail.
  let prevCalTotal = 0, prevDays = 0;
  Object.keys(log).forEach(dateKey => {
    const entries = log[dateKey]||[];
    if(!entries.length) return;
    const dayTs = entries[0].ts ? new Date(entries[0].ts).getTime() : null;
    if(!dayTs) return;
    const age = now - dayTs;
    if(age > 7*86400000 && age <= 14*86400000){
      const dayCal = entries.reduce((a,e)=>a+(e.cal||0),0);
      if(dayCal>0){ prevCalTotal += dayCal; prevDays++; }
    }
  });
  const prevAvg = prevDays ? Math.round(prevCalTotal/prevDays) : null;
  const trendDelta = prevAvg!=null ? avgCal - prevAvg : null;
  let trendLine = '';
  if(trendDelta != null && prevDays >= 2){
    const dir = Math.abs(trendDelta) < 75 ? 'steady' : (trendDelta > 0 ? 'up' : 'down');
    const dirColor = dir==='steady' ? 'var(--gr)' : 'var(--go)';
    const dirWord = dir==='steady' ? 'holding steady' : (dir==='up' ? 'trending up '+Math.abs(trendDelta)+' cal' : 'trending down '+Math.abs(trendDelta)+' cal');
    trendLine = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--bd);font-size:12px;color:var(--tx2);line-height:1.6">Your 7-day average is <span style="color:'+dirColor+'">'+dirWord+'</span> vs the week before. The average is what matters — one big day or one light day barely moves it.</div>';
  }
  box.innerHTML =
    '<div class="card-hd" style="margin-bottom:8px">📅 This week</div>' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">' +
      '<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center"><div style="font-family:DM Mono,monospace;font-size:18px;color:var(--tx)">'+avgCal.toLocaleString()+'</div><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.08em">avg cal/day</div></div>' +
      '<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center"><div style="font-family:DM Mono,monospace;font-size:18px;color:var(--gr)">'+avgPro+'g</div><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.08em">avg protein</div></div>' +
      '<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center"><div style="font-family:DM Mono,monospace;font-size:18px;color:var(--go)">'+daysLogged+'</div><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.08em">days logged</div></div>' +
    '</div>' +
    '<div style="font-size:12px;color:var(--tx2);line-height:1.6">You averaged <span style="color:'+(Math.abs(diff)<=150?'var(--gr)':'var(--go)')+'">'+avgCal.toLocaleString()+' cal</span> — '+(Math.abs(diff)<=150?'right around your '+goalCal.toLocaleString()+' goal.':(diff>0?Math.abs(diff)+' over your goal on average.':Math.abs(diff)+' under your goal on average.'))+'</div>' +
    trendLine +
    (topFoods.length ? '<div style="margin-top:8px;font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">Most logged: '+topFoods.map(f=>f[0].replace(/</g,'&lt;')+' ×'+f[1]).join(' · ')+'</div>' : '');
}

// Calorie-by-meal split bar (MFP's glanceable nutrition insight).
function renderMealSplit(){
  const wrap = document.getElementById('nut-meal-split');
  const bar = document.getElementById('nut-meal-split-bar');
  const legend = document.getElementById('nut-meal-split-legend');
  if(!wrap || !bar || !legend) return;
  // GENTLE MODE guard at the SOURCE — this runs after applyNutGentle, so hiding it there isn't enough.
  // A "numbers off" promise that leaks calorie counts here would be a broken promise to the exact
  // person the mode exists to protect.
  if(typeof nutGentle==='function' && nutGentle()){ wrap.style.display='none'; return; }
  const today = (typeof nutDayKey==='function') ? nutDayKey() : new Date().toLocaleDateString('en-AU');
  const entries = (ls('totry_nutlog')||{})[today] || [];
  if(!entries.length){ wrap.style.display='none'; return; }
  const meals = {breakfast:0, lunch:0, dinner:0, snack:0};
  entries.forEach(e => { const m = e.meal || 'snack'; meals[m] = (meals[m]||0) + (e.cal||0); });
  const order = ['breakfast','lunch','dinner','snack'];
  const total = Object.values(meals).reduce((a,b)=>a+b,0);
  if(total <= 0){ wrap.style.display='none'; return; }
  // A split needs something to split. With one meal logged this was a full-width bar labelled
  // "Snacks 1130" under the heading "WHERE TODAY'S CALORIES CAME FROM" — a chart of one fact, taking
  // the room of a real one. It arrives when there are actually two meals to compare.
  if(order.filter(m => meals[m] > 0).length < 2){ wrap.style.display='none'; return; }
  wrap.style.display='block';
  const colors = {breakfast:'#E0A458', lunch:'var(--go)', dinner:'#9B7EC0', snack:'#6B97D6'};
  const labels = {breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner', snack:'Snacks'};
  bar.innerHTML = order.filter(m=>meals[m]>0).map(m =>
    '<div style="width:' + ((meals[m]/total)*100).toFixed(1) + '%;background:' + colors[m] + '"></div>'
  ).join('');
  legend.innerHTML = order.filter(m=>meals[m]>0).map(m =>
    '<span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:2px;background:' + colors[m] + ';display:inline-block"></span>' + labels[m] + ' ' + Math.round(meals[m]) + '</span>'
  ).join('');
}

// ── ADAPTIVE TDEE (MacroFactor's crown jewel) ──
// Instead of a static formula, reverse-calculate ACTUAL expenditure from real data:
// over a trailing window, TDEE ≈ avg daily intake − (weight change in kg × 7700 / days).
// Uses trend weight (smoothed) to ignore daily water-weight noise. Needs ~10 days of data.
function getTrendWeight(entries){
  // entries: [{ts, weight}] newest-first. Returns exponentially-smoothed trend (newest).
  const pts = (entries||[]).filter(e=>e.weight>0).map(e=>({t:new Date(e.ts).getTime(), w:e.weight})).sort((a,b)=>a.t-b.t);
  if(!pts.length) return null;
  let trend = pts[0].w;
  const alpha = 0.25; // smoothing factor
  pts.forEach(p => { trend = alpha*p.w + (1-alpha)*trend; });
  return Math.round(trend*10)/10;
}
function computeAdaptiveTDEE(){
  const body = (ls('totry_body')||[]).filter(e=>e.weight>0).map(e=>({ts:new Date(e.ts).getTime(), w:e.weight})).sort((a,b)=>a.ts-b.ts);
  const nutLog = ls('totry_nutlog')||{};
  if(body.length < 2) return null;
  // Window: last 14 days of weight, matched with intake on those days
  const windowMs = 21*86400000;
  const now = Date.now();
  const recentBody = body.filter(e => now - e.ts <= windowMs);
  if(recentBody.length < 2) return null;
  const first = recentBody[0], last = recentBody[recentBody.length-1];
  const days = Math.max(1, (last.ts - first.ts)/86400000);
  if(days < 7) return null; // need at least a week of spread
  // Average daily intake across the window (only days that were logged).
  // Robust day-matching: parse the en-AU date key (d/m/yyyy) directly, fall back to any
  // entry's timestamp. Previously this only read entries[0].ts, so CSV-imported or older
  // days with no ts were silently dropped — corrupting avgIntake and the whole TDEE.
  const dayTsFromKey = (key, entries) => {
    // en-AU locale: "d/m/yyyy" (e.g. 5/6/2026). Build a local-midnight timestamp.
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((key||'').trim());
    if(m){ const d = new Date(+m[3], +m[2]-1, +m[1]); if(!isNaN(d)) return d.getTime(); }
    // Fallback: first entry on the day that carries a usable timestamp.
    for(const e of (entries||[])){ if(e && e.ts){ const t = new Date(e.ts).getTime(); if(!isNaN(t)) return t; } }
    return null;
  };
  let calSum = 0, calDays = 0;
  Object.keys(nutLog).forEach(dateKey => {
    const entries = nutLog[dateKey] || [];
    if(!entries.length) return;
    const dayTs = dayTsFromKey(dateKey, entries);
    if(dayTs != null && now - dayTs <= windowMs){
      const dayCal = entries.reduce((a,e)=>a+(e.cal||0),0);
      if(dayCal > 0){ calSum += dayCal; calDays++; }
    }
  });
  // Five logged days was the ONLY bar, against a window of up to 21. Ran it with weight flat for 21 days
  // and food logged on 5 of them at 1800 (real intake 2600): it returned a TDEE of 1800 and offered to
  // set the eating target from it. Partial logging does not mean a small appetite — it means missing
  // data — and the resulting number is lower than the truth by however much went unlogged, which is
  // precisely the wrong direction for someone trying to eat enough. Require the window to be mostly
  // covered, not merely sampled.
  if(calDays < 5) return null;                       // too few days to say anything at all
  if(calDays < Math.ceil(days * 0.6)) return null;   // and too patchy to call it their intake
  const avgIntake = calSum / calDays;
  // Use the SMOOTHED trend at each end of the window, not the two raw weigh-ins. A single reading carries
  // water, salt, glycogen and time-of-day noise easily worth 0.5-1kg — and this difference is multiplied
  // by 7700 kcal/kg and divided by the window, so a 0.6kg water swing on either endpoint moved the
  // estimated TDEE by hundreds of calories a day. The card already SAYS 'weight trend' and already
  // displays getTrendWeight(); the maths just wasn't using it.
  // Least-squares slope over EVERY reading in the window. Differencing two endpoints — even two smoothed
  // ones — is dominated by whatever noise sits at the ends; a regression uses all the data, so one
  // dehydrated morning cannot swing the answer. (A half-window smoothed difference was tried first and
  // was WORSE: scaling a half-window delta back up doubles its error. Measured, not assumed.)
  const weightChangeKg = (function(){
    const n = recentBody.length;
    if(n < 3) return last.w - first.w;                 // too few points to regress honestly
    const t0 = recentBody[0].ts;
    let sx=0, sy=0, sxx=0, sxy=0;
    recentBody.forEach(function(e){
      const x = (e.ts - t0)/86400000;                   // days from the window start
      sx+=x; sy+=e.w; sxx+=x*x; sxy+=x*e.w;
    });
    const denom = n*sxx - sx*sx;
    if(!denom) return last.w - first.w;
    const slopePerDay = (n*sxy - sx*sy) / denom;        // kg per day
    return slopePerDay * days;                          // across the window
  })();
  const dailyEnergyBalance = (weightChangeKg * 7700) / days; // +surplus / −deficit per day
  const tdee = Math.round(avgIntake - dailyEnergyBalance);
  // Guard-rails: ignore absurd outputs from sparse/noisy data
  if(tdee < 1200 || tdee > 5500) return null;
  return { tdee, avgIntake: Math.round(avgIntake), weightChangeKg: Math.round(weightChangeKg*10)/10, days: Math.round(days), calDays, trendWeight: getTrendWeight(ls('totry_body')||[]) };
}
function renderAdaptiveTDEE(){
  const box = document.getElementById('adaptive-tdee-card');
  if(!box) return;
  const r = computeAdaptiveTDEE();
  if(!r){
    // Not enough data YET to compute a real burn. But if they've set a target, make the app's LIVING
    // nature visible — it isn't one-time setup; it's learning and will adjust. Sets the expectation.
    const g = ls('totry_nut_goals');
    if(g && g._ts && !ls('totry_nut_setup_dismissed')){
      box.style.display='block';
      box.innerHTML =
        '<div class="card" style="background:var(--bg2)">'+
          '<div style="display:flex;align-items:flex-start;gap:11px">'+
            '<span style="font-size:17px;flex-shrink:0">📈</span>'+
            '<div style="flex:1"><div style="font-size:13px;color:var(--tx);font-weight:600">Your target adapts as you go</div>'+
            '<div style="font-size:11px;color:var(--tx3);line-height:1.5;margin-top:2px">This isn’t a one-time number. Keep logging your food and weight — I learn your real burn from how your weight actually moves, and adjust your target on its own so it never goes stale.</div></div>'+
          '</div>'+
        '</div>';
    } else { box.style.display='none'; }
    return;
  }
  box.style.display='block';
  const dir = r.weightChangeKg > 0.1 ? 'gaining' : (r.weightChangeKg < -0.1 ? 'losing' : 'maintaining');
  const dirColor = dir==='losing' ? 'var(--gr)' : dir==='gaining' ? 'var(--go)' : 'var(--tx2)';
  // MacroFactor-style 4-week forecast from the current trend (honest: only a projection)
  let forecastLine = '';
  if(dir !== 'maintaining' && r.trendWeight){
    const perDay = r.weightChangeKg / r.days;
    const in4w = Math.round((r.trendWeight + perDay*28)*10)/10;
    forecastLine = '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);margin-top:4px">If this trend holds: ~' + in4w + 'kg in 4 weeks.</div>';
  }
  // THE LOOP CLOSER: if real burn differs meaningfully from the set goal, offer (never force)
  // a one-tap goal update. Consent-based, like everything in this app.
  const goals = ls('totry_nut_goals') || defaultNutGoals();
  // Compare the CURRENT target to the goal-adjusted target from real maintenance — not to raw
  // maintenance (which for a cutter is always ~500 above target and would nag falsely).
  const adjTarget = goalAdjustedTarget(r.tdee);
  const goalDiff = adjTarget.cal - (goals.cal || 2100);
  const reflectLine = adjTarget.isAdjusted
    ? 'Your real maintenance is ~<span style="color:var(--tx)">' + r.tdee.toLocaleString() + '</span>, so for ' + adjTarget.verb + ' your target should be ~<span style="color:var(--go)">' + adjTarget.cal.toLocaleString() + '</span> — but it\'s set to <span style="color:var(--tx)">' + (goals.cal||2100).toLocaleString() + '</span>.'
    : 'Your goal is set to <span style="color:var(--tx)">' + (goals.cal||2100).toLocaleString() + '</span> but your real maintenance is ~<span style="color:var(--go)">' + r.tdee.toLocaleString() + '</span>.';
  const goalSuggest = Math.abs(goalDiff) >= 150
    ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd)">'+
      '<div style="font-size:12px;color:var(--tx2);line-height:1.6">' + reflectLine + ' Want your goal to reflect reality?</div>'+
      '<button class="btn" onclick="setCalGoalFromTDEE(' + r.tdee + ')" style="margin-top:8px;background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go);font-size:12px">Set my target to ' + adjTarget.cal.toLocaleString() + ' cal</button>'+
      '</div>'
    : '';
  box.innerHTML =
    '<div class="eyebrow" style="color:var(--go);margin-bottom:6px">Your real burn · adaptive</div>' +
    '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px">' +
      '<div style="font-family:Cormorant Garamond,serif;font-size:34px;color:var(--go);line-height:1">' + r.tdee.toLocaleString() + '</div>' +
      '<div style="font-size:12px;color:var(--tx3)">cal/day maintenance</div>' +
    '</div>' +
    '<div style="font-size:12px;color:var(--tx2);line-height:1.6">Calculated from your real intake and weight trend over ' + r.days + ' days — not a formula. ' +
      'You\'re <span style="color:' + dirColor + '">' + dir + '</span>' + (dir!=='maintaining' ? ' (' + (r.weightChangeKg>0?'+':'') + r.weightChangeKg + 'kg)' : '') + ' on about ' + r.avgIntake.toLocaleString() + ' cal/day.</div>' +
    (r.trendWeight ? '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);margin-top:6px;padding-top:6px;border-top:1px solid var(--bd)">Trend weight: ' + r.trendWeight + 'kg (smoothed, ignores daily water swings)</div>' : '') +
    forecastLine +
    goalSuggest;
}
// One-tap, user-initiated goal update from the adaptive TDEE. Protein goal stays untouched.
// MacroFactor's macro discipline: protein is a floor anchored to bodyweight (never sacrificed
// when calories move), fat has a minimum for hormones, and carbs flex to absorb the rest.
// Given a calorie target, return a coherent {cal,pro,carb,fat} that protects the protein floor.
// Honours a user's existing protein goal if they've set one HIGHER than the floor.
function macrosForCalories(cal, opts){
  opts = opts || {};
  const bw = (typeof getBodyweight==='function') ? getBodyweight() : null;
  const existing = ls('totry_nut_goals') || {};
  // Protein floor: g/kg bodyweight. Default 1.8 (mid of the 1.6–2.2 hypertrophy range); a cut wants
  // more to spare muscle, a bulk a touch more for growth — the caller passes proPerKg for the goal.
  // If we don't know bodyweight, keep whatever protein was already set, else a sane default.
  const perKg = opts.proPerKg || 1.8;
  let pro = bw ? Math.round(bw * perKg) : (existing.pro || Math.round(cal * 0.30 / 4));
  // Never drop below a protein the user has deliberately set higher than the floor.
  if(existing.pro && existing.pro > pro) pro = existing.pro;
  // Fat floor: 0.8g/kg (hormonal health), capped so it can't eat the whole budget.
  let fat = bw ? Math.round(bw * 0.8) : Math.round(cal * 0.27 / 9);
  // Carbs absorb the remainder after the protein floor + fat floor are paid.
  const proCal = pro * 4, fatCal = fat * 9;
  let carbCal = cal - proCal - fatCal;
  // If calories are too low to cover both floors, trim fat first (protein is sacred), then accept low carb.
  if(carbCal < 0){
    fat = Math.max(bw ? Math.round(bw*0.5) : Math.round(cal*0.20/9), Math.round((cal - proCal) / 9 * 0.5));
    carbCal = cal - proCal - fat*9;
  }
  // THE FLOORS CAN BE UNPAYABLE. For a heavy person at the ED-safe calorie floor, protein at 2.2g/kg plus
  // fat at 0.5g/kg already exceeds the entire budget — from about 113kg at the 1500 male floor. The rescue
  // above trims fat but cannot touch protein, so carbCal stayed negative, carb clamped to 0, and the four
  // numbers returned summed to MORE than the cal returned beside them (115kg/1500 gave pro 253, carb 0,
  // fat 58 — 1534 kcal of macros against a 1500 target). renderNutritionLog draws the ring straight from
  // these fields, so the ring and the goal contradicted each other on screen. A bodyweight sweep found 24
  // of 46 rows wrong. v432 made this reachable from the automatic weight-trend adjustment and verified
  // only an 80kg/55kg pair — exactly where it does not bite.
  // Protein is still protected first; it is simply capped at what the budget can actually contain.
  if(carbCal < 0){
    const fatCalNow = fat * 9;
    pro = Math.max(0, Math.floor((cal - fatCalNow) / 4));
    carbCal = cal - pro * 4 - fatCalNow;
  }
  const carb = Math.max(0, Math.round(carbCal / 4));
  return { cal: Math.round(cal), pro, carb, fat };
}
// The adaptive number is MAINTENANCE — what the body actually burns. A person's daily TARGET is
// maintenance adjusted for their goal: a cut eats below it, a build above it. Applying maintenance
// as the target directly (what this used to do) silently erased a cutter's deficit — the flagship
// number quietly stopped their fat loss. This closes the loop the way MacroFactor does: learn real
// maintenance from data, THEN apply the goal to get the target the person actually eats to.
function _goalDir(){
  return String(ls('totry_calorie_goal_type') || (ls('totry_tdee_data')||{}).goal || ls('totry_goal_intent') || 'maintain').toLowerCase();
}
// THE ED-SAFE FLOOR, in one place. It existed only inside goalAdjustedTarget(), and calcTDEE() — the
// primary, most-discoverable path, the "Calculate my targets" button — rolled its own targets table with
// no floor at all and SAVED the result. A 22-year-old woman at 48kg/158cm, sedentary, choosing "lose fat"
// got a persisted target of 936 cal/day (BMR 1196, TDEE 1436, minus 500), while the adaptive path would
// have clamped the same person to 1200. Two derivations of the same number, and the unsafe one was the
// one people actually reach. On an app for people rebuilding their relationship with food, that is not a
// rounding error — it is the app prescribing a deficit it explicitly promises never to prescribe.
function _calFloor(){
  try{ return (typeof userSex==='function' && userSex()==='female') ? 1200 : 1500; }catch(_){ return 1200; }
}
function goalAdjustedTarget(maintenance){
  const gi = _goalDir();
  let cal = maintenance, proPerKg = 1.8, label = 'maintenance', verb = 'holding steady';
  if(/lose|cut|lean|deficit|fat/.test(gi)){ cal = maintenance - 500; proPerKg = 2.2; label = 'fat-loss target'; verb = 'leaning down'; }
  else if(/gain|build|bulk|surplus|muscle/.test(gi)){ cal = maintenance + 300; proPerKg = 2.4; label = 'muscle-gain target'; verb = 'building'; }
  // ED-safe floor — never prescribe a reckless deficit. (see _calFloor)
  cal = Math.max(cal, _calFloor());
  return { cal: Math.round(cal), proPerKg, label, verb, isAdjusted: cal !== Math.round(maintenance) };
}
// ── CALORIE / CARB CYCLING (the Train×Nourish squeeze #1) ───────────────────────────────────────
// The one thing a logger-plus-tracker can do that neither alone can: keep the WEEKLY average exactly
// where the goal needs it, but move calories to where the body uses them — more carbs on training
// days, fewer on rest days. Protein stays flat (muscle is protected every day); only carbs (and thus
// calories) swing. It's pure, transparent arithmetic — no AI, nothing to be "wrong" about — and it's
// OPT-IN, because plenty of people (fasted trainers included) don't want it. Off → everything uses
// the flat base target, exactly as before.
function _dayFocus(dow){ try{ const s=(typeof getUserSplit==='function')?getUserSplit():[]; const d=s&&s[dow]; return d&&d.focus?String(d.focus).trim():''; }catch(_){ return ''; } }
function _isTrainingDay(dow){
  const f=_dayFocus(dow);
  if(f && !/^rest$/i.test(f)) return true;                       // the split says train
  try{ if((ls('totry_cal_events')||[]).some(e=>e&&e.type==='gym'&&e.day===dow)) return true; }catch(_){}  // a gym event
  return false;
}
function _isTrainingToday(){
  const dow=(new Date().getDay()+6)%7;
  if(_isTrainingDay(dow)) return true;
  // Already trained today counts, even if it wasn't planned.
  try{ const today=new Date().toLocaleDateString('en-AU'); if((typeof getUnifiedTraining==='function'?getUnifiedTraining():[]).some(t=>t.kind==='strength'&&t.ts&&new Date(t.ts).toLocaleDateString('en-AU')===today)) return true; }catch(_){}
  return false;
}
function _trainingDaysPerWeek(){
  let n=0; for(let d=0; d<7; d++){ if(_isTrainingDay(d)) n++; }
  if(n>0) return n;
  // No split/calendar signal — count distinct gym-event weekdays as a fallback.
  try{ const days=new Set(); (ls('totry_cal_events')||[]).forEach(e=>{ if(e&&e.type==='gym'&&e.day!=null) days.add(e.day); }); if(days.size) return days.size; }catch(_){}
  return 0; // unknown → caller disables cycling
}
// Transform a base daily target into today's cycled target. Returns null when cycling can't/shouldn't
// apply (disabled, or we can't tell training from rest days), so callers fall back to the base.
function cycledTarget(base){
  try{
    const cfg = ls('totry_cal_cycling') || {};
    if(!cfg.enabled || !base || !base.cal) return null;
    const T = _trainingDaysPerWeek();
    const R = 7 - T;
    if(T <= 0 || R <= 0) return null;                              // need both kinds of day to move calories between them
    const baseCarb = base.carb || 0;
    if(baseCarb < 40) return null;                                 // too little carb to meaningfully cycle (e.g. keto)
    const swingPct = cfg.mode === 'aggressive' ? 0.35 : 0.20;     // share of base carbs shifted onto training days
    const addG = Math.round(baseCarb * swingPct);                 // extra carbs on a training day
    const training = _isTrainingToday();
    const out = Object.assign({}, base);
    if(training){
      out.carb = baseCarb + addG;
      out.cal = (base.cal||0) + addG*4;
      out.cycleDay = 'training'; out.cycleDelta = addG;
    } else {
      const cutG = Math.round(addG * T / R);                       // pulled from each rest day to keep the weekly total
      // The clamp and the calorie subtraction have to agree. out.carb was floored at 30g while out.cal
      // still had the FULL cut taken off it, so the macro ring and the calorie goal described different
      // days: the carbs shown could not add up to the calories shown. Subtract what was actually removed.
      out.carb = Math.max(30, baseCarb - cutG);
      const _actualCut = baseCarb - out.carb;
      out.cal = (base.cal||0) - _actualCut*4;
      out.cycleDay = 'rest'; out.cycleDelta = -_actualCut;
    }
    // ED-safe floor — a rest day can never dip below a sane minimum.
    const floor = (typeof userSex==='function' && userSex()==='female') ? 1200 : 1500;
    if(out.cal < floor){ out.cal = floor; }
    out.cycled = true; out.trainingDaysPerWeek = T; out.baseCal = base.cal;
    return out;
  }catch(_){ return null; }
}
function setCalCycling(enabled, mode){
  const cfg = ls('totry_cal_cycling') || {};
  cfg.enabled = !!enabled; if(mode) cfg.mode = mode;
  ls('totry_cal_cycling', cfg);
  if(typeof syncToCloud==='function') syncToCloud();
  if(typeof renderNutritionLog==='function') renderNutritionLog();
  if(typeof haptic==='function') haptic('tap');
  if(enabled && typeof showToast==='function'){
    const T=_trainingDaysPerWeek();
    showToast(mode==='aggressive'?'Cycling on · bigger swing':'Cycling on', T>0?('Carbs shift onto your '+T+' training day'+(T===1?'':'s')+'. Same weekly total.'):'Set your weekly split so I know your training days.');
  }
}
// The opt-in control. Explains the idea plainly, shows the T/R split it will use, and only offers to
// turn on once it can actually tell training from rest days (so it never silently does nothing).
function renderCyclingSetup(){
  const box=document.getElementById('cal-cycling-setup'); if(!box) return;
  const cfg=ls('totry_cal_cycling')||{};
  const on=!!cfg.enabled;
  const mode=cfg.mode||'moderate';
  const T=_trainingDaysPerWeek(); const R=7-T;
  const canCycle = T>0 && R>0;
  let body;
  if(!canCycle && !on){
    body='<div style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin-top:8px">Set your <span class="tlink" onclick="go(\'train\')">weekly training split</span> and I can shift carbs onto your training days automatically.</div>';
  } else {
    const modeBtn=(m,lbl,sub)=>'<button onclick="setCalCycling(true,\''+m+'\')" style="flex:1;text-align:left;padding:9px 11px;border-radius:9px;border:1px solid '+((on&&mode===m)?'var(--go-bd)':'var(--bd)')+';background:'+((on&&mode===m)?'var(--go-bg)':'transparent')+';color:'+((on&&mode===m)?'var(--go)':'var(--tx2)')+';cursor:pointer;font-family:Outfit,sans-serif"><div style="font-size:12px;font-weight:600">'+lbl+'</div><div style="font-size:10px;color:var(--tx3);margin-top:1px">'+sub+'</div></button>';
    body='<div style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin:8px 0 10px">'+(canCycle?('Using your split: <b style="color:var(--tx2)">'+T+' training</b> · <b style="color:var(--tx2)">'+R+' rest</b> days. Same weekly total, redistributed.'):'Set a training split so I know your days.')+'</div>'+
      (canCycle?('<div style="display:flex;gap:8px;margin-bottom:8px">'+modeBtn('moderate','Moderate','±20% carbs')+modeBtn('aggressive','Aggressive','±35% carbs')+'</div>'):'')+
      (on?'<button onclick="setCalCycling(false)" style="width:100%;background:none;border:1px solid var(--bd);color:var(--tx3);border-radius:9px;padding:8px;font-size:11.5px;cursor:pointer">Turn cycling off</button>':'');
  }
  box.innerHTML=
    '<div class="card" style="background:var(--bg2)">'+
      '<div style="display:flex;justify-content:space-between;align-items:center">'+
        '<div><div class="card-hd" style="margin-bottom:2px">\u{1F504} Calorie cycling'+(on?' <span style="font-family:DM Mono,monospace;font-size:9px;color:var(--go)">ON</span>':'')+'</div>'+
          '<div style="font-size:11px;color:var(--tx3)">More carbs on training days, fewer on rest</div></div>'+
        (on?'':'<button class="btn" style="width:auto;padding:7px 13px;font-size:12px;background:var(--go);color:#1a1505;border:none" onclick="'+(canCycle?'setCalCycling(true,\'moderate\')':'go(\'train\')')+'">'+(canCycle?'Turn on':'Set split')+'</button>')+
      '</div>'+
      body+
    '</div>';
}
// The at-a-glance "today is a training/rest day" badge on the food log — so the shifted number never
// looks like a mistake. Silent when cycling is off.
function renderCycleBadge(cyc){
  const box=document.getElementById('nut-cycle-badge'); if(!box) return;
  if(!cyc || !cyc.cycled){ box.innerHTML=''; return; }
  const training = cyc.cycleDay==='training';
  const col = training ? 'var(--go)' : 'var(--tx3)';
  const bg = training ? 'var(--go-bg)' : 'var(--bg3)';
  const bd = training ? 'var(--go-bd)' : 'var(--bd)';
  const deltaTxt = cyc.cycleDelta>0 ? ('+'+cyc.cycleDelta+'g carbs today') : (cyc.cycleDelta<0 ? (cyc.cycleDelta+'g carbs today') : 'baseline');
  box.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;background:'+bg+';border:1px solid '+bd+';border-radius:12px;padding:11px 14px;margin-bottom:14px">'+
      '<span style="font-size:16px">'+(training?'\u{1F525}':'\u{1F31B}')+'</span>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:13px;color:var(--tx);font-weight:600">'+(training?'Training day':'Rest day')+' <span style="font-family:DM Mono,monospace;font-size:11px;color:'+col+';font-weight:400">· '+deltaTxt+'</span></div>'+
        '<div style="font-size:11px;color:var(--tx3);line-height:1.4;margin-top:1px">Carbs shifted to match your day — protein held, weekly total unchanged.</div>'+
      '</div>'+
    '</div>';
}
function setCalGoalFromTDEE(tdee){
  // tdee = the learned MAINTENANCE. Turn it into the goal-appropriate daily target first, then build
  // a full protein-protected macro target from that (not a bare calorie swap that leaves carbs/fat
  // stale). Protein scales up on a cut to spare muscle, per the goal.
  const adj = goalAdjustedTarget(tdee);
  const goals = macrosForCalories(adj.cal, { proPerKg: adj.proPerKg });
  goals._ts = Date.now();
  ls('totry_nut_goals', goals);
  ls('totry_nut_macros', goals);
  if(typeof syncToCloud==='function') syncToCloud();
  haptic('success');
  const msg = adj.isAdjusted
    ? 'Maintenance ~' + tdee.toLocaleString() + ' → your ' + adj.label + ' ' + adj.cal.toLocaleString() + ' cal · ' + goals.pro + 'g protein.'
    : 'Maintenance set to ' + tdee.toLocaleString() + ' cal · ' + goals.pro + 'g protein held firm.';
  showToast('Goal updated ✓', msg);
  if(typeof prefillNutGoals==='function') prefillNutGoals();
  if(typeof renderNutSetupNudge==='function') renderNutSetupNudge(); // hide "starter numbers" instantly — the save took
  if(typeof renderAdaptiveTDEE==='function') try{ renderAdaptiveTDEE(); }catch(_){}
  renderNutritionLog();
}

// Warmup ramp calculator: from your top working weight, the standard pyramid —
// bar/light ×10, 40%×8, 60%×5, 80%×2-3 — so you arrive at the work set primed, not fried.
async function openWarmupCalc(){
  const w = parseFloat(await askText('Top working weight today', 'In kilograms.', {type:'number', confirmLabel:'Build the warm-up', value: ls('totry_last_warmup_target')||''}));
  if(!w || isNaN(w) || w <= 0) return;
  ls('totry_last_warmup_target', w);
  const r5 = x => Math.max(20, Math.round(x/2.5)*2.5); // round to 2.5kg, never below the bar
  const ramp = [
    {pct:'Bar / light', wt: w>=60 ? 20 : r5(w*0.3), reps:'×10'},
    {pct:'40%', wt:r5(w*0.4), reps:'×8'},
    {pct:'60%', wt:r5(w*0.6), reps:'×5'},
    {pct:'80%', wt:r5(w*0.8), reps:'×2–3'}
  ];
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.style.alignItems='center';
  m.innerHTML='<div class="modal">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:21px;color:var(--tx);font-style:italic;margin-bottom:4px">Warmup ramp → '+w+'kg</div>'+
    '<div style="text-align:center;font-size:12px;color:var(--tx3);margin-bottom:14px">Rest ~45–60s between warmup sets.</div>'+
    ramp.map(s=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px;border-bottom:1px solid var(--bd)">'+
      '<span style="font-family:DM Mono,monospace;font-size:11px;color:var(--tx3)">'+s.pct+'</span>'+
      '<span style="font-size:15px;color:var(--tx)">'+s.wt+'kg <span style="color:var(--tx3);font-size:12px">'+s.reps+'</span></span>'+
    '</div>').join('')+
    '<button class="btn primary" onclick="closeModal(this)" style="margin-top:14px">Got it</button>'+
    '</div>';
  document.body.appendChild(m);
  haptic('tap');
}

// ── THE HANDOFF ──
// SOUL-ARCHITECTURE, GROW: "make them FEEL like one loop — each hands off to the next with a line of
// meaning." Three cards in a grid are three tabs. A line under each saying what it just earned the
// NEXT one is a loop: you trained, so you are owed this fuel, and here is what your body did with it.
//
// Deterministic only — every number below is counted from what the person actually logged, never
// estimated and never asked of a model. A line is written ONLY when it is true; an empty card says
// nothing rather than something encouraging, because a handoff that is invented is worse than none.
// Same 7-day window as renderBodySystemReport, so the hub and the card can never disagree.
function renderGrowHandoffs(){
  const set = (id, text) => {
    const el = document.getElementById(id);
    if(!el) return;
    if(text){ el.textContent = text; el.classList.add('on'); }
    else { el.textContent = ''; el.classList.remove('on'); }
  };
  try{
    const now = Date.now(), W = 7*86400000;
    const inWeek = t => { const x = new Date(t).getTime(); return x > now - W && x <= now; };

    // TRAIN → what it earned
    const ws = (ls('totry_workouts')||[]).filter(w => w && w.ts && inWeek(w.ts));
    const burned = Math.round(ws.reduce((a,w) => a + (Number(w.calories)||0), 0));
    let trainLine = '';
    if(ws.length){
      const n = ws.length + (ws.length === 1 ? ' session' : ' sessions');
      trainLine = burned > 0
        ? n + ' this week \u2014 about ' + burned.toLocaleString() + ' cal earned \u2192 fuel it'
        : n + ' this week \u2192 fuel what you earned';
    }
    set('hand-train', trainLine);

    // NOURISH → what came back in, and whether the protein matched the training
    const log = ls('totry_nutlog') || {};
    const days = {};
    Object.keys(log).forEach(k => (log[k]||[]).forEach(e => {
      if(!e || !e.ts || !inWeek(e.ts)) return;
      const d = days[k] = days[k] || { cal:0, pro:0, t:0 };
      d.cal += Number(e.cal)||0; d.pro += Number(e.pro)||0;
      const t = new Date(e.ts).getTime();
      if(!isNaN(t) && t > d.t) d.t = t;                // newest entry stamps the day, for the sort above
    }));
    // Cap at 7. The keys are en-AU date strings and the window is a rolling 168 hours, so a person
    // who logs late one night and early the next morning can have EIGHT distinct day-keys inside it —
    // and the app told a consistent logger "8 of 7 days fuelled", which is the kind of sentence that
    // makes someone stop believing every other number on the screen.
    // Cap at 7, but keep the SEVEN MOST RECENT. A rolling 168-hour window can hold eight en-AU day
    // keys, so the count had to be capped — but slice(0,7) takes them in object insertion order,
    // which dropped whichever key was inserted last. That was usually TODAY: the protein average
    // silently excluded the food the person had just logged, which is the one number they came to
    // check. Sort by the day's own timestamp and keep the newest seven.
    const logged = Object.keys(days).filter(k => days[k].cal > 0)
      .sort((a, b) => (days[b].t || 0) - (days[a].t || 0))
      .slice(0, 7);
    let nourishLine = '';
    if(logged.length){
      const avgPro = Math.round(logged.reduce((a,k) => a + days[k].pro, 0) / logged.length);
      nourishLine = logged.length + ' of 7 days fuelled'
        + (avgPro > 0 ? ', ' + avgPro + 'g protein a day' : '')
        + ' \u2192 see what it did';
    } else if(ws.length){
      // trained but never logged a meal: the loop is broken at this exact link, and saying so is the
      // most useful thing this line can do
      nourishLine = 'You trained, but nothing logged to fuel it \u2192 start here';
    }
    set('hand-nourish', nourishLine);

    // TRACK → what the body actually did, which is the only honest verdict on the two above
    const body = (ls('totry_body')||[]).filter(e => e && Number(e.weight) > 0)
      .sort((a,b) => new Date(a.ts||a.date) - new Date(b.ts||b.date));
    let trackLine = '';
    if(body.length >= 2){
      const older = body.filter(e => new Date(e.ts||e.date).getTime() <= now - W);
      const from = older.length ? Number(older[older.length-1].weight) : Number(body[0].weight);
      const to = Number(body[body.length-1].weight);
      const diff = Math.round((to - from) * 10) / 10;
      const unit = (typeof wDelta === 'function') ? wDelta(diff, { zero:'steady' }) : (diff + 'kg');
      // "Over the week" has to actually BE over a week. When there is no weigh-in older than seven
      // days this compared the first and last of a much shorter span — two readings on the same
      // morning became "+0.4kg over the week", which is a scale fluctuation reported as a trend and
      // is exactly the false mechanism this app refuses elsewhere. Say the real span, or say nothing.
      const fromT = new Date((older.length ? older[older.length-1] : body[0]).ts || (older.length ? older[older.length-1] : body[0]).date).getTime();
      const toT   = new Date(body[body.length-1].ts || body[body.length-1].date).getTime();
      const spanDays = Math.round((toT - fromT) / 86400000);
      if(spanDays < 2){
        trackLine = 'Two weigh-ins, hours apart \u2014 give it a few days before it means anything';
      } else {
        // I fixed the SHORT side and left the long one: >= 6 days meant "over the week" whether the
        // gap was seven days or ninety-six. Telling someone their three months of work happened "over
        // the week" is the same error in the other direction, and it makes the number meaningless.
        const span = spanDays <= 8 ? 'over the week'
                   : spanDays <= 45 ? 'over ' + Math.round(spanDays / 7) + ' weeks'
                   : 'over ' + Math.round(spanDays / 30) + ' months';
        trackLine = diff === 0 ? 'Holding steady ' + span + ' \u2014 that is what the fuel did'
                               : unit + ' ' + span + ' \u2014 that is what the training and the fuel did';
      }
    } else if(body.length === 1){
      trackLine = 'One weigh-in so far \u2014 one more and the trend starts';
    } else if(ws.length || logged.length){
      trackLine = 'Nothing weighed yet \u2014 this is where the work shows up';
    }
    set('hand-track', trackLine);
  }catch(_){ }
}

// ── YOUR BODY, ONE SYSTEM ──
// The unifier: Train + Nourish + Track are one loop — you train, you fuel it, your body
// changes, which reveals your real burn, which tunes your targets. This card shows the
// whole loop for the last 7 days in one glance, with a Coach hand-off to make sense of it.
function renderBodySystemReport(){
  const containers = ['body-system-report-grow'].map(id=>document.getElementById(id)).filter(Boolean);
  if(!containers.length) return;
  const now = Date.now(), W = 7*86400000;
  const stat = (val,lbl,color)=>'<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center"><div style="font-family:DM Mono,monospace;font-size:16px;color:'+(color||'var(--tx)')+'">'+val+'</div><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.08em;margin-top:2px">'+lbl+'</div></div>';
  const arrow = (cur,prev)=> (prev==null||cur==null||prev===0) ? '' : (cur>prev*1.03?' <span style="color:var(--gr)">\u2191</span>':cur<prev*0.97?' <span style="color:var(--re)">\u2193</span>':' <span style="color:var(--tx3)">\u2192</span>');
  const inWin=(t,a,b)=>{const x=new Date(t).getTime();return x>now-a&&x<=now-b;};

  // TRAIN: this week vs last week, plus intensity (RPE 9+ share)
  const ws=(ls('totry_workouts')||[]).filter(w=>w&&w.ts);
  const wk=ws.filter(w=>inWin(w.ts,W,0)), pw=ws.filter(w=>inWin(w.ts,2*W,W));
  const wCount=wk.length, wVol=Math.round(wk.reduce((a,w)=>a+(w.volume||0),0));
  const pCount=pw.length, pVol=Math.round(pw.reduce((a,w)=>a+(w.volume||0),0));
  let hard=0, totSets=0;
  wk.forEach(w=>(w.exercises||[]).forEach(ex=>(ex.sets||[]).forEach(x=>{ if(x){ totSets++; const r=parseFloat(x.rpe); if(r>=9) hard++; } })));
  const intense = totSets>=8 && (hard/totSets)>0.4;

  // NOURISH: per-day sums, this week + previous
  const log=ls('totry_nutlog')||{};
  const day={}, pday={};
  Object.values(log).forEach(es=>{ (es||[]).forEach(e=>{ if(!e||!e.ts) return;
    if(inWin(e.ts,W,0)){ const k=e.date||String(e.ts).slice(0,10); (day[k]=day[k]||{c:0,p:0}); day[k].c+=e.cal||0; day[k].p+=e.pro||0; }
    else if(inWin(e.ts,2*W,W)){ const k=e.date||String(e.ts).slice(0,10); (pday[k]=pday[k]||{c:0}); pday[k].c+=e.cal||0; } }); });
  const dks=Object.keys(day).filter(k=>day[k].c>0);
  const daysLogged=dks.length;
  const avgCal=daysLogged?Math.round(dks.reduce((a,k)=>a+day[k].c,0)/daysLogged):null;
  const avgPro=daysLogged?Math.round(dks.reduce((a,k)=>a+day[k].p,0)/daysLogged):null;
  const pdk=Object.keys(pday).filter(k=>pday[k].c>0);
  const pAvgCal=pdk.length?Math.round(pdk.reduce((a,k)=>a+pday[k].c,0)/pdk.length):null;

  // TRACK: trend now vs trend a week ago + weigh-in count
  const body=(ls('totry_body')||[]).filter(e=>e&&e.weight>0).sort((a,b)=>new Date(a.ts)-new Date(b.ts));
  const trend=(typeof getTrendWeight==='function'&&body.length)?getTrendWeight(body):null;
  const wAgo=body.filter(e=>new Date(e.ts).getTime()<=now-W);
  const trendPrev=(typeof getTrendWeight==='function'&&wAgo.length)?getTrendWeight(wAgo):null;
  const weekChange=(trend!=null&&trendPrev!=null)?Math.round((trend-trendPrev)*10)/10:null;
  const weighIns=body.filter(e=>inWin(e.ts,W,0)).length;

  const domains=(wCount>0?1:0)+(daysLogged>=2?1:0)+(body.length>=2?1:0);
  if(domains<2){
    const preview='<div class="eyebrow" style="color:var(--go);margin-bottom:8px">Your body, one system</div>'+
      '<div style="font-size:12px;color:var(--tx2);line-height:1.65">Train, Nourish and Track feed one loop. Log a workout, a couple of days of food, and a weigh-in \u2014 this becomes your weekly verdict: is it working, and the one thing to change.</div>'+
      // The three buttons that were here — "Log a workout", "Log a meal", "Log a weigh-in" —
      // went to exactly the same places as the three hub cards sitting directly above this card.
      // Six ways into three destinations, stacked. The card's job is to explain that they are one
      // loop; the hub is the way in, and the handoff lines under each card now say what is next.
      '';
    containers.forEach(b=>{b.style.display='block';b.innerHTML=preview;});
    return;
  }

  // GOAL INTENT \u2014 the loop judges itself against where you say you're going
  const goal=ls('totry_body_goal');
  let goalRow='';
  if(!goal){
    goalRow='<div style="font-size:12px;color:var(--tx2);margin-bottom:8px">What are you aiming for? One tap \u2014 the loop will judge itself against it.</div>'+
      '<div style="display:flex;gap:6px;margin-bottom:10px">'+
      '<button class="btn" style="flex:1;font-size:12px;background:var(--bg3);border:1px solid var(--bd)" onclick="setBodyGoal(\'cut\')">Cut \u22120.5/wk</button>'+
      '<button class="btn" style="flex:1;font-size:12px;background:var(--bg3);border:1px solid var(--bd)" onclick="setBodyGoal(\'maintain\')">Maintain</button>'+
      '<button class="btn" style="flex:1;font-size:12px;background:var(--bg3);border:1px solid var(--bd)" onclick="setBodyGoal(\'build\')">Build +0.25/wk</button>'+
      '</div>';
  }

  const lowConf = daysLogged<4;
  const gkg = (avgPro&&trend)?Math.round(avgPro/trend*100)/100:null;
  const tdeeR = (typeof computeAdaptiveTDEE==='function')?computeAdaptiveTDEE():null;

  // ENERGY-BALANCE VERDICT (MacroFactor's deepest idea, in one honest sentence)
  let verdict='';
  if(lowConf){ verdict='<span style="color:var(--tx3)">Low confidence \u2014 only '+daysLogged+' day'+(daysLogged===1?'':'s')+' of food logged. Log most days and this becomes a real verdict.</span>'; }
  else if(tdeeR&&weekChange!=null){
    const bal=Math.round((avgCal!=null?avgCal:tdeeR.avgIntake)-tdeeR.tdee);
    const exp=Math.round(bal*7/7700*100)/100;
    const agree=Math.abs(exp-weekChange)<=0.35;
    verdict='Eating ~'+(bal>=0?'+':'')+bal+' cal/day vs your real burn \u2192 expect '+(exp>=0?'+':'')+exp+'kg/wk; the scale says '+(weekChange>=0?'+':'')+weekChange+'kg \u2014 your data '+(agree?'<span style="color:var(--gr)">agrees \u2713</span>':'<span style="color:var(--go)">disagrees \u2014 keep logging tight</span>')+'.';
    if(goal){
      const tgt=goal.rate||0;
      const onPace=Math.abs(weekChange-tgt)<=0.25;
      verdict+=' Goal <b>'+goal.mode+'</b> ('+(tgt>=0?'+':'')+tgt+'kg/wk): '+(onPace?'<span style="color:var(--gr)">on pace \u2713</span>':'<span style="color:var(--go)">off pace</span>')+'.';
    }
  } else { verdict='<span style="color:var(--tx3)">~3 weeks of weight + food unlocks the energy-balance verdict \u2014 keep logging.</span>'; }

  // ONE COMPUTED ADJUSTMENT \u2014 weakest link wins (rule-based, costs nothing)
  let adjust='Hold the line \u2014 keep doing exactly this for another week.';
  if(goal&&goal.mode!=='maintain'&&gkg!=null&&gkg<1.6) adjust='Protein is '+gkg+'g/kg \u2014 push toward 1.6\u20132.2 (\u2248'+Math.round((trend||80)*1.8)+'g/day). Highest-leverage fix this week.';
  else if(goal&&goal.mode==='cut'&&tdeeR&&!lowConf&&avgCal!=null&&(avgCal-tdeeR.tdee)>0) adjust='You\'re cutting but eating ~'+Math.round(avgCal-tdeeR.tdee)+' above your real burn \u2014 trim ~250/day and re-check next week.';
  else if(weighIns<2) adjust='Only '+weighIns+' weigh-in'+(weighIns===1?'':'s')+' this week \u2014 2\u20133 quick morning weigh-ins make the trend trustworthy.';
  else if(pVol>0&&wVol<pVol*0.7) adjust='Volume cliff: '+wVol.toLocaleString()+'kg vs '+pVol.toLocaleString()+'kg last week \u2014 protect the floor: even two short sessions count.';
  else if(intense) adjust=Math.round(hard/totSets*100)+'% of your sets hit RPE 9\u201310 \u2014 strong week; plan a lighter day before your body plans it for you.';

  const html='<div class="eyebrow" style="color:var(--go);margin-bottom:8px">Your body, one system \u00b7 last 7 days'+(lowConf?' \u00b7 <span style="color:var(--tx3)">low data</span>':'')+'</div>'+
    goalRow+
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">'+
    stat(wCount+arrow(wCount,pCount),'workout'+(wCount===1?'':'s'),wCount>0?'var(--go)':'var(--tx3)')+
    stat((avgCal!=null?avgCal.toLocaleString():'\u2014')+arrow(avgCal,pAvgCal),'avg cal/day')+
    stat(trend!=null?wFmt(trend):'\u2014',weekChange!=null?(wDelta(weekChange)+' wk'):'trend',weekChange!=null?(weekChange<0?'var(--gr)':'var(--go)'):'var(--tx)')+
    '</div>'+
    '<div style="font-size:12px;color:var(--tx2);line-height:1.65">'+
    (wVol?wVol.toLocaleString()+'kg lifted'+arrow(wVol,pVol):'No volume logged')+
    (gkg!=null?' \u00b7 protein '+gkg+'g/kg'+(gkg>=1.6?' <span style="color:var(--gr)">\u2713</span>':''):'')+
    (daysLogged?' \u00b7 '+daysLogged+'/7 days logged':'')+'</div>'+
    '<div style="font-size:12px;color:var(--tx2);line-height:1.65;margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)">'+verdict+'</div>'+
    '<div style="font-size:12px;line-height:1.6;margin-top:8px;padding:10px;background:var(--go-bg);border:1px solid var(--go-bd);border-radius:8px;color:var(--tx)"><span style="font-family:DM Mono,monospace;font-size:8px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:4px">This week\'s one adjustment</span>'+adjust+'</div>'+
    '<button class="btn" onclick="askCoachWeekRead()" style="margin-top:10px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12px">Deeper read from Coach</button>';
  containers.forEach(b=>{b.style.display='block';b.innerHTML=html;});
  window.__weekReadCtx={wCount,wVol,avgCal,avgPro,daysLogged,trend,weekChange,goal:goal||null,gkg,tdee:tdeeR?tdeeR.tdee:null};
}
function setBodyGoal(mode){
  const rate = mode==='cut' ? -0.5 : mode==='build' ? 0.25 : 0;
  ls('totry_body_goal', {mode, rate});
  // `mode` is cut / maintain / bulk — a statement about their body and what they think of it.
  logEvent('goal_set');
  haptic('tick');
  renderBodySystemReport();
}
function askCoachWeekRead(){
  const c = window.__weekReadCtx || {};
  const p = 'Read my week as one system. Goal: ' + (c.goal ? c.goal.mode + ' at ' + c.goal.rate + 'kg/wk' : 'not set') +
    '. Training: ' + (c.wCount||0) + ' workouts, ' + (c.wVol||0) + 'kg volume. Food: ' + (c.avgCal!=null?c.avgCal:'?') + ' avg cal, ' +
    (c.avgPro!=null?c.avgPro:'?') + 'g protein (' + (c.gkg!=null?c.gkg:'?') + 'g/kg) across ' + (c.daysLogged||0) + ' days. Body: trend ' +
    (c.trend!=null?c.trend:'?') + 'kg, ' + (c.weekChange==null?'?':c.weekChange) + 'kg change this week. Real burn ~' + (c.tdee!=null?c.tdee:'?') +
    '. One honest paragraph: is it working, and the single adjustment for next week.';
  go('coach');
  setTimeout(() => { if(typeof sendCoachPrompt === 'function') sendCoachPrompt(p); }, 400);
}

function renderNutTrend(){
  const card=document.getElementById('nut-trend-card');
  const box=document.getElementById('nut-trend-chart');
  if(!card||!box) return;
  const log=ls('totry_nutlog')||{};
  const goal=(ls('totry_nut_goals')||{}).cal||2100;
  // Build last 14 days
  const days=[];
  for(let i=13;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const key=d.toLocaleDateString('en-AU');
    const entries=log[key]||[];
    const cal=Math.round(entries.reduce((a,e)=>a+(e.cal||0),0));
    days.push({key, cal, label:d.toLocaleDateString('en-AU',{day:'numeric'})});
  }
  const daysWithData=days.filter(d=>d.cal>0).length;
  if(daysWithData<2){ card.style.display='none'; return; }
  card.style.display='block';
  
  const W=320,H=130,padL=34,padR=8,padT=12,padB=20;
  const maxV=Math.max(goal*1.2, ...days.map(d=>d.cal));
  const barW=(W-padL-padR)/days.length;
  const y=v=>padT+(1-v/maxV)*(H-padT-padB);
  
  let svg='<svg aria-hidden="true" viewBox="0 0 '+W+' '+H+'" style="width:100%;display:block">';
  // Goal line
  const gy=y(goal);
  svg+='<line x1="'+padL+'" y1="'+gy.toFixed(1)+'" x2="'+(W-padR)+'" y2="'+gy.toFixed(1)+'" stroke="var(--go)" stroke-width="1" stroke-dasharray="3,3" opacity="0.7"/>';
  svg+='<text x="'+(padL-4)+'" y="'+(gy+3).toFixed(1)+'" text-anchor="end" font-family="DM Mono,monospace" font-size="8" fill="var(--go)">'+goal+'</text>';
  // Bars
  days.forEach((d,i)=>{
    const x=padL+i*barW+1;
    const bw=barW-2;
    if(d.cal>0){
      const bh=(H-padB)-y(d.cal);
      const over=d.cal>goal*1.1;
      const color=over?'var(--re)':(d.cal>=goal*0.85?'var(--gr)':'rgba(200,169,110,0.6)');
      svg+='<rect x="'+x.toFixed(1)+'" y="'+y(d.cal).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,bh).toFixed(1)+'" rx="2" fill="'+color+'"/>';
    } else {
      svg+='<rect x="'+x.toFixed(1)+'" y="'+(H-padB-2)+'" width="'+bw.toFixed(1)+'" height="2" rx="1" fill="rgba(255,255,255,0.06)"/>';
    }
    if(i===0||i===days.length-1||i===Math.floor(days.length/2)){
      svg+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="var(--tx3)">'+d.label+'</text>';
    }
  });
  svg+='</svg>';
  
  // Average of days with data
  const avg=Math.round(days.filter(d=>d.cal>0).reduce((a,d)=>a+d.cal,0)/daysWithData);
  box.innerHTML=svg+
    '<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:10px;border-top:1px solid var(--bd);font-family:DM Mono,monospace;font-size:10px">'+
      '<span style="color:var(--tx3)">14-day avg: <span style="color:var(--tx)">'+avg+' cal</span></span>'+
      '<span style="color:var(--tx3)">Goal: <span style="color:var(--go)">'+goal+'</span></span>'+
    '</div>';
}
// ── MICRONUTRIENT PANEL ─────────────────────────────────────
// RDA (Recommended Daily Allowance) approximate values for adults.
// These are NOT prescriptive — just reference points so the bar means something.
const MICRO_RDA = {
  // Macros extension
  fiber: {rda: 30, unit: 'g', label: 'Fiber'},
  sugar: {rda: 50, unit: 'g', label: 'Sugar (max)', max: true},
  sodium: {rda: 2300, unit: 'mg', label: 'Sodium (max)', max: true},
  sat_fat: {rda: 20, unit: 'g', label: 'Sat fat (max)', max: true},
  cholesterol: {rda: 300, unit: 'mg', label: 'Cholesterol (max)', max: true},
  // Vitamins
  vit_a: {rda: 900, unit: 'mcg', label: 'Vitamin A'},
  vit_c: {rda: 90, unit: 'mg', label: 'Vitamin C'},
  vit_d: {rda: 15, unit: 'mcg', label: 'Vitamin D'},
  vit_e: {rda: 15, unit: 'mg', label: 'Vitamin E'},
  vit_k: {rda: 120, unit: 'mcg', label: 'Vitamin K'},
  b1: {rda: 1.2, unit: 'mg', label: 'B1 (Thiamin)'},
  b2: {rda: 1.3, unit: 'mg', label: 'B2 (Riboflavin)'},
  b3: {rda: 16, unit: 'mg', label: 'B3 (Niacin)'},
  b6: {rda: 1.7, unit: 'mg', label: 'B6'},
  b9: {rda: 400, unit: 'mcg', label: 'B9 (Folate)'},
  b12: {rda: 2.4, unit: 'mcg', label: 'B12'},
  // Minerals
  calcium: {rda: 1000, unit: 'mg', label: 'Calcium'},
  iron: {rda: 18, unit: 'mg', label: 'Iron'},
  magnesium: {rda: 400, unit: 'mg', label: 'Magnesium'},
  phosphorus: {rda: 700, unit: 'mg', label: 'Phosphorus'},
  potassium: {rda: 3500, unit: 'mg', label: 'Potassium'},
  zinc: {rda: 11, unit: 'mg', label: 'Zinc'},
  selenium: {rda: 55, unit: 'mcg', label: 'Selenium'},
  copper: {rda: 0.9, unit: 'mg', label: 'Copper'}
};

function toggleMicroPanel(){
  const panel = document.getElementById('micro-panel');
  const arrow = document.getElementById('micro-panel-arrow');
  const toggle = document.getElementById('micro-panel-toggle');
  if(!panel) return;
  const open = panel.style.display !== 'none' && panel.style.display !== '';
  if(open){
    panel.style.display = 'none';
    if(arrow) arrow.style.transform = 'rotate(0deg)';
    if(toggle) toggle.querySelector('span').textContent = 'Show vitamins & minerals';
  } else {
    panel.style.display = 'block';
    if(arrow) arrow.style.transform = 'rotate(180deg)';
    if(toggle) toggle.querySelector('span').textContent = 'Hide vitamins & minerals';
  }
}

function renderMicroPanel(totals){
  const panel = document.getElementById('micro-panel');
  if(!panel) return;
  
  // Group: vitamins / minerals
  const vits = ['vit_a','vit_c','vit_d','vit_e','vit_k','b1','b2','b3','b6','b9','b12'];
  const mins = ['calcium','iron','magnesium','phosphorus','potassium','zinc','selenium','copper'];
  
  const rowHtml = (key) => {
    const def = MICRO_RDA[key];
    if(!def) return '';
    const val = totals[key] || 0;
    const pct = Math.min(200, Math.round((val / def.rda) * 100));
    // For "max" type (sodium/sugar/sat_fat/cholesterol), over is bad
    // For normal nutrients, over is fine (excess water-soluble vitamins just excrete)
    let color;
    if(def.max){
      color = pct >= 100 ? 'var(--re)' : pct >= 75 ? 'var(--go)' : 'var(--gr)';
    } else {
      color = pct >= 100 ? 'var(--gr)' : pct >= 50 ? 'var(--go)' : 'var(--tx2)';
    }
    const barWidth = Math.min(100, pct);
    return '<div style="display:flex;align-items:center;gap:10px;padding:5px 0;font-size:11px">' +
      '<div style="min-width:100px;color:var(--tx2)">' + def.label + '</div>' +
      '<div style="flex:1;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden">' +
        '<div style="height:100%;background:' + color + ';width:' + barWidth + '%;transition:width 0.3s"></div>' +
      '</div>' +
      '<div style="min-width:78px;text-align:right;font-family:DM Mono,monospace;color:' + color + '">' + (Math.round(val * 10) / 10) + def.unit + ' · ' + pct + '%</div>' +
    '</div>';
  };
  
  panel.innerHTML =
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">Vitamins</div>' +
    vits.map(rowHtml).join('') +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin:14px 0 8px">Minerals</div>' +
    mins.map(rowHtml).join('') +
    '<div style="font-family:Cormorant Garamond,serif;font-size:11px;font-style:italic;color:var(--tx3);text-align:center;margin-top:14px;line-height:1.5">RDA = standard adult reference. % is approximate guidance, not prescription. Only USDA-sourced foods contribute micros — branded foods and AI-estimated meals may not.</div>';
}

// MFP rip: tap \u270e on a diary row \u2192 serving modal prefilled \u2192 saving REPLACES the entry.
function editFoodEntry(date, id){
  const log = ls('totry_nutlog') || {};
  const en = (log[date] || []).find(e => e.id === id);
  if(!en) return;
  const qty = en.qty || 1;
  const per = v => Math.round(((v || 0) / qty) * 1e6) / 1e6;
  const food = { name: en.name, brand: 'Editing \u2014 adjust serving or qty', servings: [{ name: en.serving || '1 serving', cal: per(en.cal), pro: per(en.pro), carb: per(en.carb), fat: per(en.fat) }] };
  // A gram/ml-weighed entry must re-open weighed. Without __exact the quantity field is labelled
  // "servings", so editing 91g of oats read "91 servings" next to 150 cal.
  if(/type the exact amount|^\s*(grams|millilitres)\b/i.test(en.serving || '')){
    food.servings[0].__exact = true;
    food.__unit = /millilitre|\bml\b/i.test(en.serving || '') ? 'ml' : 'g';
  }
  const CORE = ['id','name','cal','pro','carb','fat','serving','qty','meal','ts','date','source'];
  Object.keys(en).forEach(k => { if(CORE.indexOf(k) === -1 && typeof en[k] === 'number'){ food[k] = en[k] / qty; } });
  openServingModal(food);
  window.__editingEntry = { date, id };
  const q = document.getElementById('sm-qty'); if(q) q.value = qty;
  if(en.meal && typeof selectMealChip === 'function') selectMealChip(en.meal);
  // openServingModal() reset the quantity to 1 and previewed ONE serving. Setting .value from JS
  // fires no input event, so the modal showed per-serving macros beside a field saying "2" — the
  // person approved 101 cal while 202 was what saved (or "fixed" the quantity to 4 and saved 404).
  // What is SHOWN must be what is SAVED.
  if(typeof updateServingPreview === 'function') updateServingPreview();
}

// The per-day nutlog union is handed 'totry_nutlog' as its tombstone key, and nothing was recording one
// — so a deleted food came back on the next pull exactly as a deleted journal entry used to. The union
// keys each entry by syncIdOf, so the tombstone has to be recorded the same way, from the same diff.
function deleteFoodEntry(date,id){
  const log=ls('totry_nutlog')||{};
  if(log[date]){
    const before=log[date];
    const after=before.filter(e=>e.id!==id);
    tombstoneRemoved('totry_nutlog', before, after);
    log[date]=after;
  }
  ls('totry_nutlog',log);
  renderNutritionLog();
}


function saveNutGoals(){
  const calV=document.getElementById('nut-goal-cal').value;
  const proV=document.getElementById('nut-goal-pro').value;
  const carbV=document.getElementById('nut-goal-carb')?.value;
  const fatV=document.getElementById('nut-goal-fat')?.value;
  const existing=ls('totry_nut_goals')||{};
  // "0" IS A TRUTHY STRING. `calV || existing.cal || 2100` keeps "0", parseInt makes it 0, and the
  // care gate below then read `cal > 0 && cal < floor` — so a goal of zero calories skipped the one
  // door in this app built to notice restriction, and was stored as the person's target. That is the
  // single most dangerous number this field can hold, and it was the one number that got through.
  const _num = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
  const cal = _num(calV) != null ? _num(calV) : (_num(existing.cal) != null ? _num(existing.cal) : 2100);
  const pro = _num(proV) != null ? _num(proV) : (_num(existing.pro) != null ? _num(existing.pro) : 170);
  // A target that is zero, negative or absurd is not a target. Refuse it rather than store it — and
  // still open the care door, because someone typing 0 is telling us something.
  if(!(cal > 0) || cal > 20000){
    if(typeof showToast === 'function') showToast('That is not a target I can hold you to', 'Give me a calorie number above zero — or leave it blank and I will work one out with you.');
    if(cal === 0 && typeof showLowCalorieCare === 'function') setTimeout(() => showLowCalorieCare(), 400);
    return;
  }
  const goals={cal,pro};
  // Carbs/fat optional in the form — but a goal with 0 carbs/0 fat is meaningless and shows as
  // "0g" everywhere. If the user provides them, use them; otherwise DERIVE sensible targets from
  // the remaining calories after protein (≈25% of remaining cals to fat, the rest to carbs).
  if(carbV!=='' && carbV!=null) goals.carb=parseInt(carbV);
  if(fatV!=='' && fatV!=null) goals.fat=parseInt(fatV);
  if(goals.carb==null || goals.fat==null){
    const proCal = pro * 4;
    const remain = Math.max(0, cal - proCal);
    if(goals.fat==null) goals.fat = Math.round((remain * 0.30) / 9);   // ~30% of remaining cals from fat
    if(goals.carb==null){ const fatCal = goals.fat * 9; goals.carb = Math.round(Math.max(0, remain - fatCal) / 4); }
  }
  goals._ts = Date.now();
  ls('totry_nut_goals',goals);
  ls('totry_calorie_goal_type','manual');
  renderNutritionLog();
  prefillNutGoals();
  let msg='Cal: '+cal+' \u00b7 Protein: '+pro+'g';
  if(goals.carb) msg+=' \u00b7 Carbs: '+goals.carb+'g';
  if(goals.fat) msg+=' \u00b7 Fat: '+goals.fat+'g';
  // Adaptation, made felt at the decision moment \u2014 not a one-time number. Kills the "set it once" feeling.
  showToast('Target set \u2014 and it adapts', msg+' \u00b7 I\u2019ll recalibrate this from your real weight & intake as you go.');
  if(typeof renderNutSetupNudge==='function') renderNutSetupNudge(); // reflect the save immediately, no tab-restart needed
  if(typeof renderNutritionLog==='function') renderNutritionLog();
  haptic('success');
  // Duty of care: a goal this low is below what the body needs to function. We don't lecture
  // or set a "safe" number — we gently open a door to support and let the person decide.
  // _calFloor(), not a bare 1200, so a man setting 1400 gets the same door a woman setting 1100 does.
  // Deliberately still does NOT override the person's own number — the comment above is the design:
  // open a door, never lecture, never silently "correct" what they chose.
  if(cal < ((typeof _calFloor === 'function') ? _calFloor() : 1200)){
    setTimeout(() => showLowCalorieCare(), 600);
  }
}

// Compassionate, non-judgmental note when a very low calorie target is set.
// Never frames the low number as a valid target; points toward support.
function showLowCalorieCare(){
  if(document.getElementById('lowcal-care-modal')) return;
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.id = 'lowcal-care-modal';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);font-style:italic;margin-bottom:10px;line-height:1.3">A gentle word, friend.</div>' +
    '<p style="font-size:14px;color:var(--tx2);line-height:1.7;margin-bottom:12px">That goal is quite low — lower than what most bodies need to function and recover well. You know yourself best, and this stays your choice. But this app exists to help you become more, not less, and I\'d be failing you if I didn\'t say that out loud.</p>' +
    '<p style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:14px">If food or your body feels like a hard place right now, you don\'t have to carry that alone. Talking to a doctor or a trained, caring person can change everything — that\'s strength, not weakness.</p>' +
    '<button class="btn primary" onclick="closeModal(this)" style="margin-bottom:8px">I hear you</button>' +
    '<button class="btn" onclick="showEDSupport()" style="background:var(--bg3);border:1px solid var(--bd);font-size:13px">Find support</button>' +
  '</div>';
  document.body.appendChild(m);
}
function showEDSupport(){
  document.querySelector('.modal-bg.open')?.remove();
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3 style="margin-bottom:10px">Support that cares</h3>' +
    '<p style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:14px">You reaching out is a real act of courage. These people are trained to help with food, body image, and eating struggles — with kindness, not judgment.</p>' +
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:14px;margin-bottom:10px">' +
      '<div style="font-size:14px;color:var(--tx);margin-bottom:4px">Butterfly Foundation (Australia)</div>' +
      '<div style="font-size:13px"><a href="tel:1800334673" style="color:var(--go);text-decoration:none;border-bottom:1px solid var(--go-bd)">1800 33 4673</a></div>' +
      '<div style="font-size:11px;color:var(--tx3);margin-top:4px">National ED helpline · phone, chat, email</div>' +
    '</div>' +
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:14px;margin-bottom:10px">' +
      '<div style="font-size:14px;color:var(--tx);margin-bottom:4px">Your GP / doctor</div>' +
      '<div style="font-size:12px;color:var(--tx2);line-height:1.5">A trusted first step — they can refer you to the right care privately.</div>' +
    '</div>' +
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:14px;margin-bottom:14px">' +
      '<div style="font-size:14px;color:var(--tx);margin-bottom:4px">Lifeline (if in crisis)</div>' +
      '<div style="font-size:13px"><a href="tel:131114" style="color:var(--go);text-decoration:none;border-bottom:1px solid var(--go-bd)">13 11 14</a></div>' +
      '<div style="font-size:11px;color:var(--tx3);margin-top:4px">24/7 crisis support</div>' +
    '</div>' +
    '<button class="btn primary" onclick="closeModal(this)">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}

// Prefill the goals form with whatever is currently saved so users can see/edit them
// A new person silently gets a generic 2,100/170 target that could be 500+ cal off what they
// actually burn — the MyFitnessPal weakness. The personalised calculator exists but is collapsed at
// the very bottom, so most never find it. This surfaces one warm, dismissible nudge at the TOP until
// they set a target that fits them (detected by the _ts stamp every real save writes). It disappears
// the moment their goal is personalised — no nagging.
function renderNutSetupNudge(){
  const box = document.getElementById('nut-setup-nudge');
  if(!box) return;
  const g = ls('totry_nut_goals');
  const personalised = g && g._ts;                 // any real save (manual, TDEE calc, adaptive) stamps _ts
  if(personalised || ls('totry_nut_setup_dismissed')){ box.innerHTML=''; return; }
  const def = (typeof defaultNutGoals==='function') ? defaultNutGoals() : {cal:2100};
  // This was right to exist and wrong to shout. Five lines of prose under an italic headline, over a
  // full-width gold button, sitting ABOVE the ring — so the first thing on the food screen was an ad
  // for a settings page, and the number he opened the app to see started below the fold. The warning
  // is worth one line and a link. Both still land; only one of them takes the top of the screen.
  box.innerHTML =
    '<div class="setup-strip">' +
      '<span class="setup-strip-t">Your ' + (def.cal || 2100) + ' cal target is a generic starting point.</span>' +
      '<button class="setup-strip-go" onclick="openNutSetup()">Set a real one</button>' +
      '<button class="setup-strip-x" onclick="dismissNutSetup()" aria-label="Dismiss">\u00d7</button>' +
    '</div>';
}
function openNutSetup(){
  const d = document.getElementById('nut-goals-details');
  if(d){ d.open = true; d.scrollIntoView({behavior:'smooth', block:'center'}); }
  const age = document.getElementById('tdee-age'); if(age) setTimeout(()=>{ try{ age.focus(); }catch(_){} }, 400);
  if(typeof haptic==='function') haptic('tap');
}
function dismissNutSetup(){
  ls('totry_nut_setup_dismissed', true);
  const box = document.getElementById('nut-setup-nudge'); if(box) box.innerHTML='';
  if(typeof haptic==='function') haptic('tap');
}
function prefillNutGoals(){
  // TDEE FIELDS FIRST — deliberately above the `if(!g)return` below, which is about nut goals only and
  // would silently skip everything after it for anyone who has not set goals yet.
  //
  // #tdee-sex had no `selected` and nothing ever prefilled it, so it always read "Male" — and calcTDEE
  // PERSISTED that to totry_sex. A woman who set her sex in Settings and then opened the calculator had
  // it silently flipped: her calorie and protein defaults changed (1900/110 -> 2100/170) and her cycle
  // card disappeared, because cycleOn() requires userSex()==='female'. The control now shows the truth.
  try{
    const sx = document.getElementById('tdee-sex');
    const stored = (typeof userSex==='function') ? userSex() : null;
    if(sx && (stored === 'male' || stored === 'female')) sx.value = stored;
    // And show what we already know rather than making someone retype it — an empty field here falls
    // back to a hardcoded 70kg/175cm, which is a confidently wrong calorie target for most people.
    const wEl = document.getElementById('tdee-weight');
    if(wEl && !wEl.value){
      const body = ls('totry_body') || [];
      // b.weight and b.ts — the fields every writer of totry_body actually stores (logBody, the scale CSV
      // import, the Eufy screenshot) and every other reader uses. I wrote b.w/b.d, which exist on no
      // entry, so the filter returned [] for everyone with weigh-ins and this could never fire once.
      const last = body.filter(b => b && (b.weight != null)).sort((a,b) => new Date(b.ts||b.date||0) - new Date(a.ts||a.date||0))[0];
      if(last && last.weight) wEl.value = last.weight;
    }
    const hEl = document.getElementById('tdee-height');
    if(hEl && !hEl.value){ const h = ls('totry_height'); if(h) hEl.value = h; }
  }catch(_){ }
  const g=ls('totry_nut_goals');if(!g)return;
  const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null)el.value=v;};
  set('nut-goal-cal',g.cal);set('nut-goal-pro',g.pro);set('nut-goal-carb',g.carb);set('nut-goal-fat',g.fat);
}

// ── WATER TRACKER ─────────────────────────────────────────────
// Daily cups (default 8). Resets per day. Persists across sessions.
// Water on a given day, in ML, from the store that is actually written. The two habit auto-tick sites
// below both read `totry_water_<date>` — a key that appears nowhere else in this file and that nothing
// has ever written — and compared the resulting 0 against a goal in GLASSES. So a water habit could
// never tick itself no matter how much someone logged, in an app whose whole pitch is that it notices.
// The real store is totry_water: an object keyed by the en-AU date string, holding millilitres, with
// the same pre-ml back-compat getWaterCount() applies.
function waterMlOn(dateStr){
  try{
    const all = ls('totry_water') || {};
    let v = all[dateStr] || 0;
    if(v > 0 && v < 50) v = v * 250;   // old data stored cups
    return v;
  }catch(_){ return 0; }
}
function getWaterCount(){
  // nutDayKey() is the day the tab is SHOWING, not necessarily today — every other logger on this tab
  // uses it, and water did not, so a glass logged while reviewing Tuesday landed on today instead.
  const today = (typeof nutDayKey === 'function') ? nutDayKey() : new Date().toLocaleDateString('en-AU');
  const water = ls('totry_water') || {};
  let v = water[today] || 0;
  // Backward-compat: old data stored cups (small numbers). If it looks like cups (<50), convert to ml.
  if(v > 0 && v < 50) v = v * 250;
  return v; // ml
}
function setWaterCount(ml){
  // nutDayKey() is the day the tab is SHOWING, not necessarily today — every other logger on this tab
  // uses it, and water did not, so a glass logged while reviewing Tuesday landed on today instead.
  const today = (typeof nutDayKey === 'function') ? nutDayKey() : new Date().toLocaleDateString('en-AU');
  const water = ls('totry_water') || {};
  water[today] = Math.max(0, Math.round(ml));
  ls('totry_water', water);
}
// ONE SOURCE OF TRUTH for the water goal, in MILLILITRES. Settings used to write GLASSES (8) into
// the very same key Nourish read as MILLILITRES (2500) — so a person who set their water target
// silently collapsed their goal to 8ml and the ring read "done" instantly. Any legacy small value is
// interpreted as glasses and converted, so existing users are healed without touching their data.
function waterGoalMl(){
  const v = parseFloat(ls('totry_water_goal'));
  if(!v || isNaN(v) || v <= 0) return 2500;
  return (v <= 30) ? Math.round(v * 250) : Math.round(v);   // <=30 can only be glasses
}
function waterBaseGoal(){ return waterGoalMl(); } // ml (2.5 L default)
// Hydration scaled to training (the Train×Nourish squeeze #7). A training day sweats out more, so
// the goal lifts ~600ml on days you train — only when there's a real training signal (split, calendar,
// or a logged workout), so it never bumps for someone who isn't training. Small, deterministic, sound.
function isWaterTrainingDay(){ try{ return typeof _isTrainingToday==='function' && _isTrainingToday(); }catch(_){ return false; } }
function getWaterGoal(){ return waterBaseGoal() + (isWaterTrainingDay() ? 600 : 0); }
function addWater(ml){
  const before = getWaterCount();
  setWaterCount(before + ml);
  renderWaterTracker();
  haptic('tick');
  const goal = getWaterGoal();
  if(before < goal && getWaterCount() >= goal){
    showToast('💧 Hydrated', 'Water goal hit — ' + (goal/1000).toFixed(1) + ' L today.');
    haptic('celebrate');
  }
}
// Legacy aliases (in case anything still calls these)
function renderWaterTracker(){
  const ml = getWaterCount();
  const goal = getWaterGoal();
  const countEl = document.getElementById('water-count');
  const cupsEl = document.getElementById('water-cups');
  if(countEl) countEl.textContent = (ml/1000).toFixed(2).replace(/0$/,'') + ' / ' + (goal/1000).toFixed(1) + ' L' + (isWaterTrainingDay() ? ' · +0.6 training' : '');
  if(!cupsEl) return;
  cupsEl.innerHTML = '';
  // Show glasses in 250ml increments toward goal
  const glassMl = 250;
  const totalGlasses = Math.max(Math.ceil(goal/glassMl), Math.ceil(ml/glassMl));
  const filledGlasses = Math.floor(ml/glassMl);
  for(let i = 0; i < totalGlasses; i++){
    const cup = document.createElement('div');
    const filled = i < filledGlasses;
    // Ten glasses at a hard-coded 30px plus nine 6px gaps need 354px; the row is 348. So the tenth
    // glass of the goal the card states right above it dropped alone onto a second line — the goal
    // looked broken by six pixels. Let the row divide itself by however many glasses the goal takes.
    cup.style.cssText = 'flex:1 1 0;min-width:16px;max-width:34px;height:36px;border:2px solid ' + (filled ? 'var(--bl)' : 'var(--bd)') + ';border-radius:4px 4px 8px 8px;background:' + (filled ? 'var(--bl)' : 'transparent') + ';cursor:pointer;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px;font-size:9px;color:' + (filled ? '#fff' : 'var(--tx3)') + ';transition:all 0.2s';
    cup.title = filled ? '250 ml' : 'Tap to fill';
    cup.textContent = filled ? '✓' : '';
    cup.onclick = () => {
      setWaterCount(filled ? i * glassMl : (i + 1) * glassMl);
      renderWaterTracker();
      haptic('tick');
    };
    cupsEl.appendChild(cup);
  }
}

// ── FASTING TIMER (intermittent fasting) ──────────────────────
// Default 16:8. Stored as {startTs, protocol}. Live-updates while active.
let _fastingInterval = null;
function getFastingState(){
  const s = ls('totry_fasting') || {startTs: null, protocol: 16};
  // ABANDONED, NOT HEROIC. Nothing stopped this clock: start a 16-hour fast, forget, and three days
  // later it was still counting — and the coach read those hours as a fast in progress and urged the
  // person on. A fast that has run past twice its own target, or past 36 hours, is someone who closed
  // the app, not someone still going. Forget it rather than celebrate it.
  try{
    if(s && s.startTs){
      const hrs = (Date.now() - s.startTs) / 3600000;
      const ceiling = Math.min(36, Math.max(24, (parseInt(s.protocol,10) || 16) * 2));
      if(!(hrs >= 0) || hrs > ceiling){ s.startTs = null; ls('totry_fasting', s); }
    }
  }catch(_){ }
  return s;
}
function saveFastingState(s){ ls('totry_fasting', s); }
function saveFastingProtocol(hours){
  const s = getFastingState();
  s.protocol = parseInt(hours);
  saveFastingState(s);
  renderFastingTimer();
}
function toggleFasting(){
  const s = getFastingState();
  if(s.startTs){
    // End fast
    const elapsedHr = (Date.now() - s.startTs) / 3600000;
    const log = ls('totry_fast_log') || [];
    log.unshift({
      startTs: s.startTs,
      endTs: Date.now(),
      hoursTarget: s.protocol,
      hoursActual: Math.round(elapsedHr * 10) / 10
    });
    ls('totry_fast_log', log.slice(0, 100));
    
    s.startTs = null;
    saveFastingState(s);
    
    if(elapsedHr >= s.protocol){
      showToast('Fast complete', 'You hit ' + s.protocol + 'h. Strong.');
      haptic('celebrate');
      setTimeout(() => showVerseToast('fasting_milestone', 'Word for the fast'), 800);
    } else {
      showToast('Fast ended', 'You went ' + Math.round(elapsedHr * 10) / 10 + 'h of ' + s.protocol + 'h.');
    }
  } else {
    // Start fast
    s.startTs = Date.now();
    saveFastingState(s);
    showToast('Fasting started', 'Target: ' + s.protocol + 'h. You got this.');
    haptic('success');
  }
  renderFastingTimer();
}
// Computus — Gregorian Easter for a given year (Meeus/Jones/Butcher). Used to locate Lent.
function easterDate(year){
  const a=year%19, b=Math.floor(year/100), c=year%100, d=Math.floor(b/4), e=b%4,
    f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30,
    i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7, m=Math.floor((a+11*h+22*l)/451),
    month=Math.floor((h+l-7*m+114)/31), day=((h+l-7*m+114)%31)+1;
  return new Date(year, month-1, day);
}
// Returns {kind, note} if today is a traditional day of fasting/abstinence, else null.
function catholicFastingDay(d){
  d = d || new Date();
  const y = d.getFullYear();
  const dayMid = new Date(y, d.getMonth(), d.getDate());
  const easter = easterDate(y);
  const ashWed = new Date(easter); ashWed.setDate(easter.getDate()-46);
  const goodFri = new Date(easter); goodFri.setDate(easter.getDate()-2);
  const lentEnd = new Date(easter); // Lent runs Ash Wed → Holy Saturday
  const inLent = dayMid >= new Date(y,ashWed.getMonth(),ashWed.getDate()) && dayMid < easter;
  const sameDay = (a,b)=>a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const dow = d.getDay(); // 5 = Friday
  if(sameDay(dayMid, ashWed)) return {kind:'Ash Wednesday', note:'Ash Wednesday — a day of fasting and abstinence. The Church begins Lent hungry on purpose: a small emptiness that makes room for God.'};
  if(sameDay(dayMid, goodFri)) return {kind:'Good Friday', note:'Good Friday — a day of fasting and abstinence. Today the fast is a way of keeping watch at the Cross.'};
  if(inLent && dow===5) return {kind:'Lenten Friday', note:'A Friday in Lent — traditionally a day of abstinence from meat. Offering up a small hunger this Friday joins it to something larger.'};
  if(dow===5) return {kind:'Friday', note:'Friday — the Church\u2019s ancient day of penance, kept in memory of the Cross. A simple fast or abstinence today is a quiet way to mark it.'};
  return null;
}
function renderFastingRhythm(){
  const el = document.getElementById('fasting-rhythm');
  if(!el) return;
  // Respect a user who's turned the rhythm off, and a per-day dismissal.
  if(ls('totry_fast_rhythm_off')){ el.style.display='none'; return; }
  const today = new Date().toLocaleDateString('en-AU');
  if(ls('totry_fast_rhythm_dismissed') === today){ el.style.display='none'; return; }
  const f = catholicFastingDay();
  if(!f){ el.style.display='none'; return; }
  el.innerHTML =
    '<div style="display:flex;align-items:flex-start;gap:8px">'+
      '<div style="flex:1"><span style="color:var(--go)">✝ '+f.kind+'.</span> '+f.note+'</div>'+
      '<button onclick="ls(&apos;totry_fast_rhythm_dismissed&apos;,new Date().toLocaleDateString(&apos;en-AU&apos;));document.getElementById(&apos;fasting-rhythm&apos;).style.display=&apos;none&apos;" style="background:none;border:none;color:var(--tx3);font-size:15px;cursor:pointer;padding:0;flex-shrink:0;line-height:1;min-width:28px;min-height:28px;display:inline-flex;align-items:center;justify-content:center">×</button>'+
    '</div>';
  el.style.display = 'block';
}
function renderFastingTimer(){
  // Catholic rhythm, offered gently inside the existing timer — never enforced. The Church
  // keeps a calendar of fasting and abstinence; for a man whose faith is part of his growth,
  // a fast lands differently when it's joined to that. We surface a quiet note on traditional
  // days (Fridays, Ash Wednesday, Lenten Fridays, Ember Days) — information, not obligation.
  try{ renderFastingRhythm(); }catch(_){}
  try{ renderFastSeason(); }catch(_){}
  const s = getFastingState();
  const protoSel = document.getElementById('fasting-protocol');
  if(protoSel) protoSel.value = String(s.protocol);
  
  const status = document.getElementById('fasting-status');
  const clock = document.getElementById('fasting-clock');
  const target = document.getElementById('fasting-target');
  const bar = document.getElementById('fasting-bar');
  const btn = document.getElementById('fasting-toggle');
  if(!status || !clock || !btn) return;
  
  if(_fastingInterval){ clearInterval(_fastingInterval); _fastingInterval = null; }
  
  if(!s.startTs){
    status.textContent = 'Not fasting';
    status.style.color = 'var(--tx3)';
    clock.textContent = '--:--:--';
    if(target) target.textContent = 'Tap start when you finish your last meal';
    if(bar) bar.style.width = '0%';
    btn.textContent = 'Start fast';
    btn.style.background = 'var(--gr)';
    btn.style.color = '#000';
    return;
  }
  
  const update = () => {
    const now = Date.now();
    const elapsedMs = now - s.startTs;
    const elapsedHr = elapsedMs / 3600000;
    const targetMs = s.protocol * 3600000;
    const pct = Math.min(100, (elapsedMs / targetMs) * 100);
    
    const h = Math.floor(elapsedMs / 3600000);
    const m = Math.floor((elapsedMs % 3600000) / 60000);
    const sec = Math.floor((elapsedMs % 60000) / 1000);
    clock.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
    
    if(elapsedHr >= s.protocol){
      status.textContent = 'Fast complete · keep going if you want';
      status.style.color = 'var(--gr)';
      clock.style.color = 'var(--gr)';
    } else {
      status.textContent = 'Fasting · ' + Math.round(pct) + '% of ' + s.protocol + 'h';
      status.style.color = 'var(--go)';
      clock.style.color = 'var(--tx)';
    }
    
    if(target){
      const remainMs = Math.max(0, targetMs - elapsedMs);
      const rh = Math.floor(remainMs / 3600000);
      const rm = Math.floor((remainMs % 3600000) / 60000);
      target.textContent = elapsedHr >= s.protocol ? 'Target hit. End anytime.' : rh + 'h ' + rm + 'm to go';
    }
    if(bar) bar.style.width = pct + '%';
    btn.textContent = 'End fast';
    btn.style.background = 'var(--re)';
    btn.style.color = '#fff';
  };
  update();
  _fastingInterval = setInterval(update, 1000);
}

