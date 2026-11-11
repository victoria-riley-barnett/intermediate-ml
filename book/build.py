#!/usr/bin/env python3
"""Build the CSC 411 book: a wiki of pages, composed into chapters.

    python3 book/build.py                       # writes book/out/
    python3 -m http.server -d book/out 8000     # then open http://localhost:8000

The book is produced like a wiki and read like a book.

  pages/<slug>.md       one page per thing (a concept, an equation, an architecture,
                        an experiment, a script). TOML front matter between +++ lines,
                        then the body. See WRITING-PAGES.md.
  chapters/<stem>.toml  a chapter: title, gist, frame, and the ordered list of pages
                        it is composed from. Pages are transcluded whole.
  figures/              the plates; figures_patches.toml is applied to every copy.

Body syntax, beyond paragraphs, lists, tables, `code`, *emphasis* and **strong**:

  [[slug]]  [[slug|anchor text]]       a link to another page
  {{note: text}}                       a sidenote, set in the margin beside its paragraph
  {{run: dir/script.py | expected}}    a checked sidenote: the script must print `expected`
  {{from: plate-slug}}                 a sidenote naming the plate a number comes from
  {{plate slug}}        (own line)     the plate, at reader scale, click to enlarge
  {{multiple key}}      (own line)     a small multiple from multiples.py
  {{code dir/script.py}} (own line)    the script and its real output

Every number in a page's prose is looked for in the page's sources, its plates'
descriptions and its scripts' output; numbers found nowhere are listed on the ledger.
Every [[link]] must reach a page or a planned page (one named in a chapter), or the
build stops. The output works without JavaScript; links are relative. Stdlib only.
"""
import html
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tomllib

HERE = pathlib.Path(__file__).resolve().parent
PAGES = HERE / "pages"
CHAPTERS = HERE / "chapters"
FIGURES = HERE / "figures"
STYLE = HERE / "style"
CODE = HERE / "code"
PATCHES = HERE / "figures_patches.toml"
OUT = HERE / "out"
REPO = HERE.parent
COURSE = pathlib.Path(os.environ.get("COURSE_SRC", REPO.parent / "teaching"))
SMOLML = REPO / ".tools" / "smolml"

sys.path.insert(0, str(HERE))
import multiples  # noqa: E402

H = html.escape
KINDS = ("concept", "equation", "architecture", "experiment", "code")
FRAME = ("representation", "transformation", "evidence")
NUMBER = re.compile(r"(?<![\w.#/-])-?\d[\d,]*(?:\.\d+)?(?:e[+-]?\d+)?")

# ── loading ────────────────────────────────────────────────────────────────

def read_page(path):
    t = path.read_text()
    m = re.match(r"\+\+\+\n(.*?)\n\+\+\+\n", t, re.S)
    if not m:
        raise SystemExit(f"pages/{path.name}: no +++ front matter")
    meta = tomllib.loads(m.group(1))
    meta["slug"] = path.stem
    meta["body"] = t[m.end():].strip()
    for key in ("title", "kind"):
        if key not in meta:
            raise SystemExit(f"pages/{path.name}: front matter needs `{key}`")
    if meta["kind"] not in KINDS:
        raise SystemExit(f"pages/{path.name}: kind must be one of {', '.join(KINDS)}")
    return meta


def load():
    pages = {p.stem: read_page(p) for p in sorted(PAGES.glob("*.md"))}
    chapters = []
    for c in sorted(CHAPTERS.glob("*.toml")):
        ch = tomllib.loads(c.read_text())
        ch["stem"] = c.stem
        chapters.append(ch)
    chapters.sort(key=lambda c: c.get("order", 99))
    return pages, chapters


# ── plates ─────────────────────────────────────────────────────────────────

_PATCHES = None


def patch_plate(slug, text):
    """Apply figures_patches.toml to one plate's HTML; fail if an `old` is missing."""
    global _PATCHES
    if _PATCHES is None:
        _PATCHES = tomllib.loads(PATCHES.read_text()).get("patch", [])
    for p in _PATCHES:
        if p["slug"] != slug:
            continue
        if p["old"] not in text:
            raise SystemExit(f"figures_patches.toml: {slug}: {p['old']!r} not found in figures/{slug}.html")
        text = text.replace(p["old"], p["new"])
    return text


