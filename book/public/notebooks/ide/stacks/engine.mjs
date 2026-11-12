// The stack's machine: one kernel (kernel/cek.wasm) with the language's layers, cards as environments, and runs you can step.
// Every call into the machine is in this file. What leaves it is plain data: strings, numbers, arrays, {from, to} spans.
//
// THE RULES THIS FILE KEEPS
// - A drive collects garbage and moves pairs; a single x.step never does. So an address held in JS is good until the next
//   drive. What must outlive one is rooted with m.hold. Roots are a stack in the kernel (kernel/020-gc.wat) and are never
//   popped here: they last until the stack is reloaded, which boots a fresh machine.
// - A run is a list of machine states by index. It keeps a rooted checkpoint every CHECK steps and its events
//   (the (note kind info) yields the program makes); going back replays from the nearest checkpoint. A note yield is
//   continued as (R #inert k), never with x.resume, which forks the whole continuation.
// - A fork shares the card's environment: the new value is spliced in as (R v k) on the same continuation. An edit to the
//   card reaches both branches, which is what "every card that uses it updates" means.
import { machine } from '../machine.mjs';
import { reading } from '../desk/frames.mjs';
import { tableForm } from './buffer.mjs';

const NIL = 2, CHECK = 16384, GC_EVERY = 20000, BUDGET = 80000000, WATCH_BUDGET = 20000000;
const SYMBOLS = ['R', 'E', 'C', 'D', 'Y', '%f', '%c', 'problem', 'budget', 'unbound', 'args', 'seq', 'def', 'opev', 'mat', 'halt',
  '$quote', '$define!', 'ap', '%note', 'make-environment', 'note'];

// ---- the source, as spans: the same lexical rules as kernel/140-reader.wat, keeping where each list is
// node = {from, to, kids: [node] | null (an atom), dispatch?: true (a #( form, which reads with a head of its own)}
export function tree(text) {
  let i = 0;
  const space = (c) => c === ' ' || c === '\n' || c === '\t' || c === '\r';
  const skip = () => {
    for (;;) {
      while (i < text.length && space(text[i])) i++;
      if (text[i] === ';') { while (i < text.length && text[i] !== '\n') i++; continue; }
      return;
    }
  };
  const one = () => {
    skip();
    const from = i;
    if (i >= text.length) return null;
    const c = text[i];
    if (c === '(' || (c === '#' && text[i + 1] === '(')) {
      const dispatch = c === '#';
      i += dispatch ? 2 : 1;
      const kids = [];
      let tail = null;
      for (;;) {
        skip();
        if (i >= text.length) return { from, to: i, kids, dispatch, open: true };
        if (text[i] === ')') { i++; return { from, to: i, kids, tail, dispatch }; }
        if (text[i] === '.' && (space(text[i + 1] ?? ' ') || text[i + 1] === '(')) { i++; tail = one(); continue; }
        const k = one();
        if (!k) return { from, to: i, kids, dispatch, open: true };
        kids.push(k);
      }
    }
    if (c === ')') { i++; return { from, to: i, kids: null, stray: true }; }
    if (c === '"') { i++; while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1; i++; return { from, to: i, kids: null }; }
    while (i < text.length && !space(text[i]) && text[i] !== '(' && text[i] !== ')' && text[i] !== ';') i++;
    return { from, to: i, kids: null };
  };
  const forms = [];
  for (let f = one(); f; f = one()) forms.push(f);
  return forms;
}

// a printed value, read back for a view: numbers (ratios too) become numbers, lists arrays, anything else a string
export function datum(s) {
  let i = 0;
  const one = () => {
    while (/\s/.test(s[i] ?? '')) i++;
    if (s[i] === '(') {
      i++;
      const out = [];
      for (;;) {
        while (/\s/.test(s[i] ?? '')) i++;
        if (i >= s.length) return out;
        if (s[i] === ')') { i++; return out; }
        out.push(one());
      }
    }
    if (s[i] === '"') { const a = ++i; while (i < s.length && s[i] !== '"') i += s[i] === '\\' ? 2 : 1; return s.slice(a, i++); }
    const a = i;
    while (i < s.length && !/[\s()]/.test(s[i])) i++;
    const t = s.slice(a, i);
    const r = /^(-?\d+)\/(\d+)$/.exec(t);
    if (r) return Number(r[1]) / Number(r[2]);
    if (/^-?\d+$/.test(t)) return Number(t);
    return t;
  };
  return one();
}

