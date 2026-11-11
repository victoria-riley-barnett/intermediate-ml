#!/usr/bin/env python3
"""Verify every atom in book/atoms/*.toml and print the ledger counts.

    python3 book/verify.py              # verify, print counts, exit 1 on fail or drift
    python3 book/verify.py --stamp      # record sha1 for [atom.source] tables that lack one
    python3 book/verify.py --list       # one line per atom

An atom has exactly one primary verifier, [atom.verify] with `method`:

  run       runs book/code/<script> and requires every `expect` string in its output.
  plate     every number in `text` appears in the <desc> of figures/<plate>.html.
  computed  evaluates `expr` (Python, math available). With `number`, the value,
            rounded to that number's decimals, must equal it, and `number` must
            appear in `text` (and in `says`, the working shown to readers, if
            given); without, the value must be true.
  hand      cannot be checked by machine: `unsigned` until `signed = "YYYY-MM-DD"`.

Provenance is separate from verification. [atom.source] names the delivered course
file and heading the atom was written from, with `sha1` of that section. It proves
nothing about the atom; it only says where to look. If the section has changed since
the atom was written, the state is `drift`, whatever the verifier says. A source file
that is not on this machine is skipped (the build server has no course checkout).

States: pass | fail | unsigned | drift.

Course sources are read from $COURSE_SRC, default: the `teaching` folder beside
this repository. Standard library only; Python 3.11+.
"""
import hashlib
import math
import os
import pathlib
import re
import subprocess
import sys
import tomllib

HERE = pathlib.Path(__file__).resolve().parent
ATOMS = HERE / "atoms"
CODE = HERE / "code"
FIGURES = HERE / "figures"
COURSE = pathlib.Path(os.environ.get("COURSE_SRC", HERE.parent.parent / "teaching"))

NUMBER = re.compile(r"(?<![\w.])-?\d+(?:\.\d+)?(?:e[+-]?\d+)?")
STATES = ("pass", "fail", "unsigned", "drift")


def section(path, heading):
    """Raw text under a markdown heading, to the next heading of the same or higher
    level. Headings inside fenced code are not headings."""
    lines = path.read_text().splitlines()
    fence, start, level = False, None, None
    for i, line in enumerate(lines):
        if line.startswith("```"):
            fence = not fence
            continue
        if fence:
            continue
        m = re.match(r"^(#+)\s+(.*?)\s*$", line)
        if not m:
            continue
        if start is None and m.group(2) == heading:
            start, level = i + 1, len(m.group(1))
        elif start is not None and len(m.group(1)) <= level:
            return "\n".join(lines[start:i])
    if start is None:
        raise KeyError(heading)
    return "\n".join(lines[start:])


def plate_desc(slug):
    t = (FIGURES / f"{slug}.html").read_text()
    m = re.search(r"<desc[^>]*>(.*?)</desc>", t, re.S)
    return m.group(1) if m else ""


def same_number(a, b):
    try:
        return a == b or float(a) == float(b)
    except ValueError:
        return False


_RUNS = {}


def run_output(script):
    if script not in _RUNS:
        path = CODE / script
        r = subprocess.run([sys.executable, path.name], cwd=path.parent,
                           capture_output=True, text=True, timeout=300)
        _RUNS[script] = r.stdout if r.returncode == 0 else None
    return _RUNS[script]


