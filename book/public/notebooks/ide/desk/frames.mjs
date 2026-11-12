// Reading the machine's values into words: a value printed for a person, a continuation as a list of what happens next.
// The memory layout stays here and in runner.mjs. Combiners and environments are cyclic pairs, so every walk here is bounded.
const NIL = 2, HOLE = '●';
const STEPS_SHOWN = 12, ITEMS = 64, DEPTH = 8, NODES = 1500, TEXT = 2000;

export function reading(m, sym) {
  const x = m.x;
  const pair = (v) => x.is_pair(v) !== 0;
  const nth = (v, n) => { for (let i = 0; i < n; i++) v = x.cdr(v); return x.car(v); };
  const items = (l) => { const out = []; while (pair(l) && out.length < 100000) { out.push(x.car(l)); l = x.cdr(l); } return out; };
  const isEnv = (v) => pair(v) && pair(x.car(v)) && x.car(x.car(v)) === sym['%f'];
  const isCombiner = (v) => pair(v) && x.car(v) === sym['%c'];
  const str = (v) => {
    if ((v & 7) !== 5) return null;
    const mem = new DataView(x.memory.buffer), p = v & -8;
    if (mem.getUint32(p + 4, true) !== 0) return null;
    return new TextDecoder().decode(new Uint8Array(x.memory.buffer, p + 8, mem.getUint32(p, true) >>> 3));
  };

  // Which names a value goes by, innermost scope first. Good until the next drive: addresses move. A fork has its own copy of
  // every combiner, the ground's too, so this is walked from the environment in hand and not remembered from boot.
  const named = new Map(), walked = new Set();
  const forget = () => { named.clear(); walked.clear(); };
  const learn = (env) => {
    for (let fr = env, guard = 0; pair(fr) && guard < 100000; fr = x.cdr(fr), guard++) {
      if (walked.has(fr)) return;
      walked.add(fr);
      if (!pair(x.car(fr))) continue;
      for (const b of items(x.cdr(x.car(fr)))) {
        if (!pair(b)) continue;
        const v = x.cdr(b), name = m.text(x.car(b));
        if (!isCombiner(v)) continue;
        if (!named.has(v)) named.set(v, name);
        if (x.car(x.cdr(v)) === sym.ap) { const inner = x.car(x.cdr(x.cdr(v))); if (!named.has(inner)) named.set(inner, name); }
      }
    }
  };

  // A value as a person reads it: #t and #f by name, a function by its name, and never all of a huge or cyclic list.
  function show(v, env) {
    let nodes = 0;
    if (env !== undefined && env !== null) learn(env);
    const go = (v, depth) => {
      if (isEnv(v)) return '<environment>';
      if (isCombiner(v)) {
        const name = named.get(v), kind = m.text(x.car(x.cdr(v)));
        if (name && name.startsWith('#')) return name;
        return kind === 'ap' || kind === 'nat' ? `<function${name ? ` ${name}` : ''}>` : `<operative${name ? ` ${name}` : ''}>`;
      }
      if (!pair(v)) { const t = m.text(v); return t.length > TEXT ? `${t.slice(0, TEXT)}…"` : t; }
      if (depth >= DEPTH) return '(…)';
      const parts = [];
      let at = v;
      while (pair(at) && !isEnv(at) && !isCombiner(at)) {
        if (parts.length >= ITEMS || ++nodes > NODES) { parts.push('…'); at = NIL; break; }
        parts.push(go(x.car(at), depth + 1));
        at = x.cdr(at);
      }
      if (at !== NIL) parts.push('.', go(at, depth + 1));
      return `(${parts.join(' ')})`;
    };
    return go(v, 0);
  }

  const operands = (l) => items(l).slice(0, ITEMS).map((v) => show(v));

  // The continuation k, innermost first: {steps: [{label, code}], hidden: how many more, base: {i, env} | null, scope}.
  // base is the frame of the driver (runner.mjs): below it is the rest of the file, which the caller says in its own words.
  function walk(k) {
    const steps = [];
    let base = null, scope = null, more = 0;
    const push = (label, code) => { if (steps.length < STEPS_SHOWN) steps.push({ label, code }); else more++; };
    for (let guard = 0; pair(k) && guard < 2000000; guard++) {
      const kind = x.car(k);
      if (kind === sym.halt) break;
      if (kind === sym.args) {
        const f = nth(k, 1), todo = nth(k, 2), acc = nth(k, 3), env = nth(k, 4);
        const got = items(acc).reverse();
        if (got.length === 3 && got[0] === sym['%desk-form']) { base = { i: got[1] >> 3, env: got[2] }; scope ??= env; break; }
        scope ??= env;
        if (steps.length < STEPS_SHOWN) {
          learn(env);
          const head = named.get(f) ?? show(f);
          push('Use it in', `(${[head, ...got.map((v) => show(v)), HOLE, ...operands(todo)].join(' ')})`);
        } else more++;
        k = nth(k, 5);
      } else if (kind === sym.opev) {
        scope ??= nth(k, 2);
        push('Call it with', `(${[HOLE, ...operands(nth(k, 1))].join(' ')})`);
        k = nth(k, 3);
      } else if (kind === sym.seq) {
        scope ??= nth(k, 2);
        const body = items(nth(k, 1));
        push('Then go on with', `${show(body[0])}${body.length > 1 ? ` and ${body.length - 1} more` : ''}`);
        k = nth(k, 3);
      } else if (kind === sym.def) {
        scope ??= nth(k, 2);
        push('Save it as', show(nth(k, 1)));
        k = nth(k, 3);
      } else if (kind === sym.mat) {
        push('Check it against', show(nth(k, 1)));
        k = nth(k, 2);
      } else {
        push('Then', m.text(kind));
        k = nth(k, 3);
      }
    }
    return { steps, more, base, scope };
  }

  // The continuation of a state: E and C and R carry theirs at different places.
  const kontOf = (s) => { const t = x.car(s); return t === sym.E ? nth(s, 3) : t === sym.C ? nth(s, 4) : t === sym.R ? nth(s, 2) : null; };

  // The state now, for the Step view. Words only; the caller adds the names in scope.
  function describe(s) {
    const t = x.car(s);
    if (t === sym.E) return { kind: 'E', label: 'About to work out', code: show(nth(s, 1), nth(s, 2)), env: nth(s, 2) };
    if (t === sym.C) { const env = nth(s, 3); learn(env); return { kind: 'C', label: 'Calling', code: `(${[named.get(nth(s, 1)) ?? show(nth(s, 1)), ...operands(nth(s, 2))].join(' ')})`, env }; }
    if (t === sym.R) { const k = nth(s, 2), { scope, base } = walk(k); return { kind: 'R', label: 'Got the value', code: show(nth(s, 1), scope ?? base?.env), env: scope ?? base?.env ?? null }; }
    if (t === sym.D) return { kind: 'D', label: 'Finished with', code: show(nth(s, 1)), env: null };
    return { kind: 'Y', label: 'Stopped at', code: show(nth(s, 1)), env: null };
  }

  // Names bound in an environment, ground excluded when asked: the last frame of the chain is the ground (a fork copies it).
  function names(env, { ground = false, limit = 5000 } = {}) {
    const out = [], seen = new Set();
    for (let fr = env, guard = 0; pair(fr) && guard < 100000; fr = x.cdr(fr), guard++) {
      if (!ground && !pair(x.cdr(fr))) break;
      if (!pair(x.car(fr))) continue;
      for (const b of items(x.cdr(x.car(fr)))) {
        if (!pair(b)) continue;
        const name = m.text(x.car(b));
        if (name.startsWith('%') || seen.has(name) || out.length >= limit) continue;
        seen.add(name);
        out.push({ name, value: b });
      }
    }
    return out;
  }

  return { nth, items, show, str, pair, walk, kontOf, describe, names, forget, learn };
}
