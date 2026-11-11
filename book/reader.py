"""The reader view: the book as plain HTML pages, Tufte's page and Shutt's web.

    called by build.py after verify.py; writes OUT/

One column of running prose, a wide right margin for sidenotes and captions,
plates across text and margin, small multiples drawn from the chapter's scripts.
No sidebar, no badges: navigation is an Up link at the top and Next / See also
lines at the bottom. Atoms are sentences in paragraphs; a sentence with a
machine check gets a plain sidenote saying how we know. Glue slots are hidden
unless the page is opened with ?draft=1.

Standard library only.
"""
import html
import re
import shutil

import build
import multiples

H = html.escape
ARC = ("representation", "transformation", "evidence")
QUESTION = "What did the model learn from this representation, and what evidence supports that claim?"


# ── shared page shell ──────────────────────────────────────────────────────

def shell(title, body, depth=1, up=("CSC 411", "index.html")):
    pre = "../" * depth
    upl = f'<p class="up">Up: <a href="{pre}{up[1]}">{H(up[0])}</a></p>' if up else ""
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{H(title) if title == "CSC 411" else H(title) + " · CSC 411"}</title>
<link rel="stylesheet" href="{pre}figures/fonts/fonts.css">
<link rel="stylesheet" href="{pre}style/reader.css">
</head><body>
<article>
{upl}
{body}
</article>
<script>if (/[?&]draft=1/.test(location.search)) document.body.classList.add('draft');</script>
</body></html>
"""


def inline(text):
    t = H(text, quote=False)
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", t)


# ── sentences, terms and sidenotes ─────────────────────────────────────────

def term_index():
    """term (lower case) -> atom id, for every term atom in the book."""
    return {a["term"].lower(): i for i, a in build.ATOMS.items() if a["kind"] == "term"}


def link_terms(text_html, terms, seen, own=None):
    """Link the first use of each term in this section to its atom page.
    The atom that defines a term sets it as <dfn> instead."""
    for term, aid in sorted(terms.items(), key=lambda kv: -len(kv[0])):
        if term in seen and aid != own:
            continue
        pat = re.compile(rf"(?<![\w>/-])({re.escape(term)})(?![\w<])", re.I)
        m = pat.search(text_html)
        if not m:
            continue
        if aid == own:
            rep = f"<dfn>{m.group(1)}</dfn>"
        else:
            rep = f'<a class="term" href="../atoms/{aid}.html">{m.group(1)}</a>'
        text_html = text_html[:m.start()] + rep + text_html[m.end():]
        seen.add(term)
    return text_html


def how_we_know(a):
    """A plain sentence for the margin, or None for an atom only the author can sign."""
    v = a["verify"]
    m = v.get("method")
    if m == "run":
        exp = v["expect"] if isinstance(v["expect"], list) else [v["expect"]]
        lines = "<br>".join(f"<code>{H(' '.join(e.split()))}</code>" for e in exp)
        return f'Checked: running <a href="#code">{H(v["script"].split("/")[-1])}</a> prints<br>{lines}'
    if m == "plate":
        return f'The numbers are those on the plate <a href="#fig-{v["plate"]}"><i>{build.plate(v["plate"])[1]}</i></a>.'
    if m == "computed":
        if v.get("says"):
            return f"Checked by computation: {H(v['says'])}"
        return f"Checked by computation: <code>{H(v['expr'])}</code>."
    if m == "hand" and v.get("signed"):
        return f"Signed by the author, {H(v['signed'])}."
    return None


# ── figures ────────────────────────────────────────────────────────────────

def plate_figure(slug):
    eyebrow, title, svg = build.plate(slug)
    return (f'<figure class="wide" id="fig-{slug}"><div class="art">{svg}</div>'
            f'<figcaption><span class="ftitle">{title}</span> '
            f'<a href="../figures/{slug}.html">Full size.</a></figcaption></figure>')


def multiple_figure(key):
    draw, caption = multiples.MULTIPLES[key]
    return (f'<figure class="wide" id="mult-{key}"><div class="art">{draw()}</div>'
            f'<figcaption>{H(caption)} <span class="src">Drawn from the same arithmetic as '
            f'the scripts below, and checked against their printed values.</span></figcaption></figure>')


# ── chapter pages ──────────────────────────────────────────────────────────

def frame_block(f):
    fr = f.get("frame", {})
    q = fr.get("question") or QUESTION
    rows = "".join(f"<tr><th>{k}</th><td>{inline(fr[k])}</td></tr>"
                   for k in ("data", *ARC) if fr.get(k))
    tl = f.get("timeline")
    tline = (f'<p class="timeline">On the timeline: {inline(tl["row"])} '
             f'<a href="architectures.html#fig-{tl["plate"]}">See the plate.</a></p>') if tl else ""
    return f'<p class="question">{inline(q)}</p><table class="frame">{rows}</table>{tline}'


def glue_html(g):
    if g.get("text"):
        return f'<p class="glue-filled">{inline(g["text"])}</p>'
    return f'<p class="glue" title="glue slot">author prose · {H(g["name"])}</p>'


def atom_chapter(stem, f):
    terms = term_index()
    glue = {}
    for g in f.get("glue", []):
        glue.setdefault(g.get("after", ""), []).append(g)
    out = [f"<h1>{H(f['title'])}</h1>", frame_block(f)]
    out += [glue_html(g) for g in glue.get("", [])]
    for sec in f["section"]:
        out.append(f'<h2 id="{sec["name"]}">{sec["name"].capitalize()}</h2>')
        seen = set()
        for para in sec["para"]:
            sents, notes = [], []
            for aid in para["atoms"]:
                a = build.ATOMS[aid]
                s = link_terms(inline(a["text"]), terms, seen, own=aid if a["kind"] == "term" else None)
                sents.append(f'<span id="a-{aid}">{s}</span>')
                n = how_we_know(a)
                if n and f'<span class="sn">{n}</span>' not in notes:
                    notes.append(f'<span class="sn">{n}</span>')
            side = f'<aside class="margin">{"".join(notes)}</aside>' if notes else ""
            out.append(f'<div class="para"><p>{" ".join(sents)}</p>{side}</div>')
            for key in para.get("multiples", []):
                out.append(multiple_figure(key))
            for slug in para.get("figures", []):
                out.append(plate_figure(slug))
            for aid in para["atoms"]:
                out += [glue_html(g) for g in glue.get(aid, [])]
    q = f.get("questions", {}).get("atoms", [])
    if q:
        out.append('<h2 id="questions">Questions</h2><ol class="questions">')
        for aid in q:
            a = build.ATOMS[aid]
            out.append(f'<li>{inline(a["text"])}<details><summary>Answer</summary>{inline(a.get("answer", ""))}</details></li>')
        out.append("</ol>")
    out += code_blocks(f)
    ids = [i for sec in f["section"] for p in sec["para"] for i in p["atoms"]] + q
    unsigned = sum(1 for i in ids if build.ATOMS[i]["state"] == "unsigned")
    if unsigned:
        out.append(f'<p class="quiet">{unsigned} of {len(ids)} statements on this page are awaiting the '
                   f'author\'s signature; the rest are checked as the margin says. '
                   f'See <a href="../ledger.html">the ledger</a>.</p>')
    return out


def skeleton_chapter(stem, f):
    out = [f"<h1>{H(f['title'])}</h1>", frame_block(f)]
    for name in ARC:
        out.append(f'<h2 id="{name}">{name.capitalize()}</h2><p class="tbw">To be written.</p>')
    slugs = [s["figure"] for s in f.get("steps", []) if s.get("figure")]
    if slugs:
        out.append('<h2 id="plates">Plates</h2>')
        out += [plate_figure(s) for s in slugs]
    out += code_blocks(f)
    return out


def code_blocks(f):
    if not f.get("code"):
        return []
    out = ['<h2 id="code">In code</h2>']
    for c in f["code"]:
        src = (build.CODE / c["file"]).read_text().rstrip()
        src = "\n".join(l for l in src.splitlines() if not l.startswith("import sys; sys.path"))
        credit = f'<span class="sn">{H(c["credit"])}</span>' if c.get("credit") else ""
        out.append(f'<div class="para"><p class="codelabel">{H(c["label"])}</p>'
                   f'<aside class="margin">{credit}</aside></div>')
        out.append(f'<pre><code>{H(src)}</code></pre><pre class="output"><code>{H(build.run_script(c["file"]))}</code></pre>')
    return out


def chapter_page(i, stem):
    f = build.form_of(stem)
    body = atom_chapter(stem, f) if f.get("section") else skeleton_chapter(stem, f)
    stems = [s for _, s in build.PARTS if s]
    nxt = stems[i + 1] if i + 1 < len(stems) else None
    tail = ['<hr>']
    if nxt:
        tail.append(f'<p class="nav">Next: <a href="{nxt}.html">{H(build.form_of(nxt)["title"])}</a></p>')
    nx = f.get("next")
    if nx:
        tail.append(f'<p class="nav">Still missing: {inline(nx["missing"])} '
                    f'<a href="{nx["chapter"]}.html">{H(build.form_of(nx["chapter"])["title"])}</a> takes it up.</p>')
    see = ['<a href="../ledger.html">the ledger of every statement and its check</a>',
           '<a href="../figures.html">all plates</a>']
    if f.get("section"):
        see.insert(0, '<a href="?draft=1">this page with the author\'s glue slots shown</a>')
    tail.append(f'<p class="nav">See also: {", ".join(see)}.</p>')
    return shell(f["title"], "\n".join(body + tail))


# ── atom pages, ledger, figures, home ──────────────────────────────────────

def atom_page(a):
    def names(ids):
        return ", ".join(f'<a href="{i}.html">{H(build.atom_label(i))}</a>' if i in build.ATOMS
                         else f'<a href="../chapters/{i}.html">{H(build.form_of(i)["title"])}</a>' for i in ids)
    v = a["verify"]
    know = how_we_know(a) or "Nothing a machine can check. It counts when the author signs it; until then it is unsigned."
    know = re.sub(r'href="#(code|fig-[\w-]+)"', lambda m: f'href="../chapters/{a["chapter"]}.html#{m.group(1)}"', know)
    body = [f"<h1>{H(a.get('term') or build.atom_label(a['id']))}</h1>",
            f'<p class="statement">{inline(a["text"])}</p>']
    if a["kind"] == "question":
        body.append(f"<p><b>Answer.</b> {inline(a.get('answer', ''))}</p>")
    body.append(f"<p><b>How we know.</b> {know}</p>")
    src = a.get("source")
    if src:
        body.append(f"<p><b>Written from</b> the section <i>{H(src['heading'])}</i> of <code>{H(src['file'])}</code>. "
                    "If that section changes, this statement is marked as drifted until it is reread.</p>")
    if a.get("uses"):
        body.append(f"<p><b>Depends on</b> {names(a['uses'])}.</p>")
    if build.USED_BY.get(a["id"]):
        body.append(f"<p><b>Used by</b> {names(build.USED_BY[a['id']])}.</p>")
    where = build.APPEARS.get(a["id"])
    if where:
        body.append(f'<p><b>Appears in</b> <a href="../chapters/{where[0]}.html#a-{a["id"]}">'
                    f'{H(build.form_of(where[0])["title"])}</a>, under {H(where[1])}.</p>')
    if a.get("see"):
        body.append(f'<hr><p class="nav">See also: {names(a["see"])}.</p>')
    return shell(a.get("term") or a["id"], "\n".join(body), up=("the ledger", "ledger.html"))


def ledger_page():
    import verify
    atoms = list(build.ATOMS.values())
    c = verify.counts(atoms)
    rows = "".join(
        f'<tr><td><a href="atoms/{a["id"]}.html">{H(build.atom_label(a["id"]))}</a></td>'
        f'<td>{H(build.form_of(a["chapter"])["title"])}</td><td>{a["kind"]}</td>'
        f'<td>{a["verify"].get("method")}</td><td>{a["state"]}</td></tr>' for a in atoms)
    body = f"""<h1>The ledger</h1>
