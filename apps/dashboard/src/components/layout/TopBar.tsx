// TopBar.tsx
import React from 'react';

export interface TopBarProps {
  title: string;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, actions }) => {
  return (
    <header className="ds-top-bar">
      <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--ds-color-fg-default)' }}>{title}</h1>
      {actions && <div>{actions}</div>}
    </header>
  );
};
