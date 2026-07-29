// InspectorPanel.tsx
import React from 'react';

export interface InspectorPanelProps {
  title?: string;
  children: React.ReactNode;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ title = 'Inspector', children }) => {
  return (
    <aside className="ds-inspector-panel" aria-label="Inspector Panel">
      <div style={{ fontWeight: 600, paddingBottom: '12px', marginBottom: '16px', borderBottom: '1px solid var(--ds-color-border-default)' }}>
        {title}
      </div>
      {children}
    </aside>
  );
};
