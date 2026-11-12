// Python blocks that run: `#+begin_src python :live`. A run is recorded line by line (tracer.py, in a worker), and the
// panel under the block reads the record: step, step over, step out, back, scrub, every frame and its names, the
// output so far. Works from any static folder: every path here is relative to this file.
//
//   mountLive(el, block, { cardId, onStep, onNotes, onRun })  -> view   el: an empty element; block: a buffer.mjs src block
//   runAll(views)                                             the live blocks of a buffer, in order
//   python()                                                  the shared machine: { run, stop, reset, ready }
// onStep({ blockId, event, notes }) is called as the position moves; notes are {idx, kind, info}, the shape the
// Stacks views read, cut at the position, so views fill in as you step. onNotes(notes) is the same, notes only.

const WORKER = new URL('./worker.mjs', import.meta.url);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------------------------------------------------------------- the machine
let machine = null;
export function python() {
  if (machine) return machine;
  const listeners = new Set();
  let worker, pending, seq = 0, state = 'starting', version = '', failed = '';
  const say = () => listeners.forEach((f) => f({ state, version, failed }));
  const spawn = () => {
    worker = new Worker(WORKER, { type: 'module' });
    pending = new Map();
    state = 'starting'; say();
    worker.onmessage = ({ data: m }) => {
      if (m.op === 'ready') { state = 'ready'; version = m.version; say(); return; }
      if (m.op === 'failed') { state = 'failed'; failed = m.error; say(); return; }
      const p = pending.get(m.id); if (!p) return;
      pending.delete(m.id);
      m.ok ? p.ok(m.result) : p.no(new Error(m.error));
      if (!pending.size && state === 'busy') { state = 'ready'; say(); }
    };
    worker.onerror = (e) => { state = 'failed'; failed = e.message || 'the Python worker did not load'; say(); };
  };
  spawn();
  const call = (msg) => new Promise((ok, no) => {
    const id = ++seq;
    pending.set(id, { ok, no });
    if (msg.op === 'run' && state === 'ready') { state = 'busy'; say(); }
    worker.postMessage({ ...msg, id });
  });
  // the blocks that ran without an error, per card, in order: after a stop they are run again (untraced cost is the same)
  const history = new Map();
  let queue = Promise.resolve();
  const serial = (f) => (queue = queue.then(f, f));
  machine = {
    on: (f) => { listeners.add(f); f({ state, version, failed }); return () => listeners.delete(f); },
    get state() { return state; },
    run: (code, block, card = 'card') => serial(async () => {
      const r = await call({ op: 'run', code, block, card });
      const h = history.get(card) ?? []; history.set(card, h);
      const k = h.findIndex((x) => x.block === block);
      if (!r.error) { if (k >= 0) h[k].code = code; else h.push({ block, code }); }
      return r;
    }),
    // a block that does not end: the worker goes, a new one starts, and the card's earlier blocks are run again
    stop: async () => {
      worker.terminate();
      for (const p of pending.values()) p.no(Object.assign(new Error('stopped'), { stopped: true }));
      queue = Promise.resolve();
      spawn();
      for (const [card, h] of history) for (const { block, code } of h) await call({ op: 'run', code, block, card });
      state = 'ready'; say();
    },
    reset: (card) => { history.delete(card); return call({ op: 'reset', card }); },
  };
  return machine;
}

