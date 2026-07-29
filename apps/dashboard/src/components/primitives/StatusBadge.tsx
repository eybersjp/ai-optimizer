// StatusBadge.tsx
import React from 'react';
import { Badge } from './Badge';

export type StatusSemantic =
  | 'observed'
  | 'inferred'
  | 'unresolved'
  | 'recommended'
  | 'proposed'
  | 'approved'
  | 'active'
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'warning';

export interface StatusBadgeProps {
  status: StatusSemantic;
  label?: string;
}

const statusMap: Record<StatusSemantic, { variant: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'; symbol: string }> = {
  observed: { variant: 'accent', symbol: '👁' },
  inferred: { variant: 'neutral', symbol: '💡' },
  unresolved: { variant: 'warning', symbol: '❓' },
  recommended: { variant: 'accent', symbol: '★' },
  proposed: { variant: 'neutral', symbol: '📝' },
  approved: { variant: 'success', symbol: '✓' },
  active: { variant: 'accent', symbol: '●' },
  passed: { variant: 'success', symbol: '✓' },
  failed: { variant: 'danger', symbol: '✕' },
  blocked: { variant: 'danger', symbol: '🚫' },
  warning: { variant: 'warning', symbol: '⚠️' }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = statusMap[status];
  const displayText = label || status.toUpperCase();

  return (
    <Badge variant={config.variant}>
      <span aria-hidden="true" style={{ marginRight: '4px' }}>{config.symbol}</span>
      <span>{displayText}</span>
    </Badge>
  );
};
