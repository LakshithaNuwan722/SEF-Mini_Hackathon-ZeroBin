/**
 * Local demo backend — the fallback used when no Firebase keys are present.
 *
 * It implements exactly the same interface as the Firestore backend, backed by
 * localStorage. Two reasons it exists:
 *   1. `npm install && npm run dev` gives a fully working app with no setup, so
 *      the project can be reviewed and marked without our project keys.
 *   2. It keeps the UI honest — every screen is written against one interface,
 *      so swapping the backend changes nothing above `db.js`.
 *
 * Writes broadcast to other tabs through the `storage` event, so you can open
 * a business window and a receiver window side by side and watch a claim land.
 */

import { buildSeedListings } from './seed.js'
import { makePickupCode } from './format.js'

const K_USERS = 'zerobin:users'
const K_LISTINGS = 'zerobin:listings'
const K_SESSION = 'zerobin:session'
const K_PING = 'zerobin:ping'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    // Nudge other tabs; the `storage` event does not fire in the writing tab.
    localStorage.setItem(K_PING, String(Date.now()))
  } catch (err) {
    console.error('[ZeroBin] Could not save locally.', err)
  }
}

function fail(message, code = 'failed') {
  const err = new Error(message)
  err.code = code
  return err
}

/* -------------------------------------------------------------------------- */

const listingListeners = new Set()
const authListeners = new Set()

function emitListings() {
  const all = getAllListings()
  listingListeners.forEach((cb) => cb(all))
}

function emitAuth() {
  const user = currentUser()
  authListeners.forEach((cb) => cb(user))
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === K_LISTINGS || e.key === K_PING) emitListings()
    if (e.key === K_SESSION) emitAuth()
  })
}

/* -------------------------------------------------------------------------- */

function getAllUsers() {
  return read(K_USERS, [])
}

function getAllListings() {
  return read(K_LISTINGS, [])
}

function saveListings(list) {
  write(K_LISTINGS, list)
  emitListings()
}

function publicProfile(user) {
  if (!user) return null
  const { password: _password, ...rest } = user
  return rest
}

function currentUser() {
  const uid = read(K_SESSION, null)
  if (!uid) return null
  return publicProfile(getAllUsers().find((u) => u.uid === uid))
}

/** Seeds sample data the first time the app runs in this browser. */
export function ensureSeed({ force = false } = {}) {
  if (!force && getAllListings().length) return false
  write(K_LISTINGS, buildSeedListings())
  emitListings()
  return true
}

export function resetDemoData() {
  write(K_LISTINGS, buildSeedListings())
  emitListings()
  emitAuth()
}

/* --------------------------------- auth ----------------------------------- */

function onAuth(cb) {
  authListeners.add(cb)
  // Match Firebase's contract: always emit the current state asynchronously.
  Promise.resolve().then(() => cb(currentUser()))
  return () => authListeners.delete(cb)
}

async function signUp({ email, password, ...profile }) {
  const users = getAllUsers()
  const normalised = String(email).trim().toLowerCase()
  if (users.some((u) => u.email.toLowerCase() === normalised)) {
    throw fail('That email already has a ZeroBin account. Try signing in instead.', 'auth/email-already-in-use')
  }
  const user = {
    uid: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: normalised,
    password,
    createdAt: Date.now(),
    ...profile,
  }
  write(K_USERS, [...users, user])
  write(K_SESSION, user.uid)
  emitAuth()
  return publicProfile(user)
}

async function signIn(email, password) {
  const normalised = String(email).trim().toLowerCase()
  const user = getAllUsers().find((u) => u.email.toLowerCase() === normalised)
  if (!user || user.password !== password) {
    throw fail('Email or password is not right. Check both and try again.', 'auth/invalid-credential')
  }
  write(K_SESSION, user.uid)
  emitAuth()
  return publicProfile(user)
}

async function signOutUser() {
  write(K_SESSION, null)
  emitAuth()
}

