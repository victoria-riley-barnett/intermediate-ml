# Figure plate patches report

Course wording in `book/figures/*.html` is removed at build time by `book/figures_patches.toml`, applied by `patch_plate()` in `book/build.py` to the inline SVG (via `plate()`) and to every copied `figures/<slug>.html`. The plate files themselves are untouched. Each `old` must occur in its plate or the build stops. All occurrences are replaced; the count is shown as `xN` when above one. Replacements inside SVG `<text>` are no longer than the original.

34 plates patched, 108 patches.

## arch-mask

- `<p class="eyebrow">WEEK 11 &middot; ` → `<p class="eyebrow">`
- `the week-8 run log` → `the earlier run log`
- `"the week-11 lab's"` → `"the attention chapter's"`
- `which is what the course builds` → `which is what this book builds`
- `this is what the course builds (week 12 encoder)` → `"this is the encoder's case"`
- `"this course's own"` → `"this book's own"`

## budget-backward-cost

- `<p class="eyebrow">WEEK 03 &middot; ` → `<p class="eyebrow">`

## budget-t2

- `<p class="eyebrow">WEEK 11 &middot; ` → `<p class="eyebrow">`
- `"counted at the course's sequence length"` → `"counted at the book's sequence length"`
- `every week-08 batch was padded` → `every batch was padded`
- `THE LENGTH THE COURSE RAN` → `THE LENGTH RUN HERE`
- `the length the course ran` → `the length used here` (x2)
- `week 08 run_log.json` → `run_log.json`
- `the delivered week-08 config` → `the delivered config`
- `course arithmetic, not a published measurement` → `arithmetic, not a published measurement`
- `# week 11 attention();` → `# attention();`

## code-gd

- `<p class="eyebrow" style="font-size:10px; letter-spacing:0.14em;">WEEK 02 &middot; ` → `<p class="eyebrow" style="font-size:10px; letter-spacing:0.14em;">`

## code-object

- `<p class="eyebrow" style="font-size:10px; letter-spacing:0.14em;">WEEK 00 &middot; ` → `<p class="eyebrow" style="font-size:10px; letter-spacing:0.14em;">`
- `"The week-00 lab's Counter class"` → `The Counter class`
- `"The listing is the lab's text verbatim"` → `The listing is verbatim`
- `the class is verbatim from weeks/week00_oop/lab.md, 9 lines;` → `the class is verbatim, 9 lines;`
- `"is this figure's, not the lab's"` → `"is this figure's alone"`
- `the function listing is not in the lab:` → `the function listing is not above:`

## code-provenance

- `<p class="eyebrow" style="font-size:10px; letter-spacing:0.14em;">WEEK 15 &middot; ` → `<p class="eyebrow" style="font-size:10px; letter-spacing:0.14em;">`
- `"the course's human_data.txt"` → `human_data.txt` (x2)
- `what a CSC 411 project is graded on` → `what a project is checked on`
- `what a 411 project is graded on` → `what a project is checked on`

## compare-baseline-first

- `<p class="eyebrow">Week 14 &middot; ` → `<p class="eyebrow">`
- `The method on data the course did not choose` → `The method on data the book did not choose`
- `the model the week-06 lab delivers` → `the model the multiclass chapter delivers`
- `THE LABS&#8217; MODEL` → `THE GENE MODEL`
- `# the labs’ setting` → `# the usual setting`
- `week06 gene_family_data/human_data.txt` → `gene_family_data/human_data.txt`
- `the course artifact` → `the book artifact`
- `not the week-06 lab&#8217;s; the lab also learns` → `not the earlier model&#8217;s; it also learns`

## compare-linear-hidden

- `<p class="eyebrow">Week 04 &middot; ` → `<p class="eyebrow">`

## compare-regularizers

- `<p class="eyebrow">WEEK 07 &middot; ` → `<p class="eyebrow">`
- `the week 07 gene network` → `the gene network`
- `weeks/week07_generalization/run_log.json` → `run_log.json`

