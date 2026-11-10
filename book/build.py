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
import tomllib

HERE = pathlib.Path(__file__).resolve().parent
CHAPTERS = HERE / "chapters"
FIGURES = HERE / "figures"
STYLE = HERE / "style"
SRC = HERE / "_src"
OUT = HERE / "out"
PATCHES = HERE / "figures_patches.toml"

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
]

FORMS = HERE / "forms"
CODE = HERE / "code"


def run_script(rel):
    """Run a pure-Python example and return its real output."""
    path = CODE / rel
    r = subprocess.run([sys.executable, path.name], cwd=path.parent,
                       capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        raise SystemExit(f"code/{rel} failed:\n{r.stderr}")
    return r.stdout.rstrip()


WIKI = re.compile(r"\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]")
_FORMS = {}


def form_of(stem):
    if stem not in _FORMS:
        path = FORMS / f"{stem}.toml"
        _FORMS[stem] = tomllib.loads(path.read_text()) if path.exists() else None
    return _FORMS[stem]


def form_strings(f):
    """Every rendered string in a form, with the step it belongs to (0 = chapter level)."""
    for key in ("gist",):
        yield 0, f.get(key, "")
    yield 0, (f.get("timeline") or {}).get("row", "")
    for v in (f.get("frame") or {}).values():
        yield 0, v
    for i, s in enumerate(f.get("steps", []), 1):
        for key in ("claim", "text", "quote"):
            yield i, s.get(key, "")
        for ref in s.get("see", []):
            yield i, f"[[{ref}]]"
    for c in f.get("code", []):
        yield 0, c.get("note", "")


def targets_of(stem):
    f = form_of(stem)
    found = []
    for i, text in form_strings(f):
        for m in WIKI.finditer(text):
            found.append((i, m.group(1)))
    return found


def figure_homes():
    homes = {}
    for _, stem in PARTS:
        f = stem and form_of(stem)
        for i, s in enumerate((f or {}).get("steps", []), 1):
            if s.get("figure"):
                homes.setdefault(s["figure"], (stem, i))
    return homes


def link_to(here, ref, label=None):
    """Resolve one [[ref]] to a Markdown link. A bad reference stops the build."""
    if ref.startswith("fig:"):
        slug = ref[4:]
        home = figure_homes().get(slug)
        if not home:
            raise SystemExit(f"[[{ref}]] in {here}: no step places that figure")
        stem, _ = home
        url = f"#fig-{slug}" if stem == here else f"{stem}.md#fig-{slug}"
        return f"[{label or plate(slug)[1]}]({url})"
    stem, _, step = ref.partition("#")
    f = form_of(stem)
    if not f and not step and (CHAPTERS / f"{stem}.md").exists():
        return f"[{label or h1_of(CHAPTERS / f'{stem}.md')}]({stem}.md)"
    if not f:
        raise SystemExit(f"[[{ref}]] in {here}: forms/{stem}.toml does not exist")
    if step and not (step.isdigit() and 1 <= int(step) <= len(f["steps"])):
        raise SystemExit(f"[[{ref}]] in {here}: no step {step}")
    base = "" if stem == here else f"{stem}.md"
    url = base + (f"#step-{step}" if step else "")
    if not url:
        url = "#"
    if label is None:
        label = f"{f['title']}, step {step}" if step else f["title"]
    return f"[{label}]({url})"


def resolve(here, text):
    return WIKI.sub(lambda m: link_to(here, m.group(1), m.group(2)), text)


def backlinks(stem):
    """Chapters and steps that link here, computed from the forms themselves."""
    hits = []
    for _, other in PARTS:
        if not other or other == stem or not form_of(other):
            continue
        for i, ref in targets_of(other):
            if ref.startswith("fig:"):
                home = figure_homes().get(ref[4:])
                target = home[0] if home else None
            else:
                target = ref.partition("#")[0]
            if target == stem:
                hits.append((other, i))
    return sorted(set(hits))


def render_form(stem):
    """A chapter form (forms/<stem>.toml) rendered to Markdown. The form holds
    the course's own frame and mined lines; the renderer adds no prose."""
    f = form_of(stem)
    R = lambda t: resolve(stem, t)
    out = [f"# {f['title']}", "", f"*{R(f['gist'])}*", ""]
    tl = f.get("timeline")
    if tl:
        link = f" [See the timeline](architectures.md#fig-{tl['plate']})." if tl.get("plate") else ""
        out += [f"> **On the timeline.** {R(tl['row'])}{link}", ""]
    fr = f.get("frame")
    if fr:
        out += ["| | |", "|---|---|"]
        for key, label in (("data", "Data"), ("representation", "Representation"),
                           ("transformation", "Transformation"), ("evidence", "Evidence")):
            if fr.get(key):
                out.append(f"| **{label}** | {R(fr[key])} |")
        out.append("")
    needs = [(o, form_of(o)["next"]["missing"]) for _, o in PARTS
             if o and o != stem and form_of(o) and form_of(o).get("next", {}).get("chapter") == stem]
    if needs:
        out += ["> **Answers what other chapters left open.** " + " ".join(
            f"{R(m)} ([{form_of(o)['title']}]({o}.md))" for o, m in needs), ""]
    for i, s in enumerate(f.get("steps", []), 1):
        out += [f'<a id="step-{i}"></a>', "", f"## {i}. {R(s['claim'])}", ""]
        body = s.get("text") or s.get("quote")
        if body:
            out += [R(body), ""]
        if s.get("figure"):
            out += [f"{{{{figure {s['figure']}}}}}", ""]
        if s.get("see"):
            out += ["**See also:** " + " · ".join(link_to(stem, r) for r in s["see"]), ""]
    if f.get("code"):
        out += ["## In code", ""]
        for c in f["code"]:
            src = (CODE / c["file"]).read_text().rstrip()
            src = "\n".join(l for l in src.splitlines()
                            if not l.startswith("import sys; sys.path"))
            out += [f"### {c['label']}", ""]
            if c.get("credit"):
                out += [f"<small>{c['credit']}</small>", ""]
            out += ["```python", src, "```", "", "Output:", "", "```text", run_script(c["file"]), "```", ""]
            if c.get("note"):
                out += [R(c["note"]), ""]
    nx = f.get("next")
    if nx:
        title = h1_of(CHAPTERS / f"{nx['chapter']}.md") if (CHAPTERS / f"{nx['chapter']}.md").exists() else nx['chapter']
        out += ["## Still missing", "", f"{R(nx['missing'])} → [{title}]({nx['chapter']}.md)", ""]
    back = backlinks(stem)
    if back:
        items = []
        for other, i in back:
            t = form_of(other)["title"]
            items.append(f"[{t}]({other}.md#step-{i})" if i else f"[{t}]({other}.md)")
        out += ["## Linked from", "", " · ".join(dict.fromkeys(items)), ""]
    return "\n".join(out)


FIGURE_LINE = re.compile(r"^\{\{figure ([\w-]+)\}\}\s*$", re.M)


def h1_of(path):
    form = FORMS / f"{path.stem}.toml"
    if form.exists():
        return tomllib.loads(form.read_text())["title"]
    for line in path.read_text().splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    raise SystemExit(f"{path.name} has no '# ' title")


def patch_plate(slug, text):
    """Apply figures_patches.toml to one plate's HTML; fail if an `old` is missing."""
    for p in tomllib.loads(PATCHES.read_text()).get("patch", []):
        if p["slug"] != slug:
            continue
        if p["old"] not in text:
            raise SystemExit(f"figures_patches.toml: {slug}: {p['old']!r} not found in figures/{slug}.html")
        text = text.replace(p["old"], p["new"])
    return text


def plate(slug):
    """Return (eyebrow, title, svg) for a figure page."""
    path = FIGURES / f"{slug}.html"
    if not path.exists():
        raise SystemExit(f"{{{{figure {slug}}}}}: figures/{slug}.html does not exist")
    t = patch_plate(slug, path.read_text())
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
    homes = figure_homes()
    svg = re.sub(r'href="([\w-]+)\.html"',
                 lambda m: f'href="{homes[m.group(1)][0]}.html#fig-{m.group(1)}"' if m.group(1) in homes else m.group(0), svg)
    svg = re.sub(r"<svg\b",f'<svg class="plate-svg" focusable="false"', svg, count=1)
    return (eyebrow.group(1).strip() if eyebrow else "",
            title.group(1).strip() if title else slug, svg)


def figure_block(slug):
    eyebrow, title, svg = plate(slug)
    # The book is for a general audience: drop the course's "Week 06 ·" prefix from captions.
    eyebrow = re.sub(r"^\s*week\s*\d+\s*(?:&middot;|&#183;|·)\s*", "", eyebrow, flags=re.I)
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
        if (FORMS / f"{stem}.toml").exists():
            text = render_form(stem)
        else:
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
    lines += ["", "# Back matter", "", "- [Index of terms and steps](index-terms.md)", "- [All figures](figures.md)"]
    return "\n".join(lines) + "\n"


def plain(text):
    """A form string with wiki links reduced to their labels, for pages outside chapters/."""
    return WIKI.sub(lambda m: m.group(2) or (form_of(m.group(1).partition("#")[0]) or {"title": m.group(1)})["title"], text)


def title_page():
    cell = lambda t: plain(t).replace("|", "\\|")
    rows = ["| | Representation | Transformation | Evidence | Still missing |", "|---|---|---|---|---|"]
    for label, stem in PARTS:
        if stem is None:
            rows.append(f"| **{label}** | | | | |")
            continue
        f = form_of(stem)
        fr = f.get("frame", {})
        nx = f.get("next")
        miss = ""
        if nx:
            miss = f"{cell(nx['missing'])} → [{h1_of(CHAPTERS / (nx['chapter'] + '.md'))}](chapters/{nx['chapter']}.md)"
        rows.append(f"| {label} · [{f['title']}](chapters/{stem}.md) | "
                    + " | ".join(cell(fr.get(k, "")) for k in ("representation", "transformation", "evidence"))
                    + f" | {miss} |")
    return (
        "# CSC 411: Intermediate Machine Learning\n\n"
        "A reference for students coming from biology, biochemistry and chemistry, "
        "with no calculus, linear algebra or machine learning assumed. Every chapter "
        "has the same frame: a representation, a transformation, and the evidence that "
        "the transformation worked. Each chapter ends on what it still lacks, and the "
        "chapter that supplies it is linked. Read the table down to see the chain, "
        "or start from the [architectures](chapters/architectures.md) map.\n\n"
        + "\n".join(rows) + "\n\n"
        "See also the [index of terms and steps](index-terms.md) and the [figures](figures.md).\n"
    )


TERM_SKIP = {"a", "an", "the", "in", "on", "new", "what", "what\u2019s", "carry", "invented", "surprise", "one"}


def index_page():
    terms = {}
    claims = ["## Steps, by chapter", ""]
    for label, stem in PARTS:
        f = stem and form_of(stem)
        if not f:
            continue
        claims += [f"### {label} · [{f['title']}](chapters/{stem}.md)", ""]
        for i, st in enumerate(f["steps"], 1):
            claims.append(f"{i}. [{plain(st['claim'])}](chapters/{stem}.md#step-{i})")
            body = st.get("text") or st.get("quote") or ""
            for t in re.findall(r"\*\*([^*]{3,40}?)\*\*", plain(body)):
                t = t.strip(" .,:;`'").replace("`", "").strip().lower()
                if t and len(t.split()) <= 3 and "?" not in t and t.split()[0] not in TERM_SKIP:
                    terms.setdefault(t, []).append((f["title"], stem, i))
        claims.append("")
    out = ["# Index", "", "## Terms", "",
           "Each term is set in bold where a chapter defines or leans on it.", ""]
    for t in sorted(terms):
        links = " · ".join(f"[{title}, step {i}](chapters/{stem}.md#step-{i})"
                           for title, stem, i in dict.fromkeys(terms[t]))
        out.append(f"- **{t}**: {links}")
    return "\n".join(out + [""] + claims) + "\n"


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
    (SRC / "index-terms.md").write_text(index_page())
    shutil.copytree(FIGURES, SRC / "figures")
    for slug in sorted({p["slug"] for p in tomllib.loads(PATCHES.read_text()).get("patch", [])}):
        dst = SRC / "figures" / f"{slug}.html"
        if not dst.exists():
            raise SystemExit(f"figures_patches.toml: figures/{slug}.html does not exist")
        dst.write_text(patch_plate(slug, dst.read_text()))
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
