// ManagedArtifactStatus.tsx
import React from 'react';
import { Badge } from '../primitives/Badge';

export interface ManagedArtifactStatusProps {
  name: string;
  version: string;
  synced: boolean;
}

export const ManagedArtifactStatus: React.FC<ManagedArtifactStatusProps> = ({ name, version, synced }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--ds-color-border-default)', borderRadius: 'var(--ds-radius-md)', backgroundColor: 'var(--ds-color-bg-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--ds-font-family-mono)', color: 'var(--ds-color-fg-muted)' }}>v{version}</span>
      </div>
      <Badge variant={synced ? 'success' : 'warning'}>
        {synced ? 'SYNCED' : 'OUT OF SYNC'}
      </Badge>
    </div>
  );
};
