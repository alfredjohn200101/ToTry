// Drop the alpha channel from a PNG, and PROVE the pixels survived.
//
//   node scripts/png-flatten.mjs <file.png> [more.png …]
//
// WHY THIS EXISTS. `simctl io screenshot` emits RGBA (colour type 6) and App Store Connect asks for
// flattened screenshots. `sips` will not drop alpha here — it re-encodes and keeps the channel — and
// PIL and ffmpeg are both absent on this machine. On 27 Oct 2026 the five store shots were flattened
// with a throwaway writer that was never kept, so the next person to re-cut a screenshot had nothing
// to run and ORDER.md's own line ("re-capture any shot and it will be RGBA again") had no tool
// behind it. This is that tool, committed.
//
// IT REFUSES RATHER THAN GUESSES. Dropping alpha is only lossless when every pixel is opaque, so the
// minimum alpha is measured first and anything below 255 is refused by name — compositing over an
// assumed background would silently change the picture that ships. Only 8-bit, non-interlaced
// colour type 6 is converted; type 2 is already flat and is left alone; anything else is refused.
//
// AND IT VERIFIES ITS OWN OUTPUT. The file it just wrote is re-decoded from disk and every RGB byte
// compared against the source's. A writer that produces a plausible-looking PNG with the rows
// mis-filtered is exactly the failure this repo keeps paying for, and the only thing that separates
// it from a correct one is reading the bytes back.
import fs from 'fs'; import zlib from 'zlib'; import url from 'url';

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return buf => { let c = -1; for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ -1) >>> 0; };
})();

const SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

function chunks(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  const out = []; let p = 8;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    out.push({ type, data: buf.subarray(p + 8, p + 8 + len) });
    p += 12 + len;
  }
  return out;
}

// Unfilter into packed samples. bpp is bytes per pixel; `raw` is the inflated scanline stream.
function unfilter(raw, w, h, bpp) {
  const stride = w * bpp, out = Buffer.alloc(stride * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++]; const line = raw.subarray(p, p + stride); p += stride;
    const o = y * stride, prev = y ? out.subarray(o - stride, o) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[o + x - bpp] : 0, b = prev ? prev[x] : 0, c = (prev && x >= bpp) ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      else if (f !== 0) throw new Error('unknown filter ' + f + ' on row ' + y);
      out[o + x] = v & 0xFF;
    }
  }
  return out;
}

function decode(file) {
  const cs = chunks(fs.readFileSync(file));
  const ihdr = cs.find(c => c.type === 'IHDR'); if (!ihdr) throw new Error('no IHDR');
  const w = ihdr.data.readUInt32BE(0), h = ihdr.data.readUInt32BE(4);
  const depth = ihdr.data[8], type = ihdr.data[9], interlace = ihdr.data[12];
  if (depth !== 8) throw new Error('bit depth ' + depth + ' — only 8 is handled');
  if (interlace !== 0) throw new Error('interlaced — not handled');
  if (type !== 2 && type !== 6) throw new Error('colour type ' + type + ' — only 2 (RGB) and 6 (RGBA) are handled');
  const bpp = type === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(cs.filter(c => c.type === 'IDAT').map(c => c.data)));
  return { w, h, type, bpp, px: unfilter(raw, w, h, bpp) };
}

