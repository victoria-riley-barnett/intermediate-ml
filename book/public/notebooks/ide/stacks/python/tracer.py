# A Python block, run once and recorded: every line it reaches, with the frames and their names at that moment.
# Stepping, going back and scrubbing in the page are reads of this record, so they are exact and cost nothing.
# Plain CPython: the page runs it in Pyodide, and test/tracer_test.py runs it with python3 -I.
#
#   run(code, block_id, card_id) -> dict (JSON-able)
#     events: [{i, block, line, fn, depth, at, stack: [{fn, block, line, names}], out, ret?, exc?}]
#             at is 'line' | 'call' | 'return' | 'exception' | 'note'; out is how much stdout there was by then
#     notes:  [{idx, kind, info}]  the shape the Stacks views read: idx is the event it happened at
#     stdout, value (repr of a last bare expression, or None), error ({type, message, block, line} or None),
#     defined (names the block bound or rebound), truncated (more events than were kept)
import ast, io, math, sys, traceback

MAX_EVENTS = 5000      # events kept for stepping; past this the program still runs, unrecorded
MAX_REPR = 160         # characters of one value
MAX_NAMES = 40         # names shown in one frame
PREFIX = '<block:'

NS = {}                # card id -> that card's namespace: the blocks of a card share one, in order, like the vau cards
SOURCES = {}           # block id -> its current text, so a frame in an earlier block can still be shown


class StepLimit(Exception):
    pass


def namespace(card_id):
    if card_id not in NS:
        ns = {'__name__': '__main__', '__builtins__': __builtins__}
        ns['note'] = _note_fn
        NS[card_id] = ns
    return NS[card_id]


def reset(card_id=None):
    if card_id is None:
        NS.clear()
    else:
        NS.pop(card_id, None)


def short(v):
    try:
        r = repr(v)
    except Exception as e:  # a student's __repr__ can fail too
        r = f'<repr failed: {type(e).__name__}>'
    return r if len(r) <= MAX_REPR else r[:MAX_REPR - 1] + '…'


def _numbers(v, depth=0):
    """A list of numbers, or a list of such lists (a matrix): kept as numbers so the page can draw it."""
    if isinstance(v, bool):
        return None
    if isinstance(v, float):
        return v if math.isfinite(v) else None   # JSON has no nan or inf: the repr still says it
    if isinstance(v, int):
        return v if abs(v) < 2**53 else float(v)
    if depth < 2 and isinstance(v, (list, tuple)) and 0 < len(v) <= 64:
        out = [_numbers(x, depth + 1) for x in v]
        if all(not isinstance(o, list) for o in out) and any(o is not None for o in out):
            return out
        if depth == 0 and all(isinstance(o, list) for o in out) and len({len(o) for o in out}) == 1:
            return out
    # numpy arrays, if the block uses numpy
    if depth == 0 and type(v).__name__ == 'ndarray' and getattr(v, 'ndim', 3) <= 2 and getattr(v, 'size', 10**6) <= 1024:
        try:
            return v.tolist()
        except Exception:
            return None
    return None


def _clean(x):
    if isinstance(x, list):
        return [_clean(y) for y in x]
    return _numbers(x) if isinstance(x, (int, float)) else None


def show(v):
    """One value as the page shows it: its repr, its type, and the parts worth drawing."""
    d = {'r': short(v), 't': type(v).__name__}
    # a micrograd-style Value: a number with a gradient
    if hasattr(v, 'data') and hasattr(v, 'grad') and not isinstance(v, type):
        try:
            data, grad = v.data, v.grad
            if isinstance(data, (int, float)) and isinstance(grad, (int, float)) and not isinstance(data, bool):
                d['data'], d['grad'] = _numbers(data), _numbers(grad)
                op = getattr(v, '_op', None)
                if isinstance(op, str) and op:
                    d['op'] = op
                label = getattr(v, 'label', None)
                if isinstance(label, str) and label:
                    d['label'] = label
        except Exception:
            pass
    n = _numbers(v)
    if isinstance(n, list):
        d['nums'] = n
    return d


def _visible(name, v):
    if name.startswith('__') or name == 'note':
        return False
    t = type(v).__name__
    return t not in ('module', 'builtin_function_or_method')


def names_of(frame, is_module):
    src = frame.f_globals if is_module else frame.f_locals
    out = {}
    for k, v in list(src.items()):
        if not _visible(k, v):
            continue
        if is_module and (callable(v) and not hasattr(v, 'data')):
            # functions and classes the blocks define: shown by name only, they do not change while stepping
            out[k] = {'r': f'{type(v).__name__} {k}', 't': 'def'}
        else:
            out[k] = show(v)
        if len(out) >= MAX_NAMES:
            break
    return out


