// The stacks page: an org-like buffer whose cards are environments on the real kernel, with the debugger on its blocks.
// Everything the machine does goes through engine.mjs; this file draws and listens.
import { parse, serialize, blocksOf } from './buffer.mjs';
import { makeEngine, datum } from './engine.mjs';
import { loadStack, applyCard, mainRun, runNamed, isVau, readUi, toNumber, exact } from './stack.mjs';
import { readDiagram, drawDiagram, noteMatches } from './diagram.mjs';
import { renderView, readsView, num } from './views.mjs';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const S = {
  engine: null, doc: null, file: 'encoder.org', status: new Map(), blocks: new Map(), cardOf: new Map(),
  runsOf: new Map(), sel: null, now: null, dirty: new Set(), open: new Set(), shut: new Set(), cell: null,
  proposals: new Map(), wasOf: new Map(), breaks: new Set(), dsel: new Map(), ckpt: new Map(), training: null, playing: false, forking: null, data: new Map(), history: [], hpos: 0,
};
const params = new URLSearchParams(location.search);
// where the kernel, the layers and the lessons are: beside this file in the repo, and the same in an exported folder
const ROOT = new URL('../../', import.meta.url);
const at = (path) => new URL(path, ROOT);
// the page a student opens: the buffer and its live parts, none of the IDE around it
let STUDENT = document.body.dataset.mode === 'student' || params.get('mode') === 'student';
// exact ratios read as decimals in the panels: 2500000/707107 -> 3.536; the line (M-:) shows both
const dec = (a, b) => { const v = Number(a) / Number(b); return String(Math.round(v * 1000) / 1000); };
const pretty = (t) => String(t ?? '').replace(/(^|[\s(])(-?\d+)\/(\d+)(?=[\s)]|$)/g, (_, p, a, b) => `${p}${dec(a, b)}`);

// ---------------------------------------------------------------- boot
// start({org, lessons, student, file}): draw a lesson into the page's #doc. With no org it reads ?lesson= from lessons/.
export async function start(opts = {}) {
  if (opts.student !== undefined) STUDENT = opts.student;
  if (STUDENT) {
    document.body.classList.add('student');
    for (const [k, v] of Object.entries(PLAIN)) ACTIONS[k].label = v;
    // one click, one number: a state a debugger finds interesting can be thousands of transitions away,
    // and a reader sees nothing while it passes. Notes are what a reader can see.
    ACTIONS.step.go = (r) => r.toEvent(null);
    ACTIONS.step.title = 'The next number (→)';
    ACTIONS.back.go = (r) => r.backNote();
    ACTIONS.back.title = 'The previous number (←)';
  }
  return boot(opts);
}
async function boot(opts = {}) {
  const index = await (await fetch(at('lang/index.json'))).json();
  const layers = await Promise.all(index.map(async (f) => ({ name: f, text: await (await fetch(at(`lang/${f}`))).text() })));
  const kernel = new Uint8Array(await (await fetch(at('kernel/cek.wasm'))).arrayBuffer());
  const lessons = opts.lessons ?? (opts.org ? [] : await (await fetch(at('ide/stacks/lessons/index.json'))).json());
  const order = ['one-head.org', 'encoder.org', 'words.org'];
  lessons.sort((a, b) => ((order.indexOf(a) + 1) || 99) - ((order.indexOf(b) + 1) || 99));
  S.file = opts.file ?? params.get('lesson') ?? lessons[0] ?? 'encoder.org';
  $('tabs').innerHTML = lessons.map((n) => `<a class="tab${n === S.file ? ' on' : ''}" href="?lesson=${encodeURIComponent(n)}${STUDENT && !document.body.dataset.mode ? '&mode=student' : ''}">${esc(STUDENT ? n.replace(/\.org$/, '').replace(/-/g, ' ') : n)}</a>`).join('');
  const text = opts.org ?? await (await fetch(at(`ide/stacks/lessons/${encodeURIComponent(S.file)}`))).text();
  const t0 = performance.now();
  S.engine = await makeEngine({ kernel, layers });
  S.doc = parse(text);
  for (const b of S.doc.intro) { S.blocks.set(b.id, b); if (S.doc.cards[0]) S.cardOf.set(b.id, S.doc.cards[0]); }
  for (const c of S.doc.cards) for (const b of blocksOf(c)) { S.blocks.set(b.id, b); S.cardOf.set(b.id, c); }
  S.status = loadStack(S.engine, S.doc).status;
  for (const c of S.doc.cards) readData(c);
  if (S.doc.keywords.training) { try { S.training = await (await fetch(at(`ide/stacks/lessons/${encodeURIComponent(S.doc.keywords.training)}`))).json(); } catch (e) { console.error('training', e); } }
  for (const c of S.doc.cards) for (const b of blocksOf(c)) if (b.type === 'src' && b.args.run && isVau(b)) newRun(b, { select: !S.sel });
  $('docname').textContent = lessons.length ? '' : S.file;
  live(`machine up in ${Math.round(performance.now() - t0)} ms · ${S.doc.cards.length} card${S.doc.cards.length > 1 ? 's' : ''}`);
  build();
  refresh();
  wire();
  // a notebook opens with its outputs in place: run each cell once the page has painted, so the numbers are
  // already there to read and Run is for trying something else
  setTimeout(() => {
    let touched = false;
    for (const r of [...S.runsOf.values()].flat()) if (!r.done) { r.toEnd(); touched = true; }
    if (touched) refresh();
  }, 0);
  // the proposals have already run in a fork when you get to them: do it once the page is drawn
  setTimeout(async () => { for (const c of S.doc.cards) for (const b of blocksOf(c)) if (b.type === 'proposal') await runProposal(c, b); refresh(); }, STUDENT ? 150 : 60);
}

// the card's names the views read: tokens, features, and the tables by name
function readData(card) {
  const get = (name) => { const r = S.engine.show(card.id, name); return r.error ? [] : datum(r.text).map(String); };
  const tables = {};
  for (const b of blocksOf(card)) if (b.type === 'table' && b.name) tables[b.name] = b;
  S.data.set(card.id, { tokens: get('tokens'), features: get('features'), tables });
}
const live = (s) => { $('livebar').textContent = s; };
let toastTimer;
function toast(s, ms = 2600) { $('toast').textContent = s; clearTimeout(toastTimer); if (ms) toastTimer = setTimeout(() => { $('toast').textContent = ''; }, ms); }
// long work: say so, let the page paint, then do it
const busy = (what, fn) => new Promise((ok) => { toast(what, 0); setTimeout(() => { try { fn(); } catch (e) { console.error(e); toast(`failed: ${e.message}`); } toast(''); refresh(); ok(); }, 20); });

// ---------------------------------------------------------------- runs
function newRun(b, { select = true } = {}) {
  const card = S.cardOf.get(b.id);
  const got = S.engine.run(card.id, b.id, b.text, 'run');
  if (got.error) { S.status.set(b.id, { error: got.error }); return null; }
  const r = got.run;
  r.breaks = new Set(S.breaks);
  const list = S.runsOf.get(b.id) ?? [];
  for (const o of list) if (!o.parent && !o.proposal) o.retired = true;
  r.label = `run ${list.filter((x) => !x.parent && !x.proposal).length + 1}`;
  list.push(r);
  S.runsOf.set(b.id, list);
  if (select) S.sel = r;
  // :was NAME: this run is read against the named run block's, to the end (a lab's "predict, then run")
  if (b.args.was) {
    const other = runNamed(card, b.args.was);
    const o = other && (S.runsOf.get(other.id) ?? []).filter((x) => !x.parent && !x.proposal).at(-1);
    if (o) { const back = o.idx; if (!o.done) { o.toEnd(); o.to(back); } S.wasOf.set(r.id, o.events); }
  }
  return r;
}
const runsOfCard = (card) => S.engine.runs.filter((r) => r.cardId === card.id);
const blockOfRun = (r) => S.blocks.get(r.blockId);
const wasEvents = (r) => S.wasOf.get(r.id) ?? (r.parent ? r.parent.events : null);
// how many numbers the reader has seen: the notes recorded up to where the run is
const seen = (r) => r.events.filter((e) => e.idx <= r.idx && e.kind !== 'tokens').length;

