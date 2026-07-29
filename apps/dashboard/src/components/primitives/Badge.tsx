// Badge.tsx
import React, { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '', ...props }) => {
  return (
    <span className={`ds-badge ds-badge--${variant} ${className}`} {...props}>
      {children}
    </span>
  );
};
