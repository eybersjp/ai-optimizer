// FieldLabel.tsx
import React, { LabelHTMLAttributes } from 'react';

export interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({ children, required, className = '', ...props }) => {
  return (
    <label className={`ds-label ${required ? 'ds-label--required' : ''} ${className}`} {...props}>
      {children}
    </label>
  );
};
