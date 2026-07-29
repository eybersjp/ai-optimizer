// Divider.tsx
import React, { HTMLAttributes } from 'react';

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const Divider: React.FC<DividerProps> = ({ orientation = 'horizontal', className = '', ...props }) => {
  return (
    <hr
      className={`ds-divider ds-divider--${orientation} ${className}`}
      aria-orientation={orientation}
      {...props}
    />
  );
};
