// DiagnosticMessage.tsx
import React from 'react';
import { InlineAlert } from '../primitives/InlineAlert';

export interface DiagnosticMessageProps {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export const DiagnosticMessage: React.FC<DiagnosticMessageProps> = ({ code, message, severity }) => {
  const variantMap = {
    info: 'info',
    warning: 'warning',
    error: 'danger'
  } as const;

  return (
    <InlineAlert variant={variantMap[severity]} title={`Diagnostic [${code}]`}>
      {message}
    </InlineAlert>
  );
};
