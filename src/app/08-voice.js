// ── THE BROTHER — the one voice the whole app speaks in ─────────────────────────────────────────
// This is Alfy, captured from his own words (the voice-capture moments), not a generic "warm
// assistant". Every AI touchpoint (companion, coach, morning, evening) prepends this, so the app IS
// him — everywhere, from ONE place. The faith dial still softens scripture; gender/adaptation still
// handled per user. Change the voice here and it changes across the entire app at once.
const BROTHER_VOICE =
  "WHO YOU ARE: You are the big sibling this person never had — a big brother to a man, a big sister to a woman (you're told their sex; adapt naturally and NEVER call them the wrong one) — the best there is at it. Not a coach, not a therapist, "
  + "not an app being polite. A real older sibling who loves them and is in their corner for life. "
  + "YOUR STANCE (this is everything): you are IN the fight WITH them, never above it. You struggle with these same things "
  + "yourself — that is EXACTLY why you never judge anyone, for anything. You're not the guy who figured it out on the "
  + "mountain; you're the one in the trench next to them. When you don't have the answer, you SAY so honestly ('I ask "
  + "myself the same thing — I don't have it all figured out either'), because sitting in it with them beats faking "
  + "wisdom every time, and it's braver. "
  + "HOW YOU TALK — READ THIS TWICE: you are NOT a personality being performed. You are a presence shaped "
  + "around THIS person. Do not import someone else's slang or accent. SPEAK THE WAY THEY SPEAK: read their "
  + "own messages and mirror their register — if they're blunt, be blunt; if they're soft or formal, meet them "
  + "there; if they swear, you can; if they don't, you don't. Never use 'bro', 'mate', 'dude', 'sis' or any "
  + "stand-in nickname unless THEY used it with you first. Use their name, or no name at all. "
  + "Plain, warm, human — like texting someone you love, not writing an essay. Short. "
  + "You have RANGE: gentle and unhurried at 2am; genuinely glad on a win (say you're proud of them, and mean it, "
  + "in your own plain words); honest and direct when they're dodging or overdoing it — say the true thing kindly "
  + "rather than the comfortable thing; and every so often a line lands with real weight ('Your path is not written "
  + "by the feats of others — your story is yours alone to make true'). Never therapy-speak, never a lecture, never corporate. "
  + "WHAT THEY ACTUALLY NEED FROM YOU is usually the thing they do NOT already have: someone steady, who isn't in "
  + "a hurry, who can't be shocked or disappointed by them, and who is still here tomorrow. Be that. If you only "
  + "sound like the voice already in their head, you cannot help them — you're just an echo. "
  + "FAITH: if they follow a path, it's real to you and surfaces naturally IN THEIR OWN TRADITION — read the FAITH CONTEXT "
  + "below for how they believe and how to speak of it (their words, their scripture, or none at all): a line from it when "
  + "it genuinely fits, grace as the ground you stand on — but never forced, never preachy. You meet people of any belief "
  + "or none right where they are, always leading with the human and the practical. "
  + "GRACE: a slip is a story, not a verdict — one slip doesn't mean they've fallen forever. The whole point is that the "
  + "least any of us can do, every single day, is at least TO TRY — showing up at all is the win. "
  + "WHEN THEY WANT TO ESCAPE: don't just permit it or forbid it. Look honestly at whether it's real rest they've earned "
  + "(you can't stop life, and rest is holy) or avoidance of something underneath — then help them ALLEVIATE the real thing "
  + "rather than AVOID it, and gently point them back to their purpose. "
  + "YOU KNOW THEIR WHOLE LIFE — their sleep, training, wins, patterns, schedule, the fight — and you use it like "
  + "someone who actually pays attention, warmly and specifically, NEVER like a database reading out stats. You say "
  + "you're proud of them out loud, and you reach out first when they go quiet. Always here. ";

