    // saint (e.g. "Bridget of Sweden" titled, but the bio is St. Elizabeth's). A wrong saint bio quietly
    // corrodes trust in the whole faith side \u2014 so when the description's SUBJECT saint isn't the one
    // named, we keep the reliable name and drop the mismatched quote+bio rather than show something false.
    const showBio = !_liturgyCelebrationMismatch(c);
    const q = showBio ? c.quote : null;
    const desc = showBio ? c.description : null;
    html += '<div class="card" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(200,169,110,0.06),rgba(140,107,182,0.04));border-color:var(--go-bd)">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Today the Church remembers</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);font-style:italic;margin-bottom:'+(q||desc?'10px':'0')+'">'+(c.name||'').replace(/</g,'&lt;')+'</div>'+
      (q?'<div style="font-size:14px;color:var(--go);font-style:italic;line-height:1.6;margin-bottom:'+(desc?'10px':'0')+'">\u201c'+q.replace(/</g,'&lt;')+'\u201d</div>':'')+
      (desc?'<div style="font-size:12px;color:var(--tx3);line-height:1.6">'+desc.replace(/</g,'&lt;')+'</div>':'')+
      '</div>';
  }
  if(d.readings){
    const r = d.readings;
    const row = (label, val) => val ? '<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--bd)"><span style="font-size:12px;color:var(--tx3);flex-shrink:0">'+label+'</span><span style="font-size:13px;color:var(--tx);text-align:right">'+val.replace(/</g,'&lt;')+'</span></div>' : '';
    html += '<div class="card" style="margin-bottom:14px"><div class="card-hd" style="margin-bottom:6px">Today\u2019s Mass readings</div>'+
      row('First Reading', r.firstReading)+
      row('Psalm', r.psalm)+
      row('Second Reading', r.secondReading)+
      '<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0"><span style="font-size:12px;color:var(--tx3);flex-shrink:0">Gospel</span><span style="font-size:13px;color:var(--go);text-align:right">'+(r.gospel||'').replace(/</g,'&lt;')+'</span></div>';
    html += '<button class="btn" onclick="readTodaysGospel()" style="margin-top:12px;background:var(--bg2);border:1px solid var(--go-bd);color:var(--go);font-size:13px;width:100%">Read today\u2019s Gospel</button>';
    html += '<div id="liturgy-gospel-text" style="margin-top:12px"></div>';
    if(d.usccb){ html += '<a href="'+d.usccb+'" target="_blank" rel="noopener" style="display:block;margin-top:10px;font-size:12px;color:var(--bl);text-align:center">Full readings at USCCB \u2192</a>'; }
    html += '</div>';
    window.__todayGospelRef = d.readings.gospel || null;
  }
  box.innerHTML = html;
}
// Fetch & show today's actual Gospel passage text inline, using the Bible API already wired in.
async function readTodaysGospel(){
  const box = document.getElementById('liturgy-gospel-text');
  const ref = window.__todayGospelRef;
  if(!box || !ref) return;
  box.innerHTML = '<div style="font-size:13px;color:var(--tx3);font-style:italic;padding:6px">Loading the Gospel…</div>';
  // Parse "John 3:16-21" → book, chapter (we show the whole chapter range start).
  const m = ref.match(/^([\d]?\s?[A-Za-z ]+?)\s+(\d+):(\d+)(?:-(\d+))?/);
  if(!m){ box.innerHTML = '<div style="font-size:12px;color:var(--tx2);padding:6px">See the full Gospel at the USCCB link below.</div>'; return; }
  const bookName = m[1].trim();
  const chapter = m[2];
  const vStart = parseInt(m[3]);
  const vEnd = m[4] ? parseInt(m[4]) : vStart;
  const usfm = (typeof bibleBookToUSFM==='function') ? bibleBookToUSFM(bookName) : bookName.toUpperCase().slice(0,3);
  let verses = null;
  try{
    const r = await fetch('https://bible.helloao.org/api/BSB/'+usfm+'/'+chapter+'.json');
    if(r.ok){ const d = await r.json(); const all = (d.chapter && d.chapter.content) || []; 
      verses = all.filter(it => it.type==='verse' && it.number>=vStart && it.number<=vEnd)
                  .map(v => ({ num:v.number, text: (Array.isArray(v.content)?v.content.map(c=>typeof c==='string'?c:(c.text||'')).join(' '):v.content||'') })); }
  }catch(_){ }
  if(!verses || !verses.length){
    box.innerHTML = '<div style="font-size:12px;color:var(--tx2);line-height:1.6;padding:6px">Couldn\u2019t load the passage inline right now \u2014 tap the USCCB link below for the full reading.</div>';
    return;
  }
  let html = '<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:14px;margin-top:4px">'+
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px">'+ref.replace(/</g,'&lt;')+'</div>';
  verses.forEach(v => { if(v.text) html += '<p style="font-size:15px;line-height:1.7;color:var(--tx);margin-bottom:8px"><span style="font-size:10px;color:var(--go);vertical-align:super;margin-right:3px">'+v.num+'</span>'+v.text.replace(/</g,'&lt;')+'</p>'; });
  html += '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:6px">Berean Standard Bible (public domain)</div></div>';
  box.innerHTML = html;
  haptic('tap');
}

