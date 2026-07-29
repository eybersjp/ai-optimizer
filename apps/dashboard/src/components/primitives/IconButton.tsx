// IconButton.tsx
import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // Required for accessibility
  size?: 'sm' | 'md' | 'lg';
  symbol?: string; // Accessible text glyph or symbol
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size = 'md', symbol = '⚙', className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        className={`ds-icon-button ds-icon-button--${size} ${className}`}
        {...props}
      >
        <span aria-hidden="true">{symbol}</span>
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
