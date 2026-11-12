// An org-like buffer, read into cards and blocks and written back as the same text.
// The document is a stack; each top-level heading (*) is a card; deeper headings are sections inside it.
// Blocks: prose, src (#+begin_src vau [:run] [:view kind] [:name x]), table (with #+name: binds it), watch, ui, view,
// proposal. #+results: lines are skipped: results here are live views, never pasted text.
//
// doc = { keywords: {title, ...}, intro: [block], cards: [{ id, title, tags, sections: [{ level, title, id, blocks }] }] }
// block = { id, type: 'prose'|'src'|'table'|'watch'|'ui'|'view'|'proposal', name?, args: {key: value|true}, text, lang? }

let counter = 0;
const nextId = (p) => `${p}${++counter}`;

// ":run :view attention :head 0" -> {run: true, view: 'attention', head: '0'}
export function readArgs(s) {
  const out = {};
  const parts = (s ?? '').trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i].startsWith(':')) continue;
    const key = parts[i].slice(1), val = [];
    while (i + 1 < parts.length && !parts[i + 1].startsWith(':')) val.push(parts[++i]);
    out[key] = val.length ? val.join(' ') : true;
  }
  return out;
}
const writeArgs = (args) => Object.entries(args ?? {}).map(([k, v]) => (v === true ? `:${k}` : `:${k} ${v}`)).join(' ');

