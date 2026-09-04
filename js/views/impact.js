/**
 * Feature 4 — Impact dashboard.
 *
 * Both charts are single-series, so they use one hue (--chart, contrast-checked
 * against the surface in both themes), carry no legend — the title above each
 * one already names what is plotted — and direct-label only the largest bar.
 * Every chart is followed by the same numbers as a table, so nothing is locked
 * behind a hover and the figures can be read on a phone or by a screen reader.
 *
 * Nothing here is stored as a running total. Every number is recomputed from
 * the pickups themselves, so any figure can be traced back to the collections
 * that produced it.
 */

import { barList, columnChart, dataTable, esc, icon, statTile, wireCharts } from '../ui.js'
import { CO2E_PER_KG, KG_PER_MEAL, num } from '../lib/format.js'
import {
  categorySeries, dailySeries, personalStats, summarise, topBusinesses, townSeries,
} from '../lib/stats.js'
import { state, subscribe } from '../store.js'

export function render() {
  return `
    <header class="page-header">
      <div class="page">
        <p class="eyebrow crumb"><a href="#/">ZeroBin</a> <span style="opacity:.4">/</span> Impact</p>
        <h1 class="display h-xl" style="max-width:15ch">
          Proof it was <span class="display-it gold glow-gold">actually eaten.</span>
        </h1>
        <p class="lede" style="margin-top:1.2rem">
          A meal only counts here once a shop has confirmed somebody collected it.
          Food that was posted and never claimed is counted separately, as a miss —
          because that is the number worth reducing.
        </p>
      </div>
    </header>

    <div class="page view-pad" style="padding-top:2.5rem">
      <div id="impact-hero"></div>
      <div class="grid cols-4" id="impact-stats" style="margin-top:2rem"></div>
      <div id="impact-personal" style="margin-top:1.5rem"></div>

      <div class="grid split-2" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:1.5rem;margin-top:1.5rem">
        <section class="card card-pad">
          <p class="stat-label">Meals rescued per day</p>
          <p class="xsmall mute" style="margin-top:.25rem">Last 30 days · one bar is one day’s confirmed collections</p>
          <div id="chart-daily" style="margin-top:1.2rem"></div>
          <details style="margin-top:1rem">
            <summary class="xsmall mute" style="cursor:pointer">Show these numbers as a table</summary>
            <div style="margin-top:.8rem;max-height:16rem;overflow:auto" id="table-daily"></div>
          </details>
        </section>

        <section class="card card-pad">
          <p class="stat-label">What kind of food gets rescued</p>
          <p class="xsmall mute" style="margin-top:.25rem">Meals collected, by category</p>
          <div id="chart-cats" style="margin-top:1.2rem"></div>
          <details style="margin-top:1rem">
            <summary class="xsmall mute" style="cursor:pointer">Show these numbers as a table</summary>
            <div style="margin-top:.8rem" id="table-cats"></div>
          </details>
        </section>
      </div>

      <div class="grid split-2" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1.5rem;margin-top:1.5rem">
        <section class="card card-pad">
          <p class="stat-label">Shops rescuing the most</p>
          <p class="xsmall mute" style="margin-top:.25rem">Meals collected from each shop</p>
          <div id="chart-shops" style="margin-top:1.2rem"></div>
        </section>
        <section class="card card-pad">
          <p class="stat-label">Where it is happening</p>
          <p class="xsmall mute" style="margin-top:.25rem">Meals collected, by town</p>
          <div id="chart-towns" style="margin-top:1.2rem"></div>
        </section>
      </div>

      <section class="card card-pad" style="margin-top:1.5rem">
        <p class="eyebrow no-rule mute" style="margin-bottom:.9rem">How these numbers are worked out</p>
        <div class="grid cols-2" style="gap:1.5rem">
          <p class="small dim" style="line-height:1.8">
            <b class="gold">Meals rescued</b> is the sum of the portions on every listing a
            shop confirmed as collected. A listing that was posted but never claimed adds
            nothing — the food was only saved if somebody actually took it.
          </p>
          <p class="small dim" style="line-height:1.8">
            <b class="gold">Weight and CO₂e</b> are conversions, not measurements:
            ${KG_PER_MEAL} kg of food per portion, and ${CO2E_PER_KG} kg CO₂e avoided per kg of
            food not wasted. They are stated here so the figures can be checked rather
            than taken on trust.
          </p>
        </div>
      </section>
    </div>`
}

export function after(root) {
  const paint = () => paintAll(root)
  paint()
  return subscribe(paint)
}

