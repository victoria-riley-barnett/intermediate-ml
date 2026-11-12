// Result views for the encoder lesson, drawn from a run's notes (the (note kind info v) yields the code makes).
// A view only reads: ctx.events are the notes up to the state the run is at, ctx.was the notes of the run it was forked from.
// Notes: embed (i vec) · score (h i j raw q k terms) · weights (h i scores w) · head (h i vec) · attn (i vec)
//        norm (which i vec) · ffn (i hidden out)
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const num = (v) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return esc(v);
  const r = Math.round(v * 100) / 100;
  return (Object.is(r, -0) ? 0 : r).toFixed(2).replace(/\.?0+$/, '') || '0';
};
const heat = (v, max) => {
  if (!v) return '';
  const a = Math.min(1, Math.abs(v) / (max || 1));
  return `background:color-mix(in srgb, var(${v > 0 ? '--pos' : '--neg'}) ${Math.round(a * 55)}%, transparent)`;
};
const last = (evs, pred) => { for (let k = evs.length - 1; k >= 0; k--) if (pred(evs[k])) return evs[k]; return null; };
const label = (t) => String(t).replace(/-/g, ' ');

// rows of vectors keyed by token: [{i, vec}] -> table with feature columns
function matrix({ rows, cols, tokens, view, sel, cur, wasRows }) {
  const max = Math.max(1, ...rows.flatMap((r) => (r ? r.vec.map(Math.abs) : [])));
  let h = `<table class="m"><tr><th></th>${cols.map((c) => `<th class="cl">${esc(label(c))}</th>`).join('')}</tr>`;
  tokens.forEach((t, i) => {
    const r = rows[i];
    h += `<tr class="${cur === i ? 'cur' : ''}"><th class="rl">${esc(t)}</th>`;
    if (!r) h += cols.map(() => '<td class="e">·</td>').join('');
    else h += r.vec.map((v, c) => {
      const was = wasRows?.[i]?.vec?.[c];
      const ghost = was !== undefined && Math.abs(was - v) > 0.005 ? `<span class="was">was ${num(was)}</span>` : '';
      const s = sel && sel.view === view && sel.i === i && sel.c === c;
      return `<td data-view="${view}" data-i="${i}" data-c="${c}" class="${s ? 'sel' : ''}" style="${heat(v, max)}">${num(v)}${ghost}</td>`;
    }).join('');
    h += '</tr>';
  });
  return `${h}</table>`;
}

const byToken = (evs, pick) => { const out = []; for (const e of evs) { const r = pick(e); if (r) out[r.i] = r; } return out; };

