# NOURISH DAY-NAVIGATION — implementation spec (v343 → v344)

## 1. WHAT IT IS

A `‹ Today ›` strip on the Nourish hero that moves the **whole** diary — ring, macros, meal groups, add/quick-add/photo/voice/saved-meal/recipe/repeat, edit, delete, water, burns — onto a **selected day**. Future days are blocked; a gold banner makes a past day unmistakable.

**The one moment:** it's Tuesday morning, you never logged Monday's dinner. Today you can go back and put it in — so the diary stays true, and a missed evening stops meaning a lost day.

---

## 2. EXACT ANCHORS

All line numbers are from the current `index.html` (35,634 lines). Anchor text is verbatim.

### HTML (Nourish tab)

| # | Anchor (verbatim) | Line | Where |
|---|---|---|---|
| H1 | `  <div class="nutrition-hero">` | 2198 | **BEFORE** — insert block `H1` |
| H2 | `      <span style="font-size:13px;font-weight:500;color:var(--tx)">Today</span>` | 2200 | **REPLACE** |
| H3 | `        <div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">Net today</div>` | 2327 | **REPLACE** (add id only) |

### JS — new block

| # | Anchor (verbatim) | Line | Where |
|---|---|---|---|
| J0 | `function renderNutritionLog(){` | 18685 | **BEFORE** — insert block `J0` |

### JS — surgical replacements (each is one line unless noted)

| # | Anchor (verbatim) | Line | Function |
|---|---|---|---|
| J1 | `  const today=new Date().toLocaleDateString('en-AU');` (the one directly after `if(typeof renderNutSetupNudge==='function') renderNutSetupNudge();`) | 18690 | `renderNutritionLog` |
| J2 | `    if(st.n >= 2){` | 18695 | `renderNutritionLog` |
| J3 | `  try{ if(typeof cycledTarget==='function'){ const c=cycledTarget(goals); if(c){ _cyc=c; goals=c; } } }catch(_){}` | 18706 | `renderNutritionLog` |
| J4 | `const _nd=(typeof _nutrientNudge==='function')?_nutrientNudge(totals,goals):'';` (substring of line) | 18725 | `renderNutritionLog` |
| J5 | `      ringsEl.innerHTML = '<button onclick="go(&apos;reflect&apos;);` … (whole line 18790) | 18790 | `renderNutritionLog` |
| J6 | `        '<div style="font-size:12px;color:var(--tx2);min-width:0;flex:1"><span style="color:var(--go)">\ud83c\udfcb\ufe0f Trained today:</span> '+names.replace(/</g,'&lt;')+'</div>'+` | 18803 | `renderNutritionLog` |
| J7 | `      trainEl.innerHTML = '<button onclick="logCardioManually()"` … (whole line 18807) | 18807 | `renderNutritionLog` |
| J8 | `    const show = hr >= 15 && proLeft >= 30 && totals.cal > 0 && dismissedDay !== todayKey;` | 18878 | `renderNutritionLog` |
| J9 | `      const y=new Date();y.setDate(y.getDate()-1);` + next line `      const yKey=y.toLocaleDateString('en-AU');` | 18903–18904 | `renderNutritionLog` (2 lines → 1) |
| J10 | `<div style="margin-bottom:4px;color:var(--tx2)">Today\'s plate is empty.</div>` (substring of line 18921) | 18921 | `renderNutritionLog` |
| J11 | `  const today = new Date().toLocaleDateString('en-AU');` (first line of `renderMealSplit`) | 19088 | `renderMealSplit` |
| J12 | `  const today = new Date().toLocaleDateString('en-AU');` (first line of `getWaterCount`) | 19860 | `getWaterCount` |
| J13 | `  const today = new Date().toLocaleDateString('en-AU');` (first line of `setWaterCount`) | 19868 | `setWaterCount` |
| J14 | `function getWaterGoal(){ return waterBaseGoal() + (isWaterTrainingDay() ? 600 : 0); }` | 19888 | `getWaterGoal` |
| J15 | `  if(!(eaten>0)) return 'Nothing logged yet. When you eat, put it here — no numbers, no verdict.';` | 18598 | `_gentleCounsel` — insert **BEFORE** |
| J16 | `    if(lbl) lbl.textContent=w.s;` | 18675 | `applyNutGentle` |
| J17 | `  const h=new Date().getHours(); const today=new Date().toLocaleDateString('en-AU');` | 17042 | `renderHungerNudge` — insert **BEFORE** |
| J18 | `  if(name==='nourish'){renderNutritionLog();if(typeof prefillNutGoals==='function')prefillNutGoals();}` | 8086 | `go` |
| J19 | `  const keys=Object.keys(log).sort();if(keys.length>30)delete log[keys[0]];` | 18182 | `addFoodToLog` |
| J20 | `    keys.sort((a,b)=>new Date(a)-new Date(b));` | 20340 | `_pruneNutLog` |