const PLAIN = { back: '‹ previous', step: 'next ›', end: 'Run ▶', fork: 'what if this were different?' };
const ACTIONS = {
  back: { label: '◀', title: 'Back one step (←)', go: (r) => r.back() },
  step: { label: '▶', title: 'One step (→)', go: (r) => r.step() },
  over: { label: 'over', title: 'Step over this expression (o)', go: (r) => r.over() },
  out: { label: 'out', title: 'Step out of this call (u)', go: (r) => r.out() },
  score: { label: 'next score', title: 'Run to the next attention score (n)', go: (r) => r.toEvent(['score']) },
  row: { label: 'next row', title: 'Run to the next finished row of weights (r)', go: (r) => r.toEvent(['weights']) },
  end: { label: 'to end', title: 'Run to the end, or the next break (e)', go: (r) => r.toEnd(), slow: true },
  fork: { label: 'fork', title: 'Capture the rest of the computation here and resume it with another value (f)' },
};
function act(name, r = S.sel) {
  if (!r) return;
  S.usePy = false;
  S.sel = r;
  if (name === 'fork') { openFork(r); return; }
  if (name === 'restart') { const b = blockOfRun(r); S.sel = newRun(b) ?? r; S.cell = null; refresh(); return; }
  const a = ACTIONS[name];
  const go = () => { const res = a.go(r); if (res === 'break') toast('stopped at a break'); if (res === 'stop' && r.stop) toast(`stopped: ${r.stop.printed}`); if (res === 'limit') toast('still going: press again to go on'); };
  if (a.slow && !r.done) return busy('running…', go);
  go();
  refresh();
}
function openFork(r) {
  S.sel = r;
  const n = r.now();
  const isNote = n.kind === 'Y' && /^\(%note /.test(n.code);
  S.forking = { runId: r.id, value: isNote ? '0' : n.kind === 'R' ? n.code.slice(0, 60) : '' };
  refresh();
  setTimeout(() => { const i = document.querySelector('.forkbox input'); if (i) { i.focus(); i.select(); } }, 0);
}
function doFork(r, value) {
  const at = r.idx;
  const got = r.fork(value);
  if (got.error) { toast(got.error); return; }
  // carry the old run on to the end of this row, so the fork can show what each number was
  if (r.events.some((e) => e.idx === at)) { r.toEvent(['weights']); r.to(at); }
  S.wasOf.set(got.run.id, r.events.slice());   // kept as they are now: a later edit may cut the old run short
  const list = S.runsOf.get(r.blockId);
  list.push(got.run);
  got.run.label = `fork: ${value} here`;
  S.forking = null;
  S.sel = got.run;
  toast(`forked at state ${r.idx.toLocaleString('en-US')}: the old run keeps its value, this one goes on with ${value}`);
  refresh();
}

// ---------------------------------------------------------------- applying edits
function applyBlock(b) {
  const card = S.cardOf.get(b.id);
  if (b.type === 'src' && b.args.run) { S.dirty.delete(b.id); const r = newRun(b); if (r) toast('a new run of this block, from its first state'); refresh(); return; }
  const r = S.engine.apply(card.id, b.id, b.text, { opaque: b.args.step === 'over' });
  S.status.set(b.id, r.error ? { error: r.error, defined: r.defined } : { ok: true, defined: r.defined, value: r.value });
  S.dirty.delete(b.id);
  readData(card);
  const paused = runsOfCard(card).filter((x) => !x.done && x.idx > x.checks[0].idx).length;
  toast(r.error ? `applied with a stop: ${r.error}` : `applied live: ${r.defined.join(', ') || 'no new names'}${paused ? ' · paused runs go on with it from where they are' : ''}`);
  refresh();
}
function rebindTable(b) {
  const card = S.cardOf.get(b.id);
  const r = S.engine.bindTable(card.id, b.name, b);
  if (r.error) { toast(r.error); return; }
  for (const x of runsOfCard(card)) x.truncate();
  readData(card);
  toast(`${b.name} changed: what is computed from here reads the new value`);
  refresh();
}
function setUi(b, name, value) {
  const card = S.cardOf.get(b.id);
  b.values = { ...(b.values ?? {}), [name]: value };
  b.text = b.text.split('\n').map((l) => { const m = new RegExp(`^(\\s*\\(slider\\s+${name}\\s+\\S+\\s+\\S+\\s+\\S+)(\\s+\\S+)?\\)`).exec(l); return m ? `${m[1]} ${value})` : l; }).join('\n');
  S.engine.bind(card.id, name, value);
  // re-run what reads the name: each run block of the card runs anew to the end, and shows what each number was
  const blocks = blocksOf(card).filter((x) => x.type === 'src' && x.args.run && b.text && x.text);
  const t0 = performance.now();
  busy(`${name} = ${value} · re-running what reads it…`, () => {
    for (const rb of blocks) {
      const list = S.runsOf.get(rb.id) ?? [];
      const old = list.filter((x) => !x.parent && !x.proposal && !x.retired).at(-1);
      const wasSel = S.sel && S.sel.blockId === rb.id;
      const r = newRun(rb, { select: wasSel });
      if (!r) continue;
      r.toEnd();
      if (old) S.wasOf.set(r.id, old.events);
    }
    live(`${name} = ${value} · ${blocks.length} block${blocks.length > 1 ? 's' : ''} re-ran in ${Math.round(performance.now() - t0)} ms`);
  });
}

// ---------------------------------------------------------------- proposals: run in a fork of the card
const slices = async (r) => { while (r.forward(1500000) === 'count') await new Promise((ok) => setTimeout(ok, 0)); };
async function runProposal(card, b) {
  const p = S.proposals.get(b.id) ?? {};
  S.proposals.set(b.id, p);
  const main = b.args.compare ? runNamed(card, b.args.compare) : mainRun(card);
  const target = blocksOf(card).find((x) => x.name === b.args.replaces);
  if (!main || !target) { p.error = `nothing here is called ${b.args.replaces}`; return; }
  const t0 = performance.now();
  const forkCard = S.engine.forkCard(card.id);
  const st = applyCard(S.engine, card, forkCard.id, new Map(), { name: b.args.replaces, text: b.text });
  const bad = [...st.values()].find((s) => s.error);
  if (bad) { p.error = bad.error; return; }
  const fr = S.engine.run(forkCard.id, main.id, main.text).run;
  fr.proposal = b.id; fr.label = 'proposal fork';
  await slices(fr);
  // the card as it is, for comparison: the same run, to the end
  let base = (S.runsOf.get(main.id) ?? []).find((x) => x.done && !x.parent && !x.proposal);
  if (!base) { base = S.engine.run(card.id, main.id, main.text).run; base.hidden = true; await slices(base); }
  Object.assign(p, { fork: fr, forkCard, base, target: target.id, ms: Math.round(performance.now() - t0) });
  (S.runsOf.get(main.id) ?? S.runsOf.set(main.id, []).get(main.id)).push(fr);
  S.wasOf.set(fr.id, base.events);
}
function proposalSummary(card, p) {
  const prop = [...S.proposals.entries()].find(([, v]) => v === p)?.[0];
  const pb = prop && S.blocks.get(prop);
  if (pb?.args.compare) {
    return STUDENT
      ? `<div>${esc(pb.args.compare)}: <b>${esc(pretty(p.base.value))}</b> as the page is → <b>${esc(pretty(p.fork.value))}</b> with the change</div>`
      : `<div>${esc(pb.args.compare)}: <b>${esc(pretty(p.base.value))}</b> as the card is → <b>${esc(pretty(p.fork.value))}</b> in the fork</div><div class="lab">worked out on this machine, in ${p.ms} ms · ${p.base.frontier.toLocaleString('en-US')} → ${p.fork.frontier.toLocaleString('en-US')} states</div>`;
  }
  const { tokens } = S.data.get(card.id);
  const rows = (r) => { const w = {}; for (const e of r.events) if (e.kind === 'weights') w[`${e.info[0]}:${e.info[1]}`] = e.info[3]; return w; };
  const a = rows(p.base), b = rows(p.fork);
  const out = [];
  for (const key of Object.keys(b)) {
    const [h, i] = key.split(':').map(Number);
    const wa = a[key], wb = b[key];
    if (!wa) continue;
    const ja = wa.indexOf(Math.max(...wa)), jb = wb.indexOf(Math.max(...wb));
    if (ja !== jb || Math.abs(wa[ja] - wb[jb]) > 0.08) out.push({ h, i, ja, jb, va: wa[ja], vb: wb[jb] });
  }
  out.sort((x, y) => Math.abs(y.vb - y.va) - Math.abs(x.vb - x.va));
  const lines = out.slice(0, 4).map((d) => `<div>head ${d.h + 1}: <b>${esc(tokens[d.i])}</b> reads ${esc(tokens[d.ja])} ${num(d.va)} → ${d.ja === d.jb ? '' : `${esc(tokens[d.jb])} `}${num(d.vb)}</div>`);
  return `${lines.length ? lines.join('') : '<div>no word reads anything else</div>'}<div class="lab">${STUDENT ? `ran in ${p.ms} ms` : `in the fork: ${p.base.frontier.toLocaleString('en-US')} → ${p.fork.frontier.toLocaleString('en-US')} states · ran in ${p.ms} ms`}</div>`;
}
function accept(card, b) {
  const p = S.proposals.get(b.id);
  const target = S.blocks.get(p.target);
  target.text = b.text;
  p.accepted = true;
  const ta = document.querySelector(`[data-ta="${target.id}"]`);
  if (ta) ta.value = target.text;
  applyBlock(target);
  toast(`accepted: ${b.args.title ?? 'the proposal'} is now the ${target.name} block, applied live`);
}

// ---------------------------------------------------------------- drawing the buffer
function highlight(text, marks) {
  const segs = [];
  const re = /;[^\n]*|"(?:[^"\\]|\\.)*"?|[()]|[^\s()";]+|\s+/g;
  let m, prev = '';
  const special = new Set(['def', 'fn', 'if', 'with', '$let*', '$let', '$sequence', '$quote', 'call/cc', 'note', '$define!', '$lambda', '$vau', 'and', 'or']);
  while ((m = re.exec(text))) {
    const t = m[0];
    let cls = '';
    if (t[0] === ';') cls = 't-c'; else if (t[0] === '"') cls = 't-s'; else if (t === '(' || t === ')') cls = 't-p';
    else if (/^-?\d+(\/\d+)?$/.test(t)) cls = 't-n'; else if (special.has(t)) cls = 't-k'; else if (prev === 'def' || prev === 'def(') cls = 't-d';
    if (!/^\s+$/.test(t)) prev = t === '(' && prev === 'def' ? 'def(' : t === '(' ? prev : t;
    segs.push({ from: m.index, to: m.index + t.length, cls });
  }
  const cuts = new Set([0, text.length]);
  for (const k of marks) { cuts.add(k.from); cuts.add(k.to); }
  let out = '';
  const opened = new Set();
  for (const s of segs) {
    const pts = [s.from, ...[...cuts].filter((c) => c > s.from && c < s.to).sort((a, b) => a - b), s.to];
    for (let q = 0; q < pts.length - 1; q++) {
      const a = pts[q], z = pts[q + 1], piece = esc(text.slice(a, z));
      for (const k of marks) { if (a === k.from && !opened.has(k)) { out += `<mark class="${k.cls}">`; opened.add(k); } }
      out += s.cls ? `<span class="${s.cls}">${piece}</span>` : piece;
      for (const k of marks) { if (z === k.to && opened.has(k)) { out += '</mark>'; opened.delete(k); } }
    }
  }
  for (let k = opened.size; k > 0; k--) out += '</mark>';
  return `${out}\n`;
}
function inline(text, card) {
  let h = esc(text);
  h = h.replace(/src_vau\{([^}]*)\}/g, (_, expr) => { const r = S.engine.show(card.id, expr.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')); return `<span class="inl" title="${expr}">${esc(r.error ? `? ${r.error}` : r.text)}</span>`; });
  h = h.replace(/(^|[\s(])[=~]([^=~\s](?:[^=~\n]*?[^=~\s])?)[=~](?=[\s.,;:)!?]|$)/g, '$1<code>$2</code>');
  h = h.replace(/(^|\s)\*([^*\n]+?)\*(?=[\s.,;:)]|$)/g, '$1<b>$2</b>');
  h = h.replace(/(^|\s)\/([^/\n]+?)\/(?=[\s.,;:)]|$)/g, '$1<i>$2</i>');
  return h;
}
const isOpen = (id, def) => (S.open.has(id) ? true : S.shut.has(id) ? false : def);

