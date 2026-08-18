

// ═══════════════════════════════════════════════════
// UNLIMITED FINANCE GOALS
// ═══════════════════════════════════════════════════
function addFinanceGoal(){
  const name=document.getElementById('goal-name')?.value.trim();
  const target=parseFloat(document.getElementById('goal-target')?.value||0);
  const current=parseFloat(document.getElementById('goal-current')?.value||0);
  if(!name||target<=0){
    showToast('Missing info','Need a name and a target amount.');
    return;
  }
  const goals=ls('totry_finance_goals')||[];
  goals.push({
    id:Date.now(),
    name,
    target,
    current:current||0,
    created:new Date().toISOString(),
    priority:goals.length+1
  });
  ls('totry_finance_goals',goals);
  // Clear inputs
  document.getElementById('goal-name').value='';
  document.getElementById('goal-target').value='';
  document.getElementById('goal-current').value='';
  renderFinanceGoals();
  showToast('Goal added',name+' is now in your goals.');
}

function renderFinanceGoals(){
  const container=document.getElementById('finance-goals-list');
  if(!container)return;
  const goals=ls('totry_finance_goals')||[];
  // Migrate legacy USA/India saves to new system
  const legacyUSA=ls('totry_savings_usa');
  const legacyIndia=ls('totry_savings_india');
  if((legacyUSA||legacyIndia) && !goals.find(g=>g.name==='USA Trip')){
    if(legacyUSA)goals.push({id:Date.now(),name:'USA Trip',target:0,current:legacyUSA,created:new Date().toISOString(),priority:1});
    if(legacyIndia)goals.push({id:Date.now()+1,name:'India Trip',target:0,current:legacyIndia,created:new Date().toISOString(),priority:2});
    ls('totry_finance_goals',goals);
    localStorage.removeItem('totry_savings_usa');
    localStorage.removeItem('totry_savings_india');
  }
  if(!goals.length){
    container.innerHTML='<p style="font-size:12px;color:var(--tx3);text-align:center;padding:14px;font-style:italic">No savings goals yet. Add some below.</p>';
    return;
  }
  // Sort by progress (most behind first = highest priority)
  const sorted=[...goals].sort((a,b)=>{
    const aProg=a.target>0?a.current/a.target:0;
    const bProg=b.target>0?b.current/b.target:0;
    return aProg-bProg; // furthest from goal first
  });
  container.innerHTML='';
  sorted.forEach((g,idx)=>{
    const pct=g.target>0?Math.min(100,(g.current/g.target)*100):0;
    const card=document.createElement('div');
    card.className='card';
    card.style.cssText='margin-bottom:8px;padding:12px 14px;background:var(--bg3);cursor:pointer';
    card.innerHTML=
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
        '<div style="font-size:13px;font-weight:500;color:var(--tx)">'+(idx===0?'<span style="color:var(--go);font-family:DM Mono,monospace;font-size:9px;margin-right:6px">PRIORITY</span>':'')+g.name+'</div>'+
        '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3)">'+pct.toFixed(0)+'%</div>'+
      '</div>'+
      '<div style="background:var(--bg4);height:5px;border-radius:3px;overflow:hidden;margin-bottom:6px">'+
        '<div style="background:var(--gr);height:100%;width:'+pct+'%;transition:width 0.3s"></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tx2)">'+
        '<span>$'+Math.round(g.current).toLocaleString()+' / $'+Math.round(g.target).toLocaleString()+'</span>'+
        '<span>$'+Math.round(g.target-g.current).toLocaleString()+' to go</span>'+
      '</div>'+
      '<div style="display:flex;gap:6px;margin-top:8px">'+
        '<input type="number" placeholder="Add $" id="goal-add-'+g.id+'" style="flex:1;padding:6px;font-size:16px">'+
        '<button class="btn" style="width:auto;padding:6px 10px;font-size:11px" onclick="addToGoal('+g.id+')">+ Add</button>'+
        '<button class="btn" style="width:auto;padding:6px 10px;font-size:11px;background:var(--re-bg);border-color:var(--re-bd);color:var(--re)" onclick="deleteFinanceGoal('+g.id+')" aria-label="Close">&#215;</button>'+
      '</div>';
    container.appendChild(card);
  });
}

function addToGoal(id){
  const amount=parseFloat(document.getElementById('goal-add-'+id)?.value||0);
  if(!amount||amount<=0)return;
  const goals=ls('totry_finance_goals')||[];
  const goal=goals.find(g=>g.id===id);
  if(!goal)return;
  goal.current=(goal.current||0)+amount;
  ls('totry_finance_goals',goals);
  renderFinanceGoals();
  showToast('Added $'+amount,goal.name+' is now at $'+Math.round(goal.current).toLocaleString());
}

function deleteFinanceGoal(id){
  // A one-tap destructive action on a glyph a few pixels wide, with no undo anywhere in the app.
  if(!confirm('Delete this savings goal? Your progress on it will be lost.')) return;
  const goals=ls('totry_finance_goals')||[];
  const removed=goals.find(g=>g.id===id);
  const newGoals=goals.filter(g=>g.id!==id);
  ls('totry_finance_goals',newGoals);
  renderFinanceGoals();
  if(removed){
    showUndo('Goal removed: '+removed.name,()=>{
      const cur=ls('totry_finance_goals')||[];
      cur.push(removed);
      ls('totry_finance_goals',cur);
      renderFinanceGoals();
    });
  }
}


// ═══════════════════════════════════════════════════
// UNIFIED ROUTINES + WEEKLY SPLIT
// ═══════════════════════════════════════════════════
function renderSplitOverview(){
  const overview=document.getElementById('pt-split-overview');
  if(!overview)return;
  const split=ls('totry_split')||[];
  const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  // Full names for the accessible label only — the visible chip stays short.
  const DAYS_FULL=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const ti=tIdx();
  
  // Default to 7 empty days if not configured
  while(split.length<7)split.push({focus:'',routine:null});
  
  overview.innerHTML='';
  split.forEach((day,i)=>{
    const row=document.createElement('div');
    row.className='split-day-row';
    const isToday=i===ti;
    row.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 12px;background:'+(isToday?'var(--go-bg)':'var(--bg3)')+';border:1px solid '+(isToday?'var(--go-bd)':'var(--bd)')+';border-radius:8px;margin-bottom:6px';
    const focusText=day.focus||(day.routine?day.routine:'Rest day');
    row.innerHTML='<div style="font-family:DM Mono,monospace;font-size:11px;color:'+(isToday?'var(--go)':'var(--tx3)')+';width:40px;text-transform:uppercase;letter-spacing:0.1em">'+DAYS[i]+'</div>'+
      '<div style="flex:1;font-size:13px;color:var(--tx)">'+focusText+'</div>'+
      // Seven buttons on this screen all read just "Edit", so a screen reader announced "Edit, Edit,
      // Edit..." seven times with nothing to tell them apart. The visible label stays short (the day is
      // right there in the row); the accessible name says which day and what is on it.
      '<button class="btn" style="width:auto;padding:5px 10px;font-size:11px" aria-label="Edit '+_escFew(DAYS_FULL[i]||DAYS[i])+' \u2014 currently '+_escFew(focusText)+'" onclick="editSplitDay('+i+')">Edit</button>';
    overview.appendChild(row);
  });
}

function editSplitDay(dayIdx){
  const split=ls('totry_split')||[];
  while(split.length<7)split.push({focus:'',routine:null});
  const routines=ls('totry_routines')||[];
  const day=split[dayIdx];
  const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  
  // Build modal with day editor
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-size:16px;font-weight:500;color:var(--tx);margin-bottom:10px">'+DAYS[dayIdx]+'</div>'+
    '<div style="font-size:12px;color:var(--tx3);margin-bottom:6px">Focus (or leave blank for rest day)</div>'+
    '<input type="text" id="split-edit-focus" value="'+(day.focus||'')+'" placeholder="e.g. Push, Pull, Legs, Rest..." style="margin-bottom:10px">'+
    '<div style="font-size:12px;color:var(--tx3);margin-bottom:6px">Assign a saved routine (optional)</div>'+
    '<select id="split-edit-routine" style="margin-bottom:12px">'+
      '<option value="">— No routine —</option>'+
      routines.map(r=>'<option value="'+r.name+'"'+(day.routine===r.name?' selected':'')+'>'+r.name+'</option>').join('')+
    '</select>'+
    '<button class="btn primary" onclick="saveSplitDay('+dayIdx+')" style="margin-bottom:8px">Save day</button>'+
    '<button class="btn" onclick="closeModal(this)">Cancel</button></div>';
  document.body.appendChild(m);
}

function saveSplitDay(dayIdx){
  const focus=document.getElementById('split-edit-focus')?.value.trim()||'';
  const routine=document.getElementById('split-edit-routine')?.value||'';
  const split=ls('totry_split')||[];
  while(split.length<7)split.push({focus:'',routine:null});
  split[dayIdx]={focus,routine:routine||null};
  ls('totry_split',split);
  document.querySelector('.modal-bg.open')?.remove();
  renderSplitOverview();
  showToast('Day updated','Split saved.');
}

async function showRoutineRecommender(){
  // Ask user a few questions, then AI recommends a split
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<div style="font-size:16px;font-weight:500;color:var(--tx);margin-bottom:14px">Recommend a split for me</div>'+
    '<div style="font-size:12px;color:var(--tx3);margin-bottom:6px">Days per week you can train</div>'+
    '<select id="rec-days" style="margin-bottom:12px">'+
      '<option value="3">3 days</option><option value="4">4 days</option><option value="5" selected>5 days</option><option value="6">6 days</option>'+
    '</select>'+
    '<div style="font-size:12px;color:var(--tx3);margin-bottom:6px">Main goal</div>'+
    '<select id="rec-goal" style="margin-bottom:12px">'+
      '<option value="muscle">Build muscle</option><option value="strength">Get stronger</option><option value="lose">Fat loss</option><option value="athletic">Athletic / general fitness</option>'+
    '</select>'+
    '<div style="font-size:12px;color:var(--tx3);margin-bottom:6px">Experience</div>'+
    '<select id="rec-exp" style="margin-bottom:14px">'+
      '<option value="beginner">Beginner (under 1 year)</option><option value="intermediate" selected>Intermediate (1-3 years)</option><option value="advanced">Advanced (3+ years)</option>'+
    '</select>'+
    '<button class="btn primary" onclick="generateRecommendation()" style="margin-bottom:8px">Generate my split</button>'+
    '<button class="btn" onclick="closeModal(this)">Cancel</button></div>';
  document.body.appendChild(m);
}

async function generateRecommendation(){
  const days=document.getElementById('rec-days')?.value;
  const goal=document.getElementById('rec-goal')?.value;
  const exp=document.getElementById('rec-exp')?.value;
  if(!days||!goal||!exp)return;
  
  const m=document.querySelector('.modal-bg.open .modal');
  if(m)m.innerHTML='<div class="modal-handle"></div><div style="text-align:center;padding:30px"><div class="pulsing" style="font-family:Cormorant Garamond,serif;font-size:18px;font-style:italic;color:var(--go)">Designing your split...</div></div>';
  
  try{
    const prompt='Design a '+days+'-day training split for '+exp+' lifter whose main goal is '+goal+'. Return ONLY a JSON array of 7 objects (Mon-Sun). Each: {"day":"Mon","focus":"e.g. Push, Pull, Legs, Upper, Lower, Rest","exercises":["exercise 1","exercise 2","exercise 3","exercise 4","exercise 5"]}. Rest days have focus:"Rest" and exercises:[]. Be specific with exercise names. ONLY the JSON array, no markdown.';
    const response=await api('You are a strength coach.',[],prompt,1000);
    const match=response.match(/\[[\s\S]*\]/);
    if(!match)throw new Error('No JSON found');
    const recSplit=JSON.parse(match[0]);
    
    if(!Array.isArray(recSplit)||recSplit.length!==7)throw new Error('Invalid structure');
    
    // Display the recommendation with "Apply" button
    const modal=document.querySelector('.modal-bg.open .modal');
    let html='<div class="modal-handle"></div>'+
      '<div style="font-size:16px;font-weight:500;color:var(--tx);margin-bottom:14px">Your recommended split</div>';
    recSplit.forEach(d=>{
      html+='<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:8px;padding:10px 12px;margin-bottom:6px">'+
        '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><div style="font-family:DM Mono,monospace;font-size:11px;color:var(--go);text-transform:uppercase">'+d.day+'</div><div style="font-size:13px;font-weight:500;color:var(--tx)">'+d.focus+'</div></div>';
      if(d.exercises&&d.exercises.length){
        html+='<div style="font-size:11px;color:var(--tx3);line-height:1.6">'+d.exercises.join(', ')+'</div>';
      }
      html+='</div>';
    });
    html+='<button class="btn primary" onclick="applyRecommendedSplit()" style="margin-top:10px;margin-bottom:8px">Apply this split</button>'+
      '<button class="btn" onclick="closeModal(this)">Discard</button>';
    modal.innerHTML=html;
    
    // Save the recommendation temporarily
    window._recSplit=recSplit;
  }catch(e){
    console.error('Recommendation failed:',e);
    const modal=document.querySelector('.modal-bg.open .modal');
    if(modal)modal.innerHTML='<div class="modal-handle"></div><p style="font-size:13px;color:var(--re);text-align:center;padding:14px">Could not generate recommendation. Check your connection.</p><button class="btn" onclick="closeModal(this)">Close</button>';
  }
}

function applyRecommendedSplit(){
  const rec=window._recSplit;
  if(!rec)return;
  const split=rec.map(d=>({focus:d.focus,routine:null}));
  ls('totry_split',split);
  document.querySelector('.modal-bg.open')?.remove();
  renderSplitOverview();
  showToast('Split saved','Your weekly split is live. Build routines to attach to each day.');
}

// ═══════════════════════════════════════════════════
// BODY PROGRESS PHOTOS
// ═══════════════════════════════════════════════════
let _pendingBodyPhoto = null;


function renderBodyCollage(){
  const entries = ls('totry_body') || [];
  const withPhotos = entries.filter(e => e.photo);
  const container = document.getElementById('body-collage');
  const card = document.getElementById('body-collage-card');
  if(!container || !card)return;
  if(!withPhotos.length){
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';
  container.innerHTML = '';
  withPhotos.forEach((e, i) => {
    const div = document.createElement('div');
    div.style.cssText = 'position:relative;border-radius:8px;overflow:hidden;border:1px solid var(--bd);cursor:pointer';
    div.innerHTML = '<img loading="lazy" decoding="async" src="'+e.photo+'" style="width:100%;height:120px;object-fit:cover;display:block">'+
      '<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,0.85),transparent);padding:4px 6px"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-align:center">'+e.date+'</div><div style="font-size:11px;color:var(--tx);text-align:center;font-weight:500">'+e.weight+'kg</div></div>';
    div.onclick = () => viewBodyPhoto(i);
    container.appendChild(div);
  });
}

function viewBodyPhoto(idx){
  const entries = ls('totry_body') || [];
  const withPhotos = entries.filter(e => e.photo);
  const entry = withPhotos[idx];
  if(!entry)return;
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  m.innerHTML = '<div class="modal" style="max-width:90vw;padding:20px">'+
    '<div style="text-align:center"><img loading="lazy" decoding="async" src="'+entry.photo+'" style="max-width:100%;max-height:60vh;border-radius:8px;margin-bottom:14px"></div>'+
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);text-align:center;margin-bottom:4px">'+entry.date+'</div>'+
    '<div style="font-size:14px;font-weight:500;color:var(--tx);text-align:center;margin-bottom:8px">'+entry.weight+'kg</div>'+
    (entry.note?'<div style="font-size:12px;color:var(--tx2);text-align:center;font-style:italic;margin-bottom:10px">'+entry.note+'</div>':'')+
    '<button class="btn" onclick="closeModal(this)" style="margin-top:8px">Close</button></div>';
  document.body.appendChild(m);
}

