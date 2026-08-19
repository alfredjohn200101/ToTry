// ── BIBLE FIND ────────────────────────────────────────────────
let curVerse={verse:'',reference:''};
async function findVerse(feeling){
  if(!feeling||!feeling.trim())return;
  const input=document.getElementById('bible-in');
  if(input)input.value=feeling;
  // SAFETY GATE — people type how they actually feel into "find me a verse". If that's a disclosure,
  // a verse is not the answer; a human is. Runs before any AI call.
  try{
    if(typeof detectCrisis==='function'){
      const _c = detectCrisis(feeling);
      if(_c){
        const _card=document.getElementById('bible-card'); const _load=document.getElementById('bible-loading');
        if(_load)_load.style.display='none';
        if(_card){ _card.style.display='block'; _card.innerHTML='<div id="bible-crisis-slot"></div>'; }
        if(typeof showCrisisResponse==='function') showCrisisResponse('bible-crisis-slot', _c);
        return;
      }
    }
  }catch(_){}
  const card=document.getElementById('bible-card');
  const loading=document.getElementById('bible-loading');
  if(card)card.style.display='none';
  if(loading)loading.style.display='block';

  let verses=null;

  // Build a candidate pool from our concordance based on detected themes.
  // The AI then picks/reflects on these REAL verses rather than guessing references.
  const themedCandidates = getThematicVerses(feeling);
  const candidatePool = themedCandidates.slice(0, 24).map(v =>
    '- ' + v.reference + ': "' + v.verse + '"'
  ).join('\n');
  
  const groundedPrompt = candidatePool ?
    `Their situation: "${feeling}"

Below are verses from a curated concordance that match this situation. PICK 6-8 of these (you may add 1-2 lesser-known verses from elsewhere in the Bible if they fit better). For each chosen verse, write a 1-2 sentence personal reflection connecting it to THIS exact situation.

CANDIDATES:
${candidatePool}

Return ONLY a raw JSON array. No markdown.
[{"reference":"Book Chapter:Verse (ESV)","verse":"exact verse text","reflection":"why this speaks to this situation"}, ...6-8 total]` :
    feeling;

  // Primary: AI grounded in concordance
  try{
    const raw = await api(BIBLE_SYS, [], groundedPrompt, 900);
    if(raw && raw.trim()){
      const m = raw.match(/\[[\s\S]*\]/);
      if(m){
        const parsed = JSON.parse(m[0]);
        if(Array.isArray(parsed) && parsed.length >= 2){
          verses = parsed.filter(v => v.verse && v.reference && v.verse.length > 10);
        }
      }
    }
  }catch(e){ console.log('AI fail:', e); }

  // Fallback: thematic verse library direct
  if(!verses || verses.length < 2){
    verses = getThematicVerses(feeling);
  }

  if(loading)loading.style.display='none';

  if(verses && verses.length){
    renderVerseResults(verses, feeling);
    if(card)card.style.display='block';
  } else if(card){
    card.style.display='block';
    card.innerHTML='<div style="text-align:center;padding:20px;font-family:Cormorant Garamond,serif;font-size:15px;font-style:italic;color:var(--tx3)">Could not find verses right now. Check your connection and try again.</div>';
  }
}
function saveCurrentVerse(){
  if(!curVerse.verse)return;
  const saved=ls('totry_sv')||[];
  if(!saved.find(v=>v.verse===curVerse.verse)){
    saved.unshift({...curVerse,date:new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'})});
    ls('totry_sv',saved.slice(0,200));renderSavedVerses();
  }
  const btn=document.getElementById('save-verse-btn');
  if(btn){btn.textContent='Saved \u2713';setTimeout(()=>{btn.textContent='Save this verse \u2661';},2000);}
}
function renderSavedVerses(){
  const saved = ls('totry_sv') || [];
  const list = document.getElementById('saved-verses-list');
  if(!list) return;
  // Clear before re-render — prevents stale entries when items are deleted
  list.innerHTML = '';
  if(!saved.length){
    list.innerHTML = '<p style="font-size:13px;color:var(--tx3);text-align:center;padding:20px">No saved verses yet.<br>Tap any verse to save it.</p>';
    return;
  }
  saved.forEach((v, i) => {
    const el = document.createElement('div');
    el.className = 'sv-item';
    el.innerHTML = '<div style="display:flex;align-items:flex-start;gap:8px">' +
      '<div style="flex:1">' +
        '<div class="sv-v">\u201C' + (v.verse || '') + '\u201D</div>' +
        '<div class="sv-r">' + (v.reference || '') + '</div>' +
        '<div class="sv-d">' + (v.date || '') + '</div>' +
      '</div>' +
      '<button onclick="deleteSavedVerse(' + i + ')" aria-label="Remove verse" style="background:none;border:none;color:var(--tx3);font-size:18px;cursor:pointer;padding:0 4px;line-height:1;flex-shrink:0">\u00D7</button>' +
    '</div>';
    list.appendChild(el);
  });
}

function deleteSavedVerse(idx){
  // A one-tap destructive action on a glyph a few pixels wide, with no undo anywhere in the app.
  if(!confirm('Remove this from your saved verses?')) return;
  const saved = ls('totry_sv') || [];
  if(idx < 0 || idx >= saved.length) return;
  const removed = saved[idx];
  saved.splice(idx, 1);
  ls('totry_sv', saved);
  // Force re-render immediately so indices realign
  renderSavedVerses();
  showUndo('Verse removed', () => {
    const cur = ls('totry_sv') || [];
    cur.splice(idx, 0, removed);
    ls('totry_sv', cur);
    renderSavedVerses();
  });
}


// ── BIBLE READER ──────────────────────────────────────────────


// ── MULTI-VERSE BIBLE FIND SUPPORT ────────────────────────────
function renderVerseResults(verses,feeling){
  const card=document.getElementById('bible-card');
  if(!card)return;
  card.innerHTML='';
  const hdr=document.createElement('div');
  hdr.style.cssText='font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:14px';
  hdr.textContent=verses.length+' verses for: '+feeling.slice(0,50)+(feeling.length>50?'...':'');
  card.appendChild(hdr);
  verses.forEach((v,i)=>{
    const block=document.createElement('div');
    block.className='verse-result-block';
    block.innerHTML=
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);letter-spacing:0.08em;margin-bottom:8px">'+v.reference+'</div>'+
      '<div style="font-family:Cormorant Garamond,serif;font-size:16px;color:var(--tx);line-height:1.65;font-style:italic;margin-bottom:10px">&#8220;'+v.verse+'&#8221;</div>'+
      '<div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:10px">'+v.reflection+'</div>'+
      '<div style="display:flex;gap:6px">'+
        '<button class="btn" style="flex:1;padding:7px;font-size:11px" onclick="saveVerseResult('+i+')">Save &#9825;</button>'+
        '<button class="btn" style="flex:1;padding:7px;font-size:11px" onclick="readVerseContext(\''+encodeURIComponent(v.reference)+'\')">Read in Bible &#8599;</button>'+
      '</div>';
    card.appendChild(block);
  });
  window._currentVerses=verses;
  const footer=document.createElement('div');
  footer.style.cssText='display:flex;gap:8px;margin-top:4px';
  footer.innerHTML='<button class="btn" style="flex:1" onclick="findVerse(document.getElementById(\'bible-in\').value)">Find more verses</button>';
  card.appendChild(footer);
}

function saveVerseResult(idx){
  const verses=window._currentVerses||[];
  const v=verses[idx];if(!v)return;
  const saved=ls('totry_sv')||[];
  if(!saved.find(sv=>sv.verse===v.verse)){
    saved.unshift({verse:v.verse,reference:v.reference,date:new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'})});
    ls('totry_sv',saved.slice(0,200));
    renderSavedVerses();
    showToast('Verse saved &#9825;',v.reference);
  }else{
    showToast('Already saved',v.reference);
  }
}

function readVerseContext(refEncoded){
  const ref=decodeURIComponent(refEncoded);
  const m=ref.match(/^(.+?)\s+(\d+):(\d+)/);
  if(!m)return;
  const bookName=m[1].trim();
  const chapter=parseInt(m[2]);
  if(typeof BIBLE_BOOKS==='undefined')return;
  const book=BIBLE_BOOKS.find(b=>b.name.toLowerCase()===bookName.toLowerCase()||
    b.name.toLowerCase().replace(/\s+/g,'')===bookName.toLowerCase().replace(/\s+/g,''));
  if(book){
    go('bible');
    setBibleTab('read');
    const bookSel=document.getElementById('br-book');
    const chapSel=document.getElementById('br-chapter');
    if(bookSel){bookSel.value=book.id;if(typeof onBibleBookChange==='function')onBibleBookChange(false);}
    if(chapSel)chapSel.value=chapter;
    if(typeof loadBibleChapter==='function')loadBibleChapter();
  }
}

// ── THEMATIC VERSE LIBRARY (offline fallback, 25 themes) ─────
// ── CURRENCY CONVERSION (Frankfurter API — free, no key, 200+ currencies) ──
const CURRENCY_CACHE_KEY = 'totry_currency_rates';
async function fetchCurrencyRates(base){
  base = base || 'AUD';
  const cache = ls(CURRENCY_CACHE_KEY);
  // Cache for 6 hours
  if(cache && cache.base === base && cache.fetched && Date.now() - cache.fetched < 6 * 3600000){
    return cache.rates;
  }
  try{
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=' + base);
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    if(d && d.rates){
      const rates = {...d.rates, [base]: 1};
      ls(CURRENCY_CACHE_KEY, {base, rates, fetched: Date.now()});
      return rates;
    }
  }catch(e){
    console.warn('[currency] fetch failed, using cache if any:', e);
  }
  return cache?.rates || {[base]: 1};
}

function getUserCurrency(){ return ls('totry_currency') || 'AUD'; }



// Maps events ("logWin", "logLoss", "PR", "overspend", etc) to relevant verses.
// Called from event handlers to show verses without user having to search.
const CONTEXTUAL_VERSES = {
  win: [
    {ref:'2 Timothy 2:22', text:'Flee youthful passions and pursue righteousness, faith, love, and peace, along with those who call on the Lord from a pure heart.'},
    {ref:'1 Corinthians 10:13', text:'God is faithful, and He will not let you be tempted beyond your ability, but with the temptation He will also provide the way of escape.'},
    {ref:'James 1:12', text:'Blessed is the man who remains steadfast under trial, for when he has stood the test he will receive the crown of life.'},
    {ref:'Romans 8:37', text:'In all these things we are more than conquerors through Him who loved us.'},
    {ref:'1 Corinthians 9:25', text:'Every athlete exercises self-control in all things. They do it to receive a perishable wreath, but we an imperishable.'},
    {ref:'2 Peter 1:6', text:'Supplement knowledge with self-control, and self-control with steadfastness, and steadfastness with godliness.'},
    {ref:'Galatians 5:22-23', text:'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.'},
    {ref:'Proverbs 16:32', text:'Whoever is slow to anger is better than the mighty, and he who rules his spirit than he who takes a city.'},
    {ref:'James 4:7', text:'Submit yourselves therefore to God. Resist the devil, and he will flee from you.'},
    {ref:'Hebrews 4:15-16', text:'We do not have a high priest who is unable to sympathize with our weaknesses... Let us then with confidence draw near to the throne of grace.'},
    {ref:'Romans 6:14', text:'For sin will have no dominion over you, since you are not under law but under grace.'},
    {ref:'Psalm 119:11', text:'I have stored up Your word in my heart, that I might not sin against You.'},
  ],
  loss: [
    {ref:'Proverbs 24:16', text:'For the righteous falls seven times and rises again, but the wicked stumble in times of calamity.'},
    {ref:'1 John 1:9', text:'If we confess our sins, He is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.'},
    {ref:'Lamentations 3:22-23', text:'The steadfast love of the Lord never ceases; His mercies never come to an end; they are new every morning.'},
    {ref:'Psalm 51:10', text:'Create in me a clean heart, O God, and renew a right spirit within me.'},
    {ref:'Romans 8:1', text:'There is therefore now no condemnation for those who are in Christ Jesus.'},
    {ref:'Micah 7:8', text:'Rejoice not over me, O my enemy; when I fall, I shall rise; when I sit in darkness, the Lord will be a light to me.'},
    {ref:'2 Corinthians 12:9', text:'My grace is sufficient for you, for My power is made perfect in weakness.'},
    {ref:'Psalm 103:12', text:'As far as the east is from the west, so far does He remove our transgressions from us.'},
    {ref:'Isaiah 1:18', text:'Though your sins are like scarlet, they shall be as white as snow; though they are red like crimson, they shall become like wool.'},
    {ref:'Hosea 14:4', text:'I will heal their apostasy; I will love them freely, for My anger has turned from them.'},
    {ref:'Joel 2:25', text:'I will restore to you the years that the swarming locust has eaten.'},
    {ref:'Philippians 3:13-14', text:'Forgetting what lies behind and straining forward to what lies ahead, I press on toward the goal.'},
  ],
  pr: [
    {ref:'1 Corinthians 9:27', text:'I discipline my body and keep it under control, lest after preaching to others I myself should be disqualified.'},
    {ref:'1 Timothy 4:8', text:'Bodily training is of some value, but godliness is of value in every way, holding promise for the present life and also for the life to come.'},
    {ref:'Isaiah 40:31', text:'They who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary.'},
    {ref:'Philippians 4:13', text:'I can do all things through Him who strengthens me.'},
    {ref:'Hebrews 12:1', text:'Let us also lay aside every weight, and sin which clings so closely, and let us run with endurance the race that is set before us.'},
    {ref:'2 Timothy 4:7', text:'I have fought the good fight, I have finished the race, I have kept the faith.'},
    {ref:'Psalm 18:32-34', text:'It is God who equipped me with strength and made my way blameless. He trains my hands for war.'},
    {ref:'Proverbs 24:5', text:'A wise man is full of strength, and a man of knowledge enhances his might.'},
    {ref:'Joshua 1:9', text:'Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.'},
    {ref:'Ephesians 6:10', text:'Be strong in the Lord and in the strength of His might.'},
    {ref:'Psalm 28:7', text:'The Lord is my strength and my shield; in Him my heart trusts, and I am helped.'},
  ],
  overspend: [
    {ref:'Hebrews 13:5', text:'Keep your life free from love of money, and be content with what you have, for He has said, "I will never leave you nor forsake you."'},
    {ref:'Proverbs 22:7', text:'The rich rules over the poor, and the borrower is the slave of the lender.'},
    {ref:'1 Timothy 6:6-8', text:'Godliness with contentment is great gain, for we brought nothing into the world, and we cannot take anything out of the world.'},
    {ref:'Matthew 6:19-20', text:'Do not lay up for yourselves treasures on earth, where moth and rust destroy and where thieves break in and steal.'},
    {ref:'Luke 12:15', text:'Take care, and be on your guard against all covetousness, for one\'s life does not consist in the abundance of his possessions.'},
    {ref:'Proverbs 21:5', text:'The plans of the diligent lead surely to abundance, but everyone who is hasty comes only to poverty.'},
    {ref:'Ecclesiastes 5:10', text:'He who loves money will not be satisfied with money, nor he who loves wealth with his income; this also is vanity.'},
    {ref:'Philippians 4:11-12', text:'I have learned, in whatever situation I am, to be content. I know how to be brought low, and I know how to abound.'},
    {ref:'Proverbs 13:11', text:'Wealth gained hastily will dwindle, but whoever gathers little by little will increase it.'},
    {ref:'Matthew 6:24', text:'No one can serve two masters... You cannot serve God and money.'},
  ],
  budget_under: [
    {ref:'Proverbs 21:20', text:'Precious treasure and oil are in a wise man\'s dwelling, but a foolish man devours it.'},
    {ref:'Proverbs 13:11', text:'Wealth gained hastily will dwindle, but whoever gathers little by little will increase it.'},
    {ref:'Proverbs 27:23-24', text:'Know well the condition of your flocks, and give attention to your herds, for riches do not last forever.'},
    {ref:'Proverbs 6:6-8', text:'Go to the ant, O sluggard; consider her ways, and be wise. Without having any chief, officer, or ruler, she prepares her bread in summer.'},
    {ref:'2 Corinthians 9:6', text:'Whoever sows sparingly will also reap sparingly, and whoever sows bountifully will also reap bountifully.'},
    {ref:'Proverbs 24:27', text:'Prepare your work outside; get everything ready for yourself in the field, and after that build your house.'},
    {ref:'Luke 14:28', text:'Which of you, desiring to build a tower, does not first sit down and count the cost, whether he has enough to complete it?'},
    {ref:'Proverbs 22:3', text:'The prudent sees danger and hides himself, but the simple go on and suffer for it.'},
  ],
  fasting_milestone: [
    {ref:'Matthew 6:17-18', text:'When you fast, anoint your head and wash your face, that your fasting may not be seen by others but by your Father who is in secret.'},
    {ref:'Isaiah 58:6', text:'Is not this the fast that I choose: to loose the bonds of wickedness, to undo the straps of the yoke, to let the oppressed go free?'},
    {ref:'Joel 2:12', text:'Yet even now, declares the Lord, return to me with all your heart, with fasting, with weeping, and with mourning.'},
    {ref:'Matthew 4:4', text:'Man shall not live by bread alone, but by every word that comes from the mouth of God.'},
    {ref:'Acts 13:2-3', text:'While they were worshiping the Lord and fasting, the Holy Spirit said... Then after fasting and praying they laid their hands on them.'},
    {ref:'Ezra 8:23', text:'So we fasted and implored our God for this, and He listened to our entreaty.'},
    {ref:'Psalm 35:13', text:'I afflicted myself with fasting; I prayed with head bowed on my chest.'},
    {ref:'Zechariah 8:19', text:'The fasts... shall be to the house of Judah seasons of joy and gladness and cheerful feasts.'},
    {ref:'Daniel 9:3', text:'Then I turned my face to the Lord God, seeking Him by prayer and pleas for mercy with fasting and sackcloth and ashes.'},
  ],
  habit_streak: [
    {ref:'Galatians 6:9', text:'And let us not grow weary of doing good, for in due season we will reap, if we do not give up.'},
    {ref:'Hebrews 12:1', text:'Let us run with endurance the race that is set before us.'},
    {ref:'2 Peter 1:5-6', text:'Make every effort to supplement your faith with virtue, and virtue with knowledge, and knowledge with self-control, and self-control with steadfastness.'},
    {ref:'1 Corinthians 15:58', text:'Be steadfast, immovable, always abounding in the work of the Lord, knowing that in the Lord your labor is not in vain.'},
    {ref:'Romans 5:3-4', text:'We rejoice in our sufferings, knowing that suffering produces endurance, and endurance produces character, and character produces hope.'},
    {ref:'James 1:2-4', text:'Count it all joy, my brothers, when you meet trials of various kinds, for you know that the testing of your faith produces steadfastness.'},
    {ref:'Philippians 3:14', text:'I press on toward the goal for the prize of the upward call of God in Christ Jesus.'},
    {ref:'Proverbs 4:25-27', text:'Let your eyes look directly forward, and your gaze be straight before you. Ponder the path of your feet; then all your ways will be sure.'},
    {ref:'Luke 16:10', text:'One who is faithful in a very little is also faithful in much.'},
    {ref:'Hebrews 10:23', text:'Let us hold fast the confession of our hope without wavering, for He who promised is faithful.'},
  ],
  prayer_answered: [
    {ref:'1 John 5:14-15', text:'This is the confidence that we have toward Him, that if we ask anything according to His will He hears us.'},
    {ref:'Matthew 7:7-8', text:'Ask, and it will be given to you; seek, and you will find; knock, and it will be opened to you.'},
    {ref:'Psalm 116:1-2', text:'I love the Lord, because He has heard my voice and my pleas for mercy. Because He inclined His ear to me, therefore I will call on Him as long as I live.'},
    {ref:'Psalm 34:4', text:'I sought the Lord, and He answered me and delivered me from all my fears.'},
    {ref:'James 5:16', text:'The prayer of a righteous person has great power as it is working.'},
    {ref:'Jeremiah 33:3', text:'Call to me and I will answer you, and will tell you great and hidden things that you have not known.'},
    {ref:'1 Thessalonians 5:16-18', text:'Rejoice always, pray without ceasing, give thanks in all circumstances; for this is the will of God in Christ Jesus for you.'},
    {ref:'Philippians 4:6-7', text:'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.'},
    {ref:'Mark 11:24', text:'Whatever you ask in prayer, believe that you have received it, and it will be yours.'},
    {ref:'Psalm 138:3', text:'On the day I called, You answered me; my strength of soul You increased.'},
  ],
  anger: [
    {ref:'Ephesians 4:26-27', text:'Be angry and do not sin; do not let the sun go down on your anger, and give no opportunity to the devil.'},
    {ref:'James 1:19-20', text:'Let every person be quick to hear, slow to speak, slow to anger; for the anger of man does not produce the righteousness of God.'},
    {ref:'Proverbs 15:1', text:'A soft answer turns away wrath, but a harsh word stirs up anger.'},
    {ref:'Proverbs 14:29', text:'Whoever is slow to anger has great understanding, but he who has a hasty temper exalts folly.'},
    {ref:'Proverbs 29:11', text:'A fool gives full vent to his spirit, but a wise man quietly holds it back.'},
    {ref:'Colossians 3:8', text:'But now you must put them all away: anger, wrath, malice, slander, and obscene talk from your mouth.'},
    {ref:'Psalm 4:4', text:'Be angry, and do not sin; ponder in your own hearts on your beds, and be silent.'},
    {ref:'Ecclesiastes 7:9', text:'Be not quick in your spirit to become angry, for anger lodges in the heart of fools.'},
    {ref:'Proverbs 16:32', text:'Whoever is slow to anger is better than the mighty, and he who rules his spirit than he who takes a city.'},
  ],
  fear: [
    {ref:'Isaiah 41:10', text:'Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with My righteous right hand.'},
    {ref:'Psalm 56:3', text:'When I am afraid, I put my trust in You.'},
    {ref:'2 Timothy 1:7', text:'For God gave us a spirit not of fear but of power and of love and of self-control.'},
    {ref:'Joshua 1:9', text:'Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.'},
    {ref:'Psalm 27:1', text:'The Lord is my light and my salvation; whom shall I fear? The Lord is the stronghold of my life; of whom shall I be afraid?'},
    {ref:'Deuteronomy 31:6', text:'Be strong and courageous. Do not fear or be in dread of them, for it is the Lord your God who goes with you. He will not leave you or forsake you.'},
    {ref:'Psalm 23:4', text:'Even though I walk through the valley of the shadow of death, I will fear no evil, for You are with me.'},
    {ref:'1 Peter 5:7', text:'Casting all your anxieties on Him, because He cares for you.'},
    {ref:'John 14:27', text:'Peace I leave with you; My peace I give to you. Not as the world gives do I give to you. Let not your hearts be troubled, neither let them be afraid.'},
    {ref:'Romans 8:38-39', text:'I am sure that neither death nor life... will be able to separate us from the love of God in Christ Jesus our Lord.'},
  ],
  examen_done: [
    {ref:'Psalm 139:23-24', text:'Search me, O God, and know my heart! Try me and know my thoughts! See if there be any grievous way in me, and lead me in the way everlasting!'},
    {ref:'Lamentations 3:40', text:'Let us test and examine our ways, and return to the Lord!'},
    {ref:'2 Corinthians 13:5', text:'Examine yourselves, to see whether you are in the faith. Test yourselves.'},
    {ref:'1 Corinthians 11:28', text:'Let a person examine himself.'},
    {ref:'Psalm 4:4', text:'Ponder in your own hearts on your beds, and be silent.'},
    {ref:'Haggai 1:7', text:'Thus says the Lord of hosts: Consider your ways.'},
    {ref:'Galatians 6:4', text:'But let each one test his own work, and then his reason to boast will be in himself alone.'},
    {ref:'Proverbs 27:19', text:'As in water face reflects face, so the heart of man reflects the man.'},
  ],
  lust: [
    {ref:'Matthew 5:28', text:'Everyone who looks at a woman with lustful intent has already committed adultery with her in his heart.'},
    {ref:'1 Corinthians 6:18-20', text:'Flee from sexual immorality... You are not your own, for you were bought with a price. So glorify God in your body.'},
    {ref:'Job 31:1', text:'I have made a covenant with my eyes; how then could I gaze at a virgin?'},
    {ref:'Romans 13:14', text:'Put on the Lord Jesus Christ, and make no provision for the flesh, to gratify its desires.'},
    {ref:'1 Thessalonians 4:3-5', text:'This is the will of God, your sanctification: that you abstain from sexual immorality; that each one of you know how to control his own body in holiness and honor.'},
    {ref:'Galatians 5:16', text:'Walk by the Spirit, and you will not gratify the desires of the flesh.'},
    {ref:'2 Timothy 2:22', text:'So flee youthful passions and pursue righteousness, faith, love, and peace.'},
    {ref:'Colossians 3:5', text:'Put to death therefore what is earthly in you: sexual immorality, impurity, passion, evil desire, and covetousness, which is idolatry.'},
    {ref:'Psalm 119:9', text:'How can a young man keep his way pure? By guarding it according to Your word.'},
    {ref:'Proverbs 6:25-26', text:'Do not desire her beauty in your heart, and do not let her capture you with her eyelashes.'},
  ],
  loneliness: [
    {ref:'Deuteronomy 31:8', text:'It is the Lord who goes before you. He will be with you; He will not leave you or forsake you. Do not fear or be dismayed.'},
    {ref:'Psalm 25:16', text:'Turn to me and be gracious to me, for I am lonely and afflicted.'},
    {ref:'Matthew 28:20', text:'I am with you always, to the end of the age.'},
    {ref:'Psalm 68:6', text:'God settles the solitary in a home.'},
    {ref:'Isaiah 41:10', text:'Fear not, for I am with you; be not dismayed, for I am your God.'},
    {ref:'John 14:18', text:'I will not leave you as orphans; I will come to you.'},
    {ref:'Hebrews 13:5', text:'I will never leave you nor forsake you.'},
    {ref:'Psalm 34:18', text:'The Lord is near to the brokenhearted and saves the crushed in spirit.'},
  ],
};

function pickContextualVerse(context){
  const pool = CONTEXTUAL_VERSES[context];
  if(!pool || !pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Show a verse toast — small unobtrusive scripture appearance
function showVerseToast(context, customTitle){
  // CONTEXTUAL_VERSES is Bible-only, and this fires on wins — an urge beaten, a PR, a fasting milestone.
  // Ungated, it handed a Muslim, Hindu, Buddhist or secular person someone else's scripture at the moment
  // they felt proudest. activeVerses() already resolves the right set per tradition (VS_ISLAM, VS_HINDU,
  // VS_BUDDHIST, VS_SECULAR — the last with no religious language at all), so everyone gets a line that
  // is actually theirs rather than nothing.
  let v = null;
  try{
    const _t = (typeof faithTradition === 'function') ? faithTradition() : 'secular';
    if(_t === 'christianity'){
      v = pickContextualVerse(context);
    } else if(typeof activeVerses === 'function'){
      const set = activeVerses();
      if(set && set.length){
        const pick = set[Math.floor(Math.random() * set.length)];
        v = { text: pick.t, ref: pick.r, verse: pick.t, reference: pick.r };
      }
    }
  }catch(_){ v = null; }
  if(!v) return;
  
  // Don't show too often — once per context per 4 hours
  const lastKey = 'totry_verse_shown_' + context;
  const last = ls(lastKey);
  if(last && Date.now() - last < 4 * 3600000) return;
  ls(lastKey, Date.now());
  
  const m = document.createElement('div');
  m.className = 'modal-bg open';
  m.innerHTML = '<div class="modal" style="max-height:88vh"><div class="modal-handle"></div>' +
    '<div style="text-align:center;padding:10px 0">' +
      '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:10px">' + (customTitle || 'A word for this moment') + '</div>' +
      '<div style="font-family:Cormorant Garamond,serif;font-size:22px;color:var(--tx);font-style:italic;line-height:1.5;margin-bottom:14px">"' + v.text + '"</div>' +
      '<div style="font-family:DM Mono,monospace;font-size:11px;color:var(--go);letter-spacing:0.1em">' + v.ref + '</div>' +
    '</div>' +
    '<button class="btn primary" onclick="saveContextualVerse(\'' + String(v.ref||'').replace(/'/g, "\\'") + '\',\'' + String(v.text||'').replace(/'/g, "\\'") + '\');closeModal(this)" style="margin-top:14px;margin-bottom:8px">Save this verse</button>' +
    '<button class="btn" onclick="closeModal(this)">Close</button>' +
  '</div>';
  document.body.appendChild(m);
}

function saveContextualVerse(ref, text){
  const saved = ls('totry_sv') || [];
  if(saved.find(v => v.verse === text)) return;
  saved.unshift({
    verse: text,
    reference: ref + ' (ESV)',
    date: new Date().toLocaleDateString('en-AU', {day:'numeric', month:'short'})
  });
  ls('totry_sv', saved.slice(0, 200));
  if(typeof renderSavedVerses === 'function') renderSavedVerses();
  showToast('Verse saved', ref);
}


function getThematicVerses(feeling){
  const f=feeling.toLowerCase();
  const themes=[];
  // Order matters: most-specific / least-ambiguous patterns FIRST so the right theme wins.
  // (Previously "empty" hit depression before spiritual_dryness, and "tempt" hit lust
  //  before addiction — causing different buttons to return the same verses.)
  if(/addict|cant stop|can't stop|compuls|keep failing|relapse|daily battle/.test(f))themes.push('addiction');
  if(/far from god|spiritually empty|where is god|god feels (far|distant)|spiritual(ly)? (dry|empty)|feel nothing/.test(f))themes.push('spiritual_dryness');
  if(/heartbroken|broken heart|grief|grieving|mourning|tears|bereave/.test(f))themes.push('heartbroken');
  if(/jealous|envy|comparing|compare myself/.test(f))themes.push('jealousy');
  if(/lust|porn|sexual|masturbat|pmo|fighting temptation|cheat/.test(f))themes.push('lust');
  if(/shame|guilt|embarrass|worthless|dirty|unclean/.test(f))themes.push('shame');
  if(/lonely|alone|isolat|nobody|no one|unloved|abandoned/.test(f))themes.push('lonely');
  if(/anxi|worry|stress|overwhelm|panic|afraid|scared/.test(f))themes.push('anxiety');
  if(/hopeless|nothing will|want to die|want to give up|despair|pointless/.test(f))themes.push('depression');
  if(/depress|numb|empty inside/.test(f) && !themes.includes('spiritual_dryness'))themes.push('depression');
  if(/anger|angry|rage|furious|frustrat|bitter|resent/.test(f))themes.push('anger');
  if(/forgiv|repent|made a mistake|i sinned|did wrong/.test(f))themes.push('forgiveness');
  if(/money|debt|broke financially|financ|bills|can't pay|cant pay/.test(f))themes.push('finances');
  if(/courage|brave|fear of judg|fear of people|fear of man/.test(f))themes.push('courage');
  if(/strength|tired|exhaust|weak|burnt out|burnout|discipline|keep going/.test(f))themes.push('strength');
  if(/identity|who am i|lost myself|purpose|meaning|confused about who/.test(f))themes.push('identity');
  if(/relationship|my partner|girlfriend|boyfriend|marriage|betray/.test(f))themes.push('relationships');
  if(/tempt|urge|about to (slip|give in|fall)|craving|triggered|give in|on the edge|so close to|one click away/.test(f) && !themes.includes('lust'))themes.push('temptation');
  if(/grief|grieving|mourning|bereave|passed away|death of|funeral|someone died|they died|loss of a loved/.test(f))themes.push('grief');
  if(/patien|impatient|waiting|takes so long|not yet|why is it taking|in a hurry|slow to happen|how long/.test(f))themes.push('patience');
  if(/grateful|gratitude|thankful|give thanks|blessed|count my blessings|appreciate/.test(f))themes.push('gratitude');
  if(/purity|be pure|stay pure|clean heart|holiness|holy living|stay clean|integrity/.test(f))themes.push('purity');
  if(/persever|endure|keep pushing|finish the race|dont quit|don't quit|stay the course|almost quit|keep fighting|keep going/.test(f) && !themes.includes('strength'))themes.push('perseverance');
  if(/heal|sick|illness|disease|unwell|recovery|diagnos|in pain|hurting body|my health|chronic|suffering physically/.test(f))themes.push('healing');
  if(/doubt|questioning|hard to believe|is god real|unbelief|struggling to believe|losing faith|not sure god|does god exist/.test(f))themes.push('doubt');
  if(/provi|need money|pay rent|cant afford|can't afford|lost my job|unemployed|will i have enough|daily bread|make ends meet|scared about money/.test(f))themes.push('provision');
  if(!themes.length){
    // Default: rotate through general life-verse themes by content hash so we don't always
    // return the same fallback for unmatched queries
    const hash = Array.from(f).reduce((a,c)=>a+c.charCodeAt(0),0);
    const defaults = ['strength','identity','spiritual_dryness','courage'];
    themes.push(defaults[hash % defaults.length]);
  }

  const TV={
    heartbroken:[
      {reference:'Psalm 34:18 (ESV)',verse:'The Lord is near to the brokenhearted and saves the crushed in spirit.',reflection:'When your heart is in pieces, you are not further from God — you are nearer to Him.'},
      {reference:'Psalm 147:3 (ESV)',verse:'He heals the brokenhearted and binds up their wounds.',reflection:'God does not minimize what broke you. He treats it like a wound that needs binding.'},
      {reference:'Matthew 5:4 (ESV)',verse:'Blessed are those who mourn, for they shall be comforted.',reflection:'There is a blessing on the other side of mourning — not in avoiding it.'},
      {reference:'2 Corinthians 1:3-4 (ESV)',verse:'Blessed be the God of all comfort, who comforts us in all our affliction, so that we may be able to comfort those who are in any affliction.',reflection:'What you receive from God in this season will one day be what you give to someone else in theirs.'},
      {reference:'John 16:22 (ESV)',verse:'So also you have sorrow now, but I will see you again, and your hearts will rejoice, and no one will take your joy from you.',reflection:'This sorrow has an end. Jesus promised it directly.'},
      {reference:'Revelation 21:4 (ESV)',verse:'He will wipe away every tear from their eyes, and death shall be no more, neither shall there be mourning, nor crying, nor pain anymore.',reflection:'The final word over your pain is its end, by God\'s own hand.'},
      {reference:'Psalm 56:8 (ESV)',verse:'You have kept count of my tossings; put my tears in your bottle. Are they not in your book?',reflection:'Not one of your tears has gone unnoticed. He keeps them like they matter — because you do.'},
      {reference:'Psalm 73:26 (ESV)',verse:'My flesh and my heart may fail, but God is the strength of my heart and my portion forever.',reflection:'When your heart literally feels like it is failing, he becomes the strength underneath it. He holds what you cannot.'},
      {reference:'Isaiah 61:1 (ESV)',verse:'The Lord has anointed me to bring good news to the poor; he has sent me to bind up the brokenhearted.',reflection:'Binding up the brokenhearted is not a side task for Jesus — it is written into why he came.'},
      {reference:'2 Corinthians 4:8-9 (ESV)',verse:'We are afflicted in every way, but not crushed; perplexed, but not driven to despair; persecuted, but not forsaken; struck down, but not destroyed.',reflection:'Pressed, yes. Crushed, no. Grace lives in that small, stubborn difference.'},
      {reference:'Psalm 34:17-18 (ESV)',verse:'When the righteous cry for help, the Lord hears and delivers them out of all their troubles. The Lord is near to the brokenhearted.',reflection:'The crying itself reaches him. Nearness to the broken is where he chooses to be.'},
    ],
    courage:[
      {reference:'Joshua 1:9 (ESV)',verse:'Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.',reflection:'Courage is not the absence of fear. It is choosing to act knowing God is with you.'},
      {reference:'Proverbs 29:25 (ESV)',verse:'The fear of man lays a snare, but whoever trusts in the Lord is safe.',reflection:'Caring too much what people think is a trap. Trusting God breaks it.'},
      {reference:'2 Timothy 1:7 (ESV)',verse:'For God gave us a spirit not of fear but of power and love and self-control.',reflection:'The fear you feel is not from God. He gave you something else entirely.'},
      {reference:'Isaiah 41:10 (ESV)',verse:'Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you.',reflection:'God\'s presence is the answer to fear — not pep talks, not strategy, just Him.'},
      {reference:'Psalm 27:1 (ESV)',verse:'The Lord is my light and my salvation; whom shall I fear?',reflection:'When you remember Who is for you, the question of who is against you matters less.'},
      {reference:'Matthew 10:28 (ESV)',verse:'And do not fear those who kill the body but cannot kill the soul.',reflection:'There is a fear that is bigger than human opinion. Reset your scale.'},
      {reference:'Psalm 56:3 (ESV)',verse:'When I am afraid, I put my trust in you.',reflection:'Being afraid and trusting God are not opposites. You can do both in the same breath.'},
      {reference:'Deuteronomy 31:6 (ESV)',verse:'Be strong and courageous. Do not fear or be in dread of them, for it is the Lord your God who goes with you. He will not leave you or forsake you.',reflection:'Courage is not manufactured — it is borrowed from the One who promised not to leave.'},
      {reference:'Psalm 31:24 (ESV)',verse:'Be strong, and let your heart take courage, all you who wait for the Lord.',reflection:'Courage is something you reach out and pick up — especially in the waiting.'},
      {reference:'1 Corinthians 16:13 (ESV)',verse:'Be watchful, stand firm in the faith, act like men, be strong.',reflection:'Sometimes courage is simply refusing to move from where you know you should stand.'},
      {reference:'Deuteronomy 20:4 (ESV)',verse:'For the Lord your God is he who goes with you to fight for you against your enemies, to give you the victory.',reflection:'You are not walking into this alone or unarmed. He goes ahead of you to fight.'},
    ],
    jealousy:[
      {reference:'James 3:16 (ESV)',verse:'For where jealousy and selfish ambition exist, there will be disorder and every vile practice.',reflection:'Jealousy is not a small sin. It is the root of disorder in your life.'},
      {reference:'Proverbs 14:30 (ESV)',verse:'A tranquil heart gives life to the flesh, but envy makes the bones rot.',reflection:'What envy does to you physically is the picture of what it does to your spirit.'},
      {reference:'Galatians 5:26 (ESV)',verse:'Let us not become conceited, provoking one another, envying one another.',reflection:'Envy is a relationship destroyer. It poisons how you see other people.'},
      {reference:'1 Corinthians 13:4 (ESV)',verse:'Love is patient and kind; love does not envy or boast.',reflection:'Real love rejoices in another\'s good. Envy is the opposite of love.'},
      {reference:'Psalm 37:1 (ESV)',verse:'Fret not yourself because of evildoers; be not envious of wrongdoers!',reflection:'Sometimes we even envy those doing wrong. That is a warning sign of how far off we have drifted.'},
      {reference:'1 Timothy 6:6 (ESV)',verse:'But godliness with contentment is great gain.',reflection:'The gain you are actually after is not what they have. It is a settled heart — and that is available to you now.'},
      {reference:'Hebrews 13:5 (ESV)',verse:'Keep your life free from love of money, and be content with what you have, for he has said, I will never leave you nor forsake you.',reflection:'The cure for comparison is not getting more — it is realizing you already have the One who cannot be taken.'},
      {reference:'Proverbs 23:17 (ESV)',verse:'Let not your heart envy sinners, but continue in the fear of the Lord all the day.',reflection:'When someone else\'s life looks better, turn your eyes back to God. That is where the comparison quiets.'},
      {reference:'Philippians 4:11 (ESV)',verse:'Not that I am speaking of being in need, for I have learned in whatever situation I am to be content.',reflection:'Contentment is learned, not found. Envy loses its grip the more you practice being grateful for your own portion.'},
      {reference:'James 3:14-16 (ESV)',verse:'But if you have bitter jealousy and selfish ambition in your hearts, do not boast and be false to the truth. For where jealousy and selfish ambition exist, there will be disorder.',reflection:'Name the jealousy honestly instead of dressing it up. Bringing it into the light is the first step out of the disorder.'},
    ],
    shame:[
      {reference:'Romans 8:1 (ESV)',verse:'There is therefore now no condemnation for those who are in Christ Jesus.',reflection:'Whatever you have done, this is the ground truth. No condemnation. Full stop.'},
      {reference:'Isaiah 54:4 (ESV)',verse:'Fear not, for you will not be ashamed; be not confounded, for you will not be disgraced; for you will forget the shame of your youth.',reflection:'God specifically promises to lift the shame you carry from your past.'},
      {reference:'Psalm 34:5 (ESV)',verse:'Those who look to him are radiant, and their faces shall never be ashamed.',reflection:'The posture of looking to God - not performing for him - removes shame.'},
      {reference:'Zephaniah 3:17 (ESV)',verse:'The Lord your God is in your midst, a mighty one who will save; he will rejoice over you with gladness; he will quiet you by his love.',reflection:'God does not look at you in disgust. He sings over you.'},
      {reference:'1 John 3:20 (ESV)',verse:'For whenever our heart condemns us, God is greater than our heart, and he knows everything.',reflection:'Even when you feel condemned by your own conscience, God\'s verdict over you is greater than your feelings.'},
      {reference:'Hebrews 12:2 (ESV)',verse:'Looking to Jesus, the founder and perfecter of our faith, who for the joy that was set before him endured the cross, despising the shame.',reflection:'Jesus himself carried and defeated shame on the cross so you would not have to carry it forever.'},
      {reference:'Romans 8:1 (ESV)',verse:'There is therefore now no condemnation for those who are in Christ Jesus.',reflection:'No condemnation. Not less condemnation, not delayed condemnation. None — if you are in Christ.'},
      {reference:'Psalm 34:5 (ESV)',verse:'Those who look to him are radiant, and their faces shall never be ashamed.',reflection:'Looking to him does something visible — it lifts the face that shame wanted bowed.'},
      {reference:'Isaiah 61:7 (ESV)',verse:'Instead of your shame there shall be a double portion; instead of dishonor they shall rejoice in their lot.',reflection:'God\'s economy doesn\'t just remove shame — it replaces it with double honor.'},
      {reference:'Romans 10:11 (ESV)',verse:'For the Scripture says, Everyone who believes in him will not be put to shame.',reflection:'Your faith is not misplaced. The One you\'re trusting will not leave you ashamed for trusting him.'},
      {reference:'Isaiah 1:18 (ESV)',verse:'Come now, let us reason together, says the Lord: though your sins are like scarlet, they shall be as white as snow; though they are red like crimson, they shall become like wool.',reflection:'The deepest stain you are carrying, he calls washable. Scarlet to snow — that is his specialty.'},
      {reference:'John 8:10-11 (ESV)',verse:'Jesus stood up and said to her, Has no one condemned you? She said, No one, Lord. And Jesus said, Neither do I condemn you; go, and from now on sin no more.',reflection:'The One with every right to condemn you chose not to. He sends you forward, not back into the shame.'},
      {reference:'2 Corinthians 5:21 (ESV)',verse:'For our sake he made him to be sin who knew no sin, so that in him we might become the righteousness of God.',reflection:'A trade happened at the cross: he took your shame, you got his standing. That is who you are now.'},
      {reference:'Psalm 32:5 (ESV)',verse:'I acknowledged my sin to you, and I did not cover my iniquity; I said, I will confess my transgressions to the Lord, and you forgave the iniquity of my sin.',reflection:'Shame says hide it. Grace says name it — and the moment you do, it is already forgiven.'},
      {reference:'Isaiah 50:7 (ESV)',verse:'But the Lord God helps me; therefore I have not been disgraced; therefore I have set my face like a flint, and I know that I shall not be put to shame.',reflection:'With his help you can lift your face again. Shame does not get the last word over someone he is holding.'},
    ],
    lust:[
      {reference:'1 Corinthians 6:18-19 (ESV)',verse:'Flee from sexual immorality. Every other sin a person commits is outside the body, but the sexually immoral person sins against his own body. Or do you not know that your body is a temple of the Holy Spirit?',reflection:'This is a physical fight - the instruction is to flee, not reason with the urge.'},
      {reference:'2 Timothy 2:22 (ESV)',verse:'So flee youthful passions and pursue righteousness, faith, love, and peace, along with those who call on the Lord from a pure heart.',reflection:'Fleeing is only half - pursue something. Fill the space with something real.'},
      {reference:'Job 31:1 (ESV)',verse:'I have made a covenant with my eyes; how then could I gaze at a virgin?',reflection:'Job made a deliberate, pre-committed decision about what he would look at. You can too.'},
      {reference:'Psalm 101:3 (ESV)',verse:'I will not set before my eyes anything that is worthless.',reflection:'A practical daily covenant - what you choose to look at shapes who you become.'},
      {reference:'Romans 13:14 (ESV)',verse:'But put on the Lord Jesus Christ, and make no provision for the flesh, to gratify its desires.',reflection:'Do not give yourself an on-ramp to temptation. Remove the provision.'},
      {reference:'Matthew 5:8 (ESV)',verse:'Blessed are the pure in heart, for they shall see God.',reflection:'Purity is not about performance. It is about what you begin to see when the fog clears.'},
      {reference:'1 Corinthians 6:18-19 (ESV)',verse:'Flee from sexual immorality. Do you not know that your body is a temple of the Holy Spirit within you?',reflection:'Fleeing is not weakness — it is the wise move. Your body is not disposable; it is a dwelling place.'},
      {reference:'Job 31:1 (ESV)',verse:'I have made a covenant with my eyes; how then could I gaze at a virgin?',reflection:'A decision made in advance — a covenant with your eyes — is stronger than a decision made in the heat of the moment.'},
      {reference:'Psalm 119:9 (ESV)',verse:'How can a young man keep his way pure? By guarding it according to your word.',reflection:'The path to purity is not willpower alone — it is guarding your way with what God has said.'},
      {reference:'2 Timothy 2:22 (ESV)',verse:'So flee youthful passions and pursue righteousness, faith, love, and peace.',reflection:'Don\'t just run from — run toward. Fill the space the temptation wants with something better.'},
      {reference:'Galatians 5:16 (ESV)',verse:'But I say, walk by the Spirit, and you will not gratify the desires of the flesh.',reflection:'The win is not only fighting the flesh head-on — it is walking so close to the Spirit there is no room left for it.'},
      {reference:'Proverbs 6:27 (ESV)',verse:'Can a man carry fire next to his chest and his clothes not be burned?',reflection:'Some battles are won by not picking up the fire in the first place. Wisdom is distance.'},
      {reference:'1 Peter 2:11 (ESV)',verse:'Beloved, I urge you as sojourners and exiles to abstain from the passions of the flesh, which wage war against your soul.',reflection:'This is not a harmless habit — it is a war on your soul. You are allowed to fight it like it matters.'},
      {reference:'1 John 2:16 (ESV)',verse:'For all that is in the world—the desires of the flesh and the desires of the eyes and pride of life—is not from the Father but is from the world.',reflection:'The pull is real, but it is not from him. Naming the source helps you let it pass.'},
      {reference:'1 Thessalonians 4:3-4 (ESV)',verse:'For this is the will of God, your sanctification: that you abstain from sexual immorality; that each one of you know how to control his own body in holiness and honor.',reflection:'Your body is not the enemy — it is meant to be handled with honor. That is dignity, not deprivation.'},
    ],
    lonely:[
      {reference:'Deuteronomy 31:8 (ESV)',verse:'It is the Lord who goes before you. He will be with you; he will not leave you or forsake you. Do not fear or be dismayed.',reflection:'You are never alone, even when it feels like you have been abandoned by everyone else.'},
      {reference:'Psalm 68:6 (ESV)',verse:'God sets the lonely in families; he leads out the prisoners with singing.',reflection:'God\'s specific response to loneliness is community. He does not leave you there.'},
      {reference:'Isaiah 41:10 (ESV)',verse:'Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.',reflection:'The physical imagery of being upheld - held up - is for when you feel completely alone and sinking.'},
      {reference:'Psalm 25:16 (ESV)',verse:'Turn to me and be gracious to me, for I am lonely and afflicted.',reflection:'David prayed this. The same feelings you have right now. God heard it then.'},
      {reference:'John 14:18 (ESV)',verse:'I will not leave you as orphans; I will come to you.',reflection:'Jesus\'s direct promise - I am not leaving you without someone.'},
      {reference:'Hebrews 13:5 (ESV)',verse:'I will never leave you nor forsake you.',reflection:'Six words that God never takes back.'},
      {reference:'Matthew 28:20 (ESV)',verse:'And behold, I am with you always, to the end of the age.',reflection:'The very last thing Jesus said was a promise against loneliness: always. To the end.'},
      {reference:'Psalm 139:7-8 (ESV)',verse:'Where shall I go from your Spirit? Or where shall I flee from your presence? If I ascend to heaven, you are there! If I make my bed in Sheol, you are there!',reflection:'There is no room dark enough, no low low enough, to be beyond his presence. You cannot out-lonely God.'},
      {reference:'Isaiah 43:1 (ESV)',verse:'Fear not, for I have redeemed you; I have called you by name, you are mine.',reflection:'He knows your name — not the crowd\'s, yours. In the ache of feeling unseen, you are seen and claimed.'},
      {reference:'Psalm 27:10 (ESV)',verse:'For my father and my mother have forsaken me, but the Lord will take me in.',reflection:'Even if the people who should have stayed did not, there is One who takes you in and will not leave.'},
      {reference:'Genesis 2:18 (ESV)',verse:'Then the Lord God said, It is not good that the man should be alone; I will make him a helper fit for him.',reflection:'The loneliness you feel is not how it is meant to be — God said so first. Reaching for connection is holy, not weak.'},
    ],
    anxiety:[
      {reference:'Philippians 4:6-7 (ESV)',verse:'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.',reflection:'The antidote to anxiety is not willpower - it is prayer. And the peace that follows defies rational explanation.'},
      {reference:'1 Peter 5:7 (ESV)',verse:'Casting all your anxieties on him, because he cares for you.',reflection:'The act of casting - an active throw, not a gentle release. Throw every anxiety at him.'},
      {reference:'Matthew 6:34 (ESV)',verse:'Therefore do not be anxious about tomorrow, for tomorrow will be anxious for itself. Sufficient for the day is its own trouble.',reflection:'Jesus grounds you in today. Not next week, not next year. Just get through today.'},
      {reference:'Isaiah 26:3 (ESV)',verse:'You keep him in perfect peace whose mind is stayed on you, because he trusts in you.',reflection:'Where your mind rests determines your peace. Return it to God when it wanders.'},
      {reference:'Psalm 94:19 (ESV)',verse:'When the cares of my heart are many, your consolations cheer my soul.',reflection:'When anxiety multiplies, God\'s comfort multiplies with it.'},
      {reference:'Luke 12:25 (ESV)',verse:'And which of you by being anxious can add a single hour to his span of life?',reflection:'Anxiety achieves nothing. Jesus asks the question that cuts through the spiral.'},
      {reference:'1 Peter 5:7 (ESV)',verse:'Casting all your anxieties on him, because he cares for you.',reflection:'Not some of your anxieties — all of them. And the reason given is simple: he cares for you.'},
      {reference:'Isaiah 41:10 (ESV)',verse:'Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you.',reflection:'Four promises in one verse: presence, strength, help, and a steadying hand. Hold one when the others feel far.'},
      {reference:'John 14:27 (ESV)',verse:'Peace I leave with you; my peace I give to you. Not as the world gives do I give to you. Let not your hearts be troubled.',reflection:'The peace Jesus offers is a different kind than the world\'s — it doesn\'t depend on circumstances changing.'},
      {reference:'Matthew 6:34 (ESV)',verse:'Therefore do not be anxious about tomorrow, for tomorrow will be anxious for itself. Sufficient for the day is its own trouble.',reflection:'You only have grace for today. Tomorrow\'s weight isn\'t yours to carry yet.'},
      {reference:'Psalm 55:22 (ESV)',verse:'Cast your burden on the Lord, and he will sustain you; he will never permit the righteous to be moved.',reflection:'Hand it over — the whole weight. He does not just take it; he holds you steady after.'},
      {reference:'Psalm 46:10 (ESV)',verse:'Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth!',reflection:'When the mind is racing, the instruction is small: be still. Not fix everything — just be still and remember who he is.'},
      {reference:'Matthew 11:28-29 (ESV)',verse:'Come to me, all who labor and are heavy laden, and I will give you rest. Take my yoke upon you, and learn from me, for I am gentle and lowly in heart.',reflection:'The invitation is for the overwhelmed specifically. Come tired, come anxious — rest is what is offered.'},
      {reference:'Proverbs 12:25 (ESV)',verse:'Anxiety in a man\'s heart weighs him down, but a good word makes him glad.',reflection:'Anxiety is heavy — even Scripture says so. One true, good word can lift what the spiral piled on.'},
      {reference:'Deuteronomy 31:8 (ESV)',verse:'It is the Lord who goes before you. He will be with you; he will not leave you or forsake you. Do not fear or be dismayed.',reflection:'Whatever you are dreading, he is already there ahead of you. You are not walking into it alone.'},
    ],
    depression:[
      {reference:'Psalm 34:18 (ESV)',verse:'The Lord is near to the brokenhearted and saves the crushed in spirit.',reflection:'God is specifically closer to you in this moment than at any other.'},
      {reference:'Psalm 42:11 (ESV)',verse:'Why are you cast down, O my soul, and why are you in turmoil within me? Hope in God; for I shall again praise him, my salvation and my God.',reflection:'The Psalmist is speaking to his own depression - arguing with it. You can do this too.'},
      {reference:'Isaiah 43:2 (ESV)',verse:'When you pass through the waters, I will be with you; and through the rivers, they shall not overwhelm you.',reflection:'He does not promise you will not be in deep water. He promises it will not overwhelm you.'},
      {reference:'Lamentations 3:22-23 (ESV)',verse:'The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.',reflection:'Written in the middle of complete devastation. New mercy. Every morning. Including tomorrow.'},
      {reference:'Psalm 30:5 (ESV)',verse:'Weeping may tarry for the night, but joy comes with the morning.',reflection:'This darkness is not permanent. Morning comes.'},
      {reference:'Romans 8:38-39 (ESV)',verse:'For I am sure that neither death nor life, nor angels nor rulers, nor things present nor things to come, nor powers, nor height nor depth, nor anything else in all creation, will be able to separate us from the love of God in Christ Jesus our Lord.',reflection:'Nothing - not even this darkness - can separate you from being loved.'},
      {reference:'1 Kings 19:5-7 (ESV)',verse:'And behold, an angel touched him and said to him, Arise and eat. And he looked, and behold, there was at his head a cake baked on hot stones and a jar of water.',reflection:'When Elijah wanted to die, God did not lecture him — he let him rest and fed him. Sometimes the holiest next step is sleep and a meal.'},
      {reference:'Psalm 143:7-8 (ESV)',verse:'Answer me quickly, O Lord! My spirit fails! Let me hear in the morning of your steadfast love, for in you I trust.',reflection:'Even David prayed from empty. You do not have to feel strong to pray — you just have to be honest.'},
      {reference:'2 Corinthians 1:8-9 (ESV)',verse:'For we were so utterly burdened beyond our strength that we despaired of life itself. But that was to make us rely not on ourselves but on God who raises the dead.',reflection:'Even Paul despaired of life. He came through it leaning on the God who raises the dead — and so can you.'},
      {reference:'Psalm 40:1-2 (ESV)',verse:'I waited patiently for the Lord; he inclined to me and heard my cry. He drew me up from the pit of destruction, out of the miry bog, and set my feet upon a rock.',reflection:'The pit is real, but it is not the destination. He has pulled people out of exactly this before, and set them on solid ground.'},
      {reference:'Psalm 3:3 (ESV)',verse:'But you, O Lord, are a shield about me, my glory, and the lifter of my head.',reflection:'When your head is too heavy to lift, that becomes his job. He is the lifter of it.'},
    ],
    anger:[
      {reference:'Ephesians 4:26-27 (ESV)',verse:'Be angry and do not sin; do not let the sun go down on your anger, and give no opportunity to the devil.',reflection:'Anger itself is not the sin. What you do with it is. The clock is ticking - deal with it tonight.'},
      {reference:'James 1:19-20 (ESV)',verse:'Know this, my beloved brothers: let every person be quick to hear, slow to speak, slow to anger; for the anger of man does not produce the righteousness of God.',reflection:'Anger feels like justice but rarely produces it. Slow down before it speaks through you.'},
      {reference:'Proverbs 15:1 (ESV)',verse:'A soft answer turns away wrath, but a harsh word stirs up anger.',reflection:'You have power over the escalation - the choice is in your next response.'},
      {reference:'Psalm 37:8 (ESV)',verse:'Refrain from anger, and forsake wrath! Fret not yourself; it tends only to evil.',reflection:'Anger nursed becomes something much darker. Name it, then release it.'},
      {reference:'Romans 12:19 (ESV)',verse:'Beloved, never avenge yourselves, but leave it to the wrath of God, for it is written, Vengeance is mine, I will repay, says the Lord.',reflection:'You do not have to carry this. Justice is real - it just does not belong to you to execute.'},
      {reference:'Proverbs 16:32 (ESV)',verse:'Whoever is slow to anger is better than the mighty, and he who rules his spirit than he who takes a city.',reflection:'Controlling your anger is the highest form of strength there is.'},
      {reference:'Proverbs 19:11 (ESV)',verse:'Good sense makes one slow to anger, and it is his glory to overlook an offense.',reflection:'Letting something go is not weakness — Scripture calls it glory. You lose nothing by choosing peace.'},
      {reference:'Proverbs 29:11 (ESV)',verse:'A fool gives full vent to his spirit, but a wise man quietly holds it back.',reflection:'Holding back is not suppression — it is the space where wisdom decides what is worth saying.'},
      {reference:'Ecclesiastes 7:9 (ESV)',verse:'Be not quick in your spirit to become angry, for anger lodges in the heart of fools.',reflection:'Anger wants to move in and stay. Do not give it a room; deal with it before it unpacks.'},
      {reference:'Colossians 3:8 (ESV)',verse:'But now you must put them all away: anger, wrath, malice, slander, and obscene talk from your mouth.',reflection:'Anger can be set down like a coat. You are not required to keep wearing it.'},
      {reference:'Psalm 4:4 (ESV)',verse:'Be angry, and do not sin; ponder in your own hearts on your beds, and be silent.',reflection:'Feel the anger honestly, then get quiet with it before God. Silence often does what shouting cannot.'},
    ],
    addiction:[
      {reference:'1 Corinthians 10:13 (ESV)',verse:'No temptation has overtaken you that is not common to man. God is faithful, and he will not let you be tempted beyond your ability, but with the temptation he will also provide the way of escape, that you may be able to endure it.',reflection:'There is always a way out. You may not see it yet. But it exists. Look for it.'},
      {reference:'Romans 7:19 (ESV)',verse:'For I do not do the good I want, but the evil I do not want is what I keep on doing.',reflection:'Paul wrote this. The apostle. The pattern you are in is older than you and God meets people in it.'},
      {reference:'Galatians 5:1 (ESV)',verse:'For freedom Christ has set us free; stand firm therefore, and do not submit again to a yoke of slavery.',reflection:'You were made for freedom. This addiction is a yoke that God intends to break.'},
      {reference:'2 Corinthians 12:9 (ESV)',verse:'But he said to me, My grace is sufficient for you, for my power is made perfect in weakness.',reflection:'Your weakness is not disqualifying. It is the exact place where his power shows up.'},
      {reference:'Psalm 40:2 (ESV)',verse:'He drew me up from the pit of destruction, out of the miry bog, and set my feet upon a rock, making my steps secure.',reflection:'The pit you are in - he has pulled people out of exactly this before.'},
      {reference:'John 8:36 (ESV)',verse:'So if the Son sets you free, you will be free indeed.',reflection:'This is a promise specifically about genuine, lasting freedom. Not just willpower.'},
      {reference:'Romans 6:14 (ESV)',verse:'For sin will have no dominion over you, since you are not under law but under grace.',reflection:'Sin losing its grip on you is not your achievement to earn — it is grace\'s work to receive.'},
      {reference:'2 Corinthians 5:17 (ESV)',verse:'Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come.',reflection:'You are not your worst habit. In Christ, the old version of you has already passed away.'},
      {reference:'Philippians 4:13 (ESV)',verse:'I can do all things through him who strengthens me.',reflection:'Not by your strength — through his. The escape from this is powered by Someone stronger than the craving.'},
      {reference:'Psalm 50:15 (ESV)',verse:'Call upon me in the day of trouble; I will deliver you, and you shall glorify me.',reflection:'The moment the urge hits is the day of trouble. Call out right then. He answers in real time.'},
      {reference:'James 4:7 (ESV)',verse:'Submit yourselves therefore to God. Resist the devil, and he will flee from you.',reflection:'Resistance plus surrender to God is not passive. The thing pulling at you is the one that has to flee.'},
      {reference:'Proverbs 24:16 (ESV)',verse:'For the righteous falls seven times and rises again, but the wicked stumble in times of calamity.',reflection:'What makes you righteous is not never falling — it is getting up again. Seven times. Every time.'},
      {reference:'Lamentations 3:22-23 (ESV)',verse:'The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.',reflection:'You have not used up your mercy. It resets every single morning — including the one after your worst night.'},
      {reference:'Titus 2:11-12 (ESV)',verse:'For the grace of God has appeared, bringing salvation for all people, training us to renounce ungodliness and worldly passions, and to live self-controlled, upright, and godly lives.',reflection:'Grace is not just forgiveness for the fall — it actively trains you to say no. It is on your side of the fight.'},
      {reference:'Ephesians 3:20 (ESV)',verse:'Now to him who is able to do far more abundantly than all that we ask or think, according to the power at work within us.',reflection:'The power to break this is not in your grip — it is already at work in you, and it is bigger than the habit.'},
      {reference:'Psalm 34:17 (ESV)',verse:'When the righteous cry for help, the Lord hears and delivers them out of all their troubles.',reflection:'The cry does not need to be eloquent. Call out mid-urge — he hears it and moves.'},
    ],
    forgiveness:[
      {reference:'1 John 1:9 (ESV)',verse:'If we confess our sins, he is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.',reflection:'Confess it - name it specifically - and the cleansing is as complete as the sin was real.'},
      {reference:'Psalm 103:12 (ESV)',verse:'As far as the east is from the west, so far does he remove our transgressions from us.',reflection:'East and west never meet. That is how far your sin goes when God removes it.'},
      {reference:'Isaiah 43:25 (ESV)',verse:'I, I am he who blots out your transgressions for my own sake, and I will not remember your sins.',reflection:'God actively forgets what you confess. Not overlooked. Forgotten.'},
      {reference:'Micah 7:19 (ESV)',verse:'He will again have compassion on us; he will tread our iniquities underfoot. You will cast all our sins into the depths of the sea.',reflection:'Cast into the sea - not left on the shore where you can pick it back up.'},
      {reference:'Romans 8:1 (ESV)',verse:'There is therefore now no condemnation for those who are in Christ Jesus.',reflection:'No condemnation. Present tense. Right now. Whatever you just did.'},
      {reference:'Luke 15:20 (ESV)',verse:'And he arose and came to his father. But while he was still a long way off, his father saw him and felt compassion, and ran and embraced him and kissed him.',reflection:'The father runs. Not waits. Runs. That is how God responds when you turn back.'},
      {reference:'Hebrews 8:12 (ESV)',verse:'For I will be merciful toward their iniquities, and I will remember their sins no more.',reflection:'God chooses to forget what you keep replaying. Maybe it is time to stop reminding yourself of what he has dropped.'},
      {reference:'Colossians 2:13-14 (ESV)',verse:'And you, who were dead in your trespasses, God made alive together with him, having forgiven us all our trespasses, by canceling the record of debt that stood against us.',reflection:'The record against you was not just paid — it was canceled, nailed to the cross. There is nothing left to hold over you.'},
      {reference:'Ephesians 1:7 (ESV)',verse:'In him we have redemption through his blood, the forgiveness of our trespasses, according to the riches of his grace.',reflection:'Forgiveness is not rationed thinly. It is measured out of riches — there is more than enough for this.'},
      {reference:'Matthew 6:14 (ESV)',verse:'For if you forgive others their trespasses, your heavenly Father will also forgive you.',reflection:'Sometimes the forgiveness you are longing to feel starts flowing when you extend it to someone else.'},
      {reference:'2 Corinthians 5:17 (ESV)',verse:'Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come.',reflection:'What you did is real, but so is this: in Christ, the old you has already passed. You are not fetching the old self back.'},
    ],
    strength:[
      {reference:'Isaiah 40:31 (ESV)',verse:'But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.',reflection:'The renewal comes in the waiting. Stillness before God restores what exhaustion takes.'},
      {reference:'Nehemiah 8:10 (ESV)',verse:'And do not be grieved, for the joy of the Lord is your strength.',reflection:'Joy is not a feeling here - it is a fuel source. God\'s joy in you is what powers you.'},
      {reference:'2 Chronicles 20:15 (ESV)',verse:'Do not be afraid and do not be dismayed at this great horde, for the battle is not yours but God\'s.',reflection:'You do not have to win this on your own. You are not supposed to.'},
      {reference:'Deuteronomy 31:6 (ESV)',verse:'Be strong and courageous. Do not fear or be in dread of them, for it is the Lord your God who goes with you. He will not leave you or forsake you.',reflection:'The command to be strong is followed immediately by the reason you can be.'},
      {reference:'Psalm 28:7 (ESV)',verse:'The Lord is my strength and my shield; in him my heart trusts, and I am helped; my heart exults, and with my song I give thanks to him.',reflection:'Strength comes from trust, not effort. Let him be the shield.'},
      {reference:'Habakkuk 3:19 (ESV)',verse:'God, the Lord, is my strength; he makes my feet like the deer\'s; he makes me tread on my high places.',reflection:'You were made to climb to high places. The strength to do it is borrowed.'},
      {reference:'Isaiah 40:31 (ESV)',verse:'But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary.',reflection:'Renewed strength comes from waiting on him, not grinding harder. The tired get carried.'},
      {reference:'Nehemiah 8:10 (ESV)',verse:'Do not be grieved, for the joy of the Lord is your strength.',reflection:'When the discipline feels heavy, joy is the fuel — not grim willpower.'},
      {reference:'Psalm 73:26 (ESV)',verse:'My flesh and my heart may fail, but God is the strength of my heart and my portion forever.',reflection:'Even when your body and resolve give out, he remains the strength underneath them.'},
      {reference:'2 Corinthians 4:16 (ESV)',verse:'So we do not lose heart. Though our outer self is wasting away, our inner self is being renewed day by day.',reflection:'Even on the days you feel like you\'re falling apart, something in you is being rebuilt daily.'},
      {reference:'Philippians 4:13 (ESV)',verse:'I can do all things through him who strengthens me.',reflection:'The strength was never meant to be yours alone. It is his, running through you — that is why it does not run out.'},
      {reference:'Psalm 46:1 (ESV)',verse:'God is our refuge and strength, a very present help in trouble.',reflection:'Not a distant help — a very present one. He is not watching your trouble from far off.'},
      {reference:'Ephesians 6:10 (ESV)',verse:'Finally, be strong in the Lord and in the strength of his might.',reflection:'Be strong in his might, not yours. The pressure to generate it all yourself was never the assignment.'},
      {reference:'2 Corinthians 12:9-10 (ESV)',verse:'But he said to me, My grace is sufficient for you, for my power is made perfect in weakness. For when I am weak, then I am strong.',reflection:'Your weakness is not disqualifying — it is the doorway. Where you run out is exactly where his power shows up.'},
      {reference:'Isaiah 40:29 (ESV)',verse:'He gives power to the faint, and to him who has no might he increases strength.',reflection:'This promise is aimed straight at the empty. Being out of strength is the qualification, not the disqualifier.'},
    ],
    identity:[
      {reference:'Psalm 139:14 (ESV)',verse:'I praise you, for I am fearfully and wonderfully made. Wonderful are your works; my soul knows it very well.',reflection:'You were not made by accident or as an afterthought. The God of the universe made you with intention.'},
      {reference:'Ephesians 2:10 (ESV)',verse:'For we are his workmanship, created in Christ Jesus for good works, which God prepared beforehand, that we should walk in them.',reflection:'You are not a mistake trying to find a purpose - you are a purpose already prepared.'},
      {reference:'2 Corinthians 5:17 (ESV)',verse:'Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come.',reflection:'The old version of you is not the final version. The new one is already here.'},
      {reference:'Romans 8:16-17 (ESV)',verse:'The Spirit himself bears witness with our spirit that we are children of God, and if children, then heirs - heirs of God and fellow heirs with Christ.',reflection:'Child of God is not a metaphor. It is your legal, permanent identity.'},
      {reference:'Jeremiah 1:5 (ESV)',verse:'Before I formed you in the womb I knew you, and before you were born I consecrated you.',reflection:'God knew you before any of your failures. He chose you knowing everything.'},
      {reference:'1 Peter 2:9 (ESV)',verse:'But you are a chosen race, a royal priesthood, a holy nation, a people for his own possession.',reflection:'This is what you are. Not what you are trying to become - what you already are.'},
      {reference:'John 1:12 (ESV)',verse:'But to all who did receive him, who believed in his name, he gave the right to become children of God.',reflection:'Not a servant, not a stranger — a child, with all the rights that come with it. That is the name you carry.'},
      {reference:'Galatians 2:20 (ESV)',verse:'I have been crucified with Christ. It is no longer I who live, but Christ who lives in me.',reflection:'Your truest identity is not your history or your failures. It is Christ, alive in you right now.'},
      {reference:'1 John 3:1 (ESV)',verse:'See what kind of love the Father has given to us, that we should be called children of God; and so we are.',reflection:'And so we are. Not aspiring to be, not maybe — it is already settled. You are his.'},
      {reference:'Ephesians 1:4-5 (ESV)',verse:'Even as he chose us in him before the foundation of the world, that we should be holy and blameless before him. In love he predestined us for adoption.',reflection:'You were wanted before the world began. Your belonging is not an accident — it was the plan.'},
      {reference:'Colossians 3:3 (ESV)',verse:'For you have died, and your life is hidden with Christ in God.',reflection:'Your real self is kept safe in God — untouchable by your worst day or anyone\'s opinion.'},
    ],
    relationships:[
      {reference:'1 Corinthians 13:4-5 (ESV)',verse:'Love is patient and kind; love does not envy or boast; it is not arrogant or rude. It does not insist on its own way; it is not irritable or resentful.',reflection:'The definition of love - not a feeling but a series of choices made again and again.'},
      {reference:'Proverbs 17:17 (ESV)',verse:'A friend loves at all times, and a brother is born for a time of adversity.',reflection:'Real love does not leave when it is hard. That is when it proves what it is.'},
      {reference:'Ephesians 4:32 (ESV)',verse:'Be kind to one another, tenderhearted, forgiving one another, as God in Christ forgave you.',reflection:'The basis of forgiveness in relationship is how much you have already been forgiven.'},
      {reference:'Matthew 18:21-22 (ESV)',verse:'Then Peter came up and said to him, Lord, how often will my brother sin against me, and I forgive him? As many as seven times? Jesus said to him, I do not say to you seven times, but seventy-seven times.',reflection:'Forgiveness is not a score you keep. It is a practice you maintain.'},
      {reference:'Ecclesiastes 4:9-10 (ESV)',verse:'Two are better than one, because they have a good reward for their toil. For if they fall, one will lift up his fellow.',reflection:'You were designed for relationship. The isolation you are feeling is not how it is supposed to be.'},
      {reference:'Colossians 3:13 (ESV)',verse:'Bearing with one another and, if one has a complaint against another, forgiving each other; as the Lord has forgiven you, so you also must forgive.',reflection:'Bearing with - present tense. It is a daily, deliberate act.'},
      {reference:'Romans 12:18 (ESV)',verse:'If possible, so far as it depends on you, live peaceably with all.',reflection:'You are only responsible for your side of the peace. Do your part, and release the rest.'},
      {reference:'1 Peter 4:8 (ESV)',verse:'Above all, keep loving one another earnestly, since love covers a multitude of sins.',reflection:'Love does not keep a ledger of wrongs. It covers, again and again. That is what holds people together.'},
      {reference:'Proverbs 27:17 (ESV)',verse:'Iron sharpens iron, and one man sharpens another.',reflection:'The right people do not just comfort you — they sharpen you. Do not isolate from the friction that makes you better.'},
      {reference:'Philippians 2:3-4 (ESV)',verse:'Do nothing from selfish ambition or conceit, but in humility count others more significant than yourselves.',reflection:'Most relational knots loosen the moment you genuinely put the other person first.'},
      {reference:'1 John 4:20 (ESV)',verse:'If anyone says, I love God, and hates his brother, he is a liar; for he who does not love his brother whom he has seen cannot love God whom he has not seen.',reflection:'How you treat the person in front of you is bound up with your love for God. They are not separate.'},
    ],
    finances:[
      {reference:'Matthew 6:24 (ESV)',verse:'No one can serve two masters, for either he will hate the one and love the other, or he will be devoted to the one and despise the other. You cannot serve God and money.',reflection:'Financial stress often comes from money having more authority over your life than it should.'},
      {reference:'Proverbs 22:7 (ESV)',verse:'The rich rules over the poor, and the borrower is the slave of the lender.',reflection:'Debt is described as slavery in scripture. Getting free of it is not just financial - it is spiritual.'},
      {reference:'Luke 16:11 (ESV)',verse:'If then you have not been faithful in the unrighteous wealth, who will entrust to you the true riches?',reflection:'Financial faithfulness is a training ground for the things that matter most.'},
      {reference:'Philippians 4:19 (ESV)',verse:'And my God will supply every need of yours according to his riches in glory in Christ Jesus.',reflection:'Not every want. Every need. The distinction matters and the promise holds.'},
      {reference:'Ecclesiastes 5:10 (ESV)',verse:'He who loves money will not be satisfied with money, nor he who loves wealth with his income; this also is vanity.',reflection:'More money does not fix the relationship with money. That is an inside job.'},
      {reference:'Proverbs 13:11 (ESV)',verse:'Wealth gained hastily will dwindle, but whoever gathers little by little will increase it.',reflection:'The patient, consistent approach to money is the one that actually works.'},
      {reference:'Matthew 6:26 (ESV)',verse:'Look at the birds of the air: they neither sow nor reap nor gather into barns, and yet your heavenly Father feeds them. Are you not of more value than they?',reflection:'If he feeds the birds, he has not overlooked you. Your worth to him settles the question of whether you will be cared for.'},
      {reference:'Hebrews 13:5 (ESV)',verse:'Keep your life free from love of money, and be content with what you have, for he has said, I will never leave you nor forsake you.',reflection:'The antidote to money-fear is not more money — it is the promise attached: I will never leave you.'},
      {reference:'1 Timothy 6:17 (ESV)',verse:'As for the rich in this present age, charge them not to be haughty, nor to set their hopes on the uncertainty of riches, but on God, who richly provides us with everything to enjoy.',reflection:'Money is a shaky thing to hope in. He is the steady provider behind every good thing you already enjoy.'},
      {reference:'Proverbs 3:9-10 (ESV)',verse:'Honor the Lord with your wealth and with the firstfruits of all your produce; then your barns will be filled with plenty.',reflection:'Giving first, even when it is tight, is a strange math that God honors. Trust often opens the hand before it fills it.'},
      {reference:'Psalm 37:16 (ESV)',verse:'Better is the little that the righteous has than the abundance of many wicked.',reflection:'A little held with peace beats a lot held with anxiety. What you have with God in it is enough.'},
    ],
    spiritual_dryness:[
      {reference:'Psalm 63:1 (ESV)',verse:'O God, you are my God; earnestly I seek you; my soul thirsts for you; my flesh faints for you, as in a dry and weary land where there is no water.',reflection:'David felt this exact spiritual dryness. He did not pretend he did not - he prayed it honestly.'},
      {reference:'Isaiah 55:1 (ESV)',verse:'Come, everyone who thirsts, come to the waters; and he who has no money, come, buy and eat!',reflection:'The invitation requires nothing from you except coming. You do not have to show up ready.'},
      {reference:'Hosea 6:3 (ESV)',verse:'Let us know; let us press on to know the Lord; his going out is sure as the dawn; he will come to us as the showers, as the spring rains that water the earth.',reflection:'Press on toward him even in the dryness. The rain is coming.'},
      {reference:'Revelation 3:20 (ESV)',verse:'Behold, I stand at the door and knock. If anyone hears my voice and opens the door, I will come in to him and eat with him, and he with me.',reflection:'He is the one pursuing you. He has not moved. He is at the door.'},
      {reference:'James 4:8 (ESV)',verse:'Draw near to God, and he will draw near to you.',reflection:'The movement is simple. One step toward him, and he covers the rest of the distance.'},
      {reference:'Lamentations 3:25 (ESV)',verse:'The Lord is good to those who wait for him, to the soul who seeks him.',reflection:'The seeking itself is enough. You do not have to feel it to mean it.'},
      {reference:'Psalm 42:1-2 (ESV)',verse:'As a deer pants for flowing streams, so pants my soul for you, O God. My soul thirsts for God, for the living God.',reflection:'The thirst you feel in the dryness is itself a sign your soul still knows where the water is.'},
      {reference:'Psalm 63:1 (ESV)',verse:'O God, you are my God; earnestly I seek you; my soul thirsts for you in a dry and weary land where there is no water.',reflection:'David wrote this from a dry place too. The dryness is not distance — it can be the very thing that drives the seeking.'},
      {reference:'Isaiah 44:3 (ESV)',verse:'For I will pour water on the thirsty land, and streams on the dry ground; I will pour my Spirit upon your offspring.',reflection:'Dry ground is exactly what God promises to pour water on. The dryness qualifies you for the rain.'},
      {reference:'Matthew 5:6 (ESV)',verse:'Blessed are those who hunger and thirst for righteousness, for they shall be satisfied.',reflection:'The hunger is not the problem to fix — it is the blessing. And it ends in being filled.'},
      {reference:'Psalm 42:5 (ESV)',verse:'Why are you cast down, O my soul, and why are you in turmoil within me? Hope in God; for I shall again praise him, my salvation and my God.',reflection:'Talk back to the dryness like David did. Feelings are not facts — hope in God, you will praise again.'},
      {reference:'1 Kings 19:11-12 (ESV)',verse:'And after the earthquake a fire, but the Lord was not in the fire. And after the fire the sound of a low whisper.',reflection:'God was not in the wind or fire, but the whisper. In the dry quiet, listen closer, not louder.'},
      {reference:'John 7:37-38 (ESV)',verse:'If anyone thirsts, let him come to me and drink. Whoever believes in me, out of his heart will flow rivers of living water.',reflection:'The thirst is an invitation, not a verdict. Come to him with the emptiness — that is where the rivers start.'},
      {reference:'Psalm 84:6 (ESV)',verse:'As they go through the Valley of Baca they make it a place of springs; the early rain also covers it with pools.',reflection:'Even the valley of weeping can become a place of springs. The dry season is not wasted ground.'},
      {reference:'Galatians 6:9 (ESV)',verse:'And let us not grow weary of doing good, for in due season we will reap, if we do not give up.',reflection:'Keep showing up in the dryness. The harvest comes to those who do not quit before the rain.'},
    ],
    temptation:[
      {reference:'1 Corinthians 10:13 (ESV)',verse:'No temptation has overtaken you that is not common to man. God is faithful, and he will not let you be tempted beyond your ability, but with the temptation he will also provide the way of escape, that you may be able to endure it.',reflection:'Look for the exit before you look at the temptation. God promised there is one.'},
      {reference:'Matthew 26:41 (ESV)',verse:'Watch and pray that you may not enter into temptation. The spirit indeed is willing, but the flesh is weak.',reflection:'Jesus does not shame the weak flesh — he gives the way through it: watch, and pray, before the moment arrives.'},
      {reference:'James 1:14-15 (ESV)',verse:'But each person is tempted when he is lured and enticed by his own desire. Then desire when it has conceived gives birth to sin.',reflection:'Temptation has a lifecycle. The earliest moment — before it conceives — is the easiest place to say no.'},
      {reference:'Hebrews 4:15 (ESV)',verse:'For we do not have a high priest who is unable to sympathize with our weaknesses, but one who in every respect has been tempted as we are, yet without sin.',reflection:'You are not being judged from a distance. Jesus was tempted in every way you are — and he understands.'},
      {reference:'Hebrews 2:18 (ESV)',verse:'For because he himself has suffered when tempted, he is able to help those who are being tempted.',reflection:'The One you are calling on has stood exactly where you are standing. He knows the pull, and he helps.'},
      {reference:'Genesis 4:7 (ESV)',verse:'And if you do not do well, sin is crouching at the door. Its desire is contrary to you, but you must rule over it.',reflection:'The urge is at the door, not inside the house yet. You still hold the handle.'},
      {reference:'Proverbs 4:14-15 (ESV)',verse:'Do not enter the path of the wicked, and do not walk in the way of the evil. Avoid it; do not go on it; turn away from it and pass on.',reflection:'The strongest move against temptation is often made a few steps early — by not walking down that street at all.'},
      {reference:'James 4:7 (ESV)',verse:'Submit yourselves therefore to God. Resist the devil, and he will flee from you.',reflection:'Resistance is not white-knuckling alone. Hand it to God first, then stand — and watch what has to flee.'},
      {reference:'Psalm 119:11 (ESV)',verse:'I have stored up your word in my heart, that I might not sin against you.',reflection:'What you hid in your heart in the calm becomes your defense in the storm.'},
      {reference:'2 Peter 2:9 (ESV)',verse:'Then the Lord knows how to rescue the godly from trials, and to keep the unrighteous under punishment until the day of judgment.',reflection:'He is not confused by your situation. Rescue is something he knows how to do.'},
    ],
    grief:[
      {reference:'Psalm 34:18 (ESV)',verse:'The Lord is near to the brokenhearted and saves the crushed in spirit.',reflection:'In loss, God draws nearer, not further. The crushing is where he meets you.'},
      {reference:'Matthew 5:4 (ESV)',verse:'Blessed are those who mourn, for they shall be comforted.',reflection:'Your grief is not a failure of faith. Jesus called mourners blessed and promised them comfort.'},
      {reference:'John 11:35 (ESV)',verse:'Jesus wept.',reflection:'The shortest verse in the Bible is God himself crying at a grave. He does not rush your tears.'},
      {reference:'1 Thessalonians 4:13 (ESV)',verse:'But we do not want you to be uninformed, brothers, about those who are asleep, that you may not grieve as others do who have no hope.',reflection:'You are allowed to grieve. But grieve with hope — for those in Christ, the goodbye is not forever.'},
      {reference:'Psalm 23:4 (ESV)',verse:'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me.',reflection:'It is a valley you walk through, not stay in — and you are not walking it alone.'},
      {reference:'Revelation 21:4 (ESV)',verse:'He will wipe away every tear from their eyes, and death shall be no more, neither shall there be mourning, nor crying, nor pain anymore.',reflection:'There is coming a day with no more death, no more mourning. This pain is real, but it is not the last word.'},
      {reference:'Isaiah 61:3 (ESV)',verse:'To grant to those who mourn in Zion — to give them a beautiful headdress instead of ashes, the oil of gladness instead of mourning.',reflection:'God specializes in exchanges: beauty for ashes. Nothing you have lost is beyond his redeeming.'},
      {reference:'2 Corinthians 1:3-4 (ESV)',verse:'Blessed be the God of all comfort, who comforts us in all our affliction, so that we may be able to comfort those who are in any affliction.',reflection:'The comfort you receive now becomes comfort you will one day carry to someone else in the same valley.'},
      {reference:'Psalm 30:5 (ESV)',verse:'Weeping may tarry for the night, but joy comes with the morning.',reflection:'Grief has a night to it. Morning is promised, even if you cannot see the sky yet.'},
      {reference:'John 14:1-2 (ESV)',verse:'Let not your hearts be troubled. Believe in God; believe also in me. In my Father\'s house are many rooms.',reflection:'The one you are missing, if they were his, is more home now than they have ever been.'},
    ],
    patience:[
      {reference:'Romans 8:25 (ESV)',verse:'But if we hope for what we do not see, we wait for it with patience.',reflection:'Waiting is not wasted time. It is hope doing its quiet work in you.'},
      {reference:'James 5:7-8 (ESV)',verse:'Be patient, therefore, brothers, until the coming of the Lord. See how the farmer waits for the precious fruit of the earth, being patient about it, until it receives the early and the late rains.',reflection:'The farmer cannot rush the harvest, and neither can you. Growth keeps its own clock.'},
      {reference:'Psalm 27:14 (ESV)',verse:'Wait for the Lord; be strong, and let your heart take courage; wait for the Lord!',reflection:'Waiting takes more courage than acting. He says it twice because he knows how hard it is.'},
      {reference:'Lamentations 3:25-26 (ESV)',verse:'The Lord is good to those who wait for him, to the soul who seeks him. It is good that one should wait quietly for the salvation of the Lord.',reflection:'Quiet waiting is not doing nothing. It is trusting that his timing is kinder than yours.'},
      {reference:'Habakkuk 2:3 (ESV)',verse:'For still the vision awaits its appointed time; it hastens to the end—it will not lie. If it seems slow, wait for it; it will surely come.',reflection:'What God promised has an appointed time. Slow is not the same as never.'},
      {reference:'Psalm 40:1 (ESV)',verse:'I waited patiently for the Lord; he inclined to me and heard my cry.',reflection:'The waiting was real, and so was the answer. He leaned in and heard.'},
      {reference:'Galatians 6:9 (ESV)',verse:'And let us not grow weary of doing good, for in due season we will reap, if we do not give up.',reflection:'The season is coming. Keep sowing even when nothing seems to be growing yet.'},
      {reference:'Ecclesiastes 3:1 (ESV)',verse:'For everything there is a season, and a time for every matter under heaven.',reflection:'This season is not the whole story. There is a time appointed for what you are waiting on.'},
      {reference:'Romans 12:12 (ESV)',verse:'Rejoice in hope, be patient in tribulation, be constant in prayer.',reflection:'Patience is not passive. It leans on hope and holds on in prayer while it waits.'},
      {reference:'Isaiah 40:31 (ESV)',verse:'But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary.',reflection:'The strength you are missing is on the other side of the wait — not the rush.'},
    ],
    gratitude:[
      {reference:'1 Thessalonians 5:18 (ESV)',verse:'Give thanks in all circumstances; for this is the will of God in Christ Jesus for you.',reflection:'In, not for. You do not have to be thankful for the hard thing — just find one thing to be thankful for inside it.'},
      {reference:'Psalm 100:4 (ESV)',verse:'Enter his gates with thanksgiving, and his courts with praise! Give thanks to him; bless his name!',reflection:'Gratitude is the doorway in. Start there and the rest of the room opens.'},
      {reference:'Philippians 4:6 (ESV)',verse:'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',reflection:'Thanksgiving is how anxious prayers get their footing. Name what is already good before you ask for more.'},
      {reference:'Psalm 103:2 (ESV)',verse:'Bless the Lord, O my soul, and forget not all his benefits.',reflection:'The soul forgets fast. Gratitude is the practice of remembering on purpose.'},
      {reference:'James 1:17 (ESV)',verse:'Every good gift and every perfect gift is from above, coming down from the Father of lights.',reflection:'Trace anything good in your life back far enough and you find the same generous source.'},
      {reference:'Psalm 118:24 (ESV)',verse:'This is the day that the Lord has made; let us rejoice and be glad in it.',reflection:'Not tomorrow, not the day things get better. This one. It was made on purpose.'},
      {reference:'Luke 17:15-16 (ESV)',verse:'Then one of them, when he saw that he was healed, turned back, praising God with a loud voice; and he fell on his face at Jesus\' feet, giving him thanks.',reflection:'Ten were healed; one came back to say thanks. Be the one who turns around.'},
      {reference:'Colossians 3:15 (ESV)',verse:'And let the peace of Christ rule in your hearts, to which indeed you were called in one body. And be thankful.',reflection:'And be thankful. Sometimes the simplest command is the one that resets everything.'},
      {reference:'1 Chronicles 16:34 (ESV)',verse:'Oh give thanks to the Lord, for he is good; for his steadfast love endures forever!',reflection:'When you cannot find something to thank him for in your circumstances, thank him for who he is.'},
      {reference:'Psalm 107:1 (ESV)',verse:'Oh give thanks to the Lord, for he is good, for his steadfast love endures forever!',reflection:'Even on a day with little to feel, his goodness and love are still standing. Thank him for that.'},
    ],
    purity:[
      {reference:'Matthew 5:8 (ESV)',verse:'Blessed are the pure in heart, for they shall see God.',reflection:'Purity is not punishment — it clears the fog so you can actually see him.'},
      {reference:'Psalm 51:10 (ESV)',verse:'Create in me a clean heart, O God, and renew a right spirit within me.',reflection:'You do not have to scrub yourself clean. Ask him to create it — that is his work, not yours.'},
      {reference:'Psalm 119:9 (ESV)',verse:'How can a young man keep his way pure? By guarding it according to your word.',reflection:'The path stays clear the same way it always has: guarding it, one honest choice at a time.'},
      {reference:'Philippians 4:8 (ESV)',verse:'Finally, brothers, whatever is true, whatever is honorable, whatever is just, whatever is pure, whatever is lovely — think about these things.',reflection:'What you feed your mind, you become. Purity often starts with what you choose to dwell on.'},
      {reference:'Titus 1:15 (ESV)',verse:'To the pure, all things are pure, but to the defiled and unbelieving, nothing is pure.',reflection:'Purity changes how you see everything — it cleans the lens, not just the behavior.'},
      {reference:'1 John 3:3 (ESV)',verse:'And everyone who thus hopes in him purifies himself as he is pure.',reflection:'Purity grows from hope, not fear. Fix your eyes on him and you start to look like him.'},
      {reference:'Psalm 24:3-4 (ESV)',verse:'Who shall ascend the hill of the Lord? And who shall stand in his holy place? He who has clean hands and a pure heart.',reflection:'God is not after perfect people, but honest ones — clean hands come from a heart that keeps returning to him.'},
      {reference:'Hebrews 10:22 (ESV)',verse:'Let us draw near with a true heart in full assurance of faith, with our hearts sprinkled clean from an evil conscience.',reflection:'You come near with a clean heart he gave you, not one you manufactured. Draw near anyway.'},
      {reference:'2 Timothy 2:22 (ESV)',verse:'So flee youthful passions and pursue righteousness, faith, love, and peace, along with those who call on the Lord from a pure heart.',reflection:'Purity is two moves: run from one thing, run toward another. Do not just resist — replace.'},
      {reference:'1 Timothy 4:12 (ESV)',verse:'Set the believers an example in speech, in conduct, in love, in faith, in purity.',reflection:'Purity is not just private — it quietly becomes a gift to everyone watching how you live.'},
    ],
    perseverance:[
      {reference:'Galatians 6:9 (ESV)',verse:'And let us not grow weary of doing good, for in due season we will reap, if we do not give up.',reflection:'The harvest comes to those who do not quit before the season. Keep going.'},
      {reference:'James 1:12 (ESV)',verse:'Blessed is the man who remains steadfast under trial, for when he has stood the test he will receive the crown of life.',reflection:'The reward is not for starting — it is for staying. Standing firm is itself the victory.'},
      {reference:'Hebrews 12:1 (ESV)',verse:'Let us also lay aside every weight, and sin which clings so closely, and let us run with endurance the race that is set before us.',reflection:'It is a race with endurance, not a sprint. Pace yourself, but do not stop.'},
      {reference:'Philippians 3:14 (ESV)',verse:'I press on toward the goal for the prize of the upward call of God in Christ Jesus.',reflection:'Press on. Not because you have arrived, but because the goal is worth the next step.'},
      {reference:'Romans 5:3-4 (ESV)',verse:'We rejoice in our sufferings, knowing that suffering produces endurance, and endurance produces character, and character produces hope.',reflection:'What you are enduring is not pointless. It is building something in you that shortcuts never could.'},
      {reference:'2 Timothy 4:7 (ESV)',verse:'I have fought the good fight, I have finished the race, I have kept the faith.',reflection:'This is how it ends when you do not give up. Finished. Faithful. Keep walking toward it.'},
      {reference:'1 Corinthians 15:58 (ESV)',verse:'Therefore, my beloved brothers, be steadfast, immovable, always abounding in the work of the Lord, knowing that in the Lord your labor is not in vain.',reflection:'None of your faithful effort is wasted, even the parts no one sees. Not in vain — his words.'},
      {reference:'Hebrews 10:36 (ESV)',verse:'For you have need of endurance, so that when you have done the will of God you may receive what is promised.',reflection:'The gap between doing right and receiving the promise is bridged by one thing: endurance.'},
      {reference:'Matthew 24:13 (ESV)',verse:'But the one who endures to the end will be saved.',reflection:'You do not have to be the fastest or the strongest. You have to be the one still standing at the end.'},
      {reference:'Isaiah 40:31 (ESV)',verse:'They shall run and not be weary; they shall walk and not faint.',reflection:'Some days you run, some days you can only walk. Both count. Just do not faint.'},
    ],
    healing:[
      {reference:'Jeremiah 17:14 (ESV)',verse:'Heal me, O Lord, and I shall be healed; save me, and I shall be saved, for you are my praise.',reflection:'It is okay to ask plainly. He is the healer, and the asking is a form of praise.'},
      {reference:'Psalm 147:3 (ESV)',verse:'He heals the brokenhearted and binds up their wounds.',reflection:'He does not just patch you up. He binds the wound with the care of someone who means to see it healed.'},
      {reference:'Exodus 15:26 (ESV)',verse:'For I am the Lord, your healer.',reflection:'Healer is not just something he does. It is who he is — a name he gave himself.'},
      {reference:'Isaiah 53:5 (ESV)',verse:'But he was pierced for our transgressions; he was crushed for our iniquities; upon him was the chastisement that brought us peace, and with his wounds we are healed.',reflection:'The healing you need cost him something. His wounds went toward yours.'},
      {reference:'James 5:14-15 (ESV)',verse:'Is anyone among you sick? Let him call for the elders of the church, and let them pray over him. And the prayer of faith will save the one who is sick.',reflection:'Do not carry sickness alone. Healing often comes through community — let people pray over you.'},
      {reference:'Psalm 103:2-3 (ESV)',verse:'Bless the Lord, O my soul, and forget not all his benefits, who forgives all your iniquity, who heals all your diseases.',reflection:'Whatever the diagnosis, it does not change his character. He is still the one who heals.'},
      {reference:'Matthew 11:28 (ESV)',verse:'Come to me, all who labor and are heavy laden, and I will give you rest.',reflection:'Some healing is rest. Come as you are, tired and heavy, and let him carry it a while.'},
      {reference:'Psalm 30:2 (ESV)',verse:'O Lord my God, I cried to you for help, and you have healed me.',reflection:'The cry and the healing belong in the same sentence. Cry out — he hears.'},
      {reference:'Malachi 4:2 (ESV)',verse:'But for you who fear my name, the sun of righteousness shall rise with healing in its wings.',reflection:'Healing rises like a sunrise — sometimes slow, but sure, and it drives out the dark.'},
      {reference:'3 John 1:2 (ESV)',verse:'Beloved, I pray that all may go well with you and that you may be in good health, as it goes well with your soul.',reflection:'God\'s heart toward your body is good. Your wellness is something he cares about, too.'},
    ],
    doubt:[
      {reference:'Mark 9:24 (ESV)',verse:'Immediately the father of the child cried out and said, I believe; help my unbelief!',reflection:'This is a prayer God honors. You do not need perfect faith — just an honest one that asks for help.'},
      {reference:'John 20:27 (ESV)',verse:'Then he said to Thomas, Put your finger here, and see my hands; and put out your hand, and place it in my side. Do not disbelieve, but believe.',reflection:'Jesus did not scold Thomas\'s doubt — he met it with evidence. He can handle your questions too.'},
      {reference:'James 1:5-6 (ESV)',verse:'If any of you lacks wisdom, let him ask God, who gives generously to all without reproach, and it will be given him.',reflection:'God does not hold your questions against you. Ask — he gives without a lecture.'},
      {reference:'Jude 1:22 (ESV)',verse:'And have mercy on those who doubt.',reflection:'Doubt is met with mercy in God\'s economy, not condemnation. Be as gentle with yourself.'},
      {reference:'Matthew 14:31 (ESV)',verse:'Jesus immediately reached out his hand and took hold of him, saying to him, O you of little faith, why did you doubt?',reflection:'Peter doubted mid-miracle — and Jesus still caught him. Sinking is not the end; his hand is right there.'},
      {reference:'John 6:37 (ESV)',verse:'All that the Father gives me will come to me, and whoever comes to me I will never cast out.',reflection:'Come with the doubts and all. He has never once turned away someone honest enough to show up.'},
      {reference:'Isaiah 55:8-9 (ESV)',verse:'For my thoughts are not your thoughts, neither are your ways my ways, declares the Lord.',reflection:'Some doubt comes from expecting God to fit your logic. He is bigger than your framework, and that is good news.'},
      {reference:'Hebrews 11:1 (ESV)',verse:'Now faith is the assurance of things hoped for, the conviction of things not seen.',reflection:'Faith was never about seeing everything clearly. It is holding on in the unseen — and that is allowed to be hard.'},
      {reference:'Proverbs 3:5-6 (ESV)',verse:'Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.',reflection:'When your understanding runs out, that is not the end of faith — it is where trust actually begins.'},
      {reference:'Psalm 73:26 (ESV)',verse:'My flesh and my heart may fail, but God is the strength of my heart and my portion forever.',reflection:'Even when your certainty fails, he does not. He is the ground under the doubt.'},
    ],
    provision:[
      {reference:'Matthew 6:26 (ESV)',verse:'Look at the birds of the air: they neither sow nor reap nor gather into barns, and yet your heavenly Father feeds them. Are you not of more value than they?',reflection:'If he feeds the birds, he has not forgotten you. You are worth more to him than you feel right now.'},
      {reference:'Philippians 4:19 (ESV)',verse:'And my God will supply every need of yours according to his riches in glory in Christ Jesus.',reflection:'Every need — measured against his riches, not your bank balance.'},
      {reference:'Matthew 6:31-33 (ESV)',verse:'Do not be anxious, saying, What shall we eat? or What shall we drink?... But seek first the kingdom of God and his righteousness, and all these things will be added to you.',reflection:'The worry is real, but so is the order: seek him first, and the rest gets handled.'},
      {reference:'Psalm 37:25 (ESV)',verse:'I have been young, and now am old, yet I have not seen the righteous forsaken or his children begging for bread.',reflection:'A lifetime of watching, and God never once dropped the ball on his own. He will not start with you.'},
      {reference:'Luke 12:24 (ESV)',verse:'Consider the ravens: they neither sow nor reap, they have neither storehouse nor barn, and yet God feeds them. Of how much more value are you than the birds!',reflection:'You are not a burden to God\'s budget. He delights to provide for what he loves.'},
      {reference:'2 Corinthians 9:8 (ESV)',verse:'And God is able to make all grace abound to you, so that having all sufficiency in all things at all times, you may abound in every good work.',reflection:'Sufficiency — enough — is the promise. Not always extra, but always enough.'},
      {reference:'Matthew 6:11 (ESV)',verse:'Give us this day our daily bread.',reflection:'Daily bread — enough for today. He rarely shows you the whole road, just the next meal. That is on purpose.'},
      {reference:'Genesis 22:14 (ESV)',verse:'So Abraham called the name of that place, The Lord will provide; as it is said to this day, On the mount of the Lord it shall be provided.',reflection:'On the mountain, at the last moment, provision showed up. He has a name for exactly this: the Lord will provide.'},
      {reference:'Psalm 34:10 (ESV)',verse:'The young lions suffer want and hunger; but those who seek the Lord lack no good thing.',reflection:'Even the strong go hungry, but those who seek him are not left without what is truly good.'},
      {reference:'1 Kings 17:14 (ESV)',verse:'For thus says the Lord, the God of Israel, The jar of flour shall not be spent, and the jug of oil shall not be empty, until the day that the Lord sends rain upon the earth.',reflection:'God stretched a widow\'s last handful through a famine. He can make your little last longer than the math allows.'},
    ],
  };

  let result=[];
  const used=new Set();
  themes.forEach(theme=>{
    const tv=TV[theme]||TV.strength;
    tv.forEach(v=>{
      if(!used.has(v.reference)){used.add(v.reference);result.push(v);}
    });
  });
  
  // Stable shuffle keyed off the query — same query returns same order, different queries vary
  if(result.length > 8){
    const seed = Array.from(f).reduce((a,c)=>(a*31 + c.charCodeAt(0)) | 0, 7);
    let s = Math.abs(seed);
    result = result.map(v => {
      // Deterministic pseudo-random per item
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return {v, k: s};
    }).sort((a,b)=>a.k-b.k).map(o=>o.v);
  }
  
  return result.slice(0,8);
}

// helloao addresses books by USFM id. Unnumbered names happen to work as-is ("John", "Psalms"), but
// every numbered book 404s ("1Corinthians"), which is why the ASV/WEB tier silently fell through to
// bible-api.com for a fifth of the Bible. Only the ones that differ need mapping.
const _HELLOAO_USFM = {
  '1 Samuel':'1SA','2 Samuel':'2SA','1 Kings':'1KI','2 Kings':'2KI',
  '1 Chronicles':'1CH','2 Chronicles':'2CH','1 Corinthians':'1CO','2 Corinthians':'2CO',
  '1 Thessalonians':'1TH','2 Thessalonians':'2TH','1 Timothy':'1TI','2 Timothy':'2TI',
  '1 Peter':'1PE','2 Peter':'2PE','1 John':'1JN','2 John':'2JN','3 John':'3JN',
  'Song of Solomon':'SNG','Song of Songs':'SNG'
};
function _helloaoBook(name){
  return _HELLOAO_USFM[name] || String(name||'').replace(/\s+/g,'');
}
const BIBLE_BOOKS=[
  {id:'genesis',name:'Genesis',chapters:50},{id:'exodus',name:'Exodus',chapters:40},{id:'leviticus',name:'Leviticus',chapters:27},
  {id:'numbers',name:'Numbers',chapters:36},{id:'deuteronomy',name:'Deuteronomy',chapters:34},{id:'joshua',name:'Joshua',chapters:24},
  {id:'judges',name:'Judges',chapters:21},{id:'ruth',name:'Ruth',chapters:4},{id:'1-samuel',name:'1 Samuel',chapters:31},
  {id:'2-samuel',name:'2 Samuel',chapters:24},{id:'1-kings',name:'1 Kings',chapters:22},{id:'2-kings',name:'2 Kings',chapters:25},
  {id:'1-chronicles',name:'1 Chronicles',chapters:29},{id:'2-chronicles',name:'2 Chronicles',chapters:36},
  {id:'ezra',name:'Ezra',chapters:10},{id:'nehemiah',name:'Nehemiah',chapters:13},{id:'esther',name:'Esther',chapters:10},
  {id:'job',name:'Job',chapters:42},{id:'psalms',name:'Psalms',chapters:150},{id:'proverbs',name:'Proverbs',chapters:31},
  {id:'ecclesiastes',name:'Ecclesiastes',chapters:12},{id:'song-of-solomon',name:'Song of Solomon',chapters:8},
  {id:'isaiah',name:'Isaiah',chapters:66},{id:'jeremiah',name:'Jeremiah',chapters:52},{id:'lamentations',name:'Lamentations',chapters:5},
  {id:'ezekiel',name:'Ezekiel',chapters:48},{id:'daniel',name:'Daniel',chapters:12},{id:'hosea',name:'Hosea',chapters:14},
  {id:'joel',name:'Joel',chapters:3},{id:'amos',name:'Amos',chapters:9},{id:'obadiah',name:'Obadiah',chapters:1},
  {id:'jonah',name:'Jonah',chapters:4},{id:'micah',name:'Micah',chapters:7},{id:'nahum',name:'Nahum',chapters:3},
  {id:'habakkuk',name:'Habakkuk',chapters:3},{id:'zephaniah',name:'Zephaniah',chapters:3},{id:'haggai',name:'Haggai',chapters:2},
  {id:'zechariah',name:'Zechariah',chapters:14},{id:'malachi',name:'Malachi',chapters:4},
  {id:'matthew',name:'Matthew',chapters:28},{id:'mark',name:'Mark',chapters:16},{id:'luke',name:'Luke',chapters:24},
  {id:'john',name:'John',chapters:21},{id:'acts',name:'Acts',chapters:28},{id:'romans',name:'Romans',chapters:16},
  {id:'1-corinthians',name:'1 Corinthians',chapters:16},{id:'2-corinthians',name:'2 Corinthians',chapters:13},
  {id:'galatians',name:'Galatians',chapters:6},{id:'ephesians',name:'Ephesians',chapters:6},{id:'philippians',name:'Philippians',chapters:4},
  {id:'colossians',name:'Colossians',chapters:4},{id:'1-thessalonians',name:'1 Thessalonians',chapters:5},
  {id:'2-thessalonians',name:'2 Thessalonians',chapters:3},{id:'1-timothy',name:'1 Timothy',chapters:6},
  {id:'2-timothy',name:'2 Timothy',chapters:4},{id:'titus',name:'Titus',chapters:3},{id:'philemon',name:'Philemon',chapters:1},
  {id:'hebrews',name:'Hebrews',chapters:13},{id:'james',name:'James',chapters:5},{id:'1-peter',name:'1 Peter',chapters:5},
  {id:'2-peter',name:'2 Peter',chapters:3},{id:'1-john',name:'1 John',chapters:5},{id:'2-john',name:'2 John',chapters:1},
  {id:'3-john',name:'3 John',chapters:1},{id:'jude',name:'Jude',chapters:1},{id:'revelation',name:'Revelation',chapters:22},
];
let brInitialized=false;

function initBibleReader(){
  if(brInitialized)return;brInitialized=true;
  const bookSel=document.getElementById('br-book');if(!bookSel)return;
  BIBLE_BOOKS.forEach(b=>{const opt=document.createElement('option');opt.value=b.id;opt.textContent=b.name;bookSel.appendChild(opt);});
  // Resume from last read position if saved, else default to John 3
  const lastPos = ls('totry_bible_last_position');
  if(lastPos && lastPos.book){
    bookSel.value = lastPos.book;
    onBibleBookChange(false);
    const chapSel = document.getElementById('br-chapter');
    if(chapSel && lastPos.chapter) chapSel.value = lastPos.chapter;
  } else {
    bookSel.value='john';onBibleBookChange(false);
    document.getElementById('br-chapter').value='3';
  }
  loadBibleChapter();
}
// setBibleTab - see unified version below
function onBibleBookChange(load){
  load=load===undefined?true:load;
  const bookId=document.getElementById('br-book').value;
  const book=BIBLE_BOOKS.find(b=>b.id===bookId);if(!book)return;
  const chapSel=document.getElementById('br-chapter');chapSel.innerHTML='';
  for(let i=1;i<=book.chapters;i++){const o=document.createElement('option');o.value=i;o.textContent=i;chapSel.appendChild(o);}
  if(load)loadBibleChapter();
}
async function loadBibleChapter(){
  const bookId=document.getElementById('br-book').value;
  const chapter=document.getElementById('br-chapter').value;
  // Persist position immediately so closing/reopening reader resumes here
  ls('totry_bible_last_position', {book: bookId, chapter: chapter, ts: Date.now()});
  const translation=document.getElementById('br-translation').value;
  const book=BIBLE_BOOKS.find(b=>b.id===bookId);if(!book)return;
  document.getElementById('br-loading').style.display='block';
  document.getElementById('br-chapter-display').style.display='none';
  let verses=null, apiUsed='', lastError='';
  
  // Translation preference: 'esv' uses ESV, anything else skips ESV and goes straight to public
  const wantsESV = (translation === 'esv' || translation === undefined || translation === null || translation === '');
  
  // 1. Try ESV via session cache → direct API
  if(wantsESV){
    const cacheKey = book.name + ' ' + chapter;
    if(_esvSessionCache[cacheKey]){
      verses = parseESVText(_esvSessionCache[cacheKey]);
      apiUsed = 'ESV';
    } else {
      // Through esvPassage(), which prefers the key-proxy edge function and then a key the person
      // supplied. Returns null when neither exists, and the helloao/bible-api fallbacks below pick it
      // up — they need no key, so a missing ESV credential costs a translation, never the reader.
      const passage = await esvPassage(book.name + ' ' + chapter);
      if(passage){
        _esvSessionCache[cacheKey] = passage;
        verses = parseESVText(passage);
        apiUsed = 'ESV';
      } else {
        lastError = 'ESV unavailable (no proxy and no key) — using a public translation';
      }
    }
  }
  
  // 2. Public Bible API (helloao) — covers ASV/KJV/WEB
  if(!verses){
    try{
      const _hid = (translation==='kjv') ? null : (translation==='web' ? 'ENGWEBP' : 'eng_asv');
      if(!_hid) throw new Error('helloao has no KJV');
      const _usfm = _helloaoBook(book.name);
      const r=await fetch('https://bible.helloao.org/api/'+_hid+'/'+_usfm+'/'+chapter+'.json');
      if(r.ok){const d=await r.json();const vs=d.chapter?.verses||d.verses||[];if(vs.length){verses=vs.map(v=>({num:v.number||v.verseNumber,text:v.text||v.content}));apiUsed=translation==='kjv'?'KJV':'ASV';}}
    }catch(e){ lastError = lastError || 'helloao failed'; }
  }
  
  // 3. bible-api.com (KJV/WEB)
  if(!verses){
    try{
      const r=await fetch('https://bible-api.com/'+encodeURIComponent(book.name+' '+chapter)+'?translation='+(translation==='kjv'?'kjv':'web'));
      if(r.ok){const d=await r.json();if(d.verses){verses=d.verses.map(v=>({num:v.verse,text:v.text}));apiUsed=translation==='kjv'?'KJV':'WEB';}}
    }catch(e){ lastError = lastError || 'bible-api failed'; }
  }
  
  // 4. jsdelivr fallback
  if(!verses){
    try{
      const r=await fetch('https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/'+(translation||'en-asv')+'/books/'+String(bookId).replace(/^(\d)-/, function(_m, d){ return d; })+'/chapters/'+chapter+'.json');
      if(r.ok){const d=await r.json();if(d.verses){verses=d.verses.map(v=>({num:v.verse||v.verseNumber||v.v,text:v.text||v.t}));apiUsed='ASV';}}
    }catch(e){ lastError = lastError || 'jsdelivr failed'; }
  }
  
  document.getElementById('br-loading').style.display='none';
  if(verses && verses.length){
    document.getElementById('br-chapter-display').style.display='block';
    document.getElementById('br-chapter-title').textContent=book.name+' '+chapter;
    document.getElementById('br-api-credit').textContent=apiUsed;
    const container=document.getElementById('br-verses');container.innerHTML='';
    verses.forEach(v=>{
      if(!v.text||v.text.trim()==='')return;
      const row=document.createElement('div');row.className='bible-verse-row';
      row.innerHTML='<span class="bvn">'+v.num+'</span><span class="bvt">'+v.text.trim()+'</span>';
      row.onclick=()=>{row.classList.toggle('highlighted');if(row.classList.contains('highlighted'))saveVerseFromReader(v.text.trim(),book.name+' '+chapter+':'+v.num);};
      container.appendChild(row);
    });
    // Study notes (Tyndale Open Study Notes, free via helloao) — collapsed by default.
    let notesWrap = document.getElementById('br-study-notes');
    if(!notesWrap){
      notesWrap = document.createElement('div');
      notesWrap.id = 'br-study-notes';
      notesWrap.style.cssText = 'margin-top:18px';
      container.parentNode.appendChild(notesWrap);
    }
    notesWrap.innerHTML = '<button class="btn" onclick="loadStudyNotes()" style="background:var(--bg3);border:1px solid var(--go-bd);color:var(--go);font-size:13px;width:100%">Show study notes for this chapter</button><div id="br-notes-body" style="margin-top:12px"></div>';
    window.__currentChapterRef = { bookId: bookId, bookName: book.name, chapter: chapter };
  }else{
    document.getElementById('br-chapter-display').style.display='block';
    document.getElementById('br-chapter-title').textContent='Could not load';
    document.getElementById('br-verses').innerHTML='<p style="font-size:13px;color:var(--tx3);padding:8px">Could not load chapter. '+(lastError?'<br><span style="font-size:11px">('+lastError+')</span>':'')+'</p>';
  }
}
// Fetch Tyndale Open Study Notes for the current chapter (free, no key, via helloao commentary API).
async function loadStudyNotes(){
  const body = document.getElementById('br-notes-body');
  const ref = window.__currentChapterRef;
  if(!body || !ref) return;
  body.innerHTML = '<div style="font-size:13px;color:var(--tx3);padding:8px;font-style:italic">Loading study notes…</div>';
  // helloao commentary endpoint uses USFM-style book IDs (e.g. GEN, JHN). Map common names.
  const bookCode = bibleBookToUSFM(ref.bookName);
  let notes = null;
  try{
    const r = await fetch('https://bible.helloao.org/api/c/tyndale/'+bookCode+'/'+ref.chapter+'.json');
    if(r.ok){ const d = await r.json(); notes = (d.chapter && d.chapter.content) || d.content || null; }
  }catch(_){ }
  if(!notes || !notes.length){
    body.innerHTML = '<div style="font-size:13px;color:var(--tx2);line-height:1.6;padding:8px;background:var(--bg3);border-radius:8px">No study notes are available for this chapter. Not every chapter has them yet — the Gospels and major books have the most.</div>';
    return;
  }
  // Render notes — each item may be {type, verseNumber, content[]}
  let html = '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px">Tyndale Open Study Notes</div>';
  notes.forEach(n => {
    const txt = Array.isArray(n.content) ? n.content.map(c => typeof c==='string'?c:(c.text||'')).join(' ') : (n.content || n.text || '');
    if(!txt) return;
    const label = n.verseNumber ? ('v'+n.verseNumber) : (n.reference || '');
    html += '<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--bd)">'+
      (label?'<span style="font-family:DM Mono,monospace;font-size:10px;color:var(--go);margin-right:6px">'+label+'</span>':'')+
      '<span style="font-size:13px;color:var(--tx2);line-height:1.65">'+txt.replace(/</g,'&lt;')+'</span></div>';
  });
  body.innerHTML = html;
}
// Map common Bible book names to USFM 3-letter codes used by the commentary API.
function bibleBookToUSFM(name){
  const M = {'Genesis':'GEN','Exodus':'EXO','Leviticus':'LEV','Numbers':'NUM','Deuteronomy':'DEU','Joshua':'JOS','Judges':'JDG','Ruth':'RUT','1 Samuel':'1SA','2 Samuel':'2SA','1 Kings':'1KI','2 Kings':'2KI','1 Chronicles':'1CH','2 Chronicles':'2CH','Ezra':'EZR','Nehemiah':'NEH','Esther':'EST','Job':'JOB','Psalms':'PSA','Psalm':'PSA','Proverbs':'PRO','Ecclesiastes':'ECC','Song of Solomon':'SNG','Isaiah':'ISA','Jeremiah':'JER','Lamentations':'LAM','Ezekiel':'EZK','Daniel':'DAN','Hosea':'HOS','Joel':'JOL','Amos':'AMO','Obadiah':'OBA','Jonah':'JON','Micah':'MIC','Nahum':'NAM','Habakkuk':'HAB','Zephaniah':'ZEP','Haggai':'HAG','Zechariah':'ZEC','Malachi':'MAL','Matthew':'MAT','Mark':'MRK','Luke':'LUK','John':'JHN','Acts':'ACT','Romans':'ROM','1 Corinthians':'1CO','2 Corinthians':'2CO','Galatians':'GAL','Ephesians':'EPH','Philippians':'PHP','Colossians':'COL','1 Thessalonians':'1TH','2 Thessalonians':'2TH','1 Timothy':'1TI','2 Timothy':'2TI','Titus':'TIT','Philemon':'PHM','Hebrews':'HEB','James':'JAS','1 Peter':'1PE','2 Peter':'2PE','1 John':'1JN','2 John':'2JN','3 John':'3JN','Jude':'JUD','Revelation':'REV'};
  return M[name] || name.toUpperCase().replace(/\s+/g,'').slice(0,3);
}
function parseESVText(text){
  const verses=[];const regex=/\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;let m;
  while((m=regex.exec(text))!==null)verses.push({num:parseInt(m[1]),text:m[2].replace(/\s+/g,' ').trim()});
  return verses;
}
function prevChapter(){
  const chapSel=document.getElementById('br-chapter');const val=parseInt(chapSel.value);
  if(val>1){chapSel.value=val-1;loadBibleChapter();}
  else{const bookSel=document.getElementById('br-book');const idx=BIBLE_BOOKS.findIndex(b=>b.id===bookSel.value);if(idx>0){bookSel.value=BIBLE_BOOKS[idx-1].id;onBibleBookChange(false);document.getElementById('br-chapter').value=BIBLE_BOOKS[idx-1].chapters;loadBibleChapter();}}
}
function nextChapter(){
  const bookSel=document.getElementById('br-book');const chapSel=document.getElementById('br-chapter');
  const book=BIBLE_BOOKS.find(b=>b.id===bookSel.value);const val=parseInt(chapSel.value);
  if(val<book.chapters){chapSel.value=val+1;loadBibleChapter();}
  else{const idx=BIBLE_BOOKS.findIndex(b=>b.id===bookSel.value);if(idx<BIBLE_BOOKS.length-1){bookSel.value=BIBLE_BOOKS[idx+1].id;onBibleBookChange(false);document.getElementById('br-chapter').value=1;loadBibleChapter();}}
}
async function searchBible(query){
  // SAFETY GATE — people type how they actually feel into a scripture search. If that's a
  // disclosure, a verse is not the answer; a human is. Same reasoning as findVerse.
  try{
    if(typeof detectCrisis==='function'){
      const _c = detectCrisis(query);
      if(_c){
        // 'br-search-results' is the container that EXISTS — it is what the non-crisis path below
        // writes into, nine lines down. The two ids this used to reach for appear nowhere in the app,
        // in markup or in JS, so the lookup always failed and the fallback dropped the card into a
        // clipped document.body where nobody could ever see it. findVerse() above is the right shape.
        const _r=document.getElementById('br-search-results');
        if(_r){
          _r.style.display='';
          _r.innerHTML='<div id="bsr-crisis-slot"></div>';
          if(typeof showCrisisResponse==='function') showCrisisResponse('bsr-crisis-slot', _c);
          try{ _r.scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){}
        } else if(typeof showCrisisResponse==='function'){
          // Last resort only. showCrisisResponse lifts an unseeable card into a fixed overlay itself,
          // so even this path now reaches the person rather than the document.
          const d=document.createElement('div'); d.id='bsr-crisis-slot'; document.body.appendChild(d);
          showCrisisResponse('bsr-crisis-slot', _c);
        }
        return;
      }
    }
  }catch(_){}
  query=(query||'').trim();
  if(!query)return;
  const res=document.getElementById('br-search-results');
  if(!res) return;   // never throw on a missing container — the crisis gate above has already run
  res.innerHTML='<p class="pulsing" style="font-family:\'Cormorant Garamond\',serif;font-size:15px;font-style:italic;color:var(--tx3);text-align:center;padding:16px">Listening to what you wrote...</p>';
  
  // Direct reference lookup (e.g. "John 3:16", "Romans 8:28-30")
  const refMatch=query.match(/^(\d?\s?[A-Za-z]+)\s+(\d+):(\d+)(-\d+)?$/);
  if(refMatch){
    try {
      const esvText = await fetchESV(query);
      if(esvText){
        res.innerHTML='';
        const el=document.createElement('div');
        el.className='bible-search-result';
        el.innerHTML='<div class="bsr-ref">'+query+' (ESV)</div><div class="bsr-text">'+esvText+'</div>';
        el.onclick=()=>saveVerseFromReader(esvText, query+' (ESV)');
        res.appendChild(el);
        return;
      }
    } catch(e){console.error('ESV err:',e);}
    try{
      const r=await fetch('https://bible-api.com/'+encodeURIComponent(query)+'?translation=kjv');
      if(r.ok){
        const d=await r.json();
        if(d.text){
          res.innerHTML='';
          const el=document.createElement('div');
          el.className='bible-search-result';
          el.innerHTML='<div class="bsr-ref">'+d.reference+' (KJV)</div><div class="bsr-text">'+d.text.trim()+'</div>';
          el.onclick=()=>saveVerseFromReader(d.text.trim(),d.reference+' (KJV)');
          res.appendChild(el);
          return;
        }
      }
    }catch(e){console.error(e);}
  }
  
  // SITUATIONAL MODE — reason purely from what the user wrote. No stored assumptions.
  const histKey='totry_bible_search_history_'+query.toLowerCase().slice(0,40);
  const shown=ls(histKey)||[];
  const excludeList=shown.length>0?'\n\nThey have already been shown these — pick different ones: '+shown.join(', ')+'.':'';
  const seed=Math.floor(Math.random()*100000);
  
  const prompt='Someone typed this into a scripture search:\n\n"'+query+'"\n\n'+
    'Read it closely. Interpret what they actually mean and what they are carrying — the specific situation, relationship, emotion, question, or need in THEIR words. Do not generalise it into a broad topic. If they mention a person, a fear, a specific sin, a decision, a doubt — respond to THAT precise thing.\n\n'+
    'Then select 5 Bible verses (ESV) that genuinely speak to their exact situation. Choose for depth and fit, not familiarity — mix well-known and overlooked passages, Old and New Testament. Each verse must clearly connect to what they wrote.'+excludeList+'\n\n'+
    '(diversity seed '+seed+')\n\n'+
    'Return ONLY this JSON, no markdown, no preamble:\n'+
    '{\n'+
    ' "reading": "2-3 sentences, written directly to them, showing you understood the specific thing they wrote — name it back to them and point to how scripture meets it. Warm, personal, never generic or preachy.",\n'+
    ' "verses": [{"reference":"Book Ch:V","text":"full ESV verse text","relevance":"one sentence: precisely how this verse speaks to what THEY wrote"}]\n'+
    '}';
  
  try{
    const raw=await api(BIBLE_SYS,[],prompt,1200);
    const m=raw.match(/\{[\s\S]*\}/);
    if(m){
      const data=JSON.parse(m[0]);
      const verses=data.verses||[];
      if(verses.length){
        res.innerHTML='';
        if(data.reading){
          const reading=document.createElement('div');
          reading.style.cssText='padding:14px 16px;margin-bottom:14px;background:linear-gradient(135deg,rgba(200,169,110,0.08),rgba(140,107,182,0.06));border:1px solid var(--go-bd);border-radius:12px;font-family:\'Cormorant Garamond\',serif;font-size:16px;font-style:italic;line-height:1.6;color:var(--tx)';
          reading.textContent=data.reading;
          res.appendChild(reading);
        }
        verses.forEach(v=>{
          const el=document.createElement('div');
          el.className='bible-search-result';
          el.innerHTML='<div class="bsr-ref">'+v.reference+'</div><div class="bsr-text">'+v.text+'</div>'+(v.relevance?'<div style="font-size:12px;color:var(--bl);margin-top:6px;line-height:1.5">'+v.relevance+'</div>':'');
          el.onclick=()=>saveVerseFromReader(v.text,v.reference);
          res.appendChild(el);
          if(!shown.includes(v.reference))shown.push(v.reference);
        });
        ls(histKey,shown.slice(-25));
        const actions=document.createElement('div');
        actions.style.cssText='display:flex;gap:8px;margin-top:12px';
        const more=document.createElement('button');
        more.className='btn';more.style.cssText='flex:1;font-size:12px';
        more.textContent='Show me more';
        more.onclick=()=>searchBible(query);
        actions.appendChild(more);
        const pray=document.createElement('button');
        pray.className='btn';
        pray.style.cssText='flex:1;font-size:12px;background:var(--go-bg);border-color:var(--go-bd);color:var(--go)';
        pray.textContent='Pray with this';
        pray.onclick=()=>generatePrayerFor(query, verses[0]);
        actions.appendChild(pray);
        res.appendChild(actions);
        return;
      }
    }
  }catch(e){console.error('Bible search failed:',e);}
  
  if(!navigator.onLine){
    res.innerHTML='<p style="font-size:13px;color:var(--tx3);text-align:center;padding:16px">You\'re offline. Scripture search needs a connection.</p>';
  } else {
    res.innerHTML='<p style="font-size:13px;color:var(--tx3);text-align:center;padding:16px">Couldn\'t reach scripture right now. Try again in a moment.</p>';
  }
}

// Personal prayer woven around a verse + exactly what the user wrote

// Generate a short personal prayer woven around a verse + the user's situation
// ── WS-H: AI prayer from intention + saints' library + save-to-list ──
// Save any prayer text to the prayer list (used by AI prayers, saint prayers, searched verses).
function savePrayerToList(text, category){
  if(!text || !text.trim()) return;
  const prayers = ls('totry_prayers') || [];
  prayers.unshift({ id: Date.now(), text: text.trim(), category: category||'', status:'open', createdAt: new Date().toISOString(), answeredAt:null, answerNote:'' });
  ls('totry_prayers', prayers);
  if(typeof syncToCloud==='function') syncToCloud();
  if(typeof renderPrayers==='function') renderPrayers();
  haptic('success'); showToast('Saved to prayers', 'You can come back and pray it again.');
}
// Generate a prayer from whatever the user brings — adapts to a worry, person, temptation, or thanks.
async function generateIntentionPrayer(pfx){
  // pfx lets this composer be hosted in a second place without duplicating element ids — the exact
  // collision that made two plate calculators read each other's input (v442). Defaults to the original
  // Christian panel's ids so every existing call site is unchanged.
  pfx = pfx || 'ai-prayer';
  const intention = (document.getElementById(pfx + '-intention')||{}).value || '';
  if(!intention.trim()){ showToast('What\u2019s on your heart?', 'Type what you\u2019d like to pray about first.'); return; }
  // SAFETY GATE \u2014 "What's on your heart?" is exactly where someone brings the worst of it. A person
  // typing that they want to die must get the crisis card and a real human, never a generated prayer.
  try{
    if(typeof detectCrisis==='function'){
      const _c = detectCrisis(intention);
      if(_c){
        const _o = document.getElementById(pfx + '-out');
        if(_o){ _o.style.display='block'; _o.innerHTML=''; }
        if(typeof showCrisisResponse==='function') showCrisisResponse(pfx + '-out', _c);
        return;
      }
    }
  }catch(_){}
  const btn = document.getElementById(pfx + '-btn'); const out = document.getElementById(pfx + '-out');
  if(btn){ btn.textContent='Writing...'; btn.disabled=true; }
  try{
    const name = (ls('totry_name')||'').trim();
    // faithPrayer() has carried per-tradition specs since the multi-faith work — du'a for Islam, a
    // dharma-grounded prayer for Hinduism, metta for Buddhism, and a Stoic reflection for secular
    // with "NO religious language whatsoever" — and NOTHING ever called it. This prompt was
    // hardcoded Catholic, so the one surface where a person says what is on their heart answered
    // everyone in one tradition's voice. The specs were built; they were simply never wired up.
    const _fp = (typeof faithPrayer === 'function') ? faithPrayer() : null;
    const sys = _fp ? _fp.sys : 'You write intimate, honest, scripturally-grounded Catholic prayers that sound deeply human — never rushed, never performative. A real person talking to God.';
    // v446 switched the SYSTEM prompt to faithPrayer() and left this one hardcoded — "bringing this to
    // God", "a relevant scripture echo". A system prompt saying "write a du'a" followed by a user
    // prompt saying "bringing this to God, weave in scripture" is not a fixed surface; it is two
    // instructions pulling opposite ways, and for a secular user it contradicts the one rule that
    // matters: no religious language at all.
    const _noun = (_fp && _fp.noun) ? _fp.noun : 'reflection';
    const _secular = ((typeof faithTradition === 'function') ? faithTradition() : 'secular') === 'secular';
    const prompt = _secular
      ? ('Write a short first-person reflection (4-6 sentences) for someone carrying this: "' + intention.trim() + '". Honest, practical, Stoic in spirit. Use NO religious language at all \u2014 no God, no prayer, no scripture.')
      : ('Write a short first-person ' + _noun + ' (4-6 sentences) for someone bringing this: "' + intention.trim() + '". Make it honest and specific to what they said, in their own tradition\u2019s voice and vocabulary.');
    const prayer = await api(sys, [], prompt, 700);
    if(out && prayer && prayer.trim()){
      window.__lastAIPrayer = prayer.trim();
      out.style.display='block';
      out.innerHTML = '<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">A prayer for this</div>'+
        '<div style="font-family:Cormorant Garamond,serif;font-size:16px;font-style:italic;line-height:1.75;color:var(--tx);margin-bottom:12px">'+prayer.trim().replace(/</g,'&lt;')+'</div>'+
        '<div style="display:flex;gap:8px"><button class="btn primary" style="flex:1;font-size:12px" onclick="savePrayerToList(window.__lastAIPrayer, &apos;'+(intention.trim().slice(0,30).replace(/'/g,"")).replace(/"/g,'')+'&apos;)">Save to my prayers</button><button class="btn" style="flex:1;font-size:12px;background:var(--bg3);border:1px solid var(--bd)" onclick="generateIntentionPrayer(\''+pfx+'\')">Write another</button></div>'+aiTag();
    } else if(out){ out.style.display='block'; out.innerHTML='<div style="font-size:12px;color:var(--tx3)">Couldn\u2019t write that just now. Try again in a moment.</div>'; }
  }catch(e){ if(out){ out.style.display='block'; out.innerHTML='<div style="font-size:12px;color:var(--tx3)">Couldn\u2019t reach the coach right now.</div>'; } }
  finally{ if(btn){ btn.textContent='Write my prayer'; btn.disabled=false; } }
}
// Saint prayers library — fetches the actual prayer text via AI (authentic, well-known prayers) + save.
async function showSaintPrayer(saint, title){
  const out = document.getElementById('saint-prayer-out');
  if(!out) return;
  out.style.display='block';
  out.innerHTML='<p class="pulsing" style="font-family:Cormorant Garamond,serif;font-style:italic;color:var(--tx3);text-align:center;padding:8px">Bringing '+saint+'\u2019s words...</p>';
  try{
    const sys='You provide the authentic, traditional text of well-known Catholic prayers exactly as commonly prayed. Return only the prayer text, no commentary or title.';
    const prompt='Give the traditional English text of the prayer "'+title+'" attributed to '+saint+'. Just the prayer itself, line breaks preserved.';
    const text=await api(sys,[],prompt,600);
    if(text && text.trim()){
      window.__lastSaintPrayer = text.trim();
      out.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">'+saint+' \u00b7 '+title+'</div>'+
        '<div style="font-family:Cormorant Garamond,serif;font-size:16px;font-style:italic;line-height:1.8;color:var(--tx);white-space:pre-wrap;margin-bottom:12px">'+text.trim().replace(/</g,'&lt;')+'</div>'+
        '<button class="btn" style="background:var(--bg3);border:1px solid var(--bd);font-size:12px" onclick="savePrayerToList(window.__lastSaintPrayer, &apos;'+saint.replace(/'/g,'')+'&apos;)">Save to my prayers</button>'+aiTag();
    } else { out.innerHTML='<div style="font-size:12px;color:var(--tx3)">Couldn\u2019t load that prayer right now.</div>'; }
  }catch(e){ out.innerHTML='<div style="font-size:12px;color:var(--tx3)">Couldn\u2019t reach the library right now.</div>'; }
}

async function generatePrayerFor(situation, verse){
  const res=document.getElementById('br-search-results');
  const existing=res.innerHTML;
  const prayerBox=document.createElement('div');
  prayerBox.style.cssText='padding:16px;margin-top:12px;background:var(--bg3);border:1px solid var(--go-bd);border-radius:12px';
  prayerBox.innerHTML='<p class="pulsing" style="font-family:\'Cormorant Garamond\',serif;font-style:italic;color:var(--tx3);text-align:center">Writing a prayer...</p>';
  res.appendChild(prayerBox);
  
  const name=ls('totry_name')||'';
  const prompt='Write a short, honest, first-person prayer (3-5 sentences) for someone carrying: "'+situation+'". Anchor it in '+(verse?verse.reference+' ("'+verse.text+'")':'scripture')+'. Make it sound like a real person talking to God, not religious performance. No "thee/thou".'+(name?' Their name is '+name+' if natural to reference.':'');
  try{
    const prayer=await api((typeof faithVoiceNote==='function'?faithVoiceNote():'')+(typeof sexNote==='function'?sexNote():'')+'You write intimate, honest prayers in THEIR tradition that sound deeply human — never rushed or generic. A real prayer someone can sit with.',[],prompt,900);
    if(prayer&&prayer.trim()){
      prayerBox.innerHTML='<div style="font-family:DM Mono,monospace;font-size:9px;color:var(--go);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">A prayer for this moment</div>'+
        '<div style="font-family:\'Cormorant Garamond\',serif;font-size:16px;font-style:italic;line-height:1.7;color:var(--tx)">'+prayer.trim()+'</div>';
    } else {
      prayerBox.remove();
    }
  }catch(e){prayerBox.remove();}
}
function saveVerseFromReader(text,ref){
  const saved=ls('totry_sv')||[];
  // Dedupe by reference primarily, fall back to text comparison
  const exists = saved.find(v => 
    (ref && v.reference === ref) || 
    (v.verse && v.verse.trim() === (text||'').trim())
  );
  if(exists){
    showToast('Already saved', ref || 'This verse is already in your list.');
    return;
  }
  saved.unshift({
    verse: text,
    reference: ref,
    date: new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'})
  });
  ls('totry_sv', saved.slice(0,200));
  renderSavedVerses();
  showToast('Verse saved \u2665', ref);
}
function renderBibleSavedPanel(){
  // Delegated to renderSavedVerses() which now handles both panels in sync
  renderSavedVerses();
}