function build() {
  const d = S.doc;
  const kw = Object.entries(d.keywords).map(([k, v]) => `#+${esc(k)}: <b>${esc(v)}</b>`).join('<br>');
  let h = `<h1 class="doc-title">${esc(d.keywords.title ?? S.file)}</h1>`;
  if (!STUDENT) h = `<div class="kw">${kw}</div>${h}`;
  h += d.intro.map((b) => blockShell(b, d.cards[0] ?? null)).join('');
  for (const c of d.cards) {
    // a page reads as a page: real headings, sections always open, no fold buttons
    h += STUDENT
      ? `<section class="card" data-card="${c.id}"><h2 class="card-title">${esc(c.title)}</h2>`
      : `<section class="card" data-card="${c.id}"><div class="h1card"><span class="stars">*</span><span class="ttl">${esc(c.title)}</span><span class="env-chip">card · an environment ↑ stack ↑ ground${c.tags.length ? ` · :${esc(c.tags.join(':'))}:` : ''}</span></div>`;
    h += `<div class="body">${shells(c.intro, c)}`;
    for (const s of c.sections) {
      if (STUDENT) {
        const lv = Math.min(1 + s.level, 6);   // a `**` section under an h2 card is an h3
        h += `<section class="sec" id="sec-${s.id}" data-sec="${s.id}"><h${lv} class="sec-h">${esc(s.title)}</h${lv}><div class="body">${shells(s.blocks, c)}</div></section>`;
        continue;
      }
      const open = isOpen(s.id, true);
      h += `<section class="sec" id="sec-${s.id}" data-sec="${s.id}" data-folded="${open ? 0 : 1}"><button class="h l${Math.min(s.level, 3)}" data-fold="${s.id}" aria-expanded="${open}"><span class="stars">${'*'.repeat(s.level)}</span><span class="ttl">${esc(s.title)}</span><span class="fold">${open ? '' : '…'}</span><span class="tagline">${s.tags.length ? `:${esc(s.tags.join(':'))}:` : ''}</span></button><div class="body">${shells(s.blocks, c)}</div></section>`;
    }
    h += '</div></section>';
  }
  $('doc').innerHTML = h;
  for (const ta of document.querySelectorAll('textarea[data-ta]')) { ta.value = S.blocks.get(ta.dataset.ta).text; }
  mountPython();
}
// :live python blocks belong to ide/stacks/python/ (another part of the IDE); their notes feed the same views. No folder, no harm.
async function mountPython() {
  const els = [...document.querySelectorAll('[data-pylive]')];
  if (!els.length) return;
  let mod;
  try { mod = await import(new URL('python/live.mjs', import.meta.url)); } catch (e) { for (const el of els) el.innerHTML = '<div class="lab">python cells are not available here</div>'; return; }
  for (const el of els) {
    const block = S.blocks.get(el.dataset.pylive);
    if (!block) continue;
    const card = S.cardOf.get(block.id);
    try { await mod.mountLive(el, block, { cardId: card?.id ?? 'card', plain: STUDENT, onNotes(events) { S.py = { cardId: card?.id ?? 'card', events }; S.usePy = true; refresh(); } }); } catch (e) { console.error('python', e); }
  }
}
// a block marked :beside sits next to the one after it (a TERM / EQUATION table beside its PyTorch)
function shells(blocks, card) {
  let h = '';
  for (let k = 0; k < blocks.length; k++) {
    const b = blocks[k];
    if (b.args?.beside && blocks[k + 1]) { h += `<div class="pair">${blockShell(b, card)}${blockShell(blocks[k + 1], card)}</div>`; k++; }
    else h += blockShell(b, card);
  }
  return h;
}
const pyHighlight = (t) => esc(t).replace(/(#[^\n]*)/g, '<span class="t-c">$1</span>').replace(/\b(import|from|as|def|return|for|in|with|torch|nn|F)\b/g, '<span class="t-k">$1</span>').replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="t-n">$1</span>');
function blockShell(b, card) {
  if (b.type === 'prose') {
    // a line that states the shape of the model is a caption, not a paragraph
    const model = /^MODEL\b/.test(b.text);
    return `<p class="prose${model ? ' model' : ''}" data-b="${b.id}">${card ? inline(b.text, card) : esc(b.text)}</p>`;
  }
  if (b.type === 'src' && !isVau(b) && b.args.live) return `<div class="src py live" data-b="${b.id}" data-pylive="${b.id}"></div>`;
  if (b.type === 'src' && !isVau(b)) {
    if (STUDENT) return `<div class="src py" data-b="${b.id}"><div class="src-h"><span class="nm">${esc(b.args.caption ?? 'Python')}</span></div><pre class="code">${pyHighlight(b.text)}\n</pre></div>`;
    return `<div class="src py" data-b="${b.id}"><div class="src-h"><span>#+begin_src ${esc(b.lang)}</span><span class="nm">${esc(b.args.caption ?? 'the PyTorch you would write')}</span><span class="st">shown, not run here</span></div><pre class="code">${pyHighlight(b.text)}\n</pre></div>`;
  }
  // the page a student reads carries the model's numbers, not the machine's own source
  if (STUDENT && (b.type === 'src' || b.type === 'watch')) return b.type === 'src' && b.args.run ? `<div class="src quiet" data-b="${b.id}"><div class="res-run" data-res="${b.id}"></div></div>` : '';
  if (b.type === 'src') {
    const folded = !isOpen(b.id, !b.args.folded);
    return `<div class="src${folded ? ' folded' : ''}" data-b="${b.id}"><div class="src-h" data-h="${b.id}"></div>
      <div class="ed"><pre class="code" data-pre="${b.id}" aria-hidden="true"></pre><textarea class="code" data-ta="${b.id}" spellcheck="false" wrap="off" aria-label="code${b.name ? ` ${esc(b.name)}` : ''}"></textarea></div>
      ${b.args.run ? `<div class="res-run" data-res="${b.id}"></div>` : ''}</div>`;
  }
  return `<div data-b="${b.id}" data-dyn="${b.type}"></div>`;
}

// ---------------------------------------------------------------- refreshing what changes
function refresh({ light = false } = {}) {
  const r = S.sel;
  S.now = r ? r.now() : null;
  for (const b of S.blocks.values()) {
    const card = S.cardOf.get(b.id);
    if (b.type === 'src') { if (isVau(b)) { if (STUDENT) { if (b.args.run) drawResult(b, card); } else drawSrc(b, card); } }
    else if (b.type === 'diagram') drawDiagramBlock(b, card);
    else if (b.type === 'table') drawTable(b, card);
    else if (b.type === 'view') drawView(b, card);
    else if (b.type === 'watch' && !light) drawWatch(b, card);
    else if (b.type === 'ui') drawUi(b, card);
    else if (b.type === 'proposal') drawProposal(b, card);
  }
  drawSide(light);
}
function markFor(b) {
  const n = S.now;
  if (!n?.mark || n.mark.blockId !== b.id) {
    // a proposal shows the forked run's place in its own text
    if (b.type === 'proposal' && n?.mark && S.proposals.get(b.id)?.target === n.mark.blockId && S.sel?.proposal === b.id) {
      return [{ from: n.mark.from, to: n.mark.to, cls: n.mark.note ? 'note' : n.mark.ret ? 'ret' : '' }];
    }
    return [];
  }
  const src = S.engine.sources.find((x) => x.blockId === n.mark.blockId && x.cardId === n.mark.cardId && x.version === n.mark.version);
  if (S.sel?.proposal && S.proposals.get(S.sel.proposal)?.target === b.id) return [];
  if (!src || src.text !== b.text) return [{ from: 0, to: 0, cls: 'old', old: true }];
  return [{ from: n.mark.from, to: n.mark.to, cls: n.mark.note ? 'note' : n.mark.ret ? 'ret' : '' }];
}
function drawSrc(b, card) {
  if (STUDENT) return;
  const pre = document.querySelector(`[data-pre="${b.id}"]`), ta = document.querySelector(`[data-ta="${b.id}"]`);
  if (!pre) return;
  const marks = markFor(b);
  const old = marks.find((k) => k.old);
  pre.innerHTML = highlight(b.text, marks.filter((k) => !k.old));
  ta.style.width = `${pre.scrollWidth}px`; ta.style.height = `${pre.scrollHeight}px`;
  const st = S.status.get(b.id);
  const runs = S.runsOf.get(b.id);
  let status;
  if (S.dirty.has(b.id)) status = `<span class="st mod">modified · ${b.args.run ? '⌘↵ runs it anew' : 'C-c C-c or ⌘↵ applies it live'}</span>`;
  else if (st?.error) status = `<span class="st bad">${esc(st.error)}</span>`;
  else if (b.args.run) status = `<span class="st ok">${runs?.length ? 'runs below' : ''}</span>`;
  else if (st?.defined?.length) status = `<span class="st ok">defines ${esc(st.defined.slice(0, 8).join(' · '))}${st.defined.length > 8 ? ` · +${st.defined.length - 8}` : ''}</span>`;
  else status = '<span class="st ok">applied</span>';
  const folded = document.querySelector(`.src[data-b="${b.id}"]`).classList.contains('folded');
  const args = Object.entries(b.args).map(([k, v]) => (v === true ? `:${k}` : `:${k} ${v}`)).join(' ');
  document.querySelector(`[data-h="${b.id}"]`).innerHTML = `<span>#+begin_src ${esc(b.lang)}${args ? ` ${esc(args)}` : ''}</span>${b.name ? `<span class="nm">#+name: ${esc(b.name)}</span>` : ''}
    ${b.args.run ? `<button class="btn pri" data-run="${b.id}" title="Start a new run of this block (⌘↵)">▶ run anew</button>` : `<button class="btn" data-apply="${b.id}" title="Apply this block's definitions to the running machine (C-c C-c or ⌘↵)">C-c C-c apply live</button>`}
    <button class="btn" data-foldsrc="${b.id}">${folded ? 'show' : 'hide'}</button>${old ? '<span class="hint">the machine is in the version applied before your edit</span>' : ''}${status}`;
  const el = document.querySelector(`.src[data-b="${b.id}"]`);
  el.classList.toggle('dirty', S.dirty.has(b.id));
  el.classList.toggle('err', !!st?.error);
  if (b.args.run) drawResult(b, card);
}
function drawResult(b, card) {
  const el = document.querySelector(`[data-res="${b.id}"]`);
  if (!el) return;
  const runs = (S.runsOf.get(b.id) ?? []).filter((x) => !x.hidden);
  const r = runs.includes(S.sel) ? S.sel : runs.filter((x) => !x.retired).at(-1);
  if (!r) { el.innerHTML = '<div class="lab">not run yet</div>'; return; }
  const selected = r === S.sel;
  el.classList.toggle('sel', selected);
  const n = selected ? S.now : r.now();
  const chips = runs.filter((x) => !x.retired || x === r).map((x) => `<button class="branch${x === r ? ' on' : ''}" data-selrun="${x.id}" title="${x.parent ? `forked at state ${x.forkAt.toLocaleString('en-US')}` : ''}">${esc(x.label)}</button>`).join('');
  const btn = (k) => `<button class="btn${k === (STUDENT ? 'end' : 'step') ? ' pri' : ''}" data-act="${k}" data-run="${r.id}" title="${esc(ACTIONS[k].title)}">${ACTIONS[k].label}</button>`;
  const clip = (t, n) => (t.length > n ? `${t.slice(0, n)} …` : t);
  const where = r.done ? `<b>${esc(clip(pretty(r.value), 240))}</b>` : STUDENT ? '' : `${esc(n.label)} <b>${esc(pretty(n.code).slice(0, 160))}</b>`;
  const forkbox = S.forking && S.forking.runId === r.id
    ? `<div class="forkbox">${STUDENT ? 'go on from here with this value instead' : 'resume the rest of the computation with'} <input value="${esc(S.forking.value)}" data-forkin="${r.id}" aria-label="the value to resume with"> <button class="btn pri" data-forkgo="${r.id}">fork</button><button class="btn" data-forkno="1">cancel</button>${r.parent ? '' : '<span class="lab">the old run keeps its own value</span>'}</div>` : '';
  const stop = r.stop && !r.done ? `<div class="stopq">stopped: ${esc(r.stop.printed)} · go on with <input data-answer="${r.id}" placeholder="a value, e.g. 0" aria-label="the value to go on with"> <button class="btn pri" data-answergo="${r.id}">answer</button></div>` : '';
  const views = b.args.view === 'reads' ? readsView({ ...S.data.get(card.id), events: r.events.filter((e) => e.idx <= r.idx) }) : '';
  const many = chips.split('</button>').length > 2;
  el.innerHTML = `<div class="row">${STUDENT ? (many ? `<span class="branches">${chips}</span>` : '') : `<span class="lab">#+results: ${selected ? 'selected' : 'click to select'}</span><span class="branches">${chips}</span>`}</div>
    <div class="row">${(STUDENT ? ['end', 'step', 'back', 'fork'] : ['back', 'step', 'over', 'out', 'score', 'row', 'end', 'fork']).map(btn).join('')}<button class="btn" data-act="restart" data-run="${r.id}" title="A new run from the first state">${STUDENT ? '↺' : '⟲'}</button></div>
    <div class="val">${r.done ? (STUDENT ? where : `value · ${where}`) : `${STUDENT ? `number ${seen(r)}` : `state ${r.idx.toLocaleString('en-US')}`}${where ? ` · ${where}` : ''}`}</div>${forkbox}${stop}${views}`;
  el.dataset.resrun = r.id;
}
function tableShape(b, card) {
  const sparse = b.args?.rows === 'features';
  const header = b.header ?? b.rows[0].map((_, j) => `c${j}`);
  if (!sparse) return { header, rows: b.rows.map((r, i) => ({ key: r[0], cells: r.slice(1), at: i })) };
  const feats = S.data.get(card.id)?.features ?? [];
  return { header, rows: feats.map((f) => { const at = b.rows.findIndex((r) => r[0] === f); return { key: f, cells: at >= 0 ? b.rows[at].slice(1) : header.slice(1).map(() => '0'), at }; }) };
}
function drawTable(b, card) {
  const el = document.querySelector(`[data-b="${b.id}"]`);
  if (!el || el.contains(document.activeElement)) return;
  if (!b.name) {   // a table with no name is for reading: TERM / EQUATION, SYMBOLS, MODEL
    if (el.dataset.drawn) return;
    el.dataset.drawn = '1';
    el.className = 'tbl plain';
    el.innerHTML = `<table class="doc">${b.header ? `<tr>${b.header.map((c) => `<th>${inline(c, card)}</th>`).join('')}</tr>` : ''}${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, card)}</td>`).join('')}</tr>`).join('')}</table>`;
    return;
  }
  const open = isOpen(b.id, !b.args?.folded);
  const { header, rows } = tableShape(b, card);
  const nz = (v) => v !== '0' && v !== '' && Number(toNumber(v)) !== 0;
  const st = S.status.get(b.id);
  el.className = `tbl${open ? '' : ' folded'}`;
  el.innerHTML = `<button class="cap" data-foldtbl="${b.id}" aria-expanded="${open}">${STUDENT ? `<b>${esc(b.name ?? '')}</b> · ${rows.length}×${header.length - 1}` : `#+name: <b>${esc(b.name ?? '')}</b> ${b.args?.rows ? '· absent rows are zero' : ''} · ${rows.length}×${header.length - 1}`} ${open ? '▾' : '▸ show'} ${st?.error ? `<span class="st bad">${esc(st.error)}</span>` : ''}</button>
    <div class="scroll"><table class="m ed"><tr><th></th>${header.slice(1).map((c) => `<th>${esc(c)}</th>`).join('')}</tr>
    ${rows.map((r, ri) => `<tr><th class="rl">${esc(r.key)}</th>${r.cells.map((v, ci) => `<td><input data-tb="${b.id}" data-r="${ri}" data-c="${ci}" class="${nz(v) ? 'nz' : 'z'}" value="${esc(v)}" inputmode="decimal" aria-label="${esc(b.name)} ${esc(r.key)} ${esc(header[ci + 1])}"></td>`).join('')}</tr>`).join('')}</table></div>`;
}
function editTable(b, ri, ci, value) {
  const card = S.cardOf.get(b.id);
  const { rows, header } = tableShape(b, card);
  const row = rows[ri];
  const v = value.trim() || '0';
  if (row.at >= 0) b.rows[row.at][ci + 1] = v;
  else b.rows.push([row.key, ...header.slice(1).map((_, j) => (j === ci ? v : '0'))]);
  if (b.args?.rows === 'features') b.rows = b.rows.filter((r) => r.slice(1).some((c) => Number(toNumber(c)) !== 0));
  rebindTable(b);
}
function drawView(b, card) {
  const el = document.querySelector(`[data-b="${b.id}"]`);
  const r = S.sel && S.sel.cardId !== undefined && (S.sel.cardId === card.id || S.sel.proposal) ? S.sel : null;
  const data = S.data.get(card.id);
  const py = S.usePy && S.py?.cardId === card.id;
  const events = py ? S.py.events : r ? r.events.filter((e) => e.idx <= r.idx) : [];
  const cursor = !py && r && S.now?.kind === 'Y' ? events.at(-1) : null;
  const tk = [...events].reverse().find((e) => e.kind === 'tokens');
  el.innerHTML = renderView(b, { ...data, ...(tk ? { tokens: tk.info.map(String) } : {}), events, was: r ? wasEvents(r) : null, sel: S.cell, cursor, plain: STUDENT });
}
function drawWatch(b, card) {
  const el = document.querySelector(`[data-b="${b.id}"]`);
  if (!el) return;
  const lines = b.text.split('\n').map((l) => l.trim()).filter(Boolean);
  const r = S.sel && S.sel.cardId === card.id ? S.sel : null;
  const vals = lines.map((l) => {
    if (S.playing) return { text: '…' };
    const got = r ? r.eval(l) : S.engine.show(card.id, l);
    return got.error ? { error: got.stop?.kind === 'unbound' ? `${got.stop.name} is not bound here` : got.error } : { text: got.text };
  });
  el.className = 'blk';
  el.innerHTML = `<div class="blk-h">#+begin_watch <span>made by selecting a form in the code and pressing w</span><span class="r">${r ? `at state ${r.idx.toLocaleString('en-US')}` : 'in the card'}</span></div>
    <div class="watch-l">${lines.map((l, k) => `<span class="f">${esc(l)}</span><span class="v${vals[k].error ? ' e' : ''}">${vals[k].error ? esc(vals[k].error) : `= ${esc(pretty(vals[k].text))}`}</span><button data-unwatch="${b.id}" data-k="${k}" title="Stop watching this">×</button>`).join('')}</div>
    <div class="watch-add"><input data-watchin="${b.id}" placeholder="type a form to watch, or select one in the code and press w" aria-label="add a watch"></div>`;
}
function addWatch(card, form) {
  let b = blocksOf(card).find((x) => x.type === 'watch');
  if (!b) {
    b = { id: `w${Date.now()}`, type: 'watch', args: {}, text: '' };
    const sec = card.sections.at(-1) ?? null;
    (sec ? sec.blocks : card.intro).push(b);
    S.blocks.set(b.id, b); S.cardOf.set(b.id, card);
    build();
  }
  const lines = b.text.split('\n').filter((l) => l.trim());
  if (!lines.includes(form)) lines.push(form);
  b.text = lines.join('\n');
  toast(`watching ${form}`);
  refresh();
}
function drawUi(b, card) {
  const el = document.querySelector(`[data-b="${b.id}"]`);
  if (el.contains(document.activeElement)) return;
  el.className = 'blk';
  const ws = readUi(b.text);
  el.innerHTML = `${STUDENT ? '' : `<div class="blk-h">#+begin_ui <span>binds ${esc(ws.map((w) => w.name).join(', '))} in the card</span></div>`}${ws.map((w) => {
    const v = b.values?.[w.name] ?? w.init;
    return `<div class="ui-l"><b>${esc(w.name)}</b><input type="range" min="${toNumber(w.min)}" max="${toNumber(w.max)}" step="${toNumber(w.step)}" value="${toNumber(v)}" data-ui="${b.id}" data-name="${esc(w.name)}" aria-label="${esc(w.name)}"><span>${esc(w.name)} = ${num(toNumber(v))}</span></div>`;
  }).join('')}`;
}
function drawProposal(b, card) {
  const el = document.querySelector(`[data-b="${b.id}"]`);
  const p = S.proposals.get(b.id);
  const target = blocksOf(card).find((x) => x.name === b.args.replaces);
  const tl = (target?.text ?? '').split('\n'), pl = b.text.split('\n');
  const marks = markFor(b);
  let diff = '';
  if (marks.length && S.sel?.proposal === b.id) diff = highlight(b.text, marks);
  else {
    const both = new Set(tl.filter((l) => pl.includes(l)));
    const out = [];
    let i = 0, j = 0;
    while (i < tl.length || j < pl.length) {
      if (i < tl.length && j < pl.length && tl[i] === pl[j]) { out.push(`  ${esc(tl[i])}`); i++; j++; }
      else if (i < tl.length && !both.has(tl[i])) out.push(`<span class="del">- ${esc(tl[i++])}</span>`);
      else if (j < pl.length && !both.has(pl[j])) out.push(`<span class="add">+ ${esc(pl[j++])}</span>`);
      else { i++; j++; }
    }
    diff = out.filter((l, k, all) => !l.startsWith('  ') || all.slice(Math.max(0, k - 1), k + 2).some((x) => !x.startsWith('  '))).join('\n') || '<span class="lab">the same as the block is now</span>';
  }
  el.className = `blk prop${p?.accepted ? ' accepted' : ''}`;
  const sum = !p || (!p.fork && !p.error) ? 'running in a fork of this card…' : p.error ? `<span class="st bad">${esc(p.error)}</span>` : proposalSummary(card, p);
  el.innerHTML = `<div class="blk-h">${STUDENT ? '' : '#+begin_proposal '}<b>“${esc(b.args.title ?? '')}”</b>${STUDENT ? '' : `<span>replaces ${esc(b.args.replaces)}</span>`}<span class="r">${p?.fork ? (p.accepted ? 'accepted' : 'already ran in a fork') : ''}</span></div>
    ${STUDENT ? '' : `<pre class="diff code">${diff}</pre>`}<div class="sum">${sum}</div>
    ${p?.fork && !p.accepted ? `<div class="acts"><button class="btn pri" data-accept="${b.id}">accept</button><button class="btn" data-openfork="${b.id}">open the fork</button><button class="btn" data-stepfork="${b.id}">step through it</button></div>` : ''}`;
}

// ---------------------------------------------------------------- the diagram: a view of the buffer you can click through
const evVec = (e) => (e.kind === 'norm' || e.kind === 'resid' ? [e.info[1], e.info[2]] : e.kind === 'head' ? [e.info[1], e.info[2]] : e.kind === 'ffn' ? [e.info[0], e.info[2]] : e.kind === 'weights' ? [e.info[1], e.info[3]] : e.kind === 'score' ? [e.info[1], [e.info[3]]] : e.kind === 'predict' ? [e.info[0], [e.info[2]]] : Array.isArray(e.info[1]) ? [e.info[0], e.info[1]] : [null, null]);
function evSummary(e, tokens) {
  const [i, v] = evVec(e);
  const name = (k) => { const t = tokens[k] ?? k; return /^\d+$/.test(String(t)) ? `i = ${t}` : t; };
  const tok = i === null || i === undefined ? '' : `${name(i)}: `;
  if (e.kind === 'weights') { const j = v.indexOf(Math.max(...v)); return `${tok}${S.headCount > 1 ? `head ${e.info[0] + 1} ` : ''}most weight on ${String(name(j)).replace('i = ', 'j = ')}, ${num(v[j])}`; }
  if (e.kind === 'score') return `${tok}score with ${tokens[e.info[2]] ?? e.info[2]} = ${num(e.info[3])}`;
  if (e.kind === 'predict') return `after ${tokens[e.info[0]] ?? ''}: ${e.info[1]} at p = ${num(e.info[2])}`;
  if (!Array.isArray(v)) return tok;
  return `${tok}${v.slice(0, 4).map(num).join(' ')}${v.length > 4 ? ' …' : ''}`;
}
function diagramState(b, card) {
  const d = readDiagram(b.text);
  const r = S.sel && S.sel.cardId === card.id ? S.sel : S.sel?.proposal || S.sel?.ckpt ? S.sel : null;
  const events = r ? r.events.filter((e) => e.idx <= r.idx) : [];
  const tk = [...events].reverse().find((e) => e.kind === 'tokens');
  const tokens = tk ? tk.info.map(String) : S.data.get(card.id)?.tokens ?? [];
  const values = {};
  for (const [id, box] of d.boxes) { const e = [...events].reverse().find((x) => noteMatches(box, x)); if (e) values[id] = evSummary(e, tokens); }
  let active = null;
  if (r && !r.done) {
    const markName = S.now?.mark ? S.blocks.get(S.now.mark.blockId)?.name : null;
    const cands = [...d.boxes.values()].filter((x) => markName && x.block === markName);
    const pool = cands.length ? cands : [...d.boxes.values()];
    if (cands.length === 1) active = cands[0].id;
    else for (let k = events.length - 1; k >= 0 && !active; k--) { const hit = pool.find((x) => noteMatches(x, events[k])); if (hit) active = hit.id; }
  }
  let training = null, lossSeries = null;
  if (S.training && b.args.training) {
    training = {};
    for (const [id, box] of d.boxes) if (box.parts.length) training[id] = S.training.series.map((p) => box.parts.reduce((a, k) => a + (p.moved[k] ?? 0), 0));
    lossSeries = S.training.series.map((p) => p.loss);
  }
  return { d, r, events, tokens, values, active, training, lossSeries };
}
function drawDiagramBlock(b, card) {
  const el = document.querySelector(`[data-b="${b.id}"]`);
  const st = diagramState(b, card);
  const sel = S.dsel.get(b.id) ?? null;
  el.className = 'blk dgm';
  const r = st.r;
  const ctl = r ? `<div class="row dg-ctl">${(STUDENT ? ['end', 'step', 'back'] : ['back', 'step', 'score', 'row', 'end'].filter((k) => k !== 'score' || st.d.boxes.size)).map((k) => `<button class="btn${k === (STUDENT ? 'end' : 'step') ? ' pri' : ''}" data-act="${k}" data-run="${r.id}" title="${esc(ACTIONS[k].title)}">${ACTIONS[k].label}</button>`).join('')}<span class="lab">${r.done ? 'finished' : STUDENT ? `number ${seen(r)}` : `step ${r.idx.toLocaleString('en-US')} · ${esc(blockOfRun(r)?.name ?? r.label)}`}</span></div>` : '';
  S.headCount = new Set(st.events.filter((e) => e.kind === 'weights').map((e) => e.info[0])).size;
  el.innerHTML = `${STUDENT
    ? ''
    : `<div class="blk-h"><b>${esc(b.args.title ?? 'diagram')}</b> <span>· click a box to see its numbers; the lit box is the step you are on</span><span class="r"><button class="btn" data-dedit="${b.id}">${S.open.has(`${b.id}:text`) ? 'hide the text' : 'the text'}</button></span></div>`}
    ${STUDENT ? '' : ctl}<div class="dg-wrap">${drawDiagram(st.d, { ...st, selected: sel })}</div>${STUDENT ? ctl : ''}${sel ? diagramDetail(b, card, st, sel) : ''}
    ${!STUDENT && S.open.has(`${b.id}:text`) ? `<textarea class="code dg-text" data-dtext="${b.id}" spellcheck="false" wrap="off" rows="${b.text.split('\n').length + 1}">${esc(b.text)}</textarea>` : ''}`;
}
function diagramDetail(b, card, st, sel) {
  const isSkip = sel.startsWith('skip:');
  const skip = isSkip ? st.d.skips.find((x) => `skip:${x.label}` === sel) : null;
  const box = isSkip ? st.d.boxes.get(skip.to) : st.d.boxes.get(sel);
  if (!box) return '';
  const rows = [];
  for (let i = 0; i < st.tokens.length; i++) {
    const e = [...st.events].reverse().find((x) => noteMatches(box, x) && evVec(x)[0] === i);
    if (e) rows.push(`<div><b>${esc(st.tokens[i])}</b> ${esc(evSummary(e, st.tokens).replace(/^[^:]*: /, ''))}</div>`);
  }
  let h = `<div class="dg-detail"><div class="row"><b>${esc(isSkip ? `${skip.label}: the residual wire into ${box.label}` : box.label)}</b>${box.block ? `<button class="btn" data-dopen="${esc(box.block)}">open ${esc(box.block)} ↓</button>` : ''}${box.tables.length ? `<span class="lab">owns ${esc(box.tables.join(', '))}</span>` : '<span class="lab">no weights of its own</span>'}</div>
    <div class="reads">${rows.join('') || '<div class="lab">nothing here yet at this step: step the run, or press “next row”</div>'}</div>`;
  if (S.training && b.args.training && box.parts.length) {
    const cps = S.training.checkpoints;
    const k = S.ckpt.get(b.id) ?? cps.length - 1;
    const cp = cps[k];
    const series = S.training.series.map((p) => box.parts.reduce((a, q) => a + (p.moved[q] ?? 0), 0));
    const max = Math.max(...series, 1e-9);
    h += `<div class="dg-train"><div class="lab">training: how far ${esc(box.label)}'s weights moved every 50 steps</div>
      <svg viewBox="0 0 300 40" class="dg-big"><polyline points="${series.map((v, i) => `${(i / (series.length - 1)) * 300},${38 - (v / max) * 36}`).join(' ')}" class="dg-sp"/>${cps.map((c) => `<line x1="${(c.step / S.training.series.at(-1).step) * 300}" x2="${(c.step / S.training.series.at(-1).step) * 300}" y1="0" y2="40" class="dg-ck"/>`).join('')}</svg>
      <div class="row"><span class="lab">checkpoint</span><input type="range" min="0" max="${cps.length - 1}" value="${k}" data-ckpt="${b.id}" aria-label="training checkpoint"><span>step ${cp.step.toLocaleString('en-US')} · held-out loss ${num(cp.loss)}</span>
      <button class="btn pri" data-ckrun="${b.id}" data-k="${k}">run the word with the weights at step ${cp.step.toLocaleString('en-US')}</button></div>
      ${box.tables.map((t) => miniHeat(t, cp.tables[t])).join('')}</div>`;
  }
  return `${h}</div>`;
}
function miniHeat(name, rows) {
  if (!rows) return '';
  const vals = rows.flatMap((r) => r.slice(1).map(Number));
  const max = Math.max(...vals.map(Math.abs), 1e-9);
  return `<div class="mh"><span class="lab">${esc(name)}</span><table class="m">${rows.map((r) => `<tr><th class="rl">${esc(r[0])}</th>${r.slice(1).map((v) => { const x = Number(v); return `<td title="${esc(v)}" style="background:color-mix(in srgb, var(${x > 0 ? '--pos' : '--neg'}) ${Math.round((Math.abs(x) / max) * 60)}%, transparent)"></td>`; }).join('')}</tr>`).join('')}</table></div>`;
}
async function runCheckpoint(b, card, k) {
  const cp = S.training.checkpoints[k];
  const target = runNamed(card, b.args.runs ?? '') ?? mainRun(card);
  if (!target) return;
  await busy(`running the word with the weights from step ${cp.step}…`, () => {});
  const fc = S.engine.forkCard(card.id);
  applyCard(S.engine, card, fc.id, new Map());
  for (const [name, rows] of Object.entries(cp.tables)) S.engine.bindTable(fc.id, name, { rows });
  const got = S.engine.run(fc.id, target.id, target.text);
  if (got.error) { toast(got.error); return; }
  const r = got.run;
  r.ckpt = cp.step; r.label = `weights at step ${cp.step}`; r.breaks = new Set(S.breaks);
  await slices(r);
  (S.runsOf.get(target.id) ?? S.runsOf.set(target.id, []).get(target.id)).push(r);
  const cur = (S.runsOf.get(target.id) ?? []).filter((x) => !x.parent && !x.proposal && !x.ckpt).at(-1);
  if (cur) { if (!cur.done) await slices(cur); S.wasOf.set(r.id, cur.events); }
  S.sel = r;
  toast(`the same word, with the weights as they were at step ${cp.step}: “was” shows the trained model's numbers`);
  refresh();
}
function openBlockNamed(card, name) {
  const target = blocksOf(card).find((x) => x.name === name);
  if (!target) { toast(`no block is called ${name}`); return; }
  const sec = card.sections.find((s) => s.blocks.includes(target));
  if (sec) { S.open.add(sec.id); S.shut.delete(sec.id); }
  S.open.add(target.id); S.shut.delete(target.id);
  build(); refresh();
  const el = document.querySelector(`[data-b="${target.id}"]`);
  el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el?.classList.add('flash'); setTimeout(() => el?.classList.remove('flash'), 1600);
}

