# The CSC 411 book

The course as one web textbook, published at
<https://victoria-riley-barnett.github.io/intermediate-ml/>.

    book/
      chapters/   one Markdown file per chapter; `{{figure <slug>}}` on its own line places a plate inline
      figures/    the full-size figure plates (generated in the course repo, copied here) and their fonts
      style/      the book's stylesheet, matched to the plates
      build.py    assembles everything and runs mdBook

## Preview locally

You need the mdBook 0.5.4 binary at `.tools/mdbook` (repo root), on `PATH`, or named by `MDBOOK=`.

    python3 book/build.py
    python3 -m http.server -d book/out 8000      # then open http://localhost:8000

Serve it over HTTP rather than opening the file: the search index is fetched.

## Publish

Pushing to `main` runs `.github/workflows/book.yml`, which builds with
`--base=/intermediate-ml/` and deploys to Pages.

## Credits

Pure-Python code examples are adapted from [SmolML](https://github.com/rodmarkun/SmolML)
by Pablo Rodríguez Martín (MIT licence); each one links to the file it follows.
