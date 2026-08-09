I have read the real code. Here is the spec.

---

# SPEC — SOUL, SHARING & VOICE (v344)

## 1. WHAT IT IS

**(a) Verse cards** — turn the line you're carrying (today's word, or any saved one) into a card you can send, in *your* tradition's words with its real attribution.
**(b) Read-aloud** — the device's own voice reads the passage and then stops. No queue, no autoplay.
**The one moment:** you read something that lands, and instead of it evaporating you either *hear* it or *hand it to someone*.

> ⚠️ **The brief's "verified absent" is wrong for (a).** `_renderShareCanvas()` (line 29403) already has a `style === 'scripture'` branch (line 29488) that draws a genuinely good verse card. It is **unreachable**: the only caller anywhere is the milestone toast at line 27567, which passes `'milestone'`. It is also mono-faith (hardcoded eyebrow "TODAY'S WORD") and can only ever render `totry_hdr_verse_text`. So this spec **makes the existing renderer reachable, multi-faith and pointable at any line** rather than adding a second 200-line canvas. That is the honest, tight build. (b) is genuinely absent — no `speechSynthesis` anywhere.

---

## 2. EXACT ANCHORS

| # | Anchor (verbatim) | ~Line | Where |
|---|---|---|---|
| A1 | `.verse-pill p{font-family:'Cormorant Garamond',serif;font-size:12px;font-style:italic;color:var(--tx2);line-height:1.6;padding-right:36px}` | 94 | **REPLACE** (padding only) |
| A2 | `.vsave.saved{color:var(--go)}` | 97 | **AFTER** — new CSS |
| A3 | `<button class="vsave" id="vsave-btn" aria-label="Save this verse" onclick="event.stopPropagation();saveHdrVerse()">&#9825;</button>` | 1675 | **BEFORE** — share button |
| A4 | `    <div class="rv-ref" id="morning-verse-ref"></div>` | 1926 | **AFTER** — tools row |
| A5 | `      <div class="bible-chapter-title" id="br-chapter-title"></div>` | 2748 | **AFTER** — listen button |
| A6 | `  'totry_rosaries'` | 4603 | **REPLACE** (add keys) |
| A7 | `function _renderDailyPassage(el,t){` | 7650 | **REPLACE** whole 5-line function |
| A8 | `function _renderIslamToday(el){` | 7657 | **REPLACE** whole 5-line function |
| A9 | `function go(name){` + next line `  haptic("tap");` | 8043–8044 | **AFTER** `haptic("tap");` |
| A10 | `  document.querySelectorAll('.modal-bg.open').forEach(m=>m.remove());` (inside `theRelease`) | 10683 | **BEFORE** |
| A11 | `    el.innerHTML = '<div style="display:flex;align-items:flex-start;gap:8px">' +` … through `    '</div>';` (inside `renderSavedVerses`) | 13887–13894 | **REPLACE** block |
| A12 | `  const verse = ls('totry_hdr_verse_text') \|\| ls('totry_last_verse') \|\| '';` and the `verseRef` line under it | 29415–29416 | **REPLACE** both |
| A13 | `    eyebrow('\u00b7 TODAY\u2019S WORD \u00b7', 340);` | 29489 | **REPLACE** |
| A14 | `    m.innerHTML = '<div class="modal" style="max-width:90vw;padding:16px"><div class="modal-handle"></div>' +` … through `      '</div></div>';` (the **second** occurrence, inside `_renderShareCanvas`) | 29555–29562 | **REPLACE** block |
| A15 | `function downloadShareCard(url){` … through the closing `}` of `async function shareCardNative(url){` | 29569–29589 | **REPLACE** both functions |
| A16 | `// Tap-to-pick check-in dots` | 29592 | **BEFORE** — the new block |

---

## 3. THE CODE

### A1 — replace (padding only, two buttons now)
```css
.verse-pill p{font-family:'Cormorant Garamond',serif;font-size:12px;font-style:italic;color:var(--tx2);line-height:1.6;padding-right:62px}
```

