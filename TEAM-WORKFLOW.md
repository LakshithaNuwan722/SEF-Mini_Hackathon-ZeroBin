# ZeroBin - how the four of us work on this

Every package contains the COMPLETE, RUNNABLE app. It has to: you cannot test
your own screen if the router, the database layer and the design system are
missing. What differs between the four packages is `YOUR-FEATURE.md`, which
says which files are yours.

## Running it

```bash
python devserver.py
```

Then open <http://localhost:5173>. There is no build step and nothing to
install. If `js/firebase-config.js` has keys it talks to our Firestore project;
blank them and it falls back to an in-browser backend with the same data, so
you can break things safely.

- Live site: https://assignment-43655.web.app
- Firebase project: `assignment-43655` (free Spark plan, no billing card)

## Pushing to GitHub without four-way conflicts

One person creates the repo and pushes the shared scaffolding FIRST. After that
each of us commits only the files listed in our own `YOUR-FEATURE.md`.

1. Member 1 pushes first (app shell, router, hosting config).
2. Everyone else clones that, then commits their own files on their own branch.
3. Open a pull request per feature rather than four people pushing to `main`.

If two of us edit the same file, the later one rebases. `assets/app.css` and
`js/ui.js` are the two most likely to collide - talk before touching them.

## Before the demo

The evaluator can ask ANY of us to explain a section of code, or to make a
small live change. Read your own files properly and work through the
"Be ready to explain" list in your `YOUR-FEATURE.md`. Knowing your own feature
cold matters more than knowing a little of everything.

Two sections of `README.md` are deliberately still blank: the team contribution
table and the AI declaration. The specification requires both to be written in
our own words, so we fill those in together.
