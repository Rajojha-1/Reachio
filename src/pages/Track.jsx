import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useFirebaseSession } from '../hooks/useFirebaseSession';
import { useGeolocation } from '../hooks/useGeolocation';
import { useETA } from '../hooks/useETA';
import { formatSpeed } from '../lib/eta';
import { haversineDistance, smoothValue, formatDistance } from '../lib/distance';
import { getStatus } from '../lib/status';
import { isOnline } from '../lib/offline';
import { endSession, updateTransitMode, sendPing, sendMessage } from '../lib/firebase';
import MapView from '../components/Map';
import BottomPanel from '../components/BottomPanel';
import './Track.css';

/**
 * Synthesizes a clean two-tone alert chime using Web Audio API (no assets needed).
 */
function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(659.25, now); // E5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15); // C6
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
}

/**
 * Synthesizes a message notification tone.
 */
function playMessageSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {}
}

/**
 * Tracking page (P2P).
 * Handles both Sender (broadcasting origin) and Receiver (broadcasting destination).
 */
export default function Track() {
  const { sessionId } = useParams();
  const { session, loading, error } = useFirebaseSession(sessionId);
  const [smoothedDistance, setSmoothedDistance] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(Date.now());
  const prevDistRef = useRef(null);

  // Chat & Alerts state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [alertText, setAlertText] = useState(null);

  const lastPingRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  // Determine role based on who created the session
  const role = localStorage.getItem(`reachio_role_${sessionId}`) === 'sender' ? 'sender' : 'receiver';

  // Start broadcasting our own location (if sender, updates sender; if receiver, updates destination)
  const { position: myLivePos, error: geoError, isTracking } = useGeolocation(sessionId, role, 'far', true);

  // Track online/offline status and current time for idle calculations
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Update 'now' every 30 seconds to recalculate idle time
    const timeInterval = setInterval(() => setNow(Date.now()), 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timeInterval);
    };
  }, []);

  // End session on page unload (sender only)
  useEffect(() => {
    if (role !== 'sender' || !sessionId) return;

    const handleUnload = () => {
      endSession(sessionId).catch(() => {});
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [role, sessionId]);

  // Save/Update local session history when loaded
  useEffect(() => {
    if (loading || error || !sessionId || !session) return;
    try {
      const recentStr = localStorage.getItem('reachio_recent_sessions');
      const recent = recentStr ? JSON.parse(recentStr) : [];
      const filtered = recent.filter(s => s.id !== sessionId);
      filtered.unshift({
        id: sessionId,
        role,
        createdAt: session.createdAt || Date.now()
      });
      localStorage.setItem('reachio_recent_sessions', JSON.stringify(filtered.slice(0, 5)));
    } catch (e) {
      console.warn('Failed to save session history:', e);
    }
  }, [sessionId, loading, error, role, session]);

  // Listen to P2P Pings from the other user
  useEffect(() => {
    if (!session?.ping) return;

    const otherRole = role === 'sender' ? 'receiver' : 'sender';
    const otherPingTime = session.ping[`${otherRole}Time`];

    if (otherPingTime && otherPingTime !== lastPingRef.current) {
      if (lastPingRef.current !== null) {
        playChime();
        if (navigator.vibrate) {
          navigator.vibrate([150, 50, 150]);
        }
        setAlertText('Your friend pinged you! 🔔');
        const t = setTimeout(() => setAlertText(null), 3000);
        return () => clearTimeout(t);
      }
      lastPingRef.current = otherPingTime;
    } else if (!otherPingTime) {
      lastPingRef.current = 0;
    }
  }, [session?.ping, role]);

  // Listen to incoming messages for sound/toast notifications
  useEffect(() => {
    const messageCount = session?.messages ? Object.keys(session.messages).length : 0;
    if (messageCount > lastMessageCountRef.current) {
      if (lastMessageCountRef.current !== 0) {
        playMessageSound();
        if (!chatOpen) {
          const msgs = Object.values(session.messages);
          const latest = msgs.reduce((a, b) => a.timestamp > b.timestamp ? a : b);
          if (latest.sender !== role) {
            setAlertText(`Message: "${latest.text.substring(0, 20)}..."`);
            const t = setTimeout(() => setAlertText(null), 4000);
            return () => clearTimeout(t);
          }
        }
      }
      lastMessageCountRef.current = messageCount;
    }
  }, [session?.messages, role, chatOpen]);

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

  // Auto-end session 2 minutes after reaching destination
  useEffect(() => {
    if (status !== 'reached' || role !== 'sender' || !sessionId) return;

    const timeout = setTimeout(() => {
      endSession(sessionId).catch(console.warn);
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearTimeout(timeout);
  }, [status, role, sessionId]);

  const { etaText } = useETA(
    senderPos,
    destPos,
    smoothedDistance || 0,
    session?.sender?.speed || 0,
    session?.transitMode || 'driving'
  );

  const handleSendQuick = (text) => {
    sendMessage(sessionId, role, text).catch(console.warn);
  };

  const handleSendCustom = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(sessionId, role, chatInput.trim()).catch(console.warn);
    setChatInput('');
  };

  const handleTriggerPing = () => {
    sendPing(sessionId, role).catch(console.warn);
  };

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

  // Calculate if sender is stationary for > 5 mins
  const lastMovedAt = session?.sender?.lastMovedAt || session?.sender?.timestamp || now;
  const idleTimeMs = now - lastMovedAt;
  const idleMins = Math.floor(idleTimeMs / 60000);
  const isStationaryLong = idleMins >= 5 && (session?.sender?.speed || 0) < 0.5;

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
        {online && isStationaryLong && !isWaitingForReceiver && status !== 'reached' && (
          <div className="offline-banner" style={{ background: 'rgba(230, 162, 60, 0.9)' }}>
            <span>⏱️</span> Sender has been stationary for {idleMins} mins
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

      {/* Alert toast notifications */}
      {alertText && (
        <div className="alert-toast">
          {alertText}
        </div>
      )}

      {/* Chat toggle bubble */}
      <button 
        className={`chat-trigger ${chatOpen ? 'open' : ''}`}
        onClick={() => setChatOpen(!chatOpen)}
        title="Open chat"
      >
        <span>💬</span>
        {session?.messages && Object.keys(session.messages).length > lastMessageCountRef.current && (
          <span className="chat-badge" />
        )}
      </button>

      {/* In-App Messaging Overlay Panel */}
      {chatOpen && (
        <div className="chat-drawer">
          <div className="chat-drawer-header">
            <h3>P2P Chat</h3>
            <button className="chat-close" onClick={() => setChatOpen(false)}>×</button>
          </div>
          
          <div className="chat-messages-container">
            {session?.messages ? (
              Object.entries(session.messages)
                .sort((a, b) => a[1].timestamp - b[1].timestamp)
                .map(([msgId, msg]) => (
                  <div key={msgId} className={`chat-message ${msg.sender === role ? 'me' : 'them'}`}>
                    <span className="msg-sender-label">{msg.sender === role ? 'You' : 'Friend'}</span>
                    <p className="msg-text">{msg.text}</p>
                    <span className="msg-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
            ) : (
              <div className="chat-empty">
                <p>No messages yet. Send a quick reply or type below!</p>
              </div>
            )}
          </div>

          <div className="chat-quick-replies">
            <button className="quick-reply-btn" onClick={() => handleSendQuick('On my way! 🏃')}>On my way! 🏃</button>
            <button className="quick-reply-btn" onClick={() => handleSendQuick('Almost there! 📍')}>Almost there! 📍</button>
            <button className="quick-reply-btn" onClick={() => handleSendQuick("I've arrived! ✅")}>I've arrived! ✅</button>
            <button className="quick-reply-btn" onClick={() => handleSendQuick('Stuck in traffic 🚗')}>Stuck in traffic 🚗</button>
          </div>

          <form onSubmit={handleSendCustom} className="chat-input-form">
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              placeholder="Type a message..."
              maxLength={100}
            />
            <button type="submit" className="chat-send-btn" disabled={!chatInput.trim()}>Send</button>
          </form>
        </div>
      )}

      {/* Bottom panel */}
      {senderPos && destPos && !isWaitingForReceiver && (
        <BottomPanel
          distance={distanceText}
          etaText={etaText}
          speedText={formatSpeed(session?.sender?.speed || 0)}
          status={status}
          isOnline={online}
          role={role}
          transitMode={session?.transitMode || 'driving'}
          onTransitModeChange={(mode) => updateTransitMode(sessionId, mode)}
          onPing={handleTriggerPing}
        />
      )}
    </div>
  );
}
