#!/usr/bin/env python3
"""Build the CSC 411 book into book/out/.

    python3 book/build.py                 # local preview, served at /
    python3 book/build.py --base=/intermediate-ml/   # the GitHub Pages path

Then preview over HTTP (search needs it):

    python3 -m http.server -d book/out 8000

What it does, in order:

1. Copies chapters/*.md into an mdBook source tree, replacing each
   `{{figure <slug>}}` line with that figure's SVG inline: ids prefixed so two
   figures on one page cannot collide, title as caption, and a link to the
   full-size plate.
2. Copies figures/ verbatim (the full-size plates and their vendored fonts).
3. Writes SUMMARY.md from PARTS below, a figure index page, and book.toml.
4. Runs mdbook (looked for in ../.tools/, then on PATH).

Standard library only.
"""
import html
import pathlib
import re
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
CHAPTERS = HERE / "chapters"
FIGURES = HERE / "figures"
STYLE = HERE / "style"
SRC = HERE / "_src"
OUT = HERE / "out"

# The book's order. (label, file stem); a None stem is a part heading.
PARTS = [
    ("Opening", None),
    ("⌂", "architectures"),
    ("Part I · Fitting a rule", None),
    ("0", "00-objects"),
    ("1", "01-linear-analysis"),
    ("2", "02-autodifferentiation"),
    ("3", "03-backpropagation"),
    ("4", "04-neural-networks"),
    ("Part II · Knowing it works", None),
    ("5", "05-evaluation"),
    ("6", "06-multiclass"),
    ("7", "07-generalization"),
    ("Part III · Sequences", None),
    ("8", "08-fixed-size-inputs"),
    ("9", "09-embeddings"),
    ("10", "10-whole-sequences"),
    ("11", "11-attention"),
    ("12", "12-encoder"),
    ("Your project", None),
    ("A", "project-a-new-data"),
    ("B", "project-b-reporting"),
]

FIGURE_LINE = re.compile(r"^\{\{figure ([\w-]+)\}\}\s*$", re.M)


def h1_of(path):
    for line in path.read_text().splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    raise SystemExit(f"{path.name} has no '# ' title")


def plate(slug):
    """Return (eyebrow, title, svg) for a figure page."""
    path = FIGURES / f"{slug}.html"
    if not path.exists():
        raise SystemExit(f"{{{{figure {slug}}}}}: figures/{slug}.html does not exist")
    t = path.read_text()
    eyebrow = re.search(r'<p class="eyebrow">(.*?)</p>', t, re.S)
    title = re.search(r"<h1>(.*?)</h1>", t, re.S)
    i, j = t.find("<svg"), t.rfind("</svg>")
    if i < 0:
        raise SystemExit(f"figures/{slug}.html has no <svg>")
    svg = t[i : j + len("</svg>")]
    # prefix ids, and every reference to them, so figures can share a page
    ids = set(re.findall(r'\bid="([^"]+)"', svg))
    for name in sorted(ids, key=len, reverse=True):
        new = f"{slug}--{name}"
        svg = re.sub(rf'\bid="{re.escape(name)}"', f'id="{new}"', svg)
        svg = re.sub(rf'url\(#{re.escape(name)}\)', f"url(#{new})", svg)
        svg = re.sub(rf'href="#{re.escape(name)}"', f'href="#{new}"', svg)
        svg = re.sub(
            rf'(aria-(?:labelledby|describedby)="[^"]*?)\b{re.escape(name)}\b',
            rf"\g<1>{new}", svg)
    # an HTML block in Markdown ends at the first blank line, so remove them all
    svg = re.sub(r"<(?![A-Za-z/!?])", "&lt;", svg)  # a bare < in label text
    svg = "\n".join(line.strip() for line in svg.splitlines() if line.strip())
    svg = re.sub(r"<svg\b",f'<svg class="plate-svg" focusable="false"', svg, count=1)
    return (eyebrow.group(1).strip() if eyebrow else "",
            title.group(1).strip() if title else slug, svg)


def figure_block(slug):
    eyebrow, title, svg = plate(slug)
    return (
        f'<figure class="plate" id="fig-{slug}">\n'
        f'<div class="plate-scroll">{svg}</div>\n'
        f'<figcaption><span class="plate-eyebrow">{eyebrow}</span>'
        f'<span class="plate-title">{title}</span>'
        f'<a class="plate-open" href="../figures/{slug}.html">open full size ↗</a>'
        f"</figcaption>\n</figure>\n"
    )


