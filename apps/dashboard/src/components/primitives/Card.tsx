// Card.tsx
import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, elevated = false, interactive = false, className = '', ...props }) => {
  const classes = [
    'ds-card',
    elevated ? 'ds-card--elevated' : '',
    interactive ? 'ds-card--interactive' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};
