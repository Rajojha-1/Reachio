import { STATUS_CONFIG } from '../lib/status';
import './StatusBadge.css';

/**
 * Color-coded status badge with pulse animation on state changes.
 */
export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.far;

  return (
    <div
      className={`status-badge status-${status}`}
      style={{
        '--status-color': config.color,
        '--status-bg': config.bgColor,
      }}
    >
      <span className="status-dot" />
      <span className="status-emoji">{config.emoji}</span>
      <div className="status-text">
        <span className="status-label">{config.label}</span>
        <span className="status-desc">{config.description}</span>
      </div>
    </div>
  );
}
