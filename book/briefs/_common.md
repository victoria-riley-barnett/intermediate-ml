# Common to every brief

Repo: /Users/v/projects/intermediate-ml, branch `wiki`. Do not commit, push, or switch
branches; the coordinator does that. Read-only: /Users/v/projects/teaching (the
author's course) and /Users/v/projects/intermediate-ml/.tools/smolml (SmolML, MIT).
Python: /opt/homebrew/bin/python3 (3.15; the system python3 is too old).

Build to your own folder, never to book/out (the live preview):
    cd /Users/v/projects/intermediate-ml && /opt/homebrew/bin/python3 book/build.py --out=/Users/v/projects/intermediate-ml/book/_out/<you>

Screenshots (headless Chrome; then Read the PNG to look at it):
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
      --hide-scrollbars --window-size=1440,2400 --screenshot=/Users/v/projects/intermediate-ml/book/_out/<you>-1440.png \
      file:///Users/v/projects/intermediate-ml/book/_out/<you>/pages/<slug>.html
    (use --window-size=390,2400 for a phone)

The book: a reference wiki of short pages (one per idea), composed into the author's
chapters. Read book/WRITING-PAGES.md (the page form and rules) and book/PAGEMAP.md
(every page, its chapter, plates and sources). Audience: a curious general reader,
no maths background. Style: contemporary and straightforward (see briefs/T-theme.md),
Tufte's ideas (margin notes, small multiples, direct labels, no chartjunk) without
the period costume.