// ---------------------------------------------------------------- highlighting
const KW = /\b(def|class|return|if|elif|else|for|while|in|not|and|or|is|import|from|as|with|lambda|try|except|finally|raise|pass|break|continue|yield|None|True|False|global|nonlocal|assert|del)\b/;
function highlightLine(line) {
  let out = '', rest = line;
  const rules = [[/^#.*/, 't-c'], [/^("""|''')/, 't-s'], [/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/, 't-s'], [/^f("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/, 't-s'],
    [/^\d+(?:\.\d+)?(?:e-?\d+)?/, 't-n'], [new RegExp(`^${KW.source}`), 't-k'], [/^[A-Za-z_]\w*/, null], [/^\s+/, null], [/^./, null]];
  while (rest) {
    for (const [re, cls] of rules) {
      const m = re.exec(rest);
      if (!m) continue;
      out += cls ? `<span class="${cls}">${esc(m[0])}</span>` : esc(m[0]);
      rest = rest.slice(m[0].length);
      break;
    }
  }
  return out;
}
const highlight = (text, marks = {}) => text.split('\n').map((l, k) => (marks[k + 1] ? `<mark class="${marks[k + 1]}">${highlightLine(l) || ' '}</mark>` : highlightLine(l))).join('\n');

// ---------------------------------------------------------------- one value
const fmt = (x) => (x === null || x === undefined ? '—' : typeof x === 'number' ? (Number.isInteger(x) ? String(x) : String(+x.toPrecision(6))) : String(x));
function heat(nums) {
  const rows = Array.isArray(nums[0]) ? nums : [nums];
  const flat = rows.flat().filter((v) => typeof v === 'number');
  const max = Math.max(1e-12, ...flat.map(Math.abs));
  if (rows.length * rows[0].length > 400) return '';
  return `<table class="pyl-m">${rows.map((r) => `<tr>${r.map((v) => `<td style="background:${typeof v !== 'number' ? 'transparent' : v >= 0 ? `color-mix(in srgb, var(--pos) ${Math.round((v / max) * 55)}%, transparent)` : `color-mix(in srgb, var(--neg) ${Math.round((-v / max) * 55)}%, transparent)`}">${fmt(v)}</td>`).join('')}</tr>`).join('')}</table>`;
}
function valueHtml(v, was, plain = false) {
  if (!v) return '';
  if (v.data !== undefined) {
    const g = was && was.grad !== undefined && was.grad !== v.grad ? ' ch' : '';
    const d = was && was.data !== undefined && was.data !== v.data ? ' ch' : '';
    return `<span class="pyl-v"><span class="k">${esc(v.label || v.op || v.t)}</span> <span class="lab">data</span> <b class="${d}">${fmt(v.data)}</b> <span class="lab">grad</span> <b class="g${g}${v.grad ? ' nz' : ''}">${fmt(v.grad)}</b></span>`;
  }
  if (v.nums && Array.isArray(v.nums) && v.nums.length > 1) return `<span class="pyl-r">${esc(v.r)}</span>${plain ? '' : heat(v.nums)}`;
  return `<span class="pyl-r${v.t === 'def' ? ' def' : ''}">${esc(v.r)}</span>`;
}

// ---------------------------------------------------------------- the views
const views = new Map();   // block id -> view, so a step into an earlier block can light it up there too
const lineOf = (text, n) => text.split('\n')[n - 1] ?? '';

// the blocks' own look, added once beside whatever page mounts them (stacks.css supplies the colours)
function style() {
  if (document.querySelector('link[data-pylive-css]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = new URL('./py.css', import.meta.url).href; l.dataset.pyliveCss = '';
  document.head.append(l);
}

export function mountLive(el, block, { cardId = 'card', onStep = null, onNotes = null, onRun = null, title = null, plain = false } = {}) {
  style();
  const py = python();
  const v = { block, el, text: block.text.replace(/\n$/, ''), run: null, pos: 0, frame: 0, dirty: false, foreign: null, cardId };
  views.set(block.id, v);
  el.classList.add('src', 'py', 'live');
  el.dataset.b = block.id;
  el.innerHTML = `
    <div class="src-h">${plain ? `<span class="nm">${esc(title ?? block.name ?? 'Python')}</span>` : `<span>#+begin_src python :live</span>${block.name ? `<span class="nm">#+name: ${esc(block.name)}</span>` : ''}${title ? `<span class="nm">${esc(title)}</span>` : ''}`}
      <button class="btn pri" data-a="run" title="Run this block (⌘↵ or Ctrl+Enter in the code)">${plain ? 'Run' : '▶ run'}</button>
      <button class="btn" data-a="stop" title="Stop a block that is taking too long" hidden>${plain ? 'Stop' : '■ stop'}</button>
      <span class="st"></span></div>
    <div class="ed"><pre class="code" aria-hidden="true"></pre><textarea class="code" spellcheck="false" wrap="off" aria-label="Python code"></textarea></div>
    <div class="res-run pyl" tabindex="0" aria-label="This run: arrow keys step" hidden></div>`;
  const $ = (s) => el.querySelector(s);
  const pre = $('pre'), ta = $('textarea'), st = $('.st'), res = $('.res-run'), bRun = $('[data-a=run]'), bStop = $('[data-a=stop]');
  ta.value = v.text;
  const fit = () => { ta.style.height = '0'; ta.style.height = `${Math.max(pre.offsetHeight, ta.scrollHeight)}px`; ta.style.width = `${Math.max(pre.scrollWidth, el.querySelector('.ed').clientWidth)}px`; };
  const marks = () => {
    const m = {};
    if (v.foreign) m[v.foreign.line] = v.foreign.cls;
    const e = v.run?.events[v.pos];
    if (e && e.block === block.id && !v.dirty) m[(e.stack[v.frame]?.line) ?? e.line] = e.at === 'return' ? 'ret' : e.at === 'exception' ? 'err' : e.at === 'note' ? 'note' : 'cur';
    if (v.run?.error && v.run.error.block === block.id && v.run.error.line && !v.dirty && !m[v.run.error.line]) m[v.run.error.line] = 'err';
    return m;
  };
  const paint = () => { pre.innerHTML = `${highlight(ta.value, marks())}\n`; fit(); };
  v.paint = paint;
  const status = (text, cls = '') => { st.className = `st ${cls}`; st.textContent = plain && !cls ? '' : text; };

  ta.addEventListener('input', () => { v.dirty = ta.value !== v.text || v.dirty; el.classList.toggle('dirty', v.dirty); status('edited · ⌘↵ runs it', 'mod'); paint(); });
  ta.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); go(); }
    else if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
  });
  bRun.onclick = () => go();
  bStop.onclick = async () => { status('stopping…'); await py.stop(); };

  const go = async () => {
    v.text = ta.value; block.text = `${ta.value}\n`;
    bRun.disabled = true; bStop.hidden = false;
    const slow = setTimeout(() => status('still running… (■ stop ends it)', 'mod'), 1500);
    status(py.state === 'starting' ? 'starting Python (the first time downloads it)…' : 'running…');
    let r;
    try { r = await py.run(v.text, block.id, cardId); }
    catch (e) {
      clearTimeout(slow); bRun.disabled = false; bStop.hidden = true;
      if (e.stopped) { v.run = null; status('stopped: it did not finish', 'bad'); el.classList.add('err'); res.hidden = false; res.innerHTML = '<div class="row"><span class="lab">stopped</span><span class="val">Python was restarted, and the blocks that had run before this one were run again. Look for a loop that never ends.</span></div>'; paint(); return; }
      status(`could not run: ${e.message}`, 'bad'); return;
    }
    clearTimeout(slow); bRun.disabled = false; bStop.hidden = true;
    v.run = r; v.dirty = false; v.pos = r.error ? lastIndex(r) : r.events.length - 1; v.frame = 0;
    el.classList.remove('dirty'); el.classList.toggle('err', !!r.error);
    const n = r.events.length;
    status(r.error ? `${r.error.type} on line ${r.error.line ?? '?'}` : `ran · ${n}${r.truncated ? '+' : ''} step${n === 1 ? '' : 's'} recorded`, r.error ? 'bad' : 'ok');
    draw();
    onRun?.({ blockId: block.id, result: r });
    return r;
  };
  v.go = go;
  const lastIndex = (r) => { for (let k = r.events.length - 1; k >= 0; k--) if (r.events[k].at === 'exception') return k; return r.events.length - 1; };

  // ---- stepping: the position is an index into the record
  const moveTo = (k) => { if (!v.run?.events.length) return; v.pos = Math.max(0, Math.min(v.run.events.length - 1, k)); v.frame = 0; draw(); };
  const find = (from, dir, ok) => { const ev = v.run.events; for (let k = from + dir; k >= 0 && k < ev.length; k += dir) if (ok(ev[k])) return k; return dir > 0 ? ev.length - 1 : 0; };
  const step = {
    next: () => moveTo(v.pos + 1),
    back: () => moveTo(v.pos - 1),
    over: () => { const d = v.run.events[v.pos].depth; moveTo(find(v.pos, 1, (e) => e.depth <= d)); },
    backOver: () => { const d = v.run.events[v.pos].depth; moveTo(find(v.pos, -1, (e) => e.depth <= d)); },
    out: () => { const d = v.run.events[v.pos].depth; moveTo(find(v.pos, 1, (e) => e.depth < d)); },
    first: () => moveTo(0),
    last: () => moveTo(v.run.events.length - 1),
    note: () => moveTo(find(v.pos, 1, (e) => e.at === 'note')),
  };
  v.step = step;
  res.addEventListener('keydown', (e) => {
    if (!v.run || e.target.tagName === 'INPUT') return;
    const f = { ArrowRight: e.shiftKey ? step.over : step.next, ArrowLeft: e.shiftKey ? step.backOver : step.back, o: step.over, u: step.out, Home: step.first, End: step.last, n: step.note }[e.key];
    if (f) { e.preventDefault(); f(); }
  });
  res.addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]'); if (b) { step[b.dataset.s](); res.focus(); return; }
    const f = e.target.closest('[data-f]'); if (f) { v.frame = Number(f.dataset.f); draw(); res.focus(); }
  });
  res.addEventListener('input', (e) => { if (e.target.dataset.scrub !== undefined) moveTo(Number(e.target.value)); });

  function draw() {
    const r = v.run;
    // light up, in another block, the line this run is on (a method of the class block, say)
    for (const o of views.values()) if (o !== v && o.foreign?.from === block.id) { o.foreign = null; o.paint(); }
    res.hidden = !r;
    if (!r) { paint(); return; }
    const ev = r.events, e = ev[v.pos];
    if (e && e.block !== block.id && views.has(e.block)) {
      const o = views.get(e.block);
      o.foreign = { from: block.id, line: e.stack[v.frame]?.line ?? e.line, cls: e.at === 'return' ? 'ret' : e.at === 'exception' ? 'err' : 'cur' };
      o.paint();
    }
    paint();
    let h = '';
    if (r.error) {
      const where = r.error.block === block.id ? `line ${r.error.line}` : `line ${r.error.line} of ${blockLabel(r.error.block)}`;
      h += `<div class="row pyl-err"><span class="lab">${esc(r.error.type)}</span><span class="val">${esc(r.error.message)} <span class="lab">· ${esc(where)}</span></span></div>`;
    }
    if (ev.length) {
      const sf = e.stack[v.frame] ?? e.stack[0];
      const elsewhere = e.block !== block.id ? ` <span class="lab">in ${esc(blockLabel(e.block))}:</span> <code>${esc(lineOf(views.get(e.block)?.text ?? '', sf?.line ?? e.line).trim())}</code>` : '';
      const what = { line: 'about to run', call: 'called', return: 'returns', exception: 'raised', note: 'note' }[e.at];
      h += `<div class="row pyl-ctl">
        ${plain ? '' : `<button class="btn" data-s="first" title="First step (Home)">⏮</button><button class="btn" data-s="backOver" title="Back over (⇧←)">↶</button>`}<button class="btn pri" data-s="back" title="Back one step (←)">${plain ? '← Back' : '←'}</button>
        <button class="btn pri" data-s="next" title="One step (→)">${plain ? 'Step →' : '→ step'}</button><button class="btn" data-s="over" title="Step over a call (o or ⇧→)">over</button><button class="btn" data-s="out" title="Out of this function (u)">out</button><button class="btn" data-s="last" title="Last step (End)">${plain ? 'To the end' : '⏭'}</button>
        <input type="range" data-scrub min="0" max="${ev.length - 1}" value="${v.pos}" aria-label="Scrub through the steps of this run">
        <span class="lab">${v.pos + 1} / ${ev.length}${r.truncated ? ' (the rest ran unrecorded)' : ''}</span></div>
        <div class="row pyl-now">${plain
          ? `<span class="lab">line ${sf?.line ?? e.line}</span> <code>${esc(lineOf(v.text, sf?.line ?? e.line).trim())}</code>${e.at === 'return' && e.ret?.r !== 'None' ? ` <span class="lab">→</span> ${valueHtml(e.ret, null, true)}` : ''}`
          : `<span class="lab">${esc(what)}</span> <b>line ${sf?.line ?? e.line}</b> <span class="lab">in</span> <b>${esc(sf?.fn ?? e.fn)}</b>${elsewhere}${e.at === 'return' ? ` <span class="lab">→</span> ${valueHtml(e.ret, null, false)}` : ''}`}${e.at === 'exception' ? ` <span class="pyl-x">${esc(e.exc)}</span>` : ''}${e.at === 'note' ? ` <span class="pyl-n">${esc(e.note.kind)} ${esc(JSON.stringify(e.note.info))}</span>` : ''}</div>`;
      const prev = ev[v.pos - 1];
      const prevNames = prev ? (prev.stack.find((f) => f.fn === sf.fn && prev.stack.length - prev.stack.indexOf(f) === e.stack.length - e.stack.indexOf(sf)) ?? {}).names ?? {} : {};
      const names = Object.entries(sf?.names ?? {});
      h += `<div class="${plain && e.stack.length === 1 ? 'pyl-one' : 'pyl-grid'}">${plain && e.stack.length === 1 ? '' : `<div class="pyl-frames"><div class="lab">frames</div>${e.stack.map((f, k) => `<button class="pyl-f${k === v.frame ? ' on' : ''}" data-f="${k}" title="Show this frame's names">${esc(f.fn)} <span class="lab">${f.block === block.id ? '' : `${esc(blockLabel(f.block))} `}:${f.line}</span></button>`).join('')}</div>`}
        <div class="pyl-names">${plain ? '' : `<div class="lab">names in ${esc(sf?.fn ?? '')}</div>`}${names.length ? `<table>${names.map(([k, val]) => `<tr class="${prevNames[k] && prevNames[k].r !== val.r ? 'ch' : !prevNames[k] && prev ? 'new' : ''}"><th>${esc(k)}</th><td>${valueHtml(val, prevNames[k], plain)}</td></tr>`).join('')}</table>` : '<div class="lab">none yet</div>'}</div></div>`;
    }
    const out = ev.length && v.pos < ev.length - 1 ? r.stdout.slice(0, e.out) : r.stdout;
    if (out) h += `<div class="row"><span class="lab">printed${ev.length && v.pos < ev.length - 1 ? ' so far' : ''}</span></div><pre class="pyl-out">${esc(out)}</pre>`;
    if (r.value && !r.error && !(plain && r.value.r === 'None')) h += `<div class="row"><span class="lab">${plain ? 'value' : '#+results:'}</span> <span class="val">${valueHtml(r.value, null, plain)}</span></div>`;
    if (r.defined?.length && !r.error) h += `<div class="row"><span class="lab">${plain ? 'names it sets' : 'defines'}</span> <span class="val">${r.defined.map(esc).join(' · ')}</span></div>`;
    res.innerHTML = h;
    const notes = r.notes.filter((n) => n.idx <= v.pos);
    onStep?.({ blockId: block.id, event: e, notes });
    onNotes?.(notes);
  }
  v.draw = draw;
  py.on(({ state, failed }) => {
    if (state === 'failed') status(`Python did not start: ${failed}`, 'bad');
    else if (!v.run && !v.dirty && state === 'starting') status('starting Python…');
    else if (!v.run && !v.dirty && state === 'ready') status('not run yet');
  });
  paint();
  new ResizeObserver(fit).observe(el);
  return v;
}

const blockLabel = (id) => { const o = views.get(id); return o?.block.name ? `block ${o.block.name}` : o?.title ?? 'an earlier block'; };

// run the live blocks of a buffer in order; a block that fails stops the ones after it (they would read its names)
export async function runAll(list) {
  for (const v of list) { const r = await v.go(); if (!r || r.error) return false; }
  return true;
}