_PLATES = {}


def plate(slug):
    """(eyebrow, title, svg, desc) for a plate, ids prefixed so plates can share a page."""
    if slug in _PLATES:
        return _PLATES[slug]
    path = FIGURES / f"{slug}.html"
    if not path.exists():
        raise SystemExit(f"plate {slug}: figures/{slug}.html does not exist")
    t = patch_plate(slug, path.read_text())
    eyebrow = re.search(r'<p class="eyebrow">(.*?)</p>', t, re.S)
    title = re.search(r"<h1>(.*?)</h1>", t, re.S)
    desc = re.search(r"<desc[^>]*>(.*?)</desc>", t, re.S)
    i, j = t.find("<svg"), t.rfind("</svg>")
    svg = t[i: j + len("</svg>")]
    for name in sorted(set(re.findall(r'\bid="([^"]+)"', svg)), key=len, reverse=True):
        new = f"{slug}--{name}"
        svg = re.sub(rf'\bid="{re.escape(name)}"', f'id="{new}"', svg)
        svg = re.sub(rf'url\(#{re.escape(name)}\)', f"url(#{new})", svg)
        svg = re.sub(rf'href="#{re.escape(name)}"', f'href="#{new}"', svg)
        svg = re.sub(rf'(aria-(?:labelledby|describedby)="[^"]*?)\b{re.escape(name)}\b', rf"\g<1>{new}", svg)
    svg = re.sub(r'href="([\w-]+)\.html"', r'href="../figures/\1.html"', svg)
    svg = re.sub(r"<svg\b", '<svg class="plate" focusable="false"', svg, count=1)
    eb = re.sub(r"<[^>]+>", "", eyebrow.group(1)).strip() if eyebrow else ""
    eb = re.sub(r"^\s*week\s*\d+\s*(?:&middot;|&#183;|·)\s*", "", eb, flags=re.I)
    _PLATES[slug] = (html.unescape(eb), title.group(1).strip() if title else slug, svg,
                     html.unescape(desc.group(1)) if desc else "")
    return _PLATES[slug]


# ── scripts ────────────────────────────────────────────────────────────────

_RUNS = {}


def run_script(rel):
    if rel not in _RUNS:
        path = CODE / rel
        if not path.exists():
            raise SystemExit(f"code/{rel} does not exist")
        r = subprocess.run([sys.executable, path.name], cwd=path.parent, capture_output=True, text=True, timeout=300)
        if r.returncode != 0:
            raise SystemExit(f"code/{rel} failed:\n{r.stderr}")
        _RUNS[rel] = r.stdout.rstrip()
    return _RUNS[rel]


# ── sources ────────────────────────────────────────────────────────────────

def section(path, heading):
    """Text under a markdown heading, to the next heading of the same or higher level."""
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
        name = re.sub(r"\s*\{[^}]*\}\s*$", "", m.group(2))
        if start is None and name == heading:
            start, level = i + 1, len(m.group(1))
        elif start is not None and len(m.group(1)) <= level:
            return "\n".join(lines[start:i])
    if start is None:
        raise KeyError(heading)
    return "\n".join(lines[start:])


def source_path(f):
    if f.startswith("smolml/"):
        return SMOLML / f
    if f.startswith("intermediate-ml/"):
        return REPO / f[len("intermediate-ml/"):]
    return COURSE / f


def source_text(src):
    """The source's text (a section of it if `heading` is given), or None if not on this machine."""
    path = source_path(src["file"])
    if not path.exists():
        return None
    if path.suffix == ".ipynb":
        import json
        cells = json.loads(path.read_text()).get("cells", [])
        return "\n".join("".join(c.get("source", "")) for c in cells)
    if src.get("heading"):
        return section(path, src["heading"])
    return path.read_text()


# ── inline markdown ────────────────────────────────────────────────────────

class Ctx:
    """What a rendering needs to know, and what it met on the way."""
    def __init__(self, pages, planned):
        self.pages, self.planned = pages, planned
        self.notes, self.links, self.runs, self.problems, self.plates_used = [], set(), [], [], []