// `claimFilter` exists ONLY for --selftest: it writes the rows unfiltered while telling the decoder
// they are filtered, which is exactly the plausible-looking corruption the read-back is here to
// catch. A fault injection nobody can re-run is a claim, and this file would otherwise be making one.
function encodeRGB(w, h, rgb, claimFilter) {
  const stride = w * 3, body = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { body[y * (stride + 1)] = claimFilter || 0; rgb.copy(body, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const chunk = (type, data) => {
    const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(body, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ── self-test ────────────────────────────────────────────────────────────────────────────────────
// Run it with `node scripts/png-flatten.mjs --selftest`. It needs no screenshot and no simulator.
function encodeRGBA(w, h, rgba) {
  const stride = w * 4, body = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { body[y * (stride + 1)] = 0; rgba.copy(body, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const chunk = (type, data) => {
    const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(body)), chunk('IEND', Buffer.alloc(0))]);
}

if (process.argv[2] === '--selftest') {
  const os = await import('os'); const path = await import('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pngflat-'));
  const W = 9, H = 7;           // odd sizes on purpose: a stride bug hides behind a square
  let fails = 0;
  const ok = (name, cond, detail) => { console.log(`  ${cond ? '✓' : '✗ FAILED'}  ${name}${detail ? '  — ' + detail : ''}`); if (!cond) fails++; };

  // Pixels that vary in all three channels and across both axes, so a row or column mix-up shows.
  const rgba = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    rgba[o] = (x * 29 + y * 7) & 0xFF; rgba[o + 1] = (x * 11 + y * 53) & 0xFF; rgba[o + 2] = (x * 97 + y * 3) & 0xFF; rgba[o + 3] = 255;
  }
  const opaque = path.join(dir, 'opaque.png');
  fs.writeFileSync(opaque, encodeRGBA(W, H, rgba));

  // 1. An opaque RGBA file flattens, and the pixels survive.
  const src = decode(opaque);
  ok('decodes the RGBA source at the right size', src.w === W && src.h === H && src.type === 6, `${src.w}x${src.h} type ${src.type}`);
  const rgb = Buffer.alloc(W * H * 3);
  for (let i = 0, o = 0; i < src.px.length; i += 4, o += 3) { rgb[o] = src.px[i]; rgb[o + 1] = src.px[i + 1]; rgb[o + 2] = src.px[i + 2]; }
  const flat = path.join(dir, 'flat.png');
  fs.writeFileSync(flat, encodeRGB(W, H, rgb));
  const back = decode(flat);
  let diff = 0; for (let i = 0; i < rgb.length; i++) if (back.px[i] !== rgb[i]) diff++;
  ok('round trip is byte-exact', back.type === 2 && diff === 0, `colourType ${back.type}, rgbDiff ${diff}`);

  // 2. FAULT INJECTION. Claim filter Sub while writing unfiltered rows: the read-back must disagree.
  const bad = path.join(dir, 'bad.png');
  fs.writeFileSync(bad, encodeRGB(W, H, rgb, 1));
  let badDiff = 0; const backBad = decode(bad);
  for (let i = 0; i < rgb.length; i++) if (backBad.px[i] !== rgb[i]) badDiff++;
  ok('a mis-filtered write is CAUGHT by the read-back', badDiff > 0, `${badDiff} of ${rgb.length} RGB bytes differ`);

  // 3. Real transparency is refused rather than composited over a guess.
  const trans = Buffer.from(rgba); trans[3] = 200;
  const tfile = path.join(dir, 'translucent.png');
  fs.writeFileSync(tfile, encodeRGBA(W, H, trans));
  const tsrc = decode(tfile);
  let minA = 255; for (let i = 3; i < tsrc.px.length; i += 4) if (tsrc.px[i] < minA) minA = tsrc.px[i];
  ok('a translucent pixel is seen', minA === 200, 'minAlpha ' + minA);

  // 4. And the refusal is the PROGRAM'S, not just this block's arithmetic — run the real path.
  const { execFileSync } = await import('child_process');
  let refused = false, refusedMsg = '';
  try { execFileSync(process.execPath, [url.fileURLToPath(import.meta.url), tfile], { stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { refused = true; refusedMsg = String(e.stderr || '').trim().split('\n')[0]; }
  ok('the program REFUSES it and exits non-zero', refused && /REFUSED/.test(refusedMsg), refusedMsg.slice(-60));

  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fails ? `\n${fails} self-test failure(s)` : '\nself-test: 5 of 5');
  process.exit(fails ? 1 : 0);
}

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node scripts/png-flatten.mjs <file.png> […]   (or --selftest)'); process.exit(1); }
let bad = 0;
for (const f of files) {
  try {
    const src = decode(f);
    if (src.type === 2) { console.log(`${f}  already flat (colour type 2) — untouched`); continue; }
    let minA = 255;
    for (let i = 3; i < src.px.length; i += 4) if (src.px[i] < minA) minA = src.px[i];
    if (minA !== 255) { console.error(`${f}  REFUSED — minAlpha ${minA}; dropping alpha here would change the picture`); bad++; continue; }
    const rgb = Buffer.alloc(src.w * src.h * 3);
    for (let i = 0, o = 0; i < src.px.length; i += 4, o += 3) { rgb[o] = src.px[i]; rgb[o + 1] = src.px[i + 1]; rgb[o + 2] = src.px[i + 2]; }
    fs.writeFileSync(f, encodeRGB(src.w, src.h, rgb));
    // READ IT BACK. Not "did the write throw" — did the file on disk decode to the same pixels.
    const back = decode(f);
    if (back.type !== 2) throw new Error('re-decoded as colour type ' + back.type);
    if (back.w !== src.w || back.h !== src.h) throw new Error('re-decoded at ' + back.w + 'x' + back.h);
    let diff = 0; for (let i = 0; i < rgb.length; i++) if (back.px[i] !== rgb[i]) diff++;
    if (diff) throw new Error(diff + ' RGB bytes differ after re-decode');
    console.log(`${f}  ${src.w}x${src.h}  colourType 2  minAlpha 255  rgbDiff 0`);
  } catch (e) { console.error(`${f}  FAILED — ${e.message}`); bad++; }
}
process.exit(bad ? 1 : 0);
