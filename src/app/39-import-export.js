// ── HEVY CSV IMPORT ───────────────────────────────────────────
// Works without Hevy Pro. Parses the official Hevy CSV export (Settings → Export Data).
// Groups rows into workouts by (title + start_time), dedupes against already-imported CSV rows.
// ── EUFY SMART SCALE CSV IMPORT ───────────────────────────────────────────────
// EufyLife exports (Settings → Privacy & Data → Export All Data) come as CSV, but the
// column names and date formatting vary by app version, locale, and scale model, and Eufy
// is known for inconsistent 1-vs-2-digit dates. So we detect columns by fuzzy header match
// (never fixed position) and parse dates leniently. Weigh-ins dedupe by day+weight so a
// re-import is always safe. This brings a man's whole real weight history in at once.
function _eufyParseDate(s){
  if(!s) return null;
  s = String(s).trim().replace(/^"|"$/g,'');
  // Try native first (ISO and many locale forms)
  let d = new Date(s);
  if(!isNaN(d)) return d;
  // Eufy quirk: "yyyy-m-d h:m" or "yyyy/m/d", 1-or-2 digit parts. Normalise separators.
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(s);
  if(m){
    d = new Date(+m[1], +m[2]-1, +m[3], +(m[4]||12), +(m[5]||0), +(m[6]||0));
    if(!isNaN(d)) return d;
  }
  // d/m/yyyy or m/d/yyyy — assume day-first (en-AU). Fall back gracefully.
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{1,2}))?/.exec(s);
  if(m){
    d = new Date(+m[3], +m[2]-1, +m[1], +(m[4]||12), +(m[5]||0));
    if(!isNaN(d)) return d;
  }
  return null;
}
// Works for ANY smart scale's CSV (Eufy, Withings, Renpho, Fitbit Aria, Garmin, etc.) —
// the unified engine maps columns by synonym, with an AI fallback for unfamiliar exports.
function importEufyCSV(event){
  const file = event.target.files?.[0];
  event.target.value = '';
  if(!file) return;
  const schema = {
    date:'required', weight:'required', bodyfat:true, musclepct:true, musclekg:true,
    bmi:true, bmr:true, water:true, fatmass:true, lean:true, bonekg:true, bonepct:true,
    visceral:true, protein:true, skeletal:true, subcut:true, heartrate:true, bodyage:true
  };
  smartImportCSV(file, schema, (cols, rows) => {
    const header = rows[0].map(h => String(h||'').toLowerCase());
    const unitIsLb = cols.weight!=null && /lb/.test(header[cols.weight]||'');
    const num = (row, f) => { const i = cols[f]; if(i==null) return null; const v = parseFloat(String(row[i]||'').replace(/[^0-9.\-]/g,'')); return (isNaN(v)||v===0) ? null : v; };
    const existing = ls('totry_body') || [];
    const dayKey = (d, w) => new Date(d).toLocaleDateString('en-AU') + '|' + (Math.round(w*10)/10);
    const existingKeys = new Set(existing.filter(en => en.weight>0 && en.ts).map(en => dayKey(en.ts, en.weight)));
    let imported = 0, skipped = 0;
    for(let r=1; r<rows.length; r++){
      const row = rows[r];
      if(!row || row.length < 2) continue;
      const d = _eufyParseDate(row[cols.date]);
      let w = parseFloat(String(row[cols.weight]||'').replace(/[^0-9.]/g,''));
      if(!d || !w || isNaN(w)){ skipped++; continue; }
      if(unitIsLb) w = w * 0.453592;
      w = Math.round(w*10)/10;
      if(w < 20 || w > 400){ skipped++; continue; }
      const key = dayKey(d, w);
      if(existingKeys.has(key)){ skipped++; continue; }
      const bf = num(row,'bodyfat');
      const comp = {
        bmi:num(row,'bmi'), bmr:num(row,'bmr'), water:num(row,'water'),
        musclePct:num(row,'musclepct'), muscleKg:num(row,'musclekg'),
        fatMassKg:num(row,'fatmass'), leanKg:num(row,'lean'),
        boneKg:num(row,'bonekg'), bonePct:num(row,'bonepct'),
        visceral:num(row,'visceral'), protein:num(row,'protein'),
        skeletalKg:num(row,'skeletal'), subcutaneous:num(row,'subcut'),
        heartRate:num(row,'heartrate'), bodyAge:num(row,'bodyage')
      };
      Object.keys(comp).forEach(k => { if(comp[k]==null) delete comp[k]; });
      // Same as the screenshot path: a scale exporting pounds exports every mass in pounds, and only
      // bodyweight was being converted above. These are stored under *Kg names and read back as kg
      // everywhere, so leaving them unconverted silently inflates a person's muscle mass by 2.2x.
      if(unitIsLb){
        for(const k of ['muscleKg','fatMassKg','leanKg','boneKg','skeletalKg']){
          if(comp[k] != null && !isNaN(comp[k])) comp[k] = Math.round(comp[k] * 0.453592 * 10) / 10;
        }
      }
      const entry = {
        date: d.toLocaleDateString('en-AU',{day:'numeric',month:'short'}),
        ts: d.toISOString(), weight: w,
        bf: (bf && !isNaN(bf)) ? bf : 0,
        note:'', photo:null, source:'scale-csv'
      };
      if(Object.keys(comp).length) entry.comp = comp;
      existing.push(entry); existingKeys.add(key); imported++;
    }
    if(imported > 0){
      existing.sort((a,b) => new Date(b.ts) - new Date(a.ts));
      ls('totry_body', existing.slice(0, 1000));
      if(typeof syncToCloud==='function') syncToCloud();
      document.querySelector('.modal-bg.open')?.remove();
      if(typeof renderBody==='function') renderBody();
      if(typeof renderWeightHistory==='function') renderWeightHistory();
      if(typeof adjustCaloriesFromWeightTrend==='function') adjustCaloriesFromWeightTrend();
      haptic('celebrate');
      showToast('Imported ✓', imported + ' weigh-in' + (imported>1?'s':'') + (skipped?' · '+skipped+' skipped (duplicates/invalid)':'') + '.');
    } else {
      showToast('Nothing new', skipped ? 'Those weigh-ins were already imported.' : 'No valid rows found.');
    }
  });
}

