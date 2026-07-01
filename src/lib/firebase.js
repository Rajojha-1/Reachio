import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, update, get, remove, push } from 'firebase/database';
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

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_KEY = 'reachio_session_timestamps';
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if the user has exceeded the session creation rate limit.
 * @returns {boolean} true if rate limited
 */
function isRateLimited() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const timestamps = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    return recent.length >= RATE_LIMIT_MAX;
  } catch {
    return false;
  }
}

/**
 * Record a session creation timestamp for rate limiting.
 */
function recordSessionCreation() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const timestamps = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    recent.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Create a new tracking session (sender only).
 * Includes rate limiting and a 24-hour TTL.
 * Returns the session ID.
 * @throws {Error} If rate limited
 */
export async function createSession(senderLat, senderLng) {
  if (isRateLimited()) {
    throw new Error('Rate limit exceeded. You can create up to 5 sessions per hour.');
  }

  const sessionId = nanoid(10);
  const sessionRef = ref(db, `sessions/${sessionId}`);
  const now = Date.now();
  await set(sessionRef, {
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    sender: {
      lat: senderLat,
      lng: senderLng,
      timestamp: now,
      speed: 0,
    },
    destination: null,
    eta: null,
    status: 'far',
    active: true,
  });

  recordSessionCreation();
  return sessionId;
}

/**
 * Update sender's live location in the session.
 */
export async function updateLocation(sessionId, lat, lng, speed = 0, lastMovedAt = null) {
  const sessionRef = ref(db, `sessions/${sessionId}/sender`);
  
  const data = {
    lat,
    lng,
    timestamp: Date.now(),
    speed,
  };

  if (lastMovedAt !== null) {
    data.lastMovedAt = lastMovedAt;
  }

  // Use set instead of update because if sender was missing entirely it creates it,
  // but update is fine since we create it initially.
  await update(sessionRef, data);
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

/**
 * Update the session's active transit mode.
 */
export async function updateTransitMode(sessionId, mode) {
  const sessionRef = ref(db, `sessions/${sessionId}`);
  await update(sessionRef, { transitMode: mode });
}

/**
 * Send a haptic/audio ping alert.
 */
export async function sendPing(sessionId, role) {
  const pingRef = ref(db, `sessions/${sessionId}/ping`);
  await update(pingRef, {
    [`${role}Time`]: Date.now()
  });
}

/**
 * Send a chat message. Keeps the database clean by pruning to last 20 messages.
 */
export async function sendMessage(sessionId, role, text) {
  const messagesRef = ref(db, `sessions/${sessionId}/messages`);
  const newMessageRef = push(messagesRef);
  await set(newMessageRef, {
    sender: role,
    text,
    timestamp: Date.now()
  });

  // Limit to last 20 messages
  try {
    const snapshot = await get(messagesRef);
    const messages = snapshot.val();
    if (messages) {
      const keys = Object.keys(messages);
      if (keys.length > 20) {
        keys.sort((a, b) => messages[a].timestamp - messages[b].timestamp);
        const toDelete = keys.slice(0, keys.length - 20);
        const prunes = {};
        toDelete.forEach(k => {
          prunes[k] = null;
        });
        await update(messagesRef, prunes);
      }
    }
  } catch (e) {
    console.warn('Failed to prune messages:', e);
  }
}

/**
 * Check if a session has expired based on its TTL.
 * @param {object} sessionData - The session data from Firebase
 * @returns {boolean} true if expired
 */
export function isSessionExpired(sessionData) {
  if (!sessionData) return true;
  if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) return true;
  // Fallback: if no expiresAt field, expire after 24h from createdAt
  if (!sessionData.expiresAt && sessionData.createdAt) {
    return Date.now() - sessionData.createdAt > SESSION_TTL_MS;
  }
  return false;
}

/**
 * Delete an expired session from Firebase.
 * Called opportunistically when a client discovers an expired session.
 */
export async function cleanupExpiredSession(sessionId) {
  try {
    const sessionRef = ref(db, `sessions/${sessionId}`);
    await remove(sessionRef);
  } catch (e) {
    console.warn('Failed to cleanup expired session:', e);
  }
}

export { db, SESSION_TTL_MS };
