import { useState, useEffect, useRef, useCallback } from 'react';
import { updateLocation, updateDestinationLocation } from '../lib/firebase';
import { bufferLocation, flushBuffer, isOnline } from '../lib/offline';
import { getUpdateInterval } from '../lib/adaptive';

/**
 * Custom hook for tracking the user's geolocation.
 * Adapts update frequency based on current status.
 * Buffers locations offline and syncs when back online.
 *
 * @param {string|null} sessionId - Active Firebase session ID
 * @param {'sender'|'receiver'} role - Role of the current user
 * @param {string} status - Current tracking status
 * @param {boolean} active - Whether tracking is active
 * @returns {{ position: { lat, lng } | null, error: string | null, isTracking: boolean }}
 */
export function useGeolocation(sessionId, role = 'sender', status = 'far', active = true) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const lastSendRef = useRef(0);
  const lastMovedRef = useRef(Date.now());

  const sendLocation = useCallback(
    async (lat, lng, speed) => {
      if (!sessionId) return;

      // Update lastMovedRef if speed is > 0.5 m/s (~1.8 km/h)
      if (speed && speed > 0.5) {
        lastMovedRef.current = Date.now();
      }

      const point = { lat, lng, timestamp: Date.now(), speed, lastMovedAt: lastMovedRef.current };
      bufferLocation(point);

      if (isOnline()) {
        try {
          if (role === 'sender') {
            await updateLocation(sessionId, lat, lng, speed, lastMovedRef.current);
          } else {
            await updateDestinationLocation(sessionId, lat, lng);
          }
          // Also flush any buffered points
          const flushUpdateFn = role === 'sender' ? updateLocation : updateDestinationLocation;
          await flushBuffer(sessionId, flushUpdateFn);
        } catch (e) {
          console.warn('Failed to send location:', e);
        }
      }
    },
    [sessionId, role]
  );

  useEffect(() => {
    if (!active || !sessionId || status === 'reached') {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsTracking(true);

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        setPosition({ lat: latitude, lng: longitude });
        setError(null);

        const interval = getUpdateInterval(status);
        const now = Date.now();

        // Respect adaptive interval
        if (now - lastSendRef.current >= interval) {
          lastSendRef.current = now;
          sendLocation(latitude, longitude, speed || 0);
        }
      },
      (err) => {
        setError(err.message);
        console.warn('Geolocation error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    // Set up periodic flush for offline buffered data
    const flushInterval = setInterval(() => {
      if (isOnline() && sessionId) {
        const updateFn = role === 'sender' ? updateLocation : updateDestinationLocation;
        flushBuffer(sessionId, updateFn);
      }
    }, 15000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      clearInterval(flushInterval);
      setIsTracking(false);
    };
  }, [sessionId, status, active, sendLocation]);

  // Listen for online/offline events to flush buffer
  useEffect(() => {
    const handleOnline = () => {
      if (sessionId) {
        const updateFn = role === 'sender' ? updateLocation : updateDestinationLocation;
        flushBuffer(sessionId, updateFn);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sessionId, role]);

  return { position, error, isTracking };
}