### A2 — after `.vsave.saved{color:var(--go)}`
```css
.vshare{position:absolute;right:36px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--tx3);font-size:16px;padding:4px;line-height:1}
.vshare:active{color:var(--go)}
/* Listen / Make a card — quiet tools under a passage, never louder than the words. */
.verse-tools{display:flex;gap:8px;margin-top:12px}
.verse-tools .btn{flex:1;padding:8px 10px;font-size:12px;background:transparent;border:1px solid var(--go-bd);color:var(--go);font-weight:400}
/* No speech engine on this device → the button never appears, rather than lying. */
.no-tts [data-speak]{display:none}
```

### A3 — before the `.vsave` button (home verse pill)
```html
        <button class="vshare" id="vshare-btn" aria-label="Make a card from this verse" onclick="event.stopPropagation();shareVerseFrom('hdr-verse','hdr-ref')">&#10548;</button>
```

### A4 — after `<div class="rv-ref" id="morning-verse-ref"></div>`
```html
    <div class="verse-tools">
      <button class="btn" data-speak="morning-verse-text|morning-verse-ref" onclick="Speak.toggleFrom(this)" aria-pressed="false">&#9654; Listen</button>
      <button class="btn" onclick="shareVerseFrom('morning-verse-text','morning-verse-ref')">&#10022; Make a card</button>
    </div>
```

### A5 — after `<div class="bible-chapter-title" id="br-chapter-title"></div>`
```html
      <div class="verse-tools" style="margin:0 0 12px"><button class="btn" data-speak="br-chapter-title|br-verses" onclick="Speak.toggleFrom(this)" aria-pressed="false">&#9654; Listen to this chapter</button></div>
```

### A6 — SYNC_KEYS tail
```js
  'totry_rosaries',
  // v344 — read-aloud one-time honesty note + the card background you chose
  'totry_listen_hint_seen','totry_share_theme'
```

### A7 — replace `_renderDailyPassage`
```js
function _renderDailyPassage(el,t){
  const bank=(t==='hinduism')?VS_HINDU:(t==='buddhism')?VS_BUDDHIST:VS_SECULAR;
  const v=bank[_dailyIndex(bank.length)];
  const kind=(t==='hinduism')?'Today’s verse':(t==='buddhism')?'Today’s teaching':'Today’s reflection';
  el.innerHTML='<div class="card" style="text-align:center;padding:28px 20px"><div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:var(--tx3);margin-bottom:16px">'+kind+'</div><div id="today-passage-text" style="font-family:Cormorant Garamond,serif;font-size:23px;font-style:italic;line-height:1.65;color:var(--tx);margin-bottom:14px">“'+v.t+'”</div><div id="today-passage-ref" style="font-size:12px;color:var(--go)">— '+v.r+'</div>'+_verseToolsHTML('today-passage-text','today-passage-ref')+'</div><button class="btn" onclick="openScripture()" style="width:100%;margin-top:12px;background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)">Open the full '+curFaith().bookShort+' ›</button>';
}
```

### A8 — replace `_renderIslamToday`
```js
function _renderIslamToday(el){
  const a=VS_ISLAM[_dailyIndex(VS_ISLAM.length)];
  el.innerHTML='<div class="card" style="text-align:center;padding:22px 18px;margin-bottom:12px"><div style="font-family:DM Mono,monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:var(--tx3);margin-bottom:12px">Ayah for today</div><div id="today-ayah-text" style="font-family:Cormorant Garamond,serif;font-size:20px;font-style:italic;line-height:1.6;color:var(--tx);margin-bottom:10px">“'+a.t+'”</div><div id="today-ayah-ref" style="font-size:12px;color:var(--go)">— '+a.r+'</div>'+_verseToolsHTML('today-ayah-text','today-ayah-ref')+'</div><div id="salah-box">'+_readLoading()+'</div>';
  _loadSalah();
}
```

### A9 — inside `go()`, after `haptic("tap");`
```js
  // Never keep talking after the person has walked to another screen.
  if(window.Speak) window.Speak.stop();
```