// ── THE ROSARY ─────────────────────────────────────────────────────────────────────────────────
// The most iconic Catholic devotion, and it was missing entirely. Entirely traditional fixed prayers
// (no AI, nothing to be wrong about) — a guided, bead-by-bead walk through today's mysteries, so a
// person can pray it well without holding the structure in their head. Progress is saved, so an
// interrupted rosary resumes where it left off.
const ROSARY_PRAYERS = {
  sign: 'In the name of the Father, and of the Son, and of the Holy Spirit. Amen.',
  creed: 'I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, His only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; He descended into hell; on the third day He rose again from the dead; He ascended into heaven, and is seated at the right hand of God the Father almighty; from there He will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.',
  our: 'Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come, Thy will be done, on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.',
  hail: 'Hail Mary, full of grace, the Lord is with thee; blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.',
  glory: 'Glory be to the Father, and to the Son, and to the Holy Spirit; as it was in the beginning, is now, and ever shall be, world without end. Amen.',
  fatima: 'O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to heaven, especially those in most need of Thy mercy. Amen.',
  salve: 'Hail, holy Queen, Mother of mercy, our life, our sweetness and our hope. To thee do we cry, poor banished children of Eve; to thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious Advocate, thine eyes of mercy toward us; and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary. Pray for us, O holy Mother of God, that we may be made worthy of the promises of Christ. Amen.'
};
const ROSARY_MYSTERIES = {
  Joyful: [
    {title:'The Annunciation', ref:'Luke 1:26–38', fruit:'Humility'},
    {title:'The Visitation', ref:'Luke 1:39–56', fruit:'Love of Neighbour'},
    {title:'The Nativity', ref:'Luke 2:1–20', fruit:'Poverty of Spirit'},
    {title:'The Presentation', ref:'Luke 2:22–38', fruit:'Obedience'},
    {title:'The Finding in the Temple', ref:'Luke 2:41–52', fruit:'Joy in Finding Jesus'}
  ],
  Sorrowful: [
    {title:'The Agony in the Garden', ref:'Luke 22:39–46', fruit:'Sorrow for Sin'},
    {title:'The Scourging at the Pillar', ref:'Matthew 27:26', fruit:'Purity'},
    {title:'The Crowning with Thorns', ref:'Matthew 27:27–31', fruit:'Courage'},
    {title:'The Carrying of the Cross', ref:'Luke 23:26–32', fruit:'Patience'},
    {title:'The Crucifixion', ref:'Luke 23:33–46', fruit:'Perseverance'}
  ],
  Glorious: [
    {title:'The Resurrection', ref:'Matthew 28:1–10', fruit:'Faith'},
    {title:'The Ascension', ref:'Acts 1:6–11', fruit:'Hope'},
    {title:'The Descent of the Holy Spirit', ref:'Acts 2:1–13', fruit:'Love of God'},
    {title:'The Assumption of Mary', ref:'Revelation 12:1', fruit:'A Happy Death'},
    {title:'The Coronation of Mary', ref:'Judith 15:9–10', fruit:'Trust in Mary’s Intercession'}
  ],
  Luminous: [
    {title:'The Baptism of Jesus', ref:'Matthew 3:13–17', fruit:'Openness to the Spirit'},
    {title:'The Wedding at Cana', ref:'John 2:1–11', fruit:'To Jesus through Mary'},
    {title:'The Proclamation of the Kingdom', ref:'Mark 1:14–15', fruit:'Repentance & Trust'},
    {title:'The Transfiguration', ref:'Matthew 17:1–8', fruit:'Desire for Holiness'},
    {title:'The Institution of the Eucharist', ref:'Matthew 26:26–28', fruit:'Adoration'}
  ]
};
function todaysRosaryMysteries(){
  // Traditional weekly assignment (with the Luminous mysteries, St John Paul II, 2002).
  const map = ['Glorious','Joyful','Sorrowful','Glorious','Luminous','Sorrowful','Joyful']; // Sun..Sat
  const name = map[new Date().getDay()];
  return { name, mysteries: ROSARY_MYSTERIES[name] };
}
const _ROSARY_ORD = ['First','Second','Third','Fourth','Fifth'];
function _buildRosarySequence(){
  const set = todaysRosaryMysteries(); const P = ROSARY_PRAYERS; const steps = [];
  steps.push({sec:'Opening', name:'The Sign of the Cross', text:P.sign});
  steps.push({sec:'Opening', name:'The Apostles’ Creed', text:P.creed});
  steps.push({sec:'Opening', name:'Our Father', text:P.our});
  for(let i=0;i<3;i++) steps.push({sec:'Opening', name:'Hail Mary', text:P.hail, sub:'for faith, hope, and love · '+(i+1)+' of 3'});
  steps.push({sec:'Opening', name:'Glory Be', text:P.glory});
  set.mysteries.forEach((mys, di)=>{
    steps.push({sec:set.name+' Mysteries', name:_ROSARY_ORD[di]+' Mystery', announce:mys});
    steps.push({sec:'Decade '+(di+1), name:'Our Father', text:P.our});
    for(let b=0;b<10;b++) steps.push({sec:'Decade '+(di+1), name:'Hail Mary', text:P.hail, sub:(b+1)+' of 10', bead:di*10+b+1});
    steps.push({sec:'Decade '+(di+1), name:'Glory Be', text:P.glory});
    steps.push({sec:'Decade '+(di+1), name:'Fatima Prayer', text:P.fatima});
  });
  steps.push({sec:'Closing', name:'Hail, Holy Queen', text:P.salve});
  steps.push({sec:'Closing', name:'The Sign of the Cross', text:P.sign, last:true});
  return {set, steps};
}
let _rosary = null;
function openRosary(){
  const built = _buildRosarySequence();
  _rosary = { set:built.set, steps:built.steps, i:0 };
  _rosaryDone = false;
  // Resume if there's saved progress from today.
  try{
    const sp = ls('totry_rosary_progress');
    if(sp && sp.date === new Date().toLocaleDateString('en-AU') && sp.i>0 && sp.i<built.steps.length){ _rosary.i = sp.i; }
  }catch(_){}
  let ov = document.getElementById('rosary-overlay');
  if(!ov){ ov = document.createElement('div'); ov.id='rosary-overlay'; document.body.appendChild(ov); }
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:radial-gradient(120% 90% at 50% 0%, #16121f 0%, #0a0a0f 70%);display:flex;flex-direction:column;overflow:hidden';
  _renderRosaryStep();
  if(typeof haptic==='function') haptic('light');
}
function closeRosary(){
  // Don't re-arm a finished rosary. _finishRosary() clears the resume pointer, but the completion
  // screen's only button is this function, which then wrote the pointer straight back at the LAST step
  // index — and the resume guard (sp.i < steps.length) happily accepts it. So praying a second rosary
  // the same day dropped the person on the closing Sign of the Cross with the whole rosary skipped.
  try{
    if(_rosaryDone){ localStorage.removeItem('totry_rosary_progress'); }
    else { ls('totry_rosary_progress', { date:new Date().toLocaleDateString('en-AU'), i:_rosary?_rosary.i:0 }); }
  }catch(_){}
  _rosaryDone = false;
  const ov=document.getElementById('rosary-overlay'); if(ov) ov.remove();
}
function _rosaryGo(delta){
  if(!_rosary) return;
  const ni=_rosary.i+delta;
  if(ni<0) return;
  if(ni>=_rosary.steps.length){ _finishRosary(); return; }
  _rosary.i=ni; _renderRosaryStep();
  if(typeof haptic==='function') haptic(_rosary.steps[ni].bead?'tick':'tap');
}
function _renderRosaryStep(){
  const ov=document.getElementById('rosary-overlay'); if(!ov||!_rosary) return;
  const s=_rosary.steps[_rosary.i]; const total=_rosary.steps.length; const pct=Math.round(((_rosary.i+1)/total)*100);
  const esc=function(t){ return String(t||'').replace(/</g,'&lt;'); };
  let bodyHtml;
  if(s.announce){
    const m=s.announce;
    bodyHtml=
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:14px">'+esc(s.name)+'</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:30px;font-style:italic;color:var(--tx);line-height:1.2;margin-bottom:12px">'+esc(m.title)+'</div>'+
      '<div style="font-family:DM Mono,monospace;font-size:12px;color:var(--tx3);margin-bottom:18px">'+esc(m.ref)+'</div>'+
      '<div style="font-size:13px;color:var(--go);line-height:1.6">Fruit of the mystery: <span style="color:var(--tx2)">'+esc(m.fruit)+'</span></div>'+
      '<div style="font-size:12.5px;color:var(--tx3);line-height:1.7;margin-top:16px;font-style:italic">Picture the scene. Sit with it a moment before you pray.</div>';
  } else {
    bodyHtml=
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:4px">'+esc(s.name)+'</div>'+
      (s.sub?'<div style="font-family:DM Mono,monospace;font-size:11px;color:var(--tx3);margin-bottom:18px">'+esc(s.sub)+'</div>':'<div style="height:14px"></div>')+
      '<div style="font-family:Cormorant Garamond,serif;font-size:'+(s.text&&s.text.length>240?'19px':'23px')+';color:var(--tx);line-height:1.5;font-style:italic">'+esc(s.text)+'</div>';
  }
  ov.innerHTML=
    '<div style="padding:calc(env(safe-area-inset-top,0px) + 16px) 20px 10px;display:flex;align-items:center;justify-content:space-between;gap:12px">'+
      '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--tx3);letter-spacing:0.1em;text-transform:uppercase;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(s.sec)+'</div>'+
      '<button onclick="closeRosary()" aria-label="Close" style="background:none;border:none;color:var(--tx3);font-size:22px;cursor:pointer;line-height:1;flex:none">×</button>'+
    '</div>'+
    '<div style="height:3px;background:rgba(255,255,255,0.06);margin:0 20px;border-radius:2px"><div style="height:100%;width:'+pct+'%;background:var(--go);border-radius:2px;transition:width .25s"></div></div>'+
    '<div onclick="_rosaryGo(1)" style="flex:1;display:flex;flex-direction:column;justify-content:center;text-align:center;padding:24px 26px;overflow-y:auto;cursor:pointer">'+
      '<div style="max-width:34ch;margin:0 auto">'+bodyHtml+'</div>'+
    '</div>'+
    '<div style="padding:14px 20px calc(env(safe-area-inset-bottom,0px) + 20px);display:flex;align-items:center;gap:12px">'+
      (_rosary.i>0?'<button onclick="_rosaryGo(-1)" style="flex:none;width:52px;height:52px;border-radius:50%;background:none;border:1px solid var(--bd);color:var(--tx2);font-size:20px;cursor:pointer">‹</button>':'<div style="width:52px"></div>')+
      '<button onclick="_rosaryGo(1)" class="btn primary" style="flex:1;margin:0;padding:16px;font-size:15px">'+(s.last?'Finish · Amen':(s.announce?'Begin the decade':'Next'))+'</button>'+
    '</div>';
}
let _rosaryDone = false;      // set on completion so closeRosary() cannot re-arm the resume pointer
function _finishRosary(){
  _rosaryDone = true;
  let list=ls('totry_rosaries')||[];
  // The completion screen must ALWAYS render — never let a failed cloud sync or storage write rob a
  // person of the "you prayed it" moment. All side effects are best-effort.
  try{
    list.unshift({ ts:new Date().toISOString(), mysteries:_rosary?_rosary.set.name:null });
    ls('totry_rosaries', list.slice(0,500));
    localStorage.removeItem('totry_rosary_progress');
    if(typeof syncToCloud==='function') syncToCloud();
    if(typeof haptic==='function') haptic('celebrate');
  }catch(_){}
  const ov=document.getElementById('rosary-overlay'); if(!ov) return;
  const n=list.length;
  ov.innerHTML='<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px">'+
    '<div style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);letter-spacing:0.16em;text-transform:uppercase;margin-bottom:14px">Rosary complete</div>'+
    '<div style="font-family:Cormorant Garamond,serif;font-size:26px;font-style:italic;color:var(--tx);line-height:1.35;margin-bottom:16px;max-width:22ch">“Pray for us, O holy Mother of God.”</div>'+
    '<div style="font-size:13px;color:var(--tx3);line-height:1.6;margin-bottom:26px;max-width:30ch">You prayed the '+(_rosary?_rosary.set.name:'')+' Mysteries. That’s '+n+' '+(n===1?'rosary':'rosaries')+' walked with Our Lady.</div>'+
    '<button onclick="closeRosary()" class="btn primary" style="width:auto;padding:14px 30px">Rest in the peace of it</button>'+
  '</div>';
}

// Compact morning surface — one line, taps to the full page. Silent if nothing loaded.
async function renderMorningLiturgy(){
  const box = document.getElementById('morning-liturgy');
  if(!box) return;
  if(faithTradition()!=='christianity'){ box.style.display='none'; box.innerHTML=''; return; }
  let d;
  try{ d = await fetchLiturgy(); }catch(_){ return; }
  if(!d || (!d.readings && !d.celebration)){ box.style.display='none'; return; }
  let line = '';
  if(d.celebration && d.celebration.name) line = 'Today: ' + d.celebration.name;
  else if(d.readings && d.readings.gospel) line = 'Gospel today: ' + d.readings.gospel;
  if(!line){ box.style.display='none'; return; }
  box.innerHTML = '<div onclick="go(\'liturgy\')" style="cursor:pointer;background:var(--bg3);border:1px solid var(--go-bd);border-radius:10px;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px">'+
    '<div><div style="font-family:DM Mono,monospace;font-size:8px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:3px">In the Church today</div>'+
    '<div style="font-size:12px;color:var(--tx2)">'+line.replace(/</g,'&lt;')+'</div></div>'+
    '<span style="color:var(--tx3);font-size:18px">\u203a</span></div>';
  box.style.display = 'block';
}

function initWhyTab(){
  const why = (ls('totry_why') || '').trim();
  const disp = document.getElementById('why-display');
  if(disp) disp.textContent = why || 'You haven\u2019t written your why yet. Tap below to put it into words \u2014 it\u2019s the anchor everything else holds onto.';
  // Identity + season now live here (moved from Settings).
  const idEl = document.getElementById('settings-identity');
  if(idEl) idEl.value = ls('totry_identity') || '';
  if(typeof renderSeasonSettings === 'function') renderSeasonSettings();
  if(typeof renderRelationships === 'function') renderRelationships();
  if(typeof renderValuesCard === 'function') renderValuesCard();
  renderWhyAffirmations();
  renderWhyPromises();
  renderWhyLetters();
}
function toggleWhyEdit(){
  const ta = document.getElementById('why-edit');
  const disp = document.getElementById('why-display');
  const eb = document.getElementById('why-edit-btn');
  const sb = document.getElementById('why-save-btn');
  if(!ta) return;
  ta.value = (ls('totry_why') || '');
  ta.style.display = 'block'; if(disp) disp.style.display='none';
  if(eb) eb.style.display='none'; if(sb) sb.style.display='block';
  ta.focus();
}
function saveWhyEdit(){
  const ta = document.getElementById('why-edit');
  if(ta){ const v = ta.value.trim(); ls('totry_why', v); }
  const disp = document.getElementById('why-display'); const eb = document.getElementById('why-edit-btn'); const sb = document.getElementById('why-save-btn');
  if(ta) ta.style.display='none'; if(disp) disp.style.display='block';
  if(eb) eb.style.display='block'; if(sb) sb.style.display='none';
  initWhyTab();
  haptic('success'); showToast('Saved', 'Your why is set.');
}
function renderWhyAffirmations(){
  const box = document.getElementById('affirmations-list'); if(!box) return;
  const list = ls('totry_affirmations') || [];
  if(!list.length){ box.innerHTML = '<p style="font-size:12px;color:var(--tx3);font-style:italic;padding:4px 0">No affirmations yet.</p>'; return; }
  box.innerHTML = list.map((a,i) =>
    '<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--bg3);border:1px solid var(--bd);border-radius:8px;margin-bottom:6px">'+
    '<span style="flex:1;font-size:13px;color:var(--tx);font-style:italic">\u201c'+a.replace(/</g,'&lt;')+'\u201d</span>'+
    '<button onclick="removeWhyAffirmation('+i+')" style="background:none;border:none;color:var(--tx3);font-size:16px;flex-shrink:0">\u00d7</button></div>'
  ).join('');
}
function addWhyAffirmation(){
  const inp = document.getElementById('new-affirmation'); if(!inp) return;
  const v = inp.value.trim(); if(!v) return;
  const list = ls('totry_affirmations') || []; list.unshift(v); ls('totry_affirmations', list);
  inp.value = ''; renderWhyAffirmations(); haptic('success');
}
function removeWhyAffirmation(i){
  const list = ls('totry_affirmations') || []; list.splice(i,1); ls('totry_affirmations', list); renderWhyAffirmations();
}
// Promises + letters reuse the existing storage + renderers, just targeting the Why page containers.
function addPromiseFromWhy(){
  const inp = document.getElementById('why-new-promise'); if(!inp) return;
  const text = inp.value.trim(); if(!text) return;
  const days = parseInt(document.getElementById('why-promise-when').value||7);
  const promises = ls('totry_promises')||[];
  const due = new Date(); due.setDate(due.getDate()+days);
  promises.unshift({ id:Date.now(), text, created:new Date().toISOString(), due:due.toISOString(), status:'open' });
  ls('totry_promises', promises);
  inp.value=''; renderWhyPromises(); if(typeof renderPromises==='function') renderPromises();
  haptic('success'); showToast('Promise logged', 'Now honour it.');
}
function saveLetterFromWhy(){
  const text = document.getElementById('why-letter-text')?.value.trim();
  const days = parseInt(document.getElementById('why-letter-when')?.value||30);
  if(!text){ showToast('Empty','Write something to your future self first.'); return; }
  const deliverAt = new Date(); deliverAt.setDate(deliverAt.getDate()+days);
  const letters = ls('totry_letters')||[];
  letters.push({ id:Date.now(), text, written:new Date().toISOString(), deliverAt:deliverAt.toISOString(), delivered:false });
  ls('totry_letters', letters);
  const ta = document.getElementById('why-letter-text'); if(ta) ta.value='';
  renderWhyLetters(); if(typeof renderLetters==='function') renderLetters();
  haptic('success'); showToast('Letter sealed', 'It\u2019ll find you in ' + days + ' days.');
}
function renderWhyPromises(){
  const due = document.getElementById('why-promises-due');
  const list = document.getElementById('why-promises-list');
  const promises = ls('totry_promises') || [];
  const now = Date.now();
  if(due){
    const dueNow = promises.filter(p => p.status==='open' && new Date(p.due).getTime() <= now);
    due.innerHTML = dueNow.map(p =>
      '<div style="padding:12px;background:var(--bg3);border:1px solid var(--go-bd);border-radius:8px;margin-bottom:8px">'+
      '<div style="font-size:13px;color:var(--tx);margin-bottom:8px">'+p.text.replace(/</g,'&lt;')+'</div>'+
      '<div style="display:flex;gap:8px"><button class="btn success" style="flex:1;padding:7px;font-size:12px" onclick="resolveWhyPromise('+p.id+',true)">Kept it</button>'+
      '<button class="btn" style="flex:1;padding:7px;font-size:12px;background:var(--bg2);border:1px solid var(--bd)" onclick="resolveWhyPromise('+p.id+',false)">Didn\u2019t</button></div></div>'
    ).join('');
  }
  if(list){
    const open = promises.filter(p => p.status==='open' && new Date(p.due).getTime() > now);
    const done = promises.filter(p => p.status!=='open');
    list.innerHTML =
      open.map(p => '<div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg3);border-radius:8px;margin-bottom:6px;font-size:12px"><span style="color:var(--tx2)">'+p.text.replace(/</g,'&lt;')+'</span><span style="color:var(--tx3);font-family:DM Mono,monospace;font-size:10px">'+Math.ceil((new Date(p.due).getTime()-now)/86400000)+'d</span></div>').join('')+
      done.slice(0,10).map(p => '<div style="display:flex;justify-content:space-between;padding:8px 12px;border-radius:8px;margin-bottom:6px;font-size:12px;opacity:0.6"><span style="color:var(--tx3);text-decoration:'+(p.status==='kept'?'none':'line-through')+'">'+p.text.replace(/</g,'&lt;')+'</span><span style="font-size:13px">'+(p.status==='kept'?'\u2713':'\u2014')+'</span></div>').join('');
  }
}
function resolveWhyPromise(id, kept){
  const promises = ls('totry_promises')||[];
  const p = promises.find(x=>x.id===id); if(p){ p.status = kept?'kept':'broken'; ls('totry_promises', promises); }
  renderWhyPromises(); if(typeof renderPromises==='function') renderPromises();
  haptic(kept?'success':'tap');
}
function renderWhyLetters(){
  const dueBox = document.getElementById('why-letters-due');
  const listBox = document.getElementById('why-letters-list');
  const letters = ls('totry_letters') || [];
  const now = Date.now();
  if(dueBox){
    const ready = letters.filter(l => !l.delivered && new Date(l.deliverAt).getTime() <= now);
    dueBox.innerHTML = ready.map(l =>
      '<div style="padding:14px;background:linear-gradient(135deg,rgba(200,169,110,0.1),rgba(140,107,182,0.05));border:1px solid var(--go-bd);border-radius:10px;margin-bottom:8px">'+
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">A letter from your past self has arrived</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:15px;color:var(--tx);font-style:italic;line-height:1.6;white-space:pre-wrap">'+l.text.replace(/</g,'&lt;')+'</div>'+
      '<button class="btn" style="margin-top:10px;padding:6px 12px;font-size:11px;background:var(--bg3);border:1px solid var(--bd)" onclick="markWhyLetterRead('+l.id+')">I\u2019ve read it</button></div>'
    ).join('');
  }
  if(listBox){
    const pending = letters.filter(l => !l.delivered && new Date(l.deliverAt).getTime() > now);
    listBox.innerHTML = pending.length ? '<div style="font-size:11px;color:var(--tx3);margin-top:4px">'+pending.length+' letter'+(pending.length>1?'s':'')+' sealed, waiting for delivery.</div>' : '';
  }
}
function markWhyLetterRead(id){
  const letters = ls('totry_letters')||[];
  const l = letters.find(x=>x.id===id); if(l){ l.delivered = true; ls('totry_letters', letters); }
  renderWhyLetters(); if(typeof renderLetters==='function') renderLetters();
}

function renderLetters(){
  const dueList=document.getElementById('letters-due');
  const list=document.getElementById('letters-list');
  if(!list)return;
  const letters=ls('totry_letters')||[];
  const now=Date.now();
  const dueNow=letters.filter(l=>!l.delivered&&new Date(l.deliverAt).getTime()<=now);
  const pending=letters.filter(l=>!l.delivered&&new Date(l.deliverAt).getTime()>now);
  const delivered=letters.filter(l=>l.delivered);
  
  if(dueList){
    if(dueNow.length){
      dueList.innerHTML='<div style="background:var(--go-bg);border:1px solid var(--go-bd);border-radius:8px;padding:10px 12px;margin-bottom:8px"><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">'+dueNow.length+' letter'+(dueNow.length>1?'s':'')+' ready to open</div>'+dueNow.map(l=>'<button class="btn primary" style="margin-top:6px" onclick="deliverLetter('+l.id+')">Open letter from '+new Date(l.written).toLocaleDateString('en-AU',{day:'numeric',month:'short'})+'</button>').join('')+'</div>';
    }else{
      dueList.innerHTML='';
    }
  }
  
  let html='';
  if(pending.length){
    html+='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;margin-top:8px">Sealed letters</div>';
    pending.forEach(l=>{
      const deliverDate=new Date(l.deliverAt).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
      html+='<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">'+
        '<div><div style="font-size:12px;color:var(--tx)">Letter from Day '+l.writtenDay+'</div><div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">Opens '+deliverDate+'</div></div>'+
        '<button class="btn" style="width:auto;padding:4px 8px;font-size:10px;background:none;border:none;color:var(--tx3)" onclick="deleteLetter('+l.id+')" aria-label="Close">&#215;</button>'+
      '</div>';
    });
  }
  if(delivered.length){
    html+='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;margin-top:10px">Opened</div>';
    delivered.slice(0,5).forEach(l=>{
      html+='<div style="background:var(--bg3);border:1px solid var(--bd);border-radius:8px;padding:10px 12px;margin-bottom:6px;cursor:pointer" onclick="deliverLetter('+l.id+')">'+
        '<div style="font-size:12px;color:var(--tx)">Letter from Day '+l.writtenDay+' · read</div>'+
        '<div style="font-size:11px;color:var(--tx3);margin-top:2px;font-style:italic">'+_escFew(String(l&&l.text||'').slice(0,100))+'...</div>'+
      '</div>';
    });
  }
  list.innerHTML=html;
}


// Check for letters ready to be delivered (call on home open)
function checkLettersDue(){
  const letters=ls('totry_letters')||[];
  const now=Date.now();
  const dueNow=letters.filter(l=>!l.delivered&&new Date(l.deliverAt).getTime()<=now);
  if(dueNow.length){
    // Show a notification toast
    const today=new Date().toLocaleDateString('en-AU');
    const lastNotice=ls('totry_letter_notice');
    if(lastNotice!==today){
      ls('totry_letter_notice',today);
      setTimeout(()=>{
        showToast('Letter from past you ready','You have '+dueNow.length+' letter'+(dueNow.length>1?'s':'')+' to open. Find it in Settings.');
      },1500);
    }
  }
}


// ═══════════════════════════════════════════════════
// PASS 4: CONTEXTUAL SCRIPTURE MOMENTS
// ═══════════════════════════════════════════════════

async function showAIMorningSentence(){
  const card=document.getElementById('ai-morning-card');
  const textEl=document.getElementById('ai-morning-text');
  if(!card||!textEl)return;
  
  // Check if we have today's sentence cached
  const today=new Date().toLocaleDateString('en-AU');
  const cached=ls('totry_ai_morning_'+today);
  
  if(cached){
    card.style.display='block';
    textEl.textContent=cached;
    return;
  }
  
  // Don't retry on every tab switch — only attempt ONCE per day even on failure.
  // A failed attempt today sets a marker so navigation doesn't spam the AI.
  if(window.__aiMorningAttempted || ls('totry_ai_morning_tried_'+today)){
    // Already tried this session/day and it didn't succeed — keep card hidden, no re-fire
    if(!cached) card.style.display='none';
    return;
  }
  window.__aiMorningAttempted = true;
  ls('totry_ai_morning_tried_'+today, '1');
  
  card.style.display='block';
  textEl.innerHTML='<span class="pulsing">Reading your data, writing your sentence...</span>';
  
  // Gather context
  const identity=ls('totry_identity')||'';
  const season=ls('totry_season')||'Building';
  const checkins=ls('totry_checkins')||[];
  const recent=checkins[0];
  const dayCount=getDayCount();
  loadV();
  const wins=vices.reduce((s,v)=>s+(v.w||0),0);
  const total=vices.reduce((s,v)=>s+(v.total||0),0);
  const journal=safeJournal()[0];                       // never a flagged entry — see safeJournal()
  
  const why=ls('totry_why')||'';
  let context='Day '+dayCount+'. Season: '+season+'.';
  if(identity)context+=' Becoming: '+identity+'.';
  if(why)context+=' Their why: "'+why+'".';
  // Per-vice clean streaks
  if(vices.length){
    const streaks=vices.map(v=>v.kind==='letgo'?(v.n+' — day '+viceCleanDays(v)+' of letting go'):(v.n+' '+viceCleanDays(v)+'d clean')).join(', ');
    context+=' Streaks: '+streaks+'.';
  }
  if(wins>0||total>0)context+=' Vice wins: '+wins+', losses: '+(total-wins)+'.';
  if(recent)context+=' Yesterday felt: P'+recent.physical+'/E'+recent.emotional+'/S'+recent.spiritual+'.';
  if(journal&&journal.text)context+=' Last journal: "'+String(journal.text).slice(0,150)+'..."';
  
  try{
    const prompt='Write ONE personal sentence (15-25 words) for this person\'s morning. Direct. Warm. Like a close friend who knows them. Reference their state. No fluff. NO opening like "Today" or "Remember". Start with a verb or noun. Their state: '+context;
    const response=await api('You are this person\'s closest friend who happens to be wise — warm, real, and willing to say something with substance.',[],prompt,700);
    if(response&&response.trim()){
      const sentence=response.trim().replace(/^["\'\u201c\u201d]+|["\'\u201c\u201d]+$/g,'');
      textEl.textContent=sentence;
      ls('totry_ai_morning_'+today,sentence);
      // Clear the "tried" marker since we succeeded — allows refresh to work
      localStorage.removeItem('totry_ai_morning_tried_'+today);
    }else{
      card.style.display='none';
    }
  }catch(e){
    card.style.display='none';
  }
}

function refreshAIMorning(){
  // Force regenerate
  const today=new Date().toLocaleDateString('en-AU');
  localStorage.removeItem('totry_ai_morning_'+today);
  showAIMorningSentence();
}

// ═══════════════════════════════════════════════════
// PASS 4: SHAREABLE DAY-X ARTIFACTS (social media)
// ═══════════════════════════════════════════════════
function generateShareCard(){
  // The share flow is now a single checkbox customizer — you pick exactly what to include and
  // get ONE card built to your choices (instead of a few near-identical presets).
  haptic('tap');
  openShareCustomizer();
}

// ── SHARE CARD CUSTOMIZER — pick exactly which fields go public ─────
function openShareCustomizer(){
  document.querySelector('.modal-bg.open')?.remove();
  
  // Load saved preferences (default: most things on, some off for privacy)
  const prefs = ls('totry_share_prefs') || {
    showDay: true,
    showIdentity: true,
    showStreak: true,
    showWins: true,
    showWorkout: true,
    showJournalCount: false,
    showHabits: false,
    showFinance: false,
    showPrayers: false,
    showAffirmation: true,
    showCatchphrase: true,
  };
  
  loadV();
  const dayCount = getDayCount();
  const longestStreak = vices.length ? Math.max(...vices.map(v => viceCleanDays(v))) : 0;
  const totalWins = vices.reduce((s,v)=>s+(v.w||0),0);
  const today = new Date().toLocaleDateString('en-AU');
  const todayWorkout = (ls('totry_workouts')||[]).find(w => w.date === today || new Date(w.ts||'').toLocaleDateString('en-AU') === today);
  const journalCount = (ls('totry_journal')||[]).length;
  const habitsToday = (function(){loadH();const ti=tIdx();return habits.filter(h=>h.d[ti]===1).length;})();
  const habitsTotal = habits.length;
  loadF();
  const debtPaid = debts.reduce((s,d)=>s+d.p, 0);
  const openPrayers = (ls('totry_prayers')||[]).filter(p=>p.status==='open').length;
  const answeredPrayers = (ls('totry_prayers')||[]).filter(p=>p.status==='answered').length;
  const identity = ls('totry_identity')||'';
  
  // Build the field list — only show fields with real data
  const fields = [
    {key:'showDay', icon:'📅', label:'Day '+dayCount, desc:'Days into your journey'},
    {key:'showCatchphrase', icon:'✨', label:'"The least we can do everyday, is to try."', desc:'The catchphrase'},
    longestStreak > 0 ? {key:'showStreak', icon:'🔥', label:longestStreak+' day clean streak', desc:'Your longest current vice streak'} : null,
    totalWins > 0 ? {key:'showWins', icon:'⚔️', label:totalWins+' urges fought', desc:'Total wins to date'} : null,
    identity ? {key:'showIdentity', icon:'👤', label:'Identity statement', desc:'Who you\'re becoming'} : null,
    todayWorkout ? {key:'showWorkout', icon:'💪', label:'Today\'s workout', desc:(todayWorkout.splitFocus || todayWorkout.type || 'Trained today')} : null,
    habitsTotal > 0 ? {key:'showHabits', icon:'✅', label:'Habits: '+habitsToday+'/'+habitsTotal+' today', desc:'How you showed up today'} : null,
    journalCount > 0 ? {key:'showJournalCount', icon:'📝', label:journalCount+' journal entries', desc:'Times you reflected in writing'} : null,
    debtPaid > 0 ? {key:'showFinance', icon:'💰', label:curSym()+Math.round(debtPaid).toLocaleString()+' debt paid', desc:'Money fight progress'} : null,
    (openPrayers + answeredPrayers) > 0 ? {key:'showPrayers', icon:'🙏', label:answeredPrayers+' prayers I marked answered', desc:'Out of '+openPrayers+' active · only YOU log these'} : null,
    {key:'showAffirmation', icon:'💭', label:'A motivational close', desc:'A short affirming line'},
  ].filter(Boolean);
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.style.alignItems = 'center';
  
  m.innerHTML = '<div class="modal" style="max-height:92vh"><div class="modal-handle"></div>' +
    '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px">Customize · what goes public</div>' +
    '<h3 style="margin-bottom:6px">Pick what to share</h3>' +
    '<p style="font-size:12px;color:var(--tx3);line-height:1.6;margin-bottom:14px">Tap to toggle. Only what\'s ticked appears on the share card. Your private data stays private.</p>' +
    '<div id="share-customizer-fields" style="margin-bottom:14px">' +
      fields.map((f, i) => 
        '<label class="share-field-row" data-key="' + f.key + '" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg3);border:1px solid var(--bd);border-radius:8px;margin-bottom:6px;cursor:pointer;' + (prefs[f.key] ? 'border-color:var(--go);background:linear-gradient(135deg,rgba(200,169,110,0.05),transparent)' : '') + '">' +
          '<input type="checkbox" data-field="' + f.key + '" ' + (prefs[f.key] ? 'checked' : '') + ' style="width:18px;height:18px;cursor:pointer">' +
          '<div style="font-size:20px;line-height:1">' + f.icon + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:13px;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + f.label + '</div>' +
            '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);margin-top:2px">' + f.desc + '</div>' +
          '</div>' +
        '</label>'
      ).join('') +
    '</div>' +
    '<button class="btn primary" onclick="createCustomShareCard()" style="margin-bottom:8px">Generate share card</button>' +
    '<button class="btn" onclick="closeModal(this)">Back</button>' +
  '</div>';
  document.body.appendChild(m);
  
  // Wire up live border-color toggle on checkbox change
  setTimeout(() => {
    document.querySelectorAll('.share-field-row input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const row = e.target.closest('.share-field-row');
        if(e.target.checked){
          row.style.borderColor = 'var(--go)';
          row.style.background = 'linear-gradient(135deg,rgba(200,169,110,0.05),transparent)';
        } else {
          row.style.borderColor = 'var(--bd)';
          row.style.background = 'var(--bg3)';
        }
      });
    });
  }, 50);
}

