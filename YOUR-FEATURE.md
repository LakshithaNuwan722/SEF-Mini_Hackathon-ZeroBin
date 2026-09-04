# Member 3 - Feature 3 - Claim and pick up (the transaction)

Claiming reserves an item for one person, hides it from everyone else, and issues a pickup code the shop confirms at the counter.

## What you own

| File | What it does |
|---|---|
| `js/views/detail.js` | The item page. It changes shape by viewer: claim button, pickup code, counter controls, or 'already taken'. |
| `js/views/claims.js` | The collector's list of reservations and past pickups. |
| `js/lib/firebaseBackend.js` | Firestore and Auth, including the claim transaction. |
| `js/lib/localBackend.js` | The same interface backed by localStorage, so the app runs with no setup. |
| `js/lib/db.js` | Picks one backend; nothing above this file knows which is running. |
| `firestore.rules` | The security rules. On the free plan, these ARE the backend. |
| `js/views/auth.js` | Sign up and sign in. |
| `js/store.js` | One auth stream and one listing stream for the whole app. |

These are the files you commit. Everything else in this folder is here so the
app actually runs - leave it to whoever owns it (see `TEAM-WORKFLOW.md`).

```bash
git add `js/views/detail.js` `js/views/claims.js` `js/lib/firebaseBackend.js` `js/lib/localBackend.js` `js/lib/db.js` `firestore.rules` `js/views/auth.js` `js/store.js`
```

## Be ready to explain

The evaluator may ask you to explain a section of code or make a small live
change. These are the things worth understanding in your part before the demo:

1. THE key one: why claimListing runs inside runTransaction. Two people can tap Claim in the same second; without it both writes succeed and two people cross Colombo for one bag of bread.
2. Why the same invariant is ALSO in firestore.rules - a determined user can call the Firestore API directly and skip our JavaScript entirely.
3. How the rules permit only an available -> claimed transition, only by the person writing their own uid, and only touching the claim fields (affectedKeys().hasOnly(...)).
4. Why pickup codes skip the characters 0, O, 1 and I.

## Where your feature sits in the flow

A shop posts (Feature 1) -> a person finds it (Feature 2) -> they claim and
collect it (Feature 3) -> the app counts what was saved (Feature 4). Each one
hands off to the next, so if you change the shape of a listing, tell the others.