### A10 — inside `theRelease()`, before the modal sweep
```js
  if(window.Speak) window.Speak.stop();
```

### A11 — replace the saved-verse item markup in `renderSavedVerses()`
```js
    el.innerHTML = '<div style="display:flex;align-items:flex-start;gap:8px">' +
      '<div style="flex:1;min-width:0">' +
        '<div class="sv-v" id="sv-v-' + i + '">\u201C' + _escFew(v.verse || '') + '\u201D</div>' +
        '<div class="sv-r" id="sv-r-' + i + '">' + _escFew(v.reference || '') + '</div>' +
        '<div class="sv-d">' + _escFew(v.date || '') + '</div>' +
        '<div class="verse-tools" style="margin-top:10px">' +
          '<button class="btn" data-speak="sv-v-' + i + '|sv-r-' + i + '" onclick="Speak.toggleFrom(this)" aria-pressed="false">\u25B6 Listen</button>' +
          '<button class="btn" onclick="shareVerseFrom(\'sv-v-' + i + '\',\'sv-r-' + i + '\')">\u2726 Make a card</button>' +
        '</div>' +
      '</div>' +
      '<button onclick="deleteSavedVerse(' + i + ')" aria-label="Remove verse" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer;padding:0 4px;line-height:1;flex-shrink:0">\u00D7</button>' +
    '</div>';
```
*(Also closes a pre-existing gap: saved-verse text came from an AI/API and was being injected raw. Now `_escFew`.)*

### A12 — replace the two verse-source lines in `_renderShareCanvas()`
```js
  // A card can be pointed at ANY line (today's word, a saved one) — not just the header verse.
  const _vo = window._verseCardOverride;
  const verse = (_vo && _vo.t) || ls('totry_hdr_verse_text') || ls('totry_last_verse') || '';
  const verseRef = (_vo && _vo.t) ? (_vo.r || '') : (ls('totry_hdr_verse_ref') || ls('totry_last_verse_ref') || '');
```

### A13 — replace the scripture eyebrow
```js
    eyebrow(verseCardEyebrow(), 340);
```

### A14 — replace the delivery modal block in `_renderShareCanvas()`
```js
    const _ios = (typeof isIOSSafari === 'function' && isIOSSafari());
    const _canShare = !!navigator.share;
    m.innerHTML = '<div class="modal" style="max-width:90vw;padding:16px"><div class="modal-handle"></div>' +
      '<div style="text-align:center;margin-bottom:14px"><img loading="lazy" decoding="async" src="' + url + '" style="max-width:100%;max-height:56vh;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.5)"></div>' +
      (_ios ? '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--tx3);text-align:center;letter-spacing:0.08em;margin-bottom:10px">OR PRESS AND HOLD THE IMAGE \u2192 ADD TO PHOTOS</div>' : '') +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        (_canShare ? '<button class="btn primary" onclick="shareCardNative(\'' + url + '\')">Share</button>' : '') +
        (_ios && _canShare ? '' : '<button class="btn' + (_canShare ? '' : ' primary') + '" onclick="downloadShareCard(\'' + url + '\')">Save the image</button>') +
        '<button class="btn" style="background:var(--bg3);border:1px solid var(--bd);color:var(--tx2)" onclick="closeModal(this);URL.revokeObjectURL(\'' + url + '\');setShareTheme(\'' + otherTheme + '\');createShareCard(\'' + style + '\')">Switch to ' + otherTheme + ' background</button>' +
        '<button class="btn" onclick="closeModal(this);URL.revokeObjectURL(\'' + url + '\')" style="background:transparent;border:none;color:var(--tx3);font-size:13px">Close</button>' +
      '</div></div>';
```

