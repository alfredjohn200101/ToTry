import pw from '/Users/alfredjohn/Desktop/ToTry/node_modules/playwright/index.js';
const { chromium } = pw;
import fs from 'fs';
const html = fs.readFileSync('/Users/alfredjohn/Desktop/ToTry/index.html','utf8');
function extractFn(name){
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(html); if(!m) throw new Error('not found '+name);
  const open = html.indexOf('{', m.index); let depth=0,end=open;
  for(; end<html.length; end++){ const c=html[end]; if(c==='{')depth++; else if(c==='}'){depth--; if(depth===0){end++;break;}} }
  return html.slice(m.index,end);
}
const src = extractFn('loadTodaySplitCard');
const b = await chromium.launch();
const p = await b.newPage();
const logs=[];
p.on('console', m=>logs.push(m.text()));
await p.setContent(`<!doctype html><html><body>
<div id="pt-today-split-card"><div id="pt-today-split-name"></div><div id="pt-today-split-detail"></div></div>
<div id="home-today-mission-wrap"><div id="today-focus">Loading...</div><div id="today-detail">Loading...</div></div>
<script>
window.__fired = [];
window.__ls = {};
function ls(k,v){ if(v===undefined) return window.__ls[k]===undefined?null:window.__ls[k]; window.__ls[k]=v; return true; }
function getUserSplit(){ return [{},{},{},{},{},{},{}]; }
function tIdx(){ return 0; }
function isHevyUser(){ return true; }
function getTodayHevyRoutine(){ return window.__todayR; }
function getLastWeightForExercise(){ return null; }
function setTodayHevyRoutine(id){ window.__fired.push('setTodayHevyRoutine:'+id); }
function openHevyTodayPicker(){}
${src}
<\/script></body></html>`);

// ---- CASE A: the picker branch (no routine chosen today) — r.title and r.hevyId
await p.evaluate(()=>{
  window.__todayR = null;
  window.__ls['totry_hevy_routines'] = [
    { hevyId: "x'),window.__fired.push('HEVYID-XSS-EXECUTED'),setTodayHevyRoutine('y",
      title: 'Push Day<img src=x onerror="window.__fired.push(\'TITLE-XSS-EXECUTED\')">',
      exercises: [] }
  ];
  loadTodaySplitCard();
});
await p.waitForTimeout(300);
const a = await p.evaluate(()=>({
  fired: window.__fired.slice(),
  trainImgs: document.querySelectorAll('#pt-today-split-detail img').length,
  homeImgs: document.querySelectorAll('#today-detail img').length,
  btnOnclick: (document.querySelector('#pt-today-split-detail button')||{}).outerHTML,
  homeOnclick: (document.querySelector('#today-detail button')||{}).outerHTML
}));
console.log('CASE A (picker branch):', JSON.stringify(a,null,1));

// click the button to see whether the injected handler code runs
await p.evaluate(()=>{ window.__fired.length=0; const b=document.querySelector('#pt-today-split-detail button'); if(b) b.click(); });
console.log('CASE A click ->', await p.evaluate(()=>window.__fired.slice()));

// ---- CASE B: chosen-routine branch — ex.name and todayR.title
await p.evaluate(()=>{
  window.__fired.length=0;
  window.__todayR = { hevyId:'r1', title:'Legs', exercises:[{ name:'Squat<img src=y onerror="window.__fired.push(\'EXNAME-XSS-EXECUTED\')">', templateId:null, targetSets:3, targetReps:'5' }] };
  loadTodaySplitCard();
});
await p.waitForTimeout(300);
console.log('CASE B (chosen branch):', JSON.stringify(await p.evaluate(()=>({
  fired: window.__fired.slice(),
  trainImgs: document.querySelectorAll('#pt-today-split-detail img').length,
  detailText: document.getElementById('pt-today-split-detail').textContent.slice(0,80)
})),null,1));
console.log('console:', logs.join(' | '));
await b.close();
