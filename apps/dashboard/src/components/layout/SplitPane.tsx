// SplitPane.tsx
import React from 'react';

export interface SplitPaneProps {
  primary: React.ReactNode;
  secondary: React.ReactNode;
}

export const SplitPane: React.FC<SplitPaneProps> = ({ primary, secondary }) => {
  return (
    <div className="ds-split-pane">
      <div style={{ flex: 1, minWidth: 0 }}>{primary}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{secondary}</div>
    </div>
  );
};
