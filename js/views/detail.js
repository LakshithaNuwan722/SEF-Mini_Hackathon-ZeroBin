/**
 * Feature 3 — Claim and pick up.
 *
 * The screen changes shape depending on who is looking: a receiver sees a claim
 * button, the person who claimed it sees their pickup code, the shop that
 * posted it sees the code-verification controls, and everybody else sees that
 * it is already spoken for.
 */

import {
  confirmDialog, dataTable, emptyState, esc, icon, statusBadge, toast, toastErr, toastOk,
} from '../ui.js'
import {
  categoryOf, countdown, dietLabel, effectiveStatus, formatWindow, num, timeAgo,
} from '../lib/format.js'
import { distanceKm, formatDistance, travelHint } from '../lib/geo.js'
import { backend, state, subscribe } from '../store.js'

export function render() {
  return `<div class="page view-pad content-wide" id="detail-root" style="padding-top:7rem"></div>`
}

export function after(root, params, { navigate }) {
  const box = root.querySelector('#detail-root')
  const paint = () => paintDetail(box, params.id, navigate)
  paint()
  return subscribe(paint)
}

function paintDetail(box, id, navigate) {
  const { listings, user, place, now, loading } = state

  if (loading && !listings.length) {
    box.innerHTML = `<div class="card" style="height:22rem"><div class="skeleton" style="height:100%"></div></div>`
    return
  }

  const l = listings.find((x) => x.id === id)
  if (!l) {
    box.innerHTML = emptyState({
      iconName: 'alert',
      title: 'This listing is gone',
      body: 'It was either collected, cancelled by the shop, or the link is out of date.',
      action: '<a class="btn btn-primary" href="#/browse">See what else is nearby</a>',
    })
    return
  }

  const cat = categoryOf(l.category)
  const status = effectiveStatus(l, now)
  const cd = countdown(l.pickupEnd, now)
  const km = distanceKm(place, l)
  const mine = user && l.businessId === user.uid
  const claimedByMe = user && l.claimedBy === user.uid
  const mapQ = encodeURIComponent(`${l.address}, ${l.city}, Sri Lanka`)

  box.innerHTML = `
    <p class="eyebrow crumb"><a href="#/browse">Find food</a> <span style="opacity:.4">/</span> ${esc(cat.label)}</p>

    <div class="grid detail-grid" style="grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:2.5rem;align-items:start">
      <div class="stack" style="gap:1.5rem;min-width:0">
        <div class="card">
          <div class="listing-media" style="aspect-ratio:16/9">
            ${l.imageUrl
              ? `<img src="${esc(l.imageUrl)}" alt="${esc(l.title)}" onerror="this.outerHTML='<div class=&quot;fallback&quot;>${cat.emoji}</div>'">`
              : `<div class="fallback">${cat.emoji}</div>`}
            <div class="media-top">${statusBadge(l, now)}
              ${formatDistance(km) ? `<span class="badge mute">${esc(formatDistance(km))}</span>` : ''}
            </div>
          </div>
        </div>

        <div>
          <p class="xsmall mute" style="letter-spacing:.06em;text-transform:uppercase">${cat.emoji} ${esc(cat.label)}</p>
          <h1 class="display h-lg" style="margin-top:.6rem">${esc(l.title)}</h1>
          <p class="lede" style="margin-top:1.1rem">${esc(l.description || 'No extra description was added.')}</p>
          ${(l.dietary || []).length
            ? `<div class="row row-wrap" style="gap:.4rem;margin-top:1.2rem">
                 ${l.dietary.map((d) => `<span class="badge gold">${esc(dietLabel(d))}</span>`).join('')}
               </div>`
            : ''}
        </div>

        <div class="card card-pad">
          <p class="eyebrow no-rule mute" style="margin-bottom:1rem">The details</p>
          ${dataTable(
            ['', ''],
            [
              ['Portions', `${num(l.portions)} available`],
              ['Pickup window', formatWindow(l.pickupStart, l.pickupEnd)],
              ['Collect from', `${l.businessName}, ${l.address}`],
              ['Town', l.city],
              ['Distance', formatDistance(km) ? `${formatDistance(km)} · ${travelHint(km)}` : 'Set your location to see this'],
              ['Posted', timeAgo(l.createdAt, now)],
            ],
          )}
        </div>
      </div>

      <aside class="stack" style="gap:1.25rem;position:sticky;top:6rem;min-width:0">
        ${actionPanel({ l, user, status, cd, mine, claimedByMe })}

        <div class="card card-pad">
          <p class="eyebrow no-rule mute" style="margin-bottom:.9rem">The shop</p>
          <p class="display" style="font-size:1.5rem">${esc(l.businessName)}</p>
          <p class="small dim" style="margin-top:.5rem;line-height:1.7">${esc(l.address)}<br>${esc(l.city)}</p>
          <div class="stack-sm" style="margin-top:1.1rem">
            <a class="btn btn-subtle btn-sm btn-block" href="tel:${esc(l.businessPhone)}">${icon('users', 14)} Call ${esc(l.businessPhone)}</a>
            <a class="btn btn-subtle btn-sm btn-block" href="https://www.google.com/maps/search/?api=1&query=${mapQ}" target="_blank" rel="noreferrer">
              ${icon('pin', 14)} Open in Google Maps
            </a>
          </div>
        </div>
      </aside>
    </div>`

  wireActions(box, l, navigate)
}

