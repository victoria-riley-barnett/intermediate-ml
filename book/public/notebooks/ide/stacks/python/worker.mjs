// The Python machine: Pyodide (CPython compiled to wasm) in a worker, so a block that never ends cannot freeze the page;
// stopping it is terminating this worker. tracer.py does the recording; this file only carries messages.
//   in:  {id, op: 'run', code, block, card} | {id, op: 'reset', card?}
//   out: {id, ok: true, result} | {id, ok: false, error}   and once, {op: 'ready', version} or {op: 'failed', error}
export const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/';

let py = null, tracer = null;
const boot = (async () => {
  const { loadPyodide } = await import(`${PYODIDE}pyodide.mjs`);
  py = await loadPyodide({ indexURL: PYODIDE });
  const src = await (await fetch(new URL('./tracer.py', import.meta.url))).text();
  py.FS.writeFile('/home/pyodide/tracer.py', src);
  py.runPython('import sys\nsys.path.insert(0, "/home/pyodide")\nimport tracer, json');
  tracer = py.globals.get('tracer');
  self.postMessage({ op: 'ready', version: py.version });
})().catch((e) => { self.postMessage({ op: 'failed', error: String(e?.message ?? e) }); throw e; });

self.onmessage = async ({ data: m }) => {
  try {
    await boot;
    if (m.op === 'run') {
      // packages a block imports (numpy, …) are fetched the first time they are named
      try { await py.loadPackagesFromImports(m.code); } catch { /* an unknown import fails in the run, with its own message */ }
      const r = tracer.run(m.code, m.block, m.card ?? 'card');
      const json = py.globals.get('json').dumps(r);   // tracer.py keeps only finite numbers outside reprs
      r.destroy?.();
      self.postMessage({ id: m.id, ok: true, result: JSON.parse(json) });
    } else if (m.op === 'reset') {
      tracer.reset(m.card ?? null);
      self.postMessage({ id: m.id, ok: true, result: null });
    }
  } catch (e) {
    self.postMessage({ id: m.id, ok: false, error: String(e?.message ?? e) });
  }
};
