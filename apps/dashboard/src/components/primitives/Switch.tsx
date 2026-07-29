// Switch.tsx
import React, { ButtonHTMLAttributes, forwardRef, useId } from 'react';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ label, checked, onChange, disabled, id, className = '', ...props }, ref) => {
    const generatedId = useId();
    const switchId = id || generatedId;

    return (
      <label htmlFor={switchId} className={`ds-switch-label ${disabled ? 'ds-switch-label--disabled' : ''} ${className}`}>
        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          style={{
            width: '36px',
            height: '20px',
            borderRadius: '10px',
            backgroundColor: checked ? 'var(--ds-color-accent)' : 'var(--ds-color-bg-surface-active)',
            border: '1px solid var(--ds-color-border-default)',
            position: 'relative',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: 0,
            transition: 'background-color var(--ds-motion-duration-fast) var(--ds-motion-ease-default)'
          }}
          {...props}
        >
          <span
            style={{
              display: 'block',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              position: 'absolute',
              top: '2px',
              left: checked ? '18px' : '2px',
              transition: 'left var(--ds-motion-duration-fast) var(--ds-motion-ease-default)'
            }}
          />
        </button>
        <span>{label}</span>
      </label>
    );
  }
);

Switch.displayName = 'Switch';
