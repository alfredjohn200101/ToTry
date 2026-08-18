// Slice the FIRST n lines off a module into a new one that sits immediately before it.
//
//   node scripts/extract-prefix.js <source> <endLine> <newModulePath>
//
// WHY A PREFIX, ALWAYS. This app is one script with shared top-level scope and no module system, so
// ORDER IS SEMANTICS: a function hoists, a `const` does not, and anything read at load time must still
// come after what it reads. Lifting a range out of the MIDDLE would rejoin the two halves around it and
// silently move code past code — the one thing that must never happen here. Slicing a prefix and
// placing it directly before the remainder cannot reorder anything, by construction.
//
// After each slice, `node scripts/build-index.js --verify` proves the assembled index.html is
// byte-identical (sha256 over the raw bytes). If it is not, the split is wrong and nothing else is safe.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const [, , src, endS, dest] = process.argv;
if (!src || !endS || !dest) {
  console.error('usage: extract-prefix.js <source> <endLine> <newModulePath>');
  process.exit(1);
}
const end = parseInt(endS, 10);
const srcPath = path.join(ROOT, src);
const text = fs.readFileSync(srcPath, 'utf8');
const lines = text.split('\n');
if (end < 1 || end >= lines.length) {
  console.error(`endLine ${end} is outside 1-${lines.length - 1}`);
  process.exit(1);
}

// split() then join() round-trips exactly, so prefix + '\n' + rest === original.
const prefix = lines.slice(0, end).join('\n') + '\n';
const rest = lines.slice(end).join('\n');
if (prefix + rest !== text) {
  console.error('refusing: the split does not round-trip to the original text');
  process.exit(1);
}

fs.mkdirSync(path.dirname(path.join(ROOT, dest)), { recursive: true });
fs.writeFileSync(path.join(ROOT, dest), prefix);
fs.writeFileSync(srcPath, rest);
console.log(`sliced ${end} lines → ${dest}   (${src} now ${rest.split('\n').length} lines)`);
console.log(`  add '${dest}' to MODULES immediately BEFORE '${src}', then: node scripts/build-index.js --verify`);
