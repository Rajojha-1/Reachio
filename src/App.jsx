import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import './App.css';

// Lazy-load pages to reduce initial bundle size (Firebase SDK is heavy)
const Home = lazy(() => import('./pages/Home'));
const Track = lazy(() => import('./pages/Track'));

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