async function updateProfile(uid, patch) {
  const users = getAllUsers()
  const next = users.map((u) => (u.uid === uid ? { ...u, ...patch } : u))
  write(K_USERS, next)
  emitAuth()
  return publicProfile(next.find((u) => u.uid === uid))
}

/* ------------------------------- listings --------------------------------- */

function watchListings(cb) {
  listingListeners.add(cb)
  Promise.resolve().then(() => cb(getAllListings()))
  return () => listingListeners.delete(cb)
}

async function getListing(id) {
  return getAllListings().find((l) => l.id === id) || null
}

async function createListing(data) {
  const now = Date.now()
  const listing = {
    ...data,
    id: `l-${now}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'available',
    claimedBy: null,
    claimedByName: null,
    claimCode: null,
    claimedAt: null,
    pickedUpAt: null,
    createdAt: now,
    updatedAt: now,
  }
  saveListings([listing, ...getAllListings()])
  return listing.id
}

async function updateListing(id, patch) {
  const all = getAllListings()
  const found = all.find((l) => l.id === id)
  if (!found) throw fail('That listing no longer exists.', 'not-found')
  saveListings(all.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: Date.now() } : l)))
}

async function deleteListing(id) {
  saveListings(getAllListings().filter((l) => l.id !== id))
}

/**
 * The one operation that must not race. In the local backend we re-read
 * immediately before writing, which is as close to a transaction as
 * localStorage gets; the Firestore backend uses a real transaction.
 */
async function claimListing(id, user) {
  const all = getAllListings()
  const listing = all.find((l) => l.id === id)
  if (!listing) throw fail('That listing no longer exists.', 'not-found')
  if (listing.status !== 'available') {
    throw fail('Someone else just claimed this one. Have a look at what else is nearby.', 'already-claimed')
  }
  if (Number(listing.pickupEnd) <= Date.now()) {
    throw fail('The pickup window for this item has closed.', 'expired')
  }
  if (listing.businessId === user.uid) {
    throw fail('This is your own listing — you cannot claim it.', 'own-listing')
  }
  const claimCode = makePickupCode()
  saveListings(
    all.map((l) =>
      l.id === id
        ? {
            ...l,
            status: 'claimed',
            claimedBy: user.uid,
            claimedByName: user.orgName || user.name,
            claimCode,
            claimedAt: Date.now(),
            updatedAt: Date.now(),
          }
        : l,
    ),
  )
  return claimCode
}

async function releaseClaim(id, user) {
  const all = getAllListings()
  const listing = all.find((l) => l.id === id)
  if (!listing) throw fail('That listing no longer exists.', 'not-found')
  if (listing.claimedBy !== user.uid) {
    throw fail('This claim is not yours to cancel.', 'permission-denied')
  }
  saveListings(
    all.map((l) =>
      l.id === id
        ? {
            ...l,
            status: 'available',
            claimedBy: null,
            claimedByName: null,
            claimCode: null,
            claimedAt: null,
            updatedAt: Date.now(),
          }
        : l,
    ),
  )
}

async function markPickedUp(id, user) {
  const all = getAllListings()
  const listing = all.find((l) => l.id === id)
  if (!listing) throw fail('That listing no longer exists.', 'not-found')
  if (listing.businessId !== user.uid) {
    throw fail('Only the shop that posted this can mark it collected.', 'permission-denied')
  }
  if (listing.status !== 'claimed') {
    throw fail('This item has not been reserved by anyone yet.', 'not-claimed')
  }
  saveListings(
    all.map((l) =>
      l.id === id
        ? { ...l, status: 'picked_up', pickedUpAt: Date.now(), updatedAt: Date.now() }
        : l,
    ),
  )
}

export const localBackend = {
  mode: 'local',
  ensureSeed,
  resetDemoData,
  onAuth,
  signUp,
  signIn,
  signOut: signOutUser,
  updateProfile,
  watchListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  claimListing,
  releaseClaim,
  markPickedUp,
}
