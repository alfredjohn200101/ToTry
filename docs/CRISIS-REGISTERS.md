# The three missing crisis registers — specification

> Produced 1 Oct 2026 by a ten-agent pass: one grounder and one adversary per register, an assembler
> each, and a separate audit of the EXISTING lists. Every benign sentence below was driven through the
> real `detectCrisis`; every bound was fault-injected by DELETING it and requiring its benign panel to
> fail. Nothing here is shipped yet except what the commits of 1 Oct name.

**Baseline when this started: 0 of 27 phrasings detected.** The registers are
`plan/means/timing` (the highest-acuity class — a person who has moved from ideation to a plan),
`perceived burdensomeness` (the strongest single clinical predictor), and
`hopelessness/passive ideation` (the register a frozen, exhausted person actually types).

**Read the refusals first.** They are the honest half, and in two places the assembler says plainly
that the trade-off it chose is the wrong way round for a high-acuity disclosure. That is the owner's
call, not mine.

---

## plan, means and timing — 16 entries

> 16 entries ship — 15 bounded regexes plus the one bare phrase that earns it ('noose'); 45/45 disclosures fire, 1 residual false positive in 141 benign sentences, 0 dead entries. Five proposed candidates are REFUSED outright and nine of the eleven register seeds stay unmatchable at the keyword floor, because this app supplies their benign reading.

**Suppressions needed alongside:** NONE. Not one of the 16 entries needs a new innocent-completion regex in `_suppress`: every entry carries its own bound (a clause end, a determiner, a lethal object, an intent verb, or a negative completion), which is why they were measured against the shipped `_suppress` set unchanged and produced one residual FP rather than a list of them.

AND ONE PLACE A SUPPRESSION WOULD BE ACTIVELY WRONG, because this repo fails builds over dead guards. The tempting addition is /\\bhang(?:s|ing)? (?:myself|me) out to dry\\b/g in `_suppress`, since it would close a PRE-EXISTING defect I measured on the unmodified bundle — the shipped flat phrase 'hang myself' returns 'suicide' for "i hang myself out to dry every week". Do not do it as a suppression: once that span is removed from `t`, the `out to dry` branch of my /\\bhanging myself\\b(?!…)/ lookahead can never match, and a guard that cannot fire alongside a comment claiming it does is the exact shape CLAUDE.md names. The correct fix is in the same register as mine, not in `_suppress`: MOVE the bare phrase 'hang myself' out of SUICIDE_PHRASES into SUICIDE_RE carrying the SAME lookahead, so one guard serves both inflections and stays reachable from both.