// ---------------------------------------------------------------- the side panel
function drawSide(light) {
  const r = S.sel, n = S.now;
  if (!r) { $('now').textContent = 'no run selected'; return; }
  const b = blockOfRun(r);
  $('runinfo').textContent = `${b?.name ?? (r.proposal ? 'proposal' : 'run')} · ${r.label}`;
  const runs = (S.runsOf.get(r.blockId) ?? []).filter((x) => !x.hidden && (!x.retired || x === r));
  $('side-branches').innerHTML = runs.map((x) => `<button class="branch${x === r ? ' on' : ''}" data-selrun="${x.id}">${esc(x.label)}</button>`).join('');
  const sc = $('scrub');
  sc.min = n.first; sc.max = Math.max(n.frontier, n.first); sc.value = n.idx;
  $('scrubv').textContent = `${n.idx.toLocaleString('en-US')} / ${n.frontier.toLocaleString('en-US')}${r.done ? '' : '+'}`;
  const span = Math.max(1, n.frontier - n.first);
  $('ticks').innerHTML = r.events.filter((e) => e.kind === 'weights').map((e) => `<i style="left:${((e.idx - n.first) / span) * 100}%" title="row ${e.info[1]} of head ${e.info[0] + 1}"></i>`).join('');
  $('side-ctrls').innerHTML = ['back', 'step', 'over', 'out', 'score', 'row', 'end', 'fork'].map((k) => `<button class="btn${k === 'step' ? ' pri' : ''}" data-act="${k}" data-run="${r.id}" title="${esc(ACTIONS[k].title)}">${ACTIONS[k].label}</button>`).join('');
  const note = n.kind === 'Y' && /^\(%note /.test(n.code);
  $('now').className = `now${r.stop && !note ? ' err' : ''}`;
  $('now').innerHTML = r.done ? `finished with <span class="v">${esc(pretty(r.value).slice(0, 240))}${r.value.length > 240 ? ' …' : ''}</span>`
    : note ? `a note: <span class="v">${esc(pretty(n.code.replace(/^\(%note /, '(')).slice(0, 300))}</span><br><span class="keys">f forks here with another value for it</span>`
      : `state ${n.idx.toLocaleString('en-US')} · ${esc(n.label)} <span class="v">${esc(pretty(n.code).slice(0, 300))}</span>`;
  $('kont').innerHTML = n.next.length ? n.next.map((s) => (s.fold ? `<div class="fold">… ${s.fold} step${s.fold > 1 ? 's' : ''} inside the language (map, $let*, …)</div>` : `<div><span class="fn">${esc(s.label)}</span>${esc(pretty(s.code)).replace(/●/g, '<span class="hole">●</span>')}</div>`)).join('') + (n.more ? `<div class="fold">… and ${n.more} more</div>` : '') : '<div class="fold">nothing: this is the end</div>';
  $('frames').innerHTML = n.chain.map((f) => `<div class="fr ${f.kind}"><span class="k">${f.kind === 'local' ? 'a call’s frame' : f.kind}</span>${f.kind === 'card' ? `card · ${esc(f.label)}` : f.kind === 'local' ? f.names.map((x) => `<span class="kv"><b>${esc(x.name)}</b> = ${esc(pretty(x.value).slice(0, 70))}</span>`).join(' · ') || '(empty)' : `↑ ${esc(f.label)}`}</div>`).join('') || '<div class="fr">the card</div>';
  if (!light) {
    const card = S.cardOf.get(r.blockId) ?? S.doc.cards[0];
    const names = new Set();
    for (const b2 of blocksOf(card)) if (b2.type === 'src' && b2.args.step !== 'over') for (const d of S.status.get(b2.id)?.defined ?? []) if (!['features', 'tokens', 'n', 'dk', 'heads', 'b1'].includes(d)) names.add(d);
    for (const d of ['softmax', 'project', 'exp']) names.add(d);
    $('brks').innerHTML = [...names].map((d) => `<button class="btn${r.breaks.has(d) ? ' on' : ''}" data-brk="${esc(d)}">${esc(d)}</button>`).join('');
  }
  $('mwhere').textContent = r.done ? 'in the card' : `in the frame at state ${n.idx.toLocaleString('en-US')}`;
  $('b-play').textContent = S.playing ? '❚❚ pause' : '▶ play';
}

// ---------------------------------------------------------------- playing
function play() {
  if (S.playing) { S.playing = false; refresh(); return; }
  if (!S.sel || S.sel.done) return;
  S.playing = true;
  const tick = () => {
    if (!S.playing) return;
    const r = S.sel, mode = $('speed').value;
    let res = 'hit';
    if (mode === 'step') res = r.step();
    else if (mode === 'step8') for (let k = 0; k < 8 && res === 'hit'; k++) res = r.step();
    else res = r.toEvent([mode]);
    if (res !== 'hit') { S.playing = false; if (res === 'break') toast('stopped at a break'); }
    refresh({ light: S.playing });
    if (S.playing) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------- the line: M-:
function evalLine(text) {
  if (!text.trim()) return;
  S.history.push(text); S.hpos = S.history.length;
  const r = S.sel;
  const card = r ? S.doc.cards.find((c) => c.id === r.cardId) ?? S.doc.cards[0] : S.doc.cards[0];
  const got = r ? r.eval(text) : S.engine.show(card.id, text);
  const out = $('mout');
  const approx = !got.error && pretty(got.text) !== got.text ? `  ≈ ${pretty(got.text)}` : '';
  out.innerHTML = `<div>${esc(text)} ⇒ ${got.error ? `<span class="e">${esc(got.error)}</span>` : esc(got.text) + esc(approx)}</div>${out.innerHTML}`.slice(0, 20000);
  refresh();
}
function complete(input) {
  const before = input.value.slice(0, input.selectionStart);
  const m = /[^\s()";]+$/.exec(before);
  const box = $('msugg');
  if (!m) { box.innerHTML = ''; return []; }
  const names = S.sel ? S.sel.names() : S.engine.names(S.doc.cards[0].id);
  const list = [...new Set(names)].filter((x) => x.startsWith(m[0]) && x !== m[0]).sort((a, b) => a.length - b.length).slice(0, 8);
  box.innerHTML = list.map((x) => `<button type="button" data-sugg="${esc(x)}">${esc(x)}</button>`).join('');
  return list.map((x) => [m[0], x]);
}

// ---------------------------------------------------------------- listening
function wire() {
  const doc = $('doc');
  doc.addEventListener('click', (e) => {
    const g = e.target.closest('[data-dbox], [data-dskip]');
    if (g) {
      const blk = g.closest('[data-b]').dataset.b, b = S.blocks.get(blk), card = S.cardOf.get(blk);
      const id = g.dataset.dbox ?? `skip:${g.dataset.dskip}`;
      S.dsel.set(blk, S.dsel.get(blk) === id ? null : id);
      refresh();
      return;
    }
    const t = e.target.closest('button, td[data-view], .res-run');
    if (!t) return;
    const d = t.dataset;
    if (d.dopen) { openBlockNamed(S.cardOf.get(t.closest('[data-b]').dataset.b), d.dopen); return; }
    if (d.dedit) { const k = `${d.dedit}:text`; if (S.open.has(k)) S.open.delete(k); else S.open.add(k); refresh(); return; }
    if (d.ckrun) { runCheckpoint(S.blocks.get(d.ckrun), S.cardOf.get(d.ckrun), Number(d.k)); return; }
    if (d.fold) { const open = isOpen(d.fold, true); (open ? S.shut : S.open).add(d.fold); (open ? S.open : S.shut).delete(d.fold); build(); refresh(); return; }
    if (d.foldsrc) { const b = S.blocks.get(d.foldsrc); const open = isOpen(b.id, !b.args.folded); (open ? S.shut : S.open).add(b.id); (open ? S.open : S.shut).delete(b.id); document.querySelector(`.src[data-b="${b.id}"]`).classList.toggle('folded', open); refresh(); return; }
    if (d.foldtbl) { const b = S.blocks.get(d.foldtbl); const open = isOpen(b.id, !b.args?.folded); (open ? S.shut : S.open).add(b.id); (open ? S.open : S.shut).delete(b.id); refresh(); return; }
    if (d.apply) { applyBlock(S.blocks.get(d.apply)); return; }
    if (d.run && t.matches('[data-run]:not([data-act])')) { applyBlock(S.blocks.get(d.run)); return; }
    if (d.act) { act(d.act, S.engine.runs.find((x) => x.id === Number(d.run))); return; }
    if (d.selrun) { S.sel = S.engine.runs.find((x) => x.id === Number(d.selrun)); S.cell = null; refresh(); return; }
    if (d.forkgo) { doFork(S.engine.runs.find((x) => x.id === Number(d.forkgo)), document.querySelector(`[data-forkin="${d.forkgo}"]`).value); return; }
    if (d.forkno) { S.forking = null; refresh(); return; }
    if (d.answergo) { const r = S.engine.runs.find((x) => x.id === Number(d.answergo)); doFork(r, document.querySelector(`[data-answer="${d.answergo}"]`).value || '0'); return; }
    if (d.unwatch) { const b = S.blocks.get(d.unwatch); const ls = b.text.split('\n').filter((l) => l.trim()); ls.splice(Number(d.k), 1); b.text = ls.join('\n'); refresh(); return; }
    if (d.accept) { accept(S.cardOf.get(d.accept), S.blocks.get(d.accept)); return; }
    if (d.openfork || d.stepfork) {
      const p = S.proposals.get(d.openfork ?? d.stepfork);
      S.sel = p.fork;
      if (d.stepfork) { p.fork.to(p.fork.checks[0].idx); p.fork.step(); }
      refresh();
      document.querySelector(`[data-b="${d.openfork ?? d.stepfork}"]`).scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (d.view) { const c = { view: d.view, i: Number(d.i), j: d.j !== undefined ? Number(d.j) : undefined, c: d.c !== undefined ? Number(d.c) : undefined }; S.cell = S.cell && S.cell.view === c.view && S.cell.i === c.i && S.cell.j === c.j && S.cell.c === c.c ? null : c; refresh(); return; }
    if (t.classList.contains('res-run') && t.dataset.resrun && S.sel?.id !== Number(t.dataset.resrun)) { S.sel = S.engine.runs.find((x) => x.id === Number(t.dataset.resrun)); refresh(); }
  });
  doc.addEventListener('input', (e) => {
    if (e.target.dataset?.ckpt) { S.ckpt.set(e.target.dataset.ckpt, Number(e.target.value)); refresh(); document.querySelector(`[data-ckpt="${e.target.dataset.ckpt}"]`)?.focus(); return; }
    if (e.target.dataset?.dtext) { const b = S.blocks.get(e.target.dataset.dtext); b.text = e.target.value; const box = e.target; const at = box.selectionStart; drawDiagramBlock(b, S.cardOf.get(b.id)); const n = document.querySelector(`[data-dtext="${b.id}"]`); n.focus(); n.setSelectionRange(at, at); return; }
    const ta = e.target.closest('textarea[data-ta]');
    if (ta) {
      const b = S.blocks.get(ta.dataset.ta);
      b.text = ta.value;
      S.dirty.add(b.id);
      drawSrc(b, S.cardOf.get(b.id));
    }
  });
  doc.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.tb) { editTable(S.blocks.get(t.dataset.tb), Number(t.dataset.r), Number(t.dataset.c), t.value); return; }
    if (t.dataset.ui) { t.blur(); setUi(S.blocks.get(t.dataset.ui), t.dataset.name, exact(Number(t.value))); }
  });
  doc.addEventListener('keydown', (e) => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.matches?.('[data-dbox], [data-dskip]')) { e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
    if (t.dataset?.watchin && e.key === 'Enter' && t.value.trim()) { addWatch(S.cardOf.get(t.dataset.watchin), t.value.trim()); return; }
    if (t.dataset?.forkin && e.key === 'Enter') { doFork(S.engine.runs.find((x) => x.id === Number(t.dataset.forkin)), t.value); return; }
    if (t.dataset?.forkin && e.key === 'Escape') { S.forking = null; refresh(); return; }
    if (t.dataset?.answer && e.key === 'Enter') { doFork(S.engine.runs.find((x) => x.id === Number(t.dataset.answer)), t.value || '0'); return; }
    if (t.dataset?.tb && e.key === 'Enter') { t.blur(); return; }
    if (!t.dataset?.ta) return;
    const b = S.blocks.get(t.dataset.ta);
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); applyBlock(b); return; }
    if (e.ctrlKey && e.key === 'c') {
      if (S.cc && Date.now() - S.cc < 1200) { e.preventDefault(); S.cc = 0; applyBlock(b); return; }
      S.cc = Date.now(); toast('C-c-', 1200); e.preventDefault(); return;
    }
    if (e.key === 'w' && !e.metaKey && !e.ctrlKey && !e.altKey && t.selectionEnd > t.selectionStart) {
      e.preventDefault();
      addWatch(S.cardOf.get(b.id), t.value.slice(t.selectionStart, t.selectionEnd).trim());
      return;
    }
    if (e.key === 'Tab') { e.preventDefault(); const at = t.selectionStart; t.setRangeText('  ', at, t.selectionEnd, 'end'); t.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  doc.addEventListener('select', (e) => { if (e.target.dataset?.ta && e.target.selectionEnd > e.target.selectionStart) toast('w watches the selection', 1500); }, true);

  // the side panel
  document.querySelector('.side').addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.act) { act(t.dataset.act, S.engine.runs.find((x) => x.id === Number(t.dataset.run))); return; }
    if (t.dataset.selrun) { S.sel = S.engine.runs.find((x) => x.id === Number(t.dataset.selrun)); refresh(); return; }
    if (t.dataset.brk) {
      const name = t.dataset.brk, on = !S.sel.breaks.has(name);
      if (on) S.breaks.add(name); else S.breaks.delete(name);
      for (const r of S.engine.runs) { if (on) r.breaks.add(name); else r.breaks.delete(name); }
      toast(on ? `break on ${name}: a run stops when it is called` : `no break on ${name}`);
      refresh();
    }
  });
  $('scrub').addEventListener('input', (e) => { if (!S.sel) return; S.sel.to(Number(e.target.value)); refresh({ light: true }); });
  $('scrub').addEventListener('change', () => refresh());
  $('b-play').addEventListener('click', play);
  $('b-theme').addEventListener('click', () => { const root = document.documentElement; root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; });
  $('b-save').addEventListener('click', save);

  // the line
  const min = $('min');
  min.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { evalLine(min.value); min.value = ''; $('msugg').innerHTML = ''; return; }
    if (e.key === 'Tab') { e.preventDefault(); const list = complete(min); if (list.length) { const [p, x] = list[0]; const at = min.selectionStart; min.setRangeText(x.slice(p.length), at, at, 'end'); $('msugg').innerHTML = ''; } return; }
    if (e.key === 'ArrowUp' && S.hpos > 0) { min.value = S.history[--S.hpos]; e.preventDefault(); return; }
    if (e.key === 'ArrowDown') { S.hpos = Math.min(S.history.length, S.hpos + 1); min.value = S.history[S.hpos] ?? ''; return; }
    if (e.key === 'Escape') { min.blur(); }
  });
  min.addEventListener('input', () => complete(min));
  $('msugg').addEventListener('mousedown', (e) => { const b = e.target.closest('[data-sugg]'); if (!b) return; e.preventDefault(); const list = complete(min); const hit = list.find(([, x]) => x === b.dataset.sugg); if (hit) { const at = min.selectionStart; min.setRangeText(hit[1].slice(hit[0].length), at, at, 'end'); } $('msugg').innerHTML = ''; });

  // keys, when no field has them
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.code === 'Semicolon' || e.key === ':')) { e.preventDefault(); min.focus(); return; }
    const t = e.target;
    if (t.matches?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    const keys = { ArrowRight: 'step', ArrowLeft: 'back', o: 'over', u: 'out', n: 'score', r: 'row', e: 'end', f: 'fork' };
    if (keys[e.key]) { e.preventDefault(); act(keys[e.key]); return; }
    if (e.key === ' ') { e.preventDefault(); play(); return; }
    if (e.key === ':') { e.preventDefault(); min.focus(); }
  });
}

async function save() {
  try {
    const token = (await (await fetch('/api/session')).json()).token;
    const call = async (path, init = {}) => { const res = await fetch(path, { ...init, headers: { 'x-vau-token': token, 'content-type': 'application/json' } }); const body = await res.json().catch(() => ({})); if (!res.ok && !body.conflict) throw new Error(body.error ?? `the server answered ${res.status}`); return body; };
    const root = (await call('/api/roots')).roots[0];
    const path = `${root.replace(/\/$/, '')}/ide/stacks/lessons/${S.file}`;
    let base = null;
    try { base = (await call(`/api/file?path=${encodeURIComponent(path)}`)).rev; } catch { /* a new file */ }
    const r = await call('/api/file', { method: 'PUT', body: JSON.stringify({ path, text: serialize(S.doc), base }) });
    toast(r.conflict ? 'the file changed on disk: save again to replace it' : `saved ${S.file}`);
  } catch (e) { toast(`could not save: ${e.message}`); }
}

if (!document.body.dataset.manual) start().catch((e) => { console.error(e); $('doc').innerHTML = `<div class="boot">This page did not start: ${esc(e.message)}</div>`; });
