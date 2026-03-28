import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchRouteETA, calculateETAFromSpeed, formatETA } from '../lib/eta';
import { smoothValue } from '../lib/distance';

/**
 * Custom hook for calculating and displaying ETA.
 * Prioritizes real-time speed from GPS. Falls back to OSRM route ETA if stationary/unavailable.
 * Applies smoothing to prevent UI jumps.
 *
 * @param {{ lat: number, lng: number } | null} origin - Sender position
 * @param {{ lat: number, lng: number } | null} destination - Destination position
 * @param {number} distanceMeters - Current distance
 * @param {number} speed - Current speed in m/s
 * @returns {{ etaSeconds: number|null, etaText: string }}
 */
export function useETA(origin, destination, distanceMeters, speed = 0) {
  const [etaSeconds, setEtaSeconds] = useState(null);
  const [etaText, setEtaText] = useState('--');
  const prevEtaRef = useRef(null);
  const intervalRef = useRef(null);

  const calculateETA = useCallback(async () => {
    if (!origin || !destination) return;

    let rawEta = null;

    // 1. Try real-time speed ETA first
    const speedBasedEta = calculateETAFromSpeed(distanceMeters, speed);
    
    if (speedBasedEta !== null && speedBasedEta > 0) {
      rawEta = speedBasedEta;
    } else {
      // 2. Fallback to API routing ETA (e.g. they are stationary)
      const routeResult = await fetchRouteETA(origin, destination);
      if (routeResult) {
        rawEta = routeResult.durationSeconds;
      }
    }

    if (rawEta !== null) {
      // Smooth the ETA value
      const smoothedEta = smoothValue(rawEta, prevEtaRef.current, 0.4);
      prevEtaRef.current = smoothedEta;

      setEtaSeconds(Math.round(smoothedEta));
      setEtaText(formatETA(Math.round(smoothedEta)));
    }
  }, [origin, destination, distanceMeters, speed]);

  useEffect(() => {
    // Call asynchronously to avoid setting state during effect execution phase
    calculateETA().catch(console.error);

    // Recalculate every 30 seconds
    intervalRef.current = setInterval(calculateETA, 30_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [calculateETA]);

  return { etaSeconds, etaText };
}
