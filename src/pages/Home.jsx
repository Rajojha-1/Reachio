import { useState, useCallback } from 'react';
import { createSession } from '../lib/firebase';
import './Home.css';

/**
 * Home / Share screen.
 * Simplified P2P Flow:
 * 1. User clicks "Share Live Location"
 * 2. Gets GPS, creates session (destination is null)
 * 3. Shows sharing link.
 */
export default function Home() {
  const [step, setStep] = useState('ready'); // ready | detecting | sharing
  const [sessionId, setSessionId] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleStartSharing = useCallback(async () => {
    setError(null);
    setStep('detecting');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setStep('ready');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          const id = await createSession(lat, lng);
          
          // Identify this device as the sender for this session
          localStorage.setItem(`reachio_role_${id}`, 'sender');

          setSessionId(id);
          const link = `${window.location.origin}/track/${id}`;
          setShareLink(link);
          setStep('sharing');
        } catch (e) {
          console.error('Failed to start sharing:', e);
          setError(e.message || 'Failed to start sharing. Check your connection.');
          setStep('ready');
        }
      },
      (err) => {
        setError('Unable to get your location. Please enable location services and try again.');
        setStep('ready');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareLink]);

  const handleShareWhatsApp = useCallback(() => {
    const text = encodeURIComponent(`Track my live location on Reachio 📍: ${shareLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }, [shareLink]);

  return (
    <div className="home">
      <div className="home-bg" />

      <header className="home-header">
        <div className="logo">
          <span className="logo-icon">📍</span>
          <h1>Reachio</h1>
        </div>
        <p className="tagline">Real-time peer-to-peer location sharing.</p>
      </header>

      <div className="home-card">
        {step === 'sharing' ? (
          <div className="share-active">
            <div className="share-active-icon">🟢</div>
            <h2>You're Live!</h2>
            <p className="share-active-desc">Send this link to the person you are meeting.</p>

            <div className="share-link-box">
              <input type="text" value={shareLink} readOnly className="share-link-input" />
              <button className="btn btn-copy" onClick={handleCopy}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>

            <div className="share-actions">
              <button className="btn btn-whatsapp" onClick={handleShareWhatsApp}>
                <span>📱</span> Share via WhatsApp
              </button>
              <a href={shareLink} className="btn btn-outline" target="_blank" rel="noopener">
                View My Tracker →
              </a>
            </div>
          </div>
        ) : step === 'detecting' ? (
          <div className="detecting">
            <div className="detecting-spinner" />
            <p>Accessing GPS & Creating Session...</p>
          </div>
        ) : (
          <div className="share-setup">
            <h2>Track & Meet Instantly</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Share your live location. When your friend opens the link, the app automatically finds them and shows exactly how far apart you are!
            </p>

            {error && <div className="error-msg">{error}</div>}

            <button
              className="btn btn-primary btn-large"
              onClick={handleStartSharing}
            >
              📡 Share My Live Location
            </button>
          </div>
        )}
      </div>

      <div className="features">
        <div className="feature">
          <span className="feature-icon">📏</span>
          <span>Live Distance</span>
        </div>
        <div className="feature">
          <span className="feature-icon">⏱️</span>
          <span>Adaptive ETA</span>
        </div>
        <div className="feature">
          <span className="feature-icon">🔗</span>
          <span>P2P Tracking</span>
        </div>
        <div className="feature">
          <span className="feature-icon">🚫</span>
          <span>No Login Required</span>
        </div>
      </div>
    </div>
  );
}
