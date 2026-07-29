// Sidebar.tsx
import React from 'react';

export interface SidebarProps {
  collapsed?: boolean;
  children: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, children }) => {
  return (
    <aside className={`ds-sidebar ${collapsed ? 'ds-sidebar--collapsed' : ''}`} aria-label="Sidebar Navigation">
      <div style={{ padding: '16px', flex: 1 }}>{children}</div>
    </aside>
  );
};
