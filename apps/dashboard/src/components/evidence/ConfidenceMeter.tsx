// ConfidenceMeter.tsx
import React from 'react';

export interface ConfidenceMeterProps {
  value: number; // 0 to 100
  label?: string;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ value, label = 'Confidence' }) => {
  const normalized = Math.min(100, Math.max(0, value));
  
  let color = 'var(--ds-color-success-fg)';
  if (normalized < 50) color = 'var(--ds-color-danger-fg)';
  else if (normalized < 75) color = 'var(--ds-color-warning-fg)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', maxWidth: '200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ds-color-fg-muted)' }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--ds-font-family-mono)', fontWeight: 600 }}>{normalized}%</span>
      </div>
      <div style={{ height: '6px', backgroundColor: 'var(--ds-color-bg-base)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--ds-color-border-subtle)' }}>
        <div
          style={{
            height: '100%',
            width: `${normalized}%`,
            backgroundColor: color,
            transition: 'width var(--ds-motion-duration-normal) var(--ds-motion-ease-default)'
          }}
          role="progressbar"
          aria-valuenow={normalized}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};
