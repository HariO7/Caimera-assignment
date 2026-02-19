import React from 'react';
import './NetworkIndicator.css';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface NetworkIndicatorProps {
  status: ConnectionStatus;
  playerCount: number;
}

const statusConfig = {
  connected: { label: 'Connected', dot: 'dot-green' },
  connecting: { label: 'Reconnecting...', dot: 'dot-yellow' },
  disconnected: { label: 'Offline', dot: 'dot-red' },
};

const NetworkIndicator: React.FC<NetworkIndicatorProps> = ({ status, playerCount }) => {
  const config = statusConfig[status];
  return (
    <div className="network-bar">
      <div className={`net-status ${status}`}>
        <span className={`net-dot ${config.dot}`} />
        <span className="net-label">{config.label}</span>
      </div>
      {status === 'connected' && (
        <div className="player-count">
          <span className="player-icon">👥</span>
          <span>{playerCount} online</span>
        </div>
      )}
    </div>
  );
};

export default NetworkIndicator;