function exportBodyCollage(){
  const entries = (ls('totry_body') || []).filter(e => e.photo);
  if(!entries.length){ showToast('No photos', 'Add photos to your check-ins first.'); return; }
  
  // Build a single collage canvas
  const PHOTO_SIZE = 200;
  const COLS = Math.min(3, entries.length);
  const ROWS = Math.ceil(entries.length / COLS);
  const PADDING = 10;
  const HEADER = 80;
  const FOOTER = 30;
  
  const canvas = document.createElement('canvas');
  canvas.width = COLS * PHOTO_SIZE + (COLS+1) * PADDING;
  canvas.height = HEADER + ROWS * PHOTO_SIZE + (ROWS+1) * PADDING + FOOTER;
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#0C0C0E';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Title
  ctx.fillStyle = '#C8A96E';
  ctx.font = 'italic 28px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('My Progress', canvas.width/2, 40);
  ctx.font = '11px monospace';
  ctx.fillStyle = '#777';
  ctx.fillText('TOTRY · ' + new Date().toLocaleDateString('en-AU'), canvas.width/2, 60);
  
  // Photos
  let loaded = 0;
  entries.forEach((e, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const x = PADDING + col * (PHOTO_SIZE + PADDING);
    const y = HEADER + PADDING + row * (PHOTO_SIZE + PADDING);
    
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, PHOTO_SIZE, PHOTO_SIZE, 8);
      ctx.clip();
      ctx.drawImage(img, x, y, PHOTO_SIZE, PHOTO_SIZE);
      ctx.restore();
      
      // Label
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x, y + PHOTO_SIZE - 28, PHOTO_SIZE, 28);
      ctx.fillStyle = '#C8A96E';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(e.date, x + PHOTO_SIZE/2, y + PHOTO_SIZE - 16);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(e.weight + 'kg', x + PHOTO_SIZE/2, y + PHOTO_SIZE - 4);
      
      loaded++;
      if(loaded === entries.length){
        canvas.toBlob(blob => {
          // Awaited: this used to announce "Ready" the instant it was called, before the save had
          // resolved and regardless of whether anything happened.
          SaveFile.save(blob, 'progress-collage-'+Date.now()+'.png', 'Progress').then(function(r){
            if(r === null) return;   // dismissed
            showToast(r ? 'Ready' : 'Could not save', r ? 'Save it or share it — your call.' : 'Try again in a moment.');
          });
        }, 'image/png');
      }
    };
    img.src = e.photo;
  });
}

function showMorningFocus(){
  // PRIMARY: identity / who you\'re becoming today
  const identityEl=document.getElementById('morning-focus-identity');
  const actionEl=document.getElementById('morning-focus-action');
  const identity=ls('totry_identity');
  if(identityEl){
    if(identity){
      // Strip "I am becoming a person who" prefix to focus on the becoming part
      const becomingPart=identity.replace(/^I am becoming a person who /i,'');
      identityEl.style.cursor='pointer'; identityEl.setAttribute('onclick','editIdentity()'); identityEl.title='Tap to edit';
      identityEl.innerHTML='I am becoming a person who <em style="color:var(--gr);font-style:normal;font-weight:600">'+becomingPart+'</em>';
    }else{
      identityEl.style.cursor='pointer'; identityEl.setAttribute('onclick','editIdentity()');
      identityEl.innerHTML='<span style="color:var(--go);font-style:italic">Name who you’re becoming — the person today is for. Tap to set it.</span>';
    }
  }
  // Daily action prompts that connect identity to today
  if(actionEl){
    const actionPrompts=[
      'Today, one choice at a time. One yes that lines up.',
      'Today is a small chance to prove yesterday wrong.',
      'You don\'t have to feel like it. You just have to do the next right thing.',
      'Today, the version of you you\'re becoming gets one day closer.',
      'Today, choose alignment over comfort. Just for today.',
      'Today, your future self is watching. Show up for them.',
      'One step. Not the whole journey. Just one step today.',
    ];
    // getDayCount()%7 is 1 on day one, which landed EXACTLY on "prove yesterday wrong" — pointing a
    // brand-new person at a yesterday they never had. Day one starts the rotation at index 0 instead.
    const _apd = (typeof daysInstalled === 'function') ? daysInstalled() : getDayCount();
    actionEl.textContent=actionPrompts[(_apd<=1?0:getDayCount())%actionPrompts.length];
  }
  
  // SECONDARY: the day's pledge. This card used to only NAME the vice — it reported and did nothing.
  // Now it asks for the one thing a morning can actually give: today's choice, made on purpose.
  loadV();
  if(typeof renderMorningPledge==='function') renderMorningPledge();
}
function renderAffirmList(){
  const list=document.getElementById('affirm-list');if(!list)return;
  const affirms=getAffirmations();list.innerHTML='';
  affirms.forEach((a,i)=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd)';
    row.innerHTML='<div style="flex:1;font-size:13px;color:var(--tx2);line-height:1.4;font-style:italic">'+a+'</div>'+
      '<button style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:16px;padding:0 4px" onclick="deleteAffirm('+i+')" aria-label="Close">&#215;</button>';
    list.appendChild(row);
  });
}
function deleteAffirm(i){
  // A one-tap destructive action on a glyph a few pixels wide, with no undo anywhere in the app.
  if(!confirm('Delete this affirmation? You wrote it — it cannot be recovered.')) return;
  const affirms=getAffirmations();affirms.splice(i,1);
  ls('totry_affirms',affirms);renderAffirmList();
}

// ── VICES + INTERVENTION ──────────────────────────────────────
let vices=[],curVice=-1,sosLoc='alone',sosTimerInt=null,sosVerseData=null;
function loadV(){
  const _vRaw=ls('totry_v');
  vices=Array.isArray(_vRaw)?_vRaw:lsArr('totry_v');
  // Backfill vice type for any vice created before the playbook existed, so urge-fighting
  // is tailored even for older entries.
  // `changed` starts true when the stored value was the wrong shape (see lsArr), so the repaired
  // array is written straight back and the eleven places that read totry_v directly never meet it.
  let changed=(_vRaw!=null && !Array.isArray(_vRaw));
  vices.forEach(v=>{ if(v && !v.type){ v.type=classifyVice(v.n); changed=true; } });
  // Heal vices created by onboarding before it stamped startDate (see obNext step 6). Without this they
  // read "0 days clean" forever. Only ever stamped when there is no start AND no recorded slip, so this
  // can never overwrite a real clean-date or resurrect one a relapse legitimately reset.
  vices.forEach(v=>{ if(v && !v.startDate && !v.lastLoss){ v.startDate=new Date().toISOString(); changed=true; } });
  if(changed) ls('totry_v', vices);
}
function saveV(){ls('totry_v',vices);}
// ── THE MAP AROUND THE FIGHT ──────────────────────────────────────────────────────────────────
// The Fight had the in-the-moment toolkit but no map: no daily choice, and no idea WHERE in the
// arc of change a person actually is. Both live ON the vice object (totry_v — already synced), so
// every existing vice keeps working untouched:
//   v.pledge     'DD/MM/YYYY'  the day the pledge was last made
//   v.pledgeDays  int          lifetime days pledged. NEVER resets, never decrements. Breaking it
//                              is not recorded, not counted, not mentioned. It is re-made, not owed.
//   v.stage      'curious'|'torn'|'ready'|'rebuilding'|'shaky'   +  v.stageAt (ISO)
function _vDay(){ return new Date().toLocaleDateString('en-AU'); }
function vicePledgedToday(v){ return !!(v && v.pledge === _vDay()); }

// B1 — THE DAILY PLEDGE. One tap. One day. Grace-based by construction: there is no "did you keep
// it?" question anywhere, because a pledge you're audited on is a debt, and a debt shames.
const _PLEDGE_WORD = {
  christianity:'Not by your own strength alone. \u201CI can do all things through him who strengthens me.\u201D \u2014 Philippians 4:13',
  islam:'Say it and mean it. Sabr isn\u2019t one great act \u2014 it\u2019s today, and then today again.',
  hinduism:'Do today\u2019s duty and let go of the fruit. Today is the only part that was ever yours.',
  buddhism:'Just this day. A mind that resolves once can resolve again tomorrow.',
  secular:'A promise made to yourself in the morning, while you\u2019re clear. That\u2019s all today has to be.'
};
function makePledge(i, from){
  loadV(); const v=vices[i]; if(!v || vicePledgedToday(v)) return;
  v.pledge=_vDay(); v.pledgeDays=(v.pledgeDays||0)+1; saveV();
  try{ renderVices(); }catch(_){}
  try{ if(typeof renderMorningPledge==='function') renderMorningPledge(); }catch(_){}
  try{ if(typeof syncToCloud==='function') syncToCloud(); }catch(_){}
  try{ if(typeof logEvent==='function') logEvent('pledge'); }catch(_){}
  if(typeof haptic==='function') haptic('celebrate');
  _pledgeSaid(v, from);
}
function _pledgeSaid(v, from){
  const t=(typeof faithTradition==='function')?faithTradition():'secular';
  const soft=(typeof _breathFaithOn==='function') ? !_breathFaithOn() : false;   // faith dial on 'light'
  const word=(soft?_PLEDGE_WORD.secular:(_PLEDGE_WORD[t]||_PLEDGE_WORD.secular));
  const n=v.pledgeDays||1;
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center"><div class="modal-handle"></div>'+
    '<div style="font-size:26px;margin-bottom:8px">\uD83E\uDD1D</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:25px;color:var(--tx);line-height:1.25;margin-bottom:10px">'+
      (v.mode==='moderate'?'Today, I hold my line.':'Today, not this.')+'</div>'+
    '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:14px">'+word+'</div>'+
    (n>1
      ? '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);letter-spacing:0.08em;margin-bottom:16px">'+n+' days now, you\u2019ve chosen this on purpose</div>'
      : '<div style="font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:16px">Just today. Tomorrow gets its own.</div>')+
    (from==='morning'
      ? '<button class="btn primary" onclick="closeModal(this)">Back to my morning</button>'
      : '<button class="btn primary" onclick="closeModal(this);theRelease({did:\'You made your pledge for today \u2014 out loud, on purpose.\'})">Now go live it</button>')+
  '</div>';
  document.body.appendChild(m);
}
function _pledgeRowHTML(i){
  const v=vices[i]; if(!v || v.kind==='letgo') return '';
  const n=v.pledgeDays||0;
  const line=(v.mode==='moderate')?'Today, I hold my line':'Today, not this';
  if(vicePledgedToday(v)){
    return '<div style="display:flex;align-items:center;gap:9px;background:var(--go-bg);border:1px solid var(--go-bd);border-radius:10px;padding:9px 11px;margin-bottom:10px">'+
      '<span style="font-size:14px;flex:none">\uD83E\uDD1D</span>'+
      '<div style="flex:1;text-align:left">'+
        '<div style="font-size:12.5px;color:var(--tx2);line-height:1.45">Pledged today. '+line+'.</div>'+
        (n>1?'<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);letter-spacing:0.08em;margin-top:2px">'+n+' days you\u2019ve chosen this</div>':'')+
      '</div></div>';
  }
  return '<button onclick="makePledge('+i+',\'fight\')" style="width:100%;background:var(--go-bg);border:1px solid var(--go-bd);color:var(--go);border-radius:10px;padding:10px;font-size:12.5px;font-weight:500;cursor:pointer;margin-bottom:10px">\uD83E\uDD1D '+line+' \u2014 make the pledge</button>';
}

// B2 — STAGE OF CHANGE. Prochaska: pushing action-stage tactics (goals, plans, streaks) at someone
// who is only contemplating BACKFIRES. So the stage the person names changes the card's primary
// offer and the brother's tone. The in-the-moment door is NEVER removed at any stage — only demoted.
const VICE_STAGES = {
  curious:    { label:'Curious',           blurb:'Just looking at it honestly. Nothing asked of you.',
                cta:'Show me what it\u2019s really costing', act:'openRecoveryTimeline(IDX)',
                tone:'You told me you\u2019re still just looking at this \u2014 so no lecture from me. I\u2019m only saying it out loud so you\u2019ve seen it.' },
  torn:       { label:'Torn',              blurb:'Part of you wants out, part of you doesn\u2019t. Both are real.',
                cta:'Help me work out what I actually want', act:'openVicePlan(IDX)',
                tone:'You said you\u2019re torn on this, and that\u2019s an honest place to stand. I\u2019m not going to push you off it. What does the part of you that wants out say right now?' },
  ready:      { label:'Ready',             blurb:'You\u2019ve decided. Now it\u2019s moments, one at a time.',
                cta:'', act:'', tone:'' },
  rebuilding: { label:'Rebuilding',        blurb:'Just after a fall. Flat for a while is the reward system healing, not you failing.',
                cta:'Rebuild me \u2014 a real high, no crash', act:'openNaturalHighs()',
                tone:'You\u2019re rebuilding right now, so I\u2019ll say this softly: this stretch is the hardest and it counts the most. Nothing tonight is a verdict on you.' },
  shaky:      { label:'Steady but shaky',  blurb:'Holding, but you can feel it leaning. Catch the setup, not the urge.',
                cta:'What\u2019s actually going on with me?', act:'openHALT()',
                tone:'You told me steady but shaky. This is exactly the moment that tells you which one it is \u2014 and either answer is fine, as long as it\u2019s true.' }
};
function viceStage(v){ const s=v&&v.stage; return VICE_STAGES[s]?s:'ready'; }
function viceStageTone(name){
  try{ loadV(); const v=vices.find(function(x){ return x&&x.n===name; });
    if(!v||!v.stage||!VICE_STAGES[v.stage]) return '';
    return VICE_STAGES[v.stage].tone||'';
  }catch(_){ return ''; }
}

// B3 — the card strip + the stage-matched action
function _stageStripHTML(i){
  const v=vices[i]; if(!v || v.kind==='letgo') return '';
  const set=!!(v.stage && VICE_STAGES[v.stage]); const s=VICE_STAGES[viceStage(v)];
  return '<button onclick="openViceStage('+i+')" style="width:100%;text-align:left;background:none;border:none;border-bottom:1px solid var(--bd);padding:0 0 9px;margin-bottom:10px;cursor:pointer">'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:3px">Where you are with this \u00b7 tap to change</div>'+
    '<div style="font-size:12.5px;line-height:1.45;color:'+(set?'var(--go)':'var(--tx3)')+'">'+
      (set ? s.label+' <span style="color:var(--tx3)">\u2014 '+s.blurb+'</span>'
           : 'Not set \u2014 tell me, and I\u2019ll change what I offer you')+'</div>'+
  '</button>';
}
function _stageCtaHTML(i){
  const v=vices[i]; if(!v) return '';
  const s=VICE_STAGES[viceStage(v)];
  if(!s.cta || !s.act) return '';
  return '<button class="vice-btn" onclick="'+s.act.replace('IDX', i)+'" style="width:100%;background:var(--go);color:#1a1505;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:8px">'+s.cta+'</button>';
}
// The quit card's whole primary block. At 'ready' it is EXACTLY the button that was there before.
// At every other stage the stage-matched move leads and the urge door stays, one tap away.
function _stagePrimaryHTML(i){
  const v=vices[i]; if(!v) return '';
  const RED='<button class="vice-btn" onclick="openMomentStakes('+i+')" style="width:100%;background:var(--re);color:#fff;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">'+
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'+
    'I\u2019m feeling it \u2014 come here first</button>';
  if(viceStage(v)==='ready') return RED;
  return _stageCtaHTML(i)+
    '<button onclick="openMomentStakes('+i+')" style="width:100%;background:none;border:1px solid var(--re-bd);color:var(--re);border-radius:10px;padding:9px;font-size:12px;cursor:pointer">\u26A0 I\u2019m feeling it right now</button>';
}