### JS — the write paths (every place a food lands in `totry_nutlog`)

| # | Anchor (verbatim) | Line | Function |
|---|---|---|---|
| W1 | `  const today=new Date().toLocaleDateString('en-AU');` | 16342 | `quickAddLog` |
| W1b | `... meal:meal, source:'quick add', ts:new Date().toISOString() });` (line 16344) | 16344 | `quickAddLog` |
| W2 | `  const today=new Date().toLocaleDateString('en-AU');` | 17002 | `_pmLog` |
| W2b | line 17005 (`items.forEach(it=>{ … ts:new Date().toISOString() }); });`) | 17005 | `_pmLog` |
| W3 | `  const today=new Date().toLocaleDateString('en-AU');` | 17275 | `logEstimatedMeal` |
| W3b | `    source: 'AI estimate'` | 17292 | `logEstimatedMeal` |
| W4 | `  const today = new Date().toLocaleDateString('en-AU');` | 17770 | `logRecipeAsMeal` |
| W4b | `    source: 'recipe'` | 17782 | `logRecipeAsMeal` |
| W5 | `  const yKey = new Date(Date.now()-1*86400000).toLocaleDateString('en-AU');` | 17797 | `openRepeatDay` |
| W5b | `  const lwKey = new Date(Date.now()-7*86400000).toLocaleDateString('en-AU');` | 17799 | `openRepeatDay` |
| W6 | `    const key = d.toLocaleDateString('en-AU');` | 17829 | `repeatLastWeekday` |
| W7 | `  const src = new Date(Date.now() - daysAgo*86400000).toLocaleDateString('en-AU');` | 17840 | `repeatMealsFrom` |
| W8 | `  const src = new Date(Date.now() - daysAgo*86400000).toLocaleDateString('en-AU');` + `  const today = new Date().toLocaleDateString('en-AU');` | 17870–17871 | `confirmRepeatYesterday` |
| W8b | `    log[today].push({...e, id: Date.now() + idx, ts: new Date().toISOString()});` | 17881 | `confirmRepeatYesterday` |
| W9 | `    ts:new Date().toISOString(),` + `    date:new Date().toLocaleDateString('en-AU')` | 18140–18141 | `addFoodToLog` (entry literal) |
| W9b | `  const today=new Date().toLocaleDateString('en-AU');` | 18158 | `addFoodToLog` |
| W9c | `      const _today = new Date().toLocaleDateString('en-AU');` | 18195 | `addFoodToLog` |
| W10 | `  const today = new Date().toLocaleDateString('en-AU');` | 18291 | `saveMealGroup` |
| W11 | `  const today = new Date().toLocaleDateString('en-AU');` | 18310 | `logSavedMeal` |
| W11b | line 18316 (`log[today].push({ … ts:new Date().toISOString() });`) | 18316 | `logSavedMeal` |
| W12 | `  const today = new Date().toLocaleDateString('en-AU');` | 18350 | `quickLogSearchFood` |
| W12b | `    meal: meal, source: food.source || '', ts: new Date().toISOString()` | 18359 | `quickLogSearchFood` |
| W13 | `  const today = new Date().toLocaleDateString('en-AU');` | 18372 | `quickLogRecent` |
| W13b | `    meal: meal, source: f.source || '', ts: new Date().toISOString()` | 18382 | `quickLogRecent` |
| W14 | `  const today = new Date().toLocaleDateString('en-AU');` | 20782 | `_fuelLogPlan` |

