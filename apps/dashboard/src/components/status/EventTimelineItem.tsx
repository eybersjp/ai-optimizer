// EventTimelineItem.tsx
import React from 'react';
import { StatusBadge, StatusSemantic } from '../primitives/StatusBadge';

export interface EventTimelineItemProps {
  timestamp: string;
  title: string;
  status: StatusSemantic;
  description?: string;
}

export const EventTimelineItem: React.FC<EventTimelineItemProps> = ({ timestamp, title, status, description }) => {
  return (
    <div style={{ display: 'flex', gap: '12px', paddingBottom: '16px', borderLeft: '2px solid var(--ds-color-border-default)', paddingLeft: '16px', position: 'relative' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, color: 'var(--ds-color-fg-default)' }}>{title}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-fg-subtle)', fontFamily: 'var(--ds-font-family-mono)' }}>{timestamp}</span>
        </div>
        <StatusBadge status={status} />
        {description && <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: 'var(--ds-color-fg-muted)' }}>{description}</p>}
      </div>
    </div>
  );
};
