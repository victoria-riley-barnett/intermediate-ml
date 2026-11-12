// The browser runtime for a lesson page: mountLesson(container, { org | file, student = true }).
// Static: it fetches the kernel, the language's layers and the lesson by URLs relative to this file (../../kernel/cek.wasm,
// ../../lang/, ./lessons/), makes no /api calls and needs no server of ours, so it runs from GitHub Pages as it is.
// One lesson per page: the page's live parts (code cells, step/back/run on results, the diagram, sliders, tables, "try a
// different value here") are drawn into `container`.
const SKELETON = `<div class="app">
  <div class="bar"><div class="crumbs"><b id="docname"></b></div><span class="live" id="livebar"></span><nav class="tabs" id="tabs"></nav>
    <span class="grow"></span><button class="btn" id="b-save" hidden>save</button><button class="btn" id="b-theme" title="Light or dark">◐</button></div>
  <main class="buf" id="buf"><div class="buf-in" id="doc"><div class="boot" id="boot">Loading…</div></div></main>
  <aside class="side" aria-hidden="true"><section class="pane"><span id="runinfo"></span><div id="side-branches"></div><input type="range" id="scrub"><span id="scrubv"></span><div id="ticks"></div><div id="side-ctrls"></div><button id="b-play"></button><select id="speed"><option value="score">1 score</option></select><div id="now"></div></section><div id="kont"></div><div id="frames"></div><div id="brks"></div></aside>
  <div class="mini"><div class="out" id="mout"></div><input id="min"><span id="mwhere"></span><div id="msugg"></div></div>
</div><div class="toast" id="toast"></div>`;

export async function mountLesson(container, { org = null, file = null, student = true } = {}) {
  if (!document.querySelector('link[data-stacks]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = new URL('stacks.css', import.meta.url).href; link.dataset.stacks = '1';
    document.head.appendChild(link);
  }
  document.body.dataset.manual = '1';
  if (student) document.body.dataset.mode = 'student';
  container.innerHTML = SKELETON;
  const text = org ?? await (await fetch(new URL(`lessons/${encodeURIComponent(file)}`, import.meta.url))).text();
  const ui = await import('./ui.mjs');
  return ui.start({ org: text, file: file ?? 'lesson.org', lessons: [], student });
}
