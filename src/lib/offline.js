const STORAGE_KEY = 'reachio_location_buffer';
const MAX_BUFFER_SIZE = 50;

/**
 * Buffer a GPS point in localStorage for offline syncing.
 * Keeps a rolling window of MAX_BUFFER_SIZE points.
 *
 * @param {{ lat: number, lng: number, timestamp: number, speed: number }} point
 */
export function bufferLocation(point) {
  try {
    const buffer = getBuffer();
    buffer.push(point);
    // Keep only the latest MAX_BUFFER_SIZE entries
    if (buffer.length > MAX_BUFFER_SIZE) {
      buffer.splice(0, buffer.length - MAX_BUFFER_SIZE);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
  } catch (e) {
    console.warn('Failed to buffer location:', e);
  }
}

/**
 * Get the current location buffer.
 * @returns {Array<{ lat: number, lng: number, timestamp: number, speed: number }>}
 */
export function getBuffer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Flush all buffered locations to Firebase, then clear the buffer.
 * @param {string} sessionId
 * @param {function} updateFn - Async function that takes (sessionId, lat, lng, speed)
 */
export async function flushBuffer(sessionId, updateFn) {
  const buffer = getBuffer();
  if (buffer.length === 0) return;

  try {
    // Send only the latest point (most relevant)
    const latest = buffer[buffer.length - 1];
    await updateFn(sessionId, latest.lat, latest.lng, latest.speed || 0);
    clearBuffer();
  } catch (e) {
    console.warn('Failed to flush buffer:', e);
  }
}

/**
 * Clear the location buffer.
 */
export function clearBuffer() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear buffer:', e);
  }
}

/**
 * Get the time elapsed since the last buffered location update.
 * @returns {string} Human-readable time ago string, e.g., "12 sec ago"
 */
export function getLastUpdateAge() {
  const buffer = getBuffer();
  if (buffer.length === 0) return 'No updates';

  const lastTimestamp = buffer[buffer.length - 1].timestamp;
  const ageSeconds = Math.round((Date.now() - lastTimestamp) / 1000);

  if (ageSeconds < 5) return 'Just now';
  if (ageSeconds < 60) return `${ageSeconds} sec ago`;
  if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)} min ago`;
  return `${Math.round(ageSeconds / 3600)} hr ago`;
}

/**
 * Check if the device is online.
 * @returns {boolean}
 */
export function isOnline() {
  return navigator.onLine;
}
