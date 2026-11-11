"""Small multiples, drawn as inline SVG from the chapter's own scripts.

Each panel set repeats one plot across conditions on shared axes, labelled
directly, with no legend and no grid. The numbers are recomputed here with the
same arithmetic as book/code/02-autodifferentiation/loop.py and mean_median.py,
and every value those scripts print is checked against the recomputation before
anything is drawn: if they disagree the build stops.

Standard library only.
"""
import math
import subprocess
import sys

from pathlib import Path

CODE = Path(__file__).resolve().parent / "code"
INK, SOFT, FAINT, ACCENT = "#1a1a1a", "#6b6b6b", "#d4d4d4", "#1a5fd0"
FONT = "'Geist', system-ui, sans-serif"

# ── the runs ───────────────────────────────────────────────────────────────

XS = [0.8, 3.3, 6.7, 10.0]
YS = [3 * x + 7 for x in XS]
READINGS = [4.0, 4.2, 4.1, 4.3, 12.0]


def descend(lr, steps, clear=True):
    """loop.py's training, in plain floats: the loss at each step, before the update."""
    w, b, gw, gb, out = 2.0, 0.0, 0.0, 0.0, []
    for _ in range(steps):
        es = [w * x + b - y for x, y in zip(XS, YS)]
        out.append(sum(e * e for e in es) / len(XS))
        dw = sum(2 * e * x for e, x in zip(es, XS)) / len(XS)
        db = sum(2 * e for e in es) / len(XS)
        gw, gb = (dw, db) if clear else (gw + dw, gb + db)
        w, b = w - lr * gw, b - lr * gb
    return out


def _script(name):
    r = subprocess.run([sys.executable, name], cwd=CODE / "02-autodifferentiation",
                       capture_output=True, text=True, check=True)
    return r.stdout


def check_against_scripts():
    """Every loss loop.py prints must equal the recomputed curve at that step."""
    # loop.py's four runs, in the order it prints them
    plan = [(0.01, 3000, True), (0.03, 200, True), (0.0005, 200, True), (0.01, 200, False)]
    run, last = -1, None
    for line in _script("loop.py").splitlines():
        parts = line.split()
        lr, step, loss = float(parts[1]), int(parts[3]), parts[5]
        if last is None or lr != last[0] or step <= last[1]:
            run += 1
        last = (lr, step)
        rate, steps, clear = plan[run]
        curve = descend(rate, steps, clear)
        if lr != rate or f"{curve[step - 1]:.4g}" != loss:
            raise SystemExit(f"multiples.py: loop.py prints loss {loss} at lr {lr} step {step}; "
                             f"recomputed {curve[step - 1]:.4g}")
    out = _script("mean_median.py")
    for c, label in ((mean_point(), "squared error is smallest at"), (median_point(), "absolute error is smallest at")):
        if f"{label} {c:.2f}" not in out:
            raise SystemExit(f"multiples.py: mean_median.py does not print '{label} {c:.2f}'")


def sq_loss(c):
    return sum((r - c) ** 2 for r in READINGS) / len(READINGS)


def abs_loss(c):
    return sum(abs(r - c) for r in READINGS) / len(READINGS)


def mean_point():
    grid = [i / 100 for i in range(1501)]
    return min(grid, key=sq_loss)


def median_point():
    grid = [i / 100 for i in range(1501)]
    return min(grid, key=abs_loss)


# ── drawing ────────────────────────────────────────────────────────────────

def _svg(w, h, body, label):
    return (f'<svg class="multiple" viewBox="0 0 {w} {h}" width="{round(w * 1.3)}" height="{round(h * 1.3)}" role="img" aria-label="{label}" '
            f'font-family="{FONT}" font-size="11">' + "".join(body) + "</svg>")


def _t(x, y, s, anchor="start", fill=SOFT, size=11, weight=400, italic=False):
    st = ' font-style="italic"' if italic else ""
    return (f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" fill="{fill}" '
            f'font-size="{size}" font-weight="{weight}"{st}>{s}</text>')


def _poly(pts, color=INK, width=1.2):
    d = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    return f'<polyline points="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"/>'


