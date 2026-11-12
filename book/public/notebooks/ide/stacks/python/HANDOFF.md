# Python in Stacks: handoff

Students write and run real Python in Stacks code blocks marked `#+begin_src python :live`. Plain `python` blocks
(the PyTorch shown beside the encoder) stay "shown, not run".

## How it works

- **Pyodide** (CPython compiled to wasm, pinned v0.28.3 from jsdelivr) in a **Web Worker** (`worker.mjs`). Nothing to
  install, fully static (no /api), works on GitHub Pages. The first load downloads ~10 MB; vendor the Pyodide folder
  next to these files if classroom wifi is a problem (change `PYODIDE` in `worker.mjs`).
- **`tracer.py`** runs a block once under `sys.settrace` and records every line: block, line, function, depth, the
  whole frame stack with each frame's names (bounded reprs; micrograd `Value`s keep `data`/`grad`; number lists and
  matrices kept as numbers), stdout so far, return values, exceptions. Stepping is replay of that record.
  Caps: 5000 events (the program keeps running unrecorded past it, flagged `truncated`), 160-char reprs, 40 names/frame.
- Blocks of one card share a namespace, in order, like notebook cells. A method defined in an earlier block is traced
  when a later block calls it, and that line lights up in the earlier block.
- `note(kind, info, v)` in Python returns `v` and records `{idx, kind, info}`, the same shape as `engine.mjs` notes,
  so the existing Stacks result views can read them.
- **`live.mjs`**: `mountLive(el, block, { cardId, onStep, onNotes, onRun })` builds the block UI (editor with
  highlight, ▶ run / ⌘↵, ■ stop, status) and the run panel (⏮ ↶ ← → over out ⏭, scrub slider, current line, frames,
  names with changed/new highlighting, printed-so-far, `#+results:` value). Keys in the panel: ← → (⇧ = over),
  o over, u out, Home/End, n next note. `runAll(views)` runs a buffer's live blocks in order.
  Stop = terminate the worker, start a new one, re-run the card's earlier successful blocks.
  It injects its own `py.css` next to itself; colours come from `stacks.css`.
- The Stacks UI thread already added the hook in `../ui.mjs` (renders `data-pylive`, guarded
  `import(new URL('python/live.mjs', import.meta.url))`, calls `mountLive(el, block, {cardId, onNotes})`).

## Files (all new, all in `ide/stacks/python/`)

- `tracer.py`, `worker.mjs`, `live.mjs`, `py.css`
- `lessons/backprop.org`: the week-3 micrograd `Value` class; L = (2w+1)² at w=3 → dL/dw = 28; tanh neuron
  (dw1=2, dx1=0.5, dw2=1, dx2=-1, db=1); w³ exercise.
- `test/tracer_test.py`: `python3 -I ide/stacks/python/test/tracer_test.py` from `vau-lang/core` — 13 tests, **pass**
  (lesson numbers, stepping sees w.grad go 0 → 28 inside `_backward`, errors point at the right block/line,
  long-loop cap, notes shape, cards isolated).

## Status

- Verified: the tracer and the lesson, headless (CPython 3.9; Pyodide is 3.12/3.13, same code).
- **Not yet verified in a browser**: `worker.mjs` + `live.mjs` were written but never loaded. Expect small fixes.
- Not done: `serve.mjs` here (wrap `stacksServer` from `../serve.mjs`, add `/ide/stacks/python/*` from an allowlist:
  `*.mjs`, `*.py`, `*.css`, `lessons/*.org`; serve `.py` as text/plain). Check whether `../serve.mjs` already serves
  this folder; if not, the worker's `fetch('./tracer.py')` and the import of `live.mjs` will 404 under the dev server.
  On a static site they just work.
- Not done: `py.html`, a standalone page that parses a lesson with `../buffer.mjs` and mounts each live block
  (`?lesson=backprop.org`). Optional now that the Stacks page mounts them.

## Next steps

1. Serve the folder, open a lesson with `:live` blocks in Stacks (e.g. copy `lessons/backprop.org` into
   `../lessons/` or add `?lesson=` support for this folder), click ▶ run on each block in order; check: value shows,
   step/scrub works, names table shows `w` data/grad, stepping into `L.backward()` highlights `_backward` lines in
   the class block, an error shows red with its line, `while True: pass` + ■ stop recovers.
2. Fix what breaks (likely: `py.on` initial state text, `fit()` sizing of the textarea overlay, PyProxy → `json.dumps`).
3. Optional: a computation-graph view of `Value._prev` for the backprop lesson.
