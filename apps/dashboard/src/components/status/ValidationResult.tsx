// ValidationResult.tsx
import React from 'react';
import { InlineAlert } from '../primitives/InlineAlert';

export interface ValidationResultProps {
  status: 'passed' | 'failed' | 'warning';
  ruleName: string;
  details?: string;
}

export const ValidationResult: React.FC<ValidationResultProps> = ({ status, ruleName, details }) => {
  const variantMap = {
    passed: 'success',
    failed: 'danger',
    warning: 'warning'
  } as const;

  return (
    <InlineAlert variant={variantMap[status]} title={`Rule: ${ruleName}`}>
      {details || `Validation ${status}.`}
    </InlineAlert>
  );
};