def log_panels(curves, title_of, note_of, label):
    """Loss against step on a shared log axis, one panel per condition."""
    pw, ph, gap, top, left = 210, 150, 26, 48, 40
    lo, hi = 1, 1e3                       # shared vertical range, 1 to 1,000
    steps = len(next(iter(curves.values())))
    def X(i, k): return left + k * (pw + gap) + (i / (steps - 1)) * pw
    def Y(v): return top + ph - (math.log10(min(max(v, lo), hi)) - math.log10(lo)) / (math.log10(hi) - math.log10(lo)) * ph
    body = []
    for k, (key, ys) in enumerate(curves.items()):
        x0 = left + k * (pw + gap)
        body.append(f'<line x1="{x0}" x2="{x0 + pw}" y1="{top + ph}" y2="{top + ph}" stroke="{FAINT}"/>')
        body.append(_t(x0, top - 30, title_of(key), fill=INK, size=12, weight=600))
        pts, off = [], None
        for i, v in enumerate(ys):
            if v > hi:
                off = i
                break
            pts.append((X(i, k), Y(v)))
        body.append(_poly(pts, ACCENT if off is not None else INK))
        note = note_of(key, ys, off)
        body.append(_t(x0, top - 14, note, fill=ACCENT if off is not None else SOFT))
        body.append(_t(x0, top + ph + 14, "1", size=10))
        body.append(_t(x0 + pw, top + ph + 14, f"{steps}", "end", size=10))
        if k == 0:
            for v, s in ((1, "1"), (10, "10"), (100, "100"), (1e3, "1,000")):
                body.append(_t(left - 5, Y(v) + 4, s, "end", size=10))
    body.append(_t(left + len(curves) * (pw + gap) - gap, top + ph + 28, "step", "end", size=10, italic=True))
    w = left + len(curves) * (pw + gap) - gap + 6
    return _svg(w, top + ph + 34, body, label)


def end_y(v, top=34, ph=150):
    """Where to put a curve's end label: just above its last point."""
    return top + ph - (math.log10(v) / 3) * ph - 8


def top_note(top=34):
    return top + 14


def learning_rates():
    rates = [0.0005, 0.01, 0.03]
    curves = {lr: descend(lr, 200) for lr in rates}
    def note(lr, ys, off):
        if off is not None:
            return f"leaves the axis at step {off + 1}"
        return f"{ys[-1]:.4g} at step 200"
    return log_panels(curves, lambda lr: f"learning rate {lr:g}", note,
                      "loss against step at three learning rates, shared log axis")


def cleared_grad():
    curves = {"cleared": descend(0.01, 200), "never cleared": descend(0.01, 200, clear=False)}
    def note(key, ys, off):
        return f"{ys[-1]:.4g} at step 200"
    return log_panels(curves, lambda k: f".grad {k}", note,
                      "loss against step with .grad cleared and never cleared, learning rate 0.01")


def mean_median():
    """The two losses over the same five readings, as functions of the summary value c."""
    pw, ph, gap, top, left = 300, 130, 34, 30, 14
    c0, c1 = 3.0, 13.0
    grid = [c0 + i * (c1 - c0) / 400 for i in range(401)]
    body = []
    for k, (name, f, best, word) in enumerate((("squared error", sq_loss, mean_point(), "mean"),
                                               ("absolute error", abs_loss, median_point(), "median"))):
        x0 = left + k * (pw + gap)
        vals = [f(c) for c in grid]
        vmax = max(vals)
        X = lambda c: x0 + (c - c0) / (c1 - c0) * pw
        Y = lambda v: top + ph - v / vmax * ph
        body.append(_t(x0, top - 14, name, fill=INK, size=12, weight=600))
        body.append(f'<line x1="{x0}" x2="{x0 + pw}" y1="{top + ph}" y2="{top + ph}" stroke="{FAINT}"/>')
        body.append(_poly([(X(c), Y(v)) for c, v in zip(grid, vals)]))
        for r in READINGS:                                   # the five readings, as a rug
            body.append(f'<line x1="{X(r):.1f}" x2="{X(r):.1f}" y1="{top + ph}" y2="{top + ph + 6}" stroke="{INK}"/>')
        body.append(_t(X(12.0), top + ph + 17, "12.0", "middle", size=10))
        body.append(_t(X(4.15), top + ph + 17, "4.0–4.3", "middle", size=10))
        bx, by = X(best), Y(f(best))
        body.append(f'<circle cx="{bx:.1f}" cy="{by:.1f}" r="3" fill="{ACCENT}"/>')
        body.append(f'<line x1="{bx:.1f}" x2="{bx:.1f}" y1="{top + 2}" y2="{top + ph}" stroke="{ACCENT}" stroke-dasharray="2 2"/>')
        body.append(_t(bx + 6, top + 12, f"smallest at {best:.2f}, the {word}", fill=ACCENT))
    body.append(_t(left + 2 * pw + gap, top + ph + 30, "summary value c", "end", size=10, italic=True))
    return _svg(left + 2 * pw + gap + 6, top + ph + 36, body,
                "squared and absolute error over five readings, smallest at the mean and the median")


MULTIPLES = {
    "learning-rates": (learning_rates, "The same loop at three learning rates, on one logarithmic loss axis. "
                       "Too small still falls at step 200; too large leaves the axis."),
    "cleared-grad": (cleared_grad, "The same loop at learning rate 0.01, with .grad cleared every step and never cleared."),
    "mean-median": (mean_median, "Each loss as a function of one summary value c, over the readings 4.0, 4.2, 4.1, 4.3 and 12.0 "
                    "(the ticks on the axis). The one far reading drags the squared-error minimum; it barely moves the other."),
}
