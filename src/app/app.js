// ═══════════════════════════════════════════════════
// UNDO SYSTEM
// ═══════════════════════════════════════════════════
// Shows a snackbar for 5 seconds after a destructive/important action
// User can tap Undo to revert. Auto-dismisses after 5 sec.
let _undoTimer = null;
function showUndo(message, undoFn){
  // Remove any existing
  document.querySelector('.undo-snack')?.remove();
  if(_undoTimer) clearTimeout(_undoTimer);
  
  const snack = document.createElement('div');
  snack.className = 'undo-snack';
  // ESCAPE AT THE SINK. `message` reaches here as live HTML and two callers build it from a name
  // the person typed — 'Goal removed: '+removed.name (04-fight.js) and 'Removed '+removed.name
  // (24-review.js). v581 closed showToast the same way and did not look at this one, which is the
  // same shared-sink shape one function further along.
  const _m = (typeof _escFew === 'function') ? _escFew(message) : String(message == null ? '' : message);
  snack.innerHTML = 
    '<span class="undo-msg">' + _m + '</span>' +
    '<button class="undo-btn" id="_undo-btn">Undo</button>' +
    '<button class="undo-close" id="_undo-close" aria-label="Close">&#215;</button>';
  document.body.appendChild(snack);
  
  document.getElementById('_undo-btn').onclick = () => {
    try { undoFn(); } catch(e) { console.error(e); }
    snack.remove();
    if(_undoTimer) clearTimeout(_undoTimer);
    showToast('Undone','Reverted.');
  };
  document.getElementById('_undo-close').onclick = () => {
    snack.remove();
    if(_undoTimer) clearTimeout(_undoTimer);
  };
  
  _undoTimer = setTimeout(() => snack.remove(), 5000);
}