def block_of(code):
    f = code.co_filename
    return f[len(PREFIX):-1] if f.startswith(PREFIX) else None


class Recorder:
    def __init__(self, out):
        self.events, self.notes, self.out = [], [], out
        self.truncated = False
        self.seen = 0

    def stack(self, frame):
        st = []
        f = frame
        while f is not None:
            b = block_of(f.f_code)
            if b is not None:
                is_mod = f.f_code.co_name == '<module>'
                st.append({'fn': '(block)' if is_mod else f.f_code.co_name, 'block': b, 'line': f.f_lineno,
                           'names': names_of(f, is_mod)})
            f = f.f_back
        return st

    def record(self, frame, at, extra=None):
        self.seen += 1
        if len(self.events) >= MAX_EVENTS:
            self.truncated = True
            return
        st = self.stack(frame)
        e = {'i': len(self.events), 'block': block_of(frame.f_code), 'line': frame.f_lineno,
             'fn': st[0]['fn'] if st else '?', 'depth': len(st) - 1, 'at': at, 'stack': st,
             'out': len(self.out.getvalue())}
        if extra:
            e.update(extra)
        self.events.append(e)

    def tracer(self, frame, event, arg):
        if block_of(frame.f_code) is None:
            return None  # library code (and the language's own) runs untraced
        if event == 'call':
            if frame.f_code.co_name != '<module>':
                self.record(frame, 'call')
            return self.local
        return None

    def local(self, frame, event, arg):
        if event == 'line':
            self.record(frame, 'line')
        elif event == 'return':
            self.record(frame, 'return', {'ret': show(arg)})
        elif event == 'exception':
            self.record(frame, 'exception', {'exc': f'{arg[0].__name__}: {short(arg[1])}'})
        return self.local


CURRENT = []   # the recorder of the run in progress, for note()


def _note_fn(kind, info=(), v=None):
    """note(kind, info, v): mark this moment for the page's views (the same events vau's (note kind info v) makes).
    Returns v, so it can wrap a value: score = note('score', [h, i, j, s], s)."""
    if CURRENT:
        rec = CURRENT[-1]
        info = list(info) if isinstance(info, (list, tuple)) else [info]
        clean = []
        for x in info:
            n = _numbers(x)
            clean.append(n if n is not None else (x if isinstance(x, str) else short(x)))
        rec.notes.append({'idx': max(0, len(rec.events) - 1), 'kind': str(kind), 'info': clean})
        frame = sys._getframe(1)
        if block_of(frame.f_code) is not None:
            rec.record(frame, 'note', {'note': {'kind': str(kind), 'info': clean}})
    return v


def _split(code, filename):
    """The block's statements, and its last line if that is a bare expression (shown as the block's value)."""
    tree = ast.parse(code, filename)
    last = None
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        last = ast.Expression(tree.body.pop().value)
    return compile(tree, filename, 'exec'), (compile(last, filename, 'eval') if last else None)


def run(code, block_id, card_id='card', max_events=None):
    global MAX_EVENTS
    if max_events:
        MAX_EVENTS = max_events
    filename = f'{PREFIX}{block_id}>'
    SOURCES[block_id] = code
    ns = namespace(card_id)
    before = {k: id(v) for k, v in ns.items()}
    out = io.StringIO()
    rec = Recorder(out)
    res = {'value': None, 'error': None}
    try:
        body, last = _split(code, filename)
    except SyntaxError as e:
        res['error'] = {'type': 'SyntaxError', 'message': e.msg, 'block': block_id, 'line': e.lineno or 1}
        return dict(res, events=[], notes=[], stdout='', defined=[], truncated=False, steps=0)
    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = out
    CURRENT.append(rec)
    sys.settrace(rec.tracer)
    try:
        exec(body, ns)
        if last is not None:
            v = eval(last, ns)
            if v is not None:
                res['value'] = show(v)
    except BaseException as e:  # KeyboardInterrupt and SystemExit too: a block never takes the page down
        sys.settrace(None)
        tb = [f for f in traceback.extract_tb(e.__traceback__) if f.filename.startswith(PREFIX)]
        where = tb[-1] if tb else None
        res['error'] = {'type': type(e).__name__, 'message': str(e),
                        'block': where.filename[len(PREFIX):-1] if where else block_id,
                        'line': where.lineno if where else None,
                        'trace': [{'block': f.filename[len(PREFIX):-1], 'line': f.lineno, 'fn': f.name} for f in tb]}
    finally:
        sys.settrace(None)
        CURRENT.pop()
        sys.stdout, sys.stderr = old_out, old_err
    defined = [k for k, v in ns.items() if _visible(k, v) and before.get(k) != id(v)]
    return dict(res, events=rec.events, notes=rec.notes, stdout=out.getvalue(), defined=defined,
                truncated=rec.truncated, steps=rec.seen)
