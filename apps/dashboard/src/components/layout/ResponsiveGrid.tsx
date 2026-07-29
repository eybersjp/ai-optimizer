// ResponsiveGrid.tsx
import React from 'react';

export interface ResponsiveGridProps {
  children: React.ReactNode;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({ children }) => {
  return <div className="ds-responsive-grid">{children}</div>;
};
