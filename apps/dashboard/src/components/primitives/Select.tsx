// Select.tsx
import React, { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { FieldLabel } from './FieldLabel';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, hint, required, id, className = '', ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;

    return (
      <div className="ds-field">
        {label && (
          <FieldLabel htmlFor={selectId} required={required}>
            {label}
          </FieldLabel>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
          className={`ds-select ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span id={errorId} className="ds-field__error" role="alert">{error}</span>}
        {hint && !error && <span id={hintId} className="ds-field__hint">{hint}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
