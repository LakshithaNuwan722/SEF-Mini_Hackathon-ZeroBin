/**
 * Location helpers.
 *
 * ZeroBin is a "what is near me right now" app, so distance is the single most
 * important sort key on the browse screen. We keep this deliberately simple:
 * every listing carries a lat/lng, the receiver either shares their browser
 * location or picks a town, and we do a great-circle distance between the two.
 * No maps SDK, no API key, no billing.
 */

/** Towns and suburbs we support as a manual location fallback. */
export const SRI_LANKA_PLACES = [
  { name: 'Colombo', district: 'Colombo', lat: 6.9271, lng: 79.8612 },
  { name: 'Dehiwala', district: 'Colombo', lat: 6.8511, lng: 79.8653 },
  { name: 'Nugegoda', district: 'Colombo', lat: 6.8649, lng: 79.8997 },
  { name: 'Mount Lavinia', district: 'Colombo', lat: 6.8389, lng: 79.8653 },
  { name: 'Maharagama', district: 'Colombo', lat: 6.8462, lng: 79.9265 },
  { name: 'Moratuwa', district: 'Colombo', lat: 6.773, lng: 79.8816 },
  { name: 'Sri Jayawardenepura Kotte', district: 'Colombo', lat: 6.8905, lng: 79.902 },
  { name: 'Kelaniya', district: 'Gampaha', lat: 6.9553, lng: 79.9219 },
  { name: 'Gampaha', district: 'Gampaha', lat: 7.0917, lng: 79.9994 },
  { name: 'Negombo', district: 'Gampaha', lat: 7.2083, lng: 79.8358 },
  { name: 'Kandy', district: 'Kandy', lat: 7.2906, lng: 80.6337 },
  { name: 'Peradeniya', district: 'Kandy', lat: 7.2599, lng: 80.5977 },
  { name: 'Nuwara Eliya', district: 'Nuwara Eliya', lat: 6.9497, lng: 80.7891 },
  { name: 'Galle', district: 'Galle', lat: 6.0535, lng: 80.221 },
  { name: 'Matara', district: 'Matara', lat: 5.9549, lng: 80.555 },
  { name: 'Kurunegala', district: 'Kurunegala', lat: 7.4863, lng: 80.3647 },
  { name: 'Ratnapura', district: 'Ratnapura', lat: 6.6828, lng: 80.3992 },
  { name: 'Badulla', district: 'Badulla', lat: 6.9934, lng: 81.055 },
  { name: 'Anuradhapura', district: 'Anuradhapura', lat: 8.3114, lng: 80.4037 },
  { name: 'Trincomalee', district: 'Trincomalee', lat: 8.5874, lng: 81.2152 },
  { name: 'Batticaloa', district: 'Batticaloa', lat: 7.717, lng: 81.7 },
  { name: 'Jaffna', district: 'Jaffna', lat: 9.6615, lng: 80.0255 },
]

export const DEFAULT_PLACE = SRI_LANKA_PLACES[0]

export function findPlace(name) {
  return SRI_LANKA_PLACES.find((p) => p.name === name) || null
}

const R_KM = 6371

/** Great-circle distance in kilometres between two {lat, lng} points. */
export function distanceKm(a, b) {
  if (!a || !b) return null
  if (
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(b.lat) ||
    !Number.isFinite(b.lng)
  ) {
    return null
  }
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** "700 m away" / "1.4 km away" / "12 km away" */
export function formatDistance(km) {
  if (km == null || !Number.isFinite(km)) return null
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m away`
  if (km < 10) return `${km.toFixed(1)} km away`
  return `${Math.round(km)} km away`
}

/** Rough walking/tuk-tuk time, used as a friendly secondary hint. */
export function travelHint(km) {
  if (km == null || !Number.isFinite(km)) return null
  if (km < 1.2) return `about ${Math.max(3, Math.round((km / 5) * 60))} min on foot`
  return `about ${Math.max(4, Math.round((km / 22) * 60))} min by tuk-tuk`
}

/**
 * Ask the browser where the user is. Resolves to null rather than rejecting —
 * a denied permission is a normal outcome here, not an error to shout about.
 */
export function requestBrowserLocation({ timeout = 8000 } = {}) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Your current location',
          source: 'gps',
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout, maximumAge: 5 * 60 * 1000 },
    )
  })
}
