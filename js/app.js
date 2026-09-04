/**
 * Router, chrome (nav + footer) and app bootstrap.
 *
 * Routing is hash-based on purpose: it works on any static host — Vercel,
 * Netlify, Firebase Hosting, GitHub Pages — with no rewrite rules and no
 * server, which matches the "must be deployed and publicly reachable"
 * requirement with the least that can go wrong.
 */

import { $, $$, esc, h, icon, on, toast, wireReveals } from './ui.js'
import { displayName, isBusiness, isReceiver, start, state, subscribe, backend } from './store.js'

import * as home from './views/home.js'
import * as browse from './views/browse.js'
import * as detail from './views/detail.js'
import * as post from './views/post.js'
import * as business from './views/business.js'
import * as claims from './views/claims.js'
import * as impact from './views/impact.js'
import * as about from './views/about.js'
import * as auth from './views/auth.js'

/* --------------------------------- routes --------------------------------- */

const ROUTES = [
  { re: /^\/?$/, view: home, title: 'ZeroBin — Good food. Wrong bin.' },
  { re: /^\/browse$/, view: browse, title: 'Find food nearby — ZeroBin' },
  { re: /^\/item\/(.+)$/, view: detail, title: 'Food details — ZeroBin' },
  { re: /^\/post$/, view: post, title: 'Post surplus food — ZeroBin' },
  { re: /^\/post\/(.+)$/, view: post, title: 'Edit listing — ZeroBin' },
  { re: /^\/business$/, view: business, title: 'Business dashboard — ZeroBin' },
  { re: /^\/claims$/, view: claims, title: 'My claims — ZeroBin' },
  { re: /^\/impact$/, view: impact, title: 'Impact — ZeroBin' },
  { re: /^\/about$/, view: about, title: 'The problem — ZeroBin' },
  { re: /^\/login$/, view: auth, title: 'Sign in — ZeroBin', props: { mode: 'login' } },
  { re: /^\/signup$/, view: auth, title: 'Create an account — ZeroBin', props: { mode: 'signup' } },
]

const currentPath = () => (location.hash || '#/').slice(1) || '/'

export function navigate(path) {
  location.hash = path.startsWith('#') ? path : `#${path}`
}

let cleanup = null
let renderToken = 0

/* Auth arrives asynchronously, after the first render. Views that gate on it
   (post, my listings, my claims) would otherwise be stuck on "Checking your
   account…" forever on a hard refresh, so we re-render the route once the
   answer lands — and only then, not on every clock tick. */
const authKey = () => `${state.authReady}:${state.user?.uid || ''}`
let lastAuthKey = null

async function renderRoute({ keepScroll = false } = {}) {
  const path = currentPath()
  const match = ROUTES.map((r) => ({ r, m: r.re.exec(path) })).find((x) => x.m)
  const container = $('#view')
  const token = (renderToken += 1)
  lastAuthKey = authKey()

  if (cleanup) {
    cleanup()
    cleanup = null
  }

  if (!match) {
    document.title = 'Not found — ZeroBin'
    container.innerHTML = notFound()
    paintNav()
    return
  }

  const { r, m } = match
  const params = { id: m[1] ? decodeURIComponent(m[1]) : null, ...(r.props || {}) }

  document.title = r.title
  container.innerHTML = r.view.render(params)
  // A slow async view could otherwise paint over a newer route.
  if (token !== renderToken) return
  cleanup = r.view.after?.(container, params, { navigate }) || null

  wireReveals(container)
  paintNav()
  if (!keepScroll) window.scrollTo({ top: 0, behavior: 'auto' })
  container.focus({ preventScroll: true })
}

/* ---------------------------------- nav ----------------------------------- */

function navItems() {
  const items = [
    { label: 'Home', to: '#/' },
    { label: 'Find food', to: '#/browse' },
    { label: 'Impact', to: '#/impact' },
    { label: 'The problem', to: '#/about' },
  ]
  if (isBusiness()) {
    items.splice(2, 0, { label: 'My listings', to: '#/business' })
  } else if (isReceiver()) {
    items.splice(2, 0, { label: 'My claims', to: '#/claims' })
  }
  return items
}

