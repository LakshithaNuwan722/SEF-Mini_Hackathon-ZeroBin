/**
 * Starter data for ZeroBin.
 *
 * Eight live listings — one for every food category the app supports — posted
 * by four shops across Colombo, Kandy and Negombo, plus five weeks of completed
 * pickups so the impact dashboard has something real to report.
 *
 * Shop names are fictional. Photos are public Unsplash links, each one checked
 * against the category it illustrates.
 *
 * Everything is generated relative to "now", so the pickup windows are always
 * open and the history always ends yesterday.
 */

import { makePickupCode } from './format.js'

const HOUR = 3600_000
const DAY = 86400_000

const img = (id, w = 900) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`

/**
 * One verified photo per category. These also populate the "use a stock photo"
 * shortcuts on the posting form.
 */
export const CATEGORY_PHOTOS = {
  bakery: img('1509440159596-0249088772ff'),      // artisan loaves
  'short-eats': img('1601050690597-df0568f70950'), // samosas
  'rice-curry': img('1743674453123-93356ade2891'), // rice with South Asian curries
  prepared: img('1546069901-ba9599a7e63c'),        // packed grain bowl
  produce: img('1512621776951-a57141f2eefd'),      // fresh vegetables
  dairy: img('1481931098730-318b6f776db0'),        // milk and yoghurt
  sweets: img('1565958011703-44f9829ba187'),       // layered dessert
  other: img('1585032226651-759b368d7246'),        // noodles / kottu
}

export const PHOTO_SUGGESTIONS = [
  { label: '🥖 Bakery', url: CATEGORY_PHOTOS.bakery },
  { label: '🥟 Short eats', url: CATEGORY_PHOTOS['short-eats'] },
  { label: '🍛 Rice & curry', url: CATEGORY_PHOTOS['rice-curry'] },
  { label: '🍱 Prepared', url: CATEGORY_PHOTOS.prepared },
  { label: '🥬 Produce', url: CATEGORY_PHOTOS.produce },
  { label: '🥛 Dairy', url: CATEGORY_PHOTOS.dairy },
  { label: '🍮 Sweets', url: CATEGORY_PHOTOS.sweets },
]

/**
 * Password used only by the one-off seeding routine to create the starter shop
 * accounts. It is never shown in the interface and is not a login anybody is
 * invited to use — real users sign up with their own email and password.
 */
export const SEED_ACCOUNT_PASSWORD = 'Zb!seed-2026-Lk'

/* -------------------------------------------------------------------------- */
/* Shops                                                                       */
/* -------------------------------------------------------------------------- */

export const SEED_SHOPS = [
  {
    key: 'araliya',
    email: 'araliya.bakehouse@zerobin.lk',
    name: 'Fathima Rizwan',
    orgName: 'Araliya Bake House',
    phone: '0771234567',
    address: '212 High Level Road, Nugegoda',
    city: 'Nugegoda',
    lat: 6.8649,
    lng: 79.8997,
  },
  {
    key: 'ceylon',
    email: 'ceylon.curry@zerobin.lk',
    name: 'Suresh Fernando',
    orgName: 'Ceylon Curry Kitchen',
    phone: '0112456789',
    address: '48 Galle Road, Colombo 03',
    city: 'Colombo',
    lat: 6.9147,
    lng: 79.8531,
  },
  {
    key: 'greenleaf',
    email: 'greenleaf.veg@zerobin.lk',
    name: 'Dilani Wickrama',
    orgName: 'Green Leaf Vegetarian',
    phone: '0112667788',
    address: '90 Nawala Road, Rajagiriya',
    city: 'Sri Jayawardenepura Kotte',
    lat: 6.9092,
    lng: 79.8944,
  },
  {
    key: 'hills',
    email: 'kandy.hills@zerobin.lk',
    name: 'Anushka Bandara',
    orgName: 'Kandy Hills Bakery',
    phone: '0812234455',
    address: '17 Dalada Veediya, Kandy',
    city: 'Kandy',
    lat: 7.2936,
    lng: 80.6357,
  },
]

const shop = (key) => {
  const s = SEED_SHOPS.find((x) => x.key === key)
  return {
    businessId: `shop-${s.key}`,
    businessName: s.orgName,
    businessPhone: s.phone,
    address: s.address,
    city: s.city,
    lat: s.lat,
    lng: s.lng,
  }
}

/* -------------------------------------------------------------------------- */
/* Live listings — exactly one per category                                    */
/* -------------------------------------------------------------------------- */

const LIVE = [
  {
    shop: 'araliya',
    category: 'bakery',
    title: 'Evening bake — kimbula banis & seeni sambol buns',
    description:
      'Baked at 4pm and still soft. Whatever is left on the rack at closing goes free rather than in the bin. Please bring a bag or a box.',
    portions: 18,
    dietary: ['veg'],
    open: -1.5,
    close: 4,
    postedAgo: 1.6,
  },
  {
    shop: 'ceylon',
    category: 'rice-curry',
    title: 'Lunch buffet surplus — rice, dhal & two curries',
    description:
      'Full hot lunch portions from the office buffet, kept in the warmer since noon. Charities welcome — call ahead and we can hold a larger amount for you.',
    portions: 26,
    dietary: ['veg', 'halal', 'spicy'],
    open: -0.5,
    close: 3,
    postedAgo: 0.7,
  },
  {
    shop: 'ceylon',
    category: 'short-eats',
    title: 'Fish cutlets, rolls & vegetable patties',
    description:
      'Short eats fried at 3pm for the afternoon crowd. About four trays left. First come, first served at the front counter.',
    portions: 32,
    dietary: ['halal'],
    open: -0.25,
    close: 2.5,
    postedAgo: 0.4,
  },
  {
    shop: 'greenleaf',
    category: 'prepared',
    title: 'Packed rice bowls — chickpea curry & gotukola',
    description:
      'Six sealed bowls: brown rice, chickpea curry, gotukola sambol and roasted pumpkin. Chilled, good until tomorrow morning.',
    portions: 6,
    dietary: ['vegan', 'veg'],
    open: -3,
    close: 5,
    postedAgo: 3.2,
  },
  {
    shop: 'greenleaf',
    category: 'produce',
    title: 'End-of-market vegetables — mixed crate',
    description:
      'Beans, brinjal, leeks and a few kilos of tomatoes. Perfectly good, just not pretty enough for tomorrow morning. Take the whole crate.',
    portions: 40,
    dietary: ['vegan', 'veg'],
    open: -2,
    close: 2,
    postedAgo: 2.1,
  },
  {
    shop: 'ceylon',
    category: 'dairy',
    title: 'Fresh milk & set yoghurt, one day from date',
    description:
      'Twelve litres of fresh milk and a tray of set yoghurt, one day from the printed date. Still perfectly fine — we simply cannot sell it tomorrow.',
    portions: 20,
    dietary: ['veg', 'contains-dairy'],
    open: -5,
    close: 4,
    postedAgo: 5.1,
  },
  {
    shop: 'araliya',
    category: 'sweets',
    title: 'Watalappan cups & butter cake slices',
    description:
      'Made fresh for a function that ordered less than expected. Keep refrigerated and eat within two days.',
    portions: 9,
    dietary: ['veg', 'contains-dairy', 'contains-nuts'],
    open: -0.75,
    close: 6,
    postedAgo: 0.9,
  },
  {
    shop: 'hills',
    category: 'other',
    title: 'Vegetable kottu — two catering trays',
    description:
      'Two large trays from a cancelled office order. Hot, sealed and ready to go. Ask for Anushka at the side counter.',
    portions: 22,
    dietary: ['veg'],
    open: -2,
    close: 3.5,
    postedAgo: 2.4,
  },
]

/* -------------------------------------------------------------------------- */
/* History — what the impact dashboard reports on                              */
/* -------------------------------------------------------------------------- */

const HISTORY_TITLES = {
  bakery: 'End-of-day bread & buns',
  'rice-curry': 'Buffet rice & curry surplus',
  'short-eats': 'Evening short eats',
  produce: 'Unsold vegetables',
  prepared: 'Packed meals',
  dairy: 'Near-date milk & curd',
  sweets: 'Desserts from a function',
  other: 'Kottu & noodles',
}

const CATS = Object.keys(HISTORY_TITLES)
const SHOP_KEYS = SEED_SHOPS.map((s) => s.key)

const RECEIVERS = [
  'Suwa Sevana Community Kitchen',
  'Sahana Elders Home',
  'Piliyandala Night Shelter',
  'Malsha Jayawardena',
  'Nimal Perera',
]

/** Deterministic pseudo-random, so the seeded history is identical every run. */
function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function history(now) {
  const rng = makeRng(20260904)
  const out = []

  for (let daysAgo = 34; daysAgo >= 1; daysAgo -= 1) {
    const date = new Date(now - daysAgo * DAY)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const growth = 1 + (34 - daysAgo) / 46 // the platform picks up over time
    const count = Math.max(1, Math.round((weekend ? 3.1 : 2.1) * growth + rng() * 2.2))

    for (let i = 0; i < count; i += 1) {
      const s = shop(SHOP_KEYS[Math.floor(rng() * SHOP_KEYS.length)])
      const category = CATS[Math.floor(rng() * CATS.length)]
      const receiver = RECEIVERS[Math.floor(rng() * RECEIVERS.length)]
      const end = new Date(date)
      end.setHours(17 + Math.floor(rng() * 4), 30, 0, 0)
      const endMs = end.getTime()

      // A realistic share of listings close with nobody collecting them. Those
      // are the misses the dashboard reports separately — hiding them would
      // make the numbers a sales pitch rather than a measurement.
      const missed = rng() < 0.14

      out.push({
        ...s,
        title: HISTORY_TITLES[category],
        description: 'Collected through ZeroBin.',
        category,
        portions: 4 + Math.floor(rng() * 26),
        dietary: [],
        imageUrl: '',
        pickupStart: endMs - 2 * HOUR,
        pickupEnd: endMs,
        status: missed ? 'available' : 'picked_up',
        claimedBy: missed ? null : `receiver-${Math.floor(rng() * 5)}`,
        claimedByName: missed ? null : receiver,
        claimCode: missed ? null : makePickupCode(),
        claimedAt: missed ? null : endMs - 80 * 60000,
        pickedUpAt: missed ? null : endMs - 20 * 60000,
        createdAt: endMs - 5 * HOUR,
        updatedAt: missed ? endMs - 5 * HOUR : endMs - 20 * 60000,
      })
    }
  }
  return out
}

/* -------------------------------------------------------------------------- */

/** Every starter listing, stamped with absolute timestamps. */
export function buildSeedListings(now = Date.now()) {
  const live = LIVE.map((t, i) => {
    const createdAt = now - t.postedAgo * HOUR
    return {
      ...shop(t.shop),
      id: `starter-${t.category}`,
      title: t.title,
      description: t.description,
      category: t.category,
      portions: t.portions,
      dietary: t.dietary,
      imageUrl: CATEGORY_PHOTOS[t.category],
      pickupStart: now + t.open * HOUR,
      pickupEnd: now + t.close * HOUR,
      status: 'available',
      claimedBy: null,
      claimedByName: null,
      claimCode: null,
      claimedAt: null,
      pickedUpAt: null,
      createdAt,
      updatedAt: createdAt,
    }
  })

  const past = history(now).map((h, i) => ({ ...h, id: `past-${i + 1}` }))
  return [...live, ...past]
}
