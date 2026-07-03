// Scripture by feeling — a curated subset of the founder's own thematic library (ported verbatim to
// preserve his grace-first voice). Offline + instant: a fitting verse for whatever a person walks in
// carrying. The full PWA library is 290 across 25 themes; this covers the core emotional range and
// grows over time. Shape matches the PWA: { reference, verse, reflection }.

export type Verse = { reference: string; verse: string; reflection: string };
export type VerseTheme =
  | 'anxiety'
  | 'courage'
  | 'heartbroken'
  | 'lonely'
  | 'shame'
  | 'depression'
  | 'purity'
  | 'strength'
  | 'identity'
  | 'forgiveness';

// What the chips say — plain words for how a person actually arrives.
export const THEME_LABEL: Record<VerseTheme, string> = {
  anxiety: 'Anxious',
  courage: 'Afraid',
  heartbroken: 'Heartbroken',
  lonely: 'Lonely',
  shame: 'Ashamed',
  depression: 'Heavy',
  purity: 'Tempted',
  strength: 'Weary',
  identity: 'Lost',
  forgiveness: 'Guilty',
};

export const THEME_ORDER: VerseTheme[] = [
  'anxiety', 'courage', 'heartbroken', 'lonely', 'shame', 'depression', 'purity', 'strength', 'identity', 'forgiveness',
];

