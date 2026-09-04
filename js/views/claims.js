/**
 * The receiver's side of Feature 3 — what I have reserved and what I collected.
 * The pickup code is the whole point of this screen, so it is the biggest thing
 * on it: readable across a counter, on a phone, at arm's length.
 */

import { confirmDialog, emptyState, esc, icon, statTile, toast, toastErr, toastOk } from '../ui.js'
import { countdown, effectiveStatus, formatWindow, num, timeAgo } from '../lib/format.js'
import { summarise } from '../lib/stats.js'
import { distanceKm, formatDistance } from '../lib/geo.js'
import { backend, state, subscribe } from '../store.js'

export function render() {
  const { user, authReady } = state

  if (!authReady) {
    return `<div class="page view-pad" style="padding-top:8rem"><p class="small mute">Checking your account…</p></div>`
  }
  if (!user) {
    return `<div class="page view-pad" style="padding-top:9rem;max-width:40rem;text-align:center">
        <p class="display h-lg">Sign in to see your claims</p>
        <p class="lede" style="margin:1.2rem auto 2rem">
          Your pickup codes and collection history live in your account.
        </p>
        <div class="row row-wrap" style="justify-content:center;gap:.7rem">
          <a class="btn btn-primary" href="#/login">Sign in</a>
          <a class="btn btn-outline" href="#/signup">Create an account</a>
        </div>
      </div>`
  }

  return `
    <header class="page-header">
      <div class="page">
        <p class="eyebrow crumb"><a href="#/">ZeroBin</a> <span style="opacity:.4">/</span> My claims</p>
        <div class="spread">
          <div>
            <h1 class="display h-xl" style="max-width:16ch">
              What you are <span class="display-it gold glow-gold">collecting.</span>
            </h1>
            <p class="lede" style="margin-top:1.2rem">
              Show the pickup code at the counter. The shop confirms it and the meal is counted.
            </p>
          </div>
          <a class="btn btn-primary btn-lg" href="#/browse">${icon('search', 16)} Find more food</a>
        </div>
      </div>
    </header>

    <div class="page view-pad" style="padding-top:2rem">
      <div class="grid cols-4" id="claim-stats"></div>
      <div id="claim-active" style="margin-top:2rem"></div>
      <div id="claim-history" style="margin-top:2.5rem"></div>
    </div>`
}

export function after(root) {
  if (!root.querySelector('#claim-active')) return null
  const paint = () => paintAll(root)
  paint()
  return subscribe(paint)
}

function paintAll(root) {
  const { listings, user, now, place } = state
  const mine = listings.filter((l) => l.claimedBy === user?.uid)
  const s = summarise(mine, now)

  const active = mine
    .filter((l) => l.status === 'claimed')
    .sort((a, b) => Number(a.pickupEnd) - Number(b.pickupEnd))
  const history = mine
    .filter((l) => l.status === 'picked_up')
    .sort((a, b) => Number(b.pickedUpAt) - Number(a.pickedUpAt))

  root.querySelector('#claim-stats').innerHTML = [
    statTile({ label: 'Meals you rescued', value: num(s.meals), sub: `${num(s.pickups)} collections`, iconName: 'leaf' }),
    statTile({ label: 'Waiting to collect', value: num(active.length), sub: active.length ? 'Codes are below' : 'Nothing reserved right now', iconName: 'ticket' }),
    statTile({ label: 'This month', value: num(s.mealsThisMonth), sub: `${num(s.pickupsThisMonth)} pickups since the 1st`, iconName: 'chart' }),
    statTile({ label: 'CO₂e avoided', value: `${num(Math.round(s.co2e))} kg`, sub: 'At 2.5 kg CO₂e per kg of food', iconName: 'leaf' }),
  ].join('')

  /* ---- active reservations, each with its big code ---- */
  const activeBox = root.querySelector('#claim-active')
  activeBox.innerHTML = active.length
    ? `<p class="eyebrow" style="margin-bottom:1.2rem">Ready to collect</p>
       <div class="grid cols-2">${active.map((l) => claimCard(l, now, place)).join('')}</div>`
    : emptyState({
        iconName: 'ticket',
        title: 'Nothing reserved right now',
        body: 'When you claim something it is held for you and its pickup code appears here.',
        action: '<a class="btn btn-primary" href="#/browse">See what is available nearby</a>',
      })

  active.forEach((l) => wireCard(activeBox, l))

  /* ---- history ---- */
  const histBox = root.querySelector('#claim-history')
  histBox.innerHTML = history.length
    ? `<p class="eyebrow" style="margin-bottom:1.2rem">Collected before</p>
       <div class="card">
         <table class="data-table">
           <thead><tr><th>Food</th><th>Shop</th><th class="num">Meals</th><th class="num">When</th></tr></thead>
           <tbody>
             ${history
               .slice(0, 25)
               .map(
                 (l) => `<tr>
                   <td><a class="link" href="#/item/${encodeURIComponent(l.id)}">${esc(l.title)}</a></td>
                   <td class="dim">${esc(l.businessName)}</td>
                   <td class="num">${num(l.portions)}</td>
                   <td class="num dim">${esc(timeAgo(l.pickedUpAt, now))}</td>
                 </tr>`,
               )
               .join('')}
           </tbody>
         </table>
       </div>`
    : ''
}

