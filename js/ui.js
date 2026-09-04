/**
 * The shared UI kit: DOM helpers, icons, toasts, dialogs, the listing card and
 * the two chart types. Everything visual that appears more than once lives
 * here, so the app has one button, one badge, one card.
 */

import {
  categoryOf, countdown, dietLabel, effectiveStatus, formatWindow, num, STATUS,
} from './lib/format.js'
import { distanceKm, formatDistance } from './lib/geo.js'

/* ------------------------------- DOM basics ------------------------------- */

/** Escapes anything that came from a user before it reaches innerHTML. */
export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Escapes a value that will sit inside a JS/HTML attribute. */
export const attr = esc

export const $ = (sel, root = document) => root.querySelector(sel)
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]

/** Builds a detached element from an HTML string. */
export function h(html) {
  const tpl = document.createElement('template')
  tpl.innerHTML = html.trim()
  return tpl.content.firstElementChild
}

/** Event delegation — survives re-renders of the inner markup. */
export function on(root, event, selector, handler) {
  root.addEventListener(event, (e) => {
    const target = e.target.closest(selector)
    if (target && root.contains(target)) handler(e, target)
  })
}

/* ---------------------------------- icons --------------------------------- */

const ICONS = {
  search: '<circle cx="8" cy="8" r="5.5"/><path d="M12.2 12.2 17 17"/>',
  pin: '<path d="M10 17.5s6-5.2 6-9.3A6 6 0 0 0 4 8.2c0 4.1 6 9.3 6 9.3Z"/><circle cx="10" cy="8" r="2.2"/>',
  clock: '<circle cx="10" cy="10" r="7.2"/><path d="M10 5.8V10l2.8 1.8"/>',
  plus: '<path d="M10 4.2v11.6M4.2 10h11.6"/>',
  edit: '<path d="M13.2 3.9a1.9 1.9 0 0 1 2.7 2.7L7.4 15 4 16l1-3.4Z"/>',
  trash: '<path d="M4.5 6h11M8 6V4.4h4V6M6.2 6l.6 9.4h6.4L13.8 6"/>',
  check: '<path d="M4.5 10.5 8 14l7.5-8"/>',
  arrow: '<path d="M3.5 10h13M11.5 5l5 5-5 5"/>',
  sun: '<circle cx="10" cy="10" r="3.6"/><path d="M10 1.8v2M10 16.2v2M18.2 10h-2M3.8 10h-2M15.8 4.2l-1.4 1.4M5.6 14.4l-1.4 1.4M15.8 15.8l-1.4-1.4M5.6 5.6 4.2 4.2"/>',
  moon: '<path d="M16.2 11.6A6.8 6.8 0 0 1 8.4 3.8a6.9 6.9 0 1 0 7.8 7.8Z"/>',
  box: '<path d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5Z"/><path d="M3 6.5 10 10l7-3.5M10 10v7"/>',
  users: '<circle cx="7.5" cy="7" r="2.8"/><path d="M2.6 16.4a5 5 0 0 1 9.8 0"/><path d="M13.4 4.6a2.8 2.8 0 0 1 0 5.5M14.4 16.4a5 5 0 0 0-1.6-3.6"/>',
  leaf: '<path d="M4 16C3 9.5 7.5 4.5 16.5 4c.6 8.6-4 12.6-10 12.2"/><path d="M4.5 16.5 11 10"/>',
  alert: '<circle cx="10" cy="10" r="7.2"/><path d="M10 6.2v4.6M10 13.6h.01"/>',
  x: '<path d="M5 5l10 10M15 5 5 15"/>',
  chart: '<path d="M3.5 16.5V9M8.5 16.5V4M13.5 16.5v-5"/><path d="M2.5 16.5h15"/>',
  store: '<path d="M3.5 8.2V16h13V8.2"/><path d="M2.6 8.2 4 3.8h12l1.4 4.4a2.4 2.4 0 0 1-4.7.6 2.4 2.4 0 0 1-4.7 0 2.4 2.4 0 0 1-4.7-.6Z"/>',
  ticket: '<path d="M3 7.5V5.4h14v2.1a2.5 2.5 0 0 0 0 5v2.1H3v-2.1a2.5 2.5 0 0 0 0-5Z"/><path d="M9.5 6v8"/>',
  logout: '<path d="M8 16.5H4.4V3.5H8"/><path d="M12 13.5 15.5 10 12 6.5M15.5 10H7.5"/>',
  refresh: '<path d="M16.4 8.4A6.6 6.6 0 0 0 4.6 6.2"/><path d="M3.6 11.6a6.6 6.6 0 0 0 11.8 2.2"/><path d="M4.4 3v3.2h3.2M15.6 17v-3.2h-3.2"/>',
  copy: '<rect x="7" y="7" width="9.5" height="9.5" rx="2"/><path d="M13 4.5H5.5a2 2 0 0 0-2 2V13"/>',
}

