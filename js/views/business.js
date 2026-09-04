/**
 * The business dashboard — the other half of Feature 1, plus the counter side
 * of Feature 3. Everything a shop needs in one screen: what is live, what is
 * reserved and waiting to be handed over, and what it has saved so far.
 */

import {
  emptyState, esc, icon, listingCard, statTile, toast, toastErr, toastOk,
} from '../ui.js'
import { effectiveStatus, num, normaliseCode, timeAgo } from '../lib/format.js'
import { summarise } from '../lib/stats.js'
import { backend, state, subscribe } from '../store.js'

const TABS = [
  { id: 'active', label: 'Live now' },
  { id: 'reserved', label: 'Waiting for pickup' },
  { id: 'done', label: 'Collected' },
  { id: 'closed', label: 'Closed without a taker' },
]

let tab = 'active'

export function render() {
  tab = 'active'
  const { user, authReady } = state

  if (!authReady) {
    return `<div class="page view-pad" style="padding-top:8rem"><p class="small mute">Checking your account…</p></div>`
  }
  if (!user || user.role !== 'business') {
    return `<div class="page view-pad" style="padding-top:9rem;max-width:40rem;text-align:center">
        <p class="display h-lg">This is the business side</p>
        <p class="lede" style="margin:1.2rem auto 2rem">
          Sign in with a business account to post surplus food and confirm pickups at your counter.
        </p>
        <div class="row row-wrap" style="justify-content:center;gap:.7rem">
          <a class="btn btn-primary" href="#/login">Sign in</a>
          <a class="btn btn-outline" href="#/signup">Create a business account</a>
        </div>
      </div>`
  }

  return `
    <header class="page-header">
      <div class="page">
        <p class="eyebrow crumb"><a href="#/">ZeroBin</a> <span style="opacity:.4">/</span> My listings</p>
        <div class="spread">
          <div>
            <h1 class="display h-xl" style="max-width:16ch">
              ${esc(user.orgName || user.name)}<span class="display-it gold glow-gold">.</span>
            </h1>
            <p class="lede" style="margin-top:1.2rem">
              Post what is left at closing, then confirm the pickup code when somebody
              comes to collect it.
            </p>
          </div>
          <a class="btn btn-primary btn-lg" href="#/post">${icon('plus', 16)} Post surplus food</a>
        </div>
      </div>
    </header>

    <div class="page view-pad" style="padding-top:2rem">
      <div class="grid cols-4" id="biz-stats"></div>

      <div class="card card-pad" style="margin-top:1.5rem" id="verify-box"></div>

      <div class="row row-wrap" style="gap:.5rem;margin-top:2rem" id="biz-tabs" role="tablist"></div>
      <div class="grid cols-3" id="biz-list" style="margin-top:1.2rem"></div>
    </div>`
}

export function after(root) {
  if (!root.querySelector('#biz-list')) return null

  const paint = () => paintAll(root)
  paint()

  root.querySelector('#biz-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]')
    if (!btn) return
    tab = btn.dataset.tab
    paint()
  })

  return subscribe(paint)
}

function paintAll(root) {
  const { listings, user, now } = state
  const mine = listings.filter((l) => l.businessId === user?.uid)
  const s = summarise(mine, now)

  root.querySelector('#biz-stats').innerHTML = [
    statTile({ label: 'Meals rescued', value: num(s.meals), sub: `${num(s.pickups)} confirmed pickups`, iconName: 'leaf' }),
    statTile({ label: 'Live right now', value: num(s.liveCount), sub: `${num(s.livePortions)} portions on offer`, iconName: 'box' }),
    statTile({ label: 'Waiting for pickup', value: num(s.reservedCount), sub: 'Reserved, code not yet confirmed', iconName: 'ticket' }),
    statTile({
      label: 'Found a taker',
      value: s.rescueRate == null ? '—' : `${s.rescueRate}%`,
      sub: s.missed ? `${num(s.missed)} closed with nobody claiming` : 'Every closed listing was collected',
      iconName: 'chart',
    }),
  ].join('')

  paintVerify(root, mine)
  paintTabs(root, mine)
}

/* --------------------------- confirm a pickup code ------------------------- */

