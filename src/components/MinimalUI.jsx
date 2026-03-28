import './MinimalUI.css';

/**
 * Minimal overlay UI: just distance, ETA, and direction arrow.
 * For use in low-network situations or quick glances.
 */
export default function MinimalUI({ distance, etaText, status, bearing }) {
  // Calculate arrow rotation based on bearing (degrees from north)
  const arrowStyle = bearing !== null && bearing !== undefined
    ? { transform: `rotate(${bearing}deg)` }
    : {};

  return (
    <div className="minimal-ui">
      <div className="minimal-distance">{distance}</div>
      <div className="minimal-arrow" style={arrowStyle}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            d="M24 4L32 28H16L24 4Z"
            fill="currentColor"
            opacity="0.9"
          />
          <circle cx="24" cy="34" r="4" fill="currentColor" opacity="0.4" />
        </svg>
      </div>
      <div className="minimal-eta">{etaText}</div>
      <div className={`minimal-status-dot status-${status}`} />
    </div>
  );
}
