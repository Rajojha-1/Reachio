import StatusBadge from './StatusBadge';
import { getUpdateFrequencyLabel } from '../lib/adaptive';
import { getLastUpdateAge } from '../lib/offline';
import './BottomPanel.css';

/**
 * Bottom panel showing distance, ETA, status, and update info.
 */
export default function BottomPanel({
  distance,
  etaText,
  status,
  isOnline,
}) {
  const updateFreq = getUpdateFrequencyLabel(status);
  const lastUpdate = getLastUpdateAge();

  return (
    <div className="bottom-panel">
      <div className="panel-handle" />

      <div className="panel-header">
        <StatusBadge status={status} />
      </div>

      <div className="panel-metrics">
        <div className="metric">
          <span className="metric-value">{distance}</span>
          <span className="metric-label">Distance</span>
        </div>
        <div className="metric-divider" />
        <div className="metric">
          <span className="metric-value">{etaText}</span>
          <span className="metric-label">ETA</span>
        </div>
      </div>

      <div className="panel-footer">
        <span className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
          <span className="connection-dot" />
          {isOnline ? 'Live' : 'Offline'}
        </span>
        <span className="update-info">{updateFreq}</span>
        <span className="last-update">{lastUpdate}</span>
      </div>
    </div>
  );
}
