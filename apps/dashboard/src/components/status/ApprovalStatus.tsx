// ApprovalStatus.tsx
import React from 'react';
import { StatusBadge } from '../primitives/StatusBadge';

export interface ApprovalStatusProps {
  state: 'proposed' | 'approved' | 'rejected' | 'pending';
  approver?: string;
}

export const ApprovalStatus: React.FC<ApprovalStatusProps> = ({ state, approver }) => {
  const semanticMap = {
    proposed: 'proposed',
    approved: 'approved',
    rejected: 'failed',
    pending: 'unresolved'
  } as const;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <StatusBadge status={semanticMap[state]} label={`APPROVAL: ${state.toUpperCase()}`} />
      {approver && (
        <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-fg-subtle)', fontFamily: 'var(--ds-font-family-mono)' }}>
          by {approver}
        </span>
      )}
    </div>
  );
};
