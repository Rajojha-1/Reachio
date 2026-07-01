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
  speedText,
  status,
  isOnline,
  role,
  transitMode = 'driving',
  onTransitModeChange,
  onPing,
}) {
  const updateFreq = getUpdateFrequencyLabel(status);
  const lastUpdate = getLastUpdateAge();

  return (
    <div className="bottom-panel">
      <div className="panel-handle" />

      <div className="panel-header">
        <div className="status-row-container">
          <StatusBadge status={status} />
          {!chatOpen && (
            <button className="btn-chat-trigger" onClick={onChatOpen} title="Open chat">
              💬 Chat {hasNewMessages && <span className="chat-badge-dot" />}
            </button>
          )}
        </div>
        
        <div className="panel-controls">
          {/* Transit Mode Selector */}
          {role === 'sender' ? (
            <div className="transit-selector">
              <button 
                className={`transit-btn ${transitMode === 'driving' ? 'active' : ''}`}
                onClick={() => onTransitModeChange('driving')}
                title="Driving mode"
              >
                🚗
              </button>
              <button 
                className={`transit-btn ${transitMode === 'cycling' ? 'active' : ''}`}
                onClick={() => onTransitModeChange('cycling')}
                title="Cycling mode"
              >
                🚲
              </button>
              <button 
                className={`transit-btn ${transitMode === 'walking' ? 'active' : ''}`}
                onClick={() => onTransitModeChange('walking')}
                title="Walking mode"
              >
                🚶
              </button>
            </div>
          ) : (
            <div className="transit-indicator">
              <span>Traveling by: </span>
              <strong>
                {transitMode === 'driving' && '🚗 Driving'}
                {transitMode === 'cycling' && '🚲 Cycling'}
                {transitMode === 'walking' && '🚶 Walking'}
              </strong>
            </div>
          )}

          {/* Ping Button */}
          <button className="btn btn-ping" onClick={onPing} title="Ping friend with alert">
            🔔 Ping
          </button>
        </div>
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
        <div className="metric-divider" />
        <div className="metric">
          <span className="metric-value">{speedText}</span>
          <span className="metric-label">Speed</span>
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
