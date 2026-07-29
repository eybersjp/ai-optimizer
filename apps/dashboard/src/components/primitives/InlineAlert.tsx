// InlineAlert.tsx
import React from 'react';

export interface InlineAlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
}

const alertSymbols = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠️',
  danger: '✕'
};

export const InlineAlert: React.FC<InlineAlertProps> = ({ variant = 'info', title, children }) => {
  return (
    <div className={`ds-inline-alert ds-inline-alert--${variant}`} role="alert">
      <span aria-hidden="true">{alertSymbols[variant]}</span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: '600', marginBottom: '2px' }}>{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
};
