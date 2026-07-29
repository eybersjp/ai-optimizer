// ProjectHealthIndicator.tsx
import React from 'react';
import { StatusBadge, StatusSemantic } from '../primitives/StatusBadge';

export interface ProjectHealthIndicatorProps {
  status: StatusSemantic;
  scoreText?: string;
  label?: string;
}

export const ProjectHealthIndicator: React.FC<ProjectHealthIndicatorProps> = ({
  status,
  scoreText,
  label = 'System Health'
}) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--ds-color-fg-muted)' }}>{label}:</span>
      <StatusBadge status={status} />
      {scoreText && (
        <span style={{ fontFamily: 'var(--ds-font-family-mono)', fontSize: '0.75rem', color: 'var(--ds-color-fg-subtle)' }}>
          ({scoreText})
        </span>
      )}
    </div>
  );
};
