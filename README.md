# ZeroBin — good food, wrong bin

**Connecting Sri Lankan restaurants and bakeries that have surplus food at closing time with people and charities a street away, before it goes in the bin.**

SE3090 Software Engineering Frameworks · Assignment 2 — Mini Hackathon · SLIIT

- **Live application:** <https://assignment-43655.web.app>
- **Demonstration video:** <https://drive.google.com/file/d/1RzvfUwv-af-2_HNJZK30cLg34Bo5UrCr/view?usp=sharing>
- **Repository:** <https://github.com/LakshithaNuwan722/SEF-Mini_Hackathon-ZeroBin>

---

## 1. The Sri Lankan problem

Sri Lanka does not have a food shortage at closing time — it has a **distribution problem that lasts about an hour**.

Roughly a third of the food produced in the country is never eaten, and a large share of that is not spoiled: it is surplus. Correctly cooked, correctly stored, and simply not sold before the shutter came down. A bakery in Nugegoda bins trays of buns at 8pm. A hotel in Colombo 3 clears a lunch buffet at 3pm. A pola stall in Dehiwala dumps a crate of vegetables that were not pretty enough for tomorrow.

At the same time, the cost-of-living pressure that began in 2022 pushed a large share of households into buying less and eating smaller portions, and community kitchens, elders' homes and night shelters run week to week on whatever they are given.

These two facts sit within walking distance of each other, several times a day, in every town in the country. What is missing is not food and not goodwill — it is a way for one side to tell the other in the twenty minutes that matter.

This explanation is also **inside the app**, on the *The problem* page, not just in this README.

## 2. The solution

ZeroBin does one thing, end to end:

| Step | Who | What happens |
|---|---|---|
| 1 | Business | Posts what it did not sell — name, portions, photo link, pickup window |
| 2 | Receiver | Sees everything still open near them, closest first, with distance and countdown |
| 3 | Receiver | Claims one item; it is reserved and **disappears from everyone else's list** |
| 4 | Business | Reads the pickup code at the counter and confirms it — the meal is counted |

Each feature hands off to the next, so nothing is half-finished.

### The part that actually matters

Two people can tap "Claim" on the same bag of bread in the same second. If both writes succeed, two people cross Colombo for one bag and neither of them trusts the app again.

ZeroBin prevents that twice over:

1. The claim runs inside a **Firestore transaction** (`runTransaction`) — the read of `status` and the write of the claim are atomic, so Firestore re-runs the whole operation if the document changed underneath it. The loser gets *"Someone else just claimed this one"*, not a wasted trip.
2. The same invariant is enforced again in **`firestore.rules`**, where a claim update is only permitted when the document's *current* status is `available` and the claimer is writing their own `uid`. That holds even if someone bypasses our JavaScript and calls the Firestore API directly.

## 3. Main features

**Feature 1 — Post surplus food (business side)**
Create, edit and delete listings: food name, category, portions, description, dietary notes, photo link, pickup window, address and contact number. Fields are pre-filled from the shop's profile, so a repeat post is mostly typing a title.

**Feature 2 — Find nearby food (receiver side)**
Every open listing, sorted by distance from the browser's geolocation or a chosen town. Free-text search, eight category filters, a distance limit, a vegetarian-only toggle, and four sort orders. Each card shows the shop, the distance, the portions and a live countdown to the closing time.

**Feature 3 — Claim and pick up (transaction side)**
An atomic claim generates a six-character pickup code (with `0/O/1/I` removed so nobody misreads it aloud). The receiver sees the code, directions and the shop's number; the business sees a code-entry box on its dashboard. Confirming the code moves the listing to *Picked up* and counts the meals. A claim can also be released, which puts the item straight back on the public list.

**Feature 4 — Impact dashboard**
Meals rescued, confirmed pickups, kilograms of food, CO₂e avoided, participating shops and towns — plus meals per day over 30 days, a breakdown by food category, top shops and top towns. Signed-in users get their own line: *"You saved 58 meals this month."*

Nothing is stored as a running total. Every figure is recomputed from the pickups themselves, so any number can be traced back to the collections that produced it. Food posted but never claimed is counted separately as a **miss**, because that is the number worth reducing.

## 4. Minimum functional requirements

| # | Requirement | Where it is |
|---|---|---|
| 1 | Clear landing page | `#/` — hero, problem, how it works, live listings, impact |
| 2 | Sri Lankan problem explained inside the app | `#/about`, plus the problem section on the landing page |
| 3 | At least two functional features | Four: post, find, claim/collect, impact |
| 4 | At least one form accepting input | Post/edit listing, sign up, sign in, code confirmation, filters |
| 5 | Input validation with friendly errors | `js/lib/format.js` — every message is a full sentence |
| 6 | Display / search / filter / calculate / update | Search, 8 categories, distance radius, 4 sorts, live stats, full CRUD |
| 7 | Responsive on desktop and mobile | Fluid grids, mobile menu, no horizontal overflow at 375px |
| 8 | Navigation between sections | Hash router with 11 routes, desktop nav + full-screen mobile menu |
| 9 | Sample data | One live listing per food category (8) plus ~90 historical pickups across 4 shops and 4 towns |
| 10 | Demonstrated value to Sri Lankan users | Real towns, real distances, LKR-context copy, measured impact |

Beyond the minimum: light **and** dark themes, email/password authentication with two account types, browser geolocation, keyboard-accessible dialogs, `aria-invalid` / `aria-describedby` on every field, skip link, and a `prefers-reduced-motion` path.

## 5. Technologies used