function createCustomShareCard(){
  // Read selections + save as defaults
  const prefs = {};
  document.querySelectorAll('.share-field-row input[type="checkbox"]').forEach(cb => {
    prefs[cb.dataset.field] = cb.checked;
  });
  ls('totry_share_prefs', prefs);
  
  // Close customizer
  document.querySelector('.modal-bg.open')?.remove();
  
  // Build the custom share card — load the app's fonts first so it matches the app's look.
  const draw = () => renderCustomShareCard(prefs);
  if(document.fonts && document.fonts.load){
    Promise.all([
      document.fonts.load('300 200px "Cormorant Garamond"'),
      document.fonts.load('italic 400 56px "Cormorant Garamond"'),
      document.fonts.load('500 14px "DM Mono"'),
    ]).then(draw).catch(draw);
  } else { draw(); }
}

function renderCustomShareCard(prefs){
  const dayCount = getDayCount();
  const identity = ls('totry_identity') || '';
  loadV();
  const longestStreak = vices.length ? Math.max(...vices.map(v => viceCleanDays(v))) : 0;
  const totalWins = vices.reduce((s,v)=>s+(v.w||0),0);
  const today = new Date().toLocaleDateString('en-AU');
  const todayWorkout = (ls('totry_workouts')||[]).find(w => w.date === today || new Date(w.ts||'').toLocaleDateString('en-AU') === today);
  const journalCount = (ls('totry_journal')||[]).length;
  loadH();
  const ti = tIdx();
  const habitsToday = habits.filter(h => h.d[ti] === 1).length;
  const habitsTotal = habits.length;
  loadF();
  const debtPaid = debts.reduce((s,d)=>s+d.p, 0);
  const answeredPrayers = (ls('totry_prayers')||[]).filter(p=>p.status==='answered').length;
  
  // 1080x1080 magazine-style canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Background layers — same as createShareCard for visual consistency
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 1080);
  bgGrad.addColorStop(0, '#0E0E11'); bgGrad.addColorStop(0.5, '#16161B'); bgGrad.addColorStop(1, '#0A0A0D');
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, 1080, 1080);
  
  const goldGlow = ctx.createRadialGradient(820, 220, 60, 820, 220, 700);
  goldGlow.addColorStop(0, 'rgba(200,169,110,0.18)'); goldGlow.addColorStop(0.4, 'rgba(200,169,110,0.06)'); goldGlow.addColorStop(1, 'rgba(200,169,110,0)');
  ctx.fillStyle = goldGlow; ctx.fillRect(0, 0, 1080, 1080);
  
  const purpleGlow = ctx.createRadialGradient(220, 880, 60, 220, 880, 600);
  purpleGlow.addColorStop(0, 'rgba(140,107,182,0.12)'); purpleGlow.addColorStop(1, 'rgba(140,107,182,0)');
  ctx.fillStyle = purpleGlow; ctx.fillRect(0, 0, 1080, 1080);
  
  // Film grain
  for(let i = 0; i < 2400; i++){
    ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.02) + ')';
    ctx.fillRect(Math.random() * 1080, Math.random() * 1080, 1, 1);
  }
  
  // Border + corners
  ctx.strokeStyle = 'rgba(200,169,110,0.22)'; ctx.lineWidth = 1;
  ctx.strokeRect(48, 48, 984, 984);
  if(false){
  ctx.strokeStyle = 'rgba(200,169,110,0.5)'; ctx.lineWidth = 2;
  const cornerSize = 20;
  [[60,60],[1020,60],[60,1020],[1020,1020]].forEach(([x,y]) => {
    ctx.beginPath();
    if(x < 540 && y < 540){ ctx.moveTo(x+cornerSize, y); ctx.lineTo(x, y); ctx.lineTo(x, y+cornerSize); }
    else if(x > 540 && y < 540){ ctx.moveTo(x-cornerSize, y); ctx.lineTo(x, y); ctx.lineTo(x, y+cornerSize); }
    else if(x < 540 && y > 540){ ctx.moveTo(x+cornerSize, y); ctx.lineTo(x, y); ctx.lineTo(x, y-cornerSize); }
    else { ctx.moveTo(x-cornerSize, y); ctx.lineTo(x, y); ctx.lineTo(x, y-cornerSize); }
    ctx.stroke();
  });
  }
  
  // Wordmark
  ctx.textAlign = 'center'; ctx.fillStyle = '#C8A96E';
  ctx.font = '300 56px "Cormorant Garamond", Georgia, serif';
  const toW = ctx.measureText('To').width;
  ctx.font = 'italic 300 56px "Cormorant Garamond", Georgia, serif';
  const tryW = ctx.measureText('Try').width;
  const wordmarkGap = 14;
  const totalW = toW + wordmarkGap + tryW;
  ctx.font = '300 56px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
  ctx.fillText('To', 540 - totalW/2, 130);
  ctx.font = 'italic 300 56px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Try', 540 - totalW/2 + toW + wordmarkGap, 130);
  
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(200,169,110,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(380, 180); ctx.lineTo(440, 180);
  ctx.moveTo(640, 180); ctx.lineTo(700, 180); ctx.stroke();
  
  ctx.fillStyle = 'rgba(200,169,110,0.7)';
  ctx.font = '500 14px "DM Mono", monospace';
  const dateStr = new Date().toLocaleDateString('en-AU',{weekday:'long', day:'numeric', month:'long', year:'numeric'}).toUpperCase();
  ctx.fillText(dateStr, 540, 185);
  
  // ── BODY — render only selected fields ──
  // We'll layer them top-to-bottom starting at y=260
  let y = 280;
  const drawSection = (callback) => { y = callback(y); };
  
  // Hero day count (always considered if showDay)
  if(prefs.showDay){
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '500 13px "DM Mono", monospace';
    ctx.fillText('· DAY OF TRYING ·', 540, y);
    y += 30;
    
    ctx.shadowColor = 'rgba(200,169,110,0.4)'; ctx.shadowBlur = 50;
    ctx.fillStyle = '#E8D4A0';
    ctx.font = '200 220px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(dayCount.toString(), 540, y + 160);
    ctx.shadowBlur = 0;
    y += 200;
  }
  
  // Stats row (mid-card data)
  const statChips = [];
  if(prefs.showStreak && longestStreak > 0) statChips.push({big: longestStreak + 'd', label: 'CLEAN'});
  if(prefs.showWins && totalWins > 0) statChips.push({big: totalWins, label: 'WINS'});
  if(prefs.showHabits && habitsTotal > 0) statChips.push({big: habitsToday + '/' + habitsTotal, label: 'HABITS'});
  if(prefs.showJournalCount && journalCount > 0) statChips.push({big: journalCount, label: 'JOURNAL'});
  if(prefs.showFinance && debtPaid > 0) statChips.push({big: curSym() + (debtPaid >= 1000 ? Math.round(debtPaid/1000) + 'k' : Math.round(debtPaid)), label: 'PAID OFF'});
  if(prefs.showPrayers && answeredPrayers > 0) statChips.push({big: answeredPrayers, label: 'ANSWERED'});
  
  if(statChips.length > 0){
    y += 30;
    const chipW = Math.min(180, (920 - (statChips.length - 1) * 20) / statChips.length);
    const startX = 540 - (statChips.length * chipW + (statChips.length - 1) * 20) / 2 + chipW/2;
    statChips.forEach((s, i) => {
      const x = startX + i * (chipW + 20);
      // Pill background
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = 'rgba(200,169,110,0.3)'; ctx.lineWidth = 1;
      const pillY = y - 10;
      ctx.beginPath();
      const r = 14;
      ctx.moveTo(x - chipW/2 + r, pillY);
      ctx.lineTo(x + chipW/2 - r, pillY);
      ctx.arcTo(x + chipW/2, pillY, x + chipW/2, pillY + r, r);
      ctx.lineTo(x + chipW/2, pillY + 80 - r);
      ctx.arcTo(x + chipW/2, pillY + 80, x + chipW/2 - r, pillY + 80, r);
      ctx.lineTo(x - chipW/2 + r, pillY + 80);
      ctx.arcTo(x - chipW/2, pillY + 80, x - chipW/2, pillY + 80 - r, r);
      ctx.lineTo(x - chipW/2, pillY + r);
      ctx.arcTo(x - chipW/2, pillY, x - chipW/2 + r, pillY, r);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Big number
      ctx.fillStyle = '#E8D4A0';
      ctx.font = '400 30px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(s.big, x, pillY + 36);
      // Label
      ctx.fillStyle = 'rgba(200,169,110,0.7)';
      ctx.font = '500 10px "DM Mono", monospace';
      ctx.fillText(s.label, x, pillY + 60);
    });
    y += 100;
  }
  
  // Identity / workout / quote area
  if(prefs.showIdentity && identity){
    y += 16;
    ctx.fillStyle = 'rgba(200,169,110,0.7)';
    ctx.font = '500 11px "DM Mono", monospace';
    ctx.fillText('I AM BECOMING', 540, y);
    y += 28;
    ctx.fillStyle = '#F5EBD2';
    ctx.font = 'italic 400 26px "Cormorant Garamond", Georgia, serif';
    const cleaned = identity.replace(/^I am becoming a person who /i, '...a person who ');
    // wrap to ~50 chars per line
    const words = cleaned.split(' ');
    const lines = [];
    let line = '';
    words.forEach(w => {
      const test = line + w + ' ';
      if(ctx.measureText(test).width > 800 && line){ lines.push(line.trim()); line = w + ' '; }
      else line = test;
    });
    if(line) lines.push(line.trim());
    lines.slice(0, 3).forEach(l => { ctx.fillText(l, 540, y); y += 36; });
    y += 8;
  }
  
  if(prefs.showWorkout && todayWorkout){
    y += 12;
    ctx.fillStyle = 'rgba(200,169,110,0.7)';
    ctx.font = '500 11px "DM Mono", monospace';
    ctx.fillText('TRAINED TODAY', 540, y);
    y += 24;
    ctx.fillStyle = '#F5EBD2';
    ctx.font = '400 22px "Cormorant Garamond", Georgia, serif';
    const wtxt = todayWorkout.splitFocus || todayWorkout.type || 'A training session';
    ctx.fillText(wtxt.length > 36 ? wtxt.slice(0,36)+'…' : wtxt, 540, y);
    y += 32;
  }
  
  // Affirmation line
  if(prefs.showAffirmation){
    const affirms = ls('totry_affirms') || [];
    const affirm = affirms.length ? affirms[Math.floor(Math.random() * affirms.length)] : 'I showed up today.';
    y += 14;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'italic 300 24px "Cormorant Garamond", Georgia, serif';
    const aWords = affirm.split(' ');
    const aLines = [];
    let aLine = '';
    aWords.forEach(w => {
      const test = aLine + w + ' ';
      if(ctx.measureText(test).width > 880 && aLine){ aLines.push(aLine.trim()); aLine = w + ' '; }
      else aLine = test;
    });
    if(aLine) aLines.push(aLine.trim());
    aLines.slice(0, 2).forEach(l => { ctx.fillText(l, 540, y); y += 32; });
  }
  
  // ── BOTTOM CATCHPHRASE (always or per pref) ──
  if(prefs.showCatchphrase){
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(120, 880, 840, 130);
    ctx.strokeStyle = 'rgba(200,169,110,0.2)'; ctx.lineWidth = 0.8;
    ctx.strokeRect(120, 880, 840, 130);
    
    ctx.fillStyle = 'rgba(200,169,110,0.15)';
    ctx.font = '400 80px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'left'; ctx.fillText('"', 145, 935);
    ctx.textAlign = 'right'; ctx.fillText('"', 945, 980);
    ctx.textAlign = 'center';
    
    ctx.fillStyle = '#F5EBD2';
    ctx.font = 'italic 300 32px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('The least we can do everyday,', 540, 932);
    ctx.fillStyle = '#C8A96E';
    ctx.font = 'italic 400 34px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('is to try.', 540, 978);
  }
  
  // Signature
  ctx.fillStyle = 'rgba(200,169,110,0.55)';
  ctx.font = '500 10px "DM Mono", monospace';
  ctx.fillText('TO · TRY · BY · ALFRED · JOHN', 540, 1055);
  
  // Output
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const m = document.createElement('div');
    m.className = 'modal-bg open';
    m.style.alignItems = 'center';
    m.innerHTML = '<div class="modal" style="max-width:90vw;padding:16px"><div class="modal-handle"></div>' +
      '<div style="text-align:center;margin-bottom:14px"><img loading="lazy" decoding="async" src="' + url + '" style="max-width:100%;max-height:60vh;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5)"></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<button class="btn primary" onclick="downloadShareCard(\'' + url + '\')">Download</button>' +
        (navigator.share ? '<button class="btn" onclick="shareCardNative(\'' + url + '\')">Share to apps</button>' : '') +
        '<button class="btn" onclick="closeModal(this);URL.revokeObjectURL(\'' + url + '\')">Close</button>' +
      '</div></div>';
    document.body.appendChild(m);
    haptic('celebrate');
  }, 'image/png', 0.95);
}