**Deliberately untouched** (verified — they are not day-scoped, or are correctly today-scoped): `computeNutStreak` (18432, streak is always about today), `renderFoodGroups` (18463, 7-day window), `renderNutWeeklyDigest`, `renderNutTrend`, `computeAdaptiveTDEE`, `_nourishConcern`, `importFoodCSV`/`exportFoodCSV` (35002/35046), `editFoodEntry`/`deleteFoodEntry` (19714/19728 — already take a `date` parameter, and `renderNutritionLog` now passes the selected key into their onclicks), `mergeFromCloud` (4988), and every `totry_nutlog` reader outside Nourish (6021, 20737, 24775, 27157, 32457, 32995, 33067).

---

## 3. THE CODE

### H1 — insert BEFORE line 2198

```html
  <!-- ── DAY NAVIGATION ──────────────────────────────────────────────────────────────────────
       A diary you can only write in "now" quietly teaches you it's unreliable: you forget one
       evening and the day is simply gone. Everything below this strip — ring, macros, meals,
       add/edit/delete, water, burns — follows the day selected here. Never a future day. -->
  <div id="nut-day-nav" style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
    <button id="nut-day-prev" type="button" onclick="nutShiftDay(-1)" aria-label="Previous day" style="flex-shrink:0;width:38px;height:38px;border-radius:10px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:17px;line-height:1;cursor:pointer">&lsaquo;</button>
    <button type="button" onclick="nutPickDay()" title="Pick a day" style="flex:1;min-width:0;height:38px;border-radius:10px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer"><span id="nut-day-nav-lbl">Today</span></button>
    <button id="nut-day-next" type="button" onclick="nutShiftDay(1)" aria-label="Next day" style="flex-shrink:0;width:38px;height:38px;border-radius:10px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:17px;line-height:1;cursor:pointer">&rsaquo;</button>
  </div>
  <div id="nut-day-banner" style="display:none"></div>
```

### H2 — replace line 2200

```html
      <span id="nut-day-title" style="font-size:13px;font-weight:500;color:var(--tx)">Today</span>
```

### H3 — replace line 2327

```html
        <div id="nut-net-lbl" style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">Net today</div>
```

### J0 — insert BEFORE line 18685 (`function renderNutritionLog(){`)

