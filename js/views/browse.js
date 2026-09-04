/**
 * Feature 2 — Find nearby food.
 *
 * Everything still open, closest first, with search, category filters and a
 * distance limit. The location either comes from the browser or from a town
 * picker, because plenty of people will decline the permission prompt and the
 * screen still has to be useful for them.
 */

import {
  cardSkeleton, emptyState, esc, icon, listingCard, wireReveals,
} from '../ui.js'
import { CATEGORIES, countdown, effectiveStatus, num } from '../lib/format.js'
import { SRI_LANKA_PLACES, distanceKm } from '../lib/geo.js'
import { backend, setPlaceByName, state, subscribe, useCurrentLocation } from '../store.js'

const SORTS = [
  { id: 'distance', label: 'Closest first' },
  { id: 'closing', label: 'Closing soonest' },
  { id: 'newest', label: 'Just posted' },
  { id: 'portions', label: 'Most portions' },
]

const RADII = [
  { id: 0, label: 'Any distance' },
  { id: 2, label: 'Within 2 km' },
  { id: 5, label: 'Within 5 km' },
  { id: 15, label: 'Within 15 km' },
]

/* Filter state lives for as long as the view does. */
let f = { q: '', cat: 'all', sort: 'distance', radius: 0, vegOnly: false }

export function render() {
  f = { q: '', cat: 'all', sort: 'distance', radius: 0, vegOnly: false }

  return `
    <header class="page-header">
      <div class="page">
        <p class="eyebrow crumb"><a href="#/">ZeroBin</a> <span style="opacity:.4">/</span> Find food</p>
        <div class="spread">
          <div>
            <h1 class="display h-xl" style="max-width:14ch">
              Still good, <span class="display-it gold glow-gold">still warm.</span>
            </h1>
            <p class="lede" style="margin-top:1.2rem">
              Surplus food posted by shops and kitchens near you. Claim one and it is
              held for you — it disappears from everybody else’s list straight away.
            </p>
          </div>
          <div id="place-box" class="card card-pad" style="min-width:min(100%,19rem)"></div>
        </div>
      </div>
    </header>

    <div class="page view-pad" style="padding-top:2rem">
      <div class="filters" role="search">
        <div class="grow-input">
          <label class="sr-only" for="q">Search food or shop</label>
          <input class="field" id="q" type="search" placeholder="Search bread, rice, a shop name…" autocomplete="off">
        </div>
        <div>
          <label class="sr-only" for="sort">Sort</label>
          <select class="field" id="sort" style="width:auto">
            ${SORTS.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="sr-only" for="radius">Distance</label>
          <select class="field" id="radius" style="width:auto">
            ${RADII.map((r) => `<option value="${r.id}">${esc(r.label)}</option>`).join('')}
          </select>
        </div>
        <label class="pill-check">
          <input type="checkbox" id="veg-only">
          <span>Vegetarian only</span>
        </label>
      </div>

      <div class="row row-wrap" style="gap:.5rem;margin-top:1rem" id="cat-chips" role="group" aria-label="Filter by category">
        <button class="chip" data-cat="all" aria-pressed="true">All food</button>
        ${CATEGORIES.map(
          (c) => `<button class="chip" data-cat="${c.id}" aria-pressed="false">${c.emoji} ${esc(c.label)}</button>`,
        ).join('')}
      </div>

      <p class="small mute" id="result-count" style="margin-top:1.5rem" aria-live="polite"></p>
      <div class="grid cols-3" id="results" style="margin-top:.9rem"></div>
    </div>`
}

export function after(root) {
  const results = root.querySelector('#results')
  const count = root.querySelector('#result-count')

  const repaint = () => {
    paintPlace(root)
    paintResults(results, count)
  }

  root.querySelector('#q').addEventListener('input', (e) => {
    f.q = e.target.value
    paintResults(results, count)
  })
  root.querySelector('#sort').addEventListener('change', (e) => {
    f.sort = e.target.value
    paintResults(results, count)
  })
  root.querySelector('#radius').addEventListener('change', (e) => {
    f.radius = Number(e.target.value)
    paintResults(results, count)
  })
  root.querySelector('#veg-only').addEventListener('change', (e) => {
    f.vegOnly = e.target.checked
    paintResults(results, count)
  })
  root.querySelector('#cat-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]')
    if (!chip) return
    f.cat = chip.dataset.cat
    root.querySelectorAll('#cat-chips .chip').forEach((c) => {
      c.setAttribute('aria-pressed', String(c.dataset.cat === f.cat))
    })
    paintResults(results, count)
  })

  repaint()
  return subscribe(repaint)
}

/* -------------------------------- location -------------------------------- */

