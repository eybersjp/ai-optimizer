// EvidenceStatus.tsx
import React from 'react';
import { Badge } from '../primitives/Badge';

export interface EvidenceStatusProps {
  type: 'observed' | 'inferred' | 'unresolved';
  count?: number;
}

export const EvidenceStatus: React.FC<EvidenceStatusProps> = ({ type, count }) => {
  const variantMap = {
    observed: 'accent',
    inferred: 'neutral',
    unresolved: 'warning'
  } as const;

  const symbolMap = {
    observed: '👁',
    inferred: '💡',
    unresolved: '❓'
  };

  return (
    <Badge variant={variantMap[type]}>
      <span aria-hidden="true" style={{ marginRight: '4px' }}>{symbolMap[type]}</span>
      <span>{type.toUpperCase()}</span>
      {count !== undefined && <span style={{ marginLeft: '4px', opacity: 0.8 }}>[{count}]</span>}
    </Badge>
  );
};
