// A buffer, loaded into the engine: each card an environment, its tables bound as data, its blocks applied in order.
// The same code runs in the page and in the tests.
import { blocksOf, tableForm } from './buffer.mjs';

// (slider name min max step [init]) in a ui block, one per line; a value is a number as the language writes it
export function readUi(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = /^\s*\((slider|choose)\s+([^\s()]+)\s+(.*)\)\s*$/.exec(line);
    if (!m) continue;
    const parts = m[3].trim().split(/\s+/);
    if (m[1] === 'slider') out.push({ kind: 'slider', name: m[2], min: parts[0], max: parts[1], step: parts[2] ?? '1', init: parts[3] ?? parts[0] });
    else out.push({ kind: 'choose', name: m[2], from: parts[0], init: parts[1] ?? '0' });
  }
  return out;
}
export const toNumber = (t) => { const r = /^(-?\d+)\/(\d+)$/.exec(String(t)); return r ? Number(r[1]) / Number(r[2]) : Number(t); };
// a JS number as an exact numeral: 0.25 -> 1/4 (to 1/1000)
export const exact = (v) => { const n = Math.round(v * 1000); const g = (a, b) => (b ? g(b, a % b) : Math.abs(a)); const d = g(n, 1000) || 1; return 1000 / d === 1 ? `${n / d}` : `${n / d}/${1000 / d}`; };

// only vau blocks run here; a python block is shown beside, as the PyTorch you would write
export const isVau = (b) => (b.lang ?? 'vau') === 'vau';

export function loadStack(engine, doc) {
  const status = new Map();   // block id -> {ok, error, defined, value}
  const cards = [];
  for (const c of doc.cards) {
    engine.card(c.id, c.title);
    cards.push(c.id);
    applyCard(engine, c, c.id, status);
  }
  return { status, cards };
}

// every block of a card, in order, into the environment `envId` (the card's own, or a fork of it); `replace` swaps a block's text
export function applyCard(engine, card, envId, status = new Map(), replace = null) {
  for (const b of blocksOf(card)) {
    const text = replace && b.name && replace.name === b.name ? replace.text : b.text;
    if (b.type === 'table' && b.name) {
      const r = engine.bindTable(envId, b.name, b);
      status.set(b.id, r.error ? { error: r.error } : { ok: true, defined: [b.name] });
    } else if (b.type === 'src' && !b.args.run && isVau(b)) {
      const r = engine.apply(envId, b.id, text, { opaque: b.args.step === 'over' });
      status.set(b.id, r.error ? { error: r.error, defined: r.defined } : { ok: true, defined: r.defined, value: r.value });
    } else if (b.type === 'ui') {
      const defined = [];
      for (const w of readUi(text)) {
        const v = w.kind === 'slider' ? (b.values?.[w.name] ?? w.init) : (b.values?.[w.name] ?? w.init);
        const r = engine.bind(envId, w.name, v);
        if (r.error) { status.set(b.id, { error: r.error }); break; }
        defined.push(w.name);
      }
      if (!status.get(b.id)?.error) status.set(b.id, { ok: true, defined });
    }
  }
  return status;
}

// the card's first :run block: what a proposal runs to show its effect
export const mainRun = (card) => blocksOf(card).find((b) => b.type === 'src' && b.args.run && isVau(b));
// a run block by name: #+name: over it
export const runNamed = (card, name) => blocksOf(card).find((b) => b.type === 'src' && b.args.run && b.name === name);
export { tableForm };
