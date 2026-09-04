/**
 * Firestore backend.
 *
 * Mirrors `localBackend.js` exactly, so nothing above `db.js` knows which one
 * is running. Loaded straight from Google's CDN as ES modules — there is no
 * build step in this project.
 *
 * The interesting part is `claimListing`. Two people browsing at 7:55pm can tap
 * "Claim" on the same bag of bread within the same second. Without a
 * transaction both writes succeed and two people turn up for one bag. The read
 * and the write happen inside `runTransaction`, so Firestore re-runs the whole
 * thing if the document changed underneath us and the loser gets a clear
 * "someone just claimed this" message instead of a wasted trip across Colombo.
 * The same rule is enforced again in `firestore.rules`, so it holds even if
 * somebody calls the API directly.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js'
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js'

import { makePickupCode } from './format.js'
import { buildSeedListings, SEED_SHOPS, SEED_ACCOUNT_PASSWORD } from './seed.js'

const USERS = 'users'
const LISTINGS = 'listings'

/** Firebase error codes are not sentences. These are. */
export function friendlyAuthError(err) {
  switch (err?.code || '') {
    case 'auth/invalid-email': return 'That does not look like an email address — check for a typo.'
    case 'auth/missing-password': return 'Enter your password.'
    case 'auth/weak-password': return 'Use at least 6 characters so the account stays safe.'
    case 'auth/email-already-in-use': return 'That email already has a ZeroBin account. Try signing in instead.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Email or password is not right. Check both and try again.'
    case 'auth/too-many-requests': return 'Too many attempts. Wait a minute, then try again.'
    case 'auth/network-request-failed': return 'No connection to the server. Check your internet and try again.'
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Email sign-in is not switched on for this project yet. In the Firebase console, open Authentication → Sign-in method and enable Email/Password.'
    case 'auth/user-disabled': return 'That account has been disabled. Contact whoever manages this ZeroBin project.'
    case 'unavailable': return 'The database is unreachable right now. Check your connection and try again.'
    case 'permission-denied': return 'The database rejected that. Make sure firestore.rules from this repository has been published.'
    default: return err?.message || 'Something went wrong. Please try again.'
  }
}

function fail(message, code = 'failed') {
  const err = new Error(message)
  err.code = code
  return err
}