def wiki(ctx, slug, label):
    slug = slug.strip()
    if slug not in ctx.pages and slug not in ctx.planned:
        ctx.problems.append(f"dead link [[{slug}]]")
        return H(label or slug)
    ctx.links.add(slug)
    text = label or (ctx.pages[slug]["title"].lower() if slug in ctx.pages else slug.replace("-", " "))
    cls = "" if slug in ctx.pages else ' class="pending"'
    return f'<a href="../pages/{slug}.html"{cls}>{H(text)}</a>'


def sidenote(ctx, kind, arg):
    if kind == "note":
        ctx.notes.append(inline(ctx, arg, notes=False))
    elif kind == "run":
        script, _, expect = (s.strip() for s in arg.partition("|"))
        ok = expect in run_script(script)
        if not ok:
            ctx.problems.append(f"run {script}: does not print {expect!r}")
        ctx.runs.append((script, expect, ok))
        ctx.notes.append(f'Checked: running <code>{H(script.split("/")[-1])}</code> prints <code>{H(expect)}</code>.')
    elif kind == "from":
        slug = arg.strip()
        ctx.plates_used.append(slug)
        ctx.notes.append(f'From the plate <a href="#fig-{slug}">{plate(slug)[1]}</a>.')


def inline(ctx, text, notes=True):
    out, pos = [], 0
    token = re.compile(r"\{\{(note|run|from):\s*(.*?)\}\}|\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|`([^`]+)`")
    for m in token.finditer(text):
        out.append(emphasis(H(text[pos:m.start()], quote=False)))
        if m.group(1):
            if notes:
                sidenote(ctx, m.group(1), m.group(2))
        elif m.group(3):
            out.append(wiki(ctx, m.group(3), m.group(4)))
        else:
            out.append(f"<code>{H(m.group(5))}</code>")
        pos = m.end()
    out.append(emphasis(H(text[pos:], quote=False)))
    return re.sub(r"\s+([.,;:])", r"\1", "".join(out)).strip()


def emphasis(s):
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s)
    return re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2">\1</a>', s)


# ── blocks ─────────────────────────────────────────────────────────────────

def with_margin(ctx, inner):
    """A block and the sidenotes it raised, side by side."""
    notes, ctx.notes = ctx.notes, []
    side = "".join(f'<div class="sn">{n}</div>' for n in notes)
    return f'<div class="row">{inner}' + (f'<aside class="margin">{side}</aside>' if notes else "") + "</div>"


def plate_figure(slug):
    eb, title, svg, _ = plate(slug)
    lead = f'<span class="eb">{H(eb)}</span> ' if eb else ""
    return (f'<figure class="plate" id="fig-{slug}"><a class="art" href="../figures/{slug}.html" '
            f'title="Open full size">{svg}</a><figcaption>{lead}<span class="ft">{title}</span> '
            f'<a class="full" href="../figures/{slug}.html">Full size</a></figcaption></figure>')


def multiple_figure(key):
    draw, caption = multiples.MULTIPLES[key]
    return (f'<figure class="multiple" id="mult-{key}"><div class="art">{draw()}</div>'
            f'<figcaption>{H(caption)}</figcaption></figure>')


def code_figure(ctx, rel):
    src = (CODE / rel).read_text().rstrip()
    src = "\n".join(l for l in src.splitlines() if not l.startswith("import sys; sys.path"))
    ctx.runs.append((rel, "", True))
    return (f'<div class="code"><p class="codehead"><code>{H(rel)}</code></p>'
            f'<pre><code>{H(src)}</code></pre><p class="codehead">prints</p>'
            f'<pre class="output"><code>{H(run_script(rel))}</code></pre></div>')


BLOCK_START = re.compile(r"^(\{\{(plate|multiple|code) |```|\||- |\d+\. |#{2,4} |>)")