function claimCard(l, now, place) {
  const cd = countdown(l.pickupEnd, now)
  const km = distanceKm(place, l)
  const mapQ = encodeURIComponent(`${l.address}, ${l.city}, Sri Lanka`)

  return `
    <div class="card card-pad" data-claim="${esc(l.id)}">
      <div class="row between" style="align-items:flex-start;gap:1rem">
        <div class="grow">
          <p class="display" style="font-size:1.45rem;line-height:1.15">${esc(l.title)}</p>
          <p class="small dim" style="margin-top:.5rem">${icon('store', 13)} ${esc(l.businessName)} · ${esc(l.city)}</p>
        </div>
        <span class="badge warn">Reserved</span>
      </div>

      <div class="code-box" style="margin-top:1.1rem">
        <p class="eyebrow no-rule mute" style="justify-content:center">Pickup code</p>
        <p class="code-value" style="margin-top:.5rem">${esc(l.claimCode)}</p>
      </div>

      <div class="meta-row" style="margin-top:1rem">
        <span>${icon('box', 13)} ${num(l.portions)} portions</span>
        <span class="dot">·</span>
        <span class="${cd.urgent ? 'urgent' : ''}">${icon('clock', 13)} ${esc(cd.text)}</span>
        ${formatDistance(km) ? `<span class="dot">·</span><span>${icon('pin', 13)} ${esc(formatDistance(km))}</span>` : ''}
      </div>
      <p class="xsmall mute" style="margin-top:.45rem">${esc(formatWindow(l.pickupStart, l.pickupEnd))} · ${esc(l.address)}</p>

      <div class="row row-wrap" style="gap:.5rem;margin-top:1.1rem">
        <button class="btn btn-subtle btn-sm" data-act="copy">${icon('copy', 14)} Copy code</button>
        <a class="btn btn-subtle btn-sm" href="https://www.google.com/maps/search/?api=1&query=${mapQ}" target="_blank" rel="noreferrer">${icon('pin', 14)} Directions</a>
        <a class="btn btn-subtle btn-sm" href="tel:${esc(l.businessPhone)}">Call shop</a>
        <button class="btn btn-ghost btn-sm" data-act="release" style="margin-left:auto">Cancel claim</button>
      </div>
    </div>`
}

function wireCard(root, l) {
  const card = root.querySelector(`[data-claim="${CSS.escape(l.id)}"]`)
  if (!card) return

  card.querySelector('[data-act="copy"]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(l.claimCode)
      toastOk('Pickup code copied.')
    } catch {
      toast(`Your code is ${l.claimCode}`, 'info')
    }
  })

  card.querySelector('[data-act="release"]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Release this claim?',
      body: `“${l.title}” goes straight back onto the public list so somebody else can collect it.`,
      confirmLabel: 'Yes, release it',
    })
    if (!ok) return
    try {
      await backend.releaseClaim(l.id, state.user)
      toast('Released. It is back on the list for someone else.', 'info')
    } catch (err) {
      toastErr(err.message)
    }
  })
}
