// EmptyState.tsx
import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  iconSymbol?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  iconSymbol = '🔍'
}) => {
  return (
    <div className="ds-empty-state">
      <div style={{ fontSize: '2rem', marginBottom: '8px' }} aria-hidden="true">
        {iconSymbol}
      </div>
      <h3 className="ds-empty-state__title">{title}</h3>
      <p className="ds-empty-state__description">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
