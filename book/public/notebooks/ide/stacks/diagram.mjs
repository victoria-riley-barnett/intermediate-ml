// A block diagram that is a view of the buffer: each box names the block it is, the notes that mean "the machine is here",
// and (for a trained model) the parts of the weights it owns. The text of the diagram is ordinary buffer text:
//   box ID | LABEL | STYLE | BLOCK | NOTES | PARTS | TABLES
//     STYLE: w (owns weights: white), g (no weights: grey), io (an input or output), add (⊕); a trailing + marks what this
//     step adds (the accent). NOTES: note kinds, kind:which for one that says which (norm:1). PARTS: training parts.
//     TABLES: the tables this box owns, by name.
//   flow ID ID ...         the main path, drawn bottom to top as on the slides
//   skip FROM TO LABEL     a residual wire from FROM around to the ⊕ TO, called LABEL
export function readDiagram(text) {
  const boxes = new Map(), flow = [], skips = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith(';')) continue;
    const [head, ...rest] = t.split(/\s+/);
    if (head === 'box') {
      const cells = t.slice(4).split('|').map((c) => c.trim());
      const [id, label, style = 'g', block = '', notes = '', parts = '', tables = ''] = cells;
      boxes.set(id, { id, label, style: style.replace('+', ''), accent: style.endsWith('+'), block, notes: notes.split(/\s+/).filter(Boolean), parts: parts.split(/\s+/).filter(Boolean), tables: tables.split(/\s+/).filter(Boolean) });
    } else if (head === 'flow') flow.push(...rest);
    else if (head === 'skip') skips.push({ from: rest[0], to: rest[1], label: rest.slice(2).join(' ') || rest[0] });
  }
  return { boxes, flow, skips };
}

// does a note mean this box? kind, or kind:which with which the note's first number
export const noteMatches = (box, e) => box.notes.some((n) => { const [k, w] = n.split(':'); return e.kind === k && (w === undefined || e.info[0] === Number(w)); });

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const spark = (vals, w, h) => {
  if (!vals?.length) return '';
  const max = Math.max(...vals), min = Math.min(...vals, 0), span = max - min || 1;
  return vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * w},${h - ((v - min) / span) * h}`).join(' ');
};

// d: readDiagram(...); state: {active, selected, values: {id: text}, training: {id: [numbers]}, lossSeries, block: id}
export function drawDiagram(d, state) {
  const rowH = 58, W = 640, cx = 300, bw = 230, n = d.flow.length, H = n * rowH + 24;
  const y = (id) => { const k = d.flow.indexOf(id); return H - 12 - (k + 0.5) * rowH; };
  let svg = `<svg class="dg" viewBox="0 0 ${W} ${H}" width="100%" role="group" aria-label="block diagram, every box opens its block">`;
  svg += '<defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" class="dg-ah"/></marker></defs>';
  // the main path
  for (let k = 0; k < n - 1; k++) {
    const a = d.boxes.get(d.flow[k]), b = d.boxes.get(d.flow[k + 1]);
    const y1 = y(a.id) - (a.style === 'add' ? 14 : a.style === 'io' ? 9 : 17), y2 = y(b.id) + (b.style === 'add' ? 15 : b.style === 'io' ? 10 : 18);
    svg += `<line x1="${cx}" y1="${y1}" x2="${cx}" y2="${y2}" class="dg-w" marker-end="url(#arr)"/>`;
  }
  // residual wires, around the left
  d.skips.forEach((s, k) => {
    const y1 = y(s.from) - rowH * 0.42, y2 = y(s.to), x = cx - bw / 2 - 34 - k * 0;
    const sel = state.selected === `skip:${s.label}`;
    svg += `<g class="dg-skip${sel ? ' sel' : ''}" data-dskip="${esc(s.label)}" data-dto="${esc(s.to)}" tabindex="0" role="button" aria-label="residual wire ${esc(s.label)}">
      <path d="M${cx},${y1} H${x} V${y2} H${cx - 15}" class="dg-w res" marker-end="url(#arr)"/>
      <rect x="${x - 30}" y="${(y1 + y2) / 2 - 11}" width="60" height="22" rx="11" class="dg-wl"/><text x="${x}" y="${(y1 + y2) / 2 + 4}" class="dg-t s" text-anchor="middle">${esc(s.label)}</text></g>`;
  });
  // the boxes
  for (const id of d.flow) {
    const b = d.boxes.get(id), yy = y(id);
    const cls = `dg-b ${b.style}${b.accent ? ' acc' : ''}${state.active === id ? ' on' : ''}${state.selected === id ? ' sel' : ''}`;
    const val = state.values?.[id];
    let shape;
    if (b.style === 'add') shape = `<circle cx="${cx}" cy="${yy}" r="15" class="${cls}"/><text x="${cx}" y="${yy + 5}" class="dg-t" text-anchor="middle">⊕</text>`;
    else if (b.style === 'io') shape = `<rect x="${cx - 40}" y="${yy - 10}" width="80" height="20" rx="4" class="${cls}"/><text x="${cx}" y="${yy + 4}" class="dg-t" text-anchor="middle">${esc(b.label)}</text>`;
    else shape = `<rect x="${cx - bw / 2}" y="${yy - 18}" width="${bw}" height="36" rx="6" class="${cls}"/><text x="${cx}" y="${yy + 5}" class="dg-t" text-anchor="middle">${esc(b.label)}</text>`;
    const sp = state.training?.[id];
    const sparkline = sp ? `<polyline points="${spark(sp, 70, 18)}" transform="translate(${cx - bw / 2 - 84},${yy - 9})" class="dg-sp"/><text x="${cx - bw / 2 - 49}" y="${yy + 21}" class="dg-t xs" text-anchor="middle">moved</text>` : '';
    svg += `<g class="dg-g" data-dbox="${esc(id)}" tabindex="0" role="button" aria-label="${esc(b.label)}${b.block ? `: opens ${esc(b.block)}` : ''}">${shape}${val ? `<text x="${cx + bw / 2 + 12}" y="${yy + 4}" class="dg-t v">${esc(val)}</text>` : ''}${sparkline}</g>`;
  }
  if (state.lossSeries) svg += `<g transform="translate(${W - 150},6)"><text x="0" y="10" class="dg-t xs">held-out loss while training</text><polyline points="${spark(state.lossSeries, 140, 26)}" transform="translate(0,14)" class="dg-sp loss"/></g>`;
  return `${svg}</svg>`;
}