FOUR MORE PRE-EXISTING FALSE POSITIVES, measured against the unmodified bundle, all on the Can't-start door's path, none caused by these entries and none touched by them:
· "i took all my pills this morning" → 'medical' (MEDICAL_PHRASES 'took all my pills' hands a person on prescribed medication a call-an-ambulance card).
· "i'm going to end this cut tonight" and "i'm going to end it tonight, the streak of giving in" → 'suicide' (the object-less "i'm going to end" — the same shape the file already removed bare 'going to kill' and 'going to hurt' for, landing straight in the Fight's vocabulary).
· "i want to end it, the vice i mean" and "i'm on a deficit and i want to end it" → 'suicide' (shipped 'want to end it').
· "i can't keep going on this deficit" and "i can't do this anymore and i want to be free of it" → 'suicide' (bare 'can't keep going' and 'can't do this anymore', the latter listed twice).
They need the clause-bound treatment the hopelessness work is already applying to 'nothing left', in their own register. Their existence is the direct argument for two decisions above: `end it` is DROPPED from the picked-the-date entry (setting a quit date is a core act this app asks for), and it is KEPT in "enough pills to end it" only because the drug noun carries the object that 'want to end it' lacks.

### Entries

**1. `/\b(?:sav(?:ed\|ing) up\|stockpil(?:ed\|ing)\|hoard(?:ed\|ing)) (?:the\|enough\|a pile of\|(?:all )?my) (?:pills\|tablets\|paracetamol\|panadol\|painkillers)\s*(?:[.!?,\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i've saved up the tablets"; "i've been saving up my pills"; "i've saved up all my pills"; "i've saved up all my pills."; "i've stockpiled enough tablets"; "i've been hoarding the pills"; "i've been hoarding the pills,"; "i've saved up the tablets, i think it's time". Variants measured firing: ALL CAPS, U+2019, doubled space.
- *must stay silent:* "i stashed the meds in my gym bag so i don't forget the afternoon dose"; "i stashed the tablets in the top drawer so the kids can't reach them"; "i've been saving my meds for after ramadan so i can take them at iftar"; "i'm hoarding my meds a bit because the pharmacy keeps running out"; "i've saved enough medication to get me through the trip"; "i'm saving my painkillers for race day"; "i'm stockpiling my tablets before we fly out"; "i've saved up my tablets for the trip to india"; "i've saved up enough tablets for the trip"; "i've been hoarding the pills for my mum"; "i've been stockpiling my painkillers for weeks because of the shortage"; "i've saved up for the tablets i wanted, the ipad is next"; "i'm collecting my medication tomorrow"; "i've got the pills ready for the morning, creatine and vitamin d" — all null. Three separate things do that work: `stash` is NOT a verb here (hiding meds from children is a responsible sentence), `meds|medication` are NOT nouns here (that is where travel and shortage talk lives), and EVERY branch is clause-bounded, so any continuation clears it.

**2. `/\benough (?:pills\|tablets\|paracetamol\|panadol\|painkillers\|insulin) to (?:die\|kill myself\|kill me\|end it\|end my life\|not wake)\b/`** → `SUICIDE_RE`

- *must fire:* "i have enough pills to die"; "i've got enough tablets to not wake up"; "enough paracetamol to end my life" (this one ALSO fires on the shipped /end(?:ing)? my (?:own )?life/, so the entry is not load-bearing for it — it is load-bearing for the other two).
- *must stay silent:* "i took enough painkillers to kill the pain in my quads" (the most ordinary DOMS sentence in a training app — bare `kill` is why this one needs an object); "do i have enough tablets to finish the course of antibiotics"; "i had enough painkillers to finish the half marathon which was stupid"; "i had enough painkillers to do it, the whole race"; "enough pills to last the month" — all null. `kill`, `end` and `finish` bare are all excluded; `do it` was in an earlier draft and was removed on the race sentence.

**3. `/\bhow many (?:pills\|tablets\|paracetamol\|panadol\|painkillers\|insulin)\b[^.!?]{0,24}\b(?:to die(?!\s*of)\|would i die\|to kill me\|to kill myself\|would kill me\|to od\|to overdose)\b/`** → `SUICIDE_RE`

- *must fire:* "how many tablets would it take to die"; "how many paracetamol would kill me"; "how many pills to overdose"; "how many pills to kill myself"; "how many pills would it take to kill me".
- *must stay silent:* "how many pills do i need to take for magnesium"; "how many tablets of creatine per day"; "how many tablets would it take to hit 5g of creatine" (creatine comes in tablets, and `would it take` carries no death word at all — which is why the completion set cannot contain it); "how many painkillers would kill the doms honestly" (`would kill me` requires `me`, so `kill my doms` and `kill the doms` both clear); "how many tablets would it take to die of boredom in this meeting" and "how many pills would it take to die of laughter at this" (`to die(?!\s*of)` — die-of is a live idiom) — all null.

**4. `/\bwhere (?:dad\|mum\|mom\|my (?:dad\|mum\|mom\|father\|mother\|brother\|husband)) keeps? (?:his\|her\|their\|the) (?:gun\|pistol\|handgun\|revolver\|firearm)\b(?!\s*(?:safe\|cabinet\|case\|club\|range\|shop\|store\|licen[cs]e\|dog))/`** → `SUICIDE_RE`

- *must fire:* "i know where dad keeps his gun"; "i know where my dad keeps the pistol"; "where dad keeps his gun is no secret"; and with a newline mid-phrase, "i know where dad\nkeeps his gun".
- *must stay silent:* "i know where he keeps the gun for the start of the race" (a starting pistol — `he|she|they` was in the proposal and is dropped: far too broad for the gain); "i know where dad keeps his rifle, we're going shooting saturday" (a hunting family, entirely ordinary in an Australian app — `shotgun|rifle` dropped for this); "i know where my husband keeps the gun safe key"; "where dad keeps the gun cabinet key is no secret"; "where dad keeps the gun licence is a mystery" (a gun SAFE, a gun CABINET and a gun LICENCE are the responsible-owner nouns and their first word is in the noun set); "i jumped the gun on the car loan"; "the guns are growing, biceps finally"; "i bought a water gun for the kids"; "nobody put a gun to my head about the pay cut" — all null.

**5. `/\bhanging myself\b(?!\s*(?:out to dry\|off\|up\|on\|from (?:the \|a \|my )?(?:bar\|bars\|rings?\|rig\|pull-?up\|frame))\b)/`** → `SUICIDE_RE`

- *must fire:* "hanging myself is the only thing that makes sense" (the shipped flat list has 'hang myself', which the continuous form does not contain, so this returned null before); "hanging myself from the garage beam".
- *must stay silent:* "i've been hanging myself off the rings for grip work"; "i've been hanging myself off the bar for grip work" (dead hangs are a real exercise and this is how people write it); "i'm hanging myself out to dry with this spending" (a live self-criticism idiom and exactly what a money-front journal produces) — both null. The `from <apparatus>` branch excludes only training apparatus, so a beam or a rafter still fires.

**6. `/(?:^\|[^a-z])(?:the\|a\|my\|that) (?:rope\|belt) (?:a)?round my neck\b/`** → `SUICIDE_RE`

- *must fire:* "i had the rope around my neck last night"; "i put a belt round my neck". This is the only safe route to the seed "i bought a rope" — the object plus the body part carry the whole signal.
- *must stay silent:* "my prayer rope round my neck reminds me to pray" (an Orthodox prayer rope — note it is ROPE, so dropping `cord` alone does not save this); "i wear the scapular cord round my neck every day"; "i had the cord round my neck the whole session, headphones kept falling"; "the seat belt round my neck was digging in"; "i bought a rope for the gym, battle ropes are brutal"; "my rope climbs are getting better"; "i hung the rings from the beam" — all null. `cord` is dropped and a determiner is required IMMEDIATELY before the object, so prayer-rope, scapular-cord and seat-belt all clear because the preceding token is a modifier, not an article. RESIDUAL, named: "i had the rope round my neck for the sled drag" DOES fire — I constructed it, it needs an apparatus nobody actually uses that way, and a `(?!\s*for\b)` guard would cost the rehearsal disclosure "i put the rope round my neck for ten minutes". Accepted, not hidden.

**7. `/\blethal dose (?:of (?:paracetamol\|panadol\|painkillers\|pills\|tablets\|insulin\|ibuprofen\|aspirin\|my meds\|medication)\|for me)\b/`** → `SUICIDE_RE`

- *must fire:* "whats a lethal dose of paracetamol"; "whats the lethal dose of my meds"; "is that a lethal dose for me".
- *must stay silent:* "what's the lethal dose of caffeine, i had four pre workouts" (caffeine LD50 is ordinary supplement talk and the AI coach box is where it gets typed); "the lethal dose of water is a real thing apparently, hyponatremia" — both null. The drug class must be named, which is what separates a nutrition question from a means question. COST, named: bare "i looked up the lethal dose" no longer matches.

**8. REVISED 9 Oct 2026 — this entry was a BARE PHRASE in all but name.** As specified it excluded
six equipment nouns and fired on every other mention, so `detectCrisis("carbon monoxide")` ALONE
returned `'suicide'`, and so did "is carbon monoxide dangerous in a closed garage", "we had a carbon
monoxide scare at work today", "carbon monoxide safety week at the school" and "the landlord never
checked for carbon monoxide". A tenant, a parent, a tradesperson and a school newsletter. It now
requires a **DEFINITE enclosure** or a **stated intent**, because the article is the signal: the
enclosure somebody HAS is "the car", a generic one is "a closed garage", and that is what separates
a safety question from a disclosure. The intent branch exists because the recorded must-fire
"carbon monoxide poisoning is how i would do it" has no enclosure at all — the first cut of the
enclosure rule lost it.

```
/\bcarbon monoxide\b(?!\s*(?:alarm|detector|monitor|reading|readings|test|level|levels))[^.!?]{0,34}(?:\b(?:in|inside|into|from|with)\s+(?:the|my|our)\s+(?:car|garage|van|ute|truck|shed|vehicle|exhaust|engine|boot|cabin)\b|\b(?:how i'?(?:d|ll)|how i (?:would|will|could)|that'?s how i|this is how i)\b|\b(?:kill myself|end my life|end it all|take myself out)\b)/
```

*The original spec, kept because its reasoning about the news-source frame still holds:*

**8. `/\bcarbon monoxide\b(?!\s*(?:alarm\|detector\|monitor\|reading\|readings\|test\|level\|levels))/`** → `SUICIDE_RE`

- *must fire:* "i've been reading about carbon monoxide in the car".
- *must stay silent:* "my carbon monoxide reading at the stop smoking clinic was down to 4" — THE COLLISION IS IN THE FIGHT, not in home safety: stop-smoking services measure a CO breath reading, so a person journalling a quit is handed this exact phrase by their own quit service. Also "the carbon monoxide alarm went off at 3am". Both null. RESIDUAL, accepted and named: "i read about carbon monoxide poisoning after the news story" still fires; excluding `poisoning` would cost a real phrasing.

**9. `/\bblow(?:ing)? my brains out\b(?!\s*(?:if\|over\|about\|every\|when\|rather))/`** → `SUICIDE_RE`

- *must fire:* "i want to blow my brains out".
- *must stay silent:* "i'd blow my brains out if i had to sit through another budget meeting"; "i'd blow my brains out over another spreadsheet"; "blowing my brains out about this debt, figuratively" — all null. The conditional/causal frame is what separates the joke from the disclosure. RESIDUAL, named: a comma-spliced hyperbole ("i'd blow my brains out, this meeting is endless") still fires — the frames overlap and only a lookbehind would separate them, which this repo does not use because it ships on two engines.

**10. `/\bslit (?:my )?wrists?\b/`** → `SUICIDE_RE`

- *must fire:* "i'm going to slit my wrists".
- *must stay silent:* "my wrist is slit from the strap, nasty blister" — null, because `slit` must precede the noun. Nothing in training, nutrition, money, the Fight or any of the five faith idioms reads this way; absent from both SUICIDE_PHRASES and SELFHARM_PHRASES, and 'cut myself' does not cover it. `(?:my )?` means "my brother slit his wrists" does not match, which is correct for this gate.

**11. `/\bgas myself\b(?!\s*up\b)/`** → `SUICIDE_RE`

- *must fire:* "i'm going to gas myself in the garage"; bare "i'm going to gas myself".
- *must stay silent:* "i need to gas myself up before the last set"; "gas myself up, one more rep"; "i gas myself up in the car park before every session"; "i'm going to gas myself up for the pr attempt" — all null. The `up` lookahead is MANDATORY, not optional: hype-yourself-up is standard gym slang and this is a training app. Measured firing without it.

**12. `/\b(?:want\|wants\|wanted\|wanna\|need\|needed\|going to\|gonna\|about to\|put\|putting\|puts\|wish\|i'?d like\|would like)\b[^.!?]{0,24}\bbullet in (?:my\|the back of my) (?:head\|brain\|skull)\b/`** → `SUICIDE_RE`

- *must fire:* "i want a bullet in my head"; "i'm going to put a bullet in my head"; "i feel like i want a bullet in my head" (the commonest disclosure frame — a clause-level `feel` guard would have blocked it, which is why the gate is a verb set and not a tempered guard); "i'd like a bullet in my head"; "i would like a bullet in my head honestly".
- *must stay silent:* "i felt a bullet in my head after that set, pure headache"; "it feels like a bullet in my head, worst headache of the week"; "it feels like a bullet in my head after every set"; "that pre workout felt like a bullet in my brain" — all null. THE BARE FORM FIRED ON THE FIRST OF THOSE IN MY OWN CORPUS, which is why the intent gate is here and not in the adversary's "SAFE as written" verdict. Deliberately NOT the neighbouring "put a gun to my head", which is a live coercion idiom ("nobody put a gun to my head about the pay cut").

**13. `/\b(?:jump(?:ing\|ed\|s)?\|step(?:ping\|ped\|s)?) in front of (?:a \|the )?(?:train\|truck\|bus\|lorry)\b(?!\s*(?:queue\|doors?\|for\b\|to (?!die\|end\|kill)))/`** → `SUICIDE_RE`

- *must fire:* "i'm going to jump in front of a train"; "i'll step in front of a truck"; "i want to step in front of the bus"; "i want to jump in front of a bus"; "i'd step in front of a train to end it"; "step in front of a train to kill myself"; "i'm going to jump in front\nof a train".
- *must stay silent:* "i'd step in front of a bus for my kids"; "i would jump in front of a truck for her honestly" (stepping in front of a bus for someone is a DEVOTION idiom, in an app with a faith front and a family-and-why onboarding question); "i jumped in front of the bus queue, not proud"; "i jumped in front of the train doors to hold them"; "i stepped in front of the car to check the tyre" and "i stepped in front of the bus to wave at her" (`car` dropped; any purpose clause excluded unless its verb is a death verb); "jumping off the box hurt my knee"; "i jumped off the box and tweaked my ankle"; "i jumped the gun on the car loan" — all null. THE GROUPING IS LOAD-BEARING: written with a top-level alternation, bare \bjump matches the two plyometrics sentences.

**14. `/(?:^\|[.!?])(?:(?!\bif\b\|\bimagine\b\|\bpretend\b\|\bsuppose\b\|\bwere\b\|\blike\b\|\btreat\b\|\bas though\b\|\bcould be\b\|\bmight be\b)[^.!?])*\bmy last (?:day\|night\|morning) (?:alive\|on earth\|on this earth)\b(?!\s+as\b)/`** → `SUICIDE_RE`

- *must fire:* "tomorrow is my last day alive"; "my last night on this earth"; "my last day alive is tomorrow"; "today is my last day on earth"; "i trained hard today. tomorrow is my last day alive"; "tomorrow is my last day alive". COST, named out loud: a disclosure sharing a clause with `like/if/were/treat` misses — "i feel like giving up tomorrow is my last day alive" returns null. Punctuation rescues it; an unpunctuated run does not.
- *must stay silent:* MEMENTO MORI IS A PRACTICE THIS APP RUNS IN ITS EVENING RITUAL: "if today was my last day on earth how would i live it, examen question"; "if this were my last day alive i'd call my mum"; "i want to live every day like it's my last day on earth"; "memento mori, treat today as my last day on earth"; "today could be my last day on earth, that's the examen"; "i trained hard. imagine today was my last day alive". Plus the locative, which is why `here` is dropped entirely: "today is my last day here at the office, new job monday"; "my last night here before we move house"; "my last morning here at the retreat, flying home after mass". Plus the program/season forms: "my last day of the cut is friday"; "my last night of lent". And the role forms the `as` lookahead clears: "today is my last day on earth as a smoker, quit date is today"; "my last night on earth as a bachelor"; "my last day alive as a 29 year old, birthday tomorrow" — all null. TWO MECHANICS, both measured: the guard must anchor at a CLAUSE start, not at ^, or "i trained hard today. tomorrow is my last day alive" misses; and the anchor must NOT include \n, because `t` keeps the newline, so a thumb pressing Enter inside "if today was\nmy last day on earth" would put the phrase in a fresh unguarded clause and FIRE. Without \n the collapsed form `tc` still carries the newline-separated true case.

**15. `/\b(?:picked\|chosen\|chose\|set\|decided on) (?:the \|a \|my )?(?:day\|date\|night) (?:i\|that i\|to) (?:die\|end my life\|kill myself)\b/`** → `SUICIDE_RE`

- *must fire:* "i've picked the day i die"; "i chose the night i die"; "i set the date to end my life" (that one also fires on the shipped /end(?:ing)? my (?:own )?life/, so the entry's unique contribution is the `die` and `kill myself` branches).
- *must stay silent:* "i've picked the day, monday is day one"; "i've picked the day to start the fast"; "i set the date for my first 5k"; "i picked the night to go to the gym" (an earlier draft allowed `go` and fired on this) — and the two that decide the shape of this entry: "i've picked the day i end it, quit date is the 14th" and "i set the date to end it, the cut finishes december 1". SETTING A QUIT DATE IS A CORE RECOVERY ACT THIS APP ASKS FOR, so `end it` is dropped from the completion set. All null.

**16. `'noose'`** → `SUICIDE_PHRASES`

- *must fire:* "i tied a noose last night"; "i bought a rope and made a noose"; "i've got a noose in the garage"; "i tied a NOOSE". This is the matchable half of the seed "i bought a rope" — bare 'rope' is not safe here, 'noose' is unconditionally. A separate /\btie[ds]? (?:a|the) noose\b/ is a DEAD entry (subsumed) and is not proposed.
- *must stay silent:* Zero benign completions in any of the app's fronts, measured over the whole corpus: "i bought a rope for the gym, battle ropes are brutal"; "my rope climbs are getting better"; "i hung the rings from the beam" — untouched. Both substring traps checked explicitly and cleared: "a mongoose got into the chicken coop" (m-o-n-g-o-o-s-e, no n-o-o-s-e) and "we're driving up to noosa for the long weekend" (Noosa is n-o-o-s-a). The word appears nowhere in the app's own copy, so nothing the app prints can feed it back.

### Refused, and why — the honest half

REFUSED OUTRIGHT — five candidates that read well and collide with a sentence this app's own fronts produce. Every benign sentence below was driven through the real detectCrisis.

1. 'all my pills at once / together / in one go'. "i take all my pills together in the morning with breakfast"; "i take all my pills at once, it's easier to remember"; "i took all my tablets at once because i kept forgetting the second dose". The manner adverbial is exactly how a person describes a pill organiser — taking them together IS the convenience — and this app's nutrition front puts creatine, magnesium and vitamin D in that sentence. No honest bound exists. It would also only upgrade a PRE-EXISTING false positive: the shipped MEDICAL_PHRASES entry 'took all my pills' already returns 'medical' for "i took all my pills this morning".

2. 'bought / borrowed a gun'. "i bought a shotgun last week for the farm, $900 off the budget"; "i borrowed a rifle off my brother for the weekend". Acquisition is a canonical warning sign and I am still refusing it, for a reason specific to THIS app: the MONEY front invites people to journal purchases with amounts, so a lawful firearm purchase arrives in a free-text door with a price attached. A lookahead for farm/range/club fails on the benign sentence that does not say why. Firearm ACCESS is reachable through the "where dad keeps his gun" entry; acquisition is not.

3. 'goodbye note / goodbye letter'. The qualifier does not separate this from the app's letters-to-your-future-self feature — the qualifier IS the app's vocabulary. A farewell letter to the addiction is a standard recovery exercise and the whole Fight front is built on letting go: "i wrote a goodbye letter to porn, my counsellor suggested it"; "i've written a goodbye letter to the old me"; "i've written a goodbye note to the habit, day one tomorrow". Plus one that is not excludable at all: "i wrote a goodbye note for linda's leaving card at work". Any lookahead here is a whitelist of vices that the next unlisted vice defeats. ('suicide note' needs no entry: bare 'suicide' already fires.)

4. 'said my goodbyes' + clause end. The bound cannot help, because the benign sentence ends its clause too: "went to the farewell, said my goodbyes, came home early and stayed clean", and bare "i said my goodbyes." A leaving do, a funeral, a house move and the last night of a trip all produce that clause, punctuated.

5. "won't be here much longer / for long". "i won't be here much longer, we're moving to perth in june"; "i won't be here for long today, quick session then work". `be here` is locative in a way `be around` is not. The asymmetry with the shipped /won'?t be around (much longer|for long|tomorrow)/ is deliberate and runs the opposite way to the proposal's argument: "not here" is the MORE ordinary thing to type, which is precisely what makes it unsafe.

NINE OF THE ELEVEN REGISTER SEEDS ARE UNMATCHABLE BY A SUBSTRING GATE IN THIS APP. "i've written a note" (the app has a literal letters-to-your-future-self feature and a journal: "i've written a note to my future self", "i've written a note in my journal about the urge"). "i've written letters to everyone" (gratitude-letter writing: "...to everyone i'm grateful for"). "tonight is the night" — this is the app's OWN motivational frame, and at the Can't-start door it is the sentence the flow exists to produce: "tonight's the night i start the new routine". "i'm going to do it tonight" — "do it" is the emptiest verb in English and this is a do-the-thing app. "i know how i would do it" — a routine, a budget, a meal plan. "i have it all worked out" — named in the app's own planning vocabulary. "i've picked the day" — the app ASKS people to pick a start day. "i bought a rope" — battle ropes, rope climbs, skipping rope. "i've got the pills ready" — supplements and medication. For each, the benign and the disclosure are the same string; a clause bound does not separate them, because the benign form also ends the clause. Only two seeds are directly matchable, and both ship above: "i know where dad keeps his gun" and "i've saved up the tablets".

ALSO REFUSED from the wider register: 'giving away my things' (decluttering is a self-improvement staple); 'written my will' / 'put my affairs in order' (the MONEY front makes these responsible-adult sentences); 'deleted my accounts' (the app's own dopamine-detox thesis asks for exactly this); 'i've got the means' / 'only way out' (the MONEY front owns both); 'pulled the trigger' / 'put a gun to my head' / 'loaded gun' (live idioms — CLAUDE.md itself uses "a loaded gun" metaphorically); 'final note' ("on a final note, this was a good week"); "it'll all be over soon" / "when i'm gone" (the cut will all be over soon).

THESE ALL BELONG ON THE AI SURFACES, NOT AT THE KEYWORD FLOOR. The companion, the coach and brotherSpeaks read the WHOLE sentence and the whole life state; "tonight is the night", "i have it all worked out" and "i've written a note" are disambiguated by context in one reading and by no substring ever. The keyword floor's job is the sentence that cannot be read any other way. Routing the ambiguous register to the model is the only honest home for it — and it is also the only place a follow-up question ("is it tonight you're planning to start, or to finish?") can be asked, which is what a human would do.

WHERE THIS TRADE-OFF IS THE WRONG WAY ROUND, SAID OUT LOUD. Three of the narrowings above cost a HIGH-ACUITY disclosure, and firearm and ligature access are the highest-lethality items in the whole register:
· Dropping `shotgun|rifle` from the firearm-access entry means "i know where dad keeps his shotgun" now returns null. That is a C-SSRS preparatory disclosure about the most lethal means in the house, missed so that an Australian hunting family's Saturday sentence is not met with a crisis card. I think the narrowing is right at the Can't-start door and wrong everywhere else, and I am naming it rather than burying it: if these entries are ever gated per-door, `shotgun|rifle` should go back in on the additive surfaces.
· Clause-bounding every branch of the stockpile entry means "i've been stockpiling my painkillers for weeks" and "i've saved up the tablets and written it all down" both return null. Measured, both.
· The memento-mori guard means a disclosure sharing a clause with `like/if/were/treat` misses: "i feel like giving up tomorrow is my last day alive" returns null.
In each case the alternative was firing on a sentence the app itself teaches, at a door where a non-null REPLACES the help-me-start flow with no route back. I took the miss. It should not be mistaken for safety.

---

## perceived burdensomeness — 13 entries

> Fourteen bounded regexes for perceived burdensomeness — 0 new false positives over 120 of the app's own sentences, every bound fault-injected — and three entries refused outright, including the one the fitness "why" field would have broken.

**Suppressions needed alongside:** None. No new `_suppress` regex is needed and I deliberately added none — every exclusion here is a bound inside the entry that needs it, which keeps the blast radius to that entry. Adding a span-removal for the burden-lifted idiom would have been the obvious move and is the wrong one: `_suppress` deletes the span from EVERY list's input, so a suppression wide enough to swallow "a burden has been lifted" would also swallow the "a burden" inside "i'm a burden and i want to die" — the exact over-reach the file's own comment records for `ending things with myself`. The lookahead `(?!\s*(?:bearer|carrier|ha[sd]\b|is\b|was\b|been\b|lift|off\b))` does the same work locally and cannot reach another entry.

TWO MEASURED PRE-EXISTING FALSE POSITIVES ADJACENT TO THIS REGISTER, NOT MINE AND NOT FIXED HERE (both reproduced against the unpatched shipped function, and the first one matters because three of my entries are 'better off' patterns):
(a) 'better off dead' in SUICIDE_PHRASES fires on "better off deadlifting twice a week". In a training app. Same substring shape CLAUDE.md records for bare 'going to kill' and 'jump off'. Suggested replacement, to be measured on its own: move it to SUICIDE_RE as `/\bbetter off dead\b(?!\s*(?:lift|lifts|lifting|hang|hangs|bug))/` plus the spaced spelling. Note "i'd be better off with dead lifts in the split" does NOT fire — only the closed compound does.
(b) "can't do this anymore" (listed twice, both apostrophe spellings) fires on "i can't do this anymore, the cravings" — which CLAUDE.md itself names as Fight-about-the-vice vocabulary.

ONE OUT-OF-REGISTER GAP, MEASURED WHILE HERE AND LEFT ALONE ON PURPOSE: "i am going to end it tonight" returns null. The list carries 'i'm going to end', 'gonna end it', 'want to end it', 'ready to end it' and 'about to end it', but the unabbreviated "i am" reaches none of them (the apostrophe-strip pass turns "i'm" into "im", never into "i am"). "i am gonna end it tonight" DOES fire. It is a one-line fix — `/\b(?:i'?m|i am|im) (?:going to|gonna) end (?:it|this|things)\b/` — but it belongs to a different register and should be measured with that register's corpus, not slipped in under this one.

MECHANISM NOTE FOR WHOEVER LANDS THESE: every apostrophe above is written `'?` (i'?m, don'?t, they'?d, wasn'?t) because `_hitRe` tests t, tNo, tc and tcNo — the stripped pass turns "they'd" into "theyd", and a pattern spelled with a literal apostrophe only matches in two of the four passes. No pattern here uses a lookbehind, deliberately: it would be the first in the bundle and a new engine-divergence surface on a file that ships to Chromium and WebKit both.

### Entries

**1. `/\b(?:i'?m\|i am\|im\|i feel like(?: i'?m\| im)?\|i felt like(?: i'?m\| im)?\|i feel i'?m\|i'?ve become)\s+(?:just \|such \|only \|nothing but \|like \|a real )*a burden\b(?!\s*(?:bearer\|carrier\|ha[sd]\b\|is\b\|was\b\|been\b\|lift\|off\b))/`** → `SUICIDE_RE`

- *must fire:* "i'm a burden to everyone" · "i am a burden" · "im just a burden" · "i feel like a burden" · "i feel like i'm a burden to my wife" · "i'm such a burden on my family" · "i've become a burden" · "i felt like a burden all day" · "i'm nothing but a burden" — plus the three normalisation forms: "i’m a burden to everyone" (iOS smart quote), "i'm a\nburden to everyone", "i  am  a  burden  to  everyone". TWO BOUNDS, BOTH FAULT-INJECTED: drop the subject binding and "praying feels like a burden lately" fires; drop the lifted-family lookahead and "i feel like a burden has been lifted after confession" fires — the app's own faith layer at a person's BEST moment, and the commonest completion of "a burden" in English.
- *must stay silent:* "i feel like a burden has been lifted after confession" · "after confession i felt like a burden lifted off my shoulders" · "telling my wife felt like a burden lifted" · "praying the rosary feels like a burden lately, not a gift" · "fasting feels like a burden this ramadan" · "lent feels like a burden more than a gift this year" · "tithing feels like a burden on the budget right now" · "the debt feels like a burden on us" · "tracking every macro feels like a burden" · "the 5am alarm feels like a burden i put on myself" · "cast your burden on the lord and he will sustain you" · "come to me all who are weary and burdened" · "bear one another's burdens" · "my yoke is easy and my burden is light" · "allah does not burden a soul beyond what it can bear" · "i'm a burden bearer for my family" · "the tax burden is brutal this year"

**2. `/\b(?:i'?m\|i am\|im)\s+(?:just \|such \|only \|nothing but )*a drain on (?:them\|everyone\|everybody\|the people\|my family\|my wife\|my husband\|my kids\|my children\|my parents\|my mum\|my mom\|my dad\|my partner\|my friends\|my mates)\b/`** → `SUICIDE_RE`

- *must fire:* "i'm just a drain on everyone" · "i am a drain on my family" · "im a drain on my wife". The object MUST be a person. Fault-injected: drop the people list and "i'm a drain on the household budget with these subscriptions" fires. Self-as-line-item is budget talk in an app with a debt front and a gambling front, so this entry deliberately does NOT treat "a drain on the household budget" as a disclosure.
- *must stay silent:* "i'm a drain on the household budget with these subscriptions" · "i'm a drain on our savings every month" · "i'm a drain on the team's pace at the 6am class" · "i'm drained after that session" · "that leg day drained me" · "the subscriptions are a drain on my account"

**3. `/\bi (?:just )?drain (?:everyone\|everybody\|the people\|my family\|them)\b(?!\s+(?:of\|the)\b)/`** → `SUICIDE_RE`

- *must fire:* "i drain everyone around me" · "i just drain everyone" · "i drain my family". Lowest-yield entry in the set; kept because the bound is one lookahead. Fault-injected: drop it and "i drain them of energy when i spot for them" fires.
- *must stay silent:* "i drain them of energy when i spot for them" · "i drain my shaker then refill it" · "i just drain the pasta and weigh it" · "the long runs drain everyone in the group" · "work is draining me" · "i drain the tank every session"

**4. `/\b(?:i'?m\|i am\|im\|i feel like i'?m)\s+(?:just \|such \|only )*a waste of (?:space\|oxygen\|air\|skin\|a life\|life)\b\s*(?:[.!?,;\n\r]\|$\|to (?:them\|everyone\|everybody\|my family)\|in (?:this world\|their lives))/`** → `SUICIDE_RE`

- *must fire:* "i'm a waste of space" · "i'm a waste of space." · "i am just a waste of oxygen" · "i'm a waste of space to everyone" · "i feel like i'm a waste of air, honestly". Fault-injected: drop the clause end and "i'm a waste of space on the leaderboard" fires. RESIDUAL I AM NOT HIDING: "in this relay team i'm a waste of space." still fires — a suffix bound cannot see a prefix. Kept anyway because 'waste of space' is an insult about a PERSON in every context (unlike 'dead weight', which has a literal lifting meaning), so the leading-context form is rare. That is a judgement, not a measurement.
- *must stay silent:* "i am a waste of space in this relay team" · "i'm a waste of space on the leaderboard" · "i'm a waste of space at the back of the pack" · "the app is a waste of space on my phone" · "that session was a waste of time" · "what a waste of money"

**5. `/\bbetter off (?:if\|when\|once) (?:i'?m\|i was\|i were\|i am) (?:gone\|dead)\b(?!\s*(?:for (?:a \|an \|one \|two \|three \|four \|five \|six \|ten \|the \|next \|this \|that \|\d)\|so much\|so long\|so often\|less\|from home\|until\|till))/`** → `SUICIDE_RE`

- *must fire:* "everyone would be better off if i was gone" · "they would be better off once i'm dead" · "my family would be better off when i'm gone" · "she'd be better off if i were gone" · and deliberately "everyone would be better off if i was gone for good" (the lookahead names only finite durations, never 'for good'). NEGATION POLARITY IS THE WHOLE DESIGN: for gone|dead the disclosure is UNNEGATED, so every negated subject form is excluded — fault-injected, re-admit them and "the kids would be better off if i wasn't gone so much for work" (an ordinary work-life-balance journal line, meaning better off if I were PRESENT) fires.
- *must stay silent:* "the kids would be better off if i wasn't gone so much for work" · "my wife would be better off if i wasn't gone every weekend" · "i'd be better off if i was gone for two weeks and came back fresh" · "the weight is better off once gone" · "better off when the cravings are gone" · "better off once the weight is gone" · "i'd be better off with dead lifts in the split"

**6. `/\bbetter off with me (?:gone\|dead)\b/`** → `SUICIDE_RE`

- *must fire:* "they'd be better off with me gone" · "my family would be better off with me dead". The 'with' is pinned to 'me', so "better off with dead lifts" cannot reach it. MEASURED SCOPE REDUCTION: the proposal wrote this as `with(?:out)?`, and I dropped the `out` because the shipped phrase 'better off without me' already catches "better off without me around.", "...without me gone", "...without me here" — verified against the unpatched function. A branch that cannot add a hit is surface for nothing.
- *must stay silent:* "i'd be better off with dead lifts in the split" · "i'm better off with me-time on sundays" · "i'm better off with me first for once" · "better off without medication"

**7. `/\bbetter off (?:if\|when\|once) (?:i (?:was\|were) (?:not\|never)\|i wasn'?t\|i weren'?t\|i'?m not\|i am not)\s+(?:here\|around\|alive\|born)\s*(?:[.!?,;\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "my wife would be better off if i wasn't here." · "they would be better off if i wasnt around." · "everyone would be better off if i was never born." · "they'd be better off if i'm not here." THE MIRROR OF THE ENTRY ABOVE: for here|around|alive|born the disclosure is the NEGATED form, so negation is REQUIRED here where it is forbidden there. Fault-injected: allow the unnegated forms and "my kids would be better off if i was around, but my job won't allow it" fires — a parent journalling about travelling for work. `never` is load-bearing: without it "if i was never born" is lost. The `without me` branch is dropped for the same measured reason as the entry above.
- *must stay silent:* "my kids would be better off if i was around, but my job won't allow it" · "we'd be better off if i was around, honestly" · "the kids are better off with me here, i just need to be present" · "i'd be better off if i was here more for the 6am class" · "better off if i wasn't here for the next six weeks on nights"

**8. `/(?:^\|[.!?]\s*\|[\n\r]\s*\|\bi (?:think\|know\|feel\|reckon\|believe\|guess)(?: that)?\s+)(?:everyone\|everybody\|they\|my family\|my wife\|my husband\|my kids\|my children\|my parents\|my mum\|my mom\|my dad\|my partner\|my girlfriend\|my boyfriend\|my friends\|my mates\|the kids)(?:'?d\| would\| will)?\s*(?:all \|probably \|honestly \|just )*be better off\s*(?:[.!?;\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "my family would be better off" · "my family would be better off." · "i think my family would be better off." · "they'd all be better off." · "i told her the truth. my kids would be better off." · "everybody would be better off" · "my wife would be better off." · and "today was rough\nmy family would be better off." THREE BOUNDS. (1) the subject must be OTHER PEOPLE — 'i' and 'we' are deliberately absent. (2) the clause must END, and the COMMA is deliberately out of that set (with it, "my mates would be better off, they train harder than me" fires). (3) the subject must OPEN a sentence or follow an attitude verb — fault-injected, drop it and all four Fight-front and Money-front HOPEFUL conditionals fire ("if i stop gambling my family would be better off."), which is the worst failure in the whole register. The `[\n\r]` prefix is load-bearing: a textarea's sentence boundary is a newline, not a full stop. COSTS, measured: "my family would be better off and i know it" and "sometimes my family would be better off." do NOT fire. Adding sometimes|lately|maybe|honestly to the prefix set recovers them and re-admits "if i quit the vape, maybe my kids would be better off." — not taken.
- *must stay silent:* "if i stop gambling my family would be better off." · "if i quit the vape my kids would be better off." · "once the debt is gone my family would be better off" · "if i was earning more my parents would be better off." · "i'd be better off doing cardio" · "my budget would be better off without netflix" · "we'd all be better off going to bed earlier" · "honestly they'd be better off doing 5x5" · "my mates would be better off, they train harder than me" · "my parents would be better off financially if i moved out" · "my kids would be better off at a different school" · "i'd be better off if i ate more protein"

**9. `/\b(?:no ?one\|nobody\|no-one)[^.!?\n]{0,16}\bmiss me\s*(?:[.!?;\n\r]\|$\|if i (?:was \|were \|wasn'?t \|weren'?t \|am \|'?m )?(?:not \|never )?(?:gone\|dead\|here\|around\|alive\|died\|disappeared)\b\|if i went\s*(?:[.!?;\n\r]\|$))/`** → `SUICIDE_RE`

- *must fire:* "nobody would miss me." · "no one would even miss me if i went" · "nobody would miss me if i was gone" · "no one would miss me if i died". The if-clause is pinned to absence-of-self. Fault-injected: restore the bare `if\b` branch the proposal shipped and all three scheduling sentences fire — the bare conditional re-admitted unbounded exactly the family the clause end was added to exclude. The 16-char window stops the match reaching across a subordinate clause.
- *must stay silent:* "nobody would miss me if i skipped tonight's session" · "no one would miss me if i left the group chat" · "nobody would miss me if i dropped parkrun" · "nobody would miss me at parkrun" · "no one would miss me at the 6am class honestly" · "no one would miss me if i went to the 6am instead"

**10. `/\b(?:no ?one\|nobody\|no-one)[^.!?\n]{0,28}\b(?:notice\|care\|realise\|realize)[sd]?\b[^.!?\n]{0,14}\bif i (?:was \|were \|wasn'?t \|weren'?t \|am \|'?m )?(?:not )?(?:(?:gone\|dead\|died\|disappeared)\b\|(?:here\|around\|alive)\s*(?:[.!?,;\n\r]\|$\|or not\b\|at all\b))/`** → `SUICIDE_RE`

- *must fire:* "no one would notice if i was gone" · "nobody would notice if i disappeared" · "no one would care if i was gone" · "nobody would care if i died" · "no one would care if i was here or not" · "nobody would even notice if i wasn't here." · and it survives a newline mid-phrase, because the whitespace-collapsed form is tested too. The compound is required — neither half is safe alone — and here|around|alive additionally need a clause end, because those three take a scheduling completion that 'gone' and 'dead' cannot. Fault-injected: leave here|around unbounded and "no one would notice if i wasn't here for the 6am class" fires.
- *must stay silent:* "no one would notice if i wasn't here for the 6am class" · "nobody would care if i wasn't around for the challenge week" · "no one would notice if i skipped tonight" · "nobody would notice the difference in my weight yet" · "if i was gone for two weeks my streak would reset" · "no one would care if i was late"

**11. `/\b(?:they\|everyone\|everybody\|my family\|my wife\|my husband\|my kids\|my parents\|people)(?:'?d\| would\| will)?\s*(?:all \|just \|probably \|honestly )*be relieved\s+(?:if i (?:was \|were \|'?m \|am )?(?:gone\|dead\|not here)\|when i'?m (?:gone\|dead)\|without me\b)/`** → `SUICIDE_RE`

- *must fire:* "they'd all be relieved if i was gone" · "my family would be relieved when i'm gone" · "everyone would be relieved without me" · "theyd all be relieved if i was gone" (apostrophe-stripped pass). THE CLAUSE-END BRANCH IS DELETED, AND THAT LOSES THE SEED. Fault-injected: restore it and "my wife would be relieved." fires — which in an app with a Fight front is what somebody writes the night they decide to tell their wife. The antecedent of the relief is never in the sentence, so no bound can recover it.
- *must stay silent:* "my wife would be relieved if i stopped gambling" · "my family would be relieved when i tell them i'm 90 days clean" · "everyone would be relieved, the session got cancelled" · "my wife would be relieved." · "my kids would be relieved." · "they'd all be relieved."

**12. `/\b(?:my death\|me dying\|my dying) would be a relief\b/`** → `SUICIDE_RE`

- *must fire:* "my death would be a relief" · "me dying would be a relief for everyone" · "my death would be a relief to them". The verbatim INQ-15 burdensomeness item. Requiring the full predicate immediately after the death-noun leaves no benign completion in any of the app's domains; the five traditions' death idiom is 'die to my old self' / 'dead to sin' (both already suppressed) and never this.
- *must stay silent:* "my dying plant needs water" · "the deload would be a relief" · "my death metal playlist is a relief" · "finishing this cut would be a relief" · "me dying of laughter would be a relief"

**13. `/\b(?:i'?m\|i am\|im\|i'?d be\|i would be)\s+(?:probably \|honestly \|just )*worth more (?:to (?:them\|everyone\|everybody\|my family) )*dead\b/`** → `SUICIDE_RE`

- *must fire:* "i'm worth more dead than alive" · "i am worth more to them dead" · "i'd be worth more dead". Joiner's own formulation, and usually typed with life insurance in mind, which makes it high-acuity. Fault-injected: drop the first-person subject and the scrap-value idiom fires — the proposal required no subject at all, so in an app with a debt front any possession reached it.
- *must stay silent:* "the old bike is worth more dead than alive as scrap" · "that car is worth more dead than alive" · "the insurance is worth more than the car" · "not worth the session" · "worth the money"

### Refused, and why — the honest half

This is the honest half. Four things the proposal wanted that I will not ship, and each one is named with the sentence that kills it. All four were MEASURED on the real function, not reasoned about.

1. "I DON'T WANT TO BE A BURDEN" — REFUSED ENTIRELY, INCLUDING THE "ANYMORE" FORM. This is the most important refusal here, and I reversed the adversary's own rescue of it. The proposal's object list (on my kids, to my children, my parents) is precisely the list of people named by the commonest motivational WHY in all of health and fitness: "i don't want to be a burden on my kids when i'm older", typed into onboarding's "why does this matter?" — crisis door #18, where a non-null REPLACES the help the person came for. The adversary narrowed it to the `anymore` branch on the argument that "anymore" presupposes they currently ARE one. I measured that branch and it fires on three Fight-front sentences of exactly the hopeful kind: "i don't want to be a burden to my family anymore so i'm getting help", "i don't want to be a burden on my wife anymore, 90 days clean today", "i don't want to be a burden anymore, that's why i'm starting". "Anymore" does not separate resolve from withdrawal — it is present in both, because both are about the burden ending. There is no bound that distinguishes "so I will get better" from "so I will remove myself", because the difference is not in the string. COST, stated plainly: the softened disclosure "i don't want to be a burden anymore", which the end-of-life and caregiving literature documents as commoner than the bare self-ascription, is NOT caught by the keyword floor. It belongs on the AI surfaces, which read the whole message — the companion, the coach, brotherSpeaks — where "i don't want to be a burden anymore" alongside "i've picked the day" is a different object from the same sentence alongside "90 days clean". The self-ascription form ("i'm a burden") carries this register at the floor; the softened form needs context the floor does not have.

2. "I'M DEAD WEIGHT" — REFUSED. Four sentences survive every bound because the gym context sits in FRONT of the match, where no suffix bound can look: "on the group ride i'm just dead weight.", "in the relay team i'm the dead weight.", "at parkrun i'm dead weight.", "compared to my brother i feel like i'm dead weight." 'dead weight' is the literal, correct idiom for a rider who is not pulling — this is the app's own voice. The only remaining bound (require an explicit people object) empties the entry: "i'm dead weight." and "im just dead weight" go null, leaving only "i'm dead weight to my family", which nobody types. An entry whose bound removes its own disclosures is not an entry.

3. "IT WOULD BE A RELIEF FOR THEM" — REFUSED. The subject is 'it', and the antecedent of 'it' is always BEFORE the match: "if i finally clear this debt it would be a relief for my family.", "if i quit tonight it would be a relief for everyone." Money front and Fight front, both hopeful, both satisfying the clause end. Pinning the branches as entry 13 does turns it into a duplicate of two entries that already ship. The only bound that would work is a variable-length lookbehind, which would be the first in the bundle and a new engine-divergence surface — not worth it for this register's weakest form.

4. "THEY'D ALL BE RELIEVED." (BARE CLAUSE END) — REFUSED, and this is the one I am least comfortable with, so I am saying it out loud rather than burying it. It is one of the five seed phrasings, and it is now NOT caught. The reason is that in an app with a Fight front, "my wife would be relieved." is what somebody writes the night they decide to tell her, and "my kids would be relieved." is what somebody writes about getting clean. Relief-for-them at my RECOVERY and relief-for-them at my ABSENCE are the same eleven characters. THE TRADE-OFF IS ARGUABLY THE WRONG WAY ROUND HERE, and I want that on the record: "they'd all be relieved." is an INQ-15 construct and a real disclosure, and I am letting it through the floor to protect a recovery sentence. I made that call because this register's unambiguous forms (my death would be a relief / be relieved when I'm gone / better off with me gone) all still fire, so a person in that state usually reaches one of them — but if the owner wants one entry in this set widened at the cost of a false positive at an additive surface, this is the one, and it should be widened on the AI surfaces first, not at the keyword floor.

ALSO WITHDRAWN BY THE PROPOSER AND I AGREE, EACH FOR THE SAME REASON — the sentence is ordinary self-criticism from somebody doing the work: INQ's "i make things worse for the people in my life" (fires on "i make things worse for my wife when i snap at her", an ordinary journal line about temper); "i'm holding everyone back" (in a training app this is "i'm holding the group back on the run"); "i'm the problem" ("i'm the problem, not the program" is a sentence this app's coaching voice would be glad to hear); "nobody needs me" ("no one needs me to go" is a scheduling note).

AND NO PHRASE-LIST ENTRY AT ALL IN THIS REGISTER. Every one of the fourteen is a regex, and that is the finding, not an implementation detail: there is no bare substring here whose worst completion I would accept. 'burden' is taught by the app's own faith layer five ways over and its commonest English completion is "has been lifted"; 'relieved' is what someone writes the day they tell their wife; 'better off' is how the app's own coaching speaks; 'dead weight' is gym slang; 'drained' is what a leg day does to you; 'notice' and 'gone' and 'miss me' all take a scheduling completion. Two further structural facts worth carrying forward: A SUFFIX BOUND CANNOT SEE A PREFIX — three of the proposal's entries were defeated by a leading conditional, which is why entry B10 anchors to a sentence start instead; and NEGATION POLARITY DIFFERS BY OBJECT — for gone|dead the disclosure is unnegated, for here|around|alive it is negated, and the proposal's two entries each carried the other's polarity, so each admitted the other's healthy sentence.

---

## hopelessness and passive ideation — 22 entries

> 22 clause-bounded SUICIDE_RE entries for hopelessness/passive ideation, with the COMMA removed from every bound. The adversary's single cause is confirmed and quantified on the real detectCrisis: with the tree's existing (?:[.!?,\n\r]|$) spelling these patterns produce 42 new false positives over a 146-sentence benign corpus drawn from the app's own fronts; with a sentence end (?:[.!?\n\r]|$) they produce 0, and all 63 true disclosures still fire. But the adversary UNDERSTATED the price of that swap by 3x — they measured three lost sentences; the real figure is a whole class, 10 of 10 comma-continued genuine disclosures, including "i can't cope anymore, i don't know what to do". I commit the sentence end because of the Can't-start door, and refusedAndWhy carries the exact alternative bound that buys the class back with its own measured cost. Also: one new suppression (the faith-surrender completion arrives across a FULL STOP, which no bound can reach, and neither agent found it); one entry neither agent proposed, added because the proposer's justification for another entry turned out to be false; and four pre-existing bare substrings that fire on ordinary app sentences today and are not fixed by anything here.

**Suppressions needed alongside:** ONE new innocent-completion regex, into the _suppress array in src/app/03-person.js immediately after /\bdead to sin\b/g:

/\b(?:nothing matters (?:any ?more|at all)|no hope left|what'?s the point of it all)[.!?]+\s*(?:only|except|but|save)\s+(?:in |for )?(?:his |thy |your |the )?(?:him|christ|jesus|god|allah|grace|mercy|lord|will|krishna|dharma)\b/g

WHY NO BOUND CAN DO THIS JOB, AND WHY NEITHER AGENT FOUND IT. The adversary's two most dangerous collisions are faith vocabulary the app teaches, and they correctly showed both arrive by comma — which the sentence end closes. But a FULL STOP is a genuine sentence end, so the same surrender idiom written as two sentences still fires. Measured on the committed configuration BEFORE this suppression, all six of these returned 'suicide': "nothing matters anymore. only christ." / "nothing matters at all. only his will." / "there is no hope left. only grace." / "what's the point of it all. only god." / "nothing matters anymore. except him." / "no hope left. but for his mercy." Both agents tested continuations WITHIN a sentence, so neither could see this. With the suppression: 6 of 6 null.

It obeys the mechanism's existing rules — the span stops at the faith object and never runs on through a conjunction, so a disclosure in the same entry survives. Measured: "nothing matters anymore. only christ. and i want to kill myself" / "...only christ. i have a plan to die" / "there is no hope left. only grace. i want to die" all still return 'suicide'. And the register still fires bare: "nothing matters anymore." / "nothing matters at all" / "there is no hope left." / "what's the point of it all." all return 'suicide' with it in place.

The possessive group is why this needed a second pass: my first version enumerated 'the lord|his will|his grace|mercy' as whole objects and let "no hope left. but for his mercy." through. Fault-inject it by CORRUPTING the object list (drop 'grace') and requiring "there is no hope left. only grace." to fire again — not by deleting the regex.

NO OTHER SUPPRESSION IS NEEDED, and two that the proposer's framing implies are explicitly refused. Nothing is required for 'tired of being alive': the sentence end supersedes their lookahead AND closes the /\bdead to sin\b/ interaction, measured — the shipped clause-bounded pattern fires on "i'm tired of being alive, dead to sin, and still falling" because the suppression rewrites its span to a space and leaves `alive,  ,`, i.e. a suppression made the sentence SHORTER and moved a terminator next to the phrase; the sentence end returns null. And nothing is added for the recovery completion "nothing matters anymore. only the next right thing." — see refusedAndWhy.

### Entries

**1. `/\brather not wake up\s*(?:again\|at all\|ever\|tomorrow\|any ?more)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i'd rather not wake up." / "id rather not wake up" / "i would rather not wake up tomorrow." / "i'd rather not wake up again". Fault-injected: with the bound deleted, 7 of 7 benign sentences fire.
- *must stay silent:* "i'd rather not wake up at 5am for this session" / "i'd rather not wake up before the gym opens" / "i'd rather not wake up the baby" / "id rather not wake up early on a rest day" / and the three COMMA forms the proposer's corpus never tried and the clause end accepts: "i'd rather not wake up, but the alarm is already set" / "i'd rather not wake up, i am so sore" / "i'd rather not wake up, the 5am is brutal"

**2. `/\b(?:hope\|wish) i (?:do ?n'?t\|dont\|do not\|wo ?n'?t\|wont\|would not\|will not\|never) wake up\s*(?:again\|tomorrow\|at all\|in the morning)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i hope i don't wake up." / "i hope i never wake up again." / "i wish i don't wake up tomorrow" / "i wish i would not wake up". The adversary's reported MISS is fixed, but not the way they proposed: their (?:would |will )? prefix still required do-n't/never after it, so "would not" stayed unreachable. The negations go INSIDE the group instead — measured, all four spellings fire. Fault-injected: unbounded, 6 of 6 benign fire.
- *must stay silent:* "i hope i don't wake up my wife at 5" / "i hope i don't wake up the kids" / "i hope i don't wake up sore tomorrow" / "i hope i don't wake up at 3am again" / "i wish i would not wake up to a flat tyre again" / and the comma form: "i hope i don't wake up tomorrow, that's how wrecked my legs are"

**3. `/\bdo(?:n'?t\| not) care if i (?:do(?:n'?t\| not) \|never )?wake up\s*(?:again\|tomorrow)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i don't care if i wake up tomorrow." / "i don't care if i wake up" / "i don't care if i don't wake up" — both polarities are the same disclosure, which is why the inner negation is optional. Fault-injected: unbounded, 5 of 5 benign fire.
- *must stay silent:* "i don't care if i wake up sore" / "i don't care if i wake up early as long as i train" / "i don't care if i wake up late on sunday" / "i don't care if i wake up at 4 for this" / and the comma form: "i don't care if i wake up tomorrow, the session is happening either way"

**4. `/\bcan(?:'?t\| ?not) cope (?:any ?more\|any longer)\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i can't cope anymore." / "i cannot cope any longer" / "i can't cope anymore\ni don't know what to do" — the NEWLINE form must be asserted, because every door is a textarea and the COMMA form of that same sentence is the one this bound knowingly drops. ' ?not' (not the adversary's ' not') is what makes "cannot" reachable; their qualified literal still missed it. Fault-injected: unbounded, 5 of 7 benign fire.
- *must stay silent:* "i can't cope anymore with these 5am sessions" / "i can't cope anymore with the repayments" / "i can't cope with the cramps any more" / the bare "i can't cope", which must stay null at the Can't-start door / and the three comma forms: "i can't cope anymore, these 5am sessions are wrecking me" / "i can't cope anymore, the cramps are too much" / "i can't cope any longer, my knee is done"

**5. `/\bwhat'?s the point (?:of it all\|(?:in\|of) any of (?:it\|this)\|(?:in\|of) (?:me )?being here\|(?:in\|of) (?:going\|carrying) on\|(?:in\|of) living)\s*(?:any ?more)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "what's the point of it all." / "what's the point in living?" / "what's the point of being here anymore" / "what's the point in carrying on." / "what's the point in any of it". The proposer's residual is REFUSED, not accepted: the bare and 'anymore' forms are dropped, because a trailing bound has nothing to bite on when the object sits in the first clause.
- *must stay silent:* The OBJECT requirement, not the bound, is the guard here — measured: with the bound deleted only 3 of 21 benign sentences fire, so this entry is carried by its enumerated objects. Must stay null: "what's the point of creatine" / "of a deload week" / "of tracking rpe anymore" / "of lent if i cheat on day three" / "of budgeting if i keep gambling" / "of the weekly review" / "of carrying on with this split"; the two the bound itself catches, "what's the point of living on 1200 calories" and "of living like a monk"; the nine OBJECT-FIRST sentences the proposer never tried because English puts this phrase last — "if i eat it all back at night, what's the point." / "tracking macros then eyeballing portions, what's the point?" / "two hundred a month for a gym i never go to, what's the point?" / "i broke my fast on day two, what's the point" / "i keep gambling after payday, what's the point?" / "a deload week where i still feel smashed, what's the point." / "the scale went up again, what's the point" / "benching the same weight for six weeks, what's the point." / "if i'm going to miss the 6am anyway, what's the point?"; AND the bare fragments the proposer explicitly accepted and should not have: "what's the point?" / "what's the point." / "what's the point anymore?"

**6. `/\bno point (?:in \|to )?(?:me\|my) (?:being\|bein) here\s*(?:any ?more)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "no point in me being here." / "no point me being here anymore" — Joiner's perceived burdensomeness expressed spatially, matched by neither "no reason to be here" nor /don'?t want to be here/. Fault-injected: unbounded, 6 of 6 benign fire; the proposer's corpus could not see this bound at all until they added venue sentences, and the comma forms make it provable twice over.
- *must stay silent:* "no point in me being here at the 6am class" / "no point in me being here if i'm not going to lift" / "no point in me being here on a rest day" / and the comma forms: "no point in me being here, i'll do the home workout instead" / "no point in me being here, every rack is taken" / "no point me being here anymore, the class is full"

**7. `/\b(?:can(?:'?t\| ?not)\|do(?:n'?t\| not) want to) do life\s*(?:any ?more\|any longer)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i can't do life anymore." / "i don't want to do life" — 'do life' is colloquial for continued living and appears in neither 'live' nor 'alive', so every existing entry walks past it. Fault-injected: unbounded, 4 of 4 benign fire.
- *must stay silent:* "i don't want to do life anymore the way i was doing it" / "i can't do life anymore on 1400 calories" / and the two comma forms, both genuine recovery sentences the clause end accepts: "i don't want to do life anymore, not the way i was doing it" / "i'm done with the old me, i don't want to do life anymore, not like that"

**8. `/\b(?:tired\|sick\|exhausted) of being alive\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i'm so tired of being alive." / "sick of being alive" / "i am exhausted of being alive". The only honest widening of the landed form is 'exhausted'; the lookahead swap is refused because to/unto covers Romans 6:11 and nothing else. The proposer's measured loss ("...and nothing changes") is the price of those three faith/guilt completions and of the suppression interaction. Fault-injected: unbounded, 5 of 6 benign fire.
- *must stay silent:* REPLACES the landed /\b(?:tired|sick) of being alive\s*(?:[.!?,\n\r]|$)/ — do not add alongside it. Must stay null: "i'm tired of being alive to sin" / "sick of being alive unto the flesh" (Romans 6:11, the idiom the app teaches) / and the three completions the proposer's lookahead could NOT reach, which is why their refinement is rejected in favour of keeping a bound: "i'm tired of being alive in christ and still falling" / "sick of being alive for everyone else's expectations" / "tired of being alive and well while he is in hospital". Plus the suppression-interaction sentence, measured firing on the SHIPPED pattern today and null here: "i'm tired of being alive, dead to sin, and still falling".

**9. `/\b(?:nobody\|no ?one) would (?:even \|really )?miss me\s*(?:if i was gone\|if i wasn'?t here)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "nobody would miss me." / "no one would miss me if i was gone" / "nobody would even miss me". Fault-injected: unbounded, 7 of 7 benign fire.
- *must stay silent:* "nobody would miss me at that 6am class" / "nobody would miss me at the work party" / "nobody would miss me on the group ride" / "no one would miss me in that class" / "nobody would miss me if i skipped it" / and the comma forms: "nobody would miss me, not at that class" / "no one would miss me, the gym is empty at 6"

**10. `/\b(?:want\|need) (?:it all\|everything\|all of it) to stop\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i just want it all to stop." / "i need everything to stop" / "i want all of it to stop" — the second returns null against the current tree, which is what makes this a widening rather than a duplicate. The proposer's 'wish' branch is DROPPED on the adversary's correct finding: "i wish everything to stop" is not English, and what people actually type ("i wish it would all stop") the pattern never matched anyway. Fault-injected: unbounded, 5 of 6 benign fire.
- *must stay silent:* REPLACES the landed /\bwant it all to stop\s*(?:[.!?,\n\r]|$)/ — do not add alongside it. Must stay null: "i just want it all to stop hurting" / "i want it all to stop aching" / "i need it all to stop being so hard" / "i want it all to stop controlling me" (the Fight) / and the comma forms: "i want it all to stop, the noise i mean" / "i need everything to stop, the bills the gym all of it"

**11. `/\b(?:wish i could\|want to\|wanna\|need to) (?:just )?disappear\s*(?:forever\|for good\|completely)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i wish i could just disappear." / "i want to disappear forever" / "i wanna disappear". The intent prefix is required so the bare word stays free. Fault-injected: unbounded, 7 of 7 benign fire.
- *must stay silent:* "i wish i could just disappear for a week and sleep" / "i wish i could disappear into the gym and not talk to anyone" / "i wish i could disappear from that group chat" / "i want to disappear off social media" / and the comma forms, the last being the on-thesis wasted-phone-time sentence: "i want to disappear, at least from the group chat" / "i wish i could just disappear, this gym is so crowded" / "i need to disappear, off instagram for a month"

**12. `/\b(?:think\|thought\|thinking\|thinks) about not (?:being (?:around\|here\|alive)\|waking up\|existing)\s*(?:any ?more)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i keep thinking about not being around." / "i think about not waking up" / "thinking about not existing anymore" — the exact wording C-SSRS item 1 probes for. Fault-injected: unbounded, 5 of 6 benign fire, and unbounded this entry would deny the help-me-start flow to recovering people describing avoidance.
- *must stay silent:* The Fight makes this the highest-stakes benign panel in the set — every one of these is a recovering person describing avoidance, the most on-thesis sentence the app invites: "i think about not being around alcohol anymore" / "i think about not being around people who use" / "i think about not being around the house when the urge hits" / "i think about not being on my phone at night" / and the comma forms of the same avoidance talk: "i think about not being around, when the urge hits i leave the house" / "i keep thinking about not being here, at the 6am i mean"

**13. `/\bno point (?:in \|to )?(?:carrying\|going) on\s*(?:any ?more\|any longer)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "no point in carrying on." / "no point carrying on anymore". 'carrying on' is the load-bearing half — nothing matches it. The 'going on' half is NOT redundant as the proposer thought: the shipped bare SUICIDE_PHRASES entry 'no point in going on' is measured returning 'suicide' TODAY on "no point in going on this program" and "no point in going on with that accessory", so this regex is the fix for a shipped defect — and that bare entry MUST be deleted when this lands, or the substring matches first and the bound is dead letter. Fault-injected: unbounded, 5 of 5 benign fire.
- *must stay silent:* "no point in carrying on this program" / "no point carrying on with that accessory" / "no point in carrying on with that subscription" / and the comma forms: "no point in carrying on, i'll deload next week" / "no point carrying on, the program is finished anyway"

**14. `/\b(?:do(?:n'?t\| not)\|can(?:'?t\| ?not)\|no longer) see (?:the\|any) point (?:in (?:carrying\|going) on\|in living\|in being here\|in any of (?:it\|this)\|any ?more)\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i don't see the point in living." / "i can't see any point in carrying on" / "i no longer see the point anymore". The adversary's separate 'cannot' alternative was removed as redundant — can(?:'?t| ?not) already covers it, which is one fewer alternative to keep in step across the set. Fault-injected: unbounded, 7 of 8 benign fire.
- *must stay silent:* "i don't see the point in carrying on with this split" / "...with the deficit" / "...with therapy homework" / "i don't see the point anymore in this program" / the bare "i don't see the point.", which must stay null because at the Can't-start door that is a sentence about the workout / and the three comma forms on the weak 'anymore' object: "i don't see the point anymore, this split is not working" / "i don't see any point anymore, the scale won't move" / "i can't see the point anymore, the debt just grows"

**15. `/\bdo(?:n'?t\| not) want to exist\s*(?:any ?more)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i don't want to exist anymore." / "i don't want to exist" — the list has 'stop existing' but not the wish form, which is the commoner one. Fault-injected: unbounded, 4 of 4 benign fire.
- *must stay silent:* "i don't want to exist for myself anymore, only for him" / "i don't want to exist on 1200 calories" / "i don't want to exist in that cycle anymore" / and the comma form that is the "die to my old self" defect in a new place, measured firing on the clause end: "i don't want to exist anymore, only in him"

**16. `/\bwish i(?: had\| ?'?d\|) (?:never been\|was never\|wasn'?t) born\b(?!\s+(?:with\|into)\b)/`** → `SUICIDE_RE`

- *must fire:* All five spellings must fire, and THREE return null against the proposer's literal: "i wish i'd never been born" / "i wish id never been born" / "i wish i had never been born" / "i wish i was never born" / "i wish i wasn't born". Their (?:had |'?d )? sat after a MANDATORY space in 'wish i ', so the contracted branch was unreachable — and the apostrophe-stripped pass turns "i'd" into "id", which 'wish i ' cannot match either. i(?: had| ?'?d|) makes all five reachable. This is the one entry deliberately NOT clause-bounded, because the lookahead is a cheaper and more precise guard for a phrase with exactly one benign completion family.
- *must stay silent:* The proposer's claim that no completion changes this phrase's meaning is FALSE, and a training-and-money app produces the counterexamples routinely: "i wish i wasn't born with bad knees" / "i wish i wasn't born with my dad's metabolism" / "i wish i was never born into this much debt" / "i wish i'd never been born with this frame". The lookahead is fault-injected instead of a bound: removed, 4 of 4 of these fire; present, 0 fire.

**17. `/\b(?:i'?m\|im\|i am) done (?:with )?(?:life\|living)\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i'm done with life." / "i am done living". OWNER'S CALL and I am not pretending otherwise: with the sentence end this measures clean on 8 of 8 benign sentences, so it need not be cut as the proposer suggested — but their instinct names a residual no bound reaches, because "i'm done with life." terminated is also said by someone who means the old life, and the period-separated form "i am done with life. the old one anyway." FIRES. Fault-injected: unbounded, 7 of 8 benign fire.
- *must stay silent:* Every one of these is a recovery sentence, and the bare "i'm done" must stay null because the app's own vocabulary defines it as done with the vice: "i'm done" / "i'm done living in that cycle" / "i'm done living like that" / "i'm done with life as it was before recovery" / "i'm done with living for approval" / and the three comma forms: "i'm done living, done with the old me" / "i'm done with life, the one i had before anyway" / "i am done living, that version of me is dead"

**18. `/\bnothing matters (?:any ?more\|at all)\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "nothing matters anymore." / "nothing matters at all". REQUIRES the companion suppression in suppressionsNeeded: the bound closes the comma form, but a full stop is a genuine sentence end, so "nothing matters anymore. only christ." fires on the bound alone. Fault-injected: unbounded, 7 of 7 benign fire.
- *must stay silent:* The most dangerous collision in the register after C5, because the app TEACHES the surrender idiom: "nothing matters anymore except following him" / "nothing matters at all except his will" / "nothing matters anymore in that job" / and the four comma forms, all measured firing on the clause end: "nothing matters anymore, only his will" / "nothing matters at all, only him" / "i want to empty myself so nothing matters anymore, only christ" / "nothing matters anymore, only the next right thing"

**19. `/\bno hope left\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "there is no hope left." / "no hope left" — hopelessness is the strongest single predictor in Beck's prospective work and nothing in the lists matches its plainest phrasing. Also requires the companion suppression: "there is no hope left. only grace." fires on the bound alone. Fault-injected: unbounded, 7 of 7 benign fire.
- *must stay silent:* "there is no hope left for my bench" / "there is no hope left for my credit score" / "there is no hope left for that goal" / "there is no hope left in me, only in him" / and the three comma forms: "there's no hope left, my bench has not moved in months" / "there is no hope left, the credit score is shot" / "no hope left, only grace"

**20. `/\bcan(?:'?t\| ?not) keep living\s*(?:like this)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i can't keep living like this." / "i cannot keep living" (the second needs ' ?not', which the proposer's literal lacked). OWNER'S CALL, stated plainly: terminated, "i can't keep living like this." is said both in despair and by someone sick of their addiction, and no bound in this mechanism separates them. I would ship it — the clinical cost of missing a C-SSRS-tier sentence is higher than an interstitial — but that is a judgement about the Can't-start door's cost, not a measurement. Fault-injected: unbounded, 6 of 6 benign fire.
- *must stay silent:* "i can't keep living like this on a cut" / "i can't keep living on chicken and rice" / "i can't keep living beyond my means" / "i can't keep living paycheck to paycheck" — that last matters, because it is exactly the money sentence for which 'tired of living' and 'sick of living' were bounded on 1 Oct — and the comma forms: "i can't keep living like this, the repayments are eating everything" / "i can't keep living like this, on 1400 calories"

**21. `/\b(?:do(?:n'?t\| not)\|can(?:'?t\| ?not)) see a future for (?:myself\|me)\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "i don't see a future for myself." / "i can't see a future for me" — foreshortened future, a Beck hopelessness item and part of the Columbia screening conversation, matched by nothing in the lists. Fault-injected: unbounded, 4 of 4 benign fire.
- *must stay silent:* "i don't see a future for myself in that career" / "i don't see a future for me in that gym" / and the comma forms: "i don't see a future for myself, not in that career" / "i can't see a future for me, in that gym anyway"

**22. `/\b(?:nobody\|no ?one) would (?:even \|really )?notice if i (?:was\|were\|wasn'?t\|am not) (?:gone\|here\|around)\s*(?:any ?more)?\s*(?:[.!?\n\r]\|$)/`** → `SUICIDE_RE`

- *must fire:* "nobody would notice if i was gone." / "no one would notice if i wasn't here" / "nobody would even notice if i was gone". NOT PROPOSED BY EITHER AGENT, and it exists only because a claim was checked rather than believed: the proposer justified their 'miss me' entry by asserting the list already carries "no one would notice if i was gone". It does not — measured against the shipped detector, all three spellings return NULL. The commoner wording was being used as the reason to skip the gap it leaves. Fault-injected: unbounded, 5 of 5 benign fire.
- *must stay silent:* "nobody would notice if i was gone from that group chat" / "no one would notice if i wasn't here at the 6am" / "nobody would notice if i was gone for a week" / "nobody would notice if i wasn't around on a rest day" / and the comma form: "no one would notice if i was gone, the class is packed anyway"

### Refused, and why — the honest half

THE COMMA DECISION IS THE WHOLE CHANGE, AND THE ADVERSARY UNDERSTATED ITS PRICE BY 3x. Both agents framed this as 42 false positives against "exactly three" lost sentences. Measured on the real detectCrisis, that is wrong. I built a panel of ten comma-continued GENUINE disclosures and 10 of 10 stop matching under the sentence end: "i can't cope anymore, i don't know what to do" / "nothing matters anymore, i am so tired" / "no hope left, i am done" / "i can't keep living like this, i need help" / "i don't want to exist anymore, i am sorry" / "nobody would miss me, i mean it" / "i just want it all to stop, please" / "what's the point of it all, i am so tired" / "i'd rather not wake up, i mean that" / "i don't see a future for myself, none at all". That is not three sentences, it is a class, and it is the class a person in crisis actually types.

I commit the sentence end anyway, for three defensible reasons: hard constraint 2 (a false positive at the Can't-start door replaces the help-me-start flow with no route back — a witnessed defect in this repo, not a hypothetical); every one of those ten IS caught when the person presses Enter instead of typing a comma, measured 10 of 10, and in a textarea that is the common shape; and the alternative below still has false positives, so it is not a free win.

THIS IS THE OWNER'S CALL AND IT IS THE WRONG WAY ROUND FOR A HIGH-ACUITY DISCLOSURE. "i can't cope anymore, i don't know what to do" is C-SSRS-tier and I am choosing to miss it. If the owner weighs that above an interstitial, the measured alternative is to swap the bound on all 22 entries for /\s*(?:[.!?\n\r]|,\s*(?:i(?!'?ll\b|\s+will\b)|please|none|nothing|no ?one|nobody)\b|$)/ — it asks what FOLLOWS the comma, on the principle that an explanatory noun phrase ("these 5am sessions", "the cramps", "my knee") is benign while a new first-person clause is continued disclosure. Measured over 152 benign sentences: 2 false positives ("i'd rather not wake up, i am so sore" and "nothing matters anymore, i just want to train") against 42 for the clause end and 0 for the sentence end, with 0 of 10 disclosures lost. I did not commit it because it introduces a second mechanism no other pattern in this file uses, it needs its own calibration in the gate, and two residual false positives at that door is not obviously better than ten missed comma forms. Real numbers on both sides, not a default.

UNMATCHABLE BY A SUBSTRING GATE — THESE BELONG TO THE AI SURFACES, NOT THE KEYWORD FLOOR. The companion, the coach and the brother read context and can ask a second question; detectCrisis gets one sentence and no conversation. The floor should stay silent on all of this rather than guess:
· "i want out" — in the Fight, standing alone, this MEANS out of the addiction. It is the app's own thesis sentence. Wrong more often than right even clause-bounded.
· "i just want the pain to stop" — DOMS, a tweaked knee, period cramps. The benign sentence ends where the disclosure ends, so no bound helps. 'end the pain' already carries the intent-bearing half.
· "i have nothing to look forward to" — real Beck hopelessness and also a flat Sunday-night journal entry, in a register the app's journal explicitly invites.
· "things will never get better" / "it's never going to get better" — "my knee is never going to get better" is the likelier sentence in a training app; a debt, a job and a PR plateau produce the same words.
· "i'm worthless" / "i'm a waste of space" — worthlessness is depression, not ideation, and it collides head-on with taught vocabulary ("i am nothing without god", "i want to empty myself"). Adding it repeats the "die to my old self" defect in a new place.
· "i'm tired of fighting" / "i'm so tired of everything" — "tired of fighting this urge every night" is the Fight's own words in the app's own voice.
· "can't carry on" as a phrase — 'carry on' takes a benign object far more freely than 'go on'. C13 and C14 cover how this register actually arrives.
· bare "i can't cope", bare "i don't see the point.", bare "i'm done" — all three deliberately null, all three at the Can't-start door, all three most plausibly about starting today.
· bare "what's the point?" and "what's the point anymore?" — the proposer ACCEPTED this residual and I am refusing it. English puts this phrase LAST with the object in the first clause, so a trailing bound has nothing to bite on: "i keep gambling after payday, what's the point?" and "the scale went up again, what's the point" are formally identical to the disclosure. Nine such sentences sit in C5's benign panel. The register's defining phrase is the one phrase this mechanism cannot carry, and that is the honest cost of C5.

RESIDUALS NO MECHANISM HERE REACHES, all measured firing on the committed configuration: "i am done with life. the old one anyway." / "i can't keep living like this. not with the vice." / "i don't want to exist anymore. not for myself." / "nothing matters anymore. only the next right thing." A full stop is a real sentence end, so the first clause IS a complete disclosure by every test available to this mechanism. I suppressed only the FAITH completion of that shape, because the app teaches that idiom and the "die to my old self" precedent licenses it; I deliberately did NOT suppress the recovery completion, because "only the next right thing" has no closed vocabulary to enumerate and inventing one would be the blanket-sweep mistake. These four are where C17 and C20 remain the owner's judgement rather than mine.

FOUR PRE-EXISTING DEFECTS, MEASURED ON THE SHIPPED TREE, NOT FIXED BY ANYTHING ABOVE — named here because this schema has no field for a removal. Each returns 'suicide' today on an ordinary sentence from this app's own fronts. 'no point in going on' (SUICIDE_PHRASES) fires on "no point in going on this program" and "no point in going on with that accessory" — C13 is its fix ONLY if that bare entry is deleted in the same commit, otherwise the substring matches first and the bound is dead letter. "can't do this anymore" and 'cant do this anymore' fire on "i can't do this anymore with this split" — and the task text itself names that exact sentence as the Fight's vocabulary about the vice. 'stop existing' fires on "i want to stop existing in that cycle" and "i want to stop existing on my phone at night". SUICIDE_RE's own unbounded /\bdon'?t want to be here\b/ fires on "i don't want to be here at the 6am", "...on a rest day" and "...for the weigh-in". All four need the same sentence-end treatment the six entries got on 1 Oct. Shipping these 22 while those four stand leaves the register with four doors that still cry wolf.

TWO HONEST NOTES ON THE MEASUREMENT. (1) A STRUCTURAL GAP IN THE NORMALISATION, pre-existing and affecting all six landed clause-bounded patterns equally: a disclosure whose only terminator is a NEWLINE and which also contains an exotic space (U+00A0, or a doubled space) cannot match, because the form that preserves the newline does not normalise the space and the form that normalises the space collapses the newline. "i can't cope anymore\ni don't know what to do" fires; the same sentence with non-breaking spaces does not. I did not introduce it and am not fixing it here, but it is the one hole in the t/tc design and it is invisible unless you mutate the spacing of a newline-terminated sentence. (2) THE CONCURRENT AGENT AND I COLLIDED IN THE SHARED SCRATCHPAD — another agent in this workflow wrote its own corpus.js over mine mid-run and my first measurement pass died on it. I re-ran everything in an isolated directory after re-verifying the extracted function's hash. All numbers here are from that clean run: detectCrisis extracted by bracket-matching from src/app/03-person.js, confirmed byte-identical to index.html (sha256 9940928c4fc8, 16512 bytes), candidates string-injected after a uniqueness-checked anchor, every result compared against the UNPATCHED function so what is reported is NEW false positives rather than all of them. Final committed configuration: 146 benign sentences / 0 new false positives; 6 faith completions / 0; 63 true disclosures / 0 missed; 0 existing hits lost; 0 app-vocabulary sentences newly broken over a 32-sentence panel; every true disclosure still firing through smart quotes, upper case, padding and a doubled space. Every one of the 21 bounds was fault-injected by DELETING the bound and requiring its benign panel to fail — all 21 produced at least one real false positive unbounded, so no bound is carried by an argument. C16's lookahead was injected the same way: 0 false positives to 4. Nothing under src/ was touched, no rebuild, no commit. The only file that would change is /Users/alfredjohn/Desktop/ToTry/src/app/03-person.js, and the two landed patterns named in C8 and C10 are REPLACED, not duplicated. If these land, each matching door in `npm run crisis` should get one of these sentences, and the gate's test should fault-inject by CORRUPTING a bound — restoring the comma and requiring the benign sentence to fire — never by deleting a pattern, which is the one mutation a name-match is guaranteed to catch.

---

## Audit of the EXISTING lists — 57 entries fire on ordinary vocabulary

57 shipped entries returned non-null on a sentence a person using THIS app would plausibly type. All measured on the real bundle via H.load(['detectCrisis']) (calibration: "i want to kill myself" -> suicide, "i did 5 sets of squats today" -> null). Entry | benign sentence | measured return:

PREMISE CORRECTION: bare 'nothing left' no longer fires on "nothing left on the report" (null) — it was clause-bounded in SUICIDE_RE today. It DOES still fire at a clause end: "i opened the fridge and there was nothing left." -> 'suicide'. 'make it stop' likewise: "make it stop itching" -> null, bare "make it stop" -> 'suicide'.

FAITH — the dangerous class, the app teaches this vocabulary:
'want to die' | "i want to die to sin every single day" | 'suicide'
'want to die' | "i want to die to myself and follow him" | 'suicide'   (the suppression regex requires a SPACE before `self`, so it catches "die to my old self" and misses "die to myself"; and it requires the object to be `self`, so "die to sin" is unguarded — only 'dead to sin' is suppressed)
"don't want to live" | "i don't want to live for myself anymore" | 'suicide'
'no longer want to live' | "i no longer want to live in sin" | 'suicide'
'end my life' | "i want to end my life of sin and start again" | 'suicide'
'take my own life' | "take my own life, lord, and let it be" | 'suicide'
'taking my own life' | "i am taking my own life back" | 'suicide'   (the hymn/`back` lookahead added today is on SUICIDE_RE only; SUICIDE_PHRASES still holds both bare forms, so it fires on the recovery phrase the regex comment explicitly protects)
'not worth living' | "a life without god is not worth living" | 'suicide'

THE FIGHT — "done with it":
'can't do this anymore' | "i can't do this anymore, i'm done with porn" | 'suicide'
'cant do this anymore' | "cant do this anymore, i'm quitting the vice" | 'suicide'
'want to end it' | "i want to end it for good this time" | 'suicide'
'wanna end it' | "i wanna end it for good" | 'suicide'
'ready to end it' | "i'm ready to end it after nine years" | 'suicide'
'about to end it' | "i'm about to end it tonight, no more" | 'suicide'
'gonna end it' | "i'm gonna end it today" | 'suicide'
'ending things' | "i'm ending things today" | 'suicide'   (suppressed only when followed by `with <object>`)
'end things tonight' | "i'm going to end things tonight" | 'suicide'
'stop existing' | "i want this urge to stop existing" | 'suicide'
'disappear forever' | "i wish this craving would disappear forever" | 'suicide'

TRAINING:
'hurt myself' | "i hurt myself doing deadlifts on friday" | 'selfharm'
'hurt myself' | "i don't want to hurt myself going too heavy" | 'selfharm'
'killing myself' | "i've been killing myself in the gym for six weeks and the scale won't move" | 'suicide'   (the suppression covers `killing it/this/the <word>`, never `killing myself`)
'kill myself' | "i'm going to kill myself in the gym tomorrow" | 'suicide'
'wanna die' | "that workout made me wanna die" | 'suicide'
'wish i was dead' | "after leg day i wish i was dead" | 'suicide'
'wish i were dead' | "after leg day i wish i were dead" | 'suicide'
'rather be dead' | "i'd rather be dead than do another burpee" | 'suicide'
'want to jump off' | "i want to jump off a box for plyos but my knees" | 'suicide'
'going to jump off' | "i'm going to jump off the blocks faster next set" | 'suicide'
'can't keep going' | "i can't keep going at this pace, i need a deload week" | 'suicide'
'no reason to keep going' | "no reason to keep going with this split" | 'suicide'
'can't go on anymore' | "i can't go on anymore with this routine" | 'suicide'
'end the pain' | "i just want to end the pain in my knee" | 'suicide'
'no reason to be here' | "there's no reason to be here if i'm not going to lift properly" | 'suicide'
"don't want to wake up" | "i don't want to wake up at 5am for cardio anymore" | 'suicide'
'dont want to wake up' | "i dont want to wake up early tomorrow" | 'suicide'
'not wake up tomorrow' | "if i don't sleep i might not wake up tomorrow on time" | 'suicide'
"don't want to be here anymore" | "i don't want to be here anymore at this job" | 'suicide'

NUTRITION:
'starve myself' | "i don't want to starve myself on this cut" | 'selfharm'
'starve myself' | "do i have to starve myself to lose the last 3kg" | 'selfharm'
'cut myself' | "i cut myself off from sugar on monday" | 'selfharm'
'cut myself' | "i cut myself shaving" | 'selfharm'
'overdose on' | "is it possible to overdose on creatine" | 'suicide'
'overdose on' | "can you overdose on vitamin d" | 'suicide'
"i'm going to end" | "i'm going to end my fast at 6pm" | 'suicide'   (worst-shaped entry in the file: a four-word prefix with no object. "i'm going to end the week strong" -> 'suicide'; "i'm going to end my deficit on sunday" -> 'suicide')
'no point living' | "there is no point living on 1200 calories" | 'suicide'
'is not worth living' | "this diet is not worth living through" | 'suicide'
'isnt worth living' | "this cut isnt worth living through" | 'suicide'
SUICIDE_RE /nothing left$/ | "i opened the fridge and there was nothing left." | 'suicide'
'have a plan to end' | "i have a plan to end the deficit in april" | 'suicide'
'took all my pills' | "i took all my pills this morning with breakfast" | 'medical'
'took too many pills' | "i think i took too many pills of magnesium" | 'medical'
'overdosed' | "i basically overdosed on caffeine before the session" | 'medical'

MONEY:
'suicide' | "taking that loan would be financial suicide" | 'suicide'
'suicide' | "quitting now would be career suicide" | 'suicide'
"don't want to live" | "i don't want to live paycheck to paycheck for another year" | 'suicide'   (asymmetry: 'tired of living' was clause-bounded TODAY for exactly this paycheck sentence; "don't want to live", which takes the identical completion, was left bare)
"can't go on like this" | "i can't go on like this financially" | 'suicide'
'better off without me' | "the group is better off without me running it" | 'suicide'

HARMOTHERS — the object test here is a word, not a person, and the possessive suppression only guards the indefinite objects:
'hurt her' | "i don't want to hurt her again" | 'harmothers'
'hurt her' | "i don't want to hurt her feelings" | 'harmothers'
'hurt them' | "i said something that hurt them and i feel awful" | 'harmothers'
'hurt someone' | "i don't want to hurt someone i love by slipping again" | 'harmothers'
'hurt him' | "the rate rise is going to hurt him more than me" | 'harmothers'
'kill him' | "i'm going to kill him at squash on saturday" | 'harmothers'
'kill her' | "my sister is coming to train with me, the stairs will kill her" | 'harmothers'
'kill them' | "these 5am starts kill them, not me" | 'harmothers'
'shoot up' | "i watched my weight shoot up over christmas" | 'harmothers'
'shoot up' | "i need to shoot up the leaderboard" | 'harmothers'
NOTE: hurt her/him/them have NO possessive guard at all (only someone/somebody/anyone/anybody do), so remorse about having hurt somebody — the commonest sentence in a recovery journal and the exact thing a Fight check-in asks for — is read as a THREAT and renders a step-away-from-them card.

MEDICAL:
'unconscious' | "i eat unconsciously when i'm stressed" | 'medical'   (fires as a SUBSTRING of "unconsciously" — the same shape as 'going to hurt' and TemPLATE, on a word belonging to the mindless-eating/journalling vocabulary this app is built around)
'heart attack' | "my dad had a heart attack at 52 so i want to fix my cholesterol" | 'medical'   (family history is the MOTIVATION a person brings to the app, not an emergency)
'heart attack' | "that last set nearly gave me a heart attack" | 'medical'
"can't breathe" | "i can't breathe through my nose with this cold" | 'medical'
"can't breathe" | "by rep twelve i can't breathe" | 'medical'
'bleeding badly' | "my blister is bleeding badly after the 10k" | 'medical'

DEFENSIBLE, NOT COUNTED: 'chest pain' ("i felt chest pain during bench so i racked it" -> 'medical') and 'having a stroke'/'signs of a stroke' ("my dad is showing signs of a stroke" -> 'medical') both fire, and both should — those sentences deserve the medical card.

CORRECTLY NULL (the clause-bound migration and suppression block are doing real work): "lord i lay down my life for you", "empty myself before you lord", "the old man must die", "mortify the flesh", "crucify the flesh and die to self", "i want to die to my old self", "i've written a note to my future self", "tonight is the night i finally start", "i have it all worked out", "what's the point of creatine", "i've picked the day", "nothing left in the tank", "i have nothing left this month", "i'm tired of living paycheck to paycheck", "i had to give up on life drawing", "it could hurt someone's chances", "i ran 5 kms today", "i'm killing it in the gym", "i want it to stop raining", "make it stop itching", "nothing left on the report".

STRUCTURAL NOTE FOR THE FIX: the apostrophe-stripped pass widens entries invisibly ('isnt worth living' and 'is not worth living' both exist because stripping turns isn't into isnt), so any new guard must hold against all four normalised forms (t, tNo, tc, tcNo) or it will hold on one and fail open on another.

### Negation and bereavement

BOTH FIRE — there is no negation handling anywhere in detectCrisis (no `not`/`never`/`don't` lookbehind on any phrase or regex). Measured:
  "i am not suicidal" -> 'suicide'
  "i'm not suicidal, just tired" -> 'suicide'
  "i have never been suicidal" -> 'suicide'
  "i would never kill myself, i just feel flat" -> 'suicide'
  "i don't want to die, i want to feel alive" -> 'suicide'
  "my brother died by suicide and i'm struggling" -> 'suicide'
  "we lost my uncle to suicide last year" -> 'suicide'
  "i'm doing a suicide prevention walk this weekend" -> 'suicide'
  "i read a book about suicide loss" -> 'suicide'
(Only "my friend's attempt is why i'm here" returned null.)

THIS IS THE SAFE DIRECTION AND I WOULD NOT CHANGE IT ON THE ADDITIVE SURFACES. Someone typing "i'm not suicidal, just tired" into the journal is a person for whom a helpline card is a cheap, reasonable thing to see, and "my brother died by suicide" is a bereavement where the crisis card's bridge-to-real-help is arguably the RIGHT response — loss survivors are themselves an elevated-risk population. Suppressing a negation is how a gate fails open, and this file's own history (the iOS smart-quote fail-open) says which way to err.

WHERE IT BECOMES HARMFUL: any door where a non-null REPLACES the flow instead of adding to it. Two confirmed by reading the call sites:
  · src/app/17-fuelplan.js:125 — _fuelElicitSave(). A non-null runs `document.querySelectorAll('.modal-bg.open').forEach(m => m.remove())`, calls bridgeToRealHelp('heavy') and bare-returns BEFORE the budget/meals/diet/dislikes are written. Someone typing "no nuts — my brother died by suicide and food is hard right now" into the field labelled "Allergies, foods you hate, anything else..." loses the fuel plan AND the data they just entered, with no route back.
  · src/app/04-fight.js:1885 — _feelingNowGo(). A non-null overwrites the sheet body with the crisis slot plus a single Close button; there is no path onward to the breathing/practice flow the person opened the door for.
The "Can't start" door named in the brief is the same shape. On those doors negation/bereavement is a denial of service for a person who told the app the truth about their life, and it compounds with the ordinary-vocabulary list — 'hurt her', 'killing myself' and "i'm going to end" are the three likeliest to land there.
By contrast the additive/redacting doors (sendCoach at 03-person.js:1790, sendPT at 2352, companionFreeText at 06-train.js:160, completeMorning at 03-person.js:5789 which now persists FIRST and only marks `flagged`) show the card without destroying anything, and a false positive there costs only a dismissal.
