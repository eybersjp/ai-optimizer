// LoadingSkeleton.tsx
import React from 'react';

export interface LoadingSkeletonProps {
  width?: string;
  height?: string;
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = '16px',
  count = 1,
  className = ''
}) => {
  const items = Array.from({ length: count });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} aria-busy="true" aria-live="polite">
      {items.map((_, idx) => (
        <div
          key={idx}
          className={`ds-skeleton ${className}`}
          style={{ width, height }}
        />
      ))}
    </div>
  );
};