### A15 — replace `downloadShareCard` + `shareCardNative`
```js
function downloadShareCard(url){
  // iOS/WKWebView ignores <a download> on blob: URLs — in a standalone PWA the tap can even
  // navigate the app away. Say the true thing instead of pretending it saved.
  if(typeof isIOSSafari === 'function' && isIOSSafari()){
    haptic('light');
    showToast('Press and hold the image','Then choose \u201CAdd to Photos\u201D.');
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = 'totry-' + new Date().toISOString().slice(0,10) + '.png';
  document.body.appendChild(a); a.click(); a.remove();
  showToast('Saved','Share it wherever you want.');
}

async function shareCardNative(url){
  const name = 'totry-' + new Date().toISOString().slice(0,10) + '.png';
  const vo = window._verseCardOverride;
  const isVerse = !!(vo && vo.t);
  const title = isVerse ? (vo.r || 'A line worth carrying') : ('Day ' + getDayCount() + ' on ToTry');
  const text  = isVerse ? ('\u201C' + vo.t + '\u201D' + (vo.r ? ' \u2014 ' + vo.r : '')) : 'Still trying. ToTry by Alfred John.';
  try{
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], name, {type:'image/png'});
    // Some browsers expose navigator.share but refuse files. Ask first, then degrade to
    // text-only rather than dumping the person into a download they didn't ask for.
    if(navigator.canShare && !navigator.canShare({files:[file]})){
      await navigator.share({title:title, text:text});
      return;
    }
    await navigator.share({title:title, text:text, files:[file]});
  }catch(e){
    if(e && e.name === 'AbortError') return;   // they changed their mind. Say nothing.
    downloadShareCard(url);
  }
}
```