<p>Every statement in the book, and what stands behind it. Of {len(atoms)} statements, {c['pass']} are checked
by a machine: a script's printed output, the numbers on a plate, or a computation. {c['unsigned']} can only be
vouched for by the author and are waiting for her signature. {c['drift']} were written from a course section that
has since changed, and {c['fail']} fail. The book does not build if any statement fails or drifts.</p>
<table class="ledger"><thead><tr><th>statement</th><th>chapter</th><th>kind</th><th>check</th><th>state</th></tr></thead>
<tbody>{rows}</tbody></table>"""
    return shell("The ledger", body, depth=0, up=("CSC 411", "index.html"))


def figures_page(used):
    items = []
    for f in sorted(build.FIGURES.glob("*.html")):
        title = build.plate(f.stem)[1]
        where = ", ".join(f'<a href="chapters/{s}.html#fig-{f.stem}">{H(build.form_of(s)["title"])}</a>'
                          for s in used.get(f.stem, []))
        items.append(f'<li><a href="figures/{f.name}">{title}</a>{" · " + where if where else ""}</li>')
    return shell("All plates", "<h1>All plates</h1><ul class=\"plain\">" + "".join(items) + "</ul>",
                 depth=0, up=("CSC 411", "index.html"))


def home_page():
    items, n = [], 0
    for label, stem in build.PARTS:
        if stem is None:
            items.append(f"</ul><h2>{H(label)}</h2><ul class=\"plain\">")
            continue
        f = build.form_of(stem)
        state = "" if f.get("section") else ' <span class="tbw">(in preparation)</span>'
        items.append(f'<li><a href="chapters/{stem}.html">{H(f["title"])}</a>. {inline(f["gist"])}{state}</li>')
    body = f"""<h1>CSC 411: Intermediate Machine Learning</h1>