def blocks(ctx, body):
    """Markdown body to HTML, a row per block so sidenotes sit beside their paragraph."""
    out, lines, i = [], body.splitlines(), 0
    while i < len(lines):
        s = lines[i].strip()
        if not s:
            i += 1
            continue
        m = re.match(r"^\{\{(plate|multiple|code)\s+([\w./-]+)\}\}$", s)
        if m:
            kind, arg = m.groups()
            if kind == "plate":
                ctx.plates_used.append(arg)
                out.append(plate_figure(arg))
            elif kind == "multiple":
                out.append(multiple_figure(arg))
            else:
                out.append(code_figure(ctx, arg))
            i += 1
            continue
        if s.startswith("```"):
            j = i + 1
            while j < len(lines) and not lines[j].strip().startswith("```"):
                j += 1
            out.append(f'<div class="row"><pre><code>{H(chr(10).join(lines[i + 1:j]))}</code></pre></div>')
            i = j + 1
            continue
        hm = re.match(r"^#{2,4}\s+(.*)$", s)
        if hm:
            out.append(f"<h4>{inline(ctx, hm.group(1))}</h4>")
            i += 1
            continue
        if s.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(lines[i].strip())
                i += 1
            cells = [[c.strip() for c in r.strip("|").split("|")] for r in rows if not re.match(r"^\|[\s:|-]+\|$", r)]
            head, *rest = cells
            t = "<table><thead><tr>" + "".join(f"<th>{inline(ctx, c)}</th>" for c in head) + "</tr></thead><tbody>"
            t += "".join("<tr>" + "".join(f"<td>{inline(ctx, c)}</td>" for c in r) + "</tr>" for r in rest)
            out.append(with_margin(ctx, t + "</tbody></table>"))
            continue
        if re.match(r"^(- |\d+\. )", s):
            ordered, items = bool(re.match(r"^\d+\. ", s)), []
            while i < len(lines) and lines[i].strip():
                l = lines[i].strip()
                if re.match(r"^(- |\d+\. )", l):
                    items.append(re.sub(r"^(- |\d+\. )", "", l))
                else:
                    items[-1] += " " + l
                i += 1
            tag = "ol" if ordered else "ul"
            out.append(with_margin(ctx, f"<{tag}>" + "".join(f"<li>{inline(ctx, it)}</li>" for it in items) + f"</{tag}>"))
            continue
        if s.startswith(">"):
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip()[1:].strip())
                i += 1
            out.append(with_margin(ctx, f"<blockquote><p>{inline(ctx, ' '.join(quote))}</p></blockquote>"))
            continue
        para = [s]
        i += 1
        while i < len(lines) and lines[i].strip() and not BLOCK_START.match(lines[i].strip()):
            para.append(lines[i].strip())
            i += 1
        out.append(with_margin(ctx, f"<p>{inline(ctx, ' '.join(para))}</p>"))
    return "\n".join(out)


# ── the number audit ───────────────────────────────────────────────────────

def plain_numbers(text):
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"\{\{(plate|multiple|code|from|run)[^}]*\}\}", " ", text)
    text = re.sub(r"\[\[[^\]|]+\|?", " ", text)
    text = re.sub(r"`[^`]*`", " ", text)
    return [n.replace(",", "") for n in NUMBER.findall(text.replace("−", "-"))]


def audit(page, ctx):
    """Numbers in the prose that appear nowhere in its sources, plates or script output."""
    pool = []
    for src in page.get("sources", []):
        try:
            t = source_text(src)
        except KeyError:
            ctx.problems.append(f"source heading not found: {src['file']} § {src.get('heading')}")
            continue
        if t is not None:
            pool.append(t)
    for slug in set(page.get("plates", []) + ctx.plates_used):
        pool.append(plate(slug)[3])
    for script, _, _ in ctx.runs:
        pool.append(run_script(script))
    have = {n.replace(",", "") for n in NUMBER.findall(" ".join(pool).replace("−", "-"))}
    floats = set()
    for h in have:
        try:
            floats.add(float(h))
        except ValueError:
            pass
    missing = set()
    for n in plain_numbers(page.get("define", "") + "\n" + page["body"]):
        try:
            v = float(n)
        except ValueError:
            continue
        if v.is_integer() and 0 <= v <= 10:
            continue
        if v not in floats and -v not in floats:
            missing.add(n)
    return sorted(missing, key=lambda s: float(s))


# ── page shells ────────────────────────────────────────────────────────────