// a table's text rows -> {header, rows}; a |---+---| line after the first row marks it a header
export function readTable(lines) {
  const rows = [];
  let header = null;
  for (const l of lines) {
    const t = l.trim();
    if (/^\|[-+]+\|?$/.test(t)) { if (rows.length === 1 && !header) header = rows.pop(); continue; }
    rows.push(t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
  }
  return { header, rows };
}
export function writeTable({ header, rows }) {
  const all = header ? [header, ...rows] : rows;
  const n = Math.max(0, ...all.map((r) => r.length));
  const w = Array.from({ length: n }, (_, j) => Math.max(1, ...all.map((r) => (r[j] ?? '').length)));
  const line = (r) => `| ${w.map((wj, j) => (r[j] ?? '').padEnd(wj)).join(' | ')} |`;
  const out = [];
  if (header) { out.push(line(header)); out.push(`|${w.map((wj) => '-'.repeat(wj + 2)).join('+')}|`); }
  for (const r of rows) out.push(line(r));
  return out.join('\n');
}

export function parse(text) {
  counter = 0;   // ids are the same every time the same text is read: an exported page and its runtime agree on them
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const doc = { keywords: {}, intro: [], cards: [] };
  let card = null, section = null, pendingName = null, pendingArgs = null, para = [];
  const target = () => (section ? section.blocks : card ? card.intro : doc.intro);
  const flush = () => { if (para.length) { target().push({ id: nextId('p'), type: 'prose', text: para.join('\n') }); para = []; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = /^(\*+)\s+(.*?)(\s+(:[\w:-]+:))?\s*$/.exec(line);
    if (h) {
      flush();
      const level = h[1].length, title = h[2], tags = h[4] ? h[4].split(':').filter(Boolean) : [];
      if (level === 1) { card = { id: nextId('c'), title, tags, intro: [], sections: [] }; doc.cards.push(card); section = null; }
      else {
        if (!card) { card = { id: nextId('c'), title: doc.keywords.title ?? 'untitled', tags: [], intro: [], sections: [] }; doc.cards.push(card); }
        section = { id: nextId('s'), level, title, tags, blocks: [] }; card.sections.push(section);
      }
      continue;
    }
    const kw = /^#\+(\w+):\s*(.*)$/.exec(line);
    if (kw && !/^begin_|^end_/i.test(kw[1])) {
      flush();
      const k = kw[1].toLowerCase();
      if (k === 'name') pendingName = kw[2].trim();
      else if (k === 'attr' || k === 'header') pendingArgs = { ...(pendingArgs ?? {}), ...readArgs(kw[2]) };
      else if (k === 'results') { while (i + 1 < lines.length && /^\s*[:|]/.test(lines[i + 1])) i++; }
      else if (!card) doc.keywords[k] = kw[2];
      continue;
    }
    const begin = /^#\+begin_(\w+)\s*(.*)$/i.exec(line);
    if (begin) {
      flush();
      const type = begin[1].toLowerCase(), body = [];
      let j = i + 1;
      while (j < lines.length && !new RegExp(`^#\\+end_${type}\\s*$`, 'i').test(lines[j])) body.push(lines[j++]);
      i = j;
      let rest = begin[2], lang = null;
      if (type === 'src' || type === 'view') { const m = /^(\S+)?\s*(.*)$/.exec(rest); lang = m[1] && !m[1].startsWith(':') ? m[1] : null; rest = lang ? m[2] : rest; }
      const args = { ...(pendingArgs ?? {}), ...readArgs(rest) };
      const kind = ['src', 'watch', 'ui', 'view', 'proposal', 'diagram'].includes(type) ? type : 'prose';
      const block = { id: nextId(kind[0]), type: kind, args, text: body.join('\n') };
      if (type === 'src') block.lang = lang ?? 'vau';
      if (type === 'view') block.kind = lang;
      if (kind === 'prose') block.text = `#+begin_${type} ${begin[2]}\n${body.join('\n')}\n#+end_${type}`;
      if (pendingName) block.name = pendingName;
      pendingName = null; pendingArgs = null;
      target().push(block);
      continue;
    }
    if (/^\s*\|/.test(line)) {
      flush();
      const body = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) body.push(lines[i++]);
      i--;
      const t = readTable(body);
      target().push({ id: nextId('t'), type: 'table', name: pendingName, args: pendingArgs ?? {}, header: t.header, rows: t.rows });
      pendingName = null; pendingArgs = null;
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    para.push(line);
  }
  flush();
  return doc;
}

function writeBlock(b) {
  const pre = [];
  if (b.name) pre.push(`#+name: ${b.name}`);
  if (b.type === 'prose') return [...pre, b.text].join('\n');
  if (b.type === 'table') {
    if (Object.keys(b.args ?? {}).length) pre.unshift(`#+attr: ${writeArgs(b.args)}`);
    return [...pre, writeTable(b)].join('\n');
  }
  const head = b.type === 'src' ? `src ${b.lang ?? 'vau'}` : b.type === 'view' ? `view ${b.kind ?? ''}` : b.type;
  const args = writeArgs(b.args);
  return [...pre, `#+begin_${head}${args ? ` ${args}` : ''}`.replace(/\s+$/, ''), b.text, `#+end_${b.type}`].join('\n');
}

export function serialize(doc) {
  const out = [];
  for (const [k, v] of Object.entries(doc.keywords)) out.push(`#+${k}: ${v}`);
  if (out.length) out.push('');
  for (const b of doc.intro) out.push(writeBlock(b), '');
  for (const c of doc.cards) {
    out.push(`* ${c.title}${c.tags.length ? ` :${c.tags.join(':')}:` : ''}`, '');
    for (const b of c.intro) out.push(writeBlock(b), '');
    for (const s of c.sections) {
      out.push(`${'*'.repeat(s.level)} ${s.title}${s.tags.length ? ` :${s.tags.join(':')}:` : ''}`, '');
      for (const b of s.blocks) out.push(writeBlock(b), '');
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

// every block of a card, in reading order
export const blocksOf = (card) => [...card.intro, ...card.sections.flatMap((s) => s.blocks)];

// A cell as the language reads it: a number (5, -2, 0.5, 3/4) stays a number written exactly; anything else is a symbol.
export function cellForm(c) {
  const t = c.trim();
  if (/^-?\d+$/.test(t) || /^-?\d+\/\d+$/.test(t)) return t;
  const d = /^(-?)(\d*)\.(\d+)$/.exec(t);
  if (d) { const den = 10 ** d[3].length; return `${d[1]}${Number(d[2] || 0) * den + Number(d[3])}/${den}`; }
  if (!t) return '0';
  return t.replace(/[\s()";']/g, '-').replace(/·/g, '-');
}
// a table's rows as the data the code reads: ((key v1 v2 ...) ...)
export const tableForm = (b) => `(${b.rows.map((r) => `(${r.map(cellForm).join(' ')})`).join(' ')})`;
