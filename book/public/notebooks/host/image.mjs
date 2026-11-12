// The persistent machine: the whole machine as bytes, and back. Shared by host/wasm.mjs (node) and ide/machine.mjs (browser): no node: imports here.
// An image is: "VAUIMG" | version | sha256 of the kernel wasm | registers | values | segments (addr, len) | their bytes | sha256 of all that.
// Symbol ids and every pair address are positions in one particular binary, so an image is only ever restored into the kernel that made it.
// What is NOT in an image: host handles (hold) and raw addresses a host kept (re-take them from `values` or `roots`), the input and output
// buffers (0x1000.., 0xE0000..: scratch between calls), the collector's scratch registers, and anything JS holds.
export const VERSION = 3;   // 2: the site counter is a register (a version-1 image would restart it, and reuse a waiting stop's site); 3: the error-continuation is a register
const MAGIC = [...'VAUIMG'].map((c) => c.charCodeAt(0));
export const REGISTERS = ['hp', 'nsym', 'namep', 'carry', 'holes', 'budget', 'steps', 'gcat', 'gcmin', 'gcon', 'roots', 'nroots', 'ebrand', 'site', 'errk'];
const HEAP = 0x140000, SYMS = 0x10000, NAMES = 0x20000, NAMES_END = 0xE0000, LOW = 0x1000;
const NIL = 2;

// sha256, synchronous (crypto.subtle is not), so that save() can be too.
const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
export function sha256(data) {
  const n = data.length, padded = new Uint8Array(((n + 9 + 63) >> 6) << 6);
  padded.set(data); padded[n] = 0x80;
  const dv = new DataView(padded.buffer); dv.setUint32(padded.length - 8, Math.floor(n / 0x20000000)); dv.setUint32(padded.length - 4, (n << 3) >>> 0);
  const h = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]), w = new Uint32Array(64);
  const rr = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < padded.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + 4 * i);
    for (let i = 16; i < 64; i++) w[i] = (w[i - 16] + (rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) + w[i - 7] + (rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10))) | 0;
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((v, i) => { h[i] = (h[i] + v) | 0; });
  }
  const out = new Uint8Array(32), od = new DataView(out.buffer); h.forEach((v, i) => od.setUint32(4 * i, v >>> 0));
  return out;
}
export const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

const layout = (r) => [[0, LOW], [SYMS, r.nsym * 8], [NAMES, r.namep - NAMES], [HEAP, r.hp - HEAP]];
const header = 8 + 4 + 32 + 4 + 4 * REGISTERS.length + 4;

// Save x (a kernel instance whose wasm hashes to `hash`). `values` are raw values to carry along; with the collector on they are compacted
// with the heap, so what comes back is where they live now in the image (a hold() handle, passed as {v}, follows the move in x itself).
export function saveImage(x, hash, values = []) {
  let vals = values.map((v) => (typeof v === 'object' ? v.v : v));
  if (x.r_gcon.value) {         // the collector is on, so the host already lives by the rooting rule: compact, so the image holds only what lives
    let l = NIL; for (let i = vals.length - 1; i >= 0; i--) l = x.cons(vals[i], l);
    l = x.compact(l);
    vals = []; for (; l !== NIL; l = x.cdr(l)) vals.push(x.car(l));
  }
  const r = Object.fromEntries(REGISTERS.map((n) => [n, x[`r_${n}`].value]));
  const segs = layout(r), total = header + 8 * segs.length + 4 * vals.length + segs.reduce((n, [, l]) => n + l, 0) + 32;
  const out = new Uint8Array(total), dv = new DataView(out.buffer), mem = new Uint8Array(x.memory.buffer);
  let o = 0; const u32 = (v) => { dv.setInt32(o, v, true); o += 4; };
  out.set(MAGIC); o = 8; u32(VERSION); out.set(hash, o); o += 32;
  u32(REGISTERS.length); REGISTERS.forEach((n) => u32(r[n]));
  u32(vals.length); vals.forEach(u32);
  segs.forEach(([a, l]) => { u32(a); u32(l); });
  segs.forEach(([a, l]) => { out.set(mem.subarray(a, a + l), o); o += l; });
  out.set(sha256(out.subarray(0, o)), o);
  return out;
}

// Parse and check an image against the kernel hash it must match; nothing is touched. Throws a plain message on any mismatch.
export function readImage(bytes, hash) {
  const bad = (m) => { throw new Error(`image refused: ${m}`); };
  if (!(bytes instanceof Uint8Array)) bad('not bytes');
  if (bytes.length < header + 32) bad('truncated (shorter than an image header)');
  if (MAGIC.some((c, i) => bytes[i] !== c)) bad('not a vau image');
  const body = bytes.subarray(0, bytes.length - 32), sum = sha256(body);
  if (sum.some((b, i) => b !== bytes[body.length + i])) bad('checksum mismatch (the image is truncated or was altered)');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  if (dv.getInt32(8, true) !== VERSION) bad(`image version ${dv.getInt32(8, true)}, this host reads version ${VERSION}`);
  if (hash && hash.some((b, i) => b !== bytes[12 + i])) bad(`it was saved by a different kernel build (image ${hex(bytes.subarray(12, 44)).slice(0, 12)}..., this kernel ${hex(hash).slice(0, 12)}...); symbol ids are positions in one binary, so it cannot be restored here`);
  let o = 44; const u32 = () => { const v = dv.getInt32(o, true); o += 4; return v; };
  if (u32() !== REGISTERS.length) bad('wrong number of registers');
  const r = {}; REGISTERS.forEach((n) => { r[n] = u32(); });
  const values = []; for (let n = u32(); n > 0; n--) values.push(u32());
  if (r.hp < HEAP || r.hp % 8 || r.nsym < 0 || r.nsym * 8 > NAMES - SYMS || r.namep < NAMES || r.namep > NAMES_END) bad('registers out of range');
  const segs = layout(r), data = [];
  for (const [a, l] of segs) { if (u32() !== a || u32() !== l) bad('segments do not fit the registers'); }
  for (const [a, l] of segs) { data.push([a, bytes.subarray(o, o + l)]); o += l; }
  if (o !== body.length) bad('length does not fit the segments');
  return { registers: r, values, segments: data };
}

// Put a parsed image into a fresh kernel instance x: memory first (grown to fit), then the registers. Returns the saved values.
export function applyImage(x, img) {
  const need = Math.ceil((img.registers.hp + 8) / 65536);
  if (x.memory.buffer.byteLength / 65536 < need) x.memory.grow(need - x.memory.buffer.byteLength / 65536);
  const mem = new Uint8Array(x.memory.buffer);
  for (const [a, d] of img.segments) mem.set(d, a);
  for (const n of REGISTERS) x[`r_${n}`].value = img.registers[n];
  x.index_clear();          // the find index holds addresses belonging to the machine that saved the image
  return img.values;
}

// handles on what was on the kernel root stack, oldest (index 0) first: they follow the collector like hold() does, and take no new root
export const rootHandles = (x) => Array.from({ length: x.r_nroots.value }, (_, i) => ({ get v() { return x.rooted(i); } }));
