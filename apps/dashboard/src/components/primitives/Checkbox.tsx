// Checkbox.tsx
import React, { InputHTMLAttributes, forwardRef, useId } from 'react';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, disabled, id, className = '', ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    return (
      <label
        htmlFor={checkboxId}
        className={`ds-checkbox-label ${disabled ? 'ds-checkbox-label--disabled' : ''} ${className}`}
      >
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          disabled={disabled}
          {...props}
        />
        <span>{label}</span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
