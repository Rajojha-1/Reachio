import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, update, get } from 'firebase/database';
import { nanoid } from 'nanoid';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/**
 * Create a new tracking session (sender only).
 * Returns the session ID.
 */
export async function createSession(senderLat, senderLng) {
  const sessionId = nanoid(10);
  const sessionRef = ref(db, `sessions/${sessionId}`);
  await set(sessionRef, {
    createdAt: Date.now(),
    sender: {
      lat: senderLat,
      lng: senderLng,
      timestamp: Date.now(),
      speed: 0,
    },
    destination: null, // Will be set when receiver joins
    eta: null,
    status: 'far',
    active: true,
  });
  return sessionId;
}

/**
 * Update sender's live location in the session.
 */
export async function updateLocation(sessionId, lat, lng, speed = 0) {
  const sessionRef = ref(db, `sessions/${sessionId}/sender`);
  // Use set instead of update because if sender was missing entirely it creates it,
  // but update is fine since we create it initially.
  await update(sessionRef, {
    lat,
    lng,
    timestamp: Date.now(),
    speed,
  });
}

/**
 * Update receiver's (destination's) live location.
 */
export async function updateDestinationLocation(sessionId, lat, lng) {
  const sessionRef = ref(db, `sessions/${sessionId}/destination`);
  await set(sessionRef, {
    lat,
    lng,
    timestamp: Date.now()
  });
}

/**
 * Update session metadata (eta, status, etc.)
 */
export async function updateSessionMeta(sessionId, data) {
  const sessionRef = ref(db, `sessions/${sessionId}`);
  await update(sessionRef, data);
}

/**
 * Subscribe to real-time session updates.
 * Returns an unsubscribe function.
 */
export function subscribeToSession(sessionId, callback) {
  const sessionRef = ref(db, `sessions/${sessionId}`);
  const unsubscribe = onValue(sessionRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  return unsubscribe;
}

/**
 * Get session data once (non-realtime).
 */
export async function getSession(sessionId) {
  const sessionRef = ref(db, `sessions/${sessionId}`);
  const snapshot = await get(sessionRef);
  return snapshot.val();
}

/**
 * End a tracking session.
 */
export async function endSession(sessionId) {
  const sessionRef = ref(db, `sessions/${sessionId}`);
  await update(sessionRef, { active: false });
}

export { db };
