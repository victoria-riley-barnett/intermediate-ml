# The chapter form

A chapter is a TOML file, `forms/<stem>.toml`, rendered by `build.py`. The form is
the course's own frame (representation -> transformation -> evidence, plus the data
it runs on) and a short list of steps, each carried by a figure plate. The renderer
adds no prose. `forms/02-autodifferentiation.toml` is the reference instance: copy
its shape exactly.

The book is for a general audience, not one class. No week numbers, days
("Tuesday"), "the lab", "your run", "in class", grading, quizzes or projects in
any rendered field. (The `source` fields are not rendered; they record provenance.)

## Fields

| field | rule |
|---|---|
| `number`, `title` | given in your brief; do not change |
| `gist` | given in your brief, verbatim (the author's own one-line summary) |
| `[timeline] row` | one sentence naming the row of the architectures timeline this chapter inherits, worded as the lineage plate words it; `plate` = the lineage plate slug |
| `[frame]` | `data`, `representation`, `transformation`, `evidence`: short phrases, one line each. Start from `411/curriculum.toml`, corrected by `411/admin/BOOK.md` "Where the stale plan is wrong" and by the delivered week. `transformation` is the operation the chapter adds (formula or module), not a sentence. `source` records where they came from |
| `[[steps]]` | 5 to 9 steps, in the order the delivered week teaches them. Each step is one idea |
| `steps.claim` | the step's heading: one plain sentence, at most 14 words |
| `steps.quote` | OPTIONAL. At most 2 sentences, at most 50 words, copied from the delivered `lecture.md` or `lab.md` (or the old notebook) with only these edits allowed: remove class-time references, cut a clause, fix a typo. Never compose new sentences here. If no sentence in the sources says it well, leave `quote` out: the claim and the figure carry the step |
| `steps.source` | file and section the quote came from (not rendered) |
| `steps.figure` | OPTIONAL plate slug from `book/figures/`. Every plate currently placed in the chapter (`{{figure ...}}` lines in `chapters/<stem>.md`) must appear on exactly one step |
| `[[code]]` | the pure-Python examples already in `book/code/<stem>/`. `file` is relative to `book/code/`; the build runs it and prints its real output, so do not paste output. Each script must run with plain `python3` from its own folder, print short output (trim prints to what matters), and stay under ~40 lines. `credit` names the SmolML file it follows (MIT) or is omitted when the code is ours. `note`: optional, one sentence |
| `[[questions]] q` | 3 to 5 questions. Prefer the delivered rubric/lab questions, generalized; drop any that depend on a specific student's run. Answers go in `book/code/<stem>/answers.md`, one `**Qn.**` paragraph each, matching the new numbering |
| `[next]` | `missing`: one short sentence; `chapter`: the stem of the chapter that supplies it |

## Budget

Rendered prose (gist + timeline + frame + claims + quotes + notes + questions)
should come to roughly 350 to 700 words. The plates and the code carry the rest.

## Checking

    cd /home/user/intermediate-ml && python3 book/build.py --out=/tmp/claude-0/out-<stem>

must end with `built` and no WARN or error lines. Then delete nothing else; do not
edit `chapters/*.md`, other forms, `build.py`, or anything outside your stem.

## Conformal moments (revised)

Compressing the sources into one-line claims reads as terse model prose. Instead,
each step is generated at a fixed anchor so that the model's text stays in the
author's register and cannot drift from what she wrote:

1. **Anchor.** `steps.source_passage`: the complete paragraph(s) from the delivered
   `lecture.md`, `lab.md` or notebook that teach this step, copied verbatim and
   trimmed only of class-time references (Tuesday, "today's lab", grading).
2. **Text.** `steps.text`: the passage rendered for a general reader, in the
   passage's own voice and sentence length. Keep her full sentences and her
   examples. Do not shorten, summarise or add claims. If the passage already reads
   well for a general reader, copy it unchanged. Where a bridge is needed, add at
   most one sentence, and only restate something the passage or the plate says.
3. **Check.** Every sentence in `text` must be traceable to the passage or to the
   plate's `<desc>`. `book/check_forms.py` lists any `text` sentence whose content
   words are mostly absent from the passage and the plate descriptions; fix every
   line it reports before finishing.

The renderer shows `text` under each step's claim, and drops `quote`. Steps keep
their `figure`. This replaces the 50-word limit on quotes above; the prose budget
becomes "as long as her passages are".
