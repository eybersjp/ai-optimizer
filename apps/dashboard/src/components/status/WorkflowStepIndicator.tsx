// WorkflowStepIndicator.tsx
import React from 'react';
import { StatusBadge, StatusSemantic } from '../primitives/StatusBadge';

export interface StepItem {
  id: string;
  name: string;
  status: StatusSemantic;
}

export interface WorkflowStepIndicatorProps {
  steps: StepItem[];
}

export const WorkflowStepIndicator: React.FC<WorkflowStepIndicatorProps> = ({ steps }) => {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      {steps.map((step, idx) => (
        <React.Fragment key={step.id}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--ds-color-fg-muted)', fontWeight: 500 }}>{step.name}</span>
            <StatusBadge status={step.status} />
          </div>
          {idx < steps.length - 1 && (
            <span style={{ color: 'var(--ds-color-border-strong)', fontSize: '1rem', marginTop: '16px' }} aria-hidden="true">→</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