/* ------------------------------ action panel ------------------------------ */

function actionPanel({ l, user, status, cd, mine, claimedByMe }) {
  const urgency = `<p class="small ${cd.urgent ? 'urgent' : 'dim'}" style="margin-top:.5rem">${icon('clock', 14)} ${esc(cd.text)}</p>`

  /* the shop that posted it */
  if (mine) {
    return `<div class="card card-pad">
      <p class="eyebrow no-rule mute" style="margin-bottom:.8rem">Your listing</p>
      ${statusBadge(l)}
      ${urgency}
      ${status === 'claimed'
        ? `<div class="form-note" style="margin-top:1rem">
             Reserved by <b>${esc(l.claimedByName || 'a ZeroBin user')}</b>. Ask them for their
             pickup code at the counter and confirm it below.
           </div>
           <div class="stack-sm" style="margin-top:1rem">
             <label class="field-label" for="verify-code">Pickup code</label>
             <input class="field" id="verify-code" placeholder="ABC-123" autocomplete="off" maxlength="8">
             <p class="field-error" id="verify-error" hidden></p>
             <button class="btn btn-primary btn-block" data-act="pickup">${icon('check', 15)} Confirm collected</button>
           </div>`
        : status === 'picked_up'
          ? `<div class="form-note" style="margin-top:1rem">Collected by ${esc(l.claimedByName || 'a ZeroBin user')}. ${num(l.portions)} meals counted.</div>`
          : `<div class="stack-sm" style="margin-top:1rem">
               <a class="btn btn-subtle btn-block" href="#/post/${encodeURIComponent(l.id)}">${icon('edit', 15)} Edit this listing</a>
               <button class="btn btn-danger btn-block" data-act="delete">${icon('trash', 15)} Delete listing</button>
             </div>`}
    </div>`
  }

  /* the person who claimed it */
  if (claimedByMe) {
    return `<div class="stack" style="gap:1.25rem">
      <div class="code-box">
        <p class="eyebrow no-rule mute" style="justify-content:center">Your pickup code</p>
        <p class="code-value" style="margin-top:.7rem">${esc(l.claimCode)}</p>
        <p class="small dim" style="margin-top:.9rem;line-height:1.6">
          Read this out at the counter. The shop confirms it and the meal is counted.
        </p>
        <button class="btn btn-subtle btn-sm" style="margin-top:1rem" data-act="copy">${icon('copy', 14)} Copy code</button>
      </div>
      <div class="card card-pad">
        ${statusBadge(l)}
        ${urgency}
        <p class="small dim" style="margin-top:.8rem;line-height:1.7">
          It is held for you and hidden from everybody else. If your plans change,
          release it so somebody else can take it.
        </p>
        <button class="btn btn-outline btn-block" style="margin-top:1rem" data-act="release">Cancel my claim</button>
      </div>
    </div>`
  }

  /* everybody else */
  if (status === 'available') {
    return `<div class="card card-pad">
      <p class="stat-label">Available now</p>
      <p class="stat-value">${num(l.portions)} <span class="small dim" style="font-weight:400">portions</span></p>
      ${urgency}
      ${user
        ? `<button class="btn btn-primary btn-lg btn-block" style="margin-top:1.2rem" data-act="claim">
             ${icon('ticket', 16)} Claim this food
           </button>
           <p class="xsmall mute" style="margin-top:.8rem;line-height:1.6">
             Claiming reserves it for you and removes it from everyone else’s list. Please only
             claim what you will actually collect.
           </p>`
        : `<a class="btn btn-primary btn-lg btn-block" style="margin-top:1.2rem" href="#/login">Sign in to claim</a>
           <p class="xsmall mute" style="margin-top:.8rem;line-height:1.6">
             An account takes about twenty seconds and lets the shop know who is collecting.
           </p>`}
    </div>`
  }

  const messages = {
    claimed: ['Already reserved', 'Somebody claimed this one just before you. There is usually more posted around closing time.'],
    picked_up: ['Already collected', 'This food was picked up and counted. That is exactly how it is meant to end.'],
    expired: ['The window has closed', 'The shop’s pickup window has passed, so this is no longer available.'],
    cancelled: ['Cancelled by the shop', 'The shop pulled this listing before anyone collected it.'],
  }
  const [title, body] = messages[status] || messages.expired

  return `<div class="card card-pad">
    ${statusBadge(l)}
    <p class="display" style="font-size:1.6rem;margin-top:.9rem">${esc(title)}</p>
    <p class="small dim" style="margin-top:.6rem;line-height:1.7">${esc(body)}</p>
    <a class="btn btn-primary btn-block" style="margin-top:1.2rem" href="#/browse">See what else is nearby</a>
  </div>`
}

