# Member 2 - Feature 2 - Find nearby food (receiver side)

Everything still open, closest first, with search, category filters, a distance limit and four sort orders.

## What you own

| File | What it does |
|---|---|
| `js/views/browse.js` | The browse screen: filters, sorting, the results grid and the empty states. |
| `js/lib/geo.js` | 22 Sri Lankan towns, the haversine distance, the distance wording, and the browser geolocation request. |
| `assets/app.css` | The whole design system: the light ground, the .on-dark scope for the hero/header/footer, and every component. |
| `js/ui.js` | The shared UI kit - icons, toasts, the dialog, the listing card, the charts. |

These are the files you commit. Everything else in this folder is here so the
app actually runs - leave it to whoever owns it (see `TEAM-WORKFLOW.md`).

```bash
git add `js/views/browse.js` `js/lib/geo.js` `assets/app.css` `js/ui.js`
```

## Be ready to explain

The evaluator may ask you to explain a section of code or make a small live
change. These are the things worth understanding in your part before the demo:

1. Why requestBrowserLocation() resolves to null instead of rejecting - a denied permission is a normal answer, not an error to shout about.
2. Why the town picker exists at all: plenty of people decline the location prompt and the screen still has to be useful for them.
3. The haversine formula in distanceKm(), and why distance is the main sort key on this screen.
4. Why .cols-3 uses auto-fit and not auto-fill - auto-fill keeps empty tracks, which left a dead column hanging off the right.

## Where your feature sits in the flow

A shop posts (Feature 1) -> a person finds it (Feature 2) -> they claim and
collect it (Feature 3) -> the app counts what was saved (Feature 4). Each one
hands off to the next, so if you change the shape of a listing, tell the others.
