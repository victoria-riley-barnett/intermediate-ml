#!/usr/bin/env python3
"""Flag form sentences that the source passage and plate text do not support.

    python3 book/check_forms.py [stem ...]

For each step with `text`, every sentence is compared with `source_passage` plus
the <desc> of the step's figure. A sentence whose content words are less than
60% present in that material is reported.
"""
import pathlib, re, sys, tomllib

HERE = pathlib.Path(__file__).resolve().parent
STOP = set("a an the of to in on and or is are was were be it its this that for with as at by from we you your can not no so if then than but into out up".split())

def words(s):
    return {w for w in re.findall(r"[a-z0-9]+", s.lower()) if w not in STOP}

def desc(slug):
    t = (HERE / "figures" / f"{slug}.html").read_text()
    m = re.search(r"<desc[^>]*>(.*?)</desc>", t, re.S)
    return m.group(1) if m else ""

def main(stems):
    bad = 0
    for f in sorted((HERE / "forms").glob("*.toml")):
        if stems and f.stem not in stems:
            continue
        form = tomllib.loads(f.read_text())
        for i, s in enumerate(form.get("steps", []), 1):
            text = s.get("text")
            if not text:
                continue
            pool = words(s.get("source_passage", "") + " " + desc(s.get("figure", "")))
            for sent in re.split(r"(?<=[.!?])\s+", text):
                w = words(sent)
                if w and len(w & pool) / len(w) < 0.6:
                    bad += 1
                    print(f"{f.stem} step {i}: {sent}")
    print("unsupported sentences:", bad)
    sys.exit(1 if bad else 0)

main(sys.argv[1:])
