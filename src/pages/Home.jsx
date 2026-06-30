import { useState, useCallback } from 'react';
import { createSession } from '../lib/firebase';
import Navbar from '../components/Navbar';
import './Home.css';

/**
 * Home / Share screen.
 * Redesigned with a 2-column split hero layout:
 * - Left column: Interactive copy explaining the mutual P2P tracking.
 * - Right column: Location sharing state card.
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

  const handleNativeShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: 'Reachio - Live Location',
        text: 'Track my live location on Reachio 📍',
        url: shareLink,
      }).catch(() => {});
    }
  }, [shareLink]);

  return (
    <div className="home">
      <div className="home-bg" />

      {/* ── Floating particles ── */}
      <div className="particles">
        <div className="particle particle-1" />
        <div className="particle particle-2" />
        <div className="particle particle-3" />
      </div>

      {/* ── Navigation Header ── */}
      <Navbar />

      {/* ── Split Hero Section ── */}
      <div className="hero-split">
        
        {/* Left Column: Visual and Explanatory text */}
        <section className="hero-left">
          <div className="hero-eyebrow">
            <span className="eyebrow-icon">⚡</span>
            Real-time Peer-to-Peer location sharing
          </div>
          <h1 className="hero-title">
            Know exactly when<br />
            <span className="hero-gradient">they'll arrive.</span>
          </h1>
          
          <div className="p2p-explanation">
            <div className="explain-item">
              <div className="explain-num">01</div>
              <div className="explain-body">
                <h5>Start the Tracking Session</h5>
                <p>Tap "Share My Live Location" to create a secure session. It activates your GPS and sets up a temporary tracking link.</p>
              </div>
            </div>
            
            <div className="explain-item highlighted">
              <div className="explain-num">02</div>
              <div className="explain-body">
                <h5>Mutual Real-Time Updates</h5>
                <p>
                  When the other person opens your link, <strong>they will instantly see your location</strong>. At the same time, their device transmits their position so <strong>you can watch them arrive</strong> on the map.
                </p>
              </div>
            </div>

            <div className="explain-item">
              <div className="explain-num">03</div>
              <div className="explain-body">
                <h5>Adaptive Distance & Speed</h5>
                <p>Both map markers update dynamically. The app continuously displays the current distance, actual speed, and precise ETA.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Interactive Card */}
        <div className="hero-right">
          <div className="action-card">
            {step === 'sharing' ? (
              <div className="share-active">
                <div className="live-indicator">
                  <span className="live-dot" />
                  <span>LIVE</span>
                </div>
                <h2>You're broadcasting location</h2>
                <p className="share-desc">
                  Send this link to the person you are meeting. Once they open it, you will see each other live on the map.
                </p>

                <div className="share-link-box">
                  <div className="share-link-input-wrapper">
                    <svg className="link-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <input type="text" value={shareLink} readOnly className="share-link-input" />
                  </div>
                  <button className="btn btn-copy" onClick={handleCopy}>
                    {copied ? (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied</>
                    ) : (
                      <>Copy</>
                    )}
                  </button>
                </div>

                <div className="share-actions">
                  <button className="btn btn-whatsapp" onClick={handleShareWhatsApp}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </button>
                  {navigator.share && (
                    <button className="btn btn-share-native" onClick={handleNativeShare}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                      Share
                    </button>
                  )}
                  <a href={`/track/${sessionId}`} className="btn btn-outline">
                    View Map →
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
                <div className="setup-icon-row">
                  <div className="setup-icon-circle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                    </svg>
                  </div>
                </div>
                <h2>Start sharing your location</h2>
                <p className="setup-desc">
                  Tap below to go live and receive a private tracker link. Share it with your friend to locate each other.
                </p>

                {error && <div className="error-msg">{error}</div>}

                <button
                  className="btn btn-primary btn-large"
                  onClick={handleStartSharing}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                  </svg>
                  Share My Live Location
                </button>
                <p className="setup-hint">Zero login required. Sessions end automatically.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Secondary SaaS Features Section ── */}
      <section className="features-section">
        <h3 className="section-subtitle-small">Built for Instant, Real-Time Navigation</h3>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper feature-icon-distance">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
              </svg>
            </div>
            <h4>Live Distance</h4>
            <p>Smart great-circle distance calculation with exponential moving average to filter out GPS jitter.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper feature-icon-eta">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h4>Adaptive ETA</h4>
            <p>Calculates remaining travel time dynamically. Automatically falls back to OSRM mapping routing when stationary.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper feature-icon-p2p">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h4>True P2P</h4>
            <p>Not a one-sided radar. Both participants see each other's live locations on the same map layer.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper feature-icon-offline">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
              </svg>
            </div>
            <h4>Signal Resilient</h4>
            <p>Locally caches location coordinates during network outages and flushes them when connection re-establishes.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="home-footer">
        <div className="footer-badges">
          <span className="footer-badge">🔒 No Auth Required</span>
          <span className="footer-divider">·</span>
          <span className="footer-badge">📱 Mobile Friendly</span>
          <span className="footer-divider">·</span>
          <span className="footer-badge">⏱ Auto-Expires in 24h</span>
        </div>
        <p className="footer-copy">Built with Firebase RTDB, React & Leaflet Maps</p>
      </footer>
    </div>
  );
}