def check(atom):
    """Return (state, detail)."""
    v = atom.get("verify", {})
    method = v.get("method")
    text = atom["text"]

    if method == "run":
        out = run_output(v["script"])
        if out is None:
            return "fail", f"code/{v['script']} exited non-zero"
        expect = v["expect"] if isinstance(v["expect"], list) else [v["expect"]]
        missing = [e for e in expect if e not in out]
        if missing:
            return "fail", f"not in output: {missing[0]!r}"
        return "pass", f"code/{v['script']} prints {len(expect)} expected line(s)"

    if method == "plate":
        desc = plate_desc(v["plate"])
        have = NUMBER.findall(desc)
        nums = NUMBER.findall(text.replace("−", "-"))
        absent = [n for n in nums if not any(same_number(n, h) for h in have)]
        if absent:
            return "fail", f"not in figures/{v['plate']} <desc>: {', '.join(absent)}"
        if not nums:
            return "fail", "no number in text to check against the plate"
        return "pass", f"{len(nums)} number(s) found in figures/{v['plate']} <desc>"

    if method == "computed":
        value = eval(v["expr"], {"__builtins__": {}, "math": math, "sum": sum, "abs": abs,
                                 "round": round, "min": min, "max": max, "len": len})
        if "number" in v:
            n = v["number"]
            if n not in text.replace("−", "-"):
                return "fail", f"number {n} is not in the text"
            places = len(n.split(".")[1]) if "." in n else 0
            if round(float(value), places) != float(n):
                return "fail", f"{v['expr']} = {value!r}, text says {n}"
            if v.get("says") and n.lstrip("-") not in v["says"]:
                return "fail", f"the displayed working (`says`) does not show {n}"
            return "pass", f"{v['expr']} = {round(float(value), places)}"
        return ("pass", f"{v['expr']} is true") if value is True else ("fail", f"{v['expr']} is {value!r}")

    if method == "hand":
        if v.get("signed"):
            return "pass", f"signed by the author {v['signed']}"
        return "unsigned", "cannot be checked by machine; awaiting the author's signature"

    return "fail", f"unknown or missing verify method: {method!r}"


def load():
    """All atoms, in file order, with their chapter stem."""
    out = []
    for f in sorted(ATOMS.glob("*.toml")):
        for a in tomllib.loads(f.read_text()).get("atom", []):
            a["chapter"] = f.stem
            out.append(a)
    return out


def verify_all():
    atoms = load()
    ids = [a["id"] for a in atoms]
    dup = {i for i in ids if ids.count(i) > 1}
    known = set(ids) | {f.stem for f in (HERE / "forms").glob("*.toml")}  # chapters may be linked too
    for a in atoms:
        state, detail = check(a)
        bad = [r for r in a.get("uses", []) + a.get("see", []) if r not in known]
        if a["id"] in dup:
            state, detail = "fail", "duplicate id"
        elif bad:
            state, detail = "fail", f"unknown atom id(s): {', '.join(bad)}"
        drift = source_drift(a)
        if drift and state != "fail":
            state, detail = "drift", drift
        a["state"], a["detail"] = state, detail
    return atoms


def source_sha(src):
    path = COURSE / src["file"]
    if not path.exists():
        return None
    return hashlib.sha1(section(path, src["heading"]).encode()).hexdigest()[:12]


def source_drift(atom):
    src = atom.get("source")
    if not src or not src.get("sha1"):
        return None
    try:
        now = source_sha(src)
    except KeyError:
        return f"source heading gone: {src['heading']}"
    if now and now != src["sha1"]:
        return f"source section changed since written: {src['file']} § {src['heading']}"
    return None


def stamp(atoms):
    """Write the current sha1 into [atom.source] tables whose sha1 is empty."""
    for f in sorted(ATOMS.glob("*.toml")):
        t = f.read_text()
        for a in atoms:
            src = a.get("source")
            if a["chapter"] != f.stem or not src or src.get("sha1"):
                continue
            sha = source_sha(src)
            if not sha:
                continue
            i = t.index(f'id = "{a["id"]}"')
            j = t.index('sha1 = ""', i)
            t = t[:j] + f'sha1 = "{sha}"' + t[j + len('sha1 = ""'):]
        f.write_text(t)


def counts(atoms):
    c = {s: 0 for s in STATES}
    for a in atoms:
        c[a["state"]] += 1
    return c


def main(argv):
    atoms = verify_all()
    if "--stamp" in argv:
        stamp(atoms)
        atoms = verify_all()
    if "--list" in argv:
        for a in atoms:
            print(f"{a['state']:9} {a['id']:34} {a['verify'].get('method', '?'):9} {a['detail']}")
    c = counts(atoms)
    print(f"atoms: {len(atoms)}  " + "  ".join(f"{s} {n}" for s, n in c.items()))
    for a in atoms:
        if a["state"] in ("fail", "drift"):
            print(f"  {a['state'].upper()} {a['id']}: {a['detail']}")
    return 1 if c["fail"] or c["drift"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
