/**
 * Firebase project keys.
 *
 * Pulled from the Firebase CLI:
 *   firebase apps:sdkconfig WEB --project assignment-43655
 *
 * ZeroBin runs on the FREE Spark plan. It uses Authentication and Cloud
 * Firestore ONLY — no Cloud Storage, no Cloud Functions — so no billing card is
 * ever needed. Food photos are public image links rather than uploads.
 *
 * These values are not secrets: a Firebase web config is public by design and
 * ships in every client. What protects the data is `firestore.rules` in this
 * repository, which is why that file is the real backend.
 *
 * Leave these blank and the app falls back to an in-browser backend with the
 * same behaviour, so it still runs with no setup at all.
 */

export const firebaseConfig = {
  apiKey: 'AIzaSyC45nwITTnfvL5QhfhOCm0cuKIH9958ZXI',
  authDomain: 'assignment-43655.firebaseapp.com',
  projectId: 'assignment-43655',
  storageBucket: 'assignment-43655.firebasestorage.app',
  messagingSenderId: '816734178523',
  appId: '1:816734178523:web:ffb12b3572fc35594b10fe',
}