Reused helpers, no new ones written: `ls`, `showToast`, `haptic`, `openFormModal`, `_escFew`, `closeModal` (via `openFormModal`'s own Cancel), `renderNutritionLog`.

```js
// ── NOURISH DAY NAVIGATION ──────────────────────────────────────────────────────────────────
// The offset lives in memory ONLY — never a storage key. Two reasons: nobody should reopen the app
// and find themselves silently stranded three days in the past, and 0 always means "today, right
// now", so midnight rollover needs no code at all.
let _nutDayOff = 0;              // 0 = today. Negative = days back. NEVER positive.
const NUT_DAY_MIN = -120;        // the diary itself keeps ~120 days (_pruneNutLog)
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
// en-AU keys are d/m/yyyy — Date() parses them as m/d/yyyy, which silently reorders the diary.
function _auMs(key){ try{ const p=String(key).split('/').map(function(n){return parseInt(n,10);}); if(p.length<3||!p[2]) return 0; return new Date(p[2],p[1]-1,p[0],12,0,0,0).getTime(); }catch(_){ return 0; } }
function nutShiftDay(delta){
  const next = Math.max(NUT_DAY_MIN, Math.min(0, _nutDayOff + delta));
  if(next === _nutDayOff){
    if(delta > 0) showToast('That day hasn\u2019t happened yet','You can log today and any day behind it \u2014 never ahead.');
    return;
  }
  _nutDayOff = next;
  haptic('tap');
  renderNutritionLog();
}
function nutGoToday(){
  if(nutIsToday()) return;
  _nutDayOff = 0;
  haptic('light');
  renderNutritionLog();
  showToast('Back to today','Diary\u2019s caught up. Log the rest as it happens.');
}
function nutPickDay(){
  const d0 = nutViewDate();
  const iso = d0.getFullYear()+'-'+String(d0.getMonth()+1).padStart(2,'0')+'-'+String(d0.getDate()).padStart(2,'0');
  openFormModal('Jump to a day','Any day up to today. Whatever you log lands on the day you pick.',
    [{id:'d', label:'Date', type:'date', value:iso}], 'Go to that day',
    function(v){
      if(!v.d) return 'Pick a date first.';
      const p = String(v.d).split('-').map(Number);
      if(p.length<3 || !p[0]) return 'That date didn\u2019t read right.';
      const picked = new Date(p[0], p[1]-1, p[2], 12,0,0,0);
      const t = new Date(); t.setHours(12,0,0,0);
      const off = Math.round((picked - t)/86400000);
      if(off > 0) return 'That day hasn\u2019t happened yet.';
      if(off < NUT_DAY_MIN) return 'The diary keeps about '+Math.abs(NUT_DAY_MIN)+' days.';
      _nutDayOff = off;
      haptic('tap');
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
    '<div style="font-size:16px;flex-shrink:0">\ud83d\uddd3</div>'+
    '<div style="flex:1;min-width:0;font-size:12.5px;color:var(--tx2);line-height:1.55">You\u2019re on <span style="color:var(--go)">'+_escFew(name)+'</span> \u00b7 '+ago+' day'+(ago===1?'':'s')+' back. Anything you log lands on that day.'+
      (n?'':' Nothing logged then \u2014 a gap isn\u2019t a failure, it\u2019s just a gap. Fill it in if you remember.')+'</div>'+
    '<button onclick="nutGoToday()" style="flex-shrink:0;background:var(--go);border:none;color:#1a1505;border-radius:8px;padding:7px 11px;font-size:12px;font-weight:600;cursor:pointer">Today</button>'+
  '</div>';
}
```

### J1 — replace line 18690

```js
  const today=nutDayKey();
  const _dw=nutDayWord();
  try{ renderNutDayNav(); }catch(_){}
  try{ const _nl=document.getElementById('nut-net-lbl'); if(_nl) _nl.textContent = nutIsToday()?'Net today':('Net \u00b7 '+nutDayLabel()); }catch(_){}
```

### J2 — replace line 18695
```js
    // The streak is about TODAY, always — a past day never shows "log today to keep it".
    if(st.n >= 2 && nutIsToday()){
```

### J3 — replace line 18706
```js
  // Cycling keys off _isTrainingToday(); a retroactive cycled target would be a guess about a day
  // the app can't verify. On a past day we show the flat base target and say nothing extra.
  try{ if(nutIsToday() && typeof cycledTarget==='function'){ const c=cycledTarget(goals); if(c){ _cyc=c; goals=c; } } }catch(_){}
```

### J4 — in line 18725, replace the substring
`const _nd=(typeof _nutrientNudge==='function')?_nutrientNudge(totals,goals):'';`
→
```js
const _nd=(nutIsToday()&&typeof _nutrientNudge==='function')?_nutrientNudge(totals,goals):'';
```
*(`_nutrientNudge` says "with dinner to go" — meaningless on a finished day.)*

### J5 — replace line 18790
```js
      if(!nutIsToday()){ ringsEl.style.display='none'; ringsEl.innerHTML=''; }
      else { ringsEl.innerHTML = '<button onclick="go(&apos;reflect&apos;);setTimeout(function(){try{var n=document.getElementById(&apos;evening-move&apos;);if(n&&n.scrollIntoView)n.scrollIntoView({block:&apos;center&apos;})}catch(e){}},300)" style="width:100%;background:none;border:none;color:var(--tx3);font-size:12px;cursor:pointer;text-align:left">\u231a <span style="color:var(--go)">Add today\u2019s Watch rings</span> \u00b7 Move, Exercise, Stand</button>'; }
```
Then change the following line `      ringsEl.style.display = 'block';` to `      if(nutIsToday()) ringsEl.style.display = 'block';`

### J6 — replace line 18803
```js
        '<div style="font-size:12px;color:var(--tx2);min-width:0;flex:1"><span style="color:var(--go)">\ud83c\udfcb\ufe0f Trained '+_dw+':</span> '+names.replace(/</g,'&lt;')+'</div>'+
```

### J7 — replace line 18807
```js
      trainEl.innerHTML = nutIsToday()
        ? '<button onclick="logCardioManually()" style="width:100%;background:none;border:none;color:var(--tx3);font-size:12px;cursor:pointer;text-align:left">\ud83c\udfcb\ufe0f No training logged today \u00b7 <span style="color:var(--go)">log a workout</span></button>'
        : '<div style="font-size:12px;color:var(--tx3)">\ud83c\udfcb\ufe0f No training logged that day</div>';
```

### J8 — replace line 18878
```js
    const show = nutIsToday() && hr >= 15 && proLeft >= 30 && totals.cal > 0 && dismissedDay !== todayKey;
```

### J9 — replace lines 18903–18904 (two lines → one)
```js
      const yKey=nutRelKey(1);
```

### J10 — in line 18921, replace the substring
`<div style="margin-bottom:4px;color:var(--tx2)">Today\'s plate is empty.</div>`
→
```js
<div style="margin-bottom:4px;color:var(--tx2)">'+(nutIsToday()?'Today\'s plate is empty.':'Nothing logged for '+nutDayLabel().toLowerCase()+'.')+'</div>
```
And in line 18922 replace `↻ Copy yesterday\'s ` with `↻ Copy the day before \u00b7 `.

### J11 — replace line 19088
```js
  const today = nutDayKey();
```

### J12 / J13 — replace lines 19860 and 19868 (identical change in both)
```js
  const today = nutDayKey();
```

### J14 — replace line 19888
```js
// The +600ml training bump reads TODAY's training signal — never apply it retroactively to a day
// the app can't check.
function getWaterGoal(){ return waterBaseGoal() + ((nutIsToday() && isWaterTrainingDay()) ? 600 : 0); }
```

### J15 — insert BEFORE line 18598 (first body line of `_gentleCounsel`)
```js
  // A finished day has no "so far". Never guess at the shape of a day that's already over.
  if(typeof nutIsToday==='function' && !nutIsToday()){
    if(!(eaten>0)) return 'Nothing logged for that day. Add it if you remember \u2014 a gap isn\u2019t a failure.';
    if(!(goal>0))  return 'Logged. That day\u2019s recorded.';
    return (eaten/goal)>=1.10 ? 'That day was a fuller one. Nothing to make up for.' : 'That day\u2019s recorded \u2014 nothing owed.';
  }
```

### J16 — replace line 18675
```js
    if(lbl) lbl.textContent = (typeof nutIsToday==='function' && !nutIsToday()) ? 'that day' : w.s;
```

### J17 — insert BEFORE line 17042
```js
  if(typeof nutIsToday==='function' && !nutIsToday()) return;   // a late-snack nudge only makes sense on today
```

### J18 — replace line 8086
```js
  if(name==='nourish'){ _nutDayOff=0; renderNutritionLog(); if(typeof prefillNutGoals==='function')prefillNutGoals(); }
```

### J19 — replace line 18182
```js
  _pruneNutLog(log);   // was: keep 30 keys sorted as STRINGS — dd/mm/yyyy sorts wrong and would eat real days
```

### J20 — replace line 20340
```js
    keys.sort((a,b)=>_auMs(a)-_auMs(b));   // en-AU d/m/yyyy: new Date() reads it as m/d/yyyy
```

### The write paths

```js
// W1  16342 →
  const today=nutDayKey();
// W1b 16344 — replace `ts:new Date().toISOString() });` with:
  ts:nutStampFor(), date:today });

// W2  17002 →
  const today=nutDayKey();
// W2b 17005 — replace `ts:new Date().toISOString() });` with:
  ts:nutStampFor(), date:today });

// W3  17275 →
  const today=nutDayKey();
// W3b 17292 — replace `    source: 'AI estimate'` with:
    source: 'AI estimate', ts: nutStampFor(), date: today

// W4  17770 →
  const today = nutDayKey();
// W4b 17782 — replace `    source: 'recipe'` with:
    source: 'recipe', ts: nutStampFor(), date: today

// W5  17797 →
  const yKey = nutRelKey(1);
// W5b 17799 →
  const lwKey = nutRelKey(7);
//     17800 — replace `new Date(Date.now()-7*86400000).toLocaleDateString('en-AU',{weekday:'long'})` with:
  const lwDow = (function(){ const d=nutViewDate(); d.setDate(d.getDate()-7); return d.toLocaleDateString('en-AU',{weekday:'long'}); })();

// W6  17829 →
    const key = nutRelKey(back);
//     17827 — replace `const d = new Date(Date.now() - back*86400000);` with:
    const d = nutViewDate(); d.setDate(d.getDate() - back);

// W7  17840 →
  const src = nutRelKey(daysAgo);

// W8  17870-17871 →
  const src = nutRelKey(daysAgo);
  const today = nutDayKey();
// W8b 17881 — the spread carries the SOURCE day's `date`; it must be overridden or the copy lies:
    log[today].push({...e, id: Date.now() + idx, ts: nutStampFor(), date: today});

// W9  18140-18141 (inside the `entry` literal) →
    ts:nutStampFor(),
    date:nutDayKey()
// W9b 18158 →
  const today=nutDayKey();
// W9c 18195 → (and wrap: the "you went over" voice must not fire for a past day)
      if(!nutIsToday()) return;
      const _today = today;

// W10 18291 →
  const today = nutDayKey();

// W11 18310 →
  const today = nutDayKey();
// W11b 18316 — replace `ts:new Date().toISOString() });` with:
  ts:nutStampFor(), date:today });

// W12 18350 →
  const today = nutDayKey();
// W12b 18359 →
    meal: meal, source: food.source || '', ts: nutStampFor(), date: today

// W13 18372 →
  const today = nutDayKey();
// W13b 18382 →
    meal: meal, source: f.source || '', ts: nutStampFor(), date: today

// W14 20782 →
  const today = nutDayKey();
```

