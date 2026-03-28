/**
 * Adaptive update intervals based on tracking status.
 * Returns the interval in milliseconds for location updates.
 * Optimizes battery usage by reducing updates when far away.
 *
 * @param {'far' | 'approaching' | 'arriving' | 'reached'} status
 * @returns {number} Update interval in milliseconds
 */
export function getUpdateInterval(status) {
  switch (status) {
    case 'far':
      return 120_000; // 2 minutes
    case 'approaching':
      return 30_000;  // 30 seconds
    case 'arriving':
      return 5_000;   // 5 seconds
    case 'reached':
      return 0;       // Stop tracking
    default:
      return 30_000;
  }
}

/**
 * Get a human-readable description of the update frequency.
 * @param {'far' | 'approaching' | 'arriving' | 'reached'} status
 * @returns {string}
 */
export function getUpdateFrequencyLabel(status) {
  switch (status) {
    case 'far':
      return 'Updating every 2 min';
    case 'approaching':
      return 'Updating every 30 sec';
    case 'arriving':
      return 'Live tracking';
    case 'reached':
      return 'Tracking stopped';
    default:
      return '';
  }
}
