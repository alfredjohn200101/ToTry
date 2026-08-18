// Rewrite every currency '$' inside a JS string literal to call curSym().
//
// Uses the same character-by-character scanner as scan-currency.js, because the three things that
// look like currency to a regex — `${x}` interpolation, /\d$/ anchors, and comments — are exactly
// the three that would break the app. Nothing outside a string literal is touched.
//
//   node scripts/fix-currency.js --dry  src/app/*.js
//   node scripts/fix-currency.js --write src/app/*.js
const fs = require('fs');
const DRY = process.argv.includes('--dry');
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));

function transform(src) {
  const out = [];
  let i = 0, n = src.length, last = 0, prevSig = '', cats = { A: 0, B: 0, C: 0 };
  const samples = [], skipped = [];
  const line = p => src.slice(0, p).split('\n').length;
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (c === '/' && c2 === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && c2 === '*') { i = src.indexOf('*/', i + 2); i = i < 0 ? n : i + 2; continue; }
    if (c === '/' && /[({[,;=:!&|?+\-*%~^<>]|^$/.test(prevSig)) {
      i++; let cls = false;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false;
        else if (src[i] === '/' && !cls) { i++; break; }
        else if (src[i] === '\n') break;
        i++;
      }
      prevSig = 'x'; continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const q = c, open = i; i++;
      let depth = 0, dollars = [];
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (q === '`' && src[i] === '$' && src[i + 1] === '{') { depth++; i += 2; continue; }
        if (q === '`' && depth > 0 && src[i] === '}') { depth--; i++; continue; }
        if (src[i] === '$' && depth === 0) dollars.push(i);
        if (src[i] === q && depth === 0) { i++; break; }
        i++;
      }
      const close = i - 1;                       // index of the closing quote
      // Two kinds of '$' in a string literal are NOT currency and would break the app if swept:
      //   1. a regex replacement token — '$1' in .replace(/,\s*([}\]])/g,'$1') repairs the JSON that
      //      every AI meal/plan parse depends on; '\\$&' escapes a user's search term. Rewriting either
      //      to curSym() parses fine, ships fine, and silently destroys the feature.
      //   2. a real US dollar — the AI cost ceiling is billed in USD and says so on the same line.
      const lineStart = src.lastIndexOf('\n', open) + 1;
      const prefix = src.slice(lineStart, open);
      const isReplaceArg = /\.replace\s*\(/.test(prefix) && /,\s*$/.test(prefix);
      const body0 = src.slice(open + 1, close);
      const isRealUSD = /USD/.test(src.slice(close, close + 80)) || /est\. ceiling/.test(body0);
      if (dollars.length && (isReplaceArg || isRealUSD)) {
        skipped.push(`${line(open)}: ${q}${body0.slice(0, 44)}${q}   [${isReplaceArg ? 'regex replacement' : 'genuinely USD'}]`);
        prevSig = 'x'; continue;
      }
      if (dollars.length && q !== '`') {
        // Rebuild this string literal as a concatenation with curSym() in place of each '$'.
        const body = src.slice(open + 1, close);
        const rel = dollars.map(d => d - open - 1);
        let pieces = [], cursor = 0;
        for (const r of rel) { pieces.push(body.slice(cursor, r)); cursor = r + 1; }
        pieces.push(body.slice(cursor));
        // pieces.length === rel.length + 1; join with curSym()
        const parts = [];
        pieces.forEach((p, k) => {
          if (p !== '') parts.push(q + p + q);
          if (k < rel.length) parts.push('curSym()');
        });
        const replacement = parts.length ? parts.join('+') : "''";
        const tail = body.slice(rel[rel.length - 1] + 1);
        if (rel.length === 1 && tail === '') cats[body.length === 1 ? 'B' : 'A']++;
        else cats.C++;
        if (samples.length < 6) samples.push(src.slice(open, close + 1).slice(0, 46) + '  →  ' + replacement.slice(0, 60));
        out.push(src.slice(last, open), replacement);
        last = close + 1;
      }
      prevSig = 'x'; continue;
    }
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  out.push(src.slice(last));
  return { text: out.join(''), cats, samples, skipped };
}

let tot = { A: 0, B: 0, C: 0 };
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const r = transform(src);
  const count = r.cats.A + r.cats.B + r.cats.C;
  if (!count && !r.skipped.length) continue;
  tot.A += r.cats.A; tot.B += r.cats.B; tot.C += r.cats.C;
  console.log(`${f}: ${count} string(s)  [ends-with-$ ${r.cats.A} · lone-$ ${r.cats.B} · $-mid-text ${r.cats.C}]`);
  if (DRY) r.samples.forEach(s => console.log('    ' + s));
  r.skipped.forEach(s => console.log('    SKIP ' + s));
  if (!DRY) fs.writeFileSync(f, r.text);
}
console.log(`\n${DRY ? 'DRY RUN' : 'WRITTEN'} — ends-with-$ ${tot.A}, lone-$ ${tot.B}, $-mid-text ${tot.C}`);
