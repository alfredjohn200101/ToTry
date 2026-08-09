# SPEC — PRACTICE & IDENTITY BUNDLE (v344)

## 1. WHAT IT IS

**(a) The Blessing** — loving-kindness seeded from the people already in `totry_your_few`: self → someone you love → a stranger → someone difficult → everyone, named honestly per tradition, ending by naming ONE person to actually go to, then `theRelease`. *The moment: you've just been reminded of someone you love and don't know what to do with the feeling.*

**(b) What Matters** — a 3-phase values card sort (24 → pick 5 → rank → one line on #1) stored and fed into `lifeStateBrief()` and the Feeling Door, so counsel argues from *their* standard. *The moment: a hard choice, and the app asks their own question back at them.*

---

## 2. EXACT ANCHORS

| # | Anchor (verbatim) | ~Line | Insert |
|---|---|---|---|
| A1 | `      <div class="hc-desc" id="soul-still-desc">A minute of guided breathing — or the Jesus Prayer carried on your breath. The one work you can always do.</div>` then its closing `    </div>` | 1461–1462 | **AFTER** the `</div>` on 1462 (still inside the same `<div class="hub-grid">`) |
| A2 | `  <!-- Identity + season (moved from Settings — they define the journey, like the why) -->` | 1558 | **BEFORE** |
| A3 | `  'totry_rosaries'` (last entry of `SYNC_KEYS`) | 4603 | replace with the two-line version in §4 |
| A4 | `    sex: (typeof userSex==='function') ? userSex() : null,` (inside `getLifeState()`'s `state` object) | 5860 | **BEFORE** |
| A5 | `  if(s.readiness) lines.push('Readiness today: '+s.readiness.score+'/100 ('+s.readiness.level+')');` | 5909 | **BEFORE** |
| A6 | `    set('soul-still-desc', still[t]||still.christianity);` (inside `applyFaithLabels()`) | 7528 | **AFTER** |
| A7 | `    _savedBanner+` followed by `    '<button class="btn primary" style="margin-bottom:8px" onclick="'+onclick+'">'+s.cta+'</button>'+` (inside `_feelMove()`) | 10520–10521 | insert `_valBanner` const **BEFORE** the `m.innerHTML =` line (10517) and `    _valBanner+` **AFTER** `    _savedBanner+` |
| A8 | `// ════ BREATH & STILLNESS — the minimum viable work ════` | 10971 | **BEFORE** — the whole JS payload (§3.1 + §3.2) goes here |
| A9 | `      '<button class="btn" style="width:auto;padding:7px 12px;font-size:12px" onclick="openYourFew()">Your few</button>'+` (inside `renderReachOutCard()`) | 27466 | **AFTER** |
| A10 | `  renderWhyAffirmations();` (inside `initWhyTab()`) | 28682 | **BEFORE** |

**Reused helpers (nothing re-implemented):** `ls`, `_escFew`, `showToast`, `haptic`, `closeModal`, `theRelease`, `getYourFew`, `yourFewMuted`, `logReachOut`, `faithTradition`, `curFaith`, `getLifeState`, `lifeStateBrief`, `applyFaithLabels`, existing `@keyframes fadeUpY`, classes `.modal-bg .modal .modal-handle .btn .btn.primary .card .card-hd .hub-card.wide`. **No new CSS.** `openFormModal` deliberately *not* used — both flows are multi-step steppers, not single-shot forms.

---

## 3. THE CODE

### 3.1 — at A8 (BEFORE the BREATH & STILLNESS banner)

```js
// ════ THE BLESSING — loving-kindness that starts from the people you already carry ════
// The most evidence-backed contemplative practice there is (Fredrickson broaden-and-build; Zeng
// meta-analysis g≈0.39) — and here it is a literal expression of the loved-ones reframe: it SEEDS
// from your few, widens self → loved → stranger → difficult → all, then ends by naming ONE person
// to actually go to. Contemplation into connection, then the Release. Named honestly per path
// (metta is Buddhist; Christians intercede, Muslims make du'a, Hindus hold maitri, and a secular
// person is simply wishing someone well). No timer, no streak, no score, no push to come back.
const BLESS = {
  christianity:{ eyebrow:'INTERCESSION', title:'Praying for people',
    intro:'The oldest work in the Church: holding people before God, one at a time. Not many words \u2014 the same short prayer, for one person, then the next.',
    p:['God, keep {t} safe.','God, give {t} peace.','God, hold {t} in your love.'], me:'me', close:'Amen.' },
  islam:{ eyebrow:'DU\u2019A FOR OTHERS', title:'Du\u2019a for others',
    intro:'It is narrated that when you make du\u2019a for someone in their absence, the angel appointed to you answers: and for you the same. This is that \u2014 one person at a time.',
    p:['O Allah, keep {t} safe.','O Allah, grant {t} ease.','O Allah, be merciful to {t}.'], me:'me', close:'Ameen.' },
  hinduism:{ eyebrow:'MAITRI \u00B7 GOODWILL', title:'Maitri',
    intro:'Maitri is goodwill without conditions \u2014 the steady wish that others be well, whether or not they have earned it today. Say each line slowly.',
    p:['May {t} be free from suffering.','May {t} be at peace.','May {t} be well and happy.'], me:'I',
    close:'Lokah samastah sukhino bhavantu \u2014 may all beings everywhere be happy and free.' },
  buddhism:{ eyebrow:'METTA \u00B7 LOVING-KINDNESS', title:'Metta',
    intro:'Metta is the oldest form of this practice \u2014 training the heart toward goodwill, beginning with yourself and widening until no one is left out. Mean each line as best you can; that is enough.',
    p:['May {t} be safe.','May {t} be at ease.','May {t} be happy and free from suffering.'], me:'I',
    close:'May all beings be happy. May all beings be free.' },
  secular:{ eyebrow:'A COMPASSION PRACTICE', title:'Well-wishing',
    intro:'A simple, well-studied exercise: hold one person in mind and deliberately wish them well. No belief required \u2014 most of the effect lands on you.',
    p:['May {t} be safe.','May {t} be at ease.','May {t} be well.'], me:'I', close:'That\u2019s everyone. Including you.' }
};
const _BLESS_STEPS = [ null,
  { eye:'FIRST, YOURSELF', sub:'You can\u2019t hand out what you won\u2019t take. This is the step people skip \u2014 don\u2019t.' },
  { eye:'SOMEONE YOU LOVE', sub:'One of the people you carry. Picture their face before you start.' },
  { eye:'SOMEONE NEUTRAL', sub:'Someone you barely know \u2014 the person at the till, a neighbour, someone on the train. No story, no history. Just a person.' },
  { eye:'SOMEONE DIFFICULT', sub:'Someone who irritates you \u2014 start small. This is not forgiveness on demand and it is not therapy for what was done to you. If someone hurt you badly, skip them. Skipping is the correct instruction, not a failure.' },
  { eye:'EVERYONE', sub:'Widen it until no one is left out \u2014 including the ones you\u2019ll never meet.' }
];
function _bless(){ return BLESS[(typeof faithTradition==='function')?faithTradition():'christianity'] || BLESS.christianity; }
function blessLog(){ try{ const a=ls('totry_blessings'); return Array.isArray(a)?a:[]; }catch(_){ return []; } }
function blessLastLine(){
  try{ const l=blessLog(); if(!l.length) return '';
    const d=Math.floor((Date.now()-new Date(l[0].ts).getTime())/86400000);
    return d<=0?'last done today':(d===1?'last done yesterday':'last done '+d+' days ago');
  }catch(_){ return ''; }
}
let _blessS = null;
function openBlessing(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const few=(typeof getYourFew==='function')?getYourFew():[];
  _blessS={ step:0, few:few, lovedIdx:(few.length?0:-1), loved:'', neutral:'', hard:'', reach:'', cands:[] };
  const m=document.createElement('div'); m.className='modal-bg open'; m.id='bless-modal'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center;max-height:88vh;overflow-y:auto"><div class="modal-handle"></div><div id="bless-body"></div></div>';
  document.body.appendChild(m);
  _blessRender();
  try{ if(typeof haptic==='function') haptic('light'); }catch(_){}
}
function _blessTarget(){
  const s=_blessS, f=_bless();
  if(s.step===1) return f.me;
  if(s.step===2){ const p=(s.lovedIdx>=0 && s.few[s.lovedIdx])?s.few[s.lovedIdx]:null; return (p&&p.name)?p.name:(((s.loved||'').trim())||'this person'); }
  if(s.step===3) return ((s.neutral||'').trim())||'this person';
  if(s.step===4) return ((s.hard||'').trim())||'this person';
  return 'everyone';
}
// Phrases substituted with a FUNCTION replacer so a name containing $ can never inject a pattern.
function _blessLines(name, anim){
  const t=_escFew(name);
  return '<div id="bless-lines">'+_bless().p.map(function(l,i){
    const a = anim ? ';animation:fadeUpY .6s ease both;animation-delay:'+(i*0.45)+'s' : '';
    return '<div style="font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);line-height:1.45;margin-bottom:9px'+a+'">'+l.replace(/\{t\}/g, function(){ return t; })+'</div>';
  }).join('')+'</div>';
}
function _blessPicker(){
  const s=_blessS;
  if(s.step===2 && s.few.length){
    const cur=s.few[s.lovedIdx]||{};
    return '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:10px">'+
      s.few.map(function(p,i){ const on=(i===s.lovedIdx);
        return '<button class="btn" style="width:auto;margin:0;padding:6px 11px;font-size:12px;background:'+(on?'var(--go-bg)':'var(--bg3)')+';border:1px solid '+(on?'var(--go-bd)':'var(--bd)')+';color:'+(on?'var(--go)':'var(--tx2)')+'" onclick="_blessPick('+i+')">'+_escFew(p.name)+(yourFewMuted(p)?' <span style="color:var(--tx3);font-size:10px">\u00B7 held quietly</span>':'')+'</button>';
      }).join('')+'</div>'+
      // Held quietly = someone lost, or someone it isn't safe to contact. They can still be blessed.
      (yourFewMuted(cur)?'<div style="font-size:11.5px;color:var(--tx3);line-height:1.55;margin-bottom:10px;font-style:italic">You hold them quietly \u2014 no reminders, ever. You can still wish them well. For someone you\u2019ve lost, this may be the only thing left to give them, and it counts.</div>':'');
  }
  if(s.step>=2 && s.step<=4){
    const v=(s.step===2)?s.loved:(s.step===3?s.neutral:s.hard);
    return '<input type="text" id="bless-in" maxlength="40" value="'+_escFew(v)+'" placeholder="'+(s.step===2?'A name \u2014 anyone you love':'A name, or leave it blank')+'" oninput="_blessTyped(this.value)" style="margin-bottom:12px;text-align:center">';
  }
  return '';
}
function _blessPick(i){ _blessS.lovedIdx=i; try{ if(typeof haptic==='function') haptic('tap'); }catch(_){} _blessRender(); }
// Typing updates the lines in place (no re-render) so the caret is never stolen mid-name.
function _blessTyped(v){
  const s=_blessS; if(!s) return; const val=String(v||'').slice(0,40);
  if(s.step===2){ s.loved=val; s.lovedIdx=-1; } else if(s.step===3){ s.neutral=val; } else if(s.step===4){ s.hard=val; }
  const w=document.getElementById('bless-lines'); if(w) w.outerHTML=_blessLines(_blessTarget(), false);
}
function _blessNext(){ const s=_blessS; if(!s) return; s.step=(s.step===5)?6:s.step+1; try{ if(typeof haptic==='function') haptic('tap'); }catch(_){} _blessRender(); }
function _blessSkipHard(){ const s=_blessS; if(!s) return; s.hard=''; s.step=5; _blessRender(); }
function _blessReach(i){ const s=_blessS; const p=s.cands[i]; if(p){ s.reach=p.name; } _blessRender(); }
function _blessReachTyped(v){ if(_blessS) _blessS.reach=String(v||'').slice(0,40); }
function _blessSave(nm){
  try{ const log=blessLog(); log.unshift({ ts:new Date().toISOString(), reach:String(nm||'').slice(0,40), faith:(typeof faithTradition==='function')?faithTradition():'' }); ls('totry_blessings', log.slice(0,100)); }catch(_){}
  try{ if(typeof haptic==='function') haptic('success'); }catch(_){}
}
function _blessGo(){
  const s=_blessS; const nm=((s&&s.reach)||'').trim();
  if(!nm){ try{ showToast('One name','Just one person. Who is it?'); }catch(_){} return; }
  _blessSave(nm);
  try{ if(typeof logReachOut==='function') logReachOut(nm); }catch(_){}
  if(typeof theRelease==='function') theRelease({did:'You wished them all well \u2014 then you went to '+_escFew(nm)+'. That\u2019s the whole point of it.'});
}
function _blessHold(){
  const s=_blessS; const nm=((s&&s.reach)||'').trim();
  _blessSave(nm);
  if(typeof theRelease==='function') theRelease({did: nm ? ('You held '+_escFew(nm)+' and wished them well. Reach out when you\u2019re ready \u2014 there\u2019s no clock on it.') : 'You wished people well, yourself included. That counts, and nobody needs to know you did it.'});
}
function _blessRender(){
  const b=document.getElementById('bless-body'); if(!b) return;
  const s=_blessS, f=_bless();
  if(s.step===0){
    b.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.14em;margin-bottom:8px">'+f.eyebrow+'</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:27px;color:var(--tx);line-height:1.25;margin-bottom:10px">'+f.title+'</div>'+
      '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:14px">'+f.intro+'</div>'+
      // Honest about what this can and can't do. The app must never claim more than it knows.
      '<div style="font-size:11.5px;color:var(--tx3);line-height:1.6;margin-bottom:16px;font-style:italic">Straight with you: the research here is real but modest \u2014 warmth toward yourself and others lifts over weeks of practice, not in one sitting. It is not a treatment for depression, and it is not a substitute for a real person.</div>'+
      '<button class="btn primary" style="margin-bottom:8px" onclick="_blessNext()">Begin</button>'+
      '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>';
    return;
  }
  if(s.step>=1 && s.step<=5){
    const meta=_BLESS_STEPS[s.step];
    b.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.14em;margin-bottom:10px">'+meta.eye+' \u00B7 '+s.step+' of 5</div>'+
      _blessPicker()+
      '<div style="font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:18px">'+meta.sub+'</div>'+
      _blessLines(_blessTarget(), true)+
      (s.step===5?'<div style="font-family:Cormorant Garamond,serif;font-size:16px;font-style:italic;color:var(--go);line-height:1.5;margin-top:14px">'+f.close+'</div>':'')+
      '<button class="btn primary" style="margin-top:20px;margin-bottom:8px" onclick="_blessNext()">'+(s.step===5?'Done':'Next')+'</button>'+
      (s.step===4
        ? '<button class="btn" onclick="_blessSkipHard()" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Skip this one \u2014 I\u2019m not there</button>'
        : '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Stop here</button>');
    return;
  }
  // ── into connection: contemplation is where this starts, not where it ends ──
  // Muted people are never offered here. They can be blessed; they are never a task.
  s.cands=(s.few||[]).filter(function(p){ return p && !yourFewMuted(p); });
  const chips = s.cands.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:12px">'+
    s.cands.map(function(p,i){ const on=(s.reach===p.name);
      return '<button class="btn" style="width:auto;margin:0;padding:7px 12px;font-size:12.5px;background:'+(on?'var(--go-bg)':'var(--bg3)')+';border:1px solid '+(on?'var(--go-bd)':'var(--bd)')+';color:'+(on?'var(--go)':'var(--tx2)')+'" onclick="_blessReach('+i+')">'+_escFew(p.name)+'</button>';
    }).join('')+'</div>' : '';
  b.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.14em;margin-bottom:8px">INTO CONNECTION</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.3;margin-bottom:8px">Now make one of them real.</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:14px">Wishing someone well is where this starts, not where it ends. Name ONE person you\u2019ll actually reach out to \u2014 today, not one day.</div>'+
    chips+
    '<input type="text" id="bless-reach" maxlength="40" value="'+_escFew(s.reach)+'" placeholder="'+(s.cands.length?'\u2026or someone else':'Who will you reach out to?')+'" oninput="_blessReachTyped(this.value)" style="margin-bottom:14px;text-align:center">'+
    '<button class="btn primary" style="margin-bottom:8px" onclick="_blessGo()">I\u2019m going to them now</button>'+
    '<button class="btn" onclick="_blessHold()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px">Just hold them for now</button>';
}
```

### 3.2 — same insertion point, immediately after 3.1

```js
// ════ WHAT MATTERS — the values card sort ════
// ACT/MI's most-validated single exercise. A person names, in their own words, what their life is
// FOR — then counsel argues from THEIR standard instead of the app's rules. A mirror, never a judge:
// values are never scored, never graded against behaviour, never a streak. Re-sortable any time,
// and the app never nags you to redo it. Universal, faith-neutral set — "Faith / meaning" carries
// both a believer and a secular reading without forcing either.
const VALUES = [
  ['family','Family','The people I come from, and the people I\u2019m building with.'],
  ['love','Love','Loving someone well \u2014 and letting myself be loved.'],
  ['friendship','Friendship','Real friends, kept. Not contacts.'],
  ['health','Health','A body that can do what my life asks of it.'],
  ['faith','Faith / meaning','Something bigger than me that the rest hangs on.'],
  ['honesty','Honesty','The same person in private as in public.'],
  ['discipline','Discipline','Doing it when I don\u2019t feel like it.'],
  ['freedom','Freedom','Not owned \u2014 by debt, by a habit, by anyone.'],
  ['courage','Courage','Doing the frightening thing anyway.'],
  ['kindness','Kindness','Leaving people better than I found them.'],
  ['growth','Growth','Further along than I was.'],
  ['security','Security','Solid ground under me and mine.'],
  ['service','Service','Being useful to people who need it.'],
  ['justice','Justice','Doing right, especially when it costs.'],
  ['humility','Humility','Not needing to be the biggest thing in the room.'],
  ['loyalty','Loyalty','Staying, when staying is hard.'],
  ['peace','Peace of mind','A quiet head. Not braced all the time.'],
  ['independence','Independence','Standing on my own feet.'],
  ['achievement','Achievement','Building something that lasts.'],
  ['learning','Learning','Still curious. Still a student.'],
  ['responsibility','Responsibility','Carrying what\u2019s mine to carry.'],
  ['adventure','Adventure','A life with some wild left in it.'],
  ['creativity','Creativity','Making things that weren\u2019t here before.'],
  ['joy','Joy','Actually enjoying the life I\u2019m working this hard on.']
];
function valLabel(id){ const v=VALUES.find(function(x){ return x[0]===id; }); return v?v[1]:String(id); }
function getValues(){ try{ const o=ls('totry_values'); return (o && Array.isArray(o.v) && o.v.length)?o:null; }catch(_){ return null; } }
function topValue(){ const o=getValues(); return o?valLabel(o.v[0]):null; }
let _vsS=null;
function openValuesSort(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const cur=getValues();
  _vsS={ phase:1, picked: cur?cur.v.slice(0,5):[], why: cur?(cur.why||''):'' };
  const m=document.createElement('div'); m.className='modal-bg open'; m.id='values-modal';
  m.innerHTML='<div class="modal" style="max-height:88vh;overflow-y:auto"><div class="modal-handle"></div><div id="vs-body"></div></div>';
  document.body.appendChild(m); _vsRender();
  try{ if(typeof haptic==='function') haptic('light'); }catch(_){}
}
function _vsToggle(id){
  const s=_vsS; if(!s) return; const i=s.picked.indexOf(id);
  if(i>=0){ s.picked.splice(i,1); }
  else{
    if(s.picked.length>=5){ try{ showToast('That\u2019s five','Five is the point \u2014 it forces the choice. Tap one off to swap it.'); }catch(_){} return; }
    s.picked.push(id);
  }
  try{ if(typeof haptic==='function') haptic('tap'); }catch(_){}
  _vsRender();
}
function _vsMove(i,d){ const p=_vsS.picked, j=i+d; if(j<0||j>=p.length) return; const t=p[i]; p[i]=p[j]; p[j]=t; try{ if(typeof haptic==='function') haptic('tap'); }catch(_){} _vsRender(); }
function _vsPhase(n){
  const s=_vsS; if(!s) return;
  if(n===2 && !s.picked.length){ try{ showToast('Pick a few first','Even one is a start \u2014 tap the ones you\u2019d actually defend.'); }catch(_){} return; }
  try{ const w=document.getElementById('vs-why'); if(w) s.why=w.value; }catch(_){}
  s.phase=n; _vsRender();
}
function _vsSave(){
  const s=_vsS; if(!s||!s.picked.length) return;
  const w=document.getElementById('vs-why');
  try{ ls('totry_values', { v:s.picked.slice(0,5), why:String(w?w.value:(s.why||'')).trim().slice(0,160), ts:new Date().toISOString() }); }catch(_){}
  try{ if(typeof haptic==='function') haptic('success'); }catch(_){}
  try{ showToast('Held','I\u2019ll hold you to your own words, not mine.'); }catch(_){}
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  try{ renderValuesCard(); }catch(_){}
}
function _vsRender(){
  const b=document.getElementById('vs-body'); if(!b) return; const s=_vsS;
  if(s.phase===1){
    b.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.14em;margin-bottom:8px">WHAT MATTERS \u00B7 1 OF 3</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.25;margin-bottom:6px">Pick the five you\u2019d defend.</div>'+
      '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:12px">Not the five that sound good \u2014 the five you\u2019d actually give something up for. There is no right answer here and nothing is scored. Redo it whenever you like.</div>'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.1em;margin-bottom:10px;color:'+(s.picked.length===5?'var(--go)':'var(--tx3)')+'">'+s.picked.length+' of 5 chosen</div>'+
      VALUES.map(function(v){ const on=s.picked.indexOf(v[0])>=0;
        return '<button class="btn" onclick="_vsToggle(\''+v[0]+'\')" style="text-align:left;margin-bottom:6px;padding:11px 12px;background:'+(on?'var(--go-bg)':'var(--bg3)')+';border:1px solid '+(on?'var(--go-bd)':'var(--bd)')+'">'+
          '<div style="font-size:14px;color:'+(on?'var(--go)':'var(--tx)')+'">'+v[1]+'</div>'+
          '<div style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin-top:2px">'+v[2]+'</div></button>';
      }).join('')+
      '<button class="btn primary" style="margin-top:10px;margin-bottom:8px" onclick="_vsPhase(2)">Order them \u203A</button>'+
      '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>';
    return;
  }
  if(s.phase===2){
    b.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.14em;margin-bottom:8px">WHAT MATTERS \u00B7 2 OF 3</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.25;margin-bottom:6px">Now put them in order.</div>'+
      '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:12px">When two of them pull against each other \u2014 and they will \u2014 which one wins? That\u2019s all the order means.</div>'+
      s.picked.map(function(id,i){
        return '<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--bd)">'+
          '<div style="font-family:DM Mono,monospace;font-size:11px;color:var(--go);width:16px">'+(i+1)+'</div>'+
          '<div style="flex:1;min-width:0;font-size:14px;color:var(--tx)">'+valLabel(id)+'</div>'+
          '<button class="btn" style="width:auto;margin:0;padding:5px 10px;font-size:12px" onclick="_vsMove('+i+',-1)">\u25B2</button>'+
          '<button class="btn" style="width:auto;margin:0;padding:5px 10px;font-size:12px" onclick="_vsMove('+i+',1)">\u25BC</button></div>';
      }).join('')+
      '<button class="btn primary" style="margin-top:14px;margin-bottom:8px" onclick="_vsPhase(3)">That\u2019s the order \u203A</button>'+
      '<button class="btn" onclick="_vsPhase(1)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">\u2039 Back to the list</button>';
    return;
  }
  b.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.14em;margin-bottom:8px">WHAT MATTERS \u00B7 3 OF 3</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.3;margin-bottom:6px">'+valLabel(s.picked[0])+' is your first.</div>'+
    '<div style="font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:12px">One line: why that one? This is the sentence I\u2019ll hand back to you when a hard choice comes. Optional \u2014 blank is fine.</div>'+
    '<textarea id="vs-why" maxlength="160" placeholder="e.g. because I\u2019d rather be the person my kids describe than the one they explain" style="min-height:76px;font-size:15px;line-height:1.5;margin-bottom:14px">'+_escFew(s.why)+'</textarea>'+
    '<button class="btn primary" style="margin-bottom:8px" onclick="_vsSave()">Hold me to this</button>'+
    '<button class="btn" onclick="_vsPhase(2)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">\u2039 Back</button>';
}
function renderValuesCard(){
  const el=document.getElementById('values-body'); if(!el) return;
  const o=getValues();
  if(!o){
    el.innerHTML='<p style="font-size:12px;color:var(--tx3);margin-bottom:10px;line-height:1.5">Five words for what your life is actually for. Once you\u2019ve named them, the counsel argues from <em>your</em> standard instead of mine \u2014 and the Feeling Door asks the only question that matters: does the next hour move toward them?</p>'+
      '<button class="btn primary" style="font-size:13px" onclick="openValuesSort()">Sort my values</button>';
    return;
  }
  el.innerHTML='<div style="margin-bottom:10px">'+o.v.map(function(id,i){
      return '<div style="display:flex;align-items:baseline;gap:9px;padding:5px 0">'+
        '<span style="font-family:DM Mono,monospace;font-size:11px;color:var(--go)">'+(i+1)+'</span>'+
        '<span style="font-size:'+(i===0?'16px':'14px')+';color:'+(i===0?'var(--go)':'var(--tx)')+'">'+valLabel(id)+'</span></div>';
    }).join('')+'</div>'+
    (o.why?'<div style="font-family:Cormorant Garamond,serif;font-size:15px;font-style:italic;color:var(--tx2);line-height:1.55;border-left:2px solid var(--go-bd);padding-left:11px;margin-bottom:12px">'+_escFew(o.why)+'</div>':'')+
    '<p style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin-bottom:10px">A mirror, not a scoreboard. Nothing here is ever scored against you \u2014 and values move as life moves. Re-sort whenever it stops being true.</p>'+
    '<button class="btn" style="font-size:13px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)" onclick="openValuesSort()">Re-sort</button>';
}
```

### 3.3 — the small edits

**A1** (Soul tab, after the Stillness card's `</div>`):
```html
    <div class="hub-card wide" id="soul-bless-card" onclick="openBlessing()">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.8 6.6a5 5 0 0 0-7.1 0L12 8.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 22l8.8-8.3a5 5 0 0 0 0-7.1z"/></svg>
      <div class="hc-title" id="soul-bless-title">Bless the people you carry</div>
      <div class="hc-desc" id="soul-bless-desc">Hold them one at a time — yourself, someone you love, a stranger, someone difficult, everyone. Ends by naming one person to actually go to.</div>
    </div>
```

**A2** (Your Why tab, before the Identity comment):
```html
  <!-- What matters — the values card sort (ACT/MI). A mirror the counsel argues from, never a score. -->
  <div class="card" style="margin-bottom:14px">
    <div class="card-hd" style="margin-bottom:8px">What actually matters to you</div>
    <div id="values-body"></div>
  </div>
```

**A4** (inside `getLifeState()`'s `state` object, before `sex:`):
```js
    // Their OWN top values, in their own order — so counsel argues from their standard, not ours.
    values: (function(){ try{ const o=(typeof getValues==='function')?getValues():null; return o?{ top:o.v.map(function(id){ return valLabel(id); }), why:o.why||'' }:null; }catch(_){ return null; } })(),
```

**A5** (inside `lifeStateBrief()`, before the readiness line):
```js
  // The person's own values, in their own order — the only standard the counsel may argue from.
  // A mirror, never a judge: never scored, never graded, never used to imply they are failing.
  if(s.values && s.values.top && s.values.top.length){
    lines.push('What THEY said matters most, in their order: '+s.values.top.map(function(v,i){ return (i+1)+' '+v; }).join(', ')+'.'
      + (s.values.why?(' In their own words about the first one: "'+s.values.why+'"'):'')
      + ' Use THEIR words, not yours, and ask whether a choice moves toward these. NEVER score, grade or rank them against their values, and never imply they are failing them.');
  }
```

**A6** (inside `applyFaithLabels()`, after the `soul-still-desc` line):
```js
    // The Blessing — named honestly per path. Metta is Buddhist; the others have their own word.
    const blessT={christianity:'Pray for the people you carry',islam:'Du\u2019a for the people you carry',hinduism:'Maitri \u2014 goodwill, one at a time',buddhism:'Metta \u2014 loving-kindness',secular:'Wish them well \u2014 one at a time'};
    const blessD={
      christianity:'Hold them before God one at a time \u2014 yourself, someone you love, a stranger, someone difficult, everyone. Ends by naming one to actually go to.',
      islam:'Make du\u2019a for them one at a time \u2014 yourself, someone you love, a stranger, someone difficult, everyone. Ends by naming one to actually go to.',
      hinduism:'Goodwill without conditions \u2014 yourself, someone you love, a stranger, someone difficult, all beings. Ends by naming one to actually go to.',
      buddhism:'The classic practice \u2014 self, a loved one, a stranger, a difficult person, all beings. Ends by naming one to actually go to.',
      secular:'Deliberately wish one person well, then widen \u2014 yourself, someone you love, a stranger, someone difficult, everyone. Ends with one to actually go to.'
    };
    set('soul-bless-title', blessT[t]||blessT.christianity);
    const _bl=(typeof blessLastLine==='function')?blessLastLine():'';
    set('soul-bless-desc', (blessD[t]||blessD.christianity)+(_bl?' \u00B7 '+_bl:''));
```

**A7** (inside `_feelMove()` — const before `m.innerHTML =`, then `_valBanner+` after `_savedBanner+`):
```js
  // Their own #1 value, as a QUESTION, never a verdict. Skipped when they're heavy: a person who is
  // low does not need their own standard held up in front of them. That would be shame, not counsel.
  const _valBanner = (function(){
    try{
      if(feeling==='down') return '';
      const tv=(typeof topValue==='function')?topValue():null; if(!tv) return '';
      return '<div style="font-size:12.5px;color:var(--tx3);line-height:1.55;margin-bottom:16px;font-style:italic">You said <span style="color:var(--go);font-style:normal">'+_escFew(tv)+'</span> matters most to you. Does the next hour move toward it?</div>';
    }catch(_){ return ''; }
  })();
```

**A9** (inside `renderReachOutCard()`, after the "Your few" button line):
```js
      '<button class="btn" style="width:auto;padding:7px 12px;font-size:12px" onclick="openBlessing()">'+(((typeof faithTradition==='function')&&(faithTradition()==='buddhism'||faithTradition()==='secular'))?'Wish them well':'Pray for them')+'</button>'+
```

**A10** (inside `initWhyTab()`, before `renderWhyAffirmations();`):
```js
  if(typeof renderValuesCard === 'function') renderValuesCard();
```

---

## 4. STORAGE KEYS

| Key | Shape | Cap |
|---|---|---|
| `totry_values` | `{ v:['family','health','honesty','freedom','service'], why:'…', ts:'ISO' }` — `v` = 1–5 VALUES ids in the person's order | 5 ids, `why` ≤160 chars |
| `totry_blessings` | `[{ ts:'ISO', reach:'Name', faith:'christianity' }, …]` newest-first | 100 |

**Both MUST be added to `SYNC_KEYS`.** A3 replacement (final entry of the array):
```js
  'totry_rosaries',
  // Values card sort (their own standard) + the loving-kindness/blessing log.
  'totry_values','totry_blessings'
```
No explicit `syncToCloud()` calls needed — `ls()` → patched `localStorage.setItem` queues any SYNC_KEYS write automatically (line ~4786).

---

## 5. DISCOVERY

**The Blessing** — **Soul tab → "Draw near" section → the 5th wide card**, directly under *Stillness & breath*. Title reads per tradition ("Pray for the people you carry" / "Du'a for the people you carry" / "Maitri" / "Metta — loving-kindness" / "Wish them well — one at a time"). One tap opens it. **Second entry:** the reach-out card in Reflect (evening) now carries a **"Pray for them" / "Wish them well"** button next to *I reached out ✓*. Tutorial shot: Soul → tap card → Begin → 5 taps → name → "I'm going to them now" → the Release. ~35 s.

**What Matters** — **Your Why tab → 2nd card, "What actually matters to you"**, button **"Sort my values"** (becomes "Re-sort" once set). Route: any hub → *Your Why*. Tutorial shot: tap 5 values → order with ▲▼ → one line on #1 → "Hold me to this" → then open the orb → any feeling → the italic line *"You said Family matters most to you. Does the next hour move toward it?"*. ~40 s and it demonstrates the integration on camera.

---

## 6. RISKS / VERIFY

1. **Parse-check is mandatory** — extract the big inline `<script>`, `node --check`. The payload is heavy on nested quotes inside `onclick=` strings; every dynamic value in an `onclick` here is a **numeric index or a hard-coded VALUES id**, never user text (house rule held).
2. **Div balance** — A1 adds 4 `<div`/4 `</div>`; A2 adds 2/2. Recount `<div` vs `</div>` outside scripts == 0.
3. **`_blessGo()` calls `logReachOut(name)`** on "I'm going to them now" — same premise as the existing `releaseReachOut()`. If the founder judges that too generous a claim, drop that one line; the Release copy still stands.
4. **`logReachOut` calls `renderReachOutCard()`**, which no-ops when `#call-prompt` isn't mounted — safe from the Soul tab.
5. **TDZ**: `VALUES`/`BLESS` are `const`s declared at ~line 10971 but only read at runtime; `getLifeState()`'s new field is wrapped in try/catch, so even a pathological early call degrades to `values:null`.
6. **Focus stealing**: `_blessTyped` and `_blessReachTyped` deliberately do **not** re-render — verify typing a name in steps 2–4 keeps the caret and updates the phrases live.
7. **Muted-person check**: add someone, tap 🔕, run the practice — they must be *selectable* at step 2 (with "held quietly" + the grief-safe note) and *absent* from the step-6 reach-out chips.
8. **Multi-faith check**: switch Settings → Faith to each of the five, reopen Soul — card title/desc and every phrase must swap. Secular must contain zero God-language.
9. **Feeling Door**: confirm the values line is absent for **Heavy**, present for the others, and absent entirely before a sort exists.
10. **Release**: `npm test` (no core math touched, but green before ship), bump `APP_VERSION` → `'v344'` and `sw.js` `const CACHE` → `'totry-v344-…'` together.