<p>A book for readers from biology, biochemistry and chemistry, with no calculus, linear algebra or machine
learning assumed. Each chapter asks the same question: {H(QUESTION[0].lower() + QUESTION[1:])} It answers in
three parts, the <i>representation</i>, the <i>transformation</i> and the <i>evidence</i>, and every statement in
it is either checked by a machine or waiting for the author's signature.</p>
<ul class="plain">{''.join(items)}</ul>
<hr><p class="nav">See also: <a href="ledger.html">the ledger</a>, <a href="figures.html">all plates</a>.</p>"""
    return shell("CSC 411", body.replace('<ul class="plain"></ul>', ""), depth=0, up=None)


def write(out):
    multiples.check_against_scripts()
    (out / "chapters").mkdir(parents=True)
    (out / "atoms").mkdir()
    shutil.copytree(build.FIGURES, out / "figures")
    for slug in sorted({p["slug"] for p in build.tomllib.loads(build.PATCHES.read_text()).get("patch", [])}):
        dst = out / "figures" / f"{slug}.html"
        dst.write_text(build.patch_plate(slug, dst.read_text()))
    shutil.copytree(build.STYLE, out / "style")
    used = {}
    stems = [s for _, s in build.PARTS if s]
    for i, stem in enumerate(stems):
        page = chapter_page(i, stem)
        for slug in re.findall(r'<figure class="wide" id="fig-([\w-]+)"', page):
            used.setdefault(slug, []).append(stem)
        (out / "chapters" / f"{stem}.html").write_text(page)
    for a in build.ATOMS.values():
        (out / "atoms" / f"{a['id']}.html").write_text(atom_page(a))
    (out / "ledger.html").write_text(ledger_page())
    (out / "figures.html").write_text(figures_page(used))
    (out / "index.html").write_text(home_page())
    return used
