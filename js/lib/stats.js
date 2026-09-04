/**
 * Impact maths.
 *
 * Every number the dashboard shows is derived here from the listing records
 * themselves — nothing is stored as a running total, so a figure can always be
 * traced back to the pickups that produced it.
 *
 * "Meals rescued" counts portions on listings that reached `picked_up`. A
 * listing that was posted but never collected contributes nothing, which is the
 * honest reading: the food was only saved if somebody actually took it.
 */

import { CATEGORIES, categoryOf, effectiveStatus, mealsToCo2e, mealsToKg } from './format.js'

const DAY = 86400_000

function startOfDay(ms) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const collected = (l) => l.status === 'picked_up'
const portionsOf = (l) => Number(l.portions) || 0
const collectedAt = (l) => Number(l.pickedUpAt || l.updatedAt || l.pickupEnd || l.createdAt)

/** Headline totals across every listing passed in. */
export function summarise(listings = [], now = Date.now()) {
  const done = listings.filter(collected)
  const meals = done.reduce((sum, l) => sum + portionsOf(l), 0)

  const monthStart = new Date(now)
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const thisMonth = done.filter((l) => collectedAt(l) >= monthStart.getTime())
  const weekAgo = now - 7 * DAY
  const thisWeek = done.filter((l) => collectedAt(l) >= weekAgo)

  const live = listings.filter((l) => effectiveStatus(l, now) === 'available')
  const reserved = listings.filter((l) => effectiveStatus(l, now) === 'claimed')

  // A listing that closed without ever being claimed is the miss we want to see.
  const missed = listings.filter(
    (l) => l.status === 'available' && Number(l.pickupEnd) <= now,
  )
  const finished = done.length + missed.length

  return {
    meals,
    pickups: done.length,
    kg: mealsToKg(meals),
    co2e: mealsToCo2e(meals),
    mealsThisMonth: thisMonth.reduce((s, l) => s + portionsOf(l), 0),
    pickupsThisMonth: thisMonth.length,
    mealsThisWeek: thisWeek.reduce((s, l) => s + portionsOf(l), 0),
    liveCount: live.length,
    livePortions: live.reduce((s, l) => s + portionsOf(l), 0),
    reservedCount: reserved.length,
    businesses: new Set(listings.map((l) => l.businessId).filter(Boolean)).size,
    receivers: new Set(done.map((l) => l.claimedBy).filter(Boolean)).size,
    towns: new Set(listings.map((l) => l.city).filter(Boolean)).size,
    /** Share of finished listings that actually found a taker. */
    rescueRate: finished ? Math.round((done.length / finished) * 100) : null,
    missed: missed.length,
    missedMeals: missed.reduce((s, l) => s + portionsOf(l), 0),
  }
}

/** Meals collected per day for the last `days` days, oldest first. */
export function dailySeries(listings = [], days = 14, now = Date.now()) {
  const today = startOfDay(now)
  const buckets = new Map()
  for (let i = days - 1; i >= 0; i -= 1) {
    buckets.set(today - i * DAY, { meals: 0, pickups: 0 })
  }
  for (const l of listings) {
    if (!collected(l)) continue
    const key = startOfDay(collectedAt(l))
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.meals += portionsOf(l)
    bucket.pickups += 1
  }
  return [...buckets.entries()].map(([ms, v]) => ({
    ms,
    label: new Date(ms).toLocaleDateString('en-LK', { day: 'numeric', month: 'short' }),
    short: new Date(ms).toLocaleDateString('en-LK', { weekday: 'narrow' }),
    ...v,
  }))
}

/** Meals collected per food category, biggest first, zero categories dropped. */
export function categorySeries(listings = []) {
  const totals = new Map(CATEGORIES.map((c) => [c.id, 0]))
  for (const l of listings) {
    if (!collected(l)) continue
    const id = totals.has(l.category) ? l.category : 'other'
    totals.set(id, totals.get(id) + portionsOf(l))
  }
  return [...totals.entries()]
    .filter(([, meals]) => meals > 0)
    .map(([id, meals]) => ({ id, meals, ...categoryOf(id) }))
    .sort((a, b) => b.meals - a.meals)
}

/** Shops ranked by meals rescued. */
export function topBusinesses(listings = [], limit = 5) {
  const totals = new Map()
  for (const l of listings) {
    if (!collected(l)) continue
    const key = l.businessId || l.businessName
    const row = totals.get(key) || { name: l.businessName, city: l.city, meals: 0, pickups: 0 }
    row.meals += portionsOf(l)
    row.pickups += 1
    totals.set(key, row)
  }
  return [...totals.values()].sort((a, b) => b.meals - a.meals).slice(0, limit)
}

/** Meals rescued per town, biggest first. */
export function townSeries(listings = [], limit = 6) {
  const totals = new Map()
  for (const l of listings) {
    if (!collected(l)) continue
    totals.set(l.city, (totals.get(l.city) || 0) + portionsOf(l))
  }
  return [...totals.entries()]
    .map(([city, meals]) => ({ city, meals }))
    .sort((a, b) => b.meals - a.meals)
    .slice(0, limit)
}

/** Everything scoped to one account — powers the "your impact" panels. */
export function personalStats(listings = [], user, now = Date.now()) {
  if (!user) return null
  if (user.role === 'business') {
    const mine = listings.filter((l) => l.businessId === user.uid)
    return { ...summarise(mine, now), scope: 'business', listings: mine }
  }
  const mine = listings.filter((l) => l.claimedBy === user.uid)
  return { ...summarise(mine, now), scope: 'receiver', listings: mine }
}