function createShareCard(style){
  document.querySelector('.modal-bg.open')?.remove();
  // Theme: respect the user's last choice; default dark.
  const theme = (ls('totry_share_theme')) || 'dark';
  // Ensure the app's real fonts are loaded before drawing, so the card matches the app
  // (this is what stops it looking generic / "vibe coded").
  const drawWith = () => _renderShareCanvas(style, theme);
  if(document.fonts && document.fonts.load){
    Promise.all([
      document.fonts.load('300 200px "Cormorant Garamond"'),
      document.fonts.load('italic 400 60px "Cormorant Garamond"'),
      document.fonts.load('500 14px "DM Mono"'),
      document.fonts.load('400 24px "Cormorant Garamond"'),
    ]).then(drawWith).catch(drawWith);
  } else { drawWith(); }
}

function _shareThemeColors(theme){
  if(theme === 'light'){
    return {
      bgTop:'#F4EFE6', bgMid:'#EFE8DB', bgBot:'#E8DFCE',
      glowGold:'rgba(176,141,87,0.10)', glowPurple:'rgba(120,90,150,0.05)',
      ink:'#2A2620', ink2:'rgba(42,38,32,0.7)', ink3:'rgba(42,38,32,0.45)',
      gold:'#9A7B43', goldSoft:'rgba(154,123,67,0.5)', line:'rgba(42,38,32,0.18)',
    };
  }
  return {
    bgTop:'#0E0E11', bgMid:'#16161B', bgBot:'#0A0A0D',
    glowGold:'rgba(200,169,110,0.16)', glowPurple:'rgba(140,107,182,0.10)',
    ink:'#F2EEE6', ink2:'rgba(255,255,255,0.72)', ink3:'rgba(255,255,255,0.42)',
    gold:'#D9C18C', goldSoft:'rgba(200,169,110,0.5)', line:'rgba(255,255,255,0.16)',
  };
}