// B4 — the chooser
function openViceStage(i){
  loadV(); const v=vices[i]; if(!v) return;
  const cur=v.stage||'';
  const rows=Object.keys(VICE_STAGES).map(function(k){
    const s=VICE_STAGES[k]; const on=cur===k;
    return '<button onclick="setViceStage('+i+',\''+k+'\')" style="width:100%;text-align:left;padding:12px 13px;background:'+(on?'var(--go-bg)':'var(--bg3)')+';border:1px solid '+(on?'var(--go-bd)':'var(--bd)')+';border-radius:10px;margin-bottom:8px;cursor:pointer">'+
      '<div style="font-size:14px;color:var(--tx)">'+s.label+'</div>'+
      '<div style="font-size:11.5px;color:var(--tx3);line-height:1.5;margin-top:2px">'+s.blurb+'</div></button>';
  }).join('');
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal"><div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);line-height:1.25;margin-bottom:6px">Where are you with '+_escFew(v.n)+' right now?</div>'+
    '<div style="text-align:center;font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:16px">Honestly \u2014 not where you think you should be. Handing quit-tactics to someone who\u2019s still deciding just makes them dig in. I\u2019d rather offer you the right thing. Change it any day; going backwards is part of it.</div>'+
    rows+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px;margin-top:2px">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}
function setViceStage(i, k){
  loadV(); const v=vices[i]; if(!v || !VICE_STAGES[k]) return;
  v.stage=k; v.stageAt=new Date().toISOString(); saveV();
  document.querySelector('.modal-bg.open')?.remove();
  try{ renderVices(); if(typeof syncToCloud==='function') syncToCloud(); }catch(_){}
  try{ if(typeof logEvent==='function') logEvent('vice_stage'); }catch(_){}
  if(typeof haptic==='function') haptic('success');
  if(typeof showToast==='function') showToast('Noted','I\u2019ll meet you there. Nothing else about you changes.');
}

// B5 — the morning pledge card body (fills #morning-pledge-body)
function renderMorningPledge(){
  const body=document.getElementById('morning-pledge-body'); if(!body) return;
  const card=document.getElementById('morning-vice-card');
  loadV();
  const live=vices.map(function(v,i){ return {v:v,i:i}; })
                  .filter(function(x){ return x.v && x.v.n && x.v.kind!=='letgo'; });
  if(!live.length){ if(card) card.style.display='none'; body.innerHTML=''; return; }
  if(card) card.style.display='';
  body.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Today\u2019s pledge</div>'+
    live.map(function(x){
      const v=x.v, n=v.pledgeDays||0;
      const line=(v.mode==='moderate')?'today, I hold my line':'today, not this';
      if(vicePledgedToday(v)){
        return '<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-top:1px solid var(--bd)">'+
          '<span style="flex:none;font-size:14px">\uD83E\uDD1D</span>'+
          '<div style="flex:1;text-align:left"><div style="font-size:12.5px;color:var(--tx2)">'+_escFew(v.n)+' \u2014 pledged.</div>'+
          (n>1?'<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">'+n+' days you\u2019ve chosen this</div>':'')+
          '</div></div>';
      }
      return '<button onclick="makePledge('+x.i+',\'morning\')" style="width:100%;display:flex;align-items:center;gap:9px;text-align:left;padding:9px 0;border:none;border-top:1px solid var(--bd);background:none;cursor:pointer">'+
        '<span style="flex:none;width:18px;height:18px;border-radius:5px;border:1.5px dashed var(--go)"></span>'+
        '<span style="flex:1;font-size:12.5px;color:var(--tx)">'+_escFew(v.n)+' \u2014 <span style="color:var(--go)">'+line+'</span></span></button>';
    }).join('')+
    '<div style="font-size:10.5px;color:var(--tx3);line-height:1.5;margin-top:8px">One day only. If it breaks, nothing here punishes you \u2014 you just make it again tomorrow.</div>';
}

// Sobriety clock
let sobClockInt=null;
function startSobrietyClock(){
  if(sobClockInt){ clearInterval(sobClockInt); sobClockInt=null; } // prevent stacked 1s timers
  updateSobrietyClock();
  sobClockInt=setInterval(updateSobrietyClock,1000);
}
function updateSobrietyClock(){
  loadV();if(!vices.length)return;
  const v=vices.find(x=>x&&x.kind!=='letgo'); if(!v)return; // letting-go struggles never drive the "days clean" clock
  const since=v.lastLoss?new Date(v.lastLoss):new Date(ls('totry_start')||Date.now());
  const diff=Math.max(0,Date.now()-since.getTime());
  const days=Math.floor(diff/86400000);
  const hours=Math.floor((diff%86400000)/3600000);
  const mins=Math.floor((diff%3600000)/60000);
  const secs=Math.floor((diff%60000)/1000);
  const dEl=document.getElementById('sob-days');
  const hEl=document.getElementById('sob-hms');
  if(dEl){dEl.textContent=days;dEl.className='sob-big '+(days>=1?'clean':'');}
  if(hEl)hEl.textContent=hours+'h '+mins+'m '+secs+'s';
}

// Craving log

// Vice fallback verses
const FB=[
  {k:['lust','pmo','sexual','porn'],v:"Flee from sexual immorality. Every other sin a person commits is outside the body, but the sexually immoral person sins against his own body.",r:"1 Corinthians 6:18 (ESV)",rf:"Your body is sacred. This urge will pass in minutes. Every second you resist, you choose who you're becoming."},
  {k:['weed','cannabis','drug','substance'],v:"Be sober-minded; be watchful. Your adversary the devil prowls around like a roaring lion, seeking someone to devour.",r:"1 Peter 5:8 (ESV)",rf:"Stay alert. What you're reaching for promises relief but delivers chains. You already know this."},
  {k:['gambl','bet','poker'],v:"Keep your life free from love of money, and be content with what you have.",r:"Hebrews 13:5 (ESV)",rf:"The rush you're chasing has a price you can't afford. You've paid it before."},
  {k:['vap','smok','nicotine'],v:"Do you not know that your body is a temple of the Holy Spirit within you?",r:"1 Corinthians 6:19 (ESV)",rf:"Every time you resist, you take your body back. This craving peaks in minutes and fades."},
  {k:['food','binge','eat'],v:"Whether you eat or drink, or whatever you do, do all to the glory of God.",r:"1 Corinthians 10:31 (ESV)",rf:"The urge to binge is often about something deeper than food. Sit with that."},
  {k:['alcohol','drink'],v:"Wine is a mocker, strong drink a brawler, and whoever is led astray by it is not wise.",r:"Proverbs 20:1 (ESV)",rf:"Clarity is a gift. The temporary escape isn't worth what it takes from you."},
  {k:['anger','rage','angry'],v:"Be angry and do not sin; do not let the sun go down on your anger.",r:"Ephesians 4:26 (ESV)",rf:"Your anger is valid. What you do with it is the question. Let it fuel change, not destruction."},
  {k:['lone','alone','lonely'],v:"The Lord himself goes before you and will be with you; he will never leave you nor forsake you.",r:"Deuteronomy 31:8 (ESV)",rf:"You are never truly alone. Even in silence, even at 3am."},
];
function getFallbackVerse(name){
  const n=(name||'').toLowerCase();
  const fb=FB.find(f=>f.k.some(kw=>n.includes(kw)));
  return fb?{verse:fb.v,reference:fb.r,reflection:fb.rf}:{verse:"No temptation has overtaken you that is not common to man. God is faithful, and he will not let you be tempted beyond your ability.",reference:"1 Corinthians 10:13 (ESV)",reflection:"This urge is not unique to you. Millions have faced exactly this and walked through it. So can you."};
}

// Intervention system
// ── VICE PLAYBOOK ──
// Different compulsions need genuinely different responses. Each entry pairs the real
// behavioural-science tactic for that vice with a fitting scriptural anchor. classifyVice()
// maps a user's free-text vice name to the closest type; everything falls back to 'general'.
const VICE_PLAYBOOK = {
  porn: {
    label: 'lust / porn',
    // Science: the urge is state-dependent on privacy + device access. Fastest break is to
    // remove privacy and change physical state. Urge-surfing: the wave peaks ~5-15 min then falls.
    science: 'This urge is tied to being alone with a screen. The single most effective move is to break privacy and change your body state — stand up, get into a shared or public space, get your hands and eyes onto something physical. The wave feels permanent but peaks within minutes and then falls.',
    firstMove: 'Put the phone in another room and physically leave the space you\'re in. Go where another person is, or could be.',
    actions: [
      'Phone DOWN and into another room. Then leave this room yourself — kitchen, outside, anywhere with the possibility of being seen.',
      'Cold water on your face and wrists, 10 seconds. The cold shock resets your nervous system and breaks the trance.',
      '10 pushups or 20 squats right now. Hard physical effort floods your system with something stronger than the urge.'
    ],
    verseRef: '1 Corinthians 6:18-20',
    verse: 'Flee from sexual immorality... you are not your own, for you were bought with a price. So glorify God in your body.',
    questions: ['In 20 minutes, which version of tonight do you want to be living in?','This isn\'t about willpower — it\'s about getting your body out of the trap. Are you moving yet?','Who are you becoming — and does this serve that person?']
  },
  gambling: {
    label: 'gambling',
    // Science: gambling urges spike around access to money + the "chase." Remove financial means
    // first; the house edge guarantees loss over time — the urge lies that this time is different.
    science: 'Gambling urges spike when money is accessible and after a "near miss." The decisive move is to put a wall between you and your money RIGHT NOW. The feeling that "this time is different" is the addiction talking — the maths never changes, the house always wins over time.',
    firstMove: 'Hand your phone or card to someone you trust, or physically lock your payment methods. Make betting impossible for the next hour.',
    actions: [
      'Make the bet impossible: delete the app, log out of the account, hand your card/phone to someone, or lock your bank card in the app.',
      'Write down what you\'ve lost to this over time — the real number. The urge survives by hiding that total from you.',
      'Call or text one person and say "I\'m fighting the urge to gamble." Saying it out loud collapses its power.'
    ],
    verseRef: '1 Timothy 6:9-10',
    verse: 'Those who desire to be rich fall into temptation, into a snare... For the love of money is a root of all kinds of evils.',
    questions: ['What does the math actually say about chasing this?','You\'ve felt the high and the crash before — which one lasts longer?','What would the person you\'re becoming do with this money instead?']
  },
  nicotine: {
    label: 'nicotine / vaping',
    // Science: nicotine cravings are intense but SHORT — they peak and pass in 3-5 minutes.
    // Delay + a substitute for the hand-to-mouth habit is the proven tactic.
    science: 'A nicotine craving is intense but short — it genuinely peaks and passes within 3 to 5 minutes whether or not you smoke. Your only job is to outlast this single wave. Delay, breathe, and give your hands and mouth something else to do.',
    firstMove: 'Set a 5-minute timer and drink a full glass of water slowly. You only have to beat THIS craving, not forever.',
    actions: [
      'Drink a full glass of cold water, slowly, sip by sip. It occupies your mouth and hands and buys you past the peak.',
      'Step outside and take 10 slow, deep breaths — mimic the inhale you\'re craving, but with clean air.',
      'Chew gum, eat something crunchy, or hold something in your hand. The hand-to-mouth habit is half the craving.'
    ],
    verseRef: '1 Corinthians 10:13',
    verse: 'No temptation has overtaken you that is not common to man. God is faithful, and he will provide the way of escape.',
    questions: ['This craving passes in minutes whether you give in or not — can you outlast just this one?','What does freedom from needing this feel like?','You\'ve made it this far today — why hand the win back now?']
  },
  alcohol: {
    label: 'alcohol',
    // Science: HALT (Hungry/Angry/Lonely/Tired) drives most drinking urges. Delay + address the
    // real need + remove access. The urge is usually a proxy for an unmet state.
    science: 'Most drinking urges aren\'t really about alcohol — they\'re your body asking for something else. Run the HALT check: are you Hungry, Angry, Lonely, or Tired? Meet that real need instead. Then delay, hydrate, and get the alcohol out of reach.',
    firstMove: 'Drink a full glass of water, then ask yourself: am I Hungry, Angry, Lonely, or Tired? Address THAT first.',
    actions: [
      'HALT check: Hungry, Angry, Lonely, or Tired? Name which one — then meet that need (eat, call someone, rest).',
      'Pour a glass of water or make tea. Hold a non-alcoholic drink — the ritual matters as much as the substance.',
      'Physically move the alcohol out of sight, or leave the room it\'s in. Distance buys you time.'
    ],
    verseRef: 'Ephesians 5:18',
    verse: 'Do not get drunk with wine, for that is debauchery, but be filled with the Spirit.',
    questions: ['What is this really about right now — what are you actually needing?','How do you want to feel tomorrow morning?','Who are you becoming — and does this pour serve that person?']
  },
  scrolling: {
    label: 'doomscrolling / social media',
    // Science: infinite-scroll exploits variable-reward dopamine. Physical distance from the phone
    // + a competing activity resets it. Usually driven by boredom or avoidance.
    science: 'Endless scrolling is engineered to hijack your attention with unpredictable rewards. It\'s usually boredom or avoidance in disguise. The fix is physical distance from the phone and one small real-world action to reset your focus.',
    firstMove: 'Put the phone down and walk to another room without it. Leave it there for 10 minutes.',
    actions: [
      'Phone down, screen off, into another room. Physically walk away from it for 10 minutes.',
      'Do one small real thing: make your bed, wash a dish, step outside. A tiny completed action breaks the trance.',
      'Ask what you were avoiding when you picked up the phone — then do 2 minutes of that instead.'
    ],
    verseRef: 'Philippians 4:8',
    verse: 'Whatever is true, honorable, just, pure, lovely... think about these things.',
    questions: ['What were you avoiding when you reached for the phone?','Is this feeding you or just numbing you?','What\'s one real thing you could do with these minutes?']
  },
  food: {
    label: 'overeating / binge',
    // Science: binge urges ride emotional waves. Urge-surf + hydrate + distinguish physical
    // hunger from emotional hunger (the "would I eat an apple?" test).
    science: 'Binge urges ride an emotional wave that crests and falls. First, separate physical hunger from emotional hunger — would a plain apple satisfy you right now? If not, it\'s emotional. Hydrate, pause, and let the wave pass.',
    firstMove: 'Drink a glass of water and wait 10 minutes. Ask: would I eat a plain apple right now? If no, this is emotional.',
    actions: [
      'Drink a full glass of water and set a 10-minute timer. Cravings and the wave often pass in that window.',
      'The apple test: would a plain apple satisfy you? If no, this is emotion, not hunger — name the feeling instead.',
      'Step away from the kitchen. Change rooms, brush your teeth, or go outside to break the cue.'
    ],
    verseRef: '1 Corinthians 10:31',
    verse: 'So, whether you eat or drink, or whatever you do, do all to the glory of God.',
    questions: ['Would a plain apple satisfy this — or is it a feeling?','What emotion is underneath this right now?','How do you want to feel after, not just during?']
  },
  general: {
    label: 'this urge',
    science: 'An urge is a wave, not a command. It rises, peaks, and falls — usually within minutes — whether or not you act on it. Your only job is to put space between the feeling and a decision: change your body state and your environment, and let the wave pass.',
    firstMove: 'Stand up and change your environment right now — different room, cold water, or step outside. Put space between the urge and any decision.',
    actions: [
      'Stand up and physically change your environment — another room, outside, cold water on your face.',
      '20 pushups or a brisk 2-minute walk. Movement changes your body chemistry faster than thinking does.',
      'Call or text someone you trust. You don\'t have to explain — connection breaks the spell of the urge.'
    ],
    verseRef: '1 Corinthians 10:13',
    verse: 'No temptation has overtaken you that is not common to man. God is faithful, and he will provide the way of escape.',
    questions: ['This wave peaks and passes — can you outlast just this moment?','In 20 minutes, what will you wish you had done?','Who are you becoming right now?']
  },
  // Used for "keep it in check" vices, esp. in social settings. The goal isn't zero — it's
  // staying within your own pre-decided line. Science: pre-commitment + pacing + an exit are
  // what actually hold a limit when you're with friends and pressure is on.
  moderate: {
    label: 'staying within your limit',
    science: 'In a social setting, the goal isn\'t zero — it\'s staying within the line you set before the pressure started. What actually works: decide your hard limit NOW (before the next round), pace yourself (water between, slow down), and have an easy exit line ready. You can enjoy the moment and still be the one in control of it.',
    firstMove: 'Decide your exact limit for tonight right now, before the next one. Say it to yourself, or to a friend you trust.',
    actions: [
      'Set your hard number for tonight before the next round — and have a glass of water first.',
      'Slow the pace: match every drink/smoke with a water, and put it down between sips. Control is in the tempo.',
      'Have your exit line ready ("I\'m good, driving" / "that\'s me for tonight"). Deciding it now makes it easy to say later.'
    ],
    verseRef: 'Ephesians 5:18',
    verse: 'Do not get drunk with wine, for that is debauchery, but be filled with the Spirit.',
    questions: ['What\'s your honest limit tonight — and are you still inside it?','Are you enjoying this, or chasing it?','Will tonight\'s version of you be one tomorrow\'s is glad of?']
  }
};
// Maps a free-text vice name to the closest playbook type via keyword matching.
function classifyVice(name){
  const n = (name || '').toLowerCase();
  const map = [
    ['porn', ['porn','lust','masturbat','nsfw','sexual','fap','onlyfans']],
    ['gambling', ['gambl','bet','betting','casino','poker','slots','wager','lottery','sportsbook']],
    ['nicotine', ['smok','cigarette','vap','nicotine','tobacco','juul','dip','chew']],
    ['alcohol', ['alcohol','drink','beer','wine','liquor','booze','spirits','drunk']],
    ['scrolling', ['scroll','social media','instagram','tiktok','phone','youtube','reddit','twitter','doomscroll','screen']],
    ['food', ['eat','food','binge','sugar','junk','snack','overeat','sweets']]
  ];
  for(const [type, kws] of map){ if(kws.some(k => n.includes(k))) return type; }
  return 'general';
}
function getVicePlaybook(v){
  // Moderation vices get the moderation playbook regardless of substance — the tactic is
  // about holding a limit, not quitting. (The substance still informs the AI verse/coach.)
  if(v && v.mode === 'moderate') return VICE_PLAYBOOK.moderate;
  const type = (v && v.type) ? v.type : classifyVice(v && v.n);
  return VICE_PLAYBOOK[type] || VICE_PLAYBOOK.general;
}

const LOC={
  alone:{
    actions:[
      {icon:'&#128167;',text:'Go to the bathroom NOW. Splash cold water on your face 10 times. The physical shock breaks the mental loop.'},
      {icon:'&#128170;',text:'Drop and do 20 pushups right now. Your body chemistry changes in 60 seconds of movement.'},
      {icon:'&#128331;',text:'Stand up, walk to a different room, open a window. Change your physical environment immediately.'},
    ],
    questions:['What does giving in cost you today \u2014 and tomorrow?','If you beat this right now, how will you feel in 10 minutes?','Who are you proving something to right now?'],
    timer:60
  },
  people:{
    actions:[
      {icon:'&#127788;',text:'Breathe in for 4 counts, hold for 4, out for 6. Do this 5 times. Nobody will notice. You will feel it.'},
      {icon:'&#128694;',text:'Excuse yourself. Go to the bathroom or step outside for 2 minutes. You don\'t need a reason.'},
      {icon:'&#128065;',text:'Name 5 things you can see, 4 you can touch, 3 you can hear. Stay in this moment, not the urge.'},
    ],
    questions:['You\'re around people \u2014 what would they see if you acted on this urge?','The urge peaks and fades. You just need to outlast this moment.','What does getting through the next 5 minutes look like?'],
    timer:45
  },
  car:{
    actions:[
      {icon:'&#128663;',text:'If safe \u2014 pull over. Put the car in park. No decisions while moving.'},
      {icon:'&#127925;',text:'Put on a song that reminds you of who you\'re trying to be. Turn it up.'},
      {icon:'&#128222;',text:'Call someone you trust right now. You don\'t have to say why. Just talk.'},
    ],
    questions:['Keep driving toward who you\'re becoming.','What would you say to someone you love who was feeling exactly this?','This passes. Drive through it.'],
    timer:45
  },
  bed:{
    actions:[
      {icon:'&#128161;',text:'Turn the lights ON right now. Darkness feeds this. Light breaks the mood immediately.'},
      {icon:'&#129427;',text:'Put your feet on the floor. Sit up. Get out of the bed. The bed is where this wins.'},
      {icon:'&#128214;',text:'Read Psalm 23 or Psalm 91 out loud. Your own voice praying breaks the spiral.'},
    ],
    questions:['Getting through tonight is everything.','How will you feel about this at breakfast tomorrow?','Morning is coming. Hold on.'],
    timer:60
  },
  work:{
    actions:[
      {icon:'&#128694;',text:'Take a 2-minute break — step to the bathroom, the break room, or outside. You\'re allowed.'},
      {icon:'&#128167;',text:'Get a glass of water and wash your hands or face. The cold and the small task reset you.'},
      {icon:'&#128241;',text:'Put the phone away and pick up the nearest work task. Doing the next small thing breaks the loop.'},
    ],
    questions:['You\'re at work — the urge will pass long before your shift does.','What\'s the next small task you can pour 5 minutes into?','Who are you when no one\'s watching? Be that now.'],
    timer:45
  },
  class:{
    actions:[
      {icon:'&#127891;',text:'You\'re in class — discreetly breathe in 4, hold 4, out 6, five times. No one will notice.'},
      {icon:'&#9999;&#65039;',text:'Pick up your pen and write down the next thing being said, or one line of notes. Anchor to the room.'},
      {icon:'&#128065;',text:'Ground yourself: 5 things you see, 4 you can touch, 3 you can hear. Come back to this moment.'},
    ],
    questions:['You came here to build a future — this urge is trying to rob that. Stay present.','The lecture ends soon; the urge ends sooner. Outlast it.','What does the person you\'re becoming do right now?'],
    timer:45
  }
};

function fightVice(i){
  loadV();
  curVice=i;
  // Show choice: fighting NOW (live SOS) or LOG a past fight
  const v=vices[i];
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.style.alignItems='center';
  m.innerHTML='<div class="modal">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);font-style:italic;margin-bottom:6px">'+_escFew(v.n)+'</div>'+
    '<div style="text-align:center;font-size:12px;color:var(--tx3);margin-bottom:18px">What\'s happening?</div>'+
    '<button class="btn primary" style="margin-bottom:8px;padding:14px;font-size:14px;text-align:left;line-height:1.4" onclick="startLiveIntervention('+i+')">'+
      '<div style="font-weight:600">&#x2694;&#xfe0f; Fighting right now</div>'+
      '<div style="font-size:11px;opacity:0.85;font-weight:400;margin-top:3px">Open the live SOS &mdash; breathing, scripture, win/loss</div>'+
    '</button>'+
    '<button class="btn" style="margin-bottom:8px;padding:14px;font-size:14px;text-align:left;line-height:1.4" onclick="startQuickLog('+i+')">'+
      '<div style="font-weight:600">&#x270d;&#xfe0f; Log a past fight</div>'+
      '<div style="font-size:11px;color:var(--tx3);font-weight:400;margin-top:3px">Quick log a battle from earlier &mdash; win or loss</div>'+
    '</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>'+
  '</div>';
  document.body.appendChild(m);
  haptic('tap');
}

// Path 1: Live SOS intervention (the original flow)
function startLiveIntervention(i){
  document.querySelector('.modal-bg.open')?.remove();
  loadV();
  curVice=i;
  vices[i].total=(vices[i].total||0)+1;
  if(!vices[i].urgelog)vices[i].urgelog=[];
  vices[i].urgelog.push(new Date().toISOString());
  if(vices[i].urgelog.length>50)vices[i].urgelog=vices[i].urgelog.slice(-50);
  saveV();
  sosVerseData=getFallbackVerse(vices[i].n);
  fetchSosVerse(i);
  const ov=document.getElementById('sos-overlay');
  ov.classList.add('open');
  ov.scrollTop=0;
  document.getElementById('sos-vice-name').textContent=vices[i].n;
  // Show their WHY and current streak - the reasons to hold on, right when they need it
  const why=(vices[i] && vices[i].plan && vices[i].plan.why) || ls('totry_why');
  const cleanDays=viceCleanDays(vices[i]);
  const reminderEl=document.getElementById('sos-why-reminder');
  if(reminderEl){
    let html='';
    if(cleanDays>0){
      html+='<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">You are '+cleanDays+' day'+(cleanDays===1?'':'s')+' in</div>';
    }
    if(why){
      html+='<div style="font-size:14px;color:var(--tx);font-style:italic;font-family:Cormorant Garamond,serif;line-height:1.5">Remember why: "'+_escFew(why)+'"</div>';
    }
    reminderEl.innerHTML=html;
    reminderEl.style.display=html?'block':'none';
  }
  showSosPhase(0);
}

// Path 2: Quick log of a past fight (replaces craving log)
function startQuickLog(i){
  document.querySelector('.modal-bg.open')?.remove();
  loadV();
  curVice=i;
  const v=vices[i];
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.style.alignItems='center';
  m.innerHTML='<div class="modal">'+
    '<div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);font-style:italic;margin-bottom:14px">'+_escFew(v.n)+'</div>'+
    
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Did you win or lose?</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:14px">'+
      '<button class="btn" id="ql-win-btn" style="flex:1;padding:12px;border:2px solid var(--bd)" onclick="setQLOutcome(true)">I beat it</button>'+
      '<button class="btn" id="ql-loss-btn" style="flex:1;padding:12px;border:2px solid var(--bd)" onclick="setQLOutcome(false)">I gave in</button>'+
    '</div>'+
    
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Intensity (1-10)</div>'+
    '<input type="range" id="ql-intensity" min="1" max="10" value="5" style="width:100%;margin-bottom:12px">'+
    
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">What triggered it? (optional)</div>'+
    '<input type="text" id="ql-trigger" placeholder="stress, boredom, certain person..." style="margin-bottom:12px">'+
    
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Anything you want to remember? (optional)</div>'+
    '<textarea id="ql-note" placeholder="What you felt, what helped, what didn\'t..." style="height:60px;resize:none;margin-bottom:14px;font-size:16px"></textarea>'+
    
    '<button class="btn primary" onclick="saveQuickLog()" style="margin-bottom:8px">Save this fight</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Cancel</button>'+
  '</div>';
  document.body.appendChild(m);
}

let _qlOutcome = null;
function setQLOutcome(won){
  _qlOutcome = won;
  // Which one is chosen was communicated ONLY as a border tint, with no aria-pressed, no text change and
  // nothing announced — so a screen-reader user taps "held" or "lapsed" and is never told which is now
  // selected, on the core act of the Fight tab. aria-pressed makes the state part of the control.
  try{
    const _w=document.getElementById('ql-win-btn'), _l=document.getElementById('ql-loss-btn');
    if(_w){ _w.setAttribute('role','button'); _w.setAttribute('aria-pressed', won ? 'true' : 'false'); }
    if(_l){ _l.setAttribute('role','button'); _l.setAttribute('aria-pressed', won ? 'false' : 'true'); }
  }catch(_){ }
  document.getElementById('ql-win-btn').style.borderColor = won ? 'var(--gr)' : 'var(--bd)';
  document.getElementById('ql-win-btn').style.background = won ? 'var(--gr-bg)' : '';
  document.getElementById('ql-loss-btn').style.borderColor = !won ? 'var(--re)' : 'var(--bd)';
  document.getElementById('ql-loss-btn').style.background = !won ? 'var(--re-bg)' : '';
  haptic('light');
}

function saveQuickLog(){
  if(_qlOutcome === null){
    showToast('Pick one','Did you win or lose this fight?');
    return;
  }
  loadV();
  const v = vices[curVice];
  if(!v) return;
  
  v.total = (v.total||0)+1;
  if(_qlOutcome){
    v.w = (v.w||0)+1;
    v.lastWin = new Date().toISOString();
    // Track savings if win
    let savedNow=0;
    const name = v.n.toLowerCase();
    if(/weed|cannabis|marijuana/.test(name))savedNow=20;
    else if(/vape|nicotine/.test(name))savedNow=5;
    else if(/cigarette|smoke/.test(name))savedNow=15;
    else if(/alcohol|drink/.test(name))savedNow=15;
    else if(/gambl|bet/.test(name))savedNow=30;
    else if(/spend|shop/.test(name))savedNow=25;
    else if(/food binge|junk|fast food/.test(name))savedNow=15;
    if(savedNow>0){
      const savings=ls('totry_vice_savings_log')||[];
      savings.push({vice:v.n,amount:savedNow,ts:new Date().toISOString(),date:new Date().toLocaleDateString('en-AU')});
      ls('totry_vice_savings_log',savings);
    }
    // Auto-log this victory into the Reflect wins log
    const _wins = ls('totry_wins') || [];
    const _isFirstEverWin = _wins.length === 0 && !ls('totry_first_win_done');
    _wins.unshift({
      text: 'Defeated an urge to ' + v.n.toLowerCase() + ' — chose who I\'m becoming.',
      ts: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-AU'),
      source: 'vice'
    });
    ls('totry_wins', _wins.slice(0, 500));
    if(typeof renderWinsLog==='function')renderWinsLog();
    if(_isFirstEverWin){ ls('totry_first_win_done', true); setTimeout(()=>{ if(typeof _celebrateFirstWin==='function') _celebrateFirstWin(); }, 400); }
    const cleanBeforeReset = viceCleanDays(v);
    v.cleanDaysTotal = (v.cleanDaysTotal || 0) + cleanBeforeReset;
    v.relapseCount = (v.relapseCount || 0) + 1;
    if(!v.relapseHistory) v.relapseHistory = [];
    v.relapseHistory.push({date: new Date().toISOString(), streakLength: cleanBeforeReset});
    v.startDate = new Date().toISOString(); // streak resets to now
    v.lastLoss = new Date().toISOString();
  }
  
  // Save the fight log entry with details
  const intensity = parseInt(document.getElementById('ql-intensity')?.value||5);
  const trigger = document.getElementById('ql-trigger')?.value.trim();
  window.__sosIntensity = intensity; window.__sosTrigger = trigger;
  const note = document.getElementById('ql-note')?.value.trim();
  
  if(!v.urgelog) v.urgelog = [];
  v.urgelog.push(new Date().toISOString());
  if(v.urgelog.length > 50) v.urgelog = v.urgelog.slice(-50);
  
  // Save detailed log
  const fightLog = ls('totry_fight_log') || [];
  fightLog.unshift({
    vice: v.n,
    won: _qlOutcome,
    intensity,
    trigger,
    note,
    ts: new Date().toISOString(),
    date: new Date().toLocaleDateString('en-AU')
  });
  ls('totry_fight_log', fightLog.slice(0, 200));
  
  saveV();
  document.querySelector('.modal-bg.open')?.remove();
  const _wasRelapse = (_qlOutcome === false);
  _qlOutcome = null;
  renderVices();
  renderScoreboard();
  renderDayCounter();

  if(!_wasRelapse){
    haptic('celebrate');
    showToast('Logged','Your win matters. Every one counts.');
  } else {
    // GRACE AFTER A RELAPSE — this is the moment that decides whether someone stays or deletes the
    // app. No shame, no "streak lost" framing. The companion meets them at their lowest in its
    // gentlest voice: one day doesn't erase the road, coming back honestly is the strength.
    haptic('warning');
    setTimeout(()=>{ _graceAfterRelapse(v && v.n); }, 250);
  }
}
// The very first win, ever — a genuine moment. First impressions decide whether someone believes
// this app is different. Shown once, then never again.
function _celebrateFirstWin(){
  const name = ls('totry_name') || '';
  const m = document.createElement('div');
  m.className = 'modal-bg open'; m.style.alignItems='center';
  m.innerHTML = '<div class="modal" style="text-align:center">'+
    '<div style="font-size:34px;margin-bottom:10px">\uD83C\uDF31</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:25px;color:var(--tx);line-height:1.3;margin-bottom:10px">Your first one'+(name?', '+name:'')+'.</div>'+
    '<div style="font-size:14px;color:var(--tx2);line-height:1.7;margin-bottom:20px">This is the one that matters most \u2014 not because it\u2019s the hardest, but because it\u2019s the proof that you can. Every road starts with a single honest step, and you just took it. I\u2019ll be here for the next one, and the one after that.</div>'+
    '<button class="btn primary" onclick="closeModal(this)">This is the beginning</button>'+
    '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('celebrate');
}
// The gentlest possible response to a slip. A short, warm, faith-aware moment — never a lecture.
function _graceAfterRelapse(viceName){
  const name = ls('totry_name') || '';
  const m = document.createElement('div');
  m.className = 'modal-bg open'; m.style.alignItems='center';
  m.innerHTML = '<div class="modal" style="text-align:center">'+
    '<div style="font-size:30px;margin-bottom:10px">\uD83C\uDF3F</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.3;margin-bottom:10px">'+(name?name+', this':'This')+' is not the end of anything.</div>'+
    '<div style="font-size:14px;color:var(--tx2);line-height:1.7;margin-bottom:20px">One day doesn\u2019t erase the road you\u2019ve walked. What matters most just happened: you came back and you were honest. That\u2019s not weakness \u2014 that\u2019s the exact strength this is built on. Grace is new every morning, and so are you.</div>'+
    '<button class="btn primary" onclick="closeModal(this)" style="margin-bottom:8px">Thank you. I\u2019m back.</button>'+
    '<button class="btn" onclick="closeModal(this);openCompanionForUrge()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);margin-bottom:8px">Sit with me a moment</button>'+
    '<button class="btn" onclick="_lifeHappenedNotSlip('+(typeof curVice!=='undefined'?curVice:-1)+');closeModal(this)" style="background:none;border:none;color:var(--tx3);font-size:12px;line-height:1.5">Honestly, this was circumstance, not a slip \u2014 don\u2019t reset me</button>'+
    '</div>';
  document.body.appendChild(m);
}
// "Life happens" — for when a reset isn't honest (illness, an impossible day). Undoes the streak
// reset the relapse flow just applied, records it as a protected day instead of a relapse. Used
// sparingly by design (it's tucked in the grace moment, not a one-tap dodge on the card).
function _lifeHappenedNotSlip(i){
  if(i==null || i<0) return;
  loadV();
  const v = vices[i]; if(!v) return;
  // Undo the reset the relapse just did: restore the prior streak and roll back the relapse count.
  if(v.relapseHistory && v.relapseHistory.length){
    const last = v.relapseHistory.pop();
    if(last && typeof last.streakLength === 'number'){
      // restore startDate to (now - priorStreak days) so the streak continues unbroken
      v.startDate = new Date(Date.now() - last.streakLength*86400000).toISOString();
      v.cleanDaysTotal = Math.max(0, (v.cleanDaysTotal||0) - last.streakLength);
    }
  }
  v.relapseCount = Math.max(0, (v.relapseCount||0) - 1);
  if(typeof addFreeze==='function') addFreeze('life happens');
  saveV();
  renderVices(); if(typeof renderScoreboard==='function') renderScoreboard(); if(typeof renderDayCounter==='function') renderDayCounter();
  if(typeof syncToCloud==='function') syncToCloud();
  showToast('Streak protected \uD83C\uDF3F','Life happens. Your road stands. Rest, and keep walking tomorrow.');
}
// Pattern intelligence: reads the fight log for ONE vice and finds its risky windows,
// top triggers, and a win-rate trend. Pure local computation, no AI cost. Consent-gated.
// The one place time-of-day gets bucketed into a risk window. Shared so the proactive greeting that
// meets him in his hard hour uses the EXACT same blocks the pattern engine learned from.
function _viceBlockLabel(h){
  if(h<6) return 'late night (12-6am)'; if(h<12) return 'morning (6am-12pm)';
  if(h<17) return 'afternoon (12-5pm)'; if(h<21) return 'evening (5-9pm)'; return 'night (9pm-12am)';
}
function analyzeUrgePatterns(viceName){
  const log = (ls('totry_fight_log') || []).filter(e => e && e.vice === viceName && e.ts);
  if(log.length < 4) return null; // not enough to be honest about
  // Risk window: bucket by 3-hour blocks, find the heaviest
  const blocks = {}; const blockLabel = _viceBlockLabel;
  const dayCount = {};
  const triggers = {};
  let wins = 0;
  log.forEach(e => {
    const d = new Date(e.ts); const h = d.getHours();
    const bl = blockLabel(h); blocks[bl] = (blocks[bl]||0)+1;
    const dn = d.toLocaleDateString('en-AU',{weekday:'long'}); dayCount[dn] = (dayCount[dn]||0)+1;
    if(e.trigger){ const t = e.trigger.toLowerCase().trim(); if(t) triggers[t] = (triggers[t]||0)+1; }
    if(e.won) wins++;
  });
  const topBlock = Object.entries(blocks).sort((a,b)=>b[1]-a[1])[0];
  const topDay = Object.entries(dayCount).sort((a,b)=>b[1]-a[1])[0];
  const topTrigger = Object.entries(triggers).sort((a,b)=>b[1]-a[1])[0];
  // win-rate: recent half vs older half
  const half = Math.floor(log.length/2);
  const recent = log.slice(0, half), older = log.slice(half);
  const rwr = recent.length ? Math.round(recent.filter(e=>e.won).length/recent.length*100) : null;
  const owr = older.length ? Math.round(older.filter(e=>e.won).length/older.length*100) : null;
  return {
    total: log.length,
    winRate: Math.round(wins/log.length*100),
    trend: (rwr!=null && owr!=null) ? (rwr>owr+5?'improving':rwr<owr-5?'slipping':'steady') : null,
    riskWindow: topBlock ? topBlock[0] : null,
    riskDay: (topDay && topDay[1] >= 2) ? topDay[0] : null,
    topTrigger: (topTrigger && topTrigger[1] >= 2) ? topTrigger[0] : null
  };
}

// Renders the insight card on the Fight screen for consented vices.
// Turn a named pattern into a concrete way OUT. Based on relapse-prevention: stimulus control
// (change the environment that cues the urge) + if-then implementation intentions (pre-decide the
// response so willpower isn't needed in the moment) + competing response. A brother's practical plan.
function _overridePlan(p){
  if(!p) return '';
  const bits = [];
  // Risk window → pre-plan that time so the urge meets a wall already built.
  if(p.riskWindow){
    const w = p.riskWindow.toLowerCase();
    if(/late night|night|9pm|12-6/.test(w)){
      bits.push('Your hardest hours are late. Decide NOW what those hours look like \u2014 phone charging in another room before then, a set wind-down, somewhere to be that isn\u2019t alone with a screen. Don\u2019t leave the decision for the moment the pull is strongest; make it now, when you\u2019re clear.');
    } else if(/morning/.test(w)){
      bits.push('Mornings are your edge. Set the first 20 minutes before you even open your eyes \u2014 get up, light, water, move, a verse \u2014 so the day starts with momentum, not a vacuum the urge can fill.');
    } else if(/afternoon/.test(w)){
      bits.push('The afternoon dip is your window. Pre-plan a reset for that time \u2014 a walk, a real break, food and water \u2014 so the slump doesn\u2019t become the opening.');
    } else if(/evening/.test(w)){
      bits.push('Evenings are when it comes. Build that time on purpose \u2014 plan what you\u2019re doing and who you\u2019re near, so the hours aren\u2019t empty for it to creep into.');
    }
  }
  // Trigger → name the if-then. "If [trigger], then [pre-decided response]."
  if(p.topTrigger){
    bits.push('When <b style="color:var(--tx)">'+p.topTrigger+'</b> shows up, that\u2019s the cue. Decide your one move ahead of time \u2014 the instant it hits, you DO that (step outside, cold water, text someone, open this app) before the thinking starts. Pre-deciding is how you win when willpower\u2019s thin.');
  }
  if(!bits.length){
    bits.push('Keep logging the moments \u2014 the more I see, the more exactly I can help you get ahead of it. And remember the pattern isn\u2019t a verdict, it\u2019s a map.');
  }
  // Always close pointing slightly beyond the tactics — this is a fight worth real support, not just tricks.
  bits.push('And if this keeps winning no matter what you try, that\u2019s not failure \u2014 it\u2019s a sign to bring a real person in. You don\u2019t have to carry it alone.');
  return bits.join('<br><br>');
}

// THE BRIDGE TO REAL HELP. To Try is a tool for men who feel voiceless — not a replacement for real
// people. When something feels bigger than a tool should hold, the brother's job is to hand a man
// toward real help and make that feel like STRENGTH, not failure or shame. Faith-aware: a priest and
// confession are real help too. This is the soul of knowing our own limits — never positioning the
// app as the whole plan. Any screen can call this.
// Faith intensity — 'full' (default) or 'light'. Never removes faith; just dials how much surfaces,
// so a man of any belief is met where he is. The verse pill and auto-scripture honor this.
// WHICH tradition the person follows — swaps the sacred text, the daily verse, the voice, and (as the
// Soul tab readers roll out) the "today" anchor and the practice. Distinct from setFaithLevel (how MUCH
// surfaces). Default christianity preserves the app as built; a person of any path or none is met here.
function setFaithTradition(tr){
  if(!FAITHS[tr]) tr='secular';
  ls('totry_faith_tradition', tr);
  try{
    document.querySelectorAll('.faithtr-opt').forEach(b=>{
      const on = b.dataset.tr===tr;
      b.style.borderColor = on ? 'var(--go)' : 'var(--bd)';
      b.style.background = on ? 'rgba(200,169,110,0.10)' : 'var(--bg3)';
    });
  }catch(_){}
  try{ if(typeof applyFaithLabels==='function') applyFaithLabels(); }catch(_){}
  try{ if(typeof applyFaithGlobal==='function') applyFaithGlobal(); }catch(_){}
  // Refresh the daily verse immediately so the pill shows the new tradition's scripture.
  try{ if(typeof pickDailyContextualVerse==='function'){ vi = pickDailyContextualVerse(); } if(typeof showV==='function') showV(activeVerses()[vi]); }catch(_){}
  const f = FAITHS[tr];
  if(typeof showToast==='function') showToast('Path set', 'Your daily '+f.scriptureWord+' and the companion’s voice now follow '+f.label+'.');
}
function setFaithLevel(level){
  ls('totry_faith_level', level);
  try{
    document.querySelectorAll('.faith-opt').forEach(b=>{
      const on = b.dataset.faith===level;
      b.style.borderColor = on ? 'var(--go)' : 'var(--bd)';
      b.style.background = on ? 'rgba(200,169,110,0.10)' : 'var(--bg3)';
    });
  }catch(_){}
  if(typeof showToast==='function') showToast('Saved', level==='light' ? 'Scripture will surface more gently.' : 'Faith woven through, as built.');
  // Refresh the home verse visibility immediately if we're on home.
  try{ const vp=document.querySelector('.hero-verse'); if(vp) vp.style.display = (level==='light') ? 'none' : ''; }catch(_){}
}
// Intensity is a separate dial from tradition. An unchosen person is now SECULAR rather than
// Christian-at-light, so they get the full secular experience — grounded and complete — instead of a
// thinned version of someone else's faith.
function faithLevel(){ return ls('totry_faith_level') || 'full'; }
function setUserSex(sex){
  ls('totry_sex', sex);
  try{ document.querySelectorAll('.sex-opt').forEach(b=>{ const on=b.dataset.sex===sex; b.style.borderColor=on?'var(--go)':'var(--bd)'; b.style.background=on?'rgba(200,169,110,0.10)':'var(--bg3)'; }); }catch(_){}
  if(typeof showToast==='function') showToast('Saved', 'Your targets and guidance will reflect this.');
}


// ── WIND-DOWN & MORNING LIGHT ─────────────────────────────────────────────────────────────────
// Sleep already speaks (getLifeState().sleep) but nothing yet HELPS. These are the two cheapest
// evidence-backed levers there are, and both are on-thesis: the wind-down is a first-line insomnia
// treatment whose final instruction is to put the phone down and leave the room, and morning light
// is worth 10-50x avoiding evening screens for resetting the clock. No sleep score, ever.
function openWindDown(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const t=(typeof faithTradition==='function')?faithTradition():'secular';
  const soft=(typeof faithLevel==='function') && faithLevel()==='light';
  const close={christianity:'Commend the day to God \u2014 the good and the botched \u2014 and let Him hold it while you sleep.',
               islam:'Say what you say before sleep, and leave the day with Allah. It is out of your hands now.',
               hinduism:'Set the day down. What is done is done; let it dissolve.',
               buddhism:'Let the day go as it is \u2014 unfinished, imperfect, impermanent. Nothing to hold onto.',
               secular:'Set the day down. It is finished, whether or not it went well.'}[t] || 'Set the day down.';
  const steps=[
    ['\u{1F4F5}','Phone out of the bedroom','This is the whole thing. Each hour of screen time in bed raises the odds of insomnia by well over half \u2014 not the blue light, the being-awake-with-it.'],
    ['\u{1F576}','Lights down, not off','Dim what you can. You are telling your body the day is over, and it believes lighting more than it believes you.'],
    ['\u{1F4DD}','One line: where you stopped','If your mind is still working, write the next step down and let it stop guarding it. That is what frees you \u2014 not finishing.'],
    [soft?'\u{1F319}':'\u{1F64F}', soft?'One slow minute':'One line to close it', close]
  ];
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.3;margin-bottom:8px">Land the day.</div>'+
    '<div style="text-align:center;font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:16px">Four small things, same order every night. It works by repetition, not willpower \u2014 your body learns the sequence and starts winding down before you do.</div>'+
    steps.map(function(x){ return '<div style="display:flex;gap:11px;align-items:flex-start;margin-bottom:11px">'+
      '<div style="font-size:18px;flex-shrink:0;width:26px;text-align:center">'+x[0]+'</div>'+
      '<div style="flex:1"><div style="font-size:13.5px;color:var(--tx);margin-bottom:2px">'+x[1]+'</div>'+
      '<div style="font-size:12px;color:var(--tx3);line-height:1.55">'+x[2]+'</div></div></div>'; }).join('')+
    '<button class="btn primary" style="margin-top:6px" onclick="closeModal(this);openBreath(\'sleep\',{reason:\'winddown\'})">Breathe me down first</button>'+
    '<button class="btn" style="margin-top:8px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)" onclick="closeModal(this);theRelease({did:\'You landed the day on purpose \u2014 and the phone is going down with it.\'})">I\u2019m putting it down</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}

// ── THE RECOVERY BRIDGE — points beyond itself, properly ──────────────────────────────────────
// "Not a replacement for real help" is a stated non-negotiable, but the Fight had no warm hand-off to
// an actual recovery community. Several paths are offered because different people genuinely need
// different ones — the CHOICE itself is the autonomy that predicts follow-through (SDT). Never
// ranked, never "the app failed you", and the faith-based option only surfaces when faith is on.
function openRecoveryBridge(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const faithOn = (typeof faithLevel!=='function') || faithLevel()!=='light';
  const tr = (typeof faithTradition==='function') ? faithTradition() : 'secular';
  const opts = [
    ['\u{1F9ED}','SMART Recovery','Free meetings, online and in person. Science-based, secular, no higher power required — you are the agent of your own change.','https://smartrecovery.org/meetings/'],
    ['\u{1F91D}','AA / NA','The widest availability of anything on this list — a meeting most places, most nights. The higher power is yours to define.','https://www.aa.org/find-aa'],
    ['\u{1FA7A}','A GP or counsellor','The most underrated door. They have seen this a hundred times, it is confidential, and they can refer you on.',''],
    ['\u{1F4AC}','Someone who already knows','A sibling, a mate, a mentor. Saying it out loud to one person breaks most of its power — that is not a cliche, it is the mechanism.','']
  ];
  if(faithOn && tr==='christianity') opts.splice(2,0,['\u271D','Celebrate Recovery','Christ-centred twelve steps, in a church, with people who will not flinch. Free.','https://locator.crgroups.info/']);
  if(faithOn && tr!=='christianity' && tr!=='secular') opts.splice(2,0,['\u{1F54C}','Your community','An imam, a priest, a monk, an elder — someone in your own tradition who has walked beside people through this.','']);
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="max-height:88vh;overflow-y:auto"><div class="modal-handle"></div>'+
    '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:24px;color:var(--tx);line-height:1.3;margin-bottom:8px">People who do this properly.</div>'+
    '<div style="text-align:center;font-size:12.5px;color:var(--tx3);line-height:1.6;margin-bottom:16px">I am a tool, and a tool is not enough on its own. None of these is better than the others — different people need different rooms. Pick whichever you would actually walk into.</div>'+
    opts.map(function(o){
      const link=o[3]?(' <a href="'+o[3]+'" target="_blank" rel="noopener" style="color:var(--go);text-decoration:none">find one \u2192</a>'):'';
      return '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:13px 15px;margin-bottom:9px">'+
        '<div style="font-size:14px;color:var(--tx);margin-bottom:3px">'+o[0]+'&nbsp;&nbsp;'+o[1]+'</div>'+
        '<div style="font-size:12px;color:var(--tx2);line-height:1.6">'+o[2]+link+'</div></div>';
    }).join('')+
    '<div style="font-size:11.5px;color:var(--tx3);line-height:1.6;margin:6px 0 14px;text-align:center">Going does not mean this stopped working. It means you took it seriously enough to bring someone real into it.</div>'+
    '<button class="btn primary" onclick="closeModal(this)">Okay</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}

// ── THE SERVICE EXIT — the fastest documented way out of a self-referential loop ───────────────
// Self-transcendence research: doing one small thing for someone else breaks the inward spiral a
// craving runs on, faster than trying to think your way out of it. Faith-congruent (James 2) and
// fully coherent secularly as contribution. Ends off the phone, like every other exit here.
const _SERVICE_ACTS = [
  ['\u{1F4AC}','Send the message you keep meaning to send','Someone is wondering how you are. Thirty seconds.'],
  ['\u{1F9F9}','Do one thing that helps whoever you live with','Unasked. They will notice, and you will feel it before they do.'],
  ['\u{1F4DE}','Ring the person who would be glad to hear from you','Not to talk about this. Just to talk.'],
  ['\u{1F4B7}','Give something small away','A coffee, a tenner, an hour. Generosity turns the camera around.'],
  ['\u{1F64F}','Hold someone else for a minute','Someone you know is having a harder week than you. Carry them for sixty seconds.']
];
function openServiceExit(){
  document.querySelectorAll('.modal-bg.open').forEach(function(m){ m.remove(); });
  const day=(typeof getDayCount==='function')?getDayCount():0;
  const a=_SERVICE_ACTS[day%_SERVICE_ACTS.length];
  const m=document.createElement('div'); m.className='modal-bg open'; m.style.alignItems='center';
  m.innerHTML='<div class="modal" style="text-align:center"><div class="modal-handle"></div>'+
    '<div style="font-size:28px;margin-bottom:8px">'+a[0]+'</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);line-height:1.3;margin-bottom:10px">'+a[1]+'</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:8px">'+a[2]+'</div>'+
    '<div style="font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:18px">An urge points you inward, at yourself. The quickest way out is not to think harder about it \u2014 it is to turn and do one small thing for someone else.</div>'+
    '<button class="btn primary" style="margin-bottom:8px" onclick="closeModal(this);theRelease({did:\'You turned outward instead of inward \u2014 and did something real for someone else.\'})">I\u2019m doing it</button>'+
    '<button class="btn" onclick="closeModal(this);openServiceExit()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);font-size:12.5px;margin-bottom:8px">Give me another</button>'+
    '<button class="btn" onclick="closeModal(this);openDEADS()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2);margin-bottom:8px;font-size:13px">\u{1F5FA} Five ways through \u2014 pick one</button>'+
    '<button class="btn" onclick="closeModal(this)" style="background:transparent;border:none;color:var(--tx3);font-size:12px">Not now</button>'+
  '</div>';
  document.body.appendChild(m);
  if(typeof haptic==='function') haptic('tap');
}

function bridgeToRealHelp(reason){
  try{
    const name = ls('totry_name') || '';
    let lead = 'This might be bigger than a tool should carry on its own \u2014 and that\u2019s not failure, it\u2019s wisdom.';
    if(reason==='persistent') lead = 'You\u2019ve been fighting this a while, and it keeps coming back hard. That\u2019s not weakness in you \u2014 it\u2019s a sign this deserves a real person beside you, not just an app.';
    if(reason==='heavy') lead = 'What you\u2019re carrying sounds heavy'+(name?', '+name:'')+'. I\u2019m here, but I\u2019m a tool \u2014 and you deserve more than a tool for this.';

    const m = document.createElement('div');
    m.className='modal-bg open'; m.style.alignItems='center';
    m.innerHTML = '<div class="modal" style="text-align:left">'+
      '<div style="text-align:center;font-size:26px;margin-bottom:8px">\uD83E\uDD1D</div>'+
      '<div style="text-align:center;font-family:Cormorant Garamond,serif;font-size:23px;color:var(--tx);line-height:1.3;margin-bottom:12px">You don\u2019t have to carry this alone</div>'+
      '<div style="font-size:13.5px;color:var(--tx2);line-height:1.7;margin-bottom:16px">'+lead+' Reaching for a real person is one of the strongest things you can do \u2014 it\u2019s what the strongest people do.</div>'+
      '<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:10px">'+
        '<div style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">Real people who can help</div>'+
        '<div style="font-size:13px;color:var(--tx2);line-height:1.9">'+
          '\u2022 <b style="color:var(--tx)">Someone you trust</b> \u2014 a sibling, a friend, a mentor. Even just saying it out loud to one person breaks its power.<br>'+
          '\u2022 <b style="color:var(--tx)">A priest</b> \u2014 confession and a real conversation. Grace you can\u2019t get from a screen.<br>'+
          '\u2022 <b style="color:var(--tx)">A counsellor or your GP</b> \u2014 this is exactly what they\u2019re there for. No shame in it.<br>'+
          '\u2022 <b style="color:var(--tx)">A helpline</b> \u2014 if you need someone right now, see Settings for lines in your country.'+
        '</div>'+
      '</div>'+
      '<div style="font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:16px;text-align:center">I\u2019ll still be here, walking it with you. Someone who has got you points you to real help \u2014 they don\u2019t pretend to be all of it.</div>'+
      '<button class="btn" onclick="closeModal(this);openRecoveryBridge()" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx);margin-bottom:8px">Show me actual meetings and people</button>'+
      '<button class="btn primary" onclick="closeModal(this)">Okay</button>'+
      '</div>';
    document.body.appendChild(m);
    if(typeof haptic==='function') haptic('tap');
  }catch(_){}
}

function renderUrgeInsights(){
  const box = document.getElementById('urge-insights');
  if(!box) return;
  loadV();
  const tracked = (vices||[]).filter(v => v.trackPatterns);
  if(!tracked.length){
    // Discoverable mirror: if an untracked vice already has enough logged battles for a real pattern,
    // gently offer it (never forced on — the man chooses to look).
    const ready = (vices||[]).filter(v => !v.trackPatterns && analyzeUrgePatterns(v.n));
    if(ready.length){
      box.innerHTML = ready.map(function(v){ const idx=vices.indexOf(v);
        return '<div style="margin-bottom:8px;padding:12px 14px;background:var(--bg3);border:1px solid var(--go-bd);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:10px"><div style="font-size:12.5px;color:var(--tx2);line-height:1.5">There’s a pattern in your <b style="color:var(--tx)">'+_esc(v.n)+'</b> battles — when it hits hardest, and how to get ahead of it.</div><button onclick="toggleVicePatterns('+idx+')" style="flex-shrink:0;padding:8px 13px;border-radius:100px;border:1px solid var(--go-bd);background:var(--go-bg);color:var(--go);font-size:12px;cursor:pointer">Show me</button></div>';
      }).join('');
      box.style.display='block'; return;
    }
    box.style.display='none'; return;
  }
  let html = '';
  tracked.forEach(v => {
    const p = analyzeUrgePatterns(v.n);
    if(!p){
      html += '<div style="margin-bottom:10px;padding:12px;background:var(--bg3);border-radius:10px;font-size:12px;color:var(--tx3);line-height:1.5">Tracking <b style="color:var(--tx2)">'+_escFew(v.n)+'</b> — log a few more battles and your patterns will show here.</div>';
      return;
    }
    const trendColor = p.trend==='improving'?'var(--gr)':p.trend==='slipping'?'var(--re)':'var(--tx2)';
    // A pattern named without a way out just makes a man feel doomed. So every pattern comes WITH a
    // concrete, evidence-based override — what to actually DO to break this specific loop. The mirror
    // shows the wound AND how to heal it.
    const override = _overridePlan(p);
    html += '<div style="margin-bottom:10px;padding:14px;background:var(--bg3);border:1px solid var(--bd);border-radius:10px">'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:17px;color:var(--go);font-style:italic;margin-bottom:8px">'+_escFew(v.n)+' — your patterns</div>'+
      '<div style="font-size:12px;color:var(--tx2);line-height:1.7">'+
        (p.riskWindow?'Hardest time: <b style="color:var(--tx)">'+p.riskWindow+'</b>'+(p.riskDay?', especially <b style="color:var(--tx)">'+p.riskDay+'s</b>':'')+'.<br>':'')+
        (p.topTrigger?'Most common trigger: <b style="color:var(--tx)">'+p.topTrigger+'</b>.<br>':'')+
        'Win rate: <b style="color:'+trendColor+'">'+p.winRate+'%</b>'+(p.trend?' ('+p.trend+')':'')+' over '+p.total+' battles.'+
      '</div>'+
      (override ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd)"><div style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">How to get ahead of it</div><div style="font-size:12px;color:var(--tx2);line-height:1.7">'+override+'</div></div>' : '')+
      '</div>';
  });
  box.innerHTML = html;
  box.style.display = 'block';
}

// "Play the tape forward" — a CBT urge-surfing technique: picture BOTH paths fully
// before choosing. Uses the user's own \u201cwhy\u201d if they wrote one.
function playTheTape(){
  const box = document.getElementById('sos-tape');
  if(!box) return;
  const why = (ls('totry_why') || '').trim();
  box.innerHTML =
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px">Both paths \u2014 look before you choose</div>'+
    // The honest cost, not a threat. Dangling a counter reset ("you'll lose your streak") is the
    // shame lever this app exists to break \u2014 and the evidence is that it makes the next slip MORE
    // likely, not less. So: name what's actually true about each path, and let them choose freely.
    '<b style="color:var(--re)">If you give in:</b> the relief is real, and it\u2019s short \u2014 minutes. Then the wanting comes back a little louder than before, because that\u2019s how it grows. Nothing is destroyed and nothing resets; you just haven\u2019t moved.<br><br>'+
    '<b style="color:var(--gr)">If you hold on:</b> the urge peaks and passes \u2014 it always does, usually within 20 minutes. And riding it out is the rep: each one you sit through makes the next one quieter. That\u2019s not willpower, it\u2019s practice \u2014 and it counts whether or not anyone sees it.'+
    (why ? '<br><br><span style="color:var(--go)">Remember why you started:</span><br>\u201c'+why.replace(/</g,'&lt;').slice(0,220)+'\u201d' : '')+
    // Their OWN ledger, in their OWN words — the whole reason it was worth writing down. A reason
    // written while clear beats anything the app could say while they are not. playTheTape() has no
    // vice index, so resolve the one they're actually fighting: a single vice, or the most recent.
    (function(){
      try{
        if(typeof loadV==='function') loadV();
        const vs=(typeof vices!=='undefined'&&Array.isArray(vices))?vices.filter(function(v){return v&&v.cba;}):[];
        if(!vs.length) return '';
        const _c=vs.sort(function(a,b){ return new Date(b.cba.ts||0)-new Date(a.cba.ts||0); })[0].cba;
        let out='';
        if(_c.cost) out+='<br><br><span style="color:var(--re)">What you said it costs you:</span><br>\u201c'+String(_c.cost).replace(/</g,'&lt;').slice(0,200)+'\u201d';
        if(_c.free) out+='<br><br><span style="color:var(--gr)">What free looks like, in your words:</span><br>\u201c'+String(_c.free).replace(/</g,'&lt;').slice(0,180)+'\u201d';
        return out;
      }catch(_){ return ''; }
    })()+
    '<br><br><b style="color:var(--tx)">Which version of tomorrow do you want?</b>'+
    // The runway they traced in the calm. Same resolution problem as the ledger above: no index here,
    // so take the vice whose walk-back is newest. This is the half of the walk-back that was missing —
    // it has been collecting chains since v354 and showing them nowhere.
    (function(){
      try{
        if(typeof _walkBackAtThreshold!=='function') return '';
        const vs=(typeof vices!=='undefined'&&Array.isArray(vices))?vices.filter(function(v){return v&&Array.isArray(v.walkbacks)&&v.walkbacks.length;}):[];
        if(!vs.length) return '';
        const v=vs.sort(function(a,b){ return new Date(b.walkbacks[0].ts||0)-new Date(a.walkbacks[0].ts||0); })[0];
        return _walkBackAtThreshold(v);
      }catch(_){ return ''; }
    })();
  box.style.display = 'block';
  box.scrollIntoView({block:'center', behavior:'smooth'});
  haptic('tap');
}

async function fetchSosVerse(i){
  loadV();const v=vices[i];
  const pb=getVicePlaybook(v);
  // BIBLE_SYS is "You are a Bible scholar and pastoral counsellor" — asking it on behalf of a Muslim,
  // Hindu, Buddhist or secular person is both wrong and a wasted paid call. Their anchor comes from
  // their own tradition set in _sosAnchor().
  try{ if(typeof faithTradition==='function' && faithTradition() !== 'christianity') return; }catch(_){}
  try{
    const prompt='Someone is fighting an urge for "'+v.n+'" (category: '+pb.label+'). It usually hits when: '+v.t+'. Find the single most relevant ESV verse for resisting THIS specific kind of temptation right now. A strong default for this category is '+pb.verseRef+', but choose what fits best.';
    const raw=await api(BIBLE_SYS,[],prompt,900);
    if(raw){const m=raw.match(/\{[\s\S]*?\}/);if(m){const d=JSON.parse(m[0]);if(d.verse&&d.reference&&d.verse.length>15)sosVerseData=d;}}
  }catch(e){}
}
// ═══════════════════════════════════════════════════════════════════
// "I'M FEELING IT RIGHT NOW" — the soul of the app.
// Built around the FEELING, not the slip. You don't have to categorise or admit you failed —
// the moment something rises (urge, craving, heaviness, all at once), you tap, say how you feel
// in your own words (or one tap), and the app immediately pulls you OUT of the moment: grounding,
// your own prayer, a personal AI redirect shaped by what you said, a reminder of what's at stake
// and who you're becoming, and a logged win for getting through it. One tap from anywhere, anytime.
// ═══════════════════════════════════════════════════════════════════
// Shows how many times the user reached for help the moment a feeling rose and got through it —
// real-time wins, the heart of the reshaped fight. Surfaces gently on the Fight tab; this week
// emphasised so it feels alive, not a vanity total.
function renderFeelingWinsMomentum(){
  const el = document.getElementById('feeling-wins-momentum');
  if(!el) return;
  const wins = ls('totry_feeling_wins') || [];
  if(!wins.length){ el.style.display='none'; return; }
  const since = Date.now() - 7*86400000;
  const weekCount = wins.filter(w => w.ts && new Date(w.ts).getTime() >= since).length;
  const total = wins.length;
  el.style.display='block';
  el.innerHTML =
    '<div style="padding:14px;background:linear-gradient(135deg,rgba(200,169,110,0.12),rgba(140,107,182,0.08));border:1px solid var(--go-bd);border-radius:12px;margin-bottom:14px">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Times you chose yourself</div>'+
      '<div style="display:flex;align-items:baseline;gap:10px">'+
        '<div style="font-size:30px;font-family:Cormorant Garamond,serif;color:var(--tx)">'+(weekCount||total)+'</div>'+
        '<div style="font-size:13px;color:var(--tx2);line-height:1.4">'+(weekCount?('time'+(weekCount===1?'':'s')+' this week you felt it and didn\u2019t give in.'):(total+' time'+(total===1?'':'s')+' in all \u2014 every one counts.'))+'</div>'+
      '</div>'+
    '</div>';
}
function openFeelingNow(){
  document.querySelector('.modal-bg.open')?.remove();
  const m=document.createElement('div');
  m.className='modal-bg open';
  m.id='feelingnow-modal';
  m.innerHTML='<div class="modal" style="max-height:94vh;overflow-y:auto">'+
    '<div class="modal-handle"></div>'+
    '<div id="feelingnow-body"></div>'+
  '</div>';
  document.body.appendChild(m);
  _feelingNowStep1();
}
// Step 1 — name the feeling. No vice list, no judgment. Free text OR one-tap common feelings.
function _feelingNowStep1(){
  const b=document.getElementById('feelingnow-body'); if(!b) return;
  b.innerHTML=
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;font-style:italic;color:var(--tx);margin-bottom:6px">You\u2019re here. That\u2019s the hardest part.</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:16px">What are you feeling right now? Say it however it comes \u2014 no need to make it neat.</div>'+
    '<textarea id="feelingnow-input" placeholder="e.g. I want to gamble / I\u2019m so horny I can\u2019t think / everything at once and I just want to numb it..." style="min-height:80px;margin-bottom:10px"></textarea>'+
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">'+
      '<button class="ftag" onclick="_feelingQuick(\'the urge to gamble\')">Gambling</button>'+
      '<button class="ftag" onclick="_feelingQuick(\'lust / feeling unbearably horny\')">Lust</button>'+
      '<button class="ftag" onclick="_feelingQuick(\'the urge to smoke weed\')">Weed</button>'+
      '<button class="ftag" onclick="_feelingQuick(\'the urge to smoke a cigarette\')">Cigarettes</button>'+
      '<button class="ftag" onclick="_feelingQuick(\'everything all at once, I just want to numb it\')">Everything at once</button>'+
      '<button class="ftag" onclick="_feelingQuick(\'low and heavy\')">Heavy / low</button>'+
    '</div>'+
    '<button class="btn primary" style="padding:15px" onclick="_feelingNowGo()">Help me through it</button>'+
    '<button class="btn" onclick="document.getElementById(\'feelingnow-modal\')?.remove()" style="background:none;border:none;color:var(--tx3);font-size:12px;margin-top:8px">I\u2019m okay now</button>';
  setTimeout(()=>{ try{ document.getElementById('feelingnow-input').focus(); }catch(_){ } }, 200);
}
function _feelingQuick(text){
  const inp=document.getElementById('feelingnow-input');
  if(inp){ inp.value = inp.value ? (inp.value+', '+text) : text; }
}
// Step 2 — immediate grounding + your prayer, shown INSTANTLY (no waiting on AI), while the
// personalised redirect generates in the background.
async function _feelingNowGo(){
  const feeling=(document.getElementById('feelingnow-input')||{}).value || '';
  const b=document.getElementById('feelingnow-body'); if(!b) return;
  // SAFETY GATE — this is the app's most-invited disclosure ("everything at once and I just want to
  // numb it") and it was the ONE free-text path to the LLM without a gate. The system prompt here is
  // deliberately fierce ("refuse to let them lose") — the worst possible voice to answer someone
  // saying they don't want to be here. Gate BEFORE window.__feelingNowText is set, so a disclosure is
  // never later written into totry_feeling_wins as a "win".
  try{
    if(typeof detectCrisis==='function'){
      const _c = detectCrisis(feeling);
      if(_c){
        b.innerHTML = '<div id="fn-crisis-slot"></div>'+
          '<button class="btn" style="margin-top:10px" onclick="document.querySelectorAll(\'.modal-bg\').forEach(function(m){m.remove();})">Close</button>';
        if(typeof showCrisisResponse==='function') showCrisisResponse('fn-crisis-slot', _c);
        return;
      }
    }
  }catch(_){}
  window.__feelingNowText = feeling.trim();
  // Your actual ritual prayer, hand on heart — the thing that locks you in.
  b.innerHTML=
    '<div style="text-align:center;padding:8px 0 4px">'+
      '<div id="feelingnow-breath" style="width:120px;height:120px;border-radius:50%;margin:0 auto 18px;background:radial-gradient(circle,rgba(200,169,110,0.25),rgba(140,107,182,0.08));border:1px solid var(--go-bd);display:flex;align-items:center;justify-content:center;animation:fnBreathe 8s ease-in-out infinite">'+
        '<span style="font-size:11px;color:var(--go);font-family:DM Mono,monospace;letter-spacing:0.1em">breathe</span>'+
      '</div>'+
      // Each tradition's OWN practice for this moment — see _PULL_PRACTICE. Not a swapped phrase: the
      // name, the words, the posture and the count all come from the tradition the person chose, and
      // secular gets urge surfing with no religious framing at all.
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:8px">'+_escFew(_fnPractice().name)+'</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;line-height:1.5;color:var(--tx);margin-bottom:10px">\u201C'+_escFew(_fnPractice().line)+'\u201D</div>'+
      '<div style="font-size:12.5px;color:var(--tx2);line-height:1.65;margin-bottom:8px">'+_escFew(_fnPractice().how)+'</div>'+
      '<div style="font-size:11px;color:var(--tx3);line-height:1.6;margin-bottom:16px;padding:0 4px">'+_escFew(_fnPractice().why)+'</div>'+
      '<div style="font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:18px">You only have to get through <span style="color:var(--go)">this</span> one moment \u2014 not forever.</div>'+
    '</div>'+
    '<div id="feelingnow-redirect" style="padding:14px;background:var(--bg3);border-radius:10px;margin-bottom:14px;min-height:60px">'+
      '<p class="pulsing" style="font-family:Cormorant Garamond,serif;font-style:italic;color:var(--tx3);text-align:center;font-size:14px">Sitting with you...</p>'+
    '</div>'+
    '<button class="btn primary" style="padding:15px" onclick="_feelingNowWon()">It\u2019s passing \u2014 I got through it</button>'+
    '<button class="btn" onclick="_feelingNowStillHard()" style="background:var(--bg3);border:1px solid var(--bd);margin-top:8px;font-size:13px">Still really hard</button>'+
    '<button class="btn" onclick="document.getElementById(\'feelingnow-modal\')?.remove()" style="background:none;border:none;color:var(--tx3);font-size:12px;margin-top:6px">Close</button>';
  haptic('light');
  // Generate the personal redirect in the background — shaped by exactly what they said + who they are.
  try{
    const name=(ls('totry_name')||'').trim();
    const identity=ls('totry_identity')||'';
    const sys=brotherSys() + 'RIGHT NOW they are in the EXACT moment a compulsion is hitting \u2014 help them resist it, this second. Fierce and loving, you refuse to let them lose. Short, direct, concrete. This is the hardest moment \u2014 be all the way in it with them.';
    const prompt='Right now, in this moment, they are feeling: "'+(feeling.trim()||'a strong urge, hard to name')+'".'+(name?' Their name is '+name+'.':'')+(identity?(' They are trying to become: "'+identity+'".'):'')+'\n\nWrite 3-4 short sentences that meet them in THIS feeling and pull them out of it \u2014 name what their body is doing, remind them this wave peaks and passes in minutes if they don\u2019t feed it, point them to one tiny physical thing to do in the next 60 seconds, and remind them of who they\u2019re becoming. No scripture quote (they already have their prayer). No lists. Talk straight to them.';
    const msg=await api(sys,[],prompt,500);
    const box=document.getElementById('feelingnow-redirect');
    if(box && msg && msg.trim()){
      box.innerHTML='<div style="font-size:14px;color:var(--tx);line-height:1.7">'+msg.trim().replace(/</g,'&lt;')+'</div>'+(typeof aiTag==='function'?aiTag():'');
    } else if(box){
      box.innerHTML='<div style="font-size:14px;color:var(--tx2);line-height:1.7">This wave is real, but it peaks and breaks within minutes if you don\u2019t feed it. Stand up. Walk to another room. Drink a full glass of water slowly. The feeling is not a command \u2014 you are still the one who chooses. Stay with the prayer.</div>';
    }
  }catch(e){
    const box=document.getElementById('feelingnow-redirect');
    if(box) box.innerHTML='<div style="font-size:14px;color:var(--tx2);line-height:1.7">This wave peaks and breaks within minutes if you don\u2019t feed it. Stand up, change rooms, drink water slowly. The feeling isn\u2019t a command. Stay with the prayer.</div>';
  }
}
// Still hard → escalate gently: remember what they're fighting for (their real "why") + the coach.
function _feelingNowStillHard(){
  const b=document.getElementById('feelingnow-body'); if(!b) return;
  // Use the user's own "why" — the words they wrote about who they're becoming / what they're
  // fighting for. Falls back to the feeling-specific cost note if that's all they've set.
  const why = ((ls('totry_why')||'').trim()) || ((ls('totry_feeling_cost')||'').trim());
  b.innerHTML=
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;color:var(--tx);margin-bottom:12px">Okay. Stay with me.</div>'+
    '<div style="font-size:14px;color:var(--tx2);line-height:1.7;margin-bottom:14px">Picture it honestly: if you give in right now, how do you feel in twenty minutes? You already know \u2014 the shame, the same hole, a bit deeper. This moment is the whole fight. Winning it once makes the next one easier.</div>'+
    (why
      ? ('<div style="padding:12px;background:rgba(200,169,110,0.08);border:1px solid var(--go-bd);border-radius:10px;font-size:14px;color:var(--tx);line-height:1.65;margin-bottom:14px;white-space:pre-wrap">This is what you\u2019re fighting for:\n\n'+why.replace(/</g,'&lt;')+'</div>')
      : ('<button class="btn" onclick="_feelingNowSetWhy()" style="background:var(--bg3);border:1px solid var(--go-bd);color:var(--go);margin-bottom:14px;font-size:13px">\u270d\ufe0f Write what you\u2019re fighting for</button>'))+
    '<button class="btn primary" style="padding:15px" onclick="document.getElementById(\'feelingnow-modal\')?.remove();openNeedTalk()">Talk to my Coach now</button>'+
    '<button class="btn" onclick="_feelingNowWon()" style="background:var(--bg3);border:1px solid var(--bd);margin-top:8px">It\u2019s passing \u2014 I got through it</button>'+
    '<button class="btn" onclick="_feelingNowStep1()" style="background:none;border:none;color:var(--tx3);font-size:12px;margin-top:6px">Back</button>';
  haptic('medium');
}
// Quick in-the-moment capture of "what you're fighting for" — saved to the same durable why the
// rest of the app uses, so it shows here and powers the coach and morning line too.
function _feelingNowSetWhy(){
  const b=document.getElementById('feelingnow-body'); if(!b) return;
  b.innerHTML=
    '<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-style:italic;color:var(--tx);margin-bottom:8px">What are you fighting for?</div>'+
    '<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:12px">In your own words. The people you love, the person you\u2019re becoming, what giving in costs you. The app will hold this in front of you when it\u2019s hard.</div>'+
    '<textarea id="feelingnow-why-input" placeholder="For my future family... / I\u2019m done letting myself down... / what gambling is costing me..." style="min-height:110px;margin-bottom:10px"></textarea>'+
    '<button class="btn primary" style="padding:14px" onclick="_feelingNowSaveWhy()">Save it</button>'+
    '<button class="btn" onclick="_feelingNowStillHard()" style="background:none;border:none;color:var(--tx3);font-size:12px;margin-top:6px">Back</button>';
  setTimeout(()=>{ try{ document.getElementById('feelingnow-why-input').focus(); }catch(_){ } }, 200);
}
function _feelingNowSaveWhy(){
  const v=((document.getElementById('feelingnow-why-input')||{}).value||'').trim();
  if(v){ ls('totry_why', v); if(typeof syncToCloud==='function') syncToCloud(); haptic('success'); }
  _feelingNowStillHard();
}
// Won — celebrate honestly, log it as a win across whatever vices the feeling maps to, no shame.
function _feelingNowWon(){
  const b=document.getElementById('feelingnow-body'); if(!b) return;
  // Record a generic "feeling win" for momentum, and tick a win on matching vices if any.
  try{
    const log=ls('totry_feeling_wins')||[];
    log.unshift({ ts:new Date().toISOString(), feeling:(window.__feelingNowText||'').slice(0,200) });
    ls('totry_feeling_wins', log.slice(0,500));
    if(typeof syncToCloud==='function') syncToCloud();
  }catch(_){ }
  b.innerHTML=
    '<div style="text-align:center;padding:16px 8px">'+
      '<div style="font-size:40px;margin-bottom:10px">\u2713</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:24px;font-style:italic;color:var(--tx);margin-bottom:10px">You just chose yourself.</div>'+
      '<div style="font-size:14px;color:var(--tx2);line-height:1.7;margin-bottom:18px">That\u2019s the whole thing, right there. Not forever \u2014 just now, this once. And you did it. The version of you they all see? That was you.</div>'+
    '</div>'+
    '<button class="btn primary" style="padding:15px" onclick="document.getElementById(\'feelingnow-modal\')?.remove();theRelease({did:\'You chose yourself — not forever, just now, this once. And you did it.\'})">Amen</button>';
  haptic('celebrate');
  if(typeof showVerseToast==='function') setTimeout(()=>showVerseToast('win','A word for your win'),700);
}
function showSosPhase(phase){
  [0,1,2,3,4].forEach(n=>{const el=document.getElementById('sos-p'+n);if(el)el.className='sos-phase'+(n===phase?' active':'');});
}
function setLocation(loc){
  sosLoc=loc;showSosPhase(1);
  loadV();
  const v = vices[curVice] || {};
  const pb = getVicePlaybook(v);
  const data=LOC[loc];
  // Lead with the vice-specific science-backed move; fall back to location actions.
  // This is what makes the response fit THIS vice, not a generic urge.
  let action;
  const useVice = pb && pb.actions && pb.actions.length;
  if(useVice){
    // In any public setting (people/work/class), lead with the discreet breathing tactic,
    // then the vice-specific move once they can step away.
    const publicSetting = (loc === 'people' || loc === 'work' || loc === 'class');
    if(publicSetting){
      action = { icon:'&#127788;', text: 'Breathe in 4, hold 4, out 6 — five times. Nobody will notice. Then, when you can, step away: ' + pb.firstMove };
    } else {
      const t = pb.actions[Math.floor(Math.random()*pb.actions.length)];
      action = { icon:'&#9889;', text: t };
    }
  } else {
    action = data.actions[Math.floor(Math.random()*data.actions.length)];
  }
  document.getElementById('sos-action-icon').innerHTML=action.icon;
  document.getElementById('sos-action-text').textContent=action.text;
  let secs=data.timer;
  const ring=document.getElementById('sos-timer-ring');
  const num=document.getElementById('sos-timer-num');
  if(ring)ring.style.strokeDashoffset='0';if(num)num.textContent=secs;
  if(sosTimerInt)clearInterval(sosTimerInt);
  sosTimerInt=setInterval(()=>{
    secs--;if(num)num.textContent=secs;
    if(ring)ring.style.strokeDashoffset=(276.46*(1-(secs/data.timer))).toFixed(2);
    if(secs<=0){clearInterval(sosTimerInt);goSosP2();}
  },1000);
}
// THE CRISIS SURFACE HAD NO FAITH GATE AT ALL.
// Step 2 of 3 handed a Bible verse — labelled "Receive the word" and stamped "(ESV)" — to a Muslim,
// Hindu, Buddhist or secular person mid-urge, with read-aloud and a shareable card attached. Both of its
// sources are Bible-only: the AI fetch uses BIBLE_SYS ("You are a Bible scholar..."), and the vice
// playbook's anchor is a Bible reference for every entry. And because faithTradition() DEFAULTS TO
// SECULAR, this was the default path — in direct contradiction of the app own secular voice contract:
// "Use NO religious language at all. Never mention God, scripture, or prayer."
//
// It breaks "faith is full but never forced" at the exact moment trust matters most. Nothing needed
// inventing: VS_CHRISTIANITY / VS_ISLAM / VS_HINDU / VS_BUDDHIST / VS_SECULAR already ship, and
// activeVerses() already resolves the right set for the person. The Bible-only sources are now used
// only for someone who is actually Christian.
const _SOS_P2_LBL = {
  christianity: 'Receive the word',
  islam:        'Receive the word',
  hinduism:     'Receive the teaching',
  buddhism:     'Receive the teaching',
  secular:      'Steady your mind'
};
function _sosAnchor(pb){
  try{
    const t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
    if(t === 'christianity'){
      return { text: (sosVerseData && sosVerseData.verse) || pb.verse,
               ref:  (sosVerseData && sosVerseData.reference) || (pb.verseRef + ' (ESV)') };
    }
    const set = (typeof activeVerses === 'function') ? activeVerses() : null;
    if(set && set.length){
      // Deterministic, so it does not reshuffle under someone mid-urge on a re-render, but still
      // varies day to day rather than being the same line forever.
      const i = (new Date().getDate() + (typeof curVice === 'number' ? curVice : 0)) % set.length;
      return { text: set[i].t, ref: set[i].r };
    }
  }catch(_){}
  // Last resort: the playbook line WITHOUT the (ESV) stamp, which is the part that presumes a tradition.
  return { text: pb.verse, ref: pb.verseRef };
}

function goSosP2(){
  if(sosTimerInt)clearInterval(sosTimerInt);showSosPhase(2);
  loadV();
  const v = vices[curVice] || {};
  const pb = getVicePlaybook(v);
  // Verse: prefer an AI-tailored one if fetched, else the vice-specific playbook verse
  // (always relevant to THIS vice, never a generic placeholder).
  const vt=document.getElementById('sos-verse-text');
  const vr=document.getElementById('sos-verse-ref');
  const _anchor = _sosAnchor(pb);
  if(vt)vt.textContent='\u201C'+_anchor.text+'\u201D';
  if(vr)vr.textContent='\u2014 '+_anchor.ref;
  try{
    const _lbl=document.getElementById('sos-p2-lbl');
    const _t=(typeof faithTradition==='function')?faithTradition():'secular';
    if(_lbl) _lbl.textContent='Step 2 of 3 \u2014 '+(_SOS_P2_LBL[_t] || _SOS_P2_LBL.secular);
  }catch(_){}
  // Listen / Make a card, now that there is a verse to listen to.
  try{
    const vtools=document.getElementById('sos-verse-tools');
    if(vtools && typeof _verseToolsHTML==='function'){
      vtools.innerHTML=_verseToolsHTML('sos-verse-text','sos-verse-ref');
      vtools.style.display='flex';
    }
  }catch(_){}
  // Inject the vice-specific science note (why this urge works the way it does) if there's a slot
  const sciEl=document.getElementById('sos-science-note');
  if(sciEl) sciEl.textContent = pb.science;
  const circle=document.getElementById('sos-breathe-circle');if(circle)circle.classList.add('on');
  const lbl=document.getElementById('sos-breathe-lbl');
  const labels=['Breathe in...','Hold...','Breathe out slowly...','Rest...'];let li=0;
  const bi=setInterval(()=>{li=(li+1)%labels.length;if(lbl)lbl.textContent=labels[li];},2000);
  setTimeout(()=>clearInterval(bi),16000);
}
function goSosP3(){
  showSosPhase(3);
  loadV();
  const v = vices[curVice] || {};
  const pb = getVicePlaybook(v);
  // Prefer vice-specific questions; fall back to location questions
  const data=LOC[sosLoc];
  const pool = (pb.questions && pb.questions.length) ? pb.questions : data.questions;
  const q=pool[Math.floor(Math.random()*pool.length)];
  const qt=document.getElementById('sos-q-text');if(qt)qt.textContent=q;
  // His own "why" — in his words — resurfaces here, the moment he's most wavering.
  const why=ls('totry_why')||'';
  const whyEl=document.getElementById('sos-why-reminder');
  if(whyEl){
    if(why){
      whyEl.style.display='block';
      whyEl.innerHTML='<div class="eyebrow" style="color:var(--go);margin-bottom:4px">Why you started this</div><div style="font-family:Cormorant Garamond,serif;font-style:italic;font-size:16px;color:var(--tx);line-height:1.5">\u201C'+why.replace(/</g,'&lt;')+'\u201D</div>';
    } else {
      whyEl.style.display='none';
    }
  }
  const bar=document.getElementById('sos-q-bar');
  const lbl=document.getElementById('sos-q-lbl');
  const btns=document.getElementById('sos-p3-btns');
  if(btns)btns.style.display='none';if(bar){setTimeout(()=>{bar.style.width='0%';},100);}
  let secs=30;
  const qi=setInterval(()=>{
    secs--;if(lbl)lbl.textContent='Sit with this... '+secs+'s';
    if(secs<=0){clearInterval(qi);if(lbl)lbl.textContent='Take your time.';if(btns)btns.style.display='flex';}
  },1000);
  // Swap the outcome buttons to match the vice's goal: moderation isn't win/lose, it's
  // within-limit vs over-limit.
  if(btns){
    if(v.mode === 'moderate'){
      btns.innerHTML =
        '<button class="btn success" onclick="logModerateWithin()">I stayed within my limit ✓</button>' +
        '<button class="btn blue" onclick="goSosCoach()">I need to talk to my coach</button>' +
        '<button class="btn" onclick="logModerateOver()" style="background:var(--bg3);border:1px solid var(--bd)">I went over — note it honestly</button>';
    } else {
      btns.innerHTML =
        '<button class="btn success" onclick="logWin()">I beat it — log the win 🏆</button>' +
        '<button class="btn blue" onclick="goSosCoach()">I need to talk to my coach</button>' +
        '<button class="btn danger" onclick="logLoss()">I gave in — log it honestly</button>';
    }
  }
}
async function goSosCoach(){
  showSosPhase(4);
  loadV();
  const v=vices[curVice]||{};
  const box=document.getElementById('sos-coach-box');
  if(box)box.innerHTML='<span class="pulsing" style="font-style:italic;color:var(--tx3)">Your coach is here...</span>';
  
  const cleanDays=viceCleanDays(v);
  const why=ls('totry_why')||'';
  const pb=getVicePlaybook(v);
  const locLabel={alone:'alone',people:'around people',work:'at work',class:'in class',car:'in the car',bed:'in bed'}[sosLoc]||sosLoc;
  
  const prompt=userName+' is in the middle of fighting the urge for "'+(v.n||'a vice')+'" (category: '+pb.label+') RIGHT NOW. This is a live crisis moment, not a reflection.\n'+
    'Context: Day '+getDayCount()+' of their journey. '+(cleanDays>0?cleanDays+' days clean on this specific fight. ':'')+
    'They are currently '+locLabel+'. They have won '+(v.w||0)+' of '+(v.total||0)+' past battles.'+
    (why?' Their deeper why: "'+why+'".':'')+'\n'+
    'The proven tactic for this specific vice: '+pb.science+'\n\n'+
    'Speak directly to them in this exact moment like someone who loves them and believes they can win. 3-4 sentences. Be specific to THIS vice ('+pb.label+') and their situation ('+locLabel+') — use the tactic above, not generic advice. Acknowledge the urge is real without feeding it. Remind them who they are becoming. End with ONE concrete physical action for the next 5 minutes that fits this vice and being '+locLabel+'. No clichés.';
  
  if(!navigator.onLine){
    if(box)box.textContent='You showed up by getting here — that already broke the spell. Stand up, move to a different room, drink a full glass of water slowly. The urge is a wave; it peaks and it passes. You have beaten this '+(v.w||0)+' times. You can beat it now.';
    return;
  }
  
  try{
    const r=await api(buildCtx(),[],prompt,1400);
    if(box)box.textContent=r||'You showed up for yourself by asking for help. That matters more than you know. Take a breath, drink some water, move somewhere different. You already broke the moment by getting here.';
  }catch(e){
    if(box)box.textContent='You showed up by getting here. That matters. Breathe. Move somewhere different. Drink water slowly. This wave will pass — they always do.';
  }
}
// ═══════════════════════════════════════════════════════════════════════════
// THE COMPANION — the front door. The reflex you reach for before the slip.
// Opens when the app opens (time-aware). Meets ANY struggle in the user's own
// words, applying the right evidence-based mechanism underneath, grounded in
// faith, in a warm, present, unjudging voice. For struggles we weren't ready
// for, it researches the faith+science approach live and caches it for everyone.
// ═══════════════════════════════════════════════════════════════════════════

// The clinical spines (from real protocols — urge surfing/MBRP, ACT defusion,
// behavioral interruption/ERP, grounding). These are the companion's KNOWLEDGE,
// not rigid scripts: the AI recognizes the shape of what the person describes and
// applies the fitting mechanism in its own warm words.
const COMPANION_MECHANISMS = {
  wave: {
    label: 'Riding the wave',
    forTypes: ['porn','nicotine','alcohol','gambling','food','scrolling'],
    spine: "This is a CRAVING that peaks and passes (urge surfing / MBRP, Marlatt). Most urges crest and fade within 15-30 minutes if not acted on, and weaken each time they're ridden out. Help them NAME it ('I'm noticing an urge'), locate the physical sensation in the body, breathe slowly (4-7-8), and understand they don't have to act - they just have to outlast the wave. Ground with cold water, movement, a change of room. Never shame. The urge is not them."
  },
  defuse: {
    labelKnown: true,
    label: 'Stepping back from the thought',
    forTypes: ['overthinking','anxiety','rumination'],
    spine: "This is RUMINATION / tangled thought (ACT cognitive defusion). The goal is NOT to argue with the thought or distract from it, but to un-fuse from it - create distance. Help them say 'I'm having the thought that...', picture the thought as a leaf on a stream that floats past, zoom out, thank the mind for the thought. Thoughts are mental events, not commands or facts. Help them step back and watch it rather than be inside it."
  },
  interrupt: {
    label: 'Breaking the loop',
    forTypes: ['porn','scrolling'],
    spine: "This is a COMPULSIVE BEHAVIORAL loop (CBT/ERP, OCD-framing). It's a compulsion, not a moral failure - removing shame is central. Help them physically INTERRUPT and redirect: change environment immediately, engage the senses (cold water, 5-4-3-2-1 grounding), do a values-based alternative action right now (move, step outside, call someone). The urge is intrusive, not chosen. They resist by not acting and letting it pass, gently."
  },
  ground: {
    label: 'Coming back to now',
    forTypes: ['general','anxiety'],
    spine: "This is DISTRESS / panic / overwhelm (grounding). Bring them into the present body: 5-4-3-2-1 (5 things you see, 4 touch, 3 hear, 2 smell, 1 taste), box breathing (in 4, hold 4, out 4, hold 4), feet on the floor, cold water. Slow everything down. They are safe in this moment."
  },
  reframe: {
    label: 'Catching the thought',
    forTypes: ['porn','nicotine','alcohol','gambling','food','scrolling','general'],
    spine: "This is the JUSTIFYING THOUGHT that comes right before a slip (CBT cognitive restructuring — the most evidence-backed technique). The mind offers a permission-giving distortion: 'just once won't matter', 'I deserve this', 'I've already ruined today so why not', 'I'll start fresh tomorrow', 'I can't cope without it'. Gently help them CATCH the specific thought and say it out loud, then CHALLENGE it like an older sibling who loves them would — is that actually true? Has 'just once' been true before? Do they really need it, or is the discomfort just unfamiliar? — then REPLACE it with what's truer: 'this feeling will pass whether or not I act', 'one choice doesn't erase the day', 'I can sit with this'. Never lecture; ask the question that lets THEM see the distortion. The thought is not a command and not a fact."
  }
};

// ── INSTANT PRESENCE + OFFLINE GUIDE ─────────────────────────────────────────────
// The crisis path must never depend on the network. The moment the companion opens, the sibling
// speaks INSTANTLY from the mechanism (no spinner, no dead air) and the AI joins when it arrives.
// If the network is gone or the model is slow, _compNextLocalStep() walks the person through the
// clinical mechanism step by step — real progression, never one repeated fallback line.
const COMPANION_INSTANT_OPEN = {
  wave: "I'm right here, and I'm glad you came to me instead. First — one slow breath: in for 4, out for 6. This urge is a wave. It will crest and pass whether you feed it or not — we just have to outlast it together.",
  defuse: "I'm here. Before anything else — one slow breath out, all the way. Now: you're not your thoughts, you're the one hearing them. Try saying to yourself, \"I'm having the thought that…\" and finish it. That little gap is where your freedom is.",
  interrupt: "I'm here, and reaching for me instead was the exact right move. Now break the loop with your body: stand up, walk to another room, or run cold water over your wrists — right now, while we talk. The pull loses its grip when the scene changes.",
  ground: "I'm right here with you. Let's come back to the ground together: name 5 things you can see… 4 you can touch… 3 you can hear. Slowly. You're safe in this moment, and I'm not going anywhere.",
  reframe: "I'm here. Whatever the thought is that's making this feel okay or inevitable — 'just once', 'I deserve it', 'today's already ruined' — catch it and say it to me straight. We'll look at it together in the light."
};
const COMPANION_LOCAL_STEPS = {
  wave: [
    "Where do you feel it in your body right now — chest, hands, stomach? Just find it and watch it like weather. Naming it (‘I'm noticing an urge’) already loosens it.",
    "Keep breathing — in 4, out 6. Urges crest in 15–30 minutes and ALWAYS pass. You don't have to fight it, just not obey it. Cold water on your face or a walk to another room speeds the wave along.",
    "What is this urge trying to manage tonight — stress, loneliness, boredom, being tired? Name the real need underneath. That need is legitimate; the urge is just a bad answer to it.",
    "You've outlasted this before — that's how you got here. Every wave you ride makes the next one smaller. Stay with me a few more minutes; the crest is closer than it feels.",
    "However tonight goes, you reached for help instead of hiding — that's who you're becoming. And if this keeps beating you no matter what, bringing in a real person — a mate, someone you trust, a counsellor — is strength, not failure. For now: one more slow breath. I'm still here."
  ],
  defuse: [
    "Picture the thought as a leaf dropping onto a stream — watch it drift past. It comes back? Fine, put it on another leaf. You're the stream bank, not the leaf.",
    "Try thanking your mind, honestly: ‘Thanks, mind — I've got it from here.’ It sounds odd, but it puts you back in charge of the conversation instead of inside it.",
    "Thoughts are mental events, not commands and not facts. What would you do in the next 10 minutes if this thought were just noise? Do exactly that — I'll wait.",
    "The spiral feeds on attention. Give your senses something real: feet flat on the floor, one full breath, the temperature of the air. You're here, now — not in the storm in your head.",
    "If the same spiral keeps taking whole nights from you, that's worth telling a real person — a friend, a counsellor. Not because you're broken; because you're worth backup. Right now though: one more leaf on the stream."
  ],
  interrupt: [
    "Have you changed rooms yet? Do it now — this second — and take me with you. The compulsion lives in the scene it started in; break the scene and it stumbles.",
    "Now the senses: 5 things you see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste. Slow. This resets the loop your brain is stuck in.",
    "This is a compulsion, not a moral failure — the shame voice lies. You resist by not acting and letting it pass, gently, like letting a pushy salesman knock without opening the door.",
    "Pick one values move and do it right now: step outside, 20 push-ups, message a mate, make tea. Any real action in the direction of who you're becoming starves the loop.",
    "If this loop keeps winning at the same hour no matter what you do, that's a pattern worth handing to a real person — a counsellor or someone you trust. That's tactics, not weakness. For now: you're through the worst minute of it. Stay with me."
  ],
  ground: [
    "Box breathing with me: in 4, hold 4, out 4, hold 4. Three rounds. Don't rush the holds — they're where your body learns it's safe.",
    "Feet flat on the floor. Press them down and feel the ground push back. Cold water on your hands if you can reach a tap. Your body is here, and here is safe.",
    "The feeling is loud, but it's weather, not the sky. It has never once stayed forever, and it won't tonight. What's the smallest kind thing you could do for yourself in the next 5 minutes?",
    "If the panic or the weight keeps coming back night after night, please tell a real person — a doctor, a counsellor, someone who loves you. That's not giving up; that's reinforcements. Right now: one more round of box breathing with me."
  ],
  reframe: [
    "Now look at it with me: is it actually TRUE? Has ‘just once’ ever stayed just once? Does a hard day really get better after — or heavier?",
    "The thought isn't a command — it's an offer, and you can decline it. What's the truer sentence? Maybe: ‘this feeling passes whether or not I act’, or ‘one hard evening doesn't erase my day.’ Say the true one back to me.",
    "You caught the thought — that's the whole skill, and most people never learn it. Every time you catch-and-check it, the next one arrives quieter.",
    "If the same lying thought keeps winning at your weakest hour, tell someone real about it — naming it to a person breaks its spell twice as fast. For now: you saw through it tonight. Breathe, and stay with me a minute."
  ]
};
let _compLocalStep = 0;
function _compNextLocalStep(){
  const s = _compStruggle || {};
  const steps = COMPANION_LOCAL_STEPS[s.mechanism] || COMPANION_LOCAL_STEPS.ground;
  const step = steps[Math.min(_compLocalStep, steps.length - 1)];
  _compLocalStep++;
  return step;
}

// Map a vice type (from classifyVice) to the best mechanism spine.
function _mechanismForType(type){
  if(type === 'overthinking' || type === 'anxiety') return 'defuse';
  if(type === 'porn') return 'interrupt';
  if(type === 'scrolling') return 'interrupt';
  if(type === 'nicotine' || type === 'alcohol' || type === 'gambling' || type === 'food') return 'wave';
  return 'ground';
}

// Cache of researched protocols for struggles we weren't pre-built for.
function _getCompanionProtocols(){ try{ return JSON.parse(localStorage.getItem('totry_companion_protocols')||'{}'); }catch(_){ return {}; } }

let _compStruggle = null;      // {name, type, mechanism, spine}
let _compHistory = [];         // conversation history for the AI
let _compManualMechanism = null;

// ── TIME-AWARENESS ────────────────────────────────────────────────────────
// The app bends through the day. Morning → it should NOT lead with the urge
// check-in (a waking person isn't usually fighting a vice); it leads to the day.
// Midday/general opens → the companion check-in. Evening handled by reflection.
function _userHour(){ return new Date().getHours(); }
function _isMorningWindow(){
  // Use the user's existing morning reminder time if they set one (no new setup needed); else 5–11am.
  let wake = parseInt(ls('totry_wake_hour')||'',10);   // never written today; kept for forward compat
  if(isNaN(wake)){
    try{ const rt = ls('totry_reminder_times')||{}; if(rt.morning){ const h=parseInt(String(rt.morning).split(':')[0],10); if(!isNaN(h)) wake=h; } }catch(_){}
  }
  // The LIVE settings UI (savePushTimes) writes totry_push_prefs, not totry_reminder_times — so for
  // anyone who set their morning time there this fell through to the 5am default and silenced the urge
  // check-in from 5:00 to 11:00. A late riser or shift worker got nothing through the hours they were
  // actually awake, and someone up at 4am got the check-in instead of the morning.
  if(isNaN(wake)){
    try{ const pp=(typeof _pushPrefs==='function')?_pushPrefs():(ls('totry_push_prefs')||{});
         if(pp && pp.morning){ const h=parseInt(String(pp.morning).split(':')[0],10); if(!isNaN(h)) wake=h; } }catch(_){}
  }
  if(isNaN(wake)) wake = 5;
  const h = _userHour();
  // Morning window = from wake until ~11am (the day leads here, not the urge check-in).
  return h >= wake && h < 11;
}

// Should the companion check-in show on this open? Every open, EXCEPT:
//  • not during onboarding/auth, • not more than once per ~90 min (so re-opens
//    in a session aren't naggy), • morning window defers to the day instead.
function maybeShowCompanion(){
  try{
    // Never during auth or onboarding.
    const auth = document.getElementById('auth-container');
    if(auth && getComputedStyle(auth).display !== 'none') return;
    const onboard = document.getElementById('onboard');
    if(onboard && getComputedStyle(onboard).display !== 'none') return;
    if(document.querySelector('.companion-overlay.open')) return;
  // NOR BEHIND THE FEELING DOOR. enterAsGuest opens the door on a 320ms timer while initApp schedules
  // this on 1200ms — so once a guest counted as "set up" (v464, correctly, so they could be reached out
  // to at all), a brand-new person tapping the orb got the companion sheet sliding up underneath the
  // door they had just opened, 0.9s later. Two of the app's most important surfaces, arguing.
  const _door = document.getElementById('feel-door');
  if(_door && _door.classList.contains('open')) return;
  // Nor over any open sheet or modal — the same reasoning, generalised.
  if(document.querySelector('.modal-bg.open')) return;
    // Only for a set-up user — a brand-new person who hasn't onboarded shouldn't be greeted with
    // "what's pulling at you?" before they've told the app anything. Require onboarding done + a name.
    if(!isSetUpPerson()) return;
    // And never in the same session onboarding just completed (avoids an abrupt first experience).
    try{ if(sessionStorage.getItem('totry_just_onboarded')) return; }catch(_){}
    // Throttle: at most once per 90 minutes so it forms a reflex without nagging.
    const last = parseInt(ls('totry_companion_last')||'0',10);
    if(Date.now() - last < 90*60*1000) return;
    // Morning window → the day leads, not the urge check-in. (Still reachable manually.)
    if(_isMorningWindow()) return;
    openCompanion();
  }catch(_){ }
}

function openCompanion(){
  const ov = document.getElementById('companion-overlay');
  if(!ov) return;
  ls('totry_companion_last', String(Date.now()));
  // Reset to the check-in phase.
  _compPhase('comp-checkin');
  // Warm, name-aware, time-aware greeting.
  const name = ls('totry_name') || '';
  const h = _userHour();
  const greetEl = document.getElementById('comp-greeting');
  const subEl = document.getElementById('comp-sub');
  if(greetEl){
    const hi = name ? ('Hey '+name+'.') : 'Hey.';
    greetEl.textContent = (h >= 21 || h < 5) ? (hi+' How are you tonight, really?') : (hi+' How are you, really?');
  }
  if(subEl) subEl.textContent = h >= 21 || h < 5 ? "Late one. No wrong answer — I'm just here." : "No wrong answer. I'm just here.";
  ov.classList.add('open'); document.getElementById('companion-backdrop')?.classList.add('open');
}

function _compPhase(id){
  document.querySelectorAll('.companion-overlay .comp-phase').forEach(p => p.classList.toggle('active', p.id === id));
}

// "I'm okay" — affirm and let them in. This is the one-tap dismiss that builds the reflex.
function companionOkay(){
  if(typeof haptic==='function') haptic('light');
  closeCompanion();
  if(typeof showToast==='function') showToast('Good.', 'I\u2019m here if anything shifts.');
}
function dismissCompanion(){ closeCompanion(); }
function closeCompanion(){
  const ov = document.getElementById('companion-overlay');
  if(ov){ ov.classList.remove('open'); ov.style.transform=''; }
  const bd = document.getElementById('companion-backdrop');
  if(bd) bd.classList.remove('open');
  _compStruggle = null; _compHistory = []; _compManualMechanism = null;
}

// "Something's pulling at me" → name it (their vices as chips + free text).
// Manual entry from the floating "I'm feeling it" button — opens the companion straight into
// naming the struggle (they've already told us they're in it; skip "are you okay?").
// THE MOST IMPORTANT 3 SECONDS IN THE APP. A man tapping the orb is often in the grip of it — his
// willpower is gone, and the LAST thing he can do is choose from a menu. So one tap lands him
// straight in the breathing, present voice. No options, no friction. The other doors (Coach, "what
// should I do") live calmly INSIDE the companion as a quiet "or…", never as a gate before it.
function orbTap(){
  if(typeof haptic==='function') haptic('light');
  // The orb now opens the FEELING DOOR first — the entry through emotion. If a man is in acute
  // crisis he taps "the pull" and lands straight in the companion; everything else is met in its
  // own feeling. This is the thing you open when you feel ANYTHING.
  openFeelingDoor();
}

