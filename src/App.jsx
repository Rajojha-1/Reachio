import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import './App.css';

/**
 * Wraps React.lazy with automatic chunk-refresh logic.
 * If a new version of the app is deployed, the old JS chunk files (hashes)
 * no longer exist, throwing a loading error. This catches the error and
 * forces a single page reload to fetch the new code bundles automatically.
 */
function lazyWithRetry(componentImport) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      const hasFailed = localStorage.getItem('chunk_load_failed');
      if (!hasFailed) {
        localStorage.setItem('chunk_load_failed', 'true');
        window.location.reload();
        return new Promise(() => {}); // Pending promise while page reloads
      }
      throw error;
    }
  });
}

const Home = lazyWithRetry(() => import('./pages/Home'));
const Track = lazyWithRetry(() => import('./pages/Track'));

function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0a0a0f',
      color: 'rgba(255,255,255,0.6)',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      gap: '10px',
    }}>
      <div style={{
        width: '20px',
        height: '20px',
        border: '2px solid rgba(255,255,255,0.1)',
        borderTopColor: 'rgba(255,255,255,0.6)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      Loading...
    </div>
  );
}

function App() {
  useEffect(() => {
    // Clear chunk load failure flag on successful mount
    localStorage.removeItem('chunk_load_failed');
  }, []);

  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/track/:sessionId" element={<Track />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
