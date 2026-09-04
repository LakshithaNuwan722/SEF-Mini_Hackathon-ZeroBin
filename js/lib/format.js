/**
 * Formatting, validation and the small shared vocabularies (categories,
 * statuses) that both the business side and the receiver side speak.
 *
 * Every validator returns either `null` (valid) or a short, human sentence.
 * They are written to be readable by a stressed shop owner at 8pm, not by a
 * developer — so no "invalid input", ever.
 */

export const CATEGORIES = [
  { id: 'bakery', label: 'Bakery & bread', emoji: '🥖' },
  { id: 'short-eats', label: 'Short eats', emoji: '🥟' },
  { id: 'rice-curry', label: 'Rice & curry', emoji: '🍛' },
  { id: 'prepared', label: 'Prepared meals', emoji: '🍱' },
  { id: 'produce', label: 'Fruit & vegetables', emoji: '🥬' },
  { id: 'dairy', label: 'Dairy & drinks', emoji: '🥛' },
  { id: 'sweets', label: 'Sweets & desserts', emoji: '🍮' },
  { id: 'other', label: 'Other', emoji: '🍽️' },
]

export function categoryOf(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]
}

export const DIET_TAGS = [
  { id: 'veg', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'halal', label: 'Halal' },
  { id: 'contains-nuts', label: 'Contains nuts' },
  { id: 'contains-dairy', label: 'Contains dairy' },
  { id: 'spicy', label: 'Spicy' },
]

export function dietLabel(id) {
  return DIET_TAGS.find((d) => d.id === id)?.label || id
}

export const STATUS = {
  available: { label: 'Available', tone: 'ok' },
  claimed: { label: 'Reserved', tone: 'warn' },
  picked_up: { label: 'Picked up', tone: 'info' },
  expired: { label: 'Expired', tone: 'mute' },
  cancelled: { label: 'Cancelled', tone: 'mute' },
}

/* --------------------------------------------------------------------------
   Time
   -------------------------------------------------------------------------- */

/** A listing is only really "available" while its pickup window is still open. */
export function isExpired(listing, now = Date.now()) {
  return Number(listing?.pickupEnd) <= now
}

export function effectiveStatus(listing, now = Date.now()) {
  if (!listing) return 'expired'
  if (listing.status === 'available' && isExpired(listing, now)) return 'expired'
  return listing.status
}

const TIME_FMT = { hour: 'numeric', minute: '2-digit', hour12: true }

export function formatTime(ms) {
  if (!ms) return ''
  return new Date(Number(ms)).toLocaleTimeString('en-LK', TIME_FMT)
}