def shell(title, body, depth=1, where=""):
    pre = "../" * depth
    crumb = f' <span class="sep">/</span> {where}' if where else ""
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>{H(title)}</title>
<link rel="stylesheet" href="{pre}figures/fonts/fonts.css">
<link rel="stylesheet" href="{pre}style/book.css">
</head><body>
<header class="top"><nav><a href="{pre}index.html">CSC 411</a>{crumb}</nav></header>
<main>
{body}
</main></body></html>
"""


def render_page_body(page, ctx, heading="h1", link=False):
    """A page's title, kind line, definition and body; reused inside chapters."""
    ctx.plates_used = []
    title = H(page["title"])
    if link:
        title = f'<a href="../pages/{page["slug"]}.html">{title}</a>'
    hid = f' id="{page["slug"]}"' if heading == "h2" else ""
    parts = [f"<{heading}{hid}>{title}</{heading}>"]
    tags = [page["kind"]] + ([page["frame"]] if page.get("frame") in FRAME else []) + (["stub"] if page.get("stub") else [])
    parts.append(f'<p class="kind">{" · ".join(tags)}</p>')
    if page.get("define"):
        parts.append(with_margin(ctx, f'<p class="define">{inline(ctx, page["define"])}</p>'))
    parts.append(blocks(ctx, page["body"]))
    for slug in page.get("plates", []):
        if slug not in ctx.plates_used:
            ctx.plates_used.append(slug)
            parts.append(plate_figure(slug))
    return "\n".join(parts)


def page_html(page, ctx, appears, used_by):
    body = render_page_body(page, ctx)
    foot = ['<footer class="pagefoot">']
    if appears:
        foot.append('<p>Appears in ' + ", ".join(
            f'<a href="../chapters/{c["stem"]}.html#{page["slug"]}">{H(c["title"])}</a>' for c in appears) + ".</p>")
    if page.get("see"):
        foot.append('<p>See also ' + ", ".join(wiki(ctx, s, None) for s in page["see"]) + ".</p>")
    if used_by:
        foot.append('<p>Linked from ' + ", ".join(f'<a href="{s}.html">{H(t.lower())}</a>' for s, t in used_by) + ".</p>")
    srcs = page.get("sources", [])
    if srcs:
        items = "".join(f"<li><code>{H(s['file'])}</code>{' § ' + H(s['heading']) if s.get('heading') else ''}"
                        f"{' · ' + H(s['note']) if s.get('note') else ''}</li>" for s in srcs)
        foot.append(f'<details class="prov"><summary>Sources ({len(srcs)})</summary><ul>{items}</ul></details>')
    foot.append("</footer>")
    where = (f'<a href="../chapters/{appears[0]["stem"]}.html">{H(appears[0]["title"])}</a>') if appears else ""
    return shell(page["title"], body + "\n" + "\n".join(foot), where=where)


def placeholder(slug, appears):
    where = ", ".join(f'<a href="../chapters/{c["stem"]}.html">{H(c["title"])}</a>' for c in appears)
    return shell(slug, f'<h1>{H(slug.replace("-", " ").capitalize())}</h1>'
                 f'<p class="quiet">Not written yet. Part of {where}.</p>')


