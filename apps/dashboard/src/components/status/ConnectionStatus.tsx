// ConnectionStatus.tsx
import React from 'react';
import { StatusBadge } from '../primitives/StatusBadge';

export interface ConnectionStatusProps {
  connected: boolean;
  endpoint?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connected, endpoint }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <StatusBadge status={connected ? 'active' : 'failed'} label={connected ? 'CONNECTED' : 'DISCONNECTED'} />
      {endpoint && (
        <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-fg-subtle)', fontFamily: 'var(--ds-font-family-mono)' }}>
          [{endpoint}]
        </span>
      )}
    </div>
  );
};
