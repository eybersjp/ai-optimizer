// ContentHeader.tsx
import React from 'react';

export interface ContentHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const ContentHeader: React.FC<ContentHeaderProps> = ({ title, description, actions }) => {
  return (
    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', fontWeight: 600, color: 'var(--ds-color-fg-default)' }}>{title}</h1>
        {description && <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ds-color-fg-muted)' }}>{description}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
};