export const VERSES: Record<VerseTheme, Verse[]> = {
  anxiety: [
    { reference: 'Philippians 4:6-7 (ESV)', verse: 'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.', reflection: 'The antidote to anxiety is not willpower — it is prayer. And the peace that follows defies rational explanation.' },
    { reference: '1 Peter 5:7 (ESV)', verse: 'Casting all your anxieties on him, because he cares for you.', reflection: 'Not some of your anxieties — all of them. And the reason given is simple: he cares for you.' },
    { reference: 'Matthew 6:34 (ESV)', verse: 'Therefore do not be anxious about tomorrow, for tomorrow will be anxious for itself. Sufficient for the day is its own trouble.', reflection: 'You only have grace for today. Tomorrow’s weight isn’t yours to carry yet.' },
    { reference: 'Matthew 11:28-29 (ESV)', verse: 'Come to me, all who labor and are heavy laden, and I will give you rest. Take my yoke upon you, and learn from me, for I am gentle and lowly in heart.', reflection: 'The invitation is for the overwhelmed specifically. Come tired, come anxious — rest is what is offered.' },
  ],
  courage: [
    { reference: 'Joshua 1:9 (ESV)', verse: 'Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.', reflection: 'Courage is not the absence of fear. It is choosing to act knowing God is with you.' },
    { reference: '2 Timothy 1:7 (ESV)', verse: 'For God gave us a spirit not of fear but of power and love and self-control.', reflection: 'The fear you feel is not from God. He gave you something else entirely.' },
    { reference: 'Isaiah 41:10 (ESV)', verse: 'Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you.', reflection: 'God’s presence is the answer to fear — not pep talks, not strategy, just Him.' },
    { reference: 'Psalm 27:1 (ESV)', verse: 'The Lord is my light and my salvation; whom shall I fear?', reflection: 'When you remember Who is for you, the question of who is against you matters less.' },
  ],
  heartbroken: [
    { reference: 'Psalm 34:18 (ESV)', verse: 'The Lord is near to the brokenhearted and saves the crushed in spirit.', reflection: 'When your heart is in pieces, you are not further from God — you are nearer to Him.' },
    { reference: 'Psalm 147:3 (ESV)', verse: 'He heals the brokenhearted and binds up their wounds.', reflection: 'God does not minimize what broke you. He treats it like a wound that needs binding.' },
    { reference: 'Revelation 21:4 (ESV)', verse: 'He will wipe away every tear from their eyes, and death shall be no more, neither shall there be mourning, nor crying, nor pain anymore.', reflection: 'The final word over your pain is its end, by God’s own hand.' },
    { reference: 'Psalm 56:8 (ESV)', verse: 'You have kept count of my tossings; put my tears in your bottle. Are they not in your book?', reflection: 'Not one of your tears has gone unnoticed. He keeps them like they matter — because you do.' },
  ],
  lonely: [
    { reference: 'Deuteronomy 31:8 (ESV)', verse: 'It is the Lord who goes before you. He will be with you; he will not leave you or forsake you. Do not fear or be dismayed.', reflection: 'You are never alone, even when it feels like you have been abandoned by everyone else.' },
    { reference: 'Hebrews 13:5 (ESV)', verse: 'I will never leave you nor forsake you.', reflection: 'Six words that God never takes back.' },
    { reference: 'Matthew 28:20 (ESV)', verse: 'And behold, I am with you always, to the end of the age.', reflection: 'The very last thing Jesus said was a promise against loneliness: always. To the end.' },
    { reference: 'Isaiah 43:1 (ESV)', verse: 'Fear not, for I have redeemed you; I have called you by name, you are mine.', reflection: 'He knows your name — not the crowd’s, yours. In the ache of feeling unseen, you are seen and claimed.' },
  ],
  shame: [
    { reference: 'Romans 8:1 (ESV)', verse: 'There is therefore now no condemnation for those who are in Christ Jesus.', reflection: 'Whatever you have done, this is the ground truth. No condemnation. Full stop.' },
    { reference: 'Zephaniah 3:17 (ESV)', verse: 'The Lord your God is in your midst, a mighty one who will save; he will rejoice over you with gladness; he will quiet you by his love.', reflection: 'God does not look at you in disgust. He sings over you.' },
    { reference: 'Isaiah 1:18 (ESV)', verse: 'Come now, let us reason together, says the Lord: though your sins are like scarlet, they shall be as white as snow; though they are red like crimson, they shall become like wool.', reflection: 'The deepest stain you are carrying, he calls washable. Scarlet to snow — that is his specialty.' },
    { reference: 'Psalm 32:5 (ESV)', verse: 'I acknowledged my sin to you, and I did not cover my iniquity; I said, I will confess my transgressions to the Lord, and you forgave the iniquity of my sin.', reflection: 'Shame says hide it. Grace says name it — and the moment you do, it is already forgiven.' },
  ],
  depression: [
    { reference: 'Psalm 42:11 (ESV)', verse: 'Why are you cast down, O my soul, and why are you in turmoil within me? Hope in God; for I shall again praise him, my salvation and my God.', reflection: 'The Psalmist is speaking to his own depression — arguing with it. You can do this too.' },
    { reference: 'Lamentations 3:22-23 (ESV)', verse: 'The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.', reflection: 'Written in the middle of complete devastation. New mercy. Every morning. Including tomorrow.' },
    { reference: 'Psalm 30:5 (ESV)', verse: 'Weeping may tarry for the night, but joy comes with the morning.', reflection: 'This darkness is not permanent. Morning comes.' },
    { reference: 'Romans 8:38-39 (ESV)', verse: 'For I am sure that neither death nor life, nor things present nor things to come, nor powers, nor height nor depth, nor anything else in all creation, will be able to separate us from the love of God in Christ Jesus our Lord.', reflection: 'Nothing — not even this darkness — can separate you from being loved.' },
  ],
  purity: [
    { reference: '1 Corinthians 6:18-19 (ESV)', verse: 'Flee from sexual immorality. Do you not know that your body is a temple of the Holy Spirit within you?', reflection: 'Fleeing is not weakness — it is the wise move. Your body is not disposable; it is a dwelling place.' },
    { reference: '2 Timothy 2:22 (ESV)', verse: 'So flee youthful passions and pursue righteousness, faith, love, and peace, along with those who call on the Lord from a pure heart.', reflection: 'Fleeing is only half — pursue something. Fill the space with something real.' },
    { reference: 'Romans 13:14 (ESV)', verse: 'But put on the Lord Jesus Christ, and make no provision for the flesh, to gratify its desires.', reflection: 'Do not give yourself an on-ramp to temptation. Remove the provision.' },
    { reference: 'Galatians 5:16 (ESV)', verse: 'But I say, walk by the Spirit, and you will not gratify the desires of the flesh.', reflection: 'The win is not only fighting the flesh head-on — it is walking so close to the Spirit there is no room left for it.' },
  ],
  strength: [
    { reference: 'Isaiah 40:31 (ESV)', verse: 'But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.', reflection: 'Renewed strength comes from waiting on him, not grinding harder. The tired get carried.' },
    { reference: 'Philippians 4:13 (ESV)', verse: 'I can do all things through him who strengthens me.', reflection: 'The strength was never meant to be yours alone. It is his, running through you — that is why it does not run out.' },
    { reference: '2 Corinthians 12:9 (ESV)', verse: 'But he said to me, My grace is sufficient for you, for my power is made perfect in weakness.', reflection: 'Your weakness is not disqualifying — it is the doorway. Where you run out is exactly where his power shows up.' },
    { reference: 'Isaiah 40:29 (ESV)', verse: 'He gives power to the faint, and to him who has no might he increases strength.', reflection: 'This promise is aimed straight at the empty. Being out of strength is the qualification, not the disqualifier.' },
  ],
  identity: [
    { reference: 'Psalm 139:14 (ESV)', verse: 'I praise you, for I am fearfully and wonderfully made. Wonderful are your works; my soul knows it very well.', reflection: 'You were not made by accident or as an afterthought. The God of the universe made you with intention.' },
    { reference: 'Ephesians 2:10 (ESV)', verse: 'For we are his workmanship, created in Christ Jesus for good works, which God prepared beforehand, that we should walk in them.', reflection: 'You are not a mistake trying to find a purpose — you are a purpose already prepared.' },
    { reference: '1 Peter 2:9 (ESV)', verse: 'But you are a chosen race, a royal priesthood, a holy nation, a people for his own possession.', reflection: 'This is what you are. Not what you are trying to become — what you already are.' },
    { reference: '1 John 3:1 (ESV)', verse: 'See what kind of love the Father has given to us, that we should be called children of God; and so we are.', reflection: 'And so we are. Not aspiring to be, not maybe — it is already settled. You are his.' },
  ],
  forgiveness: [
    { reference: '1 John 1:9 (ESV)', verse: 'If we confess our sins, he is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.', reflection: 'Confess it — name it specifically — and the cleansing is as complete as the sin was real.' },
    { reference: 'Psalm 103:12 (ESV)', verse: 'As far as the east is from the west, so far does he remove our transgressions from us.', reflection: 'East and west never meet. That is how far your sin goes when God removes it.' },
    { reference: 'Luke 15:20 (ESV)', verse: 'And he arose and came to his father. But while he was still a long way off, his father saw him and felt compassion, and ran and embraced him and kissed him.', reflection: 'The father runs. Not waits. Runs. That is how God responds when you turn back.' },
    { reference: 'Colossians 2:13-14 (ESV)', verse: 'And you, who were dead in your trespasses, God made alive together with him, having forgiven us all our trespasses, by canceling the record of debt that stood against us.', reflection: 'The record against you was not just paid — it was canceled, nailed to the cross. There is nothing left to hold over you.' },
  ],
};