export function renderView(block, ctx) {
  const { events, tokens, features } = ctx;
  const kind = block.kind, a = block.args ?? {};
  const caption = block.text.trim();
  const curI = (() => { const e = last(events, (e) => ['score', 'weights', 'embed', 'attn', 'norm', 'ffn', 'head'].includes(e.kind)); if (!e) return null; return e.kind === 'norm' ? e.info[1] : e.kind === 'embed' || e.kind === 'attn' || e.kind === 'ffn' ? e.info[0] : e.info[1]; })();
  const head = (cap, extra = '') => `<div class="res-h">${ctx.plain ? esc(cap) : `#+results: ${esc(cap)}`} ${extra}</div>`;
  if (!tokens.length) return `<div class="view"><div class="empty">this view needs =tokens= and =features= bound in the card</div></div>`;

  if (kind === 'tokens') {
    return `<div class="view"><div class="sentence">${tokens.map((t, i) => `<span class="${curI === i ? 'cur' : ''}"><small>${i}</small>${esc(t)}</span>`).join('')}</div></div>`;
  }
  if (kind === 'matrix') {
    const of = a.of, which = a.which !== undefined ? Number(a.which) : null;
    if (of === 'score') {   // S: one row per query position i, one column per key position j
      const scale = a.scaled ? 1 : Number(a.times ?? 1);
      const rows = [], wasRows = [];
      for (const e of events) if (e.kind === 'score' && e.info[0] === Number(a.head ?? 0)) { (rows[e.info[1]] ??= { vec: tokens.map(() => undefined) }).vec[e.info[2]] = e.info[3] * scale; }
      for (const e of ctx.was ?? []) if (e.kind === 'score' && e.info[0] === Number(a.head ?? 0)) { (wasRows[e.info[1]] ??= { vec: [] }).vec[e.info[2]] = e.info[3] * scale; }
      const done = rows.filter(Boolean).length;
      const body = done ? matrix({ rows: rows.map((r) => r && { vec: r.vec.map((v) => v ?? 0) }), cols: tokens, tokens, view: block.id, sel: ctx.sel, cur: curI, wasRows: ctx.was ? wasRows : null }) : `<div class="empty">not computed yet: ${ctx.plain ? 'step the run to fill this in' : 'step the run below'}</div>`;
      return `<div class="view">${head(caption || 'S', `<span class="lab">${done}/${tokens.length} rows</span>`)}<div class="scroll">${body}</div></div>`;
    }
    const cols = a.cols ? String(a.cols).split(/\s+/) : features;
    const pick = (evs) => byToken(evs, (e) => {
      if (e.kind !== of) return null;
      // norm and resid are (which i vec): which = 1 before the feed-forward, 2 after it
      if (of === 'norm' || of === 'resid') return which === null || e.info[0] === which ? { i: e.info[1], vec: e.info[2] } : null;
      return { i: e.info[0], vec: e.info[1] };
    });
    const rows = pick(events), was = ctx.was ? pick(ctx.was) : null;
    const filled = rows.filter(Boolean).length;
    const body = filled ? matrix({ rows, cols, tokens, view: block.id, sel: ctx.sel, cur: curI, wasRows: was }) : `<div class="empty">not computed yet: ${ctx.plain ? 'step the run to fill this in' : 'step the run below, or press “next row”'}</div>`;
    return `<div class="view">${head(caption || of, `<span class="lab">${filled}/${tokens.length} rows</span>`)}<div class="scroll">${body}</div>${explainFor(block, ctx)}</div>`;
  }
  if (kind === 'attention') {
    const h = Number(a.head ?? 0);
    const weights = [], partial = [];
    for (const e of events) {
      if (e.kind === 'weights' && e.info[0] === h) weights[e.info[1]] = e.info[3];
      if (e.kind === 'score' && e.info[0] === h) { (partial[e.info[1]] ??= [])[e.info[2]] = e.info[3]; }
    }
    const was = [];
    if (ctx.was) for (const e of ctx.was) if (e.kind === 'weights' && e.info[0] === h) was[e.info[1]] = e.info[3];
    const pend = ctx.cursor && ctx.cursor.kind === 'score' && ctx.cursor.info[0] === h ? ctx.cursor.info : null;
    let t = `<table class="m"><tr><th></th>${tokens.map((w) => `<th class="cl">${esc(w)}</th>`).join('')}<th class="cl">row sum</th></tr>`;
    tokens.forEach((w, i) => {
      t += `<tr class="${pend && pend[1] === i ? 'cur' : ''}"><th class="rl">${esc(w)}</th>`;
      tokens.forEach((_, j) => {
        const sel = ctx.sel && ctx.sel.view === block.id && ctx.sel.i === i && ctx.sel.j === j ? ' sel' : '';
        const isPend = pend && pend[1] === i && pend[2] === j ? ' pend' : '';
        if (weights[i] && weights[i][j] === undefined) t += '<td class="e"></td>';
        else if (weights[i]) {
          const v = weights[i][j], old = was[i]?.[j];
          const ghost = old !== undefined && Math.abs(old - v) > 0.005 ? `<span class="was">was ${num(old)}</span>` : '';
          t += `<td data-view="${block.id}" data-i="${i}" data-j="${j}" class="${sel}${isPend}" style="${heat(v, 1)}">${num(v)}${ghost}</td>`;
        } else if (partial[i]?.[j] !== undefined) {
          t += `<td data-view="${block.id}" data-i="${i}" data-j="${j}" class="${sel}${isPend}" title="the score so far; softmax has not run on this row"><small>score</small>${num(partial[i][j])}</td>`;
        } else t += '<td class="e">·</td>';
      });
      t += weights[i] ? `<td class="rs">${num(weights[i].reduce((a, b) => a + b, 0))}</td></tr>` : '<td class="rs"></td></tr>';
    });
    const rowsDone = weights.filter(Boolean).length;
    return `<div class="view">${head(caption || 'attention', `<span class="lab">${rowsDone}/${tokens.length} rows · click a cell</span>`)}<div class="scroll">${t}</table></div>${explainFor(block, ctx)}</div>`;
  }
  if (kind === 'ffn') {
    const names = ctx.tables.W1?.header?.slice(1) ?? ['h1', 'h2'];
    const rows = byToken(events, (e) => (e.kind === 'ffn' ? { i: e.info[0], vec: e.info[1] } : null));
    const body = rows.filter(Boolean).length ? matrix({ rows, cols: names, tokens, view: block.id, sel: ctx.sel, cur: curI, wasRows: ctx.was ? byToken(ctx.was, (e) => (e.kind === 'ffn' ? { i: e.info[0], vec: e.info[1] } : null)) : null }) : '<div class="empty">not computed yet</div>';
    return `<div class="view">${head(caption || 'ffn')}<div class="scroll">${body}</div>${explainFor(block, ctx)}</div>`;
  }
  if (kind === 'predict') {
    const rows = [];
    for (const e of events) if (e.kind === 'predict') rows[e.info[0]] = e;
    const was = [];
    for (const e of ctx.was ?? []) if (e.kind === 'predict') was[e.info[0]] = e;
    const done = rows.filter(Boolean);
    let t = '<table class="doc pred"><tr><th>after</th><th>next was</th><th>p(next)</th><th>surprise −ln p</th><th>the model\'s five best guesses</th></tr>';
    tokens.forEach((c, i) => {
      const e = rows[i];
      if (!e) { t += `<tr><td>${esc(c)}</td><td colspan="4" class="lab">·</td></tr>`; return; }
      const [, y, p, top] = e.info, w = was[i];
      const ghost = w && Math.abs(w.info[2] - p) > 0.005 ? ` <span class="was">was ${num(w.info[2])}</span>` : '';
      t += `<tr><td>${esc(c)}</td><td><b>${esc(y)}</b></td><td>${num(p)}${ghost}</td><td>${num(-Math.log(Math.max(p, 1e-6)))}</td><td>${top.map(([l, q]) => `<span class="chip${l === y ? ' new' : ''}">${esc(l)} <small>${num(q)}</small></span>`).join(' ')}</td></tr>`;
    });
    const mean = done.length ? done.reduce((a, e) => a - Math.log(Math.max(e.info[2], 1e-6)), 0) / done.length : null;
    return `<div class="view">${head(caption || 'predictions', mean === null ? '' : `<span class="lab">mean surprise ${num(mean)} nats over ${done.length} letters</span>`)}<div class="scroll">${t}</table></div></div>`;
  }
  return `<div class="view"><div class="empty">no view called ${esc(kind)}</div></div>`;
}