/* -------------------------------- behaviour ------------------------------- */

function wireActions(box, l, navigate) {
  const { user } = state

  box.querySelector('[data-act="claim"]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    btn.disabled = true
    try {
      const code = await backend.claimListing(l.id, user)
      toastOk(`Claimed. Your pickup code is ${code} — show it at the counter.`)
    } catch (err) {
      toastErr(err.message)
      // The item is gone; the live stream will repaint this screen for us.
      btn.disabled = false
    }
  })

  box.querySelector('[data-act="release"]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Release this claim?',
      body: 'It goes straight back onto the public list so somebody else can collect it.',
      confirmLabel: 'Yes, release it',
    })
    if (!ok) return
    try {
      await backend.releaseClaim(l.id, user)
      toast('Released. It is back on the list for someone else.', 'info')
    } catch (err) {
      toastErr(err.message)
    }
  })

  box.querySelector('[data-act="copy"]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(l.claimCode)
      toastOk('Pickup code copied.')
    } catch {
      toast(`Your code is ${l.claimCode}`, 'info')
    }
  })

  box.querySelector('[data-act="delete"]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete this listing?',
      body: 'It disappears from everybody’s list immediately. This cannot be undone.',
      confirmLabel: 'Delete it',
    })
    if (!ok) return
    try {
      await backend.deleteListing(l.id)
      toast('Listing deleted.', 'info')
      navigate('/business')
    } catch (err) {
      toastErr(err.message)
    }
  })

  /* the shop confirming a pickup code at the counter */
  box.querySelector('[data-act="pickup"]')?.addEventListener('click', async () => {
    const input = box.querySelector('#verify-code')
    const errEl = box.querySelector('#verify-error')
    const typed = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const expected = String(l.claimCode || '').replace(/[^A-Z0-9]/g, '')

    if (!typed) {
      errEl.textContent = 'Ask the person for the six-character code on their phone.'
      errEl.hidden = false
      input.setAttribute('aria-invalid', 'true')
      input.focus()
      return
    }
    if (typed !== expected) {
      errEl.textContent = 'That code does not match this reservation. Check it once more.'
      errEl.hidden = false
      input.setAttribute('aria-invalid', 'true')
      input.select()
      return
    }
    errEl.hidden = true
    input.removeAttribute('aria-invalid')
    try {
      await backend.markPickedUp(l.id, user)
      toastOk(`Confirmed. ${num(l.portions)} meals counted towards your impact.`)
    } catch (err) {
      toastErr(err.message)
    }
  })
}