export function formatDate(ms) {
  if (!ms) return ''
  return new Date(Number(ms)).toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** "Today, 6:30 PM – 8:00 PM" / "Tomorrow, 7:00 AM – 9:00 AM" */
export function formatWindow(start, end) {
  if (!start || !end) return ''
  const s = new Date(Number(start))
  const day = dayWord(s)
  return `${day}, ${formatTime(start)} – ${formatTime(end)}`
}

function dayWord(date) {
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.floor((date - startOfToday) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  return date.toLocaleDateString('en-LK', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** "Closes in 1h 20m" — the urgency line that makes people act. */
export function countdown(endMs, now = Date.now()) {
  const ms = Number(endMs) - now
  if (ms <= 0) return { text: 'Window closed', urgent: false, over: true }
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return { text: `Closes in ${mins} min`, urgent: mins <= 45, over: false }
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  if (hrs < 24) {
    return { text: `Closes in ${hrs}h${rem ? ` ${rem}m` : ''}`, urgent: false, over: false }
  }
  return { text: `Closes in ${Math.floor(hrs / 24)} days`, urgent: false, over: false }
}

export function timeAgo(ms, now = Date.now()) {
  const diff = now - Number(ms)
  if (!Number.isFinite(diff)) return ''
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(ms)
}

/** `datetime-local` inputs speak local wall-clock strings, not epoch ms. */
export function msToLocalInput(ms) {
  if (!ms) return ''
  const d = new Date(Number(ms))
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

export function localInputToMs(value) {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

/* --------------------------------------------------------------------------
   Numbers
   -------------------------------------------------------------------------- */

export function compact(n) {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 10_000) return `${Math.round(v / 1000)}K`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return String(Math.round(v))
}

export function num(n) {
  return (Number(n) || 0).toLocaleString('en-LK')
}

/**
 * Environmental conversion factors, so the impact page states something real
 * rather than a made-up score.
 *   - 0.42 kg of food per rescued portion (FAO "avg. served portion" band)
 *   - 2.5 kg CO2e avoided per kg of food not wasted (WRAP food-waste factor)
 * Both are stated on the page itself so the number can be checked.
 */
export const KG_PER_MEAL = 0.42
export const CO2E_PER_KG = 2.5

export function mealsToKg(meals) {
  return (Number(meals) || 0) * KG_PER_MEAL
}
export function mealsToCo2e(meals) {
  return mealsToKg(meals) * CO2E_PER_KG
}

/* --------------------------------------------------------------------------
   Validation — every message is a full, friendly sentence
   -------------------------------------------------------------------------- */

export function validateRequired(value, field = 'This field') {
  return String(value ?? '').trim() ? null : `${field} is required.`
}

export function validateEmail(value) {
  const v = String(value ?? '').trim()
  if (!v) return 'Enter your email address.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
    return 'That does not look like an email address — check for a typo.'
  }
  return null
}

export function validatePassword(value) {
  const v = String(value ?? '')
  if (!v) return 'Choose a password.'
  if (v.length < 6) return 'Use at least 6 characters so the account stays safe.'
  return null
}

export function validateName(value, field = 'Name') {
  const v = String(value ?? '').trim()
  if (!v) return `${field} is required.`
  if (v.length < 2) return `${field} looks too short.`
  if (v.length > 80) return `${field} must be under 80 characters.`
  return null
}

/** Sri Lankan mobile/landline: 07XXXXXXXX, 011XXXXXXX, +947XXXXXXXX. */
export function validatePhone(value) {
  const v = String(value ?? '').replace(/[\s-]/g, '')
  if (!v) return 'A phone number is required so people can reach the shop.'
  if (!/^(?:\+94|0)\d{9}$/.test(v)) {
    return 'Use a Sri Lankan number, like 0771234567 or +94771234567.'
  }
  return null
}

export function validatePortions(value) {
  const v = Number(value)
  if (value === '' || value == null) return 'How many portions are left?'
  if (!Number.isInteger(v)) return 'Portions must be a whole number.'
  if (v < 1) return 'There has to be at least 1 portion to share.'
  if (v > 500) return 'That is a lot — please split it into a few smaller posts (max 500).'
  return null
}

export function validateImageUrl(value, { required = false } = {}) {
  const v = String(value ?? '').trim()
  if (!v) return required ? 'Paste a link to a photo of the food.' : null
  if (!/^https?:\/\/\S+$/i.test(v)) {
    return 'Paste a full image link that starts with https://'
  }
  return null
}

export function validateWindow(startMs, endMs, now = Date.now()) {
  if (!startMs) return { start: 'Choose when pickup can start.' }
  if (!endMs) return { end: 'Choose the latest pickup time.' }
  if (endMs <= startMs) return { end: 'The closing time must be after the start time.' }
  if (endMs <= now) return { end: 'That time has already passed — pick a time later today.' }
  if (endMs - startMs > 3 * 86400000) {
    return { end: 'Keep the window under 3 days so the food stays safe to eat.' }
  }
  return {}
}

export function validateText(value, { field = 'This', min = 0, max = 400 } = {}) {
  const v = String(value ?? '').trim()
  if (min && v.length < min) return `${field} needs at least ${min} characters.`
  if (v.length > max) return `${field} must be under ${max} characters.`
  return null
}

/** Strips empty values out of an errors object so `hasErrors` is trivial. */
export function clean(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => Boolean(v)))
}

export function hasErrors(errors) {
  return Object.values(errors || {}).some(Boolean)
}

/* --------------------------------------------------------------------------
   Misc
   -------------------------------------------------------------------------- */

/** Pickup codes skip 0/O/1/I so nobody misreads one out loud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makePickupCode() {
  let out = ''
  for (let i = 0; i < 6; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return `${out.slice(0, 3)}-${out.slice(3)}`
}

export function normaliseCode(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export function titleCase(s) {
  return String(s ?? '').replace(/\b\w/g, (c) => c.toUpperCase())
}