// what each word reads, once the run has the weights: the reads view under a run block
export function readsView(ctx) {
  const { events, tokens, features } = ctx;
  const heads = [0, 1].map((h) => { const w = []; for (const e of events) if (e.kind === 'weights' && e.info[0] === h) w[e.info[1]] = e.info[3]; return w; });
  const out = [];
  const finals = byToken(events, (e) => (e.kind === 'norm' && e.info[0] === 2 ? { i: e.info[1], vec: e.info[2] } : null));
  tokens.forEach((t, i) => {
    const chips = heads.map((w, h) => {
      if (!w[i]) return '';
      const j = w[i].indexOf(Math.max(...w[i]));
      return `<span class="chip new">head ${h + 1} → ${esc(tokens[j])} <small>${num(w[i][j])}</small></span>`;
    }).join(' ');
    const top = finals[i] ? finals[i].vec.map((v, c) => [v, c]).filter(([v]) => v > 0.75).sort((a, b) => b[0] - a[0]).map(([v, c]) => `<span class="chip">${esc(label(features[c]))} <small>${num(v)}</small></span>`).join(' ') : '';
    if (chips || top) out.push(`<div><b>${esc(t)}</b>${chips}${top}</div>`);
  });
  return out.length ? `<div class="res-h">reads as</div><div class="reads">${out.join('')}</div>` : '';
}

