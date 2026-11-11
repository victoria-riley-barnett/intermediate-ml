# Agent M · the page map

Read _common.md first. You own book/PAGEMAP.md and book/chapters/*.toml (page lists
only; leave titles, gists and frames as they are). Do not edit anything else.

A first PAGEMAP.md exists (≈100 pages in clusters A–J, with the author's source
sections). Make it complete and unambiguous, because writer agents will be given
only their cluster's rows:

1. Check every `cut from` reference against the real files: every heading must exist
   exactly as written (the build looks headings up literally; strip `{.smaller}`-style
   suffixes). Fix or replace any that do not; prefer weeks 5–12 and her notebooks
   (git history: `git -C /Users/v/projects/intermediate-ml show 70be63e^:...` is not
   needed; the notebooks are at intermediate-ml/*.ipynb on disk).
2. Add a **SmolML** column: for each page, the SmolML guide section that explains it
   at beginner level, as `smolml/smolml/<dir>/README.md § <heading>` (read the READMEs
   under .tools/smolml/smolml/**). Leave it empty where SmolML has nothing relevant.
   Code pages: name the SmolML source file their script follows, if any.
3. Add a **level** note per page where useful: the one example to use (from her
   material) and anything that should be left out for a general reader.
4. Re-cluster for parallel writing: one cluster per chapter (14 clusters), each
   listing its pages in chapter order; a page shared by several chapters is written
   once, in the cluster of the first chapter that lists it, and the other clusters
   say "(written in cluster X)". Keep it a plain table per cluster.
5. Keep chapters/*.toml `pages` lists consistent with your map (same slugs, same order).
6. Mark stubs honestly.

Check your work by running the build (it must end with `built`; planned pages render
as placeholders). Reply with: page count by kind, the stub list, and any source
reference you could not resolve.
