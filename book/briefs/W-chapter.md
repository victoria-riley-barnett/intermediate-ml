# Writer agent · one chapter's pages

Read, in this order: briefs/_common.md, WRITING-PAGES.md, VOICE.md, and the three
exemplar pages pages/loss.md, pages/softmax.md, pages/three-readers.md (copy their
shape and register). Then your cluster in PAGEMAP.md (named in your prompt).

Write every page in your cluster that is not marked "(written in cluster X)", one
file each, book/pages/<slug>.md. Edit nothing else: not other pages, not build.py,
not the CSS, not PAGEMAP or the chapter files. If a page you link to does not exist
yet, link it anyway as long as its slug is in PAGEMAP.md.

For each page:
- Read its sources in full first: her sections named in PAGEMAP (under
  /Users/v/projects/teaching/411/weeks/), the SmolML section named there
  (.tools/smolml/smolml/**/README.md), and the plate's <desc> in book/figures/<plate>.html.
- Write it to WRITING-PAGES.md: one idea, plain explanation first, one small worked
  example, then the plate (or small multiple), 80–350 words of prose, her voice per
  VOICE.md, numbers only from her text, a plate or a script, each with a margin note.
- List every source you drew on in `sources`, including the SmolML section.
- If her material and SmolML have almost nothing, write one honest sentence and set
  `stub = true`. Never fill a page by invention.

When all your pages are written, build to your own folder (see _common.md), fix every
problem the build reports for your pages, open the ledger and make "numbers not found"
empty for your pages (fix the number or its margin note; do not delete true content to
pass). Screenshot your chapter page (chapters/<stem>.html) at 1440 wide and read it top
to bottom as a stranger: does each page read as her, plainly, without repetition from
the page before? Revise. Delete your _out folder at the end.

Reply with: the pages you wrote (slug, words), the stubs, and anything in her sources
that disagreed with a plate or a script.