function paintNav() {
  const hash = location.hash || '#/'
  const items = navItems()

  $('#nav-links').innerHTML = items
    .map(
      (i) =>
        `<a class="nav-link ${hash === i.to ? 'active' : ''}" href="${i.to}">${esc(i.label)}</a>`,
    )
    .join('')

  // The bar's call to action is hidden on phones, so the menu carries it.
  const mobileActions = !state.authReady
    ? ''
    : state.user
      ? `<div class="mobile-actions">
           ${isBusiness()
             ? `<a class="btn btn-primary" href="#/post">${icon('plus', 15)} Post food</a>`
             : `<a class="btn btn-primary" href="#/browse">${icon('search', 15)} Find food</a>`}
           <button class="btn btn-subtle" id="sign-out-mobile">${icon('logout', 15)} Sign out</button>
         </div>
         <p class="xsmall mute" style="margin-top:1rem">Signed in as ${esc(displayName())}</p>`
      : `<div class="mobile-actions">
           <a class="btn btn-primary" href="#/login">Sign in</a>
           <a class="btn btn-outline" href="#/signup">Create an account</a>
         </div>`

  $('#mobile-links').innerHTML =
    items
      .map((i) => `<a class="${hash === i.to ? 'active' : ''}" href="${i.to}">${esc(i.label)}</a>`)
      .join('') + mobileActions

  const box = $('#nav-auth')
  if (!state.authReady) {
    box.innerHTML = ''
  } else if (state.user) {
    box.innerHTML = `
      ${isBusiness()
        ? `<a class="btn btn-primary btn-sm nav-cta" href="#/post">${icon('plus', 14)} Post food</a>`
        : `<a class="btn btn-primary btn-sm nav-cta" href="#/browse">${icon('search', 14)} Find food</a>`}
      <button class="icon-btn" id="sign-out" title="Sign out — ${esc(displayName())}" aria-label="Sign out">${icon('logout', 16)}</button>`
  } else {
    box.innerHTML = `<a class="btn btn-outline btn-sm nav-cta" href="#/login">Sign in</a>`
  }

  const signOut = async () => {
    await backend.signOut()
    toast('Signed out. See you at closing time.', 'info')
    navigate('/')
  }
  $('#sign-out')?.addEventListener('click', signOut)
  $('#sign-out-mobile')?.addEventListener('click', signOut)

}

function notFound() {
  return `<section class="page section" style="padding-top:9rem;text-align:center">
      <p class="eyebrow no-rule" style="justify-content:center">404</p>
      <h1 class="display h-xl" style="margin-top:1rem">That page went <span class="display-it gold">in the bin.</span></h1>
      <p class="lede" style="margin:1.4rem auto 2rem">The link may be old, or the listing has already been collected.</p>
      <a class="btn btn-primary" href="#/browse">See what is available now ${icon('arrow', 15)}</a>
    </section>`
}

/* --------------------------------- chrome --------------------------------- */

function setupMenu() {
  const menu = $('#mobile-menu')
  const openMenu = () => {
    menu.hidden = false
    requestAnimationFrame(() => menu.classList.add('open'))
    $('#burger').setAttribute('aria-expanded', 'true')
    document.body.style.overflow = 'hidden'
  }
  const closeMenu = () => {
    menu.classList.remove('open')
    $('#burger').setAttribute('aria-expanded', 'false')
    document.body.style.overflow = ''
    setTimeout(() => { menu.hidden = true }, 550)
  }
  $('#burger').addEventListener('click', openMenu)
  $('#menu-close').addEventListener('click', closeMenu)
  on(menu, 'click', 'a', closeMenu)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) closeMenu()
  })
}

function setupScrollState() {
  const nav = $('#nav')
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40)
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
}

function renderFooter() {
  const year = new Date().getFullYear()
  $('#footer').innerHTML = `
    <div class="page footer-grid">
      <div>
        <img class="footer-logo" src="assets/logo.png"
             alt="ZeroBin — good food, less waste, more together" />
        <p class="small dim" style="max-width:38ch;line-height:1.7">
          Surplus food from Sri Lankan kitchens, found and collected before it is
          thrown away. A student project for SE3090 at SLIIT.
        </p>
      </div>
      <nav aria-label="Footer">
        <p class="eyebrow no-rule mute" style="margin-bottom:.9rem">Explore</p>
        <ul class="stack-sm small dim">
          <li><a class="link-line" href="#/browse">Find food nearby</a></li>
          <li><a class="link-line" href="#/impact">Impact dashboard</a></li>
          <li><a class="link-line" href="#/about">The problem we picked</a></li>
        </ul>
      </nav>
      <nav aria-label="Account">
        <p class="eyebrow no-rule mute" style="margin-bottom:.9rem">Take part</p>
        <ul class="stack-sm small dim">
          <li><a class="link-line" href="#/post">Post surplus food</a></li>
          <li><a class="link-line" href="#/signup">Create an account</a></li>
          <li><a class="link-line" href="#/login">Sign in</a></li>
        </ul>
      </nav>
    </div>
    <div class="page footer-bottom">
      <p>&copy; ${year} ZeroBin · SE3090 Mini Hackathon · SLIIT</p>
      <p>Nothing good should end up in a bin.</p>
    </div>`
}

/* -------------------------------- bootstrap ------------------------------- */

function init() {
  setupMenu()
  setupScrollState()
  renderFooter()

  start()
  subscribe(() => {
    paintNav()
    // Views listen for their own data; the only thing that has to re-run the
    // whole route is the identity changing, because that changes which view
    // the router should be showing at all.
    if (authKey() !== lastAuthKey) renderRoute({ keepScroll: true })
  })

  window.addEventListener('hashchange', renderRoute)
  renderRoute()
}

init()
