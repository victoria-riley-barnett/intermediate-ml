REVISION from the author (overrides the brief and FORM.md where they conflict). This book is a reference wiki / hypertext, not a course.

1. NO questions: omit [[questions]] entirely; do not touch code/<stem>/answers.md (the renderer no longer uses it).
2. LINKS. build.py resolves wiki links in claim, text, quote, code note, frame fields, gist and next.missing:
   - [[06-multiclass]]            -> that chapter
   - [[06-multiclass#3]]          -> that chapter's step 3 (label "Title, step 3")
   - [[06-multiclass#3|softmax]]  -> custom label
   - [[fig:eq-softmax]]           -> the plate, in whichever chapter places it
   A bad target fails the build. Chapter stems: architectures, 00-objects, 01-linear-analysis,
   02-autodifferentiation, 03-backpropagation, 04-neural-networks, 05-evaluation, 06-multiclass,
   07-generalization, 08-fixed-size-inputs, 09-embeddings, 10-whole-sequences, 11-attention, 12-encoder.
   Step numbers are the position in that chapter's [[steps]]. Other agents write theirs concurrently, so link to a
   step only if that form file already exists and you checked the number; otherwise link the chapter. Chapters 02 and
   06 already exist: use them as link targets.
3. Each step may carry `see = ["06-multiclass#2", "fig:eq-cross-entropy"]` (rendered "See also:"). Use it where the
   reader's next question is answered elsewhere: a concept this step uses that another chapter defines (link back),
   and a place this step's idea is used later (link forward). Aim for 2 to 5 `see` links per chapter plus inline
   [[...]] links in text where a term is first used. Links replace words or sit in `see`; do not add prose to carry them.
   "Linked from" backlinks are generated automatically.
4. build.py and check_forms.py are updated (check_forms ignores [[...]] markup). Do not edit them.
5. ENVIRONMENT: you cannot use /tmp. Your brief is book/forms/jobs/local/<stem>.txt (already remapped to local paths).
   Build with
   cd /Users/v/projects/intermediate-ml && python3 book/build.py --out=/Users/v/projects/intermediate-ml/book/_out/<stem>
   then `python3 book/check_forms.py <stem>`. Both must be clean. Edit only your own form (and your own code/<stem>/ folder).
6. Keep the rule: source_passage verbatim from her delivered material, text in her voice at her sentence length. Less LLM prose, more form and links.
