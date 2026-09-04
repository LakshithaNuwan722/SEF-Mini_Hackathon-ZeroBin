/**
 * The single data door for the whole app.
 *
 * If `js/firebase-config.js` has keys we talk to Firestore. If it does not, we
 * fall back to an equivalent local backend so the app still runs end to end.
 * Views import from here and never from either implementation directly, which
 * is why swapping the backend changes nothing above this file.
 */

import { firebaseConfig } from '../firebase-config.js'
import { localBackend } from './localBackend.js'

const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId)

let backend = localBackend

if (configured) {
  try {
    // Only pulled over the network when the project is actually configured.
    const { createFirebaseBackend } = await import('./firebaseBackend.js')
    backend = createFirebaseBackend(firebaseConfig)
  } catch (err) {
    console.error('[ZeroBin] Firebase failed to start — using the local backend instead.', err)
    backend = localBackend
  }
}

if (backend.mode === 'local') backend.ensureSeed()

export const isLive = backend.mode === 'firebase'
export { backend }
export default backend
