// ApplicationShell.tsx
import React from 'react';

export interface ApplicationShellProps {
  topBar?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export const ApplicationShell: React.FC<ApplicationShellProps> = ({ topBar, sidebar, children }) => {
  return (
    <div className="ds-app-shell">
      {topBar}
      <div className="ds-app-shell__body">
        {sidebar}
        <main className="ds-content-area">{children}</main>
      </div>
    </div>
  );
};
