import './Navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <div className="nav-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
        </div>
        <span className="nav-brand-text">Reachio</span>
      </div>
      <div className="nav-badge">
        <span className="nav-badge-dot" />
        Free & Open Source P2P
      </div>
    </nav>
  );
}