| Layer | Choice | Why |
|---|---|---|
| Front end | Vanilla **HTML + CSS + ES modules** | No build step, so the deployed files are exactly the repository files. Nothing to break between `git push` and the live URL during a four-hour build |
| Routing | Custom hash router (`js/app.js`) | Works on any static host with zero rewrite rules |
| Database | **Cloud Firestore** | Real-time listeners keep every open tab in sync; transactions give us the atomic claim |
| Auth | **Firebase Authentication** (email/password) | Two account roles, no password handling of our own |
| Hosting | Firebase Hosting / Vercel / Netlify | Static files — any of them work; configs for the first two are in the repo |
| Charts | Hand-written inline **SVG** | Two small single-series charts did not justify a charting dependency |
| Fonts | Instrument Serif + Space Grotesk | Editorial display face against a neutral UI face |

**Deliberately not used:** Firebase **Cloud Storage** and **Cloud Functions**. Both now require the paid Blaze plan and a billing card. ZeroBin stays entirely on the **free Spark plan** — photos are public image URLs (Unsplash, Google, a shop's own site) instead of uploads, and the claim invariant lives in security rules instead of a server function.

### Project structure

```
index.html              app shell — nav, view slot, footer, toast + dialog roots
devserver.py            local static server that disables browser caching
assets/app.css          design tokens for both themes, then components
js/app.js               router, nav, footer, bootstrap
js/store.js             one auth stream + one listing stream for the whole app
js/ui.js                DOM helpers, icons, toasts, dialogs, listing card, charts
js/firebase-config.js   Firebase web config (public by design — rules do the protecting)
js/lib/db.js            picks a backend; nothing above this file knows which
js/lib/firebaseBackend.js   Firestore + Auth implementation
js/lib/localBackend.js      identical interface, backed by localStorage
js/lib/format.js        validation, time, categories, statuses, conversions
js/lib/geo.js           Sri Lankan towns, haversine distance, geolocation
js/lib/seed.js          sample shops, listings and 5 weeks of history
js/lib/stats.js         every number on the impact dashboard
js/views/*.js           one module per screen
firestore.rules         the real backend — see section 2
```

The two backends implement the same interface, which is why swapping them changes nothing above `js/lib/db.js`.

## 6. Installation and running

**No dependencies, no build.** Because the app uses ES modules, it needs to be served over HTTP — opening `index.html` from the file system will not work.

```bash
git clone <your-repo-url>
cd zerobin
python devserver.py
```

Open <http://localhost:5173>. `devserver.py` is `python -m http.server` plus a
`Cache-Control: no-store` header — without it the browser keeps serving edited ES
modules from its cache and you end up debugging code that is no longer on disk.
Any other static server works too (`npx serve`, VS Code Live Server); production
hosts do their own caching and do not need this file.

With no Firebase keys configured, the app runs on the built-in local backend, already loaded with the sample data — every feature works immediately.

### Connecting your own Firebase project (free Spark plan)

1. Create a project at <https://console.firebase.google.com> — **do not** upgrade to Blaze; no card is needed.
2. **Build → Authentication → Sign-in method →** enable **Email/Password**.
3. **Build → Firestore Database → Create database** (production mode is fine — the rules below replace the defaults).
4. **Project settings → Your apps → Web app** — copy the config values into `js/firebase-config.js`.
5. Publish the rules:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules
   ```
   Or paste `firestore.rules` into **Firestore → Rules** in the console and publish.
6. Reload the app and open **Find food** — an empty project offers a **Load the sample data** button, which signs in as each demo shop and writes that shop's own rows (so the strict rules are never relaxed for seeding).

### Deployment

```bash
# Firebase Hosting — this is what the live link above runs on
firebase deploy --only hosting

# Vercel
vercel --prod

# Netlify
netlify deploy --prod --dir .
```

All three serve the repository as-is. `vercel.json` and `firebase.json` are included.

### Accounts

Sign-in is real Firebase Authentication — create an account with your own email
and password from the **Create an account** screen. There are no shared demo
logins.

Signing up asks which side you are on. **Collect food** gives you browsing,
claiming and pickup codes; **Give food** gives you the posting side and the
counter controls for confirming a code.

The starter listings belong to shop accounts the seeder creates. Those exist so
the app is not empty on first open; they are not offered as a login anywhere in
the interface.

> **Try the race condition:** create two collector accounts, sign in to each in a
> separate browser window, open the same listing in both, and claim it in both.
> One wins; the other gets a clear message and the item vanishes from their list.

## 7. Team members and contributions

_Replace with your team's real names, IDs and contributions before submitting — this section is marked, and section 2.1 of the specification requires the contribution statement to be written in your own words._

| Name | Student ID | Area owned | Contribution |
|---|---|---|---|
| | | Problem & solution design | |
| | | UI development | |
| | | Functional implementation | |
| | | Testing, Git & deployment | |

## 8. AI tools used

_Declaration required by section 2.3 of the specification. Replace with your team's actual usage — an undeclared AI dependency that becomes evident during the demonstration is treated as a breach._

| Tool | What it was used for |
|---|---|
| Claude (Claude Code) | Generated the initial application scaffold, the design system and the view modules; we reviewed the claim transaction and the Firestore rules line by line, tested the concurrent-claim case in two browser windows, and corrected the dashboard's input handling after finding that a background refresh cleared a code being typed. |

The full **AI Prompt Log** — tool, exact prompt, purpose, and how each output was checked or modified — is in the submission PDF as required.

---

_Nothing good should end up in a bin._