/** Inline SVG icon. `name` must be a key of ICONS. */
export function icon(name, size = 16, cls = '') {
  const body = ICONS[name] || ''
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}

/* --------------------------------- toasts --------------------------------- */

export function toast(message, tone = 'info', duration = 4600) {
  const wrap = $('#toasts')
  if (!wrap) return
  const el = h(`<div class="toast ${tone}"><span class="dot"></span><p class="grow">${esc(message)}</p>
    <button class="btn-ghost" style="border:0;background:none;cursor:pointer;padding:0 .2rem" aria-label="Dismiss">${icon('x', 14)}</button></div>`)
  const close = () => {
    el.classList.add('out')
    setTimeout(() => el.remove(), 250)
  }
  el.querySelector('button').addEventListener('click', close)
  wrap.appendChild(el)
  setTimeout(close, duration)
  while (wrap.children.length > 3) wrap.firstElementChild.remove()
}

export const toastOk = (m) => toast(m, 'success')
export const toastErr = (m) => toast(m, 'error', 6200)

/* --------------------------------- dialog --------------------------------- */

/** Promise-based confirm. Resolves true when the user confirms. */
export function confirmDialog({
  title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger',
}) {
  return new Promise((resolve) => {
    const root = $('#dialog-root')
    const el = h(`
      <div class="dialog-backdrop">
        <div class="dialog" role="dialog" aria-modal="true" aria-label="${attr(title)}" tabindex="-1">
          <p class="display" style="font-size:1.55rem">${esc(title)}</p>
          ${body ? `<p class="small dim" style="margin-top:.7rem;line-height:1.6">${esc(body)}</p>` : ''}
          <div class="row" style="margin-top:1.6rem;justify-content:flex-end;flex-wrap:wrap">
            <button class="btn btn-subtle" data-act="cancel">${esc(cancelLabel)}</button>
            <button class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}" data-act="ok">${esc(confirmLabel)}</button>
          </div>
        </div>
      </div>`)

    const done = (value) => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      el.remove()
      resolve(value)
    }
    const onKey = (e) => { if (e.key === 'Escape') done(false) }

    el.querySelector('[data-act="ok"]').addEventListener('click', () => done(true))
    el.querySelector('[data-act="cancel"]').addEventListener('click', () => done(false))
    el.addEventListener('click', (e) => { if (e.target === el) done(false) })
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    root.appendChild(el)
    el.querySelector('.dialog').focus()
  })
}

/* ------------------------------ form helpers ------------------------------ */

/** One labelled control with hint and error slots wired for screen readers. */
export function field({ id, label, required, hint, error, control }) {
  return `
    <div class="field-wrap" data-field="${attr(id)}">
      <label class="field-label" for="${attr(id)}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
      ${control}
      ${hint && !error ? `<p class="field-hint" id="${attr(id)}-hint">${esc(hint)}</p>` : ''}
      <p class="field-error" id="${attr(id)}-error" ${error ? '' : 'hidden'}>${esc(error || '')}</p>
    </div>`
}

