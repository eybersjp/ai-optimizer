// DiffFileHeader.tsx
import React from 'react';
import { Badge } from '../primitives/Badge';

export interface DiffFileHeaderProps {
  filePath: string;
  changeType: 'modified' | 'added' | 'deleted';
  additions?: number;
  deletions?: number;
}

export const DiffFileHeader: React.FC<DiffFileHeaderProps> = ({ filePath, changeType, additions = 0, deletions = 0 }) => {
  const variantMap = {
    modified: 'warning',
    added: 'success',
    deleted: 'danger'
  } as const;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: 'var(--ds-color-bg-subtle)',
        border: '1px solid var(--ds-color-border-default)',
        borderRadius: 'var(--ds-radius-md)',
        fontFamily: 'var(--ds-font-family-mono)',
        fontSize: '0.875rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Badge variant={variantMap[changeType]}>{changeType.toUpperCase()}</Badge>
        <span style={{ color: 'var(--ds-color-fg-default)' }}>{filePath}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--ds-color-success-fg)' }}>+{additions}</span>
        <span style={{ color: 'var(--ds-color-danger-fg)' }}>-{deletions}</span>
      </div>
    </div>
  );
};