def copy_chapters():
    dst = SRC / "chapters"
    dst.mkdir(parents=True)
    used = {}
    for label, stem in PARTS:
        if stem is None:
            continue
        path = CHAPTERS / f"{stem}.md"
        text = path.read_text()
        for slug in FIGURE_LINE.findall(text):
            used.setdefault(slug, []).append((label, stem))
        text = FIGURE_LINE.sub(lambda m: figure_block(m.group(1)), text)
        (dst / path.name).write_text(text)
    return used


def summary():
    lines = ["# Summary", "", "[CSC 411](index.md)", ""]
    for label, stem in PARTS:
        if stem is None:
            lines += ["", f"# {label}", ""]
        else:
            title = h1_of(CHAPTERS / f"{stem}.md")
            lines.append(f"- [{label} · {title}](chapters/{stem}.md)")
    lines += ["", "---", "", "[All figures](figures.md)"]
    return "\n".join(lines) + "\n"


def title_page():
    rows = []
    for label, stem in PARTS:
        if stem is None:
            rows.append(f"\n**{label}**\n")
        else:
            rows.append(f"- {label} · [{h1_of(CHAPTERS / f'{stem}.md')}](chapters/{stem}.md)")
    return (
        "# CSC 411: Intermediate Machine Learning\n\n"
        "A course for students coming from biology, biochemistry and chemistry, "
        "with no calculus, linear algebra or machine learning assumed. It goes, one "
        "step at a time, from a line fitted by hand to a transformer encoder built "
        "from scratch.\n\n"
        "The opening chapter is the map: where each architecture came from, and "
        "whether it changed the block or the input. Every later chapter is a place "
        "on that map.\n\n" + "\n".join(rows) + "\n"
    )


def figure_index(used):
    lines = ["# All figures", "",
             "Every plate in the book, with the chapters that use it. Each opens at full size.", ""]
    for f in sorted(FIGURES.glob("*.html")):
        _, title, _ = plate(f.stem)
        where = ", ".join(
            f"[{lab}](chapters/{stem}.md#fig-{f.stem})" for lab, stem in used.get(f.stem, []))
        lines.append(f"- [{html.unescape(title)}](figures/{f.name})" + (f" · {where}" if where else ""))
    return "\n".join(lines) + "\n"


def book_toml(base, out):
    return f"""[book]
title = "CSC 411"
authors = ["Victoria Barnett"]
language = "en"
src = "_src"
description = "Intermediate Machine Learning for Interdisciplinary Data Scientists"

[build]
build-dir = "{out}"
create-missing = false

[output.html]
default-theme = "light"
preferred-dark-theme = "navy"
additional-css = ["figures/fonts/fonts.css", "style/book.css"]
no-section-label = true
site-url = "{base}"
git-repository-url = "https://github.com/victoria-riley-barnett/intermediate-ml"
edit-url-template = "https://github.com/victoria-riley-barnett/intermediate-ml/edit/main/book/{{path}}"

[output.html.search]
limit-results = 20
"""


def mdbook():
    import os
    env = os.environ.get("MDBOOK")
    if env:
        return env
    for cand in (HERE.parent / ".tools" / "mdbook", HERE / ".tools" / "mdbook"):
        if cand.exists():
            return str(cand)
    found = shutil.which("mdbook")
    if not found:
        raise SystemExit("mdbook not found: put the binary at .tools/mdbook or on PATH")
    return found


def main(argv):
    global SRC, OUT
    import tempfile
    base = "/"
    for a in argv:
        if a.startswith("--base="):
            base = a.split("=", 1)[1]
        if a.startswith("--out="):
            OUT = pathlib.Path(a.split("=", 1)[1]).resolve()
    # each build gets its own work dir, so two builds can run at once
    work = pathlib.Path(tempfile.mkdtemp(prefix="book-"))
    SRC = work / "_src"
    if not base.endswith("/"):
        base += "/"
    shutil.rmtree(OUT, ignore_errors=True)
    used = copy_chapters()
    (SRC / "SUMMARY.md").write_text(summary())
    (SRC / "index.md").write_text(title_page())
    (SRC / "figures.md").write_text(figure_index(used))
    shutil.copytree(FIGURES, SRC / "figures")
    shutil.copytree(FIGURES / "fonts", work / "figures" / "fonts")
    shutil.copytree(STYLE, work / "style")
    (work / "book.toml").write_text(book_toml(base, OUT))
    subprocess.run([mdbook(), "build", str(work)], check=True)
    shutil.rmtree(work, ignore_errors=True)
    # mdBook rewrites .md links only inside the pages it renders; the plates
    # link back to chapters as .html already, so nothing else to fix.
    print(f"built {OUT}  ({len(used)} figures inline)")


if __name__ == "__main__":
    main(sys.argv[1:])