function paintAll(root) {
  const { listings, now, user } = state
  const s = summarise(listings, now)

  /* ---- hero figure ---- */
  root.querySelector('#impact-hero').innerHTML = `
    <div class="card card-pad" style="padding:2.2rem">
      <div class="spread">
        <div>
          <p class="stat-label">Meals rescued on ZeroBin, all time</p>
          <p class="hero-figure gold" style="margin-top:.5rem">${num(s.meals)}</p>
          <p class="small dim" style="margin-top:.7rem;max-width:44ch;line-height:1.7">
            That is ${num(Math.round(s.kg))} kg of food kept out of a bin, and about
            ${num(Math.round(s.co2e))} kg of CO₂e that was never released — across
            ${num(s.businesses)} shops in ${num(s.towns)} towns.
          </p>
        </div>
        <div class="stack-sm" style="min-width:min(100%,14rem)">
          <p class="small dim">${num(s.mealsThisMonth)} meals this month</p>
          <p class="small dim">${num(s.mealsThisWeek)} in the last seven days</p>
          <p class="small dim">${s.rescueRate == null ? '—' : `${s.rescueRate}%`} of closed listings found a taker</p>
        </div>
      </div>
    </div>`

  /* ---- KPI row ---- */
  root.querySelector('#impact-stats').innerHTML = [
    statTile({ label: 'Confirmed pickups', value: num(s.pickups), sub: 'Each one verified with a code', iconName: 'check' }),
    statTile({ label: 'Food weight saved', value: `${num(Math.round(s.kg))} kg`, sub: `At ${KG_PER_MEAL} kg per portion`, iconName: 'box' }),
    statTile({ label: 'Shops taking part', value: num(s.businesses), sub: `${num(s.receivers)} people and charities collecting`, iconName: 'store' }),
    statTile({ label: 'Still went to waste', value: num(s.missedMeals), sub: `${num(s.missed)} listings closed unclaimed`, iconName: 'alert' }),
  ].join('')

  /* ---- your own impact ---- */
  const personal = personalStats(listings, user, now)
  const personalBox = root.querySelector('#impact-personal')
  personalBox.innerHTML = personal
    ? `<div class="card card-pad" style="border-color:color-mix(in srgb, var(--gold) 40%, transparent)">
         <div class="spread">
           <div>
             <p class="eyebrow no-rule">Your impact</p>
             <p class="display" style="font-size:clamp(1.6rem,3.5vw,2.4rem);margin-top:.7rem;max-width:26ch">
               You saved <span class="gold glow-gold">${num(personal.mealsThisMonth)} meals</span> this month${
                 personal.meals > personal.mealsThisMonth
                   ? ` — <span class="dim">${num(personal.meals)} in total.</span>`
                   : '.'
               }
             </p>
           </div>
           <div class="stack-sm" style="min-width:min(100%,15rem)">
             <p class="small dim">${num(personal.pickups)} ${personal.scope === 'business' ? 'listings collected from you' : 'collections made'}</p>
             <p class="small dim">${num(Math.round(personal.kg))} kg of food · ${num(Math.round(personal.co2e))} kg CO₂e</p>
             <a class="btn btn-outline btn-sm" href="${personal.scope === 'business' ? '#/business' : '#/claims'}" style="align-self:flex-start;margin-top:.4rem">
               ${personal.scope === 'business' ? 'Open my listings' : 'Open my claims'} ${icon('arrow', 14)}
             </a>
           </div>
         </div>
       </div>`
    : `<div class="card card-pad row between row-wrap" style="gap:1rem">
         <p class="small dim" style="max-width:52ch">
           Sign in to see your own line on this dashboard — how many meals you have
           personally rescued, and how much that adds up to.
         </p>
         <a class="btn btn-primary btn-sm" href="#/login">Sign in</a>
       </div>`

  /* ---- charts ---- */
  const daily = dailySeries(listings, 30, now)
  root.querySelector('#chart-daily').innerHTML = columnChart(daily, { unit: 'meals' })
  root.querySelector('#table-daily').innerHTML = dataTable(
    ['Day', 'Meals', 'Pickups'],
    [...daily].reverse().map((d) => [d.label, num(d.meals), num(d.pickups)]),
  )

  const cats = categorySeries(listings)
  root.querySelector('#chart-cats').innerHTML = cats.length
    ? barList(cats.map((c) => ({ label: `${c.emoji} ${c.label}`, value: c.meals })), { unit: 'meals' })
    : '<p class="small mute">No collections yet.</p>'
  root.querySelector('#table-cats').innerHTML = dataTable(
    ['Category', 'Meals'],
    cats.map((c) => [c.label, num(c.meals)]),
  )

  const shops = topBusinesses(listings, 6)
  root.querySelector('#chart-shops').innerHTML = shops.length
    ? barList(
        shops.map((b) => ({ label: b.name, value: b.meals, note: `${b.pickups} pickups · ${b.city}` })),
        { unit: 'meals' },
      )
    : '<p class="small mute">No collections yet.</p>'

  const towns = townSeries(listings, 6)
  root.querySelector('#chart-towns').innerHTML = towns.length
    ? barList(towns.map((t) => ({ label: t.city, value: t.meals })), { unit: 'meals' })
    : '<p class="small mute">No collections yet.</p>'

  wireCharts(root)
}
