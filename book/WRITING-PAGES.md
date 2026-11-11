# Writing a page

The book is a set of short pages, one per idea, composed into chapters. You write
pages; chapters are assembled from them by `book/build.py` (see `chapters/*.toml`).
`PAGEMAP.md` says which pages exist, which chapter each belongs to, its plates and its
sources. `VOICE.md` says how the author writes. The exemplars are `pages/loss.md`,
`pages/softmax.md` and `pages/three-readers.md`.

## Who it is for

A curious general reader with no mathematics beyond arithmetic: someone from biology,
biochemistry or chemistry. Not a student in a class. Never mention class time, labs,
homework, grading, quizzes, "this week", "Tuesday", "your turn", "the notebook above".

## What a page does

One idea per page. In this order:

1. **The plain explanation first**, in two or three short paragraphs: what the thing is
   and why anyone needs it. Ordinary words before notation. If a symbol appears, say
   in words what it stands for.
2. **One small worked example** with real numbers, the kind the author uses: penguins,
   the line y = 3x + 7, a gene and its k-mers, the S/x/T strings, protein residues.
3. **The plate** (`{{plate slug}}`), introduced by the sentence before it, or a small
   multiple where the page compares conditions.
4. Optionally, a short paragraph on what it does *not* do, or where it comes back
   (with a link).

80 to 350 words of prose, counting body text only (not front matter, notes, tables or
plate lines). Derivations, exact digits, edge cases and caveats go in margin notes
(`{{note: ...}}`) or are left out. Less is better than more.

- The `define` line is printed above the body: do not repeat it as the first sentence.
- Introduce the plate with one sentence; do not re-narrate what the plate already shows.
  If the plate has its own worked example, your example may use it or a different one
  from her material, not both at length.
- Do not end with a paragraph of links: the `see` field prints "See also" for you.
- A page with no plate carries its example in a small table or a checked number.

## Voice and sources

Write natural, warm, plain paragraphs in the author's register (`VOICE.md`), built from
two named sources:

- **Her material**: `411/weeks/*/lecture.md` and `lab.md` (weeks 5–12 are her best
  voice), her notebooks in `intermediate-ml/*.ipynb`, the plates' descriptions. Use
  her framings, her examples and her turns of phrase.
- **SmolML's guides** (`smolml/**/README.md`, MIT, by Pablo Rodríguez Martín) for clear
  beginner-level explanation of the mechanics, and its code for the pure-Python
  reference. When a page uses SmolML, credit it in the margin:
  `{{note: Explanation adapted from SmolML, utils/losses (MIT).}}`

Do not copy either one mechanically, do not compress into terse fragments, and do not
sound like a model summarising ("In summary", "It is important to note", "plays a
crucial role", "delve", "leverage"). Do not invent: no numbers, facts, history or
examples that are not in the sources. If the sources have almost nothing on a page,
write one honest sentence, set `stub = true`, and let the plate carry it.

## Numbers

Every number in the prose must come from a plate's description, a script's printed
output, or the source text, and the build checks this (the ledger lists any that it
cannot find). Show where a number comes from in the margin: `{{from: eq-softmax}}`
for a plate, `{{run: 06-multiclass/kmer_softmax.py | loss: 1.2}}` for a script (the
build runs it and fails if the line is not printed). Small whole numbers (0 to 10) are
not checked.

- Quote numbers exactly as the source prints them (`0.3` if the script prints `0.3`; the
  plate's `2.718`, not "about 2.7"). A number that appears only inside a script's code,
  not its printed output, is not found: describe it in words or leave it out.
- `{{run:}}` paths are relative to `book/code/`: `{{run: 02-autodifferentiation/one_step.py | loss 6.2568}}`.
- Put a `{{from:}}` or `{{run:}}` note right after the first number it supports; one per
  source per paragraph is enough.
- When sources disagree, the plate wins over the lecture, and the script wins over both.
  Do not resolve a disagreement in prose: use the plate's number, and report the
  disagreement in your reply.

## The file

`book/pages/<slug>.md`:

```
+++
title = "Softmax"
kind = "equation"              # concept | equation | architecture | experiment | code
frame = "transformation"       # representation | transformation | evidence (omit for code)
define = "Softmax turns a row of scores into shares that are all positive and add up to one."
plates = ["eq-softmax"]        # placed at the end unless the body places them
see = ["cross-entropy", "argmax"]
sources = [
  { file = "411/weeks/week06_multiclass/lecture.md", heading = "Exponentiate, then divide by the total" },
  { file = "smolml/smolml/utils/activation/README.md", heading = "Softmax" },
]
+++

Body in Markdown...
```

- `file` paths: course files relative to the `teaching` folder (`411/...`); SmolML as
  `smolml/...` (it is cloned at `intermediate-ml/.tools/smolml`); notebooks as
  `intermediate-ml/<name>.ipynb`. `heading` is the exact heading text, optional.
- `define`: one sentence a reader could quote. Plain words.

## Body syntax

| write | get |
|---|---|
| `[[softmax]]`, `[[cross-entropy|the loss]]` | a link to another page; use on the first mention of anything that has a page |
| `{{note: text}}` | a margin note beside this paragraph |
| `{{from: slug}}` | a margin note: this number is from that plate |
| `{{run: dir/script.py \| expected text}}` | a checked margin note |
| `{{plate slug}}` on its own line | the plate, at reading size, click for full size |
| `{{multiple key}}` on its own line | a small multiple from `multiples.py` |
| `{{code dir/script.py}}` on its own line | the script and its real output (code pages) |
| `*em*`, `**strong**`, `` `code` ``, `- lists`, `| tables |` | as usual |

Links: only to slugs in `PAGEMAP.md`. Link the first mention, inside the sentence,
with words that say where the link goes. Do not end a page with a list of links; the
`see` field does that.

## Code pages

A code page (`kind = "code"`) shows one script from `book/code/`, with a short
paragraph on what it does and what to look at in its output, then `{{code ...}}`.
Credit SmolML in a note if the script follows it. Where the course reaches PyTorch,
one line naming the library equivalent ("In PyTorch this is `F.cross_entropy`").

## Checking your page

    cd /Users/v/projects/intermediate-ml && /opt/homebrew/bin/python3 book/build.py --out=/Users/v/projects/intermediate-ml/book/_out/<your-name>

It must end with `built`. Then open the ledger line for your page in
`book/_out/<your-name>/ledger.html`: "numbers not found" should be empty. Delete your
`_out/<your-name>` folder when done. Edit only your own page files.
