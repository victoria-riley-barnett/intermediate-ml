#!/usr/bin/env python3
"""Build the CSC 411 book into book/out/.

    python3 book/build.py
    python3 -m http.server -d book/out 8000      # then open http://localhost:8000

What it does, in order:

1. Runs verify.py over book/atoms/: stops on any atom that fails or has drifted.
2. Writes the reader view (reader.py): one plain HTML page per chapter, composed
   from forms/<stem>.toml and its atoms; one page per atom; the ledger; the plates
   (figures/, with figures_patches.toml applied); the home page.

Every link is relative, so the same output serves at / or under a Pages subpath.
The helpers below (plates, wiki links, the older mdBook renderer) are shared with
reader.py. Standard library only.
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
        for sec in (f or {}).get("section", []):
            for para in sec.get("para", []):
                for slug in para.get("figures", []):
                    homes.setdefault(slug, (stem, 0))
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
    if step and f.get("section"):
        step = ""  # an atom-form chapter has sections, not numbered steps: link the chapter
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
    if f.get("section"):
        return render_atom_form(stem)
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


# ── Atoms ────────────────────────────────────────────────────────────────
# Atoms live in atoms/<stem>.toml and are verified by verify.py before anything
# renders. A chapter whose form has [[section]] tables is laid out from atoms:
# each atom one line, its evidence in the right margin, glue slots left visibly
# empty for the author. Every atom also gets its own page under atoms/.

ATOMS = {}       # id -> atom (with state, detail, chapter)
USED_BY = {}     # id -> [ids that use it]
APPEARS = {}     # id -> (chapter stem, section title)
STATE_MARK = {"pass": "●", "fail": "✕", "unsigned": "○", "drift": "◐"}


def load_atoms():
    import verify
    atoms = verify.verify_all()
    c = verify.counts(atoms)
    print(f"atoms: {len(atoms)}  " + "  ".join(f"{k} {n}" for k, n in c.items()))
    bad = [a for a in atoms if a["state"] in ("fail", "drift")]
    if bad:
        raise SystemExit("verify.py: " + "; ".join(f"{a['state']} {a['id']}: {a['detail']}" for a in bad))
    for a in atoms:
        ATOMS[a["id"]] = a
        for u in a.get("uses", []):
            USED_BY.setdefault(u, []).append(a["id"])
    for _, stem in PARTS:
        f = stem and form_of(stem)
        for sec in (f or {}).get("section", []):
            for para in sec["para"]:
                for i in para["atoms"]:
                    if i not in ATOMS:
                        raise SystemExit(f"forms/{stem}.toml: atom {i} is not in atoms/")
                    APPEARS[i] = (stem, sec["name"])
        for i in (f or {}).get("questions", {}).get("atoms", []):
            if i not in ATOMS:
                raise SystemExit(f"forms/{stem}.toml: atom {i} is not in atoms/")
            APPEARS[i] = (stem, "questions")


def inline(text):
    """Atom text to HTML: escape, then `code`."""
    t = html.escape(text, quote=False)
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", t)


def atom_href(i, from_dir):
    """Link to an atom page (or a chapter, for a chapter stem) from chapters/ or atoms/."""
    if i in ATOMS:
        return f"../atoms/{i}.html"
    return f"../chapters/{i}.html"


def atom_label(i):
    a = ATOMS.get(i)
    if not a:
        f = form_of(i)
        return f["title"] if f else i
    return a.get("term") or i.split(".", 1)[-1].replace("-", " ")


def evidence(a, here="chapters"):
    v = a["verify"]
    what = {"run": f"run · {v.get('script', '').split('/')[-1]}",
            "plate": f"plate · {v.get('plate', '')}",
            "computed": "computed",
            "hand": "by hand"}.get(v.get("method"), "?")
    return (f'<aside class="atom-ev st-{a["state"]}"><a href="{atom_href(a["id"], here)}">'
            f'<span class="mark">{STATE_MARK[a["state"]]}</span> {a["state"]}</a>'
            f'<span class="how">{html.escape(what)}</span></aside>')


def atom_row(a):
    term = f'<b class="atom-term">{html.escape(a["term"])}</b> ' if a.get("term") else ""
    body = f'{term}{inline(a["text"])}'
    if a["kind"] == "question":
        body += f'<details><summary>answer</summary>{inline(a.get("answer", ""))}</details>'
    return (f'<div class="atom k-{a["kind"]}" id="a-{a["id"]}">'
            f'<span class="atom-kind">{a["kind"]}</span><div class="atom-body">{body}</div>'
            f'{evidence(a)}</div>')


def glue_slot(g):
    if g.get("text"):
        return f'<div class="glue">{inline(g["text"])}</div>'
    return f'<div class="glue empty" title="glue slot: {html.escape(g["name"])}">author prose goes here · <code>{html.escape(g["name"])}</code></div>'


def render_atom_form(stem):
    f = form_of(stem)
    glue = {}
    for g in f.get("glue", []):
        glue.setdefault(g.get("after", ""), []).append(g)
    out = [f"# {f['title']}", "", f"*{f['gist']}*", ""]
    tl = f.get("timeline")
    if tl:
        link = f" [See the timeline](architectures.md#fig-{tl['plate']})." if tl.get("plate") else ""
        out += [f"> **On the timeline.** {tl['row']}{link}", ""]
    fr = f.get("frame", {})
    if fr:
        out += ["| | |", "|---|---|"] + [f"| **{k.title()}** | {fr[k]} |" for k in
                ("data", "representation", "transformation", "evidence") if fr.get(k)] + [""]
    states = [ATOMS[i]["state"] for sec in f["section"] for i in sec["atoms"]]
    out += ['<p class="atom-tally">' + " · ".join(
        f'<span class="st-{s}">{STATE_MARK[s]} {states.count(s)} {s}</span>'
        for s in ("pass", "unsigned", "drift", "fail") if states.count(s)) +
        ' · <a href="../ledger.html">ledger</a></p>', ""]
    out += [glue_slot(g) for g in glue.get("", [])] + [""]
    for sec in f["section"]:
        out += [f"## {sec['title']}", ""]
        rows = []
        for i in sec["atoms"]:
            rows.append(atom_row(ATOMS[i]))
            rows += [glue_slot(g) for g in glue.get(i, [])]
        out += ['<div class="atoms">' + "".join(rows) + "</div>", ""]
        if sec.get("figures"):
            out += ['<div class="multiples">', ""]
            out += [f"{{{{figure {slug}}}}}" for slug in sec["figures"]]
            out += ["", "</div>", ""]
    if f.get("code"):
        out += ["## In code", ""]
        for c in f["code"]:
            src = (CODE / c["file"]).read_text().rstrip()
            src = "\n".join(l for l in src.splitlines() if not l.startswith("import sys; sys.path"))
            out += [f"### {c['label']}", ""]
            if c.get("credit"):
                out += [f"<small>{c['credit']}</small>", ""]
            out += ["```python", src, "```", "", "```text", run_script(c["file"]), "```", ""]
    nx = f.get("next")
    if nx:
        nf = form_of(nx["chapter"])
        out += ["## Still missing", "", f"{nx['missing']} → [{nf['title'] if nf else nx['chapter']}]({nx['chapter']}.md)", ""]
    return "\n".join(out)


def atom_page(a):
    v = a["verify"]
    title = a.get("term") or a["id"]
    out = [f"# {html.escape(title)}", "",
           f'<p class="atom-id"><code>{a["id"]}</code> · {a["kind"]}</p>', "",
           f'<div class="atom-card"><p class="atom-text">{inline(a["text"])}</p></div>', ""]
    if a["kind"] == "question":
        out += [f'<details><summary>answer</summary>{inline(a.get("answer", ""))}</details>', ""]
    out += ["## Evidence", "", f'<p class="ev-state st-{a["state"]}">{STATE_MARK[a["state"]]} <b>{a["state"]}</b> · {html.escape(a["detail"])}</p>', ""]
    m = v.get("method")
    if m == "run":
        exp = v["expect"] if isinstance(v["expect"], list) else [v["expect"]]
        out += [f"Runs `book/code/{v['script']}` and requires these lines in its output:", "", "```text"] + exp + ["```", ""]
    elif m == "plate":
        out += [f"Every number in the sentence is looked up in the description of the plate [{plate(v['plate'])[1]}](../figures/{v['plate']}.html).", ""]
    elif m == "computed":
        out += ["Evaluates:", "", "```python", v["expr"], "```", ""]
        if v.get("number"):
            out += [f"and compares it, rounded, with **{v['number']}** in the sentence.", ""]
    elif m == "hand":
        out += ["A machine cannot check this sentence. It counts once the author signs it." if not v.get("signed")
                else f"Signed by the author on {v['signed']}.", ""]
    src = a.get("source")
    if src:
        out += ["## Source", "", f"Written from *{src['heading']}* in `{src['file']}` (section sha1 `{src.get('sha1') or '—'}`). "
                "If that section changes, this atom shows **drift** until it is reviewed.", ""]
    def links(ids):
        return " · ".join(f"[{html.escape(atom_label(i))}]({atom_href(i, 'atoms')})" for i in ids)
    if a.get("uses"):
        out += ["## Uses", "", links(a["uses"]), ""]
    if USED_BY.get(a["id"]):
        out += ["## Used by", "", links(USED_BY[a["id"]]), ""]
    if a.get("see"):
        out += ["## See also", "", links(a["see"]), ""]
    if a["id"] in APPEARS:
        stem, sec = APPEARS[a["id"]]
        out += ["## Appears in", "", f"[{form_of(stem)['title']}](../chapters/{stem}.html#a-{a['id']}), *{sec}*", ""]
    return "\n".join(out)


def ledger_page():
    import verify
    atoms = list(ATOMS.values())
    c = verify.counts(atoms)
    out = ["# Ledger", "",
           "Every atom in the book, with the check that stands behind it. "
           "**pass**: a machine check succeeded (a script's output, a plate's numbers, or a computation). "
           "**unsigned**: no machine can check it; it waits for the author's signature. "
           "**drift**: the course section it was written from has changed. **fail**: the build stops.", "",
           '<p class="atom-tally">' + " · ".join(f'<span class="st-{k}">{STATE_MARK[k]} {n} {k}</span>' for k, n in c.items()) +
           f" · {len(atoms)} atoms</p>", "",
           '<div class="ledger-filter">chapter <select id="f-ch"><option value="">all</option>' +
           "".join(f'<option>{s}</option>' for s in dict.fromkeys(a["chapter"] for a in atoms)) +
           '</select> kind <select id="f-kind"><option value="">all</option>' +
           "".join(f'<option>{k}</option>' for k in sorted({a["kind"] for a in atoms})) +
           '</select> state <select id="f-st"><option value="">all</option>' +
           "".join(f'<option>{k}</option>' for k in c) + "</select></div>", "",
           '<table class="ledger"><thead><tr><th>atom</th><th>kind</th><th>check</th><th>state</th><th>detail</th></tr></thead><tbody>']
    for a in atoms:
        out.append(f'<tr data-ch="{a["chapter"]}" data-kind="{a["kind"]}" data-st="{a["state"]}">'
                   f'<td><a href="atoms/{a["id"]}.html">{a["id"]}</a></td><td>{a["kind"]}</td>'
                   f'<td>{a["verify"].get("method")}</td><td class="st-{a["state"]}">{STATE_MARK[a["state"]]} {a["state"]}</td>'
                   f'<td>{html.escape(a["detail"])}</td></tr>')
    out += ["</tbody></table>", "",
            "<script>(function(){var s=['f-ch','f-kind','f-st'].map(function(i){return document.getElementById(i)});"
            "function go(){document.querySelectorAll('table.ledger tbody tr').forEach(function(r){"
            "var ok=(!s[0].value||r.dataset.ch==s[0].value)&&(!s[1].value||r.dataset.kind==s[1].value)&&(!s[2].value||r.dataset.st==s[2].value);"
            "r.style.display=ok?'':'none'})}s.forEach(function(e){e.addEventListener('change',go)})})();</script>", ""]
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
    dst.mkdir(parents=True, exist_ok=True)
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
    lines += ["", "# Back matter", "", "- [Index of terms and steps](index-terms.md)", "- [All figures](figures.md)",
              "- [Ledger](ledger.md)"]
    lines += [f"    - [{a['id']}](atoms/{a['id']}.md)" for a in ATOMS.values()]
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
        for sec in f.get("section", []):
            claims.append(f"- {sec['title']}: " + " · ".join(
                f"[{atom_label(i)}](atoms/{i}.md)" for i in sec["atoms"]))
        for i, st in enumerate(f.get("steps", []), 1):
            claims.append(f"{i}. [{plain(st['claim'])}](chapters/{stem}.md#step-{i})")
            body = st.get("text") or st.get("quote") or ""
            for t in re.findall(r"\*\*([^*]{3,40}?)\*\*", plain(body)):
                t = t.strip(" .,:;`'").replace("`", "").strip().lower()
                if t and len(t.split()) <= 3 and "?" not in t and t.split()[0] not in TERM_SKIP:
                    terms.setdefault(t, []).append((f["title"], stem, i))
        claims.append("")
    for a in ATOMS.values():
        if a["kind"] == "term":
            terms.setdefault(a["term"], []).append(("atom", a["id"], 0))
    out = ["# Index", "", "## Terms", "",
           "Each term links to its atom: the definition, its check, and what uses it.", ""]
    for t in sorted(terms):
        links = " · ".join(f"[definition](atoms/{stem}.md)" if title == "atom" else
                           f"[{title}, step {i}](chapters/{stem}.md#step-{i})"
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

[output.html.fold]
enable = true
level = 0

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
    """Verify the atoms, then write the reader view (reader.py) into OUT."""
    global OUT
    for a in argv:
        if a.startswith("--out="):
            OUT = pathlib.Path(a.split("=", 1)[1]).resolve()
    import reader
    reader.build = sys.modules[__name__]  # run as a script, this module is __main__, not `build`
    load_atoms()
    work = OUT.with_name(OUT.name + ".new")
    shutil.rmtree(work, ignore_errors=True)
    used = reader.write(work)
    # swap in place, so a server already pointed at OUT keeps serving
    if OUT.exists():
        for child in OUT.iterdir():
            shutil.rmtree(child) if child.is_dir() else child.unlink()
    else:
        OUT.mkdir(parents=True)
    for child in work.iterdir():
        shutil.move(str(child), OUT / child.name)
    work.rmdir()
    print(f"built {OUT}  ({len(used)} plates placed)")


if __name__ == "__main__":
    main(sys.argv[1:])