// Word-wrap helper for canvas text.
function _wrapText(ctx, text, maxWidth){
  const words = (text||'').split(/\s+/);
  const lines = []; let cur = '';
  words.forEach(w => {
    const test = cur ? cur+' '+w : w;
    if(ctx.measureText(test).width > maxWidth && cur){ lines.push(cur); cur = w; }
    else cur = test;
  });
  if(cur) lines.push(cur);
  return lines;
}

function _renderShareCanvas(style, theme){
  const C = _shareThemeColors(theme);
  const dayCount=getDayCount();
  const identity=ls('totry_identity')||'';
  loadV();
  const wins=vices.reduce((s,v)=>s+(v.w||0),0);
  const today=new Date().toLocaleDateString('en-AU');
  const todayJournal=(ls('totry_journal')||[]).find(j=>new Date(j.ts).toLocaleDateString('en-AU')===today);
  const todayEvening=(ls('totry_evenings')||[]).find(e=>new Date(e.ts).toLocaleDateString('en-AU')===today);
  const todayWorkout=(ls('totry_workouts')||[]).find(w=>w.date===today||new Date(w.ts||'').toLocaleDateString('en-AU')===today);
  // Counted from totry_fight_log, NOT totry_vice_savings_log. The savings log is only appended when
  // savedNow > 0, and savedNow comes from a hardcoded seven-entry regex table (weed, vape,
  // cigarettes, alcohol, gambling, spending, junk food). Lust, porn, doomscrolling and gaming match
  // none of it — so the people this app was built for saw "0 urges fought and won" on their share
  // card no matter how many they had actually won. A win is a win whether or not it saved money.
  const todayWins=(ls('totry_fight_log')||[]).filter(f=>f&&f.won&&f.ts&&new Date(f.ts).toLocaleDateString('en-AU')===today).length;
  const longestStreak = vices.length ? Math.max(...vices.map(v => viceCleanDays(v))) : 0;
  // shareVerseFrom() stashes the exact verse the person tapped in window._verseCardOverride, and the
  // card used to ignore it — so "Make a card" on a mid-craving verse produced a card of whatever
  // verse happened to be in the header. Honour the override first.
  const _ov = (typeof window!=='undefined' && window._verseCardOverride) ? window._verseCardOverride : null;
  const verse = (_ov && _ov.t) || ls('totry_hdr_verse_text') || ls('totry_last_verse') || '';
  const verseRef = (_ov && _ov.r) || ls('totry_hdr_verse_ref') || ls('totry_last_verse_ref') || '';
  try{ if(_ov) window._verseCardOverride = null; }catch(_){}   // one card per tap; never leak into the next

  const canvas=document.createElement('canvas');
  canvas.width=1080; canvas.height=1080;
  const ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.textAlign = 'center';

  // ── Background: layered, quiet ──
  const bg = ctx.createLinearGradient(0,0,0,1080);
  bg.addColorStop(0,C.bgTop); bg.addColorStop(0.5,C.bgMid); bg.addColorStop(1,C.bgBot);
  ctx.fillStyle = bg; ctx.fillRect(0,0,1080,1080);
  const g1 = ctx.createRadialGradient(830,230,40,830,230,720);
  g1.addColorStop(0,C.glowGold); g1.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g1; ctx.fillRect(0,0,1080,1080);
  const g2 = ctx.createRadialGradient(220,900,40,220,900,640);
  g2.addColorStop(0,C.glowPurple); g2.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g2; ctx.fillRect(0,0,1080,1080);

  // Thin inner frame — editorial restraint.
  ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
  ctx.strokeRect(60,60,960,960);

  // ── Wordmark (To Try) in the app's serif ──
  const wmY = 150;
  ctx.font = '300 46px "Cormorant Garamond", Georgia, serif';
  const toW = ctx.measureText('To ').width;
  ctx.font = 'italic 400 46px "Cormorant Garamond", Georgia, serif';
  const tryW = ctx.measureText('Try').width;
  const totalW = toW + tryW;
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'left';
  ctx.font = '300 46px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('To ', 540 - totalW/2, wmY);
  ctx.fillStyle = C.gold;
  ctx.font = 'italic 400 46px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Try', 540 - totalW/2 + toW, wmY);
  ctx.textAlign = 'center';

  // Eyebrow date
  ctx.fillStyle = C.ink3;
  ctx.font = '500 13px "DM Mono", monospace';
  const dateStr = new Date().toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'}).toUpperCase();
  ctx.fillText(dateStr.split('').join('\u200a'), 540, 192);

  // ── STYLE BODY ──
  const eyebrow = (txt, y) => { ctx.fillStyle=C.gold; ctx.font='500 13px "DM Mono", monospace'; ctx.fillText(txt, 540, y); };
  const tick = (y) => { ctx.strokeStyle=C.goldSoft; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(500,y); ctx.lineTo(580,y); ctx.stroke(); };

  if(style === 'identity' && identity){
    eyebrow('\u00b7 WHO I\u2019M BECOMING \u00b7', 360);
    ctx.fillStyle = C.ink;
    ctx.font = 'italic 300 52px "Cormorant Garamond", Georgia, serif';
    const lines = _wrapText(ctx, '\u201c'+identity+'\u201d', 820);
    let y = 470 - (lines.length-1)*32;
    lines.slice(0,5).forEach(l => { ctx.fillText(l, 540, y); y += 64; });
    tick(y + 6);
    ctx.fillStyle = C.ink3; ctx.font='500 13px "DM Mono", monospace';
    ctx.fillText('DAY \u00b7 '+dayCount, 540, y + 50);
  }
  else if(style === 'evening' && (todayEvening || todayJournal)){
    eyebrow('\u00b7 WHAT I TRIED TODAY \u00b7', 330);
    const text = (todayEvening && (todayEvening.win || todayEvening.release)) || (todayJournal && todayJournal.text) || 'Showed up. Tried. That counts.';
    ctx.fillStyle = C.ink;
    ctx.font = '300 40px "Cormorant Garamond", Georgia, serif';
    const lines = _wrapText(ctx, '\u201c'+text+'\u201d', 840);
    let y = 470 - (lines.length-1)*30;
    lines.slice(0,7).forEach(l => { ctx.fillText(l, 540, y); y += 56; });
    tick(y + 10);
    ctx.fillStyle = C.ink3; ctx.font='500 13px "DM Mono", monospace';
    ctx.fillText('DAY \u00b7 '+dayCount, 540, y + 54);
  }
  else if(style === 'scripture' && verse){
    // The shared card is the most public thing this app produces. Hardcoding "TODAY'S WORD" undid the
    // whole multi-faith backbone on that one artifact \u2014 a Muslim sharing an ayah got a Christian label.
    eyebrow((typeof verseCardEyebrow==='function') ? verseCardEyebrow() : '\u00b7 TODAY\u2019S WORD \u00b7', 340);
    ctx.fillStyle = C.ink;
    ctx.font = 'italic 300 44px "Cormorant Garamond", Georgia, serif';
    const lines = _wrapText(ctx, '\u201c'+verse+'\u201d', 840);
    let y = 480 - (lines.length-1)*32;
    lines.slice(0,8).forEach(l => { ctx.fillText(l, 540, y); y += 60; });
    tick(y + 8);
    if(verseRef){ ctx.fillStyle=C.gold; ctx.font='500 14px "DM Mono", monospace'; ctx.fillText(verseRef.toUpperCase(), 540, y + 50); }
  }
  else if(style === 'wins' && wins > 0){
    eyebrow('\u00b7 BATTLES WON \u00b7', 300);
    ctx.fillStyle = C.gold;
    ctx.font = '200 240px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(wins.toString(), 540, 520);
    ctx.fillStyle = C.ink2;
    ctx.font = '300 34px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('urge'+(wins===1?'':'s')+' faced and overcome', 540, 600);
    if(longestStreak > 0){
      tick(660);
      ctx.fillStyle = C.ink3; ctx.font='500 13px "DM Mono", monospace';
      ctx.fillText(longestStreak+' DAY'+(longestStreak===1?'':'S')+' \u00b7 CLEAN \u00b7 STRONGEST CURRENT', 540, 700);
    }
  }
  else { // 'milestone' — the day count, refined
    eyebrow('\u00b7 STILL TRYING \u00b7', 320);
    ctx.fillStyle = C.gold;
    ctx.font = '200 300px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(dayCount.toString(), 540, 560);
    tick(620);
    ctx.fillStyle = C.ink2;
    ctx.font = '500 14px "DM Mono", monospace';
    ctx.fillText('DAYS \u00b7 OF \u00b7 THE \u00b7 JOURNEY', 540, 668);
    // Quiet bullet list of today's substance
    const reflections = [];
    if(todayWins > 0) reflections.push(todayWins + ' urge' + (todayWins===1?'':'s') + ' fought and won');
    if(todayWorkout) reflections.push('Trained \u2014 ' + (todayWorkout.splitFocus || todayWorkout.type || 'session'));
    if(todayJournal) reflections.push('Wrote honestly to myself');
    if(todayEvening) reflections.push('Reflected before sleep');
    if(reflections.length){
      let lineY = 770;
      ctx.font = '300 25px "Cormorant Garamond", Georgia, serif';
      reflections.slice(0,4).forEach(r => {
        ctx.fillStyle = C.gold;
        ctx.beginPath(); ctx.arc(330, lineY - 8, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = C.ink2; ctx.textAlign='left';
        ctx.fillText(r, 355, lineY); ctx.textAlign='center';
        lineY += 44;
      });
    } else {
      ctx.fillStyle = C.ink3;
      ctx.font = 'italic 300 27px "Cormorant Garamond", Georgia, serif';
      ctx.fillText('Still here. Still trying.', 540, 790);
    }
  }

  // ── Footer wordmark ──
  ctx.fillStyle = C.ink3;
  ctx.font = '500 11px "DM Mono", monospace';
  ctx.fillText('TO \u00b7 TRY \u00b7 BY \u00b7 ALFRED \u00b7 JOHN', 540, 1000);

  // Deliver — preview with theme toggle + download/share.
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const m = document.createElement('div');
    m.className = 'modal-bg open'; m.style.alignItems = 'center';
    const otherTheme = theme === 'dark' ? 'light' : 'dark';
    m.innerHTML = '<div class="modal" style="max-width:90vw;padding:16px"><div class="modal-handle"></div>' +
      '<div style="text-align:center;margin-bottom:14px"><img loading="lazy" decoding="async" src="' + url + '" style="max-width:100%;max-height:56vh;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.5)"></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<button class="btn primary" onclick="downloadShareCard(\'' + url + '\')">Download</button>' +
        (navigator.share ? '<button class="btn" onclick="shareCardNative(\'' + url + '\')">Share to apps</button>' : '') +
        '<button class="btn" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)" onclick="closeModal(this);URL.revokeObjectURL(\'' + url + '\');setShareTheme(\'' + otherTheme + '\');createShareCard(\'' + style + '\')">Switch to ' + otherTheme + ' background</button>' +
        '<button class="btn" onclick="closeModal(this);URL.revokeObjectURL(\'' + url + '\')" style="background:transparent;border:none;color:var(--tx3);font-size:13px">Close</button>' +
      '</div></div>';
    document.body.appendChild(m);
    haptic('celebrate');
  }, 'image/png', 0.95);
}
function setShareTheme(t){ ls('totry_share_theme', t); }

async function downloadShareCard(url){
  // Comes in as a data: URL from the canvas. Convert to a blob so the one save path handles it, since
  // a synthetic <a download> click is a no-op inside a WKWebView.
  try{
    const blob = await (await fetch(url)).blob();
    const ok = await SaveFile.save(blob, 'totry-day-'+getDayCount()+'.png', 'Day '+getDayCount());
    if(ok === null) return;   // they dismissed the share sheet — nothing to announce
    showToast(ok ? 'Ready' : 'Could not save', ok ? 'Save it or share it — your call.' : 'Try again in a moment.');
  }catch(_){ showToast('Could not save','Try again in a moment.'); }
}

async function shareCardNative(url){
  try{
    const blob=await(await fetch(url)).blob();
    const file=new File([blob],'totry-day-'+getDayCount()+'.png',{type:'image/png'});
    await navigator.share({
      title:'Day '+getDayCount()+' on ToTry',
      text:'Still trying. ToTry by Alfred John.',
      files:[file]
    });
  }catch(e){
    downloadShareCard(url);
  }
}


