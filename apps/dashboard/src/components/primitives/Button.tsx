// Button.tsx
import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading = false, disabled, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading}
        className={`ds-button ds-button--${variant} ds-button--${size} ${className}`}
        {...props}
      >
        {isLoading && <span className="ds-button__spinner" aria-hidden="true">⚙</span>}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