**W9c note:** line 18195 sits inside a `try{ … }catch(_){}` block, itself inside `addFoodToLog`. A bare `return` there exits `addFoodToLog` — which is fine (everything after it is only the over-goal voice), but confirm during application that no code follows the try-block; if any does, use `if(nutIsToday()){ … }` wrapping instead.

**Not using `theRelease()` here** — deliberately. The Release is the off-ramp after a *regulated emotional moment*; firing ceremony for "you filled in Monday's lunch" would cheapen it. `nutGoToday()`'s quiet toast is the right weight.

---

## 4. STORAGE KEYS

**None. Zero new `totry_` keys, and no `SYNC_KEYS` change is required.**

The selected day is `let _nutDayOff` — an in-memory integer, reset to `0` on every entry to the Nourish tab (J18) and on every app load. This is a design decision, not an omission:
- a persisted key would strand someone in the past after a reload, with the ring showing a stale day;
- `0` meaning "today, computed live" makes midnight rollover free;
- nothing needs to survive a reinstall — the *data* (`totry_nutlog`, `totry_water`) already syncs and already merges per-date (`mergeFromCloud`, line 4988), so backfilled days union correctly across devices with no change.

Existing keys now written on a chosen day rather than always today: `totry_nutlog` (already in SYNC_KEYS, line 4575), `totry_water` (already in SYNC_KEYS, line 4576).

