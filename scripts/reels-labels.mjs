#!/usr/bin/env node
// MEASURE THE UI STRINGS REELS-SCRIPTS.md TELLS THE OWNER TO POINT A CAMERA AT.
//
// The scripts name buttons, chips, card titles and quoted copy. They were written at v367 and
// nothing checked them until v668 — three hundred versions, by which time a whole beat no longer
// existed ("You started" is not on that screen; the 48px DAYS CLEAN hero was deliberately deleted)
// and he would have found out with the camera running. Twelve agents plus twelve adversarial
// refuters fixed them once. This script is what stops it happening again.
//
// THE DESIGN IS "MEASURE ONCE, RE-CHECK FOREVER", and the ONE rule is that a needle is only
// written down if it is PROVEN present at generation time. That is what makes the gate check
// unable to cry wolf: every entry in test/reels-labels.json was found in the shipped bundle by
// this script. Anything it cannot prove — voiceover, on-screen text, stage directions, prose —
// is skipped and printed, never guessed at.
//
// Run it after you deliberately change a label AND the script that names it:
//   node scripts/reels-labels.mjs            # report only
//   node scripts/reels-labels.mjs --write    # rewrite test/reels-labels.json
//
// Do NOT wire this into the gate. A check that regenerates its own expectations cannot fail.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const H = createRequire(import.meta.url)(path.join(ROOT, 'test/harness.js'));

const MD = fs.readFileSync(path.join(ROOT, 'REELS-SCRIPTS.md'), 'utf8');
const HAY = H.reelsHaystack(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));

// Only the blocks that tell him what to DO. VOICEOVER / ON-SCREEN TEXT / THE TURN / CTA / CAPTION
// are his own words about the app, not claims about what is on screen, and rewriting those is not
// this repo's business.
const CAMERA_BLOCKS = /\*\*(SCREEN ACTIONS|BEFORE THE TAKE[^*]*)\*\*([\s\S]*?)(?=\n\*\*[A-Z]|\n## |\n---|$)/g;
const MIN_WHOLE = 7;      // a whole quoted label this short is still specific enough ("Go well")
const MIN_FRAG  = 14;     // a FRAGMENT has to be longer, or it matches by coincidence

const prove = (label) => {
  const whole = H.reelsFold(label);
  if (whole.length >= MIN_WHOLE && HAY.indexOf(whole) >= 0) return { needle: whole, kind: 'whole' };
  // WORD WINDOWS, not punctuation splits. The first version split on punctuation only, so it could
  // not prove "Make my plan for next time" — the source builds it as
  // `(_saved?'Update':'Make')+' my plan for next time'`, which has no punctuation to split on — and
  // it could not prove "Restless - can't settle, antsy" either, because the halves of a two-element
  // row are shorter than the fragment floor only when you cut at the dash. Trimming words off each
  // end finds the longest run that IS one literal, which is the honest answer for a concatenation.
  const words = whole.split(' ').filter(Boolean);
  let best = null;
  for (let i = 0; i < words.length; i++) {
    for (let j = words.length; j > i; j--) {
      const run = words.slice(i, j).join(' ');
      if (run.length < MIN_FRAG) break;
      if (best && run.length <= best.length) continue;
      if (HAY.indexOf(run) >= 0) best = run;
    }
  }
  return best ? { needle: best, kind: 'fragment' } : null;
};

const pad = (v, n) => String(v).length >= n ? String(v) : String(v) + ' '.repeat(n - String(v).length);
const padL = (v, n) => String(v).length >= n ? String(v) : ' '.repeat(n - String(v).length) + String(v);

const scripts = [];
{
  const parts = MD.split(/^## (\d+) · (.+)$/m);
  for (let i = 1; i < parts.length; i += 3) scripts.push({ no: +parts[i], title: parts[i + 1].trim(), body: parts[i + 2] });
}
if (scripts.length !== 12) { console.error('EXPECTED 12 scripts, parsed ' + scripts.length); process.exit(1); }

const rows = [], skipped = [];
for (const s of scripts) {
  const seen = new Set();
  let m;
  CAMERA_BLOCKS.lastIndex = 0;
  while ((m = CAMERA_BLOCKS.exec(s.body))) {
    const block = m[2];
    for (const re of [/\*\*"([^"]{3,90})"\*\*/g, /\*"([^"]{8,160})"\*/g, /\*\*([^*"\n]{3,70})\*\*/g]) {
      let q; re.lastIndex = 0;
      while ((q = re.exec(block))) {
        let t = q[1].trim().replace(/^[^\w"' -￿]+/, '').replace(/[\s·.,]+$/, '');
        // NO CAPS FILTER. The first version dropped all-caps strings as my own shouted headers and
        // threw away real labels with them: "THE PLAN YOU SET FOR THIS", "STARTING TOGETHER",
        // "ONE SMALL REAL THING" and "FOUND IN YOUR STATEMENTS" are .eyebrow elements uppercased
        // by CSS, so the scripts write them in caps BECAUSE that is what the camera sees.
        // Provability is the only filter worth having here: a shouted header of mine will not prove.
        if (t) seen.add(t);
      }
    }
  }
  for (const label of [...seen].sort()) {
    const p = prove(label);
    if (p) rows.push({ script: s.no, label, needle: p.needle, kind: p.kind });
    else skipped.push({ script: s.no, label });
  }
}

const byScript = {};
rows.forEach(r => { byScript[r.script] = (byScript[r.script] || 0) + 1; });
console.log('PROVEN ' + rows.length + ' UI strings across ' + Object.keys(byScript).length +
  ' of 12 scripts   (skipped ' + skipped.length + ' unprovable)');
for (const s of scripts) console.log('  script ' + padL(s.no, 2) + '  ' + pad(s.title.slice(0, 46), 48) + padL(byScript[s.no] || 0, 3) + ' proven');

// CALIBRATION. If a future edit to the extractor quietly stops matching, this script would write a
// nearly-empty file and the gate would pass over nothing at all. Refuse instead.
const FLOOR = 60;
if (rows.length < FLOOR) { console.error('\nREFUSING TO WRITE: only ' + rows.length + ' proven, floor is ' + FLOOR + ' \u2014 the EXTRACTOR is broken, not the app.'); process.exit(1); }
const coverAll = scripts.every(s => (byScript[s.no] || 0) >= 1);
if (!coverAll) { console.error('\nREFUSING TO WRITE: at least one script proved nothing.'); process.exit(1); }

if (process.argv.includes('--write')) {
  const out = { generated_against: 'index.html', note: 'every needle below was PROVEN present when written; see scripts/reels-labels.mjs', rows };
  fs.writeFileSync(path.join(ROOT, 'test/reels-labels.json'), JSON.stringify(out, null, 1) + '\n');
  console.log('\nwrote test/reels-labels.json (' + rows.length + ' rows)');
} else {
  console.log('\n(report only — pass --write to rewrite test/reels-labels.json)');
  if (skipped.length) {
    console.log('\nSKIPPED, not provable as one literal (voiceover, stage directions, concatenations):');
    skipped.slice(0, 14).forEach(s => console.log('  ' + padL(s.script, 2) + '  ' + JSON.stringify(s.label).slice(0, 86)));
    if (skipped.length > 14) console.log('  \u2026 and ' + (skipped.length - 14) + ' more');
  }
}
