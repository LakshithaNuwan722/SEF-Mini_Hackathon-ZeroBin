/**
 * The in-app explanation of the Sri Lankan problem, and how the app answers it.
 *
 * @author IT24100732 (Member 4)
 *
 * The assignment asks for this to live inside the product rather than only in a
 * README, so it is a real page with real navigation, not a footer note.
 */

import { esc, icon, statTile } from '../ui.js'
import { num } from '../lib/format.js'
import { summarise } from '../lib/stats.js'
import { state, subscribe } from '../store.js'

const AFFECTED = [
  {
    who: 'The bakery on the main road',
    what: 'Bakes to demand and still has three trays at 8pm. Throwing it out costs money and feels wrong, but there is no time to find anyone before the shutter comes down.',
    icon: 'store',
  },
  {
    who: 'The family two streets away',
    what: 'Has cut portions since prices rose. They would happily collect food that is still good, but nobody tells them it exists.',
    icon: 'users',
  },
  {
    who: 'The community kitchen',
    what: 'Feeds forty people a day on donations. It can absorb a whole buffet tray at short notice — if it hears about it in time.',
    icon: 'leaf',
  },
]

export function render() {
  return `
    <header class="page-header">
      <div class="page">
        <p class="eyebrow crumb"><a href="#/">ZeroBin</a> <span style="opacity:.4">/</span> The problem</p>
        <h1 class="display h-xl" style="max-width:16ch">
          A distribution problem that lasts <span class="display-it gold glow-gold">one hour.</span>
        </h1>
        <p class="lede" style="margin-top:1.2rem">
          Food waste in Sri Lanka is usually described in national tonnage. That framing
          is true, and useless to a shop owner at closing time. Up close it is a much
          smaller, much more fixable problem.
        </p>
      </div>
    </header>

    <div class="page view-pad" style="padding-top:3rem">
      <section class="grid cols-2" style="gap:3rem">
        <div>
          <p class="eyebrow">What is actually happening</p>
          <div class="stack" style="gap:1.2rem;margin-top:1.4rem">
            <p class="lede">
              Roughly a third of the food produced in Sri Lanka is never eaten. A large
              share of that is not spoiled — it is surplus: correctly cooked, correctly
              stored, and simply not sold before the shutter came down.
            </p>
            <p class="lede">
              At the same time, the cost-of-living pressure that began in 2022 pushed a
              large share of households into buying less and eating smaller portions.
              Community kitchens, elders’ homes and night shelters run week to week on
              whatever they are given.
            </p>
            <p class="lede">
              These two facts sit within walking distance of each other, several times a
              day, in every town in the country. What is missing is not food and not
              goodwill — it is a way for one side to tell the other, in the twenty
              minutes before the food stops being safe to give away.
            </p>
          </div>
        </div>

        <div>
          <p class="eyebrow">Who it affects</p>
          <div class="stack" style="gap:1rem;margin-top:1.4rem">
            ${AFFECTED.map(
              (a) => `<article class="card card-pad">
                  <p class="row" style="gap:.6rem;font-weight:600">
                    <span class="gold">${icon(a.icon, 16)}</span> ${esc(a.who)}
                  </p>
                  <p class="small dim" style="margin-top:.6rem;line-height:1.75">${esc(a.what)}</p>
                </article>`,
            ).join('')}
          </div>
        </div>
      </section>

      <section class="section-tight" style="margin-top:2rem">
        <p class="eyebrow">Our answer, and its limits</p>
        <div class="grid cols-2" style="gap:2.5rem;margin-top:1.4rem">
          <p class="lede">
            ZeroBin does one thing: it makes surplus food visible to the people closest
            to it, for as long as it is safe to collect, and it makes sure two people
            never travel for the same bag. A claim is atomic — the first tap wins and
            the item vanishes from everybody else’s list — because a wasted trip across
            Colombo is the fastest way to lose someone’s trust.
          </p>
          <p class="lede">
            It is deliberately not a delivery service, a payment platform or a food-safety
            regulator. The shop decides what is safe to give and until when; the collector
            decides whether to come. We keep the record honest by only counting a meal
            once the shop has confirmed the pickup code at the counter.
          </p>
        </div>
      </section>

      <section style="margin-top:1rem">
        <p class="eyebrow" style="margin-bottom:1.2rem">Where it stands today</p>
        <div class="grid cols-4" id="about-stats"></div>
      </section>

      <section class="card card-pad" style="margin-top:2rem;text-align:center;padding:3rem 1.5rem">
        <p class="display h-md" style="max-width:24ch;margin:0 auto">
          The food is already made. <span class="display-it gold glow-gold">Someone may as well eat it.</span>
        </p>
        <div class="row row-wrap" style="justify-content:center;gap:.7rem;margin-top:1.8rem">
          <a class="btn btn-primary btn-lg" href="#/browse">Find food nearby</a>
          <a class="btn btn-outline btn-lg" href="#/signup">List your surplus</a>
        </div>
      </section>
    </div>`
}

export function after(root) {
  const paint = () => {
    const s = summarise(state.listings, state.now)
    const box = root.querySelector('#about-stats')
    if (!box) return
    box.innerHTML = [
      statTile({ label: 'Meals rescued', value: num(s.meals), sub: 'Confirmed at a counter', iconName: 'leaf' }),
      statTile({ label: 'Shops posting', value: num(s.businesses), sub: `across ${num(s.towns)} towns`, iconName: 'store' }),
      statTile({ label: 'Available right now', value: num(s.livePortions), sub: `${num(s.liveCount)} open listings`, iconName: 'box' }),
      statTile({ label: 'Still binned', value: num(s.missedMeals), sub: 'Posted, but nobody claimed it', iconName: 'alert' }),
    ].join('')
  }
  paint()
  return subscribe(paint)
}