function paintPlace(root) {
  const box = root.querySelector('#place-box')
  if (!box) return
  const { place, locating } = state

  box.innerHTML = `
    <p class="eyebrow no-rule mute" style="margin-bottom:.7rem">Showing distances from</p>
    <p class="row" style="gap:.5rem;font-weight:600">${icon('pin', 16, 'gold')} ${esc(place.label || place.name)}</p>
    <div class="stack-sm" style="margin-top:.9rem">
      <button class="btn btn-subtle btn-sm btn-block" id="use-gps" ${locating ? 'disabled' : ''}>
        ${locating ? 'Finding you…' : 'Use my current location'}
      </button>
      <label class="sr-only" for="place-select">Or choose a town</label>
      <select class="field" id="place-select">
        <option value="">Or choose a town…</option>
        ${SRI_LANKA_PLACES.map(
          (p) => `<option value="${esc(p.name)}" ${p.name === place.label ? 'selected' : ''}>${esc(p.name)}</option>`,
        ).join('')}
      </select>
    </div>`

  box.querySelector('#use-gps').addEventListener('click', async () => {
    const found = await useCurrentLocation()
    if (!found) {
      // A refused permission is a normal answer, not an error to shout about.
      const { toast } = await import('../ui.js')
      toast('Could not read your location. Pick your town from the list instead.', 'info')
    }
  })
  box.querySelector('#place-select').addEventListener('change', (e) => {
    if (e.target.value) setPlaceByName(e.target.value)
  })
}

/* --------------------------------- results -------------------------------- */

function paintResults(results, count) {
  const { listings, place, now, loading, streamError } = state

  if (streamError) {
    results.innerHTML = emptyState({
      iconName: 'alert',
      title: 'The food list could not load',
      body: streamError,
    })
    count.textContent = ''
    return
  }

  if (loading) {
    results.innerHTML = Array.from({ length: 6 }, cardSkeleton).join('')
    count.textContent = 'Loading nearby food…'
    return
  }

  const q = f.q.trim().toLowerCase()

  let rows = listings
    .filter((l) => effectiveStatus(l, now) === 'available')
    .map((l) => ({ l, km: distanceKm(place, l) }))

  if (f.cat !== 'all') rows = rows.filter(({ l }) => l.category === f.cat)
  if (f.vegOnly) rows = rows.filter(({ l }) => (l.dietary || []).some((d) => d === 'veg' || d === 'vegan'))
  if (f.radius) rows = rows.filter(({ km }) => km != null && km <= f.radius)
  if (q) {
    rows = rows.filter(({ l }) =>
      [l.title, l.description, l.businessName, l.city, l.address]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }

  const sorters = {
    distance: (a, b) => (a.km ?? Infinity) - (b.km ?? Infinity),
    closing: (a, b) => Number(a.l.pickupEnd) - Number(b.l.pickupEnd),
    newest: (a, b) => Number(b.l.createdAt) - Number(a.l.createdAt),
    portions: (a, b) => Number(b.l.portions) - Number(a.l.portions),
  }
  rows.sort(sorters[f.sort] || sorters.distance)

  const totalPortions = rows.reduce((s, { l }) => s + (Number(l.portions) || 0), 0)
  count.textContent = rows.length
    ? `${rows.length} listing${rows.length === 1 ? '' : 's'} · ${num(totalPortions)} portions available`
    : ''

  if (!rows.length) {
    const filtered = q || f.cat !== 'all' || f.radius || f.vegOnly

    // A freshly created Firebase project has nothing in it. Offer to load the
    // sample data rather than showing an empty screen with no way forward.
    if (!filtered && state.isLive && !listings.length) {
      results.innerHTML = emptyState({
        iconName: 'refresh',
        title: 'Your Firebase project is empty',
        body: 'Load the sample shops, listings and five weeks of pickup history so every screen — including the impact dashboard — has something real to show.',
        action: '<button class="btn btn-primary" id="seed-btn">Load the sample data</button>',
      })
      results.querySelector('#seed-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget
        btn.disabled = true
        btn.textContent = 'Loading…'
        try {
          const total = await backend.seedFirestore({
            onProgress: (done, all) => { btn.textContent = `Loading ${done} of ${all}…` },
          })
          const { toastOk } = await import('../ui.js')
          toastOk(`Loaded ${total} sample listings. Sign in with a demo account to try both sides.`)
        } catch (err) {
          btn.disabled = false
          btn.textContent = 'Load the sample data'
          const { toastErr } = await import('../ui.js')
          toastErr(err.message)
        }
      })
      count.textContent = ''
      return
    }

    results.innerHTML = emptyState({
      iconName: filtered ? 'search' : 'box',
      title: filtered ? 'Nothing matches that yet' : 'Nothing is open right now',
      body: filtered
        ? 'Try clearing a filter, widening the distance, or searching for something more general like “bread” or “rice”.'
        : 'Most shops post between 5pm and 9pm, as they start clearing the counter. Check back this evening.',
      action: filtered
        ? '<button class="btn btn-outline" id="clear-filters">Clear all filters</button>'
        : '<a class="btn btn-primary" href="#/impact">See what has been rescued so far</a>',
    })
    results.querySelector('#clear-filters')?.addEventListener('click', () => {
      f = { q: '', cat: 'all', sort: f.sort, radius: 0, vegOnly: false }
      const root = results.closest('#view')
      root.querySelector('#q').value = ''
      root.querySelector('#radius').value = '0'
      root.querySelector('#veg-only').checked = false
      root.querySelectorAll('#cat-chips .chip').forEach((c) =>
        c.setAttribute('aria-pressed', String(c.dataset.cat === 'all')),
      )
      paintResults(results, count)
    })
    return
  }

  results.innerHTML = rows.map(({ l }) => listingCard(l, { place, now })).join('')
  wireReveals(results)
}