function paintVerify(root, mine) {
  const box = root.querySelector('#verify-box')
  const waiting = mine.filter((l) => l.status === 'claimed')

  // This panel repaints on the shared 30-second clock tick, which would
  // otherwise wipe a code the owner is halfway through typing at the counter.
  const previous = box.querySelector('#counter-code')
  const carried = previous ? previous.value : ''
  const wasFocused = document.activeElement === previous

  box.innerHTML = `
    <div class="spread" style="align-items:flex-start">
      <div style="max-width:44ch">
        <p class="eyebrow no-rule mute" style="margin-bottom:.6rem">At the counter</p>
        <p class="display" style="font-size:1.6rem">Confirm a pickup code</p>
        <p class="small dim" style="margin-top:.6rem;line-height:1.7">
          ${waiting.length
            ? `${num(waiting.length)} reservation${waiting.length === 1 ? ' is' : 's are'} waiting to be collected. Type the code the person shows you.`
            : 'Nothing is reserved right now. When somebody claims an item, their code can be confirmed here.'}
        </p>
      </div>
      <div class="stack-sm" style="min-width:min(100%,18rem)">
        <label class="field-label" for="counter-code">Pickup code</label>
        <div class="row" style="gap:.5rem">
          <input class="field" id="counter-code" placeholder="ABC-123" maxlength="8" autocomplete="off" ${waiting.length ? '' : 'disabled'}>
          <button class="btn btn-primary" id="counter-go" ${waiting.length ? '' : 'disabled'}>${icon('check', 15)}</button>
        </div>
        <p class="field-error" id="counter-error" hidden></p>
      </div>
    </div>`

  if (!waiting.length) return

  const input = box.querySelector('#counter-code')
  const errEl = box.querySelector('#counter-error')

  if (carried) input.value = carried
  if (wasFocused) input.focus()

  const submit = async () => {
    const typed = normaliseCode(input.value)
    if (!typed) {
      errEl.textContent = 'Ask the person for the six-character code on their phone.'
      errEl.hidden = false
      input.focus()
      return
    }
    const match = waiting.find((l) => normaliseCode(l.claimCode) === typed)
    if (!match) {
      errEl.textContent = 'No reservation of yours has that code. Check it once more.'
      errEl.hidden = false
      input.select()
      return
    }
    errEl.hidden = true
    try {
      await backend.markPickedUp(match.id, state.user)
      input.value = ''
      toastOk(`Confirmed “${match.title}”. ${num(match.portions)} meals counted.`)
    } catch (err) {
      toastErr(err.message)
    }
  }

  box.querySelector('#counter-go').addEventListener('click', submit)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit()
  })
}

/* ---------------------------------- tabs ---------------------------------- */

function bucket(l, now) {
  const status = effectiveStatus(l, now)
  if (status === 'available') return 'active'
  if (status === 'claimed') return 'reserved'
  if (status === 'picked_up') return 'done'
  return 'closed'
}

function paintTabs(root, mine) {
  const { now, place } = state
  const counts = { active: 0, reserved: 0, done: 0, closed: 0 }
  mine.forEach((l) => { counts[bucket(l, now)] += 1 })

  root.querySelector('#biz-tabs').innerHTML = TABS.map(
    (t) => `<button class="chip" data-tab="${t.id}" aria-pressed="${t.id === tab}" role="tab">
        ${esc(t.label)} <span class="mute">${counts[t.id]}</span>
      </button>`,
  ).join('')

  const rows = mine
    .filter((l) => bucket(l, now) === tab)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))

  const list = root.querySelector('#biz-list')

  if (!rows.length) {
    const copy = {
      active: ['Nothing is live right now', 'When you have food left at closing time, post it here — it takes under a minute.'],
      reserved: ['Nothing is reserved', 'As soon as somebody claims one of your listings it appears here with their pickup code.'],
      done: ['No collections yet', 'Once you confirm a pickup code, that listing moves here and its meals are counted.'],
      closed: ['Nothing closed unclaimed', 'Listings whose window passed with nobody claiming them show up here.'],
    }[tab]
    list.innerHTML = emptyState({
      iconName: tab === 'active' ? 'plus' : 'box',
      title: copy[0],
      body: copy[1],
      action: tab === 'active' ? '<a class="btn btn-primary" href="#/post">Post surplus food</a>' : '',
    })
    return
  }

  list.innerHTML = rows
    .map((l) => {
      const card = listingCard(l, { place, now })
      const extra =
        l.status === 'claimed'
          ? `<div class="card" style="margin-top:.55rem;padding:.75rem 1rem">
               <p class="xsmall mute">Reserved by ${esc(l.claimedByName || 'a ZeroBin user')} · ${esc(timeAgo(l.claimedAt, now))}</p>
               <p class="row" style="gap:.5rem;margin-top:.35rem;font-weight:600;letter-spacing:.08em">${icon('ticket', 14, 'gold')} ${esc(l.claimCode)}</p>
             </div>`
          : l.status === 'picked_up'
            ? `<div class="card" style="margin-top:.55rem;padding:.75rem 1rem">
                 <p class="xsmall mute">Collected ${esc(timeAgo(l.pickedUpAt, now))} by ${esc(l.claimedByName || 'a ZeroBin user')}</p>
               </div>`
            : ''
      return `<div>${card}${extra}</div>`
    })
    .join('')
}
