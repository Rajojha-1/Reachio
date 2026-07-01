let lastFetchTime = 0;
let cachedRouteETA = null;
const MIN_FETCH_INTERVAL = 30_000;

/**
 * Fetch route ETA from OSRM. Used only as a reference, not the final ETA.
 * The actual ETA shown to users is calculated from their real GPS speed.
 */
export async function fetchRouteETA(origin, destination, transitMode = 'driving') {
  const now = Date.now();
  const cacheKey = `${origin.lat},${origin.lng}_${destination.lat},${destination.lng}_${transitMode}`;
  
  if (lastFetchTime > 0 && now - lastFetchTime < MIN_FETCH_INTERVAL && cachedRouteETA?.key === cacheKey) {
    return cachedRouteETA.data;
  }

  try {
    lastFetchTime = now;
    let profile = 'driving';
    if (transitMode === 'walking') profile = 'foot';
    else if (transitMode === 'cycling') profile = 'bicycle';

    const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes?.length) {
      const result = {
        durationSeconds: Math.round(data.routes[0].duration),
        distanceMeters: Math.round(data.routes[0].distance),
      };
      cachedRouteETA = {
        key: cacheKey,
        data: result
      };
      return result;
    }
    return null;
  } catch {
    return cachedRouteETA?.key === cacheKey ? cachedRouteETA.data : null; // Return last cached result on error
  }
}

/**
 * Calculate ETA based on actual GPS speed.
 * This gives a real-time estimate that adapts to walking, cycling, driving, etc.
 *
 * @param {number} distanceMeters - Remaining distance in meters
 * @param {number} speedMps - Current GPS speed in meters/second
 * @returns {number} ETA in seconds
 */
export function calculateETAFromSpeed(distanceMeters, speedMps) {
  if (!speedMps || speedMps < 0.5) {
    // Speed too low or unavailable (stationary/GPS noise)
    // Return null to indicate "can't calculate"
    return null;
  }
  return Math.round(distanceMeters / speedMps);
}

/**
 * Format seconds into a human-readable ETA string.
 */
export function formatETA(seconds) {
  if (seconds === null || seconds === undefined || seconds < 0) return '--';
  if (seconds < 60) return 'Less than 1 min';
  if (seconds < 3600) {
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

/**
 * Format speed for display.
 * @param {number} speedMps - Speed in meters/second
 * @returns {string}
 */
export function formatSpeed(speedMps) {
  if (!speedMps || speedMps < 0.3) return 'Stationary';
  const kmh = speedMps * 3.6;
  if (kmh < 6) return 'Walking';
  if (kmh < 20) return 'Cycling';
  return `${Math.round(kmh)} km/h`;
}