export async function makeEngine({ kernel, layers }) {
  const m = await machine(kernel), x = m.x, ground = m.ground();
  for (const { name, text } of layers) { try { m.run(text, ground); } catch (e) { console.error('layer', name, e); } }
  x.gc(16 << 20);
  const sym = Object.fromEntries(SYMBOLS.map((n) => [n, m.read(n)[0]]));
  const inert = m.read('#inert')[0];
  const read = reading(m, sym);
  const pair = (v) => x.is_pair(v) !== 0;
  const nth = read.nth;
  const list = (...vs) => vs.reduceRight((t, v) => x.cons(v, t), NIL);
  const quote = (v) => list(sym.$quote, v);

  // ---- every root this engine holds; `pins` are the current states of runs, re-held before anything drives
  const runs = [];
  const pinAll = () => { for (const r of runs) { r.pin(); r.ctx = null; } };

  // Drive a form to its value, continuing every note yield and ignoring it. {value} | {stop: {kind, name, printed}}
  // `value` is an address: good until the next drive.
  function evalIn(envV, form, budget = WATCH_BUDGET) {
    pinAll();
    x.budget(budget);
    let s = x.start(form, envV);
    for (let guard = 0; guard < 100000; guard++) {
      const t = x.car(s);
      if (t === sym.D) return { value: nth(s, 1) };
      const out = nth(s, 1);
      if (pair(out) && x.car(out) === sym['%note']) { s = x.drive(x.cons(sym.R, x.cons(nth(out, 3), x.cons(nth(s, 2), NIL)))); continue; }
      return { stop: stopOf(s) };
    }
    return { stop: { kind: 'budget', printed: 'too many notes' } };
  }
  function stopOf(y) {
    const out = nth(y, 1);
    read.forget();
    if (pair(out) && x.car(out) === sym.unbound) return { kind: 'unbound', name: m.text(nth(out, 1)), printed: `nothing binds ${m.text(nth(out, 1))}` };
    if (pair(out) && x.car(out) === sym.problem && x.car(x.cdr(out)) === sym.budget) return { kind: 'budget', printed: 'this ran out of steps' };
    return { kind: 'problem', printed: read.show(out) };
  }
  const readOne = (text) => {
    const forms = m.read(text);
    return forms;
  };

  // ---- the stack and its cards
  const stack = { env: m.hold(m.run('(make-kernel-standard-environment)', ground)), cards: new Map() };
  const sources = [];   // every version of every applied block: {blockId, version, text, forms: held list, spans: [node]}

  function card(id, title, parent = null) {
    const p = parent ? stack.cards.get(parent).env : stack.env;
    const env = m.hold(x.eval(list(sym['make-environment'], quote(p.v)), ground.v));
    const c = { id, title, env, versions: new Map() };
    stack.cards.set(id, c);
    return c;
  }
  // a fork of a card: a fresh environment beside it, under the same parent, for a proposal to run in
  function forkCard(id) {
    const c = stack.cards.get(id);
    return card(`${id}~${Math.random().toString(36).slice(2, 7)}`, `${c.title} (fork)`);
  }
  const cardEnv = (id) => stack.cards.get(id).env;

  function bindTable(cardId, name, block) {
    let forms;
    try { forms = readOne(`($define! ${name} ($quote ${tableForm(block)}))`); } catch (e) { return { error: `the table ${name} cannot be read: ${e.message}` }; }
    const r = evalIn(cardEnv(cardId).v, forms[0]);
    return r.stop ? { error: r.stop.printed } : { ok: true };
  }
  function bind(cardId, name, valueText) {
    let forms;
    try { forms = readOne(`($define! ${name} ${valueText})`); } catch (e) { return { error: e.message }; }
    const r = evalIn(cardEnv(cardId).v, forms[0]);
    return r.stop ? { error: r.stop.printed } : { ok: true };
  }

  // Apply a block: read it, keep its forms (so a running state can be found in it), evaluate each in the card's environment.
  // {defined: [names], value, stop} — defines take effect at once, in every run that looks the name up later.
  function apply(cardId, blockId, text, { opaque = false } = {}) {
    let forms;
    try { forms = readOne(text); } catch (e) { return { error: `This cannot be read: ${e.message}` }; }
    const held = m.hold(list(...forms));
    const c = stack.cards.get(cardId);
    const version = (c.versions.get(blockId) ?? 0) + 1;
    c.versions.set(blockId, version);
    sources.push({ blockId, cardId, version, text, forms: held, spans: tree(text), opaque });
    const defined = [];
    let value = null;
    for (let l = held.v, k = 0; l !== NIL; k++) {
      const f = x.car(l);
      if (pair(f) && pair(x.cdr(f))) {
        const head = m.text(x.car(f)), target = x.car(x.cdr(f));
        if (head === 'def' || head === '$define!') defined.push(pair(target) ? m.text(x.car(target)) : m.text(target));
      }
      const r = evalIn(c.env.v, f, BUDGET);
      if (r.stop) return { defined, stop: r.stop, error: r.stop.printed, form: k };
      read.forget();
      value = read.show(r.value);
      l = held.v; for (let j = 0; j <= k; j++) l = x.cdr(l);
    }
    for (const r of runs) r.truncate();   // what was recorded past now was made by the old code
    return { defined, value, version };
  }
  // the newest forms of a block (to start a run from)
  const latest = (blockId) => { for (let i = sources.length - 1; i >= 0; i--) if (sources[i].blockId === blockId) return sources[i]; return null; };

  // a value as text, in a card's environment: for inline src_vau{...} and the line
  function show(cardId, text, envV = null) {
    let forms;
    try { forms = readOne(text); } catch (e) { return { error: `This cannot be read yet: ${e.message}` }; }
    if (forms.length !== 1) return { error: forms.length ? 'One form at a time.' : 'Type a form first.' };
    const r = evalIn(envV ?? cardEnv(cardId).v, forms[0]);
    if (r.stop) return { error: r.stop.printed, stop: r.stop };
    read.forget();
    return { text: read.show(r.value, envV ?? cardEnv(cardId).v) };
  }
  const names = (cardId) => read.names(cardEnv(cardId).v, { ground: true }).map((n) => n.name);

  // ---- where the machine is, in the text: walk every kept source beside its spans, now (addresses move on each drive)
  function spanMap(visibleOnly = false) {
    const at = new Map();
    for (const src of sources) {
      if (visibleOnly && src.opaque) continue;
      let l = src.forms.v;
      const walk = (v, node) => {
        if (!node.kids || node.dispatch || !pair(v)) return;
        let p = v;
        for (let k = 0; k < node.kids.length && pair(p); k++) {
          if (!at.has(p)) at.set(p, { src, node, index: k });
          walk(x.car(p), node.kids[k]);
          p = x.cdr(p);
        }
      };
      for (const node of src.spans) { if (!pair(l)) break; walk(x.car(l), node); l = x.cdr(l); }
    }
    return at;
  }
  const kontOf = (s) => { const t = x.car(s); return t === sym.E ? nth(s, 3) : t === sym.C ? nth(s, 4) : t === sym.R ? nth(s, 2) : t === sym.Y ? nth(s, 2) : NIL; };
  const under = (k) => { const kind = x.car(k); return kind === sym.args ? nth(k, 5) : kind === sym.mat ? nth(k, 2) : nth(k, 3); };
  function depth(s) { let n = 0; for (let k = kontOf(s); pair(k) && x.car(k) !== sym.halt && n < 1e6; k = under(k)) n++; return n; }
  // the span the machine is on: {blockId, version, from, to, ret} — ret when a value just came back from it
  function markOf(s, at) {
    const t = x.car(s);
    const hit = (p, ret = false, child = null) => {
      const e = at.get(p);
      if (!e) return null;
      const node = child === null ? (e.index === 0 ? e.node : e.node.kids[e.index]) : child(e);
      if (!node) return null;
      return { blockId: e.src.blockId, cardId: e.src.cardId, version: e.src.version, from: node.from, to: node.to, ret };
    };
    if (t === sym.E && pair(nth(s, 1))) { const r = hit(nth(s, 1)); if (r) return r; }
    if (t === sym.C) { const r = hit(nth(s, 2), false, (e) => e.node); if (r) return r; }
    // otherwise the nearest frame that points into the source: a symbol being looked up, or a value coming back
    const ret = t === sym.R;
    for (let k = kontOf(s), guard = 0; pair(k) && x.car(k) !== sym.halt && guard < 200; k = under(k), guard++) {
      const kind = x.car(k);
      if (kind === sym.args) {
        const todo = nth(k, 2);
        if (pair(todo)) { const r = hit(todo, ret, (e) => e.node.kids[e.index - 1] ?? e.node); if (r) return r; }
      } else if (kind === sym.opev) {
        const r = hit(nth(k, 1), ret, (e) => e.node.kids[0]); if (r) return r;
      } else if (kind === sym.seq) {
        const body = nth(k, 1);
        if (pair(body)) { const r = hit(body, ret, (e) => e.node.kids[e.index - 1] ?? e.node); if (r) return r; }
      }
    }
    return null;
  }

  // the environment a state is working in: E and C carry theirs; R takes the nearest frame's
  // the environment a state is working in: the innermost one a card's code made (a ground function's frame is passed over)
  const cardCells = () => new Set([...stack.cards.values()].map((c) => x.car(c.env.v)));
  const underCard = (env, cells) => { for (let fr = env, g = 0; pair(fr) && g < 400; fr = x.cdr(fr), g++) if (cells.has(x.car(fr))) return true; return false; };
  function envOf(s) {
    const cells = cardCells();
    const t = x.car(s);
    if (t === sym.E && underCard(nth(s, 2), cells)) return nth(s, 2);
    if (t === sym.C && underCard(nth(s, 3), cells)) return nth(s, 3);
    for (let k = kontOf(s), guard = 0; pair(k) && x.car(k) !== sym.halt && guard < 400; k = under(k), guard++) {
      const kind = x.car(k);
      const env = kind === sym.args ? nth(k, 4) : kind === sym.opev || kind === sym.seq || kind === sym.def ? nth(k, 2) : null;
      if (env !== null && underCard(env, cells)) return env;
    }
    return null;
  }
  // The environment chain, innermost first: a frame made by a call shows its names; a card, the stack and the ground by name.
  function chain(envV) {
    const labels = new Map();
    for (const c of stack.cards.values()) labels.set(x.car(c.env.v), { kind: 'card', label: c.title, id: c.id });
    labels.set(x.car(stack.env.v), { kind: 'stack', label: 'stack' });
    const out = [];
    read.forget();
    if (envV) read.learn(envV);
    for (let fr = envV, guard = 0; pair(fr) && guard < 200; fr = x.cdr(fr), guard++) {
      const cell = x.car(fr);
      if (!pair(x.cdr(fr))) { out.push({ kind: 'ground', label: 'ground', names: [] }); break; }
      const known = labels.get(cell);
      if (known) { out.push({ ...known, names: [] }); continue; }
      const names = [];
      if (pair(cell)) for (const b of read.items(x.cdr(cell))) {
        if (!pair(b)) continue;
        const name = m.text(x.car(b));
        if (name.startsWith('%') || names.length > 12) continue;
        names.push({ name, value: read.show(x.cdr(b), envV).slice(0, 160) });
      }
      out.push({ kind: 'local', label: 'call', names });
    }
    return out;
  }
  // What happens next, innermost first: the frames a card's code made, each with a hole where the value goes. Frames the
  // language makes for itself (map, $let*, ...) are counted, not shown.
  function nextSteps(k) {
    const cells = cardCells(), steps = [];
    let folded = 0, more = 0;
    const keep = (label, code) => { if (folded) { steps.push({ fold: folded }); folded = 0; } if (steps.filter((x) => !x.fold).length < 10) steps.push({ label, code }); else more++; };
    const ops = (l) => read.items(l).slice(0, 12).map((v) => read.show(v));
    for (let guard = 0; pair(k) && x.car(k) !== sym.halt && guard < 4000; k = under(k), guard++) {
      const kind = x.car(k);
      if (kind === sym.args) {
        const env = nth(k, 4);
        if (!underCard(env, cells)) { folded++; continue; }
        read.learn(env);
        const got = read.items(nth(k, 3)).reverse().map((v) => read.show(v));
        keep('Use it in', `(${[read.show(nth(k, 1)).replace(/^<(function|operative) ?(.*)>$/, (_, a, b) => b || `<${a}>`), ...got, '●', ...ops(nth(k, 2))].join(' ')})`);
      } else if (kind === sym.opev && underCard(nth(k, 2), cells)) keep('Call it with', `(● ${ops(nth(k, 1)).join(' ')})`);
      else if (kind === sym.seq && underCard(nth(k, 2), cells)) { const body = read.items(nth(k, 1)); keep('Then go on with', `${read.show(body[0])}${body.length > 1 ? ` and ${body.length - 1} more` : ''}`); }
      else if (kind === sym.def && underCard(nth(k, 2), cells)) keep('Save it as', read.show(nth(k, 1)));
      else folded++;
    }
    if (folded) steps.push({ fold: folded });
    return { next: steps, more };
  }
  // which function a local frame belongs to: the innermost args frame's combiner, by name
  function describe(s, env = null) {
    read.forget();
    env ??= envOf(s);
    const d = read.describe(s);
    return { kind: d.kind, label: d.label, code: d.code, ...nextSteps(kontOf(s)), chain: chain(env) };
  }

  // ---- a run: states by index, sparse checkpoints, events.
  // Moving far is native (x.drive in budgets that land on checkpoint indices); moving by a predicate steps in JS, with a
  // collection every GC_EVERY steps. A note yield is one state, continued as (R #inert k), the same way in both.
  let runIds = 0;
  const isNote = (s) => { if (x.car(s) !== sym.Y) return false; const out = nth(s, 1); return pair(out) && x.car(out) === sym['%note']; };
  // a note (%note kind info v) goes on with v: the value it reports is what (note ...) answers
  const pastNote = (s) => x.cons(sym.R, x.cons(nth(nth(s, 1), 3), x.cons(nth(s, 2), NIL)));
  const isBudget = (s) => { if (x.car(s) !== sym.Y) return false; const out = nth(s, 1); return pair(out) && x.car(out) === sym.problem && pair(x.cdr(out)) && x.car(x.cdr(out)) === sym.budget; };

  function makeRun({ cardId, blockId, start, parent = null, at = 0, label = '' }) {
    const r = {
      id: ++runIds, cardId, blockId, parent, label, forkAt: parent ? at : null,
      idx: at, frontier: at, done: false, value: null, stop: null, steps: 0,
      events: parent ? parent.events.filter((e) => e.idx < at) : [],
      checks: parent ? parent.checks.filter((c) => c.idx < at) : [],
      raw: start, held: null, breaks: new Set(), forks: [],
    };
    r.checks.push({ idx: at, h: m.hold(start) });
    r.state = () => (r.held ? r.held.v : r.raw);
    r.pin = () => { if (!r.held) r.held = m.hold(r.raw); };
    const checkpoint = (s, idx) => { if (idx % CHECK === 0 && !r.checks.some((c) => c.idx === idx)) r.checks.push({ idx, h: m.hold(s) }); };
    // arrive at state s, index idx: record what is new there
    const arrive = (s, idx) => {
      r.raw = s; r.held = null; r.idx = idx; r.noteEnv = null;
      checkpoint(s, idx);
      if (isNote(s) && idx > r.frontier) {
        const out = nth(s, 1);
        r.events.push({ idx, kind: m.text(nth(out, 1)), info: datum(m.text(nth(out, 2))) });
      }
      if (idx > r.frontier) r.frontier = idx;
      const t = x.car(s);
      r.done = t === sym.D;
      if (r.done) { read.forget(); r.value = read.show(nth(s, 1)); }
      r.stop = t === sym.Y && !isNote(s) ? stopOf(s) : null;
    };
    const next = (s) => { const t = x.car(s); if (t === sym.D) return null; if (t === sym.Y) return isNote(s) ? pastNote(s) : null; return x.step(s); };
    // native: up to n steps, stopping at a note (if notes) or the end. Returns 'end' | 'stop' | 'note' | 'count'
    const drive = (n, notes) => {
      r.pending = null; r.ctx = null;
      let left = n;
      while (left > 0) {
        let s = r.state();
        if (isNote(s)) { arrive(pastNote(s), r.idx + 1); left--; continue; }
        if (x.car(s) === sym.D) return 'end';
        if (x.car(s) === sym.Y) return 'stop';
        const room = Math.min(left, CHECK - (r.idx % CHECK));
        pinAll();
        x.budget(room);
        const got = x.drive(r.state());
        const k = x.steps();
        if (isBudget(got)) { arrive(nth(got, 2), r.idx + k); left -= k; continue; }
        arrive(got, r.idx + k); left -= k;
        if (x.car(got) === sym.D) return 'end';
        if (!isNote(got)) return 'stop';
        if (notes) return 'note';
      }
      return 'count';
    };
    // in JS, one state at a time, until pred(s) or a break: 'hit' | 'break' | 'end' | 'stop' | 'limit'
    // a walk gives the page back after about two seconds ('limit': press again to go on)
    const walk = (pred, limit = 60000000, ms = 2000) => {
      const t0 = Date.now();
      r.pending = null;
      let ctx = r.ctx;
      if (!ctx) { ctx = prepare(); visible(r.state(), ctx); }
      for (let n = 0; n < limit; n++) {
        const s = r.state();
        const t = next(s);
        if (t === null) return r.done ? 'end' : 'stop';
        arrive(t, r.idx + 1);
        r.ctx = ctx;
        if (isNote(t) && ctx.kmap.has(nth(t, 2))) r.noteEnv = m.hold(ctx.kmap.get(nth(t, 2)).env);
        if (ctx.breaks.size && x.car(t) === sym.C && ctx.breaks.has(nth(t, 1))) return 'break';
        if (pred && pred(t, ctx)) return 'hit';
        if (n % 50000 === 49999 && Date.now() - t0 > ms) return 'limit';
        if (n % GC_EVERY === GC_EVERY - 1) {
          pinAll();
          x.budget(1);
          const got = x.drive(r.state());
          if (isBudget(got)) arrive(nth(got, 2), r.idx + x.steps()); else { arrive(got, r.idx + x.steps()); if (pred && pred(got, prepare())) return 'hit'; }
          ctx = prepare(); r.ctx = null;
        }
      }
      return 'limit';
    };
    // what a walk compares against, re-read after every collection: the visible source, the break combiners
    function prepare(extra = null) {
      const at = spanMap(true);
      const breaks = new Set();
      const env = cardEnv(cardId).v;
      for (const name of r.breaks) {
        let forms;
        try { forms = readOne(name); } catch { continue; }
        const b = lookup(env, forms[0]);
        if (b === null) continue;
        breaks.add(b);
        if (pair(b) && x.car(b) === sym['%c'] && x.car(x.cdr(b)) === sym.ap) breaks.add(x.car(x.cdr(x.cdr(b))));
      }
      return { at, breaks, kmap: new Map(), extra };
    }
    // a step a person sees: the next state on a form in a block they can read (a block marked :step over is not one)
    // Called on every state in order: an E on a readable form remembers its continuation, so the value coming back on it
    // (an R with the same k) is known to be that form's, wherever it sits in its call.
    const visible = (s, ctx) => {
      const t = x.car(s);
      if (t === sym.D || t === sym.Y) return true;
      if (t === sym.E) {
        const f = nth(s, 1);
        if (!pair(f)) return false;
        const e = ctx.at.get(f);
        if (!e || e.index !== 0) return false;
        const k = nth(s, 3);
        if (!ctx.kmap.has(k)) ctx.kmap.set(k, { f, env: nth(s, 2) });
        return true;
      }
      if (t === sym.R) {
        const k = nth(s, 2);
        if (ctx.kmap.has(k)) return true;
        if (!pair(k)) return false;
        const p = x.car(k) === sym.args ? nth(k, 2) : NIL;
        return pair(p) && ctx.at.has(p);
      }
      return false;
    };
    const isNoteCall = (s) => x.car(s) === sym.E && pair(nth(s, 1)) && x.car(nth(s, 1)) === sym.note;
    r.step = () => walk(visible);
    r.tiny = () => { const t = next(r.state()); if (t === null) return r.done ? 'end' : 'stop'; arrive(t, r.idx + 1); return 'hit'; };
    // replay to an index from the nearest checkpoint at or below it
    r.to = (idx) => {
      r.pending = null; r.ctx = null;
      idx = Math.max(r.checks[0].idx, Math.min(idx, r.frontier));
      if (idx === r.idx) return;
      if (!(idx > r.idx && idx - r.idx < CHECK)) {
        const c = r.checks.filter((c) => c.idx <= idx).reduce((a, b) => (b.idx > a.idx ? b : a));
        r.raw = c.h.v; r.held = c.h; r.idx = c.idx;
      }
      const keep = r.frontier;
      drive(idx - r.idx, false);
      r.frontier = keep;
      arrive(r.state(), r.idx);
    };
    // back to the previous visible state: replay from a checkpoint, remembering the last visible index before here
    r.back = () => backTo(r.idx, visible);
    // the previous note: the unit a reader can see (a score, a row of weights), not one machine transition
    r.backNote = () => backTo(r.idx, isNote);
    const visibleValue = (s, ctx) => x.car(s) === sym.R && visible(s, ctx);
    const backTo = (target, pred) => {
      if (target <= r.checks[0].idx) return;
      let from = r.checks.filter((c) => c.idx < target).reduce((a, b) => (b.idx > a.idx ? b : a));
      for (;;) {
        r.raw = from.h.v; r.held = from.h; r.idx = from.idx;
        let ctx = prepare();
        let best = pred(r.state(), ctx) ? r.idx : -1;
        while (r.idx < target - 1) {
          const t = next(r.state());
          if (t === null) break;
          r.raw = t; r.held = null; r.idx++;
          if (pred(t, ctx)) best = r.idx;
          if ((r.idx - from.idx) % GC_EVERY === 0) { pinAll(); x.budget(1); const got = x.drive(r.state()); r.raw = isBudget(got) ? nth(got, 2) : got; r.held = null; r.idx += x.steps(); ctx = prepare(); }
          if (r.idx >= target - 1) break;
        }
        if (best >= 0 || from === r.checks[0]) { r.to(best >= 0 ? best : r.checks[0].idx); r.ctx = null; return; }
        const earlier = r.checks.filter((c) => c.idx < from.idx);
        if (!earlier.length) { r.to(r.checks[0].idx); return; }
        from = earlier.reduce((a, b) => (b.idx > a.idx ? b : a));
      }
    };
    // to the next note of one of these kinds (any, if none), natively
    r.toEvent = (kinds = null) => {
      // sitting on a note already: step past it, or "next" would hand back the same one
      if (r.events.some((e) => e.idx === r.idx && (!kinds || kinds.includes(e.kind)))) {
        if (r.tiny() !== 'hit') return r.done ? 'end' : 'stop';
      }
      for (let guard = 0; guard < 100000; guard++) {
        const res = r.breaks.size ? walk((s2) => isNote(s2)) : drive(1e9, true);
        if (res !== 'hit' && res !== 'note') return res;
        // the note here: recorded when first passed, so a replay below the frontier finds it by index
        const e = r.events.find((x) => x.idx === r.idx);
        if (e && (!kinds || kinds.includes(e.kind))) {
          // walk the last stretch one state at a time from the (note ...) call, so the note knows which call it is
          backTo(e.idx, isNoteCall);
          walk(() => r.idx >= e.idx, e.idx - r.idx + 1);
          return 'hit';
        }
      }
      return 'limit';
    };
    r.toEnd = () => (r.breaks.size ? walk(null) : drive(1e9, false));
    // up to n states natively: 'count' when there is more, so a caller can give the page a turn between slices
    r.forward = (n) => drive(n, false);
    // over: until this expression's value comes back on the same continuation; out: until a frame below this one
    r.over = () => {
      r.pin();
      const h = r.held, t0 = x.car(h.v);
      if (t0 === sym.D) return 'end';
      if (t0 !== sym.E) return r.step();
      // over the whole program is the same as to the end, and the end is native
      if (x.car(kontOf(h.v)) === sym.halt && !r.breaks.size) return drive(1e9, false);
      return walk((s, ctx) => { const k0 = kontOf(h.v); return (x.car(s) === sym.R && nth(s, 2) === k0) || x.car(s) === sym.D; });
    };
    r.out = () => {
      r.pin();
      const h = r.held;
      return walk((s) => {
        if (x.car(s) !== sym.R) return x.car(s) === sym.D;
        const k = nth(s, 2);
        for (let a = under(kontOf(h.v)), g = 0; pair(a) && g < 400; a = under(a), g++) { if (a === k) return true; if (x.car(a) === sym.halt) break; }
        return false;
      });
    };
    r.truncate = () => {
      r.frontier = r.idx;
      r.events = r.events.filter((e) => e.idx <= r.idx);
      r.checks = r.checks.filter((c) => c.idx <= r.idx);
      if (!r.checks.some((c) => c.idx === r.idx)) { r.pin(); r.checks.push({ idx: r.idx, h: r.held }); }
    };
    r.now = () => {
      const s = r.state();
      const at = spanMap(false);
      let mark = null;
      if ((x.car(s) === sym.R || isNote(s)) && r.ctx && r.ctx.kmap.has(nth(s, 2))) {
        const f = r.ctx.kmap.get(nth(s, 2)).f, e = at.get(f);
        if (e) mark = { blockId: e.src.blockId, cardId: e.src.cardId, version: e.src.version, from: e.node.from, to: e.node.to, ret: x.car(s) === sym.R, note: isNote(s) };
      }
      mark ??= markOf(s, at);
      // a value whose expression the frames cannot name (the last operand of a call) came back from the last place marked
      if (mark) r.lastMark = { ...mark, idx: r.idx };
      else if (x.car(s) === sym.R && r.lastMark && r.lastMark.idx < r.idx) mark = { ...r.lastMark, ret: true };
      if (r.pending && r.pending.idx <= r.idx) r.pending = null;
      return { idx: r.idx, frontier: r.frontier, first: r.checks[0].idx, done: r.done, value: r.value, stop: r.stop, mark, pending: r.pending ?? null, ...describe(s, r.noteEnv ? r.noteEnv.v : null) };
    };
    const frameEnv = () => (r.noteEnv ? r.noteEnv.v : null) ?? envOf(r.state()) ?? cardEnv(cardId).v;
    // evaluate in the frame the run is paused in (M-:, watches): a new frame on its environment, so a define stays out of the run
    const evalHere = (text) => {
      let forms;
      try { forms = readOne(text); } catch (e) { return { error: `This cannot be read yet: ${e.message}` }; }
      if (forms.length !== 1) return { error: forms.length ? 'One form at a time.' : 'Type a form first.' };
      const g = m.hold(forms[0]);
      r.pin();
      const env = m.hold(x.cons(x.cons(sym['%f'], NIL), frameEnv()));
      const res = evalIn(env.v, g.v);
      if (res.stop) return { error: res.stop.printed, stop: res.stop };
      return { value: res.value, env };
    };
    r.eval = (text) => {
      const got = evalHere(text);
      if (got.error) return got;
      read.forget();
      return { text: read.show(got.value, got.env.v), data: datum(m.text(got.value)) };
    };
    r.names = () => read.names(frameEnv(), { ground: true }).map((n) => n.name);
    // Capture the rest of the computation here and resume it with another value: a new run on the same continuation.
    // At a value coming back (R), that value is replaced; about to work something out (E), its answer is given instead.
    r.fork = (valueText, label = '') => {
      const t = x.car(r.state());
      if (t !== sym.R && t !== sym.E && t !== sym.Y) return { error: 'Step to an expression, a value or a stop first: a fork replaces what comes back there.' };
      const got = evalHere(valueText);
      if (got.error) return { error: got.error };
      const v = m.hold(got.value);
      const s = r.state();
      read.forget();
      const was = t === sym.R ? read.show(nth(s, 1)) : t === sym.Y ? read.show(nth(nth(s, 1), 3)) : null;
      const k = t === sym.E ? nth(s, 3) : nth(s, 2);
      const start = x.cons(sym.R, x.cons(v.v, x.cons(k, NIL)));
      const child = makeRun({ cardId, blockId, start, parent: r, at: r.idx, label: label || `${valueText} here` });
      // the note forked at is the child's too, with the value it was given instead
      const here = r.events.find((e) => e.idx === r.idx);
      if (here) {
        const info = JSON.parse(JSON.stringify(here.info));
        const given = datum(m.text(v.v));
        if (here.kind === 'score' || here.kind === 'weights') info[3] = given;
        child.events.push({ ...here, info, forked: true });
      }
      child.was = was;
      child.given = valueText;
      child.breaks = new Set(r.breaks);
      r.forks.push(child.id);
      return { run: child };
    };
    runs.push(r);
    return r;
  }
  // a name's value in an environment, or null
  function lookup(envV, symV) {
    for (let fr = envV, g = 0; pair(fr) && g < 100000; fr = x.cdr(fr), g++) {
      const cell = x.car(fr);
      if (!pair(cell)) continue;
      for (let b = x.cdr(cell); pair(b); b = x.cdr(b)) { const e = x.car(b); if (pair(e) && x.car(e) === symV) return x.cdr(e); }
    }
    return null;
  }
  // a run of a :run block, from its newest forms: the last form is what runs; the ones before it are applied first
  function run(cardId, blockId, text, label = '') {
    let forms;
    try { forms = readOne(text); } catch (e) { return { error: `This cannot be read: ${e.message}` }; }
    if (!forms.length) return { error: 'There is nothing to run here.' };
    const held = m.hold(list(...forms));
    const version = (stack.cards.get(cardId).versions.get(blockId) ?? 0) + 1;
    stack.cards.get(cardId).versions.set(blockId, version);
    sources.push({ blockId, cardId, version, text, forms: held, spans: tree(text) });
    let l = held.v;
    for (let k = 0; k < forms.length - 1; k++) {
      const res = evalIn(cardEnv(cardId).v, x.car(l), BUDGET);
      if (res.stop) return { error: res.stop.printed };
      l = held.v; for (let j = 0; j <= k; j++) l = x.cdr(l);
    }
    const env = cardEnv(cardId).v;
    const start = list(sym.E, x.car(l), env, list(sym.halt));
    return { run: makeRun({ cardId, blockId, start, label }) };
  }
  const runById = (id) => runs.find((r) => r.id === id);

  return { m, card, forkCard, cardEnv, bindTable, bind, apply, show, names, run, runById, runs, sources, latest, stats: () => ({ memory: x.memory.buffer.byteLength }) };
}