def chapter_html(ch, idx, chapters, pages, planned):
    num = f'<p class="kind">{H(ch["label"])}</p>' if ch.get("label") else ""
    out = [num, f'<h1>{H(ch["title"])}</h1>', f'<p class="gist">{H(ch["gist"])}</p>']
    fr = ch.get("frame", {})
    if fr:
        out.append('<dl class="frame">' + "".join(
            f"<dt>{k}</dt><dd>{H(fr[k])}</dd>" for k in ("data", *FRAME) if fr.get(k)) + "</dl>")
    present = [s for s in ch["pages"] if s in pages]
    if present:
        out.append('<nav class="contents"><ol>' + "".join(
            f'<li><a href="#{s}">{H(pages[s]["title"])}</a></li>' for s in present) + "</ol></nav>")
    glue = {g.get("after", ""): g for g in ch.get("glue", []) if g.get("text")}
    ctx = Ctx(pages, planned)
    if "" in glue:
        out.append(with_margin(ctx, f'<p class="glue">{H(glue[""]["text"])}</p>'))
    for slug in ch["pages"]:
        if slug in pages:
            out.append(f'<section class="page">{render_page_body(pages[slug], ctx, heading="h2", link=True)}</section>')
        else:
            out.append(f'<section class="page"><h2 id="{slug}">{H(slug.replace("-", " ").capitalize())}</h2>'
                       f'<p class="quiet">Not written yet.</p></section>')
        if slug in glue:
            out.append(with_margin(ctx, f'<p class="glue">{H(glue[slug]["text"])}</p>'))
    nav = ['<footer class="pagefoot">']
    if idx > 0:
        p = chapters[idx - 1]
        nav.append(f'<p>Previous: <a href="{p["stem"]}.html">{H(p["title"])}</a></p>')
    if idx + 1 < len(chapters):
        n = chapters[idx + 1]
        nav.append(f'<p>Next: <a href="{n["stem"]}.html">{H(n["title"])}</a></p>')
    nav.append('<p>See also <a href="../all-pages.html">every page</a> and <a href="../ledger.html">the ledger</a>.</p></footer>')
    return shell(ch["title"], "\n".join(out + nav), where=H(ch["title"])), ctx


def home_html(chapters):
    items = "".join(f'<li><a href="chapters/{c["stem"]}.html">{H(c["title"])}</a><span class="gist">{H(c["gist"])}</span></li>'
                    for c in chapters)
    return shell("CSC 411: Intermediate Machine Learning", f"""<h1>Intermediate Machine Learning</h1>
<p class="gist">A book for readers from biology, biochemistry and chemistry. No calculus, linear algebra or
machine learning assumed.</p>
<p>Every chapter asks the same question: what did the model learn from this representation, and what evidence
supports that claim? Each answer comes in three parts: the <em>representation</em>, the <em>transformation</em> and
the <em>evidence</em>. The chapters are built from short pages, one for each idea, and every page also stands on its own.</p>
<ol class="toc">{items}</ol>
<footer class="pagefoot"><p>See also <a href="all-pages.html">every page</a>, <a href="ledger.html">the ledger</a>
and <a href="figures.html">all plates</a>.</p></footer>""", depth=0)


def all_pages_html(pages, planned):
    rows = []
    for slug in sorted(set(pages) | planned, key=lambda s: (pages[s]["title"] if s in pages else s).lower()):
        if slug in pages:
            p = pages[slug]
            rows.append(f'<li><a href="pages/{slug}.html">{H(p["title"])}</a> <span class="kind">{p["kind"]}</span></li>')
        else:
            rows.append(f'<li><a class="pending" href="pages/{slug}.html">{H(slug.replace("-", " "))}</a> <span class="kind">not written yet</span></li>')
    return shell("Every page", f'<h1>Every page</h1><ul class="index">{"".join(rows)}</ul>', depth=0, where="Every page")


def ledger_html(report):
    rows = []
    for r in report:
        state = "not written" if r["missing"] else ("stub" if r.get("stub") else "written")
        nums = ", ".join(r["unsupported"]) or "—"
        rows.append(f'<tr><td><a href="pages/{r["slug"]}.html">{H(r["title"])}</a></td><td>{state}</td>'
                    f'<td>{r["sources"]}</td><td>{r["checks"]}</td><td>{H(nums)}</td></tr>')
    done = sum(1 for r in report if not r["missing"])
    bad = sum(len(r["unsupported"]) for r in report)
    return shell("The ledger", f"""<h1>The ledger</h1>
<p>Every page, how many sources it was written from, how many script checks stand behind it, and any number in its
prose that could not be found in its sources, its plates or its scripts' output. {done} of {len(report)} pages are
written; {bad} number{"s" if bad != 1 else ""} {"are" if bad != 1 else "is"} waiting to be checked.</p>
<table class="ledger"><thead><tr><th>page</th><th>state</th><th>sources</th><th>checks</th><th>numbers not found</th></tr></thead>
<tbody>{"".join(rows)}</tbody></table>""", depth=0, where="The ledger")