export const THEMES = Object.keys(VERSES) as VerseTheme[];

// Free-text → the closest theme (ported from the PWA's detection). Falls back to strength.
export function detectTheme(text: string): VerseTheme {
  const t = text.toLowerCase();
  if (/forgiv|repent|mistake|sinned|did wrong|regret|guilt/.test(t)) return 'forgiveness';
  if (/tempt|lust|porn|urge|craving|sexual|purity|about to slip|one click/.test(t)) return 'purity';
  if (/anxi|worry|stress|overwhelm|panic|nervous|tense/.test(t)) return 'anxiety';
  if (/heartbrok|broken heart|grief|grieving|mourning|loss|tears|breakup/.test(t)) return 'heartbroken';
  if (/lonely|alone|isolat|nobody|no one|unloved|abandoned/.test(t)) return 'lonely';
  if (/shame|ashamed|embarrass|worthless|dirty|unclean|disgust/.test(t)) return 'shame';
  if (/depress|hopeless|numb|empty|heavy|despair|pointless|cant go on|can't go on/.test(t)) return 'depression';
  if (/afraid|fear|scared|dread|coward|terrified/.test(t)) return 'courage';
  if (/identity|who am i|lost myself|purpose|meaning|worth|no point to me/.test(t)) return 'identity';
  if (/weary|tired|exhaust|weak|burnt out|burnout|no strength|drained|keep going/.test(t)) return 'strength';
  return 'strength';
}

// A verse for a theme, avoiding the one currently shown (so "another" actually changes).
export function verseFor(theme: VerseTheme, avoid?: Verse): Verse {
  const pool = VERSES[theme];
  const options = avoid ? pool.filter((v) => v.reference !== avoid.reference) : pool;
  const src = options.length ? options : pool;
  return src[Math.floor(Math.random() * src.length)];
}