---

## 5. DISCOVERY

**Nourish tab → the very first thing under the targets card, directly above the calorie ring.** A full-width 38px strip: `‹` · **TODAY** · `›`. It is above the fold on the Nourish tab on every phone size, before the ring, before "Log food".

- **`›`** is dimmed and disabled on today — the future guard is visible, not just enforced.
- **`‹`** steps back a day. The label reads `Today` → `Yesterday` → `Sat 8 Aug`.
- **tapping the middle label** opens *"Jump to a day"* (a native date picker via `openFormModal`).
- the moment you leave today, a gold banner appears under the strip: *"You're on Yesterday · 1 day back. Anything you log lands on that day."* with a **`Today`** button, and the hero title itself changes from "Today" to "Yesterday".

**30-second tutorial shot:** open Nourish → tap `‹` → banner appears, ring empties to yesterday's numbers → tap "⚡ Quick add", enter 600 → toast, ring fills, entry appears under Dinner → tap **Today** → "Back to today. Diary's caught up."

---

## 6. RISKS — verify after applying

1. **Parse-check + div balance first** (CLAUDE.md rule 1). J5/J7/J10 change long concatenated-string lines; a single unbalanced quote there ships a white screen. `node --check` the extracted script, and confirm `<div` vs `</div>` still balances after H1 (H1 adds 2 divs and 2 closes).
2. **`npm test`** — J19/J20 change pruning behaviour on `totry_nutlog`. Confirm the food double-scale guard still passes, and eyeball that `_auMs('10/08/2026')` returns 10 Aug 2026, not 8 Oct.
3. **Gentle mode (`nutGentle`)** — walk it on a *past* day: no calorie figure anywhere, `nut-meal-split` still hidden at source (J11 changes only the key, not the guard), the gentle line reads "That day's recorded", the ring label reads "that day". `applyNutGentle` runs twice per render and must still win.
4. **Streak** — `computeNutStreak` is untouched; confirm the badge disappears on a past day (J2) and reappears unchanged on today, and that `celebrateNutMilestone` cannot fire from a past-day view.
5. **`water-count` collision (pre-existing)** — `updateTrackerDisplay` (16038) writes the same element with `totry_trackers[today].water` in *glasses*, while `renderWaterTracker` writes millilitres. Do not "fix" it here, but check that logging steps/sleep in Track while a past day is selected in Nourish doesn't visibly clobber the water line.
6. **Anything reading today's totals elsewhere** — `_fuelToday` (20737), the coach brief (6021, 24775), Home/calendar (27157, 33067), `brotherSpeaks` calorieOver. All still derive their own `new Date()` key; spot-check Home after backfilling a past day to confirm today's numbers didn't move.
7. **Repeat-a-day** — now relative to the *viewed* day (W5–W8). Verify from a past day: "Yesterday" copies the day before *that* day, and copied entries carry `date` = the viewed day (W8b), not the source day.
8. **`ts` correctness** — after backfilling a past day, open *This week* (`renderNutWeeklyDigest`) and *Adaptive TDEE*; both bucket by `entries[0].ts`, so the backfilled day must appear on its own date. This is what `nutStampFor()` exists for.
9. **DST** — all date maths goes through `setHours(12,0,0,0)` then `setDate()`, and `nutPickDay` rounds a noon-to-noon delta. Verify a shift across an Australian DST boundary lands on the right key.
10. **Bump `APP_VERSION` (line 4258) and `CACHE` in `sw.js` together.**