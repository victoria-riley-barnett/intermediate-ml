// The browser's loader: the same exports as ../host/wasm.mjs, fetched instead of read from disk; no Buffer,
// no node:fs. A step may collect and move every pair, so what is held across one is rooted (kernel/gc.wat).
import { sha256, saveImage, readImage, applyImage, rootHandles } from '../host/image.mjs';
class Sym { constructor(name) { this.name = name; } toString() { return this.name; } }
class Pair { constructor(car, cdr) { this.car = car; this.cdr = cdr; } }

export async function machine(url = '/cek.wasm') {
  const wasm = url instanceof Uint8Array ? url : new Uint8Array(await (await fetch(url)).arrayBuffer());   // bytes, not streamed: the image needs the kernel's hash
  const hash = sha256(wasm);
  const { instance } = await WebAssembly.instantiate(wasm, {});
  const x = instance.exports;
  const mem = () => new DataView(x.memory.buffer);
  const NIL = 2, enc = new TextEncoder(), dec = new TextDecoder();
  const name = (id) => { const e = 0x10000 + id * 8; return dec.decode(new Uint8Array(x.memory.buffer, mem().getUint32(e, true), mem().getUint32(e + 4, true))); };
  const decode = (v) => {
    if (v === NIL) return null;
    if ((v & 7) === 1) return new Sym(name(v >> 3));
    if ((v & 7) === 4) return v >> 3;
    if ((v & 7) === 5) { const p = v & -8; return dec.decode(new Uint8Array(x.memory.buffer, p + 8, mem().getUint32(p, true) >>> 3)); }
    if ((v & 7) === 0 && v !== 0) { const m = mem(); return new Pair(decode(m.getUint32(v, true)), decode(m.getUint32(v + 4, true))); }
    throw new Error(`not a value: ${v}`);
  };
  const text = (v) => dec.decode(new Uint8Array(x.memory.buffer, 0xE0000, x.print(v)));
  const put = (s) => { const b = enc.encode(s); if (b.length > 0xF000) throw new Error('text does not fit the input buffer'); new Uint8Array(x.memory.buffer).set(b, 0x1000); return b.length; };
  const hold = (v) => { const i = x.root(v); return { get v() { return x.rooted(i); } }; };
  // The reader is total (kernel/140-reader.wat): a fault is raised, never delivered as data.
  const FAULTS = { 1: 'unmatched ")"', 2: 'unexpected end of input', 3: 'unterminated string', 4: 'numeral out of range for a 29-bit number' };
  const readAll = (len) => { const forms = x.read_all(0x1000, len); const code = x.read_fault(); if (code) { const e = new Error(`read: ${FAULTS[code] ?? `fault ${code}`} at ${x.read_fault_at() - 0x1000}`); e.name = 'ReaderFault'; e.code = code; e.at = x.read_fault_at() - 0x1000; throw e; } return forms; };
  const readFault = () => { const code = x.read_fault(); return code ? { code, at: x.read_fault_at(), name: FAULTS[code] ?? `fault ${code}` } : null; };
  const read = (src) => { const n = put(src); const out = []; for (let l = readAll(n); l !== NIL; l = x.cdr(l)) out.push(x.car(l)); return out; };
  const each = (src, env, go) => {
    const n = put(src);
    const ie = x.root(typeof env === 'object' ? env.v : env);
    let il;
    try { il = x.root(readAll(n)); } catch (e) { x.unroot(); throw e; }
    let r;
    for (;;) {
      const l = x.rooted(il); if (l === NIL) break;
      x.unroot(); x.root(x.cdr(l));
      r = go(x.car(l), x.rooted(ie));
    }
    x.unroot(); x.unroot();
    return r;
  };
  const run = (src, env) => each(src, env, (f, e) => x.eval(f, e)) ?? NIL;
  const start = (src, env) => each(src, env, (f, e) => x.start(f, e));
  const status = (s) => (x.car(s) === x.intern(0x1000, 0) ? '?' : decode(x.car(s)).name);
  const save = (...values) => saveImage(x, hash, values);
  const load = (bytes) => applyImage(x, readImage(bytes, hash));
  const roots = () => rootHandles(x);
  return { x, hash, save, load, roots, text, hold, decode, name, start, status, read, readFault, run, ground: () => hold(x.ground()) };
}

// A machine from an image, in a fresh instance of the kernel at `url`; refused if another kernel saved it. m.values: what was saved with it.
export async function restoreMachine(bytes, url = '/cek.wasm') {
  const wasm = url instanceof Uint8Array ? url : new Uint8Array(await (await fetch(url)).arrayBuffer());
  const img = readImage(bytes, sha256(wasm));
  const m = await machine(wasm);
  m.values = applyImage(m.x, img);
  return m;
}
