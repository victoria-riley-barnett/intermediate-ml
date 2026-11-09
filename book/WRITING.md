# How a chapter is written (brief for every chapter author)

You are rewriting ONE chapter of the CSC 411 web textbook, in place, at
`/home/user/intermediate-ml/book/chapters/<your file>.md`. Touch no other chapter file.
You may add files under `book/code/<chapter-stem>/` for runnable examples.

## Audience and voice

Life-science undergraduates (biology, biochemistry, chemistry). No calculus, linear
algebra or ML assumed; the math is taught where it is needed. Write plainly, in full,
moderately short sentences. Define every term at first use. One idea per paragraph.
The current chapter text is compressed and written for someone who already knows the
ending: keep its facts and numbers, loosen and simplify its prose. No hype, no
"magic", no exclamation marks, no em-dash chains. Say "we" for the book and "you" for
the reader. Target 2,500 to 3,500 words.

## Sources, in authority order

1. The current chapter file (facts, figure order, questions).
2. The delivered week: `/home/user/src411/411/weeks/<week>/lecture.md` and `lab.md`,
   plus `instructor/` (rubrics with answers) and `run_log.json` where present (check
   its `provenance` field before quoting a number).
3. The figure plates: `book/figures/<slug>.html`. The `<desc>` of each plate states
   its exact numbers; prose must agree with them.
4. Old notebooks (`/home/user/intermediate-ml/*.ipynb`) and `archive/` folders: mine
   for worked numbers only, at arm's length; simplify heavily.
5. SmolML (`/tmp/claude-0/ext/smolml`, MIT, by Pablo Rodríguez Martín): the model for
   the pure-Python code voice.
6. Course-wide notes: `/home/user/src411/411/admin/BOOK.md` (the delivered-vs-plan
   corrections are binding), `teaching_patterns.md`, `admin/SOURCES.md`.

Never invent a number. Every number in prose comes from (a) a plate's `<desc>`, (b) a
`run_log.json`/lab printout in the sources, or (c) pure-Python code you ran yourself
in this sandbox (`python3`, no numpy/torch available). PyTorch snippets may be shown
but cannot be run here, so do not print outputs for them unless the output appears in
the sources.

Never add a citation (DOI, paper, page) that is not already in the chapter or verified
in `admin/SOURCES.md`. Names and years of well-known events on the lineage plates
(`figures/lineage-a-1943-1997.html`, `lineage-b-2012-2022.html`) may be referred to as
those plates state them.

## The template, in this order

```
# <Title>                      (keep the existing h1 exactly)

<The problem, with a concrete instance, in the first two paragraphs.>

> **On the timeline.** <2-3 sentences: the row on the architectures timeline this
> chapter inherits, and what it changed (the block or the input). Link:
> [the architectures chapter](architectures.md) (no #anchor: its headings are being rewritten) >

## <Section>                    (several; headings are plain claims in sentence case)
<what to look at> 
{{figure <slug>}}              (own line; every figure currently in the chapter stays)
<only what the plate cannot show>

## By hand, in pure Python
<20-30 line example in SmolML style, runnable with plain python3, with its real
printed output in a second code block. Say what it is adapted from, e.g.
"Adapted from SmolML's `smolml/core/value.py` (MIT)" with a link to
https://github.com/rodmarkun/SmolML/blob/main/<path>. If SmolML has nothing for this
topic, write it in the same style and say plainly it is ours. Shared helper:
`book/code/value.py` (a minimal Value autograd class) may be imported/reused.>

## The same thing in PyTorch
<the course path: Dataset -> DataLoader -> batch -> nn.Module -> prediction -> metric,
as far as this chapter has reached it. Keep it short.>

## What the run shows             (measured results from the sources; omit if none)

## What you can now do            (bullets)
## What is still missing          (bullets, each naming the chapter that picks it up)
## Questions                      (keep existing ones; add up to 5 if there are none;
                                    no answers in the chapter)
```

Put the answers to the questions in `book/code/<chapter-stem>/answers.md` (they will be
collected into back matter).

Keep the existing bottom prev/next links line if present. Keep relative chapter
links in the form `NN-name.md`. Chapter files: architectures, 00-objects,
01-linear-analysis, 02-autodifferentiation, 03-backpropagation, 04-neural-networks,
05-evaluation, 06-multiclass, 07-generalization, 08-fixed-size-inputs, 09-embeddings,
10-whole-sequences, 11-attention, 12-encoder, project-a-new-data, project-b-reporting.

## Check before you finish

Run `cd /home/user/intermediate-ml && python3 book/build.py --out=/tmp/claude-0/out-<your-stem>` : it must end with
"built" and no WARN lines about your chapter. Every `{{figure}}` slug must exist in
`book/figures/`. Do not git commit; the lead does that.