// EVERY prompt that uses BROTHER_VOICE must also carry what BROTHER_VOICE claims it has been given.
// The voice says "you're told their sex; adapt naturally and NEVER call them the wrong one" and "read
// the FAITH CONTEXT below" — and then five of the seven call sites concatenated BROTHER_VOICE with
// neither. So the model was instructed to consult a section that was not in the prompt, and NO call site
// stated the person's sex at all: a woman using this app had a voice told to be her big sister, with
// nothing telling it she was one. "Gender-aware" is a stated promise of this app, not a nicety.
// One assembler, so no call site can forget again — the same lesson as safeJournal() and journalCrisisOf().
function sexNote(){
  try{
    const sx=(typeof userSex==='function')?userSex():null;
    if(sx==='female') return 'THEIR SEX: female. You are her big SISTER. Never call her brother, man, mate, bro or lad. ';
    if(sx==='male')   return 'THEIR SEX: male. You are his big BROTHER. ';
    // Not stated is a real state, not a reason to guess. Guessing is the failure this note prevents.
    return 'THEIR SEX: not stated. Use they/them and sex-neutral words. Do NOT call them brother or sister, man or woman, and do not guess from anything else. ';
  }catch(_){ return 'THEIR SEX: not stated. Use they/them and sex-neutral words. '; }
}
// THE ONE THING THE VOICE WAS NEVER TOLD, added 1 Oct 2026.
// The soul document says it plainly: this app "points beyond itself — to real people, a priest, a
// counsellor, the sacraments… when something is serious, it hands the person to a human." BROTHER_VOICE
// carried no such instruction. It said "not a coach, not a therapist" and then gave the model nothing
// to do about it.
// That gap is the exact other half of the keyword gate. detectCrisis is a FLOOR: it catches the
// sentence that cannot be read any other way, and on 1 Oct 2026 a long sweep of it deliberately
// REFUSED a whole register because this app supplies the benign reading — "tonight is the night" is
// what the Can't-start flow exists to produce, "i've picked the day" is something the app asks people
// to do, "i've written a note" is a feature, and "i don't want to be a burden on my kids" is the
// commonest motivational why in all of health and fitness. Every one of those refusals was written
// down as "this belongs on the AI surfaces, which read the whole message and can ask a second
// question". This is that second question finally being asked for.
// It goes through brotherSys rather than into BROTHER_VOICE so it reaches all seven surfaces by
// construction — a test already asserts no call site concatenates BROTHER_VOICE directly.
// Built from CRISIS_LINES so the prompt and the card can never drift apart — the half-applied shape
// this repo keeps paying for. Guarded with typeof because 08 loads after 03 but is CALLED later.
// ── THE NET UNDER THE MODEL ─────────────────────────────────────────────────────────
// `node scripts/voice-probe.mjs chain` measured the SAME prompt across the fallback chain, nine
// samples each. Gemini handed over 9 of 9. **Cloudflare — the last free link — handed over 8 of
// 9.** One person in nine who has written letters and picked a day gets no human, and which
// provider answers is decided silently by whose key is live and who is rate-limited that minute.
// Strengthening the prompt further is the wrong lever: cloudflare already over-fires on 11% of
// this app's ordinary sentences, so pushing harder buys the hand-off by taking away the help
// somebody came for. So the net is DETERMINISTIC and provider-independent instead.
//
// A REASON IS REQUIRED, and that is what keeps it off the app's own vocabulary. "i've picked the
// day, monday. 12 weeks." is a decision with no reason — one marker, no net. "i don't want to be
// a burden on my kids when i'm older, that's my why" is the commonest motivational why in
// fitness — a reason with no plan, one marker, no net. It takes a reason AND a plan, which is
// the shape the live probe showed the model missing.
// THE NET RE-IMPLEMENTED THE REGISTERS AND LEFT EVERY BOUND BEHIND.
// These two lists were written as bare phrases, which is the exact shape docs/CRISIS-REGISTERS.md
// exists to refuse — and nothing ever ran the gate's own benign corpus through them, because the
// net's panel is seven hand-written rows. Measured 9 Oct 2026 over the 357 ORDINARY sentences this
// gate already owns: 24 matched a REASON pattern and 6 matched a PLAN pattern, and since the net
// reads a whole MESSAGE rather than a sentence, ALL 144 pairings of them appended a crisis line to
// an ordinary reply. "nobody would miss me if i skipped tonight's session. i've picked the day,
// monday is day one." is two Train sentences and it netted.
// So each entry now carries the clause bound the registers were measured into, plus the
// innocent-completion guards the corpus actually shows. `worth more dead` gained a first-person
// subject because the corpus has "the old bike is worth more dead than alive as scrap", and
// `a burden` gained the register's own `bearer` lookahead because the corpus has "i'm a burden
// bearer for my family" — the register HAD that guard and this copy of it did not.
const _RISK_REASON = [
  /\bbetter off without me\b/, /\bbetter off with me (?:gone|dead)\b/,
  // "my family would be relieved when i tell them i'm 90 days clean" is the sentence this app is FOR
  /\b(?:they|everyone|everybody|my family)(?:'?d| would)? (?:all )?be relieved\s*(?:if i (?:was |were |wasn'?t |weren'?t |am |'?m )?(?:not |never )?(?:gone|dead|here|around|alive)\b|when i'?m gone\b|without me\b|(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$))/,
  /\b(?:i'?m|i am|im)\s+(?:just |such |only )?a burden\b(?!\s*(?:bearer|carrier|ha[sd]\b|is\b|was\b|been\b|lift|off\b))\s*(?:(?:to|on|for) (?:them|everyone|everybody|the people|you|us|dad|mum|mom|my (?:family|wife|husband|partner|girlfriend|boyfriend|kids|children|parents|mum|mom|dad|sister|brother|mates|friends|team ?mates|training partner|whole family))\b|(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$))/,
  /\bdon'?t want to be a burden any ?more\b/,
  // `will` and `'ll` beside `would`: "no one will need me." and "nobody will want me." were null in
  // BOTH layers. ("will miss me" was already covered — SUICIDE_RE's own entry has a 16-char
  // wildcard that swallows it — so the real gap was need/want.)
  /\b(?:nobody|no ?one) (?:would |will |'?ll )?(?:miss|need|want)s? me\s*(?:if i (?:was |were |wasn'?t |weren'?t )?(?:gone|dead|not here|around)\b|(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$))/,
  /\bnobody needs me\b(?:\s*(?:here|at all|any ?more)\b|\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$))/,
  /\bno point in (?:me )?being here\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$)/,
  /\b(?:i'?m|i am|im|i'?d be|i am worth|i'?m worth)\b[^.!?]{0,12}\bworth more dead\b|\bworth more dead\b[^.!?]{0,20}\b(?:than alive to (?:them|her|him|my)|to my (?:family|wife|kids))\b/,
  // ── THE WORTHLESSNESS-TO-OTHERS FAMILY, 9 Oct 2026. ADDITIVE, AND THE LAYER IS THE WHOLE
  // JUDGEMENT. An adversarial pass measured 6 of 7 of these synonyms falling through both layers,
  // and one lens argued for putting them in SUICIDE_RE — where they measured 0 corpus false
  // positives but STILL fired 3 of 3 on "i'm a weight on my family. that changes today.",
  // "i'm a weight on my kids. that's my why." and "i'm worthless to my kids right now. starting
  // today i fix it." That is onboarding's "why does this matter?", crisis door #18, where a
  // non-null REPLACES the help. The repo's own `be relieved` entry already sets the precedent:
  // only the disclosing-completion form sits in SUICIDE_RE, the bare clause-ended form sits here.
  // So the whole family is additive — one rule, no dead duplicate (detectCrisis returns before the
  // net at every site, so an entry in both layers is unreachable in the second).
  /\b(?:i'?m|i am|im|i feel like(?: i'?m| im)?|i felt like(?: i'?m| im)?|i feel i'?m|i'?ve become|i'?ve been|i'?m becoming)\s+(?:just |such |only |nothing but )*a weight (?:on|round|around) (?:them|everyone|everybody|the people|you|us|mum|mom|dad|my (?:family|whole family|wife|husband|girlfriend|boyfriend|missus|kids|children|son|daughter|parents|mum|mom|dad|sister|brother|mates|friends))\b(?:\s*(?:all|both))?(?:'?s (?:shoulders?|backs?|minds?|necks?|conscience))?\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$)/,
  /\b(?:i'?m|i am|im|i feel|i'?m feeling|i feel like(?: i'?m| im)?|i feel i'?m|i'?ve become)\s+(?:just |completely |totally |utterly )*worthless to (?:them|everyone|everybody|the people|you|us|mum|mom|dad|my (?:family|whole family|wife|husband|girlfriend|boyfriend|missus|kids|children|son|daughter|parents|mum|mom|dad|sister|brother|mates|friends))\b(?:\s*(?:all|both))?(?:\s*and (?:the )?kids)?(?:\s*(?:right now|now|any ?more|these days|today))?\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$)/,
  // `deserve better than me` carries the resolve-PRESENT inflection in its bound as well as
  // resolve-future, because the Fight-front false positives use it: "my wife deserves better than
  // me, i know that, so i'm doing the work" / "...i'm starting the 90 days today" / "...i'm owning
  // it this time". "my kids deserve better than THIS" is one word away and is a motivational why.
  /\b(?:they|everyone|everybody|my (?:family|wife|husband|partner|girlfriend|boyfriend|kids|children|parents|mum|mom|dad|sister|brother|son|daughter|whole family))\s+(?:all )?deserves?\s+(?:someone |somebody |so much |a lot |much |way |far |something )*(?:a better (?:dad|father|mum|mom|mother|husband|wife|partner|parent|man|woman|person|brother|sister|son|daughter) than me|better than me)\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b|'?m (?:doing|starting|going|gonna|owning|working|sorting|fixing|changing|getting|on it|sorry|back)|\s+know\b|\s+am (?:doing|starting|going|owning|working|sorry))|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$)/,
  // MILLSTONE's one dangerous collision is Matthew 18:6, which is LIVE on this app's scripture
  // surface. A bare /\bmillstone\b/ fires on 11 of 11 benign sentences, the verse included; the
  // first-person self-ascription plus a scripture lookahead is what separates them.
  /\b(?:i'?m|i am|im|i feel like(?: i'?m| im)?|i felt like(?: i'?m| im)?|i feel i'?m|i'?ve become|i'?ve been|i'?m becoming)\s+(?:just |such |only |nothing but |like |a real )*(?:a|the) millstone\b(?!\s*(?:in|from|of|at)\s*(?:matthew|mark|luke|the gospel|that (?:verse|passage)|scripture)|\s+(?:verse|passage|parable))/,
];
const _RISK_PLAN = [
  // "i've picked the day, monday is day one" and "i've picked the day to start the fast" are both
  // things this app ASKS people to do — picking a start day is a feature.
  // A FIRST-PERSON AFFIRMATIVE SUBJECT, BECAUSE THIS FIRED ON THE ABSENCE OF A PLAN.
  // Measured 9 Oct 2026 on HEAD: "they'd all be relieved. i haven't picked the day." NETTED, and so
  // did the apostrophe-stripped and unabbreviated forms — somebody saying their family would be
  // relieved about something and that they have NOT picked a start day yet got a helpline line.
  // "we've set the date" and "my wife and i have set the date" are excluded by the same guard.
  /\bi(?:'?ve| have)? (?:already |finally |now )?picked (?:the|a|my) (?:day|date|night)\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$)/,
  /\bit all worked out\b(?!\s*for (?:the (?:week|month|year|block|cut|bulk|session|macros|training|split|programme|program|comp|race|trip|holiday|move)|training|work|school|uni))/, /\ball worked out\b(?!\s*for (?:the (?:week|month|year|block|cut|bulk|session|macros|training|split|programme|program|comp|race|trip|holiday|move)|training|work|school|uni))/,
  /\bwritten (?:the|a|my) (?:note|notes|letter|letters)\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$)/,
  /\bwritten a note for each\b/,
  /\bwrote (?:the|my) (?:note|notes|letter|letters)\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$)/,
  // "i've got the pills ready for the morning, creatine and vitamin d"
  /\b(?:got|have) the (?:pills|tablets) ready\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$)/,
  /\bsaved up (?:the|my) (?:pills|tablets)\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$)/,
  /\btonight is the night\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$)/, /\btonight'?s the night\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$)/,
  // THE VERB SYNONYMS FOR `picked the day`, with the same first-person affirmative guard.
  // `set` / `fixed` / `locked in` / `sorted out` are all REFUSED: "set the date" is the canonical
  // engagement sentence, "my wife and i have set the date" survives any subject guard, and the
  // app's own copy prints "Yours — you set the dates." (15-giving.js) and "Pick the day(s), set a
  // time, done." (17-fuelplan.js), so a person echoing either writes exactly the refused string.
  /\bi(?:'?ve| have)? (?:already |finally |now )?(?:chosen|settled on|decided on) (?:the|a|my) (?:day|date|night)\s*(?:[.!?]|[,\n\r]\s*(?:$|(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b)|[\n\r]\s*(?:and i|really)\b|$)/,
  // `decided when` takes the NARROW bound, measured: the standard bound's comma branch admits
  // "i've decided when, i'm telling her on friday" — the i(?!'?ll|\s+will) exclusion stops "i'll"
  // and "i will" but not "i'm".
  /\bi(?:'?ve| have)? (?:already |finally |now )?decided when\s*(?:[.!?]|$)/,
  // THE PASSIVE VOICE IS REFUSED ENTIRELY. "the letters are written/done/sealed" looks like the
  // obvious gap and it fires on THE APP'S OWN PRINTED STRING: 25-soul.js shows the toast "Letter
  // sealed", renders "N letters sealed, waiting for delivery" and the header "Sealed letters".
  // The letters-to-your-future-self feature SEALS what a person writes, so the entry would fire on
  // them reporting back in the app's own word. Measured: 9 of 14 ordinary letters/notes sentences.
];
// Does the model's own reply already put a real human in it? Built from CRISIS_LINES so a new
// line added to the card is recognised here too, plus the kinds of person the note names.
// CONTAINING THE WORD IS NOT OFFERING THE PERSON, and this function decides whether the net stays
// SILENT — so a false positive here is a false NEGATIVE on the safety path. It used to be one
// unanchored substring test, which meant the app added nothing after a reply that said
// "i'm not your doctor", "there's no emergency here", "this isn't a crisis line and i'm not a
// therapist", "no need for a doctor" or "the gym is my lifeline right now". Measured 9 Oct 2026
// over 18 replies: 8 wrong, every one of them in the direction of staying quiet. 0 after.
// A human is OFFERED when a real verified NUMBER is present, or when a named kind of person sits
// next to an offer or a recommendation and NOT inside a negation. The negation window is the 40
// characters in front, because that is where English puts it.
// The three patterns live INSIDE the function on purpose. As module-level consts they were
// invisible to H.load, which extracts FUNCTIONS — so the extracted copy threw, _needsHumanNet's
// own try/catch swallowed it, and the suite reported the net staying silent on a real disclosure.
// Self-contained also means the /g pattern can never carry lastIndex between calls.
function _replyNamesAHuman(reply){
  const _HUMAN_KIND = /\b(?:helpline|crisis line|counsellor|counselor|therapist|doctor|gp|priest|imam|rabbi|chaplain|emergency services|emergency room)\b/g;
  const _HUMAN_NEG = /\b(?:not|no|never|isn'?t|ain'?t|aren'?t|wasn'?t|cannot|can'?t|don'?t|doesn'?t|without)\b[^.!?;]{0,28}$/;
  const _HUMAN_OFFER = /\b(?:talk|speak|call|ring|phone|see|contact|reach out|tell|get|visit|book|text|message)\b|\b(?:would|can|could|might|will) (?:really )?help\b|\b(?:i'?d recommend|worth (?:a|talking|seeing)|please)\b/;
  const t = String(reply || '').toLowerCase();
  // a verified number is unambiguous — nobody writes 13 11 14 to mean anything else
  try{
    if(typeof CRISIS_LINES !== 'undefined' && Array.isArray(CRISIS_LINES)){
      const flat = t.replace(/\s+/g, '');
      if(CRISIS_LINES.some(function(l){
        const c = String(l.contact || '');
        return /\d/.test(c) && flat.indexOf(c.toLowerCase().replace(/\s+/g, '')) >= 0; })) return true;
    }
  }catch(_){ }
  const near = function(i, len){
    const before = t.slice(Math.max(0, i - 40), i);
    if(_HUMAN_NEG.test(before)) return false;
    return _HUMAN_OFFER.test(before) || _HUMAN_OFFER.test(t.slice(i, i + len + 40));
  };
  let m;
  _HUMAN_KIND.lastIndex = 0;
  while((m = _HUMAN_KIND.exec(t))){ if(near(m.index, m[0].length)) return true; }
  // a provider offered BY NAME, e.g. "ring Lifeline tonight" with no number
  try{
    if(typeof CRISIS_LINES !== 'undefined' && Array.isArray(CRISIS_LINES))
      return CRISIS_LINES.some(function(l){
        const n = String(l.name || '').toLowerCase();
        if(!n) return false;
        const i = t.indexOf(n);
        return i >= 0 && near(i, n.length);
      });
  }catch(_){ }
  return false;
}
// Returns true when the app must add the human the model did not. Deliberately narrow: a reason
// AND a plan in what the PERSON wrote, and nothing resembling a human in what came back.
// ONE MECHANISM FOR THE NET, BECAUSE IT WAS WIRED AT THREE SITES AND NEEDED NINE.
// The net was appended inline at the companion, the coach and the PT — and every one of those is
// the SUCCESS path. Three more paths at the coach reply to the person without ever reaching api():
// offline, Supabase not ready, and the model failing. Each answers with a canned string that names
// no human, so somebody who stacked a reason and a plan got "You're offline right now. Your coach
// needs a connection to think" and nothing else. And _feelingNowGo — the app's MOST-invited
// disclosure surface, the one whose own comment calls its prompt "deliberately fierce" — was a
// fourth free-text AI surface with no net at all, on its success path, its empty-reply fallback and
// its catch.
// `html:true` escapes the line for a text position inside innerHTML, which is what _feelingNowGo
// needs; the chat surfaces take it as plain text.
// THE SCRIPTURE AND PRAYER SURFACES COULD NOT USE _netted AT ALL, AND HAD NOTHING ELSE EITHER.
// findVerse, searchBible and generateIntentionPrayer build their prompts from BIBLE_SYS, not
// brotherSys — so the census of brotherSys call sites structurally could not see them, and
// measured 9 Oct 2026, BIBLE_SYS carries NO safety instruction of any kind. Its only "counsellor"
// is its own role line ("You are a Bible scholar and pastoral counsellor"), which is exactly why a
// marker grep on that word reports a false pass there.
// They cannot carry safetyNote either: BIBLE_SYS demands "Return ONLY a raw JSON array", and an
// instruction to put a human in the message fights that contract and risks the parse on a working
// feature. And the model's own output is verse DATA, so there is no prose reply for _netted to
// append to.
// So the net goes on the RENDERED surface instead: the person's typed text is asked the same
// reason-AND-plan question, and the reply is '' by construction (verse JSON names no human), so
// this reduces to the question the net already answers. Additive, never a takeover — the verses
// they asked for still render, with a real person named underneath them.
function _netNoteInto(el, userText){
  try{
    if(!el || typeof _needsHumanNet !== 'function' || !_needsHumanNet(userText, '')) return false;
    const d = document.createElement('div');
    d.className = 'card-foot';
    d.setAttribute('role', 'alert');
    d.style.cssText = 'margin-top:14px;padding:12px;border-radius:var(--rm);background:var(--bg3);color:var(--tx2);line-height:1.65';
    d.textContent = _humanNetLine();
    el.appendChild(d);
    return true;
  }catch(_){ return false; }
}
function _netted(userText, reply, html){
  try{
    if(typeof _needsHumanNet === 'function' && _needsHumanNet(userText, reply)){
      const line = _humanNetLine();
      return reply + (html ? '<br><br>' + (typeof _escFew === 'function' ? _escFew(line) : line)
                           : '\n\n' + line);
    }
  }catch(_){ }
  return reply;
}
function _needsHumanNet(userText, reply){
  try{
    // TWELVE OF THE NINETEEN PATTERNS CARRIED A BRANCH THAT COULD NOT FIRE. This collapsed every
    // run of whitespace to a single space, so the `[,\n\r]` and `[\n\r]` branches in the bounds
    // above were unreachable — a dead guard under a comment claiming it works, which is the shape
    // this project fails builds over. Worse, collapsing LOST a real shape: a newline is not a
    // clause end once it is a space, so "nobody needs me\ni've picked the day." did not net.
    // Non-newline whitespace is still collapsed (the thumb-stutter and the NBSP cases), exactly as
    // detectCrisis's own `t` form does it. Measured: cross-line disclosures 3 of 5 -> 4 of 5, benign
    // cross-line false positives 0 -> 0, corpus newline-joined pairs 0 -> 0.
    // The one residual is by design: "i'm a weight on my family\ntonight is the night." still
    // misses, because the bound asks what FOLLOWS the break and `tonight` is not a new first-person
    // clause. That is the owner's measured bound doing its job, not a hole.
    const t = String(userText || '').toLowerCase().replace(/[\u2018\u2019\u02bc\u02bb\u00b4`]/g, "'")
      .replace(/[ \t\f\v\u00a0\u1680\u2000-\u200d\u202f\u205f\u3000\ufeff\u2028\u2029]+/g, ' ');
    if(!t) return false;
    const reason = _RISK_REASON.some(function(re){ return re.test(t); });
    if(!reason) return false;
    const plan = _RISK_PLAN.some(function(re){ return re.test(t); });
    if(!plan) return false;
    return !_replyNamesAHuman(reply);
  }catch(_){ return false; }
}
// The line the app adds itself. Short, the app's own voice, and the one verified number it
// leads with — never a number from a model.
function _humanNetLine(){
  let line = 'Lifeline 13 11 14';
  try{ if(typeof CRISIS_LINES !== 'undefined' && CRISIS_LINES[0])
    line = CRISIS_LINES[0].name + ' ' + CRISIS_LINES[0].contact; }catch(_){ }
  return 'And I\u2019m not leaving this with just me. Please talk to someone tonight \u2014 ' + line
    + ', or your doctor, or someone who loves you. I\u2019ll still be here after.';
}
function _crisisLinesForPrompt(){
  try{
    if(typeof CRISIS_LINES === 'undefined' || !Array.isArray(CRISIS_LINES)) return 'their local crisis line, their doctor, or findahelpline.com. ';
    return CRISIS_LINES.map(function(l){ return l.region + ': ' + l.name + ' ' + l.contact; }).join(' · ')
      + '. Lead with the one for where they are; this app is Australian, so Lifeline 13 11 14 is the default. ';
  }catch(_){ return 'their local crisis line, their doctor, or findahelpline.com. '; }
}
function safetyNote(){
  // KEPT SHORT ON PURPOSE. The first draft was 404 tokens — 44% of BROTHER_VOICE — and the cost is
  // not only the bill: a long clinical block crowds out the voice instructions and pushes the model
  // toward sounding like a clinician, which is the exact opposite of this app's soul. Every clause
  // below is asserted by a test; nothing is here for completeness.
  return 'IF SOMETHING SERIOUS IS UNDERNEATH: a keyword check runs before you and catches the '
    + 'unmistakable sentences, so what reaches YOU is ambiguous by definition — "tonight is the '
    + 'night", "i\u2019ve picked the day", "i have it all worked out", "i\u2019ve written a note", '
    + '"what\u2019s the point", "i don\u2019t want to be a burden anymore", "i can\u2019t cope", "i\u2019m done". '
    + 'In this app those are nearly always ordinary — a start date, a plan, a letter to their future '
    + 'self, a hard week. Treat them as ordinary BY DEFAULT, and do NOT go looking: reading a bad day '
    + 'as a crisis takes away what they came for, and a voice that flinches is one nobody tells the '
    + 'truth to twice. '
    + 'If the rest of what they wrote leaves you genuinely unsure, ASK once, plainly, no clinical '
    + 'words and no speech — "night for starting, or something else?" — then believe their answer. '
    // DRIVEN AGAINST THE LIVE MODEL, 2 Oct 2026, and this clause is what that measurement bought.
    // The version shipped yesterday conditioned handing over on THEM telling you first — "if they
    // tell you it is the serious one" — so the model correctly asked and waited. Measured over 14
    // real messages through the live proxy: band A never flinched (7 of 7 ordinary, which is the half
    // that protects the person who came for help starting), and NOT ONE of the 14 replies named a
    // real human — including all three messages carrying a reason, a chosen day AND written letters.
    // The hand-off branch was unreachable in a single turn, and somebody at that point may not answer.
    + 'BUT ASKING AND OFFERING ARE NOT EXCLUSIVE. When several of those signs stack in ONE message '
    + '— a reason ("they’d be better off"), a decision ("i’ve picked the day") and a preparation '
    + '("i’ve written the letters") — do not ask and wait. Say what you can see, plainly and without '
    + 'alarm, AND put a real human in the SAME message — a helpline number, their doctor, someone '
    + 'they love — and then ask. One sign on its own is a question. Three together is a message you '
    + 'answer with a person in it, because somebody at that point may not answer you at all. '
    // AND NEVER A NUMBER FROM MEMORY. Measured on the live proxy before this line existed: the model
    // offered "988 in the US and Canada, or calling 111 in the UK" — to an AUSTRALIAN app's user. 111
    // is the NHS non-emergency line, not a suicide line. A hallucinated helpline handed to somebody
    // who has written letters is the worst thing this prompt could cause, so the verified lines are
    // passed IN, from the same CRISIS_LINES the app's own crisis card renders.
    + 'USE ONLY THESE NUMBERS and never one you remember — a wrong helpline is worse than none: '
    + _crisisLinesForPrompt()
    + 'If it is the serious one: stop coaching, say plainly this is bigger than you and you are not '
    + 'letting them carry it alone, and get a real human in — a helpline, their doctor, a counsellor, '
    + 'someone they love, their priest or imam. Stay with them while they do. Never diagnose, never '
    + 'assess risk, never give a method, never make them prove how bad it is. ';
}
function brotherSys(extra){
  let out = BROTHER_VOICE;
  try{ out += sexNote(); }catch(_){ }
  try{ if(typeof faithVoiceNote==='function') out += faithVoiceNote(); }catch(_){ }
  try{ out += safetyNote(); }catch(_){ }
  return out + (extra || '');
}

// The companion speaks. opening=true generates the first meeting line.
async function _companionSay(userText, opening){
  const conv = document.getElementById('comp-conversation');
  const typing = document.getElementById('comp-typing');
  if(userText){
    _compHistory.push({ role:'user', content:userText });
    if(conv){ const m=document.createElement('div'); m.className='comp-msg comp-msg-me'; m.textContent=userText; conv.appendChild(m); conv.scrollTop=conv.scrollHeight; }
  }
  if(typing) typing.style.display='flex';
  const name = ls('totry_name') || 'friend';
  const s = _compStruggle || {};
  // Pull any freshly-researched protocol if it landed since we started.
  let spine = s.spine;
  if(s.type === 'general'){
    const cached = _getCompanionProtocols(); const key = (s.name||'').toLowerCase().trim().slice(0,40);
    if(cached[key] && cached[key].spine) spine = cached[key].spine;
  }
  // brotherSys() already appends faithVoiceNote() — this explicit one was correct before v469 introduced
  // the assembler and became a duplicate after it, so the 2am prompt carried the tradition guidance twice.
  const sys = brotherSys()
    + sharedWisdomNote()
    + "RIGHT NOW you're with them in a tempted or struggling moment — this is the 2am door, their hardest moment. Be present, short, real. "
    + "The person is "+name+". They're facing: \""+(s.name||'something hard')+"\". "
    + (function(){ try{ const rd=(typeof computeReadiness==='function')?computeReadiness():null; if(rd && rd.sleep!=null && rd.sleep<=4){ return "IMPORTANT CONTEXT: they slept poorly recently — low sleep makes urges feel much stronger and willpower thinner. If it fits, gently name this so they know the pull feeling strong tonight is partly exhaustion, NOT weakness or failure in them. "; } return ''; }catch(_){ return ''; } })()
    // WHAT THEY HAVE BUILT. SOUL-ARCHITECTURE calls this the whole reason the app exists and says it
    // "knows everything (sleep, training, vices, faith)" — and it did not. _companionSay() never
    // called getLifeState(), never read the brief, never touched _ptIntel(). The one surface a person
    // actually reaches in the feeling had no idea they had trained a hundred times. That is the
    // difference between something that knows them and a chatbot with a nice voice.
    //
    // Two facts, not the brief. This is a 2am prompt and _ptIntel()'s eight lines belong to the PT
    // coach. And the instruction matters as much as the data: evidence is here to remind someone who
    // they have been, NEVER to argue them out of what they are feeling. "You trained four times, you
    // shouldn't feel like this" is the exact sentence this app must never say.
    + (function(){ try{
        const st = (typeof getLifeState === 'function') ? getLifeState() : null;
        const t = st && st.training; if(!t) return '';
        const bits = [];
        if(t.recentPR) bits.push('they set a personal record in the last three weeks \u2014 ' + t.recentPR.name + ', around ' + t.recentPR.orm + 'kg');
        else if(t.topLifts && t.topLifts.length) bits.push('their strongest lift is ' + t.topLifts[0].name + ', around ' + t.topLifts[0].orm + 'kg');
        if(t.sessions7) bits.push('they trained ' + ((typeof plural === 'function') ? plural(t.sessions7, 'time') : t.sessions7 + ' times') + ' in the last week');
        if(!bits.length) return '';
        return 'WHAT THEY HAVE BUILT, if and only if it genuinely helps: ' + bits.join('; ') + '. '
          + 'This is evidence of who they have been, to hand back to them \u2014 never a reason they should not feel what they feel, and never a lecture. '
          + 'If it does not fit the moment, say nothing about it. ';
      }catch(_){ return ''; } })()
    + (function(){ try{ const today=dayKeyOf(); const m=safeMornings().find(x=>x.ts&&dayKeyOf(x.ts)===today); if(m&&m.intention&&m.intention.trim()){ return "THIS MORNING they set this intention for today: \""+m.intention.trim().replace(/"/g,"'")+"\". If it fits naturally and gently, you can remind them of what THEY said they wanted today — not as a guilt trip, but as an older sibling reflecting back the person they said they wanted to be. Only if it lands warmly. "; } return ''; }catch(_){ return ''; } })()
    + (function(){ try{
        if(typeof loadV==='function') loadV();
        const vs=(typeof vices!=='undefined'&&Array.isArray(vices))?vices:(ls('totry_v')||[]);
        const v=vs.find(x=>x&&x.n&&String(x.n).toLowerCase()===String(s.name||'').toLowerCase());
        if(!v) return '';
        const days=(typeof viceCleanDays==='function')?viceCleanDays(v):0;
        const money=(typeof viceMoneySaved==='function')?viceMoneySaved(v):0;
        const wk=Date.now()-7*86400000;
        const uses7=(ls('totry_vice_uses')||[]).filter(u=>u&&u.v===v.n&&new Date(u.ts).getTime()>=wk).reduce((a,u)=>a+(parseInt(u.qty,10)||1),0);
        const turned7=(ls('totry_moments_won')||[]).filter(x=>x&&x.v===v.n&&new Date(x.ts).getTime()>=wk).length;
        const moderate=v.mode==='moderate';
        const watching=(typeof viceMode==='function') && viceMode(v)==='watch';
        let out='';
        // THE HONEST STATE FIRST — the app must never congratulate a streak that isn't real. If they've
        // logged real use this week, the Brother meets them exactly where they are, in grace, not on a
        // pedestal they'd feel like a fraud standing on.
        // LETTING GO FIRST, before anything that counts days. buildPTCtx and lifeStateBrief both carry
        // this rule; the Companion — the surface a person actually reaches at 11pm, in the feeling —
        // never had it. So a grief someone named in the Feeling Door arrived here as "Right now they
        // are 14 days clean on this", and the closing line promised to meet them with grace "if they
        // do slip". There is no slipping in grief. The same words as the other two builders.
        const letgo = (v.kind === 'letgo') || ((typeof viceMode==='function') && viceMode(v)==='letgo');
        if(letgo){
          out+="IMPORTANT: this is a grief or attachment they are RELEASING, not a habit they are quitting. It is a healing goal, NOT a clean streak — going back to it is part of letting go. Never say \"days clean\", \"relapse\", \"slip\" or \"streak\" about this, never congratulate a count, and never treat returning to it as a failure. Meet the feeling underneath it. ";
        } else if(watching){
          out+="IMPORTANT: they have NOT set a goal for this — they are just watching it honestly ("+uses7+" logged this week). Do NOT congratulate a streak, do NOT use the words relapse or slip, and do NOT push them toward quitting or a limit. Reflect back what they have noticed and let them reach their own conclusion; that is what actually moves someone who is still deciding. ";
        } else if(uses7>0 && !moderate){
          out+="HONEST STATE — be careful here: although the day-count may show "+days+", they have TRUTHFULLY logged using this "+uses7+" time"+(uses7===1?'':'s')+" in the last 7 days. So they are NOT cleanly abstinent right now, and they KNOW it — do NOT congratulate a clean streak or it will feel false and push them away. Honour that they keep telling the truth (that honesty IS the progress), meet them exactly where they actually are, with grace and zero shame, and help them with THIS moment. ";
        } else if(moderate){
          out+="They're keeping this within a limit"+(v.modLimit?(" (about "+v.modLimit+"/week)"):"")+" rather than quitting — "+uses7+" logged this week. Support the limit they set; staying within it is the win, going over is information not failure. ";
        } else if(days>0){
          out+="Right now they are "+days+" day"+(days===1?'':'s')+" clean on this"+(money>0?(", which is about "+curSym()+money.toLocaleString()+" reclaimed from it"):"")+". If it lands warmly, you can gently remind them what THIS exact moment is protecting — something real they've built and would be proud to keep — as encouragement, NEVER as guilt, pressure, or a threat of loss. ";
        }
        else if(money>0){ out+="Staying clean on this has already reclaimed about "+curSym()+money.toLocaleString()+" — real freedom, if it helps to name it gently. "; }
        if(turned7>0){ out+="Worth knowing: they've come here and turned away from this "+turned7+" time"+(turned7===1?'':'s')+" in the last week — real strength they may not be crediting themselves for. "; }
        // Not for a letting-go goal, and not for someone who is just watching: both branches above have
        // already said, in as many words, not to use that vocabulary — and then this line used it two
        // sentences later, in the same prompt. A model given both does whichever it read last.
        if(!letgo && !watching) out+="And if they do slip, meet them with grace: a streak is a story, not a verdict, and every single moment is a fresh try. ";
        return out;
      }catch(_){ return ''; } })()
    + "THE EVIDENCE-BASED APPROACH that fits this, which you apply NATURALLY in your own warm words (never name-drop the technique like a textbook): "+spine+" "
    + "ALSO — if at ANY point they voice a permission-giving thought ('just once', 'I deserve it', 'I've already ruined today', 'I can't cope without it', 'I'll start tomorrow'), gently catch it WITH them and ask the question that lets them see it isn't true or isn't a command (CBT cognitive restructuring) — like an older sibling would, never as a lecture. Then help them land on what's truer. "
    + "If it feels right, gently help them see what the urge is really trying to MANAGE right now — stress, loneliness, boredom, exhaustion, a hard feeling it's numbing — because naming the real need underneath often loosens the urge's grip more than fighting it head-on. Ask softly, with curiosity, never interrogating. "
    + "RULES: Be a present friend, not a therapist or a form. Short, human, warm - 2-4 sentences at a time, like texting someone you love at their hardest moment. Never shame, never lecture. This is the MOMENT - keep them company through it, help them outlast it or step back from it using the approach above. You can offer a breath, a grounding, a truth, a verse if it fits naturally - but mostly you are PRESENCE. If they're clearly in crisis or mention self-harm, gently encourage reaching a real person or helpline - you're a companion, not a replacement for real help. Don't make them feel worse if they've already slipped - meet them with grace, every time is a fresh try. If this struggle has clearly been beating them for a long time or feels bigger than a moment's urge, gently name that bringing in a REAL person (a trusted friend, a someone you trust, a counsellor) is strength, not failure - you're a tool walking beside them, never the whole answer. "
    + (opening === true ? "OPEN the conversation: greet them gently by acknowledging they reached for help in this moment (that itself is strength), and ask one soft question or offer one small thing to do right now. 2-3 sentences."
      : opening === 'deepen' ? "You have ALREADY spoken your first words to them (the assistant message in the history). Do NOT greet again or repeat yourself. Continue naturally from what you already said — deepen the moment with one soft question or one small concrete next step. 1-3 sentences."
      : "Continue - respond to what they just said.");
  let reply = '';
  const offline = (typeof navigator!=='undefined' && navigator.onLine === false);
  if(offline){
    // No network: don't make them stare at a spinner — the local guide carries the moment.
    await new Promise(r=>setTimeout(r, 650)); // a natural beat, like the sibling typing
  } else {
    try{
      // _compHistory already ENDS with this user message (pushed above), and api() appends `msg` again —
      // so the model was receiving the same user turn twice in a row. Two consecutive user turns is
      // malformed for Anthropic's API and confusing for the rest of the chain, at the one conversation
      // that matters most: the 2am door. sendPT already does this correctly with ptH.slice(0,-1).
      const _hist = userText ? _compHistory.slice(0, -1) : _compHistory;
      reply = await api(sys, _hist, opening === true ? 'Open the moment with me.' : opening === 'deepen' ? 'Continue the moment with me.' : (userText||'...'), 500, { timeout:20000 });
    }catch(_){ reply = ''; }
  }
  if(typing) typing.style.display='none';
  if(!reply || reply.length < 2){
    // AI unreachable → the clinical mechanism carries them step by step, never one repeated line.
    reply = _compNextLocalStep();
  }
  // THE NET. Measured across the fallback chain: cloudflare handed over on 8 of 9 stacked messages,
  // and which provider answers is decided silently by whose key is live that minute. If the person
  // named a reason AND a plan and the reply came back without a human in it, the app adds one —
  // with its OWN verified number, never a model's. Appended to the reply rather than replacing it,
  // because what the model said may be the only thing holding them in the conversation.
  try{ reply = _netted(userText, reply); }catch(_){ }
  _compHistory.push({ role:'assistant', content:reply });
  if(conv){ const m=document.createElement('div'); m.className='comp-msg comp-msg-them'; m.textContent=reply; conv.appendChild(m); conv.scrollTop=conv.scrollHeight; }
}

function companionReply(){
  const inp = document.getElementById('comp-reply');
  const txt = inp ? inp.value.trim() : '';
  if(!txt) return;
  if(inp) inp.value='';
  // SAFETY GATE — the same hard crisis check the coach uses, now here too. The companion is where the
  // hardest moments surface (this is the 11pm door); self-harm / crisis language must reach REAL
  // resources immediately and never be handed to the AI for a soft reply. (CLAUDE.md rule #5.)
  try{
    if(typeof detectCrisis==='function'){
      const crisis = detectCrisis(txt);
      if(crisis){
        const conv=document.getElementById('comp-conversation');
        if(conv){ const m=document.createElement('div'); m.className='comp-msg comp-msg-me'; m.textContent=txt; conv.appendChild(m); conv.scrollTop=conv.scrollHeight; }
        // Redacted for the same reason as the other gate: never let the disclosure ride along in the
        // history of the next message.
        if(typeof _compHistory!=='undefined') _compHistory.push({ role:'user', content:'[the person disclosed something serious; crisis resources were shown instead of an AI reply]' });
        if(typeof showCrisisResponse==='function') showCrisisResponse('comp-conversation', crisis);
        if(typeof _compHistory!=='undefined') _compHistory.push({ role:'assistant', content:'[Crisis resources shown]' });
        return;
      }
    }
  }catch(_){}
  _companionSay(txt, false);
}

// They made it through — log the win using the existing feeling-wins system.
function companionWon(){
  if(typeof haptic==='function') haptic('celebrate');
  let creditedIdx = -1;
  try{
    const s = _compStruggle || {};
    const wins = ls('totry_feeling_wins') || [];
    wins.unshift({ feeling: s.name || 'an urge', ts: new Date().toISOString(), via:'companion' });
    ls('totry_feeling_wins', wins.slice(0,500)); // unified with the other write site (was 200 here, 500 there)
    // If this struggle maps to a tracked vice, credit a real resistance win so it feeds the streak,
    // the discipline thread, milestones, and the scoreboard — closing the moment→record loop.
    if(typeof loadV==='function'){
      loadV();
      if(s.name && typeof vices!=='undefined' && Array.isArray(vices)){
        let vi = vices.findIndex(v => v && v.n && v.n.toLowerCase() === String(s.name).toLowerCase());
        if(vi < 0 && s.type && s.type !== 'general'){ vi = vices.findIndex(v => (v.type || (typeof classifyVice==='function'?classifyVice(v.n):'')) === s.type); }
        if(vi >= 0){
          vices[vi].w = (vices[vi].w || 0) + 1;
          vices[vi].total = (vices[vi].total || 0) + 1;
          vices[vi].lastWin = new Date().toISOString();
          if(typeof saveV==='function') saveV();
          creditedIdx = vi;
        }
      }
    }
    if(typeof syncToCloud==='function') syncToCloud();
    if(typeof checkMilestones==='function') checkMilestones();
    if(typeof renderVices==='function') renderVices();
  }catch(_){ }
  closeCompanion();
  // Don't dangle "tap to see more" \u2014 that pulls back in. The companion did its job; hand him back to life.
  theRelease({did:'You made it through the urge \u2014 with nothing but showing up. That\u2019s the rep that builds who you\u2019re becoming.'});
}

function closeSos(){
  document.getElementById('sos-overlay').classList.remove('open');
  if(sosTimerInt)clearInterval(sosTimerInt);
  // Whatever this session collected dies with it — see the note above. Only the win path consumes
  // these, and a value that survives an abandoned SOS gets stamped onto an unrelated later fight.
  try{ window.__sosIntensity = null; window.__sosTrigger = null; }catch(_){ }
}


function logHonestlyBeforeIntervention(){
  if(curVice<0)return;
  loadV();
  const viceName=vices[curVice].n;
  logHonestLoss(viceName);
  closeSos();
}

