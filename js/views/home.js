/**
 * The landing page.
 *
 * Carries the editorial language the rest of the app inherits: a dark hero
 * where the photograph is only fully lit under the pointer, hollow display
 * type, a gold accent, and a facts strip. The copy states the Sri Lankan
 * problem up front, because that is the thing the app is for.
 */

import { esc, icon, listingCard } from '../ui.js'
import { effectiveStatus, num } from '../lib/format.js'
import { summarise } from '../lib/stats.js'
import { distanceKm } from '../lib/geo.js'
import { state, subscribe } from '../store.js'

const HERO_IMG = 'assets/hero.png'

const FACTS = [
  'A third of Sri Lanka’s food is never eaten',
  'Bakeries clear the racks at 8pm',
  '1 in 4 households cut meal sizes',
  'Free to post. Free to collect.',
]

const STEPS = [
  {
    n: '01',
    t: 'A shop posts what is left',
    d: 'At closing time the bakery or restaurant lists the food it did not sell — what it is, how many portions, a photo, and the last time someone can collect it.',
    icon: 'store',
  },
  {
    n: '02',
    t: 'Neighbours see it instantly',
    d: 'People and charities nearby open ZeroBin and see everything still available, closest first, with the distance and how long the window stays open.',
    icon: 'pin',
  },
  {
    n: '03',
    t: 'One person claims it',
    d: 'The moment somebody claims an item it disappears from everybody else’s list and they get a pickup code. No two people cross town for the same bag of bread.',
    icon: 'ticket',
  },
  {
    n: '04',
    t: 'The shop marks it collected',
    d: 'The code is read out at the counter, the shop confirms it, and the meal is counted. That count is the whole point — it is proof the food was actually eaten.',
    icon: 'check',
  },
]

export function render() {
  return `
    ${heroSection()}
    ${problemSection()}
    ${stepsSection()}
    ${liveSection()}
    ${numbersSection()}
    ${ctaSection()}
  `
}

function heroSection() {
  return `
    <section class="hero grain" id="hero">
      <div class="hero-bg" aria-hidden="true"><img src="${HERO_IMG}" alt="" fetchpriority="high"></div>
      <div class="hero-spot" id="hero-spot">
        <img src="${HERO_IMG}" alt="A child being handed a meal at a community kitchen">
      </div>
      <div class="hero-vignette" aria-hidden="true"></div>

      <div class="hero-body page">
        <p class="eyebrow no-rule fade-up" style="margin-bottom:1.6rem">
          <span class="dot-gold flicker"></span>&nbsp; Food waste · Sri Lanka · Built for SE3090
        </p>

        <h1 class="display">
          <span class="line-mask"><span>GOOD FOOD.</span></span>
          <span class="line-mask"><span class="hollow">WRONG</span></span>
          <span class="line-mask"><span><span class="display-it gold glow-gold">bin.</span></span></span>
        </h1>

        <div class="spread" style="margin-top:2.2rem">
          <p class="lede fade-up" style="max-width:42ch;font-size:15px">
            Every evening, kitchens across Colombo throw out food that is still good —
            while people a street away are eating less. Move your cursor: in the dark,
            one light is everything.
          </p>
          <div class="row row-wrap fade-up" style="gap:.8rem">
            <a class="btn btn-primary btn-lg" href="#/browse">Find food near me ${icon('arrow', 15)}</a>
            <a class="btn btn-outline btn-lg" href="#/signup">I have surplus to give</a>
          </div>
        </div>
      </div>

      <div class="hero-facts">
        <div class="page">
          ${FACTS.map((f) => `<span class="eyebrow no-rule">${esc(f)}</span>`).join('')}
        </div>
      </div>
    </section>`
}

function problemSection() {
  return `
    <section class="section page" id="problem">
      <div class="grid cols-2" style="gap:3.5rem">
        <div class="fade-up">
          <p class="eyebrow">The problem we picked</p>
          <h2 class="display h-lg" style="margin-top:1.2rem">
            The food is not missing.<br>
            <span class="display-it gold glow-gold">It is in the wrong place.</span>
          </h2>
        </div>
        <div class="fade-up stack" style="gap:1.4rem">
          <p class="lede">
            Sri Lanka does not have a food shortage at closing time — it has a
            distribution problem that lasts about an hour. A bakery in Nugegoda bins
            trays of buns at 8pm. A hotel in Colombo 3 clears a lunch buffet at 3pm.
            A pola stall in Dehiwala dumps a crate of vegetables that were simply not
            pretty enough for tomorrow.
          </p>
          <p class="lede">
            Meanwhile, the 2023 cost-of-living squeeze pushed a quarter of households
            into cutting portions, and community kitchens and elders’ homes run on
            whatever they are given that week. The two sides are often a kilometre
            apart and have no way to find each other in the twenty minutes that matter.
          </p>
          <p class="lede">
            ZeroBin is that connection, and nothing else. It is deliberately small:
            post, find, claim, collect, count.
          </p>
          <a class="btn btn-outline" style="align-self:flex-start" href="#/about">
            Read the full problem statement ${icon('arrow', 15)}
          </a>
        </div>
      </div>
    </section>`
}

function stepsSection() {
  return `
    <section class="section band">
      <div class="page">
        <div class="fade-up" style="max-width:44ch">
          <p class="eyebrow">How it works</p>
          <h2 class="display h-lg" style="margin-top:1.2rem">
            Four steps, and each one <span class="display-it gold glow-gold">hands off to the next.</span>
          </h2>
        </div>
        <div class="grid cols-4" style="margin-top:3.5rem;gap:1.25rem">
          ${STEPS.map(
            (s, i) => `
            <article class="card card-pad fade-up" style="transition-delay:${i * 70}ms">
              <div class="row between" style="align-items:flex-start">
                <span class="step-num">${s.n}</span>
                <span class="gold">${icon(s.icon, 18)}</span>
              </div>
              <h3 class="display" style="font-size:1.5rem;margin-top:1rem">${esc(s.t)}</h3>
              <p class="small dim" style="margin-top:.7rem;line-height:1.7">${esc(s.d)}</p>
            </article>`,
          ).join('')}
        </div>
      </div>
    </section>`
}