## compare-three-readers

- `<p class="eyebrow">Week 08 &middot; ` → `<p class="eyebrow">`
- `the delivered week-08 run: weeks/week08_sequence_failure/run_log.json` → `the delivered run: run_log.json`
- `one of week 10’s three reductions` → `one of the three reductions`
- `and week 11 is where attention generalises it` → `and attention generalises it`

## compare-three-reductions

- `<p class="eyebrow">Week 10 &middot; ` → `<p class="eyebrow">`
- `the week 8 recurrent reader` → `the recurrent reader`
- `attention in week 11 is the fourth` → `attention is the fourth`

## eq-chain-rule

- `<p class="eyebrow">Week 03 · ` → `<p class="eyebrow">`

## eq-layernorm

- `<p class="eyebrow">WEEK 12 · ` → `<p class="eyebrow">`
- `the delivered week-12 encoder block` → `the delivered encoder block`

## eq-mse

- `<p class="eyebrow">WEEK 02 · ` → `<p class="eyebrow">`
- `"four grid points of the week-02 lab's controlled regression"` → `four grid points of a controlled regression`
- `as the lab holds it` → `as in the setup`

## eq-residual

- `<p class="eyebrow">WEEK 12 · ` → `<p class="eyebrow">`

## eq-scaled-dot-product

- `<p class="eyebrow">Week 11 · ` → `<p class="eyebrow">`

## loop-gradient-descent

- `<p class="eyebrow">Week 02 &middot; ` → `<p class="eyebrow">`

## metric-confusion

- `<p class="eyebrow">WEEK 05 &middot; ` → `<p class="eyebrow">`
- `"the week-06 lab's gene-family model"` → `the gene-family model`
- `THE WEEK-06 GENE MODEL` → `THE GENE MODEL`
- `the week-06 lab’s MultinomialNB` → `the MultinomialNB`
- `the course’s gene corpus, weeks/week06_multiclass/gene_family_data/README.md` → `the gene corpus, gene_family_data/README.md`
- `the week-06 gene fit on human_data.txt` → `the gene fit on human_data.txt`
- `week 05 ships a confusion figure` → `ch. 5 ships a confusion figure`
- `so that lab’s matrix cannot be derived and the week-06 fit stands in` → `so that matrix cannot be derived and the multiclass fit stands in`

## metric-prevalence

- `<p class="eyebrow">WEEK 05 &middot; ` → `<p class="eyebrow">`
- `weeks/week06_multiclass/gene_family_data/human_data.txt` → `gene_family_data/human_data.txt` (x2)
- `counted from the course artifact` → `counted from the artifact`

## metric-threshold

- `<p class="eyebrow">Week 05 &middot; ` → `<p class="eyebrow">`

## plot-curves

- `<p class="eyebrow">Week 07 &middot; ` → `<p class="eyebrow">`
- `the week 07 gene network` → `the gene network`
- `the five the lab trains` → `the five trained`
- `the 5 the lab trains` → `the 5 trained`

## plot-similarity

- `<p class="eyebrow">WEEK 09 · ` → `<p class="eyebrow">`

## split-homology-leakage

- `<p class="eyebrow">Week 07 &middot; ` → `<p class="eyebrow">`

## split-train-only

- `<p class="eyebrow">Week 01 &middot; ` → `<p class="eyebrow">`
- `what this course does with it` → `what this book does with it`

## trace-backward-graph

- `<p class="eyebrow">WEEK 03 &middot; ` → `<p class="eyebrow">`

## trace-context-window

- `<p class="eyebrow">WEEK 09 &#183; ` → `<p class="eyebrow">`
- `"the week-09 lecture's illustrative table"` → `an illustrative table` (x2)

## trace-kmer-gene

