/**
 * Haversine formula: calculates great-circle distance between two points.
 * @returns distance in meters
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Exponential moving average to smooth distance values.
 * Prevents UI jumping on GPS jitter.
 * @param {number} newValue - Latest raw distance
 * @param {number|null} prevSmoothed - Previous smoothed value
 * @param {number} alpha - Smoothing factor (0-1). Lower = smoother, higher = more responsive.
 * @returns {number} Smoothed distance
 */
export function smoothValue(newValue, prevSmoothed, alpha = 0.3) {
  if (prevSmoothed === null || prevSmoothed === undefined) return newValue;
  return alpha * newValue + (1 - alpha) * prevSmoothed;
}

/**
 * Format distance for display.
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