function liveSection() {
  return `
    <section class="section page" id="live">
      <div class="spread fade-up">
        <div>
          <p class="eyebrow">Available right now</p>
          <h2 class="display h-lg" style="margin-top:1.2rem;max-width:14ch">
            Food that is <span class="display-it gold glow-gold">still warm.</span>
          </h2>
        </div>
        <a class="btn btn-outline" href="#/browse">See everything nearby ${icon('arrow', 15)}</a>
      </div>
      <div class="grid cols-3" style="margin-top:2.5rem" id="home-live"></div>
    </section>`
}

function numbersSection() {
  return `
    <section class="section" id="numbers">
      <div class="page">
        <p class="eyebrow fade-up">Counted from real pickups — every meal traceable to a collection</p>
        <div id="home-numbers" style="margin-top:3rem"></div>
      </div>
    </section>`
}

function ctaSection() {
  return `
    <section class="section page" style="text-align:center">
      <span class="dot-gold flicker" style="margin:0 auto 1.6rem;display:block;width:.5rem;height:.5rem"></span>
      <h2 class="display h-lg fade-up" style="max-width:20ch;margin:0 auto">
        A bin is a decision. <span class="display-it gold glow-gold">Make a different one.</span>
      </h2>
      <div class="row row-wrap fade-up" style="justify-content:center;margin-top:2.2rem;gap:.8rem">
        <a class="btn btn-primary btn-lg" href="#/signup">Create a free account</a>
        <a class="btn btn-outline btn-lg" href="#/browse">Just browse what is out there</a>
      </div>
    </section>`
}

/* --------------------------------- wiring --------------------------------- */

export function after(root) {
  const hero = root.querySelector('#hero')
  const stopSpot = wireSpotlight(root)

  // Reveal the masked hero lines once the fonts have settled.
  requestAnimationFrame(() => hero?.classList.add('ready'))

  const paint = () => paintData(root)
  paint()
  const unsub = subscribe(paint)

  return () => {
    unsub()
    stopSpot()
  }
}

/**
 * The hero photograph sits dimmed; a soft radial mask follows the pointer and
 * reveals it at full strength. With no pointer — touch, or an idle desktop — it
 * drifts on its own, so the effect is never invisible.
 */
function wireSpotlight(root) {
  const el = root.querySelector('#hero-spot')
  if (!el) return () => {}
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.style.maskImage = 'none'
    return () => {}
  }

  const p = { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4, hasMouse: false }
  let raf
  let t = 0

  const onMove = (e) => {
    p.hasMouse = true
    p.tx = e.clientX / window.innerWidth
    p.ty = e.clientY / window.innerHeight
  }
  window.addEventListener('mousemove', onMove, { passive: true })

  const tick = () => {
    t += 0.008
    if (!p.hasMouse) {
      p.tx = 0.5 + Math.cos(t) * 0.22
      p.ty = 0.42 + Math.sin(t * 1.4) * 0.16
    }
    p.x += (p.tx - p.x) * 0.07
    p.y += (p.ty - p.y) * 0.07
    const mask = `radial-gradient(circle 340px at ${(p.x * 100).toFixed(2)}% ${(p.y * 100).toFixed(2)}%, rgba(0,0,0,1) 0%, rgba(0,0,0,.55) 45%, transparent 72%)`
    el.style.maskImage = mask
    el.style.webkitMaskImage = mask
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return () => {
    window.removeEventListener('mousemove', onMove)
    cancelAnimationFrame(raf)
  }
}

function paintData(root) {
  const { listings, place, now, loading } = state

  /* live strip — the three closest items still open */
  const live = listings
    .filter((l) => effectiveStatus(l, now) === 'available')
    .map((l) => ({ l, km: distanceKm(place, l) ?? Infinity }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 3)

  const liveBox = root.querySelector('#home-live')
  if (liveBox) {
    liveBox.innerHTML = loading
      ? '<p class="small mute">Loading what is available…</p>'
      : live.length
        ? live.map(({ l }) => listingCard(l, { place, now })).join('')
        : `<p class="small mute">Nothing is open right now. New listings usually appear between 5pm and 9pm.</p>`
  }

  /* headline numbers */
  const s = summarise(listings, now)
  const numbersBox = root.querySelector('#home-numbers')
  if (numbersBox) {
    numbersBox.innerHTML = `
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr));gap:2.5rem;align-items:end">
        <div style="grid-column:span 2;min-width:0">
          <p class="display gold glow-gold" style="font-size:clamp(4.5rem,16vw,11rem);line-height:.85">${num(s.meals)}</p>
          <p class="dim" style="margin-top:.6rem;max-width:26ch">meals collected instead of binned, across every shop on ZeroBin</p>
        </div>
        ${[
          [s.pickups, 'completed pickups, each one confirmed at the counter'],
          [s.businesses, 'shops and kitchens posting their surplus'],
          [Math.round(s.co2e), 'kg of CO₂e kept out of the air'],
        ]
          .map(
            ([v, label]) => `<div>
              <p class="display" style="font-size:clamp(2.6rem,7vw,4rem);line-height:1">${num(v)}</p>
              <p class="small mute" style="margin-top:.5rem;max-width:22ch;line-height:1.5">${esc(label)}</p>
            </div>`,
          )
          .join('')}
      </div>`
  }

}
