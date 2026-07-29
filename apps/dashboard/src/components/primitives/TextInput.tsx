// TextInput.tsx
import React, { InputHTMLAttributes, forwardRef, useId } from 'react';
import { FieldLabel } from './FieldLabel';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, hint, required, id, className = '', ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="ds-field">
        {label && (
          <FieldLabel htmlFor={inputId} required={required}>
            {label}
          </FieldLabel>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
          className={`ds-input ${className}`}
          {...props}
        />
        {error && <span id={errorId} className="ds-field__error" role="alert">{error}</span>}
        {hint && !error && <span id={hintId} className="ds-field__hint">{hint}</span>}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