// the selected cell, explained term by term
function explainFor(block, ctx) {
  const s = ctx.sel;
  if (!s || s.view !== block.id) return '';
  const { tokens, features, events } = ctx;
  if (block.kind === 'attention') {
    const h = Number(block.args.head ?? 0);
    const sc = last(events, (e) => e.kind === 'score' && e.info[0] === h && e.info[1] === s.i && e.info[2] === s.j);
    if (!sc) return '<div class="explain"><p class="lead">This score has not been computed yet.</p></div>';
    const [, , , raw, q, k, terms] = sc.info;
    const qn = ctx.tables[`Wq-${h + 1}`]?.header?.slice(1) ?? q.map((_, n) => `q${n + 1} × k${n + 1}`);
    const scale = block.args.scale ? Number(block.args.scale) : null;
    const w = last(events, (e) => e.kind === 'weights' && e.info[0] === h && e.info[1] === s.i);
    const dot = terms.reduce((a, b) => a + b, 0);
    let top = -1;
    terms.forEach((v, n) => { if (top < 0 || Math.abs(v) > Math.abs(terms[top])) top = n; });
    return `<div class="explain">
      <p class="lead">${scale ? `Row i = ${esc(tokens[s.i])} asks; column j = ${esc(tokens[s.j])} answers. Its score is the query row times the key row, one product per column:` : `Head ${h + 1} asks for <b>${esc(tokens[s.i])}</b>. Here is how well <b>${esc(tokens[s.j])}</b> answers.`}</p>
      <table><tr><th>question</th><th>q</th><th>k</th><th>q × k</th></tr>
      ${terms.map((v, n) => `<tr class="${n === top && v ? 'top' : ''}"><td>${esc(String(qn[n]).replace('seeks ', ''))}</td><td>${num(q[n])}</td><td>${num(k[n])}</td><td>${num(v)}</td></tr>`).join('')}
      <tr><td>sum</td><td></td><td></td><td>${num(dot)}</td></tr></table>
      <p class="lead">${scale ? `S = <b>${num(raw)}</b>; divided by √d_h = ${scale} it is <b>${num(raw / scale)}</b>.` : `Scaled, the score is <b>${num(raw)}</b>.`}${sc.forked ? ' <b>You forked here with this value</b>; the run it came from keeps the score it computed.' : ''}${w ? ` After softmax over the row, <b>${esc(tokens[s.i])}</b> gives <b>${esc(tokens[s.j])}</b> weight <b>${num(w.info[3][s.j])}</b>.` : ' Softmax has not run on this row yet.'}</p>
      ${w ? `<div class="bars">${w.info[3].map((v, j) => `<span>${esc(tokens[j])}</span><i style="width:${Math.max(1, v * 100)}%"></i><span>${num(v)}</span>`).join('')}</div>` : ''}
      ${dot ? '' : '<p class="note">Nothing matches, so this score is 0. A row of zeros becomes an even split after softmax.</p>'}
      <p class="note">Every number here came from the note at state ${sc.idx.toLocaleString('en-US')}. Step there and press f to fork with another score.</p></div>`;
  }
  if (block.kind === 'matrix' || block.kind === 'ffn') {
    const cols = block.kind === 'ffn' ? (ctx.tables.W1?.header?.slice(1) ?? []) : features;
    const of = block.kind === 'ffn' ? 'ffn' : block.args.of;
    const e = last(events, (e) => e.kind === of && (of === 'norm' || of === 'resid' ? e.info[1] === s.i && (block.args.which === undefined || e.info[0] === Number(block.args.which)) : e.info[0] === s.i));
    if (!e) return '';
    const v = of === 'norm' || of === 'resid' ? e.info[2][s.c] : e.info[1][s.c];
    const why = {
      embed: `its embedding row plus position ${s.i}`,
      attn: 'what the two heads wrote back through Wo',
      norm: 'the word plus what was added, rescaled to mean 0 and spread 1',
      ffn: 'relu of a weighted sum of a few features minus a threshold (b1)',
    }[of] ?? of;
    return `<div class="explain"><p class="lead"><b>${esc(tokens[s.i])}</b> · <b>${esc(label(cols[s.c]))}</b> = <b>${num(v)}</b>: ${esc(why)}.</p><p class="note">From the ${esc(of)} note at state ${e.idx.toLocaleString('en-US')}.</p></div>`;
  }
  return '';
}
