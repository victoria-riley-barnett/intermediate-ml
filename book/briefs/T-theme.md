# Agent T · the theme

Read _common.md first.

You own book/style/book.css and the HTML markup in book/build.py's `shell()`,
`plate_figure()`, `multiple_figure()`, `code_figure()`, `with_margin()`,
`render_page_body()`, `chapter_html()`, `home_html()` and the index/ledger pages.
Change markup only where the CSS needs it; keep every function's behaviour (links,
checks, the number audit). Do not edit pages/, chapters/, multiples.py's numbers.

The author rejected the previous look ("awful brown"). Make it contemporary and
straightforward, like a current, well-made technical reference site, with no sidebar:

- Pure white background, near-black text (#111 to #1a1a1a), neutral greys for margin
  notes, rules and the kind line. ONE accent, used sparingly, for links: a clear blue.
- A clean modern sans for text and headings (Geist ships in figures/fonts/fonts.css;
  system-ui fallback). Headings plain weight 600, left-aligned, no italics, no serif.
  Mono (Geist Mono) for code. Body 17–18px, line-height about 1.6, measure about 68ch,
  generous whitespace.
- A slim top line: "CSC 411 / <chapter>", nothing else.
- Margin notes (Tufte's idea): a right margin beside the text column for `.margin`
  notes, aligned with the paragraph they belong to; small grey type. On narrow
  screens they drop below their paragraph, indented with a thin rule.
- Plates: white background, a thin border or none, so they sit in the page; scaled to
  the text-plus-margin width. Many plates are 1280-wide posters with large type: show
  them at reader scale (they already link to full size; make that obvious but quiet).
  Plates must not be giant grey slabs. Caption small, under the plate.
- Small multiples (`figure.multiple`, inline SVG from multiples.py): natural size,
  never stretched; scroll sideways on phones rather than shrink. You may restyle
  multiples.py's colours/fonts to match (palette constants at its top), not its data.
- Code blocks: light grey background, mono, no heavy borders; "prints" output muted.
- Chapter pages: a short contents list after the frame; each page section separated
  by generous space and a thin rule; section titles link to the standalone page.
- Home page: the chapter list with each gist on its own quiet line.
- Dark mode via prefers-color-scheme: dark grey background, light text; plates get
  a light card behind them (they are drawn for white).
- Works without JavaScript.

Test with real pages: if pages/loss.md, softmax.md, three-readers.md exist, use them;
otherwise write two throwaway test pages in book/_out/T-test/ (NOT in book/pages/)
by copying the build's output and adding content, or temporarily point PAGES at a
scratch folder via a copy of build.py under _out/. Look at: the home page, a chapter
page (chapters/08-fixed-size-inputs.html), a page with a plate, a page with a small
multiple (any page using {{multiple learning-rates}}), the ledger. Screenshot at 1440
and 390 wide, look at every screenshot critically, and iterate until it looks clean,
current and calm. Finish with the build passing.

Reply with: what you changed, and the paths of your final screenshots.