export function createFirebaseBackend(config) {
  const app = initializeApp(config)
  const auth = getAuth(app)
  const db = getFirestore(app)

  const loadProfile = async (uid) => {
    const snap = await getDoc(doc(db, USERS, uid))
    return snap.exists() ? { uid, ...snap.data() } : null
  }

  const rethrow = (err) => {
    const wrapped = new Error(friendlyAuthError(err))
    wrapped.code = err?.code || 'failed'
    throw wrapped
  }

  /* --------------------------------- auth --------------------------------- */

  function onAuth(cb) {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) return cb(null)
      try {
        const profile = await loadProfile(fbUser.uid)
        // A user row can be missing if signup was interrupted — fall back to
        // the auth account so the person is never locked out of the app.
        cb(profile || { uid: fbUser.uid, email: fbUser.email, role: 'receiver', name: fbUser.email })
      } catch (err) {
        console.error('[ZeroBin] Could not load your profile.', err)
        cb({ uid: fbUser.uid, email: fbUser.email, role: 'receiver', name: fbUser.email })
      }
    })
  }

  async function signUp({ email, password, ...profile }) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const record = { email: email.trim().toLowerCase(), createdAt: Date.now(), ...profile }
      await setDoc(doc(db, USERS, cred.user.uid), record)
      return { uid: cred.user.uid, ...record }
    } catch (err) { rethrow(err) }
  }

  async function signIn(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
      return (await loadProfile(cred.user.uid)) || { uid: cred.user.uid, email }
    } catch (err) { rethrow(err) }
  }

  const signOut = () => fbSignOut(auth)

  async function updateProfile(uid, patch) {
    await updateDoc(doc(db, USERS, uid), patch)
    return loadProfile(uid)
  }

  /* ------------------------------- listings ------------------------------- */

  function watchListings(cb, onError) {
    const q = query(collection(db, LISTINGS), orderBy('createdAt', 'desc'))
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => { console.error('[ZeroBin] Listing stream failed.', err); onError?.(err) },
    )
  }

  async function getListing(id) {
    const snap = await getDoc(doc(db, LISTINGS, id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }

  async function createListing(data) {
    const now = Date.now()
    const ref = await addDoc(collection(db, LISTINGS), {
      ...data,
      status: 'available',
      claimedBy: null, claimedByName: null, claimCode: null,
      claimedAt: null, pickedUpAt: null,
      createdAt: now, updatedAt: now,
    })
    return ref.id
  }

  const updateListing = (id, patch) =>
    updateDoc(doc(db, LISTINGS, id), { ...patch, updatedAt: Date.now() })

  const deleteListing = (id) => deleteDoc(doc(db, LISTINGS, id))

  /** Atomic claim — see the note at the top of this file. */
  async function claimListing(id, user) {
    const ref = doc(db, LISTINGS, id)
    const claimCode = makePickupCode()
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists()) throw fail('That listing no longer exists.', 'not-found')
        const l = snap.data()
        if (l.businessId === user.uid) throw fail('This is your own listing — you cannot claim it.', 'own-listing')
        if (l.status !== 'available') throw fail('Someone else just claimed this one. Have a look at what else is nearby.', 'already-claimed')
        if (Number(l.pickupEnd) <= Date.now()) throw fail('The pickup window for this item has closed.', 'expired')
        tx.update(ref, {
          status: 'claimed',
          claimedBy: user.uid,
          claimedByName: user.orgName || user.name || 'ZeroBin user',
          claimCode,
          claimedAt: Date.now(),
          updatedAt: Date.now(),
        })
      })
    } catch (err) {
      if (err?.code === 'permission-denied') {
        throw fail('Someone else just claimed this one. Have a look at what else is nearby.', 'already-claimed')
      }
      throw err
    }
    return claimCode
  }

  async function releaseClaim(id, user) {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, LISTINGS, id)
      const snap = await tx.get(ref)
      if (!snap.exists()) throw fail('That listing no longer exists.', 'not-found')
      if (snap.data().claimedBy !== user.uid) throw fail('This claim is not yours to cancel.', 'permission-denied')
      tx.update(ref, {
        status: 'available', claimedBy: null, claimedByName: null,
        claimCode: null, claimedAt: null, updatedAt: Date.now(),
      })
    })
  }

  async function markPickedUp(id, user) {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, LISTINGS, id)
      const snap = await tx.get(ref)
      if (!snap.exists()) throw fail('That listing no longer exists.', 'not-found')
      const l = snap.data()
      if (l.businessId !== user.uid) throw fail('Only the shop that posted this can mark it collected.', 'permission-denied')
      if (l.status !== 'claimed') throw fail('This item has not been reserved by anyone yet.', 'not-claimed')
      tx.update(ref, { status: 'picked_up', pickedUpAt: Date.now(), updatedAt: Date.now() })
    })
  }

  /* -------------------------------- seeding ------------------------------- */

  /**
   * One-off: writes the starter listings into an empty Firestore project.
   *
   * The rules only let a business write its OWN listings, and we did not want
   * to weaken them for convenience — so the seeder signs in as each starter
   * shop in turn and writes that shop's rows itself, exactly the path a real
   * business takes. Shop accounts that do not exist yet are created here; their
   * password is never shown in the interface, because real users sign up with
   * their own.
   */
  async function seedFirestore({ onProgress = () => {} } = {}) {
    const listings = buildSeedListings()
    const byShop = new Map()

    for (const l of listings) {
      const key = l.businessId.replace(/^shop-/, '')
      if (!byShop.has(key)) byShop.set(key, [])
      byShop.get(key).push(l)
    }

    let done = 0
    const total = listings.length

    for (const shop of SEED_SHOPS) {
      const rows = byShop.get(shop.key) || []
      if (!rows.length) continue

      let uid
      try {
        uid = (await signInWithEmailAndPassword(auth, shop.email, SEED_ACCOUNT_PASSWORD)).user.uid
      } catch {
        uid = (await createUserWithEmailAndPassword(auth, shop.email, SEED_ACCOUNT_PASSWORD)).user.uid
        await setDoc(doc(db, USERS, uid), {
          email: shop.email,
          role: 'business',
          name: shop.name,
          orgName: shop.orgName,
          phone: shop.phone,
          address: shop.address,
          city: shop.city,
          lat: shop.lat,
          lng: shop.lng,
          createdAt: Date.now(),
        })
      }

      for (const row of rows) {
        const { id, ...data } = row
        await setDoc(doc(db, LISTINGS, id), { ...data, businessId: uid })
        done += 1
        if (done % 5 === 0) onProgress(done, total)
      }
    }

    await fbSignOut(auth)
    onProgress(total, total)
    return total
  }

  return {
    mode: 'firebase',
    ensureSeed: async () => false, // never automatic against a real database
    seedFirestore,
    onAuth, signUp, signIn, signOut, updateProfile,
    watchListings, getListing, createListing, updateListing, deleteListing,
    claimListing, releaseClaim, markPickedUp,
  }
}
