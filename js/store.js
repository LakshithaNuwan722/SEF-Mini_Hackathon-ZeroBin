/**
 * Application state.
 *
 * One live listing subscription and one auth subscription for the whole app;
 * views subscribe to changes and re-render. Keeping it here (rather than each
 * view fetching for itself) is what makes a claim on the detail page update the
 * browse grid behind it.
 */

import backend, { isLive } from './lib/db.js'
import { DEFAULT_PLACE, findPlace, requestBrowserLocation } from './lib/geo.js'

const PLACE_KEY = 'zerobin:place'

function savedPlace() {
  try {
    const raw = localStorage.getItem(PLACE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { ...DEFAULT_PLACE, label: DEFAULT_PLACE.name, source: 'default' }
}

export const state = {
  user: null,
  authReady: false,
  listings: [],
  loading: true,
  streamError: null,
  place: savedPlace(),
  locating: false,
  now: Date.now(),
  isLive,
}

const listeners = new Set()

/** Subscribe to any state change. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  listeners.forEach((fn) => fn(state))
}

export function start() {
  backend.onAuth((profile) => {
    state.user = profile
    state.authReady = true
    emit()
  })

  backend.watchListings(
    (rows) => {
      state.listings = rows
      state.loading = false
      state.streamError = null
      emit()
    },
    (err) => {
      state.loading = false
      state.streamError =
        err?.code === 'permission-denied'
          ? 'The database rejected the read. Publish firestore.rules from this repository, then reload.'
          : 'Could not reach the database. Check your connection and reload.'
      emit()
    },
  )

  // A shared clock, so every countdown on screen ticks together.
  setInterval(() => {
    state.now = Date.now()
    emit()
  }, 30_000)
}

/* -------------------------------- location -------------------------------- */

export function setPlace(next) {
  state.place = next
  try {
    localStorage.setItem(PLACE_KEY, JSON.stringify(next))
  } catch { /* ignore */ }
  emit()
}

export function setPlaceByName(name) {
  const found = findPlace(name)
  if (found) setPlace({ ...found, label: found.name, source: 'manual' })
}

export async function useCurrentLocation() {
  state.locating = true
  emit()
  const found = await requestBrowserLocation()
  state.locating = false
  if (found) setPlace(found)
  else emit()
  return found
}

/* --------------------------------- helpers -------------------------------- */

export const displayName = (u = state.user) => u?.orgName || u?.name || u?.email || ''
export const isBusiness = () => state.user?.role === 'business'
export const isReceiver = () => state.user?.role === 'receiver'

export { backend }