### A16 — the new block, before `// Tap-to-pick check-in dots`
```js
// ═══════════════════════════════════════════════════════════════════════════════
// VERSE CARDS + READ-ALOUD  (Soul \u00b7 sharing & voice)
// Cards reuse _renderShareCanvas('scripture') — the app's real serif/gold card — and simply
// let it be pointed at ANY line, in the person's own tradition. Read-aloud uses the device's
// own voice: it reads the passage and stops. Not a feed, not a player.
// ═══════════════════════════════════════════════════════════════════════════════

// The tradition names its own word. Never flattened to "scripture".
function verseCardEyebrow(){
  const t = (typeof faithTradition === 'function') ? faithTradition() : 'christianity';
  return ({
    christianity:'\u00b7 TODAY\u2019S WORD \u00b7',
    islam:'\u00b7 AN AYAH \u00b7',
    hinduism:'\u00b7 A VERSE \u00b7',
    buddhism:'\u00b7 A TEACHING \u00b7',
    secular:'\u00b7 A REFLECTION \u00b7'
  })[t] || '\u00b7 TODAY\u2019S WORD \u00b7';
}

// Shared markup for the two quiet tools under a passage. IDs only — no text in attributes.
function _verseToolsHTML(textId, refId){
  return '<div class="verse-tools">' +
    '<button class="btn" data-speak="' + textId + '|' + refId + '" onclick="Speak.toggleFrom(this)" aria-pressed="false">\u25B6 Listen</button>' +
    '<button class="btn" onclick="shareVerseFrom(\'' + textId + '\',\'' + refId + '\')">\u2726 Make a card</button>' +
  '</div>';
}

function shareVerseCard(text, ref){
  const strip = /^[\s\u201C\u201D\u2018\u2019"'\u2014\u2013-]+|[\s\u201C\u201D\u2018\u2019"']+$/g;
  text = String(text || '').replace(strip, '').trim();
  ref  = String(ref  || '').replace(strip, '').trim();
  if(!text){ showToast('Nothing to put on it','No line is showing yet \u2014 open one first.'); return; }
  window._verseCardOverride = { t:text, r:ref };
  haptic('tap');
  createShareCard('scripture');
}
// Read the line off the screen so user/API text never touches an inline attribute.
function shareVerseFrom(textId, refId){
  const te = document.getElementById(textId);
  const re = refId ? document.getElementById(refId) : null;
  shareVerseCard(te ? (te.textContent || '') : '', re ? (re.textContent || '') : '');
}

// ── READ-ALOUD ────────────────────────────────────────────────────────────────
// window.* so anything loading earlier (go(), theRelease()) can safely null-check it.
window.Speak = (function(){
  const SS = window.speechSynthesis;
  let chunks = [], i = 0, btn = null, on = false;
  const ok = () => !!(SS && typeof window.SpeechSynthesisUtterance === 'function');

  function paint(playing){
    if(!btn) return;
    const long = /chapter/i.test(btn.textContent || '');
    btn.innerHTML = playing ? '\u25A0 Stop' : (long ? '\u25B6 Listen to this chapter' : '\u25B6 Listen');
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
  }
  function stop(){
    if(ok()){ try{ SS.cancel(); }catch(_){ } }
    paint(false);
    on = false; chunks = []; i = 0; btn = null;
  }
  // Pull readable text out of live DOM nodes: drop verse numbers and our own controls.
  function textFrom(spec){
    const out = [];
    String(spec || '').split('|').forEach(id => {
      const el = document.getElementById(id.trim());
      if(!el) return;
      String(el.innerText || el.textContent || '').split('\n').forEach(line => {
        const s = line.replace(/^\s*\d+\s+/, '').trim();
        if(!s) return;
        if(/^(\u25B6|\u25A0|Listen|Stop|Make a card|Show study notes)/i.test(s)) return;
        out.push(/[.!?;:\u201D\u2019"']$/.test(s) ? s : s + '.');
      });
    });
    return out.join(' ');
  }
  // Chrome cuts a single utterance at ~15s. Sentence chunks under ~180 chars avoid it,
  // and make Stop feel instant.
  function cut(t){
    const parts = String(t || '').replace(/\s+/g,' ').trim().match(/[^.!?;:]+[.!?;:]*\s*/g) || [String(t || '')];
    const out = []; let cur = '';
    parts.forEach(p => { if((cur + p).length > 180 && cur){ out.push(cur.trim()); cur = p; } else cur += p; });
    if(cur.trim()) out.push(cur.trim());
    return out.filter(Boolean);
  }
  function voice(){
    try{
      const vs = SS.getVoices() || [];
      if(!vs.length) return null;                       // engine not ready → device default
      const want = (navigator.language || 'en').slice(0,2).toLowerCase();
      const pool = vs.filter(v => (v.lang || '').slice(0,2).toLowerCase() === want);
      const use = pool.length ? pool : vs;
      return use.find(v => v.localService) || use[0] || null;
    }catch(_){ return null; }
  }
  function next(){
    if(!on || i >= chunks.length){ stop(); return; }
    const u = new SpeechSynthesisUtterance(chunks[i++]);
    const v = voice(); if(v){ u.voice = v; u.lang = v.lang; }
    u.rate = 0.92; u.pitch = 1;
    u.onend = () => { if(on) next(); };
    u.onerror = () => { stop(); };
    try{ SS.speak(u); }catch(_){ stop(); }
  }
  function toggleFrom(el){
    if(!ok()){ showToast('No voice here','This browser can\u2019t read aloud on this device.'); return; }
    if(on){ stop(); haptic('light'); return; }
    const text = textFrom(el.getAttribute('data-speak'));
    if(!text){ showToast('Nothing to read','Open a passage first.'); return; }
    // iOS only starts speech from inside the tap itself — nothing async may come first.
    try{ SS.cancel(); SS.resume(); }catch(_){ }
    chunks = cut(text); i = 0; btn = el; on = true;
    paint(true); haptic('tap');
    next();
    // Told once, plainly: it is not a recording and it is not a person.
    if(!ls('totry_listen_hint_seen')){
      ls('totry_listen_hint_seen', true);
      setTimeout(() => showToast('That\u2019s your phone\u2019s own voice','Not a recording. It reads the passage, then stops.'), 900);
    }
  }
  try{
    if(SS) SS.getVoices();                                    // warm the async voice list
    document.addEventListener('visibilitychange', () => { if(document.hidden) stop(); });
    window.addEventListener('pagehide', stop);
    if(!ok() && document.body) document.body.classList.add('no-tts');
  }catch(_){ }
  return { toggleFrom:toggleFrom, stop:stop, supported:ok };
})();
```

