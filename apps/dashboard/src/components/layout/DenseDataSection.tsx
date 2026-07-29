// DenseDataSection.tsx
import React from 'react';

export interface DenseDataSectionProps {
  title: string;
  children: React.ReactNode;
}

export const DenseDataSection: React.FC<DenseDataSectionProps> = ({ title, children }) => {
  return (
    <section style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ds-color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>
        {title}
      </h3>
      {children}
    </section>
  );
};