/** Paints validation results returned by the validators in format.js. */
export function paintErrors(form, errors) {
  $$('.field-wrap', form).forEach((wrap) => {
    const key = wrap.dataset.field
    const input = wrap.querySelector('.field')
    const errEl = wrap.querySelector('.field-error')
    const message = errors[key]
    if (message) {
      errEl.textContent = message
      errEl.hidden = false
      input?.setAttribute('aria-invalid', 'true')
      input?.setAttribute('aria-describedby', `${key}-error`)
    } else {
      errEl.hidden = true
      errEl.textContent = ''
      input?.removeAttribute('aria-invalid')
    }
  })
  const first = Object.keys(errors)[0]
  if (first) {
    const input = $(`[data-field="${first}"] .field`, form)
    input?.focus()
    input?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

export function formSummary(message) {
  return message
    ? `<div class="form-error" role="alert">${icon('alert', 15)}<span>${esc(message)}</span></div>`
    : ''
}

/* ------------------------------ listing card ------------------------------ */

export function statusBadge(listing, now = Date.now()) {
  const key = effectiveStatus(listing, now)
  const meta = STATUS[key] || STATUS.expired
  return `<span class="badge ${meta.tone}">${esc(meta.label)}</span>`
}

/**
 * The card used on the browse grid and the business dashboard.
 * `place` is the viewer's location, used for the distance line.
 */
export function listingCard(listing, { place, now = Date.now(), href } = {}) {
  const cat = categoryOf(listing.category)
  const km = place ? distanceKm(place, listing) : null
  const dist = formatDistance(km)
  const cd = countdown(listing.pickupEnd, now)
  const status = effectiveStatus(listing, now)
  const link = href || `#/item/${encodeURIComponent(listing.id)}`

  return `
    <a class="card card-link" href="${attr(link)}">
      <div class="listing-media">
        ${listing.imageUrl
          ? `<img src="${attr(listing.imageUrl)}" alt="${attr(listing.title)}" loading="lazy" decoding="async"
               onerror="this.parentElement.innerHTML='<div class=&quot;fallback&quot;>${cat.emoji}</div>'+this.parentElement.querySelector('.media-top').outerHTML">`
          : `<div class="fallback">${cat.emoji}</div>`}
        <div class="media-top">
          ${statusBadge(listing, now)}
          ${dist ? `<span class="badge mute">${esc(dist)}</span>` : ''}
        </div>
      </div>
      <div class="listing-body">
        <p class="xsmall mute" style="letter-spacing:.06em;text-transform:uppercase">${cat.emoji} ${esc(cat.label)}</p>
        <p class="listing-title" style="margin-top:.35rem">${esc(listing.title)}</p>
        <p class="small dim listing-shop" style="margin-top:.5rem">${icon('store', 13)} ${esc(listing.businessName)} · ${esc(listing.city)}</p>
        <div class="meta-row" style="margin-top:.7rem">
          <span>${icon('box', 13)} ${num(listing.portions)} portions</span>
          <span class="dot">·</span>
          <span class="${status === 'available' && cd.urgent ? 'urgent' : ''}">${icon('clock', 13)} ${esc(cd.over ? 'Window closed' : cd.text)}</span>
        </div>
        <p class="xsmall mute" style="margin-top:.45rem">${esc(formatWindow(listing.pickupStart, listing.pickupEnd))}</p>
        ${(listing.dietary || []).length
          ? `<div class="row row-wrap listing-tags" style="gap:.35rem">${listing.dietary
              .slice(0, 3)
              .map((d) => `<span class="badge mute">${esc(dietLabel(d))}</span>`)
              .join('')}</div>`
          : ''}
      </div>
    </a>`
}

export function cardSkeleton() {
  return `<div class="card" aria-hidden="true">
    <div class="skeleton" style="aspect-ratio:16/10;border-radius:0"></div>
    <div class="card-pad stack-sm">
      <div class="skeleton" style="height:.7rem;width:6rem"></div>
      <div class="skeleton" style="height:1.1rem;width:80%"></div>
      <div class="skeleton" style="height:.7rem;width:55%"></div>
    </div>
  </div>`
}

export function emptyState({ iconName = 'box', title, body, action = '' }) {
  return `<div class="empty">
    <span class="icon-btn" style="margin:0 auto .9rem;pointer-events:none;width:3.2rem;height:3.2rem;color:var(--gold-ink)">${icon(iconName, 22)}</span>
    <p class="display" style="font-size:1.7rem">${esc(title)}</p>
    ${body ? `<p class="small dim" style="margin:.7rem auto 0;max-width:44ch;line-height:1.7">${esc(body)}</p>` : ''}
    ${action ? `<div style="margin-top:1.6rem">${action}</div>` : ''}
  </div>`
}

/* ---------------------------------- charts -------------------------------- */
/*
 * Both charts are single-series, so they use one hue (--chart, validated for
 * >=3:1 contrast against the surface in both themes) rather than a categorical
 * palette, carry no legend — the title already names what is plotted — and
 * direct-label only the largest bar. Everything else is in the tooltip and in
 * the table view underneath, so no value is locked behind a hover.
 */

function roundedTopBar(x, y, w, hgt, r = 4) {
  const rad = Math.min(r, w / 2, Math.max(0, hgt))
  if (hgt <= 0.5) return ''
  return `M${x},${y + hgt} L${x},${y + rad} Q${x},${y} ${x + rad},${y} L${x + w - rad},${y} Q${x + w},${y} ${x + w},${y + rad} L${x + w},${y + hgt} Z`
}

function roundedEndBar(x, y, w, hgt, r = 4) {
  const rad = Math.min(r, hgt / 2, Math.max(0, w))
  if (w <= 0.5) return ''
  return `M${x},${y} L${x + w - rad},${y} Q${x + w},${y} ${x + w},${y + rad} L${x + w},${y + hgt - rad} Q${x + w},${y + hgt} ${x + w - rad},${y + hgt} L${x},${y + hgt} Z`
}

/** Rounds an axis maximum up to a clean number. */
function niceMax(value) {
  if (value <= 0) return 10
  const pow = 10 ** Math.floor(Math.log10(value))
  const scaled = value / pow
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10
  return step * pow
}

/**
 * Column chart over time. `data` is [{ label, short, meals, pickups }].
 */
export function columnChart(data, { height = 190, unit = 'meals' } = {}) {
  if (!data.length) return ''
  const W = 760
  const padL = 34
  const padR = 8
  const padT = 18
  const padB = 26
  const plotW = W - padL - padR
  const plotH = height - padT - padB

  const max = niceMax(Math.max(...data.map((d) => d.meals), 1))
  const band = plotW / data.length
  const barW = Math.min(24, band - 2) // 2px surface gap between neighbours
  const peak = data.reduce((a, b) => (b.meals > a.meals ? b : a), data[0])

  const ticks = [0, max / 2, max]
  const y = (v) => padT + plotH - (v / max) * plotH

  const gridlines = ticks
    .map(
      (t) =>
        `<line class="chart-grid-line" x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>
         <text class="chart-tick" x="${padL - 7}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${num(Math.round(t))}</text>`,
    )
    .join('')

  const bars = data
    .map((d, i) => {
      const x = padL + i * band + (band - barW) / 2
      const barH = (d.meals / max) * plotH
      const top = padT + plotH - barH
      const isPeak = d === peak && d.meals > 0
      return `<g class="chart-col" data-label="${attr(d.label)}" data-value="${attr(d.meals)}" data-sub="${attr(`${d.pickups} pickup${d.pickups === 1 ? '' : 's'}`)}">
          <rect class="chart-hit" x="${padL + i * band}" y="${padT}" width="${band}" height="${plotH}"/>
          <path class="chart-bar" d="${roundedTopBar(x, top, barW, barH)}"/>
          ${isPeak ? `<text class="chart-value" x="${x + barW / 2}" y="${top - 6}" text-anchor="middle">${num(d.meals)}</text>` : ''}
        </g>`
    })
    .join('')

  // Label every third column so the axis never collides on a phone.
  const labels = data
    .map((d, i) =>
      i % 3 === 0 || i === data.length - 1
        ? `<text class="chart-tick" x="${padL + i * band + band / 2}" y="${height - 8}" text-anchor="middle">${esc(d.label)}</text>`
        : '',
    )
    .join('')

  return `<div class="chart-wrap" data-chart data-unit="${attr(unit)}">
      <svg class="chart-svg" viewBox="0 0 ${W} ${height}" role="img" aria-label="Column chart of ${esc(unit)} over time">
        ${gridlines}${bars}${labels}
      </svg>
      <div class="chart-tip" hidden></div>
    </div>`
}

/**
 * Horizontal bars for a ranked breakdown. `rows` is [{ label, value, note }].
 */
export function barList(rows, { unit = 'meals' } = {}) {
  if (!rows.length) return ''
  const max = Math.max(...rows.map((r) => r.value), 1)
  const W = 620
  const rowH = 34
  const barH = 16
  const labelW = 168
  const height = rows.length * rowH + 6

  const bars = rows
    .map((r, i) => {
      const yTop = i * rowH + 6
      const trackX = labelW
      const trackW = W - labelW - 54
      const w = (r.value / max) * trackW
      return `<g class="chart-col" data-label="${attr(r.label)}" data-value="${attr(r.value)}" data-sub="${attr(r.note || '')}">
          <rect class="chart-hit" x="0" y="${yTop - 4}" width="${W}" height="${rowH}"/>
          <text class="chart-label" x="0" y="${yTop + barH / 2 + 4}">${esc(r.label)}</text>
          <path class="chart-bar-track" d="${roundedEndBar(trackX, yTop, trackW, barH)}"/>
          <path class="chart-bar" d="${roundedEndBar(trackX, yTop, w, barH)}"/>
          <text class="chart-value" x="${trackX + trackW + 8}" y="${yTop + barH / 2 + 4}">${num(r.value)}</text>
        </g>`
    })
    .join('')

  return `<div class="chart-wrap" data-chart data-unit="${attr(unit)}">
      <svg class="chart-svg" viewBox="0 0 ${W} ${height}" role="img" aria-label="Ranked bar chart of ${esc(unit)}">${bars}</svg>
      <div class="chart-tip" hidden></div>
    </div>`
}

/** Hover tooltips for any chart rendered above. Call once after inserting. */
export function wireCharts(root = document) {
  $$('[data-chart]', root).forEach((wrap) => {
    const tip = wrap.querySelector('.chart-tip')
    const unit = wrap.dataset.unit || ''
    $$('.chart-col', wrap).forEach((col) => {
      const show = (e) => {
        const box = wrap.getBoundingClientRect()
        tip.hidden = false
        tip.classList.add('show')
        tip.innerHTML = `${esc(col.dataset.label)} — <b>${num(col.dataset.value)}</b> ${esc(unit)}${
          col.dataset.sub ? `<br><span class="mute">${esc(col.dataset.sub)}</span>` : ''
        }`
        tip.style.left = `${e.clientX - box.left}px`
        tip.style.top = `${e.clientY - box.top}px`
      }
      col.addEventListener('mousemove', show)
      col.addEventListener('mouseenter', show)
      col.addEventListener('mouseleave', () => {
        tip.classList.remove('show')
        tip.hidden = true
      })
    })
  })
}

/** The table that sits under every chart, so no value is hover-only. */
export function dataTable(headers, rows) {
  return `<table class="data-table">
    <thead><tr>${headers
      .map((hd, i) => `<th class="${i ? 'num' : ''}">${esc(hd)}</th>`)
      .join('')}</tr></thead>
    <tbody>${rows
      .map(
        (r) =>
          `<tr>${r
            .map((c, i) => `<td class="${i ? 'num' : ''}">${esc(c)}</td>`)
            .join('')}</tr>`,
      )
      .join('')}</tbody>
  </table>`
}

/** A KPI tile. */
export function statTile({ label, value, sub, iconName }) {
  return `<div class="card stat-tile">
    <div class="row between" style="align-items:flex-start">
      <p class="stat-label">${esc(label)}</p>
      ${iconName ? `<span class="gold">${icon(iconName, 16)}</span>` : ''}
    </div>
    <p class="stat-value">${esc(value)}</p>
    ${sub ? `<p class="stat-sub">${esc(sub)}</p>` : ''}
  </div>`
}

/** Reveal-on-scroll for elements carrying `.fade-up`. */
export function wireReveals(root = document) {
  const items = $$('.fade-up', root)
  if (!items.length) return
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'))
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          io.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12 },
  )
  items.forEach((el) => io.observe(el))
}