**Helpers reused, not rewritten:** `_renderShareCanvas`, `createShareCard`, `_shareThemeColors`, `_wrapText`, `setShareTheme`, `isIOSSafari`, `isStandalone`, `_escFew`, `showToast`, `haptic`, `closeModal`, `ls`, `curFaith`, `faithTradition`, `getDayCount`. No new canvas code, no new modal shell, no new escape helper.

---

## 4. STORAGE KEYS

| Key | Shape | Notes |
|---|---|---|
| `totry_listen_hint_seen` | `true` | One-time honesty note. **Must be added to SYNC_KEYS** (A6). |
| `totry_share_theme` | `'dark'` \| `'light'` | **Already written today by `setShareTheme()` but missing from SYNC_KEYS** — now surfaced far more, so add it (A6). |

`window._verseCardOverride` is deliberately in-memory only (`{t,r}`) — a card subject is a moment, not state; persisting it would make the milestone card render a stale verse days later. It is intentionally *not* cleared after render so the "Switch to light/dark background" button re-renders the same line.

No key stores what was shared or how often. Nothing counts cards made.

---

## 5. DISCOVERY

1. **Home, the verse pill (hero)** — a small `⤴` sits left of the existing `♡`. One tap → the card. *This is the 30-second video: open app → tap ⤴ → card → Share.*
2. **Soul → Morning** — under the day's word, two chips: **`▶ Listen`** and **`✦ Make a card`**.
3. **Soul → Today in the Church / Today's verse / Ayah for today** (`openTodayAnchor()`) — same two chips, per tradition. Demonstrates the multi-faith swap on camera: change Settings → Faith → Islam, and the same card reads *AN AYAH* with the Qur'an reference.
4. **Soul → Bible → Saved** (and the per-tradition reader's saved list) — every saved verse now carries `▶ Listen` and `✦ Make a card`.
5. **Soul → Bible → Read** — one full-width **`▶ Listen to this chapter`** under the chapter title.

Buttons self-hide (`.no-tts`) where the device has no speech engine, so nobody taps a dead control.

---

## 6. RISKS — verify after applying

1. **Parse-check** the extracted `<script>` with `node --check`, and re-count `<div` vs `</div>` outside scripts (A3/A4/A5 add balanced markup only).
2. **`npm test`** — no core math touched; expect unchanged green.
3. **Bump `APP_VERSION` → `'v344'` (line 4258) and `CACHE` in `sw.js` together.**
4. **Home pill layout** — `padding-right` 36→62px. Check on a 320px-wide screen that the verse text doesn't collide with `⤴ ♡`, and that `nextVerse()` still fires on the pill body while both buttons `stopPropagation`.
5. **A14 is the *second* `m.innerHTML = '<div class="modal" style="max-width:90vw;padding:16px">'` in the file** (line ~29555, inside `_renderShareCanvas`). The first (~29344, inside `renderCustomShareCard`) must be left alone; it still benefits from the new `downloadShareCard`.
6. **Saved-verse escaping change** — verses containing `&` or quotes will now render as literal characters instead of being interpreted. Confirm existing saved entries still read correctly.
7. **iOS**: verify (a) `Share` is primary and opens the sheet with the image attached; (b) the long-press hint shows; (c) `Listen` starts on first tap with no prior tap (voice list cold) — if the very first tap is silent, it is `getVoices()` being empty; the second tap will work and the default voice is used. Do not "fix" this with an async voice wait — that breaks the gesture requirement.
8. **Speech must not survive navigation** — tap Listen in Morning, then hit a nav tab: it must go quiet (A9). Same for backgrounding the app (visibilitychange) and for `theRelease` (A10).
9. **Chrome desktop** — confirm a long Bible chapter keeps speaking past ~15s (chunking); confirm `Stop` halts within one chunk.
10. **`br-verses` innerText** — only readable while `#br-chapter-display` is visible; the Listen button lives inside it, so it can't be tapped before a chapter loads. Verify verse numbers are not spoken.
11. **Soul check** — nothing counts, nothing streaks, nothing unlocks. The listen button reads once and stops; the card is made on demand and the app says nothing about whether you shared it.