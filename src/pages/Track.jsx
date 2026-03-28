import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useFirebaseSession } from '../hooks/useFirebaseSession';
import { useGeolocation } from '../hooks/useGeolocation';
import { useETA } from '../hooks/useETA';
import { haversineDistance, smoothValue, formatDistance } from '../lib/distance';
import { getStatus } from '../lib/status';
import { isOnline } from '../lib/offline';
import MapView from '../components/Map';
import BottomPanel from '../components/BottomPanel';
import './Track.css';

/**
 * Tracking page (P2P).
 * Handles both Sender (broadcasting origin) and Receiver (broadcasting destination).
 */
export default function Track() {
  const { sessionId } = useParams();
  const { session, loading, error } = useFirebaseSession(sessionId);
  const [smoothedDistance, setSmoothedDistance] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const prevDistRef = useRef(null);

  // Determine role based on who created the session
  const role = localStorage.getItem(`reachio_role_${sessionId}`) === 'sender' ? 'sender' : 'receiver';

  // Start broadcasting our own location (if sender, updates sender; if receiver, updates destination)
  const { position: myLivePos, error: geoError, isTracking } = useGeolocation(sessionId, role, 'far', true);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const senderPos = session?.sender
    ? { lat: session.sender.lat, lng: session.sender.lng }
    : (role === 'sender' && myLivePos ? myLivePos : null);

  const destPos = session?.destination
    ? { lat: session.destination.lat, lng: session.destination.lng }
    : (role === 'receiver' && myLivePos ? myLivePos : null);

  const rawDistance = senderPos && destPos
    ? haversineDistance(senderPos.lat, senderPos.lng, destPos.lat, destPos.lng)
    : null;

  useEffect(() => {
    if (rawDistance !== null) {
      const smoothed = smoothValue(rawDistance, prevDistRef.current, 0.3);
      prevDistRef.current = smoothed;
      setSmoothedDistance(smoothed);
    }
  }, [rawDistance]);

  const status = smoothedDistance !== null ? getStatus(smoothedDistance) : 'far';
  const distanceText = smoothedDistance !== null ? formatDistance(smoothedDistance) : '--';

  const { etaText } = useETA(
    senderPos,
    destPos,
    smoothedDistance || 0,
    session?.sender?.speed || 0
  );

  if (loading) {
    return (
      <div className="track-loading">
        <div className="track-loading-spinner" />
        <span>Connecting to session...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="track-error">
        <span className="track-error-icon">❌</span>
        <h2>Session Not Found</h2>
        <p>This tracking link may have expired or is invalid.</p>
        <a href="/" className="btn btn-primary">Create a New Session</a>
      </div>
    );
  }

  const isWaitingForReceiver = role === 'sender' && !session?.destination;

  return (
    <div className="track">
      {/* Map layer */}
      <MapView senderPos={senderPos} destinationPos={destPos} status={status} />

      {/* Top bar */}
      <div className="track-topbar">
        <div className="topbar-logo">
          <span>📍</span> Reachio
        </div>
        {!online && (
          <div className="offline-banner">
            <span>📡</span> Offline — Showing last known position
          </div>
        )}
      </div>

      {/* Waiting Overlay for Sender */}
      {isWaitingForReceiver && (
        <div className="waiting-overlay">
          <div className="waiting-card">
            <div className="detecting-spinner" style={{ marginBottom: 16 }} />
            <h3>Waiting for receiver...</h3>
            <p>Your location is live. When your friend opens the link, you will see their position here.</p>
          </div>
        </div>
      )}

      {geoError && (
        <div className="geo-error-banner">
          ⚠️ Location Error: {geoError}
        </div>
      )}

      {/* Bottom panel */}
      {senderPos && destPos && !isWaitingForReceiver && (
        <BottomPanel
          distance={distanceText}
          etaText={etaText}
          status={status}
          isOnline={online}
        />
      )}
    </div>
  );
}