// ── SCALE SCREENSHOT → ENTRY (AI vision) ──────────────────────────────────────
// For daily weigh-ins after the bulk import: the EufyLife app only lets you copy the
// stats as an image, not text. So we read the screenshot with vision and fill a full
// entry. A confirmation step lets the man correct any misread digit before saving —
// honest data matters more than speed.
async function importScaleScreenshot(event){
  const file = event.target.files?.[0];
  event.target.value = '';
  if(!file) return;
  if(!file.type.startsWith('image/')){ showToast('Wrong file','Please choose a screenshot of your scale stats.'); return; }
  showToast('Reading your scale...', 'One moment while I read the numbers.');
  let dataUrl;
  try{ dataUrl = await downscaleImage(file, 1280, 0.85); }
  catch(e){ showToast('Couldn\'t read that', 'Try a clearer screenshot.'); return; }
  const base64 = dataUrl.split(',')[1];
  try{
    const prompt = 'This is a screenshot from a smart-scale app (e.g. EufyLife) showing body-composition cards. Read every value you can see. Return ONLY this JSON, no markdown, numbers only (no units), use null for anything not shown: {"weight":number,"unit":"kg or lb","bf":number,"musclePct":number,"muscleKg":number,"fatMassKg":number,"bmi":number,"water":number,"bonePct":number,"boneKg":number,"bmr":number,"visceral":number,"leanKg":number,"heartRate":number,"protein":number,"bodyAge":number}. If this is not a scale/body-composition screenshot, return {"error":"not a scale"}.';
    const {data, error} = await Promise.race([
      sb.functions.invoke('ai-proxy', { body:{ action:'vision', prompt, image_base64:base64, image_mime:'image/jpeg', max_tokens:400 } }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out')), 35000))
    ]).catch(e => ({ error:e }));
    if(error || !data?.text){ showToast('Couldn\'t read it', 'Try a clearer screenshot, or use + Log to enter manually.'); return; }
    const mm = data.text.match(/\{[\s\S]*\}/);
    const parsed = mm ? JSON.parse(mm[0]) : null;
    if(!parsed || parsed.error || !parsed.weight){
      showToast('Not a scale screenshot', 'I couldn\'t find a weight in that image. Try + Log instead.');
      return;
    }
    let w = parseFloat(parsed.weight);
    // A SCALE IN POUNDS REPORTS EVERY MASS IN POUNDS. Only bodyweight was converted, and the confirm
    // sheet then labelled muscle, fat, lean and bone mass "kg" while they still held pounds — a 2.2x
    // overstatement, presented as a measurement of the person's own body. Convert the whole family,
    // or none of it. Percentages, BMI, water, visceral and BMR are unitless or already absolute.
    if(parsed.unit && /lb/i.test(parsed.unit)){
      w = w * 0.453592;
      for(const k of ['muscleKg','fatMassKg','leanKg','boneKg','skeletalKg']){
        const v = parseFloat(parsed[k]);
        if(!isNaN(v)) parsed[k] = Math.round(v * 0.453592 * 10) / 10;
      }
    }
    w = Math.round(w*10)/10;
    confirmScaleScreenshotEntry(w, parsed);
  }catch(err){
    console.error('scale screenshot failed', err);
    showToast('Something went wrong', 'Couldn\'t read that screenshot. Try + Log to enter manually.');
  }
}
function confirmScaleScreenshotEntry(weight, p){
  const today = _todayLocalISO();
  const row = (label, val, unit) => (val!=null && !isNaN(val))
    ? '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--tx2);padding:4px 0"><span style="color:var(--tx3)">'+label+'</span><span>'+val+(unit?' '+unit:'')+'</span></div>' : '';
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal" style="max-height:90vh;overflow-y:auto">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:21px;color:var(--tx);font-style:italic;margin-bottom:4px">I read your scale</div>'+
    '<div style="text-align:center;font-size:12px;color:var(--tx3);margin-bottom:14px">Check the weight and correct it if I misread, then save.</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">'+
      '<div style="flex:1"><label style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:4px">Weight (kg)</label>'+
      '<input type="number" id="shot-weight" step="0.1" value="'+weight+'" style="width:100%;font-size:22px;text-align:center;padding:10px;font-family:DM Mono,monospace"></div>'+
      '<div style="width:140px"><label style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:4px">Date</label>'+
      '<input type="date" id="shot-date" max="'+today+'" value="'+today+'" style="width:100%;font-size:16px;padding:11px;color-scheme:dark"></div>'+
    '</div>'+
    '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:10px 12px;margin-bottom:14px">'+
      row('Body fat', p.bf, '%')+row('Muscle mass', p.musclePct, '%')+row('Muscle mass', p.muscleKg, 'kg')+
      row('Body fat mass', p.fatMassKg, 'kg')+row('Lean body mass', p.leanKg, 'kg')+row('BMI', p.bmi, '')+
      row('Water', p.water, '%')+row('Visceral fat', p.visceral, '')+row('BMR', p.bmr, 'kcal')+
      row('Bone mass', p.boneKg, 'kg')+row('Protein', p.protein, '%')+row('Heart rate', p.heartRate, 'bpm')+
    '</div>'+
    '<button class="btn primary" onclick="saveScaleScreenshotEntry()" style="margin-bottom:8px">Save this weigh-in</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>'+
    '</div>';
  m.__parsed = p;
  document.body.appendChild(m);
  window.__shotParsed = p;
}
function saveScaleScreenshotEntry(){
  const p = window.__shotParsed || {};
  const w = parseFloat(document.getElementById('shot-weight')?.value || 0);
  const dStr = document.getElementById('shot-date')?.value;
  if(!w || w < 20 || w > 400){ showToast('Enter a real weight','Between 20 and 400 kg.'); return; }
  const d = dStr ? new Date(dStr+'T12:00:00') : new Date();
  const comp = {
    bmi:p.bmi, bmr:p.bmr, water:p.water, musclePct:p.musclePct, muscleKg:p.muscleKg,
    fatMassKg:p.fatMassKg, leanKg:p.leanKg, boneKg:p.boneKg, bonePct:p.bonePct,
    visceral:p.visceral, protein:p.protein, heartRate:p.heartRate, bodyAge:p.bodyAge
  };
  Object.keys(comp).forEach(k => { if(comp[k]==null || isNaN(comp[k])) delete comp[k]; });
  const entries = ls('totry_body') || [];
  // Replace an existing same-day entry, else add.
  const dayStr = d.toLocaleDateString('en-AU');
  const idx = entries.findIndex(e => e.ts && new Date(e.ts).toLocaleDateString('en-AU') === dayStr);
  const entry = {
    date: d.toLocaleDateString('en-AU',{day:'numeric',month:'short'}),
    ts: d.toISOString(), weight: Math.round(w*10)/10,
    bf: (p.bf && !isNaN(p.bf)) ? p.bf : 0,
    note:'', photo:null, source:'eufy-screenshot'
  };
  if(Object.keys(comp).length) entry.comp = comp;
  if(idx >= 0) entries[idx] = { ...entries[idx], ...entry };
  else entries.unshift(entry);
  entries.sort((a,b) => new Date(b.ts) - new Date(a.ts));
  ls('totry_body', entries.slice(0,1000));
  if(typeof syncToCloud==='function') syncToCloud();
  document.querySelector('.modal-bg.open')?.remove();
  if(typeof renderBody==='function') renderBody();
  if(typeof renderWeightHistory==='function') renderWeightHistory();
  if(typeof adjustCaloriesFromWeightTrend==='function') adjustCaloriesFromWeightTrend();
  haptic('celebrate');
  showToast('Logged ✓', w + 'kg saved with your full body composition.');
}

// Works for ANY workout app's CSV (Hevy, Strong, FitNotes, etc.) via the unified engine:
// synonym mapping first, AI fallback for unfamiliar exports. Rows are grouped into sessions.
function importHevyCSV(event){
  const file = event.target.files?.[0];
  event.target.value = '';
  if(!file) return;
  const schema = { exercise:'required', start_time:'required', workout_title:true, weight_lifted:true, reps:true, rpe:true, distance:true, duration:true, end_time:true };
  smartImportCSV(file, schema, (cols, rows) => {
    const v = (row,f) => cols[f]!=null ? row[cols[f]] : undefined;
    // Group data rows into workouts keyed by title+start
    const groups = {};
    for(let r=1; r<rows.length; r++){
      const row = rows[r];
      if(!row || row.length < 3) continue;
      const start = (v(row,'start_time')||'').trim();
      const title = (v(row,'workout_title')||'Workout').trim();
      if(!start) continue;
      const key = title + '|' + start;
      if(!groups[key]) groups[key] = {title, start, end:(v(row,'end_time')||'').trim(), exercises:{}};
      const exName = (v(row,'exercise')||'Exercise').trim();
      if(!groups[key].exercises[exName]) groups[key].exercises[exName] = [];
      const w = parseFloat(v(row,'weight_lifted'));
      const reps = parseInt(v(row,'reps'));
      const rpe = parseFloat(v(row,'rpe'));
      groups[key].exercises[exName].push({
        weight: isNaN(w)?0:w, reps: isNaN(reps)?0:reps,
        rpe: (rpe && !isNaN(rpe))?rpe:null, done:true
      });
    }
    const existing = ls('totry_workouts') || [];
    const existingCsvKeys = new Set(existing.filter(w => w.csvKey).map(w => w.csvKey));
    let imported = 0;
    Object.values(groups).forEach(g => {
      const csvKey = g.title + '|' + g.start;
      if(existingCsvKeys.has(csvKey)) return;
      const exercises = Object.entries(g.exercises).map(([name, sets]) => ({name, sets}));
      const totalSets = exercises.reduce((a, ex) => a + ex.sets.length, 0);
      const volume = Math.round(exercises.reduce((t, ex) => t + ex.sets.reduce((a, s) => { const w=parseFloat(s.weight)||0, r=parseInt(s.reps)||0; return a + (w>0 ? w*r : 0); }, 0), 0));
      const dateObj = new Date(g.start.replace(' ', 'T'));
      const validDate = !isNaN(dateObj) ? dateObj : new Date();
      existing.push({
        id: Date.now() + Math.floor(Math.random()*100000),
        csvKey, source:'workout-csv',
        date: validDate.toLocaleDateString('en-AU', {weekday:'short', day:'numeric', month:'short', year:'numeric'}),
        ts: validDate.toISOString(), day: getDayCount(),
        exercises, completedSets: totalSets, totalSets, volume,
        splitFocus: g.title || 'Imported workout',
        durationMinutes: g.end ? Math.round((new Date(g.end.replace(' ','T')) - validDate)/60000) || null : null
      });
      existingCsvKeys.add(csvKey);
      imported++;
    });
    if(imported > 0){
      // RE-READ BEFORE WRITING. `existing` was taken before a long run of network calls; anything the
      // person logged or deleted meanwhile is in storage and not in this array, and writing it back
      // whole would erase their work. Merge onto what is actually there now.
      const _fresh = ls('totry_workouts') || [];
      const _key = w => w && (w.hevyId ? 'h'+w.hevyId : (w.stravaId ? 's'+w.stravaId : (w.id != null ? 'i'+w.id : JSON.stringify(w))));
      const _byId = new Map();
      _fresh.forEach(w => { const k=_key(w); if(k) _byId.set(k, w); });
      existing.forEach(w => { const k=_key(w); if(k && !_byId.has(k)) _byId.set(k, w); });
      const _merged = Array.from(_byId.values());
      _merged.sort((a,b) => new Date(b.ts) - new Date(a.ts));
      ls('totry_workouts', _capWorkouts(_merged));
      if(typeof syncToCloud==='function') syncToCloud();
      document.querySelector('.modal-bg.open')?.remove();
      showToast('Imported', imported + ' workout' + (imported>1?'s':'') + ' from your CSV.');
      haptic('celebrate');
      if(typeof renderUnifiedTraining === 'function') renderUnifiedTraining();
      if(typeof renderBody === 'function') renderBody();
    } else {
      showToast('Nothing new', 'Those workouts were already imported.');
    }
  });
}

// Minimal RFC-4180-ish CSV parser: handles quoted fields, commas in quotes, escaped quotes, newlines
// ── UNIFIED IMPORT ENGINE ─────────────────────────────────────────────────────
// To Try is the engine between other apps — it should accept fuel from ANY of them.
// Every CSV importer (weight, food, workouts) runs through this one path:
//   Tier 1: deterministic column matching against a rich multi-app/multi-locale synonym
//           dictionary. Free, instant, offline. Handles ~95% of real exports.
//   Tier 2: if Tier 1 can't find the REQUIRED columns, one AI call maps just the header
//           (plus a few sample rows) to our schema. Rare, cheap, makes nothing unimportable.
// The AI only ever maps STRUCTURE; the deterministic code still parses every row.
const COLUMN_SYNONYMS = {
  // weight / body
  date:        ['date','time','timestamp','date/time','日期','datum','fecha','data','measured','measurement time','time of measurement','day'],
  weight:      ['weight','weight (kg)','weight (lb)','weight (lbs)','weight(kg)','mass','body weight','poids','gewicht','peso','体重','wt'],
  bodyfat:     ['body fat %','body fat','fat %','fat percent','bf%','bf','body fat (%)','体脂','fat ratio','fat'],
  musclepct:   ['muscle mass %','muscle %','muscle (%)','skeletal muscle %'],
  musclekg:    ['muscle mass (kg)','muscle mass','muscle (kg)','muscle','lean muscle'],
  bmi:         ['bmi','body mass index'],
  bmr:         ['bmr','basal metabolic rate','rmr'],
  water:       ['water','water %','body water','hydration','total body water'],
  fatmass:     ['body fat mass (kg)','body fat mass','fat mass','fat mass (kg)'],
  lean:        ['lean body mass (kg)','lean body mass','lean mass','lean','ffm','fat free mass','fat-free mass'],
  bonekg:      ['bone mass (kg)','bone mass','bone'],
  bonepct:     ['bone mass %','bone %'],
  visceral:    ['visceral fat','visceral','visceral fat index','vfi'],
  protein:     ['protein %','protein','protein percent'],
  skeletal:    ['skeletal muscle mass (kg)','skeletal muscle','skeletal muscle mass'],
  subcut:      ['subcutaneous fat %','subcutaneous fat','subcutaneous'],
  heartrate:   ['heart rate (bpm)','heart rate','bpm','hr','pulse'],
  bodyage:     ['body age','metabolic age'],
  // food / nutrition
  food:        ['food name','food','name','description','item','product','meal name'],
  meal:        ['meal','meal type','meal group','group','category','time of day'],
  calories:    ['calories','energy (kcal)','energy','kcal','cal','calories (kcal)','energy kcal'],
  protein_g:   ['protein (g)','protein','protein(g)','protein g','prot (g)'],
  carbs_g:     ['carbohydrates (g)','carbs (g)','carbs','carbohydrate','carbohydrates','net carbs (g)','carbs(g)'],
  fat_g:       ['fat (g)','fat','total fat','total lipid','total fat (g)','fat(g)'],
  // workouts
  exercise:    ['exercise','exercise title','exercise name','movement','lift'],
  sets:        ['sets','set','set number','set order'],
  reps:        ['reps','rep','repetitions','reps done'],
  weight_lifted:['weight','weight (kg)','weight_kg','weight (lb)','load','kg','lbs'],
  rpe:         ['rpe','rir','intensity','effort'],
  workout_title:['title','workout','workout name','routine','session','workout title'],
  start_time:  ['start_time','start time','start','date','time','workout date'],
  end_time:    ['end_time','end time','end','finish'],
  distance:    ['distance','distance_km','distance (km)','distance (mi)','km','miles'],
  duration:    ['duration','duration_seconds','duration (s)','time','elapsed','minutes']
};
// Deterministic mapper. schema = {field:true/'required'}. Returns {field:index} for found cols.
function mapColumns(headerRaw, schema){
  const header = headerRaw.map(h => String(h||'').trim().toLowerCase().replace(/^["']|["']$/g,'').replace(/^\ufeff/,''));
  const used = new Set();
  const out = {};
  // Pass 1: exact synonym match (longest synonyms first so "muscle mass (kg)" beats "muscle").
  for(const field of Object.keys(schema)){
    const syns = (COLUMN_SYNONYMS[field]||[field]).slice().sort((a,b)=>b.length-a.length);
    for(const syn of syns){
      const i = header.findIndex((h,idx) => !used.has(idx) && h === syn);
      if(i > -1){ out[field] = i; used.add(i); break; }
    }
  }
  // Pass 2: 'contains' match for fields still unfound.
  for(const field of Object.keys(schema)){
    if(out[field] != null) continue;
    const syns = (COLUMN_SYNONYMS[field]||[field]).slice().sort((a,b)=>b.length-a.length);
    for(const syn of syns){
      const i = header.findIndex((h,idx) => !used.has(idx) && h.includes(syn));
      if(i > -1){ out[field] = i; used.add(i); break; }
    }
  }
  return out;
}
// AI fallback — maps header (+ samples) to our schema fields. Returns {field:index} or null.
async function aiMapColumns(header, sampleRows, schema){
  if(typeof api !== 'function') return null;
  try{
    const fields = Object.keys(schema);
    const sample = sampleRows.slice(0,3).map(r => r.join(' | ')).join('\n');
    const prompt = 'You are mapping CSV columns to a fixed schema. The CSV header columns are (0-indexed):\n'+
      header.map((h,i)=>i+': '+h).join('\n')+'\n\nSample rows:\n'+sample+'\n\n'+
      'Map each of these schema fields to the column INDEX that best matches, or null if absent: '+fields.join(', ')+'.\n'+
      'Return ONLY JSON like {"'+fields[0]+'":0}. Numbers or null only, no other text.';
    const txt = await api('You map CSV columns to schema fields. Reply with JSON only.', [], prompt, 300);
    if(!txt) return null;
    const m = txt.match(/\{[\s\S]*\}/);
    if(!m) return null;
    const raw = JSON.parse(m[0]);
    const out = {};
    for(const f of fields){ if(typeof raw[f] === 'number' && raw[f] >= 0 && raw[f] < header.length) out[f] = raw[f]; }
    return out;
  }catch(e){ console.error('aiMapColumns failed', e); return null; }
}
// Orchestrator: parse file → map columns (Tier 1, then Tier 2) → verify required → hand to caller.
// schema: {field:'required'|true}. onReady(cols, rows) does the domain-specific row parsing.
async function smartImportCSV(file, schema, onReady, opts){
  opts = opts || {};
  const text = await file.text();
  const rows = parseCSV(text);
  if(rows.length < 2){ showToast('Empty file', 'No rows found in that file.'); return; }
  const header = rows[0];
  const required = Object.keys(schema).filter(f => schema[f] === 'required');
  let cols = mapColumns(header, schema);
  let missing = required.filter(f => cols[f] == null);
  if(missing.length){
    // Tier 2 — ask AI to map the structure, then merge in only the missing fields.
    showToast('Reading your file...', 'Working out the columns.');
    const aiCols = await aiMapColumns(header, rows.slice(1), schema);
    if(aiCols){ for(const f of Object.keys(aiCols)){ if(cols[f] == null) cols[f] = aiCols[f]; } }
    missing = required.filter(f => cols[f] == null);
  }
  if(missing.length){
    showToast('Unrecognised file', 'Couldn\'t find: ' + missing.join(', ') + '. Try your app\'s standard CSV export.');
    return;
  }
  onReady(cols, rows);
}

// Normalise a money string from a bank export. The old code stripped everything except [0-9.-], which
// silently multiplied European amounts by 100: '-22,99' became -2299 and '1.234,56' became 1.23456.
// Rule: whichever of . or , appears LAST is the decimal separator; the other is a thousands grouper.
function _csvAmount(raw){
  let t = String(raw == null ? '' : raw).trim();
  if(!t) return 0;
  const neg = /^\(.*\)$/.test(t) || /-/.test(t);        // some exports use (123.45) for negatives
  t = t.replace(/[^0-9.,]/g, '');
  const lastDot = t.lastIndexOf('.'), lastComma = t.lastIndexOf(',');
  if(lastDot >= 0 && lastComma >= 0){
    if(lastComma > lastDot) t = t.replace(/\./g, '').replace(',', '.');   // 1.234,56
    else t = t.replace(/,/g, '');                                        // 1,234.56
  } else if(lastComma >= 0){
    // Only commas: a trailing group of exactly 2 digits reads as a decimal, otherwise thousands.
    t = /,\d{2}$/.test(t) ? t.replace(/,/g, '.') : t.replace(/,/g, '');
  } else if(lastDot >= 0 && /\.\d{3}$/.test(t) && t.indexOf('.') === lastDot){
    // Only a single dot, followed by exactly THREE digits: '2.500'. Money carries two decimal places, not
    // three, so in every locale this is a thousands grouper — European exports write 2.500 for 2,500.
    // Reading it as 2.5 understated the amount by 1000x.
    t = t.replace(/\./g, '');
  }
  const n = parseFloat(t);
  if(isNaN(n)) return 0;
  return neg ? -Math.abs(n) : n;
}
function parseCSV(text){
  const rows = [];
  // Excel and most Windows bank exports start with a UTF-8 BOM, which stayed glued to the first header
  // ("\uFEFFDate"), so header detection missed the very first column every time.
  text = String(text || '').replace(/^\uFEFF/, '');
  // Delimiter is not always a comma: European exports use ';' (with ',' as the decimal point) and some
  // use tabs. Sniff it from the first line, which is the header on every real export.
  const firstLine = text.slice(0, text.indexOf('\n') < 0 ? text.length : text.indexOf('\n'));
  const counts = { ',': (firstLine.match(/,/g)||[]).length, ';': (firstLine.match(/;/g)||[]).length, '\t': (firstLine.match(/\t/g)||[]).length };
  const DELIM = Object.keys(counts).reduce((a,b)=> counts[b] > counts[a] ? b : a, ',');
  let row = [], field = '', inQuotes = false;
  for(let i = 0; i < text.length; i++){
    const c = text[i], next = text[i+1];
    if(inQuotes){
      if(c === '"' && next === '"'){ field += '"'; i++; }
      else if(c === '"'){ inQuotes = false; }
      else { field += c; }
    } else {
      if(c === '"'){ inQuotes = true; }
      else if(c === DELIM){ row.push(field); field = ''; }
      else if(c === '\r'){ /* skip */ }
      else if(c === '\n'){ row.push(field); rows.push(row); row = []; field = ''; }
      else { field += c; }
    }
  }
  // Last field/row
  if(field.length || row.length){ row.push(field); rows.push(row); }
  return rows.filter(r => r.length && !(r.length === 1 && r[0].trim() === ''));
}

// ── FOOD CSV IMPORT / EXPORT ──────────────────────────────────
// Import: handles MyFitnessPal and Cronometer CSV exports (column names vary, so we
// fuzzy-match headers). Each row becomes a logged food entry on its date.
// Works for ANY nutrition app's CSV (MyFitnessPal, Cronometer, LoseIt, MacroFactor, etc.)
// via the unified engine: synonym mapping first, AI fallback for unfamiliar exports.
function importFoodCSV(event){
  const file = event.target.files?.[0];
  event.target.value = '';
  if(!file) return;
  const schema = { calories:'required', food:'required', date:true, meal:true, protein_g:true, carbs_g:true, fat_g:true };
  smartImportCSV(file, schema, (cols, rows) => {
    const log = ls('totry_nutlog') || {};
    let imported = 0;
    const mealMap = m => { m=(m||'').toLowerCase(); if(/break/.test(m))return'breakfast'; if(/lunch/.test(m))return'lunch'; if(/din/.test(m))return'dinner'; return'snack'; };
    const val = (row,f) => cols[f]!=null ? row[cols[f]] : undefined;
    // Sample the date column ONCE to decide day-first vs month-first, the way the bank importer does.
    // Without this the app cannot re-import its own export — see the note above.
    const _dayFirst = (typeof _csvDayFirst === 'function')
      ? _csvDayFirst(rows.slice(1, 40).map(rw => (cols['date'] != null && rw) ? rw[cols['date']] : ''))
      : true;
    let _unparsed = 0;
    for(let r=1; r<rows.length; r++){
      const row = rows[r];
      if(!row || row.length < 2) continue;
      const name = (val(row,'food')||'').trim();
      const cal = Math.round(parseFloat(val(row,'calories')) || 0);
      if(!name || cal <= 0) continue;
      // ts must be the HISTORICAL date — the digest, adaptive TDEE and reports window by ts.
      let dateKey = new Date().toLocaleDateString('en-AU');
      let entryTs = new Date().toISOString();
      const dRaw = val(row,'date');
      if(dRaw){
        const d = (typeof _csvDate === 'function') ? _csvDate(dRaw, _dayFirst) : null;
        if(d && !isNaN(d.getTime())){
          dateKey = d.toLocaleDateString('en-AU');
          entryTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).toISOString();
        } else {
          // Refuse rather than silently retarget today — a row landing on the wrong day is worse than
          // a row that did not import, because nothing on screen would ever say so.
          _unparsed++;
          continue;
        }
      }
      if(!log[dateKey]) log[dateKey] = [];
      log[dateKey].push({
        id: Date.now() + Math.floor(Math.random()*100000),
        name, serving:'1 serving (imported)', qty:1, cal,
        pro: Math.round((parseFloat(val(row,'protein_g'))||0)*10)/10,
        carb: Math.round((parseFloat(val(row,'carbs_g'))||0)*10)/10,
        fat: Math.round((parseFloat(val(row,'fat_g'))||0)*10)/10,
        meal: cols.meal!=null ? mealMap(val(row,'meal')) : 'snack',
        source:'CSV import', ts: entryTs
      });
      imported++;
    }
    if(imported > 0){
      ls('totry_nutlog', log);
      ls('totry_food_imported', true);
      if(typeof logEvent==='function') logEvent('csv_import');
      if(typeof syncToCloud==='function') syncToCloud();
      document.querySelector('.modal-bg.open')?.remove();
      showToast('Welcome \u2014 your history is here \u2713',
        imported + ' entries imported.' + (_unparsed ? ' ' + _unparsed + ' row' + (_unparsed>1?'s':'') + ' had a date I could not read and were left out.' : ' No re-logging needed.'));
      haptic('celebrate');
      if(typeof renderNutritionLog === 'function') renderNutritionLog();
    } else {
      showToast('Nothing imported', _unparsed
        ? ('Every row had a date I could not read (' + _unparsed + ' of them). Check the date column format.')
        : 'No valid food rows found in that file.');
    }
  });
}

// Export: ToTry's full food log as a CSV anyone can open in Excel / re-import elsewhere
async function exportFoodCSV(){
  const log = ls('totry_nutlog') || {};
  const dates = Object.keys(log);
  if(!dates.length){ showToast('Nothing to export', 'Log some food first.'); return; }
  
  const esc = v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  let csv = 'Date,Meal,Food,Calories,Protein (g),Carbs (g),Fat (g)\n';
  // Sort dates chronologically
  dates.sort((a,b) => {
    const pa = a.split('/').map(Number), pb = b.split('/').map(Number);
    return new Date(pa[2],pa[1]-1,pa[0]) - new Date(pb[2],pb[1]-1,pb[0]);
  });
  dates.forEach(date => {
    (log[date] || []).forEach(e => {
      csv += [esc(date), esc(e.meal||''), esc(e.name), e.cal||0, e.pro||0, e.carb||0, e.fat||0].join(',') + '\n';
    });
  });
  
  const blob = new Blob([csv], {type: 'text/csv'});
  const _r = await SaveFile.save(blob, 'totry-food-log-' + new Date().toISOString().slice(0,10) + '.csv', 'Food log');
  if(_r === null) return;   // dismissed
  // "Downloaded" is browser language: on iOS this hands the file to the share sheet, so the person
  // chose where it went. Say the true thing for the platform they're on.
  const _native = (typeof isNativeApp==='function' && isNativeApp());
  showToast(_r ? 'Exported' : 'Not saved', _r ? (_native ? 'Your food log is ready as a CSV.' : 'Your food log downloaded as CSV.') : 'Nothing was written. Try again in a moment.');
  if(_r) haptic('success');
}


// saveESVKey() was removed here. It read #esv-key-input — an element that exists nowhere — and its
// only caller, showESVInstructions(), was deleted with 30 other dead functions at v477. So it was a
// save button for a form the app no longer has. The stored key it wrote, totry_esv_key, is still READ
// as a fallback in 00-boot (a legacy path for anyone who set one before the key-proxy existed), which
// is why the read stays: removing that would silently drop scripture for those people.
function saveAllTargets(){
  // Calorie and protein goals deliberately live in Nourish (and the TDEE calculator) — this card's
  // own copy says so. The reads for #settings-cal-goal / #settings-pro-goal were left behind when
  // targets moved out of Settings; neither element exists any more, so they resolved to 0 and the
  // `cal>0&&pro>0` guard quietly dropped them — while the toast still claimed "All daily targets".
  const steps=parseInt(document.getElementById('settings-steps-goal')?.value||8000);
  const sleep=parseFloat(document.getElementById('settings-sleep-goal')?.value||8);
  // Stored in ML. A small number can only mean glasses, so convert rather than corrupt the goal.
  let water=parseInt(document.getElementById('settings-water-goal')?.value||2500);
  if(water>0 && water<=30) water = water*250;
  const h=parseInt(document.getElementById('settings-height')?.value||0);
  if(h>0)ls('totry_height',h);
  ls('totry_step_goal',steps);ls('totry_sleep_goal',sleep);ls('totry_water_goal',water);
  showToast('Targets saved','Steps, sleep and water updated.');
}

function exportWorkouts(){
  const history=ls('totry_workouts')||[];
  if(!history.length){showToast('No workouts','Log some sessions first.');return;}
  const NL='\n';
  // This assumed every session is a structured strength log: s.exercises[].sets[]. It is not. A Hevy
  // import stores exercises with no sets array, and cardio, Strava and the Apple Health sessions added in
  // v389 have no exercises at all — so ex.sets.map threw and the Export workouts button in Settings just
  // did nothing, on the most common shapes in the store. Describe whatever the session actually is.
  const text=history.map(function(s){
    const head = '=== ' + (s.date || (s.ts ? new Date(s.ts).toLocaleDateString('en-AU') : '')) +
                 (s.day ? ' (Day ' + s.day + ')' : '') + ' ===';
    const title = s.splitFocus || s.type || 'Session';
    const meta = [
      s.durationMinutes ? s.durationMinutes + ' min' : '',
      s.distance ? (Math.round(s.distance) + ' m') : '',
      s.calories ? (Math.round(s.calories) + ' cal') : '',
      s.averageHeartRate ? (Math.round(s.averageHeartRate) + ' bpm') : '',
      s.sourceName ? ('via ' + s.sourceName) : ''
    ].filter(Boolean).join(' \u00b7 ');
    const exList = Array.isArray(s.exercises) ? s.exercises : [];
    const body = exList.map(function(ex){
      const sets = Array.isArray(ex && ex.sets) ? ex.sets : [];
      const name = (ex && ex.name) || 'Exercise';
      if(!sets.length) return name;                       // Hevy-style entry with no set detail
      return name + ':' + NL + sets.map(function(set,i){
        return '  S' + (i+1) + ': ' + ((set && set.weight) || '?') + 'kg x ' + ((set && set.reps) || '?') + ' reps' + ((set && set.done) ? ' done' : '');
      }).join(NL);
    }).join(NL);
    return [head, title, meta, body].filter(Boolean).join(NL);
  }).join(NL+NL);
  copyToClipboard(text);showToast('Copied!',history.length+' sessions copied to clipboard.');
}

// (orphan go() extension removed)

// (orphan initApp extension removed)

