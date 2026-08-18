// Find every '$' that is CURRENCY, by scanning JS state properly rather than by regex.
// A regex cannot tell '$'+n (currency) from /\d$/ (an end-of-string anchor) from `${x}`
// (interpolation) from a comment. Those three false positives are exactly what would turn a
// mechanical sweep into a broken app, so this walks the source one character at a time.
const fs = require('fs');

function scan(src) {
  const hits = [];
  let i = 0, n = src.length;
  const line = p => src.slice(0, p).split('\n').length;
  // state: code | line-comment | block-comment | 'str | "str | `tpl | /regex
  let prevSignificant = '';           // last non-space code char, to tell division from a regex
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (c === '/' && c2 === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && c2 === '*') { i = src.indexOf('*/', i + 2); i = i < 0 ? n : i + 2; continue; }
    if (c === '/' && /[({[,;=:!&|?+\-*%~^<>]|^$|return|typeof/.test(prevSignificant)) {
      // a regex literal — consume it, and record nothing: every '$' inside is an anchor
      i++;
      let cls = false;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '[') cls = true;
        else if (src[i] === ']') cls = false;
        else if (src[i] === '/' && !cls) { i++; break; }
        else if (src[i] === '\n') break;      // not a regex after all
        i++;
      }
      prevSignificant = 'x';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const q = c, start = i; i++;
      let depth = 0;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (q === '`' && src[i] === '$' && src[i + 1] === '{') { depth++; i += 2; continue; }
        if (q === '`' && depth > 0 && src[i] === '}') { depth--; i++; continue; }
        if (src[i] === '$' && depth === 0) {
          hits.push({ pos: i, line: line(i), quote: q,
                      ctx: src.slice(Math.max(0, i - 40), i + 25).replace(/\n/g, '\\n') });
        }
        if (src[i] === q && depth === 0) { i++; break; }
        i++;
      }
      prevSignificant = 'x';
      continue;
    }
    if (!/\s/.test(c)) prevSignificant = c;
    i++;
  }
  return hits;
}

module.exports = { scan };
if (require.main !== module) return;

const files = process.argv.slice(2);
let total = 0;
for (const f of files) {
  const hits = scan(fs.readFileSync(f, 'utf8'));
  if (!hits.length) continue;
  total += hits.length;
  console.log(`\n### ${f}  (${hits.length})`);
  for (const h of hits) console.log(`  ${h.line}: …${h.ctx}…`);
}
console.log(`\nTOTAL currency-candidate $ inside string literals: ${total}`);