def figures_html(homes):
    items = []
    for f in sorted(FIGURES.glob("*.html")):
        where = ", ".join(f'<a href="pages/{s}.html">{s.replace("-", " ")}</a>' for s in sorted(homes.get(f.stem, [])))
        items.append(f'<li><a href="figures/{f.name}">{plate(f.stem)[1]}</a>{" · " + where if where else ""}</li>')
    return shell("All plates", '<h1>All plates</h1><ul class="index">' + "".join(items) + "</ul>", depth=0, where="All plates")


# ── main ───────────────────────────────────────────────────────────────────

def main(argv):
    global OUT
    for a in argv:
        if a.startswith("--out="):
            OUT = pathlib.Path(a.split("=", 1)[1]).resolve()
    multiples.check_against_scripts()
    pages, chapters = load()
    planned = {s for c in chapters for s in c["pages"]}
    appears = {}
    for c in chapters:
        for s in c["pages"]:
            appears.setdefault(s, []).append(c)
    work = OUT.with_name(OUT.name + ".new")
    shutil.rmtree(work, ignore_errors=True)
    for d in ("pages", "chapters"):
        (work / d).mkdir(parents=True)

    links_to, homes, problems, report = {}, {}, [], []
    for slug, page in pages.items():          # first pass: who links to whom
        ctx = Ctx(pages, planned)
        render_page_body(page, ctx)
        for s in ctx.links:
            links_to.setdefault(s, set()).add(slug)
        for p in set(page.get("plates", []) + ctx.plates_used):
            homes.setdefault(p, set()).add(slug)
    for slug, page in pages.items():
        used_by = sorted(((s, pages[s]["title"]) for s in links_to.get(slug, ()) if s != slug), key=lambda x: x[1])
        ctx = Ctx(pages, planned)
        (work / "pages" / f"{slug}.html").write_text(page_html(page, ctx, appears.get(slug, []), used_by))
        unsupported = audit(page, ctx)
        problems += [f"pages/{slug}.md: {p}" for p in ctx.problems]
        report.append({"slug": slug, "title": page["title"], "missing": False, "stub": page.get("stub"),
                       "sources": len(page.get("sources", [])), "checks": len(ctx.runs), "unsupported": unsupported})
    for slug in sorted(planned - set(pages)):
        (work / "pages" / f"{slug}.html").write_text(placeholder(slug, appears[slug]))
        report.append({"slug": slug, "title": slug.replace("-", " "), "missing": True, "sources": 0, "checks": 0, "unsupported": []})
    for i, ch in enumerate(chapters):
        text, ctx = chapter_html(ch, i, chapters, pages, planned)
        problems += [f"chapters/{ch['stem']}.toml: {p}" for p in ctx.problems]
        (work / "chapters" / f"{ch['stem']}.html").write_text(text)
    report.sort(key=lambda r: r["title"].lower())
    (work / "index.html").write_text(home_html(chapters))
    (work / "all-pages.html").write_text(all_pages_html(pages, planned))
    (work / "ledger.html").write_text(ledger_html(report))
    (work / "figures.html").write_text(figures_html(homes))
    shutil.copytree(FIGURES, work / "figures")
    for slug in sorted({p["slug"] for p in tomllib.loads(PATCHES.read_text()).get("patch", [])}):
        dst = work / "figures" / f"{slug}.html"
        dst.write_text(patch_plate(slug, dst.read_text()))
    shutil.copytree(STYLE, work / "style")

    problems = sorted(set(problems))
    if problems:
        print("\n".join(problems))
        raise SystemExit(f"{len(problems)} problem(s); the book was not built")
    OUT.mkdir(parents=True, exist_ok=True)
    for child in OUT.iterdir():
        shutil.rmtree(child) if child.is_dir() else child.unlink()
    for child in work.iterdir():
        shutil.move(str(child), OUT / child.name)
    work.rmdir()
    orphan = sorted(s for s in pages if s not in appears)
    print(f"pages: {len(pages)} written, {len(planned - set(pages))} planned · chapters: {len(chapters)} · "
          f"numbers not found: {sum(len(r['unsupported']) for r in report)}"
          + (f" · in no chapter: {', '.join(orphan)}" if orphan else ""))
    print(f"built {OUT}")


if __name__ == "__main__":
    main(sys.argv[1:])
