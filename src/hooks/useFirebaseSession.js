import { useState, useEffect } from 'react';
import { subscribeToSession, isSessionExpired, cleanupExpiredSession } from '../lib/firebase';

/**
 * Subscribe to a Firebase session in real-time.
 * Returns the current session data and loading/error state.
 * Automatically detects and cleans up expired sessions.
 *
 * @param {string|null} sessionId
 * @returns {{ session: object|null, loading: boolean, error: string|null }}
 */
export function useFirebaseSession(sessionId) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setTimeout(() => {
        setLoading(false);
        setError('No session ID provided');
      }, 0);
      return;
    }

    setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);

    const unsubscribe = subscribeToSession(sessionId, (data) => {
      if (data) {
        // Check if session has expired
        if (isSessionExpired(data)) {
          setError('Session expired. Sessions last 24 hours.');
          setSession(null);
          // Opportunistically clean up the expired session from Firebase
          cleanupExpiredSession(sessionId);
        } else if (!data.active) {
          setError('Session has ended.');
          setSession(null);
        } else {
          setSession(data);
          setError(null);
        }
      } else {
        setError('Session not found');
        setSession(null);
      }
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [sessionId]);

  return { session, loading, error };
}
