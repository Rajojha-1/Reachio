/**
 * Status thresholds (in meters)
 */
export const STATUS_THRESHOLDS = {
  REACHED: 20,
  ARRIVING: 200,
  APPROACHING: 5000,
};

/**
 * Determine tracking status based on distance.
 * @param {number} distanceMeters - Current distance in meters
 * @returns {'reached' | 'arriving' | 'approaching' | 'far'}
 */
export function getStatus(distanceMeters) {
  if (distanceMeters <= STATUS_THRESHOLDS.REACHED) return 'reached';
  if (distanceMeters <= STATUS_THRESHOLDS.ARRIVING) return 'arriving';
  if (distanceMeters <= STATUS_THRESHOLDS.APPROACHING) return 'approaching';
  return 'far';
}

/**
 * Status display configuration.
 */
export const STATUS_CONFIG = {
  far: {
    label: 'Far',
    color: '#ff6b35',
    bgColor: 'rgba(255, 107, 53, 0.15)',
    emoji: '📡',
    description: 'On the way',
  },
  approaching: {
    label: 'Approaching',
    color: '#f7c948',
    bgColor: 'rgba(247, 201, 72, 0.15)',
    emoji: '🔄',
    description: 'Getting closer',
  },
  arriving: {
    label: 'Arriving',
    color: '#4da6ff',
    bgColor: 'rgba(77, 166, 255, 0.15)',
    emoji: '📍',
    description: 'Almost there',
  },
  reached: {
    label: 'Reached',
    color: '#2ecc71',
    bgColor: 'rgba(46, 204, 113, 0.15)',
    emoji: '✅',
    description: 'Arrived!',
  },
};