- `<p class="eyebrow">Week 06 &#183; ` → `<p class="eyebrow">`
- `the delivered lab defaults to k = 6, 4096 slots, and searches k = 5, 6 and 7` → `a common default is k = 6, 4096 slots, and k = 5, 6 and 7 are all searched`
- `"the lab's default is k = 6 (4096 slots)"` → `a common default is k = 6 (4096 slots)`

## trace-padding-shifts

- `<p class="eyebrow">WEEK 08 · ` → `<p class="eyebrow">`
- `411/weeks/week08_sequence_failure/run_log.json` → `run_log.json`

## trace-shape

- `<p class="eyebrow">WEEK 01 &#183; ` → `<p class="eyebrow">`
- `what this course does with it` → `what this book does with it`
- `"Five of the week-01 lab's own lines"` → `Five lines`
- `"the lab's own text"` → `"the listing's own text"`
- `"copies the lab's lines as written"` → `copies the lines as written`
- `one per line the lab runs` → `one per line run`
- `"the lab's line, copied as written"` → `the line, copied as written`
- `"the lab's reading of .shape"` → `the reading of .shape`

## trace-state

- `<p class="eyebrow">Week 00 &#183; ` → `<p class="eyebrow">`

## eq-dot-product

- `what this course does with it` → `what this book does with it`

## eq-matrix-multiply

- `what this course does with it` → `what this book does with it`

## eq-mean-variance

- `what this course does with it` → `what this book does with it`

## architecture-day

- `Architecture day — CSC 411, 29 October 2026` → `Machine learning architectures`
- `      <p class="eyebrow">CSC 411 · Thursday 29 October 2026 · Thornton Hall 335</p>\n` → ``
- ` · set for the Thursday session,\n      29 October 2026` → ``
- `CSC 411 · architecture day · 29 October 2026` → `Machine learning architectures` (x15)
- `The transformer built in weeks 10 to 12 is` → `The transformer built in this book is`
- `is new today.` → `is new here.`
- `<p>The last two pages announce the final project and assign its first part, the\ndataset choice. Everything before them is background for the decision that assignment\nasks for.</p>` → `<p>Everything here is background for choosing which arrangement suits a given\ndataset.</p>`
- `<div class="cgroup"><p class="clabel">Today also</p><p class="cline">The final project, announced</p><p class="cline">Part 1 · the dataset, assigned</p></div>` → ``
- `the work in this course.` → `the work in this book.`
- `Most failures in this course were` → `Most failures in this book were`
- `the ones this course builds with` → `the ones this book builds with`
- `the rest of the course stands on` → `the rest of the book stands on`
- `closes the loop on week 9.` → `closes the loop on the embedding chapter.`

## Left alone

- `class` / `classes` in all plates: CSS class attributes or classification classes (`K = 10 classes`, `class scores`, `class i = 2`, `Counter class` in code-object).
- `split-homology-leakage`: "fold assignment" is not an assignment in the course sense.
- `metric-confusion`: "a gene the lab then follows as the wrong family" means a wet lab following up a gene, not the course lab.
- `compare-baseline-first`: the eyebrow "Project clinic" remains once "Week 14 ·" is gone; it is a topic label, not a date or room.
- `code-provenance`, `compare-baseline-first`, `trace-kmer-gene`: "fetched 2026-09-29" and `SOURCES.md` are data provenance, not course scheduling.
- Plate nav back-links name chapters ("Neural networks and new classes", "What ML is…", "The method on data…"); only the "this course" / "the course" phrases were changed. Some link targets (e.g. `project-a-new-data.html`) look stale and were not touched.
- `architecture-day`: the last two pages ("The final project", "Part 1") are placeholder pages for the course project. They are whole sections rather than wording, so they remain; the cover no longer refers to them. Consider removing them.
- Chapter-wide, the figure eyebrow regex in `plate()` is unchanged; styled eyebrows (`code-gd`, `code-object`, `code-provenance`) are not matched by it, so they are patched on the page only.
